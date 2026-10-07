# Last Heist stake rounds

Standalone rounds use DEMO RF only. New STANDARD rounds have two tiers: **100 RF (Street)** and **1,000 RF (Vault)**. The last clean solver wins if at least two different sessions cleared. Settlement pays **80% to the winner, burns 10%, and reserves 10% for Friend rewards**. No chain transaction occurs.

## 1. What ships today (DEMO RF)

- The shared server wallet tops up to **200 DEMO RF once per UTC day**, preserving balances above 200. Daily Heist uses the same wallet.
- One stake per session per round, before the first raid. Retries in that round are free.
- Uncontested, no-clear and never-started rounds refund every stake. Free rounds retain their sponsor budget and prize.
- Example: three Street stakes create a 300 RF pot: 240 paid, 30 burned, 30 retained for Friend rewards.
- Friend rewards are a recorded DEMO reserve; no real tokens or automatic distribution to NFT accounts.
- New rounds save their split in rounds.state.stakeRules. Existing rounds without that field keep their original **70/30**, including unfinished rounds. Saved stakes, awards and settlements are preserved.

### API

Same session cookie, origin and CSRF header as Last Heist.

| Request | Result |
|---|---|
| POST /api/rounds {"profile":"standard","stake":100} | Street round |
| POST /api/rounds {"profile":"standard","stake":1000} | Vault round |
| POST /api/rounds {"profile":"standard","stake":true} | Compatibility alias for Street; false or omitted means free |
| POST /api/rounds/:id/stake {"heroId":"7730"} | Debit that round's saved amount |
| GET /api/rounds/:id | stakes includes saved winnerPct, burnPct, rewardsPct; projected and settlement include rewards |
| GET /api/stakes | Wallet, rules.tiers, Last Heist totals, daily totals, combined wallet invariant and settled history |

### Additive migration and ledger

Existing tables remain intact. Daily adds daily_rounds, daily_entries, daily_attempts and daily_settlements. Last Heist adds stake_reward_allocations(round_id PRIMARY KEY, rewards >= 0). Startup creates tables and indexes with CREATE IF NOT EXISTS; no data is deleted or table rebuilt.

The original stake_settlements CHECK requires pot = paid + burned + refunded. For compatibility its stored burned column includes both withheld shares; stake_reward_allocations records the Friends component separately. All public views report net burned and rewards separately. Old rows have zero rewards.

Invariants: Last Heist stakes = paid + burned + rewards + refunded + held; Daily spent = paid + burned + rewards + refunded + held. Shared wallets = granted − Last Heist stakes + Last Heist paid/refunded − Daily spent + Daily paid/refunded. Settlement is once per round/day, inside BEGIN IMMEDIATE; wallets cannot go negative.

Daily rules and HTTP contract: [DAILY.md](DAILY.md). The historical real-RF design below is unbuilt and has not been updated to the new DEMO economics.

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
