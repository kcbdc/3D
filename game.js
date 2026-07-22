(() => {
"use strict";

const ui = id => document.getElementById(id);
const canvas = ui("game");
const ctx = canvas.getContext("2d", { alpha:false });
const DPR = Math.min(devicePixelRatio || 1, 2);
const CHARACTER_BASE_URL = "./public/assets/characters/";
const CITY_BG_URL = "./public/assets/ui/city_neon_world.jpg";

let W=0,H=0,last=performance.now(),started=false,selected=null;
let keys={},joy={x:0,y:0},run=false;
let bgImage=null;
const images={};

const chars={
  hunmin:{name:"훈민",role:"전략가",desc:"업무 보상과 성장 경험치가 균형 잡힌 리더",img:"hunmin.png"},
  daim:{name:"다임",role:"정보 탐색관",desc:"업무 보상 20% 증가",img:"daim.png"},
  sunsik:{name:"순식",role:"호위무사",desc:"이동 속도 15% 증가",img:"sunsik.png"}
};

const seeds={
  carrot:{name:"당근",price:60,grow:45000,reward:120,emoji:"🥕"},
  tomato:{name:"토마토",price:90,grow:70000,reward:190,emoji:"🍅"},
  strawberry:{name:"딸기",price:130,grow:100000,reward:300,emoji:"🍓"}
};

const state={
  gold:300,seeds:0,harvest:0,level:1,character:"hunmin",
  player:{x:50,y:80,speed:23},
  inventory:{carrot:0,tomato:0,strawberry:0},
  quests:[false,false,false,false],
  farm:Array.from({length:6},()=>({seed:null,plantedAt:0,growMs:0}))
};

/* 실제 네온 도시 배경의 화면 위치에 맞춘 상호작용 지점 */
const hotspots=[
  {x:25,y:35,r:9,label:"본사",type:"work",reward:150},
  {x:39,y:23,r:8,label:"제지본부",type:"work",reward:120},
  {x:50,y:20,r:8,label:"기술연구원",type:"work",reward:160},
  {x:61,y:33,r:8,label:"화폐본부",type:"work",reward:130},
  {x:47,y:50,r:9,label:"씨앗상점",type:"shop"},
  {x:80,y:36,r:11,label:"주말농장",type:"farm"}
];

function resize(){
  W=innerWidth; H=innerHeight;
  canvas.width=W*DPR; canvas.height=H*DPR;
  canvas.style.width=W+"px"; canvas.style.height=H+"px";
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener("resize",resize); resize();

function coverRect(img,w,h){
  const ir=img.width/img.height, vr=w/h;
  let dw,dh,dx,dy;
  if(ir>vr){ dh=h; dw=h*ir; dx=(w-dw)/2; dy=0; }
  else { dw=w; dh=w/ir; dx=0; dy=(h-dh)/2; }
  return {dx,dy,dw,dh};
}
function worldToScreen(x,y){
  return {x:x/100*W,y:y/100*H};
}
function drawBackground(){
  ctx.fillStyle="#030813";ctx.fillRect(0,0,W,H);
  if(!bgImage)return;
  const r=coverRect(bgImage,W,H);
  ctx.drawImage(bgImage,r.dx,r.dy,r.dw,r.dh);
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"rgba(1,6,18,.14)");
  g.addColorStop(.62,"rgba(2,8,20,.02)");
  g.addColorStop(1,"rgba(1,4,12,.30)");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}
function drawHotspots(){
  const t=performance.now()/1000;
  for(const h of hotspots){
    const p=worldToScreen(h.x,h.y);
    const near=Math.hypot(state.player.x-h.x,state.player.y-h.y)<h.r;
    ctx.save();
    ctx.globalAlpha=near?.95:.54;
    ctx.strokeStyle=near?"#ffe16b":"#38ccff";
    ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=18;
    ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(p.x,p.y,20+Math.sin(t*3)*3,8+Math.sin(t*3),0,0,Math.PI*2);ctx.stroke();
    ctx.shadowBlur=0;
    ctx.font="700 12px sans-serif";ctx.textAlign="center";
    ctx.fillStyle=near?"#fff1a8":"#d7f7ff";
    ctx.fillText(h.label,p.x,p.y-16);
    ctx.restore();
  }
}
function drawFarmGrowth(){
  const farm=hotspots.find(h=>h.type==="farm");
  const base=worldToScreen(farm.x,farm.y);
  state.farm.forEach((f,i)=>{
    if(!f.seed)return;
    const col=i%3,row=Math.floor(i/3);
    const x=base.x-52+col*42,y=base.y+14+row*28;
    const growth=Math.min(1,(Date.now()-f.plantedAt)/f.growMs);
    ctx.save();ctx.font=`${16+growth*10}px serif`;ctx.textAlign="center";
    ctx.shadowColor="#43ff8c";ctx.shadowBlur=10;
    ctx.fillText(seeds[f.seed].emoji,x,y);ctx.restore();
  });
}
function drawPlayer(){
  const img=images[state.character];if(!img)return;
  const p=worldToScreen(state.player.x,state.player.y);
  const mobile=W<700;
  const baseH=(mobile?128:158)*(state.character==="daim"?.93:1);
  const ratio=img.width/img.height,baseW=baseH*ratio;
  const moving=isMoving(),bob=moving?Math.sin(performance.now()*.015)*3:0;
  ctx.save();ctx.translate(p.x,p.y);
  ctx.globalAlpha=.35;ctx.fillStyle="#06131e";
  ctx.beginPath();ctx.ellipse(0,7,baseW*.34,baseW*.13,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  ctx.shadowColor="#27cfff";ctx.shadowBlur=20;
  ctx.drawImage(img,-baseW/2,-baseH+bob,baseW,baseH);
  ctx.restore();
}
function isMoving(){
  return Math.hypot(joy.x,joy.y)>.05||keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight||keys.w||keys.a||keys.s||keys.d;
}
function blocked(x,y){
  return x<3||x>97||y<10||y>94;
}
function update(dt){
  if(!started)return;
  let dx=joy.x+(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0);
  let dy=joy.y+(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);
  const len=Math.hypot(dx,dy);
  if(len>.05){
    dx/=Math.max(1,len);dy/=Math.max(1,len);
    let speed=state.player.speed*(run||keys.Shift?1.55:1)*(state.character==="sunsik"?1.15:1);
    let nx=state.player.x+dx*speed*dt,ny=state.player.y+dy*speed*dt;
    if(!blocked(nx,ny)){state.player.x=nx;state.player.y=ny;}
  }
  const near=getNear();
  if(near){
    ui("interactionHint").textContent=`${near.label} · 상호작용`;
    ui("interactionHint").classList.add("show");
  }else ui("interactionHint").classList.remove("show");
  updateZone(near);updateUI();
}
function getNear(){
  let best=null,distance=999;
  for(const h of hotspots){
    const d=Math.hypot(state.player.x-h.x,state.player.y-h.y);
    if(d<h.r&&d<distance){best=h;distance=d;}
  }
  return best;
}
function interact(){
  const h=getNear();
  if(!h){toast("네온 표시 지점 가까이 이동하세요.");return;}
  if(h.type==="work")doWork(h);
  if(h.type==="shop")openShop();
  if(h.type==="farm")openFarm();
}
function doWork(h){
  const reward=Math.round(h.reward*(state.character==="daim"?1.2:1));
  state.gold+=reward;state.level=1+Math.floor((state.gold+state.harvest*80)/900);
  state.quests[0]=true;toast(`${h.label} 업무 완료! +${reward}G`);save();
}
function openShop(){
  let html="<h2>🌱 네온 씨앗상점</h2><p>업무로 획득한 골드로 씨앗을 구매하세요.</p><div class='shop-grid'>";
  for(const [id,s] of Object.entries(seeds)){
    html+=`<div class="item"><h3>${s.emoji} ${s.name}</h3><p>${s.price}G · ${Math.round(s.grow/1000)}초</p><button data-buy="${id}">구매</button></div>`;
  }
  html+="</div>";openModal(html);
  document.querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>buySeed(b.dataset.buy));
}
function buySeed(id){
  const s=seeds[id];if(state.gold<s.price){toast("골드가 부족합니다.");return;}
  state.gold-=s.price;state.inventory[id]++;state.seeds++;state.quests[1]=true;
  toast(`${s.name} 씨앗 구매 완료`);openShop();save();
}
function openFarm(){
  let html="<h2>🌃 주말농장</h2><div class='farm-grid'>";
  state.farm.forEach((f,i)=>{
    if(!f.seed) html+=`<div class=item><h3>밭 ${i+1}</h3><p>비어 있음</p><button data-plot="${i}">씨앗 심기</button></div>`;
    else{
      const left=Math.max(0,f.growMs-(Date.now()-f.plantedAt));
      const ready=left<=0;
      html+=`<div class=item><h3>밭 ${i+1} ${seeds[f.seed].emoji}</h3><p>${ready?"수확 가능":Math.ceil(left/1000)+"초 남음"}</p><button data-plot="${i}">${ready?"수확":"확인"}</button></div>`;
    }
  });
  html+="</div>";openModal(html);
  document.querySelectorAll("[data-plot]").forEach(b=>b.onclick=()=>usePlot(+b.dataset.plot));
}
function usePlot(i){
  const f=state.farm[i];
  if(!f.seed){
    const available=Object.keys(seeds).filter(k=>state.inventory[k]>0);
    if(!available.length){toast("먼저 씨앗상점에서 씨앗을 구매하세요.");return;}
    let html="<h2>심을 씨앗 선택</h2><div class=shop-grid>";
    available.forEach(id=>html+=`<div class=item><h3>${seeds[id].emoji} ${seeds[id].name}</h3><p>보유 ${state.inventory[id]}개</p><button data-plant="${id}">심기</button></div>`);
    html+="</div>";openModal(html);
    document.querySelectorAll("[data-plant]").forEach(b=>b.onclick=()=>plant(i,b.dataset.plant));
    return;
  }
  const elapsed=Date.now()-f.plantedAt;
  if(elapsed<f.growMs){toast(`성장 중 · ${Math.ceil((f.growMs-elapsed)/1000)}초 남음`);return;}
  const s=seeds[f.seed];state.gold+=s.reward;state.harvest++;state.quests[3]=true;
  state.farm[i]={seed:null,plantedAt:0,growMs:0};toast(`${s.name} 수확! +${s.reward}G`);save();openFarm();
}
async function serverNow(){
  try{const r=await fetch("./api/time");if(r.ok){const j=await r.json();return j.now;}}catch(e){}
  return Date.now();
}
async function plant(i,id){
  state.inventory[id]--;state.seeds--;
  state.farm[i]={seed:id,plantedAt:await serverNow(),growMs:seeds[id].grow};
  state.quests[2]=true;closeModal();toast(`${seeds[id].name}을 심었습니다.`);save();
}
function updateZone(near){
  ui("zoneText").textContent=near?near.label:(state.player.x>70?"주말농장 지구":"네온 중앙지구");
}
function updateUI(){
  ui("goldText").textContent=state.gold;ui("seedText").textContent=state.seeds;
  ui("harvestText").textContent=state.harvest;ui("levelText").textContent=state.level;
  if(ui("gemText"))ui("gemText").textContent=1250;
  if(ui("heroName"))ui("heroName").textContent=chars[state.character]?.name||"조폐 히어로즈";
  if(ui("expFill"))ui("expFill").style.width=`${Math.min(100,((state.gold+state.harvest*80)%900)/9)}%`;
  const q=["회사 본부에서 업무 수행","씨앗상점에서 씨앗 구매","주말농장에 씨앗 심기","다 자란 작물 수확"];
  ui("questList").innerHTML=q.map((x,i)=>`<li class="${state.quests[i]?"done":""}">${x}</li>`).join("");
}
function openBag(){
  let html="<h2>🎒 가방</h2><div class=inventory-grid>";
  for(const [id,s] of Object.entries(seeds))html+=`<div class=item><h3>${s.emoji} ${s.name}</h3><b>${state.inventory[id]}개</b></div>`;
  html+=`<div class=item><h3>📦 수확물</h3><b>${state.harvest}개</b></div></div>`;openModal(html);
}
function openMap(){openModal(`<h2>🗺️ 네온 도시 지도</h2><div class="map-preview"></div><p>파란 네온 지점은 업무 본부, 황금 네온 지점은 씨앗상점과 주말농장입니다.</p>`);}
function openSettings(){openModal(`<h2>⚙️ 설정</h2><div class=item><button id=resetSave>게임 데이터 초기화</button></div>`);ui("resetSave").onclick=()=>{localStorage.removeItem("komscoNeonActual");location.reload();};}
function openGeneric(title,text){openModal(`<h2>${title}</h2><div class=item><p>${text}</p></div>`);}
function openModal(html){ui("modalBody").innerHTML=html;ui("modal").classList.add("show");}
function closeModal(){ui("modal").classList.remove("show");}
function toast(text){ui("toast").textContent=text;ui("toast").classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>ui("toast").classList.remove("show"),1800);}
function save(){localStorage.setItem("komscoNeonActual",JSON.stringify(state));}
function load(){try{const s=JSON.parse(localStorage.getItem("komscoNeonActual"));if(s)Object.assign(state,s);}catch(e){}}
function loop(now){const dt=Math.min(.04,(now-last)/1000);last=now;update(dt);drawBackground();drawHotspots();drawFarmGrowth();drawPlayer();requestAnimationFrame(loop);}
function loadImage(src){return new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=src;});}
async function loadAssets(){
  let loaded=0,total=4;
  bgImage=await loadImage(CITY_BG_URL);loaded++;ui("loadBar").style.width=`${loaded/total*100}%`;
  for(const [id,c] of Object.entries(chars)){images[id]=await loadImage(`${CHARACTER_BASE_URL}${c.img}`);loaded++;ui("loadBar").style.width=`${loaded/total*100}%`;}
}
function buildCharacterCards(){
  ui("characterCards").innerHTML=Object.entries(chars).map(([id,c])=>`<article class="character-card" data-char="${id}"><img src="${CHARACTER_BASE_URL}${c.img}" alt="${c.name}"><h3>${c.name}</h3><b>${c.role}</b><p>${c.desc}</p></article>`).join("");
  document.querySelectorAll(".character-card").forEach(el=>el.onclick=()=>{
    selected=el.dataset.char;
    document.querySelectorAll(".character-card").forEach(x=>x.classList.toggle("selected",x===el));
    ui("startBtn").disabled=false;
  });
}
const bind=(id,fn)=>{const el=ui(id);if(el)el.onclick=fn;};
addEventListener("keydown",e=>{keys[e.key]=true;if(e.key==="e"||e.key==="Enter")interact();});
addEventListener("keyup",e=>keys[e.key]=false);

