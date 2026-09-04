# The Standing Flags

Every open ruling, deferred half, and live thread in one place — gathered
2026-09-02 after the balance pass (schema 48). Three kinds of thing live here,
in three sections: **A** is decisions only you can make, **B** is rows that
ship deferred-with-prose (built passes' honest holes — each waits on a named
system or ruling), **C** is open threads and playtest questions. Section B is
regenerated from the data rows' own `deferred:` fields (they are the source;
this page is the reading order). Cross-references name the design-notes entry
where the story lives.

## A. Awaiting your ruling

### Playtest nerf batch — ruled 2026-09-03 (turn-75 report: 320🌾 202⚙ 83💰 236🔬 145🎵, +27.8 happiness, +14 authority spare at 6 cities)

Ruled and BUILT (schema 59, committed) — kept for the record:

- **The Greenwood Law** (Government II order, +2🌾+2⚙ unimproved) — **axed**.
  Retired per the Curious Elders pattern: row kept for saves, out of the pool
  and the doc table.
- **The Unbroken Land** (Government I order) — narrowed: **+1🌾+1⚙ on
  unimproved forest and jungle** (was: all unimproved tiles). The `on` test
  needs "unimproved AND (forest OR jungle)": extend the condition vocabulary
  with the smallest honest shape (a features-list test composed under the
  existing `all`), with describer support so the card prints its own words.
- **Athenaeum of the Road** (doctrine, all-three-discovery-options offerRider)
  — **axed**. First retired *doctrine*: the draft pool reads must honour
  `retired` the way the order pools do (verify, add the filter + register
  test if absent). User's reason: by the time it's drafted the nearby
  discoveries are claimed, and a far-off worker is inconsequential.

confirmed

### Playtest notes 9/3 — ruled in docs/playtest_notes.md, batched here

The notes doc is the spec of record; these are the orchestrator's
interpretations where the note left a choice. Veto any of them by editing
this list.

- **Batch: trade & roads** — routes never lay road over water; a route is
  entirely land or entirely sea (a sea route lays no road); where both paths
  exist the route command carries the choice. Ruled in chat 2026-09-03,
  follow-up: a route one way must not block the opposite direction —
  Brightwater→Aldermarch and Aldermarch→Brightwater may both run.
