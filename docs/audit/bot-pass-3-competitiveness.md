# Bot pass 3: wonders and competitiveness (2026-11-12)

The user, after playtesting: the bots "don't seem to be building wonders and are
generally uncompetitive". This audit asks whether that is true, how large it is,
and why. It changes nothing under `src/`, `data/` or `test/`. Card pricing is
another audit's subject and is not repeated here.

Method: measure first. Every number below comes from a played board or from the
bot's own decision terms. Where a reading is reasoned rather than measured, the
text says so.

## Summary

- **Wonders: the complaint is true for the first 100 turns.** In six-seat games
  the world holds 0.6 wonders at turn 50 and 7.3 of 27 at turn 100. At turn 100,
  26 of 48 seats hold no wonder. A wonder is finished a median of 40 turns after
  the first seat learns its technology. Late in the game one runaway seat takes
  a large share of them (33% to 92% of a game's wonders, median 62%).
- **The cause of the wonder gap is the build arm's arithmetic, plus a rule
  fact.** A town scores a row as `value × wait ÷ turns`. Against the building it
  loses to, a wonder is worth 1.1 times as much, waits 0.72 times as well, and
  takes 3.8 times as long. Its score is 0.23 of the winner's. The cost standard
  makes a wonder 2.2 to 4.3 times the price of a building, and the bot reads its
  effects as worth only a little more than a building's. Nothing prices the race
  for a once-in-the-world row: 59 races were lost in eight games, with 12,953
  hammers banked toward them.
- **The largest competitiveness fault is the threat count.** `threatLevel`
  (`bot.ts`) counts every other seat's soldier near a town, at peace or not. By
  turn 150 a seat counts 11 to 35 peaceful neighbours' pieces against 3.5 to 5
  of the wild. Each counted piece adds 30 points to every soldier and raises the
  multiplier on every wall. The result is an arms race: a third of all town-turns build units,
  and 6 of 48 seats fall into a build-and-disband loop that throws away up to
  11,299 hammers a game.
- **A one-knob test shows the size.** With the threat weights at a third,
  four six-seat games read +5.3 buildings a seat at turn 100 (t 2.1), +2.6
  technologies at turn 150 (t 2.2), −10.3 soldiers (t −2.1) and +2.0 great people
  (t 3.3). Disbands fall on all four seeds, by 35% to 90%.
- **The great-person gate is priced at a flat 20 points.** 20 of 47 surviving
  seats never research Epic Poetry by turn 150. Their banked renown would call 79
  great people.
- **The comparable two-seat row has moved down on towns, culture and
  technologies** against the brief's reference: 4.9 towns against 6.3, 30
  culture against 61, 20.9 technologies against 22.7. Production and food are
  up.
- **Performance: about 5 seconds a turn at turn 150** for six bot seats, clean,
  with single turns up to 9 seconds. One cheap fix is worth about 13% of a late
  turn.

---

# The bench

All games ran through `createBotStepper().playTurn()`, the loop the product
uses, on the standard map (80 × 52) with the wild on. Probes lived in the
session's scratch folder and are not in the repository.

| Set | Seeds | Seats | Turns | Games |
|---|---|---|---|---|
| Six-seat, no leaders | 1, 2, 3, 42, 101 | balanced, wide, tall, warmonger, balanced, balanced | 150 | 5 |
| Six-seat, with leaders | 7, 999, 31337 | the same personas; six leaders drawn by `rivalLeaders`, as the landing draws them | 150 | 3 |
| Two-seat comparable row | 1, 2, 3, 42, 101, 999, 31337, 20260101 | two balanced | 100 | 8 |
| Clean timing | 1 (no leaders), 7 (leaders) | six | 150 | 2 |
| Threat sensitivity | 1, 3, 42, 101 | six, `threat.militaryBonus` 30 → 10 and `threat.extraArmyPerThreat` 1 → 0.34 | 150 | 4 |

- **22 full games**, about 90 minutes of compute in all. Seeds 22, 29 and 38
  were avoided as the brief asked.
- The six-seat personas are the landing's own six-seat roster
  (`rosterFor`), with seat 0 driven by a balanced bot in place of the person.
- A decision hook recorded every `build` decision with its full candidate
  table. The two timing runs played without the hook and came out
  **byte-identical** to the probed runs (log length 9,002 and 11,529, the same
  turn-150 reading), so the hook did not change a decision.
- Four saves were replayed through `dispatch` to read facts the probe did not
  record (camps cleared, kills, disbanded pieces and their hammers, the threat
  split, the want books). Each replay matched the probe's own snapshot exactly.
- "Army strength" is the sum over a seat's soldiers of the larger of
  `combatStrength` and `rangedStrength`.

---

# Part 1: wonders

## 1.1 What the bots build

**Six-seat games, wonders completed in the world (27 wonders exist):**

| Seed | Leaders | First wonder | by t75 | by t100 | by t150 | Per seat at t150 (seats 0 to 5) | Top seat's share | Races lost | Hammers banked in lost races |
|---|---|---|---|---|---|---|---|---|---|
| 1 | no | t48 | 4 | 7 | 24 | 0 · 18 · 0 · 1 · 3 · 2 | 75% (wide) | 6 | 1,096 |
| 2 | no | t34 | 3 | 8 | 23 | 5 · 1 · 17 · 0 · 0 · 0 | 74% (tall) | 6 | 1,481 |
| 3 | no | t66 | 4 | 6 | 18 | 6 · 0 · 6 · 5 · 1 · 0 | 33% | 10 | 1,539 |
| 42 | no | t67 | 2 | 6 | 17 | 0 · 1 · 0 · 1 · 12 · 3 | 71% (balanced) | 8 | 1,872 |
| 101 | no | t53 | 3 | 6 | 16 | 0 · 8 · 4 · 1 · 2 · 1 | 50% (wide) | 11 | 2,841 |
| 7 | yes | t52 | 2 | 6 | 15 | 0 · 3 · 1 · 2 · 1 · 8 | 53% | 7 | 1,258 |
| 999 | yes | t44 | 5 | 9 | 20 | 0 · 9 · 4 · 0 · 2 · 5 | 45% (wide) | 9 | 2,650 |
| 31337 | yes | t53 | 4 | 10 | 25 | 0 · 0 · 23 · 0 · 2 · 0 | 92% (tall) | 2 | 216 |

**Per seat, over the 48 seats:**

| Turn | Wonders per seat | Seats with none | Most held by one seat | World total per game |
|---|---|---|---|---|
| 50 | 0.1 | 43 / 48 | 1 | 0.6 |
| 75 | 0.6 | 32 / 48 | 4 | 3.4 |
| 100 | 1.2 | 26 / 48 | 9 | 7.3 |
| 125 | 2.3 | 22 / 48 | 16 | 13.6 |
| 150 | 3.3 | 17 / 48 | 23 | 19.8 |

**The lag.** From the first turn any seat knows a wonder's technology to the
turn the wonder is finished: median **39.5 turns** (mean 41). From the builder's
own technology: median 30.5. Only 27 of the 64 ancient-wonder slots (8 wonders ×
8 games, 130 to 223 hammers each) are filled by turn 75.

| Wonder | Built (of 8 games) | Lag, median turns | Wonder | Built | Lag |
|---|---|---|---|---|---|
| Walls of Uruk | 8 | 28.5 | Terracotta Army | 8 | 40 |
| Hanging Gardens | 8 | 22 | Statue of Zeus | 8 | 52.5 |
| Temple of Artemis | 8 | 42 | Colossus | 8 | 61 |
| Great Ziggurat | 8 | 33.5 | Great Wall | 8 | 17.5 |
| Pyramids | 8 | 69.5 | Water Clock | 7 | 9 |
| Mausoleum | 8 | 40 | Forbidden City | 6 | 13.5 |
| Oracle | 8 | 57.5 | Great Library | 6 | 12.5 |
| Stonehenge | 8 | 83.5 | Circus Maximus | 5 | 37 |
| Theatre of Dionysus | 8 | 57 | Petra | 5 | 59 |
| Great Lighthouse | 8 | 75 | Angkor Wat, Djenné | 4 each | 10, 18.5 |
| | | | Hagia Sophia | 3 | 19 |
| | | | Machu Picchu | 2 | 15 |
| | | | Chichen Itza, House of Wisdom, Notre-Dame, Alhambra | 1 each | 5 to 20 |

Wonders built **by turn 100** across the eight games: Walls of Uruk 8, Hanging
Gardens 8, Temple of Artemis 8, Great Ziggurat 8, Mausoleum 8, Pyramids 6, Great
Lighthouse 5, Oracle 2, Terracotta Army 2, Colossus 1, Statue of Zeus 1,
Stonehenge 1. Fifteen wonders are never built before turn 100 in any game. By
t150 every wonder is built in at least one game, but each game still leaves 2 to
12 unbuilt (median 8).

**Started and abandoned.** 201 wonder starts were seen at the front of a queue
at the end of a turn. That is a floor: a wonder queued and finished inside one
turn is never seen there. None was switched away by a bot. 59 were lost to a rival who finished first,
with **12,953 hammers** banked toward them (1,619 a game). The sim refunds
`wonderRefundGoldPerHammer` = 1 gold a hammer, against a purchase rate of 4, so a
lost race returns a quarter of the hammers' purchase value. Several seats often
race the same wonder at once: on seed 101 three seats raised the Mausoleum
together from t95 to t99.

**Two-seat games** (to turn 100): 36 wonders in 8 games, 2.25 a seat, 5 of 16
seats with none. 16 of 27 wonders are never built by turn 100. The first wonder
lands at t52 to t94.

## 1.2 Why: the build arm's arithmetic

A town decides only when its queue empties (`cityProduction` blocker →
`cityCommand` → `productionTable` → `buildCandidates` → `push`, all in `bot.ts`).
Every row is scored the same way in `push`:

```
score = (value × wait − upkeep cost) ÷ effort
wait   = (60 − turns) ÷ 60          delayTerm, priorities.horizonTurns 60
effort = min(turns, 60)             patience only for a row that pays a bead or ends the game
```

`isPatientRow` keeps patience for bead and game-ending rows only. That is the
user's ruling of 2026-09-09 (`docs/flags.md` item (ggg)): *"an ordinary wonder is
amortised over its real turns and its payoff discounted at its real delay like
every other step"*. A long build is therefore charged twice: once by the
division and once by the wait.

**The three factors, measured.** Each decision that had a legal wonder was split
into its value, its wait and its effort, for the best wonder and for the row the
town chose. Geometric means over 8,545 such decisions in the eight six-seat
games:

| Chosen row | n | Value: wonder ÷ chosen | Wait: wonder ÷ chosen | Effort: chosen ÷ wonder | Score: wonder ÷ chosen |
|---|---|---|---|---|---|
| a building | 3,244 | 1.10 | 0.72 | 0.26 | **0.23** |
| a unit, settler or worker | 4,542 | 1.74 | 0.64 | 0.09 | **0.14** |

Medians: the best wonder takes 15 turns against the chosen building's 4. Its
value is 200 points against the building's 162. The two-seat games read the
same way (value 1.60 ×, wait 0.80 ×, effort 0.30 ×, score 0.41 ×).

So a wonder must be worth about five times the building beside it to tie
(1 ÷ (0.72 × 0.26)), and about seventeen times a unit. Its written effects come
nowhere near that. On average the best wonder sits about
ninth in its town's table.

**Where the wonder's value comes from** (mean of the best wonder's terms, six-seat
games): its own yields 26 points, its row (effects, renown, walls, authority)
125 to 156, and a share of the technology chain it belongs to 94 to 139. A chain
share is often the largest single term. When a wonder does win, its row reads
about 300 points, the town makes a median of 38 hammers, and the wonder takes 8
turns.

