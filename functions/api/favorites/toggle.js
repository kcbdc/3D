import { requireDB, json } from "../db.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = requireDB(env);
    const body = await request.json();
    const userId = String(body.userId || "").trim();
    const targetId = String(body.targetId || "").trim();

    if (!userId || !targetId) {
      return json({ ok: false, error: "userId, targetId가 모두 필요합니다." }, { status: 400 });
    }

    const existing = await db.prepare(
      "SELECT 1 FROM favorites WHERE user_id = ? AND favorite_user_id = ?"
    ).bind(userId, targetId).first();

    if (existing) {
      await db.prepare(
        "DELETE FROM favorites WHERE user_id = ? AND favorite_user_id = ?"
      ).bind(userId, targetId).run();
      return json({ ok: true, favorited: false });
    } else {
      await db.prepare(
        "INSERT INTO favorites(user_id, favorite_user_id) VALUES(?, ?)"
      ).bind(userId, targetId).run();
      return json({ ok: true, favorited: true });
    }
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
