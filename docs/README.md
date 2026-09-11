# Magister Ludi — the briefing

**Read this first.** It is the whole game in current-state terms: what each rule
*is* today, which doc is its reference, which module is its home, and what is
still open. No history — where a rule came from lives in `docs/history/`, and you
should open that only when you need the *why*.

The engine's hard rules and traps are `CLAUDE.md` (auto-loaded; not repeated
here). The condensed design state is `docs/design-notes.md`. Open rulings are
`docs/flags.md`. The interface's design language is `docs/design-specimen.html`.

---

## The game

A browser Civ V-style 4X. TypeScript + Vite, deterministic simulation, a
procedural toon-shaded 3D diorama, and every balance number in `data/*.json`.

Four ages are built — **I Omens · II Heroes · III Empire · IV Cathedrals** — and
**Æra V Magister** exists as a deliberately unbuilt shelf. Theme: the magister's
study; hermetic, renaissance-punk, "vaguely alternate history". Names are
mythologised, never historically over-specific.

Single-player against bots is the product; hot-seat is the dev harness; netcode
comes after a playable core and a good AI.

## The loop and the turn

- **Turns are simultaneous.** Each player has `turnEnded`; resolution runs when
  all of them have. There is no `currentPlayerIndex`. The UI gates input to
  `localPlayerId`, which is a UI concept and not a rule.
- **Every mutation flows through `applyCommand`** (`src/sim/commands.ts`) or the
  end-of-turn phases it invokes (`src/sim/turn.ts`, a fixed order). Commands are
  plain JSON, carry `playerId`, and validate FULLY before mutating — a rejected
  command leaves the state byte-identical.
- **Determinism is sacred.** Same config + command log ⇒ bit-identical state. A
  save is `{config, log}` and replays; `SCHEMA_VERSION` gates it. Iterate arrays,
  never Map/Set order. Contention resolves by log or sweep order.
- **Phase order** (`turn.ts`) leads with `settleDiplomacy` and runs through
  religion, yields, production, research, renown, `worldClock`, `wagers`,
  `census`. `collectYields` prices every city before any bank is touched.
- **Timed effects are comparisons, never countdowns.** `TimedEffect` carries an
  absolute `expiresTurn`; `pruneTimedEffects` is a broom. Seals, stamps and
  purchase marks all work the same way — nothing ticks.
- End Turn is three beats in the UI (marches → turn card → camera), timed by the
  renderer's `pendingAnimationMs()`. `firstBlocker` (`turnBlockers.ts`) is what
  raises a prompt before the turn can end.

## The map and the starts

Reference: **`docs/mapgen.md`** · data: `data/mapgen.json` · code:
`src/sim/mapgen.ts` and `src/sim/mapgen/`.

- `generateMap(seed, sizeName, overrides?)` is a **pure function of its three
  arguments**. The map is not stored in a save; it is regenerated, so anything
  that made the map is in the config.
- **Nothing may regenerate a tile mid-game.** Features and resources are placed
  once, in `newGame`. The only mutable tile fields are `improvement`, `feature`,
  `discovery`, `road`, `vein`, `surveyed`.
- Generation is two noise fields plus ordered passes: the pangaea mask and its
  island belt, terrain and hills, forest/jungle and the clearings punched through
  them, lakes, coast, the shelf chains, rivers, floodplains, freshwater, then
  resources. Only rivers and resources roll the map's dice; the woodland pass
  keeps seed-keyed streams of its own so it disturbs neither.
- **Start positions are not a generation pass.** `chooseStartPositions`
  (`startPositions.ts`) derives them from the finished map and rolls nothing.
  Spacing is `spacingFactor × √land`, clamped between a floor and a ceiling; four
  fairness guarantees hold, and a leader's start bias runs in three stages.
- `mapgen.html` is the experimental loop — every tunable, live, with an override
  seam. The doc's tunable tables are sync-tested against the data
  (`test/mapgen/mapgenDocSync.test.ts`).

## Yields — the sequence

Reference: **`docs/yields.md`**, the sequence of record · code: `src/sim/yields/`
(`hex.ts` · `town.ts` · `empire.ts` · `stages.ts`, a one-way chain).

- **Rule 5: a total is the fold of a labelled list**, never computed beside it.
  Three verbs and only three — `explainX` returns the list, `foldX` is its one
  sum, `readX` is the memo and lives in `src/sim/readings.ts` alone
  (`test/sim/verbs.test.ts` is the register).
