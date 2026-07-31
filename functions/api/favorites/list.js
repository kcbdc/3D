import { requireDB, json } from "../_lib/db.js";

const ONLINE_WINDOW_SECONDS = 40;

export async function onRequestGet({ request, env }) {
  try {
    const db = requireDB(env);
    const url = new URL(request.url);
    const userId = String(url.searchParams.get("userId") || "").trim();

    if (!userId) {
      return json({ ok: false, error: "userId가 필요합니다." }, { status: 400 });
    }

    const result = await db.prepare(`
      SELECT
        u.id, u.nickname,
        (u.last_seen_at IS NOT NULL AND u.last_seen_at >= datetime('now', ?)) AS is_online
      FROM favorites f
      JOIN users u ON u.id = f.favorite_user_id
      WHERE f.user_id = ?
      ORDER BY is_online DESC, u.nickname ASC
    `).bind(`-${ONLINE_WINDOW_SECONDS} seconds`, userId).all();

    return json({ ok: true, favorites: result.results || [] });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
