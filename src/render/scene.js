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
      g.fillStyle(t==='#'?0x3d4351:0x20272e,a);g.fillRect(xx,yy,T-1,T-1);
      if(t==='#'){g.fillStyle(0x59616b,a);g.fillRect(xx+1,yy+1,22,3);g.lineStyle(1,0x252b37,a);g.lineBetween(xx+12,yy+4,xx+12,yy+12);g.lineBetween(xx,yy+12,xx+24,yy+12);if((x*7+y*13)%37===0){g.fillStyle(0xa96632,a);g.fillRect(xx+10,yy+9,4,9);g.fillStyle(0xffd479,a);g.fillTriangle(xx+9,yy+10,xx+15,yy+10,xx+12,yy+3);}}
      else{g.fillStyle(0x303942,a);g.fillRect(xx+3,yy+5,7,2);if(t==='>'){g.fillStyle(0xb9c2c8,a);for(let i=0;i<4;i++)g.fillRect(xx+4+i*2,yy+5+i*4,16-i*4,2);}if(t==='+'){g.fillStyle(0x74563a,a);g.fillRect(xx+5,yy+2,14,20);g.fillStyle(0xb79c66,a);g.fillRect(xx+7,yy+5,2,14);g.fillRect(xx+15,yy+5,2,14);}}
    }
    for(const item of s.items)if(s.visible.has(key(item.x,item.y)))this.item(item);
    for(const e of s.enemies)if(e.hp>0&&s.visible.has(key(e.x,e.y)))this.actor(e,e.kind);
    this.actor(s.player,'player');this.cameras.main.centerOn(s.player.x*T+12,s.player.y*T+12);
  }
  item(i){const g=this.paint,x=i.x*T,y=i.y*T;const colors={potion:0xf36a83,gold:0xf8cc68,weapon:0xd2e4e8,armor:0x829bb4,chest:0xb98043};g.fillStyle(colors[i.kind]);if(i.kind==='potion'){g.fillRect(x+9,y+9,7,10);g.fillStyle(0xe0e9d9);g.fillRect(x+11,y+5,3,5);}else if(i.kind==='weapon'){g.fillRect(x+11,y+4,3,15);g.fillRect(x+7,y+15,11,3);}else{g.fillRect(x+6,y+9,13,10);g.fillStyle(0xffe2a1);g.fillRect(x+11,y+11,3,5);}}
  actor(e,kind){const g=this.paint,x=e.x*T,y=e.y*T;g.fillStyle(0x000000,0.35);g.fillEllipse(x+12,y+21,19,6);
    const colors={player:0x70c6c0,slime:0x8fbd67,skeleton:0xd6ccad,goblin:0xc67d57,boss:0xc56388};g.fillStyle(colors[kind]);
    if(kind==='slime'){g.fillEllipse(x+12,y+15,19,14);}else{g.fillRect(x+6,y+9,13,11);g.fillRect(x+8,y+3,9,9);g.fillRect(x+6,y+19,4,4);g.fillRect(x+15,y+19,4,4);}
    g.fillStyle(0x15202b);g.fillRect(x+9,y+(kind==='slime'?13:6),2,2);g.fillRect(x+14,y+(kind==='slime'?13:6),2,2);
    if(kind==='player'){g.fillStyle(0xebc68e);g.fillRect(x+9,y+5,7,5);g.fillStyle(0xe0e6df);g.fillRect(x+20,y+8,2,12);g.fillStyle(0x513c55);g.fillRect(x+4,y+11,4,10);}
    if(kind==='boss'){g.fillStyle(0xf6d48a);g.fillTriangle(x+5,y+5,x+7,y-2,x+10,y+5);g.fillTriangle(x+15,y+5,x+19,y-2,x+20,y+5);}
  }
}
