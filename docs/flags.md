# The Standing Flags

Every OPEN ruling, deferred half and live thread — **nothing here is done**. The
log of rulings already made and built moved to `docs/history/flags-log.md` on
2026-09-11, item letters kept, so a citation like "(pppp)" or "(eeee)" resolves
there. A ruled-and-built item leaves this page the day it lands; its story lives
in the log, in `docs/history/design-history.md` and in git.

Three sections: **A** is the questions only the user can answer, **B** is rows
that ship deferred-with-prose, **C** is open threads and playtest questions. The
user edits this page directly — user marginalia are rulings.

## A. Awaiting your ruling

One paragraph a question, in the words the state of the tree makes them now.
The letter is the item the question came out of; the item's full history is in
`docs/history/flags-log.md`.

### Balance figures the user has not yet set

- **(nnn) · (hhh) The wager's bars, and the bead threshold.** Every bar in
  `docs/wager.md`'s deck is a bench figure, not the user's. Two — The Academies
  and The Contented Realm — were already cut well below the bench by ruling; the
  other twenty-two stand as measured. `rules.threshold` is **7**, two-thirds of a
  two-seat bench reading, and is likewise awaiting the user's own figure. The
  doc's table is sync-tested, so data and doc move together.
- **(ttt) The strength ladder's leftovers.** Three things the U9 pass left for a
  ruling: the `armyStrength` wager bars (375 · 1200 · 2500) that rode the ladder
  ×2.5; **the naval triangle now kills in one blow** — a light hull on a gun deck
  is a 10-point gap plus the two ±10 naval lines, which is a kill, and the lines
  at ×1.5 instead of ×2 is the lever if that is too sharp; and a **cost
  inversion** — the Legionary (40 strength, 54⚙, column 6) is stronger *and*
  cheaper than the Horseman (38, 101⚙, column 7), a column artefact.
- **(ppp) The waterline's three percentages.** `landRangedVsShipPercent`,
  `landSiegeVsShipPercent` and `embarkedCounterPercent` are first cuts. Beside
  them: the taking of a town is a melee kill on the **garrison** beat, and
  whether the user meant the **walls** beat too is unanswered.
- **(kkk) The Assize Court's relief.** Crowding is gone and a town's demand is
  linear in its citizens; the Court forgives a share of that demand. Fifteen per
  cent of the whole citizen line is deliberately more than fifteen per cent of a
  surcharge was — the figure is the user's to retune.
- **(hhh) The renown ladder, and the one-city pace.** The ladder is
  `floor(75 + 225n + n^2.8)`; whether halving the arrivals was enough or the step
  goes again is the user's call. Beside it: a one-city empire reaches the Opus
  around turn 4800 on the harness, and whether that is the pacing wanted has
  never been answered.
- **(qqq) · (xxx) The baseline the balance pass reads.** The tech ladder and the
  happiness figures were fitted while the retired deeds were still injecting
  yields; the wagers now carry that weight alone, and a wager pays beads, not
  yields. Any balance pass starts from the new baseline, not the fitted one.

### The map and the starts

- **(rrrr) · (tttt) Spacing, and a crowded roster.** Starts are
  `spacingFactor` 0.55 × √land, clamped to a floor of 10 and a ceiling of 20.
  The floor is ruled for **six** seats; what a **twelve**-seat standard game
  should do — relax the floor with a report, or refuse the count in the stepper —
  is open. `spacingFactor` itself is the lever if the user wants standard at 16
  rather than 20.
- **(tttt) Duel's river quota fell to half.** `rivers.minLength` 4 → 5 alone
  did it (isolated per knob): on 386 land tiles many traces reach the sea in
  four edges, and duel is under `pitLakeMinTiles` so it has no basin to flood.
  Standard, large, huge and giant fill their quotas. If duel should stay
  riverine the knob is a per-size `minLength` or letting duel pool.
- **(cccc) The luxury guarantee's fallthrough.** A leader's base luxury guarantee
  was tightened to hand-or-nothing, its whole-table fallthrough removed. If a
  seed sweep shows that starves a start, the fallthrough comes back.