const joyEl=ui("joystick"),stick=ui("stick");
function joyMove(e){const r=joyEl.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),m=Math.min(38,Math.hypot(x,y)),a=Math.atan2(y,x);joy.x=Math.cos(a)*m/38;joy.y=Math.sin(a)*m/38;stick.style.transform=`translate(${joy.x*32}px,${joy.y*32}px)`;}
joyEl.onpointerdown=e=>{joyEl.setPointerCapture(e.pointerId);joyMove(e);};
joyEl.onpointermove=e=>{if(joyEl.hasPointerCapture(e.pointerId))joyMove(e);};
joyEl.onpointerup=()=>{joy={x:0,y:0};stick.style.transform="";};
ui("runBtn").onpointerdown=()=>run=true;ui("runBtn").onpointerup=()=>run=false;

bind("interactBtn",interact);bind("bagBtn",openBag);bind("mapBtn",openMap);bind("settingsBtn",openSettings);bind("settingsTopBtn",openSettings);
bind("questBtn",()=>ui("questPanel").classList.toggle("closed"));bind("missionTopBtn",()=>ui("questPanel").classList.toggle("closed"));bind("questToggle",()=>ui("questPanel").classList.toggle("closed"));
bind("shopBtn",openShop);bind("characterBtn",()=>openGeneric("🛡 캐릭터",`${chars[state.character].name} · ${chars[state.character].role}`));
bind("rankingBtn",()=>openGeneric("🏆 랭킹","Cloudflare D1 랭킹 연동 준비 화면입니다."));
bind("codexBtn",()=>openGeneric("📖 도감","수확한 작물과 발견한 시설이 기록됩니다."));
bind("mailBtn",()=>openGeneric("✉ 우편함","운영 보상과 이벤트 메시지가 표시됩니다."));
bind("eventBtn",()=>openGeneric("🎉 이벤트","시즌 도시 축제와 농장 이벤트 화면입니다."));
bind("friendBtn",()=>openGeneric("👥 친구","친구 농장 방문 기능 준비 화면입니다."));
bind("claimRewardBtn",()=>{if(state.quests.every(Boolean)){state.gold+=500;state.quests=[false,false,false,false];toast("일일 미션 보상 +500G");save();}else toast("모든 미션을 완료하세요.");});
bind("modalClose",closeModal);ui("modal").onclick=e=>{if(e.target===ui("modal"))closeModal();};
bind("startBtn",()=>{state.character=selected;started=true;ui("characterSelect").classList.remove("show");save();toast(`${chars[selected].name}과 함께 네온 도시에 입장합니다.`);});

(async()=>{
  load();buildCharacterCards();await loadAssets();
  setTimeout(()=>{ui("loading").classList.remove("show");ui("characterSelect").classList.add("show");},300);
  updateUI();requestAnimationFrame(loop);
})();
})();