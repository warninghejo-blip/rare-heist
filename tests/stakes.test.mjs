// DEMO stake rounds on the real ArenaStore (SQLite) and HTTP API. Play money only: nothing here touches a chain.
// Rules under test (docs/STAKES.md): 50 DEMO RF per session per round, 200 DEMO RF daily allowance (refill, UTC day),
// winner (last clean solver, at least two clearing sessions) takes 70% of the pot, 30% is burned; uncontested and
// empty rounds refund every stake. Invariants: stakes = paid + burned + refunded + held, and
// wallets = granted - stakes + paid + refunded. Settlement is idempotent; balances never go negative.
// Run: node --test tests/stakes.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Worker} from 'node:worker_threads';
import {DatabaseSync} from 'node:sqlite';
import {createRequire} from 'node:module';
import {ArenaStore} from '../server/store.mjs';
import {createApp} from '../server/app.mjs';
const require=createRequire(import.meta.url),SOL=require('../src/solutions.js'),A=require('../src/last-heist.js'),Eco=require('../src/economy.js');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const tmp=path.join(process.env.STAKES_TMP||path.join(root,'..','..','..','_tmp','stakes'),'db');mkdirSync(tmp,{recursive:true});
const route=SOL['last-cutaway'].actions,DAY=86400000,T0=Date.UTC(2026,8,28,12,0,0);
const code=fn=>{try{fn();return 'OK';}catch(e){return e.code||e.message;}};
// Windows can hold a just-closed SQLite file for a moment (indexer, antivirus): retry, and never let cleanup decide a test.
const cleanup=file=>{for(const f of [file,file+'-wal',file+'-shm'])try{rmSync(f,{force:true,maxRetries:10,retryDelay:100});}catch(e){console.log('# cleanup left '+f+': '+e.code);}};

function fresh(){const clock={now:T0};const s=new ArenaStore(':memory:',{clock:()=>clock.now,minActionMs:0});return {s,clock};}
// A clean clear of the current version by `player`, then KEEP THE VAULT so the next thief faces the same version.
function clear(s,clock,id,player,hero='3412'){clock.now+=1000;const e=s.enter(id,player,hero);clock.now+=1000;const f=s.finish(id,e.ticket,player,route);assert.equal(f.result,'leader',JSON.stringify(f).slice(0,200));clock.now+=1000;s.skip(id,player);}
function stakeRound(s,clock,creator='creator'){clock.now+=61000;return s.create(creator,'standard',true).id;}
const endRound=(s,clock,id)=>{clock.now+=A.PROFILES.standard.maxMs+1000;return s.round(id,'viewer');};
const bal=(s,p)=>s.stakeInfo(p).wallet.balance;
function sums(s){const i=s.stakeInfo('audit');return i;}

test('shared constants: 50 DEMO RF stake, 70/30 split, 200 daily allowance; split is integral and conserves the pot',()=>{
 assert.deepEqual({...Eco.STAKES},{amount:50,winnerPct:70,burnPct:30,allowance:200,unit:'DEMO RF'});
 for(const pot of [0,50,100,150,350,1000,12345]){const x=Eco.stakeSplit(pot);assert.equal(x.winner+x.burned,pot);assert.ok(Number.isSafeInteger(x.winner)&&Number.isSafeInteger(x.burned));}
 assert.deepEqual(Eco.stakeSplit(350),{pot:350,winner:245,burned:105});
 assert.throws(()=>Eco.stakeSplit(-1));assert.throws(()=>Eco.stakeSplit(1.5));
});

test('a fresh server opens a DEMO stake round next to the free ones; stake rounds reserve no sponsor prize',()=>{
 const {s}=fresh(),r=s.round('opening-stakes','me');
 assert.equal(r.stake,50);assert.equal(r.profile,'standard');assert.equal(r.prize,0);
 assert.equal(r.stakes.pot,0);assert.deepEqual(r.stakes.entrants,[]);assert.equal(r.stakes.unit,'DEMO RF');assert.equal(r.stakes.winnerPct,70);assert.equal(r.stakes.burnPct,30);
 assert.equal(s.round('opening-standard','me').stake,0);assert.equal(s.round('opening-standard','me').stakes,null);
 const eco=s.economy();assert.equal(eco.invariant,true);assert.equal(eco.reserved,2000);
});

