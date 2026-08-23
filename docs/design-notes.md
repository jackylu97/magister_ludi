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
`improvesResource` is a second, separate field because the mine is buildable on any hill and is
*also* what opens an iron seam. Two deliberate deviations, both documented in the data accessor:
**fish has no improvement** (the work boat is naval, deferred; fish stays visible and simply
cannot be accessed, and nothing is gated on it), and **salt is quarried rather than mined**,
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
- **M10 Happiness & Authority + site bonuses** — Entry I in full; luxuries live via M7;
  tall/wide harness assertions begin.
- **M11 Wonders + formal Ages + Beads v1** — Entries V/VI: feats, age objectives, age-close
  scoring, threshold + curtain, the Abacus. Victory gets its real shape.
- **M12 Civic drafting + governments + Magister's Dice** — Entry II, last onto a proven base.
- **M13 AI** (meets the finished ruleset once; one-evaluator functions are its brain) →
  **M14 netcode**. Post-AI: promotions/ZOC, events, leader abilities, city-states decision.
Everything visual remains placeholder-to-dial; vanilla-first honored (drafting is the one
non-vanilla system and it lands after the vanilla loop is proven).
