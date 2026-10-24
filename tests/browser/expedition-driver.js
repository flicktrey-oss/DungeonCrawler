import {SeamlessExpedition} from '../../src/game/seamless-expedition.js';
import { expect } from '@playwright/test';
import { Expedition } from '../../src/game/expedition.js';
import { directions, walkable, key } from '../../src/game/dungeon.js';
// Drive the real UI against an independent deterministic simulation. No state is
// injected into the browser: every movement, attack and potion is actual input.
export async function expeditionDriver(page,seed=1,touch=false,preview=false){
  await page.clock.setFixedTime(new Date(seed));await page.goto('/');
  const start=page.getByRole('button',{name:preview?'Seamless preview':'New Game',exact:true});if(touch)await start.tap();else await start.click();
  const game=preview?new SeamlessExpedition(seed):new Expedition(seed);
  const stepNames={'0,-1':'north','0,1':'south','1,0':'east','-1,0':'west'},keys={'0,-1':'w','0,1':'s','1,0':'d','-1,0':'a'};
  async function send(a){
    const result=game.action(a);
    if(a.type==='move'){if(touch)await page.getByRole('button',{name:`Move ${stepNames[key(a.dx,a.dy)]}`,exact:true}).tap();else await page.keyboard.press(keys[key(a.dx,a.dy)]);}
    else if(touch)await page.getByRole('button',{name:({potion:'Potion',descend:'Enter ↓',ascend:'Leave ↑',pickup:'Collect',mindVision:'Vision · 25',wait:'Wait one turn'})[a.type],exact:true}).tap();
    else await page.keyboard.press(({potion:'h',descend:'Enter',ascend:'q',pickup:'e',mindVision:'m',wait:'.'})[a.type]);
    await expect(page.locator('.floor')).toContainText(`TURN ${game.state.turn}`);return result;
  }
  function firstStep(target){
    const p=game.state.player,queue=[{x:p.x,y:p.y,first:null}],seen=new Set([key(p.x,p.y)]);
    for(let i=0;i<queue.length;i++)for(const[dx,dy]of directions){const x=queue[i].x+dx,y=queue[i].y+dy,k=key(x,y);if(walkable(game.state.map,x,y)&&!seen.has(k)){const first=queue[i].first??{type:'move',dx,dy};if(x===target.x&&y===target.y)return first;seen.add(k);queue.push({x,y,first});}}
    throw Error(`No route to ${JSON.stringify(target)}`);
  }
  async function care(){if(game.state.status!=='playing')throw Error('Fixture adventurer died');if(game.state.player.hp<=12&&game.state.player.inventory.some(i=>i.kind==='potion'))await send({type:'potion'});}
  async function walk(target,stopWhen=()=>false){for(let i=0;i<250;i++){if(stopWhen())return;const p=game.state.player;if(p.x===target.x&&p.y===target.y)return;await care();await send(firstStep(target));}throw Error('Route did not finish');}
  async function east(){for(let i=0;i<20;i++)await send({type:'move',dx:1,dy:0});}
  async function hunt(enemy){for(let i=0;i<100&&enemy.hp>0;i++){await care();await send(firstStep(enemy));}if(enemy.hp>0)throw Error('Hunt did not finish');}
  return {game,send,walk,east,hunt,care,firstStep};
}

export async function selectOffer(page,name,touch=false){const tab=page.getByRole('tab',{name:'Merchant',exact:true});if(await tab.isVisible()){if(touch)await tab.tap();else await tab.click();}const b=page.getByRole('button',{name:`Select ${name} offer`,exact:true});if(touch)await b.tap();else await b.click();}
export async function selectSale(page,name,touch=false){const tab=page.getByRole('tab',{name:'Your satchel',exact:true});if(await tab.isVisible()){if(touch)await tab.tap();else await tab.click();}const b=page.getByRole('button',{name:`Select ${name} to sell`,exact:true}).first();if(touch)await b.tap();else await b.click();}
