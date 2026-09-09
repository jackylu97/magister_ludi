# The test suite's speed — what it costs, and how much of it is necessary

**2026-09-09.** The question was the user's: *"improve the speed of the testing
suite … how much of it is actually necessary?"* Two rulings landed while the
pass was in flight and both are load-bearing here:

> *"Why do we need a 200 turn bot arena? We shouldn't be using the bot to
> measure anything, it isn't a good baseline."*

> *"Axe the pacing claims."*

So this pass is two things at once: a **speed** pass (the same claims, in fewer
seconds) and a **necessity** pass (fewer claims, because a class of them was
never a claim about the game — it was the bot used as a yardstick).

Everything below was measured on the same machine at three forks
(`--poolOptions.forks.minForks=1 --poolOptions.forks.maxForks=3`), which is the
cap the whole exercise was run under.

---

## Before and after

| | before | after the speed pass | after the retirements | |
|---|---:|---:|---:|---:|
| `TEST_TIER=all` wall (the push-gate) | 860.9 s | 394.6 s | **361.5 s** | −58 % |
| `TEST_TIER=all` CPU (sum of test time) | 1 752.9 s | 1 118.2 s | 1 027.8 s | −41 % |
| longest single file in the slow tier | 717 s | ~116 s | **112 s** | −84 % |
| core tier wall (`npm run test`) | 139.5 s | **131.4 s** | 131.4 s | −6 % |
| core tier CPU | 377.8 s | 347.1 s | 347.1 s | −8 % |
| test files | 211 | 213 | 210 | −1 |
| tests | 5 703 | 5 694 | **5 686** | −17 |

The final run is green: `TEST_TIER=all npx vitest run
--poolOptions.forks.minForks=1 --poolOptions.forks.maxForks=3` exit **0**, 210
files, 5 686 tests; `npx tsc --noEmit -p .` exit **0**. The retirements touch
only the slow tier, so the core numbers are the speed pass's.

**The tier is now CPU-bound rather than long-pole-bound.** 1 027.8 s of test
time over three forks is a 343 s floor; the run comes in at 361.5 s, and the
longest single file (`aiDecision.slow`, 112 s) no longer sets it. Anything
further has to come out of the work itself, not out of the packing.

Both core readings were taken back to back on the same machine, the "before" one
with the two fixture memos reverted and nothing else changed — the axed tests
are all slow-tier, so they do not touch the core number. The core tier's wall is
a packing problem across 175 files rather than a long-pole problem, which is why
its CPU saving (−31 s) shows up as only eight seconds of clock.

**The seventeen tests.** Eight were deleted under the pacing ruling (*Axed*,
below) and eight more with the retirements (*Retired*, below: one whole file of
one, one arena of three, and two whole files of two and one). The seventeenth is
the arena's *"writes a log that replays byte for byte"*: once the arena and the
120-turn game were shown to be the same game — same seed, same map, same seats,
same horizon — the two files' replay claims were the same claim, and it is now
made once.

### Where the time goes now

| file | s (at 3 forks) |
|---|---:|
| `sim/aiDecision.slow` | 112.1 |
| `sim/aiBot.slow` | 77.5 |
| `mapgen/mapgen.slow` | 64.6 |
| `mapgen/resources.slow` | 60.0 |
| `sim/aiWants.test` (**core**) | 44.4 |
| `mapgen/startPositions.slow` | 33.1 |
| `render/unitBars.slow` | 26.7 |
| `sim/religion.slow` | 26.6 |
| `mapgen/pangaea.slow` | 25.7 |
| `sim/aiDriver.slow` | 24.2 |

The wall time of a tier is bounded below by its **longest single file**, because
a file is the unit Vitest hands to a fork. That is the whole shape of the
problem: before this pass one file, `test/sim/aiBot.slow.test.ts`, was 717 s of
a 861 s run — five independent games behind one filename, played one after
another on one core while two other forks sat idle.

### Where the time went, before

