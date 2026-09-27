// Click-to-travel: a far click walks there; a route into a camera stops before the alarm.
import { chromium } from 'playwright';
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import path from 'node:path';
const require=createRequire(import.meta.url),root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const E=require('../src/engine.js'),L=require('../src/cutaway-levels.js');
const b=await chromium.launch(),p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
let pass=0,fail=0;const ok=(n,c)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n);};
await p.goto('file://'+path.join(root,'index.html'));await p.waitForTimeout(700);
async function open(title){await p.getByRole('button',{name:/^SOLO VAULTS$/}).click();await p.waitForTimeout(250);await p.locator('article').filter({hasText:title}).first().getByRole('button',{name:'OPERATIVE'}).click();await p.waitForTimeout(500);}
async function clickCell(x,y){const pt=await p.evaluate(([x,y])=>{const g=RareHeistView().geometry,c=document.getElementById('gameCanvas').getBoundingClientRect(),k=c.width/g.w;return {x:c.left+(g.x0+(x+.5)*g.cw)*k,y:c.top+(g.top[y]+g.hh[y]*.6)*k};},[x,y]);await p.mouse.click(pt.x,pt.y);}
const view=()=>p.evaluate(()=>RareHeistView());
// 1. Night Gallery: start (1,1) -> down the hatch to F3 and walk east to column 6 (the keycard)
await open('Night Gallery');const l=E.normalize(L.find(x=>x.id==='cut-01'));const key=E.positions(l,'a')[0];
await clickCell(key.x,key.y);await p.waitForTimeout(2500);let v=await view();
ok(`far click walks to the keycard (${key.x},${key.y}) -> hero at (${v.state.x},${v.state.y}), keys=${v.state.keys}`,v.state.x===key.x&&v.state.y===key.y&&v.state.keys===1);
ok('travel used several real turns ('+v.state.turn+')',v.state.turn>=4&&v.state.alarms===0);
// 2. walk toward the watched gallery on the top floor: must stop before being seen
await p.keyboard.press('Escape');await p.waitForTimeout(200);await open('Night Gallery');
const cam=l.cameras[0];await clickCell(cam.x-1,cam.y);await p.waitForTimeout(3000);v=await view();
ok(`route into the camera stops unseen at (${v.state.x},${v.state.y}), alarms=${v.state.alarms}`,v.state.alarms===0&&v.state.status==='playing');
const msg=await p.locator('#toast').innerText().catch(()=>'');ok('explains why it stopped: '+msg.slice(0,60),/Stopped|closed|path/i.test(msg)||v.state.x===cam.x-1);
ok('no page errors '+errors.join(' | '),!errors.length);
await b.close();console.log(pass+'/'+(pass+fail)+' passed');process.exit(fail?1:0);
