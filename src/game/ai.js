import { directions, key, walkable } from './dungeon.js';
// Breadth-first search returns a legal first step, treating other creatures as obstacles.
export function pathStep(map, from, target, occupied) {
  const queue=[{x:from.x,y:from.y,first:null}], seen=new Set([key(from.x,from.y)]);
  for(let i=0;i<queue.length;i++) {
    const node=queue[i];
    for(const [dx,dy] of directions) {
      const x=node.x+dx,y=node.y+dy,k=key(x,y);
      if(!walkable(map,x,y)||seen.has(k)||occupied.has(k)) continue;
      const first=node.first??{x,y};
      if(x===target.x&&y===target.y) return first;
      seen.add(k); queue.push({x,y,first});
    }
  }
  return null;
}
