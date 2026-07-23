/* 플레이어 기본 데이터 및 보정 */
window.KOMSCO = window.KOMSCO || {};
window.KOMSCO.Player = {
  create() {
    return { x: 43, y: 78, speed: 17, dir: 1 };
  },
  setDirection(player, dx) {
    if (dx < 0) player.dir = -1;
    if (dx > 0) player.dir = 1;
  }
};
