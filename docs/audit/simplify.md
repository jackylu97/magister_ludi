# The simplification audit — what the feature passes cost the codebase (2026-09-06)

The user's ask, verbatim: *"I'm also worried about feature bloat and what that's
done to the codebase. Please look carefully for logic that can be simplified, or
sections of code that could be unified/made simpler."*

Read-only audit. Every figure below is counted, not estimated; the commands that
produced them are reproducible from the tables. Correctness of the bonuses is
`docs/audit/bonuses.md`'s question and unbuilt/deprecated code is
`docs/audit/dead-code.md`'s — neither is answered here.

**The headline.** The codebase is not sprawling in the ordinary way. Rule 5, rule
6 and the leaf discipline have held: 24 `fold*` functions, one `arriveOnTile`,
one `stepCost`, one `anyCardDef` over ten card classes, one `createPopover`.
What has grown past its readers is **the effect vocabulary and the number of
places every member of it must be taught**. A card shape today needs an arm in
the evaluator, an arm in the describer 4,000 lines away, and an arm in the bot's
scorer in another file — and 24 of 46 shapes never got the third, so 161 live
rows are worth exactly zero to every AI seat. That, plus a luxury table that is
a second dialect of the same vocabulary with a second evaluator, plus nine
copy-pasted modal shells, is where the bloat actually lives.

---

## 1. The size table

`lines` is the file; `code` excludes blank lines, `//` lines and `/* */` blocks.
`doc%` is the remainder — docblocks are deliberate (hard rule 6) and a high
figure is not a defect, but it changes what "8,822 lines" means.

| # | file | lines | code | doc% | exports | fns | switch | case |
|---|---|---|---|---|---|---|---|---|
| 1 | `sim/statecraft.ts` | 8823 | 4791 | 46% | 161 | 200 | 11 | 241 |
| 2 | `ui/controls.ts` | 7237 | 3053 | 58% | 39 | 194 | 3 | 15 |
| 3 | `ai/bot.ts` | 6404 | 3474 | 46% | 16 | 151 | 3 | 16 |
| 4 | `sim/cities.ts` | 6126 | 2506 | 59% | 134 | 152 | 0 | 0 |
| 5 | `main.ts` | 4597 | 2471 | 46% | 0 | 71 | 1 | 3 |
| 6 | `sim/state.ts` | 4403 | 714 | 84% | 59 | 45 | 0 | 0 |
| 7 | `sim/commands.ts` | 4328 | 1910 | 56% | 65 | 79 | 2 | 118 |
| 8 | `render3d/geometry.ts` | 4236 | 2367 | 44% | 117 | 111 | 0 | 0 |
| 9 | `sim/statecraftData.ts` | 3881 | 793 | 80% | 115 | 19 | 0 | 0 |
| 10 | `ui/cityPanel.ts` | 3366 | 1821 | 46% | 31 | 71 | 0 | 0 |
| 11 | `sim/religion.ts` | 3062 | 1380 | 55% | 94 | 110 | 0 | 0 |
| 12 | `sim/combat.ts` | 2755 | 1068 | 61% | 44 | 46 | 0 | 0 |
| 13 | `render3d/lookData.ts` | 2552 | 1205 | 53% | 65 | 13 | 0 | 0 |
| 14 | `render3d/board3d.ts` | 2422 | 1258 | 48% | 24 | 40 | 0 | 0 |
| 15 | `ui/techTree.ts` | 2328 | 1059 | 55% | 8 | 46 | 1 | 9 |
| 16 | `ui/compendium.ts` | 2269 | 1554 | 32% | 21 | 67 | 1 | 15 |
| 17 | `render3d/badges3d.ts` | 2242 | 1000 | 55% | 54 | 44 | 0 | 0 |
| 18 | `render3d/renderer3d.ts` | 2084 | 1120 | 46% | 2 | 1 | 0 | 0 |
| 19 | `ai/value.ts` | 2065 | 911 | 56% | 40 | 66 | 4 | 35 |
| 20 | `sim/tech.ts` | 1745 | 654 | 63% | 45 | 52 | 1 | 10 |

Totals: `src/` 152,944 lines; `test/` 111,629; `data/` 18,874.

**Readings.** `state.ts` and `statecraftData.ts` are 84% and 80% prose — they are
schema files, not implementation, and their length is not a problem to solve.
`statecraft.ts` has 161 exports and 200 functions in one module: it is four
modules in a trenchcoat (§4.1). `controls.ts` has 194 functions and 39 exports —
almost all of it is inside one closure (§4.2). `commands.ts` carries 118 `case`
arms across two switches and only 2 exported functions: 1,538 lines of it are
command interface declarations before the first handler.

### Data

| table | rows | retired | deferred |
|---|---|---|---|
| `statecraft.json` orders | 212 | 45 | 22 |
| `buildings.json` buildings | 87 | 10 | 11 |
| `greatPeople.json` people | 80 | 0 | 3 |
| `techs.json` techs | 50 | 0 | 6 |
| `statecraft.json` doctrines | 46 | 4 | 8 |
| `resources.json` resources | 43 | 0 | 1 |
| `units.json` units | 43 | 1 | 0 |
| `beads.json` quests | 24 | 0 | 7 |
| every other table | 184 | 2 | 12 |
| **total** | **769** | **62** | **70** |

