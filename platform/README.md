# Rare Heist / FriendSDK v0.2.3

**Handoff is blocked on the official Draw/Round browser bridge.** Free lessons/campaign,
Daily archive and fixed Last Heist practice run now. Paid buttons refuse payment.

Publish from this directory (Node 22+):
1. `npm install` (SDK pinned to `spokesz/friendsdk@885772d`), then `npm run build`.
   Offline alternative: `npm install --no-save <friendsdk-0.2.3.tgz>` after `npm pack` in that SDK checkout.
2. Fill `deployment.json`: platform addresses, new game IDs/collection, recipients,
   six generation splits (same agreed Split repeated), round limits and Nakama
   `backend: {"host":"HOST","port":7350,"useSSL":true,"serverKey":"PUBLIC_SERVER_KEY"}`.
3. Founder registers/seals/activates the shop Draw and three Round instances from
   those terms; supplies module bridge and settler. No mainnet action is performed here.
4. Install generated `.friendsdk/server.js` on Nakama with the SDK ownership-auth hook,
   `CHAIN_RPC_URL`, session expiry and Generations configuration. Rebuild after filling backend.
5. Serve `.friendsdk/` with SDK CSP/iframe sandbox on rarefriends.com/play; the site
   may reuse `host.tsx` with its verified selection. Check real ownership/login and
   reload persistence. Astra reviews RF actions after addresses/bridge are supplied.

`npm run dev` serves the same `ConnectedGameHost chrome="none"` on 127.0.0.1:4173 (rebuild/restart after edits).
`npx friendsdk dev .` also works with the SDK's stock GameHost. No deployment argument:
SDK `--deployment` targets legacy ChanceGame, not platform Draw/Round.
Local preview records survive child reload, **not a whole host reload**; durable state
requires Nakama. LIVE BURN and the standalone Last Heist server are excluded.
Exact remaining requirements: [PLATFORM-NEEDS.md](PLATFORM-NEEDS.md).
