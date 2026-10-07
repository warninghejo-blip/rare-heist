/* Daily Heist plans: one hard level per day for everyone (entry costs RF; the winner is the cleanest run with the fewest
   turns). Not part of the campaign or Solo Vaults. Pure engine data, cutaway convention, solvable clean without EMP.
   best = exact minimum turns (breadth-first search, tests/levels-review.cjs); par = round(1.15 x best);
   routes = distinct clean routes (order of pickups and set of ladders/vents) that finish within best + 10%.
   concept = the idea of the level, for designers; it is not shown as a hint. */
(function(r){const levels=[
 {
  "id": "daily-01",
  "name": "Hatch Dance",
  "nameEn": "Hatch Dance",
  "tag": "DAILY / CHOREOGRAPHY",
  "concept": "Two watchmen sweep two stacked galleries in counter-step. Every hatch between the galleries is a place to duck. The trophy and card A wait in separate rooms below, so the galleries are crossed four times.",
  "map": [
   "###############",
   "#S.....#..A..E#",
   "##.#####.######",
   "#.............#",
   "####.#.#.#.####",
   "#.............#",
   "##.#########.##",
   "#..T...#..a...#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 67,
  "best": 58,
  "routes": 7,
  "headline": [
   "guards",
   "key-a"
  ],
  "lasers": [],
  "cameras": [],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
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
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
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
     ],
     [
      2,
      3
     ]
    ]
   },
   {
    "kind": "walker",
    "path": [
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
     ],
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
     ]
    ],
    "phase": 5
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: two watchmen. Keycards: A.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: two watchmen. Keycards: A.",
  "hintEn": ""
 },
 {
  "id": "daily-02",
  "name": "Pulse Wall",
  "nameEn": "Pulse Wall",
  "tag": "DAILY / LASER RHYTHM",
  "concept": "Four beams, four tempos, three of them fired from the east wall and one guarding the exit corridor. Each floor has its own beat; the ladders you choose decide whether the beats line up or make you wait.",
  "map": [
   "###############",
   "#S.......#...E#",
   "##.###.#.###.##",
   "#...#..#......#",
   "#.#.####.###.##",
   "#......#......#",
   "##.###.###.#.##",
   "#...#.........#",
   "#.#.#.#.#######",
   "#....T........#",
   "###.#####.#.#.#",
   "#....#........#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 66,
  "best": 57,
  "routes": 111,
  "headline": [
   "lasers"
  ],
  "lasers": [
   {
    "x": 10,
    "y": 1,
    "dir": "E",
    "range": 4,
    "period": 6,
    "on": 3,
    "phase": 1
   },
   {
    "x": 13,
    "y": 5,
    "dir": "W",
    "range": 8,
    "period": 6,
    "on": 3,
    "phase": 4
   },
   {
    "x": 13,
    "y": 7,
    "dir": "W",
    "range": 11,
    "period": 4,
    "on": 1,
    "phase": 1
   },
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 6,
    "period": 5,
    "on": 2,
    "phase": 3
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "Take the trophy and get out unseen. On site: 4 lasers.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: 4 lasers.",
  "hintEn": ""
 },
 {
  "id": "daily-03",
  "name": "Long Way to A",
  "nameEn": "Long Way to A",
  "tag": "DAILY / KEYCARD",
  "concept": "Door A seals the trophy on the ground floor; card A lies at the dead end of a watchman corridor near the top, one floor below a blinking lens. Fetch the card on the way down and the whole house is crossed only once in each direction.",
  "map": [
   "###############",
   "#S......#....E#",
   "##.###.##.#####",
   "#.............#",
   "###.######.#.##",
   "#....#.......a#",
   "####.#.###.#.##",
   "#........#....#",
   "#.##.#####.####",
   "#.............#",
   "####.##.#######",
   "#........AT...#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 81,
  "best": 70,
  "routes": 61,
  "headline": [
   "key-a",
   "guards"
  ],
  "lasers": [],
  "cameras": [
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 12,
    "rotation": [
     "W",
     "S"
    ],
    "speed": 3,
    "phase": 0
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
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
      13,
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
      7,
      5
     ]
    ],
    "phase": 0
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, one camera. Keycards: A.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, one camera. Keycards: A.",
  "hintEn": ""
 },
 {
  "id": "daily-04",
  "name": "Six Floors Down",
  "nameEn": "Six Floors Down",
  "tag": "DAILY / BLACKOUT",
  "concept": "Six floors, three watchmen and a lens, in a building lit four turns in every ten. The way down runs through every patrol, and each crossing belongs to a different blackout.",
  "map": [
   "###############",
   "#S......#....E#",
   "##.##.#.###.###",
   "#.....#..#....#",
   "##.#.###.###.##",
   "#.............#",
   "#.##.####.##.##",
   "#.........#...#",
   "##.####.#######",
   "#.......#.....#",
   "####.######.###",
   "#..........T..#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 79,
  "best": 69,
  "routes": 169,
  "headline": [
   "light-cycle",
   "guards"
  ],
  "lighting": {
   "initialOn": true,
   "period": 10,
   "on": 4,
   "phase": 9
  },
  "lasers": [],
  "cameras": [
   {
    "x": 1,
    "y": 9,
    "dir": "E",
    "range": 11,
    "rotation": [
     "E",
     "S",
     "S"
    ],
    "speed": 3,
    "phase": 0
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      2,
      9
     ],
     [
      3,
      9
     ],
     [
      4,
      9
     ],
     [
      5,
      9
     ],
     [
      6,
      9
     ],
     [
      7,
      9
     ],
     [
      6,
      9
     ],
     [
      5,
      9
     ],
     [
      4,
      9
     ],
     [
      3,
      9
     ]
    ],
    "phase": 9
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      7
     ],
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
     ],
     [
      2,
      7
     ]
    ],
    "phase": 1
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
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
      4,
      3
     ],
     [
      4,
      3
     ],
     [
      3,
      3
     ],
     [
      2,
      3
     ],
     [
      1,
      3
     ],
     [
      1,
      3
     ]
    ],
    "phase": 5
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: three watchmen, one camera. Lights run on a 10-turn cycle, 4 on.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: three watchmen, one camera. Lights run on a 10-turn cycle, 4 on.",
  "hintEn": ""
 },
 {
  "id": "daily-05",
  "name": "Dead Weight",
  "nameEn": "Dead Weight",
  "tag": "DAILY / PRESSURE",
  "concept": "The grid by the exit opens only while its plate is held, and the plate is at the far end of the corridor the watchman walks. Push the crate the whole way: it is the load for the plate and the only thing he cannot see through.",
  "map": [
   "###############",
   "#S...#.....G.E#",
   "##.###.########",
   "#..C........p.#",
   "####.#####.####",
   "#.............#",
   "##.########.###",
   "#..T..........#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 68,
  "best": 59,
  "routes": 2,
  "headline": [
   "crates",
   "guards"
  ],
  "lasers": [],
  "cameras": [],
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
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
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
    ]
   },
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
    "phase": 6
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: two watchmen. Crates and pressure plates.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: two watchmen. Crates and pressure plates.",
  "hintEn": ""
 },
 {
  "id": "daily-06",
  "name": "Breaker Run",
  "nameEn": "Breaker Run",
  "tag": "DAILY / DRONES + WALKER",
  "concept": "Three drones and a laser hang on one circuit, the breaker is in the bottom far corner and the trophy in the opposite one. Cutting the power costs a long walk; the watchman on the east side does not care about circuits.",
  "map": [
   "###############",
   "#S.......#...E#",
   "##.##.#####.###",
   "#.......#.....#",
   "###.#######.###",
   "#.............#",
   "##.######.#####",
   "#.......#.....#",
   "###.#.#.####.##",
   "#T........#...#",
   "##.###.##.#.###",
   "#............1#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 79,
  "best": 69,
  "routes": 191,
  "headline": [
   "switch-1",
   "circuit",
   "guards"
  ],
  "lasers": [
   {
    "x": 13,
    "y": 5,
    "dir": "W",
    "range": 12,
    "period": 8,
    "on": 2,
    "phase": 4,
    "circuit": 0
   }
  ],
  "cameras": [],
  "guards": [
   {
    "path": [
     [
      1,
      7
     ],
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
     ],
     [
      2,
      7
     ]
    ],
    "range": 2,
    "phase": 7,
    "circuit": 0
   },
   {
    "path": [
     [
      2,
      9
     ],
     [
      3,
      9
     ],
     [
      4,
      9
     ],
     [
      5,
      9
     ],
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
     ],
     [
      6,
      9
     ],
     [
      5,
      9
     ],
     [
      4,
      9
     ],
     [
      3,
      9
     ],
     [
      2,
      9
     ]
    ],
    "range": 2,
    "phase": 15,
    "circuit": 0
   },
   {
    "path": [
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
      3
     ],
     [
      10,
      3
     ]
    ],
    "range": 3,
    "phase": 4,
    "circuit": 0
   },
   {
    "kind": "walker",
    "path": [
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
      13,
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
     ]
    ],
    "phase": 7
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, three drones, one laser. Breakers: one.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, three drones, one laser. Breakers: one.",
  "hintEn": ""
 },
 {
  "id": "daily-07",
  "name": "Back Way In",
  "nameEn": "Back Way In",
  "tag": "DAILY / VENT + INTEL",
  "concept": "A vent drops from the middle floor straight to the ground floor, past a lens and a watchman. The intel folder lies on the watchman corridor, on the fast line for anyone who reads his walk.",
  "map": [
   "###############",
   "#S........#..E#",
   "#########.##.##",
   "#..........o..#",
   "##.#########.##",
   "#v......#.....#",
   "#.####.######.#",
   "#........#...T#",
   "####.#.###.#.##",
   "#....v........#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 75,
  "best": 65,
  "routes": 12,
  "headline": [
   "vents"
  ],
  "lasers": [],
  "cameras": [
   {
    "x": 9,
    "y": 5,
    "dir": "E",
    "range": 8,
    "rotation": [
     "E"
    ],
    "speed": 2,
    "phase": 0
   }
  ],
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
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
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
    "phase": 1
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, one camera. A vent. Intel: 1 folder.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, one camera. A vent. Intel: 1 folder.",
  "hintEn": ""
 },
 {
  "id": "daily-08",
  "name": "Two Breakers",
  "nameEn": "Two Breakers",
  "tag": "DAILY / CIRCUITS",
  "concept": "Breaker 1 opens the vault door and silences the beam on its own floor. Breaker 2 sits beside the vault and cuts the beam that sweeps the top corridor to the exit. Both are on the way, in an order that matters.",
  "map": [
   "###############",
   "#S...#.......E#",
   "####.##.#######",
   "#....1........#",
   "###.##.#.#.####",
   "#......#......#",
   "#.########.##.#",
   "#....2#TD.....#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 69,
  "best": 60,
  "routes": 108,
  "headline": [
   "switch-1",
   "switch-2"
  ],
  "lasers": [
   {
    "x": 6,
    "y": 1,
    "dir": "E",
    "range": 11,
    "period": 8,
    "on": 2,
    "phase": 2,
    "circuit": 1
   },
   {
    "x": 1,
    "y": 3,
    "dir": "E",
    "range": 10,
    "period": 6,
    "on": 1,
    "phase": 3,
    "circuit": 0
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "Take the trophy and get out unseen. On site: 2 lasers. Breakers: two.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: 2 lasers. Breakers: two.",
  "hintEn": ""
 },
 {
  "id": "daily-09",
  "name": "Pull the Plug",
  "nameEn": "Pull the Plug",
  "tag": "DAILY / LIGHT SWITCH",
  "concept": "The light switch is on the trophy floor, three watchmen and a lens stand between it and you, and in the dark every eye sees one step, which turns the climb back into a walk. Reach the switch lit, leave it dark.",
  "map": [
   "###############",
   "#S.......#...E#",
   "##.#.###.#.####",
   "#.....#.......#",
   "##.##.###.###.#",
   "#.......#.....#",
   "##.####.####.##",
   "#...#.........#",
   "#.#######.#.###",
   "#T........l...#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 78,
  "best": 68,
  "routes": 52,
  "headline": [
   "light-switch",
   "guards"
  ],
  "lighting": {
   "initialOn": true
  },
  "lasers": [
   {
    "x": 13,
    "y": 9,
    "dir": "W",
    "range": 6,
    "period": 6,
    "on": 1,
    "phase": 1
   }
  ],
  "cameras": [
   {
    "x": 7,
    "y": 3,
    "dir": "E",
    "range": 7,
    "rotation": [
     "E"
    ],
    "speed": 2,
    "phase": 0
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      9
     ],
     [
      2,
      9
     ],
     [
      3,
      9
     ],
     [
      4,
      9
     ],
     [
      5,
      9
     ],
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
      12,
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
     ],
     [
      6,
      9
     ],
     [
      5,
      9
     ],
     [
      4,
      9
     ],
     [
      3,
      9
     ],
     [
      2,
      9
     ]
    ],
    "phase": 4
   },
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
      7,
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
     ],
     [
      1,
      5
     ],
     [
      1,
      5
     ]
    ],
    "phase": 15
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
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
      4,
      3
     ],
     [
      3,
      3
     ],
     [
      2,
      3
     ]
    ],
    "phase": 1
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: three watchmen, one laser, one camera. A light switch.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: three watchmen, one laser, one camera. A light switch.",
  "hintEn": ""
 },
 {
  "id": "daily-10",
  "name": "Night Rounds",
  "nameEn": "Night Rounds",
  "tag": "DAILY / CHOREOGRAPHY",
  "concept": "Three watchmen walk three long corridors at three different lengths of beat. Door A guards the exit, card A lies one floor below the busiest corridor. Every crossing is a gap you have to see coming.",
  "map": [
   "###############",
   "#S........#.AE#",
   "##.#.####.#.###",
   "#.............#",
   "########.####.#",
   "#.........#...#",
   "###.#.#.#####.#",
   "#.a...#.......#",
   "#.#.#####.###.#",
   "#.....#...#...#",
   "##.##.#.####.##",
   "#........T....#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 71,
  "best": 62,
  "routes": 68,
  "headline": [
   "guards",
   "key-a"
  ],
  "lasers": [],
  "cameras": [],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
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
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
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
     ],
     [
      2,
      3
     ]
    ],
    "phase": 5
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      9
     ],
     [
      2,
      9
     ],
     [
      3,
      9
     ],
     [
      4,
      9
     ],
     [
      5,
      9
     ],
     [
      4,
      9
     ],
     [
      3,
      9
     ],
     [
      2,
      9
     ]
    ],
    "phase": 7
   },
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
    "phase": 4
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: three watchmen. Keycards: A.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: three watchmen. Keycards: A.",
  "hintEn": ""
 },
 {
  "id": "daily-11",
  "name": "Metronome",
  "nameEn": "Metronome",
  "tag": "DAILY / LASER RHYTHM",
  "concept": "Every floor beats at its own tempo. The beams cover each floor end to end; the hatches are the rests. Pick the ladders whose rests line up with the beat.",
  "map": [
   "###############",
   "#S.....#.....E#",
   "##.#########.##",
   "#.............#",
   "#####.#.#.#####",
   "#.............#",
   "##.#.#####.#.##",
   "#.....T.......#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 64,
  "best": 56,
  "routes": 6,
  "headline": [
   "lasers"
  ],
  "lasers": [
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 12,
    "period": 6,
    "on": 2,
    "phase": 0
   },
   {
    "x": 1,
    "y": 5,
    "dir": "E",
    "range": 12,
    "period": 5,
    "on": 2,
    "phase": 1
   },
   {
    "x": 1,
    "y": 7,
    "dir": "E",
    "range": 4,
    "period": 4,
    "on": 2,
    "phase": 0
   },
   {
    "x": 13,
    "y": 7,
    "dir": "W",
    "range": 6,
    "period": 6,
    "on": 3,
    "phase": 2
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "Take the trophy and get out unseen. On site: 4 lasers.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: 4 lasers.",
  "hintEn": ""
 },
 {
  "id": "daily-12",
  "name": "Silent Alarm",
  "nameEn": "Silent Alarm",
  "tag": "DAILY / LOCKDOWN",
  "concept": "Lifting the trophy starts the clock and wakes a second watchman on the escape floor. The exit card waits in the opposite corner, so the card comes first and the theft is timed to his walk.",
  "map": [
   "###############",
   "#S....#...A..E#",
   "##.####.#######",
   "#....#........#",
   "###.###.###.###",
   "#.............#",
   "##.#######.####",
   "#.....#.......#",
   "####.####.##.##",
   "#.T.........a.#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 56,
  "best": 49,
  "routes": 2,
  "headline": [
   "lockdown",
   "after-relic",
   "key-a",
   "guards"
  ],
  "lockdown": 33,
  "lasers": [],
  "cameras": [],
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
    ]
   },
   {
    "kind": "walker",
    "path": [
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
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
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
     ]
    ],
    "phase": 3,
    "afterRelic": true
   },
   {
    "kind": "walker",
    "path": [
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
      13,
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
     ]
    ],
    "phase": 2
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: three watchmen. Keycards: A. Lockdown 33 turns after the theft. Some security wakes up after the theft.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: three watchmen. Keycards: A. Lockdown 33 turns after the theft. Some security wakes up after the theft.",
  "hintEn": ""
 },
 {
  "id": "daily-13",
  "name": "Lens in the Dark",
  "nameEn": "Lens in the Dark",
  "tag": "DAILY / BLACKOUT",
  "concept": "A fixed lens watches the whole upper corridor and goes almost blind every time the lights drop. Cross under it in the dark; the trophy floor below has its own watchman and its own rhythm.",
  "map": [
   "###############",
   "#S..#........E#",
   "###.#.#.####.##",
   "#........#....#",
   "##.#.##.####.##",
   "#.....#...#...#",
   "##.#.###.##.###",
   "#.............#",
   "##.##.#.#####.#",
   "#.....#....T..#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 59,
  "best": 51,
  "routes": 83,
  "headline": [
   "light-cycle",
   "guards"
  ],
  "lighting": {
   "initialOn": true,
   "period": 8,
   "on": 4,
   "phase": 1
  },
  "lasers": [],
  "cameras": [
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 12,
    "rotation": [
     "W"
    ],
    "speed": 3,
    "phase": 0
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
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
      12,
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
     ]
    ],
    "phase": 9
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
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
     ],
     [
      2,
      3
     ]
    ],
    "phase": 0
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: two watchmen, one camera. Lights run on a 8-turn cycle, 4 on.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: two watchmen, one camera. Lights run on a 8-turn cycle, 4 on.",
  "hintEn": ""
 },
 {
  "id": "daily-14",
  "name": "Exit Pass",
  "nameEn": "Exit Pass",
  "tag": "DAILY / KEYCARD",
  "concept": "Door B stands in front of the exit and card B lies in the far bottom corner, below the trophy floor and its watchman. A lens guards the long walk to the card.",
  "map": [
   "###############",
   "#S........#.BE#",
   "#######.#.#.###",
   "#....#........#",
   "##.#####.######",
   "#.........#...#",
   "#.##.####.#.###",
   "#..........T..#",
   "#.#######.#####",
   "#.b...........#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 74,
  "best": 64,
  "routes": 122,
  "headline": [
   "key-b",
   "guards"
  ],
  "lasers": [],
  "cameras": [
   {
    "x": 13,
    "y": 9,
    "dir": "W",
    "range": 7,
    "rotation": [
     "W",
     "W",
     "N"
    ],
    "speed": 2,
    "phase": 1
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      7
     ],
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
      11,
      7
     ],
     [
      12,
      7
     ],
     [
      13,
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
     ],
     [
      4,
      7
     ],
     [
      3,
      7
     ],
     [
      2,
      7
     ]
    ],
    "phase": 13
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, one camera. Keycards: B.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, one camera. Keycards: B.",
  "hintEn": ""
 },
 {
  "id": "daily-15",
  "name": "Heavy Return",
  "nameEn": "Heavy Return",
  "tag": "DAILY / VENT + INTEL",
  "concept": "The vent is the quick way down, but the trophy does not fit through it. Three intel folders, only one of them on the fast line. Going down is a shortcut; coming back is a climb past two beams and a watchman.",
  "map": [
   "###############",
   "#S...#.......E#",
   "####.#.########",
   "#.....o.#.....#",
   "##.#.#####.##.#",
   "#.............#",
   "####.####.#####",
   "#.o..#.v.o....#",
   "##.######.##.##",
   "#..v.......T..#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 75,
  "best": 65,
  "routes": 1637,
  "headline": [
   "vents"
  ],
  "ventsWithRelic": false,
  "lasers": [
   {
    "x": 1,
    "y": 5,
    "dir": "E",
    "range": 9,
    "period": 6,
    "on": 2,
    "phase": 4
   },
   {
    "x": 9,
    "y": 3,
    "dir": "E",
    "range": 5,
    "period": 5,
    "on": 2,
    "phase": 2
   }
  ],
  "cameras": [],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      9
     ],
     [
      2,
      9
     ],
     [
      3,
      9
     ],
     [
      4,
      9
     ],
     [
      5,
      9
     ],
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
      12,
      9
     ],
     [
      13,
      9
     ],
     [
      12,
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
     ],
     [
      6,
      9
     ],
     [
      5,
      9
     ],
     [
      4,
      9
     ],
     [
      3,
      9
     ],
     [
      2,
      9
     ]
    ],
    "phase": 19
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, 2 lasers. A vent, too narrow for the trophy. Intel: 3 folders.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, 2 lasers. A vent, too narrow for the trophy. Intel: 3 folders.",
  "hintEn": ""
 },
 {
  "id": "daily-16",
  "name": "Kill Switch",
  "nameEn": "Kill Switch",
  "tag": "DAILY / DRONES + WALKER",
  "concept": "Two drones and a beam run on one circuit; the breaker sits mid-building behind them. The watchman near the top walks on, power or not.",
  "map": [
   "###############",
   "#S......#....E#",
   "###.#####.##.##",
   "#.........#...#",
   "###.#####.#.###",
   "#.....#......1#",
   "#.###.###.###.#",
   "#.............#",
   "##.#####.####.#",
   "#T....#.......#",
   "####.##.###.###",
   "#....#..#.....#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 69,
  "best": 60,
  "routes": 32,
  "headline": [
   "switch-1",
   "circuit",
   "guards"
  ],
  "lasers": [
   {
    "x": 5,
    "y": 9,
    "dir": "W",
    "range": 9,
    "period": 5,
    "on": 3,
    "phase": 3,
    "circuit": 0
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
    "range": 2,
    "phase": 5,
    "circuit": 0
   },
   {
    "path": [
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
      12,
      9
     ],
     [
      13,
      9
     ],
     [
      13,
      9
     ],
     [
      13,
      9
     ],
     [
      12,
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
     ],
     [
      7,
      9
     ]
    ],
    "range": 2,
    "phase": 12,
    "circuit": 0
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
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
     ],
     [
      2,
      3
     ]
    ],
    "phase": 12
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, two drones, one laser. Breakers: one.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, two drones, one laser. Breakers: one.",
  "hintEn": ""
 },
 {
  "id": "daily-17",
  "name": "Shield Crate",
  "nameEn": "Shield Crate",
  "tag": "DAILY / PRESSURE",
  "concept": "The grid in front of the trophy opens only while a plate on the top corridor is loaded, and a watchman walks that corridor end to end. The crate you push onto the plate is also your only shield from his eyes.",
  "map": [
   "###############",
   "#S...#.......E#",
   "##.######.#.###",
   "#.....C.....p.#",
   "###.#.#####.###",
   "#......#......#",
   "##.#.#######.##",
   "#........#....#",
   "##.#####.##.###",
   "#....#TG..#...#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 79,
  "best": 69,
  "routes": 28,
  "headline": [
   "crates",
   "guards"
  ],
  "lasers": [],
  "cameras": [
   {
    "x": 10,
    "y": 7,
    "dir": "E",
    "range": 4,
    "rotation": [
     "E",
     "N",
     "N"
    ],
    "speed": 2,
    "phase": 1
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
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
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
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
     ],
     [
      2,
      3
     ]
    ],
    "phase": 10
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, one camera. Crates and pressure plates.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, one camera. Crates and pressure plates.",
  "hintEn": ""
 },
 {
  "id": "daily-18",
  "name": "Dark Room",
  "nameEn": "Dark Room",
  "tag": "DAILY / LIGHT SWITCH",
  "concept": "Two watchmen guard the trophy rooms and a lens sweeps the corridor above. The light switch is one floor up, out of the way. Darkness makes every eye see one step, but the walk to the switch is not free.",
  "map": [
   "###############",
   "#S......#....E#",
   "#####.######.##",
   "#.............#",
   "##.####.##.####",
   "#.....#..#.l..#",
   "#.##.###.####.#",
   "#...T..#......#",
   "###.#####.###.#",
   "#.........#...#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 72,
  "best": 63,
  "routes": 6,
  "headline": [
   "light-switch",
   "guards"
  ],
  "lighting": {
   "initialOn": true
  },
  "lasers": [
   {
    "x": 1,
    "y": 9,
    "dir": "E",
    "range": 11,
    "period": 8,
    "on": 3,
    "phase": 5
   }
  ],
  "cameras": [
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 11,
    "rotation": [
     "W",
     "S",
     "S"
    ],
    "speed": 2,
    "phase": 1
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      7
     ],
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
     ],
     [
      2,
      7
     ]
    ],
    "phase": 2
   },
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
      4,
      5
     ],
     [
      3,
      5
     ]
    ],
    "phase": 2
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: two watchmen, one laser, one camera. A light switch.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: two watchmen, one laser, one camera. A light switch.",
  "hintEn": ""
 },
 {
  "id": "daily-19",
  "name": "Tripwire Stack",
  "nameEn": "Tripwire Stack",
  "tag": "DAILY / LASER RHYTHM",
  "concept": "Three beams on three floors, one of them fired from the middle of a room. The shortest climb crosses all three; the quiet ladders cost steps. Find the order of floors that never waits.",
  "map": [
   "###############",
   "#S.....#.....E#",
   "#####.##.######",
   "#.............#",
   "#.##.##.#####.#",
   "#....#........#",
   "##.#######.#.##",
   "#......#......#",
   "####.###.######",
   "#....#..T.....#",
   "###.##.##.###.#",
   "#.............#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 69,
  "best": 60,
  "routes": 10,
  "headline": [
   "lasers"
  ],
  "lasers": [
   {
    "x": 13,
    "y": 7,
    "dir": "W",
    "range": 6,
    "period": 5,
    "on": 3,
    "phase": 3
   },
   {
    "x": 1,
    "y": 11,
    "dir": "E",
    "range": 7,
    "period": 6,
    "on": 1,
    "phase": 4
   },
   {
    "x": 6,
    "y": 5,
    "dir": "E",
    "range": 10,
    "period": 4,
    "on": 1,
    "phase": 2
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "Take the trophy and get out unseen. On site: 3 lasers.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: 3 lasers.",
  "hintEn": ""
 },
 {
  "id": "daily-20",
  "name": "Relic Door",
  "nameEn": "Relic Door",
  "tag": "DAILY / CIRCUITS + LOCKDOWN",
  "concept": "The exit door opens only for someone holding the trophy while breaker 1 is on, and breaker 1 is on the ground floor. Breaker 2 by the exit blinds the lens at the vault. Nineteen turns of lockdown after the theft.",
  "map": [
   "###############",
   "#S..#.....2.RE#",
   "###.#######.###",
   "#.............#",
   "#.###.#.##.####",
   "#...#.........#",
   "###.#.##.##.###",
   "#.....#.......#",
   "###.#.####.#.##",
   "#..TD.#..#....#",
   "########.##.#.#",
   "#...........1.#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 87,
  "best": 76,
  "routes": 621,
  "headline": [
   "switch-1",
   "switch-2",
   "lockdown"
  ],
  "lockdown": 19,
  "lasers": [],
  "cameras": [
   {
    "x": 1,
    "y": 9,
    "dir": "E",
    "range": 4,
    "rotation": [
     "E"
    ],
    "speed": 2,
    "phase": 0,
    "circuit": 1
   },
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 8,
    "rotation": [
     "W",
     "W",
     "N"
    ],
    "speed": 2,
    "phase": 0,
    "circuit": 0
   }
  ],
  "guards": [],
  "desc": "Take the trophy and get out unseen. On site: 2 cameras. Breakers: two. Lockdown 19 turns after the theft.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: 2 cameras. Breakers: two. Lockdown 19 turns after the theft.",
  "hintEn": ""
 },
 {
  "id": "daily-21",
  "name": "Card Under Patrol",
  "nameEn": "Card Under Patrol",
  "tag": "DAILY / CHOREOGRAPHY",
  "concept": "Two watchmen share the trophy corridor, and card A for the exit door lies right on their beat. Take the card in one gap, the trophy in another.",
  "map": [
   "###############",
   "#S..#......A.E#",
   "###.####.######",
   "#.............#",
   "##.####.##.#.##",
   "#........#....#",
   "#.####.#####.##",
   "#...a........T#",
   "#######.###.###",
   "#.......#.....#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 64,
  "best": 56,
  "routes": 24,
  "headline": [
   "guards",
   "key-a"
  ],
  "lasers": [],
  "cameras": [],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      7
     ],
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
      11,
      7
     ],
     [
      12,
      7
     ],
     [
      13,
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
     ],
     [
      4,
      7
     ],
     [
      3,
      7
     ],
     [
      2,
      7
     ]
    ],
    "phase": 9
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      7
     ],
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
      11,
      7
     ],
     [
      12,
      7
     ],
     [
      13,
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
     ],
     [
      4,
      7
     ],
     [
      3,
      7
     ],
     [
      2,
      7
     ]
    ],
    "phase": 5
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: two watchmen. Keycards: A.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: two watchmen. Keycards: A.",
  "hintEn": ""
 },
 {
  "id": "daily-22",
  "name": "Laundry Chute",
  "nameEn": "Laundry Chute",
  "tag": "DAILY / VENT + INTEL",
  "concept": "A vent from the top floor lands on the middle floor, past the first watchman, but the trophy will not fit back through it. Three intel folders lie on the patrols: grab them only if you want the plans more than the time.",
  "map": [
   "###############",
   "#S.....v#....E#",
   "##.#######.#.##",
   "#.o...........#",
   "######.#####.##",
   "#.......o.#v..#",
   "#.#####.#.##.##",
   "#..T........o.#",
   "#.####.##.#.###",
   "#...#.....#...#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 61,
  "best": 53,
  "routes": 22,
  "headline": [
   "vents"
  ],
  "ventsWithRelic": false,
  "lasers": [],
  "cameras": [
   {
    "x": 13,
    "y": 3,
    "dir": "W",
    "range": 9,
    "rotation": [
     "W",
     "W",
     "N"
    ],
    "speed": 2,
    "phase": 1
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
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
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
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
     ],
     [
      2,
      3
     ]
    ],
    "phase": 10
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      7
     ],
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
      11,
      7
     ],
     [
      12,
      7
     ],
     [
      13,
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
     ],
     [
      4,
      7
     ],
     [
      3,
      7
     ],
     [
      2,
      7
     ]
    ],
    "phase": 12
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: two watchmen, one camera. A vent, too narrow for the trophy. Intel: 3 folders.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: two watchmen, one camera. A vent, too narrow for the trophy. Intel: 3 folders.",
  "hintEn": ""
 },
 {
  "id": "daily-23",
  "name": "Power Cut",
  "nameEn": "Power Cut",
  "tag": "DAILY / DRONES + WALKER",
  "concept": "Two drones fly in step over the east corridor under the exit and a third over the ground floor. The breaker is on the west side, the trophy on the east. A watchman by the trophy ignores the power.",
  "map": [
   "###############",
   "#S......#....E#",
   "####.##.#.#.###",
   "#....#..#.....#",
   "##.#.#.###.####",
   "#1............#",
   "#.#.##.####.###",
   "#........#....#",
   "#.#.####.####.#",
   "#.....#....T..#",
   "###.###.#.##.##",
   "#.........#...#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 59,
  "best": 51,
  "routes": 138,
  "headline": [
   "switch-1",
   "circuit",
   "guards"
  ],
  "lasers": [],
  "cameras": [],
  "guards": [
   {
    "path": [
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
      3
     ],
     [
      10,
      3
     ],
     [
      9,
      3
     ]
    ],
    "range": 2,
    "phase": 4,
    "circuit": 0
   },
   {
    "path": [
     [
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
      3
     ],
     [
      10,
      3
     ],
     [
      9,
      3
     ]
    ],
    "range": 3,
    "phase": 9,
    "circuit": 0
   },
   {
    "path": [
     [
      2,
      11
     ],
     [
      3,
      11
     ],
     [
      4,
      11
     ],
     [
      5,
      11
     ],
     [
      6,
      11
     ],
     [
      7,
      11
     ],
     [
      8,
      11
     ],
     [
      9,
      11
     ],
     [
      8,
      11
     ],
     [
      7,
      11
     ],
     [
      6,
      11
     ],
     [
      5,
      11
     ],
     [
      4,
      11
     ],
     [
      3,
      11
     ]
    ],
    "range": 3,
    "phase": 5,
    "circuit": 0
   },
   {
    "kind": "walker",
    "path": [
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
      12,
      9
     ],
     [
      13,
      9
     ],
     [
      13,
      9
     ],
     [
      12,
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
     ]
    ],
    "phase": 10
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, three drones. Breakers: one.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, three drones. Breakers: one.",
  "hintEn": ""
 },
 {
  "id": "daily-24",
  "name": "Locked Vault",
  "nameEn": "Locked Vault",
  "tag": "DAILY / KEYCARD",
  "concept": "Card A is at the east end of the building, door A seals the trophy at the west end, and a lens that never blinks watches the short way between them. No patrols, just the length of the building.",
  "map": [
   "###############",
   "#S......#....E#",
   "####.##.#.#####",
   "#....#........#",
   "####.###.#.####",
   "#.............#",
   "###.######.####",
   "#......#.....a#",
   "#.#.####.######",
   "#TA...........#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 62,
  "best": 54,
  "routes": 8,
  "headline": [
   "key-a"
  ],
  "lasers": [],
  "cameras": [
   {
    "x": 6,
    "y": 7,
    "dir": "W",
    "range": 9,
    "rotation": [
     "W"
    ],
    "speed": 2,
    "phase": 0
   }
  ],
  "guards": [],
  "desc": "Take the trophy and get out unseen. On site: one camera. Keycards: A.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one camera. Keycards: A.",
  "hintEn": ""
 },
 {
  "id": "daily-25",
  "name": "Two Plates",
  "nameEn": "Two Plates",
  "tag": "DAILY / PRESSURE",
  "concept": "Grid 2 seals the trophy and grid 1 the exit, each with its own plate and crate. A watchman walks the top corridor and a lens covers the middle floor.",
  "map": [
   "###############",
   "#S.....#....GE#",
   "##.#####.##.###",
   "#.............#",
   "#####.#.####.##",
   "#.......#.....#",
   "####.#######.##",
   "#.C.....P..HT.#",
   "#.#####.##.#.##",
   "#...#....p.C..#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 59,
  "best": 51,
  "routes": 15,
  "headline": [
   "crates",
   "guards"
  ],
  "lasers": [],
  "cameras": [
   {
    "x": 9,
    "y": 5,
    "dir": "E",
    "range": 12,
    "rotation": [
     "E",
     "E",
     "N"
    ],
    "speed": 2,
    "phase": 2
   }
  ],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
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
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
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
     ],
     [
      2,
      3
     ]
    ],
    "phase": 16
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, one camera. Crates and pressure plates.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, one camera. Crates and pressure plates.",
  "hintEn": ""
 },
 {
  "id": "daily-26",
  "name": "Dark Stairs",
  "nameEn": "Dark Stairs",
  "tag": "DAILY / LIGHT SWITCH",
  "concept": "Two watchmen in step on the top corridor, another on the long floor above the trophy, and a beam in between. The light switch is halfway down, a step off the obvious route.",
  "map": [
   "###############",
   "#S.......#...E#",
   "###.######.####",
   "#...#.........#",
   "##.#####.#.####",
   "#.............#",
   "##.#.##.#######",
   "#.......#...l.#",
   "####.#.####.###",
   "#.............#",
   "##.#.######.###",
   "#T............#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 68,
  "best": 59,
  "routes": 8,
  "headline": [
   "light-switch",
   "guards"
  ],
  "lighting": {
   "initialOn": true
  },
  "lasers": [
   {
    "x": 13,
    "y": 5,
    "dir": "W",
    "range": 8,
    "period": 6,
    "on": 3,
    "phase": 3
   }
  ],
  "cameras": [],
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
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
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
     ],
     [
      5,
      3
     ]
    ],
    "phase": 10
   },
   {
    "kind": "walker",
    "path": [
     [
      1,
      9
     ],
     [
      2,
      9
     ],
     [
      3,
      9
     ],
     [
      4,
      9
     ],
     [
      5,
      9
     ],
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
      12,
      9
     ],
     [
      13,
      9
     ],
     [
      12,
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
     ],
     [
      6,
      9
     ],
     [
      5,
      9
     ],
     [
      4,
      9
     ],
     [
      3,
      9
     ],
     [
      2,
      9
     ]
    ],
    "phase": 21
   },
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
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
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
    "phase": 0
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: three watchmen, one laser. A light switch.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: three watchmen, one laser. A light switch.",
  "hintEn": ""
 },
 {
  "id": "daily-27",
  "name": "Fourteen Turns",
  "nameEn": "Fourteen Turns",
  "tag": "DAILY / LOCKDOWN",
  "concept": "Fourteen turns from the theft to the exit, a beam and a watchman that wake only when the trophy moves, and card A for the exit door lying right where the sleeping watchman will walk.",
  "map": [
   "###############",
   "#S.....#....AE#",
   "##.#.###.##.###",
   "#.........#...#",
   "#####.######.##",
   "#....T........#",
   "#.#####.#.##.##",
   "#...a...#.....#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 61,
  "best": 53,
  "routes": 5,
  "headline": [
   "lockdown",
   "after-relic",
   "key-a"
  ],
  "lockdown": 14,
  "lasers": [
   {
    "x": 9,
    "y": 3,
    "dir": "W",
    "range": 11,
    "period": 6,
    "on": 4,
    "phase": 1,
    "afterRelic": true
   }
  ],
  "cameras": [],
  "guards": [
   {
    "path": [
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
      13,
      7
     ],
     [
      13,
      7
     ],
     [
      13,
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
      9,
      7
     ]
    ],
    "range": 3,
    "phase": 4
   },
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
    "phase": 7,
    "afterRelic": true
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one watchman, one drone, one laser. Keycards: A. Lockdown 14 turns after the theft. Some security wakes up after the theft.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one watchman, one drone, one laser. Keycards: A. Lockdown 14 turns after the theft. Some security wakes up after the theft.",
  "hintEn": ""
 },
 {
  "id": "daily-28",
  "name": "Blackout Ballet",
  "nameEn": "Blackout Ballet",
  "tag": "DAILY / BLACKOUT",
  "concept": "The building blinks: lights on five turns, off three. In the dark the watchmen see one step. Cross the long floors during the dark, or flip the light switch and make your own night.",
  "map": [
   "###############",
   "#S...l.#.....E#",
   "##.#####.###.##",
   "#.............#",
   "####.#####.####",
   "#.............#",
   "##.#######.####",
   "#.....T.......#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 52,
  "best": 45,
  "routes": 5,
  "headline": [
   "light-cycle",
   "guards"
  ],
  "lighting": {
   "initialOn": true,
   "period": 8,
   "on": 5,
   "phase": 0
  },
  "lasers": [],
  "cameras": [],
  "guards": [
   {
    "kind": "walker",
    "path": [
     [
      1,
      3
     ],
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
      9,
      3
     ],
     [
      10,
      3
     ],
     [
      11,
      3
     ],
     [
      12,
      3
     ],
     [
      13,
      3
     ],
     [
      12,
      3
     ],
     [
      11,
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
     ],
     [
      2,
      3
     ]
    ],
    "phase": 3
   },
   {
    "kind": "walker",
    "path": [
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
     ],
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
     ]
    ]
   },
   {
    "kind": "walker",
    "path": [
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
     ],
     [
      4,
      7
     ]
    ],
    "phase": 2
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: three watchmen. Lights run on a 8-turn cycle, 5 on. A light switch.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: three watchmen. Lights run on a 8-turn cycle, 5 on. A light switch.",
  "hintEn": ""
 },
 {
  "id": "daily-29",
  "name": "Last Beam",
  "nameEn": "Last Beam",
  "tag": "DAILY / LASER RHYTHM",
  "concept": "A beam guards the corridor to the exit and another the trophy floor, where a drone patrols right up to the trophy. The quiet ladders are on the far side; the beams decide whether they are worth it.",
  "map": [
   "###############",
   "#S......#....E#",
   "#######.####.##",
   "#.............#",
   "#.###.####.##.#",
   "#.............#",
   "#.#########.###",
   "#.........#...#",
   "#.##.####.###.#",
   "#......#T.....#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 71,
  "best": 62,
  "routes": 37,
  "headline": [
   "lasers",
   "guards"
  ],
  "lasers": [
   {
    "x": 9,
    "y": 1,
    "dir": "E",
    "range": 5,
    "period": 6,
    "on": 2,
    "phase": 1
   },
   {
    "x": 6,
    "y": 9,
    "dir": "W",
    "range": 4,
    "period": 5,
    "on": 3,
    "phase": 2
   }
  ],
  "cameras": [],
  "guards": [
   {
    "path": [
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
      12,
      9
     ],
     [
      13,
      9
     ],
     [
      12,
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
     ]
    ],
    "range": 3,
    "phase": 3
   }
  ],
  "desc": "Take the trophy and get out unseen. On site: one drone, 2 lasers.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: one drone, 2 lasers.",
  "hintEn": ""
 },
 {
  "id": "daily-30",
  "name": "Fuse Box",
  "nameEn": "Fuse Box",
  "tag": "DAILY / CIRCUITS + LOCKDOWN",
  "concept": "Breaker 1 opens the vault and kills one beam; breaker 2 kills the other two, one of them across the start room. Twenty turns of lockdown after the theft decide which breaker you visit before the trophy.",
  "map": [
   "###############",
   "#S.....#.....E#",
   "##.##.##.###.##",
   "#.........#2..#",
   "###.###.#######",
   "#...#1....#...#",
   "##.####.###.#.#",
   "#...DT#.......#",
   "###############"
  ],
  "emps": 0,
  "maxAlarms": 1,
  "par": 82,
  "best": 71,
  "routes": 17,
  "headline": [
   "switch-1",
   "switch-2",
   "lockdown"
  ],
  "lockdown": 20,
  "lasers": [
   {
    "x": 6,
    "y": 1,
    "dir": "W",
    "range": 12,
    "period": 8,
    "on": 4,
    "phase": 4,
    "circuit": 1
   },
   {
    "x": 1,
    "y": 7,
    "dir": "E",
    "range": 7,
    "period": 6,
    "on": 3,
    "phase": 2,
    "circuit": 1
   },
   {
    "x": 9,
    "y": 5,
    "dir": "W",
    "range": 11,
    "period": 6,
    "on": 4,
    "phase": 1,
    "circuit": 0
   }
  ],
  "cameras": [],
  "guards": [],
  "desc": "Take the trophy and get out unseen. On site: 3 lasers. Breakers: two. Lockdown 20 turns after the theft.",
  "hint": "",
  "descEn": "Take the trophy and get out unseen. On site: 3 lasers. Breakers: two. Lockdown 20 turns after the theft.",
  "hintEn": ""
 }
];if(typeof module==='object'&&module.exports)module.exports=levels;else r.HEIST_DAILY_LEVELS=levels;})(globalThis);
