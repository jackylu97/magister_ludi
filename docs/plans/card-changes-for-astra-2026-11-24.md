# Card, belief and rule changes for Astra, 2026-11-24

This file is one build specification. It collects the user's rulings of 2026-11-23 and 2026-11-24 on cards, beliefs, wonders and base rules. It changes no data, no code and no test. No test, bot game or dev server was run for it.

**The specification of record is the user's words in the source documents.** Each source has a section headed "The user's comments". That section outranks the text below it. This file is an index of those sections. If this file and a comments section disagree, the comments section is right.

**Timing.** The user's words, in order:
1. 2026-11-23: "let's queue these items because i'd like my friend to playtest on the current branch"
2. 2026-11-24: "Please take all our determinations and send them to astra"
3. 2026-11-24, later: "ok commented on the wonders doc. i want to have these changes in for the playtest, i changed my mind"

The later ruling stands. Build these changes for the playtest build. Several comments sections still say "Nothing is built yet" or "These changes wait in the queue behind the playtest". Line 3 reverses those sentences.

**Astra may already be building.** The user on 2026-11-24: "i'm just having astra chug through all of it right now". So this file is the index to check that build against. The comments sections of the documents stay the specification of record.

**Sources** (all in `docs/plans/`). The short name is used in the tables.

| Short name | File |
|---|---|
| DIR | `deck-direction-review-2026-11-23.md` |
| DOM | `deck-review-dominion-2026-11-23.md` |
| EXP | `deck-review-expansionist-2026-11-23.md` |
| COM | `deck-review-commerce-2026-11-23.md` |
| SCI | `deck-review-scientific-2026-11-23.md` |
| SCI2 | `scientific-second-pass-2026-11-24.md` |
| DEV | `deck-review-devotion-2026-11-23.md` |
| BEL | `devotion-beliefs-pass-2026-11-23.md` |
| WON | `wonder-review-2026-11-23.md` |

**Waiting.** The user ruled on ten wonders in WON on 2026-11-24. Those ten are in "Wonders". The user deferred the rest of that review to the beta checklist. Build nothing from the deferred part.

---

## How to read a row

**Columns.**
- **Item:** the name, then the row id (the JSON key) and the file under `data/`.
- **Kind:** `change` (new text or number), `new` (no live row), `move` (another tier, or another deck list), `retire` (the row leaves every pool and keeps its place for saves), `rarity`, `keep` (the user ruled that the row stays as it is).
- **Today:** the live `text` of the row, its tier and its rarity, read from the data on 2026-11-24. "Tier II" is `band: 2`. A wonder row has no `text` field, so its Today cell describes the row's effects.
- **Ruled:** the new text or the action, as the comments section settles it.
- **The user's words:** a short quote, with the user's spelling, and the source.
- **Size and check:** the size as the review judged it (text change, existing shape, small extension, new shape) and the check the review named. "Not judged" means that the review gave no size for the text that the user settled.
- **Status:** one of the words below.

**Status words.**
- **SETTLED:** the user ruled in words.
- **DEFAULT:** the user gave no direct answer. The recommended reading stands, as the user's standing rule allows. The user can overrule each of these.
- **NAME OR NUMBER OPEN:** the change is settled. A name, a number or the final words are still to choose. The row says which.

Rows that must not be built are in "Not to build" at the end of each section.

---

## Magisterial

Rows are in `data/decks/magisterial.json` unless the row says another file. The Hanlin Academy is in "Shared and generic cards". The Mausoleum is in "Wonders".

| Item | Kind | Today | Ruled | The user's words | Size and check | Status |
|---|---|---|---|---|---|---|
| The Peregrini (`thePeregrini`, doctrines) | change | Doctrine, Tier II: "Great-person works give +1 food and +1 production to every hex beside them. Laying a great-person work makes your next great person cost 20% less." | The discount goes. The first sentence stays: "Great-person works give +1 food and +1 production to every hex beside them." | "good" (DIR, settled row 2) | Text change | SETTLED |
| The Honoured Dead (`theHonouredDead`) | change | Tier II, uncommon: "Gains +8 science and +8 production in your capital each time you gain a great person." | It keeps its shape. The gain is +5 science and +5 production each time you gain a great person. | "let's just nerf the effect. +5 science and +5 production in your capital" (DIR, settled row 3) | Number change. The card keeps its effect kind. | SETTLED |
| The Hall of Heroes (`magisterialTheHallofHeroes`) | change | Tier II, common: "Your units gain +1 strength for each great person you have gained." | "Your units gain +2 strength for each family of great person you have gained." | "Yeah, good." (DIR, settled row 4) | Existing shape: the count `legacyFamilies` | SETTLED |
| The Golden Age (`theGoldenAge`) | change | Tier II, rare: "Completing a wonder or gaining a great person gives your cities +25% production and culture for ten turns. A later one restarts the ten turns." | It fires on wonders only: "Completing a wonder gives your cities +25% production and culture for ten turns. A later one restarts the ten turns." | "yeah sounds good" (DIR, settled row 5) | Text change (one effect removed) | SETTLED |
| The Symposium (`theSymposium`) | change | Tier II, uncommon: "Each time you gain a great person, you are dealt a free Order hand." | "Each time one of your great people acts, you are dealt a free Order hand." | "Ok, that's a good change i think" (DIR, settled row 6) | Existing shape: the `greatPersonAct` moment with the `freeDraft` grant | SETTLED |
| Commission: The Eighth Wonder (`magisterialTheEighthWonder`) | change | Tier I, uncommon: "Goal: complete a wonder. Reward: each wonder you hold gives +3 culture and +5 renown." | "Goal: complete a wonder. Reward: a free great-person draft, and each wonder you hold gives +3 culture." | "great" (DIR, settled row 7) | Text change | SETTLED |
| Commission: The Paradise Garden (`magisterialTheParadiseGarden`) | change | Tier III, rare: "Goal: have one town work three great-person works. Reward: your great-person works yield double." | The goal stays. Reward: "each great-person work gives +2 of its own yield for each other work in its town". | "paradise garden sounds good." (DIR, answers, point 1) | Not judged for this reward | SETTLED |
| The Second Summons (no live row) | new | New | Tier III, rare, Wildcard: "Your great people may act twice." | "thats cool, i like it" (DIR, settled row 10) | Existing shape: the amplifier of The Collected Works with no family. Check: what a scholar does when both cards are seated. | SETTLED |
| The Panegyric (no live row) | new | New | "When one of your great people acts, you gain one free reroll." The review's first proposal row gave Tier I, uncommon, Civic. The comments do not restate them. | "panegyric, how about gain 1 free reroll when one of your great people acts." (DIR, answers, point 2) | Not judged for this text | SETTLED |
| The Anteroom (no live row) | new | New | Tier I, uncommon, Civic: "Your capital gains +3 culture for each Order you hold but have not seated." | "your capital gains +3 culture for each unslotted order in your hand." (DIR, new cards table) | Existing shape, if the count that the Doctrine Scutage reads is open to a `pays` line. Check this in the build. | SETTLED |
| The reroll card (no live row) | new | New | Tier II, uncommon, the user's text as written: "Each time you reroll a draft, this card gains +2 culture and +2 gold. rerolls cost 50% less faith." It takes the place of The Tabularium. | The Ruled cell is the quote. (DIR, new cards table) | The count `rerollsWhileSlotted` exists on a retired card. The cheaper reroll is a small extension. | NAME OR NUMBER OPEN: the name. The comments give no card type. |
| The swap card (no live row) | new | New. Today a seated Order is locked for five turns (`sealTurns: 5`, `data/statecraft.json`). | Tier III, rare. It gains yields each time you seat a card in your government. It gains on every seating. Cards are locked for two turns. It takes the place of The Ancient Constitution. | "scaling card that gains yields every time you swap a card into your government. cards are only locked for two turns." and "lets try with every seating." (DIR, new cards table and answers, point 3) | The rule `sealTurns` exists. The tally of cards seated is a small extension. | NAME OR NUMBER OPEN: the name, the yields it gains and their size. The comments give no card type. |
| The Pandects (`thePandects`) | move | Tier III, uncommon: "+5% science and production for each Doctrine you hold." | It moves to Tier II. The text stays. | "sure" (DIR, settled row 11) | Tier move | SETTLED |
| Commission: The Golden Bull (`magisterialTheGoldenBull`) | move + change | Tier III, uncommon: "Goal: hold 20 Orders. Reward: a Doctrine offer." | It moves to Tier II. The goal is 12 Orders. | "sure" (DIR, settled row 12) | Number change and tier move | SETTLED |
| The Roll of Masters (`theRollOfMasters`) | retire | Tier III, uncommon: "+3% science and culture for each great person you have gained this game, at most +30%." | Retired. | "roll of musters can go." (DIR, answers, point 4) | Data only | SETTLED |
| The Garden Courts (`theGardenCourts`) | retire | Tier III, uncommon: "Towns working a great-person work gain +20% culture and science." | Retired. | "garden courts can go." (DIR, answers, point 4) | Data only | SETTLED |
| The Sed Festival (`theSedFestival`) | keep | Tier II, uncommon: "On draft: gain a free great-person draft." | It stays. | "sed festival is fine." (DIR, answers, point 4) | None | SETTLED |
| The cluster of works: The Divine Proportion (`theDivineProportion`), The Processional Way (`theProcessionalWay`), Commission: The Ideal City (`magisterialTheIdealCity`) | keep | The Divine Proportion, Tier III, rare: "The bonuses your cards give great-person works are doubled." The Processional Way, Tier IV, rare: "Hexes beside two or more great-person works give +10 culture and +10 science." Commission: The Ideal City, Tier IV, rare: "Goal: have one town hold two wonders and work two great-person works. Reward: that town's culture, science and production are doubled." | None of the three changes. The cluster stays a broken combo. | No comment. DIR: "The user did not comment on these, so the recommended reading stands until the user says otherwise". | None | DEFAULT |

**Not to build (Magisterial).**
- The Ancient Constitution ("You keep the ability of the government you held before this one."). The user: "not very fun."
- The Tabularium ("+1% science and culture for each Order you hold, seated or not."). The user: "a bit boring"
- The Areopagus ("Each town gains +1 culture for each Civic card you have seated."). The user: "this feels way too strong, could we not have it scale off of every town."
- The Tier III version of The Anteroom ("Each Order you hold but have not seated gives your capital +3 production and +3 culture."). The user asked for one card: "suggested above, lets reconcile the two". The Tier I row above is that card.
- The Hanlin Academy with one effect ("Great people cost 20% less renown."). The user wrote a new text. See "Shared and generic cards".
- The Honoured Dead by families ("+15 science and +15 production for each family"). The user dropped the family count for this card.
- Commission: The Paradise Garden with the reward "that town works three more hexes". The user: "this isn't a great effect, that's basically just adding three population, no?" The second suggestion (a free great-person draft for each wonder the town completes) was not chosen.
- The Panegyric as "+2 culture and +2 gold, and +2 more for each act", and the two later suggestions (yields in the capital sized by the age; +20% science, gold and culture for ten turns).
- The swap card that gains only for an Order not seated before.
- A cut of The Sed Festival.
- A lower number on The Masters' Domain. The review named it only as a later step, and the user did not rule on it.

