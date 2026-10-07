// Generated pure game rules for browser + Nakama.
const scope={};
(function(globalThis){const module=undefined,exports=undefined,require=undefined;
/* Rare Heist — deterministic, dependency-free rules. No network, wallet or money code. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HeistEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DIRS = {N:[0,-1], E:[1,0], S:[0,1], W:[-1,0]};
  const ACTIONS = ['N','E','S','W','WAIT','VENT','EMP','LIGHT'];
  const TILES = '#.SETaboAB12pPGHCDvRl';
  const xy = (x,y) => `${x},${y}`;
  const same = (a,b) => a.x===b.x && a.y===b.y;
  const tile = (l,x,y) => l.map[y]?.[x] || '#';
  const positions = (l,c) => { const a=[]; l.map.forEach((r,y)=>[...r].forEach((t,x)=>{if(t===c)a.push({x,y});})); return a; };
  const copy = s => ({...s, crates:s.crates.map(p=>({...p})), events:[]});
  const mod = (x,n) => ((x%n)+n)%n;
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  const lcm=(a,b)=>a*b/gcd(a,b);
  function validate(raw) {
    const errors=[];
    if(!raw || typeof raw!=='object' || Array.isArray(raw))return {ok:false,errors:['Invalid level object']};
    if(!Array.isArray(raw.map)||raw.map.length<5||raw.map.length>15||raw.map.some(r=>typeof r!=='string'))return {ok:false,errors:['Map must have 5–15 string rows']};
    const w=raw.map[0].length,h=raw.map.length;
    if(w<5||w>15||raw.map.some(r=>r.length!==w))errors.push('Map must be rectangular, 5–15 columns');
    if(raw.map.some(r=>[...r].some(c=>!TILES.includes(c))))errors.push('Unknown tile');
    for(const c of ['S','E','T'])if(positions(raw,c).length!==1)errors.push(`Exactly one ${c} is required`);
    if(positions(raw,'v').length!==0&&positions(raw,'v').length!==2)errors.push('Use exactly two vents');
    if(positions(raw,'C').length>3)errors.push('Maximum three crates');
    if(positions(raw,'o').length>12)errors.push('Maximum twelve intel chips');
    if(raw.map[0]!== '#'.repeat(w)||raw.map[h-1]!== '#'.repeat(w)||raw.map.some(r=>r[0]!=='#'||r[w-1]!=='#'))errors.push('Close the outer wall');
    const devicePositions=new Set();
    for(const key of ['lasers','cameras','guards']){
      const ds=raw[key]||[];
      if(!Array.isArray(ds)||ds.length>12){errors.push(`Invalid ${key}`);continue;}
      for(const d of ds){
        if(!d||typeof d!=='object'){errors.push(`Invalid ${key} item`);continue;}
        if(key==='guards'){
          if(d.kind!=null&&d.kind!=='drone'&&d.kind!=='walker')errors.push('Invalid guard kind');
          if(d.range!=null&&(!Number.isInteger(d.range)||d.range<0||d.range>14))errors.push('Guard range must be 0–14');
          if(!Array.isArray(d.path)||d.path.length<2||d.path.length>24||d.path.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isInteger)||p[0]<1||p[1]<1||p[0]>=w-1||p[1]>=h-1||tile(raw,p[0],p[1])==='#'))errors.push('Guard path must stay on the floor');
          else{
            for(let i=0;i<d.path.length;i++){const p=d.path[i],q=d.path[(i+1)%d.path.length];if(Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])>1)errors.push('Guard path must loop using adjacent cells');}
            // A walker is a person: one floor, no ladders or vents, and no power circuit to cut.
            if(d.kind==='walker'&&d.path.some(p=>p[1]!==d.path[0][1]))errors.push('Walker must patrol one floor');
          }
          if(d.kind==='walker'&&d.circuit!=null)errors.push('Walkers are not on a circuit');
        }else{
          if(!Number.isInteger(d.x)||!Number.isInteger(d.y)||d.x<1||d.y<1||d.x>=w-1||d.y>=h-1)errors.push('Device out of bounds');
          if(typeof d.dir!=='string'||!Object.hasOwn(DIRS,d.dir))errors.push('Invalid device direction');
          if(!Number.isInteger(d.range)||d.range<1||d.range>14)errors.push('Device range must be 1–14');
          const pos=xy(d.x,d.y);if(devicePositions.has(pos))errors.push('Devices overlap');devicePositions.add(pos);
          if('SETabo12pPGHCDvRl'.includes(tile(raw,d.x,d.y)))errors.push('Device overlaps an important tile');
        }
        if(d.period!=null&&(!Number.isInteger(d.period)||d.period<2||d.period>12))errors.push('Period must be 2–12');
        if(d.on!=null&&(!Number.isInteger(d.on)||d.on<1||d.on>(d.period||4)))errors.push('On duration must not exceed its period');
        if(d.afterRelic!=null&&typeof d.afterRelic!=='boolean')errors.push('afterRelic must be boolean');
        if(d.phase!=null&&(!Number.isInteger(d.phase)||Math.abs(d.phase)>100))errors.push('Invalid phase');
        if(d.circuit!=null&&d.circuit!==0&&d.circuit!==1)errors.push('Invalid circuit');
        if(d.speed!=null&&(!Number.isInteger(d.speed)||d.speed<1||d.speed>4))errors.push('Invalid guard/camera speed');
        if(d.rotation!=null&&(!Array.isArray(d.rotation)||d.rotation.length>8||d.rotation.length<1||d.rotation.some(x=>typeof x!=='string'||!Object.hasOwn(DIRS,x))))errors.push('Invalid rotation');
      }
    }
    for(const g of Array.isArray(raw.guards)?raw.guards:[])if(g&&Array.isArray(g.path)&&g.path.some(p=>Array.isArray(p)&&devicePositions.has(xy(p[0],p[1]))))errors.push('Guard path overlaps a fixed device');
    if(raw.lighting!=null){
      const q=raw.lighting;
      if(typeof q!=='object'||Array.isArray(q))errors.push('Invalid lighting');
      else {
        if(typeof q.initialOn!=='boolean')errors.push('Light initialOn must be boolean');
        if(q.period!=null&&(!Number.isInteger(q.period)||q.period<2||q.period>12))errors.push('Light period must be 2–12');
        if(q.on!=null&&(!Number.isInteger(q.on)||q.on<1||q.on>=(q.period||4)))errors.push('Light on time must be shorter than its period');
        if(q.phase!=null&&(!Number.isInteger(q.phase)||q.phase<0||q.phase>100))errors.push('Invalid light phase');
      }
    }
    if(raw.ventsWithRelic!=null&&typeof raw.ventsWithRelic!=='boolean')errors.push('ventsWithRelic must be boolean');
    if(raw.lockdown!=null&&(!Number.isInteger(raw.lockdown)||raw.lockdown<6||raw.lockdown>200))errors.push('Lockdown must be 6–200 turns');
    if(raw.emps!=null&&(!Number.isInteger(raw.emps)||raw.emps<0||raw.emps>3))errors.push('EMP stock must be 0–3');
    // maxAlarms is a legacy field (old workshop maps). Any detection now ends the job, so it is accepted and ignored.
    if(raw.name!=null&&(typeof raw.name!=='string'||raw.name.length>80))errors.push('Invalid name');
    return {ok:errors.length===0, errors:[...new Set(errors)]};
  }
  function normalize(raw) {
    const valid=validate(raw);if(!valid.ok)throw new Error(valid.errors.join('; '));
    // Whitelist data. Imported maps never contain executable scripts or HTML.
    const l={id:String(raw.id||'custom').slice(0,40),name:raw.name||'Untitled vault',map:[...raw.map],
      nameEn:String(raw.nameEn||raw.name||'Untitled vault').slice(0,80),
      desc:String(raw.desc||'').slice(0,500),descEn:String(raw.descEn||raw.desc||'').slice(0,500),
      hint:String(raw.hint||'').slice(0,500),hintEn:String(raw.hintEn||raw.hint||'').slice(0,500),
      tag:String(raw.tag||'CUSTOM').slice(0,30),emps:raw.emps??1,maxAlarms:1,
      par:Number.isInteger(raw.par)?Math.max(1,Math.min(999,raw.par)):80,
      lockdown:raw.lockdown??null,ventsWithRelic:raw.ventsWithRelic!==false,
      lasers:[],cameras:[],guards:[]};
    for(const k of ['lasers','cameras','guards'])for(const d of raw[k]||[]){
      const n={};for(const v of ['x','y','dir','range','period','on','phase','circuit','speed'])if(d[v]!=null)n[v]=d[v];
      if(d.afterRelic)n.afterRelic=true;
      if(k==='guards'&&d.kind==='walker')n.kind='walker'; // drones keep their original shape (no kind)
      if(d.rotation)n.rotation=[...d.rotation];if(d.path)n.path=d.path.map(p=>[...p]);
      l[k].push(n);
    }
    if(raw.lighting)l.lighting={initialOn:raw.lighting.initialOn,...(raw.lighting.period?{period:raw.lighting.period,on:raw.lighting.on??Math.max(1,Math.floor(raw.lighting.period/2)),phase:raw.lighting.phase||0}:{})};
    return l;
  }
  function create(l,mode='operative'){
    const start=positions(l,'S')[0];
    return {x:start.x,y:start.y,turn:0,keys:0,switches:0,relic:false,intel:0,
      crates:positions(l,'C'),alarms:0,emps:l.emps??1,empLeft:0,empUsed:0,
      ...(l.lighting?{lightOverride:false}:{}),lockdownLeft:null,mode:mode==='ghost'?'ghost':'operative',failure:null,status:'playing',facing:'down',events:[]};
  }
  function held(l,s,c){
    const plates=positions(l,c===0?'p':'P');
    return plates.length>0&&plates.every(p=>same(p,s)||s.crates.some(q=>same(p,q)));
  }
  function doorOpen(l,s,c){
    if(c==='A')return !!(s.keys&1);if(c==='B')return !!(s.keys&2);
    if(c==='G')return held(l,s,0);if(c==='H')return held(l,s,1);
    if(c==='D')return !!(s.switches&1);
    if(c==='R')return s.relic && !!(s.switches&1);
    return true;
  }
  function deviceAt(l,x,y){return [...l.lasers,...l.cameras].some(d=>d.x===x&&d.y===y);}
  function solid(l,s,x,y,crates=true){
    const c=tile(l,x,y);return c==='#'||!doorOpen(l,s,c)||deviceAt(l,x,y)||(crates&&s.crates.some(p=>p.x===x&&p.y===y));
  }
  function guardAt(d,turn){
    const speed=d.speed||1,i=mod(Math.floor(turn/speed)+(d.phase||0),d.path.length);
    const p=d.path[i];let j=(i+1)%d.path.length;
    for(let k=0;k<d.path.length&&d.path[j][0]===p[0]&&d.path[j][1]===p[1];k++)j=(j+1)%d.path.length;
    const q=d.path[j],dx=q[0]-p[0],dy=q[1]-p[1];
    return {x:p[0],y:p[1],dir:Math.abs(dx)>Math.abs(dy)?(dx>0?'E':'W'):(dy>0?'S':'N'),i};
  }
  function sensorsPaused(s,turn=s.turn){return s.empLeft>Math.max(0,turn-s.turn-1);}
  function active(d,s,turn=s.turn){
    if(sensorsPaused(s,turn))return false;
    if(d.afterRelic&&!s.relic)return false;
    if(d.circuit!=null&&(s.switches&(1<<d.circuit)))return false;
    return mod(turn+(d.phase||0),d.period||4)<(d.on||2);
  }
  function ray(l,s,x,y,dir,range){
    const a=[],[dx,dy]=DIRS[dir];
    for(let i=1;i<=range;i++){
      const xx=x+dx*i,yy=y+dy*i;
      if(solid(l,s,xx,yy))break;
      a.push({x:xx,y:yy});
    }
    return a;
  }
  // Darkness shortens optical sight only. Lasers and drone bodies remain dangerous.
  function lightsOn(l,s,atTurn=s.turn){
    const q=l.lighting;if(!q)return true;
    const scheduled=q.period?mod(atTurn+(q.phase||0),q.period)<q.on:q.initialOn;
    const base=q.period?(q.initialOn?scheduled:!scheduled):scheduled;
    return s.lightOverride?!base:base;
  }
  function canToggleLight(l,s){return !!l.lighting&&positions(l,'l').some(p=>Math.abs(p.x-s.x)+Math.abs(p.y-s.y)<=1);}
  function sightRange(l,s,range,turn){return lightsOn(l,s,turn)?range:Math.min(range,1);}
  function threats(l,s,atTurn=s.turn){
    const lasers=[],vision=[],guards=[];
    l.lasers.forEach((d,i)=>{if(active(d,s,atTurn))for(const p of ray(l,s,d.x,d.y,d.dir,d.range))lasers.push({...p,source:i});});
    l.cameras.forEach((d,i)=>{
      if(sensorsPaused(s,atTurn)||(d.afterRelic&&!s.relic)||(d.circuit!=null&&(s.switches&(1<<d.circuit))))return;
      const ro=d.rotation||[d.dir],dir=ro[mod(Math.floor(atTurn/(d.speed||2))+(d.phase||0),ro.length)];
      for(const p of ray(l,s,d.x,d.y,dir,sightRange(l,s,d.range,atTurn)))vision.push({...p,source:i,type:'camera'});
    });
    l.guards.forEach((d,i)=>{
      const p=guardAt(d,atTurn),walker=d.kind==='walker';guards.push({...p,source:i});
      if(d.range===0||(d.afterRelic&&!s.relic))return;
      // Drones are electronics: EMP and their circuit blind them. A walker is a person: only darkness shortens his sight.
      if(!walker&&(sensorsPaused(s,atTurn)||(d.circuit!=null&&(s.switches&(1<<d.circuit)))))return;
      for(const q of ray(l,s,p.x,p.y,p.dir,sightRange(l,s,walker?(d.range??3):(d.range||2),atTurn)))vision.push({...q,source:i,type:walker?'walker':'guard'});
    });
    return {lasers,vision,guards};
  }
  function interact(l,s){return tile(l,s.x,s.y)==='v';}
  function step(l,state,action){
    if(!ACTIONS.includes(action))return {state,changed:false,error:'action'};
    if(state.status!=='playing')return {state,changed:false,error:'finished'};
    const s=copy(state),old={x:s.x,y:s.y};let pushed=null;
    if(DIRS[action]){
      const [dx,dy]=DIRS[action],x=s.x+dx,y=s.y+dy;
      const ci=s.crates.findIndex(p=>p.x===x&&p.y===y);
      if(ci>=0){
        const nx=x+dx,ny=y+dy;
        if(solid(l,s,nx,ny)||'TEv'.includes(tile(l,nx,ny))||l.guards.some(g=>same(guardAt(g,s.turn),{x:nx,y:ny})))return {state,changed:false,error:'crate'};
        s.crates[ci]={x:nx,y:ny};pushed=s.crates[ci];s.events.push('push');
      }else if(solid(l,s,x,y))return {state,changed:false,error:'blocked'};
      s.x=x;s.y=y;s.facing={N:'up',E:'right',S:'down',W:'left'}[action];
    }else if(action==='VENT'){
      const vents=positions(l,'v');
      if(tile(l,s.x,s.y)!=='v'||vents.length!==2)return {state,changed:false,error:'vent'};
      if(s.relic&&!l.ventsWithRelic)return {state,changed:false,error:'heavy'};
      const dest=vents.find(p=>!same(p,s));
      if(solid(l,s,dest.x,dest.y))return {state,changed:false,error:'blocked'};
      s.x=dest.x;s.y=dest.y;s.events.push('vent');
    }else if(action==='LIGHT'){
      if(!canToggleLight(l,s))return {state,changed:false,error:'light'};
      s.lightOverride=!s.lightOverride;s.events.push('light');
    }else if(action==='EMP'){
      if(s.emps<=0)return {state,changed:false,error:'empty'};
      s.emps--;s.empLeft=4;s.empUsed++;s.events.push('emp');
    }
    // Tile effects happen on entry, then security advances, then detection, then exit.
    const c=tile(l,s.x,s.y),moved=!same(old,s);
    if((c==='G'||c==='H')&&!doorOpen(l,s,c))return {state,changed:false,error:'blocked'};
    if(c==='a'&&!(s.keys&1)){s.keys|=1;s.events.push('key');}
    if(c==='b'&&!(s.keys&2)){s.keys|=2;s.events.push('key');}
    if((c==='1'||c==='2')&&moved){s.switches^=1<<(c==='1'?0:1);s.events.push('switch');}
    if(pushed&&!doorOpen(l,s,tile(l,pushed.x,pushed.y)))return {state,changed:false,error:'crate'};
    let tookRelic=false;
    if(c==='T'&&!s.relic){s.relic=true;tookRelic=true;s.lockdownLeft=l.lockdown;s.events.push('relic');}
    if(c==='o'){
      const i=positions(l,'o').findIndex(p=>same(p,s));
      if(!(s.intel&(1<<i))){s.intel|=1<<i;s.events.push('intel');}
    }
    s.turn++;
    if(s.lockdownLeft!=null&&!tookRelic)s.lockdownLeft--;
    if(l.lighting&&lightsOn(l,state)!==lightsOn(l,s))s.events.push(lightsOn(l,s)?'lights-on':'lights-off');
    const h=threats(l,s),h0=threats(l,state);
    const hit=h.guards.findIndex((g,i)=>same(g,s)||(same(h0.guards[i],s)&&same(g,old)&&moved&&action!=='VENT'));
    const spotted=h.lasers.some(p=>same(p,s))||h.vision.some(p=>same(p,s));
    if(hit>=0){s.status='lost';s.failure={kind:l.guards[hit].kind==='walker'?'walker':'drone',turn:s.turn,x:s.x,y:s.y};s.events.push('caught');}
    else if(spotted){
      // Any detection fails the job at once, in every mode. maxAlarms is ignored.
      s.alarms++;s.events.push('alarm');
      s.status='lost';s.failure={kind:h.lasers.some(p=>same(p,s))?'laser':h.vision.find(p=>same(p,s))?.type||'camera',turn:s.turn,x:s.x,y:s.y};s.events.push('caught');
    }
    // A drone's physical hull remains solid during EMP; its sensors, lasers and cameras pause.
    if(s.status==='playing'&&c==='E'&&s.relic){s.status='won';s.events.push('escape');}
    if(s.status==='playing'&&s.lockdownLeft!=null&&s.lockdownLeft<=0){s.status='lost';s.failure={kind:'lockdown',turn:s.turn,x:s.x,y:s.y};s.events.push('lockdown');}
    if(s.empLeft>0)s.empLeft--;
    return {state:s,changed:true,error:null};
  }
  function replay(l,actions,mode='operative'){
    if(!Array.isArray(actions)||actions.length>3000)return {ok:false,error:'Too many actions'};
    let s=create(l,mode);const states=[s];
    for(let i=0;i<actions.length;i++){
      const r=step(l,s,actions[i]);if(!r.changed)return {ok:false,error:`Invalid action at ${i}`,state:s,states};
      s=r.state;states.push(s);
    }
    return {ok:s.status==='won',state:s,states,error:s.status==='won'?null:'Not completed'};
  }
  function period(l){let n=l.lighting?.period||1;
    for(const d of l.lasers)n=lcm(n,d.period||4);
    for(const d of l.cameras)n=lcm(n,(d.rotation||[d.dir]).length*(d.speed||2));
    for(const d of l.guards)n=lcm(n,d.path.length*(d.speed||1));
    return n;
  }
  function countIntel(s){let n=0,b=s.intel;while(b){n+=b&1;b>>>=1;}return n;}
  function score(l,s){
    if(s.status!=='won')return 0;
    return Math.max(1,1000+countIntel(s)*150+(s.mode==='ghost'?200:0)-s.alarms*180-s.empUsed*60-Math.max(0,s.turn-l.par)*8);
  }
  // A won job never has alarms: 'ghost' = no EMP and within PAR, otherwise 'clean'.
  function medal(l,s){if(s.status!=='won')return null;return s.empUsed===0&&s.turn<=l.par?'ghost':'clean';}
  return {DIRS,ACTIONS,tile,positions,validate,normalize,create,step,replay,threats,ray,solid,held,doorOpen,deviceAt,guardAt,active,sensorsPaused,period,countIntel,score,medal,interact,xy,same,lightsOn,canToggleLight};
});

/* Design A geometry validation. Pure data checks, shared by editor and server.
   Does not change HeistEngine's rules or original sprite artwork. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./engine.js'):root.HeistEngine);if(typeof module==='object'&&module.exports)module.exports=api;else root.CutawayRules=api;})(globalThis,function(E){
 'use strict';
 function conventionErrors(raw){
  const v=E.validate(raw);if(!v.ok)return v.errors;
  const errors=[],h=raw.map.length,w=raw.map[0].length;
  if(h%2!==1||h<7||h>13)errors.push('Use 3 to 6 floors (7 to 13 alternating rows).');
  for(let y=2;y<h-1;y+=2)for(let x=1;x<w-1;x++){
   const c=E.tile(raw,x,y);if(!'#.'.includes(c))errors.push('Slabs accept only a wall or ladder hatch.');
   if(c==='.'&&[y-1,y+1].some(yy=>E.tile(raw,x,yy)==='#'))errors.push('A ladder must connect two open landings.');
   if(c==='.'&&(E.tile(raw,x-1,y)==='.'||E.tile(raw,x+1,y)==='.'))errors.push('Separate ladder shafts by at least one slab column.');
  }
  for(const d of [...(raw.lasers||[]),...(raw.cameras||[])]){
   if(d.y%2!==1||E.tile(raw,d.x,d.y)!=='.')errors.push('Fixed devices need an empty floor tile.');
   if(E.tile(raw,d.x,d.y-1)==='.'||E.tile(raw,d.x,d.y+1)==='.')errors.push('A device cannot obstruct a ladder landing.');
  }
  for(const g of raw.guards||[])if(g.path.some(p=>p[1]%2!==1||p[1]!==g.path[0][1]))errors.push('Drone patrols must stay on a single floor.');
  if(E.period(E.normalize(raw))>720)errors.push('Combined security cycle is too long (maximum 720 turns).');
  return [...new Set(errors)];
 }
 function validate(raw){const errors=conventionErrors(raw);return {ok:!errors.length,errors};}
 function landing(l,x,y){return y%2===1&&(E.tile(l,x,y-1)==='.'||E.tile(l,x,y+1)==='.');}
 function normalize(raw){const v=validate(raw);if(!v.ok)throw Error(v.errors.join(' '));return E.normalize(raw);}
 function blank(floors=4,width=13){floors=Math.max(3,Math.min(6,Math.floor(Number(floors))||4));width=Math.max(9,Math.min(15,Math.floor(Number(width))||13));const rows=2*floors+1,map=Array.from({length:rows},(_,y)=>y%2?'#'+'.'.repeat(width-2)+'#':'#'.repeat(width));for(let y=2;y<rows-1;y+=2){const r=[...map[y]];r[2]='.';r[width-3]='.';map[y]=r.join('');}function put(x,y,c){const r=[...map[y]];r[x]=c;map[y]=r.join('');}put(1,1,'S');put(width-2,1,'E');put(Math.floor(width/2),rows-2,'T');return E.normalize({id:'custom-cutaway',name:'My Cutaway',tag:'WORKSHOP',map,lasers:[],cameras:[],guards:[],emps:1,maxAlarms:2,par:80});}
 return Object.freeze({conventionErrors,validate,normalize,landing,blank});
});

/* Authored cutaway plans. Pure engine data. PAR is based on a verified route, not a shortest-path claim. */
(function(r){const levels=[
 {
  "id": "cut-00",
  "name": "The First Job",
  "nameEn": "The First Job",
  "tag": "TRAINING",
  "map": [
   "#############",
   "#S....#....E#",
   "##.#######.##",
   "#...........#",
   "###.#####.###",
   "#....T......#",
   "#############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 21,
  "lasers": [],
  "cameras": [],
  "guards": [],
  "desc": "Walk the floor. Find a ladder. Take the trophy downstairs and return to the EXIT.",
  "hint": "Up and down work only at a ladder. Each rung is one turn. Nothing moves until you do.",
  "descEn": "Walk the floor. Find a ladder. Take the trophy downstairs and return to the EXIT.",
  "hintEn": "Up and down work only at a ladder. Each rung is one turn. Nothing moves until you do."
 },
 {
  "id": "cut-01",
  "name": "Night Gallery",
  "nameEn": "Night Gallery",
  "tag": "PATROL / VENTS",
  "map": [
   "###############",
   "#S.......o.#.E#",
   "#.##########.##",
   "#.l...a.......#",
   "#######.#######",
   "#.v.....A.....#",
   "##########.##.#",
   "#.v..T........#",
   "###############"
  ],
  "emps": 1,
  "maxAlarms": 2,
  "par": 53,
  "lasers": [
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 2,
    "period": 4,
    "on": 2,
    "phase": 0
   }
  ],
  "cameras": [
   {
    "x": 10,
    "y": 1,
    "dir": "W",
    "range": 5,
    "rotation": [
     "W",
     "S"
    ],
    "speed": 2
   }
  ],
  "guards": [
   {
    "path": [
     [
      4,
      7
     ],
     [
      5,
      7
     ],
     [
      6,
      7
     ],
     [
      7,
      7
     ],
     [
      8,
      7
     ],
     [
      9,
      7
     ],
     [
      10,
      7
     ],
     [
      11,
      7
     ],
     [
      12,
      7
     ],
     [
      11,
      7
     ],
     [
      10,
      7
     ],
     [
      9,
      7
     ],
     [
      8,
      7
     ],
     [
      7,
      7
     ],
     [
      6,
      7
     ],
     [
      5,
      7
     ]
    ],
    "range": 2,
    "phase": 9
   }
  ],
  "desc": "A card on F3. A trophy on F1, inside the drone patrol. Slip in through the vent and hide on ladder hatches.",
  "hint": "The trophy cannot use the vent. Vent in while the drone heads east, then follow it out by the ladder at column 10.",
  "ventsWithRelic": false,
  "lighting": {
   "initialOn": true
  },
  "descEn": "A card on F3. A trophy on F1, inside the drone patrol. Slip in through the vent and hide on ladder hatches.",
  "hintEn": "The trophy cannot use the vent. Vent in while the drone heads east, then follow it out by the ladder at column 10."
 },
 {
  "id": "cut-02",
  "name": "Between the Pulses",
  "nameEn": "Between the Pulses",
  "tag": "LASER TIMING",
  "map": [
   "#############",
   "#S.........E#",
   "##.######.###",
   "#....#......#",
   "###.#####.###",
   "#....To.....#",
   "#############"
  ],
  "emps": 1,
  "maxAlarms": 2,
  "par": 26,
  "lasers": [
   {
    "x": 4,
    "y": 3,
    "dir": "W",
    "range": 2,
    "period": 6,
    "on": 2,
    "phase": 2
   },
   {
    "x": 10,
    "y": 5,
    "dir": "W",
    "range": 3,
    "period": 6,
    "on": 2,
    "phase": 5
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "Two laser clocks. Descend on a safe beat, cross the middle floor and choose a clean return.",
  "hint": "Dashed edges show NEXT turn. WAIT advances security without moving you.",
  "descEn": "Two laser clocks. Descend on a safe beat, cross the middle floor and choose a clean return.",
  "hintEn": "Dashed edges show NEXT turn. WAIT advances security without moving you."
 },
 {
  "id": "cut-03",
  "name": "Borrowed Credentials",
  "nameEn": "Borrowed Credentials",
  "tag": "KEYCARD A",
  "map": [
   "#############",
   "#S.......A.E#",
   "##.#####.####",
   "#....a....o.#",
   "###.#####.###",
   "#.T.........#",
   "#############"
  ],
  "emps": 1,
  "maxAlarms": 2,
  "par": 35,
  "lasers": [
   {
    "x": 11,
    "y": 5,
    "dir": "W",
    "range": 2,
    "period": 4,
    "on": 2,
    "phase": 1
   }
  ],
  "cameras": [
   {
    "x": 7,
    "y": 3,
    "dir": "W",
    "range": 3,
    "rotation": [
     "W",
     "E"
    ],
    "speed": 3
   }
  ],
  "guards": [],
  "desc": "The exit accepts card A. Pick it up before you commit to the lower floor.",
  "hint": "Cards open doors automatically. A ceiling camera occupies its mounting tile.",
  "descEn": "The exit accepts card A. Pick it up before you commit to the lower floor.",
  "hintEn": "Cards open doors automatically. A ceiling camera occupies its mounting tile."
 },
 {
  "id": "cut-04",
  "name": "Two Names, One Exit",
  "nameEn": "Two Names, One Exit",
  "tag": "TWO KEYS",
  "map": [
   "#############",
   "#S.....#B..E#",
   "##.#####.####",
   "#.....a.....#",
   "#######.##.##",
   "#.b.A.......#",
   "##########.##",
   "#.T......o..#",
   "#############"
  ],
  "emps": 1,
  "maxAlarms": 2,
  "par": 66,
  "lasers": [
   {
    "x": 11,
    "y": 3,
    "dir": "W",
    "range": 2,
    "period": 6,
    "on": 2,
    "phase": 2
   },
   {
    "x": 11,
    "y": 7,
    "dir": "W",
    "range": 3,
    "period": 6,
    "on": 2,
    "phase": 0
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "Borrow A to reach B. The lift is out: every detour must use the stairs.",
  "hint": "The western ladder bypasses the A door but the east side contains the second card.",
  "descEn": "Borrow A to reach B. The lift is out: every detour must use the stairs.",
  "hintEn": "The western ladder bypasses the A door but the east side contains the second card."
 },
 {
  "id": "cut-05",
  "name": "Weight of Evidence",
  "nameEn": "Weight of Evidence",
  "tag": "CRATE / GUARD",
  "map": [
   "#############",
   "#S.........E#",
   "###.######.##",
   "#.........o.#",
   "#####.#######",
   "#.p.C..G..T.#",
   "#############"
  ],
  "emps": 1,
  "maxAlarms": 2,
  "par": 43,
  "lasers": [],
  "cameras": [],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      4,
      3
     ],
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      9,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ],
     [
      5,
      3
     ]
    ],
    "range": 3,
    "phase": 7
   }
  ],
  "desc": "The only way into the lower vault is through G. A night guard walks the middle floor. Push the crate onto P1 and leave it there while you extract.",
  "hint": "A guard sees three cells ahead and nothing behind. Follow his back while he walks away; wait on a ladder hatch while he passes over you. Push the crate left onto P1.",
  "descEn": "The only way into the lower vault is through G. A night guard walks the middle floor. Push the crate onto P1 and leave it there while you extract.",
  "hintEn": "A guard sees three cells ahead and nothing behind. Follow his back while he walks away; wait on a ladder hatch while he passes over you. Push the crate left onto P1."
 },
 {
  "id": "cut-06",
  "name": "Cut the Feed",
  "nameEn": "Cut the Feed",
  "tag": "CIRCUIT / GUARD",
  "map": [
   "#############",
   "#S.......D.E#",
   "##.#######.##",
   "#1..........#",
   "###.#####.###",
   "#...#..o....#",
   "##.#######.##",
   "#.....T.....#",
   "#############"
  ],
  "emps": 1,
  "maxAlarms": 2,
  "par": 39,
  "lasers": [
   {
    "x": 1,
    "y": 5,
    "dir": "E",
    "range": 2,
    "period": 4,
    "on": 4,
    "circuit": 0
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 3,
    "dir": "W",
    "range": 5,
    "circuit": 0
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      2,
      7
     ],
     [
      3,
      7
     ],
     [
      4,
      7
     ],
     [
      5,
      7
     ],
     [
      6,
      7
     ],
     [
      7,
      7
     ],
     [
      8,
      7
     ],
     [
      9,
      7
     ],
     [
      10,
      7
     ],
     [
      9,
      7
     ],
     [
      8,
      7
     ],
     [
      7,
      7
     ],
     [
      6,
      7
     ],
     [
      5,
      7
     ],
     [
      4,
      7
     ],
     [
      3,
      7
     ]
    ],
    "range": 3,
    "phase": 9
   }
  ],
  "desc": "One circuit powers the cameras, the lasers and the exit door. It does not power the night guard in the vault.",
  "hint": "Walk onto switch 1 to flip it; stepping on it again undoes it. Wait on a vault hatch until the guard walks away, follow him to the trophy and leave before he turns.",
  "descEn": "One circuit powers the cameras, the lasers and the exit door. It does not power the night guard in the vault.",
  "hintEn": "Walk onto switch 1 to flip it; stepping on it again undoes it. Wait on a vault hatch until the guard walks away, follow him to the trophy and leave before he turns."
 },
 {
  "id": "cut-07",
  "name": "Lights Out",
  "nameEn": "Lights Out",
  "tag": "LIGHTS / GUARD",
  "map": [
   "#############",
   "#Sl........E#",
   "###.######.##",
   "#...........#",
   "##.######.###",
   "#.......a...#",
   "###.######.##",
   "#.T......Ao.#",
   "#############"
  ],
  "emps": 1,
  "maxAlarms": 2,
  "par": 51,
  "lasers": [
   {
    "x": 11,
    "y": 7,
    "dir": "W",
    "range": 2,
    "period": 6,
    "on": 2
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 5,
    "dir": "W",
    "range": 8
   },
   {
    "x": 1,
    "y": 3,
    "dir": "E",
    "range": 1
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      5
     ],
     [
      2,
      5
     ],
     [
      3,
      5
     ],
     [
      4,
      5
     ],
     [
      5,
      5
     ],
     [
      6,
      5
     ],
     [
      7,
      5
     ],
     [
      8,
      5
     ],
     [
      7,
      5
     ],
     [
      6,
      5
     ],
     [
      5,
      5
     ],
     [
      4,
      5
     ],
     [
      3,
      5
     ],
     [
      2,
      5
     ]
    ],
    "range": 3,
    "phase": 9
   }
  ],
  "desc": "Cameras see across the rooms and a guard walks the card floor. Reach the switchboard and turn the lights off before descending.",
  "hint": "LIGHT next to l costs one turn. Darkness shortens every eye to one cell, the guard's too: you can walk right behind him. Duck into a hatch when he turns.",
  "lighting": {
   "initialOn": true
  },
  "descEn": "Cameras see across the rooms and a guard walks the card floor. Reach the switchboard and turn the lights off before descending.",
  "hintEn": "LIGHT next to l costs one turn. Darkness shortens every eye to one cell, the guard's too: you can walk right behind him. Duck into a hatch when he turns."
 },
 {
  "id": "cut-08",
  "name": "Silent Until Stolen",
  "nameEn": "Silent Until Stolen",
  "tag": "AFTER THE TROPHY",
  "map": [
   "#############",
   "#S....#....E#",
   "##.######.###",
   "#.v.........#",
   "###.######.##",
   "#...o.......#",
   "##.######.###",
   "#.vT........#",
   "#############"
  ],
  "emps": 1,
  "maxAlarms": 2,
  "par": 36,
  "lasers": [
   {
    "x": 11,
    "y": 7,
    "dir": "W",
    "range": 4,
    "period": 6,
    "on": 2,
    "phase": 1,
    "afterRelic": true
   },
   {
    "x": 1,
    "y": 5,
    "dir": "E",
    "range": 2,
    "period": 6,
    "on": 5,
    "afterRelic": true
   },
   {
    "x": 11,
    "y": 5,
    "dir": "W",
    "range": 3,
    "period": 6,
    "on": 2,
    "phase": 0,
    "afterRelic": true
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 3,
    "dir": "W",
    "range": 2,
    "rotation": [
     "W",
     "E"
    ],
    "speed": 2,
    "afterRelic": true
   }
  ],
  "guards": [],
  "desc": "The vault looks quiet. Picking up the trophy activates an entirely different exit problem.",
  "hint": "After the theft the west beam almost never rests. Scout the east ladders first; wait on hatches, not in corridors.",
  "ventsWithRelic": false,
  "descEn": "The vault looks quiet. Picking up the trophy activates an entirely different exit problem.",
  "hintEn": "After the theft the west beam almost never rests. Scout the east ladders first; wait on hatches, not in corridors."
 },
 {
  "id": "cut-09",
  "name": "Twenty to Midnight",
  "nameEn": "Twenty to Midnight",
  "tag": "LOCKDOWN / GUARD",
  "map": [
   "#############",
   "#S....#..ARE#",
   "##.#####.####",
   "#1.......a..#",
   "###.#####.###",
   "#......A....#",
   "##.#######.##",
   "#.T.......o.#",
   "#############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 38,
  "lasers": [
   {
    "x": 11,
    "y": 5,
    "dir": "W",
    "range": 2,
    "period": 6,
    "on": 2,
    "phase": 1
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 7,
    "dir": "W",
    "range": 2,
    "rotation": [
     "W",
     "E"
    ],
    "speed": 2
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      2,
      5
     ],
     [
      3,
      5
     ],
     [
      4,
      5
     ],
     [
      5,
      5
     ],
     [
      6,
      5
     ],
     [
      5,
      5
     ],
     [
      4,
      5
     ],
     [
      3,
      5
     ]
    ],
    "range": 3,
    "phase": 7
   }
  ],
  "desc": "After the theft, the shutters close in 18 turns. Prepare the circuit and card before taking the trophy. A guard walks the floor above the vault.",
  "hint": "Door R needs the trophy and switch 1. Only the west ladders get you out in time, and the guard walks right over them: wait on a hatch until his back is turned.",
  "lockdown": 18,
  "descEn": "After the theft, the shutters close in 18 turns. Prepare the circuit and card before taking the trophy. A guard walks the floor above the vault.",
  "hintEn": "Door R needs the trophy and switch 1. Only the west ladders get you out in time, and the guard walks right over them: wait on a hatch until his back is turned."
 },
 {
  "id": "cut-10",
  "name": "The Last Floor",
  "nameEn": "The Last Floor",
  "tag": "MASTER HEIST",
  "map": [
   "###############",
   "#S......#..R.E#",
   "##.#######.####",
   "#1l.....a.....#",
   "#####.#########",
   "#.p.C..G.Ab.o.#",
   "########.######",
   "#..v....B.....#",
   "#########.##.##",
   "#.v.T...o.....#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 74,
  "lasers": [
   {
    "x": 13,
    "y": 5,
    "dir": "W",
    "range": 2,
    "period": 6,
    "on": 2,
    "phase": 0,
    "circuit": 0
   },
   {
    "x": 13,
    "y": 9,
    "dir": "W",
    "range": 3,
    "period": 6,
    "on": 2,
    "afterRelic": true
   }
  ],
  "cameras": [
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 4,
    "circuit": 0
   },
   {
    "x": 1,
    "y": 7,
    "dir": "E",
    "range": 4
   }
  ],
  "guards": [
   {
    "path": [
     [
      6,
      9
     ],
     [
      7,
      9
     ],
     [
      8,
      9
     ],
     [
      9,
      9
     ],
     [
      10,
      9
     ],
     [
      11,
      9
     ],
     [
      10,
      9
     ],
     [
      9,
      9
     ],
     [
      8,
      9
     ],
     [
      7,
      9
     ]
    ],
    "range": 3,
    "kind": "walker"
   }
  ],
  "desc": "Five floors. Two credentials. A pressure gate. A guard in the vault. Prepare the circuit and escape route before a 28-turn lockdown.",
  "hint": "Flip switch 1 at the far west before the theft. Push the crate LEFT onto P1. Lights off, the vault guard sees one cell. The trophy cannot use the vent: it leaves by the east ladders.",
  "lockdown": 28,
  "ventsWithRelic": false,
  "lighting": {
   "initialOn": true
  },
  "descEn": "Five floors. Two credentials. A pressure gate. A guard in the vault. Prepare the circuit and escape route before a 28-turn lockdown.",
  "hintEn": "Flip switch 1 at the far west before the theft. Push the crate LEFT onto P1. Lights off, the vault guard sees one cell. The trophy cannot use the vent: it leaves by the east ladders."
 },
 {
  "id": "annex-01",
  "name": "Pump House",
  "nameEn": "Pump House",
  "tag": "CANAL ANNEX",
  "map": [
   "#############",
   "#Sl.....AD.E#",
   "##.####.#####",
   "#....1......#",
   "###.#####.###",
   "#.......a...#",
   "##.#######.##",
   "#.T...o.A...#",
   "#############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 38,
  "lasers": [
   {
    "x": 11,
    "y": 7,
    "dir": "W",
    "range": 2,
    "period": 6,
    "on": 2,
    "circuit": 0
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 5,
    "dir": "W",
    "range": 7
   }
  ],
  "guards": [],
  "desc": "Kill the lights, reroute the pumps and take the relay. The canal cameras never blink.",
  "hint": "The left switchboard comes first. The pump switch opens the return door.",
  "lighting": {
   "initialOn": true
  },
  "descEn": "Kill the lights, reroute the pumps and take the relay. The canal cameras never blink.",
  "hintEn": "The left switchboard comes first. The pump switch opens the return door."
 },
 {
  "id": "annex-02",
  "name": "Midnight Lens",
  "nameEn": "Midnight Lens",
  "tag": "ROOFTOP ANNEX",
  "map": [
   "#############",
   "#S....#..ABE#",
   "##.#####.####",
   "#...a...l...#",
   "###.####.####",
   "#....A.b....#",
   "##.#######.##",
   "#.T.....o...#",
   "#############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 43,
  "lasers": [
   {
    "x": 1,
    "y": 3,
    "dir": "E",
    "range": 1,
    "period": 6,
    "on": 3
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 5,
    "dir": "W",
    "range": 6
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      9,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ]
    ],
    "range": 3,
    "phase": 2
   }
  ],
  "desc": "Three turns lit, three dark. A guard walks the observatory. Cross under the moving blackout and bring the lens home.",
  "hint": "Lit, the guard sees three cells; dark, only one. Wait in a hatch while he passes overhead. A manual switch inverts the automatic light cycle.",
  "lighting": {
   "initialOn": true,
   "period": 6,
   "on": 3,
   "phase": 0
  },
  "descEn": "Three turns lit, three dark. A guard walks the observatory. Cross under the moving blackout and bring the lens home.",
  "hintEn": "Lit, the guard sees three cells; dark, only one. Wait in a hatch while he passes overhead. A manual switch inverts the automatic light cycle."
 },
 {
  "id": "cut-11",
  "name": "Crossed Wires",
  "nameEn": "Crossed Wires",
  "tag": "CIRCUITS / KEYCARD",
  "map": [
   "###############",
   "#Sl.........RE#",
   "##.#######.####",
   "#.....a.....o.#",
   "####.#####.####",
   "#1.....D.....2#",
   "##########.####",
   "#......T.A....#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 57,
  "lasers": [
   {
    "x": 13,
    "y": 7,
    "dir": "W",
    "range": 4,
    "period": 6,
    "on": 4,
    "phase": 0,
    "circuit": 1
   },
   {
    "x": 1,
    "y": 7,
    "dir": "E",
    "range": 6,
    "period": 6,
    "on": 4,
    "phase": 0,
    "circuit": 1
   }
  ],
  "cameras": [
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 12,
    "circuit": 1
   }
  ],
  "guards": [],
  "lighting": {
   "initialOn": true
  },
  "lockdown": 16,
  "desc": "Two circuits. Switch 1 opens D and the exit. Switch 2 kills the vault lasers and the stairwell camera. Shutters close 16 turns after the theft.",
  "descEn": "Two circuits. Switch 1 opens D and the exit. Switch 2 kills the vault lasers and the stairwell camera. Shutters close 16 turns after the theft.",
  "hint": "Kill the lights before F3 and flip 1 before the theft. Then choose: detour east to switch 2, or time the vault lasers.",
  "hintEn": "Kill the lights before F3 and flip 1 before the theft. Then choose: detour east to switch 2, or time the vault lasers."
 },
 {
  "id": "cut-12",
  "name": "Graveyard Shift",
  "nameEn": "Graveyard Shift",
  "tag": "GUARD / LOCKDOWN",
  "map": [
   "###############",
   "#S......#...AE#",
   "##.########.###",
   "#............v#",
   "####.#####.####",
   "#o............#",
   "##.######.#####",
   "#....T......av#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 54,
  "lasers": [
   {
    "x": 1,
    "y": 3,
    "dir": "E",
    "range": 6,
    "period": 8,
    "on": 2,
    "phase": 0
   }
  ],
  "cameras": [],
  "guards": [
   {
    "path": [
     [
      1,
      5
     ],
     [
      2,
      5
     ],
     [
      3,
      5
     ],
     [
      4,
      5
     ],
     [
      5,
      5
     ],
     [
      6,
      5
     ],
     [
      7,
      5
     ],
     [
      8,
      5
     ],
     [
      9,
      5
     ],
     [
      10,
      5
     ],
     [
      11,
      5
     ],
     [
      12,
      5
     ],
     [
      13,
      5
     ],
     [
      12,
      5
     ],
     [
      11,
      5
     ],
     [
      10,
      5
     ],
     [
      9,
      5
     ],
     [
      8,
      5
     ],
     [
      7,
      5
     ],
     [
      6,
      5
     ],
     [
      5,
      5
     ],
     [
      4,
      5
     ],
     [
      3,
      5
     ],
     [
      2,
      5
     ]
    ],
    "range": 3,
    "phase": 2,
    "kind": "walker"
   }
  ],
  "ventsWithRelic": false,
  "lockdown": 16,
  "desc": "Card A lies at the far end of the vault, past the trophy. A night guard walks the hall above, and the trophy is too heavy for the vent.",
  "descEn": "Card A lies at the far end of the vault, past the trophy. A night guard walks the hall above, and the trophy is too heavy for the vent.",
  "hint": "Take the card before the trophy: shutters close 16 turns after the theft. Vent in safely, or slip through the guard's hall behind his back by the hatches at columns 10 and 9.",
  "hintEn": "Take the card before the trophy: shutters close 16 turns after the theft. Vent in safely, or slip through the guard's hall behind his back by the hatches at columns 10 and 9."
 },
 {
  "id": "archive-01",
  "name": "Double Weight",
  "nameEn": "Double Weight",
  "tag": "ARCHIVE / PRESSURE",
  "map": [
   "#############",
   "#S.........E#",
   "#####.#######",
   "#.p.C..G...o#",
   "########.####",
   "#.....H..C.P#",
   "####.########",
   "#......T...##",
   "#############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 60,
  "lasers": [
   {
    "x": 10,
    "y": 7,
    "dir": "W",
    "range": 3,
    "period": 6,
    "on": 3,
    "phase": 3
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "One crate per pressure circuit. Every weight must be on the correct side before your descent.",
  "hint": "Push the top crate left onto P1 and the lower crate right onto P2. No ladder goes around either gate.",
  "descEn": "One crate per pressure circuit. Every weight must be on the correct side before your descent.",
  "hintEn": "Push the top crate left onto P1 and the lower crate right onto P2. No ladder goes around either gate."
 },
 {
  "id": "archive-02",
  "name": "Rolling Blackout",
  "nameEn": "Rolling Blackout",
  "tag": "ARCHIVE / CLOCKWORK",
  "map": [
   "#############",
   "#S.........E#",
   "##.#######.##",
   "#..l..a.....#",
   "#########.###",
   "#...A.......#",
   "##.####.#####",
   "#.T.#.....o.#",
   "#############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 57,
  "lasers": [
   {
    "x": 1,
    "y": 5,
    "dir": "E",
    "range": 2,
    "period": 6,
    "on": 2,
    "phase": 0
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 5,
    "dir": "W",
    "range": 6
   }
  ],
  "guards": [],
  "desc": "The light clock and laser clock disagree. Make a route that survives both.",
  "hint": "Lit, the camera covers six cells and darkness lasts three turns. Cross in threes and hide in the middle hatch. The switch shifts the light clock.",
  "lighting": {
   "initialOn": true,
   "period": 6,
   "on": 3,
   "phase": 0
  },
  "descEn": "The light clock and laser clock disagree. Make a route that survives both.",
  "hintEn": "Lit, the camera covers six cells and darkness lasts three turns. Cross in threes and hide in the middle hatch. The switch shifts the light clock."
 },
 {
  "id": "archive-03",
  "name": "No Return Ticket",
  "nameEn": "No Return Ticket",
  "tag": "ARCHIVE / EXTRACTION",
  "map": [
   "#############",
   "#S....#..ARE#",
   "##.#####.####",
   "#.v..1.....o#",
   "###.#####.###",
   "#....a..A...#",
   "##########.##",
   "#.vT........#",
   "#############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 49,
  "lasers": [
   {
    "x": 11,
    "y": 7,
    "dir": "W",
    "range": 2,
    "period": 6,
    "on": 2,
    "afterRelic": true,
    "phase": 4
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 5,
    "dir": "W",
    "range": 2,
    "rotation": [
     "W",
     "E"
    ],
    "speed": 2
   }
  ],
  "guards": [],
  "desc": "The vent is a way in, not a way out. Set the relay and secure the card before stealing the archive. Shutters close in 21 turns.",
  "hint": "An unprepared theft strands you downstairs. Plan the east staircase first.",
  "ventsWithRelic": false,
  "lockdown": 21,
  "descEn": "The vent is a way in, not a way out. Set the relay and secure the card before stealing the archive. Shutters close in 21 turns.",
  "hintEn": "An unprepared theft strands you downstairs. Plan the east staircase first."
 },
 {
  "id": "drill-pulse",
  "name": "Read the Pulse",
  "nameEn": "Read the Pulse",
  "tag": "SECURITY DRILL",
  "map": [
   "###########",
   "#S.......E#",
   "##.#####.##",
   "#.........#",
   "##.#####.##",
   "#....T....#",
   "###########"
  ],
  "par": 23,
  "emps": 0,
  "maxAlarms": 1,
  "lasers": [
   {
    "x": 9,
    "y": 5,
    "dir": "W",
    "range": 4,
    "period": 6,
    "on": 2,
    "phase": 2
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "Study a laser cycle. Wait in safety, cross on the right turn, and take the trophy upstairs.",
  "descEn": "Study a laser cycle. Wait in safety, cross on the right turn, and take the trophy upstairs.",
  "hint": "Use INSPECT on the emitter. Lime is ON. The NEXT markers show where the laser will be after your action.",
  "hintEn": "Use INSPECT on the emitter. Lime is ON. The NEXT markers show where the laser will be after your action."
 },
 {
  "id": "drill-light",
  "name": "A Blind Spot",
  "nameEn": "A Blind Spot",
  "tag": "SECURITY DRILL",
  "map": [
   "###########",
   "#Sl......E#",
   "##.#####.##",
   "#.........#",
   "###.###.###",
   "#....T....#",
   "###########"
  ],
  "par": 27,
  "emps": 0,
  "maxAlarms": 1,
  "lasers": [],
  "cameras": [
   {
    "x": 9,
    "y": 3,
    "dir": "W",
    "range": 7
   }
  ],
  "guards": [],
  "desc": "A fixed camera owns the corridor. Switch off the lights before descending.",
  "descEn": "A fixed camera owns the corridor. Switch off the lights before descending.",
  "hint": "Press L beside the switch on the top floor. Darkness makes optical range one cell, but does not remove the camera body.",
  "hintEn": "Press L beside the switch on the top floor. Darkness makes optical range one cell, but does not remove the camera body.",
  "lighting": {
   "initialOn": true
  }
 },
 {
  "id": "drill-weight",
  "name": "Leave Some Weight",
  "nameEn": "Leave Some Weight",
  "tag": "SECURITY DRILL",
  "map": [
   "###########",
   "#S.......E#",
   "##.########",
   "#.........#",
   "##.###.####",
   "#..C.p.GT.#",
   "###########"
  ],
  "par": 42,
  "emps": 0,
  "maxAlarms": 1,
  "lasers": [],
  "cameras": [],
  "guards": [],
  "desc": "Push the crate onto P1. Leave it holding the gate while you steal the trophy.",
  "descEn": "Push the crate onto P1. Leave it holding the gate while you steal the trophy.",
  "hint": "Push from the left. Stop when the crate reaches P1. Use the middle floor to climb down on the far side of the crate.",
  "hintEn": "Push from the left. Stop when the crate reaches P1. Use the middle floor to climb down on the far side of the crate."
 },
 {
  "id": "drill-walker",
  "name": "The Night Watchman",
  "nameEn": "The Night Watchman",
  "tag": "SECURITY DRILL",
  "map": [
   "###########",
   "#S..#....E#",
   "##.#####.##",
   "#.........#",
   "#####.#####",
   "#.T.......#",
   "###########"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 33,
  "lasers": [],
  "cameras": [],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      2,
      3
     ],
     [
      3,
      3
     ],
     [
      4,
      3
     ],
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ],
     [
      5,
      3
     ],
     [
      4,
      3
     ],
     [
      3,
      3
     ]
    ],
    "range": 3,
    "phase": 11
   }
  ],
  "desc": "A guard walks the middle floor. He sees three cells ahead and nothing behind. Take the trophy downstairs without entering his view.",
  "hint": "Wait on a ladder hatch while he walks away, then follow his back. He turns at each end of his route. A hatch hides you while he walks overhead.",
  "descEn": "A guard walks the middle floor. He sees three cells ahead and nothing behind. Take the trophy downstairs without entering his view.",
  "hintEn": "Wait on a ladder hatch while he walks away, then follow his back. He turns at each end of his route. A hatch hides you while he walks overhead."
 },
 {
  "id": "last-cutaway",
  "name": "The Common House",
  "nameEn": "The Common House",
  "tag": "SHARED / LAST HEIST",
  "map": [
   "#############",
   "#...T.......#",
   "##.######.###",
   "#......o....#",
   "####.#####.##",
   "#...........#",
   "##.#####.####",
   "#S....o....E#",
   "#############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 35,
  "lasers": [
   {
    "x": 1,
    "y": 5,
    "dir": "E",
    "range": 2,
    "period": 6,
    "on": 2,
    "phase": 0
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 3,
    "dir": "W",
    "range": 2,
    "rotation": [
     "W",
     "E"
    ],
    "speed": 2
   }
  ],
  "guards": [],
  "desc": "Clear this revision. Add ONE obstacle. Prove it can still be beaten. Hold until time expires.",
  "hint": "Ladders and their landings are protected. A new obstacle must invalidate the last winning route.",
  "descEn": "Clear this revision. Add ONE obstacle. Prove it can still be beaten. Hold until time expires.",
  "hintEn": "Ladders and their landings are protected. A new obstacle must invalidate the last winning route."
 }
];if(typeof module==='object'&&module.exports)module.exports=levels;else r.HEIST_CUTAWAY_LEVELS=levels;})(globalThis);

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

/* Daily Heist plans: one hard level per day for everyone (entry costs RF; the winner is the cleanest run with the fewest
   turns). Not part of the campaign or Solo Vaults. Pure engine data, cutaway convention, solvable clean without EMP.
   best = exact minimum turns (breadth-first search, tests/levels-review.cjs); par = round(1.15 x best);
   routes = distinct clean routes (order of pickups and set of ladders/vents) that finish within best + 10%.
   concept = the idea of the level, for designers; it is not shown as a hint. */
(function(r){const levels=[
 {
  "id": "daily-01",
  "name": "Hatch Dance",
  "nameEn": "Hatch Dance",
  "tag": "DAILY / CHOREOGRAPHY",
  "concept": "Two watchmen sweep two stacked galleries in counter-step. Every hatch between the galleries is a place to duck. The trophy and card A wait in separate rooms below, so the galleries are crossed four times.",
  "map": [
   "###############",
   "#S.....#..A..E#",
   "##.#####.######",
   "#.............#",
   "####.#.#.#.####",
   "#.............#",
   "##.#########.##",
   "#..T...#..a...#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 67,
  "best": 58,
  "routes": 7,
  "headline": [
   "guards",
   "key-a"
  ],
  "lasers": [],
  "cameras": [],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
     [
      2,
      3
     ],
     [
      3,
      3
     ],
     [
      4,
      3
     ],
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
      3
     ],
     [
      10,
      3
     ],
     [
      9,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ],
     [
      5,
      3
     ],
     [
      4,
      3
     ],
     [
      3,
      3
     ],
     [
      2,
      3
     ]
    ]
   },
   {
    "kind": "walker",
    "path": [
     [
      13,
      5
     ],
     [
      12,
      5
     ],
     [
      11,
      5
     ],
     [
      10,
      5
     ],
     [
      9,
      5
     ],
     [
      8,
      5
     ],
     [
      7,
      5
     ],
     [
      6,
      5
     ],
     [
      5,
      5
     ],
     [
      4,
      5
     ],
     [
      3,
      5
     ],
     [
      2,
      5
     ],
     [
      1,
      5
     ],
     [
      2,
      5
     ],
     [
      3,
      5
     ],
     [
      4,
      5
     ],
     [
      5,
      5
     ],
     [
      6,
      5
     ],
     [
      7,
      5
     ],
     [
      8,
      5
     ],
     [
      9,
      5
     ],
     [
      10,
      5
     ],
     [
      11,
      5
     ],
     [
      12,
      5
     ]
    ],
    "phase": 5
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: two watchmen. Keycards: A.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: two watchmen. Keycards: A.",
  "hintEn": ""
 },
 {
  "id": "daily-02",
  "name": "Pulse Wall",
  "nameEn": "Pulse Wall",
  "tag": "DAILY / LASER RHYTHM",
  "concept": "Four beams, four tempos, three of them fired from the east wall and one guarding the exit corridor. Each floor has its own beat; the ladders you choose decide whether the beats line up or make you wait.",
  "map": [
   "###############",
   "#S.......#...E#",
   "##.###.#.###.##",
   "#...#..#......#",
   "#.#.####.###.##",
   "#......#......#",
   "##.###.###.#.##",
   "#...#.........#",
   "#.#.#.#.#######",
   "#....T........#",
   "###.#####.#.#.#",
   "#....#........#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 66,
  "best": 57,
  "routes": 111,
  "headline": [
   "lasers"
  ],
  "lasers": [
   {
    "x": 10,
    "y": 1,
    "dir": "E",
    "range": 4,
    "period": 6,
    "on": 3,
    "phase": 1
   },
   {
    "x": 13,
    "y": 5,
    "dir": "W",
    "range": 8,
    "period": 6,
    "on": 3,
    "phase": 4
   },
   {
    "x": 13,
    "y": 7,
    "dir": "W",
    "range": 11,
    "period": 4,
    "on": 1,
    "phase": 1
   },
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 6,
    "period": 5,
    "on": 2,
    "phase": 3
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "Take the trophy and get out unseen. On site: 4 lasers.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: 4 lasers.",
  "hintEn": ""
 },
 {
  "id": "daily-03",
  "name": "Long Way to A",
  "nameEn": "Long Way to A",
  "tag": "DAILY / KEYCARD",
  "concept": "Door A seals the trophy on the ground floor; card A lies at the dead end of a watchman corridor near the top, one floor below a blinking lens. Fetch the card on the way down and the whole house is crossed only once in each direction.",
  "map": [
   "###############",
   "#S......#....E#",
   "##.###.##.#####",
   "#.............#",
   "###.######.#.##",
   "#....#.......a#",
   "####.#.###.#.##",
   "#........#....#",
   "#.##.#####.####",
   "#.............#",
   "####.##.#######",
   "#........AT...#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 81,
  "best": 70,
  "routes": 61,
  "headline": [
   "key-a",
   "guards"
  ],
  "lasers": [],
  "cameras": [
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 12,
    "rotation": [
     "W",
     "S"
    ],
    "speed": 3,
    "phase": 0
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      7,
      5
     ],
     [
      8,
      5
     ],
     [
      9,
      5
     ],
     [
      10,
      5
     ],
     [
      11,
      5
     ],
     [
      12,
      5
     ],
     [
      13,
      5
     ],
     [
      13,
      5
     ],
     [
      13,
      5
     ],
     [
      12,
      5
     ],
     [
      11,
      5
     ],
     [
      10,
      5
     ],
     [
      9,
      5
     ],
     [
      8,
      5
     ],
     [
      7,
      5
     ],
     [
      7,
      5
     ]
    ],
    "phase": 0
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, one camera. Keycards: A.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, one camera. Keycards: A.",
  "hintEn": ""
 },
 {
  "id": "daily-04",
  "name": "Six Floors Down",
  "nameEn": "Six Floors Down",
  "tag": "DAILY / BLACKOUT",
  "concept": "Six floors, three watchmen and a lens, in a building lit four turns in every ten. The way down runs through every patrol, and each crossing belongs to a different blackout.",
  "map": [
   "###############",
   "#S......#....E#",
   "##.##.#.###.###",
   "#.....#..#....#",
   "##.#.###.###.##",
   "#.............#",
   "#.##.####.##.##",
   "#.........#...#",
   "##.####.#######",
   "#.......#.....#",
   "####.######.###",
   "#..........T..#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 79,
  "best": 69,
  "routes": 169,
  "headline": [
   "light-cycle",
   "guards"
  ],
  "lighting": {
   "initialOn": true,
   "period": 10,
   "on": 4,
   "phase": 9
  },
  "lasers": [],
  "cameras": [
   {
    "x": 1,
    "y": 9,
    "dir": "E",
    "range": 11,
    "rotation": [
     "E",
     "S",
     "S"
    ],
    "speed": 3,
    "phase": 0
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      2,
      9
     ],
     [
      3,
      9
     ],
     [
      4,
      9
     ],
     [
      5,
      9
     ],
     [
      6,
      9
     ],
     [
      7,
      9
     ],
     [
      6,
      9
     ],
     [
      5,
      9
     ],
     [
      4,
      9
     ],
     [
      3,
      9
     ]
    ],
    "phase": 9
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      7
     ],
     [
      2,
      7
     ],
     [
      3,
      7
     ],
     [
      4,
      7
     ],
     [
      5,
      7
     ],
     [
      6,
      7
     ],
     [
      7,
      7
     ],
     [
      8,
      7
     ],
     [
      9,
      7
     ],
     [
      8,
      7
     ],
     [
      7,
      7
     ],
     [
      6,
      7
     ],
     [
      5,
      7
     ],
     [
      4,
      7
     ],
     [
      3,
      7
     ],
     [
      2,
      7
     ]
    ],
    "phase": 1
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
     [
      2,
      3
     ],
     [
      3,
      3
     ],
     [
      4,
      3
     ],
     [
      4,
      3
     ],
     [
      4,
      3
     ],
     [
      3,
      3
     ],
     [
      2,
      3
     ],
     [
      1,
      3
     ],
     [
      1,
      3
     ]
    ],
    "phase": 5
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: three watchmen, one camera. Lights run on a 10-turn cycle, 4 on.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: three watchmen, one camera. Lights run on a 10-turn cycle, 4 on.",
  "hintEn": ""
 },
 {
  "id": "daily-05",
  "name": "Dead Weight",
  "nameEn": "Dead Weight",
  "tag": "DAILY / PRESSURE",
  "concept": "The grid by the exit opens only while its plate is held, and the plate is at the far end of the corridor the watchman walks. Push the crate the whole way: it is the load for the plate and the only thing he cannot see through.",
  "map": [
   "###############",
   "#S...#.....G.E#",
   "##.###.########",
   "#..C........p.#",
   "####.#####.####",
   "#.............#",
   "##.########.###",
   "#..T..........#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 68,
  "best": 59,
  "routes": 2,
  "headline": [
   "crates",
   "guards"
  ],
  "lasers": [],
  "cameras": [],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
      3
     ],
     [
      10,
      3
     ],
     [
      9,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ]
    ]
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      5
     ],
     [
      2,
      5
     ],
     [
      3,
      5
     ],
     [
      4,
      5
     ],
     [
      5,
      5
     ],
     [
      6,
      5
     ],
     [
      7,
      5
     ],
     [
      8,
      5
     ],
     [
      9,
      5
     ],
     [
      10,
      5
     ],
     [
      11,
      5
     ],
     [
      12,
      5
     ],
     [
      13,
      5
     ],
     [
      12,
      5
     ],
     [
      11,
      5
     ],
     [
      10,
      5
     ],
     [
      9,
      5
     ],
     [
      8,
      5
     ],
     [
      7,
      5
     ],
     [
      6,
      5
     ],
     [
      5,
      5
     ],
     [
      4,
      5
     ],
     [
      3,
      5
     ],
     [
      2,
      5
     ]
    ],
    "phase": 6
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: two watchmen. Crates and pressure plates.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: two watchmen. Crates and pressure plates.",
  "hintEn": ""
 },
 {
  "id": "daily-06",
  "name": "Breaker Run",
  "nameEn": "Breaker Run",
  "tag": "DAILY / DRONES + WALKER",
  "concept": "Three drones and a laser hang on one circuit, the breaker is in the bottom far corner and the trophy in the opposite one. Cutting the power costs a long walk; the watchman on the east side does not care about circuits.",
  "map": [
   "###############",
   "#S.......#...E#",
   "##.##.#####.###",
   "#.......#.....#",
   "###.#######.###",
   "#.............#",
   "##.######.#####",
   "#.......#.....#",
   "###.#.#.####.##",
   "#T........#...#",
   "##.###.##.#.###",
   "#............1#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 79,
  "best": 69,
  "routes": 191,
  "headline": [
   "switch-1",
   "circuit",
   "guards"
  ],
  "lasers": [
   {
    "x": 13,
    "y": 5,
    "dir": "W",
    "range": 12,
    "period": 8,
    "on": 2,
    "phase": 4,
    "circuit": 0
   }
  ],
  "cameras": [],
  "guards": [
   {
    "path": [
     [
      1,
      7
     ],
     [
      2,
      7
     ],
     [
      3,
      7
     ],
     [
      4,
      7
     ],
     [
      5,
      7
     ],
     [
      6,
      7
     ],
     [
      5,
      7
     ],
     [
      4,
      7
     ],
     [
      3,
      7
     ],
     [
      2,
      7
     ]
    ],
    "range": 2,
    "phase": 7,
    "circuit": 0
   },
   {
    "path": [
     [
      2,
      9
     ],
     [
      3,
      9
     ],
     [
      4,
      9
     ],
     [
      5,
      9
     ],
     [
      6,
      9
     ],
     [
      7,
      9
     ],
     [
      8,
      9
     ],
     [
      9,
      9
     ],
     [
      9,
      9
     ],
     [
      8,
      9
     ],
     [
      7,
      9
     ],
     [
      6,
      9
     ],
     [
      5,
      9
     ],
     [
      4,
      9
     ],
     [
      3,
      9
     ],
     [
      2,
      9
     ]
    ],
    "range": 2,
    "phase": 15,
    "circuit": 0
   },
   {
    "path": [
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
      3
     ],
     [
      10,
      3
     ]
    ],
    "range": 3,
    "phase": 4,
    "circuit": 0
   },
   {
    "kind": "walker",
    "path": [
     [
      9,
      7
     ],
     [
      10,
      7
     ],
     [
      11,
      7
     ],
     [
      12,
      7
     ],
     [
      13,
      7
     ],
     [
      12,
      7
     ],
     [
      11,
      7
     ],
     [
      10,
      7
     ]
    ],
    "phase": 7
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, three drones, one laser. Breakers: one.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, three drones, one laser. Breakers: one.",
  "hintEn": ""
 },
 {
  "id": "daily-07",
  "name": "Back Way In",
  "nameEn": "Back Way In",
  "tag": "DAILY / VENT + INTEL",
  "concept": "A vent drops from the middle floor straight to the ground floor, past a lens and a watchman. The intel folder lies on the watchman corridor, on the fast line for anyone who reads his walk.",
  "map": [
   "###############",
   "#S........#..E#",
   "#########.##.##",
   "#..........o..#",
   "##.#########.##",
   "#v......#.....#",
   "#.####.######.#",
   "#........#...T#",
   "####.#.###.#.##",
   "#....v........#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 75,
  "best": 65,
  "routes": 12,
  "headline": [
   "vents"
  ],
  "lasers": [],
  "cameras": [
   {
    "x": 9,
    "y": 5,
    "dir": "E",
    "range": 8,
    "rotation": [
     "E"
    ],
    "speed": 2,
    "phase": 0
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      2,
      3
     ],
     [
      3,
      3
     ],
     [
      4,
      3
     ],
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
      3
     ],
     [
      10,
      3
     ],
     [
      9,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ],
     [
      5,
      3
     ],
     [
      4,
      3
     ],
     [
      3,
      3
     ]
    ],
    "phase": 1
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, one camera. A vent. Intel: 1 folder.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, one camera. A vent. Intel: 1 folder.",
  "hintEn": ""
 },
 {
  "id": "daily-08",
  "name": "Two Breakers",
  "nameEn": "Two Breakers",
  "tag": "DAILY / CIRCUITS",
  "concept": "Breaker 1 opens the vault door and silences the beam on its own floor. Breaker 2 sits beside the vault and cuts the beam that sweeps the top corridor to the exit. Both are on the way, in an order that matters.",
  "map": [
   "###############",
   "#S...#.......E#",
   "####.##.#######",
   "#....1........#",
   "###.##.#.#.####",
   "#......#......#",
   "#.########.##.#",
   "#....2#TD.....#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 69,
  "best": 60,
  "routes": 108,
  "headline": [
   "switch-1",
   "switch-2"
  ],
  "lasers": [
   {
    "x": 6,
    "y": 1,
    "dir": "E",
    "range": 11,
    "period": 8,
    "on": 2,
    "phase": 2,
    "circuit": 1
   },
   {
    "x": 1,
    "y": 3,
    "dir": "E",
    "range": 10,
    "period": 6,
    "on": 1,
    "phase": 3,
    "circuit": 0
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "Take the trophy and get out unseen. On site: 2 lasers. Breakers: two.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: 2 lasers. Breakers: two.",
  "hintEn": ""
 },
 {
  "id": "daily-09",
  "name": "Pull the Plug",
  "nameEn": "Pull the Plug",
  "tag": "DAILY / LIGHT SWITCH",
  "concept": "The light switch is on the trophy floor, three watchmen and a lens stand between it and you, and in the dark every eye sees one step, which turns the climb back into a walk. Reach the switch lit, leave it dark.",
  "map": [
   "###############",
   "#S.......#...E#",
   "##.#.###.#.####",
   "#.....#.......#",
   "##.##.###.###.#",
   "#.......#.....#",
   "##.####.####.##",
   "#...#.........#",
   "#.#######.#.###",
   "#T........l...#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 78,
  "best": 68,
  "routes": 52,
  "headline": [
   "light-switch",
   "guards"
  ],
  "lighting": {
   "initialOn": true
  },
  "lasers": [
   {
    "x": 13,
    "y": 9,
    "dir": "W",
    "range": 6,
    "period": 6,
    "on": 1,
    "phase": 1
   }
  ],
  "cameras": [
   {
    "x": 7,
    "y": 3,
    "dir": "E",
    "range": 7,
    "rotation": [
     "E"
    ],
    "speed": 2,
    "phase": 0
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      9
     ],
     [
      2,
      9
     ],
     [
      3,
      9
     ],
     [
      4,
      9
     ],
     [
      5,
      9
     ],
     [
      6,
      9
     ],
     [
      7,
      9
     ],
     [
      8,
      9
     ],
     [
      9,
      9
     ],
     [
      10,
      9
     ],
     [
      11,
      9
     ],
     [
      12,
      9
     ],
     [
      11,
      9
     ],
     [
      10,
      9
     ],
     [
      9,
      9
     ],
     [
      8,
      9
     ],
     [
      7,
      9
     ],
     [
      6,
      9
     ],
     [
      5,
      9
     ],
     [
      4,
      9
     ],
     [
      3,
      9
     ],
     [
      2,
      9
     ]
    ],
    "phase": 4
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      5
     ],
     [
      2,
      5
     ],
     [
      3,
      5
     ],
     [
      4,
      5
     ],
     [
      5,
      5
     ],
     [
      6,
      5
     ],
     [
      7,
      5
     ],
     [
      7,
      5
     ],
     [
      7,
      5
     ],
     [
      6,
      5
     ],
     [
      5,
      5
     ],
     [
      4,
      5
     ],
     [
      3,
      5
     ],
     [
      2,
      5
     ],
     [
      1,
      5
     ],
     [
      1,
      5
     ]
    ],
    "phase": 15
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
     [
      2,
      3
     ],
     [
      3,
      3
     ],
     [
      4,
      3
     ],
     [
      5,
      3
     ],
     [
      4,
      3
     ],
     [
      3,
      3
     ],
     [
      2,
      3
     ]
    ],
    "phase": 1
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: three watchmen, one laser, one camera. A light switch.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: three watchmen, one laser, one camera. A light switch.",
  "hintEn": ""
 },
 {
  "id": "daily-10",
  "name": "Night Rounds",
  "nameEn": "Night Rounds",
  "tag": "DAILY / CHOREOGRAPHY",
  "concept": "Three watchmen walk three long corridors at three different lengths of beat. Door A guards the exit, card A lies one floor below the busiest corridor. Every crossing is a gap you have to see coming.",
  "map": [
   "###############",
   "#S........#.AE#",
   "##.#.####.#.###",
   "#.............#",
   "########.####.#",
   "#.........#...#",
   "###.#.#.#####.#",
   "#.a...#.......#",
   "#.#.#####.###.#",
   "#.....#...#...#",
   "##.##.#.####.##",
   "#........T....#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 71,
  "best": 62,
  "routes": 68,
  "headline": [
   "guards",
   "key-a"
  ],
  "lasers": [],
  "cameras": [],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
     [
      2,
      3
     ],
     [
      3,
      3
     ],
     [
      4,
      3
     ],
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
      3
     ],
     [
      10,
      3
     ],
     [
      9,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ],
     [
      5,
      3
     ],
     [
      4,
      3
     ],
     [
      3,
      3
     ],
     [
      2,
      3
     ]
    ],
    "phase": 5
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      9
     ],
     [
      2,
      9
     ],
     [
      3,
      9
     ],
     [
      4,
      9
     ],
     [
      5,
      9
     ],
     [
      4,
      9
     ],
     [
      3,
      9
     ],
     [
      2,
      9
     ]
    ],
    "phase": 7
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      5
     ],
     [
      2,
      5
     ],
     [
      3,
      5
     ],
     [
      4,
      5
     ],
     [
      5,
      5
     ],
     [
      6,
      5
     ],
     [
      7,
      5
     ],
     [
      8,
      5
     ],
     [
      9,
      5
     ],
     [
      8,
      5
     ],
     [
      7,
      5
     ],
     [
      6,
      5
     ],
     [
      5,
      5
     ],
     [
      4,
      5
     ],
     [
      3,
      5
     ],
     [
      2,
      5
     ]
    ],
    "phase": 4
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: three watchmen. Keycards: A.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: three watchmen. Keycards: A.",
  "hintEn": ""
 },
 {
  "id": "daily-11",
  "name": "Metronome",
  "nameEn": "Metronome",
  "tag": "DAILY / LASER RHYTHM",
  "concept": "Every floor beats at its own tempo. The beams cover each floor end to end; the hatches are the rests. Pick the ladders whose rests line up with the beat.",
  "map": [
   "###############",
   "#S.....#.....E#",
   "##.#########.##",
   "#.............#",
   "#####.#.#.#####",
   "#.............#",
   "##.#.#####.#.##",
   "#.....T.......#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 64,
  "best": 56,
  "routes": 6,
  "headline": [
   "lasers"
  ],
  "lasers": [
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 12,
    "period": 6,
    "on": 2,
    "phase": 0
   },
   {
    "x": 1,
    "y": 5,
    "dir": "E",
    "range": 12,
    "period": 5,
    "on": 2,
    "phase": 1
   },
   {
    "x": 1,
    "y": 7,
    "dir": "E",
    "range": 4,
    "period": 4,
    "on": 2,
    "phase": 0
   },
   {
    "x": 13,
    "y": 7,
    "dir": "W",
    "range": 6,
    "period": 6,
    "on": 3,
    "phase": 2
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "Take the trophy and get out unseen. On site: 4 lasers.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: 4 lasers.",
  "hintEn": ""
 },
 {
  "id": "daily-12",
  "name": "Silent Alarm",
  "nameEn": "Silent Alarm",
  "tag": "DAILY / LOCKDOWN",
  "concept": "Lifting the trophy starts the clock and wakes a second watchman on the escape floor. The exit card waits in the opposite corner, so the card comes first and the theft is timed to his walk.",
  "map": [
   "###############",
   "#S....#...A..E#",
   "##.####.#######",
   "#....#........#",
   "###.###.###.###",
   "#.............#",
   "##.#######.####",
   "#.....#.......#",
   "####.####.##.##",
   "#.T.........a.#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 56,
  "best": 49,
  "routes": 2,
  "headline": [
   "lockdown",
   "after-relic",
   "key-a",
   "guards"
  ],
  "lockdown": 33,
  "lasers": [],
  "cameras": [],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      5
     ],
     [
      2,
      5
     ],
     [
      3,
      5
     ],
     [
      4,
      5
     ],
     [
      5,
      5
     ],
     [
      6,
      5
     ],
     [
      7,
      5
     ],
     [
      8,
      5
     ],
     [
      9,
      5
     ],
     [
      10,
      5
     ],
     [
      11,
      5
     ],
     [
      12,
      5
     ],
     [
      13,
      5
     ],
     [
      12,
      5
     ],
     [
      11,
      5
     ],
     [
      10,
      5
     ],
     [
      9,
      5
     ],
     [
      8,
      5
     ],
     [
      7,
      5
     ],
     [
      6,
      5
     ],
     [
      5,
      5
     ],
     [
      4,
      5
     ],
     [
      3,
      5
     ],
     [
      2,
      5
     ]
    ]
   },
   {
    "kind": "walker",
    "path": [
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
      3
     ],
     [
      10,
      3
     ],
     [
      9,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ]
    ],
    "phase": 3,
    "afterRelic": true
   },
   {
    "kind": "walker",
    "path": [
     [
      7,
      7
     ],
     [
      8,
      7
     ],
     [
      9,
      7
     ],
     [
      10,
      7
     ],
     [
      11,
      7
     ],
     [
      12,
      7
     ],
     [
      13,
      7
     ],
     [
      12,
      7
     ],
     [
      11,
      7
     ],
     [
      10,
      7
     ],
     [
      9,
      7
     ],
     [
      8,
      7
     ]
    ],
    "phase": 2
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: three watchmen. Keycards: A. Lockdown 33 turns after the theft. Some security wakes up after the theft.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: three watchmen. Keycards: A. Lockdown 33 turns after the theft. Some security wakes up after the theft.",
  "hintEn": ""
 },
 {
  "id": "daily-13",
  "name": "Lens in the Dark",
  "nameEn": "Lens in the Dark",
  "tag": "DAILY / BLACKOUT",
  "concept": "A fixed lens watches the whole upper corridor and goes almost blind every time the lights drop. Cross under it in the dark; the trophy floor below has its own watchman and its own rhythm.",
  "map": [
   "###############",
   "#S..#........E#",
   "###.#.#.####.##",
   "#........#....#",
   "##.#.##.####.##",
   "#.....#...#...#",
   "##.#.###.##.###",
   "#.............#",
   "##.##.#.#####.#",
   "#.....#....T..#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 59,
  "best": 51,
  "routes": 83,
  "headline": [
   "light-cycle",
   "guards"
  ],
  "lighting": {
   "initialOn": true,
   "period": 8,
   "on": 4,
   "phase": 1
  },
  "lasers": [],
  "cameras": [
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 12,
    "rotation": [
     "W"
    ],
    "speed": 3,
    "phase": 0
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      7,
      9
     ],
     [
      8,
      9
     ],
     [
      9,
      9
     ],
     [
      10,
      9
     ],
     [
      11,
      9
     ],
     [
      12,
      9
     ],
     [
      11,
      9
     ],
     [
      10,
      9
     ],
     [
      9,
      9
     ],
     [
      8,
      9
     ]
    ],
    "phase": 9
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
     [
      2,
      3
     ],
     [
      3,
      3
     ],
     [
      4,
      3
     ],
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ],
     [
      5,
      3
     ],
     [
      4,
      3
     ],
     [
      3,
      3
     ],
     [
      2,
      3
     ]
    ],
    "phase": 0
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: two watchmen, one camera. Lights run on a 8-turn cycle, 4 on.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: two watchmen, one camera. Lights run on a 8-turn cycle, 4 on.",
  "hintEn": ""
 },
 {
  "id": "daily-14",
  "name": "Exit Pass",
  "nameEn": "Exit Pass",
  "tag": "DAILY / KEYCARD",
  "concept": "Door B stands in front of the exit and card B lies in the far bottom corner, below the trophy floor and its watchman. A lens guards the long walk to the card.",
  "map": [
   "###############",
   "#S........#.BE#",
   "#######.#.#.###",
   "#....#........#",
   "##.#####.######",
   "#.........#...#",
   "#.##.####.#.###",
   "#..........T..#",
   "#.#######.#####",
   "#.b...........#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 74,
  "best": 64,
  "routes": 122,
  "headline": [
   "key-b",
   "guards"
  ],
  "lasers": [],
  "cameras": [
   {
    "x": 13,
    "y": 9,
    "dir": "W",
    "range": 7,
    "rotation": [
     "W",
     "W",
     "N"
    ],
    "speed": 2,
    "phase": 1
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      7
     ],
     [
      2,
      7
     ],
     [
      3,
      7
     ],
     [
      4,
      7
     ],
     [
      5,
      7
     ],
     [
      6,
      7
     ],
     [
      7,
      7
     ],
     [
      8,
      7
     ],
     [
      9,
      7
     ],
     [
      10,
      7
     ],
     [
      11,
      7
     ],
     [
      12,
      7
     ],
     [
      13,
      7
     ],
     [
      12,
      7
     ],
     [
      11,
      7
     ],
     [
      10,
      7
     ],
     [
      9,
      7
     ],
     [
      8,
      7
     ],
     [
      7,
      7
     ],
     [
      6,
      7
     ],
     [
      5,
      7
     ],
     [
      4,
      7
     ],
     [
      3,
      7
     ],
     [
      2,
      7
     ]
    ],
    "phase": 13
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, one camera. Keycards: B.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, one camera. Keycards: B.",
  "hintEn": ""
 },
 {
  "id": "daily-15",
  "name": "Heavy Return",
  "nameEn": "Heavy Return",
  "tag": "DAILY / VENT + INTEL",
  "concept": "The vent is the quick way down, but the trophy does not fit through it. Three intel folders, only one of them on the fast line. Going down is a shortcut; coming back is a climb past two beams and a watchman.",
  "map": [
   "###############",
   "#S...#.......E#",
   "####.#.########",
   "#.....o.#.....#",
   "##.#.#####.##.#",
   "#.............#",
   "####.####.#####",
   "#.o..#.v.o....#",
   "##.######.##.##",
   "#..v.......T..#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 75,
  "best": 65,
  "routes": 1637,
  "headline": [
   "vents"
  ],
  "ventsWithRelic": false,
  "lasers": [
   {
    "x": 1,
    "y": 5,
    "dir": "E",
    "range": 9,
    "period": 6,
    "on": 2,
    "phase": 4
   },
   {
    "x": 9,
    "y": 3,
    "dir": "E",
    "range": 5,
    "period": 5,
    "on": 2,
    "phase": 2
   }
  ],
  "cameras": [],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      9
     ],
     [
      2,
      9
     ],
     [
      3,
      9
     ],
     [
      4,
      9
     ],
     [
      5,
      9
     ],
     [
      6,
      9
     ],
     [
      7,
      9
     ],
     [
      8,
      9
     ],
     [
      9,
      9
     ],
     [
      10,
      9
     ],
     [
      11,
      9
     ],
     [
      12,
      9
     ],
     [
      13,
      9
     ],
     [
      12,
      9
     ],
     [
      11,
      9
     ],
     [
      10,
      9
     ],
     [
      9,
      9
     ],
     [
      8,
      9
     ],
     [
      7,
      9
     ],
     [
      6,
      9
     ],
     [
      5,
      9
     ],
     [
      4,
      9
     ],
     [
      3,
      9
     ],
     [
      2,
      9
     ]
    ],
    "phase": 19
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, 2 lasers. A vent, too narrow for the trophy. Intel: 3 folders.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, 2 lasers. A vent, too narrow for the trophy. Intel: 3 folders.",
  "hintEn": ""
 },
 {
  "id": "daily-16",
  "name": "Kill Switch",
  "nameEn": "Kill Switch",
  "tag": "DAILY / DRONES + WALKER",
  "concept": "Two drones and a beam run on one circuit; the breaker sits mid-building behind them. The watchman near the top walks on, power or not.",
  "map": [
   "###############",
   "#S......#....E#",
   "###.#####.##.##",
   "#.........#...#",
   "###.#####.#.###",
   "#.....#......1#",
   "#.###.###.###.#",
   "#.............#",
   "##.#####.####.#",
   "#T....#.......#",
   "####.##.###.###",
   "#....#..#.....#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 69,
  "best": 60,
  "routes": 32,
  "headline": [
   "switch-1",
   "circuit",
   "guards"
  ],
  "lasers": [
   {
    "x": 5,
    "y": 9,
    "dir": "W",
    "range": 9,
    "period": 5,
    "on": 3,
    "phase": 3,
    "circuit": 0
   }
  ],
  "cameras": [],
  "guards": [
   {
    "path": [
     [
      1,
      5
     ],
     [
      2,
      5
     ],
     [
      3,
      5
     ],
     [
      4,
      5
     ],
     [
      5,
      5
     ],
     [
      4,
      5
     ],
     [
      3,
      5
     ],
     [
      2,
      5
     ]
    ],
    "range": 2,
    "phase": 5,
    "circuit": 0
   },
   {
    "path": [
     [
      7,
      9
     ],
     [
      8,
      9
     ],
     [
      9,
      9
     ],
     [
      10,
      9
     ],
     [
      11,
      9
     ],
     [
      12,
      9
     ],
     [
      13,
      9
     ],
     [
      13,
      9
     ],
     [
      13,
      9
     ],
     [
      12,
      9
     ],
     [
      11,
      9
     ],
     [
      10,
      9
     ],
     [
      9,
      9
     ],
     [
      8,
      9
     ],
     [
      7,
      9
     ],
     [
      7,
      9
     ]
    ],
    "range": 2,
    "phase": 12,
    "circuit": 0
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
     [
      2,
      3
     ],
     [
      3,
      3
     ],
     [
      4,
      3
     ],
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ],
     [
      5,
      3
     ],
     [
      4,
      3
     ],
     [
      3,
      3
     ],
     [
      2,
      3
     ]
    ],
    "phase": 12
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, two drones, one laser. Breakers: one.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, two drones, one laser. Breakers: one.",
  "hintEn": ""
 },
 {
  "id": "daily-17",
  "name": "Shield Crate",
  "nameEn": "Shield Crate",
  "tag": "DAILY / PRESSURE",
  "concept": "The grid in front of the trophy opens only while a plate on the top corridor is loaded, and a watchman walks that corridor end to end. The crate you push onto the plate is also your only shield from his eyes.",
  "map": [
   "###############",
   "#S...#.......E#",
   "##.######.#.###",
   "#.....C.....p.#",
   "###.#.#####.###",
   "#......#......#",
   "##.#.#######.##",
   "#........#....#",
   "##.#####.##.###",
   "#....#TG..#...#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 79,
  "best": 69,
  "routes": 28,
  "headline": [
   "crates",
   "guards"
  ],
  "lasers": [],
  "cameras": [
   {
    "x": 10,
    "y": 7,
    "dir": "E",
    "range": 4,
    "rotation": [
     "E",
     "N",
     "N"
    ],
    "speed": 2,
    "phase": 1
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
     [
      2,
      3
     ],
     [
      3,
      3
     ],
     [
      4,
      3
     ],
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
      3
     ],
     [
      10,
      3
     ],
     [
      9,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ],
     [
      5,
      3
     ],
     [
      4,
      3
     ],
     [
      3,
      3
     ],
     [
      2,
      3
     ]
    ],
    "phase": 10
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, one camera. Crates and pressure plates.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, one camera. Crates and pressure plates.",
  "hintEn": ""
 },
 {
  "id": "daily-18",
  "name": "Dark Room",
  "nameEn": "Dark Room",
  "tag": "DAILY / LIGHT SWITCH",
  "concept": "Two watchmen guard the trophy rooms and a lens sweeps the corridor above. The light switch is one floor up, out of the way. Darkness makes every eye see one step, but the walk to the switch is not free.",
  "map": [
   "###############",
   "#S......#....E#",
   "#####.######.##",
   "#.............#",
   "##.####.##.####",
   "#.....#..#.l..#",
   "#.##.###.####.#",
   "#...T..#......#",
   "###.#####.###.#",
   "#.........#...#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 72,
  "best": 63,
  "routes": 6,
  "headline": [
   "light-switch",
   "guards"
  ],
  "lighting": {
   "initialOn": true
  },
  "lasers": [
   {
    "x": 1,
    "y": 9,
    "dir": "E",
    "range": 11,
    "period": 8,
    "on": 3,
    "phase": 5
   }
  ],
  "cameras": [
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 11,
    "rotation": [
     "W",
     "S",
     "S"
    ],
    "speed": 2,
    "phase": 1
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      7
     ],
     [
      2,
      7
     ],
     [
      3,
      7
     ],
     [
      4,
      7
     ],
     [
      5,
      7
     ],
     [
      6,
      7
     ],
     [
      5,
      7
     ],
     [
      4,
      7
     ],
     [
      3,
      7
     ],
     [
      2,
      7
     ]
    ],
    "phase": 2
   },
   {
    "kind": "walker",
    "path": [
     [
      2,
      5
     ],
     [
      3,
      5
     ],
     [
      4,
      5
     ],
     [
      5,
      5
     ],
     [
      4,
      5
     ],
     [
      3,
      5
     ]
    ],
    "phase": 2
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: two watchmen, one laser, one camera. A light switch.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: two watchmen, one laser, one camera. A light switch.",
  "hintEn": ""
 },
 {
  "id": "daily-19",
  "name": "Tripwire Stack",
  "nameEn": "Tripwire Stack",
  "tag": "DAILY / LASER RHYTHM",
  "concept": "Three beams on three floors, one of them fired from the middle of a room. The shortest climb crosses all three; the quiet ladders cost steps. Find the order of floors that never waits.",
  "map": [
   "###############",
   "#S.....#.....E#",
   "#####.##.######",
   "#.............#",
   "#.##.##.#####.#",
   "#....#........#",
   "##.#######.#.##",
   "#......#......#",
   "####.###.######",
   "#....#..T.....#",
   "###.##.##.###.#",
   "#.............#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 69,
  "best": 60,
  "routes": 10,
  "headline": [
   "lasers"
  ],
  "lasers": [
   {
    "x": 13,
    "y": 7,
    "dir": "W",
    "range": 6,
    "period": 5,
    "on": 3,
    "phase": 3
   },
   {
    "x": 1,
    "y": 11,
    "dir": "E",
    "range": 7,
    "period": 6,
    "on": 1,
    "phase": 4
   },
   {
    "x": 6,
    "y": 5,
    "dir": "E",
    "range": 10,
    "period": 4,
    "on": 1,
    "phase": 2
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "Take the trophy and get out unseen. On site: 3 lasers.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: 3 lasers.",
  "hintEn": ""
 },
 {
  "id": "daily-20",
  "name": "Relic Door",
  "nameEn": "Relic Door",
  "tag": "DAILY / CIRCUITS + LOCKDOWN",
  "concept": "The exit door opens only for someone holding the trophy while breaker 1 is on, and breaker 1 is on the ground floor. Breaker 2 by the exit blinds the lens at the vault. Nineteen turns of lockdown after the theft.",
  "map": [
   "###############",
   "#S..#.....2.RE#",
   "###.#######.###",
   "#.............#",
   "#.###.#.##.####",
   "#...#.........#",
   "###.#.##.##.###",
   "#.....#.......#",
   "###.#.####.#.##",
   "#..TD.#..#....#",
   "########.##.#.#",
   "#...........1.#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 87,
  "best": 76,
  "routes": 621,
  "headline": [
   "switch-1",
   "switch-2",
   "lockdown"
  ],
  "lockdown": 19,
  "lasers": [],
  "cameras": [
   {
    "x": 1,
    "y": 9,
    "dir": "E",
    "range": 4,
    "rotation": [
     "E"
    ],
    "speed": 2,
    "phase": 0,
    "circuit": 1
   },
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 8,
    "rotation": [
     "W",
     "W",
     "N"
    ],
    "speed": 2,
    "phase": 0,
    "circuit": 0
   }
  ],
  "guards": [],
  "desc": "Take the trophy and get out unseen. On site: 2 cameras. Breakers: two. Lockdown 19 turns after the theft.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: 2 cameras. Breakers: two. Lockdown 19 turns after the theft.",
  "hintEn": ""
 },
 {
  "id": "daily-21",
  "name": "Card Under Patrol",
  "nameEn": "Card Under Patrol",
  "tag": "DAILY / CHOREOGRAPHY",
  "concept": "Two watchmen share the trophy corridor, and card A for the exit door lies right on their beat. Take the card in one gap, the trophy in another.",
  "map": [
   "###############",
   "#S..#......A.E#",
   "###.####.######",
   "#.............#",
   "##.####.##.#.##",
   "#........#....#",
   "#.####.#####.##",
   "#...a........T#",
   "#######.###.###",
   "#.......#.....#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 64,
  "best": 56,
  "routes": 24,
  "headline": [
   "guards",
   "key-a"
  ],
  "lasers": [],
  "cameras": [],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      7
     ],
     [
      2,
      7
     ],
     [
      3,
      7
     ],
     [
      4,
      7
     ],
     [
      5,
      7
     ],
     [
      6,
      7
     ],
     [
      7,
      7
     ],
     [
      8,
      7
     ],
     [
      9,
      7
     ],
     [
      10,
      7
     ],
     [
      11,
      7
     ],
     [
      12,
      7
     ],
     [
      13,
      7
     ],
     [
      12,
      7
     ],
     [
      11,
      7
     ],
     [
      10,
      7
     ],
     [
      9,
      7
     ],
     [
      8,
      7
     ],
     [
      7,
      7
     ],
     [
      6,
      7
     ],
     [
      5,
      7
     ],
     [
      4,
      7
     ],
     [
      3,
      7
     ],
     [
      2,
      7
     ]
    ],
    "phase": 9
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      7
     ],
     [
      2,
      7
     ],
     [
      3,
      7
     ],
     [
      4,
      7
     ],
     [
      5,
      7
     ],
     [
      6,
      7
     ],
     [
      7,
      7
     ],
     [
      8,
      7
     ],
     [
      9,
      7
     ],
     [
      10,
      7
     ],
     [
      11,
      7
     ],
     [
      12,
      7
     ],
     [
      13,
      7
     ],
     [
      12,
      7
     ],
     [
      11,
      7
     ],
     [
      10,
      7
     ],
     [
      9,
      7
     ],
     [
      8,
      7
     ],
     [
      7,
      7
     ],
     [
      6,
      7
     ],
     [
      5,
      7
     ],
     [
      4,
      7
     ],
     [
      3,
      7
     ],
     [
      2,
      7
     ]
    ],
    "phase": 5
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: two watchmen. Keycards: A.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: two watchmen. Keycards: A.",
  "hintEn": ""
 },
 {
  "id": "daily-22",
  "name": "Laundry Chute",
  "nameEn": "Laundry Chute",
  "tag": "DAILY / VENT + INTEL",
  "concept": "A vent from the top floor lands on the middle floor, past the first watchman, but the trophy will not fit back through it. Three intel folders lie on the patrols: grab them only if you want the plans more than the time.",
  "map": [
   "###############",
   "#S.....v#....E#",
   "##.#######.#.##",
   "#.o...........#",
   "######.#####.##",
   "#.......o.#v..#",
   "#.#####.#.##.##",
   "#..T........o.#",
   "#.####.##.#.###",
   "#...#.....#...#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 61,
  "best": 53,
  "routes": 22,
  "headline": [
   "vents"
  ],
  "ventsWithRelic": false,
  "lasers": [],
  "cameras": [
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 9,
    "rotation": [
     "W",
     "W",
     "N"
    ],
    "speed": 2,
    "phase": 1
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
     [
      2,
      3
     ],
     [
      3,
      3
     ],
     [
      4,
      3
     ],
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
      3
     ],
     [
      10,
      3
     ],
     [
      9,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ],
     [
      5,
      3
     ],
     [
      4,
      3
     ],
     [
      3,
      3
     ],
     [
      2,
      3
     ]
    ],
    "phase": 10
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      7
     ],
     [
      2,
      7
     ],
     [
      3,
      7
     ],
     [
      4,
      7
     ],
     [
      5,
      7
     ],
     [
      6,
      7
     ],
     [
      7,
      7
     ],
     [
      8,
      7
     ],
     [
      9,
      7
     ],
     [
      10,
      7
     ],
     [
      11,
      7
     ],
     [
      12,
      7
     ],
     [
      13,
      7
     ],
     [
      12,
      7
     ],
     [
      11,
      7
     ],
     [
      10,
      7
     ],
     [
      9,
      7
     ],
     [
      8,
      7
     ],
     [
      7,
      7
     ],
     [
      6,
      7
     ],
     [
      5,
      7
     ],
     [
      4,
      7
     ],
     [
      3,
      7
     ],
     [
      2,
      7
     ]
    ],
    "phase": 12
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: two watchmen, one camera. A vent, too narrow for the trophy. Intel: 3 folders.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: two watchmen, one camera. A vent, too narrow for the trophy. Intel: 3 folders.",
  "hintEn": ""
 },
 {
  "id": "daily-23",
  "name": "Power Cut",
  "nameEn": "Power Cut",
  "tag": "DAILY / DRONES + WALKER",
  "concept": "Two drones fly in step over the east corridor under the exit and a third over the ground floor. The breaker is on the west side, the trophy on the east. A watchman by the trophy ignores the power.",
  "map": [
   "###############",
   "#S......#....E#",
   "####.##.#.#.###",
   "#....#..#.....#",
   "##.#.#.###.####",
   "#1............#",
   "#.#.##.####.###",
   "#........#....#",
   "#.#.####.####.#",
   "#.....#....T..#",
   "###.###.#.##.##",
   "#.........#...#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 59,
  "best": 51,
  "routes": 138,
  "headline": [
   "switch-1",
   "circuit",
   "guards"
  ],
  "lasers": [],
  "cameras": [],
  "guards": [
   {
    "path": [
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
      3
     ],
     [
      10,
      3
     ],
     [
      9,
      3
     ]
    ],
    "range": 2,
    "phase": 4,
    "circuit": 0
   },
   {
    "path": [
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
      3
     ],
     [
      10,
      3
     ],
     [
      9,
      3
     ]
    ],
    "range": 3,
    "phase": 9,
    "circuit": 0
   },
   {
    "path": [
     [
      2,
      11
     ],
     [
      3,
      11
     ],
     [
      4,
      11
     ],
     [
      5,
      11
     ],
     [
      6,
      11
     ],
     [
      7,
      11
     ],
     [
      8,
      11
     ],
     [
      9,
      11
     ],
     [
      8,
      11
     ],
     [
      7,
      11
     ],
     [
      6,
      11
     ],
     [
      5,
      11
     ],
     [
      4,
      11
     ],
     [
      3,
      11
     ]
    ],
    "range": 3,
    "phase": 5,
    "circuit": 0
   },
   {
    "kind": "walker",
    "path": [
     [
      8,
      9
     ],
     [
      9,
      9
     ],
     [
      10,
      9
     ],
     [
      11,
      9
     ],
     [
      12,
      9
     ],
     [
      13,
      9
     ],
     [
      13,
      9
     ],
     [
      12,
      9
     ],
     [
      11,
      9
     ],
     [
      10,
      9
     ],
     [
      9,
      9
     ],
     [
      8,
      9
     ]
    ],
    "phase": 10
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, three drones. Breakers: one.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, three drones. Breakers: one.",
  "hintEn": ""
 },
 {
  "id": "daily-24",
  "name": "Locked Vault",
  "nameEn": "Locked Vault",
  "tag": "DAILY / KEYCARD",
  "concept": "Card A is at the east end of the building, door A seals the trophy at the west end, and a lens that never blinks watches the short way between them. No patrols, just the length of the building.",
  "map": [
   "###############",
   "#S......#....E#",
   "####.##.#.#####",
   "#....#........#",
   "####.###.#.####",
   "#.............#",
   "###.######.####",
   "#......#.....a#",
   "#.#.####.######",
   "#TA...........#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 62,
  "best": 54,
  "routes": 8,
  "headline": [
   "key-a"
  ],
  "lasers": [],
  "cameras": [
   {
    "x": 6,
    "y": 7,
    "dir": "W",
    "range": 9,
    "rotation": [
     "W"
    ],
    "speed": 2,
    "phase": 0
   }
  ],
  "guards": [],
  "desc": "Take the trophy and get out unseen. On site: one camera. Keycards: A.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one camera. Keycards: A.",
  "hintEn": ""
 },
 {
  "id": "daily-25",
  "name": "Two Plates",
  "nameEn": "Two Plates",
  "tag": "DAILY / PRESSURE",
  "concept": "Grid 2 seals the trophy and grid 1 the exit, each with its own plate and crate. A watchman walks the top corridor and a lens covers the middle floor.",
  "map": [
   "###############",
   "#S.....#....GE#",
   "##.#####.##.###",
   "#.............#",
   "#####.#.####.##",
   "#.......#.....#",
   "####.#######.##",
   "#.C.....P..HT.#",
   "#.#####.##.#.##",
   "#...#....p.C..#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 59,
  "best": 51,
  "routes": 15,
  "headline": [
   "crates",
   "guards"
  ],
  "lasers": [],
  "cameras": [
   {
    "x": 9,
    "y": 5,
    "dir": "E",
    "range": 12,
    "rotation": [
     "E",
     "E",
     "N"
    ],
    "speed": 2,
    "phase": 2
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
     [
      2,
      3
     ],
     [
      3,
      3
     ],
     [
      4,
      3
     ],
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
      3
     ],
     [
      10,
      3
     ],
     [
      9,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ],
     [
      5,
      3
     ],
     [
      4,
      3
     ],
     [
      3,
      3
     ],
     [
      2,
      3
     ]
    ],
    "phase": 16
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, one camera. Crates and pressure plates.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, one camera. Crates and pressure plates.",
  "hintEn": ""
 },
 {
  "id": "daily-26",
  "name": "Dark Stairs",
  "nameEn": "Dark Stairs",
  "tag": "DAILY / LIGHT SWITCH",
  "concept": "Two watchmen in step on the top corridor, another on the long floor above the trophy, and a beam in between. The light switch is halfway down, a step off the obvious route.",
  "map": [
   "###############",
   "#S.......#...E#",
   "###.######.####",
   "#...#.........#",
   "##.#####.#.####",
   "#.............#",
   "##.#.##.#######",
   "#.......#...l.#",
   "####.#.####.###",
   "#.............#",
   "##.#.######.###",
   "#T............#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 68,
  "best": 59,
  "routes": 8,
  "headline": [
   "light-switch",
   "guards"
  ],
  "lighting": {
   "initialOn": true
  },
  "lasers": [
   {
    "x": 13,
    "y": 5,
    "dir": "W",
    "range": 8,
    "period": 6,
    "on": 3,
    "phase": 3
   }
  ],
  "cameras": [],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
      3
     ],
     [
      10,
      3
     ],
     [
      9,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ],
     [
      5,
      3
     ]
    ],
    "phase": 10
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      9
     ],
     [
      2,
      9
     ],
     [
      3,
      9
     ],
     [
      4,
      9
     ],
     [
      5,
      9
     ],
     [
      6,
      9
     ],
     [
      7,
      9
     ],
     [
      8,
      9
     ],
     [
      9,
      9
     ],
     [
      10,
      9
     ],
     [
      11,
      9
     ],
     [
      12,
      9
     ],
     [
      13,
      9
     ],
     [
      12,
      9
     ],
     [
      11,
      9
     ],
     [
      10,
      9
     ],
     [
      9,
      9
     ],
     [
      8,
      9
     ],
     [
      7,
      9
     ],
     [
      6,
      9
     ],
     [
      5,
      9
     ],
     [
      4,
      9
     ],
     [
      3,
      9
     ],
     [
      2,
      9
     ]
    ],
    "phase": 21
   },
   {
    "kind": "walker",
    "path": [
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
      3
     ],
     [
      10,
      3
     ],
     [
      9,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ]
    ],
    "phase": 0
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: three watchmen, one laser. A light switch.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: three watchmen, one laser. A light switch.",
  "hintEn": ""
 },
 {
  "id": "daily-27",
  "name": "Fourteen Turns",
  "nameEn": "Fourteen Turns",
  "tag": "DAILY / LOCKDOWN",
  "concept": "Fourteen turns from the theft to the exit, a beam and a watchman that wake only when the trophy moves, and card A for the exit door lying right where the sleeping watchman will walk.",
  "map": [
   "###############",
   "#S.....#....AE#",
   "##.#.###.##.###",
   "#.........#...#",
   "#####.######.##",
   "#....T........#",
   "#.#####.#.##.##",
   "#...a...#.....#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 61,
  "best": 53,
  "routes": 5,
  "headline": [
   "lockdown",
   "after-relic",
   "key-a"
  ],
  "lockdown": 14,
  "lasers": [
   {
    "x": 9,
    "y": 3,
    "dir": "W",
    "range": 11,
    "period": 6,
    "on": 4,
    "phase": 1,
    "afterRelic": true
   }
  ],
  "cameras": [],
  "guards": [
   {
    "path": [
     [
      9,
      7
     ],
     [
      10,
      7
     ],
     [
      11,
      7
     ],
     [
      12,
      7
     ],
     [
      13,
      7
     ],
     [
      13,
      7
     ],
     [
      13,
      7
     ],
     [
      12,
      7
     ],
     [
      11,
      7
     ],
     [
      10,
      7
     ],
     [
      9,
      7
     ],
     [
      9,
      7
     ]
    ],
    "range": 3,
    "phase": 4
   },
   {
    "kind": "walker",
    "path": [
     [
      2,
      7
     ],
     [
      3,
      7
     ],
     [
      4,
      7
     ],
     [
      5,
      7
     ],
     [
      6,
      7
     ],
     [
      7,
      7
     ],
     [
      6,
      7
     ],
     [
      5,
      7
     ],
     [
      4,
      7
     ],
     [
      3,
      7
     ]
    ],
    "phase": 7,
    "afterRelic": true
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, one drone, one laser. Keycards: A. Lockdown 14 turns after the theft. Some security wakes up after the theft.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, one drone, one laser. Keycards: A. Lockdown 14 turns after the theft. Some security wakes up after the theft.",
  "hintEn": ""
 },
 {
  "id": "daily-28",
  "name": "Blackout Ballet",
  "nameEn": "Blackout Ballet",
  "tag": "DAILY / BLACKOUT",
  "concept": "The building blinks: lights on five turns, off three. In the dark the watchmen see one step. Cross the long floors during the dark, or flip the light switch and make your own night.",
  "map": [
   "###############",
   "#S...l.#.....E#",
   "##.#####.###.##",
   "#.............#",
   "####.#####.####",
   "#.............#",
   "##.#######.####",
   "#.....T.......#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 52,
  "best": 45,
  "routes": 5,
  "headline": [
   "light-cycle",
   "guards"
  ],
  "lighting": {
   "initialOn": true,
   "period": 8,
   "on": 5,
   "phase": 0
  },
  "lasers": [],
  "cameras": [],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
     [
      2,
      3
     ],
     [
      3,
      3
     ],
     [
      4,
      3
     ],
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
      3
     ],
     [
      10,
      3
     ],
     [
      9,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ],
     [
      5,
      3
     ],
     [
      4,
      3
     ],
     [
      3,
      3
     ],
     [
      2,
      3
     ]
    ],
    "phase": 3
   },
   {
    "kind": "walker",
    "path": [
     [
      13,
      5
     ],
     [
      12,
      5
     ],
     [
      11,
      5
     ],
     [
      10,
      5
     ],
     [
      9,
      5
     ],
     [
      8,
      5
     ],
     [
      7,
      5
     ],
     [
      6,
      5
     ],
     [
      5,
      5
     ],
     [
      4,
      5
     ],
     [
      3,
      5
     ],
     [
      2,
      5
     ],
     [
      1,
      5
     ],
     [
      2,
      5
     ],
     [
      3,
      5
     ],
     [
      4,
      5
     ],
     [
      5,
      5
     ],
     [
      6,
      5
     ],
     [
      7,
      5
     ],
     [
      8,
      5
     ],
     [
      9,
      5
     ],
     [
      10,
      5
     ],
     [
      11,
      5
     ],
     [
      12,
      5
     ]
    ]
   },
   {
    "kind": "walker",
    "path": [
     [
      3,
      7
     ],
     [
      4,
      7
     ],
     [
      5,
      7
     ],
     [
      6,
      7
     ],
     [
      7,
      7
     ],
     [
      8,
      7
     ],
     [
      9,
      7
     ],
     [
      10,
      7
     ],
     [
      11,
      7
     ],
     [
      12,
      7
     ],
     [
      11,
      7
     ],
     [
      10,
      7
     ],
     [
      9,
      7
     ],
     [
      8,
      7
     ],
     [
      7,
      7
     ],
     [
      6,
      7
     ],
     [
      5,
      7
     ],
     [
      4,
      7
     ]
    ],
    "phase": 2
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: three watchmen. Lights run on a 8-turn cycle, 5 on. A light switch.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: three watchmen. Lights run on a 8-turn cycle, 5 on. A light switch.",
  "hintEn": ""
 },
 {
  "id": "daily-29",
  "name": "Last Beam",
  "nameEn": "Last Beam",
  "tag": "DAILY / LASER RHYTHM",
  "concept": "A beam guards the corridor to the exit and another the trophy floor, where a drone patrols right up to the trophy. The quiet ladders are on the far side; the beams decide whether they are worth it.",
  "map": [
   "###############",
   "#S......#....E#",
   "#######.####.##",
   "#.............#",
   "#.###.####.##.#",
   "#.............#",
   "#.#########.###",
   "#.........#...#",
   "#.##.####.###.#",
   "#......#T.....#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 71,
  "best": 62,
  "routes": 37,
  "headline": [
   "lasers",
   "guards"
  ],
  "lasers": [
   {
    "x": 9,
    "y": 1,
    "dir": "E",
    "range": 5,
    "period": 6,
    "on": 2,
    "phase": 1
   },
   {
    "x": 6,
    "y": 9,
    "dir": "W",
    "range": 4,
    "period": 5,
    "on": 3,
    "phase": 2
   }
  ],
  "cameras": [],
  "guards": [
   {
    "path": [
     [
      8,
      9
     ],
     [
      9,
      9
     ],
     [
      10,
      9
     ],
     [
      11,
      9
     ],
     [
      12,
      9
     ],
     [
      13,
      9
     ],
     [
      12,
      9
     ],
     [
      11,
      9
     ],
     [
      10,
      9
     ],
     [
      9,
      9
     ]
    ],
    "range": 3,
    "phase": 3
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one drone, 2 lasers.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one drone, 2 lasers.",
  "hintEn": ""
 },
 {
  "id": "daily-30",
  "name": "Fuse Box",
  "nameEn": "Fuse Box",
  "tag": "DAILY / CIRCUITS + LOCKDOWN",
  "concept": "Breaker 1 opens the vault and kills one beam; breaker 2 kills the other two, one of them across the start room. Twenty turns of lockdown after the theft decide which breaker you visit before the trophy.",
  "map": [
   "###############",
   "#S.....#.....E#",
   "##.##.##.###.##",
   "#.........#2..#",
   "###.###.#######",
   "#...#1....#...#",
   "##.####.###.#.#",
   "#...DT#.......#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 82,
  "best": 71,
  "routes": 17,
  "headline": [
   "switch-1",
   "switch-2",
   "lockdown"
  ],
  "lockdown": 20,
  "lasers": [
   {
    "x": 6,
    "y": 1,
    "dir": "W",
    "range": 12,
    "period": 8,
    "on": 4,
    "phase": 4,
    "circuit": 1
   },
   {
    "x": 1,
    "y": 7,
    "dir": "E",
    "range": 7,
    "period": 6,
    "on": 3,
    "phase": 2,
    "circuit": 1
   },
   {
    "x": 9,
    "y": 5,
    "dir": "W",
    "range": 11,
    "period": 6,
    "on": 4,
    "phase": 1,
    "circuit": 0
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "Take the trophy and get out unseen. On site: 3 lasers. Breakers: two. Lockdown 20 turns after the theft.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: 3 lasers. Breakers: two. Lockdown 20 turns after the theft.",
  "hintEn": ""
 }
];if(typeof module==='object'&&module.exports)module.exports=levels;else r.HEIST_DAILY_LEVELS=levels;})(globalThis);

})(scope);
export const engine=scope.HeistEngine, cutaway=scope.CutawayRules, plans=scope.HEIST_CUTAWAY_LEVELS, feel=scope.HeistPlayfeel, daily=scope.HEIST_DAILY_LEVELS;
