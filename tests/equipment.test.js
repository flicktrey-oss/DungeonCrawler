import {describe,it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import {travelGear,reedAmulet,potion,attack,defense} from '../src/game/items.js';
import {addItem,settleInventory} from '../src/game/inventory.js';
describe('equipment removal',()=>{
 it('equips and unequips all three slots, adjusting stats without losing or duplicating gear',()=>{
  const g=new Expedition(1),p=g.state.player;
  for(const item of [travelGear('weapon'),travelGear('armor'),reedAmulet()]){
   addItem(p,item);const index=p.inventory.length-1,before=p.inventory.length;
   expect(g.action({type:'equip',index})).toBe(true);expect(p[item.kind].name).toBe(item.name);expect(p.inventory.length).toBe(before-1);
   expect(g.action({type:'unequip',slot:item.kind})).toBe(true);expect(p[item.kind]).toBe(null);expect(p.inventory.length).toBe(before);
  }
  expect(attack(p)).toBe(3);expect(defense(p)).toBe(0);expect(g.state.turn).toBe(6);
 });
 it('leaves an item equipped when its footprint cannot fit, taking no turn',()=>{
  const g=new Expedition(1),p=g.state.player;p.amulet=reedAmulet();p.inventory=Array.from({length:100},potion);settleInventory(p.inventory);
  const before=structuredClone(p);expect(g.action({type:'unequip',slot:'amulet'})).toBe(false);expect(p).toEqual(before);expect(g.state.turn).toBe(0);
 });
 it('rejects empty/unknown slots and dead runs without changing inventory',()=>{
  const g=new Expedition(1);expect(g.action({type:'unequip',slot:'weapon'})).toBe(false);expect(g.action({type:'unequip',slot:'inventory'})).toBe(false);
  g.state.player.weapon=travelGear('weapon');g.state.status='dead';expect(g.action({type:'unequip',slot:'weapon'})).toBe(false);expect(g.state.turn).toBe(0);
 });
});
