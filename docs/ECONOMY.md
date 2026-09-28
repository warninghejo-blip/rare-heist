# Economy

Rare Heist follows the Vibeathon rule that purchases and rewards stay simulated: **DEMO is the default and all you need to play.** On top of that sits one opt-in, real-token feature, **LIVE BURN (beta)**, which only ever destroys $RAREFRIENDS (RF). It never pays anyone. The in-game version of this page is **Studio → RF ECONOMY**.

## Where RF goes

```
                         LIVE ON ROBINHOOD CHAIN (real RF, 100% burned)
 YOUR WALLET ──┬── COSMETICS      trail 25 · textures 10 · Black Archive 50 RF ──┐
 (you sign     ├── TRIBUTE        any amount from 1 RF, Hall of Ash ─────────────┤──► 0x…dEaD
  every burn)  ├── VAULT BOUNTY   any amount from 1 RF, Last Heist vault ────────┤    (nobody holds
               └·· WORKSHOP PUBLISHING   designed only ··························┘     this key)

 FAUCETS LIVE TODAY   none. Rare Heist pays out no RF: no play-to-earn, no minting, no real prize.

 SIMULATED (DEMO)     season pool 20,000 DEMO RF → 1,000 per Last Heist round → one verified winner
                      stake rounds: 50 DEMO RF per entry → 70% to the winner / 30% burned; uncontested → refunded
                      DEMO studio split 70% creator / 20% burn / 10% developer (play money)

 DESIGNED, NOT BUILT  season sponsor reserve in RF → the winning Friend's token-bound wallet
                      real-RF stake escrow → 70% to the winning Friend's token-bound wallet, 30% to 0x…dEaD
                      workshop pack sales 70% creator / 20% burned / 10% developer
```

| Part | State |
|---|---|
| **LIVE BURN (beta)** | **Real RF, opt-in.** Cosmetics, Tribute and Vault Bounty. 100% goes to `0x…dEaD`. |
| **Ash ranks** | Titles derived from chain logs: all RF burned in a Friend's name. Recognition only. |
| **Real RF balances and supply** | Read-only: your wallet, your Friend's token-bound wallet, `totalSupply` and the `0x…dEaD` balance. |
| **Last Heist sponsor pool** | Simulated on the server: 20,000 DEMO RF, 1,000 reserved per round, paid once. Invariant: initial = available + reserved + paid. |
| **Last Heist stake rounds** | Simulated on the server, playable: 50 DEMO RF per entry from a 200 DEMO RF daily wallet, 70% to the winner, 30% burned, every stake refunded when fewer than two sessions clear. Invariant: stakes = paid + burned + refunded + held. See [STAKES.md](STAKES.md). |
| **Creator Studio (DEMO)** | Simulated locally with a separate DEMO balance and a proposed 70/20/10 split. |

A transaction is sent only when you press a LIVE BURN button and confirm it twice: once in the game, once in your wallet.

## LIVE BURN (beta)

| Item | Tag code | Cost | What it does |
|---|---|---|---|
| Golden Trail | 1 | 25 RF | Lime footprints behind your Friend. LIVE only. |
| Hatchwork | 2 | 10 RF | Black-and-white paper texture around the interface |
| Signal Paper | 3 | 10 RF | Lime stipple around the interface |
| The Black Archive | 4 | 50 RF | Three extra heists. Harder, not stronger |
| Tribute | 9 | any amount from 1 RF | Your Friend's place in the Hall of Ash |
| **Vault Bounty** | **10** | **any amount from 1 RF** | Raises the stakes on the Last Heist vault; the round winner is titled BOUNTY BREAKER |

| Rule | Value |
|---|---|
| Burned | 100% of every payment |
| Paid to anyone | 0%: no creator, developer, treasury, winner or prize share |
| Outcome probabilities | None. Every burn gives exactly the listed item. No randomness. |
| Gameplay advantage | None. Nothing changes a rule, stat, score, PAR or Last Heist result. |
| Refunds | None. Tokens at `0x…dEaD` cannot be recovered by anyone. |

Hatchwork, Signal Paper and The Black Archive can also be unlocked with DEMO RF, so nothing a player needs sits behind real tokens.

### How it works

1. **One plain transfer.** The wallet is asked for one ERC-20 `transfer(0x000000000000000000000000000000000000dEaD, amount)` on the RF token `0x0779369854d3EcdEA927206718FFD7730C67B71f`. No approvals, no contract of ours, no custody, no server in the path.
2. **A tag after the call data.** 32 bytes: `RHST`, version `01`, the item code, a two-byte attempt nonce and the Friend's token ID. The token ignores them; anyone can rebuild what each burn was for.
3. **Checked from the receipt.** Credited only when the receipt has status 1 and the RF contract itself logged `Transfer(your address → 0x…dEaD, value ≥ amount)`.
4. **One burn at a time.** Every item, the bounty included, goes through the same pending / unknown-outcome lock: no second transaction while one is pending or its outcome is unknown ([LIVE-BURN.md](LIVE-BURN.md)).
5. **Rebuilt from the chain.** RESTORE FROM CHAIN, the Hall of Ash, ash ranks and bounty totals read RF `Transfer` logs to `0x…dEaD` and keep only tagged Rare Heist burns sent by their own signer.

Code: `src/burn.js`. The wallet allowlist in `src/identity.js` adds `eth_sendTransaction` plus the read-only `eth_getTransactionReceipt`, `eth_getTransactionByHash` and `eth_getBlockByNumber` (block time, for bounties). Message signing and approvals stay forbidden.

### Ash ranks

