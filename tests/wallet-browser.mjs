// Browser check of the wallet flow with a mock EIP-6963 wallet that answers like the
// Rare Friends contracts (real #3412 / #7730 frames). Run: node tests/wallet-browser.mjs
import { chromium } from 'playwright';
import {readFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import path from 'node:path';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),out=process.argv[2]||(await import('node:os')).tmpdir();
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
const b=await chromium.launch(),results=[];const ok=(n,c)=>{results.push([n,!!c]);console.log((c?'PASS ':'FAIL ')+n);};
const ctx=await b.newContext({viewport:{width:1440,height:900}});
await ctx.addInitScript(({chain,ACCOUNT,src})=>{const h=(0,eval)('('+src+')')(chain,ACCOUNT);const provider={request:h,on(){},removeListener(){}};
 window.addEventListener('eip6963:requestProvider',()=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'mock-1',name:'Mock Wallet',rdns:'test.mock',icon:''},provider}})));},{chain,ACCOUNT,src:handler.toString()});
await ctx.route('https://rpc.mainnet.chain.robinhood.com/**',async r=>{const req=JSON.parse(r.request().postData());const h=handler(chain,ACCOUNT);let result;if(req.method==='eth_chainId')result='0x1237';else result=await h(req);await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({jsonrpc:'2.0',id:req.id,result})});});
const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('file://'+html);await p.waitForTimeout(900);
ok('header shows CONNECT WALLET',(await p.locator('#wallet').innerText()).includes('CONNECT WALLET'));
await p.locator('#wallet').click();await p.waitForTimeout(200);
await p.locator('#walletConnect').click();await p.waitForTimeout(1500);
const status=await p.locator('#walletStatus').innerText();ok('wallet connected and Friends found: '+status,/Found 2 Friends/.test(status));
await p.screenshot({path:path.join(out,'wallet-found.png')});
await p.locator('[data-own="7730"]').click();await p.waitForTimeout(300);
ok('header shows MY FRIEND #7730',(await p.locator('#friend').innerText())==='MY FRIEND #7730');
ok('wallet button shows short address',(await p.locator('#wallet').innerText()).toLowerCase().startsWith('0x1111'));
ok('hero in game view is #7730',(await p.evaluate(()=>RareHeistView().hero))==='7730');
await p.reload();await p.waitForTimeout(1200);
ok('after reload the owned Friend is restored and re-verified',(await p.locator('#friend').innerText())==='MY FRIEND #7730');
await p.locator('#friend').click();await p.waitForTimeout(200);await p.fill('#previewId','3412');await p.locator('#previewRead').click();await p.waitForTimeout(1200);
ok('preview by ID works without ownership',(await p.locator('#friend').innerText())==='PREVIEW #3412');
await p.locator('#friend').click();await p.waitForTimeout(200);await p.locator('#manualBox summary').click();await p.fill('#ownedId','999');await p.locator('#ownRead').click();await p.waitForTimeout(900);
ok('foreign token is refused: '+(await p.locator('#walletStatus').innerText()),/does not own/.test(await p.locator('#walletStatus').innerText()));
await p.locator('#closeDialog').click();await p.waitForTimeout(150);await p.locator('#friend').click();await p.waitForTimeout(200);await p.locator('#inspectBox summary').click();await p.fill('#inspectAddr',ACCOUNT);await p.locator('#inspectRead').click();await p.waitForTimeout(1500);
ok('view-address lists the holder\'s Friends: '+(await p.locator('#previewStatus').innerText()),/Found 2 Friends/.test(await p.locator('#previewStatus').innerText()));
await p.locator('[data-view="7730"]').click();await p.waitForTimeout(300);ok('view-address Friend plays as PREVIEW',(await p.locator('#friend').innerText())==='PREVIEW #7730');
await p.locator('#closeDialog').click().catch(()=>{});await p.waitForTimeout(150);await p.locator('#wallet').click();await p.waitForTimeout(150);await p.locator('#walletConnect').click();await p.waitForTimeout(1500);await p.locator('[data-own="3412"]').click();await p.waitForTimeout(300);
await p.getByRole('button',{name:/^STUDIO \/ DEMO$/}).click();await p.waitForTimeout(1500);
const rfA=await p.locator('#rfAccount').innerText(),rfF=await p.locator('#rfFriend').innerText();
ok('real RF balances read: wallet '+rfA+', Friend wallet '+rfF,rfA==='1,234.50 RF'&&rfF==='42.00 RF');
// LIVE BURN (beta): opt-in, real RF to 0x…dEaD, verified from the receipt, Hall of Ash from tagged history.
ok('Studio opens in DEMO mode',(await p.locator('[data-mode="demo"]').getAttribute('aria-selected'))==='true');
await p.locator('[data-mode="live"]').click();await p.waitForTimeout(1500);
const txt=id=>p.locator(id).innerText();
ok('LIVE shows real RF balance '+(await txt('#lvYour')),(await txt('#lvYour'))==='1,234.50 RF');
ok('LIVE shows RF at 0x…dEaD '+(await txt('#lvDead')),(await txt('#lvDead'))==='1,000.00 RF');
ok('Hall of Ash lists the earlier tagged burn: '+(await txt('#hallList')).replace(/\s+/g,' '),/FRIEND #1234/i.test(await txt('#hallList'))&&(await txt('#lvAll'))==='7.00 RF');
await p.locator('[data-burn="trail"]').click();await p.waitForTimeout(200);
ok('burn needs an explicit confirmation',await p.locator('#burnGo').isDisabled());
await p.locator('#burnAgree').check();await p.locator('#burnGo').click();await p.waitForTimeout(2500);
const sent=await p.evaluate(()=>globalThis.__txs||[]);
ok('one plain RF transfer to 0x…dEaD, 25 RF, tagged GOLDEN TRAIL for Friend #3412',sent.length===1&&sent[0].to.toLowerCase()==='0x0779369854d3ecdea927206718ffd7730c67b71f'&&sent[0].data.slice(0,74)==='0xa9059cbb'+'0'.repeat(24)+'000000000000000000000000000000000000dead'&&BigInt('0x'+sent[0].data.slice(74,138))===25n*10n**18n&&sent[0].data.slice(138,150)==='524853540101'&&BigInt('0x'+sent[0].data.slice(154))===3412n&&!sent[0].value?.replace(/^0x0*$/,''));
ok('after the receipt: trail unlocked, counters updated ('+(await txt('#lvMine'))+' / '+(await txt('#lvYour'))+')',(await p.locator('[data-use="trail"]').count())===1&&(await txt('#lvMine'))==='25.00 RF'&&(await txt('#lvYour'))==='1,209.50 RF'&&(await txt('#lvAll'))==='32.00 RF');
ok('Hall of Ash ranks Friend #3412 first',/^\s*FRIEND #3412/i.test((await p.locator('#hallList li').first().innerText())));
await p.fill('#ashAmount','2.5');await p.locator('[data-burn="ash"]').click();await p.waitForTimeout(200);await p.locator('#burnAgree').check();await p.locator('#burnGo').click();await p.waitForTimeout(2500);
ok('tribute of 2.5 RF burned: '+(await txt('#lvMine')),(await txt('#lvMine'))==='27.50 RF');
await p.evaluate(()=>{globalThis.__reject=true;});await p.locator('[data-burn="lilac"]').click();await p.waitForTimeout(200);await p.locator('#burnAgree').check();await p.locator('#burnGo').click();await p.waitForTimeout(800);
ok('wallet rejection burns nothing: '+(await txt('#burnStatus')),/Nothing was burned/.test(await txt('#burnStatus'))&&(await p.evaluate(()=>globalThis.__txs.length))===2);
await p.evaluate(()=>{globalThis.__reject=false;});await p.locator('#closeDialog').click();await p.waitForTimeout(150);
await p.fill('#ashAmount','99999');await p.locator('[data-burn="ash"]').click();await p.waitForTimeout(200);await p.locator('#burnAgree').check();await p.locator('#burnGo').click();await p.waitForTimeout(800);
ok('not enough RF is refused before the wallet is asked: '+(await txt('#burnStatus')),/Not enough RF/.test(await txt('#burnStatus'))&&(await p.evaluate(()=>globalThis.__txs.length))===2);
await p.locator('#closeDialog').click();await p.waitForTimeout(150);
await p.reload();await p.waitForTimeout(1200);await p.getByRole('button',{name:/^STUDIO \/ DEMO$/}).click();await p.waitForTimeout(400);
ok('after reload the Studio is back in DEMO',(await p.locator('[data-mode="demo"]').getAttribute('aria-selected'))==='true');
await p.locator('[data-mode="live"]').click();await p.waitForTimeout(1200);
ok('the unlock survives a reload',(await p.locator('[data-use="trail"]').count())===1);
await p.screenshot({path:path.join(out,'live-burn.png'),fullPage:true});
await p.getByRole('button',{name:/^SOLO VAULTS$/}).click();await p.waitForTimeout(300);await p.locator('article').filter({hasText:'Night Gallery'}).first().getByRole('button',{name:'OPERATIVE'}).click();await p.waitForTimeout(600);
if(await p.evaluate(()=>document.getElementById('modal')?.open))await p.locator('#closeDialog').click();
for(let i=0;i<4;i++){await p.keyboard.press('ArrowRight');await p.waitForTimeout(260);}await p.waitForTimeout(300);
const lime=await p.evaluate(()=>{const c=document.querySelector('#boardWrap canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]===204&&d[i+1]===255&&d[i+2]===0)n++;return n;});
await p.screenshot({path:path.join(out,'golden-trail.png')});
const view=await p.evaluate(()=>RareHeistView());ok('golden trail is on in play: '+view.trail+' footprints, '+lime+' lime px',view.trail>=3&&lime>0);
ok('no page errors '+errors.join(' | '),errors.length===0);
await b.close();
const failed=results.filter(r=>!r[1]).length;console.log(results.length-failed+'/'+results.length+' passed');process.exit(failed?1:0);
