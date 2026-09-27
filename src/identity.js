/* Play as your own Rare Friend. Read-only chain access through an injected wallet
 * (EIP-6963 / window.ethereum) or, for PREVIEW, the public Robinhood Chain RPC.
 * Manifest/ABI from FriendSDK v0.1.2, pinned commit 762d6f5.
 * Wallet requests are limited to account access, a network switch/add prompt and
 * reads. The one exception is the opt-in LIVE BURN (src/burn.js): a plain RF
 * transfer to 0x…dEaD that the player confirms in their wallet. No message
 * signatures, approvals or custody. A browser check is not server-authenticated
 * identity; never use it as financial authorization. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HeistIdentity=api;})(globalThis,function(){
 'use strict';
 const MANIFEST=Object.freeze({chainId:4663,chainHex:'0x1237',rpcUrl:'https://rpc.mainnet.chain.robinhood.com',generations:'0x14C49e6118F46525dE9ab41a51cBAA3c6EBF181D',registry:'0x246E3E9730A7Eade94c79be0Fd78d210f89AEb8D'});
 // Offered only if the wallet does not know the network yet (wallet_addEthereumChain).
 const CHAIN_PARAMS=Object.freeze({chainId:MANIFEST.chainHex,chainName:'Robinhood Chain',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},rpcUrls:[MANIFEST.rpcUrl]});
 const FAMILIES=['Skeleton','Mask','Family','Cellular','Asymmetry','Hoverer','Colossus','Sparkling','Hollow'];
 const SELECTORS=Object.freeze({owner:'6352211e',generation:'7d71dc35',family:'32bd63d1',seed:'82829f74',frames:'ead2ca3c',balance:'70a08231',tba:'0be76ed6',decimals:'313ce567'});
 // $RAREFRIENDS (RF) ERC-20 on Robinhood Chain, from the FriendSDK Fishing deployment.
 const RF_TOKEN='0x0779369854d3EcdEA927206718FFD7730C67B71f';
 const TRANSFER='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
 const MAX_OWNED=24;
 function token(s){if(!/^[1-9][0-9]{0,77}$/.test(String(s).trim()))throw Error('Enter a positive token ID');const n=BigInt(String(s).trim());if(n>=(1n<<256n))throw Error('Token ID exceeds uint256');return n;}
 function word(v){return BigInt(v).toString(16).padStart(64,'0');}
 function words(s,count){if(typeof s!=='string'||!new RegExp('^0x[0-9a-fA-F]{'+(64*count)+'}$').test(s))throw Error('Invalid chain response');return Array.from({length:count},(_,i)=>BigInt('0x'+s.slice(2+64*i,66+64*i)));}
 function address(s){if(typeof s!=='string'||!/^0x[\da-f]{40}$/i.test(s))throw Error('Invalid wallet account');return s.toLowerCase();}
 const short=a=>a?a.slice(0,6)+'…'+a.slice(-4):'';
 const WALLET_METHODS=['eth_chainId','eth_blockNumber','eth_accounts','eth_requestAccounts','eth_call','eth_getLogs','wallet_switchEthereumChain','wallet_addEthereumChain','eth_sendTransaction','eth_getTransactionReceipt','eth_getTransactionByHash'];
 async function request(p,method,params,timeout=15000){
  if(!p||typeof p.request!=='function')throw Error('No browser wallet found. Install one, or play as a guest.');
  if(!WALLET_METHODS.includes(method))throw Error('Forbidden wallet action');
  let timer;try{return await Promise.race([Promise.resolve().then(()=>p.request({method,...(params?{params}:{})})),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('The wallet did not answer in time. Retry.')),timeout);})]);}finally{clearTimeout(timer);}
 }
 // Public RPC for reads without a wallet (PREVIEW, VIEW HOLDER, Hall of Ash). Never ownership claims.
 async function rpc(method,params,{fetchImpl=globalThis.fetch,timeout=15000,retries=2}={}){
  if(!['eth_call','eth_blockNumber','eth_chainId','eth_getLogs','eth_getTransactionReceipt','eth_getTransactionByHash'].includes(method))throw Error('Forbidden RPC method');
  const ctl=typeof AbortController==='function'?new AbortController():null,timer=setTimeout(()=>ctl?.abort(),timeout);
  try{const r=await fetchImpl(MANIFEST.rpcUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:ctl?.signal});
   // The public RPC rate-limits bursts (429 seen after ~250 calls/min); one 429 must not abort a 65-call discovery.
   if(r.status===429&&retries>0){clearTimeout(timer);await new Promise(f=>setTimeout(f,(3-retries)*1500));return await rpc(method,params,{fetchImpl,timeout,retries:retries-1});}
   if(!r.ok)throw Error('Robinhood Chain RPC answered '+r.status);const j=await r.json();if(j.error)throw Error(j.error.message||'RPC error');return j.result;}
  catch(e){throw Error(e.name==='AbortError'?'Robinhood Chain RPC timed out. Retry.':e.message||'Could not reach Robinhood Chain RPC');}
  finally{clearTimeout(timer);}
 }
 // EIP-6963 multi-wallet discovery, with the legacy window.ethereum as a fallback.
 function providers(win=globalThis,wait=350){
  return new Promise(resolve=>{
   const found=new Map(),add=d=>{if(d?.provider?.request&&d.info?.uuid&&!found.has(d.info.uuid))found.set(d.info.uuid,{name:String(d.info.name||'Wallet').slice(0,40),rdns:String(d.info.rdns||''),provider:d.provider});};
   const on=e=>add(e.detail);
   if(win.addEventListener){win.addEventListener('eip6963:announceProvider',on);win.dispatchEvent?.(new Event('eip6963:requestProvider'));}
   setTimeout(()=>{win.removeEventListener?.('eip6963:announceProvider',on);const list=[...found.values()];
    if(!list.length&&win.ethereum?.request)list.push({name:win.ethereum.isMetaMask?'MetaMask':'Browser wallet',rdns:'injected',provider:win.ethereum});resolve(list);},wait);
  });
 }
 async function ensureChain(p){
  if(BigInt(await request(p,'eth_chainId'))===BigInt(MANIFEST.chainId))return;
  try{await request(p,'wallet_switchEthereumChain',[{chainId:MANIFEST.chainHex}],60000);}
  catch(e){if(e?.code===4902||/unrecognized|not added|unknown chain/i.test(e?.message||''))await request(p,'wallet_addEthereumChain',[CHAIN_PARAMS],60000);else throw Error('Switch your wallet to Robinhood Chain (4663) to find your Friends.');}
  if(BigInt(await request(p,'eth_chainId'))!==BigInt(MANIFEST.chainId))throw Error('Your wallet is not on Robinhood Chain (4663) yet.');
 }
 async function connect(p){
  const accounts=await request(p,'eth_requestAccounts',undefined,120000);
  if(!Array.isArray(accounts)||!accounts.length)throw Error('No account was shared by the wallet');
  await ensureChain(p);
  return address(accounts[0]);
 }
 function sample(tokenId,family,seed,frames,extra={}){
  token(tokenId);if(!Number.isInteger(family)||family<0||family>8||!Number.isInteger(seed)||seed<0||seed>0xffffffff||frames.length!==64)throw Error('Invalid character data');
  if(frames.every(f=>BigInt(f)===0n))throw Error('This Friend has no walking frames on chain');
  const clips={};for(const [j,f]of ['down','up','left','right'].entries())for(const [i,a]of ['idle','walk'].entries())clips[a+'-'+f]=Array.from({length:8},(_,n)=>i*32+j*8+n);
  return {tokenId:String(tokenId),familyId:family,family:FAMILIES[family],familyName:FAMILIES[family],seed,frames:frames.map(b=>'0x'+BigInt(b).toString(16)),clips,...extra};
 }
 // Reads the canonical walking frames for one token: familyOf, seedOf, frames(family, seed).
 async function artwork(call,n){
  const [fa,se]=await Promise.all([call(MANIFEST.registry,SELECTORS.family,[n]),call(MANIFEST.registry,SELECTORS.seed,[n])]);
  const family=Number(words(fa,1)[0]),seed=Number(words(se,1)[0]);
  if(!Number.isInteger(family)||family<0||family>8||!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('Invalid family or seed');
  return {family,seed,frames:words(await call(MANIFEST.registry,SELECTORS.frames,[family,seed]),64)};
 }
 function walletCall(p,block){return (to,selector,args)=>request(p,'eth_call',[{to,data:'0x'+selector+args.map(word).join('')},block]);}
 async function ownership(call,n){
  const [ow,ge]=await Promise.all([call(MANIFEST.generations,SELECTORS.owner,[n]),call(MANIFEST.generations,SELECTORS.generation,[n])]);
  const ownerWord=words(ow,1)[0];if(ownerWord>=(1n<<160n))throw Error('Invalid owner response');
  return {owner:'0x'+ownerWord.toString(16).padStart(40,'0'),generation:Number(words(ge,1)[0])};
 }
 async function block(p){const b=await request(p,'eth_blockNumber');if(typeof b!=='string'||!/^0x[0-9a-f]+$/i.test(b))throw Error('Invalid block');return b;}
 // Split large eth_getLogs requests by block range when an RPC rejects them or
 // silently caps a response at 10,000 logs. Ranges are disjoint and read oldest first.
 async function getLogs(p,filter){
  const from=BigInt(filter.fromBlock??'0x0'),to=BigInt(filter.toBlock??await request(p,'eth_blockNumber'));
  if(from>to)return [];
  const out=[];
  async function readRange(first,last){
   let logs;
   try{logs=await request(p,'eth_getLogs',[{...filter,fromBlock:'0x'+first.toString(16),toBlock:'0x'+last.toString(16)}],45000);}
   catch(e){
    const msg=String(e?.message||e);
    if(first===last||!/exceeds?\s+(?:the\s+)?limit|more than\s+\d+|too many results|response size|block range|range too (?:wide|large)|query returned|limit of\s+\d+/i.test(msg))throw e;
    const mid=(first+last)>>1n;await readRange(first,mid);await readRange(mid+1n,last);return;
   }
   if(!Array.isArray(logs))throw Error('Invalid eth_getLogs response');
   // Some RPCs return the first 10,000 without an error. Split at that boundary too.
   if(logs.length>=10000&&first<last){const mid=(first+last)>>1n;await readRange(first,mid);await readRange(mid+1n,last);return;}
   out.push(...logs);
  }
  await readRange(from,to);return out;
 }
 // One token, checked against the connected account (manual ID entry and re-checks).
 async function read(p,id,{connect:ask=false,...opts}={}){
  const n=token(id);let player;
  if(ask)player=await connect(p);else{const accounts=await request(p,'eth_accounts');if(!Array.isArray(accounts)||!accounts.length)throw Error('Connect a browser wallet first');player=address(accounts[0]);await ensureChain(p);}
  // Account and chain come from the wallet; reads fall back to the canonical public RPC (see discover).
  let at,call,own;try{at=await block(p);call=walletCall(p,at);own=await ownership(call,n);}
  catch{const q=rpcProvider(opts);at=await block(q);call=walletCall(q,at);own=await ownership(call,n);}
  const {owner,generation}=own;
  if(owner!==player)throw Error('This wallet does not own Friend #'+n);
  if(!Number.isInteger(generation)||generation<1)throw Error('Friend #'+n+' is not hardwired (generation 1 or higher required)');
  const art=await artwork(call,n);
  const finalAccounts=await request(p,'eth_accounts');if(!finalAccounts?.length||address(finalAccounts[0])!==player||BigInt(await request(p,'eth_chainId'))!==BigInt(MANIFEST.chainId))throw Error('Wallet changed during verification');
  return {sample:sample(n,art.family,art.seed,art.frames,{generation}),owner,generation,block:at,checkedAt:Date.now(),mode:'owned-local'};
 }
 // All hardwired Friends held by the account: balanceOf, then owner-filtered Transfer
 // history (Generations has no ERC721Enumerable), then a fresh ownerOf/generation check.
 // Wallet RPCs differ: some reject owner-filtered eth_getLogs from block 0 (drpc free plan: 10k-block
 // cap; publicnode: archive token) or eth_call at a pinned block (drpc: "Unknown state"). The account
 // still comes from the wallet; on any wallet read failure the same discovery re-runs read-only through
 // the canonical Robinhood Chain RPC. If that fails too, the wallet's original error is reported.
 async function discover(p,player,opts={}){
  player=address(player);
  try{return await discoverVia(p,player);}
  catch(e){if(p?.publicRpc)throw e;
   try{if(BigInt(await rpc('eth_chainId',[],opts))!==BigInt(MANIFEST.chainId))throw e;return {...await discoverVia(rpcProvider(opts),player),via:'public-rpc'};}catch{throw e;}}
 }
 async function discoverVia(p,player){
  const at=await block(p),call=walletCall(p,at);
  const balance=words(await call(MANIFEST.generations,SELECTORS.balance,[BigInt(player)]),1)[0];
  if(balance===0n)return {friends:[],block:at,balance:0,hidden:0};
  const topic='0x'+word(BigInt(player)),q=topics=>request(p,'eth_getLogs',[{address:MANIFEST.generations,fromBlock:'0x0',toBlock:at,topics}],45000);
  let logs;try{const [inbound,outbound]=await Promise.all([q([TRANSFER,null,topic]),q([TRANSFER,topic])]);logs=[...inbound,...outbound];}
  catch{const e=Error('Your wallet could not list transfer history. Enter your Friend ID instead.');e.code='NO_HISTORY';throw e;}
  const seen=new Map();for(const g of logs){if(!g||!Array.isArray(g.topics)||g.topics.length<4||g.removed)continue;seen.set(g.blockNumber+':'+g.logIndex,g);}
  const ordered=[...seen.values()].sort((a,b)=>BigInt(a.blockNumber)===BigInt(b.blockNumber)?Number(BigInt(a.logIndex)-BigInt(b.logIndex)):BigInt(a.blockNumber)<BigInt(b.blockNumber)?-1:1);
  const held=new Set();for(const g of ordered){const to=('0x'+g.topics[2].slice(-40)).toLowerCase(),id=BigInt(g.topics[3]);if(to===player)held.add(id);else held.delete(id);}
  if(BigInt(held.size)!==balance){const e=Error('Transfer history looked incomplete. Enter your Friend ID instead.');e.code='NO_HISTORY';throw e;}
  const ids=[...held].sort((a,b)=>a<b?-1:a>b?1:0).slice(0,MAX_OWNED),friends=[];let hidden=0;
  for(const n of ids){const {owner,generation}=await ownership(call,n);if(owner!==player)continue;if(generation<1){hidden++;continue;}
   const art=await artwork(call,n);friends.push(sample(n,art.family,art.seed,art.frames,{generation,owner}));}
  return {friends,block:at,balance:Number(balance),hidden,truncated:held.size>MAX_OWNED};
 }
 // PREVIEW: any Friend's canonical artwork by ID. No wallet, no ownership, solo only.
 async function preview(id,opts={}){
  const n=token(id),at=await rpc('eth_blockNumber',[],opts);
  if(BigInt(await rpc('eth_chainId',[],opts))!==BigInt(MANIFEST.chainId))throw Error('Unexpected chain from RPC');
  const call=(to,selector,args)=>rpc('eth_call',[{to,data:'0x'+selector+args.map(word).join('')},at],opts);
  const art=await artwork(call,n);
  return {sample:sample(n,art.family,art.seed,art.frames,{preview:true}),block:at,checkedAt:Date.now(),mode:'preview'};
 }
 // VIEW ADDRESS: list any holder's Friends read-only through the public RPC (no wallet).
 // Same discovery as a connected wallet; results are PREVIEW, never ownership.
 function rpcProvider(opts={}){return {publicRpc:true,request:({method,params})=>method==='eth_accounts'?[]:rpc(method,params,opts)};}
 async function inspect(addr,opts={}){const p=rpcProvider(opts);if(BigInt(await rpc('eth_chainId',[],opts))!==BigInt(MANIFEST.chainId))throw Error('Unexpected chain from RPC');const r=await discover(p,address(String(addr).trim()),opts);r.friends=r.friends.map(f=>({...f,preview:true}));return r;}
 // Real RF balances, read-only: the connected account and the Friend's canonical wallet
 // (Generations.tokenBoundAccount), where FriendSDK games deliver items and rewards.
 async function rfBalances(p,{account=null,tokenId=null}={}){
  const at=await block(p),call=walletCall(p,at),dec=Number(words(await call(RF_TOKEN,SELECTORS.decimals,[]),1)[0]);
  const out={block:at,decimals:dec,token:RF_TOKEN};
  if(account){out.account=address(account);out.accountRF=words(await call(RF_TOKEN,SELECTORS.balance,[BigInt(out.account)]),1)[0];}
  if(tokenId!=null){const n=token(tokenId),w=words(await call(MANIFEST.generations,SELECTORS.tba,[n]),1)[0];out.friendWallet='0x'+w.toString(16).padStart(40,'0');out.friendRF=words(await call(RF_TOKEN,SELECTORS.balance,[w]),1)[0];}
  return out;
 }
 function formatRF(v,dec=18){const d=10n**BigInt(dec),whole=v/d,frac=(v%d)*100n/d;return whole.toLocaleString('en-US')+'.'+String(frac).padStart(2,'0');}
 return Object.freeze({MANIFEST,RF_TOKEN,rfBalances,formatRF,rpcProvider,inspect,CHAIN_PARAMS,FAMILIES,SELECTORS,TRANSFER,token,word,words,address,short,request,rpc,providers,ensureChain,connect,sample,read,discover,preview,getLogs});
});
