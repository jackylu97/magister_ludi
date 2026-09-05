# The priority system — spec of record (ratified in chat, 2026-09-04)

The architecture the user and orchestrator settled after `docs/bot-audit.md`:
the bot figures out its priorities first, and every decision arm reads them
once the values are known. Long-term goals are CHAINS priced over time;
currencies and constraints carry SHADOW PRICES; the arms keep their existing
explainers and fold the new terms. Greedy plan-keeping with a switching
margin; commitment is emergent from sunk-cost exclusion, never stored.

## Principles (each ratified in the design thread)

1. **Greedy with a margin.** Each template keeps its best chain; a
   challenger displaces the incumbent only by beating it by
   `priorities.switchMargin` (1.10). Sunk costs are excluded, so a
   half-executed chain's remaining worth rises as it is paid — incumbency
   is arithmetic, not memory. Plans flip on genuinely large events (a
   draft, a war, an age) and on nothing else, by construction.
2. **A portfolio, not a plan.** The empire runs several chains at once
   (tech + expansion + faith…). They compete only at shared bottlenecks,
   and the SHADOW PRICES are the arbitration layer.
3. **No stored goal state.** Everything derives from `GameState` per turn
   (the research queue, standing buildings and half-paid chains ARE the
   memory). Determinism holds trivially; replays are unaffected.
4. **Short-term stays local.** Unit tactics (heal, screen, ranged-first),
   tile workings and route picks keep their arm-local scoring; they feel
   the system only through prices.
5. **Everything prints.** Every chain, price and term lands in the
   candidates' folds — the spectate feed and the arena show the book.

## The formula

```
worth(chain) = payoff_rate × max(0, H − delay) + lump_payoffs − Σ_c invest_c × price_c
```

- `H` = `priorities.horizonTurns` (starts at `score.maxTurns`'s 40; its own
  knob so the arena can sweep it).
- `delay` = turns until the chain starts paying: beakers ÷ science rate +
  build turns + walk turns + wait-for-meter turns, per template. THE OLD λ
  IS SUBSUMED: the flat `score.potentialWeight` retires once delay-pricing
  covers its call sites (batch 2); `(H − delay)/H` is what 0.4 was
  approximating.
- `invest_c` = remaining spend in currency `c` (hammers, gold, faith,
  beakers) priced at that currency's CURRENT shadow price — so an
  expensive chain is cheap to an empire whose hammers are idle, and dear
  to one whose hammers are contested.
- Fractions/estimates throughout: an appraisal is an estimate, not a
  payout (the λ batch's own rule).

## Shadow prices

```
price(c) = clamp( max over wants of marginal_worth_per_unit(c),
                  weights[c] × bandLow, weights[c] × bandHigh )
```

- Computed per seat per turn from the want book; the age-banded `weights`
  table becomes the PRIOR and the band anchor, no longer the live value.
- `priorities.priceBandLow` 0.5 · `priorities.priceBandHigh` 3.0 (data
  knobs) — damping against oscillation; a price is a dial the book turns
  within a band the designer set.
- Batch 1 scope: gold and faith. Batch 4 adds constraints (authority,
  happiness, hammers-per-town) with the same shape.
- The user's case, pinned as a test: a live founder chain over a thin
  faith rate ⇒ faith's price rides its ceiling; an empire with nothing
  left to buy ⇒ the floor.

## The templates (batch-1 set marked ●)

- ● **The purchasing plan** (gold): ranked want-book — purchasable rows
  (through `explainPurchaseCost`/`purchaseError`), OTHER chains' steps
  (gold's bridge role: buying a university compresses the tech chain's
  delay), and the standing wage reserve (`reserveTurnsOfUpkeep` — the one
  survivor of the old spending knobs). SAVING IS A ROW: "hold toward want
  W, k turns out" at W's worth discounted by k.
- ● **The faith plan**: pantheon → founder → beliefs → rites → the
  Almshouse's civilians; delay off the faith rate.
- ● **The tech chain**: the beeline generalized — goal node + realization
  steps (buildings worth building × towns that would build them, units
  worth fielding, riders worth working), hammers in the price, delay
  through the whole chain. Subsumes and corrects `explainTechGifts`'s
  every-town optimism.
- **The expansion chain** (batch 4, with the constraint prices): site +
  settler + escort + authority-wait in the delay; retires the gate pile
  (`settlerCityPop`, `settlerAuthorityFloor`, `siteScoreMin` — the audit's
  inventory).
- **The army plan** (batch 4): threat-response valued at
  `threat × weights.military`, wage-priced at gold's shadow price (the
  wage-aware levy); conquest chains for the warmonger later.
- **The draft is not a template** — a card advancing any live chain folds
  that chain's term; culture's currency is the cadence itself.
- **Win conditions** (batch 5): the bead race and the Opus as chains with
  huge terminal values and honest delays — they take the book over in the
  late game because the numbers say so, not because a rule fires.

## Arm touch points (the whole integration surface)

(a) currencies/meters priced at shadow prices wherever `weights.gold` /
`weights.faith` are read today (`valueContext` builds the row once);
(b) a candidate that IS a step of a live chain folds
`chain.worth / chain.stepsRemaining` as a labelled term;
(c) spend arms carry saving as a candidate and lose their thresholds.

## Knobs

New (data/ai.json `priorities` block, typed in aiConfig.ts, auto-appearing
on the arena): `horizonTurns 40 · switchMargin 1.1 · priceBandLow 0.5 ·
priceBandHigh 3.0`. Deleted in batch 1: `spending.goldSpendAbove`,
`spending.faithSpendAbove`, `spending.goldReserve`, `spending.faithReserve`,
`religion.pantheonSpendAbove`, `religion.prophetSpendAbove`. Deleted in
later batches per the audit's inventory table.

## Batches, each an arena A/B before the next

1. ● **The book + gold/faith prices + the spend arms** — this prototype.
   Acceptance: t75 arena (seeds 5/777/20260904): buildings bought ≥
   baseline, no treasury hoards > ~200💰 while towns lack buildings, no
   new bankruptcies; the faith case test; every old spending-knob
   behavior reproduced or improved by prices.
2. **Delay-λ** — `(H − delay)/H` replaces `potentialWeight` at its call
   sites; the 3-turn-vs-1-turn save case pinned.
3. **Chains + the margin** — tech chain live end-to-end (the university
   fix pinned: an empire holding the tech builds the buildings).
4. **Constraint prices + the gate deletions** (audit table).
5. **Win-condition templates.**

## Batch 1 as shipped (`src/ai/wants.ts`, 2026-09-04)

- **The book.** `wantBook` = `purchasingPlan` (gold) + `faithPlan`. A `Want`
  carries label, currency, price, worth, delay and the terms the worth is the
  fold of. Purchase rows go through `explainPurchaseCost` + `purchaseError`
  (the sim's one gate); a building's worth is the queue's own reading
  (hypothetical `cityYields` delta + `explainBuildingRow` − upkeep) with no
  `÷ turns of build effort`, because delivery is instant.
- **Hold rows are how a threshold became a comparison.** The standing wage
  reserve (`solvency.reserveTurnsOfUpkeep × the bill`) is a want whose worth is
  `explainLump` of the coins it covers — so holding a coin is worth exactly the
  prior, and a purchase happens when it beats that. Saving rows are one per
  out-of-reach want at `worth × (H − turnsToAfford)/H`, dropped when the
  discount would go negative.
- **The price, as implemented.** `price(c) = clamp(max over c's wants of
  (worth ÷ price) × score.lumpTurns, prior × bandLow, prior × bandHigh)` with
  `prior(gold) = weights.gold × goldPressure` and `prior(faith) =
  weights.faith`. The `lumpTurns` factor is `explainLump`'s exchange rate run
  backwards — a want's worth is a stock and a weight is a rate — and **gold's
  price subsumes the pressure**, so nothing downstream multiplies by it twice.
  `ValueContext.prices` is what every fold in `value.ts` now reads for those two
  voices (`voiceWeight`).
- **Knobs.** Deleted: the whole `spending` block (`goldSpendAbove`,
  `goldReserve`, `faithSpendAbove`, `faithReserve`) and
  `religion.pantheonSpendAbove` / `prophetSpendAbove`. Added: the `priorities`
  block. The zealot's two deleted overrides are carried by the numbers it
  already had — `weights.faith` (double the balanced sheet, so double the band)
  and `religion.prophetTechValue: 950` (what the first god and the first
  religion are worth in its book).
- **Deferred out of batch 1**: gold's **bridge role** (buying a building the
  research goal unlocks compresses the tech chain) — it needs the tech chain,
  which is batch 3's template, and half of it here would mean writing
  `explainTechGifts` twice. `techChainWorth` is therefore not shipped. Also
  deferred: what an augur's **rites** are worth (a faith row with no live
  appetite is priced at exactly the faith it costs, and says so), and a
  contribution priced by the book rather than by the wage cover.
- **Measured** (t75, duel, seeds 5/777/20260904, two balanced seats): buildings
  standing 14 → 30, purchases 11 → 33, worst treasury held beside a town with
  no buildings 320💰 → 169💰, bankrupt seat-turns 0 → 0, net gold per turn
  −1/0/1/0/−4/−1 → 3/3/10/1/9/1.

## Batch 2 as shipped (the delay discount, 2026-09-05)

`score.potentialWeight` is **deleted** — from `data/ai.json`, from
`aiConfig.ts` and from every reader (a source test pins that the string is
gone from `src/ai/`). In its place `delayDiscount(delay, ctx)` in `value.ts`
answers `max(0, (H − delay) / H)` with `H = priorities.horizonTurns`, and
`delayTerm(delay, ctx, why)` prints it — the discount, the reason and **the
turns it was read off** — so every site still shows its own arithmetic.

Two estimates are shared rather than repeated, both hoisted onto
`ValueContext` by `valueContext` (the context's standing bargain — a per
candidate reading would be an empire sweep each):

- `medianProduction` — the **median** of the seat's towns'
  `cityYields().production`, 1 for an empire with no town. Median, not mean,
  so one hammer-rich capital cannot tell the beeline that every town raises a
  library in four turns. `buildTurns(cost, ctx)` is that division, rounded up.
- `scienceRate` — `empireRateReading().sciencePerTurn`, the denominator of
  every research delay.

Per site, the delay chosen and what it prints:

