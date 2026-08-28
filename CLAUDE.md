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
  - **Subagents run narrow tests only** (2026-08-27): `npx vitest run <the test files or
    directory for the code you changed>` — never `npm run test`, never the whole suite, and
    never a typecheck of the whole tree as a pass/fail (run `npm run typecheck` if you like,
    but an error in a file outside your fence is *not yours* — do not investigate it, do not
    touch it, note it in one line). Several agents edit the tree at once on disjoint fences,
    and a broad run sees their half-finished files: every "failure" that comes from that is
    wasted time and tokens. A subagent's done-gate is **its own tests green + its own files
    typechecking**.
  - **The batch-gate is the orchestrator's**: once a batch of agents has reported and the
    tree is settled, the orchestrating session runs typecheck + `npm run test` (core, ~30 s)
    + build, then commits each pass by explicit path.
  - `npm run test:all` = core + slow, ~85 s. **The push-gate**: the orchestrating session runs
    it once before every push to `main`, and nothing lands on `main` without it.
  - `npm run test:slow` runs the slow tier alone; `test:sim` / `test:mapgen` / `test:render`
    / `test:ui` are *core for that module* (fast iteration, never a substitute for the
    done-gate); `test:stress` is the stress fixture. Selection is one env var (`TEST_TIER`)
    and one glob in `vite.config.ts` — there is no exclusion list to maintain.
  - A helper two tiers share lives in a non-test module (`test/<dir>/<concern>Helpers.ts`,
    `test/mapgen/fixtures.ts`), never imported from a `.test.ts` file — importing a test
    file re-registers its tests.
- Check exit codes, never grep a summary line: `npm run test` prints "Tests" on failure too.
- Subagents: never commit or push; the orchestrating session handles git. **Never `git stash`,
  `checkout`, `reset` or otherwise move the working tree either** — other agents' uncommitted
  edits live in it, and a stash-bisect of a failure that was theirs to begin with is how work
  gets lost. A failure in a file outside your fence is not yours: note it, move on.
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
- `flair.html` + `src/flairGallery/` — the art inspection page (beside `pieces.html`,
  `mapgen.html`, `abacus.html`): every drawn mark family, the heraldic charges on each
  tincture, each flourish in isolation with live sliders, the frontispiece, the pantheon
  wheel, the six city tiers in Three.js, the chart marginalia, the palette and ramp. **A new
  visual asset is added there in the same pass that ships it** — the page is where art is
  iterated, not the game. **`compendium.html` + `src/ui/compendium.ts`** is the sixth root page
  (2026-08-27): the Compendium — every unit, building, wonder, improvement, resource, tech,
  Order, Doctrine, belief, rite, great person and Triumph **generated from the data rows and the
  sim's own describers** (`describeCard`, `techGifts`, `explainUnitCost`,
  `describeResourceSignature`…), never hand-written prose about a number; the same module
  mounts as the in-game overlay behind the "?" card. Every entry has a stable `kind:id`
  anchor (`unit:swordsman`) for keyword links later. All six root pages are named in
  `vite.config.ts`'s inputs.
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
7. **Player-facing words are plain** (Entry XXXIX): a rule is stated in a first-time
   player's terms — authority, hex, production, stored food, barbarians, clearing a forest, a
   ruin — through the word tables in `statecraft.ts` and plain ledger labels; a data row's
   `note`/`deferred` is player prose with no identifiers; flavour lives only in
   `flavor`/`epigram` fields and any surface that prints one labels it Flavour. The voice is
   `src/ui/compendiumText.ts`'s docblock; numbers never appear in written prose.

## Known traps
- `MeshToonMaterial` silently ignores `flatShading` — bake facets into geometry.
- Fog is unusable with the ortho camera.
- Piece visuals rebuild off a fingerprint — `signUnits` in `pieces.ts` hashes `id`, `col`,
  `row`, `hp`, `ownerId`, `type`, `chargesLeft`, `person` and the *presence* of `trade`
  (never its contents — `outbound` flips every leg) — and any new
  visual-affecting unit property must be added to it. A source-reading test pins exactly which
  properties are hashed, so adding one is a decision, not a drift.
