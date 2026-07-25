(() => {
"use strict";
const ui=id=>document.getElementById(id),canvas=ui("game");
const ctx=canvas?.getContext("2d",{alpha:false})||canvas?.getContext("2d");
if(!canvas||!ctx)throw new Error("Canvas 2D를 초기화할 수 없습니다.");
const WORLD=KOMSCO.WORLD,PATH=KOMSCO.PathEngine,SYS=KOMSCO.GameSystems;
const CHARS=SYS.characters,SEEDS=SYS.seeds,CHAR_BASE="./public/assets/characters/";
const DAY="./public/assets/world/world_day.png",NIGHT="./public/assets/world/world_exact_map.png";
const DPR=Math.min(devicePixelRatio||1, innerWidth<900?1.35:1.75);
let W=0,H=0,bgRect={x:0,y:0,w:1,h:1},bgDay,bgNight,last=performance.now(),selected=null,started=false,autoPath=[],currentEdge=null,lastUiUpdate=0,lastPetTick=0,lastDisturbanceTick=0,resizeSettleTimer=null;
const images={},keys={},dpad={up:false,down:false,left:false,right:false};let state=SYS.newState();

const isDay=()=>{const h=new Date().getHours();return h>=5&&h<19};
const activeBg=()=>isDay()?bgDay:bgNight;
function applyUiScale(){
 // Auto-shrinks HUD/dpad/interact chrome to fit small mobile screens instead of overflowing them.
 // Reference size = a comfortable small-phone landscape viewport; never scales UP past 1 on large screens.
 const REF_W=760,REF_H=380,MIN_SCALE=.62;
 const isPortrait=matchMedia("(orientation:portrait)").matches;
 // #gameShell is CSS-rotated 90deg in portrait, so the effective on-screen landscape viewport
 // is innerHeight x innerWidth (swapped), not innerWidth x innerHeight.
 const vw=isPortrait?innerHeight:innerWidth, vh=isPortrait?innerWidth:innerHeight;
 const scale=Math.max(MIN_SCALE,Math.min(1,vw/REF_W,vh/REF_H));
 document.documentElement.style.setProperty("--ui-scale",scale.toFixed(3));
}
function resize(){
 // Most reliable cross-browser viewport measurement -- dvh/dvw support is inconsistent across
 // Android WebView variants (Samsung Internet/Edge lag behind Chrome here), so we compute our
 // own from innerWidth/innerHeight and drive the portrait auto-rotate sizing from these instead.
 document.documentElement.style.setProperty("--vh",(innerHeight*0.01)+"px");
 document.documentElement.style.setProperty("--vw",(innerWidth*0.01)+"px");
 applyUiScale();
 const shell=ui("gameShell");
 const isPortrait=matchMedia("(orientation:portrait)").matches;
 if(isPortrait){
   // #gameShell is CSS-rotated 90deg to render landscape-side-up without a physical rotation;
   // its rotated bounding box reports physical (portrait) dimensions, so swap them back here.
   W=Math.max(320,Math.round(innerHeight||1280));
   H=Math.max(180,Math.round(innerWidth||720));
 }else{
   const r=shell.getBoundingClientRect();
   W=Math.max(320,Math.round(r.width||innerWidth||1280));
   H=Math.max(180,Math.round(r.height||innerHeight||720));
 }
 canvas.width=Math.max(1,Math.round(W*DPR));
 canvas.height=Math.max(1,Math.round(H*DPR));canvas.style.width=W+"px";canvas.style.height=H+"px";ctx.setTransform(DPR,0,0,DPR,0,0);updateBgRect();rebuildRouteCache();
 // Expose the game's logical (post-rotation) dimensions for CSS that needs to size itself
 // correctly regardless of physical device orientation -- raw vw/vh units and orientation-based
 // media queries both reference the PHYSICAL viewport, which is wrong once #gameShell is
 // CSS-rotated 90deg for the portrait auto-landscape trick.
 const root=document.documentElement;
 root.style.setProperty("--game-w",W+"px");
 root.style.setProperty("--game-h",H+"px");
 root.classList.toggle("compact-w",W<900);
 root.classList.toggle("compact-h",H<420);
}
function updateBgRect(){bgRect={x:0,y:0,w:W,h:H};}
const w2s=(x,y)=>({x:bgRect.x+x/100*bgRect.w,y:bgRect.y+y/100*bgRect.h});
// Converts a world-space direction (tx,ty; doesn't need to be unit length) into a world-space
// step whose ON-SCREEN PIXEL length is speed*dt, regardless of direction. See note above.
function worldStep(tx,ty,speed,dt){
 const kx=(bgRect.w||1)/100,ky=(bgRect.h||1)/100;
 const pixelLen=Math.hypot(tx*kx,ty*ky)||1;
 const scale=kx*speed*dt/pixelLen;
 return{x:tx*scale,y:ty*scale};
}
function loadImage(src){
 return new Promise(resolve=>{
   const im=new Image();
   im.decoding="async";
   im.onload=()=>resolve(im);
   im.onerror=()=>resolve(null);
   im.src=src;
 });
}
function edgeProjection(edge,x,y){
 const [a,b]=edge,A=WORLD.nodes[a],B=WORLD.nodes[b];
 const vx=B[0]-A[0],vy=B[1]-A[1],den=vx*vx+vy*vy;
 const t=den?Math.max(0,Math.min(1,((x-A[0])*vx+(y-A[1])*vy)/den)):0;
 return{x:A[0]+t*vx,y:A[1]+t*vy,t,vx,vy,length:Math.sqrt(den)};
}
function edgeKey(edge){return edge?`${edge[0]}|${edge[1]}`:""}
function connectedEdges(nodeId){return WORLD.edges.filter(([a,b])=>a===nodeId||b===nodeId)}
function edgeInfo(edge,x=state.player.x,y=state.player.y){
 const q=edgeProjection(edge,x,y),len=Math.hypot(q.vx,q.vy)||1;
 return{...q,tx:q.vx/len,ty:q.vy/len};
}
function nearestEdge(){return PATH.nearestRoad(WORLD,state.player.x,state.player.y).edge}
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
function moveOnRoute(dx,dy,dt){
 const magnitude=Math.hypot(dx,dy);if(magnitude<.05)return;
 dx/=magnitude;dy/=magnitude;
 if(!currentEdge)currentEdge=nearestEdge();
 if(!currentEdge)return;

 // Junction detection uses an ABSOLUTE world-distance radius, not a percentage of the current
 // edge's length. A percentage-based zone gives a much narrower (and easier to overshoot past)
 // window on shorter road segments than on longer ones -- which is exactly why some locations
 // could feel randomly harder to walk into than others depending on which road leads there.
 // A fixed radius feels the same everywhere on the map.
 const CAPTURE_RADIUS=2.2,SNAP_RADIUS=.08;
 function tryBranch(){
   const [a,b]=currentEdge,A=WORLD.nodes[a],B=WORLD.nodes[b];
   const distA=Math.hypot(state.player.x-A[0],state.player.y-A[1]);
   const distB=Math.hypot(state.player.x-B[0],state.player.y-B[1]);
   if(distA<=CAPTURE_RADIUS||distB<=CAPTURE_RADIUS){
     const nodeId=distA<=distB?a:b;
     const next=chooseEdgeAtNode(nodeId,dx,dy,currentEdge);
     if(next&&edgeKey(next)!==edgeKey(currentEdge))currentEdge=next;
   }
 }
 tryBranch();

 const info=edgeInfo(currentEdge);
 const sign=(dx*info.tx+dy*info.ty)>=0?1:-1;
 const speed=state.player.speed*CHARS[state.character].speed;
 const step=worldStep(info.tx*sign,info.ty*sign,speed,dt);
 const projected=edgeProjection(currentEdge,info.x+step.x,info.y+step.y);
 state.player.x=projected.x;state.player.y=projected.y;
 const desired=info.tx*sign<0?-1:1;
 state.player.dirLerp=(state.player.dirLerp??state.player.dir??1)+(desired-(state.player.dirLerp??state.player.dir??1))*Math.min(1,dt*9);
 state.player.dir=state.player.dirLerp<0?-1:1;

 tryBranch(); // re-check after moving too, so a fresh arrival within the radius this frame still gets a chance to branch

 const [a,b]=currentEdge,A=WORLD.nodes[a],B=WORLD.nodes[b];
 const distA=Math.hypot(state.player.x-A[0],state.player.y-A[1]);
 const distB=Math.hypot(state.player.x-B[0],state.player.y-B[1]);
 if(distA<=SNAP_RADIUS){state.player.x=A[0];state.player.y=A[1]}
 else if(distB<=SNAP_RADIUS){state.player.x=B[0];state.player.y=B[1]}
}
function draw(){
 const fallback=ctx.createLinearGradient(0,0,0,H);
 fallback.addColorStop(0,"#071c33");fallback.addColorStop(1,"#020711");
 ctx.fillStyle=fallback;ctx.fillRect(0,0,W,H);
 const im=activeBg();
 if(im){updateBgRect();ctx.drawImage(im,bgRect.x,bgRect.y,bgRect.w,bgRect.h)}
 drawGuides();drawHotspots();drawCrops();drawFarmDecor();drawPlayer();
 drawWeatherOverlay();
}
let routeScreenCache=[];
function rebuildRouteCache(){
 routeScreenCache=PATH.validEdges(WORLD).map(([a,b])=>({
   a,b,A:w2s(...WORLD.nodes[a]),B:w2s(...WORLD.nodes[b])
 }));
}
function drawGuides(){
  // Guide lines removed per request — the background art already shows the roads clearly.
}
// Hysteresis for hotspot proximity: entering requires crossing h.r, but once "inside" the
// same hotspot, exiting requires stepping back out past h.r*1.18. Without this, a player
// standing almost exactly on the boundary (very common right when arriving via AUTO or
// walking manually into a hotspot) would flip in/out of range from a single pixel of
// jitter, which is what caused the glow/color/interactionHint to visibly flicker.
let nearHotspotIdx=-1;
function isNearHotspot(h,idx){
  const dist=Math.hypot(state.player.x-h.x,state.player.y-h.y);
  return dist < (idx===nearHotspotIdx ? h.r*1.18 : h.r);
}
function drawHotspots(){
  const t=performance.now()/1000;
  WORLD.hotspots.forEach((h,idx)=>{
    const p=w2s(h.x,h.y);
    const near=isNearHotspot(h,idx);
    const pulse=Math.sin(t*3)*1.5;
    ctx.save();
    ctx.fillStyle=near?"rgba(255,230,96,.20)":"rgba(255,255,255,.035)";
    ctx.strokeStyle=near?"#ffe878":h.color;
    ctx.shadowColor=ctx.strokeStyle;
    ctx.shadowBlur=near?22:13;
    ctx.lineWidth=near?4:2.5;
    ctx.beginPath();
    ctx.ellipse(p.x,p.y,25+pulse,10+pulse*.25,0,0,Math.PI*2);
    ctx.fill();ctx.stroke();ctx.restore();
  });
}
function drawCrops(){
  const plots=WORLD.farmPlots||[];
  state.farm.forEach((f,i)=>{
    if(!f.seed||!plots[i])return;
    const pos=plots[i];
    const p=w2s(pos[0],pos[1]);
    const growth=Math.min(1,(Date.now()-f.plantedAt)/f.growMs);
    const size=(24+growth*10)*0.97; // 3% 크기 축소
    const stageEmoji=growth>=1?SEEDS[f.seed].emoji:growth<0.34?"🌱":growth<0.7?"🌿":SEEDS[f.seed].emoji;
    // 새싹 단계부터 눈에 잘 띄도록, 모든 성장 단계에서 부드러운 원형 배경(halo)을 밭 중심(땅
    // 높이)에 먼저 깔아줌
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x,p.y,size*0.62,0,Math.PI*2);
    ctx.fillStyle=growth>=1?"rgba(255,214,102,.28)":"rgba(255,255,255,.22)";
    ctx.fill();
    ctx.restore();
    // 성장 진행률 표시: 새싹 바로 아래(땅 높이 기준)에 아주 작은 막대바로 표시
    if(growth<1){
      const barW=size*1.1,barH=2.6,barX=p.x-barW/2,barY=p.y+4;
      ctx.save();
      ctx.fillStyle="rgba(0,0,0,.45)";
      ctx.fillRect(barX,barY,barW,barH);
      ctx.fillStyle="rgba(120,255,160,.95)";
      ctx.fillRect(barX,barY,barW*growth,barH);
      ctx.restore();
    }
    ctx.save();
    ctx.font=`${size}px serif`;
    ctx.textAlign="center";
    // 자라는 중(growth<1)일 때는 줄기 '밑동'이 밭 중심(땅 높이)에 오도록 바닥 기준으로 정렬해
    // 위로 자라나는 모습이 되고, 다 자란 뒤(growth>=1)에는 열매가 중심에 앉은 모습이 되도록
    // 가운데 기준으로 정렬 (사용자가 다 자란 상태 위치는 그대로 좋다고 확인함)
    ctx.textBaseline=growth>=1?"middle":"bottom";
    ctx.shadowColor=growth>=1?"rgba(255,224,102,.95)":"rgba(58,255,126,.9)";
    ctx.shadowBlur=growth>=1?14:10;
    ctx.fillText(stageEmoji,p.x,p.y);
    ctx.restore();
    if(growth>=1){
      ctx.save();
      ctx.font="12px serif";
      ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText("✨",p.x+size*0.55,p.y-size*0.55);
      ctx.restore();
    }
  });
}

let petWander=null,lastPetFrameTime=0;
function updatePetWander(bounds){
 const now=Date.now();
 const dt=lastPetFrameTime?Math.min(0.08,(now-lastPetFrameTime)/1000):0;
 lastPetFrameTime=now;
 if(!petWander){
   const cx=(bounds.minX+bounds.maxX)/2,cy=(bounds.minY+bounds.maxY)/2;
   petWander={x:cx,y:cy,tx:cx,ty:cy,pausedUntil:0,facingLeft:false,walking:false};
 }
 const p=petWander;
 if(now<p.pausedUntil){p.walking=false;return p}
 const dx=p.tx-p.x,dy=p.ty-p.y,dist=Math.hypot(dx,dy);
 if(dist<0.35){
   // 도착: 잠깐 멈춰서 쉬었다가, 밭 안의 새로운 목표 지점을 골라 다시 걷기 시작
   p.tx=bounds.minX+Math.random()*(bounds.maxX-bounds.minX);
   p.ty=bounds.minY+Math.random()*(bounds.maxY-bounds.minY);
   p.pausedUntil=now+700+Math.random()*1600;
   p.walking=false;
 }else{
   const speed=3.4; // world-units/sec, 자연스러운 걷는 속도
   const step=Math.min(speed*dt,dist);
   p.facingLeft=dx<0;
   p.x+=(dx/dist)*step;
   p.y+=(dy/dist)*step;
   p.walking=true;
 }
 return p;
}
function drawFarmDecor(){
 const plots=WORLD.farmPlots||[];
 if(!plots.length)return;
 const xs=plots.map(p=>p[0]),ys=plots.map(p=>p[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const cx=(minX+maxX)/2;
 // 허수아비 영웅: 밭 위쪽 가장자리에서 좀 더 위로 올려서 배치 (표준 유니코드에 허수아비
 // 이모지가 없어 농부 이모지로 대체 표현)
 if(state.upgrades.scarecrow){
   const p=w2s(cx,minY-4.8);
   ctx.save();ctx.font="26px serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.shadowColor="rgba(255,214,102,.8)";ctx.shadowBlur=10;ctx.fillText("🧑‍🌾",p.x,p.y);ctx.restore();
 }
 // 수확도우미 댕댕이: 밭 안에서 목표 지점을 향해 자연스럽게 걷다가 도착하면 잠깐 쉬고,
 // 다시 새 목표를 골라 걷는 방식 (이전의 sine파 미끄러짐보다 훨씬 동물답게 움직임)
 if(state.upgrades.pet){
   const marginX=(maxX-minX)*0.12,marginY=(maxY-minY)*0.12;
   const bounds={minX:minX+marginX,maxX:maxX-marginX,minY:minY+marginY,maxY:maxY-marginY};
   const pet=updatePetWander(bounds);
   const bob=pet.walking?Math.abs(Math.sin(Date.now()/140))*1.1:0;
   const p=w2s(pet.x,pet.y-bob*0.05);
   ctx.save();ctx.font="22px serif";ctx.textAlign="center";ctx.textBaseline="middle";
   if(pet.facingLeft){ctx.translate(p.x,p.y);ctx.scale(-1,1);ctx.fillText("🐕",0,0)}
   else ctx.fillText("🐕",p.x,p.y);
   ctx.restore();
 }
 // 방해요소: 성장 중인 작물 위에 주기적으로 까마귀가 나타남 (허수아비 보유 시 즉시 쫓겨남)
 const dist=state.farmDisturbance;
 if(dist&&dist.cellIdx>=0&&Date.now()<dist.expiresAt&&plots[dist.cellIdx]){
   const pos=plots[dist.cellIdx];
   const bob=Math.sin(Date.now()/200)*3;
   const p=w2s(pos[0],pos[1]-4);
   ctx.save();ctx.font="20px serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("🐦‍⬛",p.x,p.y+bob);ctx.restore();
 }
}
function farmDisturbanceTick(){
 const dist=state.farmDisturbance;
 // 활성 방해요소가 만료되면 정산: 허수아비가 없으면 해당 밭의 성장을 살짝 지연시킴
 if(dist&&dist.cellIdx>=0&&Date.now()>=dist.expiresAt){
   const f=state.farm[dist.cellIdx];
   if(f&&f.seed&&!state.upgrades.scarecrow){
     const remaining=f.growMs-(Date.now()-f.plantedAt);
     if(remaining>0){f.plantedAt+=Math.round(f.growMs*0.12);toast("🐦‍⬛ 까마귀가 작물을 건드려 성장이 조금 지연됐어요!")}
   }else if(f&&f.seed&&state.upgrades.scarecrow){
     toast("🧑‍🌾 허수아비가 까마귀를 쫓아냈어요!");
   }
   state.farmDisturbance={cellIdx:-1,expiresAt:0};save();
   return;
 }
 if(dist&&dist.cellIdx>=0)return; // 이미 진행 중
 if(Math.random()>0.35)return; // 매 틱마다 35% 확률로만 등장 시도
 const candidates=state.farm.map((f,i)=>f.seed&&(Date.now()-f.plantedAt)<f.growMs?i:-1).filter(i=>i>=0);
 if(!candidates.length)return;
 const idx=candidates[Math.floor(Math.random()*candidates.length)];
 state.farmDisturbance={cellIdx:idx,expiresAt:Date.now()+5000};
}

/* ===================== 실시간 날씨 기반 배경 환경 (맑음/흐림/비/눈) =====================
   Open-Meteo(무료, API 키 불필요)에서 현재 날씨를 가져와 캔버스 위에 오버레이로 표현합니다.
   위치 권한이 없거나 네트워크가 막혀도 항상 "맑음"으로 안전하게 대체됩니다. */
let weatherKind="clear",weatherParticles=[];
function weatherCodeToKind(code){
 if(code==null)return"clear";
 if(code>=95)return"rain"; // 뇌우도 비 연출로 통합
 if(code>=71&&code<=77)return"snow";
 if(code>=85&&code<=86)return"snow";
 if(code>=51&&code<=67)return"rain";
 if(code>=80&&code<=82)return"rain";
 if(code>=45&&code<=48)return"cloudy"; // 안개
 if(code>=1&&code<=3)return"cloudy";
 return"clear";
}
function initWeatherParticles(kind){
 weatherParticles=[];
 if(kind==="rain"){
   for(let i=0;i<70;i++)weatherParticles.push({x:Math.random()*W,y:Math.random()*H,len:14+Math.random()*10,speed:9+Math.random()*5});
 }else if(kind==="snow"){
   for(let i=0;i<50;i++)weatherParticles.push({x:Math.random()*W,y:Math.random()*H,r:1.5+Math.random()*2.2,speed:0.8+Math.random()*1.2,drift:Math.random()*2-1});
 }
}
function drawWeatherOverlay(){
 if(weatherKind==="clear")return;
 ctx.save();
 if(weatherKind==="cloudy"){
   ctx.fillStyle="rgba(60,70,85,.22)";ctx.fillRect(0,0,W,H);
 }else if(weatherKind==="rain"){
   ctx.fillStyle="rgba(30,40,60,.28)";ctx.fillRect(0,0,W,H);
   ctx.strokeStyle="rgba(200,225,255,.55)";ctx.lineWidth=1.4;
   weatherParticles.forEach(p=>{
     ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-4,p.y+p.len);ctx.stroke();
     p.y+=p.speed;p.x-=p.speed*0.35;
     if(p.y>H){p.y=-p.len;p.x=Math.random()*W}
     if(p.x<0)p.x=W;
   });
 }else if(weatherKind==="snow"){
   ctx.fillStyle="rgba(210,225,245,.10)";ctx.fillRect(0,0,W,H);
   ctx.fillStyle="rgba(255,255,255,.9)";
   weatherParticles.forEach(p=>{
     ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
     p.y+=p.speed;p.x+=p.drift*0.4;
     if(p.y>H){p.y=-4;p.x=Math.random()*W}
     if(p.x<0)p.x=W;if(p.x>W)p.x=0;
   });
 }
 ctx.restore();
}
function setWeather(kind){
 if(kind===weatherKind)return;
 weatherKind=kind;
 initWeatherParticles(kind);
}
async function fetchWeather(){
 try{
   const pos=await new Promise((resolve)=>{
     if(!navigator.geolocation){resolve(null);return}
     navigator.geolocation.getCurrentPosition(
       p=>resolve(p),
       ()=>resolve(null),
       {timeout:4000,maximumAge:600000}
     );
   });
   const lat=pos?pos.coords.latitude:37.5665,lon=pos?pos.coords.longitude:126.9780; // 위치 정보가 없으면 서울 기준
   const res=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code`);
   if(!res.ok)throw new Error("weather fetch failed");
   const data=await res.json();
   setWeather(weatherCodeToKind(data?.current?.weather_code));
 }catch{
   setWeather("clear"); // 오프라인/권한거부/차단 등 어떤 이유로든 실패하면 항상 안전하게 맑음으로
 }
}

function isMoving(){
  return Boolean(
    dpad.up||dpad.down||dpad.left||dpad.right||
    autoPath.length||
    keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight||
    keys.w||keys.a||keys.s||keys.d
  );
}

function drawPlayer(){
  const im=images[state.character];
  if(!im)return;

  const p=w2s(state.player.x,state.player.y);
  const height=Math.max(82,Math.min(145,W*.085));
  const width=height*(im.naturalWidth||im.width)/(im.naturalHeight||im.height);
  const bob=isMoving()?Math.sin(performance.now()*.015)*3:0;
  const direction=Number.isFinite(state.player.dirLerp)
    ? state.player.dirLerp
    : (state.player.dir||1);

  ctx.save();
  ctx.translate(p.x,p.y);

  ctx.globalAlpha=.28;
  ctx.fillStyle="#000";
  ctx.beginPath();
  ctx.ellipse(0,5,width*.32,width*.11,0,0,Math.PI*2);
  ctx.fill();

  ctx.globalAlpha=1;
  ctx.shadowColor="#42d8ff";
  ctx.shadowBlur=15;
  ctx.scale(direction,1);
  ctx.drawImage(im,-width/2,-height+bob,width,height);
  ctx.restore();
}

function update(dt){
  if(!started)return;

  let dx=0,dy=0;

  if(autoPath.length){
    const target=autoPath[0];
    const isFinalHop=autoPath.length===1; // last waypoint = the hotspot itself, may sit off-road
    dx=target.x-state.player.x;
    dy=target.y-state.player.y;
    const dist=Math.hypot(dx,dy);

    if(dist<.38){
      state.player.x=target.x;
      state.player.y=target.y;
      autoPath.shift();

      if(autoPath.length){
        const next=autoPath[0];
        const currentNode=PATH.nearestNode(WORLD,state.player.x,state.player.y);
        const nextNode=PATH.nearestNode(WORLD,next.x,next.y);
        currentEdge=WORLD.edges.find(([a,b])=>
          (a===currentNode&&b===nextNode)||(a===nextNode&&b===currentNode)
        )||currentEdge;
      }else{
        currentEdge=null; // route finished; re-resolve nearest road fresh on next manual move
        setAutoActive(false);
      }

      dx=0;
      dy=0;
    }else if(isFinalHop){
      // free 2D movement straight to the hotspot — no road constraint, so no edge-projection shake
      const speed=state.player.speed*CHARS[state.character].speed;
      const nx=dx/dist,ny=dy/dist;
      const step=worldStep(nx,ny,speed,dt);
      state.player.x+=step.x;
      state.player.y+=step.y;
      const desired=nx<0?-1:1;
      state.player.dirLerp=(state.player.dirLerp??state.player.dir??1)+(desired-(state.player.dirLerp??state.player.dir??1))*Math.min(1,dt*9);
      state.player.dir=state.player.dirLerp<0?-1:1;
      dx=0;
      dy=0;
    }
  }else{
    dx=(dpad.right?1:0)-(dpad.left?1:0)
      +(keys.ArrowRight||keys.d?1:0)
      -(keys.ArrowLeft||keys.a?1:0);
    dy=(dpad.down?1:0)-(dpad.up?1:0)
      +(keys.ArrowDown||keys.s?1:0)
      -(keys.ArrowUp||keys.w?1:0);
  }

  moveOnRoute(dx,dy,dt);

  const near=getNear();
  const hint=ui("interactionHint");
  if(hint){
    hint.classList.toggle("show",Boolean(near));
    hint.textContent=near?`${near.label} · 상호작용`:"";
  }

  const now=performance.now();
  if(now-lastUiUpdate>120){
    updateUI(near);
    lastUiUpdate=now;
  }
  if(now-lastPetTick>3000){
    petAutoHarvestTick();
    lastPetTick=now;
  }
  if(now-lastDisturbanceTick>4000){
    farmDisturbanceTick();
    lastDisturbanceTick=now;
  }
}

function getNear(){
  let best=null,bestIdx=-1,d=Infinity;
  WORLD.hotspots.forEach((h,idx)=>{
    const n=Math.hypot(state.player.x-h.x,state.player.y-h.y);
    if(isNearHotspot(h,idx)&&n<d){best=h;bestIdx=idx;d=n}
  });
  nearHotspotIdx=bestIdx;
  return best;
}
function setAutoActive(on){ui("autoBtn")?.classList.toggle("active",on)}
function startAuto(h){
 const nearest=PATH.nearestRoad(WORLD,state.player.x,state.player.y);
 if(!nearest.edge){toast("현재 위치에서 도로를 찾을 수 없습니다.");return}
 const [a,b]=nearest.edge,A=WORLD.nodes[a],B=WORLD.nodes[b];
 const pathA=PATH.shortestPath(WORLD,a,h.node),pathB=PATH.shortestPath(WORLD,b,h.node);
 const costA=Math.hypot(state.player.x-A[0],state.player.y-A[1])+pathA.length;
 const costB=Math.hypot(state.player.x-B[0],state.player.y-B[1])+pathB.length;
 const selected=costA<=costB?pathA:pathB,endpoint=costA<=costB?A:B;
 if(!selected.length){toast(`${h.label}로 이동할 수 있는 도로가 없습니다.`);return}
 autoPath=[{x:endpoint[0],y:endpoint[1]},...selected.slice(1).map(p=>({x:p.x,y:p.y}))];
 const last=autoPath[autoPath.length-1];
 if(!last||Math.hypot(last.x-h.x,last.y-h.y)>.05)autoPath.push({x:h.x,y:h.y});
 currentEdge=nearest.edge;
 setAutoActive(true);
 toast(`${h.label} 경로 안내를 시작합니다.`);
}
function interact(){const h=getNear();if(!h){toast("상호작용 원 안으로 이동하세요.");return}if(h.type==="work")doWork(h);if(h.type==="shop")openShop();if(h.type==="farm")openFarm()}
function doWork(h){
 const pool=SYS.missionPool[h.node];
 if(pool&&pool.length){openMission(h,pool);return}
 const reward=Math.round(h.reward*CHARS[state.character].reward);state.gold+=reward;recalcLevel();state.quests[0]=true;save();toast(`${h.label} 업무 완료 · +${reward}G`)
}
function shuffleArray(arr){
 const a=arr.slice();
 for(let i=a.length-1;i>0;i--){
   const j=Math.floor(Math.random()*(i+1));
   [a[i],a[j]]=[a[j],a[i]];
 }
 return a;
}
function openMission(h,pool){
 const rawIdx=state.missionIndex[h.node];
 const idx=(Number.isFinite(rawIdx)?rawIdx:0)%pool.length;
 const m=pool[idx];
 if(!m){ // defensive fallback -- should never happen now, but never crash the game over a bad mission index
   const reward=Math.round(h.reward*CHARS[state.character].reward);state.gold+=reward;recalcLevel();state.quests[0]=true;save();toast(`${h.label} 업무 완료 · +${reward}G`);return;
 }
 // 정답이 항상 데이터의 첫 번째 항목으로 고정되어 있어 매번 1번만 고르면 통과되는 문제가
 // 있었음 -- 표시할 때마다 옵션 순서를 랜덤으로 섞어서 정답 위치가 매번 바뀌도록 함
 const shuffled=shuffleArray(m.options);
 let html=`<h2>📋 ${h.label} · 구매 미션</h2><p>${m.title}</p><p style="opacity:.75;font-size:13px;">${m.spec}</p><div class="shop-grid">`;
 shuffled.forEach((o,i)=>{html+=`<article class="item mission-opt"><p class="mission-opt-text">${o.text}</p><p class="mission-opt-price">${o.price.toLocaleString()}원</p><button type="button" data-opt="${i}">이 업체 선택</button></article>`});
 html+=`</div><button type="button" id="ai-advisor-btn" class="ai-advisor-btn">🤖 AI 조달 자문관에게 물어보기</button><div id="ai-hint" class="ai-hint-box" style="display:none;"></div>`;
 openModal(html);
 document.querySelectorAll("[data-opt]").forEach(b=>b.addEventListener("click",()=>resolveMission(h,pool,idx,shuffled,+b.dataset.opt)));
 document.getElementById("ai-advisor-btn").addEventListener("click",()=>showAiHint(m));
}
function resolveMission(h,pool,idx,shuffledOptions,optIdx){
 const o=shuffledOptions[optIdx];
 if(o.correct){
   const reward=Math.round(h.reward*CHARS[state.character].reward);
   state.gold+=reward;recalcLevel();state.quests[0]=true;
   state.missionIndex[h.node]=(idx+1)%pool.length;
   save();
   toast(`✅ 정답! ${h.label} 업무 완료 · +${reward}G`);
   pushNotification("업무 완료",`${h.label}에서 미션을 성공적으로 완료했습니다. +${reward}G`);
 }else{
   toast(`❌ ${o.reason}`);
 }
 closeModal();
}
// AI 조달 자문관: 2D 버전과 동일하게, 규칙 기반 오프라인 힌트로 동작 (외부 AI 서버 없음)
function showAiHint(m){
 const box=document.getElementById("ai-hint");
 if(!box)return;
 box.style.display="block";
 const tip=(m.rule!=null&&SYS.ruleList[m.rule])
   ?`이 발주는 공공구매 12대 원칙 중 "${SYS.ruleList[m.rule]}"과 관련이 있어요. 해당 인증·서류를 보유한 업체를 찾아보세요.`
   :"견적가가 예산상한을 넘지 않는지부터 확인하고, 인증서를 보유한 업체인지 살펴보세요.";
 box.innerHTML=`<b>🤖 AI 조달 자문관</b><br>${tip}`;
}
function openShop(){let html="<h2>🌱 씨앗상점</h2><div class='shop-grid'>";for(const[id,s]of Object.entries(SEEDS))html+=`<article class="item shop-item"><h3>${s.emoji} ${s.name}</h3><p><b>${s.price}G</b></p><button type="button" data-buy="${id}">구매</button></article>`;html+="</div><h2>🛠️ 농장 도구</h2><div class='shop-grid'>";for(const[id,u]of Object.entries(SYS.upgrades)){const owned=state.upgrades[id];html+=`<article class="item shop-item"><h3>${u.icon} ${u.name}</h3><p>${u.desc}</p><p><b>${owned?"보유 중":u.cost+"G"}</b></p><button type="button" data-upgrade="${id}" ${owned?"disabled":""}>${owned?"구매완료":"구매"}</button></article>`}html+="</div>";openModal(html);document.querySelectorAll("[data-buy]").forEach(b=>b.addEventListener("click",()=>buySeed(b.dataset.buy)));document.querySelectorAll("[data-upgrade]").forEach(b=>b.addEventListener("click",()=>buyUpgrade(b.dataset.upgrade)))}
function buyUpgrade(id){const u=SYS.upgrades[id];if(state.upgrades[id]){toast("이미 보유한 도구입니다.");return}if(state.gold<u.cost){toast("골드가 부족합니다.");return}state.gold-=u.cost;state.upgrades[id]=true;save();toast(`${u.icon} ${u.name} 구매 완료!`);flashGold();openShop()}
function buySeed(id){const s=SEEDS[id];if(state.gold<s.price){toast("골드가 부족합니다.");return}state.gold-=s.price;state.inventory[id]++;state.seeds++;state.quests[1]=true;save();toast(`${s.emoji} ${s.name} 구매완료! (보유 ${state.inventory[id]}개, 잔액 ${state.gold.toLocaleString()}G)`);flashGold();openShop()}
function flashGold(){const el=ui("goldText");if(!el)return;el.classList.remove("flash");void el.offsetWidth;el.classList.add("flash")}
function openFarm(){let html="<h2>🌿 주말농장</h2><p>각 밭을 선택해 씨앗을 심고 성장 후 수확하세요.</p><div class='farm-grid'>";state.farm.forEach((f,i)=>{if(!f.seed)html+=`<article class=item><h3>밭 ${i+1}</h3><button data-plot="${i}">씨앗 심기</button></article>`;else{const left=Math.max(0,f.growMs-(Date.now()-f.plantedAt));const growth=Math.min(1,(Date.now()-f.plantedAt)/f.growMs);const stageEmoji=growth>=1?SEEDS[f.seed].emoji:growth<0.34?"🌱":growth<0.7?"🌿":SEEDS[f.seed].emoji;html+=`<article class=item><h3>${stageEmoji} 밭 ${i+1}</h3><div class="farm-progress"><div class="farm-progress-bar" style="width:${Math.round(growth*100)}%"></div></div><p>${left?Math.ceil(left/1000)+"초":"수확 가능"}</p><button data-plot="${i}">${left?"확인":"수확"}</button></article>`}});html+="</div>";openModal(html);document.querySelectorAll("[data-plot]").forEach(b=>b.addEventListener("click",()=>usePlot(+b.dataset.plot)))}
function usePlot(i){const f=state.farm[i];if(!f.seed){let html="<h2>심을 씨앗 선택</h2><div class='shop-grid'>";Object.entries(SEEDS).forEach(([id,s])=>{const owned=state.inventory[id]||0;html+=`<article class="item"><h3>${s.emoji} ${s.name}</h3><p style="opacity:.75;font-size:12px;margin:2px 0;">보유 ${owned}개</p><button type="button" data-plant="${id}" ${owned<=0?"disabled":""}>${owned<=0?"미보유":"심기"}</button></article>`});html+="</div>";openModal(html);document.querySelectorAll("[data-plant]:not(:disabled)").forEach(b=>b.addEventListener("click",()=>plant(i,b.dataset.plant)));return}if(Date.now()-f.plantedAt<f.growMs){toast("아직 성장 중입니다.");return}harvestPlot(i);openFarm()}
function harvestPlot(i){const f=state.farm[i];if(!f.seed)return false;if(Date.now()-f.plantedAt<f.growMs)return false;const s=SEEDS[f.seed];const reward=Math.round(s.reward*(state.upgrades.scarecrow?1.1:1));state.gold+=reward;state.harvest++;state.quests[3]=true;state.farm[i]={seed:null,plantedAt:0,growMs:0};save();return reward}
function petAutoHarvestTick(){
 if(!state.upgrades.pet)return;
 let total=0,count=0;
 state.farm.forEach((f,i)=>{if(f.seed&&Date.now()-f.plantedAt>=f.growMs){const r=harvestPlot(i);if(r){total+=r;count++}}});
 if(count)toast(`🐶 수확도우미가 ${count}개 작물을 자동 수확 · +${total}G`);
}
async function serverNow(){try{const r=await fetch("./api/time");if(r.ok)return(await r.json()).now}catch{}return Date.now()}
async function plant(i,id){state.inventory[id]--;state.seeds--;const growMs=Math.round(SEEDS[id].grow*(state.upgrades.water?0.8:1));state.farm[i]={seed:id,plantedAt:await serverNow(),growMs};state.quests[2]=true;closeModal();save()}
function updateUI(near){ui("goldText").textContent=state.gold.toLocaleString();ui("seedText").textContent=state.seeds;ui("harvestText").textContent=state.harvest;ui("levelText").textContent=state.level;ui("heroName").textContent=CHARS[state.character].name;ui("portrait").src=CHAR_BASE+CHARS[state.character].img;ui("regionText").textContent=near?near.label:(state.player.x>66?"주말농장 지구":"네온 중앙지구");const labels=["회사 본부에서 업무 수행","씨앗상점에서 씨앗 구매","주말농장에 씨앗 심기","다 자란 작물 수확"];ui("questList").innerHTML=labels.map((x,i)=>`<li class="${state.quests[i]?"done":""}">${x} ${state.quests[i]?"1/1":"0/1"}</li>`).join("");ui("inventoryPreview").innerHTML=Object.entries(SEEDS).map(([id,s])=>`<span>${s.emoji}<small>${state.inventory[id]}</small></span>`).join("")}
function openModal(html){ui("modalBody").innerHTML=html;ui("modal").classList.add("show")}function closeModal(){ui("modal").classList.remove("show")}function toast(t){ui("toast").textContent=t;ui("toast").classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>ui("toast").classList.remove("show"),1700)}
function save(){localStorage.setItem("komscoExactMapFullscreenRouteV9",JSON.stringify(state))}
function load(){
 try{
   const v=JSON.parse(localStorage.getItem("komscoExactMapFullscreenRouteV9"));
   if(v){
     const fresh=SYS.newState();
     state=Object.assign(fresh,v);
     // Object.assign above is shallow -- an older save's smaller inventory/upgrades objects
     // would otherwise wholesale-replace the new defaults and drop newly-added keys
     // (e.g. old 3-seed saves losing the other 9 seed types added later). Merge these
     // nested objects key-by-key instead so old saves gain new fields rather than lose them.
     state.inventory=Object.assign({},fresh.inventory,v.inventory||{});
     state.upgrades=Object.assign({},fresh.upgrades,v.upgrades||{});
     state.missionIndex=Object.assign({},fresh.missionIndex,v.missionIndex||{});
     // 방어적 정리: 어떤 이유로든 개수가 NaN/undefined/음수가 되면 구매한 씨앗이 "사라진"
     // 것처럼 보일 수 있으므로, 항상 0 이상의 정수로 되돌림
     for(const id of Object.keys(fresh.inventory)){
       const n=Number(state.inventory[id]);
       state.inventory[id]=Number.isFinite(n)&&n>0?Math.floor(n):0;
     }
   }
 }catch(error){
   console.warn("저장 데이터 복구 실패",error);
   state=SYS.newState();
 }
 if(!state.player||!Number.isFinite(state.player.x)||!Number.isFinite(state.player.y)){
   state=SYS.newState();
 }
 const q=PATH.nearestRoad(WORLD,state.player.x,state.player.y);
 state.player.x=q.x;
 state.player.y=q.y;
 state.player.dir=state.player.dir||1;
 state.player.dirLerp=state.player.dir;
 if(!state.player.speed||state.player.speed<17)state.player.speed=17; // migrate pre-v12 saves to the RUN-removal baseline speed
}
function buildCards(){const desc={hunmin:"업무와 농장 성장이 균형 잡힌 전략가",daim:"업무 골드 보상이 20% 증가하는 탐색관",sunsik:"이동 속도가 15% 빠른 호위무사"};ui("characterCards").innerHTML=Object.entries(CHARS).map(([id,c])=>`<article class="character-card" data-char="${id}"><img src="${CHAR_BASE+c.img}" alt="${c.name}"><div class=card-copy><h3>${c.name}</h3><b>${c.role}</b><p>${desc[id]}</p></div></article>`).join("");document.querySelectorAll("[data-char]").forEach(card=>card.addEventListener("click",()=>{selected=card.dataset.char;document.querySelectorAll("[data-char]").forEach(x=>x.classList.toggle("selected",x===card));ui("startBtn").disabled=false}))}
const dpadDebug={up:{pd:0,ts:0,tt:0},down:{pd:0,ts:0,tt:0},left:{pd:0,ts:0,tt:0},right:{pd:0,ts:0,tt:0}};
function bindDpad(id,key){
 const el=ui(id);
 if(!el){console.warn(`이동 버튼 누락: ${id}`);return;}
 const down=e=>{
   e.preventDefault();
   if(e.type==="pointerdown")dpadDebug[key].pd++;
   if(e.type==="touchstart")dpadDebug[key].tt++;
   if(autoPath.length){autoPath=[];currentEdge=null;setAutoActive(false)} // manual input takes over instantly, no stale route/edge
   dpad[key]=true;el.classList.add("pressed");el.setPointerCapture?.(e.pointerId)
 };
 const up=e=>{e?.preventDefault?.();dpad[key]=false;el.classList.remove("pressed")};
 el.addEventListener("pointerdown",down);
 el.addEventListener("pointerup",up);
 el.addEventListener("pointercancel",up);
 el.addEventListener("lostpointercapture",up);
 // Touch-event fallback: some Android WebView browsers (Samsung Internet/Edge) have had
 // inconsistent Pointer Events support compared to desktop-parity Chrome, which can silently
 // drop pointerdown/up on some buttons but not others -- touch events are the more universally
 // reliable API to layer on top as a safety net.
 el.addEventListener("touchstart",down,{passive:false});
 el.addEventListener("touchmove",e=>e.preventDefault(),{passive:false});
 el.addEventListener("touchend",up,{passive:false});
 el.addEventListener("touchcancel",up,{passive:false});
}
addEventListener("contextmenu",e=>e.preventDefault());
addEventListener("selectstart",e=>e.preventDefault());
addEventListener("copy",e=>e.preventDefault());
const MOVE_KEYS=new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d"]);
addEventListener("resize",resize);
addEventListener("orientationchange",()=>{
  // iOS/Android often report stale innerWidth/innerHeight the instant orientationchange fires;
  // re-measure shortly after the browser finishes its own layout pass so the dpad/HUD realign correctly.
  clearTimeout(resizeSettleTimer);
  resizeSettleTimer=setTimeout(resize,120);
});
if(window.visualViewport){
  // Fires specifically when a mobile browser's address bar/toolbar shows or hides, changing
  // the truly-visible viewport -- a plain window 'resize' event doesn't always fire for this,
  // which could leave the dpad positioned against a stale (too-small or too-large) measurement
  // until some other event happened to trigger a recompute.
  visualViewport.addEventListener("resize",resize);
  visualViewport.addEventListener("scroll",resize);
}
addEventListener("keydown",e=>{
  keys[e.key]=true;
  if(MOVE_KEYS.has(e.key)&&autoPath.length){autoPath=[];currentEdge=null;setAutoActive(false)}
  if(e.key==="e"||e.key==="Enter")interact()
});
addEventListener("keyup",e=>keys[e.key]=false);
bindDpad("moveUp","up");bindDpad("moveDown","down");bindDpad("moveLeft","left");bindDpad("moveRight","right");
ui("interactBtn").addEventListener("click",interact);
ui("autoBtn").addEventListener("click",()=>{
 if(autoPath.length){ // tap again to cancel an in-progress route
   autoPath=[];currentEdge=null;setAutoActive(false);toast("자동 이동을 취소했습니다.");return;
 }
 const h=WORLD.hotspots.reduce((a,b)=>Math.hypot(state.player.x-a.x,state.player.y-a.y)<Math.hypot(state.player.x-b.x,state.player.y-b.y)?a:b);
 startAuto(h);
});
ui("rankingBtn").addEventListener("click",()=>openModal(`<h2>🏆 랭킹</h2><div class=item><b>현재 점수</b><p>${state.gold+state.harvest*100+state.level*1000}</p></div>`));ui("codexBtn").addEventListener("click",()=>openModal(`<h2>📖 도감</h2><div class=item><p>업무·씨앗·작물 도감이 표시되는 영역입니다.</p></div>`));ui("settingsBtn").addEventListener("click",()=>openModal(`<h2>⚙️ 설정</h2><div class=item><p>낮·밤 자동 전환과 가로 화면 고정이 적용되어 있습니다.</p></div>`));ui("notifBtn").addEventListener("click",openNotifPanel);ui("shareBtn").addEventListener("click",shareGame);ui("communityBtn").addEventListener("click",openCommunityPanel);
ui("menuBtn").addEventListener("click",()=>{ui("utilityDrawer").classList.toggle("open");ui("utilityDrawer").setAttribute("aria-hidden",String(!ui("utilityDrawer").classList.contains("open")))});ui("drawerClose").addEventListener("click",()=>ui("utilityDrawer").classList.remove("open"));ui("shopShortcut").addEventListener("click",openShop);
ui("questCollapse").addEventListener("click",()=>ui("questPanel").classList.toggle("collapsed"));ui("claimRewardBtn").addEventListener("click",()=>{if(state.quests.every(Boolean)){state.gold+=500;state.quests=[false,false,false,false];save();toast("일일 보상 +500G")}else toast("모든 미션을 완료하세요.")});ui("modalClose").addEventListener("click",closeModal);ui("modal").addEventListener("click",e=>{if(e.target===ui("modal"))closeModal()});
ui("startBtn").addEventListener("click",async()=>{state.character=selected;started=true;ui("characterSelect").classList.remove("show");await KOMSCO.Orientation.lockLandscape();save();toast(`${CHARS[selected].name}과 함께 시작합니다.`)});

function showFatal(error,source="",line=0,column=0){
 console.error("[KOMSCO Runtime Error]",error,source,line,column);
 const panel=ui("fatalError"),message=ui("fatalMessage");
 const detail=error?.stack||error?.message||String(error||"알 수 없는 오류");
 const location=source?`\n${source}:${line}:${column}`:"";
 if(message)message.textContent=`${detail}${location}`;
 panel?.classList.add("show");
 ui("loading")?.classList.remove("show");
}
ui("fatalReload")?.addEventListener("click",()=>{
 if("serviceWorker"in navigator){
   navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).finally(()=>location.reload());
 }else location.reload();
});
window.addEventListener("error",e=>showFatal(e.error||e.message,e.filename||"",e.lineno||0,e.colno||0));
window.addEventListener("unhandledrejection",e=>showFatal(e.reason));

let debugOn=new URLSearchParams(location.search).has("debug");
function updateDebugOverlay(){
  const el=ui("debugOverlay");
  if(!el)return;
  el.classList.toggle("show",debugOn);
  if(!debugOn)return;
  const isPortrait=matchMedia("(orientation:portrait)").matches;
  el.textContent=
`orientation: ${isPortrait?"portrait(rotated)":"landscape"}
game W,H: ${W},${H}
player: ${state.player.x.toFixed(2)}, ${state.player.y.toFixed(2)}
dpad state: ↑${dpad.up?1:0} ↓${dpad.down?1:0} ←${dpad.left?1:0} →${dpad.right?1:0}
events(pointerdown/touchstart):
 ↑ ${dpadDebug.up.pd}/${dpadDebug.up.tt}  ↓ ${dpadDebug.down.pd}/${dpadDebug.down.tt}
 ← ${dpadDebug.left.pd}/${dpadDebug.left.tt}  → ${dpadDebug.right.pd}/${dpadDebug.right.tt}
autoPath: ${autoPath.length}`;
}
function loop(now){
 const dt=Math.min(.04,Math.max(0,(now-last)/1000));
 last=now;
 if(!document.hidden){update(dt);draw();updateDebugOverlay();}
 requestAnimationFrame(loop);
}
document.addEventListener("visibilitychange",()=>{last=performance.now();});
(()=>{
  // Triple-tap the KOMSCO loading logo to toggle the diagnostic overlay on a real device
  // without needing a URL param or dev tools.
  const brand=document.querySelector(".brand");
  if(!brand)return;
  let taps=0,tapTimer=null;
  brand.addEventListener("click",()=>{
    taps++;
    clearTimeout(tapTimer);
    tapTimer=setTimeout(()=>taps=0,600);
    if(taps>=3){debugOn=!debugOn;taps=0;updateDebugOverlay();}
  });
})();
/* ===================== 알림 · 우편함 (2D 버전 참고, localStorage 기반 · 서버 불필요) ===================== */
function recalcLevel(){
 const prev=state.level;
 state.level=1+Math.floor((state.gold+state.harvest*80)/900);
 if(state.level>prev){
   const bonus=state.level*20;
   grantMail(`레벨 업! Lv.${state.level}`,`축하합니다! 레벨 ${state.level}에 도달했습니다.`,bonus);
   pushNotification("레벨 업",`Lv.${state.level} 달성! 우편함에서 보너스를 받아가세요.`);
 }
}
const NOTIF_KEY="komscoNotifV1",MAIL_KEY="komscoMailV1";
function loadList(key){try{return JSON.parse(localStorage.getItem(key)||"[]")}catch{return[]}}
function saveList(key,list){try{localStorage.setItem(key,JSON.stringify(list))}catch{}}
function pushNotification(title,body){
 const list=loadList(NOTIF_KEY);
 list.unshift({id:"n"+Date.now()+Math.random().toString(36).slice(2,6),title,body,ts:Date.now(),read:false});
 saveList(NOTIF_KEY,list.slice(0,40));
 updateNotifBadge();
}
function grantMail(title,body,gold){
 const list=loadList(MAIL_KEY);
 list.unshift({id:"m"+Date.now()+Math.random().toString(36).slice(2,6),title,body,gold,ts:Date.now(),claimed:false});
 saveList(MAIL_KEY,list.slice(0,40));
 updateNotifBadge();
}
function updateNotifBadge(){
 const badge=ui("notifBadge");if(!badge)return;
 const unread=loadList(NOTIF_KEY).filter(n=>!n.read).length;
 const unclaimed=loadList(MAIL_KEY).filter(m=>!m.claimed).length;
 const total=unread+unclaimed;
 badge.textContent=total>99?"99+":total;
 badge.classList.toggle("show",total>0);
}
function openNotifPanel(){
 stopBellRing(); // 🔔 벨을 눌러 알림 패널을 여는 것만으로도 깜빡임은 꺼짐
 const notifs=loadList(NOTIF_KEY),mail=loadList(MAIL_KEY);
 let html="<h2>🔔 알림</h2>";
 html+=notifs.length?notifs.map(n=>n.dm
   ?`<div class="item notif-clickable" data-notif-dm="${n.dm.otherId}" data-notif-dm-nick="${n.dm.nickname}"><b>${n.title}</b><p>${n.body}</p></div>`
   :`<div class="item"><b>${n.title}</b><p>${n.body}</p></div>`).join(""):"<p>아직 알림이 없습니다.</p>";
 html+="<h2>📮 우편함</h2>";
 html+=mail.length?mail.map(m=>`<div class="item"><b>${m.title}</b><p>${m.body}</p><button type="button" data-mail="${m.id}" ${m.claimed?"disabled":""}>${m.claimed?"✅ 수령 완료":`💰 ${m.gold}G 받기`}</button></div>`).join(""):"<p>받은 우편이 없습니다.</p>";
 openModal(html);
 document.querySelectorAll("[data-mail]").forEach(b=>b.addEventListener("click",()=>claimMail(b.dataset.mail)));
 document.querySelectorAll("[data-notif-dm]").forEach(el=>el.addEventListener("click",()=>openDmThread(el.dataset.notifDm,el.dataset.notifDmNick)));
 notifs.forEach(n=>n.read=true);saveList(NOTIF_KEY,notifs);
 updateNotifBadge();
}
function claimMail(id){
 const list=loadList(MAIL_KEY);const mail=list.find(m=>m.id===id);
 if(!mail||mail.claimed)return;
 mail.claimed=true;saveList(MAIL_KEY,list);
 state.gold+=mail.gold;save();
 toast(`우편함에서 ${mail.gold}G를 받았습니다.`);
 openNotifPanel();
}
/* ===================== 커뮤니티 기반: 로그인 + 접속 상태 (1단계) =====================
   전체 커뮤니티 기능(1:1 쪽지, 즐겨찾기, 검색)의 전제조건이 되는 기반 단계만 구현합니다.
   로그인(이메일+닉네임) → 서버가 사용자 식별 → 20초마다 하트비트로 '접속 중' 갱신 →
   현재 접속 중인 다른 사용자 목록을 볼 수 있음. 쪽지/즐겨찾기/검색은 다음 단계에서 추가. */
const ACCOUNT_KEY="komscoAccountV1";
let heartbeatTimer=null;
function getAccount(){try{return JSON.parse(localStorage.getItem(ACCOUNT_KEY))}catch{return null}}
function setAccount(acc){try{localStorage.setItem(ACCOUNT_KEY,JSON.stringify(acc))}catch{}}
function clearAccount(){try{localStorage.removeItem(ACCOUNT_KEY)}catch{}}

async function doLogin(email,nickname){
 try{
   const res=await fetch("./api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,nickname})});
   const data=await res.json();
   if(!data.ok){toast(data.error||"로그인에 실패했습니다.");return false}
   setAccount(data.user);
   startHeartbeat();
   toast(`${data.user.nickname}님, 환영합니다!`);
   return true;
 }catch{
   toast("서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
   return false;
 }
}
function doLogout(){
 clearAccount();
 if(heartbeatTimer){clearInterval(heartbeatTimer);heartbeatTimer=null}
 toast("로그아웃되었습니다.");
}
async function sendHeartbeat(){
 const acc=getAccount();
 if(!acc)return;
 try{
   const res=await fetch("./api/presence/heartbeat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:acc.id})});
   const data=await res.json();
   if(!data.ok&&res.status===404){
     // 서버에 더 이상 존재하지 않는 계정(예: DB 초기화) -- 로컬에 남은 옛 로그인 정보 정리
     clearAccount();
     if(heartbeatTimer){clearInterval(heartbeatTimer);heartbeatTimer=null}
     return;
   }
   if(data.ok&&Array.isArray(data.unreadDms))checkDmNotifications(data.unreadDms);
 }catch{} // 네트워크 문제로 하트비트가 실패해도 게임 플레이에는 영향 없음
}
function startHeartbeat(){
 if(heartbeatTimer)return;
 sendHeartbeat();
 heartbeatTimer=setInterval(sendHeartbeat,20000);
}
async function fetchOnlineUsers(){
 try{
   const res=await fetch("./api/presence/online");
   const data=await res.json();
   return data.ok?data.online:[];
 }catch{return[]}
}
async function openCommunityPanel(){
 const acc=getAccount();
 if(!acc){
   openModal(`<h2>👥 커뮤니티</h2><p>커뮤니티 기능을 사용하려면 먼저 로그인해주세요.</p>
     <div class="item"><input type="email" id="loginEmail" placeholder="이메일" style="width:100%;margin-bottom:8px;padding:8px;border-radius:8px;border:1px solid #4b9fe455;background:#0e2038;color:#fff;">
     <input type="text" id="loginNickname" placeholder="닉네임 (선택)" style="width:100%;margin-bottom:8px;padding:8px;border-radius:8px;border:1px solid #4b9fe455;background:#0e2038;color:#fff;">
     <button type="button" id="loginSubmitBtn" class="ai-advisor-btn">로그인 / 가입</button></div>`);
   document.getElementById("loginSubmitBtn").addEventListener("click",async()=>{
     const email=document.getElementById("loginEmail").value.trim();
     const nickname=document.getElementById("loginNickname").value.trim()||"조폐 히어로";
     if(!email){toast("이메일을 입력해주세요.");return}
     const success=await doLogin(email,nickname);
     if(success)openCommunityPanel();
   });
   return;
 }
 openModal(`<h2>👥 커뮤니티</h2><p>${acc.nickname}님으로 로그인됨</p><div id="onlineListBox"><p style="opacity:.7;">접속자 목록을 불러오는 중...</p></div><button type="button" id="logoutBtn" class="ai-advisor-btn" style="background:linear-gradient(135deg,#7a2e2e,#4a1717);margin-top:10px;">로그아웃</button>`);
 document.getElementById("logoutBtn").addEventListener("click",()=>{doLogout();closeModal()});
 const online=await fetchOnlineUsers();
 const box=document.getElementById("onlineListBox");
 if(!box)return; // 목록을 불러오는 사이 모달을 닫았을 수 있음
 if(!online.length){
   box.innerHTML="<p style='opacity:.7;'>현재 접속 중인 다른 사용자가 없습니다.</p>";
   return;
 }
 box.innerHTML="<h3 style='margin:10px 0 6px;font-size:14px;opacity:.8;'>🟢 접속자 ("+online.length+"명)</h3><div class='shop-grid'>"+
   online.map(u=>`<article class="item"><p>🟢 ${u.nickname}</p><button type="button" data-dm-user="${u.id}" data-dm-nick="${u.nickname}">✉️ 쪽지</button></article>`).join("")+"</div>";
 box.querySelectorAll("[data-dm-user]").forEach(b=>b.addEventListener("click",()=>openDmThread(b.dataset.dmUser,b.dataset.dmNick)));
}

/* ===================== 1:1 쪽지 (2단계) ===================== */
const DM_UNREAD_TRACK_KEY="komscoDmUnreadTrackV1";
function loadDmUnreadTrack(){try{return JSON.parse(localStorage.getItem(DM_UNREAD_TRACK_KEY)||"{}")}catch{return{}}}
function saveDmUnreadTrack(t){try{localStorage.setItem(DM_UNREAD_TRACK_KEY,JSON.stringify(t))}catch{}}
// 하트비트마다 안 읽은 쪽지 수를 발신자별로 비교해서, 그 사이 '새로' 늘어난 경우에만 알림을
// 띄우고 벨을 흔듦 (이미 알고 있던 안 읽은 쪽지에 대해 매번 다시 알리지 않도록)
function checkDmNotifications(unreadDms){
 const prev=loadDmUnreadTrack();
 const next={};
 let hasNew=false;
 for(const u of unreadDms){
   next[u.senderId]=u.count;
   if(u.count>(prev[u.senderId]||0)){
     hasNew=true;
     pushDmNotification(u.senderId,u.nickname);
   }
 }
 saveDmUnreadTrack(next);
 if(hasNew)startBellRing();
}
function pushDmNotification(senderId,nickname){
 const list=loadList(NOTIF_KEY);
 list.unshift({id:"dm"+Date.now()+Math.random().toString(36).slice(2,6),title:"새 쪽지",body:`${nickname}님에게 쪽지가 왔습니다.`,ts:Date.now(),read:false,dm:{otherId:senderId,nickname}});
 saveList(NOTIF_KEY,list.slice(0,40));
 updateNotifBadge();
}
function startBellRing(){const b=ui("notifBtn");if(b)b.classList.add("ringing")}
function stopBellRing(){const b=ui("notifBtn");if(b)b.classList.remove("ringing")}
async function openDmThread(otherId,otherNickname){
 const acc=getAccount();
 if(!acc){toast("로그인이 필요합니다.");return}
 stopBellRing(); // 이 상대와의 대화창을 열면(알림 벨을 거치지 않고 접속자 목록의 ✉️로 바로 열어도) 벨 깜빡임을 끔
 openModal(`<h2>💬 ${otherNickname}</h2><div id="dmThreadBox" class="dm-thread"><p style="opacity:.6;">불러오는 중...</p></div>
   <div class="dm-input-row"><input type="text" id="dmInput" placeholder="메시지를 입력하세요" maxlength="1000"><button type="button" id="dmSendBtn">전송</button></div>`);
 // 대화창을 열면 이 상대에게서 온 안 읽은 쪽지를 자동으로 읽음 처리
 try{await fetch("./api/dm/read",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:acc.id,otherId})})}catch{}
 const track=loadDmUnreadTrack();delete track[otherId];saveDmUnreadTrack(track);
 updateNotifBadge();
 await renderDmThread(acc.id,otherId);
 const sendBtn=document.getElementById("dmSendBtn"),input=document.getElementById("dmInput");
 const send=async()=>{
   const text=input.value.trim();
   if(!text)return;
   input.value="";
   try{
     await fetch("./api/dm/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({senderId:acc.id,recipientId:otherId,body:text})});
     await renderDmThread(acc.id,otherId);
   }catch{toast("전송에 실패했습니다. 다시 시도해주세요.")}
 };
 sendBtn.addEventListener("click",send);
 input.addEventListener("keydown",e=>{if(e.key==="Enter")send()});
}
async function renderDmThread(myId,otherId){
 const box=document.getElementById("dmThreadBox");
 if(!box)return;
 let messages=[];
 try{
   const res=await fetch(`./api/dm/thread?userId=${encodeURIComponent(myId)}&otherId=${encodeURIComponent(otherId)}`);
   const data=await res.json();
   messages=data.ok?data.messages:[];
 }catch{}
 if(!messages.length){
   box.innerHTML="<p style='opacity:.6;'>아직 대화가 없습니다. 첫 메시지를 보내보세요!</p>";
   return;
 }
 // 카카오톡처럼 내 메시지는 오른쪽(보라색), 상대 메시지는 왼쪽으로 구분
 box.innerHTML=messages.map(m=>{
   const mine=m.sender_id===myId;
   return `<div class="dm-row ${mine?"dm-row-mine":"dm-row-theirs"}"><span class="dm-bubble ${mine?"dm-bubble-mine":"dm-bubble-theirs"}">${escapeHtml(m.body)}</span></div>`;
 }).join("");
 box.scrollTop=box.scrollHeight;
}
function escapeHtml(s){const d=document.createElement("div");d.textContent=s;return d.innerHTML}

/* ===================== 게임 공유하기 (2D 버전 getSharePayload 참고) ===================== */
function getSharePayload(){
 return{url:location.href,text:"KOMSCO 네온팜 시티에서 함께 도시를 키워요!",title:"KOMSCO 네온팜 시티"};
}
// navigator.share()는 기기의 실제 물리적 화면 방향으로 OS 공유창을 띄우는데, 이 게임은
// 세로로 쥔 폰을 CSS로 가로처럼 보이게 하는 방식이라 OS 공유창은 우리 CSS 회전과 무관하게
// 항상 실제(세로) 방향으로 나타나 화면이 통째로 뒤집힌 것처럼 보였습니다. OS 공유창을 아예
// 쓰지 않고, 게임과 같은 회전을 그대로 물려받는 자체 모달로만 공유를 처리하도록 변경.
// 카카오톡 공유는 Kakao JS SDK + 앱 키 등록이 필요한데 이 프로젝트엔 연동되어 있지 않아
// (가짜로 흉내내면 조용히 실패하거나 404가 나므로) 목록에서 제외했습니다.
async function shareGame(){
 // 공유 버튼을 누르는 시점에 다시 한 번 전체화면+가로 고정을 시도해서, 이메일/카카오톡 같은
 // 외부 앱이 열리기 직전에 기기가 실제로 가로 상태일 가능성을 최대한 높임. (외부 네이티브 앱
 // 자체의 화면 방향까지 우리 페이지에서 강제할 수는 없다는 한계는 있음)
 try{await KOMSCO.Orientation.lockLandscape()}catch{}
 const payload=getSharePayload();
 const msg=`${payload.title}\n${payload.text}\n${payload.url}`;
 const enc=encodeURIComponent;
 const channels=[
   {icon:"🟡",label:"카카오톡",kind:"native"},
   {icon:"💬",label:"문자",href:`sms:?body=${enc(msg)}`},
   {icon:"✉️",label:"이메일",href:`mailto:?subject=${enc(payload.title)}&body=${enc(msg)}`},
   {icon:"🐦",label:"X(트위터)",href:`https://twitter.com/intent/tweet?text=${enc(payload.text)}&url=${enc(payload.url)}`},
   {icon:"🟢",label:"라인",href:`https://social-plugins.line.me/lineit/share?url=${enc(payload.url)}&text=${enc(payload.text)}`}
 ];
 let html=`<h2>📤 게임 친구 공유하기</h2><p>친구에게 KOMSCO 네온팜 시티 링크를 공유해보세요.</p><div class="share-grid">`;
 channels.forEach((c,i)=>{
   if(c.kind==="native")html+=`<button type="button" class="share-chip" id="shareKakaoBtn">${c.icon} ${c.label}</button>`;
   else html+=`<a class="share-chip" href="${c.href}" target="_blank" rel="noopener">${c.icon} ${c.label}</a>`;
 });
 html+=`<button type="button" id="shareCopyBtn" class="share-chip share-chip-copy">🔗 링크복사</button></div>
   <div class="share-link-box"><span id="shareLinkText">${payload.url}</span></div>`;
 openModal(html);
 const copyBtn=document.getElementById("shareCopyBtn");
 if(copyBtn)copyBtn.addEventListener("click",async()=>{
   try{await navigator.clipboard.writeText(msg);copyBtn.textContent="✅ 복사 완료"}
   catch{copyBtn.textContent="복사 실패, 직접 선택해 복사해주세요"}
 });
 // 카카오톡 전용: 이 프로젝트엔 Kakao SDK 앱 키가 연동되어 있지 않아 정식 "카카오톡으로
 // 공유" 버튼을 만들 수 없습니다. 대신 OS 기본 공유창(navigator.share)을 띄워, 설치된 앱
 // 목록에서 사용자가 직접 카카오톡을 선택할 수 있도록 합니다. (참고: 이 OS 공유창은 기기의
 // 실제 화면 방향으로 뜨기 때문에, 세로로 쥔 채 가로 트릭을 쓰는 중이라면 공유창만 세로로
 // 보일 수 있습니다 -- 이 버튼에서만 발생하는, OS 자체의 제약입니다.)
 const kakaoBtn=document.getElementById("shareKakaoBtn");
 if(kakaoBtn)kakaoBtn.addEventListener("click",async()=>{
   if(navigator.share){
     try{await navigator.share(payload);return}catch{}
   }
   try{await navigator.clipboard.writeText(msg);toast("카카오톡 공유는 이 브라우저에서 지원되지 않아 링크를 복사했습니다. 카카오톡에 붙여넣어 주세요.")}
   catch{toast("카카오톡 앱에 아래 링크를 직접 붙여넣어 공유해주세요: "+payload.url)}
 });
}

(async()=>{
 try{
   load();buildCards();resize();
   const tasks=[
     loadImage(DAY).then(v=>bgDay=v),
     loadImage(NIGHT).then(v=>bgNight=v),
     ...Object.entries(CHARS).map(([id,c])=>loadImage(CHAR_BASE+c.img).then(v=>images[id]=v))
   ];
   let done=0;
   await Promise.all(tasks.map(p=>p.finally(()=>{
     done++;
     const bar=ui("loadBar");
     if(bar)bar.style.width=`${done/tasks.length*100}%`;
   })));
   if(!bgDay&&!bgNight)throw new Error("낮·밤 배경 이미지를 찾을 수 없습니다.");
   const fallbackChar=Object.values(images).find(Boolean);
   for(const id of Object.keys(CHARS))if(!images[id])images[id]=fallbackChar;
   updateUI();resize();updateNotifBadge();if(getAccount())startHeartbeat();
   fetchWeather();
   setInterval(fetchWeather,15*60*1000);
   ui("loading").classList.remove("show");
   ui("characterSelect").classList.add("show");
   requestAnimationFrame(loop);
   // Catch late viewport settling on Android browsers whose toolbar takes a moment to
   // collapse after load (this is what caused the character-select screen to render
   // clipped until the device was physically rotated, which forces a resize).
   requestAnimationFrame(resize);
   [150,400,900].forEach(ms=>setTimeout(resize,ms));
   if("serviceWorker"in navigator){
     navigator.serviceWorker.register("./sw.js").catch(console.warn);
   }
 }catch(error){showFatal(error);}
})();
})();