**The cost standard is the rule fact underneath** (`docs/production-costs.md`).
The base is 130 hammers for a wonder against 30, 40 and 60 for small, medium and
large buildings, on one column rate. A wonder costs 4.3, 3.3 and 2.2 times a
building of the same column. The bot reads a wonder's effects as worth 1.1 to
1.7 times the row it competes with, so per hammer a wonder is the worst buy on
the list before the wait is charged at all. Whether wonders should pay more, or
cost less, is a balance question for the user.

**Production is not the limit for the ancient wonders.** Capital production and
the turns to raise the best legal wonder, from the capital's own decisions:

| Turns | Capital production, median | Best wonder's cost, median | Its turns, median | Wait | Wonders chosen |
|---|---|---|---|---|---|
| 1–40 | 8 | 170 | 21 | 0.65 | 2 of 268 |
| 41–70 | 12 | 170 | 14 | 0.77 | 23 of 565 |
| 71–100 | 17 | 170 | 11 | 0.82 | 27 of 506 |
| 101–130 | 31 | 501 | 11 | 0.82 | 38 of 430 |
| 131–150 | 59 | 860 | 10 | 0.83 | 11 of 176 |

A capital can raise a 170-hammer wonder in 11 to 14 turns from turn 41. A
person would likely start one (reasoned, not measured). The bot does not,
because a 4-turn building in the same town scores about four times higher.

