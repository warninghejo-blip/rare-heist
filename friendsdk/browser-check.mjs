// One real UI acceptance against `friendsdk dev`, no mocked host/server.
// RARE_HEIST_TEST_DIR must point to an authorized temporary artifact directory.
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const out=process.env.RARE_HEIST_TEST_DIR;
if(!out||!path.isAbsolute(out))throw Error('Set RARE_HEIST_TEST_DIR to an absolute temporary directory.');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await page.goto(process.env.RARE_HEIST_DEV_URL??'http://127.0.0.1:4173');
 await page.getByText(/^simulated$/i).waitFor();
 const game=page.frameLocator('iframe');await game.locator('[data-rh-lesson="cut-00"]').waitFor();
 assert.equal(await game.locator('[data-rh-lesson]').count(),5);
 assert.equal(await game.locator('[data-rh-job]').count(),14);
 await game.locator('[data-rh-lesson="cut-00"]').click();
 const frame=page.frames().find(f=>f.parentFrame());
 await game.locator('#inspect').click();assert.equal(await frame.evaluate(()=>RareHeistView().inspect),true);await game.locator('#inspect').click();
 await game.locator('[data-action="E"]').click();await game.locator('#undo').click();assert.equal((await frame.evaluate(()=>RareHeistView().actions)).length,0);await game.locator('#retry').click();
 const actions=await frame.evaluate(()=>HEIST_SOLUTIONS['cut-00'].actions);
 // Retry preserves the input debounce from the preceding INSPECT/UNDO probe.
 await page.waitForTimeout(115);
 for(const action of actions){await game.locator('[data-action="'+action+'"]').click();await page.waitForTimeout(115);}
 assert.deepEqual(await frame.evaluate(()=>RareHeistView().actions),actions);
 await game.getByText('LESSON CLEARED',{exact:true}).waitFor();
 await game.getByRole('status').filter({hasText:'Progress saved by the game server.'}).waitFor();
 await page.screenshot({path:path.join(out,'lesson-cleared.png')});
 await page.reload();await game.locator('[data-rh-lesson="cut-00"].rh-done').waitFor();
 await page.screenshot({path:path.join(out,'progress-after-host-reload.png')});
 await game.getByRole('button',{name:'WATCH SOLUTION',exact:true}).click();await game.locator('#replayBar:not([hidden])').waitFor();
 assert.deepEqual(errors,[]);
 const message='PASS: SDK dev host; original Friend; 5 lessons / 14 jobs; INSPECT / UNDO; clean lesson; full host reload keeps server progress; WATCH SOLUTION; no page errors.';
 await writeFile(path.join(out,'browser-check.log'),message+'\n');console.log(message);
}finally{await browser.close();}
