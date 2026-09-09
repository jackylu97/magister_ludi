# The bot audit, pass 2 — what it does not know, what it does not fold, and what a turn costs (2026-09-08)

The brief (user): *"do a pass on the bot considering all the changes we've made. Are
there any new mechanics it's missing? I also want to squeeze as much performance as
possible out of the bots, take a look over its logic and see if there are any
variables that are missing from its evaluation."*

Method is `docs/history/bot-audit.md`'s: **measure, do not guess.** Every number below
is off a played board or off a count of the data, and where a reading is reasoned
rather than measured it says so. Nothing in `src/ai/` was changed by this pass.

## The bench

- Two duel games, two balanced seats, wild on, seeds **20260903** and **4242**,
  150 turns each, driven a decision at a time through `createBotStepper` (the
  driver unrolled — `test/sim/aiDecision.slow.test.ts`' own harness).
- One CPU profile of seed 20260903's whole 150 turns, sampled at 200 µs
  (`node:inspector`, 50,645 samples).
- Data counts off `data/buildings.json`, `data/statecraft.json`, `data/religion.json`,
  `data/techs.json`, `data/greatPeople.json` at 91021af, schema 99. The tree moved
  to 55d900c while this pass ran; `git diff 91021af..55d900c -- src/ data/` is
  **empty**, so every number below is off the code that is on `main` now.
- Probes were throwaway `test/sim/zzPass2*.test.ts` files, deleted.

---

# Part 1 — the coverage matrix

**Thirty-three mechanics checked, one verdict each: 10 known and priced honestly · 8
known with a named defect · 15 ignored outright.** "Known" means an arm decides it;
"priced" means a `ValueTerm` carries its magnitude; "ignored" means neither, and the
mechanic is invisible to every fold in the bot.

| Mechanic | Verdict | The proof | Cost of the gap |
|---|---|---|---|
| **Rites** (a city's verb) | knows · prices | `ritePlan`/`explainRite` (`wants.ts:1209/1261`) · `riteDecision` (`bot.ts:3270`) | none — **12 and 15 `performRite` a game** measured. The ten turns are read (`duration ÷ score.lumpTurns`) |
| **The empire rite** (a prophet's) | prices, arm exists | `explainEmpireRite` (`wants.ts:1292`) · `prophetCommand` (`bot.ts:6615`) | **never fired** on either board: no `empireRite` in 2,259 commands |
| **The Chapel's `ritePays`** | ~~ignores~~ · **prices** (X8) | `explainBuildingRow` folds `buildingRitePay` at `occasionRate('rite')` and the culture price | closed by batch X8 — the rite's own blessing stays the want book's, and this line is the rider |
| **The four faith houses** (Mosque · Wat · Gurdwara · Dar-e Mehr) | knows · **prices badly** | `faithPlan`'s building loop (`wants.ts:686-706`) enumerates them through `explainPurchaseCost(…, 'faith')` | **large, and it is an asymmetry rather than an omission**: the faith loop folds `explainBuildingRow` + upkeep and **not** the hypothetical `foldCity` delta the gold loop folds (`wants.ts:369-373`). A Gurdwara's +3🌾 +3🕯 +2🔬 prices at **zero**; a Mosque reads its one writ and nothing else |
| **Knights Templar** | knows · **prices at its own price** | `faithPlan`'s unit loop → `faithRowTerms` falls to *"worth at least the faith it costs"* (`wants.ts:875-877`) | **large**: a 12-strength heavy horse is priced `price × faithPrice ÷ lumpTurns` — a number that is a function of the *price*, not of the piece. `explainSoldier` is one call away and is not made. Also `ownsAny` (`wants.ts:653`) bars a **second** copy of any faith unit for ever |
| **The faith bank generally** | knows | `bankSpend`, `faithPlan` | works — but the only faith row that ever reached the top of the book on these boards was **Blessing of Arms at 72🕯**, out of reach in every seat at t120 (banks 29/45/30/55). Faith sat at its **ceiling, 9.00, in all four seats** while nothing was bought |
| **The free belief redeal** | knows · prices | `beliefRedeal` (`bot.ts:2385`), bar = the bag's own mean | works as shipped (H12) |
| **Paid rerolls** (order · doctrine · great-person · second belief) | **ignores** | `beliefRedeal` returns `null` unless `rerollKindFor(player) === 'belief'` **and** the asking is free (`bot.ts:2394`) | **medium**: schema 85 put four hands on one ladder at `base 35 · exponent 1.35 · heavy ×2`. The bot has never sent one back for coin. Zero `rerollOffer` in 2,259 commands |
| **The Muses' Call** (Doctrine) | ignores its two halves | `grantsAbility` → `score.unknownEffect` (`value.ts:1534`); `DoctrineDef.onAdopt` has **zero hits in `src/ai/`** | **medium**: the row's whole point is *a great person now* plus the ancestor-rites door, and both price at 2 points. Its third clause (`pays where:'hex' on:{greatWork}`) is priced at `score.nominalTiles` with the scope unread |
| **Cult of Heroes** | prices | `cityRenownPercent` arm (`value.ts:1440`) | none |
| **`OFFER_PURCHASES`** (1000💰 · 750🕯 · the scholar draft) | **ignores** | zero hits for `OFFER_PURCHASES` / `purchaseGreatPersonOffer` in `src/ai/`; `purchasingPlan` and `faithPlan` enumerate buildings, units and hexes and no offer | **medium-to-large late**: three of the game's four large sinks for a full treasury are invisible. Measured treasuries at t150: 313 / 302 / 577 / 350 |
| **The cost standard (P1)** | knows | every price flows through `explainPurchaseCost` / `buildingProductionCost` / `queueItemCost` | **see the research section below — this is the pass's biggest single finding** |
| **The tech ladder (S1)** | knows | `researchExpansion`, `techDef(id).cost` | same |
| **Lending by the copy (T1)** | knows | `swapDecision` reads `resourceCopies` ≥ 2 (`diplomacy.ts:1259`); `asksOurLastCopy` (`:356`) is the hard clause | correct as far as it goes — see the audience row |
| **The audience (D1)** | knows · prices | `answerProposal` (`:407`), `answerPeaceOffer` (`:714`), `counterTerms` (`:858`) | **the bot answers and never asks.** `swapDecision` is the only paper it writes and it is 1:1 luxury only — no coin, no coin a turn, no right of way, no town, and it ~~never counters its own refusal~~ **counters it once, with coin** (X4: a refused straight swap is re-written through `counterTerms` and the pair then closes — the coin is the only one of the four this batch added). See the deal loop below |
| **The campaign (W1)** | knows | `explainDeclaration`, `campaignMarch`, `wakeTheCampaign`, `musterHex` | **zero declarations in four seat-games of 150 turns.** W1's own written-down gap, re-measured on two new seeds: the four-clause conjunction (ratio · reach · `strikeForce` 4 beyond garrisons · a road) does not coincide on a generated duel map |
| **Standing orders (U1)** | ~~**ignores**~~ **reads** (X7) | `reaskTheMarch` (`bot.ts`) asks `unitOfferedForOrders` — the sim's own **wide** predicate — of every piece of the seat's once a turn, beside `firstBlocker`'s narrow one | ~~medium~~ **closed for the civilian cases**. A piece under orders with movement in hand is re-asked by the arm that ordered it, at most once a turn (`driver.reaskPerTurn`), and re-issued only where the answer names a different hex. What is *not* closed is the ruling's other half: a stored path still walks only on the turn's leftover, so a multi-turn march is still a turn slower than it was before schema 98 — that is the rule, not a defect |
| **The palace (v99: +1🔬 +1🎵, writ 6)** | prices | flows through `foldCity` and `explainAuthority` with no bot code at all | none. The measured consequence is that `meterWeight(authority)` sat at **10.00** (its prior, un-ratcheted) in all four seats at t120 — the palace's six writ is enough that a duel-sized empire is not writ-bound before t120 |
| **Trade — destination scope** | prices | `explainRoutePay` (`routes.ts:161`) folds `explainRouteYieldBetween` | none |
| **Trade — international routes** | prices | the `abroad` branch folds `explainRouteSenderYieldBetween` | none; the host's coin is deliberately uncounted |
| **Trade — the Silk Exchange's share** | prices | `scorePays`' `where:'route'` + `share[]` loop (`value.ts:1298-1315`) | none |
| **Wonders — chasing one** | **ignores** | wonders enter only through `buildCandidates`' ordinary loop, with `isPatientRow` patience; nothing steers research or settling toward one | **medium**: the bot builds a wonder that happens to be open in a town that happens to be busy. It never beelines one and never founds a town to reach one |
| **Wonders — `requiresSite`** | knows, ~~does not price~~ · **refuses out loud** (X8) | `canQueueBuilding` → `buildError` refuses it; `siteRefusal` turns that into the printed sentence a `BotCandidate.rejected` carries | **13 live rows.** The refusal is readable now; *founding toward* a site is still X10's, and the bot still cannot see that Petra wants sand |
| **`landfall`** (Admiralty) | prices | `value.ts:1593-1608`, recursive, scaled `turns ÷ nominalCount` | none |
| **The King's Road rule** | **ignores** | `cityRestoresMovement` is a `BehaviorRuleId`; the `rule` arm prices everything but `borders` at `unknownEffect` (`value.ts:1646`) | small — but note `rulePercent: 'roadStepCost'` (Machinery) **is** priced (`value.ts:2056`), so the two halves of one idea read differently |
| **Blitz's kill-and-move** | **ignores** | `rule: 'moveAfterKill'` and its partner `noFortify` both hit the same fallthrough | small in points, wrong in sign: the card's **price** (`noFortify`) also scores +2 |
| **The Bank's `routeEndsHere`** | ~~ignores~~ · **prices** (X2) | it is a `CityScope` test, and no scope was evaluated anywhere in `value.ts` — `townsAdmitting` now asks `cityScopeAdmits` | closed by batch X2 |
| **The Cistern's `irrigates`** | ~~ignores~~ · **priced all along** (X8) | `cityContext` asks `buildingsIrrigate` of the town **plus the candidate**, so the farms it waters are in the `foldCity` delta the caller folds | closed by batch X8 by *finding it already read* — `BUILDING_ROW_SILENT` says so in the source, so nobody rediscovers it |
| **The Stable's site** | ~~ignores~~ · **reads it** (X8) | `siteRefusal` (`value.ts`) is `buildError`'s own sentence for the thirteen sited rows | the reading is built; **`bot.ts` has still to print it** (one line in `buildCandidates`) |
| **The Bourse's rate conversion** | prices | `pays basis:'rate'` → `rateSourceValue` (`value.ts:1264`) | none |
| **The Crusade's pressure lump** | **ignores** | `windfallRider.grant.pressure` → `unknownEffect` (`value.ts:2007`); the sibling `kind:'pressure'` likewise (`:1551`) | H2's written-down gap, unchanged: **the tide has no reading in this currency** |
| **The Levée's stamped muster** | **ignores** the stamp | `periodicMuster` reads `every` and drops `.stamp` (`value.ts:1586`) | small |
| **`terrainBeside`** | ~~ignores~~ · **prices** (X2) | a `CityScope` test (schema 91, Petra), answered by `townsAdmitting` like every other | closed by batch X2 |

## The three findings underneath the matrix

### 1. The cost standard made two thirds of the tech tree score negative, and the beeline went military

P1's own report warned it. Measured, on every research re-aim of four seat-games:

| seed | re-aims | nodes weighed | **scoring negative** | share |
|---|---|---|---|---|
| 20260903 | 24 | 412 | 254 | **62%** |
| 4242 | 18 | 312 | 201 | **64%** |

A sample of the table, seed 20260903 seat 1 at t122:

```
Bronze Panoply 2593*  ·  Fletching 1196  ·  Siegecraft 1096  ·  Divination 144
worst: Divine Right −1640  ·  Paper Money −3735
```

And what the bot actually aims at:

| seed | military picks | of re-aims |
|---|---|---|
| 20260903 | Bronze Panoply ×9 · Fletching ×2 · Siegecraft ×2 · Iron Working ×1 · The Saddle ×1 = **15** | 24 (**63%**) |
| 4242 | Bronze Panoply ×6 · Fletching ×2 · Siegecraft ×2 · The Saddle ×1 = **11** | 18 (**61%**) |

The mechanism is in `techChain` (`chain.ts:316-334`) and is arithmetic rather than
taste:

- a **unit** step costs **`cost: 0`** hammers by construction ("a piece is an
  option, never an obligation") and its rate is `unitTerm` — `strength ×
  weights.military + threat × threat.militaryBonus`, **× `threat.techMilitaryFactor` 3**
  whenever any column stands near a town (`chain.ts:560-565`);
- a **building** step costs `buildingProductionCost × townsWanting` hammers, and
  the whole of that is subtracted through `explainLump` at `weights.production`
  (`chain.ts:453-461`);
- P1 made those hammers dearer and S1 made the beakers dearer, and **nothing on
  the unit side moved at all**. So a node whose gift is a spearman is a pure
  positive and a node whose gift is a library is a positive minus a big number.

Two further consequences worth naming: the unit term folds **no levy surplus
charge** (the wage-aware levy of batch 4 lives in `unitRoleValue`, not in the
chain), so a node unlocking a soldier is worth the same to an empire with eleven
soldiers as to one with none; and the wild's standing 50–60 pieces mean
`ctx.threat > 0` is close to permanent, so the ×3 is close to permanent too — the
audit's Finding 5, alive one layer up.

### 2. The deal loop: 15% of a seat's whole command budget spent re-sending one refused paper

On seed 4242 the bot sent **92 `proposeDeal`** and the other seat sent **91
`declineDeal`** — 183 of ~1,256 commands, and **zero deals struck**. Four distinct
papers account for all 92: one was sent **37 times**, another 29, another 23.

The mechanism: the stepper's `refusedCommands` memo is **per turn** (a fresh
`SeatRun` each seat-turn, `stepper.ts:153-163`), and `swapDecision` is a pure
function of the board, so a swap the rival's `answerProposal` declines is
re-proposed on the next turn, and the turn after that, for the rest of the game.
`declineDeal` does not change the board, so nothing ever makes the arm stop.

Seed 20260903 struck none and proposed none (no duplicate luxury), so the loop is
board-dependent rather than universal — but it is a standing 15% tax whenever it
opens.

**Closed by batch X4** (2026-09-08), with one reading this finding got half
right. *Board-dependent* is exact and *rather than universal* was optimistic: by
the time X1–X3 had landed the same two seeds read **14 papers on 4242 and 77 on
20260903** — the loop had simply moved to the other board. The memory
(`src/ai/dealMemory.ts`, keyed on the paper and on a fingerprint of the rival's
holdings, lapsing at `war.refusalMemoryTurns`) takes them to **2 and 8**, and the
whole-game command count falls by exactly the papers that stopped being written,
which is the finding's own sharpest reading: a proposal and its decline leave the
board identical, so the loop crowded nothing out — it was pure overhead. What the
batch did **not** buy is a deal: on both boards every paper the arm can write
asks for a seam the rival holds one copy of, and that is refused by a hard clause
no coin moves. The question underneath this finding is therefore *why two duel
empires never both hold a duplicate*, and it is upstream of the deal loop.

### 3. Faith rides its ceiling and buys nothing

At t120, all four seats: **faith price 9.00** — the band's ceiling — with banks of
29/45/30/55 and the best row in every book *Blessing of Arms at 72🕯*, marked out
of reach. Faith income was 0–22 a turn. The bot is telling itself a point of faith
is worth three times the table's number, and then holding it.

That is the H12 pattern one turn further on: the book now correctly carries a rite
the bank cannot pay (which is what makes the price honest), and the empire has
no *cheaper* faith row to fall to, because the two that exist — a faith house and
a Templar — are priced at zero and at their own price respectively.

**Closed by batch X3** (2026-09-08), with one reading this finding got wrong: the
two rows are priced properly now (a Gurdwara at 48.40 for 117🕯 where it read
0.00; a Templar at 120.00 for 80🕯 where the lump read 36.00, its fold naming the
horse it rides as), and on an arranged board the bank is spent — but on *this
bench* the two rows never exist at all. No seat on either seed founds a
house-opening faith, adopts Holy Order or raises a Cathedral, so the faith book
on these four seat-games holds rites and the ladder and nothing else, and the
four seats' figures are byte-identical after the fix. **Why these seats reach
t150 without a religion is the question underneath this finding**, and it is
upstream of the book.

## The Wager (`docs/wager.md`, not built)

Nothing in `src/` or `data/` names it; the batches queued are G1 clock → G2 deal →
G3 malice → **W2 bots**. What the bot will need is **a wager want, not a wager
arm**: the three targets a seat is dealt are the same shape as an endeavour — a
deed with a deadline that pays beads — so the honest place for them is a fourth
chain beside `techChain` / `expansionChain` / `beadChain`, whose `worth` is
`2 × weights.bead` for the met target plus `1 ×` for each of the other two,
discounted by the turns to the age's close, less a malice term; whose `delay` is
the countdown; and whose `steps` are whatever the target counts. Every arm then
folds `chain.worth ÷ chain.stepsRemaining` through the door batch 3 already built,
and `raceTerm`'s sibling reader answers for candidates. The one genuinely new
question is the one batch 5 wrote down and did not solve: **a count deed is not
readable** — "twelve cities of six citizens" needs `beadCount` asked
hypothetically of a row the bot has not built. The Wager makes that question
compulsory rather than optional, and it should be answered once, in a leaf, for
both systems.

---

# Part 2 — the evaluation's missing variables

Ordered by how often the reading is *there to be read*. "Where it should join" names
the `ValueTerm` list, not a design.

| # | The reading the sim exposes | Where it should join | Live rows / how often | Judgement |
|---|---|---|---|---|
| **1** ✅ | **A `CityScope` — any of the 32 tests** (`statecraftData.ts:249-580`, evaluated by `cityScopeAdmits`) | `scorePays` / `explainEffects`' scoped arms (`value.ts:1220-1325`) | **222 of 731 effect-shaped rows in the data carry a scope, an `on`, a `within`, an `origin` or a `destination`** — 30% | **The largest single hole in the appraisal, and now closed** (batch X2). Every scoped clause was priced as if it paid in every town. `townsAdmitting` asks `cityScopeAdmits` over `citiesOf` and `workedHexesAdmitting` asks `tileConditionHolds` over the worked ground, both memoised per `ValueContext` on the row's own object; the route's `origin`/`destination` stay unread and say so |
| **2** ✅ | **`BuildingDef.cityHp`** (`buildingEffects.ts:138`, folded by `cityMaxHp`) | `explainBuildingRow` (`value.ts:965-1017`), beside the `cityStat` term | **7 live rows — palisade, stoneWalls, wallsOfUruk, greatWall, castle, bastion, keep**: the entire wall chain | **The bot under-reads every defensive building by exactly the half of a wall that decides a siege.** `cityStat.defense` is a term in the damage curve; `cityHp` is the bar the besieger has to empty, and the bot reads one and not the other. It buys walls anyway (measured: *Palisade at Greyharbour 379.2 for 208*, *Stone Walls 336 for 468*) — they would rank higher still, and the ranking against a granary is where it matters. **Closed by batch X5** (2026-09-08): the line is `buildingCityHp` folded at `weights.military × (1 + threat)`, and on the siege bench a threatened town's Palisade goes 4.81 → 19.23 and takes the front of the queue |
| **3** | **The town's percent stages on a row that *grants* a percent** — `BuildingDef.productionBonus` and every `percentYields`/`productionBonus` card clause | `explainBuildingRow`; `productionOf`/`scoreEffect` (`value.ts:1181-1185`, `:1341`, `:1350`) | **4 building rows (barracks, stable, shipyard, forge) + 45 `percentYields` + 33 `productionBonus` card rows** | The row's own **flat** yields are staged correctly — the gold building loop hands a hypothetical to `foldCity` and gets Entry XVII's two multiplications for free. A row that grants a *percentage* is priced against `nominalRate` (`unknownEffect × nominalCount` = 6) in **every** town, so a +10% forge is worth the same in a hamlet and in a capital making 30⚙. The town's own base is one `standing` reading away in `buildCandidates` and is not used |
| **4** ✅ | **The happiness a new citizen demands, and the tier it would tip** (`happinessDemand`, `crowdingDemand`, `happinessTierBoost`) | `explainCitizen` (`bot.ts:4431-4454`) | every settler candidate, every focus decision, every growth term — hundreds a game | `explainCitizen` folds three lines — the ground, `sciencePerPop`, a small-town premium — and **charges nothing for the contentment the citizen costs**. The meter's price is already in the context (`meterWeight`), the demand is one sim call, and the expansion chain charges the *founding*'s happiness while the *growth*'s is free. Measured relevance: happiness rode **21.93 and 36.00** (ceiling ×3 = 36) in two of the four seats at t120. **Closed by batch X5** (2026-09-08) — with the correction in (c) below: the marginal demand is charged, and the fold's one caller is the settler's, which subtracts it — **and by X5b the same day**, which puts the same line in the focus arm's `growthTerm` and the hex purchase's `tileWants` through one shared helper |
| **5** | **`openedResource` — the seam a spade would open** (`cities.ts:82`) and the luxury signature behind it (`resourceEffects.ts`) | `improvementEntry` (`plan.ts:246-275`) and `explainWorkerCraving` | every plantation / pasture / camp / mine / quarry on a resource hex | `newResourceTerms` has exactly two callers — `tileWants` and `explainSite` (`bot.ts:5261`) — and **neither is the worker plan**. Improving a silk hex opens a luxury's whole signature (happiness in every town, its `perCopy` and `renownPerCity` lines) and the plan prices the hex's yield delta alone. Note the honest half: the *first-copy* bonus is genuinely nought here, because `ctx.realm` counts an owned unimproved copy — what is missing is the **access**, not the uniqueness |
| **6** ✅ | **`buildingCrowdingRelief`, `unitUpkeepRebate`, `healsAdjacent`, `purchaseDiscount`, `waters`, `irrigates`, `tileYields`, `ritePays`, `faithPurchases`** | `explainBuildingRow` | 1 + 1 + 1 + 1 + 2 + 1 + **5** + 1 + 2 = **15 live rows**, all with **zero hits in `src/ai/`** | Each is small alone; together they are a sixth of the buildings whose reason to exist the appraisal cannot see. ~~`tileYields` (5 rows: stable, harbour, shipyard, lighthouse, cistern) is the biggest — a harbour that pays every water hex is priced as a shelf~~ **Closed by batch X8** (2026-09-08), and the sentence about `tileYields` was wrong: the caller hands the row to `foldCity` as a `hypothetical` and `cityContext` hands *that* to `buildingTileLines`, so the harbour's water was already in the yield delta — as were the cistern's irrigated farms. Five of the nine are folded now (`crowdingRelief`, `unitUpkeepRebate`, `purchaseDiscount`, `healsAdjacent`, `ritePays`), two were paid already, and `waters` and `faithPurchases` name their reasons in `BUILDING_ROW_SILENT`. Every field of the row is now in one register or the other, and the test reads the interface itself |
| **7** | **The unit roster's age band** — that a warrior is a warrior in Æra III | `explainSoldier` (`value.ts:1051`) and `unitTerm` (`chain.ts:553`) | every soldier candidate, every military tech node | `explainSoldier` reads `max(combatStrength, rangedStrength) × weights.military`, which scales *with* the roster and is therefore not wrong — but nothing anywhere asks **"is this row superseded by one this empire can already build"**. There is no obsolescence term in the bot at all. Combined with finding 1 (a unit step costs zero hammers), this is why Bronze Panoply wins twenty-four re-aims running |
| **8** | **A `UnitFilter` / `class` / `when` / `stat` on a card clause** | `combatLine`, `unitStat`, `purchaseRider`, `upkeepSurcharge` arms | **49 rows carry a class filter, 52 a `when`**; ~~`unitStat.stat` is not read at all (`value.ts:1363`)~~ **the `stat` half is closed** (batch X8) | ~~Field Hospitals (`stat:'heal', amount:100`) scores as **100 strength points**.~~ It scores as **one piece back on its feet** now: the arm dispatches on `.stat` — a `combatPercent` is a percentage *of* a piece, a `heal` is a share of the bar it fills (`unitMaxHp`), and the four points of a piece's own quality keep the rate the arm always read them at. **The class filter and the `when` are still unread**: a discount on religious units still prices as a discount on everything. H2 wrote that half down and it stands |
| **9** | **The camp's bounty** (`chopBaseFor`/`windfallPayout`'s camp arm) | `campMarch` (`bot.ts:6239-6291`) | every camp inside `military.campHuntRadius` | `campMarch` ranks camps by **distance from the nearest own town and nothing else** — the two terms it prints are two distances. The bounty is a real number the sim will pay and the score is a geometry |
| **10** | **The route slot a market opens vs. the pairs it would serve** | already priced — `routeSlotTerm` (`value.ts:728`) | — | Listed to record that it is **not** a gap: batch 8 closed it |
| **11** | **The great person's family feed** (`1000 + feed share`, and `GreatPersonOffer.family` since v85) | `explainGreatPerson` (`bot.ts:2801`) | every `chooseGreatPerson` — 7 on seed 4242 | The arm prices the act, the work and the legacy of the name on the table, and never that **taking a scholar makes the next draw more likely to be a scholar**. Reasoned, not measured: the effect is second-order and the arm is right about the first order |
| **12** | **The bead a deed would mint** | `racePays` (`chain.ts:1380`) reads three markers a row carries about itself | measured 1–5 beads a seat at t150 | Batch 5's written-down gap, unchanged and now urgent: a count deed is unreadable, and **the Wager makes every wager a count deed** |
| **13** | **The rite's ten turns** | already priced — `explainRite` scales by `duration ÷ score.lumpTurns` | — | Not a gap. Recorded because the brief asked |

### Three that matter most

**(a) The scope, 222 rows** — **built, 2026-09-08 (batch X2).** Nothing else in the
appraisal was wrong on 30% of the data. It was also the one whose fix was bounded:
`cityScopeAdmits` is a pure reading the bot may take, and *"how many of my towns
does this clause actually land in"* is one walk of `citiesOf` per scoped clause,
memoised on the `ValueContext` exactly as `MARGIN_MEMO` is. Shipped as
`townsAdmitting` plus a harder second half for the hex ground
(`workedHexesAdmitting`); the figures are in `docs/bot-priorities.md`.

**(b) `cityHp`, 7 rows** — **built, 2026-09-08 (batch X5).** The wall chain is the
empire's whole answer to a siege and the bot read half of each row. One term in
`explainBuildingRow`, through `buildingCityHp`; on the siege bench a threatened
town's front row goes from a second warrior to the Palisade.

**(c) The citizen's happiness demand** — **built, 2026-09-08 (batch X5), and this
paragraph was wrong about where it lands.** The charge is a signed line in
`explainCitizen` and the arithmetic is honest, but *"every arm that values a
citizen (the settler, the focus arm, the growth term, the tile purchase)"* is not
what the source says. `explainCitizen` has **one** caller — the settler's, which
subtracts it — so the charge arrives there as a settler that is *cheaper*, and the
sweep found thirteen more towns rather than a happier empire. The focus arm's
`growthTerm` and the hex purchase's `tileWants` price the **ground** and not this
fold, deliberately and with docblocks that say why (an appraisal that moves when
it is acted on flips a town all turn), so **the growth channel is still
uncharged** — and it is the channel the paragraph was actually about. Charging it
is a design decision, not an arithmetic one, and it is queued for a ruling.

**Ruled and built the same day, as batch X5b** (flags board item (ggg);
`docs/bot-priorities.md`, "Batch X5b as shipped"): both arms fold the same
marginal-demand line through one helper, `citizenKeepTerm` (`wants.ts`), read at
the town's *current* population — which is what leaves `growthTerm`'s
anti-oscillation argument intact, since a citizen arrives by growth and never by
a command. The paragraph's original sentence is now true of the source: four arms
of the appraisal charge a citizen its keep, and they charge it the same figure.
What the sweep says about the *empire* is a third reading again — the ceiling
column follows the town count, and the town count follows the settler's arm,
which subtracts the line. The remaining question is whether a **founding** should
charge the new town's citizens rather than discount them; that is
`explainFoundingCost`'s ground, and it is queued in turn.

---

# Part 3 — performance, measured

## The two games

Duel, two balanced seats, wild on, 150 turns. `pieces` is every unit the seat owns,
civilians included; `sci`/`cul`/`gold`/`faith` are `foldEmpireRates` per turn.

### seed 20260903

| | t50 s0 | t50 s1 | t100 s0 | t100 s1 | t150 s0 | t150 s1 |
|---|---|---|---|---|---|---|
| cities | 3 | 2 | 4 | 3 | 5 | 7 |
| citizens | 11 | 6 | 18 | 18 | 25 | 33 |
| technologies | 7 | 7 | 9 | 9 | 13 | 19 |
| pieces | 9 | 6 | 13 | 16 | 22 | 47 |
| beads | 1 | 0 | 3 | 0 | 4 | 1 |
| science/turn | 6.5 | 5.0 | 10.0 | 16.0 | 18.5 | 28.5 |
| culture/turn | 6.0 | 3.0 | 7.0 | 10.0 | 9.0 | 39.0 |
| gold/turn | 1.0 | 4.0 | 7.0 | 25.0 | −1.0 | 94.0 |
| treasury | 84 | 27 | 81 | 201 | 313 | 302 |

### seed 4242

| | t50 s0 | t50 s1 | t100 s0 | t100 s1 | t150 s0 | t150 s1 |
|---|---|---|---|---|---|---|
| cities | 3 | 3 | 3 | 6 | 5 | 8 |
| citizens | 12 | 10 | 16 | 19 | 31 | 50 |
| technologies | 7 | 7 | 10 | 13 | 14 | 22 |
| pieces | 11 | 11 | 15 | 31 | 27 | 44 |
| beads | 0 | 1 | 3 | 3 | 3 | 5 |
| science/turn | 7.0 | 6.0 | 10.0 | 10.5 | 17.5 | 41.5 |
| culture/turn | 4.0 | 4.0 | 11.0 | 9.0 | 29.0 | 43.0 |
| gold/turn | 5.0 | −2.0 | 14.0 | −25.0 | 89.0 | 10.7 |
| treasury | 44 | 29 | 100 | 33 | 577 | 350 |

**Readings.** Both boards are lopsided by t150 (7 towns against 5, 22 technologies
against 14) and the trailing seat in each is the one that stayed on the military
beeline. Seat 1 on 4242 spent t100 at **−25💰 a turn** with 31 pieces and 33 in the
treasury, and disbanded 36 pieces over the game — the wage-aware levy working late
rather than not working.

## Time per turn

| seed | turns | decisions | total | mean/turn | t0–50 | t50–100 | t100–150 |
|---|---|---|---|---|---|---|---|
| 20260903 | 150 | 1,003 | 12.1 s | **81 ms** | 36 ms | 64 ms | 142 ms |
| 4242 | 150 | 1,256 | 15.8 s | **105 ms** | 33 ms | 76 ms | 206 ms |

**P3/H18's ~790 ms a turn is gone** — batch 6's sitting hoist is holding. What is
left is not flat: a turn costs **four to six times more at t150 than at t1**, and the
growth is superlinear in towns (5–8 towns, 25–50 citizens, 22–47 pieces).

## The profile — the three hottest arms

Inclusive share of 50,645 samples over seed 20260903's 150 turns, `src/ai` frames
only; the stepper's own two frames are dropped.

| arm | inclusive | note |
|---|---|---|
| `valueContext` / `seatContext` (`bot.ts:392`) | **49.7%** | the sitting — built once a seat-turn and charged to whichever arm asks first |
| ├ `wantBook` (`wants.ts:309`) | 36.9% | |
| ├── `purchasingPlan` (`wants.ts:342`) | 29.3% | |
| ├──── **`tileWants` (`wants.ts:451`)** | **21.1%** | **the single hottest thing in the bot** |
| `spendCommand` (`bot.ts:3099`) | 47.3% | mostly the sitting it triggers |
| `answerBlocker` (`bot.ts:1150`) | 13.2% | |
| `housekeeping` (`bot.ts:1194`) | 8.2% | |
| `draftPlan` → `expectedBestOrder` | 6.6 / 6.7% | |
| `explainCard` → `explainCardEffects` → `scoreEffect` | 6.6 / 6.5 / 4.9% | |
| `routeOutlook` (`routes.ts:198`) | 5.4% | `firstLegal` 4.1% of it |
| `researchCommand` → `techGoalTable` → `techChain` | 5.2 / 5.1 / 4.2% | |
| `deckMargin` → `deckReading` → `marginRates` | 4.1 / 4.0 / 3.5% | F2's margin, cheap as claimed |

Underneath, the sim-side self time is dominated by one walk:

| sim frame | self |
|---|---|
| `controlledHoldings` (`cities.ts:140`) | 7.6% |
| `controlledResources` (`cities.ts:166`) | 6.7% |
| `openedResource` (`cities.ts:82`) | 2.2% |
| `lentCopiesHeld` (`cities.ts:104`) | 0.9% |
| **the resource walk, total** | **17.4%** |
| `at` / `wrapCol` / `mapRange` (map indexing) | ~8.3% |
| `explainHappiness` (`meters.ts:56`) | 2.3% |
| `findPath` (`pathfind.ts:386`) | 2.2% |

**8.4 of those 17.4 points are charged to `tileWants` alone.** The arm walks
`purchasableTiles` for every town every seat-turn, and each offer costs a
`foldTileLines` and the ladder's own gate. What it buys, measured: **5 and 1
`purchaseTile` commands in 150 turns.** Twenty-one percent of the bot's runtime for
six purchases.

**Closed by batch X6** (2026-09-09), with the mechanism read one layer deeper
than this paragraph reads it. *"Each offer costs a `foldTileLines` and the
ladder's own gate"* is right about the two halves and wrong about which one is
expensive: the tile fold is 1% of the bot, the ladder (`explainTilePurchase`) is
2.4%, and **the gate is 13.3%** — because `tilePurchaseError`'s writ clause is
`bordersFrozen(meterEffects(...))`, and that is `explainHappiness` walking every
town of the empire and every luxury it holds. The 8.4 points charged here are that
walk, asked once per offered hex. X6 asks it of the hexes the book would actually
rank — the arm falls to **5.1%** and the gate to **0.3%** — and the fourteen
boards it was measured on play byte-identically either way.

## The five changes that would make it play better, in order of gain per effort

Each is a paragraph, a mechanism, an arm and the measurement that would prove it.
None is implemented.

**1 — Charge a unit step its hammers, and charge the levy in the chain.**
`techChain`'s unit steps cost `cost: 0` by construction and their rate is
`explainSoldier × techMilitaryFactor`, while every building step subtracts its
hammers through `explainLump`. P1 and S1 made the hammer and beaker sides dearer and
left the unit side untouched, and the result is 62–64% of nodes negative and 61–63%
of re-aims military. The mechanism is to give the unit step the same shape the
building step has: `cost = unitProductionCost × (how many the levy actually wants
that this empire does not hold)`, which is `sightedArmyWanted` minus
`countSoldiers` — the reading `unitRoleValue` already makes, moved one module in so
the chain and the town agree about how many spears an empire wants. The arm is
`chain.ts:316-334` and `chain.ts:553-566`. The measurement is this pass's own bench,
re-run: the share of weighed nodes scoring negative, the share of re-aims that are
military nodes, and technologies held at t150. A pass that leaves the negative share
above half has not fixed it.

**2 — Evaluate a `CityScope`.** ✅ **Built 2026-09-08 as batch X2** — see
`docs/bot-priorities.md`, "Batch X2 as shipped". 222 of 731 effect rows carry a scope, an `on`, a
`within`, an `origin` or a `destination`, and `value.ts` evaluates none of them —
every scoped clause is multiplied by the empire's whole town count. The mechanism is
one function, `townsAdmitting(ctx, scope)`, calling the simulation's own
`cityScopeAdmits` over `citiesOf` and memoised per `ValueContext` on the scope
object (`MARGIN_MEMO`'s bargain), replacing the bare `× ctx.cities` in `scorePays`
and in the `happiness` / `cityStat` / `meterRule` / `yieldConversion` /
`mirrorYield` arms. It closes the Bank's `routeEndsHere` and Petra's `terrainBeside`
for free, because both are scope tests. The measurement is the H2 acceptance shape:
run the six-game harness with the door off and on, count the boards that move and
which arm moved them, and pin the two rows whose reading changes most (a coastal
line in a landlocked empire must read **0**, not `× cities`).

**3 — Price a faith row by what it is, not by what it costs.** Three rows of one
book are wrong in three different ways: a faith house folds `explainBuildingRow`
and **not** the `foldCity` delta its gold-bought sibling folds, so a Gurdwara's five
yields price at zero; a Templar falls to *"worth at least the faith it costs"*, so a
12-strength heavy horse is priced as a function of its own price; and `ownsAny` bars
a second copy of any faith unit for ever. The mechanism is to make `faithPlan`'s
building loop identical to `purchasingPlan`'s (one `foldCity` hypothetical, already
computed for the same town in the same sitting) and to make `faithRowTerms`' final
clause dispatch on the row's markers the way `unitRoleValue` does — `isCombatant`
→ `explainSoldier`, `foundsCity` → the expansion chain, and the lump only for a row
none of those describe. The arms are `wants.ts:686-706` and `wants.ts:848-878`. The
measurement is the faith price and what the bank buys: at t120 all four seats read
**9.00 (the ceiling), 29–55 held, nothing bought**. A pass that leaves faith at its
ceiling with a full bank at t120 has not fixed it.

**4 — Stop the deal loop, and let the bot counter.** 92 proposals, 91 declines, four
distinct papers, one sent 37 times, zero deals — 15% of a seat's command budget on
seed 4242. The mechanism is two parts, and the second is the one worth having: a
**refusal memory that outlives the turn** (a paper the rival declined is a paper
this seat does not re-write until the board that priced it moves — the same
"incumbency is arithmetic" discipline the switch margin uses, keyed on the paper's
own JSON and the rival's holdings), and **`counterTerms` used offensively** — the
function already exists, already fills either side by `dealSideError`'s own caps,
and is called today only when a human presses a button. A bot that can sweeten a
refused swap with coin has a diplomacy; a bot that re-sends the same paper 37 times
has a loop. The arms are `diplomacy.ts:1257` and `:858`, and `stepper.ts:153-163` /
`driver.ts` for the memory. The measurement is `proposeDeal` count, `declineDeal`
count and **deals struck** over the same two boards.

**5 — Give the citizen its happiness, and the wall its hit points.** ✅ **Built
2026-09-08 as batch X5** — see `docs/bot-priorities.md`, "Batch X5 as shipped", for
the two lines, the siege-bench table and the eight-seed sweep. The wall half met
its acceptance; the citizen half did not, and why is the correction recorded in
(c) above. Two terms, two
files, and they are the two places the appraisal is missing a sign rather than a
refinement. `explainCitizen` (`bot.ts:4431`) folds the ground, the science and a
small-town premium and charges nothing for the contentment a citizen demands, in
empires whose happiness price sat at 21.93 and 36.00 — the band's ceiling — at t120;
the demand is `happinessDemand` and the price is already on the context.
`explainBuildingRow` (`value.ts:965`) reads `cityStat.amount` and not `cityHp`,
so all seven rows of the wall chain are appraised at half of what they do. The
measurement for the first is the settler and focus arms' behaviour on a crowded
board — towns founded, `setCitizenFocus` orders, and happiness at t100/t150 across
the eight-seed sweep the priority batches used; for the second it is a siege bench
(W1's own arranged board) with the term off and on, reading which row a threatened
town puts at the front of its queue.

---

# The queue

Each sized for one Opus batch, ranked by expected gain per effort. Every one is an
arithmetic change inside an existing fold — none adds an arm, a gate or a knob
unless it says so.

| | Batch | Scope | Acceptance |
|---|---|---|---|
| **X1** | ~~**The unit step pays for itself**~~ **BUILT 2026-09-08** | `techChain`'s unit steps take a hammer cost and the levy's surplus; `unitTerm` loses its unconditional ×3 or keeps it only against the levy's shortfall | **military re-aims 63% → 40% and 67% → 44%** (both below 45%); **technologies at t150 32 → 54 and 36 → 40** (up on both benches); no bankruptcy on either board. **The negative share went 62% → 78% and 64% → 72% and the target was unreachable from the unit side** — see below |
| **X1b** ✅ | **Beakers are time, not coin** — **BUILT** 2026-09-09 (`docs/bot-priorities.md`, "Batch X1b as shipped"); the user's ruling on flags item (ggg) | `techChain` drops the `explainLump({ science: remainingBeakers })` subtraction — the road is already priced as `researchDelay`, and the lump charged it twice; the beakers are printed at nothing beside it. Hammers keep theirs (stones **queue**); science *gained* keeps its weight as a yield. **Second half, and the ruling's own premise**: the option a node hands over now multiplies by `delayTerm(researchDelay)` like the flats do — it was the one gift folded at full price on a node nobody had researched, and with the lump gone it was the only thing left that could price a military node's distance | **the ruling's own figure met exactly, two of the acceptance's absolutes not reachable.** Negative nodes are now **100% hammer-only on both benches** (main: 26% and 29%) — the beaker debt was the only other subtraction a chain made. Military re-aims **down** on both (71% → **63%**, 85% → **55%**) where the lump alone drives them **up** to 87–88%; the 45% target is X1's own number and cannot be compared, since under this pass's lens today's `main` already reads 70.7%/84.8% where X1 read 40%/44%. Technologies at t150 **39 → 49 and 37 → 47** (X1's were 54 and 40, on a `main` four batches younger). t100 row, sixteen seats: **ten of eleven meters up** — cities 5.9 → 6.1, citizens 32.4 → 35.3, food 99.1 → 104.7, production 50.2 → 53.2, science 37.2 → **42.6**, culture 51.3 → 56.2, faith 15.5 → 20.0, technologies 18.4 → **19.9**; happiness 3.8 → 2.5 is the eleventh, and it is more towns and faster growth meeting X5b's honest keep |
| **X1c** ✅ | **Science's chain-derivative price** — **BUILT** 2026-09-09 (`docs/bot-priorities.md`, "Batch X1c as shipped"); the user's ruling on flags item (ggg), the *gain* half of X1b's *spend* half | `sciencePrice(ctx)` (`src/ai/value.ts`), `hammerPrice`'s twin: the table weight **plus** what one more beaker a turn takes off the road — for each live chain that still owes beakers, the marginal fall in `researchDelay` (`owed ÷ rate − owed ÷ (rate+1)`) times each step's own `rate × (discount(delay − drop) − discount(delay))`, summed. `voiceWeight` returns it for `'science'`, so every fold in the bot reads it through the one door and `explainYields`' label names the premium beside the table. Memoised per `ValueContext`; **no new knob** — the ceiling is `priorities.priceBandHigh`, the band gold, faith, culture and hammers already live in, and the floor is the table (a wait removed is never negative) | **met.** t100 probe (eight seeds, standard map, mean of 16 seats, paired against `main`): science **36.6 → 43.6** (+7.08, t +1.78), technologies **19.9 → 21.3** (+1.44, t +1.90) — both up — with cities 5.50 → 4.88 (−0.62, t −1.32) and buildings 14.9 → 13.0 (−1.94, t −1.82) **inside two standard errors**, treasury flat (335 → 334) and production up 0.8. Buildings **per town** is 2.72 → 2.66, so the building line is the town line and not a queue that stopped raising shelves. The **×2 weight sweep re-run on top of it** buys +13.9 science and +2.0 techs for −1.00 cities (t −2.28), −3.19 buildings (t −2.51) and −14 food: the same trade, twice the size, and outside the noise on both costs — the premium is the half-lever that keeps the map. **The premium's magnitude** (four seeds, both seats, every tenth turn to t100): median 1.27 points against a table of 5–6, mean 3.09; **mean ratio to the table 0.75 over turns 10–50 and 0.43 over 60–100**, and **27 of 80 readings are exactly nought** — an empire between plans or one whose road is past the horizon prices a beaker at the table, which is the shape's own claim. The cap binds on a handful of early boards (the raw premium read **4.5×** the table on turn 40 before it was banded, dearer than a bushel, a hammer and a coin together) |
| **X2** ✅ | **The scope, evaluated** — **built 2026-09-08** (`docs/bot-priorities.md`, "Batch X2 as shipped") | `townsAdmitting(ctx, scope)` over `cityScopeAdmits` and `workedHexesAdmitting(ctx, effect)` over `tileConditionHolds`, both memoised per `ValueContext` on the row's own object; **eighteen arms** re-counted; `routeEndsHere` and `terrainBeside` closed | **met.** A coastal clause reads **0 towns and scores exactly 0** in a landlocked realm and 1 with one hex of water; Petra's `terrainBeside` reads 0 → 1 on one desert hex; the Bank's `routeEndsHere` reads 0 → 1 on one live caravan. **Six of six boards moved**, both halves (towns · hexes) moving all six alone, and **five of the six first diverge on a Statecraft draft** — three of them now *pass* an offer they used to take; the sixth swaps the Great Lighthouse for a scout. Cost on one identical board: **+1% at t75 and +2.8% at t150** on the minimum, inside the median's own spread |
| **X3** ✅ | **The faith book prices the piece** — **BUILT** 2026-09-08 (`docs/bot-priorities.md`, "Batch X3") | `faithPlan`'s building loop gains the `foldCity` delta (memoised per sitting with the gold loop's, `townFolds`); `faithRowTerms` dispatches on markers — `isCombatant` → `explainSoldier` + the mirror (`mirrorRowFor` × `unitStampStrength`), `foundsCity` → the expansion chain, the lump only for a row none describe; `ownsAny` becomes the levy's surplus charge (`levyReading`, handed in through `WantInputs.levy`) | **Gurdwara 0.00 → 48.40 for 117🕯** (0.000 → 0.414 a coin), **Templar 36.00 → 120.00 for 80🕯** (0.450 → 1.500 a coin, the fold naming the War Elephant it rides as), and the bank **spent** — the seat's first decision on that board is `purchaseItem {gurdwara, faith}`. On **this pass's own bench the four seats do not move at all**, and that is the finding's blind spot rather than the fix's: no seat on either seed founds a house-opening faith, adopts Holy Order or raises a Cathedral, so the faith book on those boards holds rites and the ladder and none of the three rows repriced here. Science and culture per turn at t150 identical on all four seats |
| **X4** ✅ | **The paper remembers** — **BUILT** 2026-09-08 (`docs/bot-priorities.md`, "Batch X4 as shipped") | `src/ai/dealMemory.ts`: a `WeakMap` on the live state — the harness's, no schema — keyed on the paper's own JSON **and** a fingerprint of what the rival holds that the paper asks after, lapsing at `war.refusalMemoryTurns` (20, one new knob); filled at all four seams a paper is answered through — `driveSeat`, the stepper's `step`, `answerAudience`, and `answerDealOf` (`controls.ts`) for a **person's** Refuse; `swapDecision` answers its own refusal once with coin from `counterTerms`, and closes the pair when *that* is sent back | **met, and the loop had moved seeds.** On today's `main` (X1–X3 landed) the before-bench reads **14 papers on 4242 and 77 on 20260903**, not this audit's 92 and 0 — the loop is board-dependent and not rare. After: **14 → 2 and 77 → 8**, declines with them, and the whole-game command count falls by *exactly* the papers that stopped being written (955 → 931; 1,167 → **1,029**, 12%) — a proposal and its decline leave the board identical, so the loop was pure overhead. **Deals struck stay 0 on both boards and the reason is upstream**: seat 1 holds `whales×1` / `silk×1, gold×1`, so every paper the arm can write asks for the rival's *last* copy, which their own hard clause refuses and no coin buys. On an arranged board (two duplicates each of a kind the other lacks) the paper is written, answered and **signed** — `test/sim/aiDiplomacy.test.ts`. A **person's** Refuse fills the same memory (the Deal panel's only path, `answerDealOf`), which is the loop as the user reported it — and against a person the counter is reachable, where bot-against-bot it never is (a rival holding two copies signs the straight swap at even). One gap written down: the **peace** arm re-sues after a refused envoy and cannot be keyed the same way, since a peace offer has no row in the proposals register |
| **X5** ✅ | **The two missing signs** — **BUILT** 2026-09-08 (`docs/bot-priorities.md`, "Batch X5 as shipped") | `explainCitizen` charges the **marginal** `happinessDemand` at `meterWeight`'s live price as a signed line; `explainBuildingRow` folds `cityHp` through `buildingCityHp` at the strength line's rate and its own `1 + threat`; both on a `signDoor` for the attribution | **the wall half met, the citizen half not.** On W1's siege bench a threatened town's front row goes **Warrior 17.80 → Palisade 19.23** (the Palisade was 4.81, fifth). On the eight-seed sweep (sixteen seats) each half *alone* leaves the seats happier at t150 (Σ 42 → 60 citizen, → 67 wall) but **together they found 13 more towns** (96 → 109) and read **9/16 at the price ceiling against 4** with Σ 28. The reason is a finding: `explainCitizen`'s **one** caller is the settler's arm, which *subtracts* it, so charging the citizen makes a settler cheaper — and `growthTerm`/`tileWants` deliberately read the ground rather than this fold, so the growth channel is still uncharged. See below |
| **X5b** ✅ | **The growth channel charged** — **BUILT** 2026-09-08 (`docs/bot-priorities.md`, "Batch X5b as shipped") | **Four** arms now fold one line through one leaf — `citizenKeepTerm` (**`src/ai/citizen.ts`**, the sixth leaf; `wants.ts` stands on `chain.ts`, so the line both fold could live in neither): `explainCitizen` (the settler's relief, X5's), `growthTerm` (the focus arm), `tileWants` (the hex purchase, only where a citizen would work the hex), and `expansionChain` (**the town it founds**, asked at a population of nought, beside the over-spend threshold rather than replacing it — `short.happiness` still prices the meter). Read at the town's **current** population, so no command moves the appraisal that produced it; on a `keepDoor` for the attribution | **the meter is repaired, the yields are not, and the arm that still moves them is X5's *wall*.** t100 bench (eight seeds, standard map, mean of 16 seats) — X4 39.7 citizens · 129.0 food · 46.7 sci · +1.0 happiness · 5.9 cities; X5 32.0 · 100.2 · 35.2 · **−0.7** · 6.2; **X5b whole 32.5 · 100.8 · 35.5 · +2.9 · 5.9**. So happiness ✓ (target +2.5) and cities ✓ (floor 5.6); citizens, food and science ✗. Splitting X5's own halves on the same bench names the cause: the **citizen** half costs 3.7 citizens / 10 food / 4.4 sci, the **wall** half costs **9.2 / 34.4 / 8.6** with the town count *falling* — hammers into palisades, not granaries. t150 sweep (16 seats, duel): towns 109 → **118**, Σ happiness t150 28 → **86**, ceiling 9/16 → **7/16** (the ruling asked ≤ 4/16 — not met), focus orders 373 → 412, science/turn 490 → 359, culture/turn 748 → 843. Nothing in X5b prices a wall; re-aiming `cityHp` became **X5c's** (built 2026-09-09, the row above) |
| **X5c** ✅ | **The wall priced as a share** — **BUILT** 2026-09-09 (`docs/bot-priorities.md`, "Batch X5c as shipped") | `explainBuildingRow`'s `cityHp` line stops being points of strength and becomes X8's `healsAdjacent` shape: `hp / cityMaxHp(town with the row) × cityBaseStrength(town) × weights.military × (1 + threat)`. Every quantity is an existing reading — `buildingCityHp` for the row, `cityMaxHp` and `cityBaseStrength` for the town, the strength line's own rate and the same threat factor — and **no new knob**. The town is the caller's, or this empire's middling one through a `middlingTown` beside `townPopulation` (the line wants two readings of *one* town) | **met on the three columns the ruling named.** t100 probe (eight seeds, standard map, mean of 16 seats), the line **shut** · **X5's points** · **X5c's share**: citizens 35.56 · 32.38 · **35.19**; food 118.1 · 99.1 · **116.9**; science 36.25 · 30.91 · **38.13**; cities 5.31 · 5.88 · **5.25**; techs 19.75 · 18.44 · **19.75**; production 50.9 · 50.2 · **52.1**; treasury 242 · 233 · **250**. So the share costs 1.0% of the citizens and 1.1% of the food and **gains** 5.2% of the science, against the points' 8.9% / 16.1% / 14.7% — a tenth to a fifteenth of the bill, which is noise on this bench. The raw line on W1's siege bench falls **375 → 26.09** (15 hit points on a bar of 115 is 0.130 of it; that town's whole defence is worth 40), and the Palisade's turn of build effort reads **4.81 shut · 19.23 points · 5.81 share** — **fifth of nine · first · fourth**, so the wall's rank *rose one place* rather than fronting the queue, which is the ruling's stated second arm. One column not met and written down as a **non-finding**: contentment reads +3.67 shut · +3.75 points · **−0.89** share — non-monotone across three arms whose values are monotone, paired difference −4.6 ± 7.1 over seats spanning −14.8…+11.4, i.e. trajectory divergence rather than a price |
| **X6** ✅ | **`tileWants` earns its 21%** — **BUILT** 2026-09-09 (`docs/bot-priorities.md`, "Batch X6 as shipped") | `pricedOffers` (`wants.ts`) replaces the `purchasableTiles` walk with two cuts: a hex nobody would work and no seam sits on is **not priced at all** (its want folded to nought anyway), and the rest are ranked by **worth per coin** — the book's own ordering — with the best `expansion.hexOffersPriced` (4, one new knob) put to `tilePurchaseError`. The frontier and the purse are asked cheaply in the bot to decide what to *ask about*; the rule still decides what may be bought. `hexDoor` is the switch | **met, and with nothing given up.** The arm goes **19.2% → 5.1%** of a turn and `tilePurchaseError` **13.3% → 0.3%** (the same profile, the same trajectory; the profiled game 52.9 s → 30.9 s). Mean ms/turn t100–150 **768.6 → 314.1** and **1238.1 → 671.3** (−59%, −46%); on one identical board in alternating blocks, **21–38% off the minimum**. `purchaseTile` is **unchanged hex for hex**: six duel boards at 150 turns and eight standard boards at 100 play **byte-identically** with the door shut or open, and every column of the t100 row is equal to the decimal. **The audit's 142/206 are not reachable on this tree** and the batch is not why — seed 4242's game has grown from this pass's 1,256 commands to 3,624 since X1 re-aimed the tree. Two corrections to the row above: there is no `foldCity` hypothetical in this arm (the town's context has been hoisted since batch 9 — the audit's hoist was already shipped), and the cost was never the appraisal but `tilePurchaseError`'s writ clause, which reads `meterEffects` → `explainHappiness` → `controlledHoldings`, the empire-wide walk, **once per offered hex**. `bestExpansionTile`'s ring was measured against and rejected: it ranks by the culture's preference and the book buys by worth per coin |
| **X7** ✅ | **The march is re-asked** — **BUILT** 2026-09-09 (`docs/bot-priorities.md`, "Batch X7 as shipped") | `reaskTheMarch` (`bot.ts`, `housekeeping`'s third waking arm) reads `unitOfferedForOrders` once per seat-turn beside `firstBlocker`'s narrow one and re-asks **the arm that ordered the piece**; three clauses keep it from churning — the same destination is silence, a stand-down never cancels a march, and `driver.reaskPerTurn` (1, a new knob, nought shuts the arm) bounds the **ask** rather than the order; the reason rides the chosen candidate as a zero-valued `ValueTerm` at the head of its fold | **met.** Arranged: a settler whose site a rival founds on mid-walk re-aims inside one turn, the same board unchanged draws no command at all, a spade whose planned row another spade lays re-plans. Measured re-issues, 150-turn duel, 300 seat-turns: **87 (0.29/seat-turn) on 20260903 and 30 (0.10) on 4242**, against **880 and 179 marching pieces** — a third to a tenth of the ceiling the bound allows. The whole-game command counts are a *diverged game* and not a growth reading: 765 → 1,048 on one board and 3,324 → **515** on the other (the before-run there spent 2,462 commands on a march oscillation). t100 probe (eight seeds, 16 seats): **every column inside one standard error** — cities 5.9 → 5.7 (±0.5), citizens 32.4 → 31.6 (±3.0), food 99.1 → 95.5 (±10.4); gold/turn, happiness and techs lean up by less than their own spread and are not claimed |
| **X8** ✅ | **The rows nobody reads** — **BUILT** 2026-09-08 (`docs/bot-priorities.md`, "Batch X8 as shipped") | `explainBuildingRow` folds `crowdingRelief`, `unitUpkeepRebate`, `ritePays`, `purchaseDiscount` and `healsAdjacent` beside X5's `cityHp`, each through `buildingEffects.ts` asked of `{ buildings: [id] }`; `unitStat` dispatches on `.stat` (a percentage *of* a piece · a share of a piece's bar · a point of its quality); `siteRefusal` is the printed refusal's reading; `BUILDING_ROW_FOLDED` / `BUILDING_ROW_SILENT` (`value.ts`) are the register, and four `buildingEffects` readers took `buildingCityHp`'s widening | **met, and with the batch's own finding in it: four of the nine fields were already paid.** `tileYields` and `irrigates` reach the appraisal through the caller's `foldCity` hypothetical (`cityContext` → `buildingTileLines` / `buildingsIrrigate`), so a term here would have paid twice — the audit's "biggest of the nine" was the one already read. The register test reads `BuildingDef`'s own field names out of the source: **all forty-nine accounted for, fourteen folded and thirty-five excused in a line each**, and a fiftieth field that is neither fails core. `waters` is the one of the nine left unread and it names its reason (the growth channel has no price at all — X5's finding (c)) |
| **X1d-ground** ✅ | **The ground nobody works** — **BUILT** 2026-09-09 (`docs/bot-priorities.md`, "Batch X1d-ground as shipped"); the user's rulings on flags item (ggg): the worker's craving, the settle site, the renewal, the pass | `explainWorkerCraving` (`plan.ts`) folds the plan's unclaimed entries a spade's own `charges ÷ chargeCost` buy, on hexes `citizenSeats` says a citizen works or the next few would (`assignableTiles` × `yieldScore`, `pop + 2` — `chooseCitizens`' own greedy, read not re-implemented), each at `delayTerm` of its own landing turn (walk ÷ movement + the turn digging, cumulative), with existing spades' `chargesLeft` taken off the front; `explainSite` (`bot.ts`) counts the ring's hexes a town would work inside the horizon off `growthThreshold` and `foodPerCitizen`, each discounted at its citizen's arrival, and reads the ground through the **seat's own** `yieldContextFor`; `renewalFoldFor(ctx, tech)` is the town's fold with `TileYieldContext.techs` + the node against its standing fold over the worked hexes, memoised per node on a `WeakMap` keyed by the context, and `plannedRiderTerms` asks the same hypothetical per hex with the candidate improvement on it; `skipCandidate` folds `expectedBestOrder(pool, size, skips + 1) − expectedBestOrder(pool, size, skips)`. **Two knobs retired**: `workers.planFalloff`, `site.ringFalloff` | **met on every column the ruling named.** t100 probe (eight seeds, 16 seats, paired against `main`): **workers built by t30 1.44 → 1.00**, **draft hands passed per 120 turns 3.38 → 0.00**, food **116 → 127** and citizens **34.6 → 35.9** (both above main), cities 4.94 → 5.38 inside a standard error. **Two costs written down**: production 51.7 → 42.1 and the treasury 345 → 238 — greener, wider empires that plough where their citizens stand instead of mining hills nobody works, which is the ruling's own trade; and the probe's ms/turn 32.3 → 51.9 is a **diverged-game** figure, since on one identical board (seed 1 at t60, six alternating blocks of thirty decisions) the seat's whole deliberation reads 0.72–0.78 ms with both arms on against 0.67–0.70 with them shut. `surveyUpgradeSites` is superseded and kept only for `chain.ts`' `renewalSteps` until that one call is swapped |
| **X9** | **The great person, bought and fed** | `OFFER_PURCHASES` joins the two books as three rows priced by `explainGreatPerson`'s own reading; `explainGreatPerson` folds the family feed | a seat holding 500💰+ at t150 spends it; the offer rows appear in the feed |
| **X10** | **The wonder, chased** | `requiresSite` read as a *site* the expansion chain could satisfy; a wonder of the age as a chain with `weights.bead`/`victory` and an honest delay | a seat beelines a wonder it can reach and founds toward one it cannot |
| **X11** | **The wager want** (blocked on G1–G3) | a fourth chain in `chain.ts`; the count-deed reading answered once in a leaf for both the Wager and `racePays` | the chain lights when the age turns; a seat's queue changes on a wager it can meet |

## X1 as built (2026-09-08) — and the one number this pass got wrong

The mechanism, the full before/after table and the variant that was measured and
rejected are in `docs/bot-priorities.md`, "Batch X1 as shipped". Two corrections
to what is written above:

- **Finding 1's arithmetic is right and its acceptance was not.** The levy's
  shortfall now prices the unit step's hammers (`levyReading`, moved into
  `campaign.ts` so the chain and the town read one levy) and the ×3 is charged
  against that same shortfall, and the military beeline broke as predicted: 63%
  and 67% of re-aims down to **40%** and **44%**, technologies at t150 up on both
  benches (32 → 54, 36 → 40). But *"a pass that leaves the negative share above
  half has not fixed it"* was a claim about the wrong side of the subtraction.
  Split by kind, this audit's own before-bench reads **military nodes 27% and 26%
  negative · everything else 70% and 74%**, so zeroing every military negative
  leaves 56% and 59% — above half before a line was written. The negative share
  is a reading of the **building** side's price standard (P1's hammers and S1's
  beakers over a road up to `research.goalHorizon` long), and it also *rises* with
  an empire's own progress: on the same after-run it ran 65% at t0–50 and 94% at
  t100–150, because a seat holding 27 technologies is weighing what is left of the
  tree. It wants a depth-normalised measurement of its own before anything is
  tuned against it.
  **Corrected 2026-09-09 by X1b, and the correction is bigger than a share.** "The
  negative share is a reading of the building side's price standard" was half
  right: it was a reading of **two** subtractions, and the beaker one was not a
  cost at all. Research always runs, so a road's beakers are a *wait* and never a
  spend — the chain already prices the wait as `researchDelay` and discounts every
  payoff through it, and the lump charged the same thing a second time (the user's
  ruling, flags item (ggg), 2026-09-09). With the lump gone every negative node on
  both benches is **100% hammer-only**, which is the reading this bullet asked for.
  The headline share is unchanged (72% → 76%, 71% → 71%) and the rest of this
  bullet stands: it is a reading of P1's hammers over a long road, and it rises
  with an empire's own progress, so a batch that grows the tree raises it by
  succeeding. What is no longer true is that S1's beakers are in it.
- **The military share this audit measured is not reproducible.** X1 read 40% and
  44% of re-aims military on these two benches the day it landed; X1b's probe
  reads the *same* two benches on today's `main` at **70.7% and 84.8%** under a
  stated lens (the chosen node unlocks a piece `isCombatant` and not an explorer).
  Either X1's throwaway probe counted something else or the four batches since
  re-armed the beeline, and neither can be settled without a probe of record in
  the tree. Until there is one, an absolute military target is a number nobody can
  reproduce; X1b therefore claims the **direction** (down on both boards) and says
  so.
- **The levy surplus charge belongs to the town, not to the chain.** Finding 1's
  second consequence — *"the unit term folds no levy surplus charge"* — was built
  and measured: folded whole into `unitTerm` beside the premium it prices a
  soldier at nothing the moment the levy is full, and a seat on seed 4242 fell
  from eight towns to two. The chain prices a *node*; the town's arm prices the
  next spear. Charging the shortfall once, in the premium, is the half that plays.

## What this audit does not claim

The gaps are not the priority system failing — it is doing exactly what its five
batches said it would, and the two largest findings (the negative tech table, the
faith ceiling) are the system **correctly reporting** that the board changed under
it: P1 and S1 moved two of the three prices in `techChain`'s subtraction and nobody
moved the third, and H12 made the faith price honest before the faith rows were
worth anything. Both are one-sided arithmetic, not architecture. And the 79 ms mean
turn is the batch-6 hoist holding under an empire five times the size of the one it
was measured on.
