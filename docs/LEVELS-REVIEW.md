# Rare Heist: cutaway level review

Date: 2026-09-27. Scope: `src/cutaway-levels.js` only (the engine, renderer and UI are unchanged).
Tool: `tests/levels-review.cjs`. Run it with `node tests/levels-review.cjs` (about 30 s). It exits non-zero if any level fails a check.

## How the review measures a level

| Metric | Meaning |
|---|---|
| **wit** | Turns of the weighted-A* witness from `app/tests/solve.cjs`, ghost mode (zero alarms), no EMP. This is the PAR basis: PAR = round(wit × 1.15). |
| **opt** | Exact minimum turns, from a breadth-first search over the same state key. |
| **nodes** | Nodes the solver expands to find the clean witness. This is the difficulty proxy. It is noisy: keycard detours inflate it and pure timing puzzles deflate it. |
| **wait** | WAIT actions in the clean witness. Back-and-forth dithering is not counted. |
| **intel** | Extra turns the exact all-intel route needs. `+0` means the optional chip lies on an optimal route, so it is free. |
| **emp** | Exact optimum when EMPs may be used. `-` means the level grants no EMP. |
| **unused** | Reachable floor cells that no witness (clean or all-intel) ever visits. |
| **headline probes** | Each advertised mechanic is neutralised and the level is re-solved exactly. **Tools** (keys, switches, crates, light switch, vents) are removed: `REQUIRED` = unsolvable without it, `helps(+n)` = n turns longer without it, `OPTIONAL` = no effect. **Threats** (lasers, cameras, drones, after-trophy devices, light cycle, heavy trophy) are removed: `binding(-n)` = the optimum gets n turns shorter, `DECORATIVE` = no effect. **Lockdown**: `forces-prep` = the greedy plan (fastest route to the trophy, then escape) fails; `tight` = the timer has at most 3 turns of slack; `LOOSE` = neither. |

Checks per level: `HeistEngine.validate`, `CutawayRules.conventionErrors` (the check the editor and server use, including the 720-turn period cap), the stricter slab/device/patrol checks from `app/tests/cutaway.test.cjs`, clean solvability, witness replay, all-intel solvability, and the probes above. As a cross-check, the assertions in `app/tests/cutaway.test.cjs` were run against the app18 levels: 67/67 pass.

## Before / after

Arrows read "before → after". Rows marked with ✱ are levels whose map or data changed.

| id | par | opt | nodes | waits | intel detour | EMP opt | unused | headline mechanics |
|---|---|---|---|---|---|---|---|---|
| cut-00 | 21 | 18 | 19 | 0 | – | – | 17/32 | ok |
| ✱ cut-01 | 53 | 46 | 131→145 | 3→1 | +24→+16 | 45→46 | 7→8/49 | **vents OPTIONAL → helps(+16)** |
| ✱ cut-02 | 22→26 | 19→23 | 20→33 | 1→3 | +0 | 19→22 | 14→12/29 | lasers binding −1 (weak) → −5 |
| ✱ cut-03 | 35 | 30 | 332 | 0 | **+0→+6** | 27 | 6→5/31 | ok |
| cut-04 | 66 | 57 | 361 | 1 | +0 | 55 | 7/41 | ok |
| ✱ cut-05 | 42 | 36 | 42 | 0 | **+0→+4** | 36 | 10→9/32 | ok |
| cut-06 | 33 | 28 | 42 | 0 | +0 | 28 | 14/40 | ok |
| ✱ cut-07 | 43 | 37 | 175 | 0 | **+0→+14** | 28 | 19→12/41 | ok |
| ✱ cut-08 | 26→36 | 22→31 | 38→216 | 1→4 | +1→+4 | 22 | 15/40→15/39 | **after-relic −1 (weak) → −10** |
| ✱ cut-09 | 33 | 28 | 830 | 0 | **+0→+13** | – | 23→13/41 | ok (lockdown forces prep); hint corrected |
| ✱ cut-10 | 74 | 64 | 1286→3105 | 3→2 | **+0→+10** | – | 18/60 | **lockdown tight(slack 3) → forces-prep** |
| annex-01 | 38 | 33 | 640 | 0 | +8 | – | 14/42 | ok |
| annex-02 | 35 | 30 | 198 | 0 | +12 | – | 17/41 | ok |
| **cut-11 (new)** | 57 | 47 | **2890** | 9 | +4 | – | 15/49 | all required (switch 2 helps +3) |
| **cut-12 (new)** | 54 | 47 | **4640** | 6 | +3 | – | 11/50 | all required |
| ✱ archive-01 | 40→60 | 34→52 | 204→160 | 0→2 | +10→+6 | – | 14/43→11/42 | **upper crate OPTIONAL → REQUIRED** |
| ✱ archive-02 | 28→57 | 24→50 | 25→407 | 0→7 | +14→+6 | – | 19/42→13/41 | **light cycle + lasers DECORATIVE → −11 / −3** |
| ✱ archive-03 | 29→49 | 25→43 | 684→6495 | 0→4 | +14→+4 | – | 12→6/41 | **lockdown LOOSE (theft-first worked) → forces-prep** |
| drill-pulse | 23 | 20 | 43 | 4 | – | – | 11/26 | ok |
| drill-light | 27 | 23 | 81 | 0 | – | – | 12/26 | ok |
| drill-weight | 42 | 36 | 66 | 0 | – | – | 7/27 | ok |
| last-cutaway | 35 | 30 | 40 | 0 | +10 | – | 13/42 | untouched (seed map) |

