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

### From the balance pass (2026-09-02, schema 48)

- **Order upgrade marks missing** — these ship *non-upgradable* until you mark
  them: Militia Levies · Emergency Powers · The Common Purse · The Old Ways ·
  The Escorted Roads · Curious Elders · Triumphs (the last two were absent from
  your doc pass entirely).

  Updated, I couldn't find curious elders or triumphs, what do you mean? 


- **Parameter deepeners** — The Standing Levy (−2 turns per level) and Pilgrim
  Roads (+2 happiness cap) deepen a *parameter*, not a line; the authored-
  increment ladder can't express that honestly. They ship non-upgradable,
  pinned in `PARAMETER_DEEPENERS`. Needs a mechanism ruling.

How difficult would this be to implement? Don't we already have functionality for reduced turns (doctrines/orders do this already?) Pilgrim roads is not a big deal, but standing levy being able to upgrade is a cool mechanic.

- **The Academy's faith purchase** — "great scholar drafts with 1000🕯" bends
  the one-draft-path rule (a family-restricted, price-overridden recruitment).
  The two percents shipped; this clause is deferred. Say how you want it.

my intention was, you could spend faith for a great person draft that only contained scholar. Shouldn't scale the renown costs.

- **The Gentle Yoke** — "every *new* city costs 3 more authority" ships as
  *every* city (+3): prospective-only needs state the game doesn't keep.

Is this due to limitations in game logic? I wanted this to not apply retro-actively to cities. Otherwise, we should change this back to 2 authority.

- **Cuius Regio** — "converted into science" ships as *gained again as*
  science (faith untouched), the Theocracy precedent. Confirm the word.

Yup, thats correct. No faith deduction from the ability

- **River Wardens' pool** — your doc lists it under Government II; the data
  row says Government I. A pool move wasn't in the spec, so it stayed.

I meant to move it, its too strong in government 1.

- **`noSettlerEscalation`** — Manifest of the Steppe dropped it; the rule id
  is now carried by no card. Retire the member or re-home it.

Yup, dropped.

- **Tyrian's Æra III** — the doc said Deferred but the shape existed, so it's
  built (+1🎵 on fishing boats). Confirm or revert.

Confirm. +1 culture on fishing boats.

- **Lapis's Æra III** — "+1 renown in every city": renown exists; what a
  luxury may pay into it hasn't been ruled. Waiting on your word.

No lean, just add renown that doesn't factor into the calculation.

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

## C. Open threads

- **Statecraft-close bug** — your deterministic recipe (discovery → culture
  boon → mid-turn draft → slot → dead ×) awaits confirmation on current main
  (post-Entry-LVII fixes) plus the console/elementsFromPoint probe.
- **Bot honesty** — you're suspicious of the bot as a balance instrument, and
  the t69 datum agrees (human ≈5–10× tier-1 yields). Playtest is the judge;
  the overnight optimizer over `data/ai.json` stands ready when wanted.
- **Playtest questions now live** — do the luxury flats *feel* right; does
  Æra III hold its length under real play; where does the 0.72 knob land.
