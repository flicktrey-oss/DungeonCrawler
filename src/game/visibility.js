import { key } from './dungeon.js';
export function updateVisibility(state) {
  const {player:p,map}=state; state.visible=new Set();
  for(let y=Math.max(0,p.y-7);y<=Math.min(map.length-1,p.y+7);y++) for(let x=Math.max(0,p.x-7);x<=Math.min(map[0].length-1,p.x+7);x++) {
    if((x-p.x)**2+(y-p.y)**2>49) continue;
    let xx=p.x, yy=p.y, dx=Math.abs(x-xx),dy=-Math.abs(y-yy),sx=xx<x?1:-1,sy=yy<y?1:-1,err=dx+dy, clear=true;
    while(xx!==x||yy!==y) {
      if((xx!==p.x||yy!==p.y)&&['#','T','^','Y'].includes(map[yy][xx])) {clear=false;break;}
      const e=2*err; if(e>=dy){err+=dy;xx+=sx;} if(e<=dx){err+=dx;yy+=sy;}
    }
    if(clear || state.turn<=state.mindVisionUntil && state.mindVisionUntil>0){state.visible.add(key(x,y));state.explored.add(key(x,y));}
  }
  if(state.encounterSeen)for(const e of state.encounters??[])if(state.visible.has(key(e.x,e.y)))state.encounterSeen.add(key(e.x,e.y));
}
