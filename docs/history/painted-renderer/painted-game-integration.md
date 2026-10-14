# Painted terrain — first playable integration

September 13, 2026. The user approved the roads/paired-border checkpoint and
requested integration stage 1. This stage brings the approved terrain into the
actual game; the object catalogue remains a later review.

## Entry and scope

Open `/?art=painted&light=golden` and start or load a game normally. This uses
`Renderer3D` and the real `MapView` contract, HUD and simulation. Other art modes
keep their current presentation. Time of day is selectable in Game setup.

The new board uses the approved terrain, hills, mountains, biome pigments,
vegetation, river/lake/coast treatment and painted lighting. Subsequent checkpoints
below integrate cities, all 43 resource types, all fourteen in-scope improvements
and the twelve approved unit representatives. Sites, roads and borders still use
their existing game art. Units reuse the existing game layer with the approved
kit where available and existing models for remaining types and states. Resource
roundels and yield overlays retain the real reveal rules.

## Runtime contract

- `paintedLook.js` owns texture/vegetation loading, the approved material hooks,
  light presets and the post-processing chain. It imports reusable study modules
  without importing the study page or its staged settlement data.
- `paintedBoard.js` builds deterministic, spatially batched terrain and instanced
  vegetation from the real map. Wrap groups share geometry. Every terrain vertex
  or prop instance records its canonical cell, allowing a per-cell texture to
  apply fog and clearing without rebuilding terrain. Shared river sectors use
  the best-known bank's visibility; land and props retain their own cell's fog.
- The native fog chart remains the unexplored background. New-board materials
  discard hidden geometry in both colour and shadow passes and wash explored
  terrain. City founding, improvements and chopping suppress existing scenery
  through the same clearing contract used by the current renderer.
- `paintedSurface.ts` registers immutable near terrain per simulation map. Tile
  heights, offset stacked pieces and walking animations sample actual triangles.
  Mouse picking filters chunk bounds, resolves visible mountain silhouettes and
  returns the original simulation tile and correct wrap copy.
- The study's default finite map remains unchanged. Production opts into wrapped
  neighbours, shared hills, mountain saddles, continuous shoreline joins and
  repeating pigment fields at the cylindrical seam.
- Static terrain shadows are cached independently of the viewport. Unit shadows
  use a separate small map containing only unit pieces. Fog/world edits update
  the static cache; panning and movement do not rebuild terrain. Rendering stays
  demand-driven while the player is idle.
  Three checks shadow casters against the main camera's layers. The integration
  therefore submits the two lights separately with temporary layer masks and
  restores the main camera immediately afterward; setting the shadow camera's
  layers alone does not isolate them. This also prevents units from leaving
  stale silhouettes in the terrain cache.
- Far vegetation uses spatial batches rather than one whole-world instance
  bound. Static transforms are frozen. Packed ownership attributes and removal
  of unused inputs reduce geometry memory without changing vertices, normals,
  pigments or instance counts.

## Review and validation

Review terrain readability and selection under the real UI, movement over hills,
visible/explored/unexplored transitions, city founding and cylindrical panning.
The Game setup panel includes **Benchmark full map**: a temporary omniscient
view-only sweep at play zoom, overview and the wrap seam. It warms each view,
reports frame intervals, CPU render submission time, calls/triangles and terrain
shadow rebakes, then restores the player's visibility and camera. It does not
change the map, commands or simulation state. Results are hardware/browser/DPR
specific and are a baseline, not a claim about all machines.

Focused tests cover fog/clearing composition, shared river visibility, periodic
pigments/coastlines, exact hill sampling, wrapped picking and movement, and
separation of static and moving shadow casters.

The live UI check founded Aldermarch on the actual standard map, queued a
worker and research, gave the scout exploration orders, and completed a full
two-seat turn. Switching seats hid the other player's terrain and restored each
seat's own visible region. Save/Continue uses the existing command-log format.