**The once-in-the-world race is not priced.** No term in the build arm reads the
chance that a rival finishes the wonder first. The only reading of a lost race is
The Envious Eye's card term (`enviousEyeWorth`, `value.ts`). A wonder left for
later is a wonder that may not exist later. A cheap building does not expire.
The greedy rule (best value per turn first) is right for rows that wait; it is
wrong for a row that disappears. The 59 lost races and the 40-turn lag are both
this one gap.

**`requiresSite` is not the blocker.** The two coastal wonders are built in all
eight games (Great Lighthouse, Colossus). Petra (desert beside the town) is built
in 5 of 8 and Machu Picchu (a mountain beside the town) in 2 of 8. Both are late,
dear wonders, so the site is a small part of their absence. Founding toward a
site is still unbuilt (pass 2's X10).

**Does the bot know the wonders' effects?** Mostly yes. Effects go through the
card evaluator (`explainWrittenEffects` → `explainEffects`). The mean row reading
("what its row gives beyond a yield") of each wonder when it was the best legal
wonder, over the eight six-seat games, with the main terms read off the two-seat
games' breakdown:

| Wonder | Decisions as the best wonder | Mean row value | What drives it | Lag, median turns |
|---|---|---|---|---|
| Walls of Uruk | 943 | 338 | town strength, town hit points and a combat line, each × (1 + threat) | 28.5 |
| Mausoleum | 200 | 384 | gold for each building in the town | 40 |
| Terracotta Army | 406 | 206 | a defence line × (1 + threat) | 40 |
| Great Ziggurat | 323 | 129 | a faith-unit discount, science for each shrine | 33.5 |
| Hanging Gardens | 293 | 113 | the growth-surplus percent | 22 |
| Great Lighthouse | 385 | 71 | a unit stat, water hexes, a route | 75 |
| Statue of Zeus | 599 | 62 | a percent against towns, one free piece | 52.5 |
| Temple of Artemis | 339 | 59 | camps, pastures, happiness by improved resources | 42 |
| Pyramids | 902 | 51 | one more worker charge | 69.5 |
| Oracle | 640 | 38 | one more card in an Order and a Doctrine hand | 57.5 |
| Stonehenge | 815 | 18 | a pantheon slot at the stand-in; **its `faithRung` grant reads "a grant this bot cannot read", 2 points** | 83.5 |
| Theatre of Dionysus | 180 | 163 | happiness for each amphitheatre; **its `doctrineDraft` grant and its free Amphitheatre read 2 points each** | 57 |
| Forbidden City | 171 | 117 | authority and culture; its Order slot is `deferred` in the data, so nothing should read it | 13.5 |

Two readings follow. First, the wonders the bot values least (Stonehenge,
the Oracle, the Pyramids, the Great Lighthouse) are the ones it leaves longest:
57 to 84 turns. Second, three completion grants fall to `score.unknownEffect` in
`explainBuildingRow`. The Walls of Uruk is built in all eight games and is the
first wonder of the game in 4 of 8, because the threat count multiplies each of
its three military lines.

## 1.3 Decisions from real games

Each line is the capital's own table: score = value × wait ÷ turns.

- **Seed 2, seat 0 (balanced), turn 37, Aldermarch, 4 citizens, 9 hammers.**
  It chose a **Monument at 21.6** (value 92.7 × 0.93 ÷ 4 turns) over the **Walls
  of Uruk at 13.1** (value 364.1 × 0.68 ÷ 19 turns, 170 hammers). The wonder is
  worth four Monuments and scores six tenths of one. This seat never built the
  Walls; seat 1 finished them at t45.
- **Seed 1, seat 1 (wide), turn 21, Aldermarch, 3 citizens, 8 hammers.** A
  **Lighthouse at 32.4** (194.8 × 0.92 ÷ 5) over the **Great Lighthouse at 5.5**
  (190.2 × 0.63 ÷ 22). Equal value, four times the turns, a sixth of the score.
  The same seat finished the Great Lighthouse at t114, 99 turns after the first
  seat learnt Sailing.
- **Seed 31337, seat 2 (tall), turn 37, Cusco, 5 citizens, 15 hammers.** A
  **Spearman at 43.0** (55.7 × 0.98 ÷ 1) over the **Walls of Uruk at 31.1**
  (419.5 × 0.82 ÷ 11). A piece worth an eighth of the wonder wins because it
  takes an eleventh of the time.
- **Seed 3, seat 2 (tall), turns 52 and 55, Fenwick, 7 to 8 citizens, 11 to 12
  hammers.** A **Palisade at 15.4** (65.8 × 0.93 ÷ 4) over the **Temple of
  Artemis at 12.4** (149.0 × 0.83 ÷ 10); then a **Warrior at 18.6** (28.0 ×
  0.98 ÷ 1) over the **Hanging Gardens at 12.4** (271.3 × 0.73 ÷ 16). This seat
  lost the Hanging Gardens race to seat 3 at t66 with 165 hammers banked.
- **Seed 1, seat 0 (balanced), turn 52, Elmsgate, 3 citizens, 13 hammers.** An
  **Archer at 162.0** over the **Pyramids at 8.5** (140.6 × 0.78 ÷ 13). The
  Archer's value is 250: 40 for its strength and **210 for "7 enemy pieces near
  a town × 30"**. This town built 44 archers from t45; the seat disbanded 126
  pieces over the game (Part 3.2).

## 1.4 Verdict on wonders

True, and large, for turns 1 to 100: few wonders, most seats with none, and a
40-turn lag that leaves every ancient wonder open to a person who wants it. After
turn 100 the picture changes. Production climbs, the cheap buildings are done,
and wonders win by default in the one or two seats that have the hammers. The
user, playing the first 100 turns hard, sees a world in which bots build almost
no wonders. That reading is correct.

---

# Part 2: competitiveness, the trajectory

## 2.1 Six-seat games (8 games, 48 seats)

Mean ± standard deviation · median [min–max]. One seat was eliminated by t150
and is left out at that turn.

| | t50 | t100 | t150 |
|---|---|---|---|
| towns | 3.0 ± 1.1 · 3 [1–6] | 6.1 ± 2.5 · 6 [2–16] | 11.4 ± 5.4 · 11 [3–27] |
| citizens | 11.4 ± 4.0 · 11 [6–23] | 40.1 ± 23.8 · 34.5 [9–110] | 102 ± 77 · 81 [11–326] |
| buildings | 3.1 ± 2.6 · 3 [0–10] | 26.8 ± 19.5 · 23.5 [1–88] | 95 ± 79 · 75 [8–378] |
| wonders held | 0.1 · 0 [0–1] | 1.2 ± 1.9 · 0 [0–9] | 3.4 ± 5.1 · 1 [0–23] |
| units | 12.6 ± 5.7 · 12 [3–27] | 31.5 ± 15.0 · 28 [5–76] | 75 ± 37 · 79 [8–183] |
| soldiers | 11.0 ± 5.0 · 10.5 [2–24] | 26.6 ± 12.1 · 24.5 [5–53] | 60.5 ± 28.6 · 59 [8–122] |
| army strength | 215 ± 102 · 200 | 752 ± 373 · 692 | 1,978 ± 1,022 · 2,082 |
| workers | 1.1 ± 1.2 · 1 [0–5] | 2.5 ± 2.9 · 1.5 [0–12] | 5.1 ± 6.4 · 2 [0–34] |
| food a turn | 38 ± 18 · 36 | 143 ± 113 · 112 | 400 ± 366 · 260 |
| production a turn | 26 ± 13 · 22 | 106 ± 85 · 86 | 496 ± 638 · 270 [42–3,618] |
| gold a turn | 5.1 ± 5.9 · 4 | 35 ± 60 · 16 | 162 ± 263 · 50 |
| science a turn | 11.8 ± 7.4 · 9.5 | 81 ± 56 · 76 | 374 ± 680 · 161 [14–4,117] |
| culture a turn | 9.2 ± 8.2 · 6 | 40 ± 31 · 30 | 158 ± 248 · 78 |
| faith a turn | 3.4 ± 4.2 · 3 | 16.3 ± 15.6 · 11.5 | 71 ± 122 · 33 |
| treasury | 52 ± 30 · 50 | 277 ± 230 · 232 | 1,010 ± 1,092 · 676 [5–5,072] |
| technologies | 9.9 ± 2.2 · 10 | 20.7 ± 3.7 · 19.5 | 30.5 ± 6.8 · 29 [19–49] |
| age | 1.5 | 2.7 | 3.5 |
| government tier | 4.0 | 9.7 ± 3.4 · 10 | 17.7 ± 6.2 · 18 |
| Orders seated / chairs | 4.4 / 5.2 | 6.1 / 6.2 | 8.2 / 8.4 |
| happiness | 0.2 ± 6.1 | 5.0 ± 14.5 | 1.8 ± 24.2 |
| authority | 2.0 ± 2.7 | 0.4 ± 5.0 | −2.0 ± 9.7 |
| faith spent (total) | 89 | 715 · 532 | 3,576 · 2,096 |
| beliefs held | 0.2 | 1.8 | 2.6 |
| great people called | 0.0 | 1.0 · 0 [0–4] | 3.3 · 3 [0–12] |
| wars running | 0.0 | 0.4 | 0.7 |
| towns taken (total) | 0 | 0.1 | 0.2 [0–4] |
| units lost (total) | 6.3 | 17.6 | 38.3 [9–142] |
| trade routes running | 0.1 | 1.6 · 1 [0–12] | 8.0 · 6 [0–31] |

**By persona at t150** (8 seats each, 23 for balanced):

| Persona | Towns | Citizens | Buildings | Production | Science | Technologies | Soldiers | Wonders |
|---|---|---|---|---|---|---|---|---|
| balanced (seats 0, 4, 5) | 10.6 | 87 | 77 | 372 | 262 | 29.7 | 52 | 2.3 |
| wide | 13.5 | 129 | 121 | 560 | 317 | 32.0 | 54 | 5.0 |
| tall | 12.4 | 136 | 133 | 961 | 933 | 32.4 | 66 | 6.9 |
| warmonger | 10.5 | 82 | 82 | 322 | 194 | 29.5 | 85 | 1.3 |

(The tall row is pulled up by two runaway seats: seed 2 with 326 citizens and
seed 31337 with 319.)

**The shape is a snowball.** In each game one or two seats run away (245, 253,
319 and 326 citizens at t150; one seat makes 3,618 hammers a turn) while two or
three seats stall (11, 20, 29 citizens at t150). The median seat at t150 has 81
citizens, 29 technologies and one wonder. Seat 0, which has the person's chair in
a real game, is the weakest on average (77 citizens over its 7 surviving seats,
against 82 to 136 for the other chairs) and holds no wonder in 6 of 8 games;
eight games cannot say whether that is a start-position effect.

**The endgame.** Alchemy needs 45 of the 49 technologies. One seat of 48 reaches
it (seed 31337, Pachacuti, tall, at t138). It starts the Magnum Opus at t145 in
its best town (265 to 285 hammers a turn). At t150 the Opus has 2,178 of 6,583 hammers
banked and 17 turns to go, so it would close near t168. The user's own logged
win, a tall science game, closed the Opus on t164. So the best bot of 48 plays
at about a person's pace; the median bot is 16 technologies short of Alchemy at
t150.

## 2.2 The comparable two-seat row (turn 100)

Two balanced seats, standard map, the wild on, seeds 1, 2, 3, 42, 101, 999,
31337, 20260101, stepper to t100. Mean of 16 seats ± one standard error.

| | towns | citizens | buildings | food | production | gold | science | culture | faith | treasury | technologies | happiness |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **now** | **4.88 ± 0.51** | **39.1 ± 5.5** | **24.4 ± 5.1** | **160 ± 36** | **113.5 ± 27.8** | **38.8 ± 8.7** | **67.0 ± 9.0** | **30.4 ± 5.8** | **17.2 ± 4.4** | **252 ± 40** | **20.9 ± 0.9** | **+3.6 ± 3.4** |
| median now | 4.5 | 32 | 17 | 117 | 69 | 31 | 71 | 26 | 8 | 209 | 20.5 | −1 |
| brief's reference | 6.3 | 44 | 19.4 | 138 | 74.5 | 33.5 | 55 | 61 | 18 | 336 | 22.7 | +2.0 |
| last logged probe (`docs/history/bot-priorities-log.md`, batch X13, 2026-09-10) | 6.2 | 42.3 | 30.9 | 131 | 83.2 | 41.1 | 89.9 | 69.6 | 18.2 | 320 | 23.2 | +12.2 |

- **Down beyond the noise:** towns (−1.4, about 2.8 standard errors), culture
  (−30, about 5 standard errors), technologies (−1.8, about 2).
- **Up:** production and food, but the mean is pulled up by a few big seats.
  The medians (69 hammers, 117 food) sit at or below the reference.
- **The spread is very wide:** 2 to 9 towns, 2 to 71 buildings, 16 to 91
  citizens. Seed 101's seat 0 holds 2 towns and 2 buildings at t100 after
  losing 33 pieces to the wild and buying 20 warriors.
- The rules changed a lot between the probes (trade simplified, technology
  passives cut, many Orders retired), so the culture drop is likely a rules
  effect as much as a bot one. Happiness is noise on 8 seeds and is not read.

---

# Part 3: where a competent person pulls ahead

There is no log of a person's game, so this part reasons from the measurements:
it finds resources the bots leave idle or waste, and decisions they make late.
Figures are six-seat unless the line says otherwise.

## 3.1 The threat count arms every seat against its peaceful neighbours

`threatLevel` (`bot.ts`) counts every combat piece of **any other seat** within
`threat.radius` (4) of one of the seat's towns. Its docblock says so: an enemy
is anybody else's soldier, the wild's raiders and a rival nation's column both.
The levy's own reading, `sightedThreat`, counts a rival only while `atWar` is
true and gives the reason: "counting it would make every seat arm against every
seat it ever met". The two readings disagree, and `ctx.threat` is the one that
reaches 32 sites in `src/ai/`:

- `explainSoldier` adds `threat × threat.militaryBonus` (30) to every soldier;
- `levyReading` (`campaign.ts`) wants `threat × threat.extraArmyPerThreat` more
  soldiers;
- walls, combat lines, stamps and many card terms multiply by `1 + threat`;
- `unitTerm` (`chain.ts`) multiplies a military node's soldier by up to
  `threat.techMilitaryFactor` (3) whenever `threat > 0` and the levy is short,
  and the soldier it multiplies already carries the threat line.

**The split, measured** (replays of four six-seat games; pieces within 4 hexes
of a town, mean per seat):

| Turn | The wild | Rivals at war | **Rivals at peace** |
|---|---|---|---|
| 25 | 1.2–3.0 | 0 | 0.2–0.5 |
| 50 | 2.5–4.2 | 0 | 1.3–2.7 |
| 75 | 1.5–4.7 | 0–1.2 | 1.8–6.2 |
| 100 | 1.7–4.3 | 0–4.7 | 3.3–7.7 |
| 125 | 1.7–5.0 | 0.2–6.5 | 6.2–15.2 |
| 150 | 3.5–4.8 | 0–9.5 | **11.2–35.2** |

From t75 the peaceful neighbours are the largest part of the count, and it
feeds itself: my soldiers stand near your towns and raise your count, and yours
raise mine. Consequences, all measured:

- **A third of all town-turns build units** (34% of 25,858 town-turns with a
  queue). 15 of 48 seats spend more than half their town-turns on units.
- **Soldiers are 49% of build choices in t1–50, 41% in t51–100 and 36% in
  t101–150.** In t1–50 a chosen soldier's worth averages 211 points, of which 163
  (77%) is the threat line (the 490 such choices whose terms were recorded).
- **Settlers lose to soldiers early.** In t1–50 a settler was in the top four
  but lost 260 times, at a median of half the winner's score; it won 164 times.
  The world holds 3.0 towns a seat at t50.
- **Walls are bought everywhere.** At t150 on seed 999, walls (Palisades or
  Castles) fill the top five rows of the gold book in three of the five living
  seats and four of the top five in a fourth, at worth per coin up to 6.4.
- **Units lost: 38 a seat by t150** (median 29, max 142).

**The one-knob test.** With `threat.militaryBonus` 30 → 10 and
`threat.extraArmyPerThreat` 1 → 0.34 (a third, applied to all pieces, which is
cruder than the fix), four six-seat games paired seat by seat (24 pairs):

| | t100 | t150 |
|---|---|---|
| buildings | +5.3 (SE 2.5, t 2.1) | +10.4 (SE 10.2) |
| production | +15.1 (SE 8.9, t 1.7) | |
| technologies | +1.0 (SE 0.7) | **+2.6 (SE 1.2, t 2.2)** |
| science | +5.1 (SE 8.6) | +150 (SE 81, t 1.9) |
| soldiers | −3.7 (SE 2.2) | **−10.3 (SE 4.9, t −2.1)** |
| great people | | **+2.0 (SE 0.6, t 3.3)** |
| citizens | +3.0 (SE 2.5) | +5.5 (SE 10.2) |

Disbands per seat fall 40.8 → 5.3 (seed 1), 7.8 → 0.8 (seed 3), 13.3 → 8.7
(seed 101) and 3.8 → 2.3 (seed 42). The unit share of town-turns falls from
31–38% to 20–31%. Wonders built by t100 rise from 25 to 32 over the four games.

## 3.2 Build-and-disband loops

The disband arm (`disbandCommand`) fires when net gold is below
`solvency.disbandBelowIncome` (0) and the treasury is under or heading under
`solvency.arrearsTreasury` (40) within `solvency.runwayTurns` (10). It lets go of
the worst-value piece it calls redundant: one in the field, or a spare in a quiet
town. The build arm charges a new soldier its wage at gold's price (36 to 49
points in the cases read) but still scores it from the threat line (210 to 540
points in the same cases). So a seat in deficit builds a soldier, and the
disband arm lets one go, every turn.

