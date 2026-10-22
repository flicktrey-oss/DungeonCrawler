export function equipment(kind, floor) {
  const weapon=kind==='weapon';
  return {kind,name:weapon?['Iron knife','Ashwood spear','Vault blade','Runic axe','Dawn cleaver'][floor-1]:['Leather vest','Ringmail','Iron cuirass','Runic mail','Dawn plate'][floor-1],bonus:floor+(weapon?1:0),description:weapon?'Adds attack while equipped.':'Reduces incoming damage while equipped.'};
}
export const potion = () => ({kind:'potion',name:'Ember tonic',description:'Restores 16 health. Using it costs one turn.'});
export const attack = p => p.attack+(p.weapon?.bonus??0);
export const defense = p => p.defense+(p.armor?.bonus??0)+(p.amulet?.bonus??0);
export const threshold = p => p.level*(p.slowProgression?20:12);

export function travelGear(kind,tier=1) {
  const weapon=kind==='weapon', names=weapon?['Worn shortsword','Iron-tipped spear','Forged falchion','Ember greatsword']:['Patched vest','Reinforced leather','Ridge mail','Ashguard plate'];
  const level=Math.max(1,Math.min(4,tier));
  return {kind,name:names[level-1],bonus:level,...(weapon&&level===2?{reach:2,weaponType:'spear'}:weapon?{weaponType:'sword'}:{}),size:weapon?[7,2]:[4,4],sellValue:level*4,description:`${weapon&&level===2?'+1 Reach (clear cardinal line, 2 tiles). ':''}+${level} ${weapon?'attack':'defense'} while equipped. Takes ${weapon?'7×2':'4×4'} satchel cells.`};
}
export const reedAmulet=()=>({kind:'amulet',name:'Reedheart amulet',bonus:1,size:[2,2],sellValue:12,description:'+1 defense while equipped. A villager’s gratitude, bound in silver reeds.'});
export const trophy=(kind)=>({kind:'trophy',name:kind==='frog'?'Frog pearl':kind==='rat'?'Chipped fang':'Weathered claw',sellValue:kind==='frog'?3:2,size:[1,1],description:'A small hunting trophy. Sell it to Mara at camp.'});

export const shortSword=()=>({...travelGear('weapon',1),name:'Worn shortsword',weaponType:'sword',description:'+1 attack. Reliable adjacent strikes. Main hand; 7×2 cells.'});
export const trailSpear=()=>({kind:'weapon',name:'Trail spear',weaponType:'spear',bonus:0,reach:2,size:[7,2],sellValue:6,description:'+1 Reach: strike 1–2 tiles in a cardinal direction through a clear line. No attack bonus. Main hand; 7×2 cells.'});
export const buckler=()=>({kind:'offhand',name:'Weathered buckler',bonus:0,brace:3,size:[3,3],sellValue:5,description:'Off hand. Unlocks Brace: +3 defense against the next enemy phase. Takes one turn; no Mana cost. 3×3 cells.'});
export const throwingStones=(quantity=1)=>({kind:'stone',name:'Throwing stones',quantity,size:[1,1],description:'Throw up to 4 tiles for 2 damage before defense (minimum 1). One stone and one turn; 50% recovery chance. Stacks of 9 occupy 1×1.'});
export const stoneCount=p=>p.inventory.filter(i=>i.kind==='stone').reduce((n,i)=>n+i.quantity,0);
export const salePrice=item=>item.kind==='stone'?item.quantity:item.sellValue??(item.kind==='potion'?3:1);