| file | s | what it was |
|---|---:|---|
| `sim/aiBot.slow` | 717 | five games: a 200-turn arena, a 120-turn game, a 60-turn stepper walk, a 2×60-turn determinism pin, a 170-turn war arena, a siege and a war loop |
| `sim/aiDecision.slow` | ~230 | three games: 2×100 turns, 2×60 turns, 2×130 turns |
| `mapgen/pangaea.slow` | 55 | 20 seeds × 6 sizes |
| `mapgen/mapgen.slow` | 35 | 12 seeds × 6 sizes |
| `mapgen/resources.slow` | 34 | seeds × sizes |
| `sim/statecraft.test` (**core**) | 30 | 261 duel games generated for 379 cases |
| `sim/aiWants.test` (**core**) | 29 | ~250 bot turns driven for 20 boards |
| `mapgen/startStrategics.slow` | 27 | 5 seeds × 6 sizes, generated outside the memo |
| `sim/tech.slow` | 24 | an 1 100-turn scripted empire |
| `render/unitBars.slow` | 21 | 60 randomised games |

---

## The four changes

### 1. The long bot games are one file each

A file is a fork. `aiBot.slow.test.ts` held five independent games; each is now
its own file, and the harness they share (`playOut`, `Reading`, `after`,
`worstGold`, the config) moved to **`test/sim/aiBotHelpers.ts`** — a non-test
module, because importing a `.test.ts` re-registers its tests.

| new file | the game it plays |
|---|---|
| `test/sim/aiBot.slow.test.ts` | the 120-turn long game (was the 120-turn game *and* the 200-turn arena, which turn out to be the same game — see below) |
| `test/sim/aiDriver.slow.test.ts` | the 60-turn stepper walk (the X7 re-ask) and the 2×60-turn determinism pin |
| `test/sim/aiWar.slow.test.ts` | the war arena, the siege arena and the war loop |

`aiDecision.slow.test.ts` had the same shape and got the same treatment: its
war-configured identity pin — 130 turns played twice, the single most expensive
claim in the tier — is now **`test/sim/aiDecisionWar.slow.test.ts`**, with the
fold audit both halves share in **`test/sim/aiDecisionHelpers.ts`**.

No `it` was lost to the split itself: every test that moved kept its name and
its claim. Eight were lost to the pacing ruling (*Axed*, below) and one to the
merge — the arena and the 120-turn game turned out to be the same game, so their
two identical replay claims are one claim now.

### 2. The arena's horizon, measured

The arena was 200 turns. The two questions the ruling asked were *how short can
the solvency claim be* and *how short can the replay claim be*, and both were
measured off a single instrumented 200-turn game rather than argued.

**A turn's price grows with the empire on the board.** Cumulative cost of the
same game to each horizon:

| horizon | t60 | t80 | t100 | **t120** | t140 | t160 | t180 | t200 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| seconds | 5 | 13 | 30 | **53** | 77 | 118 | 220 | **439** |
| towns (seat 0 / 1) | 4/3 | 5/4 | 7/6 | **8/8** | 13/9 | 15/14 | 20/17 | 30/24 |
| techs | 12/11 | 17/15 | 21/20 | **25/25** | 30/31 | 33/37 | 39/41 | 44/44 |
| readings after t60 | 4 | 44 | 84 | **124** | 164 | 204 | 244 | 284 |
| solvency offenders | 0 | 0 | 0 | **0** | 0 | 0 | 0 | 0 |
| worst treasury | 44.7 | 36.7 | 36.7 | **36.7** | 36.7 | 36.7 | 36.7 | 36.7 |
| worst net rate | +5 | +5 | +5 | **+5** | +5 | +5 | +5 | +5 |

The last eighty turns cost **386 of the 439 seconds** and moved not one of the
numbers the claims are made of.

**Solvency: 120 turns.** Entry LIX's collapse (worst net gold −125 a turn, worst
treasury −1 642) was found at t160 on seats holding six and seven towns. This
board holds **eight and eight by t120**, with the same age turning under the
same stepped upkeep — so the empire the claim is made about is *bigger* than the
one that broke. The horizon is short; the empire is not. The window the claim
looks at (everything after t60) still holds 124 readings.

**Replay: 120 turns.** The 200-turn log exercises thirty-three kinds of command.
The turn each kind first appears:

```
foundCity·setAutoExplore·setCityProduction·chooseResearch·endTurn t2 ·
skipOrderOffer t8 · chooseDiscovery t9 · fortify t11 · moveUnit t16 ·
purchaseTile·chooseOrder·slotOrder t17 · buildImprovement t18 ·
chooseBelief t30 · purchaseItem(gold) t41 · performRite·adoptGovernment·
chooseDoctrine t45 · setCitizenFocus t56 · proposeDeal t57 · declineDeal·attack t58 ·
chooseGreatPerson·greatPersonAct t66 · greatPersonWork t69 · rerollOffer t73 ·
purchaseItem(faith)·plantHolySite t75 · acceptDeal t78 · unslotOrder t79 ·
gainBelief t83 · startRoute·sleepUnit t111
```

