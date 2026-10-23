// A local river crossing with a dry detour. Never blocks a region exit or the
// only route through a map. u follows the trail; v runs along the river bank.
export function buildBridge(map,rx,ry,forest){
 if(rx!==forest.rx||ry!==forest.ry)return null;
 const center={x:20-rx*8,y:15-ry*7},forward={x:rx,y:ry};
 const point=(u,v)=>({x:center.x+u*rx-v*ry,y:center.y+u*ry+v*rx});
 for(let u=-4;u<=4;u++)for(let v=-4;v<=4;v++){const p=point(u,v);map[p.y][p.x]=Math.abs(u)<=1&&Math.abs(v)<=3?'~':',';}
 for(let u=-4;u<=4;u++){const p=point(u,0);map[p.y][p.x]=Math.abs(u)<=1?'=':'.';}
 map[center.y][center.x]='X';const guard=point(-2,-1);map[guard.y][guard.x]='V';
 return {center,forward,guard};
}
