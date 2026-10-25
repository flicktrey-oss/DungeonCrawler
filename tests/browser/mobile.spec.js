import { expeditionDriver } from './expedition-driver.js';
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const move = (page, dir) => page.getByRole('button', { name: `Move ${dir}`, exact: true }).tap();
async function begin(page) { await page.goto('/'); await page.getByRole('button', { name: 'New Game', exact: true }).tap(); }

test('phone taps move once in all directions, holds stay still, and menus block movement', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await begin(page);
  for (const dir of ['north', 'south', 'east', 'west']) await move(page, dir);
  await expect(page.locator('.floor')).toContainText('TURN 4');
  const client = await page.context().newCDPSession(page);
  const b = await page.getByRole('button', { name: 'Move east', exact: true }).boundingBox();
  const point = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await page.waitForTimeout(600); await expect(page.locator('.floor')).toContainText('TURN 4');
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('.floor')).toContainText('TURN 5');
  await page.waitForTimeout(300); await expect(page.locator('.floor')).toContainText('TURN 5');
  await page.getByRole('button', { name: 'Wait one turn', exact: true }).tap();
  await expect(page.locator('.floor')).toContainText('TURN 6');
  await page.getByRole('button', { name: 'Pause / Help', exact: true }).tap();
  await expect(page.getByRole('button', { name: 'Move east', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Resume', exact: true }).tap();
  await expect(page.locator('.floor')).toContainText('TURN 6'); expect(errors).toEqual([]);
});

test('canceled gestures, drags and secondary fingers never spend extra turns', async ({ page }) => {
  await begin(page);
  const client = await page.context().newCDPSession(page);
  const b = await page.getByRole('button', { name: 'Move east', exact: true }).boundingBox();
  const point = { x: b.x + b.width / 2, y: b.y + b.height / 2, id: 1 };
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.locator('.floor')).toContainText('TURN 0');
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, x: point.x - 40 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('.floor')).toContainText('TURN 0');
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  const second = { x: point.x, y: point.y + 50, id: 2 };
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point, second] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  // Ambiguous two-finger gestures cancel rather than committing a partial tap.
  await expect(page.locator('.floor')).toContainText('TURN 0');
  await move(page, 'west'); await expect(page.locator('.floor')).toContainText('TURN 1');
});

test('phone can use Mana, storage, spatial inventory and discovered crypt stairs without a keyboard',async({page})=>{
 const d=await expeditionDriver(page,1,true);await d.send({type:'mindVision'});
 await page.getByRole('button',{name:'Camp chest',exact:true}).tap();await page.getByRole('button',{name:'Store Ember tonic',exact:true}).first().tap();d.game.action({type:'store',index:0});
 await page.getByRole('button',{name:'Take Ember tonic',exact:true}).tap();d.game.action({type:'retrieve',index:0});await page.getByRole('button',{name:'Return',exact:true}).tap();
 await page.getByRole('button',{name:'Open satchel [I]',exact:true}).tap();
 await expect(page.getByLabel('10 by 10 inventory grid',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Return',exact:true}).tap();
 await d.east();await d.walk(d.game.state.entrance);await d.send({type:'descend'});await expect(page.locator('#minimap-location')).toHaveText('Depth 1');
 await d.send({type:'ascend'});await expect(page.locator('#stats h2')).toHaveText('Whisperwood (1, 0)');
});

for (const [width, height] of [[375, 667], [390, 844], [844, 390]]) {
  test(`readable viewport and touch targets at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height }); await begin(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    for (const button of await page.locator('#touch-controls button:visible').all()) { const box = await button.boundingBox(); expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); }
    const canvas = await page.locator('#game > canvas').boundingBox(); expect(canvas.width).toBe(width); expect(canvas.height).toBe(height);
    const controls = await page.locator('#touch-controls').boundingBox(); expect(controls.y + controls.height).toBeLessThanOrEqual(height);
    await page.screenshot({ path: `test-results/phone-${width}.png`, fullPage: true });
  });
}

test('phone can browse the merchant and toggle the minimap without extra turns', async ({ page }) => {
  await begin(page); await move(page, 'east'); await move(page, 'east');
  await page.getByRole('button', { name: 'Trade', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Mara the Wayfarer', exact: true })).toBeVisible();
  await page.getByRole('button',{name:'Select Ember tonic offer',exact:true}).tap();
  await expect(page.getByRole('button', { name: 'Buy Ember tonic · 10 gold', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Return', exact: true }).tap();
  await expect(page.locator('#minimap')).not.toBeVisible();
  await page.getByLabel('Toggle minimap', { exact: true }).tap(); await expect(page.locator('#minimap')).toBeVisible();
  await page.getByLabel('Toggle minimap', { exact: true }).tap(); await expect(page.locator('#minimap')).not.toBeVisible();
  await expect(page.locator('.floor')).toContainText('TURN 2');
  await page.screenshot({ path: 'test-results/merchant-minimap-phone.png', fullPage: true });
});

test('phone switches the same minimap and minimizes it to a header without using a turn', async ({ page }) => {
  await begin(page); const map = page.locator('#minimap');
  await page.getByLabel('Toggle minimap', { exact: true }).tap();
  await page.getByRole('tab', { name: 'Explored', exact: true }).tap();
  await expect(map).toHaveAttribute('aria-label', /Explored world/);
  await page.getByLabel('Toggle minimap', { exact: true }).tap();
  await expect(map).not.toBeVisible(); await expect(page.getByRole('tab', { name: 'Explored', exact: true })).not.toBeVisible();
  const collapsed = await page.locator('#minimap-widget').boundingBox(); expect(collapsed.height).toBeLessThan(60);
  await page.getByLabel('Toggle minimap', { exact: true }).tap();
  await expect(page.getByRole('tab', { name: 'Explored', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Nearby', exact: true }).tap(); await expect(map).toHaveAttribute('aria-label', /Nearby terrain/);
  await expect(page.locator('.floor')).toContainText('TURN 0');
});

test('phone rearranges the 10×10 satchel for free and drops/recovers an item at camp',async({page})=>{
 await begin(page);await page.getByRole('button',{name:'Open satchel [I]',exact:true}).tap();
 await page.getByRole('button',{name:'Select Ember tonic, 1 by 1',exact:true}).first().tap();
 await page.getByRole('spinbutton',{name:'Column',exact:true}).fill('10');await page.getByRole('spinbutton',{name:'Row',exact:true}).fill('10');await page.getByRole('button',{name:'Place item',exact:true}).tap();
 await expect(page.locator('.bag-item').first()).toHaveAttribute('style',/10 \/ 10/);await expect(page.locator('.floor')).toContainText('TURN 0');
 await page.getByRole('button',{name:'Drop item',exact:true}).tap();await expect(page.locator('.bag-item')).toHaveCount(2);
 await page.getByRole('button',{name:'Pick up item here',exact:true}).tap();await expect(page.locator('.bag-item')).toHaveCount(3);
 await page.getByRole('button',{name:'Return',exact:true}).tap();await expect(page.locator('.floor')).toContainText('TURN 2');
});
