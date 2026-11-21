# Worker advice on turn 73

## Calling it from the board

Create one reader per game view with `createWorkerAdviceReader()` from `src/ui/workerAdvice.ts`. When a worker is selected, call `reader.read(state, playerId, unitId)` and draw the other selection feedback immediately. When the promise resolves, show its rows only if the same game, revision and worker are still selected. The reader returns `null` for superseded work or worker failure. An empty array means the worker has no eligible target. Call `reader.cancel()` on deselection and `reader.dispose()` when the game view closes. The board draws corner marks on the recommended hexes. The hover panel shows the job and yield changes from the same reply.

The worker passes the board’s advice settings to `workerAdvice` in `src/ai/bot.ts`. It returns up to three rows within four hexes, ordered by the bot’s score. A later row must score at least 60% of the first legal job. Each row contains `col`, `row`, `improvement`, `action` (build or repair), `delta` (the simulation's change to that tile's yields), and `score`. Placement value also accounts for travel, what a citizen would work, resource access and benefits elsewhere. The score is in the bot's units. Show the yield change to the player.

The policy shares worker claims, danger checks, charge checks and route searches with the bot. A human sees only known targets with a charted route. The bot can choose a more distant tile, a survey or a retreat. A worker waiting for a guard can still improve its own tile.

## Measured cost

The original timing used a three-hex search radius. The test used the same saved turn 73 state as the [drag investigation](./turn73-drag-and-city-shade-2026-11-21.md). It selected the player's five workers in sequence. The reader opened a real Node worker thread through the same request and response functions used by the browser. The worker received a structured clone of the map on the first request after each revision. Four subsequent revisions repeated that sequence. The calculation produced two, zero, one, three and two recommendations.

| Operation | Time on the calling thread | Time until advice was ready |
| --- | ---: | ---: |
| Synchronous calculation before sharing the seat's context | First call 91.7 ms, most warm calls 19–32 ms | Same |
| First selection with the background reader | 2.39 ms | 990 ms, including the development TypeScript loader |
| First selection after a revision | 1.51–1.65 ms | 35–47 ms |
| Another worker on the same revision | 0.004–0.016 ms | 0.66–2.63 ms |

The initial CPU profile put 490 ms of 571 ms in the bot's economic context across twenty lookups. It compares card drafts, purchases and research to set the prices used by workers. Workers on the same board can now share that context. Uncached calculations run in one background worker. Repeated reads of the same selection reuse the promise. The reader keeps only the latest queued selection. These measurements exclude the browser’s download, module load and board rendering.

## Selecting workers in Chrome

The combined build used Claude’s board marks and hover panel with the background planner. A private headless Chrome session on the M4 opened the saved turn 73 board. The viewport was 1280 by 800, with a device pixel ratio of one and bot turn preparation off. Three real pointer clicks selected workers without issuing any game commands.

| Worker in selection order | Release to first board draw showing the selection | Release to advice reply | Release to first draw with advice marks |
| --- | ---: | ---: | ---: |
| 479, first request | 70.8 ms | 221.5 ms | 236.1 ms |
| 487 | 24.9 ms | 30.5 ms | 37.0 ms |
| 497 | 15.2 ms | 17.7 ms | 25.0 ms |

Posting the board for the first request took 2.1 ms. The other two requests reused that board. The three workers received one, three and one recommendations. Their coordinates, improvements, scores, distances and yield changes matched a direct call to the bot’s planner with the board settings. Hovering a marked tile showed the corresponding improvement and yield changes in each case. The selection drew before its advice arrived in all three cases. Each row is one click. The timing ends when the draw returns on the main thread.
