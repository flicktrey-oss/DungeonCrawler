import {isEquipment} from './items.js';
export const GEAR_TIERS=['Worn','Field','Forged','Runic'];
export const dangerTier=danger=>danger>=9?4:danger>=6?3:danger>=3?2:1;
export function gearTier(item){return item?.tier??(['gambeson','reedShield','softstep','hunterRing','moonRing','waystone'].includes(item?.id)?2:1);}
// Distinct silhouettes and weapon families, with modest steps in raw power.
export function regionalGear(kind,tier){
 const t=Math.max(2,Math.min(4,tier));
 const names={weapon:['Marshwarden sword','Ridgeforged sword','Embersteel sword'],spear:['Reedsteel spear','Cairn pike','Cinder lance'],armor:['Mirehide coat','Riveted hauberk','Embersteel cuirass'],boots:['Marshwalk boots','Ridgeguard boots','Ashguard greaves']};
 const weapon=['weapon','spear'].includes(kind);
 return {id:`regional-${kind}-${t}`,kind:weapon?'weapon':kind,tier:t,name:names[kind][t-2],bonus:weapon?t-(kind==='spear'?1:0):kind==='armor'?t:0,...(weapon?{weaponType:kind==='spear'?'spear':'sword',...(kind==='spear'?{reach:2}:{})}:kind==='boots'?{defenseBonus:t-1,stealthBonus:1}:{}),size:weapon?[7,2]:kind==='armor'?[4,4]:[2,2],sellValue:t*5,appearance:[0,0,0x729483,0xa4acb4,0xb98866][t],description:weapon?(kind==='spear'?'Reach 2.':'Countercut +1 against winding-up foes.'):kind==='boots'?'Armored boots.':'Protective body armor.'};
}
export function equipmentSummary(item){
 if(!isEquipment(item))return item?.description??'';
 const bits=[`Tier ${gearTier(item)} · ${GEAR_TIERS[gearTier(item)-1]}`];
 if(item.enhancement)bits.push(`Enhanced +${item.enhancement}`);
 const atk=(item.kind==='weapon'?item.bonus??0:0)+(item.attackBonus??0),def=(['armor','amulet'].includes(item.kind)?item.bonus??0:0)+(item.defenseBonus??0);
 if(atk)bits.push(`+${atk} attack`);if(def)bits.push(`+${def} protection`);
 if(item.reach>=2)bits.push('Reach 2');else if(item.kind==='weapon'&&item.weaponType!=='axe')bits.push('Countercut +1');
 if(item.weaponType==='axe')bits.push('Pierces 1 armor (2 vs heavy armor)');
 if(item.blockChance)bits.push(`${Math.round(Math.min(.6,item.blockChance+(item.blockBonus??0))*100)}% block${item.rangedBlock?` · ${Math.round(Math.min(.6,item.rangedBlock+(item.blockBonus??0))*100)}% ranged`:''}`);
 for(const [field,label,scale]of [['wardedBonus','special protection',1],['maxManaBonus','max Mana',1],['manaBonus','Mana/turn',1],['sightBonus','sight',1],['visionBonus','Mind Vision turn',1],['healBonus','% healing',100],['isolatedBonus','damage vs lone foes',1]])if(item[field])bits.push(`+${item[field]*scale}${label.startsWith('%')?'':' '}${label}`);
 if(item.stealthBonus)bits.push(`Detection −${item.stealthBonus}`);if(item.bleedBonus)bits.push('Bleed 1 for 2 turns');if(item.lastLight)bits.push('Survive one fatal hit');
 return bits.join(' · ')+'.';
}
