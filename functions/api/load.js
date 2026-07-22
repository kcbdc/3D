export async function onRequestGet(context) {
  try {
    const userId = new URL(context.request.url).searchParams.get('userId');
    if (!userId) {
      return Response.json({ ok: false, error: 'userId가 필요합니다.' }, { status: 400 });
    }
    if (!context.env.DB) {
      return Response.json({ ok: false, error: 'D1 바인딩 DB가 설정되지 않았습니다.' }, { status: 500 });
    }

    const result = await context.env.DB.prepare(`
      SELECT u.id, u.nickname, u.character_id, u.gold, u.level,
             s.save_data, s.updated_at
      FROM users u
      LEFT JOIN game_saves s ON s.user_id = u.id
      WHERE u.id = ?
    `).bind(userId).first();

    if (!result) {
      return Response.json({ ok: false, error: '저장 데이터가 없습니다.' }, { status: 404 });
    }

    return Response.json({
      ok: true,
      user: {
        id: result.id,
        nickname: result.nickname,
        characterId: result.character_id,
        gold: result.gold,
        level: result.level
      },
      gameState: result.save_data ? JSON.parse(result.save_data) : null,
      updatedAt: result.updated_at
    });
  } catch (error) {
    console.error('load error', error);
    return Response.json({ ok: false, error: '불러오기 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
