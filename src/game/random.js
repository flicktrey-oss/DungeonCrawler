export class Random {
  constructor(seed = Date.now()) { this.seed = Number(seed) >>> 0; }
  next() { let t = this.seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  int(min, max) { return min + Math.floor(this.next() * (max - min + 1)); }
  pick(items) { return items[this.int(0, items.length - 1)]; }
}
