import {test,expect} from '@playwright/test';
async function begin(page){await page.clock.install();await page.goto('/');await page.getByRole('button',{name:'New Game',exact:true}).click();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));}
const turn=(page,n)=>expect(page.locator('.floor')).toContainText(`TURN ${n}`);

test('holding movement repeats at a controlled pace and releasing freezes the world',async({page})=>{
 await begin(page);await page.keyboard.down('d');await turn(page,1);
 await page.evaluate(()=>{for(let i=0;i<8;i++)window.dispatchEvent(new KeyboardEvent('keydown',{key:'d',repeat:true}));});await turn(page,1);
 await page.clock.runFor(299);await turn(page,1);
 await page.clock.runFor(301);await turn(page,4);
 await page.keyboard.up('d');await page.clock.runFor(1500);await turn(page,4);
 await page.keyboard.down('ArrowLeft');await page.clock.runFor(450);await page.keyboard.up('ArrowLeft');await turn(page,7);
 await page.keyboard.down('.');await page.clock.runFor(1000);await page.keyboard.up('.');await turn(page,8);
});

test('menus and focus loss cancel held movement without resuming it',async({page})=>{
 await begin(page);await page.keyboard.down('d');await turn(page,1);
 await page.keyboard.press('i');await page.clock.runFor(1000);await turn(page,1);
 await page.getByRole('button',{name:'Return',exact:true}).click();await page.clock.runFor(1000);await turn(page,1);
 await page.keyboard.up('d');await page.keyboard.down('a');await turn(page,2);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.clock.runFor(1000);await turn(page,2);await page.keyboard.up('a');
 await page.keyboard.down('s');await page.keyboard.down('w');await page.clock.runFor(300);await turn(page,5);
 await page.keyboard.up('w');await page.clock.runFor(1000);await turn(page,5);await page.keyboard.up('s');
});
