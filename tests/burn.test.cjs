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
 for(const it of B.ITEMS)assert.equal(B.readTag(B.tag(it.id,'3412')).item,it.id);
 assert.equal(B.readTag(B.tag('ash',null)).friendId,null);
 assert.equal(B.readTag('00'.repeat(32)),null);
 assert.equal(B.parseInput('0xa9059cbb'+w(P)+w(1)),null,'transfer to another address is not a burn');
 assert.equal(B.parseInput('0xa9059cbb'+w(B.DEAD)+w(5)).tag,null,'untagged burns are not Rare Heist purchases');
});
test('attempt nonce round-trips in the two reserved tag bytes; old tags decode as zero',()=>{
 const nonce=0x3a7f,tag=B.tag('ash','3412',nonce),data=B.calldata(E18,'ash','3412',nonce);
 assert.equal(tag.slice(12,16),'3a7f');
 assert.deepEqual(B.readTag(tag),{item:'ash',friendId:'3412',nonce});
 assert.deepEqual(B.parseInput(data),{amount:E18,tag:{item:'ash',friendId:'3412',nonce}});
 assert.deepEqual(B.readTag(B.tag('ash','3412')),{item:'ash',friendId:'3412',nonce:0});
 assert.equal(B.newNonce()>0,true);
 for(const bad of [-1,65536,1.5,'1'])assert.throws(()=>B.tag('ash','3412',bad),/nonce/);
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
test('unlocks need a tagged burn of at least the price; the Hall sums by Friend',()=>{
 const burns=[{item:'trail',amount:25n*E18,from:P,friendId:'7730'},{item:'lilac',amount:9n*E18,from:P,friendId:'7730'},{item:'ash',amount:3n*E18,from:P,friendId:'3412'}];
 assert.deepEqual(B.unlocked(burns),['trail']);
 const h=B.hall(burns);assert.equal(h.total,37n*E18);assert.equal(h.rows[0].who,'#7730');assert.equal(h.rows[0].amount,34n*E18);
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

// ---- VAULT BOUNTY (item code 10) and ASH RANKS. Additive: the older items keep their codes, prices and checks. ----
test('bounty is a new any-amount item with its own tag code; older items are unchanged',()=>{
 assert.deepEqual(B.ITEMS.map(x=>[x.id,x.code,x.rf,!!x.any]),[['trail',1,25,false],['lilac',2,10,false],['citrus',3,10,false],['archive-pack',4,50,false],['ash',9,1,true],['bounty',10,1,true]]);
 const t=B.tag('bounty','3412',0x0102);
 assert.equal(t,'52485354'+'01'+'0a'+'0102'+w(3412).slice(16));
 assert.deepEqual(B.readTag(t),{item:'bounty',friendId:'3412',nonce:0x0102});
 const d=B.calldata(37n*E18,'bounty',null,7);
 assert.equal(d.slice(0,74),'0xa9059cbb'+w(B.DEAD));
 assert.deepEqual(B.parseInput(d),{amount:37n*E18,tag:{item:'bounty',friendId:null,nonce:7}});
 assert.deepEqual(B.unlocked([{item:'bounty',amount:500n*E18}]),[],'a bounty unlocks nothing');
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
test('a bounty below 1 RF is refused before any wallet request',async()=>{
 for(const amount of ['0.5','0.999999']){const {p,calls}=mockWallet();
  await assert.rejects(B.burn(p,{account:P,item:'bounty',amount,friendId:'3412',nonce:5,poll:0}),/Bounty must be at least 1 RF/);
  assert.deepEqual(calls,[],'no wallet method may run for '+amount);}
});
test('a bounty burn is one tagged transfer to dEaD for the exact amount, proven by its receipt',async()=>{
 const {p,sent}=mockWallet();
 const r=await B.burn(p,{account:P,item:'bounty',amount:'37',friendId:'3412',nonce:0x0a0b,poll:0});
 assert.equal(sent.length,1);assert.equal(sent[0].to,I.RF_TOKEN);assert.equal(sent[0].value,'0x0');
 assert.deepEqual(B.parseInput(sent[0].data),{amount:37n*E18,tag:{item:'bounty',friendId:'3412',nonce:0x0a0b}});
 assert.equal(r.item,'bounty');assert.equal(r.amount,37n*E18);assert.equal(r.friendId,'3412');
 assert.throws(()=>B.checkReceipt({status:'0x1',transactionHash:'0x1',blockNumber:'0x1',logs:[log(P,B.DEAD,36n*E18)]},{from:P,min:37n*E18}),/does not show/,'a smaller logged burn does not prove a 37 RF bounty');
});
const E3=1000;
const R=(id,createdAt,finishedAt=null)=>({id,createdAt,phase:finishedAt==null?'open':'finished',finishedAt});
test('bounty attribution: block time inside [createdAt, finishedAt) of the round, boundary blocks included/excluded exactly',()=>{
 const start=1_800_000_000*E3,end=start+600*E3;
 const burns=[
  {tx:'0x01',block:'0x10',item:'bounty',amount:(5n*E18).toString(),from:P,friendId:'3412'}, // exactly at start: counts
  {tx:'0x02',block:'0x11',item:'bounty',amount:(7n*E18).toString(),from:P,friendId:'7730'}, // one second before end: counts
  {tx:'0x03',block:'0x12',item:'bounty',amount:(11n*E18).toString(),from:P,friendId:'3412'}, // exactly at end: next round only
  {tx:'0x04',block:'0x13',item:'bounty',amount:(13n*E18).toString(),from:P,friendId:'9'}, // one second before start: none
  {tx:'0x05',block:'0x10',item:'ash',amount:(100n*E18).toString(),from:P,friendId:'3412'}, // a tribute is not a bounty
  {tx:'0x06',block:'0x99',item:'bounty',amount:(17n*E18).toString(),from:P,friendId:'3412'}, // block time unknown
 ];
 const times=new Map([['16',start/E3],['17',end/E3-1],['18',end/E3],['19',start/E3-1]]);
 const m=B.bounties(burns,times,[R('a',start,end),R('b',end),R('old',start-3600*E3,start-600*E3)]);
 assert.equal(m.get('a').amount,12n*E18);assert.equal(m.get('a').count,2);assert.equal(m.get('a').friends,2);assert.equal(m.get('a').wallets,0);assert.equal(m.get('a').unknown,1);
 assert.equal(m.get('b').amount,11n*E18,'an open round has no end yet');assert.equal(m.get('b').count,1);
 assert.equal(m.get('old').amount,0n);assert.equal(m.get('old').count,0);
 assert.deepEqual(B.roundWindow(R('x',10,20)),{start:10,end:20});assert.deepEqual(B.roundWindow(R('y',10)),{start:10,end:null});
 assert.equal(B.roundWindow({id:'bad',createdAt:'x'}),null);
});
test('bounty attribution: a burn counts for every round live at that moment, once per transaction',()=>{
 const t=2_000_000_000,burns=[{tx:'0xaa',block:'0x20',item:'bounty',amount:E18.toString(),from:P,friendId:null},{tx:'0xAA',block:'0x20',item:'bounty',amount:E18.toString(),from:P,friendId:null}];
 const m=B.bounties(burns,new Map([['32',t]]),[R('std',t*E3-5),R('spr',t*E3)]);
 assert.equal(m.get('std').amount,E18);assert.equal(m.get('spr').amount,E18);assert.equal(m.get('std').friends,0);assert.equal(m.get('std').wallets,1,'an untagged burn counts its sender wallet once');
});
test('block times are read with eth_getBlockByNumber(block,false), deduplicated, bounded and validated',async()=>{
 const asked=[];const p={request:async({method,params})=>{asked.push([method,...params]);if(method!=='eth_getBlockByNumber')throw Error('unexpected '+method);return {number:params[0],timestamp:'0x'+(1000+parseInt(params[0],16)).toString(16)};}};
 const m=await B.blockTimes(p,['0x10','16','0x11','0x10','',null,'zz'],{known:new Map([['17',5]]),max:5});
 assert.deepEqual(asked,[['eth_getBlockByNumber','0x10',false]]);assert.equal(m.get('16'),1016);assert.equal(m.get('17'),5);
 const bad={request:async()=>({timestamp:'soon'})};await assert.rejects(B.blockTimes(bad,['0x1']),/block time/i);
 const many=[];const q={request:async({params})=>{many.push(params[0]);return {timestamp:'0x1'};}};await B.blockTimes(q,Array.from({length:10},(_,i)=>'0x'+(i+1).toString(16)),{max:3});assert.equal(many.length,3,'reads are capped');
});
test('ash ranks: everything burned with a Friend\'s tag, by threshold',()=>{
 assert.deepEqual(B.RANKS.map(r=>[r.id,r.rf]),[['ember',1],['cinder',25],['furnace',100],['ashlord',500]]);
 const at=rf=>B.rank(BigInt(Math.round(rf*1e6))*10n**12n);
 assert.equal(at(0.99).rank,null);assert.equal(at(0.99).next.id,'ember');assert.equal(at(0.99).toNext,10n**16n);
 assert.equal(at(1).rank.id,'ember');assert.equal(at(24.999999).rank.id,'ember');assert.equal(at(25).rank.id,'cinder');
 assert.equal(at(99).toNext,E18);assert.equal(at(100).rank.id,'furnace');assert.equal(at(500).rank.id,'ashlord');assert.equal(at(500).next,null);assert.equal(at(500).toNext,null);
 const ash=B.ashByFriend([{tx:'0x1',item:'trail',amount:(25n*E18).toString(),friendId:'3412'},{tx:'0x2',item:'bounty',amount:(80n*E18).toString(),friendId:'3412'},{tx:'0x2',item:'bounty',amount:(80n*E18).toString(),friendId:'3412'},{tx:'0x3',item:'ash',amount:E18.toString(),friendId:null},{tx:'0x4',item:'ash',amount:(3n*E18).toString(),friendId:'7730'}]);
 assert.equal(ash.get('3412'),105n*E18,'duplicate receipts count once');assert.equal(ash.get('7730'),3n*E18);assert.equal(ash.size,2,'untagged burns belong to no Friend');
 assert.equal(B.rank(ash.get('3412')).rank.name,'FURNACE');
});
test('read-only chain helpers: block reads allowed, supply read, signing still forbidden',async()=>{
 const p={request:async()=>'0x'};await I.request(p,'eth_getBlockByNumber',['latest',false]);
 for(const m of ['eth_sign','personal_sign','eth_signTypedData_v4','eth_sendRawTransaction','eth_getBalance'])await assert.rejects(I.request(p,m,[]),/Forbidden/);
 const fetchImpl=async(u,o)=>({ok:true,status:200,json:async()=>({result:JSON.parse(o.body).method})});
 assert.equal(await I.rpc('eth_getBlockByNumber',['0x1',false],{fetchImpl}),'eth_getBlockByNumber');
 const q={request:async({method,params})=>{if(method==='eth_blockNumber')return '0x5';const sel=params[0].data.slice(2,10);return '0x'+w(sel==='313ce567'?18:sel==='18160ddd'?1000n*E18:sel==='70a08231'?28n*E18:0);}};
 assert.deepEqual(await I.rfSupply(q),{block:'0x5',decimals:18,total:1000n*E18,dead:28n*E18});
});
test('RF ECONOMY calculator is plain arithmetic on the stated assumptions',()=>{
 const X=require('../src/economy.js');
 assert.deepEqual(X.project({players:300,burnPct:3,avgBurn:15,bountyPct:1,avgBounty:5}),{items:4050,bounty:450,stakes:0,total:4500});
 assert.deepEqual(X.project({players:-5,burnPct:'x',avgBurn:15}),{items:0,bounty:0,stakes:0,total:0});
 assert.equal(X.project({players:10,burnPct:250,avgBurn:1,days:1}).total,10,'a share is capped at 100%');
 // Optional stake-round term: 30 days x 10 rounds x 6 entrants x 50 RF x 80% with a winner x 30% burned.
 const st=X.project({players:300,burnPct:3,avgBurn:15,bountyPct:1,avgBounty:5,stakeRounds:10,stakeEntrants:6,stakeWinPct:80});
 assert.equal(st.stakes,21600);assert.equal(st.total,4500+21600);
 assert.equal(X.project({stakeRounds:10,stakeEntrants:6,stakeWinPct:0}).stakes,0,'refunded rounds burn nothing');
});
