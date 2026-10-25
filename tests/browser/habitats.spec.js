import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
import {walkable,directions} from '../../src/game/dungeon.js';
for(const touch of [false,true])test.describe(touch?'phone habitats':'desktop habitats',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('New Game opens the expanding world and a rat burrow can be cleared through real controls',async({page})=>{
  test.setTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=await expeditionDriver(page,1,touch,true),g=d.game,h=g.state.encounters.find(e=>e.id==='world:0,-1/habitat:rat');
  await expect(page.locator('#map-local-tab')).toHaveText('Nearby');await expect(page.locator('.floor')).not.toContainText('PREVIEW');
  const adjacent=directions.map(([dx,dy])=>({x:h.x+dx,y:h.y+dy})).filter(p=>walkable(g.state.map,p.x,p.y)).sort((a,b)=>Math.abs(a.x-20)+Math.abs(a.y-15)-Math.abs(b.x-20)-Math.abs(b.y-15))[0];await d.walk(adjacent);await d.care();await page.screenshot({path:`test-results/rat-habitat-${touch?'phone':'desktop'}.png`});
  // Select the nest rather than any overlapping item/person action.
  for(let i=0;i<8&&await page.locator('[data-control="collect"]').getAttribute('aria-label')!=='Strike';i++){const b=page.locator('[data-control="cycle-interaction"]');if(touch)await b.tap();else await page.keyboard.press('f');}
  await expect(page.getByRole('button',{name:'Strike',exact:true})).toHaveAttribute('aria-description',/Rat burrow.*12\/12 HP/);
  const p={x:g.state.player.x,y:g.state.player.y};g.action({type:'strikeHabitat',id:h.id});if(touch)await page.getByRole('button',{name:'Strike',exact:true}).tap();else await page.keyboard.press('e');await expect(page.locator('.floor')).toContainText('TURN '+g.state.turn);expect(h.hp).toBe(9);
  while(!h.destroyed){await d.care();await d.send({type:'move',dx:h.x-p.x,dy:h.y-p.y});}
  await expect(page.locator('#log')).toContainText('burrow collapses');await expect(page.getByRole('button',{name:'Inspect',exact:true})).toBeVisible();const t=g.state.turn;if(touch)await page.getByRole('button',{name:'Inspect',exact:true}).tap();else await page.keyboard.press('e');await expect(page.getByRole('heading',{name:'Rat burrow',exact:true})).toBeVisible();await expect(page.locator('.floor')).toContainText('TURN '+t);await expect(page.getByText('This burrow is cleared.',{exact:false})).toBeVisible();await page.screenshot({path:`test-results/rat-burrow-${touch?'phone':'desktop'}.png`});expect(errors).toEqual([]);
 });
});