| Site | Delay | Printed |
|---|---|---|
| `explainTechGifts`' per-town building gift (`bot.ts`) | `buildTurns(row cost)` — the tech's own beakers are already the candidate's denominator, so this covers the BUILD half | `× 0.7 — towns that must still build it, some 12 turns against a 40-turn horizon` |
| the improvement rider's buildable half (`renewalTerms`) | `workers.planRadius + 1` — one crude constant-ish walk-and-lay estimate, written down as crude; a nearest-worker search per hex over fifty candidate nodes is not affordable. The **standing** half stays undiscounted: it pays the turn the node lands, and that wait is the tech's | `× 0.875 — the spades have still to get there, some 5 turns against a 40-turn horizon` |
| `explainCounted`'s buildable towns (`value.ts`) | `buildTurns` of the **mean cost of the rows counted open** (a single-building row answers its own cost) | `+ 4 more the towns could raise, discounted for the raising` with the discount as a part |
| the worker plan's anticipation (`plannedRiderTerms`) | beakers still owed for the planned node — its own cost plus everything ahead of it on `researchPlan`, less the pool — over `scienceRate`, floored at a beaker a turn | `× 0.5 — the node has still to land, some 20 turns against a 40-turn horizon` |
| a prophet with no god yet (`faithRowTerms`, `wants.ts`) | `turnsToFirstGod` — the cheapest consecration any town could buy, less the faith held, over the faith rate; the horizon (so, nothing) when no god is for sale anywhere | `× 0.6 — the god comes first, some 16 turns against a 40-turn horizon` |
| the **tally forecast** (`potentialTerms`) | **none** — `score.tallyForecast` is already "occasions expected over the horizon" and carries its own doubt. The flat λ was charging that uncertainty twice; the multiplication is simply removed | `+ 6 more barbarianKill to come, over the horizon` |

The saving rows were already `(H − turnsToAfford)/H` off the same
`priorities.horizonTurns` (batch 1) and are untouched: there is one `H`.

**Measured** (t75, duel, seeds 5/777/20260904, two balanced seats;
before → after): purchases 5/1/7/1/14/5 → 5/1/7/1/14/5, buildings standing
4/3/7/1/11/4 → 4/3/7/1/11/4, treasuries 102/37/67/64/120/111 →
102/37/67/64/104/111, techs 11/10/12/10/16/13 → 11/10/12/10/15/13, bankrupt
seat-turns 0 throughout. The batch re-ranks potential-heavy candidates and
almost nothing about the played trajectories moves — which is the honest
reading of a discount that mostly *raises* near promises (0.4 → 0.7 for a row
a town raises in a dozen turns) and zeroes far ones without changing which
arm wins.

## Batch 3 as shipped (the chains and the margin, 2026-09-05)

**The chain is a module.** `src/ai/chain.ts` — a tenth file in `src/ai/`, a leaf
under `value.ts` and `plan.ts` and above `wants.ts` and `bot.ts`:

```
techChain(state, player, ctx, goal, sites?) → {
  goal, road, held, remainingBeakers, researchDelay,
  steps: [{ kind: 'building'|'unit'|'rider', id, name, towns, cost, rate, delay, value, terms }],
  stepsRemaining, hammers, delay, worth, gifts, terms }
```

- `worth === foldTerms(terms)`, exactly, like every other appraisal in the bot.
- `terms` = the goal's unlocks step by step · `weights.tech` for holding the node
  · **less** the beakers still owed and the hammers its steps still owe, both
  through `explainLump` (`weights.science` and `weights.production`). Hammers have
  no shadow price until batch 4; the weight table stands in, and the two
  `explainLump` calls are the only lines that change when it lands.
- `delay` runs through the whole chain: `remainingBeakers ÷ scienceRate`, then a
  cursor that walks the **building** steps in roster order, each waiting for the
  ones before it. Towns build in parallel, so a step's build time is one town's
  (`buildTurns`) while only its hammers multiply by the towns owing it.
- **A realised step drops out by construction.** `step.towns` counts the towns
  that lack the row (one for a wonder, none for a wonder already claimed), capped
  at `score.cityCap`; a step no town owes is never made. That is the whole of the
  correction the spec asked for — the every-town optimism is gone — and the
  sunk-cost story with it: a University raised takes its 134 hammers out of what
  the chain owes and nothing out of what it pays, so the remaining worth rises.
- `stepsRemaining` counts **raisings** (`Σ step.towns`), not rows: a library owed
  by three towns is three things that still have to happen.

**`explainTechGifts` became `TechChain.gifts`.** Every clause moved into the chain
printing the same labels in the same order — units, buildings and their flats,
projects, abilities, the renewals (`renewalTerms` moved whole as `renewalSteps`),
and the rules the node itself carries. Two things changed on the way: the town
count is now *the towns that would raise it*, and the discount is the whole
chain's wait rather than one row's build (and it now covers the row's own gifts,
which used to arrive at full price on a node nobody had researched).

**The beeline's score IS its chain's worth.** `techGoalTable` drops the old
`÷ beakers` rate — the chain charges the beakers twice otherwise, once as the
delay every step waits through and once as the invest it subtracts — and
`research.costDivisor` is **deleted** with it.

**The margin, finally read.** `incumbentGoal(player)` is the last node of
`researchPlan` (the expansion is depth-ordered, so the destination is what the
road ends at) — derived, never stored. Its candidate carries a printed
`× priorities.switchMargin` term, so the argmax stays a plain maximum and a
challenger must beat the incumbent by a tenth to take the plan. A chain whose
remaining worth has turned negative is **not** defended: the margin multiplies,
so holding makes it worse and it is abandoned, which is the right answer.

**Touch point (b), the university fix.** `ValueContext.chains` = `liveChains` —
the incumbent's chain, plus one per technology the empire **holds** whose
buildings some town of its could still raise. A held technology is a chain with
no beakers left to pay, so its unbuilt rows are steps; a town's build candidate
that is one of them folds `chain.worth ÷ chain.stepsRemaining` as
*"a step of the Writing engine — one of 4 things still to happen"*. The chains
carry no renewal riders (`liveChains` takes no ground survey — `valueContext` is
asked once per decision and `surveyUpgradeSites` walks every owned hex); the
beeline's do, where the sweep is hoisted once for the whole table.

**Gold's bridge role** (the batch-1 deferral) is a **term on the row it bridges**,
not a second row: the purchasing plan already walks every building in every town,
and a duplicate row would be the same purchase ranked twice against a price that
is a maximum over the rows. `chainCompression` reads the chain object the context
already carries — every building step from this one on, at `delayDiscount(d − b)
− delayDiscount(d)`, over the towns the step is owed by — and prints
*"it buys the Writing engine the turns this town would have spent raising it"*
with *"Library pays 4 turns sooner"* under it.

**Rites priced** (the other batch-1 deferral). A faith row that performs rites is
worth what its best **known** rite does, times its charges: the lasting half
through `explainEffects` (the reader the drafts use) scaled by
`duration ÷ score.lumpTurns`, the yield-shaped half of its grant through
`explainLump`, and every other grant key at `score.unknownEffect`, printed as
unread. `hasAbility` + `riteAbility` is the gate, which is `riteError`'s own.

**Contributions rank through the book.** `contributionCommand` scores a press as
the front row's worth (the queue's own reading — the hypothetical `cityYields`
delta and `explainBuildingRow`) times the delay the hammers buy, per coin, and
compares it against the best **hold** row in that bank — `bankSpend`'s bar, off
the same book. The wage cover survives as a refusal, with the `endsTheGame`
carve-out unchanged.

**Measured** (t75, duel, seeds 5/777/20260904, two balanced seats;
before → after, six seats in seed then seat order):

| | before | after |
|---|---|---|
| purchases | 5/1/7/1/14/5 (33) | 6/6/3/5/9/9 (38) |
| buildings standing | 4/3/7/1/11/4 (30) | 8/11/5/4/10/17 (55) |
| treasuries | 102/37/67/64/104/111 | 95/80/60/35/83/122 |
| technologies | 11/10/12/10/15/13 (71) | 10/9/12/11/16/17 (75) |
| towns | 2/3/3/2/3/2 (15) | 2/2/1/1/4/2 (12) |
| bankrupt seat-turns | 0 | 0 |
| re-aims, first 40 turns | 7/13/14/11/13/10 (68) | 5/4/2/3/2/3 (19) |

Over a wider sweep (seeds 1/2/3/42/101/999/31337/20260101, sixteen seats):
purchases 96 → 114, buildings 87 → 127, treasuries 2155 → 2343, technologies
195 → 196, bankrupt seat-turns 0 → 0, re-aims 175 → 67. On the wants suite's own
board (seed 20260831) the re-aim count is **31 → 10**, against the 15 → 31 batch 1
measured — the wobble is back below where it started, and it is pinned as a
ceiling.

**The one number that moved the wrong way: towns, 33 → 28 across sixteen seats.**
Attributed by measurement — with the chain term switched off, towns and buildings
both sit exactly at the baseline (33 and 87), so the whole of the +40 buildings
and the whole of the −5 towns are the same term. That is the expected shape of a
half-built system: a building can be a step of a chain and a settler cannot,
because **the expansion chain is batch 4's** ("site + settler + escort +
authority-wait in the delay"). Until it exists the settler argues against a
priced engine with nothing but its own flat `weights.city`, and it loses some of
the arguments it used to win. Nothing else regressed: no new bankruptcies, no
hoards, and the treasuries stayed level.

**Known gaps, written down rather than fixed.** A chain's worth can be negative —
the hammers it still owes outweigh what finishing it would pay — and its steps
then carry a negative term, which is honest (a town has better things to build)
and is what makes the margin abandon a bad plan. The contribution arm's new
ranking was never exercised in any measured game: nothing on these boards took a
contribution before t75.

## Batch 4 as shipped (the constraint prices and the gate deletions, 2026-09-05)

**The expansion chain** (`expansionChain`, `chain.ts`, beside `techChain`):

```
expansionChain(state, player, ctx, probe, settler) → {
  site, settler, hammers, buildDelay, walkDelay, delay,
  short: { authority, happiness }, payoff,
  steps, stepsRemaining, escortNeeded, worth, terms }
```

- `worth === foldTerms(terms)`, exactly, like every other appraisal.
- `terms` = one more town (`explainNextTown`, moved into `chain.ts` and
  re-exported from `bot.ts`) **plus the engines it would join**
  (`townChainShare`) × the **walk** discount, **less** the meter points founding
  would over-spend. The site's own `explainSite` total and the settler's hammers
  are printed as **zero-valued labels**, each for a stated reason.
- **The settler candidate's whole value is the chain's share**, not a term added
  to `explainNextTown` — the one place touch point (b) reads differently for a
  settler than for a building, and deliberately: a library has a worth of its own
  in the town that raises it, a settler makes nothing anywhere, so folding the
  town beside the chain would count it twice.
- **`townChainShare` is the missing half of batch 3.** A tech chain's building
  step is owed by the towns that lack the row and every one of them folds
  `worth ÷ stepsRemaining` when it raises it; a town this empire does not have
  can raise nothing. Founding one adds a raising to every live chain at
  `step.value ÷ step.towns` less one copy's stones. This is the term that
  actually heals the regression — the chains are built **before** the expansion
  chain in `valueContext` so that it can see them.
- **A realised step drops out by construction**: a settler already walking owes
  no hammers and is no step, so `stepsRemaining` is 0 and no town wants a second.
  The escort is a step only once a settler is standing and refusing to walk —
  before that there is nothing to escort, and two steps would halve the share and
  could leave an empire building neither.
- **The walk is discounted and the raising is not.** `push` scores a build
  candidate `value ÷ turns of build effort`, which *is* the price of the raising
  and *is* the price of its hammers; charging either again here would be the bot
  disagreeing with itself about one wait. What `push` cannot see is the road after
  the piece exists.

