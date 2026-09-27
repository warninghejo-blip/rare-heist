# LIVE BURN: checking it with a real wallet

LIVE BURN is tested against a mock wallet (`tests/wallet-browser.mjs`). Use this checklist for the first burn with real RF on Robinhood Chain. Start with the smallest amount.

## You need

- A browser wallet with Robinhood Chain (chain ID 4663). The game offers to add the network if the wallet does not know it.
- A little ETH on Robinhood Chain for gas.
- At least 1 RF (`0x0779369854d3EcdEA927206718FFD7730C67B71f`).
- A Rare Friend is optional. Without one, the burn is recorded with no Friend.

## Steps

1. Open the game: GitHub Pages, or `npm start` and `http://127.0.0.1:4173`.
2. **STUDIO / DEMO** → **LIVE BURN / BETA**.
3. **CONNECT WALLET.**
   - **YOUR RF** should match the RF balance your wallet shows.
   - **RF AT 0x…dEaD** shows the burn address's balance.
4. On **TRIBUTE**, enter `1` and press **BURN FOR THE HALL**.
5. Read the confirmation, tick the box and press **BURN 1 RF**.
6. In the wallet, check the request before approving:

   | Field | Expected |
   |---|---|
   | To | the RF token `0x0779…B71f`. It must not be an unknown contract. |
   | Value | 0 ETH |
   | Data | starts with `0xa9059cbb` then `…000000000000000000000000000000000000dead`. Most wallets show this as "Transfer 1 RF to 0x…dEaD". |

7. Wait for **Sent … Waiting for Robinhood Chain…**, then the toast **Burned 1.00 RF on chain**.

## What to verify

| Where | Expected |
|---|---|
| **YOU BURNED VIA RARE HEIST** | 1.00 RF |
| **YOUR RF** | 1 RF lower |
| **RF AT 0x…dEaD** | 1 RF higher |
| **HALL OF ASH** | your Friend, or your short address if you have no Friend |
| Block explorer, transaction page | one RF `Transfer` from you to `0x000000000000000000000000000000000000dEaD` |
| Block explorer, input data | ends with 32 bytes starting `52485354 01 09`: `RHST`, version 1, item 9 (tribute) |

Reload the page, return to LIVE BURN and press **RESTORE FROM CHAIN**. The burn should come back from the chain alone.

## If something goes wrong

| Symptom | Meaning |
|---|---|
| "Cancelled in the wallet. Nothing was burned." | You rejected the request. |
| "Not enough RF in this wallet" | Checked before the wallet is asked. Nothing was sent. |
| "Sent, but not confirmed yet" | The transaction is still pending. Press RESTORE FROM CHAIN later. |
| "Robinhood Chain is not reachable" | The public RPC did not answer. Retry. |
| RESTORE finds nothing, but the explorer shows the burn | The wallet's RPC limits `eth_getLogs` from block 0. The unlock is still saved from the receipt on the device that burned. |

## Safety notes

- Burned RF cannot be recovered by anyone, including the developer.
- The game never asks for `approve`, `permit`, `eth_sign`, `personal_sign` or typed-data signatures. If a wallet shows any of these while you use Rare Heist, reject it.
- Unlocks are cosmetic and stored per device. Nothing in Last Heist, PAR or scores depends on them.
