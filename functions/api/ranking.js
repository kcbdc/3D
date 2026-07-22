export async function onRequestGet(context) {
  try {
    if (!context.env.DB) {
      return Response.json({ ok: false, error: 'D1 바인딩 DB가 설정되지 않았습니다.' }, { status: 500 });
    }
    const rows = await context.env.DB.prepare(`
      SELECT id, nickname, character_id, gold, level, updated_at
      FROM users
      ORDER BY level DESC, gold DESC, updated_at ASC
      LIMIT 100
    `).all();
    return Response.json({ ok: true, ranking: rows.results ?? [] });
  } catch (error) {
    console.error('ranking error', error);
    return Response.json({ ok: false, error: '랭킹 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
