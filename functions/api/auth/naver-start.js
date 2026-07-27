// 네이버 로그인 시작. 필요한 환경변수: NAVER_CLIENT_ID
// 네이버 개발자센터의 서비스 URL/Callback URL에는 이 함수의 콜백 주소
// (예: https://your-domain.pages.dev/api/auth/naver-callback) 를 정확히 등록해야 합니다.
export async function onRequestGet({ request, env }) {
  if (!env.NAVER_CLIENT_ID) {
    return new Response("네이버 로그인이 아직 설정되지 않았습니다 (NAVER_CLIENT_ID 환경변수 누락).", { status: 500 });
  }
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/naver-callback`;
  const state = crypto.randomUUID(); // 네이버는 state 파라미터가 필수임
  const authUrl = new URL("https://nid.naver.com/oauth2.0/authorize");
  authUrl.searchParams.set("client_id", env.NAVER_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);
  return Response.redirect(authUrl.toString(), 302);
}
