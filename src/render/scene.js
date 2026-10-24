import {drawCampProp,drawCampGround} from './camp.js';
import {CombatFeedback} from './combat-feedback.js';
import {drawPerson} from './people.js';
import { drawDangerPockets } from './danger-pockets.js';
import { drawAdventurer } from './adventurer.js';
import Phaser from 'phaser';
import {drawCreature,drawMiniboss} from './creature-sprites.js';
import {rememberedTile} from '../game/map-memory.js';
import {key,mapBounds} from '../game/dungeon.js';
const T=24;
export class DungeonScene extends Phaser.Scene {
  constructor(){super('dungeon');}
  create(){this.combatFeedback=new CombatFeedback(this);this.paint=this.add.graphics();this.cameras.main.setBackgroundColor('#090c12');this.cameras.main.setBounds(0,0,40*T,30*T);this.ready=true;this.scale.on('resize',this.draw,this);this.draw();const canvas=this.sys.game.canvas;let down=null,pending=null;
    canvas.addEventListener('pointerdown',event=>{pending=null;down=event.isPrimary&&event.button===0?{id:event.pointerId,x:event.clientX,y:event.clientY}:null;});
    canvas.addEventListener('pointercancel',()=>{down=null;pending=null;});
    canvas.addEventListener('pointerup',event=>{
      const pressed=down;down=null;
      if(!pressed||pressed.id!==event.pointerId||Math.hypot(event.clientX-pressed.x,event.clientY-pressed.y)>12)return;
      // Read the current DOM rectangle: mobile HUD changes and page scrolling move the canvas.
      const rect=canvas.getBoundingClientRect();
      const point=this.cameras.main.getWorldPoint((event.clientX-rect.left)*this.scale.width/rect.width,(event.clientY-rect.top)*this.scale.height/rect.height);
      pending={x:Math.floor(point.x/T),y:Math.floor(point.y/T),pointerType:event.pointerType,shiftKey:event.shiftKey};
      if(event.pointerType==='touch'){const tap=pending;pending=null;this.onInspect?.(tap.x,tap.y,tap);}
    });
    canvas.addEventListener('click',()=>{const click=pending;pending=null;if(click)this.onInspect?.(click.x,click.y,click);});}

