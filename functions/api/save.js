export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { userId, nickname = '게스트', characterId = 'hunmin', gameState } = body ?? {};

    if (!userId || !gameState) {
      return Response.json({ ok: false, error: 'userId와 gameState가 필요합니다.' }, { status: 400 });
    }
    if (!context.env.DB) {
      return Response.json({ ok: false, error: 'D1 바인딩 DB가 설정되지 않았습니다.' }, { status: 500 });
    }

    await context.env.DB.prepare(`
      INSERT INTO users (id, nickname, character_id, gold, level, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        nickname = excluded.nickname,
        character_id = excluded.character_id,
        gold = excluded.gold,
        level = excluded.level,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      String(userId),
      String(nickname),
      String(characterId),
      Number(gameState.gold || 0),
      Number(gameState.level || 1)
    ).run();

    await context.env.DB.prepare(`
      INSERT INTO game_saves (user_id, save_data, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        save_data = excluded.save_data,
        updated_at = CURRENT_TIMESTAMP
    `).bind(String(userId), JSON.stringify(gameState)).run();

    return Response.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (error) {
    console.error('save error', error);
    return Response.json({ ok: false, error: '저장 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
