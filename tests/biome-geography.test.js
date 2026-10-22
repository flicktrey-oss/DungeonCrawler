import {describe,it,expect} from 'vitest';
import {Random} from '../src/game/random.js';
import {Expedition} from '../src/game/expedition.js';
import {BIOMES,biomeAt,generateWorldRegion,startingForest,startingFrontier} from '../src/game/world.js';
import {ITEM_CATALOG,itemReward} from '../src/game/loot.js';
import {worldMapCells} from '../src/minimap.js';
const neighbors=[{rx:1,ry:0},{rx:-1,ry:0},{rx:0,ry:1},{rx:0,ry:-1}];

describe('seeded nonlinear biome geography',()=>{
 it('always provides an adjacent forest and varies the safe starting direction across runs',()=>{
  const directions=new Set();
  for(let seed=0;seed<200;seed++){
   const safe=startingForest(seed);directions.add(`${safe.rx},${safe.ry}`);
   expect(Math.abs(safe.rx)+Math.abs(safe.ry)).toBe(1);
   expect(biomeAt(safe.rx,safe.ry,seed)).toBe('forest');
   expect(biomeAt(0,0,seed)).toBe('forest');
   expect(neighbors.some(p=>biomeAt(p.rx,p.ry,seed)==='forest')).toBe(true);
  }
  expect(directions.size).toBe(4);
 });
 it('keeps a connected low-to-moderate frontier beyond the first forest without fixing its direction',()=>{
  const routes=new Set();
  for(let seed=0;seed<200;seed++){
   const safe=startingForest(seed),next=startingFrontier(seed);routes.add(`${safe.rx},${safe.ry}:${next.rx},${next.ry}`);
   expect(Math.abs(next.rx-safe.rx)+Math.abs(next.ry-safe.ry)).toBe(1);expect(Math.abs(next.rx)+Math.abs(next.ry)).toBe(2);
   expect(['forest','marsh']).toContain(next.biome);expect(biomeAt(next.rx,next.ry,seed)).toBe(next.biome);
  }
  expect(routes.size).toBeGreaterThan(4);
 });
 it('allows genuinely dangerous neighbors and forests far beyond the starting area',()=>{
  let dangerousNeighbor=false,distantForest=false;
  const nearbyKinds=new Set();
  for(let seed=1;seed<=120;seed++){
   for(const p of neighbors){const kind=biomeAt(p.rx,p.ry,seed);nearbyKinds.add(kind);if(['highlands','ashlands'].includes(kind))dangerousNeighbor=true;}
   for(const [rx,ry]of [[9,0],[-12,3],[5,-8],[20,17]])if(biomeAt(rx,ry,seed)==='forest')distantForest=true;
  }
  expect(dangerousNeighbor).toBe(true);expect(distantForest).toBe(true);expect(nearbyKinds.size).toBeGreaterThanOrEqual(3);
 });
 it('is reproducible independently of visit order, negative coordinates, and neighboring generation',()=>{
  const coords=[{rx:-21,ry:34},{rx:1,ry:0},{rx:17,ry:-8},{rx:0,ry:-1}];
  for(const seed of [1,5,77]){
   const before=coords.map(p=>({biome:biomeAt(p.rx,p.ry,seed),map:generateWorldRegion(seed,p.rx,p.ry).map}));
   for(const p of [...coords].reverse())generateWorldRegion(seed,p.rx+200,p.ry-200);
   expect(coords.map(p=>({biome:biomeAt(p.rx,p.ry,seed),map:generateWorldRegion(seed,p.rx,p.ry).map}))).toEqual(before);
  }
 });
 it('keeps a region biome fixed when inhabitants repopulate',()=>{
  for(let seed=1;seed<=30;seed++)for(const p of [{rx:1,ry:0},{rx:-3,ry:2}]){
   const first=generateWorldRegion(seed,p.rx,p.ry),again=generateWorldRegion(seed,p.rx,p.ry,3);
   expect(again.biome).toBe(first.biome);expect(again.danger).toBe(first.danger);expect(again.recommended).toBe(first.recommended);expect(again.baseMap).toEqual(first.baseMap);
  }
 });
 it('uses the actual seeded biome consistently for threats, world-map colors and crypt difficulty',()=>{
  for(const seed of [2,5,16,31])for(const p of neighbors){
   const g=new Expedition(seed),kind=biomeAt(p.rx,p.ry,seed),info=BIOMES[kind];g.visitWorld(p.rx,p.ry);
   expect(g.state.biome).toBe(kind);expect(g.state.danger).toBe(info.danger);expect(g.state.recommended).toBe(info.recommended);
   expect(worldMapCells(g).find(c=>c.rx===p.rx&&c.ry===p.ry)).toMatchObject({biome:kind,visited:true});
   g.visitCrypt(p.rx,p.ry,1);expect(g.state.biome).toBe(kind);expect(g.state.danger).toBe(info.danger+1);expect(g.state.recommended).toBe(info.recommended+2);
  }
 });
 it('gives every camp quest an accessible forest destination without requiring high-level travel',()=>{
  for(let seed=1;seed<=100;seed++){
   const g=new Expedition(seed),q=g.quests.get('trailwarden');
   expect(biomeAt(q.region.rx,q.region.ry,seed)).toBe('forest');expect(Math.abs(q.region.rx)+Math.abs(q.region.ry)).toBe(1);
   Object.assign(g.state.player,{x:18,y:15});expect(g.action({type:'acceptQuest'})).toBe(true);
   g.visitWorld(q.region.rx,q.region.ry);expect(g.state.biome).toBe('forest');expect(q.placed).toBe(true);expect(g.state.player.level).toBe(1);
  }
 });
 it('warns about a dangerous border before entry and permits retreat without an enemy ambush',()=>{
  let sample;for(let seed=1;seed<=120&&!sample;seed++)for(const p of neighbors)if(biomeAt(p.rx,p.ry,seed)==='highlands'){sample={seed,...p};break;}
  expect(sample).toBeTruthy();const g=new Expedition(sample.seed),p=g.state.player;
  Object.assign(p,{x:sample.rx===1?38:sample.rx===-1?1:20,y:sample.ry===1?28:sample.ry===-1?1:15});
  expect(g.action({type:'move',dx:sample.rx,dy:sample.ry})).toBe(true);expect(g.location.rx).toBe(0);expect(g.location.ry).toBe(0);
  expect(g.state.log.at(-1)).toContain(BIOMES.highlands.name);expect(g.state.log.at(-1)).toContain('OVERWHELMING');
  const turn=g.state.turn;expect(g.borderPreview()).toMatchObject({rx:sample.rx,ry:sample.ry,biome:'highlands'});expect(g.state.turn).toBe(turn);
  expect(g.action({type:'move',dx:sample.rx,dy:sample.ry})).toBe(true);const foes=g.state.enemies;
  expect(foes.every(e=>e.actions===0)).toBe(true);expect(p.hp).toBe(32);
  expect(g.action({type:'move',dx:-sample.rx,dy:-sample.ry})).toBe(true);expect(g.location.id).toBe('world:0,0');expect(foes.every(e=>e.actions===0)).toBe(true);expect(p.hp).toBe(32);
 });
 it('makes early mountain creatures strong at player level one and keeps loot eligibility tied to the region',()=>{
  let sample;for(let seed=1;seed<=120&&!sample;seed++)for(const p of neighbors)if(biomeAt(p.rx,p.ry,seed)==='highlands'){sample={seed,...p};break;}
  expect(sample).toBeTruthy();const g=new Expedition(sample.seed);g.visitWorld(sample.rx,sample.ry);
  expect(g.state.player.level).toBe(1);expect(g.state.recommended).toBe(BIOMES.highlands.recommended);
  const locals=g.state.enemies.filter(e=>BIOMES.highlands.enemies.includes(e.kind));expect(locals.length).toBeGreaterThan(0);expect(locals.some(e=>e.attack>=12)).toBe(true);
  const rng=new Random(42);for(let n=0;n<100;n++){
   const reward=itemReward(rng,g.state.danger,'crypt'),entry=ITEM_CATALOG.find(e=>e.id===reward.id);
   expect(entry).toBeTruthy();expect(entry.minDanger).toBeLessThanOrEqual(g.state.danger);
  }
 });
});