The initial benchmark caught an extra terrain shadow draw in the moving-unit
pass. Correct separation reduced play-view median time from 31.4 ms to 16.9 ms,
draw calls from 441 to 198, and submitted triangles from 2.38M to 1.05M. Geometry
storage fell from 248.5 MiB to 206.8 MiB. The fully zoomed-out world still submits
roughly 2.74M triangles; it retains the same approved foliage geometry. A cheaper
visual LOD remains a later optimization if the overview needs a strict 60 fps.

Final validation: `npm run typecheck` and `npm run build` pass. The core run
passes 6,049 tests and fails five existing documentation/data synchronization
checks: units roster, order pools, production-cost building and unit tables,
and the pending great-person documentation edits. The four committed failures
were reproduced on a clean HEAD; the great-person mismatch comes from changes
already present before this integration. No simulation rules or those documents
were changed here. An earlier run also exposed pre-existing trade-test cache
pollution in the card snapshot; it did not recur in the final run.

All renderer tests pass, including 33 new focused checks for board/fog/seams,
surface placement/picking/movement, shadow separation and asset-failure cleanup.
The saved two-seat scenario resumes successfully. A fresh standard map is left
open at play zoom for the visual review.

One conservative cache optimization remains: remembered-to-visible fog changes
currently invalidate the static shadow map even when caster presence is
unchanged. Narrowing that invalidation would reduce movement/turn spikes; it
does not affect the steady panning baseline or correctness.

### Standard-map baseline

[Raw measurements](benchmarks/painted-standard-2026-09-13.json), September 13:
seed 1, 80 × 52 / 4,160 tiles, fully revealed during the measurement only,
Mac in-app Chromium 152, 842 × 794 CSS pixels, DPR 1.5. Each view has 36 warm-up
frames followed by 120 measured frames. Test/build processes had finished.

| View | Median frame | 95th percentile | Median draws | Median triangles | Static shadow rebakes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Play, dense forest | 16.8 ms | 34.2 ms | 185 | 1.05M | 0 |
| Whole-world overview | 32.4 ms | 34.5 ms | 546 | 2.74M | 0 |
| Wrap seam | 16.7 ms | 33.2 ms | 114 | 0.54M | 0 |

The fresh board built in 7.19 seconds, with 206.85 MiB of unique geometry arrays
and 2.06 MiB of instance arrays. Those memory figures exclude textures, shadow
maps, render targets and other gameplay layers. Play had one 115.8 ms outlier
in this run; the preceding settled run peaked at 34.5 ms. This is a useful
baseline, not a locked-60-fps or low-end-device claim. Full-world LOD, startup
work and fog invalidation remain measurable optimization opportunities.

Next checkpoint: replace the existing gameplay object layers with the already
approved cities, resource/improvement/site art, chess pieces, roads and paired
civilization borders, with changes driven by actual game state.


## City checkpoint

The approved city GLBs now replace the old town sculpt in painted mode. Real
population fills stable housing addresses; actual owner age, capital status,
faith buildings and wonders select the architecture. Existing flags retain
ownership, religion and puppet indicators. Palisades use the actual completed
wall building and its existing age-dependent appearance. Foundations sample
the rendered terrain triangles, gate supports must fit land, and the central
garrison court remains clear. Canonical models repeat at the cylindrical seam.

City banners project from the new flag anchor; generic map projection remains
at ground level. Assets are loaded as a small city subset, with cleanup of
partial and late failures. `?cityReview` adds a visual-only palisade preview in
Game setup; it does not create buildings or modify the command log.

Typecheck/build pass. Nine city tests and three additional lifecycle checks
pass; banner tests also pass. The core run has 6,060 passing tests and six
failures: the five known documentation mismatches plus the existing Satrapies
test-cache mutation surfacing in techDocSync. No simulation or documentation
data was changed. The normal standard-map UI successfully founded a capital,
opened its panel, queued production and retained its stationed scout marker.
The coastal palisade preview was visually inspected.

