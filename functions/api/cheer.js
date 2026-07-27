import { requireDB, json } from "./db.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = requireDB(env);
    const body = await request.json();
    const senderId = String(body.senderId || "").trim();
    const recipientId = String(body.recipientId || "").trim();

    if (!senderId || !recipientId) {
      return json({ ok: false, error: "senderId, recipientId가 모두 필요합니다." }, { status: 400 });
    }
    if (senderId === recipientId) {
      return json({ ok: false, error: "자기 자신은 응원할 수 없습니다." }, { status: 400 });
    }

    // 하루에 같은 친구는 한 번만 응원 가능
    const existing = await db.prepare(`
      SELECT 1 FROM cheers
      WHERE sender_id = ? AND recipient_id = ? AND date(created_at) = date('now')
    `).bind(senderId, recipientId).first();
    if (existing) {
      return json({ ok: false, error: "오늘은 이미 이 친구를 응원했습니다." }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await db.prepare(
      "INSERT INTO cheers(id, sender_id, recipient_id) VALUES(?, ?, ?)"
    ).bind(id, senderId, recipientId).run();

    const sender = await db.prepare("SELECT nickname FROM users WHERE id = ?").bind(senderId).first();

    return json({ ok: true, senderNickname: sender ? sender.nickname : "익명" });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
