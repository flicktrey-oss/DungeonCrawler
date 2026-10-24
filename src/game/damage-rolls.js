import {attack,defense,gearBonus} from './items.js';
// Roll offsets, not extra turns or critical hits. Unarmed attacks stay reliable.
export const DAMAGE_PROFILES={unarmed:[0,0],sword:[-1,1],spear:[-1,0],axe:[-2,2],projectile:[-1,1]};
export function weaponProfile(weapon){
 if(!weapon)return 'unarmed';
 if(Object.hasOwn(DAMAGE_PROFILES,weapon.weaponType))return weapon.weaponType;
 return /axe|hatchet|cleaver/i.test(weapon.name)?'axe':/spear/i.test(weapon.name)?'spear':'sword';
}
export function offenseRange(power,profile='unarmed'){
 const [low,high]=Object.hasOwn(DAMAGE_PROFILES,profile)?DAMAGE_PROFILES[profile]:DAMAGE_PROFILES.unarmed;
 return [Math.max(1,power+low),Math.max(1,power+high)];
}
export function rollOffense(rng,power,profile){const [min,max]=offenseRange(power,profile);return min===max?min:rng.int(min,max);}
export function enemyOffenseRange(enemy){return [Math.max(1,enemy.attack-1),enemy.attack+(enemy.attack<=3?0:1)];}
export function rollEnemyOffense(rng,enemy){const [min,max]=enemyOffenseRange(enemy);return min===max?min:rng.int(min,max);}
export const playerOffenseRange=p=>offenseRange(attack(p),weaponProfile(p.weapon));
export const rangeLabel=range=>range[0]===range[1]?String(range[0]):`${range[0]}–${range[1]}`;
export const damageAfterDefense=(range,protection)=>range.map(value=>Math.max(1,value-protection));
export function incomingRange(enemy,player,special=false){return damageAfterDefense(enemyOffenseRange(enemy),defense(player)+(special?gearBonus(player,'wardedBonus'):0));}
export function itemDamageDescription(player,item){
 if(item?.kind==='weapon')return `Damage ${rangeLabel(playerOffenseRange({...player,weapon:item}))} before enemy defense.`;
 if(['stone','knife'].includes(item?.kind))return `Damage ${rangeLabel(offenseRange(item.projectileDamage??2,'projectile'))} before enemy defense.`;
 return '';
}
