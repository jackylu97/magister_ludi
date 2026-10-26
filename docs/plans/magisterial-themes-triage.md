# Batch MG triage: the Magisterial themes pass

**Status:** written 2026-10-25 by a triage agent that changed no code and no data, before any batch in this plan. It is the plan to build the Magisterial deck as `docs/plans/magisterial-themes.md` and `docs/plans/magisterial-list-proposed.md` now stand: the themes pass of 2026-10-23 and your comments and answers of 2026-10-25 (section 12). Section 12 outranks sections 2 to 11. You asked to begin the build and did not answer section 10 one by one, so every recommendation of sections 10 and 11 is a reading here, as it was for Commerce. The readings below are the ones the build uses unless you change them. Mark any you disagree with, as on the deck sheets.

Source: the two plan docs above, `docs/decks/magisterial.md` (the sheet of 2026-10-06, in the old format), `data/decks/magisterial.json`, the rows of `data/decks/common.json` that name Magisterial, `docs/plans/review-revisions-2026-10-25.md` (batch R1, treated as done) and sections 11 and 12 of `docs/plans/devotion-themes.md`. Facts were checked against the code at commit `155106c9` (branch `decks`), with R1's edits in the working tree. This plan's batches are MG1 to MG17. The Devotion plan's batches are DV1 and on, and they may run at the same time in a second worktree.

**Groups:**
- **1, data only:** the text can be written with shapes that exist today. The cell names the shape.
- **2, new shape, no new player decision:** the behaviour is automatic, or uses UI that exists. The cell names what is missing.
- **3, waits on you:** no card. Three questions at the end ask you to confirm a reading; each card can be built with the recommended answer.

Each cell starts with the batch that builds the row.

## Facts the cells rely on

