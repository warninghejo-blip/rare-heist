# LIVE BURN: checking it with a real wallet

LIVE BURN is tested against a mock wallet (`tests/wallet-browser.mjs`). Use this checklist for the first burn with real RF on Robinhood Chain. Start with the cheapest item.

## You need

- A browser wallet with Robinhood Chain (chain ID 4663). The game offers to add the network if the wallet does not know it.
- A little ETH on Robinhood Chain for gas.
- At least 10 RF (`0x0779369854d3EcdEA927206718FFD7730C67B71f`). The cheapest shop items, Hatchwork and Signal Paper, cost 10 RF.
- A Rare Friend is optional. Without one, the burn is recorded with no Friend.

## Steps

1. Open the game: GitHub Pages, or `npm start` and `http://127.0.0.1:4173`.
2. **STUDIO / DEMO** → **LIVE BURN / BETA**.
3. **CONNECT WALLET.**
   - **YOUR RF** should match the RF balance your wallet shows.
   - **RF AT 0x…dEaD** shows the burn address's balance.
4. On **SIGNAL PAPER**, press **BURN 10 RF**.
5. Read the confirmation, tick the box and press **BURN 10 RF**.
6. In the wallet, check the request before approving:

   | Field | Expected |
   |---|---|
   | To | the RF token `0x0779…B71f`. It must not be an unknown contract. |
   | Value | 0 ETH |
   | Data | starts with `0xa9059cbb` then `…000000000000000000000000000000000000dead`. Most wallets show this as "Transfer 10 RF to 0x…dEaD". |

7. Wait for **Pending transaction … Waiting for Robinhood Chain**, then the toast **Burned 10.00 RF on chain. SIGNAL PAPER unlocked.**

## Pending transactions

Before opening the wallet request, Rare Heist takes a browser Web Lock shared by tabs of the same origin. Under that lock it checks local storage again, generates a random nonzero 16-bit attempt nonce, and saves an `awaiting-wallet` pending state. The lock is stored in the dedicated `rh-live-pending-v1` localStorage key; ordinary game saves in `rh-cutaway-v1` never write or remove it. Older locks in `rh-cutaway-v1.live.pending` move to the dedicated key when the game loads. It holds the Web Lock until the wallet returns a hash or an error is handled. If another tab is sending, the confirmation says “Another tab is sending a burn. Finish or reject it there first.” If Web Locks are unavailable, LIVE BURN refuses to send and asks for a current browser. The nonce occupies the two formerly zero bytes after the item code in the 32-byte calldata tag. Once the wallet returns a transaction hash, it stores that hash, sender and item. If a burn is not confirmed within 180 seconds, the page shows the full hash and **CHECK AGAIN**. Reloading with a hash checks that same receipt before another burn can be sent. Do not confirm another burn while one is pending.

If the wallet request times out or has a network error after `eth_sendTransaction` starts, Rare Heist cannot know whether the wallet sent it. The lock stays in place and a single **UNKNOWN OUTCOME** panel appears on every screen and in every tab. Reloading while the request has no hash shows the same panel. A second tab shows **Waiting for your wallet in another tab** while the first still holds the Web Lock. If the first tab closes without a hash, the second tab shows **UNKNOWN OUTCOME**. Its exact message is: “We don't know if your wallet sent the burn. Check your wallet's activity before trying again.”

- **RESTORE FROM CHAIN** searches the pending player's tagged transfer logs. Before asking the wallet to send, the game saves the current block number. Only an uncached burn in a *later* block with the same item, sufficient amount, Friend and attempt nonce in its transaction input can clear this attempt's lock. Older pending records without a nonce or saved block number cannot be cleared by RESTORE; check the wallet and use RELEASE LOCK if appropriate. If no matching burn is found yet, the lock stays and you can check again. Legacy tags with zero in the nonce bytes still appear in history and the burn ledger.
- **RELEASE LOCK** opens a separate confirmation. Check your wallet activity first, then tick “I checked my wallet: the burn was not sent or was rejected. If it was sent, retrying burns RF again.” and confirm. Both RELEASE LOCK and RESTORE FROM CHAIN require the burn Web Lock to be free; they cannot clear a request that another tab still owns. Releasing is an explicit choice; if the original burn was sent, confirming another still burns more RF.
- An explicit wallet rejection (`4001` or `ACTION_REJECTED`) and errors before the burn request is sent clear the lock. Other errors after the wallet request starts keep UNKNOWN OUTCOME, even if their message contains “rejected” or “denied”. A receipt resolves a transaction by its hash: success unlocks the item and a failed receipt clears the lock.

- A successful receipt that proves the RF transfer unlocks the item.
- A failed receipt clears the pending state and reports that no RF was burned.
- If you replaced or cancelled the transaction in your wallet, use **I replaced/cancelled it in my wallet — forget this tx** and confirm. The warning explains that RF will still burn if the original transaction later succeeds.
- Tribute (code 9) and Vault Bounty (code 10) are retired: they cannot be bought, but old burns and old locks with them still decode, show in the ledger and go through the same lock and RESTORE rules. RESTORE keeps paid shop purchases even when a wallet has more than 200 such any-amount receipts; the local cache keeps at most 200 of them.

## What to verify

| Where | Expected |
|---|---|
| **YOU BURNED HERE** | 10.00 RF |
| **YOUR RF** | 10 RF lower |
| **RF AT 0x…dEaD** | 10 RF higher |
| **BURN LEDGER** | SIGNAL PAPER, 10.00 RF, your Friend (or your short address), and a TX link that opens the transaction on `robinhoodchain.blockscout.com` |
| Block explorer, transaction page | one RF `Transfer` from you to `0x000000000000000000000000000000000000dEaD` |
| Block explorer, input data | ends with 32 bytes starting `52485354 01 03`: `RHST`, version 1, item 3 (Signal Paper), then a two-byte attempt nonce |

Reload the page, return to LIVE BURN and press **RESTORE FROM CHAIN**. The burn should come back from the chain alone.

## If something goes wrong

| Symptom | Meaning |
|---|---|
| "Cancelled in the wallet. Nothing was burned." | You rejected the request. |
| "Not enough RF in this wallet" | Checked before the wallet is asked. Nothing was sent. |
| Pending transaction hash and **CHECK AGAIN** | The transaction is still pending. Check the receipt for that hash; do not send another burn. |
| "Robinhood Chain is not reachable" | The public RPC did not answer. Retry. |
| RESTORE finds nothing, but the explorer shows the burn | The wallet's RPC limits `eth_getLogs` from block 0. The unlock is still saved from the receipt on the device that burned. |

## Safety notes

- Burned RF cannot be recovered by anyone, including the developer.
- The game never asks for `approve`, `permit`, `eth_sign`, `personal_sign` or typed-data signatures. If a wallet shows any of these while you use Rare Heist, reject it.
- Unlocks are cosmetic and stored per device. Nothing in Last Heist, PAR or scores depends on them.
