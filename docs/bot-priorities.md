# The priority system — the bot's spec of record

The architecture every decision arm of `src/ai/` reads. The bot figures out
what things are *worth* first, and every arm folds those terms into the
explainers it already had. Long-term goals are **chains** priced over time;
currencies and constraints carry **shadow prices**; plan-keeping is greedy with
a switching margin, so commitment is emergent from sunk-cost exclusion and never
stored.

Code: `src/ai/wants.ts` (the want book and the prices) · `src/ai/value.ts` (the
appraisal) · `src/ai/aiConfig.ts` (the sheet and the personas) · `src/ai/bot.ts`
(the arms) · `src/ai/council.ts` (the arms that answer an offer, seat a card or
weigh a charter). Every knob is a leaf of `data/ai.json` and therefore appears on
`arena.html` with no page edit. The batch-by-batch measurement narrative — every
arena A/B, seed sweep and before/after profile — is
`docs/history/bot-priorities-log.md`.

## Principles

1. **Greedy with a margin.** Each template keeps its best chain; a challenger
   displaces the incumbent only by beating it by `priorities.switchMargin`
   (1.10). Sunk costs are excluded, so a half-executed chain's remaining worth
   rises as it is paid — incumbency is arithmetic, not memory. Plans flip on
   genuinely large events (a draft, a war, an age) and on nothing else, by
   construction.
2. **A portfolio, not a plan.** The empire runs several chains at once (tech +
   expansion + faith…). They compete only at shared bottlenecks, and the shadow
   prices are the arbitration layer.
3. **No stored goal state.** Everything derives from `GameState` per turn — the
   research queue, the standing buildings and the half-paid chains ARE the
   memory. Determinism holds trivially; replays are unaffected.
4. **Short-term stays local.** Unit tactics (heal, screen, ranged-first), tile
   workings and route picks keep their arm-local scoring; they feel the system
   only through prices.
5. **Everything prints.** Every chain, price and term lands in the candidates'
   folds — `spectate.html` and the arena show the book, and the fold IS the
   computation (`foldTerms(terms) === score`, strict equality, pinned).

## The formula

```
worth(chain) = payoff_rate × max(0, H − delay) + lump_payoffs − Σ_c invest_c × price_c
```

- `H` = `priorities.horizonTurns` (40).
- `delay` = turns until the chain starts paying: beakers ÷ science rate + build
  turns + walk turns + wait-for-meter turns, per template.
- `invest_c` = remaining spend in currency `c` (hammers, gold, faith, beakers)
  priced at that currency's **current** shadow price — so an expensive chain is
  cheap to an empire whose hammers are idle and dear to one whose hammers are
  contested.
- Fractions and estimates throughout: an appraisal is an estimate, not a payout.

## Shadow prices

```
price(c) = clamp( max over wants of marginal_worth_per_unit(c),
                  weights[c] × bandLow, weights[c] × bandHigh )
```

- Computed per seat per turn from the want book. The age-banded `weights` table
  is the **prior and the band anchor**, never the live value.
- `priorities.priceBandLow` 0.5 · `priorities.priceBandHigh` 3.0 — damping
  against oscillation; a price is a dial the board turns within a band the
  designer set.
- Priced: the currencies (gold, faith) and the constraints (authority,
  happiness, hammers-per-town), all in the same shape.
- A live founder chain over a thin faith rate ⇒ faith's price rides its ceiling;
  an empire with nothing left to buy ⇒ the floor. Both pinned as tests.

## The templates

