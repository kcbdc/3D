import { requireDB, json } from "../db.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = requireDB(env);
    const body = await request.json();
    const userId = String(body.userId || "").trim();

    if (!userId) {
      return json({ ok: false, error: "userId가 필요합니다." }, { status: 400 });
    }

    const result = await db.prepare(
      "UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(userId).run();

    if (!result.meta || result.meta.changes === 0) {
      return json({ ok: false, error: "존재하지 않는 사용자입니다." }, { status: 404 });
    }

    // 20초 하트비트 주기에 안 읽은 쪽지 여부도 함께 실어보내, 별도의 폴링 없이 같은 주기로 확인
    const unread = await db.prepare(`
      SELECT dm.sender_id AS senderId, u.nickname AS nickname, COUNT(*) AS count
      FROM direct_messages dm
      LEFT JOIN users u ON u.id = dm.sender_id
      WHERE dm.recipient_id = ? AND dm.read_at IS NULL
      GROUP BY dm.sender_id
    `).bind(userId).all();

    // 받은 응원(친구 응원하기)도 같은 주기에 전달하고 즉시 claimed 처리
    const cheers = await db.prepare(`
      SELECT c.id, u.nickname AS senderNickname
      FROM cheers c
      LEFT JOIN users u ON u.id = c.sender_id
      WHERE c.recipient_id = ? AND c.claimed = 0
    `).bind(userId).all();
    if (cheers.results && cheers.results.length) {
      await db.prepare(
        "UPDATE cheers SET claimed = 1 WHERE recipient_id = ? AND claimed = 0"
      ).bind(userId).run();
    }

    return json({ ok: true, unreadDms: unread.results || [], cheersReceived: cheers.results || [] });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
