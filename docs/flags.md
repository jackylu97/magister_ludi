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

- **Æra III** — LANDED (schema 70, committed, in the push-gate queue). Three
  strokes for your eye from the build: (a) **Imperium's +3 authority is cut,
  not moved** — the ruled table had no authority clause and your Hegemony
  bracket dropped the capacity ladder, so the war path is 3 capacity poorer
  across this pass; (b) **"captured cities cost no authority" ships as
  costing 1** — `cityCosts` floors a captured town at one point by design
  (so stacking cards can't make conquest free); zero needs the floor
  lowered, one line on your word; (c) **Hegemony's capture bonus ships as
  +5% production for 10 turns** (the Triumphal Way's duration) — your
  bracket named no length.
- **Batch 9 — the late-game cost** (`docs/bot-priorities.md`) — LANDED,
  target not met: a 100-turn standard game 321s → 73s (t76–100 5×),
  byte-identical to t75 on six acceptance games. Two thirds of the old cost
  was ONE turn: a seat live-locked on research (392 re-aims in a turn,
  alternating two negative chains) until the command budget cut it off —
  bounded by `driver.reaimsPerTurn` (1). What is left is sim-side, not the
  bot's: `effectsOfKind` rebuilds the whole `liveEffects` list per query
  (115k–179k calls a turn for at most two distinct answers) — a hoist for a
  statecraft batch, next. Also queued: a warning when a seat exhausts its
  command budget, so the next live-lock is seen the turn it starts.
- **The push-gate** on the committed chain (tuning → synergy → late pools →
  victory) — pushes on green; the play checkout on :5199 is frozen at the
  victory commit meanwhile.

### From the first full playthrough (2026-09-05, live notes — queued as they arrive)

**Standing rule while the game is live**: nothing writes to the play checkout
(`/tmp/webciv-play`, :5199) — a file change forces a reload on the player.
Fixes queue in main for the next session unless the user says otherwise.


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
3. **An "All" tab on the add-list** — LANDED (cherry-picked onto the play
   checkout, save-safe).
4. **The tile readout bottom-right under the city mode** — LANDED, same.
5. **"Has produced" on order cards** (RULED): the stamp design's phase 2 —
   a lifetime tally per owned order, per voice, written by `collectYields`
   from the card's own breakdown lines (the growing cards' tally register
   is the shape), printed on the face as "has produced". Schema. Lands
   after the perf agent frees `cities.ts`.
6. **Doctrines wear the stamp** — LANDED. (Governments' charter block is
   prose, not a card, and "without your government" has no reading — a
   design ruling if you want a figure there.)
7. **Charter cards describe their building** — LANDED: the unlock clause
   composes the building's own describer at print time ("unlocks the Chapel —
   +1 faith; a rite performed in this city pays +5 culture"); the compendium's
   building entries read the same sim-side describer. (The Assembly Hall's
   capital-only gate stays on the compendium row, not the charter face — a
   third scope vocabulary otherwise; say the word if you want it on the face.)
8. **The Library's +2 gold** — REMOVED on your word (it had been on the row
   since the tree pass of 2026-08-30).
9. **The Ledger** — bands 1–2 LANDED (the eighth sheet; every yield chip but
   culture's opens it on its own voice; this turn's yields by source class
   with the deck's slice in grape, and the per-turn curve since the game
   opened, era ticks on the axis, page memory only). Band 3 ("has produced" —
   the lifetime tally per owned order, schema) follows the moment the perf
   agent frees `cities.ts`. Two data collisions the sheet found, yours:
   `theEncyclopaedia`, `theTithe`, `theStandingArmy` are Doctrine ids AND
   bead-row ids; `theTurningHeavens` is a building AND a bead grant — the
   id spaces are meant to be disjoint. Worth a browser look (no jsdom here).
10. **Religion cards join the ceremony** — LANDED: every class deals a full
    tarot face and flips (orders, charters, doctrines, great people already
    did; beliefs were the plain one — now their axis glyph sits on the plate
    and the eyebrow says "a god / a follower belief / an enhancer belief");
    standing faces stay compact and wear the landed stamp. Found and fixed on
    the way: a follower belief's stamp counted every town as keeping the
    faith (8 culture printed where 4 was true).
11. **The great-person gate moves to Epic Poetry** — LANDED (one JSON row:
    `ancestorRites` off The High Temple, onto Epic Poetry; renown answered
    too early, and the poets keeping the roll of names reads better than the
    temple). The queued `techDoc` sync is the only ripple.
12. **A worker may remove an improvement for free** (BUILT): a
    `removeImprovement` verb on the worker (builder units) that tears out an
    improvement on ground the empire owns, spends **no charge**, and pays
    nothing — the opposite of pillage, which is a raider's verb on foreign
    ground. It costs the worker's action for the turn like a build does. The
    hex goes bare (the monotone suppression rule: bare ground stays bare on
    the board, as after a pillage). No refund, no yield, no toast beyond the
    ordinary refresh; the tile's yield refreshes at once (register entry 22).
    The road stays: a raid takes the road up with the farm because a raid takes
    what has been built on the hex, and this is not a raid.
13. **The build queue is cut off once it is long enough to scroll** — FIXED
    in main (cause: note 4's readout, moved to the bottom-right corner, stood
    on the work rail's own footprint, so a queue long enough to reach the
    bottom of the screen vanished under the hex readout whenever a hex was
    hovered). The readout now sits clear of the rail — bottom edge, just left
    of it — at both rail widths. The rail itself scrolls as it always did.
    Your play checkout carries the old placement until the next session.
14. **End Turn holds the button down while the bots think** — LANDED: the
    press is two halves. Click → the button raises on its own frame and
    reads "The others are moving…" (disabled, raised, not the spent plate) →
    a frame and a timeout later the bots are driven → the turn advances with
    the three beats as before. ⏎ goes through the same press. One stated
    gap: a soft statecraft-pause press wears the working state for one frame
    before its card goes up. (The pause itself shrank 8× with batches 9 and
    10; the play checkout still runs the old bot unless you say otherwise.)
15. **Monasteries need a rework** (NOTED, no action yet — your call on the
    shape when you're back from the game).
16. **Players spawn too far apart** (NOTED, no action yet): try **six players
    on the standard map** as the next playtest's seating before touching
    `data/mapgen.json`'s start-position spacing — the same map with more seats
    is the cheaper experiment.
17. **"I'm just building more buildings in my cities"** (NOTED — a reading
    for the balance turn, `docs/loop-review.md`'s direction: cards carry more
    of the empire's power, building flats −25%). Your turn-92 snapshot, six
    cities, for the ledger:

    | food | prod | gold | science | culture | faith | happiness | authority |
    |---|---|---|---|---|---|---|---|
    | 211 | 131 | 143 | 200 | 195 | 59 | 28 | 6 |

    Against the bot at t75 (science 28–63 a seat, 3–5 towns) this is the
    3–4× gap the audit measured, now with a turn number on the human side.
    The balance turn's numbers are still yours to rule.

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
