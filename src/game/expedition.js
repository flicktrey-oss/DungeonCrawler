import {createJourney,attachJourney,journeyAction} from './journey.js';
import {attachBridge,bridgeAction,collectMedicine,finishBridgeFight} from './bridge.js';
import {denEnemy,minibossReward} from './minibosses.js';
import {GRAVEKEEPER,tradeBones,spendStack} from './gravekeeper.js';
import {recordDiscovery,assignQuick,creatureIndexKey} from './quality.js';
import {townAction,townBounties,placeCitizens} from './town.js';
import {createStory,princeHere,nearPrince,princeAction,escortCanLeave,carryPrince,actPrince,princeEnemyTarget,finishStory} from './story.js';
import {isKingdom} from './city.js';
import {addWoodland,woodlandAction} from './woodland.js';
import {addQuestContent, restoreQuestRegion, questAction} from './quests.js';
import { MERCHANT, createMerchantStock, buyFromMerchant } from './merchant.js';
import { Game } from './game.js';
import { Random } from './random.js';
import { generateDungeon, walkable, key, WIDTH, HEIGHT } from './dungeon.js';
import { generateWorldRegion, regionSeed, worldId, cryptId, CAMP, BIOMES, biomeAt, regionInfo, threatLabel } from './world.js';
import { actCreature } from './enemy-actions.js';
import { techniqueTarget } from './techniques.js';
import { enemyTypes } from './combat.js';
import { EQUIPMENT_SLOTS, equippedSlot, cookedMeat, ratMeat, slotsFor, recalculateGear, healAmount, potion, projectileStack, reedAmulet, threshold, attack, throwingStones, salePrice } from './items.js';
import { ordinaryDrop, modifyItem, cryptRelic } from './loot.js';
import { addItem, settleInventory, looseItem, moveItem } from './inventory.js';
import { ENCOUNTERS, treasure } from './encounters.js';
const fields=['routeLandmark','bridgeLayout','baseMap','encounterSeen','map','enemies','items','explored','start','stairs','upstairs','entrance','landmark','biome','danger','home','rx','ry','depth','cleared','encounters','scenery','quest','visit','recommended','city'];
export class Expedition extends Game {
  constructor(seed=Date.now()){
    super(seed);this.journey=createJourney();this.woodland=new Map();this.quests=new Map();this.trackedQuest=null;this.regions=new Map();this.visits=new Map();this.location=null;this.stash=[];this.shop=createMerchantStock();this.quickSlots=[null,null,null];this.creatureIndex=new Map();this.killCounts={};this.bounties=townBounties();this.rescued=[];this.story=createStory();this.quests.set(this.story.id,this.story);
    Object.assign(this.state.player,{attack:3,defense:0,slowProgression:true,amulet:null,offhand:null,boots:null,ring1:null,ring2:null,gold:8});addItem(this.state.player,throwingStones(3));settleInventory(this.state.player.inventory);assignQuick(this,0,this.state.player.inventory.findIndex(i=>i.kind==='stone'));
    Object.assign(this.state,{log:[],timeline:[],expedition:true,cryptsCleared:0,regionsDiscovered:0,transition:false});
    this.visitWorld(0,0,CAMP);this.state.transition=false;
    this.message('Trailwarden Iona stands west of the campfire. Speak to her for an optional expedition goal.');
    this.message('Lantern Camp is safe. Start by hunting brush rats and beetles in the neighboring woods.');
    this.message('Three throwing stones are in your satchel. Use quick slot 1 to throw, or reassign it from your satchel. Mara sells field equipment.');
    this.message('Mara buys hunting trophies. Terrain and explored maps persist. Ordinary enemies return. Accepted quests and their progress stay with you for this run.');
    this.message('Scout Fen waits northeast of the tent (25, 12). Ask him to mark Willow Crossing and explain the northern road.');
  }
  refresh(){super.refresh();this.state.companion=princeHere(this);recordDiscovery(this);}
  princeHere(){return princeHere(this);}
  atPrince(){return nearPrince(this);}
  actCompanion(){actPrince(this);}
  enemyTarget(enemy){return princeEnemyTarget(this,enemy);}
  actEnemy(enemy){actCreature(this,enemy);}
  makeEnemy(kind,p,danger,id,biome='forest'){
    if(kind==='elite'&&p.eventId)return denEnemy(biome,p,danger,id);
    const base=enemyTypes[kind],extra=Math.max(0,danger-1);
    return {...base,...p,kind,id,hp:base.hp+extra*2,maxHp:base.hp+extra*2,attack:base.attack+Math.floor(extra/2),xp:({skeleton:3,goblin:3,leech:3,wolf:5,boar:5,guardian:10})[kind]??base.xp,actions:0};
  }
  saveRegion(){if(!this.location)return;const data={};for(const field of fields)data[field]=this.state[field];this.regions.set(this.location.id,data);}
  nextVisit(id){const n=this.visits.get(id)??0;this.visits.set(id,n+1);return n;}
  activate(location,data,preferred){
    const oldLocation=this.location,oldPlayer={...this.state.player};this.saveRegion();this.location=location;for(const field of fields)this.state[field]=data[field];
    this.state.floor=Math.min(5,data.danger+(data.depth??0));
    // Regeneration can put a tree or creature at an old return point. Choose a
    // reachable vacant landing tile, without rewriting terrain or moving foes.
    const occupied=new Set(data.enemies.filter(e=>e.hp>0).map(e=>key(e.x,e.y)));const resident=princeHere(this);if(resident)occupied.add(key(resident.x,resident.y));
    let spawn=null;
    for(let r=0;r<WIDTH+HEIGHT&&!spawn;r++)for(let y=0;y<HEIGHT&&!spawn;y++)for(let x=0;x<WIDTH;x++)if(Math.abs(x-preferred.x)+Math.abs(y-preferred.y)===r&&walkable(data.map,x,y)&&!occupied.has(key(x,y))){spawn={x,y};break;}
    if(!spawn)throw Error('No safe arrival tile');
    Object.assign(this.state.player,spawn);this.state.location={...location};this.state.mindVisionUntil=0;this.state.detectCreaturesUntil=0;this.state.transition=true;this.state.enemyEffects=[];carryPrince(this,oldLocation,oldPlayer);this.refresh();
  }
  visitWorld(rx,ry,spawn=CAMP){
    const id=worldId(rx,ry),home=rx===0&&ry===0;let data=home||isKingdom(rx,ry)?this.regions.get(id):null;
    if(!data){
      const previous=this.regions.get(id);
      const generated=generateWorldRegion(this.state.seed,rx,ry,this.nextVisit(id));
      data={...generated,depth:0,start:CAMP,stairs:null,upstairs:null,cleared:false,explored:new Set(previous?.explored??[]),encounterSeen:new Set(),enemies:generated.spawns.map((e,i)=>this.makeEnemy(e.kind,e,e.danger??generated.danger,i,generated.biome)),items:[],quest:null};
      for(const event of data.encounters){
        if(event.type==='den'){const owner=data.enemies.find(e=>e.eventId===event.id);if(owner){event.name=owner.name+'’s den';event.description=owner.description;}}
        if(['caravan','cache'].includes(event.type))data.items.push({kind:'chest',name:(event.name??ENCOUNTERS[event.type]?.name),...event,eventId:event.id});
        if(event.type==='villager'){data.quest={id:worldId(rx,ry)+':'+event.id,legacy:true,kind:'frogs',title:'Clear the Frog Pond',giver:'The Mirekeeper',giverRegion:{rx,ry},region:{rx,ry},accepted:false,claimed:false,complete:false};event.quest=data.quest;}
      }
      if(data.quest)for(const e of data.enemies)if(e.questId)e.questId=data.quest.id;
      if(!restoreQuestRegion(this,data,previous,rx,ry))addQuestContent(this,data,rx,ry);
      addWoodland(this,data,rx,ry);
      attachBridge(this,data,rx,ry);
      attachJourney(this,data,rx,ry);
      if(home){data.map[GRAVEKEEPER.y][GRAVEKEEPER.x]='V';data.encounters.push({...GRAVEKEEPER,id:'gravekeeper',type:'gravekeeper'});}
      if(!this.regions.has(id)&&this.location?.id!==id)this.state.regionsDiscovered++;
    }
    placeCitizens(this,data);
    this.activate({id,kind:'world',rx,ry,depth:0},data,spawn);
    const info=BIOMES[data.biome];if(data.biome==='marsh')this.message('Marsh trails shelter small pond frogs. Stronger creatures defend the marked pools off the main trails.');this.message(`${info.name} (${rx}, ${ry}) · ${home?'safe camp':`recommended level ${info.recommended}${this.state.player.level<info.recommended?' — DANGER: you are underleveled!':''}`}.`);
  }
  visitCrypt(rx,ry,depth,arrival='upstairs'){
    const id=cryptId(rx,ry,depth),visit=this.nextVisit(id),rng=new Random(regionSeed(this.state.seed,rx,ry,`crypt:${depth}:${visit}`)),d=generateDungeon(visit===0?rng:new Random(regionSeed(this.state.seed,rx,ry,`crypt:${depth}:0`))),biome=biomeAt(rx,ry,this.state.seed),danger=BIOMES[biome].danger+depth;
    const previous=this.location?.id===id?this.state:this.regions.get(id);
    const data={...d,rx,ry,biome,danger,recommended:BIOMES[biome].recommended+2,home:false,depth,visit,upstairs:{...d.start},cleared:false,baseMap:null,encounterSeen:new Set(),explored:new Set(previous?.explored??[]),enemies:[],items:[],encounters:[],scenery:[],quest:null,entrance:null,landmark:null};
    data.map[d.start.y][d.start.x]='<';if(depth===2)data.map[d.stairs.y][d.stairs.x]='A';
    const free=[];for(const room of d.rooms.slice(1))for(let y=room.y;y<room.y+room.h;y++)for(let x=room.x;x<room.x+room.w;x++)if(key(x,y)!==key(d.stairs.x,d.stairs.y))free.push({x,y});
    if(previous)for(let i=free.length-1;i>=0;i--)if(previous.items.some(item=>item.x===free[i].x&&item.y===free[i].y))free.splice(i,1);
    const spot=()=>free.length?free.splice(rng.int(0,free.length-1),1)[0]:null;
    for(let i=0;i<5+depth;i++){const kind=rng.pick(['skeleton','goblin']),position=spot();if(position)data.enemies.push(this.makeEnemy(kind,position,danger,i));}
    if(depth===2)data.enemies.push(this.makeEnemy('guardian',{...d.stairs},danger,99));
    if(!previous)for(const item of [potion(),{kind:'chest',name:'Crypt coffer',reward:treasure(rng,danger,'crypt')},...(depth===2?[{kind:'chest',name:'Locked reliquary',locked:true,reward:treasure(rng,danger,'boss')}]:[])])data.items.push({...item,...spot()});
    if(previous){data.items=previous.items;data.cleared=previous.cleared;}
    this.activate({id,kind:'crypt',rx,ry,depth},data,data[arrival]);
    this.message(`Crypt depth ${depth}/2 · recommended level ${data.recommended}. The layout and explored map persist; enemies return. Q on an upward stair retreats.`);
  }
  borderPreview(){const p=this.state.player,l=this.location;if(l.kind!=='world')return null;const dx=p.x===0?-1:p.x===39?1:0,dy=p.y===0?-1:p.y===29?1:0;if(!dx&&!dy)return null;return regionInfo(this.state.seed,l.rx+dx,l.ry+dy);}
  atCamp(){const s=this.state;return this.location.kind==='world'&&s.home&&s.player.x===CAMP.x&&s.player.y===CAMP.y;}
  atCampfire(){const s=this.state;return this.location.kind==='world'&&s.home&&s.map[s.player.y]?.[s.player.x]==='F';}
  atMerchant(){const s=this.state;return this.location.kind==='world'&&s.home&&Math.abs(s.player.x-MERCHANT.x)+Math.abs(s.player.y-MERCHANT.y)===1;}
  nearbyEncounters(){const p=this.state.player;return (this.state.encounters??[]).filter(e=>['bridge','villager','citizen','innkeeper','gravekeeper','guide','steward'].includes(e.type)||e.type==='woodland'&&e.kind!=='milestone'?Math.abs(e.x-p.x)+Math.abs(e.y-p.y)===1:e.x===p.x&&e.y===p.y);}
  activeEncounter(){const events=this.nearbyEncounters();return events.includes(this.interactionTarget)?this.interactionTarget:events[0];}

