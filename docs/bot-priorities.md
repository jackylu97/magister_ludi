# The priority system — spec of record (ratified in chat, 2026-09-04)

The architecture the user and orchestrator settled after `docs/history/bot-audit.md`:
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
  (hypothetical `foldCity` delta + `explainBuildingRow` − upkeep) with no
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
  `foldCity().production`, 1 for an empire with no town. Median, not mean,
  so one hammer-rich capital cannot tell the beeline that every town raises a
  library in four turns. `buildTurns(cost, ctx)` is that division, rounded up.
- `scienceRate` — `foldEmpireRates().sciencePerTurn`, the denominator of
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
the front row's worth (the queue's own reading — the hypothetical `foldCity`
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
that rival would simply close first — which is `closeTheGreatWork`'s own rule
since the victory ruling of 2026-09-05 (schema 69): the empire that finishes the
work wins it, and the rods gate the door rather than decide the close. The
tally comparison that used to sit beside this clause retired with the rule it
read. A lost race folds a printed `× 0` naming them, rather than merely reading
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
median's since batch 2 and because `foldCity` walks the empire for the two
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
it prices a building by the `foldCity` an unbuilt row would produce.

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

## Batch 9 as shipped — the late-game cost, measured and mostly elsewhere

**The measurement the queue was written from no longer described the tree.** Re
-measured on the standard board (seed 20260831, two balanced seats, the wild in
the fog, whole driven turn, 100 turns) the game did not cost the queued 561ms a
turn at t100; it cost **321 seconds in total**, and two thirds of that was **one
turn**. Everything below is measured against a pinned export of `9b6085a` with
only `src/ai/` and `data/ai.json` swapped, because the tree was being edited by
other hands throughout — baseline and shipped run back to back on the same
machine under the same load.

### The profile before, and what it says

`node --cpu-prof` through `vite-node`, profiler started at t95 so the window is
six ordinary late turns (37.6s of samples). Self time, top ten:

| % | function |
| --- | --- |
| 10.05 | `effectsOfKind` (`statecraft.ts`) |
| 9.25 | `anyCardDef` (`statecraft.ts`) |
| 7.55 | `pushEffects` (`statecraft.ts`) |
| 6.23 | `isBeliefId` (`religionData.ts`) |
| 5.48 | `isGreatPersonId` (`greatPeopleData.ts`) |
| 5.27 | `liveEffects` (`statecraft.ts`) |
| 4.90 | `isDoctrineId` (`statecraftData.ts`) |
| 3.27 | `push` (`statecraft.ts`) |
| 3.24 | `isOrderId` (`statecraftData.ts`) |
| 3.17 | `isTechId` (`techData.ts`) |

Not one of the queue's suspects. **Half of a late turn is the statecraft
evaluator rebuilding the same list.** The same profile attributed to the deepest
bot frame — *which arm asked, and what it asked for* — names the batch's actual
work:

| % | arm → what it called |
| --- | --- |
| 30.95 | `push` → `turnsToBuild` |
| 14.23 | `driveSeat` → `dispatch` (the simulation executing the commands) |
| 9.67 | `tileWants` → `purchasableTiles` |
| 9.31 | `improvementEntry` → `tileContextAt` |
| 5.84 | `buildCandidates` → `explainCity` |
| 3.92 | `rankTiles` → `tileContextAt` |
| 3.68 | `purchasingPlan` → `explainCity` |
| 2.46 | `reachOf` → `explainPurchaseCost` |
| 2.40 | `bagOfTiles` → `tileContextAt` |
| 1.78 | `tileWants` → `borderGrowth` |

The queued suspects were wrong in an instructive way. The unit-order arms' path
searches are already bounded and cost under a per cent; `sightedThreat` never
appears; `routeOutlook` appears at 0.87%. The cost was never a search — it was
**the same fact about the same town asked hundreds of times**, and each ask got
dearer as the card tables grew.

### The live-lock, which was two thirds of the game

Turn 94 took **204 seconds** on its own. One seat emitted **392
`chooseResearch` commands**, alternating `raisedFields` → `shipwrights` →
`raisedFields` for ever, until `driver.commandsPerSeat` cut it off.

`researchCommand`'s idempotence argument — *it sends nothing when the plan
already is the goal's expansion* — is about one goal and holds for one goal.
`techGoalTable` defends the incumbent by `priorities.switchMargin`, and the
margin **multiplies**: an incumbent whose chain has turned negative is made
*worse* by holding the plan and is displaced at once. The table's own docblock
says so and treats it as the right answer, which it is — for one candidate.
For two negative chains near enough in worth it is a perfect two-cycle, and each
lap of it rebuilds the whole goal table.

Shipped as a bound, not a repair: `driver.reaimsPerTurn` (1). A seat re-aims its
beeline at most once a turn; the first re-aim goes out exactly as before, and
nothing decides *which* goal is right differently. The research **blocker** — a
seat holding no plan at all — is the same arm through a different door and is
deliberately uncapped, so no seat can be left unable to end its turn. The bound
lives on the sitting, so `driver.ts` and `stepper.ts` carry it identically and
their byte-for-byte pin holds (re-verified directly: 60 turns of a duel, same
state hash both ways).

### The four hoists, each of them exact

1. **`push` was pricing a schedule with no quote.** `buildCandidates` already
   hoists `empirePercents` and takes one `explainCity` for its baseline, then
   handed every candidate to `push`, which asked `turnsToBuild` with **no quote
   at all** — so each of the forty rows paid for a fresh reading of the town's
   centre, hexes, luxuries, cards and both meter sweeps to answer a question
   whose only moving part is the item at the front. The quote is now lent. Same
   figure, one reading. **31% of a late turn.**
2. **`tileContextAt` was a coordinate reading used as a sweep reading.** Every
   arm that walks a town's ring asked it per hex, and the answer is the same
   object for every hex of the same town; the improvement plan asked it per hex
   **per candidate improvement**. New leaf `src/ai/ground.ts` —
   `tileContextField(state, viewerId)`, `tileOwnerField`'s bargain read one
   system across: `tileContextAt`'s own answer, computed once per owning town,
   read by lookup, lifetime one sweep. Wired into `buildImprovementPlan`,
   `rankWorkSites`, `focusTable` (`rankTiles`/`bagOfTiles`) and
   `nextWorkableTile`. **~16% of a late turn.**
3. **`tileWants` rebuilt the town's context per hex**, twice over — once for
   every worked hex and again for every hex on offer. One reading, spent by both
   loops.
4. **Three quote-less `foldCity` sweeps**: `townProduction` and `isOpusTown`
   walked every town of the empire taking a fresh `empirePercents` each time,
   and `focusTable`'s two live readings (the starvation guard and the growth
   clock) each took their own. One quote per town, lent.

Nothing was memoised across a decision, nothing is keyed on anything but the
sweep it was taken in, and no bound was placed on any search.

### The table

Whole driven turn, both seats, standard map, seed 20260831 — baseline and
shipped run back to back on the same (busy) machine:

| window | before | after | |
| --- | --- | --- | --- |
| t1–25 | 46ms | 42ms | 1.09× |
| t26–50 | 217ms | 197ms | 1.10× |
| t51–75 | 436ms | 295ms | 1.48× |
| t76–100 | 12154ms | 2378ms | **5.11×** |
| whole 100-turn game | 321.3s | 72.8s | **4.41×** |

On a quiet machine the same pair reads 297.5s → 48.0s (6.2×), t76–100 median
2988ms → 1487ms. The t76–100 *average* moves further than the median because
the live-lock was one turn; the median turn is the honest reading of the four
hoists, and it is between 1.6× and 2×.

**Byte-identical on every acceptance game.** Seeds 5 / 777 / 20260904, duel and
standard, both seats driven to t75, `snapshotState` and command-log hashes
before and after:

| | state | log |
| --- | --- | --- |
| duel 5 | `9c3fd3af111a524d` | `32b977fd4a808a37` |
| duel 777 | `56880bd2e5dfbc50` | `f3a14affba7f9831` |
| duel 20260904 | `d9de559a675fbefc` | `2cc713e5e15efaa2` |
| standard 5 | `924050b0f3d811f9` | `d322cc086e211dab` |
| standard 777 | `1f90bb5c354fbefe` | `12c63dd2845e8c4f` |
| standard 20260904 | `6d040c9ce5f2d33c` | `099cbab91880c552` |

All six match on both hashes: the four hoists are exact, and the re-aim bound
never fires inside seventy-five turns on any acceptance seed. The one game whose
outcome moves is the 200-turn standard arena, and it moves at **t94** — the
live-lock turn — which is the change being made.

### The target was not met, and the number that stands in the way is not the bot's

Target was t100 ≤ 200ms. Shipped is ~2.4s (busy) / ~1.5s (quiet). The remaining
cost is one shape, and it is `src/sim/`'s:

> `effectsOfKind` calls `liveEffects(state, playerId)` and filters the result,
> so **every query for one kind of effect rebuilds the whole per-empire list** —
> the government, the doctrines, the slots, the pantheon, the wonders, the
> beads, the technologies and every held religion, each row through
> `anyCardDef`. Counted on the shipped build at t95–100: **115,000 to 179,000
> `liveEffects` calls per turn**, for at most two distinct answers per instant.

That is the whole of the top-ten profile above, before and after (the shipped
build's profile is the same list in the same order — 10.03% `effectsOfKind`,
8.70% `anyCardDef`, 7.67% `pushEffects` — the bot simply asks for less of it).
The bot cannot fix it from outside: it is not asking redundantly any more; the
answer it asks for is expensive. The fix is the one this codebase already has a
name for — a per-sweep hoisted reading, `zocField`/`tileOwnerField`/`CityReading`
said once more about the effect list — and it belongs to a statecraft batch, not
to this one. **Estimated headroom: the great majority of what is left.**

Two smaller sim-side readings sit under the same heading and are the next two
after it: `purchasableTiles` (17% of a late turn, and asked exactly once per
town per turn — it is dear, not redundant) and the hypothetical `explainCity`s
`buildCandidates` and `purchasingPlan` take per row, which are dear for the same
reason the list above is dear.

### Knobs

Added: `driver.reaimsPerTurn` (1) — how many times a seat re-aims its beeline in
one turn; a bound on compute, the audit's one honest kind of cap. Nothing
deleted. The arena panel needed no edit; it walks the sheet.

### Known gaps, written down rather than fixed

- **`projectIdleCommand` rebuilds a whole production table per project-headed
  town on every decision that reaches housekeeping**, and says nothing on almost
  all of them. Suppressing the re-ask needs a sitting-scoped memo of *towns this
  turn has already found nothing to say about*, which is not exact — a purchase
  or a chop mid-turn can change the answer — so it was left alone rather than
  bought with a behaviour change.
- **The live-lock is bounded, not cured.** `techGoalTable`'s margin still makes
  a negative incumbent worse than a challenger, which is what produced the
  two-cycle; the bound stops the seat paying for it four hundred times a turn
  and does not decide what the margin should do to a negative chain. That is a
  design question about `priorities.switchMargin`, and it is the first thing to
  ask if a re-aim ever needs to happen twice in one turn.
- **`driver.commandsPerSeat` masked the live-lock for as long as it existed.** A
  seat that spends its whole budget is not a seat that is busy; nothing warns
  when the budget is exhausted, and a warning there would have found this in the
  turn it started.
