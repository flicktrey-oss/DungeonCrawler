// Fixed settlement dressing; wilderness generation remains seeded independently.
export const CAMP_BUILDINGS=[
 {type:'forge',x:16,y:16,w:2,h:2},
 {type:'traderCart',x:23,y:13,w:2,h:2},
 {type:'teepee',x:14,y:10,w:2,h:2,color:0xb99c73},
 {type:'teepee',x:22,y:9,w:2,h:2,color:0xa9856c},
 {type:'teepee',x:26,y:17,w:2,h:2,color:0xb3a284}
];
export const CAMP_DECOR=[
 {type:'well',x:24,y:11},{type:'barrels',x:25,y:14},{type:'barrels',x:17,y:19},
 {type:'bench',x:18,y:19},{type:'bench',x:22,y:18},{type:'firewood',x:19,y:18},
 {type:'lanternPost',x:18,y:12},{type:'lanternPost',x:24,y:19},
 {type:'signpost',x:28,y:15},{type:'washing',x:25,y:9},
 {type:'flowers',x:12,y:12},{type:'flowers',x:28,y:21},{type:'flowers',x:16,y:8},
 {type:'bones',x:15,y:18},{type:'grave',x:15,y:17}
];
export function buildCamp(map){
 // A broad packed-earth common with meadow margins and forest at the edges.
 for(let y=3;y<27;y++)for(let x=4;x<36;x++)if(((x-20)/15)**2+((y-15)/11)**2<=1){
  if(map[y][x]==='T')map[y][x]=',';
  if(x>=12&&x<=29&&y>=8&&y<=22)map[y][x]='.';
 }
 // Keep all four through-routes and service approaches unobstructed.
 for(const b of CAMP_BUILDINGS)for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)map[y][x]='P';
 return [...CAMP_BUILDINGS,...CAMP_DECOR].map(d=>({...d}));
}
