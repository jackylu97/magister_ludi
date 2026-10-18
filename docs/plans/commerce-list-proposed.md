# The Commerce deck: review list (proposed)

This is a review list, made 2026-10-18. It puts every Commerce card in one place, by tier. It joins two files:
- the deck sheet, `docs/decks/commerce.md`, which is the spec of record and is unchanged;
- the builds pass of 2026-10-17, `docs/plans/commerce-builds.md`, whose new cards, moves and changes are folded in here.

This file is not the spec of record. Where it differs from the sheet, the difference is a proposal from the builds pass, and the Status column says so.

- **Status:**
  - `implemented`: in the data, dealt, and the sheet's text is what the game does.
  - `modify`: in the data, but not as the sheet writes it. The word after the colon says why: `revised` (the sheet changed the card and the data has not caught up), `deferred` (not dealt, because it needs a new shape), or `as built` (the game does something slightly different from the text).
  - `add`: on the sheet, not in the data.
  - `new`: proposed by the builds pass, not on the sheet.
  - `proposed: …` names a change the builds pass proposes: `moved from Tier X`, `rarity was Y`, `reworked` (the card's text changes), or `revised` (a number changes). The row already shows the proposed tier, rarity and text.
- **Type:** the chair the card fits, as the builds pass's type sort gives it (Military, Economic, Civic or Wildcard). The Commerce rows in the data carry no type yet, so every type here is a proposal.
- **Build:** the build or builds the pass seats the card in. The pass has five builds in three families: the goods build; the trade core with its home market and far trade flavours; the treasury core with its patrons and bankers flavours. The great merchants are a splash any build can seat. "alternative" means the pass lists the card as an alternative for that build, and "glue" means the pass names it as glue.
- **Cards the sheet cut** are not listed. The sheet's Proposed cuts table holds 37 cards. 23 of them had data rows, and those rows were retired on 2026-10-12 (kept for saves, dealt by nobody). The builds pass does not ask to bring any of them back. Five more data rows are not on the sheet and are out of every pool: the pass recommends retiring The Consulate (a purchase discount, which ruling (qqqqqq) 1 retired), leaving The Treaty Ports, The Post Riders and Export Guilds as they are, and reworking The Return Leg into a Tier III card (listed below).
- **Doctrines:** Commerce has none yet. The pass plans them after the sheet pass, one direction for each build.

| Tier | Implemented | Modify | Add | New | All | With a proposed change |
|---|---|---|---|---|---|---|
| Tier 0 | 10 | 0 | 0 | 0 | 10 | 0 |
| Tier I | 15 | 1 | 0 | 2 | 18 | 3 |
| Tier II | 14 | 4 | 0 | 3 | 21 | 1 |
| Tier III | 11 | 1 | 0 | 10 | 22 | 2 |
| Tier IV | 11 | 2 | 0 | 1 | 14 | 1 |
| **All** | **61** | **8** | **0** | **16** | **85** | **7** |
| Shared | 10 | 6 | 2 | 0 | 18 | 2 |

**By type** (the chair a card fits):

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| Tier 0 | 1 | 5 | 4 | 0 |
| Tier I | 1 | 13 | 4 | 0 |
| Tier II | 2 | 7 | 10 | 2 |
| Tier III | 0 | 10 | 9 | 3 |
| Tier IV | 1 | 8 | 3 | 2 |
| **All** | **5** | **43** | **30** | **7** |
| Shared | 4 | 7 | 7 | 0 |

## Tier 0

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Mineral Trade** | common | implemented | Worked mines and quarries gain +2 gold but lose 1 production. | Economic | goods |
| **Salt Tithes** | common | implemented | Gain +3 gold per distinct accessible improved luxury you produce. Worked luxury tiles gain +1 food. | Economic | goods |
| **Travellers' Letters** | common | implemented | Your capital gains +2 science and +2 culture, plus +1 of each per foreign empire met, no cap. | Civic | far trade |
| **The Pathfinders' Company** | uncommon | implemented | Scouts gain +1 sight and +1 movement. | Military | far trade |
| **Coastal Estates** | common | implemented | Worked plantations and fishing boats gain +1 food and +1 gold. | Economic | goods (alternative); glue |
| **Land Speculation** | uncommon | implemented | Your cities gain +25% gold. Your capital loses 2 happiness. | Economic | treasury core; bankers (alternative); glue |
| **The Map Sellers** | common | implemented | Your capital gains +1 gold and +1 culture for every 40 hexes you have revealed, at most +8 of each. | Civic | far trade (alternative) |
| **The Merchant Shrines** | common | implemented | Your capital gains +2 faith. Cities working an improved luxury gain +1 faith, once per city. | Civic | goods (utility); glue |
| **The Assayer's Rule** | uncommon | implemented | Worked resource tiles that supply gold gain +1 gold. | Economic | goods (alternative); glue |
| **The Nest Egg** | common | implemented | Your capital gains +1 culture for every 50 gold in your treasury, at most +4. | Civic | bankers |

## Tier I

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **Commercial Education** | common | implemented | Gold buildings provide +3 science. | Civic | treasury core |
| **Ore Caravans** | common | implemented | Trade routes gain +1 gold for every mine in their origin city. | Economic | goods; trade core (flex) |
| **Civic Receipts** | uncommon | implemented | Buying any building grants culture equal to 15% of the gold paid, with no cap. | Civic | patrons |
| **Provisioning Contracts** | common | implemented | Domestic routes grant their destination +3 food and +3 production. | Economic | home market |
| **The Common Road** | common | implemented | Your foreign routes grant you +3 gold, +3 science and +3 culture. Each also grants its host city +3 gold. | Civic | far trade |
| **Venture Routes** | uncommon | implemented | Your trade routes gain two turns of range. Trade routes between cities at least fifteen hexes apart gain +100% gold. | Economic | far trade (alternative) |
| **The Factors' Houses** | common | implemented | Your cities holding your trading post gain +2 gold and +4 culture, and +25% gold. | Economic | trade core |
| **Bought Swords** | uncommon | implemented; proposed: reworked (was: "Your cities gain +38% gold. Military units take 10% more production to train. Purchased units count as trained."); type was Economic | Your towns may buy two military units a turn instead of one. Military units take 10% more production to train. | Military | bankers (glue) |
| **Established Routes** | uncommon | implemented; proposed: revised (thirty turns to twenty) | A trade route you have kept up for at least twenty turns pays 50% more. A route that lapses, is cancelled or is plundered begins its term again. | Economic | trade core |
| **Private Patronage** | rare | implemented | Your cities gain +38% gold. Producing ordinary buildings normally takes 20% more production. Empire buildings and wonders are unaffected. | Economic | patrons |
| **Frontier Investment** | uncommon | implemented | In your cities of 5 population or fewer, domestic trade routes pay double, and those cities gain +25% gold. | Economic | home market |
| **Financed Industry** | rare | implemented | Cities gain production equal to 30% of their gold yield. Every city loses 3 food. | Economic | goods; patrons |
| **The Staple Right** | common | implemented | Gain +3 gold and +2 culture for each luxury you hold two or more copies of. | Economic | goods |
| **The Planters' Charter** *(charter)* | uncommon | modify: as built (the Plantation House is a placeholder: +1 gold, and +1 food and +1 gold on each plantation its city works) | Once drafted, unlock the Plantation House for construction. No chair required. The building is purchased with gold; its payload is specified below. | Economic | goods (alternative) |
| **The Market Writ** | uncommon | implemented | +1 authority for every two Markets in your empire. Your cities gain +38% gold. | Economic | treasury core |
| **The Carters' Guild** | common | implemented; proposed: moved from Tier 0 | Your cities connected to your capital by road, other than the capital, gain +1 food and +2 gold. | Economic | home market |
| **The Homeward Cargoes** | common | new | Each town gains +4 production for every trade route to another empire that sets out from it. | Economic | far trade |
| **The Strongbox** | uncommon | new | While seated, this card gains +1 science and +1 culture each turn you end with at least 300 gold in your treasury, up to +15 of each. | Civic | bankers |

## Tier II

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **Strategic Exports** | uncommon | implemented | Trade routes gain +2 science per improved strategic resource deposit in their origin city. Your strategic resource deposits provide twice their normal quantity. | Civic | goods (alternative) |
| **Mining Districts** | uncommon | implemented | Worked mines gain +2 gold and +2 science for every two adjacent mines. | Civic | goods |
| **Royal Assays** | uncommon | implemented | Each improved luxury resource deposit with a mine provides one additional copy of that luxury. | Economic | goods |
| **The Home Market** | common | implemented | Cities receiving at least two of your domestic routes gain +30% food, +30% production and +2 happiness, once per city. | Economic | home market |
| **The Foreign Factor** | common | implemented | Each foreign city holding your trading post grants you +5 gold and its host city +2 gold per turn while you are at peace and the host is not blockaded. | Economic | far trade (alternative) |
| **The League of Cities** | rare | implemented | Cities with one of your paying outgoing routes gain +23% production and cost one less authority, minimum one. Cities without one lose 10% gold. | Economic | home market (alternative) |
| **Foreign Procurement** | uncommon | implemented | Ignore strategic resource requirements when purchasing units. All units cost 20% more. | Military | bankers; patrons (utility) |
| **The Brokers' Redraw** | rare | modify: as built (the rule is live, but no button on screen offers the gold redraw yet) | You may reroll a draft with gold instead of faith. All other purchasing is 10% more expensive. | Wildcard | patrons (alternative) |
| **The Scholars' Roads** | rare | implemented | Lose 4 route capacity. Your routes gain +2 science and +2 culture, and gain +50% science and culture. | Civic | far trade (alternative) |
| **The Customs Houses** | uncommon | implemented | Customs houses gain +5 gold and +1 renown. Cities with a customs house gain +38% gold. | Economic | merchants (splash); patrons (alternative) |
| **The Waqf** | common | implemented | Faith buildings you bought with gold provide +3 faith and +2 culture. | Civic | patrons |
| **The Silk Road Monks** | uncommon | modify: as built ("follows your religion" means a religion whose holy city you hold) | Your trade routes carry 100% more religious pressure. Trade routes you send to a city that follows your religion gain +3 gold and +3 culture. | Civic | far trade (alternative); trade core (flex) |
| **Corner the Market** *(commission)* | uncommon | implemented | Commission. Goal: control four copies of one luxury, counting copies you receive in deals. Reward: a great merchant and 225 gold. The card then leaves its chair. | Wildcard | goods (alternative); merchants (splash) |
| **The Caravanserai Network** | common | implemented | Each city receiving a domestic trade route grants +2 happiness (once per city); +2 production and +2 gold on domestic trade routes. | Economic | home market (alternative) |
| **The Exchange** | uncommon | modify: as built (the second sentence pays your own foreign routes and the cities they reach, not routes sent to you) | Each different foreign empire your routes currently serve grants +5% science and culture empire-wide. Foreign routes to your cities grant +2 science and +2 culture to both you and the sender. | Civic | far trade |
| **Numidian Cavalry** *(charter)* | uncommon | modify: as built (every luxury counts in full; the half value for Silk Road luxuries is not built) | Once drafted, unlock Numidian Cavalry, a Horseman replacement. No chair required. Gains +1 combat strength per distinct luxury you control; luxuries obtained only through the Silk Road contribute +0.5 instead. Normal technology requirements apply. | Military | goods (alternative) |
| **Houses of Account** | common | implemented | Gold buildings provide +2 happiness and +1 renown. | Civic | merchants (splash); treasury core (alternative) |
| **The Spice Exchange** | rare | implemented; proposed: moved from Tier IV | Every city gains +5% science and +5% culture for each luxury you hold two or more copies of, at most +30%. | Civic | goods |
| **The Paved Realm** | uncommon | new | +1% science and culture for every four hexes of road you have laid, at most +30%. | Civic | home market |
| **The Benefactors' Roll** | uncommon | new | +1% science and culture for every 200 gold you have spent buying this game, at most +30%. | Civic | patrons |
| **Bills of Exchange** | uncommon | new | Every town gains +1% production for every 100 gold in your treasury, at most +30%. | Economic | bankers |

## Tier III

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **Caravanserai Cities** | uncommon | implemented | Caravanserais can be built in every city. Cities with a Caravanserai gain +30% gold. | Economic | trade core |
| **A Court of Merchants** | rare | implemented | Gain +50% renown, but great-person offers contain only Great Merchants. | Civic | merchants (splash); goods (alternative) |
| **The Money Lenders** | rare | implemented | Earn interest equal to 4% of your treasury each turn, with no cap. | Economic | bankers |
| **The Chartered Metropolis** | rare | implemented | Cities with at least three of your paying outgoing routes gain +38% food, production and culture, but each costs +4 authority while qualified. | Economic | home market |
| **The Admiralty of Trade** | rare | implemented | A sea trade route between two cities that both hold your trading post has no range limit. | Economic | far trade |
| **The Gilded Scaffold** | rare | implemented | You may purchase world wonders. All your cities lose 15% production. | Economic | patrons |
| **The Endowment** | uncommon | implemented | Purchased buildings provide +2 science each, at most +6 per town. | Civic | patrons |
| **A Guild Commission** *(commission)* | uncommon | implemented | Commission. Goal: buy five buildings with gold while seated. Reward: a free great-person draft, the same offer Merchant Princes sells for gold. The card then leaves its chair. | Wildcard | patrons |
| **The Monopoly** | rare | modify: as built (the happiness is +1 for the empire, not +1 in every city) | For each luxury you hold three or more copies of and no other empire holds, gain +8 gold, +5 culture and +1 happiness in every city. | Economic | goods |
| **The Customs Service** | uncommon | implemented | Trade routes leaving a city whose borders hold a customs house gain +3 gold and +3 culture. | Civic | goods; home market; merchants (splash) |
| **The Bourse** | rare | implemented | Gold buildings produce 75% more of their own yields. | Economic | treasury core |
| **The Strongroom** *(commission)* | rare | implemented; proposed: moved from Tier IV | Commission. Goal: end a turn with at least 2,000 gold in your treasury. Reward: culture equal to a fifth of your treasury at that moment, and a great merchant. The card then leaves its chair. | Wildcard | bankers; merchants (splash) |
| **The Return Leg** | rare | new (a deferred data row the sheet does not list); proposed: reworked (was: the origin is paid a third of the food, production and gold), moved from Tier I, rarity was uncommon | Your trade routes between your own cities also pay their origin everything they pay their destination. | Economic | home market |
| **The Casa da Índia** | rare | new | Every copy of a luxury you hold pays as the first copy does. | Economic | goods |
| **The Silver Towns** | uncommon | new | Towns working three or more mines gain +25% gold and +25% science. | Civic | goods |
| **The Merchant Adventurers** *(commission)* | uncommon | new | Commission. Goal: hold monopolies on two luxuries at once. Reward: a great merchant, and +50% gold and culture for ten turns. The card then leaves its chair. | Wildcard | goods |
| **The Champagne Fairs** | uncommon | new | Every ten turns, gain culture equal to forty times the number of trade routes between your own cities. | Civic | home market |
| **Safe Conduct** | rare | new | War does not end your trade routes or stop your trading posts paying. | Economic | far trade |
| **The Fondaci** | uncommon | new | Gain +5 science and +5 culture for each foreign city holding your trading post. | Civic | far trade |
| **The Book of Marvels** | uncommon | new | Each time one of your trade routes to another empire completes its term, gain 80 science and 80 culture. | Civic | far trade |
| **The Marble Towns** | uncommon | new | Each town gains +5% science and culture for every building bought there with gold, at most +30%. | Civic | patrons |
| **The Bank of Saint George** | uncommon | new | Every town gains +1 science for every 500 gold in your treasury. | Civic | bankers |

- **Safe Conduct** is the largest rule change in the pass. If the user would rather not touch war, the pass offers this text instead: "Your trade routes to other empires pay double science and culture."
- **If the user wants less engine work,** the pass would cut Safe Conduct first, and then have The Strongbox read the treasury plainly.

## Tier IV

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **Merchant Princes** | rare | implemented | Gold may purchase great-person drafts at the existing escalating offer price, with normal availability and purchase limits. | Civic | treasury core; merchants (splash) |
| **The World's Exchange** | rare | implemented | +10% production toward the Opus for each foreign empire your trade routes reach, at most +40%. | Economic | far trade |
| **The Merchant Works** | rare | implemented | Cities building a world wonder, an empire building or the Opus gain production equal to 25% of their gold, and lose 20% of their gold. | Economic | goods; home market; patrons |
| **Patrons Abroad** | rare | implemented | Your city building the Magnum Opus gains +3 production for each foreign city holding your trading post. | Economic | far trade |
| **The Merchant Dynasties** | uncommon | implemented | Each customs house inside your borders gives its city +3 science and +3 culture, whether or not it is worked. | Civic | goods; merchants (splash) |
| **Money at Work** | rare | implemented | Your capital gains +1 production for every 50 gold in your treasury, at most +40. | Economic | bankers |
| **Bought and Paid For** | rare | implemented | Buildings you bought with gold provide +1 production and +2 culture each, counting at most six per city. | Civic | patrons |
| **The Embargo** | rare | modify: deferred (needs a card that slows another empire's production, and a test of whether two empires trade) | Rival empires with no trade route to or from you build the Magnum Opus 15% slower. | Economic |  |
| **The Hired Garrison** | uncommon | implemented | A city with a world wonder or the Magnum Opus at the front of its queue may buy any number of military units with gold each turn. | Military | bankers |
| **The Neutral Flag** | uncommon | implemented | Your trade routes to an empire that is at war with another empire gain +100% gold and +50% science. | Economic |  |
| **The World's Fair** *(commission)* | rare | implemented; proposed: revised (six routes to twelve) | Commission. Goal: have twelve trade routes running at the same time, foreign or domestic. Reward: +50% science and +50% culture in every city for ten turns. The card then leaves its chair. | Wildcard | trade core |
| **The Great Loan** *(commission)* | rare | modify: as built (built as a commission: it pays at the end of the turn it is seated, if your gold income is above zero) | When you seat this card, gain gold equal to twenty turns of your gold income. For the next forty turns your cities lose 25% gold. The card then leaves its chair. | Wildcard | bankers |
| **The Trade Winds** | rare | implemented | Gain +3 trade route capacity. Your trade routes reach 50% farther. | Economic | trade core |
| **The Silver Fleet** | rare | new | The town raising the Magnum Opus gains +5% production toward it for each luxury you hold two or more copies of. | Economic | goods |

## Shared with another deck

These rows live in `data/decks/common.json`. A seat holding Commerce or the deck named beside each one may draw it, so a change here is felt in two decks. The builds pass adds no shared card. Its types for the cards shared with Scientific, Magisterial and Devotion are proposals still to reconcile with those decks.

| Card | Also in | Tier | Rarity | Status | Ability | Type |
|---|---|---|---|---|---|---|
| **Market Gardens** | Expansionist | 0 | common | implemented; proposed: keep (the sheet's review recommended a cut; the pass seats it as a home market alternative) | Farms beside a road gain +1 gold. Domestic routes grant an additional +1 food to their destination. | Economic |
| **The Escorted Roads** | Dominion | I | uncommon | implemented | Routes whose origin has a garrison gain +5 gold. Naval units gain +2 strength while adjacent to one of your traders. | Economic |
| **Pilgrim Markets** | Devotion | I | uncommon | implemented | Routes gain +3 gold and +3 faith if either endpoint contains a Holy Site. This pays once per route even when both endpoints qualify. | Civic |
| **The Art Dealers** | Magisterial | I | common | add | Each card you draft grants 15 gold. | Economic |
| **The Grain Exchange** | Expansionist | I | uncommon | implemented | Domestic routes from a city with a Granary give +5 food to their destination. Cities receiving one gain +1 happiness. | Economic |
| **The Exchange of Discoveries** | Scientific | I | uncommon | modify: revised (the data deals it at Tier III) | +2 science on mines and quarries on a resource. Additional +2 if the city has a market. | Civic |
| **Travelling Players** | Magisterial | II | uncommon | modify: revised (the data deals it at Tier 0, with the old text: +2 culture on foreign routes from a city with a Monument) | Foreign routes from a city with a Monument gain +1 culture; additional +2 culture for every unique deck type slotted in your government. | Civic |
| **The Provincial Fair** | Expansionist | II | uncommon | implemented; proposed: keep (the sheet's review recommended a cut; the pass seats it as a home market alternative) | Connected noncapital cities with a Market gain +3 food. Their worked plantations, camps and pastures gain +2 gold. | Economic |
| **The Tithe** | Devotion | II | rare | implemented | Cities with a Temple gain gold equal to 25% of their base faith, and +25% gold. | Economic |
| **The Merchant Navigators** | Scientific | II | common | implemented | Ships gain +1 movement. Routes from a city with a Harbour and a Library gain +5 science. | Civic |
| **Books from the Ships** | Scientific | II | uncommon | add | Each foreign trade route you send gains +1 science for each technology the destination's owner knows that you do not, at most +4. | Civic |
| **Merchant Scholars** | Scientific | III | uncommon | modify: revised (the data deals it at Tier I, with the old Library text); the pass recommends this text over Scientific's narrowing to Academies | Foreign routes gain +2 science for every great work improvement in the origin city. | Civic |
| **Letters of Marque** | Dominion | III | rare | implemented | Naval combat kills grant 60 gold. Cities with a Harbour gain +38% gold, but produce naval combat units 20% more slowly. | Economic |
| **Mercenary Contracts** | Dominion | III | uncommon | modify: deferred (a hired unit that leaves after a set number of turns is a new kind of unit) | Cities with a Barracks may hire the best melee or mounted unit you can build for half its gold price. A hired unit costs no upkeep and leaves after fifteen turns. | Military |
| **War Bonds** | Dominion | III | uncommon | implemented | Military units gain +1 strength for every 150 gold in your treasury, at most +5. | Military |
| **Professional Soldiers** | Dominion | III | uncommon | modify: as built (the +3 is given when a unit is bought while the card is held, and kept for life) | Units you purchase gain +3 combat strength. | Military |
| **The Chartered Company** *(charter)* | Dominion | III | uncommon | modify: as built (the Company Guard is strength 66, sold for a flat 1,600 gold, at column 11) | Once drafted, unlock the Company Guard, a unique gunpowder-age melee unit that can only be bought with gold, in cities with a Barracks. No chair required. | Military |
| **The Cosmopolitan Court** | Magisterial | III | rare | implemented | Cities with a culture building gain +1 renown per outgoing foreign route, at most +3 per city. Great-person improvements worked by such cities gain +3 gold. | Civic |
