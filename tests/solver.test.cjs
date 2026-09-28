// src/solver.js (the browser route finder used by the Last Heist obstacle editor) against tests/solve.cjs.
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine.js'),A=require('../src/last-heist.js'),levels=require('../src/cutaway-levels.js');
const S=require('../src/solver.js'),ref=require('./solve.cjs');

test('solver.js finds the same route as tests/solve.cjs on every shipped plan',()=>{
 for(const l of levels){const a=S.solve(l,{maxNodes:600000}),b=ref.solve(l,{maxNodes:600000});
  assert.equal(a.ok,b.ok,l.id);assert.equal(a.turns,b.turns,l.id);assert.deepEqual(a.actions,b.actions,l.id);
  if(a.ok)assert.equal(E.replay(E.normalize(l),a.actions,'ghost').ok,true,l.id+' witness replays');}
});
test('a paused search (small budgets) returns exactly the uninterrupted result',()=>{
 for(const id of ['cut-01','cut-05','last-cutaway']){const l=levels.find(x=>x.id===id),s=S.search(l,{maxNodes:600000});let r=null,calls=0;while(!r){r=s.step(7);calls++;}
  assert.ok(calls>1,id+' really paused');assert.deepEqual(r.actions,S.solve(l,{maxNodes:600000}).actions,id);}
});
// The Last Heist editor scenario: one wall that cuts the only way to the EXIT is proven unbeatable, not merely "not found".
const seed=A.seed(),round={level:seed,changes:[],referenceActions:ref.solve(seed).actions};
test('a wall that seals the EXIT is proven impossible within the server action cap',()=>{
 const l=A.mutationLevel(round,{kind:'wall',x:9,y:7}),r=S.solve(l,{maxTurns:A.MAX_ACTIONS,maxNodes:200000});
 assert.equal(r.ok,false);assert.equal(r.proven,true,'search exhausted, so no route of '+A.MAX_ACTIONS+' turns or fewer exists');assert.equal(r.pending,0);
});
test('a node cap that stops the search early is reported as unproven',()=>{
 const l=A.mutationLevel(round,{kind:'wall',x:9,y:7}),r=S.solve(l,{maxTurns:A.MAX_ACTIONS,maxNodes:20});
 assert.equal(r.ok,false);assert.equal(r.proven,false);assert.ok(r.pending>0);
});
test('some allowed wall breaks the last winning route and still leaves a route',()=>{
 let found=null;for(let y=1;y<seed.map.length-1&&!found;y+=2)for(let x=1;x<seed.map[0].length-1&&!found;x++){if(!A.allowedCell(seed,x,y))continue;let l;try{l=A.checkMutation(round,{kind:'wall',x,y});}catch{continue;}const r=S.solve(l,{maxTurns:A.MAX_ACTIONS});if(r.ok)found={x,y,r,l};}
 assert.ok(found,'a harmless, route-breaking wall exists on the seed vault');
 assert.equal(E.replay(found.l,round.referenceActions,'ghost').ok,false,'the previous route no longer works');
 assert.equal(E.replay(found.l,found.r.actions,'ghost').ok,true,'the solver witness clears the changed vault');
 assert.ok(found.r.actions.length<=A.MAX_ACTIONS);
});
test('run() slices the work and reports once',async()=>{
 // A fake clock that allows one 250-node chunk per slice: cut-12 needs about 4,600 expansions, so it must yield.
 const l=levels.find(x=>x.id==='cut-12');let slices=0,t=0;
 const r=await new Promise(done=>S.run(l,{maxNodes:600000},{sliceMs:1,now:()=>(t+=.5),onProgress:()=>slices++,onDone:done}));
 assert.equal(r.ok,true);assert.ok(slices>5,'yielded between slices ('+slices+')');assert.deepEqual(r.actions,S.solve(l,{maxNodes:600000}).actions);
 const late=await new Promise(done=>S.run(l,{maxNodes:600000},{sliceMs:1,timeoutMs:0,onDone:done}));
 assert.equal(late.ok,false);assert.equal(late.timeout,true);assert.equal(late.proven,false);
});
