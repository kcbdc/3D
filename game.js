(() => {
"use strict";
const ui=id=>document.getElementById(id);
const canvas=ui("game"),ctx=canvas.getContext("2d",{alpha:false});
const DPR=Math.min(devicePixelRatio||1,2);
const BG="./public/assets/ui/neon_world_clean_v6.jpg";
const CHAR="./public/assets/characters_clean/";
let W=0,H=0,last=performance.now(),started=false,selected=null,run=false,bg=null;
const keys={},joy={x:0,y:0},dpadState={up:false,down:false,left:false,right:false},images={};
let bgRect={x:0,y:0,w:1,h:1},autoPath=[];

const chars={
 hunmin:{name:"훈민",role:"전략가",desc:"업무·농장 경험치가 균형 잡힌 리더",img:"hunmin.png",speed:1,reward:1},
 daim:{name:"다임",role:"정보 탐색관",desc:"업무 골드 보상 20% 증가",img:"daim.png",speed:1,reward:1.2},
 sunsik:{name:"순식",role:"호위무사",desc:"이동 속도 15% 증가",img:"sunsik.png",speed:1.15,reward:1}
};
const seeds={
 carrot:{name:"당근",price:60,grow:45000,reward:120,emoji:"🥕"},
 tomato:{name:"토마토",price:90,grow:70000,reward:190,emoji:"🍅"},
 strawberry:{name:"딸기",price:130,grow:100000,reward:300,emoji:"🍓"}
};
const state={
 gold:300,gems:1250,seeds:0,harvest:0,level:1,character:"hunmin",
 player:{x:43,y:78,speed:17,dir:1},
 inventory:{carrot:0,tomato:0,strawberry:0},
 quests:[false,false,false,false],
 farm:Array.from({length:8},()=>({seed:null,plantedAt:0,growMs:0})),
 achievements:{firstWork:false,firstHarvest:false}
};

/* 월드 이미지 기준 0~100 좌표. */
const nodes={
 A:[9,80], B:[22,72], C:[36,75], D:[49,68], E:[61,58], F:[75,51], G:[88,46],
 H:[15,59], I:[29,53], J:[43,54], K:[56,47], L:[70,38], M:[84,31],
 N:[24,38], O:[39,34], P:[54,31], Q:[68,27],
 R:[49,82], S:[63,77], T:[78,70], U:[89,61]
};
const edges=[
 ["A","B"],["B","C"],["C","D"],["D","E"],["E","F"],["F","G"],
 ["B","H"],["H","I"],["I","J"],["J","K"],["K","L"],["L","M"],
 ["I","N"],["N","O"],["O","P"],["P","Q"],["K","P"],
 ["C","R"],["R","S"],["S","T"],["T","U"],["U","G"],["D","R"],["E","S"],["F","T"]
];
const bridgeKeys=new Set(["E-F","F-G","R-S","S-T"]);
const roadWidth=4.8;
const buildings=[
 {x:15,y:18,w:18,h:25,label:"본사"},
 {x:37,y:16,w:18,h:20,label:"화폐본부"},
 {x:59,y:14,w:18,h:20,label:"제지본부"},
 {x:54,y:36,w:18,h:19,label:"ID본부"},
 {x:31,y:40,w:18,h:18,label:"씨앗상점"},
 {x:72,y:48,w:26,h:30,label:"주말농장"}
];
const water=[{x:63,y:25,w:30,h:52}];
const hotspots=[
 {node:"N",x:24,y:43,r:5.5,label:"본사",type:"work",reward:150},
 {node:"O",x:42,y:39,r:5.5,label:"화폐본부",type:"work",reward:130},
 {node:"Q",x:68,y:35,r:5.5,label:"제지본부",type:"work",reward:120},
 {node:"L",x:62,y:51,r:5.5,label:"ID본부",type:"work",reward:140},
 {node:"J",x:42,y:59,r:5.5,label:"씨앗상점",type:"shop"},
 {node:"U",x:87,y:57,r:7,label:"주말농장",type:"farm"}
];

function resize(){
 W=innerWidth;H=innerHeight;
 canvas.width=W*DPR;canvas.height=H*DPR;
 canvas.style.width=W+"px";canvas.style.height=H+"px";
 ctx.setTransform(DPR,0,0,DPR,0,0);
 updateBgRect();
}
addEventListener("resize",resize);
function updateBgRect(){
 if(!bg){bgRect={x:0,y:0,w:W,h:H};return}
 const ir=bg.width/bg.height,vr=W/H;
 if(ir>vr){bgRect.h=H;bgRect.w=H*ir;bgRect.x=(W-bgRect.w)/2;bgRect.y=0}
 else{bgRect.w=W;bgRect.h=W/ir;bgRect.x=0;bgRect.y=(H-bgRect.h)/2}
}
const worldToScreen=(x,y)=>({x:bgRect.x+x/100*bgRect.w,y:bgRect.y+y/100*bgRect.h});
function inRect(x,y,r){return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h}
function distSeg(px,py,ax,ay,bx,by){
 const vx=bx-ax,vy=by-ay,den=vx*vx+vy*vy;
 const t=den?Math.max(0,Math.min(1,((px-ax)*vx+(py-ay)*vy)/den)):0;
 return Math.hypot(px-(ax+t*vx),py-(ay+t*vy));
}
function edgeKey(a,b){return `${a}-${b}`}
function nearestRoad(x,y){
 let best={x:nodes.C[0],y:nodes.C[1],d:999,edge:null};
 for(const [a,b] of edges){
  const A=nodes[a],B=nodes[b],vx=B[0]-A[0],vy=B[1]-A[1],den=vx*vx+vy*vy;
  const t=den?Math.max(0,Math.min(1,((x-A[0])*vx+(y-A[1])*vy)/den)):0;
  const qx=A[0]+t*vx,qy=A[1]+t*vy,d=Math.hypot(x-qx,y-qy);
  if(d<best.d)best={x:qx,y:qy,d,edge:[a,b]};
 }
 return best;
}
function onBridge(x,y){
 for(const [a,b] of edges){
  if(!bridgeKeys.has(edgeKey(a,b)))continue;
  const A=nodes[a],B=nodes[b];
  if(distSeg(x,y,A[0],A[1],B[0],B[1])<=roadWidth)return true;
 }
 return false;
}
function walkable(x,y){
 if(x<1||x>99||y<7||y>96)return false;
 if(buildings.some(r=>inRect(x,y,r)))return false;
 if(nearestRoad(x,y).d>roadWidth)return false;
 if(water.some(r=>inRect(x,y,r))&&!onBridge(x,y))return false;
 return true;
}
function nearestNode(x,y){
 let best=null,d=999;
 for(const [id,p] of Object.entries(nodes)){const n=Math.hypot(x-p[0],y-p[1]);if(n<d){best=id;d=n}}
 return best;
}
function shortestPath(start,end){
 const adj={};Object.keys(nodes).forEach(k=>adj[k]=[]);
 edges.forEach(([a,b])=>{adj[a].push(b);adj[b].push(a)});
 const q=[start],prev={[start]:null};
 while(q.length){const n=q.shift();if(n===end)break;for(const v of adj[n])if(!(v in prev)){prev[v]=n;q.push(v)}}
 if(!(end in prev))return[];
 const path=[];for(let cur=end;cur;cur=prev[cur])path.unshift(cur);
 return path.map(id=>({x:nodes[id][0],y:nodes[id][1]}));
}
function startAutoTo(h){
 const s=nearestNode(state.player.x,state.player.y),e=h.node;
 autoPath=shortestPath(s,e);
 autoPath.push({x:h.x,y:h.y});
 toast(`${h.label} 경로 안내를 시작합니다.`);
}

function drawRouteGuides(){
 const now=performance.now()/1000;
 ctx.save();
 ctx.lineCap="round";ctx.lineJoin="round";
 for(const [a,b] of edges){
  const A=worldToScreen(...nodes[a]),B=worldToScreen(...nodes[b]);
  const bridge=bridgeKeys.has(edgeKey(a,b));
  ctx.strokeStyle=bridge?"rgba(82,220,255,.96)":"rgba(52,179,255,.66)";
  ctx.shadowColor=bridge?"#5deaff":"#24b8ff";
  ctx.shadowBlur=bridge?18:11;
  ctx.lineWidth=bridge?5:3;
  ctx.setLineDash(bridge?[7,8]:[3,11]);
  ctx.lineDashOffset=-(now*18)%30;
  ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();

  // 일정 간격 방향 화살표
  const vx=B.x-A.x,vy=B.y-A.y,len=Math.hypot(vx,vy);
  if(len>70){
   const ux=vx/len,uy=vy/len;
   const count=Math.max(1,Math.floor(len/140));
   for(let i=1;i<=count;i++){
    const t=i/(count+1),x=A.x+vx*t,y=A.y+vy*t;
    const size=bridge?9:7;
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(vy,vx));
    ctx.fillStyle=bridge?"rgba(198,249,255,.94)":"rgba(132,222,255,.80)";
    ctx.beginPath();ctx.moveTo(size,0);ctx.lineTo(-size*.65,-size*.55);ctx.lineTo(-size*.65,size*.55);ctx.closePath();ctx.fill();
    ctx.restore();
   }
  }
 }
 ctx.setLineDash([]);ctx.restore();
}

function drawDestinationGuide(){
 const near=hotspots.reduce((best,h)=>{
  const d=Math.hypot(state.player.x-h.x,state.player.y-h.y);
  return !best||d<best.d?{h,d}:best;
 },null);
 if(!near)return;
 const p=worldToScreen(near.h.x,near.h.y);
 ctx.save();ctx.strokeStyle="rgba(255,218,76,.95)";ctx.shadowColor="#ffd43e";ctx.shadowBlur=18;ctx.lineWidth=2;
 const radius=17+Math.sin(performance.now()/260)*3;
 ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.stroke();
 ctx.restore();
}

function draw(){
 ctx.fillStyle="#020712";ctx.fillRect(0,0,W,H);
 if(bg){updateBgRect();ctx.drawImage(bg,bgRect.x,bgRect.y,bgRect.w,bgRect.h)}
 drawRouteGuides();drawDestinationGuide();
 if(location.search.includes("debug=1"))drawDebug();
 drawHotspots();drawCrops();drawPlayer();
}
function drawDebug(){
 ctx.save();ctx.globalAlpha=.55;ctx.lineCap="round";
 for(const [a,b] of edges){
  const A=worldToScreen(...nodes[a]),B=worldToScreen(...nodes[b]);
  ctx.lineWidth=roadWidth/100*bgRect.w*2;
  ctx.strokeStyle=bridgeKeys.has(edgeKey(a,b))?"#ffd739":"#62ff78";
  ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();
 }
 ctx.restore();
}
function drawHotspots(){
 const t=performance.now()/1000;
 for(const h of hotspots){
  const p=worldToScreen(h.x,h.y),near=Math.hypot(state.player.x-h.x,state.player.y-h.y)<h.r;
  ctx.save();ctx.strokeStyle=near?"#ffe36d":"#34d4ff";ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=16;ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(p.x,p.y,18+Math.sin(t*3)*2,7,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
  ctx.font="700 12px 'Noto Sans KR','Malgun Gothic',sans-serif";ctx.textAlign="center";ctx.fillStyle=near?"#fff1a8":"#dff9ff";ctx.fillText(h.label,p.x,p.y-14);ctx.restore();
 }
}
function drawCrops(){
 const p=worldToScreen(87,57);
 state.farm.forEach((f,i)=>{if(!f.seed)return;const c=i%4,r=Math.floor(i/4),g=Math.min(1,(Date.now()-f.plantedAt)/f.growMs);
  ctx.save();ctx.font=`${15+g*9}px serif`;ctx.shadowColor="#53ff8a";ctx.shadowBlur=8;ctx.fillText(seeds[f.seed].emoji,p.x-42+c*26,p.y+16+r*22);ctx.restore();
 });
}
function drawPlayer(){
 const img=images[state.character];if(!img)return;
 const p=worldToScreen(state.player.x,state.player.y);
 const h=(W<800?110:142),w=h*img.width/img.height,bob=isMoving()?Math.sin(performance.now()*.015)*3:0;
 ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=.28;ctx.fillStyle="#000";ctx.beginPath();ctx.ellipse(0,6,w*.34,w*.12,0,0,Math.PI*2);ctx.fill();
 ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";ctx.shadowColor="#2ed5ff";ctx.shadowBlur=18;ctx.scale(state.player.dir,1);ctx.drawImage(img,-w/2,-h+bob,w,h);ctx.restore();
}
function isMoving(){return dpadState.up||dpadState.down||dpadState.left||dpadState.right||Math.hypot(joy.x,joy.y)>.05||keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight||keys.w||keys.a||keys.s||keys.d||autoPath.length}
function update(dt){
 if(!started)return;
 let dx=0,dy=0;
 if(autoPath.length){
  const target=autoPath[0];dx=target.x-state.player.x;dy=target.y-state.player.y;
  if(Math.hypot(dx,dy)<1.1){autoPath.shift();dx=0;dy=0}
 }else{
  dx=(dpadState.right?1:0)-(dpadState.left?1:0)+(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0);
  dy=(dpadState.down?1:0)-(dpadState.up?1:0)+(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);
 }
 const len=Math.hypot(dx,dy);
 if(len>.05){
  dx/=len;dy/=len;state.player.dir=dx<0?-1:1;
  const sp=state.player.speed*chars[state.character].speed*(run||keys.Shift?1.55:1);
  let nx=state.player.x+dx*sp*dt,ny=state.player.y+dy*sp*dt;
  if(walkable(nx,ny)){state.player.x=nx;state.player.y=ny}
  else{
   const s=nearestRoad(nx,ny);
   if(s.d<roadWidth*1.5&&walkable(s.x,s.y)){state.player.x=s.x;state.player.y=s.y}
   else autoPath=[];
  }
 }
 const near=getNear();
 ui("interactionHint").classList.toggle("show",!!near);
 ui("interactionHint").textContent=near?`${near.label} 입구 · 상호작용`:"";
 updateUI(near);
}
function getNear(){let best=null,d=999;for(const h of hotspots){const n=Math.hypot(state.player.x-h.x,state.player.y-h.y);if(n<h.r&&n<d){best=h;d=n}}return best}
function interact(){const h=getNear();if(!h){toast("입구 표시 가까이 이동하세요.");return}if(h.type==="work")doWork(h);if(h.type==="shop")openShop();if(h.type==="farm")openFarm()}
function doWork(h){const reward=Math.round(h.reward*chars[state.character].reward);state.gold+=reward;state.level=1+Math.floor((state.gold+state.harvest*80)/900);state.quests[0]=true;state.achievements.firstWork=true;toast(`${h.label} 업무 완료 · +${reward}G`);save()}
function openShop(){let html="<h2>🌱 씨앗상점</h2><div class=shop-grid>";for(const[id,s]of Object.entries(seeds))html+=`<div class=item><h3>${s.emoji} ${s.name}</h3><p>${s.price}G · ${Math.round(s.grow/1000)}초</p><button data-buy="${id}">구매</button></div>`;html+="</div>";openModal(html);document.querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>buySeed(b.dataset.buy))}
function buySeed(id){const s=seeds[id];if(state.gold<s.price){toast("골드가 부족합니다.");return}state.gold-=s.price;state.inventory[id]++;state.seeds++;state.quests[1]=true;toast(`${s.name} 구매 완료`);openShop();save()}
function openFarm(){let html="<h2>🌿 주말농장</h2><div class=farm-grid>";state.farm.forEach((f,i)=>{if(!f.seed)html+=`<div class=item><h3>밭 ${i+1}</h3><button data-plot="${i}">씨앗 심기</button></div>`;else{const left=Math.max(0,f.growMs-(Date.now()-f.plantedAt));html+=`<div class=item><h3>${seeds[f.seed].emoji} 밭 ${i+1}</h3><p>${left?Math.ceil(left/1000)+"초 남음":"수확 가능"}</p><button data-plot="${i}">${left?"확인":"수확"}</button></div>`}});html+="</div>";openModal(html);document.querySelectorAll("[data-plot]").forEach(b=>b.onclick=()=>usePlot(+b.dataset.plot))}
function usePlot(i){const f=state.farm[i];if(!f.seed){const a=Object.keys(seeds).filter(k=>state.inventory[k]>0);if(!a.length){toast("먼저 씨앗을 구매하세요.");return}let html="<h2>씨앗 선택</h2><div class=shop-grid>";a.forEach(id=>html+=`<div class=item><h3>${seeds[id].emoji} ${seeds[id].name}</h3><button data-plant="${id}">심기</button></div>`);html+="</div>";openModal(html);document.querySelectorAll("[data-plant]").forEach(b=>b.onclick=()=>plant(i,b.dataset.plant));return}const elapsed=Date.now()-f.plantedAt;if(elapsed<f.growMs){toast(`성장 중 · ${Math.ceil((f.growMs-elapsed)/1000)}초`);return}const s=seeds[f.seed];state.gold+=s.reward;state.harvest++;state.quests[3]=true;state.achievements.firstHarvest=true;state.farm[i]={seed:null,plantedAt:0,growMs:0};toast(`${s.name} 수확 · +${s.reward}G`);save();openFarm()}
async function serverNow(){try{const r=await fetch("./api/time");if(r.ok)return(await r.json()).now}catch{}return Date.now()}
async function plant(i,id){state.inventory[id]--;state.seeds--;state.farm[i]={seed:id,plantedAt:await serverNow(),growMs:seeds[id].grow};state.quests[2]=true;closeModal();toast(`${seeds[id].name} 심기 완료`);save()}
function updateUI(near){
 ui("goldText").textContent=state.gold.toLocaleString();ui("gemText").textContent=state.gems.toLocaleString();ui("seedText").textContent=state.seeds;ui("harvestText").textContent=state.harvest;ui("levelText").textContent=state.level;ui("heroName").textContent=chars[state.character].name;
 const zone=near?near.label:(state.player.x>70?"주말농장 지구":"네온 중앙지구");ui("zoneText").textContent=zone;if(ui("regionName"))ui("regionName").textContent=zone;
 ui("expFill").style.width=`${Math.min(100,((state.gold+state.harvest*80)%900)/9)}%`;
 ui("questList").innerHTML=["회사 본부에서 업무 수행","씨앗상점에서 씨앗 구매","주말농장 밭에 씨앗 심기","다 자란 작물 수확"].map((q,i)=>`<li class="${state.quests[i]?"done":""}">${q} ${state.quests[i]?"1/1":"0/1"}</li>`).join("");
 if(ui("quickInventory"))ui("quickInventory").innerHTML=Object.entries(seeds).map(([id,s])=>`${s.emoji}${state.inventory[id]}`).join(" · ");
}
function openBag(){openModal(`<h2>🎒 가방</h2><p>당근 ${state.inventory.carrot} · 토마토 ${state.inventory.tomato} · 딸기 ${state.inventory.strawberry} · 수확물 ${state.harvest}</p>`)}
function generic(t,s){openModal(`<h2>${t}</h2><p>${s}</p>`)}
function openModal(h){ui("modalBody").innerHTML=h;ui("modal").classList.add("show")}
function closeModal(){ui("modal").classList.remove("show")}
function toast(t){ui("toast").textContent=t;ui("toast").classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>ui("toast").classList.remove("show"),1700)}
function save(){localStorage.setItem("komscoRouteFixV6",JSON.stringify(state))}
function load(){try{const s=JSON.parse(localStorage.getItem("komscoRouteFixV6"));if(s)Object.assign(state,s)}catch{}if(!walkable(state.player.x,state.player.y)){const s=nearestRoad(state.player.x,state.player.y);state.player.x=s.x;state.player.y=s.y}}
function loadImage(src){return new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src})}
async function assets(){let n=0;bg=await loadImage(BG);updateBgRect();ui("loadBar").style.width=`${++n/4*100}%`;for(const[id,c]of Object.entries(chars)){images[id]=await loadImage(CHAR+c.img);ui("loadBar").style.width=`${++n/4*100}%`}}
function cards(){ui("characterCards").innerHTML=Object.entries(chars).map(([id,c])=>`<article class=character-card data-char="${id}"><img src="${CHAR+c.img}" alt="${c.name}"><h3>${c.name}</h3><b>${c.role}</b><p>${c.desc}</p></article>`).join("");document.querySelectorAll(".character-card").forEach(e=>e.onclick=()=>{selected=e.dataset.char;document.querySelectorAll(".character-card").forEach(x=>x.classList.toggle("selected",x===e));ui("startBtn").disabled=false})}
const bind=(id,fn)=>{const e=ui(id);if(e)e.onclick=fn};
addEventListener("keydown",e=>{keys[e.key]=true;if(e.key==="e"||e.key==="Enter")interact()});addEventListener("keyup",e=>keys[e.key]=false);
function bindDpad(buttonId,key){
 const button=ui(buttonId);if(!button)return;
 const press=e=>{e.preventDefault();autoPath=[];dpadState[key]=true;button.classList.add("pressed");button.setPointerCapture?.(e.pointerId)};
 const release=e=>{e?.preventDefault?.();dpadState[key]=false;button.classList.remove("pressed")};
 button.addEventListener("pointerdown",press);
 button.addEventListener("pointerup",release);
 button.addEventListener("pointercancel",release);
 button.addEventListener("pointerleave",release);
}
bindDpad("moveUp","up");bindDpad("moveDown","down");bindDpad("moveLeft","left");bindDpad("moveRight","right");
ui("runBtn").onpointerdown=()=>run=true;ui("runBtn").onpointerup=()=>run=false;
bind("interactBtn",interact);bind("shopBtn",openShop);bind("shopShortcut",openShop);bind("bagBtn",openBag);bind("mapBtn",()=>generic("🗺️ 지도","도로·인도와 파란 발광 다리를 따라 이동하세요."));bind("questBtn",()=>ui("questPanel").classList.toggle("closed"));bind("questToggle",()=>ui("questPanel").classList.toggle("closed"));bind("characterBtn",()=>generic("🛡️ 캐릭터",`${chars[state.character].name} · ${chars[state.character].role}`));bind("friendBtn",()=>generic("👥 친구","친구 농장 방문 기능 준비 화면입니다."));bind("mailBtn",()=>generic("✉️ 우편","운영 보상과 안내 메시지가 표시됩니다."));bind("rankingBtn",()=>generic("🏆 랭킹",`현재 점수 ${state.gold+state.harvest*100}`));bind("codexBtn",()=>generic("📖 도감",`첫 업무 ${state.achievements.firstWork?"완료":"미완료"} · 첫 수확 ${state.achievements.firstHarvest?"완료":"미완료"}`));bind("settingsTopBtn",()=>generic("⚙️ 설정","그래픽·사운드 설정 확장 지점입니다."));bind("autoBtn",()=>{const h=hotspots.reduce((a,b)=>Math.hypot(state.player.x-a.x,state.player.y-a.y)<Math.hypot(state.player.x-b.x,state.player.y-b.y)?a:b);startAutoTo(h)});bind("claimRewardBtn",()=>{if(state.quests.every(Boolean)){state.gold+=500;state.quests=[false,false,false,false];toast("일일 보상 +500G");save()}else toast("모든 퀘스트를 완료하세요.")});bind("modalClose",closeModal);ui("modal").onclick=e=>{if(e.target===ui("modal"))closeModal()};bind("startBtn",()=>{state.character=selected;started=true;ui("characterSelect").classList.remove("show");save();toast(`${chars[selected].name}과 함께 시작합니다.`)});
let prev=performance.now();function loop(now){const dt=Math.min(.04,(now-prev)/1000);prev=now;update(dt);draw();requestAnimationFrame(loop)}
(async()=>{resize();load();cards();await assets();setTimeout(()=>{ui("loading").classList.remove("show");ui("characterSelect").classList.add("show")},250);updateUI();requestAnimationFrame(loop);if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{})})();
})();