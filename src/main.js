import Phaser from 'phaser';
import { Expedition } from './game/expedition.js';
import { BIOMES } from './game/world.js';
import { attack, defense, threshold } from './game/items.js';
import { DungeonScene } from './render/scene.js';
import './style.css';
import { drawMinimap, drawWorldMinimap, campBearing } from './minimap.js';
import { mountEquipment } from './equipment-ui.js';
import { mountInventory } from './inventory-ui.js';
import { inventoryLayout } from './game/inventory.js';
import { ENCOUNTERS } from './game/encounters.js';
import { bindTouchControls } from './touch-controls.js';

const scene = new DungeonScene();
const phaser = new Phaser.Game({ type: Phaser.CANVAS, parent: 'game', width: 768, height: 624, pixelArt: true,
  backgroundColor: '#090c12', scene: [scene], scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  callbacks: { postBoot() { setTimeout(() => { if (model) scene.setGame(model); }, 0); } } });
let model = null, paused = true, panel = null, mapView = 'local';
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
function start() { mapView = 'local'; model = new Expedition(); closePanel(); render(); }
function help() {
  paused=true;panel='help';
  modal('Beyond the campfire', `<p>Start with rats and beetles in neighboring woods. First level: 20 XP, about ten ordinary kills. Marshes (recommended Lv4), highlands (Lv8), and ashlands (Lv12) can overwhelm a new adventurer. Trail exits warn you.</p>
  <p>Each wilderness map rolls one or two discoveries: crypt, creature den, villager quest, caravan, shrine, or cache. <b>Every non-camp region and crypt floor regenerates on return.</b> Creatures, loot, quests, terrain and local fog reset; claim rewards before leaving. Camp storage and merchant stock stay stable. World-map squares remember travel history, not permanent terrain.</p>
  <p>WASD/arrows or touch arrows move/bump attack. E / Collect interacts, loots, trades, or opens camp storage. Enter enters crypts; Q on upward stairs retreats. M casts Mind Vision (25 Mana); H drinks a tonic; period waits. I opens the 10×10 satchel; its Equipment tab shows your character and equipped gear; Esc pauses. Every valid action takes one turn, with arrival grace on transitions.</p>
  <p>Inventory: potion 1×1, sword 7×2, armor 4×4, amulet 2×2. Select an item and place or rotate it; arrangement is free. Using/equipping/dropping costs one turn. Full-bag failures preserve items and gold. Mara buys carried trophies/equipment.</p>
  <p>Idle time never advances turns. Holding touch controls does not repeat. Death, refreshing, or closing the page ends the run. No saving, crafting or building.</p>`,[[model?'Resume':'Back',()=>model?closePanel():menu()]]);
}
function menu() {
  paused = true;
  modal('The Wildlands', '<p>A campfire at your back. An unknown world ahead.</p><p>Discover the Whisperwood and Lantern Marsh, follow forgotten trails, and brave the crypts beneath them. Return with treasure—or leave your story in the dark.</p><p class="hint">Endless exploration · Turn-based combat · Permadeath<br>v0.5.1 — Equipment screen</p>', [['New Game', start], ['Instructions', help]]);
}
function storage() {
  if (!model?.atCamp()) return;
  paused = true; panel = 'storage';
  modal('Lantern Camp storage', '<p>This region is safe. Transfers cost one turn. Stored supplies are lost if you die.</p><div id="storage-lists"></div><p id="storage-result" role="status"></p>', [['Return', closePanel]]);
  for (const [title, items, type] of [['Your satchel', model.state.player.inventory, 'store'], ['Camp chest', model.stash, 'retrieve']]) {
    const section = document.createElement('section'), h = document.createElement('h3'); h.textContent = title; section.append(h);
    if (!items.length) { const p = document.createElement('p'); p.textContent = 'Empty'; section.append(p); }
    items.forEach((item, index) => { const b = document.createElement('button'); b.className = 'item'; b.textContent = `${type === 'store' ? 'Store' : 'Take'} ${item.name}`; b.onclick = () => { model.action({ type, index }); render(); storage(); $('storage-result').textContent=model.state.log.at(-1); }; section.append(b); });
    $('storage-lists').append(section);
  }
}
function merchant() {
  if (!model?.atMerchant()) return;
  paused = true; panel = 'merchant';
  modal('Mara the Wayfarer', '<p>Potions and equipment for the road. Browse freely; each purchase costs one turn. Limited stock. Sell carried trophies or spare gear below; each trade costs one turn.</p><p id="shop-gold"></p><div id="shop-offers"></div><h3>Sell from satchel</h3><div id="shop-sales"></div><p id="shop-result" role="status"></p>', [['Return', closePanel]]);
  $('shop-gold').textContent = `Your gold: ${model.state.player.gold}`;
  for (const offer of model.shop) {
    const row = document.createElement('section'), name = document.createElement('h3'), description = document.createElement('p'), button = document.createElement('button');
    name.textContent = `${offer.item.name}${offer.item.bonus ? ` (+${offer.item.bonus} ${offer.item.kind === 'weapon' ? 'ATK' : 'DEF'})` : ''}`;
    description.textContent = `${offer.item.description} · ${offer.price} gold · ${offer.stock} left`;
    button.textContent = offer.stock === 0 ? `Sold out: ${offer.item.name}` : `Buy ${offer.item.name} · ${offer.price} gold`;
    button.disabled = offer.stock <= 0 || model.state.player.gold < offer.price;
    button.onclick = () => { model.action({ type: 'buy', id: offer.id }); render(); merchant(); $('shop-result').textContent=model.state.log.at(-1); };
    row.append(name, description, button); $('shop-offers').append(row);
  }
  model.state.player.inventory.forEach((item,index)=>{const b=document.createElement('button');b.className='item';b.textContent=`Sell ${item.name} · ${item.sellValue??(item.kind==='potion'?3:1)} gold`;b.onclick=()=>{model.action({type:'sell',index});render();merchant();};$('shop-sales').append(b);});
}
function bag(view='satchel',slot='weapon') {
  if(!model||model.state.status!=='playing')return;
  paused=true;panel='bag';
  const perform=action=>{
    const focusSlot=action.slot??model.state.player.inventory[action.index]?.kind??slot;
    model.action(action);render();
    if(model.state.status==='playing'){bag(view,focusSlot);$('bag-result').textContent=model.state.log.at(-1);}
  };
  const buttons=[['Return',closePanel]];
  if(view==='satchel'&&model.state.items.some(i=>i.x===model.state.player.x&&i.y===model.state.player.y))buttons.unshift(['Pick up item here',()=>perform({type:'pickup'})]);
  modal('Your equipment',`<div class="equipment-tabs" role="tablist" aria-label="Character inventory view">
    <button role="tab" id="satchel-tab" aria-selected="${view==='satchel'}" aria-controls="character-panel">Satchel</button>
    <button role="tab" id="equipment-tab" aria-selected="${view==='equipment'}" aria-controls="character-panel">Equipment</button>
    </div><p class="hint">Viewing and switching tabs are free. Equipping and unequipping cost one turn. Unequipped items need room in your satchel.</p>
    <div id="character-panel" role="tabpanel" aria-labelledby="${view==='satchel'?'satchel-tab':'equipment-tab'}"><div id="bag-editor"></div></div><p id="bag-result" role="status"></p>`,buttons);
  const switchView=next=>bag(next,slot);
  $('satchel-tab').onclick=()=>switchView('satchel');$('equipment-tab').onclick=()=>switchView('equipment');
  for(const tab of [$('satchel-tab'),$('equipment-tab')]){
    tab.tabIndex=tab.getAttribute('aria-selected')==='true'?0:-1;
    tab.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();event.stopPropagation();const next=event.key==='Home'?'satchel':event.key==='End'?'equipment':view==='satchel'?'equipment':'satchel';switchView(next);$(`${next}-tab`).focus();};
  }
  if(view==='equipment')mountEquipment($('bag-editor'),model,perform,['weapon','armor','amulet'].includes(slot)?slot:'weapon');
  else mountInventory($('bag-editor'),model,perform);
}
function encounterDialog() {
  const event=model?.activeEncounter();if(!event||!['villager','shrine'].includes(event.type))return;
  paused=true;panel='encounter';
  const perform=action=>{model.action(action);render();if(model.state.status==='playing'){encounterDialog();$('encounter-result').textContent=model.state.log.at(-1);}};
  if(event.type==='villager'){
    const q=model.state.quest,remaining=model.questRemaining();
    const buttons=[['Return',closePanel]];
    if(!q.accepted)buttons.unshift(['Accept frog quest',()=>perform({type:'acceptQuest'})]);
    else if(!q.claimed&&remaining===0)buttons.unshift(['Claim Reedheart amulet',()=>perform({type:'claimQuest'})]);
    modal('The Mirekeeper',`<p>“Help me clear my swamp. Three troublesome frogs have taken over this clearing.”</p><p>${q.claimed?'Reward claimed. Thank you, traveler.':q.accepted?`${remaining} frogs remain. Return here for a 2×2 Reedheart amulet (+1 defense).`:'Reward: Reedheart amulet (+1 defense), plus 6 XP.'}</p><p class="hint">Leaving this region resets this quest. Accepting and claiming each take one turn.</p><p id="encounter-result" role="status"></p>`,buttons);
  }else{
    const buttons=[['Return',closePanel]];if(!event.used)buttons.unshift(['Heal 12 HP · 5 gold',()=>perform({type:'blessing',choice:'heal'})],['Restore 25 Mana · 6 HP',()=>perform({type:'blessing',choice:'mana'})]);
    modal('Wayfarer shrine',`<p>${event.used?'Its blessing is spent for this visit.':'Choose one exchange. Each uses a turn; enemies act afterward.'}</p><p id="encounter-result" role="status"></p>`,buttons);
  }
}
function interact() { if(!model||paused)return;if(model.atCamp())storage();else if(model.atMerchant())merchant();else if(['villager','shrine'].includes(model.activeEncounter()?.type))encounterDialog();else act({type:'pickup'}); }
function renderMinimap() {
  if (!model) return;
  const loc = model.location;
  if (mapView === 'world') drawWorldMinimap($('minimap'), model);
  else drawMinimap($('minimap'), model.state, loc);
  $('minimap-location').textContent = mapView === 'local' && loc.kind === 'crypt' ? `Depth ${loc.depth}` : `${loc.rx},${loc.ry}`;
  $('camp-bearing').textContent = campBearing(loc);
  $('map-legend').textContent = mapView === 'world' ? 'Green: forest · Blue: marsh · Gray: highlands · Red: ashlands · C: camp · Purple: last-seen entrance' : '● You · C Camp · M Merchant · > Crypt · ? Quest · ! Den · S Shrine · K Cache';
  $('minimap-panel').setAttribute('aria-labelledby', `map-${mapView}-tab`);
  for (const tab of document.querySelectorAll('[data-map-view]')) {
    const selected = tab.dataset.mapView === mapView;
    tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
  }
}
function render() {
  if (!model) return;
  scene.setGame(model);
  renderMinimap();
  const s = model.state, p = s.player, loc = model.location;
  const place = loc.kind === 'world' ? `${BIOMES[s.biome].name} (${loc.rx}, ${loc.ry})` : `${s.biome === 'marsh' ? 'Sunken' : 'Rootbound'} Crypt · ${loc.depth}/2`;
  $('stats').innerHTML = `<div class="floor">${loc.kind === 'world' ? 'WILDLANDS' : 'UNDERGROUND'}${s.home?'':` · AREA LV ${s.recommended}`} <span>TURN ${s.turn}</span></div><h2>${escape(place)}</h2><p class="hint location">${s.home ? 'Safe region · Camp (0, 0)' : `Recommended Lv ${s.recommended}${p.level<s.recommended?' — DANGER':''} · Camp (0, 0)`}<br>${s.regionsDiscovered} regions discovered · ${s.cryptsCleared} crypts cleared</p>
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
  if(['villager','shrine'].includes(model.activeEncounter()?.type)){const b=document.createElement('button');b.className='item';b.textContent='Interact [E]';b.onclick=encounterDialog;$('stats').append(b);}
  $('equipment-info').textContent = `Weapon: ${p.weapon?.name ?? 'Bare blade'} · Armor: ${p.armor?.name ?? 'Travel clothes'} · Amulet: ${p.amulet?.name??'none'}`;
  $('bag-capacity').textContent = `${(inventoryLayout(p.inventory)??[]).reduce((n,i)=>n+i.w*i.h,0)} / 100 cells used`;
  $('quest-info').textContent = s.quest ? s.quest.claimed ? 'Frog quest completed this visit.' : `${s.quest.accepted?'Accepted':'Available'}: clear the frogs (${model.questRemaining()} remain). Reward: Reedheart amulet. Leaving resets this quest.` : 'Find a Mirekeeper in the wilderness for a local frog-clearing quest.';
  $('inventory').innerHTML = '';
  p.inventory.forEach((item, index) => { const b = document.createElement('button'); b.className = 'item'; b.textContent = item.name + (item.bonus ? ` (+${item.bonus} ${item.kind === 'weapon' ? 'ATK' : 'DEF'})` : ''); b.setAttribute('aria-label', b.textContent); const description = document.createElement('small'); description.className = 'item-description'; description.textContent = item.description ?? (item.kind === 'weapon' ? 'Adds attack while equipped.' : 'Reduces incoming damage while equipped.'); b.append(description); b.disabled=!['potion','weapon','armor','amulet'].includes(item.kind); b.onclick = () => act({ type: item.kind === 'potion' ? 'potion' : 'equip', index }); $('inventory').append(b); });
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
      if (control === 'collect') { button.textContent = model.atCamp() ? 'Camp chest' : model.atMerchant() ? 'Trade' : ['villager','shrine'].includes(model.activeEncounter()?.type)?'Interact':'Collect'; allowed = model.atCamp() || model.atMerchant() || ['villager','shrine'].includes(model.activeEncounter()?.type) || s.items.some(i => i.x === p.x && i.y === p.y); }
    }
    button.disabled = !allowed;
  }
}
bindTouchControls($('touch-controls'), control => {
  if (!model || paused || model.state.status !== 'playing') return;
  const directions = { north: [0,-1], south: [0,1], east: [1,0], west: [-1,0] };
  if (directions[control]) act({ type: 'move', dx: directions[control][0], dy: directions[control][1] });
  else if (control === 'help') help();
  else if (control === 'collect') interact();
  else act({ type: ({ collect: 'pickup', vision: 'mindVision' })[control] ?? control });
});
const phoneLayout = matchMedia('(max-width: 700px), (pointer: coarse)');
function setPanels() { $('chronicle-panel').open = !phoneLayout.matches; }
phoneLayout.addEventListener('change', setPanels); setPanels();
for (const tab of document.querySelectorAll('[data-map-view]')) tab.addEventListener('click', event => { mapView = tab.dataset.mapView; renderMinimap(); if (event.detail > 0) tab.blur(); });
$('map-tabs').addEventListener('keydown', event => {
  if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
  event.preventDefault(); event.stopPropagation();
  const next = event.key === 'Home' ? 'local' : event.key === 'End' ? 'world' : mapView === 'local' ? 'world' : 'local';
  $(`map-${next}-tab`).click(); $(`map-${next}-tab`).focus();
});
$('minimap-widget').addEventListener('toggle', () => {
  const open = $('minimap-widget').open;
  $('map-collapse-icon').textContent = open ? '−' : '+';
  $('minimap-widget').querySelector('summary').title = open ? 'Minimize map' : 'Restore map';
});
$('minimap-widget').querySelector('summary').addEventListener('click', event => { if (event.detail > 0) document.activeElement?.blur(); });
$('satchel-panel').addEventListener('toggle', () => {
  $('satchel-collapse-icon').textContent = $('satchel-panel').open ? '−' : '+';
});
$('satchel-panel').querySelector('summary').addEventListener('click', event => { if (event.detail > 0) document.activeElement?.blur(); });
$('help').onclick = help;
$('manage-bag').onclick=()=>{if(!paused)bag();};
$('open-equipment').onclick=()=>{if(!paused)bag('equipment','amulet');};
window.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if ((event.target instanceof HTMLButtonElement || event.target?.tagName === 'SUMMARY' || event.target?.tagName==='INPUT') && (event.key === 'Enter' || event.key === ' ')) return;
  const k = event.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'enter'].includes(k)) event.preventDefault();
  if (k === 'escape') { if (model && paused && model.state.status === 'playing') closePanel(); else if (!paused) help(); return; }
  if(k==='i'&&model&&model.state.status==='playing'){if(panel==='bag')closePanel();else if(!paused)bag();return;}
  if(k==='e'&&!paused){interact();return;}
  const moves = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };
  if (moves[k]) act({ type: 'move', dx: moves[k][0], dy: moves[k][1] });
  else if (k === '.') act({ type: 'wait' }); else if (k === 'e') act({ type: 'pickup' });
  else if (k === 'h') act({ type: 'potion' }); else if (k === 'm') act({ type: 'mindVision' });
  else if (k === 'enter' || k === '>') act({ type: 'descend' }); else if (k === 'q' || k === '<') act({ type: 'ascend' });
});
menu();
