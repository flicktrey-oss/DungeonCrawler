import {describe,it,expect} from 'vitest';
import {SeamlessExpedition} from '../src/game/seamless-expedition.js';
import {Expedition} from '../src/game/expedition.js';
import {mapBounds,walkable,key,directions} from '../src/game/dungeon.js';
import {startingForest,worldId} from '../src/game/world.js';
import {bridgeQuest} from '../src/game/bridge.js';
import {minimapCells,minimapFrame} from '../src/minimap.js';
import {planTravel} from '../src/game/travel.js';
import {surveyMap,shortSword} from '../src/game/items.js';
const edge=g=>({x:g.forest.rx>0?39:g.forest.rx<0?0:20,y:g.forest.ry>0?29:g.forest.ry<0?0:15});
const place=(g,p)=>{Object.assign(g.state.player,p);g.syncArea();g.refresh();};
const advance=g=>g.action({type:'move',dx:g.forest.rx,dy:g.forest.ry});
const back=g=>g.action({type:'move',dx:-g.forest.rx,dy:-g.forest.ry});
const withoutEnemies=g=>{g.state.enemies=[];return g;};
function path(map,a,b){const q=[{...a,steps:[]}],seen=new Set([key(a.x,a.y)]);for(let i=0;i<q.length;i++){const n=q[i];if(n.x===b.x&&n.y===b.y)return n.steps;for(const[dx,dy]of directions){const x=n.x+dx,y=n.y+dy,k=key(x,y);if(walkable(map,x,y)&&!seen.has(k)){seen.add(k);q.push({x,y,steps:[...n.steps,{type:'move',dx,dy}]});}}}throw Error('Unreachable');}
describe('shared camp and forest surface',()=>{
 it('uses seeded global coordinates in all four orientations and joins reachable terrain, with no identity swap at the seam',()=>{
  const seen=new Set();for(let seed=0;seed<40;seed++){const g=new SeamlessExpedition(seed),f=g.forest,s=g.state;seen.add(key(f.rx,f.ry));const map=s.map,e=edge(g),b=mapBounds(map);expect(b.maxX-b.minX).toBeGreaterThanOrEqual(120);expect(b.maxY-b.minY).toBeGreaterThanOrEqual(90);for(const a of s.encounters)expect(directions.some(([dx,dy])=>walkable(map,a.x+dx,a.y+dy))).toBe(true);path(map,{x:20,y:15},e);place(g,e);expect(advance(g)).toBe(true);expect(s.map).toBe(map);expect(s.player.x).toBe(e.x+f.rx);expect(s.player.y).toBe(e.y+f.ry);expect(s.transition).toBe(false);expect(s.turn).toBe(1);expect(s.enemies.every(e=>e.actions===1)).toBe(true);expect(back(g)).toBe(true);expect(s.map).toBe(map);expect(s.turn).toBe(2);}
  expect(seen.size).toBe(4);
 });
 it('does not discover the preloaded forest or reveal its unseen encounters before approaching',()=>{
  const g=new SeamlessExpedition(3),f=g.forest;expect(g.state.regionsDiscovered).toBe(1);expect(g.visitedSurface.size).toBe(1);expect(minimapCells(g.state).every(c=>c.x>=0&&c.x<40&&c.y>=0&&c.y<30)).toBe(true);expect(g.state.enemies.every(e=>!g.state.visible.has(key(e.x,e.y)))).toBe(true);
 });
 it('preserves health, inventory, deaths, drops and exploration when returning instead of respawning enemies',()=>{
  const g=new SeamlessExpedition(5),s=g.state,p=s.player;place(g,edge(g));advance(g);p.hp=23;p.gold=51;const item=shortSword();p.inventory.push(item);p.weapon=item;const enemy=s.enemies[0],foe=s.enemies[1];enemy.hp=0;foe.hp--;const hp=foe.hp,objects=s.enemies,known=new Set(s.explored);s.items.push({kind:'gold',name:'Test purse',amount:3,x:40,y:15});const items=s.items;back(g);advance(g);expect(s.enemies).toBe(objects);expect(s.items).toBe(items);expect(enemy.hp).toBe(0);expect(foe.hp).toBe(hp);expect(p.inventory.includes(item)).toBe(true);expect(p.weapon).toBe(item);expect(p.hp).toBe(23);expect(p.gold).toBe(51);for(const k of known)expect(s.explored.has(k)).toBe(true);
 });
 it('supports cross-seam visibility, targeting and one-turn enemy pursuit without an arrival grace turn',()=>{
  const g=withoutEnemies(new SeamlessExpedition(5)),s=g.state;place(g,{x:39,y:15});const e=g.makeEnemy('rat',{x:41,y:15},1,999);s.enemies=[e];g.refresh();expect(s.visible.has('41,15')).toBe(true);const before=s.player.hp;expect(advance(g)).toBe(true);expect(e.actions).toBe(1);expect(s.player.hp).toBeLessThan(before);expect(e.x).toBe(41);expect(back(g)).toBe(true);expect(e.actions).toBe(2);expect(e.x).toBe(40);
 });
 it('lets a pursuer cross the seam and attack without moving through other living units',()=>{
  const g=withoutEnemies(new SeamlessExpedition(3)),s=g.state;place(g,{x:0,y:15});const e=g.makeEnemy('rat',{x:-2,y:15},1,999);s.enemies=[e];g.action({type:'wait'});expect(e.x).toBe(-1);g.action({type:'wait'});expect(e.actions).toBe(2);expect(s.player.hp).toBeLessThan(32);expect(e.x).toBe(-1);
 });
 it('keeps waiting and idle inspection from adding extra turns, and rejects walls and unavailable crypts for free',()=>{
  const g=new SeamlessExpedition(1),s=g.state,actions=s.enemies.map(e=>e.actions);for(let i=0;i<5;i++){g.refresh();minimapCells(s);minimapFrame(s);}expect(s.turn).toBe(0);expect(s.enemies.map(e=>e.actions)).toEqual(actions);place(g,{x:18,y:16});expect(g.action({type:'move',dx:-1,dy:0})).toBe(false);expect(s.turn).toBe(0);expect(g.action({type:'descend'})).toBe(false);expect(s.turn).toBe(0);s.player.inventory.push(surveyMap());expect(g.action({type:'use',index:s.player.inventory.length-1})).toBe(true);expect(s.player.inventory.some(i=>i.kind==='surveyMap')).toBe(false);
 });
 it('keeps map writes authoritative in their region and lets click travel cross the old boundary',()=>{
  const g=withoutEnemies(new SeamlessExpedition(3)),s=g.state;place(g,{x:0,y:15});const map=s.map;s.map[15][-2]='.';expect(g.surfaceChunks.get('world:-1,0').map[15][38]).toBe('.');const plan=planTravel(g,-3,15);expect(plan.steps).toHaveLength(3);for(const step of plan.steps)g.action({type:'move',dx:step.x-s.player.x,dy:step.y-s.player.y});expect(s.player.x).toBe(-3);expect(s.map).toBe(map);expect(s.turn).toBe(3);
 });
 it('expands the continuous minimap with exploration but retains the camp map when in the forest',()=>{
  const g=withoutEnemies(new SeamlessExpedition(3)),before=minimapFrame(g.state);place(g,{x:0,y:15});advance(g);const after=minimapFrame(g.state);expect(after.minX).toBeLessThan(before.minX);expect(minimapCells(g.state).some(c=>c.x===20&&c.y===15&&c.tile==='C')).toBe(true);const known=after.minX;back(g);expect(minimapFrame(g.state).minX).toBeLessThanOrEqual(known);
 });
});
describe('companions, camp services and quests on a shared surface',()=>{
 it('keeps Aldren following across the seam one action at a time, and supports Stay without teleporting him',()=>{
  for(const seed of [1,2,3,5]){const g=withoutEnemies(new SeamlessExpedition(seed)),c=g.story.prince,f=g.forest,e=edge(g);place(g,e);g.story.accepted=true;Object.assign(c,{x:e.x-f.rx,y:e.y-f.ry,mode:'follow',actions:0});g.refresh();advance(g);expect(c.x).toBe(e.x);expect(c.y).toBe(e.y);advance(g);expect(c.x).toBe(e.x+f.rx);expect(c.y).toBe(e.y+f.ry);expect(g.state.companion).toBe(c);expect(c.actions).toBe(2);expect(g.action({type:'princeStay'})).toBe(true);const pos={x:c.x,y:c.y};advance(g);expect({x:c.x,y:c.y}).toEqual(pos);expect(g.princeHere()).toBe(c);}
 });
 it('preserves camp trading and equipment and offers world charts',()=>{
  const g=withoutEnemies(new SeamlessExpedition(3));place(g,{x:22,y:15});expect(g.shop.some(o=>o.id==='survey')).toBe(true);expect(g.action({type:'buy',id:'shortsword'})).toBe(true);expect(g.state.player.gold).toBe(0);expect(g.action({type:'equip',index:g.state.player.inventory.findIndex(i=>i.kind==='weapon')})).toBe(true);expect(g.state.player.weapon.name).toBe('Worn shortsword');place(g,edge(g));advance(g);back(g);expect(g.state.player.weapon.name).toBe('Worn shortsword');
 });
 it('places newly accepted camp objectives in the already-preloaded forest for hunt, recovery and ward quests',()=>{
  const kinds=new Set();for(let seed=1;seed<=30;seed++){const g=withoutEnemies(new SeamlessExpedition(seed)),q=g.quests.get('trailwarden');kinds.add(q.kind);place(g,{x:18,y:15});expect(g.action({type:'acceptQuest'})).toBe(true);expect(q.placed).toBe(true);const targets=[...g.state.enemies.filter(e=>e.questKey===q.id),...g.state.items.filter(i=>i.questKey===q.id),...g.state.encounters.filter(e=>e.quest===q&&e.wardIndex!==undefined)];expect(targets.length).toBeGreaterThan(0);for(const t of targets){const a=g.areaAt(t.x,t.y);expect(a.rx).toBe(g.forest.rx);expect(a.ry).toBe(g.forest.ry);expect(walkable(g.state.map,t.x,t.y)).toBe(true);}}
  expect(kinds.size).toBe(3);
 });
 it('keeps bridge payment and medicine sites in global forest coordinates in every orientation',()=>{
  for(const seed of [1,2,3,5]){const g=withoutEnemies(new SeamlessExpedition(seed)),a=g.surfaceChunks.get(worldId(g.forest.rx,g.forest.ry)),layout=a.bridgeLayout;place(g,{x:layout.guard.x-layout.forward.x,y:layout.guard.y-layout.forward.y});expect(g.action({type:'bridge',choice:'medicine'})).toBe(true);const q=bridgeQuest(g),site=q.medicineSite;expect(g.areaAt(site.x,site.y)).toBe(a);expect(g.action({type:'bridge',choice:'pay'})).toBe(true);expect(g.state.map[layout.center.y][layout.center.x]).toBe('=');expect(a.map[layout.center.y-a.ry*30][layout.center.x-a.rx*40]).toBe('=');}
 });
 it('still completes and rewards a local quest when its final enemy is killed on the camp side',()=>{
  const g=withoutEnemies(new SeamlessExpedition(5)),a=g.surfaceChunks.get('world:1,0'),q=a.quest;expect(q).toBeTruthy();q.accepted=true;g.quests.set(q.id,q);const e={...g.makeEnemy('pondFrog',{x:39,y:15},1,999),questId:q.id,originArea:'world:1,0',hp:0};g.state.enemies=[e];g.kill(e);expect(q.complete).toBe(true);expect(g.state.quest).toBeNull();
 });
 it('keeps standard Expedition on its original maps and resets the preview on a new run',()=>{
  const g=new Expedition(3);expect(g.state.seamless).toBeUndefined();expect(g.state.map.bounds).toBeUndefined();expect(g.shop.some(o=>o.id==='survey')).toBe(true);const a=new SeamlessExpedition(3);place(a,edge(a));advance(a);const fresh=new SeamlessExpedition(3);expect(fresh.state.player).toMatchObject({x:20,y:15,hp:32,gold:8});expect(fresh.visitedSurface.size).toBe(1);
 });
});

