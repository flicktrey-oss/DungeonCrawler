import {addHabitats,habitatAt,strikeHabitat,replenishHabitats,actHabitatResident} from './habitats.js';
import {Expedition} from './expedition.js';
import {Game} from './game.js';
import {startingForest,worldId,BIOMES,regionInfo} from './world.js';
import {WIDTH,HEIGHT,walkable} from './dungeon.js';
import {createSurfaceMap,offsetRegion,joinSurfaceAreas,areaCoordinates} from './surface-map.js';
import {ensureCampObjectives} from './quests.js';
import {princeHere} from './story.js';
import {KINGDOM} from './city.js';
import {placeCitizens} from './town.js';

// Surface chunks are generated once and retained. Active play uses one map,
// one set of global entity arrays and the existing central TurnManager.
export class SeamlessExpedition extends Expedition{
 constructor(seed=Date.now()){
  super(seed);this.saveRegion();this.surfaceGeneration=true;this.forest=startingForest(seed);
  const home=offsetRegion(this.regions.get(worldId(0,0)));
  this.surfaceChunks=new Map([[worldId(0,0),home]]);
  const s=this.state;s.map=createSurfaceMap(this.surfaceChunks);s.baseMap=createSurfaceMap(this.surfaceChunks,'baseMap');
  for(const field of ['enemies','items','encounters','scenery'])s[field]=[...home[field]];
  s.explored=new Set(home.explored);s.encounterSeen=new Set(home.encounterSeen);s.settlementBounds=[{minX:0,minY:0,maxX:WIDTH,maxY:HEIGHT}];s.seamless=true;s.chartedRegions=this.surveyedRegions;
  this.visitedSurface=new Set([worldId(0,0)]);this.syncArea();s.transition=false;this.refresh();
  this.message('Follow the trails in any direction. The wilderness stretches beyond camp; danger varies by biome.');
  this.message('Creatures, loot and exploration remain in place on return. Faraway creatures wait; they do not respawn or take catch-up turns.');
  this.message(`The starting woodland trail leads ${this.forest.rx>0?'east':this.forest.rx<0?'west':this.forest.ry>0?'south':'north'}. Other directions may be much more dangerous.`);
 }
 refresh(){super.refresh();if(this.state.seamless)this.state.surfaceMarkers=this.surfaceWaypoints();}
 surfaceWaypoints(){
  const marks=[{x:20,y:15,label:'C',name:'Lantern Camp'},{x:KINGDOM.rx*WIDTH+KINGDOM.keep.x,y:KINGDOM.ry*HEIGHT+KINGDOM.keep.y,label:'K',name:'Northwatch'}];
  for(const q of this.quests.values()){if(!q.accepted||q.claimed)continue;let point;
   if(q.kind==='escort')point=marks[1];
   else if(q.complete)point=this.state.encounters.find(e=>e.quest===q&&['villager','bridge'].includes(e.type))??q.giverPosition;
   else if(q.kind==='bridge')point=q.medicineSite??q.layout.center;
   else point=q.surfaceTarget??{x:q.region.rx*WIDTH+20,y:q.region.ry*HEIGHT+15};
   if(point){const existing=marks.find(m=>m.x===point.x&&m.y===point.y);if(existing)existing.quest=true;else marks.push({x:point.x,y:point.y,label:q.complete?'✓':'!',name:q.title,quest:true});}
  }
  const c=this.story.prince,p=this.state.player;if(this.story.accepted&&!this.story.complete&&(c.mode!=='follow'||Math.abs(c.x-p.x)+Math.abs(c.y-p.y)>32))marks.push({x:c.x,y:c.y,label:'A',name:'Prince Aldren'});
  return marks;
 }
 areaAt(x,y){return this.state.map.areaAt?.(x,y);}
 renderBiome(x,y){
  const a=this.areaAt(x,y);if(!a||a.home||a.city)return a?.biome;
  const lx=x-a.rx*WIDTH,ly=y-a.ry*HEIGHT,edges=[{d:lx,dx:-1,dy:0},{d:39-lx,dx:1,dy:0},{d:ly,dx:0,dy:-1},{d:29-ly,dx:0,dy:1}].sort((a,b)=>a.d-b.d);
  for(const e of edges)if(e.d<4){const b=this.surfaceChunks.get(worldId(a.rx+e.dx,a.ry+e.dy));if(b&&!b.home&&!b.city&&b.biome!==a.biome&&((Math.imul(x,73856093)^Math.imul(y,19349663)^this.state.seed)>>>0)%8<4-e.d)return b.biome;}
  return a.biome;
 }
 surfaceContains(id){return Boolean(this.state?.seamless&&this.surfaceChunks?.has(id));}
 registerEnemy(enemy,origin){
  enemy.originArea??=origin;
  if(!enemy.surfaceIdentity){enemy.id=`${enemy.originArea}/${enemy.id}`;enemy.surfaceIdentity=true;}
 }
 loadChunk(rx,ry){
  const id=worldId(rx,ry);if(this.surfaceChunks.has(id))return this.surfaceChunks.get(id);
  const prepared=this.prepareWorld(rx,ry);addHabitats(this,prepared);const data=offsetRegion(prepared);this.surfaceChunks.set(id,data);
  for(const e of data.enemies)this.registerEnemy(e,id);
  for(const field of ['enemies','items','encounters','scenery'])this.state[field].push(...data[field]);
  if(data.city)this.state.settlementBounds.push({minX:rx*WIDTH,minY:ry*HEIGHT,maxX:(rx+1)*WIDTH,maxY:(ry+1)*HEIGHT});
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const neighbor=this.surfaceChunks.get(worldId(rx+dx,ry+dy));if(neighbor)joinSurfaceAreas(data,neighbor);}
  return data;
 }
 loadAround(x,y){
  const {rx,ry}=areaCoordinates(x,y);if(this.loadedCenter?.rx===rx&&this.loadedCenter?.ry===ry)return;
  for(let cy=ry-1;cy<=ry+1;cy++)for(let cx=rx-1;cx<=rx+1;cx++)this.loadChunk(cx,cy);
  this.state.map.refreshBounds();this.state.baseMap.refreshBounds();this.loadedCenter={rx,ry};
 }
 syncArea(){
  const s=this.state,p=s.player;this.loadAround(p.x,p.y);const a=this.areaAt(p.x,p.y);
  const id=worldId(a.rx,a.ry),changed=this.location.id!==id,announce=changed&&(s.biome!==a.biome||Boolean(s.home)!==Boolean(a.home)||Boolean(s.city)!==Boolean(a.city));
  this.location={id,kind:'world',rx:a.rx,ry:a.ry,depth:0};s.location={...this.location};
  for(const field of ['home','city','biome','danger','recommended','rx','ry','quest','bridgeLayout','entrance','riverForward'])s[field]=a[field];
  s.areaBounds={minX:a.rx*WIDTH,minY:a.ry*HEIGHT,maxX:(a.rx+1)*WIDTH,maxY:(a.ry+1)*HEIGHT};
  if(!this.visitedSurface.has(id)){this.visitedSurface.add(id);s.regionsDiscovered++;}
  if(changed){
   if(announce)this.message(a.home?'Lantern Camp.':`${BIOMES[a.biome].name} · recommended level ${a.recommended}${p.level<a.recommended?' — DANGER: you are underleveled.':'.'}`);
   if(a.city){const before=new Set(a.encounters);placeCitizens(this,a);for(const e of a.encounters)if(!before.has(e)){e.x+=a.rx*WIDTH;e.y+=a.ry*HEIGHT;s.encounters.push(e);}}
  }
 }
 borderPreview(){
  if(!this.state.seamless)return super.borderPreview();const p=this.state.player,l=this.location,x=p.x-l.rx*WIDTH,y=p.y-l.ry*HEIGHT;
  const edges=[{d:x,dx:-1,dy:0},{d:39-x,dx:1,dy:0},{d:y,dx:0,dy:-1},{d:29-y,dx:0,dy:1}].sort((a,b)=>a.d-b.d);
  for(const e of edges)if(e.d<=2){const next=regionInfo(this.state.seed,l.rx+e.dx,l.ry+e.dy);if(next.biome!==this.state.biome)return next;}return null;
 }
 actEnemy(enemy){
  if(!this.state.seamless)return super.actEnemy(enemy);
  this.registerEnemy(enemy,this.location.id);const p=this.state.player;
  if(Math.max(Math.abs(enemy.x-p.x),Math.abs(enemy.y-p.y))>24&&!enemy.intent&&!enemy.bleeding){enemy.actions++;return;}
  if(!actHabitatResident(this,enemy))super.actEnemy(enemy);
 }
 actCompanion(){
  const c=this.story.prince,p=this.state.player;
  if(this.state.seamless&&this.story.accepted&&!this.story.complete&&c.hp>0&&c.mode==='follow'&&Math.abs(c.x-p.x)+Math.abs(c.y-p.y)>32){c.actions++;return;}
  super.actCompanion();
 }
 prepareCampObjectives(){
  const q=this.quests.get('trailwarden');if(!q?.accepted||q.placed)return;
  const a=this.surfaceChunks.get(worldId(q.region.rx,q.region.ry)),dx=a.rx*WIDTH,dy=a.ry*HEIGHT;
  const local=e=>({...e,x:e.x-dx,y:e.y-dy});
  const data={...a,enemies:this.state.enemies.map(local),items:this.state.items.map(local),encounters:this.state.encounters.map(local),scenery:this.state.scenery.map(local)};
  const counts={enemies:data.enemies.length,items:data.items.length,encounters:data.encounters.length};ensureCampObjectives(this,data,a.rx,a.ry);
  for(const field of ['enemies','items','encounters'])for(const e of data[field].slice(counts[field])){e.x+=dx;e.y+=dy;if(e.territory){e.territory.x+=dx;e.territory.y+=dy;}if(field==='enemies')this.registerEnemy(e,worldId(a.rx,a.ry));this.state[field].push(e);}
 }
 resolvePlayer(action){
  if(!this.state.seamless)return super.resolvePlayer(action);
  const s=this.state,p=s.player;
  if(action.type==='strikeHabitat')return strikeHabitat(this,action.id);
  if(['descend','ascend'].includes(action.type)){this.message('Crypt interiors are available in Classic expedition; they are not connected to this world yet.');return false;}
  if(action.type==='move'){
   if(!Number.isInteger(action.dx)||!Number.isInteger(action.dy)||Math.abs(action.dx)+Math.abs(action.dy)!==1)return false;
   const x=p.x+action.dx,y=p.y+action.dy;
   if(s.map[y]?.[x]==='X'){this.message('The bridge is barred. Speak to Kestrel or follow the bank to the shallow ford.');return false;}
   const habitat=habitatAt(this,x,y);if(habitat?.kind==='rat'&&!habitat.destroyed)return strikeHabitat(this,habitat.id);
   if(!walkable(s.map,x,y))return false;const c=princeHere(this);
   if(c&&c.x===x&&c.y===y)Object.assign(c,{x:p.x,y:p.y,swappedTurn:s.turn+1});
   const moved=Game.prototype.resolvePlayer.call(this,action);if(moved){this.syncArea();s.companion=princeHere(this);}return moved;
  }
  const before=new Set(s.enemies),ok=super.resolvePlayer(action);
  if(ok){if(action.type==='acceptQuest')this.prepareCampObjectives();for(const e of s.enemies)if(!before.has(e))this.registerEnemy(e,this.location.id);}
  return ok;
 }
 kill(enemy){
  if(!this.state.seamless)return super.kill(enemy);
  const s=this.state,original={quest:s.quest,danger:s.danger,biome:s.biome},origin=this.surfaceChunks.get(enemy.originArea);if(origin)Object.assign(s,{quest:origin.quest,danger:origin.danger,biome:origin.biome});
  try{super.kill(enemy);}finally{Object.assign(s,original);}
 }
 finishTurn(){
  super.finishTurn();if(!this.state.seamless)return;
  replenishHabitats(this);
  const c=this.story.prince,{rx,ry}=areaCoordinates(c.x,c.y);Object.assign(c,{rx,ry,locationId:worldId(rx,ry)});
 }
}
