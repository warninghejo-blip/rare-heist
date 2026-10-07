// DEMO STAKE ROUNDS in the real UI against the real server (in-memory SQLite, controlled clock). Play money only.
//  - two guest sessions (Friends #7730 and #5555) stake on the opening stake round through the API; #7730 clears it;
//  - the browser sees the pot, the DEMO badge, the 80/10/10 bar and the entrants as Friends, then stakes 100 DEMO RF
//    from the stake sheet, raids, clears and keeps the vault: pot 300, would burn 30, wallet 100;
//  - the clock passes the deadline: settlement card "Friend #<you> took 240 DEMO RF · 30 DEMO RF burned", wallet 255,
//    the live "would have burned" counter and the settled history;
//  - NEW STAKE ROUND with a single clearing session refunds the stake at the end;
//  - RF ECONOMY: the dashed stake pipe, the DEMO ledger line from the server and the optional calculator term;
//  - phone width: no sideways scrolling. Screenshots go to SHOTS (default ../../../_tmp/stakes/shots).
// Run after `node build.mjs`: node tests/stakes-browser.mjs
import {chromium} from 'playwright';
import {createApp} from '../server/app.mjs';
import {createRequire} from 'node:module';import {createHash} from 'node:crypto';import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';import path from 'node:path';
const require=createRequire(import.meta.url),SOL=require('../src/solutions.js');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),shots=process.env.SHOTS||path.join(root,'..','..','..','_tmp','stakes','shots');mkdirSync(shots,{recursive:true});
let pass=0,fail=0;const ok=(n,c,d='')=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(d&&!c?' — '+d:''));};
const key={N:'ArrowUp',S:'ArrowDown',E:'ArrowRight',W:'ArrowLeft',WAIT:'Space',VENT:'KeyE',EMP:'KeyQ',LIGHT:'KeyL'};
const route=SOL['last-cutaway'].actions;

let now=Math.floor(Date.now()/1000)*1000;
const app=createApp({dbFile:':memory:',clock:()=>now,minActionMs:0});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.server.address().port;
function client(){let cookie='',csrf='';return async(method,url,body)=>{const r=await fetch(origin+url,{method,headers:{origin,'content-type':'application/json',cookie,'x-rh-csrf':csrf},body:method==='POST'?JSON.stringify(body||{}):undefined});const sc=r.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];const j=await r.json();if(j.csrf)csrf=j.csrf;if(r.status!==200)throw Error(url+' '+r.status+' '+JSON.stringify(j));return j;};}
const B=client(),C=client();await B('POST','/api/session');await C('POST','/api/session');
await B('POST','/api/rounds/opening-stakes/stake',{heroId:'7730'});await C('POST','/api/rounds/opening-stakes/stake',{heroId:'5555'});
{const e=await B('POST','/api/rounds/opening-stakes/enter',{heroId:'7730'});const f=await B('POST','/api/rounds/opening-stakes/finish',{ticket:e.ticket,actions:route});if(f.result!=='leader')throw Error('scenario clear failed');await B('POST','/api/rounds/opening-stakes/skip');}

