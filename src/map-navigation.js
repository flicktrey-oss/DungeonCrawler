import {KINGDOM} from './game/city.js';
import {WIDTH,HEIGHT} from './game/dungeon.js';
export const MAP_ZOOMS=[.5,.75,1,1.5,2,3,4];
export function zoomFrame(frame,player,zoom=1){
 if(zoom===1)return frame;
 const cx=zoom>1?player.x+.5:(frame.minX+frame.maxX)/2,cy=zoom>1?player.y+.5:(frame.minY+frame.maxY)/2,w=(frame.maxX-frame.minX)/zoom,h=(frame.maxY-frame.minY)/zoom;
 return {minX:cx-w/2,minY:cy-h/2,maxX:cx+w/2,maxY:cy+h/2};
}
export function kingdomBearing(game){
 if(!game.story?.accepted||game.story.complete)return null;
 const r=game.location.kind==='crypt'?game.cryptReturn:null,p=game.state.player;
 const x=r?(game.surfaceChunks?r.x:r.rx*WIDTH+r.x):game.state.seamless?p.x:game.location.rx*WIDTH+p.x;
 const y=r?(game.surfaceChunks?r.y:r.ry*HEIGHT+r.y):game.state.seamless?p.y:game.location.ry*HEIGHT+p.y;
 const dx=KINGDOM.rx*WIDTH+KINGDOM.keep.x-x,dy=KINGDOM.ry*HEIGHT+KINGDOM.keep.y-y;
 if(game.location.kind==='world'&&game.location.rx===KINGDOM.rx&&game.location.ry===KINGDOM.ry)return {arrow:'◆',label:'Northwatch',description:'You have reached Northwatch.'};
 const directions=[['↑','north'],['↗','northeast'],['→','east'],['↘','southeast'],['↓','south'],['↙','southwest'],['←','west'],['↖','northwest']],index=(Math.round(Math.atan2(dx,-dy)/(Math.PI/4))+8)%8;
 return {arrow:directions[index][0],label:'Northwatch',description:`Northwatch lies ${directions[index][1]}${r?' from your surface entrance':''}.`};
}
