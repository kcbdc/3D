import { requireDB, json } from "./db.js";

export async function onRequestGet({ request, env }) {
  try {
    const db = requireDB(env);
    const userId = new URL(request.url).searchParams.get("userId");

    if (!userId) {
      return json({ ok: false, error: "userId가 필요합니다." }, { status: 400 });
    }

    const row = await db.prepare(
      "SELECT save_data, updated_at FROM game_saves WHERE user_id = ?"
    ).bind(userId).first();

    return json({
      ok: true,
      gameState: row ? JSON.parse(row.save_data) : null,
      updatedAt: row?.updated_at || null
    });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
