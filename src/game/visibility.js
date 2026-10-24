import { gearBonus } from './items.js';
import { key,mapBounds } from './dungeon.js';
export function updateVisibility(state) {
  const {player:p,map}=state; state.visible=new Set();const bounds=mapBounds(map),radius=7+gearBonus(p,'sightBonus');
  for(let y=Math.max(bounds.minY,p.y-radius);y<=Math.min(bounds.maxY-1,p.y+radius);y++) for(let x=Math.max(bounds.minX,p.x-radius);x<=Math.min(bounds.maxX-1,p.x+radius);x++) {
    if((x-p.x)**2+(y-p.y)**2>radius*radius) continue;
    let xx=p.x, yy=p.y, dx=Math.abs(x-xx),dy=-Math.abs(y-yy),sx=xx<x?1:-1,sy=yy<y?1:-1,err=dx+dy, clear=true;
    while(xx!==x||yy!==y) {
      if((xx!==p.x||yy!==p.y)&&['#','T','^','Y'].includes(map[yy][xx])) {clear=false;break;}
      const e=2*err; if(e>=dy){err+=dy;xx+=sx;} if(e<=dx){err+=dx;yy+=sy;}
    }
    if(clear || state.turn<=state.mindVisionUntil && state.mindVisionUntil>0){state.visible.add(key(x,y));state.explored.add(key(x,y));}
  }
  if(state.encounterSeen)for(const e of state.encounters??[])if(state.visible.has(key(e.x,e.y)))state.encounterSeen.add(key(e.x,e.y));
}
