import {describe,it,expect} from 'vitest';
import {SeamlessExpedition} from '../src/game/seamless-expedition.js';
import {Expedition} from '../src/game/expedition.js';
import {encodeRun,decodeRun,RunStorage,SAVE_KEY} from '../src/game/save.js';
import {equipment} from '../src/game/items.js';
import {assignQuick,quickItem} from '../src/game/quality.js';
import {walkable,key} from '../src/game/dungeon.js';
const position=(g,p)=>{Object.assign(g.state.player,{x:p.x,y:p.y});if(g.state.seamless)g.syncArea();g.refresh();};
function entrance(g){return [...g.surfaceChunks.values()].find(a=>a.entrance)?.entrance;}
function enter(g){const e=entrance(g);expect(e).toBeTruthy();position(g,e);expect(g.action({type:'descend'})).toBe(true);return e;}
function immortal(g){Object.assign(g.state.player,{hp:999,maxHp:999});return g;}
describe('connected crypts',()=>{
 it('enters from global negative coordinates and returns to the same surface map without changing loot or residents',()=>{
  const g=new SeamlessExpedition(5),s=g.state,map=s.map,item={kind:'gold',name:'Test gold',amount:3,x:20,y:15};s.items.push(item);const e=entrance(g);position(g,e);const before=s.enemies.map(e=>[e.id,e.x,e.y,e.hp]),known=s.explored;
  enter(g);expect(g.location.kind).toBe('crypt');expect(s.seamless).toBe(false);expect(s.turn).toBe(1);expect(s.enemies.every(e=>e.actions===0)).toBe(true);expect(s.map===map).toBe(false);expect(g.action({type:'ascend'})).toBe(true);expect(s.map===map).toBe(true);expect(s.items.includes(item)).toBe(true);expect(s.explored===known).toBe(true);expect(s.enemies.map(e=>[e.id,e.x,e.y,e.hp])).toEqual(before);expect(s.player.x).toBe(e.x);expect(s.player.y).toBe(e.y);expect(s.turn).toBe(2);
 });
 it('remembers both dungeon floors, damage, killed enemies, opened chests and dropped items across return visits',()=>{
  const g=immortal(new SeamlessExpedition(5));enter(g);const first=g.state.map,enemy=g.state.enemies[0];enemy.hp=0;g.state.items.splice(0,1);const drop={kind:'gold',name:'Dropped gold',amount:4,...g.state.upstairs};g.state.items.push(drop);position(g,g.state.stairs);expect(g.action({type:'descend'})).toBe(true);expect(g.location.depth).toBe(2);const second=g.state.map;g.state.enemies[0].hp=1;const id=g.state.enemies[0].id;expect(g.action({type:'ascend'})).toBe(true);expect(g.state.map===first).toBe(true);expect(g.state.enemies.find(e=>e.id===enemy.id).hp).toBe(0);position(g,g.state.upstairs);g.action({type:'ascend'});g.action({type:'descend'});expect(g.state.items).toContain(drop);position(g,g.state.stairs);g.action({type:'descend'});expect(g.state.map===second).toBe(true);expect(g.state.enemies.find(e=>e.id===id).hp).toBe(1);
 });
 it('keeps habitats frozen underground and does not regenerate surface enemies on return',()=>{
  const g=new SeamlessExpedition(5),h=g.state.encounters.find(e=>e.type==='habitat');h.nextSpawn=10;position(g,entrance(g));const count=g.state.enemies.length;enter(g);g.state.enemies=[];for(let i=0;i<40;i++)g.action({type:'wait'});g.action({type:'ascend'});expect(g.state.enemies).toHaveLength(count);expect(h.nextSpawn).toBe(10);
 });
 it('allows invalid stairs for no turn and stops following companions being left far behind',()=>{
  const g=new SeamlessExpedition(5);expect(g.action({type:'descend'})).toBe(false);expect(g.state.turn).toBe(0);const c=g.story.prince;g.story.accepted=true;c.mode='follow';position(g,entrance(g));expect(g.action({type:'descend'})).toBe(false);expect(g.location.kind).toBe('world');
 });
 it('takes a nearby following prince underground, preserves Stay, and retrieves him without teleporting from another floor',()=>{
  const g=new SeamlessExpedition(5),c=g.story.prince;position(g,entrance(g));Object.assign(c,{x:g.state.player.x-1,y:g.state.player.y,mode:'follow'});g.story.accepted=true;expect(g.action({type:'descend'})).toBe(true);expect(c.locationId).toBe(g.location.id);expect(c.depth).toBe(1);expect(g.princeHere()).toBe(c);c.mode='stay';const point={x:c.x,y:c.y};expect(g.action({type:'ascend'})).toBe(true);expect(g.princeHere()).toBeNull();g.action({type:'wait'});expect(c.locationId.startsWith('crypt:')).toBe(true);expect(c.x).toBe(point.x);expect(g.state.surfaceMarkers.find(m=>m.label==='A').y).toBe(g.cryptReturn.y);g.action({type:'descend'});expect(g.princeHere()).toBe(c);expect(c.mode).toBe('stay');
 });
});
describe('local run persistence',()=>{
 it('round-trips shared gear, quick slots, quests, discovery, habitat RNG and deterministic combat without advancing a turn',()=>{
  const g=new SeamlessExpedition(5),p=g.state.player,item=equipment('weapon',1);p.inventory.push(item);p.weapon=item;assignQuick(g,1,p.inventory.length-1);const event=g.state.encounters.find(e=>e.quest);event.quest.accepted=true;g.quests.set(event.quest.id,event.quest);g.action({type:'mindVision'});const snapshot=encodeRun(g),r=decodeRun(snapshot),rp=r.state.player;
  expect(r.state.turn).toBe(g.state.turn);expect(rp.weapon).toBe(rp.inventory.at(-1));expect(quickItem(r,1)).toBe(rp.weapon);const restoredEvent=r.state.encounters.find(e=>e.id===event.id);expect(restoredEvent.quest).toBe(r.quests.get(event.quest.id));expect(r.state.explored).toEqual(g.state.explored);expect(r.state.mindVisionUntil).toBe(g.state.mindVisionUntil);expect(walkable(r.state.map,20,15)).toBe(true);
  for(let i=0;i<8;i++){expect(r.rng.next()).toBe(g.rng.next());expect(r.combatRng.next()).toBe(g.combatRng.next());}const h=g.state.encounters.find(e=>e.type==='habitat'),rh=r.state.encounters.find(e=>e.id===h.id);expect(rh.rng.next()).toBe(h.rng.next());g.action({type:'wait'});r.action({type:'wait'});expect(r.state.player).toEqual(g.state.player);expect(r.state.enemies).toEqual(g.state.enemies);
 });
 it('resumes inside depth two and returns through remembered crypts to the original expanding world',()=>{
  const g=immortal(new SeamlessExpedition(5));enter(g);position(g,g.state.stairs);g.action({type:'descend'});g.state.items.push({kind:'gold',name:'Saved gold',amount:7,...g.state.upstairs});const r=decodeRun(encodeRun(g));expect(r.location.depth).toBe(2);expect(r.state.turn).toBe(g.state.turn);expect(r.state.items.some(i=>i.name==='Saved gold')).toBe(true);expect(r.action({type:'ascend'})).toBe(true);position(r,r.state.upstairs);expect(r.action({type:'ascend'})).toBe(true);expect(r.state.seamless).toBe(true);expect(r.state.map[r.cryptReturn.y][r.cryptReturn.x]).toBe('D');expect(r.state.explored.has(key(r.cryptReturn.x,r.cryptReturn.y))).toBe(true);r.action({type:'descend'});position(r,r.state.stairs);r.action({type:'descend'});expect(r.state.items.some(i=>i.name==='Saved gold')).toBe(true);
 });
 it('supports classic expeditions without changing their map model',()=>{const g=new Expedition(5);g.action({type:'wait'});const r=decodeRun(encodeRun(g));expect(r).toBeInstanceOf(Expedition);expect(r).not.toBeInstanceOf(SeamlessExpedition);expect(r.action({type:'wait'})).toBe(true);expect(r.state.turn).toBe(2);});
 it('clears dead runs and reports damaged, unsupported and unavailable storage without crashing',()=>{
  const values=new Map(),store=new RunStorage({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}),g=new SeamlessExpedition(5);expect(store.save(g)).toBe(true);expect(store.load().state.turn).toBe(0);g.state.status='dead';expect(store.save(g)).toBe(true);expect(store.load()).toBeNull();values.set(SAVE_KEY,'{damaged');expect(store.load()).toBeNull();expect(store.error).toContain('could not be loaded');values.set(SAVE_KEY,JSON.stringify({version:99}));expect(store.load()).toBeNull();const blocked=new RunStorage({getItem(){throw Error('Blocked');},setItem(){throw Error('Quota exceeded');},removeItem(){throw Error('Blocked');}});expect(blocked.save(new SeamlessExpedition(5))).toBe(false);expect(blocked.error).toContain('Quota');expect(blocked.load()).toBeNull();
 });
 it('rejects a forged ended run, invalid references and prototype-changing save keys',()=>{
  const g=new SeamlessExpedition(5),data=JSON.parse(encodeRun(g));data.nodes.push({t:'object',v:[['__proto__',{r:0}]]});expect(()=>decodeRun(JSON.stringify(data))).toThrow();expect({}.polluted).toBeUndefined();const ended=JSON.parse(encodeRun(g));const state=ended.nodes.find(n=>n.t==='object'&&n.v.some(([k,v])=>k==='status'&&v==='playing'));state.v.find(([k])=>k==='status')[1]='dead';expect(()=>decodeRun(JSON.stringify(ended))).toThrow();
 });
});
