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
