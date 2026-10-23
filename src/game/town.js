import {addItem} from './inventory.js';
import {travelGear,trailBoots,ironRing} from './items.js';
import {modifyItem} from './loot.js';
export const INN={x:9,y:9},BOARD={x:23,y:15};
export function atTown(g,tile){const s=g.state,p=s.player;return Boolean(s.city&&s.map[p.y]?.[p.x]===tile);}
export const atInn=g=>atTown(g,'I')||Boolean(g.state.city&&g.state.encounters.some(e=>e.type==='innkeeper'&&Math.abs(e.x-g.state.player.x)+Math.abs(e.y-g.state.player.y)===1));
export function townAction(g,a){
 const p=g.state.player;
 if(a.type==='innRest'){if(!atInn(g)||p.gold<6||p.hp===p.maxHp&&p.mana===p.maxMana){g.message('Rest costs 6 gold and requires missing health or Mana.');return false;}p.gold-=6;p.hp=p.maxHp;p.mana=p.maxMana;g.message('A warm bed and meal restore your health and Mana.');return true;}
 const b=g.bounties?.[a.id];if(!atTown(g,'N')||!b||b.claimed)return false;
 if(a.type==='acceptBounty'&&!b.accepted){b.accepted=true;b.start=g.killCounts[b.kind]??0;g.message('Bounty accepted: '+b.title+'. Hunts count from now on; no deadline.');return true;}
 if(a.type==='claimBounty'&&b.accepted&&(g.killCounts[b.kind]??0)-b.start>=b.count){b.reward??=modifyItem(b.kind==='rat'?trailBoots():b.kind==='frog'?ironRing():travelGear('armor',2),g.rng,'champion');if(!addItem(p,b.reward)){g.message('Make room for your bounty reward.');return false;}b.claimed=true;p.gold+=8;g.message('Bounty completed: '+b.title+'. Received '+b.reward.name+' and 8 gold.');return true;}
 return false;
}
export function townBounties(){return [{title:'Rats on the supply road',kind:'rat',count:6},{title:'Mire frogs at the crossings',kind:'frog',count:4},{title:'Wolves near the northern road',kind:'wolf',count:3}].map(b=>({...b,accepted:false,claimed:false,start:0}));}
export function placeCitizens(g,data){if(!data.city)return;for(let n=0;n<Math.min(3,g.rescued.length);n++){const x=28+n*3,y=16;if(!data.encounters.some(e=>e.id==='rescued:'+n)){data.map[y][x]='V';data.encounters.push({x,y,id:'rescued:'+n,type:'citizen',name:g.rescued[n].name,description:'“You helped me on the forest road. I made it home to Northwatch. Thank you.”'});}}}
