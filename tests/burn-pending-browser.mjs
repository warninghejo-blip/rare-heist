// Astra's pending/account-change browser probes, adapted to this worktree. Tribute and Vault Bounty are retired items.
// Run after `node build.mjs`: node tests/burn-pending-browser.mjs
import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html=path.join(root,'index.html'),art=readFileSync(path.join(root,'src/art.js'),'utf8');
const RF_ART=JSON.parse(art.slice(art.indexOf('['),art.lastIndexOf(']')+1));
const ACCOUNT='0x1111111111111111111111111111111111111111';
const chain={ids:{'3412':{family:0,seed:3412},'7730':{family:5,seed:7730}},frames:Object.fromEntries(RF_ART.map(x=>[x.familyId+':'+x.seed,x.frames]))};
const b=await chromium.launch(),failures=[];
function check(name,condition,detail=''){
 console.log((condition?'PASS ':'FAIL ')+name+(detail?' — '+detail:''));
 if(!condition)failures.push(name+(detail?' — '+detail:''));
}
function handler(chain,account){
 const w=v=>BigInt(v).toString(16).padStart(64,'0'),G='0x14c49e6118f46525de9ab41a51cbaa3c6ebf181d',R='0x246e3e9730a7eade94c79be0fd78d210f89aeb8d';
 let chainId='0x1';const owned=['3412','7730'];
 const TOKEN='0x0779369854d3ecdea927206718ffd7730c67b71f',DEAD='0x000000000000000000000000000000000000dead',TRANSFER='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',E=10n**18n;
 const OTHER='0x5555555555555555555555555555555555555555',balances={[account.toLowerCase()]:12345n*E/10n,[DEAD]:1000n*E,[OTHER]:50n*E};
 const store=typeof localStorage==='undefined'?{getItem:k=>globalThis.__burnProbeStore?.[k]??null,setItem:(k,v)=>{globalThis.__burnProbeStore??={};globalThis.__burnProbeStore[k]=v;}}:localStorage;
 const sent=JSON.parse(store.getItem('__burnProbeTxs')||'[]').map(t=>({...t,amount:String(t.amount)}));
 const old={hash:'0x'+w(0xa001),from:OTHER,to:TOKEN,dest:DEAD,amount:String(7n*E),block:'0x1000',input:'0xa9059cbb'+w(DEAD)+w(7n*E)+'5248535401'+'09'+'0000'+w(1234).slice(16)};
 const txs=[old,...sent];
 const remember=()=>store.setItem('__burnProbeTxs',JSON.stringify(sent));
 return async({method,params})=>{
  if(method==='eth_requestAccounts'||method==='eth_accounts')return [account];
  if(method==='eth_chainId')return chainId;
  if(method==='wallet_switchEthereumChain'){chainId=params[0].chainId;return null;}
  if(method==='eth_blockNumber')return '0x3f0c3a5';
  if(method==='eth_sendTransaction'){
   const tx=params[0],data=tx.data.slice(2);if(window.__reject)throw Object.assign(new Error('User rejected the request.'),{code:4001});
   if(tx.to.toLowerCase()!==TOKEN||data.slice(0,8)!=='a9059cbb')throw Error('mock only knows RF transfers');
   const dest='0x'+data.slice(32,72),amount=BigInt('0x'+data.slice(72,136)),from=tx.from.toLowerCase();
   if((balances[from]??0n)<amount)throw Error('insufficient');balances[from]-=amount;balances[dest]=(balances[dest]??0n)+amount;
   const hash='0x'+w(0xb000+sent.length),entry={hash,from,to:TOKEN,input:tx.data,dest,amount:String(amount),block:'0x'+(5000+sent.length).toString(16)};
   sent.push(entry);txs.push(entry);remember();(window.__txs??=[]).push(tx);return hash;
  }
  if(method==='eth_getTransactionReceipt'){
   const hashes=JSON.parse(store.getItem('__burnProbeReceiptHashes')||'[]');hashes.push(params[0]);store.setItem('__burnProbeReceiptHashes',JSON.stringify(hashes));
   const t=txs.find(x=>x.hash===params[0]),failed=t&&t.hash!==old.hash&&store.getItem('__burnProbeFailReceipt')==='true';return t?{status:failed?'0x0':'0x1',transactionHash:t.hash,blockNumber:t.block,logs:[{address:TOKEN,topics:[TRANSFER,'0x'+w(t.from),'0x'+w(t.dest)],data:'0x'+w(BigInt(t.amount))}]}:null;
  }
  if(method==='eth_getTransactionByHash'){const t=txs.find(x=>x.hash===params[0]);return t?{hash:t.hash,from:t.from,to:t.to,input:t.input,blockNumber:t.block}:null;}
  if(method==='eth_getLogs'&&params[0].address.toLowerCase()===TOKEN){
   const topics=params[0].topics;return txs.filter(x=>x.dest===DEAD&&!(x.hash!==old.hash&&store.getItem('__burnProbeFailReceipt')==='true')&&(!topics[1]||topics[1].toLowerCase()==='0x'+w(x.from))&&(!topics[2]||topics[2].toLowerCase()==='0x'+w(x.dest))).map(x=>({address:TOKEN,transactionHash:x.hash,blockNumber:x.block,logIndex:'0x0',topics:[TRANSFER,'0x'+w(x.from),'0x'+w(x.dest)],data:'0x'+w(BigInt(x.amount))}));
  }
  if(method==='eth_getLogs'){
   const topics=params[0].topics;
   if(topics[2]===null||topics.length===2&&topics[1])return topics.length===2?[]:owned.map((id,i)=>({blockNumber:'0x'+(100+i).toString(16),logIndex:'0x0',topics:[TRANSFER,'0x'+w(0),'0x'+w(account),'0x'+w(id)]}));
   return owned.map((id,i)=>({blockNumber:'0x'+(100+i).toString(16),logIndex:'0x0',topics:[TRANSFER,'0x'+w(0),'0x'+w(account),'0x'+w(id)]}));
  }
  if(method==='eth_call'){
   const {to,data}=params[0],sel=data.slice(2,10),args=data.slice(10),arg=i=>BigInt('0x'+args.slice(64*i,64*i+64)).toString();
   if(to.toLowerCase()===G){if(sel==='70a08231')return '0x'+w(owned.length);if(sel==='6352211e')return '0x'+w(owned.includes(arg(0))?account:'0x2222222222222222222222222222222222222222');if(sel==='7d71dc35')return '0x'+w(1);if(sel==='0be76ed6')return '0x'+w('0x3333333333333333333333333333333333333333');}
   if(to.toLowerCase()===TOKEN){if(sel==='313ce567')return '0x'+w(18);if(sel==='70a08231'){const who='0x'+BigInt(arg(0)).toString(16).padStart(40,'0');return '0x'+w(balances[who]??42n*E);}}
   if(to.toLowerCase()===R){const x=chain.ids[arg(0)]||{family:3,seed:Number(arg(0))};if(sel==='32bd63d1')return '0x'+w(x.family);if(sel==='82829f74')return '0x'+w(x.seed);if(sel==='ead2ca3c'){const frames=chain.frames[arg(0)+':'+arg(1)]||chain.frames['0:3412'];return '0x'+frames.map(v=>w(v)).join('');}}
   throw Object.assign(new Error('unknown call '+sel),{code:-32000});
  }
  throw Object.assign(new Error('unsupported '+method),{code:4200});
 };
}
async function setup(){
 const ctx=await b.newContext();ctx.setDefaultTimeout(6000);
 await ctx.addInitScript(({chain,account,src})=>{
  if(window.name!=='__burnProbeInitialized'){
   for(const key of ['rh-cutaway-v1','rh-live-pending-v1','__burnProbeHoldReceipt','__burnProbeFailReceipt','__burnProbeTxs','__burnProbeReceiptHashes'])localStorage.removeItem(key);
   localStorage.setItem('__burnProbeHoldReceipt','true');window.name='__burnProbeInitialized';
  }
  const originalFetch=window.fetch.bind(window);window.fetch=(input,options)=>{try{const q=JSON.parse(options.body);if(q.method==='eth_getTransactionReceipt'){const hashes=JSON.parse(localStorage.getItem('__burnProbeReceiptHashes')||'[]');hashes.push(q.params[0]);localStorage.setItem('__burnProbeReceiptHashes',JSON.stringify(hashes));}}catch{}return originalFetch(input,options);};
  const h=(0,eval)('('+src+')')(chain,account),listeners={};
  const provider={request:async r=>{if(r.method==='eth_getTransactionReceipt'&&localStorage.getItem('__burnProbeHoldReceipt')==='true'){const hashes=JSON.parse(localStorage.getItem('__burnProbeReceiptHashes')||'[]');hashes.push(r.params[0]);localStorage.setItem('__burnProbeReceiptHashes',JSON.stringify(hashes));return null;}return h(r);},on(ev,fn){(listeners[ev]??=[]).push(fn);}};
  window.__emit=ev=>listeners[ev]?.forEach(f=>f([]));
  window.addEventListener('eip6963:requestProvider',()=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'mock',name:'Mock',rdns:'test'},provider}})));
 },{chain,account:ACCOUNT,src:handler.toString()});
 await ctx.route('https://rpc.mainnet.chain.robinhood.com/**',async route=>{
  const q=JSON.parse(route.request().postData()),result=q.method==='eth_chainId'?'0x1237':await handler(chain,ACCOUNT)(q);
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({jsonrpc:'2.0',id:q.id,result})});
 });
 const p=await ctx.newPage();p.on('pageerror',e=>console.log('PAGE ERROR',e.message));await p.goto('file:///'+html);await p.waitForTimeout(300);
 if(!(await p.locator('nav button[data-route="studio"]').count()))throw Error('Studio nav did not load: '+p.url()+' '+(await p.locator('body').innerText().catch(e=>e.message)));
 await p.locator('nav button[data-route="studio"]').click();await p.waitForTimeout(250);
 await p.locator('[data-mode="live"]').click();await p.waitForTimeout(250);
 await p.locator('#wallet').click();await p.locator('#walletConnect').click();await p.waitForTimeout(600);if(await p.locator('#closeDialog').count())await p.locator('#closeDialog').click();
 await p.waitForTimeout(150);if(await p.locator('[data-mode="live"]').count())await p.locator('[data-mode="live"]').click();
 return {p,ctx};
}
async function begin(p,item='lilac'){
 await p.locator('[data-burn="'+item+'"]').click();await p.locator('#burnAgree').check();await p.locator('#burnGo').click();
 await p.waitForFunction(()=>globalThis.__txs?.length>0);
}
async function sentCount(p){return p.evaluate(()=>globalThis.__txs?.length||0);}
async function readSave(p){return p.evaluate(()=>{for(let i=0;i<localStorage.length;i++){const value=localStorage.getItem(localStorage.key(i));try{const data=JSON.parse(value);if(data?.live)return data;}catch{}}return null;});}
try{
 // B1: closing CANCEL and reopening the dialog cannot submit another transaction.
 {
  const {p,ctx}=await setup();await begin(p);await p.locator('#burnCancel').click();
  await p.locator('[data-burn="lilac"]').click();await p.waitForTimeout(150);
  const count=await sentCount(p),modalOpen=await p.locator('#modal').evaluate(e=>e.open),message=await p.locator('#toast').innerText();
  check('pending → CANCEL → reopen is blocked before a second confirmation',count===1&&!modalOpen&&/Pending transaction/.test(message),'eth_sendTransaction count='+count+'; modalOpen='+modalOpen+'; toast='+message);
  await ctx.close();
 }
 // B1: after 180 s the UI keeps the hash, offers CHECK AGAIN, and never retries by sending.
 {
  const {p,ctx}=await setup();await begin(p);await p.evaluate(()=>{const old=Date.now;Date.now=()=>old()+181000;});
  await p.waitForFunction(()=>/pending transaction|not confirmed/i.test(document.getElementById('burnStatus')?.textContent||''),null,{timeout:5000});
  const hash=await p.evaluate(()=>JSON.parse(localStorage.getItem('rh-live-pending-v1'))?.tx||'');
  check('timeout preserves the pending hash in localStorage',/^0x[0-9a-f]{64}$/.test(hash),hash||'no hash');
  check('timeout UI shows the full hash', !!hash&&(await p.locator('#burnStatus').innerText()).includes(hash),await p.locator('#burnStatus').innerText());
  check('timeout UI offers CHECK AGAIN',await p.locator('#burnCheck').isVisible());
  await p.locator('#burnGo').click();await p.waitForTimeout(200);
  check('timeout retry does not send a second transaction',(await sentCount(p))===1,'eth_sendTransaction count='+await sentCount(p));
  await p.locator('#burnCancel').click();await p.evaluate(()=>localStorage.setItem('__burnProbeReceiptHashes','[]'));await p.reload();await p.locator('nav button[data-route="studio"]').click();await p.waitForTimeout(300);if(await p.locator('[data-mode="live"]').count())await p.locator('[data-mode="live"]').click();await p.waitForTimeout(300);
  const restored=await p.evaluate(()=>JSON.parse(localStorage.getItem('rh-live-pending-v1'))?.tx||'');
  const receiptHashes=await p.evaluate(()=>JSON.parse(localStorage.getItem('__burnProbeReceiptHashes')||'[]'));
  check('pending hash survives reload',restored===hash,restored||'no hash');
  check('reload checks the stored transaction receipt by hash',receiptHashes.includes(hash),'receipt checks='+receiptHashes.length);
  check('reload shows a CHECK AGAIN control',await p.locator('#liveCheck').isVisible());
  if(await p.locator('#forgetPending').count()){
   await p.locator('#forgetPending').click();const text=await p.locator('#dialogContent').innerText();
   check('forget requires a warning and explicit confirmation',text.includes('still goes through')&&await p.locator('#forgetGo').isDisabled());
   await p.locator('#forgetAgree').check();await p.locator('#forgetGo').click();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('rh-live-pending-v1'))===null,null,{timeout:3000});
   check('confirmed forget clears pending state',!(await p.locator('#liveCheck').count()));
  }else check('forget requires a warning and explicit confirmation',false,'no pending transaction UI after reload');
  await ctx.close();
 }
 // D2: account change during receipt wait still records the original sender.
 {
  const {p,ctx}=await setup();await begin(p);await p.evaluate(()=>{window.__emit('accountsChanged');localStorage.setItem('__burnProbeHoldReceipt','false');});
  await p.waitForFunction(()=>{try{return JSON.parse(localStorage.getItem('rh-cutaway-v1')).live.burns.length>0;}catch{return false;}},null,{timeout:6000});
  const saved=await readSave(p),from=saved?.live?.burns?.[0]?.from;
  check('accountsChanged preserves the transaction sender',from===ACCOUNT.toLowerCase(),JSON.stringify(saved?.live?.burns?.[0]||null));
  await ctx.close();
 }
 // Revert/failed receipt releases the lock with a message and no unlock record.
 {
  const {p,ctx}=await setup();await begin(p);await p.evaluate(()=>{localStorage.setItem('__burnProbeHoldReceipt','false');localStorage.setItem('__burnProbeFailReceipt','true');});
  await p.locator('#burnCheck').click();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('rh-live-pending-v1'))===null,null,{timeout:3000});
  const saved=await readSave(p),text=await p.locator('#toast').innerText();
  check('failed receipt clears pending and reports no burn',await p.evaluate(()=>localStorage.getItem('rh-live-pending-v1')===null)&&text.includes('failed on chain'),text);
  check('failed receipt creates no unlock record',(saved?.live?.burns?.length||0)===0,'burns='+JSON.stringify(saved?.live?.burns||[]));
  await ctx.close();
 }
 // D3: the UI restore uses topic1=player before limiting, not the global Hall slice.
 {
  const {p,ctx}=await setup();
  const tx=await p.evaluate(()=>{
   const w=v=>BigInt(v).toString(16).padStart(64,'0'),P='0x1111111111111111111111111111111111111111',Q='0x2222222222222222222222222222222222222222',DEAD='0x000000000000000000000000000000000000dead',TOKEN='0x0779369854d3ecdea927206718ffd7730c67b71f',E=10n**18n;
   const rows=[{hash:'0x'+w(1),from:P,to:TOKEN,dest:DEAD,amount:String(10n*E),block:'0x1',input:HeistBurn.calldata(10n*E,'lilac','7730')}];
   for(let i=0;i<200;i++){const amount=E;rows.push({hash:'0x'+w(i+2),from:Q,to:TOKEN,dest:DEAD,amount:String(amount),block:'0x'+BigInt(i+2).toString(16),input:'0xa9059cbb'+w(DEAD)+w(amount)});}
   localStorage.setItem('__burnProbeTxs',JSON.stringify(rows));return rows[0].hash;
  });
  await p.reload();await p.locator('nav button[data-route="studio"]').click();await p.waitForTimeout(300);if(await p.locator('[data-mode="live"]').count())await p.locator('[data-mode="live"]').click();
  await p.locator('#wallet').click();await p.locator('#walletConnect').click();await p.waitForTimeout(600);if(await p.locator('#closeDialog').count())await p.locator('#closeDialog').click();
  await p.locator('nav button[data-route="studio"]').click();await p.waitForTimeout(300);await p.locator('#lvRestore').click();
  await p.waitForFunction(hash=>{try{return JSON.parse(localStorage.getItem('rh-cutaway-v1')).live.burns.some(x=>x.tx===hash);}catch{return false;}},tx,{timeout:5000}).catch(()=>{});
  const saved=await readSave(p),count=saved?.live?.burns?.filter(x=>x.tx===tx).length||0;
  check('RESTORE finds one old player purchase among 200 newer unrelated transfers',count===1,'restored count='+count);
  await ctx.close();
 }
 // D4: Tribute and Vault Bounty are not sold: no button, no amount field, and a direct call is refused before the wallet.
 {
  const {p,ctx}=await setup();
  const shop=await p.evaluate(()=>[...document.querySelectorAll('[data-burn]')].map(b=>b.dataset.burn).sort().join(','));
  check('the shop sells exactly the four fixed-price items',shop==='archive-pack,citrus,lilac,trail'&&(await p.locator('#ashAmount,#bountyAmount,#bountyBurn').count())===0,shop);
  const direct=await p.evaluate(async()=>{const out=[];for(const item of ['ash','bounty']){try{await HeistBurn.burn(window.__probeProvider||{request:async()=>{throw Error('wallet must not be asked');}},{account:'0x1111111111111111111111111111111111111111',item,amount:'5',poll:0,timeout:0});out.push(item+':sent');}catch(e){out.push(item+':'+e.message);}}return out.join('|');});
  const count=await sentCount(p);
  check('a direct burn of a retired item is refused before the wallet',/ash:This item is no longer sold/.test(direct)&&/bounty:This item is no longer sold/.test(direct)&&count===0,direct+' sends='+count);
  await ctx.close();
 }
}finally{await b.close();}
if(failures.length)throw new Error(failures.length+' burn regression probe(s) failed:\n'+failures.join('\n'));
console.log('All pending browser probes passed.');
