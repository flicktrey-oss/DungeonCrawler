import {key,walkable,mapBounds} from '../game/dungeon.js';
import {visibleDangerPockets} from '../game/danger.js';

// Static amber trail marks: no timers, hidden-owner silhouettes, or fog leaks.
export function drawDangerPockets(graphics,state,tileSize=24){
 const bounds=mapBounds(state.map);
 for(const t of visibleDangerPockets(state)){
  graphics.fillStyle(0xd5a35c,.35);
  for(let y=Math.max(bounds.minY,t.y-t.radius);y<=Math.min(bounds.maxY-1,t.y+t.radius);y++)for(let x=Math.max(bounds.minX,t.x-t.radius);x<=Math.min(bounds.maxX-1,t.x+t.radius);x++){
   if(Math.abs(x-t.x)+Math.abs(y-t.y)!==t.radius||!state.visible.has(key(x,y))||!walkable(state.map,x,y))continue;
   graphics.fillRect(x*tileSize+tileSize/2-2,y*tileSize+tileSize/2-1,4,2);
  }
 }
}
