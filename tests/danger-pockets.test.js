import {describe,it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import {dangerAt,visibleDangerPockets,insideTerritory} from '../src/game/danger.js';
import {drawDangerPockets} from '../src/render/danger-pockets.js';
import {key} from '../src/game/dungeon.js';
function arena(kind='rat',position={x:7,y:5},player={x:8,y:5}){
 const g=new Expedition(5);g.state.map=Array.from({length:12},()=>Array(12).fill('.'));g.state.enemies=[g.makeEnemy(kind,position,1,0)];
 g.state.enemies[0].territory={x:5,y:5,radius:2,name:'Guarded clearing'};g.state.items=[];Object.assign(g.state.player,player);g.state.transition=false;g.refresh();return g;
}
describe('territorial enemy actions',()=>{
 it('lets a player outside the pocket wait safely while the guardian returns one tile per turn',()=>{
 const g=arena(),e=g.state.enemies[0];g.refresh();g.refresh();expect(e.actions).toBe(0);
 for(let turn=0;turn<3;turn++)expect(g.action({type:'wait'})).toBe(true);
 expect(g.state.player.hp).toBe(32);expect({x:e.x,y:e.y}).toEqual({x:5,y:5});expect(e.actions).toBe(3);
 });
 it('cancels an aimed tongue when the player steps out of its territory',()=>{
 const g=arena('frog',{x:6,y:5},{x:7,y:5}),e=g.state.enemies[0];g.action({type:'wait'});expect(e.intent?.kind).toBe('tongue');
 g.action({type:'move',dx:1,dy:0});expect(e.intent).toBeNull();expect(g.state.player.hp).toBe(32);expect(e.actions).toBe(2);expect(e.x).toBe(5);
 });
 it('takes no action when an invalid wall move is attempted',()=>{
 const g=arena(),e=g.state.enemies[0];g.state.map[5][9]='#';expect(g.action({type:'move',dx:1,dy:0})).toBe(false);expect(e.actions).toBe(0);expect(e.x).toBe(7);
 });
 it('does not detour outside its territory in order to pursue a player inside',()=>{
 const g=arena('rat',{x:5,y:5},{x:5,y:3}),e=g.state.enemies[0];e.range=8;g.state.map[4][5]='#';
 g.action({type:'wait'});expect({x:e.x,y:e.y}).toEqual({x:5,y:5});expect(e.actions).toBe(1);expect(g.state.player.hp).toBe(32);
 });
 it('keeps missed charges within the territory and out of occupied tiles',()=>{
 const g=arena('goat',{x:5,y:4},{x:5,y:6}),e=g.state.enemies[0];g.action({type:'wait'});expect(e.intent.kind).toBe('charge');g.action({type:'move',dx:1,dy:0});expect(insideTerritory(e.territory,e)).toBe(true);expect(e.y).toBe(7);expect(g.state.player.hp).toBe(32);
 });
 it('resolves bleeding and interruption before a return movement',()=>{
 const g=arena(),e=g.state.enemies[0];e.interrupted=true;g.action({type:'wait'});expect(e.x).toBe(7);expect(e.interrupted).toBe(false);e.hp=1;e.bleeding=1;const xp=g.state.player.xp;g.action({type:'wait'});expect(e.hp).toBe(0);expect(g.state.player.xp).toBe(xp+e.xp);expect(e.actions).toBe(2);expect(e.x).toBe(7);
 });
 it('returns around blockers without stepping onto the player or a living enemy',()=>{
 const g=arena('rat',{x:7,y:5},{x:8,y:5}),e=g.state.enemies[0];g.state.map[5][6]='#';const other=g.makeEnemy('rat',{x:7,y:4},1,2);other.range=0;g.state.enemies.push(other);g.action({type:'wait'});expect(e.x===other.x&&e.y===other.y).toBe(false);expect(g.state.map[e.y][e.x]).not.toBe('#');expect(e.x===g.state.player.x&&e.y===g.state.player.y).toBe(false);
 });
});
describe('danger pocket cues',()=>{
 it('reports only living owners and deduplicates shared visible territories',()=>{
 const g=arena('rat',{x:5,y:5},{x:6,y:5}),e=g.state.enemies[0];expect(dangerAt(g.state)).toBe(e.territory);g.state.enemies.push({...e,id:3,x:5,y:6});g.refresh();expect(visibleDangerPockets(g.state)).toHaveLength(1);g.state.enemies.forEach(e=>e.hp=0);expect(dangerAt(g.state)).toBeNull();expect(visibleDangerPockets(g.state)).toHaveLength(0);
 });
 it('draws only visible walkable boundary marks and hides unseen owners',()=>{
 const g=arena('rat',{x:5,y:5},{x:6,y:5}),rects=[],graphics={fillStyle(){},fillRect(...args){rects.push(args);}};
 g.state.visible=new Set([key(3,5),key(5,3),key(7,5)]);drawDangerPockets(graphics,g.state);expect(rects).toHaveLength(0);
 g.state.visible.add(key(5,5));g.state.map[3][5]='#';drawDangerPockets(graphics,g.state);expect(rects).toHaveLength(2);expect(rects.map(r=>[r[0],r[1]])).toEqual([[3*24+10,5*24+11],[7*24+10,5*24+11]]);
 });
});
