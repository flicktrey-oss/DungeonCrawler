import {test,expect} from '@playwright/test';

for(const viewport of [{width:1366,height:768},{width:1280,height:720}])test(`desktop Chronicle visible without scrolling at ${viewport.width}×${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);
  await page.goto('/');await page.getByRole('button',{name:'New Game',exact:true}).click();
  const log=await page.locator('#log').boundingBox();
  expect(log.y).toBeGreaterThan(0);expect(log.y+log.height).toBeLessThanOrEqual(viewport.height);
  const map=await page.locator('#minimap-widget summary').boundingBox();
  const satchel=page.locator('#satchel-panel');
  await expect(satchel).not.toHaveAttribute('open','');
  const bag=await satchel.locator('summary').boundingBox();
  expect(bag.x).toBeGreaterThan(map.x+map.width);expect(Math.abs(bag.y-map.y)).toBeLessThan(5);
  await satchel.locator('summary').click();
  await page.getByRole('button',{name:'Character / equipment',exact:true}).click();
  await expect(page.getByRole('tab',{name:'Equipment',exact:true})).toHaveAttribute('aria-selected','true');
  await page.getByRole('button',{name:'Return',exact:true}).click();
  await page.keyboard.press('.');await expect(page.locator('#log')).toContainText('You listen to the darkness.');
  await expect(page.locator('.floor')).toContainText('TURN 1');
  await page.locator('#quest-panel summary').click();
  const quest=await page.locator('#quest-panel').boundingBox(), currentLog=await page.locator('#log').boundingBox();expect(quest.y).toBeGreaterThan(currentLog.y+currentLog.height);
  if(viewport.width===1366)await page.screenshot({path:'test-results/desktop-panels.png',fullPage:true});
});
