import {KINGDOM} from './game/city.js';
import {journeyHints} from './game/journey.js';
import { rememberedTile } from './game/map-memory.js';
import { key,mapBounds,WIDTH,HEIGHT } from './game/dungeon.js';

const palette = {':':'#79a4aa',P:'#b89b74',L:'#c4b5a1',U:'#d5b578','X':'#dc9280','=':'#caa977',I:'#f3d59b',N:'#ecd78c',J:'#f0cc76',O:'#bf9e75',Z:'#77b8d1', B:'#d48c76',V:'#e0ddb0',W:'#bca273',S:'#b7a0e0',K:'#b9bd91',Y:'#5b4545', '#': '#5b6270', T: '#315342', '^': '#8c9489', '~': '#397082', ',': '#507447', ';': '#809064', '.': '#a18b68', '+': '#a18b68', F:'#f3a05a', C: '#ffe0a0', M: '#f2b2c5', D: '#ba99e6', R: '#a6c1c5', '>': '#ba99e6', '<': '#8ce6d1', A: '#eabf61' };
const labels = {L:'T',U:'H','X':'×',I:'I',N:'B',J:'K',B:'!',V:'?',W:'W',S:'S',K:'K', F:'F', C: 'C', M: 'M', D: '>', '>': '>', '<': '<', R: 'R', A: '*' };
// Detection exposes creature positions only; terrain stays governed by fog.
export const detectedCreatures=state=>(state.detectCreaturesUntil>0&&state.turn<=state.detectCreaturesUntil)?state.enemies.filter(e=>e.hp>0&&(!state.seamless||Math.max(Math.abs(e.x-state.player.x),Math.abs(e.y-state.player.y))<=24)):[];
export function minimapCells(state) {
  const cells=[],bounds=mapBounds(state.map),known=Boolean(!state.seamless&&(state.home||state.city));
  const add=(x,y)=>{const settlement=known||state.settlementBounds?.some(b=>x>=b.minX&&x<b.maxX&&y>=b.minY&&y<b.maxY);cells.push({x,y,tile:settlement?state.map[y][x]:rememberedTile(state,x,y),visible:Boolean(settlement||state.visible.has(key(x,y)))});};
  if(state.seamless){const points=new Set(state.explored);for(const b of state.settlementBounds)for(let y=b.minY;y<b.maxY;y++)for(let x=b.minX;x<b.maxX;x++)points.add(key(x,y));for(const k of points){const[x,y]=k.split(',').map(Number);add(x,y);}return cells;}
  for(let y=bounds.minY;y<bounds.maxY;y++)for(let x=bounds.minX;x<bounds.maxX;x++)if(known||state.explored.has(key(x,y)))add(x,y);
  return cells;
}
export function campBearing(location) {
  const parts = [];
  if (location.rx) parts.push(`${Math.abs(location.rx)} ${location.rx > 0 ? 'W' : 'E'}`);
  if (location.ry) parts.push(`${Math.abs(location.ry)} ${location.ry > 0 ? 'N' : 'S'}`);
  return `${location.kind === 'crypt' ? 'Surface camp' : 'Camp'}: ${parts.join(' · ') || 'this region'}`;
}
export function minimapFrame(state,view='world',cells){
 if(!state.seamless)return mapBounds(state.map);
 if(view==='local')return {minX:state.player.x-20,minY:state.player.y-15,maxX:state.player.x+20,maxY:state.player.y+15};
 const frame={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity},include=(x,y)=>{frame.minX=Math.min(frame.minX,x);frame.minY=Math.min(frame.minY,y);frame.maxX=Math.max(frame.maxX,x+1);frame.maxY=Math.max(frame.maxY,y+1);};
 for(const c of cells??minimapCells(state))include(c.x,c.y);
 for(const m of state.surfaceMarkers??[])include(m.x,m.y);
 for(const r of state.chartedRegions?.values()??[]){include(r.rx*WIDTH,r.ry*HEIGHT);include((r.rx+1)*WIDTH-1,(r.ry+1)*HEIGHT-1);}
 return frame;
}
export function drawMinimap(canvas,state,location,objectives=[],view='world'){
 const cells=minimapCells(state),frame=minimapFrame(state,view,cells),ctx=canvas.getContext('2d'),sx=canvas.width/(frame.maxX-frame.minX),sy=canvas.height/(frame.maxY-frame.minY),mx=x=>(x-frame.minX)*sx,my=y=>(y-frame.minY)*sy,inside=p=>p.x>=frame.minX&&p.x<frame.maxX&&p.y>=frame.minY&&p.y<frame.maxY;
 ctx.globalAlpha=1;ctx.fillStyle='#080c12';ctx.fillRect(0,0,canvas.width,canvas.height);
 if(state.seamless&&view==='world')for(const r of state.chartedRegions?.values()??[]){ctx.fillStyle=({forest:'#263d2c',marsh:'#263b43',highlands:'#44443c',ashlands:'#4a2d2b',city:'#354050'})[r.biome];ctx.fillRect(mx(r.rx*WIDTH),my(r.ry*HEIGHT),WIDTH*sx,HEIGHT*sy);}
 for(const cell of cells)if(inside(cell)){ctx.globalAlpha=cell.visible?1:.5;ctx.fillStyle=state.seamless&&[',',';'].includes(cell.tile)?({forest:'#507447',marsh:'#47717b',highlands:'#858678',ashlands:'#89574d',city:'#7a8ba7'})[state.map.areaAt(cell.x,cell.y)?.biome]??'#677481':palette[cell.tile]??'#677481';ctx.fillRect(Math.floor(mx(cell.x)),Math.floor(my(cell.y)),Math.ceil(sx),Math.ceil(sy));}
 ctx.globalAlpha=1;ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
 for(const objective of objectives)if(inside(objective)){ctx.strokeStyle='#ffd885';ctx.lineWidth=2;ctx.strokeRect(mx(objective.x)-2,my(objective.y)-2,sx+4,sy+4);}
 if(!state.seamless||sx>=2)for(const cell of cells)if(inside(cell)&&labels[cell.tile]&&!(state.seamless&&cell.tile==='C')){ctx.fillStyle='#111824';ctx.fillRect(mx(cell.x)-3,my(cell.y)-3,10,10);ctx.fillStyle=palette[cell.tile];ctx.fillText(labels[cell.tile],mx(cell.x)+sx/2,my(cell.y)+sy/2);}
 for(const h of state.encounters??[])if(h.type==='habitat'&&inside(h)&&state.explored.has(key(h.x,h.y))&&sx>=2){ctx.fillStyle=h.destroyed?'#77766a':h.kind==='rabbit'?'#dbce9e':'#e39c83';ctx.fillRect(mx(h.x),my(h.y),Math.max(3,sx),Math.max(3,sy));}
 const detected=detectedCreatures(state).filter(inside);for(const e of detected){ctx.fillStyle='#ff8c96';ctx.fillRect(mx(e.x),my(e.y),Math.max(3,sx),Math.max(3,sy));}
 if(state.companion&&inside(state.companion)&&state.explored.has(key(state.companion.x,state.companion.y))){ctx.fillStyle='#f5d57c';ctx.fillRect(mx(state.companion.x),my(state.companion.y),Math.max(2,sx),Math.max(2,sy));}
 if(state.seamless)for(const mark of state.surfaceMarkers??[])if(inside(mark)){const x=mx(mark.x),y=my(mark.y);ctx.fillStyle='#111824';ctx.fillRect(x-4,y-4,9,10);ctx.fillStyle=mark.quest?'#ffdc86':'#d9e1bf';ctx.fillText(mark.label,x,y+1);if(mark.quest){ctx.strokeStyle='#ffdc86';ctx.lineWidth=1;ctx.strokeRect(x-5,y-5,11,12);}}
 const p=state.player;ctx.fillStyle='#fff';ctx.fillRect(mx(p.x)-1,my(p.y)-1,sx+2,sy+2);ctx.fillStyle='#4cf3dc';ctx.fillRect(mx(p.x),my(p.y),sx,sy);
 canvas.setAttribute('aria-label',`Explored map, ${location.kind==='crypt'?`crypt depth ${location.depth}`:`region ${location.rx}, ${location.ry}`}. ${state.home||state.city?'Safe settlement map is fully revealed. ':''}You are at tile ${p.x}, ${p.y}. ${campBearing(location)}.${detected.length?` Detect Creatures: ${detected.length} living creatures marked in pink.`:''}`);
 if(state.seamless)canvas.setAttribute('aria-label',`Continuous explored map. ${view==='local'?'Nearby terrain':'Explored world'}. You are at tile ${p.x}, ${p.y}. Known terrain spans (${frame.minX}, ${frame.minY}) to (${frame.maxX-1}, ${frame.maxY-1}). ${state.chartedRegions?.size??0} charted regions. Camp and Northwatch are always marked. Gold marks accepted quests. ${detected.length?`Detect Creatures: ${detected.length} living creatures marked.`:''}`);
}

