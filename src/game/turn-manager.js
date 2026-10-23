import { recovery } from './items.js';
export class TurnManager {
  constructor(game) {this.game=game;this.busy=false;}
  perform(action) {
    const g=this.game;
    if(this.busy||g.state.status!=='playing') return false;
    this.busy=true;
    try {
      const before=new Set(g.state.timeline??[]);
      if(!g.resolvePlayer(action)) return false;
      for(const entry of g.state.timeline??[])if(!before.has(entry))entry.turn=g.state.turn+1;
      g.state.timeline??=[];g.state.timeline.push({turn:g.state.turn+1,text:'Action: '+action.type});if(g.state.timeline.length>100)g.state.timeline.shift();
      g.state.enemyEffects=[];
      {const p=g.state.player;p.mana=Math.min(p.maxMana,Math.round((p.mana+recovery(p))*10)/10);}
      g.state.turn++;
      if(g.state.status==='playing'&&!g.state.transition)g.actCompanion?.();
      // Snapshot the survivors after the player action; newly loaded floors also act once.
      if(g.state.status==='playing'&&!g.state.transition) for(const enemy of [...g.state.enemies]) {
        if(g.state.status!=='playing') break;
        if(enemy.hp>0) g.actEnemy(enemy);
      }
      g.finishTurn?.();g.state.transition=false;g.refresh(); return true;
    } finally {this.busy=false;}
  }
}