| Game | Seat | Disbands | Hammers disbanded | Pattern |
|---|---|---|---|---|
| seed 999 (leaders) | 4, Modu, balanced | **200** | **11,299** | 25 → 40 → 53 → 82 a quarter; every town builds a soldier a turn at −6 to −7 gold |
| seed 1 | 5, balanced | 106 | 4,505 | 61 in t51–75 |
| seed 1 | 0, balanced | 126 | 2,737 | the capital stays at 3–4 citizens and builds 44 archers from t45 |
| seed 7 (leaders) | 0, balanced | 92 | 1,854 | through the whole game; 3 towns, 20 citizens at t150 |
| seed 2 | 1 (wide) and 4 (balanced) | 145 and 131 | not replayed | |

Over the 48 seats: mean 23.8 disbands, median 4; **10 seats at 30 or more, 6 at
90 or more.** In the four replayed games 682 pieces were disbanded, worth 25,422
hammers. A person in deficit would stop building soldiers first.

## 3.3 The great-person gate is researched late or never

Epic Poetry opens `ancestorRites`: renown builds up from turn 1, but no great
person comes until a seat knows it. Its gift in `techChain` is `abilities ×
research.abilityValue`, a flat **20 points** for any ability (`chain.ts`,
`readNodeGifts`). Embarkation and the great-person gate are worth the same.