The **last new kind arrives at t111**. A sixty-turn log — the length the ruling
floated — is eleven kinds short: no great person, no holy site, no faith
purchase, no trade route, no accepted deal. **120 is the shortest log that
replays everything the 200-turn log did**, and the replay itself costs 6.6 s
there against 98 s at t200.

Both answers landing on 120 is why the arena and the old "hundred and twenty
turns of bots" describe are now **one game**: same seed, same map, same two
seats, same horizon. Playing it twice was the waste the split exists to remove.

### 3. Two fixtures that were being rebuilt per case

Both are the bargain `test/mapgen/fixtures.ts` already documents: a **snapshot**
cache handing every caller a private copy, rather than an object cache.

- **`test/sim/statecraftHelpers.ts`'s `game()`** — ten files open on this line
  and `statecraft.test.ts` alone asks for it 261 times for 379 cases. Generating
  a duel map, placing its starts and shuffling four bead decks is the same pure
  function of the same seed every time. Measured alone, `statecraft.test.ts`
  goes **39.3 s → 14.0 s** (test time 35.3 → 10.6). The other nine files that
  share the bench get the same discount, and because `poolOptions.forks.isolate`
  is off the cache spans the whole worker rather than one file.
- **`grownGame()` in `test/sim/aiWants.test.ts`** — twenty cases wanted a board
  driven 6, 8, 10, 12 or 20 turns, and the file drove ~250 bot turns to reach
  five boards. One game is now played *forward* and every horizon it passes
  through is remembered; a horizon behind the one already played rewinds to the
  nearest remembered board. Measured alone: **37.1 s → 22.2 s**. (Only the
  fixture changed — no case was rewritten.)

### 4. Mapgen sweeps through the directory's memo

`test/mapgen/fixtures.ts` was already there; three files were still calling the
generator directly. `startStrategics.slow` (**27 s → 13.2 s**), `veins.slow`
(**→ 0.43 s**, every board a memo hit) and `forests.slow`'s read-only sweeps now
ask `mapFor`/`detailFor`. The seed lists overlap heavily across the directory —
`forests.slow` and `startStrategics.slow` want the same five — and with
`isolate` off the second file to ask for a board in a worker is handed the
first file's.

---

## Axed (the user, 2026-09-09)

> *"Axe the pacing claims."*

The rule applied: a claim that **guards a bot regression** stays (solvency, no
compounding deficit, no refusals or stalls, driver ≡ stepper, log replay); a
claim about **the rules** checked on a played board stays (a sim invariant is a
rules claim, not a pacing claim); a claim that **the bot or a script reaches
something by a turn** goes. A *fixture* that plays to reach a board is fine — it
is the assertion about the turn it reached that is not.

| file | claim deleted | why it was pacing |
|---|---|---|
| `sim/aiBot.slow` | *still reaches a decided game or a live race* | asserted somebody had won, or both seats held beads, by t200 — the bot as the yardstick for whether the game reaches its endgame. The user named this one. |
| `sim/aiBot.slow` | *both empires reach a pantheon, and somebody founds a faith* | "both seats hold a god and a religion exists by t200" — a count by a turn. The faith appetite's arms are pinned deliberately on arranged boards in `aiBot.test.ts` ("prices the first god above everything else", "spends on the prophet the moment it can afford one"). |
| `sim/aiBot.slow` | *reports the curves the arena is for* | printed gold, town, tech and bead curves at t83 / t160 / t200 *"so a tuning pass has the numbers Entry LIX quoted without re-running anything"* — the arena as a measuring instrument, which is exactly what the bot is not. |
| `sim/aiBot.slow` | *leaves both empires with something to show for it* | "at least two towns and six technologies by t120" — founded-N-by-turn-T, verbatim. |
| `sim/statecraftPacing.slow` | **the whole file** (*hands the scripted empire a draft about every five turns early on*) | 800 turns of a scripted empire whose only two assertions were "at least three drafts landed" and "the three government tiers arrived inside the horizon". Everything else was already printed rather than asserted. The ladder's *arithmetic* is in `statecraftPacing.test.ts` (core) and the rungs are pinned off the rows in `statecraft.test.ts`. No claim survived the rule, so the file went. |
| `sim/tech.slow` | *closes its four ages on the Quick-speed schedule (Entry V)* | 1 100 turns of a scripted empire asserting that each age closed inside the horizon and the chart ran out. The turn figures had been printed rather than asserted since 2026-09-06. The reachability half is already made off the table itself by `tech.test.ts`' *"is a DAG: every tech is reachable from the empty set"*. Worth 24 s. |
| `sim/buildSinks.slow` | *costs the warband empire a quarter of its army by turn 40* | asserted `turn === 41`, `cities === 5`, 12–20 pieces and ≥4 technologies. Its stated subject — "a later retune may not quietly make units free again" — is a claim about **prices**, and prices are folded off the roster with no turns played in `productionCosts.test.ts` and `buildSinks.test.ts`. |
| `sim/upkeep.slow` | *turns a rising treasury into a spiral by turn 60* | treasury inside a band at turns 20, 40 and 60, army inside a band, town count exact — a script read as a yardstick for the economy. The maintenance *rule* it rested on is the file's other test (one disband per resolution), which keeps `playWarband` as a fixture. |
| `sim/religion.slow` | the turn window inside *lands the first consecration in the window the design predicted* (test kept and renamed) | asserted the first consecration landed between t10 and t75. The two claims a played game is actually needed for — the ladder is reachable at all, and the bank is spent rather than hoarded — are kept; the turn is printed. |

