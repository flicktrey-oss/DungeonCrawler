// Original 24px creature icons: different silhouettes, faces and palettes rather
// than platform emoji fonts. The same drawing is enlarged in inspection cards.
export function drawCreature(g,x,y,kind){
 const b=(c,xx,yy,w,h)=>{g.fillStyle(c);g.fillRect(x+xx,y+yy,w,h);};
 const oval=(c,xx,yy,w,h)=>{g.fillStyle(c);g.fillEllipse(x+xx,y+yy,w,h);};
 const tri=(c,a,bx,cx,dy,ex,fy)=>{g.fillStyle(c);g.fillTriangle(x+a,y+bx,x+cx,y+dy,x+ex,y+fy);};
 const eye=(xx,yy)=>{b(0xf8eccb,xx,yy,4,4);b(0x16212b,xx+1,yy+1,2,3);};
 if(kind==='frog'||kind==='pondFrog'){
  const skin=kind==='frog'?0x4eaa80:0x86bc59;
  b(0x214b42,4,10,16,10);b(skin,6,8,12,12);b(skin,4,11,16,7);b(skin,2,18,7,3);b(skin,15,18,7,3);
  b(skin,4,4,7,8);b(skin,14,4,7,8);eye(6,5);eye(15,5);b(0xc9df8c,8,13,8,5);b(0x244f43,7,14,10,2);b(0xed91a8,11,15,4,2);return true;
 }
 if(kind==='beetle'){
  for(const yy of [9,14,19]){b(0x786340,2,yy,6,2);b(0x786340,17,yy,5,2);}
  b(0xd8bd73,6,2,2,6);b(0xd8bd73,16,2,2,6);b(0xf4d98c,4,1,4,2);b(0xf4d98c,16,1,4,2);
  oval(0x283b3f,12,14,16,18);oval(0x9c633b,9,15,7,13);oval(0xc58a48,15,15,7,13);b(0xf2c46b,7,10,3,3);b(0xf2c46b,14,17,3,3);b(0x20313a,11,8,2,14);
  b(0x344b47,7,5,10,5);eye(7,5);eye(14,5);return true;
 }
 if(kind==='goat'){
  b(0x958d74,4,9,16,11);b(0xe3d9b4,3,10,18,7);b(0xe3d9b4,5,7,14,14);b(0xf7edcf,7,5,10,13);
  b(0xb89a65,1,3,7,9);b(0xb89a65,16,3,7,9);b(0x4c4842,3,5,3,4);b(0x4c4842,18,5,3,4);b(0xdfbc7e,2,3,5,2);b(0xdfbc7e,17,3,5,2);
  b(0x70878a,4,12,3,6);b(0x70878a,17,12,3,6);b(0x3a4548,7,10,10,10);eye(7,11);eye(13,11);b(0x9c8f7b,10,16,4,3);b(0x2d373d,5,20,4,3);b(0x2d373d,15,20,4,3);return true;
 }
 if(kind==='rat'){
  b(0xb77f85,1,13,2,6);b(0xb77f85,1,17,6,2);b(0xb77f85,1,12,4,2);oval(0x83634c,11,16,15,10);
  b(0xaa8261,12,7,9,10);oval(0x977251,14,5,8,8);oval(0xdaaa98,14,5,4,4);tri(0xaa8261,17,8,23,13,17,17);
  eye(16,8);b(0xdf929b,22,12,2,3);b(0xf6e3bb,18,16,2,3);b(0xc5a07b,7,20,5,2);return true;
 }
 if(kind==='boar'||kind==='elite'){
  oval(kind==='elite'?0x9d693e:0x795543,12,13,20,16);tri(0xb28b5a,3,8,5,2,10,8);tri(0xb28b5a,14,8,19,2,21,9);
  b(0x3d3936,5,20,4,3);b(0x3d3936,15,20,4,3);eye(5,9);eye(15,9);b(0xca8d7b,7,14,10,5);b(0x563b39,9,15,2,2);b(0x563b39,13,15,2,2);
  const tusk=kind==='elite'?0xffd87e:0xe6d9b8;b(tusk,3,14,3,7);b(tusk,18,14,3,7);b(tusk,5,18,3,3);b(tusk,16,18,3,3);return true;
 }
 if(kind==='wolf'){
  tri(0x9eafb0,3,10,4,1,11,8);tri(0x9eafb0,13,8,20,1,21,10);b(0x8d9e9e,4,8,16,12);b(0xd2d5c3,7,13,10,8);eye(5,8);eye(15,8);b(0x253842,10,14,4,3);b(0xf5e9cf,7,17,2,4);b(0xf5e9cf,15,17,2,4);return true;
 }
 if(kind==='leech'){
  b(0x5a7046,7,12,12,9);b(0x91ad65,5,7,8,12);b(0xbed184,6,6,6,7);b(0x344d43,6,5,8,7);b(0x8e566b,8,7,4,3);b(0xd1c49a,9,7,2,2);b(0x4f6945,12,14,2,7);b(0x4f6945,16,14,2,7);return true;
 }
 if(kind==='slime'){
  b(0x3e8f83,3,12,18,9);b(0x65b898,5,7,14,14);b(0x8dd8b5,8,5,8,7);eye(6,12);eye(14,12);b(0x2d6b69,10,18,4,2);b(0xb8e6bb,8,7,3,3);return true;
 }
 if(kind==='skeleton'){
  b(0xdcd5b7,5,3,14,11);b(0xf4ebcb,7,1,10,12);b(0x26353d,7,6,4,4);b(0x26353d,14,6,4,4);b(0xdcd5b7,8,13,8,3);b(0x26353d,10,13,1,2);b(0x26353d,14,13,1,2);
  b(0xdcd5b7,11,16,2,7);b(0xdcd5b7,7,17,10,2);b(0xdcd5b7,6,21,5,2);b(0xdcd5b7,14,21,5,2);return true;
 }
 if(kind==='goblin'){
  tri(0xa37e48,1,7,9,6,6,14);tri(0xa37e48,15,6,23,7,18,14);b(0xa6b45d,6,5,12,11);b(0x6c7048,7,16,10,6);eye(7,7);eye(14,7);b(0xe9d8ad,8,14,2,3);b(0x4a3436,11,13,4,2);return true;
 }
 if(kind==='ashling'){
  tri(0xe49443,3,20,6,6,10,17);tri(0xf9b957,7,20,12,0,18,20);tri(0xcc6047,13,21,19,6,22,21);b(0x743e4c,7,11,10,10);b(0xfbe89b,8,13,3,3);b(0xfbe89b,14,13,3,3);b(0xee9b55,10,19,4,3);return true;
 }
 if(kind==='guardian'||kind==='boss'){
  const armor=kind==='boss'?0xa84f68:0x666c9a;b(armor,4,9,16,12);b(armor,7,4,10,12);b(0x303147,8,9,8,7);b(0xf3d475,8,10,3,2);b(0xf3d475,14,10,3,2);b(0xdbc18b,10,5,4,3);tri(0xe1b96e,3,9,3,1,9,7);tri(0xe1b96e,15,7,21,1,21,9);b(0xc1a57c,2,15,2,8);b(0x41445f,6,20,4,3);b(0x41445f,15,20,4,3);if(kind==='boss')b(0xf3d475,11,0,2,6);return true;
 }
 return false;
}
