import { requireDB, json } from "./_lib/db.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = requireDB(env);
    const body = await request.json();
    const userId = String(body.userId || "").trim();
    const score = Number(body.score) || 0;
    const level = Number(body.level) || 1;
    const harvest = Number(body.harvest) || 0;

    if (!userId) {
      return json({ ok: false, error: "userId가 필요합니다." }, { status: 400 });
    }

    await db.prepare(`
      INSERT INTO rankings(user_id, score, level, harvest, updated_at)
      VALUES(?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        score=excluded.score, level=excluded.level, harvest=excluded.harvest, updated_at=CURRENT_TIMESTAMP
    `).bind(userId, score, level, harvest).run();

    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