- **A road is the fourth mutable tile field, and the caravan is the route** (Entry XXXV).
  `Tile.road = builderId` is written by `layRoadUnder` from `arriveOnTile` (a trader carrying
  a route came to rest here) and removed only by pillage; movement never asks whose it is. A
  road step — **both** hexes paved — costs exact thirds and ignores the ground, inside
  `stepCost(from, to)`, so the four readers agree by construction; `snapMovement` keeps the
  numerator an integer and the A* heuristic scales by `cheapestStepCost` (an unpaved minimum
  is inadmissible over paving). `layRoad` (`trade.ts`) is the **only** writer of `Tile.road` — the caravan's step and the
  Founders' Road at a founding both go through it. `Unit.trade` is the route — presence is the state, there is
  **no route register**, and a count of routes is a count of traders. **A caravan is not a
  piece you position** (2026-08-28): `startRoute` may name any idle trader anywhere and places
  it on the origin's centre through `arriveOnTile` — a teleport is a third way to move a unit
  and calls the one seam like the other two. `marchTraders` aims a
  leg immediately before `spendLeftoverMovement` spends it. A melee blow on a unit that
  `trades` **plunders** (bounty to the nearest city, forfeited by the wild) and never
  `captureUnit`s — the register's one exception, by marker. `explainTradeGold` is two lines
  by ruling: City connections (one total) and Road maintenance — the first upkeep in the
  game; future upkeep joins that fold, never a second one.
- `Tile.improvement`, `Tile.feature` and `Tile.discovery` are the **three** fields (four with `road`, above) on a tile
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
- **The research plan is one list and a non-empty queue always has a head** (Entry XXXIV).
  `Player.researching` is the aim; `Player.researchQueue` (presence is the state, deleted
  when empty) stands behind it; `researchPlan(player)` is the concatenation and the **only
  two writers** are `writeResearchPlan` and `promoteResearchQueue` (which runs *inside*
  `settleResearch`, so a windfall advances the head by the same routine). The End Turn
  blocker relies on that invariant — `researching === null` means nothing is planned — so a
  third writer that leaves a queue behind an empty head is a seat that can end its turn with
  a plan the phase never touches. `chooseResearch` without `queue` is byte-identical to the
  old command; the expansion order is chart depth then roster order, a fact about the tree.
- **`spendLeftoverMovement` sits immediately before `resetMovement`, and both halves of
  that are load-bearing** (Entry XXXIV): before the refill so what it spends is this turn's
  purse, after `healUnits`/`advanceFortify` so a piece's stillness is judged before a
  neighbour's path can move it. It walks `state.units` in array order through
  `advanceAlongPath` — the same seam as every march — and a move ordered at zero movement is
  now *accepted* and stored as orders, never refused.
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
- **The yields lens rebuilds when a hex's yield can have changed, and nowhere else**
  (2026-08-28). It is guarded by the fingerprints the frame already watches — improvements
  (`signImprovedCells`/`signImprovements`), features (a chop), territory (ownership is the
  context a hex is evaluated in), the reveal pass (`RevealStats.cells > 0`) — and, for cards
  and beliefs with no board fingerprint, once per accepted command through
  `MapView.noteStateChanged?()` from `controls.ts`'s `commit`. Never a per-frame yield
  recomputation over the map. A new seam that changes what a hex pays must reach one of those
  five, or the coin stacks go stale until a lens toggle.
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
  has **one** fog rule for its three tenants — the improvement rule: a ruin, a village and a
  **camp** are all *ground* and survive on remembered hexes (camps by the 2026-08-27 ruling:
  a camp is the one thing a player plans a march *against*, so it stays on the chart until
  the seat next sees the hex empty). `lens3d.ts`'s explorer clause is bound to follow it —
  the lens must never ring a hex the board is not drawing the thing on. `sites3d` also draws
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
  `playerPieceColor`. The charge prints on a **parchment canton** (flag hoist, seat chip),
  never straight in the seat's ink — twelve tinctures run sky to ink and no single ink reads
  on all of them.
