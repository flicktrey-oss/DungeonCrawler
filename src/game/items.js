export function equipment(kind, floor) {
  const weapon=kind==='weapon';
  return {kind,name:weapon?['Iron knife','Ashwood spear','Vault blade','Runic axe','Dawn cleaver'][floor-1]:['Leather vest','Ringmail','Iron cuirass','Runic mail','Dawn plate'][floor-1],bonus:floor+(weapon?1:0),description:weapon?'Adds attack while equipped.':'Reduces incoming damage while equipped.'};
}
export const potion = () => ({kind:'potion',name:'Ember tonic',description:'Restores 16 health. Using it costs one turn.'});
export const attack = p => p.attack+(p.weapon?.bonus??0)+gearBonus(p,'attackBonus');
export const defense = p => Math.max(0,p.defense+(p.armor?.bonus??0)+(p.amulet?.bonus??0)+gearBonus(p,'defenseBonus')-(p.corrosion>0?1:0));
export const threshold = p => p.level*(p.slowProgression?20:12);

export function travelGear(kind,tier=1) {
  const weapon=kind==='weapon', names=weapon?['Worn shortsword','Iron-tipped spear','Forged falchion','Ember greatsword']:['Patched vest','Reinforced leather','Ridge mail','Ashguard plate'];
  const level=Math.max(1,Math.min(4,tier));
  return {kind,name:names[level-1],bonus:level,...(weapon&&level===2?{reach:2,weaponType:'spear'}:weapon?{weaponType:'sword'}:{}),size:weapon?[7,2]:[4,4],sellValue:level*4,description:`${weapon&&level===2?'+1 Reach (clear cardinal line, 2 tiles). ':''}+${level} ${weapon?'attack':'defense'} while equipped. Takes ${weapon?'7×2':'4×4'} satchel cells.`};
}
export const reedAmulet=()=>({kind:'amulet',name:'Reedheart amulet',bonus:1,size:[2,2],sellValue:12,description:'+1 defense while equipped. A villager’s gratitude, bound in silver reeds.'});
export const trophy=(kind)=>({kind:'trophy',name:kind==='frog'?'Frog pearl':kind==='rat'?'Chipped fang':'Weathered claw',sellValue:kind==='frog'?3:2,size:[1,1],description:'A small hunting trophy. Sell it to Mara at camp.'});

export const shortSword=()=>({...travelGear('weapon',1),name:'Worn shortsword',weaponType:'sword',description:'+1 attack. Reliable adjacent strikes. Main hand; 7×2 cells.'});
export const trailSpear=()=>({kind:'weapon',name:'Trail spear',weaponType:'spear',bonus:0,reach:2,size:[7,2],sellValue:6,description:'+1 Reach: strike 1–2 tiles in a cardinal direction through a clear line. No attack bonus. Main hand; 7×2 cells.'});
export const buckler=()=>({kind:'offhand',name:'Weathered buckler',bonus:0,blockChance:.35,size:[3,3],sellValue:5,description:'Off hand. 35% chance to completely block each incoming attack while equipped. Passive: no action or Mana cost. 3×3 cells.'});
export const throwingStones=(quantity=1)=>({kind:'stone',name:'Throwing stones',quantity,size:[1,1],description:'Throw up to 4 tiles for 2 damage before defense (minimum 1). One stone and one turn; 50% recovery chance. Stacks of 9 occupy 1×1.'});
export const stoneCount=p=>p.inventory.filter(i=>i.kind==='stone').reduce((n,i)=>n+i.quantity,0);
export const salePrice=item=>['stone','knife','thunder'].includes(item.kind)?item.quantity*(item.kind==='knife'?3:item.kind==='thunder'?5:1):item.sellValue??(item.kind==='potion'?3:1);