**The authority reading, chosen and written down.** The spec asked for a wait "if
authority regrows". **It does not**: `explainAuthority` folds *capacities* — the
palace, one line per age advanced, buildings' `authorityCapacity`, a seam, a card
— less what each town costs. Nothing accrues per turn, so there is no number of
turns to derive and a wait would be invented. What an over-spent meter is instead
is a **cost**: the town is founded, the writ goes negative, borders freeze and the
malus tier bites every town. The chain charges the shortfall at the meter's price
and prints it; happiness is charged by the same clause for the same reason (a town
founded into a deficit stifles the growth of every town already standing).

**The constraint prices** (`meterPrices`, `wants.ts`), through one door
(`meterWeight` in `value.ts`, `voiceWeight`'s sibling — every reader of
`weights.authority` / `weights.happiness` now walks through it: a building's
capacity and happiness lines, the three card arms, a payout's two):

```
price(m) = clamp( max(prior, chain.payoff ÷ chain.short[m]),
                  prior × priceBandLow, prior × priceBandHigh ),  prior = weights[m]
```

The `max(prior, …)` is the one deliberate difference from a bank and it is the
difference between a stock and a capacity: an empire with nothing to buy prices a
coin at the band's floor, but headroom on a meter is a standing tier bonus no
empty book can revoke, so a constraint's band only ever ratchets **up** and
`priceBandLow` is unreachable for the two meters. The payoff is read **before**
the chain's own charge — reading it after would be a fixed point, batch 1's one
honest pass said once more.

The audit's example is pinned: the palace supplies 4 writ, a capital costs 0, a
further town 3 — so a two-town empire holds 1 and its third asks 3, a shortfall of
exactly 2 that needs no tuning to produce. Authority then rides its ceiling
(`weights.authority × priceBandHigh`) and the same capacity building appraises
strictly higher than it does at the flat weight.

**Hammers: the batch's one written-down non-delivery.** No shadow price, by the
spec's own escape hatch, and the note is in `chain.ts`' docblock: the two cheap
empire-level readings of hammer scarcity both answer the same number every turn
(the share of towns with a non-empty queue is 1.0 by construction — the bot
answers the `cityProduction` blocker every turn; median queue depth is one or two
rows on every board), and the honest alternative is the per-town auction the brief
rules out. A factor that is always one is a multiplication by one wearing a price.

**The wage-aware levy.** The hard `held >= wanted` refusal became a printed
**surplus charge** — `−soldier.worth × held ÷ wanted` — which is
`explainMixCraving`'s shape one level up: nothing at an empty levy (so the piece
is worth exactly what it was worth before this batch), the soldier's whole worth
charged back at the levy, and more past it, so an army nobody needs prices itself
out one piece at a time. A **loose cap at twice the levy** stands as the bound the
gate used to be (dated 2026-09-05). The wage itself is not repeated in the branch:
`push` already subtracts `explainUpkeepCost(unitUpkeep)` at **gold's shadow
price** from every candidate, so a bleeding empire — whose coin rides its band —
pays more for the same spear, and with the gate gone that margin now decides.
Measured on the sheet: with the charge switched off (gate restored) the same three
seeds give 8 towns and 31 buildings against 15 and 46 with it.

**The gate deletions**, and what carries each intent:

| Deleted | Replaced by |
|---|---|
| `expansion.settlerCityPop` | `explainCitizen` already charges the citizen the town loses |
| `expansion.settlerAuthorityFloor` | the chain charges the writ founding over-spends, and makes writ dear to every other arm |
| `expansion.siteScoreMin` | the build arm's own competition (the settler competes for hammers in the one currency); the settler's arm keeps only *where*, and the ground under the piece is the bar |
| `workers.perCity`, `workers.cap` | the craving prices the ground; the cap was measured never to decide anything (no seat in 22 t75 games held more than 2 spades against a ceiling of 6) |
| `trade.tradersPerCity` | route pay is priced; `traderCap` stays as the loose sanity cap |
| `military.armyPerCity`'s gate half | the surplus charge above; the number itself stays as the levy's size |

`expansion.settlerCap`, `trade.traderCap`, `military.scoutCap` stay as the audit's
loose sanity caps; `expansion.siteSearchRadius` stays as what the audit calls the
one honest kind of cap, a bound on compute — the chain's site probe and the
settler's march both walk it.

**Two things the deletions broke, and the two replacements that are batch 4's
own.** Deleting `siteScoreMin` deleted the only reason a settler ever *stopped*:
the old arm founded wherever it stood as soon as the ground cleared 14, and
without that a settler walked to the best hex in eight rings, re-decided the next
turn against a map that had opened further, and was killed in the open having
founded nothing (measured: a capital founded on turn 6 instead of turn 1, and a
seat that ended a game with no town at all). Two priority-system tools stand in
its place, both in `marchToSite`:

- **the road is priced** — a candidate site is `(what a town is worth + the settle
  table's total) × delayDiscount(walk)`, against the undiscounted ground under
  the piece. Both sides carry the town, because what a walk delays is a *town*
  and not the handful of points two good hexes differ by;
- **the margin defends the ground under the piece** — `priorities.switchMargin`,
  the same tenth the beeline defends its plan with (principle 1).

**A settler asleep is a settler nobody asks again** (`wakeIdleSettler`,
`housekeeping`). A settler whose every site is struck stands down, and standing
down is *sleep*; `wakeSleepers` wakes a sleeper on something new coming into
view, so a raider that simply leaves wakes nobody. The measured case is a settler
asleep on one hex from turn 38 to turn 76, four hexes from a legal site, in an
empire that ended with one town — the audit's idle settlers, still alive. An order
is a waking, so this asks the settler's own arm what it would do awake and sends
that, firing only when the answer is a march or a founding (which is what keeps
the driver's loop finite: every such decision clears a `sleeping` bit nothing in a
turn sets). Worth three towns on the acceptance seeds by itself.

**Persona fallout.** Wide's `settlerCityPop 2` / `siteScoreMin 11`, tall's `5` /
`22` and the warmonger's `12` are gone, and each intent rides on the numbers that
were always the *preference* rather than the feasibility sentence:

- **wide** — `cityValueFalloff 1.0` and `weights.city 150`. Its deleted gates said
  *settle sooner and on worse ground*, which is now every empire's default (there
  is no pop floor and no site floor anywhere in the bot), so what distinguishes
  wide is that it never tires of the next town.
- **tall** — `cityValueFalloff 0.6` and `weights.city 80`, plus a carrier batch 4
  gave it that it did not have before: `weights.happiness 16` against the balanced
  12 is what the expansion chain charges for a town founded into a deficit. *"Only
  settle excellent ground"* became *"tall minds the crowding more"* — the same
  sentence said as a price.
- **warmonger** — `weights.city 125` with the balanced falloff: it takes towns, it
  does not court them.

**Measured** (t75, duel, two balanced seats; before → after):

| seeds 5/777/20260904 | before (batch 3) | after |
|---|---|---|
| towns | 2/2/1/1/4/2 (12) | 2/3/1/3/2/3 (**14**) |
| buildings standing | 8/11/5/4/10/17 (55) | 14/5/5/5/9/8 (46) |
| treasuries | 95/80/60/35/83/122 (475) | 107/52/81/112/195/67 (614) |
| technologies | 10/9/12/11/16/17 (75) | 15/12/12/12/11/13 (75) |
| bankrupt seat-turns | 0 | 0 |

| seeds 1/2/3/42/101/999/31337/20260101 | batch 2 | before (batch 3) | after |
|---|---|---|---|
| towns | 33 | 28 | **38** |
| buildings standing | 87 | 127 | **140** |
| treasuries | — | 2343 | 1973 |
| technologies | 195 | 196 | 173 |
| bankrupt seat-turns | 0 | 0 | 0 |

**The headline, honestly.** Over sixteen seats the towns regression is not merely
healed but passed — 28 → 38, against batch 2's 33 — with batch 3's buildings kept
(127 → 140) and no new bankruptcies. Over the three-seed acceptance set the same
build reads 12 → 14 against batch 2's 15, which is one town short of the stated
bar on six seats. The two readings disagree by less than the seat-to-seat spread
inside either of them, and the batch was tuned to neither: every intermediate
build was measured on both, and the changes kept are the ones that moved both.

**The one number down: technologies, 196 → 173 over sixteen seats** (the three
acceptance seeds are level at 75). Attributed by measurement: with the constraint
prices switched off and everything else standing, the same sweep reads 183, so
about a third of the fall is the happiness price — an empire near zero contentment
is over-spending it more or less permanently, so happiness rides its ceiling, and
a row that pays three contentment outbids a library while it does. That is the
price doing exactly what the spec asked of it; whether `weights.happiness 12` is
the right prior underneath a ×3 band is a tuning question for the arena, and it is
the first thing to sweep. The rest is the wider empires themselves: 38 towns is
ten more sets of founding costs, settler hammers and city upkeep than 28.

**Known gaps, written down rather than fixed.**

- **Two weight tables, still.** The site's own appraisal (`site.yieldWeights`) is
  folded into the chain at **zero** and printed as a label. Pricing a site's ground
  in the one currency is the audit's Layer-0 unification and is nobody's batch yet;
  until it lands, *which* site is decided by the settle table and *whether* a town
  is worth founding is decided in the one currency, and the two never mix inside a
  fold.
- **The site probe takes the nearest legal site, not the best.** That is what makes
  it affordable — `valueContext` is asked once per decision, and appraising two
  hundred candidate hexes would be two hundred ring walks — and it makes the
  chain's walk optimistic, since the settler's own arm may walk further for better
  ground.
- **The chain charges its own shortfall at the prior, not at the price it sets.**
  Charging at the live price is the fixed point batch 1 refused, and it degenerates:
  the price *is* payoff ÷ shortfall, so the charge would cancel the payoff and a
  blocked expansion would be worth nothing at all.
- **The escort term has never been exercised on a measured board.** Every seat that
  had a settler out also had a column near it, so `escortNeeded` stayed false
  throughout the sweeps; the arithmetic is pinned by test and by nothing else.

## Batch 5 as shipped (the win-condition template, 2026-09-05)

**The bead race is a chain** (`beadChain`, `chain.ts`, beside `techChain` and
`expansionChain`):

```
beadChain(state, player, ctx) → {
  opus, threshold, held, needed, rate, beadDelay,
  road, remainingBeakers, researchDelay, hammers, buildDelay, delay,
  open, raceHorizon, rival, lost, live,
  steps, stepsRemaining, worth, terms } | null
```

- `worth === foldTerms(terms)`, exactly, like every other appraisal in the bot,
  and every nested part folds to the term above it (pinned on a played board and
  on three arranged ones).
- `terms` = **the curtain** (`weights.victory`) at the delay discount · **the
  beads still owed** (`weights.bead` each) at the rod's own discount · a
  zero-valued label printing the whole road · and, when the race is lost, a
  `× 0` naming the rival that holds it. The existing weights keep their meaning
  exactly: what batch 5 adds is *when* each of them arrives.
