/* Finite, valueless demonstration sponsor budget. No token/transaction code.
   available + reserved (including unclaimed winner awards) + paid = initial.
   Every caller that changes money-like state runs inside ArenaStore.tx. */
export class DemoFunding {
 constructor(db,{initial=20000}={}) {
  this.db=db;
  db.exec(`CREATE TABLE IF NOT EXISTS sponsor_budget(id INTEGER PRIMARY KEY CHECK(id=1),initial INTEGER NOT NULL,available INTEGER NOT NULL CHECK(available>=0));
   CREATE TABLE IF NOT EXISTS prize_reservations(round_id TEXT PRIMARY KEY,amount INTEGER NOT NULL CHECK(amount>0),status TEXT NOT NULL CHECK(status IN ('reserved','released','paid')));`);
  if(!db.prepare('SELECT id FROM sponsor_budget WHERE id=1').get()) {
   const rounds=db.prepare('SELECT state FROM rounds').all().map(x=>JSON.parse(x.state));
   const committed=rounds.filter(x=>x.prizeClaimed||(x.phase!=='finished'||x.outcome==='winner')).reduce((s,x)=>s+x.prize,0);
   // Preserve old DEMO obligations during an upgrade; never silently discard them.
   initial=Math.max(initial,committed);
   db.prepare('INSERT INTO sponsor_budget VALUES(1,?,?)').run(initial,initial);
   for(const r of rounds){const status=r.prizeClaimed?'paid':r.phase==='finished'&&r.outcome!=='winner'?'released':'reserved';
    db.prepare('INSERT INTO prize_reservations VALUES(?,?,?)').run(r.id,r.prize,status);
    if(status!=='released')db.prepare('UPDATE sponsor_budget SET available=available-? WHERE id=1').run(r.prize);
   }
  }
 }
 reserve(r) {
  if(this.db.prepare('SELECT round_id FROM prize_reservations WHERE round_id=?').get(r.id))return;
  const x=this.db.prepare('UPDATE sponsor_budget SET available=available-? WHERE id=1 AND available>=?').run(r.prize,r.prize);
  if(x.changes!==1)throw Object.assign(Error('The finite DEMO sponsor budget is fully committed. Existing prizes remain reserved.'),{code:'DEMO_BUDGET'});
  this.db.prepare("INSERT INTO prize_reservations VALUES(?,?,'reserved')").run(r.id,r.prize);
 }
 settle(r) {
  if(r.phase!=='finished'||r.outcome==='winner')return;
  const x=this.db.prepare("SELECT * FROM prize_reservations WHERE round_id=? AND status='reserved'").get(r.id);
  if(x){this.db.prepare("UPDATE prize_reservations SET status='released' WHERE round_id=?").run(r.id);this.db.prepare('UPDATE sponsor_budget SET available=available+? WHERE id=1').run(x.amount);}
 }
 pay(r) {
  const x=this.db.prepare('SELECT * FROM prize_reservations WHERE round_id=?').get(r.id);
  if(!x||!['reserved','paid'].includes(x.status)||x.amount!==r.prize)throw Object.assign(Error('No matching DEMO prize reserve'),{code:'PRIZE_RESERVE'});
  this.db.prepare("UPDATE prize_reservations SET status='paid' WHERE round_id=?").run(r.id);
 }
 status(id){const x=this.db.prepare('SELECT amount,status FROM prize_reservations WHERE round_id=?').get(id);return x?{...x}:null;}
 summary(){const b=this.db.prepare('SELECT initial,available FROM sponsor_budget WHERE id=1').get();
  const rows=this.db.prepare('SELECT status,COALESCE(sum(amount),0) amount FROM prize_reservations GROUP BY status').all();
  const sums=Object.fromEntries(rows.map(x=>[x.status,x.amount]));
  return {...b,reserved:sums.reserved||0,paid:sums.paid||0,released:sums.released||0,unit:'DEMO RF',realFunds:false,finite:true,
   invariant:b.initial===b.available+(sums.reserved||0)+(sums.paid||0)};
 }
}
