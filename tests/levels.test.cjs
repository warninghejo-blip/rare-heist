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
// Daily Heist plans (src/daily-levels.js): not in the campaign; same convention, clean no-EMP route, PAR = round(1.15 x best).
const daily=require('../src/daily-levels.js');
test('daily plans: 30 levels, ids daily-01..30, none of them in the campaign list',()=>{
  assert.deepEqual(daily.map(l=>l.id),Array.from({length:30},(_,i)=>'daily-'+String(i+1).padStart(2,'0')));
  assert.ok(daily.every(l=>!levels.some(c=>c.id===l.id)));
});
for(const raw of daily)test(raw.id+': daily plan valid, clean without EMP, PAR from best',()=>{
  assert.deepEqual(C.conventionErrors(raw),[]);assert.equal(raw.emps,0);
  const r=solve(raw,{maxNodes:900000});assert.ok(r.ok,'no clean route found');assert.ok(E.replay(E.normalize(raw),r.actions,'ghost').ok);
  assert.ok(r.turns>=raw.best,'witness cannot beat the exact best');assert.equal(raw.par,Math.round(raw.best*1.15));assert.ok(raw.par>=r.turns);
});
require('./rules.test.cjs');
