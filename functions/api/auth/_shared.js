import { requireDB } from "../db.js";
import { moderateText } from "../_moderation.js";

// 소셜 로그인 사용자를 찾거나 새로 만들고, 프론트엔드가 곧바로 교환해갈 1회용 로그인
// 토큰을 발급합니다. URL에 사용자 ID를 그대로 노출하지 않기 위한 장치입니다.
export async function upsertSocialUserAndIssueToken(env, provider, providerUserId, email, nickname) {
  const db = requireDB(env);
  const userId = crypto.randomUUID();

  // 닉네임 검열: 부적절하면 기본 닉네임으로 대체(로그인 자체를 막지는 않음)
  let safeNickname = nickname || "조폐 히어로";
  const modResult = await moderateText(env, safeNickname);
  if (modResult.blocked) safeNickname = "조폐 히어로";

  await db.prepare(`
    INSERT INTO users(id, provider, provider_user_id, email, nickname)
    VALUES(?, ?, ?, ?, ?)
    ON CONFLICT(provider, provider_user_id) DO UPDATE SET
      nickname = excluded.nickname,
      email = COALESCE(excluded.email, users.email)
  `).bind(userId, provider, providerUserId, email || null, safeNickname).run();

  const user = await db.prepare(
    "SELECT id, nickname FROM users WHERE provider = ? AND provider_user_id = ?"
  ).bind(provider, providerUserId).first();

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60000).toISOString(); // 60초 안에 교환해가지 않으면 만료

  await db.prepare(
    "INSERT INTO login_tokens(token, user_id, expires_at) VALUES(?, ?, ?)"
  ).bind(token, user.id, expiresAt).run();

  return token;
}

export function redirectToApp(origin, token, error) {
  const url = new URL(origin);
  if (token) url.searchParams.set("logintoken", token);
  if (error) url.searchParams.set("loginerror", error);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}
