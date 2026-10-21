import {test,expect} from '@playwright/test';
test('renders and enforces turn-based keyboard, idle, pause and inventory behavior',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.getByRole('button',{name:'Instructions',exact:true}).click();await expect(page.getByText('A lantern in the dark')).toBeVisible();await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.locator('canvas')).toBeVisible();await expect(page.locator('#stats .bar span')).toHaveText(['Health 32 / 32','Mana 100 / 100','XP 0 / 12']);await expect(page.locator('.floor')).toContainText('TURN 0');
 await page.keyboard.down('.');
 await page.evaluate(()=>{for(let i=0;i<5;i++)window.dispatchEvent(new KeyboardEvent('keydown',{key:'.',repeat:true}));});
 await page.keyboard.up('.');await expect(page.locator('.floor')).toContainText('TURN 1');
 await page.waitForTimeout(500);await expect(page.locator('.floor')).toContainText('TURN 1');
 await page.keyboard.press('.');await expect(page.locator('.floor')).toContainText('TURN 2');
 await page.keyboard.press('Escape');await page.keyboard.press('.');await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.locator('.floor')).toContainText('TURN 2');
 await page.getByRole('button',{name:'Ember tonic',exact:true}).first().click();await expect(page.locator('.floor')).toContainText('TURN 2');
 await page.keyboard.press('i');await expect(page.getByText('Your equipment')).toBeVisible();await page.getByRole('button',{name:'Return',exact:true}).click();expect(errors).toEqual([]);
});

test('Mind Vision button and shortcut spend Mana, reject overspending and respect pause',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'New Game',exact:true}).click();
 const mana=page.locator('.mana span'),turn=page.locator('.floor'),ability=page.getByRole('button',{name:'Mind Vision [M] · 25 Mana',exact:true});
 await ability.click();await expect(mana).toHaveText('Mana 75 / 100');await expect(turn).toContainText('TURN 1');await expect(page.getByText('Mind Vision active · 3 turns',{exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await page.keyboard.press('m');await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(mana).toHaveText('Mana 75 / 100');
 for(let i=0;i<3;i++)await page.keyboard.press('m');await expect(mana).toHaveText('Mana 0 / 100');await expect(ability).toBeDisabled();await expect(turn).toContainText('TURN 4');
 await page.keyboard.press('m');await expect(turn).toContainText('TURN 4');await expect(mana).toHaveText('Mana 0 / 100');
});