- **The purchasing plan** (gold): a ranked want book — purchasable rows (through
  the simulation's own `explainPurchaseCost`/`purchaseError`), other chains'
  steps (gold's bridge role: buying a university compresses the tech chain's
  delay), and the standing wage reserve (`reserveTurnsOfUpkeep`). **Saving is a
  row**: "hold toward want W, k turns out", at W's worth discounted by k.
- **The faith plan**: pantheon → founder → beliefs → rites → the Almshouse's
  civilians; delay off the faith rate.
- **The tech chain**: goal node + realisation steps (buildings worth building ×
  towns that would build them, units worth fielding, riders worth working),
  hammers in the price, delay through the whole chain.
- **The expansion chain**: site + settler + escort + authority-wait in the delay.
- **The army plan**: threat-response valued at `threat × weights.military`,
  wage-priced at gold's shadow price.
- **The win conditions**: the wager's bars and the Opus as chains with large
  terminal values and honest delays — they take the book over late because the
  numbers say so, not because a rule fires.
- **The draft is not a template.** A card advancing any live chain folds that
  chain's term; culture's currency is the cadence itself.

## The integration surface

(a) currencies and meters are priced at shadow prices wherever `weights.gold` /
`weights.faith` would have been read (`valueContext` builds the row once);
(b) a candidate that IS a step of a live chain folds
`chain.worth / chain.stepsRemaining` as a labelled term;
(c) spend arms carry saving as a candidate and hold no thresholds of their own.

## Knobs

`data/ai.json`'s `priorities` block, typed in `aiConfig.ts`:
`horizonTurns 60 · switchMargin 1.1 · priceBandLow 0.5 · priceBandHigh 3.0`.
The old threshold knobs the system replaced (gold/faith spend floors and
reserves, the settler gates, the site-score minimum) are gone; the audit's
inventory of them is `docs/history/bot-audit.md`.

**The E1a rows** (`docs/plans/bot-evolution.md` §2.8 items 1–3 and the user's
rows in `docs/flags.md` (zzzzz); every default reproduces the play before them
— the six-seat 120-turn digests are byte-identical — so each is an arena A/B
until the tuner's first run):

- **Age rows**, read with `ageBand` (a short row reuses its last entry):
  `expansion.cityValueFalloffByAge` (was the scalar `cityValueFalloff`; the
  personas' scalars written four times), `growth.smallCityPop`,
  `weights.techByAge` (was `weights.tech`).
- **The war's why**: `war.targetValueWeight` (the target town's `explainSite`
  reading against `weights.city`, folded into the declaration),
  `war.goalTowns` (towns taken this war at which a winning seat offers a white
  peace), `war.aheadMargin`, `war.siegePiecesWanted`, `war.tributeShare`,
  `war.siegeWithin`.
- **The levy's shape**: `military.levyCapMultiple`, `military.levySurplusSlope`
  (one slope for the queue, the purse and the faith book),
  `military.wildAggression`, `military.siegeStrikeFloor`.
- **Two mixes by posture**: `military.mixDefend` / `military.mixCampaign`
  replace `military.mix`; the posture is `campaignPosture` (`bot.ts`) — at war
  with a real empire the warscore does not say the seat is losing to, with a
  town of theirs to march on — read off the board, never stored.
- **The tree by age**: `research.ageEntryValue` scales the priced worth of the
  seat's *held* luxuries' `fromAge` tiers on the first node of a road that lifts
  its age (`ageEntryTerm`, `chain.ts`); `research.doorValue` pays the Opus door
  node while the race is shut.
- **The wager's shape**: `wager.familyLean` (a multiplier per bead family on
  the stake score and the lean's worth), `wager.commitMargin` (under it the
  stake is the least-malice card).
- **The meter floors** (`meters.happinessFloor` / `authorityFloor`, `-999` =
  no floor): a founding that would sink a meter under the floor is **refused**
  in the expansion chain (`ExpansionChain.refused`), never priced.
- **Retired** (the `weights.die` precedent — a live arena box that moved
  nothing): `military.huntRadius`, `score.nominalTiles`.

**The threat count and the soldiers a seat can pay for** (bot pass 3, batch
BP1; `docs/flags.md` (ooooooo) P1 and P2; the audit is
`docs/audit/bot-pass-3-competitiveness.md` §3.1 and §3.2):

- **Who counts in the threat** (`threatLevel`, `threatWeights`, `bot.ts`). A
  piece of the wild, or of an empire at war with the seat, counts as one. A
  peaceful neighbour's piece counts as `threat.peaceShare` (0.25) times that
  neighbour's lean toward a war on the seat. The lean is `declarationLean`
  (`diplomacy.ts`): the first clause of the neighbour's own declaration, its
  marching strength against the seat's army times its appetite, over its bar,
  from 0 to 1. The disband arm's threatened-town test reads the same weights.
- **A floor of one defender a town.** `garrisonOwed` is at least one, and the
  levy is at least one soldier a town. An empty town always trains its
  defender.
- **The soldier forecast** (`armySupport.ts`). `soldiersCarried` is the disband
  arm's own test (`wouldDisband`) solved for the number of soldiers: how many
  more at a given wage the net, the treasury, the soldiers already queued and
  `solvency.supportMargin` (1 gold a turn) can pay for. The build arm refuses a
  soldier past it (`unpaidSoldier`) unless the town is empty. Under a real
  threat (a war with an empire, or a hostile piece within
  `threat.underAttackRadius` (2) of a town) the line moves: the seat may train
  past the disband line, but not past the point where its treasury would reach
  nought within `solvency.recruitRunwayTurns`, where the disband arm lets even a
  new unit go. A bought soldier past the line is worth nothing in the gold book.
- **Gold is dearer while the levy waits on the income** (`armyWageRow`,
  `wants.ts`). When the levy wants more soldiers than the gold pays for, the
  gold book holds a row (`holding: 'army'`) toward the next soldier's wage,
  worth that soldier's levy craving, priced at the wage over `score.lumpTurns`.
  It moves gold's shadow price through the one mechanism, `priceOf`.
- **A new unit is kept.** The disband arm does not let go of a unit raised in
  the last `solvency.keepRecruitsTurns` (10) turns unless the net is under
  nought and the treasury would reach nought within
  `solvency.recruitRunwayTurns` (3). How old a unit is comes from the muster
  roll (`musterRoll.ts`), a harness memory beside the state: one mark a turn of
  the next entity id. Under a real threat the disband arm lets no piece go at
  all until the treasury would reach nought within that same window, the line
  the build arm trains to then; without it, seats at war trained a soldier a
  turn and shed an old one a turn.
- **The books are read once a turn.** A sitting reads its net gold and its
  payroll once (`seatBooks`, `BotSitting.books`); every later reading in the
  turn moves the net by what the payroll has done since (`netNow`). The disband
  arm used to price every town before every decision.

**Units raised, cards that never sit, and the great-person gate** (bot pass 3,
batch BP2; `docs/flags.md` (ooooooo) B9, B5 and P3; the audits are
`docs/audit/bot-pass-3-card-values.md` faults 5 and 9 and
`docs/audit/bot-pass-3-competitiveness.md` fault 3):

- **The record of units raised** (B9). `Player.unitsGained` (schema 242) counts
  each unit `realiseItem` brings into being, by type: trained, bought, granted
  or levied. It is the moment the `unitGained` tally counts. Every bot reading
  of a unit pace reads it through `unitsGainedMatching` (`value.ts`): the
  `unitCompletion` and `completion` riders, the `unitTrained`, `unitGained` and
  `militaryGained` counts, the rally, the timed stamp and the levied share. The
  warscore's losses (`soldiersLost`) and the dogpile's raised strength
  (`raisedStrength`, both `diplomacy.ts`) read it too. These used to read
  `Player.unitsBuilt`, which counts only the settler and the worker because it
  sets their price, so every military pace read close to nought. No price
  reads `unitsGained`, and `unitsBuilt` is unchanged. The `unitTrained` count
  reads a little high: the tally leaves out bought units and conscripts, and
  the board keeps no count of either.
- **Only cards that can sit are named for a chair** (B5). A Boon, a charter
  and a fulfilled commission never take a chair. The reducer refuses them with
  `neverSeatedError` (`statecraft/council.ts`), the card half of
  `slotOrderError`. The bot asks the same function (`seatableOrders`,
  `council.ts`): the re-seat arm's bench, the scarcity count of the slot and
  re-seat arms, and `adoptionTable`'s fill of a new government's chairs all
  leave such cards out. `isSeatable` (`value.ts`) asks it too.
- **The great-person gate is priced by what it releases** (P3). Every
  technology ability is worth the flat `research.abilityValue` (20), except the
  one that lets renown call great people (`ancestorRites`, found by its
  ability id). That one is worth the great people the seat's banked renown and
  `research.greatPersonTurns` (30) turns of its renown income would call,
  walked up the sim's price ladder (`renownThreshold`), times the bot's price
  for a great person. That price is the offer arm's (`explainGreatPerson`,
  `bot.ts`: the act or the work, plus the legacy), averaged over the names the
  next offer can deal at the draw's own odds (`greatPersonBag`), with the act
  in place of the work, which only `bot.ts` can read
  (`expectedGreatPersonWorth`, `value.ts`). The flat value is the floor
  (`greatPersonGateTerm`, `chain.ts`). A card that grants a great person still
  prices it at the renown it costs, which is far lower; that is not changed
  here.

