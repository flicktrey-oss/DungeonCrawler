import { describe, it, expect } from 'vitest';
import { Expedition } from '../src/game/expedition.js';
import { generateWorldRegion, CAMP, BIOMES, worldId } from '../src/game/world.js';
import { walkable, key, directions } from '../src/game/dungeon.js';

function reachable(map, start) {
  const seen = new Set([key(start.x, start.y)]), queue = [start];
  for (let i = 0; i < queue.length; i++) for (const [dx, dy] of directions) {
    const x = queue[i].x + dx, y = queue[i].y + dy, k = key(x, y);
    if (walkable(map, x, y) && !seen.has(k)) { seen.add(k); queue.push({ x, y }); }
  }
  return seen;
}
function descend(game) { Object.assign(game.state.player, game.state.entrance); expect(game.action({ type: 'descend' })).toBe(true); }
function ascend(game) { Object.assign(game.state.player, game.state.upstairs); expect(game.action({ type: 'ascend' })).toBe(true); }

describe('seeded wilderness', () => {
  it('reproduces terrain, features and spawns independent of generation order, including negative coordinates', () => {
    const a = generateWorldRegion(23, -45, 67); generateWorldRegion(23, 400, -800); expect(generateWorldRegion(23, -45, 67)).toEqual(a);
    expect(generateWorldRegion(24, -45, 67).map).not.toEqual(a.map);
  });
  it('connects every passable tile, all features and all four exits across 180 varied regions', () => {
    for (let seed = 0; seed < 180; seed++) {
      const d = generateWorldRegion(seed, seed % 13 - 6, seed % 9 - 4), seen = reachable(d.map, CAMP);
      for (let y = 0; y < 30; y++) for (let x = 0; x < 40; x++) if (walkable(d.map, x, y)) expect(seen.has(key(x, y))).toBe(true);
      for (const p of [d.entrance, d.landmark, { x: 0, y: 15 }, { x: 39, y: 15 }, { x: 20, y: 0 }, { x: 20, y: 29 }]) expect(seen.has(key(p.x, p.y))).toBe(true);
    }
  });
  it('has safe distinct spawns and biome-specific creatures, with an enemy-free starting region', () => {
    for (let seed = 0; seed < 30; seed++) for (const [rx, ry] of [[0, 0], [1, 0], [2, 0], [-3, -2]]) {
      const d = generateWorldRegion(seed, rx, ry), positions = [...d.spawns, ...d.lootSpots, d.entrance, d.landmark, CAMP];
      expect(new Set(positions.map(p => key(p.x, p.y))).size).toBe(positions.length);
      for (const p of positions) expect(walkable(d.map, p.x, p.y)).toBe(true);
      for (const e of d.spawns) { expect(BIOMES[d.biome].enemies).toContain(e.kind); expect(e.x).toBeGreaterThanOrEqual(5); expect(e.y).toBeGreaterThanOrEqual(5); }
      if (d.home) expect(d.spawns).toHaveLength(0);
    }
  });
});
describe('expedition transitions and persistence', () => {
  it('crosses east and west seamlessly, preserves player progress and provides arrival grace', () => {
    const g = new Expedition(8), p = g.state.player; p.gold = 91; p.mana = 40; p.x = 39; p.y = 15;
    const bag = structuredClone(p.inventory);
    expect(g.action({ type: 'move', dx: 1, dy: 0 })).toBe(true);
    expect(g.location.rx).toBe(1); expect(p.x).toBe(0); expect(p.y).toBe(15); expect(p.gold).toBe(91); expect(p.mana).toBe(45); expect(p.inventory).toEqual(bag);
    expect(g.state.enemies.every(e => e.actions === 0)).toBe(true);
    g.action({ type: 'move', dx: -1, dy: 0 }); expect(g.location.rx).toBe(0); expect(p.x).toBe(39);
  });
  it('crosses north and south at matching trail positions, including negative regions', () => {
    const g = new Expedition(9); Object.assign(g.state.player, { x: 20, y: 0 });
    g.action({ type: 'move', dx: 0, dy: -1 }); expect(g.location.ry).toBe(-1); expect(g.state.player.y).toBe(29);
    g.action({ type: 'move', dx: 0, dy: 1 }); expect(g.location.ry).toBe(0); expect(g.state.player.y).toBe(0);
  });
  it('remembers collected loot and explored terrain rather than regenerating cleared regions', () => {
    const g = new Expedition(11); g.visitWorld(1, 0, { x: 0, y: 15 }); g.state.transition = false;
    const item = g.state.items[0]; Object.assign(g.state.player, item); g.action({ type: 'pickup' });
    const count = g.state.items.length, terrain = structuredClone(g.state.map); g.state.explored.add('39,29');
    g.state.enemies[0].hp = 0;
    g.visitWorld(2, 0, { x: 0, y: 15 }); g.visitWorld(1, 0, { x: 39, y: 15 });
    expect(g.state.items.length).toBe(count); expect(g.state.map).toEqual(terrain); expect(g.state.explored.has('39,29')).toBe(true); expect(g.state.enemies[0].hp).toBe(0);
  });
  it('keeps inactive regions frozen and gives active enemies only one action per ordinary turn', () => {
    const g = new Expedition(3); g.visitWorld(1, 0, { x: 0, y: 15 }); g.state.transition = false;
    g.action({ type: 'wait' }); const enemies = g.state.enemies; expect(enemies.every(e => e.actions === 1)).toBe(true);
    g.visitWorld(0, 0, CAMP); g.state.transition = false; for (let i = 0; i < 5; i++) g.action({ type: 'wait' });
    expect(enemies.every(e => e.actions === 1)).toBe(true);
  });
  it('returns from a crypt to the exact entrance and persists loot, player stats and inventory', () => {
    const g = new Expedition(6), entrance = { ...g.state.entrance }; descend(g);
    expect(g.location.kind).toBe('crypt'); expect(g.state.enemies.every(e => e.actions === 0)).toBe(true);
    const item = g.state.items[0]; Object.assign(g.state.player, item); g.state.enemies.forEach(e => { e.range = 0; }); g.action({ type: 'pickup' }); const count = g.state.items.length;
    g.state.player.mana = 30; const bag = structuredClone(g.state.player.inventory); ascend(g);
    expect(g.location.kind).toBe('world'); expect(g.state.player.x).toBe(entrance.x); expect(g.state.player.y).toBe(entrance.y); expect(g.state.player.mana).toBe(30); expect(g.state.player.inventory).toEqual(bag);
    descend(g); expect(g.state.items.length).toBe(count); expect(g.state.map[g.state.upstairs.y][g.state.upstairs.x]).toBe('<');
  });
  it('connects both depths with persistent stairs and a tougher guardian that does not end the endless run', () => {
    const g = new Expedition(17); descend(g); const down = { ...g.state.stairs }; Object.assign(g.state.player, down);
    g.action({ type: 'descend' }); expect(g.location.depth).toBe(2);
    const guardian = g.state.enemies.find(e => e.kind === 'guardian'); expect(guardian.hp).toBeGreaterThan(30); expect(guardian.attack).toBeGreaterThan(7);
    guardian.hp = 0; g.kill(guardian); expect(g.state.status).toBe('playing'); expect(g.state.cryptsCleared).toBe(1);
    ascend(g); expect(g.location.depth).toBe(1); expect(g.state.player.x).toBe(down.x); expect(g.state.player.y).toBe(down.y);
  });
  it('never overlaps creatures and arrival tiles, including occupied return stairs', () => {
    const g = new Expedition(14); descend(g); const target = { ...g.state.stairs }; g.state.enemies[0].x = target.x; g.state.enemies[0].y = target.y;
    Object.assign(g.state.player, target); g.action({ type: 'descend' }); ascend(g);
    expect(g.state.enemies.some(e => e.hp > 0 && e.x === g.state.player.x && e.y === g.state.player.y)).toBe(false);
    const positions = g.state.enemies.filter(e => e.hp > 0).map(e => key(e.x, e.y)); expect(new Set(positions).size).toBe(positions.length);
  });
  it('stores and retrieves only at camp, costs turns, and resets all storage on death/new run', () => {
    const g = new Expedition(1); expect(g.atCamp()).toBe(true); const item = g.state.player.inventory[0];
    expect(g.action({ type: 'store', index: 0 })).toBe(true); expect(g.stash).toEqual([item]); expect(g.state.turn).toBe(1);
    expect(g.action({ type: 'retrieve', index: 0 })).toBe(true); expect(g.stash).toHaveLength(0); expect(g.state.turn).toBe(2);
    g.action({ type: 'store', index: 0 }); g.state.player.x--; expect(g.action({ type: 'retrieve', index: 0 })).toBe(false); expect(g.state.turn).toBe(3);
    g.state.status = 'dead'; expect(g.action({ type: 'retrieve', index: 0 })).toBe(false); expect(new Expedition(1).stash).toHaveLength(0);
  });
  it('uses trees, rocks and deep water as obstacles, not free steps', () => {
    const g = new Expedition(1); g.state.map[15][21] = 'T'; expect(g.action({ type: 'move', dx: 1, dy: 0 })).toBe(false); expect(g.state.turn).toBe(0);
    expect(walkable([['~', '^', ';']], 0, 0)).toBe(false); expect(walkable([['~', '^', ';']], 1, 0)).toBe(false); expect(walkable([['~', '^', ';']], 2, 0)).toBe(true);
  });
});
