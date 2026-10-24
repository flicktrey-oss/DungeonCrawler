import {describe,it,expect} from 'vitest';
import {generateWorldRegion,CAMP} from '../src/game/world.js';
import {Expedition} from '../src/game/expedition.js';
import {key,walkable,directions} from '../src/game/dungeon.js';
import {minimapCells} from '../src/minimap.js';
import {updateVisibility} from '../src/game/visibility.js';
function reachable(map){const seen=new Set([key(CAMP.x,CAMP.y)]),queue=[CAMP];for(let i=0;i<queue.length;i++)for(const [dx,dy]of directions){const p={x:queue[i].x+dx,y:queue[i].y+dy},k=key(p.x,p.y);if(walkable(map,p.x,p.y)&&!seen.has(k)){seen.add(k);queue.push(p);}}return seen;}
describe('persistent landscapes and visit layers',()=>{
 it('keeps terrain, scenery and crypt entrances fixed across varied visits while all paths and spawns remain valid',()=>{
  for(let seed=0;seed<40;seed++){
   const first=generateWorldRegion(seed,seed%9-4,2),terrain=structuredClone(first.baseMap);
   for(let visit=1;visit<5;visit++){
    const d=generateWorldRegion(seed,seed%9-4,2,visit),seen=reachable(d.map);
    expect(d.baseMap).toEqual(terrain);expect(d.scenery).toEqual(first.scenery);expect(d.entrance?.x).toBe(first.entrance?.x);expect(d.entrance?.y).toBe(first.entrance?.y);
    for(let y=0;y<30;y++)for(let x=0;x<40;x++)if(walkable(d.map,x,y))expect(seen.has(key(x,y))).toBe(true);
    expect(d.encounters.length).toBeGreaterThanOrEqual(1);expect(d.encounters.length).toBeLessThanOrEqual(2);
    const positions=d.spawns.map(e=>key(e.x,e.y));expect(new Set(positions).size).toBe(positions.length);
    for(const e of d.spawns)expect(seen.has(key(e.x,e.y))).toBe(true);
    for(const e of d.encounters)expect(e.type==='villager'?directions.some(([dx,dy])=>seen.has(key(e.x+dx,e.y+dy))):seen.has(key(e.x,e.y))).toBe(true);
   }
  }
 });
 it('randomizes quest locations across visits, regions and runs without changing the terrain seed',()=>{
  const locations=new Set(),regions=new Set();
  for(let seed=1;seed<=12;seed++)for(let rx=1;rx<=3;rx++)for(let visit=0;visit<6;visit++){
   const d=generateWorldRegion(seed,rx,0,visit);for(const e of d.encounters)if(e.type==='villager'){locations.add(key(e.x,e.y));regions.add(rx);}
  }
  expect(locations.size).toBeGreaterThan(4);expect(regions.size).toBe(3);expect(generateWorldRegion(7,2,0,3)).toEqual(generateWorldRegion(7,2,0,3));expect(generateWorldRegion(8,2,0).baseMap).not.toEqual(generateWorldRegion(7,2,0).baseMap);
 });
 it('retains explored minimap squares out of sight on return, respawns foes, and resets a new run',()=>{
  const g=new Expedition(9);g.visitWorld(1,0,{x:0,y:15});const p=g.state.player;
  let point;for(let y=5;y<25&&!point;y++)for(let x=20;x<35;x++)if(g.state.map[y][x]==='.'){point={x,y};break;}
  Object.assign(p,point);g.refresh();const k=key(point.x,point.y);expect(g.state.explored.has(k)).toBe(true);g.state.enemies.forEach(e=>e.hp=0);
  g.visitWorld(0,0);g.visitWorld(1,0,{x:0,y:15});expect(g.state.visible.has(k)).toBe(false);expect(minimapCells(g.state).find(c=>key(c.x,c.y)===k)).toMatchObject({tile:'.',visible:false});expect(g.state.enemies.every(e=>e.hp>0)).toBe(true);expect(new Expedition(9).regions.has('world:1,0')).toBe(false);
 });
 it('does not disclose freshly randomized encounters through remembered terrain',()=>{
  const baseMap=Array.from({length:5},()=>Array(5).fill('.')),map=baseMap.map(row=>[...row]);map[2][2]='V';
  const state={map,baseMap,encounters:[{type:'villager',x:2,y:2}],encounterSeen:new Set(),explored:new Set(['2,2']),visible:new Set(),player:{x:0,y:0},turn:1,mindVisionUntil:0};
  expect(minimapCells(state)[0]).toMatchObject({tile:'.',visible:false});updateVisibility(state);expect(minimapCells(state).find(c=>c.x===2&&c.y===2).tile).toBe('V');state.visible.clear();expect(minimapCells(state).find(c=>c.x===2&&c.y===2)).toMatchObject({tile:'V',visible:false});
 });
 it('preserves crypt layout, stairs and exploration while repopulating each floor',()=>{
  const g=new Expedition(12);g.visitCrypt(1,0,1);const map=structuredClone(g.state.map),stairs={...g.state.stairs};g.state.explored.add('39,29');g.state.enemies.forEach(e=>e.hp=0);const p=structuredClone(g.state.player);
  g.visitCrypt(1,0,2);g.visitCrypt(1,0,1,'stairs');expect(g.state.map).toEqual(map);expect(g.state.stairs).toEqual(stairs);expect(g.state.explored.has('39,29')).toBe(true);expect(g.state.enemies.every(e=>e.hp>0)).toBe(true);expect(g.state.player.inventory).toEqual(p.inventory);expect(g.state.player.hp).toBe(p.hp);
 });
});

describe('known haven maps',()=>{
 it('reveals every camp and Northwatch map cell without changing exploration, visibility or turns',()=>{
  const g=new Expedition(5);
  for(const city of [false,true]){if(city)g.visitWorld(0,-6);const before=structuredClone(g.state);const cells=minimapCells(g.state);expect(cells).toHaveLength(1200);expect(cells.every(c=>c.visible)).toBe(true);expect(cells.find(c=>c.x===0&&c.y===0).tile).toBe(g.state.map[0][0]);expect(g.state).toEqual(before);}
 });
 it('keeps wilderness fogged even though the safe destinations are known',()=>{
  const g=new Expedition(5);g.visitWorld(1,0);expect(minimapCells(g.state).length).toBeLessThan(1200);expect(minimapCells(g.state).length).toBe(g.state.explored.size);
 });
});
