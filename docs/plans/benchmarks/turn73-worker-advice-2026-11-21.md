# Worker advice on turn 73

## Calling it from the board

Create one reader per game view with `createWorkerAdviceReader()` from `src/ui/workerAdvice.ts`. When a worker is selected, call `reader.read(state, playerId, unitId)` and draw the other selection feedback immediately. When the promise resolves, show its rows only if the same game, revision and worker are still selected. The reader returns `null` for superseded work or worker failure. An empty array means the worker has no eligible target. Call `reader.cancel()` on deselection and `reader.dispose()` when the game view closes. Drawing the pins and the advice panel belongs to the UI handoff.

The worker calls `workerAdvice(state, playerId, unitId)` in `src/ai/bot.ts`. It returns up to three rows within three hexes, ordered by the bot's score. Each row contains `col`, `row`, `improvement`, `action` (build or repair), `delta` (the simulation's change to that tile's yields), and `score`. Placement value also accounts for travel, what a citizen would work, resource access and benefits elsewhere. The score is in the bot's units. Show the yield change to the player.

The policy shares worker claims, danger checks, charge checks and route searches with the bot. A human sees only known targets with a charted route. The bot can choose a more distant tile, a survey or a retreat. A worker waiting for a guard can still improve its own tile.

## Measured cost

The test used the same saved turn 73 state as the [drag investigation](./turn73-drag-and-city-shade-2026-11-21.md). It selected the player's five workers in sequence. The reader opened a real Node worker thread through the same request and response functions used by the browser. The worker received a structured clone of the map on the first request after each revision. Four subsequent revisions repeated that sequence. The calculation produced two, zero, one, three and two recommendations.

| Operation | Time on the calling thread | Time until advice was ready |
| --- | ---: | ---: |
| Synchronous calculation before sharing the seat's context | First call 91.7 ms, most warm calls 19–32 ms | Same |
| First selection with the background reader | 2.39 ms | 990 ms, including the development TypeScript loader |
| First selection after a revision | 1.51–1.65 ms | 35–47 ms |
| Another worker on the same revision | 0.004–0.016 ms | 0.66–2.63 ms |

The initial CPU profile put 490 ms of 571 ms in the bot's economic context across twenty lookups. It compares card drafts, purchases and research to set the prices used by workers. Workers on the same board can now share that context. Uncached calculations run in one background worker. Repeated reads of the same selection reuse the promise. The reader keeps only the latest queued selection. The browser's cold download, initial module load and visible frame times still need measurement when the UI uses the reader.
