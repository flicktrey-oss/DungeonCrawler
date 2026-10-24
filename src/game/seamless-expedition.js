import {Expedition} from './expedition.js';
import {Game} from './game.js';
import {startingForest,worldId,BIOMES} from './world.js';
import {WIDTH,HEIGHT,key,walkable} from './dungeon.js';
import {createSurfaceMap,offsetRegion,joinSurfaceBorder,areaCoordinates} from './surface-map.js';
import {ensureCampObjectives} from './quests.js';
import {princeHere} from './story.js';

// A deliberately bounded pilot. Standard runs remain available while this
// shared coordinate space proves movement, AI and companion behavior.
export class SeamlessExpedition extends Expedition{
 constructor(seed=Date.now()){
  super(seed);this.shop=this.shop.filter(offer=>offer.id!=='survey');this.saveRegion();this.forest=startingForest(seed);
  const home=this.regions.get(worldId(0,0)),forest=this.prepareWorld(this.forest.rx,this.forest.ry);
  this.surfaceChunks=new Map([[worldId(0,0),offsetRegion(home)],[worldId(forest.rx,forest.ry),offsetRegion(forest)]]);
  const s=this.state;s.map=createSurfaceMap(this.surfaceChunks);s.baseMap=createSurfaceMap(this.surfaceChunks,'baseMap');joinSurfaceBorder(s.map,this.forest);
  s.enemies=[...home.enemies,...forest.enemies];s.items=[...home.items,...forest.items];s.encounters=[...home.encounters,...forest.encounters];s.scenery=[...home.scenery,...forest.scenery];
  s.explored=new Set([...home.explored,...forest.explored]);s.encounterSeen=new Set([...home.encounterSeen,...forest.encounterSeen]);s.settlementBounds=[{minX:0,minY:0,maxX:WIDTH,maxY:HEIGHT}];s.seamless=true;
  this.visitedSurface=new Set([worldId(0,0)]);this.syncArea();s.transition=false;this.refresh();
  this.message('Seamless preview: camp and its neighboring forest share one map. Explore, fight, trade and bring Aldren along. Other regions and crypt interiors are available in standard runs.');
  this.message('Creatures, drops and exploration stay in place when you return. There are no boundary resets in this preview.');
  this.message(`The open woodland trail leads ${this.forest.rx>0?'east':this.forest.rx<0?'west':this.forest.ry>0?'south':'north'} from camp.`);
 }
 areaAt(x,y){return this.state.map.areaAt?.(x,y);}
 surfaceContains(id){return Boolean(this.state?.seamless&&this.surfaceChunks?.has(id));}
 syncArea(){
  const s=this.state,p=s.player,a=this.areaAt(p.x,p.y);if(!a)return;
  const id=worldId(a.rx,a.ry),changed=this.location.id!==id;
  this.location={id,kind:'world',rx:a.rx,ry:a.ry,depth:0};s.location={...this.location};
  for(const field of ['home','city','biome','danger','recommended','rx','ry','quest','bridgeLayout','entrance'])s[field]=a[field];
  s.areaBounds={minX:a.rx*WIDTH,minY:a.ry*HEIGHT,maxX:(a.rx+1)*WIDTH,maxY:(a.ry+1)*HEIGHT};
  if(!this.visitedSurface.has(id)){this.visitedSurface.add(id);s.regionsDiscovered++;}
  if(changed)this.message(a.home?'Lantern Camp.':`${BIOMES[a.biome].name} · recommended level ${a.recommended}.`);
 }
 borderPreview(){return this.state.seamless?null:super.borderPreview();}
 prepareCampObjectives(){
  const q=this.quests.get('trailwarden');if(!q?.accepted||q.placed)return;
  const a=this.surfaceChunks.get(worldId(q.region.rx,q.region.ry)),dx=a.rx*WIDTH,dy=a.ry*HEIGHT;
  const local=e=>({...e,x:e.x-dx,y:e.y-dy});
  const data={...a,enemies:this.state.enemies.map(local),items:this.state.items.map(local),encounters:this.state.encounters.map(local),scenery:this.state.scenery.map(local)};
  const counts={enemies:data.enemies.length,items:data.items.length,encounters:data.encounters.length};ensureCampObjectives(this,data,a.rx,a.ry);
  for(const field of ['enemies','items','encounters'])for(const e of data[field].slice(counts[field])){e.x+=dx;e.y+=dy;if(e.territory){e.territory.x+=dx;e.territory.y+=dy;}if(field==='enemies')e.originArea=worldId(a.rx,a.ry);this.state[field].push(e);}
 }
 resolvePlayer(action){
  if(!this.state.seamless)return super.resolvePlayer(action);
  const s=this.state,p=s.player;
  if(['descend','ascend'].includes(action.type)){this.message('Crypt interiors are available in standard runs. This preview joins camp and the forest.');return false;}
  if(action.type==='use'&&p.inventory[action.index]?.kind==='surveyMap'){this.message('Survey charts cover the full standard world. This preview map grows as you explore.');return false;}
  if(action.type==='move'){
   if(!Number.isInteger(action.dx)||!Number.isInteger(action.dy)||Math.abs(action.dx)+Math.abs(action.dy)!==1)return false;
   const x=p.x+action.dx,y=p.y+action.dy;
   if(!this.areaAt(x,y)){this.message('End of the seamless preview. Camp and the neighboring forest are connected; other lands remain in standard runs.');return false;}
   if(s.map[y]?.[x]==='X'){this.message('The bridge is barred. Speak to Kestrel or follow the bank to the shallow ford.');return false;}
   if(!walkable(s.map,x,y))return false;const c=princeHere(this);
   if(c&&c.x===x&&c.y===y)Object.assign(c,{x:p.x,y:p.y,swappedTurn:s.turn+1});
   const moved=Game.prototype.resolvePlayer.call(this,action);if(moved){this.syncArea();s.companion=princeHere(this);}return moved;
  }
  const before=new Set(s.enemies),ok=super.resolvePlayer(action);
  if(ok){if(action.type==='acceptQuest')this.prepareCampObjectives();for(const e of s.enemies)if(!before.has(e))e.originArea??=this.location.id;}
  return ok;
 }
 kill(enemy){
  if(!this.state.seamless)return super.kill(enemy);
  const original=this.state.quest,origin=this.surfaceChunks.get(enemy.originArea);if(origin)this.state.quest=origin.quest;
  try{super.kill(enemy);}finally{this.state.quest=original;}
 }
 finishTurn(){
  super.finishTurn();if(!this.state.seamless)return;
  const c=this.story.prince,{rx,ry}=areaCoordinates(c.x,c.y);Object.assign(c,{rx,ry,locationId:worldId(rx,ry)});
 }
}
