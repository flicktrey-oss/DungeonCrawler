const COLORS={strike:'#ffe1a2',hurt:'#ff9696',block:'#9fe8e5',miss:'#d1d8d2'};
// Presentation only: tweens do not call actions, change health, or gate input.
export class CombatFeedback {
  constructor(scene){this.scene=scene;this.state=null;this.last=0;this.objects=new Set();}
  reset(state){for(const object of this.objects){this.scene.tweens.killTweensOf(object);object.destroy();}this.objects.clear();this.state=state;this.map=state.map;this.last=state.combatSerial??0;}
  show(state){
    if(state!==this.state||state.map!==this.map){this.reset(state);return;}
    const lanes=new Map();
    for(const event of state.combatEvents??[]){
      if(event.id<=this.last)continue;this.last=event.id;
      if(!state.visible.has(`${event.x},${event.y}`))continue;
      const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const color=COLORS[event.kind]??COLORS.strike,x=event.x*24+12,y=event.y*24;
      const tile=`${event.x},${event.y}`,lane=lanes.get(tile)??0;lanes.set(tile,lane+1);
      const labelY=y-9-Math.min(lane,3)*11;
      const text=this.scene.add.text(x,labelY,event.text,{fontFamily:'system-ui',fontSize:'10px',fontStyle:'bold',color,stroke:'#09151c',strokeThickness:3}).setOrigin(.5,1).setDepth(10);
      this.objects.add(text);
      this.scene.tweens.add({targets:text,y:reduced?labelY:labelY-12,alpha:0,delay:reduced?500:240,duration:reduced?1:450,onComplete:()=>{this.objects.delete(text);text.destroy();}});
      const mark=this.scene.add.graphics().setDepth(9);this.objects.add(mark);
      mark.lineStyle(2,Number.parseInt(color.slice(1),16),.9);
      if(event.from&&state.visible.has(`${event.from.x},${event.from.y}`)&&Math.abs(event.from.x-event.x)+Math.abs(event.from.y-event.y)>1)mark.lineBetween(event.from.x*24+12,event.from.y*24+12,x,y+12);
      if(event.kind==='block'){mark.strokeCircle(x,y+12,10);mark.lineBetween(x-5,y+12,x,y+17);mark.lineBetween(x,y+17,x+7,y+7);}
      else if(event.kind!=='miss'){mark.lineBetween(x-8,y+19,x+8,y+5);mark.lineBetween(x-4,y+22,x+10,y+8);}
      this.scene.tweens.add({targets:mark,alpha:0,duration:reduced?100:220,onComplete:()=>{this.objects.delete(mark);mark.destroy();}});
    }
    // Keep a burst of many simultaneous attacks bounded even during held movement.
    while(this.objects.size>60){const object=this.objects.values().next().value;this.scene.tweens.killTweensOf(object);object.destroy();this.objects.delete(object);}
  }
}
