import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
for(const touch of [false,true])test.describe(touch?'phone new expeditions':'desktop new expeditions',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('marsh trails announce the foothold, and Reedmaw has its own portrait and counterplay',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=await expeditionDriver(page,11,touch);await d.east();
  await expect(page.locator('#stats')).toContainText('Marsh trails: smaller prey');
  const owner=d.game.state.enemies.find(e=>e.miniboss==='reedmaw');expect(owner).toBeTruthy();
  await d.walk(owner,()=>d.game.state.visible.has(`${owner.x},${owner.y}`));
  const canvas=page.locator('#game > canvas'),box=await canvas.boundingBox(),p=d.game.state.player,zoom=touch?1.5:2;
  const position={x:box.width/2+(owner.x-p.x)*24*zoom,y:box.height/2+(owner.y-p.y)*24*zoom};
  if(touch)await canvas.tap({position});else await canvas.click({position});
  await expect(page.locator('#inspection-details h3')).toHaveText(owner.name);await expect(page.locator('.creature-trait')).toContainText('three-tile cardinal line');
  expect(await page.locator('.inspection-portrait').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  const turn=d.game.state.turn;await page.waitForTimeout(250);await expect(page.locator('.floor')).toContainText(`TURN ${turn}`);
  await page.screenshot({path:`test-results/reedmaw-${touch?'phone':'desktop'}.png`});
  const click=async locator=>touch?locator.tap():locator.click();await click(page.getByRole('button',{name:'Close character inspection'}));await click(page.locator('#quest-panel summary'));await click(page.getByRole('button',{name:'Creature index',exact:true}));await expect(page.locator('#creature-entries')).toContainText(owner.name);await expect(page.locator('#creature-entries')).toContainText('Guaranteed themed equipment hoard');await expect(page.locator('.floor')).toContainText(`TURN ${turn}`);expect(errors).toEqual([]);
 });
});