- **Percentages compound across two stages, never inside one**:
  `(base + flats) × (1 + Σ city%) × (1 + Σ empire%)`. Yields are exact decimals;
  rounding is the surface's.
- Eighteen steps: twelve per town (the centre, the worked hexes, the cards' city
  lines, the luxuries, the specialists, the arriving routes, the palace, the
  buildings, the cards' building shares, the conversions, the percent list, then
  the two stages) and six per empire (the luxuries' empire signatures, the
  caravans abroad, the treasury's ledger, the cards' empire payouts, the empire
  stage, the banks). The order is pinned against the source by
  `test/sim/yieldsDocSync.test.ts`.
- **One-time grants are modifier-immune.** Everything pays through a
  `settle…Windfall`; `windfallPayout` composes base + every rider into one
  printed figure before banking.
- The register at the foot of `docs/yields.md` says where every card kind that
  pays a yield lands. A new kind joins it or the sync test fails.

## Cities, production and purchases

- A city's non-arithmetic self lives in `src/sim/cities.ts` — territory,
  ownership, founding, citizens, growth, borders, the resource clauses, the tile
  purchase. Its arithmetic is `src/sim/yields/`.
- **Production costs are one standard** (**`docs/production-costs.md`**):
  `sizeHammers[size] × columnRate ^ (column − 1)`, floored once, then the
  once-per-empire line and a unit's escalation ladder. A row carries a **size**
  (small/medium/large/wonder; light/line/heavy/engine/settler) and **never a
  figure** — a row with `cost` on it fails a register test. The column reads the
  unlocking tech, or the row's own `column` where the tree names nothing.
  `columnRate` is 1.31. Projects keep a flat `cost`.
- **Beakers and hammers are committed to the thing they were spent on.** Progress
  is per technology (`Player.techProgress`) and per queue row
  (`City.itemProgress`); switching starts the new thing at nought and the old
  thing is still standing when you come back. Overflow is the opposite rule and
  follows the *queue*.
- **Purchases** (`purchase.ts`): `purchaseItem {cityId, item, currency}`, gated by
  `explainPurchaseCost` + `purchaseError`. A row naming its own bank sells only
  there; everything else sells for gold at `goldPerHammer` × the full production
  cost. **A city buys one unit per class per turn** (military-gold, civilian-gold,
  faith), by absolute stamp. Buildings are uncounted. Wonders are never for sale.
- **Projects** are queue rows that never leave; the payout is deliberately not a
  windfall. A project-headed town never re-decides (a known edge the bot works
  around).
- Buildings' non-yield facts are read in one place, `buildingEffects.ts`.

## Units, movement, combat, siege

Reference: **`docs/units.md`** (the roster; generated) and
**`docs/war-diplomacy.md`** §5b (the waterline and the taking of a town).

- **`stepCost(from, to)` is the ONE price of a step.** Four readers — `findPath`,
  `reachableTiles`, `advanceAlongPath`, `pathTurns`. Movement is in fifteenths;
  a road step costs a third by default, a fifth under Machinery. Zone of control
  is a toll, never a lock. Shore crossing is a pair-of-hexes rule; ships are
  exempt.
- **`arriveOnTile`** (`arrival.ts`) is the one "came to rest here" seam — ruins
  claimed, camps burnt, civilians captured, a march refilled under The King's
  Road. Any new way to move a unit calls it.
