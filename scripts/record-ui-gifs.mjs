// Records the README GIFs that show the DOM interface: play-as-your-friend.gif and mobile.gif.
// Re-run after any UI change. Frames come from Playwright with a paused, stepped page clock
// (smooth 15 fps), then ffmpeg (on PATH) builds a palette GIF.
//
//   node scripts/record-ui-gifs.mjs                       # file://index.html, writes media/*.gif
//   node scripts/record-ui-gifs.mjs --url=http://127.0.0.1:4173/   # a running server (npm start)
//   options: --only=play-as-your-friend,mobile  --out=<dir>  --keep=<framesDir>
//
// The wallet is a read-only mock EIP-6963 provider that answers like the Rare Friends contracts
// with the real #3412 Skeleton / #7730 Hoverer frames from src/art.js (the same mock the repo's
// browser tests use). It can connect and read; it cannot sign or send anything.
// UI selectors live in SEL below: if the interface changes, a failed step names the selector.
import { chromium } from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const opt=Object.fromEntries(process.argv.slice(2).filter(a=>a.startsWith('--')).map(a=>{const [k,...v]=a.slice(2).split('=');return [k,v.join('=')||'1'];}));
const URL_=opt.url||pathToFileURL(path.join(root,'index.html')).href,OUT=path.resolve(opt.out||path.join(root,'media')),ONLY=opt.only?opt.only.split(','):['play-as-your-friend','mobile'];
const FPS=15,STEP=Math.round(1000/FPS),KEEP=opt.keep?path.resolve(opt.keep):fs.mkdtempSync(path.join(os.tmpdir(),'rh-ui-'));
const SEL={wallet:'#wallet',connect:'#walletConnect',status:'#walletStatus',own:id=>`[data-own="${id}"]`,friend:'#friend',modal:'#modal',close:'#closeDialog',solo:/^SOLO VAULTS$/,operative:/^PLAY$/};
const KEY={N:'ArrowUp',S:'ArrowDown',E:'ArrowRight',W:'ArrowLeft',WAIT:'Space',VENT:'KeyE',EMP:'KeyQ',LIGHT:'KeyL'};
const dataSrc=fs.readFileSync(path.join(root,'trailer/data.js'),'utf8'),data=JSON.parse(dataSrc.slice(dataSrc.indexOf('{'),dataSrc.lastIndexOf('}')+1)),route=id=>data.grid.find(g=>g.id===id).route;
const art=fs.readFileSync(path.join(root,'src/art.js'),'utf8'),RF=JSON.parse(art.slice(art.indexOf('['),art.lastIndexOf(']')+1));
const ACCOUNT='0x7a11e75c0ffee5eed0000000000000000000beef';
const chain={ids:{'3412':{family:0,seed:3412},'7730':{family:5,seed:7730}},frames:Object.fromEntries(RF.map(x=>[x.familyId+':'+x.seed,x.frames]))};
function handler(chain,ACCOUNT){ // read-only: accounts, chain, ownership logs, registry frames
 const w=v=>BigInt(v).toString(16).padStart(64,'0'),G='0x14c49e6118f46525de9ab41a51cbaa3c6ebf181d',R='0x246e3e9730a7eade94c79be0fd78d210f89aeb8d',T='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
 let chainId='0x1';const owned=['3412','7730'];const logs=()=>owned.map((id,i)=>({blockNumber:'0x'+(100+i).toString(16),logIndex:'0x0',topics:[T,'0x'+w(0),'0x'+w(ACCOUNT),'0x'+w(id)]}));
 return async({method,params})=>{
  if(method==='eth_requestAccounts'||method==='eth_accounts')return [ACCOUNT];
  if(method==='eth_chainId')return chainId;
  if(method==='wallet_switchEthereumChain'){chainId=params[0].chainId;return null;}
  if(method==='eth_blockNumber')return '0x3f0c3a5';
  if(method==='eth_getLogs'){const t=params[0].topics||[];return t.length===2&&t[1]?[]:logs();}
  if(method==='eth_call'){const {to,data}=params[0],sel=data.slice(2,10),a=data.slice(10),arg=i=>BigInt('0x'+a.slice(64*i,64*i+64)).toString();
   if(to.toLowerCase()===G){if(sel==='70a08231')return '0x'+w(owned.length);if(sel==='6352211e')return '0x'+w(owned.includes(arg(0))?ACCOUNT:'0x2222222222222222222222222222222222222222');if(sel==='7d71dc35')return '0x'+w(1);if(sel==='0be76ed6')return '0x'+w('0x3333333333333333333333333333333333333333');}
   if(to.toLowerCase()===R){const t=chain.ids[arg(0)]||{family:0,seed:3412};if(sel==='32bd63d1')return '0x'+w(t.family);if(sel==='82829f74')return '0x'+w(t.seed);if(sel==='ead2ca3c')return '0x'+(chain.frames[arg(0)+':'+arg(1)]||chain.frames['0:3412']).map(x=>w(x)).join('');}
   throw Object.assign(new Error('unknown call '+sel),{code:-32000});}
  throw Object.assign(new Error('unsupported '+method),{code:4200});
 };
}
function ff(args){const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{stdio:'inherit'});if(r.status!==0)throw new Error('ffmpeg failed ('+(r.error?.message||r.status)+')');}
const b=await chromium.launch();
async function context(o){const ctx=await b.newContext(o);
 await ctx.addInitScript(({chain,ACCOUNT,src})=>{const h=(0,eval)('('+src+')')(chain,ACCOUNT);const provider={request:h,on(){},removeListener(){}};
  window.addEventListener('eip6963:requestProvider',()=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'demo-wallet',name:'Demo Wallet',rdns:'demo.wallet',icon:''},provider}})));},{chain,ACCOUNT,src:handler.toString()});
 await ctx.route('https://rpc.mainnet.chain.robinhood.com/**',async r=>{const req=JSON.parse(r.request().postData());const result=req.method==='eth_chainId'?'0x1237':await handler(chain,ACCOUNT)(req);await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({jsonrpc:'2.0',id:req.id,result})});});
 return ctx;}
