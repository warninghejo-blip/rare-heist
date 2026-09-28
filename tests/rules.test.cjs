// Detection rules and walker guards. Loaded by tests/levels.test.cjs; also runs alone: node --test tests/rules.test.cjs
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine.js'),C=require('../src/cutaway-rules.js');
// Row 1 is a corridor (x 1..9). A ladder at x1 leads to the trophy row.
const MAP=['###########','#S........#','#.#########','#T.......E#','###########'];
const lvl=(o={})=>({id:'rules',name:'rules',map:[...MAP],lasers:[],cameras:[],guards:[],emps:1,maxAlarms:3,par:40,...o});
function run(raw,actions,mode='operative',patch=null){
 const l=E.normalize(raw);if(patch)Object.assign(l,patch);let s=E.create(l,mode);
 for(const [i,a] of actions.entries()){const r=E.step(l,s,a);assert.ok(r.changed,`action ${i} (${a}) rejected: ${r.error}`);s=r.state;}
 return s;
}
const lost=(s,kind,turn)=>{assert.equal(s.status,'lost');assert.equal(s.failure?.kind,kind);if(turn!=null)assert.equal(s.turn,turn);};
const sentinel=(extra={})=>({path:[[6,1],[7,1]],range:5,...extra}); // odd turns: at C7 looking W over C6..C2

// R1: one detection ends the job in every mode, whatever maxAlarms says.
for(const mode of ['operative','ghost']){
 test(`R1 ${mode}: a laser hit is an immediate loss`,()=>lost(run(lvl({lasers:[{x:5,y:1,dir:'W',range:3,period:4,on:4}]}),['E'],mode),'laser',1));
 test(`R1 ${mode}: a camera sighting is an immediate loss`,()=>lost(run(lvl({cameras:[{x:5,y:1,dir:'W',range:3}]}),['E'],mode),'camera',1));
 test(`R1 ${mode}: drone sight is an immediate loss`,()=>lost(run(lvl({guards:[sentinel()]}),['E'],mode),'guard',1));
 test(`R1 ${mode}: walker sight is an immediate loss`,()=>lost(run(lvl({guards:[sentinel({kind:'walker'})]}),['E'],mode),'walker',1));
}
test('R1: a level object that still carries maxAlarms 3 does not grant extra alarms',()=>{
 const s=run(lvl({lasers:[{x:5,y:1,dir:'W',range:3,period:4,on:4}]}),['E'],'operative',{maxAlarms:3});
 lost(s,'laser',1);assert.equal(s.alarms,1);assert.ok(s.events.includes('caught'));
});
test('R1: maxAlarms stays accepted in input data and is ignored',()=>{
 for(const n of [1,2,3])assert.deepEqual(E.validate(lvl({maxAlarms:n})).errors,[]);
 assert.equal(E.normalize(lvl({maxAlarms:3})).maxAlarms,1);
});
test('R1: medal is ghost (no EMP, within PAR) or clean; never escaped',()=>{
 const route=['S','S','E','E','E','E','E','E','E','E'];
 const l=E.normalize(lvl({par:10}));let s=run(lvl({par:10}),route);
 assert.equal(s.status,'won');assert.equal(s.alarms,0);assert.equal(E.medal(l,s),'ghost');
 assert.equal(E.medal(E.normalize(lvl({par:9})),s),'clean');
 s=run(lvl({par:40}),['EMP',...route]);assert.equal(s.status,'won');assert.equal(E.medal(E.normalize(lvl({par:40})),s),'clean');
 assert.ok(E.score(l,run(lvl({par:10}),route))>0);
});
test('R1: drone collision is still reported as drone',()=>lost(run(lvl({guards:[{path:[[3,1],[4,1]],range:0}]}),['E','E']),'drone',2));