---

## Dominion

Rows are in `data/decks/dominion.json`. The Missi Dominici is in "Shared and generic cards".

| Item | Kind | Today | Ruled | The user's words | Size and check | Status |
|---|---|---|---|---|---|---|
| Pax Romana (`paxRomana`) | change | Tier III, rare: "Towns you capture are pacified at once." | "Towns you capture are pacified at once, and each gains +5 food and +5 production for good." | "Sure, i'm down for this." (DIR, settled row 13) | Existing shapes. Not verified: what a captured town keeps, and whether Vae Victis doubles the +5 and +5. | SETTLED |
| The Companion Cavalry (`dominionTheCompanionCavalry`) | change | Tier III, rare: "A unit of yours that kills a unit regains its movement." | "A unit of yours that kills a unit regains its movement and may attack again." | "attacks should refresh too", "great" and "yes" (DOM, row 1) | Small extension: the rule `moveAfterKill` leaves `hasAttacked` set. The card needs a field or a sister rule that clears it after a kill. | SETTLED |
| The Sacred Band (no live row) | new | New | Tier III, rare, Military: "When one of your Elite units dies, gain a melee unit in your capital. It starts as a Veteran." | "thats cool, lets add it" and "yes" (DOM, row 2) | Small extension in two places: the `death` moment must carry the dead unit's rank, and the unit grant (`bestMelee`) needs a starting rank. Build decision: whether the new unit is marked free, which changes what The Glorious Dead refunds. | SETTLED |
| The Huscarls (no live row) | new | New | Tier III, rare. It takes the place of Interior Lines. The user's wording is the base: "Elite units in a garrison give twice the garrison bonus of your other cards." The build chooses the final words. | "sure", then "it should probably read as \"elite units in a garrison give twice the garrison bonus from other effects\" or something" (DOM, row 3) | Small extension, judged for the first text ("counts as two garrisoned units"): the `garrison` count needs a weight by rank. Type: Wildcard by the sort rule, to confirm. | NAME OR NUMBER OPEN: the final words |
| Interior Lines (`interiorLines`) | retire | Tier III, uncommon: "Roads cost your units 40% less movement." | Retired. | "lets cut" and "great" (DOM, row 4) | Data only | SETTLED |
| The Tributary Kings (`theTributaryKings`) | change | Tier III, uncommon: "Your capital gains +2 production and +2 gold for each citizen in your puppet towns." | The card stays. It reads citizens in captured towns. The puppet-town effect is removed. The review's text: "Your capital gains +1 production and +1 gold for each citizen in towns you captured." | "yup, tributary kings should be changed, the old effect cut." (DOM, row 5) | Small extension: the walk of `puppetPopulation` with the `captured` test | SETTLED |
| The Drill Masters (`theDrillMasters`) | move | Tier III, common: "Garrisoned units gain 1 experience each turn." | It moves to Tier II. The text does not change. | No comment in DIR. On the Dominion review, whose first recommended change lists this move: "i like the changes." | Tier move | DEFAULT |
| The Horde (`theHorde`) | move | Tier IV, rare: "Pillaging a hex also pillages every enemy improvement beside it." | It moves to Tier III. | The same as the row above. | Tier move | DEFAULT |
| The drill loop: The Drill Masters with Up Through the Ranks (`upThroughTheRanks`) | keep | Up Through the Ranks, Tier III, uncommon: "Each time one of your units becomes an Elite, gain 250 renown, favouring great generals." | It stays as a broken combo. Neither text changes. Watch in play whether moving units through garrisons is a chore. | "yes keep it." (DOM, below the table) | Not verified: that Up Through the Ranks pays for an Elite made by drill. | SETTLED |

**Not to build (Dominion).**
- The Huscarls with the text "Each Elite unit in a garrison counts as two garrisoned units." The user gave another wording.
- A cut of The Tributary Kings. The user's last word is to change it.
- A change to Up Through the Ranks so that it pays only for an Elite made in a fight.
- A Dominion card that reads spare authority, other than The Missi Dominici. The user's note is for the next Dominion pass: "let's make a note: there should be maybe more payoff for spare authority in the deck".

---

## Expansionist

Rows are in `data/decks/expansionist.json`. The Missi Dominici is in "Shared and generic cards".

| Item | Kind | Today | Ruled | The user's words | Size and check | Status |
|---|---|---|---|---|---|---|
| The Megalopolis (`theMegalopolis`) | change | Tier III, rare: "Towns of ten or more citizens gain +1 science and +1 production for each citizen." | "Each town gains +2 science and +2 production for each citizen above ten." | "sure" (EXP, row 2) | Small extension: the count `population` needs a floor to count above | SETTLED |
| The Mother City (`theMotherCity`) | change | Tier IV, rare: "Your capital gains +5% production and +5% culture for each town you have founded this game." | "Your capital gains +1 production and +1 culture for each citizen in the towns joined to it by road." | "cool" (EXP, row 5) | Existing shape: `pays`, `where: capital`, `count: population` with `admits: connected` | SETTLED |
| The Water Boards (`theWaterBoards`) | move | Tier IV, uncommon: "Your public works yield twice as much." | It moves to Tier III. | "sure" (DIR, settled row 14) | Tier move | SETTLED |
| The Road Home (`theRoadHome`) | move | Tier 0 only, common: "Each town you found is joined to your nearest town by road." | It is dealt in Tier 0 and Tier I. | "approved for all the above" (EXP, row 1 and the line below the table) | Data only: `lastBand: 1` | SETTLED |
| Tinkers' Guild (`expansionistTinkersGuild`) | retire | Tier I, common: "Workers gain +1 charge." | Retired. | "great cut" (EXP, row 6) | Data only | SETTLED |
| The Great Migration (`theGreatMigration`) | retire | Tier IV, rare: "Every ten turns, each foreign town near your border loses a citizen to your nearest happier town." | Retired. | "cut" (EXP, row 8) | Data only | SETTLED |
| The Theodosian Walls (`theTheodosianWalls`) | retire | Tier IV, common: "Your towns gain +1 defence for every two citizens." | Retired. | "cut" (EXP, row 9) | Data only | SETTLED |
| The Local Census (`theLocalCensus`) and Provincial Councils (`provincialCouncils`) | keep | The Local Census, Tier I, common: "A town working four improved tiles costs 1 less authority." Provincial Councils, Tier II, common: "Towns joined to your capital by road cost 1 less authority." | Both stay. The review recommended no cut for this row. | "cut", then "'cut' is agreeing with the recommendation, i forget exactly which to cut." (EXP, row 7) | None | SETTLED |
| The levy loop: Levy of the Land (`levyOfTheLand`), The Mit'a (`theMita`), the Doctrine Human Sacrifice (`humanSacrifice`), The Corvée (`theCorvee`) | keep | Levy of the Land, Tier I and II, common: "A town may spend a citizen for production equal to the food it took to grow. Once every five turns." The Mit'a, Tier III, uncommon: "Needs a levy. A citizen spent on a levy returns to its town twenty turns later." Human Sacrifice, Doctrine, Tier II: "Your towns may levy every two turns instead of every five. Your capital may levy a citizen to perform a rite across your empire." The Corvée, Tier IV, uncommon: "Your towns may levy a citizen toward the Magnum Opus." | It stays as a broken combo. No card changes. | "approved for all the above" (EXP, row 1) | None | SETTLED |
| The Imperial Roads (`theImperialRoads`) with The Sovereign Writ (`theSovereignWrit`) | keep | The Imperial Roads, Tier III, rare: "Towns joined to your capital by road cost no authority." The Sovereign Writ, Tier III, rare: "Spare authority's bonus has no ceiling." | The pair stays. The Imperial Roads still cancels the drawback of the Doctrine The Mandarinate ("Each of your towns costs 1 more authority."). | "yup keep" (EXP, row 1) | None | SETTLED |

**Not to build (Expansionist).**
- A cut of The Local Census or of Provincial Councils.
- Any change to Levy of the Land, Seasonal Levies or The Mit'a.
- The Missi Dominici with "for every five points of spare authority". The user raised it to each point.

---

## Commerce

Rows are in `data/decks/commerce.json`.