62 retired rows are kept for saves (correct, hard rule). 70 rows carry a
`deferred` half — a ratified text whose shape does not exist. That is the true
measure of vocabulary pressure: one row in eleven is waiting on a shape.

---

## 2. Duplications

| what | where (2+) | the difference | proposal | risk | size |
|---|---|---|---|---|---|
| **The luxury evaluator is a second card evaluator** | `sim/resourceEffects.ts` (1,108 ln) vs `sim/statecraft.ts` | Six private helper *names* are duplicated between them — `scopeAdmits` (`resourceEffects.ts:241` / `statecraft.ts:2294`), `scopeNote` (`:285`/`:2447`), `label` (`:301`/`:2516`), `liveEffects` (`:339`/`:1423`), `cityCount` (`:698`/`:2072`), `scopeWords` (`:1092`/`:7586`), `signed` (`:1105`/`:6107`, byte-identical). `ResourceCityScope` is 4 words; `CityScope` is 27 and contains 3 of them. `ResourceRule` is documented at `resourceData.ts:170` as *"a subset of `CardRule`"*. Five kind names (`productionBonus`, `rulePercent`, `empireYields`, `percentYields`, `happinessTierBoost`) exist in **both** unions | Fold `ResourceEffect` into `CardEffect` and delete the second evaluator; a luxury becomes a card class in `anyCardDef`'s cascade, the eleventh. See §4.3 | High — yields, saves untouched but every luxury number reroutes | ~900 lines removed, ~250 added |
| **A card shape must be taught in three files** | apply: `statecraft.ts:2543`, `:3593`, `:4163`… · describe: `statecraft.ts:6443` · score: `ai/value.ts:1184` | The third was never wired for 24 of 46 shapes; `scoreEffect`'s `default: return 0` (`ai/value.ts:1344`) makes the omission silent. 161 of 681 live effect rows (24%) score zero | Make `scoreEffect` exhaustive on the aliased discriminant (the reducer's idiom) so a new shape stops compiling until the bot has an opinion. Separately: move `describeEffect` beside its evaluator arm (§4.1) | Low to add the exhaustiveness check; medium to fill the 24 arms (changes bot play) | +24 arms, ~200 lines |
| **The modal shell, nine times** | `ui/tradeScreen.ts:1082–1152`, `diplomacyScreen.ts:1210–1285`, `religionScreen.ts:1063–1151`, `statecraftScreen.ts:1086–1230`, `ledgerScreen.ts:874–935`, `reliquaryScreen.ts:278–416`, `beadsScreen.ts`, `compendium.ts:2124–2269`, `greatPersonCeremony.ts` | `isOpen`/`open`/`close`/`draw`/`onKeyDown`/`setExpanded`/`dispose`/`toggle` are re-typed each time and have already **drifted**: `tradeScreen.open` has no `if (isOpen()) return` guard where `religionScreen.open` does; `tradeScreen` binds the ground click on `mousedown`, the rest on `click`; only `religionScreen` restores focus to `trigger` on close; only `tradeScreen` resets its own view state on close | One `createSheet({overlay, body, closeButton, trigger, draw})` in `ui/sheet.ts` beside `popover.ts`; each screen keeps only its `draw` | Low — pure UI, covered by `test/ui/screenLifecycle.test.ts` | ~550 lines removed |
| **The unit-verb boilerplate in `controls.ts`** | 26 `xBlocker()` functions, ~10 with a paired committing verb — `fortify`/`fortifyBlocker` (`:4597`), `sleepUnit`/`sleepBlocker` (`:4626`), `disband` (`:4708`), `skip` (`:4755`), `prospect`, `chop`, `pillage`, `removeImprovement`, `consecrate`, `autoExplore` | Each blocker is `selectedUnit() ?? undefined` + `canOrder()` + `xError(...)`; each verb is blocker-check + `commit` + `reject` + `invalidate` + `refreshOverlays` + `onUpdate`. The differences are exactly three flags: does it drop the selection, does it hop to the next idle piece, does it ask `canOrder` itself | A `unitVerb(name, errorFn, {keepsSelection, advances})` factory inside the closure | Low | ~350 → ~90 lines |
| **`src/proto3d/` is a fork of `src/render3d/`** | 20 identically-named functions across `proto3d/{geometry,hash,palette,toon,board}.ts` vs `render3d/{geometry,hash,lookData,toon,layout,board3d}.ts` — `flatten`, `merge`, `hexPrism`, `mountainPeak`, `pineTree`, `roundTree`, `rock`, `lathe`, `hash3`, `hashUnit`, `hashSigned`, `hashDisc`, `shade`, `desaturate`, `saturate`, `makeGradientMap`, `positionKey`, `computeHullNormals`, `heightClassOf`, `tileScale`, `tileYaw`, `buildSubstrate`, `addDecorations`, `buildBoard` | `proto3d` is the frozen look-dev prototype behind `proto3d.html` (a **ninth** root page; CLAUDE.md says eight). The renderer moved on; the prototype did not | Retire `proto3d.html` and the directory, or make it import `render3d/`. Defer to `docs/audit/dead-code.md` for the retire/keep call — flagged here only as 1,793 duplicated lines | Nil if retired | 1,793 lines |
| **Four "occasion" vocabularies** | `WindfallOccasion` (20, `statecraftData.ts:1827`) · `TallyOccasion` (5, `:1400`) · `BeadOccasion` (13, `beadData.ts:131`) · triumph triggers (17, `triumphs.ts:253`) | Ten words are verbatim in two of them: `ageEntered`, `wonderCompleted`, `cityFounded`, `cityCaptured`, `governmentAdopted`, `beliefConsecrated`, `discoveryClaimed`, `campCleared`, `battleWonAgainstStronger`, `cityOnOtherContinent`. Three separate hook registers announce the same moments | One `Occasion` union in a leaf, three consumers subscribing to it. `awardOccasion` (`triumphs.ts:212`) already has the shape of the hook | Medium — the triumph `once`/`perAge`/`contested` scopes must survive | ~200 lines, and one register instead of three |
| **Three "count" vocabularies** | `CountKind` (35, `statecraftData.ts:968`) · `BeadCount` (28, `beadData.ts:174`) · `CombatScaleCount` (4, `:688`) | `cities` is in two. The bead counts are all empire-scale readings the card counts could express; `CombatScaleCount` is deliberately separate (documented at `statecraft.ts:4624`: a fight has a piece and no city — a good cut, keep it) | Merge `BeadCount` into `CountKind`; leave `CombatScaleCount` alone | Medium — bead thresholds are balance numbers | ~28 arms → 0 |
| **`grantWords` twice** | `sim/beads.ts:677` and `sim/statecraft.ts:7225` | A bead's boon and a card's grant are the same payout shape said in two describers | The bead adapter already exists in `anyCardDef` (`isBeadCardId` arm, `statecraft.ts:1130`) — route the words through it too | Low | ~80 lines |
| **`signed` four times** | `sim/statecraft.ts:6107`, `sim/resourceEffects.ts:1105` (byte-identical), `ui/religionScreen.ts:405`, `ai/value.ts:884` | The first two are identical; the third differs only in the sign test's direction (same behaviour); the fourth uses a different rounder | One in a leaf beside `roundYield` | Nil | ~20 lines |
| **`withArticle` twice** | `ui/compendium.ts:346`, `ui/controls.ts:905` | `'aeiouAEIOU'.includes(name[0])` vs `/^[aeiou]/i.test(name)` — same answer | One in a UI leaf | Nil | ~6 lines |
| **`prefersReducedMotion` five times** | `ui/beadModal.ts:195`, `toasts.ts:60`, `turnSplash.ts:62`, `controls.ts:766`, `damageNumbers.ts:66`; plus `wantsMotion` in `cardStamp.ts:349`, `greatPersonCeremony.ts:142`, `offerCard.ts:104` | Two names for one media query, eight copies | One `ui/motion.ts` | Nil | ~40 lines |
| **`element()` 23 times, `requireElement()` 6** | every `src/ui/*Screen.ts` + `main.ts:196`, `proto3d/main.ts:27`, `piecesGallery/main.ts:24`, `mapgenPage/main.ts:77`, `flairGallery/main.ts:53`, `abacusSpike/main.ts:36` | Identical `document.createElement` + `className` helper, retyped per module; `requireElement` retyped per root page | One `ui/dom.ts`; root pages import it | Nil | ~120 lines |
| **The bot's march arms** | `marchToSite` (`bot.ts:4554`), `escortMarch` (`:4797`), `warMarch` (`:5642`), `campMarch` (`:5717`), `undefendedCity` (`:5786`), `holySiteStep` (`:6138`) | All six are: gather candidate hexes → sort by a key → probe the first `ai.search.pathProbes` with `findPath` → return the first pathable one with a `candidates` list. `warMarch`'s own docblock says it *"is `campMarch` with a different quarry"*. The guards `townsAreHeld` + `isRedundant` are duplicated word-for-word in two of them | One `marchTo(state, unit, quarry[], {key, label, summary})`; each arm supplies only the quarry list and the sort key | Medium — the bot's decision feed prints these candidate lists verbatim; `test/sim/aiBot.test.ts` pins some phrasing | ~400 → ~180 lines |
| **`nearestHostile` / `nearestSightedHostile`** | `bot.ts:4713` and `:5550` | The second adds one `isVisibleTo` clause and returns the hex as well as the distance. Its own docblock calls it *"`nearestHostile`'s fog-honest twin"* | One function with `{sighted: boolean}`; always return the hex | Low | ~35 lines |
| **`holdsWild` / `holdsRival`** | `bot.ts:5579` and `:5609` | Deliberately partitioned so the two never overlap — documented, and the partition is load-bearing for `favourableBlow` | **Leave.** The docblock states the reason and it is a real one | — | — |
| **`hasFoundedReligion` twice** | `ai/wants.ts:1468`, `ai/bot.ts:3301` | Identical | One in `ai/`'s leaf | Nil | ~10 lines |
| **`round`/`round1` six times** | `ai/wants.ts:1481`, `ai/value.ts:880`, `ai/chain.ts:1416`, `ai/plan.ts:754`, `ai/bot.ts:6304`, `ai/diplomacy.ts:798` | Same one-decimal formatter under two names | One in `ai/`'s leaf | Nil | ~30 lines |
| **`validateTable` four times** | `greatPeopleData.ts:269`, `improvementData.ts:590`, `resourceData.ts:773`, `triumphData.ts:191` | Same load-time row validator per table | One generic in a data leaf | Low | ~120 lines |
| **`hash3`/`hashUnit` three times** | `render3d/hash.ts:18`, `proto3d/hash.ts:15`, `render/spriteManifest.ts:258` | `render/` is FROZEN; `proto3d` is the fork above | **Leave** the frozen copy; the `proto3d` copy goes with §2's fifth row | — | — |
| **`fold*` ×24, `explain*` ×36** | across `sim/` | Rule 5's own pattern — one list, one fold, one explainer per figure | **Leave.** This is the discipline working; do not "unify" it | — | — |
| **`anyCardDef` cascade over ten classes** | `statecraft.ts:1106` | Memoised, one register, documented | **Leave.** This is the unification, already done | — | — |
| **The `xError` / `xBlocker` split** | 64 `xError` in `sim/`, 26 `xBlocker` in `controls.ts` | Deliberate: the sim owns the rule, the UI adds only the seat's questions | **Leave the split**, factor the boilerplate (row 4) | — | — |

