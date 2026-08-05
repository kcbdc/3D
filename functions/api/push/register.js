import { requireDB, json } from "../_lib/db.js";

/**
 * 안드로이드 앱(WebView 브릿지)이 FCM 등록 토큰을 발급받으면 이 엔드포인트로 저장을
 * 요청합니다. 기존 save.js/load.js와 동일하게 서버 세션 쿠키가 아니라 클라이언트가 들고
 * 있는 userId를 그대로 요청 본문에 실어 보내는 방식을 따릅니다 (이 프로젝트의 기존 인증
 * 모델과 동일 -- exchange.js에서 로그인 시 발급받은 user.id를 클라이언트가 보관).
 *
 * 같은 기기에서 재로그인하거나 앱을 재설치해 토큰이 바뀌는 경우를 위해 (user_id, platform)
 * 기준 upsert가 아니라 token 자체를 기준으로 upsert합니다 -- 토큰 문자열은 기기+앱 설치
 * 조합마다 고유하므로, 같은 토큰이 다른 계정으로 로그인 전환되면 소유자를 갱신합니다.
 */
export async function onRequestPost({ request, env }) {
  try {
    const db = requireDB(env);
    const body = await request.json();
    const userId = String(body.userId || "").trim();
    const token = String(body.token || "").trim();
    const platform = String(body.platform || "android").trim();

    if (!userId || !token) {
      return json({ ok: false, error: "userId와 token이 필요합니다." }, { status: 400 });
    }

    await db.prepare(`
      INSERT INTO push_tokens(token, user_id, platform, updated_at)
      VALUES(?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(token) DO UPDATE SET
        user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = CURRENT_TIMESTAMP
    `).bind(token, userId, platform).run();

    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}

/**
 * 로그아웃 시 또는 알림을 끌 때 토큰을 명시적으로 제거하기 위한 엔드포인트.
 * (지운다고 즉시 오발송이 사라지진 않지만, 다음 발송부터는 대상에서 빠집니다)
 */
export async function onRequestDelete({ request, env }) {
  try {
    const db = requireDB(env);
    const body = await request.json();
    const token = String(body.token || "").trim();
    if (!token) return json({ ok: false, error: "token이 필요합니다." }, { status: 400 });

    await db.prepare("DELETE FROM push_tokens WHERE token = ?").bind(token).run();
    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
