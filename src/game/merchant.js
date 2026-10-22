import { addItem } from './inventory.js';
import { travelGear, potion, shortSword, trailSpear, buckler, throwingStones } from './items.js';

export const MERCHANT = { x: 22, y: 14 };
export function createMerchantStock() {
  return [
    { id: 'tonic', item: potion(), price: 10, stock: 3 },
    { id: 'spear', item: trailSpear(), price: 35, stock: 1 },
    { id: 'mail', item: travelGear('armor', 1), price: 30, stock: 1 },
    { id: 'shortsword', item: shortSword(), price: 18, stock: 1 },
    { id: 'buckler', item: buckler(), price: 24, stock: 1 },
    { id: 'stones', item: throwingStones(3), price: 4, stock: 5 },
  ];
}
export function buyFromMerchant(game, id) {
  if (!game.atMerchant()) { game.message('Stand beside the merchant at camp to trade.'); return false; }
  const offer = game.shop.find(entry => entry.id === id), p = game.state.player;
  if (!offer || offer.stock <= 0) { game.message('That item is not available.'); return false; }
  if (p.gold < offer.price) { game.message(`You need ${offer.price} gold for ${offer.item.name}.`); return false; }
  if (!addItem(p,offer.item)) { game.message('No fitting space in your satchel. Nothing was charged.'); return false; }
  p.gold -= offer.price; offer.stock--;
  game.message(`Bought ${offer.item.name} for ${offer.price} gold.`);
  return true;
}
