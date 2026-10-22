import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
for(const touch of [false,true])test.describe(touch?'phone inspection':'desktop inspection',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('inspect visible characters for free with an original portrait and live combat stats',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const d=await expeditionDriver(page,5,touch);
  async function inspect(target){
   const canvas=page.locator('#game > canvas'),b=await canvas.boundingBox(),p=d.game.state.player;
   const zoom=b.height<500?1.25:b.width<900?1.5:2,viewWidth=b.width/zoom,viewHeight=b.height/zoom;
   const sx=p.x*24+12-viewWidth/2,sy=p.y*24+12-viewHeight/2;
   const position={x:(target.x*24+12-sx)*zoom,y:(target.y*24+12-sy)*zoom};
   if(touch)await canvas.tap({position});else await canvas.click({position,modifiers:target!==d.game.state.player&&target.type==='villager'?['Shift']:[]});
  }
  await inspect(d.game.state.player);await expect(page.locator('#character-inspector')).toBeVisible();
  await expect(page.locator('#inspection-details')).toContainText('Human');await expect(page.locator('#inspection-details')).toContainText('32 / 32');
  await expect(page.locator('.floor')).toContainText('TURN 0');await page.getByRole('button',{name:'Close character inspection'}).click();
  await d.east();const event=d.game.state.encounters.find(e=>e.type==='villager');await d.walk({x:event.x,y:event.y+1});
  await inspect(event);await expect(page.locator('#inspection-details')).toContainText('The Mirekeeper');await expect(page.locator('#inspection-details')).toContainText('Noncombatant');
  await page.getByRole('button',{name:'Close character inspection'}).click();
  const enemy=d.game.state.enemies.find(e=>e.hp>0&&d.game.state.visible.has(`${e.x},${e.y}`));expect(enemy).toBeTruthy();
  const turn=d.game.state.turn;await inspect(enemy);
  await expect(page.locator('#inspection-details h3')).toHaveText(enemy.name);await expect(page.locator('#inspection-details')).toContainText(`${enemy.hp} / ${enemy.maxHp}`);
  await expect(page.locator('#inspection-details dt')).toHaveText(['Strength','Defense','Health']);
  expect(await page.locator('.inspection-portrait').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  await expect(page.locator('.floor')).toContainText(`TURN ${turn}`);
  await page.screenshot({path:`test-results/inspection-${touch?'phone':'desktop'}.png`,fullPage:true});
  await d.hunt(enemy);await expect(page.locator('#character-inspector')).toBeHidden();expect(errors).toEqual([]);
 });
});
