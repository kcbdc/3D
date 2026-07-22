export default {
 async fetch(request, env) {
  const url=new URL(request.url);
  if(url.pathname==='/api/health')return json({ok:true,service:'komsco-farm-universe'});
  if(url.pathname==='/api/save'&&request.method==='POST'){
   const body=await request.json(); const slot=String(body.slot||'default').slice(0,64);
   await env.DB.prepare(`INSERT INTO game_saves(slot,state_json,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(slot) DO UPDATE SET state_json=excluded.state_json,updated_at=datetime('now')`).bind(slot,JSON.stringify(body.state||{})).run();
   return json({ok:true});
  }
  if(url.pathname.startsWith('/api/save/')&&request.method==='GET'){
   const slot=decodeURIComponent(url.pathname.split('/').pop());const row=await env.DB.prepare('SELECT state_json,updated_at FROM game_saves WHERE slot=?').bind(slot).first();return json({ok:true,state:row?JSON.parse(row.state_json):null,updatedAt:row?.updated_at||null});
  }
  return env.ASSETS.fetch(request);
 }
};
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