### Leaders

- **(dddd) · (jjjj) The rows `data/leaders.json` does not carry.** There is no
  `family` or `spectrum` field, so the new-game screen's family line and spectrum
  bar print nothing and the mockup's two lines are absent. A data decision.
- **(wwww) The leaders' second cut — RULED, unbuilt.** The draft and the boon
  column go; a leader is a bonus plus four uniques granted as the seat's age
  turns, the passives move to six shared **family progressions**, and the
  roster targets twelve at two a family. `docs/leaders.md` "The second cut —
  fixed identity" is the spec; ▢ the six progressions and the second seats are
  the user's to mark up before it flies. The first cut's sixteen boon halves
  are moot under it.
- **(qqqq) Whose movement the row means.** A leader row reading "military units
  regain all movement" is implemented as `isCombatant`; mounted-only would be a
  rule change.

### Religion and great people

- **(qqqq) The Great Ziggurat's dead rider.** Its `purchaseRider` targets
  `consecrates: true`, which today is the **retired** augur alone — a −25% on
  nothing. Aim it at prophets, or take it off the row.
- **(lll) Names, tiers and one reading.** Two renamed great people and several
  new rows carry proposed names and tiers that are the user's to change. Three
  members of the vocabulary (`sightedCities`, `bankedGold`, `strongerTarget`) are
  now read by no row at all.
- **(lll) The trader that cannot be plundered.** `tradersUnplunderable` is read as
  the **plunder** seam — a blow on a laden cart neither plunders nor harms it. If
  "cannot be pillaged" meant something wider, say so.

### Statecraft, cards and the Compendium

- **(dddd) Two shapes the vocabulary lacks.** A **scoped authority-cost** line
  ("cities of kind X cost one fewer authority", three cards want it) and a
  **per-puppet count**. Both are deferred-and-annotated today; building either is
  a design decision.
- **(lll) · (dddd) What the Compendium shows of retired and boon-only rows.** It
  lists retired great people and the forty-seven retired Orders while hiding
  retired buildings — one ruling covers all three. Separately, a pure-boon
  leader card's Compendium entry prints its effects only, where the draft sheet
  composes the lump.
- **(www) The queue floor's edge.** A command that would shorten a works list
  below The Vizier's Hall's floor is refused, because a strict floor deadlocks an
  emptied town — the shape of that refusal is flagged rather than ruled.

### Trade

- **(iii) A route needs a slot, not a Trader.** Currency (the Market) therefore
  gates trade in practice. Whether a technology should open routes in its own
  right is the user's call.
- **(uuu) A sea empire's route count.** With the Harbour and the Shipyard
  slot-less and slots coming from the Market and the Caravanserai by size, a wide
  and thin sea empire runs very few routes — the sea build's identity is thinner
  than it reads.
- **(iii) The idle-trader prompt can offer nothing.** A seat whose only partners
  are out of range or unseen is prompted and finds the sheet empty. The prompt is
  passable; the departure is deliberate (the cheap half of the gate) rather than
  paid for with a pathfind per press.

### The tree, and rows left mid-air

- **(uuu) The Toolmakers' Charter.** It retired when the Smithy moved into Bronze
  Panoply. Re-aim it or leave it retired.
- **(uuu) The Forge's name.** Steel's Forge keeps its name; the Foundry rename
  was only ever to free the word, and the user may still want it.
- **(uuu) The Lighthouse's gold.** It kept its base two gold **beside** the new
  two food; whether the mark meant *instead* is unanswered.
- **(vvv) The Saddle's parents, and the armoured horse's node.** The Saddle sits
  in Æra II with recommended prereqs (Husbandry + Bronzeworking); the armoured
  mounted row and the War Elephant sit at a recommended Iron Working. The lanes
  are the user's chart, so both placements want confirming.

### The bot

- **(sss) The opening build.** `openingScout`'s third clause has always declined,
  so the "scout first" ruling was never actually in force. `military.scoutCap` is
  3 and the seat now stops at its dial. Whether a first build should be
  hard-coded at all is the user's.
