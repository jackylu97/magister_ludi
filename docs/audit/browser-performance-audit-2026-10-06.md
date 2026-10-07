# Browser performance audit, 2026-10-06

Scope: everything except GPU rendering (a separate WebGL audit covers that). Load,
main-thread work during play, the DOM UI, memory, and storage. Nothing in `src/`,
`data/` or `test/` was changed. The renderer-side CPU findings of
`docs/plans/painted-performance-audit.md` are not repeated here.

## Summary

The thing a player feels most is **End Turn, and it gets worse with every turn
played**. The bots run synchronously on the main thread (`main.ts:3920`), and on
an Apple-silicon Mac a six-seat Standard game costs about 0.6 s of blocked page
at turn 50, 1.5 s at turn 100 and 8 to 27 s by turns 150 to 200. One bug makes
this much worse: a bot can send the same `moveUnit` hundreds of times in one turn.
The reducer accepts the move as a standing order, nothing changes, and the bot
asks again. The driver only remembers *refused* commands, so the seat runs until
its 400-command budget is spent. That one loop multiplies the turn's cost, adds
about 400 commands a turn to the log, and makes every later save bigger and every
load slower. **Loading a save replays the whole log**, in a worker. That keeps the
page responsive, but a 150-turn save took 77 to 83 s and a 200-turn save 114 s
before the game appeared. In the UI the largest costs are:

- hover work that has no "same hex as last time" check;
- the Compendium, which is built at page load and rebuilt on every open;
- the city panel, which rebuilds itself on every refresh.

Load size is ordinary for a Three.js game (0.96 MB gzipped of eager JavaScript),
but nothing on the game page is loaded lazily. Memory is healthy: no unbounded
caches, no listener leaks that matter, and heap growth over 200 turns is about
14 MB.

## How the numbers were taken

- **Machine:** one Apple-silicon Mac with 10 cores, running Node through
  `vite-node`. Expect a mid-range Windows laptop to be about 2 to 3 times slower.
- **Scripts:** throwaway, in the session scratchpad, outside the repo. They drove
  whole games through the sim's own entry points: `createGame`, `nextBotCommand`
  and `dispatch` (the same loop as `driveSeat`), `driveBots`, `tryReplay`, and
  `makeSavePayload`.
- **Games:**
  - six seats, Standard map (80×52), barbarians on;
  - roster from `rosterFor(6)` with every seat a bot;
  - seed 12345 to turn 200, and seed 777 to turn 150.
- **Seat 0:** a bot here. In a real game it is the human, so the human's End Turn
  costs roughly the five other seats plus the resolution. The figures below say
  which reading they are.
- **CPU profiles:**
  - turns 1 to 100 of seed 777 (`--cpu-prof`);
  - turns 151 to 157 of seed 777, recorded after replaying the log, using the
    inspector API.
- **Replay check:** every replay was compared byte for byte with the live state.
  All matched.
- **Build:** `vite build` into the scratchpad, plus a second build with sourcemaps
  to attribute chunk bytes to source files.

### Measured table

| Reading | Value |
|---|---|
| `newGame` (Standard, 6 seats) | 350–480 ms (runs in the game worker in the browser) |
| Turn 50, all six seats + resolution (seed 777) | 0.63 s |
| Turn 100, same | 1.75 s; seats 1–5 thinking 1.29 s, resolution 0.26 s |
| Turns 91–100 average, resolution only | 0.34 s (`marchExplorers` 102 ms, `collectYields` 96 ms, `barbarians` 58 ms, `wagers` 27 ms) |
| Turns 190–200 (seed 12345, five seats left) | 9.4–27.1 s per turn; resolution about 1.0–1.3 s |
| Longest single bot decision (one `nextBotCommand`) | 0.3 s at turn 100; 2.6–3.1 s at turn 195 |
| Turns where a seat hit the 400-command budget | 26 of 200 (seed 12345, first at turn 84); 22 of 150 (seed 777, first at turn 129) |
| Log at turn 100 / 150 / 200 | 3,142 / 15,368 / 23,006 commands |
| Autosave JSON at turn 100 / 150 / 200 | 206 K / 1,096 K / 1,643 K characters (cap `MAX_SAVE_CHARS` = 2,097,152) |
| `JSON.stringify` / `JSON.parse` of a 1.6 M save | 4–5 ms / 10–15 ms |
| Replay (load) of an 85 / 100 / 150 / 200-turn log | 15.9 s / 17.3 s (with the profiler on) / 77–83 s / 114 s |
| `snapshotState` / `restoreState` / `structuredClone(state)` at turn 150 | 5 / 4–6 / 10 ms; snapshot 1.04 M characters |
| Fresh `valueContext` per seat (what `answerAudience` builds) | 66–336 ms at turn 86; 138–636 ms at turn 150 |
| `readSites` cold / warm | 11–14 ms / under 0.1 ms |
| Yields lens: fold every hex with its owner's context | 12 ms |
| `findPath` + `pathTurnMarks`, 200 hover targets | mean 1.2–2.7 ms, worst 4.6–8.7 ms; `reachableTiles` 0.5–24 ms |
| Node heap after GC, turns 10 to 200 | 119 → 133 MB (includes vite-node) |
| `GameState` JSON, turns 10 to 200 | 785 K → 1,117 K |

