// Precomputes truthful data for the trailer: solver routes and a real Last Heist evolution
// (each revision breaks the previous winning route and is still solvable).
const E=require('../src/engine.js'),L=require('../src/cutaway-levels.js'),A=require('../src/last-heist.js'),{solve}=require('../tests/solve.cjs');
const fs=require('fs'),byId=id=>L.find(x=>x.id===id);
const out={routes:{},grid:[],evolution:[]};
for(const id of ['cut-01','cut-02','cut-12','last-cutaway'])out.routes[id]=solve(byId(id),{maxNodes:600000}).actions;
// caught sequence in cut-02
{const l=E.normalize(byId('cut-02'));let q=[{s:E.create(l,'operative'),a:[]}],seen=new Set();outer:while(q.length){const n=q.shift();for(const a of ['E','W','N','S','WAIT']){const r=E.step(l,n.s,a);if(!r.changed)continue;const k=[r.state.x,r.state.y,r.state.turn%12,r.state.alarms].join();if(seen.has(k))continue;seen.add(k);const na=[...n.a,a];if(r.state.status==='lost'){out.routes.caught=na;break outer;}if(na.length<30)q.push({s:r.state,a:na});}}}
// grid: every job in play order
const order=['cut-00','drill-pulse','drill-light','drill-weight','cut-02','cut-03','cut-05','cut-06','cut-07','cut-04','cut-01','cut-08','cut-09','cut-10','cut-11','cut-12'];
for(const id of order){const l=byId(id);if(!l)continue;const r=solve(l,{maxNodes:600000});if(r.ok)out.grid.push({id,name:l.nameEn||l.name,level:l,route:r.actions});}
// evolution: start from the Last Heist seed, add one legal obstacle at a time
let level=E.normalize(A.seed?A.seed():byId('last-cutaway')),route=solve(level,{maxNodes:600000}).actions;
out.evolution.push({level,route,change:null});
const kinds=['laser','camera','wall','laser'];
for(const kind of kinds){let best=null;
  for(let y=1;y<level.map.length-1&&!best;y+=2)for(let x=1;x<level.map[0].length-1&&!best;x++)for(const dir of kind==='wall'?[null]:['W','E']){
    if(!A.allowedCell(level,x,y))continue;const change={kind,x,y,...(dir?{dir}:{})};
    let next;try{next=A.mutationLevel({level,changes:out.evolution.slice(1).map(e=>e.change)},change);}catch{continue;}
    if(E.replay(next,route,'ghost').ok)continue;const r=solve(next,{maxNodes:300000});if(!r.ok)continue;
    if(r.turns>route.length){best={level:next,route:r.actions,change};break;}}
  if(!best){console.log('no change for',kind);continue;}
  level=best.level;route=best.route;out.evolution.push(best);console.log('revision',out.evolution.length-1,kind,best.change.x+','+best.change.y,'route',route.length);}
fs.writeFileSync(__dirname+'/data.json',JSON.stringify(out));
console.log('grid',out.grid.length,'caught',out.routes.caught.length);