Everything burned with a Friend's tag, by any item and by anyone, is that Friend's **ash**. The rank is a title shown on the reveal card, the home portrait, Last Heist players, the Hall of Ash and the result card. Studio → LIVE BURN shows "next rank in N RF".

| Rank | Ash | Why this step |
|---|---|---|
| EMBER | ≥ 1 RF | the smallest Tribute |
| CINDER | ≥ 25 RF | one Golden Trail |
| FURNACE | ≥ 100 RF | about the whole cosmetic catalogue (95 RF) and a little more |
| ASH LORD | ≥ 500 RF | five times that |

Ranks are recognition only. They come from the latest tagged burns read from the chain plus receipts cached on this device, and from the last read's per-Friend totals when the chain is not reachable. Anyone can burn in a Friend's name; that only honours the Friend.

### Vault Bounty

- **Price:** any amount from 1 RF, 100% burned. Placed from the Last Heist page (**BURN A BOUNTY**), through the same confirmation and lock as every other burn.
- **Attribution:** a bounty counts toward every Last Heist round whose window `[createdAt, finishedAt)` holds the burn's block timestamp. An unfinished round's window is still open. The rule is on the server clock (milliseconds) against the block time (seconds × 1000): a block exactly at the start counts, a block exactly at the end belongs to the next round. Two rounds live at the same moment (usually one STANDARD and one SPRINT) both show that bounty; the sheet says so before you burn.
- **Display:** "BOUNTY: 37.00 RF. Burned on this vault by 4 Friends while this round was live." on the round (untagged burns are counted as wallets), and **BOUNTY BREAKER — 37.00 RF** next to the winner in round history.
- **Nobody is paid.** The winner gets a title. The DEMO prize is unchanged and stays play money.
- **Truth is the chain.** The browser reads the logs and block times itself; the server stores nothing about bounties.

## RF ECONOMY calculator

Studio → RF ECONOMY asks "What would Rare Heist burn per month?" and labels the answer **PROJECTION, NOT A RESULT**. Every assumption is editable.

```
RF per month = 30 × players a day × (share who burn for an item or tribute × average burn
                                     + share who add a vault bounty × average bounty)
             + optional: 30 × stake rounds a day × entrants × 50 × share of rounds with a winner × 30%
share of supply = RF per month ÷ (totalSupply − balanceOf(0x…dEaD)), both read from the RF token
```

The stake term is off by default (0 stake rounds a day), so the default projection stays 4,500 RF. With 10 stake rounds a day, 6 entrants and 80% of rounds ending with a winner it adds 21,600 RF a month. Stake rounds run in DEMO RF today; the term shows what they would burn with real RF.

| Assumption | Default |
|---|---|
| Players a day | 300 |
| Share who burn for an item or tribute that day | 3% |
| Average RF per item or tribute | 15 |
| Share who add a vault bounty that day | 1% |
| Average RF per bounty | 5 |

With the defaults: 4,050 + 450 = **4,500 RF a month**. Read from Robinhood Chain on 2026-09-28 (block 74,666,714): `totalSupply` ≈ 949,574,971 RF and `0x…dEaD` holds ≈ 27.94 RF from five transfers ever. 4,500 RF is about 0.0005% of supply a month, and about 160 times everything burned at `0x…dEaD` so far. The token is young; a steady sink matters more than its share.

## Designed for production

The rules engine is deterministic, and the server already re-runs every submitted action log. That makes a trust-minimised money flow straightforward to add.

1. **Two kinds of rounds in RF.** *Sponsor rounds*: a sponsor, a community treasury or a creator deposits RF into a round escrow, and entry is free. *Stake rounds*: every entrant stakes RF; the winner takes 70% and 30% goes to `0x…dEaD` in the settlement transaction; rounds with no contest refund. Stake rounds are playable in DEMO RF today; the escrow specification (one Friend one entry, result posted by a server key and checkable by anyone replaying the proof, claim by the Friend's token-bound account, timelocks, pause, audit scope, anti-Sybil and a legal note) is in [STAKES.md](STAKES.md).
2. **One Friend, one entrant.** Paid rounds require a hardwired Generations Friend (`ownerOf`, `generation`). A second entrant costs a second NFT.
3. **Prize to the Friend's wallet.** The winner's RF goes to the Friend's token-bound account, so the prize moves with the NFT.
4. **Verifiable settlement.** The server signs `(round, revision, winner Friend, route hash)`; the escrow checks it and pays exactly once. Anyone can re-run the published route with the open-source engine.
5. **Creator economy.** Workshop authors publish vault packs, with a publishing burn. Sales split on-chain: 70% creator, 20% burned, 10% developer. Sponsors can fund a season on a creator's vault.

## Why this has economy potential

- **Sinks that are live today** on real RF: cosmetics, tributes and vault bounties, each verifiable from chain logs.
- **A sink driven by competition:** in stake rounds every contested round burns 30% of its pot, and playing against yourself only burns your own stake. Playable in DEMO RF now.
- **Recognition that compounds:** ash ranks and BOUNTY BREAKER titles give a reason to burn again that does not buy power.
- **Recurring content:** every clear changes the shared vault, so each round is new content made by players.
- **Demand from several sides once seasons go on-chain:** sponsors fund prize reserves, players buy creator packs, creators earn from vaults, and the burn share removes supply.
- **Friends stay central:** only owned Friends would compete for real prizes, and prizes land in the Friend's own wallet.

## Not done yet

The escrow contracts (sponsor and stake rounds) are specified, not written or audited, and nothing of ours is deployed; `IRareHeistStakes.sol` is an illustrative interface only. LIVE BURN needs no contract of ours: it uses the RF token's own `transfer`. Real prizes should wait for authenticated holder identity, a contract audit and legal review. The calculator is a projection; the only results are the chain counters beside it.
