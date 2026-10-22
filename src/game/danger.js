import {key,walkable} from './dungeon.js';
import {pathStep} from './ai.js';

export function territoryOf(enemy){
 const t=enemy?.territory;
 return t&&Number.isInteger(t.x)&&Number.isInteger(t.y)&&Number.isInteger(t.radius)&&t.radius>0?t:null;
}
export const insideTerritory=(territory,point)=>Math.abs(point.x-territory.x)+Math.abs(point.y-territory.y)<=territory.radius;
export function dangerAt(state){
 return state.enemies.find(e=>e.hp>0&&territoryOf(e)&&insideTerritory(e.territory,state.player))?.territory??null;
}
export function visibleDangerPockets(state){
 const seen=new Set(),pockets=[];
 for(const e of state.enemies){
  const t=territoryOf(e);if(e.hp<=0||!t||!state.visible.has(key(e.x,e.y)))continue;
  const id=`${t.x},${t.y}:${t.radius}`;if(seen.has(id))continue;
  seen.add(id);pockets.push(t);
 }
 return pockets;
}
export function territoryObstacles(state,enemy,bounded=false){
 const occupied=new Set(state.enemies.filter(e=>e!==enemy&&e.hp>0).map(e=>key(e.x,e.y)));
 if(state.companion)occupied.add(key(state.companion.x,state.companion.y));
 if(bounded){const t=territoryOf(enemy);if(t)for(let y=0;y<state.map.length;y++)for(let x=0;x<state.map[y].length;x++)if(!insideTerritory(t,{x,y}))occupied.add(key(x,y));}
 return occupied;
}
// Returning is the creature's entire action. It neither attacks nor resolves an
// old telegraph against an adventurer who has stepped beyond the warning zone.
export function returnToTerritory(state,enemy){
 const t=territoryOf(enemy);if(!t)return;const occupied=territoryObstacles(state,enemy);occupied.add(key(state.player.x,state.player.y));
 let target=null;
 for(let radius=0;radius<=t.radius&&!target;radius++)for(let y=Math.max(0,t.y-radius);y<=Math.min(state.map.length-1,t.y+radius)&&!target;y++)for(let x=Math.max(0,t.x-radius);x<=Math.min(state.map[y].length-1,t.x+radius);x++){
  if(Math.abs(x-t.x)+Math.abs(y-t.y)!==radius||!walkable(state.map,x,y)||occupied.has(key(x,y)))continue;
  target={x,y};break;
 }
 if(!target||target.x===enemy.x&&target.y===enemy.y)return;
 const step=pathStep(state.map,enemy,target,occupied);if(step)Object.assign(enemy,step);
}
