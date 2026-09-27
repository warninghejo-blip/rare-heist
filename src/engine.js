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
          if(d.range!=null&&(!Number.isInteger(d.range)||d.range<0||d.range>14))errors.push('Guard range must be 0–14');
          if(!Array.isArray(d.path)||d.path.length<2||d.path.length>24||d.path.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isInteger)||p[0]<1||p[1]<1||p[0]>=w-1||p[1]>=h-1||tile(raw,p[0],p[1])==='#'))errors.push('Guard path must stay on the floor');
          else for(let i=0;i<d.path.length;i++){const p=d.path[i],q=d.path[(i+1)%d.path.length];if(Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])>1)errors.push('Guard path must loop using adjacent cells');}
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
    if(raw.maxAlarms!=null&&(!Number.isInteger(raw.maxAlarms)||raw.maxAlarms<1||raw.maxAlarms>3))errors.push('Alarm limit must be 1–3');
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
      tag:String(raw.tag||'CUSTOM').slice(0,30),emps:raw.emps??1,maxAlarms:raw.maxAlarms??3,
      par:Number.isInteger(raw.par)?Math.max(1,Math.min(999,raw.par)):80,
      lockdown:raw.lockdown??null,ventsWithRelic:raw.ventsWithRelic!==false,
      lasers:[],cameras:[],guards:[]};
    for(const k of ['lasers','cameras','guards'])for(const d of raw[k]||[]){
      const n={};for(const v of ['x','y','dir','range','period','on','phase','circuit','speed'])if(d[v]!=null)n[v]=d[v];
      if(d.afterRelic)n.afterRelic=true;
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
      const p=guardAt(d,atTurn);guards.push({...p,source:i});
      if(sensorsPaused(s,atTurn)||d.range===0||(d.afterRelic&&!s.relic)||(d.circuit!=null&&(s.switches&(1<<d.circuit))))return;
      for(const q of ray(l,s,p.x,p.y,p.dir,sightRange(l,s,d.range||2,atTurn)))vision.push({...q,source:i,type:'guard'});
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
    const collision=h.guards.some((g,i)=>same(g,s)||(same(h0.guards[i],s)&&same(g,old)&&moved&&action!=='VENT'));
    const spotted=h.lasers.some(p=>same(p,s))||h.vision.some(p=>same(p,s));
    if(collision){s.status='lost';s.failure={kind:'drone',turn:s.turn,x:s.x,y:s.y};s.events.push('caught');}
    else if(spotted){
      s.alarms++;s.events.push('alarm');
      if(s.alarms>=(s.mode==='ghost'?1:l.maxAlarms)){s.status='lost';s.failure={kind:h.lasers.some(p=>same(p,s))?'laser':h.vision.find(p=>same(p,s))?.type||'camera',turn:s.turn,x:s.x,y:s.y};s.events.push('caught');}
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
  function medal(l,s){if(s.status!=='won')return null;return s.alarms===0&&s.empUsed===0&&s.turn<=l.par?'ghost':s.alarms===0?'clean':'escaped';}
  return {DIRS,ACTIONS,tile,positions,validate,normalize,create,step,replay,threats,ray,solid,held,doorOpen,deviceAt,guardAt,active,sensorsPaused,period,countIntel,score,medal,interact,xy,same,lightsOn,canToggleLight};
});
