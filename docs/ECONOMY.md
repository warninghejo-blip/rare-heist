# Economy

Rare Heist follows the Vibeathon rule that purchases and rewards stay simulated: **DEMO is the default and all you need to play.** The economy has two parts:

1. **Stake rounds in Last Heist: the core loop.** Every entrant stakes 100 (Street) or 1,000 (Vault); the winner takes 80%, 10% is burned and 10% is reserved for Friend rewards. Playable now in **DEMO RF** (play money on the game server). The real-RF version is designed ([STAKES.md](STAKES.md)), not built.
2. **The shop: real RF, 100% burned.** Four items, bought with a plain RF transfer to `0x…dEaD` (**LIVE BURN, beta**). Nobody is paid.

Daily Heist uses the shared DEMO wallet: 150 entry for three attempts, no extra purchases. The server verifies clean runs, closes each UTC day once and settles 80/10/10; fewer than two entrants or no clean win refunds all fees. See [DAILY.md](DAILY.md). Shop DEMO prices match LIVE BURN prices; the local studio starts with its existing 100 DEMO RF balance. Existing Last Heist rounds retain 70/30.

Rare Heist pays out no real RF: no faucets, no play-to-earn, no minting, no real prize. The in-game version of this page is **Studio → RF ECONOMY**.

## Where RF goes

```
 YOUR WALLET ──┬── SHOP, 100% BURNED   Black Archive 2,500 · Golden Trail 500 · textures 250 each ──┬──► 0x…dEaD
 (you sign     │                       LIVE on Robinhood Chain                               │    (nobody holds
  every burn)  └╌╌ STAKE ROUNDS        10% of every contested pot                  ╌╌╌╌╌╌╌╌┘     this key)
                                       DEMO RF today; with real RF it would land here

 FAUCETS LIVE TODAY   none
 DEMO RF TODAY        stake rounds: 100 or 1,000 per entry from a 200-a-day wallet → 80% winner / 10% burned / 10% Friend rewards; no contest → refund
                      free rounds: 20,000 DEMO RF sponsor pool → 1,000 to each round's verified winner
                      DEMO studio: play-money versions of the shop items
 DESIGNED, NOT BUILT  real-RF stake escrow: one Friend one entry, 70% to the winning Friend's token-bound wallet,
                      30% to 0x…dEaD in the same transaction
```

| Part | State |
|---|---|
| **Last Heist stake rounds** | **DEMO RF, playable.** 100 or 1,000 DEMO RF per entry from a 200 DEMO RF daily wallet, 80% to the winner, 10% burned, 10% Friend rewards, every stake refunded when fewer than two sessions clear. Invariant: stakes = paid + burned + rewards + refunded + held. See [STAKES.md](STAKES.md). |
| **Shop (LIVE BURN, beta)** | **Real RF, opt-in.** Four items, 100% to `0x…dEaD`. |
| **Burn ledger** | Every tagged Rare Heist burn read from chain logs, with its item, amount, Friend and transaction. |
| **Real RF balances and supply** | Read-only: your wallet, your Friend's token-bound wallet, `totalSupply` and the `0x…dEaD` balance. |
| **Free-round sponsor pool** | DEMO RF on the server: 20,000, 1,000 reserved per free round, paid once. Invariant: initial = available + reserved + paid. |
| **DEMO studio** | DEMO RF on this device: Hatchwork, Signal Paper and The Black Archive for play money. |

## Stake rounds (the core loop)

Rules, the numbers (when entering pays, why self-dealing always loses), the server ledger and the production escrow design are in [STAKES.md](STAKES.md). In the game:

- **Last Heist opens on the stake round.** It is the first tab: pot, an 80/10/10 split of what the winner would take and what would burn if the round ended now, entrants as their Friends, your DEMO wallet, and the settled stake rounds.
- **Studio → RF ECONOMY leads with stake rounds:** DEMO RF in live pots, entrants, DEMO RF burned so far, settled rounds, the last winners and the server's ledger check. Every stake surface carries a **DEMO, PLAY MONEY** badge.
- **Road to real RF** (a card on the same page, all but step 1 unbuilt): DEMO stake rounds (now) → escrow contract, audited → one Friend one entry (on-chain stake, signed Friend sign-in) → results anyone can check (proof bundle, guardian veto) → legal review → real-RF stake rounds.

## The shop (LIVE BURN, beta)

| Item | Tag code | Cost | What it does |
|---|---|---|---|
| The Black Archive | 4 | 2,500 RF | Three extra heists. Harder, not stronger |
| Golden Trail | 1 | 500 RF | Lime footprints behind your Friend. LIVE only |
| Hatchwork | 2 | 250 RF | Black-and-white paper texture around the interface |
| Signal Paper | 3 | 250 RF | Lime stipple around the interface |

