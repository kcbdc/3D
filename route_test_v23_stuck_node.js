// Regression test for the "permanently stuck at a dead-end/T-junction" bug found via
// OCR analysis of a real Samsung Internet screen recording: a player who arrives at an
// off-road hotspot (e.g. LAB/기술연구원) and gives input that doesn't match any available
// edge at the connecting junction (e.g. pressing straight down at a junction with only
// horizontal roads) used to get stuck there forever, even after changing direction,
// because chooseEdgeAtNode was only ever consulted once, at the exact instant of arrival.
const fs = require("fs");
global.window = global;
new Function(fs.readFileSync("./src/config/world-data.js", "utf8"))();
new Function(fs.readFileSync("./src/engine/path-engine.js", "utf8"))();
new Function(fs.readFileSync("./src/game/game-systems.js", "utf8"))();
const WORLD = window.KOMSCO.WORLD, PATH = window.KOMSCO.PathEngine, SYS = window.KOMSCO.GameSystems;

function edgeProjection(edge,x,y){
 const [a,b]=edge,A=WORLD.nodes[a],B=WORLD.nodes[b];
 const vx=B[0]-A[0],vy=B[1]-A[1],den=vx*vx+vy*vy;
 const t=den?Math.max(0,Math.min(1,((x-A[0])*vx+(y-A[1])*vy)/den)):0;
 return{x:A[0]+t*vx,y:A[1]+t*vy,t,vx,vy,length:Math.sqrt(den)};
}
function edgeKey(edge){return edge?`${edge[0]}|${edge[1]}`:""}
function connectedEdges(nodeId){return WORLD.edges.filter(([a,b])=>a===nodeId||b===nodeId)}
function edgeInfo(edge,x,y){
 const q=edgeProjection(edge,x,y),len=Math.hypot(q.vx,q.vy)||1;
 return{...q,tx:q.vx/len,ty:q.vy/len};
}
function chooseEdgeAtNode(nodeId,inputX,inputY,previousEdge){
 const node=WORLD.nodes[nodeId];let best=null,bestScore=-Infinity;
 for(const edge of connectedEdges(nodeId)){
   const other=edge[0]===nodeId?edge[1]:edge[0],target=WORLD.nodes[other];
   const vx=target[0]-node[0],vy=target[1]-node[1],len=Math.hypot(vx,vy)||1;
   const penalty=previousEdge&&edgeKey(edge)===edgeKey(previousEdge)?.08:0;
   const score=inputX*(vx/len)+inputY*(vy/len)-penalty;
   if(score>bestScore){bestScore=score;best=edge}
 }
 return bestScore>.08?best:null;
}
function moveOnRoute(state,currentEdgeRef,dx,dy,dt){
 const magnitude=Math.hypot(dx,dy);if(magnitude<.05)return currentEdgeRef;
 dx/=magnitude;dy/=magnitude;
 let currentEdge=currentEdgeRef;
 if(!currentEdge)currentEdge=PATH.nearestRoad(WORLD,state.x,state.y).edge;
 if(!currentEdge)return currentEdge;
 const tNow=edgeProjection(currentEdge,state.x,state.y).t;
 if(tNow<=.01||tNow>=.99){
   const nodeId=tNow<=.01?currentEdge[0]:currentEdge[1];
   const next=chooseEdgeAtNode(nodeId,dx,dy,currentEdge);
   if(next&&edgeKey(next)!==edgeKey(currentEdge))currentEdge=next;
 }
 const info=edgeInfo(currentEdge,state.x,state.y);
 const sign=(dx*info.tx+dy*info.ty)>=0?1:-1;
 const speed=state.speed;
 const projected=edgeProjection(currentEdge,info.x+info.tx*sign*speed*dt,info.y+info.ty*sign*speed*dt);
 state.x=projected.x;state.y=projected.y;
 if(projected.t<=.05||projected.t>=.95){
   const nodeId=projected.t<=.05?currentEdge[0]:currentEdge[1];
   const next=chooseEdgeAtNode(nodeId,dx,dy,currentEdge);
   if(next&&edgeKey(next)!==edgeKey(currentEdge)){
     currentEdge=next;
   }else if(projected.t<=.006||projected.t>=.994){
     const node=WORLD.nodes[nodeId];
     state.x=node[0];state.y=node[1];
   }
 }
 return currentEdge;
}

// Test every off-road hotspot: arrive there, give the "wrong" perpendicular input for
// enough frames to get stuck (matching what the OLD code would have done forever), then
// switch to every other direction in turn and confirm at least one lets them get well
// clear of the hotspot's own tiny radius.
let allPass = true;
const dt = 1/60;
for (const h of WORLD.hotspots) {
  const nodePos = WORLD.nodes[h.node];
  if (!nodePos || Math.hypot(nodePos[0]-h.x, nodePos[1]-h.y) < 0.01) continue; // skip on-road hotspots, only test off-road ones
  const state = {x: h.x, y: h.y, speed: 17};
  let currentEdge = null;
  // simulate arriving and pressing each direction for 60 frames, deliberately including
  // "wrong" directions first (as a real confused player might)
  const directions = [[0,1],[0,-1],[1,0],[-1,0]]; // down, up, right, left
  let escaped = false;
  for (const [dx,dy] of directions) {
    for (let i=0;i<60;i++) currentEdge = moveOnRoute(state, currentEdge, dx, dy, dt);
    const dist = Math.hypot(state.x-h.x, state.y-h.y);
    if (dist > h.r * 1.5) { escaped = true; break; }
  }
  const status = escaped ? "OK" : "STUCK";
  if (!escaped) allPass = false;
  console.log(`${status}  ${h.label.padEnd(8)} (${h.node}) final pos=(${state.x.toFixed(2)},${state.y.toFixed(2)}) dist_from_hotspot=${Math.hypot(state.x-h.x,state.y-h.y).toFixed(2)} (radius=${h.r})`);
}
console.log(allPass ? "\nPASS: every off-road hotspot can be escaped by trying all 4 directions in turn." : "\nFAIL: at least one hotspot traps the player permanently -- see STUCK lines above.");
process.exit(allPass ? 0 : 1);