The user requested continuation: resource props and core improvements are next.


## Resources and core improvements checkpoint

The live renderer now draws the approved art for all 43 resources and five core
improvements: farms, mines, pastures, camps and quarries. Animals retain the
approved small scale, minerals are exposed sculpted outcrops, plantation
resources use shrubs, and the six marine families have water-level silhouettes.
Resource knowledge uses `visibleResourceAt` and actual `tile.resource`; unstruck
veins remain invisible, including in the observer view.

`PaintedWorksLayer` owns recipes and spatial instance batches. Field pigment
clips to the same nonindexed terrain triangles as the visible land. Farms use
the approved parcel/stroke pattern with a tiny farmhouse, and hill fields stop
at mound feet. Mine ground uses the approved grey bedrock and small edge
strokes. Rigid buildings have fitted foundations. Fog-only rebuilds reuse the
expensive field recipes; fingerprints avoid rebuilds while panning.

Resources/improvements remain washed on explored ground and disappear on
hidden ground. City/chop suppression and farm/mine clutter clearing preserve
the existing distinctions. Pillage deletes the improvement, without introducing
a new damaged-state mechanic. The terrain fog texture's third channel now holds
reversible scenic-prop footprint reservations so herds and works have space.
Only known entries reserve space; colour and shadow passes share the mask.
This does not rebuild terrain or alter simulation tiles. Camps retain woodland
around the resource clearing.

Unsupported improvement IDs still use the existing layer. Unit models,
discoveries, roads and borders remain the next migration checkpoints.

Validation: typecheck/build pass; the core suite has 6,074 passes and the same
five existing documentation/data synchronization failures. Eleven works tests
cover all resource families, reveal and fog, suppression, terrain conformance,
pillage, wrapping, shader hooks, caching and disposal. Board reservation and
legacy improvement fallback tests pass too.

A normal solo game was played to turn 5: a city founded, a worker trained, moved
to an owned plains tile and ordered to build a farm. The fields and farmhouse
appeared with the correct charges and yields, and the result was saved as
**Painted farm review** through the normal Save As UI. No simulation fixtures
or browser-state injection were used for this check.

Resource-layer standard-map benchmark (same 842 × 794 CSS pixels / DPR 1.5,
80 × 52 seed 1, test/build processes finished): play median 17.6 ms, p95 34.3 ms,
201 draws / 1.10M triangles; overview 33.3 ms, p95 34.4 ms, 711 draws / 3.02M
triangles; wrap seam 16.7 ms, p95 33.6 ms. Static terrain shadow rebakes stayed
at zero during all three sweeps. Play had one 133.3 ms outlier. The new
reservation attribute adds about 4 MiB to board arrays (210.82 MiB total;
resource/city GPU allocations are separate). This fresh board built in 9.84 s.
[Raw resource benchmark](benchmarks/painted-resources-standard-2026-09-13.json).
The benchmark includes generated resources but no developed empire; it is not
a stress measurement of hundreds of farms or cities.

## Plantations, lumbermills and fishing boats — September 14

The user approved the city/resource/core-work review and asked to continue.
This second improvement sub-review is implemented in the opt-in live game.
The next six special works await its eye check.

- Plantations reuse the approved cultivated shrubs, contour-following beds and
  tiny farmhouse. All thirteen plantation resources are covered, including reeds
  with planted stems rather than shrubs. Retained forest/jungle remains a feature.
- Lumbermills use a shared, indexed timber saw shed and separate log stockpile.
  Each fits independently to the actual terrain; both are instanced and owned by
  the settlement-art factory. A reversible radius .50 scenic clearing leaves the
  surrounding canopy. No river requirement or modern industrial equipment is implied.
- Fishing boats reuse the approved 10.5 KiB GLB at the water datum. All six marine
  resources remain alongside the hull instead of occupying its footprint.

