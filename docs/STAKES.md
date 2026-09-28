# Last Heist stake rounds

Every entrant puts a stake into the pot. When the clock runs out, the last thief standing takes **70%** and **30% is burned**. Everyone has a reason to care about the round, and every contested round removes tokens.

| | State |
|---|---|
| **Stake rounds in DEMO RF** | **Playable now** on the Last Heist server. Play money: the stakes, the pot, the payout and the burn are entries in a SQLite ledger. No token moves. |
| **Stake rounds in real RF** | **Designed, not built.** Section 2 is the escrow specification for Robinhood Chain. Nothing is written as a deployable contract, compiled, audited or deployed. |

The Vibeathon rules ask for simulated rewards, so the game ships the DEMO version and the production design next to it.

## 1. What ships today (DEMO RF)

### Rules

| Rule | Value | Why |
|---|---|---|
| Round type | A STANDARD round (10-minute quiet window, 60-minute cap) created with **NEW STAKE ROUND**. A fresh server also opens `opening-stakes`. | The longer round gives other players time to join and stake. |
| Stake | **50 DEMO RF**, fixed per round, one stake per session per round | A fixed stake means everyone risks the same amount, so no one can buy a bigger share of the pot. |
| When | Any time before the round ends: waiting, open or while the leader edits. You stake before your first raid; retries in the same round are free. | Staking is the entry fee, not a fee per attempt. |
| DEMO wallet | Each guest session gets **200 DEMO RF a day**: once per UTC day the wallet is topped up to 200. It is never lowered, so winnings above 200 are kept. | That is four stake rounds a day. Topping up instead of adding means idle sessions don't pile up free play money. |
| Winner | Unchanged Last Heist rule: the last accepted clean solver when the clock ends, and **at least two different sessions** must have cleared the vault in that round. | Stakes don't change who wins. |
| Split | Winner **70%** (rounded down), burned **30%** (the remainder). The 70% is credited to the winner's DEMO wallet at settlement. There is nothing to claim. | See "The numbers" below. |
| Refunds | **Every stake is refunded** if only one session cleared the vault (`uncontested`), if nobody cleared it (`no-clear`), or if nobody ever started the round (it closes after 24 hours). | Nobody loses a stake in a round that had no contest. |
| Sponsor pool | Stake rounds reserve nothing from the 20,000 DEMO RF sponsor pool, and there is no sponsor top-up. Free rounds keep their 1,000 DEMO RF prize. | The pot is only what players staked, so every number on screen adds up. |

Example: 7 entrants make a 350 DEMO RF pot. `#7730 took 245 DEMO RF · 105 DEMO RF burned`.

### The numbers

- **Is it worth entering?** In an `n`-entrant round, a player who wins with probability `p` expects `p × 0.7 × 50n − 50`. It pays when `p > 1 / (0.7n)`: with 5 entrants a player who wins more than 29% of the time comes out ahead. Stronger players are paid by weaker ones, and the 30% burn is the cost of a contested round.
- **Self-dealing always loses.** A payout needs two clearing sessions. One person running two sessions to fake a contest stakes 100 and gets back 70, losing 30 every time. Without a real opponent the round is uncontested and the stakes simply come back. The burn makes collusion cost money; it can't be avoided by playing against yourself.
- **The burn only grows with real contests.** Refunded rounds burn nothing. The RF ECONOMY calculator's optional stake term is `days × stake rounds a day × entrants × 50 × share of rounds with a winner × 30%`.

### In the game

