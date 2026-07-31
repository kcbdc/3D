import { redirectToApp, upsertSocialUserAndIssueToken } from "../_lib/social-auth.js";

// 카카오 로그인 콜백. 필요한 환경변수: KAKAO_CLIENT_ID, KAKAO_CLIENT_SECRET
// (카카오는 client_secret이 선택사항이지만, 디벨로퍼스 콘솔에서 "Client Secret 코드" 사용을
// 활성화했다면 반드시 함께 보내야 합니다.)
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (errorParam) return redirectToApp(origin, null, `카카오 로그인이 취소/거부되었습니다${errorDescription ? ": " + errorDescription : ""}`);
  if (!code) return redirectToApp(origin, null, "카카오 로그인 코드가 없습니다.");
  if (!env.KAKAO_CLIENT_ID) return redirectToApp(origin, null, "KAKAO_CLIENT_ID 환경변수가 설정되지 않았습니다.");

  try {
    const redirectUri = `${origin}/api/auth/kakao-callback`;
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env.KAKAO_CLIENT_ID,
      redirect_uri: redirectUri,
      code,
    });
    if (env.KAKAO_CLIENT_SECRET) tokenBody.set("client_secret", env.KAKAO_CLIENT_SECRET);

    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody,
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      // 카카오가 돌려주는 실제 에러 사유를 그대로 보여줌 (예: redirect_uri mismatch,
      // 잘못된 client_secret, KOE 에러코드 등) -- 이전에는 이 정보를 버리고 일반 메시지만 보여줬음
      const reason = tokenData.error_description || tokenData.error || `HTTP ${tokenRes.status}`;
      return redirectToApp(origin, null, `카카오 토큰 발급 실패: ${reason}`);
    }

    const profileRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (profile.msg && !profile.id) {
      // 카카오 사용자 조회 API가 에러를 반환한 경우 (예: 토큰 스코프 부족)
      return redirectToApp(origin, null, `카카오 프로필 조회 실패: ${profile.msg}`);
    }

    const providerUserId = String(profile.id);
    const nickname = profile.kakao_account?.profile?.nickname || "조폐 히어로";
    const email = profile.kakao_account?.email || null; // 카카오는 기본 동의 항목에 이메일이 없을 수 있음

    const loginToken = await upsertSocialUserAndIssueToken(env, "kakao", providerUserId, email, nickname);
    return redirectToApp(origin, loginToken, null);
  } catch (error) {
    // 실제 예외 메시지를 그대로 노출 (이전에는 여기서도 일반 메시지로 뭉개고 있었음)
    return redirectToApp(origin, null, `카카오 로그인 처리 중 오류: ${String(error.message || error).slice(0, 150)}`);
  }
}
