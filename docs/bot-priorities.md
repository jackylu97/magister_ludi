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
