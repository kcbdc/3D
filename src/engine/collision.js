/* 도로·건물·물·다리 충돌 판정 */
window.KOMSCO = window.KOMSCO || {};
window.KOMSCO.Collision = {
  pointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.w &&
           y >= rect.y && y <= rect.y + rect.h;
  },
  distanceToSegment(px, py, ax, ay, bx, by) {
    const vx = bx - ax;
    const vy = by - ay;
    const denominator = vx * vx + vy * vy;
    const t = denominator
      ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / denominator))
      : 0;
    const qx = ax + t * vx;
    const qy = ay + t * vy;
    return Math.hypot(px - qx, py - qy);
  }
};
