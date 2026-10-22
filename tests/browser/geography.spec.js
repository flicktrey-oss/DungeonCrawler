import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
for(const touch of [false,true])test.describe(touch?'phone dangerous frontier':'desktop dangerous frontier',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('warns before an early mountain crossing, grants arrival grace and allows immediate retreat',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=await expeditionDriver(page,5,touch);
  await d.walk({x:0,y:15});expect(d.game.location.rx).toBe(0);expect(d.game.state.player.hp).toBe(32);
  await expect(page.locator('#travel-warning')).toContainText('Broken Highlands');await expect(page.locator('#travel-warning')).toContainText('OVERWHELMING');
  const turn=d.game.state.turn;await page.waitForTimeout(250);await expect(page.locator('.floor')).toContainText('TURN '+turn);
  await d.send({type:'move',dx:-1,dy:0});expect(d.game.state.biome).toBe('highlands');expect(d.game.state.enemies.some(e=>e.attack>=12)).toBe(true);
  expect(d.game.state.enemies.every(e=>e.actions===0)).toBe(true);await expect(page.locator('#stats .bar').first()).toContainText('Health 32 / 32');
  await expect(page.locator('#stats h2')).toHaveText('Broken Highlands (-1, 0)');
  await d.send({type:'move',dx:1,dy:0});expect(d.game.location.rx).toBe(0);await expect(page.locator('.floor')).toContainText('SAFE CAMP');await expect(page.locator('#stats .bar').first()).toContainText('Health 32 / 32');expect(errors).toEqual([]);
 });
});
test('holding a movement key stops at a dangerous border before committing to the crossing',async({page})=>{
 const d=await expeditionDriver(page,5);await d.walk({x:1,y:15});const turn=d.game.state.turn;
 await page.keyboard.down('a');await expect(page.locator('#travel-warning')).toContainText('OVERWHELMING');await page.waitForTimeout(650);
 await expect(page.locator('.floor')).toContainText('TURN '+(turn+1));await expect(page.locator('.floor')).toContainText('SAFE CAMP');await page.keyboard.up('a');
 d.game.action({type:'move',dx:-1,dy:0});await d.send({type:'move',dx:-1,dy:0});await expect(page.locator('#stats h2')).toHaveText('Broken Highlands (-1, 0)');
});
