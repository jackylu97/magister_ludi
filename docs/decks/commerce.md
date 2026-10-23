# The Commerce deck

The deck's cards, by tier: name, rarity, status, ability and type. This sheet is the spec of record for the deck. `test/sim/decks/commerce.test.ts` checks it against `data/decks/commerce.json` and, for the shared table, `data/decks/common.json`.

- **Why each card is here:** `docs/plans/commerce-themes.md`, the themes pass of 2026-10-21. It designs the deck as a way to play: an engine of gold and what gold buys, and four themes (the home market, the far trade, the goods and the bankers). Section 12 is the revision of 2026-10-21, which moved the route cards to Tier II. Section 13 holds your answers of 2026-10-23, and it outranks the sections before it. `docs/plans/commerce-list-proposed.md` is the review list this sheet was written from, with each card's theme and role, and the cut cards with the reason for each cut.
- **The build plan:** `docs/plans/commerce-themes-triage.md` (batches T1 to T9). Batch T1 wrote this sheet, put the types into the data, retired the eleven cut rows, moved four rows to the shared file, and changed fifteen cards in place. Batch T2 built the eight new cards that need no new shape (Market Day, The Emporia, The Grain Banks, The Market Halls, Names in Stone, The Hanse, Bills of Exchange and The Grain Barges), and moved Merchant Scholars to Tier III with its new text. Batch T7 built the shared The Art Dealers and the moment a card is drafted, and moved Dominion's The Standing Army to the shared file. Batch T3 built the route and post cards: The Foreign Factor, The Fondaci, The Return Leg, The Champagne Fairs, The Admiralty of Trade and The Lingua Franca. Batch T4 built the two trade commissions: Commission: The Great Fair, and The World's Fair with its new goal and reward. Batch T5 built the goods and deals cards: Export Guilds and The Treaty Ports (two new counts, the luxuries you lend and the empires you hold a deal with), The Commenda, The Capitulations, The Casa da Índia, and Land Speculation's new text. Each later batch sets its own rows to `implemented`.
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
- **Doctrines:** none built. Each of Tiers I to IV has an empty Doctrine table above its Orders. Sixteen are proposed, four a tier, in `docs/plans/commerce-doctrines.md` (2026-10-23), for your review.
- **The sheet of 2026-10-07** (69 cards, in the old format) is in git history: `git show 48f37cf8:docs/decks/commerce.md`.

| Tier | Implemented | Modify | Add | All | Charters |
|---|---|---|---|---|---|
| Tier 0 | 10 | 0 | 0 | 10 | 0 |
| Tier I | 9 | 1 | 2 | 12 | 1 |
| Tier II | 21 | 2 | 1 | 24 | 1 |
| Tier III | 18 | 1 | 0 | 19 | 0 |
| Tier IV | 11 | 1 | 0 | 12 | 0 |
| **All** | **69** | **5** | **3** | **77** | **2** |
| Shared | 19 | 4 | 0 | 23 | 1 |

