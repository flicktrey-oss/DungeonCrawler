import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
for(const touch of [false,true])test.describe(touch?'phone story':'desktop story',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('starts the main story voluntarily, follows across regions, and waits until collected in person',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=await expeditionDriver(page,5,touch),click=async loc=>touch?loc.tap():loc.click(),c=d.game.story.prince;
  await d.walk({x:23,y:17});const turn=d.game.state.turn;await click(page.getByRole('button',{name:'Speak',exact:true}));
  await expect(page.getByRole('heading',{name:'Prince Aldren',exact:true})).toBeVisible();await expect(page.locator('#prince-status')).toContainText('waits southeast');await expect(page.locator('.floor')).toContainText('TURN '+turn);
  await click(page.getByRole('button',{name:'Begin escort',exact:true}));d.game.action({type:'acceptEscort'});await expect(page.locator('#prince-status')).toContainText('Following');
  await click(page.getByRole('button',{name:'Stay here',exact:true}));d.game.action({type:'princeStay'});await expect(page.locator('#prince-status')).toContainText('Waiting for you');await click(page.getByRole('button',{name:'Return',exact:true}));
  await d.walk({x:39,y:15});await d.send({type:'move',dx:1,dy:0});await expect(page.locator('#escort-status')).toContainText('waits in (0, 0)');
  await d.send({type:'move',dx:-1,dy:0});await d.walk({x:c.x,y:c.y-1});await click(page.getByRole('button',{name:'Speak',exact:true}));await click(page.getByRole('button',{name:'Follow me',exact:true}));d.game.action({type:'princeFollow'});await click(page.getByRole('button',{name:'Return',exact:true}));
  await d.walk({x:39,y:15});await d.send({type:'move',dx:1,dy:0});await expect(page.locator('#escort-status')).toContainText('follow');expect(c.locationId).toBe(d.game.location.id);
  const now=d.game.state.turn;await click(page.locator('#quest-panel summary'));await expect(page.locator('[data-quest-id=royal-escort]')).toContainText('Northwatch (0, -6)');await expect(page.locator('.floor')).toContainText('TURN '+now);
  await page.screenshot({path:'test-results/story-'+(touch?'phone':'desktop')+'.png'});expect(errors).toEqual([]);
 });
 test('inspects the prince for free with combat stats and his own original portrait',async({page})=>{
  const d=await expeditionDriver(page,5,touch);const canvas=page.locator('#game > canvas'),b=await canvas.boundingBox(),zoom=b.height<500?1.25:b.width<900?1.5:2,pos={position:{x:b.width/2+4*24*zoom,y:b.height/2+2*24*zoom}};
  if(touch)await canvas.tap(pos);else await canvas.click({...pos,modifiers:['Shift']});
  await expect(page.locator('#inspection-details h3')).toHaveText('Prince Aldren');await expect(page.locator('#inspection-details')).toContainText('36 / 36');await expect(page.locator('#inspection-details')).toContainText('Escort');await expect(page.locator('.floor')).toContainText('TURN 0');
 });
});
