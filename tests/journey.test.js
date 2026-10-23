import {describe,it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import {journeyLandmarks,startingForest,generateWorldRegion,biomeAt} from '../src/game/world.js';
import {journeyHints,arrivalSummary,STEWARD} from '../src/game/journey.js';
import {worldMapCells} from '../src/minimap.js';
import {walkable,directions,key} from '../src/game/dungeon.js';
function landmark(kind,seed=5){const g=new Expedition(seed),l=journeyLandmarks(seed).find(l=>l.kind===kind);g.visitWorld(l.rx,l.ry,{x:l.x,y:l.y});g.state.enemies=[];g.state.transition=false;return {g,l,p:g.state.player};}
function complete(g){g.story.accepted=true;g.visitWorld(0,-6,{x:20,y:7});Object.assign(g.story.prince,{locationId:g.location.id,rx:0,ry:-6,depth:0,x:19,y:7,mode:'follow',hp:20});g.refresh();g.state.transition=false;g.action({type:'wait'});}
describe('a discoverable northern road',()=>{
 it('places three distinct connected landmarks on the seeded road across many runs',()=>{
  for(let seed=0;seed<55;seed++){
   const plan=journeyLandmarks(seed),first=startingForest(seed);expect(plan.map(l=>l.kind)).toEqual(['tower','causeway','shelter']);expect(new Set(plan.map(l=>key(l.rx,l.ry))).size).toBe(3);
   for(const l of plan){expect(l.rx!==first.rx||l.ry!==first.ry).toBe(true);const d=generateWorldRegion(seed,l.rx,l.ry),queue=[{x:20,y:15}],seen=new Set(['20,15']);for(let i=0;i<queue.length;i++)for(const [dx,dy]of directions){const x=queue[i].x+dx,y=queue[i].y+dy,k=key(x,y);if(walkable(d.map,x,y)&&!seen.has(k)){seen.add(k);queue.push({x,y});}}for(const p of [{x:0,y:15},{x:39,y:15},{x:20,y:0},{x:20,y:29}])expect(seen.has(key(p.x,p.y))).toBe(true);expect(d.routeLandmark.kind).toBe(l.kind);}
   expect(biomeAt(plan[1].rx,plan[1].ry,seed)).toBe('marsh');
  }
 });
 it('marks the bridge region for one turn without visiting it or revealing its biome/terrain',()=>{
  const g=new Expedition(5);Object.assign(g.state.player,{x:24,y:12});const visited=g.state.regionsDiscovered;expect(journeyHints(g)).toEqual([]);expect(g.action({type:'journey',choice:'bridgeLead'})).toBe(true);const f=startingForest(5),cell=worldMapCells(g).find(c=>c.rx===f.rx&&c.ry===f.ry);expect(cell.visited).toBe(false);expect(cell.biome).toBeUndefined();expect(cell.leads[0].label).toBe('Willow Crossing');expect(g.state.regionsDiscovered).toBe(visited);expect(g.state.turn).toBe(1);expect(g.action({type:'journey',choice:'bridgeLead'})).toBe(false);
 });
 it('scouts the other landmarks without visiting them, or claiming their supplies',()=>{
  const {g}=landmark('tower'),count=g.regions.size;expect(g.action({type:'journey',choice:'scout'})).toBe(true);expect(journeyHints(g)).toHaveLength(3);expect(g.regions.size).toBe(count);expect(g.journey.records.tower).toBe('scout');expect(g.action({type:'journey',choice:'tonic'})).toBe(false);
 });
 it('rejects remote landmark actions and invalid choices for free',()=>{
  const {g,p}=landmark('tower');expect(g.action({type:'journey',choice:'purse'})).toBe(false);p.x++;expect(g.action({type:'journey',choice:'scout'})).toBe(false);expect(g.state.turn).toBe(0);
 });
});
describe('small, persistent expedition choices',()=>{
 it('lets the watchtower tonic wait until it fits and grants it just once',()=>{
  const {g,p}=landmark('tower');p.inventory=Array.from({length:100},()=>({kind:'potion',name:'Tonic',size:[1,1]}));expect(g.action({type:'journey',choice:'tonic'})).toBe(false);expect(g.journey.records.tower).toBeUndefined();p.inventory.pop();expect(g.action({type:'journey',choice:'tonic'})).toBe(true);expect(p.inventory).toHaveLength(100);expect(g.action({type:'journey',choice:'tonic'})).toBe(false);
 });
 it('grants causeway gold with exactly one action from each enemy',()=>{
  const {g,p}=landmark('causeway');g.state.enemies=[g.makeEnemy('rat',{x:19,y:15},1,0)];const gold=p.gold;expect(g.action({type:'journey',choice:'purse'})).toBe(true);expect(p.gold).toBe(gold+4);expect(g.state.enemies[0].actions).toBe(1);expect(g.state.turn).toBe(1);expect(g.action({type:'journey',choice:'purse'})).toBe(false);expect(g.state.enemies[0].actions).toBe(1);
 });
 it('requires a nearby living, wounded Aldren for causeway aid',()=>{
  const {g}=landmark('causeway');expect(g.action({type:'journey',choice:'aid'})).toBe(false);const c=g.story.prince;Object.assign(c,{locationId:g.location.id,rx:g.location.rx,ry:g.location.ry,x:19,y:15,hp:20,mode:'stay'});g.refresh();expect(g.action({type:'journey',choice:'aid'})).toBe(true);expect(c.hp).toBe(28);expect(g.action({type:'journey',choice:'purse'})).toBe(false);
 });
 it('does not consume a shelter rest at full health, then heals both travelers once',()=>{
  const {g,p}=landmark('shelter');expect(g.action({type:'journey',choice:'rest'})).toBe(false);p.hp-=10;const c=g.story.prince;Object.assign(c,{locationId:g.location.id,rx:g.location.rx,ry:g.location.ry,x:19,y:15,hp:20,mode:'stay'});g.refresh();expect(g.action({type:'journey',choice:'rest'})).toBe(true);expect(p.hp).toBe(p.maxHp-2);expect(c.hp).toBe(28);expect(g.action({type:'journey',choice:'rations'})).toBe(false);
 });
 it('persists a resolved landmark and its terrain across visits, with a fresh choice in a new run',()=>{
  const {g,l}=landmark('shelter');expect(g.action({type:'journey',choice:'rations'})).toBe(true);const map=structuredClone(g.state.baseMap);g.visitWorld(0,0);g.visitWorld(l.rx,l.ry,{x:l.x,y:l.y});expect(g.state.baseMap).toEqual(map);expect(g.action({type:'journey',choice:'rations'})).toBe(false);expect(landmark('shelter').g.journey.records.shelter).toBeUndefined();
 });
});
describe('Aldren’s homecoming',()=>{
 it('acknowledges the crossing resolution and road choices',()=>{
  const g=new Expedition(5);g.quests.set('testBridge',{kind:'bridge',claimed:true,mode:'medicine'});g.journey.records.tower='scout';g.story.aidCount=1;expect(arrivalSummary(g)).toContain('medicine');expect(arrivalSummary(g)).toContain('1 northern landmark');expect(arrivalSummary(g)).toContain('tended Aldren');
 });
 it('awards one keepsake without equipping it or replacing existing neckwear',()=>{
  const g=new Expedition(5),p=g.state.player,amulet={kind:'amulet',name:'Old charm',bonus:1};p.inventory.push(amulet);p.amulet=amulet;p.mana=2;const gold=p.gold;complete(g);expect(g.story.complete).toBe(true);expect(g.story.keepsakeClaimed).toBe(true);expect(p.inventory.filter(i=>i.id==='northwatchBrooch')).toHaveLength(1);expect(p.amulet).toBe(amulet);expect(p.mana).toBe(p.maxMana);expect(p.gold).toBe(gold+30);g.action({type:'wait'});expect(p.inventory.filter(i=>i.id==='northwatchBrooch')).toHaveLength(1);
 });
 it('holds a full-bag reward safely with the steward until claimed for one turn',()=>{
  const g=new Expedition(5),p=g.state.player;p.inventory=Array.from({length:100},()=>({kind:'potion',name:'Tonic',size:[1,1]}));complete(g);expect(g.story.keepsakeClaimed).not.toBe(true);Object.assign(p,{x:STEWARD.x-1,y:STEWARD.y});const turn=g.state.turn;expect(g.action({type:'journey',choice:'keepsake'})).toBe(false);expect(g.state.turn).toBe(turn);p.inventory.pop();p.inventory.pop();expect(g.action({type:'journey',choice:'keepsake'})).toBe(true);expect(g.state.turn).toBe(turn+1);expect(g.action({type:'journey',choice:'keepsake'})).toBe(false);expect(p.inventory.filter(i=>i.id==='northwatchBrooch')).toHaveLength(1);
 });
 it('cannot claim a royal keepsake before completing the escort',()=>{
  const g=new Expedition(5);g.visitWorld(0,-6,{x:STEWARD.x-1,y:STEWARD.y});g.state.transition=false;expect(g.action({type:'journey',choice:'keepsake'})).toBe(false);expect(g.state.turn).toBe(0);
 });
});
