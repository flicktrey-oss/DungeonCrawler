import {it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import {availableInteractions,InteractionSelection} from '../src/game/interactions.js';
import {planTravel} from '../src/game/travel.js';
it('cycles storage and each item independently without advancing time, mana, or enemies',()=>{
 const g=new Expedition(5),choice=new InteractionSelection();g.state.items=[{kind:'gold',name:'Gold',amount:3,x:20,y:15},{kind:'potion',name:'Tonic',x:20,y:15}];const p=g.state.player,initial={turn:g.state.turn,mana:p.mana};
 expect(choice.resolve(g).selected.type).toBe('storage');expect(choice.next(g).selected.detail).toBe('Gold');expect(choice.next(g).selected.detail).toBe('Tonic');expect(choice.next(g).selected.type).toBe('storage');expect({turn:g.state.turn,mana:p.mana}).toEqual(initial);
});
it('picks the selected ground item instead of always taking the first',()=>{
 const g=new Expedition(5);g.state.items=[{kind:'gold',name:'Gold',amount:3,x:20,y:15},{kind:'potion',name:'Tonic',x:20,y:15}];const gold=g.state.items[0],tonic=g.state.items[1];expect(g.action({type:'pickup',item:tonic})).toBe(true);expect(g.state.items).toEqual([gold]);expect(g.state.turn).toBe(1);
});
it('rejects a stale or remote pickup reference without a turn or inventory change',()=>{
 const g=new Expedition(5),remote={kind:'gold',amount:30,x:21,y:15};g.state.items=[remote];expect(g.action({type:'pickup',item:remote})).toBe(false);expect(g.action({type:'pickup',item:{...remote,x:20}})).toBe(false);expect(g.state.turn).toBe(0);expect(g.state.player.gold).toBe(8);
});
it('preserves a selected action on redraws and advances to another item after collection',()=>{
 const g=new Expedition(5),c=new InteractionSelection();g.state.items=[{kind:'gold',name:'First',amount:1,x:20,y:15},{kind:'gold',name:'Second',amount:1,x:20,y:15}];c.next(g);const selected=c.resolve(g).selected;expect(c.resolve(g).selected.id).toBe(selected.id);g.action({type:'pickup',item:selected.item});expect(c.resolve(g).selected.detail).toBe('Second');
});
it('resets selection when moving or starting a new game, without leaking old targets',()=>{
 const g=new Expedition(5),c=new InteractionSelection();g.state.items=[{kind:'gold',name:'Gold',amount:1,x:20,y:15}];c.next(g);g.action({type:'move',dx:1,dy:0});c.resolve(g);g.action({type:'move',dx:-1,dy:0});expect(c.resolve(g).selected.type).toBe('storage');expect(c.resolve(new Expedition(5)).selected.type).toBe('storage');
});
it('offers every adjacent person and respects the selected dialogue target',()=>{
 const g=new Expedition(5),p=g.state.player;g.state.encounters=[{id:'a',type:'villager',x:p.x-1,y:p.y,name:'A'},{id:'b',type:'villager',x:p.x+1,y:p.y,name:'B'}];const people=availableInteractions(g).filter(o=>o.type==='encounter');expect(people.map(o=>o.detail)).toEqual(['A','B']);g.interactionTarget=people[1].event;expect(g.activeEncounter().name).toBe('B');p.y+=3;expect(g.activeEncounter()).toBeUndefined();
});
it('click travel preserves the requested site even if a different action was selected',()=>{
 const g=new Expedition(5),c=new InteractionSelection();g.state.items=[{kind:'gold',name:'Gold',amount:1,x:20,y:15}];c.next(g);const plan=planTravel(g,20,15);expect(plan.intent.type).toBe('pickup');g.state.items=[];expect(planTravel(g,20,15).intent.site).toBe('C');
});
