import { connect } from '@rarefriends/friendsdk';
import { boot } from './heist.generated.js';
import './heist.generated.css';
import './sdk.generated.css';

const root=document.getElementById('root')!;
root.textContent='Loading your Friend and server progress…';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const offers=[['buyHatchwork','Hatchwork',250,'hatchwork','lilac'],['buySignalPaper','Signal Paper',250,'signalPaper','citrus'],['buyGoldenTrail','Golden Trail',500,'goldenTrail','trail'],['buyBlackArchive','The Black Archive',2500,'blackArchive','archive-pack']];
async function main(){
 const game=await connect();if(!game.art||game.art.frames.length!==64)throw Error('The host could not supply this Friend’s original frames.');
 const art=game.art,clips={};for(const [j,f]of ['down','up','left','right'].entries())for(const [i,a]of ['idle','walk'].entries())clips[a+'-'+f]=Array.from({length:8},(_,n)=>i*32+j*8+n);
 const hero={tokenId:game.friend.id,...art,frames:art.frames.map(f=>'0x'+f.replace(/^0x/,'')),family:art.familyName,clips,generation:game.friend.generation};
 let state:any=await game.call('load'),holdings=await game.holdings(),ui:any,dailyAttempt:any=null,queue=Promise.resolve(),busy=false;
 const owned:string[]=[...state.items];
 const notice=(message:string)=>{let n=document.getElementById('sdkNotice');if(!n){n=document.createElement('div');n.id='sdkNotice';n.className='rh-notice';n.setAttribute('role','status');root.prepend(n);}n.textContent=message;};
 const enqueue=fn=>{queue=queue.then(fn).catch(e=>notice(e.message));return queue;};
 function adoptProgress(p){Object.assign(ui.save,p);theme();}
 function theme(){const t=ui.save.theme;document.body.style.backgroundImage=t==='lilac'?'repeating-linear-gradient(45deg,#000 0,#000 1px,#fff 1px,#fff 5px)':t==='citrus'?'radial-gradient(#ccff00 1px,#fff 1px)':'';}
 async function refresh(render=false){state=await game.call('load');holdings=await game.holdings();owned.splice(0,owned.length,...state.items);
  const extra=globalThis.HEIST_CUTAWAY_LEVELS.filter(l=>l.id.startsWith('archive-'));
  for(const l of extra){const i=ui.jobs.findIndex(x=>x.id===l.id);if(owned.includes('archive-pack')&&i<0)ui.jobs.push(globalThis.CutawayRules.normalize(l));else if(!owned.includes('archive-pack')&&i>=0)ui.jobs.splice(i,1);}
  if(render&&ui.view().screen==='catalog')globalThis.RareHeistSDK.home();
 }
 async function transact(action){
  if(busy)return;const a=game.actions[action];if(!a?.enabled){notice(a?.reason||'This paid action is not yet available.');return;}
  busy=true;try{const tx=await game.transact(action);if(tx.status==='settled'){notice('Payment settled.');await game.acknowledge(tx.id);}else notice('Payment '+tx.status+'. Your result will arrive through the platform.');await refresh(true);}finally{busy=false;}
 }
 async function startDaily(){
  const d:any=await game.call('dailyStart');dailyAttempt={day:d.day,id:d.attempt.id};
  ui.start(d.level,{type:'sdkDaily',mode:'ghost'});notice('DAILY '+d.day+' / TRY '+d.attempt.id+' OF 3 / SERVER CLOCK RUNNING');
 }
 async function retryDaily(){
  if(dailyAttempt){const v=ui.view();await game.call('dailySubmit',{day:dailyAttempt.day,attempt:dailyAttempt.id,actions:v.game?.actions??[]});dailyAttempt=null;}
  await startDaily();
 }
 boot(root,{friendId:game.friend.id,hero,mode:game.mode==='live'?'chain':'preview',progress:state.progress,items:owned,paused:()=>game.paused,
  settings:value=>enqueue(async()=>{const p=await game.call('settings',value);if(ui)Object.assign(ui.save,{sound:p.sound,reduced:p.reduced,theme:p.theme,trail:p.trail});}),
  record:value=>enqueue(async()=>{
   if(value.type==='sdkDaily'){
    if(!dailyAttempt)return;const a=dailyAttempt;dailyAttempt=null;
    const r:any=await game.call('dailySubmit',{day:a.day,attempt:a.id,actions:value.actions});notice((r.accepted?'RANKED RUN ACCEPTED':'ATTEMPT SPENT')+' / '+r.turns+' TURNS / '+r.ms+' MS / '+r.myEntry.attemptsLeft+' TRIES LEFT');return;
   }
   if(value.type==='sdkLast'||value.type==='sdkFortify'){
    if(!value.practice){const r:any=await game.call('lastSubmit',{actions:value.actions,fortify:value.type==='sdkFortify'});notice(r.claimed?'Shared vault claimed by Friend #'+game.friend.id:'Run submitted');}return;
   }
   if(value.levelId.startsWith('daily-')||value.practice)return;
   const r:any=await game.call('complete',value);adoptProgress(r.progress);notice('Progress saved by the game server.');
  }),retryDaily:()=>enqueue(retryDaily),
  attach:api=>{ui=api;if(owned.includes('archive-pack'))ui.jobs.push(...globalThis.HEIST_CUTAWAY_LEVELS.filter(l=>l.id.startsWith('archive-')).map(globalThis.CutawayRules.normalize));},
  extendLobby:(page,api)=>{
   ui=api;const box=document.createElement('section');box.className='rh-extras';
   const heading=t=>{const h=document.createElement('h3');h.textContent=t;box.append(h);};
   const text=t=>{const p=document.createElement('p');p.className='note';p.textContent=t;box.append(p);};
   const button=(label,fn,parent=box)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{if(!game.paused)enqueue(fn);};parent.append(b);return b;};
   heading('WATCH SOLUTION');text('Watch a stored clean route without changing your progress.');
   const select=document.createElement('select');select.id='sdkSolution';select.setAttribute('aria-label','Solution level');
   for(const l of [...ui.lessons,...ui.jobs]){const o=document.createElement('option');o.value=l.id;o.textContent=l.name;select.append(o);}box.append(select);
   button('WATCH SOLUTION',()=>{const l=[...ui.lessons,...ui.jobs].find(x=>x.id===select.value),s=globalThis.HEIST_SOLUTIONS[l.id];if(s)ui.watch(l,s.actions);});
   heading('DAILY HEIST / '+state.daily.day);
   text('150 RF = 3 attempts. 80% winner / 10% burn / 10% Friend rewards. Fewest turns, then server time. Closes 00:00 UTC. Refund with fewer than two entrants or no clean win.');
   text(state.daily.entries+' entrants / '+state.daily.pot+' RF pot'+(state.daily.myEntry?' / '+state.daily.myEntry.attemptsLeft+' tries left':''));
   if(state.daily.myEntry){button(state.daily.myEntry.active?'RESUME DAILY ATTEMPT':'PLAY DAILY',startDaily);if(state.daily.myEntry.solvable)text('Solvable in '+state.daily.myEntry.solvable.turns+' turns. Solution unlocks at 00:00 UTC.');}
   else{const a=game.actions.enterDaily;button('ENTER DAILY / 150 RF'+(!a?.enabled?' / NOT YET AVAILABLE':''),()=>transact('enterDaily'));}
   if(state.daily.leaders.length)text(state.daily.leaders.map((e,i)=>(i+1)+'. Friend #'+e.friendId+' / '+e.turns+' turns / '+e.ms+' ms').join(' · '));
   const archive=document.createElement('details'),summary=document.createElement('summary');summary.textContent='DAILY ARCHIVE / FREE PRACTICE + SOLUTIONS';archive.append(summary);box.append(archive);
   for(const day of state.archive){button('PRACTICE / '+day,async()=>{const a:any=await game.call('dailyArchive',{day});ui.start(a.level,{type:'solo',practice:true});},archive);button('WATCH SOLUTION / '+day,async()=>{const a:any=await game.call('dailyArchive',{day});ui.watch(a.level,a.actions);},archive);}
   heading('LAST HEIST / FREE SHARED CHALLENGE');
   text('Revision '+state.last.revision+' / '+(state.last.holder?'held by Friend #'+state.last.holder:'unclaimed')+'. Clear it cleanly to hold it, then add one wall and prove the new route. No RF stakes.');
   button('PLAY LAST HEIST',async()=>{const r:any=await game.call('lastStart');ui.start(r.level,{type:'sdkLast',mode:'ghost'});});
   if(state.last.holder===game.friend.id&&!state.last.fortified)button('FORTIFY / ADD ONE WALL',()=>{ui.modal('ONE WALL / PROVE THE WAY OUT','<p>Choose an empty floor cell away from ladders. Clear the changed vault before it becomes shared.</p><label>COLUMN <input id="lastX" type="number" min="1" value="3"></label><label>MAP ROW <input id="lastY" type="number" min="1" step="2" value="1"></label><button id="lastProve">PLAY TO PROVE</button>');document.getElementById('lastProve').onclick=()=>enqueue(async()=>{const r:any=await game.call('lastPrepare',{x:Number((document.getElementById('lastX')as HTMLInputElement).value),y:Number((document.getElementById('lastY')as HTMLInputElement).value)});(document.getElementById('modal')as HTMLDialogElement).close();ui.start(r.level,{type:'sdkFortify',mode:'ghost'});});});
   heading('SHOP / COSMETICS + THREE EXTRA HEISTS');
   for(const [action,label,price,item,id]of offers){
    if(holdings.items[item])button(label+' / OWNED'+(id==='lilac'||id==='citrus'?' / APPLY':''),async()=>{if(id==='lilac'||id==='citrus'){ui.save.theme=id;await game.call('settings',{sound:ui.save.sound,reduced:ui.save.reduced,theme:id,trail:ui.save.trail});theme();notice(label+' applied.');}else if(id==='trail'){ui.save.trail=!ui.save.trail;await game.call('settings',{sound:ui.save.sound,reduced:ui.save.reduced,theme:ui.save.theme,trail:ui.save.trail});notice(ui.save.trail?'Golden Trail on':'Golden Trail off');}});
    else button(label+' / '+price+' RF'+(!game.actions[action]?.enabled?' / NOT YET AVAILABLE':''),()=>transact(action));
   }
   button('PLAIN PAPER',async()=>{ui.save.theme='plain';theme();await game.call('settings',{sound:ui.save.sound,reduced:ui.save.reduced,theme:'plain',trail:ui.save.trail});});
   page.querySelector('.rh-lists').append(box);
  }
 });
 theme();
 game.on('transaction',tx=>{enqueue(async()=>{if(tx.status==='settled'&&!tx.seen){notice(tx.action+' settled.');await game.acknowledge(tx.id);}await refresh(true);});});
 game.on('pause',paused=>{document.querySelectorAll('audio,video').forEach((e:HTMLMediaElement)=>{if(paused)e.pause();});});
 game.on('closed',()=>{root.innerHTML='<p role="status">This Friend session ended. Select your Friend on the platform to continue.</p>';});
 for(const tx of await game.transactions())if(tx.status==='settled'&&!tx.seen){notice(tx.action+' settled while away.');await game.acknowledge(tx.id);}
 // Refresh shared challenges on return to the menu, without replacing an active run.
 document.getElementById('home').addEventListener('click',()=>enqueue(()=>refresh(true)));
 document.getElementById('back').addEventListener('click',()=>enqueue(()=>refresh(true)));
}
main().catch(e=>{root.innerHTML='<p role="alert">'+esc(e.message)+'</p><button id="sdkRetry">RETRY</button>';document.getElementById('sdkRetry').onclick=()=>location.reload();});
