// Last Heist obstacle editor, in the real UI against the real server (in-memory DB), desktop and phone.
// Clear the opening vault, open ADD ONE OBSTACLE and drag pieces from the side palette:
//  - a wall that seals the EXIT: the solver proves every route blocked, PROVE YOUR CHANGE stays off;
//  - a wall off the last winning route: "still works", PROVE stays off;
//  - a camera on a ladder landing: refused with a reason, the placed wall stays;
//  - a harmless wall on the route (click the piece, then the cell): "still beatable", PROVE on;
// then prove it by clearing the changed vault and publish it; the server replays the proof (version 1).
// On a phone the same editor works by tapping a piece and then a cell.
// Run: node tests/editor-browser.mjs
import {chromium} from 'playwright';
import {createApp} from '../server/app.mjs';
import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{solve}=require('./solve.cjs'),A=require('../src/last-heist.js'),E=require('../src/engine.js'),SOL=require('../src/solutions.js'),S=require('../src/solver.js');
const key={N:'ArrowUp',S:'ArrowDown',E:'ArrowRight',W:'ArrowLeft',WAIT:'Space',VENT:'KeyE',EMP:'KeyQ',LIGHT:'KeyL'};
let pass=0,fail=0;const ok=(n,c)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n);};
// Cells for the scenario, from the same rules the server uses.
const seed=A.seed(),route=SOL['last-cutaway'].actions,round={level:seed,changes:[],referenceActions:route};
const walls=[];for(let y=1;y<seed.map.length-1;y+=2)for(let x=1;x<seed.map[0].length-1;x++)if(A.allowedCell(seed,x,y)){const l=A.mutationLevel(round,{kind:'wall',x,y}),breaks=!E.replay(l,route,'ghost').ok,r=S.solve(l,{maxTurns:A.MAX_ACTIONS,maxNodes:200000});walls.push({x,y,breaks,beatable:r.ok,proven:!r.ok&&r.proven,l,r});}
const sealed=walls.find(w=>w.breaks&&w.proven),missed=walls.find(w=>!w.breaks&&w.beatable),good=walls.find(w=>w.breaks&&w.beatable),landing={x:2,y:5};
if(!sealed||!missed||!good||A.allowedCell(seed,landing.x,landing.y))throw Error('Scenario cells not found on the current opening vault');

