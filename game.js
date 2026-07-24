(() => {
"use strict";
const ui=id=>document.getElementById(id),canvas=ui("game");
const ctx=canvas?.getContext("2d",{alpha:false})||canvas?.getContext("2d");
if(!canvas||!ctx)throw new Error("Canvas 2D를 초기화할 수 없습니다.");
const WORLD=KOMSCO.WORLD,PATH=KOMSCO.PathEngine,SYS=KOMSCO.GameSystems;
const CHARS=SYS.characters,SEEDS=SYS.seeds,CHAR_BASE="./public/assets/characters/";
const DAY="./public/assets/world/world_day.png",NIGHT="./public/assets/world/world_exact_map.png";
const DPR=Math.min(devicePixelRatio||1, innerWidth<900?1.35:1.75);
let W=0,H=0,bgRect={x:0,y:0,w:1,h:1},bgDay,bgNight,last=performance.now(),selected=null,started=false,autoPath=[],currentEdge=null,lastUiUpdate=0,resizeSettleTimer=null;
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
 const info=edgeInfo(currentEdge);
 const sign=(dx*info.tx+dy*info.ty)>=0?1:-1;
 const speed=state.player.speed*CHARS[state.character].speed;
 const projected=edgeProjection(currentEdge,info.x+info.tx*sign*speed*dt,info.y+info.ty*sign*speed*dt);
 state.player.x=projected.x;state.player.y=projected.y;
 const desired=info.tx*sign<0?-1:1;
 state.player.dirLerp=(state.player.dirLerp??state.player.dir??1)+(desired-(state.player.dirLerp??state.player.dir??1))*Math.min(1,dt*9);
 state.player.dir=state.player.dirLerp<0?-1:1;
 if(projected.t<=.05||projected.t>=.95){
   const nodeId=projected.t<=.05?currentEdge[0]:currentEdge[1];
   const next=chooseEdgeAtNode(nodeId,dx,dy,currentEdge);
   if(next&&edgeKey(next)!==edgeKey(currentEdge)){
     currentEdge=next;
   }else if(projected.t<=.006||projected.t>=.994){
     const node=WORLD.nodes[nodeId];
     state.player.x=node[0];state.player.y=node[1];
   }
 }
}
function draw(){
 const fallback=ctx.createLinearGradient(0,0,0,H);
 fallback.addColorStop(0,"#071c33");fallback.addColorStop(1,"#020711");
 ctx.fillStyle=fallback;ctx.fillRect(0,0,W,H);
 const im=activeBg();
 if(im){updateBgRect();ctx.drawImage(im,bgRect.x,bgRect.y,bgRect.w,bgRect.h)}
 drawGuides();drawHotspots();drawCrops();drawPlayer();
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
    const size=18+growth*12;
    ctx.save();
    ctx.font=`${size}px serif`;
    ctx.textAlign="center";
    ctx.shadowColor="rgba(58,255,126,.75)";
    ctx.shadowBlur=8;
    ctx.fillText(SEEDS[f.seed].emoji,p.x,p.y);
    ctx.restore();
  });
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
      state.player.x+=nx*speed*dt;
      state.player.y+=ny*speed*dt;
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
function doWork(h){const reward=Math.round(h.reward*CHARS[state.character].reward);state.gold+=reward;state.level=1+Math.floor((state.gold+state.harvest*80)/900);state.quests[0]=true;save();toast(`${h.label} 업무 완료 · +${reward}G`)}
function openShop(){let html="<h2>🌱 씨앗상점</h2><div class='shop-grid'>";for(const[id,s]of Object.entries(SEEDS))html+=`<article class="item shop-item"><h3>${s.emoji} ${s.name}</h3><p><b>${s.price}G</b></p><button type="button" data-buy="${id}">구매</button></article>`;html+="</div>";openModal(html);document.querySelectorAll("[data-buy]").forEach(b=>b.addEventListener("click",()=>buySeed(b.dataset.buy)))}
function buySeed(id){const s=SEEDS[id];if(state.gold<s.price){toast("골드가 부족합니다.");return}state.gold-=s.price;state.inventory[id]++;state.seeds++;state.quests[1]=true;save();openShop()}
function openFarm(){let html="<h2>🌿 주말농장</h2><p>각 밭을 선택해 씨앗을 심고 성장 후 수확하세요.</p><div class='farm-grid'>";state.farm.forEach((f,i)=>{if(!f.seed)html+=`<article class=item><h3>밭 ${i+1}</h3><button data-plot="${i}">씨앗 심기</button></article>`;else{const left=Math.max(0,f.growMs-(Date.now()-f.plantedAt));html+=`<article class=item><h3>${SEEDS[f.seed].emoji} 밭 ${i+1}</h3><p>${left?Math.ceil(left/1000)+"초":"수확 가능"}</p><button data-plot="${i}">${left?"확인":"수확"}</button></article>`}});html+="</div>";openModal(html);document.querySelectorAll("[data-plot]").forEach(b=>b.addEventListener("click",()=>usePlot(+b.dataset.plot)))}
function usePlot(i){const f=state.farm[i];if(!f.seed){const available=Object.keys(SEEDS).filter(id=>state.inventory[id]>0);if(!available.length){toast("먼저 씨앗을 구매하세요.");return}let html="<h2>심을 씨앗 선택</h2><div class='shop-grid'>";available.forEach(id=>html+=`<article class=item><h3>${SEEDS[id].emoji} ${SEEDS[id].name}</h3><button data-plant="${id}">심기</button></article>`);html+="</div>";openModal(html);document.querySelectorAll("[data-plant]").forEach(b=>b.addEventListener("click",()=>plant(i,b.dataset.plant)));return}if(Date.now()-f.plantedAt<f.growMs){toast("아직 성장 중입니다.");return}const s=SEEDS[f.seed];state.gold+=s.reward;state.harvest++;state.quests[3]=true;state.farm[i]={seed:null,plantedAt:0,growMs:0};save();openFarm()}
async function serverNow(){try{const r=await fetch("./api/time");if(r.ok)return(await r.json()).now}catch{}return Date.now()}
async function plant(i,id){state.inventory[id]--;state.seeds--;state.farm[i]={seed:id,plantedAt:await serverNow(),growMs:SEEDS[id].grow};state.quests[2]=true;closeModal();save()}
function updateUI(near){ui("goldText").textContent=state.gold.toLocaleString();ui("seedText").textContent=state.seeds;ui("harvestText").textContent=state.harvest;ui("levelText").textContent=state.level;ui("heroName").textContent=CHARS[state.character].name;ui("portrait").src=CHAR_BASE+CHARS[state.character].img;ui("regionText").textContent=near?near.label:(state.player.x>66?"주말농장 지구":"네온 중앙지구");const labels=["회사 본부에서 업무 수행","씨앗상점에서 씨앗 구매","주말농장에 씨앗 심기","다 자란 작물 수확"];ui("questList").innerHTML=labels.map((x,i)=>`<li class="${state.quests[i]?"done":""}">${x} ${state.quests[i]?"1/1":"0/1"}</li>`).join("");ui("inventoryPreview").innerHTML=Object.entries(SEEDS).map(([id,s])=>`<span>${s.emoji}<small>${state.inventory[id]}</small></span>`).join("")}
function openModal(html){ui("modalBody").innerHTML=html;ui("modal").classList.add("show")}function closeModal(){ui("modal").classList.remove("show")}function toast(t){ui("toast").textContent=t;ui("toast").classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>ui("toast").classList.remove("show"),1700)}
function save(){localStorage.setItem("komscoExactMapFullscreenRouteV9",JSON.stringify(state))}
function load(){
 try{
   const v=JSON.parse(localStorage.getItem("komscoExactMapFullscreenRouteV9"));
   if(v)state=Object.assign(SYS.newState(),v);
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
function bindDpad(id,key){
 const el=ui(id);
 if(!el){console.warn(`이동 버튼 누락: ${id}`);return;}
 const down=e=>{
   e.preventDefault();
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
ui("rankingBtn").addEventListener("click",()=>openModal(`<h2>🏆 랭킹</h2><div class=item><b>현재 점수</b><p>${state.gold+state.harvest*100+state.level*1000}</p></div>`));ui("codexBtn").addEventListener("click",()=>openModal(`<h2>📖 도감</h2><div class=item><p>업무·씨앗·작물 도감이 표시되는 영역입니다.</p></div>`));ui("settingsBtn").addEventListener("click",()=>openModal(`<h2>⚙️ 설정</h2><div class=item><p>낮·밤 자동 전환과 가로 화면 고정이 적용되어 있습니다.</p></div>`));
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

function loop(now){
 const dt=Math.min(.04,Math.max(0,(now-last)/1000));
 last=now;
 if(!document.hidden){update(dt);draw();}
 requestAnimationFrame(loop);
}
document.addEventListener("visibilitychange",()=>{last=performance.now();});
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
   updateUI();resize();
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