**Riders at full value, and rates from the seat's war plans** (bot pass 3,
batch BP4; `docs/flags.md` (ooooooo) B2; the audit is
`docs/audit/bot-pass-3-card-values.md` fault 2):

- **A rider is its moment's rate times one firing at full value**
  (`scoreWindfallRider`, `value.ts`). A rider that fires r times a turn and pays
  L each time pays r × L a turn, so no lump exchange is taken. Before, the grant
  also went through `explainLump` (÷ `score.lumpTurns`), and every rider read a
  twentieth of its pay. `windfallGrantWorth` returns a firing in two parts:
  `once`, what it pays in full, and `flat`, the stand-ins for what the bot does
  not price, which keep their figure. A grant that lasts (a mark, a hex
  claimed, a town turned) is a reading a turn, so its `once` is that reading
  times `score.lumpTurns`. The founding rider (`scoreFoundingRider`), its
  mirror The Planted Towns (`settlerCitizenCost`), a raid's plunder
  (`pillagePlunderWorth`) and a hex bought (`hexRiderWorth`) read the same way.
  A single firing set beside a rate (the pass in a draft, `passRiderTerms`; a
  hex bought, `hexPurchaseRiderTerm`) still takes the lump exchange.
- **The war moments read the seat's war plans and its fighting**
  (`ValueContext.warOutlook`, built by `warOutlook` in `bot.ts`, once a
  context). The plans: at war with an empire, or the seat's largest lean toward
  a war (`declarationLean`, its own sheet), and the soldiers spare of its
  garrisons (`strikeForce`). The fighting: the war-loss list the game keeps for
  weariness (`Player.warLosses`), read over the last `score.recentTurns` (20)
  turns and never past the rule's window.
  - The intent is 1 at war, and at peace the lean times
    `score.warPace.leanShare` (0.25).
  - A kill is the wild at the seat's own record (`Player.enemiesKilled` less
    `unitsKilled` over the turns played, never below the table's
    `barbarianKill` over the horizon), plus the intent times the kill pace at
    war: the rival pieces killed in the window a turn, never below
    `score.warPace.killsPerSoldier` (0.02) for each spare soldier.
  - A capture, and the unrest and razing that follow one, is the intent times
    the towns taken in the window a turn, never below the kill pace at war
    times `score.warPace.townsPerKill` (0.02).
  - A declaration and a peace are the intent over the horizon.
  - A death is the seat's own record of losses, or its losses to rivals in the
    window when higher.
  - A raid is the seat's own record of hexes pillaged. This bot gives no
    pillage order, so a raid rider reads nothing for a seat that has not raided.
  - None of them reads `ValueContext.threat`, which is danger at the seat's
    towns and not its own fighting.
