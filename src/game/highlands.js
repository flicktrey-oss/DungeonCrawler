import {trailDistance} from './marsh.js';
export function highlandSpawns(spot,rng){
 return Array.from({length:7},(_,i)=>{
  const p=spot(i<4?{trail:true}:{deep:true}),foothill=i<4||trailDistance(p)<6,kind=rng.pick(['goat','wolf']);
  return {...p,kind,foothill,danger:foothill?3:6,zone:foothill?'highland trail':'highland ridge',...(!foothill&&trailDistance(p)>=4?{territory:{...p,radius:3,name:'Guarded highland ridge'}}:{})};
 });
}
