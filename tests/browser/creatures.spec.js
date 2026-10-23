import {test,expect} from '@playwright/test';
import {walkable} from '../../src/game/dungeon.js';
import {expeditionDriver} from './expedition-driver.js';
for(const touch of [false,true])test.describe(touch?'phone creature warnings':'desktop creature warnings',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('shows distinct portraits, inspection traits and a frozen tongue warning between turns',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=await expeditionDriver(page,5,touch);await d.east();
  const villager=d.game.state.encounters.find(e=>e.type==='villager');await d.walk({x:villager.x,y:villager.y+1});
  const nearest=d.game.state.enemies.filter(e=>e.questId&&e.hp>0).sort((a,b)=>Math.abs(a.x-d.game.state.player.x)+Math.abs(a.y-d.game.state.player.y)-Math.abs(b.x-d.game.state.player.x)-Math.abs(b.y-d.game.state.player.y))[0];
  const approach=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:nearest.x+dx,y:nearest.y+dy})).find(p=>walkable(d.game.state.map,p.x,p.y)&&!d.game.state.enemies.some(e=>e.hp>0&&e.x===p.x&&e.y===p.y));
  await d.walk(approach,()=>d.game.state.enemies.some(e=>e.hp>0&&e.intent?.kind==='tongue'));
  let frog=d.game.state.enemies.find(e=>e.hp>0&&e.intent?.kind==='tongue');
  for(let i=0;i<8&&!frog;i++){await d.care();await d.send({type:'wait'});frog=d.game.state.enemies.find(e=>e.hp>0&&e.intent?.kind==='tongue');}
  expect(frog).toBeTruthy();await expect(page.locator('#combat-warning')).toContainText('next turn');const turn=d.game.state.turn,canvas=page.locator('#game > canvas'),box=await canvas.boundingBox(),p=d.game.state.player,zoom=touch?1.5:2;
  const position={x:box.width/2+(frog.x-p.x)*24*zoom,y:box.height/2+(frog.y-p.y)*24*zoom};
  if(touch)await canvas.tap({position});else await canvas.click({position});
  await expect(page.locator('.creature-trait')).toContainText('Tongue lash');await expect(page.locator('.creature-warning')).toContainText('Tongue lash next turn');
  expect(await page.locator('.inspection-portrait').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  await expect.poll(()=>canvas.evaluate(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=0;i<data.length;i+=4)if(data[i]===239&&data[i+1]===154&&data[i+2]===184)return true;return false;})).toBe(true);
  await page.waitForTimeout(300);await expect(page.locator('.floor')).toContainText(`TURN ${turn}`);
  await page.screenshot({path:`test-results/creature-warning-${touch?'phone':'desktop'}.png`,fullPage:true});expect(errors).toEqual([]);
 });
});
