# The bot audit — an in-depth pass (2026-09-04)

The brief (user): "it seems like a lot of this logic feels sub-optimal / not
well thought out… I'm not sure why we have arbitrary thresholds like 'gold
spend above'… these systems are entangled weirdly, i pumped up the 'cities'
weight to 10000 and the bot made on average 1 more city than it used to. I
think we should massively simplify, verify these mechanisms/weights are
having the right effect and do a deep pass on how the bot is actually
behaving." And the direction: decision-making should FLOW from a priority
system — if a city is the highest-value thing, prioritize authority; if a
tech is, prioritize science.

Method: instrumented 75-turn games through the arena's own tuning seam
(seeds 5 and 777, two balanced seats, wild on), plus a line-by-line gate
inventory of `src/ai/`.

## Finding 1 — the cities-weight anomaly, explained and measured

`weights.city = 10000` moves the bot from 4–5 cities to 5. Opening the
GATES (weight untouched beyond that) is what moves it:

| Configuration | seed 5 | seed 777 |
|---|---|---|
| baseline | 5 cities | 4 |
| city=10000 | 5 | 5 |
| … + siteScoreMin=0 | 5 | 5 |
| … + settlerCap=20 | 5 | 5 |
| … + settlerCityPop=1 | 4 (3 settlers idle) | 4 |
| … + authorityFloor=−99 | 6 (4 idle) | 6 |
| … + ALL gates open | **8** | **8** |

The settler pipeline is SEVEN sequential filters, and value is asked at
only one of them: (1) `settlerCityPop` — the town must be pop 3;
(2) `settlerAuthorityFloor` — the meter must be ≥ 1; (3) `settlerCap`;
(4) the build score (the ONLY place `weights.city` speaks); (5) a legal
site within `siteSearchRadius` scoring ≥ `siteScoreMin` — priced by a
DIFFERENT weight table (`site.yieldWeights`); (6) the danger/escort
refusal (a settler will not walk without company); (7) the walk itself.
A 100× value signal survives to the board only if six value-blind gates
happen to be open. No single gate is the villain — the CONJUNCTION is.
The idle settlers under opened gates show the next layer: pieces built by
value, then refused by geometry.

## Finding 2 — the spending gates are policy wearing a constant

| Configuration | seed 5 | seed 777 |
|---|---|---|
| baseline (spendAbove 150 / reserve 100) | 4 buys, 7 buildings, 123💰 held | 4 / 6 / 244💰 |
| spendAbove=0, reserve=0 | **13 buys, 13 buildings** | 9 / 7 |
| spendAbove=400, reserve=300 | 2 buys, 3 buildings, 396💰 idle | 2 / 4 / 451💰 |

The knob IS the behavior. Nothing prices "is this purchase worth more than
holding the coin" — `goldPressure` exists and already answers exactly that
question, but the spend arm consults a threshold instead of the price.

## Finding 3 — five parallel valuation systems

The "one currency" is real inside the build/research arms, and then:

1. `weights.*` — the main table (age-banded, 17 voices).
2. `site.yieldWeights` — a SECOND yield table for settling (food 3 / prod
   2 / rest 1, unbanded), plus its own bonuses (freshWater 6, coast 3…)
   and its own threshold (`siteScoreMin`). This is why `weights.city`
   cannot reach the site decision.
3. `puppetProfile.weights` — a third table.
4. `war.*` — its own economy (goldPerScorePoint, cityWeight 25 ≠
   weights.city 110, luxury baselines) never converted to the currency.
5. `score.*` nominal constants (nominalYield, nominalCount now mostly
   retired by λ, unknownEffect) — placeholder prices.

A weight the user turns is one system of five; the other four don't hear
it. That is the entanglement felt from the outside.

## Finding 4 — caps are frozen decisions

`settlerCap 5 · workers.cap 6 · traderCap 4 · scoutCap 3 · armyPerCity 2 ·
sightedArmyCap 4 · garrisonPerCity 1` — each cap answers a question the
value system should answer per-situation ("is a fifth trader worth its
hammers HERE?"). Some began as bug-stops (scoutCap against the
scouts-forever regression) and calcified into policy. A cap is honest only
where it caps COMPUTE (pathProbes, goalHorizon, commandsPerSeat).

## Finding 5 — the threat lock on early builds

At every probed juncture, both towns' build lists read Spearman 25–41
against Monument 6.7 — `garrisonValue 140` + `threat.militaryBonus` +
`techMilitaryFactor 3` make every sighted barbarian column dominate every
economic candidate. The wild owns the map (50–63 units), so this term is
always on. Early bot economies aren't weak because yields are misweighted;
they're weak because threat pricing wins every argmax for 40 turns. The
levy also never asks whether wages are payable (Finding 2's cousin: army
size is a gate-and-multiplier system, solvency reacts after the bleed).