- **The queue's suspects are cleared, with numbers**: the unit-order arms'
  searches, `sightedThreat`'s fog sweeps and the route pair enumeration are each
  under one per cent of a late turn. They do not need bounding.

## Batch 10 as shipped — the evaluator remembers

Batch 9 ended by naming the one shape left, and it was not the bot's:
`effectsOfKind` asked `liveEffects` and filtered the answer, so **every query for
one kind of effect rebuilt the whole per-empire list** — 115,000 to 179,000 walks
a turn at t95–100, for at most two distinct answers per instant. This batch does
not make the walk cheaper. It stops asking for it.

Everything below is measured on the standard board (seed 20260831, two balanced
seats, the wild in the fog, whole driven turn, 100 turns), baseline and shipped
run back to back on the same machine, twice.

### What the list is a function of, written down

The walk reads eleven things and nothing else: the turn (a rite's liveness *and*
the number of turns its label says it has left), the government, the doctrines in
the order taken, the slots in slot order, the pantheon's beliefs, the one-of-a-kind
buildings standing in the empire's towns, the legacies and which of them are
revoked, the realm's own timed bill, the beads that pay a cap, the technologies
held — and the religions whose holy city the empire holds, which is not a field
at all but a reading of the board (`religionFounder` follows the stones).

Then there is the twelfth, and it is the one a print cannot carry: a
`conditionRule` asks a **meter**, and a meter reads the whole realm. Six rows in
the table carry one (`hermitCrown`, `greatWarringTribes`, `breadAndCircuses`,
`emergencyPowers`, `theArsenalLaw`, `theBannerCall`).

### The memo, and the two things it checks

> **Superseded by batch E3a** (2026-09-07, `docs/audit/evaluations.md` §4c.1).
> Batch E2 gave the simulation `GameState.revision` — the announcement this
> section says nothing in the game makes — so `liveReading` keys on
> `(state identity, revision, seat)` and `livePrint`, `printsAgree`, `gatesAgree`
> and the `asked` notebook are deleted. What follows is the batch-10 record, kept
> because the measurements below are of the walk this memo wraps, and those are
> unchanged.

`liveReading(state, playerId)` — a `WeakMap` on the state, keyed
`playerId * 2 + cut`, holding the list, the print it was built from, and every
gate the build opened or closed. A remembered list is handed back when:

1. **the print agrees** — `livePrint` reads every input above again, as values,
   each list preceded by its length. Values and not array identities,
   deliberately: an identity-and-length print would be cheaper and would be wrong
   the first time somebody replaced a member of a list in place, and the failure
   mode of a wrong print is a stale yield;
2. **the gates answer the same** — every condition the build consulted, re-asked
   under the same cut. Re-asking costs exactly what the rebuild would have paid
   for those gates and saves everything else, so the memo is **never a loss**; a
   seat holding no gated card pays nothing at all.

Two slots per seat rather than one, because there are two readings and they
differ: at `conditionDepth > 0` every gated clause contributes nothing, so an
empire being *asked about* has a shorter law than the same empire being paid.
The state is not touched — `snapshotState` is `JSON.stringify(state)`, so a cache
hung on `GameState` would be in every save hash in the suite, and a restored
state is a different object that starts with nothing remembered.

On top of the remembered walk, `effectsOfKind` keeps its own narrowing per kind
(`LiveReading.byKind`), cut on first ask and dying with the walk it belongs to —
because once the walk is remembered, *filtering* it is what a late turn spends
its time on.

### The other half: `anyCardDef` walked its cascade once per effect pushed

Ten arms, four of them `hasOwnProperty` probes into four different data tables,
asked once per line the evaluator wrote — 9% of a late turn on its own, with
`isBeliefId`, `isGreatPersonId`, `isDoctrineId`, `isOrderId` and `isTechId`
another 22% between them. Every arm is a question about the *tables*, which are
frozen at module load, so the answer for an id cannot change inside a game:
`CARD_DEFS` now remembers it. The arms are in the same order, so an id resolves
to the same class it always did; four of them used to hand back a freshly built
adaptation and now hand back the same one, which is why the answer is `readonly`
in spirit and read-only in fact.

And `pushEffects` built `word · name` — a template *and* an `anyCardDef` — once
per effect of a card, when every effect of one card carries the identical label.
Once per card now.

### The table

| window | before | after | |
| --- | --- | --- | --- |
| t1–25 | 64ms | 63ms | 1.02× |
| t26–50 | 274ms | 254ms | 1.08× |
| t51–75 | 590ms | 422ms | 1.40× |
| t76–100 | 2320ms | 964ms | **2.41×** |
| whole 100-turn game | 82.3s | 43.1s | **1.91×** |

The first of the two pairs reads 77.0s → 45.9s (1.68×), t76–100 2123ms → 1004ms
(2.11×). Turns before t50 barely move, which is the shape you would expect: the
list is short and the bot asks for it less often.

**Byte-identical on every acceptance game.** Seeds 5 / 777 / 20260904, duel and
standard, both seats driven to t75, `snapshotState` and command-log hashes
before and after:

| | state | log |
| --- | --- | --- |
| duel 5 | `de2ddb92695dc940` | `24acaa371f8b8ab9` |
| duel 777 | `a935e60e23cfbb3a` | `7b4f928785827b11` |
| duel 20260904 | `d763a7d17f48e3bb` | `1fd2038d2f1f81d3` |
| standard 5 | `c6a1cc68bdf6370c` | `2e8bcdbdacf4e6e5` |
| standard 777 | `3d7809ac866c4de8` | `e5e37300e7085dde` |
| standard 20260904 | `fc8f2946f7ff5402` | `975d4f57d933ecdf` |

All six match on both hashes, and so does the 100-turn standard game the table
is measured on (`542359843c159c4e` / `497e951cb7506530`, before and after, all
four runs). Nothing about what the bot decides has changed; it is the same game,
played faster.

### The profile after

`node --cpu-prof` over the whole 100-turn game (late turns are half of it):

| % | function |
| --- | --- |
| 9.67 | `findPath` (`pathfind.ts`) |
| 8.78 | `controlledHoldings` (`cities.ts`) |
| 8.00 | `hasForeignUnit` (`units.ts`) |
| 6.06 | `controlledResources` (`cities.ts`) |
| 5.87 | `at` (`state.ts`) |
| 2.88 | `livePrint` (`statecraft.ts`) |
| 1.49 | `liveReading` (`statecraft.ts`) |
| 0.85 | `printsAgree` (`statecraft.ts`) |

`effectsOfKind`, `anyCardDef`, `pushEffects`, `liveEffects` and the five `is…Id`
predicates are gone from the top twenty-five entirely. The whole statecraft
evaluator is now **about 5%** of a game, of which 3.7% is the memo's own
bookkeeping — the price of a print that is complete rather than clever, and the
next thing to shave if the evaluator ever matters again.

