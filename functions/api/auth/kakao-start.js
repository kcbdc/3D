// 카카오 로그인 시작: 카카오 인증 페이지로 리다이렉트.
// 필요한 환경변수: KAKAO_CLIENT_ID (Cloudflare Pages 설정 > 환경 변수에 추가)
// 카카오 디벨로퍼스 콘솔의 Redirect URI에는 이 함수의 콜백 주소
// (예: https://your-domain.pages.dev/api/auth/kakao-callback) 를 정확히 등록해야 합니다.
export async function onRequestGet({ request, env }) {
  if (!env.KAKAO_CLIENT_ID) {
    return new Response("카카오 로그인이 아직 설정되지 않았습니다 (KAKAO_CLIENT_ID 환경변수 누락).", { status: 500 });
  }
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/kakao-callback`;
  const authUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authUrl.searchParams.set("client_id", env.KAKAO_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  return Response.redirect(authUrl.toString(), 302);
}
