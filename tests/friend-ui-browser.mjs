// The Friend as the star, in the real UI (file://, no server): lesson results, the reveal, the chooser, My Runs.
// Run: node tests/friend-ui-browser.mjs [index.html]
import { chromium } from 'playwright';
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import path from 'node:path';
const require=createRequire(import.meta.url),root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const levels=require('../src/cutaway-levels.js'),{solve}=require('./solve.cjs');
const html=process.argv[2]?path.resolve(process.argv[2]):path.join(root,'index.html');
const key={N:'ArrowUp',S:'ArrowDown',E:'ArrowRight',W:'ArrowLeft',WAIT:'Space',VENT:'KeyE',EMP:'KeyQ',LIGHT:'KeyL'};
let pass=0,fail=0;const ok=(n,c)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n);};
const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:1440,height:900}});
await ctx.route('https://rpc.mainnet.chain.robinhood.com/**',r=>r.abort());
const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('file://'+html);await p.waitForTimeout(800);
// 1. The home portrait walks (its pixels change over time) unless MOTION is off.
const portrait=()=>p.evaluate(()=>document.querySelector('.hero-portrait').toDataURL());
const a1=await portrait();await p.waitForTimeout(1300);const a2=await portrait();ok('home portrait is animated',a1!==a2);
// 2. Lesson 1 without rewinds ends as LESSON CLEARED with a first-clear celebration, not as practice.
await p.locator('.play-now').click();await p.waitForTimeout(600);
const lesson=levels.find(l=>l.id==='cut-00'),route=solve(lesson);for(const a of route.actions){await p.keyboard.press(key[a]);await p.waitForTimeout(110);}await p.waitForTimeout(1700);
const title=await p.locator('#dialogTitle').innerText(),sheet=await p.locator('#dialogContent').innerText();
ok('lesson result title: '+title,title==='LESSON CLEARED');
ok('no practice wording without rewinds',!/PRACTICE|Rewinds make this/i.test(sheet));
ok('first clear is celebrated',/FIRST LESSON CLEAR/.test(sheet));
const stage=await p.locator('.res-stage').count()?await p.locator('.res-stage').evaluate(c=>c.getBoundingClientRect().height):0;ok('result stage shows the Friend large ('+stage+' px tall)',stage>=140);
await p.keyboard.press('Escape');await p.waitForTimeout(200);
// 3. A rewind makes the lesson practice, and says so.
await p.locator('#retry').click();await p.waitForTimeout(300);for(const a of route.actions.slice(0,3)){await p.keyboard.press(key[a]);await p.waitForTimeout(110);}await p.keyboard.press('KeyZ');await p.waitForTimeout(150);
const rest=route.actions.slice(2);for(const a of rest){await p.keyboard.press(key[a]);await p.waitForTimeout(110);}await p.waitForTimeout(1700);
ok('rewound lesson reads as practice: '+(await p.locator('#dialogContent .stamp').innerText()),(await p.locator('#dialogTitle').innerText())==='LESSON CLEARED'&&(await p.locator('#dialogContent .stamp').innerText())==='PRACTICE');
await p.keyboard.press('Escape');await p.locator('#back').click();await p.waitForTimeout(300);
// 4. Picking a Friend opens the reveal; it names the Friend and closes on navigation.
await p.locator('#friend').click();await p.waitForTimeout(250);
ok('chooser shows who is playing now',/PLAYING NOW\s*#3412/i.test(await p.locator('.nowplaying').innerText()));
ok('chooser marks the current guest card',(await p.locator('[data-friend="3412"] .nowtag').count())===1);
await p.locator('[data-friend="7730"]').click();await p.waitForTimeout(500);
ok('reveal shows #7730 Hoverer',/#7730[\s\S]*HOVERER/.test(await p.locator('#friendReveal').innerText().catch(()=>'')));
ok('reveal leaves the top bar clickable',await p.locator('#friend').isEnabled()&&!(await p.evaluate(()=>{const r=document.getElementById('friend').getBoundingClientRect(),e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!e.closest('#friendReveal');})));
await p.locator('nav button[data-route="solo"]').click();await p.waitForTimeout(300);
ok('reveal closes on navigation',(await p.locator('#friendReveal').count())===0);
// 5. My Runs shows the Friend of each run and an English date.
await p.locator('button[data-route="replays"]').first().click();await p.waitForTimeout(400);
const row=await p.locator('.replayrow').first().innerText();
ok('My Runs row names the Friend and an English date: '+row.replace(/\s+/g,' ').slice(0,80),/#3412/.test(row)&&/[A-Z][a-z]{2} \d{1,2}, \d{4}/.test(row));
ok('My Runs row draws the Friend sprite',(await p.locator('.replayrow canvas[data-fid="3412"][data-drawn="1"]').count())>0);
ok('no page errors '+errors.join(' | '),!errors.length);
await b.close();console.log(pass+'/'+(pass+fail)+' passed');process.exit(fail?1:0);
