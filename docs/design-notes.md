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

**Growth curve:** threshold `15 + 8(n−1) + (n−1)^1.65` — exponent steepened from Civ V's 1.5
(✅ applied to `rules.json` 2026-08-21). Head unchanged (pops 1–8), tall's tail pricier.
Science per pop stays linear; authority gates it instead. Settler cost stays flat (authority
already prices the city; escalating settlers would double-tax).

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
rasterised into a second badge-language atlas (`TileIcons` in `badges3d.ts`), repeated per point to
a cap of four and then collapsed to one glyph and a numeral. The voice colour survived as the
*disc* under each glyph — a thin green stroke on green grass is not legible, and the colour as a
mass is what made the pips readable in the first place.

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
1. **Defined end — the curtain falls.** Game ends when the final age completes (target ~turn
   150–180 standard); highest victory points wins. Knockout victories (conquest; maybe a
   science/culture coup) can end it earlier. Guarantees finishability by construction; very
   board-game, very Theatrum Mundi. VP composition TBD (ages advanced, wonders, cities at end,
   drafted-set bonuses?).
2. **Invert Civ's cost-vs-yield divergence.** Civ V lags: costs grow ~exponentially, yields
   ~linearly → late slog. Ours: late-era costs grow SLOWER than yields, so the endgame
   accelerates into the finale instead of dragging. All exponents in `rules.json`.
   Harness assertion: scripted bots reach the final age by turn ~170 ± band.
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
3. **Two ways to win:** first to threshold N beads → immediate win (early victory through
   excellence, scaled by player count/speed); otherwise most beads at final age close.
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

## Sequencing snapshot (2026-08-21)
Vanilla mechanics first (user decision). M4 = vanilla science tech tree + culture. Then combat,
AI, netcode. Drafting/governments/dice slot in after the vanilla loop proves out. Rivers mapgen
milestone precedes river site bonuses. Everything visual is placeholder to be dialed later.
