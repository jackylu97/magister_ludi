# Bot pass 3: does the bot value the new cards properly? (2026-11-12)

The question (the user): *is the bot's logic properly valuing the new cards?*

The short answer: **for most cards that pay yields, yes; for several groups of cards, no.**

- Of 247 yield-paying cards I could measure in three or more board states, 163 have
  a bot price within a factor of two of what the card pays. The flat lines, the
  counted lines, the hex lines, the route lines, the meters and the twelve new
  governments are read well.
- The large errors come from a few readings, not from the new cards one by one.
  The ranked list is Part 5. The biggest are the deck bonus, the windfall riders,
  and every card that pays a percentage.
- No file under `src/`, `data/` or `test/` was changed. All probes are scratch
  files (listed at the end).

The three most surprising findings:

1. **The deck bonus decides 42% of all Order picks.** It is 60% of a typical offered
   card's price. The bots drafted 29 commissions, though 16 of the 23 commissions
   offered had a price of 0 on their own, and two-deck seats end the game with 19
   cards of one deck and none of the other.
2. **Every windfall rider is divided by 20 one time too many.** Over the ten riders
   I could measure, the median bot price is 1/55 of what the rider pays at the
   seat's real pace (Field Academies: 1.9 against 122).
3. **An engine card in a full council is priced as if it removed a seated card.**
   The Bourse reads −930 (the walk says +891 and the card stamp +210), so while its
   council is full the bot will not draft The Bourse, The Age of Improvement, The
   Divine Proportion or The Doctors of the Church.

---

## The bench

- **Code**: branch `decks` at `b7154277`. The working tree held only uncommitted
  docs, so the games ran the committed code.
- **Games**: five six-seat games on the standard board, 150 turns each, wild on,
  the digest's personas (balanced, wide, tall, zealot, warmonger, balanced).
  Driven one decision at a time through `createBotStepper` (`src/ai/stepper.ts`),
  which plays the same game as `driveBots`. No game stalled and no command was
  refused. Each took 436 s to 1188 s with four running at once.
  - Four games seat leaders, so every seat holds two decks, as rivals do in the
    real game (`seatLeaders`): seeds 101, 202, 303 and 404. The leader lists are in
    the Files section.
  - One game seats no leaders, so every seat holds all six decks: seed 20260831,
    the digest's own seed and setup.
- **States**: snapshots at turns 40, 80 and 120 of each game. That is 15 boards and
  90 seat-states.
- **Cards per seat-state**: every card the seat could be offered at that moment:
  the dealt Orders of its decks in its current band (the deal draws only the
  current band, `eligibleFor`), its held Orders, all six Boons, the live Doctrines
  of its decks, all thirteen governments, all 23 pantheon gods, and, when it holds
  a religion, the follower and enhancer beliefs. 14,919 card rows in all.

### What "the bot's price" means here

`explainCard` (`src/ai/council.ts`) is the one price every card decision reads. I
split it into its three terms:

- **effects**: `explainCardEffects` (`src/ai/value.ts`), with a commission's term
  (`explainCommission`) and a charter's term (`explainCharter`);
- **draft grant**: `onDraftWorth`, for a card not yet held;
- **deck bonus**: `score.synergyBonus` (14) for each held card that shares a deck.

The comparisons below use effects plus draft grant, without the deck bonus. The
deck bonus is not a reading of what a card pays, so it gets its own section.

### What "the measured pay" means here

- **The card stamp.** `explainCardImpact` (`src/sim/cardImpact.ts`) is the sim's own
  reading of what a card adds to the empire's books each turn. It seats the card on
  a shallow ghost (in a free chair that fits, or in a chair added for it) and diffs
  the towns, the empire lines, the meters and the knock-ons. I weigh it at the
  seat's own bot weights (`voiceWeight`, `meterWeight`, `weights.renown`), so both
  figures are in one currency and the test is of the *reading*, not of the weights.
  Renown a turn comes from a ghost of my own (`renownPerTurn`).
- **A baseline is taken off every Order.** Some seats hold cards that pay for each
  seated Order. On those seats any extra card raises the books. The stamp of a
  commission with no effects, seated the same way, is subtracted.
- **Governments**: the stamp re-seats the council, which mixes the cards with the
  signature. So I read the signature alone: the same chairs and cards with only the
  government swapped, against the Chiefdom.
- **What the stamp cannot see**: riders on a moment, combat lines, unit stats, flag
  rules, unlocks, levies, Boons and commission rewards. For riders I use the
  moment's real rate from the next snapshot's records. For Scalers I use the
  tallies of the Scalers the bots actually seated. For Boons I read the grant as a
  lump. For the rest there is no measured figure, and the report says so.
- **Caveat on production**: the bot adds a hammer premium (`hammerTerm`,
  `src/ai/prices.ts`) above the table weight for production. The stamp is weighed at
  the table weight. So a production card can read up to about 1.5× the stamp from
  the premium alone. That is a weight, not a misreading.

### The stand-in check

Every price was taken twice more: with `score.unknownEffect` raised from 2 to 2.5,
and with `score.nominalCount` raised from 3 to 3.5. A price that moves is built on
the stand-in. The share of the price that is stand-in is 4 × the move.