| Rule | Value |
|---|---|
| Burned | 100% of every payment |
| Paid to anyone | 0%: no creator, developer, treasury, winner or prize share |
| Outcome probabilities | None. Every burn gives exactly the listed item |
| Gameplay advantage | None. Nothing changes a rule, stat, score, PAR or Last Heist result |
| Refunds | None. Tokens at `0x…dEaD` cannot be recovered by anyone |

Hatchwork, Signal Paper and The Black Archive can also be unlocked with DEMO RF, so nothing a player needs sits behind real tokens.

**Retired items.** Earlier builds also sold a Tribute (code 9) and a Vault Bounty (code 10), both any amount from 1 RF, with ash ranks and a Hall of Ash leaderboard. They are removed from the product: nothing can buy them, and there are no ranks, titles or leaderboard. Their tag codes still decode and are never reused, so any past burn with them still shows in the ledger and in RESTORE. Robinhood Chain showed no tagged Rare Heist burns when they were retired.

### How it works

1. **One plain transfer.** The wallet is asked for one ERC-20 `transfer(0x000000000000000000000000000000000000dEaD, price)` on the RF token `0x0779369854d3EcdEA927206718FFD7730C67B71f`. No approvals, no contract of ours, no custody, no server in the path.
2. **A tag after the call data.** 32 bytes: `RHST`, version `01`, the item code, a two-byte attempt nonce and the Friend's token ID. The token ignores them; anyone can rebuild what each burn was for.
3. **Checked from the receipt.** Credited only when the receipt has status 1 and the RF contract itself logged `Transfer(your address → 0x…dEaD, value ≥ price)`.
4. **One burn at a time.** A pending / unknown-outcome lock across tabs: no second transaction while one is pending or its outcome is unknown ([LIVE-BURN.md](LIVE-BURN.md)).
5. **Rebuilt from the chain.** RESTORE FROM CHAIN and the burn ledger read RF `Transfer` logs to `0x…dEaD` and keep only tagged Rare Heist burns sent by their own signer.

Code: `src/burn.js`. The wallet allowlist in `src/identity.js` adds `eth_sendTransaction` plus the read-only `eth_getTransactionReceipt` and `eth_getTransactionByHash`. Message signing and approvals stay forbidden.

### Burn ledger

Studio → LIVE BURN shows **RF burned through Rare Heist: N** and the list of tagged Rare Heist burns, newest first: item, amount, the Friend (#ID and sprite) if the burn was tagged with one, otherwise the sender, and a link to the transaction on the Robinhood Chain explorer (`https://robinhoodchain.blockscout.com/tx/…`, the explorer FriendSDK v0.1.2 registers for chain 4663). Below it, **your burn receipts**. No titles, no ranks, no ordering by amount. The global list reads the latest 200 transfers to `0x…dEaD` and says so when older ones are left out.

## RF ECONOMY calculator

Studio → RF ECONOMY asks "What would Rare Heist burn per month with real RF?" and labels the answer **PROJECTION, NOT A RESULT**. Every assumption is editable.

```
RF per month = 30 × stake rounds a day × entrants × 100 × share of rounds with a winner × 10%
             + 30 × players a day × share who buy a shop item × average RF per item
share of supply = RF per month ÷ (totalSupply − balanceOf(0x…dEaD)), both read from the RF token
```

| Assumption | Default |
|---|---|
| Stake rounds a day | 10 |
| Entrants per stake round | 6 |
| Share of stake rounds that end with a winner (the rest refund) | 80% |
| Players a day | 300 |
| Share who buy a shop item that day | 3% |
| Average RF per shop item (items cost 250 to 2,500) | 20 |

With the defaults: 14,400 from Street stake rounds + 5,400 from the shop = **19,800 RF a month**. Stake rounds run in DEMO RF today, so their term is what they would burn with real RF. Read from Robinhood Chain on 2026-09-28 (block 74,666,714): `totalSupply` ≈ 949,574,971 RF and `0x…dEaD` holds ≈ 27.94 RF from five transfers ever. 19,800 RF is about 0.002% of supply a month.

## Why this has economy potential

- **A sink driven by competition.** Every contested stake round burns 10% of its pot, and playing against yourself only burns your own stake. The loop is playable in DEMO RF now, with the same rules and ledger invariants the escrow would enforce.
- **A shop sink that is live today** on real RF, 100% burned, verifiable from chain logs, and never selling an advantage.
- **Recurring content.** Every clear changes the shared vault, so each round is new content made by players.
- **Friends stay central.** Real-RF rounds would take one entry per owned Friend and pay into the Friend's own wallet.

## Not done yet

The stake escrow is specified, not written or audited, and nothing of ours is deployed; `IRareHeistStakes.sol` is an illustrative interface only. The shop needs no contract of ours: it uses the RF token's own `transfer`. Real stakes should wait for the audit, authenticated Friend entry and legal review. The calculator is a projection; the only results are the chain counters and the server ledger beside it.
