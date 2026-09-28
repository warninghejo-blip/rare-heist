<div align="center">

<img src="media/rare-heist.gif" alt="Rare Heist: your Rare Friend slips behind a guard with a flashlight, takes the trophy and escapes unseen" width="880">

# RARE HEIST

**Sneak your own Rare Friend through a cutaway building, one move at a time.<br>Then leave the next thief a harder way in.**

[**▶ PLAY IN YOUR BROWSER**](https://rareheist-bc89faa0.sslip.io/) &nbsp;·&nbsp; [mirror](https://warninghejo-blip.github.io/rare-heist/) &nbsp;·&nbsp; [**WATCH THE TRAILER**](media/rare-heist-trailer-720p.mp4) &nbsp;·&nbsp; [1080p](media/rare-heist-trailer.mp4)

Every level, solved (proof video, 2:44: all 23 levels beaten by the stored solutions in `src/solutions.js`, drawn by the game's own engine and renderer): [720p](https://github.com/warninghejo-blip/rare-heist/blob/main/media/all-levels-solved-720p.mp4) · [1080p](https://github.com/warninghejo-blip/rare-heist/blob/main/media/all-levels-solved.mp4)

Rare Friends Vibeathon 2026 · Character Spotlight · Token Activity · free, no install, no wallet needed to try

</div>

---

## The pitch

Every building has a way in. You move one cell, then security moves. Click where you want to go and your Friend walks there, stopping the moment the next step would be seen. Cameras, lasers, patrol drones and guards on foot all run on a readable clock, so a perfect heist is always possible. You just have to see it. One detection ends the job.

The thief is **your** Rare Friend: its original 16×16 frames, read from Robinhood Chain. And in **Last Heist**, the vault itself is written by the players.

<table>
<tr>
<td width="50%"><img src="media/play-as-your-friend.gif" alt="Connect a wallet and play as your own Friend"></td>
<td width="50%"><img src="media/last-heist-evolves.gif" alt="The shared vault gains an obstacle with every clear"></td>
</tr>
<tr>
<td><b>Play as the Friend you own.</b><br>Connect a wallet and the game finds your hardwired Generations Friends. It reads each one's own walking frames from the chain and puts that exact character in every building. Connecting only reads: no signature, no transaction.</td>
<td><b>Last Heist: one vault, every clear changes it.</b><br>Clear the shared vault, then drag one wall, laser or camera from the side palette onto it. A built-in solver checks on the spot that your piece breaks the last winning route and that the vault can still be beaten; then you prove it by clearing your version yourself. The server re-runs every route. The last thief standing when the clock runs out takes the prize.</td>
</tr>
<tr>
<td><img src="media/22-heists.gif" alt="Twenty-two heists solved at once"></td>
<td><img src="media/caught.gif" alt="Spotted: one detection ends the job"></td>
</tr>
<tr>
<td><b>22 handmade heists.</b><br>Five lessons, a 14-job campaign and a 3-job Black Archive. Guards on foot with flashlights, keycards, pressure plates, circuits, blackouts, vents, lockdowns and drones you hide from in a ladder hatch. Every level ships with a clean solution found by an automated solver: press WATCH SOLUTION in any job, or open the full list at the bottom of SOLO VAULTS.</td>
<td><b>Read the clock or get caught.</b><br>INSPECT shows any device's next beats without spending a turn. Guards see three cells ahead, one in the dark, and EMP does not stop them; cut the lights or wait in a hatch. The optional INTEL folder is the security plans: take it and every patrol route, with its turn points, and every camera sweep stays drawn on the building for the rest of the job. Get it wrong and the field report shows exactly what saw you, and when.</td>
</tr>
</table>

<div align="center"><img src="media/mobile.gif" alt="Rare Heist on a phone" width="640"><br><b>Works on your phone.</b> Touch controls, and the camera follows your Friend.</div>

---

## Your Friend, exactly as it is

- **The original sprite.** The thief is drawn from the Friend's original 1-bit frames: idle and walk in four directions, never redrawn, never recoloured.
- **The FriendSDK reference look.** Integer scale up to 5×, a black mask and a white one-pixel halo.
- **How your Friends are found.** **CONNECT WALLET** works with any EIP-6963 wallet and switches it to Robinhood Chain (4663). Discovery mirrors FriendSDK's `readOwnedFriends`: `balanceOf`, then the owner-filtered `Transfer` history, then a fresh `ownerOf` and `generation` check.
- **Where the frames come from.** The registry: `familyOf`, then `seedOf`, then `frames(family, seed)`.
- **No wallet? Three ways in:**
  - **PREVIEW** any Friend by token ID.
  - Paste a holder's address to see their Friends (read-only).
  - Play as a guest with the official FriendSDK samples #3412 Skeleton and #7730 Hoverer.
- **The Friend is the star.** Picking a Friend opens a reveal with its own walking frames, #ID, family and generation. The home portrait faces you and breathes on its own idle frames (still with MOTION OFF). Results stage it at the open exit or under a searchlight. Last Heist, the burn ledger and My Runs show every player as its Friend: #ID and sprite, and a Last Heist player who never set a name appears as "Friend #ID".
- **Replays show each player's own Friend.**

## Economy: stake rounds and a burn-only shop

Two parts, nothing else:

| | |
|---|---|
| **Stake rounds in Last Heist (DEMO RF): the core loop** | Last Heist opens on the stake round. Every entrant stakes 50 DEMO RF (a guest wallet refills to 200 a day). When the clock ends the last thief standing takes 70% of the pot and 30% is burned; if fewer than two sessions cleared, every stake comes back. Pot, 70/30 bar, entrants as Friends, settlement card ("#7730 took 245 DEMO RF · 105 DEMO RF burned"). Server ledger with the invariant stakes = paid + burned + refunded + held. **Play money today**; the real-RF escrow is designed, not built. |
| **Shop (LIVE BURN, beta): real RF, 100% burned** | Opt-in, in the Studio. The Black Archive 50 RF, Golden Trail 25 RF, Hatchwork and Signal Paper 10 RF each. One plain RF `transfer` to `0x…dEaD` from your own wallet, checked from the receipt, no approvals, no custody. **Nobody is paid.** No randomness, no gameplay advantage. |
| **Burn ledger** | "RF burned through Rare Heist: N" and every tagged Rare Heist burn read from chain logs: item, amount, Friend #ID if tagged, and the transaction on the Robinhood Chain explorer. No ranks, no titles. |
| **RF ECONOMY page** | Studio → RF ECONOMY leads with stake rounds (live pots, entrants, DEMO RF burned, last winners) and a roadmap card from DEMO RF to real RF. Then where RF goes (shop live, stake rounds DEMO, no faucets), live chain counters and an editable "what would Rare Heist burn per month?" calculator (stake term + shop term), labelled a projection. |

Rare Heist pays out no RF: no faucets, no play-to-earn, no real prize. DEMO stays the default on every load, as the Vibeathon rules ask; the free-round sponsor pool and the DEMO studio are play money, and everything a player needs is free.

- Rules, the flow of RF, the ledger and the calculator model: **[docs/ECONOMY.md](docs/ECONOMY.md)**.
- A first real burn, step by step: **[docs/LIVE-BURN.md](docs/LIVE-BURN.md)**.
- Stake rounds: the DEMO rules and ledger, and the production design for real RF (escrow on Robinhood Chain, one Friend one entry, verifiable results, 30% burned in the settlement transaction, audit scope, anti-Sybil, legal note): **[docs/STAKES.md](docs/STAKES.md)**.

## Controls

| Key | Action | Key | Action |
|---|---|---|---|
| **Click any cell** | walk there; stops before a step that would be seen | Space | wait a turn |
| ← → / A D | walk | | |
| ↑ ↓ / W S | climb | E | vent |
| I | inspect a device (free) | L | light switch |
| Q | EMP: sensors off for 4 turns | Z / R | rewind (practice) / retry |

Touch: tap any cell to walk there, or use the on-screen buttons. Hovering with a mouse previews the route. SOUND and MOTION sit in the settings menu (top right); `?` opens How to play.

## Run it yourself

```sh
node --version          # 22.16+
node build.mjs          # builds index.html from src/
npm start               # shared Last Heist server on http://127.0.0.1:4173
```

`node sdk/src/friend-landing.mjs` regenerates `friend-edition/index.html`, the landing page in front of the static FriendSDK build in `friend-edition/app/`.

Open `index.html` directly to play solo without a server. The GitHub Pages mirror is static, so shared Last Heist rounds live on the main link, which runs `server/app.mjs` behind nginx (`HOST=127.0.0.1`, `PUBLIC_ORIGIN=https://…`, `DATA_DIR` for the SQLite file). `render.yaml` is included for a one-click Render deploy.

## Checks

| Command | What it proves |
|---|---|
| `npm test` | All 23 levels are valid engine maps, follow the cutaway rules and have a clean route without EMP. Also covers LIVE BURN encoding and receipt-forgery checks, plus a shared-mode HTTP test against the real Node/SQLite server |
| `node --test tests/solver.test.cjs tests/solutions.test.cjs` | The in-game solver matches the reference solver on every level and proves an unbeatable vault unbeatable; every stored solution still wins with the current engine |
| `node tests/editor-browser.mjs` | The Last Heist obstacle editor against the real server: drag and tap placement, a sealing wall is proven unbeatable and cannot be proved, a harmless one is, then proved and published |
| `node --test tests/stakes.test.mjs` | DEMO stake rounds on the real store and API: a 50 stake from the 200 daily wallet, one stake per session per round, 70/30 settlement, refunds for uncontested, empty and never-started rounds, idempotent settlement, no negative balances, the next-day refill, 20 parallel HTTP stakes and four worker threads racing one SQLite file, and an upgrade from the previous release's database |
| `node tests/stakes-browser.mjs` | The stake flow in the real UI against the real server: pot, 70/30 bar, Friends as entrants, the stake sheet, a staked raid, the settlement card and wallet, a refund round, the RF ECONOMY stake headline, pipe, ledger line and calculator term, and a phone layout |
| `node tests/campaign-browser.mjs` | Every campaign job is won through the real UI with the keyboard |
| `node tests/travel-browser.mjs` | Click-to-travel walks real turns and stops before any step that would be seen |
| `node tests/wallet-browser.mjs` | The whole wallet flow against a mock EIP-6963 wallet that answers like the Generations, registry and RF contracts, including LIVE BURN: confirm, burn, receipt check, unlock, the burn ledger with explorer links, rejection and not enough RF |
| `node tests/burn-pending-browser.mjs`, `burn-inflight-browser.mjs`, `burn-unknown-browser.mjs`, `burn-classify-browser.mjs`, `burn-nonce-browser.mjs`, `burn-samehead-browser.mjs`, `burn-tabs-browser.mjs`, `burn-persist-browser.mjs`, `burn-restore-tribute-browser.mjs` | One burn at a time: no second transaction while a burn is pending or its outcome is unknown (wallet timeout, reload, another tab); restore only from a later block with the attempt nonce; unlocks survive restore; retired items are not for sale |
| `node tests/burn-ledger-browser.mjs` | The simplified economy against the real server and a mock chain: four shop items only, the burn ledger (old Tribute/Bounty burns still named, newest first, explorer links, total), no ranks or bounty anywhere, Last Heist opening on the stake round, the one-burn-at-a-time lock including a legacy Bounty lock, and the RF ECONOMY page (stake headline, roadmap, flow, counters, calculator) on desktop and phone |
| `cd sdk && npx friendsdk check games/rare-heist && npx friendsdk test games/rare-heist` | The FriendSDK Friend Edition is valid and passes the SDK's own browser fixture at 960 and 360 px |

The trailer is made by the game itself: `trailer/` renders every scene with the real engine and renderer, and the score in `trailer/music.py` is synthesised from scratch.

## Honest limits

- LIVE BURN is tested against a mock wallet and reviewed independently; Friend discovery was checked read-only against a real holder wallet on mainnet. Safari and physical phones were not tested by hand. LIVE BURN stays marked BETA.
- The server labels attempts with a Friend ID but does not verify ownership, and guest sessions are not unique people. No real-value prize should depend on the guest version.
- Stake rounds are DEMO only: nothing real is staked, paid or burned. The real-RF escrow is a specification, not a contract; it needs an audit and legal review first.
- Difficulty is tuned with a solver. It has not been playtested with players.

## Credits

- Rare Friends character artwork: canonical Generations frames from **FriendSDK v0.1.2** (commit `762d6f5`), used under its [NOTICE](licenses/NOTICE.md).
- Code, levels, scenery, trailer and music: original to this project. Code is under the [MIT license](LICENSE).
- Independent Vibeathon entry. Not an official Rare Friends release.
