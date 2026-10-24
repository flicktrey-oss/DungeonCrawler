import {itemEmoji} from './item-icons.js';
import {inventoryLayout,addItem,footprint} from './game/inventory.js';
import {equippedSlot,salePrice} from './game/items.js';
import {equipmentSummary} from './game/gear-progression.js';
import {itemDamageDescription} from './game/damage-rolls.js';
export function mountTrading(container,game,perform){
 let selected=null,tab='stock',notice='';
 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 function draw(){
  const p=game.state.player;container.replaceChildren();
  const gold=el('p','trade-gold',`Your gold: ${p.gold}`);gold.id='shop-gold';container.append(gold);
  const tabs=el('div','trade-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Trade view');for(const [id,label]of [['stock','Merchant'],['bag','Your satchel']]){const b=el('button','',label);b.setAttribute('role','tab');b.setAttribute('aria-selected',String(tab===id));b.onclick=()=>{tab=id;draw();};tabs.append(b);}container.append(tabs);
  const body=el('div','trade-body'),stock=el('section','trade-stock'),bag=el('section','trade-bag');stock.dataset.active=String(tab==='stock');bag.dataset.active=String(tab==='bag');stock.append(el('h3','','Merchant offers'));bag.append(el('h3','','Your satchel'));
  const offers=el('div','trade-offers');offers.id='shop-offers';
  for(const offer of game.shop){const b=el('button','trade-offer'+(selected?.offer===offer?' selected':''));b.dataset.offer=offer.id;b.setAttribute('aria-label',`Select ${offer.item.name} offer`);b.setAttribute('aria-pressed',String(selected?.offer===offer));b.title=`${offer.item.name} · ${offer.price} gold · ${offer.stock} left`;b.classList.toggle('sold-out',offer.stock===0);const icon=el('span','trade-icon',itemEmoji(offer.item));icon.setAttribute('aria-hidden','true');b.append(icon,el('span','trade-name',offer.item.name),el('small','',`${offer.price} gold · ${offer.stock} left`));b.onclick=()=>{selected={offer};notice='';draw();};offers.append(b);}stock.append(offers);
  const grid=el('div','bag-grid trade-inventory');grid.id='shop-sales';grid.setAttribute('aria-label','Your 10 by 10 trading inventory');for(let y=0;y<10;y++)for(let x=0;x<10;x++){const c=el('div','bag-cell');c.style.gridArea=`${y+1} / ${x+1}`;grid.append(c);}
  for(const pos of inventoryLayout(p.inventory)??[]){const item=p.inventory[pos.index],equipped=equippedSlot(p,item),b=el('button','bag-item'+(selected?.item===item?' selected':'')+(equipped?' equipped':''));b.style.gridArea=`${pos.y+1} / ${pos.x+1} / span ${pos.h} / span ${pos.w}`;b.style.setProperty('--item-icon-size',Math.min(44,Math.min(pos.w,pos.h)*20)+'px');b.setAttribute('aria-label',`Select ${item.name} to sell`);b.setAttribute('aria-pressed',String(selected?.item===item));b.title=`${item.name} · ${salePrice(item)} gold${equipped?' · Equipped':''}`;const icon=el('span','bag-item-icon',itemEmoji(item));icon.setAttribute('aria-hidden','true');b.append(icon);if(item.quantity)b.append(el('span','bag-item-count',String(item.quantity)));if(equipped)b.append(el('span','bag-equipped','✓'));b.onclick=()=>{selected={item};notice='';draw();};grid.append(b);}bag.append(grid);body.append(stock,bag);container.append(body);
  const detail=el('section','trade-detail');detail.id='trade-detail';
  const offer=selected?.offer,item=offer?.item??selected?.item;
  if(item){const cost=offer?offer.price:salePrice(item),h=el('h3','',item.name+(item.quantity?' ×'+item.quantity:''));detail.append(h,el('p','trade-description',`${equipmentSummary(item)} ${itemDamageDescription(p,item)} · ${footprint(item).join('×')} cells`.trim()));
   const b=el('button','trade-confirm',`${offer?'Buy':'Sell'} ${item.name} · ${cost} gold`);b.id='trade-confirm';
   let reason='';if(offer){if(offer.stock<=0)reason='Sold out';else if(p.gold<cost)reason=`Need ${cost-p.gold} more gold`;else if(!addItem({inventory:p.inventory.map(i=>({...i}))},item))reason='No fitting satchel space';}else if(!p.inventory.includes(item))reason='Item is no longer carried';else if(equippedSlot(p,item))reason='Unequip before selling';
   b.disabled=Boolean(reason);b.onclick=()=>{const a=offer?{type:'buy',id:offer.id}:{type:'sell',index:p.inventory.indexOf(item)};perform(a);notice=game.state.log.at(-1);if(!offer&&!p.inventory.includes(item))selected=null;draw();};detail.append(b);if(reason)detail.append(el('span','trade-reason',reason));
  }else detail.append(el('p','trade-prompt','Select an offer to buy or a carried item to sell.'));
  const result=el('p','trade-result',notice);result.id='shop-result';result.setAttribute('role','status');detail.append(result);container.append(detail);
 }
 draw();
}
