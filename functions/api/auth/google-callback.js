import { redirectToApp, upsertSocialUserAndIssueToken } from "./shared.js";

// 구글 로그인 콜백. 필요한 환경변수: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");

  if (errorParam) return redirectToApp(origin, null, "구글 로그인이 취소되었습니다.");
  if (!code) return redirectToApp(origin, null, "구글 로그인 코드가 없습니다.");

  try {
    const redirectUri = `${origin}/api/auth/google-callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return redirectToApp(origin, null, "구글 토큰 발급에 실패했습니다.");

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    const providerUserId = String(profile.sub);
    const nickname = profile.name || "조폐 히어로";
    const email = profile.email || null;

    const loginToken = await upsertSocialUserAndIssueToken(env, "google", providerUserId, email, nickname);
    return redirectToApp(origin, loginToken, null);
  } catch (error) {
    return redirectToApp(origin, null, "구글 로그인 처리 중 오류가 발생했습니다.");
  }
}
