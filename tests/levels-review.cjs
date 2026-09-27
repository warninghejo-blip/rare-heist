#!/usr/bin/env node
/* Rare Heist cutaway level review.
 *
 *   node tests/levels-review.cjs                       # review src/cutaway-levels.js
 *   node tests/levels-review.cjs --levels other.js     # review another levels file (e.g. a snapshot)
 *   node tests/levels-review.cjs --only cut-11,cut-12  # subset
 *   node tests/levels-review.cjs --json out.json       # also dump raw metrics
 *   node tests/levels-review.cjs --quick               # skip the per-device probes
 *
 * Exits non-zero when any level is invalid, breaks the cutaway convention, has no
 * clean (no-EMP, zero-alarm) solution, or when a headline mechanic is not required.
 *
 * Metrics
 *   witness  turns of the weighted-A* witness from app/tests/solve.cjs (PAR basis)
 *   opt      exact minimum turns (breadth-first search over the same state key)
 *   nodes    solver nodes expanded for the clean witness (difficulty proxy)
 *   waits    WAIT actions in the clean witness
 *   intel    extra turns the all-intel witness needs over the clean witness (0 = on the main path)
 *   emp      exact minimum turns when EMPs may be used ('-' when the level grants none)
 *   unused   floor cells reachable on the map that no witness (clean or all-intel) ever visits
 *   probes   each advertised mechanic is neutralised and the level is re-solved exactly:
 *            tools (keys, switches, crates, light switches, vents) must become unsolvable or
 *            costlier when removed; threats (lasers, cameras, drones, lockdown, afterRelic,
 *            light cycles) must make the optimal route longer or change it when removed.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const E = require('../src/engine.js');
const C = require('../src/cutaway-rules.js');
const { solve } = require('../../app/tests/solve.cjs');

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const levelsFile = path.resolve(opt('--levels', path.join(__dirname, '../src/cutaway-levels.js')));
const only = opt('--only', null)?.split(',');
const jsonOut = opt('--json', null);
const quick = args.includes('--quick');

function loadLevels(file) {
  const sandbox = { module: { exports: {} }, globalThis: {} };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  return JSON.parse(JSON.stringify(sandbox.module.exports));
}

// Order in which the UI presents the content (src/ui.js campaign list, then annex, archive).
const LESSONS = ['cut-00', 'drill-pulse', 'drill-light', 'drill-weight'];
const CAMPAIGN = ['cut-02', 'cut-03', 'cut-05', 'cut-06', 'cut-07', 'cut-04', 'cut-01', 'cut-08', 'cut-09', 'cut-10', 'cut-11', 'cut-12'];

// Headline mechanics per level, derived from tag/desc. Each must pass its probe.
const HEADLINE = {
  'cut-00': [],
  'drill-pulse': ['lasers'],
  'drill-light': ['light-switch'],
  'drill-weight': ['crates'],
  'cut-01': ['guards', 'vents', 'key-a', 'heavy-trophy'],
  'cut-02': ['lasers'],
  'cut-03': ['key-a'],
  'cut-04': ['key-a', 'key-b'],
  'cut-05': ['crates'],
  'cut-06': ['switch-1', 'circuit'],
  'cut-07': ['light-switch'],
  'cut-08': ['after-relic'],
  'cut-09': ['lockdown', 'switch-1', 'key-a'],
  'cut-10': ['switch-1', 'key-a', 'key-b', 'crates', 'lockdown'],
  'cut-11': ['key-a', 'switch-1', 'switch-2', 'light-switch', 'circuit', 'lockdown'],
  'cut-12': ['guards', 'lasers', 'key-a', 'lockdown', 'heavy-trophy'],
  'annex-01': ['light-switch', 'switch-1'],
  'annex-02': ['light-cycle', 'key-a', 'key-b'],
  'archive-01': ['each-crate'],
  'archive-02': ['light-cycle', 'lasers'],
  'archive-03': ['switch-1', 'key-a', 'lockdown', 'vents', 'heavy-trophy'],
  'last-cutaway': [],
};

const GOOD = /REQUIRED|binding|helps|forces-prep|tight/;
// ---------- exact breadth-first search (minimum turns, zero alarms, same state key as solve.cjs) ----------
function bfs(raw, { useEMP = false, allIntel = false, maxStates = 1500000, startState = null, stopAtRelic = false } = {}) {
  const l = E.normalize(raw), period = E.period(l), chips = E.positions(l, 'o').length, allMask = (1 << chips) - 1;
  const key = s => [s.x, s.y, +!!s.lightOverride, s.turn % period, s.keys, s.switches, +s.relic, allIntel ? s.intel : 0,
    s.crates.map(p => p.y * 16 + p.x).sort((a, b) => a - b).join('.'), s.lockdownLeft ?? '-', useEMP ? s.emps : 0, useEMP ? s.empLeft : 0].join('/');
  const start = startState || E.create(l, 'ghost'), seen = new Set([key(start)]);
  let frontier = [{ s: start, a: null, p: null }], states = 1;
  while (frontier.length) {
    const next = [];
    if (stopAtRelic) { const got = frontier.filter(n => n.s.relic); if (got.length) return { ok: true, relicStates: got.map(n => n.s), turns: got[0].s.turn, states }; }
    for (const n of frontier) {
      const s = n.s;
      if (s.turn >= 200) continue;
      const acts = ['N', 'E', 'S', 'W', 'WAIT'];
      if (E.interact(l, s)) acts.push('VENT');
      if (useEMP && s.emps > 0) acts.push('EMP');
      if (E.canToggleLight(l, s)) acts.push('LIGHT');
      for (const a of acts) {
        const q = E.step(l, s, a);
        if (!q.changed || q.state.status === 'lost') continue;
        const node = { s: q.state, a, p: n };
        if (!stopAtRelic && q.state.status === 'won' && (!allIntel || q.state.intel === allMask)) {
          const actions = []; for (let m = node; m.p; m = m.p) actions.push(m.a); actions.reverse();
          return { ok: true, turns: q.state.turn, actions, states };
        }
        if (q.state.status === 'won') continue;
        const k = key(q.state); if (seen.has(k)) continue; seen.add(k); states++;
        if (states > maxStates) return { ok: null, states };
        next.push(node);
      }
    }
    frontier = next;
  }
  return { ok: false, states };
}

// ---------- helpers ----------
const clone = o => JSON.parse(JSON.stringify(o));
function setTiles(raw, from, to) { const l = clone(raw); l.map = l.map.map(r => r.split(from).join(to)); return l; }
function visited(raw, actions) {
  const l = E.normalize(raw), r = E.replay(l, actions, 'ghost'), cells = new Set();
  for (const s of r.states || []) cells.add(E.xy(s.x, s.y));
  return { cells, states: r.states || [], ok: r.ok };
}
function floorCells(raw) {
  // floor cells (odd rows) reachable from S if every door were open
  const l = E.normalize(raw), start = E.positions(l, 'S')[0], vents = E.positions(l, 'v');
  const seen = new Set([E.xy(start.x, start.y)]), q = [start];
  for (let i = 0; i < q.length; i++) {
    const at = q[i], nb = Object.values(E.DIRS).map(([dx, dy]) => ({ x: at.x + dx, y: at.y + dy }));
    if (E.tile(l, at.x, at.y) === 'v') nb.push(...vents);
    for (const n of nb) { const k = E.xy(n.x, n.y); if (seen.has(k) || E.tile(l, n.x, n.y) === '#' || E.deviceAt(l, n.x, n.y)) continue; seen.add(k); q.push(n); }
  }
  return [...seen].filter(k => +k.split(',')[1] % 2 === 1);
}
function testConvention(l) {
  const errors = [], rows = l.map.length;
  if (rows % 2 === 0) errors.push('odd row count');
  l.map.forEach((row, y) => { if (y % 2 === 0 && y > 0 && y < rows - 1) [...row].forEach((c, x) => { if (c !== '#' && c !== '.') errors.push(`slab ${x},${y}`); }); });
  for (const k of ['lasers', 'cameras']) for (const d of l[k] || []) if (d.y % 2 === 0) errors.push(`${k} on slab`);
  for (const g of l.guards || []) for (const [, y] of g.path) if (y % 2 === 0) errors.push('guard on slab');
  return errors;
}

// ---------- probes ----------
function probeList(raw) {
  const has = c => raw.map.some(r => r.includes(c)), P = [];
  const devs = k => (raw[k] || []);
  if (has('a')) P.push({ name: 'key-a', kind: 'tool', make: r => setTiles(r, 'a', '.') });
  if (has('b')) P.push({ name: 'key-b', kind: 'tool', make: r => setTiles(r, 'b', '.') });
  if (has('1')) P.push({ name: 'switch-1', kind: 'tool', make: r => setTiles(r, '1', '.') });
  if (has('2')) P.push({ name: 'switch-2', kind: 'tool', make: r => setTiles(r, '2', '.') });
  if (has('C')) P.push({ name: 'crates', kind: 'tool', make: r => setTiles(r, 'C', '.') });
  if (has('v')) P.push({ name: 'vents', kind: 'tool', make: r => setTiles(r, 'v', '.') });
  if (has('l') && !raw.lighting?.period) P.push({ name: 'light-switch', kind: 'tool', make: r => setTiles(r, 'l', '.') });
  if (raw.lighting?.period) P.push({ name: 'light-cycle', kind: 'threat', make: r => { const l = clone(r); l.lighting = { initialOn: false }; l.map = l.map.map(x => x.split('l').join('.')); return l; }, note: 'lights forced off' });
  if (devs('lasers').length) P.push({ name: 'lasers', kind: 'threat', make: r => ({ ...clone(r), lasers: [] }) });
  if (devs('cameras').length) P.push({ name: 'cameras', kind: 'threat', make: r => ({ ...clone(r), cameras: [] }) });
  if (devs('guards').length) P.push({ name: 'guards', kind: 'threat', make: r => ({ ...clone(r), guards: [] }) });
  const circ = k => devs(k).map((d, i) => d.circuit != null ? i : -1).filter(i => i >= 0);
  if (['lasers', 'cameras', 'guards'].some(k => circ(k).length)) P.push({ name: 'circuit', kind: 'threat', make: r => { const l = clone(r); for (const k of ['lasers', 'cameras', 'guards']) l[k] = (l[k] || []).filter(d => d.circuit == null); return l; }, note: 'circuit devices removed' });
  if (['lasers', 'cameras', 'guards'].some(k => devs(k).some(d => d.afterRelic))) P.push({ name: 'after-relic', kind: 'threat', make: r => { const l = clone(r); for (const k of ['lasers', 'cameras', 'guards']) l[k] = (l[k] || []).filter(d => !d.afterRelic); return l; }, note: 'afterRelic devices removed' });
  if (raw.ventsWithRelic === false && has('v')) P.push({ name: 'heavy-trophy', kind: 'threat', make: r => ({ ...clone(r), ventsWithRelic: true }) });
  return P;
}
function crateProbes(raw) {
  const P = [];
  raw.map.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'C') P.push({ name: `crate@${x},${y}`, make: r => { const l = clone(r); const a = [...l.map[y]]; a[x] = '.'; l.map[y] = a.join(''); return l; } }); }));
  return P.length > 1 ? P : [];
}
// Lockdown: (1) does the greedy plan (fastest route to the trophy, then escape) fail? (2) how tight is the timer?
function lockdownProbe(raw) {
  const l = E.normalize(raw), g = bfs(raw, { stopAtRelic: true });
  const greedyEscapes = g.ok ? g.relicStates.some(s => bfs(raw, { startState: s }).ok) : false;
  let lo = 6, hi = raw.lockdown; // smallest lockdown that is still clean-solvable
  while (lo < hi) { const mid = (lo + hi) >> 1; if (bfs({ ...clone(raw), lockdown: mid }).ok) hi = mid; else lo = mid + 1; }
  const slack = raw.lockdown - lo;
  return { greedyEscapes, minLockdown: lo, slack, verdict: !greedyEscapes ? 'forces-prep' : slack <= 3 ? `tight(slack ${slack})` : `LOOSE(slack ${slack})` };
}
function deviceProbes(raw) {
  const P = [];
  for (const k of ['lasers', 'cameras', 'guards']) (raw[k] || []).forEach((d, i) => P.push({ name: `${k.slice(0, -1)}#${i}`, make: r => { const l = clone(r); l[k] = l[k].filter((_, j) => j !== i); return l; } }));
  return P;
}

// ---------- per-level analysis ----------
function analyse(raw) {
  const out = { id: raw.id, tag: raw.tag, par: raw.par, size: `${raw.map[0].length}x${raw.map.length}`, floors: (raw.map.length - 1) / 2 };
  out.valid = E.validate(raw).errors;
  out.convention = [...C.conventionErrors(raw), ...testConvention(raw)];
  if (out.valid.length) return out;
  const t0 = Date.now();
  const clean = solve(raw, { maxNodes: 400000 });
  out.ok = clean.ok; out.nodes = clean.expanded;
  if (!clean.ok) return out;
  out.replay = E.replay(E.normalize(raw), clean.actions, 'ghost').ok;
  out.witness = clean.turns; out.waits = clean.actions.filter(a => a === 'WAIT').length;
  out.parSuggested = Math.round(clean.turns * 1.15);
  const exact = bfs(raw); out.opt = exact.ok ? exact.turns : null; out.optStates = exact.states;
  const nChips = E.positions(E.normalize(raw), 'o').length; out.chips = nChips;
  let intelActs = null;
  if (nChips) {
    const ai = solve(raw, { maxNodes: 400000, allIntel: true });
    out.allIntel = ai.ok ? ai.turns : null; if (ai.ok) intelActs = ai.actions;
    const ex = bfs(raw, { allIntel: true }); out.allIntelOpt = ex.ok ? ex.turns : null;
    out.intelDetour = ex.ok && exact.ok ? ex.turns - exact.turns : null;
  }
  if ((raw.emps ?? 1) > 0) { const e = bfs(raw, { useEMP: true }); out.emp = e.ok ? e.turns : null; }
  // relic -> exit in the exact route (for lockdown slack)
  const vv = visited(raw, exact.ok ? exact.actions : clean.actions);
  const ri = vv.states.findIndex(s => s.relic);
  out.escapeTurns = ri >= 0 ? vv.states.at(-1).turn - vv.states[ri].turn : null;
  if (raw.lockdown) { out.lockdownSlack = raw.lockdown - out.escapeTurns; out.lockdown = raw.lockdown; }
  // unused space
  const seen = new Set([...visited(raw, clean.actions).cells, ...vv.cells, ...(intelActs ? visited(raw, intelActs).cells : [])]);
  const floor = floorCells(raw);
  out.floorCells = floor.length; out.unused = floor.filter(k => !seen.has(k)).length;
  // mechanic probes (exact optimal turns with the element neutralised)
  out.probes = {};
  for (const p of probeList(raw)) {
    const r = bfs(p.make(raw));
    let verdict;
    if (p.kind === 'tool') verdict = r.ok === false ? 'REQUIRED' : r.ok === null ? 'unknown' : r.turns > out.opt ? `helps(+${r.turns - out.opt})` : 'OPTIONAL';
    else verdict = r.ok === false ? 'breaks' : r.ok === null ? 'unknown' : r.turns < out.opt ? `binding(-${out.opt - r.turns})` : sameRoute(raw, exact.actions, r.actions) ? 'DECORATIVE' : 'shapes-route';
    out.probes[p.name] = verdict;
  }
  for (const p of crateProbes(raw)) { const r = bfs(p.make(raw)); out.probes[p.name] = r.ok === false ? 'REQUIRED' : r.ok === null ? 'unknown' : r.turns > out.opt ? `helps(+${r.turns - out.opt})` : 'OPTIONAL'; }
  if (raw.lockdown) { const lp = lockdownProbe(raw); out.probes.lockdown = lp.verdict; out.lockdownMin = lp.minLockdown; out.greedyTheft = lp.greedyEscapes; }
  if (!quick) {
    out.devices = {};
    for (const p of deviceProbes(raw)) { const r = bfs(p.make(raw)); out.devices[p.name] = r.ok ? out.opt - r.turns : '?'; }
  }
  out.headline = (HEADLINE[raw.id] || []).flatMap(n => n === 'each-crate' ? Object.keys(out.probes).filter(k => k.startsWith('crate@')).map(k => ({ n: k, v: out.probes[k] })) : [{ n, v: out.probes[n] || 'missing' }]);
  out.headlineOk = out.headline.every(h => GOOD.test(h.v));
  out.ms = Date.now() - t0;
  return out;
}
function sameRoute(raw, a, b) { if (!b) return false; const va = visited(raw, a).cells, vb = visited(raw, b).cells; return va.size === vb.size && [...va].every(k => vb.has(k)); }

// ---------- --show: print a level with its optimal route overlaid ----------
function show(raw) {
  const l = E.normalize(raw), r = bfs(raw), grid = raw.map.map(row => [...row]);
  if (r.ok) for (const s of visited(raw, r.actions).states) if (grid[s.y][s.x] === '.') grid[s.y][s.x] = '*';
  for (const g of l.guards) for (const [x, y] of g.path) if (grid[y][x] === '.' || grid[y][x] === '*') grid[y][x] = grid[y][x] === '*' ? '%' : 'g';
  l.lasers.forEach(d => { grid[d.y][d.x] = 'L'; }); l.cameras.forEach(d => { grid[d.y][d.x] = 'K'; });
  console.log(`\n${raw.id} (${raw.tag}) opt ${r.turns ?? 'none'}  [* route, g drone path, % both, L laser, K camera]`);
  grid.forEach((row, y) => console.log('  ' + String(y).padStart(2) + ' ' + row.join('')));
  l.lasers.forEach((d, i) => console.log(`  laser#${i} ${d.x},${d.y} ${d.dir} r${d.range} p${d.period || 4} on${d.on || 2} ph${d.phase || 0}${d.circuit != null ? ' c' + d.circuit : ''}${d.afterRelic ? ' afterRelic' : ''}`));
  l.cameras.forEach((d, i) => console.log(`  camera#${i} ${d.x},${d.y} ${(d.rotation || [d.dir]).join('')} r${d.range} spd${d.speed || 2} ph${d.phase || 0}${d.circuit != null ? ' c' + d.circuit : ''}${d.afterRelic ? ' afterRelic' : ''}`));
  l.guards.forEach((d, i) => console.log(`  guard#${i} ${d.path.map(p => p.join(',')).join(' ')} r${d.range ?? 2} spd${d.speed || 1} ph${d.phase || 0}`));
  if (r.ok) console.log('  route: ' + r.actions.map(a => a === 'WAIT' ? '.' : a === 'LIGHT' ? 'L' : a === 'VENT' ? 'V' : a).join(''));
}
module.exports = { analyse, bfs, show, loadLevels, lockdownProbe };
if (require.main === module) main();
function main() {
if (args.includes('--show')) { for (const raw of loadLevels(levelsFile).filter(l => !only || only.includes(l.id))) show(raw); return; }

// ---------- report ----------
const all = loadLevels(levelsFile).filter(l => !only || only.includes(l.id));
const results = [];
for (const raw of all) { const r = analyse(raw); results.push(r); process.stderr.write(`.${raw.id} ${r.ms ?? 0}ms\n`); }

const pad = (s, n) => String(s ?? '-').padEnd(n), lpad = (s, n) => String(s ?? '-').padStart(n);
console.log(`Rare Heist level review — ${path.relative(process.cwd(), levelsFile)} — ${results.length} levels\n`);
console.log(pad('id', 13) + pad('size', 6) + lpad('par', 4) + lpad('sugg', 5) + lpad('wit', 5) + lpad('opt', 5) + lpad('nodes', 8) + lpad('wait', 5) + lpad('intel', 6) + lpad('emp', 5) + lpad('unused', 7) + '  headline probes');
for (const r of results) {
  if (r.valid.length || !r.ok) { console.log(pad(r.id, 13) + ' INVALID/UNSOLVED ' + JSON.stringify(r.valid)); continue; }
  const heads = r.headline.map(h => `${h.n}:${h.v}`).join(' ');
  console.log(pad(r.id, 13) + pad(r.size, 6) + lpad(r.par, 4) + lpad(r.parSuggested, 5) + lpad(r.witness, 5) + lpad(r.opt, 5) + lpad(r.nodes, 8) + lpad(r.waits, 5) + lpad(r.chips ? '+' + r.intelDetour : '-', 6) + lpad(r.emp, 5) + lpad(`${r.unused}/${r.floorCells}`, 7) + '  ' + (r.headlineOk ? '' : '!! ') + heads);
}
console.log('\nAll probes (tool: REQUIRED/helps/OPTIONAL; threat: binding/shapes-route/DECORATIVE/breaks; lockdown: forces-prep/tight/LOOSE):');
for (const r of results) if (r.probes) console.log('  ' + pad(r.id, 13) + Object.entries(r.probes).map(([k, v]) => `${k}=${v}`).join('  ') + (r.lockdownSlack != null ? `  (lockdown ${r.lockdown}, smallest solvable ${r.lockdownMin}; optimal escape ${r.escapeTurns} turns; greedy theft ${r.greedyTheft ? 'escapes' : 'fails'})` : '') + (r.devices ? '  | per-device turns saved if removed: ' + Object.entries(r.devices).map(([k, v]) => `${k}:${v}`).join(' ') : ''));

const byId = Object.fromEntries(results.map(r => [r.id, r]));
const campaign = CAMPAIGN.filter(id => byId[id]?.ok);
if (campaign.length) {
  console.log('\nCampaign curve (UI order):');
  for (const id of campaign) { const r = byId[id]; console.log('  ' + pad(id, 8) + lpad(r.nodes, 7) + ' ' + '#'.repeat(Math.max(1, Math.round(Math.log2(r.nodes + 1) * 2)))); }
  const drops = []; for (let i = 1; i < campaign.length; i++) if (byId[campaign[i]].nodes < byId[campaign[i - 1]].nodes * 0.5) drops.push(`${campaign[i - 1]}->${campaign[i]}`);
  console.log('  sharp difficulty drops (>50% fewer nodes than previous): ' + (drops.join(', ') || 'none'));
}
const solved = results.filter(r => r.ok), nodes = solved.map(r => r.nodes).sort((a, b) => a - b);
const median = nodes.length ? nodes[Math.floor(nodes.length / 2)] : 0;
const problems = [];
for (const r of results) {
  if (r.valid.length) problems.push(`${r.id}: invalid (${r.valid.join('; ')})`);
  if (r.convention.length) problems.push(`${r.id}: convention (${[...new Set(r.convention)].join('; ')})`);
  if (!r.valid.length && !r.ok) problems.push(`${r.id}: no clean solution found`);
  if (r.ok && !r.replay) problems.push(`${r.id}: witness does not replay`);
  if (r.ok && !r.headlineOk) problems.push(`${r.id}: headline mechanic not required (${r.headline.filter(h => !GOOD.test(h.v)).map(h => h.n + '=' + h.v).join(', ')})`);
  if (r.ok) for (const h of r.headline) if (h.v === 'binding(-1)') problems.push(`${r.id}: headline ${h.n} is weak (removing it saves only 1 turn)`);
  if (r.ok && Math.abs(r.par - r.parSuggested) > 2) problems.push(`${r.id}: PAR ${r.par} vs witness ${r.witness} (+15% = ${r.parSuggested})`);
  if (r.ok && r.chips && r.intelDetour === 0) problems.push(`${r.id}: intel lies on the optimal route (no detour)`);
  if (r.ok && r.emp != null && r.opt - r.emp >= Math.max(4, r.opt * 0.25)) problems.push(`${r.id}: EMP shortens the optimum by ${r.opt - r.emp} turns`);
}
console.log(`\nSummary: ${results.length} levels, ${solved.length} clean-solvable, median solver nodes ${median}, ` +
  `${results.filter(r => r.ok && r.headlineOk).length}/${solved.length} with every headline mechanic required.`);
for (const id of ['cut-11', 'cut-12']) if (byId[id]?.ok) console.log(`  ${id}: ${byId[id].nodes} nodes (${(byId[id].nodes / median).toFixed(1)}x median), witness ${byId[id].witness}, opt ${byId[id].opt}`);
console.log(problems.length ? 'Findings:\n  ' + problems.join('\n  ') : 'Findings: none');
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results, null, 1));
const fatal = results.some(r => r.valid.length || r.convention.length || !r.ok || !r.replay || !r.headlineOk);
process.exitCode = fatal ? 1 : 0;
}