Actual improvement state drives visibility, including captured works whose current
owner lacks the construction technology. Unexplored works disappear, remembered
works retain the normal wash, and pillage removes the improvement while retaining
the resource. These three improvements do not trigger whole-tile clutter clearing.
The legacy layer skips only the eight migrated IDs; special works remain visible.

Review: `/flair.html?review=works&work=lumbermill&light=golden&detail=close`.
This is a named Flair Cabinet stall using the actual `Renderer3D`, not a second art
implementation. It provides flat/hill plantations, reeds, forest/jungle mills and
marine resources beside the approved city/farm and current road/unit layers.
The fixture validates placements against simulation rules and never touches a saved
game. Work, scale, light, labels, remembered state and reset controls are available;
drag/scroll use the production camera. Its per-instance closer zoom floor does not
change the main game's opening scale or zoom limits. The original saved game is
available as **Painted farm review — approved**.

Visually checked flat/hill mills, hill plantation, reeds, boats, the combined view
and remembered terrain under daylight/golden presets. Typecheck and build exit 0.
All renderer tests pass, including 19 works tests, two lumbermill geometry tests,
five fixture tests and the independent gallery/game camera limit check.
Full core suite: 6,089 passed, six failed. Five are the previously recorded
documentation/data sync failures (greatPeople, productionCosts twice, statecraft,
units). The sixth is compendium's named-rule roster receiving `theImperialPost`
in the combined run; all 56 compendium tests pass in isolation. No simulation,
tech data or those test expectations were changed in this checkpoint.
Logs: `.dream-loop/painted-works-next-{core,typecheck,build,compendium}.log`.

No new performance claim: new geometry is shared and cached, the boat adds one
asset download, and no per-frame terrain rebuilding was introduced. The existing
standard-map baseline above still applies to the earlier resource-only measurement.

## Six special improvements — September 14

The user approved plantations, lumbermills and boats and requested continuation.
Academy, landmark, manufactory, customs house, citadel and holy site are now
implemented in the opt-in game renderer. This finishes the improvement catalogue;
the user approved this final sub-review before requesting the upstream leader
integration described below.

- A shared indexed kit supplies a colonnaded academy, gilt-tipped obelisk, kiln
  workshop, tiered trading hall, open bastioned fort and votive stone circle.
  Pale masonry, terracotta and restrained gilt use the approved painted lighting.
  Academy and trading-hall interiors have cool recesses for readable arcades.
- Solid halls sit behind the central unit position on fitted foundations. The
  citadel and holy site instead supply individual wall/column support footprints.
  Those supports reach the hill surface without filling the courtyard or moving
  a standing unit's ground height. Small paving strokes clip to the real terrain.
- Actual tile improvement state drives each work. The underlying surface resource
  remains visible when revealed, with props arranged in front of the monument;
  hidden veins are never drawn. Existing great-work resource access, whole-tile
  clutter suppression, explored wash, hidden cells, capture and pillage semantics
  are retained. No religion anchor or invented ruined-state substitutes for state.
- Generated sculpts are owned/disposed by the settlement-art factory and instanced
  in spatial batches; three world-wrap copies share geometry. Visibility updates
  retain cached fitted recipes. No new model download or per-frame board rebuild.

Review: `/flair.html?review=works&work=academy&light=golden&detail=close`.
The same production-renderer stall retains the prior works and adds all six, plus
extra hill academy/holy-site examples. The Units control places a representative
current warrior on each special work, without affecting any saved game. Normal
and detail zoom, four light presets, remembered ground and labels remain available.
The curated fixture validates all resources and works against current game rules.

Visually checked every new silhouette, flat/hill foundations, occupied academy and
citadel, coastal trading hall, the complete district and remembered terrain at
game zoom. Darkened washed-out arcade interiors and reduced the paving strokes
after the initial eye check. Dense stacked-unit/body clearance is still part of
the upcoming unit-kit integration; only representative single occupancy is signed
off here. This pass adds no new performance benchmark claim.

