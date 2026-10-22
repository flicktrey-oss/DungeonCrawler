export const BAG_SIZE = 10;
export function footprint(item) {
  const base = item.size ?? ({ weapon: [7, 2], armor: [4, 4], amulet: [2, 2], offhand: [3, 3] }[item.kind] ?? [1, 1]);
  return item.rotated ? [base[1], base[0]] : base;
}
export function inventoryLayout(items) {
  const occupied = new Set(), placed = [];
  const fits = (x, y, w, h) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x + w <= BAG_SIZE && y + h <= BAG_SIZE && !Array.from({length:h},(_,dy)=>Array.from({length:w},(_,dx)=>`${x+dx},${y+dy}`)).flat().some(k=>occupied.has(k));
  for (let index = 0; index < items.length; index++) {
    const item = items[index], [w, h] = footprint(item); let x = item.bagX, y = item.bagY;
    if (!fits(x, y, w, h)) {
      x = undefined;
      outer: for (let yy = 0; yy <= BAG_SIZE-h; yy++) for (let xx = 0; xx <= BAG_SIZE-w; xx++) if (fits(xx, yy, w, h)) { x=xx; y=yy; break outer; }
    }
    if (x === undefined) return null;
    for (let dy=0;dy<h;dy++) for(let dx=0;dx<w;dx++) occupied.add(`${x+dx},${y+dy}`);
    placed.push({index,x,y,w,h});
  }
  return placed;
}
export function settleInventory(items) {
  const layout = inventoryLayout(items); if (!layout) return false;
  for(const p of layout) Object.assign(items[p.index],{bagX:p.x,bagY:p.y}); return true;
}
export function looseItem(item) { const copy={...item}; delete copy.x;delete copy.y;delete copy.bagX;delete copy.bagY;return copy; }
export function addItem(player,item) {
  if(item.kind==='stone'){
    if(!Number.isInteger(item.quantity)||item.quantity<=0)return false;
    const items=player.inventory.map(i=>({...i}));let remaining=item.quantity;
    for(const stack of items)if(stack.kind==='stone'&&stack.quantity<9){const amount=Math.min(9-stack.quantity,remaining);stack.quantity+=amount;remaining-=amount;if(!remaining)break;}
    while(remaining>0){const amount=Math.min(9,remaining);items.push({...looseItem(item),quantity:amount});remaining-=amount;}
    if(!inventoryLayout(items))return false;
    player.inventory.splice(0,player.inventory.length,...items);settleInventory(player.inventory);return true;
  }
  const copy=looseItem(item), items=[...player.inventory,copy];
  if (!inventoryLayout(items)) { copy.rotated=!copy.rotated; if(!inventoryLayout(items))return false; }
  player.inventory.push(copy);settleInventory(player.inventory);return true;
}
export function moveItem(items,index,x,y,rotate=false) {
  if(!Number.isInteger(index)||!items[index])return false;
  const layout=inventoryLayout(items);if(!layout)return false;
  const item={...items[index],rotated:rotate},[w,h]=footprint(item);
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x+w>BAG_SIZE||y+h>BAG_SIZE)return false;
  if(layout.some(p=>p.index!==index&&x<p.x+p.w&&x+w>p.x&&y<p.y+p.h&&y+h>p.y))return false;
  Object.assign(items[index],{bagX:x,bagY:y,rotated:rotate});return true;
}