---

## Part 1. Where a card's price comes from

**The exchange rates.** One per-turn point is a yield times its weight. A one-time
lump L is worth L ÷ `score.lumpTurns` (20) per turn. A delay of d turns multiplies by
(60 − d) ÷ 60 (`delayDiscount`, `src/ai/prices.ts`).

| Decision | Arm | What it folds |
|---|---|---|
| Order draft | `orderDecision` → `pickCard` (`council.ts`) | `explainCard` for each option. The pass is `skipCandidate`: what one more rung of pity adds to the next hand (`expectedBestOrder`), times the wait for the next meter, plus `passRiderTerms`. The pass wins only when it beats the best card. |
| The price of one card | `explainCard` (`council.ts`) | `explainCardEffects` + `onDraftWorth` (not for a held card) + 14 × held cards sharing a deck (held Orders, plus seated Orders again, plus Doctrines). |
| A card's effects | `explainCardEffects` (`value.ts`) | An *engine* row (`foldReadEngine`: `cardYieldAmplifier`, `buildingYieldPercent`, `cityRenownPercent`, five `effectAmplifier` targets, the rule `postsLendLuxuries`) is read by `deckMargin`: two `deckReading`s of a ghost with the card in the chair `chairFor` picks. Every other row walks `explainEffects` → `scoreEffect`, one arm per `CardEffect` kind (`scorePays`, `ruleWorth`, `scoreRulePercent`, `scoreWindfallRider` with `occasionRate`, `explainCounted` for counted lines). Then `explainCommission` and `explainCharter` are added. |
| Commission | `explainCommission` | The reward (`rewardTerms`: lumps ÷ 20, lasting effects at full rate) × the delay of `commissionForecast`. |
| Charter | `explainCharter` | Technology charters only: `explainCharterKnowledge` × the research delay. Any other charter returns nothing. |
| Boon | `onDraftWorth` → `magisterialDraftGrantWorth` | A unit grant is a fixed `weights.military × score.combatScale ÷ lumpTurns` (0.75). A great person, a windfall and a foreign card are read through the lump exchange. |
| Doctrine offer | `doctrineDecision` → `pickCard` | `explainCard`; an engine Doctrine's margin is read on `ghostSeatUnderDoctrine`. The offer is passed only when the best is 0 or below. |
| Seating | `slottingDecision` → `slotPairTerms` | (`explainCard` − `orderPaysOffItsChair`) ÷ the held cards that fit the chair's type, plus `orderReadAgain` for a chair that counts twice. The gate is `slotOrderError`. |
| Re-seating | `reslotDecision`, `moveToCountedChair` | A bench card replaces a seated card when its `slotPairTerms` is strictly higher. One move a turn. |
| Government | `housekeeping` (`bot.ts`) → `adoptionTable` (`council.ts`) | The signature (`explainCard` of the government; the tier-26 rise is `cardTypeAmplifierWorth`) plus a greedy fill of the new chair layout (`chairLayoutUnder`) with `scoreCard` of the held Orders. |
| Belief (pantheon, follower, enhancer) | `beliefDecision` → `pickCard`, `beliefRedeal` | `explainCard`. A free redeal is asked when the best on the table is below the bag's mean. *When* to buy a god is the faith ladder (`ladderPlan`, `faithPlan`, `wants.ts`). |
| Rite | `ritePlan` (`wants.ts`) → `spendCommand` → `riteDecision` (`bot.ts`) | `explainRite` (`value.ts`) on a town context (`townScoped`, which sets `cities` to 1): the blessing's per-turn worth × its turns ÷ 20. Levy rites use `bestLevyRite`; the prophet's empire rite uses `explainEmpireRite`. |
| Culture's price | `draftPlan` (`wants.ts`) | The `cardWorth` closure: `explainCard` at the prior context. |

---

## Part 2. Coverage by shape

### Shape families, measured

Median bot price over median stamp, on cards made of one family only. "Stand-in"
means the stand-in check moved the price.

| Family | t40 | t80 | t120 | Verdict |
|---|---|---|---|---|
| `pays` city flat | 1.00 | 1.00 | 1.11 | real reading |
| `pays` hex flat | 1.00 | 1.00 | 1.00 | real reading |
| `pays` count (a flat amount a helping) | 1.00 | 1.00 | 1.00 | real reading |
| `pays` empire rate | 1.00 | 1.00 | 1.00 | real reading |
| `pays` route flat | | 1.00 | 1.00 | real reading, but see the route scope fault |
| `happiness`, `authority` | 1.00, 0.76 | 1.00, 1.00 | 1.00, 1.00 | real reading |
| `buildingYieldPercent` | | 1.02 | 1.00 | real reading where the margin is not used |
| `metaRule` (The Union of Lublin, The Serapeum) | 1.71 | 1.11 | 1.20 | real reading |
| `meterRule` | | 1.00 | 0.72 | real reading |
| **`percentYields`** | 1.77 | 0.60 | **0.28** | **stand-in**: a nominal helping of 6 a town |
| **`pays` count with a percentage** (27 live rows) | | **0.13** | **0.07** | **stand-in**: 6 once a helping, not the empire's yield |
| **`productionBonus`** | **6.00** | 2.40 | 1.48 | **stand-in**: every town builds that category every turn; the stamp reads nought in 55 of 84 rows |
| `upkeepRebate` | 1.50 | 0.68 | **0.14** | stand-in: 3 nominal pieces, not the army |
| `pays` tally (Scaler) | 2.50 | 1.65 | 1.27 | reading plus a forecast; see the Scaler table |
| **`windfallRider`** | | 0.03 | 0.05 | reading, divided by 20 once too often |
| `surplusToProduction` | −16 against +22 | −12 against +32 | −10 against +67 | priced below nought by the weights (food 9.8 against production 5.6) |
| `rule`, `pressureRule`, `grantsAbility`, `unlocksImprovement`, `slotRider` | 2 | 2 | 2 | stand-in (2, or 12 for a chair) |

