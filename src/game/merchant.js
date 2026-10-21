import { equipment, potion } from './items.js';

export const MERCHANT = { x: 22, y: 14 };
export function createMerchantStock() {
  return [
    { id: 'tonic', item: potion(), price: 10, stock: 3 },
    { id: 'spear', item: equipment('weapon', 2), price: 35, stock: 1 },
    { id: 'mail', item: equipment('armor', 2), price: 30, stock: 1 },
  ];
}
export function buyFromMerchant(game, id) {
  if (!game.atMerchant()) { game.message('Stand beside the merchant at camp to trade.'); return false; }
  const offer = game.shop.find(entry => entry.id === id), p = game.state.player;
  if (!offer || offer.stock <= 0) { game.message('That item is not available.'); return false; }
  if (p.gold < offer.price) { game.message(`You need ${offer.price} gold for ${offer.item.name}.`); return false; }
  p.gold -= offer.price; offer.stock--;
  p.inventory.push({ ...offer.item });
  game.message(`Bought ${offer.item.name} for ${offer.price} gold.`);
  return true;
}
