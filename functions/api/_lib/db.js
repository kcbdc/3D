/**
 * Cloudflare D1 공통 접근 모듈
 * Cloudflare Pages의 D1 binding 이름은 반드시 DB로 설정합니다.
 */
export function requireDB(env) {
  if (!env || !env.DB) {
    throw new Error(
      "D1 binding 'DB'가 설정되지 않았습니다. " +
      "Cloudflare Pages > Settings > Bindings에서 연결하세요."
    );
  }
  return env.DB;
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers || {})
    }
  });
}
