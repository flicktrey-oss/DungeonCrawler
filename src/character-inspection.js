import {key} from './game/dungeon.js';
import {attack,defense} from './game/items.js';
const races={rat:'Beast · Rat',beetle:'Insect · Beetle',pondFrog:'Amphibian · Frog',frog:'Amphibian · Frog',elite:'Beast · Boar',goat:'Beast · Prowler',ashling:'Elemental · Ashborn',wolf:'Beast · Wolf',boar:'Beast · Boar',leech:'Worm · Leech',guardian:'Undead · Warden',slime:'Slime',skeleton:'Undead · Skeleton',goblin:'Goblin',boss:'Undead · Ash Warden'};
export function characterAt(game,x,y){
 const s=game.state;
 if(!s.visible.has(key(x,y)))return null;
 if(s.player.x===x&&s.player.y===y)return s.player;
 const enemy=s.enemies.find(e=>e.hp>0&&e.x===x&&e.y===y);if(enemy)return enemy;
 if(s.map[y]?.[x]==='M')return {x,y,kind:'merchant',name:'Mara the Wayfarer',friendly:true};
 if(s.map[y]?.[x]==='V')return {x,y,kind:'villager',name:'The Mirekeeper',friendly:true};
 return null;
}
export function characterDetails(game,target){
 const player=target===game.state.player;
 return {name:player?'Your adventurer':target.name,kind:player?'player':target.kind,race:player||target.friendly?'Human':races[target.kind]??'Creature',strength:target.friendly?null:player?attack(target):target.attack,defense:target.friendly?null:player?defense(target):target.defense,hp:target.friendly?null:target.hp,maxHp:target.friendly?null:target.maxHp,friendly:target.friendly};
}
