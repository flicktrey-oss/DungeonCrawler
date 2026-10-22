import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
for(const touch of [false,true])test.describe(touch?'phone provisions':'desktop provisions',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('campfire cooking is discoverable and locked detection never spends a turn',async({page})=>{
  const d=await expeditionDriver(page,5,touch),click=async loc=>touch?loc.tap():loc.click();
  if(!await page.locator('#minimap-widget').evaluate(e=>e.open))await click(page.locator('#minimap-widget summary'));
  await expect(page.getByRole('button',{name:'Detect Creatures · Lv 3',exact:true})).toBeDisabled();
  if(!touch){await page.keyboard.press('g');await expect(page.locator('.floor')).toContainText('TURN 0');}
  await d.send({type:'move',dx:0,dy:1});await click(page.getByRole('button',{name:'Cook',exact:true}));
  await expect(page.getByRole('heading',{name:'Lantern Camp fire',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Cook one meat',exact:true})).toBeDisabled();await expect(page.getByText('Raw meat: 0',{exact:true})).toBeVisible();
  await click(page.getByRole('button',{name:'Return',exact:true}));await expect(page.locator('.floor')).toContainText('TURN 1');
 });
 test('hunts frogs, collects raw meat, cooks at camp and eats from the satchel',async({page})=>{
  const d=await expeditionDriver(page,5,touch),click=async loc=>touch?loc.tap():loc.click();
  await d.east();const frogs=d.game.state.enemies.filter(e=>e.questId);await d.hunt(frogs[0]);await d.hunt(frogs[1]);
  const meat=d.game.state.items.find(i=>i.kind==='rawMeat');expect(meat).toBeTruthy();await d.walk(meat);await d.send({type:'pickup'});
  await d.walk({x:0,y:15});await d.send({type:'move',dx:-1,dy:0});await d.walk({x:20,y:16});
  await click(page.getByRole('button',{name:'Cook',exact:true}));await expect(page.getByText('Raw meat: 1',{exact:true})).toBeVisible();
  await click(page.getByRole('button',{name:'Cook one meat',exact:true}));d.game.action({type:'cook'});await expect(page.getByText('Raw meat: 0',{exact:true})).toBeVisible();await expect(page.locator('#cooking-result')).toContainText('Cooked one');
  await click(page.getByRole('button',{name:'Return',exact:true}));await click(page.getByRole('button',{name:'Open satchel [I]',exact:true}));
  const food=page.getByRole('button',{name:'Select Campfire meat, 1 by 1',exact:true});await expect(food).toBeVisible();await expect(food.locator('.bag-item-icon')).toHaveText('🍖');
  await click(food);const index=d.game.state.player.inventory.findIndex(i=>i.kind==='cookedMeat'),old=d.game.state.player.hp;expect(old).toBeLessThan(d.game.state.player.maxHp);
  await click(page.getByRole('button',{name:'Use / equip',exact:true}));d.game.action({type:'use',index});await expect(food).toHaveCount(0);await expect(page.locator('#stats .bar').first()).toContainText('Health '+d.game.state.player.hp+' /');await expect(page.locator('.floor')).toContainText('TURN '+d.game.state.turn);
 });
 test('equipped gear keeps its emoji and satchel footprint, with an unequip control',async({page})=>{
  const d=await expeditionDriver(page,5,touch),click=async loc=>touch?loc.tap():loc.click();
  await d.send({type:'move',dx:1,dy:0});await d.send({type:'move',dx:1,dy:0});await click(page.getByRole('button',{name:'Trade',exact:true}));
  await click(page.getByRole('button',{name:'Buy Trail Boots · 8 gold',exact:true}));d.game.action({type:'buy',id:'boots'});await click(page.getByRole('button',{name:'Return',exact:true}));
  await click(page.getByRole('button',{name:'Open satchel [I]',exact:true}));await click(page.getByRole('button',{name:'Select Trail Boots, 2 by 2',exact:true}));const capacity=await page.locator('#bag-capacity').textContent();
  await click(page.getByRole('button',{name:'Use / equip',exact:true}));const index=d.game.state.player.inventory.findIndex(i=>i.kind==='boots');d.game.action({type:'equip',index});
  await expect(page.locator('.bag-item.equipped')).toHaveCount(1);await expect(page.locator('#bag-capacity')).toHaveText(capacity);
  await click(page.getByRole('button',{name:'Select Trail Boots, 2 by 2',exact:true}));await expect(page.getByRole('button',{name:'Drop item',exact:true})).toBeDisabled();
  await click(page.getByRole('button',{name:'Unequip item',exact:true}));await expect(page.locator('.bag-item.equipped')).toHaveCount(0);await expect(page.locator('#bag-capacity')).toHaveText(capacity);
 });
});
