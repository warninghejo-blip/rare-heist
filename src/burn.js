/* LIVE BURN (beta). Opt-in only; the game's default economy stays DEMO.
 * Real $RAREFRIENDS is burned by a plain ERC-20 transfer(0x…dEaD, amount) that the
 * player signs in their own wallet. Nothing is paid to anyone: no creator, developer or
 * prize share, no custody, no approvals. What a burn unlocks is cosmetic only.
 * A 32-byte tag appended to the calldata (ignored by the token) names the item and the
 * Friend, so purchases and the Hall of Ash can be rebuilt from the chain by anyone. */
(function(root,factory){const api=factory(root.HeistIdentity||(typeof require==='function'?require('./identity.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.HeistBurn=api;})(globalThis,function(I){
 'use strict';
 const DEAD='0x000000000000000000000000000000000000dead';
 const TRANSFER_SELECTOR='a9059cbb',MAGIC='52485354',VERSION='01'; // 'RHST' v1
 // Prices in whole RF. code = the byte stored in the calldata tag.
 const ITEMS=Object.freeze([
  Object.freeze({id:'trail',code:1,rf:25,kind:'trail',name:'GOLDEN TRAIL',text:'Your Friend leaves lime footprints on every floor. Pixels of the Friend itself never change.'}),
  Object.freeze({id:'lilac',code:2,rf:10,kind:'theme',name:'HATCHWORK',text:'Dense black-and-white paper texture around the interface.'}),
  Object.freeze({id:'citrus',code:3,rf:10,kind:'theme',name:'SIGNAL PAPER',text:'Sparse lime stipple around the interface.'}),
  Object.freeze({id:'archive-pack',code:4,rf:50,kind:'pack',name:'THE BLACK ARCHIVE',text:'Three extra heists. Harder, not stronger: no gear, no stat or score boost.'}),
  Object.freeze({id:'ash',code:9,rf:1,kind:'tribute',name:'TRIBUTE',text:'Burn any amount for your Friend\'s place in the Hall of Ash.',any:true})
 ]);
 const byId=id=>ITEMS.find(x=>x.id===id),byCode=c=>ITEMS.find(x=>x.code===c);
 const hex=(v,n=64)=>BigInt(v).toString(16).padStart(n,'0');
 function units(rf,dec){if(typeof rf!=='string'&&typeof rf!=='number')throw Error('Enter an RF amount');const s=String(rf).trim();if(dec<6)throw Error('Unsupported token decimals');if(!/^\d{1,12}(\.\d{1,6})?$/.test(s))throw Error('Enter an RF amount like 5 or 2.5');const [w,f='']=s.split('.');const v=BigInt(w)*10n**BigInt(dec)+BigInt((f+'000000').slice(0,6))*10n**BigInt(dec-6);if(v<=0n)throw Error('Amount must be above zero');return v;}
 function tag(item,friendId){const it=typeof item==='string'?byId(item):item;if(!it)throw Error('Unknown item');let f=0n;try{f=friendId==null?0n:I.token(friendId);}catch{f=0n;}if(f>=(1n<<192n))f=0n;return MAGIC+VERSION+hex(it.code,2)+'0000'+hex(f,48);}
 function readTag(t){if(typeof t!=='string'||!/^[0-9a-f]{64}$/i.test(t))return null;t=t.toLowerCase();if(t.slice(0,8)!==MAGIC||t.slice(8,10)!==VERSION)return null;const it=byCode(parseInt(t.slice(10,12),16));if(!it)return null;const f=BigInt('0x'+t.slice(16));return {item:it.id,friendId:f?f.toString():null};}
 // transfer(DEAD, amount) + tag. Standard ABI decoders ignore trailing calldata.
 function calldata(amount,item,friendId){if(typeof amount!=='bigint'||amount<=0n)throw Error('Invalid amount');return '0x'+TRANSFER_SELECTOR+hex(DEAD)+hex(amount)+tag(item,friendId);}
 function parseInput(input){if(typeof input!=='string')return null;const d=input.toLowerCase().replace(/^0x/,'');if(d.length<8+128||d.slice(0,8)!==TRANSFER_SELECTOR)return null;if('0x'+d.slice(8+24,8+64)!==DEAD)return null;return {amount:BigInt('0x'+d.slice(72,136)),tag:d.length>=200?readTag(d.slice(136,200)):null};}
 function price(item,dec){const it=typeof item==='string'?byId(item):item;return BigInt(it.rf)*10n**BigInt(dec);}
 // A receipt proves the burn only if the RF contract logged Transfer(player → dEaD, ≥ amount).
 function checkReceipt(r,{from,min=0n}){
  if(!r||typeof r!=='object')throw Error('No receipt yet');
  if(BigInt(r.status??0)!==1n)throw Error('The burn transaction failed on chain. No RF was burned.');
  const player=I.address(from);let burned=0n;
  for(const g of r.logs||[]){if(!g||g.removed||String(g.address).toLowerCase()!==I.RF_TOKEN.toLowerCase()||!Array.isArray(g.topics)||g.topics.length!==3)continue;
   if(String(g.topics[0]).toLowerCase()!==I.TRANSFER)continue;if(('0x'+String(g.topics[1]).slice(-40)).toLowerCase()!==player||('0x'+String(g.topics[2]).slice(-40)).toLowerCase()!==DEAD)continue;
   burned+=BigInt(g.data&&g.data!=='0x'?g.data:0);}
  if(burned<=0n||burned<min)throw Error('The receipt does not show the RF burn');
  return {tx:String(r.transactionHash).toLowerCase(),block:String(r.blockNumber),amount:burned};
 }
 async function decimals(call){return Number(I.words(await call(I.RF_TOKEN,I.SELECTORS.decimals,[]),1)[0]);}
 function caller(req){return async(to,sel,args)=>req('eth_call',[{to,data:'0x'+sel+args.map(I.word).join('')},'latest']);}
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 // Sends one burn from the connected account and waits for its receipt.
 async function burn(p,{account,item,amount,friendId,onSent,poll=1500,timeout=180000}){
  const it=byId(item);if(!it)throw Error('Unknown item');
  // Tribute has a one-RF floor. Reject it before any wallet method can prompt.
  if(it.any&&units(amount,18)<10n**18n)throw Error('Tribute must be at least 1 RF');
  const from=I.address(account);
  await I.ensureChain(p);const req=(m,a,t)=>I.request(p,m,a,t),call=caller(req),dec=await decimals(call);
  const value=it.any?units(amount,dec):price(it,dec);
  const bal=I.words(await call(I.RF_TOKEN,I.SELECTORS.balance,[BigInt(from)]),1)[0];
  if(bal<value)throw Error('Not enough RF in this wallet: '+I.formatRF(bal,dec)+' RF available.');
  const tx=await req('eth_sendTransaction',[{from,to:I.RF_TOKEN,value:'0x0',data:calldata(value,it,friendId)}],300000);
  if(typeof tx!=='string'||!/^0x[0-9a-f]{64}$/i.test(tx))throw Error('The wallet did not return a transaction hash');
  onSent?.(tx,{tx,from,item:it.id,amount:value.toString(),friendId:friendId==null?null:String(friendId),decimals:dec});
  for(const end=Date.now()+timeout;Date.now()<end;await wait(poll)){
   const r=await req('eth_getTransactionReceipt',[tx]).catch(()=>null);
   if(r){try{if(String(r.transactionHash||'').toLowerCase()!==tx.toLowerCase())throw Error('Receipt hash did not match the pending transaction');return {...checkReceipt(r,{from,min:value}),item:it.id,friendId:friendId==null?null:String(friendId),decimals:dec};}catch(e){e.tx=tx;throw e;}}
  }
  const e=Error('Sent, but not confirmed yet. It will appear after RESTORE FROM CHAIN.');e.tx=tx;throw e;
 }
 // Every tagged Rare Heist burn: from one player, or (player=null) from everyone.
 async function history(p,{player=null,limit=200}={}){
  const req=(m,a,t)=>I.request(p,m,a,t),at=await req('eth_blockNumber');
  const owner=player?I.address(player):null,topics=[I.TRANSFER,owner?'0x'+hex(BigInt(owner)):null,'0x'+hex(BigInt(DEAD))];
  const logs=await I.getLogs(p,{address:I.RF_TOKEN,fromBlock:'0x0',toBlock:at,topics});
  const byTx=new Map();for(const g of logs||[]){if(!g||g.removed||typeof g.transactionHash!=='string'||!Array.isArray(g.topics)||g.topics.length!==3||String(g.topics[0]).toLowerCase()!==I.TRANSFER||('0x'+String(g.topics[2]).slice(-40)).toLowerCase()!==DEAD)continue;const k=g.transactionHash.toLowerCase(),from=('0x'+String(g.topics[1]).slice(-40)).toLowerCase();if(owner&&from!==owner)continue;const o=byTx.get(k)||{tx:k,block:g.blockNumber,from,amount:0n};o.amount+=BigInt(g.data&&g.data!=='0x'?g.data:0);byTx.set(k,o);}
  const cap=Math.max(1,Math.min(5000,Math.floor(Number(limit))||200)),list=[...byTx.values()].sort((a,b)=>BigInt(a.block)>BigInt(b.block)?-1:BigInt(a.block)<BigInt(b.block)?1:0),candidates=owner?list:list.slice(0,cap),out=[];let truncated=!owner&&list.length>cap;
  // Player restore limits only after applying topic1=player and validating tags.
  // The global Hall intentionally scans a marked latest-N window of transfers.
  for(const o of candidates){const t=await req('eth_getTransactionByHash',[o.tx]).catch(()=>null);const d=t&&String(t.to).toLowerCase()===I.RF_TOKEN.toLowerCase()?parseInput(t.input):null;if(!d?.tag||String(t.from).toLowerCase()!==o.from)continue;if(out.length===cap){truncated=true;break;}out.push({...o,item:d.tag.item,friendId:d.tag.friendId});}
  return {block:at,burns:out,scanned:byTx.size,truncated};
 }
 // Unlocked items: a tagged burn of at least the item's price.
 function unlocked(burns,dec=18){const set=new Set();for(const b of burns||[]){const it=byId(b.item);if(it&&!it.any&&BigInt(b.amount)>=price(it,dec))set.add(it.id);}return [...set];}
 function hall(burns){const m=new Map();let total=0n;for(const b of burns||[]){const k=b.friendId?'#'+b.friendId:b.from;const o=m.get(k)||{who:k,from:b.from,friendId:b.friendId,amount:0n,count:0};o.amount+=BigInt(b.amount);o.count++;total+=BigInt(b.amount);m.set(k,o);}return {total,rows:[...m.values()].sort((a,b)=>b.amount>a.amount?1:b.amount<a.amount?-1:0)};}
 async function deadBalance(p){const call=caller((m,a,t)=>I.request(p,m,a,t)),dec=await decimals(call);return {decimals:dec,amount:I.words(await call(I.RF_TOKEN,I.SELECTORS.balance,[BigInt(DEAD)]),1)[0]};}
 return Object.freeze({DEAD,ITEMS,byId,units,tag,readTag,calldata,parseInput,price,checkReceipt,burn,history,unlocked,hall,deadBalance});
});
