# Rare Heist / FriendSDK 1.0

Source package for `rare-heist` version `1.0.0`, using the official
[`rarefriends/friendsdk`](https://github.com/rarefriends/friendsdk) main branch
(lockfile: `c19058711f3c207c67cd30b8136de89978f08ddd`). Node 22+.

From this directory:

```sh
npm ci
npm run check
npm run build
npm run dev
```

`generate.mjs` derives the presentation and pure synchronous game rules from
`../src/`, `../sdk/src/` and `../sdk/games/rare-heist/sdk.css`. It never edits those
files. Generated JS/CSS is committed, so the release can also be built directly
with `npx friendsdk check` and `npx friendsdk build`. No legacy SDK is required at
runtime. `identity.js`, `burn.js` and the standalone server are not bundled.

The host supplies the selected Friend and all 64 original artwork frames. The
adapter only adds the `0x` notation expected by the existing renderer; it changes
no frame bits. Host pause gates input and replays. No wallet or contract client
runs in the game document.

Five lessons, fourteen jobs, INSPECT, practice UNDO and stored solutions are free.
The server replays official routes before writing Friend-scoped progress,
mastery and best scores. Settings are server-stored; themes and the three Black
Archive jobs require SDK item holdings. Browser saves never grant entitlements.

## Paid actions

`buyHatchwork` (250 RF), `buySignalPaper` (250 RF), `buyGoldenTrail` (500 RF) and
`buyBlackArchive` (2,500 RF) are standard `purchase` actions, minting their
respective nontransferable SDK items. `enterDaily` is an `external` action on the
separate `daily` lane, displayed at 150 RF. Every payment uses `game.transact()`
and the host's confirmation. Pending payments are resumed through transaction
events and `game.transactions()`, then acknowledged. Nothing is charged when the
platform reports an action as disabled or not registered.

Daily follows `../docs/DAILY.md` v3: 30 rotating server-only plans; one entry per
Friend per UTC day; three attempts, no top-ups; ghost-mode server replay with EMP
allowed; fewest turns, then elapsed server time, then earlier accepted run.
Starting an attempt spends it; Retry submits/abandons it before starting another.
An open attempt can be resumed after a reload with its original server start
time. Current plans are returned only to entrants. Past plans and stored routes
are public after close. All three failed attempts reveal the route's turn count.

### Platform registration needed for Daily

The SDK has no built-in pooled RoundModule. The platform must provide the
`daily` lane's contract, website relay and keeper watcher. `dev-round.ts` is only
the SDK development simulator, excluded from the release client/server. Its
adapter name is `rare-heist-round-v1`; it is not a production contract or relay.

The production adapter must escrow 150 RF per entry, enforce one entry per Friend
per UTC day on chain, reject stale-day intents at execution, and report verified
transaction data `{ day: "YYYY-MM-DD", enteredAt: <chain entry time in ms>, phase }`.
It reports `pending` on entry and again after UTC close, then awaits `ctx.resolve`.
The server decides `{ day, pays, burn, rewards, refunded }` in decimal RF units.
The contract/watcher must enforce conservation and idempotent settlement: for
two or more entrants with a clean winner, pay 80% of the pooled pot to that
Friend, burn 10%, send 10% to Friend rewards; otherwise refund every entry in
full. A settlement event supplies its paid amount and final status. The watcher
must trigger all pending entries after midnight even if nobody reopens the game.
An entry relayed only after its day is closed is refunded, never inserted into
an already finalized ranking. Resolving a returning Friend's old entry also works
from `load` or the archive. Platform review/registration is required before this
lane can become available; the client has no fallback that accepts off-platform RF.

The local simulator verifies the same call/transaction flow and simulates
escrow/payouts; it records burn/reward allocations rather than burning a real
token supply or transferring real rewards. Like all SDK external dev stubs, its
in-memory contract resets when that stub/dev process restarts. It is not a claim
of mainnet acceptance.

## Last Heist

A free shared challenge in `ctx.shared`, with CAS-protected revisions. Clear the
current vault cleanly to hold it. The holder may add one wall on an empty floor
cell away from ladders; it must break the previous winning route. The new vault
becomes shared only after the holder proves another clean route. Concurrent or
stale submissions are refused. There are no paid stakes, timed stake rounds,
cash payouts or autonomous resets in this edition. A wall proposal that cannot
be cleared stays private and leaves the shared vault unchanged.

## Submission

```sh
npx friendsdk site --out <games-fork> .friendsdk/build
# In the games fork:
node scripts/check.mjs --base origin/main
```

The listing points to `https://github.com/warninghejo-blip/rare-heist`. The owner
publishes these source files there before platform review. Platform maintainers
deploy the server rules and register the five paid actions after review.

For the Windows task workspace, `.friendsdk` is an ignored junction into
`D:/Rare-Heist-Vibeathon/_tmp/sdk1/sdk-state`, keeping builds, emulated storage,
logs and screenshots in the authorized temporary directory. This junction is
local only and is not committed.
