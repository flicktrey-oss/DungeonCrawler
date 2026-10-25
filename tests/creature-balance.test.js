import {it,expect} from 'vitest';
import {SeamlessExpedition} from '../src/game/seamless-expedition.js';
import {Expedition} from '../src/game/expedition.js';
import {generateWorldRegion,biomeAt,worldId} from '../src/game/world.js';
import {applyVariant,applyWorldVariants,VARIANTS} from '../src/game/creature-variants.js';
import {trailDistance} from '../src/game/marsh.js';
import {actCreature,describeCreature} from '../src/game/enemy-actions.js';
import {enemyStats} from '../src/game/enemy-stats.js';
import {attack,defense,shortSword,travelGear} from '../src/game/items.js';
import {encodeRun,decodeRun} from '../src/game/save.js';
import {creatureIndexKey,recordDiscovery} from '../src/game/quality.js';
const mountain=seed=>{for(let x=-5;x<=5;x++)for(let y=-5;y<=5;y++)if(biomeAt(x,y,seed)==='highlands')return {x,y};};
it('provides at least four lighter mountain-trail creatures, keeping ridge guards away from main trails across seeds and visits',()=>{
 for(let seed=1;seed<=60;seed++){const {x,y}=mountain(seed);for(const visit of [0,1]){const d=generateWorldRegion(seed,x,y,visit),ordinary=d.spawns.filter(e=>['goat','wolf'].includes(e.kind)&&!e.eventId),trail=ordinary.filter(e=>e.foothill),ridge=ordinary.filter(e=>!e.foothill);expect(ordinary).toHaveLength(7);expect(trail.length).toBeGreaterThanOrEqual(4);for(const e of trail){expect(e.danger).toBe(3);expect(e.territory).toBeUndefined();}for(const e of ridge){expect(trailDistance(e)).toBeGreaterThanOrEqual(6);expect(e.territory.radius).toBe(3);expect(e.danger).toBe(6);}}}
});
it('lets a prepared level-four loadout damage mountain trail creatures without requiring tier-three gear',()=>{
 const g=new Expedition(5),p=g.state.player;Object.assign(p,{level:4,attack:4,defense:1,weapon:shortSword(),armor:travelGear('armor',1)});for(const kind of ['goat','wolf']){const foe=g.makeEnemy(kind,{x:5,y:5,foothill:true},3,0,'highlands');expect(attack(p)-foe.defense).toBeGreaterThanOrEqual(3);expect(foe.attack-defense(p)).toBeLessThanOrEqual(4);expect(foe.lootDanger).toBe(3);}const ridge=g.makeEnemy('goat',{x:8,y:8},6,1,'highlands');expect(ridge.defense).toBe(2);expect(ridge.attack).toBe(11);expect(ridge.maxHp).toBe(32);expect(ridge.lootDanger).toBe(6);
});
it('uses independent seeded variants with one modifier per region and no variants on trail prey, quests, bosses or renewable animals',()=>{
 let found=0;for(let seed=1;seed<=35;seed++){const g=new SeamlessExpedition(seed);for(const a of g.surfaceChunks.values()){const variants=a.enemies.filter(e=>e.variant);expect(variants.length).toBeLessThanOrEqual(1);for(const e of variants){found++;expect(e.miniboss||e.questKey||e.questId||e.eventId||e.habitatId||e.foothill).toBeFalsy();expect(trailDistance({x:e.x-a.rx*40,y:e.y-a.ry*30})).toBeGreaterThanOrEqual(4);expect(VARIANTS[e.variant]).toBeTruthy();}const n=variants.length;applyWorldVariants(g,a);expect(a.enemies.filter(e=>e.variant)).toHaveLength(n);}const repeat=new SeamlessExpedition(seed);expect(g.state.enemies.filter(e=>e.variant).map(e=>[e.name,e.hp,e.attack,e.defense])).toEqual(repeat.state.enemies.filter(e=>e.variant).map(e=>[e.name,e.hp,e.attack,e.defense]));}expect(found).toBeGreaterThan(30);
});
it('adds modest visible bonuses, extra XP and descriptions without stacking modifiers',()=>{
 const g=new Expedition(5);for(const variant of Object.keys(VARIANTS)){const e=g.makeEnemy('rat',{x:8,y:8},1,1),base={...e};applyVariant(e,variant);expect(e.xp).toBe(3);expect(e.maxHp).toBe(base.maxHp+2);expect(e.name).toContain(VARIANTS[variant].label);expect(describeCreature(e)).toContain(VARIANTS[variant].label);expect(e.attack).toBe(base.attack+(variant==='veteran'?1:0));expect(e.defense).toBe(base.defense+(variant==='armored'?1:0));const stats={...e};applyVariant(e,'veteran');expect(e).toEqual(stats);}
});
it('a stalker winds up, can be dodged, recovers, and takes exactly one action per completed player turn',()=>{
 const g=new Expedition(5),s=g.state;s.map=Array.from({length:12},()=>Array(12).fill('.'));s.baseMap=s.map;Object.assign(s.player,{x:5,y:5,hp:32});g.enemyTarget=()=>s.player;const e=applyVariant(g.makeEnemy('rat',{x:5,y:3},1,99),'stalker');s.enemies=[e];g.refresh();for(let i=0;i<10;i++)g.refresh();expect(e.actions).toBe(0);g.action({type:'wait'});expect(e.intent.kind).toBe('charge');expect(e.intent.tiles).toContainEqual({x:5,y:5});expect(e.actions).toBe(1);g.action({type:'move',dx:1,dy:0});expect(s.player.hp).toBe(32);expect(e.recovering).toBe(true);expect(e.actions).toBe(2);const point={x:e.x,y:e.y};g.action({type:'wait'});expect(e.recovering).toBe(false);expect({x:e.x,y:e.y}).toEqual(point);expect(e.actions).toBe(3);
});
it('an armored creature waits on its slow phase but resolves an already marked attack on the next phase',()=>{
 const g=new Expedition(5),s=g.state;s.map=Array.from({length:12},()=>Array(12).fill('.'));s.baseMap=s.map;Object.assign(s.player,{x:5,y:5});g.enemyTarget=()=>s.player;const e=applyVariant(g.makeEnemy('beetle',{x:5,y:3},1,1),'armored');s.enemies=[e];g.refresh();g.action({type:'wait'});expect(e.intent.kind).toBe('spit');g.action({type:'move',dx:1,dy:0});expect(e.intent).toBeNull();expect(e.actions).toBe(2);expect(s.player.hp).toBe(32);
});
it('saves variant identity and records separate journal entries for variants and trail creatures',()=>{
 const g=new SeamlessExpedition(5),e=applyVariant(g.makeEnemy('rat',{x:21,y:15},1,'test'),'stalker');g.state.enemies.push(e);g.refresh();recordDiscovery(g);expect(g.creatureIndex.get(creatureIndexKey(e)).variant).toBe('stalker');const r=decodeRun(encodeRun(g)),saved=r.state.enemies.find(e=>e.id==='test');expect(saved.variant).toBe('stalker');expect(saved.hp).toBe(e.hp);expect(creatureIndexKey(g.makeEnemy('goat',{x:8,y:8,foothill:true},3,'trail'))).toBe('goat:foothill');
});
it('updates older retained mountain creatures without moving them, reviving deaths, resetting the world or touching the player',()=>{
 const g=new SeamlessExpedition(5),{x,y}=mountain(5),a=g.loadChunk(x,y),eligible=a.enemies.filter(e=>e.kind==='goat'&&!e.miniboss&&!e.variant&&!e.eventId);expect(eligible.length).toBeGreaterThan(0);const alive=eligible[0];Object.assign(alive,{maxHp:37,hp:18,attack:14,defense:5});const dead=eligible[1];if(dead)dead.hp=0;a.recommended=8;delete g.combatBalance;const position={x:alive.x,y:alive.y},player={...g.state.player},count=g.state.enemies.length;const r=decodeRun(encodeRun(g)),updated=r.state.enemies.find(e=>e.id===alive.id);expect(updated).toMatchObject(position);expect(updated.defense).toBeLessThanOrEqual(2);expect(updated.hp/updated.maxHp).toBeLessThan(.56);expect(updated.hp).toBeGreaterThan(0);expect(r.state.player).toEqual(player);expect(r.state.enemies).toHaveLength(count);expect(r.combatBalance).toBe(1);expect(r.surfaceChunks.get(worldId(x,y)).recommended).toBe(6);if(dead)expect(r.state.enemies.find(e=>e.id===dead.id).hp).toBe(0);const copy={...updated};r.upgradeCombatBalance();expect(updated).toEqual(copy);
});
it('a normally equipped level-four adventurer can defeat a trail ram without consuming healing',()=>{
 for(let seed=1;seed<=20;seed++){const g=new Expedition(seed),s=g.state;s.map=Array.from({length:12},()=>Array(12).fill('.'));s.baseMap=s.map;s.enemies=[g.makeEnemy('goat',{x:5,y:4,foothill:true},3,'trail')];s.items=[];s.encounters=[];Object.assign(s.player,{x:5,y:5,hp:41,maxHp:41,level:4,attack:5,defense:2,weapon:shortSword(),armor:travelGear('armor',1)});g.refresh();for(let turn=0;turn<10&&s.enemies[0].hp>0&&s.status==='playing';turn++)g.action({type:'move',dx:0,dy:-1});expect(s.enemies[0].hp).toBeLessThanOrEqual(0);expect(s.status).toBe('playing');expect(s.player.hp).toBeGreaterThanOrEqual(24);}
});

it('does not mark a stalker lunge through a blocking creature',()=>{
 const g=new Expedition(5),s=g.state;s.map=Array.from({length:12},()=>Array(12).fill('.'));s.baseMap=s.map;Object.assign(s.player,{x:5,y:5});g.enemyTarget=()=>s.player;const e=applyVariant(g.makeEnemy('rat',{x:5,y:3},1,99),'stalker');s.enemies=[e,g.makeEnemy('rat',{x:5,y:4},1,100)];s.turn=1;actCreature(g,e);expect(e.intent).toBeUndefined();expect(e.actions).toBe(1);
});
