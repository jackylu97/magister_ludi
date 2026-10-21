# The Commerce deck: the full list, with the themes pass folded in

This is a review list, rebuilt on 2026-10-21. It puts every card on the deck sheet (`docs/decks/commerce.md`) in one list, with every new card and change from the themes pass (`docs/plans/commerce-themes.md`) folded in. It replaces the list of 2026-10-18, which folded in the superseded builds pass of 2026-10-17 (`docs/plans/commerce-builds.md`). It is not the spec of record: the sheet is unchanged, and the sheet's text wins wherever the two differ. It is grouped by tier, as you asked for the Scientific list, so you can cut cards by hand.

- **Status:**
  - `implemented`: in the data, dealt, and the sheet's text is what the game does. The Commerce sheet still uses the older words (built, revised, deferred); this list maps them as the list of 2026-10-18 did.
  - `modify`: in the data, but not as the sheet writes it. The word after the colon says why: `revised` (the sheet changes the card), `deferred` (not dealt, because it needs a new shape) or `as built` (the game does something slightly different).
  - `add`: on the sheet, not in the data.
  - `new`: proposed by the themes pass, not on the sheet. "(10-17)" marks a card from the superseded builds pass. "(a deferred data row)" marks a row in `data/decks/commerce.json` that the sheet does not list.
  - `proposed: …` after the status names a change the themes pass makes to a sheet card: a tier move, a rarity change, a rework, a trim to one clause, or a revised number. The row already shows the change (the new tier, rarity and text), and the status says what it was.
- **Type:** the chair the card fits (Military, Economic, Civic or Wildcard), from the themes pass's type sort. The Commerce rows in the data carry no type yet, so every type here is a proposal. Charters take no chair; their type is for their face.
- **Build:** the card's theme and role in the themes pass.
  - The four themes are the home market, the far trade, the goods and the bankers. Engine glue raises or spends the engine (gold, and what it buys) and serves all four.
  - The roles are supply (more of the thing), widen (it pays something new), multiply (its output grows) and act (a choice or a moment). A capstone breaks a rule or doubles a category.
  - A second theme after a semicolon marks a bridge between two themes.
  - "feature A" marks a card on the trades as a card quantity (accepted 2026-10-20). "feature D" marks a card on deals as a card quantity, which the pass proposes (`docs/plans/commerce-themes.md` section 6).
- **What this list follows:**
  - the direction of 2026-10-20 (`docs/decks/deck-design.md`): a few themes per deck with varied pay, no more than about a third of the cards paying the deck's own yield, and four of the five areas of the game;
  - your picture of Commerce: wealth, routes at home and abroad, deals, infrastructure through connections, the most flexibility, luxuries claimed and traded, trading posts that pay more through the ages, and passive bonuses as the world grows and connects;
  - your taste from the Scientific, Dominion and Expansionist passes: cut what is not impactful, too strong or "win more"; rule-breakers that bend one core rule; late pay as a percentage; two cards with one job merged; bridging cards shared.
- **Doctrines:** Commerce has none yet. They come after your cuts.
- **Cut cards:** the cards the themes pass cuts are in the last section, `## Cut by this pass`, with their sheet text and one line on why, so you can restore any of them. The three cards the pass moves to the shared cards are in the shared table.

**By status** (charters included):

| Tier | Implemented | Modify | Add | New | All | Proposed change |
|---|---|---|---|---|---|---|
| Tier 0 | 9 | 0 | 0 | 0 | 9 | 1 |
| Tier I | 15 | 1 | 0 | 4 | 20 | 6 |
| Tier II | 13 | 2 | 0 | 6 | 21 | 4 |
| Tier III | 11 | 1 | 0 | 6 | 18 | 3 |
| Tier IV | 9 | 1 | 0 | 2 | 12 | 3 |
| **All** | **57** | **5** | **0** | **18** | **80** | **17** |
| Shared | 12 | 8 | 1 | 0 | 21 | 5 |

**By type** (the chair a card fits; charters take no chair, and their type is for their face):