What is in front of it now is a different system: `controlledHoldings` and
`controlledResources` (an empire's resource sweep, taken per town per reading)
and `hasForeignUnit`/`findPath` (the movement layer). Both are the *same shape*
this batch fixed one system over — the same fact about the same realm asked
hundreds of times — and neither is the bot's.

### Discipline

Nothing was bounded, nothing was approximated, and no decision changed. The two
guards are the register test and the mutation cases: `test/sim/statecraft.test.ts`
reads `buildLiveEffects`' own body and `livePrint`'s and fails when the walk
reads a field the print does not, with a short, justified list of what is *not*
an input (`CLASS_WORD`'s labels, a data row's frozen clauses, the founder
trickle's amplifier read off the list already built). A source added to the walk
joins the print or the suite says so.

### Known gaps, written down rather than fixed

- ~~**`livePrint` is a fifth of what the evaluator now costs.**~~ **Closed by
  batch E3a**: the print is gone, not made cheaper. The counter it was standing
  in for now exists, so the memo is an integer compare and the fifth is
  recovered whole.
- **`liveCityEffects` still builds four arrays and spreads them per call.** The
  empire half of it is remembered now; the town-local half (buildings, rites,
  follower beliefs, the cathedral's patron) is not, and it has a fifth input
  class of its own (`cityReligion` is derived from citizens). The same memo would
  fit, keyed by city; it was not needed to clear the profile.
- **The memo is per state object, not per game.** `restoreState` starts empty by
  construction, which is right, and a test that hands the same `GameState` to two
  games would share one — nothing does, and nothing should.

## The focus arm's idempotence, and the levy's own count (2026-09-05)

Two fixes in `bot.ts`, both by construction, both found by a test that had been
passing on the luck of a board.

### The focus arm answered differently about a board nothing had changed

`focusCommand`'s docblock promised that its appraisal is a function of the ground
and of the sitting's frozen readings, "never of the focus it is about, so acting
on it cannot change it". It was not, in two places, and the driver's loop paid:
on seed 20260904 at t51 one seat spent its **whole command budget**
(`driver.commandsPerSeat`) pointing one town back and forth.

- **A staged total patched by a raw difference is not the staged total.** The
  starvation guard and the growth clock both have to read the town's live books
  (the raw hexes say nothing about the centre, the buildings or the
  percentages), and both moved between the two sheets by adding the *tile* food
  difference to the *staged* figure. Under Entry XVII that is wrong by every
  percentage on the channel and again by the floor: the measured town lost ten
  bushels of banked food for eight bushels of ground, so the growth charge read
  −3.1 with the town standing balanced and −11.3 with it standing on the
  hammers, and the lean scored +7.6 and then −0.6. **`foodUnder(bag)`** is the
  fix — the simulation's own `foldCity` over a *shifted quote*, `books.flats`
  moved by the difference from the hexes the town actually stands on. The anchor
  is the **actual** placement (`workedTilesOf`), not the sheet the town is
  pointed at, so `flats.food − standing.food` is the town's non-tile food and is
  invariant under any reassignment — the sim's starvation guard putting a
  focused sheet back, `capFoodSurplus` trimming a swap, a pinned hex.
- **The seats to fill are `chooseCitizens`' cap, not the length of the last
  assignment.** `city.workedTiles.length` is stale for exactly one turn after a
  town grows — `settleGrowth` adds the citizen and `collectYields` seats it, and
  `collectYields` prices the town *before* the growth phase — and any command
  reaching `refreshCityDerived` (this arm's own, first of all) seats it. Seat 0
  on seed 20260831 read four seats, was told the balanced ordering, seated its
  fifth citizen on the way, and read five seats and the opposite word a moment
  later. `population − specialists`, bounded by the assignable ground, is a fact
  about the town's people rather than about when it was last swept.

**And a bound where the board genuinely moves.** A card slotted, a government
adopted, a hex bought — any of these legitimately changes what a town's hexes pay
or what it eats, and batch 6's rule is that a mid-turn mutation is re-read from
the state. Re-reading is right; ordering a second time is not.
**`BotSitting.focused`** is that bound, `reaims`' sibling and the sitting's third
piece of memory: a town this seat has pointed this turn keeps its word until the
seat sits down again. Measured (seed 1, t48): the town was told the balanced
ordering, the seat then slotted a card worth three bushels to it, and the same
arm told it the hammers four commands later.

Over twelve seeds × sixty turns the arm now issues 183 orders and **no town is
ordered twice in one turn on any of them**; it was six such turns before, one of
them the budget burn.

### The levy counted scouts, the mix did not

`countSoldiers` answered `isCombatant`, which is true of a scout — it has a
combat strength — so the wage-aware levy read three ranging pieces as three
quarters of the army it wanted, while the very next term in the same fold
(`explainMixCraving`) said "1 of 1 in this army is melee". A seat with a column
at its gate, one warrior in its town and three scouts on the map therefore
charged the next spearman three quarters of its worth for an army it did not
have, and started a worker. **`isFieldSoldier`** — combatant, not an explorer,
not naval — is now the one predicate both readings ask, and `countRangers`
against `military.scoutCap` remains the scouts' own count, as it always was.

Measured on the fourteen-turn bench (seed 20260831, the threat fixture): with
three wild warriors beside the town the warrior's fold goes 130 − 18.6 (the levy)
− 27 (the mix) − 12 (the wage) = 72, against the worker's 17 — where it read
16.93 and lost by a third of a point. In the quiet world the same warrior reads
−12 and the worker still wins, which is the fixture's other half.

**Known gap, written down rather than fixed.** The focus arm has no incumbency
margin: the balanced candidate scores exactly nought by construction, so
`priorities.switchMargin` has nothing to multiply and a town whose lean sits near
zero can be re-pointed on consecutive turns (seed 20260831, seat 1's town, t43
to t49 — production, default, production, default). One order per town per turn is guaranteed; one order per town per *era*
is not, and a margin for it would need a baseline that is not zero.

## Batch F2 as shipped — the bot drafts engines (2026-09-06)

The debt batch A wrote down and batch F repeated: *an engine appraised alone
multiplies a deck this reading cannot see.* `docs/fewer-things-plan.md` row F2
asked for the marginal reading `V(deck ∪ card) − V(deck)`, and this is it.

### The approach, and why it is (a)

**A scratch board**, the brief's option (a), and the reason is that option (b) —
an "as if slotted" overlay on `countOf` and the fold — would put a hypothetical
inside `src/sim/`, which is the one place a hypothetical must not go: the
evaluator is the game's law, and a law that can be asked *what if* is a law with
a second reading of itself. A scratch board asks the existing law an ordinary
question about a board that is not the real one, which is what
`foldCity(state, city, [candidate])` has always been.

`deckPair(state, playerId, id)` builds the two boards a margin is the difference
of. Both are **shallow** clones and every layer is shared but the one that
changes — the players array, the one player, its `PlayerStatecraft`, the slots —
which is safe because every reading taken off them is a pure fold (`foldCity`,
`explainEmpireGold`, `explainRenown`, the two meters mutate nothing). The
evaluator's own memo (`liveReading`, batch 10) is a `WeakMap` keyed on the state
object over a **print of the walk's inputs**, so a scratch board builds its list
once, answers off it, and is collected with it.

The pair is taken from whichever side the empire is standing on:

- a card **not held** is placed, and `without` is the board as it stands;
- a card **already in a chair** has its chair emptied instead, and `with` is the
  board as it stands. That is not a nicety: `reslotDecision` weighs the sitting
  card against the challenger in one table, and a sitting card that answered
  *"nothing, I am already played"* would be swapped out for anything at all.

**The chair it would take** is the bot's own placement (`slottingDecision`): the
first empty chair whose flavour admits it, and — when every fitting chair is full
— the chair of the worst card it would bench, ranked by a deliberately crude
count of the row's own clauses, because `explainCard` is what asks for this and
ranking the bench by `explainCard` would be a recursion with no floor.

### `V`, the nine channels

`deckReading` = the simulation's own per-turn books (`foldEmpireRates`: the six
voices) plus `renownPerTurn`, `happinessOf` and `authorityOf`. The difference is
weighed **exactly as the flat card arms weigh the same channels** — `voiceWeight`
for the voices (so gold, faith and culture go through the shadow prices),
`weights.renown`, `meterWeight` for the two meters — plus `hammerTerm` on the
production it found, the same door a mine walks through. The reading changes
*what* is counted, never *how* it is priced, and `total` is the fold of the very
terms it prints, per channel, in the fold's own order.

### What is priced by it, and what is not

The margin is taken for a row carrying at least one shape **the empire's per-turn
books can actually see** (`hasFoldReadEngine`), and for such a row the isolated
walk is not consulted at all. Four shapes qualify:

| shape | why the books, not the row |
|---|---|
| `cardYieldAmplifier` | its lines are the *other* slotted Orders', so a per-town line, a capital-scoped line and a hex line pay differently and only the fold knows which — and the scopes are **evaluated**, which no line count can do |
| `buildingYieldPercent` | a share of shelves this empire has actually raised, staged and floored by the town's own percentages, composed with any `appliedLast` doubler already slotted |
| `cityRenownPercent` | the same sentence in the renown channel |
| `effectAmplifier`, where the target is a rate the books carry (`routeYields`, `founderTrickle`, `luxuryHappiness`, `luxuryDuplicates`) | **The Exchequer**, the named debt: it fell to `score.unknownEffect` — six points for doubling every caravan in the realm |

**Fourteen rows of the whole 167-row table** carry one, and they are the only
rows whose appraisal moved (pinned in `aiWants.test.ts`).

Three shapes stay on their existing arms, by ruling rather than by omission:
`periodic` and `periodShorten` pay a **windfall**, not a rate, so a reading of the
per-turn books cannot see them at all; `slotPosition` is priced as the doubled
card's own appraisal, which is the brief's own sentence and reaches the half of a
card (combat lines, rules) no yield fold carries. `riteDuration` keeps the
stand-in for the same reason: it moves the turn a blessing is stamped to expire
on, which is not a rate.

### Byte-identity

Seven games, the acceptance harness of batches 9/10 (seeds 5 / 777 / 20260904,
duel and standard, both seats driven to t75) plus the standard board at t60,
hashed before the batch and after it on the same tree:

| game | state | log | |
|---|---|---|---|
| duel 5 | `b80083fe04b9d159` | `07480245a0f88414` | identical |
| duel 777 | `c197b1ca1b2a414d` | `e2915a5ca59606af` | identical |
| duel 20260904 | `2b048068bcb79126` | `6633b38a541040ec` | identical |
| standard 5 | `dedbb8db9787f471` | `5e9fd63c3d26d981` | identical |
| standard 777 | `827cf147e8f2fe1c` | `a904acbdedb45a7f` | identical |
| standard 20260904 | `1cac3d6f3de46bfe` → `e1bd89305ee00507` | `269e46…` → `58b083…` | **moved** |
| standard 20260831, t60 | `87d24dba6ac42d19` | `2f9042ee325eb9ff` | identical |

**Six of seven identical; one moved, and it is fully attributed.** The first
difference on standard 20260904 is at t48, and it is not a card decision at all:
seat 1 issues one extra `setCitizenFocus`. Measured on that very board with the
door switched off and on:

```
seat 1  gov=councilOfElders  pool=27  engines in pool = 1 [theHarvestHome]
  draft want worth   off 62.9976   on 62.1331
  culture price      off  9.5451   on  9.4141
seat 0  gov=chiefdom  pool=8  engines in pool = 0
  every price identical
```

The Harvest Home is in seat 1's live pool; its marginal reading is *lower* than
its isolated one (that seat's only food-paying Order is scoped to a luxury it
does not hold, so the amplifier has no live line to amplify — the isolated arm
counts the line and the fold does not). `draftPlan`'s `E[best of the hand]` falls,
culture's shadow price falls with it, and one focus decision near a hairline flips.

So the honest statement of the rule is one clause stronger than the brief's: a
board is byte-identical while **no engine row stands in the government's live
pool**, not merely while none is dealt into a hand — because the draft plan
prices the pool, and the pool's expectation is what sets culture's price.

### What the bot now drafts

On the test fixture (three food-paying Orders in their chairs — Terraced
Hillsides on an all-hills bench, The Unbroken Land on planted forest, The Founding
Oath over stocked shelves — with **The Harvest Home** offered beside two flats):

- with the deck, the amplifier outscores both flats and is taken;
- with **the same board and no deck at all**, its margin is exactly `0` and both
  flats outscore it.

That pair is the batch, said as a test. Two more of the same kind: The Scriveners
prices at exactly `0` in an empire with no science shelf and above zero the moment
one stands, and the margin is `===` the difference the simulation's own books read
when the card is actually put in the chair.

### Cost

None worth reporting. The acceptance harness (seven bot-driven games, 510
seat-turns) ran 63.4s before and 41.5s after on the same machine — noise, and in
the wrong direction to be a cost. Two reasons: only the fourteen rows ask for a
margin at all, and every answer is remembered for the life of the context that
asked for it (`MARGIN_MEMO`, a `WeakMap` on the `ValueContext`) — which is the
sitting's own bargain said once more, batch 6.

### Known gaps, written down rather than fixed

- **The reroll stays unpriced, and the bot never rerolls.** A reroll (batch C1) is
  a faith verb on an offer; pricing it would be `expectedBestOrder` asked of a hand
  the reroll has not dealt yet, against a faith price the same book sets. Pinned as
  an *absence*: no module in `src/ai/` names `'rerollOffer'`.
- **A flat card joining an engine deck is still priced alone.** The Harvest Home
  drafted into a deck of food cards is priced by the deck; a food card drafted into
  a deck that already holds The Harvest Home is not, because the card carries no
  engine shape and the margin is therefore not taken. Closing it means taking the
  margin for *every* card whenever the deck holds an engine, which was measured to
  move every board with a percentage card in a chair — the fold and the isolated
  walk disagree about ordinary rows by a factor of two or three, in both directions
  (measured on the standard board at t60: The Old Ways 28 alone against 211 folded,
  The Laureate 350 against 4). Unifying the two readings is a bigger pass than F2
  and it is the honest next one.
- **The margin is the whole card's.** A future row mixing an engine with a shape
  the books cannot carry — a combat line, an offer rider — would lose that half.
  No Order in the table mixes (the fourteen carry one clause each) and the one
  Doctrine that does (the Grand Bazaar) is read whole by the fold anyway.
  `explainCardEffects` is where such a row would be split.
- **Beliefs and technologies take no margin.** `deckPair` answers `null` for them:
  the hypothetical is a different verb for each and none carries an engine shape
  today.
- **`aiDecision.slow`'s coverage set is red on this tree, and not from this
  batch.** The `deal` kind has left seed 1's hundred turns. Verified by running the
  same test with the F2 door switched off: it fails identically. Not re-aimed —
  the coverage list moves deliberately or not at all, and this batch is not what
  moved it.

## Batch H2 as shipped — the bot reads the whole deck (2026-09-06)

`docs/audit/orchestrator.md`'s finding 4, and the row of the fix queue that says
*half the effect vocabulary is worth one constant*: `scoreEffect`'s `switch`
ended in `default: return score.unknownEffect`, so **23 of the 46 `CardEffect`
kinds — 161 of 681 live effect rows — priced at two points apiece**, and nobody
had decided that.

### The structure: a `never`, so the next shape cannot be forgotten

`scoreEffect` switches on an **aliased discriminant** and ends in
`unreadEffect(kind, ctx)` with `kind: never` — `applyCommand`'s idiom
(`commands.ts`), one system over. A member of `CardEffect` declared in
`statecraftData.ts` with no arm here now stops the build. Four smaller registers
inside the batch carry the same guard: `occasionRate` over `WindfallOccasion`,
`scoreRulePercent` over `CardRule`, `scoreMeterRule` over `MeterRuleId`,
`scoreAmplifier` over `AmplifierTarget`, and `conditionIsLive` over
`EmpireCondition`.

The module docblock's old rule 3 said a `never` here *"would make adding a card
shape a compile error in the AI, which is not where that decision belongs"*. The
audit measured that sentence wrong and it is rewritten: a shape with no honest
reading still scores `score.unknownEffect`, but it now says so **by name**, in an
arm, with a line saying why. It cost exactly what it should have: **the first
shape the `never` caught was H1's own `upkeepSurcharge`, landed in the shared
tree while this batch was being written.**

### The arms added — kind → the reading it takes

| Kind | Live rows | Reading |
|---|---|---|
| `windfallRider` | 43 | the occasion's frequency × the grant. See below |
| `rulePercent` | 21 | each rule's own fold — see below |
| `unlocksBuilding` | 12 | the shelf it opens (`explainBuildingRow` + the row's flats) × the towns × `delayDiscount(buildTurns)` |
| `effectAmplifier` | 11 | the table it points at — see below |
| `meterRule` | 9 | the constant it rewrites × the towns, at the meter's **live** price (`meterWeight`) |
| `yieldConversion` | 8 | the share of the `from` books, at the `to` price |
| `rateConversion` | 8 | `floor(rate ÷ per) × scorePayout` — the books are literally this shape's input |
| `routeRider` | 6 | `routeSlotTerm`, the very door a market's `routeSlots` walks through |
| `cityStat` | 6 | `explainBuildingRow`'s own wall reading, exactly |
| `conditionRule` | 6 | its clauses at full price while the gate is open on **this board**, nothing when shut |
| `purchaseRider` | 5 | the share off, over what the purse turns over in a turn |
| `foundingRider` | 5 | a citizen at the growth threshold · a shelf · a road home, × the founding rate |
| `rule: 'borders'` · `unitStamp` | 1 · 1 | the wall reading and the `unitStat` reading |
| `projectRider` | 1 | the payout it adds × the towns actually running that project |
| `mirrorYield` | 1 | the category's shelves' own `from` figure, at the `to` price |
| `periodicOffer` · `periodicMuster` | 1 · 1 | one firing over the cadence — `periodic`'s arithmetic |
| `upkeepSurcharge` | 1 (H1's) | −amount × the pieces in the field, at gold's live price |

**The `windfallRider` family, and how a frequency is read.** The brief allowed
either "count the recent turns" or "estimate from the board"; what shipped is
**the board's own record wherever the board keeps one** — technologies held over
turns played, citizens standing less one per town (every growth that ever
happened), shelves standing, `Player.unitsBuilt`, `Player.tilesPurchased`. Those
are exact histories, and they cost one sweep between them (`boardTempo`, memoised
per sitting). Where the board keeps no record the reading is a **stock over the
horizon** — the ruins this seat has charted (through its **own fog**,
`isExploredBy`), the wooded hexes inside its borders, the camps it has sighted —
and that is crude and written down as crude. Three families answer nothing, each
for a stated reason: the war occasions ride `ValueContext.threat`, so they are
worth nothing in a quiet world; the survey pair is nought because **the vein
layer is shelved**; and a rite is nought because no augur stands. `kill` and
`death` divide `score.tallyForecast` by the horizon, which is what "occasions
expected over the horizon" means said as a rate — the forecast table's second
reader.

The grant is `explainLump` (a windfall is a gift paid once, and this file has one
exchange rate for that); a grant quoted in *turns of a rate* reads the empire's
own books, which is `windfallPayout`'s own reading. `perAge` and
`perSlottedOrder` are the evaluator's own multipliers read off the same board.
The **`percent` half is the one thing here that is not read** — it scales the
occasion's own payout, which is composed inside `windfallPayout` from rules this
file does not carry — so it meets the stand-in scaled by the share, and The
Woodwrights' doubled chop still sorts above a fifty-percent one.

**The rules, seven of nine.** `unitUpkeep` → the payroll itself
(`unitUpkeepTotal`) at gold's live price, **both signs**, so The Reckless Levy's
surcharge is now a charge and Tyranny's rebate a credit; `happinessDemand` → what
this empire's citizens demand (`happinessDemand` per town) at the happiness
price; `growthSurplus` → a share of the food the realm makes; `growthCarryover` →
a share of what a growth cost (the simulation's own curve at the realm's mean
population) × how often this empire grows; `settlerCost` → the hammers the
settler this empire is *actually* raising would stop owing, and nothing when no
expansion chain is live; `tilePurchase` → the ring price × this seat's own
purchase record; `roadStepCost` unchanged.

**The amplifier, five targets of eight.** The routes running, the roads' own coin
(`explainEmpireGold`'s positive lines), the shelf's `perUniqueLuxury` at the
happiness price, the faith rate, the renown rate. `connectionYields` also joined
`foldReadsAmplifier` — it lives inside `goldPerTurn`, so the **fold** reads it
exactly — which moves no board today (its two live rows are a technology's and a
great person's, and `deckPair` answers `null` for both) and is right for the next
row that carries it.

### The stand-ins left, and why each stays

Nine arms still answer `score.unknownEffect`, and each carries its reason in the
source:

| Kind | Why |
|---|---|
| `pressure` · `pressureRule` | **The tide has no reading in this currency.** The bot prices the *first* religion (`religion.prophetTechValue`) and nothing anywhere prices the hundredth follower |
| `pantheonSlots` | a belief's worth is the faith book's, and the faith book (`wants.ts`) reads *this* file — taking it here is the cycle `moduleCycles.test.ts` exists to catch. Closing it means moving the belief appraisal into a leaf |
| `metaRule` | a seal is the difference between two draft plans, same module, same reason |
| `rule` → `freshwater` | what fresh water un-gates is `buildError` asked hypothetically, which is the hypothetical inside `src/sim/` this bot may not ask for |
| `rule` → the verbs | three of the four live rows open the great-person draft **no surface constructs** (the audit's own surprise, queued as H3); a price on a button nobody can press is worse than a stand-in |
| `rule` → the world's rules | a rule of the wild's turn, and roads that are already free |
| `rulePercent` → `borderCulture`, `borderCost` | both buy **ground**, and a hex nobody owns is priced by the settle table's weights (`site.yieldWeights`) rather than by this currency — batch 4's two-weight-tables gap, unclosed |
| `effectAmplifier` → `riteDuration`, `greatPersonAct` | neither is a rate. F2's own written-down cut, kept |
| a `unitStamp`'s `hp`, a rider's `heal`/`healAll` | a hit point is a fraction of a piece and none of the three names a piece |

### The two other findings

**Finding 6 — a `where: 'city'` counted line paid once.** `scorePayout` reads
`pays.where` now: a city line is multiplied by `ValueContext.cities`, a capital
line and an empire line pay once. Five live rows were under-priced by the whole
of the empire's city count (Imperium, the Assembly Hall's two, the Smithy's,
Sima Qian's). The scope is still not evaluated, exactly as `foldCity`' own arm
does not evaluate one — the standing bargain of the file rather than a new
omission.

**Finding 5 — the margin's `V`.** `deckReading` reads `marginRates`, which is
`foldEmpireRates` **plus** `explainEmpireCardYields`. The sender's foreign
routes and the treasury's four lines turned out to be **already inside** the base
reading (`foldEmpireRates`, `yields/empire.ts`), so the card empire lines were the whole of
the hole; the audit's sentence about the routes was stale. It is built in
`value.ts` and not added to `foldEmpireRates`, deliberately: that function's
meaning in the simulation is *the base rate a conversion reads*, and folding the
card lines back into it would be a card feeding itself. If the base reading ever
grows these terms of its own, `marginRates` collapses to it.

### The two knobs retired

- **`workers.veinValue`** — the seam a survey reveals is unknown *by
  construction*, so the want prices at **0** and prints a zero-valued label
  saying why. Gone from `data/ai.json` and `aiConfig.ts`, so the arena panel
  loses the box with no page edit. Inert on every board besides: `veins.share` is
  0 since the layer was shelved (2026-09-06).
- **`weights.die`** — the great-person dice are gone and the knob was read by
  nothing at all, while shipping as a live arena box that moved nothing.

**`score.caravanScale` is kept, and measured.** H1's five-voice route fold added
voices the reading already claimed to carry, not the terms this stands in for
(the road's march value, trading-post range, the destination's growth), so its
stated justification is untouched. And it decides nothing on the acceptance
boards: **no seat raises a caravan at all inside t75 on any of the six**, at ×3
or at ×1 — two seats hold one route slot each by t75 and neither fills it (the
pay it multiplies reads 46 → 138 and 24.4 → 73.2, and is never acted on). The
grid search remains the instrument.

### Byte-identity, and the attribution

The tree moved under this batch several times (H1 and the order pass landing in
parallel), so a git before/after would have measured other people's work. Instead
both passes were run **in one process on one tree**, with the batch's arms gated
by a temporary switch, over the batch 9/10 acceptance harness (seeds 5/777/20260904
× duel/standard, both seats driven to t75, `snapshotState` + log hashes):

| game | log hash off → on | | first divergence | knockouts |
|---|---|---|---|---|
| duel 5 | `44f37cc1024de2d1` → `8f3e8a47a2c85f99` | **moved** | #72 `chooseOrder` option 0 → option 1 | windfallRider MOVES · cityStat MOVES · rulePercent inert · purchaseRider inert |
| duel 777 | `1c7c220fd73968f5` → `41a0d2325ffe9d63` | **moved** | #130 `chooseOrder` → `skipOrderOffer` | windfallRider · rulePercent · cityStat MOVE |
| duel 20260904 | `3f8ac19042770ec6` → `4ef769297902dc0a` | **moved** | #46 `chooseOrder` → `skipOrderOffer` | windfallRider · rulePercent · cityStat MOVE |
| standard 5 | `7f5c7d7507953f24` → `2e0b23c5066713c9` | **moved** | #172 `setCityProduction` granary → settler | rulePercent · cityStat · purchaseRider MOVE; windfallRider inert |
| standard 777 | `d2ca6cf36efc270f` → `e0fe3f880b989804` | **moved** | #43 `chooseOrder` → `skipOrderOffer` | windfallRider · rulePercent · cityStat MOVE |
| standard 20260904 | `f145b9022ad58d53` → `afc46cf17d13ebb3` | **moved** | #47 `chooseOrder` → `skipOrderOffer` | windfallRider · rulePercent · cityStat MOVE |

**All six moved, and five of the six first diverge on a Statecraft draft** — the
bot takes a different card, or passes a hand it used to take. That is the batch
said as one line: the draft is the one arm that appraises *whole cards*, so
pricing 23 shapes shows up there first and everywhere else downstream (culture's
shadow price is the draft plan's own reading, so a re-priced pool re-prices every
coin of culture in the book). The sixth diverges at a build, three turns of
compounding later.

"Knockouts" is each arm reverted **alone** with the rest of the batch live:
`windfallRider`, `rulePercent` and `cityStat` each move a board on their own on
five or six of the six, which is the honest shape of a 43-row family, a 21-row
family and a shape on three wonders. `purchaseRider` alone moves one board of the
six despite being asked three hundred times a game — a discount priced against
the gold *rate* is a small number beside a shelf.

Arms asked per game (the tally, duel 5): `windfallRider` 1,149 · `rulePercent`
533 · `cityStat` 402 · `purchaseRider` 275 · `pantheonSlots` 180 · `routeRider`
173 · `pressure` 136 · `rule` 187 (94 the world's, 93 the border's) · `effectAmplifier` 93 ·
`meterRule` 80 · `unlocksBuilding` 48 · `periodicOffer` 41 · `foundingRider` 25 ·
`yieldConversion` 24 · `upkeepSurcharge` 24 · `conditionRule` 2 ·
`rateConversion` 1. `mirrorYield`, `projectRider`, `periodicMuster`, `unitStamp`,
the `freshwater` and verb rules and `metaRule` are asked **nothing** on these boards —
their rows are on cards no seat holds inside seventy-five turns, which is why
they are pinned by fixture and by nothing else.

### One measured mistake, kept as the reason for the code

The first `cityStat` arm multiplied by the town count, on the audit's own finding
6 reasoning. It is wrong here and the acceptance caught it inside a minute: a
`cityStat` on a **building** is that town's own wall, and `explainBuildingRow`
prices the identical field at ×1 — so the same wall read two prices depending on
whether it was written as a top-level field or as an `effects` entry, and the
bead-race takeover test flipped a town off the great work. The arm reads ×1 now
and says why; a card's defence in every town is under-read by the town count, and
that is the price of the two readings agreeing.

### Known gaps, written down rather than fixed

- **The arena's prophet.** See the slow tier below: the two-hundred-turn arena
  stops founding a religion, no single arm is responsible, and every partial
  revert restores it.
- **A `UnitFilter` is never evaluated.** `purchaseRider`'s class and the
  surcharge's are read as "every piece", so a discount on religious units prices
  as a discount on everything. Evaluating one wants the roster asked per row.
- **A `CityScope` is never evaluated**, anywhere in this file — `cityStat`,
  `meterRule`, `yieldConversion` and `mirrorYield` all count the realm. Same
  bargain `foldCity`' arm has always struck.
- **`conditionRule` is a board reading, not a hypothetical.** A war card at peace
  prices at nought and no option value is folded, which is exactly the gap batch
  6 wrote down for the draft plan, said one shape over.
- **`upkeepRebate` still reads `score.nominalCount`** while the surcharge beside
  it reads the real piece count. The rebate's arm predates this batch and moving
  it would move boards for no listed reason; the asymmetry is in the source.
- **The margin costs a fifth empire sweep.** `deckReading` was four and is five
  (`explainEmpireCardYields` re-reads the base rates internally). Only the
  fold-read engine rows ask, and every answer is remembered for the sitting
  (`MARGIN_MEMO`), so nothing measurable moved.

### The slow tier

- `aiDecision.slow.test.ts` — the coverage set is **red on this tree and it is
  not this batch's**: seed 1's hundred turns now reach `deal` and not `disband`,
  where the file expects the reverse. Verified the way F2 verified the same claim
  — the same test run with H2's arms switched off reads the identical eight kinds
  (`build,deal,draft,endTurn,focus,purchase,research,unitOrder`), so the swap is
  somewhere else in the shared tree. **Not re-aimed**: the coverage list moves
  deliberately or not at all, and this batch is not what moved it. The other six
  claims in the file are green.

- **`aiBot.slow.test.ts` — thirteen of fifteen green, and two red that ARE this
  batch's.** Both are the same fact said twice, on the two-hundred-turn arena
  (seed 20260831): the seat stops buying a **prophet**, so
  `state.religions.length` is 0 and `faith` leaves the set of banks the game
  spends out of. Measured off/on in one process on one tree:

  ```
  OFF  religions=1  banks=[faith,gold]  rites=106  pantheon=3/4  purchases=195
  ON   religions=0  banks=[gold]        rites=58   pantheon=4/3  purchases=140
  ```

  Both seats still reach a pantheon of three or four beliefs either way — the
  appetite works; what does not happen is the founding. **It is not attributable
  to one arm, and the bisect says why**: with the *first thirteen* arms reverted
  the religion is founded, and with the *last thirteen* reverted it is founded,
  and with the first seven or the middle six reverted it is founded. Every
  perturbation of this size restores it, which is the signature of a knife-edge
  rather than of a mispriced shape: the prophet's purchase sits close enough to
  the hold row on this seed that re-pricing a hundred and sixty-odd effect rows
  in either direction moves it across. It is left red and written down here rather
  than tuned away, because the honest reading is either *the claim wants a band
  and a wider sweep* (it asserts a single seed's founding, and the augur — the
  other half of its `banks` claim — was retired out from under it the same day)
  or *the faith book wants the attention batch 1 deferred*: a rite's worth and a
  contribution priced by the book are both still open, and neither is H2's fence.

## Batch H12 as shipped — the faith book (2026-09-07)

The ruling (`docs/flags.md`, item bb): *"the bot's faith book learns the new
faith — the ladder that spends at the deal, the prophet's worth, rites valued,
the apostle and the relic, and the free first reroll."* What it replaced was one
constant and one silence: a prophet was worth `religion.prophetTechValue`
whatever it was about to do, an apostle was worth the faith it cost, and a rite
the bank could not pay that afternoon was not in the book at all.

### What the book prices now, and the arithmetic

**A prophet is the best act it has in it.** A prophet is spent *whole* on one act
(`spendProphet`), so its worth is the maximum of its acts and never their sum —
`prophetTerms` builds the list and prints the winner:

| act | the reading |
|---|---|
| found the faith | `explainFounding`, below |
| deepen one already founded | the best row of the bag `nextBeliefPool` says it would draw from, through `explainEffects` |
| a rite over every town | `explainEmpireRite` — one town's blessing, times the towns |

**`explainFounding` is four lines and no constants of the bot's own:**

- **the stones** — `improvementYield(workForFamily('prophet'))` at this empire's
  own prices, so the holy site's +2🕯 +1🎵 is read off the improvement table
  rather than spelled here;
- **the rungs the founding deals** — `plantHolySiteAt` deals one belief hand and
  owes a second, both out of the follower bag, so it is the **best two** rows of
  `poolBeliefs('follower')` priced by `explainEffects` (best two rather than
  twice the best: two hands cannot deal one belief twice);
- **the founder's trickle** — `RELIGION.founderTrickle` is a pair of ordinary
  `countScaled` rows, and they are read as ordinary rows through H12's one
  addition to `value.ts`, `explainForecastCount`: the same cap, `per` and
  `scorePayout` arithmetic `explainCounted` uses, with the board's count replaced
  by a forecast the caller has to name. The board's own count is **nought** for an
  empire with no faith, which is exactly why the row a prophet is bought *for*
  priced at nothing before;
- **the tide's reach** supplies that count — the foreign towns inside
  `rules.religion.siteRange` of one of this empire's own, through **this seat's
  own fog** (`isExploredBy`, H2's rule for a reading of a world the bot may not
  have seen), times the one new knob, `religion.tideShare`.

Two things it deliberately does not count, both to avoid paying twice: the
empire's own towns converting (a follower belief's city clauses are already
priced in every town by `explainEffects`' standing bargain) and the later rungs
of the ladder the founding opens (each of those wants a prophet of its own, and
that prophet is the row being priced, one purchase later).

**The appetite is the founding's floor, not its price.**
`religion.prophetTechValue` is what the sheet *says* a first faith is worth, and
it is the same number the beeline leans on to open the door at all (`unitTerm`,
`chain.ts`). The board's reading of a founding is a rate of a dozen or two points
a turn against six hundred. Adding them would pay twice for one religion;
replacing the appetite with the reading would withdraw the design addendum the
knob *is*, and the zealot's sheet with it. So the reading stands where it beats
the appetite, the appetite stands where it does not, and the difference is
**printed** so a reader of the feed can see which one is talking.

**An apostle is the relic it would leave.** A relic is a `placed` building, so it
is priced exactly as a bought shelf is — the town's own yields asked
hypothetically through `foldCity`, staged and percentaged — in the first town of
the realm that has topped out a cathedral and holds no relic yet. Its other two
charges (`proclaim`, `healAdjacent`) stay stand-ins **and say so on the row**: a
proclamation is a lump on a tide this bot has no reading of, and a healing is hit
points, which is a fraction of a piece. The piece also has an arm for the first
time (`apostleCommand`): leave the relic, else walk to a town that would keep one,
else stand quiet — it used to fall through `isPlainBuilder` into the *worker's*
brain and stand in a field it could never dig.

**A rite is ten turns of its blessing, priced for one town.** The pricing itself
predates this batch; two things about it were wrong.

- **A rite the bank cannot yet pay is still a want.** `riteError` asks about the
  bank *last*, exactly as `purchaseError` does, so `ritePlan` — which dropped
  every refused row — was dropping every rite the empire was two turns of faith
  away from. The measured consequence on the arena's own board: a seat at
  **+23🕯 a turn** with a full pantheon and no prophet tech had **no faith want at
  all**, priced its bank at the band's floor (1.50 against a 9–12 ceiling) and
  banked a currency it had told itself was worthless. `riteOutOfReach` is
  `outOfReachFor`'s twin — the simulation's money sentence said back to it — and a
  short row now carries no command, rides the book, and raises a saving row.
- **A rite is one town's blessing, and the evaluator prices a city clause in
  every town.** `townScoped(ctx)` is the correction: the same opinion of the same
  board with `ValueContext.cities` set to one, taken **once per plan** (the memos
  in `value.ts` are keyed on the context object, so a fresh one per row would
  price the empire's books five times a town). Left alone the arithmetic ran away
  — Omen Reading (a science line per shelf, `where: 'city'`) read at 861 points of
  blessing on an eight-town board, outranking a prophet two to one. The residual
  gap is written down in the source: a city-scoped **count** is still summed over
  the realm's towns (`realizedCount`), so a row that counts shelves counts the
  realm's; closing it means a town-scoped count in `value.ts`, which is a change
  to that file's contract rather than a reading `wants.ts` may take.

**The ladder spends at the deal** (ruling i, schema 80), so the faith it is about
to take is not faith anything else may save toward. `ladderClaim` reads the next
rung's price off the ladder plan's own row — nought while a hand is pending,
because that hand's rung was paid when it was dealt — and the saving rows are
built against `bank − claim`. An empire one rung short of a consecration was
forecasting a bank the `religion` phase had already spoken for.

**The free redeal.** The pantheon's hand asks nothing the first time
(`explainBeliefRerollCost`), so `beliefDecision` sends back a hand whose best god
scores below the **mean of the bag it was dealt from** — the simplest honest bar:
a fresh hand is several draws out of that bag, so what it deals is at least the
mean, and taking a free redeal below the mean is a comparison the bot cannot lose
on average. No knob: a free redeal of a below-average hand is not a matter of
taste. It fires at most once per hand by construction (`settleReroll` raises
`BeliefOffer.rerolls`; the second asking costs faith and the arm only asks while
the asking is free), which is what keeps the driver's loop finite.

**The augur's remains, swept.** `turnsToFirstGod` hunted the roster for the
cheapest row marked `consecrates` and priced it through `explainPurchaseCost`; no
row consecrates since C2, so it answered *"no god in sight"* on every board in the
game and quietly priced every godless empire's prophet at nothing. It reads the
ladder now (`nextFaithRungCost` over the faith rate), which is the only way to a
first god. The `firstGod` clause of `faithRowTerms` went with it — its appetite
has lived on `ladderPlan`'s rung since schema 74. `augurCommand` stays: a save may
hold one, and a piece with no arm is a piece the bot stares at every turn.

### The knob added

`religion.tideShare` (0.5) — what share of the foreign towns inside a holy site's
reach this bot expects actually to follow it. The founder's trickle pays per
*following* foreign city and nothing on a board with no religion can say how many
of the neighbours would convert; what the bot can count is the reach, and this is
the share of it the trickle is priced on. Zero withdraws the trickle from a
prophet's price (the stones and the rungs still stand); one is an empire that
expects to convert the world. It appears on `arena.html` with no page edit, like
every other leaf of the sheet.

### The arena reading, before and after

The claim is `test/sim/aiBot.slow.test.ts`, *"both empires reach a pantheon, and
somebody founds a faith"*, and the reading is the `[arena]` line the orchestrator
printed when the founding was un-pinned (f242f75).

```
before  [arena] religions founded by t200: 1 · Crimson 3 gods, 128🕯 · Teal 4 gods, 133🕯
after   [arena] religions founded by t200: 2 · Crimson 3 gods, 192🕯 · Teal 4 gods, 303🕯
```

**One founding became two, and both seats founded.** The claim is therefore back
to a pin — `expect(religions.length).toBeGreaterThan(0)` — with the `[arena]` line
kept beside it, because a printed reading is what the next pass measures against
and a pin says only that the number is not nought.

**The tree moved between the two readings** and the report says so rather than
claiming the whole difference: H11's cost scale (every hammer price ×5 in Æra I)
landed between them. It is a large move on the same board and it cuts the other
way — measured on a 140-turn probe of the arena's own map with the new prices,
**neither seat reaches The High Temple inside 140 turns**, where the pre-H11 board
had one there by t101 and a religion founded at t106. The door opens later and the
book walks through it twice.

Which leaves one finding for the user, measured and not acted on: **the appetite
is diluted by the tree's new beaker prices.** `bestTechGoal` scores a node at
*what it gives over the beakers of its whole closure*, and `religion.prophetTechValue`
(600) was set when an Æra II closure cost a third of what it costs after batch D's
science cut and the re-aim. On the probe board The High Temple sits four nodes out
from t61 — inside `research.goalHorizon`, weighed every turn, and beaten by
Shipwrights and The Cataphract every time until well past t140. Raising the
appetite is a one-line tuning change and it is deliberately **not** made here: the
user has ruled that the arena is not a tuning harness, and this batch spent its
two runs on one reading each side.

### The tests

- `aiWants.test.ts`, new block **the faith book** — seven claims: the prophet's
  founding names the stones and the two rungs (and the stones' voices are the
  improvement row's own); the appetite is a printed floor and never a second
  payment; a founded empire's prophet is priced by the rung it would draw; a rite
  the bank cannot pay stays in the book, carries no command and raises a hold row;
  the ladder's claim moves the hold row's wait by exactly the next rung; the
  apostle is priced by its relic; the free redeal is taken below the bag's mean,
  not above it, and never once the asking costs faith.
- `aiWants.test.ts`, **the reroll pin re-aimed**. It asserted that no file in
  `src/ai` names `'rerollOffer'` at all. That was honest while every reroll cost
  faith; it now asserts the paid half — `bot.ts` is the only file that asks, and
  the arm is gated on `nextBeliefRerollCost(...) > 0` returning nothing.
- `aiWants.test.ts`, **the focus arm re-seeded** (20260905 → 20260903), which is
  not this batch's claim at all: H11's cost scale moved the board out from under
  the seed a second time and 20260905 now raises no focus order inside fifty-two
  turns. Verified by running the same test at HEAD with H12's files copied in and
  H11's held out — it passes there, so the batch that moved it is named in the
  comment.

## Batch D1 as shipped — the counter (2026-09-08)

The audience (`docs/war-diplomacy.md` §12) gave the bot two arms asked about
**one** paper — `answerProposal` and `answerPeaceOffer`, the split halves of
`answerProposals` and `peaceDecision` — and one new reading, `counterTerms`.

### The counter's reading

One relation, solved either way round: the bot signs when **what arrives ≥ what
leaves × (1 + `war.counterMarkup`) + the bar**.

- *what arrives* / *what leaves* are `explainPaper` from the bot's side, which
  is the same reading that answers an ordinary bargain — coin at face, tribute
  at the seat's own rate (`luxuryGoldBaseline` ÷ `luxuryGptBaseline`), a seam at
  the baseline if the receiver lacks the kind, a town at `weights.city`, and,
  new this batch, a right of way at `war.openBordersPrice`.
- *the bar* is `owedForPeace` — `max(0, −warscore) × war.goldPerScorePoint` —
  which is `peaceDecision`'s own arithmetic, factored out rather than restated,
  so a paper the counter writes is a paper the answering arm signs. Outside a
  war the bar is nought.
- *the markup* is the margin that makes a counter a paper the seat will actually
  sign rather than one it merely tolerates: without it a coin of drift between
  the counter and the signing turns it down.

**Which question is asked is the paper, not a flag.** Terms that ask for
something are *"what would make this work?"* and the counter fills the **asker's**
side; terms that ask for nothing are *"what would you give for this?"* and it
fills the **bot's** side. The two buttons put two genuinely different papers on
the table, so a function told which button was pressed could be told the wrong
one.

The filling order is the ruling's, and every step is capped by what
`dealSideError` allows rather than by a rule invented in `src/ai`: coin (capped
by the treasury) → coin a turn (capped by what that empire's books *earn*,
`foldEmpireRates().goldPerTurn`) → a town, on a peace paper only, the asker's
nearest the bot's own ground; and on the bot's own side a duplicate seam the
asker lacks, never a last copy (`asksOurLastCopy`'s hard clause, read from the
other side of the table).

The tribute's cap is the one figure that is a judgement rather than a rule: an
uncapped tribute closes every gap, which would make the town clause unreachable,
and `explainEmpireGold` is the wrong books to cap it with — that ledger is
connections against maintenance, and a rich empire reads nought on it.

### The knobs added

- `war.openBordersPrice` **60** — a right of way was priced at nought, which was
  honest while nothing could ask for one. A term worth nothing is a term a
  counter can neither ask for nor sell.
- `war.counterMarkup` **0.1** — a tenth over even, both ways.

Neither has been tuned against a game: both are authored figures, like
`luxuryGoldBaseline` beside them.

### Known gaps, written down rather than fixed

- A counter never offers **a town of the bot's own** and never asks for one
  outside a peace: the rules allow the first and the ruling's order does not
  name it.
- `counterTerms` opens a fresh `ValueContext` per question (so does
  `answerAudience`). A sitting is a *turn*, and an audience is not one — but a
  player pressing the two counter buttons repeatedly prices the empire's books
  once per press.

## The campaign (W1, 2026-09-08) — a war declared with a force, and fought

The user, looking at a game: *"right now the two of the ai have declared war on
me, and they're just being annoying. Not sending army to attack me but parking
units near my lands, a worker in my lands standing on a tile i want to improve."*
The rulings are `docs/war-diplomacy.md` §13; this is what was built and what it
cost.

### The diagnosis, and the two things underneath it nobody had noticed

Three of the four faults were where §13 said they were. The declaration bar was
an army **ratio** alone, so one warrior against five read as a ratio of five and a
peaceful empire declared on a neighbour it had no army to reach. The march was
gated on `military.aggression > 0`, which only the warmonger has, so the
declaration policy and the prosecution policy disagreed with each other. A worker
had no war arm at all.

The two that were not in the diagnosis are the reason the batch is bigger than
its rulings:

- **`warMarch` could never march on a town.** `canTransit` refuses a hex holding
  somebody else's city outright — a town is taken by capture, never by a step —
  so `findPath(state, unit, townTile)` answers `null` for *every* enemy town on
  every board. The arm that was supposed to push at walls could only ever walk at
  a rival's column. Everything that asks "can we get there" now asks about the
  **ring** (`approachHexes`).
- **A soldier that stood down never asked for orders again.** `breakFortify`
  has three callers — a position change, a blow, a capture — and
  `unitAwaitsOrders` answers *false* for anything carrying `fortifiedTurns`; this
  bot only ever hears about a piece through `firstBlocker`. So every `standDown`
  in `bot.ts` was permanent. *Parking units near my lands* was, in large part,
  literally that: stacks that dug in once and were never asked a second question.

### What was built

- **The declaration needs a force and a road** (`explainDeclaration`,
  `src/ai/diplomacy.ts`, split out of `declareDecision` so a refused target's
  reason is readable when nothing is declared). Two clauses after the ratio and
  the reach: `war.strikeForce` combat pieces **beyond** the garrisons every town
  is owed, one of which shoots or lays siege; and one of those pieces with a
  `findPath` to a hex beside the target town. The road is probed **best-first and
  last**, because this arm is re-asked on every command a seat sends and it is the
  only expensive question in it. The persona bars are untouched.
- **The war is the permission** (`soldierCommand`). The `aggression > 0` gate on
  the march is gone; a seat at war campaigns unless the warscore reads under
  `war.sueFloor` for that enemy, in which case its soldiers hold their towns
  through the arms that were already there and `peaceDecision` sues. The appetite
  now loosens `favourableBlow`'s exchange and **nothing else**, and the docblock
  says so.
- **One target and a muster per enemy** (`src/ai/campaign.ts`, a fourth leaf —
  the readings are wanted by both the declaration and the march, and
  `diplomacy.ts` may not import `bot.ts`). `campaignTarget` is the enemy town
  nearest *this empire's towns* rather than nearest a piece, which is what lets
  eleven soldiers agree on where they are going without anybody remembering
  anything. `musterHex` is the last hex on the road from the nearest own town that
  is still `war.musterDistance` from the walls — written as a distance rather than
  as an index from the end, so a road allowed to finish two hexes out and one
  allowed to finish beside the walls name the same muster. `campaignMarch`
  replaces `warMarch`: gather until `war.strikeForce` stand at the muster, then
  push — melee to the ring, a shooter to its own range — and every candidate
  carries the campaign's sentence.
- **The siege exchange** (`favourableBlow`'s new `siege` argument). While the
  force is pushing, a blow on the target town or on a defender beside it clears
  `war.siegeExchange` instead of the seat's temperament. Scoped to those hexes,
  so the same swordsman still wants a favourable exchange in the field.
- **Civilians at war flee** (`civilianDanger` + `civilianFlight`). One reading,
  two callers: the worker asks it before its improvement plan is even built, and
  the settler's own danger clause is now the same function. Standing in the fields
  of an empire this seat is at war with is unconditional; the hostile-nearby
  clause keeps the settler's escort reading exactly as it was.
- **The war economy** (`sightedArmyWanted`). A seat at war wants
  `war.strikeForce` soldiers over the garrisons the levy already asks for. One
  figure for all three readings rather than a `campaignArmy` of its own,
  deliberately: what it takes to start a war, what it takes to press one and what
  the levy builds for one must not be tunable into disagreeing.

### The two repairs the campaign could not live without

- **The campaign wakes its own army** (`wakeTheCampaign`, in `housekeeping`
  beside the sleeping settler's arm). A seat at war walks its own dug-in pieces
  and asks each whether the board has moved. **The only answer it will take is a
  march or a blow**, which is what makes the arm monotone rather than a loop:
  both break the trench by construction, so it cannot answer twice about the same
  piece. Without it, a piece that arrived at the muster dug in and the force never
  reached the strike force it was waiting for.
- **No two pieces are sent to the same hex** (`marchClaims`, `marchIsStalled`).
  The stacking cap is one, and a `moveUnit` handed to a piece with no movement
  left is accepted and *stored*; so an army ordered one piece at a time in one
  turn hands three soldiers the same destination, and two of them are left holding
  a march that can never finish — invisible for ever, because a stored path also
  reads as *busy*. Measured on the flat bench (seed 20260907, t10): eleven
  soldiers, ten of them holding a stored path to the single hex (13,8), frozen
  there while the target's walls stood at full height. A destination somebody is
  already walking to is now claimed (a pure reading of `Unit.path`), and the wake
  arm calls back a piece whose march the rules will never let it finish.

### The knobs

`war.strikeForce` (4) · `war.musterDistance` (3) · `war.musterRadius` (2) ·
`war.siegeExchange` (0.7), all in `data/ai.json` under `war` with docblocks in
`aiConfig.ts`. They appear on `arena.html` with no page edit, like every other
leaf of the sheet.

### Measured

The slow tier's new **siege arena** — a balanced seat, a flat board, two placed
towns, eleven soldiers put in the field and a war opened, driven forty turns:

```
[siege] Aldermarch · arrived t5 · closest 1 hexes · up to 9 pieces within 2 of the walls
[siege] walls: 100 at the start, low of 21 at t6
```

Before this batch the same board produced no arrival and no damage at all: a
balanced seat's soldiers never left home, and a warmonger's could not path at a
town. The assertion is damage rather than capture — see the test's docblock for
why — and the bench is arranged rather than played, so it makes no replay claim.

### Known gaps, written down rather than fixed

- **The town stops falling at a fifth of its walls** on the siege bench. Two
  crudities meet there: the ranged deferral (2026-09-04) holds a melee blow for a
  bowman that then shoots something else, and `cityBeatenDown` stops a beaten town
  healing but nothing makes the stack finish it. A capture needs walls, garrison
  and a melee piece with movement on one turn, and no arm sequences that.
- **A declaration is now a conjunction, and on a generated duel map the four
  clauses rarely coincide.** Measured on the war arena's own board (seed
  20260903, 170 turns): the warmonger holds a strike force on **70 of 170
  turns** and still never declares, because the ratio with its appetite, a town
  of theirs inside the reach, the force and a road have to hold in the *same*
  turn. That arena's declaration claim was therefore reworked into the rule it
  now tests — no declaration on a turn when the force is short — and the
  positive half of the loop (declare, fight, sue, sign, truce) moved to a flat
  bench where all four do coincide, which it runs in a second rather than in
  four minutes. Whether `strikeForce` 4 is the right number for a duel board is
  a tuning question this batch did not spend a run on.
- **The muster is one hex for a whole army.** Eleven pieces converging on a
  radius-2 disc is a traffic problem the claim reading only softens; a real
  operational plan would give the force a frontage rather than a point.
- **Nothing sequences a capture.** The push takes walls down; taking the town is
  still whatever `favourableBlow` happens to do next.

---

## Batch X2 as shipped — the scope, evaluated (2026-09-08)

`docs/audit/bot-pass-2.md`'s largest single finding, and the one it called
bounded: **222 of 731 effect-shaped rows in the data carry a `scope`, an `on`, a
`within`, an `origin` or a `destination` — 30% — and `value.ts` evaluated none of
them.** Every scoped clause was priced `× ctx.cities`, so a coastal line was
worth as much to a landlocked realm as to a maritime one, the Bank's
`routeEndsHere` was paid in every town whether a caravan came to it or not, and
every `where: 'hex'` line was priced at a flat three hexes (`score.nominalTiles`)
whatever the ground under it was.

### The two readings, and the memo that pays for them

**`townsAdmitting(ctx, scope)`** — how many of this empire's towns a `CityScope`
admits, asked of `cityScopeAdmits` over `citiesOf`: the very predicate the
evaluator pays the clause by, with this seat as the `viewerId` so the religion
scopes (`follows`) answer from the right chair. Nothing in the bot reimplements a
test, and a scope added to `CityScope` tomorrow is answered here the day it is
answered there. A `capital` scope reads one — because the evaluator says so, not
because the bot knows what a capital is.

**`workedHexesAdmitting(ctx, effect)`** — the harder half. A hex clause is paid by
`foldCity` on the tiles a citizen is **sitting on**, so the count is the empire's
worked hexes the `on` condition admits, inside the towns the `scope` admits.
Worked and deliberately not owned: ground inside the borders that nobody works
pays nobody anything, and an owned-hex count would tell the bot that a
one-citizen town on thirty tiles of desert is being paid thirty times over. It
under-reads a town about to grow, which is the right direction for a rate the bot
is deciding to *buy*, and the growth is priced by the growth channel rather than
twice here.

Both are memoised on `SCOPE_MEMO`, `MARGIN_MEMO`'s bargain exactly: a `WeakMap`
keyed on the `ValueContext` — one seat's book for one decision — and inside it a
`Map` keyed on **the scope object itself**, because a `CityScope` in a data row is
parsed once at load and every appraisal of that row hands back the same object.
The hex half keys on the *effect*, since that count is a function of the pair
(`on`, `scope`) and the row is the one object naming both. It has to be a memo
rather than a plain walk: `frontier` sweeps the map and `holding` asks
`openedResource` — the walk that is 17.4% of the bot's runtime — and a draft plan
appraises the same pool a dozen times in one sitting.

**Two stated cuts**, both in the source with the reason beside them:

- **The wonder idiom.** 21 of the 26 `hasBuilding` scopes on building rows name
  **their own row** — how every wonder says *"in the town that raises me"*. Read
  literally, no town admits one on the turn the bot is deciding whether to build
  it, and Petra's desert would price at nothing for ever. So a `hasBuilding`
  scope no town admits reads **one town** — the town that would raise it — and
  never `× cities`. It is the one scope in the union that is a *plan* rather than
  a fact about the board: a coast cannot be built and a granary can.
- **The condition that reads the fold.** `on: { test: 'yields' }` — the Rite of
  the Harvest's *"every hex that feeds it"* — answers no unless the caller hands
  in what the hex already pays. Counting it without one would price four live
  rows at nought, a worse lie than the flat three they had. So the thunk is
  handed in and it is the town's own reading (`cityContext` + `foldTile`, the
  pair `explainCity` folds a worked hex through), built once per town and **only**
  for the rows `tileConditionReadsFold` says are asking.

### The arms changed

| Arm | Was | Is |
|---|---|---|
| `scorePays` flat `where: 'city'` | `× ctx.cities` | `× townsAdmitting(scope)` |
| `scorePays` flat `where: 'capital'` | paid once, scope unread | `× capitalAdmits(scope)` — one town, or none |
| `scorePays` flat `where: 'hex'` | `× score.nominalTiles` (3) | `× workedHexesAdmitting` |
| `scorePays` `basis: 'share'` | the whole empire rate | `× scopeShare` — the conversion is floored per town, so two towns of five convert two fifths |
| `scorePays` `basis: 'mirror'` | every town's shelves | the sweep skips a town the scope refuses (exact — it has a town in hand) |
| `scorePayout` (the `count` and `rate` payout) | `where: 'city' ? cities : 1` | `townsAdmitting` / `capitalAdmits` |
| `percentYields` | `× ctx.cities` | `× townsAdmitting(scope)` — 36 scoped rows, the Bank among them |
| `productionBonus` | `× ctx.cities` | `× townsAdmitting(scope)` — 8 scoped rows |
| `happiness` (`per: 'city'`) | `× ctx.cities` | `× townsAdmitting(scope)` — 17 scoped rows |
| `cityStat` | one town's wall, scope unread | one town's wall, **nought when no town admits** (the size stays, so this arm and `explainBuildingRow`'s field arm still agree) |
| `unitStat` · `cardYieldAmplifier` | scope unread | the same nought-gate |
| `buildingYieldPercent` | every town's shelves | the sweep skips a town the scope refuses |
| `cityRenownPercent` | the mean over **every** town | the mean over the towns the scope admits — nought when none do |
| `scoreRulePercent` | the whole empire rate | `× scopeShare` — 3 scoped rows; every reading under it is an empire-wide rate |
| `scoreMeterRule`'s `capturedCityCost` · `coastalCityCost` · `hillCityCost` | `× ctx.cities`, the kind assumed | `× townsAdmitting` of `captured` · `coastal` · `onHills` — the three kinds the union already tests |
| `productionOf` (the hammer premium) | `× cities` · `× nominalTiles` | the same counts, so the premium and the arm beside it cannot disagree about the ground |
| `amplifiedLines` | `× cities` · `× nominalTiles` | the same counts, so an amplifier and the card it amplifies agree about the deck |
| `explainEffects`' label | the bare kind | the kind plus *"in 2 of 5 towns"* / *"on 14 worked hexes"* |

**Left alone, and why.** `authority` and `rule: 'borders'` carry no `scope` field
at all — the shapes never took one. The route's `origin` and `destination` narrow
which *caravans* carry a line, and what a caravan pays is `routes.ts`' fold
rather than this file's count (the audit's own matrix already prices the route
scopes at "none").

### Acceptance — the benches

In `test/sim/aiAppraisal.test.ts`, "the scope, evaluated (batch X2)". Each is
**one board arranged twice**, because a single reading proves nothing about a
predicate: what has to hold is that the number moves with the board. Neither of
the two data rows the audit named is typed into the test — Petra's site and the
Bank's clause are read out of `data/buildings.json` through `buildingDef`.

| Bench | Reading |
|---|---|
| a coastal clause in a landlocked realm of four towns | **0** towns, and the clause scores **exactly 0** — not a quarter, not a nominal. One hex of water beside one town → **1**, and the unscoped twin still reads all four |
| Petra's `terrainBeside` | **0** with grassland beside the centre, **1** with one desert hex — the wonder's own `requiresSite`, read off the row |
| the Bank's `routeEndsHere` in a realm of three | **0** while no caravan runs, and the clause scores 0; a live `Unit.trade` ending at one town → **1** |
| a hex clause | counts every worked hex of every town; `on: hasResource` on grassland reads **0**, where it used to read 3 |
| the memo | two askings in one sitting are one walk; a fresh sitting after the board moves re-reads it |
| the wonder idiom | `hasBuilding: petra` reads 1 in a realm holding none; `hasBuilding: granary` reads 3 in a realm of three that hold one |
| an unscoped clause | byte-identical with the door shut — the batch narrows what a scope says and moves nothing that says nothing |
| the label | `in 0 of 4 towns` · `on 0 worked hexes` |

### Off and on — six boards, both halves knocked out

Duel, two balanced seats, wild on, 150 turns, driven a decision at a time through
`createBotStepper`; `scopeDoor` is a source-level switch with **two halves**
(`towns` and `hexes`), each falling back to exactly the figure the arm used
before this batch. Not a knob: it is not in `data/ai.json`, no persona reads it,
the arena cannot see it, and both halves ship open.

| seed | shut → open | towns-half alone | hexes-half alone | first divergence |
|---|---|---|---|---|
| 20260903 | **moved** | MOVES | MOVES | #33 `draft` — `chooseOrder` 1 → `skipOrderOffer` |
| 4242 | **moved** | MOVES | MOVES | #219 `draft` — `chooseOrder` 2 → `skipOrderOffer` |
| 1 | **moved** | MOVES | MOVES | #162 `draft` — `chooseDoctrine` 0 → 2 |
| 5 | **moved** | MOVES | MOVES | #152 `draft` — `chooseOrder` 1 → `skipOrderOffer` |
| 11 | **moved** | MOVES | MOVES | #27 `draft` — `chooseOrder` 1 → 0 |
| 777 | **moved** | MOVES | MOVES | #166 `build` — Great Lighthouse → a scout |

**All six moved, both halves move all six on their own, and five of the six first
diverge on a Statecraft draft** — H2's shape exactly, and for H2's reason: the
draft is the one arm that appraises *whole cards*, so a re-priced clause shows up
there first and everywhere else downstream. Three of the six now **pass** an offer
they used to take, which is the finding said as a decision: the hand the seat used
to take was a hand of scoped clauses it was pricing in every town.

The sixth is a build, and it is the most legible line in the table: with the door
shut the seat put the **Great Lighthouse** at the front of a queue, and with it
open it built a scout instead. The Lighthouse pays on coastal hexes.

### Cost — measured on one identical board

A whole-game ms/turn comparison would measure two different games (the
trajectories diverge by design), so the clock was taken the honest way: one board
played to a fixed turn, then `nextBotDecision` asked of **that same state** in
alternating blocks with the door open and shut, ten pairs of decisions a block,
eight blocks each way.

| board | door open | door shut |
|---|---|---|
| t75, 6 towns | min **143.65** · median 148.65 | min 142.29 · median 145.50 |
| t150, 8 towns | min **214.65** · median 272.60 | min 208.75 · median 264.63 |

**Under 3% on the minimum and inside the run-to-run spread on the median** — the
memo is the same bargain F2 struck, and the walks behind it are asked once per
sitting per row. For the record, the whole-game figures on seed 20260903 (two
different games, so a trajectory reading and not a clock): **81.0 ms/turn shut,
65.3 ms/turn open**.

### Pins re-aimed

Two, both fixtures rather than claims, and both re-aimed with the reason in the
test's own comment.

- **`aiAppraisal.test.ts`, "holds the plan against a challenger inside the
  margin"** — the held set came back from two technologies to **one**. The claim
  needs a near-tie at the top of the research table with a clear third behind it;
  evaluating a clause's scope took the Currency chain's scope-blind windfall out
  of the table, so Currency no longer runs away and no longer needs holding. The
  near-tie is now Bronze Panoply against Bronzeworking (inside the margin, which
  keeps the plan) with Divination a step behind (outside, which does not). The
  set has moved with the balance before: four over two passes, two on P1, one now.
- **`aiWants.test.ts`, "prices a rite as a want of its own"** — reads the **best**
  rite of the book rather than the first of it. That bench's ground is hills to
  the horizon and a hill feeds nobody, so the Rite of the Harvest — *"every hex
  this city works that feeds it"* — lands on no hex at all there and is correctly
  worth nought. That is the batch working rather than failing; the claim is about
  the *shape* of a rite want, so it is asked of the rite this board actually pays.

`aiDecision.slow.test.ts` is byte-identical to itself (the stepper and the driver
still reach the same board and the same log), and every score in every decision
is still the fold of its own terms.

### Known gaps, written down rather than fixed

- **A route's `origin`/`destination` is still unevaluated.** Both narrow which
  caravans carry a line, and what a caravan pays is `routes.ts`' fold; pricing
  them here would be a second reading of a road. Named in `scorePays`' docblock.
- **A `hasBuilding` scope inside an `all`/`any` composite gets the wonder floor
  through the whole composite**, because `scopePromisesABuilding` recurses. A
  composite of *coast and a granary* therefore reads one town in a landlocked
  realm rather than none. Twenty-three composites live in the data and none is
  that shape today.
- **The centre hex is not counted.** `workedHexesAdmitting` walks
  `city.workedTiles`, and a town's own centre is folded by `explainCentreYield`
  beside them. A hex clause landing on a centre is therefore under-read by one
  hex per town.
- **`cityStat`, `unitStat` and `cardYieldAmplifier` take a nought-gate rather
  than a count.** Multiplying them by the towns would put `scoreEffect` and
  `explainBuildingRow`'s field arm at odds about what a wall is worth, which is
  H2's own measured mistake. The sign is fixed here; the size is X5's question.
- **Seed 5 opens a much larger game** (17 towns and 5,192 commands against 11 and
  981), and at 584 ms/turn it is the slowest board in the sweep by five times.
  Nothing in this batch loops — the census is 3,836 `moveUnit` for a large army —
  but it is the audit's superlinear-in-towns finding standing on one board, and
  X6's bound is what would answer it.
- **`score.nominalTiles` is now read by the shut door and nothing else.** It was
  the flat "three hexes" stand-in and the ground is counted instead, so the knob
  no longer moves a shipped decision. It is **kept rather than retired**: it is
  the honest fallback the knockout falls back *to*, and retiring it is a change
  to `data/ai.json` and the arena's sheet that belongs in its own pass (H2's "two
  knobs retired" precedent). **No knob was added by this batch** — `scopeDoor` is
  a source-level switch, not tuning surface, so the arena panel is untouched.

---

## Batch X1 as shipped — the unit step pays for itself (2026-09-08)

`docs/audit/bot-pass-2.md`, finding 1 and change 1. The audit measured that a
unit step of `techChain` cost **`cost: 0`** hammers by construction while every
building step subtracted `buildingProductionCost × townsWanting` through
`explainLump` — and that `unitTerm` multiplied a soldier by
`threat.techMilitaryFactor` (3) whenever any hostile column stood near any town,
which the wild's standing fifty pieces make close to permanent. Batches P1 and S1
made the hammer and the beaker sides of that subtraction dearer and left the unit
side untouched, so a node whose gift was a spearman was a pure positive and a node
whose gift was a library was a positive minus a big number.

### The mechanism

- **The levy moved into a leaf.** `levyReading(ctx)` (`src/ai/campaign.ts`, with
  `sightedArmyWanted` and `atWarWithAnybody` moved whole beside it) answers
  *wanted · held · shortfall · standing · note* — the three sentences
  `unitRoleValue` has folded since batch 4, in the same words. `chain.ts` and
  `bot.ts` both read it, which is the point: the chain and the town now agree
  about how many spears an empire wants, so the beeline cannot aim at a soldier
  the town would decline to build. It lives in `campaign.ts` for the file's own
  stated reason — `chain.ts` is imported *by* `bot.ts`, so a reading kept there
  could not be asked by the chain without a cycle. `ValueContext` arrives as a
  type, so the leaf stays a leaf.
- **A unit step takes hammers.** `cost = unitProductionCost × levy.shortfall`,
  for a **field soldier** only (`isFieldSoldier`): a settler's hammers are the
  expansion chain's, a caravan's are the route's, a prophet is one charge.
- **`towns` stays 1, deliberately.** A node hands over an *option*, so it is one
  thing that still has to happen and `stepsRemaining` is unmoved — a shortfall
  counted as five raisings would dilute every building step's share by an army
  nobody has decided to raise. The hammers are the levy's; the raising is the
  option's. `stepUnitCost` is asked of building steps only, and now says so.
- **The premium is charged against the shortfall.**
  `factor = ctx.threat > 0 ? max(1, threat.techMilitaryFactor × shortfall ÷ wanted) : 1`
  — the whole of the factor where none of the levy is standing, proportionally
  less as it fills, floored at one because a column at the gate may never make a
  node worth *less* than in peacetime. **A seat that wants no more soldiers gets
  no military premium.** No knob was added: the same `techMilitaryFactor`, read
  against the same levy the town reads.

### Before/after, on the audit's own bench

Two duel games, two balanced seats, wild on, seeds 20260903 and 4242, 150 turns,
driven a decision at a time through `createBotStepper` (a throwaway `zz*` probe,
deleted). The before column reproduces the audit's own figures exactly.

| | 20260903 before | 20260903 after | 4242 before | 4242 after |
|---|---|---|---|---|
| re-aims | 24 | 33 | 18 | 41 |
| nodes weighed | 412 | 934 | 312 | 862 |
| **scoring negative** | 254 (**61.7%**) | 730 (**78.2%**) | 201 (**64.4%**) | 624 (**72.4%**) |
| **military re-aims** | 15 (**62.5%**) | 18 (**40.0%**) | 12 (**66.7%**) | 18 (**43.9%**) |
| technologies at t150 | 13 · 19 (**32**) | 27 · 27 (**54**) | 14 · 22 (**36**) | 23 · 17 (**40**) |
| treasury at t150 | 315 · 404 | 198 · 153 | 666 · 392 | 384 · 352 |
| towns at t150 | 5 · 7 | 3 · 6 | 5 · 8 | 9 · 9 |

**Two of the four acceptance figures are met on both benches** — military re-aims
below 45% (63% → 40%, 67% → 44%) and technologies at t150 up (32 → 54, 36 → 40).
No seat went bankrupt on either board; every treasury is comfortably positive and
the thinnest reading, 153, is well over `solvency.arrearsTreasury`.

### The negative share, and why the target was unreachable from the unit side

The acceptance asked for negative-scoring nodes below half, and the share went
**up**. That is not the change failing; it is the metric measuring something the
unit step does not own, and the audit's own before-numbers say so once they are
split by kind:

| | 20260903 before | 4242 before |
|---|---|---|
| military nodes negative | 22/82 (27%) | 16/62 (26%) |
| **everything else negative** | **232/330 (70%)** | **185/250 (74%)** |

Even zeroing every military negative leaves 232/412 = **56%** and 185/312 =
**59%**, both above half, before a line of this batch was written. What makes a
node negative is the beaker-and-hammer debt of a road up to `research.goalHorizon`
nodes long, subtracted at `weights.production`/`weights.science` over
`score.lumpTurns` — the *building* side of the same subtraction, which is P1's
and S1's standard rather than the unit step's asymmetry.

The share also rises with an empire's own progress, which the same run shows
directly: on seed 20260903 the negative share ran 65% at t0–50, 73% at t50–100
and 94% at t100–150 — a seat holding 27 technologies is weighing what is left of
the tree, and what is left is Æra III and IV nodes with long roads. The batch
that took the same seat from 13 technologies to 27 therefore *raises* this number
by succeeding. **The honest reading is that the share of negative nodes is a
reading of the building side's price standard, not of the unit side, and it wants
its own measurement** — the ratio of a node's gifts to its debt at a fixed depth,
say — before anything is tuned against it.

### The one thing measured and rejected

`unitRoleValue`'s levy **surplus charge** (`− soldier × standing`) was folded into
`unitTerm` whole, as the audit's "the unit term folds no levy surplus charge"
suggests. Folded *beside* the interpolated premium it prices a soldier at nothing
the moment the levy is full, the beeline stops asking for military nodes almost
entirely (military re-aims 30% and 32%) and the boards get worse rather than
better: on seed 4242 a seat fell from eight towns to **two** while the wild walked
in, and on 20260903 both seats lost a town. The chain is deciding what a *node* is
worth, not what the next spear is worth, and the town's own arm is still the thing
that decides whether the spear gets built. Charging the shortfall once — in the
premium the town's arm does not have — is the half that plays better. Written down
here so the next pass does not re-derive it.

### The pins

`test/sim/aiAppraisal.test.ts` gains two cases in the tech-chain section: a unit
step's `cost` is `unitProductionCost × levy shortfall` with `towns` still 1 and
the chain's hammers naming it, falling by one piece's price for each soldier
raised; and a seat with a column beside its town but its levy full prints **no**
`×` premium term at all and owes no hammers, where the same board with no
soldiers prints both. The margin-boundary pin was re-aimed (Currency → The Wheel
as the second held node) — the near-tie it needs used to be Bronze Panoply against
Divination, and that was a tie only because a unit step cost nothing; a sweep of
every one- and two-node held set on the same bench found the three that still
produce one. `aiDecision.slow.test.ts` still replays byte-identical to itself.