- **The narrowings on a rider's moment** (`riderOccasionRate`, `capRate`).
  `vsBarbarians` reads the wild's half of the kill rate. `class` reads the share
  of the seat's combat pieces the filter admits for a kill, a raid or a death,
  and the units gained that match it for a unit finished. `oncePerTurn` and
  `oncePerTurns` cap the rate at one firing in that many turns.
- **A building finished reads the recent window too** (`buildingPace`, and
  `finishedRowRate` for a rider that names rows): the larger of the pace over
  the whole game and the pace over the last `score.recentTurns` turns, read off
  each town's age stamps (`City.buildingTurns`). A stamp on the founding turn
  (a gift of the founding) and a stamp from before the town was last taken do
  not count.

**Rites in their own town, and beliefs in the towns their faith can expect to
hold** (bot pass 3, batch BP5; `docs/flags.md` (ooooooo) B6 and B7; the audit is
`docs/audit/bot-pass-3-card-values.md` faults 6 and 7):

- **A rite is priced in the town it is said over** (B6). The rite plan hands its
  town to the walk (`explainEffects`' `town`). A hex line reads the worked hexes
  of that town only (`workedHexesAdmitting`, `groundOfHexLine`). With no town
  named, a context priced for one town (`townScoped`, `wants.ts`) reads its share
  of the realm's hexes, which is the mean town. The prophet's rite over every
  town and the levy's rite multiply that by the towns. Before, a hex rite read
  every town's hexes, so Rite of the Harvest read about ten times its pay in a
  realm of twelve towns.
- **A share of the food surplus reads the surplus** (B6, `growthShareWorth`,
  `value.ts`). The `growthSurplus` rule changes a town's surplus, so each town is
  the growth channel read with the share and without it (`channelSurplus`, which
  takes one extra percentage for this and keeps the channel's floor of nought).
  A town the scope does not admit, or a town with no surplus, adds nothing. A
  rite reads its own town and a card reads the realm's towns. Before, the rule
  read the empire's food a turn, which counts every town's harvest: the Rite of
  Fasting read as the loss of the whole empire's food, and the five Doctrines
  with a growth rule read high. The growth rows of the Aqueduct and the Hanging
  Gardens now read the realm's surplus, but still over the realm and not over
  their own town, which is the older over-read that `explainWrittenEffects`
  names.
- **The towns a faith can expect to hold** (B7, `faithTowns`). At a first pick
  (the seat has founded no religion yet, or its religion holds no follower
  belief yet) they are every town the seat holds. At a later pick they are the
  towns that follow the religion now and the towns that follow no religion. A
  town that a rival's religion holds is left out. The user's addition to B7 asked
  for this: a first pick has no followers, so a price of the following towns
  alone would be nought.
- **A follower belief at a choice** (`explainBeliefChoice`). The walk of its
  lines as they read in a town that follows (`asFollowing`: the faith part of
  each scope comes off, and a count of the town's followers reads its
  citizens), over every town, times the share of the towns the faith can expect
  to hold. The founding's two hands (`foundingRungs`), the next rung
  (`explainNextRung`) and the room of The Seven Councils (`beliefSlotWorth`) are
  priced this way.
- **At a decision** (the belief offer and its free redeal), a follower or
  enhancer belief of the religion the seat founded is stamped, as the B8 ruling
  asks. The sim's stamp puts it on the religion's shelf, so a follower belief is
  paid in the towns that follow now and nowhere else, which is the narrowing the
  audit asked for. What the stamp cannot see is added (`explainBeliefBeyond`): a
  line the books show, at its walk in the expected towns less its walk in the
  following towns with no promise; any other line, at its walk in the expected
  towns.
- **An enhancer belief at a choice** is read on a context of its own
  (`ValueContext.faithChoice`, `faithChoiceContext`). There, a count of the towns
  that follow the religion also counts the expected towns that do not follow
  yet, as a promise (`followingCountAhead`, read on a board where those towns
  follow). The buildings that such a count promises are the ones the expected
  towns could raise (`potentialTownsFor`), not every town's: The Scriptoria read
  every town's faith buildings.
- No new knob.

**No deck bonus, and commissions priced as investments** (bot pass 3, batch
BP6; `docs/flags.md` (ooooooo) B1 and B12; the audit is
`docs/audit/bot-pass-3-card-values.md` fault 1, and B12 is on the proposal page
the item links):

- **The deck bonus is gone** (B1). It added `score.synergyBonus` (14) points for
  each held card of an offered card's deck, with a seated card counted twice and
  no cap, and decided 42% of Order picks. The user: *"why is this bonus even
  needed? in theory, the greedy approach should be a good decision maker on its
  own already right?"* The knob is retired.
- **A card's own price** (`explainCard`, `council.ts`) has no deck term. The
  chair arms (`slotPairTerms`) and a new government's chair fill
  (`adoptionTable`) read it, through `seatPrice`.
- **A pick** (`explainDraftCard`) is the card's own price plus the deck terms
  (`deckTerms`). The Order, Doctrine and belief offers read it, and so do the
  two estimates of a hand to come: the pass (`skipCandidate`) and the culture
  price (the `cardWorth` closure in `bot.ts`). A common card and a card already
  held get no deck term. The terms:
  - **the tie-break**: `score.deck.tieBreak` (2) times the share of the seat's
    held cards (Orders and Doctrines) that share a deck with the card. Of two
    cards that pay the same, the one of the deck the seat holds more of wins,
    and no price moves by more than the knob;
  - **the progress toward the Doctrines still to come**
    (`explainDoctrineProgress`, `value.ts`): for each adoption the seat reaches
    over the horizon (`adoptionsAhead`) and each Doctrine of its decks that the
    adoption could offer (`doctrineBagFor`), the helpings the card adds to a
    `pays` line that counts the seat's Orders (`slottedOrdersOfSlot`,
    `slottedOrders`, `ordersHeld`, `decksHeld`), times what one helping pays,
    times one chance in the bag's size, times the wait at the seat's drafting
    pace. No Doctrine needs cards of one deck to be offered (the offer deals one
    from each of the seat's two decks, whatever it holds), and no card counts
    the cards of a deck, so today only The Magnaura's count of seated Civic
    Orders reads here.
- **The cautious version** is one knob away: with `score.deck.sharePerCard` above
  nought, a pick gains that share of the card's own price for each held card of
  its decks, at most `score.deck.shareCap` (0.5), in place of the tie-break and
  the progress. A card worth nothing or less gains nothing. It is off by default;
  it is there so the two versions can be measured side by side.
- **A commission's chair price** (B12, `explainCommissionChair`, `value.ts`). A
  commission pays nothing while it sits and its reward once, so a chair reads it
  as an investment, the reward against the turns of the chair it takes. The
  reward is read in full: a one-time reward at its lump times
  `score.lumpTurns`, and a lasting one at its rate for each turn of the horizon
  after the goal (`rewardTerms` marks each term as one or the other). Then:
  - **met** (and the reward can land): the whole reward for one turn of the
    chair, because it pays at the end of the turn and leaves;
  - **a counted part still to come**: a counted part grows only while the card
    sits, so the reward times the discount of the forecast turns
    (`commissionForecast`), over those turns;
  - **only reached parts still to come**: nothing, because a reached figure grows
    without a chair. The card is seated on the turn its goal is met: the re-seat
    arm looks on any turn when a held commission's goal is met
    (`metCommissionWaits`), not only on its own turn of the seal.
  Before, a chair priced a commission as a draft does, and in the audit's games
  only 2 of 26 commissions not met were ever seen in a chair.
- **The pull of a step** (B12, `commissionPullTerm`, `value.ts`). While a seat
  holds an open commission, an action that moves its goal carries one step's
  share of the commission's price (`explainCommission`: the reward at the delay
  of its forecast), the share being the part of what is still to come that the
  step brings, at most all of it. It is touch point (b) said for a commission:
  `chainTerm`'s share of a chain. A counted part counts a step only while its
  card sits; a reached part counts it whether the card sits or not; a goal with
  a floor is cut to `score.commission.floorShare`. A goal the seat will not meet
  inside the horizon has a price of nought, so its steps read nothing: the pull
  keeps a seat on a goal it can reach and does not start one it cannot. The arms
  that ask it:
  - the production table: a world wonder is one wonder completed, and a wonder
    or the Opus its cost in hammers put into a wonder (`buildingPullTerm`);
  - the beeline: the technologies on a road, and the charter technologies among
    them (`researchPullTerm`);
  - the rite plan: a rite started;
  - the gold book: a building bought with gold;
  - the hex planner: one more hex owned (scaled by the claim share, because the
    borders would claim an owed hex anyway) and one hex claimed (not scaled,
    because the borders claiming a hex count nothing toward it).
- **Not priced yet**: the cost of the work a goal needs that the seat would not do
  anyway (the forecast reads the seat's own pace, so a goal it does not work
  toward reads far away and near nothing), and the steps no arm above asks: a
  town taken, a war ended, a town converted, a rank earned, a great person's
  work, the luxuries, the routes, the treasury, the worked hexes and the council
  in order. A camp cleared is the camp hunt's since batch BP8 (`explainCamp`).

**The smaller readings, the wonder rewards and the Forbidden City's chair** (bot
pass 3, batch BP7; `docs/flags.md` (ooooooo) B10 and P9, both "as proposed on the
page" the item links; the audits are `docs/audit/bot-pass-3-card-values.md` fault
10 and `docs/audit/bot-pass-3-competitiveness.md` Part 4 row 10, which the page
calls P9):

