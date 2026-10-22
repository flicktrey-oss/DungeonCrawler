import {key,walkable} from './game/dungeon.js';
import {planTravel,travelThreat} from './game/travel.js';
export class ClickTravel{
 constructor({getGame,ready,perform,arrive,changed=()=>{},schedule=(fn,ms)=>globalThis.setTimeout(fn,ms),unschedule=id=>globalThis.clearTimeout(id)}){
  Object.assign(this,{getGame,ready,perform,arrive,changed,schedule,unschedule});this.plan=null;this.timer=null;
 }
 cancel(message){
  const game=this.plan?.game;this.unschedule(this.timer);this.timer=null;this.plan=null;
  if(message&&game?.state.status==='playing')game.message(message);this.changed();
 }
 start(x,y){
  this.cancel();const game=this.getGame();if(!game||!this.ready())return false;
  const plan=planTravel(game,x,y);if(!plan){game.message('No known clear route to that tile.');this.changed();return false;}
  this.plan=plan;this.changed();
  if(!plan.steps.length){this.finish();return true;}
  this.step();return true;
 }
 finish(){
  const plan=this.plan;if(!plan)return;this.cancel();
  const {game,intent}=plan;if(this.getGame()!==game||!this.ready()||game.state.map!==plan.map)return;
  if(intent?.type==='pickup'&&!game.state.items.includes(intent.item))return;
  if(intent)this.arrive(intent);
 }
 step(){
  this.timer=null;const plan=this.plan,game=this.getGame();
  if(!plan||game!==plan.game||game.state.map!==plan.map||!this.ready()){this.cancel();return;}
  const s=game.state,p=s.player,next=plan.steps[0];
  if(!next){this.finish();return;}
  if(!walkable(s.map,next.x,next.y)||Math.abs(next.x-p.x)+Math.abs(next.y-p.y)!==1||s.enemies.some(e=>e.hp>0&&e.x===next.x&&e.y===next.y)){this.cancel('Travel stopped: the path is blocked.');return;}
  if(travelThreat(s,next)){this.cancel('Travel stopped: danger nearby. Choose your next move.');return;}
  const visible=new Set(s.enemies.filter(e=>e.hp>0&&s.visible.has(key(e.x,e.y)))),hp=p.hp,damage=s.damageTaken??0,blocked=s.blockedAttacks??0;
  if(!this.perform({type:'move',dx:next.x-p.x,dy:next.y-p.y})){this.cancel();return;}
  // A modal, manual input, game over or a new run may have canceled during render.
  if(this.plan!==plan)return;
  plan.steps.shift();
  if(s.status!=='playing'||s.map!==plan.map||p.hp<hp||(s.damageTaken??0)>damage||(s.blockedAttacks??0)>blocked){this.cancel('Travel interrupted by an attack.');return;}
  if(s.enemies.some(e=>e.hp>0&&s.visible.has(key(e.x,e.y))&&!visible.has(e))||travelThreat(s)){this.cancel('Travel stopped: an enemy needs your attention.');return;}
  this.changed();
  if(!plan.steps.length){this.finish();return;}
  this.timer=this.schedule(()=>this.step(),190);
 }
}
