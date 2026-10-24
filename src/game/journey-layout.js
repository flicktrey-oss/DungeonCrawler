export const JOURNEY_LANDMARKS={
 tower:{name:'The Fallen Watchtower',tile:'L',description:'An old lookout overlooks the northern road. Scout the next landmarks, or take the last healing tonic from its locker.'},
 causeway:{name:'The Reedstone Causeway',tile:'=',description:'Old stone markers rise from the marsh. Help a wounded Aldren across, or recover a stranded traveler’s purse.'},
 shelter:{name:'The Last Lantern Shelter',tile:'U',description:'A roof and a cold hearth stand on the final road to Northwatch. Rest together, or take the remaining travel rations.'}
};
export function landmarkPlan(road,biomeFor){
 const candidates=road.slice(1).filter(p=>p.rx!==0||p.ry!==-6),tower=candidates[0],shelter=candidates.at(-1);
 const causeway=candidates.find(p=>p!==tower&&p!==shelter&&biomeFor(p)==='marsh');
 return [['tower',tower],['causeway',causeway],['shelter',shelter]].filter(([,p])=>p).map(([kind,p])=>({...p,kind,...JOURNEY_LANDMARKS[kind],x:20,y:15}));
}
export function buildJourneyLandmark(map,landmark,preserveBridges=false){
 if(!landmark)return;
 const {x,y,kind,tile}=landmark;
 // A clearing with a walkable center keeps all four trail exits connected.
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(!preserveBridges||map[y+dy][x+dx]!=='=')map[y+dy][x+dx]=',';
 if(kind==='causeway')for(let dx=-1;dx<=1;dx++){map[y-1][x+dx]='~';map[y+1][x+dx]='~';map[y][x+dx]='=';}
 map[y][x]=tile;
}
