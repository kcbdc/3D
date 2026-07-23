/* 2D 캐릭터 보행 보정 */
window.KOMSCO = window.KOMSCO || {};
window.KOMSCO.Animation = {
  walkingBob(timestamp, moving, amplitude = 3, frequency = 0.015) {
    return moving ? Math.sin(timestamp * frequency) * amplitude : 0;
  }
};
