import {travelAltars,nearAltar,altarTravelProblem,altarThreat} from './game/altars.js';
import {MAP_ZOOMS,kingdomBearing} from './map-navigation.js';
import {RunStorage} from './game/save.js';
import {SeamlessExpedition} from './game/seamless-expedition.js';
import {mountTrading} from './trading-ui.js';
import {inspectMapAt,mapInspectionText} from './map-inspection.js';
import {equipmentSummary} from './game/gear-progression.js';
import {atBlacksmith,canEnhance,enhancementCost,enhancementCap,enhancementPreview} from './game/blacksmith.js';
import {playerOffenseRange,rangeLabel} from './game/damage-rolls.js';
import {InteractionSelection} from './game/interactions.js';
import {bridgeQuest,BRIDGE_TOLL} from './game/bridge.js';
import {attackWarning} from './game/combat-feedback.js';
import {atGravekeeper,boneCount} from './game/gravekeeper.js';
import {assignQuick,quickItem,quickAction,cookAll} from './game/quality.js';
import {itemEmoji} from './item-icons.js';
import {atTown,atInn} from './game/town.js';
import {describeCreature} from './game/enemy-actions.js';
import {princeProgress} from './game/story.js';
import { ClickTravel } from './click-travel.js';
import { mountQuestJournal } from './quest-ui.js';
import { questProgress } from './game/quests.js';
import { adventurerSvg } from './render/adventurer.js';
import Phaser from 'phaser';
import { Expedition } from './game/expedition.js';
import { dangerAt } from './game/danger.js';
import { BIOMES, threatLabel } from './game/world.js';
import { attack, defense, threshold, projectileCount as stoneCount, EQUIPMENT_SLOTS, equippedSlot } from './game/items.js';
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
const interactionSelection=new InteractionSelection();
const mapZoom={local:1,world:1};
let model = null, paused = true, panel = null, mapView = 'local', mapSelection = null, inspected = null, inspectedMap = null, targetMode = null, lastShownBlock = 0;
new ResizeObserver(() => {
  const parent = document.getElementById('game');
  if (parent.clientWidth && parent.clientHeight) phaser.scale.resize(parent.clientWidth, parent.clientHeight);
  scene.draw();positionBearing();
}).observe(document.getElementById('game'));
const $ = id => document.getElementById(id);
const runStorage=new RunStorage({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)});
function persistRun(){if(!model)return;const ok=runStorage.save(model);$('save-status').textContent=ok?'':'Saving unavailable. '+runStorage.error;$('save-status').hidden=ok;}
function resumeRun(saved){travel.cancel();stopMovement();inspected=null;mapSelection=null;mapView='local';mapZoom.local=mapZoom.world=1;cancelTargeting();setPanels();lastShownBlock=saved.state.blockedAttacks??0;model=saved;closePanel();render();}
function mapModel(){return mapView==='world'?(model.worldMapModel?.()??model):model;}

const travel=new ClickTravel({
 getGame:()=>model,ready:()=>!paused&&!targetMode&&model?.state.status==='playing'&&!document.hidden,
 perform:action=>act(action,true),
 arrive:intent=>{if(intent.type==='interact')interact(intent);else act({type:intent.type,item:intent.item},true);},
 changed:()=>{scene.travelHighlights=travel.plan?.steps??[];if(scene.ready)scene.draw();}
});

