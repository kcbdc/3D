export async function onRequestGet() {
  return Response.json({
    ok: true,
    message: 'Cloudflare Pages Functions 정상 작동',
    time: new Date().toISOString()
  });
}