export const EQUIPMENT_SLOTS=['weapon','offhand','armor','boots','amulet','ring1','ring2'];
export const equipped=p=>EQUIPMENT_SLOTS.map(slot=>p[slot]).filter(Boolean);
export const gearBonus=(p,key)=>equipped(p).reduce((n,item)=>n+(item[key]??0),0);
export const isEquipment=item=>['weapon','offhand','armor','boots','amulet','ring'].includes(item?.kind);
export const slotsFor=item=>item?.kind==='ring'?['ring1','ring2']:isEquipment(item)?[item.kind]:[];
export function recalculateGear(p){p.maxMana=100+gearBonus(p,'maxManaBonus');p.mana=Math.min(p.mana,p.maxMana);}
export const healAmount=(p,base)=>Math.ceil(base*(1+gearBonus(p,'healBonus')));
export const recovery=p=>5+gearBonus(p,'manaBonus');
export const shieldChance=(p,ranged=false)=>Math.min(.6,(ranged?(p.offhand?.rangedBlock??p.offhand?.blockChance??0):(p.offhand?.blockChance??0))+gearBonus(p,'blockBonus'));
export const isProjectile=item=>['stone','knife','thunder'].includes(item?.kind);
export const projectileStack=(p,index)=>index===undefined?p.inventory.find(isProjectile):Number.isInteger(index)&&isProjectile(p.inventory[index])?p.inventory[index]:null;
export const projectileCount=p=>p.inventory.filter(isProjectile).reduce((n,i)=>n+i.quantity,0);
const gear=(id,kind,name,description,properties={})=>({id,kind,name,description,bonus:0,size:[2,2],sellValue:6,...properties});
export const hatchet=()=>gear('hatchet','weapon','Woodcutter’s Hatchet','Ignores 1 point of enemy defense on melee strikes.',{weaponType:'axe',armorPierce:1,size:[4,3]});
export const gambeson=()=>gear('gambeson','armor','Quilted Gambeson','+2 defense. Bulky quilted protection.',{bonus:2,size:[4,4]});
export const reedShield=()=>gear('reedShield','offhand','Reed Shield','55% block against ranged attacks, 15% against melee. No action needed.',{blockChance:.15,rangedBlock:.55,size:[3,3],appearance:0x769665});
export const trailBoots=()=>gear('trailBoots','boots','Trail Boots','+1 defense. Sturdy brown leather boots.',{defenseBonus:1,size:[2,2],appearance:0x8a6847});
export const softstepBoots=()=>gear('softstepBoots','boots','Softstep Shoes','Enemy detection range is reduced by 2 tiles. No armor bonus.',{stealthBonus:2,appearance:0x526879});
export const ironRing=()=>gear('ironRing','ring','Iron Band','+1 defense.',{defenseBonus:1,size:[1,1],appearance:0xb4c4ca});
export const huntersRing=()=>gear('huntersRing','ring','Hunter’s Ring','+1 attack.',{attackBonus:1,size:[1,1],appearance:0xd5a66c});
export const moonRing=()=>gear('moonRing','ring','Moonstone Ring','+20 maximum Mana. Equipping does not restore Mana.',{maxManaBonus:20,size:[1,1],appearance:0x8eb6eb});
export const lanternRelic=()=>gear('lanternRelic','offhand','Lantern Relic','Off-hand relic: +1 sight and +2 Mana recovered on movement/melee. Replaces a shield.',{relic:true,sightBonus:1,manaBonus:2,appearance:0x8fe2cb});
export const waystoneFocus=()=>gear('waystoneFocus','offhand','Waystone Focus','Off-hand relic: +20 maximum Mana; Mind Vision lasts one additional turn. Replaces a shield.',{relic:true,maxManaBonus:20,visionBonus:1,appearance:0xbab0ec});
export const amberMoth=()=>gear('amberMoth','amulet','Amber Moth Pendant','+2 Mana recovered on movement/melee.',{manaBonus:2,appearance:0xe4b96f});
export const wolfCharm=()=>gear('wolfCharm','amulet','Wolf-Tooth Charm','+1 melee damage against an enemy with no living ally within 2 tiles.',{isolatedBonus:1});
export const bellflower=()=>gear('bellflower','amulet','Bellflower Charm','Consumable healing is increased by 25%.',{healBonus:.25,appearance:0xdfa8cd});
export const lastLight=()=>gear('lastLight','amulet','Last-Light Medallion','Prevents one fatal hit, leaving 1 HP, then permanently shatters. Later hits can still kill you.',{lastLight:true,appearance:0xffdb7a,sellValue:18});
export const rations=()=>({id:'rations',kind:'ration',name:'Honeyed Rations',size:[2,1],sellValue:3,description:'Heal 3 HP after each of the next 4 turns. Taking damage interrupts the meal. Best outside combat.'});
export const clearwater=()=>({id:'clearwater',kind:'cleanse',name:'Clearwater Draught',sellValue:3,description:'Removes sap corrosion. Using it takes one turn.'});
export const moonwell=()=>({id:'moonwell',kind:'mana',name:'Moonwell Sip',sellValue:4,description:'Restores 35 Mana. Using it takes one turn.'});
export const smokeFlask=()=>({id:'smoke',kind:'smoke',name:'Smoke Flask',sellValue:4,description:'For 3 enemy phases, enemies beyond adjacent range cannot pursue or fire at you. Adjacent enemies still attack.'});
export const throwingKnives=(quantity=2)=>({id:'knives',kind:'knife',name:'Balanced Throwing Knives',quantity,size:[1,1],projectileDamage:4,sellValue:6,description:'Throw within 4 tiles for 4 damage before defense. 50% recovery chance. Stacks of 9.'});
export const thunderstone=(quantity=1)=>({id:'thunder',kind:'thunder',name:'Thunderstone',quantity,size:[1,1],projectileDamage:0,description:'Throw within 4 tiles to interrupt an enemy and make it lose its next action. No damage; consumed on impact.'});
export const consumableKinds=['potion','ration','cleanse','mana','smoke'];