function recorder(p,name,clip){const dir=path.join(KEEP,name);fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});let n=0;
 const snap=async(frames=1)=>{for(let i=0;i<frames;i++){await p.clock.runFor(STEP);await p.screenshot({path:path.join(dir,String(n++).padStart(5,'0')+'.png'),clip});}};
 return {dir,snap,hold:ms=>snap(Math.max(1,Math.round(ms/STEP))),count:()=>n};}
async function step(label,fn){try{return await fn();}catch(e){throw new Error(`step "${label}" failed: ${e.message.split('\n')[0]}`);}}
async function open(ctx){const p=await ctx.newPage();p.on('pageerror',e=>console.log('  page error:',e.message));await p.clock.install({time:new Date('2026-09-28T20:00:00Z')});await p.goto(URL_);await p.clock.pauseAt(new Date('2026-09-28T20:00:05Z'));await p.clock.runFor(1200);await closeModal(p);return p;}
async function closeModal(p){for(let i=0;i<3;i++){if(!(await p.evaluate(s=>document.querySelector(s)?.open,SEL.modal)))return;await p.locator(SEL.close).click().catch(()=>p.keyboard.press('Escape'));await p.clock.runFor(250);}}
async function job(p,title){await closeModal(p);await step('open SOLO VAULTS',()=>p.getByRole('button',{name:SEL.solo}).first().click());await p.clock.runFor(300);
 await step('start '+title+' (PLAY)',()=>p.locator('article').filter({hasText:title}).first().getByRole('button',{name:SEL.operative}).first().click());await p.clock.runFor(600);}
async function play(p,rec,actions,frames){for(const a of actions){await p.keyboard.press(KEY[a]);await rec.snap(frames);}}
fs.mkdirSync(OUT,{recursive:true});