- `delay` is the honest road from here to a **closed** great work:
  `max(beadDelay, researchDelay) + buildDelay` — the rod and the road to the
  closing technology fill together (an empire researches while it earns), and
  the raising follows both. The road is priced by the same `researchRoad` the
  tech chain opens with, and it is owed **only while the work is shut**:
  `worldUnlockTech` is a world gate, so an empire whose rival has already
  reached Alchemy owes no beakers at all.
- `buildDelay` is the work's twelve hundred hammers over the **busiest** town's
  production, not the median's — a capstone is not raised by a middling town and
  the endgame arm has always picked the busiest one (`isOpusTown`).
  `medianTownProduction` became `townProduction`, which answers both readings in
  one sweep.
- `stepsRemaining` is `needed + 1`: the beads still owed **and** the raising. A
  bead is not a thing a town can build and is counted anyway, for the reason
  `TechChain.stepsRemaining` counts raisings — a rod one bead short should hand
  the work half the race rather than a twentieth of it. It is what makes the
  race *concentrate* as it is run.

**The rate, chosen and written down as crude.** Beads are lumpy — a quest
answered, a first taken, a node that pays one — and nothing in this bot can
forecast which of twenty-five cards a board will hand a seat. So the rate is the
seat's own record: **beads earned over turns played**, floored at one bead a
horizon so an empire that has earned none is slow rather than stationary
(`savingRows`' bargain said once more). It under-reads a seat that has just
entered an age with a fresh hand it has not answered, and over-reads one that
took three firsts in the opening. A guess dressed as a forecast would be worse
than an average that says it is one.

**The urgency, and the batch's one deliberate departure from the brief.** While
nobody holds the closing technology the race is one plan among many and is
discounted `(H − delay)/H` like every other. The turn somebody reaches it
(`opusOpen`) the race is **on**: the game now ends when a work is finished rather
than when a horizon runs out, so the chain stops discounting by `H` entirely and
asks one question instead — *can this empire get there before the nearest
rival?* If it can, the curtain is worth the whole of `weights.victory`; if it
cannot, it is worth nothing and prints so. The brief suggested
`min(H, the rival's close)` for that live-race horizon; the `min` is not shipped,
because clamping at forty turns would let the **planning** horizon kill a race an
empire is comfortably winning, which is the thing an open race exists to stop
doing.

**The rival check.** `Player.beads` is public — the Abacus shows every real
seat's rod to every player and no fog touches it — so the chain reads rival
tallies openly, exactly as a human at the same table reads them. The nearest
rival's clock is its own rod at its own rate plus **this** empire's build delay
as a stand-in (what a rival's busiest town makes is a sweep of towns this seat
may not have charted; written down rather than hidden). The race is **lost** when
that rival would close first *and* hold more beads when it does — which is
`closeTheGreatWork`'s own rule, most beads at the moment the work is finished —
and a lost race folds a printed `× 0` naming them, rather than merely reading
low. A bot pouring hammers into a race it cannot win is the failure that clause
exists to prevent.

**The takeover door is one function, read by four arms.** `raceTerm(ctx, row)`
answers a labelled term or `null`, and `racePays` decides membership off the
rows' own markers and never off a name: a building's `endsTheGame` or an
`onComplete` grant of a bead, a race project's `bead`, a node's `paysBead`. The
four readers are the build list (buildings and projects), the purchasing plan,
the contribution arm's front row (the Opus is the one row that
`acceptsContributions`), and the beeline's own gifts — `TechChain` prices
`paysBead` for the first time, at `weights.bead` or, while the race is live, at
the race's share. Nothing fires a rule anywhere: the race puts a number on four
kinds of candidate and the ordinary argmax decides.

**Live, and the one new knob.** A candidate carries the term only while the chain
is live — not lost, worth something, and within
`priorities.raceLiveHorizons` (**2**) horizons of the finish while the work is
shut, or inside the rival's clock once it is open. The win condition is the one
chain whose delay is routinely longer than a plan, so a horizon that zeroed it
outright would mean it never took the book over at all; being live is permission
to argue, not a bonus, and the ordinary discount still applies throughout.

**Measured** (t75, duel, seeds 5/777/20260904, two balanced seats; batch 4 →
batch 5):

| | batch 4 | batch 5 |
|---|---|---|
| towns | 2/3/1/3/2/3 (14) | 2/3/1/3/2/3 (**14**) |
| buildings standing | 14/5/5/5/9/8 (46) | 14/5/5/5/9/8 (**46**) |
| technologies | 15/12/12/12/11/13 (75) | 15/12/12/12/11/13 (**75**) |
| treasuries | 107/52/81/112/195/67 (614) | 107/52/81/112/195/67 (**614**) |
| bankrupt seat-turns | 0 | 0 |

**Not one figure moves, and that is the acceptance.** Six seats hold eight beads
between them at t75 — a bead every fifty-odd turns — so every seat's rod is
nineteen or twenty short, the whole race prices at exactly zero, and no candidate
anywhere carries its term. The null half is pinned as a test rather than left to
the table.

**The smoke** (300 turns, seed 5, one duel; a reading, not a pin). The leading
seat's bead rate settles around 0.08 a turn and its raising falls from 300 turns
to 31 as its towns grow; the race's whole delay reads 101 turns at t201 — five
beads of rod, the road to Alchemy, and the raising — against a live bound of 80,
so the chain is still dark and the game is still being played on ordinary rows.
**At t221 it goes live**: somebody has reached the closing technology, the leader
holds 16 beads, and the chain reads `worth 1500 · delay 86 · open · live` — the
curtain at full price, because the only rival on the board is 790 turns from
closing and the leader is 86. The trailing seat's chain reads **lost** from t51
onward and says whose name is on it, every turn, for two hundred and fifty turns.

What the leader then *does* with a live race is nothing, and the reason is the
gate rather than the bot: the rod goes 16 → 19 by t300 and the Magnum Opus asks
for twenty, so the one row the race would have it raise is refused the whole
time, and the bead-paying rows of its age are already standing in its towns. So
the honest answer to *when does the endgame template start deciding* is: the
chain lights about a hundred and fifty turns after the acceptance window closes,
and the first decision it actually changes is the twentieth bead's.

**Known gaps, written down rather than fixed.**

