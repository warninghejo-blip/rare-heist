// Precomputes truthful data for the trailer under the current rules (one detection ends the job,
// walking guards): solver routes for every job, a real "one step too early" failure against a
// walking guard's flashlight, and a real Last Heist evolution (each revision breaks the previous
// winning route and is still solvable). Usage: node trailer/precompute.cjs
const E=require('../src/engine.js'),L=require('../src/cutaway-levels.js'),A=require('../src/last-heist.js'),{solve}=require('../tests/solve.cjs');
const fs=require('fs'),byId=id=>L.find(x=>x.id===id);
const out={routes:{},grid:[],evolution:[],caught:null};
const need=(id,opts={})=>{const r=solve(byId(id),{maxNodes:900000,...opts});if(!r.ok)throw new Error('no route for '+id);return r.actions;};
for(const id of ['drill-walker','cut-07','cut-10','cut-12','annex-02','cut-06','cut-09','last-cutaway'])out.routes[id]=need(id);
// Caught: replay a winning route against a walking guard; find the latest turn where one step
// taken too early walks into his flashlight. Same job, same Friend, one wrong beat.
function caughtFrom(id){const l=E.normalize(byId(id)),route=out.routes[id]||need(id);let s=E.create(l,'operative');const found=[];
 for(let i=0;i<route.length;i++){
  for(const a of ['N','E','S','W']){if(a===route[i])continue;const r=E.step(l,s,a);if(r.changed&&r.state.status==='lost'&&r.state.failure?.kind==='walker')found.push({id,prefix:route.slice(0,i),wrong:a,at:i,turn:r.state.turn});}
  const r=E.step(l,s,route[i]);if(!r.changed)break;s=r.state;}
 return found;}
const candidates=['drill-walker','cut-07','cut-12','cut-10','annex-02','cut-06','cut-09'].flatMap(caughtFrom);
console.log('caught candidates',candidates.map(c=>c.id+'@'+c.at+c.wrong).join(' '));
out.caughtAll=candidates;
out.caught=candidates.find(c=>c.id==='cut-07')||candidates[0];
// grid: all 22 jobs in play order (lessons, campaign, annexes, archive)
const order=['cut-00','drill-pulse','drill-light','drill-weight','drill-walker','cut-02','cut-03','cut-05','cut-06','cut-07','cut-04','cut-01','cut-08','cut-09','cut-10','cut-11','cut-12','annex-01','annex-02','archive-01','archive-02','archive-03'];
for(const id of order){const l=byId(id);const r=solve(l,{maxNodes:900000});if(r.ok)out.grid.push({id,name:l.nameEn||l.name,level:E.normalize(l),route:r.actions});else console.log('UNSOLVED',id);}
// evolution: start from the Last Heist seed, add one legal obstacle at a time
let level=A.seed(),route=solve(level,{maxNodes:900000}).actions;
out.evolution.push({level,route,change:null});
const kinds=['laser','camera','wall','laser'];
for(const kind of kinds){let best=null;
  for(let y=1;y<level.map.length-1&&!best;y+=2)for(let x=1;x<level.map[0].length-1&&!best;x++)for(const dir of kind==='wall'?[null]:['W','E']){
    if(best||!A.allowedCell(level,x,y))continue;const change={kind,x,y,...(dir?{dir}:{})};
    let next;try{next=A.mutationLevel({level,changes:out.evolution.slice(1).map(e=>e.change)},change);}catch{continue;}
    if(E.replay(next,route,'ghost').ok)continue;const r=solve(next,{maxNodes:400000});if(!r.ok)continue;
    if(r.turns>route.length){best={level:next,route:r.actions,change};}}
  if(!best){console.log('no change for',kind);continue;}
  level=best.level;route=best.route;out.evolution.push(best);console.log('revision',out.evolution.length-1,kind,best.change.x+','+best.change.y,'route',route.length);}
// every stored route must replay to a win under the current engine
for(const g of out.grid)if(!E.replay(g.level,g.route,'operative').ok)throw new Error('grid route fails '+g.id);
for(const e of out.evolution)if(!E.replay(e.level,e.route,'ghost').ok)throw new Error('evolution route fails');
fs.writeFileSync(__dirname+'/data.js','window.TRAILER='+JSON.stringify(out)+';\n');
console.log('grid',out.grid.length,'caught',out.caught&&out.caught.id+' turn '+out.caught.turn,'routes',Object.entries(out.routes).map(([k,v])=>k+':'+v.length).join(' '));
