import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
for(const touch of [false,true])test.describe(touch?'phone community':'desktop community',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('walks between camp services with its new solid buildings and original scenery',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=await expeditionDriver(page,5,touch),click=async l=>touch?l.tap():l.click();await page.screenshot({path:`test-results/community-${touch?'phone':'desktop'}.png`});
  await d.walk({x:19,y:17});await click(page.getByRole('button',{name:'Forge',exact:true}));await expect(page.getByRole('heading',{name:'Bram the Blacksmith',exact:true})).toBeVisible();await click(page.getByRole('button',{name:'Return',exact:true}));await d.walk({x:17,y:18});await click(page.getByRole('button',{name:'Trade bones',exact:true}));await expect(page.getByRole('heading',{name:'Orren the Grave Keeper',exact:true})).toBeVisible();await click(page.getByRole('button',{name:'Return',exact:true}));await d.walk({x:22,y:15});await click(page.getByRole('button',{name:'Trade',exact:true}));await expect(page.getByRole('heading',{name:'Mara the Wayfarer',exact:true})).toBeVisible();await click(page.getByRole('button',{name:'Return',exact:true}));await d.walk({x:24,y:16});await click(page.getByRole('button',{name:'Speak',exact:true}));await expect(page.getByRole('heading',{name:'Prince Aldren',exact:true})).toBeVisible();expect(errors).toEqual([]);
 });
});