| Item | Kind | Today | Ruled | The user's words | Size and check | Status |
|---|---|---|---|---|---|---|
| Land Speculation (`landSpeculation`) | change | Tier 0, uncommon: "Buying a hex grants culture equal to half the gold paid." | "Buying a hex grants 6 culture." The number is the user's. | "yeah needs a nerf. Make this a flat amount, like 6 culture." (COM, row 3) | Not judged for the flat form | SETTLED |
| The Casa da Índia (`theCasaDaIndia`) | change | Tier IV, rare: "Every copy of a luxury you hold pays its yields, not only the first." | Each copy of a luxury counts as a luxury of its own. Extra copies give no happiness. A clearer wording, proposed: "Your cards count every copy of a luxury you hold, not only the first. Extra copies give no happiness." | "cool idea. could be phrased better." and "down to add this" (COM, row 5) | Small extension: one more flag makes the count of different luxuries (`countedLuxuries`) read copies. Not verified: what the count `luxuryCopies` returns. | NAME OR NUMBER OPEN: the final words |
| The Gilded Scaffold (`theGildedScaffold`) | change | Tier III, rare: "You may purchase world wonders. All your cities lose 15% production." | "You may buy world wonders with gold." The penalty goes. | "great" (COM, row 6) | Text change: remove the `percentYields` line. Not verified: whether the purchase cards fire on a wonder bought this way. | SETTLED |
| Houses of Account (`housesOfAccount`) | change | Tier II, common: "Gold buildings provide +1 happiness and +2 renown." | "Gold buildings provide +2 renown." The happiness goes. The renown stays at +2. | "let's just do +2 renown." (COM, row 7) | Text change | SETTLED |
| Bought and Paid For (`boughtAndPaidFor`) | change | Tier IV, rare: "+2% production and culture for each building you have bought with gold, at most +30%." | It counts buildings bought with gold or with faith. | "cool, great" (COM, row 9) | Small extension. The Votive Accounts and The Double Entry already read both banks. | SETTLED |
| The Feitorias (`theFeitorias`) | change | Tier IV, uncommon: "Each town holding your trading post gives you +1 science and +1 culture for every four of its citizens." | It pays for every two citizens. | "sure every two citizens is fine." (COM, below the table) | Data only | SETTLED |
| The Treaty Ports (`theTreatyPorts`) | change | Tier II, uncommon: "+8% production for each empire you hold a deal with, at most +40%." | It reads the one count "an empire you trade with". See "Base rules". | "thats cool, and makes intuitive sense. That should be somewhere in the compendium" (COM, row 8) | Small extension: one count reads both lists. The card text changes one phrase. | SETTLED |
| Commission: The Trade Mission (`commissionTheTradeMission`) | change | Tier I, uncommon: "Goal: hold deals with two empires at once. Reward: a great merchant." | Its goal reads the same count. | The same quote (COM, row 8) | The same | SETTLED |
| The Exchange (`theExchange`), The World's Exchange (`theWorldsExchange`), Commission: The World's Fair (`theWorldsFair`) | change | The Exchange, Tier II, uncommon: "+5% science and culture for each foreign empire your routes reach." The World's Exchange, Tier IV, uncommon: "+20% production toward the Opus for each foreign empire your trade routes reach." The World's Fair, Tier IV, rare: "Goal: have trade routes to four empires. Reward: your trade routes to other empires pay twice as much." | The review names these three as readers of the same count (COM, section D.3, connection 1). The comments row adopts the count and names only The Treaty Ports and The Trade Mission. | The same quote (COM, row 8) | The same | SETTLED for the count. Confirm that these three rows change too. |
| The Monte di Pietà (`theMonteDiPieta`, doctrines) | retire | Doctrine, Tier IV: "Every 200 gold in your treasury gives +1 happiness, at most +20. Your towns make 10% less gold." | Retired. | "cut, not interesting" (COM, second round) | Data only | SETTLED |
| The Wayside Inns (`theWaysideInns`) | retire | Tier II, common: "Hexes with a road gain +1 food and +1 production." | Retired. | "lets cut wayside inns, its too similar to market gardens" (COM, second round) | Data only | SETTLED |
| Foreign Procurement (`foreignProcurement`) | retire | Tier II, common: "You may buy units without their strategic resource." | Retired. | "Yeah, cut" (COM, second round) | Data only | SETTLED |
| The Epibatai (`theEpibatai`) | retire | Tier II, uncommon: "Your units gain +5 strength for three turns after they land from the sea." | Retired. | "Yeah, cut" (COM, second round) | Data only | SETTLED |
| Financed Industry (`financedIndustry`) | keep | Tier I, rare: "Towns gain production equal to 20% of their gold." | No change. | "i think this is strong, because commerce players will be stacking gold. lets keep it as is" (COM, row 4) | None | SETTLED |
| The treasury: The Money Lenders (`theMoneyLenders`), The Strongroom (`theStrongroom`) | keep | The Money Lenders, Tier III, rare: "Earn interest equal to 4% of your treasury each turn, with no cap." The Strongroom, Tier III, uncommon: "Goal: hold 1,500 gold. Reward: a great merchant, and culture equal to a fifth of your treasury." | Both stay. | "cut, not interesting" was for The Monte di Pietà alone (COM, second round) | None | SETTLED |
| The deals: Travellers' Letters, Export Guilds, Commission: The Trade Mission, The Treaty Ports, the Doctrine The Colleganza | keep | Their texts are in COM, "Section D.4 again". | All five stay. Two of them read the new count (rows above). | "sure keep" (COM, second round) | None | SETTLED |
| The roads: Market Gardens (`marketGardens`, `data/decks/common.json`), the Doctrine The Turnpike Trusts | keep | Market Gardens, Tier II, common, shared with Expansionist: "Hexes with a road gain +1 gold." The Turnpike Trusts: "Your gold buys 100% more when hiring caravans. Hexes with a road gain +1 gold." | Both stay. | "lets cut wayside inns, its too similar to market gardens" (COM, second round) | None | SETTLED |
| The plain hex cards: The Mineral Trade, The Provision Trade, The Potters' Quarter | keep | Their texts are in COM, "Section D.4 again". | All three stay. | "great" (COM, second round) | None | SETTLED |
| Buying the whole Magnum Opus with gold in one turn | keep | Gold poured into the Opus has no limit per turn. The Great Loan (`theGreatLoan`), Tier IV, rare: "On draft: gain twenty turns of gold income. Your towns make 25% less gold for forty turns." The Doctrine The Opera del Duomo (`theOperaDelDuomo`): "Gold you pour into the Magnum Opus buys twice as many hammers. Your towns build the Magnum Opus 25% more slowly." | It stays as a broken combo. | "yup thats fine" (COM, row 1) | None | SETTLED |
| The full route stack | keep | About 190 a route abroad with every route card seated (the review's estimate). | It stays as a broken combo. The build must still confirm how the doublings combine. | "yup" (COM, row 2) | Not verified: how the route doublings combine | SETTLED |

**Not to build (Commerce).**
- Houses of Account as "+1 renown for each gold building, favouring merchants". The user kept +2 and named no family.
- Land Speculation as "the first hex bought each turn, at the full price".
- Any change to Financed Industry.
- A shorter loan for The Great Loan ("the loan pays ten turns of income"). The review named it only for after play.
- A new Commerce card for wonders, and the idea "a gold wonder counts as a gold building for your cards". The review left it as a check for the wonder rework.

---

## Devotion

Rows are in `data/decks/devotion.json`. The beliefs are in "Beliefs". The Schoolmen's Charter is in "Shared and generic cards".

| Item | Kind | Today | Ruled | The user's words | Size and check | Status |
|---|---|---|---|---|---|---|
| The Patriarchate (no live row) | new | New | Tier II: "Your holy city gains +2 production and +2 science for each point of spare authority." The review's row gave Civic and, at Tier III, uncommon. | "let's make this a tier 2" (DEV, row 4) | Existing shape: `pays`, `where: city`, `basis: count`, `count: authoritySurplus`, scope `holyCity`. Check: that the `holyCity` scope reads correctly on a `pays` line. | SETTLED |
| The Rite of Hallowing folded into a card. Rite: `riteOfHallowing` (`data/religion.json`, rites). The card that opens it today: The Hallowed Ground (`theHallowedGround`). | change | The Hallowed Ground, Tier I, uncommon, a charter: "Unlocks the Rite of Hallowing: for ten turns the town's improved hexes gain +1 faith." | A plain card: "Towns keeping a rite gain +1 faith on each improved hex." The rite leaves. | "Great" (DEV, row 5) | Existing shape: `pays` on `improved` hexes with the scope `keepingRite` | SETTLED |
| The Rite of Naming folded into a card. Rite: `riteOfNaming`. The card that opens it today: The Naming Feasts (`theNamingFeasts`). | change | The Naming Feasts, Tier III, uncommon, a charter: "Unlocks the Rite of Naming: for ten turns the town gains +2 food for each citizen." | A plain card: "Towns keeping a rite gain +1 food for each citizen." The rite leaves. | "great" (DEV, row 6) | Existing shape | SETTLED |
| The Votive Offering folded into a card. Rite: `votiveOffering`. The card that gives it today: The Votive Gifts (`theVotiveGifts`). | change | The Votive Gifts, Tier I, common: "Towns may keep the Votive Offering, a rite: for ten turns the town gains production equal to its faith." | A plain card: "Towns keeping a rite gain production equal to half their faith." The rite leaves. | "great" (DEV, row 7) | Existing shape: a share of faith with the scope `keepingRite` | SETTLED |
| The Restoring of the Host folded into a card. Rite: `restoringOfTheHost`. The card that gives it today: The Host Restored (`theHostRestored`). | change | The Host Restored, Tier IV, uncommon: "Towns may keep the Restoring of the Host, a rite: for ten turns your units within three hexes of the town heal 25 health each turn." | A plain card, with the user's text: "Your units heal an additional 20 in towns keeping a rite." The rite leaves. | "too strong, maybe: your units heal an addition 20 in towns keeping a rite" (DEV, row 8) | Not judged for the user's text. The review's small extension was for another text. | SETTLED |
| The Bell Towers (`theBellTowers`) and the building Bell Tower (`bellTower`, `data/buildings.json`) | retire | The Bell Towers, Tier II, common, a charter: "Unlocks the Bell Tower, a faith building: +1 faith, and its town presses your religion +1 harder for each faith building it holds." | The building and its card are retired. | "cut" (DEV, row 9) | Data only | SETTLED |
| Commission: The Anointing (`commissionTheAnointing`) | change | Tier III, uncommon: "Goal: hold 10 spare authority. Reward: each devout town gains +3 faith and +3 culture." | "Goal: hold 10 spare authority. Reward: a rite your capital starts is kept by every town you hold." | "the commission is great." (BEL, second round, decision 6) | Existing shape: a lasting reward that carries the rule `capitalRiteOverRealm`. Check: that a commission's lasting list accepts a rule. | SETTLED |
| The Living Hymnal (`theLivingHymnal`), The Defenders of the Faith (`theDefendersOfTheFaith`), The Pilgrim Towns (`thePilgrimTowns`) | change | The Living Hymnal, Tier II, uncommon: "Your capital gains +3 science and +3 culture for every city following your religion, with no cap." The Defenders of the Faith, Tier III, common: "Your units gain +1 strength for every three towns that follow your religion." The Pilgrim Towns, Tier III, uncommon: "Holy sites gain +1 production and +1 culture for each town that follows your religion." | Words only. Each count of the world gains the words "in the world". No rule changes. See "Compendium and words". | "sure" (DEV, row 1) | Text change | SETTLED |
| The Holy Inquisition (`theHolyInquisition`), the authority | change | Tier III, uncommon: "Each devout town gives +1 authority. Foreign religions press your cities 80% less, proclamations included." | It stops giving authority. | No direct answer. BEL: "They are taken by the recommended reading, as the user's standing rule allows". | Text change | DEFAULT |
| The Holy Inquisition, the new line | change | The same row. | The review's full text: "Rival religions press your towns 80% less. Your holy sites press 1 harder for every four points of spare authority." No comment names the second sentence. Confirm it before you build it. | None | Small extension: the pressure rule `siteStrength` with a scale by a count. Not verified: that a pressure rule can take a scale. | DEFAULT |
| Commission: The State Church (`commissionTheStateChurch`) | change | Tier II, uncommon: "Goal: hold six towns, all devout. Reward: +1 authority and +1 happiness for every two devout towns." | Its reward stops giving authority. The review's reward text: "+1 happiness for every devout town." The comments do not name the new happiness number. | No direct answer. The same BEL line as The Holy Inquisition. | Text and number change | DEFAULT |
| The Learned Clergy (`theLearnedClergy`) | retire | Tier III, uncommon: "+2 science and +2 culture for every 10 faith your empire makes each turn." | Retired. | No direct answer. BEL: "the four conversion rows are retired. The user can still overrule them." | Data only | DEFAULT |
| The Sacred Bequests (`theSacredBequests`) | retire | Tier III, common: "Spending faith grants science equal to a fourth of it." | Retired. | The same. | Data only | DEFAULT |
| The Tithe of Nations (`theTitheOfNations`) | retire | Tier IV, uncommon: "Gain 1 faith each turn for every two citizens in the world who follow your religion." | Retired. The review's reason names the founder's share, which is now deferred. | The same. | Data only | DEFAULT |
| The Theoric Fund (`theTheoricFund`, doctrines) | retire | Doctrine, Tier I: "+1 culture for every 3 faith your empire makes." | Retired. | The same. | Data only | DEFAULT |
| The Second Prophet (`theSecondProphet`) | change | Tier II, uncommon: "Prophets and apostles you buy start with one extra charge." | The review's text: "Prophets and apostles you buy start with one more charge, and one more again for every ten points of spare authority." No comment and no decision names this card. Confirm it before you build it. | None | Small extension: the `unitStat` charges line with a scale by a count. Not verified: that a unit stat can take a scale. | DEFAULT |
| Mission Houses (`missionHouses`) | change | Tier II, common: "Your proclamations reach 50% farther and are 50% more effective in foreign cities." | The review's text: "Gains +3 gold and +3 culture each time a foreign town turns to your religion." No comment and no decision names this card. Confirm it before you build it. | None | Existing shape: `pays` on the `tally` count with `foreignCityConverted` | DEFAULT |

**Not to build (Devotion).**
- The Truce of God ("+1 authority for each town keeping a rite."). The user: "not needed i think, i think we need more payoff cards for empires with lots of authority"
- The Patriarchate at Tier III.
- The re-aim of a Tier 0 card (The Calling as "Towns keeping a rite gain +2 food and +2 production."). The user: "rites aren't available in tier 0, i think tier 0 is probably fine for now."
- The Restoring of the Host as "Your units heal 25 more each turn in land that follows your religion."
- A card that carries the Bell Tower's line ("Each building that supplies faith presses your religion +1 harder in its town."). The user cut the building.
- The founder's share. See "Base rules".
- Feast Days as "Rites in a town that follows last 50% longer".
- A move of The Apostolic Camera to an earlier tier. The review did not propose it.

---

## Scientific

Rows are in `data/decks/scientific.json`. The Hanlin Academy and The Schoolmen's Charter are in "Shared and generic cards". The rule for charter technologies is in "Base rules".

The user adopted "the great city" as the build that replaces "technologies completed" (SCI2, row 1: "yes"). The build reads a town's citizens above a line, and spare happiness.

| Item | Kind | Today | Ruled | The user's words | Size and check | Status |
|---|---|---|---|---|---|---|
| The Armoury Patterns (`theArmouryPatterns`) | change | Tier II, common: "Units of your current age gain +3 strength." | It becomes the pay-off: a kill on an empire with fewer technologies grants science equal to twice the unit's strength. The review's text: "Killing a unit of an empire that knows fewer technologies than you grants science equal to twice its strength." | "sure sounds good" (DIR, settled row 15) | Small extension | SETTLED |
| The Astronomical Diaries (`theAstronomicalDiaries`) | change | Tier I, uncommon: "Gains +1 culture and +1 production each time you complete a technology." | "Gains +1 science and +1 culture in your capital each time one of your towns grows past eight citizens." The review: it still starts at +2 and +2. | "great" and "yes" (SCI2, row 2) | Small extension: the tally `sizeRecord` with a floor on the town's size. Not verified: how the tally counts a town that gains two citizens in one turn across the line. | SETTLED |
| The Reading Rooms (no live row) | new | New | Tier I, common, Civic: "Towns with a Library gain +1 happiness for every five citizens." | "great" (SCI2, row 3) | Existing shape: `pays` to happiness, `count: population`, `per: 5`, `within: city`, with a `hasBuilding` scope | SETTLED |
| The Garden of Epicurus (no live row) | new | New. Today the bonus from spare happiness stops at +20% (`data/rules.json`, `meters.tiers`: +10% at 5, +20% at 10). | Tier III, rare, Civic: "The bonus from spare happiness has no upper limit." It then pays +10% science and culture for every five spare happiness. | "great", "yes", and "sure, but didn't we rework the happiness tiers? double check with the main thread." (SCI2, row 5) | Small extension: a second meter flag beside `writUncapped`. The check on the happiness tiers is done (SCI2, below the table): the rework of 2026-11-23 changed the unhappy side only. Not verified: how The Good Years combines with a bonus that has no limit. | SETTLED |
| The Hippodamian Plan (no live row) | new | New | Doctrine, Tier II: "Your towns of ten or more citizens ask 30% less happiness. Towns you found cost 1 more authority." | "great" and "yes" (SCI2, row 6) | Existing shape: `rulePercent`, `happinessDemand`, with a `populationAtLeast` scope. The drawback is the line of the Doctrine Synoecism. | SETTLED |
| The Round City (`theRoundCity`) | change | Tier II, uncommon: "+1% production and culture for each citizen in your capital, at most +30%." | "+1% production and culture for each citizen in your capital." | "great" (SCI2, row 7) | Number change: remove `max: 30` | SETTLED |
| The Queen of Cities (`theQueenOfCities`) | change | Tier III, rare: "Towns of at least 15 citizens produce twice their food and production." | It stays, at +50%: "Towns of at least 15 citizens produce 50% more food and production." | "is this new? Let's keep it" and "maybe too strong, lets do +50% instead of double" (SCI2, row 8) | Not judged. A number change by the review's own terms. | SETTLED |
| The Great Catalogue (`theGreatCatalogue`) | change | Tier IV, common: "+10% production toward the Magnum Opus for each charter technology you know, at most +40%." | It loses "at most +40%". It also counts "each charter you hold" (the row below). | "sure" (SCI, row 6) | Number change: remove `max: 4` from the row | SETTLED |
| Charter counts: The Great Catalogue, The Alchemists' Charter (`theAlchemistsCharter`), and the Great Archive (building `greatArchive`, `data/buildings.json`; its card is The Archivists' Charter, `theArchivistsCharter`) | change | The Alchemists' Charter, Tier III, uncommon: "Opens Chemistry: your warrior line gains +1 strength for each charter technology you know." The Archivists' Charter, Tier II, uncommon: "Opens Record-Keeping, which unlocks the Great Archive, one in your empire: +5 science for each charter technology you know." | The three count "each charter you hold", from any deck. | "Yup sounds good" (SCI, row 7) | Small extension: one new count. It removes the term "charter technology" from three texts. | SETTLED |
| The Military Engineers' Charter (`theMilitaryEngineersCharter`) | retire | Tier III, common: "Opens Military Architecture, which unlocks the Bastion: +5 defence and +30 hit points." | Retired. | "Great, cut" (SCI, row 3) | Data | SETTLED |
| The Physicians' Charter (`thePhysiciansCharter`) | retire | Tier II, common: "Opens Medicine, which unlocks the Bimaristan: +25% food in its town." | Retired. | "sure" (SCI, row 4) | Data | SETTLED |
| The Forward Plans (`theForwardPlans`) | retire | Tier I, rare: "You may build Universities before you know Scholarship." | Retired. | "great" (SCI2, row 9) | Data only | SETTLED |
| The Royal Academies (`theRoyalAcademies`) | rarity | Tier III, uncommon: "+5% production and culture for each empire building you hold." | It becomes a rare. The text stays. | "royal academies can be a rare" (SCI, below the table; SCI2, row 11) | Rarity change. Not verified: whether the count includes second copies under The Second Seat. | SETTLED |
| The Barber-Surgeons (`theBarberSurgeons`) | rarity | Tier II, common: "Your units gain +10 health after killing a unit." | It stays and becomes uncommon. | "lets keep this, make it uncommon" (SCI2, row 10) | Rarity change | SETTLED |
| The Pandidakterion (`thePandidakterion`, doctrines) | keep | Doctrine, Tier II: "Hexes with an Academy have double yields, applied after every other change to the hex." | It stays as Scientific's one doubler. It needs no change. | "sure" (DIR, settled row 16) | Not verified: how the new Mausoleum folds with The Nizamiyya and this Doctrine | SETTLED |

