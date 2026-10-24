import {test,expect} from '@playwright/test';
import {expeditionDriver,selectOffer} from './expedition-driver.js';
import {techniqueTargets} from '../../src/game/techniques.js';
import {stoneCount} from '../../src/game/items.js';
for(const touch of [false,true])test.describe(touch?'phone techniques':'desktop techniques',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('equipment slots, merchant descriptions, free targeting and a real stone attack',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=await expeditionDriver(page,5,touch);
  // Keep the chosen run seed, then let Phaser's Date-based tween clock advance.
  await page.clock.setSystemTime(new Date(5));
  const click=async locator=>touch?locator.tap():locator.click();
  await click(page.getByRole('button',{name:'Character / equipment',exact:true}));
  await expect(page.getByRole('button',{name:'Off hand slot: Empty',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Main hand slot: Empty',exact:true})).toBeVisible();
  await click(page.getByRole('button',{name:'Return',exact:true}));
  await d.send({type:'move',dx:1,dy:0});await d.send({type:'move',dx:1,dy:0});
  await click(page.getByRole('button',{name:'Trade',exact:true}));
  for(const name of ['Trail spear','Weathered buckler','Worn shortsword']){await selectOffer(page,name,touch);await expect(page.locator('#trade-detail h3')).toHaveText(name);}
  await click(page.getByRole('button',{name:'Return',exact:true}));
  await d.walk({x:20,y:15});await d.east();const villager=d.game.state.encounters.find(e=>e.type==='villager');await d.walk({x:villager.x,y:villager.y+1});
  // Landscape additions can change what is visible beside the quest giver.
  // Approach actual prey rather than assuming that dialogue location is a firing position.
  if(!techniqueTargets(d.game,'throw').length){const p=d.game.state.player,prey=d.game.state.enemies.filter(e=>e.hp>0).sort((a,b)=>(Math.abs(a.x-p.x)+Math.abs(a.y-p.y))-(Math.abs(b.x-p.x)+Math.abs(b.y-p.y)))[0];expect(prey).toBeTruthy();await d.walk(prey,()=>techniqueTargets(d.game,'throw').length>0);}
  const target=techniqueTargets(d.game,'throw')[0];expect(target).toBeTruthy();const turn=d.game.state.turn,ammo=stoneCount(d.game.state.player);
  await expect(page.getByRole('button',{name:'Spear reach [R]',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Brace [B]',exact:true})).toHaveCount(0);
  await click(page.getByRole('button',{name:'Quick slot 1: Throwing stones',exact:true}));
  await expect(page.locator('#targeting-bar')).toBeVisible();await expect(page.locator('.floor')).toContainText(`TURN ${turn}`);
  const canvas=page.locator('#game > canvas'),box=await canvas.boundingBox();const position={x:box.width/2,y:box.height/2};
  if(touch)await canvas.tap({position});else await canvas.click({position});await expect(page.locator('#targeting-notice')).toContainText('blocked or out of range');
  await page.keyboard.press('w');await expect(page.locator('.floor')).toContainText(`TURN ${turn}`);
  await click(page.getByRole('button',{name:'Cancel',exact:true}));await expect(page.locator('#targeting-bar')).toBeHidden();
  await click(page.getByRole('button',{name:'Quick slot 1: Throwing stones',exact:true}));
  await expect.poll(()=>canvas.evaluate(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=0;i<data.length;i+=4)if(data[i]===244&&data[i+1]===211&&data[i+2]===133)return true;return false;})).toBe(true);
  await page.screenshot({path:`test-results/techniques-${touch?'phone':'desktop'}.png`,fullPage:true});
  const first=page.locator('#target-options button').first();
  if(touch){const p=d.game.state.player;await canvas.tap({position:{x:box.width/2+(target.x-p.x)*24*1.5,y:box.height/2+(target.y-p.y)*24*1.5}});}else await click(first);
  d.game.action({type:'throw',x:target.x,y:target.y});
  await expect(page.locator('.floor')).toContainText(`TURN ${turn+1}`);await expect(page.locator('#targeting-bar')).toBeHidden();expect(stoneCount(d.game.state.player)).toBe(ammo-1);
  await expect(page.locator('#custom-slot-0 .action-count')).toHaveText(String(ammo-1));await expect(page.getByRole('button',{name:'Quick slot 1: Throwing stones',exact:true})).toBeEnabled();const impact=await canvas.screenshot();await page.waitForTimeout(850);await expect(page.locator('.floor')).toContainText(`TURN ${turn+1}`);const settled=await canvas.screenshot();expect(impact.equals(settled)).toBe(false);expect(errors).toEqual([]);
 });
});
