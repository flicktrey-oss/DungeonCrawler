import {gearTier,equipmentSummary} from './gear-progression.js';
import {recalculateGear} from './items.js';
export const BLACKSMITH={x:18,y:17,name:'Bram the Blacksmith'};
export const atBlacksmith=g=>Boolean(g.location.kind==='world'&&g.state.home&&Math.abs(g.state.player.x-BLACKSMITH.x)+Math.abs(g.state.player.y-BLACKSMITH.y)===1);
export const enhancementCap=item=>gearTier(item)===1?1:2;
export const canEnhance=item=>['weapon','armor','boots'].includes(item?.kind);
export const enhancementCost=item=>14*gearTier(item)*((item.enhancement??0)+1)**2;
export function enhanceEquipment(g,index){
 const p=g.state.player,item=Number.isInteger(index)?p.inventory[index]:null;
 if(!atBlacksmith(g)||!canEnhance(item)){g.message('Bring a weapon, body armor or boots to Bram at camp.');return false;}
 const level=item.enhancement??0,cost=enhancementCost(item);
 if(level>=enhancementCap(item)){g.message('This item is fully enhanced. Seek a higher equipment tier.');return false;}
 if(p.gold<cost){g.message(`Enhancement costs ${cost} gold.`);return false;}
 p.gold-=cost;item.enhancement=level+1;
 if(['weapon','armor'].includes(item.kind))item.bonus=(item.bonus??0)+1;else item.defenseBonus=(item.defenseBonus??0)+1;
 item.forgedBaseName??=item.name;item.name=`${item.forgedBaseName} +${item.enhancement}`;
 item.sellValue=(item.sellValue??1)+Math.floor(cost/4);recalculateGear(p);
 g.message(`Bram enhances ${item.name}: +1 ${item.kind==='weapon'?'attack':'raw protection'}. ${cost} gold spent.`);return true;
}
export function enhancementPreview(item){return `${equipmentSummary(item)} ${canEnhance(item)?(item.enhancement??0)>=enhancementCap(item)?'Fully enhanced.':`Next: +1 ${item.kind==='weapon'?'attack':'raw protection'} · ${enhancementCost(item)} gold.`:'Cannot be enhanced.'}`;}