mountIcons();
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function modal(title, body, buttons) {
  travel.cancel();
  stopMovement();
  cancelTargeting();
  syncTouchControls();
  $('overlay').classList.remove('hidden');
  $('overlay').innerHTML = `<article role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"><p class="eyebrow">THE WILDLANDS</p><h2 id="dialog-title">${title}</h2>${body}<div class="buttons"></div><p class="hint release">${RELEASE}</p></article>`;
  for (const [text, fn] of buttons) { const b = document.createElement('button'); b.textContent = text; b.onclick = fn; $('overlay').querySelector('.buttons').append(b); }
  $('overlay').querySelector('article').focus({preventScroll:true});
}
function closePanel() { paused = false; panel = null; document.activeElement?.blur(); $('overlay').classList.add('hidden'); syncTouchControls();if(model)renderMinimap(); }
function start(seed,seamless=true) {if(!Number.isInteger(seed))seed=Date.now(); travel.cancel(); lastShownBlock=0; $('block-feedback').textContent='';$('block-feedback').classList.remove('shield-block');$('character-shortcut').classList.remove('shield-block'); inspected=null; cancelTargeting(); setPanels(); mapView = 'local'; mapZoom.local=mapZoom.world=1;mapSelection=null; model = seamless?new SeamlessExpedition(seed):new Expedition(seed); closePanel(); render(); }
function intro() {
  paused=true;panel='intro';
  modal('Beyond the campfire', `<div class="intro-copy"><p>Biomes vary by run; mountains can border camp. At least one neighboring forest offers a starting foothold. Read trail warnings before crossing. Start with rats and beetles in those woods. First level: 20 XP, about ten ordinary kills. Marshes (recommended Lv4), highlands (Lv6), and ashlands (Lv12) can overwhelm a new adventurer. Trail exits warn you.</p>
  <p>Each wilderness map rolls one or two discoveries: crypt, creature den, villager quest, caravan, shrine, or cache. <b>Terrain, crypt layouts and explored maps persist for this run; ordinary enemies return.</b> Accepted quests, their givers and progress persist across travel, including after completion. The expanding world retains discoveries, loose loot and cleared crypts. Classic expedition refreshes ordinary enemies and unaccepted discoveries on return. Camp storage and merchant stock stay stable. Forests also have a 50% chance of an herbalist, wounded traveler or milestone with a crypt clue. Previously explored terrain remains mapped. Crypt entrances stay fixed; new encounters must be discovered again.</p>
  <p>Desktop: click a visible empty tile to walk; click an item to walk and pick it up, or a friendly site to approach and interact. Each step and pickup is a turn. Travel stops for danger, new enemies and attacks. Press Escape or give manual input to cancel. Click creatures to inspect; Shift-click friendly people to inspect. WASD/arrows move/bump attack; hold to keep taking turns (release to stop). Touch arrows move once per tap. E / Collect performs the selected nearby action. When actions overlap, tap Next action or press F to cycle for free; the interaction button shows the selected person or item. You can pick up individual items beneath an NPC or camp storage. Enter enters crypts; Q on upward stairs retreats. M casts Mind Vision (25 Mana); G casts Detect Creatures at level 3 (25 Mana, two turns on the local minimap). Mana recovers 0.3 each completed turn; H drinks a tonic; period waits. I opens the 10×10 satchel; its Equipment tab shows your character and equipped gear; Esc pauses. Every valid action takes one turn, without advancing while you think. Your action dock sits at the bottom; open Map for Nearby/Explored views, Journal for all accepted quests, or Chronicle for event history.</p>
  <p>Ordinary defense has diminishing returns above 3. Trail Boots reduce detection; Iron Bands protect against special attacks. Amber boundary marks warn of territorial guardians; retreat outside their territory to disengage. Inventory: potion 1×1, sword 7×2, armor 4×4, amulet 2×2. Select an item and place or rotate it; arrangement is free. Using/equipping/dropping costs one turn. Equipped items remain highlighted in the satchel and still take space. Unequip before selling, dropping or storing. Rats and rabbits drop meat 50% of the time; frogs drop it 35% of the time. Otherwise they drop nothing. Cook meat at the F campfire just south of the tent; eat it from the satchel for 10 HP. Full-bag failures preserve items and gold. Mara buys carried trophies/equipment.</p>
  <p>Assign spears or ammunition to item quick slots 1–3. An equipped spear opens Reach targeting; ammunition opens Throw targeting. An equipped buckler passively blocks 35% of incoming attacks; no defensive action is needed. Choose highlighted targets; Cancel/Escape is free. Pink tiles warn of a frog tongue lash; amber crosses mark sap spit; orange lanes mark a charge; violet crosses mark a warden sweep; violet rings around all neighboring tiles warn of Cairnhorn’s stomp. Heavy creatures rest for one action after a charge or sweep (teal ring). Swords gain +1 damage against winding-up enemies; axes pierce extra defense against heavy armor; spears keep their two-tile reach. Move off marked tiles before the next enemy phase. Click a creature to read its attack. Strength is the attack stat. Click or tap a visible character to inspect their portrait, race and combat stats for free. Idle time never advances turns. Holding touch controls does not repeat. Your run saves on this browser/device. Refresh or close, then choose Continue. Death permanently ends the saved run. Clearing browser data removes saves. Speak to Trailwarden Iona west of camp for an expedition goal. Accepted quests persist across travel, have no timers, and are listed in the Journal. Prince Aldren waits southeast of the tent. Speak to him whenever you wish to begin the main story: escort him to Northwatch (0, -6), then reach its northern keep together. Follow / Stay and tonic aid are available in his dialogue. Stay means you must return for him; a downed prince needs a tonic. There is no departure timer. Select an item in the Satchel to assign it to quick slots 1–3. Shortcuts use/equip items; equipped spears open Reach targeting, while other equipped gear toggles off. Raw meat and trophies open their description. Cook All processes one turn per piece. Open Journal for the creature index. Northwatch has an inn and bounty board. Orren the Grave Keeper waits southwest of the tent beside a bone pile. Skeletons have a 50% bone-drop chance; trade five bones for a key to a locked crypt-depth-two reliquary. In the first neighboring forest, the Willow Crossing offers a toll, a medicine errand, or a fight. A distant shallow ford stays available. Opening the crossing keeps a shorter route available for you and Aldren throughout the run. Medicine travels in your quest pouch, without satchel space. Scout Fen northeast of the tent (25, 12) can mark the bridge’s region without revealing terrain. Three northern road landmarks offer one choice each per run. Reach the keep with Aldren for his Wayfarer Brooch; if your bag is full, Steward Elara holds it inside the keep. Damage rolls use narrow ranges for swords and spears, wider ranges for axes and projectiles. Unarmed damage is fixed. Inspect creatures to see damage against your current protection; blocks and situational bonuses apply separately. There are no critical hits. Camp (C) is always marked. During the accepted escort quest, the top arrow points toward Northwatch; its map marker appears after you reach it. Use −, + and Fit on either map view to zoom for free. Other terrain must be explored and stays remembered for the run. Discovered quests show ?, accepted objectives !, and rewards ✓. Gear has four tiers: Worn, Field, Forged and Runic. Tougher creatures and guarded rewards offer better tiers. Weak animals still drop meat. Bram the Blacksmith at camp (18, 17) enhances weapons, body armor and boots for gold, never XP. Worn gear allows one enhancement; better tiers allow two. Each adds +1 attack or raw protection and costs one turn. Rabbit warrens support 3–5 nearby rabbits. Populations recover one creature at a time after at least 30 turns, out of sight. Rat burrows can be bump-attacked or struck with Interact; clearing one stops its spawning for this run. Travel altars: camp starts active. Discover and activate others, then travel between them for one turn. Enemies near either end block travel. Altars do not heal or reset the world. Travel is disabled during Aldren’s active escort. No building.</p></div>`,[['Back',()=>model?help():menu()]]);
  $('overlay').querySelector('article').classList.add('intro-dialog');
}
function help(){
 if(!model){intro();return;}
 paused=true;panel='help';
 modal('Menu','', [['Resume',closePanel],['Intro & controls',intro],['Save & title',()=>{persistRun();if(runStorage.error)return;model=null;menu();}]]);
}
function menu() {
  paused = true;
  const saved=runStorage.load(),begin=seamless=>{if(!saved){start(undefined,seamless);return;}modal('Start a new run?','<p>This replaces your saved expedition.</p>',[['Start new run',()=>start(undefined,seamless)],['Back',menu]]);};
  modal('The Wildlands', '<p class="hint">Explore · Survive · Find your way north</p>', [...(saved?[['Continue',()=>resumeRun(saved)]]:[]),['New Game',()=>begin(true)], ['Classic expedition',()=>begin(false)], ['Instructions', help]]);if(runStorage.error){const note=document.createElement('p');note.className='hint';note.textContent=runStorage.error;$('overlay').querySelector('article').append(note);}
}
function campfire(){
 if(!model?.atCampfire())return;paused=true;panel='campfire';
 const count=kind=>model.state.player.inventory.filter(i=>i.kind===kind).reduce((n,i)=>n+i.quantity,0),raw=count('rawMeat'),rat=count('rawRatMeat');
 const cook=kind=>{model.action({type:'cook',kind});render();campfire();$('cooking-result').textContent=model.state.log.at(-1);};
 modal('Lantern Camp fire',`<p>Cook raw meat into a 10-health meal, or raw rat meat into a 5-health meal. Each piece takes one turn. Each food type stacks to nine per cell.</p><p>Raw meat: ${raw}</p><p>Raw rat meat: ${rat}</p><p id="cooking-result" role="status"></p>`,[['Cook one meat',()=>cook('rawMeat')],['Cook rat meat',()=>cook('rawRatMeat')],['Cook All',()=>{cookAll(model);render();campfire();$('cooking-result').textContent=model.state.log.at(-1);}],['Return',closePanel]]);
 const buttons=$('overlay').querySelectorAll('.buttons button');buttons[0].disabled=raw===0;buttons[1].disabled=rat===0;buttons[2].disabled=raw+rat===0;
}
function storage() {
  if (!model?.atCamp()) return;
  paused = true; panel = 'storage';
  modal('Lantern Camp storage', '<p>This region is safe. Transfers cost one turn. Stored supplies are lost if you die.</p><div id="storage-lists"></div><p id="storage-result" role="status"></p>', [['Return', closePanel]]);
  for (const [title, items, type] of [['Your satchel', model.state.player.inventory, 'store'], ['Camp chest', model.stash, 'retrieve']]) {
    const section = document.createElement('section'), h = document.createElement('h3'); h.textContent = title; section.append(h);
    if (!items.length) { const p = document.createElement('p'); p.textContent = 'Empty'; section.append(p); }
    items.forEach((item, index) => { const b = document.createElement('button'); b.className = 'item'; b.textContent = `${type === 'store' ? 'Store' : 'Take'} ${item.name}`;b.disabled=type==='store'&&Boolean(equippedSlot(model.state.player,item)); b.onclick = () => { model.action({ type, index }); render(); storage(); $('storage-result').textContent=model.state.log.at(-1); }; section.append(b); });
    $('storage-lists').append(section);
  }
}
function merchant() {
 if(!model?.atMerchant())return;paused=true;panel='merchant';
 modal('Mara the Wayfarer','<div id="trading-ui"></div>',[['Return',closePanel]]);
 $('overlay').querySelector('article').classList.add('trading-dialog');
 mountTrading($('trading-ui'),model,action=>{const ok=model.action(action);render();return ok;});
}
function blacksmith(){
 if(!model||!atBlacksmith(model))return;paused=true;panel='blacksmith';
 const p=model.state.player;
 modal('Bram the Blacksmith','<p>Enhance your carried weapons, body armor and boots. Each enhancement adds +1 attack or raw protection and costs one turn.</p><p>Worn gear: one enhancement. Higher tiers: two. Find better gear in tougher regions; XP is never spent.</p><p class="hint">Protection above 3 has diminishing returns: two extra raw points give one DEF.</p><p id="forge-gold"></p><div id="forge-items"></div><p id="forge-result" role="status"></p>',[['Return',closePanel]]);
 $('forge-gold').textContent=`Your gold: ${p.gold}`;
 p.inventory.forEach((item,index)=>{if(!canEnhance(item))return;const row=document.createElement('section'),h=document.createElement('h3'),note=document.createElement('p'),b=document.createElement('button');h.textContent=item.name+(equippedSlot(p,item)?' · Equipped':'');note.textContent=enhancementPreview(item);const capped=(item.enhancement??0)>=enhancementCap(item);b.textContent=capped?`Fully enhanced: ${item.name}`:`Enhance ${item.name} · ${enhancementCost(item)} gold`;b.disabled=capped||p.gold<enhancementCost(item);b.onclick=()=>{model.action({type:'enhance',index});render();blacksmith();$('forge-result').textContent=model.state.log.at(-1);};row.append(h,note,b);$('forge-items').append(row);});
 if(!$('forge-items').children.length)$('forge-items').textContent='Bring a weapon, body armor or boots. Mara sells starting equipment.';
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
    </div><p class="hint">Viewing and switching tabs are free. Equipping and unequipping cost one turn. Equipped items keep occupying satchel space. Select an item to compare gear or assign quick slots 1–3.</p>
    <div id="character-panel" role="tabpanel" aria-labelledby="${view==='satchel'?'satchel-tab':'equipment-tab'}"><div id="bag-editor"></div></div><p id="bag-result" role="status"></p>`,buttons);
  const switchView=next=>bag(next,slot);
  $('satchel-tab').onclick=()=>switchView('satchel');$('equipment-tab').onclick=()=>switchView('equipment');
  for(const tab of [$('satchel-tab'),$('equipment-tab')]){
    tab.tabIndex=tab.getAttribute('aria-selected')==='true'?0:-1;
    tab.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();event.stopPropagation();const next=event.key==='Home'?'satchel':event.key==='End'?'equipment':view==='satchel'?'equipment':'satchel';switchView(next);$(`${next}-tab`).focus();};
  }
  if(view==='equipment')mountEquipment($('bag-editor'),model,perform,EQUIPMENT_SLOTS.includes(slot)?slot:'weapon');
  else mountInventory($('bag-editor'),model,perform,persistRun);
}
function journeyDialog(){
 const e=model?.activeEncounter();if(!e||!['guide','steward','journey'].includes(e.type))return;
 paused=true;panel='journey';
 const choose=choice=>{model.action({type:'journey',choice});render();if(model.state.status==='playing'){journeyDialog();$('journey-result').textContent=model.state.log.at(-1);}};
 const buttons=[['Return',closePanel]];let body=e.description;
 if(e.type==='guide'){
  body='“Willow Crossing lies in the first neighboring forest. Kestrel’s band asks a toll, but medicine or steel can also open it. A bank trail leads to a distant shallow ford. The northern road passes a fallen watchtower, the Reedstone Causeway, and a last shelter before Northwatch.”';
  if(!model.journey.bridgeLead)buttons.unshift(['Mark Willow Crossing',()=>choose('bridgeLead')]);else body+=' Its region is marked B on your world map; explore there to find the actual bridge. A ◇ marks the Fallen Watchtower farther along the northern road.';
 }else if(e.type==='steward'){
  body=model.story.complete?`“Northwatch welcomes its prince home. ${model.story.homecoming??''} Aldren’s gratitude travels with you.”`: '“The prince’s place is at the northern keep. Bring Aldren there alive, and Northwatch will remember your help.”';
  if(model.story.complete&&!model.story.keepsakeClaimed)buttons.unshift(['Claim Wayfarer Brooch',()=>choose('keepsake')]);
  else if(model.story.keepsakeClaimed)body+=' Your Wayfarer Brooch has been delivered to your satchel.';
 }else if(model.journey.records[e.kind])body+=' You already chose: '+({scout:'scout the road',tonic:'take the tonic',aid:'help Aldren across',purse:'recover the purse',rest:'rest together',rations:'take travel rations'})[model.journey.records[e.kind]]+'. This landmark stays resolved for the run.';
 else if(e.kind==='tower')buttons.unshift(['Scout the northern landmarks',()=>choose('scout')],['Take the healing tonic',()=>choose('tonic')]);
 else if(e.kind==='causeway')buttons.unshift(['Help Aldren · heal 8 HP',()=>choose('aid')],['Recover the purse · 4 gold',()=>choose('purse')]);
 else if(e.kind==='shelter')buttons.unshift(['Rest together · heal up to 8 HP',()=>choose('rest')],['Take Honeyed Rations',()=>choose('rations')]);
 modal(e.name,`<p>${escape(body)}</p><p class="hint">Browsing is free. Marking a lead, taking supplies, resting, helping Aldren, or claiming a held reward takes one turn. Nearby enemies act afterward. Each landmark offers one choice per run.</p><p id="journey-result" role="status"></p>`,buttons);
}
function bridgeDialog(){
 const q=bridgeQuest(model);if(!q||model.activeEncounter()?.type!=='bridge')return;
 paused=true;panel='bridge';
 const choose=choice=>{model.action({type:'bridge',choice});render();if(model.state.status!=='playing')return;if(q.mode==='fight'){closePanel();return;}bridgeDialog();$('bridge-result').textContent=model.state.log.at(-1);};
 const buttons=[['Return',closePanel]];
 if(!q.claimed&&q.mode!=='fight'){
  buttons.unshift(['Pay toll · 8 gold',()=>choose('pay')]);
  if(!q.accepted)buttons.unshift(['Offer to recover medicine',()=>choose('medicine')]);
  if(q.medicine)buttons.unshift(['Hand over medicine',()=>choose('deliver')]);
  buttons.unshift(['Fight the two guards',()=>choose('fight')]);
 }
 if(model.state.items.some(i=>i.x===model.state.player.x&&i.y===model.state.player.y))buttons.unshift(['Collect items here',()=>{model.action({type:'pickup'});render();if(model.state.status==='playing')bridgeDialog();}]);
 const description=q.claimed?questProgress(q)+'. You and your companions can use the direct crossing freely.':q.mode==='fight'?'The guards are hostile. Defeat both to lift the barrier.':q.accepted?questProgress(q):'“Eight gold to cross. Or find our stolen medicine and we will let you and your companions through.” Two armed guards hold the bridge. You can fight them, pay the toll, recover medicine, or follow the bank to the distant shallow ford.';
 modal('The Willow Crossing',`<p>${escape(description)}</p><p>Your gold: ${model.state.player.gold}</p><p class="hint">Talking is free. Paying, accepting the medicine errand, returning medicine, or starting a fight each takes one turn. Nearby enemies act afterward. There is no deadline; leaving preserves your choice and progress.</p><p id="bridge-result" role="status"></p>`,buttons);
 for(const b of $('overlay').querySelectorAll('button'))if(b.textContent==='Pay toll · 8 gold')b.disabled=model.state.player.gold<BRIDGE_TOLL;
}
function encounterDialog() {
  const event=model?.activeEncounter();if(!event||!['villager','shrine','woodland'].includes(event.type))return;
  paused=true;panel='encounter';
  const perform=action=>{model.action(action);render();if(model.state.status==='playing'){encounterDialog();$('encounter-result').textContent=event.type==='woodland'&&event.used?event.result:model.state.log.at(-1);}};
  if(event.type==='woodland'){
    const buttons=[['Return',closePanel]];
    if(!event.used){
      if(event.kind==='herbalist')buttons.unshift(['Buy tonic · 6 gold',()=>perform({type:'woodland',choice:'gold'})],['Exchange hunting trophy',()=>perform({type:'woodland',choice:'trophy'})]);
      else if(event.kind==='traveler')buttons.unshift(['Give Ember tonic',()=>perform({type:'woodland'})],['Give cooked meal',()=>perform({type:'woodland',choice:'meal'})]);else buttons.unshift(['Read the milestone',()=>perform({type:'woodland'})]);
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
function princeDialog(){
 if(!model?.atPrince())return;paused=true;panel='prince';const q=model.story,c=q.prince,buttons=[];
 const perform=type=>{model.action({type});render();if(model.state.status==='playing'&&!model.story.complete){princeDialog();if($('prince-result'))$('prince-result').textContent=model.state.log.at(-1);}};
 if(!q.accepted)buttons.push(['Begin escort',()=>perform('acceptEscort')]);
 else if(!q.complete&&c.hp>0)buttons.push([c.mode==='follow'?'Stay here':'Follow me',()=>perform(c.mode==='follow'?'princeStay':'princeFollow')]);
 if(q.accepted&&!q.complete&&c.hp<c.maxHp){buttons.push(['Give tonic · heal 16 HP',()=>perform('healPrince')]);}
 buttons.push(['Return',closePanel]);
 const introduction=q.complete?'Aldren has rejoined his court. The road remains open to you.':q.accepted?'“Lead on. I will stay close and defend myself.”':'“My convoy was ambushed. I found shelter here, but my home is beyond the marshes. Will you guide me to Northwatch?”';
 modal('Prince Aldren',`<p>${introduction}</p><p id="prince-status">${escape(princeProgress(model))}</p><p>${model.state.seamless?'Escort Aldren north to Northwatch on the continuous surface. He follows on your turns and can wait wherever you ask.':'Northwatch (0, -6): six regions north. Reach the northern keep together. Prepare locally as long as you wish; there is no timer.'}</p><p class="hint">Sword: 5 ATK · Mail: 2 DEF. Commands and aid take one turn. Stay leaves Aldren here until you return. Crossings require him within two tiles. A downed prince needs a tonic; he does not die.</p><p id="prince-result" role="status"></p>`,buttons);
}
function townDialog(){if(!model||!model.state.city)return;paused=true;panel='town';const s=model.state,p=s.player,inn=atInn(model),citizen=model.activeEncounter();
 if(citizen?.type==='citizen'){modal(citizen.name,`<p>${escape(citizen.description)}</p>`,[['Return',closePanel]]);return;}
 if(inn){modal('The Lantern & Crown Inn',`<p>A warm bed and supper: 6 gold for full health and Mana.</p><p>Your gold: ${p.gold}</p><p class="hint">Rumor: the marsh crossings shelter frogs, while wolves roam the highlands. Read the trail warnings before hunting.</p>`,[['Rest · 6 gold',()=>{model.action({type:'innRest'});render();townDialog();}],['Return',closePanel]]);$('overlay').querySelector('.buttons button').disabled=p.gold<6||p.hp===p.maxHp&&p.mana===p.maxMana;return;}
 modal('Northwatch bounty board','<p>Choose optional hunts. Kills count after acceptance. Return here for rewards; no deadline.</p><div id="bounty-offers"></div><p id="town-result" role="status"></p>',[['Return',closePanel]]);model.bounties.forEach((b,id)=>{const button=document.createElement('button');button.className='item';const count=Math.min(b.count,Math.max(0,(model.killCounts[b.kind]??0)-b.start));button.textContent=b.claimed?'Completed: '+b.title:!b.accepted?'Accept: '+b.title:`${b.title} · ${count}/${b.count} · Claim reward`;const reward=document.createElement('small');reward.className='item-description';reward.textContent='Reward: modified '+(['boots','ring','armor'][id])+' and 8 gold';button.append(reward);button.disabled=b.claimed||b.accepted&&count<b.count;button.onclick=()=>{model.action({type:b.accepted?'claimBounty':'acceptBounty',id});render();townDialog();$('town-result').textContent=model.state.log.at(-1);};$('bounty-offers').append(button);});
}
function creatureBook(){if(!model)return;paused=true;panel='index';modal('Creature index','<p>Only creatures seen this run are recorded. Detection alone does not add entries.</p><div id="creature-entries"></div>',[['Return',closePanel]]);for(const entry of model.creatureIndex.values()){const section=document.createElement('section'),h=document.createElement('h3'),p=document.createElement('p'),img=document.createElement('img');h.textContent=entry.name;img.src=scene.portrait(entry.kind,entry.name);img.alt=entry.name;img.className='inspection-portrait';const drop=entry.miniboss?'Guaranteed themed equipment hoard':entry.variant&&!['rat','rabbit','frog','pondFrog'].includes(entry.kind)?'Improved ordinary loot odds':entry.kind==='skeleton'?'50% bones; otherwise ordinary loot':entry.kind==='rat'?'50% raw rat meat':entry.kind==='rabbit'?'50% raw meat':['frog','pondFrog'].includes(entry.kind)?'35% raw meat':'Coins, trophies or occasional supplies';p.textContent=`${describeCreature(entry)} Habitat: ${entry.biomes.map(b=>BIOMES[b]?.name??b).join(', ')}. Defeated: ${entry.kills}. Loot: ${drop}.`;section.append(h,img,p);$('creature-entries').append(section);}}
function activateQuick(slot){if(!model||paused||targetMode)return;const a=quickAction(model,slot);if(!a)return;if(a.type==='targetReach')beginTargeting('reach');else if(a.type==='targetThrow')beginTargeting('throw',a.index);else if(a.type==='inspectItem'){const item=model.state.player.inventory[a.index];paused=true;panel='item';modal(item.name,`<p>${escape(equipmentSummary(item))}</p>`,[['Return',closePanel]]);}else act(a);}
function renderQuick(){const ready=model&&!paused&&!targetMode&&model.state.status==='playing';for(let n=0;n<3;n++){const b=$('custom-slot-'+n),item=model&&quickItem(model,n);b.textContent=item?itemEmoji(item):'+';const key=document.createElement('kbd');key.textContent=n+1;b.append(key);if(item?.quantity){const count=document.createElement('span');count.className='action-count';count.textContent=model.state.player.inventory.filter(i=>i.kind===item.kind&&i.name===item.name).reduce((n,i)=>n+i.quantity,0);b.append(count);}b.setAttribute('aria-label',`Quick slot ${n+1}: ${item?.name??'Empty'}`);b.classList.toggle('equipped',Boolean(item&&equippedSlot(model.state.player,item)));b.title=item?`${item.name} [${n+1}] · ${({targetReach:'Spear attack',targetThrow:'Throw',equip:'Equip',unequip:'Unequip',use:'Use',inspectItem:'Inspect'})[quickAction(model,n)?.type]??'Unavailable'}`:'Assign any item from the Satchel';b.disabled=!ready||!item;}}
function graveDialog(){if(!model||!atGravekeeper(model))return;paused=true;panel='gravekeeper';modal('Orren the Grave Keeper',`<p>“Bring the restless dead’s bones home. For five, I will give you a key to what they left below.”</p><p>Your bones: ${boneCount(model.state.player)}</p><p>Five bones → one skeleton key. Keys open locked reliquaries on crypt depth two.</p><p id="grave-result" role="status"></p>`,[['Trade 5 bones for a key',()=>{model.action({type:'tradeBones'});render();graveDialog();$('grave-result').textContent=model.state.log.at(-1);}],['Return',closePanel]]);$('overlay').querySelector('.buttons button').disabled=boneCount(model.state.player)<5;}
function cycleInteraction(){if(!model||paused||targetMode||model.state.status!=='playing')return;travel.cancel();stopMovement();interactionSelection.next(model);syncTouchControls();}
function altarDialog(){
 const altar=nearAltar(model);if(!altar)return;paused=true;panel='altar';
 const buttons=[],destinations=travelAltars(model).filter(e=>e.active&&e!==altar);
 const activate=()=>{model.action({type:'activateAltar'});render();if(model.state.status==='playing')altarDialog();};
 if(!altar.active)buttons.push(['Activate altar',activate]);
 else for(const destination of destinations)buttons.push([`Travel to ${destination.name}`,()=>{if(model.action({type:'travelAltar',destination:destination.id})){closePanel();render();}else{render();altarDialog();}}]);
 buttons.push(['Return',closePanel]);
 const escort=model.story.accepted&&!model.story.complete,unsafe=altarThreat(model,altar),blocked=destinations.some(target=>altarTravelProblem(model,target).includes('destination'));
 modal(altar.name,`<p>${!altar.active?'Awaken this altar to link it with camp. Activation takes one turn.':escort?'Bring Aldren home by road. Altar travel is unavailable during the escort.':unsafe?'Enemies are nearby. Clear the area before traveling.':destinations.length?'Choose an awakened altar. Travel is free and takes one turn.':'Discover and activate another altar to travel.'}</p><p class="hint">${blocked?'A destination is unsafe. Clear enemies near it before using its link.':'No healing or resets. Nearby enemies block departure and arrival.'}</p>`,buttons);
 const controls=$('overlay').querySelectorAll('.buttons button');if(!altar.active)controls[0].disabled=unsafe;else destinations.forEach((target,index)=>{const reason=altarTravelProblem(model,target);controls[index].disabled=Boolean(reason);controls[index].title=reason;controls[index].setAttribute('aria-description',reason||'One turn. No gold cost.');});
}
function interact(intent=null){
 if(!model||paused||targetMode)return;
 const {options,selected}=interactionSelection.resolve(model),choice=intent?options.find(o=>intent.event?o.event===intent.event:intent.item?o.item===intent.item:o.type===({M:'merchant',C:'storage',F:'fire',I:'town',N:'town',prince:'prince'})[intent.site]):selected;
 if(!choice)return;
 model.interactionTarget=choice.event??null;
 if(choice.type==='pickup')act({type:'pickup',item:choice.item});
 else if(choice.type==='altar')altarDialog();
 else if(choice.type==='habitat'){const h=choice.event;if(h.kind==='rat'&&!h.destroyed)act({type:'strikeHabitat',id:h.id});else{paused=true;panel='habitat';modal(h.name,h.destroyed?'<p>This burrow is cleared. Surviving rats still roam nearby.</p>':'<p>A sheltered rabbit warren. Rabbits live nearby and gradually return after hunting. The warren stays intact.</p>',[['Return',closePanel]]);}}
 else if(choice.type==='blacksmith')blacksmith();else if(choice.type==='journey')journeyDialog();else if(choice.type==='bridge')bridgeDialog();else if(choice.type==='town')townDialog();else if(choice.type==='fire')campfire();else if(choice.type==='storage')storage();else if(choice.type==='merchant')merchant();else if(choice.type==='encounter')encounterDialog();else if(choice.type==='grave')graveDialog();else if(choice.type==='prince')princeDialog();
}

function renderMinimap() {
  if (!model) return;
  const display=mapModel(),loc = display.location;
  $('map-inspection').textContent=mapInspectionText(display,mapSelection)||'Tap a square for details.';
  if (mapView === 'world'&&!display.state.seamless) drawWorldMinimap($('minimap'), display,mapZoom[mapView]);
  else {const q=bridgeQuest(model),objective=q?.accepted&&!q.claimed?(q.medicine?q.layout.guard:q.medicineSite):null;drawMinimap($('minimap'), display.state, loc,objective?[objective]:[],display.state.seamless?mapView:'world',mapZoom[mapView]);}
  $('map-zoom-fit').textContent=mapZoom[mapView]+'×';$('map-zoom-fit').setAttribute('aria-description','Current zoom '+mapZoom[mapView]+' times. Reset to fit.');$('map-zoom-out').disabled=mapZoom[mapView]===MAP_ZOOMS[0];$('map-zoom-in').disabled=mapZoom[mapView]===MAP_ZOOMS.at(-1);
  $('map-tabs').classList.remove('hidden');
  $('map-local-tab').textContent=model.state.seamless?'Nearby':'Local';$('map-world-tab').textContent=model instanceof SeamlessExpedition?'Explored':'World';
  $('minimap-location').textContent = mapView === 'local' && loc.kind === 'crypt' ? `Depth ${loc.depth}` : `${loc.rx},${loc.ry}`;
  if(model.state.seamless)$('minimap-location').textContent=`${model.state.player.x},${model.state.player.y}`;
  $('camp-bearing').textContent = campBearing(loc);
  $('camp-bearing').hidden=mapView==='world'||model.state.home||model.state.seamless;
  $('map-legend').textContent = display.state.seamless?'Continuous terrain · C Camp · K Northwatch · A Aldren · Gold: quest · ◇ Altar · Muted terrain: chart · F Fire · M Merchant · ? People · > Crypt · ! Den · S Shrine · K Cache':mapView === 'world' ? 'Green: forest · Blue: marsh · Gray: highlands · Red: ashlands · Slate: city · C: camp · K: Northwatch · ?: discovered quest · Purple: discovered entrance · B Bridge lead · ◇ Road landmark · ! Quest objective · ✓ Return for reward' : model.state.city?'● You · Gold: Aldren · K Keep · I Inn · B Bounties · Brown: gates · Blue: fountain':'● You · C Camp · F Fire · T Watchtower · H Shelter · Pink: detected creatures · M Merchant · ? People / blacksmith · > Crypt · ! Den · S Shrine · K Cache';
  const detect=$('detect-creatures'),p=model.state.player;detect.disabled=paused||p.level<3||p.mana<25||model.state.status!=='playing'||Boolean(targetMode);detect.textContent=p.level<3?'Detect Creatures · Lv 3':'Detect Creatures · 25 MP [G]';detect.classList.toggle('hidden',mapView!=='local');
  $('minimap-panel').setAttribute('aria-labelledby', `map-${mapView}-tab`);
  for (const tab of document.querySelectorAll('[data-map-view]')) {
    const selected = tab.dataset.mapView === mapView;
    tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
  }
}
function positionBearing(){const nav=document.getElementById('kingdom-bearing'),hud=document.getElementById('hud-character');if(nav&&hud)nav.style.setProperty('--bearing-top',Math.ceil(hud.getBoundingClientRect().bottom+6)+'px');}
function render() {
  if (!model) return;
  const bearing=kingdomBearing(model);$('kingdom-bearing').hidden=!bearing;if(bearing){$('kingdom-arrow').textContent=bearing.arrow;$('kingdom-bearing').setAttribute('aria-label',bearing.description);$('kingdom-bearing').title=bearing.description;}
  scene.setGame(model);
  renderMinimap();
  const s = model.state, p = s.player, loc = model.location;
  const place = s.seamless?`${s.home?'Lantern Camp':BIOMES[s.biome].name} · ${p.x}, ${p.y}`:loc.kind === 'world' ? `${s.home?'Lantern Camp':BIOMES[s.biome].name} (${loc.rx}, ${loc.ry})` : `${s.biome === 'marsh' ? 'Sunken' : 'Rootbound'} Crypt · ${loc.depth}/2`;
  $('stats').innerHTML = `<div class="floor">${s.seamless?`AREA LV ${s.recommended}`:s.home?'SAFE CAMP':s.city?'SAFE CITY':loc.kind==='world'?`AREA LV ${s.recommended}${p.level<s.recommended?' · DANGER':''}`:'UNDERGROUND'} <span>TURN ${s.turn}</span></div><h2 title="${escape(s.home?'Lantern Camp · Safe region':`Recommended level ${s.recommended}`)}">${escape(place)}</h2>
    <div class="bar"><div style="width:${p.hp/p.maxHp*100}%"></div><span>Health ${p.hp} / ${p.maxHp}</span></div>
    <div class="bar mana"><div style="width:${p.mana/p.maxMana*100}%"></div><span>Mana ${Number(p.mana.toFixed(1))} / ${p.maxMana}</span></div>
    <div class="bar xp"><div style="width:${p.xp/threshold(p)*100}%"></div><span>XP ${p.xp} / ${threshold(p)}</span></div>
    <div class="numbers">Lv ${p.level} · ${rangeLabel(playerOffenseRange(p))} DMG · ${defense(p)} DEF · <b>${p.gold} gold</b></div>`;
  const ahead=model.borderPreview(),pocket=dangerAt(s);
  if(s.biome==='marsh'&&loc.kind==='world'){const note=document.createElement('p');note.className='vision-status';note.textContent='Marsh trails: smaller prey · marked side pools: danger';$('stats').append(note);}
  if(ahead||pocket){const warning=document.createElement('p');warning.id='travel-warning';warning.className='vision-status danger-status';warning.textContent=ahead?`${ahead.name} ahead · Lv ${ahead.recommended} · ${threatLabel(ahead.recommended,p.level)}`:`⚠ ${pocket.name} · guarded territory`;$('stats').append(warning);}
  const threats=s.enemies.filter(e=>e.hp>0&&e.intent&&s.visible.has(`${e.x},${e.y}`));
  if(threats.length){const warning=document.createElement('p');warning.id='combat-warning';warning.className='vision-status danger-status';warning.setAttribute('role','status');const urgent=threats.find(e=>e.intent.tiles.some(t=>t.x===p.x&&t.y===p.y))??threats[0];warning.textContent=`${urgent.name}: ${attackWarning(urgent,p)}${threats.length>1?' ('+threats.length+' attacks preparing)':''}`;$('stats').append(warning);}
  $('portrait-level').textContent=p.level;
  const companion=model.princeHere();if(model.story.accepted&&!model.story.complete){const status=document.createElement('p');status.className='vision-status';status.id='escort-status';status.textContent=s.seamless&&companion&&Math.abs(companion.x-p.x)+Math.abs(companion.y-p.y)>32?`Aldren ${companion.mode==='stay'?'waits':'is separated'} · ${companion.x}, ${companion.y}`:companion?`Aldren · ${companion.hp}/${companion.maxHp} HP · ${companion.mode}`:`Aldren waits in (${model.story.prince.rx}, ${model.story.prince.ry})`; $('stats').append(status);}
  const conditions=[p.corrosion>0?'Corroded −1 DEF · '+p.corrosion+' turns':null,p.smokeTurns>0?'Smoke · '+p.smokeTurns+' turns':null,p.rationTurns>0?'Rations · '+p.rationTurns+' turns':null].filter(Boolean);
  if(conditions.length){const status=document.createElement('p');status.className='vision-status';status.textContent=conditions.join(' / ');$('stats').append(status);}

  if(s.detectCreaturesUntil>0&&s.turn<=s.detectCreaturesUntil){const status=document.createElement('p');status.className='vision-status';status.textContent=`Detect Creatures · ${s.detectCreaturesUntil-s.turn+1} turns · local map`; $('stats').append(status);}
  if(s.mindVisionUntil>=s.turn&&s.mindVisionUntil>0){const status=document.createElement('p');status.className='vision-status';status.textContent=`Mind Vision active · ${s.mindVisionUntil-s.turn+1} turns`;$('stats').append(status);}
  $('character-shortcut').querySelector('svg').outerHTML=adventurerSvg(p).replace(/ data-[a-z0-9]+-icon=""/g,'');
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
  mountQuestJournal($('quest-info'),model,()=>{renderMinimap();persistRun();},princeDialog);
  $('latest-event').textContent = s.log.at(-1) ?? '';
  $('log').innerHTML = s.log.slice(-25).map(t => `<p>${escape(t)}</p>`).join(''); $('log').scrollTop = $('log').scrollHeight;
  renderInspection();
  if(s.status!=='playing')cancelTargeting();
  syncTouchControls();
  if(s.status==='playing'&&model.story.complete&&!model.story.noticeShown){model.story.noticeShown=true;paused=true;panel='chapter';modal('Chapter one complete', `<h3>Aldren’s homecoming</h3><p>The keep’s banners rise as Aldren steps forward. Steward Elara welcomes the missing prince, and Aldren names you the traveler who brought him home.</p><p>${escape(model.story.homecoming??'')}</p><p>You receive 30 gold and a full recovery. ${model.story.keepsakeClaimed?'Aldren’s Wayfarer Brooch is in your satchel: +10 maximum Mana and +1 protection against special attacks.':'Elara holds your Wayfarer Brooch inside the keep. Make room and speak to her to collect it.'}</p><p>Aldren remains safely in Northwatch. Your expedition continues.</p>`, [['Continue exploring',closePanel]]);}
  positionBearing();persistRun();
  if (s.status === 'dead') {
    paused = true; panel = 'dead';
    modal('Your lantern goes dark.', `<p>Your expedition ends here. The camp and its supplies are lost.</p><p>Level ${p.level} · ${s.regionsDiscovered} regions · ${s.cryptsCleared} crypts cleared · ${p.gold} gold</p><p>Last hit: ${escape(s.deathCause??'Your expedition ended.')}</p><details><summary>Turn-by-turn recap</summary>${(s.timeline??[]).slice(-30).map(e=>`<p>Turn ${e.turn}: ${escape(e.text)}</p>`).join('')}</details><p class="hint">Seed: ${s.seed}</p>`, [['New Run',()=>start(undefined,model instanceof SeamlessExpedition)],['Retry this seed',()=>start(s.seed,model instanceof SeamlessExpedition)], ['Title', () => { model = null; menu(); }]]);
  }
}
function renderInspection(){
  const current=inspected&&model&&characterAt(model,inspected.x,inspected.y);
  if(!current||model.state.map!==inspectedMap||current.kind!==inspected.kind||(!inspected.friendly&&current!==inspected)||model.state.status!=='playing')inspected=null;
  $('character-inspector').classList.toggle('hidden',!inspected);
  if(!inspected)return;
  const d=characterDetails(model,inspected);
  $('inspection-details').innerHTML=`<h3>${escape(d.name)}</h3><img class="inspection-portrait" alt="${escape(d.name)} portrait" src="${scene.portrait(d.kind,d.name)}"><p class="inspection-race">${escape(d.race)}</p>
    ${d.damageText?`<p class="inspection-damage">${escape(d.damageText)}</p>`:''}<dl><dt>Strength</dt><dd>${d.strength??'—'}</dd><dt>Defense</dt><dd>${d.defense??'—'}</dd><dt>Health</dt><dd>${d.hp===null?'Noncombatant':`${d.hp} / ${d.maxHp}`}</dd></dl>
    ${d.ability?`<p class="creature-trait">${escape(d.ability)}</p>`:''}${d.warning?`<p class="creature-warning">${escape(d.warning)}</p>`:''}
    ${d.hp===null?'<p class="hint">Friendly · use Interact nearby.</p>':`<div class="bar inspection-health"><div style="width:${Math.max(0,d.hp/d.maxHp*100)}%"></div></div>`}`;
}
scene.onInspect=(x,y,input={})=>{
  if(!model||paused||model.state.status!=='playing')return;
  if(targetMode){completeTarget(x,y);return;}
  travel.cancel();stopMovement();
  const character=characterAt(model,x,y);
  if(character&&(!character.friendly||input.shiftKey||input.pointerType==='touch')){
    inspected=character;inspectedMap=model.state.map;renderInspection();return;
  }
  inspected=null;renderInspection();
  if(input.pointerType==='touch')return;
  travel.start(x,y);
  render();

};
$('close-inspector').onclick=()=>{inspected=null;renderInspection();document.activeElement?.blur();};
function cancelTargeting(){
  targetMode=null;scene.targetHighlights=[];$('targeting-bar').classList.add('hidden');scene.draw();
}
let targetAmmo;
function beginTargeting(type,index){
  travel.cancel();
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
function act(action,automatic=false) {
 if(!automatic)travel.cancel();
 if(!model||paused||targetMode)return;
 if(document.activeElement?.tagName==='SUMMARY')document.activeElement.blur();
 const location=model.location.id,before=model.borderPreview(),oldPocket=dangerAt(model.state);
 const completed=model.action(action);
 const ahead=model.borderPreview(),pocket=dangerAt(model.state);
 if(!model.state.seamless&&model.location.id!==location||ahead&&ahead.recommended>model.state.player.level&&(!before||before.rx!==ahead.rx||before.ry!==ahead.ry)||pocket&&!oldPocket)stopMovement();
 render();return completed;
}
function syncTouchControls() {
  renderQuick();
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
      if (control === 'descend') allowed = (model.location.kind === 'world' ? s.map[p.y][p.x] === 'D' : model.location.depth === 1 && p.x === s.stairs.x && p.y === s.stairs.y);
      if(control==='collect'){
        const {options,selected}=interactionSelection.resolve(model),label=selected?.label??'Collect';button.querySelector('.action-label').textContent=label;button.setAttribute('aria-label',label);button.setAttribute('aria-description',selected?.detail??'Nothing to interact with');button.title=selected?`${selected.detail} [E] · Action ${interactionSelection.index+1}/${options.length}`:'Interact / Collect [E]';button.classList.toggle('has-choices',options.length>1);$('interaction-detail').textContent=options.length>1?selected.detail:'';allowed=Boolean(selected);
      }
      if(control==='cycle-interaction'){
        const {options,index}=interactionSelection.resolve(model);button.classList.toggle('hidden',options.length<2);$('interaction-count').textContent=`${index+1}/${options.length}`;allowed=options.length>1;
      }
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
  else if(control==='cycle-interaction')cycleInteraction();
  else if(control==='reach'||control==='throw')beginTargeting(control);
  else act({ type: ({ collect: 'pickup', vision: 'mindVision' })[control] ?? control });
});
const phoneLayout = matchMedia('(max-width: 700px), (pointer: coarse)');
function setPanels() { $('chronicle-panel').open=false; $('quest-panel').open=false; $('minimap-widget').open=!phoneLayout.matches; }
phoneLayout.addEventListener('change', setPanels); setPanels();
$('minimap').addEventListener('click',event=>{
 if(!model)return;travel.cancel();stopMovement();
 const canvas=$('minimap'),box=canvas.getBoundingClientRect();
 mapSelection=inspectMapAt(mapModel(),mapView,(event.clientX-box.left)*canvas.width/box.width,(event.clientY-box.top)*canvas.height/box.height,canvas.width,canvas.height,mapZoom[mapView]);
 renderMinimap();
});
function zoomMap(step){if(!model)return;stopMovement();travel.cancel();const i=MAP_ZOOMS.indexOf(mapZoom[mapView]);mapZoom[mapView]=MAP_ZOOMS[Math.max(0,Math.min(MAP_ZOOMS.length-1,i+step))];mapSelection=null;renderMinimap();}
$('map-zoom-in').onclick=()=>zoomMap(1);$('map-zoom-out').onclick=()=>zoomMap(-1);$('map-zoom-fit').onclick=()=>{if(!model)return;stopMovement();travel.cancel();mapZoom[mapView]=1;mapSelection=null;renderMinimap();};
$('minimap').addEventListener('wheel',event=>{event.preventDefault();if(event.deltaY)zoomMap(event.deltaY<0?1:-1);},{passive:false});
for (const tab of document.querySelectorAll('[data-map-view]')) tab.addEventListener('click', event => { mapView = tab.dataset.mapView; mapSelection=null; renderMinimap(); if (event.detail > 0) tab.blur(); });
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
  stopMovement();travel.cancel();
  if(id==='minimap-widget')$('quest-panel').open=false;
  if(id==='quest-panel')$('minimap-widget').open=false;
});
$('detect-creatures').onclick=()=>act({type:'detectCreatures'});
$('creature-index').onclick=creatureBook;for(let n=0;n<3;n++)$('custom-slot-'+n).onclick=()=>activateQuick(n);
$('help').onclick = help;
$('manage-bag').onclick=()=>{if(!paused)bag();};
$('open-equipment').onclick=()=>{if(!paused)bag('equipment','amulet');};
$('character-shortcut').onclick=()=>{if(!paused)bag('equipment');};
window.addEventListener('pointerdown',()=>travel.cancel(),true);
window.addEventListener('keydown',event=>{
 const moving=Boolean(travel.plan);travel.cancel();
 if(moving&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();}
},true);
window.addEventListener('blur',()=>travel.cancel());
document.addEventListener('visibilitychange',()=>travel.cancel());
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
  if(k==='f'&&!paused){cycleInteraction();return;}
  if(k==='e'&&!paused){interact();return;}
  if(['1','2','3'].includes(k)){activateQuick(Number(k)-1);return;}
  if (k === '.') act({ type: 'wait' });
  else if (k === 'h') act({ type: 'potion' }); else if (k === 'm') act({ type: 'mindVision' }); else if(k==='g')act({type:'detectCreatures'});
  else if (k === 'enter' || k === '>') act({ type: 'descend' }); else if (k === 'q' || k === '<') act({ type: 'ascend' });
});
window.addEventListener('pagehide',()=>{stopMovement();travel.cancel();persistRun();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopMovement();travel.cancel();persistRun();}});
menu();

window.finishGameLoading?.();
