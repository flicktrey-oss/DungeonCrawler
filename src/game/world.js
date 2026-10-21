import { MERCHANT } from './merchant.js';
import { Random } from './random.js';
import { WIDTH, HEIGHT, key, directions, walkable } from './dungeon.js';
import { ENCOUNTERS } from './encounters.js';
export const CAMP={x:20,y:15};
export const BIOMES={
  forest:{name:'Whisperwood',enemies:['rat','beetle'],danger:1,recommended:1},
  marsh:{name:'Lantern Marsh',enemies:['frog','leech'],danger:3,recommended:4},
  highlands:{name:'Broken Highlands',enemies:['goat','wolf'],danger:6,recommended:8},
  ashlands:{name:'Ashen Reach',enemies:['ashling','boar'],danger:9,recommended:12},
};
export function regionSeed(seed,x,y,salt='world'){let hash=2166136261;for(const c of `${seed}:${x}:${y}:${salt}`)hash=Math.imul(hash^c.charCodeAt(0),16777619);return hash>>>0;}
export const worldId=(x,y)=>`world:${x},${y}`;
export const cryptId=(x,y,depth)=>`crypt:${x},${y}:${depth}`;
export function biomeAt(rx,ry){const distance=Math.abs(rx)+Math.abs(ry);return distance<=1?'forest':distance<=3?'marsh':distance<=6?'highlands':'ashlands';}
export function generateWorldRegion(seed,rx,ry,visit=0){
  const rng=new Random(regionSeed(seed,rx,ry,`world:${visit}`)),home=rx===0&&ry===0,biome=biomeAt(rx,ry),danger=BIOMES[biome].danger;
  const map=Array.from({length:HEIGHT},()=>Array(WIDTH).fill(','));
  const blocker=biome==='forest'?'T':biome==='marsh'?'~':biome==='ashlands'?'Y':'^';
  // Elliptical groves, pools, ridges and burned stands, rather than isolated noise.
  for(let patch=0;patch<16;patch++){
    const cx=rng.int(1,38),cy=rng.int(1,28),rw=rng.int(2,6),rh=rng.int(2,5);
    for(let y=Math.max(1,cy-rh);y<Math.min(29,cy+rh);y++)for(let x=Math.max(1,cx-rw);x<Math.min(39,cx+rw);x++)if(((x-cx)/rw)**2+((y-cy)/rh)**2<1)map[y][x]=rng.next()<.82?blocker:biome==='marsh'?';':',';
  }
  for(let x=0;x<WIDTH;x++)map[0][x]=map[29][x]=blocker;
  for(let y=0;y<HEIGHT;y++)map[y][0]=map[y][39]=blocker;
  const carve=(from,to)=>{let{x,y}=from;while(x!==to.x){map[y][x]='.';x+=Math.sign(to.x-x);}while(y!==to.y){map[y][x]='.';y+=Math.sign(to.y-y);}map[y][x]='.';};
  const clearing=(p,r=2)=>{for(let y=Math.max(1,p.y-r);y<=Math.min(28,p.y+r);y++)for(let x=Math.max(1,p.x-r);x<=Math.min(38,p.x+r);x++)map[y][x]=',';};
  clearing(CAMP,3);
  for(const end of [{x:0,y:15},{x:39,y:15},{x:20,y:0},{x:20,y:29}]){const bend={x:rng.int(14,25),y:rng.int(10,20)};carve(CAMP,bend);carve(bend,end);}
  // Preserve clear arrival lanes and coordinate-aligned borders on every visit.
  for(const end of [{x:0,y:15},{x:39,y:15},{x:20,y:0},{x:20,y:29}])carve(CAMP,end);
  const encounters=[],sites=[{x:9,y:7},{x:30,y:7},{x:9,y:23},{x:30,y:23}],types=Object.keys(ENCOUNTERS);
  if(!home)for(let i=0,count=rng.int(1,2);i<count;i++){
    const p=sites.splice(rng.int(0,sites.length-1),1)[0],type=types.splice(rng.int(0,types.length-1),1)[0];
    carve(CAMP,p);clearing(p,2);map[p.y][p.x]=ENCOUNTERS[type].tile;
    encounters.push({...p,type,id:`${type}:${i}`,used:false});
  }
  if(home){for(let y=11;y<=19;y++)for(let x=15;x<=25;x++)map[y][x]=',';map[15][20]='C';map[MERCHANT.y][MERCHANT.x]='M';}
  const seen=new Set([key(CAMP.x,CAMP.y)]),queue=[CAMP];
  for(let i=0;i<queue.length;i++)for(const[dx,dy]of directions){const x=queue[i].x+dx,y=queue[i].y+dy,k=key(x,y);if(walkable(map,x,y)&&!seen.has(k)){seen.add(k);queue.push({x,y});}}
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++)if(walkable(map,x,y)&&!seen.has(key(x,y)))map[y][x]=blocker;
  const occupied=new Set([key(20,15),...encounters.map(e=>key(e.x,e.y))]),available=[];
  for(let y=5;y<25;y++)for(let x=5;x<35;x++)if(walkable(map,x,y)&&!occupied.has(key(x,y))&&Math.abs(x-20)+Math.abs(y-15)>5)available.push({x,y});
  const spot=(near=null)=>{let choices=available.map((p,i)=>({p,i}));if(near){const local=choices.filter(({p})=>Math.abs(p.x-near.x)+Math.abs(p.y-near.y)<=5);if(local.length)choices=local;}const chosen=rng.pick(choices);if(!chosen)throw Error('No spawn tile');available.splice(chosen.i,1);return chosen.p;};
  const spawns=home?[]:Array.from({length:7},()=>({...spot(),kind:rng.pick(BIOMES[biome].enemies)}));
  for(const e of encounters){
    if(e.type==='villager')for(let i=0;i<3;i++)spawns.push({...spot(e),kind:'pondFrog',questId:e.id});
    if(e.type==='den')spawns.push({x:e.x,y:e.y,kind:'elite',eventId:e.id});
    if(e.type==='caravan')for(let i=0;i<2;i++)spawns.push({...spot(e),kind:'beetle'});
  }
  const scenery=[];
  for(let i=0;i<18;i++){const p=spot();scenery.push({...p,type:rng.pick(biome==='forest'?['log','flowers','grave']:biome==='marsh'?['bones','reeds','grave']:['bones','grave','log'])});}
  return {map,biome,danger,recommended:BIOMES[biome].recommended,encounters,scenery,entrance:encounters.find(e=>e.type==='crypt')??null,landmark:null,spawns,lootSpots:[],home,rx,ry,visit};
}
