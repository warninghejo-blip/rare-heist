/* Rare Heist creator economy. ALL amounts below are simulated, never on-chain.
 * Integer micro-RF accounting. Rebuild balances from the bounded event journal,
 * not from untrusted saved balances. No play rewards, RNG or minting API. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HeistEconomy=api;})(globalThis,function(){
 'use strict';
 const UNIT=1000000,INITIAL=100*UNIT,MAX_EVENTS=500;
 const CATALOG=Object.freeze([
  Object.freeze({id:'archive-pack',kind:'pack',price:12*UNIT,creator:'Rare Heist Studio',name:["The Black Archive","The Black Archive"],description:["Three new heists: dual-pressure access, a silent bypass and a sealing vault.","Three new heists: dual-pressure access, a silent bypass and a sealing vault."]}),
  Object.freeze({id:'lilac',kind:'theme',price:4*UNIT,creator:'Rare Heist Studio',name:["Lilac workshop","Lilac workshop"],description:["Lilac wall trim. No rule or character-stat changes.","Lilac wall trim. No rule or character-stat changes."]}),
  Object.freeze({id:'citrus',kind:'theme',price:4*UNIT,creator:'Rare Heist Studio',name:["Citrus pavilion","Citrus pavilion"],description:["Lime wall trim. Hazards and signals retain their colors.","Lime wall trim. Hazards and signals retain their colors."]})
 ]);
 const cleanLabel=v=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,40):'';
 function initial(){return {v:1,initial:INITIAL,balance:INITIAL,creators:{},burned:0,treasury:0,owned:[],events:[]};}
 function validateEvent(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid economy event');
  if(typeof raw.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(raw.id))throw Error('Invalid event id');
  if(raw.type==='buy'){
   const item=CATALOG.find(x=>x.id===raw.item);if(!item)throw Error('Unknown catalogue item');
   return {id:raw.id,type:'buy',item:item.id};
  }
  if(raw.type==='tip'){
   const creator=cleanLabel(raw.creator);if(!creator||['__proto__','prototype','constructor'].includes(creator))throw Error('Invalid creator label');
   if(![1,5,10].includes(raw.rf))throw Error('Tip must be 1, 5 or 10 demo RF');
   return {id:raw.id,type:'tip',creator,rf:raw.rf};
  }
  throw Error('Unknown economy action');
 }
 function apply(state,raw){
  const ev=validateEvent(raw),old=state.events.find(x=>x.id===ev.id);
  if(old){if(JSON.stringify(old)!==JSON.stringify(ev))throw Error('Event id conflict');return state;}
  if(state.events.length>=MAX_EVENTS)throw Error('Demo journal is full');
  const item=ev.type==='buy'?CATALOG.find(x=>x.id===ev.item):null;
  if(item&&state.owned.includes(item.id))throw Error('Already owned');
  const amount=item?item.price:ev.rf*UNIT,creator=item?item.creator:ev.creator;
  if(state.balance<amount)throw Error('Insufficient demo RF');
  const author=amount*7/10,burn=amount*2/10,treasury=amount-author-burn;
  if(![amount,author,burn,treasury].every(Number.isSafeInteger))throw Error('Non-integral ledger amount');
  const next={...state,balance:state.balance-amount,creators:{...state.creators},burned:state.burned+burn,treasury:state.treasury+treasury,owned:item?[...state.owned,item.id]:[...state.owned],events:[...state.events,ev]};
  next.creators[creator]=(Object.hasOwn(next.creators,creator)?next.creators[creator]:0)+author;
  if(!conserved(next))throw Error('Ledger invariant failed');
  return next;
 }
 function restore(raw){
  if(raw==null)return initial();
  if(!raw||raw.v!==1||!Array.isArray(raw.events)||raw.events.length>MAX_EVENTS)throw Error('Invalid demo journal');
  let state=initial();
  const ids=new Set();for(const ev of raw.events){if(ids.has(ev?.id))throw Error('Duplicate saved event');ids.add(ev?.id);state=apply(state,ev);}
  return state;
 }
 function conserved(s){return Number.isSafeInteger(s.balance)&&s.balance>=0&&s.balance+Object.values(s.creators).reduce((a,b)=>a+b,0)+s.burned+s.treasury===INITIAL;}
 function split(amount){if(!Number.isSafeInteger(amount)||amount<0||amount%10)throw Error('Invalid price');return {creator:amount*7/10,burned:amount*2/10,treasury:amount/10};}
 function format(v){if(!Number.isSafeInteger(v))return '—';return (v/UNIT).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');}
 function serialize(s){return {v:1,events:s.events.map(e=>({...e}))};}
 function receipt(s){return {mode:'SIMULATED',unit:'micro-RF',initial:INITIAL,player:s.balance,creatorBalances:{...s.creators},burned:s.burned,treasury:s.treasury,total:s.balance+Object.values(s.creators).reduce((a,b)=>a+b,0)+s.burned+s.treasury,conserved:conserved(s),owned:[...s.owned],events:s.events.map(e=>({...e}))};}
 return Object.freeze({UNIT,INITIAL,MAX_EVENTS,CATALOG,initial,validateEvent,apply,restore,conserved,split,format,serialize,receipt});
});