const app=createApp({dbFile:':memory:'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.server.address().port;
const b=await chromium.launch(),errors=[];
async function open(options){const ctx=await b.newContext(options);await ctx.route('https://rpc.mainnet.chain.robinhood.com/**',r=>r.abort());
 // A Windows checkout serves CRLF; browsers hash inline scripts after normalising to LF. Serve LF with matching hashes.
 await ctx.route(origin+'/',async r=>{const res=await r.fetch(),body=(await res.text()).replace(/\r\n/g,'\n'),hashes=[...body.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>"'sha256-"+createHash('sha256').update(m[1]).digest('base64')+"'"),headers={...res.headers()};headers['content-security-policy']=headers['content-security-policy'].replace(/script-src [^;]+;/,'script-src '+hashes.join(' ')+';');await r.fulfill({response:res,body,headers});});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/');await p.waitForTimeout(900);await p.evaluate(()=>document.getElementById('friendReveal')?.remove());return p;}
const play=async(p,actions)=>{for(const a of actions){await p.keyboard.press(key[a]);await p.waitForTimeout(120);}await p.waitForTimeout(1500);};
const cell=(p,x,y)=>p.evaluate(([x,y])=>{const c=document.getElementById('gameCanvas'),wrap=document.getElementById('boardWrap'),g=RareHeistView().geometry;let r=c.getBoundingClientRect();const sx=r.width/c.width,cx=r.left+(g.x0+(x+.5)*g.cw)*sx,w=wrap.getBoundingClientRect();if(cx<w.left+20||cx>w.right-20){wrap.scrollLeft+=cx-(w.left+w.right)/2;r=c.getBoundingClientRect();}return {x:r.left+(g.x0+(x+.5)*g.cw)*sx,y:r.top+(g.top[y]+g.hh[y]*.55)*(r.height/c.height)};},[x,y]);
async function drag(p,kind,to){const bb=await p.locator('.piece[data-tool="'+kind+'"]').boundingBox(),from={x:bb.x+bb.width/2,y:bb.y+bb.height/2},t=await cell(p,to.x,to.y);await p.mouse.move(from.x,from.y);await p.mouse.down();for(let i=1;i<=10;i++){await p.mouse.move(from.x+(t.x-from.x)*i/10,from.y+(t.y-from.y)*i/10);await p.waitForTimeout(20);}await p.mouse.up();await p.waitForTimeout(250);}
const check=(p,id)=>p.locator('.checks [data-check="'+id+'"]');
const settled=async p=>{for(let i=0;i<40&&await check(p,'beatable').getAttribute('data-s')==='run';i++)await p.waitForTimeout(100);};
async function toEditor(p,fresh){if(fresh){await p.locator('#newSprint').click();await p.waitForTimeout(900);}else{await p.evaluate(()=>document.querySelector('nav [data-route="last"]').click());await p.waitForTimeout(1500);}
 await p.locator('#raidShared').click();await p.waitForTimeout(2600);await play(p,route);await p.locator('#submitShared').click();await p.waitForTimeout(1500);await p.locator('#fortifyShared').click();await p.waitForTimeout(900);}

// ---- desktop: drag and drop ----
const p=await open({viewport:{width:1440,height:900}});await toEditor(p,false);
const names=await p.locator('.palette .piece b').allInnerTexts();ok('side palette shows the allowed pieces: '+names.join(', '),names.join()==='WALL,LASER,CAMERA');
ok('each piece has an icon and a one-line meaning',await p.locator('.palette .piece canvas').count()===3&&(await p.locator('.palette .piece small').allInnerTexts()).every(t=>t.length>10));
ok('PROVE YOUR CHANGE is off before any change',await p.locator('#testRoom').isDisabled()&&(await p.locator('#testRoom').innerText())==='PROVE YOUR CHANGE');
await drag(p,'wall',sealed);await settled(p);
ok('a wall sealing the exit ('+sealed.x+','+sealed.y+') breaks the last route',await check(p,'breaks').getAttribute('data-s')==='ok');
ok('the solver proves it blocks every route: '+await check(p,'beatable').innerText(),await check(p,'beatable').getAttribute('data-s')==='bad'&&/BLOCKS EVERY ROUTE/.test(await check(p,'beatable').innerText()));
ok('PROVE YOUR CHANGE is disabled for an unbeatable vault',await p.locator('#testRoom').isDisabled());
await drag(p,'wall',missed);await settled(p);
ok('a wall off the last route ('+missed.x+','+missed.y+') is flagged: '+await check(p,'breaks').innerText(),await check(p,'breaks').getAttribute('data-s')==='bad');
ok('PROVE YOUR CHANGE is disabled while the last route still works',await p.locator('#testRoom').isDisabled());
await drag(p,'camera',landing);
ok('a camera on a ladder landing is refused with a reason: '+await check(p,'place').innerText(),await check(p,'place').getAttribute('data-s')==='bad'&&/Ladder landings/.test(await check(p,'place').innerText())&&/stays at/.test(await check(p,'place').innerText()));
await p.locator('.piece[data-tool="wall"]').click();const g=await cell(p,good.x,good.y);await p.mouse.click(g.x,g.y);await p.waitForTimeout(250);await settled(p);
ok('click a piece, then a cell: wall placed at ('+good.x+','+good.y+')',await check(p,'place').getAttribute('data-s')==='ok');
ok('still beatable: '+await check(p,'beatable').innerText(),await check(p,'beatable').getAttribute('data-s')==='ok'&&new RegExp('found a '+good.r.turns+'-turn route').test(await check(p,'beatable').innerText()));
ok('PROVE YOUR CHANGE is enabled',!(await p.locator('#testRoom').isDisabled()));
await p.locator('#testRoom').click();await p.waitForTimeout(2600);ok('proving is a real run: '+await p.locator('#modeBadge').innerText(),(await p.locator('#modeBadge').innerText())==='PROVE YOUR CHANGE');
await play(p,good.r.actions);ok('the player cleared the changed vault',await p.evaluate(()=>RareHeistView().state.status)==='won');
await p.locator('#submitFortify').click();await p.waitForTimeout(1500);
ok('server replayed the proof and published version 1',await p.evaluate(()=>RareHeistView().screen)==='last'&&/VERSION 1/.test(await p.locator('#lastPage').innerText()));
await p.context().close();

// ---- phone: tap a piece, then tap a cell ----
const m=await open({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await m.evaluate(()=>(document.querySelector('.topbar nav [data-route="last"]')||document.querySelector('.modes [data-route="last"]')).click());await m.waitForTimeout(1500);await toEditor(m,true);
const pieces=await m.locator('.palette .piece').evaluateAll(els=>els.map(e=>e.getBoundingClientRect()).map(r=>[Math.round(r.top),Math.round(r.left),Math.round(r.width)]));
ok('phone: the three pieces sit side by side without sideways scrolling '+JSON.stringify(pieces),pieces.length===3&&pieces.every(q=>q[0]===pieces[0][0])&&pieces[2][1]+pieces[2][2]<=390);
await m.locator('.piece[data-tool="wall"]').tap();const s=await cell(m,sealed.x,sealed.y);await m.touchscreen.tap(s.x,s.y);await m.waitForTimeout(300);await settled(m);
ok('phone: tapped wall that seals the exit is proven unbeatable',await check(m,'beatable').getAttribute('data-s')==='bad'&&await m.locator('#testRoom').isDisabled());
const q=await cell(m,good.x,good.y);await m.touchscreen.tap(q.x,q.y);await m.waitForTimeout(300);await settled(m);
ok('phone: moving it to a harmless cell makes it beatable again',await check(m,'beatable').getAttribute('data-s')==='ok'&&!(await m.locator('#testRoom').isDisabled()));
ok('no page errors '+errors.slice(0,2).join(' | '),errors.length===0);
console.log(pass+'/'+(pass+fail)+' passed');await b.close();app.server.close();process.exit(fail?1:0);
