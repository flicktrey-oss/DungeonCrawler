import { MERCHANT, createMerchantStock, buyFromMerchant } from './merchant.js';
import { Game } from './game.js';
import { Random } from './random.js';
import { generateDungeon, walkable, key, WIDTH, HEIGHT } from './dungeon.js';
import { generateWorldRegion, regionSeed, worldId, cryptId, CAMP, BIOMES } from './world.js';
import { enemyTypes } from './combat.js';
import { equipment, potion } from './items.js';

const regionFields = ['map', 'enemies', 'items', 'explored', 'start', 'stairs', 'upstairs', 'entrance', 'landmark', 'biome', 'danger', 'home', 'rx', 'ry', 'depth', 'cleared', 'discovered'];
export class Expedition extends Game {
  constructor(seed = Date.now()) {
    // Retain the original dungeon-only Game for regression tests and future modes.
    super(seed);
    this.regions = new Map(); this.location = null; this.stash = []; this.shop = createMerchantStock();
    this.state.log = []; this.state.expedition = true; this.state.cryptsCleared = 0;
    this.state.regionsDiscovered = 0; this.state.transition = false;
    this.visitWorld(0, 0, CAMP); this.state.transition = false;
    this.message('Your expedition begins at Lantern Camp. Follow trails into the unknown.');
    this.message('The camp region is safe. A merchant trades just northeast of the tent. A crypt entrance lies east.');
  }
  makeEnemy(kind, position, danger, id) {
    const base = enemyTypes[kind];
    return { ...base, ...position, kind, id, hp: base.hp + (danger - 1) * 3, attack: base.attack + danger - 1, actions: 0 };
  }
  saveRegion() {
    if (!this.location) return;
    const data = {};
    for (const field of regionFields) data[field] = this.state[field];
    this.regions.set(this.location.id, data);
  }
  activate(location, data, spawn) {
    this.saveRegion(); this.location = location;
    for (const field of regionFields) this.state[field] = data[field];
    // Keep thresholds and existing equipment tables bounded while danger scales by region.
    this.state.floor = Math.min(5, data.danger + (data.depth ?? 0));
    Object.assign(this.state.player, spawn);
    // A returning creature must not occupy the arrival tile. Usually this is
    // prevented by the reserved entry tiles; handle stale positions defensively.
    const occupant = this.state.enemies.find(e => e.hp > 0 && e.x === spawn.x && e.y === spawn.y);
    if (occupant) {
      const occupied = new Set(this.state.enemies.filter(e => e.hp > 0).map(e => key(e.x, e.y)));
      outer: for (let r = 1; r < WIDTH; r++) for (let y = 1; y < HEIGHT - 1; y++) for (let x = 1; x < WIDTH - 1; x++) {
        if (Math.abs(x - spawn.x) + Math.abs(y - spawn.y) === r && walkable(data.map, x, y) && !occupied.has(key(x, y))) { occupant.x = x; occupant.y = y; break outer; }
      }
    }
    this.state.mindVisionUntil = 0; this.state.transition = true;
    this.state.location = { ...location }; this.refresh();
  }
  visitWorld(rx, ry, spawn) {
    const id = worldId(rx, ry);
    let data = this.regions.get(id);
    if (!data) {
      const generated = generateWorldRegion(this.state.seed, rx, ry);
      data = { ...generated, depth: 0, start: CAMP, stairs: null, upstairs: null, cleared: false, discovered: false,
        enemies: generated.spawns.map((e, i) => this.makeEnemy(e.kind, e, generated.danger, i)),
        items: [potion(), { kind: 'gold', name: 'Traveler’s cache', amount: 8 + generated.danger * 3 }].map((item, i) => ({ ...item, ...generated.lootSpots[i] })), explored: new Set() };
      // The ruined watchpost always has an equipment cache, worth finding.
      data.items.push({ ...equipment(this.rng.pick(['weapon', 'armor']), generated.danger), ...generated.landmark });
      this.state.regionsDiscovered++;
    }
    this.activate({ id, kind: 'world', rx, ry, depth: 0 }, data, spawn);
    this.message(`${BIOMES[data.biome].name} · region (${rx}, ${ry}) · ${data.home ? 'safe camp' : `danger ${data.danger}/5`}.`);
  }
  visitCrypt(rx, ry, depth, arrival = 'upstairs') {
    const id = cryptId(rx, ry, depth);
    let data = this.regions.get(id);
    if (!data) {
      const rng = new Random(regionSeed(this.state.seed, rx, ry, `crypt:${depth}`));
      const dungeon = generateDungeon(rng), danger = Math.min(5, 1 + Math.floor((Math.abs(rx) + Math.abs(ry)) / 2));
      data = { ...dungeon, rx, ry, biome: generateWorldRegion(this.state.seed, rx, ry).biome, danger, home: false, depth, upstairs: { ...dungeon.start }, cleared: false, discovered: false, explored: new Set(), enemies: [], items: [] };
      data.map[data.upstairs.y][data.upstairs.x] = '<';
      if (depth === 2) data.map[data.stairs.y][data.stairs.x] = 'A';
      const free = [];
      for (const room of dungeon.rooms.slice(1)) for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) if (key(x, y) !== key(data.stairs.x, data.stairs.y)) free.push({ x, y });
      const spot = () => free.splice(rng.int(0, free.length - 1), 1)[0];
      for (let i = 0; i < 5 + depth; i++) data.enemies.push(this.makeEnemy(rng.pick(['skeleton', 'goblin']), spot(), danger + depth - 1, i));
      if (depth === 2) data.enemies.push(this.makeEnemy('guardian', { ...data.stairs }, danger, 99));
      for (const item of [potion(), potion(), equipment('weapon', Math.min(5, danger + depth)), equipment('armor', Math.min(5, danger + depth)), { kind: 'chest', name: 'Crypt coffer', description: 'A dangerous expedition’s reward.' }]) data.items.push({ ...item, ...spot() });
    }
    this.activate({ id, kind: 'crypt', rx, ry, depth }, data, data[arrival]);
    this.message(`Entered ${data.biome === 'marsh' ? 'Sunken' : 'Rootbound'} Crypt · depth ${depth}/2. Use < or Q on the upward stair to retreat.`);
  }
  atCamp() { const s = this.state; return this.location.kind === 'world' && s.home && s.player.x === CAMP.x && s.player.y === CAMP.y; }
  atMerchant() { const s = this.state; return this.location.kind === 'world' && s.home && Math.abs(s.player.x - MERCHANT.x) + Math.abs(s.player.y - MERCHANT.y) === 1; }
  resolvePlayer(action) {
    const s = this.state, p = s.player, loc = this.location;
    if (action.type === 'buy') return buyFromMerchant(this, action.id);
    if (action.type === 'store' || action.type === 'retrieve') {
      if (!this.atCamp()) { this.message('Return to the campfire to use storage.'); return false; }
      const source = action.type === 'store' ? p.inventory : this.stash;
      const target = action.type === 'store' ? this.stash : p.inventory;
      if (!Number.isInteger(action.index) || !source[action.index]) return false;
      const item = source.splice(action.index, 1)[0]; target.push(item);
      this.message(`${action.type === 'store' ? 'Stored' : 'Retrieved'} ${item.name}.`); return true;
    }
    if (action.type === 'descend') {
      if (loc.kind === 'world' && s.map[p.y][p.x] === 'D') { this.visitCrypt(loc.rx, loc.ry, 1); return true; }
      if (loc.kind === 'crypt' && loc.depth === 1 && p.x === s.stairs.x && p.y === s.stairs.y) { this.visitCrypt(loc.rx, loc.ry, 2); return true; }
      this.message(loc.kind === 'world' ? 'Stand on a crypt entrance and press Enter.' : 'No downward stair here. Use Q on the upward stair to leave.'); return false;
    }
    if (action.type === 'ascend') {
      if (loc.kind !== 'crypt' || p.x !== s.upstairs.x || p.y !== s.upstairs.y) { this.message('Stand on the upward stair to retreat.'); return false; }
      if (loc.depth === 2) this.visitCrypt(loc.rx, loc.ry, 1, 'stairs');
      else { const entrance = this.regions.get(worldId(loc.rx, loc.ry)).entrance; this.visitWorld(loc.rx, loc.ry, entrance); }
      return true;
    }
    if (action.type === 'move' && Number.isInteger(action.dx) && Number.isInteger(action.dy) && Math.abs(action.dx) + Math.abs(action.dy) === 1) {
      const x = p.x + action.dx, y = p.y + action.dy;
      if (loc.kind === 'world' && (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT)) {
        this.visitWorld(loc.rx + action.dx, loc.ry + action.dy, { x: (x + WIDTH) % WIDTH, y: (y + HEIGHT) % HEIGHT }); return true;
      }
      const result = super.resolvePlayer(action);
      if (result) {
        const tile = s.map[p.y][p.x];
        if (this.atMerchant()) this.message('Mara the Wayfarer: press E or Trade to browse potions and equipment.');
        if (tile === 'D') this.message('Crypt entrance — dangerous, two depths. Enter to descend; retreat with Q on an upward stair.');
        if (tile === 'C') this.message('Lantern Camp. Press E to open storage. Supplies last only for this run.');
        if (tile === '<') this.message('Upward stair. Press Q or < to retreat.');
        if (tile === 'R' && !s.discovered) { s.discovered = true; this.message('Discovered a ruined watchpost. A traveler left equipment here.'); }
      }
      return result;
    }
    return super.resolvePlayer(action);
  }
  kill(enemy) {
    super.kill(enemy);
    if (enemy.kind === 'guardian' && !this.state.cleared) {
      this.state.cleared = true; this.state.cryptsCleared++; this.state.player.gold += 40;
      this.message('Crypt cleared! +40 gold. Return to the surface; the wilderness continues.');
    }
  }
}
