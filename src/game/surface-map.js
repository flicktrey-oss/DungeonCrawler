import {WIDTH,HEIGHT} from './dungeon.js';
import {worldId} from './world.js';
const numeric=p=>typeof p==='string'&&/^-?\d+$/.test(p);
export const areaCoordinates=(x,y)=>({rx:Math.floor(x/WIDTH),ry:Math.floor(y/HEIGHT)});
export function createSurfaceMap(chunks,field='map'){
 const areas=[...chunks.values()],bounds={minX:Math.min(...areas.map(a=>a.rx*WIDTH)),minY:Math.min(...areas.map(a=>a.ry*HEIGHT)),maxX:Math.max(...areas.map(a=>(a.rx+1)*WIDTH)),maxY:Math.max(...areas.map(a=>(a.ry+1)*HEIGHT))};
 const areaAt=(x,y)=>{const {rx,ry}=areaCoordinates(x,y);return chunks.get(worldId(rx,ry));},rows=new Map();
 return new Proxy([],{
  get(_target,p){
   if(p==='bounds')return bounds;if(p==='areaAt')return areaAt;if(p==='length')return bounds.maxY;
   if(!numeric(p))return undefined;const y=Number(p);if(y<bounds.minY||y>=bounds.maxY)return undefined;
   if(!rows.has(y))rows.set(y,new Proxy([],{
    get(_row,k){if(k==='length')return bounds.maxX;if(!numeric(k))return undefined;const x=Number(k),a=areaAt(x,y);return a?.[field]?.[y-a.ry*HEIGHT]?.[x-a.rx*WIDTH]??'#';},
    set(_row,k,value){if(!numeric(k))return false;const x=Number(k),a=areaAt(x,y);if(!a?.[field])return false;a[field][y-a.ry*HEIGHT][x-a.rx*WIDTH]=value;return true;}
   }));return rows.get(y);
  }
 });
}
export function offsetRegion(data){
 const dx=data.rx*WIDTH,dy=data.ry*HEIGHT,seen=new WeakSet();
 const point=p=>{if(!p||seen.has(p))return;seen.add(p);p.x+=dx;p.y+=dy;};
 for(const e of data.enemies){point(e);point(e.territory);e.originArea=worldId(data.rx,data.ry);}
 for(const e of [...data.items,...data.scenery,...data.encounters])point(e);
 if(data.bridgeLayout)for(const p of [data.bridgeLayout.center,data.bridgeLayout.guard,data.bridgeLayout.ford])point(p);
 const quests=new Set(data.encounters.map(e=>e.quest).filter(Boolean));
 for(const q of quests)if(q.giverRegion.rx===data.rx&&q.giverRegion.ry===data.ry)point(q.giverPosition);
 for(const field of ['explored','encounterSeen'])data[field]=new Set([...data[field]].map(k=>{const[x,y]=k.split(',').map(Number);return `${x+dx},${y+dy}`;}));
 return data;
}
export function joinSurfaceBorder(map,forest){
 const horizontal=Boolean(forest.rx),length=horizontal?HEIGHT:WIDTH,border=horizontal?(forest.rx>0?39:0):(forest.ry>0?29:0),axis=horizontal?forest.rx:forest.ry;
 for(let v=1;v<length-1;v++)for(let u=-1;u<=2;u++){
  const x=horizontal?border+u*axis:v,y=horizontal?v:border+u*axis,t=map[y]?.[x];
  if(t==='T')map[y][x]=',';
  if(Math.abs(v-(horizontal?15:20))<=1&&['T',',','.'].includes(t))map[y][x]='.';
 }
}