- **"Faint" in the alpha-tested atlas is a colour, never an opacity.** A `globalAlpha` under 1
  does not fade a mark — every surviving fragment is opaque and the reduced alpha only erodes
  the antialiased edge until letterforms break. `icons.inscriptionColor` exists for exactly
  this reason. **Every tile-atlas mark is path data or text; nothing is fetched** —
  `TileIcons.load` has no `loadIcon` left, which survives only for the ten badge-class
  files (Tabler, MIT — `public/sprites/CREDITS.md`; the augur wears the candle off
  `consecrates`, never off its name). Reaching for `public/` from the tile atlas reintroduces the blank-cell failure three
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
  and `removeUnit`). Three occasions reach it — a melee blow on a lone civilian, `arriveOnTile`, which hands
  over **every foreign civilian on a hex somebody comes to rest on**, and (2026-08-28) a
  barbarian killed under Wolf-Mother's Pact, captured at 1 hp instead of removed — a capture,
  not a kill, so no kill rider fires (a melee winner may advance onto a tile whose survivors are all civilians). Any
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
  14. **`settleBorderWindfall`** (`cities.ts`, Entry XXXVI) — culture poured into a *town's
      bounds* rather than the empire's draft pool (Consecration of the Bounds). It claims through
      `expandBorders`' own pair (`bestExpansionTile` + `claimTile`), honours the freeze, loops
      while the basket covers the next rung, carries the remainder, then refreshes — the hex it
      claims is a hex a citizen may now be sent to.
  15. **The trade verbs** (`trade.ts`, Entry XXXV) — a route's yields join the origin's
      breakdown the turn it is sent or ends, so `startRoute`/`cancelRoute` refresh the origin.
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
  touches costs the ground's price **plus `rules.movement.zocExtraCost`** (1) — a toll, never a
  lock (2026-08-28). There are **four** readers and they must never
  drift: `findPath`, `reachableTiles`, `advanceAlongPath` and `pathTurns` (the interface's
  "~N turns", which used to keep its own copy of the loop in `unitPanel.ts` and was the one
  already wrong). A fifth caller prices a step through `stepCost` or it is a highlight
  promising a march the walk will not deliver.
  The toll is a strictly positive *addition* to an already-positive price, so there is no
  zero-cost edge, the A* heuristic (`cheapestStepCost`) stays admissible, and `reachableTiles`
  needs no zone-of-control clause of its own — the frontier's `cost >= budget` stop and
  `advanceAlongPath`'s overspend forgiveness are the same condition. `stepCost` returns
  `{ cost, zoc }`; `zoc` is presentation only and nothing prices off it twice.
  `zocField(state, ownerId)` is hoisted once per search beside `unitDef`; building one per edge
  is the shape to avoid, not the rule.
