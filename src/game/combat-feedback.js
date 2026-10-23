// Small, bounded presentation queue. Rendering may consume it, but never changes rules.
export function combatFeedback(state, target, text, kind='hit', from=null) {
  state.combatSerial=(state.combatSerial??0)+1;
  const event={id:state.combatSerial,x:target.x,y:target.y,text,kind,from:from?{x:from.x,y:from.y}:null};
  (state.combatEvents??=[]).push(event);
  if(state.combatEvents.length>40)state.combatEvents.shift();
}
export const attackNames={stomp:'Stone stomp',tongue:'Tongue lash',spit:'Sap spit',charge:'Charging horns',cleave:'Warden sweep'};
export function attackWarning(enemy, target) {
  if(!enemy.intent)return enemy.recovering?'Recovering · one enemy action before it can attack again.':null;
  const threatened=enemy.intent.tiles.some(t=>t.x===target.x&&t.y===target.y);
  return `${attackNames[enemy.intent.kind]??'Special attack'} next turn · ${threatened?'YOU ARE IN ITS PATH — move off the marked tiles.':'stay clear of the marked tiles.'}`;
}
export function weaponTechnique(player, enemy, melee=true) {
  if(!melee)return {bonus:0,pierce:0,label:null};
  const weapon=player.weapon;
  // Sword counters reward reading a windup. An axe's existing piercing gains
  // one extra point against heavy armor; neither changes turn frequency.
  if(weapon?.weaponType==='sword'&&enemy.intent)return {bonus:1,pierce:weapon.armorPierce??0,label:'Countercut'};
  const heavy=weapon?.weaponType==='axe'&&enemy.defense>=3;
  return {bonus:0,pierce:(weapon?.armorPierce??0)+(heavy?1:0),label:heavy?'Armor cleave':null};
}
