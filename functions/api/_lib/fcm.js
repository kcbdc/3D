/**
 * FCM HTTP v1 API 발송 모듈.
 *
 * Firebase Admin SDK를 쓰지 않고 Web Crypto(Cloudflare Workers 런타임 기본 제공)로 서비스
 * 계정 JWT를 직접 서명합니다 -- firebase-admin 패키지는 Node 전용 API에 의존해 Workers에서
 * 그대로 동작하지 않기 때문입니다.
 *
 * 필요한 환경변수/시크릿 (Cloudflare Pages > Settings > Environment variables):
 *   FCM_SERVICE_ACCOUNT_JSON : Firebase 콘솔 > 프로젝트 설정 > 서비스 계정에서 발급한
 *                              서비스 계정 키 JSON 파일의 내용 전체(문자열 그대로)
 *
 * 흐름: 서비스 계정 JWT 서명 → Google OAuth2 토큰 교환 → FCM v1 send 호출.
 * 액세스 토큰은 요청마다 새로 발급하지 않고 만료 전까지 모듈 스코프에 캐시합니다
 * (Workers는 격리된 실행 인스턴스마다 콜드스타트가 있을 수 있어 100% 재사용을 보장하진
 * 않지만, 같은 인스턴스가 짧은 시간 안에 여러 요청을 처리할 때는 재서명을 피해줍니다).
 */

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

function base64UrlEncode(bytes) {
  let binary = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeString(str) {
  return base64UrlEncode(new TextEncoder().encode(str));
}

/** PEM(-----BEGIN PRIVATE KEY-----...) 문자열을 crypto.subtle.importKey용 CryptoKey로 변환 */
async function importPrivateKey(pem) {
  const pemBody = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function signServiceAccountJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64UrlEncodeString(JSON.stringify(header))}.${base64UrlEncodeString(JSON.stringify(claims))}`;
  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );
  return `${unsigned}.${base64UrlEncode(signature)}`;
}

async function getAccessToken(serviceAccount) {
  const now = Date.now();
  if (cachedAccessToken && now < cachedAccessTokenExpiresAt - 30000) {
    return cachedAccessToken;
  }
  const jwt = await signServiceAccountJwt(serviceAccount);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`FCM OAuth2 토큰 발급 실패: ${JSON.stringify(data)}`);
  }
  cachedAccessToken = data.access_token;
  cachedAccessTokenExpiresAt = now + (data.expires_in || 3600) * 1000;
  return cachedAccessToken;
}

/**
 * 지정한 FCM 등록 토큰(디바이스 토큰) 하나에 푸시 알림을 보냅니다.
 * @param {object} env - Cloudflare Pages Functions의 env 객체 (FCM_SERVICE_ACCOUNT_JSON 필요)
 * @param {string} deviceToken - 안드로이드 앱이 발급받은 FCM 등록 토큰
 * @param {{title:string, body:string, data?:Record<string,string>}} payload
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
export async function sendPushToToken(env, deviceToken, payload) {
  if (!env.FCM_SERVICE_ACCOUNT_JSON) {
    return { ok: false, error: "FCM_SERVICE_ACCOUNT_JSON 환경변수가 설정되지 않았습니다." };
  }
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON);
  } catch {
    return { ok: false, error: "FCM_SERVICE_ACCOUNT_JSON이 올바른 JSON이 아닙니다." };
  }

  try {
    const accessToken = await getAccessToken(serviceAccount);
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: deviceToken,
            notification: { title: payload.title, body: payload.body },
            data: payload.data || {},
            android: { priority: "high" },
          },
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      // 만료/폐기된 토큰은 호출부에서 push_tokens 테이블에서 지워야 하므로 상태 코드를 함께 반환
      return { ok: false, error: JSON.stringify(data), status: res.status };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error.message || error) };
  }
}