**Not to build (Scientific).**
- The Countermarch ("Completing a technology lets your units attack twice a turn for three turns."). The user: "I personally dont think scientific needs more combat bonuses, lets defer this line of thinking." No more combat cards for Scientific for now.
- The Licence to Teach ("Gaining a great scholar completes the technology you are researching."). The user: "not needed right now, lets see how magisterial plays after the nerf"
- The Learned Leisure ("Your capital gains +3 science for each point of spare happiness."). The user: "cut"
- Charter rule A (culture equal to half the price when the technology is learned). The user: "i dont like this just because it adds more rules and isn't intuitive". Options C and D are not chosen either.
- A retirement of The Barber-Surgeons. The second pass listed it as leaving. The user kept it.
- The Queen of Cities at double.
- The Royal Academies at +3%.
- A merge of The Paper-Makers' Charter and The Printers' Charter, and any change to The Reform of the Calendar or The Closed Book. The review left them for a later pass.
- A card for "science improves improvements". The second pass proposed none.
- The line that SCI suggests for The Library of Ashurbanipal ("Completing a technology grants renown equal to a tenth of its price."). The user settled another text in WON. See "Wonders".

---

## Shared and generic cards

| Item | Kind | Today | Ruled | The user's words | Size and check | Status |
|---|---|---|---|---|---|---|
| The Hanlin Academy (`magisterialTheHanlinAcademy`, `data/decks/magisterial.json`) | change + move | Tier II, uncommon, a Magisterial card: "Great people cost 20% less renown. Great-person works give +2 science." | New text: "+20% renown toward great scholars. Great-person works give +2 science." It becomes a shared card of Scientific and Magisterial. The comments name no new tier or rarity. | "let's modify: +20% renown towards scholars, works give +2 science. This is a scientific card? if not, lets make it scientific + magisterial" (DIR, settled row 8) | Not judged for this text | SETTLED |
| The Missi Dominici (no live row) | new | New | Shared by Dominion and Expansionist. Tier II, uncommon, Civic: "Each of your towns gains +1 science and +1 culture for each point of spare authority." The count is spare authority. | "This should be stronger, lets make it +1 science and culture for every point of authority", "sure", and "spare authority yes" (EXP, row 3) | Existing shape, judged for "every five points": `pays`, `where: city`, `basis: count`, `count: authoritySurplus`. Check: `authoritySurplus` answers nothing while the meter is being folded. | SETTLED |
| The Schoolmen's Charter (`theSchoolmensCharter`, `data/decks/common.json`, shared by Devotion and Scientific) | move | Tier I, uncommon: "Opens Scholasticism, which unlocks the Cathedral School: +2 science for each faith building in its town." | The card moves to Tier II. Its technology moves to age 2 (see "Base rules"). | "Great, lets move the technology to age 2 too" (SCI, row 5) | Tier move. Not verified: the Cathedral School's data row has a second line that the card's text does not print. | SETTLED |
| Aristocracy (`aristocracy`, `data/statecraft.json`, governments, tier 10) | change | "Every town gains +2 science. Great people cost 15% less renown." | The discount becomes more renown. By the recommended reading the number stays: "+15% renown". | "discounts should be rephrase as X% more renown, like for gold and faith purchasing" (DIR, settled row 9) | Not judged. The live line is `rulePercent`, `greatPersonCost`, -15. | SETTLED for the rule. DEFAULT for the number. |

No generic card changes. The Good Years (`theGoodYears`, `data/decks/common.json`, Tier III, rare: "Your bonus from spare happiness is doubled.") stays, and it is the partner of The Garden of Epicurus.

---

## Beliefs

Rows are in `data/religion.json`: gods in `beliefs`, follower beliefs in `followerBeliefs`, enhancer beliefs in `enhancerBeliefs`. A belief has no tier and no rarity.

