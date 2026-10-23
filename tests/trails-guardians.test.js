import {describe,it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import {generateWorldRegion,biomeAt} from '../src/game/world.js';
import {trailDistance} from '../src/game/marsh.js';
import {insideTerritory} from '../src/game/danger.js';
import {Random} from '../src/game/random.js';
import {minibossReward,MINIBOSSES} from '../src/game/minibosses.js';
import {cryptRelic,ITEM_CATALOG} from '../src/game/loot.js';
import {shortSword,attack,defense,travelGear,reedAmulet} from '../src/game/items.js';
import {characterDetails} from '../src/character-inspection.js';
import {drawCreature,drawMiniboss} from '../src/render/creature-sprites.js';
function arena(biome){const g=new Expedition(7),s=g.state;s.map=Array.from({length:30},()=>Array(40).fill('.'));Object.assign(s.player,{x:20,y:15,hp:500,maxHp:500});s.items=[];s.enemies=[g.makeEnemy('elite',{x:20,y:12,eventId:'test-den'},({forest:1,marsh:3,highlands:6})[biome],0,biome)];s.encounters=[{id:'test-den',type:'den',used:false}];s.transition=false;g.refresh();return g;}
const wait=g=>g.action({type:'wait'});
describe('a usable marsh foothold without flattening its danger',()=>{
 it('places weak trail prey and keeps deep-pool owners away from the main trails across visits',()=>{
  let regions=0,pools=0;
  for(let seed=1;seed<=25;seed++)for(let x=-2;x<=2;x++){
   if(biomeAt(x,2,seed)!=='marsh')continue;
   for(let visit=0;visit<3;visit++){
    const d=generateWorldRegion(seed,x,2,visit),locals=d.spawns.filter(e=>e.zone);regions++;
    expect(locals).toHaveLength(7);expect(locals.filter(e=>e.zone==='marsh fringe').length).toBeGreaterThanOrEqual(4);
    for(const e of locals){if(e.zone==='marsh fringe'){expect(e.kind).toBe('pondFrog');expect(e.danger).toBe(1);}else{pools++;expect(trailDistance(e)).toBeGreaterThanOrEqual(6);expect(e.territory.radius).toBe(3);expect(e.danger).toBe(3);}}
    expect(new Set(d.spawns.map(e=>`${e.x},${e.y}`)).size).toBe(d.spawns.length);
   }
  }
  expect(regions).toBeGreaterThan(20);expect(pools).toBeGreaterThan(20);
 });
 it('gives a modest level-four loadout a survivable foothold while the deep marsh still hurts',()=>{
  const g=new Expedition(7),p=g.state.player;Object.assign(p,{level:4,attack:5,defense:1,weapon:shortSword(),armor:travelGear('armor',1),amulet:reedAmulet()});
  const fringe=g.makeEnemy('pondFrog',{x:5,y:5},1,0),deep=g.makeEnemy('frog',{x:8,y:8},3,1),mountain=g.makeEnemy('goat',{x:9,y:9},6,2);
  expect(attack(p)-fringe.defense).toBeGreaterThanOrEqual(fringe.hp);expect(fringe.attack-defense(p)).toBeLessThanOrEqual(1);
  expect(deep.attack-defense(p)).toBeGreaterThanOrEqual(4);expect(mountain.attack-defense(p)).toBeGreaterThan(deep.attack-defense(p));
 });
 it('prevents deep-pool creatures from chasing onto a trail',()=>{
  const g=arena('marsh'),s=g.state,p=s.player;s.enemies=[g.makeEnemy('frog',{x:10,y:8,territory:{x:10,y:8,radius:3,name:'Deep pool'}},3,0)];
  Object.assign(p,{x:20,y:8});for(let i=0;i<8;i++)wait(g);expect(p.hp).toBe(500);expect(insideTerritory(s.enemies[0].territory,s.enemies[0])).toBe(true);
 });
});
describe('three den owners and their decisions',()=>{
 it('uses three distinct identities, portraits and inspection instructions',()=>{
  const names=new Set(),art=new Set();for(const biome of ['forest','marsh','highlands']){
   const g=arena(biome),e=g.state.enemies[0],commands=[],brush={fillStyle:(...a)=>commands.push(a),fillRect:(...a)=>commands.push(a),fillEllipse:(...a)=>commands.push(a),fillTriangle:(...a)=>commands.push(a)};
   names.add(e.name);drawCreature(brush,0,0,e.kind);drawMiniboss(brush,0,0,e.name);art.add(JSON.stringify(commands));expect(characterDetails(g,e).ability).toBe(MINIBOSSES[e.miniboss].description);
  }expect(names.size).toBe(3);expect(art.size).toBe(3);
 });
 it('Reedmaw winds up a three-tile tongue and leaves a recovery action after a dodge',()=>{
  const g=arena('marsh'),e=g.state.enemies[0];wait(g);expect(e.intent).toMatchObject({kind:'tongue'});expect(e.intent.tiles).toContainEqual({x:20,y:15});g.action({type:'move',dx:1,dy:0});expect(g.state.player.hp).toBe(500);expect(e.recovering).toBe(true);const pos={x:e.x,y:e.y};wait(g);expect({x:e.x,y:e.y}).toEqual(pos);expect(e.actions).toBe(3);
 });
 it('Cairnhorn marks all eight neighbors and rewards retreat rather than a sideways dodge',()=>{
  const g=arena('highlands'),e=g.state.enemies[0];e.y=14;wait(g);expect(e.intent.kind).toBe('stomp');expect(e.intent.tiles).toHaveLength(8);
  g.action({type:'move',dx:1,dy:0});expect(g.state.player.hp).toBeLessThan(500);expect(e.recovering).toBe(true);
  const h=arena('highlands');h.state.enemies[0].y=14;wait(h);h.action({type:'move',dx:0,dy:1});expect(h.state.player.hp).toBe(500);
 });
 it('keeps warnings frozen after a wall attempt and prevents a slain owner acting',()=>{
  const g=arena('marsh'),e=g.state.enemies[0];wait(g);g.state.map[15][21]='#';expect(g.action({type:'move',dx:1,dy:0})).toBe(false);expect(e.actions).toBe(1);e.hp=1;g.state.player.weapon={reach:3,bonus:0};expect(g.action({type:'reach',x:e.x,y:e.y})).toBe(true);expect(e.actions).toBe(1);expect(g.state.player.hp).toBe(500);
 });
 it('guarantees modified, themed rewards with useful upgrades more common than exceptional ones',()=>{
  const counts={};for(const id of Object.keys(MINIBOSSES))for(let seed=1;seed<=200;seed++){
   const reward=minibossReward(new Random(seed),id);expect(reward.rarity).not.toBe('ordinary');counts[reward.rarity]=(counts[reward.rarity]??0)+1;
   expect(({bristleback:['weapon','boots'],reedmaw:['weapon','offhand'],cairn:['armor','ring','weapon']})[id]).toContain(reward.kind);
  }expect(counts.useful).toBeGreaterThan(counts.powerful);expect(counts.powerful).toBeGreaterThan(counts.exceptional);
 });
 it('spawns one hoard on the den owner’s defeat, with a locked reward on bag failures',()=>{
  const g=arena('forest'),e=g.state.enemies[0];e.hp=0;g.kill(e);const chest=g.state.items.find(i=>i.kind==='chest');expect(chest.reward.rarity).not.toBe('ordinary');expect(g.state.encounters[0].used).toBe(true);
  g.state.items=[chest];Object.assign(g.state.player,{x:chest.x,y:chest.y});const before=structuredClone(chest.reward);g.state.player.inventory=Array.from({length:100},()=>({kind:'potion',size:[1,1],name:'Potion'}));expect(g.action({type:'pickup'})).toBe(false);expect(chest.reward).toEqual(before);
 });
});
describe('a reason to finish a crypt',()=>{
 it('awards dungeon-only relics with clear equipment tradeoffs',()=>{
  const ids=new Set();for(let seed=1;seed<60;seed++){const item=cryptRelic(new Random(seed));ids.add(item.id);expect(item.rarity).toBe('powerful');expect(item.dungeonExclusive).toBe(true);expect(ITEM_CATALOG.some(e=>e.id===item.id)).toBe(false);expect(item.description.length).toBeGreaterThan(30);}expect(ids.size).toBe(3);
 });
 it('preserves every unclaimed chest and its exact reward when leaving and returning',()=>{
  const g=new Expedition(3);g.visitCrypt(1,0,2);const rewards=structuredClone(g.state.items),map=structuredClone(g.state.map);g.visitWorld(0,0);g.visitCrypt(1,0,2);expect(g.state.items).toEqual(rewards);expect(g.state.map).toEqual(map);
 });
 it('awards the Warden’s first-clear relic once per run while enemies still respawn',()=>{
  const g=new Expedition(3);g.visitCrypt(1,0,2);let w=g.state.enemies.find(e=>e.kind==='guardian');w.hp=0;g.kill(w);expect(g.state.cryptsCleared).toBe(1);const relic=g.state.items.find(i=>i.name==='Warden’s reliquary');expect(relic.reward.dungeonExclusive).toBe(true);
  // Claim the prize without nearby enemies attacking in this rule fixture.
  g.state.enemies.forEach(e=>e.hp=0);Object.assign(g.state.player,{x:relic.x,y:relic.y});expect(g.action({type:'pickup'})).toBe(true);
  g.visitWorld(0,0);g.visitCrypt(1,0,2);expect(g.state.items.some(i=>i.name==='Warden’s reliquary')).toBe(false);w=g.state.enemies.find(e=>e.kind==='guardian');expect(w.hp).toBeGreaterThan(0);w.hp=0;g.kill(w);expect(g.state.cryptsCleared).toBe(1);expect(g.state.items.some(i=>i.name==='Warden’s reliquary')).toBe(false);
 });
 it('keeps looted floor supplies gone after revisiting and resets them in a new run',()=>{
  const g=new Expedition(5);g.visitCrypt(1,0,1);g.state.enemies=[];const item=g.state.items.find(i=>i.kind==='potion');Object.assign(g.state.player,{x:item.x,y:item.y});expect(g.action({type:'pickup'})).toBe(true);g.visitWorld(0,0);g.visitCrypt(1,0,1);expect(g.state.items.some(i=>i.kind==='potion')).toBe(false);const h=new Expedition(5);h.visitCrypt(1,0,1);expect(h.state.items.some(i=>i.kind==='potion')).toBe(true);
 });
});

it('records a named miniboss separately from ordinary frogs, including its kill count',()=>{
 const g=arena('marsh'),boss=g.state.enemies[0];g.state.enemies.push(g.makeEnemy('frog',{x:21,y:15},3,1));g.refresh();expect(g.creatureIndex.get('frog:reedmaw').name).toBe(boss.name);expect(g.creatureIndex.get('frog').name).toBe('Mire frog');boss.hp=0;g.kill(boss);expect(g.creatureIndex.get('frog:reedmaw').kills).toBe(1);expect(g.creatureIndex.get('frog').kills).toBe(0);
});
it('does not spawn creatures on persistent crypt supplies when a floor repopulates',()=>{
 const g=new Expedition(9);g.visitCrypt(1,0,1);g.visitWorld(0,0);for(let i=0;i<8;i++){g.visitCrypt(1,0,1);for(const e of g.state.enemies)expect(g.state.items.some(item=>item.x===e.x&&item.y===e.y)).toBe(false);g.visitWorld(0,0);}
});
it('keeps the same-floor reward cache even during a direct floor reload',()=>{
 const g=new Expedition(9);g.visitCrypt(1,0,1);const items=structuredClone(g.state.items);g.state.explored.add('39,29');g.visitCrypt(1,0,1);expect(g.state.items).toEqual(items);expect(g.state.explored.has('39,29')).toBe(true);
});
