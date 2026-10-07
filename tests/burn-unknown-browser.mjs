// Unknown burn outcomes remain locked until chain restore or an explicit release. Run: node tests/burn-unknown-browser.mjs
import { chromium } from 'playwright';
import {readFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import path from 'node:path';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
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
  const provider={request:async r=>{if(r.method==='eth_sendTransaction'){window.__sendCalls++;if(window.__networkError)throw Error('Network connection interrupted');if(window.__holdBeforeSend)await new Promise(resolve=>(window.__sendResolvers??=[]).push(resolve));}if(r.method==='eth_getTransactionReceipt'&&window.__pending)return null;const result=await h(r);if(r.method==='eth_sendTransaction'&&window.__holdHash)await new Promise(resolve=>(window.__hashResolvers??=[]).push(resolve));if(r.method==='eth_getTransactionReceipt'&&result&&window.__wrongHash)return {...result,transactionHash:'0x'+'f'.repeat(64)};return result;},on(ev,fn){(listeners[ev]??=[]).push(fn);}};
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
try{
 {
  const {p,ctx}=await setup();await p.evaluate(()=>{window.__holdHash=true;const original=window.setTimeout;window.setTimeout=(fn,ms,...args)=>original(fn,ms===300000?1000:ms,...args);});await begin(p);
  await p.waitForTimeout(1500);
  const state=await p.evaluate(()=>({pending:JSON.parse(localStorage.getItem('rh-live-pending-v1')),sends:window.__sendCalls,txs:window.__txs?.length||0,panel:document.getElementById('burnUnknownPanel')?.innerText||''}));
  check('wallet timeout keeps exactly one send and persists UNKNOWN OUTCOME',state.sends===1&&state.txs===1&&state.pending?.status==='unknown-outcome',JSON.stringify(state.pending)+' sends='+state.sends);
  check('timeout shows the single required unknown-outcome panel',state.panel.includes(unknownText)&&await p.locator('#burnUnknownPanel').count()===1,state.panel);
  await p.locator('#burnUnknownRestore').click();await p.waitForFunction(()=>/No matching burn was found yet/.test(document.getElementById('toast')?.textContent||''));
  const afterRestore=await p.evaluate(()=>({pending:JSON.parse(localStorage.getItem('rh-live-pending-v1')),panel:!!document.getElementById('burnUnknownPanel')}));
  check('an empty RESTORE scan keeps the unknown lock in place',afterRestore.pending?.status==='unknown-outcome'&&afterRestore.panel,JSON.stringify(afterRestore.pending));
  if(await p.locator('#modal').evaluate(e=>e.open)){if(state.pending)await p.locator('#burnCancel').click();else await p.locator('#burnGo').click();}else await p.locator('[data-burn="citrus"]').click();await p.waitForTimeout(150);
  check('timeout lock prevents a second burn',await p.evaluate(()=>window.__sendCalls)===1,'eth_sendTransaction calls='+await p.evaluate(()=>window.__sendCalls));await ctx.close();
 }
 {
  const {p,ctx}=await setup();await p.evaluate(()=>window.__networkError=true);await p.locator('[data-burn="lilac"]').click();await p.locator('#burnAgree').check();await p.locator('#burnGo').click();
  await p.locator('#burnUnknownPanel').waitFor({state:'visible'});const state=await p.evaluate(()=>({pending:JSON.parse(localStorage.getItem('rh-live-pending-v1')),calls:window.__sendCalls,txs:window.__txs?.length||0,panel:document.getElementById('burnUnknownPanel')?.innerText||''}));
  check('wallet network error after eth_sendTransaction starts remains UNKNOWN OUTCOME',state.pending?.status==='unknown-outcome'&&state.calls===1&&state.txs===0&&state.panel.includes(unknownText),JSON.stringify(state.pending));await ctx.close();
 }
 {
  const {p,ctx}=await setup();await p.evaluate(()=>window.__failBalance=true);await p.locator('[data-burn="lilac"]').click();await p.locator('#burnAgree').check();await p.locator('#burnGo').click();
  await p.waitForFunction(()=>/Could not read RF balance before wallet request/.test(document.getElementById('burnStatus')?.textContent||''));const state=await p.evaluate(()=>({pending:JSON.parse(localStorage.getItem('rh-live-pending-v1')),calls:window.__sendCalls,panel:!!document.getElementById('burnUnknownPanel')}));
  check('failure before the wallet request releases the lock with no send',state.pending===null&&state.calls===0&&!state.panel,JSON.stringify(state));await ctx.close();
 }
 {
  const {p,ctx}=await setup();await p.evaluate(()=>window.__holdBeforeSend=true);await beginWaiting(p);const firstCalls=await p.evaluate(()=>window.__sendCalls);await p.reload();await p.waitForTimeout(500);
  const state=await p.evaluate(()=>({pending:JSON.parse(localStorage.getItem('rh-live-pending-v1')),panel:document.getElementById('burnUnknownPanel')?.innerText||'',visible:!!document.getElementById('burnUnknownPanel')&&!document.getElementById('burnUnknownPanel').hidden}));
  check('reload preserves a hashless awaiting-wallet lock as UNKNOWN OUTCOME',state.pending?.status==='unknown-outcome'&&state.visible,state.panel);
  check('reload panel gives the exact wallet-activity instruction',state.panel.includes(unknownText),state.panel);
  await p.locator('nav button[data-route="studio"]').click();await p.waitForTimeout(200);if(await p.locator('[data-mode="live"]').count())await p.locator('[data-mode="live"]').click();await p.waitForTimeout(200);await p.locator('[data-burn="citrus"]').click();
  if(await p.locator('#modal').evaluate(e=>e.open)){await p.locator('#burnAgree').check();await p.locator('#burnGo').click();await p.waitForFunction(()=>window.__sendCalls>0,null,{timeout:2500}).catch(()=>{});}
  const after=await p.evaluate(()=>({calls:window.__sendCalls,pending:JSON.parse(localStorage.getItem('rh-live-pending-v1'))}));
  check('reload requires RESTORE or explicit RELEASE before another send',firstCalls+after.calls===1&&after.pending?.status==='unknown-outcome','wallet requests='+(firstCalls+after.calls)+' pending='+after.pending?.status);await ctx.close();
 }
 {
  const {p,ctx}=await setup();await p.evaluate(()=>window.__holdBeforeSend=true);await beginWaiting(p);const firstCalls=await p.evaluate(()=>window.__sendCalls);
  const orphan=await ctx.newPage();await orphan.goto('file:///'+html);await orphan.waitForTimeout(300);await p.close();await orphan.locator('#burnUnknownRelease').waitFor({state:'visible'});
  const panel=orphan.locator('#burnUnknownPanel'),panelVisible=await panel.count()>0&&await panel.isVisible();
  check('orphaned owner lock is available in another tab',panelVisible&&await orphan.locator('#burnUnknownRestore').isVisible()&&await orphan.locator('#burnUnknownRelease').isVisible(),panelVisible?await panel.innerText():'unknown-outcome panel missing');
  if(panelVisible){
   await orphan.locator('#burnUnknownRelease').click();const consent=await orphan.locator('#dialogContent').innerText();
   check('RELEASE LOCK requires the exact checked confirmation',consent.includes('I checked my wallet: the burn was not sent or was rejected. If it was sent, retrying burns RF again.')&&await orphan.locator('#unknownReleaseGo').isDisabled(),consent);
   await orphan.locator('#unknownReleaseAgree').check();await orphan.locator('#unknownReleaseGo').click();await orphan.waitForFunction(()=>JSON.parse(localStorage.getItem('rh-live-pending-v1'))===null);
   check('orphan release clears the lock after confirmation with no extra send',firstCalls===1&&await orphan.evaluate(()=>window.__sendCalls)===0,JSON.stringify(await orphan.evaluate(()=>({pending:JSON.parse(localStorage.getItem('rh-live-pending-v1')),calls:window.__sendCalls}))));
   await orphan.locator('nav button[data-route="studio"]').click();if(await orphan.locator('[data-mode="live"]').count())await orphan.locator('[data-mode="live"]').click();await orphan.waitForTimeout(200);await orphan.locator('[data-burn="citrus"]').click();
   check('a burn can be prepared again after explicit release',await orphan.locator('#modal').evaluate(e=>e.open)&&firstCalls+await orphan.evaluate(()=>window.__sendCalls)===1,'requests before confirming new burn='+(firstCalls+await orphan.evaluate(()=>window.__sendCalls)));
  }await ctx.close();
 }
 {
  const {p,ctx,setExtraBurns}=await setup();await p.evaluate(()=>window.__holdBeforeSend=true);await beginWaiting(p);const firstCalls=await p.evaluate(()=>window.__sendCalls);
  const nonce=await p.evaluate(()=>JSON.parse(localStorage.getItem('rh-live-pending-v1')).nonce);
  const match={hash:'0x'+(0xc001n).toString(16).padStart(64,'0'),from:ACCOUNT.toLowerCase(),to:TOKEN,dest:DEAD,amount:250n*10n**18n,block:'0x3f0c3a6',input:burnInput(250n*10n**18n,nonce)};setExtraBurns([match]);await p.reload();await p.waitForTimeout(350);
  const restoreAvailable=await p.locator('#burnUnknownRestore').count()>0;if(restoreAvailable){await p.locator('#burnUnknownRestore').click();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('rh-live-pending-v1'))===null,null,{timeout:7000}).catch(()=>{});}
  const state=await p.evaluate(()=>({pending:JSON.parse(localStorage.getItem('rh-live-pending-v1')),burns:JSON.parse(localStorage.getItem('rh-cutaway-v1')).live.burns,panel:!document.getElementById('burnUnknownPanel'),calls:window.__sendCalls}));
  check('RESTORE FROM CHAIN finds the matching player burn and clears the lock',restoreAvailable&&state.pending===null&&state.burns.some(x=>x.item==='lilac'&&x.tx===match.hash.toLowerCase())&&state.panel===true&&firstCalls+state.calls===1,JSON.stringify(state));await ctx.close();
 }
 {
  const {p,ctx}=await setup();await p.evaluate(()=>window.__reject=true);await p.locator('[data-burn="lilac"]').click();await p.locator('#burnAgree').check();await p.locator('#burnGo').click();
  await p.waitForFunction(()=>/Cancelled in the wallet/.test(document.getElementById('burnStatus')?.textContent||''));
  let state=await p.evaluate(()=>({sends:window.__sendCalls,txs:window.__txs?.length||0,pending:JSON.parse(localStorage.getItem('rh-live-pending-v1')),panel:!!document.getElementById('burnUnknownPanel')&&!document.getElementById('burnUnknownPanel').hidden}));
  check('explicit EIP-1193 rejection releases the lock immediately',state.sends===1&&state.txs===0&&!state.pending&&!state.panel,JSON.stringify(state));
  await p.evaluate(()=>window.__reject=false);await p.locator('#burnGo').click();await p.waitForFunction(()=>window.__txs?.length===1);
  state=await p.evaluate(()=>({sends:window.__sendCalls,txs:window.__txs?.length||0,pending:JSON.parse(localStorage.getItem('rh-live-pending-v1'))}));
  check('a new burn can proceed after explicit rejection',state.sends===2&&state.txs===1&&state.pending?.tx,'calls='+state.sends+' sends='+state.txs);await ctx.close();
 }
}finally{await browser.close();}
if(failures.length)throw new Error(failures.length+' unknown-outcome burn probe(s) failed:\n'+failures.join('\n'));
console.log('All unknown-outcome burn probes passed.');
