# Mid-turn unit latency on the Apple M4

On the turn 120 save, picking, movement range and board updates took time during selection. The first move also updated sight and refreshed the HUD. Across 24 selections and eight moves, the game made 600 reads of city yields, empire yields or empire meters. None of those interactions called `explainCity` or `explainEmpireLines` to calculate a full yield breakdown before visible feedback. Commands that change the economy or reveal new ground can produce different results. [Per-click measurements](midturn-latency-2026-11-20.json)

## Response times

An alternate route on the same save shows when a move can trigger those calculations. A swordsman walked through Dawnreach on its way to (51,24). Entering and leaving the city each invalidated the economy cache because a city can read its garrison. The move revealed no new tiles. The deferred HUD refresh then recalculated 17 city yield lists and one empire yield list between the first and second walking draws.

With bot preparation off, those calculations took 6.3 ms within an 11.5 ms HUD refresh. With preparation on, they took 8.5 ms within a 13.5 ms HUD refresh. The second capture identified the caller. The yield strip at the top of the screen made the empire read and triggered all 18 calculations. The move command itself took 2.5 ms in each capture. The model reached one CSS pixel after 39.2 and 43.2 ms. This was one route tested twice. It identifies a source of mid-turn work without establishing how often it occurs in a full game. [Alternate route, commands and timings](midturn-latency-2026-11-20.json)

The table gives milliseconds from pointer release to a submitted board draw. Each selection rebuilt its ring on the intended tile. Each move displaced the intended walking model by at least one CSS pixel under the current camera. Later selections are the median of five clicks. [Timings and display boundaries](../../../scripts/input-latency/README.md)

| Run order | Bot preparation | First selection | Later selections | First move | Second move |
|---|---|---:|---:|---:|---:|
| 1 | On | 30.6 | 19.4 | 45.4 | 35.4 |
| 2 | Off | 39.4 | 17.0 | 37.4 | 35.5 |
| 3 | Off | 35.4 | 19.3 | 40.8 | 35.2 |
| 4 | On | 36.1 | 16.4 | 40.8 | 32.0 |

- **Input delivery.** Chrome delivered all 32 releases to the page within 0.3 to 1.5 ms of their input timestamps. The last five selections in each run generally answered in one or two display intervals.
- **First selection.** The board spent 8.7 to 11.0 ms updating its layers. Exact model, badge and ground picking together took 5.9 to 8.4 ms. The movement range also checks whether nearby friendly units could swap places. These costs depend on the unit and the board around it.
- **First move.** The reducer took 2.7 to 3.9 ms, including 1.7 to 2.4 ms to update sight. The board spent 4.0 to 5.1 ms updating layers. The main HUD refresh took 5.2 to 7.7 ms. In all eight moves the first drawn pose moved 0.11 to 0.53 CSS pixels. The second draw crossed one pixel. Measuring only the command or the next render would miss that delay.
- **Bot preparation.** The coordinator's request overlapped five of 16 inputs in the enabled runs. The page spent zero time posting a bot request during those five windows. Both second moves overlapped planning and took 35.4 and 32.0 ms. The matching moves with preparation off took 35.5 and 35.2 ms. These samples give no stable latency penalty for leaving planning on. A worker can run while the main thread handles input. Its elapsed time includes waits for seat workers and does not measure the CPU capacity taken away from rendering. [Phase timings, worker intervals and walking distances](midturn-latency-2026-11-20.json)

Sampling the first walking pose after board updates is worth testing. A second candidate is the HUD refresh that can run between the first and second walking draws. Compare one change at a time against the same actions. The captures measure submission by the game. A later compositor event can still contain an earlier frame.

## Reproduce the measurement

The capture used game commit `d77c22c5`, a fixed camera radius of 7, seat 0, 489 units and 74 cities. The painted board used the default 1.5× resolution at 2205 by 1189 buffer pixels. Chrome reported Apple M4 Metal and ten logical processors. Four fresh headless Chrome processes ran in sequence. The central test suite had finished and the playtest server had no connected clients before the captures. Other Mac applications could still use the CPU or GPU. The fixed inputs and full save hash are in the measurement file. [Environment and inputs](midturn-latency-2026-11-20.json)

```sh
node scripts/input-latency/check.mjs
gzip -dc scripts/input-latency/fixtures/turn120.json.gz > /tmp/magister-input-turn120.json
node scripts/input-latency/run.mjs --snapshot /tmp/magister-input-turn120.json \
  --actions scripts/input-latency/turn120-actions.json \
  --modes on,off --out /tmp/unit-on-off.json
node scripts/input-latency/run.mjs --snapshot /tmp/magister-input-turn120.json \
  --actions scripts/input-latency/turn120-actions.json \
  --modes off,on --out /tmp/unit-off-on.json
```

The same runner accepts an exported save and can find its own legal targets. Each run outputs full nested spans, main-thread times counted once, worker request windows, input queue times and walker displacements. It requires Chrome and Playwright. [Setup and report fields](../../../scripts/input-latency/README.md)

To reproduce the move through Dawnreach, use the second action list with the same snapshot. [Dawnreach actions](../../../scripts/input-latency/turn120-city-actions.json)