### Shapes priced wholly by a stand-in

78 live cards have a median price that is all stand-in. They fall in two groups.

- **A flat 2 points** (`score.unknownEffect`), whatever the card does. About thirty
  cards, among them: the flag rules of The Barbarian Frontier, The Second Reading,
  Consecrated Labor, The Shrine Guards, Blood Brothers, Riders of the Steppe, The
  Brokers' Redraw, Foreign Procurement, Pax Romana, Sacred Patronage, The Pious
  Masons, The Second Seat, The Mountain Terraces, The Woodland Bands, Caravanserai
  Cities, The Muda and The Consular Roads; the amplifiers of The Octave, Letters
  Patent and Strategic Exports; The Votive Gifts (`grantsAbility`); Outposts and The
  Polders (`unlocksImprovement`); The Sovereign Writ (`meterRule`); Mission Houses
  and five enhancers (Inquisition, The Long Road, Itinerant Preachers, The Pulse of
  Bells, Sacred Cartography), which are all `pressureRule`. The Council of Ten's
  extra chairs read 12.
- **A nominal helping** (`score.unknownEffect × score.nominalCount` = 6 a town or a
  helping). Every `percentYields` row, every `productionBonus` row, every counted
  percentage row (`scorePayout`'s `stage` branch) and `upkeepRebate`. The biggest
  errors in the game come from this group (the under-priced top 20 below).

### Shapes priced at zero by construction

145 live Orders and Doctrines have a median price of exactly 0. Most of these are
honest: the scope admits no town *today* (a card for towns with a university, before
any university), or a commission's forecast reaches the 60-turn horizon. These are
zero by construction and will stay zero:

- **Seven charters that open something other than a technology**: The Fish Traps
  and The Wild Orchards (a tended work), The Planters' Charter (a building),
  Numidian Cavalry and The Chartered Company (a unit), The Fast and The Sabbath Laws
  (a rite). `explainCharter` returns `null` unless the charter names a technology.
- A `disband` rider that pays anything but citizens (the bot never disbands for it).
- The vein moments (`veinFound`, `prospect`), because the vein layer is shelved.

### The new and changed shapes from the brief

| Shape | How the bot reads it | Verdict |
|---|---|---|
| **Commission** | The reward × the forecast's delay. | Read. For 16 of 23 commissions the forecast reaches the horizon, so the median price when offered is 0. That matches play (3 met of 29 drafted), but the deck bonus drafts them anyway. |
| **Charter** | Technology: what knowing it gives × the research delay. Anything else: nothing. | Half read. Seven rows are always 0. |
| **Scaler** (`count: 'tally'`) | Today's tally plus the whole 60-turn forecast, counted as if already reached. | Mostly within 0.4× to 2.1× of a seated mean. The Grain Census reads 0.09 (no forecast for `sizeRecord`). |
| **Boon** | The grant through the lump exchange; a unit at a fixed 0.75. | The units are under-read (table below). A Boon is compared with a seated card that is charged nothing for its chair. |
| **The twelve governments** | The signature walk plus the chair fill. | Read well: within about 20% of the measured signature (table below). |
| `cardTypeAmplifier` (tier 26) | A share of today's seated cards of the type, in today's chairs. | Close: The Curia 124 against 116 at t80 and 201 against 209 at t120; The Estates 137 against 91 at t120. |
| `greatPersonCost` (The Aristocracy) | The cut as renown a turn. | Read; small. |
| Moment `levy` | `levyOutlook`'s rate. | Read; the rider fault applies. |
| Moment `goldPurchase` (The Strongbox) | The purse over the cheapest want, over the horizon. | Read; close (about 1.3× a seated mean). |
| Moment `faithSpent` (The Pilgrim Staff) | One a turn, measured at the faith a turn. | Read; the rider fault makes it 1/43 of its pay. |
| `empireYield` count | The sim's own count (`countOf`). | Read for flat helpings (The Nest Egg). Bills of Exchange is a counted percentage, so it is a stand-in. |
| Follower `followersHere`, `buildingsSupplying` | The sim's own count. | Read, but in every town (see the follower fault). |
| Town-scoped faith `purchaseRider` (The Alms Box) | `faithRiderWorth`. | Read; never picked in 8 offers. |
| Route rows | The route fold for a flat line. | Read, but the `origin` and `destination` scopes are not read. |

---

## Part 3. The numbers: price against pay

### Over-priced: the bot's price well above the stamp

Median over the states where the card could be offered. "Bot" excludes the deck bonus.

| # | Card | n | Bot | Stamp | Cause |
|---|---|---|---|---|---|
| 1 | The Humanists | 3 | 579 | 0 | promised universities (a forecast) |
| 2 | Pilgrimage (follower) | 19 | 576 | 64 | priced in every town, pays in towns that follow |
| 3 | Old Workings | 3 | 605 | 156 | hammer premium on +3 production a work |
| 4 | Mining Districts | 19 | 300 | 0 | a line paid per *two* neighbouring mines read at one helping a mine |
| 5 | The Quiet Hours (follower) | 19 | 351 | 82 | every town |
| 6 | The General Staff | 18 | 235 | 0 | promised barracks (a forecast) |
| 7 | Houses of Account | 19 | 324 | 104 | promised gold buildings (a forecast) |
| 8 | The Scriptoria (enhancer) | 19 | 234 | 26 | follower count read too wide |
| 9 | The Cathedral Works | 5 | 186 | 0 | promised cathedrals (a forecast) |
| 10 | The Merchant Navigators | 28 | 173 | 0 | the route's `origin` (a harbour town) is not read |
| 11 | The Grand Vizier | 19 | 155 | 1 | `slotPosition`: the doubled card's whole walk |
| 12 | The Armoury Patterns | 21 | 151 | 0 | nominal production bonus |
| 13 | Tithe Houses (follower) | 19 | 228 | 82 | every town |
| 14 | The Spear Makers | 10 | 113 | 0 | nominal production bonus |
| 15 | The Free Cities | 20 | 121 | 8 | nominal production bonus, two categories at once |
| 16 | Crop Rotation (Doctrine) | 45 | 18 | −86 | the unimproved hexes' loss is not read |
| 17 | The Waterworks | 22 | 103 | 0 | promised buildings (a forecast) |
| 18 | Cathedrals of the Sky (follower) | 19 | 102 | 0 | every town |
| 19 | The Builder Kings (Doctrine) | 45 | 101 | 0 | nominal production bonus |
| 20 | Keeper of the Hearth (god) | 90 | 136 | 41 | promised granaries (a forecast) |

Not in the table because only one state offered them: The Customs Service (571
against 0, the route `origin` again). The "promised" rows are a forecast of buildings
the bot's own tech chains will raise (`promisedBuildings`, `scopeReach.ts`). A stamp
cannot see a forecast, so those rows are not proven wrong.

### Under-priced: the stamp well above the bot's price

| # | Card | n | Bot | Stamp | Cause |
|---|---|---|---|---|---|
| 1 | The Queen of Cities | 3 | 672 | 4,126 | `percentYields` at a nominal 6 a town |
| 2 | The Wonder Commonwealth | 3 | 53 | 958 | `percentYields` at a nominal 6 a town |
| 3 | The Age of Improvement | 3 | −798 | 103 | the margin benches a seated card |
| 4 | The Pandects | 3 | 21 | 834 | counted percentage at 6 a helping |
| 5 | The Boule | 3 | 21 | 755 | counted percentage |
| 6 | The Roll of Masters | 3 | 19 | 565 | counted percentage |
| 7 | The Doctors of the Church | 5 | −283 | 0 | the margin benches a seated card |
| 8 | The Divine Proportion | 3 | −263 | 0 | the margin benches a seated card |
| 9 | The Royal Academies | 3 | 6 | 268 | counted percentage |
| 10 | Standing Garrisons | 6 | 93 | 295 | counted percentage |
| 11 | The Book of Settlements | 22 | 20 | 220 | counted percentage |
| 12 | The Marian Reforms (Doctrine) | 39 | −40 | 119 | nominal production bonus with a negative share |
| 13 | The Round City | 19 | 7 | 115 | counted percentage |
| 14 | The Festival Calendar | 26 | 51 | 159 | `percentYields` |
| 15 | The Veterans' Roll | 20 | 11 | 103 | counted percentage |
| 16 | Names in Stone | 19 | 11 | 99 | counted percentage |
| 17 | The Book of Life | 22 | 18 | 103 | counted percentage |
| 18 | The Spice Exchange | 19 | 6 | 69 | counted percentage |
| 19 | The Great Households | 22 | 29 | 91 | counted percentage |
| 20 | The Prefects | 18 | 2 | 62 | counted percentage |

Eighteen of the twenty are one cause: a percentage read off a nominal helping. The
other three are one cause: the engine margin.

### Riders: the bot's price against the pay at the real pace

The rate is the moment's real count from turn T to the next snapshot. The pay is rate
× grant × the seat's weight. Only riders with a plain yield grant on a recorded moment
are here.

| Card | Moment | Grant | Bot | Pays | Bot ÷ pays | Real rate a turn |
|---|---|---|---|---|---|---|
| Letters of Marque | kill | 60 gold | 3.6 | 163 | 0.007 | 0.68 |
| Field Academies | kill | 25 science | 1.9 | 122 | 0.015 | 0.33 |
| The Pilgrim Staff | faith spent | ¼ as culture | 1.4 | 62 | 0.023 | 18.5 faith |
| Master Masons | building | 30 production | 0.2 | 55 | 0.006 | 0.33 |
| The Sacred Host | kill | 15 faith | 0.4 | 25 | 0.018 | 0.26 |
| Rites of Passage | unit | 12 faith | 0.3 | 17 | 0.018 | 0.28 |
| The Royal Workshops | technology | 15 production | 0.8 | 16 | 0.052 | 0.19 |
| Granary Levies | growth | 15 production | 0.3 | 13 | 0.029 | 0.15 |

Median bot ÷ pays: **0.018**. Two causes multiply:

- `scoreWindfallRider` multiplies the moment's rate by `windfallGrantWorth`, which
  converts each grant through `explainLump` (÷ 20). A rider that fires r times a turn
  pays r × L a turn; that is already a rate. `periodicWorth` prices a periodic boon
  as a rate (figure ÷ period) with no ÷ 20, so the two shapes disagree by 20×.
- Several rates are low. A kill reads `tallyForecast.barbarianKill` (6) over 60 turns,
  0.1 a turn; the bots killed 0.26 to 0.68 a turn.

76 live effect rows are windfall riders.

### Scalers

The real gain is read off the tallies of the Scalers the bots seated (5 games).

| Scaler | Bot | Real tally gain while seated | Bot ÷ mean pay over a seated 60 turns | Note |
|---|---|---|---|---|
| The Gathering Host | 660 | 0.3 to 2.3 a turn (113 by t151 on one seat) | about 1 | the forecast (20) is too high at t40 and too low after t100 |
| The Grain Census | 54 | 0.6 to 1.7 a turn (90 by t151) | **0.09** | `sizeRecord` has no `tallyForecast` entry, so the promise is 0 |
| The Astronomical Diaries | 373 | 0.3 a turn | 0.59 | |
| The Honoured Dead | 234 | | 0.43 | |
| The Martyrology | 128 | 0.2 a turn | 0.69 | the forecast (3) is a quarter of the real pace |
| The Rogations | 172 | 0.3 to 0.5 a turn | 1.47 | |
| The Aediles | 182 | | 2.13 | |
| The Strongbox | 356 | 0.35 to 0.8 a turn, cap 15 | about 1.3 | reaches its cap in 20 to 40 turns |

### Boons

| Boon | Bot (draft grant) | The grant, read | Note |
|---|---|---|---|
| The Sword of State | 0.75 | the unit costs 258 points of production (13 at the lump exchange) | a unit is a fixed 0.75 whatever it is |
| The First Caravan | 0.75 | a route worth 36 points a turn | a trader is priced as a soldier |
| The First Offering | 6.8 | 25 faith = 136 points (6.8) | consistent |
| The Wandering Muse | 7.5 | a great person at 150 renown points (7.5) | consistent |
| The Cabinet of Curiosities | 35 | the mean foreign card's per-turn price | a rate, not ÷ 20 |

**Is a Boon compared fairly with a seated card?** Not quite, in two ways that pull
apart:

- A seated card is charged nothing for its chair. In a full council its real gain is
  its pay less the pay of the card it benches. A Boon takes no chair, so its whole
  grant is gain. On this point the bot under-values Boons late.
- A Boon's lump is converted at 20 turns of rate. A seated card is usually held for
  60 to 100 turns. On this point the bot over-values Boons early.

The deck bonus is the same for both. The clear error is the fixed 0.75 for a unit.
Boons were picked 3 times in 11 offers.

### Rites

Bot per turn (the blessing ÷ its turns) against the rite preview (`explainRitePreview`)
in the capital, median.

| Rite | Bot a turn | Preview a turn | Note |
|---|---|---|---|
| Rite of the Harvest | 139 | 39 | priced over every town's hexes |
| Rite of Plenty | 153 | 45 | every town's hexes |
| Consecration of the Bounds | 33 | 12 | every town's hexes |
| Omen Reading | 82 | 50 | |
| Blessing of Arms | 140 | (cannot see) | a defence line |
| Rite of Fasting | **−341** | +193 | growth stopped, read as the whole empire's gross food |
| Rite of the Sabbath | **−85** | +56 | |

The hex-rite over-price grows with the towns: Rite of the Harvest reads 1.4× the
preview at one or two towns, 2.3× at three to five, 4.5× at nine to eleven and 10.6×
at twelve or more. Rite of Plenty follows the same line.

### Governments: the signature

| Government | t40 bot / measured | t80 | t120 |
|---|---|---|---|
| Council of Elders | 51 / 56 | 72 / 80 | 110 / 126 |
| War Chief | 34 / (cannot see) | 49 / | 125 / |
| Priest-King | 55 / 57 | 126 / 140 | 172 / 188 |
| Republic | 15 / 0 | 49 / 27 | 61 / 42 |
| Tyranny | 84 / 103 | 158 / 200 | 317 / 355 |
| Aristocracy | 90 / 90 | 159 / 175 | 230 / 240 |
| Merchant League | 0 / 0 | 31 / 28 | 145 / 140 |
| Imperium | 18 / 0 | 28 / 0 | 73 / 0 |
| Divine Mandate | 0 / 0 | 0 / 0 | 11 / 21 |
| The Estates | 7 / 0 | 57 / 42 | 137 / 91 |
| The Sultanate | 3 / 6 | 5 / 0 | 23 / 0 |
| The Curia | 9 / 5 | 124 / 116 | 201 / 209 |

These are close. Tyranny reads 10% to 20% low.

---

## Part 4. Behaviour in five games

**Drafts.**

- 648 Order decisions; **7 passes (1.1%)**. 97 Doctrine decisions; **1 pass**.
- Pick rate by keyword: plain 31%, charter 35%, commission 32%, **Scaler 81%**, Boon
  27%.
- Pick rate by deck: dominion 52%, scientific 43%, devotion 42%, magisterial 28%,
  expansionist 25%, commerce 18%, **common 11%**. A common card is in no deck, so it
  never earns the deck bonus.
- Always picked when offered (offered 4 times or more): Stockpiles (9 of 9),
  Commission: Take the City (5 of 5), The Strongbox, The Almanac, The Taker of
  Cities and Old Workings (4 of 4), The Quitrents (6 of 7), Martial Law (9 of 11).
- Never picked (offered 4 times or more): Resting Camps (12), The Hard Country (7),
  The Spice Exchange (7), Levy of the Land (6), Mercenary Contracts (6), The Horse
  Herds, Tinkers' Guild, The House of Wisdom, A Guild Commission (5 each), and 16
  more at 4 offers, among them The Mechanists' Charter, The Planters' Charter, The
  Founding Vows, Master Masons and The Court Painter.

**The deck bonus.**

- It decided **42% of the 613 picks**: take the bonus out of the logged scores and
  another card wins. (The collection at a decision is read from the last ten-turn
  sample, so this is an estimate.)
- It is a median **60%** of an offered card's price.
- Two-deck seats collapse onto one deck. At turn 151: seed 202 seat 1 (commerce and
  devotion) holds 19 devotion cards and no commerce card; seed 303 seat 0 holds 21
  devotion and 1 dominion; seat 2 holds 16 scientific and no devotion; seat 4 holds
  12 magisterial and no devotion; seat 5 holds 21 expansionist and 3 commerce; seed
  202 seat 5 holds 33 scientific and 3 expansionist.
- Typical picks it decided: The Octave (worth 2) over Civic Peace (36); The Gifts of
  the Faithful (0) over Financed Industry (12); The Scholars' Fame (0.1) over Civic
  Peace (16).

**Governments.**

- Tier 4: Priest-King 20 of 30, Council of Elders 7, War Chief 3.
- Tier 10: **The Aristocracy 24 of 30**, Republic 4, Tyranny 2.
- Tier 18: **Merchant League 20 of 23**, Divine Mandate 2, Imperium 1.
- Tier 26: The Estates 4 of 8, The Curia 4, **The Sultanate 0**.

**Beliefs.**

- Pantheon: Sacred Fire 13 of 16 offers, The Standing Stones 13 of 16, Keeper of the
  Hearth 10 of 11, Patron of Merchants 10 of 15, Oracle of the Crossroads 8 of 11.
  Never picked: Rites of Blood (12 offers), Vineyard Rites (12), Lady of the Hunt (9),
  Cult of Heroes (8).
- Follower: Minarets 8 of 9, Tithe Houses 8 of 15, Temple Spires 7 of 8, The Open
  Kitchen 7 of 10. Never picked: Common Table (14), Lamps of the Shrine (11), Holy
  Water (8), The Alms Box (8), Harvest Blessing (7), Feast Days (7).
- Enhancer: The Scriptoria 5 of 5, Holy Order 5 of 5. Never picked: Inquisition (7),
  Itinerant Preachers (5), Sacred Cartography, The Long Prayer, The Pulse of Bells,
  Congregation (3 each). Five of these six are priced at the stand-in.
- 43 free belief redeals were asked.

**Rites performed.** Blessing of Arms 402, Rite of the Harvest 359, Omen Reading 15,
Votive Offering 4, Rite of Plenty 1. Never: Consecration of the Bounds, Rite of
Fasting, Rite of the Sabbath, Restoring of the Host.

**Collections and chairs.**

- 787 seatings and **533 unseatings**.
- **Commissions: 29 drafted, 3 met** (30 seats, 150 turns): Break the Sod at turn 75,
  The Domesday Survey at turn 140 and The Golden Bull at turn 144. Of the 26 not met,
  only 2 were ever seen in a chair at a ten-turn sample. Commission: Take the City
  was drafted 5 times and never seen in a chair.
- Held but never seen in a chair, among plain cards: The Old Holy Places (5 seats),
  Standing Garrisons (5), The Drill Masters (4), Conquered Archives (4), The Harbour
  Cities (3), Spear-won Land (3), The Veterans' Roll (3).

### Rule faults seen in play

- **The re-seat arm names a card that can never sit.** Of the 302 unseatings whose
  reason was logged, 16 named a Boon and 19 a charter as the card that should take
  the chair. The seated card then goes straight back into the same chair (35 times).
  Seed 202 seat 2 unseated Public Gatherings for The Bronze-Founders' Charter at turn
  26 and then every five turns from turn 68 to turn 148, and put it back each time.
  `reslotDecision` checks only the chair fit (`chairFitWithout`), not
  `slotOrderError`.
- **The same cards are counted for chairs they cannot take.** Code reading, not
  measured: `adoptionTable` fills the new layout from every held Order (a Boon, a
  charter and a met commission included), and the scarcity count in
  `slottingDecision` and `reslotDecision` counts them too.
- **Charters bought and not used.** Of 16 charter technologies held at turn 151, 12
  were not researched (The Herbalists' Charter, a band-0 technology, was held from
  turn 21 to 151 and never researched). Of 6 other charters held, none was used: no
  Wild Orchard or Fish Traps on the map (the bots lay no tended works), no Sabbath
  performed, no Company Guard built.
- **Unit counts read a record that only counts settlers and workers.**
  `Player.unitsBuilt` climbs only for rows with an escalation ladder, which today are
  the settler and the worker. The bot reads it as "units built" in `occasionRate`
  (`unitCompletion`, `completion`), `occasionRecord` (`unitTrained`, `unitGained`,
  `militaryGained`), `rallyWorth`, `timedStampWorth` and `leviedRecruitShare`. So
  every military pace reads close to nought. The Gathering Host's real tally reached
  113 on one seat.

---

## Part 5. Conclusions

### Faults in the valuation, ranked by effect

1. **The deck bonus outweighs what cards do.**
   - Evidence: it decides 42% of picks and is 60% of an offered card's price. It
     drafts cards worth nothing (29 commissions, though 16 of the 23 commissions read
     0 on their own when offered; charters the bot never uses). Seats end with one deck only. Common cards are picked 11% of
     the time against 18% to 52% for deck cards.
   - Size: the largest single term in most prices after turn 30 (14 a held card, a
     seated card counted twice, with no cap: 126 to 392 in the states measured).
   - Fix: make the bonus a share of the card's own price (for example 5% a held card
     of the deck, at most 50%), so a card worth nothing stays worth nothing, and
     leave it out of the seating and re-seating scores.

