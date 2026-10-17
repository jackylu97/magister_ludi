# Commerce: the goods, trade and treasury builds (proposal)

The user's request, 2026-10-17, verbatim:

> *"could you do the same builds/card-design skill treatment for the remaining decks? commerce science magisterial and devotion"*

**Status:** first draft, 2026-10-17. Nothing here is built, and the deck sheet (`docs/decks/commerce.md`) is unchanged. Once the user rules, the builds go into the skill's deck map (`.claude/skills/card-design/references/deck-maps.md`), and the new cards and the Type column go onto the sheet.

This file is the card-design skill's stages 1, 2 and 7 for Commerce: the deck's map, its finished builds, and the card types. The sheet pass comes after the user's review.

## What this draft takes from the two earlier passes

- **From Dominion** (approved 2026-10-15, `docs/plans/dominion-builds.md`): one loop per build on a quantity the playstyle makes by itself; an early and a late version; an early scaler that carries over; a Tier III capstone that breaks a rule (the user: *"these are great, if anything, we need more cards like this"*); a moment; science, culture and production from the build's own quantity.
- **From Expansionist** (approved 2026-10-16, `docs/plans/expansionist-builds.md`): core cards plus flavours, and cards that let a seat flex between two flavours. New mechanics that reuse systems the game already has (the user liked tiles raised by workers and workable mountains), and nothing that is hard to build or needs a new button (the user removed burning: *"feels difficult to implement"*).
- **So this draft:**
  - uses flavours where Commerce has two directions on one quantity: trade routes at home and abroad, and gold spent and gold kept;
  - gives every build a capstone at Tier III, and four of the five break or double a rule;
  - adds six new shapes, each on a mechanic the game already has, and none needs a new button, menu or choice.

## How to read this

- **Chairs and tiers,** since the rung fix of 2026-10-17 (`docs/plans/draft-pacing-2026-10-17.md`):
  - 3 chairs at the start (the Chiefdom: 1 Military, 1 Economic, 1 Wildcard);
  - 5 from draft 4, when Tier I opens (it also needs research age 2);
  - still 5 from draft 10, when Tier II opens (age 3);
  - 8 from draft 18, when Tier III opens (age 4);
  - 11 from draft 26, when Tier IV opens (age 4).
  - In bot games after the fix, the medians are: first Tier I hand on turn 56, first Tier II hand on turn 88, draft 18 on turn 133, first Tier III hand on turn 151. Tier IV at 26 drafts is not measured yet.
- **Early build:** five chairs of Tier 0 to II cards. Each build shows its council at Tier I (about turns 56 to 88) and its **five-chair core**, the council at the end of Tier II (about turns 88 to 133).
- **Late build:** the eight chairs at Tier III and the eleven at Tier IV. They hold Tier III and IV cards and the early cards that grew.
- **Families and flavours.** The trade build and the treasury build each have core cards that every flavour seats, and two flavours with cards of their own. The goods build stands alone. The great merchants are a splash that any build can seat.
- **Typed chairs** are built (batches C2a and C2b). Commerce is not sorted yet, so today its cards fit any chair; the councils below assume the types proposed here. Every council names the government that seats it. When a council has no card for a Military chair, the chair goes to the partner deck, and the text says so.
- **Status:** *live* (in the game; *built as* when the game does something slightly different from the text), *deferred* (in the data, not dealt), *shared* (the row is in `data/decks/common.json`), **new** (this pass), **reworked** (this pass changes an existing row), **moved** (this pass moves the card to another tier).
- **Shape:** *existing* names the effect kind that already says it. *New shape* says what is missing. The six new shapes are listed under "Across the builds".
- **Type:** Military, Economic, Civic or Wildcard, by `docs/plans/doctrines-governments-chairs.md` §4. New cards are typed in their tables, and the sheet's cards in "The sort".
- **Numbers are first guesses** against `.claude/skills/card-design/references/power-bar.md`. The user's priority is shape.

## Six facts that shape every build

1. **Trade starts with Tier I.** Currency, an age-2 technology, opens the trader and the Market. So no trade route runs before age 2, which is also when Tier I opens. Tier 0 (about six drafts) holds the goods, exploration, gold and reserve openers, and the trade builds start at Tier I.
2. **Posts and old routes pay late.** A trading post counts only after your routes have touched the town for a full term of twenty turns (`cityHoldsPost`), and Established Routes asks for thirty. So The Factors' Houses and The Foreign Factor start to pay about twenty turns after the first caravans.
3. **Capstones sit in Tier III.** The eight chairs usually come before the Tier III cards do (draft 18 at about turn 133, age 4 at about turn 146). A median bot seat was dealt three Tier III hands (0 to 11). So a late council in practice holds more early cards than the tables show, and each capstone must work without Tier IV.
4. **The gap is production, and gold is expensive.** A purchase costs 4 gold for each hammer, since the user's playtest of 2026-09-03: *"gold is way too strong. Gold costs need to be 2x across the board."* Gold can also be poured into the Magnum Opus. Each build reaches production through its own quantity: routes carry it, caravans bring it home, and gold converts to it or buys it.
5. **No discounts.** Ruling (qqqqqq) 1 turned every purchase discount into +25% (or +38%) gold. A card that helps buying adds gold or pays on a purchase; it never lowers a price. This pass proposes no discount.
6. **The route cards are already strong.** In the bot games of 2026-10-13, six Commerce route cards were among the fifteen best earners: The Exchange (275 a turn), The Scholars' Roads (206), Venture Routes (199), The Factors' Houses (195), Ore Caravans (121) and The Silk Road Monks (115). Established Routes (the bots never renew a route) and the shared The Tithe paid nothing. So the trade side needs shape (moments, scalers and capstones), not power. Only six of the thirty measured seats held Commerce, so the goods and treasury cards are barely measured.

## The builds at a glance

| Build | The loop | The moment | Early scaler | Tier III capstone | Tier IV |
|---|---|---|---|---|---|
| **Goods: the mines and the monopoly** | work the deposits → each pays gold, and a mined deposit gives an extra copy → copies become monopolies that pay culture and science → the gold buys the next deposit's hex | a monopoly; four copies of one good (Corner the Market) | The Spice Exchange (moved to Tier II) | The Casa da Índia: every copy counts | The Silver Fleet |
| **Trade: the home market** | send caravans between your towns → they carry food and production and pave roads → the towns grow, and every eight citizens in a Market town open another route → send more | the fair (The Champagne Fairs) | The Paved Realm | The Return Leg: both towns are paid | The Trade Winds, The World's Fair |
| **Trade: the far trade** | meet empires → send caravans abroad → they bring science and culture home, every town they reach adds range, and a route kept a full term leaves a post that pays → reach the next partner | a caravan home from abroad (The Book of Marvels) | The Exchange | Safe Conduct: war does not end your trade | Patrons Abroad, The World's Exchange |
| **Treasury: the patrons** | earn gold → buy buildings instead of building them → every bought roof pays science and culture, and bought Markets make more gold → buy more | a purchase (Civic Receipts); a wonder bought | The Benefactors' Roll | The Gilded Scaffold: gold buys wonders | Bought and Paid For, The Merchant Works |
| **Treasury: the bankers** | keep gold → the hoard pays science, culture and production, and earns interest → the hoard grows → spend it at once on the deciding army, wonder or great person | the hoard at 2,000 gold (The Strongroom) | The Strongbox, Bills of Exchange | The Money Lenders: interest with no cap | Money at Work, The Great Loan |

The trade core (The Factors' Houses, Established Routes, Caravanserai Cities, The Trade Winds, The World's Fair) sits in both trade councils. The treasury core (Commercial Education, The Market Writ, The Bourse, Merchant Princes) sits in both treasury councils.

---

## The map

### The deck's materials

"Self-producing" means a Commerce game makes it whether or not a card asks. These are the best anchors.

| Material | Self-producing? | Where it lives in the sim | On the sheet today |
|---|---|---|---|
| **Gold and the treasury** | Yes | count `bankedGold`; the Market pays +2 gold and the Bank +20% gold where a route ends; 4 gold buys a hammer | The Nest Egg, The Money Lenders, Money at Work, The Strongroom; the shared War Bonds |
| **Purchases** | Yes: this is how the deck spends | `purchaseItem`; the `purchase` and `tilePurchase` occasions; the `goldSpent` and `buildingBoughtWithGold` tallies; the records `Player.goldSpent` and `City.buildingBanks` (count `purchasedBuildings`, by bank) | Civic Receipts, Private Patronage, The Waqf, The Endowment, A Guild Commission, The Gilded Scaffold, Bought and Paid For, Merchant Princes |
| **Trade routes** | Yes, from age 2 | `Unit.trade` is the route; slots from Markets (one, and one more for every eight citizens), Harbours and the Caravanserai; counts `tradeRoutes`, `foreignTradeRoutes` (also per town), `internalTradeRoutes`, `tradePartnerEmpires`, `routeLength`; scope `routeEndsHere` | about twenty cards |
| **Trading posts** | Yes: a route that touches a town for a full term leaves a post there, at both ends, for good | `City.posts`; scope `holdsPost`; count `postCities` (foreign posts that pay). Separately, any town a route has ever touched gives later routes three more turns of range (`City.tradingPost`, set when a route starts) | The Factors' Houses, The Foreign Factor, The Admiralty of Trade, Patrons Abroad |
| **Roads and connected towns** | Yes, as land caravans pave their paths | `Tile.road`, written by `layRoad` for land caravans and Expansionist's founding road only; scope `connected`; count `roadHexes` | The Carters' Guild; the shared Market Gardens and The Provincial Fair |
| **Gold buildings** | Yes, but one of each a town | category `gold`: Market (age 2), Caravanserai (age 3, one an empire), Bank and Bazaar (age 4), Bourse (age 4, one an empire) | Commercial Education, Houses of Account, The Bourse, The Market Writ |
| **Mines, quarries, plantations, fishing boats** | From the map | the improvements; scope `workingImprovement`, with `atLeast` | The Mineral Trade, Coastal Estates, The Assayer's Rule, Mining Districts, Ore Caravans |
| **Luxury copies and monopolies** | From the map, and from deals | counts `uniqueLuxuries`, `luxuryCopies`, `duplicateLuxuries`, `monopolyLuxuries`; `resourceEffects.ts` (`perCopy`, which silver and gold have from age 3) | Salt Tithes, The Staple Right, Royal Assays, Corner the Market, The Monopoly, The Spice Exchange |
| **Strategic resources** | From the map | copies; count `improvedStrategicResources` | Strategic Exports, Foreign Procurement |
| **Exploration and contacts** | Yes, early | counts `revealedTiles`, `empiresMet` (permanent), `sightedCities` | Travellers' Letters, The Map Sellers, The Pathfinders' Company |
| **Great merchants and customs houses** | Yes: every Market and Harbour pays merchant renown | a merchant's act pays 60 gold × the age; its work, the Customs House, pays +3 gold | Houses of Account, The Customs Houses, A Court of Merchants, The Customs Service, The Merchant Dynasties, Merchant Princes |
| **The sea** | From the map | a sea route pays +50% and lays no road; a Harbour gives a slot | Coastal Estates, The Admiralty of Trade; the shared The Merchant Navigators and Letters of Marque |
| **The Magnum Opus** | In age 4 | the Opus takes gold poured into its production | The World's Exchange, The Merchant Works, Patrons Abroad, The Hired Garrison |