- **Batch: mapgen pangaea** — default map: one large continent + medium
  islands reachable by coast (island hops within coastal-water sailing).
  **BUILT** — a mask on the continental field (`data/mapgen.json`
  `pangaea` block; §5c of docs/mapgen.md); island shelves chained to the
  mainland deterministically; starts mainland-only. Preview seeds on
  standard: 31337 (textbook), 2 (chains fire), 5/888 (strait-split).
  Two priced-in regressions flagged: river quota on huge/giant maps falls
  to ~0.4–0.7 (standard unmoved; the real fix is depression-filling —
  say if those sizes matter now), and the rain-shadow bound moved 0.90 →
  0.92 (geometry of gathered land). Follow-up ruled in chat ("mapgen looks
  very promising"): **islands bigger and more frequent** — retune the belt
  knobs (lift/spread/tile budget), connectivity guarantee unchanged. And
  ruled same day: **mountain ridges less continuous** — break up long
  unbroken mountain lines, slightly more scattered peaks; passes must stay
  crossable-ish (no map-splitting walls was already the rule — keep
  whatever guarantee exists, just noisier ridgelines). And ruled same day:
  **starts on the mainland OR any landmass of ≥100 contiguous land tiles**
  — nobody spawns isolated on a small island; the floor is an absolute
  tile count beside the share knob (a data row), so a big second lobe
  (the strait-split seeds) is a legal home. Round two ruled in chat
  2026-09-03: **break the ridges up even further** (still too many
  unbroken chains), and **raise total land on the map** (the island gain
  came out of the mainland because seaLevel fixes the land fraction —
  move seaLevel/its knob so the whole map holds more land, mainland
  restored to roughly its pre-island footprint).
- **Batch: diplomacy** — players appear on the Diplomacy screen only once
  met (met = you have seen one of their units or their land — derived from
  sightings, not stored); screen layout borrows Civ's trade-table shape in
  the specimen language. **BUILT** (`hasMetSeat`, `metDiplomacyRows`;
  `docs/war-diplomacy.md` §9a). **One gap awaiting your ruling**: nothing
  persisted answers "I once saw a unit of theirs" — fog remembers terrain
  and towns only — so a meeting made by a passing sighting lapses when the
  piece leaves, unless their land, their town, or a signed paper also stands.
  Closing it honestly = a stored per-seat met set (new state, schema bump).
  Say the word and it becomes a field; otherwise the derived reading ships.
- **Batch: economy** (after the card batch lands) — palace happiness 9 → 6;
  crowding ON: targets ≈ +3–5 demand at pop 15, +10–15 at pop 20, +35–45 at
  pop 30 (tune `crowdingFrom`/`Weight`/`Exponent` to the band, print the
  table in a test); **gold prices ×2** — interpreted as prices *paid in*
  gold: `goldPerHammer` purchases and gold tile-buying (this partially
  rebalances the 8/29 tile 0.4× ruling — veto if tiles should stay cheap);
  yield conversions/windfalls stay 2:1 untouched. Lumbermill's
  `requiresTech` engineering → **siegecraft** (early Æra II, the
  construction-flavoured column). **BUILT** — crowding 0.3/from 10/exp 1.6
  (pop 15 → 3.9, pop 20 → 11.9, pop 30 → 36.2; the table prints in
  `test/sim/meters.test.ts`); goldPerHammer 4; tile ring bases doubled
  (net 0.8× of the pre-8/29 price). Two prices found and left, awaiting
  your ruling: `greatPeople.offerPriceGold` 300 (a flat gold price beside
  faith siblings — doubling it alone re-prices gold against faith at that
  till) and `wonderRefundGoldPerHammer` 1 (a payout; used to be half the
  purchase rate, now a quarter — say if it should be 2).
- **Batch: worker verbs** — new worker action: remove an improvement on an
  owned tile (a charge? ruled: costs a charge like building; veto if free).
- **4-player standard playtest** — setup path for a full game, 4 seats on
  the standard map. **BUILT** — a fourth Seats option, "Full game (you and
  three bots)", which seats the player plus three bots (wide, tall,
  warmonger) and moves the Size picker to Standard. No schema change: a bot
  seat is a roster row with `isHuman` left off, and the wild is appended by
  `seatBarbarians` as always. The seat arithmetic is
  `src/ui/gameSetup.ts`, pinned by `test/ui/gameSetup.test.ts`.
