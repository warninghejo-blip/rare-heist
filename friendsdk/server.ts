import { defineGame, GameError, check, utcDay } from '@rarefriends/friendsdk/server';
import { engine as E, cutaway as C, plans, feel as F, daily, dailySolutions } from './rules.generated.js';

const epoch=Date.parse('2026-10-08T00:00:00Z'), DAY=86400000;
const official=new Map(plans.map(l=>[l.id,C.normalize(l)]));
const initial=()=>({v:1,playfeelVersion:1,done:[],mastery:{},best:{},sound:false,reduced:false,theme:'plain',trail:true});
const progress=ctx=>ctx.data.get('progress1')??initial();
const itemIds={hatchwork:'lilac',signalPaper:'citrus',goldenTrail:'trail',blackArchive:'archive-pack'};
const items=ctx=>Object.entries(ctx.items()).filter(([,n])=>Number(n)>0).map(([id])=>itemIds[id]).filter(Boolean);
function actions(input){if(!Array.isArray(input)||input.length>3000||input.some(a=>!['N','E','S','W','WAIT','VENT','LIGHT','EMP'].includes(a)))throw new GameError('Invalid action log.');return input;}
const dayLevel=day=>{const i=Math.floor((Date.parse(day+'T00:00:00Z')-epoch)/DAY);if(!Number.isInteger(i)||i<0)throw new GameError('Invalid Daily date.');return C.normalize(daily[i%30]);};
const closeAt=day=>Date.parse(day+'T00:00:00Z')+DAY;
const round=(ctx,day)=>ctx.shared.get('daily:'+day)??{day,entries:{},closed:false,winner:null,refunded:false};
const ordered=r=>Object.values(r.entries).filter((e:any)=>e.best).sort((a:any,b:any)=>a.best.turns-b.best.turns||a.best.ms-b.best.ms||a.best.at-b.best.at||a.friendId.localeCompare(b.friendId));
function close(ctx,r){
 if(!r.closed&&ctx.now>=closeAt(r.day)){
  const leaders=ordered(r);r.closed=true;r.refunded=Object.keys(r.entries).length<2||!leaders.length;r.winner=r.refunded?null:leaders[0].friendId;
  ctx.shared.set('daily:'+r.day,r);
 }
 return r;
}
function resolveEntry(ctx,r,e){
 if(!r.closed||!e||e.resolved)return;
 const pot=Object.keys(r.entries).length*150;
 ctx.resolve(e.tx,{day:r.day,pays:String(r.refunded?150:r.winner===e.friendId?pot*80/100:0),burn:String(!r.refunded&&r.winner===e.friendId?pot*10/100:0),rewards:String(!r.refunded&&r.winner===e.friendId?pot*10/100:0),refunded:r.refunded});
 e.resolved=true;ctx.shared.set('daily:'+r.day,r);
}
function dailyState(ctx){
 const day=utcDay(ctx.now),r=close(ctx,round(ctx,day)),e=r.entries[ctx.friend.id];
 return {day,closesAt:closeAt(day),serverNow:ctx.now,entries:Object.keys(r.entries).length,pot:Object.keys(r.entries).length*150,
  myEntry:e?{attemptsLeft:3-e.used,best:e.best,active:e.active,solvable:e.used===3&&!e.best?{turns:dailySolutions[dayLevel(day).id].turns}:null}:null,
  level:e?dayLevel(day):null,leaders:ordered(r).slice(0,10).map((x:any)=>({friendId:x.friendId,...x.best,actions:undefined})),split:{winner:80,burn:10,rewards:10}};
}
function load(ctx){
 const today=utcDay(ctx.now),past=Math.min(30,Math.max(0,Math.floor((ctx.now-epoch)/DAY))),archive=[];
 for(let i=1;i<=past;i++)archive.push(utcDay(Date.parse(today+'T00:00:00Z')-i*DAY));
 // A returning Friend also asks the keeper to settle their closed entries.
 for(const day of archive){const r=close(ctx,round(ctx,day)),e=r.entries[ctx.friend.id];if(e&&!e.resolved)resolveEntry(ctx,r,e);}
 return {progress:progress(ctx),items:items(ctx),daily:dailyState(ctx),archive,last:ctx.shared.get('last')??{revision:0,holder:null,level:official.get('last-cutaway')}};
}
function dailyTx(ctx,tx){
 const d=tx.data;
 if(!d||typeof d.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d.day)||!Number.isFinite(d.enteredAt))throw new GameError('Round adapter did not supply a verified entry.');
 const r=close(ctx,round(ctx,d.day));let e=r.entries[ctx.friend.id];
 if(!e){
  if(r.closed||d.enteredAt>=closeAt(d.day)||d.enteredAt<Date.parse(d.day+'T00:00:00Z')){
   if(tx.status==='pending')ctx.resolve(tx.id,{day:d.day,pays:'150',burn:'0',rewards:'0',refunded:true});return;
  }
  e={friendId:ctx.friend.id,tx:tx.id,used:0,active:null,best:null,resolved:false};r.entries[ctx.friend.id]=e;
 }else if(e.tx!==tx.id){if(tx.status==='pending')ctx.resolve(tx.id,{day:d.day,pays:'150',burn:'0',rewards:'0',refunded:true});return;}
 ctx.shared.set('daily:'+d.day,r);
 if(tx.status==='pending'&&r.closed)resolveEntry(ctx,r,e);
}
export default defineGame({
 calls:{
  load,
  settings(ctx,input){const p=check.object(input,['sound','reduced','theme','trail']),s=progress(ctx),owned=items(ctx);
   s.sound=check.boolean(p.sound);s.reduced=check.boolean(p.reduced);s.trail=check.boolean(p.trail);
   const theme=check.oneOf(p.theme,['plain','lilac','citrus']);s.theme=theme==='plain'||owned.includes(theme)?theme:'plain';ctx.data.set('progress1',s);return s;},
  complete(ctx,input){const p=check.object(input,['levelId','actions','mode','practice','type']),id=check.string(p.levelId,64),mode=check.oneOf(p.mode,['operative','ghost']);check.boolean(p.practice);
   if(p.type==='sdkDaily')throw new GameError('Use dailySubmit for ranked attempts.');
   const l=official.get(id);if(!l||id==='last-cutaway')throw new GameError('Unknown solo plan.');
   if(id.startsWith('archive-')&&!items(ctx).includes('archive-pack'))throw new GameError('The Black Archive is not owned by this Friend.');
   const run=E.replay(l,actions(p.actions),mode);if(run.error||!run.state||!['won','lost'].includes(run.state.status))throw new GameError('The official run did not finish.');
   const s=progress(ctx);if(run.state.status==='won'&&!p.practice){if(!s.done.includes(id))s.done.push(id);s.mastery[id]=F.mergeTarget(s.mastery[id],l,run.state,false);const key=id+':'+mode;s.best[key]=Math.max(s.best[key]??0,E.score(l,run.state));ctx.data.set('progress1',s);}
   return {progress:s,status:run.state.status};},
  daily(ctx){return dailyState(ctx);},
  dailyStart(ctx){const day=utcDay(ctx.now),r=round(ctx,day),e=r.entries[ctx.friend.id];if(!e||r.closed)throw new GameError('Enter today through the platform first.');if(e.used>=3&&!e.active)throw new GameError('All three attempts are spent.');
   if(!e.active){e.used++;e.active={id:e.used,startedAt:ctx.now};ctx.shared.set('daily:'+day,r);}return {...dailyState(ctx),attempt:e.active};},
  dailySubmit(ctx,input){const p=check.object(input,['day','attempt','actions']),day=check.string(p.day,10,'day',/^\d{4}-\d{2}-\d{2}$/),r=close(ctx,round(ctx,day)),e=r.entries[ctx.friend.id];
   if(r.closed||day!==utcDay(ctx.now))throw new GameError('The UTC day has closed.');if(!e?.active||e.active.id!==p.attempt)throw new GameError('No matching active attempt.');
   const q=E.replay(dayLevel(day),actions(p.actions),'ghost'),ms=Math.max(0,ctx.now-e.active.startedAt);if(q.error||!q.state)throw new GameError('Invalid replay.');
   const accepted=q.state.status==='won'&&q.state.alarms===0,best={turns:q.state.turn,ms,at:ctx.now,actions:p.actions};
   if(accepted&&(!e.best||best.turns<e.best.turns||best.turns===e.best.turns&&best.ms<e.best.ms))e.best=best;e.active=null;ctx.shared.set('daily:'+day,r);return {accepted,turns:q.state.turn,ms,...dailyState(ctx)};},
  dailyArchive(ctx,input){const p=check.object(input,['day']),day=check.string(p.day,10,'day',/^\d{4}-\d{2}-\d{2}$/);if(closeAt(day)>ctx.now)throw new GameError('The solution unlocks at 00:00 UTC.');
   const level=dayLevel(day),r=close(ctx,round(ctx,day));resolveEntry(ctx,r,r.entries[ctx.friend.id]);return {day,level,actions:dailySolutions[level.id].actions,winner:r.winner,refunded:r.refunded};},
  lastStart(ctx){const r=ctx.shared.get('last')??{revision:0,holder:null,level:official.get('last-cutaway')};ctx.shared.set('last',r);ctx.data.set('lastAttempt',{revision:r.revision});return r;},
  lastPrepare(ctx,input){const p=check.object(input,['x','y']),r=ctx.shared.get('last');if(!r||r.holder!==ctx.friend.id||r.fortified)throw new GameError('Clear the shared vault before adding one obstacle.');
   const x=check.int(p.x,1,r.level.map[0].length-2),y=check.int(p.y,1,r.level.map.length-2);if(y%2!==1||r.level.map[y][x]!=='.'||C.landing(r.level,x,y))throw new GameError('Choose an empty floor cell away from ladders.');
   const l=JSON.parse(JSON.stringify(r.level));l.map[y]=l.map[y].slice(0,x)+'#'+l.map[y].slice(x+1);const level=C.normalize(l);if(r.proof&&E.replay(level,r.proof,'ghost').ok)throw new GameError('The new wall must break the previous winning route.');ctx.shared.set('last',r);ctx.data.set('lastDraft',{revision:r.revision,level});return {level};},
  lastSubmit(ctx,input){const p=check.object(input,['actions','fortify']);check.boolean(p.fortify);const r=ctx.shared.get('last'),a=ctx.data.get(p.fortify?'lastDraft':'lastAttempt');
   if(!r||!a||a.revision!==r.revision)throw new GameError('The shared vault changed. Start its latest version.');if(p.fortify&&(r.holder!==ctx.friend.id||r.fortified))throw new GameError('The vault is held by another Friend.');
   const level=p.fortify?a.level:r.level,q=E.replay(level,actions(p.actions),'ghost');if(!q.ok||q.state.alarms!==0)throw new GameError('A clean winning proof is required.');
   ctx.shared.set('last',{revision:r.revision+1,holder:ctx.friend.id,level,fortified:!!p.fortify,turns:q.state.turn,proof:p.actions});ctx.data.delete(p.fortify?'lastDraft':'lastAttempt');return {claimed:true};}
 },
 intents:{
  enterDaily(ctx){const day=utcDay(ctx.now),r=round(ctx,day);if(r.entries[ctx.friend.id])throw new GameError('This Friend already entered today.');ctx.shared.set('daily:'+day,r);return {day,entry:'150',attempts:3,split:{winner:80,burn:10,rewards:10}};},
  buyHatchwork(ctx){if(ctx.items().hatchwork)throw new GameError('Hatchwork is already owned.');return null;},
  buySignalPaper(ctx){if(ctx.items().signalPaper)throw new GameError('Signal Paper is already owned.');return null;},
  buyGoldenTrail(ctx){if(ctx.items().goldenTrail)throw new GameError('Golden Trail is already owned.');return null;},
  buyBlackArchive(ctx){if(ctx.items().blackArchive)throw new GameError('The Black Archive is already owned.');return null;}
 },
 transactions:{enterDaily:dailyTx}
});
