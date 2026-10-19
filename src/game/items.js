export function equipment(kind, floor) {
  const weapon=kind==='weapon';
  return {kind,name:weapon?['Iron knife','Ashwood spear','Vault blade','Runic axe','Dawn cleaver'][floor-1]:['Leather vest','Ringmail','Iron cuirass','Runic mail','Dawn plate'][floor-1],bonus:floor+(weapon?1:0),description:weapon?'Adds attack while equipped.':'Reduces incoming damage while equipped.'};
}
export const potion = () => ({kind:'potion',name:'Ember tonic',description:'Restores 16 health. Using it costs one turn.'});
export const attack = p => p.attack+(p.weapon?.bonus??0);
export const defense = p => p.defense+(p.armor?.bonus??0);
export const threshold = p => p.level*12;
