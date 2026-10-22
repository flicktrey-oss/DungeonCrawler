import {test,expect} from '@playwright/test';

for(const viewport of [{width:1366,height:768},{width:1280,height:720}])test(`fullscreen HUD keeps the world and essential actions visible at ${viewport.width}×${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);
  await page.goto('/');await page.getByRole('button',{name:'New Game',exact:true}).click();
  const canvas=await page.locator('#game > canvas').boundingBox();
  expect(canvas).toEqual({x:0,y:0,width:viewport.width,height:viewport.height});
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const stats=await page.locator('#stats').boundingBox(),dock=await page.locator('#touch-controls').boundingBox();
  expect(stats.y+stats.height).toBeLessThan(dock.y);
  for(const name of ['Open satchel [I]','Character / equipment','Pause / Help'])await expect(page.getByRole('button',{name,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Character / equipment',exact:true}).click();
  await expect(page.getByRole('tab',{name:'Equipment',exact:true})).toHaveAttribute('aria-selected','true');
  await page.getByRole('button',{name:'Return',exact:true}).click();
  await page.getByRole('button',{name:'Open satchel [I]',exact:true}).click();
  await expect(page.getByLabel('10 by 10 inventory grid',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Return',exact:true}).click();
  await page.keyboard.press('.');await expect(page.locator('#latest-event')).toContainText('You listen to the darkness.');
  await expect(page.locator('.floor')).toContainText('TURN 1');
  await expect(page.locator('#log')).toBeHidden();
  await page.locator('#chronicle-panel summary').click();await expect(page.locator('#log')).toContainText('You listen to the darkness.');
  const log=await page.locator('#log').boundingBox();expect(log.y).toBeGreaterThanOrEqual(0);expect(log.y+log.height).toBeLessThanOrEqual(viewport.height);
  await page.locator('#quest-panel summary').click();await expect(page.locator('#quest-info')).toBeVisible();
  await expect(page.locator('#minimap-widget')).not.toHaveAttribute('open','');
  await page.getByLabel('Toggle minimap',{exact:true}).click();
  await expect(page.locator('#minimap')).toBeVisible();await expect(page.locator('#quest-panel')).not.toHaveAttribute('open','');
  await expect(page.locator('.floor')).toContainText('TURN 1');
  if(viewport.width===1366)await page.screenshot({path:'test-results/desktop-panels.png',fullPage:true});
});

test('menus and HUD panels remain usable after resizing from desktop to phone',async({page})=>{
 await page.setViewportSize({width:1366,height:768});await page.goto('/');await page.getByRole('button',{name:'New Game',exact:true}).click();
 await page.locator('#chronicle-panel summary').click();await page.locator('#quest-panel summary').click();
 await page.setViewportSize({width:375,height:667});
 await expect(page.getByRole('button',{name:'Move east',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Open satchel [I]',exact:true}).click();
 await expect(page.getByLabel('10 by 10 inventory grid',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Return',exact:true}).click();
 await expect(page.locator('.floor')).toContainText('TURN 0');
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
});
