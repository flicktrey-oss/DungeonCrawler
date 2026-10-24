export const riverOffset=v=>Math.min(4,Math.max(0,Math.floor((Math.abs(v)-3)/3)));
export const onSurfaceRiver=(x,y,p)=>Boolean(p&&Math.abs((x-p.cx)*p.x+(y-p.cy)*p.y-riverOffset(-(x-p.cx)*p.y+(y-p.cy)*p.x))<=1);
// A shared river plan, independent of visit order. The first woodland's quest
// crossing remains special; other stretches have ordinary trail bridges.
export function buildSurfaceRiver(map,rx,ry,forest){
 const cx=forest.rx*40+20-forest.rx*8,cy=forest.ry*30+15-forest.ry*7;
 if(forest.rx&&rx!==forest.rx||forest.ry&&ry!==forest.ry)return null;
 for(let y=0;y<30;y++)for(let x=0;x<40;x++){
  const gx=rx*40+x,gy=ry*30+y,u=(gx-cx)*forest.rx+(gy-cy)*forest.ry,v=-(gx-cx)*forest.ry+(gy-cy)*forest.rx,d=Math.abs(u-riverOffset(v));
  if(d<=1)map[y][x]='~';else if(d<=3&&x>0&&x<39&&y>0&&y<29&&[',','.','T','^','Y','~',';'].includes(map[y][x]))map[y][x]=',';
 }
 if(rx!==forest.rx||ry!==forest.ry){
  if(forest.rx){for(let x=0;x<40;x++)if(map[15][x]==='~')map[15][x]='=';}
  else for(let y=0;y<30;y++)if(map[y][20]==='~')map[y][20]='=';
 }
 return {x:forest.rx,y:forest.ry,cx,cy};
}
