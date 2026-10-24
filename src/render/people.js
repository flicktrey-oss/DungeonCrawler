// Original modular adventurer-like people. Names seed hair, skin and clothing.
export function personStyle(name='Traveler'){let h=0;for(const c of name)h=(h*31+c.charCodeAt(0))>>>0;return {coat:[0x75966c,0x927baf,0xad745f,0x6d9ea3,0xb19961][h%5],skin:[0xe4b88b,0xb98260,0x93674f,0xf1ccaa][(h>>>3)%4],hair:[0x453a32,0x865738,0xc4b6a1,0x2e343a][(h>>>5)%4],hat:(h>>>7)%3};}
export function drawPerson(g,x,y,name,role='traveler'){
 const p=personStyle(name),b=(c,xx,yy,w,h)=>{g.fillStyle(c);g.fillRect(x+xx,y+yy,w,h);};
 b(0x18252d,6,20,5,4);b(0x18252d,14,20,5,4);b(p.coat,5,10,15,11);b(0xd4c5a1,10,11,5,7);b(0x68513c,5,18,15,2);
 b(p.skin,3,12,3,7);b(p.skin,20,12,3,7);b(p.skin,8,3,10,9);b(p.hair,7,2,12,4);b(p.hair,7,4,3,6);b(0x233139,11,7,2,2);b(0x233139,16,7,2,2);
 if(role==='merchant'||p.hat===1){b(p.coat,5,3,17,2);b(p.coat,9,0,9,3);}
 if(name.includes('Warden')||name.includes('Iona')){b(0xa5b3af,17,11,5,8);b(0xded7b0,22,8,2,15);}
 if(name.includes('Bram')){b(0x634b3e,6,12,13,9);b(0xb7bdc3,1,11,6,4);b(0x805a3c,3,14,2,8);b(0xb9afa4,10,9,7,4);}
 if(name.includes('Grave')){b(0x777a87,7,1,13,4);b(0xb9b4a8,9,4,7,2);b(0x806345,1,8,2,15);b(0xabb8bd,0,18,5,5);}
 if(name.includes('Fen')){b(0xd3c595,2,13,5,7);b(0x728d69,3,14,3,2);}
 if(name.includes('Elara')){b(0xe6c878,9,11,8,2);b(0x82b4cf,12,13,3,4);}
 if(name.includes('Nessa')){b(0x99bf7d,2,10,3,11);b(0xd3b5dd,1,8,5,4);}
 if(role==='bandit'||name.includes('Willow Band')){b(0x6e7366,7,1,13,4);b(0x4c474b,8,8,10,3);b(0xc9b792,21,9,2,13);}
 if(role==='merchant'){b(0xb68951,19,15,5,7);b(0xe1c376,20,17,2,2);}
}
