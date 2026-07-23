/* 농장 성장 계산 */
window.KOMSCO = window.KOMSCO || {};
window.KOMSCO.Farm = {
  createPlots(count = 8) {
    return Array.from({ length: count }, () => ({
      seed: null,
      plantedAt: 0,
      growMs: 0
    }));
  },
  progress(plot, now = Date.now()) {
    if (!plot.seed || !plot.growMs) return 0;
    return Math.max(0, Math.min(1, (now - plot.plantedAt) / plot.growMs));
  },
  isReady(plot, now = Date.now()) {
    return Boolean(plot.seed) && now - plot.plantedAt >= plot.growMs;
  }
};