| Tier | Military | Economic | Civic | Wildcard | All | Charters among them | Common / uncommon / rare |
|---|---|---|---|---|---|---|---|
| Tier 0 | 1 | 3 | 5 | 0 | 9 | 0 | 6 / 3 / 0 |
| Tier I | 1 | 11 | 7 | 1 | 20 | 1 | 8 / 10 / 2 |
| Tier II | 2 | 7 | 11 | 1 | 21 | 1 | 4 / 14 / 3 |
| Tier III | 0 | 11 | 5 | 2 | 18 | 0 | 0 / 9 / 9 |
| Tier IV | 1 | 6 | 3 | 2 | 12 | 0 | 0 / 3 / 9 |
| **All** | **5** | **38** | **31** | **6** | **80** | **2** | **18 / 39 / 23** |
| Shared | 4 | 7 | 9 | 1 | 21 | 1 |  |

Seatable cards (charters excluded): 78, that is 9 / 19 / 20 / 18 / 12 across Tiers 0 to IV. By type: 4 Military, 37 Economic, 31 Civic and 6 Wildcard. Before this pass the sheet held 69 cards: 4, 38, 21 and 6. Cards that pay gold: 18 of 78 (23%), against 30 of 69 (43%).

**Data notes:**
- The Carters' Guild is Tier 0 in the data; this list has it at Tier I. The Spice Exchange and The Strongroom are Tier IV in the data; this list has them at Tiers II and III.
- The Return Leg (Tier I in the data), Export Guilds (Tier II) and The Treaty Ports (Tier I) are deferred rows the sheet does not list. The pass reworks them, and this list has them at Tiers III, I and II.
- The Consulate and The Post Riders are deferred rows the sheet does not list. The recommendation is to retire both (`## Cut by this pass`).
- The 23 rows the sheet cut on 2026-10-06 are already retired in the data.
- Shared rows whose data differs from the sheet: Merchant Scholars (data: Tier I, "Foreign routes from a city with a Library gain +5 science"), The Exchange of Discoveries (data: Tier III), Travelling Players (data: Tier 0, "+2 culture on foreign routes from a city with a Monument"). The Art Dealers has no row. Mercenary Contracts is deferred.
- The Waqf, The Silk Road Monks and The Brokers' Redraw are rows in `data/decks/commerce.json`. If the moves are taken, their rows go to `data/decks/common.json`.
- Shapes the new cards need: feature D's two counts do not exist. The `guildsmen` count (Scientific batch S2) and the `routeRider` count field exist. Section 7 of the themes pass lists the twenty new shapes.
- The Plantation House (The Planters' Charter) is a placeholder design: +1 gold, and +1 food and +1 gold on each plantation its town works.

## Tier 0

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Mineral Trade** | common | implemented | Worked mines and quarries gain +2 gold but lose 1 production. | Economic | goods: widen (it shows the cost) |
| **Salt Tithes** | common | implemented | Gain +3 gold per distinct accessible improved luxury you produce. Worked luxury tiles gain +1 food. | Economic | goods: supply |
| **The Merchant Shrines** | common | implemented | Your capital gains +2 faith. Cities working an improved luxury gain +1 faith, once per city. | Civic | goods: widen (faith); the early faith |
| **The Assayer's Rule** | uncommon | implemented | Worked resource tiles that supply gold gain +1 gold. | Economic | goods: widen |
| **Land Speculation** | uncommon | implemented; proposed: reworked (was "Your cities gain +25% gold. Your capital loses 2 happiness."; type was Economic) | Buying a hex with a resource on it grants culture equal to half the gold paid. | Civic | goods: act (a claim) |
| **Travellers' Letters** | common | implemented | Your capital gains +2 science and +2 culture, plus +1 of each per foreign empire met, no cap. | Civic | far trade: widen |
| **The Pathfinders' Company** | uncommon | implemented | Scouts gain +1 sight and +1 movement. | Military | far trade: supply |
| **The Map Sellers** | common | implemented | Your capital gains +1 gold and +1 culture for every 40 hexes you have revealed, at most +8 of each. | Civic | far trade: widen |
| **The Nest Egg** | common | implemented | Your capital gains +1 culture for every 50 gold in your treasury, at most +4. | Civic | bankers: widen |

## Tier I

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Planters' Charter** (charter) | uncommon | modify: as built (the Plantation House is a placeholder: +1 gold, and +1 food and +1 gold on each plantation its city works) | Once drafted, unlock the Plantation House for construction. No chair required. The building is purchased with gold; its payload is specified below. | Economic | goods: supply |
| **Civic Receipts** | uncommon | implemented | Buying any building grants culture equal to 15% of the gold paid, with no cap. | Civic | engine glue: the purchase |
| **Bought Swords** | uncommon | implemented; proposed: reworked (was "Your cities gain +38% gold. Military units take 10% more production to train. Purchased units count as trained."; type was Economic) | Your towns may buy two military units a turn instead of one. Towns build military units 10% more slowly. | Military | engine glue: the bought army |
| **Private Patronage** | rare | implemented | Your cities gain +38% gold. Producing ordinary buildings normally takes 20% more production. Empire buildings and wonders are unaffected. | Economic | engine glue: buy, do not build |
| **Financed Industry** | rare | implemented | Cities gain production equal to 30% of their gold yield. Every city loses 3 food. | Economic | engine glue: gold into production |
| **Provisioning Contracts** | common | implemented | Domestic routes grant their destination +3 food and +3 production. | Economic | home market: supply |
| **The Carters' Guild** | common | implemented; proposed: moved from Tier 0; proposed: reworked (was "Your cities connected to your capital by road, other than the capital, gain +1 food and +2 gold.") | Towns that receive a domestic trade route build buildings 25% faster. | Economic | home market: widen (infrastructure) |
| **Frontier Investment** | uncommon | implemented; proposed: trimmed (its "and those cities gain +25% gold" goes) | In your cities of 5 population or fewer, domestic trade routes pay double. | Economic | home market: multiply (young towns) |
| **The Factors' Houses** | common | implemented; proposed: trimmed (its "and +25% gold" goes); type was Economic | Your cities holding your trading post gain +2 gold and +4 culture. | Civic | home market: widen (culture); far trade |
| **Commission: The Great Fair** | uncommon | new | Commission. Have domestic trade routes arrive in four of your towns at the same time. Then, for the rest of the game, you may run two more trade routes. The card leaves its chair. | Wildcard | home market: act (commission) |
| **The Common Road** | common | implemented | Your foreign routes grant you +3 gold, +3 science and +3 culture. Each also grants its host city +3 gold. | Civic | far trade: widen |
| **Venture Routes** | uncommon | implemented | Your trade routes gain two turns of range. Trade routes between cities at least fifteen hexes apart gain +100% gold. | Economic | far trade: supply (reach) |
| **Established Routes** | uncommon | implemented; proposed: revised (thirty turns to twenty) | A trade route you have kept up for at least twenty turns pays 50% more. A route that lapses, is cancelled or is plundered begins its term again. | Economic | far trade: multiply (age); home market |
| **The Homeward Cargoes** | common | new (10-17) | Each town gains +3 production for every trade route to another empire that sets out from it. | Economic | far trade: widen (production) |
| **The Staple Right** | common | implemented | Gain +3 gold and +2 culture for each luxury you hold two or more copies of. | Economic | goods: widen (culture) |
| **Ore Caravans** | common | implemented | Trade routes gain +1 gold for every mine in their origin city. | Economic | goods: bridge to the trade themes |
| **Export Guilds** | uncommon | new (a deferred data row); proposed: reworked (was "A city working a luxury type you currently export through an active agreement gains +20% production toward ordinary buildings and +2 happiness, once per city.") | Each luxury you lend to another empire in a deal gives your capital +4 culture and +2 production. | Civic | goods: widen (exports); feature D |
| **Commercial Education** | common | implemented | Gold buildings provide +3 science. | Civic | bankers: widen |
| **The Market Writ** | uncommon | implemented; proposed: trimmed (its "Your cities gain +38% gold." goes); type was Economic | +1 authority for every two Markets in your empire. | Civic | bankers: widen (authority) |
| **The Strongbox** | uncommon | new (10-17) | While seated, this card gains +1 science and +1 culture each turn you end with at least 300 gold in your treasury, up to +15 of each. | Civic | bankers: multiply (grower) |

## Tier II

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **Numidian Cavalry** (charter) | uncommon | modify: as built (every luxury counts in full; the half value for Silk Road luxuries is not built) | Once drafted, unlock Numidian Cavalry, a Horseman replacement. No chair required. Gains +1 combat strength per distinct luxury you control; luxuries obtained only through the Silk Road contribute +0.5 instead. Normal technology requirements apply. | Military | goods: widen (the army) |
| **Names in Stone** (was The Benefactors' Roll, 10-17) | uncommon | new (10-17) | +1% science and culture for every 200 gold you have spent buying this game, at most +30%. | Civic | engine glue: "this game" count |
| **Foreign Procurement** | uncommon | implemented | Ignore strategic resource requirements when purchasing units. All units cost 20% more. | Military | engine glue: the bought army |
| **The Home Market** | common | implemented | Cities receiving at least two of your domestic routes gain +30% food, +30% production and +2 happiness, once per city. | Economic | home market: multiply (market towns) |
| **The Caravanserai Network** | common | implemented; proposed: trimmed (its "+2 production and +2 gold on domestic trade routes" goes); type was Economic | Each city receiving a domestic trade route gains +2 happiness, once per city. | Civic | home market: widen (happiness) |
| **The League of Cities** | rare | implemented | Cities with one of your paying outgoing routes gain +23% production and cost one less authority, minimum one. Cities without one lose 10% gold. | Economic | home market: multiply (with a cost) |
| **The Hanse** | uncommon | new | +3% production and culture for each of your towns holding your trading post, at most +30%. | Civic | home market: multiply (scaler) |
| **The Exchange** | uncommon | modify: as built (the second sentence pays your own foreign routes and the cities they reach, not routes sent to you) | Each different foreign empire your routes currently serve grants +5% science and culture empire-wide. Foreign routes to your cities grant +2 science and +2 culture to both you and the sender. | Civic | far trade: multiply (scaler) |
| **The Scholars' Roads** | rare | implemented | Lose 4 route capacity. Your routes gain +2 science and +2 culture, and gain +50% science and culture. | Civic | far trade: multiply (with a cost) |
| **The Foreign Factor** | common | implemented; proposed: reworked (was "Each foreign city holding your trading post grants you +5 gold and its host city +2 gold per turn while you are at peace and the host is not blockaded."; type was Economic) | Each foreign town holding your trading post gives you +1 science and +1 culture for every four of its citizens. Its owner gains +2 gold. | Civic | far trade: widen; scaler (the post grows with its town) |
| **The Fondaci** | uncommon | new (the name is the 10-17 pass's) | Each time one of your trading posts is established, gain science and culture, each equal to twenty times the population of its town. | Civic | far trade: act; home market |
| **Royal Assays** | uncommon | implemented | Each improved luxury resource deposit with a mine provides one additional copy of that luxury. | Economic | goods: supply (copies) |
| **Mining Districts** | uncommon | implemented | Worked mines gain +2 gold and +2 science for every two adjacent mines. | Civic | goods: widen (science) |
| **The Spice Exchange** | rare | implemented; proposed: moved from Tier IV | Every city gains +5% science and +5% culture for each luxury you hold two or more copies of, at most +30%. | Civic | goods: multiply (scaler) |
| **Corner the Market** (commission) | uncommon | implemented | Commission. Goal: control four copies of one luxury, counting copies you receive in deals. Reward: a great merchant and 225 gold. The card then leaves its chair. | Wildcard | goods: act |
| **Strategic Exports** | uncommon | implemented; type was Civic | Trade routes gain +2 science per improved strategic resource deposit in their origin city. Your strategic resource deposits provide twice their normal quantity. | Economic | goods: bridge to the army |
| **The Treaty Ports** | uncommon | new (a deferred data row); proposed: reworked (was "Each foreign empire with which you have an active resource agreement grants your capital +2 gold and +3 culture. That partner's capital gains +1 gold. Each partner counts once.") | +5% production for each empire you hold a deal with, at most +25%. | Economic | goods: multiply (the table); feature D |
| **Houses of Account** | common | implemented | Gold buildings provide +2 happiness and +1 renown. | Civic | bankers: supply (merchant renown) |
| **Bills of Exchange** | uncommon | new (10-17) | Every town gains +1% production for every 100 gold in your treasury, at most +30%. | Economic | bankers: multiply (the hoard) |
| **The Customs Houses** | uncommon | implemented; proposed: reworked (takes The Merchant Dynasties' job; was "Customs houses gain +5 gold and +1 renown. Cities with a customs house gain +38% gold."; type was Economic) | Each customs house in your borders gives its town +4 science and +4 culture, whether or not it is worked. | Civic | bankers: widen |
| **The Merchant Guilds** | uncommon | new | You may run one more trade route for every two merchants in the trades. | Economic | bankers: bridge to the trade themes; feature A |

## Tier III

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Endowment** | uncommon | implemented | Purchased buildings provide +2 science each, at most +6 per town. | Civic | engine glue: bought buildings |
| **The Gilded Scaffold** | rare | implemented | You may purchase world wonders. All your cities lose 15% production. | Economic | engine glue: capstone (rule-breaker) |
| **A Guild Commission** (commission) | uncommon | implemented | Commission. Goal: buy five buildings with gold while seated. Reward: a free great-person draft, the same offer Merchant Princes sells for gold. The card then leaves its chair. | Wildcard | engine glue: act |
| **Caravanserai Cities** | uncommon | implemented; proposed: trimmed (its "Cities with a Caravanserai gain +30% gold." goes) | Caravanserais can be built in every city. | Economic | home market: supply (rule-breaker) |
| **The Chartered Metropolis** | rare | implemented | Cities with at least three of your paying outgoing routes gain +38% food, production and culture, but each costs +4 authority while qualified. | Economic | home market: multiply (with a cost) |
| **The Return Leg** | rare | new (a deferred data row); proposed: reworked (was "Your domestic routes also pay their origin one third of the non-conversion food, production and gold they pay the destination."), moved from Tier I, rarity was uncommon | Your trade routes between your own towns also pay their origin everything they pay their destination. | Economic | home market: capstone (doubler) |
| **The Champagne Fairs** | uncommon | new (10-17), reworked (was culture equal to forty times the home routes) | Every ten turns, each town that receives a domestic trade route grants culture equal to ten times its population. | Civic | home market: act (the fair) |
| **Safe Conduct** | rare | new (10-17) | Declaring war, or being declared on, does not end your trade routes, and your trading posts keep paying in war. | Economic | far trade: capstone (rule-breaker) |
| **The Admiralty of Trade** | uncommon | implemented; proposed: reworked (was "A sea trade route between two cities that both hold your trading post has no range limit."), rarity was rare | Your trade routes to a town holding your trading post have no range limit. | Economic | far trade: supply (reach) |
| **The Lingua Franca** | uncommon | new | +1% science and culture for every three trade routes running anywhere in the world, at most +30%. | Civic | far trade: multiply (the world connects) |
| **The Monopoly** | rare | modify: as built (the happiness is +1 for the empire, not +1 in every city) | For each luxury you hold three or more copies of and no other empire holds, gain +8 gold, +5 culture and +1 happiness in every city. | Economic | goods: pay-off |
| **The Commenda** | rare | new | Luxuries you lend in a deal still count for you. | Economic | goods: capstone (rule-breaker) |
| **The Capitulations** | uncommon | new | Each foreign town holding your trading post lends you one of its luxuries that you lack, at half value. | Economic | goods: supply; bridge from the far trade |
| **The Money Lenders** | rare | implemented | Earn interest equal to 4% of your treasury each turn, with no cap. | Economic | bankers: capstone (interest with no cap) |
| **A Court of Merchants** | rare | implemented | Gain +50% renown, but great-person offers contain only Great Merchants. | Civic | bankers: supply (with a cost) |
| **The Bourse** | rare | implemented | Gold buildings produce 75% more of their own yields. | Economic | bankers: multiply |
| **The Strongroom** (commission) | uncommon | implemented; proposed: moved from Tier IV; proposed: revised (2,000 gold to 1,500); rarity was rare | Commission. Goal: end a turn with at least 1,500 gold in your treasury. Reward: culture equal to a fifth of your treasury at that moment, and a great merchant. The card then leaves its chair. | Wildcard | bankers: act |
| **The Customs Service** | uncommon | implemented | Trade routes leaving a city whose borders hold a customs house gain +3 gold and +3 culture. | Civic | bankers: bridge to the trade themes |

- **Safe Conduct** is the largest rule change in the pass. A caravan can still be plundered, and no new route may be sent to an enemy.
- **The Commenda:** each copy is still lent only once. The card stops a lent copy leaving your own count; it does not let you lend it twice.
- **If you want less engine work,** the pass would cut The Grain Barges, The Lingua Franca and The Capitulations first.

## Tier IV

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **Bought and Paid For** | rare | implemented; proposed: reworked (was "Buildings you bought with gold provide +1 production and +2 culture each, counting at most six per city.") | Each town gains +4% production and culture for each building you bought there with gold, at most +24%. | Civic | engine glue: bought buildings (a percentage) |
| **The Merchant Works** | rare | implemented | Cities building a world wonder, an empire building or the Opus gain production equal to 25% of their gold, and lose 20% of their gold. | Economic | engine glue: gold into great works |
| **The Great Loan** | rare | modify: as built (built as a commission: it pays at the end of the turn it is seated, if your gold income is above zero) | When you seat this card, gain gold equal to twenty turns of your gold income. For the next forty turns your cities lose 25% gold. The card then leaves its chair. | Wildcard | engine glue: spend now |
| **The Hired Garrison** | uncommon | implemented | A city with a world wonder or the Magnum Opus at the front of its queue may buy any number of military units with gold each turn. | Military | engine glue: the bought army |
| **The Grain Barges** | uncommon | new | Your domestic trade routes pay their destination +1 food and +1 production for every four citizens of their origin. | Economic | home market: widen (passive growth) |
| **The Trade Winds** | rare | implemented | Gain +3 trade route capacity. Your trade routes reach 50% farther. | Economic | home market: supply; far trade |
| **The World's Exchange** | rare | implemented | +10% production toward the Opus for each foreign empire your trade routes reach, at most +40%. | Economic | far trade: finisher (the Opus) |
| **The Neutral Flag** | uncommon | implemented | Your trade routes to an empire that is at war with another empire gain +100% gold and +50% science. | Economic | far trade: widen |
| **The World's Fair** (commission) | rare | implemented; proposed: reworked (was "Commission. Goal: have six trade routes running at the same time, foreign or domestic. Reward: +50% science and +50% culture in every city for ten turns. The card then leaves its chair.") | Commission. Have trade routes to four other empires at the same time. Then your trading post is established in the capital of each of them. The card leaves its chair. | Wildcard | far trade: act |
| **The Casa da Índia** | rare | new (10-17) | Every copy of a luxury you hold pays its yields, not only the first. | Economic | goods: finisher (doubler) |
| **Money at Work** | rare | implemented; proposed: reworked (was "Your capital gains +1 production for every 50 gold in your treasury, at most +40."; type was Economic) | Every town gains +1 science for every 500 gold in your treasury. | Civic | bankers: widen (the hoard pays science) |
| **Merchant Princes** | rare | implemented | Gold may purchase great-person drafts at the existing escalating offer price, with normal availability and purchase limits. | Civic | bankers: act |

- **The Casa da Índia:** the happiness of a luxury still counts once a kind (a reading, to confirm), so the meters do not run away.
- **The Merchant Works** touches the wonder split, which gives production toward wonders to Scientific and Magisterial. It stays as a conversion. If you want the split strict, drop "a world wonder" from its text.

## Shared with another deck

These rows live in `data/decks/common.json`, except The Waqf, The Silk Road Monks and The Brokers' Redraw, which this pass proposes to move there, and The Art Dealers, which has no row yet. A seat holding Commerce, or the deck named beside a card, may draw it, so a change here is felt in two decks. The types of the cards shared with Dominion, Expansionist and Scientific are in the data; the types of the cards shared with Devotion and Magisterial are proposals, to reconcile in those passes.

| Card | Also in | Tier | Rarity | Status | Ability | Type |
|---|---|---|---|---|---|---|
| **Market Gardens** | Expansionist | 0 | common | implemented; proposed: keep (the sheet's review recommended a cut; it serves the home market, and the Expansionist pass keeps it) | Farms beside a road gain +1 gold. Domestic routes grant an additional +1 food to their destination. | Economic |
| **The Escorted Roads** | Dominion | I | uncommon | implemented | Routes whose origin has a garrison gain +5 gold. Naval units gain +2 strength while adjacent to one of your traders. | Economic |
| **Pilgrim Markets** | Devotion | I | uncommon | implemented | Routes gain +3 gold and +3 faith if either endpoint contains a Holy Site. This pays once per route even when both endpoints qualify. | Civic (to reconcile) |
| **The Art Dealers** | Magisterial | I | common | add | Each card you draft grants 15 gold. | Economic (to reconcile) |
| **The Grain Exchange** | Expansionist | I | uncommon | implemented | Domestic routes from a city with a Granary give +5 food to their destination. Cities receiving one gain +1 happiness. | Economic |
| **The Exchange of Discoveries** | Scientific | I | uncommon | modify: revised (the data deals it at Tier III) | +2 science on mines and quarries on a resource. Additional +2 if the city has a market. | Civic |
| **Travelling Players** | Magisterial | II | uncommon | modify: revised (the data deals it at Tier 0, with the old text: +2 culture on foreign routes from a city with a Monument) | Foreign routes from a city with a Monument gain +1 culture; additional +2 culture for every unique deck type slotted in your government. | Civic (to reconcile) |
| **The Provincial Fair** | Expansionist | II | uncommon | implemented; proposed: keep (the sheet's review recommended a cut; it serves the home market, and the Expansionist pass keeps it) | Connected noncapital cities with a Market gain +3 food. Their worked plantations, camps and pastures gain +2 gold. | Economic |
| **The Tithe** | Devotion | II | rare | implemented | Cities with a Temple gain gold equal to 25% of their base faith, and +25% gold. | Economic (to reconcile) |
| **The Merchant Navigators** | Scientific | II | common | implemented | Ships gain +1 movement. Routes from a city with a Harbour and a Library gain +5 science. | Civic |
| **Books from the Ships** | Scientific | II | uncommon | implemented (built by Scientific batch S3, 2026-10-21) | Each foreign trade route you send gains +1 science for each technology the destination's owner knows that you do not, at most +4. | Civic |
| **The Waqf** | Devotion | II | common | implemented; proposed: moved from the exclusive cards to the shared cards, to confirm in the Devotion pass | Faith buildings you bought with gold provide +3 faith and +2 culture. | Civic (to reconcile) |
| **The Silk Road Monks** | Devotion | II | uncommon | modify: as built ("follows your religion" means a religion whose holy city you hold); proposed: moved from the exclusive cards to the shared cards, to confirm in the Devotion pass | Your trade routes carry 100% more religious pressure. Trade routes you send to a city that follows your religion gain +3 gold and +3 culture. | Civic (to reconcile) |
| **The Brokers' Redraw** | Magisterial | II | rare | modify: as built (the rule is live, but no button on screen offers the gold redraw yet); proposed: moved from the exclusive cards to the shared cards, to confirm in the Magisterial pass | You may reroll a draft with gold instead of faith. All other purchasing is 10% more expensive. | Wildcard (to reconcile) |
| **Merchant Scholars** | Scientific | III | uncommon | modify: revised (the data deals it at Tier I, with the old Library text); proposed: reworked (reads Academies, as the Scientific pass has it; was "+2 science for every great work improvement in the origin city") | Foreign routes gain +2 science for each Academy in the origin city. | Civic |
| **Letters of Marque** | Dominion | III | rare | implemented | Naval combat kills grant 60 gold. Cities with a Harbour gain +38% gold, but produce naval combat units 20% more slowly. | Economic |
| **Mercenary Contracts** | Dominion | III | uncommon | modify: deferred; proposed: reworked (was "Cities with a Barracks may hire the best melee or mounted unit you can build for half its gold price. A hired unit costs no upkeep and leaves after fifteen turns.") | Military units you buy cost no upkeep for twenty turns. | Military |
| **War Bonds** | Dominion | III | uncommon | implemented | Military units gain +1 strength for every 150 gold in your treasury, at most +5. | Military |
| **Professional Soldiers** | Dominion | III | uncommon | modify: as built (the +3 is given when a unit is bought while the card is held, and kept for life) | Units you purchase gain +3 combat strength. | Military |
| **The Chartered Company** (charter) | Dominion | III | uncommon | modify: as built (the Company Guard is strength 66, sold for a flat 1,600 gold, at column 11) | Once drafted, unlock the Company Guard, a unique gunpowder-age melee unit that can only be bought with gold, in cities with a Barracks. No chair required. | Military |
| **The Cosmopolitan Court** | Magisterial | III | rare | implemented | Cities with a culture building gain +1 renown per outgoing foreign route, at most +3 per city. Great-person improvements worked by such cities gain +3 gold. | Civic (to reconcile) |

## Cut by this pass

Every card the themes pass cuts, so you can restore one. The first four rows are sheet cards, with the sheet's text. The next two are deferred data rows the sheet does not list, with their data text. The last eight are cards the 2026-10-17 pass proposed and the themes pass did not take; they are marked (10-17), with that pass's text.

| Card | Tier | Ability (as on the sheet) | Why |
|---|---|---|---|
| **Coastal Estates** | 0 | Worked plantations and fishing boats gain +1 food and +1 gold. | Filler that pays the deck's own yield. Salt Tithes and The Merchant Shrines carry the luxury hexes, and Zheng He the coast. Its row is live: retire it. |
| **Patrons Abroad** | IV | Your city building the Magnum Opus gains +3 production for each foreign city holding your trading post. | The same job as The World's Exchange (production toward the Opus from the far trade), and you prefer late pay as a percentage. |
| **The Merchant Dynasties** | IV | Each customs house inside your borders gives its city +3 science and +3 culture, whether or not it is worked. | Merged into The Customs Houses, which now does this at Tier II: two cards paying the same customs houses. |
| **The Embargo** | IV | Rival empires with no trade route to or from you build the Magnum Opus 15% slower. | Deferred, and it acts on another empire's production. No theme home. |
| **The Consulate** (a deferred data row) | II | Cities holding your established commercial post purchase ordinary buildings and civilian units for 15% less gold, benefiting that city's owner. Each qualifying foreign host also grants you +2 culture while at peace and unblocked. Multiple foreign Consulates do not stack the discount. | A purchase discount, which ruling (qqqqqq) 1 retired. Retire the row. |
| **The Post Riders** (a deferred data row) | I | Your civilians and traders beginning a turn on a road you own gain +1 movement for that turn. Hiring and starting a route do not trigger another grant. | No theme home. A caravan is never asked for orders, so its movement changes no decision. Retire the row. |
| **The Paved Realm** (10-17) | II | +1% science and culture for every four hexes of road you have laid, at most +30%. | Expansionist's The Milestones already reads the roads Commerce's caravans lay. |
| **The Silver Towns** (10-17) | III | Towns working three or more mines gain +25% gold and +25% science. | Mining Districts holds the mines, and the card paid the deck's own yield. |
| **The Merchant Adventurers** (10-17) | III | Commission. Goal: hold monopolies on two luxuries at once. Reward: a great merchant, and +50% gold and culture for ten turns. The card then leaves its chair. | Corner the Market is the goods' commission. |
| **The Silver Fleet** (10-17) | IV | The town raising the Magnum Opus gains +5% production toward it for each luxury you hold two or more copies of. | The World's Exchange and The Merchant Works carry the Opus. |
| **The Book of Marvels** (10-17) | III | Each time one of your trade routes to another empire completes its term, gain 80 science and 80 culture. | The Fondaci takes the trade moment, on the post rather than on the term. |
| **The Marble Towns** (10-17) | III | Each town gains +5% science and culture for every building bought there with gold, at most +30%. | Bought and Paid For takes the percentage on bought buildings. |
| **The Bank of Saint George** (10-17) | III | Every town gains +1 science for every 500 gold in your treasury. | Money at Work takes it at Tier IV. |
| **The Fondaci, old text** (10-17) | III | Gain +5 science and +5 culture for each foreign city holding your trading post. | The Foreign Factor does this job and grows with the towns. The name moves to the post moment. |