The user accepted the smaller list as a whole: "yup, accepted" (BEL, answers in chat). The list goes from 56 live rows to 46. Rows marked "accepted with the list" had no comment of their own. Their verdict is in BEL, section 1.3.

"Cut" is the word in the source. The live pattern for a belief that leaves is `retired: true` (the row `theLivingRock` has it).

### Gods (23 live today, 19 after)

| Item | Kind | Today | Ruled | The user's words | Size and check | Status |
|---|---|---|---|---|---|---|
| Keeper of the Hearth (`keeperOfTheHearth`) | change | "Granaries give +2 faith and +1 happiness." | "Granaries and Monuments give +1 faith, and count as buildings that supply faith." It takes in The Standing Stones. | "Cool, I like it." (BEL, first table) | Existing shape, if a line written on the building counts for `buildingsSupplying`. Not verified: which form of card line joins a building's package (`buildingSuppliesFrom`). | SETTLED |
| The Standing Stones (`theStandingStones`) | retire | "Monuments give +2 culture and +1 faith." | Cut. Its line moves into Keeper of the Hearth. | Accepted with the list. | Data only | SETTLED |
| Keeper of the Calendar (`keeperOfTheCalendar`) | retire | "Plantations gain +1 science." | Cut. | Accepted with the list. | Data only | SETTLED |
| Ancestor Worship (`ancestorWorship`) | change | "+1 culture for every 4 citizens in a town." | "+3 authority. The bonus for spare authority also raises faith." Culture is not raised. | "Revise: +3 authority. Spare authority also raises faith." and "yes, +3 authority." (BEL, first table and answers in chat) | Small extension: one more meter rule beside `writUncapped`, naming the yields that the authority bonus raises. Not verified: the place where the authority bonus picks its yields. | SETTLED |
| Rites of Blood (`ritesOfBlood`) | change | "Killing a unit grants faith equal to its strength." | "A unit of yours that dies in battle grants faith equal to twice its strength." | "great" (BEL, second round) | Existing shape: `windfallRider` on `death` with `fromOccasion: strength` | SETTLED |
| Desert Fathers (`desertFathers`) | change | "Desert hexes gain +1 food and +1 faith." | "Desert and tundra hexes gain +1 food and +1 faith." It takes in Winter Mother. It needs a name for both. The review's example is The Hermits. | "great" (BEL, second round) | Existing shape: a hex line on `any` of two terrains | NAME OR NUMBER OPEN: the name |
| Winter Mother (`winterMother`) | retire | "+1 food and +1 faith on every tundra hex." | Cut. Its line moves into the row above. | "great" (BEL, second round) | Data only | SETTLED |
| Patron of Merchants (`patronOfMerchants`) | change | "+1 faith and +2 gold for each different luxury you hold." | "+1 gold each turn for every 50 faith you have spent this game." | "great" (BEL, second round) | Existing shape: `pays`, `where: empire`, `basis: count`, `count: faithSpent`, `per: 50` | SETTLED |
| The Muses (`theMuses`) | retire | "+1 faith for every 3 culture you make each turn." | Cut. | Accepted with the list. | Data only | SETTLED |

No change (BEL, section 1.3, verdict "Keep"): Goddess of the Harvest, Star Readers, Lady of the Hunt, Spirits of the Wood, River Mother, Lord of the Sea, God of the Forge, Oracle of the Crossroads, Sacred Fire, The Stone Hoard (`lordOfTheHoard`), The Vigil (`courtAugurs`), Vineyard Rites, Cult of Heroes, Herd Gods.

### Follower beliefs (17 live today, 13 after)

| Item | Kind | Today | Ruled | The user's words | Size and check | Status |
|---|---|---|---|---|---|---|
| Feast Days (`feastDays`) | change | "+1 happiness for every city that follows, and Temples supply +1 happiness." | "A town that follows gains +1 faith for every two citizens while it keeps a rite." | "Cool, great" (DEV, row 2) and "great" (BEL, second round) | Existing shape: `pays`, `where: city`, `basis: count`, `count: population`, `per: 2`, with the scope `all` of `follows` and `keepingRite` | SETTLED |
| Choirs (`choirs`) | change | "+1 culture for every 4 citizens of a city that follows." | "A town that follows gains +1 culture and +1 gold for every three citizens." It takes in Tithe Houses. | "great" (BEL, second round) | Existing shape: the two live lines, with `per: 3` | SETTLED |
| Tithe Houses (`titheHouses`) | retire | "+1 gold for every 3 citizens of a city that follows." | Cut. Its line moves into Choirs. | Accepted with the list. | Data only | SETTLED |
| The Alms Box (`theAlmsBox`) | change | "Your faith buys 25% more in towns that follow this religion." | "A town that follows may buy food and production buildings with faith." | "great" (BEL, second round) | Small extension: the rule `faithBuysBuildings` read from a town's follower beliefs. Not verified: that the rule can be read the way the purchase riders are. | SETTLED |
| Pilgrimage (`pilgrimage`) | retire | "A town that follows gains +1 faith for every 3 followers." | Cut. | "great" (BEL, second round) | Data only | SETTLED |
| Holy Water (`holyWater`) | retire | "Towns that follow and stand on fresh water gain +10% food." | Cut. | "great" (BEL, second round) | Data only | SETTLED |
| Lamps of the Shrine (`lampsOfTheShrine`) | retire | "Shrines in towns that follow give +2 science." | Cut. | "great" (BEL, second round) | Data only | SETTLED |

No change: Cathedrals of the Sky, The Quiet Hours, Warrior Monks, Harvest Blessing, Guild of the Faithful, Common Table, Minarets, Temple Spires, The Open Kitchen, The Eternal Flame.

### Enhancer beliefs (16 live today, 14 after)

| Item | Kind | Today | Ruled | The user's words | Size and check | Status |
|---|---|---|---|---|---|---|
| Reliquaries (`reliquaries`) | change | "+1 culture for every 3 faith you make each turn." Today a relic is a building (`relic`, `data/buildings.json`): +3 faith, with the note "An apostle leaves one in a city that has a Cathedral. A city can hold only one." | The user's design. Leaving a relic is an apostle's act. It costs one charge. A town has no limit on relics. Each relic adds to that town's Temple: +4 science and +4 culture for each relic (the number is the review's). Nothing else is tracked. | "i'm worried about the UX for this. But otherwise its great. This can just be a new action for the apostle. Instead of tracking them, lets just have no limit on the number of relics an apostle can leave, and it's appled as a modifier to the temple. Use 1 charge" (BEL, second round) | Not judged for the user's design. Not verified: how the Cathedral requirement is written. | NAME OR NUMBER OPEN: the number, +4 and +4, is marked proposed |
| Inquisition (`inquisition`) | change | "Rival religions press your towns at 70% strength. +1 authority for every two of your cities that follow your religion." | Words only: "Rival religions press your towns at 70% strength. +1 authority for every two devout towns." | "sure" (DEV, row 1) and "great" (BEL, second round) | Text change | SETTLED |
| The Long Road (`theLongRoad`) | change | "Your religion presses 2 harder along trade routes." | "Your trade routes press your religion at both ends, and 2 harder." It takes in Sacred Cartography. | "great" (BEL, second round) | Existing shape: the two live rules on one row | SETTLED |
| Sacred Cartography (`sacredCartography`) | retire | "Your trade routes press your religion at both ends." | Cut. Its line moves into The Long Road. | "great" (BEL, second round) | Data only | SETTLED |
| The Pulse of Bells (`thePulseOfBells`) | change | "A proclamation reaches 4 hexes further and presses 20 faith harder." | "A proclamation gives each of your towns in its reach +25% production for ten turns. A later one restarts the ten turns." | "great" (BEL, second round) | Small extension: the `timed` grant, given to each own town in a proclamation's reach. Not verified: that a timed grant can land on every own town in the reach. | SETTLED |
| Ecclesia (`ecclesia`) | change | "Each holy site gives +1 faith for each town in the world that follows your religion." | "A town that starts a rite presses your religion on every town within six hexes." The review proposed 20 pressure. | "lets increase the range, 6 hexes" (BEL, second round) | Existing shape: `windfallRider` on `rite` with a `pressure` grant | NAME OR NUMBER OPEN: the pressure, 20, is marked proposed |
| Congregation (`congregation`) | change | "+2 faith for every town in the world that follows your religion." | "The first time a foreign town turns to your religion, your capital gains a citizen." | "great" (BEL, second round) | Existing shape: `windfallRider` on `townConverted` with `first: conversion`, and the grant `citizens` with `toCapital`. Not verified: the grant on this moment, and what happens when the capital has no room to work another hex. | SETTLED |
| The Long Prayer (`theLongPrayer`) | change | "+1 culture for every 4 citizens in the world who follow you." | "+1 culture for every 3 citizens in the world who follow you." | "great" (BEL, second round) | Number change | SETTLED |
| Pilgrims' Coin (`pilgrimsCoin`) | retire | "+4 gold for every city in the world that follows." | Cut. The review's reason was that the founder's share would do this job as a base rule. The founder's share is now deferred. | Accepted with the list. | Data only | SETTLED |

No change: Itinerant Preachers, Apostles, Holy Order, World Church, The Crusade, Marvels of the Faith, The Scriptoria.

One check covers three rows. Ecclesia, Congregation and The Pulse of Bells are enhancer rows that carry a windfall rider. No live enhancer does. The review did not check that the founder's rows reach the windfall reader.

**Not to build (Beliefs).**
- Ancestor Worship as "The bonus for spare authority also raises faith and culture."
- Ecclesia at four hexes.
- Reliquaries as a relic count that the game tracks, or with a limit of one relic for each town.
- The founder's share as a base rule or as a belief. It is deferred.

---

## Wonders

Rows are in `data/buildings.json`. A wonder row has no `text` field. For The Mausoleum the Today cell describes the row's effects. For the ten wonders of WON the Today cell is the text that WON quotes from `describeBuildingRow`, which is what the game prints. WON leaves out the two renown lines that every wonder has. A wonder has no tier and no rarity, so the Today cell gives its age, the technology that unlocks it and its production cost, as WON states them.

A wonder's unlock is not on the wonder row. It is in `data/techs.json`, in the `unlocks.buildings` list of its technology.