---

## 3. Vocabulary

### 3.1 `CardEffect` — 46 shapes, 681 live rows

Live-row counts across `statecraft.json`, `buildings.json`, `greatPeople.json`,
`religion.json`, `techs.json`, `beads.json`. `bot` = has an arm in
`ai/value.ts:1184`'s `scoreEffect`.

| shape | rows | bot | merge into |
|---|---|---|---|
| `countScaled` | 115 | ✓ | — (the load-bearing shape) |
| `tileYield` | 69 | ✓ | — |
| `cityYields` | 65 | ✓ | — |
| `windfallRider` | 49 | — | — |
| `unitStat` | 41 | ✓ | — |
| `combatLine` | 40 | ✓ | — |
| `percentYields` | 38 | ✓ | absorbs `buildingYieldPercent`, `productionBonus`, `rulePercent` (see below) |
| `productionBonus` | 32 | ✓ | `percentYields` with `yield: 'production'` and a build-category filter |
| `happiness` | 31 | ✓ | — |
| `rulePercent` | 24 | ✓ | `percentYields` with a `rule` target instead of a `yield` target |
| `authority` | 13 | ✓ | pairs with `happiness`; one `meterFlat` shape with a `meter` field |
| `unlocksBuilding` | 12 | — | — |
| `effectAmplifier` | 11 | (partial) | one `amplifier` shape with `cardYieldAmplifier` — the two differ only in what they multiply |
| `cityStat` | 10 | — | — |
| `periodic` | 10 | ✓ | — |
| `rateConversion` | 9 | — | pairs with `yieldConversion`; one `conversion` shape with a `from` that is a rate or a yield |
| `yieldConversion` | 9 | — | ditto |
| `meterRule` | 9 | — | with `actionRule`/`behaviorRule`/`metaRule`/`conditionRule`/`cityRule` → **one `rule` shape with a namespaced id** (24 rows across six shapes today) |
| `pressureRule` | 8 | — | — |
| `buildingYieldPercent` | 7 | ✓ | `percentYields` with a building-category selector |
| `routeRider` | 6 | — | with `offerRider`, `foundingRider`, `purchaseRider`, `projectRider`, `windfallRider` → **one `rider` shape with an occasion** (73 rows across six shapes) |
| `offerRider` | 6 | ✓ | ditto |
| `foundingRider` | 6 | — | ditto |
| `conditionRule` | 6 | — | the `rule` merge |
| `slotPosition` | 6 | ✓ | — |
| `purchaseRider` | 5 | — | the `rider` merge |
| `cardYieldAmplifier` | 5 | ✓ | the `amplifier` merge |
| `actionRule` | 5 | — | the `rule` merge |
| `routeYield` | 4 | ✓ | — |
| `renown` | 4 | ✓ | — |
| `happinessTierBoost` | 3 | ✓ | — |
| `upkeepRebate` | 3 | ✓ | — |
| `periodShorten` | 3 | ✓ | a modifier on `periodic`, not a shape |
| `unitStamp` | 2 | — | — |
| `behaviorRule` | 2 | — | the `rule` merge |
| `metaRule` | 2 | — | the `rule` merge |
| `pantheonSlots` | 2 | — | — |
| `pressure` | 2 | — | — |
| `cityRule` | 1 | — | the `rule` merge |
| `periodicOffer` | 1 | — | `periodic` with an offer payout |
| `periodicMuster` | 1 | — | `periodic` with a unit payout |
| `zocRule` | 1 | — | the `rule` merge |
| `projectRider` | 1 | — | the `rider` merge |
| `mirrorYield` | 1 | — | — |
| `cityRenownPercent` | 1 | ✓ | `percentYields` with `yield: 'renown'` |
| `empireYields` | **0** | ✓ | **delete** — no live card row; the word survives only as a luxury kind |