**Eight whole tests deleted, one narrowed.** Nothing was deleted whose subject
was a rule, a replay, a fold or an invariant.

### Audited and kept

- **`test/stress/`** — every claim is a *bound* (writes in proportion to changed
  tiles, a recompute inside a frame, a byte-identical replay of the whole
  scenario, memory of a fog snapshot). Bounds on work are not pacing.
- **`sim/endgame.slow`** — "the Opus opens, is paid for, and settles the race"
  asserts *reachability* (a gate that is correct and unreachable is the
  regression the file was written for) plus the machinery: the bead lands, the
  race settles. The turn it happened on has been printed, not asserted, since
  2026-09-06.
- **`sim/beads.slow`** — "deals from turn one" is the table's rule; the turn the
  Æra III table opens is printed.
- **`sim/tech.slow`**'s two remaining build measurements — a price divided by an
  income is arithmetic, not a turn some empire reached.
- **`sim/aiWar.slow`**'s three benches — a declaration standing on a force, an
  army that marches, a peace needing two signatures. All operational, none a
  yardstick.

---

## The necessity register

One line a file: what it claims, what is lost without it, and whether something
else already covers it.

### `test/sim/`

| file | claims | lost without it | covered elsewhere? |
|---|---|---|---|
| `aiBot.slow` | 120 turns of two bots: nothing refused or stalled, both banks spent, solvency after t60, no compounding deficit, byte-for-byte replay | Entry LIX's bankruptcy class of bug, and any divergence a big board reaches | no — `aiBot.test.ts` reaches ten turns of a duel |
| `aiDriver.slow` | the X7 re-ask fires on a board nobody arranged and never doubles up; the driver is a pure function of the state at 60 turns | an arm that only misbehaves on real terrain; a non-determinism that a ten-turn game hides | partly — `aiBot.test.ts` pins both on arranged boards and at ten turns |
| `aiWar.slow` | no declaration on a turn the force was short (170 turns); a balanced seat at war marches a force and takes walls down; declare → sue → sign → truce | the whole of W1/P3's operational half | the *rules* are in `aiWar.test.ts`; the *events* are only here |
| `aiDecision.slow` | stepper ≡ driver at 100 turns and for a persona'd pair; the log replays; every candidate folds to its own score; every choice point is reached and annotated; the policy is pure at t100 | the spectate page silently showing a different game from the one the product plays | no |
| `aiDecisionWar.slow` | the same identity on a duel map with a warmonger, 130 turns | see RETIRE below — its two war assertions are currently vacuous | the identity claim is `aiDecision.slow`'s |
| `barbarians.slow` | a game with camps and raiders replays byte for byte | wild-side state that never enters the log | no |
| `beads.slow` | the bead table deals from turn one, opens at built age 3, and the hand has the shape the rules give it | the table's own rules on a played board | partly — `beads.test.ts` |
| `buildSinks.slow` | the median capital's opening rate over 21 seeds; the three opening pieces cost four turns of it | a ground change or a price change nobody noticed | no — one seed is a map roll |
| `cities.slow` | escalating settlers replay; 30 turns of two growing cities replay | growth and escalation drifting out of the log | no |
| `deals.slow` | a bargain's whole life and a peace with terms, from the log | the diplomacy verbs' replay | no |
| `discoveries.slow` | site placement over generated maps: apart, walkable, off resources, per-continent counts, the fairness top-up | the placement pass's aggregate promises | partly — `discoveries.test.ts` |
| `endgame.slow` | the Opus opens, is paid for, settles the race, the golden bead lands; the save round-trips | a finish line that is correct and unreachable | no |
| `improvements.slow` | the chop protection rule over generated maps | a canopy resource losing its guard on ground a fixture never draws | partly |
| `purchase.slow` | a log with purchases replays byte for byte | purchases drifting out of the log | no |
| `religion.slow` | determinism with a consecration, a rite and a belief; two faiths and a proclamation replay; the ladder is reachable and spent | religion's whole replay surface | no |
| `resourceEffects.slow` | a luxury's signature survives a save and a replay | the vocabulary drifting out of the log | no |
| `rng.slow` | `nextFloat` stays in [0, 1) over a long sweep | a generator that fails one time in millions | no |
| `statecraft.slow` | two full Statecraft sequences replay byte for byte | the card system's replay surface | no |
| `tech.slow` | 40 turns of research replay; the opening kit priced over 21 seeds; a fresh capital's scout and a size-2 capital's settler at exactly their own rate | research drifting out of the log; an opening priced against one map roll | partly — `tech.test.ts` holds the 20-turn round trip |
| `territory.slow` | replays with tile purchases, water included | tile ownership drifting out of the log | no |
| `upkeep.slow` | a resolution takes at most one piece from any one seat, on a played board | the rule the arrears spiral rests on | partly — `upkeep.test.ts` folds the bill |
| `war.slow` | the whole war sequence with every rule holding at the point it should; a declaration, a capture and a peace replay | war's replay surface and its ordering | no |
| `zoc.slow` | the sweep, the route and the walk agree on rough random boards | the three readers of `stepCost` disagreeing on ground nobody drew | partly — `zoc.test.ts` |