Validation: typecheck/build exit 0; all renderer tests pass, including 23 works,
five special-geometry and five review-fixture tests. Full core: 6,097 passed,
seven failed. Five are the existing great-people/production-cost/statecraft/unit
documentation mismatches. Two are combined-run text failures involving
`theImperialPost`/`satrapies` (cardTextSnapshot and techDocSync); both files pass
all five tests when rerun together in isolation. No simulation or tech data was
changed. Logs: `.dream-loop/special-works-{core,typecheck,build,isolation}.log`.

## Upstream leader checkpoint — September 14

The approved art now runs with `origin/main` at `3f997dc` on
`codex/painted-leader-integration`. The combined game includes the final thirteen
leaders, their paired colours, names, abilities and unique content. The unit
inventory covers all 61 registered IDs; the additional IDs remain pending art
variants, not newly approved sculpts. Religious/trader badge classification and
the two new naval sculpt aliases were corrected during this compatibility pass.

The integration was exercised through the real UI on a fresh 80 × 52 standard
map with two seats and Mithridates: found Sinope, queue a worker and research,
auto-explore, end the turn, save and reload at turn 2. The named review save is
`Mithridates — painted integration`. The upstream save schema changed from 110
to 115; old saves were left untouched and cannot be relabelled as new saves.

See [the leader integration record](leader-upstream-integration.md) for preserved
files, validation and remaining unit work. Earlier performance numbers in this
document describe the earlier build; this merge has not been re-benchmarked.

## First unit checkpoint — September 14

The twelve accepted primitive chess pieces now use the production unit layer,
including the five great-person family appearances resolved from `Unit.person`.
Cached geometry retains ivory/gilt details, paired owner colours, real shadows,
fog visibility, badges, health and worker charges. Resting, walking and falling
copies resolve the same art and status colours. Plinth and wagon-wheel support
samples the actual painted terrain, with wider offsets for stacked pieces.

The focused review is `/flair.html?review=units&unit=warrior&light=golden&detail=close`.
It supplies game/detail zoom, three leader colour pairs, five families, a city
garrison, hills, selection, remembered terrain and a real movement command in a
disposable fixture. The Mithridates save also resumes with painted pieces, and
its scout badge selects the correct real unit panel.

Typecheck/build pass; the core suite passed 6,428 tests. Three focused
motion/falling checks and typecheck/build passed after the final outline-colour
correction. Unapproved roster IDs, embarked units and laden traders keep their
existing models. The look remains opt-in and awaits the user's unit eye check.
See [the detailed unit record](painted-unit-integration.md) for evidence and limits.

## Infantry equipment checkpoint — September 14

After approving the first unit integration, the user requested continuation.
Six variants now extend the accepted warrior pawn: swordsman, legionary,
longswordsman, fire lance, khopesh and eagle warrior. Each keeps the same body
and plinth, with a distinct weapon/shield or compact helmet treatment. Their
stationary, moving and falling copies use the shared painted resolver.

The separate Infantry variants group at
`/flair.html?review=units&unit=infantry&light=golden&detail=close` compares the
seven-member line and offers individual game/detail views. A Badges toggle
exposes headgear during inspection. The original representative fixture and
default game's badge display are retained. See
[the infantry record](painted-infantry-variants.md) for scope and validation.

## Anti-cavalry and ranged checkpoint — September 14

Nine equipment variants now use the same production painted kit: phalanx,
spear wall, pikeman, fubing, Pontic peltast, bowman, composite bowman,
crossbowman and slinger. The approved spearman and archer remain unchanged.
Flair has separate Anti-cavalry and Ranged groups, each including its accepted
base piece. Owner colours, model picking, hover outlines, fog, movement and
falling copies follow the existing production paths.