**The reading.** Sixteen shapes carry three rows or fewer; one carries none.
Three merges — **rider** (6 shapes, 73 rows), **rule** (6 shapes, 24 rows),
**percent** (5 shapes, 105 rows) — would take 46 shapes to **32** without
touching a single balance number, because in each family the shapes differ only
in *which occasion* or *which target* they name, and the occasion/target is
already a field elsewhere in the union.

**23 shapes have no arm in `scoreEffect`** (`ai/value.ts:1184`, default at
`:1344` returns 0), covering **161 of 681 live rows**. `windfallRider` alone is
49 rows the bot cannot see. None of `windfallRider`, `unlocksBuilding`,
`cityStat`, `rateConversion`, `meterRule`, `yieldConversion`, `pressureRule`,
`foundingRider`, `routeRider`, `conditionRule`, `actionRule`, `purchaseRider`
appears anywhere in `src/ai/`.

### 3.2 `ResourceEffect` — 15 shapes, 60 live rows, its own evaluator

| shape | lux rows | card twin | merge into |
|---|---|---|---|
| `perCityYields` | 19 | `cityYields` | `cityYields` (+ `scope: 'owner'`) |
| `bonus`/`luxury`/`strategic` (row kinds, not effects) | 40 | — | — |
| `empireYields` | 9 | `empireYields` (0 rows) | one shape, one evaluator |
| `extraHappiness` | 7 | `happiness` | `happiness` (+ `per: 'city'`) |
| `buildingCategoryYields` | 5 | `buildingYieldPercent` | flats vs percent — one shape with both fields |
| `improvementYields` | 2 | `tileYield` | `tileYield` + an improvement condition (`TileCondition` already has one) |
| `productionBonus` | 2 | `productionBonus` | **same name, two evaluators** |
| `rulePercent` | 1 | `rulePercent` | **same name, two evaluators** |
| `routeYields` | 1 | `routeYield` | singular/plural of one idea |
| `renownPerCity` | 1 | `cityRenownPercent` | — |
| `unitUpkeepRebate` | 1 | `upkeepRebate` | — |
| `connectionPercent` | 1 | `rulePercent` | documented at `resourceData.ts:174` as a one-consumer shape *because* the rule vocabularies could not be shared |
| `perPopulationYields` | **0** | `countScaled` (`population`) | delete |
| `authoritySupply` | **0** | `authority` | delete |
| `percentYields` | **0** | `percentYields` | delete |
| `happinessTierBoost` | **0** | `happinessTierBoost` | delete |