**Moments.** A card can pay on a purchase (`purchase`, `tilePurchase`), on gold spent or a building bought while it is seated (the tallies), on a great person's act, and on a calendar (`periodic`). No trade moment exists: a route that starts, arrives, renews or lapses announces nothing, and a post ripens by a date comparison, not an event.

**Records that only grow.** Three quantities Commerce makes only grow: gold spent (`Player.goldSpent`), road hexes laid (`roadHexes`) and buildings bought (`purchasedBuildings`, which falls only when a town is lost; a captured town keeps its record). Empires met is a fourth. They are "this game" counts that need no new record, and no card on the sheet uses the first two to scale.

### Three families, five builds

| Build | Leans on | Science from | Culture from | Production from |
|---|---|---|---|---|
| **Goods** | deposits worked, luxury copies, monopolies | mine clusters (Mining Districts); copies (The Spice Exchange); mining towns (The Silver Towns) | copies (The Staple Right, The Spice Exchange); monopolies (The Monopoly) | gold converted (Financed Industry); copies toward the Opus (The Silver Fleet) |
| **Trade: the core** | routes, their age, posts | the flavour's | posts (The Factors' Houses) | the flavour's |
| **Trade: the home market** | domestic routes, roads, market towns | roads laid (The Paved Realm) | roads laid; hub towns (The Chartered Metropolis); the fair (The Champagne Fairs) | routes (Provisioning Contracts, The Caravanserai Network); market towns (The Home Market, The Chartered Metropolis); the home town paid too (The Return Leg) |
| **Trade: the far trade** | foreign routes, partners, posts abroad | foreign routes (The Common Road, The Exchange); posts abroad (The Fondaci); caravans home (The Book of Marvels); empires met (Travellers' Letters) | the same cards | cargoes home (The Homeward Cargoes); posts abroad toward the Opus (Patrons Abroad) |
| **Treasury: the core** | gold buildings | gold buildings (Commercial Education) | the flavour's | the flavour's |
| **Treasury: the patrons** | buildings bought, gold spent | bought roofs (The Endowment, The Marble Towns); gold spent (The Benefactors' Roll) | purchases (Civic Receipts); bought roofs (Bought and Paid For, The Marble Towns); gold spent | gold converted (Financed Industry); bought roofs (Bought and Paid For) |
| **Treasury: the bankers** | gold kept | turns kept (The Strongbox); the hoard (The Bank of Saint George) | turns kept (The Strongbox); the hoard (The Nest Egg, The Strongroom) | the hoard (Bills of Exchange, Money at Work) |
| **The great merchants (splash)** | renown, customs houses | customs houses (The Merchant Dynasties) | customs-house towns' routes (The Customs Service) | none |

Every build also gets production the deck's way: it buys it.

### How the deck pairs with the other five

The currency test (`docs/decks/deck-design.md`): Commerce makes gold and spends it on purchases.
- **Dominion** (no leader): merchants and their guards. Dominion fills the Military chairs Commerce cannot fill, and its plunder fills the hoard. Commerce buys the army's buildings and, through the bankers, its soldiers. Best with the bankers and the far trade. Shared: The Escorted Roads, Letters of Marque, War Bonds, Professional Soldiers, The Chartered Company, Mercenary Contracts (deferred).
- **Expansionist** (Pachacuti): the land and the market. Its founding road makes The Carters' Guild pay in age 1, its young towns are Frontier Investment's destinations, and its mines and claimed land are the goods build's deposits. Commerce's caravans pave the roads its road network reads. Best with the home market and the goods build. Shared: Market Gardens, The Grain Exchange, The Provincial Fair.
- **Devotion** (Mansa Musa): pilgrims and markets. Routes to holy sites (Pilgrim Markets, and Mansa Musa's The Hajj), religion carried on routes (The Silk Road Monks), and gold given to the faith (The Waqf, The Tithe). Neither deck covers production, so the pair buys everything twice over. Best with the far trade and the patrons. Shared: Pilgrim Markets, The Tithe.
- **Scientific** (no leader): the patrons. Gold buys libraries (The Endowment pays science on each bought roof), foreign routes pay science for what a partner knows (Books from the Ships), and resource mines pay science (The Exchange of Discoveries). Best with the patrons, the far trade and the goods build. Shared: Merchant Scholars, The Merchant Navigators, Books from the Ships, The Exchange of Discoveries.
- **Magisterial** (Zheng He): the art market. Gold buys rerolls (The Brokers' Redraw) and great people (Merchant Princes), each card drafted pays gold (The Art Dealers), and foreign routes earn renown (The Cosmopolitan Court). Best with the patrons, the far trade by sea, and the great merchants. Shared: Travelling Players, The Art Dealers, The Cosmopolitan Court.

### Leaders

- **Pachacuti** (Expansionist, Commerce): every town joined to the capital by road pays +1 happiness and +1 production, and farms pay +1 gold for each mountain beside them. Caravans pave those roads, so he leads the home market.
- **Mansa Musa** (Commerce, Devotion): +2 gold on mines and camps and +1 gold on worked desert; routes that begin or end at a town holding a holy site pay +2 gold and +2 faith. He leads the goods build, and the pilgrim routes of either trade flavour. By history he is also the patron whose gold flooded Cairo.
- **Zheng He** (Commerce, Magisterial): ships gain +2 movement and +1 sight; routes that begin or end at a coastal town pay +2 gold and +1 culture; his Longjiang Dockyard adds a slot and route gold. He leads the far trade by sea.
- **The patrons and the bankers have no leader** of their own, and no leader holds Dominion and Commerce, or Scientific and Commerce. A Dominion and Commerce leader (Carthage or Venice) would lead the bankers. Leaders are tuned later.

### Where the sheet is thin

- **By tier:**
  - Tier I has no Military and no Wildcard card, its own or shared, and 12 of its 15 cards are Economic. So under every tier-4 government the Military chair goes to the partner.
  - The reserves have nothing between The Nest Egg (Tier 0) and The Money Lenders (Tier III).
  - Tier III has eleven cards, and one rule-breaking capstone (The Gilded Scaffold). The Admiralty of Trade breaks a narrow rule.
- **By role:**
  - There is no grower and no "this game" count, though Commerce keeps three records that only grow (gold spent, road hexes laid, buildings bought). So nothing early carries into the late game except the percentage cards that happen to scale.
  - Moments are few: Civic Receipts and five commissions. No card pays when a caravan arrives, comes home or leaves a post.
  - Ten cards pay +25% to +38% gold in some towns: Land Speculation, Bought Swords, Private Patronage, The Market Writ, The Factors' Houses, Frontier Investment, The Customs Houses, Caravanserai Cities, and the shared The Tithe and Letters of Marque. That is ruling (qqqqqq) 1's conversion of the purchase discounts. Science and culture percentages are few: The Exchange, The Scholars' Roads, The Spice Exchange and The Chartered Metropolis's culture.
- **Cards that do not work as written** (questions 5 and 6):
  - **The Carters' Guild** (Tier 0) pays nothing in age 1. The only road before Currency is Expansionist's founding road (The Road Home).
  - **Established Routes** paid nothing in 30 bot samples. A route must run thirty turns, but a route renews only if its owner turns renewal on (`setAutoResend`), and the bots never do: every bot route ends at twenty turns, and a route sent again starts its age again. So the zero is the bots' play, and the card works for a person who renews.
  - **The World's Fair** (Tier IV) asks for six routes at once. A trade build has six by Tier II, so for it the card is a free ten turns of +50% science and culture.
  - **Bought Swords** lost what made it Bought Swords: its unit discount became +38% gold, and "purchased units count as trained" says nothing since the "gained" ruling.
- **Data and sheet disagree** on three shared rows: Merchant Scholars (data: band 1 and the old Library text; sheet: Tier III and great works), The Exchange of Discoveries (data: band 3; sheet: Tier I) and Travelling Players (data: band 0 and the old text; sheet: tier "2" and the deck count). The Art Dealers and Books from the Ships are on the sheets but not in the data. The shared-card reconcile settles these.
- **The user's playtests** so far were Dominion and Expansionist seats. There is no Commerce note yet.

---

## 1. The goods build: the mines and the monopoly

**The fantasy.** The silver of Laurion and the Fuggers' mines in the Tyrol, the gold and salt of Mali, the purple of Tyre, the Dutch hold on the spice islands. An empire that digs and grows the goods the world wants, holds more of them than anyone, and names the price.

**The loop:** work the deposits → each pays gold, and a mined deposit gives an extra copy → copies become monopolies that pay culture and science → the gold buys the next deposit's hex.
- **The quantity:** deposits worked (mines, quarries, plantations, fishing boats) and the copies they supply. The map gives them; the build makes more copies (Royal Assays, Strategic Exports) and takes more through deals and bought hexes.
- **The moment:** a monopoly. Corner the Market pays for four copies of one good, and The Merchant Adventurers for monopolies on two goods at once.
- **What it spends:** production. Its mines pay gold instead (The Mineral Trade), and it buys its buildings.

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| Salt Tithes | 0 | common | Gain +3 gold per distinct accessible improved luxury you produce. Worked luxury tiles gain +1 food. | opener | reads luxury kinds | gold, food | Economic | live |
| The Mineral Trade | 0 | common | Worked mines and quarries gain +2 gold but lose 1 production. | opener | reads worked mines | gold | Economic | live |
| Ore Caravans | I | common | Trade routes gain +1 gold for every mine in their origin city. | bridge to trade | reads mines | gold | Economic | live; 121 a turn measured |
| The Staple Right | I | common | Gain +3 gold and +2 culture for each luxury you hold two or more copies of. | pay-off | reads copies | gold, culture | Economic | live |
| Financed Industry | I | rare | Cities gain production equal to 30% of their gold yield. Every city loses 3 food. | engine: the production | reads gold | production | Economic | live |
| Royal Assays | II | uncommon | Each improved luxury resource deposit with a mine provides one additional copy of that luxury. | build-defining: a broken rule | raises copies | none | Economic | live |
| Mining Districts | II | uncommon | Worked mines gain +2 gold and +2 science for every two adjacent mines. | pay-off | reads mine clusters | gold, science | Civic | live |
| The Spice Exchange | II | rare | Every city gains +5% science and +5% culture for each luxury you hold two or more copies of, at most +30%. | early scaler | reads copies | science, culture | Civic | **moved** from Tier IV; existing |

- **At Tier I** (the Council of Elders seats four): Ore Caravans and The Staple Right in the Economic chairs, Salt Tithes in the Wildcard chair, Commercial Education (the treasury core's science) in the Civic chair, and the partner's card in the Military chair.
- **Five-chair core** (the end of Tier II; the Republic seats all five): The Staple Right, Royal Assays, Financed Industry, Mining Districts, The Spice Exchange.
- **Sizing:**
  - **The Staple Right:** two or three doubled goods at Tier I pay +6 to +9 gold and +4 to +6 culture, and early culture is worth about three times its face.
  - **Royal Assays:** three or four mined luxury deposits (gems, gold, silver, salt, jade, amber, lapis) give three or four more copies, which every other card here reads.
  - **Mining Districts:** two clusters of four mines pay about +16 gold and +16 science in age 3.
  - **The Spice Exchange:** four doubled goods at Tier II give +20%, about 38 a turn in age 3. At its cap, +30% of about 940 science and culture in age 4 is about 280 a turn, a headline card.
  - **Financed Industry:** weak in age 2 (a town's 6 gold makes 2 production, for 3 food), and about +12 production a town by age 4.
- **How a few turns feel:**
  - Turn 25: two gem deposits and a salt flat lie inside the borders. The hill mines pay gold, not production.
  - Turn 70: you hold two copies each of gems and salt. The Staple Right pays +6 gold and +4 culture, and each caravan from the mining town carries +3 gold.
  - Turn 110: the gem mine gives a third copy (Royal Assays), and The Spice Exchange reads four doubled goods: +20% science and culture. If Corner the Market holds the Wildcard chair, the fourth copy of gems brings a great merchant.
- **Alternatives:** The Assayer's Rule and Coastal Estates (Tier 0); The Planters' Charter (Tier I, no chair: the Plantation House); Strategic Exports (Tier II: science on routes, and double strategic copies); Corner the Market (Tier II commission, the early moment); Numidian Cavalry (Tier II charter: strength for each luxury kind); the shared The Exchange of Discoveries (Scientific: science on resource mines).

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Spice Exchange | II | rare | (above) | carried scaler | reads copies | science, culture | Civic | **moved** |
| Royal Assays | II | uncommon | (above) | carried engine | raises copies | none | Economic | live |
| The Casa da Índia | III | rare | Every copy of a luxury you hold pays as the first copy does. | capstone: a broken rule | reads copies | the luxuries' own yields and happiness | Economic | **new**; new shape (`perCopy` for every luxury; today silver and gold have it from age 3) |
| The Monopoly | III | rare | For each luxury you hold three or more copies of and no other empire holds, gain +8 gold, +5 culture and +1 happiness in every city. | pay-off | reads monopolies | gold, culture | Economic | live (built as: the happiness is empire-wide) |
| The Silver Towns | III | uncommon | Towns working three or more mines gain +25% gold and +25% science. | percentage on the flats | reads mining towns | gold, science | Civic | **new**; existing (`percentYields`, scope `workingImprovement` with `atLeast`) |
| The Merchant Adventurers *(commission)* | III | uncommon | Commission. Goal: hold monopolies on two luxuries at once. Reward: a great merchant, and +50% gold and culture for ten turns. The card then leaves its chair. | the moment | reads monopolies | gold, culture | Wildcard | **new**; a commission with a new goal figure (monopolies held; the count exists) |
| The Customs Service | III | uncommon | Trade routes leaving a city whose borders hold a customs house gain +3 gold and +3 culture. | bridge to the merchants | reads customs houses | gold, culture | Civic | live |
| The Silver Fleet | IV | rare | The town raising the Magnum Opus gains +5% production toward it for each luxury you hold two or more copies of. | finisher: the win | reads copies | production toward the Opus | Economic | **new**; existing (`productionBonus` with a count, The World's Exchange's shape) |
| The Merchant Works | IV | rare | Cities building a world wonder, an empire building or the Opus gain production equal to 25% of their gold, and lose 20% of their gold. | finisher | reads gold | production | Economic | live |
| The Merchant Dynasties | IV | uncommon | Each customs house inside your borders gives its city +3 science and +3 culture, whether or not it is worked. | pay-off, from the merchants | reads customs houses | science, culture | Civic | live |

- **Tier III council** (the Merchant League seats seven, and its Military chair goes to the partner): Royal Assays, The Monopoly, The Casa da Índia (Economic); The Spice Exchange, The Silver Towns (Civic); The Merchant Adventurers, The Customs Service (Wildcard).
- **Tier IV council** (the Estates seat nine, and two Military chairs go to the partner): it adds The Silver Fleet (Economic), and The Merchant Works and The Merchant Dynasties in the Wildcard chairs once The Merchant Adventurers has paid and left.
- **Carried over:** The Spice Exchange (+30% science and culture at six doubled goods) and Royal Assays, which keeps making the copies every late card reads.
- **The capstone, The Casa da Índia** (Lisbon's royal house of the spice trade):
  - Today a luxury pays its contentment and its own yields once for each kind you hold. Silver and gold break this from age 3 (`perCopy`); this card makes every luxury work that way.
  - Every copy Royal Assays makes and every copy a deal brings now pays. The age-3 yields of a luxury are paid in every town, so one more copy of gems pays about 27 gold in an empire of twelve towns.
  - The extra contentment lifts the empire into the spare-happiness tiers (+10% and +20% science and culture).
- **The moment, The Merchant Adventurers:** two monopolies at once bring a great merchant (a customs house for The Customs Service and The Merchant Dynasties) and ten turns of +50% gold and culture, about 4,000 in age 4.
- **Sizing:**
  - **The Monopoly:** two monopolies in twelve towns pay about 190 gold and 120 culture a turn: a headline rare that only this build feeds.
  - **The Silver Towns:** four towns working three mines each, at about 40 gold and 30 science each, gain about 70 a turn.
  - **The Silver Fleet:** six doubled goods give +30% toward the Opus, with no cap (ruling (qqqqqq) 4).
- **How a few turns feel:**
  - Turn 155: The Casa da Índia is seated. The third and fourth copies of gems each pay +2 gold in every town, and the empire's happiness rises a tier.
  - Turn 170: no other empire holds salt or gems. The Merchant Adventurers pays a great merchant and ten turns of +50% gold and culture.
  - Turn 190: the Opus town builds 30% faster on the copies alone, and the merchant's customs house pays +3 science and +3 culture.
- **Without Tier IV,** its chairs hold earlier cards still in the collection (Mining Districts, The Staple Right, Financed Industry), and the build keeps its capstone.
- **Utility mix:** happiness from the luxuries; faith (The Merchant Shrines: +1 faith in each town working a luxury); strength (Numidian Cavalry gains +1 for each luxury kind); strategic copies for the partner's army (Strategic Exports).
- **What it gives up:** production (its mines pay gold, and it buys its buildings), and certainty: it depends on the deposits the map gives. A poor start leans on deals and on buying hexes.
- **Partners:** Scientific (science on the same mines), Expansionist (land and mines), Devotion (Mansa Musa).
- **Leader:** Mansa Musa.
- **Alternatives, late:** A Court of Merchants (more merchants, more customs houses); The Bourse (from the treasury core); Strategic Exports or Mining Districts, carried.

---

## 2. The trade build: the home market and the far trade

**The fantasy.** The caravans of the Silk Road and the galleys of Venice: an empire whose wealth is its connections. There are two ways to trade. The home market joins your own towns into one market. The far trade sends caravans and ships to every court in the world.

**The loop, in both flavours:** send caravans → each route pays, and a route kept a full term leaves a post → old routes and posts pay more → more slots and more reach → send more.
- **The quantity:** trade routes running, and the posts and roads they leave. Every Commerce seat runs routes.
- **What it spends:** gold (each new caravan is hired, about 200 gold in age 2) and attention: choosing partners. A caravan can be plundered, and a war ends a foreign route.

### The core

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Factors' Houses | I | common | Your cities holding your trading post gain +2 gold and +4 culture, and +25% gold. | core: culture from posts | reads posts | gold, culture | Economic | live; 195 a turn measured |
| Established Routes | I | uncommon | A trade route you have kept up for at least thirty turns pays 50% more. A route that lapses, is cancelled or is plundered begins its term again. | core scaler | reads route age | everything a route pays | Economic | live; paid nothing in bot games (question 5) |
| Caravanserai Cities | III | uncommon | Caravanserais can be built in every city. Cities with a Caravanserai gain +30% gold. | core engine: slots | raises routes | gold | Economic | live |
| The Trade Winds | IV | rare | Gain +3 trade route capacity. Your trade routes reach 50% farther. | core finisher | raises routes and reach | none | Economic | live |
| The World's Fair *(commission)* | IV | rare | Commission. Goal: have six trade routes running at the same time, foreign or domestic. Reward: +50% science and +50% culture in every city for ten turns. The card then leaves its chair. | core moment | reads routes | science, culture | Wildcard | live (question 5) |

- **Both early core cards start slowly.** A post counts only after a full term of trade, and an old route after thirty turns, so they pay from about twenty and thirty turns into Tier I.
- **Markets are slots,** one and then one more for every eight citizens. So the trade build wants a Market in every town, and Commercial Education (the treasury core, +3 science for each gold building) is the science of many trade councils.
- **Caravanserai Cities is the bridge to the treasury:** a Caravanserai in every town gives each a slot, and one more for every eight citizens, but each costs 231 hammers (about 920 gold) in age 3, so the trade build buys them.

### The home market

**The fantasy.** The Champagne fairs, the towns of the Hanse, Rome's grain fleet. Your own towns trade with each other. Caravans carry grain and timber along the roads they pave, and the market towns where the roads meet become the great cities of the realm.
- **The loop:** send caravans between your towns → they carry food and production, and pave roads → the towns grow, and every eight citizens in a Market town open another route → send more.
- **The moment:** the fair (The Champagne Fairs), every ten turns, worth culture for each domestic route.
- **The capstone:** The Return Leg. A domestic route pays its home town as well as the town it reaches, so every card that pays a domestic route pays twice.
- **The early scaler:** The Paved Realm, on the roads the caravans lay. A road stays, so it is a "this game" count.

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Carters' Guild | 0 | common | Your cities connected to your capital by road, other than the capital, gain +1 food and +2 gold. | opener; pays from the first land route | reads connected towns | food, gold | Economic | live; nothing in age 1 (question 5) |
| Provisioning Contracts | I | common | Domestic routes grant their destination +3 food and +3 production. | engine | reads domestic routes | food, production | Economic | live |
| Frontier Investment | I | uncommon | In your cities of 5 population or fewer, domestic trade routes pay double, and those cities gain +25% gold. | engine: young towns | reads domestic routes | everything a route pays; gold | Economic | live |
| The Home Market | II | common | Cities receiving at least two of your domestic routes gain +30% food, +30% production and +2 happiness, once per city. | pay-off: market towns | reads routes that meet at a town | food, production, happiness | Economic | live |
| The Paved Realm | II | uncommon | +1% science and culture for every four hexes of road you have laid, at most +30%. | early scaler | reads roads laid | science, culture | Civic | **new**; existing (count `roadHexes` as a percentage, The Exchange's shape). Only land caravans and Expansionist's founding road lay roads |

- **At Tier I** (the Council of Elders seats four): Provisioning Contracts and The Factors' Houses (Economic), Frontier Investment (Wildcard), Commercial Education (Civic), and the partner's card in the Military chair.
- **Five-chair core** (the end of Tier II; the Republic seats all five): The Factors' Houses and Established Routes (core); Provisioning Contracts, The Home Market, The Paved Realm.
- **Sizing:**
  - **Provisioning Contracts:** four routes at Tier I pay +12 food and +12 production, and ten at Tier II pay +30 of each.
  - **The Home Market:** three market towns at about 20 food and 20 production each gain about 36, and +6 happiness.
  - **The Paved Realm:** ten land routes of about six hexes lay about sixty hexes of road by turn 120. That is +15%, about 28 a turn in age 3, and about 280 a turn at the cap in age 4.
- **How a few turns feel:**
  - Turn 60: the first caravan runs from the capital to the river town with +3 food and +3 production, and paves the road between them. The Carters' Guild starts to pay.
  - Turn 80: the first posts ripen, at both ends of that road. The Factors' Houses pays +4 culture in each post town.
  - Turn 100: four towns trade in a ring, and two routes meet at the capital: +30% food and production there. Established Routes adds half again to the oldest routes.
- **Alternatives:** the shared Market Gardens (Expansionist, Tier 0) and The Grain Exchange (Expansionist, Tier I); The Caravanserai Network (Tier II: +2 production and +2 gold on each domestic route, +2 happiness where they arrive); The League of Cities (Tier II rare: every town that sends a route builds faster and costs less authority, and every other town loses gold); the shared The Provincial Fair (Expansionist, Tier II) and The Escorted Roads (Dominion, Tier I).

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Paved Realm | II | uncommon | (above) | carried scaler | reads roads laid | science, culture | Civic | **new** |
| The Return Leg | III | rare | Your trade routes between your own cities also pay their origin everything they pay their destination. | capstone: a doubler | reads domestic routes | food, production, gold | Economic | **reworked** from the deferred Tier I row, which paid the origin a third; new shape (a domestic route that also pays its home town, once) |
| The Chartered Metropolis | III | rare | Cities with at least three of your paying outgoing routes gain +38% food, production and culture, but each costs +4 authority while qualified. | pay-off: hub towns | reads routes that leave a town | food, production, culture | Economic | live |
| The Champagne Fairs | III | uncommon | Every ten turns, gain culture equal to forty times the number of trade routes between your own cities. | the moment | reads domestic routes | culture | Civic | **new**; existing (`periodic` with a count, Horology's shape) |
| The Merchant Works | IV | rare | (goods, above) | finisher | reads gold | production | Economic | live |

- **Tier III council** (the Merchant League seats seven): Caravanserai Cities, The Return Leg, The Chartered Metropolis (Economic); The Paved Realm, The Champagne Fairs (Civic); Established Routes and The Customs Service (Wildcard).
- **Tier IV council** (the Estates seat nine): it adds The Trade Winds (Economic), and The World's Fair and The Merchant Works in the Wildcard chairs, in place of The Customs Service.
- **Carried over:** The Paved Realm (at the +30% cap by about turn 160) and Established Routes (every route is old by then).
- **The capstone, The Return Leg:**
  - Today a domestic route pays only the town it reaches. With this card the home town is paid the same, once: what it receives is never carried on.
  - Every card that pays a domestic route pays twice: Provisioning Contracts, The Caravanserai Network, Frontier Investment, The Grain Exchange and Market Gardens. Two towns that trade both ways are each paid twice.
  - Fifteen domestic routes at about 15 a route are about 225 a turn more. That is a headline card, and a doubler only a deep category earns.
- **The moment, The Champagne Fairs:** every ten turns, fifteen domestic routes hold a fair worth 600 culture, about half a draft in age 4.
- **How a few turns feel:**
  - Turn 150: The Return Leg is seated. The capital receives two routes and sends three, and it is now paid for all five.
  - Turn 160: the fair comes round: 600 culture, and the next Order hand opens a turn early.
  - Turn 175: three hub towns send three routes each, and The Chartered Metropolis lifts them by +38%, while they cost +4 authority each.
- **Utility mix:** happiness (The Home Market, The Caravanserai Network, The Grain Exchange), authority (The League of Cities, and The Market Writ from the treasury core), food.
- **What it gives up:** foreign science and culture, and authority if it leans on The Chartered Metropolis. It wants many towns close together.
- **Partners:** Expansionist (roads, young towns, the grain cards), Dominion (The Escorted Roads guards the roads).
- **Leader:** Pachacuti.

### The far trade

**The fantasy.** Venice's houses in Alexandria and Bruges, the Sogdians on the Silk Road, Marco Polo at the court of the Khan, Zheng He's treasure fleets. Caravans and ships go to every court in the world, you keep a house in every foreign port, and the learning and songs of the world come home.
- **The loop:** meet empires → send caravans abroad → they bring science and culture home, every town they reach gives later routes three more turns of range, and a route kept a full term leaves a post that pays → reach the next partner.
- **The moment:** a caravan home from abroad (The Book of Marvels), each time a foreign route completes its term.
- **The capstone:** Safe Conduct. War no longer ends your trade, which is the far trade's one great risk.
- **The early scaler:** The Exchange, on the empires your routes serve.

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| Travellers' Letters | 0 | common | Your capital gains +2 science and +2 culture, plus +1 of each per foreign empire met, no cap. | opener | reads empires met | science, culture | Civic | live |
| The Pathfinders' Company | 0 | uncommon | Scouts gain +1 sight and +1 movement. | opener: exploring | raises empires met | none | Military | live |
| The Common Road | I | common | Your foreign routes grant you +3 gold, +3 science and +3 culture. Each also grants its host city +3 gold. | engine | reads foreign routes | science, culture, gold | Civic | live |
| The Homeward Cargoes | I | common | Each town gains +4 production for every trade route to another empire that sets out from it. | engine: the production | reads foreign routes | production | Economic | **new**; existing (count `foreignTradeRoutes` with `within: 'city'`, The Cosmopolitan Court's count) |
| The Exchange | II | uncommon | Each different foreign empire your routes currently serve grants +5% science and culture empire-wide. Foreign routes to your cities grant +2 science and +2 culture to both you and the sender. | early scaler | reads partners | science, culture | Civic | live (built as: the second sentence pays your own foreign routes and their hosts) |

- **At Tier I** (the Council of Elders seats all five, with The Pathfinders' Company in the Military chair): The Factors' Houses and The Homeward Cargoes (Economic), The Common Road (Civic), Travellers' Letters (Wildcard), The Pathfinders' Company (Military).
- **Five-chair core** (the end of Tier II; the Republic seats all five): The Factors' Houses and Established Routes (core); The Homeward Cargoes, The Common Road, The Exchange.
- **Sizing:**
  - **Travellers' Letters:** three empires met by turn 40 make +5 science and +5 culture in the capital, more than the rest of an age-1 empire makes.
  - **The Common Road:** three foreign routes at Tier I pay +9 of each, and half again by sea.
  - **The Homeward Cargoes:** six foreign routes from four towns make +24 production, the flavour's answer to the gap.
  - **The Exchange:** four partners give +20% science and culture, about 38 a turn in age 3.
- **How a few turns feel:**
  - Turn 30: the scout meets a third empire, and the capital's science and culture rise again.
  - Turn 65: the first caravan sets out for a neighbour's capital. It pays +3 science, +3 culture and +3 gold, and its home town gains +4 production.
  - Turn 85: the neighbour's capital, reached twenty turns ago, now holds your post. Your port has sent a caravan before, so its next one reaches three turns further, to a partner it could not reach before.
  - Turn 110: four partners pay +20% science and culture.
- **Alternatives:** The Map Sellers (Tier 0); Venture Routes (Tier I: longer routes, and double gold on long ones); The Foreign Factor (Tier II: +5 gold for each post abroad); The Scholars' Roads (Tier II rare: four fewer routes, each paying far more science and culture); The Silk Road Monks (Tier II, with Devotion); the shared Pilgrim Markets, Travelling Players, Books from the Ships and The Merchant Navigators.

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Exchange | II | uncommon | (above) | carried scaler | reads partners | science, culture | Civic | live |
| Safe Conduct | III | rare | War does not end your trade routes or stop your trading posts paying. | capstone: a broken rule | keeps routes and posts | what they pay | Economic | **new**; new shape (one rule, read where a war ends routes and where it stops a post paying) |
| The Fondaci | III | uncommon | Gain +5 science and +5 culture for each foreign city holding your trading post. | pay-off | reads posts abroad | science, culture | Civic | **new**; existing (count `postCities`, The Foreign Factor's count) |
| The Book of Marvels | III | uncommon | Each time one of your trade routes to another empire completes its term, gain 80 science and 80 culture. | the moment | reads foreign routes | science, culture | Civic | **new**; new shape (a moment when a route completes its term) |
| The Admiralty of Trade | III | rare | A sea trade route between two cities that both hold your trading post has no range limit. | utility: reach by sea | raises reach | none | Economic | live |
| Merchant Scholars (Scientific) | III | uncommon | Foreign routes gain +2 science for every great work improvement in the origin city. | pay-off | reads foreign routes | science | Civic | shared; the sheet's revised text is not in the data |
| Patrons Abroad | IV | rare | Your city building the Magnum Opus gains +3 production for each foreign city holding your trading post. | finisher | reads posts abroad | production toward the Opus | Economic | live |
| The World's Exchange | IV | rare | +10% production toward the Opus for each foreign empire your trade routes reach, at most +40%. | finisher | reads partners | production toward the Opus | Economic | live |

- **Tier III council** (the Merchant League seats seven): Established Routes, Caravanserai Cities, Safe Conduct (Economic); The Exchange, The Fondaci (Civic); The Book of Marvels, The Admiralty of Trade (Wildcard). Divine Mandate's three Civic chairs also suit it, with Merchant Scholars.
- **Tier IV council** (the Estates or the Curia seat nine): it adds The Trade Winds, Patrons Abroad and The World's Fair, in place of The Admiralty of Trade.
- **Carried over:** The Exchange (+20% to +25% with four or five partners) and Established Routes.
- **The capstone, Safe Conduct:**
  - Today a war between two empires ends every route between them, and a post in a town at war pays nothing.
  - With Safe Conduct the routes keep running and paying, and the posts keep paying. A caravan can still be plundered, and the host still takes its line.
  - So the far trade no longer has to run home when a neighbour declares war, and no partner can cut it off. It breaks the one rule the far trade is built around.
- **The moment, The Book of Marvels:** with eight foreign routes, one completes its term every two or three turns, and each brings 80 science and 80 culture, about 64 a turn.
- **Sizing:**
  - **The Fondaci:** eight posts abroad pay +40 science and +40 culture.
  - **Patrons Abroad and The World's Exchange:** eight posts and four partners add +24 production and +40% toward the Opus.
- **How a few turns feel:**
  - Turn 150: the neighbour you trade with most declares war. Under Safe Conduct your three caravans to its towns keep paying, and one is plundered at the gates.
  - Turn 160: a caravan comes home from across the sea: +80 science and +80 culture.
  - Turn 185: the Opus town gains +24 production from eight posts abroad.
- **Utility mix:** reach (Venture Routes, The Admiralty of Trade, The Trade Winds), exploration (The Pathfinders' Company), religion carried on the routes (The Silk Road Monks).
- **What it gives up:** production (The Homeward Cargoes is its only early source), and safety until Safe Conduct: it needs neighbours at peace.
- **Partners:** Scientific, Magisterial and Devotion, through the shared route cards above.
- **Leader:** Zheng He.

### Flexing between home and abroad

The two flavours share the core (posts, old routes and slots), so a seat can move its caravans from one to the other. War is the usual reason: it ends the routes to an enemy, and those caravans can go home instead. A ripe post abroad stays, and pays again at peace.

| Card | Tier | Rarity | Text | The flex | Type | Status, shape |
|---|---|---|---|---|---|---|
| The Factors' Houses | I | common | (core) | both: posts at home and abroad | Economic | live |
| Ore Caravans | I | common | Trade routes gain +1 gold for every mine in their origin city. | both, and the goods build | Economic | live |
| The Escorted Roads (Dominion) | I | uncommon | Routes whose origin has a garrison gain +5 gold. Naval units gain +2 strength while adjacent to one of your traders. | both | Economic | shared |
| The Silk Road Monks | II | uncommon | Your trade routes carry 100% more religious pressure. Trade routes you send to a city that follows your religion gain +3 gold and +3 culture. | both: your own towns follow your faith | Civic | live (built as) |
| The Customs Service | III | uncommon | (goods, above) | both, and the merchants | Civic | live |

- **What a flex costs:** a route sent again starts its age again (Established Routes), and a domestic route pays no science or culture of its own. The Paved Realm and The Factors' Houses keep paying through the move.
- **How a flex plays out over a game:**
  - Age 2 (Tier I): home first. The first caravans run between your own towns, safely, and pay production.
  - Age 3 (Tier II): abroad, once the neighbours are met and at peace. The Common Road and The Exchange pay the science and culture the home market lacks.
  - Age 4 (Tiers III and IV): both, with the slots Caravanserai Cities opens. When war comes, the routes to the enemy come home, unless Safe Conduct is seated.

---

## 3. The treasury build: the patrons and the bankers

**The fantasy.** The Medici, the Fuggers, the bankers of Genoa. Wealth becomes power through two different habits. The patrons spend gold as it comes and raise their towns by purchase. The bankers keep it, let it grow, and spend it all at once when the moment comes.

**The loop, in both flavours:** gold buildings make gold → the gold is spent or kept, and either way it pays → more gold buildings.
- **The quantity:** gold, as the treasury holds it or as it leaves.
- **What it spends:** tempo. The patrons pay four gold for every hammer; the bankers wait.

### The core

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| Land Speculation | 0 | uncommon | Your cities gain +25% gold. Your capital loses 2 happiness. | opener | raises gold | gold | Economic | live |
| Commercial Education | I | common | Gold buildings provide +3 science. | core: science; carried | reads gold buildings | science | Civic | live |
| The Market Writ | I | uncommon | +1 authority for every two Markets in your empire. Your cities gain +38% gold. | core | reads Markets | gold, authority | Economic | live |
| The Bourse | III | rare | Gold buildings produce 75% more of their own yields. | core pay-off | reads gold buildings | gold | Economic | live |
| Merchant Princes | IV | rare | Gold may purchase great-person drafts at the existing escalating offer price, with normal availability and purchase limits. | core: a way to spend | spends gold | great people | Civic | live |

- **Commercial Education carries over,** because each age brings gold buildings: one a town in ages 2 and 3 (the Market), and about three in age 4 (the Market, the Bank and the Bazaar). Twelve towns in age 4 make about +100 science.
- **The core is the deck's steady base,** not a build-around: gold buildings stop at one of each in a town, as Dominion's military buildings do.
- **Houses of Account** (Tier II: +2 happiness and +1 renown for each gold building) is a core alternative and the start of the great merchants.

### The patrons

**The fantasy.** Cosimo de' Medici's churches and libraries, the Roman benefactors whose names were cut into the buildings they paid for, Mansa Musa's gold in Cairo. Towns are raised by purchase, and every bought roof honours the one who paid for it.
- **The loop:** earn gold → buy buildings instead of building them → every bought roof pays science and culture, and bought Markets make more gold → buy more.
- **The moment:** a purchase. Civic Receipts pays culture on every building bought, and the first wonder The Gilded Scaffold buys is the build's big day.
- **The capstone:** The Gilded Scaffold: gold buys world wonders.
- **The early scaler:** The Benefactors' Roll, on all the gold spent buying this game.

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| Civic Receipts | I | uncommon | Buying any building grants culture equal to 15% of the gold paid, with no cap. | pay-off: the moment | reads purchases | culture | Civic | live |
| Private Patronage | I | rare | Your cities gain +38% gold. Producing ordinary buildings normally takes 20% more production. Empire buildings and wonders are unaffected. | build-defining: buy, do not build | raises gold | gold | Economic | live |
| Financed Industry | I | rare | (goods, above) | engine: gold into production | reads gold | production | Economic | live |
| The Benefactors' Roll | II | uncommon | +1% science and culture for every 200 gold you have spent buying this game, at most +30%. | early scaler | reads gold spent | science, culture | Civic | **new**; existing (a count-scaled percentage on the `goldSpent` record, which Cosimo de' Medici's legacy reads) |
| The Waqf | II | common | Faith buildings you bought with gold provide +3 faith and +2 culture. | pay-off | reads bought faith buildings | faith, culture | Civic | live |

- **At Tier I** (the Council of Elders seats four): Private Patronage and Financed Industry (Economic), Civic Receipts (Civic), Commercial Education (Wildcard), and the partner's card in the Military chair.
- **Five-chair core** (the end of Tier II; the Republic seats all five): The Market Writ (core), Private Patronage, Financed Industry, The Benefactors' Roll, and Civic Receipts in the Wildcard chair. Under the Theocracy the build seats four Civic cards instead (Civic Receipts, The Benefactors' Roll, Commercial Education, The Waqf), and the Military chair goes to the partner.
- **Sizing:**
  - **Civic Receipts:** a Temple bought for about 470 gold pays 70 culture, about three turns of an age-2 empire's culture.
  - **Private Patronage:** with the deck's other gold cards, +38% is about +12 to +15 gold in age 2. The slower building is the reason to buy.
  - **The Benefactors' Roll:** about 2,000 gold spent by turn 100 gives +10%; about 6,000 by turn 150 reaches the cap.
- **How a few turns feel:**
  - Turn 60: the new town would take thirteen turns over its Library. You buy it for about 200 gold, Civic Receipts pays 30 culture, and the town goes on to its Granary.
  - Turn 100: 2,000 gold spent this game: The Benefactors' Roll pays +10% science and culture.
  - Turn 120: the Temple you bought in the holy city pays +3 faith and +2 culture (The Waqf).
- **Alternatives:** The Brokers' Redraw (Tier II rare: gold buys a fresh hand); The Customs Houses (Tier II); the shared The Art Dealers (Magisterial: gold for each card drafted) and The Tithe (Devotion).

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Benefactors' Roll | II | uncommon | (above) | carried scaler | reads gold spent | science, culture | Civic | **new** |
| Financed Industry | I | rare | (above) | carried engine | reads gold | production | Economic | live |
| The Gilded Scaffold | III | rare | You may purchase world wonders. All your cities lose 15% production. | capstone: a broken rule | spends gold | the wonders' own pay | Economic | live |
| The Endowment | III | uncommon | Purchased buildings provide +2 science each, at most +6 per town. | pay-off: flats | reads bought roofs | science | Civic | live |
| The Marble Towns | III | uncommon | Each town gains +5% science and culture for every building bought there with gold, at most +30%. | percentage on the flats | reads bought roofs | science, culture | Civic | **new**; existing (count `purchasedBuildings` per town, by bank, as a percentage) |
| A Guild Commission *(commission)* | III | uncommon | Commission. Goal: buy five buildings with gold while seated. Reward: a free great-person draft, the same offer Merchant Princes sells for gold. The card then leaves its chair. | the moment | reads purchases | a great person | Wildcard | live |
| Bought and Paid For | IV | rare | Buildings you bought with gold provide +1 production and +2 culture each, counting at most six per city. | pay-off | reads bought roofs | production, culture | Civic | live |
| The Merchant Works | IV | rare | (goods, above) | finisher | reads gold | production | Economic | live |

- **Tier III council** (the Merchant League seats seven): Financed Industry, The Bourse, The Gilded Scaffold (Economic); The Endowment, The Marble Towns (Civic); The Benefactors' Roll, A Guild Commission (Wildcard). The Military chair goes to the partner, or to the shared Professional Soldiers (units you buy gain +3 strength).
- **Tier IV council** (the Curia seats nine): The Gilded Scaffold, The Merchant Works (Economic); The Endowment, The Marble Towns, The Benefactors' Roll, Bought and Paid For (Civic); The Bourse, Merchant Princes, Financed Industry (Wildcard, once A Guild Commission has paid and left).
- **Carried over:** The Benefactors' Roll (at its cap) and Financed Industry (about +12 production a town).
- **The capstone, The Gilded Scaffold:** today no world wonder is for sale. With this card the build buys one outright. The Great Library costs about 2,000 gold, and an age-4 wonder 6,000 to 7,700, which is a long save or one Great Loan. The price is 15% production everywhere, which a build that buys its buildings feels least.
- **The moment, A Guild Commission:** five buildings bought while it is seated bring a great person of any family.
- **Sizing:**
  - **The Endowment and The Marble Towns** read the same bought roofs as flats and as a percentage. Ten towns with two bought buildings each gain +40 science, and +10% science and culture each, about 90 a turn.
  - **Bought and Paid For:** twenty bought buildings pay +20 production and +40 culture.
- **How a few turns feel:**
  - Turn 150: The Gilded Scaffold is seated. Notre-Dame costs about 7,700 gold, the treasury holds 6,000, and three turns later it is yours.
  - Turn 160: the fifth building bought under the commission brings a great scholar.
  - Turn 180: every town bought half its buildings, and The Marble Towns pays +15% science and culture in each.
- **Utility mix:** great people (A Guild Commission, Merchant Princes), wonders (The Gilded Scaffold), rerolls (The Brokers' Redraw), faith buildings (The Waqf), and a bought army (Foreign Procurement, the shared Professional Soldiers).
- **What it gives up:** the reserve. It spends everything, so it has nothing left when war comes. Private Patronage and The Gilded Scaffold also slow its own building.
- **Partners:** Scientific (buy the libraries), Magisterial (The Art Dealers, Merchant Princes), Devotion (The Waqf, The Tithe).
- **Leader:** none of its own; Mansa Musa by history.

### The bankers

**The fantasy.** The Fuggers lending to emperors, the Medici bank, the treasury of Athens on the Acropolis. Gold kept is power held. The hoard earns interest and pays its keeper, and on the deciding day it buys an army, a wonder or the Great Work at once.
- **The loop:** keep gold → the hoard pays science, culture and production, and earns interest → the hoard grows → spend it at once on the deciding army, wonder or great person, then fill it again.
- **The moment:** the hoard reaching 2,000 gold (The Strongroom), and the great spend after it.
- **The capstone:** The Money Lenders: 4% interest a turn, with no cap (ruled 2026-10-12).
- **The early scalers:** The Strongbox, a grower that keeps what it earned when the hoard is spent, and Bills of Exchange, which reads the hoard as it stands.

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Nest Egg | 0 | common | Your capital gains +1 culture for every 50 gold in your treasury, at most +4. | opener | reads the hoard | culture | Civic | live |
| The Strongbox | I | uncommon | While seated, this card gains +1 science and +1 culture each turn you end with at least 300 gold in your treasury, up to +15 of each. | grower | reads turns kept | science, culture | Civic | **new**; new shape (a tally of turns ended holding gold, read by the growing cards' existing count) |
| Bought Swords | I | uncommon | Your cities gain +38% gold. Military units take 10% more production to train. Purchased units count as trained. | glue: gold | raises gold | gold | Economic | live (question 6) |
| Bills of Exchange | II | uncommon | Every town gains +1% production for every 100 gold in your treasury, at most +30%. | early scaler | reads the hoard | production | Economic | **new**; existing (a count-scaled percentage on `bankedGold`) |
| Foreign Procurement | II | uncommon | Ignore strategic resource requirements when purchasing units. All units cost 20% more. | utility: the bought army | spends gold | none | Military | live |

- **At Tier I** (the Council of Elders seats four): The Market Writ and Bought Swords (Economic), The Strongbox (Civic), The Nest Egg (Wildcard), and the partner's card in the Military chair.
- **Five-chair core** (the end of Tier II; the Republic seats all five): The Market Writ, Bought Swords, Bills of Exchange (Economic), The Strongbox (Civic), Commercial Education (Wildcard).
- **Sizing:**
  - **The Nest Egg:** 200 gold kept doubles an age-1 capital's culture.
  - **The Strongbox:** seated at turn 56 and kept above 300 gold, it is full by about turn 75: +15 science and +15 culture, which it keeps when the gold is spent.
  - **Bills of Exchange:** 1,500 gold in age 3 gives +15% production (about 16 a turn); 3,000 in age 4 reaches the cap (about 140 a turn).
- **How a few turns feel:**
  - Turn 40: 200 gold in the treasury, and the capital's culture doubles.
  - Turn 80: a neighbour marches on the border towns. You buy two Phalanxes in two towns the same turn, though you hold no copper or obsidian (Foreign Procurement).
  - Turn 120: 1,500 gold kept, and every town builds 15% faster.
- **Alternatives:** Land Speculation (Tier 0); Houses of Account (Tier II); the shared The Art Dealers.

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| Bills of Exchange | II | uncommon | (above) | carried scaler | reads the hoard | production | Economic | **new** |
| The Strongbox | I | uncommon | (above) | carried grower | reads turns kept | science, culture | Civic | **new** |
| The Money Lenders | III | rare | Earn interest equal to 4% of your treasury each turn, with no cap. | capstone: interest that compounds | raises the hoard | gold | Economic | live |
| The Bank of Saint George | III | uncommon | Every town gains +1 science for every 500 gold in your treasury. | pay-off | reads the hoard | science | Civic | **new**; existing (count `bankedGold` paid in every town, with no cap) |
| The Strongroom *(commission)* | III | rare | Commission. Goal: end a turn with at least 2,000 gold in your treasury. Reward: culture equal to a fifth of your treasury at that moment, and a great merchant. The card then leaves its chair. | the moment | reads the hoard | culture, a great person | Wildcard | **moved** from Tier IV; live |
| War Bonds (Dominion) | III | uncommon | Military units gain +1 strength for every 150 gold in your treasury, at most +5. | utility: the hoard defends | reads the hoard | strength | Military | shared |
| Money at Work | IV | rare | Your capital gains +1 production for every 50 gold in your treasury, at most +40. | pay-off | reads the hoard | production | Economic | live |
| The Great Loan *(commission)* | IV | rare | When you seat this card, gain gold equal to twenty turns of your gold income. For the next forty turns your cities lose 25% gold. The card then leaves its chair. | the spend | raises the hoard now | gold | Wildcard | live (built as a commission) |
| The Hired Garrison | IV | uncommon | A city with a world wonder or the Magnum Opus at the front of its queue may buy any number of military units with gold each turn. | the spend: the army | spends the hoard | none | Military | live |

- **Tier III council** (the Merchant League seats all eight): The Money Lenders, The Bourse, Bills of Exchange (Economic); The Bank of Saint George, The Strongbox (Civic); The Strongroom, Commercial Education (Wildcard); War Bonds (Military).
- **Tier IV council** (the Estates seat all eleven): it adds Money at Work (Economic) and The Hired Garrison (Military), and Merchant Princes and The Great Loan in the Wildcard chairs once The Strongroom has paid and left. It is the only late Commerce council that fills every chair itself, because the hoard is also a Military quantity.
- **Carried over:** Bills of Exchange (at its cap from 3,000 gold) and The Strongbox (+15 science and +15 culture, whatever the hoard does).
- **The capstone, The Money Lenders:** 4% a turn compounds. 3,000 gold earns 120 a turn and doubles in about eighteen turns, with income on top, and every other card here reads the hoard it grows. The user ruled it uncapped: *"these are the late game engines and orders that allow players to 'break the game'"*.
- **The moment, The Strongroom:** on the turn the hoard passes 2,000 gold, a fifth of it comes back as culture (1,000 on a 5,000-gold hoard), with a great merchant. It moves to Tier III so the bankers have a moment without Tier IV.
- **Sizing:**
  - **The Bank of Saint George:** 5,000 gold gives +10 science in each of twelve towns (120 a turn), and 15,000 gives 360. With no cap, it is a late engine of the kind the user asked for.
  - **War Bonds:** 750 gold kept reaches its cap of +5 strength.
  - **Money at Work:** +40 production in the capital at 2,000 gold.
- **How a few turns feel:**
  - Turn 150: the hoard passes 2,000 gold. The Strongroom pays 400 culture and a great merchant.
  - Turn 165: 5,000 gold earns 200 a turn, every town gains +10 science, and every soldier fights at +5.
  - Turn 185: a rival's Opus is close. You seat The Great Loan (twenty turns of gold at once), pour the hoard into your own Opus, and buy three Knights in the Opus town in one turn (The Hired Garrison).
- **Utility mix:** defence and the bought army (War Bonds, Foreign Procurement, The Hired Garrison, the shared Professional Soldiers and The Chartered Company), great people (The Strongroom, Merchant Princes).
- **What it gives up:** tempo. Every coin kept is a building not bought this turn, and the bankers are the slowest Commerce build until Tier III.
- **Partners:** Dominion first: its Military cards fill the chairs, its plunder fills the hoard, and the hoard pays its soldiers.
- **Leader:** none.

### Flexing between keeping and spending

The two flavours share the core, and the best treasury seats move from one to the other: keep while the hoard pays most, and spend when a purchase decides the game.

| Card | Tier | Rarity | Text | The flex | Type | Status, shape |
|---|---|---|---|---|---|---|
| The Strongbox | I | uncommon | (above) | keep, then spend: it keeps what it earned when the hoard is spent | Civic | **new** |
| The Benefactors' Roll | II | uncommon | (above) | keep, then spend: a banker who finally spends gains it at once | Civic | **new** |
| The Gilded Scaffold | III | rare | (above) | keep, then spend: the hoard buys a wonder | Economic | live |
| The Great Loan | IV | rare | (above) | spend now: twenty turns of gold at once | Wildcard | live |
| Merchant Princes | IV | rare | (core) | either: great people from the hoard or from the income | Civic | live |

- **How a flex plays out over a game:**
  - Ages 1 and 2: keep. The Nest Egg and The Strongbox pay for the first few hundred gold.
  - Age 3: spend on the slow towns' buildings (Civic Receipts, The Benefactors' Roll), and keep enough for The Strongbox.
  - Age 4: keep again under The Money Lenders until the hoard is large, then spend it at once on a wonder (The Gilded Scaffold), the Opus, or an army (The Hired Garrison).

---

## 4. The great merchants: a splash

- **Every Market and Harbour pays merchant renown,** so every Commerce seat calls great merchants without asking. A merchant's act pays 60 gold × the age, and its work, the Customs House, pays +3 gold.
- **The splash's cards** are bridges that any build can seat in a spare chair:
  - Houses of Account (Tier II, Civic): +2 happiness and +1 renown for each gold building;
  - The Customs Houses (Tier II, Economic): customs houses gain +5 gold and +1 renown, and their towns +38% gold;
  - A Court of Merchants (Tier III rare, Civic): +50% renown, and great-person offers show only merchants;
  - The Customs Service (Tier III, Civic): routes from a customs-house town gain +3 gold and +3 culture;
  - The Merchant Dynasties (Tier IV, Civic): each customs house gives its town +3 science and +3 culture;
  - Merchant Princes (Tier IV rare, Civic): gold buys great people.
  - Three commissions bring a merchant: Corner the Market, The Merchant Adventurers and The Strongroom.
- **Why a splash and not a sixth build:** the merchants have no card before Tier II, and customs houses grow only as fast as renown does. As a splash they reward a spare chair in every build.
- **Shared:** The Cosmopolitan Court (Magisterial): renown for foreign routes from a town with a culture building, and +3 gold on great-person works.

---

## Across the builds

### Bridges and pivots

- **The goods build feeds both families.** Ore Caravans and Strategic Exports put its mines on the trade routes. Financed Industry and The Merchant Works turn its gold into production. The Customs Service and The Merchant Dynasties pay for the merchants its commissions bring.
- **The two families meet at Caravanserai Cities:** each Caravanserai costs about 920 gold, so the trade build buys them.
- **Inside each family:** the core cards, and the flex tables above.
- **The pivots this opens:** goods to trade (the mining town's caravans), home and abroad (war and peace), keep and spend (the hoard and the purchase), and goods to the bankers (the monopolies' gold kept).

### New shapes, and the cards that use them

**The count:** 16 cards, 15 new and 1 reworked. Ten use shapes that exist, and six need a new shape. Each new shape reads a mechanic the game already has, and none needs a new button or choice.

1. **A domestic route that also pays its home town** (The Return Leg). Today a route pays the town it reaches. This adds the origin as a second payee on domestic routes, paid once and never fed into another route or share.
2. **A moment when a route completes its term** (The Book of Marvels). The renewal and the lapse already happen in one place (`marchTraders`). This announces them as an occasion, narrowed by crossing.
3. **Every copy of a luxury counts** (The Casa da Índia). `perCopy` exists in `resourceEffects.ts` for silver and gold from age 3. A card turns it on for every luxury.
4. **Trade that survives war** (Safe Conduct). One rule, read at the two places a war stops trade: `cancelRoutesBetween` on a declaration, and `cityPostPays`.
5. **A tally of turns ended holding gold** (The Strongbox). A new `TallyOccasion` member with a threshold, written in the end-of-turn phase and read by the growing cards' existing count.
6. **Monopolies as a commission goal** (The Merchant Adventurers). The count `monopolyLuxuries` exists; the commission figures do not include it yet.

**Existing, though new to this deck:** The Paved Realm, The Benefactors' Roll and Bills of Exchange are counted percentages with a step: `pays` at `basis: 'count'` with `percent`, `stage`, `per` and `max`, fields that all exist (The Exchange and The Spice Exchange use the same shape without the step).

**Where to cut if the user wants less engine work:** Safe Conduct (the largest rule change), and The Strongbox (which could read the hoard plainly instead).

### Sheet cards no build uses

- **Every card has a home.** Each card on the sheet is in a build's table or alternatives, or in the great-merchant splash. The pure glue is a few cards: The Merchant Shrines (the deck's early faith), Coastal Estates, The Assayer's Rule, Land Speculation and Bought Swords.
- **To fix** (questions 5 and 6): Established Routes, The Carters' Guild, The World's Fair, Bought Swords.
- **The two shared cards the sheet proposed to cut** (Market Gardens and The Provincial Fair, both with Expansionist) now have a home: each is a home-market alternative for a seat with Expansionist. Keep them; the Expansionist pass keeps them too.
- **The four data-only rows** that the sheet no longer lists stay out of every pool. The Treaty Ports, The Post Riders and Export Guilds wait until deals and road movement matter more. **The Consulate** is a purchase discount, which ruling (qqqqqq) 1 retired, so its row should be retired too. The fifth, The Return Leg, becomes the home market's capstone.

### The new cards, by tier

- **Tier I (2):** The Homeward Cargoes (far trade), The Strongbox (bankers).
- **Tier II (3):** The Paved Realm (home market), The Benefactors' Roll (patrons), Bills of Exchange (bankers).
- **Tier III (10):** The Casa da Índia, The Silver Towns, The Merchant Adventurers (goods); The Return Leg (reworked), The Champagne Fairs (home market); Safe Conduct, The Fondaci, The Book of Marvels (far trade); The Marble Towns (patrons); The Bank of Saint George (bankers).
- **Tier IV (1):** The Silver Fleet (goods).
- **Moved:** The Spice Exchange, Tier IV to II (the goods build's scaler); The Strongroom, Tier IV to III (the bankers' moment).
- **Names** were checked against `data/` and `docs/`. Avoided: "The Counting Houses" and "Paper Money" (technologies), "The Exchequer" (a retired Order), "The Medici Bank" (a cut card). The Benefactors' Roll is close to Magisterial's cut Public Benefactors.
  - The Casa da Índia: Lisbon's royal trading house (1500), which ran the spice trade.
  - The Silver Towns: the mining towns of Kutná Hora, Schwaz and Potosí.
  - The Merchant Adventurers: the English company (chartered 1407) that held a monopoly of the cloth trade.
  - The Silver Fleet: Spain's treasure fleet.
  - The Champagne Fairs: the medieval fairs where the trade of Flanders and Italy met.
  - The Fondaci: Venice's trading houses in foreign ports.
  - The Book of Marvels: Marco Polo's account of his travels.
  - Safe Conduct: a letter that let a merchant travel in war.
  - The Benefactors' Roll: the Roman benefactors named on the buildings they paid for.
  - The Marble Towns: Augustus found Rome a city of brick and left it a city of marble.
  - The Bank of Saint George: Genoa's great bank (1407), placeholder name.
  - Bills of Exchange: the bankers' instrument of the Medici and the Fuggers.

### The checks

- **One loop:** every chair in the councils raises the build's quantity, reads it, or pays an essential from it. The exceptions are named: the partner's Military chairs, and the great-merchant bridges.
- **Better together:** each build's late cards read one quantity in several ways.
  - Goods: one extra copy pays The Staple Right, The Spice Exchange, The Monopoly, The Casa da Índia and The Silver Fleet.
  - Home market: one domestic route is paid by Provisioning Contracts, counted by The Home Market and The Champagne Fairs, and doubled by The Return Leg.
  - Far trade: one foreign route pays The Common Road and The Exchange, comes home for The Book of Marvels, and leaves a post for The Foreign Factor, The Fondaci and Patrons Abroad.
  - Patrons: one purchase pays Civic Receipts, then counts for The Benefactors' Roll, The Endowment, The Marble Towns and Bought and Paid For.
  - Bankers: one coin kept counts for The Nest Egg, Bills of Exchange, The Money Lenders, The Bank of Saint George, War Bonds and Money at Work.
- **The build beats a pile:** the deck's best single cards are route cards, so a pile of the eight best is already close to a trade build, and the trade capstones put the builds ahead. The goods, patrons and bankers builds pass only through their late layering, five or six cards that read one quantity. A playtest should look there first.
- **Several routes:** any two core cards switch a build on.
  - Goods: Salt Tithes and The Staple Right, or Ore Caravans and Mining Districts.
  - Home market: Provisioning Contracts and The Home Market, or The Caravanserai Network and The League of Cities.
  - Far trade: The Common Road and The Exchange, or Travellers' Letters and The Foreign Factor.
  - Patrons: Civic Receipts and Private Patronage, or Financed Industry and The Benefactors' Roll.
  - Bankers: The Nest Egg and The Strongbox, or Bills of Exchange and The Money Lenders.
- **A scaler carries over** in every build (each late table names it).
- **The essentials:** every build pays science, culture and production in both versions (the table under "Three families, five builds"). Production is weakest in the far trade (one early card) and the goods build (gold converted), as the gap intends.
- **Usefulness falls with the band:** Tier 0 holds openers in four directions (goods, exploration, gold, the hoard), and Tiers III and IV hold the capstones, moments and finishers.
- **Glue is a minority:** about a tenth of the deck.

---

## The sort

Every card on the sheet: the 69 Commerce cards and the 18 in its shared table, by the rules of `docs/plans/doctrines-governments-chairs.md` §4.
- A card is typed by what it pays or does, not by what it reads. A mixed card takes the type of the half that pays more, and even halves with a Civic half go Civic.
- Charters and commissions are typed for their faces.
- A card shared with Dominion or Expansionist keeps the type in the data (Expansionist's were confirmed by the user, 2026-10-16). A card shared with Scientific, Magisterial or Devotion gets a proposed type, marked **shared, to reconcile**.
- The new cards are typed in their build tables.

| Card | Tier | Status | Type | Why |
|---|---|---|---|---|
| The Mineral Trade | 0 | live | Economic | gold on mines and quarries; the lost production is its drawback |
| Salt Tithes | 0 | live | Economic | gold and food |
| Travellers' Letters | 0 | live | Civic | science and culture |
| The Pathfinders' Company | 0 | live | Military | sight and movement for scouts |
| Coastal Estates | 0 | live | Economic | food and gold |
| Land Speculation | 0 | live | Economic | gold; the lost happiness is its drawback |
| The Map Sellers | 0 | live | Civic | even gold and culture |
| The Merchant Shrines | 0 | live | Civic | faith |
| The Assayer's Rule | 0 | live | Economic | gold |
| The Carters' Guild | 0 | live | Economic | food and gold |
| The Nest Egg | 0 | live | Civic | culture |
| Commercial Education | I | live | Civic | science |
| Ore Caravans | I | live | Economic | gold on routes |
| Civic Receipts | I | live | Civic | culture on a purchase |
| Provisioning Contracts | I | live | Economic | food and production |
| The Common Road | I | live | Civic | science and culture outweigh the gold |
| Venture Routes | I | live | Economic | gold, and a longer term |
| The Factors' Houses | I | live | Economic | gold (+2, and +25%) outweighs +4 culture |
| Bought Swords | I | live | Economic | +38% gold; question 6 would make it Military |
| Established Routes | I | live | Economic | a share of what routes pay, mostly food, production and gold |
| Private Patronage | I | live | Economic | gold; the slower building is its drawback |
| Frontier Investment | I | live | Economic | route yields and gold |
| Financed Industry | I | live | Economic | production from gold |
| The Staple Right | I | live | Economic | 3 gold against 2 culture |
| The Planters' Charter | I | live (charter, built as) | Economic | opens a gold building |
| The Market Writ | I | live | Economic | +38% gold outweighs the authority |
| Strategic Exports | II | live | Civic | science on routes; the doubled strategic copies are a resource rule |
| Mining Districts | II | live | Civic | even gold and science |
| Royal Assays | II | live | Economic | luxury copies, a resource rule |
| The Home Market | II | live | Economic | food and production; the happiness is smaller |
| The Foreign Factor | II | live | Economic | gold |
| The League of Cities | II | live | Economic | production; the authority relief is smaller |
| Foreign Procurement | II | live | Military | buying units |
| The Brokers' Redraw | II | live | Wildcard | it acts on the draft (question 9) |
| The Scholars' Roads | II | live | Civic | science and culture |
| The Customs Houses | II | live | Economic | gold; the renown is smaller |
| The Waqf | II | live | Civic | faith and culture |
| The Silk Road Monks | II | live (built as) | Civic | religious pressure and culture outweigh the gold |
| Corner the Market | II | live (commission) | Wildcard | a commission |
| The Caravanserai Network | II | live | Economic | production and gold; the happiness is smaller |
| The Exchange | II | live (built as) | Civic | science and culture |
| Numidian Cavalry | II | live (charter, built as) | Military | opens a unit |
| Houses of Account | II | live | Civic | happiness and renown |
| Caravanserai Cities | III | live | Economic | gold, and a building that carries routes |
| A Court of Merchants | III | live | Civic | renown and great people |
| The Money Lenders | III | live | Economic | gold |
| The Chartered Metropolis | III | live | Economic | food and production outweigh culture |
| The Admiralty of Trade | III | live | Economic | a route rule |
| The Gilded Scaffold | III | live | Economic | gold buys wonders; the lost production is its drawback |
| The Endowment | III | live | Civic | science |
| A Guild Commission | III | live (commission) | Wildcard | a commission |
| The Monopoly | III | live (built as) | Economic | 8 gold against 5 culture and 1 happiness |
| The Customs Service | III | live | Civic | even gold and culture |
| The Bourse | III | live | Economic | the gold buildings' own gold |
| Merchant Princes | IV | live | Civic | great people |
| The World's Exchange | IV | live | Economic | production toward the Opus |
| The Merchant Works | IV | live | Economic | production from gold |
| The Strongroom | IV | live (commission) | Wildcard | a commission |
| Patrons Abroad | IV | live | Economic | production toward the Opus |
| The Merchant Dynasties | IV | live | Civic | science and culture |
| The Spice Exchange | IV | live | Civic | science and culture |
| Money at Work | IV | live | Economic | production |
| Bought and Paid For | IV | live | Civic | 2 culture against 1 production |
| The Embargo | IV | deferred | Economic | it slows a rival's production toward the Opus |
| The Hired Garrison | IV | live | Military | buying units |
| The Neutral Flag | IV | live | Economic | +100% gold against +50% science |
| The World's Fair | IV | live (commission) | Wildcard | a commission |
| The Great Loan | IV | live (built as a commission) | Wildcard | a commission |
| The Trade Winds | IV | live | Economic | route slots and reach |
| Market Gardens (Expansionist) | 0 | live, shared | Economic | as in the data, confirmed 2026-10-16 |
| The Escorted Roads (Dominion) | I | live, shared | Economic | as in the data |
| Pilgrim Markets (Devotion) | I | live, shared | Civic | even gold and faith; **shared, to reconcile** |
| The Art Dealers (Magisterial) | I | new, shared, not in the data | Economic | gold; **shared, to reconcile** |
| The Grain Exchange (Expansionist) | I | live, shared | Economic | as in the data, confirmed 2026-10-16 |
| The Exchange of Discoveries (Scientific) | I | live, shared | Civic | science; **shared, to reconcile** |
| Travelling Players (Magisterial) | II | revised, shared | Civic | culture; **shared, to reconcile** |
| The Provincial Fair (Expansionist) | II | live, shared | Economic | as in the data, confirmed 2026-10-16 |
| The Tithe (Devotion) | II | live, shared | Economic | gold from faith, and +25% gold; **shared, to reconcile** |
| The Merchant Navigators (Scientific) | II | live, shared | Civic | +5 science outweighs +1 movement for ships; **shared, to reconcile** |
| Books from the Ships (Scientific) | II | new, shared, not in the data | Civic | science; **shared, to reconcile** |
| Merchant Scholars (Scientific) | III | revised, shared | Civic | science; **shared, to reconcile** |
| Letters of Marque (Dominion) | III | live, shared | Economic | as in the data |
| Mercenary Contracts (Dominion) | III | deferred, shared | Military | as in the data |
| War Bonds (Dominion) | III | live, shared | Military | as in the data |
| Professional Soldiers (Dominion) | III | live (built as), shared | Military | as in the data |
| The Chartered Company (Dominion) | III | live (charter, built as), shared | Military | as in the data |
| The Cosmopolitan Court (Magisterial) | III | live, shared | Civic | renown outweighs the gold on works; **shared, to reconcile** |

### Counts

| Tier | Military | Economic | Civic | Wildcard | All | With this pass's new cards and moves |
|---|---|---|---|---|---|---|
| Tier 0 | 1 | 6 | 4 | 0 | 11 | 11: 1 M, 6 E, 4 C |
| Tier I | 0 | 12 | 3 | 0 | 15 | 17: 13 E, 4 C |
| Tier II | 2 | 6 | 7 | 2 | 17 | 21: 2 M, 7 E, 10 C, 2 W |
| Tier III | 0 | 7 | 3 | 1 | 11 | 22: 10 E, 9 C, 3 W |
| Tier IV | 1 | 7 | 4 | 3 | 15 | 14: 1 M, 8 E, 3 C, 2 W |
| **All** | **4** | **38** | **21** | **6** | **69** | **85: 4 M, 44 E, 30 C, 7 W** |
| Shared | 4 | 7 | 7 | 0 | 18 | |

- The shared cards by tier: Tier 0, 1 Economic; Tier I, 3 Economic and 2 Civic; Tier II, 2 Economic and 3 Civic; Tier III, 4 Military, 1 Economic and 2 Civic.
- One exclusive card is deferred (The Embargo, Economic), so 68 are dealt today. Two shared cards are not in the data yet (The Art Dealers, Books from the Ships), and one is deferred (Mercenary Contracts).
- "With this pass" adds the 15 new cards and The Return Leg, and moves The Spice Exchange to Tier II and The Strongroom to Tier III. Question 6 would make Bought Swords Military, so Tier I would be 1 M, 12 E, 4 C.

### Close calls

- **The Factors' Houses, The Staple Right, The Market Writ, The Monopoly** (Economic): in each the gold half pays more by face value, though early culture is worth about three times its face. If the user weighs culture that way, The Factors' Houses and The Staple Right become Civic.
- **The Common Road** (Civic): +3 science and +3 culture against +3 gold, and the host's +3 gold is not the seat's.
- **The Map Sellers, Mining Districts, The Customs Service, Pilgrim Markets, and the new The Silver Towns** (Civic): even halves, one of them Civic.
- **Strategic Exports** (Civic): science on routes against doubled strategic copies, which feed the army. If the copies are read as the larger half, it is Economic.
- **The Brokers' Redraw** (Wildcard): it acts on the draft. Read as a way to spend gold, it is Economic (question 9).
- **The Gilded Scaffold** (Economic): it buys wonders, whose pay is mostly culture and renown, but what the card does is let gold buy.
- **Merchant Princes** (Civic): great people, bought with gold.
- **Bought and Paid For** (Civic): 2 culture against 1 production.
- **The Neutral Flag** (Economic): +100% gold against +50% science.
- **Among the new cards:** Safe Conduct is Economic as a route rule, though in the far trade the routes it keeps pay mostly science and culture. The Casa da Índia is Economic as a resource rule, though part of what a copy pays is happiness.

### Where a tier leans, and what it means under each government

- **Tier 0 leans Economic** (6 of 11) and has one Military card, The Pathfinders' Company. So under the Chiefdom (1 Military, 1 Economic, 1 Wildcard) a Commerce seat can fill all three chairs itself.
- **Tier I is the deck's weakest tier for the chairs:** 12 Economic and 3 Civic, and nothing else. At draft 4 the Council of Elders (1 M, 2 E, 1 C, 1 W) and the Priest-King (1 M, 1 E, 2 C, 1 W) seat four Commerce cards, and War Chief (2 M) seats three. The Military chair always goes to the partner. This pass adds one Economic and one Civic card, and question 6 would add a Military one.
- **Tier II is balanced** (2 M, 6 E, 7 C, 2 W). At draft 10 the Republic (3 E, 1 C, 1 W) seats five, the Theocracy (1 M, 3 C, 1 W) five with Foreign Procurement, and Tyranny (3 M) three. Commerce is a Republic deck, as Expansionist is.
- **Tier III has no Military card of its own,** only the four shared with Dominion. Today the Merchant League (1 M, 3 E, 2 C, 2 W) seats seven of it. This pass makes Tier III the deck's deepest tier, 22 cards (10 E, 9 C, 3 W), so Divine Mandate (3 C) suits the far trade and the patrons, and the Merchant League suits the goods, the home market and the bankers.
- **Tier IV leans Economic.** The Estates (4 E, 3 W) seat it. Under the Curia (4 C) the Civic chairs take the carried scalers. The Sultanate (4 M) seats Commerce badly: its Military chairs need the partner, or the bankers' War Bonds and The Hired Garrison.
- **Each build leans its own way,** which steers its government. The goods build, the home market and the bankers lean Economic and suit the Republic, the Merchant League and the Estates. The far trade and the patrons lean Civic and suit the Priest-King, the Theocracy, Divine Mandate and the Curia. So the government a seat adopts steers which Commerce build leads, as the typed chairs intend.

---

## Open questions for the user

Each starts with the recommendation.

1. **The shape.** *Recommended: three families and five builds, as above.* The goods build stands alone. The trade build is a core plus the home market and the far trade. The treasury build is a core plus the patrons and the bankers. The great merchants are a splash, not a sixth build, because every Market and Harbour already pays merchant renown. This follows the Expansionist structure you liked.
2. **Five new shapes on existing mechanics.** *Recommended: yes to all five:*
   - a domestic route that also pays its home town (The Return Leg);
   - a moment when a route completes its term (The Book of Marvels);
   - every copy of a luxury counting, as silver and gold already do from age 3 (The Casa da Índia);
   - a tally of turns ended holding at least a sum of gold (The Strongbox);
   - monopolies as a commission goal (The Merchant Adventurers).
3. **Safe Conduct: war no longer ends your trade routes or stops your posts paying.** *Recommended: yes, as the far trade's Tier III rare capstone.* It is the largest rule change in this pass. Caravans can still be plundered, and the host still takes its line. If you would rather not touch war, the alternative is a doubler: "Your trade routes to other empires pay double science and culture" (an existing shape: the retired The Exchequer doubled route yields).
4. **Three moves.** *Recommended: yes to all three.*
   - The Spice Exchange, Tier IV to II: the goods build's early scaler, because copies carry over.
   - The Strongroom, Tier IV to III: the bankers' moment, so their build works without Tier IV.
   - The Return Leg, the deferred Tier I data row, to Tier III as a rare that pays the home town in full, not a third.
5. **Four small fixes.** *Recommended: all four.*
   - **Established Routes:** twenty turns, not thirty. That is one full term, the age a post needs, so both early core cards start paying at the same time. Also teach the bots to turn renewal on: they never do, which is why the card paid nothing in their games.
   - **The Carters' Guild:** move it to Tier I, where the first caravans lay the roads it reads. In age 1 only Expansionist's founding road makes it pay.
   - **The World's Fair:** a goal of twelve routes, not six, so it is a target for a trade build at Tier IV and not a free reward.
   - **The Consulate** (a data-only row): retire it, since it is a purchase discount.
6. **Bought Swords as Commerce's Tier I Military card.** *Recommended: rework it:* "Your towns may buy two military units a turn instead of one. Military units take 10% more production to train." That is a new shape (the one-a-turn limit raised, beside The Hired Garrison's rule). Ruling (qqqqqq) 1 turned its unit discount into +38% gold, and the "gained" ruling made its last sentence redundant, so today it is a gold card. Commerce has no Military card at Tier I, so a Commerce seat always gives its Tier I Military chair to the partner.
7. **The ten gold-percentage cards.** *Recommended: no change before a Commerce playtest, and no new ones.* Each has its own scope and drawback, and gold is the deck's currency.
8. **The shared cards.**
   - **Types.** *Recommended: confirm them now, as you did for Expansionist's shared cards:* Civic for Travelling Players, Pilgrim Markets, Merchant Scholars, The Merchant Navigators, Books from the Ships, The Exchange of Discoveries and The Cosmopolitan Court; Economic for The Art Dealers and The Tithe. The Scientific and Magisterial drafts written today give their seven the same types; Devotion's two are not drafted yet.
   - **Merchant Scholars,** which the Commerce sheet left open. *Recommended: keep the sheet's text, "+2 science for every great work improvement in the origin city", rather than Scientific's narrowing to Academies.* A shared card is dealt to every seat that holds either deck, so a Commerce seat without Scientific draws it too, and its own works are customs houses. Counting every family keeps it a bridge between the far trade and the great merchants.
9. **The Brokers' Redraw is Wildcard.** *Recommended: yes,* because it acts on the draft, not on a yield. The same reading makes Magisterial's reroll cards Wildcard.

After these, the deck pass goes on to the sheet: every new card as an `add` row, the moves, the fixes and the Type column. Then come Commerce's Doctrines, one direction per build.
