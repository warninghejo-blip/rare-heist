/* LAST HEIST — shared deterministic round rules. Source, not a security boundary.
   The server owns identities, attempts, time and transactions. Offline rehearsal is labelled. */
(function(root,factory){const node=typeof module==='object'&&module.exports;const api=factory(node?require('./engine.js'):root.HeistEngine,node?require('./cutaway-rules.js'):root.CutawayRules,node?require('./cutaway-levels.js'):root.HEIST_CUTAWAY_LEVELS);if(typeof module==='object'&&module.exports)module.exports=api;else root.LastHeist=api;})(globalThis,function(E,C,levels){
 'use strict';
 const RULE_VERSION=2,MAX_ACTIONS=180,MAX_CHANGES=12;
 const PROFILES=Object.freeze({sprint:{quietMs:90000,editMs:90000,maxMs:720000,attemptMs:240000,label:'90 SECOND DEMO'},standard:{quietMs:600000,editMs:120000,maxMs:3600000,attemptMs:600000,label:'10 MINUTE DEMO'}});
 const clone=x=>JSON.parse(JSON.stringify(x));
 const fail=(code,message)=>{const e=new Error(message);e.code=code;throw e;};
 const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
 function seed(){return C.normalize(levels.find(l=>l.id==='last-cutaway'));}
 function createRound(id,now,profile='sprint',options={}){
  if(typeof profile!=='string'||!own(PROFILES,profile))fail('PROFILE','Unknown round profile');
  if(!Number.isSafeInteger(now)||now<0)fail('TIME','Invalid server clock');
  return {v:RULE_VERSION,id,profile,createdAt:now,startsAt:options.waiting?null:now,lastClock:now,hardEnd:options.waiting?null:now+PROFILES[profile].maxMs,deadline:options.waiting?null:now+PROFILES[profile].quietMs,revision:0,level:seed(),phase:options.waiting?'waiting':'open',leader:null,lease:null,solvers:[],changes:[],events:[],attemptCount:0,failedCount:0,clears:0,finishedAt:null,outcome:null,stake:stakeOf(profile,options.stake),prize:options.stake?0:1000,prizeClaimed:false,prizePaid:0,referenceActions:null};
 }
 // DEMO stake rounds: a fixed per-entry stake (whole DEMO RF) on STANDARD rounds only; 0 = free entry with the sponsor prize.
 function stakeOf(profile,stake){if(stake==null||stake===0||stake===false)return 0;if(profile!=='standard')fail('STAKE_PROFILE','Stake rounds use the STANDARD length');if(!Number.isSafeInteger(stake)||stake<1||stake>1e6)fail('STAKE','Invalid stake');return stake;}
 function event(r,type,now,data={}){r.events.push({type,at:now,revision:r.revision,...data});r.events=r.events.slice(-80);}
 function advance(raw,clock){
  const r=clone(raw),now=Math.max(r.lastClock,clock);r.lastClock=now;
  if(r.phase==='finished')return r;
  if(r.phase==='waiting'){
   if(now>=r.createdAt+86400000){r.phase='finished';r.outcome='no-clear';r.finishedAt=r.createdAt+86400000;event(r,'settled',r.finishedAt,{outcome:r.outcome});}
   return r;
  }
  const p=PROFILES[r.profile];
  if(r.phase==='editing'&&now>=r.lease.until){
   const at=r.lease.until;r.phase='open';r.lease=null;r.deadline=Math.min(r.hardEnd,at+p.quietMs);event(r,'edit-expired',at);
  }
  if(now>=r.hardEnd||(r.phase==='open'&&now>=r.deadline)){
   r.phase='finished';r.lease=null;r.finishedAt=Math.min(r.hardEnd,r.deadline);
   r.outcome=!r.leader?'no-clear':r.solvers.length<2?'uncontested':'winner';
   event(r,'settled',r.finishedAt,{outcome:r.outcome,player:r.leader});
  }
  return r;
 }
 function activate(raw,clock){
  const r=advance(raw,clock);if(r.phase!=='waiting')return r;
  const p=PROFILES[r.profile];r.phase='open';r.startsAt=r.lastClock;
  r.hardEnd=r.lastClock+p.maxMs;r.deadline=r.lastClock+p.quietMs;
  event(r,'started',r.lastClock);return r;
 }
 function validateLog(level,actions,winOnly=true){
  if(!Array.isArray(actions)||!actions.length||actions.length>MAX_ACTIONS||actions.some(a=>!E.ACTIONS.includes(a)||a==='EMP'))fail('ACTIONS','Invalid action log');
  const r=E.replay(level,actions,'ghost');
  if(!r.state||r.error?.startsWith('Invalid')||r.state.empUsed||r.state.alarms>0&&r.state.status==='won')fail('REPLAY','Replay did not validate');
  if(winOnly&&!r.ok)fail('NOT_CLEARED','A clean extraction is required');
  if(!winOnly&&!['won','lost'].includes(r.state.status))fail('NOT_FINISHED','Finish the attempt first');
  return r;
 }
 function takeLead(raw,player,revision,actions,clock){
  let r=advance(raw,clock);const now=r.lastClock;
  if(r.phase==='finished')fail('ROUND_FINISHED','Round has ended');
  if(r.revision!==revision)fail('STALE_REVISION','This attempt belongs to an older vault');
  if(r.phase!=='open')fail('EDIT_RESERVED','Another clear has reserved the next change');
  if(r.leader===player)fail('OWN_DEFENCE','Wait for another player to clear your vault');
  validateLog(r.level,actions);r.leader=player;r.referenceActions=[...actions];r.clears++;
  if(!r.solvers.includes(player))r.solvers.push(player);
  event(r,'clear',now,{player,turns:actions.length});
  const p=PROFILES[r.profile];
  if(r.changes.length<MAX_CHANGES&&r.hardEnd-now>p.quietMs+1000){
   r.phase='editing';r.lease={player,until:Math.min(now+p.editMs,r.hardEnd-p.quietMs)};
   r.deadline=Math.min(r.hardEnd,r.lease.until+p.quietMs);
  }else{r.phase='open';r.lease=null;r.deadline=Math.min(r.hardEnd,now+p.quietMs);}
  return r;
 }
 function allowedCell(l,x,y){
  if(!Number.isInteger(x)||!Number.isInteger(y)||y%2!==1||C.landing(l,x,y)||E.tile(l,x,y)!=='.'||E.deviceAt(l,x,y))return false;
  if(l.guards.some(g=>g.path.some(p=>p[0]===x&&p[1]===y)))return false;
  // Entrance/exit/trophy plus all interaction tiles keep their immediate neighbours.
  for(const c of 'SETab12pPGHCDvRl')for(const p of E.positions(l,c))if(Math.abs(p.x-x)+Math.abs(p.y-y)<=1)return false;
  return true;
 }
 function mutationLevel(raw,change){
  if(!change||typeof change!=='object'||Array.isArray(change)||Object.keys(change).some(k=>!['kind','x','y','dir'].includes(k)))fail('ONE_CHANGE','Submit exactly one allowed addition');
  if(!['wall','laser','camera'].includes(change.kind))fail('CHANGE_KIND','Choose wall, laser or camera');
  if(!allowedCell(raw.level,change.x,change.y))fail('PROTECTED_TILE','This tile is protected or occupied');
  if(raw.changes.length>=MAX_CHANGES)fail('CHANGE_CAP','Round change limit reached');
  const count=raw.changes.filter(c=>c.kind===change.kind).length;
  if(count>=({wall:6,laser:3,camera:3})[change.kind])fail('KIND_CAP','This type has reached its limit');
  if(change.kind!=='wall'&&!['E','W'].includes(change.dir))fail('DIRECTION','Shared devices must face left or right along a floor');
  if(change.kind==='wall'&&change.dir!=null)fail('ONE_CHANGE','Walls do not accept a direction');
  const l=clone(raw.level);
  if(change.kind==='wall'){const row=[...l.map[change.y]];row[change.x]='#';l.map[change.y]=row.join('');}
  if(change.kind==='laser')l.lasers.push({x:change.x,y:change.y,dir:change.dir,range:3,period:4,on:2,phase:0});
  if(change.kind==='camera')l.cameras.push({x:change.x,y:change.y,dir:change.dir,range:3,rotation:[change.dir],speed:2});
  const valid=C.validate(l);if(!valid.ok)fail('MAP_INVALID',valid.errors.join('; '));
  // The start must remain safe for the initial frame (no invisible spawn trap).
  const s=E.create(l,'ghost'),h=E.threats(l,s);if([...h.lasers,...h.vision].some(p=>E.same(p,s)))fail('SPAWN_TRAP','The entrance must remain safe');
  return E.normalize(l);
 }
 function checkMutation(raw,change){
  const level=mutationLevel(raw,change);
  if(!raw.referenceActions)fail('CLEAR_FIRST','Clear the current vault first');
  if(E.replay(level,raw.referenceActions,'ghost').ok)fail('NO_CHALLENGE','The previous successful route must stop working');
  return level;
 }
 function fortify(raw,player,revision,change,proof,clock){
  let r=advance(raw,clock);const now=r.lastClock;
  if(r.phase==='finished')fail('ROUND_FINISHED','Round has ended');
  if(r.revision!==revision)fail('STALE_REVISION','An older revision cannot be changed');
  if(r.phase!=='editing'||r.lease?.player!==player)fail('NO_EDIT_RIGHT','Only the latest successful player may edit');
  const l=checkMutation(r,change);validateLog(l,proof);
  r.revision++;r.level=l;r.phase='open';r.lease=null;r.deadline=Math.min(r.hardEnd,now+PROFILES[r.profile].quietMs);
  r.referenceActions=[...proof];r.changes.push({...clone(change),revision:r.revision,player,at:now});
  event(r,'fortified',now,{player,change:clone(change)});return r;
 }
 function skip(raw,player,clock){let r=advance(raw,clock);if(r.phase!=='editing'||r.lease?.player!==player)fail('NO_EDIT_RIGHT','No active change to skip');r.phase='open';r.lease=null;r.deadline=Math.min(r.hardEnd,r.lastClock+PROFILES[r.profile].quietMs);event(r,'skipped',r.lastClock,{player});return r;}
 function claim(raw,player,clock){let r=advance(raw,clock);if(r.phase!=='finished')fail('NOT_SETTLED','Round is not settled');if(r.stake)fail('NO_PRIZE','Stake rounds pay the winner at settlement. There is no sponsor prize to claim');if(r.outcome!=='winner'||r.leader!==player)fail('NO_PRIZE','No prize for this session');if(!r.prizeClaimed){r.prizeClaimed=true;r.prizePaid=r.prize;event(r,'claimed',r.lastClock,{player,amount:r.prize});}return r;}
 function publicRound(raw,clock,me=null){const r=advance(raw,clock);return {id:r.id,profile:r.profile,stake:r.stake||0,revision:r.revision,phase:r.phase,level:clone(r.level),createdAt:r.createdAt,startsAt:r.startsAt??null,serverNow:r.lastClock,deadline:r.deadline,hardEnd:r.hardEnd,editUntil:r.lease?.until||null,leader:r.leader,canEdit:r.lease?.player===me,canEnter:['waiting','open'].includes(r.phase)&&r.leader!==me,solvers:r.solvers.length,attemptCount:r.attemptCount,failedCount:r.failedCount,clears:r.clears,changes:clone(r.changes),events:clone(r.events),prize:r.prize,prizeClaimed:r.prizeClaimed,prizePaid:r.prizePaid,outcome:r.outcome,finishedAt:r.finishedAt,maxActions:MAX_ACTIONS,maxChanges:MAX_CHANGES};}
 return {RULE_VERSION,MAX_ACTIONS,MAX_CHANGES,PROFILES,seed,createRound,activate,advance,takeLead,allowedCell,mutationLevel,checkMutation,fortify,skip,claim,validateLog,publicRound};
});
