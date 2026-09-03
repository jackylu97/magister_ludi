# Magister Ludi (repo `magister_ludi`; formerly "WebCiv")

Browser Civ V-style 4X. TypeScript + Vite. Deterministic simulation, procedural
toon-shaded 3D renderer, data-driven balance. Design state: `docs/design-notes.md`
(condensed; the unabridged entry history is `docs/design-history.md` — cited
entry numbers refer to it). Open rulings: `docs/flags.md`.
UI language: `docs/design-specimen.html` (ink/parchment; every number tabular mono).

"Magister Ludi" is the product name; internal code keeps "webciv" in identifiers.
The RNG separator `hashSeed('webciv:gameplay:…')` (`src/sim/state.ts`) must NEVER
be renamed — it would change every seeded outcome. No further rename passes.

## Commands & test discipline
- `npm run dev` · `npm run typecheck` · `npm run test` (core tier) · `npm run build`.
- Two tiers: a test is *core* or *slow*; slow lives in `<concern>.slow.test.ts`
  beside the core file (`test/stress/` is slow wholesale). Slow means slow *by
  kind* — seed/size sweeps, multi-decade pacing sims, byte-for-byte replays —
  even if quick today. A source-reading register test is always core.
- **Subagents run narrow tests only**: `npx vitest run <your test files>` — never
  `npm run test`, never the whole suite. Other agents edit the tree on disjoint
  fences; a broad run sees their half-finished files. A typecheck error in a file
  outside your fence is NOT yours: one line in your report, move on. A subagent's
  done-gate is its own tests green + its own files typechecking.
- The **batch-gate** is the orchestrator's: typecheck + `npm run test` + build per
  settled batch, committed by explicit path. `npm run test:all` (core+slow) is the
  **push-gate** — nothing lands on `main` without it.
- `test:slow` = slow tier alone; `test:sim/mapgen/render/ui` = core per module
  (iteration only, never a done-gate); selection is `TEST_TIER` + one glob in
  `vite.config.ts` — no exclusion list.
- A helper two tiers share lives in a non-test module (`test/<dir>/<concern>Helpers.ts`);
  importing a `.test.ts` file re-registers its tests.
- Check exit codes, never grep a summary line ("Tests" prints on failure too).
- Subagents never commit/push, and never `git stash`/`checkout`/`reset` — other
  agents' uncommitted edits live in the working tree. Kill only processes you
  started, by PID. Never `pkill -f vite`.
- BSD grep treats `src/sim/statecraft.ts` as binary — use `grep -a` on it.

## Layout
- `src/sim/` — the game rules. PURE: no DOM, no canvas, no `Math.random()`, no
  clock. All randomness via the seeded `Rng` in `GameState` (`state.rng`).
- `src/render3d/` — default renderer (Three.js ortho toon diorama, procedural
  primitives only). Tunables in `data/view3d.json`.
- `src/render/` — FROZEN 2D renderers. Keep compiling; no new features ever.
- `src/ui/` — DOM UI. `controls.ts` drives renderers only through the `MapView`
  interface (`mapView.ts`).
- `data/*.json` — every balance number, cost, curve, mapping. Code holds
  algorithms, never tuned constants. `docs/mapgen.md` documents `data/mapgen.json`.
- Six root pages, all named in `vite.config.ts` inputs: the game, `pieces.html`,
  `mapgen.html`, `abacus.html`, `flair.html` (+`src/flairGallery/` — every drawn
  mark/flourish with live sliders; **a new visual asset joins it in the same pass
  that ships it**), and `compendium.html` + `src/ui/compendium.ts` — every entry
  generated from data rows and the sim's own describers, never hand-written prose
  about a number; stable `kind:id` anchors; also mounts as the in-game "?" overlay.
- `test/` — split `sim/`, `mapgen/`, `render/`, `ui/`, `stress/`. Never drop
  coverage; reworked tests replace.

## Hard rules
1. Every mutation flows through `applyCommand` (`src/sim/commands.ts`) or the
   end-of-turn phases it invokes (`src/sim/turn.ts`, fixed order). Commands are
   plain JSON, carry `playerId`, validate FULLY before mutating (rejected command
   = state byte-identical). The reducer's switch uses the aliased-discriminant
   exhaustiveness idiom — do not "simplify" it.
