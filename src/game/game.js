import { Random } from './random.js';
import { generateDungeon, walkable, key } from './dungeon.js';
import { pathStep } from './ai.js';
import { updateVisibility } from './visibility.js';
import { equipment, potion, attack, defense, threshold, gearBonus, shieldChance, recalculateGear } from './items.js';
import { damage, enemyTypes } from './combat.js';
import { TurnManager } from './turn-manager.js';
export class Game {
  constructor(seed=Date.now()) {
    this.rng=new Random(seed); this.state={seed,floor:1,turn:0,status:'playing',log:[],player:{x:0,y:0,hp:32,maxHp:32,mana:100,maxMana:100,attack:5,defense:1,level:1,xp:0,gold:0,inventory:[potion(),potion()],weapon:null,armor:null}};
    this.turns=new TurnManager(this); this.loadFloor(); this.message('You enter the Ember Vault. Find the Ash Warden below.');
  }
  message(text){this.state.log.push(text);if(this.state.log.length>80)this.state.log.shift();}
  loadFloor(){
    const s=this.state,d=generateDungeon(this.rng); Object.assign(s,d);Object.assign(s.player,d.start);
    s.enemies=[];s.items=[];s.explored=new Set();s.visible=new Set();s.mindVisionUntil=0;s.detectCreaturesUntil=0;
    const used=new Set([key(d.start.x,d.start.y),key(d.stairs.x,d.stairs.y)]), tiles=[];
    for(const room of d.rooms.slice(1)) for(let y=room.y;y<room.y+room.h;y++)for(let x=room.x;x<room.x+room.w;x++)if(!used.has(key(x,y)))tiles.push({x,y});
    const spot=()=>{while(tiles.length){const i=this.rng.int(0,tiles.length-1),p=tiles.splice(i,1)[0],k=key(p.x,p.y);if(!used.has(k)){used.add(k);return p;}}throw new Error('Dungeon has no free spawn tiles');};
    const spawnEnemy=(kind)=>{const base=enemyTypes[kind],scale=s.floor-1; s.enemies.push({...base,...spot(),kind,id:s.enemies.length,hp:base.hp+scale*2,maxHp:base.hp+scale*2,attack:base.attack+scale,actions:0});};
    for(let i=0;i<4+s.floor*2;i++)spawnEnemy(this.rng.pick(s.floor===1?['slime','slime','skeleton']:['slime','skeleton','goblin']));
    if(s.floor===5)spawnEnemy('boss');
    for(const item of [potion(),potion(),potion(),equipment('weapon',s.floor),equipment('armor',s.floor),{kind:'gold',name:'Gold',amount:this.rng.int(8,18)},{kind:'chest',name:'Sealed coffer',description:'Open with E for a randomized reward.'}])s.items.push({...item,...spot()});
    this.refresh();
  }
  refresh(){updateVisibility(this.state);}
  action(action){return this.turns.perform(action);}
  resolvePlayer(a){
    const s=this.state,p=s.player;
    if(a.type==='move'){
      if(!Number.isInteger(a.dx)||!Number.isInteger(a.dy)||Math.abs(a.dx)+Math.abs(a.dy)!==1)return false;
      const x=p.x+a.dx,y=p.y+a.dy;if(!walkable(s.map,x,y))return false;
      const enemy=s.enemies.find(e=>e.hp>0&&e.x===x&&e.y===y);
      if(enemy){this.strikeEnemy(enemy,attack(p));}
      else {p.x=x;p.y=y;const item=s.items.find(i=>i.x===x&&i.y===y);if(item)this.message(`${item.name} here. Press E to collect or open.`);if(s.map[y][x]==='>')this.message(s.floor<5?'Stairs down. Press Enter to descend.':'The final stair is sealed. Defeat the Ash Warden.');}
      return true;
    }
    if(a.type==='detectCreatures'){
      if(p.level<3){this.message('Detect Creatures unlocks at level 3.');return false;}
      if(p.mana<25){this.message('Detect Creatures needs 25 Mana.');return false;}
      p.mana-=25;s.detectCreaturesUntil=s.turn+2;this.message('Detect Creatures: all living creatures on this local minimap for 2 turns.');return true;
    }
    if(a.type==='mindVision'){
      if(p.mana<25){this.message('Mind Vision needs 25 Mana. Take turns to recharge.');return false;}
      p.mana-=25;s.mindVisionUntil=s.turn+3+gearBonus(p,'visionBonus');this.message('Mind Vision pierces nearby walls for '+(3+gearBonus(p,'visionBonus'))+' turns. Terrain remains mapped.');return true;
    }
    if(a.type==='wait'){this.message('You listen to the darkness.');return true;}
    if(a.type==='pickup'){
      const i=s.items.findIndex(i=>i.x===p.x&&i.y===p.y);if(i<0){this.message('Nothing here to collect.');return false;}
      let item=s.items.splice(i,1)[0];
      if(item.kind==='chest'){item=this.rng.pick([potion(),equipment(this.rng.pick(['weapon','armor']),s.floor),{kind:'gold',name:'Gold',amount:25+s.floor*5}]);this.message('The coffer opens.');}
      if(item.kind==='gold'){p.gold+=item.amount;this.message(`Collected ${item.amount} gold.`);}else{p.inventory.push(item);this.message(`Collected ${item.name}.`);}return true;
    }
    if(a.type==='potion'){
      const i=p.inventory.findIndex(i=>i.kind==='potion');if(i<0||p.hp===p.maxHp){this.message(i<0?'No tonic left.':'You are already at full health.');return false;}
      p.inventory.splice(i,1);const old=p.hp;p.hp=Math.min(p.maxHp,p.hp+16);this.message(`Ember tonic restores ${p.hp-old} health.`);return true;
    }
    if(a.type==='equip'){
      const item=p.inventory[a.index];if(!item||!['weapon','armor'].includes(item.kind))return false;
      p.inventory.splice(a.index,1);if(p[item.kind])p.inventory.push(p[item.kind]);p[item.kind]=item;this.message(`Equipped ${item.name}.`);return true;
    }
    if(a.type==='descend'){
      if(p.x!==s.stairs.x||p.y!==s.stairs.y||s.floor===5){this.message('No usable downward stair here.');return false;}
      s.floor++;this.loadFloor();this.message(`You descend to floor ${s.floor}.`);return true;
    }
    return false;
  }
  kill(enemy){
    const s=this.state,p=s.player;p.xp+=enemy.xp;this.message(`${enemy.name} falls. +${enemy.xp} XP.`);
    if(this.rng.next()<0.6){const gold=this.rng.int(2,7);p.gold+=gold;this.message(`Found ${gold} gold.`);}
    while(p.xp>=threshold(p)){p.xp-=threshold(p);p.level++;p.maxHp+=6;p.hp=Math.min(p.maxHp,p.hp+10);p.attack++;if(p.level%2===0)p.defense++;this.message(`Level ${p.level}! Your strength grows.`);}
    if(enemy.kind==='boss'){s.status='victory';this.message('The Ash Warden crumbles. Dawn returns to the vault.');}
  }
  strikeEnemy(enemy,power,label='You strike',melee=true){
    const p=this.state.player,isolated=!this.state.enemies.some(o=>o!==enemy&&o.hp>0&&Math.abs(o.x-enemy.x)+Math.abs(o.y-enemy.y)<=2);
    const hit=damage(power+(melee&&isolated?gearBonus(p,'isolatedBonus'):0),Math.max(0,enemy.defense-(melee?(p.weapon?.armorPierce??0):0)));
    enemy.hp-=hit;if(melee&&p.weapon?.bleedBonus)enemy.bleeding=2;
    this.message(`${label} ${enemy.name} for ${hit}.`);if(enemy.hp<=0)this.kill(enemy);
  }
  receiveEnemyAttack(e,verb='hits you',options={}){
    const s=this.state,p=s.player;
    if(shieldChance(p,options.ranged)>0&&this.rng.next()<shieldChance(p,options.ranged)){s.blockedAttacks=(s.blockedAttacks??0)+1;this.message(`Blocked! Your ${p.offhand?.name??'ward'} stops ${e.name}'s attack.`);return;}
    const hit=damage(e.attack,defense(p)+(options.special?gearBonus(p,'wardedBonus'):0));p.hp=Math.max(0,p.hp-hit);s.damageTaken=(s.damageTaken??0)+hit;p.rationTurns=0;this.message(`${e.name} ${verb} for ${hit}.`);
    if(p.hp===0&&p.amulet?.lastLight){this.message('Your Last-Light Medallion shatters, leaving you at 1 HP!');const index=p.inventory.indexOf(p.amulet);if(index>=0)p.inventory.splice(index,1);p.amulet=null;p.hp=1;recalculateGear(p);}
    if(p.hp===0){s.status='dead';this.message('Your light fades in the vault.');}return hit;
  }
  actEnemy(e){
    const s=this.state,p=s.player;e.actions++;
    if(e.slow&&s.turn%2===0)return;
    const distance=Math.abs(e.x-p.x)+Math.abs(e.y-p.y);if(distance>e.range)return;
    if(distance===1){this.receiveEnemyAttack(e);return;}
    const occupied=new Set(s.enemies.filter(o=>o!==e&&o.hp>0).map(o=>key(o.x,o.y)));
    const step=pathStep(s.map,e,p,occupied);if(step){e.x=step.x;e.y=step.y;}
  }
}
