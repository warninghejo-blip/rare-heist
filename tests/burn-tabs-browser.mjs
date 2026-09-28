// Two tabs share one origin, one wallet, and one localStorage. Run after node build.mjs.
import {chromium} from 'playwright';
import {createApp} from '../server/app.mjs';
import {createRequire} from 'node:module';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';import path from 'node:path';
const require=createRequire(import.meta.url),SOL=require('../src/solutions.js'),B=require('../src/burn.js');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const art=readFileSync(path.join(root,'src/art.js'),'utf8'),RF_ART=JSON.parse(art.slice(art.indexOf('['),art.lastIndexOf(']')+1));
let pass=0,fail=0;const ok=(n,c,d='')=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(d&&!c?' — '+d:''));};

// ---- server with a controlled clock; one finished winner round (sprint) and one live round (standard) ----
const T0=Math.floor(Date.now()/1000)*1000;let now=T0;
const app=createApp({dbFile:':memory:',clock:()=>now,minActionMs:0});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.server.address().port;
function client(){let cookie='',csrf='';return async(method,url,body)=>{const r=await fetch(origin+url,{method,headers:{origin,'content-type':'application/json',cookie,'x-rh-csrf':csrf},body:method==='POST'?JSON.stringify(body||{}):undefined});const sc=r.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];const j=await r.json();if(j.csrf)csrf=j.csrf;if(r.status!==200)throw Error(url+' '+r.status+' '+JSON.stringify(j));return j;};}
const route=SOL['last-cutaway'].actions,Bc=client(),Cc=client();await Bc('POST','/api/session');await Cc('POST','/api/session');
async function clear(c,hero){now+=1000;const e=await c('POST','/api/rounds/opening-sprint/enter',{heroId:hero});now+=1000;const f=await c('POST','/api/rounds/opening-sprint/finish',{ticket:e.ticket,actions:route});if(f.result!=='leader')throw Error('clear failed '+JSON.stringify(f).slice(0,200));now+=1000;await c('POST','/api/rounds/opening-sprint/skip');}
await clear(Bc,'7730');await clear(Cc,'3412');now+=10*60*1000;
const sprint=await Bc('GET','/api/rounds/opening-sprint');
if(sprint.phase!=='finished'||sprint.outcome!=='winner'||sprint.createdAt!==T0)throw Error('scenario round not a finished winner: '+sprint.phase+' '+sprint.outcome);
const END=sprint.finishedAt;if(END%1000)throw Error('round end is not a whole second');

