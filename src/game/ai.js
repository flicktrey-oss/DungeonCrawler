import { directions, key, walkable } from './dungeon.js';
// Breadth-first search returns a legal first step, treating other creatures as obstacles.
export function pathStep(map, from, target, occupied) {
  const margin=12,search=map.areaAt?{minX:Math.min(from.x,target.x)-margin,maxX:Math.max(from.x,target.x)+margin,minY:Math.min(from.y,target.y)-margin,maxY:Math.max(from.y,target.y)+margin}:null;
  const queue=[{x:from.x,y:from.y,first:null}], seen=new Set([key(from.x,from.y)]);
  for(let i=0;i<queue.length;i++) {
    const node=queue[i];
    for(const [dx,dy] of directions) {
      const x=node.x+dx,y=node.y+dy,k=key(x,y);
      if(search&&(x<search.minX||x>search.maxX||y<search.minY||y>search.maxY))continue;
      if(!walkable(map,x,y)||seen.has(k)||occupied.has(k)) continue;
      const first=node.first??{x,y};
      if(x===target.x&&y===target.y) return first;
      seen.add(k); queue.push({x,y,first});
    }
  }
  return null;
}
