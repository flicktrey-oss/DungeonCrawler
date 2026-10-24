import {describe,it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import {surveyMap,shortSword} from '../src/game/items.js';
import {worldMapCells} from '../src/minimap.js';
import {addItem,footprint,settleInventory} from '../src/game/inventory.js';
import {MERCHANT} from '../src/game/merchant.js';
const approach=g=>Object.assign(g.state.player,{x:MERCHANT.x,y:MERCHANT.y+1});
describe('Camp survey map',()=>{
 it('costs 15 gold, occupies 3×3 cells, and has finite merchant stock',()=>{
  const g=new Expedition(5),offer=g.shop.find(o=>o.id==='survey');expect(offer.price).toBe(15);expect(offer.stock).toBe(1);expect(footprint(offer.item)).toEqual([3,3]);approach(g);g.state.player.gold=15;expect(g.action({type:'buy',id:'survey'})).toBe(true);expect(g.state.player.gold).toBe(0);expect(g.state.turn).toBe(1);expect(offer.stock).toBe(0);expect(g.state.player.inventory.some(i=>i.kind==='surveyMap')).toBe(true);
 });
 it('consumes one map and one turn to chart exactly the 25 surface regions around camp without generating or exploring them',()=>{
  const g=new Expedition(5),p=g.state.player;addItem(p,surveyMap());const explored=new Set(g.state.explored),visible=new Set(g.state.visible),discovered=g.state.regionsDiscovered;expect(g.action({type:'use',index:p.inventory.length-1})).toBe(true);expect(g.state.turn).toBe(1);expect(p.inventory.some(i=>i.kind==='surveyMap')).toBe(false);expect(g.surveyedRegions.size).toBe(25);expect(g.regions.size).toBe(0);expect(g.state.regionsDiscovered).toBe(discovered);expect(g.state.explored).toEqual(explored);expect(g.state.visible).toEqual(visible);
  const cells=worldMapCells(g);expect(cells).toHaveLength(26);expect(cells.filter(c=>c.visited)).toHaveLength(1);for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++){const cell=cells.find(c=>c.rx===x&&c.ry===y);expect(cell.biome).toBeTruthy();if(x||y){expect(cell.visited).toBe(false);expect(cell.entranceKnown).toBe(false);expect(cell.questCount).toBe(0);}}
 });
 it('preserves charts through travel and overlays visited exploration without duplicates, then resets on a new run',()=>{
  const g=new Expedition(5);g.state.player.inventory.push(surveyMap());g.action({type:'use',index:3});g.visitWorld(1,0);expect(worldMapCells(g).filter(c=>c.rx===1&&c.ry===0)).toHaveLength(1);expect(worldMapCells(g).find(c=>c.rx===1&&c.ry===0).visited).toBe(true);g.visitWorld(0,0);expect(g.surveyedRegions.size).toBe(25);expect(new Expedition(5).surveyedRegions.size).toBe(0);
 });
 it('rejects already-charted, invalid or dead uses without consuming the map or turn',()=>{
  const g=new Expedition(5),p=g.state.player;p.inventory.push(surveyMap(),surveyMap());g.action({type:'use',index:3});const left=p.inventory.findIndex(i=>i.kind==='surveyMap');expect(g.action({type:'use',index:left})).toBe(false);expect(g.state.turn).toBe(1);expect(p.inventory[left].kind).toBe('surveyMap');expect(g.action({type:'use',index:-1})).toBe(false);g.state.status='dead';expect(g.action({type:'use',index:left})).toBe(false);expect(g.state.turn).toBe(1);
 });
 it('keeps gold and stock on unaffordable or full-grid purchases',()=>{
  const g=new Expedition(5),p=g.state.player;approach(g);p.gold=14;expect(g.action({type:'buy',id:'survey'})).toBe(false);p.gold=15;p.inventory=Array.from({length:100},()=>({kind:'trophy',name:'Claw',size:[1,1]}));settleInventory(p.inventory);expect(g.action({type:'buy',id:'survey'})).toBe(false);expect(p.gold).toBe(15);expect(g.shop.find(o=>o.id==='survey').stock).toBe(1);expect(g.state.turn).toBe(0);
 });
});