// Saved regions exclude the active, newly generated region until departure.
// Overlay that region here without saving or otherwise changing the game.
export function worldMapCells(game) {
  const regions=game.state.seamless?new Map([...game.visitedSurface].map(id=>[id,game.surfaceChunks.get(id)])):new Map([...game.regions].filter(([id])=>id.startsWith('world:')));
  if (game.location.kind === 'world'&&!game.state.seamless) regions.set(game.location.id, game.state);
  const cells=[...regions.values()].map(region=>({
    rx:region.rx,ry:region.ry,biome:region.biome,home:region.home,visited:true,
    current:region.rx===game.location.rx&&region.ry===game.location.ry,
    entranceKnown:Boolean(region.entrance&&(game.state.seamless?game.state.explored:region.explored).has(key(region.entrance.x,region.entrance.y))),
    questCount:0,returnCount:0,tracked:false,
    availableCount:(region.encounters??[]).filter(e=>e.type==='villager'&&e.quest&&!e.quest.accepted&&!e.quest.claimed&&(game.state.seamless?game.state.encounterSeen:region.encounterSeen)?.has(key(e.x,e.y))).length
  }));
  for(const region of game.surveyedRegions?.values()??[])if(!cells.some(c=>c.rx===region.rx&&c.ry===region.ry))cells.push({...region,charted:true,visited:false,current:false,entranceKnown:false,questCount:0,returnCount:0,tracked:false});
  // Known destinations are cartographic landmarks, not visited or explored maps.
  for(const place of [{rx:0,ry:0,home:true,known:true,biome:'forest',label:'Lantern Camp'},{rx:KINGDOM.rx,ry:KINGDOM.ry,kingdom:true,known:true,biome:'city',label:KINGDOM.name}]){
    let cell=cells.find(c=>c.rx===place.rx&&c.ry===place.ry);
    if(!cell){cell={visited:false,current:false,entranceKnown:false,questCount:0,returnCount:0,tracked:false};cells.push(cell);}
    Object.assign(cell,place);
  }
  for(const q of game.quests?.values()??[]){
    if(!q.accepted||q.claimed)continue;
    const target=q.complete?q.giverRegion:q.region;
    let cell=cells.find(c=>c.rx===target.rx&&c.ry===target.ry);
    if(!cell){cell={rx:target.rx,ry:target.ry,visited:false,home:false,current:false,entranceKnown:false,questCount:0,returnCount:0,tracked:false};cells.push(cell);}
    cell[q.complete?'returnCount':'questCount']++;if(game.trackedQuest===q.id)cell.tracked=true;
  }
  for(const hint of journeyHints(game)){let cell=cells.find(c=>c.rx===hint.rx&&c.ry===hint.ry);if(!cell){cell={rx:hint.rx,ry:hint.ry,visited:false,questCount:0,returnCount:0,tracked:false};cells.push(cell);}(cell.leads??=[]).push(hint);}
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
    ctx.fillStyle = ({forest:'#547749',marsh:'#47717b',highlands:'#8a887b',ashlands:'#99594f',city:'#7a8ba7'})[cell.biome]??'#202c38'; ctx.fillRect(x + 1, y + 1, Math.max(.5, size - 2), Math.max(.5, size - 2));
    if (cell.entranceKnown) { ctx.fillStyle = '#d4a5ff'; const mark = Math.max(1, size / 5); ctx.fillRect(x + size - mark - 2, y + 2, mark, mark); }
    if ((cell.home||cell.kingdom) && size >= 10) { ctx.font = `bold ${Math.min(13, size * .6)}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffe0a0'; ctx.fillText(cell.kingdom?'K':'C', x + size * ((cell.questCount||cell.returnCount||cell.availableCount)? .72 : .5), y + size * ((cell.questCount||cell.returnCount||cell.availableCount)? .72 : .5)); }
    if(cell.questCount||cell.returnCount){
      // Distinct from the purple entrance dot and teal player border.
      const radius=Math.max(2,Math.min(6,size*.24)),cx=x+size*.32,cy=y+size*.33;
      ctx.fillStyle=cell.tracked?'#ffe6a0':'#edc76d';ctx.fillRect(cx-radius,cy-radius,radius*2,radius*2);
      if(size>=12){ctx.font=`bold ${Math.max(8,Math.min(12,size*.48))}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#141a20';ctx.fillText(cell.returnCount?'✓':'!',cx,cy);}
    }
    if(cell.availableCount&&!cell.questCount&&!cell.returnCount){ctx.fillStyle='#edc76d';ctx.font=`bold ${Math.max(8,Math.min(12,size*.5))}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('?',x+size*.3,y+size*.3);}
    if(cell.leads?.length){ctx.fillStyle='#93c7eb';ctx.font=`bold ${Math.max(7,Math.min(11,size*.5))}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(cell.leads[0].symbol,x+size*.74,y+size*.7);}
    if (cell.current) { ctx.strokeStyle = '#4cf3dc'; ctx.lineWidth = Math.min(2, size / 5); ctx.strokeRect(x + 1, y + 1, Math.max(.5, size - 2), Math.max(.5, size - 2)); }
  }
  canvas.setAttribute('aria-label', `World map: ${cells.filter(c=>c.visited).length} visited regions. Current region ${game.location.rx}, ${game.location.ry}${game.location.kind === 'crypt' ? ', underground' : ''}. C marks Lantern Camp (0, 0); K marks Northwatch (0, -6). Both destinations and their settlement maps are always revealed. ${game.surveyedRegions?.size??0} charted regions. Purple marks discovered entrances; ? marks discovered quests. Gold ! marks accepted quest objectives; ✓ marks rewards ready to collect. ${cells.filter(c=>c.questCount||c.returnCount).map(c=>`Region ${c.rx}, ${c.ry}: ${c.questCount} quest objectives, ${c.returnCount} rewards ready.`).join(' ')} ${cells.filter(c=>c.availableCount).map(c=>`Region ${c.rx}, ${c.ry}: ${c.availableCount} discovered quests available.`).join(' ')} ${journeyHints(game).map(h=>`${h.label} lead in region ${h.rx}, ${h.ry}.`).join(' ')} Unvisited quest and lead regions show no terrain.`);
}
