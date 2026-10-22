import { mountQuestJournal } from './quest-ui.js';
import { questProgress } from './game/quests.js';
import { adventurerSvg } from './render/adventurer.js';
import Phaser from 'phaser';
import { Expedition } from './game/expedition.js';
import { dangerAt } from './game/danger.js';
import { BIOMES, threatLabel } from './game/world.js';
import { attack, defense, threshold, projectileCount as stoneCount, EQUIPMENT_SLOTS, salePrice } from './game/items.js';
import { DungeonScene } from './render/scene.js';
import './style.css';
import { drawMinimap, drawWorldMinimap, campBearing } from './minimap.js';
import { mountEquipment } from './equipment-ui.js';
import { mountInventory } from './inventory-ui.js';
import { techniqueTargets } from './game/techniques.js';
import { RELEASE } from './version.js';
import { mountIcons } from './ui-icons.js';
import { inventoryLayout } from './game/inventory.js';
import { ENCOUNTERS } from './game/encounters.js';
import { bindTouchControls } from './touch-controls.js';
import { characterAt, characterDetails } from './character-inspection.js';
import { bindKeyboardMovement } from './keyboard-movement.js';

const scene = new DungeonScene();
const phaser = new Phaser.Game({ type: Phaser.CANVAS, parent: 'game', width: 768, height: 624, pixelArt: true,
  backgroundColor: '#090c12', scene: [scene], scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  callbacks: { postBoot() { setTimeout(() => { if (model) scene.setGame(model); }, 0); } } });
