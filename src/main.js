import Phaser from 'phaser';
import { Expedition } from './game/expedition.js';
import { BIOMES } from './game/world.js';
import { attack, defense, threshold } from './game/items.js';
import { DungeonScene } from './render/scene.js';
import './style.css';
import { drawMinimap, campBearing } from './minimap.js';
import { bindTouchControls } from './touch-controls.js';

const scene = new DungeonScene();
const phaser = new Phaser.Game({ type: Phaser.CANVAS, parent: 'game', width: 768, height: 624, pixelArt: true,
  backgroundColor: '#090c12', scene: [scene], scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  callbacks: { postBoot() { setTimeout(() => { if (model) scene.setGame(model); }, 0); } } });
let model = null, paused = true, panel = null;
new ResizeObserver(() => {
  const parent = document.getElementById('game');
  if (parent.clientWidth && parent.clientHeight) phaser.scale.resize(parent.clientWidth, parent.clientHeight);
  scene.draw();
}).observe(document.getElementById('game'));
const $ = id => document.getElementById(id);
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function modal(title, body, buttons) {
  syncTouchControls();
  $('overlay').classList.remove('hidden');
  $('overlay').innerHTML = `<article><p class="eyebrow">DUNGEONCRAWLER · WILDLANDS</p><h2>${title}</h2>${body}<div class="buttons"></div></article>`;
  for (const [text, fn] of buttons) { const b = document.createElement('button'); b.textContent = text; b.onclick = fn; $('overlay').querySelector('.buttons').append(b); }
}
function closePanel() { paused = false; panel = null; document.activeElement?.blur(); $('overlay').classList.add('hidden'); syncTouchControls(); }
function start() { model = new Expedition(); closePanel(); render(); }
function help() {
  paused = true; panel = 'help';
  modal('Beyond the campfire', `<p>Explore an endless, seeded wilderness. Follow trails to new regions. Forests and marshes have different creatures. Lantern Camp at <b>(0, 0)</b> is safe; stand on its tent to store supplies. Mara the merchant waits just northeast of the tent. Stand beside her and press E or Trade. Browsing is free; a purchase costs one turn. Stock is limited for this run. The minimap shows explored terrain only; C marks camp, M the merchant, and arrows mark stairs. Tap Map to hide/show it.</p>
    <p><b>On a phone:</b> tap an arrow to move or bump attack. Each tap is one step; holding never repeats. Collect opens storage at camp and becomes Trade beside the merchant. Enter ↓ enters crypts, Leave ↑ retreats on upward stairs, Vision costs 25 Mana, and Wait spends one turn. Swipe elsewhere to scroll. Refreshing ends the run; there is no saving yet.</p><p><b>WASD / arrows</b>: step or bump attack · <b>E</b>: collect / open camp storage<br><b>Enter / &gt;</b>: enter crypt / descend · <b>Q / &lt;</b>: ascend on upward stairs<br><b>M</b>: Mind Vision (25 Mana, reveals through walls for 3 turns)<br><b>H</b>: tonic · <b>.</b>: wait · <b>I</b>: inventory help · <b>Esc</b>: pause</p>
    <p>Crypts have two depths and a dangerous guardian. You may retreat and return: creatures, loot, and exploration are remembered during this run. Crossing regions or using stairs costs one turn, with no enemy action on arrival. Only enemies in the current region act.</p>
    <p>Move or melee to regain 5 Mana. Idle time never advances the world. Death ends the entire run, including stored supplies. No crafting, gathering, or building.</p>`, [[model ? 'Resume' : 'Back', () => model ? closePanel() : menu()]]);
}
function menu() {
  paused = true;
  modal('The Wildlands', '<p>A campfire at your back. An unknown world ahead.</p><p>Discover the Whisperwood and Lantern Marsh, follow forgotten trails, and brave the crypts beneath them. Return with treasure—or leave your story in the dark.</p><p class="hint">Endless exploration · Turn-based combat · Permadeath<br>v0.4.0 — Merchant & minimap</p>', [['New Game', start], ['Instructions', help]]);
}
function storage() {
  if (!model?.atCamp()) return;
  paused = true; panel = 'storage';
  modal('Lantern Camp storage', '<p>This region is safe. Transfers cost one turn. Stored supplies are lost if you die.</p><div id="storage-lists"></div>', [['Return', closePanel]]);
  for (const [title, items, type] of [['Your satchel', model.state.player.inventory, 'store'], ['Camp chest', model.stash, 'retrieve']]) {
    const section = document.createElement('section'), h = document.createElement('h3'); h.textContent = title; section.append(h);
    if (!items.length) { const p = document.createElement('p'); p.textContent = 'Empty'; section.append(p); }
    items.forEach((item, index) => { const b = document.createElement('button'); b.className = 'item'; b.textContent = `${type === 'store' ? 'Store' : 'Take'} ${item.name}`; b.onclick = () => { model.action({ type, index }); render(); storage(); }; section.append(b); });
    $('storage-lists').append(section);
  }
}
function merchant() {
  if (!model?.atMerchant()) return;
  paused = true; panel = 'merchant';
  modal('Mara the Wayfarer', '<p>Potions and equipment for the road. Browse freely; each purchase costs one turn. Limited stock, no restocking or selling yet.</p><p id="shop-gold"></p><div id="shop-offers"></div>', [['Return', closePanel]]);
  $('shop-gold').textContent = `Your gold: ${model.state.player.gold}`;
  for (const offer of model.shop) {
    const row = document.createElement('section'), name = document.createElement('h3'), description = document.createElement('p'), button = document.createElement('button');
    name.textContent = `${offer.item.name}${offer.item.bonus ? ` (+${offer.item.bonus} ${offer.item.kind === 'weapon' ? 'ATK' : 'DEF'})` : ''}`;
    description.textContent = `${offer.item.description} · ${offer.price} gold · ${offer.stock} left`;
    button.textContent = offer.stock === 0 ? `Sold out: ${offer.item.name}` : `Buy ${offer.item.name} · ${offer.price} gold`;
    button.disabled = offer.stock <= 0 || model.state.player.gold < offer.price;
    button.onclick = () => { model.action({ type: 'buy', id: offer.id }); render(); merchant(); };
    row.append(name, description, button); $('shop-offers').append(row);
  }
}
function render() {
  if (!model) return;
  scene.setGame(model);
  drawMinimap($('minimap'), model.state, model.location);
  $('minimap-location').textContent = model.location.kind === 'world' ? `${model.location.rx},${model.location.ry}` : `Depth ${model.location.depth}`;
  $('camp-bearing').textContent = campBearing(model.location);
  const s = model.state, p = s.player, loc = model.location;
  const place = loc.kind === 'world' ? `${BIOMES[s.biome].name} (${loc.rx}, ${loc.ry})` : `${s.biome === 'marsh' ? 'Sunken' : 'Rootbound'} Crypt · ${loc.depth}/2`;
  $('stats').innerHTML = `<div class="floor">${loc.kind === 'world' ? 'WILDLANDS' : 'UNDERGROUND'} <span>TURN ${s.turn}</span></div><h2>${escape(place)}</h2><p class="hint location">${s.home ? 'Safe region · Camp (0, 0)' : `Danger ${s.danger}/5 · Camp (0, 0)`}<br>${s.regionsDiscovered} regions discovered · ${s.cryptsCleared} crypts cleared</p>
    <div class="bar"><div style="width:${p.hp / p.maxHp * 100}%"></div><span>Health ${p.hp} / ${p.maxHp}</span></div>
    <div class="bar mana"><div style="width:${p.mana / p.maxMana * 100}%"></div><span>Mana ${p.mana} / ${p.maxMana}</span></div>
    <div class="bar xp"><div style="width:${p.xp / threshold(p) * 100}%"></div><span>XP ${p.xp} / ${threshold(p)}</span></div>
    <div class="numbers">Lv ${p.level} · ⚔ ${attack(p)} ATK · ◈ ${defense(p)} DEF · <b>${p.gold} gold</b></div>
    <p class="hint equipped-summary">Weapon: ${escape(p.weapon?.name ?? 'Bare blade')}<br>Armor: ${escape(p.armor?.name ?? 'Travel clothes')}</p>`;
  const ability = document.createElement('button'); ability.className = 'ability'; ability.textContent = 'Mind Vision [M] · 25 Mana'; ability.disabled = p.mana < 25;
  ability.title = 'Reveal within 7 tiles through walls for 3 turns. Costs one turn.'; ability.onclick = () => act({ type: 'mindVision' }); $('stats').append(ability);
  if (s.mindVisionUntil >= s.turn && s.mindVisionUntil > 0) { const status = document.createElement('p'); status.className = 'hint'; status.textContent = `Mind Vision active · ${s.mindVisionUntil - s.turn + 1} turns`; $('stats').append(status); }
  if (model.atCamp()) { const b = document.createElement('button'); b.className = 'item'; b.textContent = 'Camp storage [E]'; b.onclick = storage; $('stats').append(b); }
  if (model.atMerchant()) { const b = document.createElement('button'); b.className = 'item'; b.textContent = 'Trade [E]'; b.onclick = merchant; $('stats').append(b); }
  $('equipment-info').textContent = `Weapon: ${p.weapon?.name ?? 'Bare blade'} · Armor: ${p.armor?.name ?? 'Travel clothes'}`;
  $('inventory').innerHTML = '';
  p.inventory.forEach((item, index) => { const b = document.createElement('button'); b.className = 'item'; b.textContent = item.name + (item.bonus ? ` (+${item.bonus} ${item.kind === 'weapon' ? 'ATK' : 'DEF'})` : ''); b.setAttribute('aria-label', b.textContent); const description = document.createElement('small'); description.className = 'item-description'; description.textContent = item.description ?? (item.kind === 'weapon' ? 'Adds attack while equipped.' : 'Reduces incoming damage while equipped.'); b.append(description); b.onclick = () => act({ type: item.kind === 'potion' ? 'potion' : 'equip', index }); $('inventory').append(b); });
  if (!p.inventory.length) $('inventory').textContent = 'Your satchel is empty.';
  $('latest-event').textContent = s.log.at(-1) ?? '';
  $('log').innerHTML = s.log.slice(-25).map(t => `<p>${escape(t)}</p>`).join(''); $('log').scrollTop = $('log').scrollHeight;
  syncTouchControls();
  if (s.status === 'dead') {
    paused = true; panel = 'dead';
    modal('Your lantern goes dark.', `<p>Your expedition ends here. The camp and its supplies are lost.</p><p>Level ${p.level} · ${s.regionsDiscovered} regions · ${s.cryptsCleared} crypts cleared · ${p.gold} gold</p><p class="hint">Seed: ${s.seed}</p>`, [['New Run', start], ['Title', () => { model = null; menu(); }]]);
  }
}
function act(action) { if (!model || paused) return; if (document.activeElement?.tagName === 'SUMMARY') document.activeElement.blur(); model.action(action); render(); }
function syncTouchControls() {
  const ready = model && !paused && model.state.status === 'playing';
  const s = model?.state, p = s?.player;
  for (const button of document.querySelectorAll('#touch-controls button')) {
    let allowed = Boolean(ready);
    const control = button.dataset.control;
    if (ready) {
      if (control === 'vision') allowed = p.mana >= 25;
      if (control === 'potion') allowed = p.hp < p.maxHp && p.inventory.some(i => i.kind === 'potion');
      if (control === 'ascend') allowed = model.location.kind === 'crypt' && p.x === s.upstairs.x && p.y === s.upstairs.y;
      if (control === 'descend') allowed = model.location.kind === 'world' ? s.map[p.y][p.x] === 'D' : model.location.depth === 1 && p.x === s.stairs.x && p.y === s.stairs.y;
      if (control === 'collect') { button.textContent = model.atCamp() ? 'Camp chest' : model.atMerchant() ? 'Trade' : 'Collect'; allowed = model.atCamp() || model.atMerchant() || s.items.some(i => i.x === p.x && i.y === p.y); }
    }
    button.disabled = !allowed;
  }
}
bindTouchControls($('touch-controls'), control => {
  if (!model || paused || model.state.status !== 'playing') return;
  const directions = { north: [0,-1], south: [0,1], east: [1,0], west: [-1,0] };
  if (directions[control]) act({ type: 'move', dx: directions[control][0], dy: directions[control][1] });
  else if (control === 'help') help();
  else if (control === 'collect' && model.atCamp()) storage();
  else if (control === 'collect' && model.atMerchant()) merchant();
  else act({ type: ({ collect: 'pickup', vision: 'mindVision' })[control] ?? control });
});
const phoneLayout = matchMedia('(max-width: 700px), (pointer: coarse)');
function setPanels() { for (const id of ['satchel-panel', 'chronicle-panel']) $(id).open = !phoneLayout.matches; }
phoneLayout.addEventListener('change', setPanels); setPanels();
$('minimap-widget').querySelector('summary').addEventListener('click', event => { if (event.detail > 0) document.activeElement?.blur(); });
$('help').onclick = help;
window.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if ((event.target instanceof HTMLButtonElement || event.target?.tagName === 'SUMMARY') && (event.key === 'Enter' || event.key === ' ')) return;
  const k = event.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'enter'].includes(k)) event.preventDefault();
  if (k === 'escape') { if (model && paused && model.state.status === 'playing') closePanel(); else if (!paused) help(); return; }
  if (k === 'i' && model && model.state.status === 'playing') {
    if (panel === 'inventory') closePanel();
    else if (!paused) { paused = true; panel = 'inventory'; modal('Your equipment', '<p>Click satchel items to equip them or drink a tonic. Descriptions appear under each item. Each successful use costs one turn. Stand on the tent at camp and press E to store supplies.</p>', [['Return', closePanel]]); }
    return;
  }
  if (k === 'e' && !paused && model?.atCamp()) { storage(); return; }
  if (k === 'e' && !paused && model?.atMerchant()) { merchant(); return; }
  const moves = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };
  if (moves[k]) act({ type: 'move', dx: moves[k][0], dy: moves[k][1] });
  else if (k === '.') act({ type: 'wait' }); else if (k === 'e') act({ type: 'pickup' });
  else if (k === 'h') act({ type: 'potion' }); else if (k === 'm') act({ type: 'mindVision' });
  else if (k === 'enter' || k === '>') act({ type: 'descend' }); else if (k === 'q' || k === '<') act({ type: 'ascend' });
});
menu();
