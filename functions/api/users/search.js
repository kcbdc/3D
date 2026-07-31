import { requireDB, json } from "../_lib/db.js";

const ONLINE_WINDOW_SECONDS = 40;

export async function onRequestGet({ request, env }) {
  try {
    const db = requireDB(env);
    const url = new URL(request.url);
    const q = String(url.searchParams.get("q") || "").trim();
    const userId = String(url.searchParams.get("userId") || "").trim();

    if (!q) {
      return json({ ok: false, error: "검색어를 입력해주세요." }, { status: 400 });
    }

    // 지금까지 한 번이라도 플레이한 모든 사용자(레벨 테이블 기준)를 대상으로 검색 -- 지금
    // 접속 중이 아니어도 찾을 수 있음
    const result = await db.prepare(`
      SELECT
        u.id, u.nickname,
        (u.last_seen_at IS NOT NULL AND u.last_seen_at >= datetime('now', ?)) AS is_online,
        r.level AS level,
        EXISTS(SELECT 1 FROM favorites f WHERE f.user_id = ? AND f.favorite_user_id = u.id) AS is_favorite
      FROM users u
      LEFT JOIN rankings r ON r.user_id = u.id
      WHERE u.nickname LIKE ? AND u.id != ?
      ORDER BY is_online DESC, u.nickname ASC
      LIMIT 30
    `).bind(`-${ONLINE_WINDOW_SECONDS} seconds`, userId, `%${q}%`, userId).all();

    return json({ ok: true, results: result.results || [] });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
