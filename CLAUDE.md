# Magister Ludi (repo `magister_ludi`; formerly "WebCiv")

Browser Civ V-style 4X. TypeScript + Vite. Deterministic simulation, procedural
toon-shaded 3D renderer, data-driven balance. Design ledger: `docs/design-notes.md`.
UI design language: `docs/design-specimen.html` (ink/parchment, Instrument Serif /
Fraunces / Instrument Sans / IBM Plex Mono; every number tabular mono).

Naming is settled: "Magister Ludi" is the product name, but internal code may keep
"webciv" in identifiers and domain strings — the RNG separator
`hashSeed('webciv:gameplay:…')` (`src/sim/state.ts`) must NEVER be renamed, as it
would change every seeded outcome. No further rename passes.

## Commands
- `npm run dev` · `npm run typecheck` · `npm run test` (Vitest, **core tier**) · `npm run build`
- **Two test tiers, two gates** (2026-08-26). A test is *core* or *slow*, and the slow ones
  live in sibling files named `<concern>.slow.test.ts` beside the core file for the same
  concern (`test/stress/` is slow wholesale). Slow means slow *by kind*, not by clock:
  a sweep over seeds or sizes, a multi-decade pacing simulation, a long byte-for-byte
  replay, a scale fixture. A new test of that shape goes in the `.slow` sibling even if
  it happens to be quick today; a source-reading register test is always core.
  - `npm run test` = core, ~30 s. **The done-gate for a task**: typecheck, core test, build
    must all be clean before any task is "done" — subagents run exactly these three.
  - `npm run test:all` = core + slow. **The push-gate**: the orchestrating session runs it
    once before every push to `main`, and nothing lands on `main` without it.
  - `npm run test:slow` runs the slow tier alone; `test:sim` / `test:mapgen` / `test:render`
    / `test:ui` are *core for that module* (fast iteration, never a substitute for the
    done-gate); `test:stress` is the stress fixture. Selection is one env var (`TEST_TIER`)
    and one glob in `vite.config.ts` — there is no exclusion list to maintain.
  - A helper two tiers share lives in a non-test module (`test/<dir>/<concern>Helpers.ts`,
    `test/mapgen/fixtures.ts`), never imported from a `.test.ts` file — importing a test
    file re-registers its tests.
- Check exit codes, never grep a summary line: `npm run test` prints "Tests" on failure too.
- Subagents: never commit or push; the orchestrating session handles git.
- Kill only processes you started, by PID. Never `pkill -f vite`.

## Layout
- `src/sim/` — the game rules. PURE: no DOM, no canvas, no `Math.random()`, no clock.
  All randomness via the seeded `Rng` stored in `GameState` (`state.rng`).
- `src/render3d/` — default renderer (Three.js, ortho toon diorama). Procedural
  primitives only; no downloaded/hand-made assets. Tunables in `data/view3d.json`.
- `src/render/` — FROZEN 2D renderers (`?art=sprites`, `?art=flat`). Keep compiling;
  no new features ever.
- `src/ui/` — DOM UI. `controls.ts` drives renderers only through the `MapView`
  interface in `mapView.ts` (optional methods for renderer-specific features).
- `data/*.json` — every balance number, cost, curve, color mapping. Code contains
  algorithms, never tuned constants. `docs/mapgen.md` is the designer's reference
  for `data/mapgen.json`: every pass end to end and every tunable with its default.
- `test/` — sim + pure-render-math tests, split into `sim/`, `mapgen/`, `render/`,
  `ui/`, `stress/` by concern. Never drop coverage; reworked tests replace.

## Hard rules
1. Every game mutation flows through `applyCommand` (`src/sim/commands.ts`) or the
   end-of-turn phases it invokes (`src/sim/turn.ts`, fixed order). Commands are plain
   JSON, carry `playerId`, validate FULLY before mutating (rejected command = state
   byte-identical). The reducer's switch uses the aliased-discriminant exhaustiveness
   idiom — do not "simplify" it.
2. Determinism is sacred: same config + command log ⇒ bit-identical state. Saves are
   `{config, log}` and replay. Iterate arrays, never Map/Set order, for outcomes.
   Contention (simultaneous turns) resolves by log/sweep order.
3. Turn model is SIMULTANEOUS: per-player `turnEnded` flags; resolution when all end.
   There is no `currentPlayerIndex`. UI gates input to `localPlayerId` (UI concept,
   not a sim concept).
4. Rendering must not touch sim randomness — visual jitter hashes tile coords
   (`hash3`/`hashUnit`).
