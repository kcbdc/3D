const fs=require("fs"),vm=require("vm");
global.window=global;global.KOMSCO={};
vm.runInThisContext(fs.readFileSync("./src/config/world-data.js","utf8"));
vm.runInThisContext(fs.readFileSync("./src/engine/path-engine.js","utf8"));
const W=KOMSCO.WORLD,P=KOMSCO.PathEngine;
const starts=["OT_L","OT_R","OB_L","OB_R","H1_C1","H2_C2"];
for(const start of starts){
 for(const h of W.hotspots){
  const path=P.shortestPath(W,start,h.node);
  if(!path.length)throw new Error(`No path ${start}->${h.node}`);
  for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i];
   if(a.x!==b.x&&a.y!==b.y)throw new Error(`Diagonal path ${a.id}->${b.id}`);
  }
 }
}
console.log("route simulation passed");
