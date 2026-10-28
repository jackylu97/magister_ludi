# Batches R2a to R2d: the user's Devotion comments of 2026-10-28

**Status:** the spec, written 2026-10-28 before any agent starts. The user left 11 comments on the Devotion tab of the review page (version 17, "Deck sheets" group), then said: *"ok i made a ton of comments on the devotion deck, please make those changes"*. Each comment is quoted below with the card it sits on. The readings are the orchestrator's; each stands until the user changes it.

Four batches, run one after the other in the main tree:
- **R2a** changes two rules: the price of a rite, and the one-per-world rule for pantheon gods. Schema 200.
- **R2b** packages with each building the yields that cards put on it, and adds the count "buildings in this town that supply a yield". Schema 201. Added after the user's answer below.
- **R2c** changes the cards: three removed, four moved to Tier I, one revised with a new building, three new. Schema 202. It reads R2b's count.
- **R2d** makes every reader that asks whether a building pays a yield ask whether it supplies it, and prices doublers over the package in the bots. Schema 204 (batch BR1, `docs/plans/barbarians-2026-10-28.md`, takes 203 between R2c and R2d).

## R2a: two rules

### 1. A rite starts at 20 faith and costs more for each rite started

On The Rogations: *"for this to be relevant, we need to make rites cheaper early, and they currently are too late (divination). Lets move this to tier 1 for now and make rites cheaper to start (20 faith) and become more expensive for each rite the empire has started."*

- **Today:** `riteCost(age)` (`src/sim/religionData.ts`) reads `rite.costByAge` in `data/religion.json`: 40, 56, 72 and 90 faith by the empire's research age. Its docblock says the price does not vary with the rites an empire has started. `riteCostFor(state, playerId)` (`src/sim/religion.ts`) is the reading every surface asks.
- **The rule:** a rite costs `base + step × (rites this empire has started)`. The base is 20. The research age no longer sets the price.
- **Reading 1:** the step is **5 faith**: 20, 25, 30 and so on. The 15th rite costs 90, today's price in the fourth age. The two numbers live in `data/religion.json` (`rite.baseCost`, `rite.costPerRiteStarted`, or names in the file's style), and `costByAge` goes.
- **Reading 2:** "each rite the empire has started" counts every rite any of the empire's towns has started this game, of any kind, from the same moment that pays `riteStarted`. If the game already keeps that count on the player, read it. If it does not, add one counter on the player, raised in the one place a rite starts, and never lowered.
- **Reading 3:** the price stays one reading. The rite button, the refusal, the charge and the bots ask the same function. Where the game prints a price breakdown for a rite, print the base and the step as two lines; where it prints only a figure, the figure is enough.
- **Reading 4:** any card that changes a rite's price applies to the new figure, in the same order as today.
- The rites still need Divination. The comment moves The Rogations to Tier I "for now" (batch R2b); it does not move the technology.

### 2. A pantheon god is no longer one per world

On The Old Gods Remain: *"remove, overlap with stonehenge. One more thing: lets make all pantheons available to draft (no longer one in the world)"*.