- **A charter that opens no technology** (B10, `explainCharterOpening`,
  `value.ts`) is priced through the reading that exists for what it opens. Before,
  the seven live ones read nought.
  - A building (The Planters' Charter): the shelf it opens, in the towns that
    would raise it (`scoreUnlockedBuilding`).
  - A unit (Numidian Cavalry, The Chartered Company): the `unlocksUnit` reading.
  - A rite (The Fast, The Sabbath Laws): one town's blessing (`explainRite` on a
    one-town context) times the seat's towns, at nought or more.
  - A tended work (The Fish Traps, The Wild Orchards): nought, because the bot's
    roster (`workers.improvements`) lays no tended work.
  - A row the seat has opened already is worth nought, and a retired charter that
    names a row the tables no longer hold opens nothing.
- **A Boon** (B10, `onDraftWorth`):
  - a unit is the hammers it would cost the seat (`unitProductionCost`), as a lump,
    in place of a twentieth of a soldier's worth (`draftedUnitWorth`);
  - a trader is the best route a new caravan could run today
    (`RouteOutlook.open`), as a rate, while a route slot is free; nought with no
    slot free;
  - the lump is spread over the turns the game has left (`boonTurns`):
    `score.gameTurns` (200, new) less the turn now, at least one and at most the
    one horizon (`priorities.horizonTurns`). Before, every Boon was spread over
    `score.lumpTurns` (20). The Cabinet of Curiosities' card is held, so it is a
    rate and is not spread.
