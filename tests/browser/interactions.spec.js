import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
for(const touch of [false,true])test.describe(touch?'phone overlapping actions':'desktop overlapping actions',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('cycles storage and two dropped items for free and collects the chosen item',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=await expeditionDriver(page,5,touch),click=async l=>touch?l.tap():l.click();
  await click(page.getByRole('button',{name:'Open satchel [I]',exact:true}));await click(page.getByRole('button',{name:'Select Ember tonic, 1 by 1',exact:true}).first());await click(page.getByRole('button',{name:'Drop item',exact:true}));d.game.action({type:'drop',index:0});
  await click(page.getByRole('button',{name:'Select Throwing stones, 1 by 1',exact:true}));await click(page.getByRole('button',{name:'Drop item',exact:true}));d.game.action({type:'drop',index:1});await click(page.getByRole('button',{name:'Return',exact:true}));
  await expect(page.locator('#interaction-count')).toHaveText('1/3');await expect(page.getByRole('button',{name:'Camp chest',exact:true})).toBeEnabled();
  if(touch){await click(page.getByRole('button',{name:'Next action',exact:true}));await click(page.getByRole('button',{name:'Next action',exact:true}));}else{await page.keyboard.press('f');await page.keyboard.press('f');}
  await expect(page.locator('#interaction-detail')).toHaveText('Throwing stones');await expect(page.locator('.floor')).toContainText('TURN 2');
  await page.screenshot({path:`test-results/interaction-choices-${touch?'phone':'desktop'}.png`});const item=d.game.state.items.find(i=>i.kind==='stone');if(touch)await click(page.getByRole('button',{name:'Collect',exact:true}));else await page.keyboard.press('e');d.game.action({type:'pickup',item});
  await expect(page.locator('.floor')).toContainText('TURN 3');await expect(page.locator('#interaction-detail')).toHaveText('Ember tonic');await click(page.getByRole('button',{name:'Next action',exact:true}));await click(page.getByRole('button',{name:'Camp chest',exact:true}));await expect(page.getByRole('heading',{name:'Lantern Camp storage',exact:true})).toBeVisible();await expect(page.locator('.floor')).toContainText('TURN 3');expect(errors).toEqual([]);
 });
});
