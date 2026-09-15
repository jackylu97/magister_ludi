# Painted renderer — the measured baseline

The evidence half of `docs/plans/painted-performance-audit.md`, tasks **#24**
(CPU/GPU attribution and realistic stress fixtures) and **#23** (startup evidence
to first presentation). **This batch measures; it optimises nothing.** No frame
of the renderer draws differently because of it — the instrument is opt-in, the
startup markers are timestamps, and the fixtures are saves.

Everything below is the baseline for the reconciled tree (the integrated painted
renderer merged with the new-game flow). Wave 2's numbers are to be compared
against *these files*, on the same fixture, with the same harness, on the same
machine — not against the older JSONs in this directory, which were measured on a
different sweep, a turn-7 world and a different build.

**The six readings this batch adds.**

1. **The frame's CPU cost is preparation, not submission.** Split apart, a
   refreshed frame on a developed standard map is 12–17 ms of state sync,
   fingerprints, light rig and projection against 4.5–19 ms of submission. The
   audit read the old `cpuRenderMs` median as the frame's CPU cost; it is the
   second half of it.
2. **A developed map's state refresh is the hitch.** One reducer-issued unit step
   costs **53–184 ms** of `setGameState` on a 41-city map (129–226 ms on a
   59-city large map); a turn refresh costs **207 ms** (277 ms). Every earlier
   movement probe ran on a turn-5 world and saw 3.6–13.4 ms.
3. **Loading a developed save is dominated by replay.** 4,407 logged commands
   replay synchronously in **20.3 s** before the renderer is asked for anything —
   task #22's unmeasured case, now measured.
4. **"Playable" is not "presented".** The landing comes down 22.5 s before the
   first frame of the board, in one unbroken main-thread task — the whole of
   task #23's gap, and no earlier startup number contained it.
5. **The render targets outweigh the board.** 557 MiB of targets (512 MiB of it
   the static 8192² sun) against 213 MiB of board geometry, and the target bill
   is the same on the large map, where it covers 60 % more world.
6. **Fixtures now have empires in them**: 41 cities / 37 walled / 273 units /
   232 fields / 62 roads on standard, 59 / 54 / 342 / 337 / 127 on large, both
   reproducible from a seed.

Frame *times* below are a software rasteriser's and must not be quoted as the
game's; everything structural — draws, triangles, passes, bakes, `setGameState`
costs, memory, populations, stage splits — is not.

## How to reproduce

```
node scripts/terrain-study/check-fixtures.mjs            # build/verify the saves
node scripts/terrain-study/check-painted.mjs --fixture standard-t120-s1 \
  --frames 24 --warmUp 6 --viewport 1100x700 --timeout 900
node scripts/terrain-study/check-painted.mjs --fixture large-t120-s1 \
  --frames 12 --warmUp 3 --viewport 1100x700 --timeout 2400
node scripts/terrain-study/check-painted.mjs --new --startupOnly   # the cold path alone
```

Those are the exact invocations behind the three JSONs this batch leaves
(`painted-integrated-standard-t120-`, `painted-integrated-large-t120-` and
`painted-new-game-startup-2026-09-15.json`). The frame counts
are low because a software rasteriser takes one to five **seconds** a frame on a
developed map; on the reference machine the defaults (156 frames, 36 warm-up) are
the ones to use.

The harness starts its own dev server on **port 5321**, pushes the fixture save
into the headless browser's own `localStorage`, resumes it through the landing's
own Continue, reads the startup marks back, then presses the page's *Benchmark
full map* button and writes one JSON under `docs/plans/benchmarks/`. It kills
only the server it started. `--frames`, `--warmUp`, `--viewport`, `--label` and
`--out` are the knobs; the renderer reads `benchFrames`, `benchWarmUp`,
`benchViews` and `benchWorkloads` off the URL, so the same sweep can be driven by
hand from the browser on a real GPU.

## What the columns mean

The audit's correction was that `lastRenderMs` is **submission time alone** — it
starts after `syncStateLayers`, the light rig and the vignette's projection — and
that "play is CPU-bound" had not been established by it. The probe now separates
the three:

