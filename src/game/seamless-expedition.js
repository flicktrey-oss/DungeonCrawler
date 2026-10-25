import {addTravelAltar,travelAltars,altarAction} from './altars.js';
import {areaSnapshot,landing,travelingPrince,arrivePrince} from './crypt-travel.js';
import {escortCanLeave} from './story.js';
import {addHabitats,habitatAt,strikeHabitat,replenishHabitats,actHabitatResident} from './habitats.js';
import {Expedition} from './expedition.js';
import {Game} from './game.js';
import {startingForest,worldId,cryptId,BIOMES,regionInfo} from './world.js';
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
  const homeData=this.regions.get(worldId(0,0));addTravelAltar(this,homeData);const home=offsetRegion(homeData);
  this.surfaceChunks=new Map([[worldId(0,0),home]]);
  const s=this.state;s.map=createSurfaceMap(this.surfaceChunks);s.baseMap=createSurfaceMap(this.surfaceChunks,'baseMap');
  for(const field of ['enemies','items','encounters','scenery'])s[field]=[...home[field]];
  s.explored=new Set(home.explored);s.encounterSeen=new Set(home.encounterSeen);s.settlementBounds=[{minX:0,minY:0,maxX:WIDTH,maxY:HEIGHT}];s.seamless=true;s.chartedRegions=this.surveyedRegions;
  this.visitedSurface=new Set([worldId(0,0)]);this.syncArea();s.transition=false;this.refresh();
  this.message('Follow the trails in any direction. The wilderness stretches beyond camp; danger varies by biome.');
  this.message('Creatures, loot and exploration remain in place on return. Faraway creatures wait; they do not respawn or take catch-up turns.');
  this.message(`The starting woodland trail leads ${this.forest.rx>0?'east':this.forest.rx<0?'west':this.forest.ry>0?'south':'north'}. Other directions may be much more dangerous.`);
 }
 refresh(){super.refresh();if(this.state.seamless){this.state.settlementBounds=this.state.settlementBounds.filter(b=>b.minX===0&&b.minY===0||this.visitedSurface?.has(worldId(b.minX/WIDTH,b.minY/HEIGHT)));this.state.surfaceMarkers=this.surfaceWaypoints();}}
 ensureTravelAltars(){
  const surface=this.state.seamless?this.state:this.surfaceSnapshot;
  for(const data of this.surfaceChunks.values()){const event=addTravelAltar(this,data,true);if(event&&!surface.encounters.includes(event))surface.encounters.push(event);}
 }
 saveRegion(){
  if(!this.surfaceChunks)return super.saveRegion();
  if(this.state.seamless)this.surfaceSnapshot=areaSnapshot(this.state);else this.cacheCurrentCrypt();
 }
 cacheCurrentCrypt(){if(this.surfaceChunks&&this.location.kind==='crypt'){this.crypts??=new Map();this.crypts.set(this.location.id,areaSnapshot(this.state));}}
 activate(location,data,preferred){
  if(!this.surfaceChunks)return super.activate(location,data,preferred);
  const companion=travelingPrince(this);this.saveRegion();
  Object.assign(this.state,areaSnapshot(data),{seamless:false});this.location={...location};this.state.location={...location};
  this.state.areaBounds={minX:0,minY:0,maxX:WIDTH,maxY:HEIGHT};this.state.floor=Math.min(5,data.danger);
  const resident=princeHere(this);Object.assign(this.state.player,landing(this.state,preferred,resident?[resident]:[]));arrivePrince(this,companion);
  this.state.transition=true;this.state.enemyEffects=[];this.interactionTarget=null;this.refresh();
 }
 visitCrypt(rx,ry,depth,arrival='upstairs'){
  if(!this.surfaceChunks)return super.visitCrypt(rx,ry,depth,arrival);
  const id=cryptId(rx,ry,depth),cached=this.crypts?.get(id);
  if(cached){this.activate({id,kind:'crypt',rx,ry,depth},cached,cached[arrival]);this.message(`Crypt depth ${depth}/2. Your earlier exploration and encounters remain.`);}
  else super.visitCrypt(rx,ry,depth,arrival);
 }
 returnToSurface(){
  const companion=travelingPrince(this),point=this.cryptReturn;
  this.cacheCurrentCrypt();Object.assign(this.state,this.surfaceSnapshot);this.state.seamless=true;
  this.location={id:worldId(point.rx,point.ry),kind:'world',rx:point.rx,ry:point.ry,depth:0};
  const resident=princeHere(this);Object.assign(this.state.player,landing(this.state,point,resident?[resident]:[]));this.syncArea();arrivePrince(this,companion);
  this.state.transition=true;this.state.enemyEffects=[];this.interactionTarget=null;this.refresh();this.message('You return to the wilderness. The world remains as you left it.');
 }
 worldMapModel(){
  if(this.location.kind!=='crypt'||!this.surfaceSnapshot)return this;
  const view=Object.create(this),r=this.cryptReturn;
  view.state={...this.surfaceSnapshot,turn:this.state.turn,player:{...this.state.player,x:r.x,y:r.y},chartedRegions:this.surveyedRegions};
  view.location={id:worldId(r.rx,r.ry),kind:'world',rx:r.rx,ry:r.ry,depth:0};view.state.settlementBounds=view.state.settlementBounds.filter(b=>b.minX===0&&b.minY===0||this.visitedSurface.has(worldId(b.minX/WIDTH,b.minY/HEIGHT)));view.state.surfaceMarkers=view.surfaceWaypoints();return view;
 }
 surfaceWaypoints(){
  const kingdomKnown=this.visitedSurface.has(worldId(KINGDOM.rx,KINGDOM.ry)),kingdom={x:KINGDOM.rx*WIDTH+KINGDOM.keep.x,y:KINGDOM.ry*HEIGHT+KINGDOM.keep.y,label:'K',name:'Northwatch'},marks=[{x:20,y:15,label:'C',name:'Lantern Camp'},...(kingdomKnown?[kingdom]:[])];
  for(const altar of travelAltars(this))if(altar.active)marks.push({x:altar.x,y:altar.y,label:'◇',name:altar.name,altar:true});
  for(const q of this.quests.values()){if(!q.accepted||q.claimed)continue;let point;
   if(q.kind==='escort'){if(!kingdomKnown)continue;point=kingdom;}
   else if(q.complete)point=this.state.encounters.find(e=>e.quest===q&&['villager','bridge'].includes(e.type))??q.giverPosition;
   else if(q.kind==='bridge')point=q.medicineSite??q.layout.center;
   else point=q.surfaceTarget??{x:q.region.rx*WIDTH+20,y:q.region.ry*HEIGHT+15};
   if(point){const existing=marks.find(m=>m.x===point.x&&m.y===point.y);if(existing)existing.quest=true;else marks.push({x:point.x,y:point.y,label:q.complete?'✓':'!',name:q.title,quest:true});}
  }
  const c=this.story.prince,p=this.state.player;if(this.story.accepted&&!this.story.complete&&(c.mode!=='follow'||Math.abs(c.x-p.x)+Math.abs(c.y-p.y)>32)){const a=this.surfaceChunks.get(worldId(c.rx,c.ry)),point=c.depth>0&&a?.entrance?{x:a.entrance.x,y:a.entrance.y}:c;marks.push({x:point.x,y:point.y,label:'A',name:c.depth>0?'Aldren underground':'Prince Aldren'});}
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
  const prepared=this.prepareWorld(rx,ry);addHabitats(this,prepared);addTravelAltar(this,prepared);const data=offsetRegion(prepared);this.surfaceChunks.set(id,data);
  for(const e of data.enemies)this.registerEnemy(e,id);
  for(const field of ['enemies','items','encounters','scenery'])this.state[field].push(...data[field]);
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
  if(a.city&&!s.settlementBounds.some(b=>b.minX===a.rx*WIDTH&&b.minY===a.ry*HEIGHT))s.settlementBounds.push({minX:a.rx*WIDTH,minY:a.ry*HEIGHT,maxX:(a.rx+1)*WIDTH,maxY:(a.ry+1)*HEIGHT});
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
  if(['activateAltar','travelAltar'].includes(action.type))return altarAction(this,action);
  if(this.surfaceChunks&&['descend','ascend'].includes(action.type)){
   const s=this.state,p=s.player,l=this.location;
   if(!escortCanLeave(this))return false;
   if(action.type==='descend'){
    if(l.kind==='world'&&s.map[p.y]?.[p.x]==='D'){this.cryptReturn={rx:l.rx,ry:l.ry,x:p.x,y:p.y};this.visitCrypt(l.rx,l.ry,1);return true;}
    if(l.kind==='crypt'&&l.depth===1&&p.x===s.stairs.x&&p.y===s.stairs.y){this.visitCrypt(l.rx,l.ry,2);return true;}
   }else if(l.kind==='crypt'&&p.x===s.upstairs.x&&p.y===s.upstairs.y){if(l.depth===2)this.visitCrypt(l.rx,l.ry,1,'stairs');else this.returnToSurface();return true;}
   this.message('Stand on a usable staircase first.');return false;
  }
  if(!this.state.seamless)return super.resolvePlayer(action);
  const s=this.state,p=s.player;
  if(action.type==='strikeHabitat')return strikeHabitat(this,action.id);
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
  if(!this.state.transition)replenishHabitats(this);
  const c=this.story.prince;if(c.depth>0)return;const {rx,ry}=areaCoordinates(c.x,c.y);Object.assign(c,{rx,ry,locationId:worldId(rx,ry)});
 }
}
