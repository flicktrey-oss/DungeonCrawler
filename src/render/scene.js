import Phaser from 'phaser';
import {key} from '../game/dungeon.js';
const T=24;
export class DungeonScene extends Phaser.Scene {
  constructor(){super('dungeon');}
  create(){this.paint=this.add.graphics();this.cameras.main.setBackgroundColor('#090c12');this.cameras.main.setBounds(0,0,40*T,30*T);this.ready=true;this.draw();}
  setGame(game){this.gameModel=game;this.draw();}
  draw(){
    if(!this.ready||!this.gameModel)return;
    const s=this.gameModel.state,g=this.paint;g.clear();
    for(let y=0;y<s.map.length;y++)for(let x=0;x<s.map[y].length;x++){
      const k=key(x,y);if(!s.explored.has(k))continue;const visible=s.visible.has(k),a=visible?1:0.32,t=s.map[y][x],xx=x*T,yy=y*T;
      if(s.location?.kind==='world'){this.outdoorTile(t,xx,yy,a,s.biome,x,y);continue;}
      g.fillStyle(t==='#'?0x3d4351:0x20272e,a);g.fillRect(xx,yy,T-1,T-1);
      if(t==='#'){g.fillStyle(0x59616b,a);g.fillRect(xx+1,yy+1,22,3);g.lineStyle(1,0x252b37,a);g.lineBetween(xx+12,yy+4,xx+12,yy+12);g.lineBetween(xx,yy+12,xx+24,yy+12);if((x*7+y*13)%37===0){g.fillStyle(0xa96632,a);g.fillRect(xx+10,yy+9,4,9);g.fillStyle(0xffd479,a);g.fillTriangle(xx+9,yy+10,xx+15,yy+10,xx+12,yy+3);}}
      else{if(t==='A'){g.fillStyle(0x9e7890,a);g.fillRect(xx+5,yy+5,14,14);g.fillStyle(0xe8ca7b,a);g.fillRect(xx+10,yy+8,4,8);}g.fillStyle(0x303942,a);g.fillRect(xx+3,yy+5,7,2);if(t==='>'||t==='<'){ g.fillStyle(0xb9c2c8,a);for(let i=0;i<4;i++)g.fillRect(xx+4+i*2,yy+5+i*4,16-i*4,2);}if(t==='+'){g.fillStyle(0x74563a,a);g.fillRect(xx+5,yy+2,14,20);g.fillStyle(0xb79c66,a);g.fillRect(xx+7,yy+5,2,14);g.fillRect(xx+15,yy+5,2,14);}}
    }
    if(s.location?.kind==='crypt'){const u=s.upstairs; if(s.explored.has(key(u.x,u.y))){g.lineStyle(2,0x86d6c0,s.visible.has(key(u.x,u.y))?1:.3);g.strokeTriangle(u.x*T+6,u.y*T+17,u.x*T+18,u.y*T+17,u.x*T+12,u.y*T+5);}}
    for(const item of s.items)if(s.visible.has(key(item.x,item.y)))this.item(item);
    for(const e of s.enemies)if(e.hp>0&&s.visible.has(key(e.x,e.y)))this.actor(e,e.kind);
    this.actor(s.player,'player');this.cameras.main.centerOn(s.player.x*T+12,s.player.y*T+12);
  }
  outdoorTile(t,x,y,a,biome,tx,ty){
    const g=this.paint,marsh=biome==='marsh';
    g.fillStyle(t==='~'?0x264650:t==='.'?0x70614b:marsh?0x344b40:0x344b35,a);g.fillRect(x,y,24,24);
    if(t===','||t===';'||t==='T'){g.fillStyle(marsh?0x688361:0x577447,a);const n=(tx*7+ty*11)%15;g.fillRect(x+3+n,y+5,2,4);g.fillRect(x+5,y+17-n/2,3,2);}
    if(t==='T'){g.fillStyle(0x594937,a);g.fillRect(x+10,y+12,5,11);g.fillStyle(0x20392d,a);g.fillRect(x+2,y+3,20,13);g.fillStyle(0x45684a,a);g.fillRect(x+5,y+1,14,9);g.fillStyle(0x63835a,a);g.fillRect(x+7,y+2,7,3);}
    if(t==='~'){g.fillStyle(0x4f7e87,a);g.fillRect(x+3,y+7,10,2);g.fillRect(x+12,y+17,8,2);}
    if(t===';'){g.fillStyle(0x92a271,a);g.fillRect(x+5,y+5,2,14);g.fillRect(x+11,y+2,2,18);g.fillRect(x+16,y+8,2,12);}
    if(t==='^'){g.fillStyle(0x777d76,a);g.fillTriangle(x+2,y+21,x+12,y+3,x+23,y+21);g.fillStyle(0xa5a998,a);g.fillTriangle(x+8,y+10,x+12,y+3,x+15,y+10);}
    if(t==='D'){g.fillStyle(0x858675,a);g.fillRect(x+2,y+3,20,21);g.fillStyle(0x0e171c,a);g.fillRect(x+6,y+7,12,17);g.fillStyle(0xb88a69,a);g.fillRect(x+2,y+3,20,3);}
    if(t==='R'){g.fillStyle(0x8c9384,a);g.fillRect(x+3,y+8,5,15);g.fillRect(x+16,y+3,5,20);g.fillRect(x+3,y+3,5,3);}
    if(t==='C'){g.fillStyle(0xad8050,a);g.fillTriangle(x+1,y+22,x+11,y+2,x+21,y+22);g.fillStyle(0x3a3128,a);g.fillTriangle(x+7,y+22,x+11,y+9,x+16,y+22);g.fillStyle(0xffd180,a);g.fillRect(x+20,y+15,3,6);g.fillStyle(0xf18f53,a);g.fillRect(x+19,y+19,5,3);}
  }
  item(i){const g=this.paint,x=i.x*T,y=i.y*T;const colors={potion:0xf36a83,gold:0xf8cc68,weapon:0xd2e4e8,armor:0x829bb4,chest:0xb98043};g.fillStyle(colors[i.kind]);if(i.kind==='potion'){g.fillRect(x+9,y+9,7,10);g.fillStyle(0xe0e9d9);g.fillRect(x+11,y+5,3,5);}else if(i.kind==='weapon'){g.fillRect(x+11,y+4,3,15);g.fillRect(x+7,y+15,11,3);}else{g.fillRect(x+6,y+9,13,10);g.fillStyle(0xffe2a1);g.fillRect(x+11,y+11,3,5);}}
  actor(e,kind){const g=this.paint,x=e.x*T,y=e.y*T;g.fillStyle(0x000000,0.35);g.fillEllipse(x+12,y+21,19,6);
    const colors={player:0x70c6c0,slime:0x8fbd67,skeleton:0xd6ccad,goblin:0xc67d57,boss:0xc56388,guardian:0xb76883,wolf:0xb8b7a6,boar:0x93775c,leech:0xa9b55c};g.fillStyle(colors[kind]);
    if(['wolf','boar','leech'].includes(kind)){g.fillRect(x+3,y+9,18,9);g.fillRect(x+3,y+17,4,5);g.fillRect(x+16,y+17,4,5);g.fillRect(x+15,y+5,7,7);g.fillStyle(0xe5db9f);g.fillRect(x+19,y+7,2,2);}else if(kind==='slime'){g.fillEllipse(x+12,y+15,19,14);}else{g.fillRect(x+6,y+9,13,11);g.fillRect(x+8,y+3,9,9);g.fillRect(x+6,y+19,4,4);g.fillRect(x+15,y+19,4,4);}
    g.fillStyle(0x15202b);g.fillRect(x+9,y+(kind==='slime'?13:6),2,2);g.fillRect(x+14,y+(kind==='slime'?13:6),2,2);
    if(kind==='player'){g.fillStyle(0xebc68e);g.fillRect(x+9,y+5,7,5);g.fillStyle(0xe0e6df);g.fillRect(x+20,y+8,2,12);g.fillStyle(0x513c55);g.fillRect(x+4,y+11,4,10);}
    if(kind==='boss'||kind==='guardian'){g.fillStyle(0xf6d48a);g.fillTriangle(x+5,y+5,x+7,y-2,x+10,y+5);g.fillTriangle(x+15,y+5,x+19,y-2,x+20,y+5);}
  }
}
