import { redirectToApp, upsertSocialUserAndIssueToken } from "./shared.js";

// 네이버 로그인 콜백. 필요한 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) return redirectToApp(origin, null, "네이버 로그인이 취소되었습니다.");
  if (!code) return redirectToApp(origin, null, "네이버 로그인 코드가 없습니다.");

  try {
    const tokenUrl = new URL("https://nid.naver.com/oauth2.0/token");
    tokenUrl.searchParams.set("grant_type", "authorization_code");
    tokenUrl.searchParams.set("client_id", env.NAVER_CLIENT_ID);
    tokenUrl.searchParams.set("client_secret", env.NAVER_CLIENT_SECRET);
    tokenUrl.searchParams.set("code", code);
    tokenUrl.searchParams.set("state", state || "");

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return redirectToApp(origin, null, "네이버 토큰 발급에 실패했습니다.");

    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileRes.json();
    const profile = profileData.response;
    if (!profile) return redirectToApp(origin, null, "네이버 프로필을 가져오지 못했습니다.");

    const providerUserId = String(profile.id);
    const nickname = profile.nickname || profile.name || "조폐 히어로";
    const email = profile.email || null;

    const loginToken = await upsertSocialUserAndIssueToken(env, "naver", providerUserId, email, nickname);
    return redirectToApp(origin, loginToken, null);
  } catch (error) {
    return redirectToApp(origin, null, "네이버 로그인 처리 중 오류가 발생했습니다.");
  }
}