test('stake: debits 50 from the 200 allowance, shows the entrant as its Friend, one stake per session per round',()=>{
 const {s,clock}=fresh();
 assert.equal(bal(s,'p1'),200,'a new session sees its daily allowance');
 assert.equal(code(()=>s.enter('opening-stakes','p1','7730')),'STAKE_REQUIRED','entering a stake round needs a stake');
 const v=s.stake('opening-stakes','p1','7730');
 assert.equal(v.wallet.balance,150);assert.equal(v.round.stakes.pot,50);assert.equal(v.round.stakes.mine,true);
 assert.deepEqual(v.round.stakes.entrants.map(e=>[e.hero,e.name]),[['7730','Friend #7730']]);
 assert.equal(code(()=>s.stake('opening-stakes','p1','7730')),'ALREADY_STAKED');assert.equal(bal(s,'p1'),150,'a refused second stake costs nothing');
 assert.equal(code(()=>s.stake('opening-standard','p1','7730')),'NOT_STAKE_ROUND');
 clock.now+=1000;assert.ok(s.enter('opening-stakes','p1','7730').ticket,'a staked session enters');
 clock.now+=1000;assert.ok(s.enter('opening-standard','p2','3412').ticket,'free rounds still need no stake');
 assert.equal(code(()=>s.stake('opening-stakes','p1','abc')),'ALREADY_STAKED');
 assert.equal(code(()=>s.stake('nope','p3','1')),'NOT_FOUND');
});

test('settle 70/30: the last clean solver takes 70% of the pot, 30% is burned (DEMO), paid once at settlement',()=>{
 const {s,clock}=fresh(),id='opening-stakes';
 for(const [p,h] of [['b','7730'],['c','3412'],['d','5555']])s.stake(id,p,h);
 clear(s,clock,id,'b','7730');clear(s,clock,id,'c','3412');
 const live=s.round(id,'c');assert.equal(live.stakes.pot,150);assert.deepEqual(live.stakes.projected,{winner:105,burned:45});assert.equal(live.stakes.settlement,null);
 const r=endRound(s,clock,id);assert.equal(r.outcome,'winner');assert.equal(r.leader,'c');
 const st=r.stakes.settlement;assert.equal(st.outcome,'winner');assert.equal(st.pot,150);assert.equal(st.paid,105);assert.equal(st.burned,45);assert.equal(st.refunded,0);assert.equal(st.hero,'3412');assert.equal(st.entrants,3);
 assert.equal(bal(s,'c'),255);assert.equal(bal(s,'b'),150);assert.equal(bal(s,'d'),150);
 const i=sums(s);assert.equal(i.totals.stakes,150);assert.equal(i.totals.paid,105);assert.equal(i.totals.burned,45);assert.equal(i.totals.held,0);assert.equal(i.invariant.ok,true,JSON.stringify(i.invariant));
 assert.equal(code(()=>s.claim(id,'c')),'NO_PRIZE','stake rounds pay at settlement, not through the sponsor claim');
 assert.equal(code(()=>s.stake(id,'e','1')),'ROUND_FINISHED');
 assert.equal(i.history[0].roundId,id);assert.equal(i.history[0].paid,105);
});

test('idempotent settlement: repeated reads and a direct second settle change nothing',()=>{
 const {s,clock}=fresh(),id='opening-stakes';
 s.stake(id,'b','7730');s.stake(id,'c','3412');clear(s,clock,id,'b');clear(s,clock,id,'c');endRound(s,clock,id);
 const before=JSON.stringify([bal(s,'b'),bal(s,'c'),sums(s).totals]);
 for(let i=0;i<5;i++){s.round(id,'x');s.list('x');s.economy();s.stakeInfo('x');}
 s.tx(()=>s.stakes.settle(s.get(id),s.heroes(s.get(id))));
 s.tx(()=>s.stakes.settle(s.get(id),s.heroes(s.get(id))));
 assert.equal(JSON.stringify([bal(s,'b'),bal(s,'c'),sums(s).totals]),before);
 assert.equal(s.db.prepare('SELECT count(*) n FROM stake_settlements WHERE round_id=?').get(id).n,1);
 assert.equal(bal(s,'c'),150+70);
});

