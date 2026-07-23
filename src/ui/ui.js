/* 공통 UI 유틸리티 */
window.KOMSCO = window.KOMSCO || {};
window.KOMSCO.UI = {
  byId(id) {
    return document.getElementById(id);
  },
  bind(id, handler) {
    const element = document.getElementById(id);
    if (element) element.addEventListener("click", handler);
  }
};
