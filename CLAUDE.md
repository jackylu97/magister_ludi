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
- `npm run dev` · `npm run typecheck` · `npm run test` (Vitest) · `npm run build`
- All three gates (typecheck, test, build) must be clean before any task is "done".
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
  algorithms, never tuned constants.
- `test/` — sim + pure-render-math tests. Never drop coverage; reworked tests replace.

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
   returns the ordered list and `tileYieldOf` is `foldTileYield` of it — one implementation,
   golden-tested against the pre-refactor arithmetic. `ctx` carries the owning player's techs
   (renewals only); who passes one is the register in the `yieldContextFor` docblock.
6. Docblock-style comments explaining *why*, matching existing files' voice.

## Known traps
- `MeshToonMaterial` silently ignores `flatShading` — bake facets into geometry.
- Fog is unusable with the ortho camera.
- Piece visuals rebuild off a fingerprint of `(id, col, row, hp, ownerId)` — any new
  visual-affecting unit property must be added to the fingerprint.
- `Tile.improvement` and `Tile.feature` are the **two** fields on a tile that change during play
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
- Fog of war patches the board **in place** (`src/render3d/fog3d.ts`): a visibility change is
  per-instance matrix/tint writes for changed tiles only, never a board rebuild. Anything that
  adds instances to `buildBoard` must pass `tile:` to `collector.add` or it will keep drawing
  on hexes nobody has explored — `test/fog3d.test.ts` asserts the accounting.
- **The board is built once per game.** Only a new map and toggling shadows rebuild it.
  An instance is off for one of *two independent reasons* and both bits live on the handle
  (`instances.ts`, the two-bit state machine): **fog-hidden** (`hide`/`restore`, owned by
  `FogView`) and **suppressed** (`suppress`/`unsuppress`, owned by what has been *built* on
  the hex). Drawn iff neither. `restore` therefore returns an instance to
  `suppressed ? HIDDEN : as-built` — get that wrong and a scout walking past regrows the
  meadow a farm was ploughed over, which is exactly why this was deferred out of M7.
  Suppressing a fog-hidden instance writes no matrix at all and still holds when the fog
  lifts. The wash is orthogonal to both: a zero-scaled instance's tint means nothing.
- New board dressing must declare `suppressible:` on `collector.add` (`SUPPRESS.clutter` for
  ground scatter a farm ploughs under, `SUPPRESS.decor` for anything a town clears away).
  `addDecorations`'s `place` defaults to `decor`, so forgetting is safe there and nowhere else
  — an ungraded scrap is a pine growing through a market square.
- Layers that filter by the local seat (units, cities, territory, improvements, lens,
  walk/death animations) are rebuilt off `FogStats.tiles` in the render loop, not off their own
  fingerprints — a new seat-filtered layer must be added there too. A layer rebuilt *outside*
  `FogView` must also re-apply the wash itself, or it comes up lit on remembered ground; see
  `ImprovementLayer.paintFog` for the pattern (`tile:` on every instance, then `setWash` from
  the collector's own tile→handle map).
- A unit piece is **three** `InstancedMesh`es over one buffer: sculpt, outline shell, and the
  `depthFunc: GreaterDepth` x-ray ghost. Tests that count meshes use
  `MESHES_PER_PIECE_BUCKET`; hide/restore must move all three or a silhouette is left behind.
- A luxury's signature is a **list** of effects on its row, read by one evaluator
  (`resourceEffects.ts`). Nothing else in the game switches on `effect.kind`. Any effect
  may carry `fromAge` (gated on `highestAge`) or `perCopy` (silver/gold only — the marked
  exception to "a luxury counts once per kind"). Adding a *shape* is a design decision;
  adding a luxury is a JSON row. `docs/luxuries.md` is the as-ratified reference and lists
  every deferred effect with what it waits for.
- **Percentages never compound.** Meter percentages and a luxury's `percentYields` land in
  one list per city (`cityYieldPercents`), summed per yield and applied **once**. Anything
  that adds a new percentage source must join that list, never multiply afterwards.
- **Faith is accumulate-only.** Tiles and signatures pay it, `collectYields` banks it into
  `Player.faithPool`, and nothing spends it. The top bar's card says so; delete that note
  rather than reword it when something does.
- Resource **access** is one rule, `openedResource` in `cities.ts`, with three clauses in
  precedence: the reveal tech (binds *both* other clauses — a mine on a hill does not hand
  over iron before Bronze Working), the improvement on the tile, then a city standing on
  the seam whose owner holds that improvement's tech. All derived, no flags. Ledgers label
  which ("Gems · mine" vs "Gems · city"); holding both ways is still one holding.
- City-panel yields are derived state refreshed in `collectYields`; mutations outside
  the turn pipeline show stale numbers until end of turn. Narrowed since: the
  `setLockedTiles` command re-runs `assignCitizens` for that city immediately (the
  only place assignment runs outside `collectYields`), so pinning a citizen updates
  the panel at once. Everything else still waits for the turn.

## Direction (see docs/design-notes.md for full ledger)
- Vanilla Civ mechanics first; deckbuilding civics / happiness+authority / events
  are specced but deliberately later. Do not build parked ideas.
- Single-player-vs-AI + remote multiplayer are the product; hot-seat seat-switching
  is a dev harness only. Netcode after playable core + AI.
- Everything visual is placeholder to be dialed later; art direction and palette are
  settled (toon diorama + specimen language).