2. Determinism is sacred: same config + command log ⇒ bit-identical state. Saves
   are `{config, log}` and replay. Iterate arrays, never Map/Set order, for
   outcomes. Contention resolves by log/sweep order.
3. Turns are SIMULTANEOUS: per-player `turnEnded`; resolution when all end. There
   is no `currentPlayerIndex`. UI gates input to `localPlayerId` (a UI concept).
4. Rendering never touches sim randomness — visual jitter hashes tile coords
   (`hash3`/`hashUnit`).
5. **Explainable yields** (rule 5): any yield source joins its breakdown list;
   totals are the fold of the list — never compute a total beside it.
   `explainTileYield(tile, ctx?)` / `tileYieldOf` in `src/sim/cities.ts`
   (`explainCentreYield`/`centreYield` for the centre). `ctx` gates the renewals
   AND the resource reveal; who passes one is the `yieldContextFor` docblock's
   register; an owned tile is always evaluated with its owner's ctx.
6. Docblock comments explain *why*, in the existing files' voice.
7. **Player-facing words are plain**: rules stated in a first-time player's terms
   through the word tables in `statecraft.ts`; a data row's `note`/`deferred` is
   player prose with no identifiers; flavour only in `flavor`/`epigram`, always
   labelled Flavour. Voice: `src/ui/compendiumText.ts`'s docblock. Numbers never
   appear in written prose. (Apostrophes inside compendiumText's single-quoted
   strings must be `\'`-escaped.)

## Traps — sim
- **Mutable tile fields are exactly**: `improvement`, `feature`, `discovery`,
  `road`, `vein`, `surveyed`. `discovery` only ever *removed* (`claimDiscoveryAt`).
  Camps live in `GameState.camps`, not on the map. Features/resources are placed
  only by `generateMap` + `placeResources`, once, in `newGame` — **nothing may
  regenerate a tile mid-game** (`chopErrorAt` guards the canopy-resource case).
  Veins: `Tile.vein` (mapgen pass 8, `veins.ts` leaf) surfaces via the `prospect`
  verb (worker|explorer); `richOre` is a `buried`-marker bonus row.
- **Roads**: `Tile.road = builderId`, written only by `layRoad` (`roads.ts`, a
  leaf — `cities.ts` never imports `trade.ts`; pinned). A road step (both hexes
  paved) costs exact thirds inside `stepCost`. `roadFree` = a decreed hex (free
  for maintenance count). A trader is its own stacking-free `UnitCategory`;
  `Unit.trade` presence IS the route (no route register). `startRoute` may
  teleport an idle trader to the origin through `arriveOnTile`. A melee blow on
  a trading unit **plunders** (bounty to nearest city), never captures.
- **`explainEmpireGold`** (`empireGold.ts`, leaf) is four lines — City
  connections, Road/Unit/Building maintenance — one fold; a new recurring cost
  joins it, never a second fold. `Unit.freeUpkeep` written only at the five
  free-unit seams. `collectYields` prices every city before any banks.
- **Movement**: `stepCost(from, to)` is the ONE price of a step (takes a
  `MoveProfile`; embarkation is an empire fact; shore crossing is a pair-of-hexes
  rule, ships exempt). Four readers — `findPath`, `reachableTiles`,
  `advanceAlongPath`, `pathTurns` — a fifth caller prices through `stepCost` or
  its highlight lies. Zone of control is a toll (`zocExtraCost`), never a lock;
  `zocField` hoisted once per sweep. `snapMovement` keeps numerators integral.
- **`arriveOnTile`** (`arrival.ts`) is the one "came to rest here" seam (ruins
  claimed, camps burnt, civilians captured). Exactly two movers call it —
  `advanceAlongPath` and the melee winner's advance — plus `startRoute`'s
  teleport; any new way to move a unit calls it. Reports out via
  `CommandResult.arrivals`.
- **Units**: `captureUnit` (`state.ts`) is the only owner change. Barbarian roles
  derive per turn (`barbarianRoles`) — never store a role. An order is a waking:
  `orderedUnitId` in `applyCommand` clears `sleeping` (single excused arm:
  `sleepUnit`); `wakeSleepers` runs late and reads the sleeper's own sight.
  `spendLeftoverMovement` sits immediately before `resetMovement` (both halves
  load-bearing); a move ordered at zero movement is accepted as orders.
