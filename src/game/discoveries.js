import {Random} from './random.js';
import {regionSeed,worldId,biomeAt} from './world.js';
import {walkable,key,directions} from './dungeon.js';
export const DISCOVERIES={
 lockbox:{name:'A Tollkeeper’s Lockbox',description:'A scavenger demands 5 gold to release a lockbox worth 12 gold. Pay, or challenge its guard. You may leave and return.'},
 pilgrim:{name:'A Stranded Pilgrim',description:'A pilgrim needs supplies for the road. Give a tonic or 4 gold to help them reach Northwatch; they offer 6 XP in thanks.'},
 watchfire:{name:'An Old Watchfire',description:'One bundle of dry wood remains. Burn it to restore 10 health, or send a scouting signal to chart the surrounding biomes. Choose once.'}
};
export function addDiscovery(g,data,rx,ry){
 if(data.home||data.city||data.encounters.some(e=>e.type==='discovery'))return;
 const rng=new Random(regionSeed(g.state.seed,rx,ry,'discovery-choices'));
 if(rng.next()>.45)return;
 const occupied=new Set([...data.encounters,...data.enemies,...data.items,...data.scenery].map(e=>key(e.x,e.y))),sites=[];
 for(let y=3;y<27;y++)for(let x=3;x<37;x++)if(data.map[y][x]==='.'&&!occupied.has(key(x,y))&&directions.every(([dx,dy])=>walkable(data.map,x+dx,y+dy)&&!occupied.has(key(x+dx,y+dy))))sites.push({x,y});
 if(!sites.length)return;
 const kind=rng.pick(Object.keys(DISCOVERIES)),e={...rng.pick(sites),...DISCOVERIES[kind],id:worldId(rx,ry)+':discovery',type:'discovery',kind,used:false};
 data.encounters.push(e);data.map[e.y][e.x]='R';
}
export function discoveryAction(g,a){
 const e=g.activeEncounter(),p=g.state.player;
 if(e?.type!=='discovery'||e.used)return false;
 const fail=text=>{g.message(text);return false;};
 if(e.kind==='lockbox'){
  if(e.challenged)return fail('Defeat the lockbox guard and collect its purse.');
  if(a.choice==='pay'){
   if(p.gold<5)return fail('You need 5 gold.');p.gold+=7;g.message('You pay 5 gold and recover 12 gold from the lockbox.');
  }else if(a.choice==='fight'){
   const spot=directions.map(([dx,dy])=>({x:e.x+dx,y:e.y+dy})).find(t=>walkable(g.state.map,t.x,t.y)&&!(p.x===t.x&&p.y===t.y)&&!g.state.enemies.some(n=>n.hp>0&&n.x===t.x&&n.y===t.y)&&!g.state.encounters.some(n=>n.x===t.x&&n.y===t.y));
   if(!spot)return fail('There is no clear place to challenge the guard.');
   const danger=g.areaAt?.(e.x,e.y)?.danger??g.state.danger;
   const guard=g.makeEnemy('goblin',spot,danger,'lockbox:'+e.id);guard.eventId=e.id;
   g.state.enemies.push(guard);e.challenged=true;g.message('The lockbox guard steps forward. Defeat it for the purse.');return true;
  }else return false;
 }else if(e.kind==='pilgrim'){
  if(a.choice==='gold'){if(p.gold<4)return fail('You need 4 gold to help.');p.gold-=4;}
  else if(a.choice==='tonic'){const i=p.inventory.findIndex(i=>i.kind==='potion');if(i<0)return fail('You need an Ember tonic.');p.inventory.splice(i,1);}
  else return false;
  g.awardExperience(6);g.rescued.push({name:'A Pilgrim of the Watchfire',region:{rx:g.location.rx,ry:g.location.ry}});g.message('The pilgrim thanks you and sets out for Northwatch. You gain 6 XP.');
 }else if(e.kind==='watchfire'){
  if(a.choice==='heal'){if(p.hp>=p.maxHp)return fail('You are already at full health.');p.hp=Math.min(p.maxHp,p.hp+10);g.message('The watchfire warms you, restoring up to 10 health.');}
  else if(a.choice==='scout'){
   const area=g.areaAt?.(e.x,e.y)??g.location;let added=0;
   for(let ry=area.ry-1;ry<=area.ry+1;ry++)for(let rx=area.rx-1;rx<=area.rx+1;rx++){const id=worldId(rx,ry);if(!g.surveyedRegions.has(id)){g.surveyedRegions.set(id,{rx,ry,biome:biomeAt(rx,ry,g.state.seed)});added++;}}
   if(!added)return fail('The surrounding regions are already charted.');
   g.message('Watchfire smoke charts nearby regions without revealing creatures or discoveries.');
  }else return false;
 }else return false;
 e.used=true;e.result=g.state.log.at(-1);return true;
}
