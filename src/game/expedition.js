import { MERCHANT, createMerchantStock, buyFromMerchant } from './merchant.js';
import { Game } from './game.js';
import { Random } from './random.js';
import { generateDungeon, walkable, key, WIDTH, HEIGHT } from './dungeon.js';
import { generateWorldRegion, regionSeed, worldId, cryptId, CAMP, BIOMES, biomeAt } from './world.js';
import { actCreature } from './enemy-actions.js';
import { techniqueTarget } from './techniques.js';
import { enemyTypes } from './combat.js';
import { EQUIPMENT_SLOTS, slotsFor, recalculateGear, healAmount, potion, projectileStack, reedAmulet, threshold, attack, throwingStones, salePrice } from './items.js';
import { ordinaryDrop, modifyItem } from './loot.js';
import { addItem, settleInventory, looseItem, moveItem } from './inventory.js';
import { ENCOUNTERS, treasure } from './encounters.js';
const fields=['baseMap','encounterSeen','map','enemies','items','explored','start','stairs','upstairs','entrance','landmark','biome','danger','home','rx','ry','depth','cleared','encounters','scenery','quest','visit','recommended'];
export class Expedition extends Game {
  constructor(seed=Date.now()){
    super(seed);this.regions=new Map();this.visits=new Map();this.location=null;this.stash=[];this.shop=createMerchantStock();
    Object.assign(this.state.player,{attack:3,defense:0,slowProgression:true,amulet:null,offhand:null,boots:null,ring1:null,ring2:null,gold:8});addItem(this.state.player,throwingStones(3));settleInventory(this.state.player.inventory);
    Object.assign(this.state,{log:[],expedition:true,cryptsCleared:0,regionsDiscovered:0,transition:false});
    this.visitWorld(0,0,CAMP);this.state.transition=false;
    this.message('Lantern Camp is safe. Start by hunting brush rats and beetles in the neighboring woods.');
    this.message('Three throwing stones are in your satchel. Use the stone quick slot or T to throw. Mara sells field equipment.');
    this.message('Mara buys hunting trophies. Terrain and explored maps persist. Enemies and local encounters refresh on return; finish quests before leaving.');
  }
  actEnemy(enemy){actCreature(this,enemy);}
  makeEnemy(kind,p,danger,id){
    const base=enemyTypes[kind],extra=Math.max(0,danger-1);
    return {...base,...p,kind,id,hp:base.hp+extra*2,maxHp:base.hp+extra*2,attack:base.attack+Math.floor(extra/2),xp:({skeleton:3,goblin:3,leech:3,wolf:5,boar:5,guardian:10})[kind]??base.xp,actions:0};
  }
  saveRegion(){if(!this.location)return;const data={};for(const field of fields)data[field]=this.state[field];this.regions.set(this.location.id,data);}
  nextVisit(id){const n=this.visits.get(id)??0;this.visits.set(id,n+1);return n;}
  activate(location,data,preferred){
    this.saveRegion();this.location=location;for(const field of fields)this.state[field]=data[field];
    this.state.floor=Math.min(5,data.danger+(data.depth??0));
    // Regeneration can put a tree or creature at an old return point. Choose a
    // reachable vacant landing tile, without rewriting terrain or moving foes.
    const occupied=new Set(data.enemies.filter(e=>e.hp>0).map(e=>key(e.x,e.y)));
    let spawn=null;
    for(let r=0;r<WIDTH+HEIGHT&&!spawn;r++)for(let y=0;y<HEIGHT&&!spawn;y++)for(let x=0;x<WIDTH;x++)if(Math.abs(x-preferred.x)+Math.abs(y-preferred.y)===r&&walkable(data.map,x,y)&&!occupied.has(key(x,y))){spawn={x,y};break;}
    if(!spawn)throw Error('No safe arrival tile');
    Object.assign(this.state.player,spawn);this.state.location={...location};this.state.mindVisionUntil=0;this.state.transition=true;this.state.enemyEffects=[];this.refresh();
  }
  visitWorld(rx,ry,spawn=CAMP){
    const id=worldId(rx,ry),home=rx===0&&ry===0;let data=home?this.regions.get(id):null;
    if(!data){
      const previous=this.regions.get(id);
      const generated=generateWorldRegion(this.state.seed,rx,ry,this.nextVisit(id));
      data={...generated,depth:0,start:CAMP,stairs:null,upstairs:null,cleared:false,explored:new Set(previous?.explored??[]),encounterSeen:new Set(),enemies:generated.spawns.map((e,i)=>this.makeEnemy(e.kind,e,generated.danger,i)),items:[],quest:null};
      for(const event of data.encounters){
        if(['caravan','cache'].includes(event.type))data.items.push({kind:'chest',name:ENCOUNTERS[event.type].name,...event,eventId:event.id});
        if(event.type==='villager')data.quest={id:event.id,accepted:false,claimed:false};
      }
      if(!this.regions.has(id)&&this.location?.id!==id)this.state.regionsDiscovered++;
    }
    this.activate({id,kind:'world',rx,ry,depth:0},data,spawn);
    const info=BIOMES[data.biome];this.message(`${info.name} (${rx}, ${ry}) · ${home?'safe camp':`recommended level ${info.recommended}${this.state.player.level<info.recommended?' — DANGER: you are underleveled!':''}`}.`);
  }
  visitCrypt(rx,ry,depth,arrival='upstairs'){
    const id=cryptId(rx,ry,depth),visit=this.nextVisit(id),rng=new Random(regionSeed(this.state.seed,rx,ry,`crypt:${depth}:${visit}`)),d=generateDungeon(visit===0?rng:new Random(regionSeed(this.state.seed,rx,ry,`crypt:${depth}:0`))),biome=biomeAt(rx,ry),danger=BIOMES[biome].danger+depth;
    const data={...d,rx,ry,biome,danger,recommended:BIOMES[biome].recommended+2,home:false,depth,visit,upstairs:{...d.start},cleared:false,baseMap:null,encounterSeen:new Set(),explored:new Set(this.regions.get(id)?.explored??[]),enemies:[],items:[],encounters:[],scenery:[],quest:null,entrance:null,landmark:null};
    data.map[d.start.y][d.start.x]='<';if(depth===2)data.map[d.stairs.y][d.stairs.x]='A';
    const free=[];for(const room of d.rooms.slice(1))for(let y=room.y;y<room.y+room.h;y++)for(let x=room.x;x<room.x+room.w;x++)if(key(x,y)!==key(d.stairs.x,d.stairs.y))free.push({x,y});
    const spot=()=>free.splice(rng.int(0,free.length-1),1)[0];
    for(let i=0;i<5+depth;i++)data.enemies.push(this.makeEnemy(rng.pick(['skeleton','goblin']),spot(),danger,i));
    if(depth===2)data.enemies.push(this.makeEnemy('guardian',{...d.stairs},danger,99));
    for(const item of [potion(),{kind:'chest',name:'Crypt coffer',reward:treasure(rng,danger,'crypt')}])data.items.push({...item,...spot()});
    this.activate({id,kind:'crypt',rx,ry,depth},data,data[arrival]);
    this.message(`Crypt depth ${depth}/2 · recommended level ${data.recommended}. The layout and explored map persist; enemies return. Q on an upward stair retreats.`);
  }
  atCamp(){const s=this.state;return this.location.kind==='world'&&s.home&&s.player.x===CAMP.x&&s.player.y===CAMP.y;}
  atMerchant(){const s=this.state;return this.location.kind==='world'&&s.home&&Math.abs(s.player.x-MERCHANT.x)+Math.abs(s.player.y-MERCHANT.y)===1;}
  activeEncounter(){const p=this.state.player;return this.state.encounters?.find(e=>Math.abs(e.x-p.x)+Math.abs(e.y-p.y)===(e.type==='villager'?1:0));}
  questRemaining(){if(!this.state.quest)return 0;return this.state.enemies.filter(e=>e.hp>0&&e.questId===this.state.quest?.id).length;}
  arrange(index,x,y,rotate){return this.state.status==='playing'&&moveItem(this.state.player.inventory,index,x,y,rotate);}
  resolvePlayer(a){
    const s=this.state,p=s.player,loc=this.location;
    if(a.type==='reach'||a.type==='throw'){
      const enemy=techniqueTarget(this,a.type,a.x,a.y);
      if(!enemy){this.message('No valid target: choose a visible enemy within a clear weapon range.');return false;}
      const stack=a.type==='throw'?projectileStack(p,a.index):null;if(a.type==='throw'&&(!stack||stack.quantity<1))return false;
      if(stack){if(--stack.quantity===0)p.inventory.splice(p.inventory.indexOf(stack),1);}
      if(stack?.kind==='thunder'){enemy.intent=null;enemy.interrupted=true;this.message('Thunder interrupts '+enemy.name+'!');}
      else this.strikeEnemy(enemy,a.type==='reach'?attack(p):(stack.projectileDamage??2),a.type==='reach'?'Your spear strikes':'Your projectile hits',a.type==='reach');
      if(stack&&stack.kind!=='thunder'&&this.rng.next()<.5){s.items.push({...stack,quantity:1,x:enemy.x,y:enemy.y});this.message('The projectile lands intact. Collect it after the fight.');}
      return true;
    }
    if(a.type==='buy')return buyFromMerchant(this,a.id);
    if(a.type==='sell'){
      const item=p.inventory[a.index];if(!this.atMerchant()||!Number.isInteger(a.index)||!item)return false;
      const price=salePrice(item);p.inventory.splice(a.index,1);p.gold+=price;this.message(`Sold ${item.name} for ${price} gold.`);return true;
    }
    if(a.type==='store'||a.type==='retrieve'){
      if(!this.atCamp()){this.message('Return to the tent to use storage.');return false;}
      const source=a.type==='store'?p.inventory:this.stash;if(!Number.isInteger(a.index)||!source[a.index])return false;
      const item=source[a.index];if(a.type==='retrieve'&&!addItem(p,item)){this.message('No space in the 10×10 satchel. Rearrange or free room.');return false;}
      if(a.type==='store')this.stash.push(looseItem(item));source.splice(a.index,1);this.message(`${a.type==='store'?'Stored':'Retrieved'} ${item.name}.`);return true;
    }
    if(a.type==='pickup'){
      const index=s.items.findIndex(i=>i.x===p.x&&i.y===p.y);if(index<0){this.message('Nothing here to collect.');return false;}
      const ground=s.items[index],item=ground.kind==='chest'?(ground.reward??=treasure(this.rng,s.danger,ground.type??'cache')):ground;
      if(item.kind==='gold')p.gold+=item.amount;
      else if(!addItem(p,item)){this.message('Satchel full or no fitting space. The item stays here.');return false;}
      s.items.splice(index,1);const event=s.encounters?.find(e=>e.id===ground.eventId);if(event)event.used=true;
      this.message(item.kind==='gold'?`Collected ${item.amount} gold.`:`Collected ${item.name}.`);return true;
    }
    if(a.type==='potion'){
      const index=a.index===undefined?p.inventory.findIndex(i=>i.kind==='potion'):a.index;
      if(!Number.isInteger(index)||p.inventory[index]?.kind!=='potion'||p.hp===p.maxHp){this.message(p.hp===p.maxHp?'You are already at full health.':'No tonic selected.');return false;}
      p.inventory.splice(index,1);const before=p.hp;p.hp=Math.min(p.maxHp,p.hp+healAmount(p,16));this.message(`Ember tonic restores ${p.hp-before} health.`);return true;
    }
    if(a.type==='use'){
      const item=p.inventory[a.index];if(!Number.isInteger(a.index)||!item)return false;
      if(item.kind==='potion')return this.resolvePlayer({type:'potion',index:a.index});
      if(item.kind==='mana'&&p.mana<p.maxMana)p.mana=Math.min(p.maxMana,p.mana+35);
      else if(item.kind==='ration'&&p.hp<p.maxHp&&!p.rationTurns)p.rationTurns=4;
      else if(item.kind==='cleanse'&&p.corrosion>0)p.corrosion=0;
      else if(item.kind==='smoke'&&!p.smokeTurns)p.smokeTurns=3;
      else {this.message('That supply would have no effect right now.');return false;}
      p.inventory.splice(a.index,1);this.message('Used '+item.name+'.');return true;
    }
    if(a.type==='unequip'){
      if(!EQUIPMENT_SLOTS.includes(a.slot)||!p[a.slot])return false;
      const item=p[a.slot];if(!addItem(p,item)){this.message('No fitting space in your satchel. The item stays equipped.');return false;}
      p[a.slot]=null;recalculateGear(p);this.message(`Unequipped ${item.name}.`);return true;
    }
    if(a.type==='equip'){
      const item=p.inventory[a.index];if(!Number.isInteger(a.index)||!item||!slotsFor(item).length)return false;
      const slot=a.slot??slotsFor(item).find(slot=>!p[slot])??slotsFor(item)[0];if(!slotsFor(item).includes(slot))return false;
      const inventory=p.inventory.filter((_,i)=>i!==a.index),old=p[slot];if(old&&!addItem({inventory},old)){this.message('No room for the equipment you would remove.');return false;}
      p.inventory=inventory;p[slot]=looseItem(item);recalculateGear(p);this.message(`Equipped ${item.name}.`);return true;
    }
    if(a.type==='drop'){
      if(!Number.isInteger(a.index)||!p.inventory[a.index])return false;
      const item=p.inventory.splice(a.index,1)[0];s.items.push({...looseItem(item),x:p.x,y:p.y});this.message(`Dropped ${item.name}.`);return true;
    }
    if(['acceptQuest','claimQuest','blessing'].includes(a.type)){
      const event=this.activeEncounter();if(!event)return false;
      if(a.type==='blessing'){
        if(event.type!=='shrine'||event.used)return false;
        if(a.choice==='heal'&&p.gold>=5&&p.hp<p.maxHp){p.gold-=5;p.hp=Math.min(p.maxHp,p.hp+12);}
        else if(a.choice==='mana'&&p.hp>6&&p.mana<p.maxMana){p.hp-=6;p.mana=Math.min(p.maxMana,p.mana+25);}else{this.message('You cannot make that exchange right now.');return false;}
        event.used=true;this.message('The shrine grows silent. Its blessing is spent for this visit.');return true;
      }
      if(event.type!=='villager'||!s.quest)return false;
      if(a.type==='acceptQuest'&&!s.quest.accepted){s.quest.accepted=true;this.message('Quest accepted: clear the three troublesome frogs and return. Leaving resets this quest.');return true;}
      if(a.type==='claimQuest'&&s.quest.accepted&&!s.quest.claimed&&this.questRemaining()===0){
        if(!addItem(p,s.quest.reward??=modifyItem(reedAmulet(),this.rng,'quest'))){this.message('Make room for the 2×2 amulet before claiming.');return false;}
        s.quest.claimed=true;this.awardExperience(6);this.message('The Mirekeeper gives you '+s.quest.reward.name+'! Inspect it in Equipment.');return true;
      }
      return false;
    }
    if(a.type==='descend'){
      if(loc.kind==='world'&&s.map[p.y][p.x]==='D'){this.cryptReturn={rx:loc.rx,ry:loc.ry,x:p.x,y:p.y};this.visitCrypt(loc.rx,loc.ry,1);return true;}
      if(loc.kind==='crypt'&&loc.depth===1&&p.x===s.stairs.x&&p.y===s.stairs.y){this.visitCrypt(loc.rx,loc.ry,2);return true;}
      this.message('No downward entrance here.');return false;
    }
    if(a.type==='ascend'){
      if(loc.kind!=='crypt'||p.x!==s.upstairs.x||p.y!==s.upstairs.y)return false;
      if(loc.depth===2)this.visitCrypt(loc.rx,loc.ry,1,'stairs');
      else this.visitWorld(loc.rx,loc.ry,this.cryptReturn??CAMP);
      return true;
    }
    if(a.type==='move'&&Number.isInteger(a.dx)&&Number.isInteger(a.dy)&&Math.abs(a.dx)+Math.abs(a.dy)===1){
      const x=p.x+a.dx,y=p.y+a.dy;
      if(loc.kind==='world'&&(x<0||x>=WIDTH||y<0||y>=HEIGHT)){this.visitWorld(loc.rx+a.dx,loc.ry+a.dy,{x:(x+WIDTH)%WIDTH,y:(y+HEIGHT)%HEIGHT});return true;}
      const moved=super.resolvePlayer(a);
      if(moved){
        if(this.atMerchant())this.message('Mara buys trophies and sells supplies. Press E or Trade.');
        const event=this.activeEncounter();if(event)this.message(`${ENCOUNTERS[event.type].name}: ${ENCOUNTERS[event.type].description}${['villager','shrine'].includes(event.type)?' Press E or Interact.':''}`);
        if(s.map[p.y][p.x]==='<')this.message('Q / Leave ↑ to retreat. The map is remembered; enemies return.');
        if(loc.kind==='world'&&(p.x===0||p.x===39||p.y===0||p.y===29)){
          const next=BIOMES[biomeAt(loc.rx+(p.x===0?-1:p.x===39?1:0),loc.ry+(p.y===0?-1:p.y===29?1:0))];this.message(`Trail ahead: ${next.name}, recommended level ${next.recommended}${p.level<next.recommended?' — dangerous for you!':''}.`);
        }
      }
      return moved;
    }
    return super.resolvePlayer(a);
  }
  finishTurn(){const p=this.state.player;if(this.state.status!=='playing')return;if(p.rationTurns>0){p.hp=Math.min(p.maxHp,p.hp+healAmount(p,3));p.rationTurns--;}if(p.smokeTurns>0)p.smokeTurns--;if(p.corrosion>0)p.corrosion--;}
  awardExperience(amount){const p=this.state.player;p.xp+=amount;while(p.xp>=threshold(p)){p.xp-=threshold(p);p.level++;p.maxHp+=3;p.hp=Math.min(p.maxHp,p.hp+4);if(p.level%2===0)p.attack++;if(p.level%4===0)p.defense++;this.message(`Level ${p.level}. You grow a little stronger.`);}}
  kill(enemy){
    this.awardExperience(enemy.xp);this.message(`${enemy.name} falls. +${enemy.xp} XP.`);
    const loot=ordinaryDrop(this.rng,this.state.danger,enemy.kind,Boolean(enemy.eventId));if(loot)this.state.items.push({...loot,x:enemy.x,y:enemy.y});
    if(enemy.eventId){const event=this.state.encounters.find(e=>e.id===enemy.eventId);if(event&&!event.used){event.used=true;this.state.items.push({kind:'chest',name:'Beast hoard',reward:treasure(this.rng,this.state.danger,'den'),x:enemy.x,y:enemy.y});}}
    if(enemy.questId&&this.state.quest?.accepted&&this.questRemaining()===0)this.message('The frogs are cleared. Return to the Mirekeeper before leaving this region.');
    if(enemy.kind==='guardian'&&!this.state.cleared){this.state.cleared=true;this.state.cryptsCleared++;this.state.items.push({kind:'chest',name:'Warden’s reliquary',reward:treasure(this.rng,this.state.danger,'boss'),x:enemy.x,y:enemy.y});this.message('Crypt cleared. A rare equipment reliquary remains.');}
  }
}