- **Combat is flat points on one ledger** (`planCombat`): terrain, fortification,
  general aura are labelled strength lines, never multipliers (only attacker-side
  percentages remain). City strength = `cityBaseStrength` (best buildable unit);
  max hp = `cityMaxHp` (never compare against `cityBaseHp`). `siegeField` ≠
  `zocField` (Great Wall's `zocRule` would besiege by nobody); `underSiege`
  derived, never stored. Cities are attacked in three beats (walls → garrison →
  capture off the plan); `canAdvanceOnto`/`canStopOn` refuse foreign city hexes.
  The wild never captures. A unit's escalation ladder is its row's
  (`UnitDef.escalation`, `Player.unitsBuilt`, raised in `realiseItem`, never for
  a free unit). A chop's printed base is `chopBaseFor` (aged before
  `windfallPayout` composes riders).
- **Tile ownership**: `tileOwnerPlayerId` is the coordinate reading (fine from a
  verb); `tileOwnerField(state)` is the sweep reading (hoisted once per sweep, by
  tile index; lifetime one sweep). A map-wide loop asks the field.
- **`realPlayers(state)`** is the register for "who counts" — victory,
  elimination, meters, blockers, seat cycling, rosters (`test/ui/seatRoster.test.ts`
  reads the UI sources). `state.players[id]` lookups fine; sweeps ask
  `realPlayers`. The barbarian seat is appended LAST (`seatBarbarians` extends
  all three parallel arrays); `turnEnded`/`visibility`/`citySightings` assume
  player id === index.
- **Research**: `researchPlan(player)` = `researching` + `researchQueue`
  (presence-is-state); the only writers are `writeResearchPlan` and
  `promoteResearchQueue` (inside `settleResearch`). A non-empty queue always has
  a head — the End Turn blocker relies on it.
- **Timed effects are comparisons, never countdowns**: `TimedEffect` on
  `City.timed`/`Unit.timed`/`Player.timed` carries absolute `expiresTurn`;
  `pruneTimedEffects` is a broom, not a clock. City-scoped readers in
  `statecraft.ts` go through `liveCityEffects` (= `liveEffects` + live rites) or
  they silently ignore rites. Same discipline: `SlottedOrder.sealedUntil`,
  `City.purchasedUnitTurns`, seals, stamps — absolute turns, nothing ticks.
- **Purchases**: `purchase.ts` — `purchaseItem {cityId, item, currency}`;
  `explainPurchaseCost` (ordered lines in a bank) + `purchaseError` gate every
  surface. A row naming its own bank (`UnitDef.purchase`) sells only there;
  everything else sells for gold at `goldPerHammer` × FULL production cost.
  Purchases realise through `realiseItem` (the thing-half of `settleProduction`),
  never the basket-half. The authority freeze does not bar a purchase (pinned).
  **A city buys one unit per class per turn**: `City.purchasedUnitTurns` — per
  `UnitPurchaseBucket` (`militaryGold`/`civilianGold`/`faith`, decided by
  `unitPurchaseBucket`: currency first, then `isCivilian`) — absolute stamps.
  Buildings uncounted. Markers not names: `purchase`, `consecrates`,
  `greatWork`, `faithPurchases`, `purges`, `acceptsContributions`,
  `oncePerEmpire`, `awaitsTech` — nothing in `src/sim/` compares a unit type
  against a string name.
