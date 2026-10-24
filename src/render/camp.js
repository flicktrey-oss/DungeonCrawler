// Original pixel-art settlement props. No downloaded assets or timed effects.
export function drawCampProp(g,d,t,a){
 const x=d.x*t,y=d.y*t,w=(d.w??1)*t,h=(d.h??1)*t;
 const rect=(c,dx,dy,rw,rh)=>{g.fillStyle(c,a);g.fillRect(x+dx,y+dy,rw,rh);};
 const triangle=(c,ax,ay,bx,by,cx,cy)=>{g.fillStyle(c,a);g.fillTriangle(x+ax,y+ay,x+bx,y+by,x+cx,y+cy);};
 if(d.type==='teepee'){
  g.fillStyle(0x182820,a*.55);g.fillEllipse(x+w/2,y+h-5,w,12);
  rect(0x755d41,18,0,2,15);rect(0x755d41,27,1,2,13);
  triangle(d.color??0xb99c73,2,h-6,w/2,5,w-2,h-6);
  triangle(0x8e7058,w/2,5,w-2,h-6,w/2,h-6);
  triangle(0x28302d,16,h-6,w/2,23,31,h-6);
  rect(0xd4bd8c,7,h-13,8,3);rect(0xd4bd8c,34,h-13,6,3);rect(0x5e7972,14,22,5,3);rect(0x5e7972,31,22,4,3);return true;
 }
 if(d.type==='forge'){
  rect(0x454c4a,1,10,23,36);rect(0x8d9487,2,10,21,4);rect(0x66716c,3,16,19,12);rect(0x353a39,6,30,13,14);rect(0xb85e36,8,33,9,9);triangle(0xf3c26d,8,41,13,30,17,41);rect(0x777f78,4,1,13,9);rect(0x9ca498,4,1,13,3);
  rect(0x78583d,29,31,10,15);rect(0x464e55,25,25,22,6);rect(0xb0b8b5,26,23,21,3);triangle(0x858f93,25,25,19,24,25,29);rect(0x6b5039,35,14,3,10);rect(0xb6b7ad,31,12,12,5);rect(0x9a6843,2,44,44,3);return true;
 }
 if(d.type==='traderCart'){
  rect(0x302f2c,5,36,8,11);rect(0x302f2c,35,36,8,11);rect(0xb29561,7,38,4,6);rect(0xb29561,37,38,4,6);
  rect(0x755239,2,22,44,17);rect(0xb58b59,4,24,40,3);rect(0xb58b59,5,32,38,2);rect(0x9b7950,4,9,3,15);rect(0x9b7950,40,9,3,15);
  rect(0xd1b27d,1,4,46,8);for(let n=0;n<4;n++)rect(n%2?0x8b5962:0xc4b899,2+n*11,5,10,9);
  rect(0xaeb889,8,16,10,7);rect(0xc39863,21,16,10,8);rect(0x73989a,34,15,5,10);rect(0xe2ce93,35,13,3,3);rect(0x8d6843,44,34,4,3);return true;
 }
 if(d.type==='well'){g.fillStyle(0x7f8b83,a);g.fillEllipse(x+12,y+15,22,16);g.fillStyle(0x28434a,a);g.fillEllipse(x+12,y+12,15,8);rect(0xb8b29b,2,10,3,8);rect(0xb8b29b,19,10,3,8);rect(0x805e40,4,2,2,12);rect(0x805e40,18,2,2,12);rect(0xbb9b6d,3,2,18,3);return true;}
 if(d.type==='barrels'){for(const[dx,dy]of [[2,5],[12,10]]){rect(0x8b653f,dx,dy,10,13);rect(0xbbb094,dx,dy+3,10,2);rect(0xbbb094,dx,dy+9,10,2);rect(0xb28a58,dx+1,dy,8,2);}return true;}
 if(d.type==='bench'){rect(0x684e38,4,13,3,9);rect(0x684e38,18,13,3,9);rect(0xb08b5b,2,9,21,5);rect(0xc3a16d,2,9,21,1);return true;}
 if(d.type==='firewood'){for(let n=0;n<3;n++){rect(0x6c4c32,3+n*2,9+n*4,17,3);rect(0xc29b65,3+n*2,9+n*4,3,3);}return true;}
 if(d.type==='lanternPost'){rect(0x795c40,11,5,3,19);rect(0x795c40,6,4,12,2);rect(0x3e4b47,5,7,7,10);rect(0xf0ca77,7,9,3,6);return true;}
 if(d.type==='signpost'){rect(0x79583b,11,5,3,18);rect(0xc5a470,2,6,19,5);triangle(0xc5a470,21,6,24,8,21,11);rect(0x65533f,6,8,10,1);return true;}
 if(d.type==='washing'){rect(0x76583e,1,3,2,20);rect(0x76583e,21,3,2,20);rect(0xc9bb93,2,5,20,1);rect(0x8da89c,5,6,6,10);rect(0xc6a181,13,6,6,8);return true;}
 return false;
}

export function drawCampGround(g,t,x,y,a,tx,ty){
 if(!['.','P','V','M','C','F'].includes(t))return;
 g.fillStyle(0x70614b,a);g.fillRect(x,y,24,24);
 const n=(tx*17+ty*29)%23;
 g.fillStyle(0x806d52,a);g.fillRect(x+3+n%12,y+4+n%9,3,1);g.fillRect(x+16,y+18,2,1);
 g.fillStyle(0x635640,a);g.fillRect(x+5,y+17-n%6,2,1);
 // Worn stepping stones define the crossroads; grass breaks up the side plots.
 if(tx===20||ty===15){g.fillStyle(0x918a73,a);g.fillRect(x+8,y+7,7,4);g.fillStyle(0x827b65,a);g.fillRect(x+5,y+15,5,3);}
 else if(t==='.'&&Math.abs(tx-20)+Math.abs(ty-15)>3&&n%4===0){g.fillStyle(0x506349,a);g.fillRect(x+3,y+6,17,12);g.fillRect(x+7,y+3,10,17);g.fillStyle(0x7a8458,a);g.fillRect(x+8,y+9,2,4);g.fillRect(x+16,y+16,2,3);}
}
