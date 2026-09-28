/* Rare Heist: Friend Edition glue for FriendSDK v0.1.2. Inlined into heist.generated.js by
   ../../build-sdk.mjs and executed inside the SDK's sandboxed game frame.
   The SDK runtime owns wallet connection, Friend selection and the fresh ownership check; this
   code receives only the verified Friend's token ID, its public artwork and the pause state.
   No wallet, storage, download, clipboard or server access. Progress lives in memory. */
function createFriendEdition(root, options, markup) {
 const P = globalThis.HeistPixels;
 const escapeText = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
 const compact = () => matchMedia('(max-width:620px), (max-height:420px)').matches;
 let current = options;
 const paused = () => !!current.paused?.();
 let ui = null, ghost = false, portraitTimer = 0, portraitFrame = 0;
 root.innerHTML = markup;
 const app = root.querySelector('#rhSdk');
 const sdk = Object.freeze({
  edition: 'friend',
  friendId: String(options.friendId),
  hero: options.hero,
  mode: options.mode === 'chain' ? 'chain' : 'preview',
  app,
  paused,
  attach(api) { ui = api; },
  home: renderLobby,
  // A remount in the same document keeps this game and adopts the new pause getter.
  update(next) { current = next; },
 });
 globalThis.RareHeistSDK = sdk;

 // While a runtime menu is open the SDK sets `paused`: input stops before the game's own listeners.
 const gate = event => { if (paused()) { event.stopImmediatePropagation(); if (event.cancelable) event.preventDefault(); } };
 for (const type of ['keydown', 'pointerdown', 'click']) window.addEventListener(type, gate, true);
 // Click-to-travel also checks `paused` before every step (src/ui.js travelStep).
 let wasPaused = false;
 (function watch() {
  const now = paused();
  if (now !== wasPaused) { wasPaused = now; app.classList.toggle('rh-paused', now); }
  followFriend();
  requestAnimationFrame(watch);
 })();

 // Phone-sized frames: floors keep room for the whole-pixel Friend, and the board scrolls to it.
 function followFriend() {
  const wrap = document.getElementById('boardWrap'), canvas = document.getElementById('gameCanvas');
  const view = ui?.view();
  if (!wrap || !canvas || !view) return;
  if (view.screen !== 'play' || !view.game || !compact()) { if (canvas.style.height) { canvas.style.height = ''; wrap.scrollTop = 0; } return; }
  const floors = (view.game.level.map.length - 1) / 2, visible = wrap.clientHeight;
  // Mirrors the renderer's small-screen layout: 18px sky, 24px ground, 9px slabs, 24px floors.
  const height = Math.max(visible, 42 + (floors + 1) * 9 + floors * 24);
  if (canvas.style.height !== height + 'px') canvas.style.height = height + 'px';
  const geo = view.geometry, y = view.game.state.y;
  if (!geo?.top || !geo.hh || geo.top[y] == null) return;
  const target = Math.max(0, Math.min(height - visible, Math.round(geo.top[y] + geo.hh[y] / 2 - visible / 2)));
  if (Math.abs(wrap.scrollTop - target) > 1) wrap.scrollTop = target;
 }

 function drawPortrait() {
  const canvas = document.getElementById('rhPortrait');
  if (!canvas) { clearInterval(portraitTimer); portraitTimer = 0; return; }
  // Original 16x16 one-bit frames at an integer scale; the canvas is shown at its bitmap size.
  const k = compact() ? 4 : 7, size = 18 * k;
  if (canvas.width !== size) { canvas.width = size; canvas.height = size; canvas.style.width = size + 'px'; canvas.style.height = size + 'px'; }
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  P.rect(g, 0, 0, size, size, P.PAPER);
  // Idle, then a few steps each way: the Friend's own walking frames, never redrawn.
  const beat = ui?.save.reduced ? 0 : portraitFrame % 48, pose = beat < 16 ? ['down', false] : beat < 24 ? ['left', true] : beat < 32 ? ['right', true] : beat < 40 ? ['down', true] : ['down', false];
  P.sprite(g, options.hero, 9 * k, 16 * k, k, pose[0], pose[1], ui?.save.reduced ? 0 : portraitFrame, true);
 }
 function animatePortrait() {
  clearInterval(portraitTimer);
  portraitTimer = setInterval(() => {
   if (document.body.dataset.screen !== 'catalog') { clearInterval(portraitTimer); portraitTimer = 0; return; }
   if (!ui?.save.reduced && !paused()) { portraitFrame++; drawPortrait(); }
  }, 170);
 }

 function renderLobby() {
  if (!ui) return;
  const page = document.getElementById('catalogPage');
  const { lessons, jobs, save, mastery } = ui;
  const done = id => save.done.includes(id);
  const lessonsDone = lessons.filter(l => done(l.id)).length, jobsDone = jobs.filter(l => done(l.id)).length;
  const next = !lessonsDone ? lessons[0] : jobs.find(l => !done(l.id)) || jobs.find(l => !(mastery(l) & 1)) || jobs[0];
  const nextIsLesson = lessons.includes(next);
  const marks = l => { const bits = mastery(l), intel = /o/.test(l.map.join('')); return '<span class="rh-marks" aria-label="Goals earned">' + [[1, 'C', 'Clean'], [2, 'I', 'All intel'], [4, 'P', 'Par']].filter(([b]) => b !== 2 || intel).map(([b, t, name]) => '<i class="' + (bits & b ? 'on' : '') + '" title="' + name + (bits & b ? ' earned' : '') + '">' + t + '</i>').join('') + '</span>'; };
  const hero = options.hero;
  page.innerHTML =
   '<div class="rh-lobbygrid">'
   + '<aside class="rh-friend"><canvas id="rhPortrait" width="126" height="126" role="img" aria-label="Your Rare Friend #' + escapeText(hero.tokenId) + ', original artwork"></canvas>'
   + '<div class="rh-friendtext"><p class="kicker">PLAYING AS YOUR FRIEND</p><h2>#' + escapeText(hero.tokenId) + '</h2><p class="rh-family">' + escapeText(String(hero.familyName || '').toUpperCase()) + ' / HARDWIRED / VERIFIED BY FRIENDSDK</p>'
   + '<p class="rh-progress">LESSONS ' + lessonsDone + '/' + lessons.length + ' &middot; JOBS ' + jobsDone + '/' + jobs.length + '</p>'
   + '<button id="rhNext" class="primary">' + (nextIsLesson ? 'START LESSON 01' : 'PLAY NEXT: ' + escapeText(next.name)) + ' &gt;</button>'
   + '<p class="note">Solo stealth. Original on-chain artwork, never recoloured. No purchases or rewards: the SDK economy is not used. Progress lasts for this session.</p>'
   + '<button id="rhAbout" class="rh-link">SOURCES + LIMITS</button></div></aside>'
   + '<section class="rh-lists">'
   + '<div class="rh-listhead"><h3>LEARN TO HEIST / ' + lessons.length + ' LESSONS</h3><small>PRACTICE: REWIND FREELY</small></div>'
   + '<div class="rh-lessons">' + lessons.map((l, i) => '<button data-rh-lesson="' + l.id + '" class="' + (done(l.id) ? 'rh-done' : '') + '"><b>0' + (i + 1) + ' / ' + escapeText(l.name) + (done(l.id) ? ' [X]' : '') + '</b><small>' + escapeText(l.desc) + '</small></button>').join('') + '</div>'
   + '<div class="rh-listhead"><h3>SOLO VAULTS / ' + jobs.length + ' JOBS / ALL OPEN</h3><div class="rh-mode" role="group" aria-label="Security mode"><button data-rh-mode="operative" aria-pressed="' + !ghost + '" class="' + (ghost ? '' : 'active') + '">OPERATIVE</button><button data-rh-mode="ghost" aria-pressed="' + ghost + '" class="' + (ghost ? 'active' : '') + '" title="No detection allowed">GHOST</button></div></div>'
   + '<div class="rh-jobs">' + jobs.map((l, i) => '<button data-rh-job="' + l.id + '" class="' + (done(l.id) ? 'rh-done' : '') + '" title="' + escapeText(l.desc) + '"><b>' + String(i + 1).padStart(2, '0') + ' ' + escapeText(l.name) + '</b><small>' + escapeText(l.tag) + ' / ' + ((l.map.length - 1) / 2) + 'F / PAR ' + l.par + (save.best[l.id + ':ghost'] ? ' / GHOST ' + save.best[l.id + ':ghost'] : '') + '</small>' + marks(l) + '</button>').join('') + '</div>'
   + '</section></div>';
  const start = (level, opts) => { if (!paused()) ui.start(level, opts); };
  page.querySelector('#rhNext').onclick = () => start(next, nextIsLesson ? { type: 'training' } : { mode: ghost ? 'ghost' : 'operative' });
  page.querySelector('#rhAbout').onclick = about;
  page.querySelectorAll('[data-rh-lesson]').forEach(b => b.onclick = () => start(lessons.find(l => l.id === b.dataset.rhLesson), { type: 'training' }));
  page.querySelectorAll('[data-rh-job]').forEach(b => b.onclick = () => start(jobs.find(l => l.id === b.dataset.rhJob), { mode: ghost ? 'ghost' : 'operative' }));
  page.querySelectorAll('[data-rh-mode]').forEach(b => b.onclick = () => { ghost = b.dataset.rhMode === 'ghost'; renderLobby(); page.querySelector('[data-rh-mode="' + b.dataset.rhMode + '"]')?.focus({ preventScroll: true }); });
  portraitFrame = 0; drawPortrait(); animatePortrait();
 }

 function about() {
  ui.modal('SOURCES + LIMITS', '<p>Rare Heist: Friend Edition for FriendSDK v0.1.2. The SDK runtime connects the wallet, lists your hardwired Friends and verifies ownership on Robinhood Chain before this game loads.</p>'
   + '<p>Your Friend #' + escapeText(options.hero.tokenId) + ' walks every job in its original 16x16 one-bit frames, read from the Rare Friends artwork registry through the public Robinhood Chain RPC and drawn at whole-pixel scale without recolouring.</p>'
   + '<p>This edition contains the ' + ui.lessons.length + ' lessons and the ' + ui.jobs.length + ' solo jobs. It has no purchases, rewards, prizes or token actions: the SDK chance-game economy is required by the runtime but unused, and its ledger stays simulated. The browser sandbox has no storage, so progress resets when the frame reloads.</p>'
   + '<p>The shared Last Heist, workshop, creator studio and LIVE BURN live only in the standalone Rare Heist build.</p>');
 }

 return sdk;
}
