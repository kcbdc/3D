import { requireDB, json } from "./db.js";

export async function onRequestGet({ env }) {
  try {
    const db = requireDB(env);
    const result = await db.prepare(`
      SELECT
        r.user_id,
        COALESCE(u.nickname, '조폐 히어로') AS nickname,
        r.score,
        r.level,
        r.harvest,
        r.updated_at
      FROM rankings r
      LEFT JOIN users u ON u.id = r.user_id
      ORDER BY r.score DESC
      LIMIT 50
    `).all();

    return json({ ok: true, ranking: result.results || [] });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