**The sheet, the data and the tests.**
- `data/decks/magisterial.json` holds 77 Order rows: 62 live, 15 deferred, none retired. No row carries a `type`. The deck has no Doctrine rows. Checked.
- The pass keeps 15 of these rows: `magisterialMasterMasons`, `civicGranaries`, `theTempleOfTheMuses`, `magisterialTheLaureate`, `magisterialTheGuildOfMasons`, `theWorkingCourt`, `theLearnedPatron`, `theSenateCharter`, `theMastersDomain`, `theHonouredDead`, `theLivingCanon`, `theWonderCommonwealth` (live), and `theGoldenAge`, `magisterialTheMagistersCourt`, `theLastCommission` (deferred; the last two at band 3). The other 62 rows (the 61 the sheet cut on 2026-10-06, and The Performers' Treasury) retire: 50 live and 12 deferred. Checked.
- No other card of the target list has a data row. The Markstones and Gifts at Court (cut in section 12) have none. Checked.
- `data/decks/common.json` holds 17 rows that name Magisterial. 13 carry a type. The four without one are The Imperial Examinations (live), Triumphal Arches (deferred), Sacred Commissions (live, band 1) and Sacred Patronage (deferred, band 3). The Rising Nave has no row. The Art Dealers already reads "+3 gold for each card seated in your government" (R1, in the working tree). Checked.
- `docs/decks/magisterial.md` is in the old format: statuses built, revised, new and deferred, no Type column. No test reads it as a sheet. Checked.
- `test/sim/decks/magisterial.test.ts` pins the file card for card against the Magisterial tables of `docs/six-decks-first-cut.md`, pins `retired` undefined on every row and no row in band 4, and its fold test pins Civic Granaries' +2 food and +2 production, Hearth Ceremonies, The Grand Fairs and The Civic Assemblies. Each of these changes in MG1. Checked.
- Other tests that name a row MG1 retires: `test/sim/statecraft.test.ts` seats The Great Chancery, The Provincial Stages, The Civic Commonwealth and The Great Patrons directly, and lists The Patrons' Road and The Muses' Call in `ORDERS_USING_A_SHAPE`, a register that lists retired rows too. `test/sim/occasionRiders.test.ts` seats The Chronicle of Works directly. No test names The Imperial Examinations or Triumphal Arches by id. Checked.
- `test/sim/decks/sortedSheets.ts` lists `SORTED_DECKS = ['dominion', 'expansionist', 'scientific', 'commerce']`. `dominion.test.ts` fails a typed row that no sorted sheet lists. Checked.
- Commerce batch T1 is the model for the sheet test (`test/sim/decks/commerce.test.ts`, "the sheet of record"): the statuses and their reasons (`deferred`, `revised`, `reworked`, `moved`, `rarity`, `shared`, `as built`), the two counts tables, every live or deferred row listed once, retired rows off the tables and untyped, the shared table mirrored onto `common.json`, and every shared row that names the deck listed. **A shared row must have a row in `common.json` unless it is marked `add`, and an `add` name may be no row's name.** Checked.
- `docs/orders-and-doctrines.md` has a Magisterial shelf of live rows, mirrored by `test/sim/statecraftDocSync.test.ts`, and lists The Imperial Examinations and Travelling Players on its Cross-type table. `test/fixtures/cardText.json` is rewritten with `CARD_TEXT_WRITE=1 npx vitest run test/sim/cardTextSnapshot.test.ts`. Checked.
- `test/sim/decks.test.ts` pins the number of dealt Orders (582 at `155106c9`; R1 changes it). Checked.
- `SCHEMA_VERSION` is 175 (`src/sim/state.ts`). Fifteen test files pin it with `toBe(175)`: `purchase`, `worldClock`, `census`, `sunkProgress`, `war`, `meters`, `statecraft`, `decks`, `state`, `religion.slow`, `visibility`, `beads`, `tech`, `cities` and `improvements`. The explore digest (`test/sim/explore.test.ts`) moves with the version. `test/sim/state.test.ts` also pins the turn's phase list. Checked.

**The draft** (`statecraft/draft.ts`, `religion.ts`).
- A hand's price is `draftCost(n)` = floor(12 + 5n + n^2.2). `nextDraftCost(player)` and `planDraft(player, culture)` take the player and no state, so they cannot read a card. Eight places outside the module read a price, through these two or `draftCost` itself: `src/ui/topBar.ts`, `src/ui/empireDrawer.ts`, `src/ui/statecraftScreen.ts` (two, one of them the tier after next), `src/ai/wants.ts`, `src/ai/bot.ts` and `src/ai/value.ts` (two). Checked.
- `settleDraft` knows the price (`plan.cost`), but the offer stores none: `OrderOffer` holds `options`, `positions` and `rerolled`. `openFreeDraft` deals a free hand and moves neither the draft count nor the price. Checked.
- `cardDrafted` (Commerce T7) is paid by `payCardDrafted`, called last in `applyChooseOrder` (`commands.ts`), at the capital, with no facts. It fires for a pick, a charter pick and a free-draft pick, never for a pass. `draftPassed` is paid by `settleOrderSkip` after it deletes the hand and raises `orderSkips`, at the capital, with no facts. Checked.
- A `freeDraft` grant opens a hand through `openFreeDraft`, refused while an Order draft or a Doctrine offer waits (`freeDraftCanOpen`). Checked.
- `offerRider` has `offer`, `extra`, `rule` and `family`, and no count. `routeRider` has `count`, `per` and `max`, read through `countOf` in `cardRouteSlots`. The base Order hand is 3 cards and `rules.offers.max` is 5. Checked.
- Rerolls: `rerollError` (`religion.ts`) is the one refusal. The `rerollOffers` rule (the Rihla's) frees the first redraw of an Order, Doctrine or great-person hand in either bank, and opens rerolls before Chronology (`rerollDoorOpen`). No rule refuses a reroll. Checked.
- `OrderDef.onDraft` takes only unit grants (`Extract<CompletionGrant, { grant: 'unit' }>`), raised by `raiseOnDraft` (`cities.ts`) from the pick. `CompletionGrant` already has a `greatPerson` arm and a `doctrineDraft` arm. Checked.
- `CountKind` has `slottedOrders`, `unslottedOrders`, `slottedOrdersOfSlot` and `chartersDrafted`. None counts every Order held, the Doctrines held, or decks. `slottedOrdersOfSlot` counts a card's own type (an unsorted card counts as its chair's type) and counts itself. Checked.

**The council** (`statecraftData.ts`, `statecraft/draft.ts`, `statecraft/evaluator.ts`).
- `orderFitsSlot(order, chair)` takes no state and no holder: a Wildcard chair takes any card, a typed chair takes its own type or an unsorted card. Callers: `slotOrderError` and `reseatOrders` (`draft.ts`), `src/ui/statecraftScreen.ts`, `src/ai/value.ts`, `src/ai/bot.ts` (five), `src/sim/cardImpact.ts` and `src/flairGallery/cardFaces.ts`. Checked.
- `adoptGovernmentAt` spends the banked offer, lays out `chairCount` chairs, zeroes `rerollsTaken`, re-seats (`reseatCouncil`: the malices, then `reseatOrders`, which keeps each card that still fits its chair, then seats Wildcard cards, typed cards in their own type, typed cards in Wildcard chairs and unsorted cards, and lifts every seal), then awards the Triumph `governmentAdopted` (`awardOccasion`), then draws the Doctrine offer at the offer's tier. **No card rider is paid.** Checked.
- Chair mixes (Military / Economic / Civic / Wildcard): the Chiefdom 1/1/0/1, so it has **no Civic chair**; the Republic 0/3/1/1, Tyranny 3/1/0/1, the Theocracy 1/0/3/1; every tier-18 and tier-26 government has every type. Checked.
- Doctrines held are `PlayerStatecraft.doctrines`. Only Dominion has Doctrine rows (16, 15 live). `doctrineBagFor` keeps the seat's decks; an empty bag opens no offer. A building's `doctrineDraft` grant (`cities.ts`) opens an offer at the current government's tier, and is skipped while an offer waits or the bag is empty. Checked.
- `slotPosition` is read in `deckModifierLines`: it multiplies the seated card's lines in a town's fold and in the empire's fold. Hex lines are not reached (`tileAmplifierLines` reads only `cardYieldAmplifier`), and neither are conversions (`cardYieldConversions`, folded later in `yields/town.ts`). Checked.
- `cardYieldAmplifier` reaches the town, empire and hex lines of every Order but its own. With `on`, it reaches only hex lines where both tile tests hold, and it reads the line's bag, never a percentage. Checked.

**Great people** (`greatPeople.ts`).
- `spendGreatPerson` is the one place a person is spent, reached by the act (`greatPersonActAt`) and the work (`greatPersonWorkAt`). It pushes the legacy once, records the `greatPersonSpent` tally (with the work, if one was laid), and removes the unit. **No windfall occasion fires there.** `greatPersonAct` is paid after the act's own pay; `greatPersonGained` in `settleGreatPersonChoice`. Checked.
- A great person carries no charges: `Unit.chargesLeft` is a builder's marker, set in `createUnit` from `UnitDef.charges`. Checked.
- Legacies are `Player.legacies` (`id`, `age`, `revoked`), `liveEffects`' sixth source, pushed once each and revoked by marking. Checked.
- `grantGreatPersonOffer` deals an offer when the seat may call great people and none waits; otherwise it pays the renown to the next rung. Checked.
- A `toOpus` grant goes to the town raising the Opus, or into `Player.opusBank` when no town is. Riders have `oncePerTurn` and `perAge`. Checked.

**Works and land.**
- Six improvements carry `greatPerson`: academy (scholar), landmark (artist), manufactory (engineer), customs house (merchant), citadel (general) and holy site (prophet). The `greatWork` tile test reads that marker. Checked.
- Only the citadel claims hexes (`claimsNeighbours`), through `claimAround` with `PEOPLE.citadelClaimRadius`, and it takes ground a rival owns. The holy site does not claim. Checked.
- `payWorkLaidRiders` (`improvements.ts`) pays `improvementBuilt` riders for a worker's build and for a great person's work, with the improvement as the only fact. A rider's `on` test reads `WindfallOccasionFacts.hex`, which only `tilePurchase` carries. A prophet's holy site (`plantHolySiteAt`, `religion.ts`) pays no work-laid riders. Checked.
- A hex `pays` line may carry `perNeighbour` (any tile test) with `max` in helpings, and `percent`, a share of the improvement's own yield and its renewals. Tile tests include `any`, `all`, `beside`, `greatWork`, `hills`, `water`, `terrain` and `feature`. `tileConditionHolds` gets the ring of six and the empire's `GroundFacts` (`groundFactsFor`), nothing wider. Checked.
- `CombatCondition` has no test for a unit standing on a work. Checked.
- Town scopes `hasWonder`, `notHasWonder`, `raisingOpus` (the front row), `workingTiles` with `atLeast`, and `markedBy` exist. Checked.

**Wonders and purchases** (`cities.ts`, `purchase.ts`).
- `claimWonderFor` records `wonderAnywhere` for every empire, then `refundBeatenWonders` refunds every other town that banked toward the wonder: the hammers at any position of its queue (`bankedTowardItem`: the front basket or the bucket parked under the row), at 1 gold a hammer. Checked.
- No tally counts a wonder this empire completes, or production put into a wonder. A tally's amount may be a figure (`goldSpent` counts the coin). Checked.
- `PurchaseCurrency` is `'faith' | 'gold'`. `purchaseError` refuses a wonder before the currency, with three lifts: the Valley of Kings and The Pious Masons (faith) and The Gilded Scaffold (gold). The Magnum Opus is `endsTheGame`, not a wonder (`isWonder`). The `wonders` count is `wondersHeldBy`. Checked.

**Commissions** (`commissions.ts`).
- `CommissionFigure` has 17 members. None counts Orders held, chairs by type, families of works, a work's neighbours, or one town's wonders and works. `commissionGoalTown` names a town only for `oneTownWorkedHexes` or a counted goal's facts. Checked.
- `CommissionReward` has `wildcardChairs`, `greatPerson`, `yield` and `amount`, `markTown` and `lasting`, and no Doctrine offer and no land claim. Checked.
- A `counted` goal reads a `TallyOccasion` while the card is seated; a `reached` goal reads a figure at the end of each turn. Checked.

**The bots** (`src/ai/value.ts`, `data/ai.json`).
- `value.ts` switches exhaustively on `CardEffect` kinds, `WindfallOccasion`, `TallyOccasion` and rule ids. `score` has groups for `dominion`, `scientific`, `expansionist` and `commerce`, and none for `magisterial`. Checked.
- The bot's pass candidate (`skipCandidate`, `bot.ts`) prices the pity a pass buys, not what pass riders pay. Bots seat cards through `orderFitsSlot`. Checked.

**Where the code differs from the pass.**
- **The Siting Masters, The Quarter of Masters and The Golden Age need no new shape** (section 7 lists The Quarter of Masters as a new shape and the other two as near existing). The Siting Masters is `perNeighbour` with an `any` test and `max`. The Quarter of Masters is a hex `percent: 100` on a work `beside` a work. The Golden Age is a `completion` rider whose grant hangs a `timed` effect with `renews`.
- **A holy site does not claim the hexes beside it.** Sections 2 and 4.3 say a citadel and a holy site both do. Only the citadel claims, and it takes a rival's ground. The Landmark Bounds' "unowned" claim is new behaviour.
- **A lost race refunds the hammers at any position of the queue**, not the front row only (the sunk-progress rule). Section 2, section 4.4 and CLAUDE.md's Wonders trap say front row only.
- **The Last Commission needs a filter.** A `toOpus` grant banks in `Player.opusBank` when no town raises the Opus, so "no Opus under construction means no payout" is a new test.
- **The Grand Vizier never doubles a conversion.** The pass left this for the triage: The Working Court and The Learned Patron are folded apart from the lines the Vizier reads.
- **A Doctrine offer as a reward is near existing.** A wonder's `doctrineDraft` grant already opens one at the government's tier.
- **The pass's "15 live rows" are 15 rows:** 12 live and 3 deferred.
- **"Commission: The Votive Monument" clashes** with three Devotion names a Magisterial seat can hold beside it: The Votive Gifts, The Votive Fields and the Votive Offering rite. This plan names it Commission: The Eighth Wonder (question 1).

## Tier 0

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Prytaneion | new; revised (section 12) | 1 | MG2. `pays` `where: 'city'`, `basis: 'count'`, `count: 'slottedOrders'`, `to: 'food'`, `amount: 1`. Uncommon, Economic (reading 1). |
| The Polemarch | new | 1 | MG2. The retired The War Council's line: `combatLine` `amount: 2`, `side: 'both'`, `when: { test: 'always' }`, `scaled: { count: 'slottedOrdersOfSlot', slot: 'military' }`. It counts itself and the partner's Military cards (reading 31). Common, Military. |
| The Court Painter | add; revised | 1 | MG2. `windfallRider` `cardDrafted`, grant `renown: 15`. The moment is Commerce T7's (reading 9). Common, Civic. |
| The Cornerstone | add; reworked | 1 | MG2. `productionBonus` `category: 'wonder'`, `percent: 30`, `scope: { test: 'notHasWonder' }`. Common, Economic. |
| The Repertory | add | 1 | MG2. `pays` `where: 'city'`, `basis: 'count'`, `count: 'buildingsOfCategory'` (culture), `within: 'city'`, culture 1 (The Temple of the Muses' form). Common, Civic. |
| The Second Reading | add; rarity | 1 | MG2. `rule: 'rerollOffers'` (reading 10). Uncommon, Wildcard. |
| Commission: The Eighth Wonder (name to confirm) | new (section 12) | 2 | MG4. Missing: a `TallyOccasion` for a world wonder this empire completes, written in `claimWonderFor` beside `wonderAnywhere`. Goal `counted`, 1. Reward `lasting`: `pays` `where: 'empire'`, `basis: 'count'`, `count: 'wonders'`, culture 3, and `renown` `per: 'wonder'`, `amount: 5` (readings 3, 4; question 1). Uncommon, Civic. |
| Civic Granaries | modify: revised | 1 | MG1. Both `pays` rows 2 → 1. |
| Master Masons, The Temple of the Muses | implemented | – | Built (2). |

The Markstones and Gifts at Court are cut (section 12). Neither has a row.

## Tier I

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Nomarchs | new | 1 | MG2. `pays` `where: 'empire'`, `basis: 'count'`, `count: 'slottedOrders'`, `to: 'authority'`, `amount: 1`, `per: 2` (The Market Writ's form). Uncommon, Civic. |
| The Workshop at Olympia | new | 1 | MG2. `renown` `amount: 2`, `per: 'wonder'`. A new row (reading 45). Common, Civic. |
| The Overseers of Works | new | 1 | MG2. `windfallRider` `greatPersonGained`, `perAge: true`, grant production 100, `toCapital`. Uncommon, Economic. |
| The Siting Masters | add; moved | 1 | MG2. `pays` `where: 'hex'`, `on: { test: 'greatWork' }`, culture 1, `perNeighbour: { test: 'any', of: [hills, terrain mountain, feature forest, water] }`, `max: 3`. The pass lists it as near existing; every field exists (reading 28). Common, Civic. |
| The Keepers of Wonders | new | 1 | MG2. `pays` `where: 'empire'`, `basis: 'count'`, `count: 'wonders'`, `to: 'happiness'`, `amount: 2`. Common, Civic. |
| The Ceremonial Guard | new | 1 | MG2. `cityStat` `stat: 'defense'`, `amount: 5`, `scope: { test: 'hasWonder' }`. Common, Military. |
| The Unveiling | add; revised | 1 | MG2. `windfallRider` `completion`, `wonder: true`, grant `freeDraft`. The 30 culture goes (reading 14). Uncommon, Wildcard. |
| The Encyclopedia | add; moved | 1 | MG2. Two `pays` `where: 'capital'`, `basis: 'count'`, `count: 'unslottedOrders'`, `amount: 1`, `max: 15`: science and culture. Common, Civic. |
| Commission: The Roll of the Senate | new | 2 | MG4. Missing: a `CountKind` of the Orders held and a `CommissionFigure` that reads the same walk. Goal `reached` 10. Reward `wildcardChairs: 1` (exists) (reading 7). Uncommon, Wildcard. |
| The Open Door | add; revised | 2 | MG5. Missing: a discount on the hand's price. The price functions must take the state, and their eight callers move with them (reading 12). Uncommon, Wildcard. |
| The Wandering Muse | add; reworked | 2 | MG6. Missing: `onDraft` takes only unit grants. It widens to the existing `greatPerson` arm, and `raiseOnDraft` pays it through `grantGreatPersonOffer` (reading 15). Uncommon, Civic. |
| The Landmark Bounds | add | 2 | MG9. Missing: the hex on the work-laid moment's facts, and a grant that claims the unowned hexes beside the moment's hex. Then `windfallRider` `improvementBuilt`, `on: { test: 'greatWork' }`, grant the claim (reading 29). Uncommon, Economic. |
| The Laureate, The Guild of Masons, The Working Court | implemented | – | Built (3). |

## Tier II

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Prefects | new | 1 | MG3. `pays` `where: 'city'`, `basis: 'count'`, `count: 'slottedOrdersOfSlot'`, `slot: 'economic'`, `percent: 5`, `stage: 'city'`, to production. Uncommon, Economic. |
| The Symposium | new | 1 | MG3. `windfallRider` `greatPersonGained`, grant `freeDraft` (reading 14). Uncommon, Wildcard. |
| Letters Patent | new | 1 | MG3. `effectAmplifier` `target: 'greatPersonAct'`, `percent: 50`. Uncommon, Civic. |
| The Quarter of Masters | add; revised | 1 | MG3. `pays` `where: 'hex'`, `percent: 100`, `on: { test: 'all', of: [greatWork, { test: 'beside', of: greatWork }] }`. The pass lists a new shape; it exists (reading 27). Common, Civic. |
| The Gazetteers | new | 1 | MG3. Two `pays` `where: 'city'`, `count: 'tilesInBorders'` with the tile test `greatWork`, `percent: 3`, `stage: 'city'`, `max: 10`: production and gold. Uncommon, Economic. |
| The Seven Sights | new | 1 | MG3. Two `pays` `where: 'city'`, `count: 'wonders'`, `percent: 5`, `stage: 'city'`, `max: 6`: culture and science. Uncommon, Civic. |
| The Golden Age | modify: deferred; revised | 1 | MG3 (its text in MG1). `windfallRider` `completion`, `wonder: true`, grant `timed: { turns: 10, renews: true, effects: [percentYields production 20, percentYields culture 20] }` on the empire. Rare, Civic. |
| The Honoured Dead | modify: revised; moved | 1 | MG1. Band 3 → 2. Its two `pays` on the `greatPersonSpent` tally: science 6 → 2 and production 12 → 4, at most 15 helpings (+30 and +60); the text in the grower's words. Uncommon, Civic. |
| The Grand Vizier | new | 1 | MG10. `slotPosition` `slot: 'economic'`, `position: 1`, `factor: 2`. Data only, built late because it rests on question 3 of the pass (reading 25). Rare, Wildcard. |
| The Sed Festival | new | 2 | MG7. Feature G. Then `windfallRider` `governmentAdopted`, grant `greatPerson: 'any'` (reading 17). Rare, Civic. |
| The Accessions Register | add; reworked; moved | 2 | MG5. Missing: the hand's price, stored on the offer and carried as a fact of `cardDrafted`, with an `OccasionMeasure` that reads it. Then grant production `amount: 0.5` of the price, `whole`, `toCapital` (reading 11). Uncommon, Economic. |
| The Unwritten Chapter | add; moved | 2 | MG5. The same fact on `draftPassed`. Then grant science `amount: 0.5` of the price, `whole` (reading 11). Common, Civic. |
| Commission: The Patron's Gallery | add; reworked | 2 | MG8. Missing: a `CommissionFigure` of the families of the works in your borders. Reward `greatPerson: 'any'` and culture 200 (both exist) (reading 32). Uncommon, Wildcard. |
| The Custodians | new | 2 | MG9. Missing: a `CombatCondition` for a unit standing on a great-person work. Then `combatLine` 4, `side: 'both'` (reading 30). Common, Military. |
| The Envious Eye | add; moved; revised | 2 | MG9. Missing: under a rule, `refundBeatenWonders` moves the hammers to the town's next item instead of paying gold (reading 34). Uncommon, Economic. |
| The Senate Charter, The Learned Patron | implemented | – | Built (2). |

## Tier III

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Boule | new | 1 | MG3. Two `pays` `where: 'city'`, `count: 'slottedOrders'`, `percent: 2`, `stage: 'city'`: science and culture. Uncommon, Civic. |
| The Roll of Masters | new | 1 | MG3. Two `pays` `where: 'city'`, `count: 'greatPeopleGained'`, `percent: 3`, `stage: 'city'`, `max: 10`: science and culture. Uncommon, Civic. |
| The Garden Courts | new | 1 | MG3. Two `percentYields` 20, culture and science, `scope: { test: 'workingTiles', on: greatWork, atLeast: 2 }`. Uncommon, Civic. |
| The Living Canon | modify: revised | 1 | MG1. 8% → 4% a family, at most 5 helpings (+20%); the three-culture-building scope goes. Rare, Economic. |
| The Masters' Domain | modify: revised | 1 | MG1. The hex food and production 12 → 3; the +30% gold row goes. Uncommon, Economic. |
| The Divine Proportion | new | 1 | MG10. `cardYieldAmplifier` `yield: 'all'`, `percent: 100`, `on: { test: 'greatWork' }` (Expansionist's The Age of Improvement). A capstone, so late (reading 26). Rare, Wildcard. |
| Commission: The Wonder of the Age | add | 2 | MG4. Missing: a `TallyOccasion` with an amount: the production a town adds each turn to a front-row wonder or the Opus. Goal `counted` 1,500. Reward culture 250 and `wildcardChairs: 1` (both exist) (reading 35). Uncommon, Wildcard. |
| Officials by Merit | add | 2 | MG6. `offerRider` `offer: 'order'`, `extra: 2`. Missing: a rule that refuses an Order reroll, asked in `rerollError` (reading 13). Rare, Wildcard. |
| The Pandects | new | 2 | MG7. Missing: a `CountKind` of the Doctrines held. Then two `pays` `where: 'city'`, `percent: 5`, `stage: 'city'`: science and production (reading 20). Uncommon, Civic. |
| Commission: The Golden Bull | new | 2 | MG7. Missing: a `CommissionFigure` for a council in order, and a reward field that opens a Doctrine offer through the arm a building's Doctrine grant uses (readings 18, 19; question 3). Uncommon, Wildcard. |
| The Second Sitting | new | 2 | MG10. `windfallRider` `draftPassed`, grant `freeDraft`. Missing: a rider filter that the passed hand cost culture, read off MG5's fact (reading 16). Rare, Wildcard. |
| Magnificence | new | 2 | MG11. Missing: culture as a bank of the purchase verb, for a world wonder at the front of a queue, at one culture for each hammer still needed, under a rule (reading 36). Rare, Economic. |
| The Mixed Constitution | new | 2 | MG12. Missing: a holder rule in the fit and in the re-seating, asked by every caller of `orderFitsSlot` (reading 24; question 2). Rare, Wildcard. |
| The Universal Genius | new | 2 | MG13. Missing: a mark on the person that it has acted, an act that does not spend it while the card is seated, and a work that then spends it (reading 23). Rare, Civic. |
| The Cabinet of Curiosities | add; revised | 2 | MG14. Missing: an on-draft grant of a random card from a deck the seat does not hold, settled as a pick (reading 37). Rare, Wildcard. |
| Commission: The Paradise Garden | add; revised | 2 | MG15. Missing: a `CommissionFigure` for a work with works or tended works beside it, and a reward that claims the unowned hexes within three of that work (reading 41). Rare, Wildcard. |
| The Wonder Commonwealth | implemented | – | Built (1). |

Tier III has no Military card (section 8 of the pass). The carried Tier 0 to II Military cards and the partner's fill Imperium's and Divine Mandate's Military chairs.

## Tier IV

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Privy Council | new | 1 | MG3. `cardYieldAmplifier` `yield: 'production'`, `amount: 1`. Rare, Wildcard. |
| The Magister's Court | modify: deferred; revised; moved | 1 | MG3 (its text and band in MG1). `productionBonus` `category: 'building'`, `building: 'theMagnumOpus'`, `percent: 25`, `scope: { test: 'hasWonder' }`. Uncommon, Economic. |
| The Bulwark of Marvels | add; revised | 1 | MG3. `cityStat` `stat: 'defense'`, `amount: 4`, `count: 'wonders'`, `scope: { test: 'raisingOpus' }`. Uncommon, Military. |
| The Universal Library | add | 2 | MG4. MG4's count of Orders held. Then `productionBonus` `building: 'theMagnumOpus'`, `percent: 2`, `count`, `max: 20` (The World's Exchange's form). Rare, Economic. |
| The Polymath's Study | add; revised | 2 | MG4. Missing: a `CountKind` of the different decks among the Orders held, with a switch for seated cards (Travelling Players). Then two `pays` `where: 'city'`, `percent: 8`, `stage: 'city'`, `max: 5`: science and production (reading 8). Rare, Civic. |
| The Hall of Wonders | add; revised | 2 | MG6. Missing: `count`, `per` and `max` on `offerRider`, as `routeRider` has them. Then `offer: 'order'`, `extra: 1`, `count: 'wonders'`, `per: 2`, `max: 2` (reading 13). Rare, Wildcard. |
| The Last Commission | modify: deferred; moved | 2 | MG8 (its band in MG1). Missing: a `WindfallOccasion` for a great person spent, fired in `spendGreatPerson`, and a rider filter that a town raises the Opus. Then grant production 150, `toOpus`, `oncePerTurn` (reading 21). Rare, Economic. |
| The Immortals | new | 2 | MG8. Missing: a rule, read at `liveEffects`' legacy source, that reads each legacy twice (reading 22). Rare, Civic. |
| Commission: The Ideal City | add; reworked | 2 | MG9. Missing: a `CommissionFigure` for one town that holds two wonders and works three great-person works, named by `commissionGoalTown`. Reward `markTown` and `lasting` `percentYields` 25 culture, science and production, `scope: markedBy` (The Heartland's form) (reading 33). Rare, Wildcard. |
| The Grand Retrospective | add | 2 | MG14. Missing: `onDraft` widened to the windfall grant (beyond MG6's great person), and a tile test on `GrantCount` to count works. Nine grants: 20 culture, science and production per wonder, work and Order held (reading 38). Rare, Civic. |
| The Processional Way | add; revised | 2 | MG15. Missing: a tile test for a work on a straight line of three or more works, answered from the ground facts (`groundFactsFor`), because a hex's ring does not reach two hexes away. Then two hex `pays`: culture 3 and science 3 (reading 39). Rare, Civic. |
| The Pull of the Masters | add | 2 | MG16. Missing: a once-a-turn sweep, under a rule, in which each work takes one rival hex beside it and both towns are refreshed (reading 40). Rare, Economic. |

## Shared with another deck

How the build handles the cards Magisterial shares with Devotion: **the Devotion plan builds them** (The Painted Chapels, The Festival Calendar, The Penitents' Roll, Sacred Commissions' move to Tier II, The Rising Nave), with its own types. The one exception is Sacred Patronage: this plan builds it in MG8, with its second clause, because that clause needs MG8's moment for a great person spent. Whichever batch changes a shared row also changes that row on every sorted sheet that lists it, as Commerce T1 did (reading 47).

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| Travelling Players (Commerce) | modify: revised | 2 | MG4. "Foreign routes from a town with a Monument gain +2 culture for each different deck among your seated cards." `pays` `where: 'route'`, `crossing: 'international'`, `basis: 'count'`, MG4's decks count (seated), `to: 'culture'`, `amount: 2`, `origin: hasBuilding monument`. Band 2, Civic. The Commerce sheet's shared row changes in MG4 (reading 46). |
| Sacred Patronage (Devotion) | modify: deferred | 2 | MG8. `rule: 'buyGreatPersonWithFaith'` (exists) and a `windfallRider` on MG8's spent moment: faith 30, `oncePerTurn`. Typed Civic in MG1 unless DV has typed it. The Devotion sheet's shared row changes in MG8 (reading 21). |
| The Imperial Examinations, Triumphal Arches (Dominion) | cut | – | MG1 retires both rows. The note on the Dominion sheet ("wait for the Magisterial sheet") changes. |
| Sacred Commissions (Devotion) | implemented; moved by DV | – | DV moves it to Tier II. Typed Economic in MG1 unless DV has typed it. |
| The Painted Chapels, The Festival Calendar, The Penitents' Roll (Devotion) | moved to the shared cards by DV | – | DV. The rows are in `devotion.json` today, so this sheet lists them only once DV moves them (reading 47). |
| The Rising Nave (Devotion) | add | – | DV. |
| The Art Dealers (Commerce) | implemented (R1) | – | R1's text: "+3 gold for each card seated in your government." |
| The Brokers' Redraw (Commerce) | modify: as built | – | Plays as built: no button offers the gold redraw (Follow-ups). |
| Illuminated Treatises, The Sword of State, Garden Cities, Examinations of State, Garden Provinces, Looted Art, The Sculpted Landscape, The Cosmopolitan Court, The House of Wisdom, The New Code | implemented | – | Built (10). |

**Each pair's early shared card** (ruling (qqqqqq) 14):
- Scientific: Illuminated Treatises (Tier 0).
- Dominion: The Sword of State (Tier I).
- Expansionist: Garden Cities (Tier I).
- Commerce: The Art Dealers (Tier I).
- Devotion: Sacred Commissions (Tier I) until DV moves it to Tier II; then The Painted Chapels (Tier I).

## The commissions: the mix

Section 12, item 8: seven commissions, four institutions and three one-time rewards.

| Commission | Tier | Becomes | What it reads and pays | Shape |
|---|---|---|---|---|
| The Eighth Wonder | 0 | institution | A wonder completed while seated. Pays culture and renown for each wonder held. | A tally is new; the reward exists (MG4). |
| The Roll of the Senate | I | institution | Ten Orders held. Pays a Wildcard chair for good. | The figure is new; the reward exists (MG4). |
| The Patron's Gallery | II | one-time | Works of three families. Pays a great-person draft and 200 culture. | The figure is new (MG8). |
| The Golden Bull | III | one-time | A council in order. Pays a Doctrine offer. | The figure and the reward are new (MG7). |
| The Paradise Garden | III | one-time | A work with three works or tended works beside it. Pays the land within three. | The figure and the reward are new (MG15). |
| The Wonder of the Age | III | institution | 1,500 production into wonders and the Opus. Pays a Wildcard chair for good, and 250 culture once. | A tally is new; the reward exists (MG4). |
| The Ideal City | IV | institution | One town with two wonders and three worked works. Pays +25% in that town for good. | The figure is new (MG9). |

The six commissions of the pass are typed Wildcard. The Eighth Wonder is Civic, as the list types it, so it fits a Civic chair from Tier I. Under the Chiefdom, which has no Civic chair, it competes with The Second Reading and the three other Tier 0 Civic cards for the one Wildcard chair (reading 3).

## Feature G: a government adopted is a moment (MG7)

- **What it is:** a `WindfallOccasion` member `governmentAdopted`, paid through `payOccasionRiders` at the capital, in `adoptGovernmentAt`, after the re-seating and before the Doctrine draw, beside the Triumph `awardOccasion` (reading 17).
- **What it costs:** the member, one call, its words in `describers.ts`, a stand-in arm in `src/ai/value.ts` (priced in MG17).
- **What it does not touch:** `src/sim/occasions.ts`. The Triumph's `governmentAdopted` is a world-announced `Occasion` and stays as it is; the new member is a card rider's moment in another union, as `sizeRecord` is in both `WindfallOccasion` and `TallyOccasion`.
- **Cards:** The Sed Festival. The cards section 6 offers the other decks (an amnesty, a census, a merchants' gift, a coronation, an academy charter) are not in this plan. Each deck's pass may use the moment.
- **Features E and F** (devout towns, a conversion as a moment) are the Devotion plan's. No Magisterial card needs them.

## Doctrines

- Magisterial has no Doctrine rows and none designed. Section 8 of the pass: one for each theme at most of Tiers I to IV, and any Doctrine that would change the government system for everyone is a question for you first. They are being written in `docs/plans/magisterial-doctrines.md`; a triage of their own builds them.
- **What the sheet needs (MG1):** an empty Doctrine table under each of Tiers I to IV and the line "Doctrines: none yet", as the Commerce sheet has.
- The Pandects and The Golden Bull read Doctrines. Until Magisterial and its partners have Doctrines, a Magisterial seat paired with Dominion is the only one offered any (reading 19).

## Cut and retired rows

| Rows | In the data now | Action |
|---|---|---|
| The 49 dealt rows the sheet cut on 2026-10-06, and The Performers' Treasury | live | MG1: `retired: true`, off the sheet and the Magisterial shelf (reading 43). |
| The 12 deferred rows the sheet cut on 2026-10-06 | deferred | MG1, the same. |
| The Imperial Examinations (live), Triumphal Arches (deferred) | `common.json` | MG1, the same. Both sheets cut them. |
| The Markstones, Gifts at Court, the 17 sheet cards the pass cuts that have no row (The Critics' Circle, The Patient Eye and the rest), and the 15 cards of 2026-10-17 not taken | no row | None. They never reach the sheet. |

MG1 retires 64 rows: 51 dealt and 13 deferred. `magisterial.json` keeps its 77 rows: 12 live, 3 deferred and 62 retired. Every row the pass keeps is one of the 15 named under Facts; every other row of the file retires.

## Readings

The first six come from section 12. The rest are new. Each gives the reading the build uses and, where it matters, the alternative. A reading is how the build interprets a text that could mean two things. "To confirm" marks a reading that is this plan's interpretation of your words.

1. **(Section 12)** The Prytaneion: "Each town gains +1 food for each card you have seated." It counts the Orders in chairs (`slottedOrders`). A malice in a chair is not an Order.
2. **(Section 12)** The Markstones and Gifts at Court are cut. Neither has a row. `onDraft` still widens, for The Wandering Muse (MG6) and The Grand Retrospective (MG14).
3. **(Section 12, to confirm)** The new commission: "Commission. Complete a wonder while this is seated. Then, for the rest of the game, each wonder you hold gives +3 culture and +5 renown. The card leaves its chair." It is an institution. Both amounts are paid each turn for every world wonder you hold, built before or after the goal, captured ones included. Tier 0, uncommon, Civic. Its name is question 1.
4. **(To confirm)** Its goal counts a world wonder this empire completes in one of its towns while the card is seated. A captured wonder does not count, and the Magnum Opus is not a wonder.
5. **(Section 12)** The Art Dealers is R1's. The `cardDrafted` moment stays. After R1 it has no live reader until MG2 builds The Court Painter.
6. **(Section 12)** Every recommendation of sections 10 and 11 stands: the engine and four themes; feature G with The Sed Festival; The Grand Vizier kept; the five capstones; The Brokers' Redraw and The Art Dealers confirmed and Travelling Players revised; rerolls to the Devotion pair; the cuts, with rows retired; the commissions mix; The Cornerstone takes The Pyramid Builders' job; The Nomarchs and The Keepers of Wonders kept; the deck at 71 seatable cards; A Victor's Peace stays Dominion's; three more Devotion cards shared, Sacred Commissions at Tier II, and Sacred Patronage with its second clause.
7. "Orders you hold" is every card in the collection (`PlayerStatecraft.orders`), seated or not: boons, charters and fulfilled commissions count; Doctrines and malices do not. The Roll of the Senate counts itself. It is one walk for the count (The Universal Library, The Grand Retrospective) and the figure (The Roll of the Senate).
8. The decks count: each Order adds the decks on its row. A common card (no deck) counts as one deck of its own, and a shared card counts for each of its two decks. The Polymath's Study counts every Order held; Travelling Players counts only Orders in chairs.
9. The Court Painter pays for every pick of an Order hand: a charter, a free hand's pick and a card The Cabinet of Curiosities grants count. A pass, a Doctrine and a great person do not.
10. The Second Reading is the `rerollOffers` rule as built: the first redraw of each Order, Doctrine and great-person hand is free in either bank, and rerolls open before Chronology. A belief hand is not changed, because its first asking is free already.
11. A hand's price is the culture the seat paid for it, after The Open Door, stored on the offer when the hand is dealt. A rerolled hand keeps the price of the hand it replaced. A free hand costs nothing, so it pays The Accessions Register and The Unwritten Chapter nothing. Half the price is rounded down.
12. The Open Door: an Order hand bought with culture costs 15% less, floored once. Only the price changes: the draft count, the government tiers and the pity do not move. Two discounts add before the price is taken. Every screen and bot that prints or plans the next price reads the discounted figure. Alternative: more culture into the pool, which would be a second culture channel.
13. Officials by Merit refuses a reroll of an Order hand only; Doctrine offers and great-person drafts may still be rerolled. Its two cards and The Hall of Wonders' cards obey the cap of five. The Hall of Wonders counts world wonders held, captured ones included, and widens Order hands only.
14. The Unveiling and The Symposium open a free hand only when no Order draft or Doctrine offer waits (`freeDraftCanOpen`, The New Code's reading). Otherwise the moment deals nothing, so a great person chosen while a hand waits deals nothing. Alternative: a hand owed and dealt when the open one is answered, which needs a stored count.
15. The Wandering Muse uses the existing grant: an offer now when the seat may call great people and none waits, otherwise the renown to the next rung. Seated, it does nothing.
16. The Second Sitting: passing a hand that cost culture deals a free hand at once (the pass removes the hand before the riders pay, so the free hand can open). Passing a free hand deals nothing. The free hand moves neither the draft count nor the price, and the pity the pass raised stays.
17. Feature G pays the cards seated after the re-seating, so The Sed Festival pays only from a chair of the new council. Its person is the ordinary grant. It pays at most three times (tiers 10, 18 and 26) if the seat banks the tier-10 offer until it is seated.
18. The Golden Bull's goal: every Military, Economic and Civic chair holds a card whose counted type is the chair's (`countedTypeOf`: the card's own type, or the chair's for an unsorted card). A chair a malice holds is left out; an empty typed chair fails. It is read at the end of each turn, as every reached figure is. The Mixed Constitution changes no card's type.
19. **(To confirm)** The Golden Bull's reward opens a Doctrine offer of the government's tier from the seat's decks, through the arm a building's Doctrine grant uses. The goal counts as met only while such a Doctrine is left to offer and no Doctrine offer waits, so the card waits in its chair rather than paying nothing. Alternative: the reward pays nothing and the card leaves (question 3).
20. The Pandects counts every Doctrine held, of any deck.
21. The spent moment is one `WindfallOccasion`, fired in `spendGreatPerson` for both verbs, once for each person, at the capital, carrying the work if one was laid. The Last Commission pays only while one of the seat's towns raises the Opus, into that town, at most once a turn. Sacred Patronage pays 30 faith at most once a turn. Under The Universal Genius the moment fires once, when the person is finally spent.
22. The Immortals: each legacy that is not revoked is read twice, as if the person had been spent twice. A yes-or-no rule gains nothing from the second reading. The counts of people and families (The Living Canon, The Roll of Masters) do not change.
23. The Universal Genius: the rule is asked when the person acts. With the card seated, the act pays and the person stays on the board, marked as having acted. It may then lay its work, even after the card leaves its chair, and it may not act again. The legacy, the spent moment and the `greatPersonSpent` tally come once, when the work is laid. A person that lays its work first is spent as today. The act does not use the person's movement.
24. **(To confirm)** The Mixed Constitution: while it sits in a chair, every card of its holder fits every chair; the card itself sits in a Wildcard chair. At an adoption the rule is read from the old council, so every card is re-seated while chairs remain. When it leaves its chair, the council is re-seated at once by the ordinary rule, as an adoption re-seats it: a card that still fits keeps its chair, the rest move to free chairs that fit them, and a card that fits none returns to the collection. The signatures still count cards by their own type. Alternative: misfit cards stay until moved or until the next adoption (question 2).
25. The Grand Vizier reads the first Economic chair in slot order. The card there pays its town and empire lines twice. Its hex lines, its percentages, its conversions (The Working Court, The Learned Patron) and its rules are not doubled. An empty chair, a malice or the Vizier itself pays nothing more. Under the Theocracy it pays nothing.
26. The Divine Proportion doubles the bag of every card's hex line that lands on a great-person work, a partner card's included (The Siting Masters, The Masters' Domain, The Processional Way, Scientific's Academy lines). It does not reach town lines (The Laureate, The Garden Courts), a percentage on a hex (The Quarter of Masters) or Hypatia's leader line.
27. The Quarter of Masters pays a work's own yield and its renewals again when another work stands beside it, once, however many stand beside it. Card lines on the work are not repeated.
28. The Siting Masters: +1 culture for each of the six hexes beside a work that is hills, a mountain, a forest or water. A hex that is two of these counts once. At most +3.
29. The Landmark Bounds: when a great person lays a work, every unowned hex of the six around it joins your nearest town. Owned hexes are left alone; a citadel's own claim still takes a rival's ground. A prophet's holy site is not laid by a great person and claims nothing here. The claim joins the register of mid-turn yield changes (`refreshCityDerived`'s docblock).
30. The Custodians: +4 strength, attacking or defending, for a unit standing on any great-person work, whoever owns it.
31. The Polemarch reaches every unit of its holder, land and sea, attacking and defending, as The War Council's row did.
32. The Patron's Gallery counts the families of the great-person works in your borders, one for each family: scholar (academy), artist (landmark), engineer (manufactory), merchant (customs house), general (citadel) and prophet (holy site). A partner's work counts.
33. The Ideal City reads the first of your towns, in founding order, that holds at least two world wonders and works at least three great-person works. That town is marked, and the lasting +25% is scoped to it. A captured wonder counts.
34. The Envious Eye: when a rival claims a world wonder, each town of the card's holder that banked hammers toward it, at any position of its queue, keeps them: they go to the town's front row once the wonder's row is removed, in place of the gold refund. A town with an empty queue takes the gold refund. Hammers that finish the next item complete it through the production windfall routine.
35. The Wonder of the Age counts, each turn, the production a town adds in the production phase to its front row when that row is a world wonder or the Opus, while the card is seated. Lump windfalls, purchases and refunds do not count. Production in a wonder a rival finishes first still counts, because it is counted when it is added. Alternative: every hammer from every source.
36. Magnificence buys the world wonder at the front of a town's queue, never the Opus. The price is one culture for each hammer it still needs (its cost less what is banked), taken from the draft pool. The banked hammers are used, not refunded. Every other purchase gate still runs. It is a purchase, but it is not gold or faith spent: `goldSpent`, `buildingBoughtWithGold` and the gold-bought building count do not move.
37. The Cabinet of Curiosities draws one card with `state.rng` from the live rows of the seat's current band whose decks the seat holds none of (common cards are left out) and that the seat does not hold, rarity first at the ordinary odds, with no pity. The card enters the collection as a pick does: a charter applies its grant, an on-draft grant is paid, and the draft moment fires for it. An empty bag gives nothing.
38. The Grand Retrospective reads its three counts when it is drafted, itself among the Orders. Works are the great-person works in your borders. Production goes to the capital; culture and science are banked. Each figure is one grant.
39. The Processional Way: each of your great-person works on a straight line of three or more works, along one of the three hex axes, with every work of the line in your borders. Each such work pays +3 culture and +3 science once, however many lines it stands on.
40. The Pull of the Masters: once a turn, in the borders phase, each of your works in map order takes the first hex beside it, in ring order, that a rival owns, that no rival town works, that is not a town centre and that carries no rival's work. The hex joins your nearest town. Peace or war does not matter.
41. The Paradise Garden's figure is the most hexes beside any one of your works that carry a great-person work or a tended work. The goal is three. The reward claims, once, every unowned hex within three hexes of that work (the first such work in map order) for your nearest town.
42. The sort writes the sheet's Type column into the data. A Magisterial card in a Wildcard chair then counts by its own type, so the Assembly Hall of The Senate Charter counts only Wildcard cards.
43. The 64 rows retire in MG1, before the cards that replace them land. A save that holds one keeps it, with its effects. A test that seats a retired row directly stays; a test that deals one changes.
44. The three deferred rows take their target text, band and rarity in MG1 and stay deferred until their batch (Commerce reading 41).
45. Every new card gets a new id. No card takes over a cut row's id: The Workshop at Olympia is not The Great Patrons, which has another name and a second clause.
46. Travelling Players keeps its id, Tier II and Civic, and takes the revised text in MG4.
47. The Devotion cards take the Devotion plan's types: Sacred Commissions Economic; The Painted Chapels, The Festival Calendar, The Penitents' Roll, The Rising Nave and Sacred Patronage Civic. The batch that moves or changes a shared row changes it on every sorted sheet that lists it, in the same batch. A Devotion card whose row has not yet moved to `common.json` is left off this sheet's shared table and named in a note below it.

## The batches

**Two tracks.** The MG batches run one at a time. The Devotion plan's DV batches may run beside them in a second worktree. MG1 waits for R1 to land, because R1 edits `common.json`, `docs/decks/magisterial.md`, the statecraft files, the fixture and `decks.test.ts`.

**Keep each batch additive in the shared files:**
- Put a new union member beside the Magisterial members already there, and a new switch arm beside the Magisterial arms in the evaluator, the describers and `src/ai/value.ts`. A new count or tally needs its words (`COUNT_WORDS`, `TALLY_WORDS`), which the compiler asks for.
- A batch that adds a member to a union `value.ts` switches on exhaustively (a `CardEffect` kind, a `WindfallOccasion`, a `TallyOccasion`, a rule id) adds a stand-in arm in the same batch, so the tree typechecks. MG17 prices it.
- In `docs/orders-and-doctrines.md`, edit only the Magisterial shelf, the Cross-type rows that name Magisterial and their notes.
- Rewrite `test/fixtures/cardText.json` with `CARD_TEXT_WRITE=1 npx vitest run test/sim/cardTextSnapshot.test.ts`.
- Each card batch raises `SCHEMA_VERSION` once and updates the fifteen pins and the explore digest. When both tracks run, the batch that merges second takes the next number and re-cuts the live count in `decks.test.ts` and the fixture at the merge.
- A new row with an engine shape (`slotPosition`, `cardYieldAmplifier`, a route line) joins `ORDERS_USING_A_SHAPE` in `test/sim/statecraft.test.ts`.

**The sheet.** MG1 writes the sheet in the sorted format. Each later batch sets its own rows to `implemented`, with the Ability cell equal to the data row's text and the Type column equal to its `type`, and recomputes the counts tables.

**(DV)** below marks a file the Devotion plan also edits.

### MG1: the sheet of record, the sort, the retirements and the changes in place

- **Builds:**
  - **The sheet.** Rewrite `docs/decks/magisterial.md` in the format of `docs/decks/commerce.md`:
    - a header: what the sheet is; "Why each card is here" names the themes pass (section 12 holds your rulings and outranks the rest) and the list doc; "The build plan" names this triage; "Doctrines: none yet", with `docs/plans/magisterial-doctrines.md`; the old sheet is `git show 155106c9:docs/decks/magisterial.md`;
    - the status list (`implemented`; `modify` with `deferred`, `revised`, `reworked`, `moved`, `rarity`, `shared` and `as built`; `add`; "(was …)"), and the Type note;
    - two counts tables (by status, by type), five tier tables (Card | Rarity | Status | Ability | Type), an empty Doctrine table under Tiers I to IV, the shared table (Card | Rarity | Also in | Tier | Status | Ability | Type), a "Retired rows" section, and "Open for your pass" with a "Ruled 2026-10-25" list pointing at section 12 and the commissions mix;
    - every card of this plan's tier tables, with its target text and type. The cut rows are off the tables.
  - **The sort.** `magisterial` joins `SORTED_DECKS`. Every row the sheet lists carries its type: the 15 Magisterial rows, and Sacred Commissions (Economic) and Sacred Patronage (Civic) unless DV has typed them. A retired row carries none.
  - **The sync test.** Rewrite `test/sim/decks/magisterial.test.ts`:
    - drop the mirror of `docs/six-decks-first-cut.md`, the `retired` pin and the band-4 pin;
    - keep the checks that every row folds as a Magisterial row with a unique id, that live rows use known shapes and print, that deferred rows say why, and the draft checks;
    - add the sheet checks of `commerce.test.ts`: statuses and reasons, types, counts tables, every live or deferred row listed once, the shared table against `common.json`, every shared row naming Magisterial listed, retired rows off and untyped;
    - re-pin the fold test: Civic Granaries pays +1 food and +1 production; the pins of Hearth Ceremonies, The Grand Fairs and The Civic Assemblies go.
  - **The retirements:** the 64 rows (reading 43).
  - **The changes in place (4):** Civic Granaries, The Honoured Dead, The Living Canon, The Masters' Domain.
  - **The three deferred rows** take their target text, band and rarity (reading 44): The Golden Age's text; The Magister's Court's text and band 3 → 4; The Last Commission's band 3 → 4.
  - **The worksheet:** the Magisterial shelf of `docs/orders-and-doctrines.md` lists the live rows; The Imperial Examinations leaves the Cross-type table.
  - **The Dominion sheet:** its note on The Imperial Examinations and Triumphal Arches says they are retired.
- **Fence:** `data/decks/magisterial.json`, `data/decks/common.json` (DV), `docs/decks/magisterial.md`, the note in `docs/decks/dominion.md`, the Magisterial shelf, Cross-type row and notes of `docs/orders-and-doctrines.md` (DV edits its own), `test/fixtures/cardText.json` (DV), `src/sim/state.ts` (the schema line) and its fifteen pins and `test/sim/explore.test.ts` (DV), `test/sim/decks/sortedSheets.ts` (DV1 adds `devotion` to the same list), `test/sim/decks/magisterial.test.ts`, `test/sim/decks.test.ts` (51 fewer dealt rows) (DV), a new `test/sim/decks/magisterialThemeCards.test.ts` (the four changes in place). `src/sim/statecraft/describers.ts` only if a sentence reads badly (DV).
- **Depends on:** R1.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/magisterial.test.ts test/sim/decks/magisterialThemeCards.test.ts test/sim/decks/common.test.ts test/sim/decks/shared.test.ts test/sim/decks/dominion.test.ts test/sim/decks/expansionist.test.ts test/sim/decks/scientific.test.ts test/sim/decks/commerce.test.ts test/sim/decks/devotion.test.ts test/sim/decks.test.ts test/sim/statecraft.test.ts test/sim/occasionRiders.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`, and the fence's files typecheck.

- **Built (2026-10-25):** as planned, in a second worktree beside Devotion batch DV1, then merged (`1985072b`). The merge gate passed: the type check, 9,576 core tests and the build. Schema 177 (DV1 took 176). The merge added DV1's three shared Devotion cards to this sheet's shared table and moved Sacred Commissions to Tier II. Readings added: the name check for an `add` row counts this file's retired rows, so The Quarter of Masters, a name a retired Expansionist row holds, needs a decision in MG3 (reading 45 says a new id); the old sheet is cited at `7d4064dc`; The Living Canon's cap of five covers all five families. Not done: The Universal Genius's text says "two charges" and The Pull of the Masters' says "At the start of each turn", which readings 23 and 40 build differently; MG13 and MG16 reword them. From here the DV and MG batches run one at a time in the main tree.

### MG2: the data-only cards of Tiers 0 and I

- **Builds:** 14 new rows: The Prytaneion, The Polemarch, The Court Painter, The Cornerstone, The Repertory, The Second Reading, The Nomarchs, The Workshop at Olympia, The Overseers of Works, The Siting Masters, The Keepers of Wonders, The Ceremonial Guard, The Unveiling, The Encyclopedia.
- **Fence:** `data/decks/magisterial.json`, `docs/decks/magisterial.md`, the Magisterial shelf, the fixture (DV), the schema line and its pins (DV), `test/sim/decks.test.ts` (+14) (DV), `test/sim/decks/magisterialThemeCards.test.ts`. The describers only if a sentence reads badly (DV).
- **Depends on:** MG1.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/magisterialThemeCards.test.ts test/sim/decks/magisterial.test.ts test/sim/decks.test.ts test/sim/statecraft.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.

- **Built (2026-10-25):** all fourteen cards, each data only, in the main tree. The gate passed: the type check, 9,605 core tests and the build. Schema 179. Two describer sentences changed: the free reroll now reads "the first reroll of each hand of Orders, Doctrines or great people costs nothing" (The Rihla prints it too), and a grant names the town before the age. Readings added: The Encyclopedia counts a charter as unseated; The Overseers' age is the highest age of the technologies known. Not done: the reroll price line is always labelled "The Rihla"; two comments still say no card rides the draft moment.

### MG3: the data-only cards of Tiers II to IV

- **Builds:** 11 new rows (The Prefects, The Symposium, Letters Patent, The Quarter of Masters, The Gazetteers, The Seven Sights, The Boule, The Roll of Masters, The Garden Courts, The Privy Council, The Bulwark of Marvels), and The Golden Age and The Magister's Court leave `deferred`.
- **Fence:** as MG2, and `test/sim/statecraft.test.ts` (The Privy Council joins `ORDERS_USING_A_SHAPE`) (DV). `test/sim/decks.test.ts` +13.
- **Depends on:** MG2.
- **Schema:** one bump.
- **Done-gate:** as MG2, and `test/sim/wonders.test.ts`.
- **After MG3 a playtest can start:** 39 of the 71 cards play as written.

- **Built (2026-10-25):** all thirteen cards. The gate passed: the type check, 9,645 core tests and the build. Schema 181. The Bulwark of Marvels was not data only: a counted `cityStat` always counted inside the town, so `CardCityStatEffect` gained `within: 'empire'` for "each wonder you hold". The Quarter of Masters has the new id `magisterialTheQuarterOfMasters`; the retired Expansionist row keeps its id. The Privy Council joins the bots' register of fold-read engines (24). Readings added: The Bulwark counts captured wonders; The Roll of Masters counts people from the moment they are chosen; The Gazetteers counts a work whether or not it is worked, holy sites included; Letters Patent gives a general's act nothing; The Privy Council does not raise percentages or itself; a second wonder restarts The Golden Age's ten turns.

### MG4: the collection and the wonder commissions

- **Builds:**
  - A `CountKind` of the Orders held and a `CommissionFigure` that reads the same walk (reading 7). Cards: Commission: The Roll of the Senate, The Universal Library.
  - A `CountKind` of the different decks among the Orders held, with a switch for seated cards only (reading 8). Cards: The Polymath's Study, and the shared Travelling Players (its new text in `common.json` and on both sheets).
  - A `TallyOccasion` for a world wonder this empire completes, written in `claimWonderFor` (readings 3, 4). Card: Commission: The Eighth Wonder.
  - A `TallyOccasion` with an amount: the production added to a front-row wonder or the Opus in the production phase (reading 35). Card: Commission: The Wonder of the Age.
- **Fence:** `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts` (`countOf`), `src/sim/statecraft/describers.ts` (DV for all three), `data/decks/magisterial.json`, `data/decks/common.json` (DV), `docs/decks/magisterial.md`, the Travelling Players row of `docs/decks/commerce.md`, the shelf and the Cross-type row, `src/sim/commissions.ts`, `src/sim/cities.ts` (`claimWonderFor` and the production phase), `src/sim/statecraft/draft.ts` (only if `recordScalingOccasion` needs it), the schema line and its pins (DV), `test/sim/decks.test.ts` (+5) (DV), `src/ai/value.ts` (stand-ins) (DV), `test/sim/commissions.test.ts`, a new `test/sim/decks/magisterialCollection.test.ts`.
- **Depends on:** MG3.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/magisterialCollection.test.ts test/sim/commissions.test.ts test/sim/aiCommissions.test.ts test/sim/wonders.test.ts test/sim/decks/commerce.test.ts test/sim/decks/magisterial.test.ts test/sim/decks.test.ts test/sim/statecraft.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts test/mapgen/moduleCycles.test.ts`.

- **Built (2026-10-25):** all five cards and Travelling Players' new text. The gate passed: the type check, 9,676 core tests and the build. Schema 183. New counts `ordersHeld` and `decksHeld` (with `seated: true` on `pays`), the figure `ordersHeld`, and the tallies `wonderCompleted` (written in `claimWonderFor`) and `wonderProduction`. The production tally is written in `collectYields` (`yields/empire.ts`), where the turn's production enters the basket, not in `cities.ts`. Readings added: a bought or granted wonder counts for The Eighth Wonder; The Wonder of the Age counts exact fractions; a counted route line prints its origin, so Travelling Players keeps its Monument clause. Not done: `purchase.ts` keeps a private twin of the new `isRaisingWonderOrOpus`.

### MG5: the draft's price

- **Builds:**
  - The hand's price: a field on `OrderOffer` written by `settleDraft`, kept by `settleReroll`, absent on a free hand. `applyChooseOrder` reads it before the pick settles and hands it to `payCardDrafted`; `settleOrderSkip` reads it before it deletes the hand. One `WindfallOccasionFacts` field and one `OccasionMeasure` member (reading 11). Cards: The Accessions Register, The Unwritten Chapter.
  - The discount: a rule with a percentage on the card, read by one helper that prices the next hand from the state. `nextDraftCost`, `planDraft` and `draftSettledBy` take the state, and every caller moves (reading 12). Card: The Open Door.
- **Fence:** the three statecraft files (DV), `src/sim/statecraft/draft.ts`, `src/sim/religion.ts` (`settleReroll` keeps the price), `src/sim/commands.ts` (`applyChooseOrder`), `src/sim/state.ts` (the schema line; the offer is saved) (DV), `data/decks/magisterial.json`, `docs/decks/magisterial.md`, the shelf, the fixture (DV), `test/sim/decks.test.ts` (+3) (DV), `src/ui/topBar.ts`, `src/ui/empireDrawer.ts`, `src/ui/statecraftScreen.ts`, `src/ai/wants.ts`, `src/ai/bot.ts`, `src/ai/value.ts` (the callers and the stand-ins) (DV), `test/ui/topBarCost.test.ts`, `test/ui/empireDrawer.test.ts`, `test/sim/statecraftDraftPass.test.ts`, `test/sim/reroll.test.ts`, `test/sim/decks/commercePairs.test.ts` (the `payCardDrafted` callers), a new `test/sim/decks/magisterialDraft.test.ts`.
- **Depends on:** MG4.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/magisterialDraft.test.ts test/sim/statecraftDraftPass.test.ts test/sim/offers.test.ts test/sim/reroll.test.ts test/sim/decks/commercePairs.test.ts test/sim/decks/dominionDrafts.test.ts test/ui/topBarCost.test.ts test/ui/empireDrawer.test.ts test/sim/decks/magisterial.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.

- **Built (2026-10-26):** all three cards. The gate passed: the type check, 9,643 core tests and the build; three test files that load the save module timed out under a load average near 40 and passed when rerun alone in the same gate worktree. Schema 185. `OrderOffer.price` is written by `settleDraft`, kept by a reroll and absent on a free hand; it reaches the riders as `handPrice`. One helper, `draftCostFor`, reads the discount, and every price reader takes the state, `discoveries.ts`' culture preview included. Readings added: the statecraft screen's second line is the next draft's price, so it shows the discounted figure too; the measure prints "the culture paid for its hand". Not done: the offer card does not show the hand's price.

### MG6: the hand

- **Builds:**
  - A rule that refuses an Order reroll, asked in `rerollError` for an Order hand only (reading 13). Card: Officials by Merit. The reroll control shows the refusal it already prints for other refusals.
  - `count`, `per` and `max` on `offerRider`, read in `explainOfferSize` through `countOf`, as `cardRouteSlots` reads them (reading 13). Card: The Hall of Wonders.
  - `onDraft` widened to the `greatPerson` arm of `CompletionGrant`, paid by `raiseOnDraft` through `grantGreatPersonOffer` (reading 15). Card: The Wandering Muse.
- **Fence:** the three statecraft files (DV), `src/sim/religion.ts` (`rerollError`), `src/sim/statecraft/draft.ts` (`explainOfferSize`), `src/sim/cities.ts` (`raiseOnDraft`), `data/decks/magisterial.json`, the sheet, the shelf, the fixture, the schema line and its pins (DV), `test/sim/decks.test.ts` (+3) (DV), `src/ai/value.ts` (stand-ins) (DV), `test/sim/reroll.test.ts`, `test/sim/offers.test.ts`, a new `test/sim/decks/magisterialHands.test.ts`.
- **Depends on:** MG5.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/magisterialHands.test.ts test/sim/reroll.test.ts test/sim/offers.test.ts test/sim/greatPeople.test.ts test/sim/decks/dominionDrafts.test.ts test/sim/decks/magisterial.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.

- **Built (2026-10-26):** all three cards. The gate passed: the type check, 9,752 core tests and the build. Schema 187. `noOrderReroll` is read only in `rerollError`, for an Order hand; the reroll button already greys out on any refusal. `offerRider` takes `count`, `per` and `max`, read in `explainOfferSize`. `onDraft` takes the `greatPerson` grant. `docs/README.md` gained two lines. Readings added: the card's refusal comes before the reroll door; under The Second Reading an Order hand is still refused; The Wandering Muse needs no capital; The Hall of Wonders counts wonders when the hand is dealt.

### MG7: the council's moments (feature G and the Doctrines)

- **Builds:**
  - Feature G: the `governmentAdopted` member of `WindfallOccasion`, paid in `adoptGovernmentAt` (its section; reading 17). Card: The Sed Festival.
  - A `CountKind` of the Doctrines held (reading 20). Card: The Pandects.
  - A `CommissionFigure` for a council in order, and a `CommissionReward` field that opens a Doctrine offer through one helper shared with the building's `doctrineDraft` arm in `cities.ts` (readings 18, 19). Card: Commission: The Golden Bull.
- **Fence:** the three statecraft files (DV), `src/sim/statecraft/draft.ts` (`adoptGovernmentAt`), `src/sim/commissions.ts`, `src/sim/cities.ts` (the Doctrine grant helper), `data/decks/magisterial.json`, the sheet, the shelf, the fixture, the schema line and its pins (DV), `test/sim/decks.test.ts` (+3) (DV), `src/ai/value.ts` (stand-ins) (DV), `test/sim/doctrineOffer.test.ts`, `test/sim/typedChairs.test.ts`, `test/sim/commissions.test.ts`, a new `test/sim/decks/magisterialCouncil.test.ts`. Not `src/sim/occasions.ts`.
- **Depends on:** MG6.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/magisterialCouncil.test.ts test/sim/doctrineOffer.test.ts test/sim/typedChairs.test.ts test/sim/commissions.test.ts test/sim/aiCommissions.test.ts test/sim/triumphs.test.ts test/sim/decks/magisterial.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.

- **Built (2026-10-26):** all three cards. The gate passed: the type check, 9,794 core tests and the build. Schema 189. Feature G is the `governmentAdopted` member of `WindfallOccasion`, paid in `adoptGovernmentAt` after the re-seating and the Triumph and before the Doctrine draw. New count `doctrinesHeld`; new figure `councilInOrder`; new reward `doctrineOffer`, opened by one helper (`openDoctrineOffer`, `cities.ts`) that the building's `doctrineDraft` grant now shares; `commissionRewardWaits` keeps The Golden Bull in its chair while no Doctrine can be offered (question 3's recommended answer). Readings added: the moment pays after the Triumph's renown; while The Golden Bull waits its goal shows as met; The Pandects is a payoff, not an engine. Not done: no UI says why The Golden Bull waits; a rider's culture windfall during an adoption can open an Order hand before the Doctrine draw.

### MG8: great people spent

- **Builds:**
  - A `WindfallOccasion` for a great person spent, fired once in `spendGreatPerson`, at the capital, with the work as a fact; and a rider filter that one of the seat's towns raises the Opus (reading 21). Cards: The Last Commission and the shared Sacred Patronage leave `deferred`.
  - A rule, read at `liveEffects`' legacy source, that reads each live legacy twice (reading 22). Card: The Immortals.
  - A `CommissionFigure` of the families of the works in your borders (reading 32). Card: Commission: The Patron's Gallery.
- **Fence:** the three statecraft files (DV), `src/sim/greatPeople.ts`, `src/sim/commissions.ts`, `data/decks/magisterial.json`, `data/decks/common.json` (Sacred Patronage) (DV), `docs/decks/magisterial.md`, the Sacred Patronage row of `docs/decks/devotion.md` (DV), the shelf, the Cross-type row, the fixture, the schema line and its pins (DV), `test/sim/decks.test.ts` (+4) (DV), `src/ai/value.ts` (stand-ins) (DV), `test/sim/greatPeople.test.ts`, `test/sim/greatPeopleShapes.test.ts`, `test/sim/commissions.test.ts`, a new `test/sim/decks/magisterialPatrons.test.ts`.
- **Depends on:** MG7.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/magisterialPatrons.test.ts test/sim/greatPeople.test.ts test/sim/greatPeopleShapes.test.ts test/sim/greatPeopleDocSync.test.ts test/sim/renown.test.ts test/sim/commissions.test.ts test/sim/decks/devotion.test.ts test/sim/decks/magisterial.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts test/mapgen/moduleCycles.test.ts`.

- **Built (2026-10-26):** all three cards and the shared Sacred Patronage. The gate passed: the type check, 9,832 core tests and the build. Schema 191. The moment is `greatPersonSpent`, paid last in `spendGreatPerson`, with the work as a fact; a rider may carry `whileRaisingOpus`. The Immortals is the meta rule `legaciesCountTwice`, read at the legacy source. The figure is `workFamilies`. Readings added: Sacred Patronage plays as built, because its faith price is a flat 750 and does not escalate (its sheet rows say so); the Opus town is the first in founding order with the Opus at the front of its queue, and a moment that pays nothing keeps the once-a-turn limit; a work counts by its own family. Not done: `CLAUDE.md` says only Merchant Princes grants a great-person purchase clause; Spolia's text says "or your capital", but its production is banked toward the Opus.

### MG9: works on the land, and the wonder towns

- **Builds:**
  - The hex as a fact of the work-laid moment (`payWorkLaidRiders`), and a grant that claims the unowned hexes beside the moment's hex, refreshing the towns it changes (reading 29). Card: The Landmark Bounds.
  - A `CombatCondition` for a unit standing on a great-person work (reading 30). Card: The Custodians.
  - A `CommissionFigure` for one town with two wonders and three worked works, named by `commissionGoalTown` (reading 33). Card: Commission: The Ideal City.
  - A rule read in `refundBeatenWonders` that moves the hammers on (reading 34). Card: The Envious Eye.
- **Fence:** the three statecraft files (DV), `src/sim/improvements.ts` (`payWorkLaidRiders`), `src/sim/cities.ts` (`payWindfallGrants`' claim arm, `refundBeatenWonders`, the register on `refreshCityDerived`), `src/sim/combat.ts`, `src/sim/commissions.ts`, `data/decks/magisterial.json`, the sheet, the shelf, the fixture, the schema line and its pins (DV), `test/sim/decks.test.ts` (+4) (DV), `src/ai/value.ts` (stand-ins) (DV), `test/sim/wonders.test.ts`, `test/sim/sunkProgress.test.ts`, `test/sim/combat.test.ts`, `test/sim/commissions.test.ts`, a new `test/sim/decks/magisterialLand.test.ts`.
- **Depends on:** MG8.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/magisterialLand.test.ts test/sim/wonders.test.ts test/sim/sunkProgress.test.ts test/sim/combat.test.ts test/sim/commissions.test.ts test/sim/improvements.test.ts test/sim/decks/scientificLand.test.ts test/sim/occasionRiders.test.ts test/sim/decks/magisterial.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts test/mapgen/moduleCycles.test.ts`.

### MG10: the light capstones

- **Builds:** The Grand Vizier and The Divine Proportion (data only; readings 25, 26), and The Second Sitting with a rider filter that the passed hand cost culture, read off MG5's fact (reading 16).
- **Fence:** the three statecraft files for the filter (DV), `data/decks/magisterial.json`, the sheet, the shelf, the fixture, the schema line and its pins (DV), `test/sim/decks.test.ts` (+3) (DV), `test/sim/statecraft.test.ts` (two rows join `ORDERS_USING_A_SHAPE`) (DV), `src/ai/value.ts` (a stand-in if the filter needs one) (DV), a new `test/sim/decks/magisterialCapstones.test.ts`.
- **Depends on:** MG9.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/magisterialCapstones.test.ts test/sim/statecraftDraftPass.test.ts test/sim/statecraft.test.ts test/sim/decks/magisterial.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.

### MG11: Magnificence

- **Builds:** culture as a bank of the purchase verb, for a world wonder at the front of a town's queue, under a rule, priced at the hammers still needed, paid from the draft pool, refused and priced through `purchaseError` and `explainPurchaseCost` as the other banks are (reading 36). The command accepts the new bank. The city panel's buy control shows the culture price.
- **Fence:** `src/sim/purchase.ts`, `src/sim/commands.ts` (the bank's validation), the three statecraft files (DV), `src/ui/cityPanel.ts`, `src/ui/priceCell.ts`, `data/decks/magisterial.json`, the sheet, the shelf, the fixture, the schema line and its pins (DV), `test/sim/decks.test.ts` (+1) (DV), `src/ai/value.ts` (stand-in) (DV), `test/sim/purchase.test.ts`, `test/ui/cityPurchase.test.ts`, `test/ui/cityPanelBuying.test.ts`, `test/ui/priceCell.test.ts`, a new `test/sim/decks/magisterialMagnificence.test.ts`. If the DV plan touches `purchase.ts` (The Pious Masons), run the two one after the other.
- **Depends on:** MG10.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/magisterialMagnificence.test.ts test/sim/purchase.test.ts test/ui/cityPurchase.test.ts test/ui/cityPanelBuying.test.ts test/ui/priceCell.test.ts test/sim/wonders.test.ts test/sim/decks/magisterial.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.

### MG12: The Mixed Constitution

- **Builds:** one fit that asks the holder's council (for example `orderFitsSlotFor(state, playerId, order, chair)`), with `orderFitsSlot` kept as the plain rule; `reseatOrders` takes the fit, read from the old council at an adoption; the council is re-seated at once when the card leaves its chair (reading 24). Every caller moves: `slotOrderError`, `src/ui/statecraftScreen.ts` (the chairs a card fits), `src/ai/bot.ts` (five), `src/ai/value.ts`, `src/sim/cardImpact.ts`. `src/flairGallery/cardFaces.ts` keeps the plain rule.
- **Fence:** `src/sim/statecraftData.ts` (DV), `src/sim/statecraft/draft.ts`, `src/sim/statecraft/evaluator.ts` and `describers.ts` (the rule) (DV), `src/sim/cardImpact.ts`, `src/ui/statecraftScreen.ts`, `src/ai/bot.ts`, `src/ai/value.ts` (DV), `data/decks/magisterial.json`, the sheet, the shelf, the fixture, the schema line and its pins (DV), `test/sim/decks.test.ts` (+1) (DV), `test/sim/typedChairs.test.ts`, `test/sim/cardImpact.test.ts`, `test/ui/statecraftCards.test.ts`, a new `test/sim/decks/magisterialConstitution.test.ts`.
- **Depends on:** MG11.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/magisterialConstitution.test.ts test/sim/typedChairs.test.ts test/sim/cardImpact.test.ts test/ui/statecraftCards.test.ts test/sim/doctrineOffer.test.ts test/sim/decks/magisterial.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.

### MG13: The Universal Genius

- **Builds:** a field on `Unit` that marks a person that has acted (presence is the state), written in `greatPersonActAt`; the act does not spend the person while the rule is held; `greatPersonActError` refuses a second act; the work spends it (reading 23). The act and work controls ask the two refusals they ask today. If the batch shows the mark on the piece, the field joins `signUnits` and its source pin.
- **Fence:** `src/sim/state.ts` (the field and the schema line) (DV), `src/sim/greatPeople.ts`, the three statecraft files (DV), `src/ui/controls.ts` (only if a control reads more than the refusals), `data/decks/magisterial.json`, the sheet, the shelf, the fixture, the schema pins (DV), `test/sim/decks.test.ts` (+1) (DV), `src/ai/value.ts` (stand-in) (DV), `test/sim/greatPeople.test.ts`, `test/ui/unitPanel.test.ts`, a new `test/sim/decks/magisterialGenius.test.ts`.
- **Depends on:** MG12.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/magisterialGenius.test.ts test/sim/greatPeople.test.ts test/sim/greatPeopleShapes.test.ts test/ui/unitPanel.test.ts test/sim/decks/magisterialPatrons.test.ts test/sim/decks/magisterial.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.

### MG14: the boons

- **Builds:**
  - An on-draft grant of a random card, drawn as reading 37 says and settled as a pick, with `payCardDrafted` for the granted card. Card: The Cabinet of Curiosities.
  - `onDraft` widened to the windfall grant, paid through the one delivery, and a tile test on `GrantCount` (reading 38). Card: The Grand Retrospective.
- **Fence:** the three statecraft files (DV), `src/sim/cities.ts` (`raiseOnDraft`), `src/sim/commands.ts` (`applyChooseOrder`), `src/sim/statecraft/draft.ts` (the draw), `data/decks/magisterial.json`, the sheet, the shelf, the fixture, the schema line and its pins (DV), `test/sim/decks.test.ts` (+2) (DV), `src/ai/value.ts` (stand-ins) (DV), `test/sim/offers.test.ts`, `test/sim/decks/commercePairs.test.ts`, a new `test/sim/decks/magisterialBoons.test.ts`.
- **Depends on:** MG13.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/magisterialBoons.test.ts test/sim/offers.test.ts test/sim/decks/commercePairs.test.ts test/sim/decks/dominionUnits.test.ts test/sim/decks/magisterial.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.

### MG15: arrangements on the hex grid

- **Builds:**
  - A `CommissionFigure` for a work with works or tended works beside it, the goal's hex kept for the reward, and a reward that claims the unowned hexes within three, refreshing the towns it changes (reading 41). Card: Commission: The Paradise Garden.
  - The works on a line, found once in `groundFactsFor` and read by a new tile test (reading 39). Card: The Processional Way.
- **Fence:** the three statecraft files (DV), `src/sim/commissions.ts`, `src/sim/cities.ts` (the claim and the register), `data/decks/magisterial.json`, the sheet, the shelf, the fixture, the schema line and its pins (DV), `test/sim/decks.test.ts` (+2) (DV), `src/ai/value.ts` (stand-ins) (DV), `test/sim/commissions.test.ts`, a new `test/sim/decks/magisterialArrangements.test.ts`.
- **Depends on:** MG14.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/magisterialArrangements.test.ts test/sim/commissions.test.ts test/sim/decks/magisterialLand.test.ts test/sim/decks/magisterialCapstones.test.ts test/sim/decks/magisterial.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts test/mapgen/moduleCycles.test.ts`.

### MG16: The Pull of the Masters

- **Builds:** under a rule, a sweep in the borders phase where each work takes one rival hex (reading 40). It writes `state.tileOwner`, refreshes both towns, recomputes both empires' sight, and joins the register of mid-turn yield changes. A map-wide walk asks `tileOwnerField`. It adds no phase.
- **Fence:** `src/sim/cities.ts` (or the borders module that runs the phase), `src/sim/turn.ts` only if the phase must call it, the three statecraft files (DV), `data/decks/magisterial.json`, the sheet, the shelf, the fixture, the schema line and its pins (DV), `test/sim/decks.test.ts` (+1) (DV), `src/ai/value.ts` (stand-in) (DV), `test/sim/cities.test.ts`, a new `test/sim/decks/magisterialPull.test.ts`.
- **Depends on:** MG15.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/magisterialPull.test.ts test/sim/cities.test.ts test/sim/visibility.test.ts test/sim/decks/magisterial.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.
- **After MG16 every card of the plan plays as written:** 71 of 71.

### MG17: bot pricing

- **Builds:**
  - A `score.magisterial` group in `data/ai.json`, with rows in `data/ai.bounds.json`, and prices in `src/ai/value.ts` for every new kind of MG4 to MG16: the counts (Orders held, decks, Doctrines held), the two tallies and the five figures (through D16's commission price and its forecast), the moments (an adoption at the ladder's pace, a person spent at the spend rate, the hand's price), the rules (no Order reroll, the discount, legacies twice, culture buys a wonder, the holder fit, two charges, the rival hex, the hammers moved on), the counted `offerRider`, the on-draft grants and the random card, the claim grant and the new combat test.
  - The pass candidate (`skipCandidate`, `bot.ts`) adds what the seat's pass riders pay: The Unwritten Chapter's science and The Second Sitting's free hand.
  - The bot's purse may buy a wonder with culture under Magnificence (`bot.ts`, `wants.ts`), weighed against the draft the culture would buy.
  - Re-pin the explore digest and the bot digests with the control-run method of the D batches.
- **Fence:** `src/ai/value.ts`, `src/ai/bot.ts`, `src/ai/wants.ts`, `src/ai/aiConfig.ts` (the knob types), `data/ai.json`, `data/ai.bounds.json` (DV's last batch edits the same files), `test/sim/aiAppraisal.test.ts`, `test/sim/aiCommissions.test.ts`, `test/sim/aiDecision.test.ts`, `test/sim/explore.test.ts`, and the digests.
- **Depends on:** MG16. It touches no sim file.
- **Schema:** none.
- **Done-gate:** `npx vitest run test/sim/aiAppraisal.test.ts test/sim/aiCommissions.test.ts test/sim/aiDecision.test.ts test/sim/explore.test.ts`. The digest re-pin is the orchestrator's push-gate work (`npm run test:all`). **The Magisterial build plan is then complete.**

### Order and overlaps

- The track: MG1 → MG2 → … → MG17, one at a time.
- Why this order: the sheet and the data-only cards first (MG1 to MG3); then the shapes, from the early tiers' engine to the council, the patrons and the land (MG4 to MG9); then the cards on the readings most likely to change, the capstones, The Grand Vizier, The Mixed Constitution, The Universal Genius and Magnificence (MG10 to MG13); then the five costly one-card shapes that section 7 would cut first for less engine work (MG14 to MG16), so you can still cut them; then the bots (MG17).
- Cards that play as written after each batch: 12 of 71 after MG1, 26 after MG2, 39 after MG3, 44 after MG4, 47 after MG5, 50 after MG6, 53 after MG7, 56 after MG8, 60 after MG9, 63 after MG10, 64, 65 and 66 after MG11 to MG13, 68 after MG14, 70 after MG15 and 71 after MG16.
- **The files this plan shares with the Devotion plan:**

| File | MG batches |
|---|---|
| `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts` | MG4 to MG16 (MG1 to MG3 only if a sentence reads badly) |
| `src/sim/occasions.ts` | none |
| `data/decks/common.json` | MG1, MG4, MG8 |
| `src/sim/state.ts` (`SCHEMA_VERSION`) and its fifteen pins | MG1 to MG16 (MG13 also adds a `Unit` field) |
| `test/sim/decks.test.ts`, `test/fixtures/cardText.json` | MG1 to MG16 |
| `test/sim/decks/sortedSheets.ts` | MG1 |
| `test/sim/statecraft.test.ts` | MG1 (if a pin breaks), MG3, MG10 |
| `docs/orders-and-doctrines.md` (Cross-type table and notes) | MG1, MG4, MG8 |
| `docs/decks/devotion.md` (its shared rows) | MG8 |
| `src/ai/value.ts` | MG4 to MG16 (stand-ins), MG17 |
| `data/ai.json`, `data/ai.bounds.json` | MG17 |

- **The files the MG batches share among themselves:** `src/sim/commissions.ts` (MG4, MG7, MG8, MG9, MG15), `src/sim/cities.ts` (MG4, MG6, MG7, MG9, MG14, MG15, MG16), `src/sim/statecraft/draft.ts` (MG5, MG6, MG7, MG12, MG14), `src/sim/greatPeople.ts` (MG8, MG13), `src/sim/commands.ts` (MG5, MG11, MG14), `src/sim/religion.ts` (MG5, MG6), `src/ai/bot.ts` (MG5, MG12, MG17).

## Counts

**By group** (the 71 seatable cards of the tier tables):

| | Built | Group 1 | Group 2 | Group 3 | All |
|---|---|---|---|---|---|
| Tier 0 | 2 | 7 | 1 | 0 | 10 |
| Tier I | 3 | 8 | 4 | 0 | 15 |
| Tier II | 2 | 9 | 6 | 0 | 17 |
| Tier III | 1 | 6 | 10 | 0 | 17 |
| Tier IV | 0 | 3 | 9 | 0 | 12 |
| **All** | **8** | **33** | **30** | **0** | **71** |
| Shared | 12 | 0 | 2 | 0 | 14 |

The shared row counts the cards this plan answers for: 12 built (the ten, The Art Dealers and The Brokers' Redraw) and two it builds (Travelling Players, Sacred Patronage). The sheet also lists the five cards the Devotion plan builds, 19 in all once DV has moved its three. Beside these, MG1 retires 64 rows.

**The deck after section 12** (no charters):

| Tier | Seatable | Military | Economic | Civic | Wildcard | Common / uncommon / rare |
|---|---|---|---|---|---|---|
| 0 | 10 | 1 | 4 | 4 | 1 | 7 / 3 / 0 |
| I | 15 | 1 | 4 | 7 | 3 | 5 / 9 / 1 |
| II | 17 | 1 | 4 | 9 | 3 | 3 / 11 / 3 |
| III | 17 | 0 | 4 | 5 | 8 | 0 / 7 / 10 |
| IV | 12 | 1 | 4 | 4 | 3 | 0 / 2 / 10 |
| **All** | **71** | **4** | **20** | **29** | **18** | **15 / 32 / 24** |

- **By theme:** the council 13, the patrons 13, the landscape 13, the monuments 15, engine glue 17 (24%). Section 12 took The Markstones from the landscape and Gifts at Court from the glue, and the new commission joined the monuments.
- **New shapes:** 31, feature G among them, as section 7 counts them. The Markstones' shape is cut and The Quarter of Masters' exists; the hand's price is one field for two moments; The Last Commission's Opus filter, The Landmark Bounds' hex fact and the new commission's tally are added. The Siting Masters and The Golden Age need none.
- **Doctrines:** none.

## Follow-ups

**The UI track** (`src/ui/`):
- Magisterial's four institutions join the read-only list of institutions under the council.
- No notice reports the hexes The Landmark Bounds, The Paradise Garden or The Pull of the Masters claim.
- The offer card could show the hand's price, so The Accessions Register and The Unwritten Chapter read clearly.
- The unit panel could show that a person under The Universal Genius has acted and still holds its work.
- The Brokers' Redraw still has no button for a gold redraw.

**The bot track:**
- After MG17 the bots still never bank an adoption, so they seldom seat The Sed Festival before the tier-10 offer.
- The bots seat chairs by their own appraisal, so The Grand Vizier's first Economic chair is not chosen with the Vizier in mind.

**The sheet and the design:**
- Magisterial's Doctrines: `docs/plans/magisterial-doctrines.md`, then a triage of their own.
- The other decks' feature G cards (section 6 of the pass) wait for each deck's next pass.
- No Magisterial leader points at the council (section 2 of the pass).
- The Brokers' Redraw plays as built.

## Questions for the user

1. **The new commission's name.** "Commission: The Votive Monument" shares a word with three Devotion names a Magisterial seat can hold beside it (The Votive Gifts, The Votive Fields and the Votive Offering rite). *Recommended: Commission: The Eighth Wonder.* "The eighth wonder of the world" is what people called a new marvel, and the name sits beside The Seven Sights. The alternative is Commission: The Builder's Name (an Egyptian king's name carved on the monuments he raised). Neither name is used in `data/`, `docs/`, `src/` or `test/`.
2. **The Mixed Constitution leaving its chair** (reading 24). *Recommended: re-seat the council at once by the ordinary rule,* as an adoption does, so no card sits in a chair it does not fit. The alternative leaves misfit cards where they are until they are moved or the next adoption.
3. **The Golden Bull with no Doctrine to offer** (reading 19). Today only Dominion has Doctrines. *Recommended: the card waits in its chair until a Doctrine of the government's tier can be offered.* The alternative pays nothing and the card leaves.
4. **The readings.** May the build use readings 1 to 47 until you mark one?
