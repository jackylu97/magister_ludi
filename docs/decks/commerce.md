# The Commerce deck

The deck's cards, by tier: name, rarity, status, ability and type. This sheet is the spec of record for the deck. `test/sim/decks/commerce.test.ts` checks it against `data/decks/commerce.json` and, for the shared table, `data/decks/common.json`.

- **Why each card is here:** `docs/plans/commerce-themes.md`, the themes pass of 2026-10-21. It designs the deck as a way to play: an engine of gold and what gold buys, and four themes (the home market, the far trade, the goods and the bankers). Section 12 is the revision of 2026-10-21, which moved the route cards to Tier II. Section 13 holds your answers of 2026-10-23, and it outranks the sections before it. `docs/plans/commerce-list-proposed.md` is the review list this sheet was written from, with each card's theme and role, and the cut cards with the reason for each cut.
- **The build plan:** `docs/plans/commerce-themes-triage.md` (batches T1 to T9). Batch T1 wrote this sheet, put the types into the data, retired the eleven cut rows, moved four rows to the shared file, and changed fifteen cards in place. Batch T2 built the eight new cards that need no new shape (Market Day, The Emporia, The Grain Banks, The Market Halls, Names in Stone, The Hanse, Bills of Exchange and The Grain Barges), and moved Merchant Scholars to Tier III with its new text. Batch T7 built the shared The Art Dealers and the moment a card is drafted, and moved Dominion's The Standing Army to the shared file. Batch T3 built the route and post cards: The Foreign Factor, The Fondaci, The Return Leg, The Champagne Fairs, The Admiralty of Trade and The Lingua Franca. Batch T4 built the two trade commissions: Commission: The Great Fair, and The World's Fair with its new goal and reward. Batch T5 built the goods and deals cards: Export Guilds and The Treaty Ports (two new counts, the luxuries you lend and the empires you hold a deal with), The Commenda, The Capitulations, The Casa da Índia, and Land Speculation's new text. Batch T6 built the purse and the hoard: Letters of Credit (purchases with gold may take the treasury down to a floor, and the creditors wait for the same floor), The Strongbox (a count of the turns you end holding gold), The Merchant Guilds (route slots counted from merchants in the trades) and the shared Mercenary Contracts (a waiver of upkeep hung on a unit you buy). After batch T6 every card on this sheet plays as written, except the rows marked `as built`.
- **Batch DS1** (2026-11-10, `docs/plans/deck-simplification-2026-11-10.md`, `docs/flags.md` item (hhhhhhh)) retired 9 rows of this deck and 6 shared rows. It moved Provisioning Contracts from Tier II to Tier I. A moved row keeps its text until a later batch changes it. "Retired rows" below gives the reason for each cut. The spec also moves the shared Market Gardens from Tier 0 to Tier II. That move waits for a ruling, because Commerce and Expansionist would then share no card at Tier I or earlier (ruling (qqqqqq) 14).
- **Batch DS4** (2026-11-10, the same spec) gave 31 rows of this deck and 7 shared rows their new, shorter text, and changed their effects to match. A simplified card lost the clause the spec drops, and a changed card has the new effect. Each card's Note is in the spec. It added two Tier 0 cards: The Pack Trail (your trade routes give +2 gold) and The First Caravan (a Boon: a caravan when drafted). These two are route cards at Tier 0 by your ruling, so the deck's rule that route cards start at Tier II now has three stated exceptions: these two and Provisioning Contracts (Tier I).
  - **Held:** Letters of Credit and The Strongbox keep their old text and effect until you rule. Letters of Credit's new text ("Your treasury may fall to −150 with no penalty") is not what the card does: a treasury below zero still costs a quarter of your science and culture, and the game has no rule that lifts that cost above a floor. The Strongbox's new text ("Gains +1 science and +1 culture each time you buy something with gold, up to +15") needs a moment the game does not count: one purchase with gold, of any kind. The game counts the gold spent, and the buildings bought, but not each purchase.
  - **Readings taken:** "the gold you make each turn" (The Nest Egg, Bills of Exchange, Money at Work) is the gold income after upkeep, without the gold that cards pay to the empire as a whole. The Monopoly counts a luxury you hold, deals included, that no other empire holds. The Capitulations' loan now pays as one copy does. The Merchant Works pays a town building a wonder, and no longer a town building an empire building or the Magnum Opus. The Scholars' Roads was marked reword, but its new text has a different number and drops a clause, so it now costs 2 routes (was 4) and lost its +2 science and +2 culture on each route. Salt Tithes keeps its count of each different luxury you hold, deals included.
  - **Shapes removed:** a route row that paid the town its caravan reached (The Common Road and The Exchange were the only two), and the "building an empire building" narrowing on a town that is building something (The Merchant Works).
