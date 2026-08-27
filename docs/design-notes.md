# Magister Ludi Design Notes

Living design ledger — argue here before numbers land in `data/*.json`.
(Supersedes the balance-ledger artifact as of 2026-08-21; the artifact is a frozen snapshot.)
Title: **Magister Ludi** (decided; *Theatrum Mundi* was the other candidate). Design language: `docs/design-specimen.html`.

---

## Entry I — Tall vs. wide, growth, and the dual-resource system

**Goal:** lean slightly wide of Civ V's tall meta. Civ V leans tall because one resource
(happiness) prices two different sins (pop AND city count) while hidden per-city % taxes
(tech/policy cost scaling, national wonder gates) compound invisibly.

**The split:**
- **Happiness = vertical limiter (pop).** Per-city unhappiness `a·pop + b·max(0, pop−softPop)^p`
  — superlinear *within* a city, never linear in empire-total pop (that would re-tax wide).
  Supply mostly per-city (cheap circus) + partially-scaling luxuries (`+2 empire, +1/city ≤4 cities`).
  Deficit = smooth gradient (growth slows → stops → combat/production malus), no cliffs.
- **Authority = horizontal limiter (cities).** Flat cost per city (v0: 2, capital free).
  Capacity: palace 4 · age advance +2 · courthouse-family building +2 (90⚒) · civics/wonders.
  **Soft ceiling, never hard cap**: −8% science & culture per point over, floor −60%.
  Over-extension is a legal tempo gambit; captured cities cost authority → conquest self-throttles.

**Three commitments:**
1. Authority is a soft ceiling, never a hard cap.
2. Happiness penalty is per-city-superlinear; supply is per-city-ish. Never linear in empire pop.
3. Authority REPLACES every per-city % cost scaling. It is the only lawful width tax. Audit new
   mechanics against this.