## Finding 6 — λ is in, and the frame generalizes

`value = realized + λ(potential − realized)` landed at the appraisal sites
(tech gifts, riders, counted cards, tally forecasts, the worker plan's own
research anticipation) and verifies numerically (a Monument line folds
10 × 2 towns × 0.4 exactly; λ=0.4 reorders mid-list races). It has NOT yet
touched the gates — which is where this audit says the value is dying.

## The gate inventory (bot.ts, with the value-frame replacement)

| Gate | Line | Blocks | Replacement |
|---|---|---|---|
| settlerCityPop | 2530 | settler build | already priced: `explainCitizen` charges the citizen — DELETE (redundant) |
| settlerAuthorityFloor | 2531 | settler build | price it: founding's authority cost × weights.authority joins the settler's fold (negative authority prices itself) |
| settlerCap | 2532 | settler build | `cityValueFalloff` already decays the value — keep only a loose compute cap |
| siteScoreMin | 3172/3241 | founding | compare against the hammers' next-best use (opportunity cost), in the ONE weight table |
| goldSpendAbove/reserves | 1753+ | purchases | buy when best purchase value > holding value (`goldPressure` × price) — the reserve becomes `reserveTurnsOfUpkeep` alone |
| faith/prophet/pantheon SpendAbove | 1964+ | faith spends | same, with faith's weight |
| workers.cap/perCity | — | worker build | the craving already prices the ground — DELETE the perCity, keep a loose cap |
| traderCap/tradersPerCity | — | trader build | route pay is now priced (`explainRoutePay`) — value it against hammers, DELETE the perCity |
| armyPerCity + sighted caps | 2411+ | soldier build | a wanted-army VALUE (threat × weights.military) minus a wage price (upkeep × goldPressure) — sizing becomes an equation, not a quota |
| healBelowHealth | 4027 | attack | fine as a preference term; the 0.5 could be priced (expected hp trade) but is honest |
| scoutCap/decay/glut | 2608+ | scout build | keep — it is a patch over a real valuation hole (exploration's value isn't priced); replace only when map-information carries a price |
| arrears trio | 1252 | disband | keep — the floor is a fact, not a price |

## The simplification architecture (the user's priority-flow, made concrete)

**Layer 0 — one table.** `site.yieldWeights` and `puppetProfile.weights`
fold into `weights` (site keeps only its geometry bonuses as terms;
puppets become a persona). War's prices convert through the currency once.

**Layer 1 — the wants ledger.** Once per seat per turn, one appraisal
ranks a SMALL fixed set of wants, each valued in the currency with
realized+potential: `expand` (next-town value after falloff, authority
priced in), `grow` (citizen values), `tech:X` (the beeline's own top
goal), `army` (threat value minus wage price), `realize:Y` (the largest
unrealized potential the empire holds — an unbuilt charter building, an
unworked rider, an empty faith bank). This is ~200 lines reusing existing
explainers; it is the number the user kept reaching for.

**Layer 2 — arms read the wants.** Every arm folds a want-alignment TERM
(never a gate): want=expand raises settlers, authority relief and
settler-escort soldiers everywhere; want=tech raises science builds and
the research bank; want=army flips production. The priority "flows"
because one ledger feeds every queue — turn `weights.city` up and the
whole empire leans, which is the behavior the user expected from the
knob in the first place.

**Gates become prices** per the inventory table. Knobs DELETED outright:
settlerCityPop, workers.perCity, tradersPerCity, goldSpendAbove,
faithSpendAbove, prophetSpendAbove, pantheonSpendAbove, siteScoreMin,
settlerAuthorityFloor, goldReserve, faithReserve — eleven fewer dials,
each replaced by a price the existing weights already imply.

**Sequencing** (each batch measured in the arena before the next):
1. Table unification + the redundant-gate deletions (cheap, verifiable).
2. Spending gates → prices; the wage-aware levy.
3. The wants ledger + alignment terms.
4. Re-tune the survivors on arena sweeps.

## What this audit does NOT claim

The gates were not stupid — most were honest patches over missing prices
(the scout glut, the opening bankruptcies). The claim is only that the
prices now exist (goldPressure, explainRoutePay, λ, the levy) and the
patches can retire into them. And the wild's 50–60 standing units are a
SIM fact this bot must live with — Finding 5's threat lock is partly
correct behavior against a genuinely dangerous map; the fix is pricing
wages and camps, not muting threat.
