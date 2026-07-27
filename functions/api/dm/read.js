import { requireDB, json } from "../db.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = requireDB(env);
    const body = await request.json();
    const userId = String(body.userId || "").trim();
    const otherId = String(body.otherId || "").trim();

    if (!userId || !otherId) {
      return json({ ok: false, error: "userId, otherId가 모두 필요합니다." }, { status: 400 });
    }

    await db.prepare(
      "UPDATE direct_messages SET read_at = CURRENT_TIMESTAMP WHERE recipient_id = ? AND sender_id = ? AND read_at IS NULL"
    ).bind(userId, otherId).run();

    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