- **The Grain Census** (B10): its tally (`sizeRecord`) is forecast at the seat's
  pace of growth over the horizon, never below `score.tallyForecast.sizeRecord`
  (10, new). Before, the table had no forecast and the promise read nought.
- **A charter technology in the research choice** (B10, `readNodeGifts`,
  `chain.ts`) is read as the draft reads the charter: one flat gift,
  `explainCharterKnowledge`, which the road discounts like any other. Before, the
  road read its buildings town by town and its units as the levy does, so the two
  arms disagreed about one technology.
- **A held charter's technology is researched in time** (B10, `charterDeadline`,
  `bot.ts`). This is the proposal's one fixed behaviour. The game keeps no record
  of the turn a charter was drafted, so the deadline reads the road: once an
  opened charter technology's road can be learnt in `research.charterTurns` (15,
  new) turns at the seat's science rate, it is the research goal over the table's
  best. The nearest goes first. Nought turns the rule off.
- **Three completion grants** (P9, `completionGrantTerm`, `value.ts`), which fell
  to `score.unknownEffect` before:
  - Stonehenge's free god: the faith the next rung costs (`nextFaithRungCost`),
    as a lump; nought while the pantheon's bag is empty;
  - the Theatre of Dionysus' Doctrine offer: the bot's price for a Doctrine offer
    (`doctrineOfferWorth`), the reading a commission's Doctrine offer takes, as a
    rate;
  - the Theatre's free Amphitheatre: the hammers it would cost
    (`buildingProductionCost`), as a lump; nought in a town that holds one.