**Four of fifteen luxury shapes have no live row and every one of them has an
identically-named card twin.** `ResourceCityScope` (4 words) ⊂ `CityScope` (27).
`ResourceRule` (3 words) ⊂ `CardRule` (9) — stated in the source. This is the
clearest case in the codebase of *two ideas wearing three vocabularies*: a
luxury's signature, a card's effect, and a building's `effects` array are the
same shape, and two of the three go through the same evaluator already.

### 3.3 Sub-vocabularies with members no live row names

| union | where | members | never named in `data/` |
|---|---|---|---|
| `CountKind` | `statecraftData.ts:968` | 35 | `luxuryCopies`, `garrisonWatch`, `workedHills`, `visibleCamps`, `chargedAugurs` (5) |
| `CityScope` | `:246` | 27 | `holding`, `garrisoned`, `hasBuildingYielding` (3) |
| `WindfallOccasion` | `:1827` | 21 | `completion`, `pillageTrader` (2) |
| `CombatCondition` | `:576` | 18 | none |
| `TileCondition` | `:807` | 16 | none |
| `PressureRuleId` | `:2935` | 12 | none |
| `EmpireCondition` | `:520` | 9 | `cityCountAtLeast`, `any` (2) |
| `CardRule` | `:1495` | 9 | `borderCost` (named only by the luxury table's `ResourceRule`) |
| `AmplifierTarget` | `:1693` | 8 | `triumphRenown` (1) |
| `RateSource` | `:1448` | 7 | `goldPerTurn` (1) |
| `MeterRuleId` | `:1558` | 7 | `authorityUnitProductionExempt` (1) |
| `ActionRuleId` | `:1593` | 6 | `unitJumpsQueue` (1) |
| `OfferRiderScope` | `:1806` | 6 | none |
| `BehaviorRuleId` | `:1642` | 5 | `barbariansPassive`, `noCampClearing`, `noHealAbroad` (3) |
| `TallyOccasion` | `:1400` | 5 | none |
| `CardLine` | `:211` | 13 | `cloister` (1) |

**26 union members across sixteen unions are named by no live row.** Each still
costs an evaluator arm, a describer arm, and — where `scoreEffect` covers the
shape — a bot arm. `BehaviorRuleId` is 3 of 5 dead. This is not dead code in the
usual sense (the register test proves each is *read*); it is vocabulary with no
speakers.

### 3.4 Building markers — 87 rows, 44 distinct fields

| field | rows | reading |
|---|---|---|
| `name` `category` `cost` and the seven yields | 87 | the schema |
| `renown` | 69 | — |
| `note` · `effects` | 47 · 47 | — |
| `wonder` | 27 | a real class |
| `faith` | 14 | — |
| `requiresSite` · `unlockedByCard` | 12 · 12 | two *gates*: "needs a hex" and "needs a card" |
| `authorityCapacity` · `deferred` | 11 · 11 | — |
| `requiresBuilding` · `retired` · `onComplete` | 10 · 10 · 10 | `requiresBuilding` is a third gate |
| `oncePerEmpire` | 9 | a fourth gate |
| `happiness` · `cityHp` | 8 · 7 | — |
| `routeSlots` | 5 | — |
| `productionBonus` · `cityStat` · `tileYields` | 4 · 4 · 4 | all three are `effects` entries written as top-level fields |
| `faithPurchases` | 3 | a fifth gate (which bank buys here) |
| `waters` · `acceptsContributions` · `awaitsTech` | 2 each | `awaitsTech` is a sixth gate |
| **one row each** | 1 | `article`, `consecrated`, `purchaseOnly`, `grantedOnly`, `worldUnlockTech`, `endsTheGame`, `ritePays`, `healsAdjacent`, `purchaseDiscount`, `crowdingRelief`, `placed`, `unitUpkeepRebate` |

**Twelve fields exist for exactly one building each.** Each needs a schema line, a
reader, usually a describer clause, and a test. Two groups are one idea wearing
several names:

- **The gates** — `requiresSite`, `requiresBuilding`, `unlockedByCard`,
  `awaitsTech`, `worldUnlockTech`, `oncePerEmpire`, `purchaseOnly`,
  `grantedOnly`, `faithPurchases`. Nine fields answering "when and how may this
  be had". Merge into one `availability: {site?, building?, card?, tech?,
  worldTech?, unique?, bank?}` object read by one `buildError` clause list.
- **The stray effects** — `productionBonus`, `cityStat`, `tileYields`,
  `unitUpkeepRebate`, `purchaseDiscount`, `crowdingRelief`, `healsAdjacent`,
  `waters`, `ritePays`. Nine fields that are `CardEffect` shapes hoisted to the
  top level of the row. Move them into `effects` and delete nine readers.

`article` on one row is a copy fix, not a schema field.

---

## 4. Structure — the four large simplifications

### 4.1 Split `statecraft.ts` (8,823 lines, 161 exports, 200 functions)

The file is four modules with one import cycle keeping them together. The
sections are already marked: `205–1039` the ladder and the draw, `1040–2068`
what is live, `2069–2519` conditions and scopes, `2520–6007` the evaluators
(counts, flat yields, tile yields, percentages, meters, combat, stats,
windfalls, hooks), `6008–8235` **the words** (2,228 lines), `8236–8822` the
ladder, picks, slots and adoption.

The words section is the clean cut: `describeEffect` (`:6443`) is a 46-arm
switch that reads nothing but a `CardEffect` and the word tables. Lifting
`6008–8235` into `statecraftWords.ts` removes a third of the file and nothing
crosses that boundary but types. What it **does not** fix is the real cost — an
effect's evaluator arm and its describer arm still live in different files. The
better shape, once the §3.1 merges have cut 46 shapes to 32, is one file per
*family* (`cardYields.ts`, `cardRiders.ts`, `cardRules.ts`) with each shape's
apply-arm and describe-arm adjacent; `statecraft.ts` keeps the draw, the slots,
the ladder and `liveEffects`.

*Removes*: ~2,200 lines from the largest file; the 4,000-line distance between
an arm and its sentence. *Risks*: the module's documented function-level import
cycle with `religionData.ts` (type-only both ways — must stay type-only);
`test/mapgen/moduleCycles.test.ts` is the gate. `describeCard` is imported by
`compendium.ts`, `controls.ts`, `cityPanel.ts`, `compendiumShelves.ts` and four
tests — a re-export keeps them compiling. **Do this third**, after §4.3, so the
split happens once against the merged vocabulary rather than twice.

### 4.2 Break `createGameControls` (7,237 lines, one closure, 194 functions, ~120-member interface)

`GameControls` exposes about 120 members and every one of them closes over the
same six locals (`getGame`, `localPlayerId`, `renderer`, `commit`, `reject`,
`onUpdate`). Twenty-six of them are `xBlocker` functions and about ten more are
their committing verbs (§2 row 4). The sections are already marked in the source
(`2358`–`6815`, twenty-six `// ---` banners).