- **A quest is not readable.** The brief asked for quest-advancing candidates to
  fold the term "where readable", and they are not: a count deed ("twelve cities
  of six citizens", "a library and a university in four towns") would need the
  bot to evaluate `beadCount` hypothetically against a row it has not built,
  which is the per-candidate empire sweep the brief rules out everywhere else.
  The three markers `racePays` reads are the ones a row carries about itself.
- **The chain zeroes rather than scaling.** The spec asked for the worth to
  "scale with the race being winnable"; what shipped is the binary — full while
  the empire can get there first, nothing when a rival holds it whatever this
  empire builds. A soft lead ratio is a tuning question with no board to tune it
  on yet, and a printed zero is a decision a reader of the feed can argue with.
- **The rival's raising is this empire's.** See the rival check above.
- **The takeover has never been exercised in a measured game**, only on the
  arranged board. The 300-turn smoke gets as far as a live chain and no further:
  no seat in this programme has filled a rod, so the term has never yet decided a
  queue on a board nobody arranged. The arithmetic is pinned by test and by the
  smoke, and by nothing else.

## The programme, closed

Five batches, one system: the book prices the banks, the delay discount prices
time, the chains price long goals, the constraint prices price the meters, and
the win condition prices the game itself. Every one of them landed as
**arithmetic in the candidates' folds** rather than as a rule, which is what the
spec asked for on its first page — the spectate feed and the arena show the whole
book, and no knob anywhere says *do this above that number* any more. Fourteen
tuned knobs were deleted across the five batches (six spending thresholds, the
flat potential weight, the beeline's cost divisor, and the audit's six-row gate
pile) and two were added (`priorities`, five numbers in all).

The running measurement, t75 on the acceptance seeds (5/777/20260904, two
balanced seats, six seats in all):

| | batch 1 | batch 2 | batch 3 | batch 4 | batch 5 |
|---|---|---|---|---|---|
| towns | — | 15 | 12 | 14 | **14** |
| buildings standing | 30 | 30 | 55 | 46 | **46** |
| technologies | — | 71 | 75 | 75 | **75** |
| treasuries | — | 485 | 475 | 614 | **614** |
| purchases | 33 | 33 | 38 | — | — |
| bankrupt seat-turns | 0 | 0 | 0 | 0 | **0** |

and over the wider sweep (seeds 1/2/3/42/101/999/31337/20260101, sixteen seats):
towns 33 → 28 → **38**, buildings 87 → 127 → **140**, both across batches 2 → 3
→ 4, with batch 5 leaving every figure untouched by construction.

What the arena is for now is the tuning nobody has done: the first sweep to run
is `weights.happiness` under its ×3 band (batch 4's one regression, ten
technologies on wide empires), then `priorities.horizonTurns` against
`score.maxTurns`, then `raceLiveHorizons` on a board long enough to reach the
race at all.

## Batch 6 — ratified 2026-09-05 (the post-programme hardening + two new plans)

Four parts, in order:

1. **The perf hoist.** `valueContext` is built once per seat per TURN (the
   driver/stepper hoists it; every decision inside the turn reads the same
   book and prices). Deterministic — arguably more coherent, a turn is one
   sitting. Measured target: claw back most of the 167ms/turn (was ~50 pre-
   programme; one t75 game 12.5s → aim ≤7s). Anything a mid-turn mutation
   invalidates (a purchase changing the treasury) is re-read from state by
   the arm that needs it, never by rebuilding the book.
2. **The negative-chain floor.** A held-tech chain (the university-fix
   family) with worth ≤ 0 leaves `liveChains` — advice, not a debt; its
   steps must never read worse than chainless. The research-goal chain keeps
   its honest negative (the margin abandons it).
3. **The draft plan.** Culture joins the priced currencies: the next draft
   as a want — worth = E[best of the dealt hand] over the REAL draw
   (current pool, the M/E/W guarantee, rarity weights, standing pity) using
   scoreCard's own readings, MINUS the replacement cost when slots are full
   (the worst slotted card is what a new card displaces); delay = culture
   owed ÷ culture rate. Skip is priced: its value is the pity-improved next
   draw. Culture's shadow price = the draft plan's marginal worth, banded
   like gold/faith. Honest gaps written down, not bent: option value of
   conditional cards (a war card at peace) and unread grants stay crude.
4. **The chain-derivative production price.** Hammers get their price from
   the chains themselves: the marginal worth of one hammer in a town =
   turns it shaves off the chains whose steps that town owes × what those
   turns are worth ((H − delay)/H arithmetic on numbers the chain already
   carries). Folds as a printed term on production-raising candidates —
   mines, workshops, +production cards, and CITIZEN FOCUS (the bot wires
   setCitizenFocus for the first time: focus production while chain-bound,
   default otherwise; the focus is a command, replay-honest). Near-zero
   when nothing rich waits on hammers. Banded like the other prices.

## Batch 6 as shipped (the hardening and the two new plans, 2026-09-05)

### Part 0 — two fold bugs the slow tier caught in batch 4

Both were the same mistake, a candidate carrying arithmetic that was not its own,
and both are pinned by `test/sim/aiDecision.slow.test.ts`' fold audits:

- **the settler's chain term** printed `parts` that folded to the whole chain's
  worth beside a `value` of the share — and printed *"one of 0 things still to
  happen"* with a hundred and nineteen points under it when the chain had no step
  left at all. `expansionShareTerm` (`bot.ts`) is the fix: a chain owed by more
  than one thing carries the division in its parts, and a chain owed by nothing
  says so and carries none.
- **`marchToSite`'s candidates** computed `(townWorth + appraisal.total) × walk`
  beside a term list that folds the same sum in a different order — a different
  floating-point number (147.60225000000003 against 147.60225). The score is
  `foldOf(scored)` now, and the bar the switch margin defends is the same fold
  read once.

### Part 1 — the perf hoist

**`BotSitting`** (`bot.ts`): a seat's one `ValueContext` for the whole of its
turn, built lazily by the first arm that asks and read by every arm after it.
`driveSeat` and the stepper's `SeatRun` each open one; the shape is an **optional
trailing parameter** threaded through every arm, so `nextBotCommand(state,
playerId)` and `nextBotDecision(state, playerId)` still answer exactly as they
did for the tests and for the two exported production pickers a human seat's
puppets go through. A sitting handed to the wrong seat is ignored (`seatContext`
guards on the seat id) — the same reason `ValueContext.ai` is not a global.

**What a mid-turn mutation invalidates is re-read from the state, never
rebuilt.** `bankSpend` asks `bankOf` for the cover and `purchaseError` for the
rules at the moment it fires, and a row the live gate strikes is marked refused
in place and the bank handed to the next best want — which is what keeps the
driver's rule that a refusal is a bug. The contribution arm already asked
`contributeError` and `bankOf` live.

**Measured** (t75, duel, seeds 5/777/20260904, two balanced seats, one machine):
**9.29s → 4.30s** for the three games, and seed 5 alone **3.71s → 1.54s**. The
hoist by itself (nothing else of batch 6) read 4.06s.

**Outcomes moved, and the reason is the semantics rather than a bug.** Decisions
inside a turn used to see intra-turn book updates — a purchase re-priced the next
decision's whole book — and now they do not: a turn is one sitting. Hoist-only
against batch 5: towns 14 → 14, buildings 46 → 45, technologies 75 → 75,
treasuries 614 → 687, bankrupt seat-turns 0 → 0. Not byte-identical, and not
claimed to be.

### Part 2 — the negative-chain floor

`liveChains` drops a **held-tech** chain whose worth is ≤ 0. The research goal
keeps its honest negative (the margin multiplies, so holding makes it worse and
the beeline is displaced — batch 3's behaviour, unchanged). The difference is
what the two families *are*: a plan is a commitment and a held-tech chain is the
standing observation *"this empire holds Letters and two of its towns lack
libraries"*. Advice worth less than nothing is advice to withhold, and left in it
would make a library appraise **worse** in an empire that holds the technology
than in one that never researched it. No figure on the acceptance seeds moved:
no held-tech chain went negative on those boards, and the floor is pinned on an
arranged one at three sizes of town.

### Part 3 — the draft plan

**Culture is the third priced currency.** `draftPlan` (`wants.ts`) is a book of
one row — the next draft — because a draft is the only thing culture buys:

```
worth = E[best of the dealt hand]  −  the worst slotted card (when every slot is full)
        × delayDiscount((cost − pool) ÷ culture a turn)
price = nextDraftCost(player)
```

and `shadowPrices` bands it exactly as it bands gold and faith
(`prior = weights.culture[age]`). `voiceWeight` answers it, so every fold in the
bot prices a point of culture at the empire's own number.

**The estimator** (`expectedBestOrder`, deterministic arithmetic, no roll):

```
F(t)      = Π over the draws of P(that draw ≤ t)
E[best]   = Σ over the pool's distinct scores of  v × (F(v) − F(v⁻))
```

The draws are `drawOrderOptions`' own: **one weighted draw from each of the three
slot-type sub-bags** (exact — the sub-bags partition the pool, so the three are
independent), then the fill. Weights are `orderDrawWeight`, which carries the
rarity table plus `skipPity` per banked pass. **The one stated approximation** is
the fill: the simulation draws it without replacement from what the guarantee
left, and this treats it as independent draws from the whole pool — slightly
generous to a wide hand, against an inclusion–exclusion with two-to-the-pool-size
terms to price one want.

**The pass is priced, and the bot takes it.** `orderDecision` carries a `pass the
hand` candidate worth `E[best of the next hand at pity + 1] × delayDiscount(the
next draft's whole cost ÷ the culture rate)`, and `skipOrderOffer` goes out when
it beats every card on the table. Measured on the standard duel: **three of the
eight drafts inside sixty turns are passed** — the first passes this bot has ever
taken, and the comment above `orderDecision` that said it never would is gone.

**Honest gaps, unchanged and written down**: a conditional card (a war card at
peace) prices as it always has, with no option value; an unread grant is
`score.unknownEffect`; the replacement charge is the *worst* slotted card whether
or not the new one fits its office; and the pool a pass reads still holds the
cards on the table, because a skipped hand's cards go back in the bag.

### Part 4 — the chain-derivative production price

**`hammerPrice(ctx, city?)`** (`value.ts`, beside `meterWeight`) — batch 4's one
written-down non-delivery, closed:

```
marginal = Σ over the building steps this town still owes a live chain of
             (chain.worth ÷ chain.stepsRemaining)
             × ( discount(turns at rate+1) − discount(turns at rate) )
price    = clamp(marginal, weights.production × priceBandLow,
                           weights.production × priceBandHigh)
```

Closed form on numbers the chain already carries. `city` says which steps are
owed (a row the town holds is a step it owes nothing on); **the turns are always
the middling town's**, both because every build delay in this bot has been the
median's since batch 2 and because `cityYields` walks the empire for the two
meters and this is asked of every building row of every town.

**`hammerTerm` folds the difference from the table, not the price.** Every
candidate already pays `weights.production` for its production delta through
`explainYields`, so a term carrying the whole price pays for a hammer twice — and
it did, measurably: at the ceiling a hammer read sixteen points against a
bushel's seven, every town leaned on the hills for ever, and the acceptance seeds
lost fifteen technologies to it. The term is `price − weights.production` — a
credit when the engines are waiting, a **charge** when nothing is.

The register of what folds it: the build arm's building rows (with the town), a
hex's improvement (`improvementEntry`, `plan.ts`), a card that pays production
(`explainEffects` via `productionOf`), and the focus arm. Nothing that *spends*
hammers folds it.

**The focus arm** (`focusCommand`, a new `focus` decision kind) is the bot's
first `setCitizenFocus`. It prices the town's people placed by the balanced sheet
against the same people placed by the production sheet, both computed from the
simulation's own scorer over `assignableTiles`, and folds three terms: what the
hexes pay, the hammer premium, and **what the growth it gives up is worth** — the
next citizen's ground at the discount on the turns the two sheets take to grow.
That third term is not a nicety: without it the arm fires on the flat weights
alone and costs fifteen technologies. The starvation guard `assignCitizens` would
apply is anticipated and printed as a refusal rather than discovered.

**Two bugs found by measurement and written down as the reason for the code:**

- **the comparison must not read the town's current placement.** A table that
  used the live sheet as its baseline answered "production" while the town was
  balanced and "default" the moment it was not: **3,622 focus commands** in a
  75-turn duel, and twenty-five times the wall clock of the rest of the bot.
- **`explainCitizen` reads the live placement too** (`nextWorkableTile` skips
  worked hexes), so the growth charge inherited the same flip. The next citizen's
  worth is read off the **balanced** ordering's next hex instead. After both:
  **108 commands**, and the arm fires at most once per town per turn.

### Measured — the acceptance table

t75, duel, seeds 5/777/20260904, two balanced seats (six seats in all):

| | batch 5 | batch 6 |
|---|---|---|
| towns | 14 | **13** |
| buildings standing | 46 | **58** |
| technologies | 75 | **69** |
| treasuries | 614 | **775** |
| culture per turn | 50 | **53** |
| bankrupt seat-turns | 0 | **0** |
| wall clock, three games | 9.29s | **4.30s** |

**Attributed by measurement** (the same three seeds, each part switched off in
turn against the finished build):

| | towns | buildings | techs | gold | culture/turn |
|---|---|---|---|---|---|
| batch 6, everything on | 13 | 58 | 69 | 775 | 53 |
| the focus arm off | 14 | 53 | 75 | 560 | 59 |
| the hammer price off (which silences the focus arm) | 12 | 44 | 73 | 566 | 54 |
| culture's price off | 15 | 53 | 68 | 495 | 44 |
| all three off (the hoist and the floor alone) | 14 | 45 | 76 | 637 | 47 |

**Culture moves for the first time**, 50 → 53 on the rate and 47 → 53 against the
same build with its price switched off — the draft plan is the whole of it, and
the pass is the visible half.

**Buildings are the headline**, 46 → 58 (+26%), and the hammer price is the whole
of it: with it off the same build reads 44.

**The one number down is technologies, 75 → 69**, and it is the focus arm alone
(with the arm off the same build reads 75). It is the trade the arm exists to
make — a town on the hills grows slower, and a slower town makes fewer beakers —
and the growth term above is what keeps it to six technologies instead of
fifteen. Whether the trade is worth six is a tuning question with a knob already
in place: `priorities.priceBandHigh` bounds what an engine may say a hammer is
worth, and it is the second thing for the arena to sweep after
`weights.happiness`.

**Knobs**: none added, none deleted. The hammer price is banded by the
`priorities` block that already existed and anchored on `weights.production`;
culture's price is anchored on `weights.culture`. The arena panel needed no edit.

**Known gaps, written down rather than fixed.**

- **A pass does not know what it passed.** The pool the skip candidate reads is
  the live one, cards on the table included — which is right (a skipped hand goes
  back in the bag) but means the estimate does not condition on the three faces
  the seat has just seen and rejected.
- **The replacement charge does not check the office.** The worst slotted card is
  charged whether or not the new card could take its chair.
- **The hammer price's turns are the empire's, not the town's**, by the stated
  affordability bargain — a hammer-rich capital and a hamlet price the same
  compression.
- **The focus arm knows nothing about pins.** Nothing in this bot sends
  `setLockedTiles`, so a bot seat's towns have none to honour; a human's town the
  arm never touches (`citizenFocusError` refuses a puppet, and the arm is only
  ever asked for a seat the driver plays).
- **Only two focuses are weighed** — the balanced ordering and production. The
  food and gold sheets are not, because nothing in the bot yet has a reason to
  ask for them that the ordinary arms do not already answer.

## Batch 7 — ratified 2026-09-05 (the prune and the grid search)

1. **Prune** (the user's ask, per-knob verdicts above the batch in chat,
   recorded here): RETIRE `expansion.settlerCap`, `trade.traderCap`,
   `solvency.stopMaintainedBelow`, `score.maxTurns` (merged into
   `priorities.horizonTurns` — one H), `score.nominalYield` (merged into
   `score.unknownEffect`), and `score.cityCap` behind an acceptance check
   (three readers; retire only if the t75 table holds). KEEP with reasons:
   the workers block (plan shape + prices, not gates), the rest of
   solvency (gold's prior, the disband floor, the grace, the wage want),
   the scout family (the recorded patch), the war baselines (the next
   conversion). Persona fallout carried through surviving numbers.
2. **Per-seat tuning**: the arena seam grows per-player sheets
   (deterministic, never serialised) so a candidate can play the default.
3. **The grid-search harness**: mirror matches — candidate vs default,
   seats swapped per seed — scored in the game's own currency (beads ×
   weights.bead + techs × weights.tech + the weighted t150 standing),
   OFAT over the ruled dials (newLuxuryBonus, per-voice weight scalars,
   threat.militaryBonus/garrisonValue, mixBonus, weights.city/happiness,
   horizonTurns, priceBandHigh), 3 values × 3 seeds × 2 mirrors, JSON +
   printed table, runnable via vite-node, deterministic throughout.
4. **First pass run and reported** — the table lands in this doc.

## Batch 7 as shipped (the prune, the per-seat sheet, the grid search, 2026-09-05)

### Part 1 — the prune

Six knobs out, and the shape of every verdict is the same one the programme has
been making since batch 1: **a threshold that stands in front of arithmetic that
already says the same thing is a policy wearing a constant.** What changed by
batch 7 is that the arithmetic exists.

| Retired | What carries it now |
|---|---|
| `expansion.settlerCap` (5) | `cityValueFalloff` decays what the next town is worth, and **a realised step drops out by construction** — a settler already walking owes no hammers, so the expansion chain has no step left and its share is nought. The cap only ever fired after the arithmetic had already said no. |
| `trade.traderCap` (4) | A caravan is `weights.trader × goldPressure` and costs upkeep at **gold's shadow price**, so the empire a caravan would mend is the empire that wants one. The whole `trade` block went with it — it held nothing else. The one refusal left is a *rule*: a lone town has nowhere to send a route. |
| `solvency.stopMaintainedBelow` (1) | `explainUpkeepCost` at gold's shadow price, which is the pressure and the book together, on **every** candidate and **every** want. Its only reader (`maintenanceAffordable`), the build table's filter, the two `WantInputs.maintained` skips in the purchasing and faith plans, and `BuildCandidate.essential` (dead the moment the filter went) are all gone with it. |
| `score.maxTurns` (40) | **`priorities.horizonTurns`** (40). Both were forty and both meant *how far ahead this bot looks* — one said as a town's patience, the other as an empire's — so `push`' build-effort cap reads H and there is one horizon. Verified equal before the merge; the printed clause now says "capped at the 40-turn horizon". |
| `score.nominalYield` (6) | **`score.unknownEffect × score.nominalCount`** (2 × 3 = 6), through one new door, `nominalRate` in `value.ts`. The two knobs were never independent: the `offerRider` arm was *already* pricing an unread rider at exactly that product, which is the same six said as *one thing this bot cannot read, three helpings of it*. The merge therefore moved **no number at all** — what it moved is the count of stand-ins a tuner has to keep in step, from two to one. |
| `score.cityCap` (6) | Nothing — the clamp is simply gone from its three readers (`ctx.cities`, `threatLevel`, `townsWanting`). See the acceptance below. |

**`score.cityCap`'s verdict: retired, and the acceptance is why.** The clamp said
*an "in every town" reading stops at six towns*, and it was doing three unrelated
jobs at once: capping how many towns a card scales over, capping how many
**threats** a seat may count (a city cap standing in front of an enemy count), and
capping how many towns a chain's building step is owed by — where it was
shortening the numerator and the denominator by different amounts, since
`stepsRemaining` divides the worth by exactly the number the cap had clipped.

t75, duel, seeds 5/777/20260904, two balanced seats (six seats in all):

| | batch 6 | the prune, cityCap kept | + cityCap retired |
|---|---|---|---|
| towns | 13 | 12 | **14** |
| buildings standing | 58 | 55 | **54** |
| technologies | 69 | 71 | **74** |
| treasuries | 775 | 728 | **667** |
| bankrupt seat-turns | 0 | 0 | **0** |

Towns +8%, technologies +7%, buildings −7%, no new bankruptcies: the table holds
and the removal stands. The one figure outside a tenth is the **treasury, −14%**,
and it is the movement this programme has been asking for since batch 1 — a hoard
is not a score, and an empire that ends with fourteen towns and seventy-four
technologies on six hundred coins has spent what an empire with thirteen towns and
sixty-nine technologies was sitting on. Nothing went bankrupt in any seat-turn of
any game.

**Persona fallout, carried through surviving numbers.** `settlerCap` was the last
knob three personas still spelled their expansion with — wide 9, tall 2, warmonger
6 — and every one of them already carries the same intent as a *preference*:

- **wide** — `cityValueFalloff 1.0` and `weights.city 150`: it never tires of the
  next town, which is what a cap of nine was trying to say and could not.
- **tall** — `cityValueFalloff 0.6`, `weights.city 80` and `weights.happiness 16`:
  the fourth town is worth a fifth of the first to it and it minds the crowding
  more, which is a curve where the cap was a step.
- **warmonger** — `weights.city 125` at the balanced falloff. Its `expansion`
  block is now **empty and deleted**: it takes towns, it does not court them, and
  a *raised* cap of six was never that sentence.

The absence grep in `test/sim/aiWants.test.ts` is extended with all six names plus
`maintenanceAffordable`, word-bounded and comment-stripped, so a retired knob that
survived as a reader would fail core.

### Part 2 — the per-seat tuning sheet

`setAiTuning(sheet, { playerId })`. The page-level dial (batch 3's arena seam) is
folded under every persona and applies to every seat, which is exactly what the
arena wants and exactly what a grid search cannot use: *is this sheet better than
the file?* needs one seat playing the candidate and another playing the default at
the same table. So a sheet may name a seat, and the fold order is **the file, what
the page is trying, what this seat is trying, what this seat's persona says**.

This is not the swap the module's own docblock forbids. The forbidden shape is one
variable that *changes* between two seats' readings inside a turn; this is a table
keyed by seat, installed before a run and constant through it, so a seat's answer
is a function of the seat and of nothing else. It is a persona nobody had to name
in the roster, and it inherits every property the global sheet has: deterministic,
never serialised, never in a save.

- `aiConfigFor(persona?, playerId?)` reads the seat's base first; the memo key is
  `seat|persona`, with the seat half **empty** for every seat with no sheet — so
  an untuned game has exactly the keys it had before the map existed.
- `aiFor(player)` passes `player.id`; so do `driveSeat`, the stepper's two
  readings, and `aiConfigForPuppet`.
- `aiTuning({playerId})`, `withAiTuning(sheet, run, {playerId})` and
  `clearSeatTuning()` (every seat sheet off between two games) round it out.
- Pinned (`test/sim/aiPersona.test.ts`): two seats read different configs; a seat
  nobody named reads `AI` **by identity**; a seat sheet folds *over* the page's
  and *under* the persona; a driven turn on a tuned table refuses nothing; and one
  board read twice gives one book.

### Part 3 — the harness

`scripts/gridSearch.ts`, run with `npx vite-node scripts/gridSearch.ts`
(`--turns`, `--seeds`, `--dial`, `--jobs`, `--out`). Three rules:

- **Mirror matches.** A candidate sheet plays seat 0 against the file on seat 1,
  then the same seed again with the seats swapped. A map that hands seat 0 three
  rivers hands the *default* three rivers in the mirror, and the advantage is what
  survives the pair.
- **The judge never wears a candidate's glasses.** Both seats are folded at the
  **file's** weight table (`scripts/gridObjective.ts`, a module of its own so a
  test can import it without starting a search). A candidate that trebles
  `weights.science` and is then marked at treble the science weight has won
  nothing but the scoring — the one way a self-play objective goes circular.
  Pinned in `test/sim/gridObjective.test.ts`.
- **Deterministic under parallelism.** One task is one game; games fan out over
  `os.availableParallelism() − 2` child processes (each of them this same script
  under `--worker`, fed one task at a time down its stdin), and every result is
  merged back **by its own key** — dial · value · seed · side — and summed in the
  plan's order rather than the completion order, because floating-point addition
  is not associative. A run on three workers and a run on eight write byte-identical
  JSON (checked).

The objective is `beads × weights.bead + techs × weights.tech + Σ voice rates ×
weights[voice][age]` at the final turn, off the books the arena's meters read.
Deliberately not a win rate: a hundred and fifty turns is not a game, and a duel
nobody wins would score every configuration nil.

**A value that reproduces the file is reported rather than played.** Both seats
would then hold the same opinions, the two mirrored games are one game, the two
differences are exact negations and the mean is nought by construction — which is
also a third of the pass not run. The all-default **baseline** is played once per
seed instead, as the reference an advantage is read against.

Results are written to `gridsearch-results.json` (git-ignored: a run's numbers are
a reading, not a source — the table that matters is the one below).

**The board is the duel, and the reason is measured.** The brief asked for the
standard map (80×52). The first pass was started there and abandoned: **54 of its
159 games took three hours and sixteen minutes** on eight workers, and the rate
was falling as the empires grew — call it nine or ten CPU-hours for one sweep,
which is not a tool anybody runs between two changes. The duel board (40×25) is a
quarter of the tiles, is what every acceptance table above was measured on, and —
with two seats — is the board where the seats actually meet. `--size standard` is
still there for anybody who wants to pay for it. **Six workers, not eight**: at
eight the machine (16 GB, with a browser and an editor open) went to swap and a
game that costs nineteen seconds of CPU took thirty-eight minutes of wall clock.
The pool is bounded by memory here, not by cores.

### Part 4 — the first OFAT pass

t150, duel, seeds 5/777/20260904, two balanced seats, barbarians on; 26 played
configurations × 3 seeds × 2 mirrors = **156 games in 24 minutes 26 seconds**
(73 CPU-minutes over six workers). The 13 configurations that reproduce the file
are nought by construction and are not listed. **Baseline fold, per seat: 2584.**

| dial | value | advantage | techs | food | prod | gold | sci | cult | faith |
|---|---|---|---|---|---|---|---|---|---|
| `weights.production×` | ×1.4 | **+1561** | +1.3 | +44 | +223 | +214 | +326 | +23 | +3 |
| `site.newLuxuryBonus` | 7 | **+1341** | +2.3 | +137 | +67 | +142 | +166 | +37 | +11 |
| `weights.culture×` | ×0.7 | **+1289** | +2.8 | +36 | +31 | +85 | +137 | +29 | +15 |
| `weights.culture×` | ×1.4 | **+625** | +1.7 | +116 | +51 | −14 | +108 | +38 | +11 |
| `weights.food×` | ×1.4 | **+527** | +0.0 | +49 | +63 | +54 | +58 | +92 | +3 |
| `threat.militaryBonus` | 30 | **+406** | +3.3 | +30 | +17 | +22 | +48 | +8 | +26 |
| `priorities.horizonTurns` | 60 | **+380** | −0.5 | +39 | +56 | +6 | +82 | +33 | +4 |
| `weights.science×` | ×0.7 | **+274** | +0.0 | +38 | +30 | −8 | −6 | +7 | +5 |
| `threat.garrisonValue` | 70 | **+261** | +1.2 | −30 | +11 | −20 | +102 | +16 | −1 |
| `weights.city` | 80 | **+238** | +0.7 | −33 | −34 | +63 | −35 | +10 | +8 |
| `weights.gold×` | ×0.7 | **+175** | −0.8 | +28 | +59 | +18 | +8 | +29 | +3 |
| `weights.science×` | ×1.4 | **+72** | −0.8 | +9 | +5 | +23 | −100 | −18 | −1 |
| `priorities.priceBandHigh` | 2 | **+16** | −0.8 | +32 | +25 | −31 | +27 | +21 | −5 |
| `threat.garrisonValue` | 210 | **−8** | +0.0 | +4 | −2 | +1 | −10 | +3 | −3 |
| `weights.happiness` | 8 | **−18** | +0.0 | +3 | −32 | −22 | −89 | −10 | +7 |
| `weights.happiness` | 18 | **−76** | +0.0 | −50 | −28 | −23 | −33 | −21 | −4 |
| `military.mixBonus` | 70 | **−256** | +0.5 | −41 | +11 | −3 | −8 | +30 | −2 |
| `priorities.priceBandHigh` | 5 | **−323** | −0.3 | −105 | −47 | +40 | −47 | −8 | −26 |
| `priorities.horizonTurns` | 30 | **−405** | −1.2 | −96 | +23 | +30 | +34 | −38 | −9 |
| `military.mixBonus` | 20 | **−505** | +0.7 | −87 | −38 | −33 | −79 | −24 | −3 |
| `weights.production×` | ×0.7 | **−603** | −2.8 | −44 | −53 | −100 | −133 | −47 | −20 |
| `threat.militaryBonus` | 90 | **−606** | +0.2 | −39 | −37 | −84 | +13 | −43 | −2 |
| `weights.city` | 150 | **−708** | −0.3 | −31 | −65 | −39 | −25 | +0 | −1 |
| `site.newLuxuryBonus` | 28 | **−900** | −3.0 | −43 | −29 | −14 | −95 | +3 | −14 |
| `weights.gold×` | ×1.4 | **−926** | −4.0 | −103 | −95 | −98 | −258 | −87 | −21 |
| `weights.food×` | ×0.7 | **−2718** | −8.7 | −219 | −149 | −76 | −547 | −179 | −52 |

**The reading, and the first thing in it is the noise floor.** Three dials come
out **positive at both ends** — `weights.culture×` (+1289 and +625),
`weights.science×` (+274 and +72) and, at a stretch, `threat.garrisonValue`. A dial
that improves an empire whichever way it is turned is a dial six games could not
resolve, and those three are the table measuring its own error bar: it is of the
order of **±600 on a baseline of 2584**, a quarter of the standing. Nothing under
that number is a finding. What follows is only the dials whose two ends are
**ordered**, which is the cheapest significance test a mirror pass affords.

1. **Food is the strongest lever on the board, and it is under-weighted rather
   than over.** `×0.7` is −2718 — five times any other movement in the table — and
   it costs nearly nine technologies and 547 points of science a seat. `×1.4` is
   +527. A seat that stops valuing bushels stops growing, and an empire that stops
   growing stops doing everything else; the current row (7→4 across the ages) is
   nearer the floor of what works than the ceiling.
2. **Production is under-weighted** (`×1.4` +1561, `×0.7` −603) and **gold is
   over-weighted** (`×0.7` +175, `×1.4` −926). Read together with the caution
   below, this is most likely *one* finding said twice: raise hammers relative to
   coin. Batch 6 gave hammers a shadow price and the table says the anchor under
   it is still too low.
3. **`site.newLuxuryBonus` at 14 is too generous** (7 → +1341, 28 → −900, and the
   28 seat loses three technologies). The first silk is worth something; it is not
   worth what the sheet currently says, and the site scorer is the one weight table
   the programme never unified (see batch 4's known gaps).
4. **`threat.militaryBonus` at 60 is too high** (30 → +406, 90 → −606). The seat
   that answers a sighted raider with fewer soldiers is the seat with more towns.
5. **`weights.city` at 110 is a touch high** (80 → +238, 150 → −708) — which is a
   pointed result, because `wide` plays at 150. It is worth reading beside the
   surplus charge and the expansion chain: since batch 4 a town is dear in writ,
   contentment and hammers, and the flat weight on top of that may be double-paying.
6. **`priorities.horizonTurns` wants raising, not lowering** (60 → +380, 30 → −405).
   The merge with `score.maxTurns` this batch made H a single dial; the table says
   the single dial should probably be longer than forty.
7. **Two dials the table endorses as already right.** `military.mixBonus` is
   negative at *both* ends (20 → −505, 70 → −256), which is what a local optimum
   looks like; and `weights.happiness` is negative at both ends but only just
   (−18 and −76, both inside the floor), so batch 4's suspicion that the happiness
   prior was the ten-technology regression is **not confirmed**. `priceBandHigh` 5
   is worse (−323) and 2 is level with 3 (+16), which does confirm batch 6's worry
   from the other side: a high ceiling on a shadow price costs more than it buys.

**Degeneracy check.** The per-voice columns are printed so a winner that wins one
voice by starving five is visible. Only one row is that shape:
`weights.science× ×1.4` reads +72 overall while its *science* rate falls 100 — and
it sits inside the noise floor anyway. Every finding above wins broadly.

**The stated caution about OFAT on a weight vector.** The six voice weights are
only meaningful against each other: scaling one band up is scaling the other five
down. So finding 2's two halves are not independent evidence, and a second pass
should either normalise the vector (hold the sum fixed) or sweep the pairs jointly.
That is the next measurement, not this one.

**Nothing was retuned on this pass.** A sweep advises; the sheet is the user's.

## Batch 8 — ratified 2026-09-05 (the connection pass)

The user's rulings on the gap review, verbatim intent:

1. **Trader pricing** — a caravan's build worth = the best unserved route's
   pay (the pair enumeration exists; bounded), replacing the flat
   `weights.trader` guess. AND the harder half: a building that opens
   route CAPACITY (find the sim's own capacity rule — whichever rows grant
   routes) folds "opens a route worth X" into its appraisal while routes
   are capacity-bound — the market is priced partly as the route it
   unlocks.
2. **Great-person picks scored** — the same pricing strategy as every
   other system: an offer's names appraised by act lump + work sites +
   the legacy's card effects through the existing readers; first-legal
   retires.
3. **Camps — DEFERRED** (the user: "a smaller concern").
4. **Re-slotting** — evaluated at the START of each turn, greedy: the
   best arrangement of owned cards across unsealed slots by the same
   scoring the draft slotting uses; idempotent (no command when the
   standing arrangement is already best); seals respected — a sealed
   chair is not a choice.
5. **Tile buying** — a gold want-row reusing the SITE strategy's reading
   on single hexes (yields at the town's prices + the resource bonuses).
   THE UNIQUENESS RULING, which also re-aims the site scorer if it reads
   otherwise: **a unique luxury is one with no copy inside the empire's
   OWNED LAND, improved or not** — the value expresses POTENTIAL (it
   still needs investment to work), never current access. Strategics
   likewise. `site.newLuxuryBonus`/`newStrategicBonus` price both the
   site scorer and the tile want through one reading.

## Batch 8 as shipped (the connection pass, 2026-09-05)

**A tenth module and an eleventh file.** `src/ai/routes.ts` — what a trade route
is worth to this empire and what a route *slot* would open — a leaf above
`value.ts` and below `chain.ts`, `wants.ts` and `bot.ts`. `value.ts` takes one
**type-only** import back (`RouteOutlook`), the shape `statecraft.ts` and
`religionData.ts` keep for the same reason: the reading lives in `routes.ts` and
the *term* it becomes lives beside `hammerTerm`, so nothing imports a cycle.

### Part 1 — the caravan is worth the route it would run

`weights.trader` (70, flat, times the gold pressure) is **deleted**, and with it
the last flat guess in the piece table. A caravan is worth `explainCaravan(ctx)`:
the pay of **the best route no caravan of this empire is running**, through
`routeYields.ts`' own fold, plus the road that route would wear. Three readers,
one number — the build arm (`push`), the contribution arm's front row
(`frontRowWorth`) and a tech chain's unit step (`chain.ts`).

**The gate is the simulation's trader-independent half.** `routeStartable` is
documented as *"the gate minus the piece"*: yours at one end, at peace and met at
the other, a free slot, no live route already running that way, a path in the
mode asked for, and the range. Those are exactly the clauses a caravan that does
not exist yet can honestly be held to, so nothing in `routes.ts` re-implements
one. What `startRouteError` adds — the piece exists, is yours, is a trader, is
idle — is about a wagon, and there is no wagon.

**The capacity hypothesis is a board, not a clause.** The one clause that is
about the empire rather than the pair is the free slot, and while it bites every
pair answers the same empire-level refusal — so the gate can say nothing at all
about *what a slot would open*. Rather than ask four of the five clauses by hand,
`withSpareSlot` asks the whole gate **on a shallow clone of the state whose first
town carries one extra route-slot row**. That is the hypothetical the term is
about, said as a board, and it is the shape the purchasing plan already uses when
it prices a building by the `cityYields` an unbuilt row would produce.

**The pay is cheap and the gate is dear**, so the sweep prices *every* ordered
pair (two folds of `routeYields.ts`, no path) and asks the gate **in pay order**,
richest first, until a pair passes or `search.routeGateProbes` (**24**, the one
knob this batch adds, beside `pathProbes` because it is the same kind of number)
asks have been paid for. The answer is the exact best legal pair whenever one of
the richest few is legal, and a bound on compute otherwise.

**Three refusals, all derived, none of them a cap**: a lone town has nowhere to
send a route; an empire whose every slot is running has no room for another
wagon; and a wagon already standing **idle** will take the next slot before a new
one does (`RouteOutlook.free = slots − used − idle`, which is batch 4's *a
realised step drops out by construction* said about traders).

**The road is the half `routeYields.ts` does not answer.** A caravan paves every
hex it rests on, so a land leg to a town the capital's roads do not yet reach
very likely **joins** it — and a joined town pays `floor(pop ÷ connectionPerPop)`
gold a turn for ever through `explainEmpireGold`'s connections line. That is a
standing income the flat 70 was partly standing in for, and without it the honest
price stopped the bot building caravans at all: measured at t130 on the
acceptance seeds, **1 caravan and 1 route with the pay alone, 3 and 7 with the
road**, against 18 and 24 for the flat weight. Two stated crudenesses, both
conservative: only the destination is credited, and the join is assumed rather
than pathfound.

**The market is priced as the route it unlocks** (`routeSlotTerm`, `value.ts`,
folded by `explainBuildingRow` so the queue, the purchasing plan and a chain's
step all carry it). It is worth something only while it is worth something: the
empire must be capacity-bound *and* an unserved pair must exist. The wagon is
charged in **turns** rather than in hammers — `delayTerm` on the caravan's own
build, nought when one is already idle — because charging its hammers here as
well would be the bot paying twice for a piece its build arm prices.

### Part 2 — the name a hand calls, appraised

`greatPersonDecision` took the first legal name. It now appraises each legal one
through readers that already existed, and the redraw is untouched (an all-spent
hand still sends index 0 to trigger the reducer's one mutating refusal):

- **the boon** — `explainActFor`, the piece's own act appraisal, refactored to
  take a *family and a hex* rather than a piece, asked of the capital the called
  person would arrive in (`settleGreatPersonChoice` puts it there);
- **the ground** — `rankWorkSites`' top row for the family's work, walked from
  that same capital through a `personProbe` (`caravanProbe`'s bargain: the
  question is about a place and the piece does not exist yet);
- **the legacy** — `explainEffects` over the row's own `legacy`, the reader every
  card class goes through.

**The act and the work are alternatives, not a sum**: a person is spent once, so
the fold carries whichever is worth more and prints the other as a zero-valued
label with its number in the label. Pinned by the test that first-legal cannot
pass — the same hand dealt in both orders calls the same name.

### Part 3 — the arrangement, improved once a turn

`slottingDecision` fills an **empty** chair, so a card that arrived after the
chairs were full stayed on the bench for the rest of the game however good it
was. `reslotDecision` (housekeeping, **last**, after the empty chairs are filled)
is the other move: the single best **swap** — a held card off the bench for a
card in an unsealed chair it strictly outscores — emitted as `unslotOrder`, with
`slottingDecision` seating the replacement the same turn.

- **the same scorer as the drafts**, extracted as `slotPairTerms` (the card's
  worth ÷ the office's scarcity) and read by both arms, which is what makes the
  second half of the move predictable rather than hopeful;
- **strictly better** (`>`), never equal — plain greedy, no margin, per the
  ruling — so two cards of one worth cannot trade chairs for ever;
- **one move a turn, derived**: a slot whose seal has *exactly* its full length
  left is a slot something has just filled, so while one exists the arm stands
  down (`sealedThisTurn`). No stored state, principle 3. (Exactly, not at least:
  a longer seal is a slot nobody touched this turn, and reading `>=` stood the
  arm down for ever on a board that had one.)
- **the seal is the gate's** — `unslotOrderError` refuses a sealed chair. The one
  clause asked here rather than of a gate is whether the bench card *fits* the
  office, with the simulation's own `orderFitsSlot`, because `slotOrderError`
  cannot be asked of an occupied chair: it refuses on the occupant before it ever
  looks at the fit.

### Part 4 — the ground at the frontier, and the uniqueness ruling

**Tile buying is a want.** `tileWants` (`wants.ts`) walks `purchasableTiles` —
the simulation's one enumeration of what a town may buy, priced by its own ladder
and carrying the reason it cannot be had when it cannot — and carries every offer
with no reason at all. A puppet's whole ring is refused by `tilePurchaseError`
before this arm asks. `Want.ground` is the tile row's `buy` (a second field, not
a union: a tile is a different verb held to a different gate), and `bankSpend`
fires `purchaseTile` through `tileDecision`.

What a hex is worth is two different kinds of thing:

- **the ground it would work** — the delta over the **poorest hex the town works
  today**, through the simulation's own citizen scorer (`yieldScore`), because a
  citizen only moves to bought ground that beats what it is standing on. A hex
  nobody would move to pays nothing today and says so;
- **the seam it owns** — `site.newLuxuryBonus` / `newStrategicBonus`, through the
  site scorer's own door.

**And a coin buys *sooner* or *more*, never both.** The hex this town's culture
is about to claim anyway (`bestExpansionTile`, the simulation's own chooser) is
charged the share of the horizon those turns are; any other hex leaves the town
permanently one hex ahead of where its borders would have put it and is charged
nothing. Without that clause the tile rows sat at the top of the gold book and
cost nine buildings on the acceptance seeds; with it they are a real but ordinary
row.

**The uniqueness ruling, and what the site scorer read before.** It read
`controlledResources` — **access**: the reveal technology, plus an improvement on
the seam or a city standing on it. So an empire that owned four silk hexes and
had built no plantation was told, by every site it looked at and for as long as
it had no plantation, that silk was *new*. The ruling is the other reading, and
it is now the only one: `realmResources(state, playerId)` — **every resource kind
standing on this empire's own ground, improved or not, worked or not, revealed or
not**. `ValueContext.realm` hoists it (one map sweep), `newResourceTerms` is the
one door onto it, and a source test pins that the two bonus knobs are named in
exactly two files: `aiConfig.ts`, which declares them, and `value.ts`, which
reads them. Lent seams are deliberately out: a loan is not ground.

### Measured — the acceptance table

t75, duel, seeds 5/777/20260904, two balanced seats (six seats in all). "Before"
is HEAD with this batch's five sheet values already retuned, so the two columns
differ by code alone:

| | before | batch 8 |
|---|---|---|
| towns | 19 | **13** |
| buildings standing | 64 | **55** |
| technologies | 65 | **67** |
| treasuries | 755 | **576** |
| culture pooled | 297 | **267** |
| bankrupt seat-turns | 0 | **0** |
| tiles bought | 0 | **1** |
| re-slottings | 0 | **14** |
| routes started · caravans built | 0 · 1 | **0 · 0** |

Over the wider sweep (seeds 1/2/3/42/101/999/31337/20260101, sixteen seats):
towns 36 → **33**, buildings 132 → **122**, technologies 173 → **176**,
treasuries 1531 → **1688**, culture 667 → **705**, bankruptcies 0 → 0, tiles
bought 0 → **2**.

**Attributed by measurement** (the acceptance seeds, each part switched off in
turn against the finished build):

| | towns | buildings | techs | gold |
|---|---|---|---|---|
| batch 8, everything on | 13 | 55 | 67 | 576 |
| the trader's own price off (flat 70 restored) | 13 | 54 | 67 | 587 |
| the market's route term off | 13 | 55 | 67 | 624 |
| the great-person scoring off | 13 | 55 | 67 | 576 |
| tile buying off | 14 | 59 | 66 | 571 |
| re-slotting off | 15 | 61 | 69 | 509 |
| the uniqueness re-aim off (access restored) | 16 | 57 | 65 | 635 |
| everything off | 19 | 64 | 65 | 755 |

**Trade is not reached inside the acceptance window, and that is the first
finding.** Six seats hold **two markets and no caravans** at t75, so the caravan
price, the market's route term and the great-person table move nothing at all
there — the three of them together are worth one building and eleven coins. The
window that exercises them is t130, where the same three seeds hold twelve to
sixteen markets:

| t130, seeds 5/777/20260904 | before | batch 8 |
|---|---|---|
| routes started | 24 | 7 |
| caravans built | 18 | 3 |
| towns · buildings | 27 · 202 | 17 · 142 |

So the honest price buys a third of the wagons the flat 70 bought, and it is
right to: the flat weight said a caravan was worth seventy whatever it would
carry, and the simulation says the best unserved route on these boards pays about
twenty-eight a turn plus the road. Whether **that** is the whole of what a route
is worth is the batch's largest open question — see the gaps below.

**The two numbers down are towns and buildings, and the attribution is honest
about which rulings cost them.** Of the six towns, three are the uniqueness
re-aim, two are re-slotting and one is tile buying; the trade half costs nothing
on these boards. Two of those are rulings this batch was asked to implement
rather than judgements it made, and the third is the arm the ruling asked for. No
new bankruptcies anywhere, and technologies and the wide sweep's treasury both
moved **up**.

**The uniqueness re-aim wants `site.newLuxuryBonus` re-swept, and that is the
recommendation this batch ends on.** The dial's *meaning* changed under it: at 14
(and then at the grid search's 7) it was paid on almost every site an early
empire looked at, because an early empire has access to nothing; it is now paid
only where the empire owns no copy at all, which is a far rarer event and a far
truer one. Batch 7's OFAT found 7 better than 14 **under the access reading**;
that finding does not carry over, and the first sweep to run is that dial again.

### Knobs

Added: `search.routeGateProbes` (24) — a bound on compute, the audit's one honest
kind of cap. Deleted: `weights.trader` (70), the last flat guess in the piece
table. The arena panel needed no edit; it walks the sheet.

### Known gaps, written down rather than fixed

- **Camps are deferred by ruling** ("a smaller concern") and nothing here touches
  them.
- **A route's worth may still be under-read.** What `routeYields.ts` pays plus
  the connection the road buys is not the whole of a route: the road itself
  shortens every march that ever uses it, a trading post extends the range of
  every later route, and the destination's own growth is not modelled. The
  measurement says the flat 70 bought more towns and more buildings than the
  honest price does, which is evidence for exactly this and not for the flat
  number.
- **The tile want's delta is not re-asked of the whole town.** `assignCitizens`
  may shuffle three citizens where this reads one, and a luxury's *signature* is
  not priced at all — the effect list is `resourceEffects.ts`' to read and cannot
  be asked hypothetically, which is the note the great person's work already
  carries.
- **The re-slot arm charges nothing for the turn the chair stands empty**, nor
  for the seal the replacement takes. Plain greedy is the ruling; the measured
  cost of it is two towns, and a margin (the knob the ruling withheld) is the
  first thing to try if that is judged too dear.
- **The capacity hypothesis credits the first town of the empire** with the
  phantom market. Which town holds it changes no clause the gate asks — a slot is
  an empire's — so the reading is exact; the clone is a fact about a board nobody
  plays.
- **The great-person table has never decided a pick on a played board.** Two
  offers arose in the acceptance games and the scored pick agreed with first-legal
  on both; the arithmetic is pinned by arranged tests and by nothing else.

## Batch 9 — the late-game cost (measured 2026-09-05, queued)

Standard map, two balanced seats, per-turn wall time of the whole driven
turn: t25 58ms · t50 142ms · t75 269ms · **t100 561ms** — roughly doubling
every 25 turns (5 towns, 24 pieces, 68 wild units, 4160 tiles). Duel at
t150 is 146ms. The 200-turn standard arena took 25½ minutes; replaying its
log took 70s, so ~95% is thinking. `valueContext` is ~20% of a turn (106ms
at t100 std) — the sitting hoist did its job; the cost is now per DECISION
elsewhere: the unit-order arms (a path search per candidate per piece over
a big board), `sightedThreat`'s fog sweeps, the route pair enumeration, the
improvement plan's ground walks. A profiler pass (node --cpu-prof through
vite-node on a t100 standard game) is the first step; the levers are the
usual ones — bound the searches (pathProbes-style caps where none exist),
hoist per-turn facts that arms recompute per piece (the fog reading, the
threat field), and stop pricing what the turn cannot change. Target: t100
standard ≤ 200ms/turn for two seats, no behavior change (byte-identical
outcomes on the acceptance seeds, or every change attributed).
