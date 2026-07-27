// 구글 로그인 시작. 필요한 환경변수: GOOGLE_CLIENT_ID
// Google Cloud Console의 승인된 리디렉션 URI에는 이 함수의 콜백 주소
// (예: https://your-domain.pages.dev/api/auth/google-callback) 를 정확히 등록해야 합니다.
export async function onRequestGet({ request, env }) {
  if (!env.GOOGLE_CLIENT_ID) {
    return new Response("구글 로그인이 아직 설정되지 않았습니다 (GOOGLE_CLIENT_ID 환경변수 누락).", { status: 500 });
  }
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/google-callback`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  return Response.redirect(authUrl.toString(), 302);
}
