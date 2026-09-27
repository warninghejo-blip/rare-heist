// Every authored level: engine-valid, follows the cutaway convention, clean no-EMP route exists.
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine.js'),C=require('../src/cutaway-rules.js'),levels=require('../src/cutaway-levels.js'),{solve}=require('./solve.cjs');
for(const raw of levels){
  test(raw.id+': valid and follows the cutaway convention',()=>{assert.deepEqual(C.conventionErrors(raw),[]);});
  test(raw.id+': clean route without EMP',()=>{const r=solve(raw,{maxNodes:600000});assert.ok(r.ok,'no clean route found');assert.ok(E.replay(E.normalize(raw),r.actions,'ghost').ok);});
}
test('level ids are unique',()=>{const ids=levels.map(l=>l.id);assert.equal(new Set(ids).size,ids.length);});
