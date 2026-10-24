// u follows the crossing trail; v follows the river. Bend away from the region
// exits at the ends, while keeping the quest bridge and both approaches fixed.
export function buildBridge(map,rx,ry,forest){
 if(rx!==forest.rx||ry!==forest.ry)return null;
 const center={x:20-rx*8,y:15-ry*7},forward={x:rx,y:ry};
 const point=(u,v)=>({x:center.x+u*rx-v*ry,y:center.y+u*ry+v*rx});
 const riverU=v=>Math.min(4,Math.max(0,Math.floor((Math.abs(v)-3)/3)));
 const inside=p=>p.x>=0&&p.y>=0&&p.x<map[0].length&&p.y<map.length;
 const terrain=t=>[',','.','T','~',';'].includes(t);
 // A three-tile channel stays connected through every diagonal bend.
 for(let v=-40;v<=40;v++){
  const mid=riverU(v);
  for(let u=mid-3;u<=mid+3;u++){
   const p=point(u,v);if(!inside(p))continue;
   if(Math.abs(u-mid)<=1)map[p.y][p.x]='~';
   else if(p.x>0&&p.y>0&&p.x<39&&p.y<29&&terrain(map[p.y][p.x]))map[p.y][p.x]=',';
  }
 }
 // Bank trails lead to a far ford. No river endpoint or bank opens a new exit.
 const fordV=9,fordU=riverU(fordV),ford=point(fordU,fordV);
 for(let u=fordU-2;u<=fordU+2;u++){const p=point(u,fordV);map[p.y][p.x]=Math.abs(u-fordU)<=1?':':'.';}
 for(let u=-4;u<=4;u++){
  const p=point(u,0);map[p.y][p.x]=Math.abs(u)<=1?'=':'.';
 }
 map[center.y][center.x]='X';const guard=point(-2,-1);map[guard.y][guard.x]='V';
 return {center,forward,guard,ford};
}