- **Today:** `beliefPool` (`src/sim/religion.ts`) leaves out every pantheon belief another empire holds (the user's ruling of 2026-08-29, "a god belongs to one world").
- **The rule:** the pool leaves out only the gods this empire already holds. Two empires may hold the same god.
- **Reading 5:** this is for pantheon gods only. Founder, follower and enhancer beliefs keep today's rules.
- Find every other reader of the old rule (a "taken by" label, a bot that avoids a rival's god, a test, the Compendium, `docs/beliefs.md` or `docs/religion-v2.md`) and bring it in line.

## R2b: a building's package, and the buildings that supply a yield

The user, asked how much work a count of "buildings that supply X" would be: *"i think yields from effects should be 'packaged' with the building itself in the data model. for example, a card that says 'double the yields on temples' paired with a card that says '+2 science on temples' should supply +4 science. I think orders, doctrines, beliefs, wonders and luxuries should all count. Rites probably shouldn't count, the rule should be, anything that's an effect of a 'card' (what the player sees as a card, something that they've drafted) should count."* Before that, the user took three recommendations: a conditional line counts only while its condition holds; Hero of Alexandria's legacy widens with the new reading; and the count is one count for any yield.

**Today.**
- `cardLinesOnBuilding` (`src/sim/statecraft/evaluator.ts`) sums the flat town `pays` lines whose scope names one building (`hasBuilding`, alone or inside an `all`). Step 9 of `docs/yields.md` takes each building share (`buildingYieldPercent`, the doublers among them) over the building's row plus those lines. So "towns with a Temple gain +2 science" is already doubled by a doubler on temples.
- Lines written per building are not on the building: a town line counted by `buildingsOfKind` or `buildingsOfCategory` inside the town (The Temple of the Muses: "Culture buildings give +2 faith each"; Civic Granaries), and the luxuries' `buildingCategoryYields` (jade, tea, coffee, cotton, marble). A doubler misses them.
- `buildingSupplies` reads only the building's row: its base yields and its own flat lines. `hasBuildingYielding` (Hero of Alexandria's legacy) asks it.
- `cityEffectsOfKind` walks `liveCityEffects`, so rites reach `cardLinesOnBuilding` today.

**The rule.** A building's **package** is its row (base yields, per-citizen yields and its own lines) plus every line from a card source that is on it:
1. a flat town line whose scope names it (today's `cardLinesOnBuilding` rule);
2. a town line counted by its kind inside the town (`buildingsOfKind`, `within: 'city'`): one helping on that building;
3. a town line counted by its category inside the town (`buildingsOfCategory`, `within: 'city'`): one helping on each building of that category;
4. a luxury's `buildingCategoryYields` line: on each building it names (its category, or the wonders).

**Card sources.**
- **In:** the user's list: Orders, Doctrines, beliefs (pantheon, founder, follower and enhancer), wonders and luxuries.
- **Reading 10:** also in are the government's signature, malices and great-person legacies. The player holds each as a card face, so they fit the user's principle.
- **Also in** (the user, 2026-10-28: *"sorry, technologies and leader abilities should also count as "supplying yields", however i think these cases are more rare"*): technologies and the leader's abilities.
- **Out:** rites only (the user's ruling). A timed effect follows the source that gave it.
- A line that is not in the package still pays the town as it does today.

**One reading, three readers.** Write the package once (rename or widen `cardLinesOnBuilding`; a labelled list and its one sum, rule 5's discipline) and use it in three places:
1. **Step 9:** each building share is taken over the package. Lines that were not on the building before (items 2 to 4) now are, so a doubler doubles them too.
2. **Supplies:** a building supplies a yield when its package pays that yield (more than zero, under its conditions now), **or** it belongs to that yield's category. So every religious building supplies faith, every science building science, and so on, for the six categories named after a yield. `buildingSupplies` reads this, so `hasBuildingYielding` and Hero of Alexandria's legacy follow.
3. **A new count:** the buildings in a town that supply a given yield (`within: 'city'`), and the same across the empire (`within: 'empire'`) if it costs nothing more. Its words in the describers' table ("for each building in the town that supplies faith"), and the bots' price of it.

**What does not change.** Where the yields bank. Each card line still banks once, as the card's own labelled line (step 3, or step 4 for a luxury), so the town's breakdown still names the card that paid. The package is the building's view of those lines and of the share taken over them, never a second payment. A line under an `any` scope, a line counted across the empire and a `mirror` line stay facts about the town, as today.

**Conditions.** A line's scope is asked for the town now (`cityScopeAdmits`). A line that names a building but does not hold in that town is not on it.

**Loops.** The package reads the shape of each line and asks scopes. It never reads a count of suppliers, so a card that pays per supplier cannot feed its own count. Keep the existing depth guard of `buildingSupplies`.

**Docs and tests.**
- `docs/yields.md`: step 9's row and "Inside step 9" say what the share is taken over now; any sync test of that file passes.
- Tests: the user's example (a doubler on temples and "+2 science" on temples gives +4 science), written each way: by scope and by count; a category line and a luxury line on a building; a rite's line is not in the package; a conditional line counts only while it holds; a religious building with no faith of its own supplies faith; the count in a town; Hero of Alexandria's legacy with a wonder that a card makes supply science.
- The explore digest control, as in R2a; then re-pin with the reason.

## R2c: the cards

| Card | Where | The comment | The change |
|---|---|---|---|
| The Old Gods Remain | Devotion, Tier 0 | *"remove, overlap with stonehenge"* | Retired. |
| The Sacred Precincts | Devotion, Tier I | *"remove"* | Retired. |
| The Monastic Builders | Devotion, Tier I | *"remove, kind of boring"* | Retired. |
| The Founding Vows | Devotion, Tier 0 | *"move to tier 1"* | Tier I. |
| The Rogations | Devotion, Tier 0 | (quoted under rule 1) | Tier I. |
| The Gifts of the Faithful | Devotion, Tier 0 | *"move to tier 1"* | Tier I. |
| The Shrine Guards | shared with Dominion, Tier 0 | *"move to tier 1"* | Tier I. |
| The Schoolmen's Charter | shared with Scientific, Tier I | *"revise: create a new religious building instead of unlocking cathedral and apostle. effect: +2 science for every building that supplies faith in this city, doubled while this city has an active rite."* | Revised, with a new building (below). |
| The Tithe Barns (new) | Devotion, Tier 0 | *"add: +1 faith and +1 production in every city with a granary"* | New card. |
| The Royal Cult (new) | Devotion, Tier 0 | *"add: +1 faith for each population in your capital"* | New card. |
| The Temple Storehouses (new) | Devotion, Tier I | *"add: +2 happiness and +2 food on every temple"* | New card. |

Retired rows keep `retired: true` and stay in the data for saves (CLAUDE.md). Moved cards keep their text, rarity and type.

### The new cards

| Card | Tier | Rarity | Type | Text |
|---|---|---|---|---|
| **The Tithe Barns** | 0 | common | Economic | Cities with a Granary gain +1 faith and +1 production. |
| **The Royal Cult** | 0 | uncommon | Civic | Your capital gains +1 faith for each citizen. |
| **The Temple Storehouses** | I | common | Economic | Temples give +2 food and +2 happiness. |

- **Names** (the orchestrator's; the user did not name them): the tithe barns of medieval estates, which stored the Church's tenth of the harvest; the royal cult of the capital's temples in Egypt and Mesopotamia; and the temple storehouses of the temple economies, which kept grain.
- **Reading 6:** The Royal Cult is uncommon because it is large early: a capital of six citizens makes six faith a turn in Tier 0.
- **Reading 7:** each uses a shape that exists: a city line under a building scope (The Agora: "+3 gold in each city with a Granary"), a capital line paid per citizen (Market Day: "+1 gold per citizen in your capital"), and a city line with happiness under a building scope (The Wayside Shrines: "Cities with a Shrine gain +2 food and +1 happiness"; a town holds one Temple, so "Temples give" and "cities with a Temple gain" pay the same). If one needs a new shape, stop and report; do not bend a near fit.
- Flavour lines: write one for each, in the style of the deck's rows, labelled Flavour as always.

### The Schoolmen's Charter and the Cathedral School

- **Today:** the charter opens the charter technology Scholasticism. Knowing it lets the empire build the Cathedral and buy the Apostle before Theology (`data/techs.json`, Scholasticism's `unlocksBuilding` and `unlocksUnit` effects; Devotion batch DV2).
- **The change:** Scholasticism no longer opens the Cathedral or the Apostle early. It opens a new religious building, **the Cathedral School**. Name: the cathedral schools of the eleventh and twelfth centuries, where the schoolmen taught before the universities.
- **The Cathedral School:** a religious building (the faith category), medium size, opened only by knowing Scholasticism (its `unlocks.buildings`). It gives +2 science for each building in its town that supplies faith (R2b's count), and +2 more for each while the town keeps a rite.
- **Reading 8 (revised by R2b):** "every building that supplies faith" is R2b's count: the buildings in the town that supply faith. Every religious building does, and so does any building a card makes pay faith. The Cathedral School is a religious building, so it counts itself.
- **Reading 9:** "doubled while this city has an active rite" is a second line of the same size under the scope of a town keeping a rite (`keepingRite`).
- **The card's new text:** "Drafting this opens Scholasticism for research. Knowing it lets you build the Cathedral School: +2 science for each building in the town that supplies faith, doubled while the town keeps a rite. No chair required."
- The early-unit purchase path that DV2 added to `purchase.ts` stays as general code; no card uses it after this.
- Update the shared row on the Devotion and Scientific sheets, the Scientific deck's charter notes if they name the Cathedral or the Apostle, and the Compendium if it has hand-written words about Scholasticism.

### Sheets and docs

- `docs/decks/devotion.md` is the spec of record: move, retire and add the rows there (the retired rows to its "Retired rows" section), and update its count tables. `docs/decks/dominion.md` and `docs/decks/scientific.md` carry the two shared rows. `docs/orders-and-doctrines.md` mirrors the data. Their sync tests must pass.
- Add a "Built" note to this file's end when each batch passes the gate.

## R2d: "supplies" means one thing across the game

The user, 2026-10-28, on two older readers that still ask only a building's row: *"ok yeah, we should use the 'supplies' keyword across the game."*

**The rule.** Wherever the game asks whether a building pays, yields or provides a yield, it asks R2b's question: does the building **supply** it (`buildingSupplies`: its package pays the yield, or it belongs to that yield's category). No reader keeps its own row-only version.

**Known readers to move** (R2b's report):
1. The `scienceBuildings` count (Maimonides, Āryabhaṭa). Move its readers to `buildingsSupplying` with the science voice, or make it read `buildingSupplies`; retire the duplicate if nothing else needs it.
2. The `pays` selector on a building share (`buildingPaysVoice`; "faith buildings provide 50% more yields" and the like). A share now reaches every building that supplies the yield.
3. Any other reader you find: search for row-only tests of a building's yields (`buildingDef(...)[voice]`, `def.faith`, `def.science` and so on, inside a "does this building pay X" question). A reader that wants the row's own number for a figure, not a yes or no, stays as it is.

**A building's own lines are on it** (found by R2c). R2b put a building's own flat line in its package, but not its own counted lines. The Cathedral School's science is two counted lines (buildings in the town that supply faith), so a doubler on the school would miss them. A building's own lines, flat or counted, are in its own package. Keep `buildingSupplies`' depth guard: the school's count asks every building whether it supplies faith, the school included, and the guard stops that from asking the school's own count again. A test shows the school's package holds its science and the count still ends.

**Loops.** A share's selector now asks the package, and the package never reads a share (step 9 takes the shares over the package). Keep `buildingSupplies`' depth guard. A test shows that a share selected by "supplies faith" over a building whose faith comes only from a card ends and pays.

**The bots.** Price a building share (`buildingYieldPercent`, the doublers among them) over the building's package, not its row alone (`src/ai/value.ts`), so Rumi, The Bourse and the like are priced with the card lines they now reach.

**The word.** Every describer and Compendium line that means this test says "supplies" ("buildings that supply faith"), not "yield", "pay" or "provide". If the Compendium has a place for a game term (its Rules shelf, `rule:` marks, or a glossary), add "supplies" there with one plain sentence: a building supplies a yield if it belongs to that yield's buildings, or if its own row or a card puts that yield on it. Mark the word where the describers print it. If no such place exists, do not add a new kind of mark; say so in the report.

**What changes in play.** Name in the report every card, wonder, belief or luxury whose pay moves, and why.

Schema 204. Explore digest control as in R2a.

## Not in these batches

- The rest of the Devotion deck, and the other decks' sheets.
- When the rites open (Divination). The comment moves the card instead.

## Built

- **R2a (2026-10-28):** as planned. The gate passed: the type check, 10,112 core tests and the build. Schema 200.
  - **The rite price:** `rite.costBase` (20) plus `rite.costPerRiteStarted` (5) for each rite started, in `data/religion.json`. `costByAge` is gone. The 1st rite costs 20, the 2nd 25, the 15th 90.
  - **The count:** the game had no count for each player, so `Player.ritesStarted` is new. Its one writer, `countRiteStarted` (`religion.ts`), also pays the `riteStarted` tally, so the price and the cards count the same rites. A town's rite counts once. A prophet's rite over the realm counts once for each town it reaches. The Votive Offering and the Restoring of the Host do not count, and they pay the current price.
  - **Each rite** is charged before the count rises. `riteCostFor` is still the one reading. No card changes a rite's price.
  - **The Rites tab:** "enough for N rites" now uses the rising price (`riteCostAhead`, `ritesAffordable`). Its note says what the next rite costs.
  - **The gods:** `beliefPool` was the only code that kept a god to one world. It now leaves out only the empire's own gods. Follower and enhancer beliefs are unchanged.
  - **The explore digests** moved only by the schema number: at 199 the old pins held.
  - **To judge in play:** a prophet's rite over N towns raises the next price by five times N.
  - **Left for the push gate:** the six-seat bot digests will move.
- **R2b (2026-10-28):** as planned. The gate passed: the type check, 10,128 core tests and the build. Schema 201.
  - **The package:** `explainBuildingPackage(state, city, id)` is the labelled list and `foldBuildingPackage` its one sum. They replace `cardLinesOnBuilding`. The list holds the row (with per-citizen science at the town's size), the card lines on the building, and the luxury lines on it (`resourceLinesOnBuilding`, in `resourceEffects.ts`). Every live source counts except rites, filtered by the rite's card id, so a rite's timed line stays out. A building the town does not hold carries its row only.
  - **A line has one home** (a reading the agent took): Hagia Sophia's "+1 culture +1 faith in towns with a Temple" sits on the Temple, not also on the wonder, so no two shares are taken over one line.
  - **The readers:** step 9 takes each share over the package; `buildingSupplies` answers yes for the building's category or a package that pays the voice; the new count `buildingsSupplying` (the town with `within: 'city'`, the realm without). The bots price it through `countOf`.
  - **What pays more now:** The Bourse reaches Commercial Education's science on gold buildings; Rumi reaches The Painted Chapels, the Treasury of Relics patron and Hildegard's Symphonia on temples; Dürer reaches marble's culture on wonders and the counted category lines on wonders; Aristotle and al-Jazari reach the third-age luxury lines (tea, coffee, jade, cotton).
  - **The explore digests** moved only by the schema number.
  - **Left for R2d:** the `scienceBuildings` count, the `pays` selector on a building share, and the bots' price of a share still read the row alone.
- **R2c (2026-10-28):** as planned. The gate passed: the type check, 10,141 core tests and the build. Schema 202.
  - **The cards:** The Old Gods Remain, The Sacred Precincts and The Monastic Builders are retired; The Founding Vows, The Rogations, The Gifts of the Faithful and The Shrine Guards are at Tier I; The Tithe Barns ("+1 production, +1 faith in every city with a Granary"), The Royal Cult ("+1 faith in your capital per citizen there") and The Temple Storehouses ("+2 food" and "+2 happiness in every city with a Temple") are new. The Devotion tiers hold 6, 9, 21, 16 and 14 cards.
  - **The Cathedral School:** faith category, medium, column 6 (154 production). It prints "+2 science per building in this city that supplies faith" and the same line "while it is keeping a rite". It counts itself. Scholasticism opens it and nothing else; the Cathedral and the Apostle wait for Theology again and lost `unlockedByCard`. A new describer helper (`hereCondition`) prints a counted line's other scope tests on a building's own page, so the two lines no longer fold into one.
  - **A conflict to confirm:** The Temple Storehouses is a Temple card at Tier I, against the rule of 2026-10-25 that no Devotion card about the Temple comes before Tier II. Built where the user's comment placed it; the sheet notes it.
  - **The explore digests** moved only by the schema number.
  - **Found:** the school's own counted lines were not in its package (now an R2d item); the retired Order "Tithe Barns" (`titheBarns`, `data/statecraft.json`) shares the new card's name but not its id; `docs/leaders.md` proposes a leader building also called "the Cathedral School" (not in the data).
