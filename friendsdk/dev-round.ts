// DEV ONLY. No wallet, chain endpoint or production adapter is implemented here.
// Simulates escrow until the server decides at UTC close, including refunds and 80/10/10.
import type { DevSimApi, DevStub } from '@rarefriends/friendsdk/dev';
const RF=10n**18n,adapter='rare-heist-round-v1';
export default function round(sim:DevSimApi):DevStub{
 const ops:any[]=[];let lanes:any[]=[];
 const phase=o=>o.settled?'settled':sim.now()>=Date.parse(o.day+'T00:00:00Z')+86400000?'closed':'open';
 const event=(o,hash?)=>({kind:'external' as const,adapter,module:o.lane.module.toLowerCase(),gameId:o.lane.gameId,id:o.id,action:'enterDaily',friendId:o.friendId,wallet:o.wallet,generation:o.generation,quantity:1,status:o.settled?'settled' as const:'pending' as const,...(hash?{hash}:{}),data:{day:o.day,enteredAt:o.enteredAt,phase:phase(o)},...(o.settled?{paid:(BigInt(o.pays)*RF).toString(),paidTo:'friend' as const}:{} )});
 return {watcher:{adapter,
  init(ctx){lanes=[...ctx.lanes];},
  async cycle(){return sim.switches.keeperOffline?[]:ops.filter(o=>o.reported!==phase(o)).map(o=>event(o));},
  async verify(_ctx,submitted){return submitted.flatMap(s=>{const o=ops.find(x=>x.hash===s.hash);return o?[event(o,s.hash)]:[];});},
  async resolve(_ctx,resolutions){for(const r of resolutions){const o=ops.find(x=>x.id===r.id);if(!o||o.settled)continue;const d:any=r.decision;
   if(d.day!==o.day||!/^\d+$/.test(d.pays)||!/^\d+$/.test(d.burn)||!/^\d+$/.test(d.rewards))throw Error('Invalid round decision');
   const pot=ops.filter(x=>x.day===o.day).length*150;if(Number(d.pays)+Number(d.burn)+Number(d.rewards)>pot)throw Error('Decision exceeds the round pot');
   o.pays=d.pays;o.burn=d.burn;o.rewards=d.rewards;o.settled=true;sim.credit(o.wallet,BigInt(d.pays)*RF);
  }},
  reported(_ctx,results){for(const r of results)if(r.result.status==='applied'||r.result.status==='pending'){const o=ops.find(x=>x.id===r.event.id);if(o)o.reported=(r.event.data as any)?.phase;}}
 },relay:{
  async holdings(r){const day=new Date(sim.now()).toISOString().slice(0,10),entered=ops.some(o=>o.friendId===r.friend.id&&o.day===day),available=!entered&&sim.balance(r.account)>=150n*RF;return {tokens:[],actions:{enterDaily:{available,maxQuantity:available?1:0,...(!available?{reason:entered?'Already entered today.':'Needs 150 RF.'}:{})}}};},
  async describe(r){const d:any=r.intent;if(d?.day!==new Date(sim.now()).toISOString().slice(0,10))throw Error('The UTC day changed.');return {total:'150',lines:[{label:'Daily Heist',value:d.day},{label:'Attempts',value:'3 / no extra purchases'},{label:'At UTC close',value:'80% winner / 10% burn / 10% Friend rewards'},{label:'Refund',value:'Fewer than two entrants or no clean win'}]};},
  async execute(r){if(sim.switches.rejectNext){sim.switches.rejectNext=false;throw Object.assign(new Error('Cancelled'),{code:4001});}
   const d:any=r.intent,day=new Date(sim.now()).toISOString().slice(0,10);if(d?.day!==day||ops.some(o=>o.friendId===r.friend.id&&o.day===day))throw Error('Entry is no longer available.');sim.debit(r.account,150n*RF);
   const hash=sim.hash();ops.push({id:'entry:'+String(ops.length+1),lane:lanes.find(l=>l.key===r.lane.key),friendId:r.friend.id,wallet:r.friend.wallet.toLowerCase(),generation:r.friend.generation,day,enteredAt:sim.now(),hash,settled:false,reported:'',pays:'0'});return {hash};}
 }};
}
