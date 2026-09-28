// LIVE BURN encoding and receipt checks. Run: node --test tests/burn.test.cjs
const test=require('node:test'),assert=require('node:assert/strict');
const I=require('../src/identity.js'),B=require('../src/burn.js');
const P='0x1111111111111111111111111111111111111111',w=v=>BigInt(v).toString(16).padStart(64,'0'),E18=10n**18n;
const log=(from,to,amount,address=I.RF_TOKEN)=>({address,topics:[I.TRANSFER,'0x'+w(from),'0x'+w(to)],data:'0x'+w(amount)});

test('calldata is a standard transfer to 0x…dEaD with a trailing tag',()=>{
 const d=B.calldata(25n*E18,'trail','7730');
 assert.equal(d.slice(0,10),'0xa9059cbb');
 assert.equal(d.slice(10,74),w(B.DEAD));
 assert.equal(BigInt('0x'+d.slice(74,138)),25n*E18);
 assert.equal(d.length,2+8+64*3);
 assert.deepEqual(B.parseInput(d),{amount:25n*E18,tag:{item:'trail',friendId:'7730',nonce:0}});
});
test('tags round-trip and reject foreign data',()=>{
 for(const it of [...B.ITEMS,...B.RETIRED])assert.equal(B.readTag(B.tag(it.id,'3412')).item,it.id);
 assert.equal(B.readTag(B.tag('ash',null)).friendId,null);
 assert.equal(B.readTag('00'.repeat(32)),null);
 assert.equal(B.parseInput('0xa9059cbb'+w(P)+w(1)),null,'transfer to another address is not a burn');
 assert.equal(B.parseInput('0xa9059cbb'+w(B.DEAD)+w(5)).tag,null,'untagged burns are not Rare Heist purchases');
});
test('attempt nonce round-trips in the two reserved tag bytes; old tags decode as zero',()=>{
 const nonce=0x3a7f,tag=B.tag('citrus','3412',nonce),data=B.calldata(10n*E18,'citrus','3412',nonce);
 assert.equal(tag.slice(12,16),'3a7f');
 assert.deepEqual(B.readTag(tag),{item:'citrus',friendId:'3412',nonce});
 assert.deepEqual(B.parseInput(data),{amount:10n*E18,tag:{item:'citrus',friendId:'3412',nonce}});
 assert.deepEqual(B.readTag(B.tag('citrus','3412')),{item:'citrus',friendId:'3412',nonce:0});
 assert.equal(B.newNonce()>0,true);
 for(const bad of [-1,65536,1.5,'1'])assert.throws(()=>B.tag('citrus','3412',bad),/nonce/);
});
test('amount parsing is exact and bounded',()=>{
 assert.equal(B.units('2.5',18),25n*10n**17n);
 assert.equal(B.units(7,18),7n*E18);
 for(const bad of ['0','-1','1e3','abc','1.1234567',''])assert.throws(()=>B.units(bad,18));
});
test('receipt must show Transfer(player → dEaD) from the RF contract',()=>{
 const ok={status:'0x1',transactionHash:'0xAB',blockNumber:'0x10',logs:[log(P,B.DEAD,10n*E18)]};
 assert.equal(B.checkReceipt(ok,{from:P,min:10n*E18}).amount,10n*E18);
 assert.throws(()=>B.checkReceipt({...ok,status:'0x0'},{from:P}),/failed/);
 assert.throws(()=>B.checkReceipt(ok,{from:P,min:11n*E18}),/does not show/);
 assert.throws(()=>B.checkReceipt({...ok,logs:[log(P,B.DEAD,10n*E18,'0x2222222222222222222222222222222222222222')]},{from:P}),/does not show/,'a look-alike token does not count');
 assert.throws(()=>B.checkReceipt({...ok,logs:[log(P,'0x3333333333333333333333333333333333333333',10n*E18)]},{from:P}),/does not show/,'a transfer elsewhere does not count');
 assert.throws(()=>B.checkReceipt({...ok,logs:[log('0x4444444444444444444444444444444444444444',B.DEAD,10n*E18)]},{from:P}),/does not show/,'someone else\'s burn does not count');
});
test('unlocks need a tagged burn of at least the price; the ledger lists each burn once, newest first',()=>{
 const burns=[{tx:'0x01',block:'0x10',item:'trail',amount:25n*E18,from:P,friendId:'7730'},{tx:'0x02',block:'0x12',item:'lilac',amount:9n*E18,from:P,friendId:'7730'},{tx:'0x03',block:'0x11',item:'ash',amount:3n*E18,from:P,friendId:'3412'},{tx:'0X01',block:'0x10',item:'trail',amount:25n*E18,from:P,friendId:'7730'}];
 assert.deepEqual(B.unlocked(burns),['trail'],'9 RF does not unlock a 10 RF theme; a legacy tribute unlocks nothing');
 const l=B.ledger(burns);assert.equal(l.total,37n*E18,'a duplicate receipt counts once');
 assert.deepEqual(l.rows.map(r=>r.tx),['0x02','0x03','0x01']);
 assert.equal('rows' in l&&!('who' in l.rows[0]),true,'plain rows: no ranking or per-Friend aggregation');
});
test('the wallet allowlist gained only the burn transaction and receipt reads',async()=>{
 const p={request:async()=>'0x'};
 for(const m of ['eth_sendTransaction','eth_getTransactionReceipt','eth_getTransactionByHash'])await I.request(p,m,[]);
 for(const m of ['eth_sign','personal_sign','eth_signTypedData_v4','wallet_watchAsset','eth_sendRawTransaction'])await assert.rejects(I.request(p,m,[]),/Forbidden/);
});
test('burn refuses when the wallet lacks RF and never sends',async()=>{
 const sent=[];const p={request:async({method,params})=>{sent.push(method);if(method==='eth_chainId')return '0x1237';if(method==='eth_call'){const sel=params[0].data.slice(2,10);return '0x'+w(sel==='313ce567'?18:5n*E18);}throw Error('unexpected '+method);}};
 await assert.rejects(B.burn(p,{account:P,item:'trail',friendId:'7730'}),/Not enough RF/);
 assert.ok(!sent.includes('eth_sendTransaction'));
});

