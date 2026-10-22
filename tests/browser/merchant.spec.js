import { test, expect } from '@playwright/test';
import { expeditionDriver } from './expedition-driver.js';

test('complete a frog quest, sell its reward and buy supplies using earned gold',async({page})=>{
 const d=await expeditionDriver(page,5);await d.east();const event=d.game.state.encounters.find(e=>e.type==='villager');
 await d.walk({x:event.x,y:event.y+1});await page.keyboard.press('e');
 await page.getByRole('button',{name:'Accept frog quest',exact:true}).click();d.game.action({type:'acceptQuest'});await page.getByRole('button',{name:'Return',exact:true}).click();
 for(const frog of d.game.state.enemies.filter(e=>e.questId))await d.hunt(frog);
 await d.walk({x:event.x,y:event.y+1});await page.keyboard.press('e');
 await page.getByRole('button',{name:'Claim Reedheart amulet',exact:true}).click();d.game.action({type:'claimQuest'});await page.getByRole('button',{name:'Return',exact:true}).click();
 await d.walk({x:0,y:15});await d.send({type:'move',dx:-1,dy:0});await d.walk({x:22,y:15});await page.keyboard.press('e');
 const index=d.game.state.player.inventory.findIndex(i=>i.kind==='amulet');await page.getByRole('button',{name:'Sell '+d.game.state.player.inventory[index].name+' · 12 gold',exact:true}).click();d.game.action({type:'sell',index});
 const before=d.game.state.player.gold;await page.getByRole('button',{name:'Buy Ember tonic · 10 gold',exact:true}).click();d.game.action({type:'buy',id:'tonic'});
 await expect(page.locator('#shop-gold')).toHaveText(`Your gold: ${before-10}`);await expect(page.locator('#shop-offers section').first()).toContainText('2 left');
 await page.getByRole('button',{name:'Return',exact:true}).click();await expect(page.locator('.floor')).toContainText(`TURN ${d.game.state.turn}`);
});

test('minimap stays fogged, follows the player, switches regions and can be collapsed for free', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'New Game', exact: true }).click();
  const map = page.locator('#minimap');
  await expect(map).toHaveAttribute('aria-label', /tile 20, 15/);
  const hiddenColor = await map.evaluate(c => Array.from(c.getContext('2d').getImageData(1, 1, 1, 1).data));
  expect(hiddenColor).toEqual([8, 12, 18, 255]);
  await page.getByLabel('Toggle minimap', { exact: true }).click(); await expect(map).not.toBeVisible();
  await page.getByLabel('Toggle minimap', { exact: true }).click(); await expect(map).toBeVisible(); await expect(page.locator('.floor')).toContainText('TURN 0');
  await page.getByLabel('Toggle minimap', { exact: true }).focus(); await page.keyboard.press('Enter'); await expect(map).not.toBeVisible(); await page.keyboard.press('Enter'); await expect(map).toBeVisible(); await expect(page.locator('.floor')).toContainText('TURN 0');
  for (let i = 0; i < 8; i++) await page.keyboard.press('d');
  await expect(map).toHaveAttribute('aria-label', /tile 28, 15/);
  await page.keyboard.press('Enter'); await expect(page.locator('#minimap-location')).toHaveText('0,0');
  for (let i = 0; i < 12; i++) await page.keyboard.press('d');
  await expect(page.locator('#minimap-location')).toHaveText('1,0'); await expect(page.locator('#camp-bearing')).toHaveText('Camp: 1 W');
});

test('one widget switches local/world in place, grows with travel and remembers its tab when minimized', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'New Game', exact: true }).click();
  const map = page.locator('#minimap'), world = page.getByRole('tab', { name: 'World', exact: true });
  await expect(page.locator('#minimap-widget')).toHaveCount(1); await expect(map).toHaveCount(1);
  const before = await map.boundingBox(); await world.click();
  await expect(world).toHaveAttribute('aria-selected', 'true');
  await expect(map).toHaveAttribute('aria-label', /1 visited regions/);
  expect(await map.boundingBox()).toEqual(before); await expect(page.locator('.floor')).toContainText('TURN 0');
  await page.getByLabel('Toggle minimap', { exact: true }).click(); await expect(map).not.toBeVisible(); await expect(world).not.toBeVisible();
  await expect(page.locator('#map-collapse-icon')).toHaveText('+');
  await page.getByLabel('Toggle minimap', { exact: true }).click(); await expect(world).toHaveAttribute('aria-selected', 'true');
  for (let i = 0; i < 20; i++) await page.keyboard.press('d');
  await expect(map).toHaveAttribute('aria-label', /2 visited regions.*Current region 1, 0/);
  await page.keyboard.press('a'); await expect(map).toHaveAttribute('aria-label', /2 visited regions.*Current region 0, 0/);
  await world.focus(); await page.keyboard.press('ArrowLeft'); await expect(page.getByRole('tab', { name: 'Local', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.floor')).toContainText('TURN 21'); await expect(map).toHaveAttribute('aria-label', /Explored map/);
});
