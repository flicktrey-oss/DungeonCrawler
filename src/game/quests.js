import {Random} from './random.js';
import {regionSeed,worldId,startingForest} from './world.js';
import {key,walkable} from './dungeon.js';
import {modifyItem} from './loot.js';
import {trailBoots,ironRing,lanternRelic} from './items.js';

export const TRAILWARDEN={x:18,y:14};
export const QUEST_TYPES={
 hunt:{title:'Beast on the Trail',giver:'Scout Rowan',description:'A scarred beast is driving travelers off the trail. Hunt it, then return.',goal:'Defeat the marked beast',reward:'Trail Boots'},
 recovery:{title:'The Stolen Keepsake',giver:'Traveler Elin',description:'Scavengers stole a family keepsake. Clear its guards and recover it, then return.',goal:'Recover the guarded keepsake',reward:'Iron Band'},
 ward:{title:'The Broken Ward',giver:'Warden Sable',description:'Three waystones have gone dark. Rekindle them and defeat the creature they awaken, then return.',goal:'Activate three waystones, then defeat their sentinel',reward:'Lantern Relic'}
};
export function questProgress(q){
 if(q.kind==='escort')return q.complete?'Chapter one complete · Northwatch reached':`Escort Aldren to Northwatch (0, -6) · ${q.prince.mode} · ${q.prince.hp}/${q.prince.maxHp} HP`;
 if(q.legacy)return q.complete?'Frogs cleared — return for your reward':`${q.remaining??3} frogs remain`;
 if(q.complete)return 'Ready to return for your reward';
 if(q.kind==='hunt')return 'Marked beast still alive';
 if(q.kind==='recovery')return 'Recover the keepsake from its guarded cache';
 return `${q.activated.length}/3 waystones lit${q.activated.length===3?' · defeat the awakened sentinel':''}`;
}
function createQuest(g,kind,id,region,giver,camp=false){
 const info=QUEST_TYPES[kind],rng=new Random(regionSeed(g.state.seed,region.rx,region.ry,id));
 const factory={hunt:trailBoots,recovery:ironRing,ward:lanternRelic}[kind];
 return {id,kind,...info,giver:camp?'Trailwarden Iona':info.giver,region,giverRegion:camp?{rx:0,ry:0}:region,giverPosition:{...giver},camp,accepted:false,claimed:false,complete:false,activated:[],reward:modifyItem(factory(),rng,'quest')};
}
export function campQuest(g,data){
 const rng=new Random(regionSeed(g.state.seed,0,0,'trailwarden')),target=startingForest(g.state.seed);rng.next();
 const q=createQuest(g,rng.pick(Object.keys(QUEST_TYPES)),'trailwarden',target,TRAILWARDEN,true);
 g.quests.set(q.id,q);data.map[TRAILWARDEN.y][TRAILWARDEN.x]='V';
 data.encounters.push({...TRAILWARDEN,type:'villager',id:'trailwarden',quest:q,name:q.giver});
}
function freeSites(data,rng){
 const used=new Set([...data.encounters,...data.enemies,...data.items,...data.scenery].map(p=>key(p.x,p.y))),sites=[];
 for(let y=5;y<25;y++)for(let x=5;x<35;x++)if(Math.abs(x-20)+Math.abs(y-15)>6&&!used.has(key(x,y))&&data.map[y][x]!== 'D'&&[-1,0,1].every(dy=>[-1,0,1].every(dx=>walkable(data.map,x+dx,y+dy))))sites.push({x,y});
 for(let i=sites.length-1;i>0;i--){const j=rng.int(0,i);[sites[i],sites[j]]=[sites[j],sites[i]];}
 return sites;
}
function objectives(g,data,q,sites){
 const take=()=>sites.pop();
 const takePocket=()=>{
  const index=sites.findIndex(p=>Math.abs(p.x-20)>=6&&Math.abs(p.y-15)>=5&&Math.abs(p.x-q.giverPosition.x)+Math.abs(p.y-q.giverPosition.y)>=7);
  return index<0?take():sites.splice(index,1)[0];
 };
 if(q.kind==='hunt'){
 const p=takePocket(),e=g.makeEnemy(data.biome==='marsh'?'frog':'beetle',p,data.danger,1000+data.enemies.length);
 Object.assign(e,{name:data.biome==='marsh'?'Old Miretongue':'Thornback',hp:e.hp+6,maxHp:e.maxHp+6,attack:e.attack+3,territory:{x:p.x,y:p.y,radius:5,name:'Marked beast territory'},questKey:q.id});data.enemies.push(e);
 }else if(q.kind==='recovery'){
 const p=take();data.items.push({...p,kind:'questToken',name:'Stolen keepsake',questKey:q.id});
 sites.sort((a,b)=>(Math.abs(b.x-p.x)+Math.abs(b.y-p.y))-(Math.abs(a.x-p.x)+Math.abs(a.y-p.y)));
 for(let i=0;i<2;i++)data.enemies.push({...g.makeEnemy(data.biome==='marsh'?'frog':'rat',take(),data.danger,1000+data.enemies.length),territory:{x:p.x,y:p.y,radius:5,name:'Guarded keepsake'},questKey:q.id});
 }else for(let i=0;i<3;i++){
 const p=take();data.map[p.y][p.x]='S';data.encounters.push({...p,type:'shrine',id:q.id+':stone:'+i,quest:q,wardIndex:i,used:false});
 }
 q.placed=true;
}
export function addQuestContent(g,data,rx,ry){
 if(data.home){campQuest(g,data);return;}
 if(!['forest','marsh'].includes(data.biome))return;
 const rng=new Random(regionSeed(g.state.seed,rx,ry,'quests:'+data.visit)),sites=freeSites(data,rng);
 if(sites.length<12)return;
 const region={rx,ry},giver=sites.pop(),kind=rng.pick(Object.keys(QUEST_TYPES));
 for(let i=sites.length-1;i>=0;i--)if(Math.abs(sites[i].x-giver.x)+Math.abs(sites[i].y-giver.y)<3)sites.splice(i,1);
 const q=createQuest(g,kind,worldId(rx,ry)+':quest:'+data.visit,region,giver);
 data.map[giver.y][giver.x]='V';data.encounters.push({...giver,type:'villager',id:q.id,quest:q,name:q.giver});
 objectives(g,data,q,sites);
 const camp=g.quests.get('trailwarden');
 if(camp?.accepted&&!camp.placed&&camp.region.rx===rx&&camp.region.ry===ry)objectives(g,data,camp,sites);
}
// Pin the accepted encounter layer; only ordinary inhabitants respawn.
export function restoreQuestRegion(g,data,previous,rx,ry){
 const pinned=[...g.quests.values()].some(q=>(q.accepted||q.claimed)&&q.region.rx===rx&&q.region.ry===ry);
 if(!previous||!pinned&&!g.woodland?.get(worldId(rx,ry)))return false;
 data.map=previous.map.map(row=>[...row]);data.encounters=previous.encounters;data.quest=previous.quest;data.items=previous.items;data.encounterSeen=new Set(previous.encounterSeen);
 const special=previous.enemies.filter(e=>e.questId||e.questKey||e.eventId);
 const ordinary=data.enemies.filter(e=>!e.questId&&!e.questKey&&!e.eventId);
 const occupied=new Set([...special.filter(e=>e.hp>0),...data.encounters,...data.items].map(e=>key(e.x,e.y)));
 for(const e of ordinary){
 if(occupied.has(key(e.x,e.y))||!walkable(data.map,e.x,e.y)){
 let found=false;for(let y=5;y<25&&!found;y++)for(let x=5;x<35;x++)if(walkable(data.map,x,y)&&!occupied.has(key(x,y))&&Math.abs(x-20)+Math.abs(y-15)>5){e.x=x;e.y=y;found=true;break;}
 if(!found)continue;
 }
 occupied.add(key(e.x,e.y));
 }
 data.enemies=[...ordinary,...special];ensureCampObjectives(g,data,rx,ry);return true;
}
export function ensureCampObjectives(g,data,rx,ry){const q=g.quests.get('trailwarden');if(q?.accepted&&!q.placed&&q.region.rx===rx&&q.region.ry===ry){const sites=freeSites(data,new Random(regionSeed(g.state.seed,rx,ry,'camp-objectives')));if(sites.length>=5)objectives(g,data,q,sites);}}
export function questAction(g,a){
 const s=g.state,p=s.player,event=g.activeEncounter(),q=event?.quest??(event?.id===s.quest?.id?s.quest:null);
 if(a.type==='activateWard'){
 if(!event?.quest||event.wardIndex===undefined||!q.accepted||q.claimed||event.used)return false;
 event.used=true;q.activated.push(event.id);g.message('A waystone answers your lantern. '+q.activated.length+'/3 lit.');
 if(q.activated.length===3){
 const occupied=new Set(s.enemies.filter(e=>e.hp>0).map(e=>key(e.x,e.y)));let spot;
 for(let r=2;r<15&&!spot;r++)for(let y=Math.max(1,p.y-r);y<=Math.min(28,p.y+r)&&!spot;y++)for(let x=Math.max(1,p.x-r);x<=Math.min(38,p.x+r);x++)if(Math.abs(x-p.x)+Math.abs(y-p.y)===r&&walkable(s.map,x,y)&&!occupied.has(key(x,y))&&![...s.encounters,...s.items].some(e=>e.x===x&&e.y===y)){spot={x,y};break;}
 if(spot){const e=g.makeEnemy('beetle',spot,s.danger,2000+s.enemies.length);s.enemies.push({...e,hp:e.hp+8,maxHp:e.maxHp+8,attack:e.attack+3,name:'Briar Sentinel',territory:{x:p.x,y:p.y,radius:5,name:'Awakened waystone'},questKey:q.id});g.message('The Briar Sentinel awakens!');}
 }
 return true;
 }
 if(!['acceptQuest','claimQuest'].includes(a.type)||!q||event.type!=='villager')return false;
 if(a.type==='acceptQuest'&&!q.accepted&&!q.claimed){
 q.accepted=true;g.quests.set(q.id,q);g.trackedQuest??=q.id;
 if(q.legacy){q.remaining=g.questRemaining();q.complete=q.remaining===0;}
 g.message('Quest accepted: '+q.title+'. Return whenever you are ready.');return true;
 }
 if(q.legacy){q.remaining=g.questRemaining();q.complete=q.remaining===0;}
 if(a.type==='claimQuest'&&q.accepted&&!q.claimed&&q.complete){
 if(!g.collectQuestReward(q))return false;q.claimed=true;g.awardExperience(6);g.message(q.giver+' gives you '+q.reward.name+'.');
 if(g.trackedQuest===q.id)g.trackedQuest=null;return true;
 }
 return false;
}
