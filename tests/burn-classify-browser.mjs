// Browser regressions for ambiguous wallet errors and attempt-bound chain restore.
import { chromium } from 'playwright';
import {readFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const html=path.join(root,'index.html'),art=readFileSync(path.join(root,'src/art.js'),'utf8');
const RF=JSON.parse(art.slice(art.indexOf('['),art.lastIndexOf(']')+1));
const ACCOUNT='0x1111111111111111111111111111111111111111',TOKEN='0x0779369854d3ecdea927206718ffd7730c67b71f',DEAD='0x000000000000000000000000000000000000dead';
const chain={ids:{'3412':{family:0,seed:3412},'7730':{family:5,seed:7730}},frames:Object.fromEntries(RF.map(x=>[x.familyId+':'+x.seed,x.frames]))};
function handler(chain,ACCOUNT,extraBurns=[]){
 const w=v=>BigInt(v).toString(16).padStart(64,'0'),G='0x14c49e6118f46525de9ab41a51cbaa3c6ebf181d',R='0x246e3e9730a7eade94c79be0fd78d210f89aeb8d';
 let chainId='0x1';const owned=['3412','7730'];
 const TOKEN='0x0779369854d3ecdea927206718ffd7730c67b71f',DEAD='0x000000000000000000000000000000000000dead',TRANSFER='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',E=10n**18n;
 const OTHER='0x5555555555555555555555555555555555555555',bal={[ACCOUNT.toLowerCase()]:12345n*E/10n,[DEAD]:1000n*E,[OTHER]:50n*E};
 const txs=[{hash:'0x'+w(0xa001),from:OTHER,to:TOKEN,dest:DEAD,amount:7n*E,block:'0x1000',input:'0xa9059cbb'+w(DEAD)+w(7n*E)+'5248535401'+'09'+'0000'+w(1234).slice(16)},...extraBurns];
 return async({method,params})=>{
  if(method==='eth_requestAccounts'||method==='eth_accounts')return [ACCOUNT];
  if(method==='eth_chainId')return chainId;
  if(method==='wallet_switchEthereumChain'){chainId=params[0].chainId;return null;}
  if(method==='eth_blockNumber')return '0x3f0c3a5';
  if(method==='eth_sendTransaction'){const tx=params[0],d=tx.data.slice(2);if(globalThis.__reject)throw Object.assign(new Error('User rejected the request.'),{code:4001});if(tx.to.toLowerCase()!==TOKEN||d.slice(0,8)!=='a9059cbb')throw Error('mock only knows RF transfers');const to='0x'+d.slice(32,72),amt=BigInt('0x'+d.slice(72,136)),from=tx.from.toLowerCase();if((bal[from]??0n)<amt)throw Error('insufficient');bal[from]-=amt;bal[to]=(bal[to]??0n)+amt;const hash='0x'+w(0xb000+txs.length);txs.push({hash,from,to:TOKEN,input:tx.data,dest:to,amount:amt,block:'0x'+(5000+txs.length).toString(16)});(globalThis.__txs=globalThis.__txs||[]).push(tx);return hash;}
  if(method==='eth_getTransactionReceipt'){const t=txs.find(x=>x.hash===params[0]);return t?{status:'0x1',transactionHash:t.hash,blockNumber:t.block,logs:[{address:TOKEN,topics:[TRANSFER,'0x'+w(t.from),'0x'+w(t.dest)],data:'0x'+w(t.amount)}]}:null;}
  if(method==='eth_getTransactionByHash'){const t=txs.find(x=>x.hash===params[0]);return t?{hash:t.hash,from:t.from,to:t.to,input:t.input,blockNumber:t.block}:null;}
  if(method==='eth_getLogs'&&params[0].address.toLowerCase()===TOKEN){const t=params[0].topics;return txs.filter(x=>x.dest===DEAD&&(!t[1]||t[1]==='0x'+w(x.from))).map(x=>({address:TOKEN,transactionHash:x.hash,blockNumber:x.block,logIndex:'0x0',topics:[TRANSFER,'0x'+w(x.from),'0x'+w(x.dest)],data:'0x'+w(x.amount)}));}
  if(method==='eth_getLogs'){return owned.map((id,i)=>({blockNumber:'0x'+(100+i).toString(16),logIndex:'0x0',topics:[TRANSFER,'0x'+w(0),'0x'+w(ACCOUNT),'0x'+w(id)]}));}
  if(method==='eth_call'){const {to,data}=params[0],sel=data.slice(2,10),a=data.slice(10),arg=i=>BigInt('0x'+a.slice(64*i,64*i+64)).toString();
   if(to.toLowerCase()===G){if(sel==='70a08231')return '0x'+w(owned.length);if(sel==='6352211e')return '0x'+w(owned.includes(arg(0))?ACCOUNT:'0x2222222222222222222222222222222222222222');if(sel==='7d71dc35')return '0x'+w(1);}
   if(to.toLowerCase()===TOKEN){if(sel==='313ce567')return '0x'+w(18);if(sel==='70a08231'){if(globalThis.__failBalance)throw Error('Could not read RF balance before wallet request');const who='0x'+BigInt(arg(0)).toString(16).padStart(40,'0');return '0x'+w(bal[who]??42n*E);}}
   if(to.toLowerCase()===G&&sel==='0be76ed6')return '0x'+w('0x3333333333333333333333333333333333333333');
   if(to.toLowerCase()===R){const t=chain.ids[arg(0)]||{family:3,seed:Number(arg(0))};if(sel==='32bd63d1')return '0x'+w(t.family);if(sel==='82829f74')return '0x'+w(t.seed);if(sel==='ead2ca3c'){const f=chain.frames[arg(0)+':'+arg(1)]||chain.frames['0:3412'];return '0x'+f.map(x=>w(x)).join('');}}
   throw Object.assign(Error('unknown call '+sel),{code:-32000});}
  throw Object.assign(Error('unsupported '+method),{code:4200});
 };
}
const browser=await chromium.launch(),failures=[];
function check(name,condition,detail=''){console.log((condition?'PASS ':'FAIL ')+name+(detail?' — '+detail:''));if(!condition)failures.push(name+(detail?' — '+detail:''));}
async function setup(){
 const ctx=await browser.newContext();ctx.setDefaultTimeout(7000);let extraBurns=[];
 await ctx.addInitScript(({chain,ACCOUNT,src})=>{
  const h=(0,eval)('('+src+')')(chain,ACCOUNT),listeners={};window.__sendCalls=0;
  const provider={request:async r=>{if(r.method==='eth_blockNumber'&&window.__missingHead)throw Error('Could not read head block');if(r.method==='eth_sendTransaction'){window.__sendCalls++;if(window.__networkError)throw Error('Network connection interrupted');if(window.__holdBeforeSend)await new Promise(resolve=>(window.__sendResolvers??=[]).push(resolve));}if(r.method==='eth_getTransactionReceipt'&&window.__pending)return null;const result=await h(r);if(r.method==='eth_sendTransaction'&&window.__postSendError)throw Object.assign(Error(window.__postSendError),{code:-32603});if(r.method==='eth_sendTransaction'&&window.__holdHash)await new Promise(resolve=>(window.__hashResolvers??=[]).push(resolve));if(r.method==='eth_getTransactionReceipt'&&result&&window.__wrongHash)return {...result,transactionHash:'0x'+'f'.repeat(64)};return result;},on(ev,fn){(listeners[ev]??=[]).push(fn);}};
  window.__pending=true;window.__emit=ev=>listeners[ev]?.forEach(f=>f([]));
  window.addEventListener('eip6963:requestProvider',()=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'mock',name:'Mock',rdns:'test'},provider}})));
 },{chain,ACCOUNT,src:handler.toString()});
 await ctx.route('https://rpc.mainnet.chain.robinhood.com/**',async r=>{const q=JSON.parse(r.request().postData());const result=q.method==='eth_chainId'?'0x1237':await handler(chain,ACCOUNT,extraBurns)(q);await r.fulfill({json:{jsonrpc:'2.0',id:q.id,result}});});
 const p=await ctx.newPage();await p.goto('file:///'+html);await p.waitForTimeout(500);await p.locator('#wallet').click();await p.locator('#walletConnect').click();await p.waitForTimeout(900);await p.locator('#closeDialog').click();await p.locator('nav button[data-route="studio"]').click();await p.locator('[data-mode="live"]').click();await p.waitForTimeout(300);
 return {p,ctx,setExtraBurns:rows=>extraBurns=rows};
}
async function begin(p,item='lilac'){
 await p.locator('[data-burn="'+item+'"]').click();await p.locator('#burnAgree').check();await p.locator('#burnGo').click();
 await p.waitForFunction(()=>globalThis.__sendCalls>0).catch(async e=>{const state=await p.evaluate(()=>({calls:window.__sendCalls,modal:document.getElementById('modal').open,go:document.getElementById('burnGo')?.disabled,status:document.getElementById('burnStatus')?.textContent,toast:document.getElementById('toast')?.textContent,pending:JSON.parse(localStorage.getItem('rh-live-pending-v1'))}));console.log('BEGIN REQUEST DEBUG',JSON.stringify(state));throw e;});
 await p.waitForFunction(()=>globalThis.__txs?.length>0).catch(async e=>{const state=await p.evaluate(()=>({calls:window.__sendCalls,txs:window.__txs?.length,status:document.getElementById('burnStatus')?.textContent,toast:document.getElementById('toast')?.textContent,pending:JSON.parse(localStorage.getItem('rh-live-pending-v1'))}));console.log('BEGIN DEBUG',JSON.stringify(state));throw e;});
}
async function beginWaiting(p,item='lilac'){await p.locator('[data-burn="'+item+'"]').click();await p.locator('#burnAgree').check();await p.locator('#burnGo').click();await p.waitForFunction(()=>globalThis.__sendCalls>0);}
const unknownText="We don't know if your wallet sent the burn. Check your wallet's activity before trying again.";
const burnInput=(amount=10n*10n**18n,nonce=0)=>'0xa9059cbb'+BigInt(DEAD).toString(16).padStart(64,'0')+amount.toString(16).padStart(64,'0')+'5248535401'+'02'+nonce.toString(16).padStart(4,'0')+''.padStart(48,'0');
try {
 for(const msg of ['RPC response rejected: upstream connection closed','Access denied while retrieving transaction result']) {
 const {p,ctx}=await setup();await p.evaluate(msg=>window.__postSendError=msg,msg);await begin(p);await p.waitForTimeout(300);
 if(await p.locator('#burnGo').isVisible())await p.locator('#burnGo').click();await p.waitForTimeout(300);
 const state=await p.evaluate(()=>({sends:window.__sendCalls,transfers:window.__txs?.length,pending:JSON.parse(localStorage.getItem('rh-live-pending-v1')),panel:document.getElementById('burnUnknownPanel')?.innerText||'',status:document.getElementById('burnStatus')?.textContent||''}));
 check('ERROR_CLASS '+msg,state.sends===1&&state.transfers===1&&state.pending?.status==='unknown-outcome'&&state.panel.includes(unknownText)&&!state.status.includes('Nothing was burned'),JSON.stringify(state));await ctx.close();
 }
 {
 const {p,ctx,setExtraBurns}=await setup();await p.evaluate(()=>window.__holdHash=true);await begin(p,'ash');const firstCalls=await p.evaluate(()=>window.__sendCalls);
 const attempt=await p.evaluate(()=>JSON.parse(localStorage.getItem('rh-live-pending-v1')));
 const old={hash:'0x'+(0xc001n).toString(16).padStart(64,'0'),from:ACCOUNT.toLowerCase(),to:TOKEN,dest:DEAD,amount:10n**18n,block:'0x1000',input:burnInput(10n**18n,attempt.nonce).replace('524853540102','524853540109')};
 setExtraBurns([old]);await p.reload();await p.waitForTimeout(350);await p.locator('#burnUnknownRestore').click();await p.waitForTimeout(700);
 const restored=await p.evaluate(()=>JSON.parse(localStorage.getItem('rh-live-pending-v1'))===null);
 await p.locator('nav button[data-route="studio"]').click();await p.locator('[data-mode="live"]').click();await p.waitForTimeout(300);
 if(restored)await begin(p,'ash');else await p.locator('[data-burn="ash"]').click();
 const state=await p.evaluate(()=>({sends:window.__sendCalls,pending:JSON.parse(localStorage.getItem('rh-live-pending-v1')),panel:document.getElementById('burnUnknownPanel')?.innerText||''}));
 check('OLD_RESTORE keeps the current burn locked',firstCalls+state.sends===1&&state.pending?.status==='unknown-outcome'&&state.panel.includes(unknownText),JSON.stringify(state));await ctx.close();
 }
 {
 const {p,ctx,setExtraBurns}=await setup();await p.evaluate(()=>window.__holdHash=true);await begin(p,'ash');const firstCalls=await p.evaluate(()=>window.__sendCalls);
 await p.reload();await p.waitForTimeout(350);
 const pending=await p.evaluate(()=>JSON.parse(localStorage.getItem('rh-live-pending-v1')));
 const fresh={hash:'0x'+(0xd001n).toString(16).padStart(64,'0'),from:ACCOUNT.toLowerCase(),to:TOKEN,dest:DEAD,amount:10n**18n,block:'0x'+(BigInt(pending.sentBlock)+1n).toString(16),input:burnInput(10n**18n,pending.nonce).replace('524853540102','524853540109')};
 setExtraBurns([fresh]);await p.locator('#burnUnknownRestore').click();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('rh-live-pending-v1'))===null).catch(()=>{});
 const state=await p.evaluate(()=>({sends:window.__sendCalls,pending:JSON.parse(localStorage.getItem('rh-live-pending-v1')),burns:JSON.parse(localStorage.getItem('rh-cutaway-v1')).live.burns}));
 check('NEW_RESTORE accepts a new matching burn after sentBlock',state.pending===null&&state.burns.some(b=>b.tx===fresh.hash)&&firstCalls+state.sends===1,JSON.stringify(state));await ctx.close();
 }
 {
 const {p,ctx,setExtraBurns}=await setup();await p.evaluate(()=>window.__holdHash=true);await begin(p,'ash');await p.reload();await p.waitForTimeout(350);
 const pending=await p.evaluate(()=>JSON.parse(localStorage.getItem('rh-live-pending-v1')));
 const cached={hash:'0x'+(0xd003n).toString(16).padStart(64,'0'),from:ACCOUNT.toLowerCase(),to:TOKEN,dest:DEAD,amount:10n**18n,block:'0x'+(BigInt(pending.sentBlock)+1n).toString(16),input:burnInput(10n**18n,pending.nonce).replace('524853540102','524853540109')};
 setExtraBurns([cached]);await p.evaluate(row=>{const save=JSON.parse(localStorage.getItem('rh-cutaway-v1'));save.live.burns.push(row);localStorage.setItem('rh-cutaway-v1',JSON.stringify(save));},{tx:cached.hash,block:cached.block,from:cached.from,item:'ash',amount:cached.amount.toString(),friendId:null});
 await p.reload();await p.waitForTimeout(350);await p.locator('#burnUnknownRestore').click();await p.waitForTimeout(500);
 const state=await p.evaluate(()=>({pending:JSON.parse(localStorage.getItem('rh-live-pending-v1')),panel:document.getElementById('burnUnknownPanel')?.innerText||''}));
 check('CACHED_RESTORE cannot reuse an already recorded hash',state.pending?.status==='unknown-outcome'&&state.panel.includes(unknownText),JSON.stringify(state));await ctx.close();
 }
 {
 const {p,ctx,setExtraBurns}=await setup();await p.evaluate(()=>{window.__holdHash=true;window.__missingHead=true;});await begin(p,'ash');await p.reload();await p.waitForTimeout(350);
 const pending=await p.evaluate(()=>JSON.parse(localStorage.getItem('rh-live-pending-v1')));
 const fresh={hash:'0x'+(0xd002n).toString(16).padStart(64,'0'),from:ACCOUNT.toLowerCase(),to:TOKEN,dest:DEAD,amount:10n**18n,block:'0x3f0c3a6',input:burnInput(10n**18n,pending.nonce).replace('524853540102','524853540109')};
 setExtraBurns([fresh]);await p.locator('#burnUnknownRestore').click();await p.waitForTimeout(500);
 const state=await p.evaluate(()=>({pending:JSON.parse(localStorage.getItem('rh-live-pending-v1')),panel:document.getElementById('burnUnknownPanel')?.innerText||''}));
 check('MISSING_HEAD cannot release an unknown burn',state.pending?.status==='unknown-outcome'&&state.pending.sentBlock===null&&state.panel.includes(unknownText),JSON.stringify(state));await ctx.close();
 }
}finally{await browser.close();}
if(failures.length)throw Error(failures.length+' burn classification probe(s) failed:\n'+failures.join('\n'));
console.log('All burn classification probes passed.');
