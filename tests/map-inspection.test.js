import {describe,it,expect} from 'vitest';
import {Expedition} from '../src/game/expedition.js';
import {worldMapCells,worldMapLayout} from '../src/minimap.js';
import {inspectMapAt,mapInspectionText} from '../src/map-inspection.js';
import {biomeAt,BIOMES} from '../src/game/world.js';
const select=(g,rx,ry)=>{const l=worldMapLayout(worldMapCells(g));return inspectMapAt(g,'world',l.x+(rx+.5)*l.size,l.y+(ry+.5)*l.size);};
describe('map inspection',()=>{
 it('hits camp but cannot inspect Northwatch until it is visited',()=>{
  const g=new Expedition(5),before=structuredClone(g.state);expect(mapInspectionText(g,select(g,0,0))).toContain('Lantern Camp (0, 0)');expect(select(g,0,-6)).toBeNull();expect(g.regions.size).toBe(0);expect(g.state).toEqual(before);
 });
 it('reports real biome difficulty relative to the adventurer on a discovered region',()=>{
  const g=new Expedition(5);let rx=1;while(biomeAt(rx,2,5)!=='highlands')rx++;g.visitWorld(rx,2);const sel=select(g,rx,2);expect(mapInspectionText(g,sel)).toContain('Lv 6 · Overwhelming');g.state.player.level=8;expect(mapInspectionText(g,sel)).toContain('Stay alert');
 });
 it('ignores empty world space, invalid input and unexplored local squares',()=>{
  const g=new Expedition(5);for(const p of [[-1,0],[160,120],[NaN,0],[0,0]])expect(inspectMapAt(g,'world',...p)).toBeNull();g.visitWorld(1,0);expect(inspectMapAt(g,'local',0,0)).toBeNull();
 });
 it('inspects local settlement squares without exploration and clears local selections on travel',()=>{
  const g=new Expedition(5),selection=inspectMapAt(g,'local',2,2);expect(selection).toMatchObject({x:0,y:0,rx:0,ry:0});expect(mapInspectionText(g,selection)).toContain('Tile (0, 0)');g.visitWorld(1,0);expect(mapInspectionText(g,selection)).toBe('');
 });
 it('shows crypt depth and the current crypt recommendation, rather than the surface recommendation',()=>{
  const g=new Expedition(5);g.visitCrypt(1,0,2);const p=g.state.player,sel=inspectMapAt(g,'local',(p.x+.5)*4,(p.y+.5)*4);expect(mapInspectionText(g,sel)).toContain('Depth 2');expect(mapInspectionText(g,sel)).toContain('Lv '+g.state.recommended);
 });
});
