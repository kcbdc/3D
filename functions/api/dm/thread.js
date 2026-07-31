import { requireDB, json } from "../_lib/db.js";

export async function onRequestGet({ request, env }) {
  try {
    const db = requireDB(env);
    const url = new URL(request.url);
    const userId = String(url.searchParams.get("userId") || "").trim();
    const otherId = String(url.searchParams.get("otherId") || "").trim();

    if (!userId || !otherId) {
      return json({ ok: false, error: "userId, otherId가 모두 필요합니다." }, { status: 400 });
    }

    const result = await db.prepare(`
      SELECT id, sender_id, recipient_id, body, created_at, read_at
      FROM direct_messages
      WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
      ORDER BY created_at ASC
      LIMIT 200
    `).bind(userId, otherId, otherId, userId).all();

    return json({ ok: true, messages: result.results || [] });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
