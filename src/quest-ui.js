import {princeProgress} from './game/story.js';
import {questProgress} from './game/quests.js';
import {BIOMES,biomeAt} from './game/world.js';
export function mountQuestJournal(container,game,onTrack=()=>{},onPrince=()=>{}){
 container.replaceChildren();
 if(game.story){const section=document.createElement('section'),title=document.createElement('h3'),text=document.createElement('p');section.className='journal-quest';section.dataset.questId='royal-escort';title.textContent='Main story · The Road to Northwatch';text.textContent=princeProgress(game);section.append(title,text);if(game.story.accepted&&!game.story.complete){const track=document.createElement('button');track.textContent=game.trackedQuest===game.story.id?'Stop tracking':'Track quest';track.setAttribute('aria-label',track.textContent+' '+game.story.title);track.onclick=()=>{game.trackedQuest=game.trackedQuest===game.story.id?null:game.story.id;mountQuestJournal(container,game,onTrack,onPrince);onTrack();};section.append(track);}if(game.atPrince()&&!game.story.complete){const b=document.createElement('button');b.textContent='Speak to Prince Aldren';b.onclick=onPrince;section.append(b);}container.append(section);}
 const quests=[...game.quests.values()].filter(q=>q.accepted&&q.kind!=='escort');
 if(!quests.length){const p=document.createElement('p');p.textContent='No accepted side quests. Speak to Trailwarden Iona west of the campfire, or find travelers in the forest and marsh.';container.append(p);}
 for(const q of quests){
 const section=document.createElement('section');section.className='journal-quest';section.dataset.questId=q.id;
 const title=document.createElement('h3');title.textContent=(q.claimed?'✓ ':game.trackedQuest===q.id?'◆ ':'')+q.title;
 const goal=document.createElement('p');goal.textContent=q.claimed&&q.kind!=='bridge'?'Reward claimed.':questProgress(q);
 const where=document.createElement('p');where.textContent=`Objective: ${BIOMES[biomeAt(q.region.rx,q.region.ry,game.state.seed)].name} (${q.region.rx}, ${q.region.ry}) · recommended level ${BIOMES[biomeAt(q.region.rx,q.region.ry,game.state.seed)].recommended}`;
 const giver=document.createElement('p');giver.textContent=q.kind==='bridge'&&q.claimed?'The direct crossing stays open for this run.':`Return to ${q.giver} in region (${q.giverRegion.rx}, ${q.giverRegion.ry}).`;
 section.append(title,goal,where,giver);
 if(!q.claimed){const button=document.createElement('button');button.textContent=game.trackedQuest===q.id?'Stop tracking':'Track quest';button.setAttribute('aria-label',button.textContent+' '+q.title);button.onclick=()=>{game.trackedQuest=game.trackedQuest===q.id?null:q.id;mountQuestJournal(container,game,onTrack,onPrince);onTrack();};section.append(button);}
 container.append(section);
 }
 for(const b of game.bounties??[]){if(!b.accepted)continue;const section=document.createElement('section'),h=document.createElement('h3'),p=document.createElement('p');h.textContent='Bounty · '+b.title;p.textContent=b.claimed?'Reward claimed.':`${Math.min(b.count,Math.max(0,(game.killCounts[b.kind]??0)-b.start))}/${b.count} defeated. Return to the board in Northwatch (0, -6).`;section.append(h,p);container.append(section);}
 const available=game.state.encounters.filter(e=>e.type==='villager'&&e.quest&&!e.quest.accepted).length;
 if(available){const p=document.createElement('p');p.textContent=`${available} local quest offer${available===1?'':'s'} available. Discover the people marked ? on your explored minimap.`;container.append(p);}
}