The split that costs nothing: pull each verb family into a module taking a small
`VerbContext` — `controls/unitVerbs.ts` (fortify, sleep, disband, skip,
auto-explore), `controls/groundVerbs.ts` (improve, chop, prospect, remove,
pillage, buy tile), `controls/faithVerbs.ts` (the prophet and great-person
blocks, `5013`–`5731`, ~700 lines), `controls/tradeVerbs.ts` (`3490`–`3789`).
`createGameControls` becomes the assembly plus selection, hover, clicks and the
turn handover.

*Removes*: ~2,500 lines from `controls.ts` and ~260 lines of blocker/verb
boilerplate. *Risks*: `test/ui/controls.test.ts` reads this file's source in 8
places — those pins move with the code, and two of them (`siegeTail`,
`routeReading`, both also defined elsewhere) should be checked first. The
`MapView` boundary is untouched. **Do this second** — it is independent of the
sim work and unblocks nothing, so it can run in parallel.

### 4.3 One effect vocabulary, one evaluator

The luxury table is a second dialect (§3.2): 15 shapes of which 4 are unspoken
and 11 have card twins, evaluated by a 1,108-line module whose six private
helpers share names with `statecraft.ts`'s. `resourceData.ts:170` already
documents `ResourceRule` as a subset of `CardRule` *"so a word this table knew
and the cards did not would be a word that fails to compile"* — the constraint
is acknowledged; the merge is the way to stop paying for it.