- **(www) The two strand weights.** `research.strandWeight` and
  `puppet.strandWeight` are both 0.35 — what a switch is charged for the progress
  it strands. An arena sweep of the pair is owed.
- **(xxx) What the orders pass actually moved.** The Merchant Scholars / Martial
  Law swap and the four "keep" rows are the likely movers in the t100 readings;
  only a playtest reads it.

### Presentation and small debts

- **(rrr) The two families.** `docs/playstyles.md` is open and every ▢ in it is
  the user's, during their balance pass. Nothing in it flies until marked.
- The Compendium does not walk `data/wagers.json`, and the census has no
  Compendium shelf. Two small passes.
- **(nnn) Plainer wager names** are proposed in `docs/wager.md`'s Notes column
  (Bread and Iron → *Full Fields and a Standing Army*, The Six Voices → *The
  Whole Yield*, …); the names in the data are unchanged. Beside them, The
  Patronage's note says "counted from the age's deal" where the other flow rows
  say "added up over the age" — the same thing, worded differently.
- **(nnnn) `lobby.ts`'s `MAX_SEATS`** is still the rules' figure rather than the
  stepper's. They agree at twelve today.
- **(zzz) · (yyy) Replay safety of the U9 figures.** Schema 109 already says a
  v108 log does not replay; whether the exact strength figures want a bump of
  their own is the user's (the recommendation is no — U9 has not been played).

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
  for the primary yields, not a side dish. `docs/history/fewer-things.md` — DRAFTED,
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
  **Rulings from the markup (2026-09-06)** — `docs/history/fewer-things.md` §7:
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
  `docs/history/fewer-things.md` (§6 is the record): all twelve lines readable;
  cadence 2.8 and chairs down a quarter incl. Gov IV/V; ten chains; the
  Chapel pays culture on a rite (no gate — the tree is the only gate); the Cathedral keeps its roll; Court Augurs
  renamed to pay every city with an active rite; grants ignore chains; the
  faith ladder shaped like the augur's old prices; reroll from 35 faith at
  a slight exponent, prophets free; the apostle's third act is the relic;
  the base beaker halves and science moves into orders (the next playtest
  calibrates); three projects (production → gold / science / culture);
  veins marked, with hidden unique minerals. **Still open: the rites' faith
  price and per-city seal** (a default is proposed there).
  `docs/history/tech-gifts.md` — MARKED UP and folded (2026-09-06): **unique
  buildings, once per empire, as each age's anchor** (Heroic Epic · Imperial
  Throne · High Temple · Forum · the Caravanserai returned as the route hub;
  priced at half a wonder of the age; effects city-scoped bar the Throne's
  authority); the nodes' own gifts as the user wrote them (Movable Type's
  connected-city percents, Machinery's roads at a fifth, The Silk Road's
  endpoint luxuries, Horology's two periodic figures — "bursts are strong");
  the apostle at Theology; eight small shapes beside fewer-things' ten.
  `docs/history/orders-pass-3.md` — MARKED UP (2026-09-06), folded in its §9: the
  grammar is **put yields on a thing, then multiply the thing** (routes,
  Markets, the capital, great works, faith buildings — multipliers late,
  rare, applied last); **line readers withdrawn** for Orders (slot-flavour
  counts stay — CONFIRMED; `CardLine` is a drawn mark only); amplifiers stack additively; early pools
  lean standalone; periodic conversions (science↔faith↔culture, gold→science)
  as bursts; the cheer rows kept and the clamp left as is until the next playtest; the shrine engine tallies faith rerolls;
  four Gov V "just win now" bead Orders. All four questions in §9 answered. And
  `docs/deprecated/veins.md` — **SHELVED on your word (2026-09-06)**: the layer was
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
- **The opening build order, yours** (was `docs/flags.md`, folded here
  2026-09-07 by batch H4 — two lines are a flag, not a doc): *"ai needs to
  prioritize early scouts"* and *"my general build order is scout settler
  settler worker, that might not be optimal but first build being a scout
  should be hard-coded."* Unbuilt: nothing in `src/ai/` hard-codes a first
  build.
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
