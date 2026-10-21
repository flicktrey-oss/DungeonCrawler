export function equipment(kind, floor) {
  const weapon=kind==='weapon';
  return {kind,name:weapon?['Iron knife','Ashwood spear','Vault blade','Runic axe','Dawn cleaver'][floor-1]:['Leather vest','Ringmail','Iron cuirass','Runic mail','Dawn plate'][floor-1],bonus:floor+(weapon?1:0),description:weapon?'Adds attack while equipped.':'Reduces incoming damage while equipped.'};
}
export const potion = () => ({kind:'potion',name:'Ember tonic',description:'Restores 16 health. Using it costs one turn.'});
export const attack = p => p.attack+(p.weapon?.bonus??0);
export const defense = p => p.defense+(p.armor?.bonus??0)+(p.amulet?.bonus??0);
export const threshold = p => p.level*(p.slowProgression?20:12);

export function travelGear(kind,tier=1) {
  const weapon=kind==='weapon', names=weapon?['Worn longsword','Trail spear','Forged falchion','Ember greatsword']:['Patched vest','Reinforced leather','Ridge mail','Ashguard plate'];
  const level=Math.max(1,Math.min(4,tier));
  return {kind,name:names[level-1],bonus:level,size:weapon?[7,2]:[4,4],sellValue:level*4,description:`+${level} ${weapon?'attack':'defense'} while equipped. Takes ${weapon?'7×2':'4×4'} satchel cells.`};
}
export const reedAmulet=()=>({kind:'amulet',name:'Reedheart amulet',bonus:1,size:[2,2],sellValue:12,description:'+1 defense while equipped. A villager’s gratitude, bound in silver reeds.'});
export const trophy=(kind)=>({kind:'trophy',name:kind==='frog'?'Frog pearl':kind==='rat'?'Chipped fang':'Weathered claw',sellValue:kind==='frog'?3:2,size:[1,1],description:'A small hunting trophy. Sell it to Mara at camp.'});