let model = null, paused = true, panel = null, mapView = 'local', inspected = null, inspectedMap = null, targetMode = null, lastShownBlock = 0;
new ResizeObserver(() => {
  const parent = document.getElementById('game');
  if (parent.clientWidth && parent.clientHeight) phaser.scale.resize(parent.clientWidth, parent.clientHeight);
  scene.draw();
}).observe(document.getElementById('game'));
const $ = id => document.getElementById(id);
mountIcons();
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function modal(title, body, buttons) {
  stopMovement();
  cancelTargeting();
  syncTouchControls();
  $('overlay').classList.remove('hidden');
  $('overlay').innerHTML = `<article role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"><p class="eyebrow">THE WILDLANDS</p><h2 id="dialog-title">${title}</h2>${body}<div class="buttons"></div><p class="hint release">${RELEASE}</p></article>`;
  for (const [text, fn] of buttons) { const b = document.createElement('button'); b.textContent = text; b.onclick = fn; $('overlay').querySelector('.buttons').append(b); }
  $('overlay').querySelector('article').focus({preventScroll:true});
}
function closePanel() { paused = false; panel = null; document.activeElement?.blur(); $('overlay').classList.add('hidden'); syncTouchControls(); }
function start() { lastShownBlock=0; $('block-feedback').textContent='';$('block-feedback').classList.remove('shield-block');$('character-shortcut').classList.remove('shield-block'); inspected=null; cancelTargeting(); setPanels(); mapView = 'local'; model = new Expedition(); closePanel(); render(); }
function help() {
  paused=true;panel='help';
  modal('Beyond the campfire', `<p>Biomes vary by run; mountains can border camp. At least one neighboring forest offers a starting foothold. Read trail warnings before crossing. Start with rats and beetles in those woods. First level: 20 XP, about ten ordinary kills. Marshes (recommended Lv4), highlands (Lv8), and ashlands (Lv12) can overwhelm a new adventurer. Trail exits warn you.</p>
  <p>Each wilderness map rolls one or two discoveries: crypt, creature den, villager quest, caravan, shrine, or cache. <b>Terrain, crypt layouts and explored maps persist for this run; ordinary enemies return.</b> Accepted quests, their givers and progress persist across travel, including after completion. Unaccepted regions refresh their discoveries and loose loot. Camp storage and merchant stock stay stable. Forests also have a 50% chance of an herbalist, wounded traveler or milestone with a crypt clue. Previously explored terrain remains mapped. Crypt entrances stay fixed; new encounters must be discovered again.</p>
  <p>WASD/arrows move/bump attack; hold to keep taking turns (release to stop). Touch arrows move once per tap. E / Collect interacts, loots, trades, or opens camp storage. Enter enters crypts; Q on upward stairs retreats. M casts Mind Vision (25 Mana); H drinks a tonic; period waits. I opens the 10×10 satchel; its Equipment tab shows your character and equipped gear; Esc pauses. Every valid action takes one turn, with arrival grace on transitions. Your action dock sits at the bottom; open Map for local/world views, Journal for all accepted quests, or Chronicle for event history.</p>
  <p>Ordinary defense has diminishing returns above 3. Trail Boots reduce detection; Iron Bands protect against special attacks. Amber boundary marks warn of territorial guardians; retreat outside their territory to disengage. Inventory: potion 1×1, sword 7×2, armor 4×4, amulet 2×2. Select an item and place or rotate it; arrangement is free. Using/equipping/dropping costs one turn. Full-bag failures preserve items and gold. Mara buys carried trophies/equipment.</p>
  <p>Use the Reach and Throw quick slots, or R and T. An equipped buckler passively blocks 35% of incoming attacks; no defensive action is needed. Choose highlighted targets; Cancel/Escape is free. Pink tiles warn of a frog tongue lash; amber crosses mark sap spit; orange lanes mark a ram charge. Move off marked tiles before the next enemy phase. Click a creature to read its attack. Strength is the attack stat. Click or tap a visible character to inspect their portrait, race and combat stats for free. Idle time never advances turns. Holding touch controls does not repeat. Death, refreshing, or closing the page ends the run. Speak to Trailwarden Iona west of camp for an expedition goal. Accepted quests persist across travel, have no timers, and are listed in the Journal. No saving, crafting or building.</p>`,[[model?'Resume':'Back',()=>model?closePanel():menu()]]);
}
function menu() {
  paused = true;
  modal('The Wildlands', '<p>A campfire at your back. An unknown world ahead.</p><p>Discover the Whisperwood and Lantern Marsh, follow forgotten trails, and brave the crypts beneath them. Return with treasure—or leave your story in the dark.</p><p class="hint">Endless exploration · Turn-based combat · Permadeath</p>', [['New Game', start], ['Instructions', help]]);
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
  model.state.player.inventory.forEach((item,index)=>{const b=document.createElement('button');b.className='item';b.textContent=`Sell ${item.name} · ${salePrice(item)} gold`;b.onclick=()=>{model.action({type:'sell',index});render();merchant();};$('shop-sales').append(b);});
}
function bag(view='satchel',slot='weapon') {
  if(!model||model.state.status!=='playing')return;
  paused=true;panel='bag';
  const perform=action=>{
    if(action.type==='targetThrow'){closePanel();beginTargeting('throw',action.index);return;}
    const carried=model.state.player.inventory[action.index];
    const focusSlot=action.slot??(carried?.kind==='ring'?(!model.state.player.ring1?'ring1':!model.state.player.ring2?'ring2':'ring1'):carried?.kind)??slot;
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
  if(view==='equipment')mountEquipment($('bag-editor'),model,perform,EQUIPMENT_SLOTS.includes(slot)?slot:'weapon');
  else mountInventory($('bag-editor'),model,perform);
}
function encounterDialog() {
  const event=model?.activeEncounter();if(!event||!['villager','shrine','woodland'].includes(event.type))return;
  paused=true;panel='encounter';
  const perform=action=>{model.action(action);render();if(model.state.status==='playing'){encounterDialog();$('encounter-result').textContent=event.type==='woodland'&&event.used?event.result:model.state.log.at(-1);}};
  if(event.type==='woodland'){
    const buttons=[['Return',closePanel]];
    if(!event.used){
      if(event.kind==='herbalist')buttons.unshift(['Buy tonic · 6 gold',()=>perform({type:'woodland',choice:'gold'})],['Exchange hunting trophy',()=>perform({type:'woodland',choice:'trophy'})]);
      else buttons.unshift([event.kind==='traveler'?'Give Ember tonic':'Read the milestone',()=>perform({type:'woodland'})]);
    }
    const result=event.kind==='milestone'&&event.used?(event.clue?'A crypt lies in region ('+event.clue.rx+', '+event.clue.ry+'). Its entrance must still be discovered.':'Seek old stone doorways for shelter below.'):event.used?'This encounter is resolved for the run.':event.description;
    modal(event.name,`<p>${escape(result)}</p><p class="hint">Browsing is free. Each successful exchange, aid or reading takes one turn. You may leave and return.</p><p id="encounter-result" role="status"></p>`,buttons);
  }else if(event.type==='villager'){
    const q=event.quest??model.state.quest;
    const buttons=[['Return',closePanel]];
    if(!q.accepted)buttons.unshift([q.legacy?'Accept frog quest':'Accept quest',()=>perform({type:'acceptQuest'})]);
    else if(!q.claimed&&(q.legacy?model.questRemaining()===0:q.complete))buttons.unshift([q.legacy?'Claim Reedheart amulet':'Claim reward',()=>perform({type:'claimQuest'})]);
    const description=q.legacy?'“Help me clear my swamp. Three troublesome frogs have taken over this clearing.”':q.description;
    modal(q.giver,`<h3>${escape(q.title)}</h3><p>${escape(description)}</p><p>${q.claimed?'Reward claimed. Thank you, traveler.':q.accepted?escape(questProgress(q)):escape('Reward: '+(q.legacy?'Reedheart amulet and 6 XP':q.reward.name+' and 6 XP'))}</p><p>Objective region: (${q.region.rx}, ${q.region.ry}). Return here whenever you are ready.</p><p class="hint">No time limit. Accepted quests and progress persist throughout this run, including when you leave the region.</p><p id="encounter-result" role="status"></p>`,buttons);
  }else if(event.quest){
    const q=event.quest,buttons=[['Return',closePanel]];
    if(q.accepted&&!event.used)buttons.unshift(['Rekindle waystone',()=>perform({type:'activateWard'})]);
    modal('A broken waystone',`<p>${q.accepted?escape(questProgress(q)):'A faint inscription points to a nearby warden. Accept their quest before rekindling these stones.'}</p><p>${event.used?'This stone is already lit.':'Rekindling takes one turn. The final stone awakens a sentinel.'}</p><p id="encounter-result" role="status"></p>`,buttons);
  }else{
    const buttons=[['Return',closePanel]];if(!event.used)buttons.unshift(['Heal 12 HP · 5 gold',()=>perform({type:'blessing',choice:'heal'})],['Restore 25 Mana · 6 HP',()=>perform({type:'blessing',choice:'mana'})]);
    modal('Wayfarer shrine',`<p>${event.used?'Its blessing is spent for this visit.':'Choose one exchange. Each uses a turn; enemies act afterward.'}</p><p id="encounter-result" role="status"></p>`,buttons);
  }
}
function interact() { if(!model||paused)return;if(model.atCamp())storage();else if(model.atMerchant())merchant();else if(['villager','shrine','woodland'].includes(model.activeEncounter()?.type))encounterDialog();else act({type:'pickup'}); }
function renderMinimap() {
  if (!model) return;
  const loc = model.location;
  if (mapView === 'world') drawWorldMinimap($('minimap'), model);
  else drawMinimap($('minimap'), model.state, loc);
  $('minimap-location').textContent = mapView === 'local' && loc.kind === 'crypt' ? `Depth ${loc.depth}` : `${loc.rx},${loc.ry}`;
  $('camp-bearing').textContent = campBearing(loc);
  $('map-legend').textContent = mapView === 'world' ? 'Green: forest · Blue: marsh · Gray: highlands · Red: ashlands · C: camp · Purple: discovered entrance · ! Quest objective · ✓ Return for reward' : '● You · C Camp · M Merchant · > Crypt · ? People · ! Den · S Shrine · K Cache';
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
  $('stats').innerHTML = `<div class="floor">${s.home?'SAFE CAMP':loc.kind==='world'?`AREA LV ${s.recommended}${p.level<s.recommended?' · DANGER':''}`:'UNDERGROUND'} <span>TURN ${s.turn}</span></div><h2 title="${escape(s.home?'Lantern Camp · Safe region':`Recommended level ${s.recommended}`)}">${escape(place)}</h2>
    <div class="bar"><div style="width:${p.hp/p.maxHp*100}%"></div><span>Health ${p.hp} / ${p.maxHp}</span></div>
    <div class="bar mana"><div style="width:${p.mana/p.maxMana*100}%"></div><span>Mana ${p.mana} / ${p.maxMana}</span></div>
    <div class="bar xp"><div style="width:${p.xp/threshold(p)*100}%"></div><span>XP ${p.xp} / ${threshold(p)}</span></div>
    <div class="numbers">Lv ${p.level} · ${attack(p)} ATK · ${defense(p)} DEF · <b>${p.gold} gold</b></div>`;
  const ahead=model.borderPreview(),pocket=dangerAt(s);
  if(ahead||pocket){const warning=document.createElement('p');warning.id='travel-warning';warning.className='vision-status danger-status';warning.textContent=ahead?`${ahead.name} ahead · Lv ${ahead.recommended} · ${threatLabel(ahead.recommended,p.level)}`:`⚠ ${pocket.name} · guarded territory`;$('stats').append(warning);}
  $('portrait-level').textContent=p.level;
  const conditions=[p.corrosion>0?'Corroded −1 DEF · '+p.corrosion+' turns':null,p.smokeTurns>0?'Smoke · '+p.smokeTurns+' turns':null,p.rationTurns>0?'Rations · '+p.rationTurns+' turns':null].filter(Boolean);
  if(conditions.length){const status=document.createElement('p');status.className='vision-status';status.textContent=conditions.join(' / ');$('stats').append(status);}

  if(s.mindVisionUntil>=s.turn&&s.mindVisionUntil>0){const status=document.createElement('p');status.className='vision-status';status.textContent=`Mind Vision active · ${s.mindVisionUntil-s.turn+1} turns`;$('stats').append(status);}
  $('character-shortcut').querySelector('svg').outerHTML=adventurerSvg(p).replace(/ data-[a-z0-9]+-icon=""/g,'');
  $('stone-count').textContent=stoneCount(p);
  if((s.blockedAttacks??0)>lastShownBlock){
    lastShownBlock=s.blockedAttacks;
    $('character-shortcut').classList.remove('shield-block');$('block-feedback').classList.remove('shield-block');
    void $('character-shortcut').offsetWidth;
    $('block-feedback').textContent='Blocked!';$('character-shortcut').classList.add('shield-block');$('block-feedback').classList.add('shield-block');
  }
  const used=(inventoryLayout(p.inventory)??[]).reduce((n,i)=>n+i.w*i.h,0);
  $('bag-capacity').textContent=`${used}/100`;
  $('manage-bag').title=`Open 10×10 satchel [I] · ${used} / 100 cells used`;
  $('potion-count').textContent=p.inventory.filter(i=>i.kind==='potion').length;
  $('quest-indicator').classList.toggle('hidden',![...model.quests.values()].some(q=>q.accepted&&!q.claimed));
  mountQuestJournal($('quest-info'),model,renderMinimap);
  $('latest-event').textContent = s.log.at(-1) ?? '';
  $('log').innerHTML = s.log.slice(-25).map(t => `<p>${escape(t)}</p>`).join(''); $('log').scrollTop = $('log').scrollHeight;
  renderInspection();
  if(s.status!=='playing')cancelTargeting();
  syncTouchControls();
  if (s.status === 'dead') {
    paused = true; panel = 'dead';
    modal('Your lantern goes dark.', `<p>Your expedition ends here. The camp and its supplies are lost.</p><p>Level ${p.level} · ${s.regionsDiscovered} regions · ${s.cryptsCleared} crypts cleared · ${p.gold} gold</p><p class="hint">Seed: ${s.seed}</p>`, [['New Run', start], ['Title', () => { model = null; menu(); }]]);
  }
}
function renderInspection(){
  const current=inspected&&model&&characterAt(model,inspected.x,inspected.y);
  if(!current||model.state.map!==inspectedMap||current.kind!==inspected.kind||(!inspected.friendly&&current!==inspected)||model.state.status!=='playing')inspected=null;
  $('character-inspector').classList.toggle('hidden',!inspected);
  if(!inspected)return;
  const d=characterDetails(model,inspected);
  $('inspection-details').innerHTML=`<h3>${escape(d.name)}</h3><img class="inspection-portrait" alt="${escape(d.name)} portrait" src="${scene.portrait(d.kind)}"><p class="inspection-race">${escape(d.race)}</p>
    <dl><dt>Strength</dt><dd>${d.strength??'—'}</dd><dt>Defense</dt><dd>${d.defense??'—'}</dd><dt>Health</dt><dd>${d.hp===null?'Noncombatant':`${d.hp} / ${d.maxHp}`}</dd></dl>
    ${d.ability?`<p class="creature-trait">${escape(d.ability)}</p>`:''}${d.warning?`<p class="creature-warning">${escape(d.warning)}</p>`:''}
    ${d.hp===null?'<p class="hint">Friendly · use Interact nearby.</p>':`<div class="bar inspection-health"><div style="width:${Math.max(0,d.hp/d.maxHp*100)}%"></div></div>`}`;
}
scene.onInspect=(x,y)=>{
  if(!model||paused||model.state.status!=='playing')return;
  if(targetMode){completeTarget(x,y);return;}
  inspected=characterAt(model,x,y);inspectedMap=model.state.map;renderInspection();
};
$('close-inspector').onclick=()=>{inspected=null;renderInspection();document.activeElement?.blur();};
function cancelTargeting(){
  targetMode=null;scene.targetHighlights=[];$('targeting-bar').classList.add('hidden');scene.draw();
}
let targetAmmo;
function beginTargeting(type,index){
  targetAmmo=index;
  if(!model||paused||model.state.status!=='playing')return;
  stopMovement();inspected=null;renderInspection();
  const targets=techniqueTargets(model,type);
  if(!targets.length){model.message(type==='reach'?'No clear spear target within two cardinal tiles.':'No clear enemy within throwing range (4 tiles), or no stones carried.');render();return;}
  $('minimap-widget').open=false;$('quest-panel').open=false;$('chronicle-panel').open=false;
  targetMode=type;scene.targetHighlights=targets;scene.draw();
  $('targeting-bar').classList.remove('hidden');$('targeting-title').textContent=type==='reach'?'Spear reach':'Throw a stone';
  $('targeting-notice').textContent='Tap a highlighted enemy or choose below. One attack = one turn. Cancel is free.';
  $('target-options').replaceChildren();
  if(type==='throw'){
    const select=document.createElement('select');select.setAttribute('aria-label','Throwing ammunition');
    model.state.player.inventory.forEach((item,i)=>{if(!['stone','knife','thunder'].includes(item.kind))return;const option=document.createElement('option');option.value=i;option.textContent=item.name+' ×'+item.quantity;select.append(option);});
    if(index!==undefined)select.value=index;targetAmmo=Number(select.value);select.onchange=()=>{targetAmmo=Number(select.value);};$('target-options').append(select);
    $('targeting-title').textContent='Throw a projectile';
  }
  for(const enemy of targets){const b=document.createElement('button');b.textContent=`${enemy.name} · ${enemy.hp} HP`;b.onclick=()=>completeTarget(enemy.x,enemy.y);$('target-options').append(b);}
  syncTouchControls();
}
function completeTarget(x,y){
  const type=targetMode;if(!type)return;
  if(!model.action({type,x,y,index:targetAmmo})){$('targeting-notice').textContent='That target is blocked or out of range. Choose a highlighted enemy or Cancel.';return;}
  cancelTargeting();render();
}
$('cancel-targeting').onclick=()=>{cancelTargeting();syncTouchControls();document.activeElement?.blur();};
function act(action) {
 if(!model||paused||targetMode)return;
 if(document.activeElement?.tagName==='SUMMARY')document.activeElement.blur();
 const location=model.location.id,before=model.borderPreview(),oldPocket=dangerAt(model.state);
 model.action(action);
 const ahead=model.borderPreview(),pocket=dangerAt(model.state);
 if(model.location.id!==location||ahead&&ahead.recommended>model.state.player.level&&(!before||before.rx!==ahead.rx||before.ry!==ahead.ry)||pocket&&!oldPocket)stopMovement();
 render();
}
function syncTouchControls() {
  const ready = model && !paused && model.state.status === 'playing';
  const s = model?.state, p = s?.player;
  for (const button of document.querySelectorAll('#touch-controls button')) {
    let allowed = Boolean(ready);
    const control = button.dataset.control;
    if (ready) {
      if(control==='reach')allowed=Boolean(p.weapon?.reach>=2);
      if(control==='throw')allowed=stoneCount(p)>0;
      if (control === 'vision') allowed = p.mana >= 25;
      if (control === 'potion') allowed = p.hp < p.maxHp && p.inventory.some(i => i.kind === 'potion');
      if (control === 'ascend') allowed = model.location.kind === 'crypt' && p.x === s.upstairs.x && p.y === s.upstairs.y;
      if (control === 'descend') allowed = model.location.kind === 'world' ? s.map[p.y][p.x] === 'D' : model.location.depth === 1 && p.x === s.stairs.x && p.y === s.stairs.y;
      if (control === 'collect') { const label = model.atCamp() ? 'Camp chest' : model.atMerchant() ? 'Trade' : ['villager','shrine','woodland'].includes(model.activeEncounter()?.type)?'Interact':'Collect'; button.querySelector('.action-label').textContent=label; button.setAttribute('aria-label',label); allowed = model.atCamp() || model.atMerchant() || ['villager','shrine','woodland'].includes(model.activeEncounter()?.type) || s.items.some(i => i.x === p.x && i.y === p.y); }
    }
    button.disabled = !allowed||Boolean(targetMode);
    if(control==='descend'||control==='ascend')button.classList.toggle('hidden',!allowed);
  }
  document.querySelector('main').classList.toggle('has-stairs', Boolean(ready&&(model.location.kind==='world'?s.map[p.y][p.x]==='D':p.x===s.upstairs.x&&p.y===s.upstairs.y||model.location.depth===1&&p.x===s.stairs.x&&p.y===s.stairs.y)));
}
bindTouchControls($('touch-controls'), control => {
  if (!model || paused || model.state.status !== 'playing') return;
  const directions = { north: [0,-1], south: [0,1], east: [1,0], west: [-1,0] };
  if (directions[control]) act({ type: 'move', dx: directions[control][0], dy: directions[control][1] });
  else if (control === 'collect') interact();
  else if(control==='reach'||control==='throw')beginTargeting(control);
  else act({ type: ({ collect: 'pickup', vision: 'mindVision' })[control] ?? control });
});
const phoneLayout = matchMedia('(max-width: 700px), (pointer: coarse)');
function setPanels() { $('chronicle-panel').open=false; $('quest-panel').open=false; $('minimap-widget').open=!phoneLayout.matches; }
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
for(const [id,other] of [['minimap-widget','quest-panel'],['quest-panel','minimap-widget']])$(id).querySelector('summary').addEventListener('click',()=>{if(!$(id).open)$(other).open=false;});
for(const id of ['minimap-widget','quest-panel','chronicle-panel'])$(id).addEventListener('toggle',()=>{
  if(!$(id).open)return;
  stopMovement();
  if(id==='minimap-widget')$('quest-panel').open=false;
  if(id==='quest-panel')$('minimap-widget').open=false;
});
$('help').onclick = help;
$('manage-bag').onclick=()=>{if(!paused)bag();};
$('open-equipment').onclick=()=>{if(!paused)bag('equipment','amulet');};
$('character-shortcut').onclick=()=>{if(!paused)bag('equipment');};
const stopMovement = bindKeyboardMovement(act, () => model && !paused && !targetMode && model.state.status === 'playing');
window.addEventListener('keydown', event => {
  if(event.key==='Tab'&&paused&&!$('overlay').classList.contains('hidden')){
    const focusable=[...$('overlay').querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);
    if(focusable.length){const current=focusable.indexOf(document.activeElement),next=event.shiftKey?(current<=0?focusable.length-1:current-1):(current+1)%focusable.length;event.preventDefault();focusable[next].focus();}
    return;
  }
  if (event.key!=='Escape'&&event.target?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if ((event.target instanceof HTMLButtonElement || event.target?.tagName === 'SUMMARY' || event.target?.tagName==='INPUT') && (event.key === 'Enter' || event.key === ' ')) return;
  const k = event.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'enter'].includes(k)) event.preventDefault();
  if(targetMode){if(k==='escape'){event.preventDefault();cancelTargeting();syncTouchControls();}return;}
  if (k === 'escape') { if (model && paused && model.state.status === 'playing') closePanel(); else if (!paused) help(); return; }
  if(k==='i'&&model&&model.state.status==='playing'){if(panel==='bag')closePanel();else if(!paused)bag();return;}
  if(!paused&&k==='r'){beginTargeting('reach');return;}
  if(!paused&&k==='t'){beginTargeting('throw');return;}
  if(k==='e'&&!paused){interact();return;}
  if (k === '.') act({ type: 'wait' });
  else if (k === 'h') act({ type: 'potion' }); else if (k === 'm') act({ type: 'mindVision' });
  else if (k === 'enter' || k === '>') act({ type: 'descend' }); else if (k === 'q' || k === '<') act({ type: 'ascend' });
});
menu();
