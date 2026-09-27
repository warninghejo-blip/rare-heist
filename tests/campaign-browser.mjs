// Plays every campaign job through the real UI with the keyboard, using solver routes.
// Run: node tests/campaign-browser.mjs [screenshotDir]
import { chromium } from 'playwright';
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import path from 'node:path';
const require=createRequire(import.meta.url),root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const levels=require('../src/cutaway-levels.js'),{solve}=require('./solve.cjs');
const jobs=levels.filter(l=>/^(cut-(0[1-9]|1\d)|annex-)/.test(l.id));
const key={N:'ArrowUp',S:'ArrowDown',E:'ArrowRight',W:'ArrowLeft',WAIT:'Space',VENT:'KeyE',EMP:'KeyQ',LIGHT:'KeyL'};
const b=await chromium.launch(),p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('file://'+path.join(root,'index.html'));await p.waitForTimeout(800);let pass=0;
for(const l of jobs){
  const route=solve(l,{maxNodes:600000});if(!route.ok){console.log('FAIL '+l.id+' no route');continue;}
  await p.getByRole('button',{name:/^SOLO VAULTS$/}).click();await p.waitForTimeout(300);
  const card=p.locator('article').filter({hasText:l.nameEn||l.name}).first();
  await card.getByRole('button',{name:'OPERATIVE'}).first().click();await p.waitForTimeout(500);
  for(const a of route.actions){await p.keyboard.press(key[a]);await p.waitForTimeout(115);}
  await p.waitForTimeout(500);const won=await p.evaluate(()=>RareHeistView().state?.status);
  const ok=won==='won';if(ok)pass++;console.log((ok?'PASS ':'FAIL ')+l.id+' '+route.turns+' turns -> '+won);
  if(process.argv[2]&&l.id==='cut-10')await p.screenshot({path:path.join(process.argv[2],'campaign-cut10.png')});
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
}
console.log(pass+'/'+jobs.length+' jobs won through the UI; page errors: '+errors.length+(errors.length?' '+errors[0]:''));await b.close();process.exit(pass===jobs.length&&!errors.length?0:1);
