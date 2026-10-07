import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {ArenaStore} from '../server/store.mjs';
import {DailyHeist} from '../server/daily.mjs';
import {createApp} from '../server/app.mjs';
const require=createRequire(import.meta.url),solutions=require('../src/daily-solutions.js'),E=require('../src/engine.js');

test('Daily: 150 RF bundle, three attempts then refusal, UTC settlement 80/10/10 and single-player refund',()=>{
 let now=Date.UTC(2026,9,8,12),s=new ArenaStore(':memory:',{clock:()=>now,minActionMs:0,seed:false});
 try{
  assert.ok(s.daily instanceof DailyHeist);
  assert.equal(s.daily.state('a').levelId,null);
  const entered=s.daily.enter('a','3412');
  assert.equal(entered.levelId,'daily-01');assert.ok(entered.level.map);assert.equal(entered.balance,50);
  assert.equal(entered.myEntry.attemptsLeft,3);assert.deepEqual(entered.prices,{entry:150,attempts:3});
  assert.throws(()=>s.daily.enter('a','3412'),{code:'ALREADY_ENTERED'});
  // Walk into the guarded gallery and stay there until the watchman catches us.
  const level=E.normalize(entered.level),lostActions=['E','S','S'];let lostState=E.replay(level,lostActions,'ghost').state;
  while(lostState.status==='playing'&&lostActions.length<100){lostActions.push('WAIT');lostState=E.step(level,lostState,'WAIT').state;}
  assert.equal(lostState.status,'lost');assert.equal(s.daily.submit('a',lostActions).accepted,false);
  assert.equal(s.daily.state('a').myEntry.attemptsLeft,2);
  assert.throws(()=>s.daily.extra('a'),{code:'MAX_EXTRA'});assert.equal(s.daily.state('a').balance,50);
  assert.throws(()=>s.daily.submit('a',['UNKNOWN']),{code:'REPLAY_INVALID'});
  assert.equal(s.daily.state('a').myEntry.attemptsLeft,2);
  const route=solutions['daily-01'].actions;
  const win=s.daily.submit('a',route);assert.equal(win.accepted,true);assert.equal(win.turns,route.length);assert.equal(win.rank,1);
  assert.equal(win.myEntry.attemptsLeft,1);assert.equal(s.daily.submit('a',[]).myEntry.attemptsLeft,0);
  assert.throws(()=>s.daily.submit('a',route),{code:'NO_ATTEMPTS'});assert.equal(s.daily.state('a').balance,50);
  now+=1000;s.daily.enter('b','7730');assert.equal(s.daily.submit('b',route).rank,2,'equal score: earlier submission wins');
  assert.equal(s.daily.state('a').pot,300);
  assert.equal(s.stakeInfo('a').invariant.ok,true,'shared wallet invariant while Daily holds funds');
  now=Date.UTC(2026,9,9);
  s.daily.state('a');const history=s.daily.history(7);
  assert.equal(history[0].day,'2026-10-08');assert.equal(history[0].winner.heroId,'3412');
  assert.equal(history[0].burned,30);assert.equal(history[0].refunded,0);
  const settlement=s.db.prepare('SELECT * FROM daily_settlements WHERE day=?').get('2026-10-08');
  assert.equal(settlement.paid,240);assert.equal(settlement.rewards,30);
  assert.deepEqual(s.daily.replay('2026-10-08',1).actions,route);
  const balance=s.stakes.peek('a').balance;s.daily.state('a');assert.equal(s.stakes.peek('a').balance,balance);
  assert.equal(s.db.prepare('SELECT count(*) n FROM daily_settlements').get().n,1);
  assert.equal(s.stakeInfo('a').invariant.ok,true,'shared wallet invariant after Daily payout');
  s.daily.enter('solo','5555');s.daily.submit('solo',[]);s.daily.submit('solo',solutions['daily-02'].actions);
  now=Date.UTC(2026,9,10);s.daily.state('solo');
  const refund=s.daily.history()[0];assert.equal(refund.refunded,150);assert.equal(refund.burned,0);assert.equal(refund.winner,null);
  assert.equal(s.stakes.peek('solo').balance,200);assert.equal(s.stakeInfo('solo').invariant.ok,true);
 }finally{s.close();}
});