**By type** (the chair a card fits; a charter's type is for its face):

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| Tier 0 | 1 | 5 | 4 | 0 |
| Tier I | 0 | 7 | 5 | 0 |
| Tier II | 2 | 9 | 11 | 2 |
| Tier III | 0 | 11 | 6 | 2 |
| Tier IV | 1 | 6 | 3 | 2 |
| **All** | **4** | **38** | **29** | **6** |
| Shared | 5 | 7 | 10 | 1 |

Without the charters, the deck holds 75 cards that take a chair: 10, 11, 23, 19 and 12 across Tiers 0 to IV. By type they are 3 Military, 37 Economic, 29 Civic and 6 Wildcard.

## Tier 0

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **Market Day** | common | implemented | Your capital gains +1 gold for every citizen. | Economic |
| **The Emporia** | common | implemented | Improved luxury hexes gain +1 food and +1 production. | Economic |
| **The Mineral Trade** | common | implemented | Worked mines and quarries gain +2 gold but lose 1 production. | Economic |
| **Salt Tithes** | common | implemented | Gain +3 gold per distinct accessible improved luxury you produce. Worked luxury tiles gain +1 food. | Economic |
| **The Assayer's Rule** | uncommon | implemented | Worked resource tiles that supply gold gain +1 gold. | Economic |
| **Land Speculation** | uncommon | implemented | Buying a hex with a resource on it grants culture equal to half the gold paid. | Civic |
| **Travellers' Letters** | common | implemented | Your capital gains +2 science and +2 culture, plus +1 of each per foreign empire met, no cap. | Civic |
| **The Pathfinders' Company** | uncommon | implemented | Scouts gain +1 sight and +1 movement. | Military |
| **The Map Sellers** | common | implemented | Your capital gains +1 gold and +1 culture for every 40 hexes you have revealed, at most +8 of each. | Civic |
| **The Nest Egg** | common | implemented | Your capital gains +1 culture for every 50 gold in your treasury, at most +4. | Civic |

## Tier I

**Doctrines:** none yet.

| Doctrine | Build | Text |
|---|---|---|

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Planters' Charter** | uncommon | modify: as built | Once drafted, unlock the Plantation House for construction. No chair required. The building is purchased with gold; its payload is specified below. | Economic |
| **Civic Receipts** | uncommon | implemented | Buying any building grants culture equal to 15% of the gold paid, with no cap. | Civic |
| **Private Patronage** | rare | implemented | Your cities gain +40% gold. Producing ordinary buildings normally takes 20% more production. Empire buildings and wonders are unaffected. | Economic |
| **Financed Industry** | rare | implemented | Cities gain production equal to 30% of their gold yield. Every city loses 3 food. | Economic |
| **Letters of Credit** | rare | add | You may buy with gold until your treasury reaches −150. Debt disbands none of your units until your treasury falls below −150. | Economic |
| **The Grain Banks** | uncommon | implemented | Cities with a Granary gain +3 gold. | Economic |
| **The Market Halls** | common | implemented | Towns with a Market gain +1 food and +1 production for every three citizens. | Economic |
| **The Staple Right** | common | implemented | Gain +3 gold and +2 culture for each luxury you hold two or more copies of. | Economic |
| **Export Guilds** | uncommon | implemented | Each luxury you lend to another empire in a deal gives your capital +4 culture and +2 production. | Civic |
| **Commercial Education** | common | implemented | Gold buildings provide +3 science. | Civic |
| **The Market Writ** | uncommon | implemented | +1 authority for every two Markets in your empire. | Civic |
| **The Strongbox** | uncommon | add | While seated, this card gains +1 science and +1 culture each turn you end with at least 300 gold in your treasury, up to +15 of each. | Civic |

## Tier II

**Doctrines:** none yet.

| Doctrine | Build | Text |
|---|---|---|

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **Numidian Cavalry** | uncommon | modify: as built | Once drafted, unlock Numidian Cavalry, a Horseman replacement. No chair required. Gains +1 combat strength per distinct luxury you control; luxuries obtained only through the Silk Road contribute +0.5 instead. Normal technology requirements apply. | Military |
| **Names in Stone** | uncommon | implemented | +1% science and culture for every 200 gold you have spent buying this game, at most +30%. | Civic |
| **Foreign Procurement** | uncommon | implemented | Ignore strategic resource requirements when purchasing units. All units cost 20% more. | Military |
| **Provisioning Contracts** | common | implemented | Domestic routes grant their destination +3 food and +3 production. | Economic |
| **The Carters' Guild** | common | implemented | Towns that receive a domestic trade route build buildings 25% faster. | Economic |
| **The Factors' Houses** | common | implemented | Your cities holding your trading post gain +2 gold and +4 culture. | Civic |
| **Commission: The Great Fair** | uncommon | implemented | Commission. Have domestic trade routes arrive in four of your towns at the same time. Then, for the rest of the game, you may run two more trade routes. The card leaves its chair. | Wildcard |
| **The Home Market** | common | implemented | Cities receiving at least two of your domestic routes gain +30% food, +30% production and +2 happiness, once per city. | Economic |
| **The League of Cities** | rare | implemented | Cities with one of your paying outgoing routes gain +23% production and cost one less authority, minimum one. Cities without one lose 10% gold. | Economic |
| **The Hanse** | uncommon | implemented | +3% production and culture for each of your towns holding your trading post, at most +30%. | Civic |
| **The Common Road** | common | implemented | Your foreign routes grant you +3 gold, +3 science and +3 culture. Each also grants its host city +3 gold. | Civic |
| **The Exchange** | uncommon | modify: as built | Each different foreign empire your routes currently serve grants +5% science and culture empire-wide. Foreign routes to your cities grant +2 science and +2 culture to both you and the sender. | Civic |
| **The Foreign Factor** | common | implemented | Each foreign town holding your trading post gives you +1 science and +1 culture for every four of its citizens. Its owner gains +2 gold. | Civic |
| **The Fondaci** | uncommon | implemented | Each time one of your trading posts is established, gain science and culture, each equal to twenty times the population of its town. | Civic |
| **Royal Assays** | uncommon | implemented | Each improved luxury resource deposit with a mine provides one additional copy of that luxury. | Economic |
| **Mining Districts** | uncommon | implemented | Worked mines gain +2 gold and +2 science for every two adjacent mines. | Civic |
| **The Spice Exchange** | rare | implemented | Every city gains +5% science and +5% culture for each luxury you hold two or more copies of, at most +30%. | Civic |
| **Corner the Market** | uncommon | implemented | Commission. Hold four copies of one luxury, counting copies you receive in deals. Then, for the rest of the game, gain +2 happiness for each luxury you hold two or more copies of. The card leaves its chair. | Wildcard |
| **Strategic Exports** | uncommon | implemented | Trade routes gain +2 science per improved strategic resource deposit in their origin city. Your strategic resource deposits provide twice their normal quantity. | Economic |
| **The Treaty Ports** | uncommon | implemented | +5% production for each empire you hold a deal with, at most +25%. | Economic |
| **Houses of Account** | common | implemented | Gold buildings provide +2 happiness and +1 renown. | Civic |
| **Bills of Exchange** | uncommon | implemented | Every town gains +1% production for every 100 gold in your treasury, at most +30%. | Economic |
| **The Customs Houses** | uncommon | implemented | Each customs house in your borders gives its town +4 science and +4 culture, whether or not it is worked. | Civic |
| **The Merchant Guilds** | uncommon | add | You may run one more trade route for every two merchants in the trades. | Economic |

## Tier III

**Doctrines:** none yet.

| Doctrine | Build | Text |
|---|---|---|

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Endowment** | uncommon | implemented | Purchased buildings provide +2 science each, at most +6 per town. | Civic |
| **The Gilded Scaffold** | rare | implemented | You may purchase world wonders. All your cities lose 15% production. | Economic |
| **A Guild Commission** | uncommon | implemented | Commission. Goal: buy five buildings with gold while seated. Reward: a free great-person draft, the same offer Merchant Princes sells for gold. The card then leaves its chair. | Wildcard |
| **Caravanserai Cities** | uncommon | implemented | Caravanserais can be built in every city. | Economic |
| **The Chartered Metropolis** | rare | implemented | Cities with at least three of your paying outgoing routes gain +38% food, production and culture, but each costs +4 authority while qualified. | Economic |
| **The Return Leg** | rare | implemented | Your trade routes between your own towns also pay their origin everything they pay their destination. | Economic |
| **The Champagne Fairs** | uncommon | implemented | Every ten turns, each town that receives a domestic trade route grants culture equal to ten times its population. | Civic |
| **Established Routes** | uncommon | implemented | A trade route you have kept up for at least twenty turns pays 50% more. A route that lapses, is cancelled or is plundered begins its term again. | Economic |
| **The Scholars' Roads** | rare | implemented | Lose 4 route capacity. Your routes gain +2 science and +2 culture, and gain +50% science and culture. | Civic |
| **The Admiralty of Trade** | uncommon | implemented | Your trade routes to a town holding your trading post have no range limit. | Economic |
| **The Lingua Franca** | uncommon | implemented | +1% science and culture for every three trade routes running anywhere in the world, at most +30%. | Civic |
| **The Monopoly** | rare | modify: as built | For each luxury you hold three or more copies of and no other empire holds, gain +8 gold, +5 culture and +1 happiness in every city. | Economic |
| **The Commenda** | rare | implemented | Luxuries you lend in a deal count as half a copy for you. | Economic |
| **The Capitulations** | uncommon | implemented | Each foreign town holding your trading post lends you one of its luxuries that you lack, at half value. | Economic |
| **The Money Lenders** | rare | implemented | Earn interest equal to 4% of your treasury each turn, with no cap. | Economic |
| **A Court of Merchants** | rare | implemented | Gain +50% renown, but great-person offers contain only Great Merchants. | Civic |
| **The Bourse** | rare | implemented | Gold buildings produce 75% more of their own yields. | Economic |
| **The Strongroom** | uncommon | implemented | Commission. Goal: end a turn with at least 1,500 gold in your treasury. Reward: culture equal to a fifth of your treasury at that moment, and a great merchant. The card then leaves its chair. | Wildcard |
| **The Customs Service** | uncommon | implemented | Trade routes leaving a city whose borders hold a customs house gain +3 gold and +3 culture. | Civic |

## Tier IV

**Doctrines:** none yet.

| Doctrine | Build | Text |
|---|---|---|

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **Bought and Paid For** | rare | implemented | Each town gains +4% production and culture for each building you bought there with gold, at most +24%. | Civic |
| **The Merchant Works** | rare | implemented | Cities building a world wonder, an empire building or the Opus gain production equal to 25% of their gold, and lose 20% of their gold. | Economic |
| **The Great Loan** | rare | modify: as built | When you seat this card, gain gold equal to twenty turns of your gold income. For the next forty turns your cities lose 25% gold. The card then leaves its chair. | Wildcard |
| **The Hired Garrison** | uncommon | implemented | A city with a world wonder or the Magnum Opus at the front of its queue may buy any number of military units with gold each turn. | Military |
| **The Grain Barges** | uncommon | implemented | Your domestic trade routes pay their destination +1 food and +1 production for every four citizens of their origin. | Economic |
| **The Trade Winds** | rare | implemented | Gain +3 trade route capacity. Your trade routes reach 50% farther. | Economic |
| **The World's Exchange** | rare | implemented | +10% production toward the Opus for each foreign empire your trade routes reach, at most +40%. | Economic |
| **The Neutral Flag** | uncommon | implemented | Your trade routes to an empire that is at war with another empire gain +100% gold and +50% science. | Economic |
| **The World's Fair** | rare | implemented | Commission. Have trade routes to four other empires at the same time. Then your trading post is established in the capital of each of them. The card leaves its chair. | Wildcard |
| **The Casa da Índia** | rare | implemented | Every copy of a luxury you hold pays its yields, not only the first. | Economic |
| **Money at Work** | rare | implemented | Every town gains +1 science for every 500 gold in your treasury. | Civic |
| **Merchant Princes** | rare | implemented | Gold may purchase great-person drafts at the existing escalating offer price, with normal availability and purchase limits. | Civic |

## Shared with another deck

These rows live in `data/decks/common.json`. A seat holding Commerce or the deck named beside each one may draw it, so a change here is felt in two decks. Each pair of decks keeps a shared card at Tier I or earlier (ruling (qqqqqq) 14).

- **Types:** since batch T1 every shared row carries the type below. The cards shared with Dominion, Expansionist and Scientific carry the types those sheets give them. Batch T1 typed the cards shared with Devotion and Magisterial by this sheet, as batch E0 typed the shared rows of decks not yet sorted. The Devotion and Magisterial passes may change a type, and their triage then changes both sheets (the triage's reading 37).
- **Moved in batch T1:** The Merchant Shrines, The Waqf and The Silk Road Monks (with Devotion) and The Brokers' Redraw (with Magisterial) came here from the Commerce file, with their ids, texts and tiers. The Escorted Roads, Pilgrim Markets, The Grain Exchange and Travelling Players moved to Tier II, because each needs a trade route to pay. The Exchange of Discoveries moved to Tier I.
- **Moved in batch T7:** The Standing Army came here from the Dominion file, with its id, text, tier, rarity and type. It is a Commerce seat's Military card at Tier 0.
- **Each pair's early shared card:** Expansionist, Market Gardens (Tier 0); Devotion, The Merchant Shrines (Tier 0); Scientific, The Exchange of Discoveries (Tier I); Magisterial, The Art Dealers (Tier I, built in batch T7); Dominion, The Standing Army (Tier 0, shared in batch T7).
- **Market Gardens** is the one route card shared before Tier II. Its farms pay beside a road from Tier 0, and its route half waits for the caravans (section 12 of the themes pass, answered).

| Card | Rarity | Also in | Tier | Status | Ability | Type |
|---|---|---|---|---|---|---|
| **Market Gardens** | common | Expansionist | 0 | implemented | Farms beside a road gain +1 gold. Domestic routes grant an additional +1 food to their destination. | Economic |
| **The Merchant Shrines** | common | Devotion | 0 | implemented | Your capital gains +2 faith. Cities working an improved luxury gain +1 faith, once per city. | Civic |
| **The Standing Army** | uncommon | Dominion | 0 | implemented | Garrisoned units cost no upkeep. Cities with a Barracks gain +30% production toward military units. | Military |
| **The Exchange of Discoveries** | uncommon | Scientific | I | implemented | +2 science on mines and quarries on a resource. Additional +2 if the city has a market. | Civic |
| **The Art Dealers** | common | Magisterial | I | implemented | Each card you draft grants 15 gold. | Economic |
| **The Escorted Roads** | uncommon | Dominion | II | implemented | Routes whose origin has a garrison gain +5 gold. Naval units gain +2 strength while adjacent to one of your traders. | Economic |
| **Pilgrim Markets** | uncommon | Devotion | II | implemented | Routes gain +3 gold and +3 faith if either endpoint contains a Holy Site. This pays once per route even when both endpoints qualify. | Civic |
| **The Grain Exchange** | uncommon | Expansionist | II | implemented | Domestic routes from a city with a Granary give +5 food to their destination. Cities receiving one gain +1 happiness. | Economic |
| **Travelling Players** | uncommon | Magisterial | II | modify: revised | Foreign routes from a city with a Monument gain +1 culture; additional +2 culture for every unique deck type slotted in your government. | Civic |
| **The Provincial Fair** | uncommon | Expansionist | II | implemented | Connected noncapital cities with a Market gain +3 food. Their worked plantations, camps and pastures gain +2 gold. | Economic |
| **The Tithe** | rare | Devotion | II | implemented | Cities with a Temple gain gold equal to 25% of their base faith, and +25% gold. | Economic |
| **The Merchant Navigators** | common | Scientific | II | implemented | Ships gain +1 movement. Routes from a city with a Harbour and a Library gain +5 science. | Civic |
| **Books from the Ships** | uncommon | Scientific | II | implemented | Each foreign trade route you send gains +1 science for each technology the destination's owner knows that you do not, at most +4. | Civic |
| **The Waqf** | common | Devotion | II | implemented | Faith buildings you bought with gold provide +3 faith and +2 culture. | Civic |
| **The Silk Road Monks** | uncommon | Devotion | II | modify: as built | Your trade routes carry 100% more religious pressure. Trade routes you send to a city that follows your religion gain +3 gold and +3 culture. | Civic |
| **The Brokers' Redraw** | rare | Magisterial | II | modify: as built | You may reroll a draft with gold instead of faith. All other purchasing is 10% more expensive. | Wildcard |
| **Merchant Scholars** | uncommon | Scientific | III | implemented | Foreign routes gain +2 science for each Academy in the origin city. | Civic |
| **Letters of Marque** | rare | Dominion | III | implemented | Naval combat kills grant 60 gold. Cities with a Harbour gain +38% gold, but produce naval combat units 20% more slowly. | Economic |
| **Mercenary Contracts** | uncommon | Dominion | III | modify: deferred; reworked | Military units you buy cost no upkeep for twenty turns. | Military |
| **War Bonds** | uncommon | Dominion | III | implemented | Military units gain +1 strength for every 150 gold in your treasury, at most +5. | Military |
| **Professional Soldiers** | uncommon | Dominion | III | implemented | Units you purchase gain +3 combat strength. | Military |
| **The Chartered Company** | uncommon | Dominion | III | implemented | Once drafted, unlock the Company Guard, a unique gunpowder-age melee unit that can only be bought with gold, in cities with a Barracks. No chair required. | Military |
| **The Cosmopolitan Court** | rare | Magisterial | III | implemented | Cities with a culture building gain +1 renown per outgoing foreign route, at most +3 per city. Great-person improvements worked by such cities gain +3 gold. | Civic |

## Retired rows

These rows stay in the data so that old saves load. They are dealt to nobody, they carry no type, and no table above lists them. A save that holds one keeps it, with its effects (the triage's reading 39). The last section of `docs/plans/commerce-list-proposed.md`, "Cut by this pass", gives each card's old text and the reason for its cut.

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
  - **Commerce's Doctrines:** sixteen proposed on 2026-10-23 (`docs/plans/commerce-doctrines.md`), waiting for your review; a triage of their own builds them.
  - **Seven rows play as built:** The Planters' Charter, Numidian Cavalry, The Exchange, The Monopoly, The Great Loan, The Silk Road Monks and The Brokers' Redraw. The list doc's row for each says what the game does. A later pass either rewrites their text to what the game does or builds the text.
  - **The Merchant Works** touches the wonder split. It stays as written. Say if you want "a world wonder" dropped from its text.
  - **The cards shared with Devotion and Magisterial** keep their built text and this sheet's types until those decks' passes. Travelling Players keeps its built text until the Magisterial pass (the triage's reading 38).
  - **Data wording:** The Planters' Charter's text says "its payload is specified below", and the card shows nothing below it.
