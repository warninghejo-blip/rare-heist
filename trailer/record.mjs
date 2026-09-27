// Records trailer scenes frame by frame with a controlled browser clock (smooth 30 fps).
// Needs the game server running: PORT=4173 node server/app.mjs
// Usage: node trailer/record.mjs <outDir> [scene ...]
import { chromium } from 'playwright';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(here);
const OUT=process.argv[2]||'/tmp/trailer',only=process.argv.slice(3);
const GAME='http://127.0.0.1:4173/',CARD='file://'+path.join(here,'card.html');
const routes=JSON.parse(fs.readFileSync(path.join(here,'routes.json'),'utf8'));
const art=fs.readFileSync(path.join(root,'src/art.js'),'utf8'),RF=JSON.parse(art.slice(art.indexOf('['),art.lastIndexOf(']')+1));
const ACCOUNT='0x7a11e75c0ffee5eed0000000000000000000beef';
const chain={ids:{'3412':{family:0,seed:3412},'7730':{family:5,seed:7730}},frames:Object.fromEntries(RF.map(x=>[x.familyId+':'+x.seed,x.frames]))};
function handler(chain,ACCOUNT){
 const w=v=>BigInt(v).toString(16).padStart(64,'0'),G='0x14c49e6118f46525de9ab41a51cbaa3c6ebf181d',R='0x246e3e9730a7eade94c79be0fd78d210f89aeb8d',T='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
 let chainId='0x1';const owned=['3412','7730'];
 return async({method,params})=>{
  if(method==='eth_requestAccounts'||method==='eth_accounts')return [ACCOUNT];
  if(method==='eth_chainId')return chainId;
  if(method==='wallet_switchEthereumChain'){chainId=params[0].chainId;return null;}
  if(method==='eth_blockNumber')return '0x3f0c3a5';
  if(method==='eth_getLogs'){const t=params[0].topics;if(t.length===2)return [];return owned.map((id,i)=>({blockNumber:'0x'+(100+i).toString(16),logIndex:'0x0',topics:[T,'0x'+w(0),'0x'+w(ACCOUNT),'0x'+w(id)]}));}
  if(method==='eth_call'){const {to,data}=params[0],sel=data.slice(2,10),a=data.slice(10),arg=i=>BigInt('0x'+a.slice(64*i,64*i+64)).toString();
   if(to.toLowerCase()===G){if(sel==='70a08231')return '0x'+w(owned.length);if(sel==='6352211e')return '0x'+w(owned.includes(arg(0))?ACCOUNT:'0x2222222222222222222222222222222222222222');if(sel==='7d71dc35')return '0x'+w(1);}
   if(to.toLowerCase()===R){const t=chain.ids[arg(0)]||{family:0,seed:3412};if(sel==='32bd63d1')return '0x'+w(t.family);if(sel==='82829f74')return '0x'+w(t.seed);if(sel==='ead2ca3c')return '0x'+(chain.frames[arg(0)+':'+arg(1)]||chain.frames['0:3412']).map(x=>w(x)).join('');}}
  throw Object.assign(new Error('unsupported '+method),{code:4200});
 };
}
const KEY={N:'ArrowUp',S:'ArrowDown',E:'ArrowRight',W:'ArrowLeft',WAIT:'Space',VENT:'KeyE',EMP:'KeyQ',LIGHT:'KeyL'};
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1.5});
await ctx.addInitScript(({chain,ACCOUNT,src})=>{const h=(0,eval)('('+src+')')(chain,ACCOUNT);const provider={request:h,on(){},removeListener(){}};
 window.addEventListener('eip6963:requestProvider',()=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'demo-wallet',name:'Demo Wallet',rdns:'demo.wallet',icon:''},provider}})));},{chain,ACCOUNT,src:handler.toString()});
let page,dir,n=0;
async function open(url,{viewport}={}){if(page)await page.close();page=await ctx.newPage();if(viewport)await page.setViewportSize(viewport);page.on('pageerror',e=>console.log('  page error:',e.message));await page.clock.install({time:new Date('2026-09-28T20:00:00Z')});await page.goto(url);await page.clock.pauseAt(new Date('2026-09-28T20:01:00Z'));await page.clock.runFor(900);if(url.startsWith('http'))await closeModal();}
function scene(name){dir=path.join(OUT,name);fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});n=0;console.log('scene',name);}
async function snap(frames=1,clip){for(let i=0;i<frames;i++){await page.clock.runFor(33);await page.screenshot({path:path.join(dir,String(n++).padStart(5,'0')+'.png'),clip});}}
const hold=ms=>snap(Math.round(ms/33));
async function until(fn,max=120){for(let i=0;i<max;i++){if(await fn())return true;await snap(1);}return false;}
async function move(a,frames=7){await page.keyboard.press(KEY[a]);await snap(frames);}
async function card(name,hash,ms){scene(name);await open(CARD+'#'+hash);await hold(ms);}
async function closeModal(){for(let i=0;i<3;i++){if(!(await page.evaluate(()=>document.getElementById('modal')?.open)))return;console.log('  closing dialog:',(await page.locator('#dialogTitle').innerText().catch(()=>'')));await page.locator('#closeDialog').click().catch(()=>page.keyboard.press('Escape'));await page.clock.runFor(200);}}
async function job(title){await closeModal();await page.getByRole('button',{name:/^SOLO VAULTS$/}).click();await page.clock.runFor(300);await page.locator('article').filter({hasText:title}).first().getByRole('button',{name:'OPERATIVE'}).click();await page.clock.runFor(600);}
const want=s=>!only.length||only.includes(s);
// When scene 04 (wallet) is not recorded in this run, pick Friend #7730 off camera so every scene shows the same hero.
if(only.length&&!only.includes('04-wallet')){dir=path.join(OUT,'_setup');fs.mkdirSync(dir,{recursive:true});await open(GAME);await page.locator('#wallet').click();await page.clock.runFor(300);await page.locator('#walletConnect').click();for(let i=0;i<60&&!(await page.locator('[data-own="7730"]').count());i++)await page.clock.runFor(100);await page.locator('[data-own="7730"]').click();await page.clock.runFor(300);console.log('setup hero',await page.locator('#friend').innerText());}
const enc=encodeURIComponent;

