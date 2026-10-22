import {Random} from './random.js';
import {regionSeed,worldId,generateWorldRegion} from './world.js';
import {walkable,key} from './dungeon.js';
import {potion} from './items.js';
import {addItem} from './inventory.js';
export const WOODLAND={
 herbalist:{name:'Nessa the Herbalist',description:'A traveling herbalist offers one tonic for 6 gold, or in exchange for one hunting trophy.'},
 traveler:{name:'A Wounded Traveler',description:'A stranded traveler needs an Ember tonic. Help them for 8 gold and their gratitude.'},
 milestone:{name:'Forgotten Milestone',description:'Weathered carvings may point toward a forgotten crypt. Read them to learn a region, without revealing its terrain.'}
};
export function addWoodland(g,data,rx,ry){
 if(data.home||data.biome!=='forest')return;
 const id=worldId(rx,ry);if(g.woodland.has(id))return;
 const rng=new Random(regionSeed(g.state.seed,rx,ry,'woodland-life'));
 if(rng.next()>=.5){g.woodland.set(id,null);return;}
 const used=new Set([...data.encounters,...data.enemies,...data.items,...data.scenery].map(e=>key(e.x,e.y))),sites=[];
 for(let y=5;y<25;y++)for(let x=5;x<35;x++)if(Math.abs(x-20)+Math.abs(y-15)>6&&!used.has(key(x,y))&&[-1,0,1].every(dy=>[-1,0,1].every(dx=>walkable(data.map,x+dx,y+dy))))sites.push({x,y});
 if(!sites.length){g.woodland.set(id,null);return;}
 const kind=rng.pick(Object.keys(WOODLAND)),event={...rng.pick(sites),type:'woodland',kind,id:id+':woodland',used:false,...WOODLAND[kind]};
 if(kind==='milestone'){
 // Read seeded terrain generation only; do not visit or reveal neighboring maps.
 const candidates=[];
 for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++)if((x||y)&&Math.abs(x-rx)+Math.abs(y-ry)<=4)candidates.push({rx:x,ry:y});
 candidates.sort((a,b)=>Math.abs(a.rx-rx)+Math.abs(a.ry-ry)-Math.abs(b.rx-rx)-Math.abs(b.ry-ry));
 event.clue=candidates.find(p=>generateWorldRegion(g.state.seed,p.rx,p.ry).entrance)??null;
 }
 data.map[event.y][event.x]=kind==='milestone'?'R':'V';data.encounters.push(event);g.woodland.set(id,event);
}
export function woodlandAction(g,a){
 const event=g.activeEncounter(),p=g.state.player;
 if(event?.type!=='woodland'||event.used)return false;
 if(event.kind==='herbalist'){
 const index=p.inventory.findIndex(i=>i.kind==='trophy');
 if(a.choice==='gold'&&p.gold<6){g.message('Nessa needs 6 gold for a tonic.');return false;}
 if(a.choice==='trophy'&&index<0){g.message('You have no hunting trophy to exchange.');return false;}
 if(!['gold','trophy'].includes(a.choice))return false;
 // Fit against a copy so a trophy exchange can use the cell it frees.
 const inventory=p.inventory.filter((_,i)=>a.choice!=='trophy'||i!==index);
 if(!addItem({inventory},potion())){g.message('Make room for the tonic first. Nothing was spent.');return false;}
 p.inventory=inventory;if(a.choice==='gold')p.gold-=6;g.message('Nessa gives you an Ember tonic. Her traveling stock is now spent.');
 }else if(event.kind==='traveler'){
 const index=p.inventory.findIndex(i=>i.kind==='potion');if(index<0){g.message('You need an Ember tonic to help the traveler.');return false;}
 p.inventory.splice(index,1);p.gold+=8;g.message('The traveler drinks your tonic and thanks you with 8 gold.');
 }else{
 if(event.clue)g.message('Milestone: a crypt lies in region ('+event.clue.rx+', '+event.clue.ry+'). Explore there to find its entrance.');
 else g.message('The milestone reads: “Shelter waits below. Seek the old stone doorways.”');
 }
 event.used=true;event.result=g.state.log.at(-1);return true;
}
