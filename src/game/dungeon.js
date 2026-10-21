export const WIDTH = 40, HEIGHT = 30;
export const key = (x, y) => `${x},${y}`;
export const walkable = (map, x, y) => y >= 0 && y < map.length && x >= 0 && x < map[0].length && !['#', 'T', '^', '~', 'M'].includes(map[y][x]);
export const directions = [[0,-1],[1,0],[0,1],[-1,0]];
export function generateDungeon(rng) {
  const map = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill('#'));
  const rooms = [];
  for (let attempt = 0; attempt < 180 && rooms.length < 10; attempt++) {
    const w = rng.int(4,8), h = rng.int(4,7), x = rng.int(1,WIDTH-w-2), y = rng.int(1,HEIGHT-h-2);
    if (rooms.some(r => x <= r.x+r.w && x+w >= r.x && y <= r.y+r.h && y+h >= r.y)) continue;
    const room = {x,y,w,h,cx:x+Math.floor(w/2),cy:y+Math.floor(h/2)};
    for (let yy=y; yy<y+h; yy++) for (let xx=x; xx<x+w; xx++) map[yy][xx]='.';
    if (rooms.length) {
      const previous=rooms.at(-1); let xx=previous.cx, yy=previous.cy;
      while(xx!==room.cx) { map[yy][xx]='.'; xx+=Math.sign(room.cx-xx); }
      while(yy!==room.cy) { map[yy][xx]='.'; yy+=Math.sign(room.cy-yy); }
      map[yy][xx]='.';
    }
    rooms.push(room);
  }
  for(let y=1;y<HEIGHT-1;y++) for(let x=1;x<WIDTH-1;x++) {
    if(map[y][x]!=='.') continue;
    const narrow = map[y-1][x]==='#' && map[y+1][x]==='#' || map[y][x-1]==='#' && map[y][x+1]==='#';
    if(narrow && rng.next()<0.12) map[y][x]='+';
  }
  const start={x:rooms[0].cx,y:rooms[0].cy}, last=rooms.at(-1), stairs={x:last.cx,y:last.cy};
  map[stairs.y][stairs.x]='>';
  return {map,rooms,start,stairs};
}
