# The Standing Flags

Every OPEN ruling, deferred half, and live thread — nothing here is done.
Pruned 2026-09-04 on the user's standing order: a ruled-and-built item leaves
this page the day it lands (its story lives in `docs/design-history.md` and
git). Three sections: **A** is decisions only you can make, **B** is rows
that ship deferred-with-prose (regenerated from the data rows' own
`deferred:` fields), **C** is open threads and playtest questions. The user
edits this page directly to confirm rulings — user marginalia are rulings.

## A. Awaiting your ruling

### The batch queue (your 2026-09-04 marginalia wave, absorbed — agents flying)

Wave one, flying now on disjoint fences:

1. **The renewals axe** ("lets do this now. This is part of the problem") —
   the tech-gated free building upgrades (granary/monument/barracks/
   library/market/workshop rows) go. Schema: derived yields change under
   old logs.
2. **UI singles** — the worker panel shows every improvement as a greyed
   button with the reason it can't be built (your onboarding ruling); the
   city mode refuses board pan while open (no camera easing); the vignette
   lightens ~25% (opacity 0.68 → 0.51).
3. **Mapgen: rivers & lakes on big maps** — restore the huge/giant river
   quota; failed river pits may become lakes.

Wave two, queued behind them in order, each gated:

4. **The levelling axe + skip-for-rarity** (RULED: "No more upgrading
   altogether, all cards are as is. Players are given an option to skip
   and increase the rarity of their next draft.") — deepening leaves
   whole: no upgrade options in drafts, owned levels dissolve to
   as-printed, the `upgrade:` columns leave the sheet; rarity marks
   (● ◆ ○, the sheet's 4/2/1 draw-weight proposal) become real draw
   weights; a draft may be SKIPPED, each consecutive skip raising the
   rarity odds of the next (the pity ladder). Per your Section-B note,
   anything relying on deepening (Pilgrim Roads' cap ladder, The Standing
   Levy's cadence ladder, The Archives' per-level count) is re-cut to a
   levelless reading or removed. Schema.
5. **Sim singles** — the swordsman requires iron (data field); puppet
   `contribute` refused (one clause); the met-set becomes a stored
   per-seat field (permanent meeting: sighting a unit or an owned tile
   once suffices — schema); **the Magnum Opus opens at 20 beads**
   (INTERPRETATION for your veto: an empire may begin the Opus only while
   holding ≥20 beads; the row's tech placement stays; the old
   never-decides threshold role retires). Schema.
6. **The proposed additions build** ("Add the proposed additions, let me
   playtest before we decide on the government 4,5,6 orders") — the
   sheet's per-pool proposed blocks: the charters (each unlocking its
   building — the `cardUnlocksBuilding` shape), the growing cards
   (Ballad-Weavers · Bell-Founders · Reliquary Rolls · Chroniclers of the
   Fallen · Almoners' Book — the phase-2 scaling counter, slot-only per
   the standing ruling), and the NEEDS-NAME war order (proposal: **The
   Casus Belli**). Levies vs Levée reconciled per your note: PROPOSAL —
   keep The Standing Levy (built), retire the Levée en Masse proposal
   (its trigger was never built). Schema.

### Pacing — RULED 2026-09-04 (your marginalia)

"The bot is a bad indicator for actual play… later eras feel too _fast_
based on how much snowball is in the game. We need to consider outrageous
costs later in the game as part of the skill test. For now, only look to my
playtests as the source of truth for pacing balance." — The three post-wave
harness findings (t586 curtain, draft cliff, warband poverty) are CLOSED as
questions; the harnesses keep their honest pins; no pacing knob moves on
bot evidence alone.

### The balance turn (direction agreed, numbers not yet ruled)

Buildings are the big non-card power block — direction: ordinary rows' flat
yields down ~25% so cards carry more of the empire's power share;
unlock/utility buildings keep their roles. **Entry LIV's supply trim folds
in here** (your "what is this?" answered: the 2026-09-01 ruling that
happiness/authority relief should be Order-gated — a slot is an opportunity
cost — with buildings/luxuries trimmed to match; proposed with
measurements, never applied). Guardrail: the no-draft-bot test. Awaiting
your numbers.

### Open singles (still yours)

- **`greatPeople.offerPriceGold` 300** — your "what is the great people
  offer price?" answered: it is what The Commonwealth (tier 45) charges to
  buy a great-person recruitment with GOLD (the faith sibling is
  `offerPriceFaith` 150 via The Magisterium). Wonder refund stays 1 per
  your note. The 300 awaits your number now that you know what it buys.
- **Gov IV/V/VI pools** — wait for your playtest (your ruling). Gov VI
  still needs a gate past tier 45 when it comes.
- **Guild Charters (Gov V proposal)** — your "what was the guild charters
  thing?" answered: "each Workshop/Forge grants +1 renown per turn to the
  Engineer family · +2%⚙ per production building in that city (max +6%)";
  deferred then as too many mechanics. The family renown feed exists now,
  so it is implementable — needs a new name (The Guild Charter is built)
  and your re-cut.
- **The Harvest Songs re-cut** — ships as 10% of food yield, not surplus
  (the surplus reading is circular with the growth percents); say if the
  percent should drop.
- **The Synod (Gov IV proposal)** name clash with the built Synod — needs
  a new name if it ever builds.

### Standing small items (earlier passes)

- **Settler discount** — "50% faster" ratified; shipped −33%. Confirm or
  move to −50%.
- **Temple** — −25% foreign-pressure defence semantics (was −50%).
- **`redraftBeliefs`** — kept through the faith rework; keep or retire.
- **The Sea Peoples** — waits on a plundering-costs-no-movement rule.
- **The Mint** — endeavour timing vs Paper Money's building (conflict);
  the user's Mint Charter (queue item 6) may supersede — reconcile there.
- **Inquisitor badge** — wears the augur's candle; own art owed.
- **Rite windfall toast** — a rite's hammers can complete a wonder with no
  toast (`RiteResult` gap).

## B. Deferred halves on the rows (regenerated from data)

Your ruling 2026-09-04: "deferring on these for now. Disable/remove
anything that relies on something we've removed." — applied as: every
deferral stands; the deepening-dependent ones (Pilgrim Roads' cap, The
Standing Levy's cadence) are re-cut by queue item 4; the Levée en Masse
proposal retires with queue item 6.

**Orders** — Pilgrim Roads (cap deepening — re-cut by the axe) · Triumphs
(renown grant: a windfall's grants can't reach the renown ladder) · The
Standing Levy (cadence deepening — re-cut by the axe) · Sanctuary (sacking
doesn't exist; retired) · The Escorted Roads (route safety is placeless) ·
The Dry Docks (heal-in-port is a hex rule).

**Doctrines** — The Founders' Road (amphitheatre swap) · Mountain Hold
(radius 2) · The Burning Way (chopped-hex memory) · Religious Mandate (war,
conversion immunity, bead bonus — parked tier 0) · The Academy (faith-bought
scholar drafts) · The Sea Charter (founded-with-Harbour) · The Renaissance
Court (stronger legacies) · Absolutism (a wildcard slot is a layout change)
· Blitz (both halves) · The Philosopher's Stone (both) · The Levée en Masse
(retiring with queue item 6) · Pax Magistri (no war to forswear) · The
Closed Realm (both — parked tier 0).

**Governments** — The Curia (+3🕯 per Cathedral).

**Techs** — Epic Poetry (verse sized by the fallen piece) · Kingship (the
King List needs founding turns) · Paper Money (the Bourse spends gold) ·
Empire-Building (capital-mirror hammers) · Colonial Charters
(distance-priced authority) · Castellany (anti-ranged defence line) ·
Fortification (walls that mend).

**Resources** — Ivory (war elephants; hammers toward a category) · Lapis
(renown ruling).

**Wonders/buildings** — Terracotta Army (born strength) · Statue of Zeus
(+15% vs cities) · Notre-Dame (Cathedral culture) · Forbidden City (an
Order slot) · Alhambra (born fortify bonus) · Water Clock (the chime
cadence) · Shipyard (ship-only discount) · Printing House (routes paying
the destination) · Observatory (mountain sight clause; the Stargazers'
Charter builds a different Observatory — reconcile at queue item 6) · Bank
(routes-ending-here count) · **The Magnum Opus (the culture pillar)**.

**Great people** — Sin-lēqi-unninni (Hall of Deeds is gone) · Leonardo
(project halving) · Mimar Sinan (cathedral discount) · Yi Sun-sin (naval
strength) · Dinocrates (a wonder-occasion legacy).

**Beliefs** — Holy Order (faith-bought fighting order) · Theocratic Mandate
(claims on followers) · The Promised Land (faith at a founding is a third
way to press).

**Numbers to tune (v55)** — Stele of Laws (50⚙, worse per hammer than the
Monument) · Stone Walls (55⚙) · Workshop (net −1 late vs the old renewal
path) · Floating Gardens (+1🌾+1💰; the lake half waits on lakes being
standable — a movement ruling; queue item 3 may create map lakes, the
terrain half of that story).

## C. Open threads

- **Statecraft-close bug** — your deterministic recipe (discovery → culture
  boon → mid-turn draft → slot → dead ×) awaits confirmation on current
  main plus the console/elementsFromPoint probe.
- **Bot honesty — RULED into context**: the bot is not a balance baseline
  until significantly improved; playtests are the source of truth. The
  optimizer over `data/ai.json` stands ready when wanted.
- **Bot debts, written down in docblocks** — a luxury's signature, the
  citadel's ring and hypothetical percents unpriced; a camp on
  charted-but-left ground over-counted (wants a sim-side camp memory,
  schema); a wounded piece deep in enemy fields does not retreat; purchases
  don't read the unit mix; warscore wants a loss register (schema); the
  balanced endgame slowed (knobs: site.ringFalloff, war.escortRadius).
- **Pamphlet shots: 3 outstanding** — move-attack, worker-improve,
  diplomacy-with-a-met-rival need a riper save; captions meanwhile.
- **Closed 2026-09-04 by your marginalia, for the record**: mid-peace
  expulsion (not now) · barbarian red rim (keep) · 4.5× declare (tune in
  playtest) · project-headed towns (Civ V behaviour — confirmed, that is
  how processes behave there) · authority roominess (defer to playtest) ·
  camera easing (not needed; pan lock ships in queue item 2).
- **Playtest questions live** — do the luxury flats *feel* right; does
  Æra III hold its length under real play.