// ---- SHOP: four fixed-price items, 100% burned. Tribute (9) and Vault Bounty (10) are retired: not sold, still decoded. ----
test('only the four shop items are purchasable; tribute and bounty are retired but their old tags still decode',()=>{
 assert.deepEqual(B.ITEMS.map(x=>[x.id,x.code,x.rf,!!x.any]),[['trail',1,25,false],['lilac',2,10,false],['citrus',3,10,false],['archive-pack',4,50,false]]);
 for(const id of ['ash','bounty']){assert.equal(B.forSale(id),undefined,id+' is not for sale');assert.equal(B.ITEMS.some(x=>x.id===id),false);assert.equal(B.byId(id).retired,true);}
 assert.deepEqual(B.RETIRED.map(x=>[x.id,x.code]),[['ash',9],['bounty',10]],'codes are kept, never reused');
 // Exact bytes of a burn made before the retirement: 'RHST' v1, item 09 / 0a, nonce, Friend.
 const oldTribute='52485354'+'01'+'09'+'0000'+w(1234).slice(16),oldBounty='52485354'+'01'+'0a'+'0102'+w(3412).slice(16);
 assert.deepEqual(B.readTag(oldTribute),{item:'ash',friendId:'1234',nonce:0});
 assert.deepEqual(B.readTag(oldBounty),{item:'bounty',friendId:'3412',nonce:0x0102});
 assert.deepEqual(B.parseInput('0xa9059cbb'+w(B.DEAD)+w(7n*E18)+oldTribute),{amount:7n*E18,tag:{item:'ash',friendId:'1234',nonce:0}});
 assert.deepEqual(B.unlocked([{item:'bounty',amount:500n*E18},{item:'ash',amount:500n*E18}]),[],'a retired burn unlocks nothing');
 const l=B.ledger([{tx:'0xaa',block:'0x2',item:'bounty',amount:37n*E18,from:P,friendId:'3412'},{tx:'0xbb',block:'0x1',item:'ash',amount:7n*E18,from:P,friendId:null}]);
 assert.equal(l.total,44n*E18);assert.deepEqual(l.rows.map(r=>B.byId(r.item).name),['VAULT BOUNTY','TRIBUTE'],'the ledger still names old burns');
 assert.equal(B.tag('trail','3412',5),'52485354'+'01'+'01'+'0005'+w(3412).slice(16),'encoding is unchanged');
});
function mockWallet(balance=1000n*E18){
 const calls=[],sent=[];let receipt=null;
 const p={request:async({method,params})=>{calls.push(method);
  if(method==='eth_chainId')return '0x1237';if(method==='eth_blockNumber')return '0x100';
  if(method==='eth_call'){const sel=params[0].data.slice(2,10);return '0x'+w(sel==='313ce567'?18:balance);}
  if(method==='eth_sendTransaction'){sent.push(params[0]);const d=params[0].data.slice(2),amount=BigInt('0x'+d.slice(72,136));receipt={status:'0x1',transactionHash:'0x'+w(0xbeef),blockNumber:'0x101',logs:[log(P,B.DEAD,amount)]};return '0x'+w(0xbeef);}
  if(method==='eth_getTransactionReceipt')return receipt;
  throw Error('unexpected '+method);}};
 return {p,calls,sent};
}
test('retired and unknown items are refused before any wallet request, at any amount',async()=>{
 for(const [item,amount,msg] of [['bounty','0.5',/no longer sold/],['bounty','37',/no longer sold/],['ash','0.000001',/no longer sold/],['ash','500',/no longer sold/],['nope','1',/Unknown item/]]){const {p,calls}=mockWallet();
  await assert.rejects(B.burn(p,{account:P,item,amount,friendId:'3412',nonce:5,poll:0}),msg);
  assert.deepEqual(calls,[],'no wallet method may run for '+item+' '+amount);}
});
test('a shop burn is one tagged transfer to dEaD for the exact price, proven by its receipt; a caller amount cannot change it',async()=>{
 const {p,sent}=mockWallet();
 const r=await B.burn(p,{account:P,item:'citrus',amount:'37',friendId:'3412',nonce:0x0a0b,poll:0});
 assert.equal(sent.length,1);assert.equal(sent[0].to,I.RF_TOKEN);assert.equal(sent[0].value,'0x0');
 assert.deepEqual(B.parseInput(sent[0].data),{amount:10n*E18,tag:{item:'citrus',friendId:'3412',nonce:0x0a0b}});
 assert.equal(r.item,'citrus');assert.equal(r.amount,10n*E18);assert.equal(r.friendId,'3412');
 assert.throws(()=>B.checkReceipt({status:'0x1',transactionHash:'0x1',blockNumber:'0x1',logs:[log(P,B.DEAD,9n*E18)]},{from:P,min:10n*E18}),/does not show/,'a smaller logged burn does not prove a 10 RF item');
});
test('read-only chain helpers: supply read; block reads (only bounties used them) and signing are forbidden',async()=>{
 const p={request:async()=>'0x'};
 for(const m of ['eth_getBlockByNumber','eth_sign','personal_sign','eth_signTypedData_v4','eth_sendRawTransaction','eth_getBalance'])await assert.rejects(I.request(p,m,[]),/Forbidden/);
 const fetchImpl=async(u,o)=>({ok:true,status:200,json:async()=>({result:JSON.parse(o.body).method})});
 await assert.rejects(I.rpc('eth_getBlockByNumber',['0x1',false],{fetchImpl}),/Forbidden/);
 assert.equal(await I.rpc('eth_getTransactionByHash',['0x1'],{fetchImpl}),'eth_getTransactionByHash');
 const q={request:async({method,params})=>{if(method==='eth_blockNumber')return '0x5';const sel=params[0].data.slice(2,10);return '0x'+w(sel==='313ce567'?18:sel==='18160ddd'?1000n*E18:sel==='70a08231'?28n*E18:0);}};
 assert.deepEqual(await I.rfSupply(q),{block:'0x5',decimals:18,total:1000n*E18,dead:28n*E18});
});
test('RF ECONOMY calculator: shop items plus the stake-round burn share, plain arithmetic',()=>{
 const X=require('../src/economy.js');
 // UI defaults. Shop: 30 days x 300 players x 3% x 20 RF. Stakes: 30 days x 10 rounds x 6 entrants x 50 RF x 80% with a winner x 30% burned.
 assert.deepEqual(X.project({players:300,burnPct:3,avgBurn:20,stakeRounds:10,stakeEntrants:6,stakeWinPct:80}),{items:5400,stakes:21600,total:27000});
 assert.deepEqual(X.project({players:-5,burnPct:'x',avgBurn:15}),{items:0,stakes:0,total:0});
 assert.equal(X.project({players:10,burnPct:250,avgBurn:1,days:1}).total,10,'a share is capped at 100%');
 assert.equal(X.project({stakeRounds:10,stakeEntrants:6,stakeWinPct:0}).stakes,0,'refunded rounds burn nothing');
 assert.equal('bounty' in X.project({}),false,'no bounty term');
});
