import {test,expect} from '@playwright/test';
import {expeditionDriver} from './expedition-driver.js';
import {worldMapCells,worldMapLayout} from '../../src/minimap.js';
for(const touch of [false,true])test.describe(touch?'phone map inspection':'desktop map inspection',()=>{
 if(touch)test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 test('clicks known world regions and local tiles for coordinates and difficulty without taking a turn',async({page})=>{
  const d=await expeditionDriver(page,5,touch),click=async l=>touch?l.tap():l.click(),map=page.locator('#minimap');if(!await map.isVisible())await click(page.getByLabel('Toggle minimap',{exact:true}));await click(page.getByRole('tab',{name:'World',exact:true}));
  const l=worldMapLayout(worldMapCells(d.game)),box=await map.boundingBox();const position={x:(l.x+.5*l.size)*box.width/160,y:(l.y-5.5*l.size)*box.height/120};if(touch)await map.tap({position});else await map.click({position});await expect(page.locator('#map-inspection')).toContainText('Northwatch · Region (0, -6)');await expect(page.locator('#map-inspection')).toContainText('Recommended level 1');await expect(page.locator('#map-inspection')).toContainText('Safe settlement');await expect(page.locator('.floor')).toContainText('TURN 0');await page.screenshot({path:`test-results/map-inspection-${touch?'phone':'desktop'}.png`});
  await click(page.getByRole('tab',{name:'Local',exact:true}));if(touch)await map.tap({position:{x:2,y:2}});else await map.click({position:{x:2,y:2}});await expect(page.locator('#map-inspection')).toContainText('Tile (0, 0)');await expect(page.locator('.floor')).toContainText('TURN 0');
 });
});
