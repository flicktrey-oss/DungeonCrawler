import {describe,it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import {Random} from '../src/game/random.js';
import * as I from '../src/game/items.js';
import {ITEM_CATALOG,modifyItem,itemReward,ordinaryDrop} from '../src/game/loot.js';
import {adventurerPixels,adventurerSvg} from '../src/render/adventurer.js';
const game=()=>{const g=new Expedition(17);g.state.enemies=[];return g;};
const equip=(g,item,slot)=>{g.state.player.inventory.push(item);return g.action({type:'equip',index:g.state.player.inventory.length-1,slot});};
describe('seven equipment slots',()=>{
 it('wears two separate rings, selects replacements, and rejects mismatched slots without a turn',()=>{
 const g=game(),p=g.state.player;expect(equip(g,I.ironRing())).toBe(true);expect(equip(g,I.huntersRing())).toBe(true);
 expect(p.ring1.name).toBe('Iron Band');expect(p.ring2.name).toBe('Hunter’s Ring');expect(I.defense(p)).toBe(0);expect(I.gearBonus(p,'wardedBonus')).toBe(1);expect(I.attack(p)).toBe(4);
 expect(equip(g,I.moonRing(),'ring1')).toBe(true);expect(p.inventory.some(i=>i.name==='Iron Band'&&i!==p.ring1&&i!==p.ring2)).toBe(true);expect(p.maxMana).toBe(120);expect(p.mana).toBe(100.3);
 const turn=g.state.turn;expect(equip(g,I.ironRing(),'boots')).toBe(false);expect(g.state.turn).toBe(turn);
 });
 it('clamps Mana on removal and does not restore it by re-equipping',()=>{
 const g=game(),p=g.state.player;equip(g,I.moonRing());p.mana=120;expect(g.action({type:'unequip',slot:'ring1'})).toBe(true);expect(p.mana).toBe(100);expect(p.maxMana).toBe(100);
 g.action({type:'equip',index:p.inventory.findIndex(i=>i.kind==='ring')});expect(p.mana).toBe(100.3);
 });
 it('relics replace shields and contribute sight, Mana recovery and vision duration',()=>{
 const g=game(),p=g.state.player;equip(g,I.buckler());equip(g,I.lanternRelic());expect(p.offhand.relic).toBe(true);expect(p.inventory.some(i=>i.name==='Weathered buckler'&&i!==p.offhand)).toBe(true);expect(I.shieldChance(p)).toBe(0);expect(I.recovery(p)).toBe(.5);expect(I.gearBonus(p,'sightBonus')).toBe(1);
 equip(g,I.waystoneFocus());expect(p.maxMana).toBe(120);g.action({type:'mindVision'});expect(g.state.mindVisionUntil-g.state.turn).toBe(3);
 });
 it('boots modify detection and appearance; plain characters have no phantom equipment',()=>{
 const g=game(),p=g.state.player;const plain=adventurerSvg(p);expect(plain).not.toContain('data-weapon-icon');expect(plain).not.toContain('data-boots-icon');
 equip(g,I.trailBoots());expect(I.defense(p)).toBe(0);expect(I.gearBonus(p,'stealthBonus')).toBe(1);expect(adventurerSvg(p)).toContain('data-boots-icon');
 expect(adventurerPixels(p)).not.toEqual(adventurerPixels({}));
 });
 it('keeps both carried rings through a full-bag swap and unequip',()=>{const g=game(),p=g.state.player;p.inventory=[I.moonRing(),I.ironRing(),...Array.from({length:98},I.potion)];p.ring1=p.inventory[1];expect(g.action({type:'equip',index:0,slot:'ring1'})).toBe(true);expect(p.ring1).toBe(p.inventory[0]);expect(p.inventory).toHaveLength(100);expect(g.action({type:'unequip',slot:'ring1'})).toBe(true);expect(p.ring1).toBeNull();expect(p.inventory).toHaveLength(100);});
});
describe('reward pacing and source identity',()=>{
 it('has 27 distinct items and a reproducible weighted table',()=>{
 expect(ITEM_CATALOG).toHaveLength(27);expect(new Set(ITEM_CATALOG.map(e=>e.id)).size).toBe(27);
 const a=new Random(9),b=new Random(9);expect(Array.from({length:20},()=>itemReward(a,3,'crypt'))).toEqual(Array.from({length:20},()=>itemReward(b,3,'crypt')));
 });
 it('keeps empty ordinary drops and makes difficult equipment rewards much more likely to be modified',()=>{
 const a=new Random(71),b=new Random(72);let empty=0,modified=0,boss=0;for(let n=0;n<4000;n++){if(!ordinaryDrop(a,1,'beetle'))empty++;if(itemReward(b,4,'crypt').modifier)modified++;if(itemReward(b,4,'boss').modifier)boss++;}
 expect(empty/4000).toBeGreaterThan(.45);expect(modified/4000).toBeGreaterThan(.65);expect(modified/4000).toBeLessThan(.75);expect(boss).toBe(4000);
 });
 it('den rewards favor weapons and boots while crypts favor protection and relics',()=>{
 const rng=new Random(123);let den=0,crypt=0;for(let n=0;n<4000;n++){if(['weapon','boots'].includes(itemReward(rng,4,'den').kind))den++;if(['weapon','boots'].includes(itemReward(rng,4,'crypt').kind))crypt++;}
 expect(den).toBeGreaterThan(crypt*1.5);
 });
 it('modifiers copy source items and produce functional stat bonuses',()=>{
 const source=I.shortSword(),original=structuredClone(source),rng=new Random(44);let upgraded;
 for(let n=0;n<100;n++){const item=modifyItem(source,rng,'boss');if(item.bonus>1)upgraded=item;}expect(source).toEqual(original);expect(upgraded).toBeTruthy();
 const g=game();equip(g,upgraded);expect(I.attack(g.state.player)).toBe(3+upgraded.bonus);
 });
});
describe('special supplies and effects',()=>{
 it('uses Mana supplies and rejects wasted uses without taking a turn',()=>{
 const g=game(),p=g.state.player;p.inventory=[I.moonwell()];expect(g.action({type:'use',index:0})).toBe(false);p.mana=10;expect(g.action({type:'use',index:0})).toBe(true);expect(p.mana).toBe(45.3);expect(g.state.turn).toBe(1);
 });
 it('rations heal over turns, damage interrupts them, and cleansing removes corrosion',()=>{
 const g=game(),p=g.state.player;p.hp=10;p.inventory=[I.rations(),I.clearwater()];g.action({type:'use',index:0});expect(p.hp).toBe(13);g.action({type:'wait'});expect(p.hp).toBe(16);g.receiveEnemyAttack({attack:2,name:'Rat'});expect(p.rationTurns).toBe(0);p.corrosion=2;g.action({type:'use',index:0});expect(p.corrosion).toBe(0);
 });
 it('smoke stops distant pursuit for three phases but does not stop adjacent attacks',()=>{
 const g=game(),p=g.state.player;p.inventory=[I.smokeFlask()];const e={x:p.x+3,y:p.y,hp:20,attack:2,defense:0,range:8,actions:0,name:'Rat',kind:'rat'};g.state.enemies=[e];
 g.action({type:'use',index:0});g.action({type:'wait'});g.action({type:'wait'});expect(e.x).toBe(p.x+3);expect(e.actions).toBe(3);expect(p.smokeTurns).toBe(0);g.action({type:'wait'});expect(e.x).toBe(p.x+2);
 });
 it('last light shatters on one fatal hit, and cannot prevent the next',()=>{
 const g=game(),p=g.state.player;p.amulet=I.lastLight();p.hp=1;g.receiveEnemyAttack({name:'Beast',attack:50});expect(p.hp).toBe(1);expect(p.amulet).toBeNull();g.receiveEnemyAttack({name:'Beast',attack:50});expect(g.state.status).toBe('dead');
 });
 it('thunder interrupts exactly one enemy action; knives use their stronger damage',()=>{
 const g=game(),p=g.state.player;const e={x:p.x+2,y:p.y,hp:20,maxHp:20,attack:2,defense:0,range:8,actions:0,name:'Rat',kind:'rat'};g.state.enemies=[e];g.refresh();p.inventory=[I.thunderstone(),I.throwingKnives()];
 expect(g.action({type:'throw',x:e.x,y:e.y,index:0})).toBe(true);expect(e.x).toBe(p.x+2);expect(e.actions).toBe(1);expect(e.hp).toBe(20);
 expect(g.action({type:'throw',x:e.x,y:e.y,index:0})).toBe(true);expect(e.hp).toBe(16);
 });
});
describe('equipment combat effects',()=>{
 it('hatchets pierce armor and isolated charms add damage only to separated enemies',()=>{
 const g=game(),p=g.state.player;equip(g,I.hatchet());p.amulet=I.wolfCharm();const enemy={x:p.x+1,y:p.y,hp:30,defense:2,name:'Beast'};g.state.enemies=[enemy];g.strikeEnemy(enemy,I.attack(p));expect(enemy.hp).toBe(27);
 g.state.enemies.push({x:enemy.x+1,y:enemy.y,hp:10});g.strikeEnemy(enemy,I.attack(p));expect(enemy.hp).toBe(25);
 });
 it('bleeding resolves once per enemy action, can kill and awards experience once',()=>{
 const g=game(),p=g.state.player;const enemy={x:p.x+3,y:p.y,hp:1,defense:0,bleeding:2,name:'Rat',kind:'rat',xp:2,actions:0,range:6};g.state.enemies=[enemy];const xp=p.xp;g.action({type:'wait'});expect(enemy.hp).toBe(0);expect(p.xp).toBe(xp+2);g.action({type:'wait'});expect(p.xp).toBe(xp+2);expect(enemy.actions).toBe(1);
 });
 it('uses different shield chances for ranged attacks, caps stacking, and wards special damage only',()=>{
 const g=game(),p=g.state.player;p.offhand=I.reedShield();expect(I.shieldChance(p)).toBe(.15);expect(I.shieldChance(p,true)).toBe(.55);p.offhand.blockBonus=.2;expect(I.shieldChance(p,true)).toBe(.6);
 p.offhand={...I.lanternRelic(),wardedBonus:2};const e={attack:5,name:'Beast'};g.receiveEnemyAttack(e,'strikes',{special:true});expect(p.hp).toBe(29);g.receiveEnemyAttack(e);expect(p.hp).toBe(24);
 });
 it('bellflower improves tonic healing and softsteps reduce pursuit detection',()=>{
 const g=game(),p=g.state.player;p.hp=1;p.amulet=I.bellflower();p.inventory=[I.potion()];g.action({type:'use',index:0});expect(p.hp).toBe(21);
 equip(g,I.softstepBoots());const e={x:p.x+4,y:p.y,hp:10,defense:0,attack:2,range:5,name:'Rat',kind:'rat',actions:0};g.state.enemies=[e];g.action({type:'wait'});expect(e.x).toBe(p.x+4);
 });
});