| Column | What it is |
|---|---|
| `frameMs` | the animation-frame interval: wall clock between two presented frames |
| `mainThreadMs` | the frame's callbacks end to end, measured from the rAF timestamp |
| `cpuRenderMs` | `lastRenderMs` — submission alone, unchanged from the old runs |
| `preparationMs` | `mainThreadMs − cpuRenderMs`: state sync, light, projection, animation |
| `gpuMs` | an asynchronous `EXT_disjoint_timer_query_webgl2` bracketing exactly one drawn frame; `null` where the extension is absent, and disjoint samples are discarded, never reported |
| `rendererRenderCalls` | `WebGLRenderer.render` invocations in the frame — the colour pass, the depth-normals pass, the AO passes and the output pass |
| `terrainShadowRebakes` | static sun bakes **inside the counted frames** (not between phases) |
| `shadowMapRenders` | shadow-map submissions in the counted frames; the counter map is re-rendered on every drawn frame by design |
| `dropped` | the 10th-percentile interval taken as the frame budget, and the fraction of intervals over 1.5× it |

An undrawn frame is counted as `idleFrames`, never as a fast frame, and its
timer query is destroyed rather than banked as zero milliseconds.

Beside the phases, `colourPassAttribution` names **which batch fills the frame**
at the parked omniscient overview (task #18): a row per prop sculpt and per
merged surface, with its draws, triangles and instances averaged over the frames
sampled. It is taken in its own short window, on the same parked camera as the
first phase, because its hooks cost a closure call on every draw. Shadow depth is
outside it — that goes through `onBeforeShadow`.

## The fixtures

A fixture is a **save**, not a scene: `check-fixtures.mjs` drives the bots from a
seed for a fixed number of turns and writes the game's own `{config, log}`
envelope, which the harness pushes into the headless browser's `localStorage` and
resumes through Continue. Every seat is bot-played while the fixture is built (a
seat `driveBots` skips never founds a city, and an empty empire was exactly the
fixture the audit said was missing); the written config then marks seat 0 human
so the browser resumes into it as a player's save does. `isHuman` is read nowhere
in `src/sim/`, and the generator proves it: it replays the flipped payload
through `loadSave` and compares populations against the game it just played.

| Fixture | Map | Seats | Turns | Commands | Cities (walled) | Buildings | Units | Fields | Roads | Camps | Ruins |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `smoke-t8-s1` | standard 80×52 | 4 | 8 | 84 | 4 (0) | 0 | 14 | 0 | 0 | 6 | 74 |
| `standard-t120-s1` | standard 80×52 | 6 | 120 | 4,407 | **41 (37)** | 254 | **273** | 232 | 62 | 24 | 34 |
| `large-t120-s1` | large 104×64 | 8 | 120 | 6,971 | **59 (54)** | 444 | **342** | 337 | 127 | 24 | 49 |

Fields, by kind, are in `docs/plans/benchmarks/fixtures/index.json` beside the
payload hash, the command count and the build time of each. The smoke fixture is
the determinism pin — cheap enough to build twice and compare byte for byte; the
long two are checked by replay instead (`test/render/paintedBenchmarkFixture.test.ts`
pins the same two properties on a duel-sized stand-in, in the core tier).

Every earlier JSON in this directory was measured on **standard seed 1, turn 7 or
turn 2** — near-zero cities, works, roads and borders. Findings 5, 6 and 7 of the
audit all scale with those populations, which is why they could not be seen.

## Startup, stage by stage (#23)

`painted-integrated-standard-t120-2026-09-15.json`, resumed developed save,
headless Chromium on SwiftShader. Every mark fired, in order
(`marksAreOrdered: true`, `missingMarks: []`).

| Stage | ms | What happens in it |
|---|---:|---|
| `load-start` → `replay-done` | **20,252** | `loadSlot` → `tryReplay`: 4,407 logged commands applied synchronously on the main thread |
| `replay-done` → `begin` | 0.1 | the handoff into `beginGame` |
| `begin` → `assets-loaded` | 1,419 | `enablePaintedLook`: three grain textures, then vegetation, then the settlement kit |
| `assets-loaded` → `terrain-ready` | 6,746 | `preparePaintedMap`: the one-shot terrain worker |
| `terrain-ready` → `state-layers-built` | 3,779 | `setGameState`: cities, works, sites, roads, territory, units, fog for 41 towns and 273 pieces |
| `state-layers-built` → `playable` | 150 | the rest of `boot` and `hideLanding` |
| `playable` → `first-board-frame` | **22,487** | the first frame actually drawn: shader compilation, GPU upload, the first 8192² shadow bake, the first composed frame |
| **click → playable** | **32,346** | the interface unblocks here |
| **click → first board frame** | **54,833** | the board is on screen here |

Longest main-thread long task: **22,502 ms**, starting at the `playable` mark —
the first presented frame. Nine long tasks, 55.6 s of blocking in total.

The marks are eight `performance.mark` calls in `src/main.ts` and nothing else;
`test/render/paintedBenchmark.test.ts` pins that the list there and the list the
harness reads back are the same one, and that each is a whole statement rather
than an expression the loader could branch on. Only the **first** game of a
session is marked: a second load in the same session goes through `adoptGame`,
which re-enters the reporting frame, so the harness takes the first entry of each
name.

Two of these are the point of the exercise:

1. **Replay dominates the load of a developed save.** Twenty seconds before the
   renderer is asked for anything, on the main thread, with the loading screen
   frozen — task #22's hypothesis, now with a number on it. This figure is
   CPU-only: it is the same order on any GPU.
2. **"Playable" is not "presented".** The landing comes down, the interface is
   live, and the first frame of the board lands twenty-two seconds later in one
   unbroken main-thread task. Software GL exaggerates the size of that task, but
   nothing about it is hidden behind the worker, and no earlier startup report
   contained it at all: `boardBuildMs` (6,754 ms here) stops before it.

**The new-game path, for comparison** (`painted-new-game-startup-2026-09-15.json`,
`--new --startupOnly`, no save): no `load-start` or `replay-done` marks at all,
`begin → assets-loaded` 3,293 ms, `assets-loaded → terrain-ready` 6,946 ms,
`terrain-ready → state-layers-built` 2,022 ms, `state-layers-built → playable`
89 ms, and `playable → first-board-frame` **14,307 ms**. So the twenty seconds of
replay are the whole of what a developed save adds up front, while the
presentation gap is there on a brand-new world too — smaller only because the
board carries no empires. The acceptance list's warm-cache and failed-load cases
are not yet recorded (see *What is not measured*).

## The view sweep — developed standard map

`painted-integrated-standard-t120-2026-09-15.json` · 41 cities (37 walled), 273
units, 232 fields, 62 roads · 1100×700 at DPR 1 · 24 frames a phase, first 6
warm-up · **SwiftShader: `frameMs` and `gpuMs` are a CPU rasteriser's.**

| View | frame p50/p95 | main | submit | prep | draws | triangles | passes | rebakes |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| charted play | 1617 / 2933 | 19.1 | 6.7 | 15.0 | 253 | 1.57 M | 5 | 0 |
| charted overview | 2483 / 7300 | 17.3 | 4.5 | 12.2 | 456 | 2.88 M | 2 | 0 |
| omniscient play | 3417 / 5417 | 31.4 | 16.0 | 14.5 | 556 | 7.37 M | 5 | 0 |
| omniscient overview | 5200 / 13583 | 35.5 | 19.3 | 16.6 | 1236 | 9.36 M | 2 | 0 |
| wrap seam | 3833 / 4450 | 31.9 | 14.8 | 15.6 | 377 | 5.84 M | 5 | 0 |

(ms unless stated; `main`, `submit`, `prep` are p50.)

What this says that the old runs could not:

- **The CPU cost of a refreshed frame is preparation, not submission.**
  `preparationMs` sits at 12–17 ms in every view — state sync, fingerprints, the
  light rig, the vignette's projection — against a submission of 4.5–19 ms. The
  audit's claim that the 12.7 ms `cpuRenderMs` median *was* the frame's CPU cost
  was the wrong reading of the right number. **Note the sweep invalidates on
  every sampled frame** (it always has), so this is the cost of a *dirty* frame —
  the path finding 2 targets — not of an idle pan.
- **Charted play on a developed map is still ~253 draws**, but the omniscient
  views have roughly doubled against the turn-7 evidence (556 and 1,236 draws;
  7.4 M and 9.4 M triangles) — the works, cities, roads and borders the old
  fixture did not have. Task #18's "fully revealed overview" is 9.4 M triangles
  on this map.
- **The contact pass is off at overview and on at play** — `rendererRenderCalls`
  is 5 at play and 2 at overview, which is `setContactDetail`'s fade doing
  exactly what it claims.
- **No static rebake anywhere in the sweep**, as on the older runs; the sweep
  changes no fog.

## The workloads

The five things a pan cannot see, over an idle baseline, each driven through the
simulation's own reducer on a copy of the live state. The march and the turn
refresh issue real `moveUnit` and `endTurn` commands; the copy shares the live
map, so every tile field is snapshotted before the probe and written back after,
and the march refuses any hex carrying a ruin or a camp.

| Workload | frame p50/p95 | main | prep | draws | rebakes | the number that matters |
|---|---|---:|---:|---:|---:|---|
| still, play zoom | 2683 / 3366 | 35.0 | 14.8 | 362 | 1¹ | the idle baseline |
| **scout march into new ground** | 5483 / 15649 | 33.3 | 20.6 | 366 | **0** | `setGameState` **52.7 / 183.6 / 116.5 / 104.6 ms** per step; 20 cells charted over 4 accepted steps |
| **overview reveal** (charted → omniscient) | 6716 / 13533 | 23.4 | 12.8 | 1236 | **0** | the whole hidden board enters the pass |
| LOD zoom crossing | 3017 / 5250 | 21.6 | 13.9 | 256 | 0 | crosses the near/far band in 11 frames |
| city screen open | 17 / 1317 | 22.2 | 8.5 | 180 | 0 | the vignette fade only — the DOM panel is the interface's half |
| **end-turn refresh** | 1350 / 6367 | 22.9 | 17.3 | 190 | **1** | `setGameState` **207.5 ms**, turn 121 → 122 |

¹ the seat is handed back at the end of the view sweep, and that flip bakes; the
bake lands in the first workload phase after it.

Three readings worth carrying into wave 2:

- **A unit step costs 100–180 ms of main-thread work on a 41-city map** — that is
  `setGameState`'s layer rebuilds, not drawing, and it is the developed-map cost
  findings 5–7 are about. The old synthetic probe moved one unit on a turn-5 map
  and saw 3.6–13.4 ms.
- **A turn refresh costs 207 ms** on the same map, again before a pixel is drawn.
- **Newly charted ground did not rebake the static sun in this run** (0 bakes
  across four real steps that charted 20 cells), while the end-turn refresh did
  (1). Task #19 states the opposite from source. Do not act on either reading
  until a targeted renderer test says which case bakes — that test is #19's first
  deliverable and this harness is where its measurement should live.

## Memory

| Item | standard-t120 |
|---|---:|
| JS heap in use | 631.3 MiB |
| Board geometry arrays | 213.3 MiB |
| Board instance arrays | 2.1 MiB |
| **Static sun shadow target** (8192², colour + depth) | **512.0 MiB** |
| Counter shadow target (2048²) | 32.0 MiB |
| Composer colour targets (×2, 1100×658) | 11.0 MiB |
| Contact pass targets (half res, ×3) | 2.1 MiB |
| **Render targets, total** | **557.1 MiB** |
| Geometries / textures / programs | 1042 / 25 / 36 |

The shadow map is reported at the size it **actually allocated** — the probe asks
`light.shadow.map`, not the constant it was requested with — and it is 8192² on
this device. The audit's 537 MB estimate was right to the arithmetic: the static
sun target alone is **2.4× the whole board's geometry**, and the render targets
together are 2.6×. Nothing in this ledger is resident GPU memory; no browser will
report that.

## The larger stress map

`painted-integrated-large-t120-2026-09-15.json` · large 104×64 (6,656 tiles), 59
cities (54 walled), 342 units, 337 fields, 127 roads · same viewport, 12 frames a
phase, first 3 warm-up. The review-7 gate's "larger stress map", which no earlier
JSON had.

| View | draws | triangles | main | submit | prep | passes |
|---|---:|---:|---:|---:|---:|---:|
| charted play | 306 | 2.61 M | 20.3 | 5.5 | 15.7 | 5 |
| charted overview | 592 | 3.98 M | 18.9 | 5.6 | 14.8 | 2 |
| omniscient play | 630 | 8.91 M | 23.2 | 6.9 | 12.6 | 5 |
| omniscient overview | **1,726** | **12.80 M** | 31.7 | 23.1 | 8.6 | 2 |
| wrap seam | 482 | 7.32 M | 23.0 | 8.7 | 13.5 | 5 |

| | standard-t120 | large-t120 |
|---|---:|---:|
| Tiles | 4,160 | 6,656 |
| Board build (worker, wall clock) | 6,754 ms | 14,658 ms |
| Board geometry | 213.3 MiB | **336.3 MiB** |
| Board instances | 2.1 MiB | 3.3 MiB |
| JS heap in use | 631.3 MiB | **905.0 MiB** |
| Render targets | 557.1 MiB | **557.1 MiB** |
| `setGameState` per march step | 53–184 ms | 129–226 ms |
| `setGameState` for a turn refresh | 207.5 ms | 276.9 ms |

Two things fall out of that table. **The render-target bill does not move with
the map** — the static sun is 8192² whatever the world is, so the large map gets
the same 512 MiB spread over 60 % more ground, i.e. the shadow density that
finding 3 measures in texels per hex *falls* as maps grow. And **a developed
large map's heap is 905 MiB** with 336 MiB of geometry in it, which is the
memory budget any caching prototype (#21) has to plan against.

The march heuristic walks the piece nearest the fog toward the nearest
unexplored land hex; on this fixture that route charted only **one** new cell in
four accepted steps (against twenty on the standard map), so the large map's
march row measures the refresh cost of stepping, not of revealing. A route
chooser that guarantees a reveal is a worthwhile improvement to the probe.

**Caveat on this run's startup spans.** `begin → assets-loaded` reads 29,954 ms
against the standard run's 1,419 ms for the *same* asset bytes, so this run
shared the machine with other work; its wall-clock stage times are inflated and
the standard run's split is the one to quote. The structural columns — draws,
triangles, geometry, instances, populations — are unaffected.

## What is not measured, and why

- **Hardware frame times.** This harness runs headless on SwiftShader, so
  `frameMs`, `gpuMs` and `cpuRenderMs` are a CPU rasteriser's. The instrument is
  in the renderer, not in the script: open the game with
  `?art=painted&profile=1&benchWorkloads=1` on the reference machine and press
  *Benchmark full map* to get the same payload on a real GPU. Everything
  structural — draws, triangles, passes, bakes, populations, memory, the startup
  split and the `setGameState` costs — is already comparable.
- **Repeated-load peak memory** (#21's prerequisite). It needs a load/dispose
  cycle driven through the landing several times over with the heap sampled
  between, which is a second harness mode; the memory block above is one load.
- **Warm-cache and failed-load startup.** The cold resumed path and the cold
  new-game path are recorded; a second load in the same browser profile, and a
  cancelled or refused load, are not. `--startupOnly` makes both cheap to add.
- **Hover and picking latency.** `pickUnitModel` (finding 12) is a pointer-move
  cost with no frame of its own; it needs an input-driven probe rather than a
  frame sampler.
- **The DOM half of the city screen.** The workload measures the renderer's
  vignette fade; building the panel is `src/ui/`'s cost and belongs to a UI
  measurement.
- **Per-material triangle attribution at overview** (#18's first ask). The sweep
  reports the totals per view, not the split by asset family.

## Rules for quoting these numbers

1. **Never promise 60 fps from a median.** On hardware the play median sits at
   the vsync floor whatever the renderer does; a 16.7 ms p50 says the frame fit
   in the budget, not that the next one will. The p95, the max and the dropped
   fraction are the honest columns.
2. **Software GL is not the user's GPU.** `frameMs` and `gpuMs` here describe a
   CPU rasteriser. Draw calls, triangles, bake counts, render-call counts,
   populations, memory and the startup stage split are hardware-independent;
   frame times are not.
3. **Render-target bytes are arithmetic**, from the sizes actually allocated (the
   shadow map is asked for its own width, not for the constant it was requested
   with). No browser reports resident GPU memory.
4. **Two saves are not a paired speedup.** A before/after comparison must name
   one fixture, one viewport and one machine.
