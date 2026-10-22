import { potion, travelGear, shortSword, trailSpear, buckler, throwingStones } from './items.js';
export const ENCOUNTERS = {
  crypt:{tile:'D',name:'Forgotten crypt',description:'Two dangerous depths. Enter to descend; retreat on upward stairs.'},
  den:{tile:'B',name:'Creature den',description:'A named beast guards this territory. Defeat it for its hoard.'},
  villager:{tile:'V',name:'Mirekeeper',description:'A villager needs help clearing three troublesome frogs.'},
  caravan:{tile:'W',name:'Abandoned caravan',description:'An old supply coffer, watched by scavengers.'},
  shrine:{tile:'S',name:'Wayfarer shrine',description:'A single blessing: 5 gold for 12 health, or 6 health for 25 Mana.'},
  cache:{tile:'K',name:'Hidden cache',description:'A disturbed grave and scraps of cloth point to buried supplies.'},
};
export function treasure(rng,danger) {
  const roll=rng.next();
  if(roll<.06)return danger<4?rng.pick([shortSword(),trailSpear(),buckler(),travelGear('armor',1)]):travelGear(rng.pick(['weapon','armor']),Math.min(4,1+Math.floor(danger/3)));
  if(roll<.18)return throwingStones(rng.int(2,3));
  if(roll<.45)return potion();
  return {kind:'gold',name:'Small purse',amount:rng.int(2,5)+Math.floor(danger/2)};
}
