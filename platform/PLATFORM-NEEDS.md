# Required platform/founder work

References pin [FriendSDK 885772d](https://github.com/spokesz/friendsdk/tree/885772d).
This edition makes no RF writes and never fabricates an item entitlement or paid round.

1. **Official trusted-host Draw/Round bridge + GameItems reads.** SDK
   [frame-bridge.ts](https://github.com/spokesz/friendsdk/blob/885772d/src/frame-bridge.ts#L6)
   permits only read/canBuy/buy/play/settle/redeem/rpc; live actions target the legacy
   [ChanceGame transport](https://github.com/spokesz/friendsdk/blob/885772d/src/live-game.ts).
   `rpc` has no wallet authorization and server handlers are synchronous: it cannot
   safely send a Draw commit or a Round entry. SDK
   [deployment reader](https://github.com/spokesz/friendsdk/blob/885772d/scripts/dev-game.mjs#L50)
   also demands a legacy `game` address, entropy and provider. Do not put the platform
   addresses into that schema. Need commit(actionId, quantity=1), enter(roundId), credit
   deposit/withdraw, and verified inventory on the selected canonical Friend wallet.
   Unlock class IDs 1–4 only after GameItems.balanceOf(wallet,classId)>0; server.ts
   currently grants no paid items. Black Archive's 3 plans are bundled but gated.
2. **Shop registration + Split decision.** Four classes, value/reserve=0; four
   Currency actions with one 10,000-bps row, one draw, maxUnits=1, prices 250/250/500/2500 RF
   in deployment.json. Repeat the approved shop Split for generations 1–6.
   [DrawModule.commit](https://github.com/spokesz/friendsdk/blob/885772d/platform-contracts/src/DrawModule.sol#L279)
   settles one-row tables inline, with no Dice. Founder fills registry/treasury/modules,
   RF/Generations/items addresses, game IDs, block, developer/funder/operator/settler.
   Treasury is the spender; execute approval and commit from the canonical wallet,
   not an unverified owner balance. No shop Split was invented.
3. **Daily shared state and settler.** SDK
   [server API](https://github.com/spokesz/friendsdk/blob/885772d/src/server/module.ts)
   storage is private per game/Friend; no global board, scheduler or asynchronous chain
   receipt validation. Need platform-owned day/round mapping, entry receipt checks,
   server-time attempt tickets (spent on failure/abandon), replay/leaderboard/tie order,
   UTC closure, secret custody, Dice budget and open/close/settle operator. We include
   pure replay rules and 30 Daily plans, **not a competitive server or payment proof**.
   Daily level data is in the public bundle; strict secrecy until entry would require
   protected level delivery. Archived practice is available; today's paid plan is gated.
4. **Daily entry is a bundle: 150 RF = 3 attempts, all in the pot.** No paid extra attempts (owner decision 07.10.2026):
   [RoundModule.spend](https://github.com/spokesz/friendsdk/blob/885772d/platform-contracts/src/RoundModule.sol#L202)
   sends 100% to burn/rewards, so a pot-funded rebuy is not possible today. The 3-attempt cap is enforced by
   the settler/server. A pot top-up action would allow rebuys later.
5. **Round constraints and refunds.** Entries 100 RF Daily/Street, 1000 RF Vault and
   pot/burn/rewards 8000/1000/1000 are supported. Round Terms have no developer fee.
   [RoundModule](https://github.com/spokesz/friendsdk/blob/885772d/platform-contracts/src/RoundModule.sol#L27)
   `closeRound` refunds fewer than minEntries immediately (so no-opponent refund before
   24h **is possible through the settler**). Anyone can `abandonRound` only after 24h
   from opening. With >=2 entries, closing always requests Dice even though stealth
   scoring is deterministic; settlement requires delivered randomness and the committed
   secret. There is no immediate refund-all-if-nobody-cleared path after normal closure;
   delayed abandonment refunds entries. Credit spends are already burned/rewarded and
   cannot be refunded. Need compatible refund path or an explicitly accepted deviation.
   See [SPEC Round](https://github.com/spokesz/friendsdk/blob/885772d/platform-contracts/docs/SPEC.md#L630),
   [BRIEF](https://github.com/spokesz/friendsdk/blob/885772d/platform-contracts/docs/BRIEF.md).
6. **Last Heist shared mutation game.** Its autonomous server is excluded by scope.
   A platform service must own shared building revision, fortification proof, deadlines,
   leader and settlement list; private Friend storage cannot express those invariants.
   Current Last Heist is labelled fixed-plan free practice only.
7. **Durability.** SDK local backend is explicitly in-memory:
   [local.ts](https://github.com/spokesz/friendsdk/blob/885772d/src/server/local.ts#L5).
   Founder provides Nakama host/TLS/public server key and installs generated server.js.
   Progress RPCs replay official action logs, update versioned Friend storage, and never
   trust submitted scores/items. No localStorage save fallback. Full host reload
   persistence and actual wallet confirmation require that backend and the new bridge.

Until items 1–7 are resolved, this is a playable platform scaffold, **not a publish-ready RF game**.
