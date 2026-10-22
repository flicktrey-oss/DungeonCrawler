import { rememberedTile } from './game/map-memory.js';
import { key } from './game/dungeon.js';

const palette = { B:'#d48c76',V:'#e0ddb0',W:'#bca273',S:'#b7a0e0',K:'#b9bd91',Y:'#5b4545', '#': '#5b6270', T: '#315342', '^': '#8c9489', '~': '#397082', ',': '#507447', ';': '#809064', '.': '#a18b68', '+': '#a18b68', F:'#f3a05a', C: '#ffe0a0', M: '#f2b2c5', D: '#ba99e6', R: '#a6c1c5', '>': '#ba99e6', '<': '#8ce6d1', A: '#eabf61' };
const labels = {B:'!',V:'?',W:'W',S:'S',K:'K', F:'F', C: 'C', M: 'M', D: '>', '>': '>', '<': '<', R: 'R', A: '*' };
// Detection exposes creature positions only; terrain stays governed by fog.
export const detectedCreatures=state=>(state.detectCreaturesUntil>0&&state.turn<=state.detectCreaturesUntil)?state.enemies.filter(e=>e.hp>0):[];
export function minimapCells(state) {
  const cells = [];
  for (let y = 0; y < state.map.length; y++) for (let x = 0; x < state.map[y].length; x++) {
    if (state.explored.has(key(x, y))) cells.push({ x, y, tile: rememberedTile(state,x,y), visible: state.visible.has(key(x, y)) });
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
  const detected=detectedCreatures(state);
  for(const e of detected){ctx.fillStyle='#ff8c96';ctx.fillRect(e.x*sx,e.y*sy,Math.max(3,sx),Math.max(3,sy));}
  const p = state.player; ctx.fillStyle = '#fff'; ctx.fillRect(p.x * sx - 1, p.y * sy - 1, sx + 2, sy + 2);
  ctx.fillStyle = '#4cf3dc'; ctx.fillRect(p.x * sx, p.y * sy, sx, sy);
  canvas.setAttribute('aria-label', `Explored map, ${location.kind === 'crypt' ? `crypt depth ${location.depth}` : `region ${location.rx}, ${location.ry}`}. You are at tile ${p.x}, ${p.y}. ${campBearing(location)}.${detected.length?` Detect Creatures: ${detected.length} living creatures marked in pink.`:''}`);
}

// Saved regions exclude the active, newly generated region until departure.
// Overlay that region here without saving or otherwise changing the game.
export function worldMapCells(game) {
  const regions = new Map([...game.regions].filter(([id]) => id.startsWith('world:')));
  if (game.location.kind === 'world') regions.set(game.location.id, game.state);
  const cells=[...regions.values()].map(region=>({
    rx:region.rx,ry:region.ry,biome:region.biome,home:region.home,visited:true,
    current:region.rx===game.location.rx&&region.ry===game.location.ry,
    entranceKnown:Boolean(region.entrance&&region.explored.has(key(region.entrance.x,region.entrance.y))),
    questCount:0,returnCount:0,tracked:false
  }));
  for(const q of game.quests?.values()??[]){
    if(!q.accepted||q.claimed)continue;
    const target=q.complete?q.giverRegion:q.region;
    let cell=cells.find(c=>c.rx===target.rx&&c.ry===target.ry);
    if(!cell){cell={rx:target.rx,ry:target.ry,visited:false,home:false,current:false,entranceKnown:false,questCount:0,returnCount:0,tracked:false};cells.push(cell);}
    cell[q.complete?'returnCount':'questCount']++;if(game.trackedQuest===q.id)cell.tracked=true;
  }
  return cells.sort((a,b)=>a.ry-b.ry||a.rx-b.rx);
}
export function worldMapLayout(cells, width = 160, height = 120) {
  const xs = cells.map(c => c.rx), ys = cells.map(c => c.ry);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const size = Math.min(width / Math.max(5, maxX - minX + 3), height / Math.max(5, maxY - minY + 3));
  return { size, x: width / 2 - (minX + maxX + 1) / 2 * size, y: height / 2 - (minY + maxY + 1) / 2 * size };
}
export function drawWorldMinimap(canvas, game) {
  const cells = worldMapCells(game), ctx = canvas.getContext('2d');
  ctx.globalAlpha = 1; ctx.fillStyle = '#080c12'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!cells.length) { canvas.setAttribute('aria-label', 'World map: no visited regions.'); return; }
  const layout = worldMapLayout(cells, canvas.width, canvas.height), size = layout.size;
  for (const cell of cells) {
    const x = layout.x + cell.rx * size, y = layout.y + cell.ry * size;
    ctx.fillStyle = ({forest:'#547749',marsh:'#47717b',highlands:'#8a887b',ashlands:'#99594f'})[cell.biome]??'#202c38'; ctx.fillRect(x + 1, y + 1, Math.max(.5, size - 2), Math.max(.5, size - 2));
    if (cell.entranceKnown) { ctx.fillStyle = '#d4a5ff'; const mark = Math.max(1, size / 5); ctx.fillRect(x + size - mark - 2, y + 2, mark, mark); }
    if (cell.home && size >= 10) { ctx.font = `bold ${Math.min(13, size * .6)}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffe0a0'; ctx.fillText('C', x + size * ((cell.questCount||cell.returnCount)? .72 : .5), y + size * ((cell.questCount||cell.returnCount)? .72 : .5)); }
    if(cell.questCount||cell.returnCount){
      // Distinct from the purple entrance dot and teal player border.
      const radius=Math.max(2,Math.min(6,size*.24)),cx=x+size*.32,cy=y+size*.33;
      ctx.fillStyle=cell.tracked?'#ffe6a0':'#edc76d';ctx.fillRect(cx-radius,cy-radius,radius*2,radius*2);
      if(size>=12){ctx.font=`bold ${Math.max(8,Math.min(12,size*.48))}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#141a20';ctx.fillText(cell.returnCount?'✓':'!',cx,cy);}
    }
    if (cell.current) { ctx.strokeStyle = '#4cf3dc'; ctx.lineWidth = Math.min(2, size / 5); ctx.strokeRect(x + 1, y + 1, Math.max(.5, size - 2), Math.max(.5, size - 2)); }
  }
  canvas.setAttribute('aria-label', `World map: ${cells.filter(c=>c.visited).length} visited regions. Current region ${game.location.rx}, ${game.location.ry}${game.location.kind === 'crypt' ? ', underground' : ''}. C marks camp; purple marks discovered entrances. Gold ! marks accepted quest objectives; ✓ marks rewards ready to collect. ${cells.filter(c=>c.questCount||c.returnCount).map(c=>`Region ${c.rx}, ${c.ry}: ${c.questCount} quest objectives, ${c.returnCount} rewards ready.`).join(' ')} Unvisited quest regions show no terrain.`);
}