- **Combat is flat points on one ledger** (`planCombat`). Terrain, fortification,
  the general's aura and a wall are labelled strength lines, never multipliers;
  only two attacker-side percentages survive (a river crossing, and a card's own).
  Damage is an exponential in the *difference* of two effective strengths, so an
  edge is worth the same multiplier at any rung.
- **A town is attacked in three beats** — walls → garrison → capture, off the
  plan. A **melee** kill on the garrison beat takes the town in the same blow; a
  ranged kill leaves it to be walked into. City strength is the best unit its
  owner could train now; `underSiege` is derived, never stored.
- **The waterline**: a land piece that closes may not strike a water hex; an
  embarked piece may not strike a ship; land bows and land siege fight a hull at
  their own percentages; a hull boarding a column takes a share of the counter.
- Auto-upgrade (`upgradesTo`) is gated on the strategic resource. A unit whose
  successor the empire could field today is refused by `buildError` and hidden
  from the build list, but a row already queued builds out.
- **The wild never captures.** Barbarian roles derive per turn, never stored; a
  camp's mount follows the age's tier.
- A melee blow on a **laden trader plunders** (bounty to the nearest city), never
  captures.

## The tech tree and the ages

Reference: **`docs/tech-tree.md`** (Part 2 generated; `TECH_DOC_WRITE=1`) · code:
`src/sim/tech.ts`, `techData.ts`.

- Fifty nodes, thirteen columns, ages 12/9/14/15. **A column IS a price** — one
  table, 5 · 11 · 24 · 50 · 100 · 190 · 360 · 650 · 1150 · 1960 · 3250 · 5150 ·
  8000. Every figure is one fitted curve (`ln cost(n) = ln 5 + 0.8084n −
  0.01613n²`, friendly-rounded); retuning is re-fitting two constants, never
  editing a row. It is a taper, not an exponential.
- **Adding a tech is placement, not archaeology**: prereqs choose the column
  (chaining *inside* the age — a cross-age parent buys no depth), and the column
  prices it. **The lanes are the user's drawing** (`row`, `columnShift`); the
  annealer only advises on new nodes.
- Ages follow columns: columns 9–12 are Æra IV. Alchemy takes all five closing
  lines as parents — the sanctioned exception to ≤2 parents.
- `techsGrant` abilities (embark, siege, the great-person gate, the rites); a
  `TechDef` may carry card effects and `paysBead`. Seventeen effect-carrying
  nodes are the stated exceptions to the neutral-tree ruling.
- **The world's age is the mean** of every living real seat's highest technology,
  floored (`worldAge`, `worldClock.ts`) — not the first seat's. Crossing gives
  the current age a public countdown.
- `researchPlan(player)` = `researching` + `researchQueue` (presence is state),
  written only by `writeResearchPlan` and `promoteResearchQueue`.

## Statecraft — governments, doctrines, orders, wagers, malices

Reference: **`docs/orders-and-doctrines.md`** (the master list, sync-tested) ·
code: `src/sim/statecraft/` (`evaluator.ts` · `describers.ts` · `draft.ts`).

- Culture fills **one** pool (`Player.culturePool` IS the draft basket); border
  culture (`City.culture`) is a separate channel. The draft meter is
  `12 + 6n + n^2.8`. Offers are drawn once and spent by a command; a pick names
  an index. Adoption rebuilds the slots (total amnesty). Seals are absolute turns.
- **No levels**: an Order is what its row prints, held once. A draft is take one
  or **pass** — a skip spends the hand and raises `orderSkips`, and each banked
  skip adds pity to the uncommon and rare weights of the next draw. Rarity
  (● common ◆ uncommon ○ rare) is weighed 4/2/1 inside each sub-bag of the
  guaranteed military/economic/wildcard spread.
- Pools: Chiefdom → Government I/II/III (tier 18 is the last new pool). Doctrine
  tiers ride the ladder 4/10/18/29/45. Chairs by tier are the doc's Governments
  table, sync-tested.
- **`statecraft/evaluator.ts` is the ONLY module switching on `CardEffect.kind`.**
  A new card is a JSON row; a new *shape* is a design decision, and a shape
  declared but never read fails a register test. The eight ways to pay a voice
  are **one `pays` kind** with `where` (city · capital · hex · empire · route) ×
  `basis` (flat · count · mirror · share · rate). The four flag-rule kinds are one
  `rule` kind.
- **Defer, never bend**: a card whose text needs a missing shape ships deferred
  and annotated, in player-plain prose. This rule repeats across beliefs,
  legacies, wonders and leaders.
- **The wager** (**`docs/wager.md`**, the live deck, sync-tested): three cards on
  the turn an age opens, drawn from three different lines, the same three for
  every seat. Each seat stakes one privately; all three bars are public on the
  Abacus. A bar is claimed the turn a seat first meets it — a wager is a bar, not
  a race. At the age's close a seat that staked and missed takes a **malice**: an
  Order with a bad face that takes the last chair of its own flavour, cannot be
  unslotted and survives adoption. Æra I deals nothing; the wager runs in II, III
  and IV.

## Religion and the clergy

Reference: **`docs/religion-v2.md`** (the machinery) and **`docs/beliefs.md`**
(every row, sync-tested) · code: `src/sim/religion.ts`.

- **Religion is a tide, not a verb.** A city's religion is derived (the faith
  more than half its citizens follow), never stored. `spreadReligion` measures
  every town against one board, then moves every town; `bankPressure` has exactly
  two callers, the tide and `pressLump`.
- Religions are **fluid, never historical** — the name is generated at founding
  from the pantheon's axes. The cap is ⌈2/3 × real players⌉.
