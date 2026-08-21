# WebCiv Design Notes

Living design ledger — argue here before numbers land in `data/*.json`.
(Supersedes the balance-ledger artifact as of 2026-08-21; the artifact is a frozen snapshot.)
Working title candidates: **Magister Ludi** · **Theatrum Mundi**. Design language: `docs/design-specimen.html`.

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

**Scope-creep guard:** the active roadmap stays vanilla-first (M4 science/culture → combat → AI →
netcode). New mechanics land in THIS file first, get sequenced explicitly, and only then get
built. The excitement is a feature; the parking lot is the discipline.

---

## Sequencing snapshot (2026-08-21)
Vanilla mechanics first (user decision). M4 = vanilla science tech tree + culture. Then combat,
AI, netcode. Drafting/governments/dice slot in after the vanilla loop proves out. Rivers mapgen
milestone precedes river site bonuses. Everything visual is placeholder to be dialed later.
