import { requireDB, json } from "../_lib/db.js";
import { runChat } from "../_lib/ai.js";

const NODE_THEMES = {
  HQ: "조폐공사 본사 (일반 사무/행정 물품 발주)",
  MINT: "화폐본부 (지폐/주화 제조용 원자재, 보안 소재)",
  LAB: "기술연구원 (위변조방지 기술 연구장비, 실험 소모품)",
  H2_ID: "ID본부 (신분증/인증 관련 시스템, 개인정보 보안)",
  H2_PAPER: "제지본부 (특수 용지, 인쇄 원자재)",
};

const RULE_LIST = [
  "중소기업자간 경쟁제품 우선구매",
  "여성기업제품 우선구매",
  "장애인기업제품 우선구매",
  "녹색제품(친환경) 의무구매",
  "우수조달물품 우선구매",
  "재활용·재제조물품 우선구매",
];

const SYSTEM_PROMPT =
  "당신은 대한민국 공공조달 교육 게임의 미션 작가입니다. " +
  "반드시 아래 JSON 형식으로만 답하세요. 다른 설명이나 마크다운 코드블록 없이 JSON 객체만 출력하세요.\n" +
  `{"title":"발주 제목","spec":"규격: ... · 수량: ... · 예산상한 N원","ruleIdx":0,"options":[` +
  `{"text":"업체 설명","price":1000000,"correct":true,"reason":"적합/부적합 이유"},` +
  `{"text":"업체 설명","price":1000000,"correct":false,"reason":"부적합 이유"},` +
  `{"text":"업체 설명","price":1000000,"correct":false,"reason":"부적합 이유"}]}\n` +
  "options는 정확히 3개, 그중 정답(correct:true)은 정확히 1개여야 합니다. " +
  "부적합 사유는 '예산 초과' 또는 '필요 인증서 없음' 중 하나를 명확히 담아야 합니다. ruleIdx는 0~5 사이 정수입니다.";

function extractJson(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/); // 모델이 코드블록/설명을 덧붙여도 JSON 객체 부분만 추출
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function isValidMission(m) {
  if (!m || typeof m.title !== "string" || typeof m.spec !== "string") return false;
  if (!Array.isArray(m.options) || m.options.length !== 3) return false;
  const correctCount = m.options.filter((o) => o && o.correct === true).length;
  if (correctCount !== 1) return false;
  return m.options.every((o) => typeof o.text === "string" && typeof o.price === "number" && typeof o.reason === "string");
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.ADMIN_SECRET) {
      return json({ ok: false, error: "ADMIN_SECRET 환경변수가 설정되지 않았습니다." }, { status: 500 });
    }
    const body = await request.json();
    if (String(body.secret || "") !== env.ADMIN_SECRET) {
      return json({ ok: false, error: "인증되지 않은 요청입니다." }, { status: 401 });
    }

    const node = String(body.node || "");
    const count = Math.min(10, Math.max(1, Number(body.count) || 3));
    if (!NODE_THEMES[node]) {
      return json({ ok: false, error: `알 수 없는 기관입니다. 가능한 값: ${Object.keys(NODE_THEMES).join(", ")}` }, { status: 400 });
    }

    const db = requireDB(env);
    const generated = [];
    const failures = [];

    for (let i = 0; i < count; i++) {
      const userPrompt = `기관: ${NODE_THEMES[node]}\n공공구매 12대 원칙 목록(ruleIdx로 참조): ${RULE_LIST.map((r, idx) => `${idx}=${r}`).join(", ")}\n이 기관에 어울리는 새로운 발주 미션 1개를 만들어주세요.`;
      const raw = await runChat(env, SYSTEM_PROMPT, userPrompt, 500);
      const mission = extractJson(raw);

      if (!isValidMission(mission)) {
        failures.push({ attempt: i, raw: raw ? raw.slice(0, 200) : null });
        continue;
      }

      const id = crypto.randomUUID();
      await db.prepare(
        "INSERT INTO ai_missions(id, node, title, spec, rule_idx, options_json) VALUES(?, ?, ?, ?, ?, ?)"
      ).bind(id, node, mission.title, mission.spec, mission.ruleIdx ?? null, JSON.stringify(mission.options)).run();
      generated.push({ id, title: mission.title });
    }

    return json({ ok: true, generated, failedCount: failures.length, failures });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
