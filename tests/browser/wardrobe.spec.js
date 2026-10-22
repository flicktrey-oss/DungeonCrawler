import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
for(const touch of [false,true])test.describe(touch?'phone wardrobe':'desktop wardrobe',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 for(const [id,name,slot]of [['boots','Trail Boots','boots'],['shortsword','Worn shortsword','weapon']])test('buy and visibly equip '+name,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const d=await expeditionDriver(page,5,touch),click=async loc=>touch?loc.tap():loc.click();
 await click(page.getByRole('button',{name:'Character / equipment',exact:true}));
 for(const label of ['Boots','Ring 1','Ring 2'])await expect(page.getByRole('button',{name:label+' slot: Empty',exact:true})).toBeVisible();
 const plain=await page.locator('#character-shortcut svg').innerHTML();
 await expect(page.locator('[data-'+slot+'-icon]')).toHaveCount(0);
 await click(page.getByRole('button',{name:'Return',exact:true}));
 await d.send({type:'move',dx:1,dy:0});await d.send({type:'move',dx:1,dy:0});
 await click(page.getByRole('button',{name:'Trade',exact:true}));await click(page.getByRole('button',{name:'Buy '+name+' · 8 gold',exact:true}));d.game.action({type:'buy',id});await click(page.getByRole('button',{name:'Return',exact:true}));
 await click(page.getByRole('button',{name:'Character / equipment',exact:true}));const index=d.game.state.player.inventory.findIndex(i=>i.kind===slot);
 await click(page.getByRole('button',{name:'Equip '+name,exact:true}));d.game.action({type:'equip',index});
 await expect(page.locator('[data-portrait-slot='+slot+']')).toHaveAttribute('data-equipped','true');
 await expect(page.locator('[data-'+slot+'-icon]')).toBeVisible();expect(await page.locator('#character-shortcut svg').innerHTML()).not.toBe(plain);
 await page.screenshot({path:'test-results/wardrobe-'+slot+'-'+(touch?'phone':'desktop')+'.png',fullPage:true});
 await click(page.getByRole('button',{name:'Unequip '+name,exact:true}));d.game.action({type:'unequip',slot});
 await expect(page.locator('[data-'+slot+'-icon]')).toHaveCount(0);expect(errors).toEqual([]);
 });
});
for(const touch of [false,true])test.describe(touch?'phone rings':'desktop rings',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('selects either ring slot and returns the ring to the satchel',async({page})=>{
 const d=await expeditionDriver(page,5,touch),click=async loc=>touch?loc.tap():loc.click();
 await d.send({type:'move',dx:1,dy:0});await d.send({type:'move',dx:1,dy:0});await click(page.getByRole('button',{name:'Trade',exact:true}));
 for(const kind of ['potion','stone']){const index=d.game.state.player.inventory.findIndex(i=>i.kind===kind),name=d.game.state.player.inventory[index].name,price=kind==='potion'?3:3;await click(page.getByRole('button',{name:'Sell '+name+' · '+price+' gold',exact:true}).first());d.game.action({type:'sell',index});}
 await click(page.getByRole('button',{name:'Buy Iron Band · 12 gold',exact:true}));d.game.action({type:'buy',id:'ring'});await click(page.getByRole('button',{name:'Return',exact:true}));
 await click(page.getByRole('button',{name:'Character / equipment',exact:true}));
 for(const slot of ['ring2','ring1']){
 await click(page.locator('[data-portrait-slot='+slot+']'));const index=d.game.state.player.inventory.findIndex(i=>i.kind==='ring');
 await click(page.getByRole('button',{name:'Equip Iron Band',exact:true}));d.game.action({type:'equip',index,slot});
 await expect(page.locator('[data-'+slot+'-icon]')).toBeVisible();await expect(page.locator('[data-portrait-slot='+slot+']')).toHaveAttribute('data-equipped','true');
 await click(page.getByRole('button',{name:'Unequip Iron Band',exact:true}));d.game.action({type:'unequip',slot});
 await expect(page.locator('[data-'+slot+'-icon]')).toHaveCount(0);
 }
 await expect(page.locator('.floor')).toContainText('TURN '+d.game.state.turn);
 });
});
