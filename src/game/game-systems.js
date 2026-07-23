window.KOMSCO = window.KOMSCO || {};
window.KOMSCO.GameSystems = {
  characters:{
    hunmin:{name:"훈민",role:"전략가",img:"hunmin.png",speed:1,reward:1},
    daim:{name:"다임",role:"정보 탐색관",img:"daim.png",speed:1,reward:1.2},
    sunsik:{name:"순식",role:"호위무사",img:"sunsik.png",speed:1.15,reward:1}
  },
  seeds:{
    carrot:{name:"당근",emoji:"🥕",price:60,grow:45000,reward:120},
    tomato:{name:"토마토",emoji:"🍅",price:90,grow:70000,reward:190},
    strawberry:{name:"딸기",emoji:"🍓",price:130,grow:100000,reward:300}
  },
  newState(){
    return {
      gold:300,seeds:0,harvest:0,level:1,character:"hunmin",
      player:{x:50,y:36.6,speed:15,dir:1},
      inventory:{carrot:0,tomato:0,strawberry:0},
      quests:[false,false,false,false],
      farm:Array.from({length:12},()=>({seed:null,plantedAt:0,growMs:0}))
    };
  }
};