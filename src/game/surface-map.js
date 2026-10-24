import {onSurfaceRiver} from './surface-river.js';
import {WIDTH,HEIGHT} from './dungeon.js';
import {worldId} from './world.js';
const numeric=p=>typeof p==='string'&&/^-?\d+$/.test(p);
export const areaCoordinates=(x,y)=>({rx:Math.floor(x/WIDTH),ry:Math.floor(y/HEIGHT)});
export function createSurfaceMap(chunks,field='map'){
 let areas=[...chunks.values()];const bounds={minX:Math.min(...areas.map(a=>a.rx*WIDTH)),minY:Math.min(...areas.map(a=>a.ry*HEIGHT)),maxX:Math.max(...areas.map(a=>(a.rx+1)*WIDTH)),maxY:Math.max(...areas.map(a=>(a.ry+1)*HEIGHT))};
 const areaAt=(x,y)=>{const {rx,ry}=areaCoordinates(x,y);return chunks.get(worldId(rx,ry));},rows=new Map();
 return new Proxy([],{
  get(_target,p){
   if(p==='refreshBounds')return ()=>{areas=[...chunks.values()];Object.assign(bounds,{minX:Math.min(...areas.map(a=>a.rx*WIDTH)),minY:Math.min(...areas.map(a=>a.ry*HEIGHT)),maxX:Math.max(...areas.map(a=>(a.rx+1)*WIDTH)),maxY:Math.max(...areas.map(a=>(a.ry+1)*HEIGHT))});};
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
 const encounterIds=new Map(data.encounters.filter(e=>/^(crypt|den|villager|caravan|shrine|cache):/.test(e.id)).map(e=>[e.id,`${worldId(data.rx,data.ry)}/${e.id}`]));
 for(const e of data.encounters)if(encounterIds.has(e.id))e.id=encounterIds.get(e.id);
 for(const e of [...data.enemies,...data.items])if(encounterIds.has(e.eventId))e.eventId=encounterIds.get(e.eventId);
 const dx=data.rx*WIDTH,dy=data.ry*HEIGHT,seen=new WeakSet();
 const point=p=>{if(!p||seen.has(p))return;seen.add(p);p.x+=dx;p.y+=dy;};
 for(const e of data.enemies){point(e);point(e.territory);e.originArea=worldId(data.rx,data.ry);}
 for(const e of [...data.items,...data.scenery,...data.encounters])point(e);
 point(data.landmark);point(data.routeLandmark);
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

// Remove artificial edge walls while retaining real river water and town walls.
export function joinSurfaceAreas(first,second){
 let a=first,b=second;if(a.rx>b.rx||a.ry>b.ry)[a,b]=[b,a];
 const horizontal=b.rx!==a.rx,length=horizontal?HEIGHT:WIDTH,center=horizontal?15:20;
 for(let v=1;v<length-1;v++)for(const [area,edge]of [[a,true],[b,false]])for(let inward=0;inward<2;inward++){
  const x=horizontal?(edge?39-inward:inward):v,y=horizontal?v:(edge?29-inward:inward),t=area.map[y][x];
  const artificial=['T','^','Y'].includes(t)||t==='~'&&area.biome==='marsh'&&!onSurfaceRiver(area.rx*WIDTH+x,area.ry*HEIGHT+y,area.riverForward);
  if(artificial)area.map[y][x]=Math.abs(v-center)<=1?'.':',';
 }
}