---

## Findings, ranked by expected impact

### 1. Bots send the same accepted move hundreds of times in one turn. (Confirmed, measured)

- **Where:**
  - `src/ai/driver.ts:247-277`. The loop bans an identical command only after a
    refusal (`refusedCommands.add(key)` at `:276`). An accepted command is
    never compared with the one before it.
  - `src/sim/commands.ts:2385-2397`. `applyMoveUnit` accepts a move as a
    standing order even when the piece cannot take its first step. CLAUDE.md
    says this is intended: "a move ordered at zero movement is accepted as
    orders".
- **What happened:**
  - Seed 12345, turn 85: unit 269 (a warrior of seat 4) was ordered to
    (31, 34) **388 times**, and unit 369 of seat 0 to (29, 32) **377 times**.
  - The warrior had `movesLeft: 2` (in fifteenths) and a 17-step stored path.
  - Every command came back `{ok: true}`, and the unit was byte-identical before
    and after. Only the revision moved.
- **Cost:**
  - **Turn time.** On a turn with the loop, the looping seat thinks for 1.5 to
    7.3 s instead of 0.1 to 0.6 s. Each turn-85 copy of the order re-runs
    `findPath` and `recomputeVisibility` in the reducer (reduce time 0.9 s that
    turn, against 0.02 s normally), plus a full bot decision.
  - **Log growth.** About 400 commands a turn per stuck seat. In seed 777 the
    log grows by 1,083 commands between turns 100 and 125, then 10,971 between
    turns 125 and 150. Only the second half is stuck seats.
  - **Save size.** 206 K at turn 100 becomes 1,096 K at turn 150. Seed 12345
    reaches 1,643 K at turn 200, 78% of the 2 MB cap. Past the cap the autosave
    fails (finding 6).
  - **Load time.** Every one of those commands is replayed on load (finding 3).
  - **Gameplay.** A seat that spends its budget on one order does nothing else
    that turn.