### `test/mapgen/`

| file | claims | lost without it |
|---|---|---|
| `forests.slow` | the woodland's share, patch shape and clearing rate over 5–10 seeds | a `frequency`/`clearingChance` slip that only shows in aggregate |
| `mapgen.slow` | sizes, determinism, tile validity, land fraction, elevation, broken ridges, moisture — 12 seeds × 6 sizes | the generator's whole sanity envelope |
| `mapReport.slow` | the report on generated maps; every seat can plant at every roster size | a map the game cannot actually be started on |
| `pangaea.slow` | one continent at every size and seed; no land the shelf cannot reach; every roster seatable | the pangaea ruling itself |
| `resources.slow` | legality, density bands, the "ground did not move" hashes, fairness, luxuries | resource placement's aggregate promises, and the pin that says terrain did not move |
| `startPositions.slow` | start placement and spacing on generated maps at every size | starts that only work on one map |
| `startStrategics.slow` | every capital has both guaranteed strategics within six, at every size | the 2026-09-05 guarantee |
| `veins.slow` | the buried share, the rarity ladder, and never a buried row on the surface | the vein layer — currently **shelved** (`veins.share === 0`), so two of three claims assert the shelving |
| `water.slow` | lakes, river tracing, quotas and fresh water on generated maps | the water milestone's aggregate promises |

### `test/render/`, `test/ui/`, `test/stress/`

| file | claims | lost without it |
|---|---|---|
| `dressing3d.slow` | two builds of a whole standard board agree instance for instance | grass that jumps on any rebuild |
| `picking3d.slow` | every consecutive pair of river-ribbon segments shares an end, on real rivers | a broken ribbon on generated geometry |
| `projection.slow` | no point well inside a hex round-trips onto a neighbour (≈60 000 assertions) | a transform that is right at centres and wrong at edges |
| `unitBars.slow` | every drawn bar is its own unit's fraction, over 60 randomised games | the combination cases a hand-written sequence cannot cast |
| `ui/tradeWalkthrough.slow` | a caravan reads correctly at every step of its life | the trade UI's end-to-end reading |
| `stress/stress.slow` | scale and cost bounds: writes in proportion to changed tiles, a recompute inside a frame, the whole scenario replaying byte for byte | the performance contract the renderer is built on |

---

## Retired (the user, 2026-09-09)

All five candidates this audit raised were retired the same day. Each line is
what went, what it cost, and what still makes the claim.

