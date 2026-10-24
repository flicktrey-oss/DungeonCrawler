import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
import {bridgeQuest} from '../../src/game/bridge.js';
for(const touch of [false,true])test.describe(touch?'phone bridge choices':'desktop bridge choices',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 async function approach(page){const d=await expeditionDriver(page,5,touch);await d.east();const q=bridgeQuest(d.game),f=q.layout.forward;await d.walk({x:q.layout.guard.x-f.x,y:q.layout.guard.y-f.y});return {d,q,f,click:async l=>touch?l.tap():l.click()};}
 test('offers three solutions, pays for one turn and crosses the opened shortcut',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const {d,q,f,click}=await approach(page),turn=d.game.state.turn,gold=d.game.state.player.gold;
  await click(page.getByRole('button',{name:'Interact',exact:true}));await expect(page.getByRole('heading',{name:'The Willow Crossing',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Fight the two guards',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Offer to recover medicine',exact:true})).toBeVisible();await expect(page.locator('.floor')).toContainText('TURN '+turn);
  await page.screenshot({path:`test-results/willow-crossing-${touch?'phone':'desktop'}.png`});await click(page.getByRole('button',{name:'Pay toll · 8 gold',exact:true}));d.game.action({type:'bridge',choice:'pay'});await expect(page.locator('.floor')).toContainText('TURN '+(turn+1));await expect(page.locator('#overlay')).toContainText('toll paid');expect(d.game.state.player.gold).toBe(gold-8);
  await click(page.getByRole('button',{name:'Return',exact:true}));const c=q.layout.center;await d.walk({x:c.x+f.x*2,y:c.y+f.y*2});expect(q.claimed).toBe(true);expect(errors).toEqual([]);
 });
 test('accepts an untimed errand, retrieves guarded medicine and negotiates passage',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const {d,q,f,click}=await approach(page);
  await click(page.getByRole('button',{name:'Interact',exact:true}));await click(page.getByRole('button',{name:'Offer to recover medicine',exact:true}));d.game.action({type:'bridge',choice:'medicine'});await expect(page.locator('#overlay')).toContainText('Recover medicine at local tile');await click(page.getByRole('button',{name:'Return',exact:true}));
  const turn=d.game.state.turn;await click(page.locator('#quest-panel summary'));await expect(page.locator('#quest-info')).toContainText('The Willow Crossing');await expect(page.locator('.floor')).toContainText('TURN '+turn);await click(page.locator('#quest-panel summary'));
  for(const enemy of d.game.state.enemies.filter(e=>e.bridgeMedicineGuard===q.id))await d.hunt(enemy);await d.walk(q.medicineSite);await d.send({type:'pickup'});expect(q.medicine).toBe(true);
  await d.walk({x:q.layout.guard.x-f.x,y:q.layout.guard.y-f.y});await click(page.getByRole('button',{name:'Interact',exact:true}));await click(page.getByRole('button',{name:'Hand over medicine',exact:true}));d.game.action({type:'bridge',choice:'deliver'});await expect(page.locator('#overlay')).toContainText('medicine returned');expect(q.claimed).toBe(true);expect(errors).toEqual([]);
 });
});
for(const touch of [false,true])test.describe(touch?'phone river ford':'desktop river ford',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('follows the riverbank and crosses the distant ford while the quest bridge stays barred',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=await expeditionDriver(page,5,touch);await d.east();const q=bridgeQuest(d.game),f=q.layout.forward,ford=q.layout.ford;
  await d.walk(ford);expect(d.game.state.map[ford.y][ford.x]).toBe(':');await page.screenshot({path:`test-results/river-ford-${touch?'phone':'desktop'}.png`});await d.walk({x:ford.x+f.x*3,y:ford.y+f.y*3});expect(q.claimed).toBe(false);expect(d.game.state.map[q.layout.center.y][q.layout.center.x]).toBe('X');await expect(page.locator('.floor')).toContainText('TURN '+d.game.state.turn);expect(errors).toEqual([]);
 });
});