- **Fix:** in `driveSeat` (and the stepper's mirror loop in `src/ai/stepper.ts`),
  treat "the identical command was accepted and the state's economy and
  revision-relevant facts did not change" as a refusal for loop purposes. The
  simplest rule: remember the JSON of every accepted command in this sitting,
  and break (or ban it) if the same JSON comes round a second time. The root
  cause is the bot re-choosing an order the piece already holds. The cleaner fix
  is in the soldier/campaign arm: an order identical to `unit.path`'s
  destination is not a decision. Either way, add a slow test that plays a long
  bot game and asserts no seat sends the same command twice in one turn.
- **Determinism:** this **changes simulation outcomes** for every bot game from
  the first turn a loop would have happened: different command logs, different
  arena and spectate results, a new baseline for `aiDecision.slow`. Old saves
  still replay, because their logs are what they are. It is a bot-behaviour
  change, not a rules change.
- **Risk:** low for the driver guard, medium for the root-cause fix in the
  policy.

### 2. End Turn runs every bot on the main thread, and the cost grows with the game. (Confirmed, measured)

- **Where:**
  - `src/main.ts:3920` (`onBeforeEndTurn: () => driveBots(...)`);
  - `src/main.ts:5815-5843` (`pressEndTurn`: one rAF and one `setTimeout`, then
    the whole drive in one task);
  - `src/ai/driver.ts:124`.
- **Cost (this machine, seats 1–5 plus resolution, no loop bug):**
  - about 0.5 s at turn 50;
  - about 1.5 s at turn 100;
  - about 2.5–4 s at turns 115–125;
  - 9–27 s by turns 190–200 (seed 12345).
  - A mid-range laptop is roughly two to three times these figures. The tab
    cannot repaint, scroll a panel or animate the "working" button for the whole
    time. A single decision took up to 3.1 s late in the game, so even slicing
    between decisions would still leave multi-second stalls.
- **Where the time goes, turns 1–100** (CPU profile; bot 66%, resolution and
  reducer 25–28%):

  | Area | Share |
  |---|---|
  | `seatContext`/`valueContext` | 33% |
  | `techChain` → `priceCopy` → hypothetical `explainCity` per town per building (`src/ai/chain.ts:498`, `:864`) | 29% |
  | `housekeeping` (`bot.ts:1374`) | 23% |
  | `reaimBeeline`/`techGoalTable` | 19% |
  | `marchExplorers` in the resolution | 9% |

- **Where the time goes, turns 151–157** (8.6–14.2 s per six-seat turn):

  | Area | Share |
  |---|---|
  | Pathfinding (`searchPath`, `src/sim/pathfind.ts:2001`) | 29% |
  | The army arms (`wakeTheCampaign` `bot.ts:2043`, `soldierCommand` `:6740`, `campaignPlan` `:7531`, `musterHex` `campaign.ts:518`) | 22% |
  | Trader route gating (`traderCommand` `bot.ts:8296` → `startRouteError` → `gateRoute` → `routeLegPath`/`surveyRoute`, `trade.ts:879-1235`, a pathfind per candidate route) | 15% |
  | `valueContext` | 17% |
  | The reducer | 19% |

- **Fix (two parts, both worth doing):**
  - **(a) Move the drive into a worker, the way the arena and the loader already
    do.**
    - A "twin" worker holds its own `Game` built from the same `{config, log}`.
    - Every command the main thread accepts is posted to it, and the twin applies
      it with `dispatch`.
    - On End Turn the worker runs `driveBots` and posts back the list of bot
      commands plus their `CommandResult`s.
    - The main thread then either replays those commands through `dispatch`
      (pays the reducer, about 20% of the turn, and keeps every UI seam
      unchanged) or adopts the worker's finished state by structured clone
      (10 ms at turn 150) and replays only the reports.
    - `answerAudience` (`driver.ts:162`) must move with it, because the bot's
      refusal memory (`src/ai/dealMemory.ts`) is a `WeakMap` on whichever state
      object the bot reads.
    - Pin it with a test of the `test/ui/gameLoader.test.ts` kind: worker-driven
      turn == main-thread turn, byte for byte.
  - **(b) Cut the bot's own work.** These are pure-cache changes that return
    identical answers:
    - memoise `zocField(state, owner)` and `transitField` on the slate (revision
      clock), since they are rebuilt per `findPath` call (`pathfind.ts:1498`);
    - memoise a trade leg's survey per (from, to, mode, revision) inside a
      sitting;
    - keep `nodeGifts`/`techChain` results across the sitting's commands that
      did not move the economy clock.
- **Determinism:**
  - (a) changes no outcome if the twin is fed exactly the accepted commands in
    log order. That is the whole design, and the test above is what proves it.
  - The memo changes in (b) change no outcome as long as the cached value is the
    one the uncached call would have returned. The slate's shadow mode
    (`setSlateShadow`) can check this.
  - Replacing per-unit A* with a shared flood **would change outcomes**: equal-cost
    paths tie-break differently. Do not do that without saying so.
- **Risk:** (a) medium (two live copies of the state must never drift: any
  main-thread mutation outside `dispatch` would break it, and hard rule 1 says
  there are none). (b) low.

### 3. Loading a save replays every command, and a long game takes over a minute. (Confirmed, measured)

- **Where:**
  - `src/ui/gameLoader.ts:217-266` → `src/ui/game.worker.ts` → `tryReplay`
    (`src/sim/game.ts:127`).
- **Cost:**

  | Save | Commands | Replay time |
  |---|---|---|
  | 85 turns | 3,230 | 15.9 s |
  | 150 turns | 15,368 | 77–83 s |
  | 200 turns | 23,006 | 114 s |

  - The walk is about 1.7× the in-game reducer and resolution time, because no
    bot reads have warmed the slate.
  - The P7 figure quoted in `gameLoader.ts` (3.9 s for 121 turns) came from a
    much smaller game.
  - The page stays responsive because this runs in the worker, but the player
    waits that long after pressing Continue. Finding 1 inflates it further.
- **Fix:**
  - Keep `{config, log}` as the save of record.
  - Add a **checkpoint cache** beside it: at each autosave, store
    `structuredClone`-able state in IndexedDB (10 ms to clone at turn 150), keyed
    on `SCHEMA_VERSION`, the build id, a hash of the config and the log length
    plus a hash of the log.
  - On load, if the key matches, adopt the checkpoint and replay only the tail.
    Otherwise walk the whole log as today.
  - Do not use `snapshotState`/JSON for it. The loader's docblock notes that JSON
    loses `NaN`, `undefined` keys and key order, and the structured-clone seam
    does not.
- **Determinism:**
  - A checkpoint is valid only if it is byte-identical to what the replay would
    build. A rules change between builds silently breaks that, which is why the
    build id must be in the key.
  - Never write a checkpoint that was not produced by the same code that reads
    it.
  - Add a slow test: checkpoint + tail == full replay.
- **Risk:** medium (cache invalidation is the whole risk; the fallback is today's
  behaviour).

### 4. Every pointer move recomputes the hover readout, the path preview and the combat forecast. (Confirmed by trace)

- **Where:**
  - `src/ui/controls.ts:7854` (`pointermove`) → `refreshHover` (`:7786`) →
    `refreshPathPreview` (`:4736`) and `onHover` → `updateContext`
    (`src/main.ts:2464`).
  - A drag falls through to the same path on every pan frame, and so does every
    wheel event (`controls.ts:7942`).
- **Cost per event:**
  - one `findPath` + `pathTurnMarks`: measured mean 1.2–2.7 ms, worst 4.6–8.7 ms,
    with three whole-map typed arrays (about 54 KB on Standard, about 260 KB on
    Giant) allocated per search;
  - a fresh `yieldContextFor`;
  - `previewCombat`, up to 36 times when `standToStrike` searches for a standing
    hex;
  - about 12 info-row writes and 20–40 new nodes.
  - Pointer events arrive at 60–120 Hz, mostly within one hex. That is 10–30% of
    a frame's budget spent on unchanged answers, plus steady garbage (about
    31 MB/s at 120 Hz on Giant when a goal floods the map).
  - Under the faith lens the card also forces a layout on every drawn frame
    (`main.ts:5405-5420` → `infoCard.ts:349-368`).