- **Combat is flat points on one ledger** (2026-08-28, Entry XXXVII). Terrain, fortification and
  a standing great general's aura (`generalAuraLines`, +3 within two hexes, both sides, the
  first general only) are labelled strength lines in `planCombat`'s fold (`explainTerrainDefense`,
  `fortifyBonus` in points), never a multiplier; the only percentages left are the attacker's
  own (river, `cardCombatPercent`). A city's base strength is `cityBaseStrength` — the best unit
  `buildError` would let its owner build — and its maximum health is `cityMaxHp` (`cityBaseHp` +
  every building's `cityHp`, read in `buildingEffects.ts`); nothing compares `hp` against
  `cityBaseHp` directly. **`siegeField` is not `zocField`** and must stay separate: the Great
  Wall's `zocRule` makes every owned hex a source, which would besiege a town inside that
  empire's borders by nobody. `underSiege` is derived per turn, never stored.
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
- **Belief spreads as citizens, and `spreadReligion` is the only writer** (Entry XL).
  `City.followers` and `City.pressureBank` are written by that phase alone (before
  `collectYields`); a city's religion is *derived* — more than half its people — never stored;
  a religion's name is drawn at founding from the pantheon's axes. **Follower beliefs pay the
  founder**, folded over every following city in the world as `liveEffects`' seventh source
  (`followerBeliefLines`) — never the city's owner; the `follows` scope is the one scope that
  asks who is reading (`cityScopeAdmits(…, viewerId)`). One religion per empire, at most
  ⌈⅔ × seats⌉ in a game, refused in `foundReligion`. `prophesies` is `consecrates`' sibling
  marker; the planting clause reads all four markers. A follower row that scopes a shape the
  founder's fold cannot read **fails the build** (`religionDataProblems`) — deferral is written
  on the row, never silently mispaid.
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
  JSON row**. Twenty-eight shapes go in (`statecraftData.ts`), labelled lists come out, and
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
- **Governments have five tiers, and the ladder is data** (2026-08-28): `GOVERNMENT_TIERS` is
  derived from the rows and equals `tierLadder` `[4, 10, 18, 29, 45]` by test; a tier with no
  triple is never offered. An Order may carry `onSlot` grants (The Laureate's great person),
  claimed once per game through `grantedOnSlot`; a retired Order (`retired: true`) leaves every
  pool and keeps its row so a save replays. `BuildingDef.purchaseOnly` is refused by `buildError`
  and sold by `purchaseError` (the Gilded Hall). Pillage has a **base** heal and gold
  (`rules.improvements.pillageHeal/pillageGold`) and riders are increments composed in
  `windfallPayout` — a card's text says "a further".
- **A Statecraft offer is drawn once, at the moment it opens, and spent by a command.**
  `discoveries.ts`'s doctrine at the scale Entry XV designed it for: an offer generated on
  sight would make the deal a function of when somebody looked at a screen, and under
  simultaneous turns two seats look at different times. A pick names an **index, never an
  id**. The government triple is the exception that proves it — it is *fixed*, read off the
  table rather than rolled, and **banked**: a pending draft or Doctrine blocks End Turn and
  a banked charter deliberately does not (`statecraftBlocker`), because Entry XV makes
  adoption bankable and a blocker on it would delete the only reason banking exists.

- **A draft's size is one fold, asked when the offer opens** (2026-08-27, Entry XXXI).
  `explainOfferSize(state, playerId, kind)` in `statecraft.ts` — base from `rules.offers`,
  one line per live `offerRider` (`{ offer: kind | 'all', extra }`, read from every
  `liveEffects` source: an Order, a belief, a wonder), a negative cap line at `rules.offers.max`
  — and `offerSize` is its fold. **Every generator asks it at the moment the offer opens**
  (`drawOrderOffer`, `drawDoctrineOffer`, `drawBeliefOffer`, `drawDiscoveryOffer`), never on
  sight; the extra cards are extra iterations of the same draw loop so a rider-free game
  replays byte-identically. `OfferKind` is open for `'greatPerson'`. The per-module size
  numbers still sitting in `statecraft.json` / `religion.json` / `discoveries.json` are dead
  and annotated; a generator that read one again would be a second table. The spread
  (`offerSpread` in `offerCard.ts`, pure) lays out 2–5 cards inside 1280×720 by custom
  properties; a pick still names an index.
- **Renown is added in exactly one place** (great people, 2026-08-27, Entry XXXII).
  `settleRenownWindfall` (`renown.ts`) is the fifth Entry XVIII seam — the buildings' trickle,
  a wonder's lump, every Triumph — and register entry 13 is the three great-person verbs.
  Overflow carries; a **spent roster banks rather than blocks** (nothing deducted, no empty
  offer left on a seat). `explainRenown` is the rule-5 list the HUD hover prints.
- **A great person is neither built nor bought — it is *called*.** `UnitDef.greatWork` is the
  marker (`consecrates`' third sibling); `buildError` and `purchaseError` both refuse the row,
  so it is the one unit type with no unlock tech. **`Unit.person` says *who*; `UnitDef.greatWork`
  says *what kind*** — two fields, two questions — and `Unit.person` is in the piece fingerprint.
  A worker may not plant a work and a great person may plant nothing else: one symmetric clause
  in `improvementError`; **a work stands anywhere but water and mountain** (2026-08-27 — the
  `anywhere` flag waives the four ground filters and the seam clause) **and opens whatever seam
  it covers** — a clause in `openedResource` after the reveal and before the table, access
  only, labelled "Iron · academy"; `ImprovementDef.greatPerson` names the **family** (presence is the
  marker). A citadel is worth its `defense` to whoever stands on the hex — one flat labelled
  line in `planCombat`'s defender fold, never a term in the multiplier.
- **Legacies are `liveEffects`' sixth source** and `CardId`'s seventh class; nothing else reads
  `Player.legacies`, and **nothing revokes a legacy** — which is why "lost the turn an enemy
  enters his city" is a deferred half on a data row and not a rule hiding in the walk. A legacy
  whose sentence needs a shape that does not exist ships as `legacy: []` with `deferred:` on the
  row; **a shape is never bent to nearly fit** (the Statecraft rule, third time).
- **The draw is weighted, never restricted, and spills before it fails.** Weight is
  `1000 + floor(1000 × feed share)` in integers — flat when nothing has fed, at most 2×, never
  zero; the spill walks `[age, previous…, next…]` and stops the moment the hand can fill, so a
  healthy age never leaks a neighbour's name. `chooseGreatPerson` is **the reducer's one refusal
  that mutates**: a name another seat already took is refused *and* the offer is redrawn (the
  alternative is a seat holding a dead hand that can never end its turn) — confined to that
  clause, fully log-determined, documented on the handler.
- **The Triumph news is a diff, not a sink.** `Player.triumphs` is append-only and turn-stamped;
  `triumphMarks`/`triumphsSince` for a resolution, `triumphsAwarded` for a command — which is why
  `foundCityAt`, `realiseItem`, `applyCombat`, `captureCity`, `settleResearch`, `claimDiscoveryAt`,
  `adoptGovernmentAt` and `arriveOnTile` grew no parameters. `triumphs.ts` owns the only switch on
  a trigger kind, split into announced *occasions* (hooked at those seams) and swept *standing
  counts* (read off the board once a turn in the `renown` phase — a size-10 city is a fact, not
  an event, and a sweep cannot miss). `state.contested` is the world's register, keyed
  `(id, age)`: first seat by log/sweep order, once per era.
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
- **A wonder is one per world, and the register is `GameState.wonders`** (built 2026-08-27,
  Entry XXX). Written in one place (`claimWonder`), from one place (`realiseItem`). The claim
  is *history* — who first raised it — and never moves; what a wonder *pays* follows the
  stones (the holding city's `buildings`, read by `liveEffects`' fifth source), so a captured
  wonder changes sides with no bookkeeping. **"Banked toward it" is the front row or nothing**:
  a city has one basket and it pays for `queue[0]`, so a beaten wonder refunds the whole basket
  iff the wonder is the front row (`rules.production.wonderRefundGoldPerHammer`, 1 — half the
  purchase rate, which is the penalty), and a wonder standing second is removed with nothing
  refunded. A per-item ledger would be a second ledger this game deliberately does not have.
  `wonder` is its own `ProductionCategory` and `queueCategory` is the one place a row is sorted
  into one — a `'building'` percentage does not ride on a wonder. `CardId` includes
  `BuildingId` (a wonder's `effects` sit on its row, adapted in `anyCardDef`; no building id is
  a card id, pinned). `realiseItem` returns `RealisedItem` — two kinds of news exist and a third
  joins the shape, never a second out-parameter. `buildError` takes an optional `city` and a
  caller that has a town passes it, or re-sending a queue that legitimately holds the wonder
  refuses itself. **A wonder is never for sale** — refused in `purchaseError` before the
  currency, because gold's gates are production's gates and production's would have sold one.
  **A city buys one unit a turn** (2026-08-28): `City.purchasedUnitTurn` is an absolute stamp,
  written by `purchaseItemAt` for units and read by `purchaseError`, never decremented —
  stale by itself. Buildings are not counted. And **an augur's rite is its whole turn**:
  `augurHasActed` (movement spent) gates both the rite and the consecration.
  Known gap: a rite's hammers can complete a wonder correctly but carry no toast out through
  `RiteResult`.
  **The rows are in** (Entry XXXIII, 27 of them, Æra I–III): a wonder may carry
  `requiresSite: CityScope` (refused in `buildError`, naming the site) and `onComplete`
  **completion grants** (a unit / `bestMelee` / the current research / a Doctrine draft),
  realised in `realiseItem` after the claim through the ordinary paths and reported as
  `RealisedItem.grants` → `CommandResult.grants` — `done: false` is a real outcome (nothing
  researched, a Doctrine already owed), never a silent skip. The four shapes the list added
  are read like every other: `pantheonSlots` in `pantheonSlots()` (a fold beside
  `slotsFromTechs`), `purchaseRider` as one line in `explainPurchaseCost`'s bank,
  `zocRule 'borders'` as one clause in `zocField` (every owned hex of the holder projects;
  inside that border every step pays the toll), `projectRider` at the one place a project's payout
  is banked (a flat addition to the *payout*, never to the hammers going in). A wonder's
  half that needs a shape which does not exist ships as `deferred:` on the row.
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
