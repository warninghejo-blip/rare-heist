// VAULT BOUNTY and ASH RANKS in the real UI against the real server (in-memory DB, controlled clock) and a mock chain.
// Chain: one node-side state shared by the injected wallet and the public-RPC route, with block timestamps.
//  - bounty totals per round from block time in [createdAt, finishedAt), boundary blocks included/excluded;
//  - BOUNTY BREAKER on the finished winner round, ash ranks next to Friends, "next rank in N RF";
//  - a bounty burn: under 1 RF refused before the wallet, then one tagged transfer (code 0a) to 0x…dEaD;
//  - one burn at a time: pending bounty blocks another bounty and a Tribute; unknown outcome blocks a bounty;
//  - RF ECONOMY page: supply counters and the projection calculator.
// Run after `node build.mjs`: node tests/burn-bounty-browser.mjs
import {chromium} from 'playwright';
import {createApp} from '../server/app.mjs';
import {createRequire} from 'node:module';import {createHash} from 'node:crypto';import {readFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';import path from 'node:path';
const require=createRequire(import.meta.url),SOL=require('../src/solutions.js'),B=require('../src/burn.js');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),shots=process.env.SHOTS||path.join(root,'..','..','..','_tmp','econ','shots');mkdirSync(shots,{recursive:true});
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
addTx(O1,'trail',25,'3412',0x100,T0/1000-3600);        // ash only
addTx(O2,'bounty',12,'7730',0x101,T0/1000-1);         // one second before both rounds: no round
addTx(O2,'bounty',5,null,0x102,T0/1000);              // exactly at createdAt: both rounds
addTx(O1,'bounty',70,'3412',0x103,T0/1000+10);        // inside both rounds
addTx(O3,'bounty',3,null,0x104,END/1000);             // exactly at the sprint end: standard only
const frames=Object.fromEntries(RF_ART.map(x=>[x.familyId+':'+x.seed,x.frames])),ids={'3412':{family:0,seed:3412},'7730':{family:5,seed:7730}},owned=['3412','7730'];
async function rpc({method,params=[]}){
 if(method==='eth_requestAccounts'||method==='eth_accounts')return [ACCOUNT];
 if(method==='eth_chainId')return '0x1237';
 if(method==='wallet_switchEthereumChain')return null;
 if(method==='eth_blockNumber')return '0x'+chain.head.toString(16);
 if(method==='eth_getBlockByNumber'){const n=Number(BigInt(params[0])),t=chain.times.get(n);return t==null?null:{number:params[0],timestamp:'0x'+t.toString(16)};}
 if(method==='eth_sendTransaction'){const tx=params[0],d=tx.data.slice(2);if(tx.to.toLowerCase()!==TOKEN||d.slice(0,8)!=='a9059cbb')throw Error('mock only knows RF transfers');const amount=BigInt('0x'+d.slice(72,136)),from=tx.from.toLowerCase();if((chain.balances[from]??0n)<amount)throw Error('insufficient');chain.balances[from]-=amount;chain.balances[DEAD]+=amount;chain.head++;const hash='0x'+w(0xb000+chain.sent.length);chain.txs.push({hash,from,amount,block:'0x'+chain.head.toString(16),input:tx.data});chain.times.set(chain.head,Math.floor(now/1000));chain.sent.push(tx);return hash;}
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
 await ctx.addInitScript(()=>{const provider={request:r=>window.__chain(r),on(){}};window.addEventListener('eip6963:requestProvider',()=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'mock',name:'Mock',rdns:'test'},provider}})));});
 await ctx.route('https://rpc.mainnet.chain.robinhood.com/**',async r=>{const q=JSON.parse(r.request().postData());let body;try{body={jsonrpc:'2.0',id:q.id,result:await rpc(q)};}catch(e){body={jsonrpc:'2.0',id:q.id,error:{code:-32000,message:e.message}};}await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});});
 // A Windows checkout serves CRLF; browsers hash inline scripts after normalising to LF. Serve LF with matching hashes.
 await ctx.route(origin+'/',async r=>{const res=await r.fetch(),body=(await res.text()).replace(/\r\n/g,'\n'),hashes=[...body.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>"'sha256-"+createHash('sha256').update(m[1]).digest('base64')+"'"),headers={...res.headers()};headers['content-security-policy']=headers['content-security-policy'].replace(/script-src [^;]+;/,'script-src '+hashes.join(' ')+';');await r.fulfill({response:res,body,headers});});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/');await p.waitForTimeout(900);await p.evaluate(()=>document.getElementById('friendReveal')?.remove());return {p,ctx};
}
const {p,ctx}=await open();
const txt=async s=>(await p.locator(s).first().innerText().catch(()=>'')).replace(/\s+/g,' ').trim();
const nav=async route=>{await p.locator('nav button[data-route="'+route+'"]').first().click();await p.waitForTimeout(500);};
const modalOpen=()=>p.locator('#modal').evaluate(e=>e.open);
try{
 // Connect and play as the owned Friend #3412.
 await p.locator('#wallet').click();await p.locator('#walletConnect').click();await p.waitForTimeout(1500);await p.locator('[data-own="3412"]').click();await p.waitForTimeout(400);
 ok('playing as MY FRIEND #3412',(await txt('#friend'))==='MY FRIEND #3412',await txt('#friend'));
 await p.waitForFunction(()=>!!document.querySelector('#friendReveal .ashrank'),null,{timeout:6000}).catch(()=>{});await p.waitForTimeout(700);
 ok('reveal card shows ASH RANK CINDER after the chain read, framed by rank',(await p.locator('#friendReveal #revealAsh .ashrank.r-cinder').count())===1&&await p.locator('#friendReveal.r-cinder').count()===1,await txt('#friendReveal'));
 await p.screenshot({path:path.join(shots,'reveal-rank.png')});
 await p.evaluate(()=>document.getElementById('friendReveal')?.remove());
 ok('home portrait card shows the rank ('+(await txt('.hero-rank'))+')',(await p.locator('.hero-friend[data-rank="cinder"] .hero-rank .ashrank').count())===1);
 await p.locator('.hero-friend').screenshot({path:path.join(shots,'home-rank.png')});
 // Studio LIVE: the Hall shows ranks; the rank strip shows the next rank.
 await nav('studio');await p.locator('[data-mode="live"]').click();await p.waitForFunction(()=>/FRIEND #3412/.test(document.getElementById('hallList')?.innerText||''),null,{timeout:8000});await p.waitForTimeout(300);
 ok('Hall of Ash row for #3412 wears CINDER (95 RF of ash)',(await p.locator('#hallList li',{hasText:'FRIEND #3412'}).locator('.ashrank.r-cinder').count())===1,await txt('#hallList'));
 ok('bounty is not sold as a Studio card; the card points to the vault',(await p.locator('[data-burn="bounty"]').count())===0&&(await p.locator('.bountycard [data-route="last"]').count())===1);
 ok('rank strip: next rank in 5.00 RF ('+(await txt('#rankStrip'))+')',(await txt('#nextRank'))==='5.00 RF'&&/is CINDER/.test(await txt('#rankStrip')));
 await p.locator('#rankStrip').screenshot({path:path.join(shots,'studio-rank-strip.png')});
 // Last Heist: the live standard round and the finished sprint round.
 await nav('last');await p.waitForFunction(()=>/BOUNTY: 78\.00 RF/.test(document.getElementById('bountyPanel')?.innerText||''),null,{timeout:10000}).catch(()=>{});
 ok('live round banner: 78.00 RF (5 at start + 70 inside + 3 at the sprint end; 12 one second early excluded): '+(await txt('#bountyPanel')),/BOUNTY: 78\.00 RF/.test(await txt('#bountyPanel'))&&/by 1 Friend and 2 untagged wallets/.test(await txt('#bountyPanel')));
 ok('past rounds name the winner BOUNTY BREAKER — 75.00 RF: '+(await txt('.pastrounds')),/BOUNTY BREAKER — 75\.00 RF/.test(await txt('.pastrounds')));
 ok('the winner (#3412) wears its ash rank in round history',(await p.locator('.pastrounds .ashrank.r-cinder').count())>=1);
 await p.screenshot({path:path.join(shots,'last-heist-bounty.png'),fullPage:true});
 await p.locator('.pastrounds [data-round="opening-sprint"]').click();await p.waitForFunction(()=>/BOUNTY BREAKER/.test(document.getElementById('bountyPanel')?.innerText||''),null,{timeout:6000}).catch(()=>{});
 ok('finished round: BOUNTY BREAKER — 75.00 RF, title not payout, no burn button: '+(await txt('#bountyPanel')),/BOUNTY: 75\.00 RF/.test(await txt('#bountyPanel'))&&/BOUNTY BREAKER — 75\.00 RF/.test(await txt('#bountyPanel'))&&/by 1 Friend and 1 untagged wallet /.test(await txt('#bountyPanel'))&&/not a payout/.test(await txt('#bountyPanel'))&&(await p.locator('#bountyBurn').count())===0);
 await p.locator('#bountyPanel').screenshot({path:path.join(shots,'bounty-breaker.png')});
 const std=await p.locator('.roundlist [data-round]').first().getAttribute('data-round');await p.locator('.roundlist [data-round="'+std+'"]').click();await p.waitForTimeout(500);
 // Under 1 RF: refused before the confirmation and before the wallet.
 await p.locator('#bountyBurn').click();await p.waitForTimeout(200);
 ok('BURN A BOUNTY opens the bounty sheet',(await txt('#dialogTitle'))==='BURN A BOUNTY ON THIS VAULT');
 await p.fill('#bountyAmount','0.5');await p.locator('#bountyNext').click();await p.waitForTimeout(200);
 ok('0.5 RF bounty refused before the burn confirmation: '+(await txt('#toast')),/Bounty must be at least 1 RF/.test(await txt('#toast'))&&(await txt('#dialogTitle'))!=='BURN REAL RF?'&&chain.sent.length===0);
 // 7 RF: one tagged transfer to 0x…dEaD, held pending.
 chain.hold=true;await p.fill('#bountyAmount','7');await p.locator('#bountyNext').click();await p.waitForTimeout(200);
 ok('7 RF bounty reaches the same two-step burn confirmation',(await txt('#dialogTitle'))==='BURN REAL RF?'&&/VAULT BOUNTY/.test(await txt('#dialogContent'))&&/Recognition only/.test(await txt('#dialogContent')));
 await p.locator('#burnAgree').check();await p.locator('#burnGo').click();await p.waitForFunction(()=>/Pending transaction/.test(document.getElementById('burnStatus')?.textContent||''),null,{timeout:6000}).catch(()=>{});
 const d=(chain.sent[0]?.data||'').toLowerCase();
 ok('one plain RF transfer to 0x…dEaD for 7 RF, tagged VAULT BOUNTY (0a) for Friend #3412',chain.sent.length===1&&chain.sent[0].to.toLowerCase()===TOKEN&&d.slice(0,74)==='0xa9059cbb'+w(DEAD)&&BigInt('0x'+d.slice(74,138))===7n*E&&d.slice(138,150)==='52485354010a'&&BigInt('0x'+d.slice(154))===3412n&&d.length===202,d);
 // One burn at a time.
 await p.locator('#burnCancel').click();await p.waitForTimeout(150);await p.locator('#bountyBurn').click();await p.waitForTimeout(200);
 ok('pending bounty: BURN A BOUNTY is refused without a sheet ('+(await txt('#toast'))+')',!(await modalOpen())&&/Pending transaction/.test(await txt('#toast'))&&chain.sent.length===1);
 await nav('studio');await p.locator('[data-mode="live"]').click();await p.waitForTimeout(400);await p.fill('#ashAmount','1');await p.locator('[data-burn="ash"]').click();await p.waitForTimeout(200);
 ok('pending bounty: a Tribute is refused too',!(await modalOpen())&&/Pending transaction/.test(await txt('#toast'))&&chain.sent.length===1);
 // Confirm: the receipt proves the burn; totals and ranks move.
 chain.hold=false;await p.locator('#liveCheck').click();await p.waitForFunction(()=>{try{return JSON.parse(localStorage.getItem('rh-live-pending-v1'))===null;}catch{return false;}},null,{timeout:6000}).catch(()=>{});
 ok('confirmed from its receipt: '+(await txt('#toast')),/Your bounty is on the Last Heist vault/.test(await txt('#toast')));
 await p.waitForTimeout(600);ok('rank strip after 102 RF of ash: FURNACE, next ASH LORD in 398.00 RF ('+(await txt('#rankStrip'))+')',/is FURNACE/.test(await txt('#rankStrip'))&&(await txt('#nextRank'))==='398.00 RF');
 await nav('last');await p.waitForFunction(()=>/BOUNTY: 85\.00 RF/.test(document.getElementById('bountyPanel')?.innerText||''),null,{timeout:10000}).catch(()=>{});
 ok('live round banner now 85.00 RF: '+(await txt('#bountyPanel')),/BOUNTY: 85\.00 RF/.test(await txt('#bountyPanel'))&&/by 1 Friend and 2 untagged wallets/.test(await txt('#bountyPanel')));
 // Unknown outcome of an earlier bounty request still locks the next one.
 await p.evaluate(()=>{const pending={status:'unknown-outcome',ownerId:'other-tab',walletRequested:true,from:'0x1111111111111111111111111111111111111111',item:'bounty',amount:'2',amountUnits:'2000000000000000000',friendId:'3412',sentAt:Date.now(),sentBlock:'0x100',nonce:77,decimals:18};localStorage.setItem('rh-live-pending-v1',JSON.stringify(pending));});
 await p.reload();await p.waitForTimeout(900);await p.evaluate(()=>document.getElementById('friendReveal')?.remove());await nav('last');await p.waitForTimeout(800);
 ok('unknown outcome: the recovery panel is shown on the Last Heist page',await p.locator('#burnUnknownPanel').isVisible().catch(()=>false));
 if(await p.locator('#bountyBurn').count()){await p.locator('#bountyBurn').click();await p.waitForTimeout(200);}
 ok('unknown outcome: BURN A BOUNTY is refused, nothing sent ('+(await txt('#toast'))+')',!(await modalOpen())&&/don't know if your wallet sent/.test(await txt('#toast'))&&chain.sent.length===1);
 // RF ECONOMY page.
 await p.evaluate(()=>localStorage.removeItem('rh-live-pending-v1'));await p.reload();await p.waitForTimeout(900);await p.evaluate(()=>document.getElementById('friendReveal')?.remove());
 await nav('studio');await p.locator('[data-mode="economy"]').click();await p.waitForFunction(()=>/RF/.test(document.getElementById('ecSupply')?.textContent||''),null,{timeout:8000}).catch(()=>{});await p.waitForTimeout(600);
 ok('economy counters: supply 1,000,000,000.00 RF, dEaD 1,007.00 RF, burned here 122.00 RF ('+[await txt('#ecSupply'),await txt('#ecDead'),await txt('#ecAll')].join(' / ')+')',(await txt('#ecSupply'))==='1,000,000,000.00 RF'&&(await txt('#ecDead'))==='1,007.00 RF'&&(await txt('#ecAll'))==='122.00 RF');
 ok('calculator defaults: 4,500 RF a month, 0.00045% of RF outside dEaD, 4.5x dEaD ('+[await txt('#calcMonth'),await txt('#calcShare'),await txt('#calcDead')].join(' / ')+')',(await txt('#calcMonth'))==='4,500 RF'&&(await txt('#calcShare'))==='0.00045%'&&(await txt('#calcDead'))==='4.5×');
 await p.fill('#calc-players','1000');ok('calculator is editable: 1,000 players a day → 15,000 RF a month',(await txt('#calcMonth'))==='15,000 RF');
 ok('labelled as a projection',/PROJECTION, NOT A RESULT/.test(await txt('.calchead')));
 await p.fill('#calc-players','300');await p.screenshot({path:path.join(shots,'rf-economy.png'),fullPage:true});
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(300);await p.screenshot({path:path.join(shots,'rf-economy-phone.png'),fullPage:true});
 await nav('last');await p.waitForTimeout(1200);await p.screenshot({path:path.join(shots,'last-heist-bounty-phone.png'),fullPage:true});
 ok('no horizontal overflow on a phone (Last Heist)',await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
 ok('no page errors '+errors.join(' | '),!errors.length);
}finally{await b.close();app.server.close();}
console.log(pass+'/'+(pass+fail)+' passed');process.exit(fail?1:0);
