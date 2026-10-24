import {regionalGear} from './gear-progression.js';
import {enemyTypes} from './combat.js';
import {modifyItem} from './loot.js';
import {trailBoots,trailSpear,reedShield,hatchet} from './items.js';
export const MINIBOSSES={
 bristleback:{name:'Old Bristleback',kind:'elite',hp:26,attack:8,defense:1,xp:12,territory:'Bristleback territory',description:'Bristleback rush · marks a straight charge lane, then rushes. Sidestep and strike during its recovery. Hunting weapons and boots in its hoard.'},
 reedmaw:{name:'Reedmaw, the Pond Sovereign',kind:'frog',hp:30,attack:8,defense:1,xp:18,territory:'Reedmaw’s pool',description:'Royal tongue · marks a three-tile cardinal line. Sidestep the pink tiles. Every lash leaves one action of recovery. Its hoard favors spears and marsh shields.'},
 cairn:{name:'Cairnhorn, the Ridge Keeper',kind:'goat',hp:42,attack:12,defense:4,xp:26,territory:'Cairnhorn’s ring',description:'Stone stomp · marks all eight neighboring tiles. Retreat two tiles away or use reach. One recovery action follows. Its hoard favors armor and protection.'}
};
export function denEnemy(biome,p,danger,id){
 const miniboss=biome==='forest'?'bristleback':biome==='marsh'?'reedmaw':'cairn',profile=MINIBOSSES[miniboss],extra=Math.max(0,danger-1);
 return {...enemyTypes[profile.kind],...profile,...p,kind:profile.kind,miniboss,id,hp:profile.hp+extra*2,maxHp:profile.hp+extra*2,attack:profile.attack+Math.floor(extra/2),actions:0,territory:{x:p.x,y:p.y,radius:5,name:profile.territory}};
}
export function minibossReward(rng,miniboss){
 const pool={bristleback:[hatchet,trailBoots,trailSpear],reedmaw:[()=>regionalGear('spear',2),()=>regionalGear('armor',2),reedShield],cairn:[()=>regionalGear('armor',3),()=>regionalGear('weapon',3),()=>regionalGear('boots',3)]}[miniboss]??[trailBoots];
 const item=rng.pick(pool)();item.id??=item.weaponType==='spear'?'spear':undefined;return modifyItem(item,rng,'miniboss');
}
export const creatureAbility=enemy=>MINIBOSSES[enemy.miniboss]?.description;
