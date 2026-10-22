import {questProgress} from './game/quests.js';
import {BIOMES,biomeAt} from './game/world.js';
export function mountQuestJournal(container,game,onTrack=()=>{}){
 container.replaceChildren();
 const quests=[...game.quests.values()].filter(q=>q.accepted);
 if(!quests.length){const p=document.createElement('p');p.textContent='No accepted quests. Speak to Trailwarden Iona west of the campfire, or find travelers in the forest and marsh.';container.append(p);}
 for(const q of quests){
 const section=document.createElement('section');section.className='journal-quest';section.dataset.questId=q.id;
 const title=document.createElement('h3');title.textContent=(q.claimed?'✓ ':game.trackedQuest===q.id?'◆ ':'')+q.title;
 const goal=document.createElement('p');goal.textContent=q.claimed?'Reward claimed.':questProgress(q);
 const where=document.createElement('p');where.textContent=`Objective: ${BIOMES[biomeAt(q.region.rx,q.region.ry)].name} (${q.region.rx}, ${q.region.ry}) · recommended level ${BIOMES[biomeAt(q.region.rx,q.region.ry)].recommended}`;
 const giver=document.createElement('p');giver.textContent=`Return to ${q.giver} in region (${q.giverRegion.rx}, ${q.giverRegion.ry}).`;
 section.append(title,goal,where,giver);
 if(!q.claimed){const button=document.createElement('button');button.textContent=game.trackedQuest===q.id?'Stop tracking':'Track quest';button.setAttribute('aria-label',button.textContent+' '+q.title);button.onclick=()=>{game.trackedQuest=game.trackedQuest===q.id?null:q.id;mountQuestJournal(container,game,onTrack);onTrack();};section.append(button);}
 container.append(section);
 }
 const available=game.state.encounters.filter(e=>e.type==='villager'&&e.quest&&!e.quest.accepted).length;
 if(available){const p=document.createElement('p');p.textContent=`${available} local quest offer${available===1?'':'s'} available. Discover the people marked ? on your explored minimap.`;container.append(p);}
}
