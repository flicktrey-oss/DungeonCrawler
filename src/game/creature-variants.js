import {Random} from './random.js';
import {regionSeed} from './world.js';
import {trailDistance} from './marsh.js';
export const VARIANTS={
 veteran:{label:'Veteran',color:0xe2b968,description:'Veteran · extra health and +1 attack. Awards 50% more XP and improved ordinary loot odds.'},
 armored:{label:'Armored',color:0x9cbad3,description:'Armored · +1 defense, +2 health. Ordinary actions happen every other turn; prepared attacks still resolve next turn. Awards 50% more XP and improved ordinary loot odds.'},
 stalker:{label:'Stalker',color:0xe79992,description:'Stalker · marks a two-tile lunge before striking. Sidestep the orange lane, then attack during its recovery. Awards 50% more XP; animals still drop only meat.'}
};
export function applyVariant(e,type){
 if(e.variant||!VARIANTS[type])return e;
 e.variant=type;e.baseCreatureName=e.name;e.name=`${VARIANTS[type].label} ${e.name}`;
 const hp=type==='veteran'?Math.min(6,Math.max(2,Math.ceil(e.maxHp*.2))):2;e.hp+=hp;e.maxHp+=hp;
 if(type==='veteran')e.attack++;
 if(type==='armored'){e.defense++;e.slow=true;}
 if(type==='stalker')e.range++;
 e.xp=Math.ceil(e.xp*1.5);return e;
}
export function applyWorldVariants(g,data){
 if(data.home||data.city||data.variantsPrepared)return;data.variantsPrepared=true;
 const rng=new Random(regionSeed(g.state.seed,data.rx,data.ry,'creature-variants'));
 if(rng.next()>(data.biome==='forest'?.7:.6))return;
 const candidates=data.enemies.filter(e=>e.hp>0&&!e.variant&&!e.miniboss&&!e.eventId&&!e.questKey&&!e.questId&&!e.habitatId&&!e.foothill&&e.kind!=='rabbit'&&trailDistance(e)>=4);
 if(!candidates.length)return;const enemy=rng.pick(candidates),pool=['veteran','armored',...(['rat','wolf'].includes(enemy.kind)?['stalker']:[])];applyVariant(enemy,rng.pick(pool));
}
export function drawVariantMark(g,e,tile){
 if(!e.variant)return;const x=e.x*tile+17,y=e.y*tile+2;g.fillStyle(0x101b21);g.fillRect(x-1,y-1,8,9);g.fillStyle(VARIANTS[e.variant].color);
 if(e.variant==='veteran'){g.fillRect(x,y+3,2,3);g.fillRect(x+3,y,2,6);}
 else if(e.variant==='armored'){g.fillRect(x,y,6,4);g.fillTriangle(x,y+4,x+6,y+4,x+3,y+7);}
 else{g.fillTriangle(x,y,x+3,y+3,x,y+6);g.fillTriangle(x+3,y,x+6,y+3,x+3,y+6);}
}
