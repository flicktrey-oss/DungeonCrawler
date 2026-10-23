import {describe,it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import {ordinaryDrop} from '../src/game/loot.js';
import {Random} from '../src/game/random.js';
import {addItem,inventoryLayout,settleInventory} from '../src/game/inventory.js';
import {rawMeat,cookedMeat,rawRatMeat,ratMeat,shortSword,ironRing,potion,lastLight,throwingStones,equippedSlot} from '../src/game/items.js';
import {detectedCreatures,minimapCells} from '../src/minimap.js';
const game=()=>{const g=new Expedition(5);g.state.enemies=[];return g;};
describe('carried equipment',()=>{
 it('retains exact footprint and identity through equip, stack pickups, swaps and unequip',()=>{
  const g=game(),p=g.state.player;addItem(p,shortSword());const index=p.inventory.length-1,item=p.inventory[index],layout=inventoryLayout(p.inventory);
  expect(g.action({type:'equip',index})).toBe(true);expect(p.weapon).toBe(item);expect(inventoryLayout(p.inventory)).toEqual(layout);
  addItem(p,throwingStones(2));addItem(p,rawMeat());expect(p.weapon).toBe(p.inventory[index]);expect(equippedSlot(p,item)).toBe('weapon');
  const before=p.inventory.length;expect(g.action({type:'unequip',slot:'weapon'})).toBe(true);expect(p.inventory.length).toBe(before);expect(p.inventory[index]).toBe(item);
 });
 it('rejects equipping the same ring twice and rejects moving worn gear out of the satchel',()=>{
  const g=game(),p=g.state.player;addItem(p,ironRing());const index=p.inventory.length-1;g.action({type:'equip',index,slot:'ring1'});const turn=g.state.turn;
  expect(g.action({type:'equip',index,slot:'ring2'})).toBe(false);expect(p.ring2).toBeNull();
  for(const type of ['drop','store','sell'])expect(g.action({type,index})).toBe(false);
  expect(g.state.turn).toBe(turn);expect(p.inventory[index]).toBe(p.ring1);
  g.action({type:'unequip',slot:'ring1'});expect(g.action({type:'drop',index})).toBe(true);expect(p.ring1).toBeNull();
 });
 it('removes shattered Last-Light gear from the satchel so it cannot be equipped again',()=>{
  const g=game(),p=g.state.player;addItem(p,lastLight());const index=p.inventory.length-1;g.action({type:'equip',index});const item=p.amulet;
  p.hp=1;g.receiveEnemyAttack({name:'Beast',attack:100});expect(p.hp).toBe(1);expect(p.amulet).toBeNull();expect(p.inventory.includes(item)).toBe(false);
 });
 it('preserves equipped references, packing and progression across region changes',()=>{
  const g=game(),p=g.state.player;addItem(p,shortSword());g.action({type:'equip',index:p.inventory.length-1});const sword=p.weapon,layout=inventoryLayout(p.inventory);
  g.visitWorld(1,0,{x:0,y:15});g.visitWorld(0,0,{x:39,y:15});expect(p.inventory.includes(sword)).toBe(true);expect(p.weapon).toBe(sword);expect(inventoryLayout(p.inventory)).toEqual(layout);
 });
});
describe('hunting and campfire cooking',()=>{
 it('both frog types drop only raw meat or nothing at the 35% boundary',()=>{
  for(const kind of ['frog','pondFrog']){
   expect(ordinaryDrop({next:()=>.349999},9,kind)).toMatchObject({kind:'rawMeat',quantity:1});expect(ordinaryDrop({next:()=>.35},1,kind)).toBeNull();
   const rng=new Random(123);let meat=0;for(let n=0;n<10000;n++){const drop=ordinaryDrop(rng,1,kind);if(drop){expect(drop.kind).toBe('rawMeat');meat++;}}expect(meat/10000).toBeGreaterThan(.33);expect(meat/10000).toBeLessThan(.37);
  }
 });
 it('cooks one piece per turn only at the starting campfire and stacks both meat types',()=>{
  const g=game(),p=g.state.player;addItem(p,rawMeat(10));expect(p.inventory.filter(i=>i.kind==='rawMeat').map(i=>i.quantity)).toEqual([9,1]);expect(g.action({type:'cook'})).toBe(false);
  g.action({type:'move',dx:0,dy:1});expect(g.atCampfire()).toBe(true);const turn=g.state.turn;for(let n=0;n<10;n++)expect(g.action({type:'cook'})).toBe(true);
  expect(g.state.turn).toBe(turn+10);expect(p.inventory.some(i=>i.kind==='rawMeat')).toBe(false);expect(p.inventory.filter(i=>i.kind==='cookedMeat').map(i=>i.quantity)).toEqual([9,1]);expect(g.action({type:'cook'})).toBe(false);
 });
 it('full-bag cooking is atomic, but succeeds when cooking frees the final raw-meat cell',()=>{
  const g=game(),p=g.state.player;p.y=16;p.inventory=[rawMeat(2),...Array.from({length:99},potion)];settleInventory(p.inventory);const before=structuredClone(p);
  expect(g.action({type:'cook'})).toBe(false);expect(p).toEqual(before);expect(g.state.turn).toBe(0);
  p.inventory[0].quantity=1;expect(g.action({type:'cook'})).toBe(true);expect(p.inventory).toHaveLength(100);expect(p.inventory.at(-1).kind).toBe('cookedMeat');
 });
 it('cooking into an existing stack fits a full bag and keeps worn gear linked',()=>{
  const g=game(),p=g.state.player;p.y=16;p.inventory=[rawMeat(2),cookedMeat(3),ironRing(),...Array.from({length:97},potion)];p.ring1=p.inventory[2];settleInventory(p.inventory);
  expect(g.action({type:'cook'})).toBe(true);expect(p.inventory[1].quantity).toBe(4);expect(p.ring1).toBe(p.inventory[2]);expect(p.inventory).toHaveLength(100);
 });
 it('eating restores 10 HP per piece, costs a turn, and never consumes raw meat or wastes food at full health',()=>{
  const g=game(),p=g.state.player;p.inventory=[rawMeat(),cookedMeat(2)];expect(g.action({type:'use',index:0})).toBe(false);expect(g.action({type:'use',index:1})).toBe(false);expect(g.state.turn).toBe(0);
  p.hp=15;expect(g.action({type:'use',index:1})).toBe(true);expect(p.hp).toBe(25);expect(p.inventory[1].quantity).toBe(1);expect(g.action({type:'use',index:1})).toBe(true);expect(p.hp).toBe(32);expect(p.inventory).toHaveLength(1);expect(g.state.turn).toBe(2);
 });
});
describe('Detect Creatures',()=>{
 it('unlocks at level 3, charges 25 Mana, and gives every enemy exactly one action',()=>{
  const g=game(),p=g.state.player,e=g.makeEnemy('rabbit',{x:35,y:15},1,0);g.state.enemies=[e];expect(g.action({type:'detectCreatures'})).toBe(false);expect(g.state.turn).toBe(0);
  p.level=3;p.mana=24.9;expect(g.action({type:'detectCreatures'})).toBe(false);expect(e.actions).toBe(0);p.mana=25;
  expect(g.action({type:'detectCreatures'})).toBe(true);expect(p.mana).toBe(.3);expect(e.actions).toBe(1);expect(g.state.turn).toBe(1);
 });
 it('shows living hidden enemies on the minimap for exactly two turns without revealing terrain or rendering actors',()=>{
  const g=game(),s=g.state,p=s.player;p.level=3;const e=g.makeEnemy('rabbit',{x:35,y:15},1,0),dead={...e,hp:0};s.enemies=[e,dead];g.refresh();const explored=new Set(s.explored),visible=new Set(s.visible),cells=minimapCells(s);
  g.action({type:'detectCreatures'});expect(detectedCreatures(s)).toEqual([e]);for(let n=0;n<10;n++)g.refresh();expect(detectedCreatures(s)).toEqual([e]);expect(s.explored).toEqual(explored);expect(s.visible).toEqual(visible);expect(minimapCells(s)).toEqual(cells);
  g.action({type:'wait'});expect(detectedCreatures(s)).toEqual([e]);g.action({type:'wait'});expect(detectedCreatures(s)).toEqual([]);
 });
 it('clears detection when changing regions and invalid actions do not advance its duration',()=>{
  const g=game();g.state.player.level=3;g.action({type:'detectCreatures'});const until=g.state.detectCreaturesUntil;expect(g.action({type:'cook'})).toBe(false);expect(g.state.detectCreaturesUntil).toBe(until);expect(g.state.turn).toBe(1);
  g.visitWorld(1,0,{x:0,y:15});expect(g.state.detectCreaturesUntil).toBe(0);expect(detectedCreatures(g.state)).toEqual([]);
 });
});

describe('rat trail food',()=>{
 it('drops rat meat only at 50%, regardless of biome difficulty',()=>{expect(ordinaryDrop({next:()=>.49999},9,'rat')).toMatchObject({kind:'rawRatMeat',quantity:1});expect(ordinaryDrop({next:()=>.5},1,'rat')).toBeNull();const rng=new Random(61);let count=0;for(let n=0;n<10000;n++){const item=ordinaryDrop(rng,1,'rat');if(item){expect(item.kind).toBe('rawRatMeat');count++;}}expect(count/10000).toBeGreaterThan(.48);expect(count/10000).toBeLessThan(.52);});
 it('stacks rat food separately and cooks it for one turn without consuming regular meat',()=>{const g=game(),p=g.state.player;p.y=16;p.inventory=[];addItem(p,rawRatMeat(10));addItem(p,rawMeat(2));addItem(p,ratMeat(8));addItem(p,cookedMeat(3));expect(g.action({type:'cook',kind:'rawRatMeat'})).toBe(true);expect(p.inventory.filter(i=>i.kind==='ratMeat').map(i=>i.quantity)).toEqual([9]);expect(p.inventory.filter(i=>i.kind==='rawRatMeat').reduce((n,i)=>n+i.quantity,0)).toBe(9);expect(p.inventory.find(i=>i.kind==='rawMeat').quantity).toBe(2);expect(p.inventory.find(i=>i.kind==='cookedMeat').quantity).toBe(3);expect(g.state.turn).toBe(1);});
 it('heals five per rat meal and consumes just one piece, with no wasted full-health use',()=>{const g=game(),p=g.state.player;p.inventory=[ratMeat(2),rawRatMeat()];p.hp=20;expect(g.action({type:'use',index:0})).toBe(true);expect(p.hp).toBe(25);expect(p.inventory[0].quantity).toBe(1);expect(g.action({type:'use',index:1})).toBe(false);p.hp=p.maxHp;expect(g.action({type:'use',index:0})).toBe(false);expect(p.inventory[0].quantity).toBe(1);expect(g.state.turn).toBe(1);});
 it('keeps raw rat ingredients when a full bag has no room for the meal',()=>{const g=game(),p=g.state.player;p.y=16;p.inventory=[rawRatMeat(2),...Array.from({length:99},potion)];settleInventory(p.inventory);const before=structuredClone(p);expect(g.action({type:'cook',kind:'rawRatMeat'})).toBe(false);expect(p).toEqual(before);expect(g.state.turn).toBe(0);});
});

describe('more visible early food',()=>{
 it('raises rabbit meat to 50% without awarding coins or equipment',()=>{expect(ordinaryDrop({next:()=>.499999},1,'rabbit')).toMatchObject({kind:'rawMeat',quantity:1});expect(ordinaryDrop({next:()=>.5},9,'rabbit')).toBeNull();const rng=new Random(456);let count=0;for(let n=0;n<10000;n++){const drop=ordinaryDrop(rng,1,'rabbit');if(drop){expect(drop.kind).toBe('rawMeat');count++;}}expect(count/10000).toBeGreaterThan(.48);expect(count/10000).toBeLessThan(.52);});
 it('announces the exact food dropped and leaves it on the creature’s tile for pickup',()=>{for(const kind of ['rat','rabbit','frog']){const g=game();g.rng.next=()=>0;g.state.items=[];g.kill({kind,name:'Prey',xp:2,x:22,y:16});const item=g.state.items[0];expect(item).toMatchObject({kind:kind==='rat'?'rawRatMeat':'rawMeat',x:22,y:16});expect(g.state.log.at(-1)).toBe(item.name+' dropped. Collect it from the ground.');expect(g.state.player.inventory.some(i=>i.kind===item.kind)).toBe(false);}});
});