Coverage is now 27 of 61 roster IDs; 34 retain legacy art, as do embarked units
and laden caravan states. This batch awaits visual approval before the next
unit families. See [the equipment review](painted-polearm-ranged-variants.md).

## Mounted checkpoint — September 14

The user approved anti-cavalry and ranged. Thirteen more roster IDs now resolve
through the painted kit: seven armoured cavalry variants, three mounted-ranged
variants and three chariot variants. Cavalry and Mounted ranged groups in Flair
include the approved horseman and horse archer. Horse variants retain the
exact accepted bust and plinth geometry; the camel and chariots use separate
simple silhouettes. Armour panels follow the original shoulder taper.

Coverage is 40 of 61 roster IDs. Twenty-one IDs, plus embarked and laden-caravan
states, still use legacy art. This mounted batch awaits its visual review;
siege, naval, remaining faith/caravan variants and world-layer integration
remain. See [the mounted review](painted-mounted-variants.md).

## Siege checkpoint

The mounted set is approved. Catapult and trebuchet now have painted models:
a low torsion engine with a throwing cup and a taller counterweight engine
with a sling. They share the established plinth and pigments; their frames
and mechanisms have different silhouettes. Flair's Siege group provides a
side-by-side comparison, individual scales and the production interactions.

Coverage is now 42 of 61 roster IDs. Remaining unit work is fourteen naval
IDs, four religious variants and the Rihla caravan, plus embarked and laden
states. World-layer integration also remains. The siege set awaits its eye
check; see [the siege record](painted-siege-variants.md).

## Naval checkpoint

The siege set is approved. All fourteen naval IDs now use carved enamel hulls,
ivory sails and gilt fittings in the production kit. Three Flair groups cover
light, heavy and ranged ships on navigable water. Runtime embarked land units
and laden caravans retain their existing boats. Waterborne pieces preserve the
water/path height so a nearby bank cannot lift the hull by its footprint.

Coverage is 56 of 61 roster IDs. Remaining roster models are augur, apostle,
inquisitor, canoness and Rihla caravan; runtime embarkation/laden states and
world-layer integration remain. Naval awaits visual approval; see
[the naval record](painted-naval-units.md).

## Religious and caravan checkpoint

Naval is approved. Augur, apostle, inquisitor, canoness and Rihla caravan now
have painted models. Religious and Caravans Flair groups compare them with
the unchanged prophet and covered wagon. The retired augur stays retired;
this adds only compatibility art. All 61 roster IDs have painted coverage.

Embarked land-unit boats and laden caravan states remain on runtime art;
those state variants are the next bounded integration pass after approval.
World-layer integration (roads, discoveries and paired city borders) and a
final gameplay/performance review remain afterward. The current batch awaits
an eye check; see [the faith/caravan record](painted-faith-caravan.md).

## Embarkation checkpoint

The user approved religious/caravan models and explicitly declined loaded
caravan art. Painted trading wagons now keep their ordinary appearance.
All embarked land types share a painted transport boat with their original
badge and owner colours. Naval types retain the approved fleet. The main
painted runtime exchanges boat/land models at the animated shore crossing;
it no longer uses the arrival model for the whole move.

Embarked transports have their own Flair review with water travel, a settler
embarking and a warrior making landfall. Pending this eye check, unit-model
coverage is complete. Remaining work is world-layer integration (roads,
discoveries and paired city borders), then gameplay/performance review.
See [the embarkation record](painted-embarkation.md).


## World-layer checkpoint

Embarked boats are approved. Roads, all five discovery/camp compositions and
paired empire borders now use the approved artwork in the main painted runtime.
Roads follow paved cells and hill faces, with flat spans over narrow river cuts.
Each empire perimeter has two joined ground ribbons; city-to-city boundaries
within one empire disappear, including across the cylindrical map seam.

