import {describe,it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import {generateWorldRegion} from '../src/game/world.js';
import {walkable,key} from '../src/game/dungeon.js';
import {potion,trophy} from '../src/game/items.js';
import {settleInventory} from '../src/game/inventory.js';
import {worldMapCells} from '../src/minimap.js';
function fixture(kind){for(let seed=1;seed<100;seed++){const g=new Expedition(seed);g.visitWorld(1,0);const e=g.state.encounters.find(e=>e.type==='woodland'&&e.kind===kind);if(e){g.state.enemies=[];Object.assign(g.state.player,{x:e.x,y:e.y+(kind==='milestone'?0:1)});g.state.transition=false;return {g,e};}}throw Error('No fixture');}
describe('woodland life',()=>{
 it('keeps forest clearings reproducible, open, and connected across visits',()=>{
 let trees=0;for(let seed=1;seed<=60;seed++){const a=generateWorldRegion(seed,1,0),b=generateWorldRegion(seed,1,0,2);expect(b.baseMap).toEqual(a.baseMap);trees+=a.map.flat().filter(t=>t==='T').length;expect(a.map[15][0]).toBe('.');expect(a.map[15][39]).toBe('.');}
 expect(trees/60).toBeLessThan(380);
 });
 it('rolls approximately 50% extra forest encounters, with all three types and none in camp or marsh',()=>{
 let count=0;const kinds=new Set();for(let seed=1;seed<=240;seed++){const g=new Expedition(seed);expect(g.state.encounters.some(e=>e.type==='woodland')).toBe(false);g.visitWorld(1,0);const e=g.state.encounters.find(e=>e.type==='woodland');if(e){count++;kinds.add(e.kind);expect(g.state.enemies.some(enemy=>enemy.x===e.x&&enemy.y===e.y)).toBe(false);expect(e.kind==='milestone'?walkable(g.state.map,e.x,e.y):walkable(g.state.map,e.x,e.y+1)).toBe(true);}g.visitWorld(2,0);expect(g.state.encounters.some(e=>e.type==='woodland')).toBe(false);}
 expect(count/240).toBeGreaterThan(.43);expect(count/240).toBeLessThan(.57);expect(kinds.size).toBe(3);
 });
 it('exchanges gold once, preserves its site and result after travel, and charges exactly one turn',()=>{
 const {g,e}=fixture('herbalist'),before=g.state.player.inventory.length;expect(g.action({type:'woodland',choice:'gold'})).toBe(true);expect(g.state.player.gold).toBe(2);expect(g.state.player.inventory.length).toBe(before+1);expect(g.state.turn).toBe(1);expect(g.action({type:'woodland',choice:'gold'})).toBe(false);
 g.visitWorld(0,0);g.visitWorld(1,0);const back=g.state.encounters.find(x=>x.type==='woodland');expect(back).toMatchObject({x:e.x,y:e.y,used:true});Object.assign(g.state.player,{x:e.x,y:e.y+1});expect(g.action({type:'woodland',choice:'gold'})).toBe(false);
 });
 it('makes trophy exchange atomic, including the cell freed by the trophy',()=>{
 const {g}=fixture('herbalist'),p=g.state.player;p.inventory=Array.from({length:100},potion);settleInventory(p.inventory);const before=structuredClone(p);expect(g.action({type:'woodland',choice:'gold'})).toBe(false);expect(p).toEqual(before);expect(g.state.turn).toBe(0);
 p.inventory[40]=trophy('rat');settleInventory(p.inventory);expect(g.action({type:'woodland',choice:'trophy'})).toBe(true);expect(p.inventory).toHaveLength(100);expect(p.gold).toBe(8);
 });
 it('helps the traveler once using a tonic, rejecting missing supplies for free',()=>{
 const {g,e}=fixture('traveler'),p=g.state.player;p.inventory=[];expect(g.action({type:'woodland'})).toBe(false);expect(g.state.turn).toBe(0);p.inventory=[potion()];expect(g.action({type:'woodland'})).toBe(true);expect(p.gold).toBe(16);expect(p.inventory).toHaveLength(0);expect(e.used).toBe(true);
 });
 it('gives a true crypt clue without generating visited squares or revealing terrain',()=>{
 const {g,e}=fixture('milestone');g.refresh();const before=g.regions.size,explored=new Set(g.state.explored);expect(e.clue).toBeTruthy();expect(generateWorldRegion(g.state.seed,e.clue.rx,e.clue.ry).entrance).toBeTruthy();expect(g.action({type:'woodland'})).toBe(true);expect(g.regions.size).toBe(before);expect(g.state.explored).toEqual(explored);expect(g.state.log.at(-1)).toContain('crypt lies in region');
 });
});
describe('world-map quest markers',()=>{
 it('marks all accepted objectives, hides offers, and shows unknown destinations without revealing terrain',()=>{
 const g=new Expedition(5),q=g.quests.get('trailwarden');expect(worldMapCells(g)).toHaveLength(1);Object.assign(g.state.player,{x:18,y:15});g.action({type:'acceptQuest'});
 const before=g.regions.size,cells=worldMapCells(g);expect(cells).toHaveLength(2);const target=cells.find(c=>c.rx===q.region.rx&&c.ry===q.region.ry);expect(target).toMatchObject({questCount:1,returnCount:0,tracked:true,visited:false,entranceKnown:false});expect(target.biome).toBeUndefined();expect(g.regions.size).toBe(before);
 });
 it('moves the marker to the reward giver on completion, removes it on claim, and stacks quests',()=>{
 const g=new Expedition(5),q=g.quests.get('trailwarden');q.accepted=true;q.complete=true;g.quests.set('second',{id:'second',accepted:true,claimed:false,complete:false,region:{rx:0,ry:0},giverRegion:{rx:1,ry:0}});
 expect(worldMapCells(g)[0]).toMatchObject({questCount:1,returnCount:1,home:true});q.claimed=true;expect(worldMapCells(g)[0].returnCount).toBe(0);expect(worldMapCells(g)[0].questCount).toBe(1);
 });
 it('retains markers when underground without treating crypt floors as separate regions',()=>{
 const g=new Expedition(5),q=g.quests.get('trailwarden');q.accepted=true;g.visitCrypt(1,0,1);expect(worldMapCells(g).filter(c=>c.questCount===1)).toHaveLength(1);expect(worldMapCells(g).some(c=>c.depth)).toBe(false);
 });
});