- **One more Wildcard chair** (P9 and the user's addition, `extraChairsWorth`,
  `value.ts`). The Forbidden City opens one for whoever holds its town (a rule of
  the game since this batch, `docs/wonders.md`). A chair takes the best card the
  seat holds and cannot seat now, priced as the slot arm prices it (the walk, or a
  commission's chair price); once the bench runs out, the card it expects to
  draft (`expectedBestOrder`), discounted for the drafts needed to fill the free
  chairs and this one at its drafting pace. Every `slotRider` that opens chairs
  reads it (The King's Friends, The Council of Ten, The Arthashastra, the
  Forbidden City) and so does a commission's `wildcardChairs` reward. A chair
  closed (Scutage) keeps the old stand-in. The slot arm fills the new chair as it
  fills any empty chair.

**The camp hunt, the worker's price, the wake arms and the next route** (bot
pass 3, batch BP8; `docs/flags.md` (ooooooo) P5, P6 and the P8 check; the audit
is `docs/audit/bot-pass-3-competitiveness.md` §3.4, §3.5, §3.7 and Part 4 rows 5,
6 and 8):

- **What a camp is worth** (P5, `explainCamp`, `value.ts`), a turn, in five lines:
  - the bounty (`campClearGold`, `campClearFood`), scaled by the seat's live riders
    that scale a camp's payout, through the lump exchange;
  - what the seat's live riders on the `camp` moment pay for one firing
    (`windfallGrantWorth`, through `firingPerTurn`);
  - a step toward an open commission that counts camps cleared
    (`commissionPullTerm`, the pull BP6 left for this batch);
  - the raiders it sends at this seat: when the seat holds the real town nearest
    the camp, one raid every muster cadence (`campCadence`, `barbarians.ts`, now
    exported), each at `camps.raidLoss` (1) of the hammers of the best melee piece
    the seat could raise (`bestMeleeFor`). A camp nearer another empire's town
    reads nought here;
  - the site it closes to a settler: when the expansion chain's site is inside the
    camp's guard ring (`campUnitRadius`), `camps.siteShare` (0.25) of the next
    town's worth over the horizon.
- **Which camp** (`campMarch`, `bot.ts`): a camp within
  `military.campHuntRadius` of one of the seat's towns, and within
  `camps.marchReach` (12) of the piece, ranked by its worth times the discount of
  the walk. Before, the hunt ranked camps by their distance to a town alone.
- **A force sized to the camp** (`campForce`). The guard is the wild's combat
  pieces within two hexes of the camp, the strongest of them up to
  `maxUnitsPerCamp`, each at the wild's combat bonus; the camp wants
  `camps.forceMargin` (1.5) times it. Strength is a piece's larger strength times
  its health against its own maximum, the empire's figure included. A piece joins a camp only while the seat's force bound to it (within
  two hexes, or on a march that ends beside it) is short, and only when the seat's
  spare field soldiers within reach can make it whole. A piece at the door holds
  there while the force can still be made whole.
- **The assault** (`campAssault`). When the force beside a camp is whole, a blow on
  the warden or a guard beside it takes `camps.assaultAppetite` (0.5) through the
  siege appetite's door in `favourableBlow`: the next piece finishes what this one
  starts. The rule that a melee piece does not strike a dug-in piece on ground that
  pays it still holds.
- **The hunt wakes its pieces** (`wakeTheHunt`, housekeeping). A dug-in or sleeping
  field soldier that holds no town, while every town is held, is asked the
  soldier's questions again once a turn (`BotSitting.called`) when it is within
  reach of a camp whose force is short and can be made whole, or beside a camp
  whose force is whole. Only a march or a blow is sent. The camps are read once a
  sitting (`BotSitting.hunt`, `huntCamps`). Before, a soldier that dug in once was
  never asked again outside a war.
- **The worker's price** (P6, `explainWorkerCraving`, `plan.ts`). The ground is the
  empire's: an entry counts on a hex a citizen of any of the seat's towns works or
  will work next (`empireSeats`). The remaining charges of every spade of the seat,
  and the charges of a spade queued in another of its towns, come off the front of
  the empire's list, best first (`spokenFor`). The spade walks out of the asking
  town, and a hex it would reach later than `workers.waitingTurns` (20) turns is not
  one it lays. Before, only the asking town's hexes counted, within
  `workers.planRadius`, and each spade on the board was charged to the town nearest
  it. `workers.planRadius` is still read by the chain's renewal step.
- **A sleeping worker is asked again** (P6, `wakeIdleWorker`, housekeeping): once a
  turn (`BotSitting.roused`), and the answer is sent unless it is another sleep. A
  worker that slept when its ground was finished used to sleep on while the towns
  grew onto new hexes.
