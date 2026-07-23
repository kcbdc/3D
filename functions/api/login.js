import { requireDB, json } from "./db.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = requireDB(env);
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const nickname = String(body.nickname || "조폐 히어로").trim();

    if (!email || !email.includes("@")) {
      return json({ ok: false, error: "유효한 이메일이 필요합니다." }, { status: 400 });
    }

    const userId = crypto.randomUUID();

    await db.prepare(`
      INSERT INTO users(id, email, nickname)
      VALUES(?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET nickname = excluded.nickname
    `).bind(userId, email, nickname).run();

    const user = await db.prepare(
      "SELECT id, email, nickname, created_at FROM users WHERE email = ?"
    ).bind(email).first();

    return json({ ok: true, user });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
