import {describe,it,expect} from 'vitest';
import {SeamlessExpedition} from '../src/game/seamless-expedition.js';
import {startingForest,worldId} from '../src/game/world.js';
import {walkable,key,directions} from '../src/game/dungeon.js';
import {habitatAt,actHabitatResident} from '../src/game/habitats.js';
import {availableInteractions} from '../src/game/interactions.js';
const homes=g=>g.state.encounters.filter(e=>e.type==='habitat');
const residents=(g,h)=>g.state.enemies.filter(e=>e.hp>0&&e.habitatId===h.id);
function adjacent(g,h){const [dx,dy]=directions.find(([dx,dy])=>walkable(g.state.map,h.x+dx,h.y+dy));Object.assign(g.state.player,{x:h.x+dx,y:h.y+dy});g.syncArea();g.refresh();return {dx:-dx,dy:-dy};}
function isolated(){const g=new SeamlessExpedition(5);g.state.enemies=g.state.enemies.filter(e=>e.habitatId);g.actEnemy=e=>e.actions++;g.state.player.maxHp=g.state.player.hp=999;return g;}
describe('persistent wilderness habitats',()=>{
 it('generates seeded, distinct starter homes with 3–5 valid nonoverlapping residents and preserves quest creatures',()=>{
  for(let seed=1;seed<=35;seed++){
   const g=new SeamlessExpedition(seed),f=startingForest(seed),a=g.surfaceChunks.get(worldId(f.rx,f.ry)),h=a.encounters.filter(e=>e.type==='habitat');expect(h.map(e=>e.kind)).toEqual(['rabbit','rat']);
   for(const home of h){expect(home.capacity).toBeGreaterThanOrEqual(3);expect(home.capacity).toBeLessThanOrEqual(5);expect(residents(g,home)).toHaveLength(home.capacity);for(const e of residents(g,home)){expect(walkable(g.state.map,e.x,e.y)).toBe(true);expect(Math.abs(e.x-home.x)+Math.abs(e.y-home.y)).toBeLessThanOrEqual(6);}}
   const live=g.state.enemies.filter(e=>e.hp>0);expect(new Set(live.map(e=>key(e.x,e.y))).size).toBe(live.length);expect(homes(g).some(h=>g.areaAt(h.x,h.y).home||g.areaAt(h.x,h.y).city)).toBe(false);
   const repeat=new SeamlessExpedition(seed);expect(homes(g).map(h=>[h.id,h.x,h.y,h.capacity])).toEqual(homes(repeat).map(h=>[h.id,h.x,h.y,h.capacity]));
  }
 });
 it('does not regenerate animals without completed turns and never exceeds capacity',()=>{
  const g=isolated(),h=homes(g).find(h=>h.kind==='rabbit'),n=g.state.enemies.length;for(let i=0;i<40;i++)g.refresh();expect(g.state.turn).toBe(0);expect(g.state.enemies).toHaveLength(n);for(let i=0;i<65;i++)g.action({type:'wait'});expect(residents(g,h)).toHaveLength(h.capacity);
 });
 it('replenishes gradually out of sight after 30 turns without catch-up bursts or an extra birth-turn action',()=>{
  const g=isolated(),h=homes(g).find(h=>h.id==='world:1,0/habitat:rabbit');for(const e of residents(g,h))e.hp=0;
  Object.assign(g.state.player,{x:h.x-12,y:h.y});g.syncArea();g.refresh();g.action({type:'wait'});expect(residents(g,h)).toHaveLength(0);
  for(let i=0;i<29;i++)g.action({type:'wait'});expect(residents(g,h)).toHaveLength(0);g.action({type:'wait'});expect(residents(g,h)).toHaveLength(1);const e=residents(g,h)[0];expect(e.actions).toBe(0);expect(g.state.visible.has(key(e.x,e.y))).toBe(false);expect(walkable(g.state.map,e.x,e.y)).toBe(true);
  g.action({type:'wait'});expect(e.actions).toBe(1);expect(residents(g,h)).toHaveLength(1);for(let i=0;i<29;i++)g.action({type:'wait'});expect(residents(g,h)).toHaveLength(2);
 });
 it('does not materialize replacement prey while the player watches the habitat',()=>{
  const g=isolated(),h=homes(g).find(h=>h.id==='world:1,0/habitat:rabbit');for(const e of residents(g,h))e.hp=0;adjacent(g,h);for(let i=0;i<70;i++)g.action({type:'wait'});expect(residents(g,h)).toHaveLength(0);
 });
 it('allows turn-based destruction, leaves existing rats alive, and never replenishes a cleared burrow',()=>{
  const g=isolated(),h=homes(g).find(h=>h.kind==='rat'),rats=residents(g,h),move=adjacent(g,h),p={x:g.state.player.x,y:g.state.player.y};
  expect(availableInteractions(g).some(o=>o.event===h&&o.type==='habitat')).toBe(true);expect(g.action({type:'move',...move})).toBe(true);expect(h.hp).toBe(9);expect(g.state.turn).toBe(1);expect(g.state.player.x).toBe(p.x);expect(g.state.player.y).toBe(p.y);expect(rats.every(e=>e.actions===1)).toBe(true);
  while(!h.destroyed)expect(g.action({type:'strikeHabitat',id:h.id})).toBe(true);expect(h.hp).toBe(0);expect(rats.every(e=>e.hp>0)).toBe(true);for(const e of rats)e.hp=0;for(let i=0;i<65;i++)g.action({type:'wait'});expect(residents(g,h)).toHaveLength(0);const t=g.state.turn;expect(g.action({type:'strikeHabitat',id:h.id})).toBe(false);expect(g.state.turn).toBe(t);expect(g.action({type:'move',...move})).toBe(true);expect(habitatAt(g,g.state.player.x,g.state.player.y)).toBe(h);
 });
 it('cannot destroy a warren, attack a distant burrow, or spend a turn on an invalid strike',()=>{
  const g=isolated(),rabbit=homes(g).find(h=>h.kind==='rabbit'),rat=homes(g).find(h=>h.kind==='rat');expect(g.action({type:'strikeHabitat',id:rat.id})).toBe(false);adjacent(g,rabbit);expect(g.action({type:'strikeHabitat',id:rabbit.id})).toBe(false);expect(g.state.turn).toBe(0);expect(rabbit.destroyed).toBe(false);
 });
 it('retains cleared homes, survivors and population identity after leaving and returning',()=>{
  const g=isolated(),h=homes(g).find(h=>h.kind==='rat');adjacent(g,h);g.state.player.attack=30;g.action({type:'strikeHabitat',id:h.id});const ids=residents(g,h).map(e=>e.id);Object.assign(g.state.player,{x:120,y:15});g.syncArea();Object.assign(g.state.player,{x:h.x-1,y:h.y});g.syncArea();expect(habitatAt(g,h.x,h.y)).toBe(h);expect(h.destroyed).toBe(true);expect(residents(g,h).map(e=>e.id)).toEqual(ids);
 });
 it('fleeing rabbits take one action per turn, remain near home and never overlap other actors',()=>{
  const g=new SeamlessExpedition(5),h=homes(g).find(h=>h.id==='world:1,0/habitat:rabbit'),r=residents(g,h)[0];Object.assign(g.state.player,{x:h.x,y:h.y});g.syncArea();g.state.enemies=residents(g,h);
  for(let t=1;t<=40;t++){g.state.turn=t;for(const e of g.state.enemies){const before=e.actions;expect(actHabitatResident(g,e)).toBe(true);expect(e.actions).toBe(before+1);expect(Math.abs(e.x-h.x)+Math.abs(e.y-h.y)).toBeLessThanOrEqual(h.radius);}expect(new Set(g.state.enemies.map(e=>key(e.x,e.y))).size).toBe(g.state.enemies.length);expect(g.state.enemies.some(e=>e.x===g.state.player.x&&e.y===g.state.player.y)).toBe(false);}expect(r.hp).toBe(r.maxHp);
 });
});