The move: `ResourceEffect` becomes `CardEffect`; a resource row's `signature`
becomes a `CardDefBase` with `effects`; a luxury joins `anyCardDef`'s cascade as
the eleventh class; `resourceEffects.ts` shrinks to the *copies* arithmetic
(`copiesFor`, `endpointLuxuryCount`, the tier gates) and the fold helpers that
`cities.ts` calls, with every `kind` switch deleted. `ResourceCityScope`,
`ResourceRule`, `scopeAdmits`, `scopeNote`, `scopeWords`, `label`, `signed`,
`cityCount`, `liveEffects` and `describeOne` all go.

*Removes*: ~900 lines, one evaluator, one scope union, one rule union, four dead
shapes, and the standing hazard that the two `productionBonus` implementations
drift. *Risks*: **highest in this document.** Every luxury yield reroutes;
`test/sim/resourceEffects.test.ts` is 1,611 lines and `docs/luxuries.md` is the
reference doc with (per CLAUDE.md) a sync test. Determinism is safe — no
iteration order changes if the fold order is preserved — but the *floors* must
be checked line by line, because `foldResourceYields` and `applyStages` round at
different points today. Saves are safe (`{config, log}`). The bot gains 60 rows
it could not see. **Do this first**, because §4.1's file split should happen
against the merged vocabulary, and because the three §3.1 merges (rider, rule,
percent) are the same kind of work and should ride along.

### 4.4 Make the bot's scorer exhaustive; unify the march

Two independent changes to `src/ai/`:

`scoreEffect` (`ai/value.ts:1184`) ends in `default: return 0`. Replacing it
with the reducer's aliased-discriminant idiom (`switch (kind)` + a `never`
default) makes a new shape a compile error until the bot has an opinion, which
is the same guarantee `orderedUnitId` gives commands. Filling the 23 missing
arms is separate work and *is* a play change — 161 rows currently score zero, so
the seats will pick differently and `test/sim/aiBot.slow.test.ts` will move.

