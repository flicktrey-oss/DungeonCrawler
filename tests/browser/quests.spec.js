import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
for(const touch of [false,true])test.describe(touch?'phone persistent quests':'desktop persistent quests',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('accepts a camp goal, tracks it for free, takes a second quest, and retains both after travel',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const d=await expeditionDriver(page,5,touch),click=async loc=>touch?loc.tap():loc.click();
 await d.walk({x:18,y:15});await click(page.getByRole('button',{name:'Interact',exact:true}));
 const camp=d.game.quests.get('trailwarden');await expect(page.getByRole('heading',{name:'Trailwarden Iona',exact:true})).toBeVisible();
 await click(page.getByRole('button',{name:'Accept quest',exact:true}));d.game.action({type:'acceptQuest'});await click(page.getByRole('button',{name:'Return',exact:true}));
 const turn=d.game.state.turn;await click(page.locator('#quest-panel summary'));await expect(page.locator('#quest-info')).toContainText(camp.title);
 await click(page.getByRole('button',{name:'Stop tracking '+camp.title,exact:true}));d.game.trackedQuest=null;
 await click(page.getByRole('button',{name:'Track quest '+camp.title,exact:true}));d.game.trackedQuest=camp.id;
 await expect(page.locator('.floor')).toContainText('TURN '+turn);await click(page.locator('#quest-panel summary'));
 await d.walk({x:39,y:15});await d.send({type:'move',dx:1,dy:0});
 const event=d.game.state.encounters.find(e=>e.type==='villager'&&e.quest&&!e.quest.legacy);await d.walk({x:event.x,y:event.y+1});
 await click(page.getByRole('button',{name:'Interact',exact:true}));await click(page.getByRole('button',{name:'Accept quest',exact:true}));d.game.action({type:'acceptQuest'});await click(page.getByRole('button',{name:'Return',exact:true}));
 await d.walk({x:0,y:15});await d.send({type:'move',dx:-1,dy:0});await click(page.locator('#quest-panel summary'));
 await expect(page.locator('.journal-quest')).toHaveCount(3);await expect(page.locator('#quest-info')).toContainText(event.quest.title);await expect(page.locator('#quest-info')).toContainText('region (1, 0)');
 if(touch){const journal=await page.locator('.journal-body').boundingBox(),quick=await page.locator('#quick-slots').boundingBox();expect(journal.y+journal.height).toBeLessThanOrEqual(quick.y);}
 await page.screenshot({path:'test-results/quest-journal-'+(touch?'phone':'desktop')+'.png',fullPage:true});
 await click(page.locator('#quest-panel summary'));await d.walk({x:39,y:15});await d.send({type:'move',dx:1,dy:0});await d.walk({x:event.x,y:event.y+1});
 await click(page.getByRole('button',{name:'Interact',exact:true}));await expect(page.getByRole('heading',{name:event.quest.giver,exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Accept quest',exact:true})).toHaveCount(0);
 expect(errors).toEqual([]);
 });
});