| Item | Kind | Today | Ruled | The user's words | Size and check | Status |
|---|---|---|---|---|---|---|
| The Mausoleum (`mausoleum`) | change | Age 2, 292. Every hex that holds a great-person work yields double, after every other bonus (`wholePercent: 100`, `appliedLast: true`). +5 renown a turn toward engineers, and +10 on completion. | Option 1. It doubles a work's own yields only: "Great-person works give twice their own yields. +5 renown a turn." It does not reach card lines. WON does not change this. | "yeah, have this apply to just the +4/6/8 that they give by default, i.e. the academy should not multiply all science bonuses stacked on top of it." (DIR, settled row 1) | Existing shape: `percent: 100` on the `greatWork` test. Not verified: whether the wonder reaches a wonder under The Spirit Way. The review reads that it does not. | SETTLED |
| The Library of Ashurbanipal (`libraryOfAshurbanipal`) | change | Age 2, Code of Laws (`kingship`), 382: "+2 science. +5 renown per turn in every captured city, favouring scholars. +15 renown per turn in every captured city containing a wonder, favouring scholars. +10 renown per turn, favouring scholars." | "+3 science in every city with a Library. Each time you capture a city, the technology you are researching is finished. +10 renown a turn toward scholars." | "great" (WON, row 1) | Existing shapes: a `pays` line with a `hasBuilding` scope, and a `windfallRider` on `capture` with `completeResearch`. Not verified: a `capture` rider from a wonder row. | SETTLED |
| The Pyramids (`pyramids`) | change | Age 1, Stonecraft (`stonecraft`), 170: "Newly created workers gain +1 charge. +20% production toward wonders." | "+3 production in this city for each wonder you hold. +20% production toward wonders." The worker charge goes. | "great" (WON, row 2) | Existing shape: `pays`, `count: wonders`, to production, with a `hasBuilding` scope. Not verified: that count and that scope together. | SETTLED |
| The Terracotta Army (`terracottaArmy`) | change | Age 3, Iron Working (`ironWorking`), 501: "+2 production. +6 combat strength when defending while standing in one of your cities. Newly created units in every city with The Terracotta Army gain +2 combat strength. +2 authority capacity." | "Each time this city gains a unit, a second unit of the same kind joins you." All four live lines go. It is a broken combo on purpose. | "wow, great" and "great" (WON, row 3) | Small extension: a `windfallRider` on `unitCompletion` grants a unit today, but not "the same unit". The second unit must not fire the rider again. Not verified: a `unitCompletion` rider from a wonder row. | SETTLED |
| Solomon's Temple (`solomonsTemple`) | change | Age 2, The High Temple (`theHighTemple`), 382: "+2 culture, +2 faith. +1 card in every great-person offer. Great people cost 10% less renown." The live line is `rulePercent`, `greatPersonCost`, -10. | "+2 culture, +2 faith. +15% renown. +1 name in every great-person offer." This replaces the +10% renown of DIR. The later ruling wins. | "let's keep the percentage, +15% renown." and "instead of the temple clause, everything else stays" (WON, row 4) | Not judged for this text | SETTLED |
| The Walls of Uruk (`wallsOfUruk`) | change | Age 1, Bronzeworking (`bronzeWorking`), 170: "Every city with The Walls of Uruk: +10 city defence. +2 combat strength inside your territory. +2 authority capacity. +50 to how much punishment the city can take." | "Every city with a Palisade gains +2 production and +2 culture. +2 authority capacity. On completion, a Palisade is raised here." | "Add: +2 authority capacity" (WON, row 5) | Existing shapes: the scoped `pays` line, and the `building` completion grant of The Theatre of Dionysus | SETTLED |
| The Great Wall (`greatWall`) | change | Age 3, The Civil Service (`theExaminationHall`), 657: "+2 production. Every city: +5 city defence. Every city: +25 maximum city hit points. Enemy units in your territory have -1 movement, to a minimum of one." | "Every garrisoned city gains +3 production and +3 culture. Enemy units in your territory have -1 movement." | "Great, lets change to +3 production and +3 culture." (WON, row 6) | Existing shape: `pays` with the city scope `garrisoned`. Not verified: that scope on a wonder's `pays` line. | SETTLED |
| Notre-Dame (`notreDame`) | move | Age 4, The Holy Office (`theHolyOffice`, research cost 5,150), column 11, 1,934: "+2 culture. +1 happiness per building in your cities that supplies faith." | The text stays. It moves to Castellany (`feudalism`, age 4, column 9, research cost 1,960), so it costs 1,127. Take `notreDame` out of the `unlocks.buildings` list of `theHolyOffice` and put it in the list of `feudalism`. | "great" and "yeah just pick two that make sense." (WON, row 7) | Number change (a move on the tree). Not verified: the tree chart, the lanes and the column of the target technology. | SETTLED |
| Machu Picchu (`machuPicchu`) | move + change | Age 4, Natural Philosophy (`physics`, research cost 3,250), column 10, 1,477, beside a mountain: "+2 gold. +2 trade routes for your empire. +1 gold on every hex beside a mountain, once for each mountain." | "+2 gold. +2 trade routes for your empire. +2 gold on every hex beside a mountain, once for each mountain." It moves to Daughter Cities (`colonialCharters`, age 3, column 8, research cost 1,150), so it costs 860. Take `machuPicchu` out of the `unlocks.buildings` list of `physics` and put it in the list of `colonialCharters`. | "great" and "yeah just pick two that make sense." (WON, row 8) | Number change. Not verified: the tree chart, the lanes and the column of the target technology. WON: this line may be the largest gold source on a mountain map. Watch it. | SETTLED |
| The Pyramid of the Sun (`pyramidOfTheSun`) | change | Age 2, Chronology (`theLongCount`), 292: "+2 faith. A city with The Pyramid of the Sun may spend one citizen for 5 faith per citizen before the levy (once every 5 turns). +2 culture on every hex with a Holy Site." | When its city spends a citizen, the levy pays 5 faith, 5 science and 3 renown for each citizen the city had before the levy. The comments name no change to the other lines. | "let's rework this. How about the levy gives a burst of science, faith and renown?" and, to the numbers, "great" (WON, row 9) | Not judged for this text | SETTLED |
| Chichen Itza (`chichenItza`) | change | Age 3, Horology (`horology`), 860: "+2 culture, +2 faith. Rites last +50% longer. +2 happiness and +20% culture in every city while it is keeping a rite." | "+2 culture, +2 faith. Rites last twice as long. +2 happiness and +20% culture in every city while it is keeping a rite." | "sure" (WON, row 10) | Number change (50 becomes 100) | SETTLED |

**Not to build (Wonders).**
- The Mausoleum as "this city only" (option 2) or "later and dearer" (option 3).
- Solomon's Temple at "+10% renown" (the reading of DIR), or with "+2 renown a turn in every city with a Temple" (the first proposal of WON).
- The Walls of Uruk without "+2 authority capacity". The Great Wall at +2 and +2.
- The Pyramid of the Sun at "10 faith for each citizen". The user dropped that number change.
- The deferred part of WON. The user: "let's defer and add it to the beta checklist." It is noted in `docs/plans/beta-checklist-2026-11-21.md`. The deferred items are:
  - The Great Mosque of Djenné ("On completion, an Apostle joins you.");
  - the cut candidates (one of the three defence wonders, The Great Mosque of Djenné, The Temple of Thoth);
  - the two smaller changes of the WON summary. One of them is The Great Lighthouse ("+1 food and +1 gold on every hex with a Fishing Boat. Ships: +1 movement."). The other is The Great Mosque of Djenné above;
  - cards in the other five decks that read wonders held.

---

## Base rules

| Item | Kind | Today | Ruled | The user's words | Size and check | Status |
|---|---|---|---|---|---|---|
| The price of a charter technology (rule B) | change | A charter technology costs the full price of its column and gives nothing when learned. | "A charter technology costs half the price of its column." The review says that the rule also covers Liturgy, which Devotion's The Call to Prayer opens. | "this one is fine. lets go with B" (SCI, row 2) | Small extension: a base line of the `charterTechCost` rule. The rule is on the retired row `theCommonplaceBook`. | SETTLED |
| Scholasticism (`scholasticism`, `data/techs.json`) | move | Age 3, price 360, needs The High Temple, a charter technology. It unlocks the Cathedral School. | It moves to age 2. | "Great, lets move the technology to age 2 too" (SCI, row 5) | Not judged. The review gives no new column or price. | SETTLED |
| One count: "an empire you trade with" | change | Two counts. "Each empire you hold a deal with": The Treaty Ports, Commission: The Trade Mission. "Each foreign empire your routes reach": The Exchange, The World's Exchange, The World's Fair. | An empire counts if a trade route of yours reaches it or you hold a deal with it. The Compendium gets an entry that explains the count. | "thats cool, and makes intuitive sense. That should be somewhere in the compendium" (COM, row 8) | Small extension: one count reads both lists | SETTLED |
| Discounts on great people | change | Three live rows lower the price (`greatPersonCost`): The Hanlin Academy (20), Aristocracy (15), Solomon's Temple (10). The Doctrine The Peregrini lowers the next price by 20. | A card, government or wonder no longer lowers the price of a great person. It raises renown. The rows are in their own sections above. Solomon's Temple has its own later number, +15% (WON). | "discounts should be rephrase as X% more renown, like for gold and faith purchasing" (DIR, settled row 9) | Not judged | SETTLED |
| The renown ladder (`data/rules.json`, `renown`: base 75, linear 58, exponent 2.65) | keep | The price of great person number n is `75 + 58n + n^2.65`. | It stays as it is. | No comment. DIR: "the recommended reading stands until the user says otherwise". | None | DEFAULT |
| A free great person and the next price | keep | Every pick raises `Player.greatPeopleRecruited`, however the offer opened. | Not changed. | "in theory they shouldn't" (DIR, open point 5). DIR, answers: "Point 5 (a free great person raises the next price) is not changed." | None | SETTLED |
| Percentages and one-time grants | keep | A one-time grant is not raised by any percentage (design entry XVIII.5). | The rule stays. | "hmm, let's just not bother with #5 then." (DIR, answers. The user's "#5" was the fifth question in chat, which is open point 6.) | None | SETTLED |
| The happiness tiers (`data/rules.json`, `meters.tiers`) | keep | +10% science and culture at 5 spare happiness, +20% at 10. | No change. The Garden of Epicurus is written against the live rule. | "sure, but didn't we rework the happiness tiers? double check with the main thread." (SCI2, row 5) | The check is done (SCI2, below the table). | SETTLED |

**Not to build (Base rules).**
- **The founder's share.** It is DEFERRED. It stays as it is today: +1 faith for each foreign town that follows, and +1 gold for each two such towns (`founderTrickle`, `data/religion.json`). The user: "in theory, the founders share is something that's visible to the player in a belief. lets defer this, note it in the beta checklist." It is noted in `docs/plans/beta-checklist-2026-11-21.md`.
- Charter rule A, and options C and D.
- A change to the rule that a free great person raises the next price.
- A change to the rule that percentages do not raise a one-time grant.
- A change to the renown ladder.

---

## Compendium and words

| Item | Kind | Today | Ruled | The user's words | Size and check | Status |
|---|---|---|---|---|---|---|
| A Compendium entry for "an empire you trade with" | new | No entry. | The Compendium explains the count: a trade route of yours reaches the empire, or you hold a deal with it. | "That should be somewhere in the compendium" (COM, row 8) | Not judged | SETTLED |
| One word for each Devotion count | change | The texts use several words for one count. "Your cities that follow your religion" in the belief Inquisition is the count that cards call "devout". "Town" and "city" are one thing. "Faith buildings", "buildings that supply faith" and "religious buildings" appear without a rule. | "Devout" in the belief Inquisition. "In the world" on every count of the world (The Living Hymnal, The Defenders of the Faith, The Pilgrim Towns). "Town" replaces "city" in belief and card texts. "Building that supplies faith" is the one term for the count that grows, and the Compendium's faith page says what it means. No rule changes. | "sure" (DEV, row 1) | Text change, about eight rows. `docs/beliefs.md` and the Devotion sheet mirror the data, so each row changes in both. | SETTLED |
| Wording of the renown lines | change | "Great people cost N% less renown." | "N% more renown", in the form the game uses for gold and faith purchases. | "discounts should be rephrase as X% more renown, like for gold and faith purchasing" (DIR, settled row 9) | Not judged | SETTLED |
| Wording of the charter counts | change | "for each charter technology you know" | "for each charter you hold" on the three rows in "Scientific". | "Yup sounds good" (SCI, row 7) | In the charter count row | SETTLED |

---

## Notes that cross decks

All of these come from the comments sections.

1. **"An empire you trade with" is one count.** A route reaches the empire, or you hold a deal with it. The Compendium explains it (COM, row 8).
2. **Spare authority is read by cards in three decks, and by one god.**
   - The Missi Dominici, shared by Dominion and Expansionist: +1 science and +1 culture in each town for each point (EXP, row 3).
   - The Patriarchate, Devotion, at Tier II: +2 production and +2 science in the holy city for each point (DEV, row 4).
   - Ancestor Worship, a god: "+3 authority. The bonus for spare authority also raises faith." (BEL).
   - Commission: The Anointing keeps its goal of 10 spare authority and gives the realm rite (BEL, decision 6).
3. **The spare-authority engine may need another look after the playtest.** The user: "it still seems pretty hard to get this engine going, lets leave it in for playtest with my revision, but might need another look. i don't think theres a lot of spare authority support by the time you get to age 2" (EXP, row 4).
4. **Dominion needs more pay-off for spare authority.** The user: "let's make a note: there should be maybe more payoff for spare authority in the deck" (DOM, row 6). This is a note for the next Dominion pass. It is not a card to build now.
5. **Devotion needs pay-offs for authority, not more supply.** The user: "i think we need more payoff cards for empires with lots of authority" (DEV, row 3).
6. **Discounts on great people become more renown.** This covers Aristocracy (+15% by the recommended reading) and Solomon's Temple (+15%, the user's number in WON). The Hanlin Academy has a new text. The Peregrini loses its discount (DIR, settled rows 2, 8 and 9; WON, row 4).
7. **Charter counts read every charter the seat holds, from any deck** (SCI, row 7). Expansionist and Devotion charters then count for the Great Archive, The Alchemists' Charter and The Great Catalogue.
8. **Charter technologies cost half the price of their column** (SCI, row 2). The review says that the rule also covers Liturgy.
9. **Scientific gets no more combat cards for now** (SCI, row 8).
10. **The Hanlin Academy becomes a shared Scientific and Magisterial card** (DIR, settled row 8).
11. **The Megalopolis has its approved text in EXP.** The second Scientific pass uses that text for the Expansionist pair. The data still holds the old text.

