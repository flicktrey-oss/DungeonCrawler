import {directions,key,walkable} from './dungeon.js';
import {rememberedTile} from './map-memory.js';
import {clearShot} from './techniques.js';
const adjacent=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;
export function planTravel(game,x,y){
 const s=game.state,p=s.player;
 if(!Number.isInteger(x)||!Number.isInteger(y)||!s.visible.has(key(x,y)))return null;
 if(s.enemies.some(e=>e.hp>0&&e.x===x&&e.y===y))return null;
 const item=s.items.find(i=>i.x===x&&i.y===y),event=s.encounters?.find(e=>e.x===x&&e.y===y),tile=s.map[y]?.[x];
 const person=tile==='M'||tile==='V';
 let intent=item?{type:'pickup',item}:person||event&&['shrine','woodland'].includes(event.type)||tile==='C'||tile==='F'?{type:'interact',event}:tile==='D'||tile==='>'?{type:'descend'}:tile==='<'?{type:'ascend'}:null;
 if(!person&&!walkable(s.map,x,y))return null;
 const target={x,y},reached=point=>person?adjacent(point,target):point.x===x&&point.y===y;
 const queue=[{x:p.x,y:p.y,path:[]}],seen=new Set([key(p.x,p.y)]);
 const occupied=new Set(s.enemies.filter(e=>e.hp>0&&s.visible.has(key(e.x,e.y))).map(e=>key(e.x,e.y)));
 for(let i=0;i<queue.length;i++){
  const node=queue[i];if(reached(node))return {steps:node.path,intent,target,map:s.map,game};
  for(const[dx,dy]of directions){
   const xx=node.x+dx,yy=node.y+dy,k=key(xx,yy);
   if(seen.has(k)||!s.explored.has(k)||occupied.has(k)||!s.map[yy]?.[xx]||!walkable([[rememberedTile(s,xx,yy)]],0,0))continue;
   seen.add(k);queue.push({x:xx,y:yy,path:[...node.path,{x:xx,y:yy}]});
  }
 }
 return null;
}
export function travelThreat(state,next=state.player){
 for(const e of state.enemies){
  if(e.hp<=0||!state.visible.has(key(e.x,e.y)))continue;
  const dx=Math.abs(e.x-next.x),dy=Math.abs(e.y-next.y),distance=dx+dy;
  if(e.intent||distance<=1)return true;
  if(e.territory&&Math.abs(next.x-e.territory.x)+Math.abs(next.y-e.territory.y)<=e.territory.radius)return true;
  const ranged=(['frog','pondFrog'].includes(e.kind)&&distance<=2&&(!dx||!dy))||(e.kind==='beetle'&&dx*dx+dy*dy<=9)||(e.kind==='goat'&&distance<=3&&(!dx||!dy));
  if(ranged&&clearShot(state,e,next))return true;
 }
 return false;
}
