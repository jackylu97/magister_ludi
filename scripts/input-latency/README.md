# Measure unit selection and movement

Run this diagnostic to see which work delays a player's click. It uses the ordinary game, a private loopback server and a fresh headless Chrome profile per run. It keeps generated timing hooks on that server. The game build and the simulation source have no diagnostic dependency.

## Run a comparison

Use a game exported from the Saves panel, with a human seat that can still move two pieces. Install the project's dependencies and use a local copy of Playwright and Google Chrome. If Playwright is installed outside this checkout, set `PLAYWRIGHT_MODULE` to the absolute path of its `index.mjs`. If Chrome has a custom location, set `CHROME_EXECUTABLE` to its executable.

```sh
node scripts/input-latency/check.mjs
node scripts/input-latency/run.mjs --save ~/Downloads/game.json --out /tmp/unit-latency.json
```

The runner opens the visible player's first city or unit at a camera radius of 7. It finds two pieces with legal destinations in that view. It sends the same screen coordinates in both runs, validates the selected unit and the move command, and reports the first board draw with visible feedback. If a tutorial tip covers the next target, the runner dismisses it with Escape before timing that input. The report records these dismissals and checks they agree between runs. Supply a fresh output filename. The JSON includes the save hash, input sequence, browser GPU, buffer size, per-click spans and bot requests.

The default sequence enables bot preparation first and disables it second. To check run order, use a fresh report and `--modes off,on`. Each mode gets a new profile on an isolated origin. Play an ordinary turn on a different device or after the measurement if you want comparable GPU timings.

For a trusted developer snapshot containing `config`, `state` and `log`, pass `--snapshot FILE`. This mode skips save replay. The following fixed positions reproduce the turn 120 fixture used in the rendering audit. Only this fixture at the specified viewport uses these positions.

```sh
gzip -dc scripts/input-latency/fixtures/turn120.json.gz > /tmp/magister-input-turn120.json
node scripts/input-latency/run.mjs --snapshot /tmp/magister-input-turn120.json \
  --actions scripts/input-latency/turn120-actions.json \
  --modes on,off --out /tmp/turn120-unit-latency.json
```

Automatic target selection queries models and movement ranges in both profiles. To measure the first gameplay selection without that preparation, copy the report's `actions` array into a file and rerun with `--actions FILE`. In either case the pointer crosses each target before the press, so the game's ordinary hover can warm a pick. The runner uses the normal 1.5× resolution and waits for ground paint before sending clicks.

## Read one interaction

| Report field | What it measures |
|---|---|
| `pressQueue`, `releaseQueue` | Time from the timestamp sent with the trusted Chrome input to the page's capture listener. This covers input delivery and queuing. It excludes a physical mouse and its driver. The timestamp has millisecond precision. |
| `pressToDraw`, `releaseToDraw` | Time from the press or release to submission of the first board draw with feedback. A selection must rebuild a ring on the intended unit's tile. For a move, the walking model must travel at least one CSS pixel under the current camera projection. Vertical terrain displacement is excluded. |
| `walkFrames` | Horizontal displacement in CSS pixels for each submitted walking frame through the first visible step. A rendered frame can move less than a pixel. |
| `spans` | Synchronous main-thread operations with start, end and nesting depth. These include exact picks, movement range, route and landing checks, reducer work, visibility, city and empire readings, yield recalculation, HUD work, board layers, and the colour draw. |
| `ms.exclusive` | Time from the release listener to that draw, assigned to the innermost measured operation. A route lookup within the reducer counts once under route. The raw parent span still shows the reducer's total. These are elapsed times on the main thread. A thread suspended by the OS can also make a span longer. |
| `ms.unattributed` | Elapsed time outside the measured functions. It can include waiting for the next frame, unmeasured JavaScript, browser work and scheduling. The diagnostic cannot split those causes. |
| `nextCompositorEventAfterDraw` | Time from draw submission to Chrome's next display event, if present. Chrome can present a previously submitted frame at that event. This field gives no exact monitor scanout time for the selected piece. |
| `botOverlap` | Background bot requests in flight during the release-to-feedback interval. `mainThreadPostMs` measures synchronous posting on the page. `confirmedCoordinatorMs` measures overlap with the coordinator's elapsed request window, including waits for its seat workers. A missing worker window is reported as unknown. |

A worker can run during a click while the page remains responsive. Worker overlap alone cannot establish UI blocking or CPU contention. Look at the release queue and main-thread phases in matched on/off runs. `recalculate yields` identifies the measured city or empire calculations. An `economy readings` entry can also be a cache hit. If the visible step takes a second frame despite a short command, check `walkFrames`, board updates and time between draws. The `duringPressQueue` and `duringReleaseQueue` maps show measured main-thread work that overlaps input delivery. The data records work until the first visible response. Later HUD refreshes can affect the next interaction.

The turn 120 audit provides an earlier example. The first swordsman selection spent 8.8 ms picking, 3.8 ms calculating the range and 3.2 ms updating the HUD. In four separate moves, the first draw moved the piece less than half a CSS pixel. Those captures did not record the input queue or bot-worker overlap. [Earlier phase and displacement measurements](../../docs/plans/benchmarks/unit-interactions-2026-11-20.json)

Four captures from this runner cover 32 matched selections and moves with bot preparation on and off. [November 20 findings](../../docs/plans/benchmarks/midturn-latency-2026-11-20.md)

## Check the turn 120 yield counts

Use the raw JSON files from the two known-ground runs in the measurement report. This check runs offline. It checks the snapshot hash, the exact actions, each observed interaction and the order of the bot modes. It counts calls from the release listener to the first visible board response. [Capture commands](../../docs/plans/benchmarks/midturn-latency-2026-11-20.md)

```sh
node scripts/input-latency/check-yields.mjs known-ground /tmp/unit-on-off.json /tmp/unit-off-on.json
```

Each of the 32 known-ground clicks has a budget of **zero** fresh city and empire yield breakdowns. The recorded runs contained 600 calls to economic readers. The check counts calls to `readCity`, `readEmpire` and `readMeter` separately from the two operations that build the breakdowns, `explainCity` and `explainEmpireLines`. A lower reader count is allowed.

For Dawnreach, capture `turn120-city-actions.json` with both bot modes. Pass one paired file, or two single-mode files, to the checker.

```sh
node scripts/input-latency/check-yields.mjs dawnreach /tmp/dawnreach-on-off.json
```

The final move passes through Dawnreach and leaves its garrison as it started. All eight clicks now have a budget of **zero fresh city and empire breakdowns** in each mode. Before the cache change, the last click rebuilt 17 city lists and one empire list in each mode. The budget ends at the first visible response. A move that stops in the city can change its income and has a separate simulation test.
