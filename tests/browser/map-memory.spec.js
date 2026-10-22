import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
for(const touch of [false,true])test.describe(touch?'phone map memory':'desktop map memory',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('keeps explored local minimap terrain after leaving and returning',async({page})=>{
  const d=await expeditionDriver(page,1,touch);await d.east();await d.walk({x:8,y:15});await d.walk({x:0,y:15});
  if(touch)await page.getByLabel('Toggle minimap',{exact:true}).tap();
  const pixel=()=>page.locator('#minimap').evaluate(c=>[...c.getContext('2d').getImageData(42,62,1,1).data]);
  const before=await pixel(),explored=d.game.state.explored.size;
  expect(before.slice(0,3)).not.toEqual([8,12,18]);expect(d.game.state.explored.has('10,15')).toBe(true);expect(d.game.state.visible.has('10,15')).toBe(false);
  await d.send({type:'move',dx:-1,dy:0});await d.send({type:'move',dx:1,dy:0});
  await expect(page.locator('#stats h2')).toHaveText('Whisperwood (1, 0)');expect(d.game.state.explored.size).toBeGreaterThanOrEqual(explored);expect(d.game.state.visit).toBe(1);
  expect(await pixel()).toEqual(before);expect(d.game.state.enemies.every(e=>e.hp===e.maxHp)).toBe(true);
 });
});
