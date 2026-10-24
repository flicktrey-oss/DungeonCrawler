import { describe, it, expect } from 'vitest';
import { Expedition } from '../src/game/expedition.js';
import { CAMP, biomeAt } from '../src/game/world.js';
import { MERCHANT } from '../src/game/merchant.js';
import { walkable } from '../src/game/dungeon.js';
import { minimapCells, campBearing } from '../src/minimap.js';
const approach = game => Object.assign(game.state.player, { x: MERCHANT.x, y: MERCHANT.y + 1 });

describe('camp merchant', () => {
  it('spawns next to camp on a reserved tile, and is interactable from a reachable neighbor', () => {
    const g = new Expedition(1); expect(g.state.map[MERCHANT.y][MERCHANT.x]).toBe('M');
    expect(walkable(g.state.map, MERCHANT.x, MERCHANT.y)).toBe(false); expect(g.atMerchant()).toBe(false);
    approach(g); expect(g.atMerchant()).toBe(true); expect(g.atCamp()).toBe(false);
    expect(g.state.items.some(i => i.x === MERCHANT.x && i.y === MERCHANT.y)).toBe(false);
  });
  it('deducts the exact price and adds an independent item for one turn, without auto-equipping', () => {
    const g = new Expedition(2); approach(g); g.state.player.gold = 35;
    expect(g.action({ type: 'buy', id: 'spear', price: 0 })).toBe(true);
    expect(g.state.player.gold).toBe(0); expect(g.state.turn).toBe(1); expect(g.shop[1].stock).toBe(0);
    expect(g.state.player.inventory.at(-1)).toMatchObject(g.shop[1].item); expect(g.state.player.inventory.at(-1)).not.toBe(g.shop[1].item);
    expect(g.state.player.weapon).toBe(null);
  });
  it('rejects unaffordable, invalid, sold-out and distant purchases without taking a turn or gold', () => {
    const g = new Expedition(2); approach(g); g.state.player.gold = 9;
    expect(g.action({ type: 'buy', id: 'tonic' })).toBe(false); expect(g.action({ type: 'buy', id: 'unknown' })).toBe(false);
    expect(g.state.player.gold).toBe(9); expect(g.state.turn).toBe(0); expect(g.shop[0].stock).toBe(3);
    g.state.player.gold = 50; g.shop[1].stock = 0; expect(g.action({ type: 'buy', id: 'spear' })).toBe(false);
    Object.assign(g.state.player, CAMP); expect(g.action({ type: 'buy', id: 'tonic' })).toBe(false); expect(g.state.turn).toBe(0); expect(g.state.player.gold).toBe(50);
  });
  it('keeps stock and purchases after leaving camp and returning; a new run resets stock', () => {
    const g = new Expedition(5); approach(g); g.state.player.gold = 30;
    for (let i = 0; i < 3; i++) expect(g.action({ type: 'buy', id: 'tonic' })).toBe(true);
    expect(g.shop[0].stock).toBe(0); expect(g.state.player.inventory).toHaveLength(6);
    g.visitWorld(1, 0, { x: 0, y: 15 }); g.visitWorld(0, 0, CAMP); approach(g);
    expect(g.shop[0].stock).toBe(0); expect(g.state.player.inventory).toHaveLength(6);
    expect(new Expedition(5).shop[0].stock).toBe(3);
  });
  it('does not allow trade from a crypt or after death', () => {
    const g = new Expedition(5); g.state.player.gold = 100; g.visitCrypt(0, 0, 1); approach(g);
    expect(g.action({ type: 'buy', id: 'tonic' })).toBe(false); expect(g.state.player.gold).toBe(100);
    g.visitWorld(0, 0, CAMP); approach(g); g.state.status = 'dead'; expect(g.action({ type: 'buy', id: 'tonic' })).toBe(false);
  });
});
describe('minimap information', () => {
  it('only includes explored tiles, not hidden landmarks, enemies or items', () => {
    const state = { map: [['C', 'M', 'D']], explored: new Set(['0,0']), visible: new Set(['0,0']), enemies: [{ x: 2, y: 0 }], items: [{ x: 1, y: 0 }] };
    expect(minimapCells(state)).toEqual([{ x: 0, y: 0, tile: 'C', visible: true }]);
  });
  it('retains previously explored tiles while identifying what is currently visible', () => {
    const s = { map: [['.', '<', '>']], explored: new Set(['0,0', '1,0', '2,0']), visible: new Set(['1,0']) };
    expect(minimapCells(s).map(c => c.visible)).toEqual([false, true, false]);
    expect(minimapCells(s).map(c => c.tile)).toEqual(['.', '<', '>']);
  });
  it('points home correctly across positive and negative coordinates and labels underground travel', () => {
    expect(campBearing({ kind: 'world', rx: 2, ry: -3 })).toBe('Camp: 2 W · 3 S');
    expect(campBearing({ kind: 'world', rx: -1, ry: 4 })).toBe('Camp: 1 E · 4 N');
    expect(campBearing({ kind: 'crypt', rx: 0, ry: 0 })).toBe('Surface camp: this region');
  });
  it('does not mutate the simulation or reveal terrain when inspected repeatedly', () => {
    const g = new Expedition(6), before = structuredClone(g.state);
    for (let i = 0; i < 10; i++) minimapCells(g.state);
    expect(g.state).toEqual(before);
  });
});

import { worldMapCells, worldMapLayout } from '../src/minimap.js';
describe('world overview', () => {
  it('adds exactly one square per visited region, including the active region, without duplicates', () => {
    const g = new Expedition(7); expect(worldMapCells(g)).toHaveLength(2);
    g.visitWorld(1, 0, { x: 0, y: 15 }); expect(worldMapCells(g)).toHaveLength(3);
    g.visitWorld(0, 0, CAMP); expect(worldMapCells(g)).toHaveLength(3);
    expect(worldMapCells(g).filter(c => c.current)).toEqual([expect.objectContaining({ rx: 0, ry: 0, home: true })]);
    expect(new Expedition(7).regions.size).toBe(0);
  });
  it('marks only discovered entrances and does not mutate exploration or generate neighboring regions', () => {
    const g = new Expedition(8); expect(worldMapCells(g).find(c=>c.home).entranceKnown).toBe(false);
    const size = g.regions.size, before = structuredClone(g.state);
    worldMapCells(g); expect(g.state).toEqual(before); expect(g.regions.size).toBe(size);
    g.state.entrance={x:28,y:15};g.state.explored.add('28,15'); expect(worldMapCells(g).find(c=>c.home).entranceKnown).toBe(true);
  });
  it('uses the entrance region when underground, without adding a square for each dungeon depth', () => {
    const g = new Expedition(9); g.visitWorld(-1, 0, { x: 39, y: 15 });
    g.visitCrypt(-1, 0, 1); g.visitCrypt(-1, 0, 2);
    const cells = worldMapCells(g); expect(cells).toHaveLength(3);
    expect(cells.find(c => c.current)).toMatchObject({ rx: -1, ry: 0, biome: biomeAt(-1,0,9) });
  });
  it('places east right and north above, fitting negative and distant visited coordinates into the same canvas', () => {
    const cells = [{ rx: -20, ry: -10 }, { rx: 0, ry: 0 }, { rx: 25, ry: 17 }], layout = worldMapLayout(cells);
    for (const cell of cells) {
      const x = layout.x + cell.rx * layout.size, y = layout.y + cell.ry * layout.size;
      expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0);
      expect(x + layout.size).toBeLessThanOrEqual(160); expect(y + layout.size).toBeLessThanOrEqual(120);
    }
    expect(layout.size).toBeGreaterThan(0);
  });
});
