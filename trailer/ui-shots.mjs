// Real interface captures for the v2 trailer (trailer/cut.html), written to trailer/ui/*.png at 2x.
//  - stake-open.png / stake-settled.png: a DEMO stake round in the real UI against the real game server
//    (in-memory database, controlled clock, play money only), same scenario as tests/stakes-browser.mjs:
//    two other sessions stake and one clears, you stake 50 DEMO RF, clear and keep the vault, the clock runs out.
//  - shop-*.png, shop-banner.png: the STUDIO LIVE BURN shop as it is on the public site right now (read only:
//    no wallet is connected, nothing is signed or sent).
// Usage: node trailer/ui-shots.mjs [--live=https://rareheist-bc89faa0.sslip.io/]
import {chromium} from 'playwright';
import {createApp} from '../server/app.mjs';
import {createRequire} from 'node:module';import {createHash} from 'node:crypto';import fs from 'node:fs';
import {fileURLToPath} from 'node:url';import path from 'node:path';
const require=createRequire(import.meta.url),SOL=require('../src/solutions.js');
const here=path.dirname(fileURLToPath(import.meta.url)),OUT=path.join(here,'ui');fs.mkdirSync(OUT,{recursive:true});
const opt=Object.fromEntries(process.argv.slice(2).filter(a=>a.startsWith('--')).map(a=>{const [k,...v]=a.slice(2).split('=');return [k,v.join('=')];}));
const LIVE=opt.live||'https://rareheist-bc89faa0.sslip.io/';
const key={N:'ArrowUp',S:'ArrowDown',E:'ArrowRight',W:'ArrowLeft',WAIT:'Space',VENT:'KeyE',EMP:'KeyQ',LIGHT:'KeyL'},route=SOL['last-cutaway'].actions;
const b=await chromium.launch();
// ---- DEMO stake round, local server
{let now=Math.floor(Date.now()/1000)*1000;
 const app=createApp({dbFile:':memory:',clock:()=>now,minActionMs:0});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.server.address().port;
 function client(){let cookie='',csrf='';return async(method,url,body)=>{const r=await fetch(origin+url,{method,headers:{origin,'content-type':'application/json',cookie,'x-rh-csrf':csrf},body:method==='POST'?JSON.stringify(body||{}):undefined});const sc=r.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];const j=await r.json();if(j.csrf)csrf=j.csrf;if(r.status!==200)throw Error(url+' '+r.status+' '+JSON.stringify(j));return j;};}
 const B=client(),C=client();await B('POST','/api/session');await C('POST','/api/session');
 await B('POST','/api/rounds/opening-stakes/stake',{heroId:'7730'});await C('POST','/api/rounds/opening-stakes/stake',{heroId:'5555'});
 {const e=await B('POST','/api/rounds/opening-stakes/enter',{heroId:'7730'});const f=await B('POST','/api/rounds/opening-stakes/finish',{ticket:e.ticket,actions:route});if(f.result!=='leader')throw Error('scenario clear failed');await B('POST','/api/rounds/opening-stakes/skip');}
 const ctx=await b.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:3});ctx.setDefaultTimeout(8000);await ctx.route('https://rpc.mainnet.chain.robinhood.com/**',r=>r.abort());
 await ctx.route(origin+'/',async r=>{const res=await r.fetch(),body=(await res.text()).replace(/\r\n/g,'\n'),hashes=[...body.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>"'sha256-"+createHash('sha256').update(m[1]).digest('base64')+"'"),headers={...res.headers()};headers['content-security-policy']=headers['content-security-policy'].replace(/script-src [^;]+;/,'script-src '+hashes.join(' ')+';');await r.fulfill({response:res,body,headers});});
 const p=await ctx.newPage();p.on('pageerror',e=>console.log('page error',e.message));await p.goto(origin+'/');await p.waitForTimeout(900);await p.evaluate(()=>document.getElementById('friendReveal')?.remove());
 const nav=async r=>{await p.evaluate(r=>document.querySelector('nav [data-route="'+r+'"]').click(),r);await p.waitForTimeout(800);};
 await nav('last');await p.locator('.roundlist button.stake').first().click();await p.waitForFunction(()=>!!document.getElementById('stakePanel'));await p.waitForTimeout(400);
 await p.locator('#raidShared').click();await p.waitForTimeout(300);await p.locator('#stakeYes').click();await p.waitForTimeout(2600);
 for(const a of route){await p.keyboard.press(key[a]);await p.waitForTimeout(110);}await p.waitForTimeout(1500);
 await p.locator('#submitShared').click();await p.waitForTimeout(1500);await p.locator('#skipChange').click();await p.waitForTimeout(1200);
 await p.locator('#stakePanel').screenshot({path:path.join(OUT,'stake-open.png')});
 now+=11*60*1000;await p.waitForFunction(()=>!!document.getElementById('stakeSettlement'),null,{timeout:12000});await p.waitForTimeout(400);
 console.log('settled:',(await p.locator('#stakeSettlement').innerText()).replace(/\s+/g,' ').slice(0,140));
 await p.locator('#stakeSettlement').screenshot({path:path.join(OUT,'stake-settled.png')});
 await p.locator('#stakePanel').screenshot({path:path.join(OUT,'stake-panel-settled.png')});
 await ctx.close();app.server.close();}
// ---- STUDIO LIVE BURN shop, public site, read only
{const ctx=await b.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:2});const p=await ctx.newPage();
 await p.goto(LIVE,{waitUntil:'networkidle',timeout:60000});await p.waitForTimeout(1500);await p.keyboard.press('Escape');await p.evaluate(()=>document.getElementById('friendReveal')?.remove());
 await p.evaluate(()=>document.querySelector('nav [data-route="studio"]').click());await p.waitForTimeout(1000);
 await p.locator('[data-mode="live"]').click();await p.waitForTimeout(8000);
 const cards=p.locator('.itemcard');const n=await cards.count();for(let i=0;i<n;i++)await cards.nth(i).screenshot({path:path.join(OUT,'shop-'+i+'.png')});
 const banner=p.locator('.hazard, .beta, [class*="warn"]').first();if(await banner.count())await banner.screenshot({path:path.join(OUT,'shop-banner.png')}).catch(()=>{});
 console.log('shop cards',n,'| ledger:',(await p.locator('body').innerText()).match(/RF burned through Rare Heist:[^\n]*/)?.[0]);
 await ctx.close();}
await b.close();console.log('wrote',fs.readdirSync(OUT).join(' '));