- **Batch DS8** (2026-11-11, the same spec) put the four keywords on the card face: Commission, Charter, Scaler and Boon. The game reads each from the card's data (`orderKeyword`), prints it as the card's first clause, and shows its rule in a tooltip. So no text below starts with "Charter." or "Boon." any more.
- **Status:**
  - `implemented`: in the data, dealt, and the data's text is this sheet's text.
  - `modify`: in the data, but not as this sheet writes it. The words after the colon say why. A row can have more than one:
    - `deferred`: not dealt yet, because it needs a new shape;
    - `revised`: the text and the effect change;
    - `reworked`: a different card takes over the row;
    - `moved`: the card moves to another tier;
    - `rarity`: the rarity changes;
    - `shared`: the row moves to `data/decks/common.json` and becomes a shared card;
    - `as built`: the data's text is this sheet's text, but the game does something slightly different. The list doc's row says what.
  - `add`: not in the data yet.
  - **(was …)** names the data row that a renamed card takes over.
- **Type:** the last column says which chair the card fits: **Military**, **Economic**, **Civic** or **Wildcard** (`docs/plans/doctrines-governments-chairs.md`, section 4). Since batch T1 the types are in the data. A Commerce card fits only a chair of its own type or a Wildcard chair. The sync test checks this column for every row in the data, the shared table's included.
- **Charters:** two, counted in the Charters column below: The Planters' Charter (Tier I) and Numidian Cavalry (Tier II). A charter never takes a chair. Its type is only for the card's face.
- **Doctrines:** 14 (3, 4, 3 and 4 across Tiers I to IV), all dealt, after your comments of 2026-11-05 (`docs/plans/doctrine-review-2026-11-05.md`). A Doctrine is held for the whole game and takes no chair. Each tier's Doctrine table sits above its Orders, and the Build column names the theme that each is written for. `docs/plans/doctrines-build-triage.md` gives the batch that built each one. The reasons and pairs are in `docs/plans/commerce-doctrines.md`.
- **The sheet of 2026-10-07** (69 cards, in the old format) is in git history: `git show 48f37cf8:docs/decks/commerce.md`.

| Tier | Implemented | Modify | Add | All | Charters |
|---|---|---|---|---|---|
| Tier 0 | 10 | 0 | 0 | 10 | 0 |
| Tier I | 13 | 0 | 0 | 13 | 1 |
| Tier II | 20 | 0 | 0 | 20 | 1 |
| Tier III | 16 | 0 | 0 | 16 | 0 |
| Tier IV | 10 | 1 | 0 | 11 | 0 |
| **All** | **69** | **1** | **0** | **70** | **2** |
| Shared | 15 | 2 | 0 | 17 | 1 |