// ---- mock chain ----
const w=v=>BigInt(v).toString(16).padStart(64,'0'),E=10n**18n,ACCOUNT='0x1111111111111111111111111111111111111111';
const TOKEN='0x0779369854d3ecdea927206718ffd7730c67b71f',DEAD='0x000000000000000000000000000000000000dead',TRANSFER='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',G='0x14c49e6118f46525de9ab41a51cbaa3c6ebf181d',R='0x246e3e9730a7eade94c79be0fd78d210f89aeb8d';
const O1='0x5555555555555555555555555555555555555555',O2='0x6666666666666666666666666666666666666666',O3='0x7777777777777777777777777777777777777777';
const chain={head:0x200,hold:false,sent:[],balances:{[ACCOUNT]:500n*E,[DEAD]:1000n*E},times:new Map(),txs:[]};
function addTx(from,item,rf,friend,block,time){const amount=BigInt(Math.round(rf*1e6))*10n**12n,hash='0x'+w(0xa000+chain.txs.length);chain.txs.push({hash,from,amount,block:'0x'+block.toString(16),input:B.calldata(amount,item,friend,1)});chain.times.set(block,time);return hash;}
// Earlier tagged burns by other players, including the retired Vault Bounty code (10): they must still decode.
addTx(O1,'trail',25,'3412',0x100,T0/1000-3600);
addTx(O2,'bounty',12,'7730',0x101,T0/1000-1);
addTx(O2,'bounty',5,null,0x102,T0/1000);
addTx(O1,'bounty',70,'3412',0x103,T0/1000+10);
addTx(O3,'bounty',3,null,0x104,END/1000);
const frames=Object.fromEntries(RF_ART.map(x=>[x.familyId+':'+x.seed,x.frames])),ids={'3412':{family:0,seed:3412},'7730':{family:5,seed:7730}},owned=['3412','7730'];
async function rpc({method,params=[]}){
 if(method==='eth_requestAccounts'||method==='eth_accounts')return [ACCOUNT];
 if(method==='eth_chainId')return '0x1237';
 if(method==='wallet_switchEthereumChain')return null;
 if(method==='eth_blockNumber')return '0x'+chain.head.toString(16);
 if(method==='eth_getBlockByNumber'){const n=Number(BigInt(params[0])),t=chain.times.get(n);return t==null?null:{number:params[0],timestamp:'0x'+t.toString(16)};}
 if(method==='eth_sendTransaction'){const tx=params[0],d=tx.data.slice(2);if(tx.to.toLowerCase()!==TOKEN||d.slice(0,8)!=='a9059cbb')throw Error('mock only knows RF transfers');const amount=BigInt('0x'+d.slice(72,136)),from=tx.from.toLowerCase();if((chain.balances[from]??0n)<amount)throw Error('insufficient');chain.balances[from]-=amount;chain.balances[DEAD]+=amount;chain.head++;const hash='0x'+w(0xb000+chain.sent.length);chain.txs.push({hash,from,amount,block:'0x'+chain.head.toString(16),input:tx.data});chain.times.set(chain.head,Math.floor(now/1000));chain.sent.push(tx);if(chain.waitHash)await new Promise(r=>(chain.resolvers??=[]).push(r));return hash;}
 if(method==='eth_getTransactionReceipt'){if(chain.hold)return null;const t=chain.txs.find(x=>x.hash===params[0]);return t?{status:'0x1',transactionHash:t.hash,blockNumber:t.block,logs:[{address:TOKEN,topics:[TRANSFER,'0x'+w(t.from),'0x'+w(DEAD)],data:'0x'+w(t.amount)}]}:null;}
 if(method==='eth_getTransactionByHash'){const t=chain.txs.find(x=>x.hash===params[0]);return t?{hash:t.hash,from:t.from,to:TOKEN,input:t.input,blockNumber:t.block}:null;}
 if(method==='eth_getLogs'&&params[0].address.toLowerCase()===TOKEN){const tp=params[0].topics,lo=BigInt(params[0].fromBlock),hi=BigInt(params[0].toBlock);return chain.txs.filter(x=>BigInt(x.block)>=lo&&BigInt(x.block)<=hi&&(!tp[1]||tp[1].toLowerCase()==='0x'+w(x.from))).map(x=>({address:TOKEN,transactionHash:x.hash,blockNumber:x.block,logIndex:'0x0',topics:[TRANSFER,'0x'+w(x.from),'0x'+w(DEAD)],data:'0x'+w(x.amount)}));}
 if(method==='eth_getLogs'){const tp=params[0].topics;return tp.length===2&&tp[1]?[]:owned.map((id,i)=>({blockNumber:'0x'+(100+i).toString(16),logIndex:'0x0',topics:[TRANSFER,'0x'+w(0),'0x'+w(ACCOUNT),'0x'+w(id)]}));}
 if(method==='eth_call'){const {to,data}=params[0],sel=data.slice(2,10),args=data.slice(10),arg=i=>BigInt('0x'+args.slice(64*i,64*i+64)).toString();
  if(to.toLowerCase()===G){if(sel==='70a08231')return '0x'+w(owned.length);if(sel==='6352211e')return '0x'+w(owned.includes(arg(0))?ACCOUNT:O1);if(sel==='7d71dc35')return '0x'+w(1);if(sel==='0be76ed6')return '0x'+w(O3);}
  if(to.toLowerCase()===TOKEN){if(sel==='313ce567')return '0x'+w(18);if(sel==='18160ddd')return '0x'+w(1000000000n*E);if(sel==='70a08231'){const who='0x'+BigInt(arg(0)).toString(16).padStart(40,'0');return '0x'+w(chain.balances[who]??0n);}}
  if(to.toLowerCase()===R){const x=ids[arg(0)]||{family:3,seed:Number(arg(0))};if(sel==='32bd63d1')return '0x'+w(x.family);if(sel==='82829f74')return '0x'+w(x.seed);if(sel==='ead2ca3c')return '0x'+(frames[arg(0)+':'+arg(1)]||frames['0:3412']).map(v=>w(v)).join('');}
  throw Error('unknown call '+sel);}
 throw Error('unsupported '+method);
}

// ---- browser ----
const b=await chromium.launch(),errors=[];
async function open(viewport={width:1440,height:1000}){
 const ctx=await b.newContext({viewport});ctx.setDefaultTimeout(8000);
 await ctx.exposeFunction('__chain',req=>rpc(req));
 await ctx.addInitScript(()=>{window.__sendCalls=0;const provider={request:r=>{if(r.method==='eth_sendTransaction')window.__sendCalls++;return window.__chain(r);},on(){}};window.addEventListener('eip6963:requestProvider',()=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'mock',name:'Mock',rdns:'test'},provider}})));});
 await ctx.route('https://rpc.mainnet.chain.robinhood.com/**',async r=>{const q=JSON.parse(r.request().postData());let body;try{body={jsonrpc:'2.0',id:q.id,result:await rpc(q)};}catch(e){body={jsonrpc:'2.0',id:q.id,error:{code:-32000,message:e.message}};}await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});});
 // A Windows checkout serves CRLF; browsers hash inline scripts after normalising to LF. Serve LF with matching hashes.
 await ctx.route(origin+'/',async r=>{const res=await r.fetch(),body=(await res.text()).replace(/\r\n/g,'\n'),hashes=[...body.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>"'sha256-"+createHash('sha256').update(m[1]).digest('base64')+"'"),headers={...res.headers()};headers['content-security-policy']=headers['content-security-policy'].replace(/script-src [^;]+;/,'script-src '+hashes.join(' ')+';');await r.fulfill({response:res,body,headers});});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/');await p.waitForTimeout(900);await p.evaluate(()=>document.getElementById('friendReveal')?.remove());return {p,ctx};
}
// Opens the burn confirmation for one shop item. Each scenario uses an item no earlier scenario has sent, because a
// sent burn is restored from the mock chain and then shows as unlocked (no BURN button).
async function ready(p,item){await p.locator('#wallet').click();await p.locator('#walletConnect').click();await p.waitForTimeout(600);await p.locator('#closeDialog').click();
 await p.locator('nav [data-route="studio"]').click();await p.locator('[data-mode="live"]').click();await p.locator('[data-burn="'+item+'"]').click();
 await p.locator('#burnAgree').check();}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(test,ms=5000){const end=Date.now()+ms;while(Date.now()<end){if(await test())return;await pause(25);}throw Error('Timed out waiting for wallet call');}
