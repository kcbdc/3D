import { requireDB, json } from "../db.js";
import { moderateText } from "../_moderation.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = requireDB(env);
    const body = await request.json();
    const senderId = String(body.senderId || "").trim();
    const recipientId = String(body.recipientId || "").trim();
    const text = String(body.body || "").trim();

    if (!senderId || !recipientId || !text) {
      return json({ ok: false, error: "senderId, recipientId, body가 모두 필요합니다." }, { status: 400 });
    }
    if (senderId === recipientId) {
      return json({ ok: false, error: "자기 자신에게는 쪽지를 보낼 수 없습니다." }, { status: 400 });
    }
    if (text.length > 1000) {
      return json({ ok: false, error: "메시지가 너무 깁니다." }, { status: 400 });
    }

    const modResult = await moderateText(env, text);
    if (modResult.blocked) {
      return json({ ok: false, error: `메시지를 보낼 수 없습니다: ${modResult.reason}` }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await db.prepare(
      "INSERT INTO direct_messages(id, sender_id, recipient_id, body) VALUES(?, ?, ?, ?)"
    ).bind(id, senderId, recipientId, text).run();

    const message = await db.prepare(
      "SELECT id, sender_id, recipient_id, body, created_at, read_at FROM direct_messages WHERE id = ?"
    ).bind(id).first();

    return json({ ok: true, message });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
