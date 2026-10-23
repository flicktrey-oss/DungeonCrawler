import {describe,it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import {Random} from '../src/game/random.js';
import {shortSword,trailSpear,hatchet,buckler,ironRing,throwingStones,attack,defense} from '../src/game/items.js';
import {offenseRange,rollOffense,enemyOffenseRange,playerOffenseRange,incomingRange,itemDamageDescription,rangeLabel} from '../src/game/damage-rolls.js';
import {characterDetails} from '../src/character-inspection.js';
function arena(seed=5){const g=new Expedition(seed);g.state.map=Array.from({length:12},()=>Array(12).fill('.'));Object.assign(g.state.player,{x:5,y:5,hp:500,maxHp:500});g.state.items=[];g.state.enemies=[{...g.makeEnemy('rat',{x:6,y:5},1,0),hp:1000,maxHp:1000,attack:5,defense:0}];g.state.transition=false;g.refresh();return g;}
function low(g){g.combatRng.next=()=>0;}
function high(g){g.combatRng.next=()=>.999999;}
describe('small bounded dice instead of critical hits',()=>{
 it('defines tight sword and spear rolls and a wider axe spread',()=>{
  expect(offenseRange(6,'sword')).toEqual([5,7]);expect(offenseRange(6,'spear')).toEqual([5,6]);expect(offenseRange(6,'axe')).toEqual([4,8]);expect(offenseRange(3,'unarmed')).toEqual([3,3]);expect(offenseRange(2,'projectile')).toEqual([1,3]);expect(offenseRange(4,'projectile')).toEqual([3,5]);
 });
 it('rolls inclusive bounds, never outside them, and reaches each axe outcome',()=>{
  expect(rollOffense({int:(a,b)=>a},6,'axe')).toBe(4);expect(rollOffense({int:(a,b)=>b},6,'axe')).toBe(8);const rng=new Random(17),results=Array.from({length:1000},()=>rollOffense(rng,6,'axe'));expect(new Set(results)).toEqual(new Set([4,5,6,7,8]));
 });
 it('does not raise the maximum of weak enemies and limits stronger swings to one point',()=>{
  expect(enemyOffenseRange({attack:2})).toEqual([1,2]);expect(enemyOffenseRange({attack:3})).toEqual([2,3]);expect(enemyOffenseRange({attack:9})).toEqual([8,10]);
 });
 it('keeps minimum damage at one after armor, including low axe rolls',()=>{
  const g=arena(),e=g.state.enemies[0];g.state.player.weapon=hatchet();e.defense=50;low(g);g.strikeEnemy(e,attack(g.state.player));expect(e.hp).toBe(999);
 });
 it('shifts the range as strength and weapon bonuses improve',()=>{
  const g=arena(),p=g.state.player;p.weapon=shortSword();expect(playerOffenseRange(p)).toEqual([3,5]);p.attack+=2;p.weapon={...p.weapon,bonus:3};expect(playerOffenseRange(p)).toEqual([7,9]);expect(itemDamageDescription(p,trailSpear())).toContain('Damage 4–5');
 });
});
describe('existing rules apply to rolled hits',()=>{
 it('adds sword countercut after rolling without changing the enemy action count',()=>{
  const g=arena(),p=g.state.player,e=g.state.enemies[0];p.weapon=shortSword();e.intent={kind:'tongue',tiles:[{x:5,y:5}]};low(g);expect(g.action({type:'move',dx:1,dy:0})).toBe(true);expect(e.hp).toBe(996);expect(e.actions).toBe(1);expect(g.state.turn).toBe(1);expect(g.state.log.some(t=>t.includes('Countercut'))).toBe(true);
 });
 it('rolls a spear reach hit once and preserves the clear-line requirement',()=>{
  const g=arena(),p=g.state.player,e=g.state.enemies[0];p.weapon=trailSpear();e.x=7;low(g);expect(g.action({type:'reach',x:7,y:5})).toBe(true);expect(e.hp).toBe(998);expect(e.actions).toBe(1);e.x=7;g.state.map[5][6]='#';g.state.mindVisionUntil=99;g.refresh();const seed=g.combatRng.seed;expect(g.action({type:'reach',x:7,y:5})).toBe(false);expect(g.combatRng.seed).toBe(seed);expect(g.state.turn).toBe(1);
 });
 it('applies axe armor piercing to both damage extremes',()=>{
  const g=arena(),p=g.state.player,e=g.state.enemies[0];p.weapon=hatchet();p.attack=7;e.defense=4;low(g);g.strikeEnemy(e,7);expect(e.hp).toBe(997);high(g);g.strikeEnemy(e,7);expect(e.hp).toBe(990);
 });
 it('blocked attacks consume no damage roll; warded gear reduces special rolls',()=>{
  const g=arena(),p=g.state.player,e=g.state.enemies[0];p.offhand=buckler();g.rng.next=()=>0;const seed=g.combatRng.seed;g.receiveEnemyAttack(e);expect(g.combatRng.seed).toBe(seed);expect(p.hp).toBe(500);p.offhand=null;p.ring1=ironRing();high(g);g.receiveEnemyAttack(e,'hits',{special:true});expect(p.hp).toBe(495);expect(incomingRange(e,p,true)).toEqual([3,5]);
 });
 it('rolls projectiles independently of the equipped melee weapon',()=>{
  const g=arena(),p=g.state.player,e=g.state.enemies[0];p.weapon=hatchet();e.x=8;p.inventory=[throwingStones(2)];high(g);expect(g.action({type:'throw',x:8,y:5})).toBe(true);expect(e.hp).toBe(997);expect(p.inventory[0].quantity).toBe(1);expect(e.actions).toBe(1);
 });
 it('makes Aldren use his own sword roll and records the effect at his position',()=>{
  const g=arena(),e=g.state.enemies[0],c={x:4,y:5,attack:5};g.state.player.weapon=hatchet();low(g);g.strikeEnemy(e,c.attack,'Aldren strikes',false,{attacker:c,profile:'sword'});expect(e.hp).toBe(996);expect(g.state.combatEvents.at(-1).from).toEqual({x:4,y:5});
 });
});
describe('deterministic, frozen and readable',()=>{
 it('repeats real damage sequences from a seed and produces varied hits',()=>{
  const run=seed=>{const g=arena(seed);g.state.player.weapon=shortSword();const results=[];for(let n=0;n<15;n++){g.action({type:'move',dx:1,dy:0});results.push([g.state.player.hp,g.state.enemies[0].hp]);}return results;};expect(run(77)).toEqual(run(77));expect(run(77)).not.toEqual(run(78));const hits=run(77).map((a,i,all)=>i?all[i-1][1]-a[1]:1000-a[1]);expect(new Set(hits).size).toBeGreaterThan(1);
 });
 it('inspection, range previews, refreshes, and invalid actions never roll damage or spend turns',()=>{
  const g=arena(),e=g.state.enemies[0],seed=g.combatRng.seed,loot=g.rng.seed;g.state.map[5][4]='#';for(let i=0;i<20;i++){characterDetails(g,e);playerOffenseRange(g.state.player);itemDamageDescription(g.state.player,hatchet());g.refresh();expect(g.action({type:'move',dx:-1,dy:0})).toBe(false);}expect(g.combatRng.seed).toBe(seed);expect(g.rng.seed).toBe(loot);expect(e.actions).toBe(0);expect(g.state.turn).toBe(0);
 });
 it('reports incoming damage after current armor and special protection',()=>{
  const g=arena(),p=g.state.player,e=g.state.enemies[0];p.defense=2;p.ring1=ironRing();expect(characterDetails(g,e).damageText).toContain('Damage against you: 2–4 · special 1–3');p.weapon=shortSword();expect(characterDetails(g,p).damageText).toContain('Damage 3–5 before enemy defense');expect(rangeLabel([1,1])).toBe('1');expect(defense(p)).toBe(2);
 });
});
