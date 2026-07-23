window.KOMSCO = window.KOMSCO || {};
window.KOMSCO.PathEngine = {
  pointInRect(x,y,r){return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h},
  distanceSegment(px,py,ax,ay,bx,by){
    const vx=bx-ax,vy=by-ay,den=vx*vx+vy*vy;
    const t=den?Math.max(0,Math.min(1,((px-ax)*vx+(py-ay)*vy)/den)):0;
    const x=ax+t*vx,y=ay+t*vy;
    return {distance:Math.hypot(px-x,py-y),x,y,t};
  },
  edgeKey(a,b){return `${a}-${b}`},
  nearestRoad(world,x,y){
    let best={distance:Infinity,x,y,edge:null};
    for(const [a,b] of world.edges){
      const A=world.nodes[a],B=world.nodes[b];
      const q=this.distanceSegment(x,y,A[0],A[1],B[0],B[1]);
      if(q.distance<best.distance)best={...q,edge:[a,b]};
    }
    return best;
  },
  isBridge(world,x,y){
    const set=new Set(world.bridgeEdges);
    return world.edges.some(([a,b])=>{
      if(!set.has(this.edgeKey(a,b)))return false;
      const A=world.nodes[a],B=world.nodes[b];
      return this.distanceSegment(x,y,A[0],A[1],B[0],B[1]).distance<=world.roadWidth;
    });
  },
  walkable(world,x,y){
    if(x<1||x>99||y<3||y>97)return false;
    if(world.buildings.some(r=>this.pointInRect(x,y,r)))return false;
    if(this.nearestRoad(world,x,y).distance>world.roadWidth)return false;
    if(world.waterZones.some(r=>this.pointInRect(x,y,r))&&!this.isBridge(world,x,y))return false;
    return true;
  },
  nearestNode(world,x,y){
    let best=null,d=Infinity;
    for(const [id,p] of Object.entries(world.nodes)){
      const v=Math.hypot(x-p[0],y-p[1]);
      if(v<d){best=id;d=v}
    }
    return best;
  },
  shortestPath(world,start,end){
    const adj={};Object.keys(world.nodes).forEach(k=>adj[k]=[]);
    world.edges.forEach(([a,b])=>{adj[a].push(b);adj[b].push(a)});
    const queue=[start],prev={[start]:null};
    while(queue.length){
      const n=queue.shift();if(n===end)break;
      for(const v of adj[n])if(!(v in prev)){prev[v]=n;queue.push(v)}
    }
    if(!(end in prev))return[];
    const ids=[];for(let p=end;p;p=prev[p])ids.unshift(p);
    return ids.map(id=>({x:world.nodes[id][0],y:world.nodes[id][1]}));
  }
};