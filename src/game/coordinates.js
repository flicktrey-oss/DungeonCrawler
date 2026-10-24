import {WIDTH,HEIGHT} from './dungeon.js';
export const locationPoint=(g,point,region=g.location)=>g.state.seamless?{x:region.rx*WIDTH+point.x,y:region.ry*HEIGHT+point.y}:{...point};
