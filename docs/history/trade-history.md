# Trade — the measurements behind the sheet

Cut out of `docs/trade.md` on 2026-09-11. The timing benches that decided the
one-reading design of the Trade screen. The rules are in the reference.

### Measured (batch R2)

A twelve-town late board (eight of this seat's, four of a rival's, six buildings
apiece, **88 ordered pairs**), warm, median of five interleaved runs:

| | open | redraw (tab, filter, sort, toggle) |
|---|---|---|
| the old screen | 33.5ms | **33.5ms** — every redraw re-walked every pair |
| the sheet | 67.1ms | **0.29ms** |

The open costs about twice as much because the reading carries about twice as
much: a fold *per mode* with the sea premium in it, the paving count, the march's
turn count and the post's reach, where the old screen took one fold and the gate.
What it buys is the second column. The old screen paid its whole walk again for a
sort chip; opening the sheet and pressing three tabs was 134ms and is now 68ms,
and an idle `refresh` is **free** — `draw` fingerprints the revision plus every
control on the sheet and returns without touching the DOM when nothing moved.
Cold (first open of a session, before the JIT warms) the two are 83ms and 129ms.