Median solver nodes: 131 before (20 levels), 198 after (22 levels). Headline mechanics fully required: 16/20 before, 22/22 after.

## What changed and why

Ids and array order are unchanged. The two new levels are inserted between `annex-02` and `archive-01`. `name`/`nameEn`, `desc`/`descEn` and `hint`/`hintEn` stay identical English strings.

- **cut-01 Night Gallery (PATROL / VENTS)**: *Problem:* the vents were optional (exact optimum 46 with or without them), and the desc sent players to "hatches". *Fix:* the drone's patrol now extends over the trophy (x 4–12, phase 9). Entering by the vent behind the drone now saves 16 turns, and the drone binds by 4. The desc and hint now describe the vent entry and the column-10 exit ladder. PAR stays 53.
- **cut-02 Between the Pulses (LASER TIMING)**: *Problem:* the upper laser was decorative and the level's only timing cost was 1 turn. *Fix:* laser phases changed 0/3 → 2/5. Both clocks now matter (5 and 2 turns) and the route needs 3 WAITs, which is still gentle for the first campaign level. PAR 22 → 26.
- **cut-03 / cut-05 / cut-07 / cut-09 (intel)**: *Problem:* the optional chip sat on the optimal route, so the ALL INTEL target came free. *Fix:* each chip moved to an off-route cell that engages a threat. cut-03 (10,3): +6 turns under the rotating camera. cut-05 (10,3): +4 through the camera sweep. cut-07 (10,7): +14; it needs card A and passes the laser, which were otherwise decorative. cut-09 (10,7): +13; it has to be done before the theft via the east climb past the laser and camera, which were otherwise decorative.
- **cut-08 Silent Until Stolen (AFTER THE TROPHY)**: *Problem:* the "entirely different exit problem" cost 1 turn and 38 nodes, a sharp dip at campaign slot 8. *Fix:* the west after-trophy beam is now on 5 of 6 turns, so it is effectively shut after the theft. A third after-trophy laser guards the east climb at (11,5). The escape is now a three-clock ladder climb. After-relic devices bind by 10; nodes 38 → 216. Hint rewritten. PAR 26 → 36.
- **cut-09 Twenty to Midnight**: *Problem:* the hint said "the direct climb on the east is your way out", but only the west ladders fit inside the 18-turn lockdown. *Fix:* hint corrected (plus the intel move above).
- **cut-10 The Last Floor**: *Problem:* switch 1 sat on the forced path, so "prepare the circuit" happened automatically and the greedy theft escaped. The hint also called the vent necessary, but it is optional. *Fix:* switch 1 moved to the far-west dead end (1,3). The lockdown now punishes an unprepared theft. Same optimum (64), nodes 1286 → 3105. Hint rewritten.
- **archive-01 Double Weight**: *Problem:* the upper crate and gate G could be bypassed through a ladder shaft next to the crate. *Fix:* the floors were re-cut so each gate is the only way down: the top crate goes left onto P1, then down past G; the lower crate goes right onto P2, then down past H. The trophy sits under a laser that needs a 2-turn wait. PAR 40 → 60.
- **archive-02 Rolling Blackout**: *Problem:* the straight west shaft skipped every clock (25 nodes, both headline clocks decorative). *Fix:* the only descent now lands in the camera corridor. The lit camera covers 6 cells and darkness lasts 3 turns, so the player must cross in threes with a hide hatch in the middle; the light switch shifts the clock. A laser guards the far landing. PAR 28 → 57.
- **archive-03 No Return Ticket**: *Problem:* grabbing the trophy first and preparing afterwards worked (lockdown slack 8), and the heavy-trophy rule did nothing, which contradicted the desc and hint. *Fix:* the vault's west ladder was removed, so the trophy must leave by the east staircase. Lockdown 24 → 21. The after-trophy laser phase now binds. The chip moved to the far end of the relay corridor. An unprepared theft now fails. PAR 29 → 49.

## New levels (15 columns, 4 floors, no EMP, one alarm)

### cut-11 "Crossed Wires": CIRCUITS / KEYCARD (PAR 57, optimum 47, 2890 nodes = 14.6× median)
Switch 1 (far west of F2) opens door D and the exit R. Switch 2 (far east of F2) disables circuit-2 security: the vault lasers and the stairwell camera.
- **Decision 1:** kill the lights for 1 turn so the camera sees only 1 cell, or detour to switch 2.
- **Decision 2:** in the vault, time two pulsing lasers (on 4 of 6), or spend about 6 turns flipping switch 2. The switch is worth only 3 net turns, so both plans are real.
- **Order:** a 16-turn lockdown makes switch 1 mandatory before the theft (greedy theft fails).
- **Intel:** the chip sits in the one cell the camera still sees in the dark, so it rewards the switch-2 plan.
- Hint: "Kill the lights before F3 and flip 1 before the theft. Then choose: detour east to switch 2, or time the vault lasers."