- **Fix:**
  - Build a key in `refreshHover` from: hovered col/row, `selectedId`, the
    selected unit's col/row, `state.revision`, `localPlayerId`, lens, move mode,
    buy mode and the open city.
  - Skip `refreshPathPreview` and `onHover` when the key is unchanged.
  - Skip hover work entirely while `dragging`, and run it once on drag end.
  - For the faith card, write only `left`/`top` when the city under the pointer
    has not changed.
- **Determinism:** none; UI only.
- **Risk:** low to medium. A key input left out leaves the readout stale until
  the next hex.

### 5. The Compendium is built at page load and rebuilt on every open. (Confirmed by trace; generation time measured by the DOM sub-audit)

- **Where:**
  - `src/main.ts:1057` calls `createCompendium` at module scope.
  - `src/ui/compendium.ts:3283-3288`: `draw` calls `view.refresh()`, which
    re-runs `compendiumSections()`, and then `show()`.
  - Keyword links re-open it through `setKeywordOpener`.
- **Cost:**
  - **At load:** `compendiumSections()` makes 1,313 entries in about 140 ms
    before the landing screen responds. That is the largest single item on the
    path to first interaction after script evaluation.
  - **On every open or keyword click:** about 140 ms of generation, then shelf
    draws of up to about 19,700 nodes (Orders).
  - **Bundle:** the module is 111 KB (38 KB gzipped) and is preloaded eagerly.
  - **Search:** redraws on every keystroke with no debounce (`compendium.ts:3213`).
