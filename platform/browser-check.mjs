// One browser acceptance of the supported scaffold; fixtures never sign or spend.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installFixture, createArtworkFixture } from '@rarefriends/friendsdk/testing';
import { createGameServer } from '@rarefriends/friendsdk/serve';
import { buildPlatform } from './run.mjs';
const directory = path.dirname(fileURLToPath(import.meta.url));
const temporary = process.env.RARE_HEIST_TEST_DIR;
if (!temporary || !path.isAbsolute(temporary)) throw Error('Set RARE_HEIST_TEST_DIR to an absolute temporary directory.');
await mkdir(temporary, { recursive: true });
let server, browser;
try {
  const result = await buildPlatform(path.join(temporary, 'browser-build'));
  server = createGameServer(result.outdir);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1250, height: 900 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(15000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const fixture = await installFixture(page, origin, { artworkCall: await createArtworkFixture() });
  // Local preview's server uses Date.now; inspect a day with an actual past archive.
  await page.addInitScript(() => { Date.now = () => Date.parse('2026-11-08T12:00:00Z'); });
  await page.goto(origin);
  await page.getByRole('button', { name: /^Connect / }).first().click();
  await page.getByRole('button', { name: 'Friend #7730', exact: true }).click();
  const game = page.frameLocator('iframe');
  await game.locator('[data-rh-lesson="cut-00"]').waitFor();
  assert.equal(await page.locator('iframe').getAttribute('sandbox'), 'allow-scripts');
  assert(fixture.ownerReads >= 2, 'SDK rechecks actual fixture Friend ownership');
  await game.locator('[data-rh-lesson="cut-00"]').click();
  const child = page.frames().find(frame => frame.parentFrame());
  const actions = await child.evaluate(() => globalThis.HEIST_SOLUTIONS['cut-00'].actions);
  for (const action of actions) {
    await game.locator('[data-action="' + action + '"]').click();
    await page.waitForTimeout(110);
  }
  await game.getByText('LESSON CLEARED', { exact: true }).waitFor();
  // Allow the real bridge/server RPC to finish; don't assert the UI's optimistic marks.
  await page.waitForTimeout(300);
  await child.evaluate(() => location.reload());
  await game.locator('[data-rh-lesson="cut-00"].rh-done').waitFor();
  await game.getByRole('button', { name: 'Hatchwork / 250 RF', exact: true }).click();
  await game.getByRole('alert').getByText(/DrawModule actions and GameItems reads/).waitFor();
  await game.getByRole('button', { name: 'CLOSE', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Confirm preview', exact: true }).count(), 0, 'Missing module bridge never pretends to buy a legacy ticket');
  await game.getByRole('button', { name: 'LAST HEIST / FREE FIXED-PLAN PRACTICE', exact: true }).click();
  await child.waitForFunction(() => window.RareHeistView().level === 'last-cutaway');
  await game.locator('#home').click();
  await game.getByText('DAILY ARCHIVE / FREE PRACTICE', { exact: true }).click();
  await game.getByRole('button', { name: /^PRACTICE \/ / }).first().click();
  await child.waitForFunction(() => window.RareHeistView().level.startsWith('daily-') && window.RareHeistView().practice === true);
  await page.screenshot({ path: path.join(temporary, 'browser.png') });
  await game.locator('#home').click();
  await game.locator('#catalogPage').evaluate(node => { node.scrollTop = 0; });
  await page.screenshot({ path: path.join(temporary, 'lobby.png') });
  assert.deepEqual([...errors, ...fixture.errors], []);
  assert((await page.evaluate(() => window.__friendWalletTest.state.requests)).every(method => ['eth_accounts', 'eth_requestAccounts', 'eth_chainId', 'wallet_switchEthereumChain'].includes(method)), 'No signing or transaction request');
  console.log('PASS: ConnectedGameHost chrome=none, ownership fixture, lesson clear, child reload server progress, Last/Daily practice, unsupported shop refused; no RF transactions.');
  console.log('NOT ACCEPTED: full-host reload durability without Nakama; Draw/Round purchases and competitive settlement without official bridge/settler.');
} finally {
  await browser?.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