### cut-12 "Graveyard Shift": DRONE / LOCKDOWN (PAR 54, optimum 47, 4640 nodes = 23.4× median)
Card A lies at the far end of the vault, beyond the trophy. Walking to it over the trophy steals it and starts the 16-turn lockdown too early, so the card must come first. A range-3 drone patrols the whole hall above the vault, and the trophy cannot use the vent.
- **Decision (risk/reward, equal cost of 47 turns):** take the safe vent down to the card, or drop through the drone hall on the east hatches with a timed hatch hide.
- **Constraints:** an F3 laser clock (period 8) gates the approach either way. The return always crosses the drone hall. The drone binds by 9 turns and the laser by 8.
- **Intel:** optional chip at the drone's west turnaround.
- Hint: "Take the card before the trophy: shutters close 16 turns after the theft. Vent in safely, or slip through the drone hall by the hatches at columns 10 and 9."

## Final script output (summary)

```
Campaign curve (UI order):
  cut-02       33 ##########
  cut-03      332 #################
  cut-05       42 ###########
  cut-06       42 ###########
  cut-07      175 ###############
  cut-04      361 #################
  cut-01      145 ##############
  cut-08      216 ################
  cut-09      830 ###################
  cut-10     3105 #######################
  cut-11     2890 #######################
  cut-12     4640 ########################
  sharp difficulty drops (>50% fewer nodes than previous): cut-03->cut-05, cut-04->cut-01

Summary: 22 levels, 22 clean-solvable, median solver nodes 198, 22/22 with every headline mechanic required.
  cut-11: 2890 nodes (14.6x median), witness 50, opt 47
  cut-12: 4640 nodes (23.4x median), witness 47, opt 47
Findings:
  cut-02: intel lies on the optimal route (no detour)
  cut-04: intel lies on the optimal route (no detour)
  cut-06: intel lies on the optimal route (no detour)
  cut-08: EMP shortens the optimum by 9 turns
```

## Needs action outside this file

1. **The new levels are not visible yet.** `src/ui.js` builds the campaign from a hard-coded list (`['cut-02',…,'cut-10']`). Append `'cut-11','cut-12'` to it. I did not touch `ui.js`.
2. **Changed levels reset per-level target stars.** `HeistPlayfeel.planKey` hashes map, devices and par, so saved ghost/intel/PAR bits reset for every ✱ level. Saved route records embed their own level copy, so old replays still play. Best scores keyed by id stay, but they were set on the old maps.
3. **cut-10 is still titled "The Last Floor" / MASTER HEIST** even though two levels now follow it. Either present cut-11/12 as an encore or retitle.

## Remaining suggestions (not implemented)

- **Curve order.** In the UI order, cut-03 (332 nodes) comes before the gentler mechanic intros cut-05/cut-06 (42), and cut-01 (145) follows cut-04 (361). Part of this is proxy noise: keycard detours inflate node counts. A smoother order would be cut-02, cut-05, cut-06, cut-03, cut-07, cut-01, cut-04, cut-08, cut-09, cut-10, cut-11, cut-12. That is a `ui.js` change.
- **Free intel left alone.** cut-02 keeps its chip next to the trophy on purpose (it teaches intel). The cut-04 chip is on the forced path under a laser. The cut-06 chip is on one of two equal-length routes. Off-route cells in cut-04 are all on the top floor near the start, which reads as a freebie.
- **Decorative security.** These devices still do not change the clean optimum: cut-03 laser; cut-07 laser and card A (they now serve only the intel run); cut-09 laser and camera (intel run only); cut-10 circuit camera and laser (switch 1 is flipped first anyway), after-trophy laser, west camera, vents and light switch; annex-01 laser and circuit; annex-02 laser; cut-01 camera and light switch. They read as alternate-route dressing. The cut-10 extras are the best candidates to trim or rework.
- **EMP shortcuts.** EMP cuts 9 turns from cut-08 (31 → 22) and cut-07 (37 → 28). That is acceptable as a paid bailout (score −60, no ghost medal). If EMP should never beat the intended route, lower `emps` to 0 on cut-08.
- **Wait-heavy routes.** archive-02 (7 waits) and cut-11 (9 in the weighted witness, fewer in the exact route) lean on waiting. Some players find that slow; tightening clock periods to 4 would cut idle turns.
- **Unused space.** Largest pockets: cut-10 (18/60), cut-00 (17/32, intentional), annex-02 (17/41), cut-11 west vault (walled by its laser). Filling them with optional intel or walls would make the plans read more clearly.
- **Proxy limits.** Node counts come from a weighted A* witness finder, not a proof of optimality, and they measure search effort rather than human effort. Playtest cut-11/12 and the archive pack; archive-03 (6495 nodes) may now be the hardest map in the game.
