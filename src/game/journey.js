import {startingForest,journeyLandmarks} from './world.js';
import {addItem} from './inventory.js';
import {potion,rations} from './items.js';
export const SCOUT={x:25,y:12,name:'Scout Fen'};
export const STEWARD={x:22,y:8,name:'Steward Elara'};
export const homecomingKeepsake=()=>({id:'northwatchBrooch',kind:'amulet',name:'Aldren’s Wayfarer Brooch',bonus:0,maxManaBonus:10,wardedBonus:1,size:[1,2],sellValue:10,appearance:0x93b8d9,rarity:'unique',description:'Aldren’s thanks: +10 maximum Mana and +1 defense against special attacks. Amulet; replaces your current neckwear. Equipping does not restore Mana.'});
export const createJourney=()=>({bridgeLead:false,landmarkHints:false,records:{}});
export function attachJourney(g,data,rx,ry){
 if(data.home){data.map[SCOUT.y][SCOUT.x]='V';if(!data.encounters.some(e=>e.id==='route-scout'))data.encounters.push({...SCOUT,id:'route-scout',type:'guide',description:'Ask about Willow Crossing and the northern road.'});}
 if(data.city){data.map[STEWARD.y][STEWARD.x]='V';if(!data.encounters.some(e=>e.id==='royal-steward'))data.encounters.push({...STEWARD,id:'royal-steward',type:'steward',description:'The steward welcomes travelers and holds any unclaimed royal keepsake.'});if(!data.scenery.some(e=>e.type==='banner'))data.scenery.push({x:17,y:10,type:'banner'},{x:23,y:10,type:'banner'});}
 const l=data.routeLandmark;
 if(l&&!data.encounters.some(e=>e.id===`journey:${l.kind}`))data.encounters.push({...l,id:`journey:${l.kind}`,type:'journey'});
}
export function journeyHints(g){
 if(!g.journey)return [];
 const landmarks=journeyLandmarks(g.state.seed),hints=[];
 if(g.journey.bridgeLead){hints.push({...startingForest(g.state.seed),label:'Willow Crossing',symbol:'B'});const tower=landmarks.find(l=>l.kind==='tower');if(tower)hints.push({...tower,label:tower.name,symbol:'◇'});}
 if(g.journey.landmarkHints)for(const l of landmarks)if(!hints.some(h=>h.label===l.name))hints.push({...l,label:l.name,symbol:'◇'});
 return hints;
}

export function arrivalSummary(g){
 const bridge=[...g.quests.values()].find(q=>q.kind==='bridge'&&q.claimed);
 const crossing=bridge?({paid:'You purchased safe passage at Willow Crossing.',medicine:'You brought medicine back to the Willow Band and earned passage.',fought:'You defeated the Willow Band and opened the crossing.'})[bridge.mode]:'You found your own way through the wildlands.';
 const visited=Object.keys(g.journey?.records??{}).length;
 return `${crossing} ${visited?`You made use of ${visited} northern landmark${visited===1?'':'s'} along the road.`:'The northern road still holds places you can explore.'}${g.story.aidCount?' You tended Aldren’s wounds when he needed you.':''}`;
}
export function awardKeepsake(g){
 if(g.story.keepsakeClaimed)return false;
 const item=g.story.keepsake??=homecomingKeepsake();
 if(!addItem(g.state.player,item)){g.message('Steward Elara holds your Wayfarer Brooch at the keep. Make room in your satchel and speak to her.');return false;}
 g.story.keepsakeClaimed=true;g.message('Aldren gives you his Wayfarer Brooch. It is in your satchel, ready to equip.');return true;
}
export function journeyAction(g,a){
 const event=g.activeEncounter(),p=g.state.player;
 if(event?.type==='guide'&&a.choice==='bridgeLead'){
  if(g.journey.bridgeLead)return false;g.journey.bridgeLead=true;const f=startingForest(g.state.seed);g.message(`Fen marks Willow Crossing in region (${f.rx}, ${f.ry}). Find Kestrel near the entry trail; a dry detour stays open. Fen also marks the Fallen Watchtower farther along the road. These leads reveal no terrain.`);return true;
 }
 if(event?.type==='steward'&&a.choice==='keepsake')return g.story.complete?awardKeepsake(g):false;
 if(event?.type!=='journey'||g.journey.records[event.kind])return false;
 const c=g.princeHere(),nearby=c&&Math.abs(c.x-p.x)+Math.abs(c.y-p.y)<=2&&c.hp>0;
 if(event.kind==='tower'){
  if(a.choice==='scout')g.journey.landmarkHints=true;
  else if(a.choice==='tonic'){if(!addItem(p,potion())){g.message('Make space for the watchtower tonic. Nothing was taken.');return false;}}
  else return false;
 }else if(event.kind==='causeway'){
  if(a.choice==='aid'){if(!nearby||c.hp===c.maxHp){g.message('Bring a wounded, standing Aldren nearby to help him across.');return false;}c.hp=Math.min(c.maxHp,c.hp+8);}
  else if(a.choice==='purse')p.gold+=4;else return false;
 }else if(event.kind==='shelter'){
  if(a.choice==='rest'){if(p.hp===p.maxHp&&(!nearby||c.hp===c.maxHp)){g.message('You are already rested. The shelter remains available.');return false;}p.hp=Math.min(p.maxHp,p.hp+8);if(nearby)c.hp=Math.min(c.maxHp,c.hp+8);}
  else if(a.choice==='rations'){if(!addItem(p,rations())){g.message('Make room for the shelter’s rations. Nothing was taken.');return false;}}else return false;
 }else return false;
 g.journey.records[event.kind]=a.choice;g.message(({scout:'The watchtower reveals the next northern landmarks on your world map.',tonic:'You take the watchtower’s last healing tonic.',aid:'You guide Aldren across the causeway. He recovers 8 health.',purse:'You recover 4 gold from the causeway reeds.',rest:'The shelter restores up to 8 health to you and nearby Aldren.',rations:'You take Honeyed Rations for the road.'})[a.choice]);return true;
}
