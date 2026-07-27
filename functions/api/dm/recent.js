import { requireDB, json } from "../db.js";

const ONLINE_WINDOW_SECONDS = 40;

export async function onRequestGet({ request, env }) {
  try {
    const db = requireDB(env);
    const url = new URL(request.url);
    const userId = String(url.searchParams.get("userId") || "").trim();

    if (!userId) {
      return json({ ok: false, error: "userId가 필요합니다." }, { status: 400 });
    }

    // 즐겨찾기하지 않은 대화 상대만, 최근 메시지 시각 기준 최대 20명
    const result = await db.prepare(`
      SELECT u.id, u.nickname,
        (u.last_seen_at IS NOT NULL AND u.last_seen_at >= datetime('now', ?)) AS is_online,
        MAX(dm.created_at) AS last_message_at
      FROM direct_messages dm
      JOIN users u ON u.id = CASE WHEN dm.sender_id = ? THEN dm.recipient_id ELSE dm.sender_id END
      WHERE (dm.sender_id = ? OR dm.recipient_id = ?)
        AND NOT EXISTS(SELECT 1 FROM favorites f WHERE f.user_id = ? AND f.favorite_user_id = u.id)
      GROUP BY u.id
      ORDER BY last_message_at DESC
      LIMIT 20
    `).bind(`-${ONLINE_WINDOW_SECONDS} seconds`, userId, userId, userId, userId).all();

    return json({ ok: true, recent: result.results || [] });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
