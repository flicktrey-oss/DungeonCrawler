import {creatureAbility} from './minibosses.js';
import {combatFeedback} from './combat-feedback.js';
import {territoryOf,insideTerritory,territoryObstacles,returnToTerritory} from './danger.js';
import { gearBonus } from './items.js';
import {walkable} from './dungeon.js';
import {pathStep} from './ai.js';
import {clearShot} from './techniques.js';

export const describeCreature=e=>e.habitatId&&e.kind==='rabbit'?'Warren rabbit · flees when approached and stays near home. May drop raw meat; no coins.':creatureAbility(e)??creatureTraits[e.kind]??'Adjacent melee attacks.';
export const creatureTraits={
 guardian:'Warden sweep · winds up a cross of four adjacent tiles, then strikes. Retreat or use reach; it rests for one action afterward.',
 boss:'Warden sweep · winds up a cross of four adjacent tiles, then strikes. Retreat or use reach; it rests for one action afterward.',
 boar:'Charging tusks · marks a straight lane up to 3 tiles. Sidestep; it rests for one action after charging.',
 elite:'Charging tusks · marks a straight lane up to 3 tiles. Sidestep; it rests for one action after charging.',
 rabbit:'Quick bite · adjacent melee. May drop raw meat; no coins or trophies.',
 pondFrog:'Tongue lash · range 2 in a cardinal line. Winds up for one turn; sidestep the pink tiles.',
 frog:'Tongue lash · range 2 in a cardinal line. Winds up for one turn; sidestep the pink tiles.',
 beetle:'Sap spit · range 3. Marks your tile, then fires next turn. Move off the amber cross. Bites when adjacent.',
 goat:'Armored ram · high defense. Winds up a straight charge up to 3 tiles; step off its lane. Headbutts when adjacent. Rests for one action after charging.'
};
function line(state,e,dx,dy,length,ground=false){const tiles=[];for(let i=1;i<=length;i++){const tile={x:e.x+dx*i,y:e.y+dy*i};if(ground&&territoryOf(e)&&!insideTerritory(e.territory,tile)||!clearShot(state,e,tile)||ground&&(!walkable(state.map,tile.x,tile.y)||state.enemies.some(o=>o!==e&&o.hp>0&&o.x===tile.x&&o.y===tile.y)))break;tiles.push(tile);}return tiles;}
function effect(state,e,kind,to){(state.enemyEffects??=[]).push({kind,from:{x:e.x,y:e.y},to:{...to}});}
function prepare(g,e,kind,tiles){e.intent={kind,tiles};g.message(kind==='stomp'?`${e.name} stamps the earth! Leave all eight neighboring tiles.`:kind==='cleave'?`${e.name} raises its weapon! Leave the four marked adjacent tiles.`:kind==='tongue'?`${e.name} draws back its tongue! Sidestep the pink line.`:kind==='spit'?`${e.name} aims sap at your tile! Move off the amber cross.`:`${e.name} prepares to charge! Step off the marked lane.`);}
export function actCreature(g,e){
 const s=g.state,p=g.enemyTarget?.(e)??s.player;e.actions++;
 if(e.bleeding>0){e.bleeding--;e.hp--;g.message(e.name+' bleeds for 1.');if(e.hp<=0){g.kill(e);return;}}
 if(e.interrupted){e.interrupted=false;e.intent=null;return;}
 const territory=territoryOf(e);
 if(territory&&(!insideTerritory(territory,p)||!insideTerritory(territory,e))){e.intent=null;returnToTerritory(s,e);return;}
 if(p.smokeTurns>0&&Math.abs(e.x-p.x)+Math.abs(e.y-p.y)>1){e.intent=null;return;}
 // A telegraph always resolves on the next enemy phase, even for slow creatures.
 if(e.recovering){e.recovering=false;g.message(e.name+' catches its breath.');return;}
 if(e.intent){
  const intent=e.intent;e.intent=null;
  if(['charge','cleave','stomp'].includes(intent.kind)||e.miniboss==='reedmaw')e.recovering=true;
  if(intent.kind==='charge'){
   const origin={x:e.x,y:e.y};let hit=false;
   for(const tile of intent.tiles){
    if(territory&&!insideTerritory(territory,tile)||!walkable(s.map,tile.x,tile.y)||s.enemies.some(o=>o!==e&&o.hp>0&&o.x===tile.x&&o.y===tile.y))break;
    if(tile.x===p.x&&tile.y===p.y){g.receiveEnemyAttack(e,'headbutts you',{special:true,target:p});hit=true;break;}
    if(s.companion&&s.companion!==p&&tile.x===s.companion.x&&tile.y===s.companion.y||p!==s.player&&tile.x===s.player.x&&tile.y===s.player.y)break;
    Object.assign(e,tile);
   }
   effect(s,origin,'charge',e);
   if(!hit){combatFeedback(s,e,'MISS','miss');g.message(`${e.name} charges past into empty ground.`);}
  }else{
   const hit=intent.tiles.some(t=>t.x===p.x&&t.y===p.y)&&clearShot(s,e,p);
   effect(s,e,intent.kind,hit?p:intent.tiles.at(-1));
   if(hit){const damage=g.receiveEnemyAttack(e,intent.kind==='tongue'?'lashes you with its tongue':intent.kind==='stomp'?'stomps at you':intent.kind==='cleave'?'sweeps at you':'hits you with sap',{special:true,ranged:!['cleave','stomp'].includes(intent.kind),target:p});if(damage&&intent.kind==='spit'){p.corrosion=3;g.message('Sap corrodes your protection: −1 defense for 3 turns.');}}
   else{combatFeedback(s,e,'MISS','miss');g.message(`${e.name}'s ${intent.kind==='tongue'?'tongue':intent.kind==='cleave'?'sweep':intent.kind==='stomp'?'stomp':'sap'} misses. You moved clear.`);}
  }
  return;
 }
 if(e.slow&&s.turn%2===0)return;
 const dx=p.x-e.x,dy=p.y-e.y,distance=Math.abs(dx)+Math.abs(dy);
 if(distance>Math.max(1,e.range-gearBonus(p,'stealthBonus')))return;
 if((e.kind==='frog'||e.kind==='pondFrog')&&distance>=1&&distance<=(e.miniboss==='reedmaw'?3:2)&&(!dx||!dy)&&clearShot(s,e,p)){
  prepare(g,e,'tongue',line(s,e,Math.sign(dx),Math.sign(dy),e.miniboss==='reedmaw'?3:2));return;
 }
 if(e.kind==='beetle'&&distance>1&&dx*dx+dy*dy<=9&&clearShot(s,e,p)){prepare(g,e,'spit',[{x:p.x,y:p.y}]);return;}
 if(e.miniboss==='cairn'&&Math.max(Math.abs(dx),Math.abs(dy))<=1){const tiles=[];for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){const t={x:e.x+x,y:e.y+y};if((x||y)&&walkable(s.map,t.x,t.y)&&clearShot(s,e,t))tiles.push(t);}prepare(g,e,'stomp',tiles);return;}
 if(['guardian','boss'].includes(e.kind)&&distance===1){const tiles=[[1,0],[-1,0],[0,1],[0,-1]].map(([x,y])=>({x:e.x+x,y:e.y+y})).filter(t=>walkable(s.map,t.x,t.y)&&clearShot(s,e,t));prepare(g,e,'cleave',tiles);return;}
 if(e.miniboss!=='cairn'&&['goat','boar','elite'].includes(e.kind)&&distance>=2&&distance<=3&&(!dx||!dy)&&clearShot(s,e,p)){const tiles=line(s,e,Math.sign(dx),Math.sign(dy),3,true);if(tiles.some(t=>t.x===p.x&&t.y===p.y)){prepare(g,e,'charge',tiles);return;}}
 if(distance===1){g.receiveEnemyAttack(e,e.kind==='goat'?'headbutts you':e.kind==='beetle'?'bites you':'hits you',{target:p});return;}
 const occupied=territoryObstacles(s,e,Boolean(territory));if(p.companion)occupied.delete(`${p.x},${p.y}`);const step=pathStep(s.map,e,p,occupied);
 if(step)Object.assign(e,step);
}
