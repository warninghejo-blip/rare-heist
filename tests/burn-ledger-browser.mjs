// BURN LEDGER and the simplified economy in the real UI against the real server (in-memory DB, controlled clock) and a
// mock chain shared by the injected wallet and the public-RPC route.
//  - the shop sells four fixed-price items; Tribute and Vault Bounty are not sold, and no ranks or titles exist anywhere;
//  - the burn ledger lists every tagged Rare Heist burn, newest first, including old burns with the retired codes
//    09 (Tribute) and 0a (Vault Bounty), with Friend chips and explorer links, and the total;
//  - Last Heist opens on the stake round, with no bounty panel;
//  - one burn at a time with a shop item: a pending burn blocks another; a legacy unknown-outcome Bounty lock still
//    loads and blocks every burn;
//  - RF ECONOMY: stake rounds lead, the roadmap card, supply counters and the calculator (shop + stake term).
// Run after `node build.mjs`: node tests/burn-ledger-browser.mjs
import {chromium} from 'playwright';
import {createApp} from '../server/app.mjs';
import {createRequire} from 'node:module';import {createHash} from 'node:crypto';import {readFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';import path from 'node:path';
const require=createRequire(import.meta.url),SOL=require('../src/solutions.js'),B=require('../src/burn.js');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),shots=process.env.SHOTS||path.join(root,'..','..','..','_tmp','econ2','shots');mkdirSync(shots,{recursive:true});
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
// Earlier tagged burns by other players: one shop item and four with retired codes (bounty 0a, tribute 09). 115 RF in all.
addTx(O1,'trail',25,'3412',0x100,T0/1000-3600);
addTx(O2,'bounty',12,'7730',0x101,T0/1000-1);
addTx(O2,'bounty',5,null,0x102,T0/1000);
addTx(O1,'bounty',70,'3412',0x103,T0/1000+10);
addTx(O3,'ash',3,null,0x104,END/1000);
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
const shopIds=()=>p.evaluate(()=>[...document.querySelectorAll('[data-burn]')].map(b=>b.dataset.burn).sort().join(','));
const noRanks=async()=>(await p.locator('.ashrank,.hero-rank,#rankStrip,#hallList,#bountyPanel,#bountyBurn,.breaker').count())===0&&!/ASH RANK|EMBER|CINDER|FURNACE|ASH LORD|BOUNTY BREAKER|HALL OF ASH/i.test(await p.locator('body').innerText());
try{
 // Connect and play as the owned Friend #3412.
 await p.locator('#wallet').click();await p.locator('#walletConnect').click();await p.waitForTimeout(1500);await p.locator('[data-own="3412"]').click();await p.waitForTimeout(700);
 ok('playing as MY FRIEND #3412',(await txt('#friend'))==='MY FRIEND #3412',await txt('#friend'));
 ok('reveal card and home portrait carry no rank',await noRanks()&&!(await txt('#friendReveal')).includes('RANK'),await txt('#friendReveal'));
 await p.evaluate(()=>document.getElementById('friendReveal')?.remove());
 // Studio LIVE: four items, then the ledger.
 await nav('studio');await p.locator('[data-mode="live"]').click();await p.waitForFunction(()=>(document.querySelectorAll('#ledgerList li').length||0)>=5,null,{timeout:8000}).catch(()=>{});await p.waitForTimeout(300);
 ok('shop: exactly The Black Archive, Golden Trail, Hatchwork and Signal Paper ('+(await shopIds())+')',(await shopIds())==='archive-pack,citrus,lilac,trail'&&(await p.locator('#ashAmount,#bountyAmount').count())===0);
 ok('shop order leads with The Black Archive for 50 RF',/THE BLACK ARCHIVE/.test(await txt('.cards.shop .itemcard'))&&/50 RF/.test(await txt('.cards.shop .itemcard')));
 ok('ledger total: RF burned through Rare Heist 115.00 RF ('+(await txt('.ledger-head'))+')',(await txt('#ledgerTotal'))==='115.00 RF'&&(await txt('#lvAll'))==='115.00 RF');
 const rows=await p.locator('#ledgerList li').allInnerTexts();
 ok('ledger lists all five burns, newest block first: '+rows.map(r=>r.replace(/\s+/g,' ')).join(' | '),rows.length===5&&/^TRIBUTE 3\.00 RF/.test(rows[0].replace(/\s+/g,' '))&&/GOLDEN TRAIL 25\.00 RF FRIEND #3412/.test(rows[4].replace(/\s+/g,' ')));
 ok('old burns with retired codes keep their names: VAULT BOUNTY and TRIBUTE',rows.filter(r=>/VAULT BOUNTY/.test(r)).length===3&&rows.filter(r=>/TRIBUTE/.test(r)).length===1);
 const hrefs=await p.locator('#ledgerList a.txlink').evaluateAll(a=>a.map(x=>x.href));
 ok('every ledger row links its tx on robinhoodchain.blockscout.com',hrefs.length===5&&hrefs.every(h=>/^https:\/\/robinhoodchain\.blockscout\.com\/tx\/0x[0-9a-f]{64}$/.test(h)),hrefs[0]);
 ok('tagged rows show the Friend chip; untagged rows show the sender',(await p.locator('#ledgerList canvas[data-fid="3412"]').count())===2&&/0x7777…7777/.test(rows[0]));
 ok('no ranks, titles, Hall of Ash or bounty anywhere on LIVE BURN',await noRanks());
 await p.screenshot({path:path.join(shots,'live-burn-1440.png'),fullPage:true});
 // Last Heist: the stake round is the first tab and the default; no bounty.
 await nav('last');await p.waitForFunction(()=>!!document.querySelector('.roundlist button'),null,{timeout:8000}).catch(()=>{});await p.waitForTimeout(400);
 const first=p.locator('.roundlist button').first();
 ok('Last Heist: the first tab is the stake round and it is open by default ('+(await first.innerText())+')',/STAKE ROUND/.test(await first.innerText())&&(await first.getAttribute('class')||'').includes('active')&&(await p.locator('#stakePanel').count())===1);
 ok('Last Heist: no bounty panel, no BURN A BOUNTY, no ranks',await noRanks());
 await p.screenshot({path:path.join(shots,'last-heist-stake-first-1440.png'),fullPage:true});
 // One burn at a time, with a shop item.
 await nav('studio');await p.locator('[data-mode="live"]').click();await p.waitForTimeout(400);
 chain.hold=true;await p.locator('[data-burn="lilac"]').click();await p.waitForTimeout(200);
 ok('shop burn reaches the two-step confirmation',(await txt('#dialogTitle'))==='BURN REAL RF?'&&/HATCHWORK/.test(await txt('#dialogContent'))&&/for 10 RF/.test(await txt('#dialogContent')));
 await p.locator('#burnAgree').check();await p.locator('#burnGo').click();await p.waitForFunction(()=>/Pending transaction/.test(document.getElementById('burnStatus')?.textContent||''),null,{timeout:6000}).catch(()=>{});
 const d=(chain.sent[0]?.data||'').toLowerCase();
 ok('one plain RF transfer to 0x…dEaD for 10 RF, tagged HATCHWORK (02) for Friend #3412',chain.sent.length===1&&chain.sent[0].to.toLowerCase()===TOKEN&&d.slice(0,74)==='0xa9059cbb'+w(DEAD)&&BigInt('0x'+d.slice(74,138))===10n*E&&d.slice(138,150)==='524853540102'&&BigInt('0x'+d.slice(154))===3412n&&d.length===202,d);
 await p.locator('#burnCancel').click();await p.waitForTimeout(150);await p.locator('[data-burn="citrus"]').click();await p.waitForTimeout(200);
 ok('pending burn: another item is refused without a sheet ('+(await txt('#toast'))+')',!(await modalOpen())&&/Pending transaction/.test(await txt('#toast'))&&chain.sent.length===1);
 await p.locator('[data-mode="live"]').click();await p.locator('#liveCheck').waitFor();ok('LIVE BURN shows the pending banner with CHECK AGAIN',(await p.locator('#liveCheck').count())===1&&/TRANSACTION PENDING/.test(await txt('#studioPage')));chain.hold=false;await p.locator('#liveCheck').click();await p.waitForFunction(()=>{try{return JSON.parse(localStorage.getItem('rh-live-pending-v1'))===null;}catch{return false;}},null,{timeout:6000}).catch(()=>{});
 ok('confirmed from its receipt: '+(await txt('#toast')),/HATCHWORK unlocked/.test(await txt('#toast')));
 await p.waitForFunction(()=>/125\.00 RF/.test(document.getElementById('ledgerTotal')?.textContent||''),null,{timeout:6000}).catch(()=>{});
 ok('ledger adds the new burn on top: total 125.00 RF ('+(await txt('#ledgerList li'))+')',(await txt('#ledgerTotal'))==='125.00 RF'&&/^HATCHWORK 10\.00 RF FRIEND #3412/.test(await txt('#ledgerList li')));
 ok('your receipts list the burn with its explorer link',/HATCHWORK/.test(await txt('.myburns'))&&(await p.locator('.myburns a.txlink').count())===1);
 // A legacy unknown-outcome lock from a retired Vault Bounty still loads and blocks every burn.
 await p.evaluate(()=>{const pending={status:'unknown-outcome',ownerId:'other-tab',walletRequested:true,from:'0x1111111111111111111111111111111111111111',item:'bounty',amount:'2',amountUnits:'2000000000000000000',friendId:'3412',sentAt:Date.now(),sentBlock:'0x100',nonce:77,decimals:18};localStorage.setItem('rh-live-pending-v1',JSON.stringify(pending));});
 await p.reload();await p.waitForTimeout(900);await p.evaluate(()=>document.getElementById('friendReveal')?.remove());await nav('last');await p.waitForTimeout(800);
 ok('legacy unknown outcome: the recovery panel is shown on the Last Heist page',await p.locator('#burnUnknownPanel').isVisible().catch(()=>false));
 await nav('studio');await p.locator('[data-mode="live"]').click();await p.waitForTimeout(400);
 if(await p.locator('[data-burn="citrus"]').count()){await p.locator('[data-burn="citrus"]').click();await p.waitForTimeout(200);}
 ok('legacy unknown outcome: a shop burn is refused, nothing sent ('+(await txt('#toast'))+')',!(await modalOpen())&&/don't know if your wallet sent/.test(await txt('#toast'))&&chain.sent.length===1);
 // RF ECONOMY page.
 await p.evaluate(()=>localStorage.removeItem('rh-live-pending-v1'));await p.reload();await p.waitForTimeout(900);await p.evaluate(()=>document.getElementById('friendReveal')?.remove());
 await nav('studio');await p.locator('[data-mode="economy"]').click();await p.waitForFunction(()=>/RF/.test(document.getElementById('ecSupply')?.textContent||'')&&/Ledger check/.test(document.getElementById('ecStakes')?.textContent||''),null,{timeout:8000}).catch(()=>{});await p.waitForTimeout(600);
 const order=await p.evaluate(()=>[...document.querySelectorAll('#studioPage section')].map(s=>s.className.split(' ')[0]).join(','));
 ok('RF ECONOMY leads with stake rounds, then the roadmap, then the flow ('+order+')',/^stakehero,roadmap,econmap/.test(order));
 ok('stake headline: live pot, entrants, DEMO badge, burned so far ('+(await txt('.stakehero-grid'))+')',(await txt('#ecPot'))==='0'&&/0/.test(await txt('#ecEntrants'))&&(await txt('#ecStakeBurned'))==='0 DEMO RF'&&/DEMO, PLAY MONEY/.test(await txt('.stakehero-head')));
 ok('roadmap: six steps, step 1 marked as now, spec link, not deployed',(await p.locator('.roadsteps li').count())===6&&/YOU ARE HERE/.test(await txt('.roadsteps li.now'))&&/docs\/STAKES\.md$/.test(await p.locator('.roadmap a').getAttribute('href'))&&/Not deployed/.test(await txt('.roadmap')));
 ok('flow: a live SHOP pipe and a dashed STAKE ROUNDS pipe; no Tribute, bounty or workshop pipe',(await p.locator('.pipe.live',{hasText:'SHOP'}).count())===1&&(await p.locator('.pipe.sim',{hasText:'STAKE ROUNDS'}).count())===1&&(await p.locator('.pipe').count())===2&&!/TRIBUTE|BOUNTY|WORKSHOP/.test(await txt('.econflow')));
 ok('economy counters: supply 1,000,000,000.00 RF, dEaD 1,010.00 RF, burned in the shop 125.00 RF ('+[await txt('#ecSupply'),await txt('#ecDead'),await txt('#ecAll')].join(' / ')+')',(await txt('#ecSupply'))==='1,000,000,000.00 RF'&&(await txt('#ecDead'))==='1,010.00 RF'&&(await txt('#ecAll'))==='125.00 RF');
 ok('calculator defaults: 27,000 RF a month = 21,600 from stakes + 5,400 from the shop; 0.0027% of RF outside dEaD, 27x dEaD ('+[await txt('#calcMonth'),await txt('#calcStakes'),await txt('#calcItems'),await txt('#calcShare'),await txt('#calcDead')].join(' / ')+')',(await txt('#calcMonth'))==='27,000 RF'&&(await txt('#calcStakes'))==='21,600 RF'&&(await txt('#calcItems'))==='5,400 RF'&&(await txt('#calcShare'))==='0.0027%'&&(await txt('#calcDead'))==='27×');
 await p.fill('#calc-players','1000');ok('calculator is editable: 1,000 players a day → 39,600 RF a month',(await txt('#calcMonth'))==='39,600 RF');
 ok('no bounty or tribute term in the calculator, labelled as a projection',!/bounty|tribute/i.test(await txt('.calc'))&&/PROJECTION, NOT A RESULT/.test(await txt('.calchead')));
 await p.fill('#calc-players','300');await p.screenshot({path:path.join(shots,'rf-economy-1440.png'),fullPage:true});
 // Phone.
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(300);await p.screenshot({path:path.join(shots,'rf-economy-390.png'),fullPage:true});
 ok('no horizontal overflow on a phone (RF ECONOMY)',await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
 await p.locator('[data-mode="live"]').click();await p.waitForTimeout(1200);await p.screenshot({path:path.join(shots,'live-burn-390.png'),fullPage:true});
 ok('no horizontal overflow on a phone (LIVE BURN)',await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
 await nav('last');await p.waitForTimeout(1200);await p.screenshot({path:path.join(shots,'last-heist-stake-first-390.png'),fullPage:true});
 ok('no horizontal overflow on a phone (Last Heist)',await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
 ok('no page errors '+errors.join(' | '),!errors.length);
}finally{await b.close();app.server.close();}
console.log(pass+'/'+(pass+fail)+' passed');process.exit(fail?1:0);
