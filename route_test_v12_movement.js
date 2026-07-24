// Headless simulation of game.js movement + AUTO logic (ported 1:1) to catch
// NaN positions, infinite loops, or unreachable hotspots WITHOUT a browser/canvas.
const fs = require("fs");
global.window = global;
new Function(fs.readFileSync("./src/config/world-data.js", "utf8"))();
new Function(fs.readFileSync("./src/engine/path-engine.js", "utf8"))();
new Function(fs.readFileSync("./src/game/game-systems.js", "utf8"))();

const WORLD = window.KOMSCO.WORLD, PATH = window.KOMSCO.PathEngine, SYS = window.KOMSCO.GameSystems;

function edgeProjection(edge, x, y) {
  const [a, b] = edge, A = WORLD.nodes[a], B = WORLD.nodes[b];
  const vx = B[0] - A[0], vy = B[1] - A[1], den = vx * vx + vy * vy;
  const t = den ? Math.max(0, Math.min(1, ((x - A[0]) * vx + (y - A[1]) * vy) / den)) : 0;
  return { x: A[0] + t * vx, y: A[1] + t * vy, t, vx, vy, length: Math.sqrt(den) };
}
function edgeKey(edge) { return edge ? `${edge[0]}|${edge[1]}` : ""; }
function connectedEdges(nodeId) { return WORLD.edges.filter(([a, b]) => a === nodeId || b === nodeId); }
function edgeInfo(edge, x, y) {
  const q = edgeProjection(edge, x, y), len = Math.hypot(q.vx, q.vy) || 1;
  return { ...q, tx: q.vx / len, ty: q.vy / len };
}
function chooseEdgeAtNode(nodeId, inputX, inputY, previousEdge) {
  const node = WORLD.nodes[nodeId]; let best = null, bestScore = -Infinity;
  for (const edge of connectedEdges(nodeId)) {
    const other = edge[0] === nodeId ? edge[1] : edge[0], target = WORLD.nodes[other];
    const vx = target[0] - node[0], vy = target[1] - node[1], len = Math.hypot(vx, vy) || 1;
    const penalty = previousEdge && edgeKey(edge) === edgeKey(previousEdge) ? .08 : 0;
    const score = inputX * (vx / len) + inputY * (vy / len) - penalty;
    if (score > bestScore) { bestScore = score; best = edge; }
  }
  return bestScore > .08 ? best : null;
}

function simulateAutoToHotspot(h, spawnX, spawnY) {
  const state = { x: spawnX, y: spawnY, speed: SYS.newState().player.speed };
  const nearest = PATH.nearestRoad(WORLD, state.x, state.y);
  if (!nearest.edge) return { ok: false, reason: "no road at spawn" };
  const [a, b] = nearest.edge, A = WORLD.nodes[a], B = WORLD.nodes[b];
  const pathA = PATH.shortestPath(WORLD, a, h.node), pathB = PATH.shortestPath(WORLD, b, h.node);
  const costA = Math.hypot(state.x - A[0], state.y - A[1]) + pathA.length;
  const costB = Math.hypot(state.x - B[0], state.y - B[1]) + pathB.length;
  const selected = costA <= costB ? pathA : pathB, endpoint = costA <= costB ? A : B;
  if (!selected.length) return { ok: false, reason: "no path" };
  let autoPath = [{ x: endpoint[0], y: endpoint[1] }, ...selected.slice(1).map(p => ({ x: p.x, y: p.y }))];
  const last = autoPath[autoPath.length - 1];
  if (!last || Math.hypot(last.x - h.x, last.y - h.y) > .05) autoPath.push({ x: h.x, y: h.y });

  let currentEdge = nearest.edge;
  const dt = 0.016; // ~60fps
  let frames = 0;
  const MAX_FRAMES = 20000; // ~5+ minutes of sim time; if we don't arrive by then, something's wrong

  while (autoPath.length && frames < MAX_FRAMES) {
    frames++;
    const target = autoPath[0];
    const isFinalHop = autoPath.length === 1;
    const dx0 = target.x - state.x, dy0 = target.y - state.y;
    const dist = Math.hypot(dx0, dy0);
    if (!Number.isFinite(dist)) return { ok: false, reason: "NaN distance", frames };

    if (dist < .38) {
      state.x = target.x; state.y = target.y;
      autoPath.shift();
      if (autoPath.length) {
        const next = autoPath[0];
        const currentNode = PATH.nearestNode(WORLD, state.x, state.y);
        const nextNode = PATH.nearestNode(WORLD, next.x, next.y);
        currentEdge = WORLD.edges.find(([a, b]) => (a === currentNode && b === nextNode) || (a === nextNode && b === currentNode)) || currentEdge;
      }
      continue;
    }
    if (isFinalHop) {
      const speed = state.speed;
      const nx = dx0 / dist, ny = dy0 / dist;
      state.x += nx * speed * dt; state.y += ny * speed * dt;
      if (!Number.isFinite(state.x) || !Number.isFinite(state.y)) return { ok: false, reason: "NaN position (final hop)", frames };
      continue;
    }
    // road-constrained move
    let dx = dx0, dy = dy0;
    const magnitude = Math.hypot(dx, dy);
    if (magnitude < .05) continue;
    dx /= magnitude; dy /= magnitude;
    if (!currentEdge) currentEdge = PATH.nearestRoad(WORLD, state.x, state.y).edge;
    if (!currentEdge) return { ok: false, reason: "lost road" };
    const info = edgeInfo(currentEdge, state.x, state.y);
    const sign = (dx * info.tx + dy * info.ty) >= 0 ? 1 : -1;
    const speed = state.speed;
    const projected = edgeProjection(currentEdge, info.x + info.tx * sign * speed * dt, info.y + info.ty * sign * speed * dt);
    state.x = projected.x; state.y = projected.y;
    if (!Number.isFinite(state.x) || !Number.isFinite(state.y)) return { ok: false, reason: "NaN position (road)", frames };
    if (projected.t <= .006 || projected.t >= .994) {
      const nodeId = projected.t <= .006 ? currentEdge[0] : currentEdge[1], node = WORLD.nodes[nodeId];
      state.x = node[0]; state.y = node[1];
      const next = chooseEdgeAtNode(nodeId, dx, dy, currentEdge);
      if (next) currentEdge = next;
    }
  }
  if (autoPath.length) return { ok: false, reason: `did not arrive within ${MAX_FRAMES} frames`, frames };
  const finalDist = Math.hypot(state.x - h.x, state.y - h.y);
  return { ok: true, frames, finalDist };
}

const spawn = SYS.newState().player;
let allOk = true;
console.log(`Simulating AUTO navigation to all ${WORLD.hotspots.length} hotspots from spawn (${spawn.x}, ${spawn.y})...`);
for (const h of WORLD.hotspots) {
  const r = simulateAutoToHotspot(h, spawn.x, spawn.y);
  if (r.ok) {
    console.log(` OK   ${h.label.padEnd(8)} arrived in ${r.frames} frames (~${(r.frames*0.016).toFixed(1)}s), final distance to hotspot center: ${r.finalDist.toFixed(3)}`);
  } else {
    allOk = false;
    console.log(` FAIL ${h.label.padEnd(8)} ${r.reason}`);
  }
}
// Also simulate starting AUTO a second time mid-route (simulating a re-tap) to ensure no crash
const midRun = simulateAutoToHotspot(WORLD.hotspots[0], spawn.x, spawn.y);
console.log(allOk ? "\nPASS: every hotspot reachable via AUTO with no NaNs / no stalls." : "\nFAIL: see above.");
process.exit(allOk ? 0 : 1);
