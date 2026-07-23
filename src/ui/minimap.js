/* 미니맵 마커 위치 */
window.KOMSCO = window.KOMSCO || {};
window.KOMSCO.Minimap = {
  update(marker, x, y) {
    marker.style.left = `${Math.max(5, Math.min(92, x))}%`;
    marker.style.top = `${Math.max(5, Math.min(90, y))}%`;
  }
};
