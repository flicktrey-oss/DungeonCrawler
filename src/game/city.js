// A compact, original city region. Every building has a usable doorway.
export const KINGDOM={rx:0,ry:-6,name:'Northwatch',keep:{x:20,y:7}};
export const isKingdom=(rx,ry)=>rx===KINGDOM.rx&&ry===KINGDOM.ry;
export function generateCity(){
 const map=Array.from({length:30},()=>Array(40).fill('.'));
 const wall=(x,y,w,h)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(yy===y||yy===y+h-1||xx===x||xx===x+w-1)map[yy][xx]='#';};
 wall(3,3,34,24);for(const[x,y]of [[20,3],[20,26],[3,15],[36,15]])map[y][x]='O';
 for(const[x,y,w,h]of [[6,6,7,6],[28,6,6,6],[6,19,7,5],[28,19,6,5],[15,5,11,7]]){wall(x,y,w,h);map[y+h-1][x+Math.floor(w/2)]='O';}
 map[KINGDOM.keep.y][KINGDOM.keep.x]='J';map[15][20]='Z';map[9][9]='I';map[8][10]='V';map[15][23]='N';
 return {map,baseMap:map.map(r=>[...r]),biome:'city',danger:1,recommended:1,city:true,home:false,rx:KINGDOM.rx,ry:KINGDOM.ry,visit:0,encounters:[{x:10,y:8,id:'innkeeper',type:'innkeeper',name:'Maren the Innkeeper'}],scenery:[],spawns:[],lootSpots:[],entrance:null,landmark:{...KINGDOM.keep}};
}
