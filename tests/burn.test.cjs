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
 assert.deepEqual(B.parseInput(d),{amount:25n*E18,tag:{item:'trail',friendId:'7730'}});
});
test('tags round-trip and reject foreign data',()=>{
 for(const it of B.ITEMS)assert.equal(B.readTag(B.tag(it.id,'3412')).item,it.id);
 assert.equal(B.readTag(B.tag('ash',null)).friendId,null);
 assert.equal(B.readTag('00'.repeat(32)),null);
 assert.equal(B.parseInput('0xa9059cbb'+w(P)+w(1)),null,'transfer to another address is not a burn');
 assert.equal(B.parseInput('0xa9059cbb'+w(B.DEAD)+w(5)).tag,null,'untagged burns are not Rare Heist purchases');
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
