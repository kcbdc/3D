import { runChat } from "./ai.js";

// 빠른 1차 필터: 흔한 욕설/혐오표현을 즉시 차단 (AI 호출 없이 항상 적용됨)
const BANNED_KEYWORDS = [
  "씨발", "시발", "개새끼", "병신", "지랄", "좆", "존나", "닥쳐",
  "fuck", "bitch", "asshole", "nigger", "retard",
  "죽어", "자살해", "패드립",
];

function containsBannedKeyword(text) {
  const normalized = text.toLowerCase().replace(/\s/g, "");
  return BANNED_KEYWORDS.some((kw) => normalized.includes(kw));
}

// 2차 검사: Cloudflare Workers AI로 문맥상 부적절한 내용(우회 표현, 스팸, 성적 내용 등)을
// 추가로 걸러냄. AI 호출이 실패/지연되어도 기본 키워드 필터는 이미 통과했으므로 허용 처리
// (fail-open) -- 일시적 AI 장애가 정상적인 메시지/닉네임까지 막지 않도록 함.
export async function moderateText(env, text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return { blocked: false };
  if (containsBannedKeyword(trimmed)) {
    return { blocked: true, reason: "부적절한 단어가 포함되어 있습니다." };
  }
  try {
    const result = await runChat(
      env,
      "당신은 게임 채팅/닉네임 검열 도우미입니다. 주어진 텍스트에 욕설, 혐오표현, 성적인 내용, 개인정보 유출, 광고/스팸이 있는지 판단하세요. 부적절하면 정확히 'BLOCK'이라고만 답하고, 문제없으면 정확히 'OK'라고만 답하세요. 다른 말은 절대 하지 마세요.",
      trimmed,
      5
    );
    if (result && result.toUpperCase().includes("BLOCK")) {
      return { blocked: true, reason: "부적절한 내용이 감지되었습니다." };
    }
  } catch {
    // AI 판단 실패 시 키워드 필터만 통과했으면 허용 (fail-open)
  }
  return { blocked: false };
}
