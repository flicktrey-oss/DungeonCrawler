import {regionalGear,dangerTier,gearTier} from './gear-progression.js';
import * as I from './items.js';
// Eligible weighted tables favor the current region tier; future tiers never roll.
export const ITEM_CATALOG=[
 ['stones',()=>I.throwingStones(3),18,1],['tonic',I.potion,16,1],['rations',I.rations,8,1],['clearwater',I.clearwater,6,3],['moonwell',I.moonwell,4,3],
 ['sword',I.shortSword,7,1],['spear',I.trailSpear,6,1],['hatchet',I.hatchet,4,3],['vest',()=>I.travelGear('armor',1),6,1],['gambeson',I.gambeson,4,3],
 ['buckler',I.buckler,6,1],['reedShield',I.reedShield,3,3],['reedheart',I.reedAmulet,3,3],['amber',I.amberMoth,2,6],['wolf',I.wolfCharm,2,6],['bellflower',I.bellflower,1,6],
 ['knives',I.throwingKnives,1,3],['smoke',I.smokeFlask,1,3],['thunder',I.thunderstone,1,6],['lastLight',I.lastLight,1,9],
 ['trailBoots',I.trailBoots,4,1],['softstep',I.softstepBoots,2,3],['ironRing',I.ironRing,3,1],['hunterRing',I.huntersRing,2,3],['moonRing',I.moonRing,2,3],['lantern',I.lanternRelic,1,2],['waystone',I.waystoneFocus,1,3],
 ...[2,3,4].flatMap(tier=>['weapon','spear','armor','boots'].map(kind=>[`regional-${kind}-${tier}`,()=>regionalGear(kind,tier),6,[0,1,3,6,9][tier]]))
].map(([id,create,weight,minDanger])=>({id,create,weight,minDanger}));
export const MODIFIER_ODDS={miniboss:[0,.60,.95],champion:[0,.85,.99],ordinary:[.70,.95,.995],cache:[.50,.85,.99],caravan:[.50,.85,.99],crypt:[.30,.75,.97],den:[.15,.80,.99],quest:[.30,.75,.97],boss:[0,.50,.90]};
function weighted(rng,entries,weight=e=>e.weight){let roll=rng.next()*entries.reduce((n,e)=>n+weight(e),0);for(const e of entries){roll-=weight(e);if(roll<0)return e;}return entries.at(-1);}
export function modifyItem(item,rng,source='ordinary'){
 const result={...item,size:item.size?[...item.size]:undefined,rarity:'ordinary',tier:gearTier(item)};
 if(!I.isEquipment(item))return result;
 const [plain,useful,strong]=MODIFIER_ODDS[source]??MODIFIER_ODDS.ordinary,roll=rng.next();if(roll<plain)return result;
 let label,effect;
 if(roll<useful){
  result.rarity='useful';
  const options=['Compact',...(item.kind==='weapon'?['Balanced']:['Attuned',...(['armor','boots','offhand'].includes(item.kind)?['Sturdy']:[])])];label=rng.pick(options);
  if(label==='Compact'){const size=result.size??[2,2],axis=size[0]>=size[1]?0:1;size[axis]=Math.max(1,size[axis]-1);result.size=size;effect='smaller satchel footprint';}
  if(label==='Balanced'){result.bonus=(result.bonus??0)+1;effect='+1 attack';}
  if(label==='Sturdy'){result.defenseBonus=(result.defenseBonus??0)+1;effect='+1 defense';}
  if(label==='Attuned'){result.maxManaBonus=(result.maxManaBonus??0)+10;effect='+10 maximum Mana';}
 }else if(roll<strong){
  result.rarity='powerful';label=item.kind==='weapon'?'Barbed':'Warding';
  if(label==='Barbed'){result.bleedBonus=1;effect='melee hits cause 1 bleeding damage for 2 enemy phases';}
  else{result.wardedBonus=(result.wardedBonus??0)+1;effect='+1 defense against special attacks';}
 }else{
  result.rarity='exceptional';label='Dawnforged';
  if(item.kind==='weapon'){result.bonus=(result.bonus??0)+2;result.bleedBonus=1;effect='+2 attack and bleeding strikes';}
  else if(item.kind==='offhand'&&item.blockChance){result.blockBonus=.10;result.wardedBonus=1;effect='+10 percentage points of block (total capped at 60%) and special-attack protection';}
  else{result.defenseBonus=(result.defenseBonus??0)+2;result.maxManaBonus=(result.maxManaBonus??0)+10;effect='+2 defense and +10 maximum Mana';}
 }
 result.modifier=label;result.baseName=item.name;result.name=`${label} ${item.name}`;result.description=`${item.description} ${label}: ${effect}.`;return result;
}
export function itemReward(rng,danger,source='ordinary'){
 const themed=['den','crypt','boss'].includes(source),equipment=themed||source==='quest';
 const tier=dangerTier(danger),eligible=ITEM_CATALOG.filter(e=>e.minDanger<=danger);
 const pool=equipment?eligible.filter(e=>I.isEquipment(e.create())):eligible;
 const entry=weighted(rng,pool,e=>e.weight*(I.isEquipment(e.create())&&gearTier(e.create())===tier?4:1)*(source==='den'&&['weapon','boots'].includes(e.create().kind)?3:['crypt','boss'].includes(source)&&['armor','ring','offhand','amulet'].includes(e.create().kind)?3:1));
 return modifyItem({...entry.create(),id:entry.id},rng,source);
}
export function ordinaryDrop(rng,danger,kind,elite=false){
 if(kind==='skeleton'&&rng.next()<.5)return I.bones();
 if(kind==='rat')return rng.next()<.5?I.rawRatMeat():null;
 if(kind==='rabbit')return rng.next()<.5?I.rawMeat():null;
 if(['frog','pondFrog','toad'].includes(kind))return rng.next()<.35?I.rawMeat():null;
 const roll=rng.next(),itemChance=elite ? .28 : [.08,.14,.20,.26][dangerTier(danger)-1];
 if(roll<.25)return {kind:'gold',name:'Dropped coins',amount:rng.int(2,4)};
 if(roll<.42)return I.trophy(kind==='pondFrog'?'frog':kind);
 if(roll<.42+itemChance){
  // Strong creatures favor useful gear; animals above retain meat-only drops.
  if(dangerTier(danger)>1&&rng.next()<.65){const tier=dangerTier(danger),kind=rng.pick(['weapon','spear','armor','boots']);return modifyItem(regionalGear(kind,tier),rng,elite?'den':'ordinary');}
  return itemReward(rng,danger,elite?'den':'ordinary');
 }
 return null;
}

// Dungeon-only relics make a completed descent offer a different reward pool.
export function cryptRelic(rng){
 const relics=[
  {id:'ossuaryLantern',kind:'offhand',name:'Ossuary Lantern',relic:true,bonus:0,sightBonus:1,wardedBonus:1,manaBonus:.2,size:[2,3],sellValue:16,appearance:0xb3dcca,description:'Off hand: +1 sight, +1 defense against special attacks, +0.2 Mana per turn. Replaces a shield.'},
  {id:'cryptstep',kind:'boots',name:'Cryptstep Boots',bonus:0,stealthBonus:1,wardedBonus:1,size:[2,2],sellValue:16,appearance:0x9c91b5,description:'Boots: reduces detection by 1 tile and grants +1 defense against special attacks.'},
  {id:'wardenSpear',kind:'weapon',name:'Warden’s Spire',weaponType:'spear',bonus:1,reach:2,armorPierce:1,size:[7,2],sellValue:18,description:'Main hand: +1 attack, 2-tile cardinal reach, and ignores 1 enemy defense on melee strikes.'}
 ];
 return {...rng.pick(relics),rarity:'powerful',dungeonExclusive:true};
}
