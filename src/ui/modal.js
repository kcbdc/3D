/* 모달 UI */
window.KOMSCO = window.KOMSCO || {};
window.KOMSCO.Modal = {
  open(modalElement, bodyElement, html) {
    bodyElement.innerHTML = html;
    modalElement.classList.add("show");
  },
  close(modalElement) {
    modalElement.classList.remove("show");
  }
};
