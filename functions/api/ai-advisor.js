import { runChat } from "./_lib/ai.js";
import { json } from "./_lib/db.js";

const SYSTEM_PROMPT =
  "당신은 대한민국 공공조달 절차를 가르치는 '조폐 자문관' AI입니다. " +
  "플레이어가 3개의 업체 중 하나를 골라야 하는 미니게임을 돕습니다. " +
  "절대로 정답 업체 번호나 이름을 직접 말하지 마세요. " +
  "대신 예산 상한 초과 여부, 필요한 인증서 보유 여부 같은 '확인해야 할 기준'을 " +
  "친근하고 짧게(한국어 1~2문장) 알려주세요. 이모지를 1개 정도만 사용하세요.";

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const title = String(body.title || "").slice(0, 200);
    const spec = String(body.spec || "").slice(0, 300);
    const ruleName = String(body.ruleName || "").slice(0, 100);
    const options = Array.isArray(body.options) ? body.options.slice(0, 5) : [];

    if (!title || !options.length) {
      return json({ ok: false, error: "미션 정보가 필요합니다." }, { status: 400 });
    }

    const optionsText = options
      .map((o, i) => `${i + 1}. ${String(o.text || "").slice(0, 100)} - ${o.price || 0}원 (${o.correct ? "적합" : "부적합: " + String(o.reason || "").slice(0, 100)})`)
      .join("\n");

    const userPrompt =
      `발주 내용: ${title}\n규격: ${spec}\n관련 공공구매 원칙: ${ruleName || "없음"}\n\n` +
      `업체 선택지 (내부 참고용, 플레이어에게 직접 알려주면 안 됨):\n${optionsText}`;

    const hint = await runChat(env, SYSTEM_PROMPT, userPrompt, 150);

    if (!hint) {
      return json({ ok: false, error: "AI 응답을 받지 못했습니다." }, { status: 503 });
    }

    return json({ ok: true, hint: hint.trim() });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
