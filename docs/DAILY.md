# Daily Heist — rules and API contract (v2)

Owner decision 07.10.2026. Source of truth for the server (Sol) and the UI (Opus).

## Rules
- One level per UTC day for everyone, from `src/daily-levels.js` (`daily-01`…`daily-30`, then repeat from 01 with day index `(days since 2026-10-08) mod 30`). The level is revealed only to players who entered today's round.
- Entry: **150 RF = 3 attempts**, all 150 go into the day's pot. No extra attempts can be bought. A fourth submission is refused without a charge.
- An attempt = one full run. Submit the action log; the server replays it with `src/engine.js`. Only clean wins count (status `won`, 0 detections, no EMP used is NOT required — EMP allowed as in the engine). Score = turns; lower is better; ties → earlier accepted submission.
- A player's best attempt counts. An attempt that fails or is abandoned is spent.
- Close at 00:00 UTC. Settlement once, idempotent: **80% to the winner, 10% burned, 10% to Friend rewards**. If fewer than 2 players entered, everyone is refunded in full. If players entered but nobody cleared, refund in full too. Existing entries keep their previously paid amounts and remaining attempt capacity, including any old extra attempts.
- One entry per Friend per day (standalone: per session + Friend id; platform: per Friend NFT).
- Practice: free on any past daily level (archive), never on today's.
- Standalone site: everything in **DEMO RF** (server wallet, the existing 200/day guest allowance in `server/stakes.mjs`). Platform build: real RF through the platform RoundModule (separate work).

## HTTP API (standalone server, same session/CSRF as Last Heist)
- `GET /api/daily` → `{ day:'2026-10-08', closesAt, levelId|null (null until entered), pot, entries, myEntry:{attemptsLeft, best:{turns,at}|null}|null, leaders:[{name, heroId, turns, at}] (top 10), prices:{entry:150, attempts:3}, split:{winner:80, burn:10, rewards:10}, balance }`
- `POST /api/daily/enter {heroId}` → charges 150, returns the same shape with `levelId` and the level JSON; three attempts are available.
- `POST /api/daily/attempt` → compatibility endpoint, always `{error:'MAX_EXTRA', message}`; no charge and no additional attempt.
- `POST /api/daily/submit {actions:[...]}` → replays, consumes one attempt, returns `{accepted, turns, rank, ...shape}`.
- `GET /api/daily/history?limit=7` → past days: `{day, levelId, pot, winner:{name,heroId,turns}|null, burned, refunded}`.
- `GET /api/daily/replay/:day/:rank` → winner's (or top-N) action log for a closed day.
- Errors: `{error:'CODE', message}` with codes `INSUFFICIENT`, `NO_ATTEMPTS`, `MAX_EXTRA`, `ALREADY_ENTERED`, `CLOSED`, `NOT_ENTERED`, `REPLAY_INVALID`.

## Shop prices (real RF on the standalone LIVE BURN; same numbers in DEMO)
| Item | RF |
|---|---|
| Hatchwork theme | 250 |
| Signal Paper theme | 250 |
| Golden Trail | 500 |
| The Black Archive (3 heists) | 2,500 |

Last Heist stake rounds: stake **100 RF** (Street) and **1,000 RF** (Vault) tiers; winner 80%, 10% burned, 10% rewards (replaces 70/30).

Historical LIVE BURN purchases keep the price applicable at their block. New prices start at Robinhood Chain block **82106237**. Earlier prices: Hatchwork and Signal Paper 10, Golden Trail 25, The Black Archive 50. New sends always use the current prices above.
