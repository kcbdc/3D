import { redirectToApp, upsertSocialUserAndIssueToken } from "./_shared.js";

// 카카오 로그인 콜백. 필요한 환경변수: KAKAO_CLIENT_ID, KAKAO_CLIENT_SECRET
// (카카오는 client_secret이 선택사항이지만, 디벨로퍼스 콘솔에서 "Client Secret 코드" 사용을
// 활성화했다면 반드시 함께 보내야 합니다.)
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");

  if (errorParam) return redirectToApp(origin, null, "카카오 로그인이 취소되었습니다.");
  if (!code) return redirectToApp(origin, null, "카카오 로그인 코드가 없습니다.");

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
    if (!tokenData.access_token) return redirectToApp(origin, null, "카카오 토큰 발급에 실패했습니다.");

    const profileRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    const providerUserId = String(profile.id);
    const nickname = profile.kakao_account?.profile?.nickname || "조폐 히어로";
    const email = profile.kakao_account?.email || null; // 카카오는 기본 동의 항목에 이메일이 없을 수 있음

    const loginToken = await upsertSocialUserAndIssueToken(env, "kakao", providerUserId, email, nickname);
    return redirectToApp(origin, loginToken, null);
  } catch (error) {
    return redirectToApp(origin, null, "카카오 로그인 처리 중 오류가 발생했습니다.");
  }
}
