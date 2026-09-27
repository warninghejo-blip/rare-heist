import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {DemoFunding} from './funding.mjs';
const require=createRequire(import.meta.url),A=require('../src/last-heist.js');
const hash=x=>createHash('sha256').update(x).digest('hex');
const uid=()=>randomBytes(16).toString('hex');
function error(code,message){const e=new Error(message);e.code=code;throw e;}
export class ArenaStore{
 constructor(file,{clock=Date.now,minActionMs=80,seed=true}={}){
  this.clock=clock;this.minActionMs=minActionMs;this.db=new DatabaseSync(file);
  this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
  this.db.exec(`CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,player TEXT UNIQUE NOT NULL,name TEXT NOT NULL,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS rounds(id TEXT PRIMARY KEY,state TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY,player TEXT NOT NULL,round_id TEXT NOT NULL,revision INTEGER NOT NULL,level TEXT NOT NULL,started INTEGER NOT NULL,expires INTEGER NOT NULL,result TEXT,submission_hash TEXT);
   CREATE TABLE IF NOT EXISTS awards(round_id TEXT PRIMARY KEY,player TEXT NOT NULL,amount INTEGER NOT NULL,at INTEGER NOT NULL);
   CREATE INDEX IF NOT EXISTS attempts_player ON attempts(player,started);
   CREATE INDEX IF NOT EXISTS attempts_round ON attempts(round_id);`);
  const cols=this.db.prepare('PRAGMA table_info(attempts)').all().map(x=>x.name);if(!cols.includes('actions'))this.db.exec('ALTER TABLE attempts ADD COLUMN actions TEXT');if(!cols.includes('hero'))this.db.exec("ALTER TABLE attempts ADD COLUMN hero TEXT DEFAULT '3412'");
  this.funding=new DemoFunding(this.db);
  if(seed&&!this.db.prepare('SELECT id FROM rounds LIMIT 1').get())this.tx(()=>{
   for(const profile of ['sprint','standard']){const r=A.createRound('opening-'+profile,this.clock(),profile,{waiting:true});this.funding.reserve(r);this.put(r);}
  });
 }
 tx(fn){this.db.exec('BEGIN IMMEDIATE');try{const v=fn();this.db.exec('COMMIT');return v;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 put(r){this.db.prepare('INSERT INTO rounds(id,state) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state').run(r.id,JSON.stringify(r));return r;}
 get(id){const row=this.db.prepare('SELECT state FROM rounds WHERE id=?').get(id);if(!row)error('NOT_FOUND','Round not found');return JSON.parse(row.state);}
 current(id){const r=A.advance(this.get(id),this.clock());this.funding.settle(r);this.put(r);return r;}
 session(token){if(!token||!/^[a-f0-9]{64}$/.test(token))return null;return this.db.prepare('SELECT player,name,csrf,expires FROM sessions WHERE token=? AND expires>?').get(hash(token),this.clock())||null;}
 bootstrap(token){let s=this.session(token);if(s)return {token:null,session:s};
  this.db.prepare('DELETE FROM sessions WHERE expires<?').run(this.clock()-86400000);
  if(this.db.prepare('SELECT count(*) as n FROM sessions').get().n>=3000)error('CAPACITY','Demo session capacity reached');
  const newToken=randomBytes(32).toString('hex'),player=uid(),csrf=uid(),name='Friend-'+player.slice(0,4).toUpperCase(),expires=this.clock()+7*86400000;
  this.db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(hash(newToken),player,name,csrf,expires);return {token:newToken,session:{player,name,csrf,expires}};
 }
 rename(player,name){if(typeof name!=='string')error('NAME','Invalid display name');name=name.normalize('NFKC').replace(/[<>\x00-\x1f\x7f]/g,'').trim().slice(0,24);if(name.length<2)error('NAME','Name needs at least two characters');this.db.prepare('UPDATE sessions SET name=? WHERE player=?').run(name,player);return {name};}
 names(r){const ids=new Set([r.leader,...r.events.map(e=>e.player),...r.changes.map(e=>e.player)].filter(Boolean)),out={};for(const id of ids)out[id]=this.db.prepare('SELECT name FROM sessions WHERE player=?').get(id)?.name||'Archived Friend';return out;}
 view(r,me){return {...A.publicRound(r,this.clock(),me),names:this.names(r),source:'server',rewardUnit:'DEMO RF',identity:'guest-session',quorum:2,funding:this.funding.status(r.id)};}
 list(me){return this.tx(()=>this.db.prepare('SELECT id FROM rounds ORDER BY rowid DESC LIMIT 30').all().map(row=>this.view(this.current(row.id),me)));}
 round(id,me){return this.tx(()=>this.view(this.current(id),me));}
 create(player,profile){return this.tx(()=>{
  if(typeof profile!=='string'||!Object.hasOwn(A.PROFILES,profile))error('PROFILE','Unknown profile');
  const recent=this.db.prepare('SELECT id FROM rounds ORDER BY rowid DESC').all().map(r=>this.current(r.id));
  if(recent.length>=2000)error('ROUND_CAPACITY','This DEMO installation has reached its archive capacity. Existing awards are preserved');
  if(recent.some(r=>r.creator===player&&r.createdAt>this.clock()-60000))error('CREATE_COOLDOWN','Wait one minute before creating another round');
  if(recent.filter(r=>A.advance(r,this.clock()).phase!=='finished').length>=8)error('ROUND_LIMIT','Finish an existing round first');
  const r=A.createRound(uid().slice(0,12),this.clock(),profile,{waiting:true});r.creator=player;this.funding.reserve(r);this.put(r);return this.view(r,player);
 });}
 enter(id,player,heroId='3412'){return this.tx(()=>{
  const r=A.activate(this.current(id),this.clock()),now=r.lastClock;
  if(r.phase==='finished')error('ROUND_FINISHED','This round has ended');if(r.phase!=='open')error('EDIT_RESERVED','The latest solver is preparing one change');if(r.leader===player)error('OWN_DEFENCE','You already defend this vault');
  const recent=this.db.prepare('SELECT id,started FROM attempts WHERE player=? ORDER BY started DESC LIMIT 1').get(player);if(recent&&now-recent.started<500)error('RATE_LIMIT','Please wait before restarting');
  this.db.prepare('DELETE FROM attempts WHERE expires<? AND result IS NULL').run(now-86400000);
  const ticket=uid(),expires=Math.min(now+A.PROFILES[r.profile].attemptMs,r.deadline,r.hardEnd);
  this.db.prepare('INSERT INTO attempts(id,player,round_id,revision,level,started,expires) VALUES(?,?,?,?,?,?,?)').run(ticket,player,id,r.revision,JSON.stringify(r.level),now,expires);
  this.db.prepare('UPDATE attempts SET hero=? WHERE id=?').run(/^[1-9][0-9]{0,77}$/.test(String(heroId))?String(heroId):'3412',ticket);
  r.attemptCount++;this.put(r);return {ticket,revision:r.revision,expires,round:this.view(r,player)};
 });}
 attempt(ticket,player){return this.tx(()=>{
  if(typeof ticket!=='string'||!/^[a-f0-9]{32}$/.test(ticket))error('ATTEMPT','Unknown attempt');
  const a=this.db.prepare('SELECT * FROM attempts WHERE id=? AND player=?').get(ticket,player);
  if(!a)error('ATTEMPT','Unknown attempt');const r=this.current(a.round_id);
  return {ticket:a.id,roundId:a.round_id,revision:a.revision,level:JSON.parse(a.level),expires:a.expires,heroId:a.hero||'3412',
   expired:r.lastClock>=a.expires,stale:a.revision!==r.revision||r.phase!=='open',round:this.view(r,player),receipt:a.result?JSON.parse(a.result):null};
 });}
 economy(){return this.tx(()=>{for(const x of this.db.prepare('SELECT id FROM rounds').all())this.current(x.id);return this.funding.summary();});}
 finish(id,ticket,player,actions){return this.tx(()=>{
  const a=this.db.prepare('SELECT * FROM attempts WHERE id=? AND round_id=? AND player=?').get(ticket,id,player);if(!a)error('ATTEMPT','Unknown attempt');
  if(!Array.isArray(actions)||actions.length>A.MAX_ACTIONS)error('ACTIONS','Invalid action list');const digest=hash(JSON.stringify(actions));
  if(a.result){if(digest!==a.submission_hash)error('ALREADY_SUBMITTED','The attempt already has a different receipt');return JSON.parse(a.result);}
  const r=this.current(id),now=r.lastClock;
  if(now>=a.expires)error('ATTEMPT_EXPIRED','Attempt expired');
  if(now-a.started<actions.length*this.minActionMs)error('TOO_FAST','Submission arrived before the minimum animation time');
  const play=A.validateLog(JSON.parse(a.level),actions,false);
  let receipt,updated=r;
  if(play.state.status==='lost'){
   updated.failedCount++;receipt={accepted:true,result:'lost',turns:play.state.turn,failure:play.state.failure};
  }else if(r.phase==='finished'||a.revision!==r.revision||r.phase!=='open'||r.leader===player){
   receipt={accepted:false,result:'outdated',turns:play.state.turn,message:'Valid clear, but the competitive window changed. No leadership was awarded.'};
  }else{updated=A.takeLead(r,player,a.revision,actions,now);receipt={accepted:true,result:'leader',turns:play.state.turn};}
  this.put(updated);receipt.round=this.view(updated,player);receipt.receiptId=ticket;receipt.serverNow=now;
  // Store only after successful verification. Duplicate delivery returns this exact receipt.
  this.db.prepare('UPDATE attempts SET result=?,submission_hash=?,actions=? WHERE id=?').run(JSON.stringify(receipt),digest,JSON.stringify(actions),ticket);return receipt;
 });}
 context(id,player){return this.tx(()=>{const r=this.current(id);if(r.phase!=='editing'||r.lease?.player!==player)error('NO_EDIT_RIGHT','No editing lease');return {round:this.view(r,player),referenceActions:r.referenceActions};});}
 fortify(id,player,revision,change,actions){return this.tx(()=>{const before=this.current(id),last=before.changes.at(-1);if(before.revision===revision+1&&last?.player===player&&['kind','x','y','dir'].every(k=>last[k]===change?.[k]))return this.view(before,player);const r=A.fortify(before,player,revision,change,actions,this.clock());this.put(r);return this.view(r,player);});}
 skip(id,player){return this.tx(()=>{const r=A.skip(this.current(id),player,this.clock());this.put(r);return this.view(r,player);});}
 claim(id,player){return this.tx(()=>{
  const r=A.claim(this.current(id),player,this.clock());this.funding.pay(r);this.put(r);
  this.db.prepare('INSERT OR IGNORE INTO awards(round_id,player,amount,at) VALUES(?,?,?,?)').run(id,player,r.prize,r.lastClock);
  return {round:this.view(r,player),balance:this.balance(player),receipt:this.db.prepare('SELECT * FROM awards WHERE round_id=?').get(id)};
 });}
 replays(id,player){return this.tx(()=>{const r=this.current(id);if(r.phase!=='finished')error('REPLAYS_LOCKED','Replays unlock after the round ends');const names=this.names(r);return {round:this.view(r,player),records:this.db.prepare('SELECT * FROM attempts WHERE round_id=? AND actions IS NOT NULL ORDER BY started DESC LIMIT 20').all(id).map(a=>{const v=JSON.parse(a.result);return {id:a.id,name:names[a.player]||this.db.prepare('SELECT name FROM sessions WHERE player=?').get(a.player)?.name||'Archived Friend',revision:a.revision,record:{v:1,at:new Date(a.started).toISOString(),level:JSON.parse(a.level),actions:JSON.parse(a.actions),mode:'ghost',status:v.result==='lost'?'lost':'won',turns:v.turns,practice:v.result==='outdated',heroId:a.hero||'3412'}};})};});}
 balance(player){return this.db.prepare('SELECT COALESCE(sum(amount),0) as total FROM awards WHERE player=?').get(player).total;}
 close(){this.db.close();}
}
