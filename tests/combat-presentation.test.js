import {it,expect} from 'vitest';
import {CombatFeedback} from '../src/render/combat-feedback.js';
import {combatFeedback} from '../src/game/combat-feedback.js';
function setup(){
 const animations=[],objects=[];
 const object=()=>{const o={destroyed:false,setOrigin(){return this;},setDepth(){return this;},lineStyle(){return this;},lineBetween(){return this;},strokeCircle(){return this;},destroy(){this.destroyed=true;}};objects.push(o);return o;};
 const scene={add:{text:object,graphics:object},tweens:{add:a=>animations.push(a),killTweensOf:()=>{}}};
 const state={map:[['.']],visible:new Set(['1,2'])},view=new CombatFeedback(scene);view.show(state);
 return {state,view,objects,animations};
}
it('renders each event once, even if HUD and camera repaint many times',()=>{
 const {state,view,objects,animations}=setup();combatFeedback(state,{x:1,y:2},'−3');view.show(state);expect(objects).toHaveLength(2);
 for(let i=0;i<20;i++)view.show(state);expect(objects).toHaveLength(2);expect(state.combatSerial).toBe(1);
 for(const a of animations)a.onComplete();expect(view.objects.size).toBe(0);expect(objects.every(o=>o.destroyed)).toBe(true);
});
it('never renders hidden events and does not replay them after exploration',()=>{
 const {state,view,objects}=setup();combatFeedback(state,{x:8,y:8},'−3');view.show(state);expect(objects).toHaveLength(0);state.visible.add('8,8');view.show(state);expect(objects).toHaveLength(0);
});
it('clears transient objects when the region or entire run changes',()=>{
 const {state,view,objects}=setup();combatFeedback(state,{x:1,y:2},'BLOCK','block');view.show(state);state.map=[['#']];view.show(state);expect(objects.every(o=>o.destroyed)).toBe(true);expect(view.objects.size).toBe(0);
 combatFeedback(state,{x:1,y:2},'MISS','miss');view.show(state);expect(view.objects.size).toBe(2);view.show({...state});expect(view.objects.size).toBe(0);
});
it('bounds live effects during rapid repeated actions without modifying gameplay state',()=>{
 const {state,view}=setup();state.turn=4;for(let i=0;i<100;i++){combatFeedback(state,{x:1,y:2},'−1');view.show(state);}expect(view.objects.size).toBeLessThanOrEqual(60);expect(state.turn).toBe(4);expect(state.combatEvents).toHaveLength(40);
});
