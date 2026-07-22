(() => {
"use strict";
const ui=id=>document.getElementById(id), canvas=ui("game"), ctx=canvas.getContext("2d",{alpha:false});
const DPR=Math.min(devicePixelRatio||1,2);
const CHARACTER_BASE_URL="./public/assets/characters_v2/";
const CITY_BG_URL="./public/assets/ui/city_neon_world_clean.jpg";
let W=0,H=0,last=performance.now(),started=false,selected=null,keys={},joy={x:0,y:0},run=false;
let bgImage=null, rainEnabled=true, userId=localStorage.getItem("komscoUserId")||("guest-"+Math.random().toString(36).slice(2,10));
localStorage.setItem("komscoUserId",userId);
const images={};

const chars={
 hunmin:{name:"훈민",role:"전략가",desc:"균형형 리더",img:"hunmin.png",bonus:"exp"},
 daim:{name:"다임",role:"정보 탐색관",desc:"업무 보상 20% 증가",img:"daim.png",bonus:"gold"},
 sunsik:{name:"순식",role:"호위무사",desc:"이동 속도 15% 증가",img:"sunsik.png",bonus:"speed"}
};
const seeds={
 carrot:{name:"당근",price:60,grow:45000,reward:120,emoji:"🥕"},
 tomato:{name:"토마토",price:90,grow:70000,reward:190,emoji:"🍅"},
 strawberry:{name:"딸기",price:130,grow:100000,reward:300,emoji:"🍓"}
};
const state={
 gold:300,gems:1250,seeds:0,harvest:0,level:1,character:"hunmin",
 player:{x:48,y:86,speed:22,dir:1},inventory:{carrot:0,tomato:0,strawberry:0},
 equipment:{weapon:"기본 청룡봉",armor:"기본 도포"},quests:[false,false,false,false],
 farm:Array.from({length:8},()=>({seed:null,plantedAt:0,growMs:0})),
 achievements:{firstWork:false,firstHarvest:false},friends:[],rankingScore:0
};

/* Phase 1: 실제 배경 좌표 기반 이동 네트워크.
   캐릭터는 roadSegments 또는 bridgeSegments 안에서만 이동 가능. */
const roadSegments=[
 {x:4,y:73,w:60,h:16},{x:11,y:46,w:60,h:13},{x:31,y:20,w:14,h:67},
 {x:54,y:11,w:13,h:70},{x:66,y:57,w:30,h:14},{x:69,y:26,w:26,h:13},
 {x:17,y:31,w:17,h:14},{x:8,y:58,w:17,h:13}
];
const bridgeSegments=[
 {x:60,y:48,w:15,h:12},{x:67,y:64,w:15,h:12}
];
const waterZones=[
 {x:57,y:38,w:17,h:38}
];
const buildings=[
 {x:15,y:25,w:15,h:17,label:"본사"},{x:34,y:13,w:14,h:14,label:"제지본부"},
 {x:48,y:13,w:14,h:14,label:"기술연구원"},{x:57,y:28,w:14,h:15,label:"화폐본부"},
 {x:40,y:43,w:15,h:14,label:"씨앗상점"},{x:76,y:20,w:20,h:24,label:"주말농장"}
];
const hotspots=[
 {x:27,y:47,r:6,label:"본사",type:"work",reward:150},
 {x:41,y:32,r:6,label:"제지본부",type:"work",reward:120},
 {x:55,y:31,r:6,label:"기술연구원",type:"work",reward:160},
 {x:64,y:47,r:6,label:"화폐본부",type:"work",reward:130},
 {x:48,y:61,r:6,label:"씨앗상점",type:"shop"},
 {x:84,y:53,r:8,label:"주말농장",type:"farm"}
];

const npcs=[
 {x:21,y:78,dx:1,name:"직원A"},{x:44,y:50,dx:-1,name:"직원B"},{x:75,y:63,dx:1,name:"농장관리인"}
];
const cars=[
 {x:8,y:77,speed:6,color:"#e93f4c"},{x:67,y:62,speed:7,color:"#f4c32f"},{x:18,y:49,speed:5,color:"#3e8eff"}
];

function resize(){W=innerWidth;H=innerHeight;canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+"px";canvas.style.height=H+"px";ctx.setTransform(DPR,0,0,DPR,0,0);}
addEventListener("resize",resize);resize();
const p2s=(x,y)=>({x:x/100*W,y:y/100*H});
function coverRect(img,w,h){const ir=img.width/img.height,vr=w/h;let dw,dh,dx,dy;if(ir>vr){dh=h;dw=h*ir;dx=(w-dw)/2;dy=0}else{dw=w;dh=w/ir;dx=0;dy=(h-dh)/2}return{dx,dy,dw,dh};}
function inRect(x,y,r){return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h}
function isWalkable(x,y){
 const onRoad=roadSegments.some(r=>inRect(x,y,r));
 const onBridge=bridgeSegments.some(r=>inRect(x,y,r));
 const inWater=waterZones.some(r=>inRect(x,y,r));
 const inBuilding=buildings.some(r=>inRect(x,y,r));
 return (onRoad||onBridge) && !inBuilding && (!inWater||onBridge);
}
function drawBackground(){ctx.fillStyle="#020713";ctx.fillRect(0,0,W,H);if(bgImage){const r=coverRect(bgImage,W,H);ctx.drawImage(bgImage,r.dx,r.dy,r.dw,r.dh);}const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#01040b22");g.addColorStop(1,"#00060f66");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
function drawWorldDebug(){if(!location.search.includes("debug=1"))return;ctx.save();ctx.globalAlpha=.25;for(const r of roadSegments){const p=p2s(r.x,r.y);ctx.fillStyle="#36ff72";ctx.fillRect(p.x,p.y,r.w/100*W,r.h/100*H)}for(const r of bridgeSegments){const p=p2s(r.x,r.y);ctx.fillStyle="#ffd83b";ctx.fillRect(p.x,p.y,r.w/100*W,r.h/100*H)}for(const r of waterZones){const p=p2s(r.x,r.y);ctx.fillStyle="#228cff";ctx.fillRect(p.x,p.y,r.w/100*W,r.h/100*H)}ctx.restore();}
function drawHotspots(){const t=performance.now()/1000;for(const h of hotspots){const p=p2s(h.x,h.y),near=Math.hypot(state.player.x-h.x,state.player.y-h.y)<h.r;ctx.save();ctx.strokeStyle=near?"#ffe16b":"#25caff";ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=18;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,18+Math.sin(t*3)*3,7,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;ctx.font="700 12px sans-serif";ctx.textAlign="center";ctx.fillStyle=near?"#fff1a8":"#d7f7ff";ctx.fillText(h.label,p.x,p.y-15);ctx.restore();}}
function drawCharacterSprite(img,x,y,scale=1,glow="#1ed2ff"){if(!img)return;const p=p2s(x,y),baseH=(W<700?112:145)*scale,ratio=img.width/img.height,baseW=baseH*ratio;ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=.28;ctx.fillStyle="#000";ctx.beginPath();ctx.ellipse(0,5,baseW*.34,baseW*.12,0,0,7);ctx.fill();ctx.globalAlpha=1;ctx.shadowColor=glow;ctx.shadowBlur=16;ctx.drawImage(img,-baseW/2,-baseH,baseW,baseH);ctx.restore();}
function drawPlayer(){const img=images[state.character];if(!img)return;const moving=isMoving(),bob=moving?Math.sin(performance.now()*.015)*3:0,p=p2s(state.player.x,state.player.y),baseH=(W<700?125:154)*(state.character==="daim"?.94:1),ratio=img.width/img.height,baseW=baseH*ratio;ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=.32;ctx.fillStyle="#000";ctx.beginPath();ctx.ellipse(0,7,baseW*.35,baseW*.13,0,0,7);ctx.fill();ctx.globalAlpha=1;ctx.shadowColor="#28d8ff";ctx.shadowBlur=20;ctx.scale(state.player.dir,1);ctx.drawImage(img,-baseW/2,-baseH+bob,baseW,baseH);ctx.restore();}
function drawNPCs(dt){for(const n of npcs){n.x+=n.dx*dt*3;if(!isWalkable(n.x,n.y)){n.dx*=-1;n.x+=n.dx*dt*6}drawCharacterSprite(images.daim,n.x,n.y,.48,"#ffb33e");}}
function drawCars(dt){for(const c of cars){c.x+=c.speed*dt;if(c.x>96)c.x=4;const p=p2s(c.x,c.y);ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle=c.color;ctx.shadowColor=c.color;ctx.shadowBlur=12;ctx.fillRect(-16,-8,32,14);ctx.fillStyle="#bfeaff";ctx.fillRect(-8,-14,16,8);ctx.restore();}}
function drawRain(){if(!rainEnabled)return;const t=performance.now();ctx.save();ctx.strokeStyle="#9edfff55";ctx.lineWidth=1;for(let i=0;i<80;i++){const x=(i*97+t*.12)%W,y=(i*53+t*.24)%H;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+4,y+14);ctx.stroke()}ctx.restore();}
function drawFarmGrowth(){const base=p2s(84,53);state.farm.forEach((f,i)=>{if(!f.seed)return;const col=i%4,row=Math.floor(i/4),growth=Math.min(1,(Date.now()-f.plantedAt)/f.growMs);ctx.save();ctx.font=`${15+growth*9}px serif`;ctx.textAlign="center";ctx.shadowColor="#43ff8c";ctx.shadowBlur=10;ctx.fillText(seeds[f.seed].emoji,base.x-55+col*36,base.y+20+row*27);ctx.restore();});}
function isMoving(){return Math.hypot(joy.x,joy.y)>.05||keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight||keys.w||keys.a||keys.s||keys.d}
function update(dt){
 if(!started)return;
 let dx=joy.x+(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),dy=joy.y+(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);
 const len=Math.hypot(dx,dy);if(len>.05){dx/=Math.max(1,len);dy/=Math.max(1,len);state.player.dir=dx<0?-1:1;let sp=state.player.speed*(run||keys.Shift?1.55:1)*(state.character==="sunsik"?1.15:1);let nx=state.player.x+dx*sp*dt,ny=state.player.y+dy*sp*dt;
  if(isWalkable(nx,ny)){state.player.x=nx;state.player.y=ny}else{if(isWalkable(nx,state.player.y))state.player.x=nx;if(isWalkable(state.player.x,ny))state.player.y=ny;}
 }
 const near=getNear();if(near){ui("interactionHint").textContent=`${near.label} · 상호작용`;ui("interactionHint").classList.add("show")}else ui("interactionHint").classList.remove("show");
 updateZone(near);updateUI();
}
function getNear(){let best=null,d=999;for(const h of hotspots){const x=Math.hypot(state.player.x-h.x,state.player.y-h.y);if(x<h.r&&x<d){best=h;d=x}}return best}
function interact(){const h=getNear();if(!h){toast("건물 입구의 네온 지점으로 이동하세요.");return}if(h.type==="work")doWork(h);if(h.type==="shop")openShop();if(h.type==="farm")openFarm()}
function doWork(h){const reward=Math.round(h.reward*(state.character==="daim"?1.2:1));state.gold+=reward;state.rankingScore+=reward;state.level=1+Math.floor((state.gold+state.harvest*80)/900);state.quests[0]=true;state.achievements.firstWork=true;toast(`${h.label} 업무 완료! +${reward}G`);save();}
function openShop(){let html="<h2>🌱 씨앗상점</h2><div class=shop-grid>";for(const[id,s]of Object.entries(seeds))html+=`<div class=item><h3>${s.emoji} ${s.name}</h3><p>${s.price}G · ${Math.round(s.grow/1000)}초</p><button data-buy="${id}">구매</button></div>`;html+="</div>";openModal(html);document.querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>buySeed(b.dataset.buy))}
function buySeed(id){const s=seeds[id];if(state.gold<s.price){toast("골드가 부족합니다.");return}state.gold-=s.price;state.inventory[id]++;state.seeds++;state.quests[1]=true;toast(`${s.name} 구매 완료`);openShop();save()}
function openFarm(){let html="<h2>🌃 주말농장</h2><div class=farm-grid>";state.farm.forEach((f,i)=>{if(!f.seed)html+=`<div class=item><h3>밭 ${i+1}</h3><button data-plot="${i}">씨앗 심기</button></div>`;else{const left=Math.max(0,f.growMs-(Date.now()-f.plantedAt)),ready=left<=0;html+=`<div class=item><h3>밭 ${i+1} ${seeds[f.seed].emoji}</h3><p>${ready?"수확 가능":Math.ceil(left/1000)+"초"}</p><button data-plot="${i}">${ready?"수확":"확인"}</button></div>`}});html+="</div>";openModal(html);document.querySelectorAll("[data-plot]").forEach(b=>b.onclick=()=>usePlot(+b.dataset.plot))}
function usePlot(i){const f=state.farm[i];if(!f.seed){const a=Object.keys(seeds).filter(k=>state.inventory[k]>0);if(!a.length){toast("씨앗을 구매하세요.");return}let html="<h2>씨앗 선택</h2><div class=shop-grid>";a.forEach(id=>html+=`<div class=item><h3>${seeds[id].emoji} ${seeds[id].name}</h3><button data-plant="${id}">심기</button></div>`);html+="</div>";openModal(html);document.querySelectorAll("[data-plant]").forEach(b=>b.onclick=()=>plant(i,b.dataset.plant));return}const e=Date.now()-f.plantedAt;if(e<f.growMs){toast(`성장 중 ${Math.ceil((f.growMs-e)/1000)}초`);return}const s=seeds[f.seed];state.gold+=s.reward;state.harvest++;state.rankingScore+=s.reward;state.quests[3]=true;state.achievements.firstHarvest=true;state.farm[i]={seed:null,plantedAt:0,growMs:0};toast(`${s.name} 수확 +${s.reward}G`);save();openFarm()}
async function serverNow(){try{const r=await fetch("./api/time");if(r.ok)return(await r.json()).now}catch{}return Date.now()}
async function plant(i,id){state.inventory[id]--;state.seeds--;state.farm[i]={seed:id,plantedAt:await serverNow(),growMs:seeds[id].grow};state.quests[2]=true;closeModal();toast(`${seeds[id].name} 심기 완료`);save()}
function updateZone(n){ui("zoneText").textContent=n?n.label:(state.player.x>70?"주말농장 지구":"네온 중앙지구")}
function updateUI(){ui("goldText").textContent=state.gold;ui("seedText").textContent=state.seeds;ui("harvestText").textContent=state.harvest;ui("levelText").textContent=state.level;if(ui("gemText"))ui("gemText").textContent=state.gems;if(ui("heroName"))ui("heroName").textContent=chars[state.character]?.name||"조폐 히어로즈";if(ui("expFill"))ui("expFill").style.width=`${Math.min(100,((state.gold+state.harvest*80)%900)/9)}%`;const q=["회사 본부에서 업무 수행","씨앗상점에서 씨앗 구매","주말농장에 씨앗 심기","다 자란 작물 수확"];ui("questList").innerHTML=q.map((x,i)=>`<li class="${state.quests[i]?"done":""}">${x}</li>`).join("")}
function openBag(){let html="<h2>🎒 가방·장비</h2><div class=inventory-grid>";for(const[id,s]of Object.entries(seeds))html+=`<div class=item><h3>${s.emoji} ${s.name}</h3><b>${state.inventory[id]}개</b></div>`;html+=`<div class=item><h3>⚔ 장비</h3><p>${state.equipment.weapon}<br>${state.equipment.armor}</p></div></div>`;openModal(html)}
function openMap(){openModal(`<h2>🗺️ 이동 지도</h2><div class=map-preview></div><p>도로·인도와 다리만 이동할 수 있습니다. 강과 건물은 통과할 수 없습니다.</p>`)}
function openSettings(){openModal(`<h2>⚙️ 설정</h2><div class=item><label><input id=rainToggle type=checkbox ${rainEnabled?"checked":""}> 비 효과</label></div><div class=item><button id=resetSave>데이터 초기화</button></div>`);ui("rainToggle").onchange=e=>rainEnabled=e.target.checked;ui("resetSave").onclick=()=>{localStorage.removeItem("komscoPhase15");location.reload()}}
function openGeneric(t,s){openModal(`<h2>${t}</h2><div class=item><p>${s}</p></div>`)}
function openLogin(){openModal(`<h2>🔐 계정 로그인</h2><div class=item><label>이메일<input id=loginEmail type=email placeholder="user@example.com"></label><button id=loginBtn>게스트 계정 연결</button></div>`);ui("loginBtn").onclick=()=>{const e=ui("loginEmail").value.trim();if(e){userId=e;localStorage.setItem("komscoUserId",e);toast("계정 연결 완료");closeModal()}}}
function openRanking(){openModal(`<h2>🏆 랭킹</h2><div class=item><p>내 점수: <b>${state.rankingScore}</b></p><p>서버 랭킹 API 연동 준비 완료</p></div>`)}
function openModal(h){ui("modalBody").innerHTML=h;ui("modal").classList.add("show")}function closeModal(){ui("modal").classList.remove("show")}
function toast(t){ui("toast").textContent=t;ui("toast").classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>ui("toast").classList.remove("show"),1800)}
async function save(){localStorage.setItem("komscoPhase15",JSON.stringify(state));try{await fetch("./api/save",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,gameState:state})})}catch{}}
function load(){try{const s=JSON.parse(localStorage.getItem("komscoPhase15"));if(s)Object.assign(state,s)}catch{}}
function loadImage(src){return new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src})}
async function loadAssets(){let n=0,total=4;bgImage=await loadImage(CITY_BG_URL);n++;ui("loadBar").style.width=`${n/total*100}%`;for(const[id,c]of Object.entries(chars)){images[id]=await loadImage(`${CHARACTER_BASE_URL}${c.img}`);n++;ui("loadBar").style.width=`${n/total*100}%`}}
function buildCharacterCards(){ui("characterCards").innerHTML=Object.entries(chars).map(([id,c])=>`<article class=character-card data-char="${id}"><img src="${CHARACTER_BASE_URL}${c.img}" alt="${c.name}"><h3>${c.name}</h3><b>${c.role}</b><p>${c.desc}</p></article>`).join("");document.querySelectorAll(".character-card").forEach(e=>e.onclick=()=>{selected=e.dataset.char;document.querySelectorAll(".character-card").forEach(x=>x.classList.toggle("selected",x===e));ui("startBtn").disabled=false})}
let previous=performance.now();function loop(now){const dt=Math.min(.04,(now-previous)/1000);previous=now;update(dt);drawBackground();drawWorldDebug();drawHotspots();drawFarmGrowth();drawCars(dt);drawNPCs(dt);drawPlayer();drawRain();requestAnimationFrame(loop)}
const bind=(id,fn)=>{const e=ui(id);if(e)e.onclick=fn};
addEventListener("keydown",e=>{keys[e.key]=true;if(e.key==="e"||e.key==="Enter")interact()});addEventListener("keyup",e=>keys[e.key]=false);
const joyEl=ui("joystick"),stick=ui("stick");function joyMove(e){const r=joyEl.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),m=Math.min(38,Math.hypot(x,y)),a=Math.atan2(y,x);joy.x=Math.cos(a)*m/38;joy.y=Math.sin(a)*m/38;stick.style.transform=`translate(${joy.x*32}px,${joy.y*32}px)`}joyEl.onpointerdown=e=>{joyEl.setPointerCapture(e.pointerId);joyMove(e)};joyEl.onpointermove=e=>{if(joyEl.hasPointerCapture(e.pointerId))joyMove(e)};joyEl.onpointerup=()=>{joy={x:0,y:0};stick.style.transform=""};ui("runBtn").onpointerdown=()=>run=true;ui("runBtn").onpointerup=()=>run=false;
bind("interactBtn",interact);bind("bagBtn",openBag);bind("mapBtn",openMap);bind("settingsBtn",openSettings);bind("settingsTopBtn",openSettings);bind("questBtn",()=>ui("questPanel").classList.toggle("closed"));bind("missionTopBtn",()=>ui("questPanel").classList.toggle("closed"));bind("questToggle",()=>ui("questPanel").classList.toggle("closed"));bind("shopBtn",openShop);bind("characterBtn",()=>openGeneric("🛡 캐릭터",`${chars[state.character].name} · ${chars[state.character].role}`));bind("rankingBtn",openRanking);bind("codexBtn",()=>openGeneric("📖 도감",`첫 업무: ${state.achievements.firstWork?"완료":"미완료"} / 첫 수확: ${state.achievements.firstHarvest?"완료":"미완료"}`));bind("mailBtn",openLogin);bind("eventBtn",()=>openGeneric("🎉 이벤트","계절 농장 이벤트 준비 완료"));bind("friendBtn",()=>openGeneric("👥 친구","친구 농장 방문 API 확장 지점"));bind("claimRewardBtn",()=>{if(state.quests.every(Boolean)){state.gold+=500;state.quests=[false,false,false,false];toast("미션 보상 +500G");save()}else toast("모든 미션을 완료하세요")});bind("modalClose",closeModal);ui("modal").onclick=e=>{if(e.target===ui("modal"))closeModal()};bind("startBtn",()=>{state.character=selected;started=true;ui("characterSelect").classList.remove("show");save();toast(`${chars[selected].name}과 함께 입장합니다`)});
(async()=>{load();buildCharacterCards();await loadAssets();setTimeout(()=>{ui("loading").classList.remove("show");ui("characterSelect").classList.add("show")},300);updateUI();requestAnimationFrame(loop);if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{})})();
})();