import {atInn,atTown} from './town.js';
const itemIds=new WeakMap();let serial=0;
const itemId=item=>{if(!itemIds.has(item))itemIds.set(item,++serial);return itemIds.get(item);};
export function availableInteractions(g){
 const options=[],s=g.state,p=s.player,add=(id,type,label,detail,event)=>options.push({id,type,label,detail,event});
 const events=g.nearbyEncounters();
 for(const e of events.filter(e=>e.type==='bridge'))add(e.id,'bridge','Interact',e.name,e);
 if(s.city){if(atInn(g))add('inn','town','Visit','The Lantern & Crown Inn');if(atTown(g,'N'))add('board','town','Visit','Northwatch bounty board');}
 if(g.atCampfire())add('fire','fire','Cook','Lantern Camp fire');
 if(g.atCamp())add('storage','storage','Camp chest','Lantern Camp storage');
 if(g.atMerchant())add('merchant','merchant','Trade','Mara the Wayfarer');
 for(const e of events){
  if(['guide','steward','journey'].includes(e.type))add(e.id,'journey',e.type==='journey'?'Interact':'Speak',e.name,e);
  else if(['discovery','villager','shrine','woodland'].includes(e.type))add(e.id,'encounter','Interact',e.quest?.giver??e.name??'Wayfarer shrine',e);
  else if(e.type==='altar')add(e.id,'altar',e.active?'Travel':'Activate',e.name,e);
  else if(e.type==='habitat')add(e.id,'habitat',e.kind==='rat'&&!e.destroyed?'Strike':'Inspect',e.kind==='rat'&&!e.destroyed?`${e.name} · ${e.hp}/${e.maxHp} HP`:e.name,e);
  else if(e.type==='blacksmith')add(e.id,'blacksmith','Forge',e.name,e);
  else if(e.type==='gravekeeper')add(e.id,'grave','Trade bones',e.name,e);
  else if(e.type==='citizen')add(e.id,'town','Visit',e.name,e);
 }
 if(g.atPrince())add('prince','prince','Speak','Prince Aldren');
 for(const item of s.items.filter(i=>i.x===p.x&&i.y===p.y))options.push({id:'item:'+itemId(item),type:'pickup',label:'Collect',detail:item.name,item});
 return options;
}
// UI selection has no gameplay side effects. Moving resets it; waits and redraws
// preserve it. When a collected item disappears, the next available option takes its place.
export class InteractionSelection{
 constructor(){this.reset();}
 reset(){this.place=null;this.id=null;this.index=0;}
 resolve(g){const place=`${g.location.id}:${g.state.player.x},${g.state.player.y}`;if(this.game!==g||place!==this.place){this.reset();this.game=g;this.place=place;}const options=availableInteractions(g),found=options.findIndex(o=>o.id===this.id);this.index=found>=0?found:Math.min(this.index,Math.max(0,options.length-1));this.id=options[this.index]?.id??null;return {options,selected:options[this.index],index:this.index};}
 next(g){const {options}=this.resolve(g);if(options.length>1){this.index=(this.index+1)%options.length;this.id=options[this.index].id;}return this.resolve(g);}
}
