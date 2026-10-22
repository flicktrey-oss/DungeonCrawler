import {describe,it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import {startingForest} from '../src/game/world.js';
import {TRAILWARDEN} from '../src/game/quests.js';
import {walkable,key,directions} from '../src/game/dungeon.js';
import {settleInventory} from '../src/game/inventory.js';
import {potion} from '../src/game/items.js';
function stand(g,event){Object.assign(g.state.player,{x:event.x,y:event.y+(event.type==='villager'?1:0)});g.state.enemies.forEach(e=>e.range=0);g.state.transition=false;}
function fixture(kind){for(let seed=1;seed<=30;seed++){const g=new Expedition(seed),region=startingForest(seed);g.visitWorld(region.rx,region.ry);const event=g.state.encounters.find(e=>e.quest?.kind===kind&&!e.quest.camp);if(event){stand(g,event);return {g,q:event.quest,event};}}throw Error('Missing fixture '+kind);}
function slay(g,q){for(const enemy of g.state.enemies.filter(e=>e.questKey===q.id&&e.hp>0)){enemy.hp=0;g.kill(enemy);}}
describe('open world quest lifetime',()=>{
 it('offers a seeded varying camp goal and leaves the player free to ignore it',()=>{
 const kinds=new Set(),targets=new Set();for(let seed=1;seed<40;seed++){const g=new Expedition(seed),q=g.quests.get('trailwarden');kinds.add(q.kind);targets.add(key(q.region.rx,q.region.ry));expect(q.accepted).toBe(false);expect(g.state.enemies).toHaveLength(0);expect(g.state.map[TRAILWARDEN.y][TRAILWARDEN.x]).toBe('V');}
 expect(kinds.size).toBe(3);expect(targets.size).toBe(4);
 });
 it('preserves an accepted hunt, wounded target and giver while normal enemies respawn',()=>{
 const {g,q,event}=fixture('hunt');expect(g.action({type:'acceptQuest'})).toBe(true);
 const foe=g.state.enemies.find(e=>e.questKey===q.id);foe.hp-=2;const hp=foe.hp;g.state.enemies.find(e=>!e.questKey&&!e.questId&&!e.eventId).hp=0;
 g.visitWorld(0,0);g.visitWorld(q.region.rx,q.region.ry);expect(g.state.encounters.find(e=>e.quest?.id===q.id)).toMatchObject({x:event.x,y:event.y});expect(g.state.enemies.find(e=>e.questKey===q.id).hp).toBe(hp);
 expect(g.state.enemies.filter(e=>!e.questKey&&!e.questId&&!e.eventId).every(e=>e.hp>0)).toBe(true);
 slay(g,q);g.visitWorld(0,0);g.visitWorld(q.region.rx,q.region.ry);stand(g,event);expect(q.complete).toBe(true);expect(g.action({type:'claimQuest'})).toBe(true);expect(g.action({type:'claimQuest'})).toBe(false);
 });
 it('keeps frog kill progress and a completed reward when leaving before claiming',()=>{
 const {g,q,event}=fixture('frogs');g.action({type:'acceptQuest'});let e=g.state.enemies.find(e=>e.questId);e.hp=0;g.kill(e);
 g.visitWorld(0,0);g.visitWorld(q.region.rx,q.region.ry);expect(g.questRemaining()).toBe(2);for(const e of g.state.enemies.filter(e=>e.questId&&e.hp>0)){e.hp=0;g.kill(e);}
 g.visitWorld(0,0);g.visitWorld(q.region.rx,q.region.ry);stand(g,event);expect(g.action({type:'claimQuest'})).toBe(true);expect(q.claimed).toBe(true);g.visitWorld(0,0);g.visitWorld(q.region.rx,q.region.ry);stand(g,event);expect(g.action({type:'claimQuest'})).toBe(false);
 });
 it('supports several active quests with no expiry even after long idle and travel',()=>{
 const {g,q}=fixture('hunt');g.action({type:'acceptQuest'});g.visitWorld(0,0);stand(g,{...TRAILWARDEN,type:'villager'});g.action({type:'acceptQuest'});
 expect([...g.quests.values()].filter(q=>q.accepted)).toHaveLength(2);for(let i=0;i<150;i++)g.action({type:'wait'});expect(q.accepted).toBe(true);expect(q.claimed).toBe(false);
 expect(new Expedition(g.state.seed).quests.size).toBe(2);g.state.status='dead';expect(g.action({type:'claimQuest'})).toBe(false);
 });
 it('places camp objectives when the destination was visited before accepting',()=>{
 const g=new Expedition(3),q=g.quests.get('trailwarden');g.visitWorld(q.region.rx,q.region.ry);g.visitWorld(0,0);stand(g,{...TRAILWARDEN,type:'villager'});expect(g.action({type:'acceptQuest'})).toBe(true);g.visitWorld(q.region.rx,q.region.ry);expect(q.placed).toBe(true);
 expect([...g.state.enemies,...g.state.items,...g.state.encounters].some(e=>e.questKey===q.id||e.quest?.id===q.id)).toBe(true);
 });
 it('locks a reward when satchel space is insufficient and permits a later claim',()=>{
 const {g,q,event}=fixture('hunt');g.action({type:'acceptQuest'});slay(g,q);stand(g,event);g.state.player.inventory=Array.from({length:100},potion);settleInventory(g.state.player.inventory);
 const reward=structuredClone(q.reward),turn=g.state.turn;expect(g.action({type:'claimQuest'})).toBe(false);expect(g.state.turn).toBe(turn);expect(q.reward).toEqual(reward);expect(q.claimed).toBe(false);g.state.player.inventory=[];expect(g.action({type:'claimQuest'})).toBe(true);
 });
});
describe('distinct objectives',()=>{
 it('requires guards to be defeated, recovers a keepsake without satchel space, and preserves it on travel',()=>{
 const {g,q,event}=fixture('recovery');const token=g.state.items.find(e=>e.questKey===q.id);Object.assign(g.state.player,token);expect(g.action({type:'pickup'})).toBe(false);stand(g,event);g.action({type:'acceptQuest'});Object.assign(g.state.player,{x:token.x,y:token.y});expect(g.action({type:'pickup'})).toBe(false);
 slay(g,q);g.state.player.inventory=Array.from({length:100},potion);settleInventory(g.state.player.inventory);expect(g.action({type:'pickup'})).toBe(true);expect(q.complete).toBe(true);expect(g.state.player.inventory).toHaveLength(100);
 g.visitWorld(0,0);g.visitWorld(q.region.rx,q.region.ry);expect(g.state.items.some(e=>e.questKey===q.id)).toBe(false);expect(q.complete).toBe(true);
 });
 it('rekindles three stones once each, preserves partial progress and requires the sentinel kill',()=>{
 const {g,q,event}=fixture('ward');let stones=g.state.encounters.filter(e=>e.quest?.id===q.id&&e.wardIndex!==undefined);stand(g,stones[0]);expect(g.action({type:'activateWard'})).toBe(false);stand(g,event);g.action({type:'acceptQuest'});stand(g,stones[0]);expect(g.action({type:'activateWard'})).toBe(true);expect(g.action({type:'activateWard'})).toBe(false);
 g.visitWorld(0,0);g.visitWorld(q.region.rx,q.region.ry);expect(q.activated).toHaveLength(1);
 stones=g.state.encounters.filter(e=>e.quest?.id===q.id&&e.wardIndex!==undefined);for(const stone of stones.filter(e=>!e.used)){stand(g,stone);expect(g.action({type:'activateWard'})).toBe(true);}
 expect(q.complete).toBe(false);expect(g.state.enemies.find(e=>e.questKey===q.id).name).toBe('Briar Sentinel');slay(g,q);expect(q.complete).toBe(true);
 });
 it('places valid nonoverlapping quest targets and reachable givers across varied runs and revisits',()=>{
 for(let seed=1;seed<45;seed++){const g=new Expedition(seed);for(const rx of [1,2]){g.visitWorld(rx,0);const s=g.state,seen=new Set([key(20,15)]),queue=[{x:20,y:15}];for(let i=0;i<queue.length;i++)for(const[dx,dy]of directions){const x=queue[i].x+dx,y=queue[i].y+dy,k=key(x,y);if(walkable(s.map,x,y)&&!seen.has(k)){seen.add(k);queue.push({x,y});}}
 const positions=s.enemies.map(e=>key(e.x,e.y));expect(new Set(positions).size).toBe(positions.length);
 for(const e of s.enemies)expect(seen.has(key(e.x,e.y))).toBe(true);
 for(const e of s.encounters.filter(e=>e.quest&&e.type==='villager'))expect(directions.some(([dx,dy])=>seen.has(key(e.x+dx,e.y+dy)))).toBe(true);
 for(const e of s.encounters.filter(e=>e.quest&&e.wardIndex!==undefined))expect(seen.has(key(e.x,e.y))).toBe(true);
 }}
 });
});
describe('quest return safety',()=>{
 it('keeps regenerated ordinary enemies separate from persistent targets and NPCs',()=>{
 for(let seed=1;seed<=70;seed++){
 const g=new Expedition(seed),region=startingForest(seed);g.visitWorld(region.rx,region.ry);const event=g.state.encounters.find(e=>e.quest&&!e.quest.legacy);stand(g,event);g.action({type:'acceptQuest'});
 for(let visit=0;visit<3;visit++){g.visitWorld(0,0);g.visitWorld(event.quest.region.rx,event.quest.region.ry);const living=g.state.enemies.filter(e=>e.hp>0),occupied=living.map(e=>key(e.x,e.y));expect(new Set(occupied).size).toBe(occupied.length);for(const e of living){expect(walkable(g.state.map,e.x,e.y)).toBe(true);expect(e.x===g.state.player.x&&e.y===g.state.player.y).toBe(false);}}
 }
 });
 it('always places accepted camp objectives across varied starting worlds',()=>{
 for(let seed=1;seed<=150;seed++){const g=new Expedition(seed),q=g.quests.get('trailwarden');stand(g,{...TRAILWARDEN,type:'villager'});expect(g.action({type:'acceptQuest'})).toBe(true);g.visitWorld(q.region.rx,q.region.ry);expect(q.placed).toBe(true);}
 });
 it('completes a camp hunt and returns the once-only reward at camp after traveling elsewhere',()=>{
 let g,q;for(let seed=1;seed<30;seed++){const test=new Expedition(seed),offer=test.quests.get('trailwarden');if(offer.kind==='hunt'){g=test;q=offer;break;}}
 stand(g,{...TRAILWARDEN,type:'villager'});g.action({type:'acceptQuest'});g.visitWorld(q.region.rx,q.region.ry);slay(g,q);expect(q.complete).toBe(true);g.visitWorld(2,0);g.visitWorld(0,0);stand(g,{...TRAILWARDEN,type:'villager'});expect(g.action({type:'claimQuest'})).toBe(true);expect(g.action({type:'claimQuest'})).toBe(false);
 });
});