- **Batch: obsolete units** (ruled in chat 2026-09-03) — a unit superseded
  by a stronger version through tech leaves the build list; the antiquated
  unit stays offered ONLY while the empire lacks the successor's required
  strategic resource (warrior stays until iron is improved). The same gate
  holds for whatever "upgrade" path exists: no upgrading into a unit whose
  strategic resource the empire cannot access. **BUILT** — succession is the
  roster's own `upgradesTo` chain, walked by `upgradeTargetForType`
  (`src/sim/tech.ts`); `buildError` refuses a superseded row ("has been
  replaced by the …") and the city panel drops it from the list. The upgrade
  half was already gated on the resource (2026-08-29) and has grown the
  matching `awaitsTech` stop. **One note for you**: the tree's iron rung is
  the *legionary*, not the swordsman (revision 4), so a warrior becomes a
  swordsman with no iron anywhere — the sword line's own iron gate lands one
  rung later than the ruling's aside assumed. Say the word if the swordsman
  should ask for iron; it is a data field, not code.
- **Batch: city banner growth countdown** (ruled in chat 2026-09-03; look
  re-ruled same day) — no food icon/chip ("looks awkward"). Instead: a
  **circular bar around the population figure** — the filled arc in green =
  current growth basket / threshold; a lighter low-opacity green arc beyond
  it = what this turn's surplus adds. Stalled: no light arc. Starving: the
  arc reads in the vermilion register. Turns-to-grow stays in the
  title/aria words. Derivations unchanged (growthSurplus / growthThreshold
  / turnsToFill — the panel's own readers). **BUILT and committed** (an
  inline SVG ring on the size badge; own watched cities only).
- **Batch: late tech costs** (your 2026-09-03 note on the cost-knob flag:
  "technologies should keep the same scaling they had in age 1-2.
  Technologies should be extremely expensive in age 4-5.") — queued to land
  after the economy batch (one writer for the regenerated tech doc).
  Proposed table: columns 0–5 untouched (5→225); Æra III columns 6–8
  335/450/565 → 400/540/680; Æra IV columns 9–12 665/750/820/875 →
  **1450/1700/1950/2200** (≈2.3× the age; the whole tree ~19.7k → ~35.7k
  beakers). Edit these numbers here to veto before it lands. **BUILT** at
  exactly that table — 29 rows re-priced, the tree 35710🔬, ages
  345 / 1665 / 7700 / 26000. Measured: the four-city harness closes its ages on
  58 / 91 / 207 / **443** (was 44 / 84 / 175 / 236 — Æra I and II moved on
  their own, with none of their prices touched), and the one-city endgame
  harness opens the Opus on t1515 (was inside t650). Late columns are now an
  authored ruling rather than a value of the taper: `test/sim/tech.test.ts`'s
  `COLUMN_COSTS` is the table, the pricing note in `src/sim/tech.ts` the why.
  **For you to weigh**: a lone capital taking fifteen hundred turns to reach
  Alchemy is the pacing question this re-opens.
- **Batch: dry-settle growth** (ruled in chat 2026-09-03) — a city NOT on
  fresh water grows at **−30%** (a growth-surplus percentage, a labelled
  line in the growth breakdown per rule 5) **until an Aqueduct stands in
  that city**. The freshwater reading is the existing one-predicate
  (`cityHasFreshwater` — a card granting freshwater satisfies it); the
  number lives in `data/rules.json`, not code. Stacks multiplicatively-
  by-sum with other growth percents the way the existing
  `growthSurplus` rulePercent lines already fold. **BUILT** —
  `cities.drySettlePercent` (−30) is one line of `explainGrowthPercent`
  (`src/sim/cities.ts`), the rule-5 list `growthSurplus` is now the fold of;
  the line reads "No fresh water" and the city panel prints every line of that
  list, so an aqueduct's and a wonder's own percentages show on the Growth line
  for the first time. The aqueduct lifts it by a **marker**
  (`BuildingDef.waters`, read only by `cityIsWatered`), never by its id — and
  deliberately without satisfying `cityHasFreshwater`, so no `freshwater`-scoped
  card or cistern renewal mistakes an aqueduct for a river.
- **Batch: order drafts, current pool only + guaranteed spread** (ruled in
  chat 2026-09-03) — (a) `livePool` draws from the CURRENT government's
  pool alone; the previous government's unpicked cards no longer ride along
  (they are gone for good — deepening what you hold is untouched). (b) Each
  order draft of size ≥3 guarantees at least one military, one economic and
  one wildcard: one uniform draw from each slot-type sub-bag in fixed slot
  order, remainder uniform from the rest; an empty sub-bag falls through to
  the open draw (one roll per draw, replay-honest). Lands in the v60 push
  (migration note extended). **BUILT** — `livePool` reads
  `poolOrders(poolOfGovernment(…))` (which also puts retired rows out of the
  draw for the first time, the clause it had been bypassing); the spread is
  `drawOrderOptions` in `statecraft.ts`, the one caller being `drawOrderOffer`.
  The hand comes back in the pool's own file order so the guaranteed picks show
  no military-economic-wildcard seam. `previousPool` had no other caller and is
  deleted.
- **Great-people nerf pass** (ruled in chat 2026-09-03: "unfortunately i
  think we need to nerf great people") — `docs/great-people.md` becomes the
  editable worksheet mirroring the data rows (the orders-doc pattern, sync
  test included); the user writes nerfs there, then they fold in.
- **Trade route nerf** (ruled in chat 2026-09-03: "too easy to spam…cut
  their yields by ~half") — BUILT in the wave: the per-building lines pay
  1 per TWO buildings of the category (new knobs
  `trade.buildingsPerFood`/`buildingsPerProduction` = 2, floored), and
  the population coin doubles its divisor (`goldPerCombinedPop` 10 → 20).
  Luxury route lines and card shares untouched (they ride the flats).
- User handles: happiness order/doctrine nerfs (will say when ready) — the
  worksheet edits spotted in `docs/orders-and-doctrines.md` are treated as
  in-progress, NOT folded until you say ready (the doc-sync test failing
  locally is that gap, on purpose).

Open (proposals drafted, awaiting your numbers — see the session report):

- **Happiness is too plentiful.** Biggest dials found: `perUniqueLuxury` 4,
  `palace` 9, `crowdingWeight` 0 (crowding is built but switched OFF),
  `demandPerPop` 1, Festival Days +4 flat, Bread and Circuses +3/city at
  tier 10.
- **Early doctrines to soften** — candidates: Bread and Circuses, The
  Scattered Hearths (first 3 citizens free), The Gentle Yoke.
- **Wolf-Mother's Pact** felt dead at peace (kills have no sink, camps
  unclearable, converted units useless) — rework directions in the report.
- **Authority too roomy at 6 cities** (+14 spare) — supply side is palace 4 +
  2/age + buildings; costs verified correct (3 inland / 2 coast).

### From the balance pass — resolved 2026-09-03 (schema 51) except where marked

- **Order upgrade marks still missing** — awaiting your marks (they ship
  non-upgradable meanwhile): **The Old Ways** and **The Escorted Roads**.
  ~~Curious Elders / Triumphs~~ — ruled 2026-09-03: intentionally deleted;
  both retired (rows kept for saves), out of every pool and the doc tables.
- ~~Parameter deepeners~~ — **built**: an upgrade entry is either an ordinary
  effect (appends a line) or an `OrderDeepening` (moves a printed number once
  per level). The Standing Levy musters every 12 → 10 → 8; Pilgrim Roads caps
  at 5 → 7 → 9. `PARAMETER_DEEPENERS` deleted.
- ~~The Academy's faith purchase~~ — **built** per your ruling: 1000🕯 buys a
  scholar-only great-person draft through the one draw path; no renown moved,
  no ladder scaling; refusals byte-identical.
- ~~The Gentle Yoke~~ — reverted to **+2 authority per city** per your
  fallback. The prospective-only version is deferred on the row: it waits on
  `City.foundedTurn`, the same field the King List's mechanic wants — one
  future edit unlocks both.
- ~~Cuius Regio~~ — confirmed as built (gained-again, no faith deduction).
- ~~River Wardens~~ — moved to Government II per your ruling.
- ~~`noSettlerEscalation`~~ — retired; the settler ladder always climbs.
- ~~Tyrian's Æra III~~ — confirmed (+1🎵 on fishing boats).
- ~~Lapis's Æra III~~ — **built** per your ruling: +1 renown per city at
  Æra III through a family-less shape — it can never tilt the weighted draw.

### The proposed pools (docs/orders-and-doctrines.md)

- **Government IV (tier 29) and V (tier 45)** — stocked, awaiting your review
  pass; wiring is one enum + `poolOfGovernment` + rows.
- **Government VI** — no adoption rung past 45 exists; needs a seventh tier or
  another gate (the Opus opening, an Æra V entry).
- **Levies vs The Levée en Masse** — same design in an Order and a Doctrine;
  keep one.
- **The Synod** — "rites last 25% longer" predates the one-charge augur; needs
  a rework before building.
- **Guild Charters** — you deferred it once as "too many mechanics"; re-cut
  before it enters a pool.
- **The Corps** — your backburner: UX first.

### The tree and pacing

- **The cost knob** — after your nerf round settles in playtests, the age
  closes should be re-measured; the whole late game re-tunes with the 0.72
  taper in the column formula (`src/sim/tech.ts`). Shipped tree 22.5k beakers,
  closes 46/91/200/273 after the first-paid-tier re-anchor (schema 49).
  Entry LXI.
  
  technologies should keep the same scaling they had in age 1-2. Technologies should be extremely expensive in age 4-5.

- **Renewals axe** — ruled 2026-09-02, not yet implemented: the tech-gated
  free building upgrades (granary/monument/barracks/library/market/workshop
  rows) go. Say when. 
  
  lets do this now. This is part of the problem

### Standing from earlier passes (Entries LIII–LX)

- **Settler discount** — "50% faster" ratified; shipped −33% cost. Confirm or
  move to −50%.
- **Temple** — −25% foreign-pressure defence semantics (was −50% pre-rework).
- **Iron's reveal** — moved to Iron Working (Æra III now); balance-significant.
- **Founder drafts** — a founding drafts two rungs of the belief ladder (my
  interpretation of the unstated enhancer path, docblocked in
  `nextBeliefPool`).
- **`redraftBeliefs`** — kept through the faith rework; keep or retire.
- **The Alchemical Codex** — sits behind the Alchemical Society, not the
  Observatory (flagged at Phase 3).
- **The Opus culture pillar** — deferred (see B: The Magnum Opus).
- **Bead threshold 20** — never decides a game (winners hold 7–10); lower it
  or retire the threshold. Entry LIX.
- **Entry LIV supply trim** — proposed with measurements, never applied; now a
  playtest question after the balance pass.
- **The Sea Peoples** — waits on a plundering-costs-no-movement rule.
- **The Mint** — endeavour timing vs Paper Money's building (conflict noted at
  the tree pass).
- **Inquisitor badge** — wears the augur's candle; own art owed.
- **Project-headed towns** — a project row never leaves the queue, so End Turn
  never asks; the bot works around it (`projectIdleCommand`), a human gets no
  nudge. Entry XXVI's edge, Entry LX's flag.
- **Rite windfall toast** — a rite's hammers can complete a wonder correctly
  but carry no toast out through `RiteResult` (known gap, CLAUDE.md).

## B. Deferred halves on the rows (regenerated from data)

Each waits on the named thing; the prose on the row is player-plain and is the
source. Regenerate this list with the scratchpad dump after any data pass.

**Orders** — Pilgrim Roads (cap deepening) · Triumphs (renown grant: a
windfall's grants can't reach the renown ladder) · The Standing Levy (cadence
deepening) · Sanctuary
(sacking doesn't exist; retired) · The Escorted Roads (route safety is
placeless) · The Dry Docks (heal-in-port is a hex rule).

**Doctrines** — The Founders' Road (amphitheatre swap) · Mountain Hold
(radius 2) · The Burning Way (chopped-hex memory) · Religious Mandate (war,
conversion immunity, bead bonus — parked tier 0) · The Academy (faith-bought
scholar drafts) · The Sea Charter (founded-with-Harbour) · The Renaissance
Court (stronger legacies) · Absolutism (a wildcard slot is a layout change) ·
Blitz (both halves — no post-kill move, no fortify ban) · The Philosopher's
Stone (both — Opus discount, Distillery) · The Levée en Masse
(border-crossing trigger) · Pax Magistri (no war to forswear) · The Closed
Realm (both — parked tier 0).

**Governments** — The Curia (+3🕯 per Cathedral).

**Techs** — Epic Poetry (verse sized by the fallen piece) · Kingship (the King
List needs founding turns) · Paper Money (the Bourse spends gold) ·
Empire-Building (capital-mirror hammers) · Colonial Charters (distance-priced
authority) · Castellany (anti-ranged defence line) · Fortification (walls that
mend).

**Resources** — Ivory (war elephants; hammers toward a category) · Lapis
(renown ruling).

**Wonders/buildings** — Terracotta Army (born strength) · Statue of Zeus
(+15% vs cities) · Notre-Dame (Cathedral culture) · Forbidden City (an Order
slot) · Alhambra (born fortify bonus) · Water Clock (the chime cadence) ·
Shipyard (ship-only discount) · Printing House (routes paying the
destination) · Observatory (mountain sight clause) · Bank (routes-ending-here
count) · **The Magnum Opus (the culture pillar)**.

**Great people** — Sin-lēqi-unninni (Hall of Deeds is gone) · Leonardo
(project halving) · Mimar Sinan (cathedral discount) · Yi Sun-sin (naval
strength).

**Beliefs** — Holy Order (faith-bought fighting order) · Theocratic Mandate
(claims on followers) · The Promised Land (faith at a founding is a third way
to press).

### From the v55 batch (2026-09-03)

- **Lakes exist but nothing can stand on one** — Floating Gardens' lake half
  ships as deferred prose; making lakes workable is a movement ruling.
- **New numbers to tune**: Stele of Laws (50⚙, +3🎵, +1 authority capacity —
  note: strictly worse per hammer than the Monument today), Stone Walls
  (55⚙, +4 defense, +25 hp), Workshop (3⚙ base + the two 10% lines; net −1
  late production vs the old renewal path), Floating Gardens (+1🌾+1💰).

### Ruled 2026-09-03, next pass (spawning now)

- **Geomancy option 1**: holding Geomancy reveals a faint *sleeping-vein
  marker* on hills that carry one (per seat, no kind named — the reveal gate
  still owns the kind); surveying stays the verb that surfaces the seam and
  pays the assay. Kills the blind hex-guessing, keeps the strike and the
  scout's job. Render marker + per-seat gating + UI greying; no schema
  (presentation + a derived reading).
- **Say "scout", not "explorer"**: every player-facing string for the
  surveying hand reads "worker or scout". The `isExplorer` marker
  (`ignoresTerrainCost`) stays for future pathfinder units — code keeps the
  marker, players hear the unit they actually have.

- **Bot blind spot found while verifying the Lighthouse**: the hypothetical
  path (`cityYields(state, city, [building])`) prices the quote but not the
  building's own TILE lines, so the bot's what-if undervalues coastal
  buildings with `tileYields` (Lighthouse). Real construction pays correctly;
  only the appraisal is blind. Small fix in the ghost context when wanted.

### Bot brain v1 — IN FLIGHT (personas + five appraisal fixes)

Riding with the personas below, all ruled 2026-09-03: the improvement plan
(workers see the ground: build value from the top unclaimed tile deltas,
lay/walk by best entry — replaces flat 80 + first-legal list + nearest tile);
wonder patience (amortiser capped for one-of-a-kind/bead rows, ~10);
gold-pressure grace (floor 1 while young + treasury sound); great people act
v1 (act-or-plant, never sleep); citizen valuation (next-tile yields + the
science stream + a small-city compounding premium; smallCityPop: 9 is the
orchestrator's reading of the user's 'start with a value of 9' — the premium
is its own knob, one edit flips the interpretation).

### Ruled 2026-09-03 — bot personas (spawned with the above)

- `data/ai.json` gains `personas`: sparse deep-overrides of the whole AI
  config, merged per seat (`persona` on the bot's config entry — in the save,
  replays deterministically, absent = balanced, no schema bump).
- Starting set: **balanced · wide · tall · zealot · warmonger** (the user's).
- Same pass: `cityValueFalloff` (each further city worth less — the honest
  tall lever; today a settler is a flat 88 for every empire) and per-persona
  `siteScoreMin`.
- **Warmonger needs one real capability, not just weights**: the bot is
  peaceful by construction (it never targets a real player). Add an
  `aggression` knob read by the unit-order chooser — hunt enemy units and
  push captures within a radius when set. v1 will be crude (no siege
  coordination, no war economy); the spectate page is where it gets tuned.
- Seat picker + spectate setup strip gain the persona dropdown.

### From war P1 (2026-09-03, schema 56)

- ~~Puppet purchases~~ — RULED 2026-09-03: a puppet may buy NOTHING (units,
  buildings, tiles) — Civ 5's rule; annex is the verb that buys investment.
  One purchaseError/tile-purchase clause; lands with P3 (sim owned by P2).
- **Puppet auto-picker rules** (RULED, P3): never wonders, settlers, or
  units; gold-leaning build weights — a puppet persona profile.
- **A unit engulfed by border growth at peace can be stuck** (expulsion fires
  only at peace resolution) — rare; needs a ruling on mid-peace expulsion.
- **Barbarian pieces now wear the war-red rim** (consistency fallout of the
  glow) — flag if you want the wild visually distinct from declared enemies.
- **The user's bot notes** (docs/bot-notes.md → P3): early scouts
  prioritized; the first build of the first city hard-coded to a scout.
- P3 queue additionally: settler escorts · warmonger declarations + warscore
  peace + trade acceptance · puppet auto-production · scored order slotting ·
  adoption face comparison · site scorer ring 2 + luxury-kind awareness.

### From war P3 (2026-09-03, schema 58)

- **Puppet `contribute` still legal** — the ruling named purchases and
  tiles; one clause closes gold-pouring into a puppet's basket if wanted.
- **Warscore wants a loss register** — losses/captures since declaredTurn
  are lifetime proxies today; a real register is a schema decision.
- **Balanced seats can declare at 4.5×** — the (1 + aggression) reading;
  intended for wide, worth confirming for balanced.
- **The balanced endgame slowed** — undecided at t200 where brain v1 decided
  at t182; first knobs: site.ringFalloff, war.escortRadius. The playtest and
  the next arena pass judge.

## C. Open threads

- **Statecraft-close bug** — your deterministic recipe (discovery → culture
  boon → mid-turn draft → slot → dead ×) awaits confirmation on current main
  (post-Entry-LVII fixes) plus the console/elementsFromPoint probe.
- **Bot honesty** — you're suspicious of the bot as a balance instrument, and
  the t69 datum agrees (human ≈5–10× tier-1 yields). Playtest is the judge;
  the overnight optimizer over `data/ai.json` stands ready when wanted.
- **Playtest questions now live** — do the luxury flats *feel* right; does
  Æra III hold its length under real play; where does the 0.72 knob land.
- **The city mode's camera seizure** — the full-screen city mode shipped
  2026-09-03 (`docs/city-screen.md`, revision 3) without idea #1: the camera
  still merely frames the town (the bias knob) and free pan is not locked while
  the mode holds. Ruling wanted on whether opening a city should ease the camera
  onto it and refuse pan until Leave.
- **The guide's `#city-panel` anchor** — the tutorial's "build" step anchors its
  card at `#city-panel`, which is now the whole mode rather than a 340px panel,
  so the card falls back to centred. It wants retargeting at the work rail
  (`.city-rail.is-right`) or at the add-list. Tutorial fence; one line.
- **The vignette's strength under the mode** — the dim beyond the work radius is
  the mode's framing now rather than a hint (`data/view3d.json` `vignette`:
  inner 1.05, outer 1.6, opacity 0.68, ink). Unchanged in the ship; whether it
  wants to go darker or tighter is a look decision with the app on screen.
