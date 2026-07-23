window.KOMSCO=window.KOMSCO||{};
window.KOMSCO.PathEngine={
 distanceSegment(px,py,ax,ay,bx,by){
  const vx=bx-ax,vy=by-ay,den=vx*vx+vy*vy;
  const t=den?Math.max(0,Math.min(1,((px-ax)*vx+(py-ay)*vy)/den)):0;
  const x=ax+t*vx,y=ay+t*vy;
  return{distance:Math.hypot(px-x,py-y),x,y,t};
 },
 validEdges(world){return world.edges},
 nearestRoad(world,x,y){
  let best={distance:Infinity,x,y,edge:null};
  for(const [a,b] of world.edges){
   const A=world.nodes[a],B=world.nodes[b];
   const q=this.distanceSegment(x,y,A[0],A[1],B[0],B[1]);
   if(q.distance<best.distance)best={...q,edge:[a,b]};
  }
  return best;
 },
 nearestNode(world,x,y){
  let id=null,distance=Infinity;
  for(const [key,p] of Object.entries(world.nodes)){
   const d=Math.hypot(x-p[0],y-p[1]);
   if(d<distance){id=key;distance=d}
  }
  return id;
 },
 shortestPath(world,start,end){
  const adjacency={};Object.keys(world.nodes).forEach(id=>adjacency[id]=[]);
  world.edges.forEach(([a,b])=>{adjacency[a].push(b);adjacency[b].push(a)});
  const queue=[start],previous={[start]:null};
  while(queue.length){
   const current=queue.shift();if(current===end)break;
   for(const next of adjacency[current]){
    if(!(next in previous)){previous[next]=current;queue.push(next)}
   }
  }
  if(!(end in previous))return[];
  const ids=[];for(let current=end;current;current=previous[current])ids.unshift(current);
  return ids.map(id=>({id,x:world.nodes[id][0],y:world.nodes[id][1]}));
 }
};