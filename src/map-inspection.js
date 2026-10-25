import {worldMapCells,worldMapLayout,minimapFrame} from './minimap.js';
import {regionInfo,BIOMES,threatLabel,worldId} from './game/world.js';
// Canvas coordinates, independent of CSS scaling or touch/desktop input.
export function inspectMapAt(game,view,x,y,width=160,height=120,zoom=1){
 if(!game||!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=width||y>=height)return null;
 if(game.state.seamless){const frame=minimapFrame(game.state,view,undefined,zoom),tx=Math.floor(frame.minX+x/width*(frame.maxX-frame.minX)),ty=Math.floor(frame.minY+y/height*(frame.maxY-frame.minY)),s=game.state;if(!s.explored.has(`${tx},${ty}`)&&!s.settlementBounds.some(b=>tx>=b.minX&&tx<b.maxX&&ty>=b.minY&&ty<b.maxY)&&!s.chartedRegions?.has(worldId(Math.floor(tx/40),Math.floor(ty/30)))&&!s.surfaceMarkers?.some(m=>Math.abs(m.x-tx)<=2&&Math.abs(m.y-ty)<=2))return null;return {view:'surface',x:tx,y:ty};}
 if(view==='world'){
  const cells=worldMapCells(game),layout=worldMapLayout(cells,width,height,zoom,game.location),rx=Math.floor((x-layout.x)/layout.size),ry=Math.floor((y-layout.y)/layout.size);
  if(!cells.some(c=>c.rx===rx&&c.ry===ry))return null;
  return {view,rx,ry};
 }
 const s=game.state,frame=minimapFrame(s,view,undefined,zoom),tx=Math.floor(frame.minX+x/width*(frame.maxX-frame.minX)),ty=Math.floor(frame.minY+y/height*(frame.maxY-frame.minY));
 if(!s.map[ty]?.[tx])return null;
 if(!s.home&&!s.city&&!s.explored.has(`${tx},${ty}`))return null;
 return {view:'local',rx:game.location.rx,ry:game.location.ry,locationId:game.location.id,x:tx,y:ty};
}
export function mapInspectionText(game,selection){
 if(!selection)return '';
 if(selection.view==='surface'){const a=game.areaAt(selection.x,selection.y)??regionInfo(game.state.seed,Math.floor(selection.x/40),Math.floor(selection.y/30));return a?`${a.home?'Lantern Camp':BIOMES[a.biome].name} (${selection.x}, ${selection.y})\n${a.home||a.biome==='city'?'Safe':`Lv ${a.recommended} · ${threatLabel(a.recommended,game.state.player.level)}`}`:'';}
 const local=selection.view==='local';if(local&&selection.locationId!==game.location.id)return '';
 const info=local?{...BIOMES[game.state.biome],recommended:game.state.recommended??BIOMES[game.state.biome].recommended}:regionInfo(game.state.seed,selection.rx,selection.ry);
 const safe=selection.rx===0&&selection.ry===0&&(!local||game.location.kind==='world')||info.name==='Northwatch';
 const name=safe&&info.name!=='Northwatch'?'Lantern Camp':info.name;
 const difficulty=safe?'Safe':`Lv ${info.recommended} · ${({OVERWHELMING:'Overwhelming',DANGEROUS:'Dangerous','Prepare carefully':'Stay alert'})[threatLabel(info.recommended,game.state.player.level)]}`;
 return `${name} (${selection.rx}, ${selection.ry})${local?`\nTile (${selection.x}, ${selection.y})${game.location.kind==='crypt'?` · Depth ${game.location.depth}`:''}`:''}\n${difficulty}`;
}
