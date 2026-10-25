import {updateVisibility} from './visibility.js';
import {Random} from './random.js';
import {regionSeed,worldId,startingForest} from './world.js';
import {walkable,key,directions} from './dungeon.js';
import {attack} from './items.js';
import {combatFeedback} from './combat-feedback.js';

const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const habitats=g=>g.state.encounters.filter(e=>e.type==='habitat');
export const habitatAt=(g,x,y)=>habitats(g).find(h=>h.x===x&&h.y===y);
// Habitat generation uses its own seeded stream, independently of combat and loot.
export function addHabitats(g,data){
 if(data.home||data.city||data.biome!=='forest')return;
 const rng=new Random(regionSeed(g.state.seed,data.rx,data.ry,'habitats')),first=startingForest(g.state.seed),starter=data.rx===first.rx&&data.ry===first.ry;
 for(const kind of ['rabbit','rat']){
  if(!starter&&rng.next()>(kind==='rabbit'?.55:.35))continue;
  const candidates=[];
  for(let y=4;y<26;y++)for(let x=4;x<36;x++)if([',','.'].includes(data.map[y][x])&&Math.abs(x-20)+Math.abs(y-15)>=8&&!data.encounters.some(e=>distance(e,{x,y})<6)&&!data.scenery.some(e=>e.x===x&&e.y===y)&&!data.enemies.some(e=>e.x===x&&e.y===y)&&!data.items.some(e=>e.x===x&&e.y===y)){
   let open=0;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if(walkable(data.map,x+dx,y+dy))open++;
   if(open>=24)candidates.push({x,y});
  }
  if(!candidates.length)continue;
  const h={...rng.pick(candidates),id:`${worldId(data.rx,data.ry)}/habitat:${kind}`,type:'habitat',kind,name:kind==='rabbit'?'Rabbit warren':'Rat burrow',capacity:rng.int(3,5),radius:6,hp:kind==='rat'?12:null,maxHp:kind==='rat'?12:null,destroyed:false,nextSpawn:null,serial:0,rng};
  data.encounters.push(h);
  // Replace ordinary prey of this species with a population tied to this home.
  data.enemies=data.enemies.filter(e=>e.kind!==kind||e.questKey||e.questId||e.eventId);
  const occupied=new Set([...data.enemies,...data.items,...data.encounters,...data.scenery].map(e=>key(e.x,e.y)));
  for(let i=0;i<h.capacity;i++){
   const spots=[];for(let y=h.y-3;y<=h.y+3;y++)for(let x=h.x-3;x<=h.x+3;x++)if(distance(h,{x,y})<=4&&walkable(data.map,x,y)&&[',','.'].includes(data.map[y][x])&&!occupied.has(key(x,y)))spots.push({x,y});
   if(!spots.length)break;const point=rng.pick(spots);occupied.add(key(point.x,point.y));data.enemies.push(g.makeEnemy(kind,{...point,habitatId:h.id},1,`habitat:${kind}:${h.serial++}`,'forest'));
  }
 }
}
export function strikeHabitat(g,id){
 const h=habitats(g).find(h=>h.id===id),p=g.state.player;
 if(!h||h.kind!=='rat'||h.destroyed||distance(h,p)!==1)return false;
 const hit=Math.max(1,attack(p));h.hp=Math.max(0,h.hp-hit);combatFeedback(g.state,h,'−'+hit,'strike',p);
 g.message(`You strike the rat burrow for ${hit}. ${h.hp}/${h.maxHp} HP.`);
 if(h.hp===0){h.destroyed=true;h.nextSpawn=null;g.message('The rat burrow collapses. No more rats will emerge; surviving rats remain.');}
 return true;
}
export function replenishHabitats(g){
 const s=g.state;if(s.status!=='playing')return;updateVisibility(s);
 for(const h of habitats(g)){
  if(h.destroyed)continue;
  const count=s.enemies.filter(e=>e.hp>0&&e.habitatId===h.id).length;
  if(count>=h.capacity){h.nextSpawn=null;continue;}
  if(h.nextSpawn===null){h.nextSpawn=s.turn+30;continue;}
  if(s.turn<h.nextSpawn||distance(h,s.player)>48)continue;
  const blocked=new Set([...s.enemies.filter(e=>e.hp>0),...s.items,...s.encounters,...s.scenery,s.player,...(s.companion?[s.companion]:[])].map(e=>key(e.x,e.y)));
  const spots=[];for(let y=h.y-3;y<=h.y+3;y++)for(let x=h.x-3;x<=h.x+3;x++)if(distance(h,{x,y})<=4&&walkable(s.map,x,y)&&[',','.'].includes(s.map[y][x])&&!s.visible.has(key(x,y))&&distance(s.player,{x,y})>8&&!blocked.has(key(x,y)))spots.push({x,y});
  if(!spots.length)continue;
  const e=g.makeEnemy(h.kind,{...h.rng.pick(spots),habitatId:h.id},1,`habitat:${h.kind}:${h.serial++}`,'forest');g.registerEnemy(e,g.areaAt(h.x,h.y)?worldId(g.areaAt(h.x,h.y).rx,g.areaAt(h.x,h.y).ry):g.location.id);s.enemies.push(e);h.nextSpawn=s.turn+30;
 }
}
// Rabbits flee and all habitat residents stay near home. One call = one enemy action.
export function actHabitatResident(g,e){
 if(!e.habitatId)return false;
 const h=habitats(g).find(h=>h.id===e.habitatId);if(!h||e.bleeding||e.intent)return false;
 const s=g.state,p=s.player,threat=distance(e,p)<=4;
 if(e.kind!=='rabbit'&&distance(p,h)<=h.radius&&distance(e,h)<=h.radius)return false;
 e.actions++;
 const blocked=new Set([...s.enemies.filter(o=>o!==e&&o.hp>0),...s.encounters.filter(o=>o.type==='habitat'),p,...(s.companion?[s.companion]:[])].map(o=>key(o.x,o.y)));
 const choices=directions.map(([dx,dy])=>({x:e.x+dx,y:e.y+dy})).filter(t=>walkable(s.map,t.x,t.y)&&!blocked.has(key(t.x,t.y))&&distance(t,h)<=h.radius);
 if(!choices.length)return true;
 if(e.kind==='rabbit'&&threat){if(s.turn%2)return true;choices.sort((a,b)=>distance(b,p)-distance(a,p)||distance(a,h)-distance(b,h));if(distance(choices[0],p)>distance(e,p))Object.assign(e,choices[0]);}
 else if(distance(e,h)>3){choices.sort((a,b)=>distance(a,h)-distance(b,h));Object.assign(e,choices[0]);}
 else if(s.turn%3===0)Object.assign(e,choices[(s.turn+e.x+e.y>>>0)%choices.length]);
 return true;
}
