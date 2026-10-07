# Daily Heist — rules and API contract (v3)

Owner decision 07.10.2026. Source of truth for the server (Sol) and the UI (Opus).

## Rules
- One level per UTC day for everyone, from `src/daily-levels.js` (`daily-01`…`daily-30`, then repeat from 01 with day index `(days since 2026-10-08) mod 30`). The level is revealed only to players who entered today's round.
- Entry: **150 RF = 3 attempts**, all 150 go into the day's pot. No extra attempts can be bought. A fourth submission is refused without a charge.
- An attempt = one full run. Submit the action log; the server replays it with `src/engine.js`. Only clean wins count (status `won`, 0 detections, no EMP used is NOT required — EMP allowed as in the engine). Score = turns, lower is better; ties → shorter attempt time (server time from `start` to accepted `submit`); then earlier accepted submission. Owner decision 07.10.2026: the turn race is open to solver tools, time breaks ties.
- A player's best attempt counts. An attempt that fails or is abandoned is spent.
- Close at 00:00 UTC. Settlement once, idempotent: **80% to the winner, 10% burned, 10% to Friend rewards**. If fewer than 2 players entered, everyone is refunded in full. If players entered but nobody cleared, refund in full too. Existing entries keep their previously paid amounts and remaining attempt capacity, including any old extra attempts.
- One entry per Friend per day (standalone: per session + Friend id; platform: per Friend NFT).
- Practice: free on any past daily level (archive), never on today's.
- Solution reveal: a player who has spent all 3 attempts without a clean run immediately sees `solvable:{turns}` (the stored route's turns) and that the solution unlocks at close. After 00:00 UTC the stored solution of every closed day is public (`GET /api/daily/solution/:day`) and the history offers WATCH SOLUTION next to the winner's replay.
- Standalone site: everything in **DEMO RF** (server wallet, the existing 200/day guest allowance in `server/stakes.mjs`). Platform build: real RF through the platform RoundModule (separate work).

## HTTP API (standalone server, same session/CSRF as Last Heist)
- `GET /api/daily` → `{ day:'2026-10-08', closesAt, levelId|null (null until entered), pot, entries, myEntry:{attemptsLeft, best:{turns,at}|null}|null, leaders:[{name, heroId, turns, ms, at}] (top 10), serverNow, myEntry.solvable:{turns}|null (only after all attempts failed), prices:{entry:150, attempts:3}, split:{winner:80, burn:10, rewards:10}, balance }`
- `POST /api/daily/enter {heroId}` → charges 150, returns the same shape with `levelId` and the level JSON; three attempts are available.
- `POST /api/daily/attempt` → compatibility endpoint, always `{error:'MAX_EXTRA', message}`; no charge and no additional attempt.
- `POST /api/daily/start` → starts the clock for the next attempt (idempotent while an attempt is open); returns shape with `attempt:{startedAt}`.
- `POST /api/daily/submit {actions:[...]}` → replays, consumes one attempt, returns `{accepted, turns, ms, rank, ...shape}`; `ms` = server time since `start` (submit without `start` uses the entry/previous-submit time).
- `GET /api/daily/solution/:day` → `{day, levelId, level, actions, turns}` only for closed days; `CLOSED`-style error `NOT_CLOSED` otherwise.
- `GET /api/daily/history?limit=7` → past days: `{day, levelId, pot, winner:{name,heroId,turns,ms}|null, burned, refunded, level, solutionTurns}`.
- `GET /api/daily/replay/:day/:rank` → winner's (or top-N) action log for a closed day.
- Errors: `{error:'CODE', message}` with codes `INSUFFICIENT`, `NO_ATTEMPTS`, `MAX_EXTRA`, `ALREADY_ENTERED`, `CLOSED`, `NOT_ENTERED`, `REPLAY_INVALID`, `NOT_CLOSED`.

## Shop prices (real RF on the standalone LIVE BURN; same numbers in DEMO)
| Item | RF |
|---|---|
| Hatchwork theme | 250 |
| Signal Paper theme | 250 |
| Golden Trail | 500 |
| The Black Archive (3 heists) | 2,500 |

Last Heist stake rounds: stake **100 RF** (Street) and **1,000 RF** (Vault) tiers; winner 80%, 10% burned, 10% rewards (replaces 70/30).

Historical LIVE BURN purchases keep the price applicable at their block. New prices start at Robinhood Chain block **82106237**. Earlier prices: Hatchwork and Signal Paper 10, Golden Trail 25, The Black Archive 50. New sends always use the current prices above.