**Broken combos the user chose to keep. Do not "fix" them.**

| Combo | What it does | The user's words | Source |
|---|---|---|---|
| The Drill Masters with Up Through the Ranks | Garrisoned units gain 1 experience each turn. Each new Elite pays 250 renown. About 200 to 300 renown a turn (the review's estimate). | "yes keep it." | DOM |
| The levy loop: Levy of the Land, The Mit'a, Human Sacrifice, The Corvée | A levy every two turns that costs nothing after twenty turns. | "approved for all the above" | EXP, row 1 |
| The Imperial Roads with The Sovereign Writ | Joined towns cost no authority, and the bonus for spare authority has no ceiling. The pair also cancels the drawback of the Doctrine The Mandarinate. | "yup keep" | EXP, row 1 |
| Buying the whole Magnum Opus with gold in one turn | Gold poured into the Opus has no limit per turn. | "yup thats fine" | COM, row 1 |
| The full route stack | Every route card seated: about 190 a route abroad (the review's estimate). | "yup" | COM, row 2 |
| The Garden of Epicurus with The Good Years | The bonus from spare happiness has no upper limit, and it is doubled. | "great", "yes" | SCI2, row 5 |
| The Pandidakterion | Academy hexes yield double. It stays as Scientific's one doubler. | "sure" | DIR, settled row 16 |
| The Terracotta Army (new text) with cards that pay on a unit gained, and with levies | Every unit from its city arrives twice, and every such card pays twice. | "wow, great" and "great" | WON, row 3 |
| The cluster of works: The Divine Proportion, The Processional Way, Commission: The Ideal City | Card bonuses on works are doubled, hexes beside two works gain +10 culture and +10 science, and one town's culture, science and production are doubled. | No comment. The recommended reading stands (DEFAULT). | DIR, below the settled table |

The Royal Academies with The Second Seat also stays whole. The user changed the rarity only: "royal academies can be a rare".

---

## For the bots

Each line is an item where a review said that Astra needs a new bot value, or that Astra owns the question.

1. **The Mausoleum.** The value of the row changes from "works × card yield" to "works × own yield" (DIR, section 1.3).
2. **The Hall of Heroes.** A family count (DIR, section 1.5).
3. **The Symposium.** A hand for an act (DIR, section 1.5).
4. **Commission: The Paradise Garden.** DIR asked for a value for its first reward (worked hexes). The settled reward is different, so the row needs a value for the new reward.
5. **The Honoured Dead.** DIR asked for a value for a family count. The card keeps its old shape, so only its number changes.
6. **An act against a work, when act cards are seated.** This covers The Symposium, The Panegyric and The Second Summons (DIR, section 1.6, build A).
7. **A held Order while The Anteroom is seated,** so that a bot drafts a card it will not seat (DIR, section 1.6, build C).
8. **A second attack after a kill** under The Companion Cavalry (DOM, section F).
9. **An Elite's death** under The Sacred Band (DOM, section F).
10. **An Elite in a garrison** under The Huscarls (DOM, section F).
11. **A count of citizens above ten** for The Megalopolis (EXP, section G).
12. **Spare authority paid in every town** for The Missi Dominici (EXP, section G).
13. **Every re-aimed Devotion row and belief.** BEL: "Every re-aimed row needs a value from Astra."
14. **Deals.** The deals cards depend on the bots' trade logic, and every deals figure depends on what the bots sign since the trade prices changed. "Astra owns that." (DIR, section 2.3; COM, last section). The new count "an empire you trade with" reads the same deals.

15. **Every reworked wonder.** WON: "Every rework changes what a wonder is worth to a bot. Astra needs a line for each one that is built." That is the ten wonders of WON in "Wonders".

The reviews name no bot value for the Scientific changes or for the Commerce card changes. DIR also asked for a value for The Ancient Constitution and The Tabularium. Both are dropped.

---

## Checks before building

Each line is a "to check" or a "not verified" that a review attached to an accepted item.

**DIR**
1. The Anteroom: whether the count of unseated Orders, which the Doctrine Scutage reads, is open to a `pays` line.
2. The Second Summons: what happens when it and The Collected Works are both seated.
3. Pax Romana: the capture rules. The review did not read what a captured town keeps.
4. The Mausoleum: whether it reaches a wonder under The Spirit Way. The review reads that it does not.
5. The cluster of works: whether The Divine Proportion doubles The Processional Way's line on a work hex. The review's figures depend on it.

**DOM**
6. The drill loop: that Up Through the Ranks pays for an Elite made by drill. The review read the code and did not test it.
7. Pax Romana with Vae Victis: whether "+5 food and +5 production for good" counts as a capture reward and is doubled.
8. The Sacred Band: whether the replacement unit is marked free. A unit with free upkeep refunds nothing under The Glorious Dead. The review calls this a build decision.
9. The Huscarls: its type is Wildcard by the sort rule, to confirm. The review did not count the Wildcard chairs of the tier-18 governments.
10. Garrisons in a coastal town: whether a ship counts as a second garrisoned unit. This matters for The Huscarls.

**EXP**
11. The Megalopolis: the review found no field for "count above a line" on `population`.
12. The Missi Dominici: `authoritySurplus` answers nothing while the meter is being folded. A row that pays science and culture should be safe.
13. The Missi Dominici and The Megalopolis are Civic. The tier-18 governments seat one to three Civic chairs.
14. The Water Boards: the review reads that `buildingYieldPercent` doubles a building's own row and not a card that counts public works.
15. The levy loop: The Mit'a with every kind of levy was read and not tested. Seasonal Levies: whether a second levy restarts the ten turns.

**COM**
16. The full route stack: how the route doublings combine. The comments say that the build must confirm it.
17. The Gilded Scaffold: whether the purchase cards fire on a wonder bought with gold.
18. Whether a gold wonder counts as a gold building for Houses of Account, Commercial Education and The Cloth Halls.
19. The Casa da Índia: what the count `luxuryCopies` returns (all copies, or the most copies of one kind).
20. The Opus bought with gold: whether gold poured into the Opus fires purchase cards.
21. Whether discounts on one purchase have a limit. This matters once Bought and Paid For counts both banks.

**SCI and SCI2**
22. Charter rule B: the `charterTechCost` rule is on a retired row. It needs a base line.
23. The Royal Academies: whether its count includes second copies.
24. The Schoolmen's Charter: the Cathedral School's data row has a second line that the card's text does not print.
25. The new Mausoleum with The Nizamiyya and The Pandidakterion: the order of the fold.
26. The Astronomical Diaries: how the `sizeRecord` tally counts a town that gains two citizens in one turn across the line.
27. The Garden of Epicurus: how The Good Years combines with a bonus that has no limit.
28. The Megalopolis: the data still holds the old text.

**DEV**
29. The Patriarchate: that the `holyCity` scope reads correctly on a `pays` line.
30. Whether a purchase price has a floor. The riders add.
31. Whether rival pressure can go below zero. The belief Inquisition (-30) and The Holy Inquisition (-80) add to -110%.
32. Feast Days and The Patriarchate: "existing shape" means that the vocabulary can write the row. The review did not read the evaluator arm.
33. `docs/religion-v2.md` disagrees with the data on rites. The review followed the data and `docs/beliefs.md`.

**BEL**
34. Keeper of the Hearth: which form of card line joins a building's package for `buildingSuppliesFrom`.
35. The Alms Box: that the rule `faithBuysBuildings` can be read from a town's follower beliefs.
36. The Pulse of Bells: that a timed grant can land on every own town in the reach.
37. Reliquaries: how the Cathedral requirement is written.
38. Congregation: the grant `citizens` with `toCapital` on the `townConverted` moment, and a capital with no room.
39. Ecclesia, Congregation and The Pulse of Bells: whether the founder's rows reach the windfall reader.
40. Ancestor Worship: the place where the authority bonus picks its yields.
41. The Holy Inquisition and The Second Prophet: that a pressure rule or a unit stat can take a scale.
42. Commission: The Anointing: that a commission's lasting reward can carry a rule.
43. The sync tests: `docs/beliefs.md` and the Devotion sheet mirror the data, so each change is a row change in both.

**WON**
44. A `windfallRider` on a wonder row: one building row carries one today (on `death`). The review did not test `capture` (The Library of Ashurbanipal) or `unitCompletion` (The Terracotta Army) from a wonder.
45. The Terracotta Army: the grant needs "the same unit", and the second unit must not fire the rider again.
46. The Pyramids: `pays` with `count: wonders` and a `hasBuilding` scope together.
47. The Great Wall: the city scope `garrisoned` on a wonder's `pays` line.
48. Notre-Dame and Machu Picchu: the review did not check the tree chart, the lanes or the column of each target technology beyond the costs in `data/techs.json` and the cost table. CLAUDE.md pins the tree's lanes and crossings. `docs/production-costs.md` carries a sync test.
49. The wager The Wonder of the Age (hold three wonders of the current age): the review read its row and not its code. After the move of Machu Picchu, age 4 has three wonders by the review's count.
50. Machu Picchu: watch the gold on a mountain map.

---

## Still open with the user

**Names, numbers and words to choose.**
1. The reroll card (Magisterial, Tier II): its name. The comments give no card type.
2. The swap card (Magisterial, Tier III): its name, the yields it gains and their size. The comments give no card type.
3. The Huscarls: the final words. Its type (Wildcard) is to confirm.
4. The Casa da Índia: the final words. The user: "could be phrased better."
5. The merged god of desert and tundra (the row `desertFathers`): its name.
6. Reliquaries: the number for each relic (+4 science and +4 culture is marked proposed).
7. Ecclesia: the pressure (20 is marked proposed).

**Defaults the user can overrule.**
8. The Drill Masters moves to Tier II, and The Horde to Tier III.
9. The cluster of works stays a broken combo.
10. The renown ladder stays.
11. Aristocracy keeps its printed number ("+15% renown").
12. The Holy Inquisition and Commission: The State Church stop giving authority (BEL, decision 3).
13. The Learned Clergy, The Sacred Bequests, The Tithe of Nations and the Doctrine The Theoric Fund are retired (BEL, decision 4).

**To confirm before building.**
14. The Second Prophet, Mission Houses and the second sentence of The Holy Inquisition. They are proposals of BEL, section 5. No comment and no decision names them.
15. The new happiness number on Commission: The State Church ("+1 happiness for every devout town"). The comments name only the authority.
16. Whether The Exchange, The World's Exchange and The World's Fair read the new count "an empire you trade with". The review says yes. The comments row names only The Treaty Ports and The Trade Mission.

**For later.**
17. The spare-authority engine: look again after the playtest (EXP, row 4).
18. Dominion: more pay-off for spare authority, in the next Dominion pass (DOM, row 6).
19. The drill loop: watch in play whether moving units through garrisons is a chore (DOM).
20. The Licence to Teach: look again after the Magisterial nerf has been played (SCI, row 9).
21. The founder's share: deferred. `docs/plans/beta-checklist-2026-11-21.md` asks whether it becomes a belief that the player picks and can read, and what its size is.
22. The deferred part of the wonder review: The Great Mosque of Djenné, the cut candidates, the two smaller changes, and cards in the other five decks that read wonders held. The user: "let's defer and add it to the beta checklist."

---

## What I could not match

**Names with no live row.** These are new cards, so no row is expected. The reviews state that the names are not used in `data/`: The Second Summons, The Panegyric, The Anteroom, The Sacred Band, The Huscarls, The Missi Dominici, The Patriarchate, The Reading Rooms, The Garden of Epicurus, The Hippodamian Plan. The reroll card and the swap card have no name yet.

**Names that differ from the row id, or that match two rows.**
- "roll of musters" in the user's words is The Roll of Masters (`theRollOfMasters`).
- The Octave has the id `devotionTheQuietHours`. The Vigil has the id `courtAugurs`. The Stone Hoard has the id `lordOfTheHoard`. None of the three changes.
- Two rows are named Tinkers' Guild. The live one is `expansionistTinkersGuild`. The row `tinkersGuild` in `data/statecraft.json` is already retired.
- Two rows are named Hegemony. The live card is `dominionHegemony`. The row `hegemony` in `data/statecraft.json` is a retired Doctrine.
- Feast Days is the follower belief `feastDays`. A retired Order named The Feast Days (`theFeastDays`) is a different row.
- Inquisition is the enhancer belief `inquisition`. The Holy Inquisition is the Order `theHolyInquisition`. A retired Order named The Inquisition (`theInquisition`) is a third row.

**Live rows that look like a new card.**
- The reroll card. The retired row The Penitents' Roll (`thePenitentsRoll`, `data/decks/common.json`, shared by Devotion and Magisterial, Tier II, uncommon) reads: "+6 science and +6 culture for every Order hand you reroll while this is seated. Rerolls cost 30% less faith while this is seated." It carries the rule `rerollCost`. The review names only "a retired card" in `data/statecraft.json` for the count. That row is The Votive Tally (`theVotiveTally`).
- The swap card. The retired row The Loose Rein (`theLooseRein`, `data/statecraft.json`) reads: "A newly placed Order is locked for 2 turns instead of 5."

**Texts where the review's quote and the data differ.**
- The Megalopolis. The reviews do not quote the live text. The data has: "Towns of ten or more citizens gain +1 science and +1 production for each citizen."
- The Golden Age. The review shortens the live text. The data has the text in the Magisterial table. The rule is the same.
- No wonder row has a `text` field. I wrote the Today cell of The Mausoleum from its effect row. For the ten wonders of WON I used the text that WON quotes from `describeBuildingRow`. I did not run that function.
- WON names technologies by their printed names. Three ids differ from the names: Code of Laws is `kingship`, The Civil Service is `theExaminationHall`, and Chronology is `theLongCount`. Castellany is `feudalism`, Daughter Cities is `colonialCharters`, and Natural Philosophy is `physics`. I matched each wonder to the technology whose `unlocks.buildings` list holds it.
- The Hippodamian Plan. The comments section gives the second sentence as "Towns you found cost 1 more authority." The proposal row below it gives "Towns you founded cost 1 more authority, including those you already hold." The second form is the live line of the Doctrine Synoecism. I used the comments section.

**Conflicts between documents, and the ruling I used.**
- The Honoured Dead. The review body counts families. The comments section keeps the shape at +5 and +5. I used the comments section.
- The Hanlin Academy. The review body keeps one effect (cheaper great people). The comments section gives a new text and makes the card shared. I used the comments section.
- The Roll of Masters, The Garden Courts and The Sed Festival. The review recommended three cuts. The user's later answer retires two and keeps The Sed Festival. I used the later answer.
- The Panegyric and Commission: The Paradise Garden. The later answers in chat replace the first proposals. I used the later answers.
- The swap card. The review recommended "an Order not seated before". The user chose every seating.
- The Tributary Kings. The user wrote "cut" at 22:58 and "cool i like it" at 23:01, then on 2026-11-24: "yup, tributary kings should be changed, the old effect cut." I used the last one.
- The Drill Masters. The Dominion comments say that the drill loop stays "with no change to either card". DIR and the Dominion review's own header say that the card moves to Tier II. I read "no change" as no change to the text, and I kept the move, as a DEFAULT.
- The Local Census and Provincial Councils. The user wrote "cut" and later explained that "cut" agreed with the recommendation. The review recommended no cut for that row. Both stay.
- The Missi Dominici. The review body pays for every five points. The comments section pays for each point.
- Houses of Account. The review body proposes +1 renown, favouring merchants. The comments section gives "+2 renown" with no family.
- Charters. The review recommended rule A. The user chose rule B.
- The Great Catalogue. SCI row 6 removes the limit, and SCI row 7 changes the count. I joined both on one row.
- The Queen of Cities. The second pass recommended no change. The user set +50%.
- The Barber-Surgeons. The second pass listed it as leaving. The user kept it as an uncommon.
- The Patriarchate. The first Devotion review gives Tier III. The comments section gives Tier II.
- Ancestor Worship. Two comments differ ("Revise: +3 authority. Spare authority also raises faith." and a later "great" on the row that still showed the first proposal). The user confirmed in chat: "yes, +3 authority."
- The founder's share. BEL proposes it. The user deferred it. Two accepted retirements name it as their reason: the belief Pilgrims' Coin and the card The Tithe of Nations. I kept both retirements, because the user accepted the belief list and decision 4 is a DEFAULT. Each row carries a note.
- Commerce, section D.4. The first comments table says "No decision yet". The second round decides every group. I used the second round.
- Timing. DIR says "No card build starts now", and five comments sections say that the changes wait behind the playtest. WON records the user's later words: "i want to have these changes in for the playtest, i changed my mind". I used the later words.
- Solomon's Temple. DIR gives "+10% renown" by the recommended reading. WON gives "+15% renown" in the user's words. I used WON.
- The Pyramid of the Sun. The WON body proposes 10 faith for each citizen. The comments section drops that and settles 5 faith, 5 science and 3 renown.
- The Library of Ashurbanipal. SCI suggests another line for it ("Completing a technology grants renown equal to a tenth of its price."). WON settles a different text. I used WON.

**Things I was unsure of.**
- The Panegyric. The comments settle its text. Its tier, rarity and type (Tier I, uncommon, Civic) come from the first proposal row, which had another text.
- The Patriarchate. The comments settle Tier II. The rarity (uncommon) and the type (Civic) come from the review's row for Tier III.
- The Hanlin Academy. The comments say that it becomes shared. They do not say where the row lives. The live shared cards are rows in `data/decks/common.json` with two decks in `decks`.
- The two retired charters. The comments retire the cards. They do not say what happens to the technologies (`militaryArchitecture`, `medicine`) or to the buildings (`bastion`, `bimaristan`) that only those cards open.
- Scholasticism. The comments move it to age 2. They give no new column, price or prerequisite. It needs The High Temple today.
- The four folded rites. The comments say "Fold the Rite of ... into a card" and give each new text. The review pairs each rite with the card that opens it today. The comments do not say whether that card keeps its name, tier, rarity and type, or whether the rite row is retired or deleted. The Hallowed Ground and The Naming Feasts are charters today, so they need no chair. A plain card needs one.
- Reliquaries. The user's design applies each relic "as a modifier to the temple". The comments do not say whether the Relic building (+3 faith) stays, whether a relic still counts as a building that supplies faith, or whether the act needs a Temple in the town. The review's text asks for a Temple.
- The Huscarls. The review judged the size for "counts as two garrisoned units". The user's wording, "twice the garrison bonus of your other cards", may need another shape.
- The Pyramid of the Sun. The comments settle what the levy pays. They do not say whether "+2 faith", "once every 5 turns" and "+2 culture on every hex with a Holy Site" stay. I wrote that the comments name no change to them.
- The "two smaller changes" of the WON summary are The Great Lighthouse and The Great Mosque of Djenné. The deferral names The Great Mosque of Djenné a second time by itself. I listed both.
- Land Speculation. The user wrote "like 6 culture". The comments section records 6 as the user's number, so I marked the row SETTLED.
- The Devotion wording change. The comments say "about eight rows" and name five. I listed the five and the general rules, and I wrote no new text for the rows that the comments do not quote.
