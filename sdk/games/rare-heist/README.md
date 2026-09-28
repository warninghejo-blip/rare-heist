# Rare Heist: Friend Edition (FriendSDK v0.1.2)

A turn-based stealth heist in a one-bit cutaway building, played as **your own Rare Friend**.
The FriendSDK runtime connects your wallet, lists your hardwired Generations Friends and verifies
ownership on Robinhood Chain (4663) before the game loads. The game then reads that Friend's
original 16×16 one-bit walking frames from the Rare Friends artwork registry through the public
Robinhood Chain RPC and draws them at whole-pixel scale, never recoloured.

This edition contains **Learn** (5 lessons) and the **Solo campaign** (14 jobs, all unlocked).
The shared Last Heist, workshop, creator studio and LIVE BURN exist only in the standalone
Rare Heist build.

## Requirements

- A browser wallet on **Robinhood mainnet (chain 4663)** holding a hardwired Rare Friends
  Generations NFT (generation 1 or higher). This is required for every preview.
- No RF, ETH, signature or transaction is needed to play.

## Controls

| Action | Keyboard | Touch / mouse |
| --- | --- | --- |
| Move along a floor | ← → or A D | ← → buttons, or tap a cell to walk there |
| Climb a ladder | ↑ ↓ or W S | ↑ ↓ buttons |
| Wait one turn | Space | WAIT |
| Vent / EMP / light switch | E / Q / L | VENT / EMP / LIGHT |
| Inspect without spending a turn | I | INSPECT, then tap an object |
| Practice rewind / retry | Z / R | UNDO / RETRY |
| Pause / forecast | P or Esc / F | PAUSE / FORECAST |

Security moves only after you do. Take the trophy and reach the exit. OPERATIVE tolerates the
shown alarm limit; GHOST allows no detection. The top strip has **SOUND** (off by default),
**MOTION** (follows the system reduced-motion setting) and **?** (rules). When a FriendSDK menu
is open, the game ignores input.

## Layout

Everything stays inside the SDK frame (960 × 640 reference) and above the SDK toolbar band at
the bottom: top strip, HUD, board, coach line and one row of action buttons. In phone-sized
frames (360 × 240) the HUD floats over the board, the coach shows two lines, the board keeps
floors tall enough for the whole-pixel Friend and scrolls vertically to follow it, and the job
list scrolls. HINT and INSPECT give the full explanations there.

## Rules and economy

- Lessons are practice: rewind freely; they record no score.
- Local goals per job: CLEAN (no alarm, no EMP), ALL INTEL, PAR (clean, no EMP, within par turns).
- Progress lasts for the session. The SDK sandbox has no storage, so reloading starts fresh.
- **No purchases, rewards, prizes or token actions.** The runtime requires a chance-game
  definition, so `game.json` declares a formal reference (1 RF ticket, one outcome at 10,000 bps
  returning 1 RF). The game never calls `buy`, `play`, `settle` or `redeem`; it only calls
  `read()` once to start the session. Any balance the SDK toolbar shows is the runtime's
  simulated preview ledger.

## Build and run

The game code is generated from the standalone sources. From `publish/rare-heist/sdk`:

```sh
npm ci
npm run generate      # node ../build-sdk.mjs -> heist.generated.js / heist.generated.css
npx friendsdk dev games/rare-heist
npx friendsdk check games/rare-heist
npx friendsdk test games/rare-heist --screenshot artifacts/game.png
npx friendsdk test games/rare-heist --width 360 --screenshot artifacts/game-360.png
npx friendsdk build games/rare-heist --outdir <empty-folder>
```

Edit `../../src/*.js`, `../../sdk/src/*` or this folder's `index.tsx` / `sdk.css`; never edit the
`heist.generated.*` files by hand.

## Files

| File | Purpose |
| --- | --- |
| `index.tsx` | React adapter: `client.read()`, Friend artwork read, loading/error/retry, then `boot()` with a `paused` getter |
| `heist.generated.js` | Generated ESM: game modules, SDK markup and the Friend Edition lobby |
| `heist.generated.css` | Generated copy of the standalone stylesheet |
| `sdk.css` | Layout for the 960 × 640 frame and phone-sized frames |
| `game.json` | Formal, unused chance-game reference required by the runtime |

## Sources and credits

Game, rules, levels and pixel font: Rare Heist (Apache-2.0). Friend artwork: the player's own
Rare Friends Generations NFT, read from chain at play time. SDK runtime: FriendSDK v0.1.2
(Apache-2.0).
