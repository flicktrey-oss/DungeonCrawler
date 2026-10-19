import Phaser from 'phaser';
import {Game} from './game/game.js';
import {attack,defense,threshold} from './game/items.js';
import {DungeonScene} from './render/scene.js';
import './style.css';
const scene=new DungeonScene();
new Phaser.Game({type:Phaser.CANVAS,parent:'game',width:768,height:624,pixelArt:true,backgroundColor:'#090c12',scene:[scene],scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},callbacks:{postBoot(){setTimeout(()=>{if(model)scene.setGame(model);},0);}}});
let model=null,paused=true,inventoryOnly=false;
const $=id=>document.getElementById(id),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function modal(title,body,buttons){$('overlay').classList.remove('hidden');$('overlay').innerHTML=`<article><p class="eyebrow">DUNGEONCRAWLER</p><h2>${title}</h2>${body}<div class="buttons"></div></article>`;for(const [text,fn] of buttons){const b=document.createElement('button');b.textContent=text;b.onclick=fn;$('overlay').querySelector('.buttons').append(b);}}
function start(){model=new Game();paused=false;inventoryOnly=false;$('overlay').classList.add('hidden');render();}
function help(){paused=true;modal('A lantern in the dark',`<p>Explore five floors and defeat the Ash Warden. Death ends the run.</p><p><b>WASD / arrows</b> move one tile. Bump an enemy to strike.<br><b>E</b> collects loot or opens a coffer.<br><b>H</b> drinks a tonic. <b>.</b> waits.<br><b>Enter / &gt;</b> descends while on stairs.<br><b>I</b> inspects inventory. <b>Esc</b> pauses.</p><p>Moving, attacking, collecting, equipping, drinking and waiting each use one turn. Walls and invalid actions are free. Enemies act once after your turn; slimes rest every other turn. Doors are passable archways. Nothing moves while you think.</p>`,[[model?'Resume':'Back',()=>{if(model){paused=false;$('overlay').classList.add('hidden');}else menu();}]]);}
function menu(){paused=true;modal('The Ember Vault','<p>Beneath the ruined chapel, a forgotten fire still burns. Carry your lantern through five shifting floors. Silence the Ash Warden.</p><p class="hint">An original, strictly turn-based roguelike. No rush. No second lives.</p>',[['New Game',start],['Instructions',help]]);}
function render(){if(!model)return;scene.setGame(model);const s=model.state,p=s.player;
 $('stats').innerHTML=`<div class="floor">DEPTH ${s.floor} / 5 <span>TURN ${s.turn}</span></div><h2>Lantern bearer <small>Lv ${p.level}</small></h2><div class="bar"><div style="width:${p.hp/p.maxHp*100}%"></div><span>Health ${p.hp} / ${p.maxHp}</span></div><div class="bar xp"><div style="width:${p.xp/threshold(p)*100}%"></div><span>XP ${p.xp} / ${threshold(p)}</span></div><div class="numbers">⚔ ${attack(p)} ATK &nbsp; ◈ ${defense(p)} DEF &nbsp; <b>${p.gold} gold</b></div><p class="hint">Weapon: ${escape(p.weapon?.name??'Bare blade')}<br>Armor: ${escape(p.armor?.name??'Travel clothes')}</p>`;
 $('inventory').innerHTML='';p.inventory.forEach((item,index)=>{const b=document.createElement('button');b.className='item';b.textContent=item.name+(item.bonus?` (+${item.bonus} ${item.kind==='weapon'?'ATK':'DEF'})`:'');b.title=item.description;b.onclick=()=>act({type:item.kind==='potion'?'potion':'equip',index});$('inventory').append(b);});if(!p.inventory.length)$('inventory').textContent='Your satchel is empty.';
 $('log').innerHTML=s.log.slice(-25).map(t=>`<p>${escape(t)}</p>`).join('');$('log').scrollTop=$('log').scrollHeight;
 if(s.status!=='playing'){paused=true;modal(s.status==='victory'?'Dawn, at last.':'Your lantern goes dark.',`<p>${s.status==='victory'?'The Ash Warden is defeated. The vault releases its hold.':'The vault keeps your story. A new adventurer may yet succeed.'}</p><p>Level ${p.level} · Floor ${s.floor} · ${p.gold} gold · ${s.turn} turns</p><p class="hint">Seed: ${s.seed}</p>`,[['New Run',start],['Title',()=>{model=null;menu();}]]);}}
function act(action){if(!model||paused)return;model.action(action);render();}
$('help').onclick=help;
window.addEventListener('keydown',event=>{
 if(event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
 if(event.target instanceof HTMLButtonElement&&(event.key==='Enter'||event.key===' '))return;
 const k=event.key.toLowerCase();
 if(['arrowup','arrowdown','arrowleft','arrowright',' ','enter'].includes(k))event.preventDefault();
 if(k==='escape'){if(model&&paused&&model.state.status==='playing'){paused=false;inventoryOnly=false;$('overlay').classList.add('hidden');}else if(!paused)help();return;}
 if(k==='i'&&model&&model.state.status==='playing'){if(inventoryOnly){inventoryOnly=false;paused=false;$('overlay').classList.add('hidden');}else if(!paused){inventoryOnly=true;paused=true;modal('Your equipment',`<p>Weapon: ${escape(model.state.player.weapon?.name??'Bare blade')}<br>Armor: ${escape(model.state.player.armor?.name??'Travel clothes')}</p><p>Item names and bonuses appear in the satchel. Hover for descriptions. Close this panel, then click an item to equip it or drink it. Each successful use costs one turn.</p>`,[['Return',()=>{inventoryOnly=false;paused=false;$('overlay').classList.add('hidden');}]]);}return;}
 const moves={w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]};
 if(moves[k])act({type:'move',dx:moves[k][0],dy:moves[k][1]});else if(k==='.')act({type:'wait'});else if(k==='e')act({type:'pickup'});else if(k==='h')act({type:'potion'});else if(k==='enter'||k==='>')act({type:'descend'});
});
menu();
