import {walkable,key} from './dungeon.js';
export const BRIDGE_TOLL=8;
export const bridgeQuest=g=>g.state.bridgeLayout?g.quests.get(`bridge:${g.location.rx},${g.location.ry}`):null;
export function attachBridge(g,data,rx,ry){
 const layout=data.bridgeLayout;if(!layout)return;
 const id=`bridge:${rx},${ry}`;let q=g.quests.get(id);
 if(!q){q={id,kind:'bridge',title:'The Willow Crossing',giver:'Kestrel of the Willow Band',giverRegion:{rx,ry},region:{rx,ry},accepted:false,claimed:false,complete:false,mode:'offer',medicine:false,layout};g.quests.set(id,q);}
 data.map[layout.center.y][layout.center.x]=q.claimed?'=':'X';
 data.map[layout.guard.y][layout.guard.x]=q.mode==='fight'||q.mode==='fought'?',':'V';
 if(!data.encounters.some(e=>e.id===id))data.encounters.push({...layout.guard,id,type:'bridge',name:q.giver,quest:q,description:'A barred bridge. Pay 8 gold, recover medicine, or fight. A longer bank trail leads to a shallow ford.'});
}
const near=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;
function openBridge(g,q,mode){
 q.mode=mode;q.accepted=true;q.complete=true;q.claimed=true;
 g.state.map[q.layout.center.y][q.layout.center.x]='=';
 g.state.items=g.state.items.filter(i=>i.bridgeMedicine!==q.id);
 // Unfinished medicine guards become ordinary wildlife, not free kills.
 for(const e of g.state.enemies)if(e.bridgeMedicineGuard===q.id){delete e.bridgeId;delete e.bridgeMedicineGuard;}
 g.message(mode==='paid'?'Kestrel pockets the toll and lifts the barrier.':mode==='medicine'?'Kestrel takes the medicine and lifts the barrier. “You and your companions may pass.”':'The Willow Band falls. The bridge barrier is removed.');
 g.message('Willow Crossing is open for the rest of this run. The direct trail is available to you and Aldren.');
}
function medicineSite(g,q){
 const sites=[],s=g.state,used=new Set([...s.enemies.filter(e=>e.hp>0),...s.items,...s.encounters,...s.scenery,s.player,s.companion].filter(Boolean).map(p=>key(p.x,p.y)));
 for(let y=5;y<25;y++)for(let x=5;x<35;x++)if(Math.abs(x-q.layout.guard.x)+Math.abs(y-q.layout.guard.y)>=12&&!used.has(key(x,y))&&[[0,0],[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy])=>walkable(s.map,x+dx,y+dy)&&!used.has(key(x+dx,y+dy))))sites.push({x,y});
 return sites.length?g.rng.pick(sites):null;
}
export function bridgeAction(g,a){
 const q=bridgeQuest(g),s=g.state,p=s.player;
 if(!q||!near(p,q.layout.guard)||q.claimed||q.mode==='fight')return false;
 if(a.choice==='pay'){
  if(p.gold<BRIDGE_TOLL){g.message('The toll is 8 gold. Nothing was spent.');return false;}
  p.gold-=BRIDGE_TOLL;openBridge(g,q,'paid');return true;
 }
 if(a.choice==='medicine'){
  if(q.accepted)return false;const spot=medicineSite(g,q);if(!spot){g.message('The medicine trail is blocked. Clear space or choose another solution.');return false;}
  q.accepted=true;q.mode='medicineQuest';q.medicineSite=spot;
  s.items.push({...spot,kind:'bridgeMedicine',name:'Willow-band medicine',bridgeMedicine:q.id,description:'Quest pouch: recover this medicine and return it to Kestrel.'});
  for(const [i,dx] of [-1,1].entries())s.enemies.push({...g.makeEnemy('rat',{x:spot.x+dx,y:spot.y},1,3000+i),bridgeId:q.id,bridgeMedicineGuard:q.id,territory:{...spot,radius:3,name:'Guarded medicine clearing'}});
  g.message(`Kestrel marks a medicine clearing at local tile (${spot.x}, ${spot.y}). Recover the pouch and return; there is no deadline.`);return true;
 }
 if(a.choice==='deliver'){
  if(!q.medicine)return false;openBridge(g,q,'medicine');g.awardExperience(4);return true;
 }
 if(a.choice==='fight'){
  const c=q.layout.guard,occupied=new Set([...s.enemies.filter(e=>e.hp>0),p,s.companion].filter(Boolean).map(e=>key(e.x,e.y))),spots=[];
  for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]]){const point={x:c.x+dx,y:c.y+dy};if((dx===0&&dy===0||walkable(s.map,point.x,point.y))&&!occupied.has(key(point.x,point.y)))spots.push(point);}
  if(spots.length<2){g.message('There is no room for the guards to engage. Move or clear the nearby trail first.');return false;}
  q.accepted=true;q.mode='fight';q.complete=false;s.map[c.y][c.x]=',';
  for(let i=0;i<2;i++)s.enemies.push({...g.makeEnemy('goblin',spots[i],1,3100+i),name:i?'Willow-band lookout':'Kestrel of the Willow Band',bridgeBandit:true,bridgeId:q.id,hp:i?10:12,maxHp:i?10:12,attack:4,defense:i?0:1,xp:3,territory:{...q.layout.center,radius:6,name:'Willow-band crossing'}});
  g.message('The Willow Band draws steel. Defeat both guards to open the crossing. They act after this turn.');return true;
 }
 return false;
}
export function collectMedicine(g,item){
 const q=g.quests.get(item.bridgeMedicine);if(!q?.accepted||q.claimed||q.mode!=='medicineQuest')return false;
 if(g.state.enemies.some(e=>e.hp>0&&e.bridgeMedicineGuard===q.id)){g.message('Clear the medicine pouch’s guards first.');return false;}
 q.medicine=true;q.complete=true;g.state.items.splice(g.state.items.indexOf(item),1);g.message('Recovered the medicine in your quest pouch. Return to Kestrel; no satchel space is needed.');return true;
}
export function finishBridgeFight(g,enemy){
 if(!enemy.bridgeBandit)return;const q=g.quests.get(enemy.bridgeId);
 if(q?.mode==='fight'&&!g.state.enemies.some(e=>e.hp>0&&e.bridgeBandit&&e.bridgeId===q.id))openBridge(g,q,'fought');
}
