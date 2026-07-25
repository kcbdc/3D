window.KOMSCO = window.KOMSCO || {};
window.KOMSCO.GameSystems = {
  characters:{
    hunmin:{name:"훈민",role:"전략가",img:"hunmin.png",speed:1,reward:1},
    daim:{name:"다임",role:"정보 탐색관",img:"daim.png",speed:1,reward:1.2},
    sunsik:{name:"순식",role:"호위무사",img:"sunsik.png",speed:1.15,reward:1}
  },
  // 12종 (2D 버전 cropsData 참고: growthTime(단위)을 11250ms/단위로 환산해 기존 당근(45000ms=4단위)과 맞춤)
  seeds:{
    potato:{name:"감자",emoji:"🥔",price:40,grow:45000,reward:100},
    carrot:{name:"당근",emoji:"🥕",price:48,grow:56250,reward:120},
    sweetpotato:{name:"고구마",emoji:"🍠",price:80,grow:78750,reward:200},
    tomato:{name:"토마토",emoji:"🍅",price:100,grow:90000,reward:250},
    corn:{name:"옥수수",emoji:"🌽",price:124,grow:112500,reward:310},
    strawberry:{name:"딸기",emoji:"🍓",price:160,grow:135000,reward:400},
    watermelon:{name:"수박",emoji:"🍉",price:200,grow:168750,reward:500},
    pumpkin:{name:"호박",emoji:"🎃",price:224,grow:191250,reward:560},
    apple:{name:"사과나무",emoji:"🌳",price:400,grow:281250,reward:1000},
    coconut:{name:"코코넛나무",emoji:"🌴",price:1000,grow:393750,reward:2500},
    orange:{name:"오렌지나무",emoji:"🌳",price:400,grow:281250,reward:1000},
    pineapple:{name:"파인애플",emoji:"🍍",price:1600,grow:506250,reward:4000}
  },
  // 농장 도구 및 업그레이드 (2D 버전 upgradesData 참고). scarecrow는 이 게임엔 까마귀 침입 요소가
  // 없어 "수확 보상 +10%"로 대체 구현.
  upgrades:{
    water:{icon:"💧",name:"골든 물뿌리개",desc:"모든 작물 성장 시간 20% 단축",cost:150},
    scarecrow:{icon:"🌾",name:"허수아비 영웅",desc:"모든 작물 수확 보상 10% 증가",cost:300},
    pet:{icon:"🐶",name:"수확도우미 댕댕이",desc:"다 자란 작물을 자동으로 수확",cost:600}
  },
  // 본부 미션 풀 (2D 버전 MISSION_POOL/RULE_LIST 참고, 간략화된 버전)
  ruleList:[
    "중소기업자간 경쟁제품 우선구매","여성기업제품 우선구매",
    "장애인기업제품 우선구매","녹색제품(친환경) 의무구매",
    "우수조달물품 우선구매","재활용·재제조물품 우선구매"
  ],
  missionPool:{
    HQ:[
      {title:"위변조방지 워터마크 원지 발주",spec:"규격: A0 원단 · 수량: 500롤 · 예산상한 1,200,000원",rule:0,
       options:[
         {text:"조폐공사 표준 인증 워터마크 원지 공급업체",price:1150000,correct:true,reason:"표준 인증서를 보유했고 예산 이내이며 보안 요건을 충족합니다."},
         {text:"무인증 저가 업체 (인증서 없음)",price:800000,correct:false,reason:"품질 미달: 위변조방지 인증이 없습니다."},
         {text:"해외 미인증 업체",price:1400000,correct:false,reason:"예산 초과: 상한액을 넘는 견적입니다."}
       ]},
      {title:"친환경 사무용품 일괄 발주",spec:"규격: 재생용지 등급 1 · 수량: 200박스 · 예산상한 900,000원",rule:3,
       options:[
         {text:"녹색제품 인증 문구업체",price:850000,correct:true,reason:"녹색제품 인증을 보유했고 예산 이내입니다."},
         {text:"미인증 최저가 업체",price:500000,correct:false,reason:"품질 미달: 친환경 인증이 없는 제품입니다."},
         {text:"고가 프리미엄 업체",price:1200000,correct:false,reason:"예산 초과: 상한액을 넘습니다."}
       ]}
    ],
    MINT:[
      {title:"지폐 전용 면섬유 원료 구매",spec:"규격: 순면 펄프 98% 이상 · 수량: 3톤 · 예산상한 2,600,000원",rule:4,
       options:[
         {text:"국산 순면 펄프 전문 공급사 (순도 98.5%)",price:2450000,correct:true,reason:"규격을 충족하는 정품 원료이며 예산 이내입니다."},
         {text:"혼합 펄프 업체 (순도 82%, 저가)",price:1600000,correct:false,reason:"품질 미달: 순면 98% 이상 규격에 미달합니다."},
         {text:"해외 프리미엄 업체",price:2900000,correct:false,reason:"예산 초과: 상한액을 넘습니다."}
       ]},
      {title:"보안잉크 정기 발주",spec:"규격: 조폐공사 표준 보안잉크 · 수량: 50드럼 · 예산상한 1,800,000원",rule:1,
       options:[
         {text:"중소기업 기술인증 보유 업체",price:1700000,correct:true,reason:"기술개발제품 인증을 보유했고 예산 이내입니다."},
         {text:"인증 없는 신생업체",price:1200000,correct:false,reason:"품질 미달: 보안잉크 표준 인증이 없습니다."},
         {text:"대기업 독점 공급사",price:2100000,correct:false,reason:"예산 초과: 상한액을 넘습니다."}
       ]}
    ],
    LAB:[
      {title:"위조식별 연구장비 구매",spec:"규격: 정밀분광분석기 1대 · 예산상한 3,500,000원",rule:5,
       options:[
         {text:"재제조 인증 정밀장비 공급사",price:3300000,correct:true,reason:"재제조 인증을 보유했고 예산 이내입니다."},
         {text:"인증 없는 병행수입 업체",price:2600000,correct:false,reason:"품질 미달: 필요 인증이 없습니다."},
         {text:"미국 직수입 최고급형",price:4200000,correct:false,reason:"예산 초과: 상한액을 넘습니다."}
       ]},
      {title:"우수조달물품 연구소모품 발주",spec:"규격: 실험용 시약 세트 · 수량: 30세트 · 예산상한 700,000원",rule:2,
       options:[
         {text:"여성기업 인증 시약업체",price:650000,correct:true,reason:"여성기업제품 우선구매 대상이며 예산 이내입니다."},
         {text:"인증 없는 최저가 업체",price:400000,correct:false,reason:"품질 미달: 필요 인증서가 없습니다."},
         {text:"해외 수입 프리미엄 세트",price:900000,correct:false,reason:"예산 초과: 상한액을 넘습니다."}
       ]}
    ],
    H2_ID:[
      {title:"신원확인 보안카드 부품 발주",spec:"규격: RFID 보안칩 · 수량: 10,000개 · 예산상한 2,200,000원",rule:0,
       options:[
         {text:"중소기업 경쟁제품 인증 부품업체",price:2050000,correct:true,reason:"중소기업 경쟁제품 인증을 보유했고 예산 이내입니다."},
         {text:"인증 없는 저가 부품업체",price:1400000,correct:false,reason:"품질 미달: 보안칩 관련 인증서가 없습니다."},
         {text:"해외 수입 프리미엄 업체",price:2600000,correct:false,reason:"예산 초과: 상한액을 넘습니다."}
       ]},
      {title:"창업기업 협업 홍보물 제작",spec:"규격: ID본부 홍보 리플렛 · 수량: 5,000부 · 예산상한 600,000원",rule:1,
       options:[
         {text:"창업기업 인증 디자인 스튜디오",price:550000,correct:true,reason:"창업기업제품 우선구매 대상이며 예산 이내입니다."},
         {text:"인증 없는 프리랜서",price:350000,correct:false,reason:"품질 미달: 필요 인증서가 없습니다."},
         {text:"대행사 프리미엄 패키지",price:800000,correct:false,reason:"예산 초과: 상한액을 넘습니다."}
       ]}
    ],
    H2_PAPER:[
      {title:"재생용지 원료 발주",spec:"규격: 재활용 등급 1 · 수량: 2톤 · 예산상한 1,000,000원",rule:5,
       options:[
         {text:"재활용·재제조 인증 원료업체",price:950000,correct:true,reason:"재활용·재제조물품 우선구매 대상이며 예산 이내입니다."},
         {text:"인증 없는 일반 펄프업체",price:600000,correct:false,reason:"품질 미달: 재활용 인증이 없습니다."},
         {text:"해외 프리미엄 원료업체",price:1300000,correct:false,reason:"예산 초과: 상한액을 넘습니다."}
       ]},
      {title:"제지 공정용 친환경 약품 발주",spec:"규격: 무염소 표백제 · 수량: 500L · 예산상한 800,000원",rule:3,
       options:[
         {text:"녹색제품 인증 화학업체",price:760000,correct:true,reason:"녹색제품(친환경) 의무구매 대상이며 예산 이내입니다."},
         {text:"인증 없는 저가 업체",price:450000,correct:false,reason:"품질 미달: 친환경 인증이 없습니다."},
         {text:"수입 프리미엄 업체",price:1050000,correct:false,reason:"예산 초과: 상한액을 넘습니다."}
       ]}
    ]
  },
  newState(){
    return {
      gold:300,seeds:0,harvest:0,level:1,character:"hunmin",
      player:{x:50,y:36.6,speed:17,dir:1},
      inventory:{potato:0,carrot:0,sweetpotato:0,tomato:0,corn:0,strawberry:0,watermelon:0,pumpkin:0,apple:0,coconut:0,orange:0,pineapple:0},
      quests:[false,false,false,false],
      farm:Array.from({length:12},()=>({seed:null,plantedAt:0,growMs:0})),
      upgrades:{water:false,scarecrow:false,pet:false},
      missionIndex:{HQ:0,MINT:0,LAB:0,H2_ID:0,H2_PAPER:0},
      farmDisturbance:{cellIdx:-1,expiresAt:0}
    };
  }
};