const b=await chromium.launch(),errors=[];
async function open(viewport){const ctx=await b.newContext({viewport});ctx.setDefaultTimeout(8000);await ctx.route('https://rpc.mainnet.chain.robinhood.com/**',r=>r.abort());
 // A Windows checkout serves CRLF; browsers hash inline scripts after normalising to LF. Serve LF with matching hashes.
 await ctx.route(origin+'/',async r=>{const res=await r.fetch(),body=(await res.text()).replace(/\r\n/g,'\n'),hashes=[...body.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>"'sha256-"+createHash('sha256').update(m[1]).digest('base64')+"'"),headers={...res.headers()};headers['content-security-policy']=headers['content-security-policy'].replace(/script-src [^;]+;/,'script-src '+hashes.join(' ')+';');await r.fulfill({response:res,body,headers});});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/');await p.waitForTimeout(900);await p.evaluate(()=>document.getElementById('friendReveal')?.remove());return p;}
const p=await open({width:1440,height:1000});
const txt=async s=>(await p.locator(s).first().innerText().catch(()=>'')).replace(/\s+/g,' ').trim();
const nav=async r=>{await p.evaluate(r=>document.querySelector('nav [data-route="'+r+'"]').click(),r);await p.waitForTimeout(800);};
const play=async actions=>{for(const a of actions){await p.keyboard.press(key[a]);await p.waitForTimeout(110);}await p.waitForTimeout(1500);};
const until=(fn,arg,t=9000)=>p.waitForFunction(fn,arg,{timeout:t}).catch(()=>{});
try{
 const me=await p.evaluate(()=>RareHeistView().hero);
 await nav('last');await p.locator('.roundlist button.stake').first().click();await until(()=>!!document.getElementById('stakePanel'));await p.waitForTimeout(400);
 const panel=await txt('#stakePanel');
 ok('stake tab is labelled with its tier: '+(await txt('.roundlist button.stake')),/^STREET STAKE 100 RF \/ V0 \/ OPEN$/.test(await txt('.roundlist button.stake')));
 ok('pot of two stakes with the DEMO badge: '+panel.slice(0,90),/2 × 100 DEMO RF STAKES/.test(panel)&&/Pot 200 DEMO RF/.test(panel)&&/DEMO, PLAY MONEY/.test(panel)&&(await txt('#stakePot'))==='200');
 ok('80/10/10 bar if it ended now: 70 to the winner, 30 burns ('+(await txt('.potbar'))+')',/160 80% TO THE WINNER/.test(await txt('.potbar'))&&(await txt('#stakeWouldBurn'))==='20');
 ok('entrants appear as Friends with their sprites: '+(await txt('.entrants')),/Friend #7730/.test(await txt('.entrants'))&&/Friend #5555/.test(await txt('.entrants'))&&(await p.locator('.entrants canvas[data-fid]').count())===2);
 ok('wallet shows the 200 DEMO RF daily allowance',(await txt('#stakeWallet'))==='200');
 ok('the panel says nothing real moves',/No real RF is staked, paid or burned/.test(panel)&&(await p.locator('.stakes').evaluate(e=>getComputedStyle(e).borderTopStyle))==='dashed');
 ok('raid button asks for the stake: '+(await txt('#raidShared')),(await txt('#raidShared'))==='STAKE 100 DEMO RF AND RAID');
 await p.locator('#stakePanel').screenshot({path:path.join(shots,'stake-panel-open.png')});
 await p.locator('#raidShared').click();await p.waitForTimeout(300);
 ok('stake sheet explains the rules before anything moves: '+(await txt('#dialogContent')).slice(0,80),/STAKE 100 DEMO RF/.test(await txt('#dialogContent'))&&/200 now, 100 after this stake/.test(await txt('#dialogContent'))&&/80% of the pot and 10% is burned/.test(await txt('#dialogContent')));
 await p.screenshot({path:path.join(shots,'stake-sheet.png')});
 await p.locator('#stakeYes').click();await p.waitForTimeout(2600);
 ok('staking starts the raid',await p.evaluate(()=>RareHeistView().screen)==='play');
 await play(route);ok('cleared the stake vault',await p.evaluate(()=>RareHeistView().state.status)==='won');
 await p.locator('#submitShared').click();await p.waitForTimeout(1500);await p.locator('#skipChange').click();await p.waitForTimeout(1200);
 ok('after my clear: pot 300, would burn 30, wallet 100, me listed as an entrant ('+(await txt('#stakeHead'))+', pot '+(await txt('#stakePot'))+')',(await txt('#stakeHead'))==='3 × 100 DEMO RF STAKES'&&(await txt('#stakePot'))==='300'&&(await txt('#stakeWouldBurn'))==='30'&&(await txt('#stakeWallet'))==='100'&&/\(you\)/.test(await txt('.entrants')));
 ok('no sponsor CLAIM button on a stake round',(await p.locator('#claimPrize').count())===0);
 await p.locator('.shared-layout aside').screenshot({path:path.join(shots,'stake-lobby-live.png')});
 // The clock passes the quiet window: the round settles on the next poll.
 now+=11*60*1000;await until(()=>!!document.getElementById('stakeSettlement'),null,12000);await p.waitForTimeout(300);
 const settle=await txt('#stakeSettlement');
 ok('settlement card: Friend #'+me+' took 240 DEMO RF · 30 DEMO RF burned ('+settle.slice(0,120)+')',new RegExp('Friend #'+me+' took 240 DEMO RF · 30 DEMO RF burned').test(settle)&&/That is you/.test(settle)&&(await p.locator('#stakeSettlement canvas[data-fid="'+me+'"]').count())===1);
 ok('wallet credited: 150 + 105 = 255; no "retries are free" on a settled round',(await txt('#stakeWallet'))==='340'&&!/Retries are free/.test(await txt('#stakePanel')));
 ok('live counter: with real RF, stake rounds would have burned 45 RF ('+(await txt('.stakes-counter'))+')',(await txt('#stakeBurnedAll'))==='30 RF');
 ok('settled history lists the round: '+(await txt('.stakehist')),/took 240 DEMO RF · 30 DEMO RF burned/.test(await txt('.stakehist')));
 await p.locator('.shared-layout aside').screenshot({path:path.join(shots,'stake-settled.png')});
 const server=await B('GET','/api/stakes');ok('server ledger: 150 staked = 105 paid + 45 burned, invariant passes',server.totals.stakes===300&&server.totals.paid===240&&server.totals.burned===30&&server.totals.rewards===30&&server.invariant.ok===true);
 // A new stake round with only one clearing session refunds.
 await p.locator('#newStake').click();await p.waitForTimeout(1200);
 ok('NEW STAKE ROUND opens an empty pot',(await txt('#stakePot'))==='0'&&(await txt('#stakeHead'))==='0 × 100 DEMO RF STAKES'&&/No stakes yet/.test(await txt('#stakePanel')));
 await p.locator('#raidShared').click();await p.waitForTimeout(300);await p.locator('#stakeYes').click();await p.waitForTimeout(2600);await play(route);
 await p.locator('#submitShared').click();await p.waitForTimeout(1500);await p.locator('#skipChange').click();await p.waitForTimeout(1200);
 ok('staked again: wallet 205',(await txt('#stakeWallet'))==='240');
 now+=11*60*1000;await until(()=>!!document.getElementById('stakeSettlement'),null,12000);await p.waitForTimeout(300);
 ok('uncontested round refunds: '+(await txt('#stakeSettlement')).slice(0,120),/Every stake refunded: 100 DEMO RF back to 1 entrant/.test(await txt('#stakeSettlement'))&&/A payout needs two/.test(await txt('#stakeSettlement')));
 ok('wallet back to 255 after the refund',(await txt('#stakeWallet'))==='340');
 await p.locator('#stakePanel').screenshot({path:path.join(shots,'stake-refund.png')});
 // RF ECONOMY page.
 await nav('studio');await p.locator('[data-mode="economy"]').click();await until(()=>/Ledger check/.test(document.getElementById('ecStakes')?.textContent||''));
 ok('diagram: a dashed STAKE ROUNDS pipe (simulated)',(await p.locator('.pipe.sim',{hasText:'STAKE ROUNDS'}).count())===1&&(await p.locator('.pipe.sim',{hasText:'STAKE ROUNDS'}).evaluate(e=>getComputedStyle(e).borderTopStyle))==='dashed');
 ok('DEMO ledger line from the server: '+(await txt('#ecStakes')),/2 settled, 30 DEMO RF burned, 240 paid to winners, 100 refunded, 0 in live pots/.test(await txt('#ecStakes'))&&/Ledger check passes/.test(await txt('#ecStakes')));
 ok('calculator: by default 10 rounds a day × 6 players × 100 × 80% × 10% × 30 days = 14,400 RF of 59,400 RF ('+(await txt('#calcStakes'))+' / '+(await txt('#calcMonth'))+')',(await txt('#calcStakes'))==='14,400 RF'&&(await txt('#calcMonth'))==='59,400 RF');
 await p.fill('#calc-stakeRounds','20');ok('20 stake rounds a day doubles the stake term: 28,800 RF ('+(await txt('#calcStakes'))+')',(await txt('#calcStakes'))==='28,800 RF'&&(await txt('#calcMonth'))==='73,800 RF');
 ok('RF ECONOMY headline: settled stake totals and the last winner from the server ('+(await txt('#ecStakeBurned'))+')',(await txt('#ecStakeBurned'))==='30 DEMO RF'&&(await txt('#ecSettled'))==='2'&&/took 240 DEMO RF · 30 DEMO RF burned/.test(await txt('#ecWinners')));
 await p.locator('.econmap').screenshot({path:path.join(shots,'rf-economy-stakes-flow.png')});await p.locator('.calc').screenshot({path:path.join(shots,'rf-economy-stakes-calc.png')});
 // Phone: a guest opens a fresh stake round and stakes on it.
 {const made=await C('POST','/api/rounds',{profile:'standard',stake:true});await C('POST','/api/rounds/'+made.id+'/stake',{heroId:'5555'});}
 const m=await open({width:390,height:844});await m.evaluate(()=>(document.querySelector('.topbar nav [data-route="last"]')||document.querySelector('.modes [data-route="last"]')).click());await m.waitForTimeout(1500);
 await m.locator('.roundlist button.stake').first().click();await m.waitForTimeout(900);
 ok('phone: stake panel visible, no sideways scrolling',await m.locator('#stakePanel').isVisible()&&await m.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
 await m.locator('#stakePanel').screenshot({path:path.join(shots,'stake-panel-phone.png')});
 ok('no page errors '+errors.slice(0,2).join(' | '),errors.length===0);
}catch(e){ok('scenario ran to the end: '+e.message,false);await p.screenshot({path:path.join(shots,'stake-failure.png')}).catch(()=>{});}
console.log(pass+'/'+(pass+fail)+' passed');await b.close();app.server.close();process.exit(fail?1:0);