it('resolves an existing telegraph when the player crosses the seam and preserves timed abilities',()=>{
 const g=withoutEnemies(new SeamlessExpedition(5)),s=g.state;place(g,{x:39,y:15});const e=g.makeEnemy('frog',{x:41,y:15},1,999);s.enemies=[e];g.refresh();g.action({type:'wait'});expect(e.intent.kind).toBe('tongue');s.mindVisionUntil=8;s.detectCreaturesUntil=7;const hp=s.player.hp;advance(g);expect(s.player.hp).toBeLessThan(hp);expect(e.actions).toBe(2);expect(e.intent).toBeNull();expect(s.mindVisionUntil).toBe(8);expect(s.detectCreaturesUntil).toBe(7);
});
it('rekindles preloaded forest wards and claims the reward back at camp in negative coordinates',()=>{
 let g;for(let seed=1;seed<80;seed++){const f=startingForest(seed);if(f.rx>=0&&f.ry>=0)continue;const candidate=withoutEnemies(new SeamlessExpedition(seed));if(candidate.quests.get('trailwarden').kind==='ward'){g=candidate;break;}}expect(g).toBeTruthy();place(g,{x:18,y:15});g.action({type:'acceptQuest'});const q=g.quests.get('trailwarden'),stones=g.state.encounters.filter(e=>e.quest===q&&e.wardIndex!==undefined);expect(stones).toHaveLength(3);for(const stone of stones){place(g,stone);expect(g.action({type:'activateWard'})).toBe(true);}const sentinel=g.state.enemies.find(e=>e.questKey===q.id);expect(sentinel).toBeTruthy();expect(g.areaAt(sentinel.x,sentinel.y).home).toBe(false);expect(walkable(g.state.map,sentinel.x,sentinel.y)).toBe(true);sentinel.hp=0;g.kill(sentinel);expect(q.complete).toBe(true);place(g,{x:18,y:15});expect(g.action({type:'claimQuest'})).toBe(true);expect(q.claimed).toBe(true);
});
