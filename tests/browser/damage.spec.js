import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
for(const touch of [false,true])test.describe(touch?'phone damage bands':'desktop damage bands',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('previews a sword range, equips it, and keeps damage information readable without spending inspection turns',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=await expeditionDriver(page,5,touch),click=async l=>touch?l.tap():l.click();await d.send({type:'move',dx:1,dy:0});await d.send({type:'move',dx:1,dy:0});await click(page.getByRole('button',{name:'Trade',exact:true}));
  const sword=page.locator('#shop-offers section').filter({has:page.getByRole('heading',{name:'Worn shortsword (+1 ATK)',exact:true})});await expect(sword).toContainText('Damage 3–5 before enemy defense');await click(sword.getByRole('button',{name:'Buy Worn shortsword · 8 gold',exact:true}));d.game.action({type:'buy',id:'shortsword'});await click(page.getByRole('button',{name:'Return',exact:true}));
  await click(page.getByRole('button',{name:'Character / equipment',exact:true}));await click(page.getByRole('button',{name:'Equip Worn shortsword',exact:true}));d.game.action({type:'equip',index:d.game.state.player.inventory.findIndex(i=>i.kind==='weapon')});await expect(page.locator('.equipment-stats')).toContainText('3–5 damage');await expect(page.locator('#bag-editor')).toContainText('Damage 3–5 before enemy defense');await click(page.getByRole('button',{name:'Return',exact:true}));await expect(page.locator('.numbers')).toContainText('3–5 DMG');const turn=d.game.state.turn;
  const canvas=page.locator('#game > canvas'),box=await canvas.boundingBox(),position={x:box.width/2,y:box.height/2};if(touch)await canvas.tap({position});else await canvas.click({position});await expect(page.locator('.inspection-damage')).toContainText('Damage 3–5 before enemy defense');await expect(page.locator('.floor')).toContainText('TURN '+turn);await page.screenshot({path:`test-results/damage-band-${touch?'phone':'desktop'}.png`});expect(errors).toEqual([]);
 });
});
