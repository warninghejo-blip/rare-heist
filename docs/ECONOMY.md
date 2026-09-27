# Economy

Rare Heist follows the Vibeathon rule that purchases and rewards stay simulated: **DEMO is the default and all you need to play.** On top of that sits one opt-in, real-token feature, **LIVE BURN (beta)**, that only ever destroys RF. It never pays anyone.

## Live today

| Part | State |
|---|---|
| **LIVE BURN (beta)** | **Real RF, opt-in.** Studio → LIVE BURN. You burn RF from your own wallet to unlock cosmetics. 100% goes to `0x…dEaD`. Details below. |
| **Real $RAREFRIENDS balances** | Read-only. The Studio reads RF (`0x0779…B71f`, Robinhood Chain) for your connected wallet and for your Friend's own wallet (its token-bound account from `Generations.tokenBoundAccount`). |
| **Last Heist sponsor pool** | Simulated on the server. The pool starts at 20,000 DEMO RF, and 1,000 is reserved per round. The last accepted clean solver collects it once. Empty or uncontested rounds return the reservation. Invariant: initial = available + reserved + paid. |
| **Creator Studio (DEMO)** | Simulated locally, with a separate DEMO balance. A cosmetic content pack and themes are sold with a proposed split of 70% creator, 20% burn and 10% developer. No gameplay power is for sale. |

Playing is free. A transaction is sent only when you press a LIVE BURN button and confirm it twice: once in the game, once in your wallet.

## LIVE BURN (beta)

### RF costs

| Item | Kind | Cost | What it does |
|---|---|---|---|
| Golden Trail | cosmetic | 25 RF, burned | Lime footprints on the cells your Friend just left. LIVE only. |
| Hatchwork | theme | 10 RF, burned | Black-and-white paper texture around the interface |
| Signal Paper | theme | 10 RF, burned | Lime stipple around the interface |
| The Black Archive | level pack | 50 RF, burned | Three extra heists. Harder, not stronger: no gear, stat or score boost |
| Tribute | Hall of Ash | any amount from 1 RF, burned | Your Friend's place in the Hall of Ash leaderboard |

| Rule | Value |
|---|---|
| Burned | 100% of every payment |
| Paid to anyone | 0%: no creator, developer, treasury or prize share |
| Outcome probabilities | None. Every burn gives exactly the listed item. No randomness. |
| Consumables | None. Unlocks are permanent and cosmetic. |
| Gameplay advantage | None. Items change no rule, stat, score, PAR or Last Heist result. |
| Refunds | None. Tokens at `0x…dEaD` cannot be recovered by anyone. |

Hatchwork, Signal Paper and The Black Archive can also be unlocked in DEMO with DEMO RF, so nothing a player needs sits behind real tokens.

### How it works

1. **One plain transfer.** The game asks your wallet for one ERC-20 `transfer(0x000000000000000000000000000000000000dEaD, amount)` on the RF token `0x0779369854d3EcdEA927206718FFD7730C67B71f`. There are no approvals, no contract of ours, no custody and no server in the path.
2. **A tag after the call data.** 32 bytes appended after the standard arguments: `RHST`, version `01`, an item code and the Friend's token ID. The token ignores them. They let anyone rebuild what each burn bought.
3. **Checked from the receipt.** An unlock is granted only when the receipt has status 1 and the RF contract itself logged `Transfer(your address → 0x…dEaD, value ≥ price)`. A transfer elsewhere, a look-alike token or someone else's burn is rejected.
4. **Rebuilt from the chain.** RESTORE FROM CHAIN reads RF `Transfer` logs to `0x…dEaD`, opens each transaction, keeps only tagged Rare Heist burns sent by their own signer, and rebuilds unlocks and the **Hall of Ash**.

Counters on the LIVE screen, all read from Robinhood Chain:
- your RF balance;
- RF you burned through Rare Heist;
- RF all players burned through Rare Heist;
- all RF ever held by `0x…dEaD`.

Code: `src/burn.js`. The wallet allowlist in `src/identity.js` adds only `eth_sendTransaction`, `eth_getTransactionReceipt` and `eth_getTransactionByHash`. Message signing and approvals stay forbidden.

### Tested

- `tests/burn.test.cjs` covers the encoding, the tags, amount parsing, receipt forgery cases and the wallet allowlist.
- `tests/wallet-browser.mjs` runs the full flow in a browser against a mock wallet that holds RF balances and returns real-shaped receipts and logs: confirm, burn, unlock, Hall of Ash, a wallet rejection, not enough RF, and a reload.

It has **not** been run on mainnet with real RF from this build environment, which cannot reach Robinhood Chain. [LIVE-BURN.md](LIVE-BURN.md) is the checklist for a first real burn.

### Why it is behind a switch

The Vibeathon asks MVPs to keep purchases and rewards simulated and to label them. LIVE BURN never pays out, holds no funds and sells no advantage, but it does spend real tokens, so it is opt-in, labelled BETA on every screen, and DEMO stays the default on every load. If the organisers prefer a purely simulated build, the switch can be removed without touching anything else.

## Designed for production

The rules engine is deterministic, and the server already re-runs every submitted action log. That makes a trust-minimised money flow straightforward to add.

**1. Seasons funded in RF**

A sponsor, a community treasury or a creator deposits RF into a round escrow. Anyone can start a round from that pool. Entry stays free: the prize comes from sponsors, not from player stakes.

**2. One Friend, one entrant**

Entering a paid round requires owning a hardwired Generations Friend, checked with `ownerOf` and `generation`. This is the anti-Sybil layer that guest sessions lack today: a second entrant costs a second NFT.

**3. Prize to the Friend's wallet**

The winner is the last accepted clean solver before the deadline. Their RF is paid to the Friend's token-bound account, as FriendSDK games deliver rewards, so the prize moves with the NFT.

**4. Verifiable settlement**

The server signs `(round, revision, winner Friend, route hash)`. The escrow checks the signature and pays out exactly once. Anyone can re-run the published route with the open-source engine to audit the result.

**5. Creator economy**

- Workshop authors publish vault packs.
- Sales are split on-chain: 70% to the creator, 20% burned, 10% to the developer.
- Sponsors can fund a season on a creator's vault, which ties buying content to playing it.

## Why this has economy potential

**Recurring reasons to return.** Every clear changes the shared vault, so each round is new content made by players.

**Demand for RF on several sides:**
- sponsors fund prize pools;
- players buy creator packs;
- creators earn from the vaults they build;
- the burn share removes supply, and LIVE BURN already does so today.

**Friends stay central.** Only owned Friends compete for real prizes, so holding one has in-game utility beyond display.

## Not done yet

The escrow contract is not written or audited, and nothing of ours is deployed. LIVE BURN needs no contract of ours: it uses the RF token's own `transfer`. Real prizes should wait for authenticated holder identity, a contract audit and legal review.
