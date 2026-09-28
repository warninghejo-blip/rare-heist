/* Pure UI explanations. Every next-action assessment uses the unchanged engine.
 * No solver, new game rules, account checks or reward authority lives here. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./engine.js'):root.HeistEngine);if(typeof module==='object'&&module.exports)module.exports=api;else root.HeistPlayfeel=api;})(globalThis,function(E){
 'use strict';
 // Lessons that exist in the loaded level set (drill-walker ships with the walking-guard levels).
 const PLANS=typeof module==='object'&&module.exports?(()=>{try{return require('./cutaway-levels.js');}catch{return null;}})():globalThis.HEIST_CUTAWAY_LEVELS;
 const LESSONS=Object.freeze(['cut-00','drill-pulse','drill-light','drill-weight','drill-walker'].filter(id=>!Array.isArray(PLANS)||PLANS.some(l=>l.id===id)));
 const DIR={E:'RIGHT',W:'LEFT',N:'UP',S:'DOWN'},short=(s,n=2)=>String(s).padStart(n,'0');
 // Patrols are drones unless the plan marks them kind:'walker' (a security guard on foot).
 const patrol=(l,i)=>(l.guards[i]?.kind==='walker'?'GUARD ':'DRONE ')+short(i+1);
 function floor(l,y){return y%2?'F'+((l.map.length-1)/2-(y-1)/2):'LADDER / F'+Math.ceil((l.map.length-1)/2-y/2);}
 function cameraDir(d,t){const r=d.rotation||[d.dir];return r[((Math.floor(t/(d.speed||2))+(d.phase||0))%r.length+r.length)%r.length];}
 function dormant(d,s){return d.afterRelic&&!s.relic?'ARMS WHEN TROPHY IS TAKEN':d.kind==='walker'?null:d.circuit!=null&&(s.switches&(1<<d.circuit))?'CIRCUIT '+(d.circuit+1)+' DISABLED':s.empLeft?'SENSORS PAUSED BY EMP':null;}
 function nextFlip(l,s){const on=E.lightsOn(l,s);for(let i=1;i<=Math.min(24,l.lighting?.period||1);i++)if(E.lightsOn(l,s,s.turn+i)!==on)return i;return null;}
 function sourceAt(l,before,after){
  const detection={...after,empLeft:after.empLeft+(before.empLeft>0||after.events.includes('emp')?1:0)},h=E.threats(l,detection),h0=E.threats(l,before),moved=!E.same(before,after);
  const gi=h.guards.findIndex((g,i)=>E.same(g,after)||(E.same(h0.guards[i],after)&&E.same(g,before)&&moved&&!after.events.includes('vent')));
  if(gi>=0)return {kind:'drone',id:patrol(l,gi),origin:h.guards[gi],target:{x:after.x,y:after.y},crossed:!E.same(h.guards[gi],after)};
  const laser=h.lasers.find(p=>E.same(p,after));if(laser)return {kind:'laser',id:'LASER '+short(laser.source+1),origin:l.lasers[laser.source],target:{x:after.x,y:after.y}};
  const sight=h.vision.find(p=>E.same(p,after));if(sight)return {kind:sight.type,id:sight.type==='camera'?'CAMERA '+short(sight.source+1):patrol(l,sight.source),origin:sight.type==='camera'?l.cameras[sight.source]:h.guards[sight.source],target:{x:after.x,y:after.y}};
  return null;
 }
 function preview(l,s,action){
  const q=E.step(l,s,action);if(!q.changed)return {action,changed:false,tone:'blocked',text:({blocked:'Blocked: wall, door or fixed device.',crate:'The crate has no legal space ahead.',heavy:'Trophy cannot fit in the vent.',vent:'Stand on a vent.',light:'Stand beside a light switch.',empty:'No EMP left.',finished:'This attempt is over.',action:'Unknown action.'})[q.error]||'Action unavailable.'};
  const a=q.state,source=sourceAt(l,s,a),alarm=a.alarms>s.alarms,loc=floor(l,a.y)+' / C'+a.x,at='TURN '+short(a.turn,3);
  let text=a.status==='won'?'Exit reached with the trophy.':a.failure?.kind==='lockdown'?'Escape clock expires after this action.':source?(source.crossed?'You swap cells with ':'You are in range of ')+source.id+' after security moves.':'No immediate detection after this action.';
  if(a.events.includes('relic'))text+=' Trophy pickup arms '+[...l.lasers,...l.cameras,...l.guards].filter(d=>d.afterRelic).length+' security devices.';
  return {action,changed:true,tone:a.status==='lost'?'danger':alarm?'alarm':a.status==='won'?'win':'safe',text,turn:a.turn,position:{x:a.x,y:a.y},source,heading:(DIR[action]||action)+' > '+loc+' / '+at};
 }
 function describe(l,s,p){
  if(!p||!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.x>=l.map[0].length||p.y<0||p.y>=l.map.length)return null;
  const at=floor(l,p.y)+' / COLUMN '+p.x,c=E.tile(l,p.x,p.y),li=l.lasers.findIndex(d=>E.same(d,p)),ci=l.cameras.findIndex(d=>E.same(d,p)),gi=l.guards.findIndex(d=>E.same(E.guardAt(d,s.turn),p));
  let title,body,signals=[],origin=null;
  if(li>=0){const d=l.lasers[li],off=dormant(d,s);title='LASER '+short(li+1);body=(off?off+'. ':'')+'Faces '+DIR[d.dir]+'. Fixed emitter blocks movement. Lime = live; hollow = off.';signals=Array.from({length:8},(_,i)=>({label:i===0?'NOW':String(i),on:E.active(d,s,s.turn+i)}));origin={...p};}
  else if(ci>=0){const d=l.cameras[ci],off=dormant(d,s);title='CAMERA '+short(ci+1);body=(off?off+'. ':'')+'NOW '+DIR[cameraDir(d,s.turn)]+' / NEXT '+DIR[cameraDir(d,s.turn+1)]+'. Sight '+(E.lightsOn(l,s)?d.range:Math.min(d.range,1))+' cells. The camera body is a fixed obstacle.';origin={...p};}
  else if(gi>=0){const d=l.guards[gi],n=E.guardAt(d,s.turn+1),off=dormant(d,s);title=patrol(l,gi);body=(off?off+'. ':'')+'Next position C'+n.x+' / '+floor(l,n.y)+'. '+(d.kind==='walker'?'Security guard on foot. His flashlight sees '+(d.range??3)+' cells ahead, only 1 when the lights are out, and nothing behind him. EMP does not stop him. Never touch or swap cells.':'Its body is always dangerous, even in darkness or during EMP. Never swap cells.');origin={...p};}
  else if(s.crates.some(q=>E.same(p,q))){title='PUSHABLE CRATE';body='Push from the opposite side. You cannot pull it back. Leave it on P1/P2 to hold its matching gate open.';}
  else if(c==='#'){title='SOLID WALL';body='Impassable. Use a ladder hatch to change floors.';}
  else if(!(p.y%2)){title='LADDER HATCH';body='UP / DOWN takes one step. The hatch is a real intermediate position; climb again to reach the floor.';}
  else if('ABDRGH'.includes(c)){title='DOOR '+c;body=(E.doorOpen(l,s,c)?'OPEN. ':'LOCKED. ')+({A:'Needs keycard A.',B:'Needs keycard B.',D:'Needs circuit 1 ON.',R:'Needs both the trophy and circuit 1 ON.',G:'Every P1 plate must remain occupied.',H:'Every P2 plate must remain occupied.'})[c];}
  else if(c==='l'){const flip=nextFlip(l,s);title='LIGHT SWITCH';body='LIGHTS '+(E.lightsOn(l,s)?'ON':'OFF')+(flip?' / flip in '+flip+' turn'+(flip===1?'':'s'):' / manual')+'. Press L on or beside the switch. It costs one turn. Darkness shortens sight, not lasers.';}
  else if(c==='T'){const armed=[...l.lasers,...l.cameras,...l.guards].filter(d=>d.afterRelic).length;title=s.relic?'EMPTY PEDESTAL':'TROPHY / MAIN OBJECTIVE';body='Collected on entry. '+(l.lockdown?'Starts a '+l.lockdown+'-turn escape clock. ':'')+(armed?'Arms '+armed+' security devices immediately. ':'')+(l.ventsWithRelic===false?'Too heavy for ventilation.':'Carry it to EXIT.');}
  else if(c==='E'){title='EXIT';body=s.relic?'Leave through this door to finish. Detection is checked before escape.':'You need the trophy. Intel is optional; leaving early without the trophy does not finish the job.';}
  else if(c==='a'||c==='b'){title='KEYCARD '+c.toUpperCase();body='Collected automatically. Opens every '+c.toUpperCase()+' door without consuming the card.';}
  else if(c==='1'||c==='2'){title='CIRCUIT '+c;body='Step ONTO the switch to toggle it. Staying here or waiting does not toggle again. Connected devices are disabled when ON.';}
  else if(c==='p'||c==='P'){title='PRESSURE PLATE '+(c==='p'?'P1':'P2');body='Held by you or a crate. '+(c==='p'?'G':'H')+' gates stay open only while all matching plates are held.';}
  else if(c==='v'){title='VENT';body='Stand here, then press E to use the other vent. '+(l.ventsWithRelic===false?'Cannot carry the trophy through.':'Trophy transport allowed.');}
  else if(c==='o'){const taken=!!(s.intel&(1<<E.positions(l,'o').findIndex(q=>E.same(q,p))));title=taken?'INTEL / PLANS TAKEN':'INTEL / SECURITY PLANS';body=(taken?'Taken. ':'Optional. Step onto it to take the security plans. ')+'Once you hold any plans, every patrol route (with its turn points and heading), every camera sweep and every laser clock stays drawn on the building for the rest of this job. Taking every folder earns the ALL INTEL mark.';}
  else{title=c==='S'?'ENTRY':'FLOOR';body='One cell per turn. Security moves after you. A safe next step is not a promise that the whole route is safe.';}
  const dx=p.x-s.x,dy=p.y-s.y,action=dx===0&&dy===0?'WAIT':Math.abs(dx)+Math.abs(dy)===1?(dx>0?'E':dx<0?'W':dy>0?'S':'N'):null;
  return {title,body,at,signals,origin,position:p,preview:action?preview(l,s,action):null};
 }
 function summary(l,actions,mode='operative'){
  const q=E.replay(l,actions,mode);if(!q.state||q.error?.startsWith('Invalid'))return null;const s=q.state,idx=q.states.findIndex(x=>x.events.includes('relic')),before=q.states.at(-2)||s;
  return {state:s,turns:s.turn,waits:actions.filter(a=>a==='WAIT').length,pushes:q.states.filter(x=>x.events.includes('push')).length,escapeTurns:idx>=0?s.turn-q.states[idx].turn:null,source:s.failure?sourceAt(l,before,s):null,reviewStart:Math.max(0,q.states.length-6)};
 }
 function planKey(l){const n=E.normalize(l);const str=JSON.stringify([n.map,n.lasers,n.cameras,n.guards,n.lighting,n.par,n.lockdown,n.ventsWithRelic,n.emps,n.maxAlarms]);let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
 function targets(l,s,practice=false){if(practice||s.status!=='won')return 0;return (s.alarms===0&&s.empUsed===0?1:0)|(E.positions(l,'o').length>0&&E.countIntel(s)===E.positions(l,'o').length?2:0)|(s.alarms===0&&s.empUsed===0&&s.turn<=l.par?4:0);}
 function mergeTarget(old,l,s,practice=false){const key=planKey(l),bits=targets(l,s,practice);return {key,bits:(old?.key===key&&Number.isInteger(old.bits)?old.bits&7:0)|bits};}
 function lesson(l,s,actions){const exit=E.positions(l,'E')[0],trophy=E.positions(l,'T')[0],moved=actions.some(a=>Object.hasOwn(E.DIRS,a));
  if(s.relic)return {step:l.id==='cut-00'?(s.y>1?'LEARN 4/5':'LEARN 5/5'):'EXTRACT',text:'Trophy secured. Reach EXIT. Security still advances after every step.',guide:exit};
  if(l.id==='drill-pulse')return {step:'PULSE / 2',text:actions.includes('WAIT')?'Watch the NEXT threat marks. Cross only when your arrival turn is safe.':'Press INSPECT and select the laser to read its cycle. WAIT advances it without moving.',guide:l.lasers[0]};
  if(l.id==='drill-light')return {step:'DARK / 3',text:E.lightsOn(l,s)?'The camera sees the long corridor. Stand beside L and press LIGHT to shorten its sight.':'Now the camera sees only one cell. Its body still blocks the far end. Use the ladder before it.',guide:E.lightsOn(l,s)?E.positions(l,'l')[0]:trophy};
  if(l.id==='drill-walker')return {step:'WATCH / 5',text:s.y<=1?'A guard walks the middle floor. His flashlight sees 3 cells ahead, 1 in the dark, nothing behind. EMP does not stop him.':'Wait in a ladder hatch while he walks away, then follow his back. Never step into his light.',guide:s.y<=1?{x:2,y:2}:s.y<=3?{x:5,y:4}:trophy};
  if(l.id==='drill-weight')return {step:'WEIGHT / 4',text:E.held(l,s,0)?'The crate holds P1. G is open. Collect the trophy, then return without moving the crate.':'Stand LEFT of the crate and push it onto P1. You cannot pull crates. The matching G gate opens while P1 is held.',guide:E.held(l,s,0)?trophy:E.positions(l,'p')[0]};
  return {step:!moved?'LEARN 1/5':s.y===1?'LEARN 2/5':'LEARN 3/5',text:!moved?'Move LEFT or RIGHT with the arrow keys, or click any cell to walk there.':s.y===1?'Find the ladder. UP / DOWN climbs one grid step; climb twice to reach a new floor.':'Descend to the trophy. Stepping on it collects it. Explore freely: this lesson has no guards.',guide:!moved?{x:2,y:1}:s.y===1?{x:2,y:2}:trophy};
 }
 return Object.freeze({LESSONS,floor,preview,describe,sourceAt,summary,targets,mergeTarget,planKey,lesson,nextFlip});
});