Sites retain the existing reveal gates, standing markers and survey notes.
Claimed sites and cleared camps disappear through the existing layer signatures.
All three layers follow fog and reuse geometry; none rebuilds the board.
The legacy default is unchanged.

The focused Flair review is `/flair.html?review=world&view=borders&light=golden`.
It includes discovery, ownership, road removal and fog controls on an isolated
fixture rendered by the production renderer. Typecheck, build and 6,512 core
tests (232 files) pass. The world layers await their eye check. Final gameplay
and full-map performance review remain before deciding on default rollout.


## Final validation checkpoint

World layers are approved. The assembled main game passes model/badge selection,
HUD and visibility checks on the resumed standard map. A startup stall traced
to thousands of chunk raycasts per discovery layout is fixed with exact local
triangle contacts; the comparison preserves the layout to floating-point noise.
All 6,513 core tests, typecheck and build pass.

Standard-map medians: play 17.6 ms, overview 33.4 ms, wrap 16.7 ms at
1280×678 / DPR 1.5, with no static shadow rebakes during panning. The benchmark
covers the opening game. Developed-empire stress and default rollout remain.
See [final validation](painted-final-validation.md) for limits and raw evidence.

## Movement performance checkpoint

The September 14 playtest reported slow movement. The shared state/frame update
path now scopes rebuilds to changed presentation and layer visibility, preserves
unchanged work/site region batches, and retains terrain shadow depth through
charted-ground fog washes. Exact vertical contacts use lazy triangle buckets,
including walking footprints and improvement supports.

The standard-map presentation-update probe dropped from 61.7 to 4.3 ms median
CPU refresh without fog changes and from 60.8 to 9.5 ms with charted visibility
changes; neither scenario rebaked terrain shadows after the change. All 6,520
core tests, typecheck and build pass. See
[measurement and caveats](painted-movement-performance.md).

## Overview performance checkpoint

Wholly unexplored board batches now skip color and shadow submissions; partially
charted batches keep the existing per-cell masks, including shared river banks.
Overview ground uses larger spatial batches with the same faces and pigments.
Close picking, prop populations and full-detail static shadows are preserved.

On the same opening standard save, charted overview drops from 501 to 49 draw
calls and 33.3 to 16.7 ms median frame interval. Fully revealed overview remains
about 33 ms. Geometry arrays add 3.52 MiB; repeat load time is unchanged within
run variation. All 6,523 core tests, typecheck and build pass. See
[measurements, tradeoffs and limits](painted-overview-performance.md).

## Startup construction checkpoint

Terrain triangulation reuses each face's circumcircle; vertex indexing hashes
positions while retaining full attribute equality. A paired CPU comparison on
the same standard map reduces cold construction from 6.84 to 5.47 seconds,
with byte-identical geometry. Warm topology-cache builds improve about 5%.
These figures exclude downloads, GPU work and saved-game replay; browser total
loading has not been claimed faster by the same ratio. All 6,526 core tests,
typecheck and build pass. See [startup measurements](painted-startup-performance.md).

## Background terrain construction checkpoint

The main game prepares painted terrain in a one-shot worker before adopting new
or resumed state. Finished buffers, hill contacts and batch membership transfer
back to the renderer; live materials, shared prop assets, fog, picking and wrap
copies remain under renderer ownership. Failed jobs can be retried; replaced or
disposed jobs terminate and discard stale output.

Pigment indexing/allocation changes improve paired CPU construction by 11–20%
with byte-identical geometry. Browser handoff after transferring hill metadata
is roughly 27–62 ms on the tested standard maps. Worker construction keeps page
frames running; total loading still includes replay, asset loading and GPU work.
See [measurement scope and results](painted-startup-performance.md).

Validation: 6,537 core tests in 237 files, typecheck and production build pass.
The final resumed-map probe records 386 page frames during worker construction,
42.8 ms maximum callback gap and 34.2 ms main-thread handoff. Initial simulation,
save replay and GPU upload remain outside that interval.
