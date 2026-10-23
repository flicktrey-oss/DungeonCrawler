import {isKingdom,generateCity} from './city.js';
import { MERCHANT } from './merchant.js';
import { Random } from './random.js';
import { WIDTH, HEIGHT, key, directions, walkable } from './dungeon.js';
import { ENCOUNTERS } from './encounters.js';
export const CAMP={x:20,y:15};
export const BIOMES={
  city:{name:'Northwatch',enemies:[],danger:1,recommended:1},
  forest:{name:'Whisperwood',enemies:['rat','beetle','rabbit'],danger:1,recommended:1},
  marsh:{name:'Lantern Marsh',enemies:['frog','leech'],danger:3,recommended:4},
  highlands:{name:'Broken Highlands',enemies:['goat','wolf'],danger:6,recommended:8},
  ashlands:{name:'Ashen Reach',enemies:['ashling','boar'],danger:9,recommended:12},
};
export function regionSeed(seed,x,y,salt='world'){let hash=2166136261;for(const c of `${seed}:${x}:${y}:${salt}`)hash=Math.imul(hash^c.charCodeAt(0),16777619);return hash>>>0;}
export const worldId=(x,y)=>`world:${x},${y}`;
export const cryptId=(x,y,depth)=>`crypt:${x},${y}:${depth}`;
const CARDINAL=[{rx:1,ry:0},{rx:0,ry:1},{rx:-1,ry:0},{rx:0,ry:-1}];
export function startingForest(seed=0){return {...CARDINAL[new Random(regionSeed(seed,0,0,'safe-trail')).int(0,3)]};}
export function startingFrontier(seed=0){
 const f=startingForest(seed),rng=new Random(regionSeed(seed,0,0,'frontier'));
 const offset=rng.pick([{rx:f.rx,ry:f.ry},{rx:-f.ry,ry:f.rx},{rx:f.ry,ry:-f.rx}]);
 return {rx:f.rx+offset.rx,ry:f.ry+offset.ry,biome:rng.next()<.35?'forest':'marsh'};
}
export function royalRoad(seed=0){
 const f=startingForest(seed),side=f.rx||((seed&1)?1:-1),points=[{...f}],endpoints=[{rx:side,ry:f.ry},{rx:side,ry:-3},{rx:0,ry:-3},{rx:0,ry:-6}];
 let {rx,ry}=f;for(const end of endpoints){while(rx!==end.rx){rx+=Math.sign(end.rx-rx);points.push({rx,ry});}while(ry!==end.ry){ry+=Math.sign(end.ry-ry);points.push({rx,ry});}}return points;
}
export function biomeAt(rx,ry,seed=0){
 if(isKingdom(rx,ry))return 'city';
 if(rx===0&&ry===0)return 'forest';
 const start=startingForest(seed);if(rx===start.rx&&ry===start.ry)return 'forest';
 const next=startingFrontier(seed);if(rx===next.rx&&ry===next.ry)return next.biome;
 if(royalRoad(seed).some(p=>p.rx===rx&&p.ry===ry))return ry>=-1||ry===-4?'forest':'marsh';
 // Coarse seeded patches plus local variation: stable regardless of visit order.
 const local=new Random(regionSeed(seed,rx,ry,'biome-local'));
 const roll=local.next()<.28?local.next():new Random(regionSeed(seed,Math.floor(rx/2),Math.floor(ry/2),'biome-cluster')).next();
 return roll<.42?'forest':roll<.72?'marsh':roll<.93?'highlands':'ashlands';
}
export function regionInfo(seed,rx,ry){const biome=biomeAt(rx,ry,seed);return {rx,ry,biome,...BIOMES[biome]};}
export function threatLabel(recommended,level){return recommended>=level+4?'OVERWHELMING':recommended>level?'DANGEROUS':'Prepare carefully';}
export function generateWorldRegion(seed,rx,ry,visit=0){
  if(isKingdom(rx,ry))return generateCity();
  if(visit>0&&!(rx===0&&ry===0))return populateVisit(generateWorldRegion(seed,rx,ry,0),new Random(regionSeed(seed,rx,ry,`inhabitants:${visit}`)),visit);
  const rng=new Random(regionSeed(seed,rx,ry,'world:0')),home=rx===0&&ry===0,biome=biomeAt(rx,ry,seed),danger=BIOMES[biome].danger;
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
  if(home){for(let y=11;y<=19;y++)for(let x=15;x<=25;x++)map[y][x]=',';map[15][20]='C';map[16][20]='F';map[MERCHANT.y][MERCHANT.x]='M';}
  if(biome==='forest'){
    // Independent stream keeps encounter selection stable while opening the terrain.
    const meadow=new Random(regionSeed(seed,rx,ry,'meadows'));
    for(let i=0;i<7;i++){
      const cx=meadow.int(5,34),cy=meadow.int(5,24),rw=meadow.int(4,7),rh=meadow.int(2,4);
      for(let y=1;y<29;y++)for(let x=1;x<39;x++)if(map[y][x]==='T'&&((x-cx)/rw)**2+((y-cy)/rh)**2<1)map[y][x]=',';
      let x=20,y=15;while(x!==cx){if(map[y][x]==='T')map[y][x]=',';x+=Math.sign(cx-x);}while(y!==cy){if(map[y][x]==='T')map[y][x]=',';y+=Math.sign(cy-y);}
    }
  }
  const seen=new Set([key(CAMP.x,CAMP.y)]),queue=[CAMP];
  for(let i=0;i<queue.length;i++)for(const[dx,dy]of directions){const x=queue[i].x+dx,y=queue[i].y+dy,k=key(x,y);if(walkable(map,x,y)&&!seen.has(k)){seen.add(k);queue.push({x,y});}}
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++)if(walkable(map,x,y)&&!seen.has(key(x,y)))map[y][x]=blocker;
  const occupied=new Set([key(20,15),...(home?['24,17','16,18','15,18','15,17']:[]),...encounters.map(e=>key(e.x,e.y))]),available=[];
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
  if(home){scenery.push({x:15,y:18,type:'bones'},{x:15,y:17,type:'grave'});}
  if(!home){const landmark=encounters.find(e=>e.type==='den')??spawns.find(e=>e.kind==='rabbit'||e.kind==='rat');if(landmark)for(let n=1;n<=4;n++){const x=landmark.x+(landmark.x<20?n:-n),y=landmark.y;if(walkable(map,x,y)&&!scenery.some(d=>d.x===x&&d.y===y))scenery.push({x,y,type:'tracks'});}}
  const baseMap=map.map(row=>row.map(t=>['B','V','W','S','K'].includes(t)?',':t));
  return {map,baseMap,biome,danger,recommended:BIOMES[biome].recommended,encounters,scenery,entrance:encounters.find(e=>e.type==='crypt')??null,landmark:null,spawns,lootSpots:[],home,rx,ry,visit};
}

