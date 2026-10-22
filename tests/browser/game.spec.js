import { expeditionDriver } from './expedition-driver.js';
import {test,expect} from '@playwright/test';
test('renders and enforces turn-based keyboard, idle, pause and inventory behavior',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.getByRole('button',{name:'Instructions',exact:true}).click();await expect(page.getByText('Beyond the campfire')).toBeVisible();await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.locator('#game > canvas')).toBeVisible();await expect(page.locator('#stats .bar span')).toHaveText(['Health 32 / 32','Mana 100 / 100','XP 0 / 20']);await expect(page.locator('.floor')).toContainText('TURN 0');
 await page.keyboard.down('.');
 await page.evaluate(()=>{for(let i=0;i<5;i++)window.dispatchEvent(new KeyboardEvent('keydown',{key:'.',repeat:true}));});
 await page.keyboard.up('.');await expect(page.locator('.floor')).toContainText('TURN 1');
 await page.waitForTimeout(500);await expect(page.locator('.floor')).toContainText('TURN 1');
 await page.keyboard.press('.');await expect(page.locator('.floor')).toContainText('TURN 2');
 await page.keyboard.press('Escape');await page.keyboard.press('.');await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.locator('.floor')).toContainText('TURN 2');
 await expect(page.getByRole('button',{name:'Potion',exact:true})).toBeDisabled();await expect(page.locator('.floor')).toContainText('TURN 2');
 await page.keyboard.press('i');await expect(page.getByText('Your equipment')).toBeVisible();await page.getByRole('button',{name:'Return',exact:true}).click();expect(errors).toEqual([]);
});

test('Mind Vision button and shortcut spend Mana, reject overspending and respect pause',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'New Game',exact:true}).click();
 const mana=page.locator('.mana span'),turn=page.locator('.floor'),ability=page.getByRole('button',{name:'Vision · 25',exact:true});
 await ability.click();await expect(mana).toHaveText('Mana 75 / 100');await expect(turn).toContainText('TURN 1');await expect(page.getByText('Mind Vision active · 3 turns',{exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await page.keyboard.press('m');await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(mana).toHaveText('Mana 75 / 100');
 for(let i=0;i<3;i++)await page.keyboard.press('m');await expect(mana).toHaveText('Mana 0 / 100');await expect(ability).toBeDisabled();await expect(turn).toContainText('TURN 4');
 await page.keyboard.press('m');await expect(turn).toContainText('TURN 4');await expect(mana).toHaveText('Mana 0 / 100');
});

test('explores the overworld, stores supplies, enters a discovered crypt and retreats to a fresh region', async ({page}) => {
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const d=await expeditionDriver(page,1);
 await page.keyboard.press('e');await page.getByRole('button',{name:'Store Ember tonic',exact:true}).first().click();d.game.action({type:'store',index:0});
 await page.getByRole('button',{name:'Take Ember tonic',exact:true}).click();d.game.action({type:'retrieve',index:0});await page.getByRole('button',{name:'Return',exact:true}).click();
 await page.screenshot({path:'test-results/camp.png',fullPage:true});
 await d.east();await expect(page.locator('#stats h2')).toHaveText('Whisperwood (1, 0)');
 await d.walk(d.game.state.entrance);await d.send({type:'descend'});await expect(page.locator('#minimap-location')).toHaveText('Depth 1');
 await d.send({type:'ascend'});await expect(page.locator('#stats h2')).toHaveText('Whisperwood (1, 0)');expect(d.game.state.visit).toBe(1);
 await page.screenshot({path:'test-results/overworld.png',fullPage:true});expect(errors).toEqual([]);
});