- **Fix:**
  - Build lazily on first open, through a dynamic `import()` so the chunk leaves
    the eager set.
  - Generate the sections once per page, since they do not depend on
    `GameState`.
  - Debounce search, or redraw only when the filtered id list changes.
  - `compendium.html` keeps its synchronous mount.
- **Risk:** low. The first open becomes one tick asynchronous.

### 6. The autosave gets close to the 2 MB cap and the browser quota, and it is written synchronously every turn. (Confirmed, measured)

- **Where:**
  - `src/main.ts:4064` → `src/ui/saves.ts:588-606` (`createAutosaver`) →
    `writeSave` (`:244-270`), `MAX_SAVE_CHARS` (`:90`).
- **Cost:**
  - **Stringify:** 4–5 ms at 1.6 M characters, plus a synchronous
    `localStorage.setItem` of the same string (not measurable in Node; see the
    last section).
  - **Size:** 1.1–1.6 M characters by turns 150–200 in both measured games.
    Finding 1 is most of that, but even a clean game adds 2–7 K a turn.
  - **Quota:** `localStorage` holds about 5 MB per origin, and some browsers
    count it in UTF-16 bytes. An autosave plus a quicksave of a turn-200 game
    may not both fit.
  - **After a failure:** the autosaver warns once and then keeps stringifying the
    whole log every turn, to fail again.
- **Fix:**
  - Fix finding 1 first.
  - Then stop retrying after a size failure until `autosave.reset()`.
  - Move saves to IndexedDB, which allows larger values, writes asynchronously
    and takes structured clone. That also gives finding 3 a place to live.
  - Optionally compress with `CompressionStream('gzip')`. Command JSON is highly
    repetitive.
- **Determinism:** none, as long as the stored log is the log.
- **Risk:** low for the retry guard; medium for the storage move (migrating
  existing slots).

### 7. The open city panel rebuilds from scratch on every refresh and runs a "what if" fold per buildable row. (Structure confirmed, cost suspected)

- **Where:**
  - `src/ui/cityPanel.ts:3476` (`replaceChildren` of everything);
  - one `explainBuildingPreview` per building or wonder row (`cityPanel.ts:2712`
    → `src/sim/yields/town.ts:537`).
- **What one preview does:** `explainCity` and `foldCity` twice, the card city
  yields twice, and every worked tile's yield twice.
