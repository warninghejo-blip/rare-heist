// Daily Heist, DEMO RF only. All writes share ArenaStore's BEGIN IMMEDIATE transaction
// and DemoStakes wallets. Rewards are retained in the settlement ledger for Friends.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),E=require('../src/engine.js'),levels=require('../src/daily-levels.js');
const DAY=86400000,EPOCH=Date.UTC(2026,9,8),HERO=/^[1-9][0-9]{0,77}$/;
const PRICES=Object.freeze({entry:150,attempts:3}),SPLIT=Object.freeze({winner:80,burn:10,rewards:10});
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
export class DailyHeist{
 constructor(store){
  this.store=store;this.db=store.db;
  this.db.exec(`CREATE TABLE IF NOT EXISTS daily_rounds(day TEXT PRIMARY KEY,level_id TEXT NOT NULL,closes_at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS daily_entries(day TEXT NOT NULL,player TEXT NOT NULL,hero TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>=100),extra INTEGER NOT NULL DEFAULT 0 CHECK(extra BETWEEN 0 AND 5),used INTEGER NOT NULL DEFAULT 0 CHECK(used>=0 AND used<=1+extra),at INTEGER NOT NULL,PRIMARY KEY(day,player,hero));
   CREATE TABLE IF NOT EXISTS daily_attempts(id INTEGER PRIMARY KEY,day TEXT NOT NULL,player TEXT NOT NULL,hero TEXT NOT NULL,actions TEXT NOT NULL,accepted INTEGER NOT NULL CHECK(accepted IN (0,1)),turns INTEGER NOT NULL,at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS daily_settlements(day TEXT PRIMARY KEY,pot INTEGER NOT NULL,paid INTEGER NOT NULL,burned INTEGER NOT NULL,rewards INTEGER NOT NULL,refunded INTEGER NOT NULL,winner TEXT,hero TEXT,turns INTEGER,at INTEGER NOT NULL,CHECK(pot=paid+burned+rewards+refunded));
   CREATE INDEX IF NOT EXISTS daily_attempts_score ON daily_attempts(day,accepted,turns,at,id);`);
 }
 today(){return new Date(this.store.clock()).toISOString().slice(0,10);}
 level(day){const index=Math.floor((Date.parse(day+'T00:00:00Z')-EPOCH)/DAY);return levels[((index%30)+30)%30];}
 round(){const day=this.today(),level=this.level(day);
  this.db.prepare('INSERT OR IGNORE INTO daily_rounds(day,level_id,closes_at) VALUES(?,?,?)').run(day,level.id,Date.parse(day+'T00:00:00Z')+DAY);
  return this.db.prepare('SELECT * FROM daily_rounds WHERE day=?').get(day);
 }
 // Called at startup and on requests, independently of later request validation.
 prepare(){return this.store.tx(()=>{this.closeDue();this.round();});}
 closeDue(){for(const r of this.db.prepare('SELECT * FROM daily_rounds WHERE closes_at<=? AND day NOT IN (SELECT day FROM daily_settlements) ORDER BY day').all(this.store.clock())){
  const entries=this.db.prepare('SELECT * FROM daily_entries WHERE day=?').all(r.day),pot=entries.reduce((n,e)=>n+e.amount,0),best=this.leaders(r.day)[0];
  let paid=0,burned=0,rewards=0,refunded=0,winner=null,hero=null,turns=null;
  if(new Set(entries.map(e=>e.player)).size>=2&&best){paid=Math.floor(pot*80/100);burned=Math.floor(pot*10/100);rewards=pot-paid-burned;winner=best.player;hero=best.hero;turns=best.turns;
   this.db.prepare('UPDATE stake_wallets SET balance=balance+? WHERE player=?').run(paid,winner);
  }else{refunded=pot;for(const e of entries)this.db.prepare('UPDATE stake_wallets SET balance=balance+? WHERE player=?').run(e.amount,e.player);}
  this.db.prepare('INSERT INTO daily_settlements(day,pot,paid,burned,rewards,refunded,winner,hero,turns,at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(r.day,pot,paid,burned,rewards,refunded,winner,hero,turns,r.closes_at);
 }}
 run(fn){this.prepare();return this.store.tx(()=>fn(this.round()));}
 // The API has no hero selector on state/submit: the most recently entered Friend is active.
 entry(day,player,hero=null){return hero===null?this.db.prepare('SELECT * FROM daily_entries WHERE day=? AND player=? ORDER BY at DESC,rowid DESC LIMIT 1').get(day,player):this.db.prepare('SELECT * FROM daily_entries WHERE day=? AND player=? AND hero=?').get(day,player,hero);}
 required(r,player){const e=this.entry(r.day,player);if(!e){
   const previous=this.db.prepare('SELECT 1 FROM daily_entries WHERE player=? AND day<?').get(player,r.day);
   fail(previous?'CLOSED':'NOT_ENTERED',previous?'That Daily Heist has closed':'Enter today’s Daily Heist first');
  }return e;}
 charge(player,amount){this.store.stakes.ensure(player);if(this.db.prepare('UPDATE stake_wallets SET balance=balance-? WHERE player=? AND balance>=?').run(amount,player,amount).changes!==1)fail('INSUFFICIENT','Not enough DEMO RF');}
 // One best attempt per session + Friend; id breaks same-millisecond ties by acceptance order.
 leaders(day){return this.db.prepare(`SELECT a.* FROM daily_attempts a
  WHERE a.day=? AND a.accepted=1 AND NOT EXISTS (SELECT 1 FROM daily_attempts b WHERE b.day=a.day AND b.player=a.player AND b.hero=a.hero AND b.accepted=1 AND (b.turns<a.turns OR (b.turns=a.turns AND b.id<a.id))) ORDER BY a.turns,a.at,a.id`).all(day);}
 view(r,player){const e=this.entry(r.day,player),leaders=this.leaders(r.day),best=leaders.find(x=>x.player===player&&x.hero===e?.hero),pot=this.db.prepare('SELECT COALESCE(sum(amount),0) pot,count(*) entries FROM daily_entries WHERE day=?').get(r.day);
  return {day:r.day,closesAt:r.closes_at,levelId:e?r.level_id:null,...(e?{level:this.level(r.day)}:{}),pot:pot.pot,entries:pot.entries,
   myEntry:e?{heroId:e.hero,attemptsLeft:1+e.extra-e.used,best:best?{turns:best.turns,at:best.at}:null}:null,
   leaders:leaders.slice(0,10).map(x=>({name:this.store.displayName(x.player,x.hero),heroId:x.hero,turns:x.turns,at:x.at})),prices:{...PRICES},split:{...SPLIT},balance:this.store.stakes.peek(player).balance};
 }
 state(player){return this.run(r=>this.view(r,player));}
 enter(player,heroId){return this.run(r=>{
  if(!HERO.test(String(heroId)))fail('REPLAY_INVALID','Invalid Friend id');
  if(this.entry(r.day,player,String(heroId)))fail('ALREADY_ENTERED','This Friend already entered today');
  this.charge(player,PRICES.entry);
  // Reuse the existing capacity column: 1 + 2 included attempts. Existing rows keep 1 + their saved extra.
  // This preserves the deployed CHECK(used <= 1+extra), without rebuilding or changing old entries.
  this.db.prepare('INSERT INTO daily_entries(day,player,hero,amount,extra,at) VALUES(?,?,?,?,?,?)').run(r.day,player,String(heroId),PRICES.entry,PRICES.attempts-1,this.store.clock());return this.view(r,player);
 });}
 // Compatibility endpoint refuses without debiting or changing an existing entry.
 extra(){fail('MAX_EXTRA','Daily Heist includes three attempts, no extra attempts');}
 submit(player,actions){return this.run(r=>{const e=this.required(r,player);
  if(1+e.extra-e.used<=0)fail('NO_ATTEMPTS','No attempts left');
  if(!Array.isArray(actions)||actions.length>3000||actions.some(a=>typeof a!=='string'||!E.ACTIONS.includes(a)))fail('REPLAY_INVALID','Invalid action log');
  const level=E.normalize(this.level(r.day));let state=E.create(level,'ghost');
  for(const action of actions){const next=E.step(level,state,action);if(!next.changed)fail('REPLAY_INVALID','Invalid action log');state=next.state;}
  const accepted=state.status==='won'&&state.alarms===0,at=this.store.clock();
  this.db.prepare('UPDATE daily_entries SET used=used+1 WHERE day=? AND player=? AND hero=?').run(r.day,player,e.hero);
  this.db.prepare('INSERT INTO daily_attempts(day,player,hero,actions,accepted,turns,at) VALUES(?,?,?,?,?,?,?)').run(r.day,player,e.hero,JSON.stringify(actions),Number(accepted),state.turn,at);
  const index=this.leaders(r.day).findIndex(x=>x.player===player&&x.hero===e.hero);
  return {accepted,turns:state.turn,rank:accepted?index+1:null,...this.view(r,player)};
 });}
 history(limit=7){return this.run(()=>{limit=Number(limit);if(!Number.isInteger(limit)||limit<1||limit>30)limit=7;
  return this.db.prepare('SELECT s.*,r.level_id FROM daily_settlements s JOIN daily_rounds r ON r.day=s.day ORDER BY s.day DESC LIMIT ?').all(limit).map(s=>({day:s.day,levelId:s.level_id,pot:s.pot,winner:s.winner?{name:this.store.displayName(s.winner,s.hero),heroId:s.hero,turns:s.turns}:null,burned:s.burned,refunded:s.refunded}));
 });}
 replay(day,rank){return this.run(()=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isInteger(Number(rank))||Number(rank)<1)fail('REPLAY_INVALID','Invalid replay');
  if(day>=this.today())fail('CLOSED','Replays unlock after the day closes');
  if(!this.db.prepare('SELECT 1 FROM daily_settlements WHERE day=?').get(day))fail('REPLAY_INVALID','Replay not found');
  const best=this.leaders(day)[Number(rank)-1];if(!best)fail('REPLAY_INVALID','Replay not found');
  return {day,rank:Number(rank),levelId:this.level(day).id,level:this.level(day),name:this.store.displayName(best.player,best.hero),heroId:best.hero,turns:best.turns,at:best.at,actions:JSON.parse(best.actions)};
 });}
 totals(){const spent=this.db.prepare('SELECT COALESCE(sum(amount),0) n FROM daily_entries').get().n;
  const s=this.db.prepare('SELECT COALESCE(sum(pot),0) pot,COALESCE(sum(paid),0) paid,COALESCE(sum(burned),0) burned,COALESCE(sum(rewards),0) rewards,COALESCE(sum(refunded),0) refunded FROM daily_settlements').get();
  return {spent,held:spent-s.pot,paid:s.paid,burned:s.burned,rewards:s.rewards,refunded:s.refunded};
 }
}
