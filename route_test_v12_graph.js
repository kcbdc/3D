// Standalone graph integrity check for src/config/world-data.js
// Run: node graph_check.js
const fs = require("fs");
global.window = global; // world-data.js does window.KOMSCO = ...
const src = fs.readFileSync("./src/config/world-data.js", "utf8");
new Function(src)();
const sysSrc = fs.readFileSync("./src/game/game-systems.js", "utf8");
new Function(sysSrc)();

const WORLD = window.KOMSCO.WORLD;
const SYS = window.KOMSCO.GameSystems;
let failures = [];

// 1. Every edge must reference two existing, distinct nodes
const nodeIds = new Set(Object.keys(WORLD.nodes));
for (const [a, b] of WORLD.edges) {
  if (!nodeIds.has(a)) failures.push(`edge references missing node: ${a}`);
  if (!nodeIds.has(b)) failures.push(`edge references missing node: ${b}`);
  if (a === b) failures.push(`self-loop edge: ${a}`);
}

// 2. No duplicate edges (either direction)
const seen = new Set();
for (const [a, b] of WORLD.edges) {
  const key = [a, b].sort().join("|");
  if (seen.has(key)) failures.push(`duplicate edge: ${a}-${b}`);
  seen.add(key);
}

// 3. Every hotspot's node must exist and its (x,y) must match the node coordinate
for (const h of WORLD.hotspots) {
  if (!nodeIds.has(h.node)) {
    failures.push(`hotspot "${h.label}" references missing node: ${h.node}`);
    continue;
  }
  const [nx, ny] = WORLD.nodes[h.node];
  const dist = Math.hypot(nx - h.x, ny - h.y);
  if (dist > 0.01) failures.push(`hotspot "${h.label}" coords (${h.x},${h.y}) drift from node ${h.node} (${nx},${ny}), delta=${dist.toFixed(3)}`);
}

// 4. Reachability: BFS from the player's spawn point's nearest road node to every hotspot node
function nearestNode(x, y) {
  let best = null, bestD = Infinity;
  for (const [id, p] of Object.entries(WORLD.nodes)) {
    const d = Math.hypot(x - p[0], y - p[1]);
    if (d < bestD) { bestD = d; best = id; }
  }
  return best;
}
const adjacency = {};
Object.keys(WORLD.nodes).forEach(id => adjacency[id] = []);
WORLD.edges.forEach(([a, b]) => { adjacency[a].push(b); adjacency[b].push(a); });

function bfsReachable(start) {
  const visited = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    for (const n of adjacency[cur]) if (!visited.has(n)) { visited.add(n); queue.push(n); }
  }
  return visited;
}

const start = window.KOMSCO.GameSystems.newState().player;
const startNode = nearestNode(start.x, start.y);
const reachable = bfsReachable(startNode);
for (const h of WORLD.hotspots) {
  if (!reachable.has(h.node)) failures.push(`hotspot "${h.label}" (node ${h.node}) is NOT reachable by road from spawn node ${startNode}`);
}

// 5. Whole graph should be one connected component (no orphan islands)
const allReachableFromAnyNode = bfsReachable(Object.keys(WORLD.nodes)[0]);
const orphans = [...nodeIds].filter(id => !allReachableFromAnyNode.has(id));
if (orphans.length) failures.push(`disconnected node(s), unreachable from rest of graph: ${orphans.join(", ")}`);

console.log(`nodes: ${nodeIds.size}, edges: ${WORLD.edges.length}, hotspots: ${WORLD.hotspots.length}`);
if (failures.length) {
  console.log("FAILURES:");
  failures.forEach(f => console.log(" - " + f));
  process.exit(1);
} else {
  console.log("PASS: graph is structurally valid, fully connected, and every hotspot is road-reachable from spawn.");
}