async function pair(item){const {p,ctx}=await open();await ready(p,item);const q=await ctx.newPage();q.on('pageerror',e=>errors.push(e.message));await q.goto(origin+'/');await q.waitForTimeout(300);await q.evaluate(()=>document.getElementById('friendReveal')?.remove());await ready(q,item);return {p,q,ctx};}
try{
 for(const item of ['lilac','citrus']){
  const {p,q,ctx}=await pair(item),start=chain.sent.length;chain.waitHash=true;
  await Promise.all([p.evaluate(()=>document.getElementById('burnGo').click()),q.evaluate(()=>document.getElementById('burnGo').click())]);
  await until(()=>chain.sent.length>start);await pause(350);
  const a=await p.locator('#burnStatus').textContent(),z=await q.locator('#burnStatus').textContent(),calls=await Promise.all([p.evaluate(()=>window.__sendCalls),q.evaluate(()=>window.__sendCalls)]);
  ok(item+' simultaneous tabs send once',chain.sent.length===start+1,'sends='+String(chain.sent.length-start));
  ok(item+' losing tab is refused before wallet',/Another tab is sending a burn/.test(a+' '+z)&&calls.filter(n=>n===0).length===1,'statuses='+a+' | '+z+' calls='+calls.join(','));
  chain.waitHash=false;chain.resolvers?.forEach(r=>r());chain.resolvers=[];await ctx.close();
 }
 {
  const {p,ctx}=await open();await ready(p,'trail');const start=chain.sent.length;
  await p.evaluate(()=>Object.defineProperty(navigator,'locks',{configurable:true,value:undefined}));
  await p.locator('#burnGo').click();
  const status=await p.locator('#burnStatus').textContent();
  ok('without Web Locks the wallet is not asked',chain.sent.length===start&&await p.evaluate(()=>window.__sendCalls===0)&&/can't guarantee one burn at a time/.test(status),'sends='+String(chain.sent.length-start)+' status='+status);
  await ctx.close();
 }
 {
  // The second tab passes its first pending check, then pauses before Web Locks grants it a turn.
  // Once the first tab has saved a hash, only a fresh localStorage read inside the lock can stop it.
  const {p,q,ctx}=await pair('archive-pack'),start=chain.sent.length;chain.hold=true;
  await q.evaluate(()=>{const native=navigator.locks,key='rh-live-pending-v1',snapshot=localStorage.getItem(key),get=Storage.prototype.getItem,set=Storage.prototype.setItem;let resume,stale=true;
   Storage.prototype.getItem=function(k){return stale? k===key?snapshot:get.call(this,k):get.call(this,k);};
   Storage.prototype.setItem=function(k,v){if(!stale||k!==key)set.call(this,k,v);};
   Object.defineProperty(navigator,'locks',{configurable:true,value:{request:(...args)=>{window.__gateWaiting=true;return new Promise(r=>resume=r).then(()=>native.request(...args));}}});
   window.__releaseGate=()=>{stale=false;resume();};});
  await q.evaluate(()=>document.getElementById('burnGo').click());await q.waitForFunction(()=>window.__gateWaiting===true);
  await p.evaluate(()=>document.getElementById('burnGo').click());
  await p.waitForFunction(()=>JSON.parse(localStorage.getItem('rh-live-pending-v1'))?.status==='pending');
  await q.evaluate(()=>window.__releaseGate());
  await q.waitForFunction(()=>/Pending transaction/.test(document.getElementById('burnStatus')?.textContent||''));
  const status=await q.locator('#burnStatus').textContent();
  ok('granted lock reads pending from localStorage, not the waiting tab',chain.sent.length===start+1&&await q.evaluate(()=>window.__sendCalls===0)&&/Pending transaction/.test(status),'sends='+String(chain.sent.length-start)+' status='+status);
  await ctx.close();chain.hold=false;
 }
 ok('no page errors',errors.length===0,errors.join(' | '));
}finally{await b.close();app.server.close();}
console.log(pass+'/'+(pass+fail)+' passed');process.exit(fail?1:0);
