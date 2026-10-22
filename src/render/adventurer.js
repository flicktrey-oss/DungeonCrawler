// One original pixel silhouette shared by the world, HUD and equipment portrait.
export function adventurerPixels(p={}){
 const pixels=[],rect=(x,y,w,h,color,slot)=>pixels.push({x,y,w,h,color,slot});
 rect(7,10,11,10,p.armor?'#71899b':'#786451','armor');rect(7,18,4,4,'#4c4540');rect(14,18,4,4,'#4c4540');
 rect(5,11,3,8,'#c39c77');rect(18,11,3,8,'#c39c77');rect(8,3,9,8,'#d5ae83');rect(7,2,11,3,'#584638');rect(9,6,2,2,'#20252c');rect(14,6,2,2,'#20252c');
 if(!p.armor){rect(8,13,3,3,'#aa9171');rect(13,17,3,2,'#574937');}else {rect(8,11,9,2,'#acbac1','armor');rect(12,13,1,6,'#485f70','armor');}
 if(p.boots){const c='#'+(p.boots.appearance??0x8a6847).toString(16).padStart(6,'0');rect(6,20,6,3,c,'boots');rect(14,20,5,3,c,'boots');}
 if(p.weapon){rect(21,7,1,15,'#a17b51','weapon');if(p.weapon.weaponType==='spear')rect(20,2,3,6,'#d3e2df','weapon');else if(p.weapon.weaponType==='axe')rect(18,7,5,4,'#b7c5c7','weapon');else {rect(20,5,2,13,'#d3e2df','weapon');rect(18,17,6,1,'#d1b16b','weapon');}}
 if(p.offhand){const c=p.offhand.relic?'#8fe2cb':'#a18c63';rect(2,12,p.offhand.relic?3:5,p.offhand.relic?5:8,c,'offhand');rect(3,14,1,3,'#e4d9aa','offhand');}
 if(p.amulet){rect(10,10,5,1,'#dfc77c','amulet');rect(12,11,2,2,'#91e1c4','amulet');}
 if(p.ring1)rect(5,17,2,1,'#f3d377','ring1');if(p.ring2)rect(19,17,2,1,'#a6c9ff','ring2');
 return pixels;
}
export function adventurerSvg(p){
 const seen=new Set();
 return '<svg viewBox="0 0 24 26" role="img" aria-label="Your equipped adventurer" shape-rendering="crispEdges">'+adventurerPixels(p).map(r=>{
 const marker=r.slot&&p[r.slot]&&!seen.has(r.slot);seen.add(r.slot);
 return `<rect ${marker?'data-'+r.slot+'-icon=""':''} x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.color}"/>`;
 }).join('')+'</svg>';
}
export function drawAdventurer(g,x,y,p){for(const r of adventurerPixels(p)){g.fillStyle(parseInt(r.color.slice(1),16));g.fillRect(x+r.x,y+r.y,r.w,r.h);}}
