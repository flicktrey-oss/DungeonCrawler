import {worldMapCells,worldMapLayout} from './minimap.js';
import {regionInfo,BIOMES,threatLabel} from './game/world.js';
// Canvas coordinates, independent of CSS scaling or touch/desktop input.
export function inspectMapAt(game,view,x,y,width=160,height=120){
 if(!game||!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=width||y>=height)return null;
 if(view==='world'){
  const cells=worldMapCells(game),layout=worldMapLayout(cells,width,height),rx=Math.floor((x-layout.x)/layout.size),ry=Math.floor((y-layout.y)/layout.size);
  if(!cells.some(c=>c.rx===rx&&c.ry===ry))return null;
  return {view,rx,ry};
 }
 const s=game.state,tx=Math.floor(x/width*s.map[0].length),ty=Math.floor(y/height*s.map.length);
 if(!s.home&&!s.city&&!s.explored.has(`${tx},${ty}`))return null;
 return {view:'local',rx:game.location.rx,ry:game.location.ry,locationId:game.location.id,x:tx,y:ty};
}
export function mapInspectionText(game,selection){
 if(!selection)return '';
 const local=selection.view==='local';if(local&&selection.locationId!==game.location.id)return '';
 const info=local?{...BIOMES[game.state.biome],recommended:game.state.recommended??BIOMES[game.state.biome].recommended}:regionInfo(game.state.seed,selection.rx,selection.ry);
 const safe=selection.rx===0&&selection.ry===0&&(!local||game.location.kind==='world')||info.name==='Northwatch';
 const name=safe&&info.name!=='Northwatch'?'Lantern Camp':info.name;
 return `${name} · Region (${selection.rx}, ${selection.ry})${local?` · Tile (${selection.x}, ${selection.y})${game.location.kind==='crypt'?` · Crypt depth ${game.location.depth}`:''}`:''}. Recommended level ${info.recommended} · Your level ${game.state.player.level} · ${safe?'Safe settlement':threatLabel(info.recommended,game.state.player.level)}. Special encounters may be harder.`;
}
