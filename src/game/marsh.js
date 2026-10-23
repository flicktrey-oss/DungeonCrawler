// Coordinate-aligned main trails are always carved by world generation.
export const trailDistance=p=>Math.min(Math.abs(p.x-20),Math.abs(p.y-15));
export function marshSpawns(spot,rng){
 return Array.from({length:7},(_,i)=>{
  const point=spot(i<4?{trail:true}:{deep:true});
  const deep=i>=4&&trailDistance(point)>=6;
  return {...point,kind:deep?rng.pick(['frog','leech']):'pondFrog',danger:deep?3:1,zone:deep?'deep marsh':'marsh fringe',...(deep?{territory:{...point,radius:3,name:'Deep marsh pool'}}:{})};
 });
}
