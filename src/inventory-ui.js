import {equipmentSummary} from './game/gear-progression.js';
import {itemDamageDescription} from './game/damage-rolls.js';
import {assignQuick,quickMatches,compareEquipment} from './game/quality.js';
import { equippedSlot, consumableKinds, isEquipment } from './game/items.js';
import { itemEmoji } from './item-icons.js';
import { inventoryLayout, footprint } from './game/inventory.js';
export function mountInventory(container, game, perform) {
  let selected=null, rotated=false, notice='Select an item, then tap an empty cell or set its row and column. Arranging is free; using or dropping takes a turn.';
  function draw(){
    const player=game.state.player,items=player.inventory,layout=inventoryLayout(items)??[];container.replaceChildren();
    const info=document.createElement('p');info.textContent=`${layout.reduce((n,p)=>n+p.w*p.h,0)} / 100 cells · ${items.length} items`;container.append(info);
    const grid=document.createElement('div');grid.className='bag-grid';grid.setAttribute('aria-label','10 by 10 inventory grid');
    const place=(x,y)=>{if(selected===null){notice='Select an item first.';draw();return;}notice=game.arrange(selected,x,y,rotated)?'Item moved. No turn spent.':'That footprint overlaps another item or leaves the bag.';draw();};
    for(let y=0;y<10;y++)for(let x=0;x<10;x++){const cell=document.createElement('div');cell.className='bag-cell';cell.style.gridArea=`${y+1} / ${x+1}`;cell.onclick=()=>place(x,y);grid.append(cell);}
    for(const p of layout){
      const item=items[p.index],b=document.createElement('button');b.className=`bag-item ${selected===p.index?'selected':''}`;if(equippedSlot(player,item)){b.classList.add('equipped');const badge=document.createElement('span');badge.className='bag-equipped';badge.textContent='✓';badge.title='Equipped';b.append(badge);}b.style.gridArea=`${p.y+1} / ${p.x+1} / span ${p.h} / span ${p.w}`;b.style.setProperty('--item-icon-size',Math.min(44,Math.min(p.w,p.h)*20)+'px');
      const icon=document.createElement('span');icon.className='bag-item-icon';icon.setAttribute('aria-hidden','true');icon.textContent=itemEmoji(item);b.append(icon);
      if(item.quantity){const count=document.createElement('span');count.className='bag-item-count';count.setAttribute('aria-hidden','true');count.textContent=item.quantity;b.append(count);}
      b.setAttribute('aria-label',`Select ${item.name}, ${p.w} by ${p.h}`);b.title=`${equippedSlot(player,item)?'Equipped · ':''}${item.name}${item.quantity?` ×${item.quantity}`:''} (${p.w}×${p.h})`;
      b.onclick=()=>{selected=p.index;rotated=Boolean(item.rotated);notice=`${item.name}${item.quantity?` ×${item.quantity}`:''}: ${equipmentSummary(item)} ${itemDamageDescription(player,item)}`;draw();};grid.append(b);
    }
    container.append(grid);
    const status=document.createElement('p');status.className='hint';status.setAttribute('role','status');status.textContent=notice;container.append(status);
    const item=items[selected],position=layout.find(p=>p.index===selected),controls=document.createElement('div');controls.className='bag-controls';
    const input=(name,value)=>{const label=document.createElement('label'),field=document.createElement('input');label.textContent=name+' ';field.type='number';field.min=1;field.max=10;field.value=value;field.setAttribute('aria-label',name);label.append(field);controls.append(label);return field;};
    const x=input('Column',(position?.x??0)+1),y=input('Row',(position?.y??0)+1);
    const button=(label,fn,disabled=false)=>{const b=document.createElement('button');b.textContent=label;b.disabled=disabled;b.onclick=fn;controls.append(b);};
    button('Place item',()=>place(Number(x.value)-1,Number(y.value)-1),!item);
    button('Rotate item',()=>{rotated=!rotated;notice=`${footprint({...item,rotated}).join('×')} orientation planned. Tap a destination or press Place item to apply it.`;status.textContent=notice;},!item||footprint(item)[0]===footprint(item)[1]);
    const slot=equippedSlot(player,item),projectile=['stone','knife','thunder'].includes(item?.kind);
    button(slot?'Unequip item':projectile?'Throw stones':'Use / equip',()=>perform(slot?{type:'unequip',slot}:{type:projectile?'targetThrow':consumableKinds.includes(item.kind)?'use':'equip',index:selected}),!item||!slot&&!projectile&&!consumableKinds.includes(item.kind)&&!isEquipment(item));
    button('Drop item',()=>perform({type:'drop',index:selected}),!item||Boolean(slot));
    if(slot){const note=document.createElement('p');note.className='hint';note.textContent='Equipped · '+slot+'. Still occupies satchel cells. Unequip before dropping, storing or selling.';controls.append(note);}
    if(item){for(let n=0;n<3;n++)button((quickMatches(game,n,item)?'Clear':'Assign to')+' quick slot '+(n+1),()=>{if(quickMatches(game,n,item)){game.quickSlots[n]=null;notice='Quick slot cleared. No turn spent.';}else{assignQuick(game,n,selected);notice='Assigned '+item.name+' to slot '+(n+1)+'. No turn spent.';}draw();});const comparison=compareEquipment(player,item);if(comparison){const p=document.createElement('p');p.className='equipment-comparison';p.textContent=comparison;container.append(p);}}
    container.append(controls);
  }
  draw();
}
