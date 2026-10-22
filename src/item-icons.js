// Emoji artwork follows the item family, including modified loot and legacy gear.
const icons={
 rawMeat:'🥩',cookedMeat:'🍖',potion:'🧪',ration:'🍞',cleanse:'🧴',mana:'⚗️',smoke:'🫙',
 stone:'🪨',knife:'🔪',thunder:'⚡',armor:'🦺',boots:'👢',
 ring:'💍',amulet:'📿',offhand:'🛡️',gold:'🪙',chest:'📦',questToken:'🧿'
};
export function itemEmoji(item){
 if(item.kind==='weapon'){
  if(item.weaponType==='axe'||/axe|hatchet|cleaver/i.test(item.baseName??item.name))return '🪓';
  if(item.weaponType==='spear'||item.reach>=2||/spear/i.test(item.baseName??item.name))return '🔱';
  if(/knife/i.test(item.baseName??item.name))return '🔪';
  return '🗡️';
 }
 if(item.kind==='offhand'&&item.relic)return /lantern/i.test(item.baseName??item.name)?'🏮':'🔮';
 if(item.kind==='boots'&&/shoe|softstep/i.test(item.baseName??item.name))return '🥾';
 if(item.kind==='armor'&&/gambeson/i.test(item.baseName??item.name))return '🥋';
 if(item.kind==='trophy'){
  if(/fang/i.test(item.name))return '🦷';
  if(/pearl/i.test(item.name))return '⚪';
  return '🦴';
 }
 return icons[item.kind]??'🎒';
}
