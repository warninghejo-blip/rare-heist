import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {ArenaStore} from '../server/store.mjs';
import {DailyHeist} from '../server/daily.mjs';
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