test('refunds: an uncontested round (one clearing session) and an empty round return every stake',()=>{
 const {s,clock}=fresh(),id='opening-stakes';
 s.stake(id,'b','7730');s.stake(id,'c','3412');clear(s,clock,id,'b');
 const r=endRound(s,clock,id);assert.equal(r.outcome,'uncontested');
 assert.deepEqual([r.stakes.settlement.paid,r.stakes.settlement.burned,r.stakes.settlement.refunded],[0,0,100]);
 assert.equal(bal(s,'b'),200);assert.equal(bal(s,'c'),200);
 const id2=stakeRound(s,clock);s.stake(id2,'b','7730');s.stake(id2,'d','1');clock.now+=1000;s.enter(id2,'d','1');
 const r2=endRound(s,clock,id2);assert.equal(r2.outcome,'no-clear');assert.equal(r2.stakes.settlement.refunded,100);assert.equal(bal(s,'d'),200);
 // A stake on a round nobody ever started: the waiting round closes after 24 hours and refunds.
 const id3=stakeRound(s,clock);s.stake(id3,'e','9');assert.equal(bal(s,'e'),150);clock.now+=DAY+1;
 assert.equal(s.round(id3,'e').stakes.settlement.refunded,50);assert.equal(s.stakeInfo('e').wallet.balance,200);
 const i=sums(s);assert.equal(i.totals.burned,0);assert.equal(i.totals.refunded,250);assert.equal(i.invariant.ok,true);
 assert.equal(i.history.find(h=>h.roundId===id).outcome,'uncontested');
});

test('no negative balances: the fifth stake of the day is refused; the allowance refills to 200 the next UTC day',()=>{
 const {s,clock}=fresh(),ids=['opening-stakes'];for(let i=0;i<4;i++)ids.push(stakeRound(s,clock,'maker'+i));
 for(const id of ids.slice(0,4))s.stake(id,'p','1');assert.equal(bal(s,'p'),0);
 assert.equal(code(()=>s.stake(ids[4],'p','1')),'INSUFFICIENT_DEMO');assert.equal(bal(s,'p'),0);
 assert.throws(()=>s.db.prepare("UPDATE stake_wallets SET balance=-1 WHERE player='p'").run(),/CHECK/,'the table itself refuses a negative balance');
 const day=Math.floor(clock.now/DAY);clock.now=(day+1)*DAY+5;
 assert.equal(bal(s,'p'),200,'refilled on the next UTC day');
 // (the four rounds ended in the meantime and refunded; a refill never lowers a balance above the allowance)
 const {s:s2,clock:c2}=fresh();s2.stake('opening-stakes','w','1');s2.stake('opening-stakes','x','2');clear(s2,c2,'opening-stakes','w');clear(s2,c2,'opening-stakes','x');endRound(s2,c2,'opening-stakes');
 assert.equal(bal(s2,'x'),220);c2.now+=DAY;assert.equal(bal(s2,'x'),220,'winnings above the allowance are kept');assert.equal(bal(s2,'w'),200,'a spent wallet refills to 200');
 // The refill is written, not only shown: staking on the new day spends from the refilled 200.
 const id2=stakeRound(s2,c2);assert.equal(s2.stake(id2,'w','1').wallet.balance,150);
 assert.equal(s2.db.prepare("SELECT balance FROM stake_wallets WHERE player='w'").get().balance,150);
 assert.equal(s2.stakeInfo('audit').invariant.ok,true);
});

test('stake rounds are STANDARD only and only created on request',()=>{
 const {s,clock}=fresh();clock.now+=61000;
 assert.equal(code(()=>s.create('m','sprint',true)),'STAKE_PROFILE');
 const free=s.create('m','standard');assert.equal(free.stake,0);clock.now+=61000;
 const paid=s.create('m2','standard',true);assert.equal(paid.stake,50);assert.equal(paid.prize,0);
});