- **20 of 47 surviving seats never research Epic Poetry by t150.** 26 lack it at
  t100. The seats that do research it take it at a median of t82 (range 47–145).
- Those 20 seats hold renown that would call **79 great people** at the ladder
  (`renownThreshold`: 75, 256, 441, 633 …). The largest single bank is 7,696
  renown (seed 999, seat 1, wide, 22 towns), about 8 great people.
- This is the seed 888 pattern the brief named, and it is the common case, not
  an outlier. The two-seat games show it too: 6 of 16 seats without it at t100,
  holding up to 1,144 renown.
- Epic Poetry is a cheap age-2 node one step past Letters.

## 3.4 The wild: pieces killed, camps left standing

- A seat kills 15 of the wild's pieces by t50, 38 by t100, 64 by t150, but
  **clears 0.8 camps by t50, 2.7 by t100 and 7.1 by t150** (replays, 24 seats).
  A camp spawns raiders until it is burnt (`unitEveryTurns` 5, `maxCamps` 24).
- In the two-seat games a seat loses 23 pieces by t100 (median 19.5, max 46).
- `campMarch` ranks camps by distance alone (pass 2, Part 2 row 9, unchanged).
  It does not read the bounty (`campClearGold` 25, `campClearFood` 25) or the
  stream of raiders a camp would send.

