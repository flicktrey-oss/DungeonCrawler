export const damage = (attack, defense) => Math.max(1, attack-defense);
export const enemyTypes = {
  rabbit:{name:'Bramble rabbit',hp:4,attack:2,defense:0,xp:2,range:3},
  rat:{name:'Brush rat',hp:5,attack:3,defense:0,xp:2,range:4},
  beetle:{name:'Sap beetle',hp:7,attack:2,defense:0,xp:2,range:4,slow:true},
  pondFrog:{name:'Troublesome frog',hp:6,attack:3,defense:0,xp:2,range:4},
  frog:{name:'Mire frog',hp:16,attack:7,defense:1,xp:3,range:5},
  elite:{name:'Old Bristleback',hp:22,attack:6,defense:1,xp:6,range:5},
  goat:{name:'Ridge ram',hp:22,attack:9,defense:2,xp:5,range:6},
  ashling:{name:'Cinder revenant',hp:40,attack:19,defense:5,xp:8,range:7},
  wolf:{name:'Briar wolf',hp:12,attack:6,defense:0,xp:8,range:7},
  boar:{name:'Ironhide boar',hp:17,attack:7,defense:1,xp:11,range:5},
  leech:{name:'Marsh leech',hp:11,attack:6,defense:1,xp:8,range:6},
  guardian:{name:'Crypt Warden',hp:34,attack:9,defense:2,xp:30,range:8},
  slime:{name:'Mire slime',hp:7,attack:3,defense:0,xp:5,range:5,slow:true},
  skeleton:{name:'Bone sentinel',hp:11,attack:5,defense:1,xp:8,range:7},
  goblin:{name:'Cinder goblin',hp:9,attack:6,defense:0,xp:7,range:8},
  boss:{name:'The Ash Warden',hp:48,attack:10,defense:3,xp:50,range:30}
};
