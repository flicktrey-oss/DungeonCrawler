import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
import {key} from '../../src/game/dungeon.js';
for(const touch of [false,true])test.describe(touch?'phone creature variants':'desktop creature variants',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('recognizes a marked woodland veteran and inspects its stats and behavior without spending a turn',async({page})=>{
  test.setTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=await expeditionDriver(page,6,touch,true),g=d.game,e=g.state.enemies.find(e=>e.variant==='veteran'&&e.originArea==='world:0,1');expect(e).toBeTruthy();await d.walk({x:20,y:35},()=>g.state.visible.has(key(e.x,e.y)));expect(g.state.visible.has(key(e.x,e.y))).toBe(true);const turn=g.state.turn,canvas=page.locator('#game > canvas'),box=await canvas.boundingBox(),zoom=touch?1.5:2,position={x:box.width/2+(e.x-g.state.player.x)*24*zoom,y:box.height/2+(e.y-g.state.player.y)*24*zoom};if(touch)await canvas.tap({position});else await canvas.click({position});await expect(page.locator('#inspection-details h3')).toHaveText(e.name);await expect(page.locator('.creature-trait')).toContainText('Veteran');await expect(page.locator('.creature-trait')).toContainText('Sap spit');await expect(page.locator('.floor')).toContainText('TURN '+turn);await page.waitForTimeout(250);await expect(page.locator('.floor')).toContainText('TURN '+turn);await page.screenshot({path:`test-results/creature-variants-${touch?'phone':'desktop'}.png`});expect(errors).toEqual([]);
 });
});
