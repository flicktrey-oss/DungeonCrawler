import { itemReward } from './loot.js';
export const ENCOUNTERS = {
  crypt:{tile:'D',name:'Forgotten crypt',description:'Two dangerous depths. Defeat the Warden for a guaranteed dungeon-only relic. Each crypt’s first-clear prize is available once per run. Retreat on upward stairs.'},
  den:{tile:'B',name:'Creature den',description:'A named beast guards this territory. Defeat it for its hoard.'},
  villager:{tile:'V',name:'Mirekeeper',description:'A villager needs help clearing three troublesome frogs.'},
  caravan:{tile:'W',name:'Abandoned caravan',description:'An old supply coffer, watched by scavengers.'},
  shrine:{tile:'S',name:'Wayfarer shrine',description:'A single blessing: 5 gold for 12 health, or 6 health for 25 Mana.'},
  cache:{tile:'K',name:'Hidden cache',description:'A disturbed grave and scraps of cloth point to buried supplies.'},
};
export function treasure(rng,danger,source='cache') {
  if(['den','crypt','boss'].includes(source))return itemReward(rng,danger,source);
  if(rng.next()<.8)return itemReward(rng,danger,source);
  return {kind:'gold',name:'Small purse',amount:rng.int(3,7)};
}