**Growth pacing rhythm (user, 2026-08-22): punctuated renewals, Civ V-style.** Cities grow
fast, plateau, then TECH-DRIVEN RENEWALS reopen growth: improvement-upgrading techs (a Civil
Service equivalent boosting freshwater farms — rivers matter again; later a Fertilizer
equivalent) arrive as felt chapter-breaks. Implementation: techs carry improvement-yield
upgrades (M7 improvements + existing tree; Entry VIII evaluator makes each renewal glanceable
pre-research). Fast early growth is accepted/desired. **Trade routes = the circumvention valve
(OPEN DESIGN QUESTION):** internal food routes à la Civ V, but FLAG — food caravans are
historically a TALL subsidy (they fed 4-city capitals); the design needs a wide-friendly
counterweight (routes scaling with city count? routes as wide's connective tissue?) or a
deliberate acceptance against Entry I's wide lean. Design before building; likely lands with
or after M9 (gold loop) / M10.

**Growth curve:** threshold `15 + 8(n−1) + (n−1)^1.65` — exponent steepened from Civ V's 1.5
(✅ applied to `rules.json` 2026-08-21). Head unchanged (pops 1–8), tall's tail pricier.
Science per pop stays linear; authority gates it instead. **Settler scaling (REVISED 2026-08-22, user):** Civ VI-style escalation — effective cost =
base + increment × settlers built (production only; starting/captured settlers don't count).
Supersedes the earlier flat-cost rule BECAUSE authority doesn't exist until M10 and the
Quick-speed pass left expansion brakeless (5 cities by t25). **RE-EXAMINE AT M10:** authority +
steep settler scaling together would double-tax width — when authority lands, one of the two
brakes softens (likely the settler increment). Scouts, not settlers, are the 3-turn unit.
**SHIPPED 2026-08-22:** scout 3→9⚒ (exactly 3 turns at a fresh capital's 3⚒), warrior 5⚒ (2
turns), settler 12→20⚒ base + `costIncrement` 8 per settler *built* — so 20/28/36/44, priced
by the one evaluator `unitProductionCost(state, playerId, type)` and charged at every
resolution rather than at queue time (a queued settler's price can rise under it; the panel
quotes the same live number). The increment is a per-unit-type field in `units.json`, not a
`settler` special case; `Player.settlersBuilt` (schema 9) is the counter. Cost: the scripted
empire now founds cities 2–5 on t19/28/40/50 (was t17/20/24/28), and the tech table came down
×0.50 / ×0.85 / ×0.95 by age to hold ages at t42 / t90 / t132.

**v0 numbers:** unhappiness a=1, b=0.6, softPop=8, p=1.4 · palace happiness 9 · circus 50⚒/+3 ·
luxury +2/+1-per-city(≤4) · authority/city 2 · palace 4 · age +2 · courthouse 90⚒/+2 ·
over-penalty −8%/pt (floor −60%). Grace check: 3 cities pops 6/5/4 → neither meter binds;
first bind should be the 4th city or 9th citizen.

**Balance target (testable):** turn 150 standard — well-played 8-city wide within ±10% of
4-city tall's science; ahead in production/military; behind per-city quality. Enforced later by
headless tall-bot/wide-bot 150-turn seeded sims in Vitest.

### Entry I.b — Site bonuses (the map argues about empire shape)
- **River city → growth bonus** (vertical). v0: +15% food surplus toward growth (or flat +2 food).
  This is the deferred fresh-water mechanic in one-property form.
  **PREREQ: rivers don't exist yet** — needs a mapgen milestone (downhill hex-edge tracing).
- **Coastal city → authority discount** (horizontal). v0: costs 1 instead of 2.
  A *discount, never an exemption* — free coastal cities = shoreline ICS. Thalassocracy fantasy
  (Carthage, Athens) with the meter still biting. Coast detection already exists; can ship with
  the happiness/authority milestone.
- **Estuary (river + coast) gets both** — premium contested sites (London, Alexandria).
  Start permissive; watch for auto-win siting.
- **The settler lens renders this system (user, 2026-08-21):** blue highlight = coast-adjacent
  sites (authority discount), green = freshwater-adjacent (growth bonus). Coast-blue ships now;
  freshwater-green is wired but inert until the rivers/lakes mapgen milestone. The lens shows
  the player the exact decision the site-bonus design prices.

**Sequencing:** happiness + authority build ~M5+ (need buildings, luxuries on map, ages defined).

---

## Entry II — Civic card drafting (culture system, targets M4+; VANILLA FIRST — see sequencing)

Culture meter like Civ VI civics, but each unlock **drafts 1-of-3 cards** from era pools
(Stellaris-tech-style; Against the Storm under pressure). Kills solved build orders; run identity;
natural home for happiness/authority levers.

**Commitments:**
- **Spine:** era transitions/governments deterministic and plannable; only cards are random.
- **Fairness:** power tiers (offers comparable); archetype spread per offer; same draft count per
  player per era; re-rolls via Magister's Dice (below). Symmetric snake-draft mode parked for
  competitive MP.
- **Weighting:** offers lightly weighted by empire state — weights, never filters.
- **Scale:** start ~30 cards / two eras, flat modifiers only (`civics.json`, same effect vocabulary
  as buildings).
- **Architecture:** draws happen IN THE SIM from `state.rng` at offer time (deterministic,
  replay/MP-safe). Pick = `chooseCivic` command. Never draw in the UI.

**Draft access (revised 2026-08-22 — drafting is THE central loop, every run must feel
different):** culture = the sustained metronome (draft RATE), but drafts are not
culture-exclusive. **Draft moments** from other systems guarantee universal cadence:
- **Age transitions: every player drafts** at each age's close — the floor everyone stands on,
  and the ritual beat of the game.
- **Breakthrough techs**: a marked handful of star-chart nodes grant a draft on completion
  (scarce — landmarks, not confetti). Science's second way in beyond pool quality.
- Wonders (some), and later events, as occasional bonus triggers.
Committed culture runs draft most; nobody drafts rarely.

**Power level (revised 2026-08-22 — user: bonuses should be powerful and game-defining):**
tiers split by KIND, not just size. Common/uncommon = strong numeric modifiers. The top tier =
**rules-benders** — leader-passive-grade rule changes ("cities work radius 4", "units heal in
enemy territory", "settlers cost food not production", "roads yield gold"). Slot caps are what
make this safe (2 slotted rules-benders = a build identity); the runaway-leader brakes are now a
HARD requirement, not a watch item. The deterministic tech tree stays deterministic — techs are
never drafted (the Spine commitment holds; drafts happen AROUND the chart, not inside it).

**Rate × quality coupling:** culture = draft RATE, science = draft QUALITY. Techs carry
player-chosen pool boons: "add X and Y" / "add all of type X" / **prune-replace** (removal is a
powerful verb; dilution is real math — adding cards can lower hit-rate). Card types = Civ VI's
four: military · economic · diplomatic · wildcard (diplomatic sparse until diplomacy exists).

**Slotted governments (DECIDED):** drafted cards → collection; government gives typed slots
(v0: 2 mil / 2 eco / 1 dip / 1 wild), re-arrangeable. Governments are culture's tier ladder —
culture gates the next government, higher tier = more slots. Symmetry: science → ages + pool
quality; culture → governments + draft rate.

**Depth & upgrades (v2, AFTER base loop ships):**
- Slot cap is the governor: deep-culture power = rate × slots × quality, each axis capped → 
  superlinear feel, bounded ceiling. Meta-cards ("your food civics gain +1 food") are auras;
  wildcard-type so they compete for scarce slots.
- **Maturation:** card upgrades after N consecutive slotted turns (swap-or-ripen decision).
- **Duplicate-merge: rejected** (fights pruning; RNG-gates upgrading).
- Runaway-leader brakes: escalating civic costs per card, slot cap, military counterplay.
  Harness: mono-science must not beat mono-culture; bounded doubling time on the culture loop.

### Magister's Dice — the re-roll economy
Scarce earned tokens; spending one fully redraws the current draft offer.
- Earned deterministically (age transitions, certain wonders/civics, maybe ruins) — never by luck.
- **Cap 3 held** (anti-hoarding). Contingency if hoarding persists at cap: dice expire at age
  transitions — only if observed in playtests.
- **Drafts only.** Never combat, never map RNG. One crisp luck-mitigation currency.
- Sim cost ≈ zero: token count in state; reroll = command; redraw from `state.rng`.

**Failure modes:** feel-bad offers (spread + dice); mandatory cards (tier audits); snowball
drafting (catch-up on civic costs); science-dominant meta (harness assertion).

---

## Entry III — Leaders: history's half-remembered characters

**Direction (user, 2026-08-21):** quirky roster of mostly *obscure* figures — and not necessarily
rulers. The archetype: characters history half-remembers. Poison kings, pirate queens, wrestler
princesses, castle-mad kings, self-proclaimed emperors, wandering geniuses. Tone: affectionate,
a little strange, never edgelord.

**Named by the user:** Mithridates VI of Pontus (the Poison King) · **"William the Lionhearted"**
(user-confirmed name 2026-08-21; historical anchor — William the Lion of Scots vs. Richard the
Lionheart — to be settled at implementation) · Nikola Tesla (proof leaders needn't be rulers).
Roster below user-approved as a holding list; revisit at the leaders milestone.

**Candidate roster** (leader · hook · mechanical sketch, all data-driven modifiers):

| Leader | Who | Mechanical hook |
|---|---|---|
| Mithridates VI, the Poison King | Pontus | "Mithridatism": units that survive damage gain permanent HP / immune to attrition |
| William the Lion | Scots | Defensive wars raise culture; the Lion Rampant banner |
| Nikola Tesla | (inventor-leader) | Science "discharge" bursts: bank beakers, release in surges |
| Ching Shih | Pirate queen, 70k pirates | Coastal synergy: naval units cheaper; coastal cities → extra authority discount |
| Khutulun | Mongol wrestler princess | Challenge duels: single-combat wagers before battles |
| Ludwig II, the Fairy-Tale King | Bavaria | Wonder-mad: wonders cheaper but mandatory-ish; wonders give happiness |
| Emperor Norton I | Self-proclaimed Emperor of the USA | Beloved absurdity: happiness from deficit; diplomacy quirks |
| Zenobia | Palmyra | Rebellion/breakaway bonuses; thrives over-authority |
| Æthelflæd, Lady of the Mercians | Mercia | Fort/burh network: defensive buildings expand borders |
| Nzinga of Ndongo & Matamba | Ndongo | Diplomacy-and-war pivots; resists conquest penalties |
| Ranavalona I | Madagascar | Isolationist: closed borders → big internal yields |
| Toussaint Louverture | Haiti | Liberation: captured/freed cities integrate cheaply |
| Ibn Battuta | (traveler-leader) | Exploration: yields from visiting others' territory |
| Dido | Carthage (legendary founder) | The oxhide trick: first N border claims free/cheap |
| Skanderbeg | Albania | Mountain resistance: rough-terrain combat mastery |

**Design rules:** every leader = one rules-bending passive expressed in the existing data-driven
modifier vocabulary (no bespoke engine per leader); leader quirks should *touch the signature
systems* (authority, happiness, drafts, dice) so the roster advertises the game's identity;
obscure ≠ unresearched — each gets a one-line true epithet the player can chase down and discover
was real. That discovery moment IS the flavor strategy.

---

## Entry IX — Resources (designed 2026-08-21; **built** M6)

**Three kinds, three mechanical homes:**
- **Bonus** (wheat, cattle, fish, stone, deer): tile-yield modifiers. Ship with the resources
  milestone — pure data on the existing yield algebra.
- **Strategic** (horses, iron; later coal/saltpeter): GATE unit production (horses→mounted line,
  iron→swordsman line) via the existing `isUnlocked` hook — map-driven military asymmetry and
  war reasons. Visibility can be tech-gated later (iron hidden until Bronze Working, Civ-style).
- **Luxury** (silk, gems, wine, spices): the happiness system's fuel (Entry I: +2 empire /
  +1-per-city partially-scaling). Placed by this milestone, mechanically live at the happiness
  milestone. Also the trade good for future diplomacy, and §6b bead sources ("control X% of a
  world resource").

**Appearance (two layers, as ever):** world = procedural diorama props (wheat tufts, toy cattle,
ore boulders, mini horse herd — primitives, hashed placement); apparatus = resource LENS + small
roundel icons in the badge stroke language (hover or toggle — props alone are never fully
legible). Yield-icon rework folds into the same milestone: pips → bespoke wheat/gear/coin glyphs
on the badge-style atlas, repeated per point with cap+numeral.

**Placement:** seeded biome-weighted scatter with spacing rules (rivers-milestone machinery
generalizes); fairness pass — every start gets bonus food nearby, strategic access non-degenerate
(harness-assertable). All in mapgen.json.

**As built (2026-08-21).** Twelve resources in `data/resources.json`; the placement pass is
`src/sim/resources.ts`, called last by `generateMap` with the map `rng` drawn strictly *after*
`traceRivers`, so terrain, hills, features and river edges are bit-identical to the pre-resource
generator (fixtured in `test/resources.test.ts`). Density is ~120 tiles per 1000 land tiles and
holds within a few percent from duel to giant. Four decisions narrowed the design above, each for
a reason worth keeping:

1. **The constraint shape is a plain AND** — terrain list, optional feature list, optional hills
   flag. One rule per resource is a rule a designer can read off the row, so "deer: forest/tundra"
   became *forest, on grassland/plains/tundra* (deer live in forests, taiga included) and
   "iron: hills/plains" became *hills* (the ore is in the high ground).
2. **Strategic = ownership, not improvement.** There are no workers yet, so requiring a pasture
   would make every mounted unit permanently unbuildable. `hasResource` (`cities.ts`) asks whether
   any tile the player owns carries it; the day improvements land, that function gains a clause
   and nothing else moves.
3. **Tech gating hides the label, never the yield.** Iron pays its production to whoever works it
   from turn one and satisfies the production gate for a player with no technology at all; Bronze
   Working only decides whether the interface will *name* it. Hiding a number the citizens are
   already collecting would be a lie the city panel has to keep telling.
4. **Props are global, roundels are per-seat.** The diorama props are baked into the board's
   instance buffers, which are built from the map alone and shared by every seat — culling them
   per player would fork the board cache per seat and rebuild it on a tech. So the world shows a
   dark boulder to everybody and only the *information* layers (hover readout, resource lens)
   respect the local player's technology. Acceptable while there is no fog of war at all; when fog
   lands the board is per-seat anyway, and that is the milestone that should hide the boulder.

The yield-icon rework shipped with it: the pips are gone, replaced by sheaf / hammer / coin glyphs
rasterised into a second badge-language atlas (`TileIcons` in `badges3d.ts`), one per point up to
four and then collapsed to one glyph and a numeral. The voice colour survived as the *disc* under
each glyph — a thin green stroke on green grass is not legible, and the colour as a mass is what
made the pips readable in the first place.

Two later corrections to that layer, both from play (2026-08-21):

- **The roundels are a switch, not a lens, and they start on** — the Civ V default. Naming what is
  on the ground is not a question a player should have to go to a menu and ask, and it composes
  with the settler lens rather than replacing it: "where may a city go" and "what is on that hex"
  are two questions, and the exclusive lens list made them one. `LensView.resources` (+ `R`), the
  same shape the yield glyphs already had. The *lens* list is down to none / settler.
- **The glyphs stack instead of spacing out.** Four separate discs with gaps between them took the
  width of the hex they were printed on, which the terrain, the props and the unit standing there
  all need more than the readout does. They now overlap like fanned coins at ~42% of a disc's
  diameter, about 20% smaller, for roughly half the old row width. What keeps overlapping discs of
  one colour countable is a drop shadow **baked into the atlas cell** — the tile atlas is one
  opaque alpha-tested material with the depth test off, so a translucent shadow decal would land in
  three.js's transparent pass and print *over* every glyph it belongs under. Baked, it costs no
  instance, no draw call and no ordering argument; the price is that it is a shade of the voice
  colour rather than a true alpha.

### Entry IX.b — Start scoring & luxury signatures (playable-loop item 1, **built** 2026-08-23)

The map argues with the player before the first turn: which ground is worth starting on, and
which luxuries are worth going to get. Two halves, both entirely in data.

**Start scoring** (`src/sim/startPositions.ts`, tunables in `mapgen.starts`). A candidate is
scored as a *site* — the ground it stands on plus the **best six** workable tiles in rings 1–2,
each weighted by its ring — with flat bonuses for fresh water and coast, the two site bonuses the
settler lens has painted since Entry I.b. Five hard rejections back it: the site's own terrain
(no desert/tundra/snow starts), the share of its rings that is cold or arid, the share that is
water, and floors on the food and production the rings carry.

Four decisions are worth keeping:

1. **Best six, not all eighteen.** A sum over the whole neighbourhood rewards quantity, and the
   first version duly seated capitals on jungle ringed by eleven hills — good on paper, two
   hammers a turn in practice, because the citizen assigner works the *best* tiles and there were
   only two. Scoring what a young city will actually work put the opening capital back at the
   three production `test/tech.test.ts` had measured the scout's price against.
2. **The real yield evaluator, on a ground view.** `tileYieldOf` — the same function every
   citizen, border and hover card reads — asked about each tile with its resource and improvement
   *stripped*. Two things fall out. The resource fairness passes plant food and luxuries at the
   starts, so a start that moved when a wheat landed beside it would send the guarantee chasing
   itself around the map; and `Tile.improvement` changes during play, so a chooser that read it
   would answer differently on turn 40.
3. **Spacing is a property of the map, never of the roster** — `spacingFactor · sqrt(land)`,
   clamped. That is what makes a two-player game's starts an exact *prefix* of a twelve-player
   game's, which is in turn what lets the fairness passes seat the maximum roster once and cover
   every real game. Relaxation (down to 1, then a sweep of the refused sites) still seats twelve
   players on a duel map rather than throwing.
4. **The score is a ledger.** `scoreStartSite` returns the signed lines and the total is their
   fold — rule 5 applied to a decision rather than to a yield.

**Luxury variety.** Ten luxuries now: gems, silk, wine, spices, salt joined by **incense, jade,
marble, furs, dyes**. All ten keep the flat `perUniqueLuxury` happiness, and each adds a
**signature effect** from a vocabulary of exactly four shapes, read by one evaluator
(`src/sim/resourceEffects.ts`) and by nothing else:

| shape | reading | who has it |
|---|---|---|
| `cityYields` | flat yields in the city that owns the improved tile | gems (+3🪙), spices (+2🌾), salt (+1🌾+1🪙), jade (+2🎵), furs (+1🌾+2🪙), dyes (+1🪙+1🎵) |
| `empireYields` | flat yields to the empire, once per unique kind | silk (+2🪙), incense (+2🎵) |
| `extraHappiness` | on top of the flat figure, its own ledger line | wine (+2) |
| `productionBonus` | a share of the owning city's hammers, by category | marble (+15% toward buildings) |

Three notes on the shape of it. **Uniqueness reads by scale**: an empire effect counts once per
kind however many seams feed it; a local effect counts once per kind *per city*, which is what
makes the second jade worth settling for rather than a shrug. **`productionBonus` is the old
barracks field generalised**, not a sibling beside it — `unitProductionBonus: 0.1` became
`productionBonus: { category, percent }`, buildings and resources declare the same shape, and
`productionModifiers` is a list over the two tables with no barracks case and no marble case
anywhere. And **`empireYields` may not name food or production**: the empire has no basket for
either, and the table refuses such a row at load rather than paying nothing quietly.

Incense is the first *luxury* behind a `requiresTech` reveal (Divination, the user's own revision
note), and it needed no new mechanism at all — which is the argument for having built the reveal
as a property of the row rather than of the strategic kind. *(Superseded 2026-08-24: incense's
`requiresTech` was removed — it is visible from turn one like every other luxury. The mechanism
argument stands; it is simply unused by any luxury for now.)*

**Fairness and regional character.** *(The regional half of this paragraph is superseded by
Entry XVI: "region" now means a carved fixed-size continent, the hand is dealt per continent and
placed directly rather than rejected into. The fairness half stands, with a third guarantee added.)*
Before the scatter, every land region — connected components
of land, which is to say continents — is dealt a hand of `luxuryKindsPerRegion` kinds from the
map rng, and a luxury find on ground whose region was not dealt it is thrown away (the scatter's
own rejection idiom, so placement stays a pure function of the draw sequence). After the scatter,
every *possible* start is guaranteed a bonus food and **two distinct luxury kinds** in reach,
both passes rolling no dice, both preferring the region's own hand so a guarantee does not flatten
the character the scatter just built. Neither pass invents ground: a start ringed by flat
featureless grassland can host exactly one luxury in the whole table, and one is what it gets.
Both are the documented exception to the scatter's spacing rule — a guarantee outranks an
aesthetic — and `test/resources.test.ts` pins that down by requiring every crowded pair to be
within reach of a possible start.

**A resource is now entirely data.** `ResourceId` is derived from the JSON's own keys, the two
exhaustive `Record<ResourceId, …>` tables in the renderer became lookups with documented
fallbacks (an unsculpted find draws a marker cairn; an undrawn icon prints the row's emoji on its
roundel), and the placement pass reads only the constraint fields. Adding a row to
`data/resources.json` therefore costs no TypeScript, which `test/resources.test.ts` proves by
inventing one at runtime and asserting it places, pays and explains.

**Also landed:** a new game defaults to a **single seat**. There is no AI, so a second seat is a
second empire nobody is driving; the sandbox roster stays one option down the landing screen's
new Seats select, and the turn model is untouched (`turnEnded` is simply an array of one).

---

---

## Entry XII — Workers, improvements and explainable yields (M7, **built** 2026-08-23)

**The worker is three instant builds in a box.** `units.json` `charges: 3`, `Unit.chargesLeft`
(schema 11), 8⚙, movement 2, sight 2, unlocked by agriculture so it is buildable from turn one.
`buildImprovement {playerId, unitId, improvement}` is validated fully and resolves *instantly*:
the tile gains the improvement, the worker spends the improvement's `chargeCost`, and it spends
**all** remaining movement (building is the turn's work). A worker at zero charges is removed
through `removeUnit`, so the piece leaves the board by the one path every disappearance takes.
The three payoffs the ledger predicted all held: no partial-progress tile state for simultaneous
turns to argue over, a spend that is previewable ("Farm +1🌾" comes from the same evaluator the
city banks with), and no worker-stealing annuity — a captured worker is worth its remaining
charges and needs no capture rule of its own.

**Own territory only, v1.** A worker may build inside its own empire's borders and nowhere else.
Civ V's looser reading (unclaimed ground is fair game) needs a rule for what happens when that
ground is later claimed, and "your cities' land" is one lookup — the same one `hasResource`
makes — which also guarantees every improvement has an owner who can lose it.

**`pillage {playerId, unitId}`** is a military verb, deterministic, and costs **one** movement
point rather than the whole allowance: a column burns a farm riding past. It pays
`rules.improvements.pillageGold` (25) and removes the improvement. No smoke, no ruin state, no
repair verb — a pillaged tile is an unimproved tile, so "how do I fix it" has the same answer as
"how did I build it". It is *not* a mode of `attack`, for `attack`'s own reason: one rolls dice
and may kill the actor, the other does not, and a mis-aimed order must not burn a farm.

**Six improvements, two kinds, one constraint shape.** `data/improvements.json`, an AND of
`validTerrain` / `validFeatures` / `requiresHills` / `requiresResource`, and which filters a row
uses is what makes it *generic* (farm, mine — buildable on bare ground, and they clear the tile's
clutter) or a *resource-improvement* (pasture, camp, quarry, plantation — pinned to their
resources, and they compose with the props already there: the fence goes around the cattle).
A fifth filter joined them with the Age I rework (2026-08-23) and is the only one that is not
about the hex: **`requiresTech`**, the improvement's own gate, asked *last* so that a worker on
flat ground is told "a mine needs hills" and one on a hill is told "a mine needs Mining" — which
is what lets the worker sheet hide the first and grey the second. Every row carries one now, so
the worker's menu opens over a game instead of arriving whole on turn one.
`improvesResource` is a second, separate field because the mine is buildable on any hill and is
*also* what opens an iron seam. Two deliberate deviations, both documented in the data accessor:
**fish has no improvement** (the work boat is naval, deferred; fish stays visible and simply
cannot be accessed, and nothing is gated on it — *closed 2026-08-26 by Entry XXVII: the fishing
boats reach fish and the five other sea rows*), and **salt is quarried rather than mined**,
because salt is placed on desert with no hills constraint and filing it under the mine would have
made every flat salt pan permanently unimprovable — the exact "rule nobody could play against"
Entry IX refused for strategics.

**The Entry IX correction landed.** `hasResource` now requires an owned tile carrying the
resource *and* the improvement that opens it. One function gained one clause, as its own docblock
promised in M6, and the reducer, the city panel and the production hold-rule all followed. The
sentence changed with it: "Swordsman needs **improved** Iron", and the panel's row reads "needs
improved ⛏️ Iron" — a refusal that said only "needs Iron" to a player standing on their own
unmined hill would be sending them to war over something they already have.

**Explainable yields, as the hard rule requires.** `explainTileYield(tile, ctx?)` returns an
ordered `{source, kind: base|override|add, food, production, gold}` list; `tileYieldOf` is
`foldTileYield` of it and there is no second implementation. `base`/`override` replace, `add`
sums, so one list carries both algebras — and the feature is written down *even when a hill
overrides it*, because "Forest 1🌾1⚙, replaced by Hills 0🌾2⚙" is the sentence a player needs and
the fold reaches the same number either way. The refactor is *proved* to be a refactor by a
golden test over every terrain × feature × hills combination and every resource, against the
pre-M7 arithmetic written out from the same tables.
`ctx` carries only `techs`, because the technologies held are the only player-dependent term —
anything richer would be a second reason for `cities.ts` to know about research, and it already
cannot import `tech.ts` (that dependency runs the other way). **Who passes one:** the four
simulation call sites (`assignCitizens`, `centreYield`, `cityYields`, `bestExpansionTile`) pass
the city owner's; the hover readout passes the local seat's; the yield glyphs pass
`LensView.playerId`. Nobody else does, and the two that deliberately do not are the improvement
preview (which quotes what a charge buys *now*) and tests asking about bare ground.

**One renewal is wired (Entry I's punctuated growth).** `improvements.json` carries
`upgrades: [{tech, add, requiresFreshwater?}]` and Feudalism gives freshwater farms +1🌾 — the
Civil Service stand-in. Each renewal is *its own contribution entry*, named for the technology,
so it is glanceable rather than folded silently into the farm's number. **The tech screen's
delta preview does not yet include it**: `buildingYieldDelta` diffs `cityYields` with a
hypothetical *building*, and a hypothetical *tech* would need the same hook one level down
(a `TileYieldContext` with the candidate tech appended, threaded through `cityYields`). That is
perhaps twenty lines and it is deliberately content-pass work — the renewals want naming and
expanding first, and a preview built for one example would be built twice.

**Render: improvements are their own instanced layer.** `src/render3d/improvements3d.ts`, one
instance per improved tile, rebuilt off `signImprovements` — because a farm can appear mid-game
and the board's buffers may not be re-baked for a gameplay event (the M8 constraint). Measured on
the stress fixture: **32 improvements = 32 instances, 2 draw calls, 0.86 ms, against a board of
40,152 instances and 79 ms.** Placement is `hash(col, row, stream)` like every other scatter;
`jitter` is 0 for the pasture so its fence rings the herd, and non-zero for the camp, quarry and
trellis so they sit off the resource's own props. Fog is applied *by the layer itself* — every
instance names its `tile`, and the build finishes by walking the collector's tile→handle map and
`setWash`-ing the remembered ones with the fog's own `exploredWash`/`exploredDim`/`exploredShade`.
That is the one thing a rebuilt layer gets wrong (it would come up lit on remembered ground), so
it is asserted rather than assumed.
The **one** thing the board itself knows about an improvement is `clearsClutter` — a farm or a
mine takes the tile's grass with it, through the same mechanism a resource prop uses — and that
originally cost a board rebuild when it changed, fingerprinted by `signImprovedCells`, exactly
as a founded city already did (`signCityCells`). **Superseded (2026-08-23): the board is now
built once per game.** See the entry below.

**Roads are still OUT** (traders build them, with the trade-route system). Nothing here assumes
they exist.

---

### Entry XII.b — Chopping: the forest as a one-time hammer (**built** 2026-08-23)

**`chopFeature {playerId, unitId}`.** The worker's second verb, and deliberately the same shape as
its first: it names the unit and never a tile or a feature (the ground is wherever the worker is),
it validates fully before it writes, it is **instant**, it spends a charge, it spends **all**
remaining movement, and a worker that empties itself on it is consumed through `removeUnit`. Four
mutations: `Tile.feature → 'none'`, one charge, all movement, and `+20⚙` banked once into the
`hammerBasket` of the city whose territory holds the tile. Everything downstream — tile yield,
movement cost, defence bonus, the yield breakdown — follows through evaluators that already read
the feature and know nothing about the axe. That is the whole argument for mutating the feature
rather than storing a "was cleared" flag beside it.

**The data shape is a sibling table, not a seventh improvement.** `data/improvements.json` grew a
`chop` block keyed by `FeatureId`:

```json
"chop": { "forest": { "tech": "mining", "chargeCost": 1, "yields": { "production": 20 } } }
```

An improvement goes *on* a tile and pays forever; a chop takes something *off* and pays once, so
filing it as a row would have meant a meaningless `clearsClutter`, a `yields` that lied about
being per-turn, and every `improvementDef` caller learning about an exception. **Jungle has no
row**, and that absence is the feature: `chopDef` answering `null` is the whole of "not
choppable", so the day the jungle is designed it is one JSON object and nothing else — the
reducer, the worker sheet and the tech card all read the table generically. The load validator
holds a chop to **production only**, because `hammerBasket` is the only one-time bank in the game
and a chop that promised food would be a number the sheet printed and the city never received.
**The user's future scalers (+5⚙ per some X — era, tech count, city size) are noted here and not
built:** they land as extra fields on this row plus one term in `chopFeatureAt`, and until the
scaling curve is designed a hook for it would be a hook built twice.

**The protection rule (RATIFIED, this build): the camp is worth more than the timber.** A chop is
refused while the tile carries a resource whose placement *required* the feature (`validFeatures`
excludes `'none'` — deer, silk, furs, amber in forest; bananas, spices, coffee, sugar, dyes in
jungle), **and** that resource is revealed to the chopping player, **and** the tile is
unimproved. Both qualifiers earn their place. *Revealed*, because the refusal names the resource
and refusing over an unresearched one would leak the map through an error message — an empire
that does not know the deer are there fells the wood and simply loses them, which is the honest
reading of "you did not know". *Unimproved*, because once the camp stands the deer are **secured**
— `openedResource` asks for the improvement and never for the feature — so the timber is a
legitimate second harvest rather than a loss. The refusal says the rule out loud: *"The deer here
needs the forest — build a camp before you clear it."* The rejected alternative was "refused
always", which is defensible and costs the player the second harvest for no rule they can see.

**`Tile.feature` is now the second field on a tile that changes during play.** The map stays
reproducible from `{config, log}` because every chop is a logged command, and it stays *safe*
because nothing regenerates a tile mid-game: features are placed by `generateMap`'s first pass and
resources by `placeResources`, both of which run once inside `newGame`. The trap in CLAUDE.md was
widened to say so.

**Render: the third source of the suppression sweep.** The board is built once per game (Entry
XIII), so a felled wood is per-instance suppression, not a re-bake. The new part is *where the
sweep gets its list*: after a chop the state says `none` and the buffers still hold pines, so the
question "did I draw trees there?" can only be answered by the bake. `buildBoard` therefore
records `treedCells`, and `clearGround` sweeps `treedCells whose feature is now 'none'` at
`SUPPRESS.decor` — the town's grade, because what has to go is a *canopy*, and everything standing
among the trees goes with it. A chopped hex reads exactly like ground a settlement cleared, which
is the one visual consequence worth stating: the only props it can take are ones the player chose
to give up (an improved resource) or ones they never knew were there. `signFeatureCells(map)`
joins the other two fingerprints so the renderer notices; the sweep stays monotone, so nothing
regrows, and it composes with fog in both orders (the two-bit machine — a scout walking past a
chopped hex must not regrow the forest, which is asserted rather than assumed).

**UI.** The worker sheet gains a **Chop** row beside the improvements, greyed rather than hidden
when the ground refuses (Fortify's reading: "there is no forest here" is a fact about this hex
this turn). It wears the payout and the destination before the decision — `Chop +20⚙`, with
`+20⚙ → Uruk` in the tooltip — from `chopYield` and `chopCity`, the same two functions the reducer
banks with. The payout shows on the greyed pre-Mining row too, for the reason a greyed Mine still
quotes its 2⚙: the number is the argument for researching the node. On the star chart, Mining's
gift list grew an **ability** kind (`techGifts`), driven off the chop table's `tech` field rather
than off Mining's name — so any future clearing surfaces on its own node automatically.

---

## Entry X — The naming bible (RATIFIED 2026-08-22; terminology adopted, styling deferred)

Register rule: systems keep grounded civilization-simulation names; period flavor only where it
is function-forward or genuinely historical; ceremony copy carries the theme. Styling experiments
(takes 6-9: Tyrian ceremony color, letterpress/chamfer/wax-seal treatments, textures) are ARCHIVED
for a later styling pass once the gameplay loop is settled — the specimen artifact preserves them.
The 3D abacus was the one exception: it was built as a look-dev spike (`abacus.html`), approved,
and is now the in-game score screen — the object is real, the beads are not yet.

| surface | ships as |
|---|---|
| research screen | **Natural Philosophy** (screen title; top-bar button stays "Research" — verb, short; alt name "Scholarship" archived). Tech "Philosophy" renames to "Rhetoric" when applied. HUD research card: a parchment lozenge with the sky-lens progress dial at its left end — a conic-gradient ring for progress, a night-sky inner disc lit with the tech's own glyph. |
| civic system (M12) | **Statecraft**; draft header "A matter of Statecraft"; cards keep tarot object-styling |
| governments (M12) | **Orders**; slotted cards fill **offices** |
| authority (M10) | **Authority** (plain) |
| happiness (M10) | **Happiness** (plain) |
| wonders (M11) | **Wonders** ("A Mirabile rises" allowed as splash flavor only) |
| age objectives (M11) | plain mechanical label + prophetic epigraph above it (flavor never carries rules info) |
| ages | **Æra I/II/III** numerals (already live) |
| unexplored (M8) | **Terra Incognita** · "hic svnt dracones" marginalia |
| reroll tokens (M11/12) | **Magister's Dice** · "Cast the Lots" |
| score (M11) | glass **beads** on **the Abacus** |
| the score screen | **the Abacus** (3D, in-game since pre-M11; beads land at M11) |
| events (parked) | **Auguries** |
| religion (parked) | **the Mysteries** (contested draft, per Entry II note) |
| turn splash | "Your turn, Magister" (kept) |
Untouched forever: mechanical categories (food/production/science/etc.), resources, terrains,
units, leaders. Future milestones name their features from this table at birth.

---

## Entry XI — Fog of war: the chart draws itself in (M8, **built** 2026-08-22)

**The model.** Three states per player per tile, in one integer array per seat
(`GameState.visibility`, schema 10): `0` hidden — **Terra Incognita** — `1`
explored, `2` visible. `explored` is monotone and that is the whole reason one
number carries both facts: "have I ever seen this" only ever climbs, "am I
seeing it now" is recomputed from scratch, and storing them separately would be
two arrays that could disagree. Sight is data (`units.json` `sight`: scout 3,
everything else 2; `rules.json` `visibility.hillsBonus` 1, `citySight` 2) and a
city additionally sees every tile it owns unconditionally — a border is a thing
you patrol. Measured: 33 kB of JSON for four seats on a standard map, 4.2% of a
full state dump. Plain arrays; packing would buy a rounding error and cost
readability.

**One evaluator for what a ridge hides.** `hasLineOfSight` moved out of
`combat.ts` into `los.ts` and is now shared by ranged fire and by sight. That is
not tidying: two implementations would drift into a board where a player can
shoot what they cannot see, which is a rule learned and then broken. The
mountain itself is seen, which falls out of the rule rather than being
special-cased — `hexLine` excludes the endpoints, so a blocker cannot block
itself.

**The sim stays omniscient, with exactly one exception.** Commands validate
against the truth, Civ-style: pathfinding runs on the real map and a unit may be
marched into ground nobody has charted. Everything else — info panels, lenses,
banners, the pieces themselves — is presentation gated by the *local* seat.
The exception is `attack`, which now requires the target tile be visible to the
attacker, checked inside `planCombat` so the attackable tint, the forecast card
and the reducer refuse it in the same breath. It is asked *after* range and line
of sight, so the sentence a player reads stays the most specific true one.

**Recompute model.** `recomputeVisibility(state, playerId)` floods every source
the player owns and reports a delta `{became: [{col,row,level}]}`. From scratch
rather than incrementally, because an incremental "un-see the disc you left" has
to be right about every overlapping source and its failure mode is a permanently
lit tile nobody is standing near — fifty turns later and unattributable. Cost is
`O(sources × r²)` plus one integer compare per tile to produce the delta;
measured at 0.6 ms for a 75-unit empire on a standard map. Hooks: `createUnit`
and `removeUnit` (the two low-level primitives every unit passes through, so no
creation path can forget), `moveUnit`, `foundCityAt`, `expandBorders`,
`applyCombat` (naming the seats that changed hands), and a final
`refreshVisibility` turn phase that redraws every seat once the world has
stopped moving.

**City memory.** `GameState.citySightings` — last-seen `{cityId, col, row, name,
ownerId}` per seat, so an explored-but-unwatched site keeps a *dimmed, dashed,
un-clickable* banner instead of vanishing. Deliberately minimal: a memory is a
name on a chart, not a population count. Territory is the documented exception
and shows current truth on explored ground — remembering it properly would mean
a second `tileOwner`-sized grid per seat to correct a leak nothing actionable
comes out of.

**The render, and the constraint.** The hard perf constraint held: a visibility
change is per-instance writes for changed tiles only, never a board rebuild. The
board build now emits a tile→instance map (`TileInstances`), the collector keeps
flat `Float32Array` snapshots of what it uploaded (2.9 MB on a standard map —
`Matrix4` objects would have cost tens), and `FogView.apply` diffs against its
own record. **Measured on a standard map with 40,152 instances: one unit's move
repaints 19 tiles for 246 matrix + 231 tint writes in 0.04 ms; a seat change is
124 tiles and 2,721 writes in 0.1 ms; an idle frame is zero writes.** Rivers are
`shared` between two tiles and drawn while *either* bank is charted, because a
ribbon filed under one hex would run out of nowhere on the other side.

**Terra Incognita as a picture, not an opacity.** A hidden tile's whole scatter
is zero-scaled and a blank vellum patch with a faint ruled hex is switched on in
its place, at the substrate's constant height — unexplored ground has no
elevation to report, and a chart patch that followed the terrain would leak the
thing the fog is hiding. Sparse hash-placed serpents (*hic svnt dracones*,
Entry X) sit in regions whose whole neighbourhood is unexplored, so the
marginalia mass in the empty quarters instead of speckling a half-opened
frontier.

**The knock-back is loud on purpose (user, 2026-08-22).** Explored ground is
*washed*, not dimmed: every instance's ink is mixed toward a flat grey vellum
(`fog.exploredWash` = `chartWash` `#b3ab99`) by **`fog.exploredDim`, v0 0.50** —
the fog's one prominent knob, set high so it is tuned *down* from obvious rather
than up from invisible. Dimming would have made remembered land darker, and
darker reads as night; washing makes it paler and greyer, which reads as chart.
Land, water, decor, rivers and the inverted-hull outlines all take it equally,
so the wash is uniform and the watched region is an unmistakable lit bubble.
Mechanically it is a multiplier per bucket — `((1−mix)·ink + mix·target) / ink` —
because per-instance tints multiply rather than replace, which is exactly what
keeps the hand-cut per-tile wobble and the baked contact shading alive
underneath.

**Presentation choices, written down.** Terrain-ish readouts survive on
explored ground (yield glyphs, resource roundels, the settler wash, territory);
unit-ish ones need current sight (pieces, badges, HP bars, walk and death
animations, the hover card's unit line). The settler lens is the one deliberate
leak — validity is computed from live truth, so a remembered hex a rival has
since claimed reads as refused before this player could know why — kept because
a lens that recommends sites the reducer will refuse is worse than one that is
slightly too well informed.

**Unit occlusion silhouettes (user, 2026-08-22, follow-up).** Units were being
lost behind trees and mountain cones. Fixed *without* softening the depth
honesty: every unit is now drawn twice — the honest solid piece, then a flat
player-coloured ghost over the identical instance matrices with
`depthFunc: GreaterDepth`, `depthWrite: false` and
`units.silhouetteAlpha` (v0 **0.35**). The inverted test is the whole trick: a
fragment survives only where the depth buffer already holds something nearer, so
a piece in the open costs the pass *nothing* (it tests equal, not greater) and a
mountain still occludes the real thing — all that changes is that a faint shape
appears where it did. Structurally the ghost is the outline shell's twin, a third
`InstancedMesh` over the same buffer built by the collector
(`Bucket.ghostMaterial`), so hiding a unit for a walk takes its ghost with it and
fog needs no special case at all — a unit the seat cannot see is never added, so
its silhouette never exists. Sprites ghost through their own `alphaTest` cut-out;
walkers get the same second mesh, so a piece looks identical standing and
mid-stride. **New draw order `RENDER_ORDER.silhouette` = 15**, deliberately
between `overlay` (10) and `onTop` (20): a ghost beats a territory tint, which is
scenery, and loses to every ring, dot and badge, which are the interface talking.
**Draw impact measured: +1 call per (model class × player) actually on screen —
300 units across 4 players and all 15 types is 28 extra calls, 86 total against a
78-call board.**

**The stress harness ships with it**, as the milestone required: 300 units and
40 cities founded and spawned by ordinary accepted commands on a seeded standard
map. **Measured: fixture 111 ms, one full turn resolution 3 ms, replay of 376
commands to a byte-identical snapshot 85 ms, board build 18 ms, chart layer
7 ms.** Operation counts are asserted tightly, wall clocks generously — a timing
assertion tuned tight is a test that fails on somebody else's Tuesday.

---

## Entry XIII — The board is built once per game (perf, **built** 2026-08-23)

**The problem.** Two gameplay events re-baked the whole board. Founding a city suppressed that
tile's dressing so the town was not hidden inside the forest it was founded in; finishing a farm
or a mine suppressed the tile's meadow (`clearsClutter`). Both decisions were made *while
baking*, so both were fingerprinted (`signCityCells`, `signImprovedCells`) and both threw the
instance buffers away and built them again — **26 ms on a standard map, 41 ms on a huge one** —
and took the blank-chart layer and a full-board fog repaint with them, because those hang off the
board's lifetime. Every founding, every farm, all game.

**Why it was deferred out of M7.** The obvious fix — clear the instances by hand instead of
baking — fights fog of war. `FogView` hides a tile by zero-scaling it and later *restores* it to
the transforms it was built with, so the first scout to walk past a farm regrew the meadow it was
ploughed over. The clearing and the fog were two owners of one matrix.

**The fix: two bits, one `or`.** An instance is now off for either of two independent, per-handle
reasons — **fog-hidden** (`hide`/`restore`, owned by `FogView`) and **suppressed**
(`suppress`/`unsuppress`, owned by what has been built on the hex) — and it is drawn iff neither
is set. `restore` returns an instance to `suppressed ? HIDDEN : as-built`, which is the whole
composition rule; a transition writes matrices only when the `or` actually flips, so suppressing a
tile the seat has never charted costs **zero writes** and still holds the day the fog lifts. The
wash stays deliberately orthogonal: a zero-scaled instance's tint is a colour nobody can see, so
neither operation asks the other anything. Table and rationale in the `instances.ts` docblock.

**Two grades, because the two clearings are nested.** `SUPPRESS.clutter` is the ground's own
scatter — tufts, flowers, cacti, tundra pebbles, loose hill boulders — which is what a farm or a
mine ploughs under. `SUPPRESS.decor` is that *plus* the things standing on the hex — trees,
resource props, reeds and shingle — which is what a town clears. The prism, a mountain's peak and
snow, and the sand band are on no grade at all. That is a faithful reading of what the bake used
to do, and it was golden-compared tile by tile: on a generated duel map (1,220 tiles × 3 wrap
copies) the visible instance set after suppression is **byte-identical** — geometry, ink and all
sixteen matrix floats — to the set the old bake produced, for bare, farmed, pastured and
city-founded boards alike. A farm keeps its wheat and keeps the deer in the trees; only a town
takes those.

**Measured, same machine, same run.** Standard map (4,160 tiles, 39,168 instances): rebuild
**26 ms** → a farm is **15 matrix writes in 0.006 ms**, a founding **27 writes in 0.003 ms**.
Huge map (10,240 tiles, 97,530 instances): rebuild **41 ms** → **12 writes** and **30 writes**,
both under 0.005 ms. Resuming a save with 40 towns and 32 works applies in **402 writes /
0.07 ms** against a board of 40,152 instances. Zero tint writes in every case. `test/stress.test.ts`
asserts the operation counts and prints the clock; `test/fog3d.test.ts` asserts all four states of
the two bits, including the M7 bug (a fog restore must not resurrect suppressed clutter) and the
byte-exact un-wash on a built-on hex.

**What the fingerprints do now.** `signCityCells` and `signImprovedCells` survive, but they drive
the *suppression sweep* (`Renderer3D.clearGround`) rather than a rebuild — one pass over the
state, writing only where a tile is newly built on. The sweep is **monotone**: nothing is ever
unsuppressed. So a **pillaged farm keeps its bare ground** — the prop disappears, because it is
its own layer, and the meadow stays gone. That is the Civ rule and it is also what happens to a
ploughed field; regrowing the grass would be the board claiming the tile had never been worked.
`unsuppressTile` exists for the tests and the editor, and for the honest reason that a bit which
can only ever be set is a bit whose composition with fog was never really tested.

**The rebuild list is now complete and short: a new map, and toggling shadows.** Nothing a player
does during a turn re-bakes the board.

---

## Entry XIV — Happiness & Authority: runtime behavior and presentation (M10, **built** 2026-08-23;
the horizontal half in section F, **built** 2026-08-23)

Entry I fixed the skeleton (vertical vs. horizontal limiter, three commitments, v0 numbers).
This entry is the layer below and above it: what the meters *do* each turn, and how a player
reads them. First pass for discussion — nothing here is settled.

### A. The shape question: one meter or many?

Three candidate shapes for happiness (authority is unambiguously empire-wide):

1. **Empire meter (Civ V).** One number: Σ supply − Σ per-city unhappiness. Deficit applies
   empire-wide effects. Most legible at a glance; risk: a single bloated capital sours every
   village, cause and effect live in different cities.
2. **Per-city meters (Civ VI amenities).** Each city nets its own. Cause and effect co-located
   ("Nineveh riots because Nineveh is 12 pop"); risk: N meters to read, luxury allocation
   rules get fiddly, empire-level supplies (palace, cards) need a distribution rule.
3. **Hybrid — empire meter, per-city *pressure* (recommended).** ONE empire number for the
   verdict, but the deficit's bite lands *where the sin lives*: each city's share of total
   unhappiness weights its growth penalty. The 12-pop capital slows hard, the 4-pop village
   barely notices, yet the player still reads one number. The breakdown list (Entry VIII) is
   the bridge: the meter's popover IS the per-city ledger, so shape 3 costs nothing extra to
   explain.

### B. Runtime behavior (v0 proposal, all numbers to `rules.json`)

**Happiness** (recomputed in `collectYields`, a derived value like city yields — never stored):
- Supply: palace 9 · circus +3 · each unique *improved* luxury +2 empire +1/city (≤4 cities)
  · later: cards, wonders, site bonuses. (Luxuries finally earn their keep — today they're gold.)
- Demand: per city, `pop + 0.6·max(0, pop−8)^1.4` (Entry I).
- **Deficit gradient, no cliffs** (commitment): at H < 0, growth surplus multiplier
  `max(0, 1 + H/10)` distributed by each city's unhappiness share (shape 3); at H ≤ −6 add
  −10% production; at H ≤ −10 add −20% combat strength. No hard settler ban (Civ V's cliff);
  the growth choke is the ban, priced smoothly.
- Never linear in empire pop (commitment 2): the per-city superlinear term is the only
  superlinearity; summing per-city terms is lawful.

**Authority** (also derived, also a breakdown):
- Used: 2/founded city, capital free, coastal 1 (Entry I.b), captured city 3 (conquest
  self-throttles harder than settling — you didn't grow them, you seized them).
- Capacity: palace 4 · +2/age reached · courthouse-family building +2 · later cards/wonders.
- Over: −8% science AND culture per point over, floor −60% (Entry I). Applied as a multiplier
  in `advanceResearch`/culture accrual — visible as a labeled line in those breakdowns too.
- **M10 double-tax resolution (Entry I flagged it):** when authority ships, settler
  `costIncrement` halves (8 → 4). Authority becomes the primary width brake; escalation stays
  as tempo friction only. Playtest before touching further.

**New content needed:** circus + courthouse buildings (homes needed in the revised tree — flag
for the tech-revision pass: a "Games"/festival tech and Vassalage are natural hosts), luxury
happiness activation, age-capacity hook. All existing mechanisms; no new sim machinery beyond
two derived breakdowns and three phase multipliers.

### C. Presentation (the part that makes or breaks it)

Naming bible: both stay plain "Happiness"/"Authority". Iconography leans the study, not the
smiley: **happiness = the comedy mask ☺→ drawn as theater masks** (Theatrum thread), or a
festival garland; **authority = the wax seal** — a signet stamp that reads "how far does the
Magister's writ run?"

- **Two HUD chips** beside the yield row: `☺ +6` and `⚜ 6/8`. Green-ink when fine; the chip
  itself turns vermilion *and shows its consequence* when binding — `☺ −3 · growth −30%`,
  `⚜ 9/8 · 🔬🎵 −8%` — the number and its meaning in one glance, no tooltip required.
- **Breakdown popovers on click, Entry VIII discipline**: every source a signed line
  ("Palace +9 · Circus at Ur +3 · Silk +2 · 19 citizens −19 · Ur crowding −2.4"), total =
  fold of the list, one evaluator shared by HUD, city panel and any future AI.
- **Pre-decision deltas (Entry VIII again):** the settler's unit card and the founding
  confirmation quote the authority line *after* this city — "founds Ur: Authority 8/8"; the
  settler lens already colors the coast discount. Same for captured cities in the combat
  preview eventually.
- **City panel**: one happiness line per city (its demand, its share of the squeeze), so the
  empire chip and the city sheet tell the same story at two zooms.
- **Never a turn blocker.** Deficits are legal gambits (Entry I). The interface points
  (announce line the first turn a meter crosses zero — "Your people murmur in Ur." /
  "The Magister's writ grows thin.") but never gates End Turn on it.
- **Turn splash** may carry the age-advance authority gift ("Æra II: your writ extends").

### D. Open questions — ANSWERED (user, 2026-08-23; v1 RATIFIED, numbers still to playtest)

1. **Simplest shape: pure global meters.** One empire happiness, one empire authority. The
   per-city-pressure hybrid is shelved (may return after playtesting).
2. **Captured cities cost 3 authority** (founded 2, capital free, coastal 1). Captured cities
   do NOT feed settler cost escalation (already true — `settlersBuilt` counts production only —
   now a stated commitment). Settler increment stays 8 for now; halving is a playtest lever.
3. **Luxuries: flat +4 happiness per unique improved luxury.** The partial per-city scaling is
   dropped.
4. **Effects** (data-driven):
   · Bonus tiers at +5/+10 → +10%/+20%: Happiness → science & culture · Authority → production.
   · Authority < 0 stifles production, science & culture at −5/−10 → −10%/−20%.
   · **Happiness growth stifle is its own steeper ladder (user, 2026-08-23 — "actually
     impactful"): H < 0 → −50% food surplus · H ≤ −10 → −80% · H ≤ −20 → −100%.** Surplus
     only, never base food — growth stalls, cities never starve from the meter alone.
   Percentages on the same yield SUM **within their stage**, then that stage applies once (a
   +10% and a −10% of the same stage read as 0). Since Entry XVII the meters are the *global*
   stage: they multiply what the city's own bonuses already came to —
   `(base + flats) × (1 + Σ city%) × (1 + Σ global%)`, floored once at the very end.
5. **No new buildings yet** (no circus/courthouse); sources v1 = palace + ages + luxuries
   (happiness), palace + ages (authority capacity). More authority sources acknowledged as
   missing — designed later, likely with the tech-tree revision (monument +1 authority is
   already pencilled there) and civic cards.
   · **Landed with the Age I rework (2026-08-23):** the monument's +1, and generically — a
     building supplies capacity iff its row declares an `authorityCapacity`, counted per type in
     `explainAuthority` ("Monuments ×3 +3"). There is no monument case anywhere in `meters.ts`,
     so the courthouse is a data row when it arrives.

### E. What v1 actually shipped (2026-08-23)

Section D, built, with nothing added and nothing left out. `src/sim/meters.ts` is the whole
simulation: `explainHappiness` / `explainAuthority` return ordered signed lists, the totals are
`foldMeter` of them, and `meterEffects` turns the two totals into the list of modifiers the rest
of the game multiplies by. Neither meter is stored anywhere.

- **The one new field.** `City.captured` (schema 11 → 12), raised by `captureCity` and never
  lowered. Everything else the meters need is already on the board.
- **The capital.** There was no capital in this game before now. The rule chosen and written once
  (`capitalCityOf` in `cities.ts`): the oldest city the player *founded*, falling back to the
  oldest they hold. So a conquered palace moves the seat of government to the oldest town the
  empire still built for itself, and a capital lost and won back does not resume the palace.
- **Precedence.** Captured (3) outranks coastal (1): a seized harbour is a thing you seized.
- **One evaluator each, reused rather than re-derived.** Coast-adjacency moved out of
  `render3d/lens3d.ts` into `water.ts` as `isCoastal`, so the discount is decided by the same
  test that paints the site blue. Improved-luxury access is `controlledResources`, factored out
  of `hasResource` so both read one per-tile rule. Ages come from `highestAge` in `techData.ts`,
  the only age derivation there has ever been.
- **Where the effects land.** Inside `cityYields`, at the end, floored once — so `turnsToBuild`,
  the city panel, the top bar and the turn pipeline all read one number. The growth stifle lands
  in `growthSurplus`, which `collectYields` banks and the panel's Growth line quotes.
- **Presentation.** Two chips in the top bar carrying their own consequence (`☺ −3 · 🌾 −50%`),
  hover for what the number is *doing*, click for the whole signed ledger; the same hover
  treatment given to the five yield totals beside them (one line per city, folding to the
  headline). The settler's sheet and the Found City button quote `Authority 8/10 → 10/10` from
  the same evaluator, coastal discount included. One `announce` line the turn a meter first goes
  under, and End Turn never gates on either.

**The first measured consequence, for playtesting.** `test/tech.test.ts`'s scripted empire —
five cities, builds everything, improves *nothing* — now closes its three ages on turns
42 / 100 / 167 against 42 / 90 / 132 before. It comes to rest at 6/6/6/6/5 citizens, which is
exactly −20 happiness, which is exactly the ladder's last rung: growth stops dead. A luxury-less
empire is capped near 29 citizens until it digs something up (five unique luxuries would buy it
twenty more). That is the ladder doing what it was asked to do, and it is the number to argue
about first: the levers are `rules.meters`, and the obvious candidates are the palace's 9, the
−100% rung, and Entry I's parked settler-increment halving.

### F. The horizontal half — territory & gold (playable-loop item 2, **built** 2026-08-23)

Entry XIV promised a doctrine and section E only built half of it: happiness owned the vertical
and authority owned production. This is the other half. **Authority owns land**, and it owns it
in both of the ways land is acquired.

- **Border growth is Civ 6's pacing.** The machinery was already right — a per-city culture
  basket against a threshold — so the curve was *refitted*, not rebuilt:
  `base + mult · n ^ exp` with Civ 6's own 10 · 6 · 1.3 in `rules.json` (was 20 · 10 · 1.1). The
  best-tile chooser and the claim radius are untouched; only the schedule moved.
- **The writ multiplies the accrual.** `MeterEffect` gained a third channel beside `yields` and
  `growth` — `borders` — because border culture is not a yield: the same culture is banked twice,
  into `City.culture` (which buys ground) and into `Player.culturePool` (which will buy civics),
  and only the first answers to the meter. A solvent writ rides on the *same effect* as its
  production bonus, because it is one fact about the empire.
- **The freeze.** At any authority deficit at all, borders stop: no accrual, no expansion out of
  a basket filled last turn, and no buying. Its own ladder in `rules.json`
  (`meters.borderFreeze`, `< 0 → −100%`), exactly as the growth stifle has its own — it bites
  four points before the first malus rung, and it means something different. It is a *state*
  (`BorderGrowth.frozen`), never a rate of zero, so the panel says "frozen" and the authority
  chip's hover says "borders frozen · purchases barred".
- **Gold buys tiles** — the first gold sink. `purchaseTile { playerId, cityId, col, row }`, valid
  on unowned tile (land or water — water since 2026-08-27, Entry XXVII made it worked ground) inside the city's work radius that touches the *player's* territory, with the
  writ solvent and the price covered. Price is Civ 6 shaped and entirely in `rules.json`: a base
  by ring (50 / 50 / 50 / 75), times `1 + progressFactor · gameProgress` rounded to 5, plus a
  flat +5 per tile this player has ever bought. `Player.tilesPurchased` (schema 13 → 14) is the
  ladder, per player because Civ 6 prices a *habit* and a habit belongs to an empire.
- **The two ladders are separate.** A bought tile does not raise `City.tilesClaimed`, so gold
  never makes a city's culture-earned tiles dearer. Folding them would have turned the sink into
  a tax on border growth.
- **Rule 5 at the till.** `explainTilePurchase` returns the ordered list — ring, era, prior
  purchases, furs' −10% — and `tilePurchasePrice` is its fold. The tag the overlay paints is the
  charge the reducer makes. Furs' `rulePercent: borderCost` now discounts both ladders.

**The measured tuning.** A capital with a monument makes 3 culture a turn, and against
10 / 16 / 24 / 35 that claims its tiles on turns 4 / 9 / 17 / 29 — four by turn 29. A capital
that has to *build* the monument first slides about five turns later and lands three inside the
window. Both readings sit in the 3–4-by-turn-25–30 band the user asked for, and both are asserted
in `test/territory.test.ts` rather than argued here. The +10% a solvent writ puts on the accrual
is worth nothing at 3 culture a turn — floored once, exactly as a barracks' hammers are — which
is deliberate: a monument town is not meant to sprint, and the tier is felt by cities that
actually make culture.

**The gap this exposed, for playtesting.** There is no early gold faucet. A capital on a map with
no gold-paying luxury in its rings earns *nothing* for forty turns, so the sink has nothing to
drink. The replay test had to pick a seed whose capital works a luxury. Unit/building purchase
and unit upkeep are still open (M9 remainder), and so is the faucet question.

---

## Entry IV — Parked ideas (deliberately later; do not build yet)

Noted 2026-08-21 at the user's request, with explicit anti-scope-creep intent. These are GOOD
ideas whose time is after the vanilla loop + the systems above prove out. Nothing here may leak
into earlier milestones.

1. **Rolled & upgradeable leader/civ bonuses.** Leader + civ bonuses are (optionally) drafted or
   rolled at game start — run identity from turn 0, roguelike-style — and can be *upgraded over
   the course of the game* (tying into the maturation/upgrade vocabulary from Entry II).
   Open questions for later: rolled vs. picked vs. draft-3; how upgrades are earned (eras?
   milestones? dice?); MP fairness of asymmetric rolls.
2. **Events system, Old World-style.** Narrative event cards that fire from game state and
   *interact with your civ/leader selection* (a Poison King empire gets poison-flavored events).
   Old World's system is the reference: choices with real mechanical stakes, character-driven.
   Natural synergy: events as a source of Magister's Dice; events as delivery for card upgrades.
   Big content lift — needs its own milestone and a writing pass. Deterministic like everything
   else: event draws from `state.rng`, choices are commands.

3. **Map-placed constructibles (user, 2026-08-21).** Baseline stays Civ V: buildings live in the
   city center, no districts. BUT selected constructibles — wonders, perhaps certain unique
   buildings — may occupy a map tile (visible on the board, occupying a workable tile = real
   cost, very diorama-friendly: wonders as showpieces on the table). Somewhere between Civ V
   and Civ VI's districts without district sprawl. Open questions for later: does placement
   consume the tile's yield; adjacency effects or none; can they be pillaged/captured.

4. **Religion as the CONTESTED draft track (parked 2026-08-22, shape reserved).** If religion
   enters the game, its identity is competitive shared-pool drafting — Civ V's belief system
   was secretly this: a finite pool where what your rival takes is GONE for you. Distinct
   texture from the private civic drafts (snake-draft tension, deeply multiplayer). Do not
   build a third private-pool system; this slot is reserved for the contested one.

**Scope-creep guard:** the active roadmap stays vanilla-first (M4 science/culture → combat → AI →
netcode). New mechanics land in THIS file first, get sequenced explicitly, and only then get
built. The excitement is a feature; the parking lot is the discipline.

---

## Entry V — Game length: shorter, denser, and guaranteed to end

**Goal (user, 2026-08-21):** shorter than a standard Civ game, without losing depth.
**Reframe:** depth is *decision density*, not duration. Standard Civ hours are heavy with
low-decision time (end-turn mashing, unit ferrying, mid-game sag). This design already
concentrates decisions (drafts, pool boons, site choices, events later) — cutting dead time
raises depth-per-hour.

**Why shorter fits this product:** (1) friends-MP games must FINISH — unfinished campaigns are
Civ MP's #1 failure; one-evening (~2.5–3h live) or a-couple-async-weeks is the target; (2) the
roguelike draft layer needs many runs to pay off — run identity starves in marathons.

**Levers (in order of power):**
1. **Defined end — the curtain falls.** Game ends when the final age completes — RETUNED
   2026-08-22 (Quick-speed pacing pass; re-measured after the settler retune): ages close
   ~t42 / t90 / t132 standard, measured and
   band-asserted in the pacing test; the curtain target is now ~t130 with current content
   (3 ages; later ages extend it). Highest victory points wins. Knockout victories (conquest; maybe a
   science/culture coup) can end it earlier. Guarantees finishability by construction; very
   board-game, very Theatrum Mundi. VP composition TBD (ages advanced, wonders, cities at end,
   drafted-set bonuses?).
2. **Invert Civ's cost-vs-yield divergence.** Civ V lags: costs grow ~exponentially, yields
   ~linearly → late slog. Ours: late-era costs grow SLOWER than yields, so the endgame
   accelerates into the finale instead of dragging. All exponents in `rules.json`.
   Harness assertion: scripted bots reach the final age inside the measured band (t116–142 as
   of the 2026-08-22 retune; the pacing test IS this assertion now).
3. **Map discipline:** duel/small as default MP sizes — less walking, earlier contact.
4. **Speed profiles as data:** Blitz / Standard / Epic as multiplier sets over the cost tables.
   Default tuned to one evening; Epic preserves the long arc for those who want it. (The depth
   pressure-valve: we don't have to choose for everyone.)

5. **Pace mechanics (user, 2026-08-21):**
   - **Higher base unit movement** (e.g. warrior 3, scout 4) — kills transit dead-turns on the
     smaller default maps. Pure `units.json`. Watch: faster units make 1UPT tactics swingier;
     re-feel at the combat milestone.
   - **AoE2-style auto-upgrade**: researching the enabling tech upgrades all units of the line
     automatically (optional one-time per-type "retooling" gold cost as a data lever, tunable to
     0). Kills Civ's per-unit upgrade micro; the decision stays in composition + tech timing.
     Clean design space for military civics ("retooling is free").
   - **Condensed tech/civic trees**: ~45–55 tech nodes total across all ages (vs Civ V's ~80),
     each a *package* (2–3 unlocks, later + a pool boon choice per Entry II). No connective-
     tissue filler techs. Fewer nodes, every one a decision.

**Scoring flavor (DECIDED direction):** victory points are **glass beads** — the Magister Ludi
reference made mechanical. Ages award beads at their close; wonders/feats add beads; the
always-visible scoreboard is **the Abacus** (a bead string per player, tabletop-legible at a
glance). This resolves the VP-legibility risk physically. (Retired: "theatre bill" — wrong
name's metaphor.)

**Risks:** VP endgames can feel anticlimactic if points are opaque — mitigated by the Abacus
being visible all game; acceleration curves can make leads uncatchable — pair with the catch-up
levers already noted (civic cost catch-up, authority penalties on runaway conquest).

---

## Entry VI — Victory: the Bead Race (single unified win condition)

**Decision (user, 2026-08-21):** no separate victory tracks. Rejected: world-conquest domination
(tedious), spaceship-tail science (drags), tourism (nonsensical), Civ V diplo (a joke). ONE
overarching condition: **glass beads** earned across four families — domination, culture,
science, economic — tallied on the always-visible Abacus (Entry V).

**Why unified fixes the rejected list structurally:** separate tracks make most systems
irrelevant per player, hide the losing state, and force each track to carry an endgame alone
(hence total conquest / spaceship tails). One currency: war out-earns instead of exterminating;
science scores continuously instead of gating; everyone races one legible number.

**Design commitments:**
1. **Coarse grain.** ~30 beads in a finished game, not 400 points. Every bead is an announced
   event (clacks onto the Abacus, attributed). Anti-point-salad: if everything scores, nothing
   is a decision.
2. **Three source types across the four families:**
   - **Feats** — one-time firsts (first to an era, capital captured, first wonder of an age,
     circumnavigation). Spiky, front-loaded → the early-victory fuel.
   - **Age objectives** — 2–3 PUBLIC goals revealed at each age's opening (TI-style), scored at
     its close. Each age = a self-contained act; new deals each act = comeback structure.
   - **Age-close scoring** — small state-based award per age (cities, techs, government tier)
     so steady builders stay on the board.
3. **Two ways to win:** first to threshold N beads → win; otherwise most beads at final age
   close. **CLIMAX AMENDMENT (user, 2026-08-22): the threshold must not end with a whimper.**
   Ordinary scoring carries a player to N−1 beads; **the final bead is the GOLDEN BEAD, and it
   can only be earned by completing the Magnum Opus** — a declared, multi-turn capstone project
   (the alchemists' Great Work; Entry X-compatible name). Properties that make it a climax:
   - **Announced**: starting the Opus is a Tyrian ceremony moment every player sees ("Crimson
     has begun the Magnum Opus") — the game's two-minute warning.
   - **Visible & interruptible**: it builds in the capital over several turns (cost likely a
     mixed sink — hammers + science + culture, TBD); capturing or razing-adjacent pressure on
     that city halts it. The endgame becomes a defense/assault set-piece, not a mail delivery.
   - **The golden bead is visualized**: the Abacus rod's final slot is distinct — gilt, larger —
     and sits empty all game as the standing question.
   - The curtain path (most-beads at final age close) needs no Opus — the final age's
     objectives already give it shape — but a player MAY complete the Opus before the curtain
     for the same golden bead, making the race dual-lane.
   Open questions: Opus cost composition and scaling by speed/player count; whether N−1 must be
   held (can you start the Opus early?  v0: requires N−1 beads to begin); what happens on
   interruption (progress kept? halved?); AI valuation of Opus rushing/denial (M13).
4. **War prices itself:** conquest mints big beads but captured cities cost authority (Entry I)
   — the domination path is throttled by an existing system, no warmonger rules needed.
5. **Economic beads = economic/diplomatic hybrid (user, 2026-08-21), and PURE STAT CHECKS ARE
   OUT OF SCOPE.** Principle: beads are *claims on the world*, never bank statements. No
   "accumulate X gold"-style private milestones — every bead source must be visible and
   contestable by other players. In scope for this family: founding the United Nations (or
   era-equivalent congress), control of city-states (IF city-states get implemented — parked
   system, not yet committed), control of X% of a world resource, trade-network dominance.
   This also absorbs diplomacy properly: no separate diplo victory, just diplomatic *positions*
   that mint beads.
6. All sources/values in `data/beads.json` (future); awards happen in the sim (deterministic,
   announced via the command/phase pipeline like everything else).

**Risks:** leader legibility invites gang-ups (feature in MP, but AI must handle it too);
objective RNG must respect the fairness rules of Entry II (public, same for all players);
threshold N is THE pacing knob — harness assertion: bot games end by threshold or curtain within
the target turn band.

---

## Entry VII — Theme: the magister's study (hermetic, not spooky)

**Direction (user, 2026-08-21):** lean harder into the "playing a somewhat magic/occult game"
frame; card draws go tarot-ish; bright poster colors questioned.

**The bridge is historically real:** tarot began as a 15th-c. Italian card GAME (Visconti-
Sforza) before it was occult; Camillo's Memory Theatre was a Renaissance occult knowledge
device; Hesse's order reads as mystic from outside. Unifying aesthetic: **the scholar-magus's
study** — parchment, ink, woodcut engraving, astrological diagrams, gilt, candlelight.
Register: hermetic / cabinet-of-curiosities. NEVER grimdark or edgelord (protects the quirky
leader roster — Emperor Norton belongs in a wunderkammer).

**Two-layer fiction (the load-bearing rule):** the WORLD stays innocent — the toon diorama
board keeps its warm sage/wheat palette unchanged. The INTERFACE is the occult apparatus — the
magister's instruments for observing and playing that world. Only UI accents age:
- vermilion → **oxblood** · teal → **verdigris** · gilt gains prominence · ink stays.
- Structure unchanged (ink borders, hard shadows, depress-on-press). Saturation lowered,
  color-coding kept — yield voices and player colors become heraldic tinctures, still distinct.

**Applications, by leverage:**
1. **Civic cards = tarot-shaped**: tall ratio, engraved frame, Roman numeral, woodcut-style
   emblem, epigram flavor line. The draft is a *spread*: three cards dealt face-down, flipped.
2. **Lenses = the magus's instruments** (settler lens as augury).
3. Dressing: ages as Roman numerals; hairline astro/geomantic ornament on panels; Magister's
   Dice flavored as casting lots (astragali). Glass beads unchanged — already the mystical
   object.
4. Type: Instrument Serif survives (engraved cut). NO blackletter (costume). Optional extra
   voice: letterspaced small caps for inscriptions.

**Take four (user direction, 2026-08-21): THE STUDY AT NIGHT — dark theme.** Ground goes
near-black with faint candle-warm glow; parchment cards/sheets stay as physical objects floating
on darkness (umbra shadows + hairline gilt rims); announcement surfaces (marquee, turn splash)
are **red lacquer with gold double frames** — register proved by *Sultan's Game* (user-named
reference: opulent, dark, card-centric). In-game thesis: **the diorama in the dark room** — the
warm bright board is the lit object, all chrome recedes into darkness. Flourish set (capped):
gold double-frame on announcements · wax-seal turn stamp · star-chart tech tree (ink ground,
gilt stars) · manicule for notices · Roman numerals (ages, queue) · one corner star per panel ·
card-back weave. Refused: parchment textures, candle flicker, dust, blackletter, board flourishes.
**Unit representation (user, 2026-08-21, after Armory review): CLASS MODELS + FLOATING BADGES.**
Per-type sculpts read too similar at game zoom. Units render as one sculpted miniature per
MODEL CLASS (settler · worker[reserved] · melee · ranged · mounted · mountedRanged · siege ·
scout), differentiated by a Civ-style floating badge: parchment roundel, bespoke single-stroke
ink icon (all 8 drawn in-house — Kenney's CC0 pack only covered half and a badge set must be
one family), player-color rim. Badges are world objects (depth-tested, hide behind mountains),
ride walk animation, appear in both unit styles. Scales: new unit types are data rows (class +
icon), never new sculpts. The 8 displaced per-type sculpts stay benched in geometry.ts.
Standee/sprite path retained behind units.style for future use (portraits are the Midjourney
art's real home). Draw cost flat in unit count (~classes+players).

**RESOLVED (user, 2026-08-21, after a live composite test): LIGHT THEME WINS.** The dark
nocturne (take five) was tested as a live token-injection over the real board — it works, but
the light chrome "feels better." Dark takes stay archived in the specimen. THE FLOURISHES ARE
KEPT and apply to the light theme: wax-seal turn stamp, star-chart tech tree (that one surface
stays ink/dark by design), manicule notices, Roman numerals, corner stars, card-back weave,
gold double-frames on announcement surfaces. Design nitpicks deferred.

**3D scene background (user direction): do something better than the pale sky — and design it
to become fog of war.** Concept: the board sits on the magister's CHART-TABLE — the backdrop
reads as aged vellum/table surface. Eventually: unexplored tiles = blank chart (faint hex
ghost-lines on vellum, the world literally drawn in as you explore); explored-but-unseen =
desaturated/inked-down. Background and FOW become one visual system, light-theme native.

---

## Entry VIII — Glanceable bonuses: the one-evaluator rule

**Requirement (user, 2026-08-21):** every bonus must be glanceable — the game shows the actual
computed delta BEFORE activation ("+4 🌾" when evaluating "farms with freshwater gain +1 food").
Built natively, not bolted on.

**The rule (load-bearing, applies from M4 onward):** all bonuses — buildings, techs, civic
cards, leader passives, site bonuses — are DECLARATIVE DATA evaluated by ONE pure pipeline.
Effect record shape (v0): `{target, if: <condition predicates over tile/city/player>, add:
<yield/stat deltas>}`. No scattered imperative "when X add Y" code, ever.

**Preview = hypothetical evaluation:** compute yields with the candidate effect included, diff
against current. Pure read of live state, no cloning/simulation. Because the preview calls the
SAME function the sim uses, it cannot lie.

**Why load-bearing (three free payoffs):**
1. AI valuation (M6): the bot drafts cards by the same delta function the player sees.
2. Harness audits: "no card's turn-one delta exceeds its tier budget" is an assertion.
3. Honest tooltips: headline delta expands to per-city breakdown (evaluator computes per-target).

**Explainable yields (user, 2026-08-22 — architectural rule, implement from M7 onward):**
tile-yield computation must produce an ORDERED CONTRIBUTION LIST (entries: source id + kind
`base|override|add|multiplier` + per-yield amounts) with the total derived as the fold of the
list — never a parallel calculation. UI (tile info tab, later tooltips) renders it as
"Grassland 2🌾 · Forest 1🌾1⚙ (replaces) · +Wheat 1🌾 · +Farm 1🌾 · +Civil Service 1🌾".
No cosmetic change yet; M7 (improvements) refactors `tileYieldOf` into this shape since it
touches that code anyway, and every later yield source (renewal techs, civic cards) MUST land
as a contribution entry, not an inline adjustment.

**Caveats:** deltas are PRESENT-STATE — label as "now" (a freshwater-farm card grows with every
farm; show it as current value, arguably with a hint of scaling); non-yield effects preview in
their own units (combat strength, authority capacity) where computable, static text only for
genuinely situational effects. Existing buildings' flat fields (M3) migrate into the effect
vocabulary when M4 builds the evaluator.

---

## Entry IX — Combat: one evaluator, resolved in log order (M5, built)

**The model.** An attack is a **command**, resolved immediately in log order, exactly like a
move. No combat phase, no batching, no declare-then-resolve window. Under simultaneous turns
that is the only model that keeps replay honest: contention between two players attacking in
the same window is settled by position in the log, the same tie-break every other race uses.
The awkward case needs no rule — a unit killed by an earlier command is simply gone, so a later
command by or against it fails validation cleanly and leaves the state byte-identical.

**One evaluator (Entry VIII, applied to violence).** `previewCombat` and `applyCombat` are the
same computation (`planCombat`) read twice. The plan carries the *unrolled* damage; the preview
reports it at the midpoint with the band beside it, the reducer multiplies it by a roll from
`state.rng`. The forecast can be wrong about the die and about nothing else. The context card,
the attackable-tile tint and the reducer therefore cannot disagree — the tint is literally
"every cell `previewCombat` accepts".

**The curve.** `damage = baseDamage · e^(exponent · (strA − strB)) · roll`, Civ V's model, chosen
because it has no scale: a 4-point edge is worth the same multiplier at strength 8 as at 30, so
later eras can be added without the early game becoming rounding error. Defender strength is
`base · (1 + terrain + fortify)`; a melee attacker across a river pays `riverAttackPenalty`.
Terrain defence *sums* across terrain, feature and hills (a forested hill is +50%) — the third
algebra in `terrainData.ts`, and the only one that adds, because cover and height are different
advantages and a defender gets both.

**Cities.** A city is a defender with hit points, `cityBaseStrength + perPop × pop`, and **no**
terrain bonus — the walls are the terrain. Ranged fire floors it at 1 hit point (bombardment
softens, infantry takes); a melee blow that would empty it captures it instead. Targeting is
military unit > city > civilian, so a garrison makes a siege rather than a race. A captured city
keeps its buildings, population and food and loses the old owner's *intent* — queue, hammers,
pinned citizens. Its territory follows for free, because `tileOwner` holds city ids.

**Captured-city authority (for the future ledger).** When the happiness/authority system of
Entry I lands, a captured city is where it will first bite: a conquered city should cost
authority to hold, and that cost is what makes wide conquest a decision rather than a ratchet.
Nothing is modelled now — no beads, no unrest, no population loss on capture — but the capture
path is a single function (`captureCity`) and is the one place that rule will attach to.

**Elimination and victory.** No units and no cities means out. Decided *inside* `applyCombat`
rather than in a turn phase, and that is load-bearing: under simultaneous turns a player wiped
out mid-window has not ended their turn, so a verdict that waited for the end of the turn would
leave the window waiting for a seat with nothing left to do. In v1 combat is the only thing that
can empty a player, so there is no elimination phase at all — a phase that could only ever fire
on a hand-edited state is a phase no test can honestly cover. Victory is the last seat standing,
recorded in `GameState.winnerId` and never used to gate the reducer (a finished game must still
replay).

**Deliberately deferred, each with its reason.** Zone of control (movement stays Milestone 2's);
experience and promotions; city ranged strikes; diplomacy and war declaration (all players are
mutually hostile in v1, so there is nothing to declare); embarkation; war weariness; and damage
scaling with health, which keeps a fight a grind rather than an avalanche. Line of sight is
blocked only by mountains strictly between shooter and target — a real elevation rule needs a
height field and a visibility system, and half of one is a rule players learn and then lose.

---

## Sequencing snapshot (updated 2026-08-22)
Core loop complete through combat + resources (671 tests). Mechanics-before-AI sequence
(dependency-ordered, user-approved direction):
- **M7 Workers & improvements — BUILT 2026-08-23 (see Entry XII).** 930 tests. Boats did *not*
  fold in (fish is documented as unreachable until naval), roads stayed out as decided, and the
  explainable-yields refactor CLAUDE.md rule 5 reserved for this milestone landed with it. The
  original scope note follows.
- **Perf follow-up — BUILT 2026-08-23 (see Entry XIII).** 944 tests. The last two mid-game board
  rebuilds (founding a city, finishing a farm) are gone: the clearing is a per-instance bit that
  composes with fog's own, and the board is built once per game. The M7 report deferred exactly
  this, and the deferral's reason — a naive clearing fights `FogView.restore` — is what the
  two-bit machine in `instances.ts` answers.
- **M7 Workers & improvements** — farms/mines/pastures/plantations/quarries/boats/roads,
  worker unit (class reserved), strategic/luxury access requires IMPROVEMENT (fixes the v1
  ownership shortcut), pillage-ready.
  **Worker model (DECIDED 2026-08-22): Civ VI-style CHARGES, instant builds.** Base 3 charges,
  charge count + per-improvement charge costs in data (synergy surface for future civic cards:
  "+1 charge", refunds, discounts — charges ARE cards). Rationale: discrete previewable spends
  (Entry VIII deltas per charge); kills the worker-stealing annuity incentive and the Civ V
  upfront-cost agony (workers cheap per the pacing pass); and architecturally atomic — instant
  builds mean NO partial-progress tile state, no contested half-built farms under simultaneous
  turns; one validated command per spend. Captured workers keep remaining charges. Roads:
  **OUT of M7 entirely (user, 2026-08-22): traders build roads** — roads arrive with the
  trade-route system, laid along the trader's chosen path (movement network and economy grow
  along the same player-chosen lines; pillaging a route hurts twice). Until then the game has
  no roads, which also keeps early movement honest. Trade-route design remains open on yields
  (the tall-subsidy flag in Entry I) but the road mechanism is settled.
- **M8 Fog of war & exploration — BUILT 2026-08-22 (see Entry XI).** Tri-state per seat,
  chart-table unexplored render (the world drawn in), scout identity (sight is its own stat,
  not a multiple of movement), per-player info honesty. Embarkation did *not* fold in and is
  still deferred with the rest of naval. The HARD PERF CONSTRAINT held and is now asserted:
  one move repaints 19 tiles / 477 instance writes against a 40,152-instance board, and the
  board is never rebuilt. The stress harness shipped with it (`test/stress.test.ts`, 300 units
  / 40 cities / standard map, operation counts primary and wall clocks generous) so fog cost is
  pinned by CI from birth. **User pulled M8 ahead of M7 (2026-08-22) — fog + harness first,
  workers after.** 839 tests.
- **M9 Gold loop** — unit/building maintenance + city purchasing.
- **M10 Happiness & Authority — BUILT 2026-08-23 (see Entry XIV.E).** 1011 tests. Two derived
  global meters, each a breakdown folded to a total; the coastal site bonus ships with them
  (the freshwater one still waits on rivers). Luxuries finally earn their keep. No new
  buildings, per XIV.D.5, so v1's only supplies are palace + ages + luxuries. The tall/wide
  harness assertions have *not* begun — the one measurement taken (the tech-pacing empire, now
  42/100/167) is the argument for taking them next.
- **M11 Wonders + formal Ages + Beads v1** — Entries V/VI: feats, age objectives, age-close
  scoring, threshold + curtain, the Abacus. Victory gets its real shape.
- **M12 Civic drafting + governments + Magister's Dice** — Entry II, last onto a proven base.
- **M13 AI** (meets the finished ruleset once; one-evaluator functions are its brain) →
  **M14 netcode**. Post-AI: promotions/ZOC, events, leader abilities, city-states decision.
Everything visual remains placeholder-to-dial; vanilla-first honored (drafting is the one
non-vanilla system and it lands after the vanilla loop is proven).

---

## Entry XV — Statecraft: the full M12 draft spec (RATIFIED 2026-08-23; **built** 2026-08-26)

Converged over one design session; playtest tunes numbers, not shapes.

**The meter and the ladder**
- Culture fills an escalating meter; each fill = one draft. **Tier = draft count** — one
  number, one ladder. Cost escalates by draft count ONLY, never by city count (Entry I
  commitment 3: authority is the only lawful width tax).
- Target cadence ~5 turns per draft early (load-bearing playtest number).

**The offer: 3 new + 1 upgrade**
- Every draft offers **3 new cards + 1 upgrade** (user: enough choices to fight variance and
  find synergies). New cards draw WITHOUT replacement from the live pool; the upgrade slot
  names one *rolled* card the player already owns and deepens it (level on the card; v1
  upgraded faces are generic ~1.5–2×, bespoke texts later).
- This rehabilitates Entry II's rejected duplicate-merge in clean form: merge's benefit with
  no duplicates. Every draft is the deckbuilder question — widen or deepen.
- Live pool = current government's cards + unpicked leftovers from the previous government;
  older cards retire (they live on via the upgrade slot).

**Governments**
- Offered at **tiers 3 / 7 / 15** (widening gaps + escalating costs ≈ even turn-time between
  governments; culture-heavy play races them — that is culture's payoff).
- Each offer is a **fixed triple** (deterministic spine per Entry II), pick 1; adoption is
  **bankable** — take it when ready.
- **Adoption = seal amnesty**: new slot spread, every card returns to the collection
  unsealed, re-slot fresh. Civ VI's free-swap window, derived rather than ruled.
- Start: Tier-0 "Chiefdom", 1–2 slots. Slots typed (military/economic/diplomatic/wildcard),
  counts grow by government. **Pool power steps per GOVERNMENT, not per tier** — 4 authorable
  pools (~10–12 cards each), power jumps land on adoption day with the slot jumps.

**Seals (swap friction)**
- Slotting a card **seals** it for X turns (flat, data-driven, v0 ~5): entry-lock, so posture
  changes are anticipated, not reactive — which simultaneous turns need. Unslotting after the
  seal expires is free. UI: wax-seal glyph + mono turn count ("sealed for 3").

**Magister's Dice — the one flexibility currency** (cap 3 held, earned deterministically):
reroll a mastery roll · reroll a card offer · reroll the upgrade target · break a seal.

**The two-stream doctrine** (why neither Civ V policy trees nor a Civ VI civic tree):
- **Science** → ages, capabilities, and PASSIVE PERMANENT masteries (tech rolls — relics;
  learned knowledge is never unslotted). Masteries modify *things*: buildings, tiles,
  improvements.
- **Culture** → government tiers and SLOTTABLE Orders (the deck; law is rewritable). Cards
  modify *behaviors*: rates, actions, meter levers.
- One draft machinery serves both (offer gen from state.rng, pick/reroll as commands), two
  dressings (star-chart night for masteries, Statecraft parchment for Orders). Supersedes
  Entry II's science-buys-civic-pool-quality coupling: each stream now owns its own quality
  ladder (ages/masteries vs. governments/pools).
- Build order: tech masteries first (drafting at its simplest — no slots), then civics add
  slots/governments/seals on the proven plumbing.

**Open tuning:** seal length · cadence · band spillover · whether a government pick can ever
be revisited within a tier (v1: no).

### Built 2026-08-26 (playable.md item 5)

The whole of it except Magister's Dice, which stay parked: a reroll is a thing you *spend*
something on, and the currency does not exist yet — building the verb first would be
guessing what it will cost.

**What the code is.** Three files and one claim. `data/statecraft.json` holds 10
governments, 21 live Doctrines and 65 Orders; `statecraftData.ts` types them and declares a
**24-shape effect vocabulary**; `statecraft.ts` is the **only module in the game that reads
a `CardEffect`**. That is `resourceEffects.ts`'s claim one scale out and it buys the same
thing: a new card is a JSON row. Every reader in that file returns a **labelled list**, and
every consumer folds it into a breakdown it already had — rule 5 read at the scale of a
card, so a Doctrine's +30% is a line in the city panel's stage sum and never a
multiplication standing beside it.

**The vocabulary is generic, and where it was not it deferred.** `combatCardLine` is not
"+3 vs barbarians" — it is *a labelled strength line under a stated condition*, and seven
cards are rows of it. `windfallRider` covers twelve occasions through one composer. Four
halves are annotated as unbuilt rather than bent into a shape that nearly fits (the Gilded
Hall, Religious Mandate, the Founders' Road's roads, the courthouse prohibition); the
register is `docs/statecraft-cards.md` and the `deferred` field on the row.

**A rider is part of the printed number.** Entry XVIII.5 stands unchanged — a one-time
grant pays its printed figure with no percentages, no meter tiers and no staging — and
`windfallPayout` is what makes that true *and* lets The Woodwrights double a chop: it
composes the base and every rider into one figure **before** anything is banked, so 40⚙ is
what the preview promises, what the basket receives and what the announcement says. There
is one such function and no path around it. Percentages on one occasion **sum** before
multiplying once, which is Entry XVII's "additive within a stage" read at a different
scale.

**Culture is the fourth Entry XVIII bucket.** `settleCultureWindfall` closes the absence
`discoveries.ts` had been carrying in a docblock since Entry XX ("a completion routine with
nothing to complete"). `Player.culturePool` is the basket itself rather than a bank beside
one — a second field would be a second answer to "how close am I", and the two would
disagree the first time a windfall paid one of them. Border culture stays its own channel
(`City.culture`), untouched, which is the whole of "do not double-spend".

**Two questions the build had to settle.**

*Recursion.* A `conditionRule` can ask about a meter, and a meter's value counts cards.
The cut is stated in one place: **an empire condition is evaluated against a reading that
ignores every condition-gated effect** (`conditionDepth`). Terminating, one rule, and exact
for the content that exists — Emergency Powers asks about authority and pays in production
and borders, neither of which is authority.

*Seals are a turn, not a countdown.* `sealedUntil` is an absolute turn compared against
`state.turn`, never a number a phase ticks. A countdown is state that has to be maintained,
and a phase that maintains it is a phase that can be skipped, run twice or run in the wrong
order. So "ticks seals" is a phase this system does **not** have.

**Measured cadence** (seed 4242, the scripted pacing empire from `tech.test.ts`, at
`costBase 6 / costLinear 3 / costExponent 2`): first draft **turn 7**, **6.6 turns per
draft across drafts 1–8**, governments offered on **turns 24 / 47 / 97** against the three
ages closing on 41 / 80 / 120 — so each government arrives a little ahead of the age it
belongs to, which is "even turn-time between governments" holding on both ladders at once.

The ~5-turn target is **not** met by that empire, and the gap is recorded rather than tuned
away. The binding constraint is not the curve: this empire makes about **one culture a turn
for its first thirty turns**, so *any* escalating cost yields a 6–7 turn opening cadence for
it, and pulling the curve down far enough to hit 5 would make the mid-game cadence 2–3
turns — a worse game than a slightly slow opening. Five turns is what a *culture-focused*
empire gets: Boundary Stones, Land Grants and a monument-first build roughly double the
early rate, and doubling the income halves the cadence. Entry XV's own words are that
"culture-heavy play races them — that is culture's payoff", so a deliberately conservative
scripted empire *should* sit above the target and a player chasing it should land on it.
`test/sim/statecraftPacing.test.ts` pins the number and the argument together.

**Open tuning that is now open with numbers behind it:** the seal at 5 turns has not been
playtested against a real swap plan; the upgrade face is generic ×1.5 as Entry XV asked for
v1, and a card whose deepened form should change *shape* rather than scale wants a second
face in the data.


## Entry XVI — The world is two fields (mapgen rework, **built** 2026-08-23)

The complaints this answers, in the user's words: biomes too large (forests blanket continents),
starts with no hills nearby, mountain ranges too thick and continental-wall-like, hills not
clustered near mountains, forests and jungle uniformly dense rather than regionally varied — and,
on the resource side, too few settle-able spots near the capital.

**One idea.** The generator used to draw a handful of independent scatters and threshold each one
on its own. It now draws exactly **two geographies** and reads every terrain decision off them.
That is the difference between a world and a pile of noise: a forest is where it is because that
part of the continent is wet, and a hill is where it is because a range runs past it.

**Relief** mixes three ranked components (`elevation.ridgeWeight` / `continentWeight` /
`gradientWeight`, plus `crestlineWeight`): a **ridged multifractal**, whose crests are connected
*lines* rather than blobs — this is what a mountain range is; the continental field itself, which
biases those crests inland onto a landmass's spine so a range separates one half of a continent
from the other; and the local steepness of that field, so an escarpment reads as hills with no
crest under it. A fourth term lifts tiles on the crest **skeleton** (transverse local maxima,
`crestLine`) — the knob that decides whether a range is a line or a wall, because thresholding
height alone cannot make a thin range: how wide the set above a cut comes out depends on how steep
that particular massif is, and no threshold reconciles a broad dome with a sharp crease.

**The cuts are quantiles of land, not heights.** `mountainShare` and `hillShare` — "5% of the land
is mountain" is the sentence a designer wants to write, and a quantile is stable across seeds *and*
sizes where an absolute cut on a rank-normalised field is only stable across seeds. Hills are
therefore literally the flank band of the field the peaks came from: foothills hug every range for
free (98% of mountain tiles have a hill neighbour), and lesser crests that never reach the mountain
cut surface as standalone hill chains.

**Moisture** is two scales *multiplied*: a low-frequency regional layer (this part of the world is
wooded country, that part is open steppe) times a fine local layer (copses and clearings).
Multiplication is the point — a wood needs the region *and* the patch to be wet, so forest
concentrates into real regions instead of dusting the map evenly. Forest and jungle are then shares
of their *eligible* ground, ranked within it; jungle ranked inside the equatorial band, because a
global moisture cut asked whether a tropical tile was wetter than most of the *world* and a seed
whose wet regions missed the equator had no jungle at all. Optional **rain shadow** dries the
ground downwind of a range before the field is ranked.

**Feature size versus feature count.** A noise layer states its scale as `frequency` (cycles around
the world: fixed count, features grow with the map) or `cycleTiles` (tiles per cycle: fixed size in
hexes, more of them on a bigger map). Continents and regional climate want the first; ranges and
copses want the second. That one distinction is why a giant map's mountains are now as narrow as a
duel map's — before, the same five ranges simply grew with the board.

**Measured, before → after** (16 seeds, standard): mountain 11.9% → 5.0% of land; hills 26.5% →
20.0%; forest 24.2% → 16.3%; jungle 31% → 10% of the equatorial band; mean range width
(area ÷ longest axis) 2.95 → 1.86, and now flat across sizes (was 2.02 duel / 3.35 large).

**Consequences deliberately taken.** Starts weight production far harder
(`starts.productionWeight` 1.5 → 2.5) so a capital has hills in its inner ring: 44% → 73% of
standard starts do. That buys hammers with food — the capital reaches size 2 later — and the
pacing tests were rewritten to assert the *relation* (build time = cost ÷ the rate the city
actually banked) rather than one seed's turn count, because an exact turn count was a map-generator
fixture wearing a pacing test's clothes.

**Continents replace landmasses** (`carveContinents`). A continent is a carved chunk of about
`continentTargetTiles` — Civ 6's sense of the word — and not a connected landmass. Keyed to
landmasses, a map whose land happened to be one connected mass had one region, was dealt one hand
of luxuries, and read as a single grey average from pole to pole. Each continent is dealt
`luxuryKindsPerContinent` (4) kinds, a kind is confined to `maxContinentsPerLuxury` (2) continents
map-wide (relaxing deterministically when the map has more continents than the pool can seat), and
each dealt kind is **placed directly in multiples** rather than hoped for by a scatter that
rejects off the wrong ground. Duplicates are the design, not a side effect: they feed the
settle-on-the-seam rule, silver and gold's `perCopy` signatures, and eventually trade.

**Resource density, before → after** (standard): all resources 1 per 7.5 land tiles → 1 per 4.8;
luxuries 1 per 34 → 1 per 12 (47 → 132 tiles a map, 12 → 18 of the 25 kinds present, ~7 copies of
a kind — Civ 6's figure); bonus 1 per 12.9 → 1 per 9.9 (the "nowhere to settle" complaint);
strategic unchanged at 1 per 38. Every possible start now also gets one of its guaranteed luxury
kinds **in a seam of two**, Civ 5's region luxury: one lonely wine four hexes off is a curiosity,
two is a reason to plant a city on it.

**Open tuning:** the settler's price now buys four turns of the opening rate rather than five, and
restoring five is a `units.json` edit rather than a mapgen one — deliberately not folded into this
pass.

### Amended 2026-08-24 — the distribution survey

A fifteen-seed survey of the finished generator found four things the entry above claims but does
not deliver. All four are fixed in data and in `resources.ts`; nothing about the two-fields idea
changed.

**1. A hand could name ground that does not exist.** The deal drew four kinds per continent from the
whole table without ever asking whether the continent could grow them, so a hand containing coffee
on a continent with no jungle dealt a *blank* — the copies were never placed, the kind was absent
from the map, and the coastline's character was a kind thinner than the ledger said. Coffee was
missing from 11 maps in 15, sugar from 10, spices from 9. The deal now takes a `LuxuryGround` and
refuses any kind the continent cannot seat `luxuryMinCopiesPerContinent` (2) tiles of, redrawing
from the smaller pool. Coffee's own row also lost its `hills` requirement, which was the reason its
ground barely existed (`docs/luxuries.md`, Approximations).

**2. Refusing unhostable deals was not enough: the draw had to lean.** With every kind on the same
`frequency`, a jungle continent draws four kinds out of the twenty that suit it and the three that
*need* it are three tickets in twenty. A kind is now weighted by
`frequency × (continents ÷ continents that can host it) ^ luxuryScarcityBias` (1.5) — a rare host
is worth more than its rarity, which is what it takes for coffee to be a thing that exists. Worst
kind's absence: 11 maps in 15 → 4.

**3. Luxuries had no budget.** Bonus and strategic resources are scattered to a density; luxuries
were *dealt*, and the total that fell out was a function of how many continents the coastline
happened to make. Measured: 65–90 tiles per 1000 land, a 38% swing in how much of the trading half
of the game exists, decided by nothing a designer chose. `luxuryPer1000LandTiles` (75) with a ±10%
tolerance is the third budget, settled **after** the guarantees by a dice-free trim-or-top-up
(`settleLuxuryDensity`) that deepens thin seams first, never trims below the seam floor, and never
touches a copy inside a start's guarantee radius. Now 74.7–81.2.

**4. "About `continentTargetTiles`" was doing no work.** The carve cut each landmass into
`round(tiles ÷ target)` plain Voronoi cells, and the cell sizes were whatever the coastline handed
out: 19 to 477 tiles against a target of 170, with a third of them outside a 0.6×–1.5× band. A
continent that means a different amount of ground every time it is used is not a unit. Cells are
now grown under a **size quota** (`growBalancedCells`, capacity `ceil(tiles ÷ pieces)`), which makes
the band arithmetic rather than hope — a component of `x · target` tiles yields pieces of at most
`x ÷ round(x) · target`, worst case 1.5 — and `minContinentTiles` rose to `0.6 · target` (102) to be
the floor under `x`. Peninsula tips that a farthest-point seed strands behind a neck are folded into
a neighbour, or folded-and-recut when the fold alone would break the ceiling
(`mergeSmallContinents`). Measured: 91–254 tiles, 98% inside the band. The stated remainder is a
cell with no land border, or none it can join without breaking the ceiling at the other end.

**And more sporadic hills.** `elevation.hillShare` 0.20 → 0.28. At 0.20 the flank band barely
reached past the ranges, so hills were foothills and almost nothing else and the composite hexes a
player reads as variety were a rounding error. The extra band is spent furthest from the crests,
which is where the standalone chains are: hills 322 → 451 a standard map, of which standalone (no
mountain neighbour) 205 → 296; hill-and-forest 51 → 65; hill-and-jungle 9 → 12.
`mountainShare` is untouched at 0.05 and the foothill guarantee is unaffected (a wider band can
only help it). The terrain-hash fixtures in `test/resources.test.ts` were re-measured for this and
this only — the relief *field* did not move, so elevation, moisture, rivers and coastlines are
bit-identical.

**Not touched, and why.** `moisture.jungleShare` stays where it is. More jungle would have helped
the three jungle luxuries directly, but the jungle share of the equatorial band is a ratified number
with a test band of its own, and the feature-aware deal fixes the complaint without spending it.

---

## Entry XVII — The modifier doctrine (RATIFIED 2026-08-24)

How every bonus in the game composes, forever. Audit new mechanics against this the way
Entry I's commitments are audited.

1. **Flats first.** All +X contributions sum into the base (they are breakdown lines; the
   total is the fold — rule 5).
2. **Percents stack additively WITHIN their stage.** +10% production and +15% production in
   the same city = +25%, never 1.10 × 1.15. No source is privileged inside a stage.
3. **Two stages, multiplicative across them.** City-scoped percents (buildings, local luxury
   signatures, category bonuses) apply to the city's flats; empire/global percents (meter
   tiers, empire-wide luxury percents, future wonder/card globals) apply AFTER, on the
   city-modified result: `(base + flats) × (1 + Σ city%) × (1 + Σ global%)`, floored once at
   the very end. A +10% global on top of a +10% city bonus is worth 11 points of base — a
   global modifier scales with how well-built the empire's cities are.
4. **The stage is defined by where the effect APPLIES, not where it is held.** Coral's
   "+20% science in each coastal city" is city-stage even though the seam is one tile;
   a happiness tier's "+10% science" is global-stage even though it lands on every city.
   **Clarified (user, 2026-08-24): every luxury percent phrased "+X% in cities" — whether
   all-cities or coastal-scoped — is CITY-stage.** With today's content the global stage
   contains only the meter tiers; it grows only by deliberate, sparing addition (rule 5).
5. **Global percents are used SPARINGLY** — meters, and a handful of late, run-defining
   effects. City percents are the default shape for content.
6. Every stage's sum is a labelled line in the breakdown it modifies (rule 5): the reader
   sees flats, the city multiplier, the global multiplier, in that order.

**The table as classified (rule 4, with the 2026-08-24 clarification applied).** City stage:
the barracks' +10% toward units, marble's +15% toward buildings and salt's +10% toward units
(a `productionBonus` is city-stage at either scope — it is a share of *this town's* hammers
behind *this* build), and every `percentYields` row — gems' gold, salt's food, silk's and dyes'
culture, coral's science and whales' production. Global stage: the happiness tier (science,
culture), the authority tier (production; production + science + culture in deficit) — and
nothing else in the game today.

Status: **BUILT (2026-08-24).** `src/sim/modifiers.ts` is the whole of the arithmetic —
`foldStages` / `withStage` / `applyStages` — and `cityStageSums` (`cities.ts`) is the one
evaluator that classifies a city's modifiers into the two figures; `cityYields` multiplies by
them and nothing else in the simulation multiplies a yield by a percentage. Applied in whole
percentage points with a single division (`base × (100+c) × (100+e) / 10000`) so that
"floored once at the very end" is exact rather than nearly so: the float form
`base × (1 + p/100)` floors 100 hammers at +15% to 114. The city panel prints the two stages
as their own lines with their sums, in the order they apply. Measured drift against the
scripted pacing empire: **nil** — ages close 34 / 66 / 106 before and after, with every city,
building, pool and claimed tile identical, because the two stages differ only where both are
non-empty and the global stage is thin before Æra III. Boundary and channel separation are
pinned in `test/modifiers.test.ts`, alongside Entry XVIII.5's immunity — the two doctrines are
asserted against each other in one file.

---

## Entry XVIII — Windfall settlement (RATIFIED 2026-08-24)

**Any one-time flat grant settles its bucket the moment it lands.** A chop that covers the
front of the build queue completes it that instant; a flat science boon that covers the
researching tech finishes it that instant; a future culture windfall that crosses the draft
threshold triggers the draft. In every case: overflow carries by exactly the phase's own
rule, and the player is prompted to re-aim (choose the next production / research / card).

The commitments:
1. **One completion routine per bucket**, used by both the end-of-turn phase and windfall
   settlement — extracted, never duplicated. Spawn conventions, overflow, announcement:
   one implementation or the two paths will drift.
2. **Recurring per-turn income still settles in phases.** The turn pipeline remains the
   game's rhythm; windfalls are the sanctioned exception because the player is present and
   acting — the moment of the gift is the moment of the payoff. Anything that pays every
   turn is not a windfall.
3. Each windfall path registers as a **sanctioned mid-turn mutation** in the CLAUDE.md
   stale-yields trap (`setLockedTiles` was the first; chop completion is the second;
   future boons join the list, never bypass it).
4. Prompting is by announce line + the existing End Turn blockers; a screen auto-opens
   only if it is already the open subject.

5. **Windfalls are modifier-immune (for now, user 2026-08-24).** A one-time grant pays its
   printed number exactly — no city percents, no meter tiers, no Entry XVII staging. The
   20⚙ chop is 20⚙ in every city of every empire. (Revisit only as a deliberate ledger
   amendment; if some future windfall should scale, that is a property of that windfall,
   never a default.)

Few one-time grants exist today (chop). Cards, events, ruins, and Great People will mint
many — they all inherit this behavior by calling the settlement helper, not by reimplementing it.

**Built 2026-08-24 (production bucket).** `advanceProduction` is now a sweep of
`settleProduction(state, city)` (`src/sim/cities.ts`), which is the one completion routine:
spawn tile, escalation ladder, overflow, queue pop. Its pure half is `planProduction(state,
city, hammers?)` — the whole of "would the front item complete, at what price" asked of any
basket, which is also what the worker sheet's "completes Granary!" preview reads through
`productionSettledBy`. The mid-turn entry point is `settleProductionWindfall`, which adds the
re-assignment a sanctioned mid-turn mutation owes the open panel (commitment 3; the register
lives in CLAUDE.md's stale-yields trap). `applyChopFeature` banks the timber and calls it.

Edge conventions settled while building it, all of them "match the phase, and say so":
a unit finished mid-turn is born through `createUnit` like any other, so it has **full
movement and can act on the turn the chop paid for it**; a settler completion climbs
`Player.settlersBuilt` at the instant of completion exactly as the phase does, so the next
settler in the empire is dearer immediately; overflow is whatever the basket keeps after the
cost is subtracted; and a queue left **empty** by a settlement forces nothing — the End Turn
blocker asks for the next production, and the interface says
"⚒ Granary completed in Uruk — choose the next work."

The seam for the next bucket is deliberate and unbuilt: a science boon wants
`settleResearch` / `settleResearchWindfall` around `advanceResearch`, in the same three
shapes (plan · settle · windfall wrapper). Not written today, because a settlement routine
with no windfall to serve is a guess about what the windfall will need.

## Entry XIX — Mid-turn yield coherence (RATIFIED 2026-08-24, **built** 2026-08-24)

One doctrine, arrived at from three directions, all of them the same complaint: *the game
told me a number that was not true yet.*

### A. An unrevealed resource pays nothing

`requiresTech` on a resource row used to be a display rule. The argument for that was
recorded in `isResourceVisible`: hiding a yield the citizens were already collecting would
be a lie the city panel has to keep telling. **The ratified reading is that the number was
the lie.** A player who cannot see why a hill is worth three hammers cannot plan around it,
and "the tile got better the moment you learnt what was on it" is the sentence a discovery
is supposed to earn — it is also what Civ does.

So the gate now binds three readings through one implementation (`resourceIsVisibleTo`):
the **label** (`visibleResourceAt`), **access** (`openedResource`, gated since the luxury
pass), and the **yield** — `explainTileYield` simply omits the resource line for a context
whose techs lack the gate. Nothing is stored, no flag is set, no event fires: the reveal is
derived every time the yield is asked, so the turn Bronze Working lands the hammer appears
in the breakdown, in the citizen's score, in the city panel and in the top bar together.

The exemption is deliberate and narrow: a **context-less** evaluation stays omniscient —
"what could this ground ever pay", which is what mapgen's start scorer wants during
generation, when no player exists to have a technology. The rule for every other call site
is one line, and it is written into the `yieldContextFor` register: **an owned tile is
always evaluated with its owner's context.**

Two resources are gated today (horses · Husbandry, iron · Bronze Working), so the blast
radius is small — which is exactly why this was the right moment to fix the doctrine rather
than the rule for iron.

**The props follow.** A diorama prop the seat cannot name is the same leak one plane down,
and it used to be a documented v1 tradeoff (culling per seat would fork the board cache and
re-bake it on a technology). It is now `RevealView` (`src/render3d/reveal3d.ts`), fog's
sibling: the board bakes every prop lit, hands over which instances they are
(`BuiltBoard.resourceCells`), and a per-frame pass writes only where the answer flipped —
per-instance writes, never a rebuild, which is Entry XI's constraint held one bit further.
That bit is its own (`veil`/`unveil`, `instances.ts`), because a veil is per seat and lifts
while suppression is universal and permanent; folding them together would have meant
researching Bronze Working un-ploughed every farm in the empire. Marker, prop and yield
therefore appear on one turn, from one question.

### B. Improvements pay instantly

A farm changed the tile's yield the instant it was built and the *derived* state a panel
reads — which citizen sits where — waited for the end of the turn, so the food arrived one
End Turn after the work did. Pillage had the mirror of it, owed to the victim. Both now
refresh on the spot, in the **mechanism** rather than in the reducer, so an AI laying an
improvement gets it without having to remember.

### C. The register became a helper

Entry XVIII's commitment 3 said each mid-turn path "registers as a sanctioned mutation".
Three hand-rolled copies later, that is a list of places somebody will forget. There is now
**one helper**, `refreshCityDerived(state, city)` (with `refreshTileDerived(state, tile)`
for the mutations whose subject is a hex — asking the *ground* who to tell is what makes a
pillage refresh the victim rather than the raider), and the register is its docblock:
`setLockedTiles`, `purchaseTileAt`, `settleProductionWindfall`, `buildImprovementAt`,
`pillageAt`, `chopFeatureAt`, `foundCityAt`. A new mid-turn yield mutation calls the helper
and adds itself to the list.

The helper is deliberately *not* a "recompute everything": yields are computed on read, and
the one piece of derived state that is stored is the citizen assignment. So it is one call,
one city, no allocation — and safe for the same reason every hand-rolled version was safe,
that assignment is idempotent and derived and the phase reaches the same answer next turn.

`assignCitizens` consequently has exactly two callers in the simulation — `collectYields`
and the helper — and `test/sim/cities.test.ts` asserts that **by reading the source**. A
source-level assertion is a weak thing to defend a doctrine with and it is there anyway,
for the one failure the behavioural tests cannot see: a seventh mutation hand-rolling its
own refresh, which would work, pass everything, and quietly end the claim.

## Entry XX — Barbarians and discoveries (playable.md item 3, **built** 2026-08-24)

Two features in one pass because they are the same feature read twice: *the map has
things on it that are not yours*. One of them rewards walking into it and one of them
punishes not watching it, and both are the reason a scout is worth building.

### A. The wild is a seat

**Barbarians are a `Player`, appended last, flagged `barbarian: true.`** Every rule in
this simulation is written in terms of a player — combat asks whose unit it is, stacking
asks whose category is on the hex, visibility keeps a grid per player id,
`attackTargetAt` compares owner ids. Ownerless barbarians would have meant a second
answer to each of those, which is what rule 5 forbids one grade up. So the wild is a
player and the **exclusions are written down once** instead of a special case being
written into a dozen rules.

Appended *after* the opening rosters are seated, so `player id === index` still holds
(the CLAUDE.md trap) and every real seat keeps the id it would have had in a game with
no barbarians at all — asserted, unit for unit, in `test/sim/barbarians.test.ts`.

The audit of every `for (player of players)` loop, which is the actual deliverable here:

| loop | wild in? | why |
| --- | --- | --- |
| `allTurnsEnded` | yes | its flag is raised, so nothing ever waits for it |
| `clearTurnEnded` | yes, with a clause | `eliminated \|\| barbarian` — it joins the eliminated on the right-hand side of the one line that owns turn flags |
| `updateElimination` | **no**, both ways | never marked out (it holds nothing between camps), never counted (a solo game would otherwise be won the moment the last raider fell) |
| `advanceResearch` | **no** | the wild does not learn; it inherits (`barbarianTier`) |
| `collectYields`, `expandBorders` | yes, no-op | it owns no cities, so both are empty sweeps rather than exceptions |
| meters, blockers, seat cycling | **no** | all interface, all asked of `realPlayers` |
| combat, movement, stacking, fog | **yes** | these are the rules it exists to be inside |

`realPlayers(state)` is the one register for "who counts". A second filter written by
hand somewhere is how a solo game starts declaring victory over an empty steppe.

**It is a world option, off by default.** `GameConfig.barbarians` lives in the config
because the config *is* every input the world was made from and a save is `{config, log}`.
It defaults off so that a fixture, an inspection page or a pacing measurement gets the
world it always had; `main.ts` sets it on every real game. A flag anywhere else would
mean two games with the same config replaying to different states.

### B. Camps, and where they may stand

Camps are **state, not board** (`GameState.camps`), which is the one place this pass
parts company with the discoveries: a `Tile.discovery` is generation output that play
consumes, while a camp is founded mid-game and has a history (when it appeared, which is
what its muster cadence counts from). Putting it on the tile would have made the map
carry state the seed never produced.

The ratified reading of "out of sight" is **not currently visible to any real empire, and
outside all territory** — not "never explored". Terra Incognita alone would have stopped
camps appearing once the map had been walked, which is precisely when the pressure is
supposed to start. Currently-visible is Civ's rule and it is the whole feeling: *the
country you stopped patrolling is the country that turns.* Plus three distances (city,
start, other camps) and the plain impossibilities — a hex nothing can walk to, one
somebody is standing on, one with a town, a camp or a ruin already on it.

Nothing here is a probability. Camps arrive on a **cadence** with a cap beside it, so a
run of bad luck cannot bury an empire; the one die is *which* legal hex, drawn uniformly
from a list built in tile-index order.

### C. What comes out: the median rule, as implemented

> Sort the real seats that are still in the game by `(techsResearched.length, id)`
> ascending, take index `floor((n − 1) / 2)` — the **lower** middle on an even roster —
> and field the strongest `modelClass: 'melee'` unit that seat's **own technologies**
> unlock.

Step four is the part worth being explicit about: a median *count* says how many nodes the
middle empire holds and nothing about which, and "the strongest unit unlocked by six
unspecified technologies" is not a question the tech table can answer. Taking the median
seat's actual tree makes the rule one sentence — *the wild fights like the middle of the
pack* — and a pure function of the state. The lower median is the same instinct: the wild
follows the pack, it does not lead it. A runaway empire therefore does not arm its own
enemies.

**The wild ignores resource gating and respects the tech tier.** It fields swordsmen with
no iron, because it is not an empire and has no supply — it is what is already out there.
That is the one asymmetry in the whole feature and it is written down in three places
because it looks like a bug in six months.

**The horse exception**: a camp within `horsesRadius` of a herd musters horsemen from
`horsemanFromTurn` (30). The turn gate **is** the tier check for that one type — the wild
never researches Husbandry, and a herd on the steppe is not waiting for anybody's
permission. What the gate is really for is the opening: without it, whether an empire
meets cavalry on turn ten is decided by where a camp happened to land, which is a coin
flip rather than a difficulty.

### D. Where the phase sits, and why

`barbarians` goes into `END_OF_TURN_PHASES` between `healCities` and `healUnits`.

- *After the cities' phases*, so a raid is resolved against the world the turn produced —
  a town that grew this turn defends at its new size.
- *Before `healUnits`*, and this is the load-bearing half. That phase asks one question of
  every unit — did it spend anything this turn? — and a raider that marched or fought must
  answer no, exactly as a player's unit does. Put it after `resetMovement` instead and the
  raid would spend an allowance that had just been refilled, making a barbarian's movement
  free and its wounds permanent.
- *Before `refreshVisibility`*, necessarily: raiders moved.

Inside the phase: found, snapshot, muster, raid. The snapshot is why a band mustered this
turn does not also march in it.

Behaviour is v1 and knows it: march at the nearest thing within `aggressionRadius` that
the wild can **actually see** (its own fog grid, not omniscience), attack through
`applyCombat` when adjacent, wander near the nearest camp otherwise. The wander re-draws
each turn, so an idle band jitters rather than patrolling — deterministic, and enough to
move the piece until the wild is worth designing properly.

**+2 for everybody else.** Every real empire is `combatBonus` stronger attacking *or*
defending against the wild, as a labelled line in `planCombat` (`CombatBonusLine`) that
the forecast card prints — one evaluator, so the preview a player read is the fight the
raider gets. Flat points rather than a percentage, and added *after* the multipliers,
because the damage curve is exponential in the *difference* of two strengths: +2 is worth
the same multiplier against a warrior as against a longswordsman, which is exactly what
"barbarians are a nuisance, not a scaling threat" wants.

**v1 barbarians do not capture cities.** They pillage by standing on things and they beat
a town down to 1 hit point, where it stays and heals. What a barbarian *does* with a city
is a real design decision and it is deferred rather than guessed at.

### E. Discoveries, and the first draft

Ruins and villages are scattered as the **last** pass of generation, after the resources'
dice, so adding them moved not one wheat field on any map in the game. Off every possible
start by `minDistanceFromStart`, spaced from each other, on walkable land with no resource
on it. The counts are a *ceiling*, not a promise — spacing thins them, which is
`assignOases`' bargain.

**Any unit claims one by walking onto it**, through `arriveOnTile` — the one
implementation of "a unit came to rest on a hex, and the hex had something on it", called
from the two places a position changes (the march, and a melee winner's advance). Gating
the claim on scouts would have made it a rule to remember rather than a thing to discover.

**This is the first consumer of Entry XV's draft shape**, and Statecraft inherits it
rather than inventing a second one:

1. **The offer is a draw, taken once**, from `state.rng`, at the instant of the claim, and
   stored on the player. Not rolled when a card opens: under simultaneous turns two seats
   open screens at different moments, and an offer generated on sight would make the deal
   a function of when somebody looked at a monitor.
2. **The pick is a command naming an index**, never an id — an index can only ever refer to
   something the player was actually dealt.
3. **Both halves are in the log**, so a replay deals the same three cards and takes the
   same one.
4. **One at a time.** A player already holding an unanswered offer does not claim a second,
   and the site is *left standing* rather than consumed — overwriting would silently
   destroy a boon already promised.
5. There is no reroll and no decline. Magister's Dice will add a reroll as *its own*
   command, which is the right shape for a thing you spend something on.

An unanswered offer is the **first** End Turn blocker there is, ahead of the idle unit.
The order in that file is the cost of forgetting, and forgetting a ruin is the dearest of
the four: a turn of movement and a turn of hammers are recoverable, a boon nobody can give
you again is not.

### F. Every boon is a windfall, and the research seam is closed

The pool is eight rows, flavour-split by a **weight per kind** rather than two disjoint
tables — ruins lean relics and knowledge, villages lean people and provisions, and no row
is exclusive to one site.

| row | pays | leans |
| --- | --- | --- |
| Grain cache | +20🌾 to the nearest owned city | village |
| Masons' hoard | +20⚙ to the nearest owned city | ruins |
| Star tablets | +15🔬 | ruins |
| Forgotten hymns | +15🎭 | ruins |
| Relics of the old faith | +15🕯 | ruins |
| A guide offers service | a free Scout, on the site | village |
| Laborers join you | a free Worker, on the site | village |
| Traders' hoard | +25🪙 | either |

Every one is an **Entry XVIII windfall**: the printed number, paid exactly,
**modifier-immune** (no city percentages, no meter tiers, no XVII staging — XVIII.5,
extended to the ruins and pinned), settled the instant it lands through the bucket's own
`settle…Windfall`.

Which closed **two** of Entry XVIII's open buckets, both because a windfall finally
existed to serve them:

- **`settleResearch` / `settleResearchWindfall`** (`tech.ts`), the seam XVIII explicitly
  left unbuilt. `advanceResearch` is now a sweep of it, in the same three shapes
  production has (plan · settle · windfall wrapper). Star tablets that cover the current
  technology finish it *that instant*, keep the overflow, clear the aim — and the existing
  research blocker then asks what to learn next, which is the whole of "announce +
  choose-next" with no new prompt invented. The windfall wrapper is the **widest** of the
  three: a technology is an empire-wide fact about what ground is worth (a renewal, a
  resource reveal — Entry XIX.A), so it re-seats every city of that empire rather than one.
- **`settleGrowth` / `settleGrowthWindfall`** (`cities.ts`). A grain cache that fills the
  basket grows the town *now*. `growCities` keeps only the half a windfall can never
  cause: starvation is the absence of a settlement, not a settlement.

Culture and faith are banked and nothing else, and that is a **stated absence** rather
than a gap: nothing in the game spends either pool yet, and a completion routine with
nothing to complete is exactly the guess XVIII refused to make about research. When the
Statecraft meter lands, the forgotten hymns become its first windfall.

**The camp bounty is two windfalls** (user, 2026-08-24): `campClearGold` to the treasury
and `campClearFood` to the clearer's **nearest owned city** — the same
`nearestOwnedCity` the grain cache lands by, asked once and shared, because they are the
same sentence and two implementations of it would be two answers on a tie. An empire with
**no cities at all** collects the gold and forfeits the food, with the interface saying so
in the announce line; inventing a destination would be worse than saying there is none.

### G. Open flags for review

- **The gold faucet.** Two rows in this pass mint gold — Traders' hoard (+25🪙) and the
  camp bounty (+25🪙) — and they are the first new sources since playable.md item 2 flagged
  that there is barely a faucet at all. They are *deliberately* on the list to argue about:
  a ruin and a camp are both one-time, unrepeatable and geographic, which is the wrong
  shape for an economy's baseline even if it is the right shape for an adventure. Roads,
  trade routes and markets remain the real answer.
- Barbarian city capture, above.
- ~~The wander behaviour~~ — closed by H below, which replaced it with three roles.

### H. Raiding: hunt, steal, escort home (user, 2026-08-24)

The wander was on the open-flags list from the day it landed. What replaced it is **three
roles and no memory**.

**A unit's role is derived from the world every turn, never stored.** That is the load-bearing
decision, and it is a determinism argument before it is a tidiness one. A `role` field on
`Unit` would be *intent*: it would have to be serialised (every save grows a field), kept in
step with a world that moves under it (a thief whose prey died, an escort whose cargo was
rescued), and — fatally — **written by a phase**, so a replay would reproduce it only for as
long as every write was reproduced in the same order. Derived intent has none of those
problems by construction: `barbarianRoles` is a pure function of the board, a replay
recomputes rather than trusts, and a hand-edited save cannot carry an opinion the world does
not support. The two facts a memory would have carried are answered by geometry instead —
*home* is the **nearest camp** (which on the turn after a theft is the captor's own camp, and
is the better answer when it is not, because that camp may have burnt out), and *the captor*
is **whichever soldier is standing nearest the cargo** (which on the turn after a theft is
exactly the thief, because it is standing next to it and nobody else is).

| role | what it does | when |
| --- | --- | --- |
| **cargo** | walks itself to the nearest camp at civilian speed, then sits on it | any barbarian-held civilian |
| **escort** | keeps station on or beside its cargo, and does not fight at all | nearest soldier within `escortRadius` of a cargo not yet home |
| **thief** | closes on one unguarded civilian and strikes it | nearest unspoken-for soldier within `theftRadius` of visible prey |
| **raider** | v1: nearest visible thing in `aggressionRadius`, attack adjacent, else wander | everybody else |

Priority is **escort > theft > raid**, expressed as the order the three derivation passes run
in rather than as a rule anybody has to remember. A soldier walking a prisoner home ignores a
scout that wanders past: a band that dropped its cargo every time something shinier appeared
would never get one home, which is the entire behaviour. Both exclusivity rules — *one escort
per cargo, one thief per prey* — fall out of deriving the whole table **once**, off the board
before anybody has moved, which is the same argument the `veterans` snapshot makes.

**Theft is not a mechanism.** A thief walks to the doorstep and attacks through `applyCombat`
like any raider; the published tile-targeting priority (military, then city, then civilian)
does the rest. So "barbarians steal workers" and "a warrior captures a settler" are one rule,
and **a guarded civilian is safe from the wild for precisely the reason it is safe from an
empire**: the blow hits the guard. Nothing was added to make that true. The wild guards its
own loot the same way, by standing *on* the cargo's hex when it can.

**One implementation of a change of hands**, `captureUnit` in `state.ts`, beside `createUnit`
and `removeUnit` because it is the third fact of that kind. New owner, no movement left, no
orders (they were the previous owner's plan), out of any trench; everything else kept,
`chargesLeft` above all. It redraws both empires' fog, so its callers cost nothing.

Two things were **extended** rather than invented, and both were forced by the same hole: a
prisoner parked on a camp used to make that camp unclearable, because the hex that has to be
arrived on could not be arrived on.

1. **A melee winner may advance onto a tile still holding enemy civilians** (`canAdvanceOnto`
   — `canStopOn` with "no foreign unit" weakened to "nothing left that can fight"). Civ V's
   rule. It also makes "kill the escort, take the worker" one act instead of two turns of
   hitting an empty hex.
2. **The ground and the people on it change hands together**, in `arriveOnTile` — the one
   implementation of "a unit came to rest on a hex and the hex had something on it", which
   now resolves *camp, then prisoners, then the site*: the fight, the freeing, the search.
   Being a rule about the **hex** rather than about the fight is what makes the two rescue
   paths one mechanic: attack a lone cargo and it is captured; storm the camp it sits on and
   it is freed with the bounty, announced as **"Your laborers are freed!"**.

**A stolen settler needs no rule.** It is a unit in barbarian hands like any other, it will
never found (barbarians do not found), and it is cargo — the other side of the "barbarians do
not capture cities" decision above, which still stands. Cargo also does not count toward
`maxUnitsPerCamp`: loot is not a garrison, or an empire could suppress a camp's musters by
leaving it a worker to keep.

**The wild carries no standing orders.** Every walk in the sweep ends with the unit's `path`
deleted — stored routes are stored intent, `resetMovement` would resume them a few phases
later (a free second march on a refilled allowance), and they would be an opinion formed on a
board two turns stale.

**The phase does not move.** Checked rather than assumed: cargo walks, escorts walk, thieves
attack, so every argument in D is about the same two facts (an allowance that must not have
been refilled, a board that must be the one the turn produced) and none of them changed.

New tunables, both in `rules.barbarians`: `theftRadius` (5 — deliberately shorter than
`aggressionRadius`; a band goes out of its way for a worker it can nearly touch, not across a
province, and 0 switches thieving off) and `escortRadius` (2 — one hex looser than the station
the escort actually keeps, so a guard that fell a step behind a two-move worker is not
reassigned). Targeting still asks the wild's **own** fog through `isVisibleTo`: a civilian in
country the wild has never seen is safe, and that is pinned.

### I. Both faucets retuned: too sparse, too slow (user, 2026-08-25)

The complaint was measured before it was fixed. On standard, solo: 14 discovery sites on the
whole map with the nearest one 7-16 hexes from the capital, and exactly one camp founded by
turn 12 (first at 8, one per 5 turns, capping at 8 around turn 43). A scout could walk most of
an opening without finding anything, and the wild took most of the early game to become a
nuisance at all.

**Camps: three cadence numbers moved.** `firstCampTurn` 8→6, `campEveryTurns` 5→3, `maxCamps`
8→12. Nothing about *where* a camp may stand changed — same three distances, same "not
currently visible to any real empire" rule (Entry XX.B) — only how often the founding sweep
fires and how high it may go. Re-measured: **3 camps by turn 12** (was 1), **9 by turn 30**
(cadence gives nine founding attempts by then against a cap of 12 — near the ceiling on a
standard map with room for it).

**Discoveries: not a rate, a re-architecture.** Retuning `ruinsPerThousandLand` alone could
not fix "the nearest ruin is sixteen hexes off" — a flat rate per 1000 land tiles is a
property of the *whole map*, and the whole map is not what a scout walks. The fix borrows the
shape `dealContinentLuxuries` already proved (Entry XVI, `resources.ts`): carve
the map into continents and deal *each one* its own site count, so a region reads as having
ruins nearby rather than the map having a budget somewhere in it. `sitesPerContinent` (a
`{min, max}` range, drawn per continent exactly as `luxuryCopiesPerKind` is), `ruinShare`
(the 55/45 split, rounded per continent) replace the retired per-thousand pair — see
`data/discoveries.json`'s own `retired` block, `MapgenConfig.retired`'s convention borrowed
into a second file.

Per-continent dealing evens out the *map's* read but says nothing about any *one* start — a
capital at the corner of a large continent can still land far from its own continent's sites.
`ensureStartDiscoveries` closes that the way `ensureStartFood` closes the food guarantee: no
dice, nearest-first, and a floor (`fairness.minWithinRadius` within `fairness.radius`) rather
than a hope. Its one hard rule, stated because a first draft broke it: **the top-up never
relaxes `minDistanceFromStart` against any possible start**, including ones other than the one
it is filling in for. A first pass that let the top-up hunt outside a crowded start's own
band, respecting only *that* start's exclusion, planted a village one hex from a different
candidate start's capital — a turn-one freebie for whichever seat that start belonged to in a
smaller real roster. The fix draws the top-up only from the same globally-filtered candidate
list the deal itself used; what relaxes instead is the spacing rule between sites
(`ensureStartFood`'s bargain exactly) and, failing even that, the floor itself for a
low-priority candidate start whose whole reach sits inside closer starts' exclusion zones —
rare (under 5% of (seed × start) samples measured), and it keeps whatever the deal already
gave it rather than buying its floor with someone else's capital ring.

**Measured against the acceptance metric** (a player opening with two scouts should expect
several discoveries early on, operationalized as sites within 12 hexes of a start — a proxy
for two-scout reach over ~25 turns): over 10 seeds × every possible start on standard, the
median is 6, and fewer than 5% of starts fall under the 3-site floor. `minDistanceFromStart`
holds with zero exceptions across the same sample. Settled at `sitesPerContinent: {7, 8}`,
`ruinShare: 0.55` — roughly 52 sites per standard map, spread across its ~8 carved continents.

---

## Entry XXI — Sleep, the hand-over, and one roster (**built** 2026-08-25)

Three things that landed together because they are three answers to the same complaint:
*the interface is talking over itself.*

### 1. End Turn is three beats, not one instant

The bug was reported twice, in the same words both times: **"queued moves seem to happen at
the start of the next turn rather than when I press End Turn."** The simulation was never
wrong. Stored paths walk during `resetMovement`, `animateResolvedMarches` captures the routes
before the dispatch and slides them on the resolving click, and that is exactly Civ. What was
wrong was that one click did four things in one synchronous breath:

1. resolved the turn,
2. started the marches,
3. dropped the "Your *turn*" card in the middle of the board for 1600ms,
4. glided the camera 620ms to the first idle piece — which, after a march that finished with
   movement to spare, is *the piece that had just marched*.

A one-hex march is 160ms. It ran under a card, behind a moving camera, aimed at its own
destination. Nobody has ever seen it. The player's report was a perfectly accurate description
of what the screen did.

**The fix is sequencing, and nothing else.** Sim order is untouched, no phase moved, the state
is final before anything below happens:

> click → **marches** (still camera, unobstructed board) → **card** → *a beat* → **camera** to
> the first piece still awaiting orders.

How long beat one lasts is the renderer's own answer — `MapView.pendingAnimationMs()`, the
longest remaining walk in flight — not a guess and not a constant. At `0` (reduced motion, a
march the fog refused, no standing orders, a frozen 2D pipeline that does not implement the
optional method) the whole thing collapses to the synchronous sequence it always was.

The one structural consequence: **"the turn resolved" and "the turn is handed over" are two
moments and now two callbacks.** The autosave belongs to the first — a save must never wait on
an animation — and the card to the second. Folding them back together gives you either a save
held hostage to a walk or a card over walking pieces, and both have shipped.

### 2. Sleep: the civilian's fortify

`Unit.sleeping`, the `sleepUnit` command, and the `wakeSleepers` phase. Presence is the state,
like `path`, `fortifiedTurns` and `chargesLeft`. It buys exactly one thing — a fourth clause on
`isIdleUnit` — and changes no rule: a sleeper defends, is captured, is seen and heals exactly
as it did awake.

Three decisions worth writing down.

**There is no wake verb.** *Any* accepted command that names a sleeping unit wakes it, and that
is enforced in **one** place (`orderedUnitId` in `commands.ts`, read after a successful
dispatch) rather than as a `wakeUnit` line in each of the eight handlers that name a unit. The
`createUnit` argument exactly: one place a command reaches a piece, one place that can forget.
`sleepUnit` is the single excused arm, which is why it is a reader rather than "does the
command have a `unitId`". "Never mind, wake up" is spelled `cancelOrder` — the verb that
already means that — which is why that handler now accepts a sleeping unit with no path.

**`wakeSleepers` is as late as the pipeline allows**: after `barbarians` (the commonest reason
an enemy is suddenly beside a worker) and, more importantly, after `resetMovement`, because a
rival column resumes its standing order *inside* the resolution and may finish its march next
to the sleeper. A wake asked earlier is a wake asked of a board that has not stopped moving. It
still sits above `refreshVisibility`, which stays last and unconditional: clearing a flag moves
no piece. Sight is the **unit's own** (`sightOf` + `los.ts`), never the empire's — a worker
behind a ridge sleeps through a column on the other side of it, and an empire-wide test would
wake every worker in the realm because a scout on the far coast saw a galley.

**Sleep and Skip are a pair, and the pair is the point.** Both silence a unit; they differ in
whose fact it is. Skip is a fact about a *conversation* — this client asked, this player said
not now — so it lives as an argument to `firstBlocker`, lasts one turn, and is in no save. Sleep
is a fact about the *piece* — logged, serialised, visible to an AI, and ended by the simulation
itself. So skip is an argument and sleep is a clause, and neither folds into the other.

Deferred, deliberately: **no zzz mark on the board badge.** It is not cheap in the badge idiom
— a new appended atlas cell set, a rasteriser branch, a geometry marker array, an
`addSleepBadge`, and `sleeping` in `signUnits` — for a garnish on a state whose entire purpose
is to stop drawing the player's attention. The unit sheet says "Sleeping 💤" in two places.

### 3. One roster, and the audit that found four

The wild is a `Player` (Entry XX) so that combat, stacking, movement and fog need no second
implementation, and `realPlayers` is the register for who counts. The simulation obeyed that
from the start; the **interface never had**. A solo game drew a "Barbarians ✓" chip in the top
bar, strung the Abacus a scoring rod for the weather, and would have named the wild in the
status line's waiting list — while the hot-seat seat cycle re-wrote `!player.barbarian` by hand,
which is the right answer written in the wrong place.

All four now ask `realPlayers`. The rule is precise rather than blanket, and the distinction is
the whole of it: **`state.players[someId]` is an id lookup** — "who is this" — and a barbarian
unit's owner has a name and a colour like anybody else; **anything else is a sweep**, and a
sweep is the question `realPlayers` answers. `test/ui/seatRoster.test.ts` reads the sources and
fails on the fifth surface, because a behavioural test would only ever have caught one of the
four and the failure mode of a missed roster is a chip nobody notices for a milestone. A future
seat kind that should not be listed — a city-state — is one filter's edit, not a second audit.

## Entry XXII — The city centre, and a card that shows its work (**built** 2026-08-25)

Two changes to the same sentence — *what is this hex worth, and why* — one in the rules and one
on the surface that quotes them.

### 1. A centre pays its base, and inherits the ground per voice

**Ratified by the user on 2026-08-25, ripple accepted in advance.** The centre tile is worked
for free and is never a citizen slot, so what it pays is a rule rather than an assignment. The
rule is now:

> `centre[voice] = max(baseCityYields[voice], ground[voice])`, across all six voices.

with `baseCityYields` re-based from **3🌾/2⚙ to 2🌾/2⚙**. A town on a 3🌾/2🪙 seam reads
3🌾/2⚙/2🪙: the food and the gold are the ground's, the production is the town's own.

The old food floor of three handed every capital a point of food no ground had earned, which
made a flat start and a river start the same start for the first dozen turns. Two is the
citizen's own upkeep (`foodPerCitizen`), so a size-1 town now feeds itself exactly and grows on
what it *works*.

**The measured ripple**, on the scripted empire the age-close test plays (`test/sim/tech.test.ts`):

| | before | after |
|---|---|---|
| ages close (I / II / III) | 40 / 78 / 118 | **41 / 80 / 120** |
| opening production (median, band) | 3, 2..4 | **3, 2..4** — unchanged |
| opening food (median) | 5 | **4** |

The anticipated stretch of the scout's three-turn anchor **did not happen**, and the reason is
worth keeping: only the *food* floor moved. A capital's opening production is the centre's two
hammers plus one worked tile, so the scout at nine hammers is still three turns of three and the
opening kit needed no reprice. What the re-base costs is growth — one turn of Age I and two of
the later two ages, inside bands that already tolerated a handful of turns of map roll, so the
bands stay where they are rather than being re-centred on noise.

The rule is a **breakdown**, per rule 5: `explainCentreYield` returns `City centre` (the base,
as a `base` entry) and, where the ground beats it, `Inherited · <names>` (the excess, as an
`add`). `base + max(ground − base, 0)` is `max(base, ground)` per voice, so the fold *is* the
rule and `centreYield` is one line. The inherited line names the ground that earned it — every
`add` paying into an inherited voice, plus the effective terrain line when the terrain by itself
beats the base — because "inherited" with no subject is the one thing a player cannot act on.

### 2. The hover card itemizes what it totals

`explainTileYield` has returned an ordered contribution list since M7 and the hover card was
still printing only the fold of it. It now prints both: the total, and under it one row per
contribution — `2🌾 Grassland`, `+1⚙ Mine`, `+1🌾 Feudalism` — drawn in the yield marks through
the established printer (`yieldFigureNodes`), with the two algebras visible in the typography:
a `base`/`override` is written plain because it *replaces*, an `add` is signed because it sums,
and a ground line a later override took over stays on the card struck through, because "forest,
replaced by hills" is the sentence the entry was written for. On a hex a town stands on the card
itemizes the **centre's** list instead, since that is what the hex actually pays.

The card also gains an **occupant** row — what is *planted* here, as opposed to what has been
built on it or who is walking over it — and each kind keeps the fog rule its own kind keeps
everywhere else: a city in sight or remembered from a sighting (named through `cityDisplayName`,
so a remembered capital still gets a true star, and marked `· remembered` rather than quoted as
current), a camp **only while watched** (an occupation, not ground), a ruin or a village on any
explored hex (ground, exactly as `sites3d.ts` draws it). The mapgen page asks the same describer
omniscient, the liberty its resource lens already takes.

---

## Entry XV.b — Orders and Doctrines (RATIFIED 2026-08-25, **built** 2026-08-26)

The card pool splits into two classes; everything else in Entry XV stands.

- **Orders** — the staples: slottable in government slots, entry-sealed, amnesty on
  adoption, drafted on the culture meter (3 new + 1 upgrade). The posture layer; swap
  skill expression lives here. Tradeoff cards live here too, BECAUSE they are revocable.
- **Doctrines** — the benders: **permanent, occupy no slot, and are acquired only at
  government adoption** — each adoption offers a draft of 3 from that tier's doctrine pool,
  pick 1. Three per game (tiers 3/7/15): the run's irreversible identity beats, landing on
  the same day as the slot jump and the seal amnesty — adoption day is THE chapter break.
  Drawback doctrines are sanctioned (a knowing once-per-era choice is the roguelike's
  curse-with-upside); drawback ORDERS stay mild since they churn.
- Magister's Dice reroll doctrine offers like any other draft. Doctrine pools are small
  (~5–7 per tier), drawn without replacement within a game.
- Why not full permanence (considered, rejected): it would collapse cards into masteries,
  delete the seal/amnesty machinery and the swap skill expression, and unbound the power
  budget that slot scarcity provides. The split keeps both registers the design has wanted.

**Built 2026-08-26.** The split is real in the state and nowhere else: `PlayerStatecraft`
carries `orders` (with levels) and `slots` (with seals) for the staples, and a flat
`doctrines` list for the benders. They share **one** `CardEffect` union and one evaluator —
they differ in how they are *acquired and held*, and not at all in what they can say, so
the day a signature and an Order want the same clause there is one clause.

Adoption is one function (`adoptGovernmentAt`) because it is one decision: the slots array
is **rebuilt** to the new layout rather than resized (the new government's slot 2 is not the
old one's, so carrying anything across by index would seal the wrong card in the wrong kind
of slot — the amnesty is therefore total by construction), and the Doctrine draft is drawn
*at that instant* rather than at the next resolution, because a draw taken later would be a
draw from a moved generator.

Three slot types shipped, not four. The ratified table types every Order M/E/W, and a
*diplomatic* slot with no diplomacy to spend it on would be a slot a player can only fill
with a wildcard card. It joins the union the day the system it names exists.

The interface honours the naming bible (Entry X) exactly: the screen says **Orders** and
**Doctrines** and never "policy", "civic" or "card" at the player. The Doctrine and
government offers wear the *same* offer card in a heavier gilt frame rather than a second
component — same bones, same keyboard contract, one CSS rule about what gilt means.

---

## Entry XXIII — Netcode architecture: lockstep with a referee (recorded 2026-08-26, for M14)

The game is entirely client-side today and stays that way for single-player. For
multiplayer, nothing migrates: **the server runs the same `src/sim` unchanged** (pure TS,
no DOM/clock/Math.random — the CLAUDE.md purity rule is what makes this possible; protect it).

- **Clients** run the sim locally: own commands validate instantly, no round trip.
- **The server** (a separate small Web Service; the client stays a Static Site) does three
  things: **lobby** (match seats), **order** (commands into the one canonical log —
  contention by log order, the existing rule), **relay**. It also **replays** the log through
  the same sim, which makes it authoritative for free: illegal commands from a hacked client
  are refused by its own `applyCommand`; periodic client state hashes vs. the server's
  detect desync and the server wins; reconnection = replay the log. AI seats run server-side
  in multiplayer.
- **Known limitation, accepted**: every client holds full state, so hidden information
  (fog) is peekable by a determined cheater. A filtered-view authoritative server would be a
  sim redesign; friends-scale play does not justify it (Civ V's own lockstep has the same
  property). Revisit only if the product becomes ranked/public.
- Hosting: two services from one repo when the time comes (`render.yaml`: static client +
  `server/` web service); the client can move to any CDN independently.

**Ruling (user, 2026-08-26): M14 builds the hidden-information design, not lockstep.**
The server is authoritative with **per-seat filtered views**: `viewFor(state, seat)` projects a
redacted `GameState` (unexplored tiles blanked, unseen units absent, rivals' private fields
zeroed, remembered versions of mutable tile fields the way `citySightings` remembers cities),
so every one-evaluator UI function runs unchanged against the view. Clients stop simulating;
single-player runs the full sim in a Web Worker projecting the local seat's view, so the
projection boundary is exercised in every game. Lockstep is retired as the plan. Until M14
the client deploys as a static site; nothing before M14 changes this cost.

---

## Entry XXIV — The turn-35 playtest pass (user, 2026-08-26, **built** 2026-08-26)

Ten findings off one playthrough. Most were one-line rules; four were architectural and are
written down here because each opened a seam the codebase did not have.

### 1. The right button belongs to the game

The context-menu suppression was on the **viewport**, and that was the bug. Right-drag pans
with the pointer *captured* by the viewport, but `contextmenu` is a mouse event and is
hit-tested normally — so every pan that came to rest over a banner, a price tag, a toast, a
popover or the unit sheet fired the browser's Back/Forward menu on a surface that had never
heard of the rule. The condition is a fact about the **page** ("is a board on screen at
all"), so it moved to a document-level listener in `main.ts` gated on `landingEl.hidden`,
which is already the single answer to that question. Two exemptions: the landing keeps the
whole native menu (it is a form, not a board), and over a live game `wantsNativeContextMenu`
keeps it for a text field and nothing else.

### 2. An upgrade always changes something

`floor(1 × 1.5)` is `1`. The upgrade multiplier therefore swallowed itself on every card
whose printed figure was a single point — **nineteen of the sixty-five Orders**, each of
them offerable as the draft's upgrade option and changing nothing at all. The fix is one
rule in the evaluator rather than nineteen data edits: `scaleByLevel` advances the magnitude
by **at least one whole point per level**. A figure of 2 or more is untouched, so nothing
that already upgraded upgrades differently.

The rule cannot reach a card that prints no number, and three do — The Loose Rein, The
Common Purse, The Standing Levy, all pure switches. Those carry `"upgradable": false` and
the upgrade draw filters them out of the bag rather than re-rolling a bad draw (the draw
still spends exactly one roll, over a smaller bag). The flag is a **declaration**, and the
suite asserts it in both directions so it cannot be used to paper over a row that simply
needed a bigger number. The Loose Rein is the interesting one: its only figure is a *seal
length*, which the generic multiplier would deepen the wrong way (2 turns becoming 3).

### 3. Faith is a building's sixth voice

The shrine and the temple moved off culture onto faith, which the building table had no
field for — `BuildingDef` gained an **optional** `faith` (the one optional voice, because
requiring it would have meant `"faith": 0` on twenty rows with nothing to do with it), and
`explainBuildingYield` reads it into the breakdown `cityYields` folds. `buildingYieldDelta`
was folding five voices by hand and now folds `CITY_YIELD_KEYS`, which is the drift a
hand-written fold invites.

**Measured, not tuned.** The scripted empire's draft cadence went from 6.6 to **7.0 turns
per draft** early and the three governments from 24 / 47 / 97 to **24 / 49 / 109**. The
first five drafts are *unmoved* — the shrine and the temple are not standing that early —
and the drift starts at draft 6 and compounds, because an escalating cost turns a constant
loss of income into a widening gap. Monument and amphitheater are untouched and are now the
whole of a town's built culture; a city can no longer reach ten culture on buildings alone,
which is what made `territory.test.ts`'s writ fixture need a seam.

### 4. A seam claims its own hex

`improvementErrorAt` gained the rule the board always implied: a resource that some
improvement opens (`improvementForResource`, the table's own inverse) will take **that**
improvement and no other. A farm on a deer forest is refused by name — "Wheat wants a farm".

**Honey is the row that made it urgent**, and the finding "wow honey is broken" was exactly
this. Honey is the only luxury whose home is bare flat grassland, which is precisely where a
farm goes; measured, a farm on honey paid `5F/0P/1G` and held **no luxury at all**
(happiness 8), against the plantation's `5F/0P/2G` and the whole signature (happiness 13.1).
The farm even looked *right* — one more food than bare ground — so nothing on screen told
the player they had thrown the luxury away. Two bounds, both deliberate: **revealed only**
(`chopErrorAt`'s rule — a refusal naming an unresearched resource leaks the map through an
error message), and a bonus resource nothing improves stays free. It is not a trap door
either: an improvement replaces whatever stands on the tile, so a farm laid over an
unrevealed seam is recoverable the day the seam is named.

### 5. The farm learned to drink

`freshwaterTerrain` on the farm's row is the **one seam in the improvement AND**, and it is
a *union* rather than a fifth filter: it widens `validTerrain` on ground that can drink
instead of adding a clause every other row would then have to opt out of. Read off the row
as one sentence — "grassland and plains, and any flat desert, tundra or snow that can
drink". `requiresHills` is still asked separately, which is what makes it "any **flat**
watered tile". `floodplain` joined `validFeatures`; it is fresh by construction
(`deriveFloodplains` only ever writes one onto ground already touching a river or an oasis),
so the two clauses agree without a second rule. The refusals split accordingly: dry ground
the row will never accept, against ground it would accept if it were watered.

### 6. The forecast's headline is a fold

The combat card printed damage without ever printing the two numbers the damage comes from.
`CombatForecast` gained `attackerLines` / `defenderLines` — `CombatStrengthLine`, hard rule 5
applied to violence — and the two strengths are now the **fold** of those lists
(`foldCombatStrength`), never a second computation. A percentage names itself in the label
and pays in points: "terrain +25%" carries the 2 strength it was worth *on this unit*, which
is the only reading under which the list folds at all and also the more useful one. Terrain,
fortification, the ford and every flat bonus moved out of the card's pooled footnote and
under the side they actually help — the pooled version was the same sentence twice, with the
reasons mixed so a reader could not tell which side each one helped.

### 7. A resolution reports what it did

`TurnReport` is `CommandResult.arrivals`' argument one scale up, and it exists because the
wild does all of its raiding **inside** the end-of-turn pipeline: by the time `endTurn`
returns the raider has been paid, the worker has changed hands, and the board says nothing
about who hit whom — a diff of two boards cannot name an attacker at all. So the pipeline is
handed a sink, `barbarianTurn` writes into it, and `applyEndTurn` passes it out. `attack`
reports its own blow on the same channel, so a seat struck by *another empire* during a
simultaneous turn hears about it by the same rule. Nothing is stored on `GameState`: none of
it is a fact about the world, it is a fact about the **transition**, and a transition is over.

`TurnPhase.run` takes the report as a **second parameter**, so every phase with nothing to
say is assignable unchanged. `CombatOutcome` gained the four facts a per-seat notice needs —
both owners *as the board stood before the blow* (so a captured worker still reports the
empire that lost it, which is the empire the news is for), the hex, and the defender's ids.
`reportRaids` in `controls.ts` announces one line per blow this seat was on the wrong end of,
with a pan action, naming barbarian and player attackers alike.

### 8. Every instance a piece is made of belongs to that piece's slot list

The health-bar report — "with three units adjacent, a fight modifies the third unit's bar" —
was not about combat at all. `addHpBar` was the **one** part of a piece whose instances were
never pushed into the unit's `slots`, which is the list `hide`/`restore` move. A piece that
walked (or died) therefore left its bar lit over the hex it had left, and on a board where
three units stand adjacent a bar hanging over an empty hex reads as belonging to whichever
piece is standing beside it. Reproduced first (18 bar instances drawn where 12 were
expected), then fixed by pushing both handles. The rule it is a case of is stated on the
method: a visual added there without recording its handle is a visual `hide` cannot take off
the board.

### 9. The wild, louder

`campEveryTurns` 3→2, `maxCamps` 12→16, `unitEveryTurns` 4→3. Nothing about *where* a camp
may stand changed — same three distances, same "not currently visible to any real empire"
rule (Entry XX.B). Re-measured over five seeds, solo, nobody moving: **4 camps and 3 units by
turn 12** (was 3 and 1), **13 camps and 20–21 units by turn 30** (was 9 and 13). The one
casualty was a fixture: `QUIET_TURN` was a literal 20, which the new cadence turned into a
*founding* turn, and a test about a cargo with nowhere to go started walking it home to a
camp that had just appeared under it. It is derived off `rules.json` now, like every other
number in that file.

## Entry XXV — Zone of control (**built** 2026-08-26)

Civ V's rule, adopted whole, because the movement model already had everywhere to put it and
nowhere else to put it.

### The rule as ratified

> A unit that begins a step **adjacent to an enemy combat unit or an enemy city**, and moves
> to another tile **that same piece is also adjacent to**, completes the step and then has
> **no movement left**.

Every clause is load-bearing:

- **The step completes.** A zone of control is a *price*, never a wall. The mover ends its
  turn on the hex it stepped onto — which is why the walker checks `canStopOn` for a locked
  step exactly as it does for a step that ran the allowance out.
- **That same piece.** Leaving one enemy's shadow for another's is a march, not a slide. Two
  spearmen a hex apart do not chain their tolls; a *line* of them does, which is what makes a
  line worth forming.
- **Into contact and out of contact are free.** You may always walk up to an enemy, and you
  may always walk away. What costs is walking *around*.
- **Combat units only.** A settler holds nothing, by the same `isCombatant` that decides who
  may be attacked and who is captured instead.
- **Any other owner, the wild included.** There is no diplomacy yet, so foreign is hostile —
  the reading `hasForeignUnit` already gives transit. The barbarian seat is a `Player`, so it
  binds and is bound with no special case (Entry XX's whole point).
- **Enemy cities exert it.** A town is a garrison a march cannot kill.
- **Nobody is exempt.** `ignoresTerrainCost` is about the *ground*: a scout pays a wooded hill
  one point and is held by a picket exactly as a swordsman is.

### Why it went into the evaluator

Entry VIII's one-evaluator rule, applied to a price that a lone tile cannot answer. `moveCost`
is a fact about a hex; `tileMoveCost` made it a fact about a hex *and a mover*; a zone of
control is a fact about a hex, a mover **and the hex the step is taken from**. So `stepCost(map,
from, to, def, field)` is now THE evaluator and `tileMoveCost` is the ground's own half of it.

Four readers, and the reason they are counted: `findPath`, `reachableTiles`,
`advanceAlongPath` (the walk the reducer commits) and `pathTurns` (the interface's "~N
turns"). The fourth was the one that had already drifted — the unit sheet kept its own copy of
the movement loop, which is exactly the second implementation a new rule leaves silently
wrong. It is one line now.

### The arithmetic, and why the overlay cannot lie

"Spends everything left" is a fact about a *turn*, so the evaluator's callers had to be able to
say where a turn ends. `MovePurse` is two numbers — points left in the turn the search starts
in, and `fullMovement` for every turn after — and `turnBoundary(spent, purse)` is the running
total at which the current turn ends. A locked step lands **exactly** on that boundary
(`stepArrival`), and the overspend a short purse would have forgiven is forgiven here too.

That single choice is what keeps the highlight honest, and the proof is short enough to write
down. Inside `reachableTiles` the purse is one turn, so a lock lands exactly on the allowance
and the sweep's existing "arriving with nothing left ends the move" clause stops the frontier
there — no second rule about zones of control anywhere in the sweep. In `findPath` the same
arithmetic runs with a multi-turn purse. Since a step's ground price depends only on its
*destination*, a route through a lock reaches any tile's predecessor at the turn boundary,
which is the largest first-turn value there is — so a route that slides mid-march is never
cheaper than one that does not, and a tile the sweep highlighted is always routed to by a march
this turn's points actually complete. `test/sim/zoc.test.ts` asserts it as a property over
twenty-five random rough boards rather than trusting the paragraph.

The lock is also never a zero-cost edge (`turnBoundary(spent) > spent` for every input), so
both searches still settle a node the first time they pop it and the A* heuristic stays
admissible. Nothing about the module's determinism changed.

### What a player sees

The reachable overlay draws it: the hex alongside a picket is highlighted and priced at the
whole allowance, and the hex beyond it is not drawn at all. The pathfinder routes *around* a
picket whenever going around is cheaper, which is the behaviour that turns the rule from a
punishment into a tactic. The unit sheet says "Held by an enemy's zone of control" for a piece
standing in contact — a warning about the sidestep, since walking away is still free — and the
"~N turns" line grows by one when a standing order has to slide.

One pre-existing bug fell out of unifying that estimate: it counted *refills* and floored at
one, so a march needing a refill and a march needing none both read "~1 turns". It counts turn
changes until arrival now (`turns + 1`), which is what the sentence always claimed.

### What did not change

Nothing about blocking (an enemy hex is still a wall for transit, a friendly hex still blocks
only stopping), nothing about combat, and nothing about the barbarians beyond obeying it —
they march by `findPath` into `advanceAlongPath` like everybody else and needed no line of
their own. A route that was clear when it was approved and has an enemy beside it now stops
where the rule says and **keeps its order**, resuming next turn: a stop, not an abandonment,
which is the third clause of `movement.ts`'s "stopping short".

## Entry XXVI — A queue is never idle (build sinks, **built** 2026-08-26)

The playtest finding, in the user's words: *"early game runs out of things to build, units
too cheap vs tech pace."* Two complaints, one cause. A town that has built its granary and
its monument and cannot yet afford a settler has nothing left to do with its hammers, so it
builds warriors — and warriors were cheap enough that "build warriors" was never a real
decision. The queue had no floor and the roster had no price.

Three things land together because they are the same finding read three ways: give the
queue a floor, give the roster a price, and give Age I two more things worth wanting.

### 1. A project is a queue row that never leaves

**Tithes** (Calendar, 20⚙ → 5🪙) and **Scholarship** (Letters, 20⚙ → 5🔬). Both are
`QueueItem`'s third kind, both are data rows in `data/buildings.json`'s `projects` table,
and both work by *not being removed*.

That is the whole mechanism, and every other property falls out of it. `settleProduction`
subtracts the cost, banks the conversion, and returns before the splice — so the row is
still standing there tomorrow morning asking for twenty more. `turnsToBuild` needed no
project clause, because for a repeatable item "how long until this completes" and "how
often does this pay" are the same question. Overflow needed no rule, because whatever the
basket keeps is next turn's down payment. And `advanceProduction`'s existing "at most one
item per city per turn" is the rate limiter, for free.

Three things it deliberately returns *before*, each because it did not finish anything:
the splice, the overflow doubling (The Common Purse is about a completed thing's
remainder; doubling a conversion's change every turn is a mint), and the completion riders
(Master Masons' culture on a wall would otherwise pay every fourth turn for ever).

**The payout is not a windfall, and the reason is arithmetic rather than taste.** Entry
XVIII's windfalls are one-time grants that pay a printed figure with no staging; a project
looks like one and is not. The hammers a project consumes were *already staged* on their
way into the basket — Entry XVII's city percentages, then the meter tiers, floored once,
in `collectYields` — so a payout that then rode the modifier pipeline would be charging one
conversion two multiplications. A project is the city's own exchange rate on hammers it has
already earned: 20⚙ in, 5🪙 out, and the number on the row is the number the treasury
receives. Nothing modifies it, including a barracks: a project is not a `ProductionCategory`
and `productionModifiers` returns an empty list for one, which is what "a barracks minting
money" would otherwise be.

`ProjectPayout` names three banks — gold, science, faith — and culture is deliberately
absent. Those three accumulate and are read where they lie; `Player.culturePool` is a
*basket* whose filling is a draft, so a project that paid culture would be a second path
into Entry XV's bucket. The day one is wanted it joins by calling `settleCultureWindfall`,
which is the register in CLAUDE.md doing its job.

**Where a new row goes.** A project never leaves the queue, so the panel's old "append"
would have put every future warrior behind a row that is never reached. `insertionIndex`
puts a newly-pressed row in front of the *trailing run* of projects — a project read as the
standing order a city falls back to, which is what the player meant by both presses and
needs no second control to say so. The reducer refuses the same project twice for the
matching reason: a second copy of Tithes is not a second conversion, it is a row that can
never be reached and a queue that has silently stopped below it.

### 2. The roster is priced in the money of its own age

Age I is up ~40% with a mounted premium — warrior 5→7, worker 8→10, spearman and archer
6→8, horseman 8→12, war chariot 11→17, chariot archer 9→14. The **scout is deliberately
unmoved at 9⚙**: three turns at the median capital's 3⚙ is what an opening scout is *for*,
and it is the one price the opening is balanced against. The settler is unchanged; its
escalation ladder already does that work.

The later rosters are handled by a band rather than by hand. Beaker costs climb roughly
nine-fold between Age I and Age III (16🔬 → 380🔬) while hammer prices climbed about twice,
so a late empire's science pace was buying it units that were, relative to everything else
it could spend hammers on, nearly free. `unitCostAgeMultiplier` (`[1, 1.5, 2]`, in
`rules.json`) multiplies a unit by the age of the technology that unlocks it — read off the
tree, never stored on the unit row, because "when does this belong" is already written down
once in `unlocks`.

It is applied as a **labelled line**, not as a multiplication at the point of sale.
`explainUnitCost` is the ordered list a price is the fold of — *roster's price · the ladder
· the age band · the empire's law* — and `unitProductionCost` is `foldUnitCost` of it. Each
line carries the difference it makes to the running figure, so the list sums to the price
however the intermediate roundings fall. Hard rule 5, said about a price rather than a
yield.

**Measured** (seed 4242, the scripted pacing empire playing the military line, at turn 40):
**8 units before, 6 after** — a 25% cut, with the city count, the technology count (9) and
the map identical. The building-first empire measured 4 units either side: it is hammer-bound
on settlers and granaries rather than on the roster, so the price change is invisible to it.
That asymmetry is the point — the pass taxes the player who was spamming units, not the one
who was building. Opening timings across 21 seeds: median capital 3⚙ (band 2–4), scout still
3 turns, warrior 2→3, worker 3→4. `test/sim/buildSinks.test.ts` pins all of it.

### 3. Two Age I building sinks, declared generically

**Palisade** (Stonecraft, 30⚙, +5 city defense) and **Funeral Games** (Bronzeworking, 35⚙,
+3 happiness). Both were already proposed in `docs/ages.md` as *nodes*; both ship as
*buildings*, which is cheaper and truer — a wall is what stone is for, and the games are
held for the war dead on the node that hands over the spearman.

Neither is a case anywhere. `BuildingDef` gained two fields — `happiness` and `cityStat` —
and `cityStat` is deliberately `CardCityStatEffect`'s shape minus its scope, because a wall
a card raises and a wall a town *built* are the same fact about the same city. Both are read
by one new evaluator, `buildingEffects.ts`, which is `resourceEffects.ts`'s bargain one
scale down: the table says what a building *is*, and one module says what an empire's
buildings are *worth*. Its two answers are lists, never numbers — the happiness ledger gains
"Uruk · Funeral Games +3" and the combat forecast gains "Palisade +5" beside the walls a
Doctrine raised. A second happiness building, or a watchtower that adds sight, is a data
row.

Funeral Games is the first building in the game to touch a meter's *supply* side. It reads
per **town** rather than per type, unlike the monument's writ: a monument's capacity is an
empire-wide fact and reads honestly as a count, while a happiness building is a thing
standing in a named place a player may be about to lose.

### What this does not do

It does not make gold *spendable* in any new way — projects are a faucet, and the sinks that
were open before this pass (tile purchase) are the sinks that are open after it. It does not
touch what ground is worth: no tile yield, no centre yield, no improvement moved. And it does
not answer unit upkeep, which is still unbuilt and is the other half of "units are too cheap".

---

## Entry XXVII — The water milestone (user, 2026-08-26, **built** 2026-08-26)

Three changes that only make sense together: **Sailing**, **civilian embarkation**, and
**fishing boats**. Each one alone is inert — an improvement on water nobody can reach is a
row nobody can build, and a worker at sea with nothing to do there is a novelty — so they
shipped as one milestone, and the ledger records them as one.

The sea existed before this. Coast has been *workable* terrain since M6, mapgen has been
seeding six resources on it (fish and crabs, and the four sea luxuries the ratified table
added), and every one of those luxuries had both tiers written, tested and **inert**,
because `openedResource` asks for the improvement that opens a seam and no improvement
touched water. `docs/luxuries.md` said so in a section headed "placed, specified, and
inert", and `test/sim/improvements.test.ts` asserted the hole as "water iff unimproved" so
that the day the row landed it would fail in both directions at once. It did.

### 1. Embarkation is a term in the one step evaluator

`stepCost` (`pathfind.ts`) has taken `from`, `to`, the mover and the board since Entry XXV.
It now takes a **`MoveProfile`** rather than a bare `UnitDef`, and the profile carries two
things: the mover's row, and whether it `embarks`. The second is a fact about the unit's
*empire* as much as about the unit — a civilian whose owner holds the embark ability — and
it is hoisted once per sweep beside `zocField` for exactly `zocField`'s reason.

The rule itself is four lines of `tileMoveCost`, and the two abilities it reads sit on
opposite sides of impassability, which is the whole of what each one means. `embarks`
**widens**: water's `moveCost` is `null`, so a piece that may swim pays
`movement.embarkCost` for water whose terrain row is `embarkable`. `ignoresTerrainCost`
**narrows a price that already exists**, strictly after, so no ability makes a mountain
walkable and a scout gets nothing here (it is a combat unit and never embarks at all).

Everything downstream inherits it and nothing else was touched: `findPath`,
`reachableTiles`, `advanceAlongPath` and `pathTurns` are the four readers, and
`canTransit` / `canStopOn` take an optional profile so the `moveUnit` command, the
highlight and the walk cannot disagree about one hex.

**Three decisions, and each is stated rather than discovered:**

- **Coast only.** `embarkable` is a *terrain flag*, not "water and not ocean" written into
  the evaluator, and only the coast carries it. The deep ocean stays impassable to
  everything until there are naval units; a lake likewise. The day a galley opens the
  ocean, the change is one field on one row.
- **Civilians only** (`isCivilian` — the same predicate combat, capture and stacking ask,
  so a settler and a future augur inherit the sea with no second list). A combat unit at
  sea would be a navy, and there is none.
- **One movement point**, `movement.embarkCost`, a number of its own rather than
  `minStepCost` reused. The floor is a guarantee about the *search* — no free edges, so a
  node settles the first time it is popped — while this is the price of a design decision.
  They are equal in v1 and are allowed to stop being.

**The quirk, stated rather than patched.** An embarked civilian is **unreachable**. Nothing
can attack it, because everything that could is a combat unit and no combat unit embarks;
nothing can capture it, because `arriveOnTile` needs somebody to arrive. A settler parked
one hex offshore is safe from the wild, and `test/sim/water.test.ts` asserts that by
running the barbarian AI at it rather than by asserting a predicate. This is a real hole
in the fiction and it closes when naval units land — which is the same event that opens the
ocean. It is accepted for v1 because the alternative is a rule ("civilians drown after N
turns at sea", "may not end a turn on water") that would be deleted on that same day.

`foundingErrorAt` needed nothing: it asks `isPassable`, which deliberately still means
**land**. That function's callers — a city site, a spawn tile, a barbarian's target — every
one of them means dry ground, and widening it would have put a town on the sea. "May *this*
piece go there" is `canTransit`, which takes the piece.

### 2. Fishing boats are an improvement like any other

`requiresTech: sailing`, one charge, on a coastal seam, built by a worker standing on the
water exactly as a farm is built by a worker standing in a field. **+1🌾.** It is the only
row that names both a terrain and a resource, and the terrain clause is deliberate: a
worker can only stand on water it could embark onto, and coast is all of that today.

The claim worth recording is what it took: **nothing**. `openedResource` did not change.
`resourceEffects.ts` did not change. The meters did not change. Six sea resources went from
"in nobody's hands by either path" to ordinary holdings because a row appeared in
`improvements.json`, and every signature written for them fired on its own. Note which
clause opens them, because it is not the third — a city still cannot be founded on water,
so a sea seam is always held by the *improvement* standing on it.

Two ratified lines that had been deferred *on* fishing boats came live with them, and they
needed a shape: **`improvementYields`**, a bag of yields a held luxury pays on every hex of
the empire's carrying a named improvement. Tyrian's "+1🎵 on fishing boats" and whales'
Æra III "+1⚙ on fishing boats". It is the one luxury shape that pays into the **tile**
chain, so it lands as an ordinary contribution line in `explainTileYield` (hard rule 5) and
the hover card, the citizen's score, the city panel and the banked total learn it from one
place. Empire-scoped like every other signature: a boat in a town nowhere near the murex is
better for it, which is what makes a trade good a trade good.

### 3. The granary pays the water — as a *tile* line

"Water tiles +1🌾 in cities with a granary." The tempting shape was a flat bonus on the
building; the right one is a line on the **hex**, because that is what it is, and because a
lump on the building would have been a number with no explanation on any of the tiles it
came from.

So `BuildingDef` gained **`tileYields`**: a list of `{ on: TileCondition, requiresTech?,
add }`. `TileCondition` was Statecraft's, and it is now shared by all three things that put
yield on a hex — a card's `tileYield`, a building's `tileYields`, a luxury's
`improvementYields` — with **one** predicate, `tileConditionHolds`, answering for all of
them. It gained two arms here: `water` and a *named* `improvement` (where `improved` was
any).

`TileYieldContext` correspondingly stopped having a `cards` field and gained **`lines`**:
one channel, three producers, and `explainTileYield`'s last clause is one loop instead of
three. The empire-scoped producers resolve in `yieldContextFor`; the building lines are a
fact about *one city* and are added by `cityContext`, which is the only place the two
scales meet — and the reason the hover card, which asks the empire's context, cannot see a
granary. A fourth producer joins by appending to that list.

`requiresTech` is on the *line* rather than on the building, so the granary is still an
Earthenware building whose water line waits for Sailing — and it is **Sailing's** card that
announces it (`techGifts` gained a `buildingTileYield` kind for exactly that).

### 4. Abilities are a fourth `unlocks` key

Embarkation is a *rule*, not a thing to make, so what the tree names is the rule's id:
`unlocks.abilities: ["embark"]`, with a sibling `abilities` block in `techs.json` saying
what it is called — `improvements.json`'s `chop` table one file over, and for its reason.
`ABILITY_TECH` inverts it; `techsGrant(techs, ability)` is THE rule (shaped exactly like
`resourceIsVisibleTo`, and for the same cycle-avoidance reason: `pathfind.ts` is downstream
of `cities.ts`, which is downstream of `tech.ts`, so the movement evaluator cannot ask a
research module anything). `hasAbility` is the state-flavoured wrapper for everybody else.
**No rule in the simulation spells a tech id.** Moving embarkation to another node is a
data edit.

The gift surfaces beside the chop clearings under one `ability` kind, because "a thing a
worker may now do" and "a thing an empire may now do" are the same news to a player. A
clearing carries what it `pays`; a verb does not, and presence is the state.

### What was already right

**Item four of the brief needed no code at all.** Coast, ocean and lake all carry
`workable: true`, `isWorkableTile` asks the terrain, and `assignableTiles` asks
`isWorkableTile` — so a coastal town has been claiming and working the sea since M6.
`bestExpansionTile` scores water like anything else. The milestone confirmed it with tests
rather than changing anything.

**The renderer needed one prop and no plumbing.** `improvements3d.ts` is generic over
`IMPROVEMENT_IDS`, `tileTopY` has a height class per terrain, and `placePiece` uses it — so
a fishing boat floats on the coast prism and an embarked civilian stands on it, with no
special art and no special case. The boat is drawn *against* a warship on purpose: a long
low hull with one vertical and a net float beside it, because the day naval units land the
two must not be confusable.

### Measured

The scripted pacing empire's culture ladder **slowed**, and it is worth knowing which of the
three changes did it. Sailing itself costs almost nothing (with the granary's water line
removed the ladder measures within a turn of its old numbers), and the node's *position* in
the file is irrelevant (moving it two places reproduced the slowed ladder turn for turn).
It is the **granary's food on water**: a coastal granary town's citizens move onto the sea —
2🌾1🪙 against bare grassland's 2🌾 — and the hammers they were making on land go with them,
so every culture building lands later and an escalating draft cost turns that into a
widening gap. Governments now land on turns **24 / 52 / 124**, against 24 / 49 / 109, and
the third has slipped past the close of the age it belongs to.

That is a real consequence of a real bonus rather than a regression, and the empire is not
poorer — it is *differently* employed, and this scripted one never revisits a build order to
notice. It is recorded here and in `test/sim/statecraftPacing.test.ts` rather than tuned
away, because the next person to move those numbers should know what moved them. If the
third government arriving after Æra III's close is judged wrong, the lever is the water
line's size, not the draft curve.

## Entry XXVIII — Religion v1: the augur and the pantheon (**built** 2026-08-26)

`docs/religion.md` is the ratified design and this is what shipped of it: **the augur and
pantheon half**. Prophets, founding a religion, founder/follower/enhancer pools, spread,
conversion and the Religious Mandate doctrine are the Age 2–3 pass, exactly as that doc's
scope ruling sequences them. Pantheons are *native and never converted away*, which is
precisely why this half ships alone and needs no spread machinery at all: every belief here
pays in every city its empire owns, always.

### The shape: faith buys an agent, and the agent drafts

Culture drafts Orders directly. Faith does **not** — it buys an **augur**, and the augur is
either *three rites* or *one god*. That single indirection is the whole design, and it is
what makes the system a decision rather than a queue:

- Consecrate **consumes the whole unit whatever charges are left on it**. A player who has
  already spent two rites is giving up much less than one who has spent none, so the
  question is live at every point on the curve.
- The price escalates (`40🕯 + 15🕯` per augur already called, `Player.augursPurchased`), so
  *when* to spend faith on a permanent identity rather than on three good turns is a tempo
  decision against a climbing number.
- Slots are the anti-spam structure: Divination opens two, the High Temple's third is a JSON
  row (`slotsFromTech`), and Consecrate is refused — with the sentence the panel prints —
  once they are full.

### Three shapes, all inherited

Nothing here is a new mechanism. The purchase is `explainUnitCost`'s ordered-lines shape in
a **bank** instead of a basket (`explainPurchaseCost`, currency-agnostic so the M9 gold
purchases are the same transaction). The draft is `drawOrderOffer`'s: dealt from `state.rng`
at the moment the offer opens, stored on the player, spent by a command naming an **index**
— Entry XV's doctrine inherited for the third time. The rite is Entry XVIII's windfall,
settled into its bucket through the same `settle…Windfall` helper a chop and a ruin use.

### Beliefs are sources, not shapes

**`statecraft.ts` is still the only module in the game that reads a `CardEffect`.** A belief
is a `CardDefBase` with an axis; a rite is a `CardDefBase` with a technology and a grant;
both join `liveEffects`' walk as a fourth and fifth source and every reader below folds them
without knowing which class a line came from. `CardId` widened from three classes to five
so a breakdown line still carries one string, and the lookup that spans all five
(`anyCardDef`) lives in `statecraft.ts` rather than in `statecraftData.ts` — because the
import between that file and `religionData.ts` is **type-only in both directions**, which is
what keeps a type cycle from becoming a runtime one.

Where the ratified table asked for something the vocabulary could not say, the vocabulary
grew a **generic** member available to an Order and a Doctrine on the same terms:

| Shape added | What asked for it | What it says |
|---|---|---|
| `CityScope { test: 'hasBuilding' }` | Keeper of the Hearth, The Standing Stones, God of the Forge | "granaries supply +1🕯" is a *city yield in the towns that have a granary* — no new effect kind |
| `CityScope { test: 'all' }` | River Mother's shrines *in the river towns* | one conjunction; deliberately no `any` and no `not` |
| `TileCondition { test: 'terrain' }` | Desert Fathers, Winter Mother | a fact about the ground itself |
| `TileCondition { test: 'resourceKind', yields? }` | Goddess of the Harvest, Lord of the Hoard | "a bonus resource **that feeds you**", read off the resource's own row |
| `TileCondition { test: 'all' }` | wooded tundra; a mine standing on a luxury | the same conjunction one scale down |
| `CountKind 'chargedAugurs'` | Court Augurs | the reason to keep one home |
| `CountKind 'scienceBuildings'` | Omen Reading | read off the building rows, so a retune moves the rite |
| `windfallRider.perAge` | Keeper of the Calendar, Rites of Blood | "×your era" — **one** multiplier however many riders ask, applied after the summed percentages (Entry XVII at this scale) |
| `WindfallOccasion 'rite'` | nothing yet | a rite is unambiguously one of Entry XVIII's moments; a vocabulary that could not name it would have a hole in it |
| `periodicOffer` | Keeper of the Calendar | the one effect whose subject is the **calendar** — read by a phase, absolute `turn % every`, never a counter |

### Timed effects: the new hook, and it is a comparison

A rite's lasting half is a bag of ordinary effects that hangs on a **city** or a **unit**
for a stated number of turns (`TimedEffect` in `state.ts`). The whole subsystem is that type
plus one comparison:

    live  ⟺  state.turn < expiresTurn

**Nothing decrements anything.** That is `SlottedOrder.sealedUntil`'s lesson — the seal that
taught this codebase not to tick — applied to a thing that hangs on a town. `pruneTimedEffects`
is a **broom, not a clock**: every reader compares turns, so an expired effect is already
inert and deleting it changes no outcome whatsoever, which is exactly the property that makes
the phase safe to place anywhere, skip, or run twice. It goes first in the pipeline so the
turn's arithmetic is done over a list with nothing dead in it, and it *deletes* the key when
the list empties so a town whose blessings have run out serialises like one never blessed.

The effects are read by the **same evaluators** a slotted Order's are, and that is the claim
the whole hook rests on: `liveCityEffects` is `liveEffects` plus this city's live rites, and
every city-scoped reader in `statecraft.ts` was moved onto it in one pass. So a timed
percentage joins `cityStageSums`, a timed strength line joins `planCombat`'s list, a timed
`rulePercent` on `borderCulture` joins the borders channel (which is why `cardRulePercent`
grew an optional `city`), and a timed `tileYield` joins `explainTileYield`'s line list as the
**fifth producer** — through `cityContext`, beside the granary's, because both are facts
about *one town* rather than about an empire.

### The five rites, and where each settles

| Rite | Tech | Instant | Lasting |
|---|---|---|---|
| Rite of the Harvest | Divination | +1 population | — |
| Omen Reading | Letters | +15🔬 (`settleResearchWindfall`) | science buildings +1🔬, 20 turns |
| Consecration of the Bounds | Stonecraft | +15🎵 to the **border basket** | +30% border growth, 20 turns |
| Blessing of Arms | Bronzeworking | heals the unit whole | +5 combat, 5 turns |
| Rite of Plenty | Calendar | +25💰 | that city's worked resource tiles +1💰, 20 turns |

Each rite is an `unlocks.abilities` entry on its technology — the key the water pass built
for embarkation, doing exactly the job it was built for: a rite is a *verb*, it has no row in
any other table, and hanging it there means the star chart shows it as a gift the way it
shows embarkation. **The ability id is the rite's id**: one string, one name to get wrong
instead of two.

The Harvest's citizen is the tenth entry in the mid-turn register and the first one that
fills no bucket at all — `settlePopulationWindfall` grants the citizen outright, pays the
growth riders once per point, settles the production bucket (a rider can pay hammers) and
re-seats the town. Pouring enough food into the basket to *force* a growth would have been a
different rule wearing a hat: it would gift the carryover, and the size of the gift would
depend on how hungry the town happened to be.

### One deferral, stated rather than bent

A `percent` rider on the `rite` occasion is **not read**. A percentage scales an occasion's
own figure and a rite has no single figure — it pays a citizen here, beakers there, coin
somewhere else. Rather than pick one voice to be "the" figure and silently ignore the rest,
the arm is left unread and said so on the function. The honest fix, the day a card wants one,
is a marker on the rite's own row naming its headline voice.

Ancestor Worship's second clause was **ratified sideways**: the doc says "+5% culture per
city of 10+ population" (empire-wide); it ships as "+5% culture *in* every city of 10+",
which is one `percentYields` with a `populationAtLeast` scope. The reading is more legible
and needs no parameterised count; it is recorded here rather than in the row.

### Measured

The scripted **pious** empire (`test/sim/religion.test.ts`'s `playFaithful` — three towns, a
shrine in each, Divination first) buys its **first augur on turn 49**, two augurs and two
rites inside ninety turns. `docs/religion.md`'s open numbers predicted "the first augur
~turn 15–20 after Divination"; a shrine-only empire earns ~1🕯 a turn, so forty faith is
nearer thirty-five turns after Divination than fifteen. That is a real consequence of a real
income rather than a regression, and it is recorded rather than tuned away: if the augur is
wanted earlier, the lever is **faith income** (the shrine's rate, a temple, the Procession's
cards at their true scale) rather than the price — cheapening the agent would flatten the
escalation the whole anti-spam structure rests on. The test pins a band, not the number.

### Also in this pass

**Fishing boats pay +1🌾 +1🪙.** The water milestone shipped them at +1🌾 per its brief and
`docs/luxuries.md` recorded the deviation with the note that "the gold is one number in
`improvements.json` on the day it is wanted". This was that day; both annotations are closed,
and **Lord of the Sea** (the 🌊 water belief) rides on top of it with a further +1⚙ +1💰.

**The Religion dock button graduated.** `hudDock.ts` predicted its own seam — "when religion
lands, the seam is exactly this module's `close()`/`isOpen` pair plus the one line in
`main.ts`" — and that is what it cost. The Faith popover's whole content is the first block
of the new parchment sheet, which is deliberately Statecraft's sibling in bones, keyboard
contract and card face: two systems that draft permanent things from a pool must not look
like two different games.

**The augur's visuals are deferred, on purpose.** It wears the worker's sculpt and the
worker's badge (`modelClass: 'worker'`). A distinct silhouette needs a `ModelClass`, a
procedural mini and a vendored SVG cell in the badge atlas, which is an art pass and not a
rules one; the unit sheet, the charge badge (which reads *Rites ✧* rather than *Charges ⚒*
off `UnitDef.consecrates`) and the selection carry the distinction meanwhile.

## Entry XXIX — Purchases, generalised · the playtest pass (**built** 2026-08-26)

Four notes off one playtest, and three of them turned out to be the same note: *the
interface was printing the plumbing.* The augur sat in the production queue greyed, belief
cards wore the designer's axis names as eyebrows, and forty-odd Order clauses read like the
data they were built from ("in every size 5+", "borders keep growing while the writ is torn
is 1"). The fourth, gold purchasing, is M9's last remainder and is the reason the pass is an
entry rather than a fix list.

### The purchase, one transaction wide

`purchaseUnit` became **`purchaseItem { playerId, cityId, item, currency }`** and moved to
`src/sim/purchase.ts`. That is the whole shape change: Entry XXVIII had already written the
transaction currency-agnostic on the argument that "the M9 gold purchases are the same
transaction", and they are, so gold joined it rather than opening a second one beside it.

**Gold buys anything the city could build; faith buys what the roster prices in faith.** The
rule that keeps those apart is one sentence on the data — *a row that names its own bank is
sold out of that bank and no other* — and it is what refuses gold the augur without any
clause in `purchase.ts` knowing what an augur is. Gold's other gates are not re-derived
either: they are `buildError`'s, asked through `buildError` itself, so the technology, the
improved strategic resource and "this is bought, not built" are one implementation with the
queue. Two gates a queue asks that `buildError` does not — a building already standing, a
city too small — are asked beside it.

**The price is `explainUnitCost`'s shape in a bank** (rule 5, for a price): an ordered list
of labelled lines whose fold is the figure. For gold the lines are *the item's own
production cost lines*, then the conversion as a line of its own carrying the difference it
makes. That is the load-bearing choice in the whole pass: the settler ladder and the age
band reach a price tag because they are already lines 2 and 3 of the thing being converted,
and nothing had to be taught about either. The rate is `production.goldPerHammer` = **2**,
a rules knob and a first number.

**The full cost, never the remainder.** A town three turns into a granary pays what a town
that has banked nothing pays, and keeps its hammers. Charging for what is left would make
the best moment to buy anything the moment before it would have finished — the moment buying
is worth least — and it would turn every purchase into an arithmetic problem about a bar.

**One completion routine.** `settleProduction` was split: `realiseItem` (`cities.ts`) is the
half that is about the *thing* — the piece born through `createUnit`, the `settlersBuilt`
ladder, the building joining the town, the completion riders — and `settleProduction` keeps
the half that is about the *basket*: the cost subtraction, the overflow and The Common
Purse's doubling of it, the queue splice. A purchase touches none of the second half, and
that is exactly where the line falls. One consequence is deliberate and is a change from
Entry XXVIII: a bought piece now stands where a built one would (`spawnTileFor` — the city
tile, else a neighbour), where the augur used to be placed on the city tile regardless.
Sharing the convention is worth more than that difference, and the only new refusal is the
one production already gives, a town boxed in on every side.

**The authority freeze does not bar a purchase**, and that is a ruling. The freeze is about
*ground* — the accrual, the expansion, `purchaseTile` — because land follows the writ. An
overdrawn empire is short of legitimacy, not of coin, and a freeze on the treasury would be
a second unratified meter effect wearing the first one's name. `test/sim/purchase.test.ts`
asserts the absence by reading the source, because the failure it guards against is somebody
*adding* the clause on the grounds that it looks like the tile purchase.

Schema 19, and the bump is entirely about the **log** rather than about a field: a v18
save's `purchaseUnit` is a command this reducer does not recognise, and `Player.gold` in a
v18 game was a bank with nothing to spend it on.

### The interface half

Every build row in the city panel now carries **"or 60💰"** beside it, greyed with
`purchaseError`'s own sentence — a sibling control rather than a button inside a button,
because those are two different verbs (the next few turns, or the treasury). The augur is
**out of the build list entirely** and has a faith-priced row of its own at the foot of the
units, "Call an augur · 40🕯", shown before Divination with the node named. Its verb is on
the roster row (`purchase.verb`), so a prophet is *called* and a mercenary would be *hired*
without a DOM file learning either name. The caption leads with the treasury the tags are
checked against, which is the Buy Tiles precedent one list up.

That is item 1 of the playtest as well as item 2's interface: a greyed row for something no
city ever builds answered "why can I not build this" with "because it is not built", which
is a category error rather than an answer.

### The axis has no word

A belief's axis is a **designer's thread through the pool** — it exists so that a second god
on the same axis is findable, and so the founder amplifiers of the Age 2–3 pass have
something to read. It was printing as an eyebrow ("the stone", "the hearth") and a tooltip
on every belief card, where it read as *a category the player was choosing between*. Every
player-facing name is gone; the accent and the glyph stay, and `AXIS_MARK` is now a glyph
and nothing else, so there is nowhere left for a name to be printed from. The eyebrow says
"a god", which is the true answer to what that line is for.

### Forty clauses of prose

`describeCard` is the only place a card's effect becomes a sentence, and it had been reusing
`scopeNote` — the **label** on a breakdown line, which is free to be a fragment — as the
words inside a sentence. That is where "in every size 5+", "in every no fresh water" and
"in every Stone/Marble" came from. Scopes and tile conditions are now *built* rather than
looked up: each contributes an adjective or a qualifier, and the composite merges them, so
"fresh water + shrine" is "every city on fresh water with a Shrine" and "tundra tile +
forest tile" is "every tundra forest tile".

The rest of the audit, in one list, because every one of them is the same failure at a
different size — a shape printed as itself rather than as what it means:

- A **meter rule** that is a *switch* (`value: 1`, because the shape has no boolean) printed
  "… is 1" after a sentence that was already complete.
- A **helping of one** printed its 1 and took the plural: "per 1 adjacent friendly units".
- A **`countScaled` cap** is on the *count*, and printed as one: "(at most 4)" beside "+2
  production per garrisoned combat unit" meant +8, and every ratified row states such caps
  as the payout. It now prints as the payout — and Garrison State's data was **wrong**, not
  its prose: `max: 4` against `amount: 2` paid double what its own text promised. Fixed to
  `max: 2`.
- A **payout to authority** said "authority" where every ratified row says "authority
  capacity" — the difference between raising a ceiling and handing out writ.
- A **founding rider** printed the building's *id*; The Founders' Road only read correctly
  because `monument` happens to be spelled like a word.
- A **duplicate-luxury amplifier** wore a `+`: copies count *at* 30%, not 30 points more.
- **Deferred clauses** printed their annotation tokens — "unlocksBuilding — not built yet",
  "beads — not built yet". Those strings are player-facing and are now prose, in the data.
- A **rite's duration** was not printed at all, so the Religion screen promised Omen
  Reading's science for ever. It is the rite row's own field and had no business inside a
  `CardEffect`; the screen prints it beside the clauses it qualifies.
- The **windfall riders** printed their multiplier before the thing being multiplied ("pays
  in the money of your era", then "grants +15 faith"). The grant leads now.

Ancestor Worship's second clause reads "+5% culture in every city of 10+" against a doc that
says "per city of 10+ population"; that is the recorded sideways ratification of Entry
XXVIII, kept, and the prose now matches the data rather than the other way round.


---

## Entry XXX — Wonders, the framework (**built** 2026-08-27; the list is `docs/wonders.md`)

**Ruling (user, 2026-08-27):** framework first, no list yet — *"only one wonder can exist;
if you're beat to a wonder, refund production as gold, 1× modifier, as there should be some
penalty to missing a wonder."*

**What a wonder is.** A building row with `wonder: true`, unlocked by a tech like any
building, in its own production category `wonder` (so a "+X% toward wonders" line has a
target; nothing supplies one yet), never purchasable. **Its effect is a card**: `effects:
CardEffect[]` in the Statecraft vocabulary, read by `liveEffects` as a fifth source after the
pantheon — asked of the *board* (the holding city's `buildings`), never of the claim, so a
captured wonder pays its captor. `statecraft.ts` stays the only reader of `effect.kind`;
adding a wonder is a JSON row. One placeholder row on Divination exercises every path until
the ratified list replaces it.

**One per world.** `GameState.wonders: WonderClaim[]` in claim order (schema 20), written by
`claimWonder` from `realiseItem` — the shared completion, so a chop or a rite that finishes
a wonder claims it exactly as a turn does. `buildError` refuses a claimed wonder naming the
city and the owner, and a second copy in one empire.

**Being beaten.** Cities settle in founding order; the first to complete claims, and inside
the same phase every other queue in the world loses the row. Hammers are "toward" a wonder
**iff it is the front row** — a city has one basket and it pays for `queue[0]` — and then the
whole basket returns as gold at `wonderRefundGoldPerHammer` (1). The purchase rate is 2💰/⚙,
so a lost wonder returns exactly half of what buying the hammers would have cost: that is
the penalty, and it is a tunable. The refund is a conversion of already-staged hammers, not
an Entry XVIII windfall (a project's argument), and it is announced to the seat.

**On the board.** `CityLook` gains `wonders` (a count, in the fingerprint); one generic
marvel sculpt with a gilt tip stands beside the palace slot until the rows bring their own
(art-pass W3). Every seat is told when a wonder completes, in the chronicle's plain voice.

**Seams left for what follows:** `RealisedItem.wonder` is what the Triumph *A Marvel
Raised* and renown will read; the draft-size evaluator (next) is what The Oracle's row will
use. Known gap: a rite's hammers complete a wonder correctly but carry no toast.


---

## Entry XXXI — Draft size is one fold (**built** 2026-08-27)

**Why now:** great people (docs/great-people.md — John Dee), wonders (docs/wonders.md — The
Oracle, the Leaning Tower) and, the user expects, religion and more all want to say "one
more card in a draft". Built once, generically, before any of them: `explainOfferSize` is a
rule-5 list — the base from `rules.offers` (3 for Orders, Doctrines, beliefs, discoveries;
the Statecraft upgrade face stays one), one line per live `offerRider` from any of
`liveEffects`' five sources, a cap at 5 — and `offerSize` is its fold. Each generator asks
it **when the offer opens** (Entry XV's doctrine), the extra draws append to the same seeded
loop, and a pick names an index as before. The placeholder wonder is The Oracle carrying
`offerRider order +1`, so the wonder → draft path is live end to end. The spread scales for
2–5 cards inside 1280×720 (which also fixed the shipped 3-card draft overflowing there), and
above base the header prints the fold's lines as chips — the player can see *why* the hand
grew. `OfferKind` is open for `'greatPerson'`.
