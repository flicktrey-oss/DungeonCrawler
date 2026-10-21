import { key } from './game/dungeon.js';

const palette = { '#': '#5b6270', T: '#315342', '^': '#8c9489', '~': '#397082', ',': '#507447', ';': '#809064', '.': '#a18b68', '+': '#a18b68', C: '#ffe0a0', M: '#f2b2c5', D: '#ba99e6', R: '#a6c1c5', '>': '#ba99e6', '<': '#8ce6d1', A: '#eabf61' };
const labels = { C: 'C', M: 'M', D: '>', '>': '>', '<': '<', R: 'R', A: '*' };
// Never expose unvisited terrain or unseen creatures through this widget.
export function minimapCells(state) {
  const cells = [];
  for (let y = 0; y < state.map.length; y++) for (let x = 0; x < state.map[y].length; x++) {
    if (state.explored.has(key(x, y))) cells.push({ x, y, tile: state.map[y][x], visible: state.visible.has(key(x, y)) });
  }
  return cells;
}
export function campBearing(location) {
  const parts = [];
  if (location.rx) parts.push(`${Math.abs(location.rx)} ${location.rx > 0 ? 'W' : 'E'}`);
  if (location.ry) parts.push(`${Math.abs(location.ry)} ${location.ry > 0 ? 'N' : 'S'}`);
  return `${location.kind === 'crypt' ? 'Surface camp' : 'Camp'}: ${parts.join(' · ') || 'this region'}`;
}
export function drawMinimap(canvas, state, location) {
  const ctx = canvas.getContext('2d'), sx = canvas.width / state.map[0].length, sy = canvas.height / state.map.length;
  ctx.globalAlpha = 1; ctx.fillStyle = '#080c12'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const cell of minimapCells(state)) {
    ctx.globalAlpha = cell.visible ? 1 : .5; ctx.fillStyle = palette[cell.tile] ?? '#677481';
    ctx.fillRect(cell.x * sx, cell.y * sy, sx, sy);
  }
  ctx.globalAlpha = 1; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const cell of minimapCells(state)) if (labels[cell.tile]) {
    ctx.fillStyle = '#111824'; ctx.fillRect(cell.x * sx - 3, cell.y * sy - 3, 10, 10);
    ctx.fillStyle = palette[cell.tile]; ctx.fillText(labels[cell.tile], cell.x * sx + sx / 2, cell.y * sy + sy / 2);
  }
  const p = state.player; ctx.fillStyle = '#fff'; ctx.fillRect(p.x * sx - 1, p.y * sy - 1, sx + 2, sy + 2);
  ctx.fillStyle = '#4cf3dc'; ctx.fillRect(p.x * sx, p.y * sy, sx, sy);
  canvas.setAttribute('aria-label', `Explored map, ${location.kind === 'crypt' ? `crypt depth ${location.depth}` : `region ${location.rx}, ${location.ry}`}. You are at tile ${p.x}, ${p.y}. ${campBearing(location)}.`);
}