- **The clergy**: the prophet (two charges; founding, a further holy site, or a
  belief takes both; a proclamation or an empire rite takes one), the apostle
  (two charges; proclaim, heal, place a relic), the inquisitor (purge, plus a
  standing adjacency aura). The **augur is retired** — a rite is a city's verb
  now. Charge prices are read in one place, spent in one, refused in one, printed
  by one.
- **Rites** are a city's verb, bought with faith, one at a time per town, ten
  turns, pure blessing — five rows. The faith ladder consecrates **automatically**
  when the bank covers the next rung.
- Who is paid: the pantheon pays the empire that consecrated it; **follower**
  beliefs pay city-locally to whoever owns each following city (a rival's faith
  in your town is a gift); **founder-side** pay follows the holy site's stones;
  **enhancers** bend the tide itself.
- Four follower beliefs open a **faith house** — bought with faith, never built,
  only in a city that follows.
- A **reroll** is one verb over four hands and two ladders: an Order hand costs
  faith on a rising ladder, a Doctrine or great-person hand costs twice that on
  the same ladder, and a belief hand is free the first time.

## Great people, renown, legacies, Triumphs

Reference: **`docs/great-people.md`** (generated roster, sync-tested).

- **Called, never built or bought.** Renown is one pool, banked in exactly one
  place (`settleRenownWindfall`) and explained as one list. The ladder is
  `floor(75 + 225n + n^2.8)` — the draft ladder's arithmetic, one currency over.
- The draw is **weighted and never restricted**: every name of the age is in the
  bag, each family weighted by its share of where the empire's renown came from.
  Names are world-shared and consumed on the pick. The draw spills
  `[age, previous…, next…]`. A spent roster banks rather than blocks.