A person clears the nearest camps early, for the bounty and to stop the raids.

## 3.5 Workers and improvements

| | t50 | t100 | t150 |
|---|---|---|---|
| workers per town | 0.38 | 0.41 | 0.45 |
| worked hexes with no improvement and a legal one to build | 7.0 of 11.3 | 12.1 of 35.2 (34%) | 19.9 of 81.2 (25%) |

Over the whole game, 19% of worker-turns pass with no order and no path (median
seat 19%, range 12% to 45%, seats with 30 or more worker-turns).

A town works a third of its hexes bare at t100 while some of its few workers
stand idle. The worker's craving prices only the hexes a citizen works or will
work soon (X1d-ground), which is right; the gap is in how few workers are built
and kept busy, and it needs its own look.

## 3.6 Expansion pace

Towns per seat: 1.8 at t25, 3.0 at t50, 4.6 at t75, 6.1 at t100, 8.3 at t125,
11.4 at t150. The bots found as many towns in t100–150 as in t1–100. Late towns
give less: they grow for fewer turns. The early pace is held down by the threat
line (3.1): soldiers outbid settlers. Authority and happiness may also bind; at
t50 the mean seat has 2.0 authority and 0.2 happiness left, so this audit cannot
say which limit is first.

## 3.7 Banked resources

