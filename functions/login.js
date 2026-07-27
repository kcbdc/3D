import { requireDB, json } from "./db.js";
import { moderateText } from "./_moderation.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = requireDB(env);
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    let nickname = String(body.nickname || "조폐 히어로").trim();

    if (!email || !email.includes("@")) {
      return json({ ok: false, error: "유효한 이메일이 필요합니다." }, { status: 400 });
    }

    const modResult = await moderateText(env, nickname);
    if (modResult.blocked) nickname = "조폐 히어로";

    const userId = crypto.randomUUID();

    await db.prepare(`
      INSERT INTO users(id, provider, provider_user_id, email, nickname)
      VALUES(?, 'email', ?, ?, ?)
      ON CONFLICT(provider, provider_user_id) DO UPDATE SET nickname = excluded.nickname
    `).bind(userId, email, email, nickname).run();

    const user = await db.prepare(
      "SELECT id, email, nickname, created_at FROM users WHERE provider = 'email' AND provider_user_id = ?"
    ).bind(email).first();

    return json({ ok: true, user });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