- **Cost:** with 25–40 rows that is about 40 city evaluations and 600–1,200 nodes
  per render. A cold `readCity` for nine towns measured 4 ms, so the estimate is
  5–20 ms per render. It runs on every pin, tab or buy-mode click, and
  `updatePanel` often runs two or three times in a row (`main.ts:5450-5590`
  after controls' own `onUpdate`, and three times on End Turn).
- **Fix:**
  - Compute the "before" half once per render.
  - Cache previews on (revision, city, building).
  - Delete the duplicate `updatePanel` calls.
- **Determinism:** none. The preview folds are pure.
- **Risk:** low.

### 8. A bot answers a human's proposal on the main thread with a freshly built context. (Confirmed, measured)

- **Where:**
  - `src/ai/driver.ts:175`: `const ctx = valueContext(state, seat)` inside
    `answerAudience`, called from a click in the diplomacy screen.
- **Cost:** 66–336 ms per seat at turn 86, and 138–636 ms at turn 150. The click
  freezes for that long before the envoy's answer appears.
- **Fix:** run it in the twin worker from finding 2(a), or at least show the
  sheet's pending state for a frame before calling (the `pressEndTurn` pattern).
- **Determinism:** none.
- **Risk:** low.

### 9. The game page loads every screen eagerly. (Confirmed, build output)

- **Where:**
  - `vite.config.ts:66-76`: eight HTML inputs, no `manualChunks`;
  - `src/main.ts:41-248`: about 120 static imports;
  - the only dynamic import on the game page is `cities3d` in
    `renderer3d.ts:909`, which is also imported statically.
- **Cost:** the built `index.html` modulepreloads 43 files: 3.25 MB raw,
  0.96 MB gzipped. The largest:

  | Chunk | Raw | Gzipped | Contents |
  |---|---|---|---|
  | `pathfind-*.js` | 790 KB | 216 KB | the whole sim plus inlined `data/*.json` |
  | `three.module` | 608 KB | 155 KB | Three.js |
  | `main` | 361 KB | 119 KB | the UI |
  | `bot` | 196 KB | 62 KB | the AI |
  | `settlementAssets` | 171 KB | 58 KB | GLTFLoader, GTAO, terrain-study code |
  | `improvementData` | 169 KB | 41 KB | data |
  | `compendium` | 111 KB | 38 KB | the Compendium |

  - Also: the frozen 2D renderer (`src/render/`, about 18 KB) and
    `religionScreen` (40 KB).
  - Separately, the game worker (1.02 MB raw, 270 KB gzipped, a second full copy
    of the sim) and the painted-board worker (349 KB raw, 99 KB gzipped). These
    load off the main thread but cost bandwidth.
  - The sim worker bundle evaluates in 57–83 ms in Node. `gameLoader.ts` measured
    about 400 ms to warm it in a browser.
  - The Google Fonts stylesheet (`index.html:13-16`) is render-blocking and
    cross-origin.
- **Fix, in order of value:**
  - lazy-load the Compendium (finding 5);
  - lazy-load sheets opened rarely or late: Abacus, census, reliquary, diplomacy
    review, victory, the 2D renderers behind `artMode()`;
  - set `json: { stringify: true }` in `vite.config.ts`, so the 650 KB of
    `data/*.json` is parsed as `JSON.parse` strings rather than JavaScript object
    literals (faster in V8 for large objects; named JSON exports are unused,
    since every import is a default import);
  - load the font CSS without blocking (`media="print"` swap, or preload plus
    `onload`).
- **Determinism:**
  - `json.stringify` produces the same values in the same key order.
  - Dynamic imports change only when code arrives. A lazily loaded sheet that a
    blocker opens needs a ready promise, or End Turn could reach for it before it
    loads. `staleDeploy.ts` already handles a 404 on a missing chunk.
- **Risk:** low per sheet.
- **Expected gain:** suspected tens of KB gzipped and tens of milliseconds of
  parse and evaluate. Measure it (see the last section).

### 10. The landing screen parses every save in full to print four labels. (Confirmed by trace)

- **Where:**
  - `src/ui/savesPanel.ts:179-190` (`recentWorlds` → `listSaves` →
    `readSlot`, which does `JSON.parse` of each whole slot, then `figureOf`,
    which parses the newest four again);
  - `src/main.ts:1190` (`refreshResumeRow`, on landing and after loads).
- **Cost:** parsing a 1.6 M save took 10–15 ms. With an autosave, a quicksave and
  a few named saves of a long game, that is roughly 50–150 ms on the landing
  path.
- **Fix:** write a small `webciv:save-meta:<slot>` key beside each slot (name,
  turn, seed, size, seats, seat-0 figure, savedAt) and list from that.
- **Determinism:** none.
- **Risk:** low.

### 11. A warm simulation worker is kept idle for the whole game. (Confirmed mechanism, size suspected)

- **Where:** `src/ui/gameLoader.ts:169-172`. `finish()` calls `warmGameWorker()`
  after every create or load.
- **Cost:** one worker that has evaluated the 1 MB sim bundle and every data
  table sits idle in its own heap all game. The likely size is 10–30 MB.
- **Fix:** warm only while the landing or saves panel is up, and terminate the
  warm worker once the game is playable. If finding 2(a) lands, this worker
  becomes the twin and stops being waste.
- **Risk:** low.

### 12. Smaller per-refresh costs. (Confirmed calls, cost suspected; low)

- **Top bar** (`topBar.ts:1446`): `civYields.render` recomputes
  `explainEmpireGold` (including the road-network flood), happiness, authority
  and renown on every `updatePanel`, including selection-only passes. Gate the
  sim reads on (revision, seat), as `holdingsRail.ts:153` does.
- **Tutorial meter check** (`main.ts:2683`): `noteMeterPain` runs unmemoised
  `happinessOf`/`authorityOf` for every *bot* command while the tips are unread,
  about 100 or more times per End Turn. Return early for commands that are not
  the local seat's.
- **City banners** (`cityBanners.ts:921`): `siegeField` is rebuilt per owner on
  every banner refresh (two map-sized typed arrays each). Memoise on the unit
  fingerprint.
- **Star chart** (`techTree.ts:1376`, `:1483`): renders twice per click, and
  `drawLines` (`:1818`) interleaves `offsetLeft`/`offsetHeight` reads with
  `<path>` appends, so it can force up to 63 layouts. Read all geometry first,
  then append once.
- **Repositioners** (`cityBanners.ts:1612`, `tilePriceTags.ts:307`,
  `damageNumbers.ts:122`): write styles every drawn frame even when nothing
  moved, and damage numbers use `left`/`top`. Cache the last position, and use
  `transform`.

---

## Already done well

- **Simulation creation and replay** run in a worker (`gameLoader.ts`,
  `game.worker.ts`), with a byte-identical test and a synchronous fallback. The
  board build has its own worker.
- **End Turn** paints the "working" state before the drive (`pressEndTurn`'s rAF
  plus `setTimeout`), so the press is at least acknowledged.
- **Memos:**
  - The slate memos (`readings.ts`, `slate.ts`) are `WeakMap`s on the state,
    dropped whole when a clock moves. They cannot grow without bound and never
    reach a save.
  - `readSites` is warm in under 0.1 ms.
  - The yields lens folds once per change, not per frame (12 ms for the whole
    map).
- **Visibility** uses a `Uint8Array` per recompute and returns a delta, so the
  board is patched rather than rebuilt.
- **The pathfinder** uses a binary heap with a total order and typed arrays.
- **No leaks:**
  - No unbounded caches in `src/sim`, `src/ai` or `src/ui`. Module-level maps are
    keyed by data rows.
  - `notificationLog` is capped at 100 per seat; `ledgerHistory` is a 400-entry
    ring.
  - Every window or document listener added per boot is registered in
    `gameDisposers`.
  - Restart and load go through `adoptGame`, which clears the per-game stores.
  - Heap after GC grew 14 MB over 200 turns, in line with the state growing
    from 785 K to 1,117 K.
- **The renderer** draws on demand, and the UI has no rAF loop of its own.
  Modal sheets redraw only while open.

## What a real browser should measure

These are things static reading and Node could not settle.

1. **End Turn on target hardware.** Use the Performance panel on a mid-range
   Windows laptop.
   - Play, or load, a six-seat Standard save at turns 50, 100 and 150 and record
     one End Turn each.
   - Read the long task's length and the split between `driveBots` and
     `runEndOfTurn`. Adding `performance.mark` around `driveBots` in `main.ts`
     makes this one number.
   - This decides whether finding 2(a) is needed now or after 2(b).
2. **`localStorage.setItem` of a 1–2 M character autosave.** Wrap
   `autosave.save` in `performance.mark`/`measure` and record the time in
   Chrome, Firefox and Safari.
   - Also fill the autosave, the quicksave and two named slots with a turn-200
     game to find each browser's quota failure point.
3. **Continue on a long save.** Record wall time from the press to the first
   board frame for a turn-150 save. The loader already stamps `lastLoaderMetrics`
   and the `magisterludi:*` marks. This is the before-and-after figure for
   finding 3.
4. **Hover cost.** Record 5 s of slow pointer movement over a developed empire
   with a soldier selected, then with the faith lens up.
   - Look at the self time of `refreshHover`, the `findPath` calls, the
     allocation rate (Memory → allocation sampling) and forced reflows (purple
     "Layout" blocks attributed to `showBox`).
   - Repeat with a trackpad scroll to check the wheel path.
5. **Time to interactive.** Use a throttled ("Fast 4G", 4× CPU) cold load of
   `index.html`. Read FCP (the Google Fonts block), the script evaluate time per
   chunk, and the `createCompendium` task at module evaluation. Repeat after
   lazy-loading the Compendium.
6. **The idle warm worker.** Take a heap snapshot (Memory → select the worker's
   isolate) during play to confirm finding 11's size.
7. **Bot-loop frequency in real play.** Count turns where any seat's accepted
   commands reach `ai.driver.commandsPerSeat`. A console line in `driveSeat`
   when `accepted + refused` reaches the budget would make it visible. Both
   seeds measured here hit it, starting at turns 84 and 129.
