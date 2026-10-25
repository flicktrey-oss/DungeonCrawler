import {enemyTypes} from './combat.js';
export function enemyStats(kind,danger,foothill=false){
 const base=enemyTypes[kind],extra=Math.max(0,danger-1);
 if(foothill){const hp=kind==='goat'?16:12;return {name:kind==='goat'?'Ridge yearling':'Lean ridge wolf',hp,maxHp:hp,attack:kind==='goat'?6:5,defense:kind==='goat'?1:0,xp:4,lootDanger:3};}
 return {hp:base.hp+extra*2,maxHp:base.hp+extra*2,attack:base.attack+Math.floor(extra/2),defense:base.defense,xp:({skeleton:3,goblin:3,leech:3,wolf:5,boar:5,guardian:10})[kind]??base.xp,lootDanger:danger};
}
