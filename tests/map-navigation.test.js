import {it,expect} from 'vitest';
import {SeamlessExpedition} from '../src/game/seamless-expedition.js';
import {minimapFrame,minimapCells,worldMapCells,worldMapLayout} from '../src/minimap.js';
import {inspectMapAt} from '../src/map-inspection.js';
import {kingdomBearing} from '../src/map-navigation.js';
import {Expedition} from '../src/game/expedition.js';
it('zooms map geometry and hit tests together without changing exploration or turns',()=>{
 const g=new SeamlessExpedition(5),s=g.state,known=new Set(s.explored),count=g.surfaceChunks.size;
 for(const zoom of [.5,.75,1,1.5,2,3,4])for(const view of ['local','world']){const fit=minimapFrame(s,view),frame=minimapFrame(s,view,undefined,zoom);expect(frame.maxX-frame.minX).toBeCloseTo((fit.maxX-fit.minX)/zoom);const x=20,y=15,cx=(x+.5-frame.minX)/(frame.maxX-frame.minX)*160,cy=(y+.5-frame.minY)/(frame.maxY-frame.minY)*120;expect(inspectMapAt(g,view,cx,cy,160,120,zoom)).toMatchObject({x,y});}
 expect(s.explored).toEqual(known);expect(s.turn).toBe(0);expect(g.surfaceChunks.size).toBe(count);
});
it('does not expose the city through its marker, escort objective or a preloaded settlement',()=>{
 const g=new SeamlessExpedition(5);g.story.accepted=true;g.loadChunk(0,-6);g.refresh();expect(g.state.surfaceMarkers.some(m=>m.label==='K'||m.name===g.story.title)).toBe(false);expect(minimapCells(g.state).some(c=>c.y< -150)).toBe(false);expect(worldMapCells(g).some(c=>c.ry===-6)).toBe(false);Object.assign(g.state.player,{x:20,y:-165});g.syncArea();g.refresh();expect(g.state.surfaceMarkers.some(m=>m.label==='K')).toBe(true);expect(minimapCells(g.state).some(c=>c.y===-173)).toBe(true);Object.assign(g.state.player,{x:20,y:15});g.syncArea();g.refresh();expect(g.state.surfaceMarkers.some(m=>m.label==='K')).toBe(true);
});
it('points toward Northwatch from the player or their actual dungeon entrance without revealing distance',()=>{
 const g=new SeamlessExpedition(5);expect(kingdomBearing(g)).toBeNull();g.story.accepted=true;expect(kingdomBearing(g)).toMatchObject({arrow:'↑',description:'Northwatch lies north.'});g.state.player.x=400;expect(kingdomBearing(g).arrow).toBe('↖');g.state.player.x=-400;expect(kingdomBearing(g).arrow).toBe('↗');g.state.player.x=20;g.state.player.y=-400;expect(kingdomBearing(g).arrow).toBe('↓');g.location.kind='crypt';g.cryptReturn={x:20,y:15,rx:0,ry:0};expect(kingdomBearing(g).description).toBe('Northwatch lies north from your surface entrance.');g.story.complete=true;expect(kingdomBearing(g)).toBeNull();
});
it('keeps classic world and dungeon hit testing aligned with zoom too',()=>{
 const g=new Expedition(5),cells=worldMapCells(g);for(const zoom of [.5,1,2,4]){const l=worldMapLayout(cells,160,120,zoom,g.location);expect(inspectMapAt(g,'world',l.x+.5*l.size,l.y+.5*l.size,160,120,zoom)).toMatchObject({rx:0,ry:0});const f=minimapFrame(g.state,'local',undefined,zoom);expect(inspectMapAt(g,'local',(20.5-f.minX)/(f.maxX-f.minX)*160,(15.5-f.minY)/(f.maxY-f.minY)*120,160,120,zoom)).toMatchObject({x:20,y:15});}expect(inspectMapAt(g,'local',0,0,160,120,.5)).toBeNull();
});
