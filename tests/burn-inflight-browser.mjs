// B1′: a hashless wallet request fences burns in one window and across tabs. Run: node tests/burn-inflight-browser.mjs
import { chromium } from 'playwright';
import {readFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import path from 'node:path';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html=path.join(root,'index.html'),art=readFileSync(path.join(root,'src/art.js'),'utf8');
const RF=JSON.parse(art.slice(art.indexOf('['),art.lastIndexOf(']')+1));
const ACCOUNT='0x1111111111111111111111111111111111111111';
const chain={ids:{'3412':{family:0,seed:3412},'7730':{family:5,seed:7730}},frames:Object.fromEntries(RF.map(x=>[x.familyId+':'+x.seed,x.frames]))};
function handler(chain,ACCOUNT){
 const w=v=>BigInt(v).toString(16).padStart(64,'0'),G='0x14c49e6118f46525de9ab41a51cbaa3c6ebf181d',R='0x246e3e9730a7eade94c79be0fd78d210f89aeb8d';
 let chainId='0x1';const owned=['3412','7730'];
 const RF='0x0779369854d3ecdea927206718ffd7730c67b71f',DEAD='0x000000000000000000000000000000000000dead',T='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',E=10n**18n;
 const OTHER='0x5555555555555555555555555555555555555555',bal={[ACCOUNT.toLowerCase()]:12345n*E/10n,[DEAD]:1000n*E,[OTHER]:50n*E};
 // One earlier tagged burn by another player: 7 RF tribute for Friend #1234.
 const txs=[{hash:'0x'+w(0xa001),from:OTHER,to:RF,dest:DEAD,amount:7n*E,block:'0x1000',input:'0xa9059cbb'+w(DEAD)+w(7n*E)+'5248535401'+'09'+'0000'+w(1234).slice(16)}];
 return async({method,params})=>{
  if(method==='eth_requestAccounts'||method==='eth_accounts')return [ACCOUNT];
  if(method==='eth_chainId')return chainId;
  if(method==='wallet_switchEthereumChain'){chainId=params[0].chainId;return null;}
  if(method==='eth_blockNumber')return '0x3f0c3a5';
  // RF token: balances, transfers to 0x…dEaD, receipts and tagged history (LIVE BURN).
  if(method==='eth_sendTransaction'){const tx=params[0],d=tx.data.slice(2);if(globalThis.__reject)throw Object.assign(new Error('User rejected the request.'),{code:4001});if(tx.to.toLowerCase()!==RF||d.slice(0,8)!=='a9059cbb')throw new Error('mock only knows RF transfers');const to='0x'+d.slice(32,72),amt=BigInt('0x'+d.slice(72,136)),from=tx.from.toLowerCase();if((bal[from]??0n)<amt)throw new Error('insufficient');bal[from]-=amt;bal[to]=(bal[to]??0n)+amt;const hash='0x'+w(0xb000+txs.length);txs.push({hash,from,to:RF,input:tx.data,dest:to,amount:amt,block:'0x'+(5000+txs.length).toString(16)});(globalThis.__txs=globalThis.__txs||[]).push(tx);return hash;}
  if(method==='eth_getTransactionReceipt'){const t=txs.find(x=>x.hash===params[0]);return t?{status:'0x1',transactionHash:t.hash,blockNumber:t.block,logs:[{address:RF,topics:[T,'0x'+w(t.from),'0x'+w(t.dest)],data:'0x'+w(t.amount)}]}:null;}
  if(method==='eth_getTransactionByHash'){const t=txs.find(x=>x.hash===params[0]);return t?{hash:t.hash,from:t.from,to:t.to,input:t.input,blockNumber:t.block}:null;}
  if(method==='eth_getLogs'&&params[0].address.toLowerCase()===RF){const t=params[0].topics;return txs.filter(x=>x.dest===DEAD&&(!t[1]||t[1]==='0x'+w(x.from))).map(x=>({address:RF,transactionHash:x.hash,blockNumber:x.block,logIndex:'0x0',topics:[T,'0x'+w(x.from),'0x'+w(x.dest)],data:'0x'+w(x.amount)}));}
  if(method==='eth_getLogs'){const t=params[0].topics;if(t[2]===null||t.length===2&&t[1])return t.length===2?[]:owned.map((id,i)=>({blockNumber:'0x'+(100+i).toString(16),logIndex:'0x0',topics:['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef','0x'+w(0),'0x'+w(ACCOUNT),'0x'+w(id)]}));return owned.map((id,i)=>({blockNumber:'0x'+(100+i).toString(16),logIndex:'0x0',topics:['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef','0x'+w(0),'0x'+w(ACCOUNT),'0x'+w(id)]}));}
  if(method==='eth_call'){const {to,data}=params[0],sel=data.slice(2,10),a=data.slice(10),arg=i=>BigInt('0x'+a.slice(64*i,64*i+64)).toString();
   if(to.toLowerCase()===G){if(sel==='70a08231')return '0x'+w(owned.length);if(sel==='6352211e')return '0x'+w(owned.includes(arg(0))?ACCOUNT:'0x2222222222222222222222222222222222222222');if(sel==='7d71dc35')return '0x'+w(1);}
   if(to.toLowerCase()===RF){if(sel==='313ce567')return '0x'+w(18);if(sel==='70a08231'){const who='0x'+BigInt(arg(0)).toString(16).padStart(40,'0');return '0x'+w(bal[who]??42n*E);}}
   if(to.toLowerCase()===G&&sel==='0be76ed6')return '0x'+w('0x3333333333333333333333333333333333333333');
   if(to.toLowerCase()===R){const t=chain.ids[arg(0)]||{family:3,seed:Number(arg(0))};if(sel==='32bd63d1')return '0x'+w(t.family);if(sel==='82829f74')return '0x'+w(t.seed);if(sel==='ead2ca3c'){const f=chain.frames[arg(0)+':'+arg(1)]||chain.frames['0:3412'];return '0x'+f.map(x=>w(x)).join('');}}
   throw Object.assign(new Error('unknown call '+sel),{code:-32000});}
  throw Object.assign(new Error('unsupported '+method),{code:4200});
 };
}
const b=await chromium.launch();
async function setup(){
 const ctx=await b.newContext();ctx.setDefaultTimeout(7000);
 await ctx.addInitScript(({chain,ACCOUNT,src})=>{
  const h=(0,eval)('('+src+')')(chain,ACCOUNT),listeners={};
  const provider={request:async r=>{if(r.method==='eth_getTransactionReceipt'&&window.__pending)return null;const result=await h(r);if(r.method==='eth_sendTransaction'&&window.__holdHash)await new Promise(resolve=>(window.__hashResolvers??=[]).push(resolve));if(r.method==='eth_getTransactionReceipt'&&result&&window.__wrongHash)return {...result,transactionHash:'0x'+'f'.repeat(64)};return result;},on(ev,fn){(listeners[ev]??=[]).push(fn);}};
  window.__pending=true;window.__emit=ev=>listeners[ev]?.forEach(f=>f([]));
  window.addEventListener('eip6963:requestProvider',()=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'mock',name:'Mock',rdns:'test'},provider}})));
 },{chain,ACCOUNT,src:handler.toString()});
 await ctx.route('https://rpc.mainnet.chain.robinhood.com/**',async r=>{const q=JSON.parse(r.request().postData());const result=q.method==='eth_chainId'?'0x1237':await handler(chain,ACCOUNT)(q);await r.fulfill({json:{jsonrpc:'2.0',id:q.id,result}});});
 const p=await ctx.newPage();await p.goto('file:///'+html);await p.waitForTimeout(500);
 await p.locator('#wallet').click();await p.locator('#walletConnect').click();await p.waitForTimeout(900);await p.locator('#closeDialog').click();
 await p.locator('nav button[data-route="studio"]').click();await p.locator('[data-mode="live"]').click();await p.waitForTimeout(300);
 return {p,ctx};
}
async function begin(p,item='lilac'){await p.locator('[data-burn="'+item+'"]').click();await p.locator('#burnAgree').check();await p.locator('#burnGo').click();await p.waitForFunction(()=>globalThis.__txs?.length>0);}
const failures=[];
function check(name,condition,detail=''){console.log((condition?'PASS ':'FAIL ')+name+(detail?' — '+detail:''));if(!condition)failures.push(name+(detail?' — '+detail:''));}
try{
 {
  const {p,ctx}=await setup();await p.evaluate(()=>window.__holdHash=true);await begin(p);await p.locator('#burnCancel').click();
  await p.locator('[data-burn="lilac"]').click();
  if(await p.locator('#modal').evaluate(e=>e.open)){await p.locator('#burnAgree').check();await p.locator('#burnGo').click();}
  await p.waitForTimeout(200);
  const state=await p.evaluate(()=>({sends:window.__txs?.length||0,pending:JSON.parse(localStorage.getItem('rh-cutaway-v1')).live.pending,toast:document.getElementById('toast').textContent,status:document.getElementById('burnStatus')?.textContent||''}));
  check('B1′ hashless wallet request blocks a second burn',state.sends===1,'eth_sendTransaction count='+state.sends);
  check('B1′ awaiting-wallet pending is persisted before hash response',state.pending?.status==='awaiting-wallet'&&!state.pending.tx,JSON.stringify(state.pending));
  check('B1′ blocked action explains the wallet request',/Confirm or reject the previous burn in your wallet first/.test(state.toast+' '+state.status),state.toast+' '+state.status);
  await p.evaluate(()=>{window.__pending=false;window.__holdHash=false;window.__hashResolvers?.forEach(f=>f());});await p.waitForTimeout(400);await ctx.close();
 }
 {
  const {p,ctx}=await setup();await p.evaluate(()=>window.__holdHash=true);await begin(p);
  const second=await ctx.newPage();await second.goto('file:///'+html);await second.waitForTimeout(250);await second.locator('nav button[data-route="studio"]').click();await second.waitForTimeout(200);if(await second.locator('[data-mode="live"]').count())await second.locator('[data-mode="live"]').click();await second.waitForTimeout(200);
  await second.locator('[data-burn="citrus"]').click();await second.waitForTimeout(150);
  const state=await second.evaluate(()=>({sent:window.__txs?.length||0,toast:document.getElementById('toast').textContent,pending:JSON.parse(localStorage.getItem('rh-cutaway-v1')).live.pending}));
  const firstSends=await p.evaluate(()=>window.__txs?.length||0);
  check('B1′ a second window cannot send while the first wallet request is unresolved',firstSends+state.sent===1,'combined eth_sendTransaction count='+(firstSends+state.sent));
  check('B1′ the second window reads the shared hashless pending state',state.pending?.status==='awaiting-wallet'&&/Confirm or reject the previous burn in your wallet first/.test(state.toast),state.toast+' '+JSON.stringify(state.pending));
  await p.evaluate(()=>{window.__pending=false;window.__holdHash=false;window.__hashResolvers?.forEach(f=>f());});await p.waitForTimeout(350);await ctx.close();
 }
 {
  const {p,ctx}=await setup();await p.evaluate(()=>window.__reject=true);await p.locator('[data-burn="lilac"]').click();await p.locator('#burnAgree').check();await p.locator('#burnGo').click();
  await p.waitForFunction(()=>/Cancelled in the wallet/.test(document.getElementById('burnStatus')?.textContent||''));
  let state=await p.evaluate(()=>({sends:window.__txs?.length||0,pending:JSON.parse(localStorage.getItem('rh-cutaway-v1')).live.pending}));
  check('wallet rejection without a hash releases awaiting-wallet',state.sends===0&&!state.pending,JSON.stringify(state));
  await p.evaluate(()=>window.__reject=false);await p.locator('#burnGo').click();await p.waitForFunction(()=>window.__txs?.length===1);
  state=await p.evaluate(()=>({sends:window.__txs?.length||0,pending:JSON.parse(localStorage.getItem('rh-cutaway-v1')).live.pending}));
  check('a new burn can proceed after the wallet rejects the previous request',state.sends===1&&state.pending?.tx,'sends='+state.sends+' pending='+!!state.pending?.tx);await ctx.close();
 }
 {
  const {p,ctx}=await setup();await p.evaluate(()=>window.__holdHash=true);await begin(p);await p.reload();
  await p.locator('nav button[data-route="studio"]').click();await p.waitForTimeout(200);if(await p.locator('[data-mode="live"]').count())await p.locator('[data-mode="live"]').click();await p.waitForTimeout(1800);
  const state=await p.evaluate(()=>({pending:JSON.parse(localStorage.getItem('rh-cutaway-v1')).live.pending,status:document.getElementById('lvStatus')?.textContent||'',restore:!!document.getElementById('lvRestore')}));
  check('reload clears hashless pending and warns about the unknown wallet outcome',!state.pending&&/cannot tell whether it was sent/i.test(state.status),JSON.stringify(state));
  check('reload leaves RESTORE FROM CHAIN available',state.restore,'RESTORE FROM CHAIN button present='+state.restore);await ctx.close();
 }
 {
  const {p,ctx}=await setup();await begin(p);await p.evaluate(()=>{window.__pending=false;window.__wrongHash=true;});await p.waitForTimeout(1800);
  const before=await p.evaluate(()=>({pending:!!JSON.parse(localStorage.getItem('rh-cutaway-v1')).live.pending,burns:JSON.parse(localStorage.getItem('rh-cutaway-v1')).live.burns.length}));
  check('receipt with a mismatched hash stays pending',before.pending&&before.burns===0,JSON.stringify(before));
  await p.evaluate(()=>window.__wrongHash=false);await p.locator('#burnCheck').click();await p.waitForTimeout(300);
  const after=await p.evaluate(()=>({pending:!!JSON.parse(localStorage.getItem('rh-cutaway-v1')).live.pending,burns:JSON.parse(localStorage.getItem('rh-cutaway-v1')).live.burns.length}));
  check('matching receipt resolves the pending burn',!after.pending&&after.burns===1,JSON.stringify(after));await ctx.close();
 }
}finally{await b.close();}
if(failures.length)throw new Error(failures.length+' in-flight burn regression probe(s) failed:\n'+failures.join('\n'));
console.log('All in-flight burn probes passed.');