  setGame(game){this.gameModel=game;this.draw();}
  draw(){
    if(!this.ready||!this.gameModel)return;
    const s=this.gameModel.state,g=this.paint;g.clear();
    const {width,height}=this.scale,zoom=height<500?1.25:width<900?1.5:2;
    const camera=this.cameras.main;camera.setZoom(zoom);
    // Padding keeps the adventurer centered near region edges, clear of the HUD.
    const bounds=mapBounds(s.map);
    camera.setBounds(bounds.minX*T-width/(2*zoom),bounds.minY*T-height/(2*zoom),(bounds.maxX-bounds.minX)*T+width/zoom,(bounds.maxY-bounds.minY)*T+height/zoom);
    const p=s.player,view={minX:Math.max(bounds.minX,Math.floor(p.x-width/(2*zoom*T))-2),maxX:Math.min(bounds.maxX,Math.ceil(p.x+width/(2*zoom*T))+3),minY:Math.max(bounds.minY,Math.floor(p.y-height/(2*zoom*T))-2),maxY:Math.min(bounds.maxY,Math.ceil(p.y+height/(2*zoom*T))+3)};
    for(let y=view.minY;y<view.maxY;y++)for(let x=view.minX;x<view.maxX;x++){
      const k=key(x,y);if(!s.explored.has(k))continue;const visible=s.visible.has(k),a=visible?1:0.32,t=rememberedTile(s,x,y),xx=x*T,yy=y*T;
      const area=this.gameModel.areaAt?.(x,y)??s;
      if(s.location?.kind==='world'&&area.city){this.cityTile(t,xx,yy,a,x,y);continue;}
      if(s.location?.kind==='world'){this.outdoorTile(t,xx,yy,a,this.gameModel.renderBiome?.(x,y)??area.biome,x,y);continue;}
      g.fillStyle(t==='#'?0x3d4351:0x20272e,a);g.fillRect(xx,yy,T-1,T-1);
      if(t==='#'){g.fillStyle(0x59616b,a);g.fillRect(xx+1,yy+1,22,3);g.lineStyle(1,0x252b37,a);g.lineBetween(xx+12,yy+4,xx+12,yy+12);g.lineBetween(xx,yy+12,xx+24,yy+12);if((x*7+y*13)%37===0){g.fillStyle(0xa96632,a);g.fillRect(xx+10,yy+9,4,9);g.fillStyle(0xffd479,a);g.fillTriangle(xx+9,yy+10,xx+15,yy+10,xx+12,yy+3);}}
      else{if(t==='A'){g.fillStyle(0x9e7890,a);g.fillRect(xx+5,yy+5,14,14);g.fillStyle(0xe8ca7b,a);g.fillRect(xx+10,yy+8,4,8);}g.fillStyle(0x303942,a);g.fillRect(xx+3,yy+5,7,2);if(t==='>'||t==='<'){ g.fillStyle(0xb9c2c8,a);for(let i=0;i<4;i++)g.fillRect(xx+4+i*2,yy+5+i*4,16-i*4,2);}if(t==='+'){g.fillStyle(0x74563a,a);g.fillRect(xx+5,yy+2,14,20);g.fillStyle(0xb79c66,a);g.fillRect(xx+7,yy+5,2,14);g.fillRect(xx+15,yy+5,2,14);}}
    }
    if(s.location?.kind==='crypt'){const u=s.upstairs; if(s.explored.has(key(u.x,u.y))){g.lineStyle(2,0x86d6c0,s.visible.has(key(u.x,u.y))?1:.3);g.strokeTriangle(u.x*T+6,u.y*T+17,u.x*T+18,u.y*T+17,u.x*T+12,u.y*T+5);}}
    for(const decoration of s.scenery??[])if(s.explored.has(key(decoration.x,decoration.y)))this.scenery(decoration,s.visible.has(key(decoration.x,decoration.y))?1:.3);
    for(const e of s.encounters??[])if(e.type==='villager'&&e.quest&&s.visible.has(key(e.x,e.y))){g.fillStyle(e.quest.camp?0xc8ab63:({hunt:0x8b9d6b,recovery:0xba8ca6,ward:0x8e9cd0})[e.quest.kind]??0x8fa682);g.fillRect(e.x*T+8,e.y*T+12,9,8);}
    for(let y=view.minY;y<view.maxY;y++)for(let x=view.minX;x<view.maxX;x++)if(s.visible.has(key(x,y))&&['V','M'].includes(s.map[y][x])){const event=s.encounters?.find(e=>e.x===x&&e.y===y),name=s.map[y][x]==='M'?'Mara the Wayfarer':event?.quest?.giver??event?.name??'The Mirekeeper';drawPerson(g,x*T,y*T,name,s.map[y][x]==='M'?'merchant':'traveler');}
    drawDangerPockets(g,s,T);
    for(const item of s.items)if(s.visible.has(key(item.x,item.y)))this.item(item);
    this.drawEnemyWarnings(s);
    for(const e of s.enemies)if(e.hp>0&&s.visible.has(key(e.x,e.y)))this.actor(e,e.kind);
    for(const e of s.enemies)if(e.hp>0&&e.questKey&&this.gameModel.quests?.get(e.questKey)?.accepted&&s.visible.has(key(e.x,e.y))){g.fillStyle(0xffda85);g.fillRect(e.x*T+10,e.y*T-3,4,2);}
    for(const e of s.encounters??[])if(e.wardIndex!==undefined&&e.used&&s.visible.has(key(e.x,e.y))){g.fillStyle(0x8fe2cb);g.fillRect(e.x*T+10,e.y*T+7,4,8);}
    for(const point of this.travelHighlights??[])if(s.explored.has(key(point.x,point.y))){g.fillStyle(0xa8d6c8,.65);g.fillRect(point.x*T+10,point.y*T+10,4,4);}
    if(s.companion&&s.visible.has(key(s.companion.x,s.companion.y))){this.actor(s.companion,'prince');this.healthBar(s.companion);}
    this.actor(s.player,'player');
    // Draw bars last so neighboring actors and scenery cannot cover them.
    for(const e of s.enemies)if(e.hp>0&&s.visible.has(key(e.x,e.y)))this.healthBar(e);
    for(const e of this.targetHighlights??[]){g.lineStyle(2,0xf4d385,1);g.strokeRect(e.x*T+1,e.y*T+1,T-2,T-2);}
    this.cameras.main.centerOn(s.player.x*T+12,s.player.y*T+12);
    this.combatFeedback.show(s);
  }
  cityTile(t,x,y,a,tx,ty){
    const g=this.paint;g.fillStyle(0x65717b,a);g.fillRect(x,y,24,24);g.lineStyle(1,0x4c5964,a);g.strokeRect(x+1,y+1,22,22);g.lineBetween(x+(((ty%2+2)%2)*10+3),y,x+(((ty%2+2)%2)*10+3),y+24);
    if(t==='#'){g.fillStyle(0x3b4a5e,a);g.fillRect(x,y,24,24);g.fillStyle(0x91a0af,a);g.fillRect(x+1,y+1,22,5);g.fillStyle(0x566b81,a);g.fillRect(x+2,y+9,20,11);if((tx+ty)%4===0){g.fillStyle(0xc4a76b,a);g.fillRect(x+9,y+9,6,8);}}
    if(t==='O'){g.fillStyle(0x654a39,a);g.fillRect(x+3,y+1,18,22);g.fillStyle(0xd2ac69,a);g.fillRect(x+5,y+3,3,18);g.fillRect(x+16,y+3,3,18);}
    if(t==='J'){g.fillStyle(0x9e4c68,a);g.fillRect(x+3,y+1,18,22);g.fillStyle(0xe7c576,a);g.fillRect(x+6,y+2,12,6);g.fillRect(x+5,y+11,14,9);}
    if(t==='I'||t==='N'){g.fillStyle(0x785439,a);g.fillRect(x+4,y+6,16,16);g.fillStyle(0xf0d49c,a);g.fillRect(x+6,y+8,12,10);g.fillStyle(0x574f44,a);if(t==='I'){g.fillRect(x+8,y+12,9,3);g.fillRect(x+8,y+10,2,7);}else{g.fillRect(x+8,y+10,8,2);g.fillRect(x+8,y+14,6,2);}}
    if(t==='Z'){g.fillStyle(0xc0c8c9,a);g.fillEllipse(x+12,y+13,22,18);g.fillStyle(0x598aab,a);g.fillEllipse(x+12,y+12,17,12);g.fillStyle(0xe0d5b2,a);g.fillRect(x+10,y+4,4,12);}
  }
  drawEnemyWarnings(s){
    const g=this.paint;
    for(const e of s.enemies)if(e.hp>0&&e.recovering&&s.visible.has(key(e.x,e.y))){g.lineStyle(2,0x9ccecb);g.strokeCircle(e.x*T+12,e.y*T+12,11);g.fillStyle(0x9ccecb);g.fillRect(e.x*T+8,e.y*T-12,3,5);g.fillRect(e.x*T+14,e.y*T-12,3,5);}
    for(const e of s.enemies)if(e.hp>0&&e.intent&&s.visible.has(key(e.x,e.y))){
      const color=e.intent.kind==='tongue'?0xef9ab8:e.intent.kind==='spit'?0xe7c66e:['cleave','stomp'].includes(e.intent.kind)?0xc6a0ef:0xee9b60;
      for(const tile of e.intent.tiles)if(s.visible.has(key(tile.x,tile.y))){
        const x=tile.x*T,y=tile.y*T;g.fillStyle(color,.23);g.fillRect(x+1,y+1,22,22);g.lineStyle(1,color,.95);g.strokeRect(x+2,y+2,20,20);
        if(e.intent.kind==='stomp'){g.strokeCircle(x+12,y+12,6);}else if(e.intent.kind==='spit'){g.lineBetween(x+7,y+7,x+17,y+17);g.lineBetween(x+17,y+7,x+7,y+17);}else{g.lineBetween(x+7,y+15,x+12,y+9);g.lineBetween(x+12,y+9,x+17,y+15);}
      }
      g.fillStyle(color);g.fillTriangle(e.x*T+8,e.y*T-7,e.x*T+16,e.y*T-7,e.x*T+12,e.y*T-14);g.fillStyle(0x17242d);g.fillRect(e.x*T+11,e.y*T-12,2,3);
    }
  }
  healthBar(enemy){
    const g=this.paint,x=enemy.x*T+2,y=Math.max(mapBounds(this.gameModel.state.map).minY*T,enemy.y*T-5);
    const ratio=Math.max(0,Math.min(1,enemy.hp/enemy.maxHp));
    g.fillStyle(0x080c12);g.fillRect(x,y,20,5);
    g.fillStyle(0x512b36);g.fillRect(x+1,y+1,18,3);
    g.fillStyle(ratio>.5?0x81bf78:ratio>.25?0xe1b765:0xe16d72);
    g.fillRect(x+1,y+1,Math.max(1,Math.round(18*ratio)),3);
  }
  outdoorTile(t,x,y,a,biome,tx,ty,g=this.paint){
    const marsh=biome==='marsh';const ground=({forest:0x344b35,marsh:0x344b40,highlands:0x55564d,ashlands:0x493536})[biome]??0x344b35;
    g.fillStyle(['~',':'].includes(t)?0x264650:['.','P'].includes(t)?0x70614b:ground,a);g.fillRect(x,y,24,24);
    if((this.gameModel?.areaAt?.(tx,ty)?.home??this.gameModel?.state.home)&&this.gameModel?.location.kind==='world')drawCampGround(g,t,x,y,a,tx,ty);
    if(t===','||t===';'||t==='T'){g.fillStyle(marsh?0x688361:0x577447,a);const n=(tx*7+ty*11)%15;g.fillRect(x+3+n,y+5,2,4);g.fillRect(x+5,y+17-n/2,3,2);}
    if(t==='T'){g.fillStyle(0x594937,a);g.fillRect(x+10,y+12,5,11);g.fillStyle(0x20392d,a);g.fillRect(x+2,y+3,20,13);g.fillStyle(0x45684a,a);g.fillRect(x+5,y+1,14,9);g.fillStyle(0x63835a,a);g.fillRect(x+7,y+2,7,3);}
    if(t==='Y'){g.fillStyle(0x27252a,a);g.fillRect(x+10,y+2,4,21);g.fillRect(x+4,y+7,8,3);g.fillRect(x+13,y+11,7,3);}
    if(['B','V','W','S','K'].includes(t)){g.fillStyle(t==='S'?0x9386b4:t==='V'?0x9fb8a5:0x9c8060,a);if(t==='V'){g.fillRect(x+7,y+8,11,13);g.fillStyle(0xe4c28d,a);g.fillRect(x+9,y+3,7,7);}else if(t==='S'){g.fillRect(x+5,y+17,14,5);g.fillRect(x+9,y+5,6,13);g.fillStyle(0xb5efeb,a);g.fillRect(x+10,y+2,4,5);}else if(t==='W'){g.fillRect(x+2,y+8,20,11);g.fillStyle(0x282c31,a);g.fillRect(x+4,y+18,4,5);g.fillRect(x+16,y+18,4,5);}else{g.fillRect(x+4,y+15,16,6);g.fillRect(x+9,y+9,6,7);}}
    if(t==='='||t==='X'){
      const vertical=Boolean((this.gameModel?.areaAt?.(tx,ty)?.bridgeLayout?.forward??this.gameModel?.areaAt?.(tx,ty)?.riverForward??this.gameModel?.state.bridgeLayout?.forward)?.ry);
      g.fillStyle(0x79563b,a);g.fillRect(x,y,24,24);g.fillStyle(0xb18a57,a);
      for(let i=0;i<4;i++)if(vertical)g.fillRect(x+3,y+i*6,18,4);else g.fillRect(x+i*6,y+3,4,18);
      g.fillStyle(0xd7bb86,a);if(vertical){g.fillRect(x+2,y,2,24);g.fillRect(x+21,y,2,24);}else{g.fillRect(x,y+2,24,2);g.fillRect(x,y+21,24,2);}
      if(t==='X'){g.fillStyle(0x9f4b48,a);if(vertical){g.fillRect(x+3,y+5,18,3);g.fillRect(x+3,y+16,18,3);}else{g.fillRect(x+5,y+3,3,18);g.fillRect(x+16,y+3,3,18);}g.fillStyle(0xe3c480,a);g.fillRect(x+10,y+8,4,8);}
    }
    if(t==='~'||t===':'){g.fillStyle(0x4f7e87,a);g.fillRect(x+3,y+7,10,2);g.fillRect(x+12,y+17,8,2);}
    if(t===':'){g.fillStyle(0xa3a18a,a);g.fillRect(x+3,y+6,6,4);g.fillRect(x+13,y+14,7,4);g.fillStyle(0xd0c9a8,a);g.fillRect(x+4,y+6,4,1);}
    if(t===';'){g.fillStyle(0x92a271,a);g.fillRect(x+5,y+5,2,14);g.fillRect(x+11,y+2,2,18);g.fillRect(x+16,y+8,2,12);}
    if(t==='^'){g.fillStyle(0x777d76,a);g.fillTriangle(x+2,y+21,x+12,y+3,x+23,y+21);g.fillStyle(0xa5a998,a);g.fillTriangle(x+8,y+10,x+12,y+3,x+15,y+10);}
    if(t==='D'){g.fillStyle(0x858675,a);g.fillRect(x+2,y+3,20,21);g.fillStyle(0x0e171c,a);g.fillRect(x+6,y+7,12,17);g.fillStyle(0xb88a69,a);g.fillRect(x+2,y+3,20,3);}
    if(t==='M'){g.fillStyle(0x614d39,a);g.fillRect(x+2,y+15,20,8);g.fillStyle(0xc3a364,a);g.fillRect(x+1,y+2,22,5);g.fillStyle(0x824e5b,a);g.fillRect(x+2,y+3,7,3);g.fillRect(x+15,y+3,7,3);g.fillStyle(0x6ba9b0,a);g.fillRect(x+9,y+9,7,7);g.fillStyle(0xe2bf92,a);g.fillRect(x+10,y+6,5,5);g.fillStyle(0xe6cb6d,a);g.fillRect(x+4,y+17,4,3);}
    if(t==='L'){g.fillStyle(0x9b9b91,a);g.fillRect(x+3,y+3,6,20);g.fillRect(x+16,y+8,5,15);g.fillStyle(0xd0c5a0,a);g.fillRect(x+2,y+2,8,4);g.fillRect(x+15,y+7,7,3);g.fillStyle(0x525b58,a);g.fillRect(x+5,y+7,2,8);}
    if(t==='U'){g.fillStyle(0x8f6948,a);g.fillRect(x+3,y+10,3,14);g.fillRect(x+18,y+10,3,14);g.fillStyle(0xb89b6d,a);g.fillTriangle(x+1,y+11,x+12,y+2,x+23,y+11);g.fillStyle(0xe7c879,a);g.fillRect(x+10,y+13,4,6);}
    if(t==='R'){g.fillStyle(0x8c9384,a);g.fillRect(x+3,y+8,5,15);g.fillRect(x+16,y+3,5,20);g.fillRect(x+3,y+3,5,3);}
    if(t==='F'){g.fillStyle(0x756e60,a);g.fillEllipse(x+12,y+19,22,8);g.fillStyle(0x714b35,a);g.fillRect(x+5,y+16,14,4);g.fillStyle(0xe77c40,a);g.fillTriangle(x+5,y+18,x+12,y+3,x+19,y+18);g.fillStyle(0xffd88a,a);g.fillTriangle(x+9,y+18,x+13,y+10,x+16,y+18);}
    if(t==='C'){g.fillStyle(0xad8050,a);g.fillTriangle(x+1,y+22,x+11,y+2,x+21,y+22);g.fillStyle(0x3a3128,a);g.fillTriangle(x+7,y+22,x+11,y+9,x+16,y+22);g.fillStyle(0xffd180,a);g.fillRect(x+20,y+15,3,6);g.fillStyle(0xf18f53,a);g.fillRect(x+19,y+19,5,3);}
  }
  scenery(d,a){if(drawCampProp(this.paint,d,T,a))return;const g=this.paint,x=d.x*T,y=d.y*T;if(d.type==='banner'){g.fillStyle(0xc7ae76,a);g.fillRect(x+5,y+1,2,23);g.fillStyle(0x5486af,a);g.fillRect(x+7,y+2,13,15);g.fillStyle(0xf1d493,a);g.fillRect(x+12,y+5,3,8);g.fillRect(x+9,y+8,9,2);return;}if(d.type==='bones'){g.fillStyle(0xd6d0b9,a);g.fillRect(x+4,y+13,16,3);g.fillRect(x+6,y+9,3,11);g.fillEllipse(x+16,y+7,7,6);return;}if(d.type==='tracks'){g.fillStyle(0xcab78b,a*.7);for(const[dx,dy]of [[6,6],[12,11],[7,17]]){g.fillEllipse(x+dx,y+dy,4,6);g.fillRect(x+dx-2,y+dy-5,1,2);g.fillRect(x+dx+1,y+dy-5,1,2);}return;}g.fillStyle(d.type==='flowers'?0xbea273:d.type==='reeds'?0x9ca569:d.type==='log'?0x796047:0xa3a699,a);if(d.type==='log'){g.fillRect(x+2,y+14,20,5);g.fillStyle(0xb89a69,a);g.fillRect(x+2,y+14,3,5);}else if(d.type==='grave'){g.fillRect(x+9,y+7,6,13);g.fillRect(x+5,y+11,14,3);}else{g.fillRect(x+5,y+11,3,3);g.fillRect(x+14,y+17,4,2);g.fillRect(x+11,y+5,2,4);}}
  item(i){const g=this.paint,x=i.x*T,y=i.y*T;
    if(['rawMeat','rawRatMeat','cookedMeat','ratMeat'].includes(i.kind)){
      const raw=i.kind.startsWith('raw'),rat=['rawRatMeat','ratMeat'].includes(i.kind);
      g.fillStyle(0x0d171b,.8);g.fillEllipse(x+12,y+20,21,7);
      // Pale bone and a pink steak silhouette distinguish food from coffers.
      g.fillStyle(0xf6e6bd);g.fillRect(x+3,y+14,13,3);g.fillRect(x+2,y+12,4,6);
      g.fillStyle(raw?(rat?0xb86d83:0xe18c98):0xaf734d);g.fillEllipse(x+15,y+12,rat?12:16,14);
      g.fillStyle(raw?0xf6bac1:0xe3af71);g.fillRect(x+12,y+8,4,3);
      g.fillStyle(0xffefcf);g.fillRect(x+17,y+13,3,3);return;
    }
    if(i.kind==='bridgeMedicine'){g.fillStyle(0xb99869);g.fillRect(x+6,y+9,13,12);g.fillStyle(0x83b18a);g.fillRect(x+8,y+5,9,6);g.fillStyle(0xe6e3bd);g.fillRect(x+11,y+10,3,8);g.fillRect(x+8,y+13,9,3);return;}
    if(i.kind==='bones'){g.fillStyle(0xf3e3be);g.fillRect(x+5,y+12,14,4);g.fillRect(x+4,y+9,4,9);g.fillRect(x+17,y+9,4,9);return;}
    if(i.kind==='skeletonKey'){g.lineStyle(3,0xe4c679);g.strokeCircle(x+8,y+9,4);g.fillStyle(0xe4c679);g.fillRect(x+10,y+12,9,3);g.fillRect(x+16,y+14,3,4);return;}
    const colors={potion:0xf36a83,gold:0xf8cc68,weapon:0xd2e4e8,armor:0x829bb4,chest:0xb98043,amulet:0xb2e7cb,trophy:0xc7ba93,offhand:0xc5a678,stone:0xabb9b0};g.fillStyle(colors[i.kind]??0xb7c5dc);if(i.kind==='potion'){g.fillRect(x+9,y+9,7,10);g.fillStyle(0xe0e9d9);g.fillRect(x+11,y+5,3,5);}else if(i.kind==='weapon'){g.fillRect(x+11,y+4,3,15);g.fillRect(x+7,y+15,11,3);}else{g.fillRect(x+6,y+9,13,10);g.fillStyle(0xffe2a1);g.fillRect(x+11,y+11,3,5);}}
  portrait(kind,name='Traveler'){
    const player=this.model?.state?.player??this.gameModel?.state?.player;
    const textureKey=`portrait-${kind}-${name}-${kind==='player'?JSON.stringify(['weapon','armor','offhand','amulet','boots','ring1','ring2'].map(slot=>player?.[slot]?.name)):''}`;
    if(!this.textures.exists(textureKey)){
      const brush=this.make.graphics({x:0,y:0},false);
      if(kind==='merchant'||kind==='villager')drawPerson(brush,0,0,name,kind);
      else this.actor({...player,x:0,y:0,name},kind,brush);
      brush.generateTexture(textureKey,T,T);brush.destroy();
    }
    return this.textures.get(textureKey).getSourceImage().toDataURL();
  }
  actor(e,kind,g=this.paint){const x=e.x*T,y=e.y*T;g.fillStyle(0x000000,0.35);g.fillEllipse(x+12,y+21,19,6);
    if(kind==='bandit'||e.bridgeBandit){drawPerson(g,x,y,e.name,'bandit');return;}
    if(kind==='player'){drawAdventurer(g,x,y,e);return;}
    if(kind!=='player'&&drawCreature(g,x,y,kind)){drawMiniboss(g,x,y,e.name);return;}
    const colors={player:0x70c6c0,slime:0x8fbd67,skeleton:0xd6ccad,goblin:0xc67d57,boss:0xc56388,guardian:0xb76883,wolf:0xb8b7a6,boar:0x93775c,leech:0xa9b55c,rat:0xa2937a,beetle:0xa18b58,pondFrog:0x86bd72,frog:0x71ab6d,elite:0xc9a16c,goat:0xaea99b,ashling:0xd16a4f};g.fillStyle(colors[kind]);
    if(['wolf','boar','leech','rat','beetle','frog','pondFrog','elite','goat'].includes(kind)){g.fillRect(x+3,y+9,18,9);g.fillRect(x+3,y+17,4,5);g.fillRect(x+16,y+17,4,5);g.fillRect(x+15,y+5,7,7);g.fillStyle(0xe5db9f);g.fillRect(x+19,y+7,2,2);}else if(kind==='slime'){g.fillEllipse(x+12,y+15,19,14);}else{g.fillRect(x+6,y+9,13,11);g.fillRect(x+8,y+3,9,9);g.fillRect(x+6,y+19,4,4);g.fillRect(x+15,y+19,4,4);}
    g.fillStyle(0x15202b);g.fillRect(x+9,y+(kind==='slime'?13:6),2,2);g.fillRect(x+14,y+(kind==='slime'?13:6),2,2);
    if(kind==='player'){g.fillStyle(0xebc68e);g.fillRect(x+9,y+5,7,5);g.fillStyle(0xe0e6df);g.fillRect(x+20,y+8,2,12);g.fillStyle(0x513c55);g.fillRect(x+4,y+11,4,10);}
    if(kind==='boss'||kind==='guardian'){g.fillStyle(0xf6d48a);g.fillTriangle(x+5,y+5,x+7,y-2,x+10,y+5);g.fillTriangle(x+15,y+5,x+19,y-2,x+20,y+5);}
  }
}
