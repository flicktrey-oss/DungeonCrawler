import {walkable,key,directions} from './dungeon.js';
import {princeHere} from './story.js';
export const areaFields=['cryptTheme','cryptName','routeLandmark','bridgeLayout','baseMap','encounterSeen','map','enemies','items','explored','visible','start','stairs','upstairs','entrance','landmark','biome','danger','home','rx','ry','depth','cleared','encounters','scenery','quest','visit','recommended','city','seamless','areaBounds','settlementBounds','surfaceMarkers','riverForward','floor'];
export const areaSnapshot=s=>Object.fromEntries(areaFields.map(k=>[k,s[k]]));
export function landing(s,target,excluded=[]){
 const occupied=new Set([...s.enemies.filter(e=>e.hp>0),...s.encounters.filter(e=>e.type==='habitat'&&e.kind==='rat'&&!e.destroyed),...excluded].map(e=>key(e.x,e.y)));
 const queue=[{...target}],seen=new Set([key(target.x,target.y)]);
 for(let i=0;i<queue.length&&i<5000;i++){
  const t=queue[i];if(walkable(s.map,t.x,t.y)&&!occupied.has(key(t.x,t.y)))return {x:t.x,y:t.y};
  for(const[dx,dy]of directions){const x=t.x+dx,y=t.y+dy,k=key(x,y);if(!seen.has(k)&&walkable(s.map,x,y)){seen.add(k);queue.push({x,y});}}
 }
 throw Error('No safe arrival tile is available.');
}
export function travelingPrince(g){const c=princeHere(g),p=g.state.player;return c&&g.story.accepted&&!g.story.complete&&c.hp>0&&c.mode==='follow'&&Math.abs(c.x-p.x)+Math.abs(c.y-p.y)<=2?c:null;}
export function arrivePrince(g,c){
 if(!c)return;const p=g.state.player,spot=landing(g.state,p,[p]);Object.assign(c,spot,{locationId:g.location.id,rx:g.location.rx,ry:g.location.ry,depth:g.location.depth});
}
