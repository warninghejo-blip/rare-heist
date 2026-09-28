/* Authored cutaway plans. Pure engine data. PAR is based on a verified route, not a shortest-path claim. */
(function(r){const levels=[
 {
  "id": "cut-00",
  "name": "The First Job",
  "nameEn": "The First Job",
  "tag": "TRAINING",
  "map": [
   "#############",
   "#S....#....E#",
   "##.#######.##",
   "#...........#",
   "###.#####.###",
   "#....T......#",
   "#############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 21,
  "lasers": [],
  "cameras": [],
  "guards": [],
  "desc": "Walk the floor. Find a ladder. Take the trophy downstairs and return to the EXIT.",
  "hint": "Up and down work only at a ladder. Each rung is one turn. Nothing moves until you do.",
  "descEn": "Walk the floor. Find a ladder. Take the trophy downstairs and return to the EXIT.",
  "hintEn": "Up and down work only at a ladder. Each rung is one turn. Nothing moves until you do."
 },
 {
  "id": "cut-01",
  "name": "Night Gallery",
  "nameEn": "Night Gallery",
  "tag": "PATROL / VENTS",
  "map": [
   "###############",
   "#S.......o.#.E#",
   "#.##########.##",
   "#.l...a.......#",
   "#######.#######",
   "#.v.....A.....#",
   "##########.##.#",
   "#.v..T........#",
   "###############"
  ],
  "emps": 1,
  "maxAlarms": 2,
  "par": 53,
  "lasers": [
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 2,
    "period": 4,
    "on": 2,
    "phase": 0
   }
  ],
  "cameras": [
   {
    "x": 10,
    "y": 1,
    "dir": "W",
    "range": 5,
    "rotation": [
     "W",
     "S"
    ],
    "speed": 2
   }
  ],
  "guards": [
   {
    "path": [
     [
      4,
      7
     ],
     [
      5,
      7
     ],
     [
      6,
      7
     ],
     [
      7,
      7
     ],
     [
      8,
      7
     ],
     [
      9,
      7
     ],
     [
      10,
      7
     ],
     [
      11,
      7
     ],
     [
      12,
      7
     ],
     [
      11,
      7
     ],
     [
      10,
      7
     ],
     [
      9,
      7
     ],
     [
      8,
      7
     ],
     [
      7,
      7
     ],
     [
      6,
      7
     ],
     [
      5,
      7
     ]
    ],
    "range": 2,
    "phase": 9
   }
  ],
  "desc": "A card on F3. A trophy on F1, inside the drone patrol. Slip in through the vent and hide on ladder hatches.",
  "hint": "The trophy cannot use the vent. Vent in while the drone heads east, then follow it out by the ladder at column 10.",
  "ventsWithRelic": false,
  "lighting": {
   "initialOn": true
  },
  "descEn": "A card on F3. A trophy on F1, inside the drone patrol. Slip in through the vent and hide on ladder hatches.",
  "hintEn": "The trophy cannot use the vent. Vent in while the drone heads east, then follow it out by the ladder at column 10."
 },
 {
  "id": "cut-02",
  "name": "Between the Pulses",
  "nameEn": "Between the Pulses",
  "tag": "LASER TIMING",
  "map": [
   "#############",
   "#S.........E#",
   "##.######.###",
   "#....#......#",
   "###.#####.###",
   "#....To.....#",
   "#############"
  ],
  "emps": 1,
  "maxAlarms": 2,
  "par": 26,
  "lasers": [
   {
    "x": 4,
    "y": 3,
    "dir": "W",
    "range": 2,
    "period": 6,
    "on": 2,
    "phase": 2
   },
   {
    "x": 10,
    "y": 5,
    "dir": "W",
    "range": 3,
    "period": 6,
    "on": 2,
    "phase": 5
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "Two laser clocks. Descend on a safe beat, cross the middle floor and choose a clean return.",
  "hint": "Dashed edges show NEXT turn. WAIT advances security without moving you.",
  "descEn": "Two laser clocks. Descend on a safe beat, cross the middle floor and choose a clean return.",
  "hintEn": "Dashed edges show NEXT turn. WAIT advances security without moving you."
 },
 {
  "id": "cut-03",
  "name": "Borrowed Credentials",
  "nameEn": "Borrowed Credentials",
  "tag": "KEYCARD A",
  "map": [
   "#############",
   "#S.......A.E#",
   "##.#####.####",
   "#....a....o.#",
   "###.#####.###",
   "#.T.........#",
   "#############"
  ],
  "emps": 1,
  "maxAlarms": 2,
  "par": 35,
  "lasers": [
   {
    "x": 11,
    "y": 5,
    "dir": "W",
    "range": 2,
    "period": 4,
    "on": 2,
    "phase": 1
   }
  ],
  "cameras": [
   {
    "x": 7,
    "y": 3,
    "dir": "W",
    "range": 3,
    "rotation": [
     "W",
     "E"
    ],
    "speed": 3
   }
  ],
  "guards": [],
  "desc": "The exit accepts card A. Pick it up before you commit to the lower floor.",
  "hint": "Cards open doors automatically. A ceiling camera occupies its mounting tile.",
  "descEn": "The exit accepts card A. Pick it up before you commit to the lower floor.",
  "hintEn": "Cards open doors automatically. A ceiling camera occupies its mounting tile."
 },
 {
  "id": "cut-04",
  "name": "Two Names, One Exit",
  "nameEn": "Two Names, One Exit",
  "tag": "TWO KEYS",
  "map": [
   "#############",
   "#S.....#B..E#",
   "##.#####.####",
   "#.....a.....#",
   "#######.##.##",
   "#.b.A.......#",
   "##########.##",
   "#.T......o..#",
   "#############"
  ],
  "emps": 1,
  "maxAlarms": 2,
  "par": 66,
  "lasers": [
   {
    "x": 11,
    "y": 3,
    "dir": "W",
    "range": 2,
    "period": 6,
    "on": 2,
    "phase": 2
   },
   {
    "x": 11,
    "y": 7,
    "dir": "W",
    "range": 3,
    "period": 6,
    "on": 2,
    "phase": 0
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "Borrow A to reach B. The lift is out: every detour must use the stairs.",
  "hint": "The western ladder bypasses the A door but the east side contains the second card.",
  "descEn": "Borrow A to reach B. The lift is out: every detour must use the stairs.",
  "hintEn": "The western ladder bypasses the A door but the east side contains the second card."
 },
 {
  "id": "cut-05",
  "name": "Weight of Evidence",
  "nameEn": "Weight of Evidence",
  "tag": "CRATE / GUARD",
  "map": [
   "#############",
   "#S.........E#",
   "###.######.##",
   "#.........o.#",
   "#####.#######",
   "#.p.C..G..T.#",
   "#############"
  ],
  "emps": 1,
  "maxAlarms": 2,
  "par": 43,
  "lasers": [],
  "cameras": [],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      4,
      3
     ],
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      9,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ],
     [
      5,
      3
     ]
    ],
    "range": 3,
    "phase": 7
   }
  ],
  "desc": "The only way into the lower vault is through G. A night guard walks the middle floor. Push the crate onto P1 and leave it there while you extract.",
  "hint": "A guard sees three cells ahead and nothing behind. Follow his back while he walks away; wait on a ladder hatch while he passes over you. Push the crate left onto P1.",
  "descEn": "The only way into the lower vault is through G. A night guard walks the middle floor. Push the crate onto P1 and leave it there while you extract.",
  "hintEn": "A guard sees three cells ahead and nothing behind. Follow his back while he walks away; wait on a ladder hatch while he passes over you. Push the crate left onto P1."
 },
 {
  "id": "cut-06",
  "name": "Cut the Feed",
  "nameEn": "Cut the Feed",
  "tag": "CIRCUIT / GUARD",
  "map": [
   "#############",
   "#S.......D.E#",
   "##.#######.##",
   "#1..........#",
   "###.#####.###",
   "#...#..o....#",
   "##.#######.##",
   "#.....T.....#",
   "#############"
  ],
  "emps": 1,
  "maxAlarms": 2,
  "par": 39,
  "lasers": [
   {
    "x": 1,
    "y": 5,
    "dir": "E",
    "range": 2,
    "period": 4,
    "on": 4,
    "circuit": 0
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 3,
    "dir": "W",
    "range": 5,
    "circuit": 0
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      2,
      7
     ],
     [
      3,
      7
     ],
     [
      4,
      7
     ],
     [
      5,
      7
     ],
     [
      6,
      7
     ],
     [
      7,
      7
     ],
     [
      8,
      7
     ],
     [
      9,
      7
     ],
     [
      10,
      7
     ],
     [
      9,
      7
     ],
     [
      8,
      7
     ],
     [
      7,
      7
     ],
     [
      6,
      7
     ],
     [
      5,
      7
     ],
     [
      4,
      7
     ],
     [
      3,
      7
     ]
    ],
    "range": 3,
    "phase": 9
   }
  ],
  "desc": "One circuit powers the cameras, the lasers and the exit door. It does not power the night guard in the vault.",
  "hint": "Walk onto switch 1 to flip it; stepping on it again undoes it. Wait on a vault hatch until the guard walks away, follow him to the trophy and leave before he turns.",
  "descEn": "One circuit powers the cameras, the lasers and the exit door. It does not power the night guard in the vault.",
  "hintEn": "Walk onto switch 1 to flip it; stepping on it again undoes it. Wait on a vault hatch until the guard walks away, follow him to the trophy and leave before he turns."
 },
 {
  "id": "cut-07",
  "name": "Lights Out",
  "nameEn": "Lights Out",
  "tag": "LIGHTS / GUARD",
  "map": [
   "#############",
   "#Sl........E#",
   "###.######.##",
   "#...........#",
   "##.######.###",
   "#.......a...#",
   "###.######.##",
   "#.T......Ao.#",
   "#############"
  ],
  "emps": 1,
  "maxAlarms": 2,
  "par": 51,
  "lasers": [
   {
    "x": 11,
    "y": 7,
    "dir": "W",
    "range": 2,
    "period": 6,
    "on": 2
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 5,
    "dir": "W",
    "range": 8
   },
   {
    "x": 1,
    "y": 3,
    "dir": "E",
    "range": 1
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      5
     ],
     [
      2,
      5
     ],
     [
      3,
      5
     ],
     [
      4,
      5
     ],
     [
      5,
      5
     ],
     [
      6,
      5
     ],
     [
      7,
      5
     ],
     [
      8,
      5
     ],
     [
      7,
      5
     ],
     [
      6,
      5
     ],
     [
      5,
      5
     ],
     [
      4,
      5
     ],
     [
      3,
      5
     ],
     [
      2,
      5
     ]
    ],
    "range": 3,
    "phase": 9
   }
  ],
  "desc": "Cameras see across the rooms and a guard walks the card floor. Reach the switchboard and turn the lights off before descending.",
  "hint": "LIGHT next to l costs one turn. Darkness shortens every eye to one cell, the guard's too: you can walk right behind him. Duck into a hatch when he turns.",
  "lighting": {
   "initialOn": true
  },
  "descEn": "Cameras see across the rooms and a guard walks the card floor. Reach the switchboard and turn the lights off before descending.",
  "hintEn": "LIGHT next to l costs one turn. Darkness shortens every eye to one cell, the guard's too: you can walk right behind him. Duck into a hatch when he turns."
 },
 {
  "id": "cut-08",
  "name": "Silent Until Stolen",
  "nameEn": "Silent Until Stolen",
  "tag": "AFTER THE TROPHY",
  "map": [
   "#############",
   "#S....#....E#",
   "##.######.###",
   "#.v.........#",
   "###.######.##",
   "#...o.......#",
   "##.######.###",
   "#.vT........#",
   "#############"
  ],
  "emps": 1,
  "maxAlarms": 2,
  "par": 36,
  "lasers": [
   {
    "x": 11,
    "y": 7,
    "dir": "W",
    "range": 4,
    "period": 6,
    "on": 2,
    "phase": 1,
    "afterRelic": true
   },
   {
    "x": 1,
    "y": 5,
    "dir": "E",
    "range": 2,
    "period": 6,
    "on": 5,
    "afterRelic": true
   },
   {
    "x": 11,
    "y": 5,
    "dir": "W",
    "range": 3,
    "period": 6,
    "on": 2,
    "phase": 0,
    "afterRelic": true
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 3,
    "dir": "W",
    "range": 2,
    "rotation": [
     "W",
     "E"
    ],
    "speed": 2,
    "afterRelic": true
   }
  ],
  "guards": [],
  "desc": "The vault looks quiet. Picking up the trophy activates an entirely different exit problem.",
  "hint": "After the theft the west beam almost never rests. Scout the east ladders first; wait on hatches, not in corridors.",
  "ventsWithRelic": false,
  "descEn": "The vault looks quiet. Picking up the trophy activates an entirely different exit problem.",
  "hintEn": "After the theft the west beam almost never rests. Scout the east ladders first; wait on hatches, not in corridors."
 },
 {
  "id": "cut-09",
  "name": "Twenty to Midnight",
  "nameEn": "Twenty to Midnight",
  "tag": "LOCKDOWN / GUARD",
  "map": [
   "#############",
   "#S....#..ARE#",
   "##.#####.####",
   "#1.......a..#",
   "###.#####.###",
   "#......A....#",
   "##.#######.##",
   "#.T.......o.#",
   "#############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 38,
  "lasers": [
   {
    "x": 11,
    "y": 5,
    "dir": "W",
    "range": 2,
    "period": 6,
    "on": 2,
    "phase": 1
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 7,
    "dir": "W",
    "range": 2,
    "rotation": [
     "W",
     "E"
    ],
    "speed": 2
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      2,
      5
     ],
     [
      3,
      5
     ],
     [
      4,
      5
     ],
     [
      5,
      5
     ],
     [
      6,
      5
     ],
     [
      5,
      5
     ],
     [
      4,
      5
     ],
     [
      3,
      5
     ]
    ],
    "range": 3,
    "phase": 7
   }
  ],
  "desc": "After the theft, the shutters close in 18 turns. Prepare the circuit and card before taking the trophy. A guard walks the floor above the vault.",
  "hint": "Door R needs the trophy and switch 1. Only the west ladders get you out in time, and the guard walks right over them: wait on a hatch until his back is turned.",
  "lockdown": 18,
  "descEn": "After the theft, the shutters close in 18 turns. Prepare the circuit and card before taking the trophy. A guard walks the floor above the vault.",
  "hintEn": "Door R needs the trophy and switch 1. Only the west ladders get you out in time, and the guard walks right over them: wait on a hatch until his back is turned."
 },
 {
  "id": "cut-10",
  "name": "The Last Floor",
  "nameEn": "The Last Floor",
  "tag": "MASTER HEIST",
  "map": [
   "###############",
   "#S......#..R.E#",
   "##.#######.####",
   "#1l.....a.....#",
   "#####.#########",
   "#.p.C..G.Ab.o.#",
   "########.######",
   "#..v....B.....#",
   "#########.##.##",
   "#.v.T...o.....#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 74,
  "lasers": [
   {
    "x": 13,
    "y": 5,
    "dir": "W",
    "range": 2,
    "period": 6,
    "on": 2,
    "phase": 0,
    "circuit": 0
   },
   {
    "x": 13,
    "y": 9,
    "dir": "W",
    "range": 3,
    "period": 6,
    "on": 2,
    "afterRelic": true
   }
  ],
  "cameras": [
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 4,
    "circuit": 0
   },
   {
    "x": 1,
    "y": 7,
    "dir": "E",
    "range": 4
   }
  ],
  "guards": [
   {
    "path": [
     [
      6,
      9
     ],
     [
      7,
      9
     ],
     [
      8,
      9
     ],
     [
      9,
      9
     ],
     [
      10,
      9
     ],
     [
      11,
      9
     ],
     [
      10,
      9
     ],
     [
      9,
      9
     ],
     [
      8,
      9
     ],
     [
      7,
      9
     ]
    ],
    "range": 3,
    "kind": "walker"
   }
  ],
  "desc": "Five floors. Two credentials. A pressure gate. A guard in the vault. Prepare the circuit and escape route before a 28-turn lockdown.",
  "hint": "Flip switch 1 at the far west before the theft. Push the crate LEFT onto P1. Lights off, the vault guard sees one cell. The trophy cannot use the vent: it leaves by the east ladders.",
  "lockdown": 28,
  "ventsWithRelic": false,
  "lighting": {
   "initialOn": true
  },
  "descEn": "Five floors. Two credentials. A pressure gate. A guard in the vault. Prepare the circuit and escape route before a 28-turn lockdown.",
  "hintEn": "Flip switch 1 at the far west before the theft. Push the crate LEFT onto P1. Lights off, the vault guard sees one cell. The trophy cannot use the vent: it leaves by the east ladders."
 },
 {
  "id": "annex-01",
  "name": "Pump House",
  "nameEn": "Pump House",
  "tag": "CANAL ANNEX",
  "map": [
   "#############",
   "#Sl.....AD.E#",
   "##.####.#####",
   "#....1......#",
   "###.#####.###",
   "#.......a...#",
   "##.#######.##",
   "#.T...o.A...#",
   "#############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 38,
  "lasers": [
   {
    "x": 11,
    "y": 7,
    "dir": "W",
    "range": 2,
    "period": 6,
    "on": 2,
    "circuit": 0
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 5,
    "dir": "W",
    "range": 7
   }
  ],
  "guards": [],
  "desc": "Kill the lights, reroute the pumps and take the relay. The canal cameras never blink.",
  "hint": "The left switchboard comes first. The pump switch opens the return door.",
  "lighting": {
   "initialOn": true
  },
  "descEn": "Kill the lights, reroute the pumps and take the relay. The canal cameras never blink.",
  "hintEn": "The left switchboard comes first. The pump switch opens the return door."
 },
 {
  "id": "annex-02",
  "name": "Midnight Lens",
  "nameEn": "Midnight Lens",
  "tag": "ROOFTOP ANNEX",
  "map": [
   "#############",
   "#S....#..ABE#",
   "##.#####.####",
   "#...a...l...#",
   "###.####.####",
   "#....A.b....#",
   "##.#######.##",
   "#.T.....o...#",
   "#############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 43,
  "lasers": [
   {
    "x": 1,
    "y": 3,
    "dir": "E",
    "range": 1,
    "period": 6,
    "on": 3
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 5,
    "dir": "W",
    "range": 6
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      9,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ]
    ],
    "range": 3,
    "phase": 2
   }
  ],
  "desc": "Three turns lit, three dark. A guard walks the observatory. Cross under the moving blackout and bring the lens home.",
  "hint": "Lit, the guard sees three cells; dark, only one. Wait in a hatch while he passes overhead. A manual switch inverts the automatic light cycle.",
  "lighting": {
   "initialOn": true,
   "period": 6,
   "on": 3,
   "phase": 0
  },
  "descEn": "Three turns lit, three dark. A guard walks the observatory. Cross under the moving blackout and bring the lens home.",
  "hintEn": "Lit, the guard sees three cells; dark, only one. Wait in a hatch while he passes overhead. A manual switch inverts the automatic light cycle."
 },
 {
  "id": "cut-11",
  "name": "Crossed Wires",
  "nameEn": "Crossed Wires",
  "tag": "CIRCUITS / KEYCARD",
  "map": [
   "###############",
   "#Sl.........RE#",
   "##.#######.####",
   "#.....a.....o.#",
   "####.#####.####",
   "#1.....D.....2#",
   "##########.####",
   "#......T.A....#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 57,
  "lasers": [
   {
    "x": 13,
    "y": 7,
    "dir": "W",
    "range": 4,
    "period": 6,
    "on": 4,
    "phase": 0,
    "circuit": 1
   },
   {
    "x": 1,
    "y": 7,
    "dir": "E",
    "range": 6,
    "period": 6,
    "on": 4,
    "phase": 0,
    "circuit": 1
   }
  ],
  "cameras": [
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 12,
    "circuit": 1
   }
  ],
  "guards": [],
  "lighting": {
   "initialOn": true
  },
  "lockdown": 16,
  "desc": "Two circuits. Switch 1 opens D and the exit. Switch 2 kills the vault lasers and the stairwell camera. Shutters close 16 turns after the theft.",
  "descEn": "Two circuits. Switch 1 opens D and the exit. Switch 2 kills the vault lasers and the stairwell camera. Shutters close 16 turns after the theft.",
  "hint": "Kill the lights before F3 and flip 1 before the theft. Then choose: detour east to switch 2, or time the vault lasers.",
  "hintEn": "Kill the lights before F3 and flip 1 before the theft. Then choose: detour east to switch 2, or time the vault lasers."
 },
 {
  "id": "cut-12",
  "name": "Graveyard Shift",
  "nameEn": "Graveyard Shift",
  "tag": "GUARD / LOCKDOWN",
  "map": [
   "###############",
   "#S......#...AE#",
   "##.########.###",
   "#............v#",
   "####.#####.####",
   "#o............#",
   "##.######.#####",
   "#....T......av#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 54,
  "lasers": [
   {
    "x": 1,
    "y": 3,
    "dir": "E",
    "range": 6,
    "period": 8,
    "on": 2,
    "phase": 0
   }
  ],
  "cameras": [],
  "guards": [
   {
    "path": [
     [
      1,
      5
     ],
     [
      2,
      5
     ],
     [
      3,
      5
     ],
     [
      4,
      5
     ],
     [
      5,
      5
     ],
     [
      6,
      5
     ],
     [
      7,
      5
     ],
     [
      8,
      5
     ],
     [
      9,
      5
     ],
     [
      10,
      5
     ],
     [
      11,
      5
     ],
     [
      12,
      5
     ],
     [
      13,
      5
     ],
     [
      12,
      5
     ],
     [
      11,
      5
     ],
     [
      10,
      5
     ],
     [
      9,
      5
     ],
     [
      8,
      5
     ],
     [
      7,
      5
     ],
     [
      6,
      5
     ],
     [
      5,
      5
     ],
     [
      4,
      5
     ],
     [
      3,
      5
     ],
     [
      2,
      5
     ]
    ],
    "range": 3,
    "phase": 2,
    "kind": "walker"
   }
  ],
  "ventsWithRelic": false,
  "lockdown": 16,
  "desc": "Card A lies at the far end of the vault, past the trophy. A night guard walks the hall above, and the trophy is too heavy for the vent.",
  "descEn": "Card A lies at the far end of the vault, past the trophy. A night guard walks the hall above, and the trophy is too heavy for the vent.",
  "hint": "Take the card before the trophy: shutters close 16 turns after the theft. Vent in safely, or slip through the guard's hall behind his back by the hatches at columns 10 and 9.",
  "hintEn": "Take the card before the trophy: shutters close 16 turns after the theft. Vent in safely, or slip through the guard's hall behind his back by the hatches at columns 10 and 9."
 },
 {
  "id": "archive-01",
  "name": "Double Weight",
  "nameEn": "Double Weight",
  "tag": "ARCHIVE / PRESSURE",
  "map": [
   "#############",
   "#S.........E#",
   "#####.#######",
   "#.p.C..G...o#",
   "########.####",
   "#.....H..C.P#",
   "####.########",
   "#......T...##",
   "#############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 60,
  "lasers": [
   {
    "x": 10,
    "y": 7,
    "dir": "W",
    "range": 3,
    "period": 6,
    "on": 3,
    "phase": 3
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "One crate per pressure circuit. Every weight must be on the correct side before your descent.",
  "hint": "Push the top crate left onto P1 and the lower crate right onto P2. No ladder goes around either gate.",
  "descEn": "One crate per pressure circuit. Every weight must be on the correct side before your descent.",
  "hintEn": "Push the top crate left onto P1 and the lower crate right onto P2. No ladder goes around either gate."
 },
 {
  "id": "archive-02",
  "name": "Rolling Blackout",
  "nameEn": "Rolling Blackout",
  "tag": "ARCHIVE / CLOCKWORK",
  "map": [
   "#############",
   "#S.........E#",
   "##.#######.##",
   "#..l..a.....#",
   "#########.###",
   "#...A.......#",
   "##.####.#####",
   "#.T.#.....o.#",
   "#############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 57,
  "lasers": [
   {
    "x": 1,
    "y": 5,
    "dir": "E",
    "range": 2,
    "period": 6,
    "on": 2,
    "phase": 0
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 5,
    "dir": "W",
    "range": 6
   }
  ],
  "guards": [],
  "desc": "The light clock and laser clock disagree. Make a route that survives both.",
  "hint": "Lit, the camera covers six cells and darkness lasts three turns. Cross in threes and hide in the middle hatch. The switch shifts the light clock.",
  "lighting": {
   "initialOn": true,
   "period": 6,
   "on": 3,
   "phase": 0
  },
  "descEn": "The light clock and laser clock disagree. Make a route that survives both.",
  "hintEn": "Lit, the camera covers six cells and darkness lasts three turns. Cross in threes and hide in the middle hatch. The switch shifts the light clock."
 },
 {
  "id": "archive-03",
  "name": "No Return Ticket",
  "nameEn": "No Return Ticket",
  "tag": "ARCHIVE / EXTRACTION",
  "map": [
   "#############",
   "#S....#..ARE#",
   "##.#####.####",
   "#.v..1.....o#",
   "###.#####.###",
   "#....a..A...#",
   "##########.##",
   "#.vT........#",
   "#############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 49,
  "lasers": [
   {
    "x": 11,
    "y": 7,
    "dir": "W",
    "range": 2,
    "period": 6,
    "on": 2,
    "afterRelic": true,
    "phase": 4
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 5,
    "dir": "W",
    "range": 2,
    "rotation": [
     "W",
     "E"
    ],
    "speed": 2
   }
  ],
  "guards": [],
  "desc": "The vent is a way in, not a way out. Set the relay and secure the card before stealing the archive. Shutters close in 21 turns.",
  "hint": "An unprepared theft strands you downstairs. Plan the east staircase first.",
  "ventsWithRelic": false,
  "lockdown": 21,
  "descEn": "The vent is a way in, not a way out. Set the relay and secure the card before stealing the archive. Shutters close in 21 turns.",
  "hintEn": "An unprepared theft strands you downstairs. Plan the east staircase first."
 },
 {
  "id": "drill-pulse",
  "name": "Read the Pulse",
  "nameEn": "Read the Pulse",
  "tag": "SECURITY DRILL",
  "map": [
   "###########",
   "#S.......E#",
   "##.#####.##",
   "#.........#",
   "##.#####.##",
   "#....T....#",
   "###########"
  ],
  "par": 23,
  "emps": 0,
  "maxAlarms": 1,
  "lasers": [
   {
    "x": 9,
    "y": 5,
    "dir": "W",
    "range": 4,
    "period": 6,
    "on": 2,
    "phase": 2
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "Study a laser cycle. Wait in safety, cross on the right turn, and take the trophy upstairs.",
  "descEn": "Study a laser cycle. Wait in safety, cross on the right turn, and take the trophy upstairs.",
  "hint": "Use INSPECT on the emitter. Lime is ON. The NEXT markers show where the laser will be after your action.",
  "hintEn": "Use INSPECT on the emitter. Lime is ON. The NEXT markers show where the laser will be after your action."
 },
 {
  "id": "drill-light",
  "name": "A Blind Spot",
  "nameEn": "A Blind Spot",
  "tag": "SECURITY DRILL",
  "map": [
   "###########",
   "#Sl......E#",
   "##.#####.##",
   "#.........#",
   "###.###.###",
   "#....T....#",
   "###########"
  ],
  "par": 27,
  "emps": 0,
  "maxAlarms": 1,
  "lasers": [],
  "cameras": [
   {
    "x": 9,
    "y": 3,
    "dir": "W",
    "range": 7
   }
  ],
  "guards": [],
  "desc": "A fixed camera owns the corridor. Switch off the lights before descending.",
  "descEn": "A fixed camera owns the corridor. Switch off the lights before descending.",
  "hint": "Press L beside the switch on the top floor. Darkness makes optical range one cell, but does not remove the camera body.",
  "hintEn": "Press L beside the switch on the top floor. Darkness makes optical range one cell, but does not remove the camera body.",
  "lighting": {
   "initialOn": true
  }
 },
 {
  "id": "drill-weight",
  "name": "Leave Some Weight",
  "nameEn": "Leave Some Weight",
  "tag": "SECURITY DRILL",
  "map": [
   "###########",
   "#S.......E#",
   "##.########",
   "#.........#",
   "##.###.####",
   "#..C.p.GT.#",
   "###########"
  ],
  "par": 42,
  "emps": 0,
  "maxAlarms": 1,
  "lasers": [],
  "cameras": [],
  "guards": [],
  "desc": "Push the crate onto P1. Leave it holding the gate while you steal the trophy.",
  "descEn": "Push the crate onto P1. Leave it holding the gate while you steal the trophy.",
  "hint": "Push from the left. Stop when the crate reaches P1. Use the middle floor to climb down on the far side of the crate.",
  "hintEn": "Push from the left. Stop when the crate reaches P1. Use the middle floor to climb down on the far side of the crate."
 },
 {
  "id": "drill-walker",
  "name": "The Night Watchman",
  "nameEn": "The Night Watchman",
  "tag": "SECURITY DRILL",
  "map": [
   "###########",
   "#S..#....E#",
   "##.#####.##",
   "#.........#",
   "#####.#####",
   "#.T.......#",
   "###########"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 33,
  "lasers": [],
  "cameras": [],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      2,
      3
     ],
     [
      3,
      3
     ],
     [
      4,
      3
     ],
     [
      5,
      3
     ],
     [
      6,
      3
     ],
     [
      7,
      3
     ],
     [
      8,
      3
     ],
     [
      7,
      3
     ],
     [
      6,
      3
     ],
     [
      5,
      3
     ],
     [
      4,
      3
     ],
     [
      3,
      3
     ]
    ],
    "range": 3,
    "phase": 11
   }
  ],
  "desc": "A guard walks the middle floor. He sees three cells ahead and nothing behind. Take the trophy downstairs without entering his view.",
  "hint": "Wait on a ladder hatch while he walks away, then follow his back. He turns at each end of his route. A hatch hides you while he walks overhead.",
  "descEn": "A guard walks the middle floor. He sees three cells ahead and nothing behind. Take the trophy downstairs without entering his view.",
  "hintEn": "Wait on a ladder hatch while he walks away, then follow his back. He turns at each end of his route. A hatch hides you while he walks overhead."
 },
 {
  "id": "last-cutaway",
  "name": "The Common House",
  "nameEn": "The Common House",
  "tag": "SHARED / LAST HEIST",
  "map": [
   "#############",
   "#...T.......#",
   "##.######.###",
   "#......o....#",
   "####.#####.##",
   "#...........#",
   "##.#####.####",
   "#S....o....E#",
   "#############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 35,
  "lasers": [
   {
    "x": 1,
    "y": 5,
    "dir": "E",
    "range": 2,
    "period": 6,
    "on": 2,
    "phase": 0
   }
  ],
  "cameras": [
   {
    "x": 11,
    "y": 3,
    "dir": "W",
    "range": 2,
    "rotation": [
     "W",
     "E"
    ],
    "speed": 2
   }
  ],
  "guards": [],
  "desc": "Clear this revision. Add ONE obstacle. Prove it can still be beaten. Hold until time expires.",
  "hint": "Ladders and their landings are protected. A new obstacle must invalidate the last winning route.",
  "descEn": "Clear this revision. Add ONE obstacle. Prove it can still be beaten. Hold until time expires.",
  "hintEn": "Ladders and their landings are protected. A new obstacle must invalidate the last winning route."
 }
];if(typeof module==='object'&&module.exports)module.exports=levels;else r.HEIST_CUTAWAY_LEVELS=levels;})(globalThis);
