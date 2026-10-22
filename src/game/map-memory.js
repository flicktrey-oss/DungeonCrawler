import {key} from './dungeon.js';
// Remembered terrain must not disclose a newly rolled NPC or reward out of sight.
export function rememberedTile(state,x,y){
 const tile=state.map[y][x];
 if(state.encounterSeen&&['B','V','W','S','K'].includes(tile)&&!state.encounterSeen.has(key(x,y)))return state.baseMap?.[y]?.[x]??',';
 return tile;
}
