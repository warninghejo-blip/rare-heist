(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DailyHeistClient=api;})(globalThis,function(){
 'use strict';
 class Network{
  constructor(client=null){this.client=client;this.me=client?.me||null;this.local=false;}
  async request(method,url,value){
   if(this.client)return this.client.request(method,url,value);
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
   try{const r=await fetch(url,{method,credentials:'same-origin',signal:controller.signal,headers:method==='POST'?{'Content-Type':'application/json','X-RH-CSRF':this.me?.csrf||''}:{},...(method==='POST'?{body:JSON.stringify(value||{})}:{})});
    const b=await r.json();if(!r.ok)throw Object.assign(Error(b.message||b.error),{code:b.error});return b;
   }catch(e){if(e.name==='AbortError')throw Object.assign(Error('Server timed out'),{code:'NETWORK'});throw e;}finally{clearTimeout(timer);}
  }
  async init(){this.me=await this.request('POST','/api/session');return this.me;}
  state(){return this.request('GET','/api/daily');}
  enter(heroId){return this.request('POST','/api/daily/enter',{heroId});}
  start(){return this.request('POST','/api/daily/start');}
  submit(actions){return this.request('POST','/api/daily/submit',{actions});}
  history(limit=7){return this.request('GET','/api/daily/history?limit='+encodeURIComponent(limit));}
  solution(day){return this.request('GET','/api/daily/solution/'+encodeURIComponent(day));}
  replay(day,rank=1){return this.request('GET','/api/daily/replay/'+encodeURIComponent(day)+'/'+encodeURIComponent(rank));}
 }
 return {Network};
});
