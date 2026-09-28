// LIVE BURN cross-tab release and single-send regressions. Mock wallet only.
import {chromium} from 'playwright';
import {createApp} from '../server/app.mjs';
import {createRequire} from 'node:module';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import path from 'node:path';
const ROOT=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require=createRequire(ROOT+'/package.json'),B=require(ROOT+'/src/burn.js');
const art=readFileSync(ROOT+'/src/art.js','utf8'),RF_ART=JSON.parse(art.slice(art.indexOf('['),art.lastIndexOf(']')+1));
let pass=0,fail=0;const ok=(n,c,d='')=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(d?' — '+d:''));};
const app=createApp({dbFile:':memory:',minActionMs:0});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.server.address().port;
const w=v=>BigInt(v).toString(16).padStart(64,'0'),E=10n**18n,ACCOUNT='0x1111111111111111111111111111111111111111';
const TOKEN='0x0779369854d3ecdea927206718ffd7730c67b71f',DEAD='0x000000000000000000000000000000000000dead',TRANSFER='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',G='0x14c49e6118f46525de9ab41a51cbaa3c6ebf181d',R='0x246e3e9730a7eade94c79be0fd78d210f89aeb8d',O1='0x5555555555555555555555555555555555555555',O3='0x7777777777777777777777777777777777777777';
const chain={hideLogs:true,head:0x200,hold:false,sent:[],balances:{[ACCOUNT]:5000n*E,[DEAD]:1000n*E},txs:[]};
const frames=Object.fromEntries(RF_ART.map(x=>[x.familyId+':'+x.seed,x.frames])),ids={'3412':{family:0,seed:3412},'7730':{family:5,seed:7730}},owned=['3412','7730'];
async function rpc({method,params=[]}){
 if(method==='eth_requestAccounts'||method==='eth_accounts')return [ACCOUNT];
 if(method==='eth_chainId')return '0x1237';
 if(method==='wallet_switchEthereumChain')return null;
 if(method==='eth_blockNumber')return '0x'+chain.head.toString(16);
 if(method==='eth_getBlockByNumber')return {number:params[0],timestamp:'0x'+Math.floor(Date.now()/1000).toString(16)};
 if(method==='eth_sendTransaction'){const tx=params[0],d=tx.data.slice(2);const amount=BigInt('0x'+d.slice(72,136)),from=tx.from.toLowerCase();chain.balances[from]-=amount;chain.balances[DEAD]+=amount;chain.head++;const hash='0x'+w(0xb000+chain.sent.length);chain.txs.push({hash,from,amount,block:'0x'+chain.head.toString(16),input:tx.data});chain.sent.push(tx);return hash;}
 if(method==='eth_getTransactionReceipt'){if(chain.hold)return null;const t=chain.txs.find(x=>x.hash===params[0]);return t?{status:'0x1',transactionHash:t.hash,blockNumber:t.block,logs:[{address:TOKEN,topics:[TRANSFER,'0x'+w(t.from),'0x'+w(DEAD)],data:'0x'+w(t.amount)}]}:null;}
 if(method==='eth_getTransactionByHash'){const t=chain.txs.find(x=>x.hash===params[0]);return t?{hash:t.hash,from:t.from,to:TOKEN,input:t.input,blockNumber:t.block}:null;}
 if(method==='eth_getLogs'&&params[0].address.toLowerCase()===TOKEN){if(chain.hideLogs)return [];const tp=params[0].topics,lo=BigInt(params[0].fromBlock),hi=BigInt(params[0].toBlock);return chain.txs.filter(x=>BigInt(x.block)>=lo&&BigInt(x.block)<=hi&&(!tp[1]||tp[1].toLowerCase()==='0x'+w(x.from))).map(x=>({address:TOKEN,transactionHash:x.hash,blockNumber:x.block,logIndex:'0x0',topics:[TRANSFER,'0x'+w(x.from),'0x'+w(DEAD)],data:'0x'+w(x.amount)}));}
 if(method==='eth_getLogs'){const tp=params[0].topics;return tp.length===2&&tp[1]?[]:owned.map((id,i)=>({blockNumber:'0x'+(100+i).toString(16),logIndex:'0x0',topics:[TRANSFER,'0x'+w(0),'0x'+w(ACCOUNT),'0x'+w(id)]}));}
 if(method==='eth_call'){const {to,data}=params[0],sel=data.slice(2,10),args=data.slice(10),arg=i=>BigInt('0x'+args.slice(64*i,64*i+64)).toString();
  if(to.toLowerCase()===G){if(sel==='70a08231')return '0x'+w(owned.length);if(sel==='6352211e')return '0x'+w(owned.includes(arg(0))?ACCOUNT:O1);if(sel==='7d71dc35')return '0x'+w(1);if(sel==='0be76ed6')return '0x'+w(O3);}
  if(to.toLowerCase()===TOKEN){if(sel==='313ce567')return '0x'+w(18);if(sel==='18160ddd')return '0x'+w(1000000000n*E);if(sel==='70a08231'){const who='0x'+BigInt(arg(0)).toString(16).padStart(40,'0');return '0x'+w(chain.balances[who]??0n);}}
  if(to.toLowerCase()===R){const x=ids[arg(0)]||{family:3,seed:Number(arg(0))};if(sel==='32bd63d1')return '0x'+w(x.family);if(sel==='82829f74')return '0x'+w(x.seed);if(sel==='ead2ca3c')return '0x'+(frames[arg(0)+':'+arg(1)]||frames['0:3412']).map(v=>w(v)).join('');}
  throw Error('unknown call '+sel);}
 throw Error('unsupported '+method);
}
const b=await chromium.launch(),errors=[];
// Page-side wallet: window.__mode controls eth_sendTransaction. 'ok' | 'delay' | 'reject' | 'hang' | 'gate' | 'gateSendError' | 'sendHang'
const INIT=()=>{window.__sendCalls=0;const sleep=ms=>new Promise(r=>setTimeout(r,ms));const o=window.setTimeout;window.setTimeout=(fn,ms,...a)=>o(fn,ms===300000?(window.__shim||1500):ms,...a);
 const provider={request:async r=>{if(r.method==='eth_blockNumber'&&window.__removeBeforeWalletRequest&&JSON.parse(localStorage.getItem('rh-live-pending-v1')||'null')?.status==='awaiting-wallet')localStorage.removeItem('rh-live-pending-v1');if(r.method==='eth_sendTransaction'){window.__sendCalls++;const m=window.__mode||'ok';
   if(m==='delay')await sleep(window.__delay||1200);
   if(m==='reject'){await sleep(200);throw Object.assign(Error('User rejected the request.'),{code:4001});}
   if(m==='hang')return new Promise(()=>{});
   if(m==='gate'||m==='gateSendError'){await new Promise(res=>window.__gate=res);if(window.__afterGate==='reject')throw Object.assign(Error('User rejected the request.'),{code:4001});}
   if(m==='gateSendError'){await window.__chain(r);throw Error('Internal JSON-RPC error.');}
   if(m==='sendHang'){await window.__chain(r);return new Promise(()=>{});}
  }return window.__chain(r);},on(){}};
 window.addEventListener('eip6963:requestProvider',()=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'mock',name:'Mock',rdns:'test'},provider}})));};