5. **Explainable yields**: any code adding a yield source (improvements, techs, cards) must
   add it as a contribution entry in the yield-breakdown list (see design-notes Entry VIII,
   "Explainable yields") — totals are the fold of the breakdown; never compute a total beside
   the list. **Landed with M7**: `explainTileYield(tile, ctx?)` in `src/sim/cities.ts`
   returns the ordered list and `tileYieldOf` is `foldTileYield` of it (`explainCentreYield`
   is its sibling for the city centre's base+inherit rule; `centreYield` is that fold) — one implementation,
   golden-tested against the pre-refactor arithmetic. `ctx` carries the owning player's techs
   and now gates **two** lines — the renewals and the resource reveal (see the trap below);
   who passes one is the register in the `yieldContextFor` docblock, and an owned tile is
   always evaluated with its owner's ctx.
6. Docblock-style comments explaining *why*, matching existing files' voice.

## Known traps
- `MeshToonMaterial` silently ignores `flatShading` — bake facets into geometry.
- Fog is unusable with the ortho camera.
- Piece visuals rebuild off a fingerprint of `(id, col, row, hp, ownerId)` — any new
  visual-affecting unit property must be added to the fingerprint.
- `Tile.improvement`, `Tile.feature` and `Tile.discovery` are the **three** fields on a tile
  that change during play. `discovery` is the mildest — it can only ever be *removed*, by a
  unit walking onto a ruin (`claimDiscoveryAt`) — and it forbids exactly what the other two
  do. Barbarian camps are deliberately **not** a fourth: they are founded mid-game and carry
  a history, so they live in `GameState.camps` rather than on the map the seed produced.
  The other two are what a *verb* writes
  (`buildImprovement`/`pillage`, and `chopFeature`). The map is still reproducible from
  `{config, log}` — both are logged commands — but it is no longer a pure function of the seed
  after turn one, so **nothing may regenerate a tile mid-game**. Features and resources are placed
  only by `generateMap` (`mapgen.ts` pass 1, then `placeResources`), which runs once in
  `newGame`; keep it that way. A chopped forest also puts a tile in a state mapgen could not have
  produced (a canopy resource on bare ground), which is why `chopErrorAt` refuses to strip a
  *revealed, unimproved* resource of the ground it was placed on.
- `clearsClutter` (a farm or a mine takes the tile's meadow) is the one thing the *board* knows
  about an improvement, and founding a city is the same question one grade wider. Neither is
  baked any more: `buildBoard` always emits the full dressing, and `Renderer3D.clearGround`
  sweeps **three** sources — `cities → SUPPRESS.decor`, `clearsClutter tiles → SUPPRESS.clutter`,
  and `board.treedCells whose feature is now 'none' → SUPPRESS.decor` (the chop) — whenever
  `signCityCells`/`signImprovedCells`/`signFeatureCells` move. Those fingerprints drive
  **suppression**, never a rebuild. The sweep is **monotone** — nothing is ever unsuppressed —
  so a *pillaged* farm keeps its bare ground: the prop disappears (its own layer) and the meadow
  stays gone, which is the Civ rule and what happens to a ploughed field.
  The chop's source is the odd one out and must stay that way: it is asked of the **board's**
  memory of what it baked (`BuiltBoard.treedCells`), not of the state, because after a chop the
  state says `none` and the buffers still hold pines. Anything else that removes baked dressing
  needs its own such record.
- `turnEnded` assumes player id === array index; revisit if players become removable.
  `visibility` and `citySightings` (M8) make the same assumption and revisit with it.
  **The barbarian seat is appended *last*, after the opening rosters are seated** (Entry
  XX), precisely so that assumption survives: every real seat keeps the id it would have
  had in a quiet world. `seatBarbarians` extends all three parallel arrays in one function
  — a seat added without all three is a seat whose fog grid is `undefined`.
- **`realPlayers(state)` is the register for "who counts".** The wild is a `Player` so that
  combat, stacking, movement and fog need no second implementation; everything that is
  about being a *nation* asks `realPlayers` instead of filtering `state.players` by hand —
  victory and elimination, the meters, the End Turn blockers, seat cycling, and the median
  tier the wild itself musters against. A hand-rolled filter is how a solo game starts
  declaring victory over an empty steppe. The full loop-by-loop audit is Entry XX.A.
  **The interface's rosters ask it too, and they were the ones that had been missed**
  (Entry XXI): the top-bar seat strip, the status line's waiting list, the Abacus's rods
  and the hot-seat seat cycle each drew a row for the wild. The rule is precise —
  `state.players[someId]` is an *id lookup* and is fine ("who is this"), anything else is
  a *sweep* and belongs to `realPlayers` — and `test/ui/seatRoster.test.ts` reads the
  sources in `src/ui` + `main.ts` and fails on the fifth surface.
- **An order is a waking, and it is enforced in one place.** `Unit.sleeping` (presence is
  the state, like `path`/`fortifiedTurns`/`chargesLeft`) is cleared by *any* accepted
  command that names the unit, through `orderedUnitId` in `applyCommand` — never by a
  `wakeUnit` line in each handler. `sleepUnit` is the single excused arm; adding a command
  stops that switch compiling until somebody has decided. There is no wake verb — "never
  mind" is `cancelOrder`, which is why it now accepts a sleeping unit with no path. The
  other end of it, `wakeSleepers` (`turn.ts`), sits as late as the pipeline allows (after
  `resetMovement` has walked everybody's standing orders) and reads the sleeper's **own**
  sight, never its empire's.
- **End Turn is three beats, not one instant** (Entry XXI): the marches on a still camera →
  the turn card → a beat → the camera to the first idle piece. The wait is the renderer's
  own `pendingAnimationMs()`, never a constant, and `0` collapses the whole thing to the old
  synchronous order (reduced motion, the frozen 2D pipelines). `onTurnResolved` (the
  autosave — a save must never wait on an animation) and `onTurnHandedOver` (the card) are
  two moments on purpose; do not fold them back into one.
- **`arriveOnTile` (`arrival.ts`) is the one "a unit came to rest here" seam.** Two things
  happen because a piece *arrived* rather than because anybody issued a verb — a ruin is
  claimed, a camp is burnt out — and there are exactly two places a position changes:
  `advanceAlongPath` (every march, fresh or resumed) and the melee winner's advance in
  `applyCombat`. Both call it, per *step*, beside `breakFortify` and for its reason. A
  third way to move a unit must call it too. It reports rather than announces; the reducer
  passes the report out through `CommandResult.arrivals`, because a cleared camp's bounty
  is already banked by the time the command returns and re-deriving which town received it
  would be a second implementation of `nearestOwnedCity`.
- Fog of war patches the board **in place** (`src/render3d/fog3d.ts`): a visibility change is
  per-instance matrix/tint writes for changed tiles only, never a board rebuild. Anything that
  adds instances to `buildBoard` must pass `tile:` to `collector.add` or it will keep drawing
  on hexes nobody has explored — `test/render/fog3d.test.ts` asserts the accounting.
- **The board is built once per game.** Only a new map and toggling shadows rebuild it.
  An instance is off for one of *three independent reasons* and all three bits live on the
  handle (`instances.ts`, the three-bit state machine): **fog-hidden** (`hide`/`restore`,
  owned by `FogView`), **suppressed** (`suppress`/`unsuppress`, owned by what has been
  *built* on the hex), and **veiled** (`veil`/`unveil`, owned by `RevealView` — "this seat
  has no word for what that is"). Drawn iff none is set. `restore` therefore returns an
  instance to *what the other bits say*, not to as-built — get that wrong and a scout
  walking past regrows the meadow a farm was ploughed over, or un-hides ore the seat still
  cannot name. Suppressing or veiling a fog-hidden instance writes no matrix at all and
  still holds when the fog lifts. The wash is orthogonal to all three: a zero-scaled
  instance's tint means nothing.
- New board dressing must declare `suppressible:` on `collector.add` (`SUPPRESS.clutter` for
  ground scatter a farm ploughs under, `SUPPRESS.decor` for anything a town clears away).
  `addDecorations`'s `place` defaults to `decor`, so forgetting is safe there and nowhere else
  — an ungraded scrap is a pine growing through a market square.
- Layers that filter by the local seat (units, cities, territory, improvements, **sites**,
  lens, walk/death animations) are rebuilt off `FogStats.tiles` in the render loop, not off
  their own fingerprints — a new seat-filtered layer must be added there too. `sites3d.ts`
  is the one layer with **two** fog rules and they are not interchangeable: a ruin or a
  village is *ground* and survives on remembered hexes (the improvement rule), while a camp
  is an *occupation* and is drawn only where the seat can see right now (the unit rule) —
  a remembered camp would be a banner a player sends a warrior at. `sites3d` also draws
  standing markers off the printed icon atlas, so it (and any new seat-filtered layer that
  reads the atlas) must be rebuilt in `loadIcons` too, or sites placed before the atlas
  finishes rasterising stand unmarked. A layer rebuilt *outside*
  `FogView` must also re-apply the wash itself, or it comes up lit on remembered ground; see
  `ImprovementLayer.paintFog` for the pattern (`tile:` on every instance, then `setWash` from
  the collector's own tile→handle map). A per-seat fact about *the board's own* instances is
  the other shape: it is a patching pass over recorded handles (`reveal3d.ts`), never a
  rebuild and never a bake-time decision.
- **`CityLook` is the city fingerprint's `CityLook`** (art pass, 2026-08-26). `cityLook(state,
  city, capitals)` in `cities3d.ts` is the single derivation of everything that changes a
  town's sculpt — tier, walls, shrine, temple, capital — with exactly two readers:
  `CityLayer.build` draws it and `signCities` packs it into the hash. A new visual-affecting
  city property joins `CityLook` and nothing else; drawn-but-not-in-the-look is a town that
  keeps its old roofs until something unrelated grows it (the piece fingerprint's discipline,
  one scale up; `test/render/cities3d.test.ts` pins the five). **A town's era is its owner's
  era** — `cityTier` asks `highestAge(owner.techsResearched)`; there is no such thing as a
  city's age, and a captured town is re-roofed the turn it changes hands.
- **Heraldry is config, not state.** `PlayerSpec.charge` / `Player.charge` is a plain
  uninterpreted string beside `color`, written by `normalizeConfig` only when named, so a
  charge-less config normalises byte-identically and nothing in `src/sim/` reads it. The
  fallback is `heraldryFor(seatIndex, charge?)` (`src/art/heraldryMarks.ts`), mirroring
  `playerPieceColor`. The charge prints on a **parchment canton** (flag hoist, badge boss,
  seat chip), never straight in the seat's ink — twelve tinctures run sky to ink and no
  single ink reads on all of them.
- **"Faint" in the alpha-tested atlas is a colour, never an opacity.** A `globalAlpha` under 1
  does not fade a mark — every surviving fragment is opaque and the reduced alpha only erodes
  the antialiased edge until letterforms break. `icons.inscriptionColor` exists for exactly
  this reason. **Every tile-atlas mark is path data or text; nothing is fetched** —
  `TileIcons.load` has no `loadIcon` left, which survives only for the eight badge-class
  files. Reaching for `public/` from the tile atlas reintroduces the blank-cell failure three
  passes have removed. `TILE_ICON_CELLS` may grow a member mid-set: every consumer re-derives
  through `tileIconRect` at build time and nothing persists an index (pinned in
  `test/render/resources3d.test.ts`); *writing an index down* is what the append rule forbids.
- **Marginalia placement is two rules that must not be merged**: `marginaliaWater` (pure
  function of the *map*, once at chart build — open sea for `fog.serpentRegion` in every
  direction) and `FogView.serpentFits` (pure function of the *fog*, per repaint — still
  unexplored). Hashing alone speckles monsters over an unwalked continent; the fog rule alone
  does the same with a longer fuse. Each instance carries `tile:` and is hidden the moment the
  hex is explored — the world drawn in over the monsters is the point.
- A unit piece is **three** `InstancedMesh`es over one buffer: sculpt, outline shell, and the
  `depthFunc: GreaterDepth` x-ray ghost. Tests that count meshes use
  `MESHES_PER_PIECE_BUCKET`; hide/restore must move all three or a silhouette is left behind.
- A luxury's signature is a **list** of effects on its row, read by one evaluator
  (`resourceEffects.ts`). Nothing else in the game switches on `effect.kind`. Any effect
  may carry `fromAge` (gated on `highestAge`) or `perCopy` (silver/gold only — the marked
  exception to "a luxury counts once per kind"). Adding a *shape* is a design decision;
  adding a luxury is a JSON row. `docs/luxuries.md` is the as-ratified reference and lists
  every deferred effect with what it waits for.
- **Percentages compound across two stages and never inside one** (design-notes Entry XVII,
  built 2026-08-24). Every percentage on a yield lands in one list per city
  (`cityYieldPercents`), each line carrying a `stage`: **city** (buildings' category bonuses,
  every luxury `percentYields` and `productionBonus` — "in every city" still applies *in a
  city*) or **empire** (the two meter tiers, and nothing else today). `cityStageSums` folds the
  list into the two sums per yield and `applyStages` (`modifiers.ts`) does the arithmetic —
  `(base + flats) × (1 + Σ city%) × (1 + Σ global%)`, floored **once** at the very end, in whole
  percentage points so the floor is exact. Anything that adds a percentage source must join that
  list with a stage, never multiply afterwards. Growth surplus and border accrual are **separate
  channels** with their own folds (`growthPercent`, `borderPercent`) and are not in this
  pipeline. One-time grants (the chop) are modifier-immune — Entry XVIII.5, pinned in
  `test/sim/modifiers.test.ts`.
- ~~**Faith is accumulate-only.**~~ **Superseded 2026-08-26** (Entry XXVIII): tiles and
  signatures still pay it and `collectYields` still banks it, but **augurs spend it**. The
  note that said so has been deleted rather than reworded, exactly as this trap instructed.
- Resource **access** is one rule, `openedResource` in `cities.ts`, with three clauses in
  precedence: the reveal tech (binds *both* other clauses — a mine on a hill does not hand
  over iron before Bronze Working, and see the reveal trap below: it binds the *yield*
  too), the improvement on the tile, then a city standing on the seam whose owner holds
  that improvement's tech. All derived, no flags. Ledgers label which ("Gems · mine" vs
  "Gems · city"); holding both ways is still one holding.
- A unit changes hands in exactly one place: `captureUnit` (`state.ts`, beside `createUnit`
  and `removeUnit`). Two occasions reach it — a melee blow on a lone civilian, and
  `arriveOnTile`, which now hands over **every foreign civilian on a hex somebody comes to
  rest on** (a melee winner may advance onto a tile whose survivors are all civilians). Any
  new way to put a unit on a hex inherits that, and must not write `ownerId` itself.
  Barbarian *intent* is the mirror rule: roles are derived from the board every turn
  (`barbarianRoles`) and never stored — do not add a `role` field to `Unit`.
- City-panel yields are derived state refreshed in `collectYields`; a mutation outside the
  turn pipeline would show stale numbers until end of turn. This used to be a closed
  register of hand-rolled exceptions. It is now **the register *and* THE helper**:
  `refreshCityDerived(state, city)` in `cities.ts` (and `refreshTileDerived(state, tile)`,
  which resolves the ground's owning city — that is what makes a *pillage* refresh the
  victim). Assignment is idempotent and derived, so the phase recomputes it and agrees.
  The register, which is also the docblock on the helper:
  1. `setLockedTiles` — pinning a citizen (the first, and the precedent).
  2. `purchaseTileAt` — bought ground is worked ground before the turn ends.
  3. **Windfall settlement** (`chopFeature`, Entry XVIII) — a one-time grant that covers
     the front of a queue completes it *that instant*, through
     `settleProductionWindfall` (`cities.ts`), which is `advanceProduction`'s own
     completion routine (`settleProduction`) plus the refresh. Future windfalls
     (science boons, cards, ruins) join by calling a `settle…Windfall`, never by
     reimplementing a completion or bypassing the refresh.
  4. `buildImprovementAt` — the farm pays this instant, in the *mechanism* so an AI gets
     it too.
  5. `pillageAt` — and its absence, to the victim's panel.
  6. `chopFeatureAt` — the felled wood changed the ground whether or not it finished
     anything.
  7. `foundCityAt` — the odd one out: it *creates* the derived state, and goes through
     the helper anyway so the claim below is exactly true.
  8. **`settleGrowthWindfall`** (Entry XX) — a grain cache or a camp's provisions that
     fills the basket. It owes more than the production windfall does: a city that just
     gained a citizen has a citizen to *place*.
  9. **`settleResearchWindfall`** (`tech.ts`, Entry XX) — the odd one at the other end. It
     refreshes **every** city of one empire rather than one, because a technology is an
     empire-wide fact about what ground is worth (a renewal, a resource reveal) and the
     citizen who should move is in whichever town stands on the seam.
  10. **`settleCultureWindfall`** (`statecraft.ts`, Entry XV) — the fourth bucket, and the
     one that owes the register **nothing**: a draft mutates no city's derived state, it
     puts a *decision* on the empire, and the End Turn blocker is what collects it. It is
     in this list anyway so the register stays the complete answer to "what settles".
  11. **The Statecraft windfall riders**, which are not a new path but a new *reason* the
     old ones fire: a rider may pay food or hammers into a town (Granary Levies, The
     Widow's Levy, Camp Followers), so `payWindfallGrants` reports which cities it
     touched and its callers settle those buckets through the wrappers above. The one
     deliberate exception is a **completion** rider: hammers there do not settle, because
     that call *is* a completion and `settleProduction` allows at most one item per city
     per call.
  12. **`purchaseItemAt`** (`purchase.ts`, Entry XXIX) — a thing bought outright with gold
      or faith. It is **not** a new completion path and must never become one: it goes
      through `realiseItem`, the half of `settleProduction` that is about the *thing*
      rather than about the basket. What it owes the register is the refresh, because a
      granary bought at noon changes what a citizen is worth before the turn ends.
  10. **`settlePopulationWindfall`** (Entry XXVIII) — a rite's citizen, granted outright.
      The first entry that fills **no bucket at all**: there is no threshold to clear and no
      overflow to carry, so it cannot go through `settleGrowthWindfall`, and pouring enough
      food into the basket to force a growth would be a different rule wearing a hat (it
      would gift the carryover, sized by how hungry the town happened to be). It still owes
      everything that follows a citizen — the growth riders, the production settlement, and
      the re-seating.
  **A new mid-turn yield mutation calls `refreshCityDerived` and adds itself to this
  list.** `assignCitizens` therefore has exactly two callers in the sim — `collectYields`
  (the phase) and the helper — and `test/sim/cities.test.ts` asserts that by reading the
  source, because it is the one property a seventh hand-rolled refresh would break while
  every behavioural test still passed.
- **A step's price is asked of `stepCost`, and it takes `from` as well as `to`** (Entry XXV,
  `pathfind.ts`), and the mover it is asked about is a **`MoveProfile`** (`{ def, embarks }`,
  hoisted once per sweep by `moveProfile` — embarkation is a fact about the mover's *empire*,
  Entry XXVII: a civilian whose owner holds Sailing may enter `embarkable` terrain, today
  coast alone, at `rules.movement.embarkCost`). `tileMoveCost` is now only the *ground's* half — the hex and the mover's
  `ignoresTerrainCost` — and the zone of control is the half a lone tile cannot answer: a step
  from a hex an enemy combat unit (or enemy city) touches to another hex **that same piece**
  touches completes and then empties the purse. There are **four** readers and they must never
  drift: `findPath`, `reachableTiles`, `advanceAlongPath` and `pathTurns` (the interface's
  "~N turns", which used to keep its own copy of the loop in `unitPanel.ts` and was the one
  already wrong). A fifth caller prices a step through `stepCost` or it is a highlight
  promising a march the walk will not deliver.
  The lock's arithmetic is the load-bearing part: `stepArrival` lands a locked step **exactly**
  on `turnBoundary`, never on `max(ground, boundary)`. That is what lets `reachableTiles` stop
  its frontier there with no zone-of-control clause of its own, and what makes a mid-march
  slide never cheaper than going around — so the overlay and the reducer cannot disagree. It is
  also why the lock is never a zero-cost edge, which both searches' settle-once guarantee needs.
  `zocField(state, ownerId)` is hoisted once per search beside `unitDef`; building one per edge
  is the shape to avoid, not the rule.
- **Tile ownership has two readings and a sweep asks the field.** `tileOwnerPlayerId(state, col,
  row)` is the *coordinate-shaped* reading — one hex, resolved through `getTileAt` and a walk of
  `state.cities` — and it is fine from a verb. `tileOwnerField(state)` (`cities.ts`, beside it) is
  the *sweep-shaped* one: the id→owner half hoisted once by a pass over the forty cities, answered
  **by tile index** because `state.tileOwner` is a parallel array over `map.tiles` and a loop
  already holds the address. A loop over the whole map that asked the coordinate reading per hex
  was 4.5 million calls a turn and 85% of a forty-city end of turn; `hasResource`,
  `resourceCopies` and `controlledHoldings` now ask the field. Its lifetime is **one sweep** —
  `zocField`'s bargain — because a field that outlived its loop would answer with a city list the
  state has moved past. `isFrontierCity` (`statecraft.ts`) is the one map-wide loop still on the
  coordinate reading; it is off the profile only because no fixture adopts a frontier card.

- **A resource pays only an empire that can name it.** `requiresTech` gates three things
  through one rule (`resourceIsVisibleTo`): the *label* (`visibleResourceAt`), *access*
  (`openedResource`), and the **yield** — `explainTileYield` omits the resource line for a
  ctx whose techs lack the gate. So the reveal moment adds the hammer to the tile, the
  citizen's score, the city panel and the top bar at once. A **context-less**
  `explainTileYield(tile)` is the *omniscient* reading and keeps the full yield: that is
  mapgen's start scorer and tests about bare ground, and it is the only exemption. Rule:
  **an owned tile is always evaluated with its owner's context** — the register of who
  passes one is the `yieldContextFor` docblock.
- **A timed effect is a comparison, never a countdown.** `TimedEffect` (`state.ts`, on
  `City.timed` and `Unit.timed`) carries an **absolute** `expiresTurn`, and the whole
  reading is `state.turn < expiresTurn` (`timedEffectIsLive`). Nothing decrements anything —
  that is `SlottedOrder.sealedUntil`'s lesson applied to a thing that hangs on a town.
  `pruneTimedEffects` (the pipeline's **first** phase) is a **broom, not a clock**: an
  expired effect is already inert, so deleting it changes no outcome, which is exactly what
  makes the phase safe to place anywhere, skip, or run twice. It deletes the key when the
  list empties, so a town whose blessings ran out serialises like one never blessed. The
  effects themselves are **ordinary `CardEffect`s read by the ordinary evaluators**:
  `liveCityEffects(state, city)` is `liveEffects(owner)` plus that city's live rites, and
  **every city-scoped reader in `statecraft.ts` goes through it** — a new one that reached
  for `liveEffects` directly would silently ignore every rite. The three off-list consumers
  are the register: `cardRulePercent` takes an optional `city` (the borders channel),
  `cardCombatLines` walks `liveUnitEffects`, and `timedCityTileLines` is the fifth `TileLine`
  producer, added in `cityContext` beside the granary's because both are facts about *one
  town*.
- **A thing is bought in one place, out of one of two banks** (`purchase.ts`, Entry XXIX).
  `purchaseItem { cityId, item, currency }` is the command; `explainPurchaseCost` is the
  price — `explainUnitCost`'s ordered-lines shape in a **bank** — and `purchaseError` is the
  gate every surface greys with. The rules that keep the two banks apart are on the *data*:
  **a row that names its own bank (`UnitDef.purchase`) is sold out of that bank and no
  other**, which is what refuses gold the augur; everything the roster leaves silent is sold
  by the treasury at `production.goldPerHammer` per hammer of its **full** production cost
  (never the remainder — the banked basket is neither spent nor discounted). Gold's other
  gates are `buildError`'s, asked through `buildError` itself. **Presence of `purchase` is
  the marker and `consecrates` is the other one**: nothing in `src/sim/` compares a unit type
  against `"augur"`, exactly as nothing compares against `"settler"`.
  A purchase **realises** through `realiseItem` (`cities.ts`) — the half of
  `settleProduction` that is about the *thing* (`createUnit`, `spawnTileFor`,
  `settlersBuilt`, the completion riders), never the half about the *basket* (cost,
  overflow, splice). A second way to acquire a unit or a building calls that, or the two
  drift on a spawn tile within a month. The **authority freeze does not bar a purchase** —
  it is about ground, and `test/sim/purchase.test.ts` reads the source to keep the clause
  from being added.
- **A belief is a card, not a system.** Beliefs and rites are rows of the *same* effect
  vocabulary read by the *same* evaluator; `statecraft.ts` is still the only module that
  switches on `effect.kind`. `CardId` spans five classes now, and the lookup across all five
  is `anyCardDef` **in `statecraft.ts`** rather than `cardDef` in `statecraftData.ts` —
  because the import between that file and `religionData.ts` is **type-only in both
  directions**, and it must stay that way or a type cycle becomes a runtime one. Adding a
  belief is a JSON row; adding a *shape* is a design decision, and the shapes this pass added
  (`hasBuilding` / `all` scopes, `terrain` / `resourceKind` / `all` tile conditions,
  `perAge`, `periodicOffer`) are generic and available to an Order on the same terms.
- The **props** for a gated resource are veiled per seat by `RevealView` (`reveal3d.ts`),
  fog's sibling: the board bakes every prop lit, `BuiltBoard.resourceCells` says which
  instances they are, and the pass writes only where the answer flipped (seat change and
  tech completion both re-evaluate, on the frame, like fog). Marker, prop and yield appear
  together on the reveal — `test/render/reveal3d.test.ts` pins all three.

- **A card's effect is read in exactly one place.** `statecraft.ts` is the only module in
  the game that switches on a `CardEffect.kind` — the same claim `resourceEffects.ts` makes
  for a luxury's signature, one scale out, and it buys the same thing: **a new card is a
  JSON row**. Twenty-four shapes go in (`statecraftData.ts`), labelled lists come out, and
  every consumer *folds* one into a breakdown it already had. The register of who folds
  what: `cityYields` and `cityYieldPercents` and `productionModifiers` (`cities.ts`),
  `explainHappiness` / `explainAuthority` / `meterEffects` (`meters.ts`), `planCombat`
  (`combat.ts`), `fullMovement` (`units.ts`), `sightOf` / `sightSources` (`visibility.ts`),
  `healUnits` (`turn.ts`), `createUnit` (`state.ts`), and `explainTileYield` through
  `TileYieldContext.cards`. A hook that pays into a total **without joining that total's
  list** is the failure this vocabulary exists to prevent — `test/sim/statecraft.test.ts`
  asserts the fold identities, and a shape declared and never read fails the register test
  in the same file. A card whose ratified text needs a one-off is **deferred and
  annotated** on its data row, never bent into a shape that nearly fits.
- **A windfall rider is part of the printed number.** Entry XVIII.5 is unchanged — a
  one-time grant pays its printed figure with no city percentages, no meter tiers and no
  Entry XVII staging — and `windfallPayout` (`statecraft.ts`) is what keeps that true while
  letting The Woodwrights double a chop: it composes the base and every rider into **one
  figure before anything is banked**, so 40⚙ is what the preview promises, what the basket
  receives and what the announcement says. Nothing downstream of that function ever sees
  the base again, and a new occasion joins by calling it — never by multiplying a
  settlement afterwards. Percentages on one occasion **sum** before multiplying once.
- **The culture bucket is Entry XVIII's fourth**, and `Player.culturePool` **is** the
  basket. There is deliberately no second bank on `PlayerStatecraft`: a second field would
  be a second answer to "how close am I to a draft", and the two would disagree the first
  time a windfall paid one of them. Border culture (`City.culture`) is a **separate
  channel** and is never spent here — one turn's culture fills both, exactly as it did
  before anything spent either. Anything that pays culture calls
  `settleCultureWindfall`, never `settleDraft` directly.
- **A seal is an absolute turn, not a countdown.** `SlottedOrder.sealedUntil` is compared
  against `state.turn`; nothing ticks it. A countdown would be state a phase has to
  maintain, and a phase that maintains it is a phase that can be skipped, run twice or run
  in the wrong order — so the `statecraft` phase deliberately has no seal step. Adoption's
  amnesty is likewise total *by construction*: `adoptGovernmentAt` **rebuilds** the slots
  array to the new layout rather than resizing it, because the new government's slot 2 is
  not the old one's and carrying anything across by index would seal the wrong card in the
  wrong kind of slot.
- **An empire condition is evaluated ignoring condition-gated effects.** `conditionRule`
  can ask about a meter and a meter counts cards, which is a real cycle; it is cut in one
  stated place (`conditionDepth` in `statecraft.ts`). Terminating, one rule, and exact for
  the content that exists. A new condition that reads something a card can change inherits
  that reading — do not add a second cut.
- **A Statecraft offer is drawn once, at the moment it opens, and spent by a command.**
  `discoveries.ts`'s doctrine at the scale Entry XV designed it for: an offer generated on
  sight would make the deal a function of when somebody looked at a screen, and under
  simultaneous turns two seats look at different times. A pick names an **index, never an
  id**. The government triple is the exception that proves it — it is *fixed*, read off the
  table rather than rolled, and **banked**: a pending draft or Doctrine blocks End Turn and
  a banked charter deliberately does not (`statecraftBlocker`), because Entry XV makes
  adoption bankable and a blocker on it would delete the only reason banking exists.

- **A project is a queue row that never leaves, and that is the whole mechanism** (Entry
  XXVI). `QueueItem`'s third kind. `settleProduction` subtracts the cost, banks the
  conversion and **returns before the splice** — so `turnsToBuild` needed no project
  clause (for a repeatable item "when does this finish" and "how often does this pay" are
  one question), overflow needed no rule (the remainder is next turn's down payment), and
  `advanceProduction`'s "at most one item per city per turn" is the rate limiter for free.
  It returns before three things on purpose, each because nothing *finished*: the splice,
  the overflow doubling (The Common Purse is about a completed thing's remainder — doubling
  a conversion's change every turn is a mint), and `payCompletionRiders`. **The payout is
  deliberately NOT an Entry XVIII windfall**: the hammers were already staged on their way
  into the basket (Entry XVII), so a payout riding the modifier pipeline would charge one
  conversion two multiplications. Nothing modifies it — a project is not a
  `ProductionCategory`, and `productionModifiers` returns `[]` for one, which is what a
  barracks minting money would otherwise be. `ProjectPayout` names **gold, science, faith**
  and culture is absent for the register's reason: those three accumulate, `culturePool` is
  a basket whose filling is a draft, so a culture project joins by calling
  `settleCultureWindfall` and never by adding a field. The interface's half is
  `insertionIndex` (`cityPanel.ts`): a new row lands in front of the **trailing run** of
  projects, and the reducer refuses the same project twice — a second copy is not a second
  conversion, it is a row that can never be reached.
- **A building's non-yield facts are read in one place**, `buildingEffects.ts` —
  `resourceEffects.ts`'s bargain one scale down. Flat yields still fold in `cityYields`;
  `happiness` and `cityStat` fold through this module into `explainHappiness` (`meters.ts`),
  `planCombat`'s defender breakdown and `sightSources`' radius. `cityStat` is deliberately
  `CardCityStatEffect`'s shape **minus its scope** — a wall a card raises and a wall a town
  built are the same fact about the same city — so the two lists concatenate with no
  translation. Both answers are lists, never numbers. A second happiness building or a
  watchtower is a data row; a `buildingDef(...).happiness` reach from inside a consumer is
  the second loop this file exists to prevent.
- **A unit's price is a fold too.** `explainUnitCost` (`cities.ts`) is the ordered list —
  roster's price · the settler ladder · the age band · the empire's law — and
  `unitProductionCost` is `foldUnitCost` of it. Each line carries the *difference* it makes
  to the running figure, so the list sums exactly however the intermediate floors fall. The
  age band (`RULES.production.unitCostAgeMultiplier`) is read off the tech that unlocks the
  unit, never stored on the unit row: `unlocks` already says when a unit belongs.

## Direction (see docs/design-notes.md for full ledger)
- Vanilla Civ mechanics first; deckbuilding civics / happiness+authority / events
  are specced but deliberately later. Do not build parked ideas.
- Single-player-vs-AI + remote multiplayer are the product; hot-seat seat-switching
  is a dev harness only. Netcode after playable core + AI.
- Everything visual is placeholder to be dialed later; art direction and palette are
  settled (toon diorama + specimen language).
