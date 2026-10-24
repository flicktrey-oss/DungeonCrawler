import {test,expect} from '@playwright/test';
import {expeditionDriver,selectOffer,selectSale} from './expedition-driver.js';
for(const touch of [false,true])test.describe(touch?'phone conveniences':'desktop conveniences',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('assigns any item, uses a gear quick slot for one turn, and shows a comparison',async({page})=>{
  const d=await expeditionDriver(page,5,touch),click=async loc=>touch?loc.tap():loc.click();
  await d.send({type:'move',dx:1,dy:0});await d.send({type:'move',dx:1,dy:0});await click(page.getByRole('button',{name:'Trade',exact:true}));await selectOffer(page,'Trail Boots',touch);await click(page.getByRole('button',{name:'Buy Trail Boots · 8 gold',exact:true}));d.game.action({type:'buy',id:'boots'});await click(page.getByRole('button',{name:'Return',exact:true}));
  await click(page.getByRole('button',{name:'Open satchel [I]',exact:true}));await click(page.getByRole('button',{name:'Select Trail Boots, 2 by 2',exact:true}));await expect(page.locator('.equipment-comparison')).toContainText('Stealth 0 → 1');const turn=d.game.state.turn;
  await click(page.getByRole('button',{name:'Assign to quick slot 1',exact:true}));await expect(page.locator('.floor')).toContainText('TURN '+turn);await click(page.getByRole('button',{name:'Return',exact:true}));
  await click(page.getByRole('button',{name:'Quick slot 1: Trail Boots',exact:true}));const index=d.game.state.player.inventory.findIndex(i=>i.kind==='boots');d.game.action({type:'equip',index});await expect(page.locator('.floor')).toContainText('TURN '+d.game.state.turn);
  await click(page.getByRole('button',{name:'Quick slot 1: Trail Boots',exact:true}));d.game.action({type:'unequip',slot:'boots'});await expect(page.locator('.floor')).toContainText('TURN '+d.game.state.turn);
 });
 test('opens the creature index from the journal without spending a turn',async({page})=>{
  const d=await expeditionDriver(page,5,touch),click=async loc=>touch?loc.tap():loc.click();await d.east();const prey=d.game.state.enemies.find(e=>!e.questId&&!e.questKey&&!e.eventId);await d.walk(prey,()=>d.game.creatureIndex.size>0);const turn=d.game.state.turn;
  await click(page.locator('#quest-panel summary'));await click(page.getByRole('button',{name:'Creature index',exact:true}));await expect(page.getByRole('heading',{name:'Creature index',exact:true})).toBeVisible();await expect(page.locator('#creature-entries section').first()).toBeVisible();await expect(page.locator('.floor')).toContainText('TURN '+turn);await click(page.getByRole('button',{name:'Return',exact:true}));
 });
});

test('death recap shows the killing blow and turn log, then retries the same seed',async({page})=>{
 const d=await expeditionDriver(page,5);await d.walk({x:0,y:15});await d.send({type:'move',dx:-1,dy:0});const foe=d.game.state.enemies[0];for(let n=0;n<100&&d.game.state.status==='playing';n++)await d.send(d.firstStep(foe));
 expect(d.game.state.status).toBe('dead');await expect(page.getByRole('heading',{name:'Your lantern goes dark.',exact:true})).toBeVisible();await expect(page.getByText(/Last hit:/)).toBeVisible();await page.getByText('Turn-by-turn recap',{exact:true}).click();await expect(page.getByText(/Turn \d+: Action:/).first()).toBeVisible();await page.getByRole('button',{name:'Retry this seed',exact:true}).click();await expect(page.locator('.floor')).toContainText('TURN 0');await expect(page.locator('#stats .bar').first()).toContainText('Health 32 / 32');
});