if(ONLY.includes('play-as-your-friend')){console.log('play-as-your-friend: '+URL_);
 const ctx=await context({viewport:{width:1280,height:720},deviceScaleFactor:2}),p=await open(ctx),rec=recorder(p,'play-as-your-friend');
 await rec.hold(700);
 await step('click CONNECT WALLET '+SEL.wallet,()=>p.locator(SEL.wallet).click());await rec.hold(700);
 await step('click '+SEL.connect,()=>p.locator(SEL.connect).click());
 let found=false;for(let i=0;i<90&&!found;i++){found=/Found/.test(await p.locator(SEL.status).innerText().catch(()=>''));await rec.snap(1);}
 if(!found)throw new Error('wallet status never reported "Found": '+(await p.locator(SEL.status).innerText().catch(()=>'(no '+SEL.status+')')));
 await rec.hold(1100);await step('hover Friend #7730',()=>p.locator(SEL.own('7730')).hover());await rec.hold(400);
 await step('pick Friend #7730',()=>p.locator(SEL.own('7730')).click());await rec.hold(900);
 console.log('  hero:',await p.locator(SEL.friend).innerText().catch(()=>'?'));
 await closeModal(p);await job(p,'Night Gallery');await rec.hold(300);
 // second shot: the board itself, framed 16:9 around the game canvas, so the chosen Friend is visible
 // the building's bounds come from the renderer's own geometry (canvas px), mapped to CSS px
 const box=await step('find the building on #gameCanvas',async()=>{const bb=await p.locator('#gameCanvas').boundingBox();if(!bb)throw new Error('#gameCanvas not visible');
  const g=await p.evaluate(()=>RareHeistView().geometry);const k=bb.width/g.w,m=g.cw*.8;return {x:bb.x+(g.x0-m)*k,y:bb.y+Math.max(0,g.y0-m*1.2)*k,width:(g.cols*g.cw+2*m)*k,height:(g.H+m*2.2)*k};});
 let cw=Math.max(box.width,box.height*16/9),ch=cw*9/16;const cx=Math.max(0,Math.min(1280-cw,box.x+box.width/2-cw/2)),cy=Math.max(0,Math.min(720-ch,box.y+box.height/2-ch/2));
 const rec2=recorder(p,'play-as-your-friend-board',{x:cx,y:cy,width:Math.min(cw,1280),height:Math.min(ch,720)});
 await rec2.hold(400);await play(p,rec2,route('cut-01').slice(0,18),4);await rec2.hold(700);
 await ctx.close();console.log('  frames',rec.count()+rec2.count());
 ff(['-framerate',String(FPS),'-i',path.join(rec.dir,'%05d.png'),'-framerate',String(FPS),'-i',path.join(rec2.dir,'%05d.png'),'-filter_complex',
  '[0:v]scale=960:540:flags=lanczos,setsar=1[a0];[1:v]scale=960:540:flags=lanczos,setsar=1[a1];[a0][a1]concat=n=2:v=1:a=0,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle','-loop','0',path.join(OUT,'play-as-your-friend.gif')]);
 console.log('  wrote',path.join(OUT,'play-as-your-friend.gif'),(fs.statSync(path.join(OUT,'play-as-your-friend.gif')).size/1048576).toFixed(2),'MB');}

if(ONLY.includes('mobile')){console.log('mobile: '+URL_);
 const ctx=await context({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),p=await open(ctx),rec=recorder(p,'mobile');
 await job(p,'Night Gallery');await rec.hold(600);await play(p,rec,route('cut-01').slice(0,26),4);await rec.hold(800);await ctx.close();console.log('  frames',rec.count());
 // backdrop: the trailer's own night card (director.html, scene "phonecard"), phone on the left
 const bg=path.join(KEEP,'phonecard.png'),pb=await b.newPage({viewport:{width:960,height:540}});
 await pb.goto(pathToFileURL(path.join(root,'trailer/director.html')).href+'#scene=phonecard&rec=1&w=960&h=540');await pb.waitForFunction(()=>window.__ready===true);await pb.evaluate(()=>window.__frame(2));await pb.screenshot({path:bg});await pb.close();
 ff(['-loop','1','-framerate',String(FPS),'-i',bg,'-framerate',String(FPS),'-i',path.join(rec.dir,'%05d.png'),'-filter_complex',
  '[1:v]scale=-2:476:flags=lanczos,pad=iw+12:ih+12:6:6:color=black,pad=iw+4:ih+4:2:2:color=0xccff00[ph];[0:v][ph]overlay=x=96:y=(H-h)/2:shortest=1,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle','-loop','0',path.join(OUT,'mobile.gif')]);
 console.log('  wrote',path.join(OUT,'mobile.gif'),(fs.statSync(path.join(OUT,'mobile.gif')).size/1048576).toFixed(2),'MB');}
await b.close();console.log('frames kept in',KEEP);
