import {Random} from './random.js';
import {regionSeed,worldId,startingForest,BIOMES} from './world.js';
import {WIDTH,HEIGHT,key,walkable,directions} from './dungeon.js';
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export const travelAltars=g=>(g.state.seamless?g.state.encounters:g.surfaceSnapshot?.encounters??[]).filter(e=>e.type==='altar');
export const nearAltar=g=>g.state.seamless?travelAltars(g).find(e=>distance(e,g.state.player)<=1):null;
export function addTravelAltar(g,data,global=false){
 if(data.encounters.some(e=>e.type==='altar'))return null;
 const rng=new Random(regionSeed(g.state.seed,data.rx,data.ry,'travel-altar')),forest=startingForest(g.state.seed),starter=data.rx===forest.rx&&data.ry===forest.ry;
 if(!data.home&&(data.city||!starter&&(data.rx%2!==0||data.ry%2!==0||rng.next()>.45)))return null;
 const dx=global?data.rx*WIDTH:0,dy=global?data.ry*HEIGHT:0;
 const surface=g.state.seamless?g.state:g.surfaceSnapshot;
 const occupied=[...data.enemies.filter(e=>e.hp>0),...data.items,...data.encounters,...data.scenery,...(global&&surface?[...surface.enemies.filter(e=>e.hp>0),...surface.items,...surface.encounters,...surface.scenery]:[])];
 if(global)occupied.push(g.state.player,g.story.prince);
 const ideal=data.home?{x:26,y:19}:starter?{x:20-forest.rx*12,y:15-forest.ry*9}:{x:20,y:15},sites=[];
 for(let y=3;y<HEIGHT-3;y++)for(let x=3;x<WIDTH-3;x++)if([',','.'].includes(data.map[y][x])&&!occupied.some(e=>Math.abs(e.x-(x+dx))+Math.abs(e.y-(y+dy))<=(['altar','bridge','villager'].includes(e.type)?2:0))){
  const neighbors=directions.filter(([xx,yy])=>walkable(data.map,x+xx,y+yy));if(neighbors.length>=3)sites.push({x,y});
 }
 if(!sites.length)return null;
 sites.sort((a,b)=>distance(a,ideal)-distance(b,ideal)||a.y-b.y||a.x-b.x);const p=sites[0],event={x:p.x+dx,y:p.y+dy,id:`${worldId(data.rx,data.ry)}/altar`,type:'altar',name:data.home?'Lantern Camp altar':`${BIOMES[data.biome].name} altar (${data.rx}, ${data.ry})`,active:Boolean(data.home)};
 data.encounters.push(event);return event;
}
export function altarThreat(g,point){return g.state.enemies.some(e=>e.hp>0&&!(e.kind==='rabbit'&&e.habitatId&&!e.bleeding&&!e.intent)&&(Math.max(Math.abs(e.x-point.x),Math.abs(e.y-point.y))<=8||e.intent?.tiles.some(t=>distance(t,point)<=2)));}
export function altarTravelProblem(g,target){
 if(!g.state.seamless)return 'Travel altars are available on the surface.';
 const source=nearAltar(g);if(!source?.active)return 'Stand beside an active travel altar.';
 if(g.story.accepted&&!g.story.complete)return 'Altar travel is unavailable during Aldren’s escort. Bring him home by road.';
 if(!target?.active||!travelAltars(g).includes(target))return 'Discover and activate that altar first.';
 if(source===target)return 'You are already at this altar.';
 if(altarThreat(g,source))return 'Enemies threaten this altar. Clear the area before traveling.';
 if(altarThreat(g,target))return 'Enemies threaten the destination altar. It is not safe to arrive.';
 if(!altarLanding(g,target))return 'There is no clear arrival tile at that altar.';
 return '';
}
export function altarLanding(g,target){
 const s=g.state,occupied=new Set([...s.enemies.filter(e=>e.hp>0),...s.encounters.filter(e=>e!==target&&e.type==='habitat'&&!e.destroyed),g.story.prince].map(e=>key(e.x,e.y)));
 return [...directions.map(([dx,dy])=>({x:target.x+dx,y:target.y+dy})),{x:target.x,y:target.y}].find(p=>walkable(s.map,p.x,p.y)&&!occupied.has(key(p.x,p.y))&&!s.encounters.some(e=>e!==target&&e.x===p.x&&e.y===p.y));
}
export function altarAction(g,a){
 const source=nearAltar(g);if(!source){g.message('Stand beside a travel altar.');return false;}
 if(a.type==='activateAltar'){
  if(source.active){g.message('This altar is already active.');return false;}
  if(altarThreat(g,source)){g.message('Enemies threaten this altar. Clear the area before activating it.');return false;}
  source.active=true;g.message(`${source.name} awakens. Its light is linked to Lantern Camp.`);return true;
 }
 const target=travelAltars(g).find(e=>e.id===a.destination),problem=altarTravelProblem(g,target);if(problem){g.message(problem);return false;}
 Object.assign(g.state.player,altarLanding(g,target));g.syncArea();g.interactionTarget=null;g.state.enemyEffects=[];g.message(`You step through the altar light to ${target.name}.`);return true;
}