if(want('01-intro'))await card('01-intro','mode=intro&sub='+enc('A stealth heist starring your Rare Friend'),4200);
if(want('02-street')){scene('02-street');await open(GAME);await hold(500);await page.keyboard.down('ArrowRight');await hold(2600);await page.keyboard.up('ArrowRight');await hold(900);}
if(want('03-card-wallet'))await card('03-card-wallet','mode=section&hero=7730&title='+enc('PLAY AS|YOUR FRIEND')+'&sub='+enc('Connect a wallet. Your own Friend pulls the job.'),2600);
if(want('04-wallet')){scene('04-wallet');await open(GAME);await hold(400);await page.locator('#wallet').click();await hold(700);await page.locator('#walletConnect').click();
 await until(async()=>/Found/.test(await page.locator('#walletStatus').innerText()),200);await hold(1200);await page.locator('[data-own="7730"]').hover();await hold(400);await page.locator('[data-own="7730"]').click();await hold(900);
 await page.keyboard.down('ArrowRight');await hold(1500);await page.keyboard.up('ArrowRight');await hold(500);}
if(want('05-card-turns'))await card('05-card-turns','mode=section&hero=7730&title='+enc('ONE MOVE.|THEN SECURITY.')+'&sub='+enc('Every camera, laser and drone runs on a readable clock.'),2600);
if(want('06-gameplay')){scene('06-gameplay');await open(GAME);await job('Night Gallery');await hold(600);for(const a of routes['cut-01'])await move(a,7);await hold(2200);
 const box=await page.locator('#boardWrap').boundingBox();fs.writeFileSync(path.join(dir,'crop.json'),JSON.stringify(box));}
if(want('07-card-inspect'))await card('07-card-inspect','mode=section&hero=7730&title='+enc('READ EVERY|DEVICE')+'&sub='+enc('INSPECT shows the next eight beats of any laser. It costs no turn.'),2600);
if(want('08-inspect')){scene('08-inspect');await open(GAME);await job('Between the Pulses');await hold(500);await page.keyboard.press('KeyI');await hold(500);
 const L=routes.laser02,S=routes.start02;for(let i=0;i<L.x-S.x;i++){await page.keyboard.press('ArrowRight');await hold(170);}for(let i=0;i<L.y-S.y;i++){await page.keyboard.press('ArrowDown');await hold(170);}await hold(2600);await page.keyboard.press('KeyI');await hold(300);
 for(const a of routes.caught)await move(a,12);await hold(2600);}
if(want('09-card-last'))await card('09-card-last','mode=section&hero=7730&title='+enc('LAST|HEIST')+'&sub='+enc('One shared vault. Clear it, add one obstacle, hold the lead.'),2800);
if(want('10-last')){scene('10-last');await open(GAME);await page.getByRole('button',{name:/^LAST HEIST$/}).first().click();await hold(1400);
 await page.locator('#raidShared').click();await until(async()=>(await page.evaluate(()=>RareHeistView().screen))==='play',200);await hold(700);
 for(const a of routes['last-cutaway'])await move(a,6);await hold(1500);await page.getByRole('button',{name:'SUBMIT TO SERVER'}).click();await until(async()=>!/SUBMIT TO SERVER/.test(await page.locator('#dialogContent').innerText().catch(()=>'')),150);await hold(2500);await closeModal();const add=page.getByRole('button',{name:'ADD ONE OBSTACLE'});if(await add.count()){await add.first().click();await hold(3200);}
 console.log('  after clear:',await page.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>b.textContent.trim()).join(' | ')));}
if(want('11-levels')){scene('11-levels');await open(GAME);await page.getByRole('button',{name:/^SOLO VAULTS$/}).click();await hold(600);
 const max=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight);for(let i=0;i<=120;i++){await page.evaluate(y=>scrollTo(0,y),Math.round(max*(1-Math.cos(Math.PI*i/120))/2));await snap(1);}await hold(500);}
if(want('12-expert')){scene('12-expert');await open(GAME);await job('Graveyard Shift');await hold(500);for(const a of routes['cut-12'])await move(a,4);await hold(1500);}
if(want('13-mobile')){scene('13-mobile');await open(GAME,{viewport:{width:390,height:844}});await job('Night Gallery');await hold(400);for(const a of routes['cut-01'].slice(0,26))await move(a,6);await hold(800);}
if(want('14-outro'))await card('14-outro','mode=outro&sub='+enc('Play free in your browser')+'&url='+enc('warninghejo-blip.github.io/rare-heist'),5200);
await b.close();console.log('done');
