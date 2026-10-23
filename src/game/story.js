import {awardKeepsake,arrivalSummary} from './journey.js';
import {key,walkable} from './dungeon.js';
import {pathStep} from './ai.js';
import {KINGDOM,isKingdom} from './city.js';
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export function createStory(){return {id:'royal-escort',kind:'escort',title:'The Road to Northwatch',giver:'Prince Aldren',giverRegion:{rx:0,ry:0},region:{rx:KINGDOM.rx,ry:KINGDOM.ry},accepted:false,complete:false,claimed:false,noticeShown:false,prince:{name:'Prince Aldren',kind:'prince',friendly:true,companion:true,x:24,y:17,locationId:'world:0,0',rx:0,ry:0,depth:0,hp:36,maxHp:36,attack:5,defense:2,mode:'waiting',actions:0}};}
export const princeHere=g=>g.story&&g.location?.id===g.story.prince.locationId?g.story.prince:null;
export const nearPrince=g=>{const c=princeHere(g);return Boolean(c&&distance(c,g.state.player)<=1);};
export function princeAction(g,a){
 const q=g.story,c=princeHere(g),p=g.state.player;if(!c||!nearPrince(g)||q.complete)return false;
 if(a.type==='acceptEscort'&&!q.accepted){q.accepted=true;c.mode='follow';g.trackedQuest=q.id;g.message('Main quest: escort Prince Aldren to the keep in Northwatch (0, -6). Depart whenever you are ready.');return true;}
 if(!q.accepted)return false;
 if(a.type==='princeStay'&&c.hp>0&&c.mode==='follow'){c.mode='stay';g.message('Aldren will wait here until you return.');return true;}
 if(a.type==='princeFollow'&&c.hp>0&&c.mode==='stay'){c.mode='follow';g.message('Aldren follows you again.');return true;}
 if(a.type==='healPrince'&&c.hp<c.maxHp){const i=p.inventory.findIndex(i=>i.kind==='potion');if(i<0){g.message('A healing tonic is needed to help Aldren.');return false;}p.inventory.splice(i,1);q.aidCount=(q.aidCount??0)+1;c.hp=Math.min(c.maxHp,c.hp+16);if(c.mode==='downed')c.mode='stay';g.message('Your tonic restores 16 health to Aldren. Ask him to follow when ready.');return true;}
 return false;
}
export function escortCanLeave(g){const c=princeHere(g);if(c&&g.story.accepted&&!g.story.complete&&c.mode==='follow'&&distance(c,g.state.player)>2){g.message('Aldren is too far behind. Wait for him, or return and ask him to stay.');return false;}return true;}
export function carryPrince(g,oldLocation,oldPlayer){
 const q=g.story,c=q?.prince;if(!q?.accepted||q.complete||c.mode!=='follow'||c.locationId!==oldLocation?.id||distance(c,oldPlayer)>2)return;
 const s=g.state,p=s.player,occupied=new Set(s.enemies.filter(e=>e.hp>0).map(e=>key(e.x,e.y)));
 for(let r=1;r<40;r++)for(let y=0;y<s.map.length;y++)for(let x=0;x<s.map[y].length;x++)if(distance({x,y},p)===r&&walkable(s.map,x,y)&&!occupied.has(key(x,y))){Object.assign(c,{x,y,locationId:g.location.id,rx:g.location.rx,ry:g.location.ry,depth:g.location.depth});return;}
}
export function actPrince(g){
 const q=g.story,c=princeHere(g),s=g.state,p=s.player;if(!q?.accepted||q.complete||!c||c.hp<=0)return;
 c.actions++;if(c.swappedTurn===s.turn)return;
 // Self-defense only: the prince never pursues a creature off the player's route.
 const foe=s.enemies.find(e=>e.hp>0&&distance(c,e)===1);
 if(foe){g.strikeEnemy(foe,c.attack,'Aldren strikes',false);return;}
 if(c.mode!=='follow'||distance(c,p)<=1)return;
 const occupied=new Set(s.enemies.filter(e=>e.hp>0).map(e=>key(e.x,e.y)));
 const step=pathStep(s.map,c,p,occupied);if(step&&distance(step,p)>0)Object.assign(c,step);
}
export function princeEnemyTarget(g,e){
 const c=princeHere(g),p=g.state.player;if(!c||!g.story.accepted||g.story.complete||c.hp<=0)return p;
 if(e.intent?.tiles.some(t=>distance(t,p)===0))return p;
 if(e.intent?.tiles.some(t=>distance(t,c)===0))return c;
 return distance(e,c)<distance(e,p)?c:p;
}
export function finishStory(g){
 const q=g.story,c=princeHere(g),p=g.state.player;
 if(!q?.accepted||q.complete||!c||c.hp<=0||!isKingdom(g.location.rx,g.location.ry)||g.location.kind!=='world')return;
 if(distance(p,KINGDOM.keep)>0||distance(c,p)>2)return;
 q.complete=true;q.claimed=true;c.mode='arrived';p.gold+=30;p.hp=p.maxHp;p.mana=p.maxMana;c.hp=c.maxHp;
 q.homecoming=arrivalSummary(g);awardKeepsake(g);
 g.message('Chapter one complete: Aldren reaches Northwatch. The court grants 30 gold and sanctuary. Your expedition continues.');
}
export function princeProgress(g){
 const q=g.story,c=q.prince;if(q.complete)return 'Chapter one complete · Aldren is safe in Northwatch.';
 if(!q.accepted)return 'Prince Aldren waits southeast of the tent. Speak when you are ready.';
 return `${c.mode==='downed'?'Wounded · bring a healing tonic':c.mode==='stay'?'Waiting for you':c.locationId===g.location.id?'Following':'Separated · return to collect him'} · ${c.hp}/${c.maxHp} HP · region (${c.rx}, ${c.ry})${c.depth?' · crypt depth '+c.depth:''}. Destination: Northwatch (0, -6), northern keep.`;
}
