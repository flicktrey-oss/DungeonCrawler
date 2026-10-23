import {describe,it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import {startingForest,generateWorldRegion} from '../src/game/world.js';
import {bridgeQuest} from '../src/game/bridge.js';
import {walkable,key,directions} from '../src/game/dungeon.js';
import {planTravel} from '../src/game/travel.js';
import {characterDetails} from '../src/character-inspection.js';
function setup(seed=1){const g=new Expedition(seed),r=startingForest(seed);g.visitWorld(r.rx,r.ry);g.state.enemies=[];g.state.items=[];g.state.transition=false;const q=bridgeQuest(g),p=g.state.player,f=q.layout.forward;Object.assign(p,{x:q.layout.guard.x-f.x,y:q.layout.guard.y-f.y});g.refresh();return {g,q,p,r};}
function distance(map,a,b){const queue=[{...a,d:0}],seen=new Set([key(a.x,a.y)]);for(let i=0;i<queue.length;i++){const n=queue[i];if(n.x===b.x&&n.y===b.y)return n.d;for(const [dx,dy]of directions){const x=n.x+dx,y=n.y+dy,k=key(x,y);if(walkable(map,x,y)&&!seen.has(k)){seen.add(k);queue.push({x,y,d:n.d+1});}}}return Infinity;}
describe('a crossing with a real alternative route',()=>{
 it('guarantees a first-forest crossing in all four orientations, with a shorter route after opening',()=>{
  const orientations=new Set();for(let seed=0;seed<80;seed++){
   const r=startingForest(seed),d=generateWorldRegion(seed,r.rx,r.ry),{center:c,forward:f}=d.bridgeLayout;orientations.add(key(f.x,f.y));
   const a={x:c.x-f.x*4,y:c.y-f.y*4},b={x:c.x+f.x*4,y:c.y+f.y*4};
   const detour=distance(d.map,a,b);expect(Number.isFinite(detour)).toBe(true);expect(walkable(d.map,c.x,c.y)).toBe(false);d.map[c.y][c.x]='=';expect(distance(d.map,a,b)).toBe(8);expect(detour).toBeGreaterThan(8);
  }expect(orientations.size).toBe(4);
 });
 it('adds no bridge at camp or in unrelated regions',()=>{
  for(let seed=0;seed<10;seed++){expect(generateWorldRegion(seed,0,0).bridgeLayout).toBeNull();expect(generateWorldRegion(seed,8,8).bridgeLayout).toBeNull();}
 });
 it('treats a barred bridge as a free blocked move and leaves enemies frozen',()=>{
  const {g,q,p}=setup(),c=q.layout.center,f=q.layout.forward;Object.assign(p,{x:c.x-f.x,y:c.y-f.y});const turn=g.state.turn;
  expect(g.action({type:'move',dx:f.x,dy:f.y})).toBe(false);expect(g.state.turn).toBe(turn);expect(g.state.log.at(-1)).toContain('bridge is barred');
 });
 it('clicking the keeper plans an adjacent conversation, without charging a turn',()=>{
  const {g,q}=setup(),turn=g.state.turn;const plan=planTravel(g,q.layout.guard.x,q.layout.guard.y);expect(plan.intent.type).toBe('interact');expect(plan.steps).toHaveLength(0);expect(g.state.turn).toBe(turn);
 });
});
describe('three resolutions and their costs',()=>{
 it('pays exactly once, spends one turn, and remembers the open bridge on later visits',()=>{
  const {g,q,p,r}=setup();p.gold=12;expect(g.action({type:'bridge',choice:'pay'})).toBe(true);expect(p.gold).toBe(4);expect(g.state.turn).toBe(1);expect(q.mode).toBe('paid');expect(g.action({type:'bridge',choice:'pay'})).toBe(false);
  g.visitWorld(0,0);g.visitWorld(r.rx,r.ry);expect(bridgeQuest(g)).toBe(q);expect(g.state.map[q.layout.center.y][q.layout.center.x]).toBe('=');expect(q.claimed).toBe(true);expect(p.gold).toBe(4);
 });
 it('rejects an unaffordable toll, an unknown choice, or remote interaction without spending anything',()=>{
  const {g,p}=setup();p.gold=7;expect(g.action({type:'bridge',choice:'pay'})).toBe(false);expect(p.gold).toBe(7);expect(g.action({type:'bridge',choice:'bogus'})).toBe(false);p.x=20;p.y=15;expect(g.action({type:'bridge',choice:'medicine'})).toBe(false);expect(g.state.turn).toBe(0);
 });
 it('accepts the medicine errand once, with reachable distinct guards and a journal objective',()=>{
  const {g,q}=setup();expect(g.action({type:'bridge',choice:'medicine'})).toBe(true);expect(g.state.turn).toBe(1);expect(q.accepted).toBe(true);expect(q.medicineSite).toBeTruthy();const guards=g.state.enemies.filter(e=>e.bridgeMedicineGuard===q.id);
  expect(guards).toHaveLength(2);expect(new Set(guards.map(p=>key(p.x,p.y))).size).toBe(2);expect(guards.every(e=>walkable(g.state.map,e.x,e.y))).toBe(true);expect(g.action({type:'bridge',choice:'medicine'})).toBe(false);
 });
 it('requires clearing the medicine guards, carries it outside the satchel, and delivers for passage',()=>{
  const {g,q,p}=setup();g.action({type:'bridge',choice:'medicine'});const medicine=g.state.items.find(i=>i.bridgeMedicine===q.id);Object.assign(p,{x:medicine.x,y:medicine.y});const turn=g.state.turn;
  expect(g.action({type:'pickup'})).toBe(false);expect(g.state.turn).toBe(turn);for(const e of g.state.enemies){e.hp=0;g.kill(e);}g.state.items=[medicine];p.inventory=Array.from({length:100},()=>({kind:'potion',name:'Tonic',size:[1,1]}));expect(g.action({type:'pickup'})).toBe(true);expect(p.inventory).toHaveLength(100);expect(q.medicine).toBe(true);
  const f=q.layout.forward;Object.assign(p,{x:q.layout.guard.x-f.x,y:q.layout.guard.y-f.y});expect(g.action({type:'bridge',choice:'deliver'})).toBe(true);expect(q.mode).toBe('medicine');expect(p.gold).toBe(8);expect(g.state.items.some(i=>i.bridgeMedicine===q.id)).toBe(false);expect(g.action({type:'bridge',choice:'deliver'})).toBe(false);
 });
 it('preserves medicine and its guards after leaving without rerolling or duplicating them',()=>{
  const {g,q,r}=setup();g.action({type:'bridge',choice:'medicine'});const site={...q.medicineSite};g.visitWorld(0,0);g.visitWorld(r.rx,r.ry);expect(bridgeQuest(g)).toBe(q);expect(q.medicineSite).toEqual(site);expect(g.state.items.filter(i=>i.bridgeMedicine===q.id)).toHaveLength(1);expect(g.state.enemies.filter(e=>e.bridgeMedicineGuard===q.id)).toHaveLength(2);
 });
 it('starts combat for one turn, gives each guard one action, and marks them human',()=>{
  const {g,q}=setup();expect(g.action({type:'bridge',choice:'fight'})).toBe(true);const guards=g.state.enemies.filter(e=>e.bridgeBandit);expect(guards).toHaveLength(2);expect(guards.map(e=>e.actions)).toEqual([1,1]);expect(guards.every(e=>characterDetails(g,e).race==='Human')).toBe(true);expect(q.claimed).toBe(false);expect(g.action({type:'bridge',choice:'pay'})).toBe(false);
 });
 it('requires both guards to fall before opening and keeps them defeated on return',()=>{
  const {g,q,r}=setup();g.action({type:'bridge',choice:'fight'});const guards=g.state.enemies.filter(e=>e.bridgeBandit);guards[0].hp=0;g.kill(guards[0]);expect(q.claimed).toBe(false);guards[1].hp=0;g.kill(guards[1]);expect(q.mode).toBe('fought');expect(q.claimed).toBe(true);g.visitWorld(0,0);g.visitWorld(r.rx,r.ry);expect(g.state.enemies.filter(e=>e.bridgeBandit&&e.hp>0)).toHaveLength(0);expect(g.state.map[q.layout.center.y][q.layout.center.x]).toBe('=');
 });
 it('allows switching from an unfinished errand to payment without leaving a free medicine reward',()=>{
  const {g,q}=setup();g.action({type:'bridge',choice:'medicine'});expect(g.action({type:'bridge',choice:'pay'})).toBe(true);expect(q.mode).toBe('paid');expect(g.state.items.some(i=>i.bridgeMedicine===q.id)).toBe(false);expect(g.state.enemies.some(e=>e.bridgeMedicineGuard===q.id)).toBe(false);
 });
 it('resets the crossing and its choices in a completely new run',()=>{
  const {g,q}=setup(3);g.action({type:'bridge',choice:'pay'});expect(q.claimed).toBe(true);const fresh=setup(3);expect(fresh.q.claimed).toBe(false);expect(fresh.q.mode).toBe('offer');
 });
});

it('the opened bridge carries Aldren along the same direct trail without overlaps',()=>{
 const {g,q,p,r}=setup();g.action({type:'bridge',choice:'pay'});const c=g.story.prince,f=q.layout.forward,center=q.layout.center;g.story.accepted=true;Object.assign(c,{mode:'follow',locationId:g.location.id,rx:r.rx,ry:r.ry,depth:0,x:center.x-f.x*3,y:center.y-f.y*3});Object.assign(p,{x:center.x-f.x*2,y:center.y-f.y*2});g.refresh();
 for(let i=0;i<4;i++)expect(g.action({type:'move',dx:f.x,dy:f.y})).toBe(true);expect(c.x).toBe(center.x+f.x);expect(c.y).toBe(center.y+f.y);expect(c.x===p.x&&c.y===p.y).toBe(false);
});
it('the barred gate also blocks projectiles without consuming ammunition or turns',()=>{
 const {g,q,p}=setup(),c=q.layout.center,f=q.layout.forward;Object.assign(p,{x:c.x-f.x,y:c.y-f.y});const e=g.makeEnemy('rat',{x:c.x+f.x*2,y:c.y+f.y*2},1,22);g.state.enemies=[e];g.refresh();const before=structuredClone(p.inventory);expect(g.action({type:'throw',x:e.x,y:e.y})).toBe(false);expect(g.state.turn).toBe(0);expect(p.inventory).toEqual(before);expect(e.actions).toBe(0);
});