| | t50 | t100 | t150 |
|---|---|---|---|
| gold banked, median (max) | 50 (121) | 232 (1,332) | 676 (5,072) |
| faith banked, median (max) | 15 (146) | 54 (1,567) | 123 (5,699) |
| renown banked, median (max) | 61 (171) | 253 (2,064) | 685 (7,696) |

- **Renown** is the large one, and it is Epic Poetry (3.3).
- **Gold.** The bots spend steadily: 8,636 gold a seat by t150, on 13 buildings
  and 26 units bought. The pile in the rich seats is a sink problem as much as a
  bot one: their income outruns what is worth buying. On seed 999 at the start
  of t150 the two richest seats make 549 and 907 gold a turn. Their first
  decisions that turn are a purchase (a Swordsman) and a caravan hired for 525
  gold, "against 0.2 for 1182 gold held against the standing bill"
  (`solvency.reserveTurnsOfUpkeep` 3). The best rows left are dear, such as
  Castles at 2,080 gold. Gold buys at 4 a hammer, and a wonder is never for
  sale. The one seat raising the Opus does pour gold into it (`contribute`, 6
  times).
- **Faith** is held for rites the bank cannot reach yet (Rite of the Harvest at
  105, Blessing of Arms at 130 to 230, Prophet at 180). Rites are used: 24 a seat
  by t150. Faith purchases are rare: 3.7 a seat; 25 of 48 seats never buy a
  piece with faith and 40 never buy a building with it.
- **Culture** is not idle. The pool is the draft basket and fills toward the next
  draft (seed 999, seat 5: 3,076 banked against a next draft of 3,558).

## 3.8 Queues, chairs and drafts

- **No town idles on a project.** Projects are 0.9% of town-turns; the longest
  run of a project at the front is 14 turns.
- **Chairs.** Seats with an empty chair: 27 of 48 at t50, 3 of 48 at t100, 11
  of 48 at t150. Mean Orders seated 8.2 against 8.4 chairs at t150. Small, and
  which card fits which chair is the card audit's ground.
- **Drafts passed:** 0.2 a seat a game. Not a fault.

## 3.9 War

- Declarations: 1.6 a seat a game; 31 of 48 seats declare none.
- **Wars fought:** 77 in eight games (9.6 a game). A seat is in a median of 2
  wars (8 of 48 in none, the most 15). The median war lasts 3 turns, 51 of 77
  end within 5 turns, and 19 last 10 turns or more.
- **Towns taken: 11 in 77 wars, 0.2 a seat by t150** (one seat took 4). The
  warmonger holds 85 soldiers at t150 and takes almost nothing.
- One seat of 48 was eliminated by t150 (seed 999, seat 0).
- The armies are large and mostly stand. A person facing a bot meets about 60
  soldiers at t150, but few bot wars take a town (11 in 77).

## 3.10 Other items checked

| Item | Reading | Verdict |
|---|---|---|
| Upgrades | automatic at each technology (`upgradeUnits`); 0 to 1.6 pieces a seat waiting on a gate | not a bot decision |
| Trade routes | 1.6 a seat at t100, 8.0 at t150; `buyRoute` 9 a seat a game; 7 of 48 seats never hire one | late, but used |
| Rites | 24 `performRite` a seat by t150 | used |
| Great people held unused | 0 or 1 on the board at each reading; a piece waits 1 to 5 turns | none |
| Citizens on poor hexes | 3 to 7% of worked hexes lose 2 or more yield to a free hex | none |
| Governments | second government at a median t34 (22–45), third at t80 (51–114), fourth at t118 (98–146) | the third arrives up to 63 turns apart between seats |
| Deal papers | 50 `proposeDeal` and 44 `declineDeal` a seat a game; 6 accepted | overhead, not a strength loss |
| The endgame | Alchemy reached by 1 of 48 seats (t138) | see 2.1 |

---

# Part 4: the faults, ranked

Ranked by estimated effect on the bot's strength. "Bot" means the bot can fix it
alone. "Rule" means a game-rule or balance fact for the user.

