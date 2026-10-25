import {describe,it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import {BLACKSMITH,atBlacksmith,enhancementCost,enhancementCap,enhancementPreview} from '../src/game/blacksmith.js';
import {regionalGear,gearTier,dangerTier,equipmentSummary} from '../src/game/gear-progression.js';
import {shortSword,travelGear,trailBoots,attack,rawDefense,potion,buckler} from '../src/game/items.js';
import {assignQuick,quickItem} from '../src/game/quality.js';
import {Random} from '../src/game/random.js';
import {ordinaryDrop,itemReward,ITEM_CATALOG} from '../src/game/loot.js';
import {minibossReward} from '../src/game/minibosses.js';
import {directions,key,walkable} from '../src/game/dungeon.js';
import {worldMapCells,minimapCells} from '../src/minimap.js';
const approach=g=>Object.assign(g.state.player,{x:BLACKSMITH.x+1,y:BLACKSMITH.y});
function smith(item=shortSword()) {const g=new Expedition(5);approach(g);g.state.player.inventory=[item];g.state.player.gold=1000;return g;}
describe('camp blacksmith',()=>{
 it('has a reserved, reachable NPC tile and an interaction that does not interfere with Orren',()=>{
  for(let seed=0;seed<30;seed++){const g=new Expedition(seed),s=g.state,seen=new Set(['20,15']),q=[s.player];for(let i=0;i<q.length;i++)for(const[dx,dy]of directions){const x=q[i].x+dx,y=q[i].y+dy,k=key(x,y);if(walkable(s.map,x,y)&&!seen.has(k)){seen.add(k);q.push({x,y});}}
   expect(s.map[BLACKSMITH.y][BLACKSMITH.x]).toBe('V');expect(walkable(s.map,BLACKSMITH.x,BLACKSMITH.y)).toBe(false);expect(directions.some(([dx,dy])=>seen.has(key(BLACKSMITH.x+dx,BLACKSMITH.y+dy)))).toBe(true);approach(g);expect(g.activeEncounter().type).toBe('blacksmith');expect(s.enemies).toHaveLength(0);
  }
 });
 it('enhances the same equipped and quick-slotted item for exact gold and one turn without spending XP',()=>{
  const g=smith(),p=g.state.player,item=p.inventory[0];p.weapon=item;assignQuick(g,0,0);p.xp=7;const before=attack(p),cost=enhancementCost(item);expect(g.action({type:'enhance',index:0,cost:0,bonus:99})).toBe(true);
  expect(p.gold).toBe(1000-cost);expect(p.xp).toBe(7);expect(g.state.turn).toBe(1);expect(attack(p)).toBe(before+1);expect(item.name).toBe('Worn shortsword +1');expect(item.enhancement).toBe(1);expect(p.weapon).toBe(item);expect(quickItem(g,0)).toBe(item);expect(p.inventory).toHaveLength(1);
 });
 it('keeps existing modifiers and adds raw protection to armor and boots',()=>{
  for(const item of [travelGear('armor',1),trailBoots()]){item.wardedBonus=1;const g=smith(item),p=g.state.player;p[item.kind]=item;const def=rawDefense(p);g.action({type:'enhance',index:0});expect(rawDefense(p)).toBe(def+1);expect(item.wardedBonus).toBe(1);expect(equipmentSummary(item)).toContain('+1 special protection');expect(enhancementPreview(item)).toContain('Fully enhanced');}
 });
 it('caps Worn at +1 and better tiers at +2 with rising cost and never changes tier',()=>{
  const g=smith(regionalGear('armor',2)),item=g.state.player.inventory[0];expect(enhancementCost(item)).toBe(28);g.action({type:'enhance',index:0});expect(enhancementCost(item)).toBe(112);g.action({type:'enhance',index:0});expect(item.name).toBe('Mirehide coat +2');expect(item.tier).toBe(2);expect(item.bonus).toBe(4);const gold=g.state.player.gold;expect(g.action({type:'enhance',index:0})).toBe(false);expect(g.state.player.gold).toBe(gold);expect(g.state.turn).toBe(2);expect(enhancementCap(shortSword())).toBe(1);
 });
 it('rejects unaffordable, distant, invalid, unsupported, underground and dead actions without a turn',()=>{
  const g=smith(),p=g.state.player;p.gold=13;expect(g.action({type:'enhance',index:0})).toBe(false);p.gold=100;
  for(const index of [-1,.5,9,undefined])expect(g.action({type:'enhance',index})).toBe(false);
  p.inventory.push(potion(),buckler());for(const index of [1,2])expect(g.action({type:'enhance',index})).toBe(false);
  p.x=20;p.y=15;expect(atBlacksmith(g)).toBe(false);expect(g.action({type:'enhance',index:0})).toBe(false);g.visitCrypt(0,0,1);approach(g);expect(g.action({type:'enhance',index:0})).toBe(false);g.visitWorld(0,0);approach(g);g.state.status='dead';expect(g.action({type:'enhance',index:0})).toBe(false);expect(g.state.turn).toBe(0);expect(p.gold).toBe(100);expect(p.inventory[0].bonus).toBe(1);
 });
 it('persists enhanced gear through travel, storage and re-equipping and resets a new run',()=>{
  const g=smith(),p=g.state.player;g.action({type:'enhance',index:0});const item=p.inventory[0];g.visitWorld(1,0);g.visitWorld(0,0);g.action({type:'store',index:0});expect(g.stash[0].enhancement).toBe(1);g.action({type:'retrieve',index:0});g.action({type:'equip',index:0});expect(p.weapon.name).toBe(item.name);expect(p.weapon.bonus).toBe(2);expect(new Expedition(5).state.player.inventory.some(i=>i.enhancement)).toBe(false);
 });
});
describe('region equipment tiers and animal drops',()=>{
 it('adds 12 distinct items with bounded regional tiers, meaningful stats and concise summaries',()=>{
  expect(ITEM_CATALOG).toHaveLength(39);expect([1,3,6,9].map(dangerTier)).toEqual([1,2,3,4]);
  for(const tier of [2,3,4])for(const kind of ['weapon','spear','armor','boots']){const item=regionalGear(kind,tier);expect(gearTier(item)).toBe(tier);expect(equipmentSummary(item)).toContain(`Tier ${tier}`);expect(equipmentSummary(item).length).toBeLessThan(130);if(kind==='spear')expect(item.reach).toBe(2);}
 });
 it('never gives future-tier equipment in early regions, and tougher areas favor their own tier',()=>{
  for(const danger of [1,3,6,9]){let appropriate=0,equipment=0;const rng=new Random(66);for(let n=0;n<1500;n++){const item=itemReward(rng,danger,'crypt');expect(gearTier(item)).toBeLessThanOrEqual(dangerTier(danger));if(gearTier(item)===dangerTier(danger))appropriate++;equipment++;}expect(appropriate/equipment).toBeGreaterThan(.4);}
 });
 it('keeps weak animals meat-only across all danger levels while strong enemies can drop regional gear',()=>{
  const rng=new Random(123);for(const [kind,meat]of [['rat','rawRatMeat'],['rabbit','rawMeat'],['toad','rawMeat'],['frog','rawMeat']]){let count=0;for(let n=0;n<600;n++){const item=ordinaryDrop(rng,9,kind);if(item){expect(item.kind).toBe(meat);count++;}}expect(count).toBeGreaterThan(150);expect(count).toBeLessThan(360);}
  let forged=0;for(let n=0;n<1000;n++)if(ordinaryDrop(rng,6,'wolf')?.tier===3)forged++;expect(forged).toBeGreaterThan(70);
 });
 it('gives higher-tier themed equipment from marsh and highland den owners',()=>{
  let marsh=0;for(let seed=0;seed<100;seed++){if(minibossReward(new Random(seed),'reedmaw').tier===2)marsh++;expect(minibossReward(new Random(seed),'cairn').tier).toBe(3);}expect(marsh).toBeGreaterThan(60);
 });
});
describe('permanent destinations and discovered quest map markers',()=>{
 it('marks camp but keeps Northwatch hidden until visited without changing turns',()=>{
  const g=new Expedition(17),before=structuredClone(g.state);for(let i=0;i<3;i++){const cells=worldMapCells(g);expect(cells.find(c=>c.home)).toMatchObject({rx:0,ry:0,visited:true});expect(cells.find(c=>c.kingdom)).toBeUndefined();expect(cells).toHaveLength(1);expect(g.regions.size).toBe(0);}expect(g.state).toEqual(before);g.visitCrypt(2,1,1);expect(worldMapCells(g).filter(c=>c.kingdom)).toHaveLength(0);expect(worldMapCells(g).filter(c=>c.home)).toHaveLength(1);g.visitWorld(0,-6);expect(worldMapCells(g).find(c=>c.kingdom)).toMatchObject({rx:0,ry:-6,visited:true});
 });
 it('marks discovered offers locally, accepted targets at their destination, and completed rewards at the giver',()=>{
  const g=new Expedition(5),q=g.quests.get('trailwarden'),home=()=>worldMapCells(g).find(c=>c.home);expect(home().availableCount).toBe(1);g.state.encounters.push({type:'shrine',x:20,y:15,quest:q});g.state.encounterSeen.add('20,15');expect(home().availableCount).toBe(1);Object.assign(g.state.player,{x:18,y:15});g.action({type:'acceptQuest'});expect(home().availableCount).toBe(0);expect(worldMapCells(g).find(c=>c.rx===q.region.rx&&c.ry===q.region.ry)).toMatchObject({questCount:1,visited:false});q.complete=true;expect(home().returnCount).toBe(1);q.claimed=true;expect(home().returnCount).toBe(0);
 });
 it('does not expose unknown quest offers and remembers region exploration on return',()=>{
  const g=new Expedition(5);g.visitWorld(1,0);const q=g.state.encounters.find(e=>e.type==='villager'&&e.quest);expect(q).toBeTruthy();g.state.encounterSeen.clear();expect(worldMapCells(g).find(c=>c.current).availableCount).toBe(0);g.state.encounterSeen.add(key(q.x,q.y));expect(worldMapCells(g).find(c=>c.current).availableCount).toBeGreaterThan(0);const known=new Set(g.state.explored);g.visitWorld(0,0);g.visitWorld(1,0);for(const k of known)expect(g.state.explored.has(k)).toBe(true);expect(minimapCells(g.state).length).toBeGreaterThanOrEqual(known.size);
 });
});