2. **Windfall riders are divided by 20 once too often.**
   - Evidence: median bot ÷ pays 0.018 on 10 measured riders; Field Academies 1.9
     against 122, The Pilgrim Staff 1.4 against 62.
   - Size: 76 live effect rows, all 20× low before any rate error.
   - Fix: in `scoreWindfallRider`, price each firing at full weight (no `explainLump`
     ÷ `lumpTurns`) times the rate, as `periodicWorth` does. Then check the forecast
     rates against the real ones (kills read 0.1 a turn; the bots made 0.26 to 0.68).

3. **Percentages are read off a nominal helping of 6.**
   - Evidence: `percentYields` falls from 1.8× at t40 to 0.28× at t120; the 27
     counted percentage rows read 0.13× at t80 and 0.07× at t120 (The Pandects 21
     against 834); `productionBonus` reads 6× at t40; `upkeepRebate` 0.14× at t120.
   - Size: 18 of the 20 most under-priced cards; close to a hundred live effect rows.
   - Fix: send `percentYields` and the counted percentage rows through `deckMargin`,
     which reads them exactly. Price `productionBonus` on the towns' real production
     times the share of their queues in the named category, and `upkeepRebate` on the
     real payroll.

4. **An engine card in a full council pays for a card it would bench.**
   - Evidence: The Bourse −930 (walk +891, stamp +210); The Age of Improvement −798;
     The Divine Proportion −263; The Doctors of the Church −283.
   - Size: 4 cards priced far below nought late; every engine card in a full council
     is priced on a different footing from every other card.
   - Fix: let `deckPair` add a chair for the card, as the card stamp does, instead of
     replacing the card that `plainOrderScore` (a count of row fields) names. If a
     bench charge is wanted, charge it in one place for every card.

