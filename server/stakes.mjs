/* DEMO stake rounds: a server-side ledger of play money. No token or transaction code; nothing is real.
   Rules (src/economy.js STAKES, docs/STAKES.md):
   - each guest session has a DEMO wallet that refills to STAKES.allowance once per UTC day (never lowered);
   - one fixed stake (round.stake) per session per round, before entering; the stake leaves the wallet at once;
   - new rounds pay 80%, burn 10% and reserve 10% for Friends; rounds with no saved split retain 70/30;
     uncontested and empty rounds refund every stake;
   - settlement runs once per round (PRIMARY KEY + held -> settled/refunded), inside the caller's transaction.
   Public invariant: stakes = paid + burned + rewards + refunded + held; shared wallets also include Daily debits,
   payouts and refunds. The legacy settlement table keeps its original CHECK (see stake_reward_allocations).
   Every caller that changes this ledger runs inside ArenaStore.tx (BEGIN IMMEDIATE). */
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Eco=require('../src/economy.js'),{STAKES,stakeSplit}=Eco;
const fail=(code,message)=>{const e=new Error(message);e.code=code;throw e;};
const HERO=/^[1-9][0-9]{0,77}$/;
export class DemoStakes {
 constructor(db,{clock=Date.now}={}) {
  this.db=db;this.clock=clock;
  // Additive schema: CREATE IF NOT EXISTS only, so an existing database upgrades in place (docs/STAKES.md, "VPS migration").
  db.exec(`CREATE TABLE IF NOT EXISTS stake_wallets(player TEXT PRIMARY KEY,balance INTEGER NOT NULL CHECK(balance>=0),granted INTEGER NOT NULL DEFAULT 0 CHECK(granted>=0),grant_day TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS stakes(round_id TEXT NOT NULL,player TEXT NOT NULL,hero TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>0),at INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('held','settled','refunded')),PRIMARY KEY(round_id,player));
   CREATE TABLE IF NOT EXISTS stake_settlements(round_id TEXT PRIMARY KEY,outcome TEXT NOT NULL,pot INTEGER NOT NULL CHECK(pot>=0),paid INTEGER NOT NULL CHECK(paid>=0),burned INTEGER NOT NULL CHECK(burned>=0),refunded INTEGER NOT NULL CHECK(refunded>=0),winner TEXT,hero TEXT,entrants INTEGER NOT NULL,revision INTEGER NOT NULL,at INTEGER NOT NULL,CHECK(pot=paid+burned+refunded));
   CREATE INDEX IF NOT EXISTS stakes_held ON stakes(status,round_id);
   CREATE TABLE IF NOT EXISTS stake_reward_allocations(round_id TEXT PRIMARY KEY,rewards INTEGER NOT NULL CHECK(rewards>=0));`);
 }
 day(){return new Date(this.clock()).toISOString().slice(0,10);}
 // Read-only view of a wallet, including today's refill if it has not been written yet.
 peek(player){const w=this.db.prepare('SELECT balance,grant_day FROM stake_wallets WHERE player=?').get(player),today=this.day();
  const balance=!w?STAKES.allowance:w.grant_day===today?w.balance:Math.max(w.balance,STAKES.allowance);
  return {balance,allowance:STAKES.allowance,stake:STAKES.amount,unit:STAKES.unit,refillsDaily:true,day:today};}
 // Materialise the wallet and today's refill. Refill = top up to the allowance; winnings above it are kept.
 ensure(player){const today=this.day(),w=this.db.prepare('SELECT balance,grant_day FROM stake_wallets WHERE player=?').get(player);
  if(!w){this.db.prepare('INSERT INTO stake_wallets(player,balance,granted,grant_day) VALUES(?,?,?,?)').run(player,STAKES.allowance,STAKES.allowance,today);return;}
  if(w.grant_day!==today){const add=Math.max(0,STAKES.allowance-w.balance);this.db.prepare('UPDATE stake_wallets SET balance=balance+?,granted=granted+?,grant_day=? WHERE player=?').run(add,add,today,player);}
 }
 has(roundId,player){return !!this.db.prepare('SELECT 1 FROM stakes WHERE round_id=? AND player=?').get(roundId,player);}
 // r: the advanced round (already checked open for staking by the caller).
 stake(r,player,heroId){
  if(!r.stake)fail('NOT_STAKE_ROUND','This round has free entry. No stake is needed');
  if(r.phase==='finished')fail('ROUND_FINISHED','This round has ended');
  if(this.has(r.id,player))fail('ALREADY_STAKED','You already staked on this round. One stake per session per round');
  this.ensure(player);
  const x=this.db.prepare('UPDATE stake_wallets SET balance=balance-? WHERE player=? AND balance>=?').run(r.stake,player,r.stake);
  if(x.changes!==1)fail('INSUFFICIENT_DEMO','Not enough DEMO RF. Your wallet refills to '+STAKES.allowance+' DEMO RF each day (UTC)');
  this.db.prepare("INSERT INTO stakes(round_id,player,hero,amount,at,status) VALUES(?,?,?,?,?,'held')").run(r.id,player,HERO.test(String(heroId))?String(heroId):'3412',r.stake,r.lastClock);
 }
 // Idempotent: once a settlement row exists, nothing moves again. heroes: {player: Friend id played this round}.
 settle(r,heroes={}){
  if(!r.stake||r.phase!=='finished')return null;
  if(this.db.prepare('SELECT 1 FROM stake_settlements WHERE round_id=?').get(r.id))return null;
  const held=this.db.prepare("SELECT player,hero,amount FROM stakes WHERE round_id=? AND status='held'").all(r.id);
  const pot=held.reduce((a,b)=>a+b.amount,0),winnerStake=r.outcome==='winner'&&held.find(x=>x.player===r.leader);
  let paid=0,burned=0,rewards=0,refunded=0,winner=null,hero=null;
  if(winnerStake){
   ({winner:paid,burned,rewards}=stakeSplit(pot,this.rules(r)));winner=r.leader;hero=HERO.test(String(heroes[r.leader]||''))?String(heroes[r.leader]):winnerStake.hero;
   this.db.prepare('UPDATE stake_wallets SET balance=balance+? WHERE player=?').run(paid,winner);
   this.db.prepare("UPDATE stakes SET status='settled' WHERE round_id=? AND status='held'").run(r.id);
  }else{
   for(const x of held)this.db.prepare('UPDATE stake_wallets SET balance=balance+? WHERE player=?').run(x.amount,x.player);
   this.db.prepare("UPDATE stakes SET status='refunded' WHERE round_id=? AND status='held'").run(r.id);refunded=pot;
  }
  this.db.prepare('INSERT INTO stake_settlements(round_id,outcome,pot,paid,burned,refunded,winner,hero,entrants,revision,at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
   .run(r.id,winnerStake?'winner':r.outcome||'no-clear',pot,paid,burned+rewards,refunded,winner,hero,held.length,r.revision,r.finishedAt??r.lastClock);
  // Keep the existing CHECK(pot=paid+burned+refunded) without rebuilding a live table.
  // Its burned column stores all withheld RF; the additive allocation records the Friends share.
  if(rewards)this.db.prepare('INSERT INTO stake_reward_allocations(round_id,rewards) VALUES(?,?)').run(r.id,rewards);
  return {pot,paid,burned,rewards,refunded};
 }
 rules(r){return r.stakeRules||{winnerPct:70,burnPct:30,rewardsPct:0};}
 rewards(roundId){return this.db.prepare('SELECT rewards FROM stake_reward_allocations WHERE round_id=?').get(roundId)?.rewards||0;}
 settlement(roundId){const x=this.db.prepare('SELECT * FROM stake_settlements WHERE round_id=?').get(roundId);
  const rewards=x?this.rewards(roundId):0;
  return x?{roundId:x.round_id,outcome:x.outcome,pot:x.pot,paid:x.paid,burned:x.burned-rewards,rewards,refunded:x.refunded,winner:x.winner,hero:x.hero,entrants:x.entrants,revision:x.revision,at:x.at}:null;}
 // Per-round block for the public round view. name(player, hero) gives the display name.
 view(r,me,name){
  if(!r.stake)return null;
  const rows=this.db.prepare('SELECT player,hero,amount,at FROM stakes WHERE round_id=? ORDER BY at,rowid').all(r.id),pot=rows.reduce((a,b)=>a+b.amount,0),settlement=this.settlement(r.id);
  return {amount:r.stake,unit:STAKES.unit,...this.rules(r),pot,projected:(({winner,burned,rewards})=>({winner,burned,rewards}))(stakeSplit(pot,this.rules(r))),
   mine:rows.some(x=>x.player===me),entrants:rows.map(x=>({player:x.player,hero:x.hero,name:name(x.player,x.hero),you:x.player===me})),
   settlement:settlement&&{...settlement,winnerName:settlement.winner?name(settlement.winner,settlement.hero):null,you:settlement.winner===me},demo:true,realFunds:false};
 }
 pendingRounds(){return this.db.prepare("SELECT DISTINCT round_id FROM stakes WHERE status='held'").all().map(x=>x.round_id);}
 totals(){const one=(sql)=>this.db.prepare(sql).get().v;
  const stakes=one('SELECT COALESCE(sum(amount),0) v FROM stakes'),held=one("SELECT COALESCE(sum(amount),0) v FROM stakes WHERE status='held'");
  const s=this.db.prepare('SELECT COALESCE(sum(paid),0) paid,COALESCE(sum(burned),0) burned,COALESCE(sum(refunded),0) refunded,COALESCE(sum(pot>0),0) rounds FROM stake_settlements').get();
  const w=this.db.prepare('SELECT COALESCE(sum(balance),0) balances,COALESCE(sum(granted),0) granted,count(*) wallets FROM stake_wallets').get();
  const rewards=one('SELECT COALESCE(sum(rewards),0) v FROM stake_reward_allocations');
  return {stakes,held,paid:s.paid,burned:s.burned-rewards,rewards,refunded:s.refunded,settledRounds:s.rounds,balances:w.balances,granted:w.granted,wallets:w.wallets,daily:this.daily?.totals()||{spent:0,held:0,paid:0,burned:0,rewards:0,refunded:0}};}
 invariant(t=this.totals()){const d=t.daily,stakes=t.stakes===t.paid+t.burned+t.rewards+t.refunded+t.held,daily=d.spent===d.paid+d.burned+d.rewards+d.refunded+d.held,wallets=t.balances===t.granted-t.stakes+t.paid+t.refunded-d.spent+d.paid+d.refunded,rows=!this.db.prepare('SELECT 1 FROM stake_settlements WHERE pot<>paid+burned+refunded').get(),negative=!this.db.prepare('SELECT 1 FROM stake_wallets WHERE balance<0').get();
  return {stakes,daily,wallets,rows,nonNegative:negative,ok:stakes&&daily&&wallets&&rows&&negative};}
 history(limit=12,name=()=>null){return this.db.prepare('SELECT round_id FROM stake_settlements WHERE pot>0 ORDER BY at DESC,rowid DESC LIMIT ?').all(limit).map(x=>{const s=this.settlement(x.round_id);return {...s,winnerName:s.winner?name(s.winner,s.hero):null};});}
}