- A person arrives with **one charge** and two verbs: the **act** pays now
  (aged by `actPerTech`, or quoted in turns of the empire's own rate), the
  **work** plants an improvement for good and **opens the seam it covers**.
  Either spends the piece and leaves the **legacy**.
- Legacies are ordinary card effects, `liveEffects`' sixth source. **Revocation
  is marking, never deleting.**
- Three card clauses buy a great person (`OFFER_PURCHASES`), all issued from the
  Reliquary's rail.
- **Triumphs**: `Player.triumphs` is append-only and turn-stamped, read by
  diffing. `triumphs.ts` owns the only trigger switch — announced occasions
  against standing counts. `state.contested` keys `(id, age)`, first by log order.

## Trade routes and luxuries

Reference: **`docs/trade.md`** and **`docs/luxuries.md`**.

- A trader is its own stacking-free category, **neither built nor bought**: a
  caravan is hired with the route (`buyRoute`), and `Unit.trade` presence IS the
  route — there is no route register. A cart survives its route and is re-sent
  before a new one is hired. A cart is never asked for orders.
- A route is **entirely land or entirely sea**, never mixed; the mode narrows the
  survey. A sea route pays a premium and lays no road.
- What a route pays is read off the **origin's** buildings and paid to the
  **destination**, derived fresh each turn. International routes pay the sender
  flats and the host a gold line; a card's route row may name the **crossing**
  (domestic or international). Route slots fold over building `routeSlots`, and
  the Market and Caravanserai grow one more per eight citizens.
- **Roads**: `Tile.road = builderId`, written only by `layRoad`. Maintenance is
  charged only on roads this empire's traders laid. City connections are a road
  path from centre to capital.
- **A luxury's signature is a list** on its row read by ONE evaluator
  (`resourceEffects.ts`). A luxury counts once per kind, not per tile — silver
  and gold break this deliberately in Æra III. Most luxuries have two tiers, the
  second gated on `fromAge: 3`; a locked tier is still shown.
- **Access is `openedResource`**, four clauses in precedence: the reveal tech
  (which binds improvement, city AND yield), a great person's work, the
  improvement, then a city on the seam. A resource pays only an empire that can
  name it.
- The Silk Road **lends** a luxury: every live route ending abroad hands the
  sender one kind the destination holds improved, at a share of a dug seam's pay.

## Leaders

Reference: **`docs/leaders.md`** (a worksheet; every figure is still the user's).

Six starting figures — Pachacuti, Taizong, Modu Chanyu, Akhenaten, Al-Ma'mun,
Mithridates; three wide, three tall. Each has a **deck**: per age, one
**passive** (lasts the game), one **boon** (one time) and one **unique** (a unit
or building). A seat entering an age is shown that age's three and takes one; Æra
I's row is offered at the first turn. Every line is written against a shape the
card vocabulary already has. Leaders also carry **start biases**, run in three
stages by `startPositions.ts`, and a pair of **colours** the board wears.

## Barbarians

The wild is a real seat, appended **last** (`seatBarbarians` extends all three
parallel arrays); `realPlayers(state)` is the register of "who counts" for
victory, elimination, meters, blockers and rosters. Camps live in
`GameState.camps`, not on the map. Roles derive per turn. The wild never captures
a city and never captures a unit, and it wears the war-red rim like any enemy.

## The endgame

Reference: **`docs/beads.md`** (the model) and **`docs/wager.md`** (how a bead is
earned).

- **A bead comes from a wager kept or from a grant, and from nothing else.** The
  old deeds — feats, endeavours, quests, reckonings — are retired rows with their
  bodies kept for the Compendium.
- Beads are the **door**: `rules.threshold` (7) is what an empire must hold before
  `buildError` lets it begin the **Magnum Opus**. `opusOpen(state)` is derived
  (any real player holds Alchemy) — no stored flag.
- The Opus's completion mints the **golden bead**, closes the age, and
  `winnerId` = **the empire that raised it**. Beads gate the door; the finished
  work decides the game.

## The bots

Reference: **`docs/bot-priorities.md`** — the spec of record. Code: `src/ai/`.

The bot prices things before it picks them. Each turn it builds a **want book**
(`wants.ts`): one entry per thing a currency could be spent on, each carrying its
cost, its worth (the fold of the simulation's own explainers) and its delay. From
that book it derives a **shadow price** per currency and per constraint, clamped
to a band around the age-banded prior in `data/ai.json`. Long-term goals are
**chains** priced as `payoff_rate × max(0, H − delay) + lumps − Σ invest × price`;
a chain is kept greedily and a challenger must beat it by a switching margin, so
commitment emerges from sunk-cost exclusion and **no goal state is stored**.
Short-term arms keep local scoring and feel the system only through prices.
**Personas** are sparse overrides of the same sheet. Everything prints: every
chain, price and term lands in the candidates' folds, and the fold IS the
computation. **The bot is not a balance instrument** — playtest is the judge; the
arena is for regressions and floors.

## The surfaces

Eight root pages, all named in `vite.config.ts` inputs:

| page | what it is |
|---|---|
| `index.html` | the game |
| `spectate.html` | the bot spectator — every decision with the appraisal's own terms |
| `arena.html` | five headless games, a worker each, averaged per seat; the whole of `data/ai.json` as a **generated** panel (a new knob appears with no page edit, and nothing on that page may name a knob) |
| `compendium.html` | every entry generated from data rows and the sim's own describers; stable `kind:id` anchors; also mounts as the in-game "?" |
| `mapgen.html` | the generator's experimental loop, every tunable live |
| `pieces.html` · `flair.html` | the piece gallery and every drawn mark with live sliders (**a new visual asset joins `flair.html` in the pass that ships it**) |
| `abacus.html` | the bead rods |

- `src/render3d/` is the default renderer (Three.js ortho toon diorama,
  procedural primitives only; tunables in `data/view3d.json`). `src/render/` is
  FROZEN 2D — it must keep compiling and gains no features.
- `src/ui/` is the DOM UI; `controls.ts` drives renderers only through the
  `MapView` interface. A full-screen sheet builds on `modalShell.ts`. Per-game
  screens push their window listeners into `gameDisposers`.
- **A named thing in a describer is a keyword ref** — `[[kind:id|Name]]` via
  `ref()`; a raw `[[` on any surface fails the sweep.
- Player-facing words are plain, numbers never appear in written prose, and
  flavour is always labelled Flavour.

## Test discipline

- `npm run dev` · `npm run typecheck` · `npm run test` (core) · `npm run build`.
- Two tiers: **core** or **slow**; slow lives in `<concern>.slow.test.ts` beside
  its core file, and `test/stress/` is slow wholesale. Slow means slow *by kind*.
  A source-reading register test is always core.
- **Subagents run narrow tests only** — `npx vitest run <your files>`. The
  batch-gate (typecheck + core + build) is the orchestrator's; `npm run test:all`
  is the push-gate.
- Check exit codes, never grep a summary line.
- **A doc table that mirrors data carries a sync test.** The ones that exist
  today: `mapgen.md` · `tech-tree.md` · `units.md` · `orders-and-doctrines.md` ·
  `beliefs.md` · `great-people.md` · `wager.md` · `yields.md` ·
  `production-costs.md` · `religion-v2.md` · `leaders.md`. A row edited in one
  place and not the other fails core.
- Three docs are **generated**: `units.md` (`UNITS_DOC_WRITE=1`),
  `tech-tree.md` Part 2 (`TECH_DOC_WRITE=1`) and `codex.md` (`npm run codex`).
  Never hand-edit a generated region — except a Notes column, which is carried
  through regeneration.

---

## The shelf

**Reference docs** — current state, bulleted, data-pointing:

| doc | what |
|---|---|
| `design-notes.md` | the design ledger, condensed — current state and the standing doctrines |
| `flags.md` | every OPEN ruling, deferred half and live thread |
| `design-specimen.html` | the interface's design language (ink/parchment, the four faces) |
| `yields.md` | the sequence of record — the order every yield is computed in |
| `production-costs.md` | what anything costs to build, in one rule |
| `tech-tree.md` | the tree — determinations plus the generated as-built tables |
| `units.md` | the roster and how a strength is folded (generated) |
| `orders-and-doctrines.md` | the Statecraft master list |
| `wager.md` | the wager deck and the malice deck, and the rules they are dealt under |
| `beads.md` | the Bead Race model and the Opus door |
| `religion-v2.md` · `beliefs.md` | the machinery, and every belief/rite/consecration as a row |
| `great-people.md` | renown, legacies, Triumphs, and the full roster |
| `trade.md` · `luxuries.md` | caravans, roads, connections; the resource table and its vocabulary |
| `wonders.md` | the wonder framework (rows live in data and the Compendium) |
| `mapgen.md` | the generator, pass by pass, every tunable |
| `bot-priorities.md` | the bot's spec of record |
| `codex.md` | the generated card-pool grid (`npm run codex`; never hand-edit) |

**Live worksheets** — open questions, not yet rules:

| doc | what |
|---|---|
| `war-diplomacy.md` | war and diplomacy; substantially built, still taking rulings |
| `leaders.md` | the six figures and their decks; every figure still the user's |
| `playstyles.md` | wide and tall, every lever, with ▢ for the balance pass |
| `late-game.md` | Æra IV and V — nothing in it is built |
| `themes.md` + `themes/` | the nineteen gameplay themes; the only home for theme rationale |
| `city-screen.md` · `pamphlet.md` | two shipped specs of record, each with a tail still open |
| `art-pass.md` · `splash-art.md` | art direction: a live backlog and the standing refusals |
| `playtest_notes.md` | the user's running playtest diary |

**The drawers** — open only for the *why*:

- `history/` — working docs whose rulings are now code: `design-history.md` (the
  unabridged entry ledger, where cited entry numbers resolve), `flags-log.md`
  (every ruling made, item letters kept), `bot-priorities-log.md`,
  `schema-changelog.md`, and the batch docs.
- `deprecated/` — docs a *later doc* superseded, with the master named beside each.
- `audit/` — finished read-only passes, cited by path from docblocks across the
  tree. History, not current state.

---

## Reading order — what to open for what

| if you are… | read |
|---|---|
| **starting anything** | this file, then `CLAUDE.md` |
| touching a **yield, a cost, a fold** | `yields.md` → `production-costs.md` → `src/sim/yields/` |
| adding or retuning a **card, order, doctrine** | `orders-and-doctrines.md` → `src/sim/statecraft/evaluator.ts` (the one switch) |
| touching **religion** | `religion-v2.md` → `beliefs.md` |
| touching **units or combat** | `units.md` → `war-diplomacy.md` §5b → `src/sim/combat.ts` |
| touching the **tree** | `tech-tree.md` → `src/sim/techData.ts`'s placement docblock |
| touching the **map** | `mapgen.md` → `data/mapgen.json` |
| touching **trade or a resource** | `trade.md` → `luxuries.md` |
| touching **great people or renown** | `great-people.md` |
| touching the **endgame** | `wager.md` → `beads.md` |
| touching the **bot** | `bot-priorities.md` → `src/ai/wants.ts` |
| touching a **screen** | `design-specimen.html` → the page's own entry above |
| asked "**is this open?**" | `flags.md` (A for questions, B for deferred rows, C for threads) |
| asked "**why is it like this?**" | `history/` — and only then |

A doc table that mirrors data is the spec of record for that data: edit the
figure in both places, run the sync test, and the pair stays honest.