5. **The re-seat arm chooses cards that cannot sit.**
   - Evidence: 35 of 302 logged unseatings, each undone at once; one seat repeating it
     every five turns for 80 turns.
   - Size: wasted commands and a reset seal; no yield lost.
   - Fix: in `reslotDecision`, skip a bench card that `isBoon`, `isCharter` or a met
     commission rules out (or ask the gate on an emptied ghost). Leave the same cards
     out of `adoptionTable`'s fill and the scarcity counts.

6. **Rites are priced over the whole empire.**
   - Evidence: hex rites read 1.4× the preview at one or two towns and 10.6× at twelve
     or more. Rite of Fasting reads −341 a turn against +193, because the
     `growthSurplus` rule prices the whole empire's *gross* food (`foodPerTurn` sums
     each town's food, not its surplus).
   - Size: Blessing of Arms and Rite of the Harvest take 761 of 781 rites; Fasting and
     the Sabbath are never performed, so The Fast and The Sabbath Laws are dead cards
     for a bot.
   - Fix: hand the rite's town to the hex walk (`workedHexesAdmitting`) and to
     `scoreRulePercent`, and read `growthSurplus` on the surplus (`channelSurplus`).
     The same reading over-prices five Doctrines with a growth rule: The Removal to
     Xianyang, Synoecism, The Imarets, The Year and a Day and The Bourgs.