test('HTTP: stake, double stake refused, 20 parallel stakes from one session debit exactly once',async()=>{
 let now=T0;const app=createApp({dbFile:':memory:',clock:()=>now,minActionMs:0});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+app.server.address().port;
 const client=()=>{let cookie='',csrf='';return async(method,url,body)=>{const r=await fetch(origin+url,{method,headers:{origin,'content-type':'application/json',cookie,'x-rh-csrf':csrf},body:method==='POST'?JSON.stringify(body||{}):undefined});const sc=r.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];const j=await r.json();if(j.csrf)csrf=j.csrf;return {status:r.status,j};};};
 try{
  const a=client(),b=client();await a('POST','/api/session');await b('POST','/api/session');
  const hz=await (await fetch(origin+'/healthz')).json();assert.equal(hz.stakes,'demo');assert.equal(hz.funds,'none');
  const w0=await a('GET','/api/stakes');assert.equal(w0.status,200);assert.equal(w0.j.wallet.balance,200);assert.equal(w0.j.invariant.ok,true);
  const listed=await a('GET','/api/rounds');assert.ok(listed.j.rounds.some(r=>r.id==='opening-stakes'&&r.stake===50));assert.equal(listed.j.stakes.wallet.balance,200);
  const noStake=await a('POST','/api/rounds/opening-stakes/enter',{heroId:'7730'});assert.equal(noStake.status,409);assert.equal(noStake.j.error,'STAKE_REQUIRED');
  const results=await Promise.all(Array.from({length:20},()=>a('POST','/api/rounds/opening-stakes/stake',{heroId:'7730'})));
  assert.equal(results.filter(r=>r.status===200).length,1);assert.ok(results.filter(r=>r.status!==200).every(r=>r.j.error==='ALREADY_STAKED'));
  assert.equal((await a('GET','/api/stakes')).j.wallet.balance,150);
  const round=(await b('GET','/api/rounds/opening-stakes')).j;assert.equal(round.stakes.pot,50);assert.equal(round.stakes.entrants[0].hero,'7730');assert.equal(round.stakes.entrants[0].name,'Friend #7730');
  now+=61000;const made=await b('POST','/api/rounds',{profile:'standard',stake:true});assert.equal(made.status,200);assert.equal(made.j.stake,50);
  now+=61000;const bad=await b('POST','/api/rounds',{profile:'sprint',stake:true});assert.equal(bad.j.error,'STAKE_PROFILE');
  const csrf=await fetch(origin+'/api/rounds/opening-stakes/stake',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'});assert.equal(csrf.status,403);
 }finally{app.server.close();}
});

test('concurrency: four worker threads on one SQLite file race the same 20 sessions; each stakes once, invariants hold',async()=>{
 const file=path.join(tmp,'race-'+process.pid+'-'+Date.now()+'.sqlite');
 try{
  const main=new ArenaStore(file,{clock:()=>T0});main.close();
  const url=pathToFileURL(path.join(root,'server','store.mjs')).href;
  const src=`const {parentPort,workerData}=require('node:worker_threads');import(workerData.url).then(({ArenaStore})=>{const s=new ArenaStore(workerData.file,{clock:()=>workerData.T0,seed:false});const out={ok:0,codes:{}};for(let k=0;k<3;k++)for(let i=0;i<20;i++){try{s.stake('opening-stakes','race'+((i+workerData.n*5)%20),String(i+1));out.ok++;}catch(e){out.codes[e.code||e.message]=(out.codes[e.code||e.message]||0)+1;}}s.close();parentPort.postMessage(out);});`;
  const runs=await Promise.all([0,1,2,3].map(n=>new Promise((res,rej)=>{const w=new Worker(src,{eval:true,workerData:{url,file,T0,n}});w.once('message',res);w.once('error',rej);})));
  assert.equal(runs.reduce((a,r)=>a+r.ok,0),20,JSON.stringify(runs));
  for(const r of runs)assert.deepEqual(Object.keys(r.codes).filter(c=>c!=='ALREADY_STAKED'),[],JSON.stringify(r.codes));
  const s=new ArenaStore(file,{clock:()=>T0,seed:false});
  try{const r=s.round('opening-stakes','x');assert.equal(r.stakes.pot,1000);assert.equal(r.stakes.entrants.length,20);
   for(let i=0;i<20;i++)assert.equal(bal(s,'race'+i),150);
   assert.equal(s.stakeInfo('x').invariant.ok,true);}finally{s.close();}
 }finally{cleanup(file);}
});

