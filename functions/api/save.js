import { requireDB, json } from "./db.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = requireDB(env);
    const body = await request.json();
    const userId = String(body.userId || "").trim();
    const gameState = body.gameState;

    if (!userId || !gameState) {
      return json({ ok: false, error: "userId와 gameState가 필요합니다." }, { status: 400 });
    }

    const score =
      Number(gameState.gold || 0) +
      Number(gameState.harvest || 0) * 100 +
      Number(gameState.level || 1) * 1000;

    await db.prepare(`
      INSERT INTO game_saves(user_id, save_data, updated_at)
      VALUES(?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        save_data = excluded.save_data,
        updated_at = CURRENT_TIMESTAMP
    `).bind(userId, JSON.stringify(gameState)).run();

    await db.prepare(`
      INSERT INTO rankings(user_id, score, level, harvest, updated_at)
      VALUES(?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        score = excluded.score,
        level = excluded.level,
        harvest = excluded.harvest,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      userId,
      score,
      Number(gameState.level || 1),
      Number(gameState.harvest || 0)
    ).run();

    return json({ ok: true, score });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
