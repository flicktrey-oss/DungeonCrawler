import {addItem} from './inventory.js';
import {skeletonKey} from './items.js';
export const GRAVEKEEPER={x:16,y:18,name:'Orren the Grave Keeper'};
export const boneCount=p=>p.inventory.filter(i=>i.kind==='bones').reduce((n,i)=>n+i.quantity,0);
export const atGravekeeper=g=>Boolean(g.state.home&&Math.abs(g.state.player.x-GRAVEKEEPER.x)+Math.abs(g.state.player.y-GRAVEKEEPER.y)===1);
export function spendStack(p,kind,amount){for(let i=0;i<p.inventory.length&&amount>0;){const item=p.inventory[i];if(item.kind!==kind){i++;continue;}const n=Math.min(amount,item.quantity);item.quantity-=n;amount-=n;if(!item.quantity)p.inventory.splice(i,1);else i++;}return amount===0;}
export function tradeBones(g){
 const p=g.state.player;if(!atGravekeeper(g)||boneCount(p)<5){g.message('Orren needs five bones for one skeleton key.');return false;}
 const trial={inventory:p.inventory.map(i=>({...i}))};spendStack(trial,'bones',5);
 if(!addItem(trial,skeletonKey())){g.message('Make room for the skeleton key first. Your bones are safe.');return false;}
 spendStack(p,'bones',5);addItem(p,skeletonKey());g.message('Orren takes five bones and gives you a skeleton key. Seek locked reliquaries on crypt depth two.');return true;
}
