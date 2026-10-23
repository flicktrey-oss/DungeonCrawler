import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
for(const touch of [false,true])test.describe(touch?'phone gravekeeper':'desktop gravekeeper',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('uses only configurable item slots and visits the gravekeeper beside camp bones',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=await expeditionDriver(page,5,touch),click=async loc=>touch?loc.tap():loc.click();
  await expect(page.locator('[data-control=reach]')).toHaveCount(0);await expect(page.locator('[data-control=throw]')).toHaveCount(0);await expect(page.locator('.custom-slot')).toHaveCount(3);await expect(page.getByRole('button',{name:'Quick slot 1: Throwing stones',exact:true})).toBeEnabled();
  const latest=await page.locator('#latest-event').textContent();await page.keyboard.press('r');await page.keyboard.press('t');await expect(page.locator('#latest-event')).toHaveText(latest);
  await d.walk({x:17,y:18});const turn=d.game.state.turn;await click(page.getByRole('button',{name:'Trade bones',exact:true}));await expect(page.getByRole('heading',{name:'Orren the Grave Keeper',exact:true})).toBeVisible();await expect(page.getByText('Your bones: 0',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Trade 5 bones for a key',exact:true})).toBeDisabled();await expect(page.locator('.floor')).toContainText('TURN '+turn);await click(page.getByRole('button',{name:'Return',exact:true}));
  expect(errors).toEqual([]);
 });
});
