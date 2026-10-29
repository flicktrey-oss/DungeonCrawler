import {directions,key,walkable} from './dungeon.js';
export const CRYPT_THEMES={
 flooded:{name:'Flooded crypt',obstacle:'~',supply:'Waterproof supply cache'},
 rootbound:{name:'Rootbound crypt',obstacle:'T',supply:'Herbalist’s abandoned supplies'},
 ossuary:{name:'Ossuary',obstacle:'#',supply:'Gravewarden’s supply cache'}
};
// Keep every floor tile connected while adding cover and alternate room routes.
export function themeCrypt(d,rng){
 const theme=rng.pick(Object.keys(CRYPT_THEMES)),info=CRYPT_THEMES[theme];
 const connected=()=>{const seen=new Set([key(d.start.x,d.start.y)]),queue=[d.start];for(let i=0;i<queue.length;i++)for(const[dx,dy]of directions){const x=queue[i].x+dx,y=queue[i].y+dy,k=key(x,y);if(!seen.has(k)&&walkable(d.map,x,y)){seen.add(k);queue.push({x,y});}}return d.map.every((row,y)=>row.every((_,x)=>!walkable(d.map,x,y)||seen.has(key(x,y))));};
 const scenery=[];
 for(const r of d.rooms.slice(1)){
  for(const [x,y]of [[r.x+1,r.y+1],[r.x+r.w-2,r.y+r.h-2]]){
   if((x===d.start.x&&y===d.start.y)||(x===d.stairs.x&&y===d.stairs.y)||d.map[y][x]!=='.')continue;
   d.map[y][x]=info.obstacle;if(!connected())d.map[y][x]='.';
  }
  if(theme==='ossuary')scenery.push({x:r.x,y:r.y,type:'bones'});
 }
 return {...d,cryptTheme:theme,cryptName:info.name,scenery};
}