async function context(){const ctx=await b.newContext({viewport:{width:1440,height:1000}});ctx.setDefaultTimeout(8000);await ctx.exposeFunction('__chain',req=>rpc(req));await ctx.addInitScript(INIT);
 await ctx.route('https://rpc.mainnet.chain.robinhood.com/**',async r=>{const q=JSON.parse(r.request().postData());let body;try{body={jsonrpc:'2.0',id:q.id,result:await rpc(q)};}catch(e){body={jsonrpc:'2.0',id:q.id,error:{code:-32000,message:e.message}};}await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});});
 await ctx.route(origin+'/',async r=>{const res=await r.fetch(),body=(await res.text()).replace(/\r\n/g,'\n'),hashes=[...body.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>"'sha256-"+createHash('sha256').update(m[1]).digest('base64')+"'"),headers={...res.headers()};headers['content-security-policy']=headers['content-security-policy'].replace(/script-src [^;]+;/,'script-src '+hashes.join(' ')+';');await r.fulfill({response:res,body,headers});});
 return ctx;}
async function page(ctx,init){const p=await ctx.newPage();if(init)await p.addInitScript(init);p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/');await p.waitForTimeout(700);await p.evaluate(()=>document.getElementById('friendReveal')?.remove());return p;}
async function ready(p,amount='2'){await p.locator('#wallet').click();await p.locator('#walletConnect').click();await p.waitForTimeout(500);await p.locator('#closeDialog').click();
 await p.locator('nav [data-route="studio"]').click();await p.locator('[data-mode="live"]').click();await p.locator('[data-burn="lilac"]').click();try{await p.locator('#burnAgree').check({timeout:1500});return true;}catch{return false;}}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(test,ms=6000){const end=Date.now()+ms;while(Date.now()<end){if(await test())return true;await pause(25);}return false;}
const pend=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('rh-live-pending-v1')));
const held=p=>p.evaluate(async()=>(await navigator.locks.query()).held.length);
const click=p=>p.evaluate(()=>document.getElementById('burnGo')?.click());
const status=p=>p.evaluate(()=>document.getElementById('burnStatus')?.textContent||'');
const calls=p=>p.evaluate(()=>window.__sendCalls);
async function settle(p){chain.hold=false;await until(async()=>!(await pend(p)),8000);}
try{
 if(!process.env.BURN_RELEASE_MUTATION){
 // 1. simultaneous confirm, delayed wallet, 6 rounds
 {let worst=0;
  for(let i=0;i<6;i++){const ctx=await context(),p=await page(ctx),q=await page(ctx);await ready(p);await ready(q);await p.evaluate(()=>{window.__mode='delay';window.__delay=1200;});await q.evaluate(()=>{window.__mode='delay';window.__delay=1200;});
   const s0=chain.sent.length,c0=(await calls(p))+(await calls(q));
   await Promise.all([i%2?click(q):click(p),i%2?click(p):click(q)]);await pause(1800);
   const sends=chain.sent.length-s0,c=(await calls(p))+(await calls(q))-c0;worst=Math.max(worst,sends,c);
   await until(async()=>!(await pend(p)),8000);await p.evaluate(()=>document.getElementById('modal').open&&document.getElementById('modal').close());await ctx.close();}
  ok('1 simultaneous tabs x6: max wallet prompts / sends per purchase <=1',worst===1,'worst='+worst);}
 // 2. ordinary save in other tab during wallet wait
 {const ctx=await context(),p=await page(ctx),q=await page(ctx);await ready(p);await ready(q);await p.evaluate(()=>window.__mode='gate');const s0=chain.sent.length;
  await click(p);await until(async()=>await calls(p)===1);
  for(let i=0;i<5;i++)await q.evaluate(()=>{if(!window.__kw){window.__kw=0;const n=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='rh-cutaway-v1')window.__kw++;return n.call(this,k,v);};}document.getElementById('sound')?.click();});console.log('  q KEY writes',await q.evaluate(()=>window.__kw));await q.evaluate(()=>{const s=JSON.parse(localStorage.getItem('rh-cutaway-v1'));return s&&s.live&&('pending' in s.live);}).then(v=>console.log('  KEY.live has pending field after q saves:',v));
  const mid=await pend(p);ok('2a pending survives 5 ordinary saves in other tab',mid?.status==='awaiting-wallet'&&mid.walletRequested===true,JSON.stringify(mid)?.slice(0,80));
  await click(q);await pause(400);ok('2b other tab refused during wait',await calls(q)===0,'status='+(await status(q)));
  chain.hold=true;await p.evaluate(()=>window.__gate());await until(async()=>(await pend(p))?.status==='pending');
  await q.evaluate(()=>{const b=document.getElementById('burnGo');b.disabled=false;b.click();});await pause(400);
  ok('2c after hash: other tab refused, sends=1',chain.sent.length-s0===1&&await calls(q)===0,'sends='+(chain.sent.length-s0)+' pending='+(await pend(q))?.status);
  await settle(p);ok('2d lock released at end',await held(p)===0);await ctx.close();}
 // 3. reload owner tab during wait
 {const ctx=await context(),p=await page(ctx);await ready(p);await p.evaluate(()=>window.__mode='hang');await click(p);await until(async()=>await calls(p)===1);
  await p.reload();await p.waitForTimeout(700);const st=await pend(p);
  ok('3a reload during wait -> unknown-outcome',st?.status==='unknown-outcome',st?.status);
  ok('3b unknown panel visible (exit exists)',await p.locator('#burnUnknownPanel').count()===1);
  await p.evaluate(()=>document.getElementById('friendReveal')?.remove());await p.evaluate(()=>document.getElementById('burnUnknownPanel').style.display='none');
  await ready(p);await click(p);await pause(400);ok('3c retry after reload refused',await calls(p)===0,await status(p));
  ok('3d lock not held after reload',await held(p)===0);await ctx.close();}
 // 4. close owner tab during wait
 {const ctx=await context(),p=await page(ctx),q=await page(ctx);await ready(p);await p.evaluate(()=>window.__mode='sendHang');const s0=chain.sent.length;await click(p);await until(async()=>chain.sent.length>s0);
  await p.close();await until(async()=>await q.locator('#burnUnknownRelease').count()===1,3000);ok('4a closed owner makes RELEASE available',await q.locator('#burnUnknownRelease').count()===1);
  await q.evaluate(()=>document.getElementById('burnUnknownPanel').style.display='none');await ready(q);await click(q);await pause(400);
  ok('4b other tab refused after owner closed',await calls(q)===0&&chain.sent.length-s0===1,await status(q));
  await q.evaluate(()=>document.getElementById('modal').close());await q.evaluate(()=>document.getElementById('burnUnknownPanel').style.display='');
  chain.hideLogs=false;await q.locator('#burnUnknownRestore').click();await pause(1500);ok('4c RESTORE FROM CHAIN clears via nonce match',!(await pend(q)),JSON.stringify(await pend(q))?.slice(0,60));chain.hideLogs=true;await ctx.close();}
 // 5. wallet 4001
 {const ctx=await context(),p=await page(ctx);await ready(p);await p.evaluate(()=>window.__mode='reject');const s0=chain.sent.length;await click(p);await pause(900);
  ok('5 reject 4001 clears lock, 0 sends, lock free',!(await pend(p))&&chain.sent.length===s0&&await held(p)===0,await status(p));await ctx.close();}
 // 6. timeout without hash (300s shimmed to 1.5s), wallet then broadcasts late
 {const ctx=await context(),p=await page(ctx);await ready(p);await p.evaluate(()=>window.__mode='hang');await click(p);await pause(2500);
  const st=await pend(p);ok('6a timeout -> unknown-outcome, lock free',st?.status==='unknown-outcome'&&await held(p)===0,st?.status+' '+(await status(p)));
  await p.evaluate(()=>{document.getElementById('modal').close();document.getElementById('burnUnknownPanel').style.display='none';});await ready(p);await p.evaluate(()=>window.__mode='ok');await click(p);await pause(400);
  ok('6b retry after timeout refused',await calls(p)===1,'calls='+(await calls(p)));await ctx.close();}
 // 7. no navigator.locks
 {const ctx=await context(),p=await page(ctx,()=>Object.defineProperty(navigator,'locks',{configurable:true,value:undefined}));await ready(p);await click(p);await pause(300);
  ok('7 no Web Locks: refused, no pending written',await calls(p)===0&&!(await pend(p)),await status(p));await ctx.close();}
 // 8. migration: legacy pending with hash while new key already holds a different pending
 {const ctx=await context(),p=await page(ctx);const legacy={status:'pending',tx:'0x'+'ab'.repeat(32),from:ACCOUNT,item:'trail',amount:'25',amountUnits:'25000000000000000000',friendId:null,sentAt:Date.now(),sentBlock:'0x200',nonce:7,decimals:18};
  const cur={status:'unknown-outcome',ownerId:'x',walletRequested:true,from:ACCOUNT,item:'lilac',amount:'10',amountUnits:'10000000000000000000',friendId:null,sentAt:Date.now(),sentBlock:'0x200',nonce:9,decimals:18};
  await p.evaluate(([l,c])=>{const s=JSON.parse(localStorage.getItem('rh-cutaway-v1')||'{}');s.live={...(s.live||{}),pending:l};localStorage.setItem('rh-cutaway-v1',JSON.stringify(s));localStorage.setItem('rh-live-pending-v1',JSON.stringify(c));},[legacy,cur]);
  await p.reload();await p.waitForTimeout(700);const st=await p.evaluate(()=>({n:JSON.parse(localStorage.getItem('rh-live-pending-v1')),o:JSON.parse(localStorage.getItem('rh-cutaway-v1')).live?.pending}));
  ok('8 migration preserves legacy hash when both locks are valid',st.n?.tx===legacy.tx,'new='+st.n?.status+' tx='+st.n?.tx);await ctx.close();}
 // 9. ATTACK: other tab shows "UNKNOWN OUTCOME / RELEASE LOCK" for a live owner; release, then ambiguous wallet error after broadcast
 {const ctx=await context(),p=await page(ctx),q=await page(ctx);await ready(p);await p.evaluate(()=>window.__mode='gateSendError');const s0=chain.sent.length;await click(p);await until(async()=>await calls(p)===1);await pause(200);
  const panel=await q.locator('#burnUnknownPanel').count(),txt=panel?await q.locator('#burnUnknownPanel').textContent():'';
  ok('9a idle tab waits for live wallet and cannot offer RELEASE',panel===1&&await q.locator('#burnUnknownRelease').count()===0&&/Waiting for your wallet in another tab/.test(txt),'panel='+panel+' text='+txt.slice(0,60));
  if(await q.locator('#burnUnknownRelease').count()){await q.locator('#burnUnknownRelease').click();await q.locator('#unknownReleaseAgree').check();await q.locator('#unknownReleaseGo').click();}
  ok('9b release cannot clear another tab live wallet', (await pend(q))?.status==='awaiting-wallet','pending='+(await pend(q))?.status);
  await p.evaluate(()=>window.__gate());await pause(800);
  const after=await pend(p),stA=await status(p),enabled=await p.evaluate(()=>!document.getElementById('burnGo').disabled);
  await p.evaluate(()=>{window.__mode='ok';});chain.hold=true;if(enabled)await click(p);await pause(800);
  ok('9b ambiguous wallet error persists unknown and permits at most one send',chain.sent.length-s0===1&&after?.status==='unknown-outcome'&&!enabled,'sends='+(chain.sent.length-s0)+' pendingAfterError='+JSON.stringify(after)+' burnGoEnabled='+enabled+' status="'+stA+'"');
  chain.hold=false;await ctx.close();}
 // 9d realistic variant: release in idle tab, then A's wallet request times out ('Retry.'), user confirms the stale popup late, then retries
 {const ctx=await context(),p=await page(ctx),q=await page(ctx);await ready(p);await p.evaluate(()=>{window.__mode='gate';window.__shim=5000;});const s0=chain.sent.length;await click(p);await until(async()=>await calls(p)===1);await pause(200);
  if(await q.locator('#burnUnknownRelease').count()){await q.locator('#burnUnknownRelease').click();await q.locator('#unknownReleaseAgree').check();await q.locator('#unknownReleaseGo').click();}
  ok('9d release cannot clear another tab live wallet', (await pend(q))?.status==='awaiting-wallet','pending='+(await pend(q))?.status);
  await until(async()=>/in time/.test(await status(p)),9000);const stA=await status(p),en=await p.evaluate(()=>!document.getElementById('burnGo').disabled),pn=await pend(p);
  chain.hold=true;await p.evaluate(()=>window.__gate());await pause(300);await p.evaluate(()=>{window.__mode='ok';});if(en)await click(p);await pause(800);
  ok('9d timeout persists unknown and permits at most one send',chain.sent.length-s0===1&&pn?.status==='unknown-outcome'&&!en,'sends='+(chain.sent.length-s0)+' pending='+JSON.stringify(pn)+' burnGoEnabled='+en+' status="'+stA+'" walletPrompts='+(await calls(p)));chain.hold=false;await ctx.close();}
 // 9c control: same ambiguous error without release
 {const ctx=await context(),p=await page(ctx);await ready(p);await p.evaluate(()=>window.__mode='gateSendError');const s0=chain.sent.length;await click(p);await until(async()=>await calls(p)===1);await p.evaluate(()=>window.__gate());await pause(800);
  ok('9c control: ambiguous error without release -> unknown-outcome',(await pend(p))?.status==='unknown-outcome'&&chain.sent.length-s0===1);await ctx.close();}
 }
 // 9e: even a stale UNKNOWN OUTCOME panel cannot clear a wallet request while its Web Lock is held.
 {const ctx=await context(),p=await page(ctx),q=await page(ctx);await ready(p);await p.evaluate(()=>window.__mode='gate');await click(p);await until(async()=>await calls(p)===1);
  await p.evaluate(()=>{const key='rh-live-pending-v1',v=JSON.parse(localStorage.getItem(key));localStorage.setItem(key,JSON.stringify({...v,status:'unknown-outcome'}));});
  await q.locator('#burnUnknownRelease').waitFor();await q.locator('#burnUnknownRelease').click();await q.locator('#unknownReleaseAgree').check();await q.locator('#unknownReleaseGo').click();await pause(100);
  ok('9e RELEASE requires a free Web Lock even with a stale panel',(await pend(q))?.status==='unknown-outcome'&&await held(q)===1,'pending='+(await pend(q))?.status);await ctx.close();}
 // 9f: a missing storage row cannot erase the owner's wallet-request memory after an ambiguous send.
 {const ctx=await context(),p=await page(ctx);await ready(p);await p.evaluate(()=>window.__mode='gateSendError');const s0=chain.sent.length;await click(p);await until(async()=>await calls(p)===1);
  await p.evaluate(()=>localStorage.removeItem('rh-live-pending-v1'));await p.evaluate(()=>window.__gate());await until(async()=>(await pend(p))?.status==='unknown-outcome');
  ok('9f wallet error restores unknown from memory after storage row disappears',(await pend(p))?.status==='unknown-outcome'&&chain.sent.length-s0===1,'pending='+(await pend(p))?.status+' sends='+(chain.sent.length-s0));await ctx.close();}
 // 9g: storage loss just before onWalletRequest is repaired before the wallet sees the send.
 {const ctx=await context(),p=await page(ctx);await ready(p);await p.evaluate(()=>{window.__mode='gate';window.__removeBeforeWalletRequest=true;});await click(p);await until(async()=>await calls(p)===1);
  const row=await pend(p);ok('9g markWalletRequest restores a missing pending row before send',row?.status==='awaiting-wallet'&&row.walletRequested===true&&row.nonce>0&&/^0x/.test(row.sentBlock||''),'pending='+JSON.stringify(row));await ctx.close();}
 if(!process.env.BURN_RELEASE_MUTATION){
 // 10. duplicate tab (sessionStorage copied) while owner waits
 {const ctx=await context(),p=await page(ctx);await ready(p);await p.evaluate(()=>window.__mode='gate');const s0=chain.sent.length;await click(p);await until(async()=>await calls(p)===1);
  const id=await p.evaluate(()=>sessionStorage.getItem('rh-live-burn-tab-v1'));const d=await page(ctx,`sessionStorage.setItem('rh-live-burn-tab-v1',${JSON.stringify(id)})`);
  const st=await pend(d);chain.hold=true;await p.evaluate(()=>window.__gate());await until(async()=>(await pend(p))?.status==='pending');
  await ready(d);await click(d);await pause(400);
  ok('10 duplicate tab: 1 send, duplicate refused',chain.sent.length-s0===1&&await calls(d)===0,'dupSawOnLoad='+st?.status+' sends='+(chain.sent.length-s0));chain.hold=false;await ctx.close();}
 // 11. lock released only after pending hash is visible: observe from other tab at the instant lock frees
 {const ctx=await context(),p=await page(ctx),q=await page(ctx);await ready(p);await p.evaluate(()=>window.__mode='delay');chain.hold=true;
  const probe=q.evaluate(()=>navigator.locks.request('rh-live-burn-send',async()=>JSON.parse(localStorage.getItem('rh-live-pending-v1'))));
  await pause(50);await click(p);const seen=await probe;
  // q may win first (before p). Retry once the other way.
  const probe2=q.evaluate(async()=>{await new Promise(r=>setTimeout(r,300));return navigator.locks.request('rh-live-burn-send',async()=>JSON.parse(localStorage.getItem('rh-live-pending-v1')));});const seen2=await probe2;
  ok('11 when the send lock frees, storage already holds hash',seen2?.status==='pending'&&/^0x/.test(seen2?.tx||''),'first='+seen?.status+' second='+JSON.stringify(seen2)?.slice(0,60));chain.hold=false;await ctx.close();}
 }
 ok('no page errors',errors.length===0,errors.slice(0,3).join(' | '));
}finally{await b.close();app.server.close();}
console.log(pass+'/'+(pass+fail)+' passed; total chain sends',chain.sent.length);process.exit(fail?1:0);