  collectQuestReward(q){q.reward??=modifyItem(reedAmulet(),this.rng,'quest');if(!addItem(this.state.player,q.reward)){this.message('Make room in your satchel before claiming your reward.');return false;}return true;}
  questRemaining(){if(!this.state.quest)return 0;return this.state.enemies.filter(e=>e.hp>0&&e.questId===this.state.quest?.id).length;}
  arrange(index,x,y,rotate){return this.state.status==='playing'&&moveItem(this.state.player.inventory,index,x,y,rotate);}
  resolvePlayer(a){
    const s=this.state,p=s.player,loc=this.location;
    if(a.type==='journey')return journeyAction(this,a);
    if(a.type==='bridge')return bridgeAction(this,a);
    if(a.type==='tradeBones')return tradeBones(this);
    if(['innRest','acceptBounty','claimBounty'].includes(a.type))return townAction(this,a);
    if(['acceptEscort','princeStay','princeFollow','healPrince'].includes(a.type))return princeAction(this,a);
    if(['descend','ascend'].includes(a.type)&&!escortCanLeave(this))return false;
    if(a.type==='cook'){
      if(!this.atCampfire()){this.message('Stand at the Lantern Camp fire to cook meat.');return false;}
      const rawKind=a.kind??'rawMeat';if(!['rawMeat','rawRatMeat'].includes(rawKind))return false;
      const output=rawKind==='rawRatMeat'?ratMeat():cookedMeat(),healing=rawKind==='rawRatMeat'?5:10;
      const index=p.inventory.findIndex(i=>i.kind===rawKind);if(index<0){this.message('No raw meat to cook.');return false;}
      const trial={inventory:p.inventory.map(i=>({...i}))};if(--trial.inventory[index].quantity===0)trial.inventory.splice(index,1);
      if(!addItem(trial,output)){this.message('Make room for the cooked meat first.');return false;}
      // Commit only after the output fits; keep all equipped references intact.
      if(--p.inventory[index].quantity===0)p.inventory.splice(index,1);addItem(p,output);
      this.message(`Cooked one ${output.name}. It restores ${healing} health.`);return true;
    }
    if(['sell','store','drop'].includes(a.type)&&equippedSlot(p,p.inventory[a.index])){this.message('Unequip that item before selling, storing or dropping it.');return false;}
    if(a.type==='woodland')return woodlandAction(this,a);
    if(['acceptQuest','claimQuest','activateWard'].includes(a.type))return questAction(this,a);
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
      const index=a.item?s.items.indexOf(a.item):s.items.findIndex(i=>i.x===p.x&&i.y===p.y);if(index<0||s.items[index].x!==p.x||s.items[index].y!==p.y){this.message('Nothing here to collect.');return false;}
      const ground=s.items[index];
      if(ground.kind==='bridgeMedicine')return collectMedicine(this,ground);
      if(ground.locked&&!p.inventory.some(i=>i.kind==='skeletonKey'&&i.quantity>0)){this.message('The reliquary needs a skeleton key. Orren at camp trades keys for bones.');return false;}
      if(ground.kind==='questToken'){const q=this.quests.get(ground.questKey);if(!q?.accepted||q.claimed||q.complete){this.message('Find its owner and accept their quest first.');return false;}if(s.enemies.some(e=>e.hp>0&&e.questKey===q.id)){this.message('Defeat the keepsake’s guards first.');return false;}q.complete=true;s.items.splice(index,1);this.message('Recovered the keepsake. It is recorded in your Journal; return whenever you are ready.');return true;}
      const item=ground.kind==='chest'?(ground.reward??=treasure(this.rng,s.danger,ground.type??'cache')):ground;
      if(item.kind==='gold')p.gold+=item.amount;
      else if(ground.locked){const trial={inventory:p.inventory.map(i=>({...i}))};spendStack(trial,'skeletonKey',1);if(!addItem(trial,item)){this.message('Make room for the treasure first. Your key is safe.');return false;}spendStack(p,'skeletonKey',1);addItem(p,item);}
      else if(!addItem(p,item)){this.message('Satchel full or no fitting space. The item stays here.');return false;}
      if(ground.locked&&item.kind==='gold')spendStack(p,'skeletonKey',1);
      if(ground.locked)this.message('A skeleton key opens the reliquary and crumbles.');
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
      if(['cookedMeat','ratMeat'].includes(item.kind)&&p.hp<p.maxHp){const before=p.hp;p.hp=Math.min(p.maxHp,p.hp+healAmount(p,item.kind==='ratMeat'?5:10));this.message(item.name+' restores '+(p.hp-before)+' health.');if(--item.quantity===0)p.inventory.splice(a.index,1);return true;}
      if(item.kind==='mana'&&p.mana<p.maxMana)p.mana=Math.min(p.maxMana,p.mana+35);
      else if(item.kind==='ration'&&p.hp<p.maxHp&&!p.rationTurns)p.rationTurns=4;
      else if(item.kind==='cleanse'&&p.corrosion>0)p.corrosion=0;
      else if(item.kind==='smoke'&&!p.smokeTurns)p.smokeTurns=3;
      else {this.message('That supply would have no effect right now.');return false;}
      p.inventory.splice(a.index,1);this.message('Used '+item.name+'.');return true;
    }
    if(a.type==='unequip'){
      if(!EQUIPMENT_SLOTS.includes(a.slot)||!p[a.slot])return false;
      const item=p[a.slot];p[a.slot]=null;recalculateGear(p);this.message(`Unequipped ${item.name}.`);return true;
    }
    if(a.type==='equip'){
      const item=p.inventory[a.index];if(!Number.isInteger(a.index)||!item||!slotsFor(item).length)return false;
      const slot=a.slot??slotsFor(item).find(slot=>!p[slot])??slotsFor(item)[0];if(!slotsFor(item).includes(slot))return false;
      if(equippedSlot(p,item)){this.message('That item is already equipped.');return false;}
      p[slot]=item;recalculateGear(p);this.message(`Equipped ${item.name}.`);return true;
    }
    if(a.type==='drop'){
      if(!Number.isInteger(a.index)||!p.inventory[a.index])return false;
      const item=p.inventory.splice(a.index,1)[0];s.items.push({...looseItem(item),x:p.x,y:p.y});this.message(`Dropped ${item.name}.`);return true;
    }
    if(a.type==='blessing'){
      const event=this.activeEncounter();if(event?.type!=='shrine'||event.quest||event.used)return false;
      if(a.choice==='heal'&&p.gold>=5&&p.hp<p.maxHp){p.gold-=5;p.hp=Math.min(p.maxHp,p.hp+12);}
      else if(a.choice==='mana'&&p.hp>6&&p.mana<p.maxMana){p.hp-=6;p.mana=Math.min(p.maxMana,p.mana+25);}else return false;
      event.used=true;this.message('The shrine grows silent. Its blessing is spent.');return true;
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
      if(loc.kind==='world'&&(x<0||x>=WIDTH||y<0||y>=HEIGHT)){if(!escortCanLeave(this))return false;this.visitWorld(loc.rx+a.dx,loc.ry+a.dy,{x:(x+WIDTH)%WIDTH,y:(y+HEIGHT)%HEIGHT});return true;}
      if(s.map[y]?.[x]==='X'){this.message('The bridge is barred. Speak to Kestrel nearby, or follow the longer dry path around.');return false;}
      const c=princeHere(this);if(c&&c.x===x&&c.y===y){Object.assign(c,{x:p.x,y:p.y,swappedTurn:s.turn+1});}
      const moved=super.resolvePlayer(a);
      if(moved){
        if(this.atMerchant())this.message('Mara buys trophies and sells supplies. Press E or Trade.');
        const event=this.activeEncounter();if(event)this.message(`${event.quest?(['bridge','villager'].includes(event.type)?event.quest.giver:'Broken waystone'):(event.name??ENCOUNTERS[event.type]?.name)}: ${event.quest?event.quest.title:(event.description??ENCOUNTERS[event.type]?.description)}${['guide','steward','journey','bridge','villager','shrine','woodland'].includes(event.type)?' Press E or Interact.':''}`);
        if(s.map[p.y][p.x]==='<')this.message('Q / Leave ↑ to retreat. The map is remembered; enemies return.');
        if(loc.kind==='world'&&(p.x===0||p.x===39||p.y===0||p.y===29)){
          const next=BIOMES[biomeAt(loc.rx+(p.x===0?-1:p.x===39?1:0),loc.ry+(p.y===0?-1:p.y===29?1:0),s.seed)];this.message(`Trail ahead: ${next.name}, recommended level ${next.recommended} — ${threatLabel(next.recommended,p.level)}. You can turn back.`);
        }
      }
      return moved;
    }
    return super.resolvePlayer(a);
  }
  finishTurn(){const p=this.state.player;if(this.state.status!=='playing')return;finishStory(this);if(p.rationTurns>0){p.hp=Math.min(p.maxHp,p.hp+healAmount(p,3));p.rationTurns--;}if(p.smokeTurns>0)p.smokeTurns--;if(p.corrosion>0)p.corrosion--;}
  awardExperience(amount){const p=this.state.player;p.xp+=amount;while(p.xp>=threshold(p)){p.xp-=threshold(p);p.level++;p.maxHp+=3;p.hp=Math.min(p.maxHp,p.hp+4);if(p.level%2===0)p.attack++;if(p.level%4===0)p.defense++;this.message(`Level ${p.level}. You grow a little stronger.`);}}
  kill(enemy){
    this.killCounts[enemy.kind]=(this.killCounts[enemy.kind]??0)+1;const entry=this.creatureIndex.get(creatureIndexKey(enemy));if(entry)entry.kills++;
    this.awardExperience(enemy.xp);this.message(`${enemy.name} falls. +${enemy.xp} XP.`);
    const loot=ordinaryDrop(this.rng,this.state.danger,enemy.kind,Boolean(enemy.eventId));if(loot){this.state.items.push({...loot,x:enemy.x,y:enemy.y});if(['rawMeat','rawRatMeat'].includes(loot.kind))this.message(`${loot.name} dropped. Collect it from the ground.`);}
    if(enemy.eventId){const event=this.state.encounters.find(e=>e.id===enemy.eventId);if(event&&!event.used){event.used=true;this.state.items.push({kind:'chest',name:enemy.miniboss?enemy.name+'’s hoard':'Beast hoard',reward:enemy.miniboss?minibossReward(this.rng,enemy.miniboss):treasure(this.rng,this.state.danger+2,'den'),x:enemy.x,y:enemy.y});}}
    if(enemy.questId&&this.state.quest){const q=this.state.quest;q.remaining=this.questRemaining();q.complete=q.remaining===0;if(q.complete&&q.accepted)this.message('The frogs are cleared. Return to the Mirekeeper whenever you are ready.');}
    if(enemy.questKey){const q=this.quests.get(enemy.questKey)??this.state.encounters.find(e=>e.quest?.id===enemy.questKey)?.quest;if(q&&q.kind!=='recovery'&&!this.state.enemies.some(e=>e.hp>0&&e.questKey===q.id)){q.complete=true;if(q.accepted)this.message(q.title+': objective complete. Return for your reward.');}}
    finishBridgeFight(this,enemy);
    if(enemy.kind==='guardian'&&!this.state.cleared){this.state.cleared=true;this.state.cryptsCleared++;this.state.items.push({kind:'chest',name:'Warden’s reliquary',reward:cryptRelic(this.rng),x:enemy.x,y:enemy.y});this.message('Crypt cleared. A dungeon-exclusive relic awaits in the Warden’s reliquary. This first-clear prize cannot be rerolled by leaving.');}
  }
}