| retired | cost | why it went |
|---|---:|---|
| **`test/sim/aiDecisionWar.slow.test.ts`** (whole file) | ~113 s | Its own comment, written 2026-09-08, said the war assertions *"are vacuous on a peaceful seed"*: since W1 and B1 a declaration is a conjunction of four clauses, and a probe of eight neighbouring seeds found none that declares inside 130 turns. What it actually asserted was *stepper ≡ driver with two personas* — which `aiDecision.slow.test.ts` asserts on a standard map. Its fold audit moved back into that file and `aiDecisionHelpers.ts` went with it. |
| **the 170-turn war arena** in `test/sim/aiWar.slow.test.ts` | ~116 s | Its only pin was a *negative* — no declaration on a turn the strike force was short — and the same rule is pinned positively on the arranged war-loop bench in the same file (every declaration carries `armed`) and five times over on arranged boards in `aiWar.test.ts`. Its replay claim is the long game's. What it printed (a force held on 70 of 170 turns) was a measurement, and the bot is not one. The siege arena and the war loop stay; the file is now two arranged boards costing about two seconds. |
| **`test/mapgen/pangaea.slow.test.ts`**, 20 seeds → the first 8 | ~113 s → 25.7 s | Eight seeds is still a sweep, at a fifth the cost, and this was the mapgen tier's longest file. It is the **first** eight of the list rather than a chosen subset, so nothing was picked to make a floor clear — and every floor in the file (the mainland share, islands per map, tiles per island, stranded land, seats away from home) still holds on it. |
| **`test/mapgen/veins.slow.test.ts`** (whole file) | 0.4 s | With `veins.share` at 0 two of its three claims asserted the *shelving* rather than the layer — a test that passes by saying nothing. The reader register in `veins.test.ts` stands; `docs/deprecated/veins.md` records that the sweep comes back with the share. |
| **`test/render/projection.slow.test.ts`** (whole file) | ~4 s | Sixty thousand assertions on hex interiors, where `projection.test.ts`' centre round trip is the reading that fails first when the transform breaks — a second warning rather than a first one. The shared spread stays in `projectionHelpers.ts`, whose docblock records it. |

Everything the retirements touched in prose was fixed with them:
`test/render/projectionHelpers.ts`, `docs/deprecated/veins.md`, and the
docblocks of `aiDecision.slow.test.ts` and `aiWar.slow.test.ts`. **Nothing under
`src/` names a deleted file** — the two `src/ai` docblocks that mention this
family (`decision.ts`, `stepper.ts`) point at `aiBot.slow.test.ts`, which still
exists.

## What was checked in `vite.config.ts`, and why nothing moved

- **`poolOptions.forks.isolate: false`** — already on, and now more load-bearing
  than it was: the three snapshot memos (`statecraftHelpers`, `aiWants`,
  `mapgen/fixtures`) all span the *worker* rather than the file because of it.
  The config's own docblock states the property that makes it safe (`src/sim/`
  is pure, its tables read-only; `INSTANCE_WRITES` is an accumulator every
  assertion zeroes; nothing calls `vi.mock` or writes to `globalThis`). The new
  memos join that list: each hands out a private `restoreState` copy and never
  the cached object.
- **`pool: 'forks'`** — must stay. `test/stress/stress.slow.test.ts` bounds its
  work in `process.cpuUsage`, and in a worker *thread* `process` is the whole
  process, so every sibling's CPU would be charged to the measurement.
- **`fileParallelism`** — default (on). Turning it off would serialise the tier;
  it is the thing the split exists to exploit.
- **`sequence.shuffle`** — off, and it must stay off. Files share memo tables
  inside a worker, and a shuffled order makes a failure irreproducible; nothing
  here is worth that.
- **`sequence.concurrent`** — off, and it must stay off. `INSTANCE_WRITES`
  (`src/render3d/instances.ts`) is a mutable module singleton that every render
  assertion opens by resetting; concurrent cases inside one file would race it.
- **The sequencer.** Vitest's default `BaseSequencer` already orders files
  longest-first using the durations cached under `node_modules/.vite/vitest`,
  which is the right policy for a tier with a long pole and needs no setting.
  (In a worktree that cache is the parent repo's, since `node_modules` is a
  symlink — harmless, and it means a fresh worktree's first run is ordered by
  file size instead.)
- **`css: true`** — costs the collection one stylesheet parse and is load-bearing
  for `test/ui/cityScreen.test.ts`. Left alone.

The honest finding is that there was no cheap config win left: the config was
already tuned, and the cost was in five files that each held more work than a
fork could parallelise.
