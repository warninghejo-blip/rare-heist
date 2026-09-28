// Every authored level: engine-valid, follows the cutaway convention, clean no-EMP route exists.
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine.js'),C=require('../src/cutaway-rules.js'),levels=require('../src/cutaway-levels.js'),{solve}=require('./solve.cjs');
const {bfs}=require('./levels-review.cjs');
for(const raw of levels){
  test(raw.id+': valid and follows the cutaway convention',()=>{assert.deepEqual(C.conventionErrors(raw),[]);});
  test(raw.id+': clean route without EMP',()=>{const r=solve(raw,{maxNodes:600000});assert.ok(r.ok,'no clean route found');assert.ok(E.replay(E.normalize(raw),r.actions,'ghost').ok);
    assert.ok(raw.par>=r.turns&&raw.par<=Math.round(r.turns*1.15)+1,`PAR ${raw.par} must be reachable and within ~15% of the solver route (${r.turns})`);});
}
test('level ids are unique',()=>{const ids=levels.map(l=>l.id);assert.equal(new Set(ids).size,ids.length);});
// Walkers (human guards) are part of the campaign, and every walker changes the best route.
const walkerLevels=levels.filter(l=>(l.guards||[]).some(g=>g.kind==='walker'));
test('walkers guard at least six campaign jobs and one lesson',()=>{
  assert.ok(walkerLevels.filter(l=>/^(cut-(0[1-9]|1\d)|annex-)/.test(l.id)).length>=6);
  assert.ok(walkerLevels.some(l=>l.id.startsWith('drill-')));
});
for(const raw of walkerLevels)test(raw.id+': its walkers make the optimal route longer',()=>{
  const without={...JSON.parse(JSON.stringify(raw)),guards:raw.guards.filter(g=>g.kind!=='walker')};
  const a=bfs(raw),b=bfs(without);assert.ok(a.ok&&b.ok);assert.ok(a.turns>b.turns,`${a.turns} vs ${b.turns} without walkers`);
});
require('./rules.test.cjs');
