import {SeamlessExpedition} from './seamless-expedition.js';
import {Expedition} from './expedition.js';
import {TurnManager} from './turn-manager.js';
import {Random} from './random.js';
import {createSurfaceMap} from './surface-map.js';
export const SAVE_KEY='wildlands.run.v1';
const VERSION=1,MAX_BYTES=8*1024*1024;
// A reference graph preserves equipped inventory objects, quest/event links,
// cached areas, Maps/Sets and the independent RNG streams without constructors.
export function encodeRun(game){
 if(game.state.status!=='playing')throw Error('This run has ended.');
 game.cacheCurrentCrypt?.();const seen=new Map(),nodes=[];
 const proxyMaps=new Set();if(game.surfaceChunks){if(game.state.seamless){proxyMaps.add(game.state.map);proxyMaps.add(game.state.baseMap);}if(game.surfaceSnapshot){proxyMaps.add(game.surfaceSnapshot.map);proxyMaps.add(game.surfaceSnapshot.baseMap);}}
 function value(v){
  if(v===undefined)return {u:1};if(v===null||typeof v!=='object')return v;
  if(proxyMaps.has(v))return null;
  if(seen.has(v))return {r:seen.get(v)};const id=nodes.length;seen.set(v,id);nodes.push(null);
  let node;if(v instanceof Map)node={t:'map',v:[...v].map(([k,v])=>[value(k),value(v)])};
  else if(v instanceof Set)node={t:'set',v:[...v].map(value)};
  else if(v instanceof Random)node={t:'rng',v:v.seed};
  else if(Array.isArray(v))node={t:'array',v:v.map(value)};
  else node={t:'object',v:Object.entries(v).filter(([k,v])=>typeof v!=='function'&&!['turns','interactionTarget'].includes(k)).map(([k,v])=>[k,value(v)])};
  nodes[id]=node;return {r:id};
 }
 const root=value(game),text=JSON.stringify({version:VERSION,mode:game instanceof SeamlessExpedition?'world':'classic',root,nodes});
 if(text.length>MAX_BYTES)throw Error('This run is too large to save on this device.');return text;
}
export function decodeRun(text){
 if(typeof text!=='string'||text.length>MAX_BYTES)throw Error('Invalid save size.');
 const data=JSON.parse(text);if(data.version!==VERSION||!['world','classic'].includes(data.mode)||!Array.isArray(data.nodes)||data.nodes.length>200000)throw Error('Unsupported or damaged save.');
 const objects=data.nodes.map(n=>{if(!n||!['map','set','rng','array','object'].includes(n.t))throw Error('Invalid save entry.');return n.t==='map'?new Map():n.t==='set'?new Set():n.t==='rng'?new Random(n.v):n.t==='array'?[]:{};});
 const read=v=>{if(v===null||typeof v!=='object')return v;if(v.u===1)return undefined;if(!Number.isInteger(v.r)||v.r<0||v.r>=objects.length)throw Error('Invalid save reference.');return objects[v.r];};
 for(let i=0;i<objects.length;i++){const n=data.nodes[i],o=objects[i];if(n.t==='rng')continue;if(!Array.isArray(n.v))throw Error('Invalid save values.');
  if(n.t==='array')for(const v of n.v)o.push(read(v));
  else if(n.t==='set')for(const v of n.v)o.add(read(v));
  else for(const [k,v]of n.v){if(n.t==='map')o.set(read(k),read(v));else{if(typeof k!=='string'||['__proto__','constructor','prototype'].includes(k))throw Error('Invalid save key.');o[k]=read(v);}}
 }
 const g=read(data.root);if(!g?.state||g.state.status!=='playing'||!(g.state.player?.hp>0)||!Number.isInteger(g.state.turn)||!(g.quests instanceof Map)||!g.location||!Array.isArray(g.state.player.inventory)||!(g.rng instanceof Random)||!(g.combatRng instanceof Random))throw Error('This run cannot be resumed.');
 Object.setPrototypeOf(g,data.mode==='world'?SeamlessExpedition.prototype:Expedition.prototype);g.turns=new TurnManager(g);g.interactionTarget=null;
 if(data.mode==='world'){
  if(!(g.surfaceChunks instanceof Map)||!g.surfaceChunks.size||!(g.visitedSurface instanceof Set))throw Error('Missing world data.');
  const map=createSurfaceMap(g.surfaceChunks),baseMap=createSurfaceMap(g.surfaceChunks,'baseMap');
  if(g.surfaceSnapshot)Object.assign(g.surfaceSnapshot,{map,baseMap});
  if(g.state.seamless)Object.assign(g.state,{map,baseMap,chartedRegions:g.surveyedRegions});
  else if(g.location.kind!=='crypt'||!g.surfaceSnapshot||!g.cryptReturn)throw Error('Missing dungeon return point.');
 }
 const p=g.state.player;if(!Number.isInteger(p.x)||!Number.isInteger(p.y)||!g.state.map?.[p.y]?.[p.x])throw Error('Invalid player position.');
 g.state.enemyEffects=[];g.refresh();return g;
}
export class RunStorage{
 constructor(storage){this.storage=storage;this.error='';}
 save(game){try{if(game.state.status!=='playing')this.storage.removeItem(SAVE_KEY);else this.storage.setItem(SAVE_KEY,encodeRun(game));this.error='';return true;}catch(e){this.error=e.message;return false;}}
 load(){try{const text=this.storage.getItem(SAVE_KEY);this.error='';return text?decodeRun(text):null;}catch(e){this.error='Saved run could not be loaded. '+e.message;return null;}}
 clear(){try{this.storage.removeItem(SAVE_KEY);this.error='';return true;}catch(e){this.error=e.message;return false;}}
}
