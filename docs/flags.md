# The Standing Flags

Every OPEN ruling, deferred half, and live thread — nothing here is done.
Pruned 2026-09-04 on the user's standing order: a ruled-and-built item leaves
this page the day it lands (its story lives in `docs/design-history.md` and
git). Three sections: **A** is decisions only you can make, **B** is rows
that ship deferred-with-prose (regenerated from the data rows' own
`deferred:` fields), **C** is open threads and playtest questions. The user
edits this page directly to confirm rulings — user marginalia are rulings.

## A. Awaiting your ruling

### In flight right now (2026-09-04)

- **The card-shapes pass** (`docs/card-shapes.md`, your annotations are the
  spec) — agent flying: three deck-readers, four conversions (two replace
  Salt Road / Hearth Songs), four line payoffs, The Last Hunt raised.
- **The renewals axe** — your margin note: "lets do this now. This is part
  of the problem." Queued as the next batch the moment the card agent lands
  (same fence): the tech-gated free building upgrades
  (granary/monument/barracks/library/market/workshop rows) go.

### The levelling axe (your card-shapes margin note) — SCOPE WANTED

"[remove, we're axing levelling cards, remember?]" — taken as the ruling
that deepening/levels leave the game. One line settles the scope: does the
axe remove the UPGRADE OPTION from drafts only (owned rows keep levels
already earned), reset every owned order to level 1, or delete the
`OrderUpgrade` machinery outright (a schema decision — saves hold levels)?
The sheet's "RULING: orders can only be deepened up to level 3", every
"upgrade:" column, and the still-missing upgrade marks for The Old Ways /
The Escorted Roads all follow the answer.
No more upgrading altogether, all cards are as is. Players are given an option to skip and increase the rarity of their next draft.

### Pacing (measured 2026-09-03 post-wave; your call on all three)

- **The curtain sits at ~t586.** The five-town harness closes its ages on
  66 / 107 / 249 / 586 (`test/sim/tech.slow.test.ts`); Æra IV alone is 337
  turns. Same question as the lone-capital-t1515 finding: is the late game
  meant to be this long?
- **The draft ladder has a cliff at the third town** — governments land
  57 / 92 / 210; early cadence 9.3 turns/draft against Entry XV's ~5. Cause:
  palace 6 + crowding makes the expanding empire unhappy and culture-poor
  for ~20 turns. `test/sim/statecraftPacing.slow.test.ts`.
- **The warband is poorer earlier** — treasury 10 / −22 / −153 at
  t20/40/60; five pieces at t40 against eleven.
  `test/sim/upkeep.slow.test.ts`, `test/sim/buildSinks.slow.test.ts`.

the bot is a bad indicator for actual play, it needs significant improvement before we can make it a baseline.
I'll need to test it, but currently the later era's feel to _fast_ based on how much snowball is in the game.
We need to consider outrageous costs later in the game as part of the skill test for players.
For now, only look to my playtests as the source of truth for pacing balance.

### The balance turn (direction agreed in chat, numbers not yet ruled)

Buildings are the big non-card power block — direction: ordinary rows' flat
yields down ~25% so cards carry more of the empire's power share;
unlock/utility buildings keep their roles. Guardrail: the no-draft-bot test
(irrelevant by mid-Æra III, not turn 30). Sequenced after the card-shapes
pass lands and the pacing questions above are ruled.

### Open singles

- **Diplomacy met-set** — a meeting made by a passing sighting lapses when
  the piece leaves (fog remembers terrain and towns only). Closing it
  honestly = a stored per-seat met set (schema bump). Say the word;
  otherwise the derived reading stands.
  yup - meeting should be permanent, and only need to sight a unit or tile the player owns once.
- **Two gold prices** — `greatPeople.offerPriceGold` 300 (beside the faith
  siblings) and `wonderRefundGoldPerHammer` 1 (now a quarter of the
  purchase rate; say if it should be 2).
  what is the great people offer price? keep the wonder refund at 1.
- **Swordsman and iron** — the tree's iron rung is the *legionary*, so a
  warrior becomes a swordsman with no iron anywhere. Say the word if the
  swordsman should ask for iron; it is a data field.
  let's make the swordsman require iron.
- **Early-worker onboarding gap** (seed 31337): a fresh worker can have NO
  legal action for ~10 turns (forest/desert ring, Mining unresearched, chop
  gated). Candidate fixes: chop legal from the start, a guaranteed farmable
  hex near starts, or the worker panel saying WHY nothing is legal.
  Yeah, i've noticed that too in my playtesting. Let's not worry about this now, add a greyed out button of the possible improvements that can be built and explain why it can't be built in the worker panel.
- **Mid-peace expulsion** — a unit engulfed by border growth at peace can
  be stuck (expulsion fires only at peace resolution). Rare; needs a rule.
  Lets not worry about this for now.
- **Barbarian red rim** — the wild wears the war-red rim since the glow
  pass; flag if it should look distinct from declared enemies.
  Great.
- **Puppet `contribute` still legal** — the ruling named purchases and
  tiles; one clause closes gold-pouring into a puppet's basket if wanted.
  yeah turn off contribute. this is only relevant for projects and the magnum opus right?
- **Balanced seats can declare at 4.5×** — the (1 + aggression) reading;
  intended for wide, worth confirming for balanced.
  Lets tune this later with playtesting
- **River quota on huge/giant maps** — fell to ~0.4–0.7 with the pangaea
  (standard unmoved); the real fix is depression-filling. Say if those
  sizes matter now.
  yup, lets increase the number of rivers if it decreased, also adding lakes could help. Let me know if you meant something different by depression-filling.
