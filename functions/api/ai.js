/**
 * Cloudflare Workers AI 공통 접근 모듈
 * Cloudflare Pages의 AI binding 이름은 반드시 AI로 설정합니다.
 * (Settings > Functions > AI bindings)
 */
export function requireAI(env) {
  if (!env || !env.AI) {
    throw new Error(
      "AI binding 'AI'가 설정되지 않았습니다. " +
      "Cloudflare Pages > Settings > Functions > AI bindings에서 연결하세요."
    );
  }
  return env.AI;
}

export const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";

// 채팅형 프롬프트 호출 공통 헬퍼. 실패 시 null을 반환(호출부에서 항상 폴백 처리하도록 강제).
export async function runChat(env, systemPrompt, userPrompt, maxTokens) {
  try {
    const ai = requireAI(env);
    const result = await ai.run(AI_MODEL, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens || 300,
    });
    return result?.response || null;
  } catch {
    return null;
  }
}