// R2: walkers.
test('R2: EMP does not blind a walker (drones still pause)',()=>{
 lost(run(lvl({guards:[sentinel({kind:'walker'})]}),['EMP','E','WAIT']),'walker',3);
 assert.equal(run(lvl({guards:[sentinel()]}),['EMP','E','WAIT']).status,'playing');
});
test('R2: darkness shortens walker sight to one cell',()=>{
 assert.equal(run(lvl({lighting:{initialOn:false},guards:[sentinel({kind:'walker'})]}),['E']).status,'playing');
 lost(run(lvl({lighting:{initialOn:true},guards:[sentinel({kind:'walker'})]}),['E']),'walker',1);
});
test('R2: walker sight defaults to 3 cells (drones keep 2)',()=>{
 lost(run(lvl({guards:[{kind:'walker',path:[[6,1],[7,1]]}]}),['E','E','E']),'walker',3);
 assert.equal(run(lvl({guards:[{path:[[6,1],[7,1]]}]}),['E','E','E']).status,'playing');
});
test('R2: walker sight is blocked by walls, closed doors and crates like any ray',()=>{
 const door=lvl({map:['###########','#S..A.....#','#.#########','#T.......E#','###########'],guards:[sentinel({kind:'walker'})]});
 assert.equal(run(door,['E']).status,'playing');
});
test('R2: meeting a walker is a catch (same cell and swapped cells)',()=>{
 lost(run(lvl({guards:[{kind:'walker',path:[[3,1],[4,1]],range:0}]}),['E','E']),'walker',2);
 lost(run(lvl({guards:[{kind:'walker',path:[[2,1],[3,1]],range:0}]}),['E','E']),'walker',2);
});
test('R2: a ladder hatch hides you while a walker passes overhead',()=>{
 const raw=lvl({guards:[{kind:'walker',path:[[1,1],[2,1],[3,1],[4,1],[3,1],[2,1]],range:3}]});
 const s=run(raw,['S','WAIT','WAIT','WAIT','WAIT','WAIT','WAIT','WAIT']);assert.equal(s.status,'playing');
});
test('R2: validator keeps walkers on one floor and checks the kind',()=>{
 assert.ok(E.validate(lvl({guards:[{kind:'walker',path:[[1,1],[1,2]]}]})).errors.includes('Walker must patrol one floor'));
 assert.deepEqual(E.validate(lvl({guards:[{path:[[1,1],[1,2]]}]})).errors,[],'engine drones may still use any adjacent loop');
 assert.ok(E.validate(lvl({guards:[{kind:'robot',path:[[2,1],[3,1]]}]})).errors.includes('Invalid guard kind'));
 assert.ok(E.validate(lvl({guards:[{kind:'walker',path:[[2,1],[3,1]],circuit:0}]})).errors.includes('Walkers are not on a circuit'));
 assert.deepEqual(E.validate(lvl({guards:[{kind:'walker',path:[[2,1],[3,1]]},{kind:'drone',path:[[5,1],[6,1]]}]})).errors,[]);
});
test('R2: kind survives normalize and a workshop JSON export/import',()=>{
 const raw={...lvl({guards:[{kind:'walker',path:[[2,1],[3,1]],range:3},{path:[[5,1],[6,1]],range:2}]}),map:['###########','#S........#','#.#########','#.........#','#.#########','#T.......E#','###########']};
 const n=E.normalize(raw);assert.equal(n.guards[0].kind,'walker');assert.equal('kind' in n.guards[1],false,'drones keep their old shape');
 const back=C.normalize(JSON.parse(JSON.stringify({format:'rare-heist-cutaway-1',level:C.normalize(raw)})).level);
 assert.equal(back.guards[0].kind,'walker');assert.deepEqual(back.guards[0].path,[[2,1],[3,1]]);
});
test('R2: threats().guards keeps the render contract (x, y, dir, source)',()=>{
 const l=E.normalize(lvl({guards:[sentinel({kind:'walker'})]})),h=E.threats(l,{...E.create(l),turn:1});
 assert.deepEqual(h.guards[0],{x:7,y:1,dir:'W',i:1,source:0});
 assert.ok(h.vision.length>0&&h.vision.every(v=>v.type==='walker'&&v.source===0));
});
