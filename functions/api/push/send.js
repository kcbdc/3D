import { requireDB, json } from "../_lib/db.js";
import { sendPushToToken } from "../_lib/fcm.js";

/**
 * 특정 이용자에게 푸시 알림을 보냅니다. 다른 이용자 아무나 호출할 수 있는 공개
 * 엔드포인트가 아니라 서버(또는 관리자 스크립트)가 호출하는 내부용 엔드포인트이므로,
 * 이미 이 프로젝트에서 admin/generate-missions.js가 쓰고 있는 것과 동일한
 * ADMIN_SECRET 방식으로 보호합니다.
 *
 * 예) 친구가 응원(cheer)을 보냈을 때, 쪽지가 도착했을 때 등 서버 로직에서 내부적으로
 * fetch("/api/push/send", {..., body: JSON.stringify({secret, userId, title, body})})
 * 형태로 호출하는 용도.
 */
export async function onRequestPost({ request, env }) {
  try {
    if (!env.ADMIN_SECRET) {
      return json({ ok: false, error: "ADMIN_SECRET 환경변수가 설정되지 않았습니다." }, { status: 500 });
    }
    const body = await request.json();
    if (String(body.secret || "") !== env.ADMIN_SECRET) {
      return json({ ok: false, error: "인증 실패" }, { status: 401 });
    }

    const userId = String(body.userId || "").trim();
    const title = String(body.title || "").trim();
    const messageBody = String(body.body || "").trim();
    if (!userId || !title || !messageBody) {
      return json({ ok: false, error: "userId, title, body가 필요합니다." }, { status: 400 });
    }

    const db = requireDB(env);
    const tokens = await db.prepare(
      "SELECT token FROM push_tokens WHERE user_id = ?"
    ).bind(userId).all();

    if (!tokens.results || tokens.results.length === 0) {
      return json({ ok: true, sent: 0, note: "등록된 기기 토큰이 없습니다." });
    }

    let sent = 0;
    const staleTokens = [];
    for (const row of tokens.results) {
      const result = await sendPushToToken(env, row.token, {
        title,
        body: messageBody,
        data: body.data || {},
      });
      if (result.ok) {
        sent++;
      } else if (result.status === 404 || result.status === 400) {
        // 폐기되었거나 더 이상 유효하지 않은 토큰 -- 다음 발송에 계속 실패하지 않도록 정리
        staleTokens.push(row.token);
      }
    }

    if (staleTokens.length) {
      await db.prepare(
        `DELETE FROM push_tokens WHERE token IN (${staleTokens.map(() => "?").join(",")})`
      ).bind(...staleTokens).run();
    }

    return json({ ok: true, sent, cleaned: staleTokens.length });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
