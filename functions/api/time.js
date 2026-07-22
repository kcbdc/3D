export function onRequestGet(){
  return Response.json({ok:true,epoch:Date.now(),iso:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
}
