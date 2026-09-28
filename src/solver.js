/* Rare Heist route finder, shared by the browser and Node. A port of tests/solve.cjs (weighted A* over
   unchanged engine states) with a resumable search, so the Last Heist obstacle editor can answer "can this
   vault still be beaten?" in small time slices without freezing the page.
   It is advice, never authority: the player still clears the changed vault, and the server replays that proof.
   Result: {ok:true, actions, turns, ...} a witness route (not a shortest-path claim), or {ok:false, proven}.
   proven:true means every state reachable within maxTurns was explored, so no route of maxTurns turns or fewer
   exists (the state key covers everything the rules depend on; a later arrival at the same key is dominated). */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./engine.js'):root.HeistEngine);if(typeof module==='object'&&module.exports)module.exports=api;else root.HeistSolver=api;})(globalThis,function(E){
 'use strict';
 class Heap{
  constructor(){this.a=[];}
  push(v){const a=this.a;a.push(v);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].f<=v.f)break;a[i]=a[p];i=p;}a[i]=v;}
  pop(){const a=this.a,top=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=v.f)break;a[i]=a[j];i=j;}a[i]=v;}return top;}
  get size(){return this.a.length;}
 }
 // Same search as tests/solve.cjs, split so it can pause: step(budget) expands at most `budget` nodes and returns
 // the final result, or null while the search is still open. Uninterrupted, it returns exactly what solve.cjs does.
 function search(raw,{maxNodes=350000,maxTurns=200,useEMP=false,allIntel=false,startState=null}={}){
  const l=E.normalize(raw),period=E.period(l),trophy=E.positions(l,'T')[0],exit=E.positions(l,'E')[0];
  const chips=E.positions(l,'o'),allMask=(1<<chips.length)-1;
  const staticDistances=target=>{const ds=new Map([[E.xy(target.x,target.y),0]]),q=[target],vs=E.positions(l,'v');for(let h=0;h<q.length;h++){const at=q[h],neighbours=Object.values(E.DIRS).map(([dx,dy])=>({x:at.x+dx,y:at.y+dy}));if(E.tile(l,at.x,at.y)==='v')neighbours.push(...vs);for(const n of neighbours){const k=E.xy(n.x,n.y);if(E.tile(l,n.x,n.y)==='#'||E.deviceAt(l,n.x,n.y)||ds.has(k))continue;ds.set(k,ds.get(E.xy(at.x,at.y))+1);q.push(n);}}return ds;};
  const exitDist=staticDistances(exit),trophyDist=staticDistances(trophy),chipDist=chips.map(staticDistances),at=(d,p)=>d.get(E.xy(p.x,p.y))??999;
  const plates=E.positions(l,'p'),dist=(p,q)=>Math.abs(p.x-q.x)+Math.abs(p.y-q.y);
  const key=s=>[s.x,s.y,+!!s.lightOverride,s.turn%period,s.keys,s.switches,+s.relic,allIntel?s.intel:0,s.crates.map(p=>p.y*16+p.x).sort((a,b)=>a-b).join('.'),s.lockdownLeft??'-',useEMP?s.emps:0,useEMP?s.empLeft:0].join('/');
  const estimate=s=>{
   let v=s.relic?at(exitDist,s):at(trophyDist,s)+at(exitDist,trophy);
   if(allIntel)for(let i=0;i<chips.length;i++)if(!(s.intel&(1<<i)))v=Math.max(v,at(chipDist[i],s)+at(exitDist,chips[i]));
   if(!s.relic&&plates.length&&s.crates.length===plates.length){let c=0;for(const p of plates)c+=Math.min(...s.crates.map(q=>dist(p,q)));v+=c*1.4;}
   return v;
  };
  const dead=s=>s.crates.some(p=>{
   if(E.tile(l,p.x,p.y)==='p'||E.tile(l,p.x,p.y)==='P')return false;
   const w=(dx,dy)=>E.tile(l,p.x+dx,p.y+dy)==='#'||E.deviceAt(l,p.x+dx,p.y+dy);
   return (w(1,0)||w(-1,0))&&(w(0,1)||w(0,-1));
  });
  const initial=startState||E.create(l,'ghost'),heap=new Heap(),seen=new Map(),nodes=[];
  const add=(s,parent,action)=>{const k=key(s);if(seen.has(k)&&seen.get(k)<=s.turn)return;seen.set(k,s.turn);const idx=nodes.length;nodes.push({s,parent,action});heap.push({idx,f:s.turn+estimate(s)*1.4});};
  add(initial,-1,null);let expanded=0,result=null;
  function step(budget=Infinity){
   if(result)return result;
   for(let n=0;heap.size&&expanded<maxNodes&&n<budget;n++){
    const idx=heap.pop().idx,s=nodes[idx].s;expanded++;
    if(s.status==='won'&&(!allIntel||s.intel===allMask)){const a=[];let i=idx;while(nodes[i].parent>=0){a.push(nodes[i].action);i=nodes[i].parent;}a.reverse();return result={ok:true,actions:a,turns:s.turn,intel:E.countIntel(s),allIntel,expanded,discovered:nodes.length};}
    if(s.turn>=maxTurns)continue;
    for(const a of ['N','E','S','W','WAIT',...(E.interact(l,s)?['VENT']:[]),...(useEMP&&s.emps>0?['EMP']:[]),...(E.canToggleLight(l,s)?['LIGHT']:[])]){
     const q=E.step(l,s,a);if(!q.changed||q.state.status==='lost'||dead(q.state))continue;add(q.state,idx,a);
    }
   }
   if(!heap.size||expanded>=maxNodes)return result={ok:false,expanded,discovered:nodes.length,pending:heap.size,proven:heap.size===0,maxTurns};
   return null;
  }
  return {step,progress:()=>({expanded,discovered:nodes.length,pending:heap.size,maxNodes})};
 }
 function solve(l,options){return search(l,options).step();}
 // Time-sliced run for the page: expands nodes for about `sliceMs` per macrotask, then yields.
 // Calls onDone(result) once (result.timeout when `timeoutMs` passes first); cancel() stops it silently.
 function run(l,options={},{sliceMs=12,timeoutMs=8000,onProgress=null,onDone=()=>{},now=()=>Date.now(),later=f=>setTimeout(f,0)}={}){
  let s,cancelled=false;const started=now();
  try{s=search(l,options);}catch(e){later(()=>{if(!cancelled)onDone({ok:false,error:e.message});});return {cancel(){cancelled=true;}};}
  const tick=()=>{if(cancelled)return;const until=now()+sliceMs;let r=null;while(!r&&now()<until)r=s.step(250);
   if(r){onDone(r);return;}
   if(now()-started>=timeoutMs){onDone({ok:false,proven:false,timeout:true,...s.progress()});return;}
   if(onProgress)onProgress(s.progress());later(tick);};
  later(tick);
  return {cancel(){cancelled=true;}};
 }
 return Object.freeze({search,solve,run});
});
