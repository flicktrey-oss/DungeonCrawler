import {worldId,biomeAt} from './world.js';
export function useSurveyMap(g,index){
 const item=g.state.player.inventory[index];if(item?.kind!=='surveyMap')return false;
 const chart=g.surveyedRegions??new Map();let added=0;
 for(let ry=-2;ry<=2;ry++)for(let rx=-2;rx<=2;rx++)if(!chart.has(worldId(rx,ry))){chart.set(worldId(rx,ry),{rx,ry,biome:biomeAt(rx,ry,g.state.seed)});added++;}
 if(!added){g.message('This area is already charted. Keep or sell the map.');return false;}
 g.surveyedRegions=chart;g.state.player.inventory.splice(index,1);g.message('Survey map read: the 5×5 regions around camp are charted on your World map.');return true;
}
