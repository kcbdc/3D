(() => {
"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d",{alpha:false});
const ui=id=>document.getElementById(id);
const DPR=Math.min(devicePixelRatio||1,2);
const TILE_W=96,TILE_H=48;
let W=0,H=0,last=performance.now(),selected=null,started=false;
let camera={x:0,y:0,zoom:1},keys={},joy={x:0,y:0},run=false;
const images={}, interactables=[], decorative=[], buildings=[], plots=[];
const state={
  gold:300,seeds:0,harvest:0,level:1,character:"hunmin",
  player:{x:13,y:18,speed:3.3},
  inventory:{carrot:0,tomato:0,strawberry:0},
  quests:[false,false,false,false],
  farm:Array.from({length:12},()=>({seed:null,plantedAt:0,growMs:0}))
};
const chars={
 hunmin:{name:"훈민",role:"전략가",desc:"업무 보상과 성장 경험치가 균형 잡힌 리더",img:"hunmin.png",color:"#0d6d6d"},
 daim:{name:"다임",role:"정보 탐색관",desc:"업무 보상 20% 증가",img:"daim.png",color:"#75451e"},
 sunsik:{name:"순식",role:"호위무사",desc:"이동 속도 15% 증가",img:"sunsik.png",color:"#252a31"}
};
const seeds={
 carrot:{name:"당근",price:60,grow:45_000,reward:120,emoji:"🥕"},
 tomato:{name:"토마토",price:90,grow:70_000,reward:190,emoji:"🍅"},
 strawberry:{name:"딸기",price:130,grow:100_000,reward:300,emoji:"🍓"}
};
const colors={grass:"#78b950",grass2:"#6bac47",road:"#555b60",walk:"#d9d5c8",water:"#3ea6d6",bank:"#c7a36a"};
function resize(){W=innerWidth;H=innerHeight;canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+"px";canvas.style.height=H+"px";ctx.setTransform(DPR,0,0,DPR,0,0);camera.zoom=Math.max(.62,Math.min(1.05,W/1150));}
addEventListener("resize",resize);resize();
function iso(x,y,z=0){return {x:(x-y)*TILE_W*.5*camera.zoom+W*.5+camera.x,y:(x+y)*TILE_H*.5*camera.zoom+H*.12+camera.y-z*camera.zoom};}
function diamond(x,y,color,stroke="#00000012"){const p=iso(x,y),w=TILE_W*camera.zoom,h=TILE_H*camera.zoom;ctx.beginPath();ctx.moveTo(p.x,p.y-h/2);ctx.lineTo(p.x+w/2,p.y);ctx.lineTo(p.x,p.y+h/2);ctx.lineTo(p.x-w/2,p.y);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle=stroke;ctx.stroke();}
function prism(x,y,w,d,h,top,side1,side2){const A=iso(x,y,h),B=iso(x+w,y,h),C=iso(x+w,y+d,h),D=iso(x,y+d,h),a=iso(x,y,0),b=iso(x+w,y,0),c=iso(x+w,y+d,0),d0=iso(x,y+d,0);
 ctx.fillStyle=side1;ctx.beginPath();ctx.moveTo(B.x,B.y);ctx.lineTo(C.x,C.y);ctx.lineTo(c.x,c.y);ctx.lineTo(b.x,b.y);ctx.closePath();ctx.fill();
 ctx.fillStyle=side2;ctx.beginPath();ctx.moveTo(C.x,C.y);ctx.lineTo(D.x,D.y);ctx.lineTo(d0.x,d0.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.fill();
 ctx.fillStyle=top;ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.lineTo(C.x,C.y);ctx.lineTo(D.x,D.y);ctx.closePath();ctx.fill();ctx.strokeStyle="#0002";ctx.stroke();
}
function label(text,x,y,z=0){const p=iso(x,y,z);ctx.font=`700 ${12*camera.zoom}px sans-serif`;ctx.textAlign="center";ctx.lineWidth=3;ctx.strokeStyle="#ffffffdd";ctx.strokeText(text,p.x,p.y);ctx.fillStyle="#163047";ctx.fillText(text,p.x,p.y);}
function tree(x,y,s=1){const p=iso(x,y,0);ctx.save();ctx.translate(p.x,p.y);ctx.scale(camera.zoom*s,camera.zoom*s);ctx.fillStyle="#5b381e";ctx.fillRect(-4,-34,8,36);ctx.fillStyle="#287c3d";for(const [cx,cy,r] of [[0,-55,23],[-15,-42,18],[16,-42,18]]){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill()}ctx.restore();}
function lamp(x,y){const p=iso(x,y);ctx.save();ctx.translate(p.x,p.y);ctx.scale(camera.zoom,camera.zoom);ctx.strokeStyle="#37444a";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(0,-43);ctx.quadraticCurveTo(0,-51,11,-51);ctx.stroke();ctx.fillStyle="#ffe48b";ctx.beginPath();ctx.arc(14,-50,6,0,Math.PI*2);ctx.fill();ctx.restore();}
function building(b){prism(b.x,b.y,b.w,b.d,b.h,b.top,b.side1,b.side2);const p=iso(b.x+b.w/2,b.y+b.d/2,b.h+6);ctx.save();ctx.translate(p.x,p.y);ctx.scale(camera.zoom,camera.zoom);ctx.fillStyle=b.sign;ctx.strokeStyle="#fff";ctx.lineWidth=2;roundRect(-45,-17,90,28,6);ctx.fill();ctx.stroke();ctx.fillStyle="#fff";ctx.font="bold 14px sans-serif";ctx.textAlign="center";ctx.fillText(b.name,0,2);ctx.restore();}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function bridge(x,y,w,d){prism(x,y,w,d,8,"#90989c","#687176","#788186");for(let i=0;i<=w;i+=.5){const p=iso(x+i,y,15),q=iso(x+i,y+d,15);ctx.strokeStyle="#dde3e5";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}}
function car(x,y,color,dir=1){const p=iso(x,y,6);ctx.save();ctx.translate(p.x,p.y);ctx.scale(camera.zoom*(dir<0?-1:1),camera.zoom);ctx.fillStyle=color;roundRect(-20,-15,40,20,5);ctx.fill();ctx.fillStyle="#bfe6ef";roundRect(-9,-25,22,13,3);ctx.fill();ctx.fillStyle="#222";for(const xx of [-13,13]){ctx.beginPath();ctx.arc(xx,6,5,0,7);ctx.fill()}ctx.restore();}
function boat(x,y){const p=iso(x,y,3);ctx.save();ctx.translate(p.x,p.y);ctx.scale(camera.zoom,camera.zoom);ctx.fillStyle="#fff";ctx.beginPath();ctx.moveTo(-22,-4);ctx.lineTo(22,-4);ctx.lineTo(14,10);ctx.lineTo(-14,10);ctx.closePath();ctx.fill();ctx.fillStyle="#e94c3c";ctx.fillRect(-8,-15,16,12);ctx.restore();}
function initWorld(){
 buildings.push(
  {x:4,y:3,w:4,d:4,h:105,name:"본사",top:"#eaf1f3",side1:"#9eb8c5",side2:"#bed0d8",sign:"#1671b8",type:"work",reward:150},
  {x:12,y:2,w:4,d:3,h:72,name:"화폐본부",top:"#f4d061",side1:"#d3ad39",side2:"#e1bd48",sign:"#196da8",type:"work",reward:120},
  {x:20,y:4,w:4,d:3,h:67,name:"제지본부",top:"#e8f3ed",side1:"#6aa879",side2:"#88bd94",sign:"#358b54",type:"work",reward:120},
  {x:3,y:13,w:4,d:3,h:65,name:"ID본부",top:"#a8d7ee",side1:"#3e8eb8",side2:"#65a7c8",sign:"#2676b2",type:"work",reward:130},
  {x:20,y:14,w:4,d:4,h:78,name:"기술연구원",top:"#b8e8e0",side1:"#5aa69b",side2:"#7fc0b7",sign:"#2877b0",type:"work",reward:160},
  {x:11,y:13,w:3,d:3,h:42,name:"씨앗상점",top:"#f9e0b1",side1:"#ba7d3f",side2:"#d29a5b",sign:"#3d9d61",type:"shop"}
 );
 for(const b of buildings)interactables.push({x:b.x+b.w/2,y:b.y+b.d+.8,r:2,label:b.name,type:b.type,data:b});
 let n=0;for(let r=0;r<3;r++)for(let c=0;c<4;c++){let p={x:28+c*1.6,y:7+r*1.6,index:n++};plots.push(p);interactables.push({x:p.x,y:p.y,r:1.15,label:`밭 ${p.index+1}`,type:"plot",data:p});}
 for(let i=0;i<45;i++){const x=1+(i*7%34),y=1+(i*11%21);if(!onRoad(x,y)&&!(x>27&&x<35&&y>5&&y<13))decorative.push({type:"tree",x,y,s:.65+(i%4)*.09});}
 for(let i=0;i<14;i++)decorative.push({type:"lamp",x:7+i*1.7,y:11.2});
}
function onRoad(x,y){return (y>9&&y<12)||(x>15&&x<18)||(y>18&&y<20)||(x>26&&x<28);}
initWorld();
function drawWorld(){
 ctx.fillStyle="#bce2f0";ctx.fillRect(0,0,W,H);
 // sky haze
 const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#bfe8f6");g.addColorStop(.45,"#dff3e4");g.addColorStop(1,"#86bb60");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 for(let y=0;y<24;y++)for(let x=0;x<36;x++){let c=((x+y)&1)?colors.grass:colors.grass2;if(onRoad(x+.5,y+.5))c=colors.road;if(x>8&&x<15&&y>18)c=colors.water;if((x>27&&x<35&&y>5&&y<13))c="#7fb957";diamond(x,y,c);}
 // sidewalks
 for(let x=0;x<36;x++){diamond(x,8.8,colors.walk);diamond(x,12.2,colors.walk);diamond(x,17.8,colors.walk);diamond(x,20.2,colors.walk);}
 for(let y=0;y<24;y++){diamond(14.8,y,colors.walk);diamond(18.2,y,colors.walk);diamond(25.8,y,colors.walk);diamond(28.2,y,colors.walk);}
 // road lines
 ctx.strokeStyle="#f7d447";ctx.lineWidth=3*camera.zoom;ctx.setLineDash([13*camera.zoom,12*camera.zoom]);let a=iso(0,10.5),b=iso(36,10.5);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();a=iso(16.5,0);b=iso(16.5,24);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
 bridge(9,18,6,2);bridge(13,18,3,2);
 for(const d of decorative){if(d.type==="tree")tree(d.x,d.y,d.s);else lamp(d.x,d.y);}
 buildings.slice().sort((a,b)=>(a.x+a.y)-(b.x+b.y)).forEach(building);
 // farm plots
 plots.forEach(p=>{prism(p.x-.6,p.y-.45,1.2,.9,5,"#70431f","#4b2b15","#5b351b");const f=state.farm[p.index];if(f.seed){const growth=Math.min(1,(Date.now()-f.plantedAt)/f.growMs);const pp=iso(p.x,p.y,10+growth*18);ctx.font=`${(17+growth*7)*camera.zoom}px serif`;ctx.textAlign="center";ctx.fillText(seeds[f.seed].emoji,pp.x,pp.y);}});
 // moving vehicles and boat
 const t=performance.now()/1000;car((t*2.2)%35,10.5,"#ec4b3f",1);car(35-(t*1.6)%35,19,"#2f78c4",-1);boat(10.5+(Math.sin(t*.45)+1)*1.5,19);
 drawPlayer();
}
function drawPlayer(){
 const p=iso(state.player.x,state.player.y,5);const img=images[state.character];if(!img)return;
 const baseH=(state.character==="daim"?150:168)*camera.zoom,ratio=img.width/img.height,baseW=baseH*ratio;
 ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=.25;ctx.fillStyle="#132818";ctx.beginPath();ctx.ellipse(0,5,baseW*.38,baseW*.16,0,0,7);ctx.fill();ctx.globalAlpha=1;
 const moving=Math.hypot(joy.x,joy.y)>0.05||keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight||keys.w||keys.a||keys.s||keys.d;
 const bob=moving?Math.sin(performance.now()*.014)*2.2:0;ctx.drawImage(img,-baseW/2,-baseH+bob,baseW,baseH);ctx.restore();
}
function update(dt){
 if(!started)return;
 let dx=joy.x+(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),dy=joy.y+(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);
 const len=Math.hypot(dx,dy);if(len>.05){dx/=Math.max(1,len);dy/=Math.max(1,len);let sp=state.player.speed*(run||keys.Shift?1.65:1)*(state.character==="sunsik"?1.15:1);let nx=state.player.x+(dx+dy)*sp*dt,ny=state.player.y+(dy-dx)*sp*dt;
 if(nx>.5&&nx<35.5&&ny>.5&&ny<23.5&&!blocked(nx,ny)){state.player.x=nx;state.player.y=ny;}}
 const pp=iso(state.player.x,state.player.y);camera.x+=(W*.5-pp.x-camera.x)*Math.min(1,dt*2.3);camera.y+=(H*.46-pp.y-camera.y)*Math.min(1,dt*2.3);
 let near=getNear();if(near){ui("interactionHint").textContent=`${near.label} · 상호작용`;ui("interactionHint").classList.add("show")}else ui("interactionHint").classList.remove("show");
 updateZone();updateUI();
}
function blocked(x,y){for(const b of buildings)if(x>b.x-.25&&x<b.x+b.w+.25&&y>b.y-.25&&y<b.y+b.d+.25)return true;return false;}
function getNear(){let best=null,dist=99;for(const i of interactables){let d=Math.hypot(state.player.x-i.x,state.player.y-i.y);if(d<i.r&&d<dist){best=i;dist=d}}return best;}
function interact(){const n=getNear();if(!n){toast("입구나 밭 가까이 이동하세요.");return}if(n.type==="work")doWork(n.data);if(n.type==="shop")openShop();if(n.type==="plot")usePlot(n.data.index);}
function doWork(b){const key=buildings.filter(x=>x.type==="work").indexOf(b);if(state.quests[0]&&Math.random()<.5){toast("오늘 업무는 이미 충분히 수행했습니다.");return}let reward=Math.round(b.reward*(state.character==="daim"?1.2:1));state.gold+=reward;state.level=1+Math.floor((state.gold+state.harvest*80)/900);state.quests[0]=true;toast(`${b.name} 업무 완료! +${reward}G`);save();}
function openShop(){let html="<h2>🌱 씨앗상점</h2><p>업무로 번 골드로 씨앗을 구매하세요.</p><div class='shop-grid'>";for(const [id,s] of Object.entries(seeds))html+=`<div class="item"><h3>${s.emoji} ${s.name}</h3><p>${s.price}G · ${Math.round(s.grow/1000)}초 성장</p><button data-buy="${id}">구매</button></div>`;html+="</div>";openModal(html);document.querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>buySeed(b.dataset.buy));}
function buySeed(id){const s=seeds[id];if(state.gold<s.price){toast("골드가 부족합니다.");return}state.gold-=s.price;state.inventory[id]++;state.seeds++;state.quests[1]=true;toast(`${s.name} 씨앗 구매 완료`);openShop();save();}
function usePlot(i){const f=state.farm[i];if(!f.seed){const available=Object.keys(seeds).filter(k=>state.inventory[k]>0);if(!available.length){toast("가방에 씨앗이 없습니다.");return}let html="<h2>밭에 심을 씨앗 선택</h2><div class='shop-grid'>";for(const id of available)html+=`<div class="item"><h3>${seeds[id].emoji} ${seeds[id].name}</h3><p>보유 ${state.inventory[id]}개</p><button data-plant="${id}">심기</button></div>`;html+="</div>";openModal(html);document.querySelectorAll("[data-plant]").forEach(b=>b.onclick=()=>plant(i,b.dataset.plant));return}
 const elapsed=Date.now()-f.plantedAt;if(elapsed<f.growMs){toast(`성장 중 · ${Math.ceil((f.growMs-elapsed)/1000)}초 남음`);return}
 const s=seeds[f.seed];state.gold+=s.reward;state.harvest++;state.quests[3]=true;state.farm[i]={seed:null,plantedAt:0,growMs:0};toast(`${s.name} 수확! +${s.reward}G`);save();}
async function serverNow(){try{const r=await fetch("./api/time");if(r.ok){const j=await r.json();return j.now}}catch{}return Date.now();}
async function plant(i,id){state.inventory[id]--;state.seeds--;state.farm[i]={seed:id,plantedAt:await serverNow(),growMs:seeds[id].grow};state.quests[2]=true;closeModal();toast(`${seeds[id].name}을 심었습니다.`);save();}
function updateZone(){const p=state.player;let z="중앙광장";if(p.x>26)z="주말농장";else if(p.y>17)z="강변 산책로";else{const n=getNear();if(n)z=n.label}ui("zoneText").textContent=z;}
function updateUI(){ui("goldText").textContent=state.gold;ui("seedText").textContent=state.seeds;ui("harvestText").textContent=state.harvest;ui("levelText").textContent=state.level;const q=["회사 본부에서 업무 수행","씨앗상점에서 씨앗 구매","주말농장 밭에 씨앗 심기","다 자란 작물 수확"];ui("questList").innerHTML=q.map((x,i)=>`<li class="${state.quests[i]?"done":""}">${x}</li>`).join("");}
function openBag(){let html="<h2>🎒 가방</h2><div class='inventory-grid'>";for(const [id,s] of Object.entries(seeds))html+=`<div class=item><h3>${s.emoji} ${s.name} 씨앗</h3><b>${state.inventory[id]}개</b></div>`;html+=`<div class=item><h3>📦 수확물</h3><b>${state.harvest}개</b></div></div>`;openModal(html);}
function openMap(){openModal(`<h2>🗺️ 도시 지도</h2><div class="map-preview"></div><p>서쪽에는 본부와 강변, 동쪽에는 주말농장이 있습니다. 도로와 인도는 모든 주요 시설로 연속 연결됩니다.</p>`);}
function openSettings(){openModal(`<h2>⚙️ 설정</h2><div class=item><label>화면 배율 <input id="zoomRange" type="range" min=".7" max="1.25" step=".05" value="${camera.zoom}"></label></div><div class=item><button id="resetSave">게임 데이터 초기화</button></div>`);ui("zoomRange").oninput=e=>camera.zoom=+e.target.value;ui("resetSave").onclick=()=>{localStorage.removeItem("komscoIsoSave");location.reload()};}
function openModal(html){ui("modalBody").innerHTML=html;ui("modal").classList.add("show")}function closeModal(){ui("modal").classList.remove("show")}
function toast(s){ui("toast").textContent=s;ui("toast").classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>ui("toast").classList.remove("show"),1800)}
function save(){localStorage.setItem("komscoIsoSave",JSON.stringify(state))}
function load(){try{const s=JSON.parse(localStorage.getItem("komscoIsoSave"));if(s)Object.assign(state,s)}catch{}}
function loop(now){const dt=Math.min(.04,(now-last)/1000);last=now;update(dt);drawWorld();requestAnimationFrame(loop)}
function loadAssets(){let done=0;return Promise.all(Object.entries(chars).map(([id,c])=>new Promise(res=>{const im=new Image();im.src=`./assets/characters/${c.img}`;im.onload=()=>{images[id]=im;done++;ui("loadBar").style.width=(done/3*100)+"%";res()};im.onerror=()=>res()})))}
function buildCharacterCards(){ui("characterCards").innerHTML=Object.entries(chars).map(([id,c])=>`<article class="character-card" data-char="${id}"><img src="./assets/characters/${c.img}" alt="${c.name}"><h3>${c.name}</h3><b>${c.role}</b><p>${c.desc}</p></article>`).join("");document.querySelectorAll(".character-card").forEach(el=>el.onclick=()=>{selected=el.dataset.char;document.querySelectorAll(".character-card").forEach(x=>x.classList.toggle("selected",x===el));ui("startBtn").disabled=false});}
addEventListener("keydown",e=>{keys[e.key]=true;if(e.key==="e"||e.key==="Enter")interact()});addEventListener("keyup",e=>keys[e.key]=false);
canvas.addEventListener("wheel",e=>{camera.zoom=Math.max(.65,Math.min(1.25,camera.zoom-e.deltaY*.0005))},{passive:true});
let drag=null;canvas.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse")drag={x:e.clientX,y:e.clientY}});canvas.addEventListener("pointermove",e=>{if(drag){camera.x+=e.clientX-drag.x;camera.y+=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY}}});addEventListener("pointerup",()=>drag=null);
const joyEl=ui("joystick"),stick=ui("stick");function joyMove(e){const r=joyEl.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),m=Math.min(38,Math.hypot(x,y)),a=Math.atan2(y,x);joy.x=Math.cos(a)*m/38;joy.y=Math.sin(a)*m/38;stick.style.transform=`translate(${joy.x*32}px,${joy.y*32}px)`}joyEl.onpointerdown=e=>{joyEl.setPointerCapture(e.pointerId);joyMove(e)};joyEl.onpointermove=e=>{if(joyEl.hasPointerCapture(e.pointerId))joyMove(e)};joyEl.onpointerup=()=>{joy={x:0,y:0};stick.style.transform=""};
ui("runBtn").onpointerdown=()=>run=true;ui("runBtn").onpointerup=()=>run=false;ui("interactBtn").onclick=interact;ui("bagBtn").onclick=openBag;ui("mapBtn").onclick=openMap;ui("settingsBtn").onclick=openSettings;ui("questBtn").onclick=()=>ui("questPanel").classList.toggle("closed");ui("questToggle").onclick=()=>ui("questPanel").classList.toggle("closed");ui("modalClose").onclick=closeModal;ui("modal").onclick=e=>{if(e.target===ui("modal"))closeModal()};
ui("startBtn").onclick=()=>{state.character=selected;started=true;ui("characterSelect").classList.remove("show");save();toast(`${chars[selected].name}과 함께 도시 생활을 시작합니다.`)};
(async()=>{load();buildCharacterCards();await loadAssets();setTimeout(()=>{ui("loading").classList.remove("show");ui("characterSelect").classList.add("show")},350);updateUI();requestAnimationFrame(loop)})();
})();
