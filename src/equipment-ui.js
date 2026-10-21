import { attack, defense } from './game/items.js';
const slots={weapon:{label:'Weapon',icon:'⚔'},armor:{label:'Armor',icon:'▣'},amulet:{label:'Neck',icon:'◇'}};
export function mountEquipment(container,game,perform,initialSlot='weapon') {
  let selected=initialSlot;
  function draw(){
    const p=game.state.player;container.replaceChildren();
    const stats=document.createElement('p');stats.className='equipment-stats';stats.textContent=`Level ${p.level} · ${attack(p)} attack · ${defense(p)} defense`;container.append(stats);
    const portrait=document.createElement('div');portrait.className='equipment-portrait';
    portrait.innerHTML=`<svg viewBox="0 0 240 260" role="img" aria-label="Adventurer with equipped weapon, armor and neck item" shape-rendering="crispEdges">
      <ellipse cx="120" cy="243" rx="49" ry="8" fill="#090e16"/>
      <path d="M86 106H154V215H86Z" fill="#3b6263"/><path d="M91 205H112V241H91ZM128 205H149V241H128Z" fill="#465263"/>
      <path d="M83 115H64V191H85ZM155 115H176V191H155Z" fill="#b5b9a0"/>
      <path d="M98 43H142V96H98Z" fill="#e0bd8d"/><path d="M94 35H146V52H94ZM94 48H102V70H94Z" fill="#5c453e"/>
      <path d="M107 63H113V69H107ZM128 63H134V69H128Z" fill="#26333b"/>
      <path d="M88 100H152V124H88Z" fill="#74b5ad"/>
      ${p.armor?'<path data-armor-icon d="M90 124H150V195L120 210L90 195Z" fill="#96a7b9" stroke="#d3d9c7" stroke-width="4"/><path d="M120 132V196" stroke="#536b7d" stroke-width="3"/>':''}
      ${p.weapon?'<path data-weapon-icon d="M181 108L187 100L193 108V186H181Z" fill="#d5e1df"/><path d="M174 184H200V191H174ZM183 191H191V218H183Z" fill="#b08a59"/>':''}
      ${p.amulet?'<path d="M108 104L120 122L132 104" fill="none" stroke="#dabb77" stroke-width="3"/><path data-amulet-icon d="M120 115L128 124L120 134L112 124Z" fill="#85e9cf" stroke="#e9d698" stroke-width="2"/>':''}
    </svg>`;
    for(const[slot,meta]of Object.entries(slots)){
      const item=p[slot],b=document.createElement('button');b.className=`portrait-slot slot-${slot}${selected===slot?' selected':''}`;b.dataset.portraitSlot=slot;b.dataset.equipped=String(Boolean(item));
      b.setAttribute('aria-label',`${meta.label} slot: ${item?.name??'Empty'}`);b.setAttribute('aria-pressed',String(selected===slot));
      const icon=document.createElement('span');icon.className='slot-icon';icon.textContent=meta.icon;
      const name=document.createElement('span');name.textContent=meta.label;b.append(icon,name);b.onclick=()=>{selected=slot;draw();};portrait.append(b);
    }
    container.append(portrait);
    const detail=document.createElement('section'),h=document.createElement('h3'),description=document.createElement('p'),item=p[selected];
    h.textContent=`${slots[selected].label}: ${item?.name??'Empty'}`;description.textContent=item?`${item.description} (+${item.bonus} ${selected==='weapon'?'attack':'defense'})`:'Select carried equipment below to fill this slot.';
    detail.append(h,description);
    const unequip=document.createElement('button');unequip.textContent=`Unequip ${item?.name??slots[selected].label}`;unequip.disabled=!item;unequip.onclick=()=>perform({type:'unequip',slot:selected});detail.append(unequip);container.append(detail);
    const heading=document.createElement('h3');heading.textContent='Equip from satchel';container.append(heading);let count=0;
    p.inventory.forEach((item,index)=>{if(!Object.hasOwn(slots,item.kind))return;count++;const b=document.createElement('button');b.className='item';b.textContent=`Equip ${item.name}`;const note=document.createElement('small');note.className='item-description';note.textContent=item.description;b.setAttribute('aria-label',b.textContent);b.append(note);b.onclick=()=>perform({type:'equip',index});container.append(b);});
    if(!count){const empty=document.createElement('p');empty.className='hint';empty.textContent='No spare equipment in your satchel.';container.append(empty);}
  }
  draw();
}
