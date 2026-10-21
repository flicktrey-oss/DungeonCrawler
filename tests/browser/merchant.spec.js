import { test, expect } from '@playwright/test';
import { generateWorldRegion, CAMP } from '../../src/game/world.js';
import { directions, walkable, key } from '../../src/game/dungeon.js';
function route(map, start, goal) {
  const queue = [{ ...start, path: [] }], seen = new Set([key(start.x, start.y)]);
  for (let i = 0; i < queue.length; i++) {
    const n = queue[i]; if (n.x === goal.x && n.y === goal.y) return n.path;
    for (const [dx, dy] of directions) { const x = n.x + dx, y = n.y + dy, k = key(x, y); if (walkable(map, x, y) && !seen.has(k)) { seen.add(k); queue.push({ x, y, path: [...n.path, ({'0,-1':'w','0,1':'s','1,0':'d','-1,0':'a'})[key(dx,dy)]] }); } }
  }
  throw Error('No route to test destination');
}
test('earn gold, shop, buy once, and show remaining gold and stock accurately', async ({ page }) => {
  const seed = 1700000000000, region = generateWorldRegion(seed, 0, 0), cache = region.lootSpots[1];
  await page.clock.setFixedTime(new Date(seed)); await page.goto('/');
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  let turns = 0;
  for (const k of route(region.map, CAMP, cache)) { await page.keyboard.press(k); turns++; }
  await page.keyboard.press('e'); turns++; await expect(page.locator('.numbers')).toContainText('11 gold');
  for (const k of route(region.map, cache, { x: 22, y: 15 })) { await page.keyboard.press(k); turns++; }
  await page.keyboard.press('e'); await expect(page.getByRole('heading', { name: 'Mara the Wayfarer', exact: true })).toBeVisible();
  await expect(page.locator('.floor')).toContainText(`TURN ${turns}`);
  await page.getByRole('button', { name: 'Buy Ember tonic · 10 gold', exact: true }).click(); turns++;
  await expect(page.locator('#shop-gold')).toHaveText('Your gold: 1');
  await expect(page.getByRole('button', { name: 'Buy Ember tonic · 10 gold', exact: true })).toBeDisabled();
  await expect(page.locator('#shop-offers section').first()).toContainText('2 left');
  await page.getByRole('button', { name: 'Return', exact: true }).click();
  await expect(page.locator('.floor')).toContainText(`TURN ${turns}`);
  await expect(page.locator('#inventory button')).toHaveCount(3);
});

test('minimap stays fogged, follows the player, switches regions and can be collapsed for free', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'New Game', exact: true }).click();
  const map = page.locator('#minimap');
  await expect(map).toHaveAttribute('aria-label', /tile 20, 15/);
  const hiddenColor = await map.evaluate(c => Array.from(c.getContext('2d').getImageData(1, 1, 1, 1).data));
  expect(hiddenColor).toEqual([8, 12, 18, 255]);
  await page.getByLabel('Toggle minimap', { exact: true }).click(); await expect(map).not.toBeVisible();
  await page.getByLabel('Toggle minimap', { exact: true }).click(); await expect(map).toBeVisible(); await expect(page.locator('.floor')).toContainText('TURN 0');
  await page.getByLabel('Toggle minimap', { exact: true }).focus(); await page.keyboard.press('Enter'); await expect(map).not.toBeVisible(); await page.keyboard.press('Enter'); await expect(map).toBeVisible(); await expect(page.locator('.floor')).toContainText('TURN 0');
  for (let i = 0; i < 8; i++) await page.keyboard.press('d');
  await expect(map).toHaveAttribute('aria-label', /tile 28, 15/);
  await page.keyboard.press('Enter'); await expect(page.locator('#minimap-location')).toHaveText('Depth 1');
  await page.keyboard.press('q'); await expect(page.locator('#minimap-location')).toHaveText('0,0');
  for (let i = 0; i < 12; i++) await page.keyboard.press('d');
  await expect(page.locator('#minimap-location')).toHaveText('1,0'); await expect(page.locator('#camp-bearing')).toHaveText('Camp: 1 W');
});
