import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
for(const touch of [false,true])test.describe(touch?'phone woodland':'desktop woodland',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('shows an accepted quest on its unknown world quadrant without spending turns',async({page})=>{
 const d=await expeditionDriver(page,5,touch),click=async loc=>touch?loc.tap():loc.click();await d.walk({x:18,y:15});
 await click(page.getByRole('button',{name:'Interact',exact:true}));await click(page.getByRole('button',{name:'Accept quest',exact:true}));d.game.action({type:'acceptQuest'});await click(page.getByRole('button',{name:'Return',exact:true}));
 if(!await page.locator('#minimap').isVisible())await click(page.getByLabel('Toggle minimap',{exact:true}));
 await click(page.getByRole('tab',{name:'World',exact:true}));const q=d.game.quests.get('trailwarden');
 await expect(page.locator('#minimap')).toHaveAttribute('aria-label',new RegExp('Region '+q.region.rx+', '+q.region.ry+': 1 quest objectives'));await expect(page.locator('#minimap')).toHaveAttribute('aria-label',/1 visited regions/);
 expect(await page.locator('#minimap').evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=0;i<a.length;i+=4)if(a[i]===255&&a[i+1]===230&&a[i+2]===160)return true;return false;})).toBe(true);
 await expect(page.locator('.floor')).toContainText('TURN '+d.game.state.turn);await page.screenshot({path:'test-results/quest-map-'+(touch?'phone':'desktop')+'.png',fullPage:true});
 });
 test('helps a woodland traveler through an original dialogue, once',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=await expeditionDriver(page,5,touch),click=async loc=>touch?loc.tap():loc.click();await d.east();
 const e=d.game.state.encounters.find(e=>e.type==='woodland');expect(e.kind).toBe('traveler');await d.walk({x:e.x,y:e.y+1});
 await click(page.getByRole('button',{name:'Interact',exact:true}));await expect(page.getByRole('heading',{name:'A Wounded Traveler',exact:true})).toBeVisible();
 const before=d.game.state.player.gold;await click(page.getByRole('button',{name:'Give Ember tonic',exact:true}));d.game.action({type:'woodland'});await expect(page.getByRole('button',{name:'Give Ember tonic',exact:true})).toHaveCount(0);await expect(page.locator('#encounter-result')).toContainText('8 gold');
 await click(page.getByRole('button',{name:'Return',exact:true}));await expect(page.locator('.numbers')).toContainText((before+8)+' gold');await expect(page.locator('.floor')).toContainText('TURN '+d.game.state.turn);expect(errors).toEqual([]);
 });
});
