# The Standing Flags

Every OPEN ruling, deferred half and live thread — **nothing here is done**. The
log of rulings already made and built moved to `docs/history/flags-log.md` on
2026-09-11, item letters kept, so a citation like "(pppp)" or "(eeee)" resolves
there. A ruled-and-built item leaves this page the day it lands; its story lives
in the log, in `docs/history/design-history.md` and in git.

Three sections: **A** is the questions only the user can answer, **B** is rows
that ship deferred-with-prose, **C** is open threads and playtest questions. The
user edits this page directly — user marginalia are rulings.

**Landed on `main` 2026-09-14** (the user: *"commit all of our leader related
changes and push"*): the whole held stack of 2026-09-10 → 09-12 — S2 · F2 · M1 ·
L2 · X14 · P3 · P4 · L3 · L4 · L5 · H7 · F3 · M2 · the mapgen defaults · D1 ·
L6 — at **schema 115**, gate green (core 209/6307, slow 38/147). `docs/great-
people.md` is the user's own version. The log of what each batch built is
`docs/history/flags-log.md`.

## A. Awaiting your ruling

**(ggggg) Only an original capital is unrazeable — BUILT** (the user,
2026-09-15: *"the game should allow razing cities that aren't original
capitals, not allowing capitals in general basically prevents razing if
you're capturing cities in a specific order."*). The orchestrator's default
of 2026-09-03 — capitals are never razeable — was read through
`City.wasCapital`, written whenever the loser's *current* capital fell, and
since `capitalCityOf` re-seats the moment a palace is taken, a warlord
taking an empire's towns in order found every one of them a capital on the
day it fell. Now `City.originalCapital` is written once at founding on an
empire's first town and never cleared, razing refuses that and the razer's
own current seat, and nothing else; `wasCapital` stays for the
`capitalCaptured` bead, which still pays on a re-seated capital. No new
command; a v116 log replays byte for byte (a raze the old rule refused was
never in a log). Pinned in `test/sim/war.test.ts`: two rival towns fall in
order, the first cannot burn and the second can.

**(fffff) The trade route screen is slow again — RULED, T1** (the user,
2026-09-15, turn 99 as Modu Chanyu: *"Could you do a performance pass on
the trade route screen? it seems to be slow again"*). Measure first on a
developed fixture (`docs/plans/benchmarks/fixtures/standard-t120-s1`, 41
towns, or the user's own turn-99 shape: many towns, several traders, the
screen opened from the dock and refreshed per command): where the time
goes when the screen opens and when it repaints — `readRoutes`'s memo
(`src/sim/readings.ts`), the per-pair `explainRouteYieldBetween` /
`explainRouteSenderYieldBetween` folds (`routeYields.ts`), route reach
(pathfinding per origin × destination), `explainRouteSlots`, and the DOM
build in `src/ui/tradeScreen.ts`/`tradeLines.ts`. Then take the dearest
rows: nothing recomputed that the revision did not move (the E3 memo
discipline — a `readX` keyed on the revision in `readings.ts` alone), pair
folds asked once per pair per revision, reach computed once per origin,
the DOM patched rather than rebuilt where the list is unchanged. **Fidelity
here is the screen's content**: every route row's figures, order and words
identical before and after on the fixture (a serialised-DOM or per-row
figure comparison), plus the P-series' pixel pair at play/overview
(0.000%). Report open time and per-command repaint time before/after,
and a Sacrifices paragraph.

**(ccccc) Two Terraces rulings from the Pachacuti playtest** (the user,
2026-09-14: *"farms are colliding with the city border, we should have them
sit under. Also, let's have terrace farms only be able to be built on
hills."*). **Terraces on hills only — BUILT** (schema unchanged: the row
gains `requiresHills: true` with no waiver; the `mountainFoot` seam stays and
forgives only the *water*, so a dry hillside at a peak's foot takes one and
the flat valley floor beneath the same peak takes a farm's rules; pinned in
`test/sim/leaderGround.test.ts`, `docs/leaders.md` follows). **Farms sit
under the border ink — BUILDING, R1**: under the painted look a field's
furrows and patch draw *over* the territory ribbon where a farmed hex meets
the empire's edge; the ink is the map's top layer on the ground and the
fields belong beneath it, so the works layer's field patches render under
the ground layer's territory ink (draw order / depth offset, whichever the
two layers already use — the user sees no farm stroke crossing a border).
Fidelity gate as the P-series: before/after shots at play and overview
differ **only** along farmed border edges, every region explained; a
farmed-border close-up pair for the user's eye.

**(eeeee) A loading sheet for Continue — BUILDING, with P7** (the user,
2026-09-14: *"we need a 'loading game...' modal that shows progress for
continuing a previous save, right now this only exists for starting a new
game."*). Today a new game shows the terrain worker's progress (the
`terrainBuildProgress` sheet from `beginGame`) and a loaded save shows only
the pressed button's label while the log replays. **P7 moved the replay
into a worker** (audit #22) — so the load journey has two staged workers in
a row and both can report. Rule: one loading sheet for both journeys,
shown from the press until the board is on screen, with the stages named in
a first-time player's words and a progress bar that moves — for a save:
*Opening the save · Replaying the game (turn N of M) · Painting the world ·
Placing the pieces*; for a new world the first two are absent. The replay
worker posts progress as it walks the log (per turn, not per command);
the terrain worker's existing progress feeds the third stage; the fourth is
`setGameState` and the first frame. The sheet is a `modalShell` sheet by
the H5 rule, wears `.statecraft-overlay`, and stays up until
`first-board-frame` (P1's mark) so "playable" is never a blank board. No
Cancel yet (P7's sacrifice #3 stands; ▢ the user). Fidelity: the settled
frame is untouched — a pixel-identical play/overview pair.

**(ddddd) The shadowed fog lands — LANDED 2026-09-15** (the user, on the review pair: *"great - it looks much better. Please proceed."*) (the user, 2026-09-14: *"please
also queue up the shadowed fog implementation, i'll let you sequence before
or after the fog performance pass"*). Sequenced **after P5** (the shadows
batch in flight), because the study's second pass on branch `fog-study` is
built on a snapshot from before P2 and P5 and touches the same sun and
shadow-map code — reconciling once, against the tree with both landed, is
one merge instead of two. The ruling is (zzzz) below: reconcile the
uncommitted second pass with main, delete the drawn and bleed treatments,
`treatment` stops being a knob, fix the paper's sun tint, take audit #2
(a fog texel change rebuilds five layers) with it, and `docs/plans/
painted-fog-study.md` becomes the record. A visual-review checkpoint for
the user before it lands — it is the look of half the map.
**F1 built it** (2026-09-15): remembered ground keeps its pigment and its
geometry and sits in shadow; uncharted ground is the chart table, a lit
paper plane at the ground datum that takes the relief's cast shadows and
rules its own hexes, and takes the sun's shadow but **not its colour** (the
peach page is fixed by folding the light to one luminance before it touches
the page); the reveal eases over `revealMs` off an absolute stamp. Audit
finding 2's fog half is held by test: a remembered ⇄ visible change is a
light-texture write — no batch visibility, no geometry, no rebake — and
only a hex crossing out of the dark costs one bake, as it did before.
The drawn and bleed treatments, the old painted wash and the `treatment`
knob are deleted; `data/view3d.json`'s `painted.fog` group is the whole of
what is left, registered by `paintedKnobs`. Fidelity: the omniscient board
is pixel-identical (0.000% of the frame); watched ground is identical
beyond a quarter-hex of a sight frontier (0.000%), and inside that band
0.19% of watched pixels at play and 0.64% after a march — the soft light
edge the ruling asks for. Fogged ground differs by design: 1.4% of the play
frame, 12.4% after a march. Review images: `.claude/scratch/f1/`.


**(aaaaa) The painted renderer's performance pass — RULED, P-series** (the
user, 2026-09-14: *"i've had astra also document what it thinks are the
biggest performance improvements, could you read over the doc (now in main)
and delegate subagents to handle each? Please verify they don't change the
existing visual fidelity and note any sacrifices that have to be made to
functionality before folding them in."*). The spec is
`docs/plans/painted-performance-audit.md` — the original findings 1–16 as
reconciled against the integrated renderer (`70ff850`) in its "Integration
reconciliation" section, plus the additional tasks 17–24 and the revised
delegation order there. **Two waves, each batch on its own fence off the
reconciled main** (Astra's `70ff850` merged with L7 and the generals' data):
**wave 1** — P1 the measurement harness (#24 GPU/CPU attribution and stress
fixtures, #23 startup stage markers; evidence only, no runtime change); P2
the local fixes (#17 the shadow toggle without a terrain rebuild, corrected
#1 the counter-shadow gate including resting units, #11 the walker layer set
once, #16 the painted knobs into `data/view3d.json`); P3 the developed-map
caches (#5 city recipes keyed on the city's look with the local surface
sampler, #6 the ground layer's incremental batches); P4 startup assets (#20
GLB processing moved to a build script with a manifest, #8 parallel asset
loads, #9 the grain textures as one channel — pixel identity required);
**wave 2**, after wave 1 lands and P1's numbers exist — P5 the shadows (#3
one-period fit and #19 exploration's global bake split from colour LOD); P6
overview LOD (#18, one distant prop family; **a visual-review checkpoint
for the user**, since it changes what the far view draws); P7 startup
caching or replay-in-a-worker (#21/#22, whichever P1's stage markers say).
**The fidelity gate, every batch**: before/after screenshots of the same
seeded game at play and overview through the headless harness
(`scratchpad/pw/gameshot.mjs`, `?art=painted&light=golden`, same camera),
pixel-diffed (`pixdiff.mjs`, threshold 0.08) — **≤ 0.5% differing pixels**
or the batch explains every differing region; the agent's own before/after
measurement on one named workload; and a **"sacrifices"** paragraph in its
report naming any behaviour that changed (a stale shadow case, a picking
edge, a dropped bump map) — the orchestrator folds nothing in without it,
and anything visual waits for the user's eye. Every batch: typecheck,
`test/render` + its own pins green; the orchestrator's full gate at landing.
**Landed — P4** (2026-09-14): the three grains ship as their red channel and
upload one-channel, the nine vegetation GLBs bake at build time into one
bundle (`scripts/terrain-study/build_asset_bundle.mjs`; the GLB path stays
as the fallback), and the grain, vegetation and settlement requests run
together. Asset phase 345 → 116 ms cold on localhost; board pixels
identical at play and overview. **Sacrifices kept**: an edited GLB or grain
needs its build script re-run — a forgotten one fails core
(`test/render/paintedAssetSync.test.ts`), and the authored RGB grains now
live in `scripts/terrain-study/grain-source/`, not `public/`; the
terrain-study page still uploads the grains four-channel (renders the same,
keeps none of the VRAM saving) — a three-line follow-up in
`src/terrainStudy/main.js`. **Landed — P2** (2026-09-14): the shadow toggle writes the flag over the
painted board (6.7 s → 0.1 s warm; the first toggle of a session still
pays shader compilation), the counter shadow map renders only on a seam
(a walker in flight, a piece appearing or moving, a faller, the sun
turning, the view drifting past the lesser of `counterCoverage` and the
window's real spare margin — lossless at every aspect ratio), walkers take
their layer once, and every painted literal reads `data/view3d.json`'s
`painted` block. Pixels identical at play, overview and every toggle stop.
**Sacrifices kept**: hovering a unit does not re-render the counter map
(the hover shell casts nothing); a future caster on layer 2 that bypasses
`rebuildUnits` must call `invalidateDynamicShadows` (a source register
test says which seams do); the stats line's board-build figure no longer
includes the toggle. **Follow-up row**: roads, borders and site props
keep their build-time shadow flags across a shadow toggle (pre-existing;
visible only when a game starts with shadows off and turns them on).
**Landed — P3** (2026-09-14): the city layer keeps each town's cut
(keyed on every `CityLook` fact but the two banner-only ones) and the
ground layer keeps each region's merged buffer; per fog move on a 41-town
standard fixture, 80 ms → under 1 ms; every instance matrix and vertex
identical, pixels identical. **Sacrifices kept**: resident memory for the
kept cuts (small beside the board); a town's heights read its own hex's
triangles, so a thing overhanging a city hex no longer lifts its floor
(judged correct — the works and sites already read this way); the
remembered wash is a vertex attribute on the one ground material, so each
region is one draw; a caller that mutated a plan object in place would
render stale ink (nothing does; the docblock says so).
**Landed — P1** (2026-09-14): the evidence harness — a GPU timer probe,
per-frame attribution (preparation vs submission), five reducer-driven
workloads, eight startup marks in `main.ts`, three bot-played fixtures
(`docs/plans/benchmarks/fixtures/`), `scripts/terrain-study/check-painted.mjs`.
The record is `docs/plans/painted-performance-evidence.md`. **What it
found**, for the waves in flight and after: replay of a developed save
blocks the main thread ~20 s before the renderer is asked for anything
(P7's #22); "playable" precedes the first drawn frame by ~22 s in one
long task on the software rasteriser — shader compilation, upload and the
first static bake — on a new world too (~14 s), and **nobody's task yet**;
the static sun's 8192² target is 512 MiB, 2.4× the board's geometry (P5's
#3); a unit step on a 41-town map cost 53–184 ms of `setGameState` layer
rebuilds before P3 landed (P3 measured its five layers at 80 → 1 ms on the
same fixture; the remainder is the units and fog layers, unmeasured since);
and a real scout march charted twenty cells with zero static rebakes while
an end-turn refresh baked once — the opposite of #19's source reading, so
P5 measures before it acts. Nothing visual changed (evidence only).
**Landed — P5** (2026-09-14): the static bake's near geometry is raised
around the sun's depth submission alone (`PaintedBoard.setBakeDetail`,
inside `separatePaintedShadows`' try/finally), so an overview reveal keeps
its far colour LOD — the bake frame's colour half is now exactly the quiet
frame's (1204 → 840 draws on a fully charted board); a per-pass ledger
(`paintedLook.shadowStats`) says what the depth pass costs on its own.
Four pairs at 0.000%. **#3 not taken, with numbers**: the depth pass is
three-quarters of a reveal frame (2716 draws ≈ 905 × three wrap copies),
and a canonical-period fit is a real 3× cut, but it needs the shadow lookup
wrapped in every receiving material's shader with a sheared UV offset and a
per-copy depth offset — surgery on the approved look with seam risk and no
visual checkpoint; incremental baking is only half-correct (suppression
removes casters); 8192 → 4096 is a fidelity call, not a cost one (the pass
is draw-bound). Queued as **P11** in wave 3 with a user eye on seam shadows.
**Sacrifices kept**: `updateDetail` takes only `pixels` now (a caller that
wants near geometry for a bake calls `setBakeDetail`, and must pair it with
`false`); the one-frame detail pop on a reveal is gone by design; the hook
is bound to one board and rebinds in `rebuildBoard` alone. Two rows for
later: the first frame with a walking piece spends ~1.7 s compiling the
walker's depth program (P8's list), and the bake count climbs across
restarts in one tab (something does not reset with the board — P9).
**Landed — R1** (2026-09-14, (ccccc)): the ground ink takes a polygon
offset one rank deeper than every other ground decal, so the border ribbon
and roads draw over a farm's furrows; town and great-person ground pigment
go under the ink too (same class, same step), a farmed frontier hex loses
a thin strip of crop beneath the ribbon, and a plinth base directly under
a ribbon could in theory lose its bottom row of pixels (not reproduced).
**Landed — P7** (2026-09-14, and (eeeee) with it): replay dominated
(3.9 s of blocked main thread on a developed save against 6 ms to hand the
result across a worker), so `newGame` and the log walk run in
`src/ui/game.worker.ts` through `src/ui/gameLoader.ts`; the main thread
blocks ~7 ms on a load instead of seconds; the state is byte-identical to
the synchronous path (pinned both in-process and through the real
`postMessage` seam) and refusals match character for character. The
**loading sheet** (`src/ui/loadingSheet.ts`) covers both journeys from the
press until a frame has been presented: Opening the save · Replaying the
game (turn N of M, reported per turn by a `ReplayWatcher` on the one
walk) · Painting the world (the terrain worker's progress) · Placing the
pieces; a new world shows the last two. #21 (terrain caching) **not
taken, with numbers**: the 6–12 s rebuild is already off-thread and costs
the main thread 34–157 ms, so a cache buys wall time, not responsiveness,
and needs an IndexedDB round-trip measurement first — queued in wave 3 as
part of P8's startup work. **Sacrifices kept**: a load's wall clock is
+145–730 ms for the worker crossing; one idle worker holding the sim
module graph lives for the page (spun up on the landing so a load never
fills a cold one); no Cancel and no replay timeout (a hung worker hangs
the load where before it hung the tab); a broken save shows the busy
label before its sentence; the shelf takes one load at a time; the sheet
cannot be dismissed and is never disposed (pinned out of the register on
purpose); "of M" reads the shelf label, display-only; on the synchronous
fallback the bar does not move; the last stage is a proxy (terrain 100%
to two frames past `hideLanding`), not `setGameState` itself; the saves
panel's route shows the sheet in two halves around "Abandon the game in
progress?". P1's `first-board-frame` mark is the one that survived (it
fires inside `boot`, earlier than the sheet's own seam).
**Landed — P6** (2026-09-14, the user's eye: *"yeah this is fine, lets
send it"*): the attribution said groves were a third of a fully revealed
overview's triangles (980k of 3.0M) and escarpments a fifth of that, so
the groves are the one distant family — each grove and cypress sculpt
gets a map-scale stand-in by vertex clustering on its own box
(`farSculpt`, `vegetation.js`; 643 → ~20 triangles, same footprint,
height, tint, pose and instancing), derived at load rather than bundled so
`paintedAssetSync` keeps its meaning; families ride `VEGETATION_SPECIES`
and the sheet's `painted.lod.distantCells`. Far view −29% submitted
triangles at unchanged draws; near view, picking, the static bake,
instance counts and placement untouched (pinned). **Sacrifices kept**: far
forests read slightly denser and greener (solid crowns, 1.2% of the
overview's pixels, all canopy); a pop at the existing 25/29-px LOD band
(79 px worst case); ~20 KB more board geometry and 6–28 ms of clustering
once per session; a new sculpt must declare its `family` or it silently
gets no stand-in; `benchmarkTerrain` gained a parked-overview scenario
first in its results. **Follow-up row**: an unnamed scene layer is the
second-largest far-view contributor (410k triangles over 27,855
instances) — name and attribute it (P10).
**Landed — P10** (2026-09-15): measured first — P1's 53–184 ms a unit
step is gone with P3's caches (the five town layers fire only on their
own fingerprints; a step is 14–77 ms, the dearest row the units layer,
P2/P5's seam, untouched); the board sheds `paintedReservationDistance`
(four million zeroes, the material states the zero) and the merged land's
`uv` (derived from position through three's BUMPMAP_UV macro) —
213.3 → 182.7 MiB of arrays, byte-identical pixels; `signPaintedWorks`
folds integers (−38 %); a fog flip's region rebuild is pinned by count;
the unnamed far layer was two — the unit pieces (58 % of an omniscient
overview's triangles; at the player's own view a fifth of that) and the
fog chart (25k paper instances in four draws) — and every scene layer is
named now (`SCENE_LAYER_NAMES`, a source register). The benchmark
fixtures were regenerated at schema 116. **Not taken, with numbers**:
`turfWeight` (13.3 MiB, needs the fog texture's alpha — F1's file),
the uniformly-zero suppress batches (0.6 MiB), the works layer's wash as
an instanced attribute, the lens (2–3 ms a step). **For the user**: the
unit pieces are the far view's biggest row; cutting them means a
map-scale stand-in per unit family or dropping the outline hull and
x-ray ghost beyond the LOD band (the ghost is what makes a piece behind a
peak findable) — an art call. **Sacrifices kept**: the board depends on
three's `defaultAttributeValues` path and on the BUMPMAP_UV macro's name
(pinned); a second uv-reading map on the merged land would read (0,0)
silently; the works guard asks resource visibility once a row (an empire
fact today; a per-hex reveal rule must undo it).
**Landed — P9** (2026-09-15): a unit pick tests each instance's own
sphere before the triangle cast and walks the scene minus lights and unit
visuals (a body pick 6.9 → 4.8 ms, p95 halved; the same 28 picked and 11
blocked, id for id); `mergedDetails` stops receiving shadows (0 pixels at
both zooms) while the **water keeps receiving** — turning it off moved
634 pixels, a headland's shadow across a river, so the audit's cheapest
row is declined by measurement; the settlement kit ships as
`settlements-1.bundle` through P4's contract (28 requests → 1, 60 → 12
ms, +84 KB gzipped, `--check` in core); the shadow toggle writes its flag
over the works, sites, cities, roads and territory batches P3 retains
instead of forcing rebuilds (the setting leaves their batch keys; toggled
off now darkens the props and ribbons that used to keep casting — 45 px);
the study page uploads the grains one-channel. Six pairs at 0.000%.
**The climbing bake count is not a leak**: `shadowBakes` is a running
total the look keeps across restarts; games two and three bake less than
the first. **Sacrifices kept**: a future detail material not flush with
the ground would not receive a shadow (pinned per family); the lens and
the marginalia still occlude a pick (a picking change, not taken);
picking holds ~16 B a slot of sphere cache; a cold settlement fallback is
one round trip slower; `paintedCities` takes the toggle twice (both
reuses); a sixth retained layer must join `setShadows`' list by hand.
**Landed — P8** (2026-09-15): measured first, and the premise was wrong —
the first-frame task was not shader compilation but **texture uploads**
(the badge and tile-icon atlases and the three grains, each followed by a
GPU round trip: 89 % of it), with the "first link" the frame's first
synchronising call draining the queue. So the atlases are handed to
`renderer.initTexture` inside the terrain worker's window and the prepared
board's programs are linked with `compileAsync` before it enters the scene
(the board, not the scene: 34 programs against the scene's 49). Geometry
upload (16 ms) and the first bake (0 ms of main thread) declined with
numbers. First-frame task 6.6 s → 0.36 s on a new world, 13.7 s → 0.7 s
on a developed save; pixels identical. **Sacrifices kept**: seven extra
programs link per session (the board's hidden LOD/fog variants); the
atlases upload whether or not the first frame draws them; `terrain-ready`
now means built *and* uploaded; and — the one to know — **the first frame
no longer synchronises with the GPU, so on the software rasteriser the
rasterisation backlog is paid by the next task** (a developed save
freezes ~19 s *after* the board appears where it froze ~13 s inside the
first frame before; a fraction of that on real hardware; the board is on
screen throughout). P11 is the row that shrinks that backlog.
**Landed — P11, shipped OFF** (2026-09-15): the one-period shadow fit
(`src/render3d/paintedShadowWrap.js`) — the static sun bakes one world
period plus a `periodMargin` instead of three wrap copies, and every
receiving material's shadow lookup subtracts the period's displacement in
shadow space (sideways *and* along the light's depth axis — the shadow
matrix's first column × period), installed by a sweep from inside the
bake rather than a list (eighteen receivers on a charted board, the fog's
chart table and one frozen-toon marker material among them, which a list
would have missed). With the knob on: 2716 → 1186 draws and 8.67 → 3.83 M
triangles on the static pass, ~2.2× on its time, and the three wrap copies
go from 0.013–0.064 % apart to **identical**. **Why off**: the map stays
8192² over a third of the width, so cast-shadow edges read ~2× crisper and
less stippled everywhere — 0.07–0.48 % of pixels, all edges, at every
preset — a look change on approved art. **▢ the user**: the before/after
crops are `.claude/scratch/p11/review/shadow-edge-{golden,dusk}-…-3x.png`
in P11's worktree; flipping `painted.shadows.periodFit` to `true` in
`data/view3d.json` is the entire change. Off is the old renderer to the
digit (0.000 % at play, overview and both seam views). **Sacrifices if
on**: a seam band of `periodMargin` (3 world units; a much lower sun or a
much taller caster would want it raised); one shader recompile for a
receiver that first appears after the first bake; two derived chunks
added to three's shared `ShaderChunk` table; slot 0 must stay the static
sun (the same assumption `painterly.js` makes).
**Wave 3 — QUEUED** (the user, 2026-09-14: *"add p8 to the queue along
with the others"*), after wave 2 lands, in this order: **P8 the first
frame** — the ~14 s (new world) to ~22 s (developed save) between
"playable" and the first drawn frame, one unbroken main-thread task of
shader compilation, first geometry upload and the first static bake;
compile the painted programs ahead with the parallel-compile extension
while the terrain worker runs, upload batches as they arrive, bake before
the landing comes down (or once coarse, then refined); "playable" means
the board is on screen; real-hardware numbers from the user's machine first
(the benchmark button writes the marks). **P9 the small rows** — #12
picking's occluder root (the unit groups, not the scene), #15 water and
decor no longer `receiveShadow`, #20's second half (the settlement kit
through P4's bundle contract), P2's follow-up (roads, borders and site
props take the toggle's flag), the terrain-study page's one-channel grains.
**P10 the developed-map remainder** — #10 per-tile constants out of the
per-vertex attributes (213 MiB of arrays), #7's residual (a fog change
touches only the affected regions of the works layer), and P1's open
reading (what the units and fog layers cost per step now that P3 took the
other five to under a millisecond — measure first). Same fidelity gate,
same sacrifices paragraph, core tests only.


**(zzzz) Fog of war under the painted look — RULED: shadowed** (the user,
2026-09-14, after the four-way study at `terrain-study.html?review=fog`:
*"i actually like the look of shadowed the most. i'll let you know when the
repo is free to add that in."*). Remembered cells keep their full pigment and
geometry and sit in shadow — the sun term scaled by `paintedFog.shadowedSun`
(0.35) with a slight cool shift (`shadowedCool` 0.22, `shadowedShade` 0.88) —
the fill unchanged; uncharted cells stay the chart table (the paper plane at
ground datum receiving the lit relief's shadows, ruled hexes, the sea wash);
the light edge soft over `sunFalloff` (0.5 hex) with the ink edge hard; the
reveal eases the sun up over `revealMs` (300). **Waits for the repo**: the
study lives on branch `fog-study` (worktree `.claude/worktrees/fog-study`,
served on :5241), built on a snapshot of the other agent's uncommitted
renderer redesign; it lands only once that redesign is committed and the
two are reconciled — the drawn and bleed treatments are deleted at landing
(the drawn's hatching and the bleed's block are fenced so they lift out
clean; the toggle and knobs go with them), `treatment` stops being a knob,
and `docs/plans/painted-fog-study.md` becomes the record. Two things to
carry: the **paper takes the sun's shadow but not its colour** (under golden
hour it read peach — the user saw it), and the audit's finding that any fog
texel change today forces a full shadow rebake and five layer rebuilds
(`docs/plans/painted-performance-audit.md`, finding 2) is the first thing to
fix beside it, or the soft edge and the reveal will stutter every march.


**(yyyy) The new-game flow in three screens — RULED, L7** (the user,
2026-09-14: *"the three screen flow is great, please fold those in too"*;
the spec is the artifact "Magister Ludi — New Game Flow", its first three
tabs, redrawn in `mockups/new-game-flow.html` when L7 lands). Today the
landing is one leaf: the poster masthead, the map card and the seat card,
with Continue and Load in the map card's foot. **L7 builds** three screens,
all screen states of the one page as the landing is today (nothing routes):
**(1) the title** — the poster masthead at full size, once, and under it two
cards on its edges: the menu (Continue with the newest save named on the
button and hidden when there is none · New game · Load a game · Multiplayer
greyed with "coming after the playable core" · a rule · Compendium ·
Settings) and the recent-worlds shelf (named saves and the autosave, newest
first, each row naming the figure, the seed, the turn and when — a row loads
it; the shelf reads `savesPanel.ts`'s own list); keyboard: Enter continues,
N new, L load, ? the book. **(2) new game, step one** — the mode as a
segmented switch at the top (Single player · Hot-seat · Online greyed),
then the map card exactly as built (seed + Random, size, the seats stepper,
the opponent row at two seats, the tutorial check; the hot-seat checkbox
becomes the switch) — the rows the mockup shows and the game does not have
(rivals · pace · the wild · difficulty) are **not built**, no greyed
placeholders — a summary strip in mono under the card ("standard · 6 seats
· seed 1"), Back to the title, and **Choose your civ →**. The masthead does
not repeat here; a small mono breadcrumb ("new game · step one of two")
stands in. **(3) choose your civ, step two** — the roster as the four-line
faces `leaderSelect.ts` already builds, No leader first and default,
**Random** last (dealt by the seed through `hash3`, the cast's own hash),
and beside the roster a detail card for the chosen figure: a portrait plate
slot in the figure's two inks (`artPlate`-style, the painting arrives
later), the name and identity line (▢ `family`/identity is still not a
field; print the two inks' names and nothing invented), the two abilities
through the describers, the unit and building each with the age that opens
it, the colour chips, the first cities, and **Begin as X** (Begin for no
leader). Back returns to step one with its values kept. `currentConfig`
reads the same controls it reads today; the config is byte-identical for
the same choices. Every existing pin on the landing (`leaderScreens`,
`gameSetup`, `screenLifecycle`, `seatRoster`, the tutorial) is reworked,
never dropped; new pins: the three screens are one `#landing` with a
`data-step`, Continue hides without a save and names the newest with one,
the shelf lists saves newest first and loads on click, the keys, the
segmented switch writes `hotSeat`, Random deals by the seed and the same
seed deals the same figure, Back keeps the seed, Begin's label follows the
pick, and a raw `[[` nowhere. `docs/README.md`'s surfaces section follows.
**L7 built** (2026-09-14; on the gate, landing with the great-people data
fix): `src/ui/landingFlow.ts` (the step walk, the breadcrumb table, the
summary strip, one guarded document key handler with two refusals — a text
control keeps every key, a button only Enter/Space); `savesPanel.ts` gained
`recentWorlds` and `relativeWhen`; the title's menu and shelf, the world's
switch and summary, the civ's roster with Random dealt by `hash3` and the
detail card; every control id kept and `currentConfig` unchanged; the book
opened from the title lifted above the landing (z 60); a pre-existing bug
found — `hidden` on a landing row was a no-op under the card's `display`
rules (the Opponent row had shown at every count) — fixed with a `[hidden]`
rule and a cascade pin. Verified on screen through the headless harness
(`scratchpad/pw/flow.mjs`). Twenty-one pins in `test/ui/landingFlow.test.ts`.


One paragraph a question, in the words the state of the tree makes them now.
The letter is the item the question came out of; the item's full history is in
`docs/history/flags-log.md`.

### Balance figures the user has not yet set

- **(nnn) · (hhh) The wager's bars, and the bead threshold.** Every bar in
  `docs/wager.md`'s deck is a bench figure, not the user's. Two — The Academies
  and The Contented Realm — were already cut well below the bench by ruling; the
  other twenty-two stand as measured. `rules.threshold` is **7**, two-thirds of a
  two-seat bench reading, and is likewise awaiting the user's own figure. The
  doc's table is sync-tested, so data and doc move together.
- **(ttt) The strength ladder's leftovers.** Three things the U9 pass left for a
  ruling: the `armyStrength` wager bars (375 · 1200 · 2500) that rode the ladder
  ×2.5; **the naval triangle now kills in one blow** — a light hull on a gun deck
  is a 10-point gap plus the two ±10 naval lines, which is a kill, and the lines
  at ×1.5 instead of ×2 is the lever if that is too sharp; and a **cost
  inversion** — the Legionary (40 strength, 54⚙, column 6) is stronger *and*
  cheaper than the Horseman (38, 101⚙, column 7), a column artefact.
- **(ppp) The waterline's three percentages.** `landRangedVsShipPercent`,
  `landSiegeVsShipPercent` and `embarkedCounterPercent` are first cuts. Beside
  them: the taking of a town is a melee kill on the **garrison** beat, and
  whether the user meant the **walls** beat too is unanswered.
- **(kkk) The Assize Court's relief.** Crowding is gone and a town's demand is
  linear in its citizens; the Court forgives a share of that demand. Fifteen per
  cent of the whole citizen line is deliberately more than fifteen per cent of a
  surcharge was — the figure is the user's to retune.
- **(hhh) The renown ladder, and the one-city pace.** The ladder is
  `floor(75 + 225n + n^2.8)`; whether halving the arrivals was enough or the step
  goes again is the user's call. Beside it: a one-city empire reaches the Opus
  around turn 4800 on the harness, and whether that is the pacing wanted has
  never been answered.
- **(qqq) · (xxx) The baseline the balance pass reads.** The tech ladder and the
  happiness figures were fitted while the retired deeds were still injecting
  yields; the wagers now carry that weight alone, and a wager pays beads, not
  yields. Any balance pass starts from the new baseline, not the fitted one.

### The map and the starts

- **(rrrr) · (tttt) Spacing, and a crowded roster.** Starts are
  `spacingFactor` 0.55 × √land, clamped to a floor of 10 and a ceiling of 20.
  The floor is ruled for **six** seats; what a **twelve**-seat standard game
  should do — relax the floor with a report, or refuse the count in the stepper —
  is open. `spacingFactor` itself is the lever if the user wants standard at 16
  rather than 20.
- **(tttt) Duel's river quota fell to half.** `rivers.minLength` 4 → 5 alone
  did it (isolated per knob): on 386 land tiles many traces reach the sea in
  four edges, and duel is under `pitLakeMinTiles` so it has no basin to flood.
  Standard, large, huge and giant fill their quotas. If duel should stay
  riverine the knob is a per-size `minLength` or letting duel pool.
- **(cccc) The luxury guarantee's fallthrough.** A leader's base luxury guarantee
  was tightened to hand-or-nothing, its whole-table fallthrough removed. If a
  seed sweep shows that starves a start, the fallthrough comes back.

### Leaders

- **(dddd) · (jjjj) The rows `data/leaders.json` does not carry.** There is no
  `family` or `spectrum` field, so the new-game screen's family line and spectrum
  bar print nothing and the mockup's two lines are absent. A data decision.
- **(xxxx) The leaders' second cut — RULED, L6** (the user, 2026-09-11: *"lets
  implement these. Fold it into the existing UI and axe the leader draft
  mechanic. I'm not sure what to do with the leader menu, we still need to
  give players a way to see what their civ does."*). The spec is
  `docs/leaders.md` "The second cut — fixed identity": a figure is **two
  abilities, a unique unit, a unique building** plus colours, cities, start
  bias and charge; **thirteen figures** (the six built, remapped; Joan of Arc,
  Mansa Musa, Zheng He, Nezahualcoyotl, Hypatia, Hildegard of Bingen, Ibn
  Battuta new). **L6a — the sim and the data**: `LeaderDef` reshaped
  (`abilities: CardEffect[][2]`, `unit`, `building`, the rest as today);
  the abilities are the seat's held effects from `newGame` (the bonus's
  seam, widened to two); a unique's row is `unlockedByLeader` and opens for
  the figure's seat **through the tech gate every row has** — no age
  machinery; `Player.leaderPicks`/`leaderOffer`, `chooseLeaderCard`, the
  `leaderDraft` blocker, the `leaders` phase, `leaderCardHome`/the deck
  types and `src/ai/leader.ts` **retire** (the v113 changelog rewritten to
  the second cut; schema stays 115 — nothing landed); seven new unit rows
  and seven new building rows (sizes, columns, silhouettes/model classes,
  Compendium clauses through the describers) and the six benched rows kept
  with `unlockedByLeader` and no figure (a bench); the seven new figures'
  **colours, cities and start biases drafted into the doc's three tables by
  the agent** (the doc is the spec; the user retunes; sync-tested); the
  first-cut deck tables and their sync test removed with the deck. New
  shapes, **build if small, else defer-and-annotate**: Joan's soldiers
  bought with faith in one building (`BuildingDef.faithBuysMilitary`, read
  in `purchase.ts` beside `faithBuysWonders`); the Treasure Ship's second
  passenger (the escort clause, per row); the Scriptorium's doubled belief
  effects in its city (a city-scoped amplifier on follower/founder lines);
  the Canoness's production lump on proclamation (a rider on the proclaim
  occasion — add the occasion if absent); Ibn Battuta's **re-roll** (a new
  command `rerollOffer {playerId, kind}` redrawing an Order, doctrine,
  government or great-person offer once from the seat's own pool, never a
  belief; a `Player` stamp per offer so it is once per draft; bots ignore
  it for now); the caravan's `+3 gold on its routes` and `cannot be
  plundered` scoped to one trader row (route rider and rule by `class`).
  **L6b — the screens**, on L6a: the landing face shows the four lines
  (abilities through the describers, the unit and building named with the
  tech that opens each); the draft sheet and its door go; **the leader
  sheet stays as "your civ"** — the four lines with what each ability pays
  this turn from the ledger's own lines, the uniques with their opening
  tech and a Compendium ref, the cities in order, the pair of inks; the
  Compendium's leader shelf lists the same; the spectator names the figure;
  the mockup redrawn to four lines. Pins: every figure's abilities are live
  from turn one; a unique opens for its figure's seat at its tech and for
  no other seat; the draft command is refused as unknown; a config naming
  a figure replays; the doc tables ↔ data; the re-roll redraws once and is
  refused twice; the caravan pays and is not plundered.
  **L6a built** (2026-09-12, held `cb40685`): `LeaderDef {abilities[2],
  unit, building, colors, cities, startBias}`; a unique opens through two
  questions — the seat's sheet names the row AND its column is reached
  (`columnReached`, since no node names these rows); everything of the
  first cut retired, `src/sim/leaders.ts` and `src/ai/leader.ts` deleted,
  the v113 paragraph rewritten, schema stays 115 and a figure config
  replays byte for byte. Three sheet keys renamed for id collisions with
  great people (`zhengHeOfMing`, `hypatiaOfAlexandria`,
  `ibnBattutaOfTangier`; names unchanged) — ▢ the user may prefer to
  promote those three out of the great-people roster instead. New:
  `UnitDef.effects` — a row's own rules ride the row and fold into its
  figure's law (this also rescued seven first-cut unit rules the deck's
  deletion would have destroyed). **Built shapes**: soldiers bought with
  faith (`faithPurchases: 'military'`, a third word on the seam); the
  Rihla's re-roll folded into the EXISTING `rerollOffer` command (an
  `ActionRuleId rerollOffers` waives the first asking per hand, never a
  belief, never a government); the caravan's +3 gold and unplunderability
  scoped to its row, and `caravanTypeFor` so his seat fields Rihla
  caravans; the Tetzcotzinco's whole-yield percent; the Museion's per-
  great-person science; the Funduq's lifted site. **Deferred on the row**:
  the Treasure Ship's second passenger, the Scriptorium's doubled beliefs,
  the Canoness's production lump (no `proclaim` occasion), Zheng He's
  first-contact lump, the Dockyard's +1 movement for ships built there;
  the Sankore's rate is a 25% share with a note. The seven figures'
  colours, cities and biases are in `docs/leaders.md`'s tables (the
  user's to retune); two new wants `coastalWithin`, `lakeWithin`. The
  tree did not typecheck at that head on purpose — six UI files read the
  retired types. **L6b built** (2026-09-12): the landing face is four lines
  (two rules through the describers, the unit and the building each named
  with what opens it — today every unique prints the age of its own
  column, since no node names one); `leaderDraftSheet.ts`, its overlay,
  CSS, wiring, the blocker arm and the `TurnBlocker` member are gone
  (the bot's dead `leaderDraft` arm with them); **the leader sheet is
  "Your Civ"** — both rules with the ledger's own lines under each, both
  uniques with `isUnlocked`'s answer and a Compendium ref ("Not yet — it
  comes with Æra IV"), the cities in order with the founded ones inked,
  the pair of inks; a plain seat gets one sentence; the dock's fifth door
  lost its waiting dot; the mockup redrawn to two tabs. Twenty-five pins.
  Whole tree typechecks; `test/ui` 77 files green. The full gate then
  failed two slow sweeps for one cause: both seated *every* figure — six
  became thirteen — and thirteen seats cannot hold a floor of ten. **Re-
  aimed at the product's six-seat cast**: `castFor(seed)` in
  `test/mapgen/leaderCriteria.ts` — Akhenaten every board (the (uuuu)
  reading is his), the other five a window rotated through the twelve so
  each sits ten of twenty-four boards; rates are shares of seatings.
  Floor held (min 14, median 16, none let down). **Shares worth the
  user's eye**: Mansa Musa's arid start 30% (40% unbiased — dry country
  is the ground a standard board grows least and refuses most, and a
  one-want figure is served late on the ladder), Zheng He's coast 50%
  (unmoved by the bias, same reason), Hildegard's river 70%; every other
  criterion 90–100%. `refitSlots` has no callers now (the draft was its
  only one) — docblock says so, kept whole. `docs/mapgen.md`'s rates
  table follows the new shares.
- **(qqqq) Whose movement the row means.** A leader row reading "military units
  regain all movement" is implemented as `isCombatant`; mounted-only would be a
  rule change.

### Religion and great people

- **(qqqq) The Great Ziggurat's dead rider.** Its `purchaseRider` targets
  `consecrates: true`, which today is the **retired** augur alone — a −25% on
  nothing. Aim it at prophets, or take it off the row.
- **(lll) Names, tiers and one reading.** Two renamed great people and several
  new rows carry proposed names and tiers that are the user's to change. Three
  members of the vocabulary (`sightedCities`, `bankedGold`, `strongerTarget`) are
  now read by no row at all.
- **(lll) The trader that cannot be plundered.** `tradersUnplunderable` is read as
  the **plunder** seam — a blow on a laden cart neither plunders nor harms it. If
  "cannot be pillaged" meant something wider, say so.

### Statecraft, cards and the Compendium

- **(dddd) Two shapes the vocabulary lacks.** A **scoped authority-cost** line
  ("cities of kind X cost one fewer authority", three cards want it) and a
  **per-puppet count**. Both are deferred-and-annotated today; building either is
  a design decision.
- **(lll) · (dddd) What the Compendium shows of retired and boon-only rows.** It
  lists retired great people and the forty-seven retired Orders while hiding
  retired buildings — one ruling covers all three. Separately, a pure-boon
  leader card's Compendium entry prints its effects only, where the draft sheet
  composes the lump.
- **(www) The queue floor's edge.** A command that would shorten a works list
  below The Vizier's Hall's floor is refused, because a strict floor deadlocks an
  emptied town — the shape of that refusal is flagged rather than ruled.

### Trade

- **(iii) A route needs a slot, not a Trader.** Currency (the Market) therefore
  gates trade in practice. Whether a technology should open routes in its own
  right is the user's call.
- **(uuu) A sea empire's route count.** With the Harbour and the Shipyard
  slot-less and slots coming from the Market and the Caravanserai by size, a wide
  and thin sea empire runs very few routes — the sea build's identity is thinner
  than it reads.
- **(iii) The idle-trader prompt can offer nothing.** A seat whose only partners
  are out of range or unseen is prompted and finds the sheet empty. The prompt is
  passable; the departure is deliberate (the cheap half of the gate) rather than
  paid for with a pathfind per press.

### The tree, and rows left mid-air

- **(uuu) The Toolmakers' Charter.** It retired when the Smithy moved into Bronze
  Panoply. Re-aim it or leave it retired.
- **(uuu) The Forge's name.** Steel's Forge keeps its name; the Foundry rename
  was only ever to free the word, and the user may still want it.
- **(uuu) The Lighthouse's gold.** It kept its base two gold **beside** the new
  two food; whether the mark meant *instead* is unanswered.
- **(vvv) The Saddle's parents, and the armoured horse's node.** The Saddle sits
  in Æra II with recommended prereqs (Husbandry + Bronzeworking); the armoured
  mounted row and the War Elephant sit at a recommended Iron Working. The lanes
  are the user's chart, so both placements want confirming.

### The bot

- **(sss) The opening build.** `openingScout`'s third clause has always declined,
  so the "scout first" ruling was never actually in force. `military.scoutCap` is
  3 and the seat now stops at its dial. Whether a first build should be
  hard-coded at all is the user's.
- **(www) The two strand weights.** `research.strandWeight` and
  `puppet.strandWeight` are both 0.35 — what a switch is charged for the progress
  it strands. An arena sweep of the pair is owed.
- **(xxx) What the orders pass actually moved.** The Merchant Scholars / Martial
  Law swap and the four "keep" rows are the likely movers in the t100 readings;
  only a playtest reads it.

### Presentation and small debts

- **(rrr) The two families.** `docs/playstyles.md` is open and every ▢ in it is
  the user's, during their balance pass. Nothing in it flies until marked.
- The Compendium does not walk `data/wagers.json`, and the census has no
  Compendium shelf. Two small passes.
- **(nnn) Plainer wager names** are proposed in `docs/wager.md`'s Notes column
  (Bread and Iron → *Full Fields and a Standing Army*, The Six Voices → *The
  Whole Yield*, …); the names in the data are unchanged. Beside them, The
  Patronage's note says "counted from the age's deal" where the other flow rows
  say "added up over the age" — the same thing, worded differently.
- **(nnnn) `lobby.ts`'s `MAX_SEATS`** is still the rules' figure rather than the
  stepper's. They agree at twelve today.
- **(zzz) · (yyy) Replay safety of the U9 figures.** Schema 109 already says a
  v108 log does not replay; whether the exact strength figures want a bump of
  their own is the user's (the recommendation is no — U9 has not been played).

## B. Deferred halves on the rows (regenerated from data)

Each waits on the named thing; the prose on the row is player-plain and is
the source. Regenerate with the scratchpad dump after any data pass. Your
ruling 2026-09-04 stands: every deferral stays; anything relying on a
removed system was re-cut with the levelling axe.

**Orders** — Triumphs (renown grant: a windfall's grants can't reach the
renown ladder) · Sanctuary (sacking doesn't exist; retired) · The Escorted
Roads (route safety is placeless) · The Dry Docks (heal-in-port is a hex
rule) · The Wolf-Standard (a camp's bounty has one destination) · The Far
Charts' second half (route reach off sightings is a `trade.ts` rule) · The
Tide-Reckoning (route mode unreadable) · the late-pool strikes (King's
Road's roads, Siege Train's adjacency, Patrons'/Guild Compact's/
Manufactories' family renown, Court Astronomers' wonder bounty, The
Consistory's rite duration, Forced March's penalty, Admiralty's embarked
defence, The Salon's renown price, The Silk Exchange's imported luxuries,
The Inquisition's temple-less penalty, The Magister's Court's second charge).

**Doctrines** — The Founders' Road (amphitheatre swap) · Mountain Hold
(radius 2) · The Burning Way (chopped-hex memory) · Religious Mandate (war,
conversion immunity, bead bonus — parked tier 0) · The Academy (faith-bought
scholar drafts) · The Sea Charter's founded-with-Harbour half · The
Renaissance Court's stronger-legacies half · Absolutism's longer-seal half ·
Blitz (retired to proposed — no stock half) · The Philosopher's Stone's
Distillery half · The Closed Realm (both — parked tier 0) · The
Horse-Tribes' flat-ground and stable halves.

**Governments** — The Curia (+3🕯 per Cathedral).

**Techs** — Epic Poetry (verse sized by the fallen piece) · Kingship (the
King List needs founding turns) · Paper Money (the Bourse spends gold) ·
Empire-Building (capital-mirror hammers) · Colonial Charters
(distance-priced authority) · Castellany (anti-ranged defence line) ·
Fortification (walls that mend).

**Resources** — Ivory (war elephants; hammers toward a category) · Lapis
(renown ruling).

**Wonders/buildings** — Terracotta Army (born strength) · Statue of Zeus
(+15% vs cities) · Notre-Dame (Cathedral culture) · Forbidden City (an
Order slot) · Alhambra (born fortify bonus) · Water Clock (the chime
cadence) · Shipyard (ship-only discount) · Printing House (routes paying
the destination) · Observatory's mountain sight clause · Bank
(routes-ending-here count) · The Cistern's fields half (a building waters
its town, not its hexes) · **The Magnum Opus (the culture pillar)**.

**Great people** — Sin-lēqi-unninni (Hall of Deeds is gone) · Leonardo
(project halving) · Mimar Sinan (cathedral discount) · Yi Sun-sin (naval
strength) · Dinocrates (a wonder-occasion legacy).

**Beliefs** — Holy Order (faith-bought fighting order) · Theocratic Mandate
(claims on followers) · The Promised Land (faith at a founding is a third
way to press).

**Numbers to tune (v55)** — Stele of Laws (50⚙, worse per hammer than the
Monument) · Stone Walls (55⚙) · Workshop (net −1 late vs the old renewal
path) · Floating Gardens (+1🌾+1💰; the lake half waits on lakes being
standable — a movement ruling; pit lakes now exist on big maps).

## C. Open threads

### The tedium thread (2026-09-06, the user's overriding impression of the first playthrough)

"Many of the mechanics felt tedious — so many buildings with similar effects;
I never wanted to invest in my chapel because I was so far ahead and didn't
want to waste time paying for augurs and using them in my cities. I couldn't
notice where the surveyable mines were in my territory." Three threads, no
rulings yet:

- **Buildings**: too many rows that are a flat with a different name. The
  balance turn's building trim is the wrong tool for this — the fix is
  *fewer* buildings, each a shape (a per-citizen line, a percentage, a
  district-like condition), with the flats folded into cards. Proposal owed:
  a cut list per age, with what each surviving building is *for*.
- **Augurs and rites**: a unit bought with faith, walked to a town, told to
  perform a timed rite — value per click too low, and worthless when ahead.
  Candidate shapes: rites become a city verb paid in faith (no unit; the
  Chapel is the door), or the augur folds into the prophet and rites into
  consecrations/beliefs (passive faith). The Chapel then has to be *for*
  something the leader still wants.
- **Veins**: the surveyable hills are invisible — nothing marks a hex that
  `prospect` would answer. Candidate: the lens (or the worker's reachable
  highlight) marks prospectable hills once the tech is held; or a survey is
  automatic when a worker rests on the hex. Small, and a UI ruling.
- **Bigger, rarer choices; cards that combo** (2026-09-06, the user): "I
  ended up with generically strong orders across the board, it didn't feel
  like the cards had synergy with each other… the faith-oriented build
  didn't make me really change how I played… I almost feel like we need to
  include a proportion of cards that don't really do much on their own, but
  combo nicely with other cards." Direction, not yet numbers: the deck gets
  **engines** (weak alone, read other cards by tag) and **payoffs** (scale
  with what is slotted beside them) beside a smaller share of standalone
  flats; a path (faith, war, trade, growth) has to be a different *engine*
  for the primary yields, not a side dish. `docs/history/fewer-things.md` — DRAFTED,
  awaiting your markup: the choice-size ladder, 38 → 19 buildings per age
  with a clause each, the augur options (recommends A split by act: rites a
  city verb, the augur a rare consecrator), the engine/payoff/standalone
  shares (25/30/45 — standalones are the fuel), one required new shape
  (`slottedOrdersOfLine` — the twelve `CardLine`s already on every row,
  switched on as a readable tag), and the finding that supersedes
  `cards-pass-2.md` §E.3: the draft cadence is NOT the problem (20 drafts by
  t92 on your own culture curve) — fewer, bigger drafts (`costExponent`
  2.25 → 2.8 with chairs down a quarter) is the coupled proposal. Largest
  bot debt: the draft plan prices cards alone, so it can never draft an
  engine — a marginal reading `V(deck ∪ card) − V(deck)` is the fix.
  **Rulings from the markup (2026-09-06)** — `docs/history/fewer-things.md` §7:
  the engine shapes are the user's five (amplifier by voice over card yields;
  building-yield percent by category; a "yields X" tile test; a periodic
  occasion with its own period-shortener; the slot-position reader — **slots
  are ordered as drawn, the topmost economic slot is the first**); lines stay
  drawn marks with three readable (War, Faith, Trade); **an unconfirmed card
  in a slot shows no yields — Confirm locks it and the aggregate fires**
  (the count-up is the scoring moment); **faith replaces the Magister's
  dice** — the dice go entirely, a faith reroll of a draft costs by age and
  by rerolls so far, printed as the rising price it is; the prophet's
  empire-wide rite is one of the five city rites cast everywhere; the
  apostle and a relic (faith per turn, once per cathedral) are faith's
  "magisterial supplement" ideas, open; buildings keep prerequisite chains.
  **Third pass (2026-09-06)** — every open item answered, folded into
  `docs/history/fewer-things.md` (§6 is the record): all twelve lines readable;
  cadence 2.8 and chairs down a quarter incl. Gov IV/V; ten chains; the
  Chapel pays culture on a rite (no gate — the tree is the only gate); the Cathedral keeps its roll; Court Augurs
  renamed to pay every city with an active rite; grants ignore chains; the
  faith ladder shaped like the augur's old prices; reroll from 35 faith at
  a slight exponent, prophets free; the apostle's third act is the relic;
  the base beaker halves and science moves into orders (the next playtest
  calibrates); three projects (production → gold / science / culture);
  veins marked, with hidden unique minerals. **Still open: the rites' faith
  price and per-city seal** (a default is proposed there).
  `docs/history/tech-gifts.md` — MARKED UP and folded (2026-09-06): **unique
  buildings, once per empire, as each age's anchor** (Heroic Epic · Imperial
  Throne · High Temple · Forum · the Caravanserai returned as the route hub;
  priced at half a wonder of the age; effects city-scoped bar the Throne's
  authority); the nodes' own gifts as the user wrote them (Movable Type's
  connected-city percents, Machinery's roads at a fifth, The Silk Road's
  endpoint luxuries, Horology's two periodic figures — "bursts are strong");
  the apostle at Theology; eight small shapes beside fewer-things' ten.
  `docs/history/orders-pass-3.md` — MARKED UP (2026-09-06), folded in its §9: the
  grammar is **put yields on a thing, then multiply the thing** (routes,
  Markets, the capital, great works, faith buildings — multipliers late,
  rare, applied last); **line readers withdrawn** for Orders (slot-flavour
  counts stay — CONFIRMED; `CardLine` is a drawn mark only); amplifiers stack additively; early pools
  lean standalone; periodic conversions (science↔faith↔culture, gold→science)
  as bursts; the cheer rows kept and the clamp left as is until the next playtest; the shrine engine tallies faith rerolls;
  four Gov V "just win now" bead Orders. All four questions in §9 answered. And
  `docs/deprecated/veins.md` — **SHELVED on your word (2026-09-06)**: the layer was
  unreachable for most of a game (its gate an Æra IV node) and a survey is
  the small frequent click this pass removes. `veins.share` is 0 (the last
  mapgen pass — every seed's ground stays bit-identical); the verb stays
  greyed by the tree; Geomancy keeps its mine line. In the drawer: the rare
  minerals as tech-revealed surface luxuries, no verb, when wanted.

- **Statecraft-close bug** — your deterministic recipe (discovery → culture
  boon → mid-turn draft → slot → dead ×) awaits confirmation on current
  main plus the console/elementsFromPoint probe.
- **Bot honesty — RULED into context**: the bot is not a balance baseline
  until significantly improved; playtests are the source of truth. The
  arena (`arena.html`) and the grid search (`scripts/gridSearch.ts`) are the
  instruments; the OFAT baseline needs re-running after the playthrough's
  tunings, on real seeds.
- **Bot debts, written down in docblocks** — a luxury's signature, the
  citadel's ring and hypothetical percents unpriced; a camp on
  charted-but-left ground over-counted; a wounded piece deep in enemy
  fields does not retreat; purchases don't read the unit mix; warscore
  wants a loss register (schema); the route reading under-reads a caravan
  (`score.caravanScale` 3 is the stand-in — the road's march and the
  destination's growth are the missing terms); naval is a hard null; the
  war economy's baselines sit outside the currency; the bot's culture plan
  prices drafts but a pass never conditions on the hand it just saw.
- **The opening build order, yours** (was `docs/flags.md`, folded here
  2026-09-07 by batch H4 — two lines are a flag, not a doc): *"ai needs to
  prioritize early scouts"* and *"my general build order is scout settler
  settler worker, that might not be optimal but first build being a scout
  should be hard-coded."* Unbuilt: nothing in `src/ai/` hard-codes a first
  build.
- **Late-game cost** — batch 9 in flight (above); if your game's End Turn
  drags past ~t100 on standard, say so and it jumps the queue.
- **Pamphlet shots: 3 outstanding** — move-attack, worker-improve,
  diplomacy-with-a-met-rival need a riper save; captions meanwhile.
- **Closed by your marginalia, for the record**: mid-peace expulsion (not
  now) · barbarian red rim (keep) · 4.5× declare (tune in playtest) ·
  project-headed towns (Civ V behaviour, confirmed) · authority roominess
  (defer to playtest) · camera easing (not needed; pan lock shipped) ·
  the seal lengthening (vetoed — slot-in/out is skill expression).
- **Playtest questions live** — the seven-line log: turn of each draft, the
  first pass and why, when slots first feel contested, the turn the wild
  stops mattering, when each age turns, beads per age, any stamp that
  surprised you.