test('migration: a database from the previous release (no stake tables, live data) opens, keeps its data and gains the stake round',()=>{
 const file=path.join(tmp,'old-'+process.pid+'-'+Date.now()+'.sqlite');
 try{
  const db=new DatabaseSync(file);
  // Schema of release ac735be (server/store.mjs + server/funding.mjs), with one claimed winner round and one live round.
  db.exec(`CREATE TABLE sessions(token TEXT PRIMARY KEY,player TEXT UNIQUE NOT NULL,name TEXT NOT NULL,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
   CREATE TABLE rounds(id TEXT PRIMARY KEY,state TEXT NOT NULL);
   CREATE TABLE attempts(id TEXT PRIMARY KEY,player TEXT NOT NULL,round_id TEXT NOT NULL,revision INTEGER NOT NULL,level TEXT NOT NULL,started INTEGER NOT NULL,expires INTEGER NOT NULL,result TEXT,submission_hash TEXT,actions TEXT,hero TEXT DEFAULT '3412');
   CREATE TABLE awards(round_id TEXT PRIMARY KEY,player TEXT NOT NULL,amount INTEGER NOT NULL,at INTEGER NOT NULL);
   CREATE TABLE sponsor_budget(id INTEGER PRIMARY KEY CHECK(id=1),initial INTEGER NOT NULL,available INTEGER NOT NULL CHECK(available>=0));
   CREATE TABLE prize_reservations(round_id TEXT PRIMARY KEY,amount INTEGER NOT NULL CHECK(amount>0),status TEXT NOT NULL CHECK(status IN ('reserved','released','paid')));`);
  const old=(id,extra)=>{const r=A.createRound(id,T0-3600000,'standard',{waiting:true});delete r.stake;Object.assign(r,extra);return r;};
  const won=old('old-won',{phase:'finished',outcome:'winner',leader:'w',prizeClaimed:true,prizePaid:1000,finishedAt:T0-DAY+60000}),live=old('opening-standard',{});
  for(const r of [won,live])db.prepare('INSERT INTO rounds VALUES(?,?)').run(r.id,JSON.stringify(r));
  db.exec(`INSERT INTO sponsor_budget VALUES(1,20000,18000);INSERT INTO prize_reservations VALUES('old-won',1000,'paid');INSERT INTO prize_reservations VALUES('opening-standard',1000,'reserved');INSERT INTO awards VALUES('old-won','w',1000,${T0-DAY});`);
  db.close();
  const s=new ArenaStore(file,{clock:()=>T0});
  try{
   const ids=s.list('me').map(r=>r.id);assert.ok(ids.includes('old-won')&&ids.includes('opening-standard')&&ids.includes('opening-stakes'),ids.join());
   assert.equal(s.round('old-won','me').stake,0,'an old round without the field is a free round');assert.equal(s.balance('w'),1000,'old awards kept');
   const eco=s.economy();assert.equal(eco.invariant,true);assert.equal(eco.paid,1000);assert.equal(eco.reserved,1000,'stake round reserved nothing');
   s.stake('opening-stakes','m','1');assert.equal(s.stakeInfo('m').wallet.balance,150);assert.equal(s.stakeInfo('m').invariant.ok,true);
  }finally{s.close();}
  const again=new ArenaStore(file,{clock:()=>T0});try{assert.equal(again.list('me').filter(r=>r.id==='opening-stakes').length,1,'reopening does not seed twice');assert.equal(again.round('opening-stakes','m').stakes.pot,50);}finally{again.close();}
 }finally{cleanup(file);}
});
