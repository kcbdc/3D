/* 일일 퀘스트 */
window.KOMSCO = window.KOMSCO || {};
window.KOMSCO.Quest = {
  labels: [
    "회사 본부에서 업무 수행",
    "씨앗상점에서 씨앗 구매",
    "주말농장 밭에 씨앗 심기",
    "다 자란 작물 수확"
  ],
  allComplete(quests) {
    return quests.every(Boolean);
  }
};