- **Resource access** is `openedResource` (`cities.ts`), clauses in precedence:
  reveal tech (binds improvement, city AND yield — see rule 5's ctx), a great
  person's work (access only), the improvement, then a city on the seam. All
  derived, no flags. A resource pays only an empire that can name it
  (`resourceIsVisibleTo` gates label, access, yield); context-less
  `explainTileYield(tile)` is the omniscient reading (mapgen/tests only).
- **A luxury's signature is a list** on its row read by ONE evaluator
  (`resourceEffects.ts`) — nothing else switches on its `effect.kind`. Effects
  may carry `fromAge`, `perCopy` (silver/gold Æra III only), `scope`
  (`coastal`/`owner`/`capital`), building-category selectors, `renownPerCity`
  (family-less by construction). Adding a shape is a design decision; a luxury
  is a JSON row. `docs/luxuries.md` is the reference.
- **Percentages compound across two stages, never inside one** (Entry XVII):
  every yield percentage lands in `cityYieldPercents` with a `stage` (city |
  empire); `applyStages` does `(base+flats)×(1+Σcity%)×(1+Σglobal%)`, floored
  once. Growth surplus and border accrual are separate channels. One-time grants
  are modifier-immune (Entry XVIII.5): `windfallPayout` composes base + every
  rider into ONE printed figure before banking; riders on one occasion sum
  before multiplying once.
- **The register of mid-turn yield mutations** — each calls
  `refreshCityDerived(state, city)` (or `refreshTileDerived`) and adds itself to
  this list (the docblock on the helper). `assignCitizens` has exactly two sim
  callers — `collectYields` and the helper (pinned by source): 1 `setLockedTiles`
  · 2 `purchaseTileAt` · 3 production windfalls via `settleProductionWindfall`
  · 4 `buildImprovementAt` · 5 `pillageAt` · 6 `chopFeatureAt` · 7 `foundCityAt`
  · 8 `settleGrowthWindfall` · 9 `settleResearchWindfall` (whole empire) ·
  10 `settleCultureWindfall` (owes nothing; listed for completeness) ·
  11 windfall riders via `payWindfallGrants` (completion riders excepted) ·
  12 `purchaseItemAt` · 13 `settlePopulationWindfall` (fills no bucket) ·
  14 `settleBorderWindfall` · 15 the trade verbs (`startRoute`/`cancelRoute`) ·
  16 `pressLump`. Future windfalls join by calling a `settle…Windfall`, never by
  reimplementing a completion.
- **Culture**: `Player.culturePool` IS the draft basket (no second bank);
  border culture (`City.culture`) is a separate channel. Anything paying culture
  calls `settleCultureWindfall`. A draft's size is `explainOfferSize` asked when
  the offer opens (never on sight); offers are drawn once and spent by a command;
  a pick names an index. Adoption rebuilds the slots array (total amnesty);
  seals are absolute turns.
- **Cards**: `statecraft.ts` is the ONLY module switching on `CardEffect.kind`;
  a new card is a JSON row, a new *shape* is a design decision, and a shape
  declared but never read fails the register test. The fold registry (who folds
  what) is pinned in `test/sim/statecraft.test.ts`. A card whose text needs a
  one-off is **deferred and annotated**, never bent into a near-fit (this rule
  repeats across beliefs, legacies, wonders — always defer, never bend).
  `anyCardDef` in `statecraft.ts` spans all card classes (type-only imports both
  ways with `religionData.ts` — keep it that way). Empire conditions evaluate
  ignoring condition-gated effects (`conditionDepth`, the one stated cut).
- **Order deepening**: `OrderDef.upgrade` = `OrderUpgrade[]` — an ordinary
  `CardEffect` appends a line per level; an `OrderDeepening`
  (`{deepens, parameter: 'every'|'max', by}`) moves a printed number once per
  level. Cap: `maxOrderLevel` (3) or the row's `maxLevel`. Additive rows read
  byte-identically (pinned). `retired: true` rows leave every pool, keep the row
  for saves. Governments: tiers ride `tierLadder`; pools via `poolOfGovernment`
  (current + previous only).
- **Religion**: `bankPressure` has exactly two callers — `spreadReligion` (the
  tide) and `pressLump` (prophet/augur lumps; a proclamation is an instant lump,
  no pulse, no broom) — pinned by source. A city's religion is derived (majority),
  never stored. Follower beliefs apply city-locally to whoever owns the city;
  founder-side pay follows the stones (`religionFounder` = holder of the holy
  site). A follower row paying an empire fails the build. Beliefs/rites are rows
  of the same effect vocabulary read by the same evaluator. One-charge prophet
  and augur; an augur's rite is its whole turn (`augurHasActed`).
- **Wonders**: `GameState.wonders` is the register, written by `claimWonder`
  from `realiseItem`. The claim is history; pay follows the stones (holding
  city's `buildings`). "Banked toward it" = the front row or nothing (refund
  `wonderRefundGoldPerHammer` iff front). `wonder` is its own
  `ProductionCategory`; a wonder is never for sale (refused before currency).
  Completion grants realise via ordinary paths, reported as
  `RealisedItem.grants` → `CommandResult.grants`; `done:false` is a real
  outcome. `requiresSite` refused in `buildError` naming the site. A rite's
  hammers completing a wonder carry no toast (known gap).
- **Great people**: called, never built/bought (`greatWork` marker; `Unit.person`
  = who, in the piece fingerprint). Renown is added in ONE place
  (`settleRenownWindfall`); `explainRenown` is its rule-5 list; a spent roster
  banks rather than blocks. The draw is weighted (1000 + feed share), never
  restricted, spills `[age, previous…, next…]`; `chooseGreatPerson` is the
  reducer's one refusal that mutates (redraw on a taken name). The Academy's
  scholar draft goes through `OFFER_PURCHASES` (`buys`, not currency), charges
  faith, moves no renown. A work stands anywhere but water/mountain and opens
  the seam it covers ("Iron · academy"); a citadel is a flat defender line.
  Legacies are `liveEffects`' sixth source; revoked by MARKING
  (`LegacyRecord.revoked`, `revokeLegacies` the only writer), never deleting.
- **Projects** are queue rows that never leave (`settleProduction` returns
  before the splice, the overflow doubling, and the completion riders — nothing
  finished). The payout is deliberately NOT an Entry XVIII windfall (already
  staged going in); `productionModifiers` returns `[]` for a project.
  `ProjectPayout` = gold/science/faith; a culture project calls
  `settleCultureWindfall` instead. UI half: `insertionIndex`; the reducer
  refuses a duplicate project row. Known edge: a project-headed town never
  re-decides (no blocker) — the bot works around it; human nudge flagged.
- **Buildings' non-yield facts** read in one place (`buildingEffects.ts`):
  `happiness`, `cityStat`, `cityHp` fold through it as lists. A unit's price is
  `explainUnitCost` (ordered lines; `foldUnitCost`); the age band reads the
  unlocking tech, never the unit row.
- **Triumphs**: `Player.triumphs` append-only, turn-stamped; diffed
  (`triumphMarks`/`triumphsSince`/`triumphsAwarded`), never passed as
  parameters. `triumphs.ts` owns the only trigger switch: announced occasions
  (hooked) vs standing counts (swept in `renown` phase). `state.contested` keys
  `(id, age)`, first by log order, once per era.
- **The tree**: a node's column is `techColumn` (age-banded `techDepth`); **a
  column IS a price** (one tapered table in `tech.ts` — cost(1)=13; the root's
  column is nominal and never paid). Adding a tech is placement, not
  archaeology: prereqs choose the column (chain INSIDE the age — a cross-age
  parent buys no depth), the column prices it, and **the lanes are the user's
  chart** (2026-09-03; the annealer advises on new nodes only; crossings pinned
  as a number, false chains zero, absolute). `techsGrant` abilities
  (`ABILITY_TECH`): embark, siege, the great-person gate, rites. `TechDef` may
  carry card effects (`liveEffects`' tenth source), `paysBead`, `ageEntryDice`.
- **Endgame**: `opusOpen(state)` is DERIVED (any real player holds `alchemy`),
  no stored flag. Opus completion → golden bead → `closeTheGreatWork` →
  `takeReckonings` → `winnerId` = most beads, tie to builder.
- **A runtime import cycle** is caught by `test/mapgen/moduleCycles.test.ts`
  (globs every `src/sim/*.ts` as an entry). Typecheck does not see one; the
  symptom is "X is not a function" everywhere. A helper two modules need lives
  in a leaf (`roads.ts`, `unitData.ts`, `routeYields.ts`, `empireGold.ts`);
  `capitalCityOf`/`tileOwnerField` live in `state.ts`/`cities.ts` for this
  reason. Function-level cycles (types/constants only at top level) are the
  documented exception — `statecraft.ts`, `renown.ts` note theirs.
- **Heraldry is config, not state**: `charge` is an uninterpreted string beside
  `color`; fallback `heraldryFor(seatIndex, charge?)`. The charge prints on a
  parchment canton, never straight in seat ink.

## Traps — render & UI
- `MeshToonMaterial` ignores `flatShading` — bake facets into geometry. Fog is
  unusable with the ortho camera.
- **Fingerprints, not rebuilds**: pieces rebuild off `signUnits` (hashes id,
  col, row, hp, ownerId, type, chargesLeft, person, presence-of-trade — a
  source test pins the list; a new visual-affecting unit property is added
  there, deliberately). `CityLook` (`cityLook` in `cities3d.ts`) is the city
  equivalent: exactly two readers (build + `signCities`); a town's era is its
  owner's era. A new visual-affecting city property joins `CityLook` and
  nothing else.
- **The board builds once per game** (only new map / shadow toggle rebuild). An
  instance is off for three independent reasons, all bits on the handle
  (`instances.ts`): fog-hidden (`FogView`), suppressed (what's built on the
  hex), veiled (`RevealView`). Drawn iff none set; `restore` returns to what
  the other bits say. The suppression sweep (`clearGround`: cities → decor,
  clearsClutter → clutter, chopped treedCells → decor) is **monotone** — a
  pillaged farm keeps bare ground. The chop reads the board's own memory
  (`BuiltBoard.treedCells`), not the state. New dressing declares
  `suppressible:` on `collector.add` and passes `tile:` or it draws on
  unexplored hexes (`test/render/fog3d.test.ts` audits).
- Fog patches in place (`fog3d.ts`), never rebuilds. Seat-filtered layers
  (units, cities, territory, improvements, sites, lens, walk/death anims)
  rebuild off `FogStats.tiles` in the render loop — a new one joins there, and
  in `loadIcons` if it reads the atlas. `sites3d` has ONE fog rule (the
  improvement rule: ground survives on remembered hexes; camps until seen
  empty); the lens follows it. A layer rebuilt outside `FogView` re-applies the
  wash itself (`ImprovementLayer.paintFog` pattern). Gated-resource props are
  veiled per seat by `RevealView` off `BuiltBoard.resourceCells` (marker, prop,
  yield appear together — pinned).
- The yields lens rebuilds only when a hex's yield can change: the watched
  fingerprints + `MapView.noteStateChanged?()` per accepted command. Never
  per-frame recomputation.
- **"Faint" in the alpha-tested atlas is a colour, never an opacity**
  (`icons.inscriptionColor`). Every tile-atlas mark is path data or text;
  nothing fetched (only the ten badge files remain, Tabler MIT,
  `public/sprites/CREDITS.md`). `TILE_ICON_CELLS` may grow mid-set; consumers
  re-derive via `tileIconRect`; never persist an index.
- Marginalia: `marginaliaWater` (map fact, once) × `FogView.serpentFits` (fog
  fact, per repaint) — two rules, never merged; every instance carries `tile:`.
- A unit piece is three `InstancedMesh`es over one buffer (sculpt, outline,
  x-ray ghost); tests use `MESHES_PER_PIECE_BUCKET`; hide/restore moves all
  three.
- End Turn is three beats (marches → turn card → camera), timed by the
  renderer's `pendingAnimationMs()` (0 collapses to synchronous).
  `onTurnResolved` (autosave) and `onTurnHandedOver` (card) stay two moments.
- Per-game screens push their window listeners into `gameDisposers` (`main.ts`),
  swept in `showLanding` + boot (`test/ui/screenLifecycle.test.ts`). The sticky
  info card's capture handlers claim nothing while hidden/disconnected.
- **A named thing in a describer is a keyword ref**: describers emit
  `[[kind:id|Name]]` via `ref()`; every printed clause goes through
  `setDescriptorText` or `stripRefs`; a raw `[[` on any surface fails the sweep.

## Direction
- Vanilla Civ mechanics first. Single-player-vs-AI + remote multiplayer are the
  product; hot-seat is a dev harness. Netcode after playable core + AI.
- Everything visual is placeholder to be dialed later; art direction is settled
  (toon diorama + specimen language). Do not build parked ideas —
  `docs/flags.md` says what is parked and what is ruled.
