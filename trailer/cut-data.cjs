// Truthful data for the v2 trailer (trailer/cut.html), from the game's own engine, stored solutions and solver.
//  - heist: The Last Floor (cut-10) stored solution, and the one real wrong step that walks into the guard's flashlight
//    right after the trophy (the step where the solution WAITs);
//  - editor: Last Heist opening vault, the last winning route, one wall that the solver proves blocks every route and
//    one wall that breaks the route but stays beatable (the same three checks as the in-game editor);
//  - evolution: three real revisions of the shared vault, each breaks the previous winning route and is still solvable.
// Usage: node trailer/cut-data.cjs   (writes trailer/cut-data.js)
const E=require('../src/engine.js'),L=require('../src/cutaway-levels.js'),A=require('../src/last-heist.js'),S=require('../src/solver.js'),SOL=require('../src/solutions.js');
const fs=require('fs'),byId=id=>L.find(x=>x.id===id);
const out={hero:'3412',heist:null,editor:null,evolution:[]};
// ---- heist
{const id='cut-10',l=E.normalize(byId(id)),route=SOL[id].actions;const at=route.indexOf('WAIT',30);let s=E.create(l,'operative');for(let i=0;i<at;i++)s=E.step(l,s,route[i]).state;
 const bad=E.step(l,s,'E');if(!bad.changed||bad.state.status!=='lost')throw Error('caught step not found');
 if(!E.replay(l,route,'operative').ok)throw Error('stored route fails');
 out.heist={id,route,caughtAt:at,wrong:'E',failure:bad.state.failure};console.log('heist',id,'turns',route.length,'caught at',at,JSON.stringify(bad.state.failure));}
// ---- editor
{const seed=A.seed(),route=SOL['last-cutaway'].actions,round={level:seed,changes:[],referenceActions:route};const cells=[];
 for(let y=1;y<seed.map.length-1;y+=2)for(let x=1;x<seed.map[0].length-1;x++)if(A.allowedCell(seed,x,y)){const l=A.mutationLevel(round,{kind:'wall',x,y}),q=E.replay(l,route,'ghost'),breaks=!q.ok,r=S.solve(l,{maxTurns:A.MAX_ACTIONS,maxNodes:300000});cells.push({x,y,breaks,cutAt:breaks?Math.max(0,(q.states?.length||1)-1):null,beatable:r.ok,proven:!r.ok&&r.proven,turns:r.ok?r.actions.length:null});}
 const sealed=cells.filter(w=>w.breaks&&w.proven),good=cells.filter(w=>w.breaks&&w.beatable);
 if(!sealed.length||!good.length)throw Error('editor cells not found');
 out.editor={route,allowed:cells.map(c=>({x:c.x,y:c.y})),sealed,good};console.log('editor sealed',sealed.map(c=>c.x+','+c.y).join(' '),'good',good.map(c=>c.x+','+c.y+'('+c.turns+')').join(' '));}
// ---- evolution
{let level=A.seed(),route=SOL['last-cutaway'].actions;const changes=[];out.evolution.push({level,route,change:null});
 for(const kind of ['wall','laser','camera']){let best=null;
  for(let y=1;y<level.map.length-1;y+=2)for(let x=1;x<level.map[0].length-1;x++)for(const dir of kind==='wall'?[null]:['W','E']){
   if(!A.allowedCell(level,x,y))continue;const change={kind,x,y,...(dir?{dir}:{})};let next;try{next=A.mutationLevel({level:A.seed(),changes},change);}catch{continue;}
   if(E.replay(next,route,'ghost').ok)continue;const r=S.solve(next,{maxTurns:A.MAX_ACTIONS,maxNodes:300000});if(!r.ok)continue;
   if(!best||r.actions.length>best.route.length)best={level:next,route:r.actions,change};}
  if(!best){console.log('no change for',kind);continue;}
  changes.push(best.change);level=best.level;route=best.route;out.evolution.push(best);console.log('revision',out.evolution.length-1,kind,best.change.x+','+best.change.y,'route',route.length);}
 for(const e of out.evolution)if(!E.replay(e.level,e.route,'ghost').ok)throw Error('evolution route fails');}
fs.writeFileSync(__dirname+'/cut-data.js','window.CUTDATA='+JSON.stringify(out)+';\n');console.log('wrote cut-data.js');