- **Project-headed towns** — a project row never leaves the queue, so End
  Turn never asks; the bot works around it, a human gets no nudge.
  This is fine, this is the behavior in civ 5 right?
- **City-mode camera** — opening a city still only frames the town; ruling
  wanted on easing the camera onto it and refusing pan until Leave.
  Easing camera isn't needed for now, but refusing pan is good.
- **Vignette strength under the mode** — a look decision with the app on
  screen (inner 1.05 / outer 1.6 / opacity 0.68).
  Lets lighten the vignette slightly, maybe 25% less in visibility (not sure how that translates to numbers)

### Standing small items (earlier passes)

- **Settler discount** — "50% faster" ratified; shipped −33%. Confirm or
  move to −50%.
- **Temple** — −25% foreign-pressure defence semantics (was −50%).
- **`redraftBeliefs`** — kept through the faith rework; keep or retire.
- **Bead threshold 20** — never decides a game (winners hold 7–10); lower
  it or retire the threshold.
  Let's change the rules. You _need_ 20 beads to begin the magnum opus. We can play around with the number later. Let's say the magnum opus unlocks automatically at 20 beads.
- **Entry LIV supply trim** — proposed with measurements, never applied;
  now a playtest question.
  Please be more specific, what is this?
- **The Sea Peoples** — waits on a plundering-costs-no-movement rule.
  great, pillaging should cost 1 movement, and should be an option when a military unit is on a tile with an improvement of a player you're at war with.
- **The Mint** — endeavour timing vs Paper Money's building (conflict).
  please be more specific
- **Inquisitor badge** — wears the augur's candle; own art owed.
  please make art for this, or find an icon that fits with our current set.
- **Rite windfall toast** — a rite's hammers can complete a wonder with no
  toast (`RiteResult` gap).
  hm, wonder screen should always show after completion.
- **Authority roominess** — +14 spare at 6 cities in your playtest; supply
  is palace 4 + 2/age + buildings. Playtest question.
  defer to playtest

### The proposed pools (docs/orders-and-doctrines.md)

- **Government IV (tier 29) and V (tier 45)** — stocked, awaiting your
  review pass; wiring is one enum + `poolOfGovernment` + rows.
- **Government VI** — no adoption rung past 45; needs a seventh tier or
  another gate (the Opus opening, an Æra V entry).
- **Levies vs The Levée en Masse** — same design twice; keep one.
- **Guild Charters** — deferred once as "too many mechanics"; re-cut before
  it enters a pool (note: the user's new charter shortlist in the sheet's
  "proposed additions" is a separate, live thread).
- **The Corps** — backburner: UX first.
- **Your proposed additions** (in the sheet's per-pool "proposed" blocks):
  Rites/Vigil/Scriveners'/Coin/Waterwrights'/Senatus/Toolmakers'/Mint/
  Almshouse/Stargazers'/Justices' charters, Ballad-Weavers, Bell-Founders,
  Reliquary Rolls, Chroniclers of the Fallen, Almoners' Book, and the
  NEEDS-NAME war order — awaiting your "build it" (the growing cards also
  wait on the phase-2 counter schema decision).
Add the proposed additions, let me playtest before we decide on the governement 4,5,6 orders.

## B. Deferred halves on the rows (regenerated from data)

Each waits on the named thing; the prose on the row is player-plain and is
the source. Regenerate with the scratchpad dump after any data pass.

**Orders** — Pilgrim Roads (cap deepening) · Triumphs (renown grant: a
windfall's grants can't reach the renown ladder) · The Standing Levy
(cadence deepening) · Sanctuary (sacking doesn't exist; retired) · The
Escorted Roads (route safety is placeless) · The Dry Docks (heal-in-port is
a hex rule).

**Doctrines** — The Founders' Road (amphitheatre swap) · Mountain Hold
(radius 2) · The Burning Way (chopped-hex memory) · Religious Mandate (war,
conversion immunity, bead bonus — parked tier 0) · The Academy (faith-bought
scholar drafts) · The Sea Charter (founded-with-Harbour) · The Renaissance
Court (stronger legacies) · Absolutism (a wildcard slot is a layout change)
· Blitz (both halves) · The Philosopher's Stone (both) · The Levée en Masse
(border-crossing trigger) · Pax Magistri (no war to forswear) · The Closed
Realm (both — parked tier 0).

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
the destination) · Observatory (mountain sight clause) · Bank
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
standable — a movement ruling).

## C. Open threads

- **Statecraft-close bug** — your deterministic recipe (discovery → culture
  boon → mid-turn draft → slot → dead ×) awaits confirmation on current
  main plus the console/elementsFromPoint probe.
- **Bot honesty** — human ≈5–10× tier-1 yields at t69–75 (the 2026-09-04
  three-batch pass roughly doubled bot food/science; the gap stands).
  Playtest is the judge; the overnight optimizer over `data/ai.json` stands
  ready when wanted.
- **Bot debts, written down in docblocks** — a luxury's signature, the
  citadel's ring and hypothetical percents unpriced; a camp on
  charted-but-left ground over-counted (wants a sim-side camp memory,
  schema); a wounded piece deep in enemy fields does not retreat; purchases
  don't read the unit mix; warscore wants a loss register (schema); the
  balanced endgame slowed (t200 undecided vs t182 — knobs:
  site.ringFalloff, war.escortRadius).
- **Pamphlet shots: 3 outstanding** — move-attack, worker-improve,
  diplomacy-with-a-met-rival need a riper save; captions meanwhile.
- **Playtest questions live** — do the luxury flats *feel* right; does
  Æra III hold its length under real play.
