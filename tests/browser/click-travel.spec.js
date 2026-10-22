import {test,expect} from '@playwright/test';
async function begin(page){
 await page.clock.install();await page.clock.setFixedTime(new Date(5));await page.goto('/');
 await page.getByRole('button',{name:'New Game',exact:true}).click();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
}
async function tile(page,dx,dy,options={}){
 const canvas=page.locator('#game > canvas'),b=await canvas.boundingBox(),zoom=b.height<500?1.25:b.width<900?1.5:2;
 await canvas.click({position:{x:b.width/2+dx*24*zoom,y:b.height/2+dy*24*zoom},...options});
}
const turn=(page,n)=>expect(page.locator('.floor')).toContainText('TURN '+n);
test('a three-tile click queues exactly three turns, then the world remains frozen',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await begin(page);await tile(page,3,0);await turn(page,1);
 await page.clock.runFor(400);await turn(page,3);await page.clock.runFor(2000);await turn(page,3);
 await expect(page.locator('#character-inspector')).toBeHidden();expect(errors).toEqual([]);
});
test('clicking a merchant approaches and opens trade without buying or closing the dialogue',async({page})=>{
 await begin(page);await tile(page,2,-1);await turn(page,1);await page.clock.runFor(250);await turn(page,2);
 await expect(page.getByRole('heading',{name:'Mara the Wayfarer',exact:true})).toBeVisible();
 await expect(page.locator('#shop-gold')).toHaveText('Your gold: 8');await page.clock.runFor(1000);await turn(page,2);
});
test('clicking the trailwarden approaches and opens her quest; shift-click inspects for free',async({page})=>{
 await begin(page);await tile(page,-2,-1,{modifiers:['Shift']});await turn(page,0);
 await expect(page.locator('#inspection-details')).toContainText('Trailwarden Iona');await page.getByRole('button',{name:'Close character inspection'}).click();
 await tile(page,-2,-1);await page.clock.runFor(250);await turn(page,2);
 await expect(page.getByRole('heading',{name:'Trailwarden Iona',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Accept quest',exact:true})).toBeVisible();
});
test('clicking a dropped item walks to it and collects it, including an item on the camp chest',async({page})=>{
 await begin(page);await page.keyboard.press('i');await page.getByRole('button',{name:'Select Throwing stones, 1 by 1',exact:true}).click();await page.getByRole('button',{name:'Drop item',exact:true}).click();await page.getByRole('button',{name:'Return',exact:true}).click();
 for(let i=0;i<3;i++)await page.keyboard.press('a');await turn(page,4);await tile(page,3,0);await page.clock.runFor(450);await turn(page,8);
 await expect(page.locator('#stone-count')).toHaveText('3');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('#latest-event')).toContainText('Collected Throwing stones');
 await page.clock.runFor(1000);await turn(page,8);
});
test('escape, keyboard movement, menus and focus loss cancel pending travel',async({page})=>{
 await begin(page);await tile(page,5,0);await turn(page,1);await page.keyboard.press('Escape');await page.clock.runFor(1000);await turn(page,1);await expect(page.locator('#overlay')).toBeHidden();
 await tile(page,4,0);await turn(page,2);await page.keyboard.press('a');await turn(page,3);await page.clock.runFor(1000);await turn(page,3);
 await tile(page,4,0);await turn(page,4);await page.keyboard.press('i');await page.clock.runFor(1000);await turn(page,4);await page.getByRole('button',{name:'Return',exact:true}).click();
 await tile(page,4,0);await turn(page,5);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.clock.runFor(1000);await turn(page,5);
});
test('native browser timers start the game and finish a route without clock mocking',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await page.getByRole('button',{name:'New Game',exact:true}).click();await tile(page,3,0);await turn(page,3);
 expect(errors).toEqual([]);
});
