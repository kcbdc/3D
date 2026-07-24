const fs=require("fs"),vm=require("vm");
global.window=global;global.KOMSCO={};
vm.runInThisContext(fs.readFileSync("./src/config/world-data.js","utf8"));
vm.runInThisContext(fs.readFileSync("./src/engine/path-engine.js","utf8"));
const W=KOMSCO.WORLD,P=KOMSCO.PathEngine;
const expected={ID본부:[20.96,69.2],제지본부:[79.88,69.2],씨앗상점:[20.05,96.2]};
for(const h of W.hotspots){
 if(expected[h.label]){
  const [x,y]=expected[h.label];
  if(h.x!==x||h.y!==y) throw new Error(`bad ${h.label}`);
 }
}
for(const s of ["OT_L","OT_R","OB_L","OB_R","H1_C1","H2_C2","H3_C1"]){
 for(const h of W.hotspots){
  const path=P.shortestPath(W,s,h.node);
  if(!path.length) throw new Error(`no path ${s}->${h.node}`);
  for(let i=1;i<path.length;i++){
   if(path[i-1].x!==path[i].x&&path[i-1].y!==path[i].y) throw new Error("diagonal");
  }
 }
}
if(W.farmPlots.length!==12) throw new Error("farm count");
console.log("passed");