**By type** (the chair a card fits; a charter's type is for its face):

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| Tier 0 | 1 | 6 | 3 | 0 |
| Tier I | 0 | 8 | 5 | 0 |
| Tier II | 2 | 7 | 9 | 2 |
| Tier III | 0 | 9 | 5 | 2 |
| Tier IV | 0 | 6 | 3 | 2 |
| **All** | **3** | **36** | **25** | **6** |
| Shared | 4 | 6 | 6 | 1 |

Without the charters, the deck holds 68 cards that take a chair: 10, 12, 19, 16 and 11 across Tiers 0 to IV. By type they are 2 Military, 35 Economic, 25 Civic and 6 Wildcard.

## Tier 0

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **Market Day** | common | implemented | Your capital gains +1 gold for every citizen. | Economic |
| **The Emporia** | common | implemented | Improved luxury hexes gain +1 food and +1 production. | Economic |
| **The Mineral Trade** | common | implemented | Mines and quarries gain +1 gold. | Economic |
| **Salt Tithes** | common | implemented | +3 gold for each different luxury you have improved. | Economic |
| **Land Speculation** | uncommon | implemented | Buying a hex grants culture equal to half the gold paid. | Civic |
| **Travellers' Letters** | common | implemented | Your capital gains +2 science and +2 culture for each empire you have met. | Civic |
| **The Pathfinders' Company** | uncommon | implemented | Scouts gain +1 sight and +1 movement. | Military |
| **The Nest Egg** | common | implemented | Your capital gains +1 culture for every 4 gold you make each turn. | Civic |
| **The Pack Trail** | common | implemented | Your trade routes give +2 gold. | Economic |
| **The First Caravan** | common | implemented | On draft: gain a caravan. | Economic |

## Tier I

**Doctrines,** offered with the tier-4 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Apoikia** | engine | Settlers and workers cost half as much gold to buy. |
| **The Laurion Leases** | goods | Hexes with a resource cost half as much gold to buy. |
| **The Delian League** | far trade | Your coastal towns cost 1 less authority and gain +3 production. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Planters' Charter** | uncommon | implemented | Unlocks the Plantation House, a building you buy with gold. | Economic |
| **Civic Receipts** | uncommon | implemented | Buying a building grants culture equal to 15% of the gold paid. | Civic |
| **Private Patronage** | rare | implemented | Towns gain +25% gold. | Economic |
| **Financed Industry** | rare | implemented | Towns gain production equal to 20% of their gold. | Economic |
| **Letters of Credit** | rare | implemented | You may buy with gold until your treasury reaches −150. Debt disbands none of your units until your treasury falls below −150. | Economic |
| **The Grain Banks** | uncommon | implemented | Cities with a Granary gain +3 gold. | Economic |
| **The Market Halls** | common | implemented | Towns with a Market gain +1 food and +1 production for every three citizens. | Economic |
| **The Staple Right** | common | implemented | Gain +3 gold and +2 culture for each luxury you hold two or more copies of. | Economic |
| **Export Guilds** | uncommon | implemented | Each luxury you lend to another empire in a deal gives your capital +4 culture and +2 production. | Civic |
| **Commercial Education** | common | implemented | Gold buildings provide +3 science. | Civic |
| **The Market Writ** | uncommon | implemented | +1 authority for every two Markets in your empire. | Civic |
| **The Strongbox** | uncommon | implemented | While seated, this card gains +1 science and +1 culture each turn you end with at least 300 gold in your treasury, up to +15 of each. | Civic |
| **Provisioning Contracts** | common | implemented | Domestic routes grant their destination +3 food and +3 production. | Economic |

## Tier II

**Doctrines,** offered with the tier-10 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Grand Canal** | home market | Each of your domestic routes carries half of its origin's surplus food to its destination. |
| **The Sogdian Colonies** | far trade | Each of your towns holding your trading post gains +3 culture and +3 renown, favouring merchants. |
| **The Forbidden Silks** | goods | Your luxuries give twice their happiness. You cannot lend luxuries in deals. |
| **The Flying Money** | bankers | Your towns with a gold building buy units and buildings 20% cheaper. Your other towns cannot buy them with gold. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **Numidian Cavalry** | uncommon | implemented | Unlocks Numidian Cavalry: a Horseman with +1 strength for each luxury you hold. | Military |
| **Names in Stone** | uncommon | implemented | +1% science and culture for every 200 gold you have spent buying this game, at most +30%. | Civic |
| **Foreign Procurement** | uncommon | implemented | You may buy units without their strategic resource. | Military |
| **The Carters' Guild** | common | implemented | Towns that receive a domestic trade route build buildings 25% faster. | Economic |
| **The Factors' Houses** | common | implemented | Your cities holding your trading post gain +2 gold and +4 culture. | Civic |
| **Commission: The Great Fair** | uncommon | implemented | Goal: have domestic routes arrive in four of your towns. Reward: two more trade routes. | Wildcard |
| **The Home Market** | common | implemented | Towns that receive two domestic routes gain +30% food and production. | Economic |
| **The League of Cities** | rare | implemented | Towns that send a trade route gain +20% production. | Economic |
| **The Common Road** | common | implemented | Your foreign routes give +3 gold, +3 science and +3 culture. | Civic |
| **The Exchange** | uncommon | implemented | +5% science and culture for each foreign empire your routes reach. | Civic |
| **The Fondaci** | uncommon | implemented | Each time one of your trading posts is established, gain science and culture, each equal to twenty times the population of its town. | Civic |
| **Mining Districts** | uncommon | implemented | Mines gain +2 gold and +2 science for every two mines beside them. | Civic |
| **The Spice Exchange** | rare | implemented | Every city gains +5% science and +5% culture for each luxury you hold two or more copies of, at most +30%. | Civic |
| **Corner the Market** | uncommon | implemented | Goal: hold four copies of one luxury. Reward: +2 happiness for each luxury you hold two or more copies of. | Wildcard |
| **Strategic Exports** | uncommon | implemented | Your strategic resources supply twice as many copies. | Economic |
| **The Treaty Ports** | uncommon | implemented | +5% production for each empire you hold a deal with, at most +25%. | Economic |
| **Houses of Account** | common | implemented | Gold buildings provide +2 happiness and +1 renown. | Civic |
| **Bills of Exchange** | uncommon | implemented | Every town gains +1% production for every 10 gold you make each turn, at most +30%. | Economic |
| **The Customs Houses** | uncommon | implemented | Each customs house in your borders gives its town +4 science and +4 culture, whether or not it is worked. | Civic |
| **The Merchant Guilds** | uncommon | implemented | You may run one more trade route for every two merchants in the trades. | Economic |

## Tier III

**Doctrines,** offered with the tier-18 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Year and a Day** | home market | Your towns that a domestic route reaches grow 25% faster. Your other towns grow 25% more slowly. |
| **The Muda** | far trade | Your trade routes to other empires pay +3 science and +3 culture, and cannot be plundered. |
| **The Turnpike Trusts** | far trade | Caravans cost half as much gold to buy. Hexes with a road gain +1 gold. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Endowment** | uncommon | implemented | Purchased buildings provide +2 science each, at most +6 per town. | Civic |
| **The Gilded Scaffold** | rare | implemented | You may purchase world wonders. All your cities lose 15% production. | Economic |
| **A Guild Commission** | uncommon | implemented | Goal: buy five buildings with gold. Reward: a free great-person draft. | Wildcard |
| **Caravanserai Cities** | uncommon | implemented | Caravanserais can be built in every city. | Economic |
| **The Chartered Metropolis** | rare | implemented | Towns that send three trade routes gain +35% food, production and culture. | Economic |
| **The Return Leg** | rare | implemented | Your trade routes between your own towns also pay their origin everything they pay their destination. | Economic |
| **The Champagne Fairs** | uncommon | implemented | Every ten turns, each town that receives a domestic trade route grants culture equal to ten times its population. | Civic |
| **The Scholars' Roads** | rare | implemented | Your routes give +50% science and culture. You run 2 fewer routes. | Civic |
| **The Admiralty of Trade** | uncommon | implemented | Your trade routes to a town holding your trading post have no range limit. | Economic |
| **The Monopoly** | rare | implemented | For each luxury that only you hold, every town gains +5 gold and +3 culture. | Economic |
| **The Capitulations** | uncommon | implemented | Each foreign town with your trading post lends you a luxury you lack. | Economic |
| **The Money Lenders** | rare | implemented | Earn interest equal to 4% of your treasury each turn, with no cap. | Economic |
| **A Court of Merchants** | rare | implemented | Gain +50% renown, but great-person offers contain only Great Merchants. | Civic |
| **The Bourse** | rare | implemented | Gold buildings produce 75% more of their own yields. | Economic |
| **The Strongroom** | uncommon | implemented | Goal: hold 1,500 gold. Reward: a great merchant, and culture equal to a fifth of your treasury. | Wildcard |
| **The Customs Service** | uncommon | implemented | Trade routes leaving a city whose borders hold a customs house gain +3 gold and +3 culture. | Civic |

## Tier IV

**Doctrines,** offered with the tier-26 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Sea Ban** | home market | Your domestic routes pay twice as much. You cannot send trade routes to other empires. |
| **The Peace of Lodi** | far trade | While you are at peace, your trade routes pay 50% more. While you are at war, they pay 25% less. |
| **The Opera del Duomo** | engine | Gold you pour into the Magnum Opus buys twice as many hammers. Your towns build the Magnum Opus 25% more slowly. |
| **The Monte di Pietà** | bankers | Every 200 gold in your treasury gives +1 happiness, at most +20. Your towns make 10% less gold. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **Bought and Paid For** | rare | implemented | Each town gains +4% production and culture for each building you bought there with gold, at most +24%. | Civic |
| **The Merchant Works** | rare | implemented | Towns building a wonder gain production equal to 25% of their gold. | Economic |
| **The Great Loan** | rare | modify: as built | On draft: gain twenty turns of gold income. Your towns make 25% less gold for forty turns. | Wildcard |
| **The Grain Barges** | uncommon | implemented | Your domestic trade routes pay their destination +1 food and +1 production for every four citizens of their origin. | Economic |
| **The Trade Winds** | rare | implemented | Gain +3 trade route capacity. Your trade routes reach 50% farther. | Economic |
| **The World's Exchange** | rare | implemented | +10% production toward the Opus for each foreign empire your trade routes reach, at most +40%. | Economic |
| **The Neutral Flag** | uncommon | implemented | Your trade routes to an empire that is at war with another empire gain +100% gold and +50% science. | Economic |
| **The World's Fair** | rare | implemented | Goal: have trade routes to four empires. Reward: your trading post in each of their capitals. | Wildcard |
| **The Casa da Índia** | rare | implemented | Every copy of a luxury you hold pays its yields, not only the first. | Economic |
| **Money at Work** | rare | implemented | Every town gains +1 science for every 20 gold you make each turn. | Civic |
| **Merchant Princes** | rare | implemented | You may buy great-person drafts with gold. | Civic |

## Shared with another deck

These rows live in `data/decks/common.json`. A seat holding Commerce or the deck named beside each one may draw it, so a change here is felt in two decks. Each pair of decks keeps a shared card at Tier I or earlier (ruling (qqqqqq) 14).

- **Types:** since batch T1 every shared row carries the type below. The cards shared with Dominion, Expansionist and Scientific carry the types those sheets give them. Batch T1 typed the cards shared with Devotion and Magisterial by this sheet, as batch E0 typed the shared rows of decks not yet sorted. The Devotion and Magisterial passes may change a type, and their triage then changes both sheets (the triage's reading 37).
- **Moved in batch T1:** The Merchant Shrines, The Waqf and The Silk Road Monks (with Devotion) and The Brokers' Redraw (with Magisterial) came here from the Commerce file, with their ids, texts and tiers. The Escorted Roads, Pilgrim Markets, The Grain Exchange and Travelling Players moved to Tier II, because each needs a trade route to pay. The Exchange of Discoveries moved to Tier I.
- **Moved in batch T7:** The Standing Army came here from the Dominion file, with its id, text, tier, rarity and type.
- **Changed in batch R1 (2026-10-25):** The Standing Army moved to Tier I in both decks (the user, on the Dominion list: *"move to tier 1 (barracks appear later)"*). The Art Dealers now pays +3 gold for each card seated in your government (*"revise: +3 gold for each card slotted in your government"*). The Pathfinders' Company is now Commerce's only Military card at Tier 0.
- **Changed in Magisterial batch MG4** (`docs/plans/magisterial-themes-triage.md`, reading 46): Travelling Players now pays +2 culture on each foreign route from a town with a Monument for each different deck among your seated cards. The Magisterial pass revised the text this sheet proposed, and both sheets list the same text.
- **Each pair's early shared card:** Expansionist, Market Gardens (Tier 0); Devotion, The Merchant Shrines (Tier 0); Scientific, The Exchange of Discoveries (Tier I); Magisterial, The Art Dealers (Tier I, built in batch T7); Dominion, The Standing Army (Tier I since batch R1, shared in batch T7).
- **Market Gardens** was the one route card shared before Tier II. Batch DS3 (`docs/plans/deck-simplification-2026-11-10.md`, your comment of 2026-11-10) gave it one effect: every hex with a road gains +1 gold. It has no route half now, and the Doctrine The Turnpike Trusts gives the same +1 gold, so the two add up. Its move to Tier II still waits for a ruling.

| Card | Rarity | Also in | Tier | Status | Ability | Type |
|---|---|---|---|---|---|---|
| **Market Gardens** | common | Expansionist | 0 | implemented | Hexes with a road gain +1 gold. | Economic |
| **The Merchant Shrines** | common | Devotion | 0 | implemented | Towns working an improved luxury gain +2 faith. | Civic |
| **The Standing Army** | uncommon | Dominion | I | implemented | Garrisoned units cost no upkeep. | Military |
| **The Exchange of Discoveries** | uncommon | Scientific | I | implemented | Mines and quarries on a resource gain +2 science. | Civic |
| **The Art Dealers** | common | Magisterial | I | implemented | +3 gold for each card seated in your government. | Economic |
| **The Escorted Roads** | uncommon | Dominion | II | implemented | Trade routes from a garrisoned town gain +5 gold. | Economic |
| **Pilgrim Markets** | uncommon | Devotion | II | implemented | Trade routes to or from a town with a Holy Site gain +3 gold and +3 faith. | Civic |
| **The Provincial Fair** | uncommon | Expansionist | II | implemented | Towns with a Market gain +2 gold on plantations, camps and pastures. | Economic |
| **The Tithe** | rare | Devotion | II | implemented | Towns with a Temple gain gold equal to 25% of their faith. | Economic |
| **The Merchant Navigators** | common | Scientific | II | implemented | Trade routes from a town with a Harbour gain +5 science. | Civic |
| **The Silk Road Monks** | uncommon | Devotion | II | modify: as built | Trade routes to a town that follows your religion gain +3 gold and +3 culture. | Civic |
| **The Brokers' Redraw** | rare | Magisterial | II | modify: as built | You may reroll an Order hand with gold. | Wildcard |
| **Merchant Scholars** | uncommon | Scientific | III | implemented | Foreign routes gain +2 science for each Academy in the origin city. | Civic |
| **Letters of Marque** | rare | Dominion | III | implemented | Naval kills grant 60 gold. | Economic |
| **Mercenary Contracts** | uncommon | Dominion | III | implemented | Military units you buy cost no upkeep for twenty turns. | Military |
| **Professional Soldiers** | uncommon | Dominion | III | implemented | Units you purchase gain +3 combat strength. | Military |
| **The Chartered Company** | uncommon | Dominion | III | implemented | Unlocks the Company Guard, a melee unit you buy with gold. | Military |

## Retired rows

These rows stay in the data so that old saves load. They are dealt to nobody, they carry no type, and no table above lists them. A save that holds one keeps it, with its effects (the triage's reading 39). The last section of `docs/plans/commerce-list-proposed.md`, "Cut by this pass", gives each card's old text and the reason for its cut.

- **Retired in batch DS1** (2026-11-10, `docs/plans/deck-simplification-2026-11-10.md`). The reason after each card is the Note column of that file's table. Each data row keeps its text and effects:
  - The Assayer's Rule (Tier 0): the player cannot tell at a glance which tiles count.
  - The Map Sellers (Tier 0): a counter with a divisor and a cap.
  - Royal Assays (Tier II): too narrow to matter in most games.
  - The Foreign Factor (Tier II): The Factors' Houses does this job in one line.
  - The Hanse (Tier II): one of the capped "for every X this game" cards. Each deck keeps one or two. The Factors' Houses pays for trading posts.
  - Established Routes (Tier III): its condition almost never happened in play.
  - The Commenda (Tier III): too narrow to matter in most games.
  - The Lingua Franca (Tier III): one of the capped "for every X this game" cards. Each deck keeps one or two.
  - The Hired Garrison (Tier IV): Tier IV keeps one Magnum Opus card of this kind per deck.
  - in `data/decks/common.json`, the shared cards:
    - Books from the Ships (with Scientific, Tier II): it reads what rivals know, which the player cannot see easily.
    - The Grain Exchange (with Expansionist, Tier II): Provisioning Contracts does this job.
    - The Waqf (with Devotion, Tier II): the player must remember which buildings they bought.
    - Travelling Players (with Magisterial, Tier II): a seat holds two or three decks, so the count barely moves.
    - The Cosmopolitan Court (with Magisterial, Tier III): two effects with three conditions.
    - War Bonds (with Dominion, Tier III): a treasury threshold to check before each purchase.
- **Retired in batch T1:**
  - eight live rows: Coastal Estates, Bought Swords, Frontier Investment, Ore Caravans, Venture Routes, The Caravanserai Network, Patrons Abroad, and The Merchant Dynasties (merged into The Customs Houses);
  - three deferred rows: The Consulate, The Post Riders and The Embargo.
- **Retired on 2026-10-12** by the old sheet's Proposed cuts: The Guild Halls, Letters of Introduction, The Lighthouse Keepers, Founding Capital, The Merchant Ledger, The Convoy, Strategic Reserves, Market Foundations, The Warehouses, The Purple Works, The Chartered Arsenal, Luxury Caravans, The Capital Arsenal, The Harbour Chain, The Charter Fleet, Purchased Prosperity, Civic Markets, Maritime Authority, Professional Retainers, The Dye Vats, The Paid Army, Entrenched Interests and The Merchant Commonwealth.
- Cut cards with no data row (Safe Conduct, The Agora, The Homeward Cargoes, and the cards of 2026-10-17 that the themes pass did not take) have nothing to retire.

## Open for your pass

- **Ruled 2026-10-23** (`docs/plans/commerce-themes.md`, section 13: your answers to sections 10 and 12, and your comments on the review page). They are written into the rows above:
  - **Changed:** Market Day (your capital gains +1 gold for every citizen), The Emporia (improved luxury hexes gain +1 food and +1 production), Private Patronage (+40% gold, and it keeps its drawback) and The Commenda (a luxury you lend counts as half a copy).
  - **Replaced:** The Agora is now The Grain Banks: +3 gold in every city with a Granary (the triage's question 2).
  - **Cut:** Safe Conduct (it had no data row) and Bought Swords (retired, and not shared with Dominion).
  - **The commissions** are a mix of institutions and one-time rewards (section 13, item 5, and the triage's "Commerce's commissions: the mix", readings 8 to 11). Corner the Market and Commission: The Great Fair leave an institution, an effect that holds for the rest of the game and takes no chair. The Strongroom, A Guild Commission and The World's Fair keep a one-time reward. The Great Loan plays as built.
  - **Approved as recommended:** the engine and the four themes, feature D (deals as a card quantity), the rule-breakers, the trims, the moves to the shared cards, the cuts, Established Routes at twenty turns with bots that renew a route, and Tier II as the first tier for route cards.
  - **The triage's questions 1 to 7** (*"approved, lets begin implementation. for 1-7, go with the recommendations."*): the build uses readings 1 to 42, shares Dominion's The Standing Army with Commerce, and builds The Art Dealers (both in batch T7).
- **Still open:**
  - **Commerce's Doctrines:** your review of 2026-11-05 closed the questions on them. All 14 are built (`docs/plans/doctrines-build-triage.md`).
  - **Three rows play as built:** The Great Loan (built as a commission, so it pays at the end of the turn it is seated, and since batch DS8 its card carries the Commission keyword, which is what its data is; a real Boon needs an on-draft grant of turns of income and a timed loss on the player, which the game does not have), The Silk Road Monks ("follows your religion" means a religion whose holy city you hold) and The Brokers' Redraw (no button offers the gold reroll yet, and the rule lets gold reroll any hand that faith may, not only an Order hand). Batch DS4 gave The Planters' Charter, Numidian Cavalry, The Exchange and The Monopoly texts that say what the game does.
  - **The Merchant Works** names a wonder only since batch DS4, by its new text.
  - **The cards shared with Devotion and Magisterial** keep their built text and this sheet's types until those decks' passes. Travelling Players took the Magisterial pass's text in Magisterial batch MG4.
