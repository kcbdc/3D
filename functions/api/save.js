export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    if (!body.userId || !body.gameState) return Response.json({ok:false,error:"필수값 누락"},{status:400});
    if (!env.DB) return Response.json({ok:true,mode:"local-fallback"});
    await env.DB.prepare(`INSERT INTO game_saves(user_id,save_data,updated_at) VALUES(?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET save_data=excluded.save_data,updated_at=CURRENT_TIMESTAMP`)
      .bind(body.userId, JSON.stringify(body.gameState)).run();
    return Response.json({ok:true});
  } catch(e) { return Response.json({ok:false,error:String(e)},{status:500}); }
}
