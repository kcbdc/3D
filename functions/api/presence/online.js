import { requireDB, json } from "../_lib/db.js";

// 하트비트 주기가 20초이므로, 한 번 정도는 놓쳐도 여유를 두고 40초 이내 접속을 "온라인"으로 판단
const ONLINE_WINDOW_SECONDS = 40;

export async function onRequestGet({ env }) {
  try {
    const db = requireDB(env);
    const result = await db.prepare(`
      SELECT id, nickname, last_seen_at
      FROM users
      WHERE last_seen_at IS NOT NULL
        AND last_seen_at >= datetime('now', ?)
      ORDER BY last_seen_at DESC
      LIMIT 100
    `).bind(`-${ONLINE_WINDOW_SECONDS} seconds`).all();

    return json({ ok: true, online: result.results || [] });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