7. **Follower beliefs are priced in every town.**
   - Evidence: Pilgrimage 9×, The Scriptoria 9×, The Quiet Hours 4.3×, Tithe Houses
     2.8× the stamp. The stamp pays them only in the seat's towns that follow.
   - Size: 5 beliefs, all among the most picked.
   - Fix: narrow a follower line with no `follows` scope to the towns that follow
     the seat's faith (`followsSeatFaith`).

8. **The route scope and two hex counts are not read.**
   - Evidence: The Merchant Navigators 173 against 0 in 28 states, The Customs
     Service 571 against 0 (`origin` not read); Mining Districts 300 against 0 (paid
     per two neighbouring mines, read as one helping a mine); Crop Rotation +18
     against −86 (the unimproved hexes' loss not read).
   - Fix: test each running route's origin and destination with `cityScopeAdmits`;
     count `perNeighbour` helpings on the hex; read `wholePercent` on unimproved
     hexes.

9. **Military paces read a settlers-and-workers record.**
   - Evidence: `Player.unitsBuilt` holds only settlers and workers; every bot reading
     of units built through it is near nought.
   - Fix: count units gained from a record that covers every unit (a sim counter, or
     the `militaryGained` tally the cards already keep).

10. **Small readings.**
    - Seven non-tech charters always read 0. Price them through the readings that
      exist (`scoreUnlockedBuilding`, the `unlocksUnit` price, `explainRite` × towns)
      and keep 0 where the bot has no arm that uses the thing (tended works).
    - A Boon's unit is a fixed 0.75: price it at the unit's production cost, and a
      trader at the route it would run (`routeSlotTerm`).
    - The Grain Census: add a `sizeRecord` forecast.
    - Charter technologies: the draft price reads `explainCharterKnowledge`, but the
      research arm reads `readNodeGifts`, and 12 of 16 held charter technologies were
      never researched. Make the two readings agree.

### Design notes: the card, not the bot

These are about card strength. They are for the user and are not bot faults.

- **Uncapped Scalers grow very large late.** The Grain Census reached a tally of 90
  by turn 151 (+90 gold, and +90 production in every town). The Gathering Host
  reached 113 (+115 science and +115 culture). The Astronomical Diaries reached 36
  in every town.
- **Two governments dominate their tiers.** The Aristocracy is chosen 24 of 30 times
  and Merchant League 20 of 23. The bot reads both signatures within 10% of the
  measured figure, so this is the cards' strength, not a misreading. Tyranny's
  measured signature is higher from turn 80, but the adoption comes earlier. The
  Sultanate is never chosen: bot councils seat few military cards with lines it
  raises.
- **Percentage cards are the strongest cards late.** The Queen of Cities stamped
  4,126 points a turn at turn 120; The Wonder Commonwealth 958; The Pandects 834.
- **Commissions are slow at the bots' pace.** 3 met of 29 drafted. Most goals forecast
  past 60 turns, and the forecast was right.
- **Weak cards.** Resting Camps (never picked in 12 offers), Local Clerks (+1
  authority), Rites of Blood and Vineyard Rites (never picked in 12 offers each).
- **Cards that trade growth for production** (The Laws of Lord Shang, The
  Breadbasket) read below nought for a bot, because a point of food is weighed above
  a point of production (9.8 against 5.6). That is the weight table's choice.

---

## Files

- The report: `docs/audit/bot-pass-3-card-values.md` (this file).
- Scratch scripts and results (not in the repo), in
  `/private/tmp/claude-501/-Users-jacky-code-webciv/c4da3ce5-796a-4aa7-8603-c5fc07da6b1d/scratchpad/botpass3-values/`:
  - `play.ts`: one six-seat game through the stepper, with the card decisions logged
    (`games/<game>/decisions.jsonl`, `stats.jsonl`, `snap-40/80/120.json`, `final.json`);
  - `values.ts`: the bot's price, the stamp and the stand-in check for every
    offerable card (`values-<seed>.jsonl`);
  - `inventory.ts`: the live cards and their shapes (`inventory.json`, `shapes.tsv`);
  - `analyze_values.py`, `rank.py`, `riders.py`, `behaviour.py`, `synergy.py`: the
    tables above (`out-*.txt`).
- Leaders seated: seed 101 Pachacuti, Taizong, al-Ma'mun, Mithridates, Zheng He,
  Nezahualcoyotl; seed 202 Modu, Mansa Musa, Hypatia, Akhenaten, Pachacuti,
  Nezahualcoyotl; seed 303 Joan, Zheng He, al-Ma'mun, Mithridates, Hildegard,
  Pachacuti; seed 404 Hypatia, Taizong, Mansa Musa, Nezahualcoyotl, Modu, Pachacuti.
