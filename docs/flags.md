# The Standing Flags

Every OPEN ruling, deferred half, and live thread — nothing here is done.
Pruned 2026-09-05 (second prune) on the user's standing order: a
ruled-and-built item leaves this page the day it lands (its story lives in
`docs/design-history.md`, the batch docs, and git). Three sections: **A** is
decisions only you can make, **B** is rows that ship deferred-with-prose,
**C** is open threads and playtest questions. The user edits this page
directly to confirm rulings — user marginalia are rulings.

## A. Awaiting your ruling

### In flight right now (2026-09-06)

- **The fewer-things pass — BUILDING** (`docs/fewer-things-plan.md`, the
  user: "ok lets implement the plan"): **A** (the shapes — byte-identical,
  no row uses one yet), **B** (the reveal on Confirm, ordered slots) and
  **C1** (the dice out, the faith ladder at 40 · 56 · 72, the reroll from 35
  at ×1.35 a use, schema 71) — LANDED in main. **C2** (rites as city verbs,
  the prophet's four acts, the apostle) and **D** (buildings with chains, the
  cut, the five uniques, schema 73) — in flight. E (the tree's gifts), F (the
  order pass), F2 (the bot drafts engines), G (cadence and chairs) follow.
  **C2 and D LANDED** (schema 74). D measured the science cut against the
  scripted empire: Æra I close 66 → 236 — the base beaker halved is floored
  per town, so a size-1 town banked nothing. **RULED (the user, 2026-09-06):
  "yields are valid as decimals — don't show this to the player, but behind
  the scenes all yields are calculated exactly."** A new batch, **X — exact
  yields**, lands before the pacing re-aim: every fold carries fractions
  (no per-source or per-stage floor), banks and pools hold the exact figure,
  every printed number rounds at the surface only. The floor question is
  closed by it; the beaker stays at 0.5. **E LANDED** in the tree (schema
  76; every gift a data row; Machinery's road step an empire fact in
  fifteenths; Irrigation's gift already stood as the farm's line and was
  left alone; the Water Clock keeps its rider). Measured with X under it:
  Æra I close 236 → 80 against a 56–76 band — exact yields recover nearly
  all of D's slide; E adds a few turns. **X and E LANDED together** (main
  3ede042). **The re-aim LANDED** (c1307fd): Æra closes 80 / 156 / 481 /
  999; Gov I 40, Gov III 275; the one-city seat's Opus at t3959;
  `religion.slow` repaired to the faith ladder. **F (the order pass) LANDED
  in the tree** (schema 77; 167 live rows, 45 retired, 34 new; the census
  reads 15% engines · 39% payoffs · 46% standalones — engines ten points
  light against the ruled 25 because the line readers were withdrawn; eight
  rows carry a `deferred` line: the four Æra V bead Orders (no bead-granting
  effect and no occasion for a draft passed / a city razed / a proclamation /
  an Æra V tech — dealt, paying nothing until those land), the Reckless
  Levy's per-unit surcharge, the Silk Exchange's destination reading, the
  Guild Compact's specialist count, the Jubilee's second boon (one chair
  keeps one clock). The bot under-prices the Exchequer (`effectAmplifier`
  is a stand-in) — F2's. **F and G LANDED in main** (F 9362cac, G 7bd4e1d:
  exponent 2.8, chairs 8 · 10 · 12 from Government III up, schema 78).
  **F2 LANDED** (b8a5ca2: a scratch-board margin for the fourteen engine
  rows; six of seven acceptance games byte-identical). **The pass is built.**
  The play checkout on :5199 is refreshed to b8a5ca2 for the second
  playthrough (schema 78 — the turn-92 save does not load). Main on GitHub
  is still at the vein shelving: the all-tier gate for the push is running
  (capped at three workers) on the user's word; the push follows on green.
  **The audit is in flight** (the user: "do a pass on the codebase —
  thoroughly read through bonus logic … feature bloat … simplified … unified
  … not built … long deprecated"): three read-only readers, one file each —
  `docs/audit/bonuses.md` (every bonus from row to fold to surface to the
  bot's price; previews computed beside a fold are findings),
  `docs/audit/simplify.md` (duplications, vocabulary sprawl, structural
  cuts, the brittle pins), `docs/audit/dead-code.md` (declared-never-built,
  deprecated-and-kept, unread exports and knobs, docs now false). **All
  three landed, plus the orchestrator's own pass — `docs/audit/
  orchestrator.md` is the summary and the fix queue.** Confirmed by reading:
  a route's science and culture never reach the city fold (Ledger Keepers
  pays nothing on a domestic route); a positive unit-upkeep percent is
  dropped (the Reckless Levy's cost is never charged); the top bar and the
  Ledger omit the sender's foreign-route income the turn banks; the bot
  prices 23 of 46 shapes with one stand-in and its margin is blind to
  empire lines. Surprises: three live signature clauses (The Commonwealth,
  The Magisterium, The Academy) open a great-person draft no surface ever
  offers; six draftable cards carry no effect; `src/proto3d/` is 2,126
  dead lines and a ninth root page. **H1 (the fold pays what the rows say)
  and H2 (the bot reads the whole deck) are in flight**; H3 (the draft the
  cards promise), H4 (dead weight), H5 (one modal shell, shared helpers),
  H6 (luxuries as cards — high risk) wait for your markup.
  **Rulings 2026-09-06, evening** (the user): (a) **the Reckless Levy's
  cost is +1 maintenance per unit** — a flat per-unit charge, not a percent
  (H1 carries it); (b) **the faith hover shows what the next pantheon rung
  costs** — the faith ladder's next threshold and how far the bank is from
  it; (c) **augurs leave Stonehenge and the religion panel** — Stonehenge's
  completion grant becomes a free rung of the faith ladder (the orchestrator's
  reading of "remove augurs": the same gift, a god, without the unit — say
  if you meant something else), the panel's augur block goes; (d) **the
  religion panel is reworked around the cards**: the pantheon's three faces
  and the belief rungs as the sheet's subject (full faces, stamps, the next
  rung's price and the bank's progress toward it), the tide and the
  purchases (prophet · apostle · inquisitor) secondary. Batch **H7 — the
  faith sheet** in flight. (e) **Pantheon rerolls are not free** — "it looks
  like I'm allowed unlimited rerolls on my pantheon beliefs?": C1 read "great
  prophets treated as free" as every belief hand; corrected in main — the
  ladder's hand (the one carrying a rung) pays the Order draft's price and
  counts, a prophet's hand stays free. (f) **Winter Mother pays +1 faith on
  every tundra hex**, not only wooded tundra (one tile line: +1🌾 +1🕯 on
  tundra). (g) **A barbarian camp keeps one unit fortified on the camp tile
  before sending units out** — a fourth derived role beside raider / thief /
  escort / cargo (`barbarianRoles` derives per turn, never stores): the
  camp's first standing unit is its **warden**, holds the camp hex and
  fortifies; every further muster raids as now. A camp whose warden dies
  keeps its next-mustered piece home. Batch **H8 — the warden** in flight.
  (h) **Forests more diffuse** (mapgen): "currently forests spawn in huge
  patches — smaller patches of forest across the map, and some unforested
  tiles breaking up the large patches." The feature pass's forest scatter
  gets a finer grain (smaller clumps, more of them) and a clearing rule
  inside a large patch; the density (forest share of land) stays where it
  is unless the mapgen page says otherwise. A map change moves every seed's
  replay — schema. Batch **H9 — the woods** in flight; `mapgen.html` is the
  eye. Two findings from the re-aim, yours to rule:
  1. ~~The rite door is a lottery~~ — **my misreading, corrected**: the
     user's ruling was always "unlock rites in the tech tree where they used
     to be"; C2's Chapel gate is removed (the tree is the only gate; the
     Chapel keeps its culture-on-a-rite bonus). `religion.slow` re-aims
     once more to town rites.
  2. **Game length.** The scripted five-town empire closes Æra IV at t999
     (was 779); the one-city seat opens the Opus at t3959 (was 1689). Your
     own game runs 3–4× the bots' pace, so this is a harness reading, not a
     verdict — but "ends around the close of Æra IV" wants the next
     playtest's number.
  3. **The purse is under water.** The five-town harness crosses zero gold
     near t90 and ends at −22,000 by t900; the one-city seat near t900. The
     debt rule's quarter off science and culture is most of the late slide.
     The Library's gold left, Markets lost a coin, and no scripted empire
     buys or disbands. The bots stay solvent; you were +143 at t92. Worth a
     look at the coin side before the second playthrough — the Bank's per-
     citizen line and the Counting Houses are the deck's answer; the tree
     has none. One gate per batch; one schema per batch that
  changes a save (71 → 75). The play checkout on :5199 stays where it is.

### In flight earlier (2026-09-05, evening)

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
- **Batch 10 — the evaluator remembers** — LANDED: `liveEffects` memoised
  per seat on a value print of its inputs (a source register pins the two in
  step); 82s → 43s on the 100-turn game, seven hash pairs identical.
- **Batch 11 — the focus arm holds its word; the levy counts field
  soldiers** — LANDED (`docs/bot-priorities.md`): the border curve exposed a
  town being re-pointed 40+ times in one turn (a staged food total patched
  by a raw tile difference; a stale seat count the turn after growth; the
  board moving mid-turn) — fixed by construction, plus `BotSitting.focused`
  as the bound. And a seat with three scouts and one warrior read itself as
  half-levied, so a column at the gate lost to a worker by a third of a
  point — `isFieldSoldier` (combatant, not explorer, not naval) is now the
  one predicate the levy and the mix ask. One written-down gap: the focus
  arm has no incumbency margin, so a lean near zero can flip on consecutive
  turns (never twice in one).
- **The push-gate**: main on GitHub is at the re-aimed fixtures; everything
  since (border growth, the consecration line, camp cadence, civilian
  capture, the bot batch, the balance-turn doc) pushes on the running
  all-tier gate. The play checkout on :5199 stays frozen at the victory
  commit unless you say otherwise.

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
   since the tree pass of 2026-08-30). **A side effect for your eye**: a
   library now costs its maintenance and pays no coin back, and the scripted
   five-town pacing empire (a library in every town, nothing else paying
   coin) crosses into debt around turn 90 and never climbs out — the debt
   rule docks science and culture a quarter from then on, so its Æra III/IV
   closes slipped ~90/105 turns (fixtures re-aimed, dated). Your empire at
   t92 is +143💰 and the bots stay solvent in the arena, so no action — but
   the balance turn's building trim should keep an eye on the coin side.
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
18. **An Æra II cavalry unit** (NOTED for the future, no action): the mounted
    line has no rung in the Age of Heroes. A row in `data/units.json` with
    its tech placement (a chart question — the lanes are yours) and an
    escalation ladder; joins `pieces.html` in the same pass. Needs a
    strategic (horses?) ruling — the seam is the resource row.
19. **Border growth +25%** — RULED and LANDED (your playtest, t92): the
    border cost curve's two height terms take a fifth off (6 · 4 · 1.45 →
    5 · 3.2 · 1.45; the exponent keeps the 2026-08-28 shape), so every tile
    costs ~80% and the same culture buys a quarter more ground. Schedule
    5 · 8 · 13 · 20 · 28 · 37 · 48 · 58 against 6 · 10 · 16 · 25 · 35 · 47 ·
    59 · 73.
20. **Mapgen: every capital has both horses and iron within six tiles**
    (RULED, queued — "note for mapgen"): a start-position guarantee in
    `data/mapgen.json`'s terms (the strategic pass places or moves one copy
    of each inside radius 6 of every seat's start; the seat's own reveal
    tech still gates seeing it). Lands with the next mapgen batch, after the
    six-player standard-map seating experiment (note 16), since both touch
    start positions. `docs/mapgen.md` documents it when it lands.
21. **A city's consecration is printed nowhere after the toast** (BUG, in
    flight): the cathedral's roll lands on `City.consecration`, is announced
    once, and no surface names it again. The Built row (the town rail's
    standing facts) prints it under the Cathedral — "consecrated to the
    Hearth Mother" with the consecration's own clauses from its describer,
    as a keyword ref into the compendium's consecration entry.
22. **Archers capture civilians on right-click; today they shoot them** —
    LANDED: a hex holding only foreign civilians is taken by walking onto it
    (the one capture seam), for every combatant at war with their owner;
    right-click there is a move, the red tint and the fight card stay off,
    and the reducer refuses the shot ("A Settler is taken by walking onto
    it, not shot at" — a laden caravan "is plundered by walking onto it").
    A civilian beside a soldier is shielded as before; an embarked worker is
    still shot (nothing can stop on its hex). One follow-up, queued: the
    **wild's ranged thief** now has its blow refused where it used to kill
    the prey — the worker survives, so no regression, but the coherent fix
    is one line in `barbarians.ts` (the thief marches onto the hex, which
    the widening made legal).
24. **The bar's authority meter is cut off once the yields grow** — LANDED:
    the strip measures itself (scroll width against width — a container
    query cannot see *content* grow a digit) and takes the first of two
    smaller steps that fits (12.5 → 11.5 → 10.5px figures, gaps closing
    with them), re-measured on resize and whenever the printed figures
    change, stepping back up when a figure loses a digit. Meters step with
    the yields; chips stay buttons; every figure tabular mono. Not eyeballed
    live (no browser in the session) — a narrow-window drag on a running
    game is the quick human check.
23. **Barbarian camps refill too fast** — RULED and LANDED (your playtest,
    t92: "once you kill the barb standing on the camp, it respawns very
    quickly"): a camp musters a unit every **five** turns, not three
    (`barbarians.unitEveryTurns`). The camp-founding faucet (three camps
    every two turns, cap 24) is untouched — the complaint was the refill,
    not the count. If the wild now reads too thin, the faucet is the next
    dial and yours.

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
- **The balance turn** — RULED in direction 2026-09-05 (turn 92 of the
  first playthrough): **orders get more powerful, everything else is nerfed
  a little** — "the orders don't feel very consequential currently outside
  of a few of them", and **the Æra III orders most of all** (the fork is
  meant to be the power spike). Earlier half of the same direction stands:
  ordinary building flats −25%, cards carry more of the empire's power.
  **Numbers not yet ruled**: `docs/balance-turn.md` — DRAFTED, awaiting
  your markup: every order weighed against the turn-92 reading (note 17), a
  diagnosis, a proposed column per pool, the nerf side, and the decisions
  only you can make. Nothing under `data/` moves until you mark it. Three
  findings from the audit worth reading first: (a) **eighteen live rows pay
  nothing** — the happiness tier clamp caps the bonus at the +10 rung and
  your empire reads 28, so every pure-cheer clause is dead; (b) faith is
  the smallest voice, so the same shape pays a fifth of faith and a
  thirtieth of science — the faith commons audit as the strongest cards by
  accident; (c) Æra III is not a spike because the *shapes* don't change at
  the fork, and Gov IV audits below Gov II. The −25% on building flats
  touches science not at all (science lives per citizen). **Entry LIV's supply trim** rides with it, deferred on your word:
  happiness and authority relief should live in cards, not buildings, so
  tall-vs-wide bites.

### Scripted harnesses — RULED 2026-09-06 ("can we stop using scripted bots for measuring changes")

- The scripted-empire harnesses (`tech.slow`, `statecraftPacing.slow`,
  `endgame.slow`, `beads.slow`, `religion.slow`) **report their figures and
  assert only machinery** (the ages close inside the horizon, the chart runs
  out, a draft is dealt, a faith is founded, a replay is byte-identical). No
  band, no re-aim after a pass. Pacing is judged by the user's playtests, as
  the 2026-09-04 ruling below already said. A batch that moves a figure
  prints the new one and says so in its report; nothing blocks on it.
- The bot arena (`aiBot.slow`, `aiDecision.slow`) is a real bot, not a
  script — its solvency and coverage claims stay.

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

### The tedium thread (2026-09-06, the user's overriding impression of the first playthrough)

"Many of the mechanics felt tedious — so many buildings with similar effects;
I never wanted to invest in my chapel because I was so far ahead and didn't
want to waste time paying for augurs and using them in my cities. I couldn't
notice where the surveyable mines were in my territory." Three threads, no
rulings yet:

- **Buildings**: too many rows that are a flat with a different name. The
  balance turn's building trim is the wrong tool for this — the fix is
  *fewer* buildings, each a shape (a per-citizen line, a percentage, a
  district-like condition), with the flats folded into cards. Proposal owed:
  a cut list per age, with what each surviving building is *for*.
- **Augurs and rites**: a unit bought with faith, walked to a town, told to
  perform a timed rite — value per click too low, and worthless when ahead.
  Candidate shapes: rites become a city verb paid in faith (no unit; the
  Chapel is the door), or the augur folds into the prophet and rites into
  consecrations/beliefs (passive faith). The Chapel then has to be *for*
  something the leader still wants.
- **Veins**: the surveyable hills are invisible — nothing marks a hex that
  `prospect` would answer. Candidate: the lens (or the worker's reachable
  highlight) marks prospectable hills once the tech is held; or a survey is
  automatic when a worker rests on the hex. Small, and a UI ruling.
- **Bigger, rarer choices; cards that combo** (2026-09-06, the user): "I
  ended up with generically strong orders across the board, it didn't feel
  like the cards had synergy with each other… the faith-oriented build
  didn't make me really change how I played… I almost feel like we need to
  include a proportion of cards that don't really do much on their own, but
  combo nicely with other cards." Direction, not yet numbers: the deck gets
  **engines** (weak alone, read other cards by tag) and **payoffs** (scale
  with what is slotted beside them) beside a smaller share of standalone
  flats; a path (faith, war, trade, growth) has to be a different *engine*
  for the primary yields, not a side dish. `docs/fewer-things.md` — DRAFTED,
  awaiting your markup: the choice-size ladder, 38 → 19 buildings per age
  with a clause each, the augur options (recommends A split by act: rites a
  city verb, the augur a rare consecrator), the engine/payoff/standalone
  shares (25/30/45 — standalones are the fuel), one required new shape
  (`slottedOrdersOfLine` — the twelve `CardLine`s already on every row,
  switched on as a readable tag), and the finding that supersedes
  `cards-pass-2.md` §E.3: the draft cadence is NOT the problem (20 drafts by
  t92 on your own culture curve) — fewer, bigger drafts (`costExponent`
  2.25 → 2.8 with chairs down a quarter) is the coupled proposal. Largest
  bot debt: the draft plan prices cards alone, so it can never draft an
  engine — a marginal reading `V(deck ∪ card) − V(deck)` is the fix.
  **Rulings from the markup (2026-09-06)** — `docs/fewer-things.md` §7:
  the engine shapes are the user's five (amplifier by voice over card yields;
  building-yield percent by category; a "yields X" tile test; a periodic
  occasion with its own period-shortener; the slot-position reader — **slots
  are ordered as drawn, the topmost economic slot is the first**); lines stay
  drawn marks with three readable (War, Faith, Trade); **an unconfirmed card
  in a slot shows no yields — Confirm locks it and the aggregate fires**
  (the count-up is the scoring moment); **faith replaces the Magister's
  dice** — the dice go entirely, a faith reroll of a draft costs by age and
  by rerolls so far, printed as the rising price it is; the prophet's
  empire-wide rite is one of the five city rites cast everywhere; the
  apostle and a relic (faith per turn, once per cathedral) are faith's
  "magisterial supplement" ideas, open; buildings keep prerequisite chains.
  **Third pass (2026-09-06)** — every open item answered, folded into
  `docs/fewer-things.md` (§6 is the record): all twelve lines readable;
  cadence 2.8 and chairs down a quarter incl. Gov IV/V; ten chains; the
  Chapel pays culture on a rite (no gate — the tree is the only gate); the Cathedral keeps its roll; Court Augurs
  renamed to pay every city with an active rite; grants ignore chains; the
  faith ladder shaped like the augur's old prices; reroll from 35 faith at
  a slight exponent, prophets free; the apostle's third act is the relic;
  the base beaker halves and science moves into orders (the next playtest
  calibrates); three projects (production → gold / science / culture);
  veins marked, with hidden unique minerals. **Still open: the rites' faith
  price and per-city seal** (a default is proposed there).
  `docs/tech-gifts.md` — MARKED UP and folded (2026-09-06): **unique
  buildings, once per empire, as each age's anchor** (Heroic Epic · Imperial
  Throne · High Temple · Forum · the Caravanserai returned as the route hub;
  priced at half a wonder of the age; effects city-scoped bar the Throne's
  authority); the nodes' own gifts as the user wrote them (Movable Type's
  connected-city percents, Machinery's roads at a fifth, The Silk Road's
  endpoint luxuries, Horology's two periodic figures — "bursts are strong");
  the apostle at Theology; eight small shapes beside fewer-things' ten.
  `docs/orders-pass-3.md` — MARKED UP (2026-09-06), folded in its §9: the
  grammar is **put yields on a thing, then multiply the thing** (routes,
  Markets, the capital, great works, faith buildings — multipliers late,
  rare, applied last); **line readers withdrawn** for Orders (slot-flavour
  counts stay — CONFIRMED; `CardLine` is a drawn mark only); amplifiers stack additively; early pools
  lean standalone; periodic conversions (science↔faith↔culture, gold→science)
  as bursts; the cheer rows kept and the clamp left as is until the next playtest; the shrine engine tallies faith rerolls;
  four Gov V "just win now" bead Orders. All four questions in §9 answered. And
  `docs/veins.md` — **SHELVED on your word (2026-09-06)**: the layer was
  unreachable for most of a game (its gate an Æra IV node) and a survey is
  the small frequent click this pass removes. `veins.share` is 0 (the last
  mapgen pass — every seed's ground stays bit-identical); the verb stays
  greyed by the tree; Geomancy keeps its mine line. In the drawer: the rare
  minerals as tech-revealed surface luxuries, no verb, when wanted.

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