// Terrain and crypt entrances belong to the region. People, beasts and rewards
// are a visit layer, placed without carving new paths or altering the landscape.
function populateVisit(base,rng,visit){
 const map=base.baseMap.map(row=>[...row]),encounters=base.encounters.filter(e=>e.type==='crypt').map(e=>({...e,used:false}));
 const sites=[];
 for(let y=5;y<25;y++)for(let x=5;x<35;x++){
  if(Math.abs(x-CAMP.x)+Math.abs(y-CAMP.y)<=6)continue;
  if(!base.scenery.some(p=>p.x===x&&p.y===y)&&[-1,0,1].every(dy=>[-1,0,1].every(dx=>walkable(map,x+dx,y+dy)))&&encounters.every(e=>Math.abs(e.x-x)+Math.abs(e.y-y)>=6))sites.push({x,y});
 }
 const types=Object.keys(ENCOUNTERS).filter(t=>t!=='crypt'),count=rng.int(1,2);
 while(encounters.length<count&&sites.length){
  const p=sites.splice(rng.int(0,sites.length-1),1)[0],type=types.splice(rng.int(0,types.length-1),1)[0];
  encounters.push({...p,type,id:`${type}:${visit}:${encounters.length}`,used:false});map[p.y][p.x]=ENCOUNTERS[type].tile;
  for(let i=sites.length-1;i>=0;i--)if(Math.abs(sites[i].x-p.x)+Math.abs(sites[i].y-p.y)<6)sites.splice(i,1);
 }
 const occupied=new Set(encounters.map(e=>key(e.x,e.y))),available=[];
 for(let y=5;y<25;y++)for(let x=5;x<35;x++)if(walkable(map,x,y)&&!occupied.has(key(x,y))&&Math.abs(x-20)+Math.abs(y-15)>5)available.push({x,y});
 const spot=near=>{let choices=available.map((p,i)=>({p,i}));if(near){const local=choices.filter(({p})=>Math.abs(p.x-near.x)+Math.abs(p.y-near.y)<=5);if(local.length)choices=local;}const chosen=rng.pick(choices);if(!chosen)throw Error('No spawn tile');available.splice(chosen.i,1);return chosen.p;};
 const spawns=Array.from({length:7},()=>({...spot(),kind:rng.pick(BIOMES[base.biome].enemies)}));
 for(const e of encounters){
  if(e.type==='villager')for(let i=0;i<3;i++)spawns.push({...spot(e),kind:'pondFrog',questId:e.id});
  if(e.type==='den')spawns.push({x:e.x,y:e.y,kind:'elite',eventId:e.id});
  if(e.type==='caravan')for(let i=0;i<2;i++)spawns.push({...spot(e),kind:'beetle'});
 }
 return {...base,map,encounters,spawns,visit,entrance:encounters.find(e=>e.type==='crypt')??null};
}