| # | Fault | Kind | Evidence | Proposed fix | Size | How to measure the fix |
|---|---|---|---|---|---|---|
| 1 | **The threat count includes peaceful neighbours** | Bot | 11–35 at-peace pieces against 3.5–4.8 wild at t150; 34% of town-turns on units; soldiers 49% of t1–50 choices, 77% of their worth the threat line; the one-knob test (+5.3 buildings t100, +2.6 techs t150, −10.3 soldiers) | In `threatLevel`, count only the wild's pieces and the pieces of seats this seat is `atWar` with, the test `sightedThreat` already uses. If a peaceful neighbour's army must count, count it at a small weight (a new knob, for example `threat.peaceWeight` 0.1–0.25) | small code change | the eight six-seat seeds: unit share of town-turns (now 34%), soldiers at t150 (60.5), buildings at t100 (26.8), technologies at t150 (30.5), towns at t50 (3.0); the war bench must still raise a levy when attacked |
| 2 | **Build-and-disband loops** | Bot | 6 of 48 seats at 90+ disbands; 25,422 hammers disbanded in 4 replayed games; one seat 11,299 | Make the two arms agree. When `headedIntoArrears` is true, the build arm should not raise a soldier the disband arm would let go (charge it the whole wage over `runwayTurns`, or refuse it while the levy is not short of garrisons); and the disband arm should cut the queue that is raising soldiers before it cuts a piece | small code change | disbands a seat (now mean 23.8, 10 seats ≥ 30): target no seat above 20; hammers disbanded per game |
| 3 | **The great-person gate priced at a flat 20** | Bot | 20 of 47 seats without Epic Poetry at t150, holding renown for 79 great people | In `readNodeGifts`, price `ancestorRites` by what it releases: the great people the banked renown would call now on the `renownThreshold` ladder, each at a great person's worth, plus the renown rate. `explainGreatPerson` lives in `bot.ts`, which `chain.ts` may not import, so the worth wants a leaf or a knob | small code change | seats without Epic Poetry at t100 (now 26 of 47) and t150 (20 of 47); great people at t150 (now 3.3 a seat) |
| 4 | **Wonders lose every early comparison** | Bot and rule | world 7.3 of 27 at t100; 26 of 48 seats none; 40-turn lag; score 0.23 of the winner; 59 races lost, 12,953 hammers | Bot: add a race term. A wonder not started now may be gone, so its score should carry the chance a rival finishes it within this town's wait (for example, by the number of known rivals who hold its technology). This touches the ruling of 2026-09-09 on patience, so **it needs a ruling**. Rule: the user may decide that wonders cost less (the `wonder` size, 130) or pay more | larger change, and a ruling | wonders in the world at t100 (now 7.3), seats with none at t100 (26/48), the lag (39.5), races lost (59 in 8 games); buildings and science at t100 must not fall |
| 5 | **Camps left standing** | Bot | 0.8 camps cleared by t50, 2.7 by t100; 64 raiders killed by t150; 38 pieces lost | Price a camp in `campMarch` by its bounty and the raiders it would still send, not by distance alone | small to medium change | camps cleared by t50 and t100; units lost by t100 |
| 6 | **Too few workers, some idle** | Bot | 0.4 workers a town; 34% of worked hexes bare with a legal improvement at t100; 19% of worker-turns idle (12% to 45% a seat) | First find why a worker with a legal improvement on a worked hex stands idle; then review the worker's price against the soldier's (the threat line wins most early tables) | medium change | bare worked hexes at t100 (now 12.1 of 35.2); idle worker-turns (19%) |
| 7 | **Late expansion** | Bot, partly rule | 3.0 towns at t50; as many towns founded in t100–150 as in t1–100 | Mostly fault 1. Measure again after it; then check authority and happiness at the moment a settler loses | measure first | towns at t50 and t75 |
| 8 | **Gold piles in rich seats** | Rule, partly bot | median 676 gold at t150, max 5,072; income of 549 to 907 a turn in the richest seats outruns the rows worth buying; the best rows left cost about 2,000 | A rule question: what should a late treasury buy (wonders are never for sale; 4 gold a hammer)? Bot side: check whether the three-turn reserve (`solvency.reserveTurnsOfUpkeep`) strikes the dear rows, and scale it with income if so | ruling, then a knob | treasury at t150; gold spent |
| 9 | **The cost of a wonder against its effects** | Rule | 130 base against 30/40/60; the bot reads a wonder at 1.1–1.7 times the row it loses to | Balance the `wonder` size or the wonders' effects; then re-read fault 4 | ruling | as fault 4 |
| 10 | **Three completion grants unread** | Bot | Stonehenge's `faithRung`, the Theatre's `doctrineDraft` and its free Amphitheatre read 2 points each; Stonehenge's whole row reads 18 and it waits 83.5 turns | Give each grant a case in `explainBuildingRow` (a belief's worth, a Doctrine hand's worth, the building's own row) | small code change | the two wonders' row values; their lag |

The first three are bot faults with small fixes, and fault 1 probably carries
part of faults 2, 5, 6 and 7 with it. They should be fixed and measured one at a
time, in that order, because each changes the board the next is read on.

---

# Part 5: performance

Clean runs: one six-seat game at a time on a performance core, no decision hook,
the same game the probe played (byte-identical).

| Six bot seats | t1–10 | t41–50 | t91–100 | t141–150 | slowest turn | whole game |
|---|---|---|---|---|---|---|
| seed 1, no leaders | 173 ms | 515 ms (max 644) | 1,672 ms (max 2,008) | **4,923 ms** (max 7,574) | t149: 7,574 ms | 208 s, 1,387 ms a turn |
| seed 7, leaders | 168 ms | 543 ms (max 678) | 1,327 ms (max 1,869) | **5,510 ms** (max 9,080) | t149: 9,080 ms | 206 s, 1,375 ms a turn |

- A turn costs about **10 times more at t150 than at t50**. The empires are
  large by then: 11 towns, 100 citizens and 75 pieces a seat on average, and the
  runaway seats several times that.
- In a game with a person, five seats are bots, so the wait is about five sixths
  of these figures. The probe runs, eight at a time on a machine with four fast
  cores and with the decision hook on, were 1.4 to 4.5 times slower, so a
  browser on a busy machine may be slower than the clean figures.

**Where a late turn goes** (CPU profile of turns 145–147 on seed 1, 3.5 to 3.9 s
each, 120 to 178 decisions a turn; inclusive share of the bot's time):

| Arm | Share |
|---|---|
| the sitting (`valueContext` / `seatContext`) | 33.5% |
| the want book (`wantBook`) | 20.4% |
| `techChain` | 16.1% |
| **`disbandCommand` → `netGoldPerTurn`** | **13.4%** |
| card appraisal (`explainCard`, `expectedBestOrder`) | 12.7%, 11.6% |
| `soldierCommand` | 10.9% |
| `wakeTheCampaign` | 8.1% |

**One cheap win:** `disbandCommand` runs before every decision of every seat and
asks `readEmpireRates` each time to read one number. Asking the treasury test
first (`headedIntoArrears` needs only the treasury when it is high) or memoising
the net rate for the sitting would save about 13% of a late turn. Fault 1 would
also cut the time, since a seat with half the soldiers has half the unit orders.

---

# What this audit does not claim

- **The bot is not a balance instrument** (the user's standing ruling). The
  figures here say what the bot does; the playtest is still the judge.
- There is no person's game to compare with. Part 3 reasons from waste and
  delay, and the one human figure (the Opus at t164) is a single game on an
  older build.
- Eight six-seat games and eight two-seat games are noisy. The persona rows have
  8 seats each. Happiness is not read at all.
- The one-knob test scales all threat, the wild's included, so it is a bound on
  fault 1, not a measurement of the fix.
- Seat 0 is weaker on average, but eight games cannot separate a start-position
  effect from chance.