- **The next route after a hire** (the P8 check, `nextRouteOffer`, `bot.ts`). The
  want book holds one route row, the best pair at sit-down, so a seat with free
  slots and the gold for them hired one route a turn. When the seat's running
  routes (`usedRouteSlots`) differ from the count the book was read at
  (`BotSitting.ctxRoutes`), the route outlook is asked again (`routeOutlook`) and
  its best pair is offered beside the book, at the book's prices and against its
  bar, once for each count of running routes (`BotSitting.routeOffer`). The
  sitting's context is still read once a turn, so a town founded during the turn
  has no rows in the book until the next turn. Reading the context again after
  every purchase, or after every founding and route hired, was measured and
  dropped: the first made the bot buy less in a turn and the towns make less, and
  the second spent about a third of a late turn on seed 42 reading contexts.
- **New knobs**: `camps.forceMargin`, `camps.assaultAppetite`, `camps.marchReach`,
  `camps.raidLoss`, `camps.siteShare` (a new block of `data/ai.json`) and
  `workers.waitingTurns`, each with a row in `data/ai.bounds.json`.

**The end check's faults** (bot batch BP9; `docs/flags.md` (ooooooo), the bullet
"BP9"; the measurements are the section "BP9" of
`docs/plans/performance-pass-2026-11-06.md`):

- **The empire's gold counted once a reading** (fault 1, a speed fix). Money at
  Work and Bills of Exchange pay in every town by the empire's gold a turn
  (`count: 'empireYield'`), and each town's count folded the whole empire. A
  reader at rest now asks inside `readingAtRest` (`statecraft/evaluator.ts`): the
  four readings of `readings.ts` and every bot decision (`nextBotDecision`). There
  the count reads its fold from the slate, on the economy clock, keyed by seat and
  by the four recursion cuts (`restingCutRates`). Outside the scope, in a handler
  or a phase, the count folds fresh as before. The figures do not change.
- **The campaign's asks made cheaper** (fault 2, a speed fix). A dug-in piece
  whose answer is to stay is still asked again at the next decision: in the
  pinned duel, 137 such answers became a march or a blow later in the same turn,
  so a remembered stay would change play. Instead the march's goals and the
  muster's goals are searched as one list each (`findPathToFirst`, the search's
  own proof), so an unreachable target costs one failed search and not four. The
  answers are the same.
- **The prophet's step** (fault 3). `holySiteStep` steps a piece only to a hex
  where it could raise a site on its next order: the reducer's gate asked of a
  positional copy of the piece on that hex (`plantErrorOn`), and for a founded
  faith a town there that holds no site (`townWantingSiteAt`). A prophet with
  nothing to raise stands down and sleeps. Before, it walked between two hexes,
  each the first legal neighbour of the other. The apostle's walk to a town that
  would keep its relic had the same fault: it asked only for the cathedral, so
  an apostle with a charge left walked between two towns that each kept a relic.
  It now asks `placeRelicError` of a positional copy too (`relicErrorOn`).
- **The focus hold** (fault 4, the user's guard). The focus arm prices its two
  placements at the seat's live prices. The comparison does not read the
  town's own focus, but the price of gold and science moves from turn to turn
  with what the seat could buy, and where the lean wins or loses by a few points
  the answer flipped turn after turn. The bot does not change a town's focus
  back for `driver.focusHoldTurns` (5) turns after it gave the order. The
  orders are dated in `focusRoll.ts`, a harness memory beside the state.
- **The settler's price** (fault 5, the user's guard). A settler row
  (`unitRoleValue` and the faith purchase's `expansionTerm`) is worth nothing
  while a settler of the seat sleeps for want of a site (`settlerWaits`), and the
  queue's row is worth nothing when no legal site is in reach of any town (the
  faith purchase already read it so). Before, the queue priced a settler at a
  whole next town in that case. A sleeping settler is asked again once a turn
  (`BotSitting.roused`), not at every decision. Not changed: the settler row
  still reads the chain's share when the chain's one step is the escort for a
  settler already standing. Pricing that step as the soldiers' alone cost 2 to 6
  towns a game at turn 100 on four seeds, because those extra settlers found
  other sites (the plan file's section "BP9").
- **New knob**: `driver.focusHoldTurns` (frozen with the rest of `driver.*`, so no
  row in `data/ai.bounds.json`).

## Personas and tuning

A **persona** (`data/ai.json`) is a sparse override of the same sheet, merged
once per seat by `aiConfigFor` — a zealot is a higher `weights.faith`, never a
second code path, and a typo'd key fails the build. The **arena**
(`arena.html`) generates its panel by walking the sheet, so a new knob appears
there with no page edit; edits become a sparse override folded *under* each
seat's persona (`setAiTuning`/`withAiTuning`, identity when untuned). A tuning
sheet never reaches a save — a tuned bot emits different commands, and those are
what the log holds.

**The bot is not a balance instrument** (the user's standing ruling): a human
plays several times the bot's tier-1 yields. Playtest is the judge; the arena is
for regressions and floors.
