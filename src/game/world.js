import { Random } from './random.js';
import { WIDTH, HEIGHT, key, directions, walkable } from './dungeon.js';

export const CAMP = { x: 20, y: 15 };
export const BIOMES = {
  forest: { name: 'Whisperwood', enemies: ['wolf', 'boar'] },
  marsh: { name: 'Lantern Marsh', enemies: ['slime', 'leech'] },
};
export function regionSeed(seed, x, y, salt = 'world') {
  let hash = 2166136261;
  for (const c of `${seed}:${x}:${y}:${salt}`) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return hash >>> 0;
}
export const worldId = (x, y) => `world:${x},${y}`;
export const cryptId = (x, y, depth) => `crypt:${x},${y}:${depth}`;

// Each region meets its neighbors at fixed trail crossings. Terrain is seeded by
// coordinates, independent of visit order; mutable region state lives in the run.
export function generateWorldRegion(seed, rx, ry) {
  const rng = new Random(regionSeed(seed, rx, ry));
  const home = rx === 0 && ry === 0;
  const biome = home ? 'forest' : (Math.abs(rx) + Math.abs(ry)) % 3 === 1 ? 'marsh' : 'forest';
  const map = Array.from({ length: HEIGHT }, (_, y) => Array.from({ length: WIDTH }, (_, x) => {
    if (x === 0 || y === 0 || x === WIDTH - 1 || y === HEIGHT - 1) return biome === 'forest' ? 'T' : '~';
    const roll = rng.next();
    return biome === 'forest' ? roll < .22 ? 'T' : roll < .25 ? '^' : ',' : roll < .19 ? '~' : roll < .28 ? ';' : ',';
  }));
  const carve = (from, to) => {
    let { x, y } = from;
    while (x !== to.x) { map[y][x] = '.'; x += Math.sign(to.x - x); }
    while (y !== to.y) { map[y][x] = '.'; y += Math.sign(to.y - y); }
    map[y][x] = '.';
  };
  // The central trail is guaranteed traversable in all four directions.
  for (const end of [{ x: 0, y: 15 }, { x: 39, y: 15 }, { x: 20, y: 0 }, { x: 20, y: 29 }]) carve(CAMP, end);
  if (home) for (let y = 11; y <= 19; y++) for (let x = 15; x <= 25; x++) map[y][x] = ',';
  const entrance = home ? { x: 28, y: 15 } : { x: rng.int(6, 33), y: rng.int(6, 23) };
  const landmark = { x: rng.int(5, 12), y: rng.int(5, 10) };
  carve(CAMP, entrance); carve(CAMP, landmark);
  map[entrance.y][entrance.x] = 'D'; map[landmark.y][landmark.x] = 'R';
  if (home) map[CAMP.y][CAMP.x] = 'C';
  // Remove isolated pockets so every passable tile and feature is reachable.
  const seen = new Set([key(CAMP.x, CAMP.y)]), queue = [CAMP];
  for (let i = 0; i < queue.length; i++) for (const [dx, dy] of directions) {
    const x = queue[i].x + dx, y = queue[i].y + dy, k = key(x, y);
    if (walkable(map, x, y) && !seen.has(k)) { seen.add(k); queue.push({ x, y }); }
  }
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) if (walkable(map, x, y) && !seen.has(key(x, y))) map[y][x] = biome === 'forest' ? 'T' : '~';
  const danger = Math.min(5, 1 + Math.floor((Math.abs(rx) + Math.abs(ry)) / 2));
  const occupied = new Set([key(CAMP.x, CAMP.y), key(entrance.x, entrance.y), key(landmark.x, landmark.y)]);
  const available = [];
  for (let y = 5; y < HEIGHT - 5; y++) for (let x = 5; x < WIDTH - 5; x++) if (walkable(map, x, y) && !occupied.has(key(x, y)) && Math.abs(x - CAMP.x) + Math.abs(y - CAMP.y) > 5) available.push({ x, y });
  function spot() { if (!available.length) throw new Error('No world spawn tiles'); return available.splice(rng.int(0, available.length - 1), 1)[0]; }
  const spawns = home ? [] : Array.from({ length: 5 + danger }, () => ({ ...spot(), kind: rng.pick(BIOMES[biome].enemies) }));
  return { map, biome, danger, entrance, landmark, spawns, lootSpots: [spot(), spot()], home, rx, ry };
}
