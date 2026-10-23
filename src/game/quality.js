import {enemyTypes} from './combat.js';
import {attack,defense,rawDefense,gearBonus,recovery,shieldChance,slotsFor,equippedSlot,consumableKinds,isProjectile} from './items.js';
export const itemKey=i=>i?`${i.kind}:${i.name}`:null;
export function assignQuick(g,slot,index){if(!Number.isInteger(slot)||slot<0||slot>2||!g.state.player.inventory[index])return false;const item=g.state.player.inventory[index];g.quickSlots[slot]={key:itemKey(item),item:slotsFor(item).length?item:null};return true;}
export const quickItem=(g,slot)=>{const pin=g.quickSlots[slot];return pin?.item?g.state.player.inventory.find(i=>i===pin.item):g.state.player.inventory.find(i=>itemKey(i)===pin?.key);};
export const quickMatches=(g,slot,item)=>slotsFor(item).length?g.quickSlots[slot]?.item===item:g.quickSlots[slot]?.key===itemKey(item);
export function quickAction(g,slot){const item=quickItem(g,slot);if(!item)return null;const index=g.state.player.inventory.indexOf(item),equipped=equippedSlot(g.state.player,item);return equipped&&item.reach>=2?{type:'targetReach'}:equipped?{type:'unequip',slot:equipped}:isProjectile(item)?{type:'targetThrow',index}:consumableKinds.includes(item.kind)?{type:'use',index}:slotsFor(item).length?{type:'equip',index}:{type:'inspectItem',index};}
export function compareEquipment(p,item,chosen){
 const slot=chosen??slotsFor(item).find(s=>!p[s])??slotsFor(item)[0];if(!slot||!slotsFor(item).includes(slot)||equippedSlot(p,item))return '';
 const preview={...p,[slot]:item},stats=[['ATK',attack],['DEF',defense],['Raw protection',rawDefense],['Melee block',p=>Math.round(shieldChance(p)*100)],['Ranged block',p=>Math.round(shieldChance(p,true)*100)],['Reach',p=>p.weapon?.reach??1],['Max Mana',p=>100+gearBonus(p,'maxManaBonus')],['Mana/turn',recovery],['Stealth',p=>gearBonus(p,'stealthBonus')],['Special protection',p=>gearBonus(p,'wardedBonus')]];
 const changes=stats.filter(([,fn])=>fn(p)!==fn(preview)).map(([name,fn])=>`${name} ${fn(p)} → ${fn(preview)}`);
 return `${slot}: replaces ${p[slot]?.name??'empty slot'}. ${changes.join(' · ')||'No numeric stat changes.'} ${p[slot]?`Old effect: ${p[slot].description}`:''} New effect: ${item.description}`;
}
export function cookAll(g){let count=0,reason='';while(g.state.status==='playing'&&g.atCampfire()&&count<1000){const item=g.state.player.inventory.find(i=>['rawMeat','rawRatMeat'].includes(i.kind));if(!item)break;if(!g.action({type:'cook',kind:item.kind})){reason=g.state.log.at(-1);break;}count++;}g.message(`Cooked ${count} piece${count===1?'':'s'}. ${reason||'One turn per piece.'}`);return count;}
export const creatureIndexKey=e=>e.miniboss?`${e.kind}:${e.miniboss}`:e.kind;
export function recordDiscovery(g){
 if(!g.creatureIndex)return;
 for(const e of g.state.enemies)if(e.hp>0&&g.state.visible.has(`${e.x},${e.y}`)){
  const id=creatureIndexKey(e),old=g.creatureIndex.get(id);
  g.creatureIndex.set(id,{name:e.miniboss?e.name:enemyTypes[e.kind]?.name??e.name,kind:e.kind,miniboss:e.miniboss,biomes:[...new Set([...(old?.biomes??[]),g.state.biome])],kills:old?.kills??0});
 }
}
