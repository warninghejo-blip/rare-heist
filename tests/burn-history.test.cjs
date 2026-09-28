// Player-specific restore and low-level LIVE BURN protections.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const I=require('../src/identity.js'),B=require('../src/burn.js');
const P='0x1111111111111111111111111111111111111111',Q='0x2222222222222222222222222222222222222222',E=10n**18n,w=I.word;

test('built index contains the current LIVE BURN sources',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 for(const name of ['identity','burn','ui'])assert.ok(html.includes(fs.readFileSync(path.join(__dirname,'..','src',name+'.js'),'utf8').trim()),name+' source must be rebuilt into index.html');
});

test('RESTORE finds an older tagged player burn after 200 unrelated dEaD transfers and splits RPC range errors',async()=>{
 const tx='0x'+w(1),logs=[{address:I.RF_TOKEN,transactionHash:tx,blockNumber:'0x1',logIndex:'0x0',topics:[I.TRANSFER,'0x'+w(P),'0x'+w(B.DEAD)],data:'0x'+w(10n*E)}],txs=new Map([[tx,{from:P,to:I.RF_TOKEN,input:B.calldata(10n*E,'lilac')}]]);
 for(let i=0;i<200;i++){
  const hash='0x'+w(i+2),block=BigInt(i+2);logs.push({address:I.RF_TOKEN,transactionHash:hash,blockNumber:'0x'+block.toString(16),logIndex:'0x0',topics:[I.TRANSFER,'0x'+w(Q),'0x'+w(B.DEAD)],data:'0x'+w(E)});
  txs.set(hash,{from:Q,to:I.RF_TOKEN,input:'0xa9059cbb'+w(B.DEAD)+w(E)});
 }
 let logQueries=0;const provider={request:async({method,params})=>{
  if(method==='eth_blockNumber')return '0xc9';
  if(method==='eth_getLogs'){
   const filter=params[0];logQueries++;
   assert.equal(filter.topics[0],I.TRANSFER);assert.equal(filter.topics[1],'0x'+w(P),'player must be indexed as Transfer topic1');assert.equal(filter.topics[2],'0x'+w(B.DEAD),'dEaD must be indexed as Transfer topic2');
   const from=BigInt(filter.fromBlock),to=BigInt(filter.toBlock);
   if(from===0n&&to===201n)throw Error('logs matched by query exceeds the limit of 10000');
   return logs.filter(g=>BigInt(g.blockNumber)>=from&&BigInt(g.blockNumber)<=to&&g.topics[1].toLowerCase()===filter.topics[1].toLowerCase()&&g.topics[2].toLowerCase()===filter.topics[2].toLowerCase());
  }
  if(method==='eth_getTransactionByHash')return txs.get(params[0])||null;
  throw Error('unexpected '+method);
 }};
 const result=await B.history(provider,{player:P});
 assert.ok(logQueries>1,'range error should trigger smaller block queries');
 assert.equal(result.burns.length,1);
 assert.equal(result.burns[0].tx,tx);
 assert.equal(result.burns[0].item,'lilac');
 assert.equal(result.burns[0].from,P);
 assert.equal(result.truncated,false);
});

test('direct Tribute rejects less than 1 RF before calling the wallet',async()=>{
 const calls=[],w=I.word,p={request:async({method,params})=>{
  calls.push(method);if(method==='eth_chainId')return '0x1237';
  if(method==='eth_call'){const selector=params[0].data.slice(2,10);return '0x'+w(selector==='313ce567'?18:100000n*E);}
  if(method==='eth_sendTransaction')return '0x'+w(99);
  if(method==='eth_getTransactionReceipt')return null;
  throw Error('unexpected '+method);
 }};
 let error;try{await B.burn(p,{account:P,item:'ash',amount:'0.000001',poll:0,timeout:0});}catch(e){error=e;}
 assert.equal(calls.filter(x=>x==='eth_sendTransaction').length,0,'subminimum Tribute must never be sent');
 assert.deepEqual(calls,[],'validation must happen before any wallet request');
 assert.match(error?.message||'',/at least 1 RF/);
});

test('player RESTORE keeps bounty receipts next to tributes and never treats them as unlocks',async()=>{
 const rows=[['0x'+w(1),'bounty',37n*E],['0x'+w(2),'trail',25n*E],['0x'+w(3),'ash',2n*E]];
 const logs=rows.map(([tx,,amount],i)=>({address:I.RF_TOKEN,transactionHash:tx,blockNumber:'0x'+(i+1).toString(16),logIndex:'0x0',topics:[I.TRANSFER,'0x'+w(P),'0x'+w(B.DEAD)],data:'0x'+w(amount)}));
 const txs=new Map(rows.map(([tx,item,amount])=>[tx,{from:P,to:I.RF_TOKEN,input:B.calldata(amount,item,'3412',1)}]));
 const provider={request:async({method,params})=>method==='eth_blockNumber'?'0x10':method==='eth_getLogs'?logs:method==='eth_getTransactionByHash'?txs.get(params[0]):null};
 const r=await B.history(provider,{player:P});
 assert.deepEqual(r.burns.map(b=>b.item).sort(),['ash','bounty','trail']);
 assert.deepEqual(B.unlocked(r.burns),['trail']);
 assert.equal(B.ashByFriend(r.burns).get('3412'),64n*E);
});
