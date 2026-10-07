// DAILY HEIST in the real UI against the real server (in-memory SQLite, controlled clock). DEMO RF only.
//  - another session (Friend #7730) enters today's round and posts a clean run through the API;
//  - the browser opens DAILY: date, countdown, pot, entries, the split bar, the top 10 with Friend sprites and run
//    times, the tie-break line, the sealed
//    vault, the DEMO stamp and ENTER — <entry> RF · <tries> TRIES;
//  - it enters, gives up the first try (spent), wins the second with the stored route: PLAY starts the server clock,
//    the result shows turns and time, and an equal-turn slower run ranks below the faster one;
//  - a third session spends all tries without a clean run: the result and the lobby show Solvable in N turns with the
//    countdown to the solution unlock;
//  - the day closes: LAST 7 DAYS lists the winner with time, WATCH (the winning run) and WATCH SOLUTION (the stored
//    route, badged SOLUTION); PRACTICE opens the past vault from the history level, free (no ranking, nothing sent);
//  - a session without enough DEMO RF sees a disabled ENTER and the refill note; phone width has no sideways scroll.
// Screenshots go to SHOTS (default ../../../_tmp/v11/ui/shots). Run after `node build.mjs`: node tests/daily-browser.mjs
import {chromium} from 'playwright';
import {createApp} from '../server/app.mjs';
import {createRequire} from 'node:module';import {createHash} from 'node:crypto';import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';import path from 'node:path';
const require=createRequire(import.meta.url),DSOL=require('../src/daily-solutions.js');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),shots=process.env.SHOTS||path.join(root,'..','..','..','_tmp','v11','ui','shots');mkdirSync(shots,{recursive:true});
let pass=0,fail=0;const ok=(n,c,d='')=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(d&&!c?' — '+d:''));};
const key={N:'ArrowUp',S:'ArrowDown',E:'ArrowRight',W:'ArrowLeft',WAIT:'Space',VENT:'KeyE',EMP:'KeyQ',LIGHT:'KeyL'};

const DAY1=Date.UTC(2026,9,8,9,0,0);let now=DAY1-58000;
const app=createApp({dbFile:':memory:',clock:()=>now,minActionMs:0});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.server.address().port;
function client(){let cookie='',csrf='';return async(method,url,body)=>{const r=await fetch(origin+url,{method,headers:{origin,'content-type':'application/json',cookie,'x-rh-csrf':csrf},body:method==='POST'?JSON.stringify(body||{}):undefined});const sc=r.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];const j=await r.json();if(j.csrf)csrf=j.csrf;if(r.status!==200)throw Error(url+' '+r.status+' '+JSON.stringify(j));return j;};}
const B=client();await B('POST','/api/session');
const entered=await B('POST','/api/daily/enter',{heroId:'7730'}),levelId=entered.levelId,route=DSOL[levelId].actions,P=entered.prices;
const tries=P.attempts??(entered.myEntry.attemptsLeft);
await B('POST','/api/daily/start');now=DAY1;
{const v=await B('POST','/api/daily/submit',{actions:route});if(!v.accepted||v.ms!==58000)throw Error('scenario clear failed '+JSON.stringify([v.accepted,v.ms]));}
const SOLV=DSOL[levelId].turns;

