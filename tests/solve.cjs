const E=require('../src/engine.js');
class Heap{
 constructor(){this.a=[];}
 push(v){const a=this.a;a.push(v);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].f<=v.f)break;a[i]=a[p];i=p;}a[i]=v;}
 pop(){const a=this.a,top=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=v.f)break;a[i]=a[j];i=j;}a[i]=v;}return top;}
 get size(){return this.a.length;}
}
function solve(l,{maxNodes=350000,maxTurns=200,useEMP=false,allIntel=false,startState=null}={}){
 l=E.normalize(l);const period=E.period(l),trophy=E.positions(l,'T')[0],exit=E.positions(l,'E')[0],hasVents=E.positions(l,'v').length>0;
 const chips=E.positions(l,'o'),allMask=(1<<chips.length)-1;
 const staticDistances=target=>{const ds=new Map([[E.xy(target.x,target.y),0]]),q=[target],vs=E.positions(l,'v');for(let h=0;h<q.length;h++){const at=q[h],neighbours=Object.values(E.DIRS).map(([dx,dy])=>({x:at.x+dx,y:at.y+dy}));if(E.tile(l,at.x,at.y)==='v')neighbours.push(...vs);for(const n of neighbours){const k=E.xy(n.x,n.y);if(E.tile(l,n.x,n.y)==='#'||E.deviceAt(l,n.x,n.y)||ds.has(k))continue;ds.set(k,ds.get(E.xy(at.x,at.y))+1);q.push(n);}}return ds;};
 const exitDist=staticDistances(exit),trophyDist=staticDistances(trophy),chipDist=chips.map(staticDistances),at=(d,p)=>d.get(E.xy(p.x,p.y))??999;
 const plates=E.positions(l,'p'),dist=(p,q)=>Math.abs(p.x-q.x)+Math.abs(p.y-q.y);
 const key=s=>[s.x,s.y,+!!s.lightOverride,s.turn%period,s.keys,s.switches,+s.relic,allIntel?s.intel:0,s.crates.map(p=>p.y*16+p.x).sort((a,b)=>a-b).join('.'),s.lockdownLeft??'-',useEMP?s.emps:0,useEMP?s.empLeft:0].join('/');
 const estimate=s=>{
   let v=s.relic?at(exitDist,s):at(trophyDist,s)+at(exitDist,trophy);
   if(allIntel)for(let i=0;i<chips.length;i++)if(!(s.intel&(1<<i)))v=Math.max(v,at(chipDist[i],s)+at(exitDist,chips[i]));
   if(!s.relic&&plates.length&&s.crates.length===plates.length){
    let c=0;for(const p of plates)c+=Math.min(...s.crates.map(q=>dist(p,q)));
    v+=c*1.4; // Weighted A*: a valid witness, not a proof of the optimal path.
   }return v;
 };
 const dead=s=>s.crates.some(p=>{
  if(E.tile(l,p.x,p.y)==='p'||E.tile(l,p.x,p.y)==='P')return false;
  const w=(dx,dy)=>E.tile(l,p.x+dx,p.y+dy)==='#'||E.deviceAt(l,p.x+dx,p.y+dy);
  return (w(1,0)||w(-1,0))&&(w(0,1)||w(0,-1));
 });
 const initial=startState||E.create(l,'ghost'),heap=new Heap(),seen=new Map(),nodes=[];
 const add=(s,parent,action)=>{const k=key(s);if(seen.has(k)&&seen.get(k)<=s.turn)return;seen.set(k,s.turn);const idx=nodes.length;nodes.push({s,parent,action});heap.push({idx,f:s.turn+estimate(s)*1.4});};
 add(initial,-1,null);let expanded=0;
 while(heap.size&&expanded<maxNodes){
  const idx=heap.pop().idx,n=nodes[idx],s=n.s;expanded++;
  if(s.status==='won'&&(!allIntel||s.intel===allMask)){let a=[],i=idx;while(nodes[i].parent>=0){a.push(nodes[i].action);i=nodes[i].parent;}a.reverse();return {ok:true,actions:a,turns:s.turn,intel:E.countIntel(s),allIntel,expanded,discovered:nodes.length};}
  if(s.turn>=maxTurns)continue;
  for(const a of ['N','E','S','W','WAIT',...(E.interact(l,s)?['VENT']:[]),...(useEMP&&s.emps>0?['EMP']:[]),...(E.canToggleLight(l,s)?['LIGHT']:[])]){
    const q=E.step(l,s,a);if(!q.changed||q.state.status==='lost'||dead(q.state))continue;add(q.state,idx,a);
  }
 }
 return {ok:false,expanded,discovered:nodes.length,pending:heap.size};
}
if(require.main===module){
 const fs=require('fs'),path=require('path'),all=require('../src/levels.js');
 const which=process.argv[2];const report=[];
 for(const l of all.filter(l=>!which||l.id.endsWith(which.padStart(2,'0')))){
  const st=Date.now(),r=solve(l);r.ms=Date.now()-st;r.id=l.id;report.push(r);console.log(JSON.stringify(r));
  if(r.ok)fs.writeFileSync(path.join(__dirname,'../evidence',l.id+'-solution.json'),JSON.stringify(r,null,2));
 }
 fs.writeFileSync(path.join(__dirname,'../evidence/solver-report.json'),JSON.stringify(report,null,2));
}
module.exports={solve};
