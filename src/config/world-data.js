window.KOMSCO=window.KOMSCO||{};
window.KOMSCO.WORLD={
  roadWidth:4.6,
  nodes:{
    /* Main roads - all nodes sit on visible asphalt */
    A:[8,79], B:[18,69], C:[30,73], D:[41,68], E:[52,60],
    F:[63,54], G:[74,47], H:[87,42], I:[92,58], J:[82,69],
    K:[69,78], L:[55,84], M:[39,85], N:[23,82],

    O:[13,57], P:[25,52], Q:[38,54], R:[50,48], S:[62,40],
    T:[75,33], U:[88,27],

    /* Building entrance road points */
    HQ:[22,44],
    MINT:[42,42],
    PAPER:[70,39],
    ID:[25,59],
    SHOP:[16,67],
    FARM:[58,88],
    LAB:[87,31]
  },
  edges:[
    /* Outer road loop */
    ["A","B"],["B","C"],["C","D"],["D","E"],["E","F"],["F","G"],
    ["G","H"],["H","I"],["I","J"],["J","K"],["K","L"],["L","M"],
    ["M","N"],["N","A"],

    /* Inner roads */
    ["B","O"],["O","P"],["P","Q"],["Q","R"],["R","S"],["S","T"],
    ["T","U"],["U","H"],["C","M"],["D","L"],["E","K"],

    /* Bridge-only road links */
    ["F","J"],["G","I"],

    /* Entrance access roads */
    ["P","HQ"],["Q","MINT"],["T","PAPER"],["P","ID"],["O","SHOP"],
    ["L","FARM"],["U","LAB"]
  ],
  bridgeEdges:["F-J","G-I"],
  waterZones:[{x:67,y:24,w:31,h:57}],
  buildings:[
    {x:7,y:7,w:23,h:28,label:"본사"},
    {x:34,y:7,w:25,h:34,label:"화폐본부"},
    {x:58,y:18,w:22,h:29,label:"제지본부"},
    {x:17,y:37,w:18,h:24,label:"ID본부"},
    {x:4,y:58,w:20,h:24,label:"씨앗상점"},
    {x:70,y:55,w:29,h:39,label:"주말농장"},
    {x:77,y:4,w:21,h:23,label:"기술연구원"}
  ],
  hotspots:[
    {node:"HQ",x:22,y:44,r:6.5,label:"본사",type:"work",reward:150},
    {node:"MINT",x:42,y:42,r:6.5,label:"화폐본부",type:"work",reward:170},
    {node:"PAPER",x:70,y:39,r:6.5,label:"제지본부",type:"work",reward:130},
    {node:"ID",x:25,y:59,r:6.5,label:"ID본부",type:"work",reward:140},
    {node:"SHOP",x:16,y:67,r:6.5,label:"씨앗상점",type:"shop"},
    {node:"FARM",x:58,y:88,r:7.5,label:"주말농장",type:"farm"},
    {node:"LAB",x:87,y:31,r:6.5,label:"기술연구원",type:"work",reward:160}
  ],
  farmPlots:[
    [76.5,67.5],[80.5,67.0],[84.5,66.5],[88.5,66.0],
    [76.0,72.0],[80.0,71.5],[84.0,71.0],[88.0,70.5]
  ]
};