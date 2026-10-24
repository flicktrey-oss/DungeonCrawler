import {describe,it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import {CAMP_BUILDINGS} from '../src/game/camp-layout.js';
import {key,directions,walkable} from '../src/game/dungeon.js';
import {generateWorldRegion} from '../src/game/world.js';
function reachable(map){const seen=new Set(['20,15']),q=[{x:20,y:15}];for(let i=0;i<q.length;i++)for(const[dx,dy]of directions){const x=q[i].x+dx,y=q[i].y+dy,k=key(x,y);if(walkable(map,x,y)&&!seen.has(k)){seen.add(k);q.push({x,y});}}return seen;}
describe('Lantern Camp community',()=>{
 it('keeps every service, prince and exit reachable across seeded camps with solid prop footprints',()=>{
  for(let seed=0;seed<40;seed++){const g=new Expedition(seed),s=g.state,seen=reachable(s.map);for(const e of [...s.encounters,{x:22,y:14},g.story.prince])expect(directions.some(([dx,dy])=>seen.has(key(e.x+dx,e.y+dy)))).toBe(true);
   for(const p of [{x:0,y:15},{x:39,y:15},{x:20,y:0},{x:20,y:29},{x:20,y:16}])expect(seen.has(key(p.x,p.y))).toBe(true);
   for(const b of CAMP_BUILDINGS)for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){expect(walkable(s.map,x,y)).toBe(false);expect(s.enemies.some(e=>e.x===x&&e.y===y)).toBe(false);expect(s.encounters.some(e=>e.x===x&&e.y===y)).toBe(false);}
   expect(s.enemies).toHaveLength(0);expect(s.scenery.filter(d=>d.type==='teepee')).toHaveLength(3);
  }
 });
 it('does not consume a turn when walking into the forge and keeps the community intact after travel',()=>{
  const g=new Expedition(5);Object.assign(g.state.player,{x:18,y:16});const map=structuredClone(g.state.map),scenery=structuredClone(g.state.scenery);expect(g.action({type:'move',dx:-1,dy:0})).toBe(false);expect(g.state.turn).toBe(0);g.visitWorld(1,0);g.visitWorld(0,0);expect(g.state.map).toEqual(map);expect(g.state.scenery).toEqual(scenery);
 });
 it('opens the common while keeping a wooded perimeter and leaves structures out of wilderness regions',()=>{
  for(let seed=0;seed<20;seed++){const home=generateWorldRegion(seed,0,0);for(let y=8;y<=22;y++)for(let x=12;x<=29;x++)expect(home.map[y][x]).not.toBe('T');expect(home.map[0].filter(t=>t==='T').length).toBeGreaterThan(35);const wild=generateWorldRegion(seed,1,0);expect(wild.scenery.some(d=>['teepee','forge','traderCart'].includes(d.type))).toBe(false);}
 });
});
