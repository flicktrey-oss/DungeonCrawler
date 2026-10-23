import {describe,it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import * as I from '../src/game/items.js';
import {enemyTypes} from '../src/game/combat.js';
import {ITEM_CATALOG} from '../src/game/loot.js';
describe('protection and risk rewards',()=>{
 it('keeps a plain full kit useful without turning every slot into ordinary armor',()=>{
 const g=new Expedition(5),p=g.state.player;Object.assign(p,{armor:I.travelGear('armor'),amulet:I.reedAmulet(),boots:I.trailBoots(),ring1:I.ironRing(),ring2:I.ironRing(),offhand:I.buckler()});
 expect(I.defense(p)).toBe(2);expect(I.gearBonus(p,'wardedBonus')).toBe(2);expect(I.gearBonus(p,'stealthBonus')).toBe(1);expect(I.shieldChance(p)).toBe(.35);
 g.combatRng.next=()=>.5;g.rng.next=()=>1;g.receiveEnemyAttack({name:'Beast',attack:8});expect(p.hp).toBe(26);g.receiveEnemyAttack({name:'Beast',attack:8},'lashes',{special:true});expect(p.hp).toBe(22);
 });
 it('softens high armor monotonically, retaining meaningful bonuses and corrosion',()=>{
 const p={inventory:[],defense:0};const values=[];
 for(let defense=0;defense<=12;defense++){p.defense=defense;values.push(I.defense(p));}
 expect(values).toEqual([0,1,2,3,3,4,4,5,5,6,6,7,7]);p.defense=6;p.corrosion=2;expect(I.rawDefense(p)).toBe(6);expect(I.defense(p)).toBe(3);
 });
 it('makes den guardians stronger while preserving ordinary starter creatures',()=>{
 const g=new Expedition(5),rat=g.makeEnemy('rat',{x:8,y:8},1,0),den=g.makeEnemy('elite',{x:12,y:8,eventId:'den:test'},1,1);
 expect(rat.attack).toBe(enemyTypes.rat.attack);expect(rat.hp).toBe(enemyTypes.rat.hp);expect(den.attack).toBe(8);expect(den.hp).toBe(26);expect(den.territory).toMatchObject({x:12,y:8,radius:5});
 });
 it('lets forest den rewards include equipment from the next danger tier without exceeding it',()=>{
 let higherTier=false;
 for(let seed=1;seed<=100;seed++){
 const g=new Expedition(seed),e=g.makeEnemy('elite',{x:12,y:8,eventId:'den:test'},1,1);g.state.danger=1;g.state.encounters=[{type:'den',id:'den:test',used:false}];g.state.items=[];e.hp=0;g.kill(e);
 const reward=g.state.items.find(i=>i.kind==='chest').reward,entry=ITEM_CATALOG.find(i=>i.id===reward.id);expect(entry).toBeTruthy();expect(entry.minDanger).toBeLessThanOrEqual(3);if(entry.minDanger>1)higherTier=true;
 }
 expect(higherTier).toBe(true);
 });
});
