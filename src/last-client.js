(function(root){'use strict';
 const A=root.LastHeist;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const uuid=()=>globalThis.crypto?.randomUUID?.()||('local-'+Date.now()+'-'+Math.random().toString(36).slice(2));
 class Network{
  constructor(){this.local=false;this.me=null;}
  async request(method,url,value){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{
   const r=await fetch(url,{method,credentials:'same-origin',signal:controller.signal,headers:method==='POST'?{'Content-Type':'application/json','X-RH-CSRF':this.me?.csrf||''}:{},...(method==='POST'?{body:JSON.stringify(value||{})}:{})});
   let b;try{b=await r.json();}catch{throw Object.assign(Error('This host does not provide the shared game API.'),{code:'NO_SERVER'});}
   if(!r.ok)throw Object.assign(Error(b.message||b.error),{code:b.error});return b;
  }catch(e){if(e instanceof TypeError)throw Object.assign(Error('Shared server unavailable.'),{code:['http:','https:'].includes(location.protocol)?'NETWORK':'NO_SERVER'});if(e.name==='AbortError')throw Object.assign(Error('Server timed out. Your local attempt is still here.'),{code:'NETWORK'});throw e;}finally{clearTimeout(timer);}}
  async init(){this.me=await this.request('POST','/api/session');return this.me;}
  async list(){return (await this.request('GET','/api/rounds')).rounds;}
  round(id){return this.request('GET','/api/rounds/'+id);}
  attempt(ticket){return this.request('GET','/api/attempts/'+ticket);}
  economy(){return this.request('GET','/api/economy');}
  replays(id){return this.request('GET',`/api/rounds/${id}/replays`);}
  context(id){return this.request('GET','/api/rounds/'+id+'/edit-context');}
  create(profile){return this.request('POST','/api/rounds',{profile});}
  enter(id,heroId){return this.request('POST',`/api/rounds/${id}/enter`,{heroId});}
  finish(id,ticket,actions){return this.request('POST',`/api/rounds/${id}/finish`,{ticket,actions});}
  fortify(id,revision,change,actions){return this.request('POST',`/api/rounds/${id}/fortify`,{revision,change,actions});}
  skip(id){return this.request('POST',`/api/rounds/${id}/skip`);}
  claim(id){return this.request('POST',`/api/rounds/${id}/claim`);}
  async rename(name){const r=await this.request('POST','/api/session/name',{name});this.me.name=r.name;return r;}
 }
 class Rehearsal{
  constructor(){this.local=true;this.key='rare-heist-rehearsal-v1';this.data={rounds:{},names:{'local-1':'Player 1','local-2':'Player 2','local-3':'Player 3'},player:'local-1'};this.tickets=new Map();this.storage=true;
   try{const v=JSON.parse(localStorage.getItem(this.key)||'null');if(v?.v===1&&v.rounds&&typeof v.rounds==='object'&&Object.values(v.rounds).every(r=>r.v===1&&r.id&&A.PROFILES[r.profile]&&root.HeistEngine.validate(r.level).ok)&&['local-1','local-2','local-3'].includes(v.player))this.data=v;}catch{}
  }
  save(){try{localStorage.setItem(this.key,JSON.stringify({...this.data,v:1}));}catch{this.storage=false;}}
  async init(){if(!Object.keys(this.data.rounds).length)await this.create('sprint');this.me={player:this.data.player,name:this.data.names[this.data.player],balance:0};this.save();return this.me;}
  view(r){return {...A.publicRound(r,Date.now(),this.data.player),names:clone(this.data.names),source:'local-rehearsal',quorum:2,rewardUnit:'DEMO RF',identity:'unverified-local-seat'};}
  get(id){let r=this.data.rounds[id];if(!r)throw Error('Unknown rehearsal');r=A.advance(r,Date.now());this.data.rounds[id]=r;this.save();return r;}
  async list(){return Object.keys(this.data.rounds).slice(-12).reverse().map(id=>this.view(this.get(id)));}
  async round(id){return this.view(this.get(id));}
  async context(id){const r=this.get(id);if(r.lease?.player!==this.data.player)throw Error('No editing lease');return {round:this.view(r),referenceActions:clone(r.referenceActions)};}
  async create(profile){const id=uuid();this.data.rounds[id]=A.createRound(id,Date.now(),profile);const ids=Object.keys(this.data.rounds);if(ids.length>12)delete this.data.rounds[ids[0]];this.save();return this.view(this.data.rounds[id]);}
  async enter(id,heroId='3412'){const r=this.get(id);if(r.phase!=='open'||r.leader===this.data.player)throw Object.assign(Error('Another player must try the vault'),{code:'OWN_DEFENCE'});const ticket=uuid();this.tickets.set(ticket,{round:id,player:this.data.player,level:clone(r.level),revision:r.revision,expires:Math.min(r.deadline,r.hardEnd),result:null,heroId});r.attemptCount++;this.save();return {ticket,revision:r.revision,expires:r.deadline,round:this.view(r)};}
  async finish(id,ticket,actions){const t=this.tickets.get(ticket);if(!t||t.player!==this.data.player)throw Error('No local attempt');if(t.result)return clone(t.result);if(Date.now()>=t.expires)throw Object.assign(Error('Attempt expired'),{code:'ATTEMPT_EXPIRED'});t.actions=[...actions];const play=A.validateLog(t.level,actions,false);let r=this.get(id),result;
   if(play.state.status==='lost'){r.failedCount++;result='lost';}else if(r.revision!==t.revision||r.phase!=='open'){result='outdated';}else{r=A.takeLead(r,this.data.player,t.revision,actions,Date.now());result='leader';}
   this.data.rounds[id]=r;this.save();t.result={accepted:result!=='outdated',result,turns:actions.length,round:this.view(r),receiptId:ticket};return clone(t.result);
  }
  async fortify(id,revision,change,actions){this.data.rounds[id]=A.fortify(this.get(id),this.data.player,revision,change,actions,Date.now());this.save();return this.view(this.get(id));}
  async skip(id){this.data.rounds[id]=A.skip(this.get(id),this.data.player,Date.now());this.save();return this.view(this.get(id));}
  async claim(id){this.data.rounds[id]=A.claim(this.get(id),this.data.player,Date.now());this.save();return {round:this.view(this.get(id)),balance:Object.values(this.data.rounds).filter(r=>r.leader===this.data.player&&r.prizeClaimed).reduce((n,r)=>n+r.prize,0)};}
  async replays(id){const r=this.get(id);if(r.phase!=='finished')throw Error('Replays unlock at round end');return {round:this.view(r),records:[...this.tickets.entries()].filter(([k,t])=>t.round===id&&t.result&&t.actions).map(([k,t])=>({id:k,name:this.data.names[t.player],revision:t.revision,record:{v:1,at:new Date(r.createdAt).toISOString(),level:t.level,actions:t.actions,mode:'ghost',practice:t.result.result==='outdated',heroId:t.heroId||'3412'}}))};}
  async rename(name){this.data.names[this.data.player]=String(name).replace(/[<>\x00-\x1f]/g,'').trim().slice(0,24)||'Local Friend';this.me.name=this.data.names[this.data.player];this.save();return {name:this.me.name};}
  async handoff(){this.data.player='local-'+((Number(this.data.player.slice(-1))%3)+1);return this.init();}
 }
 root.LastHeistClient={Network,Rehearsal};
})(globalThis);
