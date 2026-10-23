import {describe,it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import {shortSword,hatchet,trailSpear,reedShield} from '../src/game/items.js';
import {attackWarning,combatFeedback} from '../src/game/combat-feedback.js';
import {characterDetails} from '../src/character-inspection.js';
function arena(kind='guardian',x=6,y=5){
 const g=new Expedition(5),s=g.state;
 s.map=Array.from({length:12},()=>Array(12).fill('.'));
 Object.assign(s.player,{x:5,y:5,hp:200,maxHp:200});
 s.enemies=[g.makeEnemy(kind,{x,y},1,0)];s.enemies[0].hp=s.enemies[0].maxHp=100;
 s.items=[];s.transition=false;g.refresh();return g;
}
const wait=g=>g.action({type:'wait'});
describe('heavy attack decisions',()=>{
 for(const kind of ['guardian','boss']){
  it(kind+' gives a full turn to retreat from a fixed sweep, then recovers',()=>{
   const g=arena(kind),e=g.state.enemies[0],p=g.state.player;
   wait(g);expect(e.intent.kind).toBe('cleave');expect(p.hp).toBe(200);
   expect(attackWarning(e,p)).toContain('YOU ARE IN ITS PATH');
   g.action({type:'move',dx:-1,dy:0});expect(p.hp).toBe(200);expect(e.recovering).toBe(true);
   const position={x:e.x,y:e.y};wait(g);expect(e.recovering).toBe(false);expect({x:e.x,y:e.y}).toEqual(position);expect(e.actions).toBe(3);
  });
 }
 it('a sweep punishes waiting once, then leaves a safe action',()=>{
  const g=arena(),e=g.state.enemies[0];wait(g);wait(g);expect(g.state.player.hp).toBe(200-e.attack);expect(e.recovering).toBe(true);
  wait(g);expect(g.state.player.hp).toBe(200-e.attack);wait(g);expect(e.intent.kind).toBe('cleave');expect(e.actions).toBe(4);
 });
 it('sweep cannot follow a player to a newly adjacent square outside its marked cross',()=>{
  const g=arena(),e=g.state.enemies[0];wait(g);g.action({type:'move',dx:0,dy:-1});expect(g.state.player.hp).toBe(200);expect(e.intent).toBeNull();
 });
 it('walls and inspection never resolve or erase the current windup',()=>{
  const g=arena(),e=g.state.enemies[0];wait(g);g.state.map[5][4]='#';const intent=structuredClone(e.intent);
  expect(g.action({type:'move',dx:-1,dy:0})).toBe(false);
  for(let i=0;i<10;i++){g.refresh();expect(characterDetails(g,e).warning).toContain('next turn');}
  expect(e.intent).toEqual(intent);expect(e.actions).toBe(1);expect(g.state.turn).toBe(1);
 });
 for(const kind of ['goat','boar','elite'])it(kind+' offers a lane dodge and one recovery action',()=>{
  const g=arena(kind,5,2),e=g.state.enemies[0];wait(g);expect(e.intent.kind).toBe('charge');g.action({type:'move',dx:1,dy:0});expect(g.state.player.hp).toBe(200);expect(e.recovering).toBe(true);
  const position={x:e.x,y:e.y};wait(g);expect({x:e.x,y:e.y}).toEqual(position);expect(e.actions).toBe(3);
 });
 it('a sweep uses melee shield odds rather than ranged shield odds',()=>{
  const g=arena();g.state.player.offhand=reedShield();g.rng.next=()=>.3;wait(g);wait(g);expect(g.state.player.hp).toBeLessThan(200);expect(g.state.blockedAttacks??0).toBe(0);
 });
 it('a warden killed during its windup cannot finish the attack',()=>{
  const g=arena(),e=g.state.enemies[0];wait(g);e.hp=1;g.action({type:'move',dx:1,dy:0});expect(e.hp).toBeLessThanOrEqual(0);expect(e.actions).toBe(1);expect(g.state.player.hp).toBe(200);
 });
});
describe('weapon choices',()=>{
 it('a sword countercut rewards attacking a windup without cancelling the danger',()=>{
  const g=arena(),e=g.state.enemies[0],p=g.state.player;p.weapon=shortSword();wait(g);
  const hp=e.hp;g.action({type:'move',dx:1,dy:0});expect(hp-e.hp).toBe(p.attack+p.weapon.bonus+1-e.defense);expect(p.hp).toBeLessThan(200);expect(e.actions).toBe(2);expect(g.state.log.some(t=>t.includes('Countercut'))).toBe(true);
 });
 it('a sword gets no counter bonus against ordinary attacks or on projectiles',()=>{
  const g=arena('rat'),e=g.state.enemies[0];g.state.player.weapon=shortSword();g.strikeEnemy(e,5);expect(e.hp).toBe(95);
  e.intent={kind:'tongue',tiles:[]};g.strikeEnemy(e,5,'Throw',false);expect(e.hp).toBe(90);
 });
 it('a hatchet pierces two heavy armor but only one light armor',()=>{
  const g=arena(),e=g.state.enemies[0];g.state.player.weapon=hatchet();e.defense=5;g.strikeEnemy(e,7);expect(e.hp).toBe(96);
  e.defense=2;g.strikeEnemy(e,7);expect(e.hp).toBe(90);
 });
 it('a spear keeps a safe two-tile attack without inheriting sword or axe bonuses',()=>{
  const g=arena('guardian',7,5),e=g.state.enemies[0];g.state.player.weapon=trailSpear();e.defense=0;
  expect(g.action({type:'reach',x:7,y:5})).toBe(true);expect(e.hp).toBe(97);expect(g.state.player.hp).toBe(200);expect(e.actions).toBe(1);
 });
});
describe('feedback is presentation data',()=>{
 it('records hits, misses and blocks without consuming additional actions',()=>{
  const g=arena(),e=g.state.enemies[0];wait(g);g.action({type:'move',dx:-1,dy:0});expect(g.state.combatEvents.at(-1)).toMatchObject({kind:'miss',text:'MISS'});
  g.state.player.offhand=reedShield();g.rng.next=()=>0;g.receiveEnemyAttack(e);expect(g.state.combatEvents.at(-1).kind).toBe('block');
  g.strikeEnemy(e,5);expect(g.state.combatEvents.at(-1).kind).toBe('strike');expect(g.state.turn).toBe(2);expect(e.actions).toBe(2);
 });
 it('bounds the queue and retains monotonic identifiers without retaining entity references',()=>{
  const s={},target={x:1,y:2,hp:10},from={x:3,y:4};for(let i=0;i<100;i++)combatFeedback(s,target,'−1','hurt',from);
  expect(s.combatEvents).toHaveLength(40);expect(s.combatEvents[0].id).toBe(61);expect(s.combatSerial).toBe(100);
  target.x=9;from.x=9;expect(s.combatEvents.at(-1)).toMatchObject({x:1,from:{x:3,y:4}});
 });
 it('warning text distinguishes being in the path, being safe and recovering',()=>{
  const e={intent:{kind:'cleave',tiles:[{x:1,y:2}]}};expect(attackWarning(e,{x:1,y:2})).toContain('YOU ARE IN ITS PATH');expect(attackWarning(e,{x:2,y:2})).toContain('stay clear');e.intent=null;e.recovering=true;expect(attackWarning(e,{})).toContain('Recovering');
 });
});