- **Last Heist lobby, stake round tab** (dashed outline, the RF ECONOMY key for "simulated"): the pot, a 70/30 bar showing what the winner would take and what would burn if the round ended now, entrants as their Friends (#ID and sprite), your DEMO wallet, and a live counter: *"With real RF, stake rounds would have burned N RF so far."* Every stake surface carries a **DEMO, PLAY MONEY** badge.
- **STAKE 50 DEMO RF AND RAID** opens a sheet with the rules and your wallet before and after, then stakes and starts the raid.
- **Settlement card** when the round ends: `Friend #7730 took 245 DEMO RF · 105 DEMO RF burned`, or `Every stake refunded: 100 DEMO RF back to 2 entrants.` The lobby also lists the last settled stake rounds.
- **Studio → RF ECONOMY**: a dashed STAKE ROUNDS pipe, the DEMO ledger totals read from the server with its invariant check, and the calculator's optional stake term (off by default, so the base projection is unchanged).

### Server ledger

Code: `server/stakes.mjs` (ledger), `server/store.mjs` (round integration), `src/economy.js` (`STAKES`, `stakeSplit`, shared by server and UI).

```
stake_wallets(player PK, balance ≥ 0, granted ≥ 0, grant_day)          one DEMO wallet per guest session
stakes(round_id, player, hero, amount > 0, at, status held|settled|refunded, PRIMARY KEY(round_id, player))
stake_settlements(round_id PK, outcome, pot, paid, burned, refunded, winner, hero, entrants, revision, at,
                  CHECK(pot = paid + burned + refunded))
```

- **One stake per session per round** is enforced by the primary key, not only by the check in code.
- **No negative balances.** The debit is `UPDATE … SET balance = balance − 50 WHERE balance ≥ 50`, and the column has `CHECK(balance >= 0)`.
- **Idempotent settlement.** A round settles once, inside the same transaction that advances it past its deadline. After that, a row in `stake_settlements` blocks any repeat, and only `held` stakes ever move to `settled` or `refunded`.
- **Concurrency.** Every write runs in `BEGIN IMMEDIATE` (`ArenaStore.tx`). The test suite races four worker threads on one SQLite file and sends 20 parallel HTTP stakes from one session: each session is charged exactly once.
- **Invariants**, reported by `GET /api/stakes` and on the RF ECONOMY page:
  - `stakes = paid + burned + refunded + held`
  - `wallets = granted − stakes + paid + refunded`
  - every settlement row satisfies `pot = paid + burned + refunded`, and no balance is below zero.

API (same session cookie and CSRF header as the rest of Last Heist):

| Request | Effect |
|---|---|
| `POST /api/rounds {"profile":"standard","stake":true}` | Opens a stake round. Other lengths are refused with `STAKE_PROFILE`. |
| `POST /api/rounds/:id/stake {"heroId":"7730"}` | Stakes 50. Errors: `ALREADY_STAKED`, `INSUFFICIENT_DEMO`, `NOT_STAKE_ROUND`, `ROUND_FINISHED`. |
| `POST /api/rounds/:id/enter` | On a stake round without a stake: `STAKE_REQUIRED`. |
| `GET /api/stakes` | Your wallet, the rules, totals, the invariant check and the last 12 settled rounds. `GET /api/rounds` carries the same object as `stakes`. |
| `GET /api/rounds/:id` | `stakes`: amount, pot, entrants (Friend #ID, name), `projected` 70/30, `settlement`. `null` on free rounds. |

### VPS migration (existing database)

The schema change is additive: three `CREATE TABLE IF NOT EXISTS` statements and one index. No existing table or row is altered. Old rounds have no `stake` field and stay free rounds. The sponsor pool and its reservations are untouched, and stake rounds reserve nothing from it.

1. Stop the service. Copy `last-heist.sqlite` together with its `-wal` and `-shm` files, for example `cp $DATA_DIR/last-heist.sqlite* /root/backup-pre-stakes/`.
2. Deploy the new code. The new file is `server/stakes.mjs`; the changed files are `server/store.mjs`, `server/app.mjs`, `server/funding.mjs`, `src/last-heist.js`, `src/last-client.js`, `src/economy.js`, `src/ui.js`, `src/style.css` and the rebuilt `index.html`.
3. Start the service. On first open the server creates `stake_wallets`, `stakes` and `stake_settlements`, and adds one waiting round, `opening-stakes`, if no round has that id. Restarting again does nothing further.
4. Check:
   - `GET /healthz` shows `"stakes":"demo"`.
   - `GET /api/economy` still has `"invariant":true` with the same `paid` and `reserved` as before, since stake rounds reserve nothing.
   - In a browser session, `GET /api/stakes` returns `"invariant":{"ok":true,…}`.
5. To roll back, stop the service and restore the backup from step 1. Older code would read `opening-stakes` as a free round with a 0 prize, so restore the backup rather than running the old code on the new file.

Tested by `tests/stakes.test.mjs` ("migration"): a database in the previous release's schema, with a claimed award and a live reservation, opens with its data, awards and sponsor invariant intact, gains the stake round once, and takes stakes.

## 2. Production design: stake rounds in real RF

This is the contract and service design for real RF on Robinhood Chain (chain id 4663). It is a specification. `docs/IRareHeistStakes.sol` is an **illustrative interface only**: not compiled, not deployed, not audited.

### Parties and keys

| Role | Holds | Can | Cannot |
|---|---|---|---|
| Player | a hardwired Generations Friend and RF | stake one entry per Friend per round, claim as the Friend's token-bound account, pull refunds | enter twice with one Friend |
| **Result poster** | a server key used only for this | post one result per round, which opens a challenge window | move tokens, change parameters, post twice |
| **Guardian** | a multisig | pause new stakes and results, veto a posted result during its challenge window (the round then refunds) | move tokens anywhere, pause refunds or claims |
| Admin | a multisig behind a 48-hour timelock | rotate the result poster and guardian, set per-round caps for new rounds | touch existing rounds or escrowed RF |

The contract has no function that sends RF anywhere except to a winning Friend's token-bound account, `0x000000000000000000000000000000000000dEaD`, or back to the address that paid the stake. It is not upgradeable.

### Round lifecycle

1. **`createRound(roundId, stake, closesAt, resultBy, rulesHash)`** (operator). Fixes the stake, the stake cutoff, the latest time a result may be posted, and `rulesHash`: the hash of the engine, rules and opening level the round is played under.
2. **`stake(roundId, friendId)`** (player). The player first calls `approve(escrow, stake)` on the RF token (`0x0779369854d3EcdEA927206718FFD7730C67B71f`). The contract then:
   - requires the round to be open and `block.timestamp < closesAt`;
   - requires `Generations.ownerOf(friendId) == msg.sender` or `msg.sender` to be that Friend's token-bound account (the Generations contract exposes it; the game already reads it with selector `0x0be76ed6`), and the Friend to be a hardwired generation;
   - requires `!entered[roundId][friendId]`: **one Friend, one entry**;
   - records the entry before the external call, then does `transferFrom(msg.sender, escrow, stake)` and credits the balance increase actually received, rejecting any shortfall. This handles fee-on-transfer tokens and keeps checks, effects and interactions in order behind a reentrancy guard;
   - emits `Staked(roundId, friendId, payer, amount)`.
   The server admits into the round only Friends that staked on chain, and it reads `Staked` events for that list. Game sessions are bound to the Friend by a signed sign-in: EIP-712, domain `RareHeistStakes`, chain 4663, the escrow address and a nonce.
3. **Play** is unchanged. The server re-runs every submitted route with the deterministic engine (`LastHeist.validateLog`, `takeLead`, `fortify`), exactly as it does today.
4. **`postResult(roundId, outcome, winnerFriendId, proofHash, proofURI)`** (result poster). `outcome` is `Winner`, `Uncontested` or `NoClear`, and `Winner` needs at least two distinct Friends to have cleared the vault. `proofHash` is the keccak-256 of a published **proof bundle**: `rulesHash`, then for every revision the level, the accepted route that took the lead, the obstacle and its proof route, with server timestamps. Posting opens a **challenge window**: 1 hour for STANDARD rounds, and never shorter than the round's quiet window.
5. **Anyone can verify.** Download the bundle, check it against `proofHash`, and replay it with the open-source engine pinned by `rulesHash`. Every lead change must be a clean clear of the then-current revision, and every obstacle must break the previous route and come with a winning proof. The final leader must be `winnerFriendId`, with at least two distinct clearing Friends. A verifier that finds a mismatch sends it to the guardian, who can `veto(roundId)` inside the window. A vetoed round refunds every stake. Replaying the full game on chain would cost too much gas, so the model is optimistic: anyone can check, and the guardian can act.
6. **`settle(roundId)`** (anyone, after the window). For `Winner`, it computes `burn = pot − floor(pot × 7000 / 10000)` and transfers the burn share to `0x…dEaD` **in the same transaction**. The 70% is recorded as claimable by `winnerFriendId`. For `Uncontested` and `NoClear`, every stake becomes refundable. It emits `Settled(roundId, outcome, winnerFriendId, payout, burned)`.
7. **`claim(roundId)`**. Callable only by the winning Friend's **token-bound account** (`msg.sender == Generations.tba(winnerFriendId)`, read at claim time). It sends the payout there, so the prize belongs to the Friend and moves with the NFT. Pull payments mean a failing receiver cannot block settlement.
8. **`refund(roundId, friendId)`**. Returns the stake to the address that paid it. Allowed after a refund outcome, a veto, or **liveness failure**: no result by `resultBy`, or a round still unsettled `resultBy + 7 days` later. Anyone can trigger it for anyone. Refunds loop over no list, so a round with many entrants cannot be blocked by gas limits.

### Timelocks and pause

- **Challenge window** on every result, set by `createRound`.
- **Liveness timelock**: if no result is posted by `resultBy`, refunds open automatically, so players never depend on the server staying online.
- **Admin timelock**: 48 hours for rotating keys and setting caps. It never applies to live rounds.
- **Pause** (guardian) stops `createRound`, `stake` and `postResult`. It never stops `claim` or `refund`: players can always get out.

### Invariants the contract keeps

- `RF.balanceOf(escrow) ≥ Σ open pots + Σ unclaimed payouts + Σ unclaimed refunds`
- For every settled round: `pot = payout + burned` for a winner, or `pot = Σ refunds` for a refund.
- `payout = floor(pot × 70%)` and `burned = pot − payout`: rounding always goes to the burn, and the contract never pays out more than it holds.
- Each `(roundId, friendId)` pair enters once, claims once and refunds once.

### What an audit must cover

- Reentrancy and ordering around `transferFrom`, the burn transfer, `claim` and `refund`. The RF token's exact ERC-20 behaviour: return values, fees on transfer, hooks, any blocklist or pause of its own.
- The ownership and token-bound account checks: spoofing through a stale owner, transferring the NFT between stake and claim, generation checks, `tba` read at claim time.
- Signatures and roles: EIP-712 domain separation (chain id, contract, round), replay across rounds, compromise of the result-poster key. That compromise is bounded by the challenge window, guardian veto and per-round caps, and has to be modelled as such.
- Arithmetic and rounding: basis points, zero and one-entrant pots, maximum pot size.
- Liveness: refund paths with no result, after a veto and while paused; no loops over entrants; griefing through dust entries.
- Timestamps: the stake cutoff against front-running at `closesAt`, and challenge-window boundaries.
- The off-chain verifier: the engine is deterministic, `rulesHash` pins its version, and the proof bundle format is unambiguous. A verifier bug is a funds bug.
- Invariant fuzzing (Foundry) of the properties above, plus a fork test against the real RF token and Generations contract on Robinhood Chain.

### Anti-Sybil

- **One Friend, one entry.** Each extra entry needs another hardwired Friend, not another browser tab. The guest-session model of the DEMO is not used for real RF.
- **Self-play burns money.** A payout needs two clearing Friends. Faking the second one costs 30% of both stakes, and without a second clearer the stakes come back. Colluding with yourself never profits.
- **Optional per-payer cap per round** (set by the admin behind the timelock), so one wallet with many Friends cannot crowd a small round.
- **Bots.** The game ships a solver: the obstacle editor uses it to prove a vault stays beatable. So real-RF rounds should assume solver-assisted players. The skill that decides a round is choosing the obstacle that is hardest for everyone else and still beatable, and holding the lead through the quiet window. Tuning around bots is a design question for playtests, not something the contract can solve.
- **Server trust is limited to results.** The server cannot move funds. A wrong result can be caught by anyone replaying the bundle and vetoed, and liveness refunds cover a server that goes missing.

### Legal note (not legal advice)

A paid entry with a prize can be regulated as gambling, as a skill contest, or both. Last Heist has no randomness: the engine and the guard, camera and laser schedules are deterministic, and results come from player decisions. That supports treating it as a skill contest, but it does not decide the question. Several jurisdictions, including some US states, restrict or ban paid-entry skill contests, and others require a licence. Before any real-RF round, the operator needs legal review in each target jurisdiction, geofencing and age checks, and whatever KYC/AML and tax reporting prizes require. How the RF token itself is classified is a separate question. The 30% burn goes to no one and is not operator revenue. That can matter to a regulator, but it does not replace the review.

### Why the MVP stays simulated

1. **The Vibeathon rules** ask for simulated purchases and rewards.
2. **No audited contract exists.** Section 2 is a specification, not code anyone should send money to.
3. **Identity.** Guest sessions are not people, and the Last Heist server labels attempts with a Friend ID without checking ownership. Real stakes need the on-chain entry and the signed Friend sign-in described above.
4. **Legal review** has not been done.

The DEMO version plays the whole loop, with the same rules, split, refunds and ledger invariants, so the design can be tested with players before any real RF is at risk.