Six of `bot.ts`'s arms are one algorithm (§2 row 13). `marchTo(state, unit,
quarry, {key, summary})` collapses ~400 lines to ~180 and removes the two
duplicated guards (`townsAreHeld` + `isRedundant`).

*Risks*: the decision feed's candidate labels are pinned in
`test/sim/aiBot.test.ts` and `aiWants.test.ts` by phrase; the unification must
keep each arm's own `summary` string or those pins move. **Do this fourth** —
the exhaustiveness check first (mechanical, catches the next shape), the arms
last (a balance change).

---

## 5. The source-reading pins

130 `?raw` glob imports across 78 test files. They divide three ways.

| kind | count | example | verdict |
|---|---|---|---|
| **Structural facts** — "this function's body reads these fields", "these two functions ask the same question", "this list has these members" | ~35 | `test/sim/statecraft.test.ts:6015` (`bodyOf`/`fieldsOf`, then `walk.filter(…)).toEqual(NOT_AN_INPUT)`) | **Keep.** These pin an invariant a type cannot: that a memo prints every input it reads. Cheap, and they fail for the right reason |
| **Register lists** — a source list must equal a data-derived list | ~20 | `test/ui/seatRoster.test.ts`, `test/sim/statecraftDocSync.test.ts:33`, `test/sim/greatPeopleDocSync.test.ts:32`, `test/render/pieces3d.test.ts:1551` (`signUnits`'s field list) | **Keep.** This is the doc-sync pattern CLAUDE.md mandates and it works |
| **Phrasings** — an assertion on a code fragment's exact text | ~13 | `expect(bodyOf('liveReading')).toMatch(/conditionDepth > 0/)` (`statecraft.test.ts:6091`); the `/heldReligions\(state, playerId\)/` probe at `:6076` | **Loosen.** A regex over a call expression breaks on a rename or a destructure that changes nothing. Where the fact is "this reading is condition-gated", assert the *behaviour* — evaluate a gated card at depth and at depth 0 and compare — not the source token |

**The register that would replace twelve pins.** `test/sim/statecraft.test.ts`
carries the *schema-witness* pattern: fixture cards written for each engine shape
(the `withCards` helper at `:6110`, `docs/fewer-things-plan.md` batch A's seven
shapes), each proved by its own `it`. Every schema bump re-aims all of them. One
table — `SHAPES: [kind, fixtureEffect, expectedFold][]` — driven by a single
`it.each` over `CardEffect['kind']` would (a) collapse the twelve, (b) fail
automatically when a new `kind` joins the union with no row, which is exactly the
guarantee the register test is meant to give and currently gives only for
*reads*, not for *coverage*.

No test reads source with `node:fs`; all 130 go through Vite's `?raw`, which is
the right mechanism. The pins are, on the whole, a strength — 55 of ~68 pin
facts. Only the ~13 phrase pins are brittle, and they are concentrated in one
`describe` block.

---

## 6. Ranked — lines removed × risk⁻¹

| # | simplification | lines | risk | why here |
|---|---|---|---|---|
| 1 | **One modal shell** (`ui/sheet.ts`) for the nine screens | ~550 | very low | Pure UI, already covered by `screenLifecycle.test.ts`, and it *fixes* four live divergences (the missing `isOpen` guard, `mousedown` vs `click`, focus restore, state reset) rather than just shortening |
| 2 | **Retire `src/proto3d/`** (or point it at `render3d/`) | 1,793 | nil if retired | 24 duplicated function names; a ninth root page CLAUDE.md does not list. Confirm against `docs/audit/dead-code.md` before deleting |
| 3 | **The shared leaves**: `ui/dom.ts` (`element`, `requireElement`), `ui/motion.ts` (`prefersReducedMotion`/`wantsMotion`), one `signed`, one `round`, one `withArticle`, one `hasFoundedReligion`, one `validateTable` | ~350 | nil | 46 copies of seven functions. Mechanical, no behaviour |
| 4 | **`scoreEffect` exhaustiveness** — aliased discriminant + `never` default | +10 | very low | Does not change a single decision today; makes the next shape impossible to forget. The one-line version of the codebase's biggest structural leak |
| 5 | **`unitVerb` factory** in `controls.ts` | ~260 | low | Ten near-identical blocker/verb pairs; the three flags that differ are visible in the source |
| 6 | **The three `CardEffect` merges** — rider (6→1), rule (6→1), percent (5→1) — plus delete `empireYields` | 46 → 32 shapes; ~400 lines of arms | medium | No balance number moves: each family's members differ only by a field the union already carries. Data rows rewrite mechanically |
| 7 | **Split `controls.ts`** into four verb modules | −2,500 from the file | medium | Parallel-safe; 8 source pins move with the code |
| 8 | **Fold `ResourceEffect` into `CardEffect`** (§4.3) | ~900 | **high** | The largest single win and the largest risk. Do it first among the sim changes so the rest happens once |
| 9 | **Split `statecraft.ts`** — words out, then per-family | ~2,200 moved | medium | Do after #8 so the cut is made against the merged vocabulary |
| 10 | **`marchTo` in `bot.ts`** + one `nearestHostile` | ~250 | medium | The candidate-list phrasings are pinned by test; the arms' summaries must survive verbatim |

Below the line, worth doing in the same passes but not ranked: merge the four
occasion vocabularies (§2 row 6), merge `BeadCount` into `CountKind` (row 7),
one `grantWords` (row 8), the nine building gate-fields into one `availability`
object and the nine stray top-level effect fields into `effects` (§3.4), and
delete the 26 union members no live row names (§3.3) once
`docs/audit/dead-code.md` confirms nothing else holds them.

---

## 7. The blunt version

Three systems are two ideas wearing three vocabularies:

- **Luxuries and cards.** Same shapes, same scope words, same rule words, two
  unions, two evaluators, two describers, six identically-named private helpers.
  Four luxury shapes have never been spoken by a row.
- **Occasions.** `WindfallOccasion`, `TallyOccasion`, `BeadOccasion` and the
  triumph triggers announce the same ten moments under three hook registers.
- **Counts.** `CountKind` (35) and `BeadCount` (28) count the same empire. Five
  members of the first and every member of the second could be one union.

And one system has outgrown its readers: **46 card shapes, 23 of which the bot
cannot see at all.** Every feature pass added shapes; only some passes added the
third arm. The cheapest fix in this document — an exhaustive `switch` in
`ai/value.ts` — is also the one that stops it happening again.