test('Daily v3: server-timed ties, failed attempts reveal turns, closed solutions replay to a clean win',async()=>{
 let now=Date.UTC(2026,9,8,12);
 const app=createApp({dbFile:':memory:',clock:()=>now,minActionMs:0});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+app.server.address().port;
 const {Network}=require('../src/daily-client.js');
 function client(){let cookie='',csrf='';return new Network({request:async(method,url,body)=>{
  const res=await fetch(origin+url,{method,headers:{origin,'content-type':'application/json',cookie,'x-rh-csrf':csrf},...(method==='POST'?{body:JSON.stringify(body||{})}:{})});
  const sc=res.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];
  const value=await res.json();if(value.csrf)csrf=value.csrf;
  if(!res.ok)throw Object.assign(Error(value.message),{code:value.error});return value;
 }});}
 try{
  const a=client(),b=client(),failed=client();
  await a.init();await b.init();await failed.init();
  const entry=await a.enter('3412'),route=solutions[entry.levelId].actions;
  now+=5000;const slow=await a.submit(route);
  await b.enter('7730');now+=200;const fast=await b.submit(route);
  assert.equal(fast.rank,1,'same turns: the later but faster run must lead');
  assert.equal(slow.ms,5000);assert.equal(fast.ms,200);
  assert.equal(fast.myEntry.best.ms,200);assert.equal(fast.leaders[0].heroId,'7730');assert.equal(fast.leaders[0].ms,200);
  assert.equal(fast.serverNow,now);
  assert.equal(fast.myEntry.solvable,null);
  const started=await a.start();assert.equal(started.attempt.startedAt,now);
  now+=50;assert.equal((await a.start()).attempt.startedAt,started.attempt.startedAt,'start is idempotent while open');
  now+=50;const improved=await a.submit(route);
  assert.equal(improved.ms,100);assert.equal(improved.rank,1);assert.equal(improved.myEntry.best.ms,100);
  const tied=await b.submit(route);
  assert.equal(tied.ms,100,'without start the clock begins at the previous submission');
  assert.equal(tied.rank,2,'equal turns and time: the earlier accepted run leads');
  assert.equal(tied.myEntry.best.ms,100);
  assert.equal((await a.start()).attempt.startedAt,now,'a submitted attempt closes its clock');
  assert.equal((await a.submit([])).myEntry.solvable,null,'a prior clean win suppresses solution hints');
  await assert.rejects(a.start(),{code:'NO_ATTEMPTS'});
  const lostEntry=await failed.enter('5555'),level=E.normalize(lostEntry.level),lost=['E','S','S'];
  let state=E.replay(level,lost,'ghost').state;
  while(state.status==='playing'&&lost.length<100){lost.push('WAIT');state=E.step(level,state,'WAIT').state;}
  assert.equal(state.status,'lost');
  for(let i=0;i<3;i++){
   const result=await failed.submit(lost);assert.equal(result.accepted,false);
   assert.deepEqual(result.myEntry.solvable,i===2?{turns:solutions[entry.levelId].turns}:null);
  }
  await assert.rejects(a.solution(entry.day),{code:'NOT_CLOSED'});
  now=Date.UTC(2026,9,9);
  const solution=await a.solution(entry.day);
  assert.equal(solution.day,entry.day);assert.equal(solution.levelId,entry.levelId);
  assert.deepEqual(solution.actions,route);assert.equal(solution.turns,solutions[entry.levelId].turns);
  const replay=E.replay(E.normalize(solution.level),solution.actions,'ghost').state;
  assert.equal(replay.status,'won');assert.equal(replay.alarms,0);assert.equal(replay.turn,solution.turns);
  const history=(await a.history())[0];
  assert.equal(history.winner.heroId,'3412');assert.equal(history.winner.ms,100);
  assert.deepEqual(history.level,solution.level);assert.equal(history.solutionTurns,solution.turns);
 }finally{await new Promise(resolve=>app.server.close(resolve));}
});
