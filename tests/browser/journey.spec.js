import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
import {journeyLandmarks} from '../../src/game/world.js';
for(const touch of [false,true])test.describe(touch?'phone northern road':'desktop northern road',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('Fen marks bridge and watchtower leads for one turn without revealing their terrain',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=await expeditionDriver(page,5,touch),click=async l=>touch?l.tap():l.click();await d.walk({x:24,y:12});const turn=d.game.state.turn;
  await click(page.getByRole('button',{name:'Speak',exact:true}));await expect(page.getByRole('heading',{name:'Scout Fen',exact:true})).toBeVisible();await expect(page.locator('.floor')).toContainText('TURN '+turn);await click(page.getByRole('button',{name:'Mark Willow Crossing',exact:true}));d.game.action({type:'journey',choice:'bridgeLead'});await expect(page.locator('.floor')).toContainText('TURN '+(turn+1));await click(page.getByRole('button',{name:'Return',exact:true}));
  if(!(await page.getByRole('tab',{name:'World',exact:true}).isVisible()))await click(page.getByLabel('Toggle minimap',{exact:true}));await click(page.getByRole('tab',{name:'World',exact:true}));await expect(page.locator('#minimap')).toHaveAttribute('aria-label',/Willow Crossing lead in region/);await expect(page.locator('#minimap')).toHaveAttribute('aria-label',/The Fallen Watchtower lead in region/);await expect(page.locator('#minimap')).toHaveAttribute('aria-label',/1 visited regions/);await page.screenshot({path:`test-results/northern-road-leads-${touch?'phone':'desktop'}.png`});expect(errors).toEqual([]);
 });
 test('finds the fallen watchtower along the northern road and resolves one discovery choice',async({page})=>{
  test.setTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=await expeditionDriver(page,5,touch),click=async l=>touch?l.tap():l.click();await d.east();await d.walk({x:20,y:0});await d.send({type:'move',dx:0,dy:-1});const tower=journeyLandmarks(5).find(l=>l.kind==='tower');expect(d.game.location).toMatchObject({rx:tower.rx,ry:tower.ry});await d.walk({x:20,y:15});
  // The dock can also offer nearby people or loot: select the actual landmark.
  for(let i=0;i<8&&!(await page.locator('[data-control=collect]').getAttribute('aria-description'))?.includes('Fallen Watchtower');i++)await click(page.getByRole('button',{name:'Next action',exact:true}));
  await click(page.getByRole('button',{name:'Interact',exact:true}));await expect(page.getByRole('heading',{name:'The Fallen Watchtower',exact:true})).toBeVisible();const turn=d.game.state.turn;await click(page.getByRole('button',{name:'Scout the northern landmarks',exact:true}));d.game.action({type:'journey',choice:'scout'});await expect(page.locator('.floor')).toContainText('TURN '+(turn+1));await expect(page.locator('#overlay')).toContainText('already chose: scout the road');await expect(page.getByRole('button',{name:'Take the healing tonic',exact:true})).toHaveCount(0);await page.screenshot({path:`test-results/watchtower-${touch?'phone':'desktop'}.png`});expect(errors).toEqual([]);
 });
});
