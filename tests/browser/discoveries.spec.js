import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
for(const touch of [false,true])test.describe(touch?'phone discoveries':'desktop discoveries',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('makes a watchfire choice once, keeps browsing free, and resumes the resolved discovery',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=await expeditionDriver(page,5,touch),click=async loc=>touch?loc.tap():loc.click();await d.east();
  const e=d.game.state.encounters.find(e=>e.type==='discovery'&&e.kind==='watchfire');expect(e).toBeTruthy();await d.walk({x:e.x,y:e.y+1});
  for(let i=0;i<10;i++){const b=page.getByRole('button',{name:'Interact',exact:true});if(await b.isVisible()&&await b.getAttribute('aria-description')===e.name)break;await page.getByRole('button',{name:'Next action',exact:true}).click();}
  const before=d.game.state.turn;await click(page.getByRole('button',{name:'Interact',exact:true}));await expect(page.getByRole('heading',{name:e.name,exact:true})).toBeVisible();await expect(page.locator('.floor')).toContainText('TURN '+before);
  await click(page.getByRole('button',{name:'Scout surrounding lands',exact:true}));expect(d.game.action({type:'discovery',choice:'scout'})).toBe(true);await expect(page.locator('#encounter-result')).toContainText('charts nearby regions');await expect(page.getByRole('button',{name:'Warm yourself · 10 HP',exact:true})).toHaveCount(0);await click(page.getByRole('button',{name:'Return',exact:true}));
  await page.reload();await click(page.getByRole('button',{name:'Continue',exact:true}));await click(page.getByRole('button',{name:'Interact',exact:true}));await expect(page.getByRole('button',{name:'Scout surrounding lands',exact:true})).toHaveCount(0);await expect(page.locator('.floor')).toContainText('TURN '+d.game.state.turn);expect(errors).toEqual([]);
 });
});
