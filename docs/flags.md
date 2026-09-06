# The Standing Flags

Every OPEN ruling, deferred half, and live thread — nothing here is done.
Pruned 2026-09-05 (second prune) on the user's standing order: a
ruled-and-built item leaves this page the day it lands (its story lives in
`docs/design-history.md`, the batch docs, and git). Three sections: **A** is
decisions only you can make, **B** is rows that ship deferred-with-prose,
**C** is open threads and playtest questions. The user edits this page
directly to confirm rulings — user marginalia are rulings.

## A. Awaiting your ruling

### In flight right now (2026-09-05, evening)

- **Æra III** (`docs/age-three.md`): the three tier-18 government signatures
  as chair-readers, the Pool III doctrine pass (three modified, three added),
  the two rarity moves. Seals VETOED (stay 5). Schema 70.
- **Batch 9 — the late-game cost** (`docs/bot-priorities.md`): profiler
  first; standard map t100 561ms/turn → target ≤200, byte-identical.
- **The push-gate** on the committed chain (tuning → synergy → late pools →
  victory) — pushes on green; the play checkout on :5199 is frozen at the
  victory commit meanwhile.

### From the first full playthrough (2026-09-05, live notes — queued as they arrive)

1. **Worker menu shows only what the ground accepts** (RULED): rows appear
   only where the hex's terrain/feature/hills/seam would take them — a city
   tile shows none, a silk hex shows the plantation alone — greyed only for
   empire/unit reasons (the tech, movement, charges) with the reducer's
   sentence. Implementation: a `groundError` reading in `improvements.ts`
   (the clauses before the tree's gate); the panel filters on it and greys
   on the full error. Lands after the Æra III agent frees the file.
2. **Yields never hide names** (RULED, in flight): The Founding Oath's six
   marks per row cut off building and wonder names in the add-list — the
   name always shows in full, the yields line truncates.
3. **An "All" tab on the add-list** (RULED, in flight): every buildable in
   one list, first and default, each row keeping its kind's eyebrow — newer
   players don't know buildings from units from wonders.

### RULED, awaiting build (after the playthrough)

- **The victory rule** — BUILT (schema 69): 20 beads open the door,
  completing the Great Work wins. One loose end: `src/ui/victoryModal.ts`
  still frames the win as "the frame is full / N of 20 beads" — true but
  reads bead-decided; a wording pass owed.
- **Æra V is acceleration, not content** — DEFERRED until you have had an
  empire reach Æra IV ("i'll need to feel out the pacing for what makes
  sense for age 5"). The game should end around the close of Æra IV; Æra
  V's rows become victory accelerators (Opus cost cuts, bead purses,
  tempo). Nothing Æra V is built or re-cut before then; Gov VI stays
  proposed.
- **The world age** (`docs/age-three.md` §4, your marginalia): the counter
  is the **MEAN age of all players including bots** — "for single player
  campaigns, it should punish you if you're behind the bots." The laggard's
  cost is the point: the wild's tier follows the world age, and a trailing
  human pays rather than catches up. Minimal shape after the playthrough:
  the ceremony → the wild's tier → the cost of trailing.
- **The age scoreboard + clock** — DEFERRED ("an easy fix that we can add
  after playtesting"); the world-age ceremony is its natural home.
- **A wolf in the default game** — RULED, queued: the warmonger seated by
  default, balanced bots less gentle (`war.declareThresholdPeaceful` 4.5 is
  the dial). Lands when the bot is judged threatening enough to seat.
- **Camps** — DEFERRED on the bot side ("a smaller concern"); a player-side
  Wild Hunt payoff (The Wolf-Standard) is deferred on the row until a camp's
  bounty can have more than one destination.
- **The engine view** (`docs/loop-review.md` §3, the Ledger) — bands 1–2
  are a UI batch with no sim change; band 3 wants the lifetime tally
  schema. Not yet scheduled.
- **The balance turn** — direction agreed (ordinary building flats −25%,
  cards carry more of the empire's power), numbers not yet ruled. **Entry
  LIV's supply trim** rides with it, deferred on your word: happiness and
  authority relief should live in cards, not buildings, so tall-vs-wide
  bites.

### Pacing — RULED 2026-09-04 (your marginalia)

"The bot is a bad indicator for actual play… later eras feel too _fast_…
outrageous costs later in the game as part of the skill test. For now, only
look to my playtests as the source of truth." The harness findings are
closed as questions; no pacing knob moves on bot evidence alone.

### Open singles (still yours)

- **Gov VI** — no rung past tier 45; needs a seventh tier or another gate
  when Æra V's shape is decided (deferred with it).
- **The Harvest Songs re-cut** — ships as 10% of food yield, not surplus
  (the surplus reading is circular with the growth percents); say if the
  percent should drop.
- **The Guild Compact** (Gov V, built) ships its production-percent half;
  the Engineer-family renown feed per building is struck (no per-building
  family feed exists) — a shape decision if you want it back.
- **The Tide-Reckoning** (sea routes +50%) — deferred whole: a route's
  MODE is not readable by a card today; one small shape if wanted.
- **The Murmuration** (religion spreads along routes) — stays a proposal; a
  new pressure shape is a design decision for a calmer day.
- **`site.newLuxuryBonus` under the uniqueness reading** — re-swept 2026-09-05
  (14 and 21 both positive, 28 collapses); sits at 14. Sweep again after
  the playthrough with real seeds.

### Standing small items (earlier passes)

- **Settler discount** — "50% faster" ratified; shipped −33%. Confirm or
  move to −50%.
- **Temple** — −25% foreign-pressure defence semantics (was −50%).
- **`redraftBeliefs`** — kept through the faith rework; keep or retire.
- **The Sea Peoples** — waits on a plundering-costs-no-movement rule.
- **The Mint (Æra IV row) vs the Coinworks** — two gold-culture buildings
  now; reconcile at the balance turn.
- **Inquisitor badge** — wears the augur's candle; own art owed.
- **Rite windfall toast** — a rite's hammers can complete a wonder with no
  toast (`RiteResult` gap).
- **The Banner line has a card but no drawn mark** — The Banner-Call flies
  `forge` because `CardLine` is a closed union with drawn marks; adding 🎖
  is an art pass.

## B. Deferred halves on the rows (regenerated from data)

Each waits on the named thing; the prose on the row is player-plain and is
the source. Regenerate with the scratchpad dump after any data pass. Your
ruling 2026-09-04 stands: every deferral stays; anything relying on a
removed system was re-cut with the levelling axe.

**Orders** — Triumphs (renown grant: a windfall's grants can't reach the
renown ladder) · Sanctuary (sacking doesn't exist; retired) · The Escorted
Roads (route safety is placeless) · The Dry Docks (heal-in-port is a hex
rule) · The Wolf-Standard (a camp's bounty has one destination) · The Far
Charts' second half (route reach off sightings is a `trade.ts` rule) · The
Tide-Reckoning (route mode unreadable) · the late-pool strikes (King's
Road's roads, Siege Train's adjacency, Patrons'/Guild Compact's/
Manufactories' family renown, Court Astronomers' wonder bounty, The
Consistory's rite duration, Forced March's penalty, Admiralty's embarked
defence, The Salon's renown price, The Silk Exchange's imported luxuries,
The Inquisition's temple-less penalty, The Magister's Court's second charge).

**Doctrines** — The Founders' Road (amphitheatre swap) · Mountain Hold
(radius 2) · The Burning Way (chopped-hex memory) · Religious Mandate (war,
conversion immunity, bead bonus — parked tier 0) · The Academy (faith-bought
scholar drafts) · The Sea Charter's founded-with-Harbour half · The
Renaissance Court's stronger-legacies half · Absolutism's longer-seal half ·
Blitz (retired to proposed — no stock half) · The Philosopher's Stone's
Distillery half · The Closed Realm (both — parked tier 0) · The
Horse-Tribes' flat-ground and stable halves.

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
the destination) · Observatory's mountain sight clause · Bank
(routes-ending-here count) · The Cistern's fields half (a building waters
its town, not its hexes) · **The Magnum Opus (the culture pillar)**.

**Great people** — Sin-lēqi-unninni (Hall of Deeds is gone) · Leonardo
(project halving) · Mimar Sinan (cathedral discount) · Yi Sun-sin (naval
strength) · Dinocrates (a wonder-occasion legacy).

**Beliefs** — Holy Order (faith-bought fighting order) · Theocratic Mandate
(claims on followers) · The Promised Land (faith at a founding is a third
way to press).

**Numbers to tune (v55)** — Stele of Laws (50⚙, worse per hammer than the
Monument) · Stone Walls (55⚙) · Workshop (net −1 late vs the old renewal
path) · Floating Gardens (+1🌾+1💰; the lake half waits on lakes being
standable — a movement ruling; pit lakes now exist on big maps).

## C. Open threads

- **Statecraft-close bug** — your deterministic recipe (discovery → culture
  boon → mid-turn draft → slot → dead ×) awaits confirmation on current
  main plus the console/elementsFromPoint probe.
- **Bot honesty — RULED into context**: the bot is not a balance baseline
  until significantly improved; playtests are the source of truth. The
  arena (`arena.html`) and the grid search (`scripts/gridSearch.ts`) are the
  instruments; the OFAT baseline needs re-running after the playthrough's
  tunings, on real seeds.
- **Bot debts, written down in docblocks** — a luxury's signature, the
  citadel's ring and hypothetical percents unpriced; a camp on
  charted-but-left ground over-counted; a wounded piece deep in enemy
  fields does not retreat; purchases don't read the unit mix; warscore
  wants a loss register (schema); the route reading under-reads a caravan
  (`score.caravanScale` 3 is the stand-in — the road's march and the
  destination's growth are the missing terms); naval is a hard null; the
  war economy's baselines sit outside the currency; the bot's culture plan
  prices drafts but a pass never conditions on the hand it just saw.
- **Late-game cost** — batch 9 in flight (above); if your game's End Turn
  drags past ~t100 on standard, say so and it jumps the queue.
- **Pamphlet shots: 3 outstanding** — move-attack, worker-improve,
  diplomacy-with-a-met-rival need a riper save; captions meanwhile.
- **Closed by your marginalia, for the record**: mid-peace expulsion (not
  now) · barbarian red rim (keep) · 4.5× declare (tune in playtest) ·
  project-headed towns (Civ V behaviour, confirmed) · authority roominess
  (defer to playtest) · camera easing (not needed; pan lock shipped) ·
  the seal lengthening (vetoed — slot-in/out is skill expression).
- **Playtest questions live** — the seven-line log: turn of each draft, the
  first pass and why, when slots first feel contested, the turn the wild
  stops mattering, when each age turns, beads per age, any stamp that
  surprised you.
