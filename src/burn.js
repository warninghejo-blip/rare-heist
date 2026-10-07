/* LIVE BURN (beta). Opt-in only; the game's default economy stays DEMO.
 * Real $RAREFRIENDS is burned by a plain ERC-20 transfer(0x…dEaD, amount) that the
 * player signs in their own wallet. Nothing is paid to anyone: no creator, developer or
 * prize share, no custody, no approvals. What a burn unlocks is cosmetic only.
 * A 32-byte tag appended to the calldata (ignored by the token) names the item and the
 * Friend, so purchases and the burn ledger can be rebuilt from the chain by anyone. */
(function(root,factory){const api=factory(root.HeistIdentity||(typeof require==='function'?require('./identity.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.HeistBurn=api;})(globalThis,function(I){
 'use strict';
 const DEAD='0x000000000000000000000000000000000000dead';
 const TRANSFER_SELECTOR='a9059cbb',MAGIC='52485354',VERSION='01'; // 'RHST' v1
 // Public RPC eth_blockNumber, 2026-10-07T01:59:51.942Z. Earlier paid unlocks keep their price.
 const PRICE_CUTOFF=82106237;
 const prices=(old,rf)=>Object.freeze([Object.freeze({fromBlock:0,rf:old}),Object.freeze({fromBlock:PRICE_CUTOFF,rf})]);
 // Prices in whole RF. code = the byte stored in the calldata tag.
 const ITEMS=Object.freeze([
  Object.freeze({id:'trail',code:1,rf:500,prices:prices(25,500),kind:'trail',name:'GOLDEN TRAIL',text:'Your Friend leaves lime footprints on every floor. Pixels of the Friend itself never change.'}),
  Object.freeze({id:'lilac',code:2,rf:250,prices:prices(10,250),kind:'theme',name:'HATCHWORK',text:'Dense black-and-white paper texture around the interface.'}),
  Object.freeze({id:'citrus',code:3,rf:250,prices:prices(10,250),kind:'theme',name:'SIGNAL PAPER',text:'Sparse lime stipple around the interface.'}),
  Object.freeze({id:'archive-pack',code:4,rf:2500,prices:prices(50,2500),kind:'pack',name:'THE BLACK ARCHIVE',text:'Three extra heists. Harder, not stronger: no gear, no stat or score boost.'})
 ]);
 // Retired any-amount items. No longer sold, but their tag codes still decode, so any past burn with code 9 or 10
 // still shows in history, RESTORE and a pending lock exactly as before. Codes are never reused.
 const RETIRED=Object.freeze([
  Object.freeze({id:'ash',code:9,rf:1,kind:'tribute',name:'TRIBUTE',text:'Retired. No longer sold.',any:true,retired:true}),
  Object.freeze({id:'bounty',code:10,rf:1,kind:'bounty',name:'VAULT BOUNTY',text:'Retired. No longer sold.',any:true,retired:true})
 ]);
 const KNOWN=Object.freeze([...ITEMS,...RETIRED]);
 const byId=id=>KNOWN.find(x=>x.id===id),byCode=c=>KNOWN.find(x=>x.code===c),forSale=id=>ITEMS.find(x=>x.id===id);
 const hex=(v,n=64)=>BigInt(v).toString(16).padStart(n,'0');
 function units(rf,dec){if(typeof rf!=='string'&&typeof rf!=='number')throw Error('Enter an RF amount');const s=String(rf).trim();if(dec<6)throw Error('Unsupported token decimals');if(!/^\d{1,12}(\.\d{1,6})?$/.test(s))throw Error('Enter an RF amount like 5 or 2.5');const [w,f='']=s.split('.');const v=BigInt(w)*10n**BigInt(dec)+BigInt((f+'000000').slice(0,6))*10n**BigInt(dec-6);if(v<=0n)throw Error('Amount must be above zero');return v;}
 function newNonce(){const values=new Uint16Array(1);for(let i=0;i<8;i++){globalThis.crypto.getRandomValues(values);if(values[0])return values[0];}throw Error('Could not create a burn attempt nonce');}
 function tag(item,friendId,nonce=0){const it=typeof item==='string'?byId(item):item;if(!it)throw Error('Unknown item');if(!Number.isInteger(nonce)||nonce<0||nonce>65535)throw Error('Invalid burn attempt nonce');let f=0n;try{f=friendId==null?0n:I.token(friendId);}catch{f=0n;}if(f>=(1n<<192n))f=0n;return MAGIC+VERSION+hex(it.code,2)+hex(nonce,4)+hex(f,48);}
 function readTag(t){if(typeof t!=='string'||!/^[0-9a-f]{64}$/i.test(t))return null;t=t.toLowerCase();if(t.slice(0,8)!==MAGIC||t.slice(8,10)!==VERSION)return null;const it=byCode(parseInt(t.slice(10,12),16));if(!it)return null;const f=BigInt('0x'+t.slice(16));return {item:it.id,friendId:f?f.toString():null,nonce:parseInt(t.slice(12,16),16)};}
 // transfer(DEAD, amount) + tag. Standard ABI decoders ignore trailing calldata.
 function calldata(amount,item,friendId,nonce=0){if(typeof amount!=='bigint'||amount<=0n)throw Error('Invalid amount');return '0x'+TRANSFER_SELECTOR+hex(DEAD)+hex(amount)+tag(item,friendId,nonce);}
 function parseInput(input){if(typeof input!=='string')return null;const d=input.toLowerCase().replace(/^0x/,'');if(d.length<8+128||d.slice(0,8)!==TRANSFER_SELECTOR)return null;if('0x'+d.slice(8+24,8+64)!==DEAD)return null;return {amount:BigInt('0x'+d.slice(72,136)),tag:d.length>=200?readTag(d.slice(136,200)):null};}
 function price(item,dec){const it=typeof item==='string'?byId(item):item;return BigInt(it.rf)*10n**BigInt(dec);}
 // A burn counts at the price in force at its block; with no usable block, only the current price counts.
 // New transfers always use price(), which is the current advertised price.
 function priceAt(item,dec,block){const it=typeof item==='string'?byId(item):item;if(!it.prices)return price(it,dec);
  let at=null;try{at=BigInt(block);}catch{}if(at===null||at<0n)return price(it,dec);let rf=it.prices[0].rf;for(const p of it.prices)if(at>=BigInt(p.fromBlock))rf=p.rf;
  return BigInt(rf)*10n**BigInt(dec);
 }
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
 async function burn(p,{account,item,amount,friendId,nonce=null,onSent,onWalletRequest,poll=1500,timeout=180000}){
  // Only items on sale can be burned. Retired items are refused before any wallet method can prompt.
  const it=forSale(item);if(!it)throw Error(byId(item)?'This item is no longer sold':'Unknown item');
  const from=I.address(account);
  await I.ensureChain(p);const req=(m,a,t)=>I.request(p,m,a,t),call=caller(req),dec=await decimals(call);
  // Every item on sale has a fixed price; an amount passed by the caller is never used for the transfer.
  const value=price(it,dec);
  const bal=I.words(await call(I.RF_TOKEN,I.SELECTORS.balance,[BigInt(from)]),1)[0];
  if(bal<value)throw Error('Not enough RF in this wallet: '+I.formatRF(bal,dec)+' RF available.');
  // A missing or malformed head must never be used to attribute an older burn to this request.
  let sentBlock=null;try{const head=await req('eth_blockNumber');if(typeof head==='string'&&/^0x[0-9a-f]+$/i.test(head))sentBlock=head.toLowerCase();}catch{}
  const attemptNonce=nonce==null?newNonce():nonce;if(!Number.isInteger(attemptNonce)||attemptNonce<1||attemptNonce>65535)throw Error('Invalid burn attempt nonce');
  onWalletRequest?.({from,item:it.id,amount:value.toString(),friendId:friendId==null?null:String(friendId),decimals:dec,sentBlock,nonce:attemptNonce});
  const tx=await req('eth_sendTransaction',[{from,to:I.RF_TOKEN,value:'0x0',data:calldata(value,it,friendId,attemptNonce)}],300000);
  if(typeof tx!=='string'||!/^0x[0-9a-f]{64}$/i.test(tx))throw Error('The wallet did not return a transaction hash');
  onSent?.(tx,{tx,from,item:it.id,amount:value.toString(),friendId:friendId==null?null:String(friendId),decimals:dec,sentBlock,nonce:attemptNonce});
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
  const cap=Math.max(1,Math.min(5000,Math.floor(Number(limit))||200)),list=[...byTx.values()].sort((a,b)=>BigInt(a.block)>BigInt(b.block)?-1:BigInt(a.block)<BigInt(b.block)?1:0),candidates=owner?list:list.slice(0,cap),out=[],purchases=new Set();let truncated=!owner&&list.length>cap,playerTributes=0;
  // Player restore keeps every paid cosmetic unlock, while bounding only retired any-amount (Tribute, Bounty) receipts.
  // The global ledger intentionally scans a marked latest-N window of transfers.
  for(const o of candidates){const t=await req('eth_getTransactionByHash',[o.tx]).catch(()=>null);const d=t&&String(t.to).toLowerCase()===I.RF_TOKEN.toLowerCase()?parseInput(t.input):null;if(!d?.tag||String(t.from).toLowerCase()!==o.from)continue;const row={...o,item:d.tag.item,friendId:d.tag.friendId};if(owner){const it=byId(row.item);if(it?.any){if(playerTributes<cap){out.push(row);playerTributes++;}else truncated=true;continue;}if(it&&BigInt(row.amount)>=priceAt(it,18,row.block)&&!purchases.has(it.id)){purchases.add(it.id);out.push(row);}continue;}if(out.length===cap){truncated=true;break;}out.push(row);}
  return {block:at,burns:out,scanned:byTx.size,truncated};
 }
 // Unlocked items: a tagged burn meeting the price at its block, including legacy purchases.
 function unlocked(burns,dec=18){const set=new Set();for(const b of burns||[]){const it=byId(b.item);if(it&&!it.any&&BigInt(b.amount)>=priceAt(it,dec,b.block||b.blockNumber||b.receipt?.blockNumber))set.add(it.id);}return [...set];}
 // BURN LEDGER: every tagged Rare Heist burn once (by tx), newest block first, and their total. Display only.
 function ledger(burns){const seen=new Set(),rows=[];let total=0n;for(const b of burns||[]){const k=String(b?.tx||'').toLowerCase();if(!b||!k||seen.has(k))continue;seen.add(k);rows.push(b);total+=BigInt(b.amount);}
  const at=b=>{try{return BigInt(b.block);}catch{return -1n;}};rows.sort((a,b)=>at(b)>at(a)?1:at(b)<at(a)?-1:0);return {total,rows};}
 async function deadBalance(p){const call=caller((m,a,t)=>I.request(p,m,a,t)),dec=await decimals(call);return {decimals:dec,amount:I.words(await call(I.RF_TOKEN,I.SELECTORS.balance,[BigInt(DEAD)]),1)[0]};}
 return Object.freeze({DEAD,PRICE_CUTOFF,ITEMS,RETIRED,byId,forSale,units,newNonce,tag,readTag,calldata,parseInput,price,priceAt,checkReceipt,burn,history,unlocked,ledger,deadBalance});
});
