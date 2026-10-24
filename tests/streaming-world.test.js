import {describe,it,expect} from 'vitest';
import {SeamlessExpedition} from '../src/game/seamless-expedition.js';
import {mapBounds,key,walkable,directions} from '../src/game/dungeon.js';
import {regionInfo,worldId,startingForest} from '../src/game/world.js';
import {minimapCells,minimapFrame,worldMapCells} from '../src/minimap.js';
import {KINGDOM} from '../src/game/city.js';
import {locationPoint} from '../src/game/coordinates.js';
import {surveyMap} from '../src/game/items.js';
import {riverOffset} from '../src/game/surface-river.js';
const place=(g,p)=>{Object.assign(g.state.player,p);g.syncArea();g.refresh();};
const travelGame=seed=>{const g=new SeamlessExpedition(seed);g.actEnemy=e=>e.actions++;Object.assign(g.state.player,{hp:9999,maxHp:9999,attack:99});return g;};
function next(map,a,b){const margin=12,q=[{...a,first:null}],seen=new Set([key(a.x,a.y)]);for(let i=0;i<q.length;i++)for(const[dx,dy]of directions){const x=q[i].x+dx,y=q[i].y+dy,k=key(x,y);if(x<Math.min(a.x,b.x)-margin||x>Math.max(a.x,b.x)+margin||y<Math.min(a.y,b.y)-margin||y>Math.max(a.y,b.y)+margin||!walkable(map,x,y)||seen.has(k))continue;const first=q[i].first??{type:'move',dx,dy};if(x===b.x&&y===b.y)return first;seen.add(k);q.push({x,y,first});}throw Error('No route');}
function walk(g,target){for(let i=0;i<400&&(g.state.player.x!==target.x||g.state.player.y!==target.y);i++)g.action(next(g.state.map,g.state.player,target));expect(g.state.player).toMatchObject(target);}
describe('an expanding seamless surface',()=>{
 it('loads only a nearby ring without revealing or visiting it, and expands the same map object',()=>{
  const g=new SeamlessExpedition(5),s=g.state,map=s.map;expect(g.surfaceChunks.size).toBe(9);expect(g.visitedSurface.size).toBe(1);expect(s.regionsDiscovered).toBe(1);expect(s.enemies.some(e=>s.visible.has(key(e.x,e.y)))).toBe(false);place(g,{x:79,y:15});const count=g.surfaceChunks.size;g.action({type:'move',dx:1,dy:0});expect(s.map).toBe(map);expect(g.location.rx).toBe(2);expect(g.surfaceChunks.size).toBeGreaterThan(count);expect(mapBounds(map).maxX).toBeGreaterThan(120);expect(s.transition).toBe(false);
 });
 for(const [name,dx,dy]of [['east',1,0],['west',-1,0],['north',0,-1],['south',0,1]])it(`walks beyond three former areas ${name} and returns without regenerating terrain or resetting memory`,()=>{
  const g=travelGame(5),s=g.state,map=s.map,home=s.map[10][14];for(let i=1;i<=3;i++)walk(g,{x:20+dx*40*i,y:15+dy*30*i});const visited=new Set(g.visitedSurface),known=new Set(s.explored),chunks=g.surfaceChunks.size;for(let i=2;i>=0;i--)walk(g,{x:20+dx*40*i,y:15+dy*30*i});expect(s.map).toBe(map);expect(s.map[10][14]).toBe(home);expect(g.surfaceChunks.size).toBe(chunks);expect(g.visitedSurface).toEqual(visited);for(const k of known)expect(s.explored.has(k)).toBe(true);expect(g.visits.get(worldId(dx*3,dy*3))).toBe(1);
 });
 it('generates the same terrain and entity identities regardless of loading order',()=>{
  const a=new SeamlessExpedition(9),b=new SeamlessExpedition(9);a.loadChunk(2,0);a.loadChunk(3,0);b.loadChunk(3,0);b.loadChunk(2,0);a.loadAround(100,15);b.loadAround(100,15);const x=a.surfaceChunks.get('world:2,0'),y=b.surfaceChunks.get('world:2,0');expect(x.map).toEqual(y.map);expect(x.enemies.map(e=>[e.id,e.kind,e.x,e.y])).toEqual(y.enemies.map(e=>[e.id,e.kind,e.x,e.y]));expect(new Set(a.state.enemies.map(e=>e.id)).size).toBe(a.state.enemies.length);
 });
 it('keeps dormant creatures still, awards one wait per action, and never catches them up on return',()=>{
  const g=new SeamlessExpedition(5),far=g.state.enemies.find(e=>Math.max(Math.abs(e.x-20),Math.abs(e.y-15))>24&&!e.territory),pos={x:far.x,y:far.y};expect(far).toBeTruthy();g.action({type:'wait'});g.action({type:'wait'});expect({x:far.x,y:far.y}).toEqual(pos);expect(far.actions).toBe(2);g.refresh();expect(far.actions).toBe(2);place(g,{x:far.x+1,y:far.y});const before=far.actions;g.action({type:'wait'});expect(far.actions).toBe(before+1);
 });
 it('keeps drops, damage and quest markers after streaming many other areas',()=>{
  const g=travelGame(5),s=g.state;place(g,{x:45,y:15});const e=s.enemies.find(e=>e.originArea==='world:1,0');e.hp=0;g.kill(e);const gold={kind:'gold',name:'Dropped purse',amount:2,x:45,y:15};s.items.push(gold);const q=g.quests.get('trailwarden');q.accepted=true;g.refresh();expect(s.surfaceMarkers.some(m=>m.quest)).toBe(true);place(g,{x:-100,y:110});place(g,{x:45,y:15});expect(e.hp).toBe(0);expect(s.items.includes(gold)).toBe(true);expect(g.visits.get('world:1,0')).toBe(1);
 });
 it('uses the defeated creature’s source biome for loot even when it was lured to camp',()=>{
  const g=new SeamlessExpedition(5);let r;for(let x=2;x<30;x++)if(regionInfo(5,x,2).biome==='highlands'){r={rx:x,ry:2};break;}g.loadChunk(r.rx,r.ry);const e={...g.makeEnemy('wolf',{x:21,y:15},6,900),hp:0,originArea:worldId(r.rx,r.ry)};g.state.enemies.push(e);g.state.items=[];g.rng.next=()=>.5;g.kill(e);expect(g.state.items.some(i=>i.tier===3)).toBe(true);expect(g.state.biome).toBe('forest');expect(g.state.danger).toBe(1);
 });
 it('charts the surrounding biomes without generating more chunks or revealing their occupants',()=>{
  const g=new SeamlessExpedition(5),count=g.surfaceChunks.size,visited=g.visitedSurface.size,known=new Set(g.state.explored);g.state.player.inventory.push(surveyMap());expect(g.action({type:'use',index:g.state.player.inventory.length-1})).toBe(true);expect(g.surveyedRegions.size).toBe(25);expect(g.surfaceChunks.size).toBe(count);expect(g.visitedSurface.size).toBe(visited);expect(g.state.explored).toEqual(known);expect(g.state.player.inventory.some(i=>i.kind==='surveyMap')).toBe(false);
 });
 it('keeps the nearby map bounded and handles a distant sparse cache without scanning the whole rectangle',()=>{
  const g=new SeamlessExpedition(5);place(g,{x:10020,y:-10005});const cells=minimapCells(g.state),near=minimapFrame(g.state,'local'),world=minimapFrame(g.state,'world');expect(cells.length).toBeLessThan(3000);expect(near.maxX-near.minX).toBe(40);expect(near.maxY-near.minY).toBe(30);expect(world.minY).toBeLessThan(-9000);expect(g.state.map[-500][500]).toBe('#');expect(g.surfaceChunks.size).toBe(18);
 });
});
describe('continuous rivers and Northwatch',()=>{
 it('continues the quest river through adjacent regions in every orientation with reachable ordinary crossings',()=>{
  for(const seed of [1,2,3,5]){const g=new SeamlessExpedition(seed),f=g.forest;for(let i=-3;i<=3;i++)g.loadChunk(f.rx?f.rx:i,f.ry?f.ry:i);g.state.map.refreshBounds();const cx=f.rx*40+20-f.rx*8,cy=f.ry*30+15-f.ry*7;for(let v=-80;v<=80;v++){const u=riverOffset(v),x=cx+u*f.rx-v*f.ry,y=cy+u*f.ry+v*f.rx;expect(['~',':','=','X']).toContain(g.state.map[y][x]);}
   for(const a of g.surfaceChunks.values())if(a.riverForward&&!a.bridgeLayout){const pass=a.map.flat().filter(t=>t==='=').length;expect(pass).toBeGreaterThanOrEqual(3);}
  }
 });
 it('completes Aldren’s escort at the global keep and supports the city inn and bounty board',()=>{
  const g=travelGame(5),keep=locationPoint(g,KINGDOM.keep,KINGDOM),c=g.story.prince;g.story.accepted=true;Object.assign(c,{x:keep.x-1,y:keep.y,mode:'follow',locationId:'world:0,-6',rx:0,ry:-6});place(g,keep);const before=g.state.player.gold;expect(g.action({type:'wait'})).toBe(true);expect(g.story.complete).toBe(true);expect(g.state.player.gold).toBe(before+30);expect(g.story.keepsakeClaimed).toBe(true);g.action({type:'wait'});expect(g.state.player.gold).toBe(before+30);
  place(g,locationPoint(g,{x:9,y:9},KINGDOM));Object.assign(g.state.player,{hp:2,mana:0});expect(g.action({type:'innRest'})).toBe(true);expect(g.state.player.hp).toBe(g.state.player.maxHp);place(g,locationPoint(g,{x:23,y:15},KINGDOM));expect(g.action({type:'acceptBounty',id:0})).toBe(true);g.killCounts.rat=6;expect(g.action({type:'claimBounty',id:0})).toBe(true);
 });
 it('adds rescued citizens to a city that was already prepared, once, at global positions',()=>{
  const g=new SeamlessExpedition(5);g.loadChunk(0,-6);g.rescued.push({name:'Test traveler'});place(g,{x:20,y:-155});const citizen=g.state.encounters.find(e=>e.id==='rescued:0');expect(citizen).toMatchObject({x:28,y:-164});expect(g.state.map[-164][28]).toBe('V');place(g,{x:20,y:15});place(g,{x:20,y:-155});expect(g.state.encounters.filter(e=>e.id==='rescued:0')).toHaveLength(1);
 });
 it('warns about a more dangerous biome without adding repeated warnings for identical woods',()=>{
  const g=new SeamlessExpedition(5);let r;for(let y=-2;y<=2&&!r;y++)for(let x=-2;x<=2;x++)if(regionInfo(5,x,y).biome!==regionInfo(5,x+1,y).biome){r={x,y};break;}place(g,{x:r.x*40+38,y:r.y*30+15});expect(g.borderPreview()).toBeTruthy();
 });
});
it('moves an accepted quest marker back to its giver and marks a separated companion',()=>{
 const g=new SeamlessExpedition(5),q=g.quests.get('trailwarden');q.accepted=true;g.refresh();expect(g.state.surfaceMarkers.some(m=>m.quest)).toBe(true);q.complete=true;g.refresh();expect(g.state.surfaceMarkers.find(m=>m.label==='✓')).toMatchObject({x:18,y:14});q.claimed=true;g.story.accepted=true;g.story.prince.mode='stay';place(g,{x:200,y:200});expect(g.state.surfaceMarkers.find(m=>m.label==='A')).toMatchObject({x:24,y:17});
});
it('keeps encounter identities unique and awards the correct den when several areas are loaded',()=>{
 const g=new SeamlessExpedition(5),events=g.state.encounters;expect(new Set(events.map(e=>e.id)).size).toBe(events.length);const dens=events.filter(e=>e.type==='den');expect(dens.length).toBeGreaterThanOrEqual(2);const first=dens[0],target=dens[1],owner=g.state.enemies.find(e=>e.eventId===target.id);expect(owner).toBeTruthy();owner.hp=0;g.kill(owner);expect(target.used).toBe(true);expect(first.used).toBe(false);expect(g.state.items.some(i=>i.name===owner.name+'’s hoard'&&i.x===owner.x&&i.y===owner.y)).toBe(true);
});
