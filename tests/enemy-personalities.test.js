import {describe,it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import {enemyTypes} from '../src/game/combat.js';
import {trailSpear,buckler} from '../src/game/items.js';
import {drawCreature} from '../src/render/creature-sprites.js';
function arena(kind,x=5,y=3){const g=new Expedition(5);g.state.map=Array.from({length:12},()=>Array(12).fill('.'));Object.assign(g.state.player,{x:5,y:5});g.state.items=[];g.state.enemies=[g.makeEnemy(kind,{x,y},1,0)];g.state.transition=false;g.refresh();return g;}
describe('readable, strictly turn-based enemy attacks',()=>{
 it('winds up a two-tile tongue attack then hits once on the next enemy phase',()=>{const g=arena('frog'),e=g.state.enemies[0];g.action({type:'wait'});expect(e.intent).toMatchObject({kind:'tongue',tiles:[{x:5,y:4},{x:5,y:5}]});expect(g.state.player.hp).toBe(32);g.refresh();g.refresh();expect(e.actions).toBe(1);g.action({type:'wait'});expect(g.state.player.hp).toBe(25);expect(e.intent).toBe(null);expect(e.actions).toBe(2);expect(g.state.enemyEffects[0].kind).toBe('tongue');});
 it('lets the player sidestep a frog tongue instead of tracking their new position',()=>{const g=arena('frog');g.action({type:'wait'});g.action({type:'move',dx:1,dy:0});expect(g.state.player.hp).toBe(32);expect(g.state.log.at(-1)).toContain('misses');});
 it('does not wind up or strike through a wall even under Mind Vision',()=>{const g=arena('frog');g.state.map[4][5]='#';g.state.mindVisionUntil=99;g.refresh();g.action({type:'wait'});expect(g.state.enemies[0].intent).toBeUndefined();expect(g.state.player.hp).toBe(32);});
 it('keeps warnings frozen when the player tries an invalid wall move',()=>{const g=arena('frog');g.action({type:'wait'});g.state.map[5][6]='#';expect(g.action({type:'move',dx:1,dy:0})).toBe(false);expect(g.state.enemies[0].actions).toBe(1);expect(g.state.enemies[0].intent.kind).toBe('tongue');});
 it('never lets a killed creature finish its prepared attack',()=>{const g=arena('frog'),e=g.state.enemies[0];g.action({type:'wait'});e.hp=1;g.state.player.weapon=trailSpear();g.action({type:'reach',x:e.x,y:e.y});expect(e.hp).toBeLessThanOrEqual(0);expect(e.actions).toBe(1);expect(g.state.player.hp).toBe(32);});
 it('marks sap spit at range three and resolves on the very next phase despite slow AI',()=>{const g=arena('beetle',5,2),e=g.state.enemies[0];g.action({type:'wait'});expect(e.intent).toEqual({kind:'spit',tiles:[{x:5,y:5}]});expect(g.state.player.hp).toBe(32);g.action({type:'wait'});expect(g.state.player.hp).toBe(30);expect(e.actions).toBe(2);expect(e.intent).toBe(null);});
 it('allows dodging sap and lets equipped bucklers block ranged hits',()=>{const g=arena('beetle',5,2);g.action({type:'wait'});g.action({type:'move',dx:1,dy:0});expect(g.state.player.hp).toBe(32);const h=arena('frog');h.state.player.offhand=buckler();h.rng.next=()=>0;h.action({type:'wait'});h.action({type:'wait'});expect(h.state.player.hp).toBe(32);expect(h.state.blockedAttacks).toBe(1);});
 it('gives rams higher defense and one telegraphed charge without overlapping the player',()=>{const g=arena('goat',5,2),e=g.state.enemies[0];expect(e.defense).toBe(5);g.action({type:'wait'});expect(e.intent.kind).toBe('charge');g.action({type:'wait'});expect(g.state.player.hp).toBe(20);expect({x:e.x,y:e.y}).toEqual({x:5,y:4});expect(e.actions).toBe(2);});
 it('lets a sidestep dodge the charge and prevents charges through obstacles or other creatures',()=>{const g=arena('goat',5,2),e=g.state.enemies[0];g.action({type:'wait'});g.action({type:'move',dx:1,dy:0});expect(g.state.player.hp).toBe(32);expect(e.y).toBe(5);const h=arena('goat',5,2);h.action({type:'wait'});h.state.enemies.push(h.makeEnemy('rat',{x:5,y:3},1,1));h.action({type:'wait'});expect(h.state.enemies[0].y).toBe(2);expect(new Set(h.state.enemies.map(e=>`${e.x},${e.y}`)).size).toBe(2);expect(h.state.player.hp).toBe(32);const water=arena('goat',5,2);water.state.map[3][5]='~';water.action({type:'wait'});expect(water.state.enemies[0].intent).toBeUndefined();expect(water.state.player.hp).toBe(32);});
 it('resolves game over from a special attack and rejects further turns',()=>{const g=arena('frog');g.state.player.hp=1;g.action({type:'wait'});g.action({type:'wait'});expect(g.state.status).toBe('dead');expect(g.action({type:'wait'})).toBe(false);expect(g.state.turn).toBe(2);});
});
describe('original creature icon coverage',()=>{
 it('gives every enemy kind a distinct procedural drawing, independent of platform emoji fonts',()=>{
  const drawings=[];
  for(const kind of Object.keys(enemyTypes)){
   const commands=[],g={fillStyle:(...a)=>commands.push(['color',...a]),fillRect:(...a)=>commands.push(['rect',...a]),fillEllipse:(...a)=>commands.push(['ellipse',...a]),fillTriangle:(...a)=>commands.push(['triangle',...a])};
   expect(drawCreature(g,0,0,kind)).toBe(true);expect(commands.length).toBeGreaterThan(10);drawings.push(JSON.stringify(commands));
  }
  expect(new Set(drawings).size).toBe(Object.keys(enemyTypes).length);
 });
});
