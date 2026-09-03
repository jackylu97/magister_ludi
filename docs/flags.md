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
- **Renewals axe** — ruled 2026-09-02, not yet implemented: the tech-gated
  free building upgrades (granary/monument/barracks/library/market/workshop
  rows) go. Say when.
- **More Æra II/III techs** — the pacing goal (III longest); late additions
  should scale (percents, per-city, verbs), not flat-pay. Placement is cheap
  now (a column is a price).
- **Chart fold** — the 8-lane chart cannot clear a 681px stage by layout alone
  (845px best packing): (a) compact-card pass (truncate unlock lists to the
  hover card — recommended) or (b) accept vertical scroll.
- **Your redraw** — you're sketching a rearrangement (visual + dependencies);
  a photo works, I transcribe and confirm before implementing.

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
deepening) · The Bronze Mirror (a luxury not on the map; retired) · Sanctuary
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

- **Puppet purchases are unruled** — the reducer accepts gold/faith purchases
  in a puppet city; say if a puppet may buy.
- **A unit engulfed by border growth at peace can be stuck** (expulsion fires
  only at peace resolution) — rare; needs a ruling on mid-peace expulsion.
- **Barbarian pieces now wear the war-red rim** (consistency fallout of the
  glow) — flag if you want the wild visually distinct from declared enemies.
- **The user's bot notes** (docs/bot-notes.md → P3): early scouts
  prioritized; the first build of the first city hard-coded to a scout.
- P3 queue additionally: settler escorts · warmonger declarations + warscore
  peace + trade acceptance · puppet auto-production · scored order slotting ·
  adoption face comparison · site scorer ring 2 + luxury-kind awareness.

## C. Open threads

- **Statecraft-close bug** — your deterministic recipe (discovery → culture
  boon → mid-turn draft → slot → dead ×) awaits confirmation on current main
  (post-Entry-LVII fixes) plus the console/elementsFromPoint probe.
- **Bot honesty** — you're suspicious of the bot as a balance instrument, and
  the t69 datum agrees (human ≈5–10× tier-1 yields). Playtest is the judge;
  the overnight optimizer over `data/ai.json` stands ready when wanted.
- **Playtest questions now live** — do the luxury flats *feel* right; does
  Æra III hold its length under real play; where does the 0.72 knob land.
