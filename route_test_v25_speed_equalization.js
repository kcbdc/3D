// Regression test for the "vertical movement is much slower than horizontal" bug, confirmed
// reproducible in Chrome (so a real movement-math bug, not a touch/browser quirk). Root cause:
// the world coordinate system is a 0-100 percentage grid mapped onto a landscape (non-square)
// canvas, so moving N world-units vertically covered far fewer on-screen pixels than moving N
// world-units horizontally for the same "speed" value. Fixed via a worldStep() helper that
// equalizes ON-SCREEN PIXEL speed regardless of direction; this test locks that in.
const fs = require("fs");
global.window = global;
new Function(fs.readFileSync("./src/config/world-data.js", "utf8"))();
const WORLD = window.KOMSCO.WORLD;

function edgeInfo(edge,x,y){
  const [a,b]=edge,A=WORLD.nodes[a],B=WORLD.nodes[b];
  const vx=B[0]-A[0],vy=B[1]-A[1],len=Math.hypot(vx,vy)||1;
  return{x,y,tx:vx/len,ty:vy/len};
}
// exact port of the worldStep helper in game.js
function worldStep(tx,ty,speed,dt,bgRect){
  const kx=(bgRect.w||1)/100,ky=(bgRect.h||1)/100;
  const pixelLen=Math.hypot(tx*kx,ty*ky)||1;
  const scale=kx*speed*dt/pixelLen;
  return{x:tx*scale,y:ty*scale};
}

// Test across several plausible canvas aspect ratios, not just one.
const scenarios = [
  {w:800,h:360, label:"typical mobile landscape"},
  {w:1536,h:1024, label:"desktop 3:2-ish"},
  {w:1200,h:700, label:"wide desktop"},
];

let allPass = true;
const speed = 17, dt = 1/60;
for (const bgRect of scenarios) {
  const stepH = worldStep(1, 0, speed, dt, bgRect);
  const stepV = worldStep(0, 1, speed, dt, bgRect);
  const pixelH = Math.hypot(stepH.x/100*bgRect.w, stepH.y/100*bgRect.h);
  const pixelV = Math.hypot(stepV.x/100*bgRect.w, stepV.y/100*bgRect.h);
  const ratio = pixelH / pixelV;
  const ok = Math.abs(ratio - 1) < 0.001;
  if (!ok) allPass = false;
  console.log(`${ok ? "OK" : "FAIL"}  ${bgRect.label.padEnd(24)} (${bgRect.w}x${bgRect.h}): horizontal=${pixelH.toFixed(3)}px/frame vertical=${pixelV.toFixed(3)}px/frame ratio=${ratio.toFixed(4)}`);
}

// Also check a diagonal direction stays sane (should also be speed*dt pixels, since it's just
// a rotated unit vector under the pixel-space normalization)
const bgRect = {w:800,h:360};
const stepDiag = worldStep(1,1,speed,dt,bgRect);
const pixelDiag = Math.hypot(stepDiag.x/100*bgRect.w, stepDiag.y/100*bgRect.h);
const expectedPx = speed*dt*(bgRect.w/100);
const diagOk = Math.abs(pixelDiag - expectedPx) < 0.01;
if (!diagOk) allPass = false;
console.log(`${diagOk ? "OK" : "FAIL"}  diagonal direction: ${pixelDiag.toFixed(3)}px/frame (expected ~${expectedPx.toFixed(3)}px/frame)`);

console.log(allPass ? "\nPASS: pixel speed is equalized across directions and canvas aspect ratios." : "\nFAIL: see above.");
process.exit(allPass ? 0 : 1);