const b=await chromium.launch(),errors=[];
async function open(viewport){const ctx=await b.newContext({viewport});ctx.setDefaultTimeout(8000);await ctx.route('https://rpc.mainnet.chain.robinhood.com/**',r=>r.abort());
 // A Windows checkout serves CRLF; browsers hash inline scripts after normalising to LF. Serve LF with matching hashes.
 await ctx.route(origin+'/',async r=>{const res=await r.fetch(),body=(await res.text()).replace(/\r\n/g,'\n'),hashes=[...body.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>"'sha256-"+createHash('sha256').update(m[1]).digest('base64')+"'"),headers={...res.headers()};headers['content-security-policy']=headers['content-security-policy'].replace(/script-src [^;]+;/,'script-src '+hashes.join(' ')+';');await r.fulfill({response:res,body,headers});});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/');await p.waitForTimeout(900);await p.evaluate(()=>document.getElementById('friendReveal')?.remove());return p;}
const p=await open({width:1440,height:900});
const txt=async(s,pg=p)=>(await pg.locator(s).first().innerText().catch(()=>'')).replace(/\s+/g,' ').trim();
const nav=async(r,pg=p)=>{await pg.evaluate(r=>document.querySelector('nav [data-route="'+r+'"]').click(),r);await pg.waitForTimeout(900);};
const play=async actions=>{for(const a of actions){await p.keyboard.press(key[a]);await p.waitForTimeout(120);}await p.waitForTimeout(1600);};
const until=(fn,arg,t=9000,pg=p)=>pg.waitForFunction(fn,arg,{timeout:t}).catch(()=>{});
try{
 await nav('daily');await until(()=>!!document.getElementById('dailyClock'));
 ok('DAILY nav and lobby: date OCT 08 and a running countdown ('+(await txt('#dailyToday'))+' / '+(await txt('#dailyClock'))+')',/OCT 08/.test(await txt('#dailyToday'))&&/^15:00:00$|^14:59:5\d$/.test(await txt('#dailyClock')));
 ok('pot and entries from the server ('+(await txt('#dailyPot'))+' / '+(await txt('#dailyEntries'))+')',(await txt('#dailyPot'))===String(P.entry)&&(await txt('#dailyEntries'))==='1');
 ok('split bar 80/10/10 ('+(await txt('#dailySplit'))+')',/80% WINNER/.test(await txt('#dailySplit'))&&/10% BURNED/.test(await txt('#dailySplit'))&&/10% FRIEND REWARDS/.test(await txt('#dailySplit')));
 ok('top 10 lists Friend #7730 with its sprite, turns and time 0:58 ('+(await txt('.leaders'))+')',/Friend #7730/.test(await txt('.leaders'))&&(await p.locator('.leaders canvas[data-fid="7730"]').count())===1&&new RegExp(String(route.length)).test(await txt('.leaders'))&&(await txt('.leaders .lt'))==='0:58');
 ok('tie-break line under TOP 10',(await txt('.tieline'))==='Fewest turns wins · ties go to the faster run');
 ok('level sealed until you enter, DEMO stamp on the page',(await p.locator('.sealed').count())===1&&(await p.locator('#dailyThumb').count())===0&&/DEMO, PLAY MONEY/.test(await txt('#dailyPage .pagehead')));
 const enterText=await txt('#dailyEnter');
 ok('ENTER button: '+enterText,enterText==='ENTER — '+P.entry+' RF · '+tries+' TRIES'&&(await p.locator('#dailyExtra').count())===0);
 await p.screenshot({path:path.join(shots,'daily-lobby-1440.png'),fullPage:true});
 await p.locator('#dailyEnter').click();ok('enter sheet states the bundle before anything moves',new RegExp(P.entry+' DEMO RF for '+tries+' tries').test(await txt('#dialogContent')));
 await p.locator('#dailyYes').click();await until(()=>document.body.dataset.screen==='play');await p.waitForTimeout(400);
 ok('play screen: DAILY badge and TRY 1 OF '+tries+' ('+(await txt('#sharedBanner'))+')',(await txt('#modeBadge'))==='DAILY'&&new RegExp('TRY 1 OF '+tries).test(await txt('#sharedBanner'))&&await p.locator('#undo').isDisabled());
 // Try 1: one step, then RETRY gives it up (sent, spent).
 await p.keyboard.press(key[route[0]]);await p.waitForTimeout(200);await p.keyboard.press('KeyR');await p.waitForTimeout(300);
 ok('RETRY asks before giving up a ranked try',(await txt('#dialogTitle'))==='GIVE UP THIS TRY?');
 await p.locator('#giveUpYes').click();await until(()=>!!document.getElementById('resultDailyNext')||/No tries left|Not sent/.test(document.getElementById('dailyResult')?.textContent||''));
 ok('given-up try is sent and spent: '+(await txt('#dailyResult')),(await txt('#dialogTitle'))==='TRY GIVEN UP'&&new RegExp('NEXT TRY — '+(tries-1)+' LEFT').test(await txt('#resultDailyNext')));
 // Try 2: the stored clean route.
 await p.locator('#resultDailyNext').click();await p.waitForTimeout(500);ok('second try starts: TRY 2 OF '+tries,new RegExp('TRY 2 OF '+tries).test(await txt('#sharedBanner')));
 ok('PLAY started the server clock: the banner shows the run time ('+(await txt('#sharedBanner'))+')',/ \/ \d+:\d\d$/.test(await txt('#sharedBanner')));
 now+=102000;await play(route);await until(()=>document.getElementById('modal').open&&document.getElementById('dialogTitle').textContent==='CLEAN RUN'&&/RANK NOW \d/.test(document.getElementById('dailyResult')?.innerText.replace(/\s+/g,' ')||''));
 const res=await txt('#dailyResult');
 ok('clean run: turns and time 1:42, rank 2 (same turns, slower than 0:58), tries left ('+res+')',(await txt('#dialogTitle'))==='CLEAN RUN'&&(await txt('#dailyRankNow'))==='2'&&new RegExp('THIS RUN '+route.length+' TURNS · 1:42').test(res)&&new RegExp('YOUR BEST '+route.length+' TURNS · 1:42').test(res)&&new RegExp('TRIES LEFT '+(tries-2)).test(res));
 await p.screenshot({path:path.join(shots,'daily-result-1440.png')});
 await p.locator('#resultDailyLobby').click();await until(()=>!!document.getElementById('dailyClock'));
 ok('lobby after entering: vault preview, best, rank and time, top 10 times 0:58 then 1:42, pot '+(2*P.entry),(await p.locator('#dailyThumb').count())===1&&(await txt('#dailyBest'))===String(route.length)&&/RANK 2 · 1:42/.test(await txt('.daily-stats'))&&(await txt('#dailyPot'))===String(2*P.entry)&&JSON.stringify(await p.locator('.leaders .lt').allInnerTexts())==='["0:58","1:42"]');
 await p.screenshot({path:path.join(shots,'daily-entered-1440.png'),fullPage:true});
 // Phone width.
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(400);await p.screenshot({path:path.join(shots,'daily-lobby-390.png'),fullPage:true});
 ok('phone: no sideways scrolling on the Daily lobby',await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
 await p.setViewportSize({width:1440,height:900});
 // A third session spends every try without a clean run: Solvable in N turns, the solution unlocks at close.
 {const r=await open({width:1440,height:900});await nav('daily',r);await until(()=>!!document.getElementById('dailyEnter'),null,9000,r);
  await r.locator('#dailyEnter').click();await r.locator('#dailyYes').click();await until(()=>document.body.dataset.screen==='play',null,9000,r);await r.waitForTimeout(400);
  for(let i=1;i<=tries;i++){await r.keyboard.press(key[route[0]]);await r.waitForTimeout(200);await r.keyboard.press('KeyR');await r.waitForTimeout(300);await r.locator('#giveUpYes').click();
   await until(last=>last?!!document.getElementById('resultSolvable')||/No tries|Not sent/.test(document.getElementById('dailyResult')?.textContent||''):!!document.getElementById('resultDailyNext'),i===tries,9000,r);await r.waitForTimeout(300);
   if(i<tries){await r.locator('#resultDailyNext').click();await until(()=>document.body.dataset.screen==='play'&&!document.getElementById('modal').open,null,9000,r);await r.waitForTimeout(300);}}
  const card=await txt('#resultSolvable',r);
  ok('last try spent with no clean run: the result shows the solvable card ('+card+')',new RegExp('Solvable in '+SOLV+' turns','i').test(card)&&/Solution unlocks at 00:00 UTC · \d\d:\d\d:\d\d/.test(card)&&(await r.locator('#resultDailyNext').count())===0);
  await r.screenshot({path:path.join(shots,'daily-solvable-result-1440.png')});
  await r.locator('#resultDailyLobby').click();await until(()=>!!document.getElementById('dailySolvable'),null,9000,r);
  ok('lobby with 0 tries and no clean run: Solvable in '+SOLV+' turns and the unlock countdown ('+(await txt('#dailySolvable',r))+')',new RegExp('Solvable in '+SOLV+' turns','i').test(await txt('#dailySolvable',r))&&/^1[45]:\d\d:\d\d$/.test(await txt('#dailySolvable .solclock',r))&&(await r.locator('#dailyPlay').count())===0);
  await r.screenshot({path:path.join(shots,'daily-solvable-1440.png'),fullPage:true});
  await r.setViewportSize({width:390,height:844});await r.waitForTimeout(400);await r.screenshot({path:path.join(shots,'daily-solvable-390.png'),fullPage:true});
  ok('phone: the solvable lobby has no sideways scroll',await r.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));await r.context().close();}
 // The day closes: history, WATCH, WATCH SOLUTION, PRACTICE.
 now=Date.UTC(2026,9,9,9,0,0);await nav('street');await nav('daily');await until(()=>!!document.querySelector('[data-dwatch]'));
 ok('LAST 7 DAYS: OCT 08 won by Friend #7730 in 0:58 with WATCH and WATCH SOLUTION ('+(await txt('.dayrows'))+')',/OCT 08/.test(await txt('.dayrows'))&&/Friend #7730/.test(await txt('.dayrows'))&&/TURNS 0:58/.test(await txt('.dayrows .dt'))&&(await p.locator('[data-dwatch="2026-10-08"]').count())===1&&(await txt('[data-dsol="2026-10-08"]'))==='WATCH SOLUTION');
 ok('new day: fresh countdown, nobody entered, ENTER again',/OCT 09/.test(await txt('#dailyToday'))&&(await p.locator('#dailyEnter').count())===1&&(await txt('#dailyEntries'))==='0');
 await p.screenshot({path:path.join(shots,'daily-history-1440.png'),fullPage:true});
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(400);await p.screenshot({path:path.join(shots,'daily-history-390.png'),fullPage:true});
 ok('phone: history with WATCH SOLUTION has no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));await p.setViewportSize({width:1440,height:900});await p.waitForTimeout(300);
 await p.locator('[data-dsol="2026-10-08"]').click();await p.waitForTimeout(900);
 ok('WATCH SOLUTION plays the stored route as the solution ('+(await txt('#modeBadge'))+' / '+(await txt('#sharedBanner'))+')',(await txt('#modeBadge'))==='SOLUTION'&&!(await p.locator('#replayBar').isHidden())&&new RegExp('OCT 08 / THE SOLUTION / '+SOLV+' TURNS').test(await txt('#sharedBanner'))&&await p.evaluate(()=>document.querySelector('nav button.active')?.dataset.route==='daily'));
 await p.screenshot({path:path.join(shots,'daily-solution-1440.png')});
 await p.locator('#back').click();await until(()=>!!document.querySelector('[data-dwatch]'));
 await p.locator('[data-dwatch="2026-10-08"]').click();await p.waitForTimeout(800);
 ok('WATCH replays the winning run ('+(await txt('#sharedBanner'))+')',await p.evaluate(()=>RareHeistView().screen==='play')&&!(await p.locator('#replayBar').isHidden())&&/WINNING RUN BY FRIEND #7730/.test(await txt('#sharedBanner')));
 await p.locator('#back').click();await until(()=>!!document.querySelector('[data-dpractice]'));
 ok('BACK from a Daily replay returns to the Daily lobby',await p.evaluate(()=>document.body.dataset.screen==='daily'));
 await p.locator('[data-dpractice="2026-10-08"]').click();await p.waitForTimeout(700);
 const before=(await B('GET','/api/daily/history?limit=7'))[0];
 ok('history rows carry the level and the solution turns ('+before.solutionTurns+')',!!before.level&&before.solutionTurns===SOLV);
 ok('PRACTICE opens the past vault free: DAILY PRACTICE badge, not ranked',(await txt('#modeBadge'))==='DAILY PRACTICE'&&/FREE, NOT RANKED/.test(await txt('#sharedBanner')));
 await play(route);ok('a practice clear sends nothing and shows the normal sheet',(await txt('#dialogTitle'))!=='CLEAN RUN'&&(await p.locator('#dailyResult').count())===0&&JSON.stringify((await B('GET','/api/daily/history?limit=7'))[0])===JSON.stringify(before));
 await p.keyboard.press('Escape');
 // Not enough DEMO RF: drain a fresh session's wallet below the entry.
 const q=await open({width:1440,height:900});await nav('daily',q);await until(()=>!!document.getElementById('dailyEnter'),null,9000,q);
 for(const {player} of app.store.db.prepare('SELECT player FROM sessions').all())app.store.stakes.ensure(player);app.store.db.prepare('UPDATE stake_wallets SET balance=?').run(P.entry-1);await nav('street',q);await nav('daily',q);await until(()=>!!document.getElementById('dailyEnter'),null,9000,q);
 ok('insufficient balance: ENTER disabled with the refill note ('+(await txt('.daily-act',q))+')',await q.locator('#dailyEnter').isDisabled()&&/Not enough DEMO RF/.test(await txt('.daily-act',q)));
}catch(e){fail++;console.log('FAIL scenario: '+e.stack);}
ok('no page errors '+JSON.stringify(errors),errors.length===0);
await b.close();app.server.close();
console.log(pass+'/'+(pass+fail)+' passed');process.exit(fail?1:0);
