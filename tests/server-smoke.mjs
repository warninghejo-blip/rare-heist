// Shared-mode smoke test against the real Node/SQLite server (in-memory DB).
// Two guest sessions: A opens a SPRINT round, B enters as Friend #5555 and clears it.
import {createApp} from '../server/app.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{solve}=require('./solve.cjs');
const app=createApp({dbFile:':memory:'});
await new Promise(r=>app.server?app.server.listen(0,'127.0.0.1',r):r());
const srv=app.server||app;const port=srv.address().port,origin='http://127.0.0.1:'+port;
let pass=0,fail=0;const ok=(n,c)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n);};
function client(){let cookie='',csrf='';return async(method,url,body)=>{const r=await fetch(origin+url,{method,headers:{origin,'content-type':'application/json',cookie,'x-rh-csrf':csrf},body:method==='POST'?JSON.stringify(body||{}):undefined});const sc=r.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];const j=await r.json();if(j.csrf)csrf=j.csrf;return {status:r.status,j};};}
const A=client(),B=client();
const page=await fetch(origin+'/');ok('index served with CSP allowing the Robinhood RPC',page.status===200&&/connect-src 'self' https:\/\/rpc\.mainnet\.chain\.robinhood\.com/.test(page.headers.get('content-security-policy')));
ok('session A',(await A('POST','/api/session')).status===200);ok('session B',(await B('POST','/api/session')).status===200);
const made=await A('POST','/api/rounds',{profile:'sprint'});const round=made.j.round||made.j;ok('round created: '+(round.id||JSON.stringify(made.j).slice(0,120)),made.status===200&&round.id);
const entered=await B('POST','/api/rounds/'+round.id+'/enter',{heroId:'5555'});ok('B entered: '+entered.status,entered.status===200&&entered.j.ticket);
const att=await B('GET','/api/attempts/'+entered.j.ticket);ok('attempt records Friend #5555 (got '+att.j.heroId+')',att.j.heroId==='5555');
const level=entered.j.round.level,route=solve(level,{maxNodes:400000});ok('solver route for '+level.id+' ('+route.turns+' turns)',route.ok);
await new Promise(r=>setTimeout(r,route.actions.length*90+300));
const done=await B('POST','/api/rounds/'+round.id+'/finish',{ticket:entered.j.ticket,actions:route.actions});ok('B finish accepted: '+done.status+' '+(done.j.error||done.j.result||''),done.status===200);
const r2=await A('GET','/api/rounds/'+round.id);ok('round has a leader after the clear',!!(r2.j.round||r2.j).leader);
console.log(pass+'/'+(pass+fail)+' passed');srv.close?.();process.exit(fail?1:0);
