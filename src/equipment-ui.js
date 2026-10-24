import {equipmentSummary} from './game/gear-progression.js';
import {itemDamageDescription,playerOffenseRange,rangeLabel} from './game/damage-rolls.js';
import {compareEquipment} from './game/quality.js';
import { adventurerSvg } from './render/adventurer.js';
import { attack, defense, isEquipment, slotsFor, shieldChance, gearBonus, rawDefense, equippedSlot } from './game/items.js';
const slots={weapon:{label:'Main hand',icon:'⚔'},armor:{label:'Body',icon:'▣'},amulet:{label:'Neck',icon:'◇'},offhand:{label:'Off hand',icon:'⬡'},boots:{label:'Boots',icon:'♧'},ring1:{label:'Ring 1',icon:'○'},ring2:{label:'Ring 2',icon:'○'}};
export function mountEquipment(container,game,perform,initialSlot='weapon') {
  let selected=initialSlot;
  function draw(){
    const p=game.state.player;container.replaceChildren();
    const stats=document.createElement('p');stats.className='equipment-stats';stats.textContent=`Level ${p.level} · ${attack(p)} attack · ${defense(p)} defense · ${rangeLabel(playerOffenseRange(p))} damage`;container.append(stats);
    const protection=document.createElement('p');protection.className='hint';protection.textContent='Ordinary DEF '+defense(p)+' from '+rawDefense(p)+' raw protection. Above 3, each 2 raw points adds 1 DEF. Special-attack protection: +'+gearBonus(p,'wardedBonus')+'.';container.append(protection);
    if(p.offhand?.blockChance){const note=document.createElement('p');note.className='hint';note.textContent='Shield: '+Math.round(shieldChance(p)*100)+'% melee / '+Math.round(shieldChance(p,true)*100)+'% ranged block';container.append(note);}
    const portrait=document.createElement('div');portrait.className='equipment-portrait';
    portrait.innerHTML=adventurerSvg(p);
    for(const[slot,meta]of Object.entries(slots)){
      const item=p[slot],b=document.createElement('button');b.className=`portrait-slot slot-${slot}${selected===slot?' selected':''}`;b.dataset.portraitSlot=slot;b.dataset.equipped=String(Boolean(item));
      b.setAttribute('aria-label',`${meta.label} slot: ${item?.name??'Empty'}`);b.setAttribute('aria-pressed',String(selected===slot));
      const icon=document.createElement('span');icon.className='slot-icon';icon.textContent=meta.icon;
      const name=document.createElement('span');name.textContent=meta.label;b.append(icon,name);b.onclick=()=>{selected=slot;draw();};portrait.append(b);
    }
    container.append(portrait);
    const detail=document.createElement('section'),h=document.createElement('h3'),description=document.createElement('p'),item=p[selected];
    h.textContent=`${slots[selected].label}: ${item?.name??'Empty'}`;description.textContent=item?equipmentSummary(item)+' '+itemDamageDescription(p,item):'Select carried equipment below to fill this slot.';
    detail.append(h,description);
    const unequip=document.createElement('button');unequip.textContent=`Unequip ${item?.name??slots[selected].label}`;unequip.disabled=!item;unequip.onclick=()=>perform({type:'unequip',slot:selected});detail.append(unequip);container.append(detail);
    const heading=document.createElement('h3');heading.textContent='Equip from satchel';container.append(heading);let count=0;
    p.inventory.forEach((item,index)=>{if(!isEquipment(item)||equippedSlot(p,item))return;count++;const b=document.createElement('button');b.className='item';b.textContent=`Equip ${item.name}`;const note=document.createElement('small');note.className='item-description';note.textContent=compareEquipment(p,item,slotsFor(item).includes(selected)?selected:undefined);b.setAttribute('aria-label',b.textContent);b.append(note);b.onclick=()=>perform({type:'equip',index,...(slotsFor(item).includes(selected)?{slot:selected}:{})});container.append(b);});
    if(!count){const empty=document.createElement('p');empty.className='hint';empty.textContent='No spare equipment in your satchel.';container.append(empty);}
  }
  draw();
}
