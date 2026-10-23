import { projectileCount } from './items.js';
import {key} from './dungeon.js';
// Grid ray shared by validation and targeting. Creatures and solid terrain block shots;
// diagonal rays cannot squeeze between solid corners, even under Mind Vision.
export function clearShot(state,from,to){
 const solid=(x,y)=>!state.map[y]?.[x]||['#','T','^','Y','M','V','X'].includes(state.map[y][x]);
 let x=from.x,y=from.y;const dx=Math.abs(to.x-x),dy=-Math.abs(to.y-y),sx=x<to.x?1:-1,sy=y<to.y?1:-1;let err=dx+dy;
 while(x!==to.x||y!==to.y){
  const e=2*err,nx=e>=dy?x+sx:x,ny=e<=dx?y+sy:y;
  if(nx!==x&&ny!==y&&(solid(nx,y)||solid(x,ny)))return false;
  if(e>=dy)err+=dy;if(e<=dx)err+=dx;x=nx;y=ny;
  if(solid(x,y))return false;
  if((x!==to.x||y!==to.y)&&state.companion&&state.companion!==from&&x===state.companion.x&&y===state.companion.y)return false;
  if((x!==to.x||y!==to.y)&&state.enemies.some(o=>o.hp>0&&o.x===x&&o.y===y))return false;
 }
 return true;
}
export function techniqueTarget(game,type,x,y){
 const s=game.state,p=s.player;
 if(!['reach','throw'].includes(type)||!Number.isInteger(x)||!Number.isInteger(y)||!s.visible.has(key(x,y)))return null;
 const dx=Math.abs(x-p.x),dy=Math.abs(y-p.y);
 if(type==='reach'&&(!(p.weapon?.reach>=2)||dx&&dy||dx+dy<1||dx+dy>p.weapon.reach))return null;
 if(type==='throw'&&(!projectileCount(p)||dx*dx+dy*dy>16||dx+dy===0))return null;
 const enemy=s.enemies.find(e=>e.hp>0&&e.x===x&&e.y===y);
 return enemy&&clearShot(s,p,enemy)?enemy:null;
}
export const techniqueTargets=(game,type)=>game.state.enemies.filter(e=>techniqueTarget(game,type,e.x,e.y));
