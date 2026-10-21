# Commerce: a way to play, built from four themes (proposal)

**Status:** first draft, 2026-10-21. Nothing here is built. The deck sheet (`docs/decks/commerce.md`), the data and the code are unchanged. This is the Commerce deck pass on the method of 2026-10-20 (the card-design skill, "A way to play, built from a few themes"), done in the same way as the Scientific, Dominion and Expansionist passes (`docs/plans/scientific-themes.md`, `docs/plans/dominion-themes.md`, `docs/plans/expansionist-themes.md`). It replaces the builds of `docs/plans/commerce-builds.md` (2026-10-17); that file's map of materials, its six facts and its leaders still hold, and they are refreshed here. The review list is `docs/plans/commerce-list-proposed.md`.

Your request, 2026-10-21, verbatim:

> *"Let's do a pass on commerce now."*

The direction for every pass, 2026-10-20, verbatim:

> *"claude, i think you can do it. you can be a great card designer, don't be afraid to opinionated, bold, bias towards things that are interesting and fun rather than focusing on numbers. try to focus on not adding new sources of user inputs and operate on what mechanics we have. if there's an interesting compelling feature that would affect multiple decks, and could enable some design ideas, let me know."*

Your picture of the deck, 2026-10-20, verbatim (`docs/decks/deck-design.md`, "Direction, 2026-10-20"):

> *"commerce: aquire wealth, active on the map but more from a trade/commerce lens. Should encourage this player to send trade routes internally and externally, this should be the faction most interested in trade deals/diplomacy. Build infrastructure through connections and should offer the most flexibility of each of the builds. takes advantage and strength from claiming luxury resources and trading them to other players. Establishing trading posts, setting the seeds for commerce and seeing the effects of this expand throughout the ages. It would be cool to feel like a player that lets the economy grow and gain passive bonuses from wealth as populations grow and the world becomes more connected."*

The table of 2026-10-20 says Commerce is paid for connections (routes, posts, deals), is strongest steadily and more as the world connects, and gives up production and needs partners at peace. The splits give Commerce flexibility in what it buys. The pass also follows your taste from the three passes before it: cut what is not impactful, too strong or "win more"; prefer a rule-breaker that bends one core rule; prefer late pay as a percentage; merge two cards with one job; and make bridging cards shared cards. It does not write Doctrines (Commerce has none yet).

## 1. How to read this

- **Chairs:** 3 at the start, 5 at Tier I (draft 4) and Tier II (draft 10), 8 at Tier III (draft 18), 11 at Tier IV (draft 26). Charters take no chair.
- **Tiers in turns** (the bot model): Tier I from about turn 32, II from 72, III from 133, IV from 161.
- **Role:** *supply* (more of the thing), *widen* (the thing pays something it did not), *multiply* (the thing's output grows), *act* (a choice or a moment). A *capstone* breaks a rule or doubles a category. *Engine glue* raises or spends the engine itself. A *bridge* serves two themes.
- **Status:**
  - *kept*: on the sheet and in the data, unchanged;
  - *trimmed*: on the sheet; one clause goes, usually a gold percentage that ruling (qqqqqq) 1 put there in place of a purchase discount;
  - *reworked*: on the sheet, changed by this pass;
  - *moved*: to another tier, or to the shared cards;
  - *new*: not on the sheet. "(10-17)" marks a card from the superseded builds pass; "(data row)" marks a deferred row in `data/decks/commerce.json` that the sheet does not list;
  - *cut*: on the sheet; its data row is retired.
- **Shape:** *existing*, *near existing* (two built pieces joined, or one small field), *new shape* (section 7), or *feature A* / *feature D* (section 6).
- **Type:** Military, Economic, Civic or Wildcard (`docs/plans/doctrines-governments-chairs.md`, section 4).
- **A post** is a trading post: a route that touches a town for a full term (twenty turns) leaves the sender's post there, at both ends, for good (`City.posts`, `cityHoldsPost`). A post abroad pays only at peace and while the town is not blockaded (`cityPostPays`).
- **Numbers are first guesses** against the power bar. The effort went into shape.

## 2. The map

### The way to play

- Commerce connects. It claims the goods the world wants, sends caravans to its own towns and to every court it meets, signs swaps at the table, and leaves a trading post in every town its caravans serve for a full term. Every theme ends in gold, and gold buys whatever the moment needs.
- It is paid for connections (routes, posts, deals). It is strongest steadily, and stronger as the world fills up and connects: the posts it planted early pay more as their towns grow, and the hoard it keeps earns more as it grows. It gives up production, and it needs partners at peace.
- It is the most flexible deck. Each theme can carry a seat alone, the two trade themes trade places when a war closes a border, and gold buys any of the three essentials.

### The engine

- **Gold, and what it buys.** The deck makes gold in bulk and can spend it on anything the game sells: a route (a caravan is hired with gold), a hex, a building, a unit, a great-person draft, and with cards a wonder. That is the split of 2026-10-20: Commerce is flexible in what it buys. Section 3 has the details.

### What changes from the builds

- The pass of 2026-10-17 had five builds in three families: the goods; the trade core with the home market and the far trade; the treasury core with the patrons and the bankers; and the great merchants as a splash. Each build was one loop on one quantity, and most cards paid gold. By my count 30 of the sheet's 69 cards pay gold (43%), and ten carry a +25% to +38% gold percentage. That is Commerce's one note.
- The themes keep the builds' materials and sort them by what the player does:
  - **the patrons become the engine.** A route is hired, a hex is bought and a building is bought, so purchases serve every theme. Their cards are engine glue;
  - **the home market** and **the far trade** become two themes, joined by the posts (both ends of a route get one) and by Established Routes;
  - **the goods take the deals.** Luxuries are claimed (a hex bought), held (copies) and traded at the table (feature D, section 6);
  - **the bankers take the great merchants,** so the great-people area has a theme of its own;
  - five gold percentages are trimmed, and the new cards pay science, culture, production, happiness and authority.

### Materials

"Self-producing" means a Commerce game makes it whether or not a card asks.

| Material | Self-producing? | In the sim | Theme |
|---|---|---|---|
| Gold and the treasury | Yes | `Player.gold`; count `bankedGold`; 4 gold buys a hammer | bankers, engine |
| Gold spent | Yes | `Player.goldSpent`, written by `spendGold` for a route hired, a hex, a building, a unit and a great-person draft; the `goldSpent` tally; the `purchase` and `tilePurchase` moments | engine |
| Buildings bought | For a seat that buys | count `purchasedBuildings` (by town, by bank) | engine |
| Domestic routes | Yes, from age 2 (Currency) | count `internalTradeRoutes`; scope `routeEndsHere` with `crossing`, `direction`, `atLeast` | home market |
| Roads the caravans lay | Yes, by land routes | `Tile.road`, count `roadHexes`, scope `connected`, the `joinedToCapital` moment. Roads and joined towns are Expansionist's material too | home market |
| Posts in your own towns | Yes: both ends of a route kept a full term | `City.posts`, scope `holdsPost` | home market, far trade |
| Foreign routes and partners | Yes, at peace | counts `foreignTradeRoutes` (also per town), `tradePartnerEmpires`, `routeLength` | far trade |
| Posts abroad | Yes, twenty turns after a foreign route | count `postCities` (paying posts only) | far trade |
| Empires met, hexes revealed | Yes, early | counts `empiresMet` (permanent), `revealedTiles` | far trade |
| Luxury kinds and copies | From the map, the deals and The Silk Road | counts `uniqueLuxuries`, `luxuryCopies`, `duplicateLuxuries`, `monopolyLuxuries`; `resourceEffects.ts` | goods |
| Deals | Yes: bots offer swaps of their spare copies (`swapDecision`, `src/ai/diplomacy.ts`) | `state.deals`: gold, tribute, lent luxuries, open borders; twenty turns; war cancels them. No card reads them (feature D) | goods |
| Mines, quarries, plantations, fishing boats | From the map | improvement tile tests | goods |
| Strategic resources | From the map | count `improvedStrategicResources` | goods (bridge to the army) |
| Gold buildings | Yes, one of each a town | Market (a route slot, and one more per eight citizens), Bank, Bazaar, Caravanserai and Bourse (empire buildings); `buildingsOfCategory` | bankers |
| Great merchants and customs houses | Yes: every gold building pays merchant renown | the merchant's act (60 gold × the age); the customs house (+3 gold, opens the resource under it); merchant legacies | bankers |
| Merchants in the trades | In big towns with gold buildings | count `guildsmen` with a family (feature A, built in S2) | bankers |
| Route slots | Markets, Harbours, the Caravanserai, cards | `explainRouteSlots`; the `routeRider` effect, with `count` and `per` | home market, far trade |
| The Magnum Opus | In age 4 | gold may be poured into it (`contribute`) | engine, far trade |

**Moments.** A card can pay on a purchase, a hex bought, a great person's act or arrival, a town joined to the capital, and a calendar (`periodic`). No route or post announces anything: a route that starts, renews or lapses is silent, and a post ripens by a date comparison. This pass adds one moment, a post established (section 7).

### What a Commerce player wants in each age

- **Age 1 (Tier 0): claim the goods and meet the world.** Settle beside luxuries and buy the hex that holds one (Land Speculation). Scout and meet the neighbours (The Pathfinders' Company, Travellers' Letters). Keep a small purse (The Nest Egg). Find faith for a pantheon (The Merchant Shrines). No route runs before Currency, an age-2 technology.
- **Age 2 (Tier I): open the roads.** Raise the first Markets. Send caravans home first, because they are safe, then to the first partner. Accept the first swap at the table (Export Guilds). Choose to keep gold (The Strongbox) or spend it (Civic Receipts).
- **Age 3 (Tier II): the network grows.** Posts ripen at home and abroad (The Hanse, The Fondaci, The Foreign Factor). Partners multiply (The Exchange, The Treaty Ports). Copies pile up (The Spice Exchange). The purse buys what the towns cannot build.
- **Age 4 (Tiers III and IV): the world is connected.** The capstones bend the rules: both ends of a home route are paid (The Return Leg), war does not end the trade (Safe Conduct), a lent good still counts (The Commenda), gold buys a wonder (The Gilded Scaffold). The hoard compounds (The Money Lenders). Gold buys the Opus town's army and pours into the Opus.

### The areas it reaches

All five:
- **the army:** gold buys it (Bought Swords, Foreign Procurement, The Hired Garrison, and the shared War Bonds, Professional Soldiers, Mercenary Contracts and The Chartered Company), and luxuries feed one unit (Numidian Cavalry);
- **the land:** luxury hexes bought and worked, mines and plantations, and the roads the caravans lay;
- **the economy:** the home market, and the purse;
- **civic life:** happiness (The Caravanserai Network, The Home Market, Houses of Account, The Monopoly), authority (The Market Writ, The League of Cities) and faith (The Merchant Shrines);
- **great people and wonders:** the great merchants and their customs houses (the bankers), great-person drafts bought with gold (Merchant Princes, A Guild Commission), and wonders bought outright (The Gilded Scaffold).

### Its cost

Commerce gives up production, and it needs partners at peace. The cards show both:
- **Production:** The Mineral Trade (mines pay gold, not hammers), Private Patronage (buildings come slower, so you buy them), Financed Industry (production for food), Bought Swords (soldiers come slower), Foreign Procurement (units cost more), The Gilded Scaffold (15% production everywhere), The Merchant Works (gold for hammers). Gold buys hammers at 4 to 1.
- **Peace:** a war ends every route to the enemy, stops every post in its towns and cancels every deal with it. So a war switches off The Common Road, The Exchange, The Foreign Factor, The Fondaci, Export Guilds and The Treaty Ports against that empire. The home market keeps running, so a Commerce seat at war turns its caravans home. Safe Conduct is the late answer, and it is a rare.

### Pairs

- **Dominion, merchants and their guards** (no leader). Commerce gives an army bought with gold (Bought Swords, Foreign Procurement, The Hired Garrison) and the shared War Bonds, Professional Soldiers, The Chartered Company and Mercenary Contracts (reworked here, section 8). Dominion gives Military cards for the chairs Commerce cannot fill, and plunder that fills the hoard. Shared: The Escorted Roads, Letters of Marque and the four above. Tension: Dominion's wars close Commerce's foreign routes. Best with the bankers and the engine.
- **Expansionist, the land and the market** (Pachacuti). Commerce's caravans lay the roads Expansionist's frontier reads (The Milestones, The Road Towns), and gold buys hexes and settlers. Expansionist opens luxuries and mines for the goods, and its young towns are Frontier Investment's. Shared: Market Gardens, The Grain Exchange, The Provincial Fair. Best with the home market and the goods.
- **Devotion, pilgrims and markets** (Mansa Musa). Routes to holy sites (Pilgrim Markets, and Mansa Musa's The Hajj), religion carried on routes (The Silk Road Monks), and gold given to the faith (The Waqf, The Tithe). Neither deck makes production, so the pair buys everything twice over. This pass proposes The Waqf and The Silk Road Monks as shared cards (section 8). Best with the far trade and the goods.
- **Scientific, the patrons** (no leader). Foreign routes pay science for what a partner knows (Books from the Ships, built), Academies teach the caravans (Merchant Scholars), resource mines pay science (The Exchange of Discoveries), and the Printers' Charter's Aldine Press makes routes pay science and culture. Commerce buys the libraries. Tension: Scientific's The Free Cities pays only at five towns or fewer, and the home market wants many. Best with the far trade and the bankers.
- **Magisterial, the art market** (Zheng He). Gold buys drafts and great people (Merchant Princes, and The Brokers' Redraw, proposed as a shared card), each card drafted pays gold (The Art Dealers), and foreign routes pay renown (The Cosmopolitan Court). Best with the bankers and the far trade by sea.

### Leaders

- **Pachacuti** (Expansionist, Commerce) leads the home market: towns joined to the capital pay happiness and production, and Commerce's caravans lay the roads that join them. His cards: Provisioning Contracts, The Carters' Guild, The Great Fair, The Home Market, The Hanse, The Return Leg.
- **Mansa Musa** (Commerce, Devotion) leads the goods: gold on mines and camps, and routes to a holy site pay gold and faith. His cards: The Mineral Trade, Salt Tithes, Royal Assays, Mining Districts, The Monopoly, The Casa da Índia. By history he also suits the purse: his gold flooded Cairo.
- **Zheng He** (Commerce, Magisterial) leads the far trade by sea: ships move further, and routes to or from a coastal town pay gold and culture. His cards: The Common Road, Venture Routes, The Exchange, The Foreign Factor, The Admiralty of Trade, The World's Fair.
- **The gap:** no leader points at the bankers. A Dominion and Commerce leader (Venice or Carthage) would lead them. Leaders are tuned later.

## 3. The engine: gold, and what it buys

### How the engine works

- **Every theme makes gold.** Routes pay it by the citizens at their two ends. Goods pay it on hexes and for each kind held. Gold buildings and posts abroad pay it.
- **Gold buys anything.** A route, a hex, a building, a unit (one a turn of each class), a great-person draft (Merchant Princes), a wonder (The Gilded Scaffold), two soldiers a turn (Bought Swords), or units without their metal (Foreign Procurement). Gold may also be poured into the Opus.
- **Every coin spent is one record.** A route hired, a hex, a building, a unit and a great person all raise `Player.goldSpent`, so Names in Stone reads the whole engine, whichever theme the seat leans on.
- **Gold buys the gap.** A hammer costs 4 gold, so buying is dear. That is the cost: the engine trades tempo for choice.
- **Keeping is the other half.** The bankers pay for gold kept (section 4.4). Each turn the seat chooses to spend or to keep, and the hoard is never wasted: when it is spent, it buys at once.

### Engine glue

| Card | Tier | Rarity | Job | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| Civic Receipts | I | uncommon | the purchase (a moment) | Buying any building grants culture equal to 15% of the gold paid, with no cap. | culture | Civic | kept; existing |
| Bought Swords | I | uncommon | the bought army | Your towns may buy two military units a turn instead of one. Towns build military units 10% more slowly. | units | Military | reworked (was +38% gold, units 10% slower, bought units count as trained); new shape |
| Private Patronage | I | rare | buy, do not build (the cost) | Your cities gain +38% gold. Producing ordinary buildings normally takes 20% more production. Empire buildings and wonders are unaffected. | gold | Economic | kept; existing |
| Financed Industry | I | rare | gold into production | Cities gain production equal to 30% of their gold yield. Every city loses 3 food. | production | Economic | kept; existing |
| Names in Stone | II | uncommon | "this game" count (scaler) | +1% science and culture for every 200 gold you have spent buying this game, at most +30%. | science, culture | Civic | new (10-17, was The Benefactors' Roll); existing |
| Foreign Procurement | II | uncommon | the bought army | Ignore strategic resource requirements when purchasing units. All units cost 20% more. | units | Military | kept; existing |
| The Endowment | III | uncommon | bought buildings (flats) | Purchased buildings provide +2 science each, at most +6 per town. | science | Civic | kept; existing |
| The Gilded Scaffold | III | rare | capstone: rule-breaker | You may purchase world wonders. All your cities lose 15% production. | wonders | Economic | kept; existing |
| A Guild Commission | III | uncommon | act: commission | Commission. Goal: buy five buildings with gold while seated. Reward: a free great-person draft, the same offer Merchant Princes sells for gold. The card then leaves its chair. | a great person | Wildcard | kept; existing |
| Bought and Paid For | IV | rare | bought buildings (multiply) | Each town gains +4% production and culture for each building you bought there with gold, at most +24%. | production, culture | Civic | reworked (was +1 production and +2 culture for each bought building, at most six a town); existing |
| The Merchant Works | IV | rare | gold into great works | Cities building a world wonder, an empire building or the Opus gain production equal to 25% of their gold, and lose 20% of their gold. | production | Economic | kept; existing |
| The Great Loan | IV | rare | spend now | When you seat this card, gain gold equal to twenty turns of your gold income. For the next forty turns your cities lose 25% gold. The card then leaves its chair. | gold | Wildcard | kept (as built: a commission); existing |
| The Hired Garrison | IV | uncommon | the bought army | A city with a world wonder or the Magnum Opus at the front of its queue may buy any number of military units with gold each turn. | units | Military | kept; existing |

- **Glue is 13 of 78 seatable cards (17%).**
- **Names in Stone** is the engine's scaler. The Romans cut a benefactor's name into the building they paid for. Route hires count, so a trade seat that never buys a building still raises it: about 2,000 gold spent by turn 100 gives +10%, and about 6,000 by turn 150 reaches the cap.
- **Bought Swords** becomes the deck's Tier I Military card. Ruling (qqqqqq) 1 had turned its unit discount into +38% gold, and the "gained" ruling made "bought units count as trained" say nothing, so it was a gold card. Now a border town under attack buys two Swordsmen in one turn. It bends the one-unit-a-turn rule for the military class only.
- **Bought and Paid For** becomes a percentage, as you prefer late pay. The Endowment keeps the flats (science) at Tier III, so the two read the same bought buildings at two layers: flats first, then the percentage.
- **The Gilded Scaffold** is the engine's capstone, and it is the clearest case of the split: no other deck can buy a wonder. Section 9 names the one place it touches the wonder split.

## 4. The themes

### 4.1 The home market

**The fantasy:** the Champagne fairs, the towns of the Hanse, the barges on the Grand Canal. Your own towns trade with each other. The caravans carry grain and timber along the roads they lay, every town on the network builds faster, and the market towns where the roads meet become the realm's great cities. **The quantity:** domestic routes running, the towns they reach, and the posts they leave at both ends. Every Commerce seat runs routes from age 2. **Areas:** the economy, civic life (happiness, authority), the land (roads).

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| Provisioning Contracts | I | common | supply | Domestic routes grant their destination +3 food and +3 production. | food, production | Economic | kept; existing |
| The Carters' Guild | I | common | widen (infrastructure) | Towns that receive a domestic trade route build buildings 25% faster. | production toward buildings | Economic | moved from Tier 0; reworked (was +1 food and +2 gold in towns joined to the capital); existing (`productionBonus` with the `routeEndsHere` scope) |
| Frontier Investment | I | uncommon | multiply (young towns) | In your cities of 5 population or fewer, domestic trade routes pay double. | what the route pays | Economic | trimmed (its +25% gold goes); existing |
| The Factors' Houses | I | common | widen (culture); bridge to the far trade | Your cities holding your trading post gain +2 gold and +4 culture. | culture, gold | Civic | trimmed (its +25% gold goes; type was Economic); existing |
| Commission: The Great Fair | I | uncommon | act (commission) | Commission. Have domestic trade routes arrive in four of your towns at the same time. Then, for the rest of the game, you may run two more trade routes. The card leaves its chair. | route slots | Wildcard | new; near existing (a goal figure, and a lasting `routeRider`) |
| The Home Market | II | common | multiply (market towns) | Cities receiving at least two of your domestic routes gain +30% food, +30% production and +2 happiness, once per city. | food, production, happiness | Economic | kept; existing |
| The Caravanserai Network | II | common | widen (happiness) | Each city receiving a domestic trade route gains +2 happiness, once per city. | happiness | Civic | trimmed (its +2 production and +2 gold on routes go; type was Economic); existing |
| The League of Cities | II | rare | multiply (with a cost) | Cities with one of your paying outgoing routes gain +23% production and cost one less authority, minimum one. Cities without one lose 10% gold. | production, authority | Economic | kept; existing |
| The Hanse | II | uncommon | multiply (scaler) | +3% production and culture for each of your towns holding your trading post, at most +30%. | production, culture | Civic | new; new shape (a count of your own towns holding your post) |
| Caravanserai Cities | III | uncommon | supply (rule-breaker) | Caravanserais can be built in every city. | route slots | Economic | trimmed (its +30% gold goes); existing |
| The Chartered Metropolis | III | rare | multiply (with a cost) | Cities with at least three of your paying outgoing routes gain +38% food, production and culture, but each costs +4 authority while qualified. | food, production, culture | Economic | kept; existing |
| The Return Leg | III | rare | capstone (doubler) | Your trade routes between your own towns also pay their origin everything they pay their destination. | everything a home route pays | Economic | new (data row; was a third of the food, production and gold, Tier I uncommon); new shape |
| The Champagne Fairs | III | uncommon | act (the fair) | Every ten turns, each town that receives a domestic trade route grants culture equal to ten times its population. | culture | Civic | new (10-17, reworked); near existing (`periodic`, with a town figure from population as The Topping Out pays) |
| The Grain Barges | IV | uncommon | widen (passive growth) | Your domestic trade routes pay their destination +1 food and +1 production for every four citizens of their origin. | food, production | Economic | new; new shape (a route figure read from the origin's citizens) |
| The Trade Winds | IV | rare | supply; bridge to the far trade | Gain +3 trade route capacity. Your trade routes reach 50% farther. | route slots, reach | Economic | kept; existing |

- **"Build infrastructure through connections"** is The Carters' Guild: a town that receives a caravan builds its buildings a quarter faster. At age 2 a town makes about 10 production, so four receiving towns gain about +10 a turn toward buildings; at age 3, eight towns of 15 gain about +30. Production is the deck's gap, and here the network answers it. The old text paid towns joined to the capital, which is Expansionist's reading (roads), and paid nothing in age 1.
- **The Great Fair** is the theme's early act. Four towns receiving a caravan at once is a network, and the reward is two more routes for good, about 16 food and production a turn in age 3 with no chair.
- **Scaler: The Hanse.** The Hanseatic League was a league of towns that each kept the others' merchants. A domestic route kept a full term leaves your post at both ends, so posts at home only grow. Six post towns give +18%, about 34 a turn in age 3. Ten in age 4 reach the cap, about 270 a turn.
- **Capstone: The Return Leg.** Today a home route pays only the town it reaches. With this card the town it left is paid the same, once, and that second payment never travels again. Every card that pays a home route pays twice: Provisioning Contracts, Frontier Investment, The Grain Barges, and the shared Market Gardens and The Grain Exchange. Fifteen home routes at about 15 a route are about 225 a turn, a doubler only a deep category earns.
- **The Champagne Fairs** reads the towns' citizens, so the fair grows as the realm grows: eight receiving towns of 14 citizens hold a fair worth 1,120 culture every ten turns, about 110 a turn, band 3's regular card.
- **The Grain Barges** is your "passive bonuses as populations grow": a big town feeds the towns its barges reach. Twelve home routes from towns of 16 pay +4 food and +4 production each, about 96 a turn.
- **What its widen cards pay:** production toward buildings (The Carters' Guild), culture (The Factors' Houses, The Champagne Fairs), happiness (The Caravanserai Network), authority (The League of Cities), and food and production by population (The Grain Barges).
- **The split with Expansionist:** roads and joined towns are Expansionist's frontier (The Road Towns, Provincial Councils, The Imperial Roads, The Milestones). This theme reads routes and posts, never roads. The Paved Realm (10-17), a road scaler, is not taken: The Milestones already reads the roads Commerce's caravans lay.
- **Bridges:** The Factors' Houses and The Trade Winds (to the far trade), Established Routes (from the far trade), Ore Caravans (from the goods).
- **Shared cards that serve it:** Market Gardens, The Grain Exchange, The Provincial Fair (Expansionist), The Escorted Roads (Dominion).

### 4.2 The far trade

**The fantasy:** Venice's houses in Alexandria and Bruges, the Sogdians on the Silk Road, Marco Polo at the court of the Khan, Zheng He's fleets. Caravans and ships go to every court in the world, a house stands in every foreign port, and the learning and songs of the world come home. Each house pays more as its town grows. **The quantity:** empires met, foreign routes and partners, and posts abroad, which stay for good. **Areas:** civic life (science and culture), and the world beyond the borders.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| Travellers' Letters | 0 | common | widen (contacts) | Your capital gains +2 science and +2 culture, plus +1 of each per foreign empire met, no cap. | science, culture | Civic | kept; existing |
| The Pathfinders' Company | 0 | uncommon | supply (contacts) | Scouts gain +1 sight and +1 movement. | movement, sight | Military | kept; existing |
| The Map Sellers | 0 | common | widen (exploration) | Your capital gains +1 gold and +1 culture for every 40 hexes you have revealed, at most +8 of each. | culture, gold | Civic | kept; existing |
| The Common Road | I | common | widen | Your foreign routes grant you +3 gold, +3 science and +3 culture. Each also grants its host city +3 gold. | science, culture, gold | Civic | kept; existing |
| Venture Routes | I | uncommon | supply (reach) | Your trade routes gain two turns of range. Trade routes between cities at least fifteen hexes apart gain +100% gold. | reach, gold | Economic | kept; existing |
| Established Routes | I | uncommon | multiply (age); bridge to the home market | A trade route you have kept up for at least twenty turns pays 50% more. A route that lapses, is cancelled or is plundered begins its term again. | everything a route pays | Economic | revised (thirty turns to twenty); existing |
| The Homeward Cargoes | I | common | widen (production) | Each town gains +3 production for every trade route to another empire that sets out from it. | production | Economic | new (10-17); existing (`foreignTradeRoutes` with `within: 'city'`) |
| The Exchange | II | uncommon | multiply (scaler: partners) | Each different foreign empire your routes currently serve grants +5% science and culture empire-wide. Foreign routes to your cities grant +2 science and +2 culture to both you and the sender. | science, culture | Civic | kept (as built); existing |
| The Scholars' Roads | II | rare | multiply (with a cost) | Lose 4 route capacity. Your routes gain +2 science and +2 culture, and gain +50% science and culture. | science, culture | Civic | kept; existing |
| The Foreign Factor | II | common | widen; scaler (the post grows with its town) | Each foreign town holding your trading post gives you +1 science and +1 culture for every four of its citizens. Its owner gains +2 gold. | science, culture | Civic | reworked (was +5 gold to you and +2 gold to the host for each post; type was Economic); new shape (a count of citizens in foreign towns holding your post) |
| The Fondaci | II | uncommon | act; bridge to the home market | Each time one of your trading posts is established, gain science and culture, each equal to twenty times the population of its town. | science, culture | Civic | new (the name is the 10-17 pass's); new shape (a moment when a post is established) |
| Safe Conduct | III | rare | capstone (rule-breaker) | Declaring war, or being declared on, does not end your trade routes, and your trading posts keep paying in war. | what the routes and posts pay | Economic | new (10-17); new shape |
| The Admiralty of Trade | III | uncommon | supply (reach) | Your trade routes to a town holding your trading post have no range limit. | reach | Economic | reworked (was a sea route between two post towns; rarity was rare); near existing (`postsWaiveSeaRouteRange`, widened) |
| The Lingua Franca | III | uncommon | multiply (the world connects) | +1% science and culture for every three trade routes running anywhere in the world, at most +30%. | science, culture | Civic | new; new shape (a count of every live route in the world) |
| The World's Exchange | IV | rare | finisher (the Opus) | +10% production toward the Opus for each foreign empire your trade routes reach, at most +40%. | production toward the Opus | Economic | kept; existing |
| The Neutral Flag | IV | uncommon | widen (other empires' wars) | Your trade routes to an empire that is at war with another empire gain +100% gold and +50% science. | gold, science | Economic | kept; existing |
| The World's Fair | IV | rare | act (commission) | Commission. Have trade routes to four other empires at the same time. Then your trading post is established in the capital of each of them. The card leaves its chair. | posts | Wildcard | reworked (was six routes, then +50% science and culture for ten turns); new shape (a goal figure of partners, and a reward that establishes posts) |

- **The posts carry the theme through the ages.** A post abroad takes a full term to establish and then stays, and The Foreign Factor pays it by its town's citizens. So a post planted in age 2 pays more in age 4 without any new act: four posts in towns of 10 give +8 science and +8 culture in age 3, and eight posts in towns of 16 give +32 of each in age 4. This is your "setting the seeds for commerce and seeing the effects of this expand throughout the ages", and your "passive bonuses ... as populations grow". The host's +2 gold stays, so the partner has a reason to keep the peace.
- **The Fondaci** is the theme's moment. Venice's *fondaci* were the merchants' houses in a foreign port, and in Venice itself. A post established in a town of 12 pays 240 science and 240 culture. Posts at home count too, so the card bridges to the home market.
- **The Lingua Franca** is your "as the world becomes more connected". It reads every route on the board, rivals' included, so a Commerce seat gains when anyone trades. Forty-five routes in the world give +15%. The name is the common trade tongue of the Mediterranean.
- **Capstone: Safe Conduct.** A merchant's letter that let them travel in war. Today a war ends every route between the two empires and stops every post in the enemy's towns. With this card the routes keep running and paying and the posts keep paying. A caravan can still be plundered, and no new route may be sent to an enemy. It bends the one rule the far trade is built around, and it answers the deck's cost late.
- **The World's Fair** keeps the deck's moment at Tier IV, but the reward plants posts: in the capital of every empire the seat trades with when the goal is met. Capitals are big, so each post pays The Foreign Factor at once. The goal moves from six routes, which a trade seat met for nothing, to four partners, which is a diplomatic goal.
- **Established Routes** asks for twenty turns, not thirty. A route term is twenty turns and a renewal keeps the route's start, so a route in its second term pays half again. It paid nothing in bot games because bots never renew; the bots should learn to renew (question 8).
- **What its widen cards pay:** science and culture (Travellers' Letters, The Common Road, The Foreign Factor), culture (The Map Sellers), production (The Homeward Cargoes), and science from other empires' wars (The Neutral Flag).
- **Cut:** Patrons Abroad (the Opus town gains +3 production for each post abroad), because The World's Exchange does the same job as a percentage (section 8).
- **Bridges:** The Factors' Houses and The Fondaci (to the home market), The Capitulations (to the goods), The Customs Service and The Merchant Guilds (from the bankers).
- **Shared cards that serve it:** Books from the Ships, Merchant Scholars, The Merchant Navigators (Scientific); Travelling Players, The Cosmopolitan Court (Magisterial); Pilgrim Markets and The Silk Road Monks (Devotion).

### 4.3 The goods

**The fantasy:** the gold and salt of Mali, the spice islands, the purple of Tyre, the silver of Laurion. An empire that claims the goods the world wants, holds more of them than anyone, and trades them at the table. **The quantity:** luxury kinds and copies held, monopolies, and copies lent and borrowed in deals. The map gives the deposits, the bots offer swaps of their spare copies, and the cards make more copies. **Areas:** the land, civic life (happiness, faith), the table, and through one unit the army.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| Salt Tithes | 0 | common | supply (kinds pay) | Gain +3 gold per distinct accessible improved luxury you produce. Worked luxury tiles gain +1 food. | gold, food | Economic | kept; existing |
| The Merchant Shrines | 0 | common | widen (faith); the early faith | Your capital gains +2 faith. Cities working an improved luxury gain +1 faith, once per city. | faith | Civic | kept; existing |
| The Assayer's Rule | 0 | uncommon | widen | Worked resource tiles that supply gold gain +1 gold. | gold | Economic | kept; existing |
| The Mineral Trade | 0 | common | widen (the cost) | Worked mines and quarries gain +2 gold but lose 1 production. | gold | Economic | kept; existing |
| Land Speculation | 0 | uncommon | act (a claim) | Buying a hex with a resource on it grants culture equal to half the gold paid. | culture | Civic | reworked (was +25% gold and −2 happiness in the capital; type was Economic); near existing (a `tilePurchase` rider paid from the gold, as Civic Receipts is, with a resource test on the hex) |
| The Staple Right | I | common | widen (culture) | Gain +3 gold and +2 culture for each luxury you hold two or more copies of. | gold, culture | Economic | kept; existing |
| Ore Caravans | I | common | bridge to the trade themes | Trade routes gain +1 gold for every mine in their origin city. | gold | Economic | kept; existing |
| Export Guilds | I | uncommon | widen (exports) | Each luxury you lend to another empire in a deal gives your capital +4 culture and +2 production. | culture, production | Civic | new (data row, reworked); feature D |
| The Planters' Charter | I | uncommon | supply (charter) | Once drafted, unlock the Plantation House for construction. No chair required. The building is purchased with gold. | food, gold | Economic | kept (as built: +1 gold, and +1 food and +1 gold on each worked plantation); existing |
| Royal Assays | II | uncommon | supply (copies) | Each improved luxury resource deposit with a mine provides one additional copy of that luxury. | copies | Economic | kept; existing |
| Mining Districts | II | uncommon | widen (science) | Worked mines gain +2 gold and +2 science for every two adjacent mines. | gold, science | Civic | kept; existing |
| The Spice Exchange | II | rare | multiply (scaler) | Every city gains +5% science and +5% culture for each luxury you hold two or more copies of, at most +30%. | science, culture | Civic | moved from Tier IV; existing |
| Corner the Market | II | uncommon | act (commission) | Commission. Goal: control four copies of one luxury, counting copies you receive in deals. Reward: a great merchant and 225 gold. The card then leaves its chair. | a great merchant | Wildcard | kept; existing |
| Strategic Exports | II | uncommon | bridge to the army | Trade routes gain +2 science per improved strategic resource deposit in their origin city. Your strategic resource deposits provide twice their normal quantity. | science, strategic copies | Economic | kept (type was Civic: the doubled copies are the larger half); existing |
| The Treaty Ports | II | uncommon | multiply (the table) | +5% production for each empire you hold a deal with, at most +25%. | production | Economic | new (data row, reworked); feature D |
| Numidian Cavalry | II | uncommon | widen (the army; charter) | Once drafted, unlock Numidian Cavalry, a Horseman replacement. No chair required. Gains +1 combat strength per distinct luxury you control. | strength | Military | kept (as built: every luxury counts in full); existing |
| The Monopoly | III | rare | pay-off | For each luxury you hold three or more copies of and no other empire holds, gain +8 gold, +5 culture and +1 happiness in every city. | gold, culture, happiness | Economic | kept (as built: the happiness is +1 for the empire); existing |
| The Commenda | III | rare | capstone (rule-breaker) | Luxuries you lend in a deal still count for you. | the luxuries' pay | Economic | new; new shape |
| The Capitulations | III | uncommon | supply; bridge from the far trade | Each foreign town holding your trading post lends you one of its luxuries that you lack, at half value. | kinds on loan | Economic | new; new shape (The Silk Road's loan, read from posts) |
| The Casa da Índia | IV | rare | finisher (doubler) | Every copy of a luxury you hold pays its yields, not only the first. | the luxuries' yields | Economic | new (10-17); new shape (`perCopy` for every luxury) |

- **Claim, hold, trade.** The theme asks for three things, and each has its cards:
  - **claim:** buy the hex (Land Speculation), mine the deposit (Royal Assays), plant the post (The Capitulations);
  - **hold:** copies pay (The Staple Right, The Spice Exchange, The Monopoly, Corner the Market);
  - **trade:** lend at the table (Export Guilds, The Treaty Ports, The Commenda).
  Holding and trading pull against each other. A spare copy kept pays The Spice Exchange; a spare copy lent pays Export Guilds and brings home a kind you lack, which pays Salt Tithes. That choice comes every time a bot offers a swap, and it is the theme's real decision.
- **Land Speculation** pays half the hex's price as culture. A 50-gold hex with a resource pays 25 culture, about two drafts at turn 30. That is your 2-to-1 rate between gold and other yields. The old text was ruling (qqqqqq) 1's conversion of a hex discount into +25% gold, which lost the card's subject.
- **Export Guilds** (feature D): three copies lent give +12 culture and +6 production, band 1's regular card. The bots already offer swaps of their spare copies, so a Commerce seat sees offers without asking.
- **The Treaty Ports** (feature D): three partners with a live deal give +15% production. The table pays the deck's gap.
- **Capstone: The Commenda.** In the medieval *commenda* an investor sent goods abroad with a travelling merchant and kept their share of them. Today a lent copy leaves your count. With this card it stays: you can lend your last silk to two neighbours and keep its happiness and its yields. Each copy is still lent once (section 7). It turns the table from a trade into a gift that costs you nothing, which makes Commerce the empire every neighbour wants to deal with.
- **The Capitulations** were the trading rights the Ottoman sultans granted to foreign merchants' houses. Each paying post abroad lends one kind its town works, at the half value The Silk Road's caravans lend. The far trade's posts become the goods' supply.
- **Finisher: The Casa da Índia,** Lisbon's royal house of the spice trade. Today silver and gold pay for every copy from age 3 (`perCopy`); every other luxury pays once. With this card every copy pays its yields. The happiness still counts once a kind (a reading, section 7), so the meters do not run away. One more copy of gems pays about 27 gold in twelve towns.
- **What its widen cards pay:** food (Salt Tithes), faith (The Merchant Shrines), culture (Land Speculation, The Staple Right, Export Guilds), production (Export Guilds), science (Mining Districts, Strategic Exports), strength (Numidian Cavalry), and strategic copies for an army (Strategic Exports).
- **Cut:** Coastal Estates (plantations and fishing boats +1 food and +1 gold), filler that pays the deck's own yield (section 8).
- **Bridges:** Ore Caravans (to the trade themes), Strategic Exports and Numidian Cavalry (to the army), The Capitulations (from the far trade).
- **Shared cards that serve it:** The Exchange of Discoveries (Scientific), The Provincial Fair (Expansionist), The Tithe (Devotion).

### 4.4 The bankers

**The fantasy:** the Medici, the Fuggers, the Bank of Saint George. Gold kept is power held. A banking house's family calls great merchants, plants counting houses on the land, and lends to kings. **The quantity:** gold in the treasury, gold buildings, and great merchants with their customs houses. Every gold building pays merchant renown, and a seat that does not spend fills its treasury. **Areas:** great people, the economy, civic life (authority, happiness), and through the shared War Bonds the army.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Nest Egg | 0 | common | widen (the hoard pays culture) | Your capital gains +1 culture for every 50 gold in your treasury, at most +4. | culture | Civic | kept; existing |
| Commercial Education | I | common | widen (science) | Gold buildings provide +3 science. | science | Civic | kept; existing |
| The Market Writ | I | uncommon | widen (authority) | +1 authority for every two Markets in your empire. | authority | Civic | trimmed (its +38% gold goes; type was Economic); existing |
| The Strongbox | I | uncommon | multiply (grower) | While seated, this card gains +1 science and +1 culture each turn you end with at least 300 gold in your treasury, up to +15 of each. | science, culture | Civic | new (10-17); new shape (a tally of turns ended holding gold) |
| Houses of Account | II | common | supply (merchant renown); widen (happiness) | Gold buildings provide +2 happiness and +1 renown. | happiness, renown | Civic | kept; existing |
| Bills of Exchange | II | uncommon | multiply (the hoard) | Every town gains +1% production for every 100 gold in your treasury, at most +30%. | production | Economic | new (10-17); existing |
| The Customs Houses | II | uncommon | widen (science and culture) | Each customs house in your borders gives its town +4 science and +4 culture, whether or not it is worked. | science, culture | Civic | reworked (takes The Merchant Dynasties' job; was +5 gold and +1 renown on customs houses and +38% gold in their towns; type was Economic); existing |
| The Merchant Guilds | II | uncommon | bridge to the trade themes | You may run one more trade route for every two merchants in the trades. | route slots | Economic | new; feature A, near existing (`routeRider` with `count: 'guildsmen'`, narrowed to merchants) |
| The Money Lenders | III | rare | capstone (interest with no cap) | Earn interest equal to 4% of your treasury each turn, with no cap. | gold | Economic | kept; existing |
| A Court of Merchants | III | rare | supply (with a cost) | Gain +50% renown, but great-person offers contain only Great Merchants. | renown | Civic | kept; existing |
| The Bourse | III | rare | multiply (gold buildings) | Gold buildings produce 75% more of their own yields. | gold | Economic | kept; existing |
| The Strongroom | III | uncommon | act (commission) | Commission. Goal: end a turn with at least 1,500 gold in your treasury. Reward: culture equal to a fifth of your treasury at that moment, and a great merchant. The card then leaves its chair. | culture, a great merchant | Wildcard | moved from Tier IV; revised (2,000 gold to 1,500; rarity was rare); existing |
| The Customs Service | III | uncommon | bridge to the trade themes | Trade routes leaving a city whose borders hold a customs house gain +3 gold and +3 culture. | culture, gold | Civic | kept; existing |
| Money at Work | IV | rare | widen (the hoard pays science) | Every town gains +1 science for every 500 gold in your treasury. | science | Civic | reworked (was +1 production in the capital for every 50 gold, at most +40; type was Economic); existing |
| Merchant Princes | IV | rare | act (gold buys great people) | Gold may purchase great-person drafts at the existing escalating offer price, with normal availability and purchase limits. | great people | Civic | kept; existing |

- **Keep or spend.** The theme pays for gold kept, and the engine pays for gold spent. A banker keeps while the hoard pays most (The Strongbox, Bills of Exchange, The Money Lenders) and spends it at once when a purchase decides the game. The Strongbox keeps what it earned when the gold is spent, and Names in Stone rewards the spending, so a seat that does both loses nothing.
- **Scaler: The Strongbox,** a grower from Tier I. Seated at turn 40 and held above 300 gold, it is full by about turn 60: +15 science and +15 culture, a band 1 headline and a band 2 regular card, which it keeps for good.
- **Bills of Exchange** reads the hoard as a percentage, so the bankers reach production, the deck's gap: 1,500 gold in age 3 gives +15% (about 16 a turn), and 3,000 in age 4 reaches the cap (about 140 a turn). Money at Work used to pay production from the hoard too, so it now pays science: 5,000 gold gives each of twelve towns +10, about 120 a turn, with no cap, as you ruled for late engines.
- **Capstone: The Money Lenders.** 4% a turn compounds: 3,000 gold earns 120 a turn and doubles in about eighteen turns. Every card here reads the hoard it grows. You ruled it uncapped (2026-10-12): *"these are the late game engines and orders that allow players to 'break the game'"*.
- **The great merchants.** Every Market and Harbour pays merchant renown, Houses of Account adds more, and A Court of Merchants makes every offer a merchant. A merchant's act pays gold; its work, the customs house, now pays science and culture through The Customs Houses (three customs houses: +12 of each) and culture on routes through The Customs Service. The two commissions (Corner the Market, The Strongroom) also bring a merchant. Merchant Princes buys great people of any family.
- **The Merchant Guilds** (feature A) bridges the bankers to the trade themes: big towns with gold buildings fill the merchants' trade, and every two merchants open one more route. Four merchants give two routes.
- **What its widen cards pay:** culture (The Nest Egg), science (Commercial Education, The Customs Houses, Money at Work), authority (The Market Writ), happiness (Houses of Account), production (Bills of Exchange), and strength through the shared War Bonds.
- **Merged:** The Merchant Dynasties into The Customs Houses: two cards paying the same customs houses.
- **Shared cards that serve it:** War Bonds, Letters of Marque (Dominion); The Art Dealers, The Cosmopolitan Court (Magisterial).

## 5. Example councils

A Tier 0 card is marked (0). Charters drafted beside a council take no chair. Chair mixes are written Military / Economic / Civic / Wildcard.

### Council 1: the Hanseatic towns (the home market and the bankers), with Expansionist

- **Opening, the Chiefdom (1 / 1 / 0 / 1):** The Pathfinders' Company; Salt Tithes; The Nest Egg.
- **End of Tier I, the Council of Elders (1 / 2 / 1 / 1):** Bought Swords; Provisioning Contracts, The Carters' Guild; The Nest Egg (0); Commission: The Great Fair. Charter: The Planters' Charter.
- **End of Tier II, the Republic (0 / 3 / 1 / 1):** The Home Market, Bills of Exchange, The Carters' Guild; The Hanse; The Strongbox. The Great Fair's two routes are held with no chair.
- **Tier III, the Merchant League (1 / 3 / 2 / 2):** Bought Swords; The Return Leg, Caravanserai Cities, The Money Lenders; The Hanse, The Champagne Fairs; The Strongbox, The Strongroom.
- **Tier IV, the Estates (2 / 4 / 2 / 3):** Bought Swords, The Hired Garrison; The Return Leg, Caravanserai Cities, The Money Lenders, The Grain Barges; The Hanse, Money at Work; The Champagne Fairs, Bills of Exchange, The Strongbox. The Strongroom has paid and left.
- **How it feels:**
  - Turn 45: Currency. The first caravan runs from the capital to the river town, which gains +3 food and +3 production and builds its Granary a quarter faster.
  - Turn 65: four towns each receive a caravan, and The Great Fair is met. Two more routes, for good.
  - Turn 100: six towns hold your post, so The Hanse gives +18% production and culture. 1,200 gold sits in the treasury: +12% production everywhere, and The Strongbox is full.
  - Turn 140: The Return Leg is seated, and every home route pays both its towns. Caravanserais rise in every town and open more routes.
  - Turn 150: the treasury passes 1,500 gold. The Strongroom pays 300 culture and a great merchant, and The Money Lenders' 4% starts to compound.
  - Turn 170: the fair comes round: eight towns of 14 citizens grant 1,120 culture.

### Council 2: the Silk Road (the far trade and the goods), with Devotion

- **Opening, the Chiefdom (1 / 1 / 0 / 1):** The Pathfinders' Company; Salt Tithes; Travellers' Letters.
- **End of Tier I, the Priest-King (1 / 1 / 2 / 1):** The Pathfinders' Company (0); The Homeward Cargoes; The Common Road, Export Guilds; Travellers' Letters (0).
- **End of Tier II, the Theocracy (1 / 0 / 3 / 1):** Foreign Procurement; The Exchange, The Foreign Factor, The Spice Exchange; The Fondaci. Charter: Numidian Cavalry.
- **Tier III, Divine Mandate (2 / 1 / 3 / 2):** Foreign Procurement, a Devotion Military card; Safe Conduct; The Exchange, The Foreign Factor, The Lingua Franca; The Commenda, The Capitulations.
- **Tier IV, the Curia (2 / 2 / 4 / 3):** Foreign Procurement, the Devotion Military card; Safe Conduct, The Casa da Índia; The Exchange, The Foreign Factor, The Lingua Franca, The Spice Exchange; The Commenda, The Capitulations, The World's Fair.
- **How it feels:**
  - Turn 25: the scout meets a third empire, and the capital's science and culture rise again.
  - Turn 55: a neighbour offers its silk for your spare salt. You accept: a new kind for Salt Tithes, and +4 culture and +2 production while the salt is lent (Export Guilds).
  - Turn 70: the first caravan reaches the neighbour's capital: +3 science, +3 culture and +3 gold, and its home town gains +3 production.
  - Turn 90: your post is established in that capital. The Fondaci pays 240 science and 240 culture. Four partners give +20% under The Exchange.
  - Turn 120: the post towns have grown. Each pays +3 science and +3 culture under The Foreign Factor.
  - Turn 140: your largest partner declares war on you. Under Safe Conduct your caravans and your posts keep paying. Under The Commenda you lend your last silk to a second neighbour, because a lent copy still counts.
  - Turn 165: six posts abroad each lend a kind (The Capitulations), and under The Casa da Índia every copy pays.
  - Turn 180: routes reach four empires. The World's Fair puts your post in each of their capitals.

### Council 3: the purse (the engine and the bankers), with Dominion

- **Opening, the Chiefdom (1 / 1 / 0 / 1):** The Pathfinders' Company; The Mineral Trade; Land Speculation.
- **End of Tier I, War Chief (2 / 1 / 1 / 1):** Bought Swords, a Dominion Military card (The King's Levy, 0); Financed Industry; Civic Receipts; Private Patronage.
- **End of Tier II, Tyranny (3 / 1 / 0 / 1):** Bought Swords, Foreign Procurement, a Dominion Military card; Financed Industry; Names in Stone.
- **Tier III, Imperium (3 / 2 / 1 / 2):** Bought Swords, Foreign Procurement, the shared War Bonds; Financed Industry, The Gilded Scaffold; The Endowment; Names in Stone, A Guild Commission.
- **Tier IV, the Sultanate (4 / 2 / 2 / 3):** Bought Swords, War Bonds, the shared Mercenary Contracts, The Hired Garrison; The Gilded Scaffold, The Merchant Works; The Endowment, Bought and Paid For; Names in Stone, The Great Loan, Merchant Princes.
- **How it feels:**
  - Turn 20: you buy the incense hex beside the second town for 50 gold, and Land Speculation pays 25 culture.
  - Turn 50: under Private Patronage the towns build slowly, so you buy their buildings, and each purchase pays culture (Civic Receipts).
  - Turn 80: a neighbour marches on the border. Each border town buys two Swordsmen in one turn (Bought Swords), though you hold no iron (Foreign Procurement).
  - Turn 110: 3,000 gold spent this game, so Names in Stone gives +15% science and culture.
  - Turn 140: Notre-Dame, bought outright (The Gilded Scaffold). War Bonds gives every soldier +5 from the hoard.
  - Turn 175: a rival's Opus is close. You seat The Great Loan, pour the gold into your own Opus, and buy three Knights in the Opus town in one turn (The Hired Garrison). Mercenary Contracts keeps them free of upkeep for twenty turns.

## 6. Features that would open cards in several decks

None of these adds a player input.

### Features A and B (accepted 2026-10-20)

- **Feature A, the trades:** The Merchant Guilds. Merchants in the trades come from gold buildings in big towns, so a Commerce seat makes them by itself. The Scientific pass's other Commerce idea, "merchant guildsmen pay +2 gold in a town with a Market", is not taken: it is another gold card.
- **Feature B, reading rivals:** no Commerce card of its own. The shared Books from the Ships, built in S3, reads the gap on each foreign route.

### Feature C (the Dominion pass's, being built in D11)

- No Commerce card uses it. The Dominion pass's Commerce idea, "a met commission grants gold equal to five turns of income", is not taken: Commerce has five commissions, and gold is the pay this pass moves away from.

### Feature D (proposed): deals as a card quantity

- **What it is:** two readings of `state.deals`:
  - **copies lent:** the luxury copies this empire lends to other empires in live deals (its exports);
  - **deal partners:** the empires this empire holds at least one live deal with, each counted once.
- **What the game already does:** deals are built and played. A deal can move gold once, tribute every turn, lent luxuries and open borders, and runs twenty turns (`deals.ts`, `diplomacy.ts`). War cancels every deal between the two empires. The bots offer one-for-one swaps of their spare copies and price a luxury at a gold baseline (`swapDecision` and `explainPaper`, `src/ai/diplomacy.ts`). `deals.ts` already walks the lent copies (`lentCopiesAwayBy`) and the deals between two seats (`dealsBetween`). No card reads any of it.
- **Why it matters:** your picture asks for "the faction most interested in trade deals/diplomacy" that gains "from claiming luxury resources and trading them to other players". Today the only reward for a deal is the copy itself. With feature D the table becomes a theme's act.
- **What it costs:** two `CountKind` members over the deals, read through `deals.ts`, and their words in the describers. No new screen and no new command: the diplomacy screen writes the deals already.
- **What it does not add:** a moment when a deal is signed. A seat could give a bot one gold every turn and collect the moment each time, so the readings are counts of what is in force, and a lent copy costs its lender a copy.
- **Cards it opens:**
  - Commerce: Export Guilds (copies lent) and The Treaty Ports (deal partners).
  - Dominion: tribute is a deal term. A third reading, tribute received, would open "gold you receive as tribute also pays as much culture" (War Reparations' idea).
  - Magisterial: "+1 renown a turn for each empire you hold a deal with" (the envoys at court).
  - Scientific: "technologies an empire you hold a deal with knows cost you 10% less research" (scholars travel with the envoys).
  - Devotion: "your religion presses 25% harder in the towns of an empire you hold a deal with" (missionaries ride with the envoys).
- **Fallback:** Export Guilds and The Treaty Ports are cut. The Commenda stands, because it is a rule on the copy count, not a count of deals.

## 7. New shapes

Twenty new shapes in five groups. All read what the game tracks, and none adds a player input.

1. **Routes and posts:**
   - a home route that also pays its origin, once, and never carries that payment on (The Return Leg);
   - a moment when a post is established, found by the date comparison `cityHoldsPost` already makes (The Fondaci);
   - a count of your own towns holding your post (The Hanse);
   - a count of the citizens of foreign towns holding your paying post, a quarter each, floored town by town (The Foreign Factor);
   - a count of every live route of every real empire (The Lingua Franca);
   - war keeps routes and posts: `cancelRoutesBetween`, `routeCities` and `cityPostPays` skip their war clause for the card's holder, while `routeStartable` still refuses a new route to an enemy (Safe Conduct);
   - a route figure read from the origin's citizens (The Grain Barges);
   - the range waiver widened from a sea route between two post towns to any route to a post town (The Admiralty of Trade; the rule `postsWaiveSeaRouteRange` exists).
2. **Commissions:**
   - a goal figure: your towns that receive a home route (The Great Fair);
   - a goal figure: partner empires, read from `tradePartnerEmpires` (The World's Fair);
   - a reward that establishes posts at once, in the capitals of the empires the seat trades with when the goal is met (The World's Fair).
3. **Goods and deals:**
   - feature D's two counts (Export Guilds, The Treaty Ports);
   - a lent copy still counts for its lender in every reading of its own copies, while the deal gate still counts it as lent, so one copy is never lent twice (The Commenda);
   - posts lend a luxury: The Silk Road's loan (`importedLuxuries`, `resourceEffects.ts`, with its twin walk `runningRouteImports`) also walks the seat's paying posts abroad, routes first, then posts, by state order, one kind each, never a kind already held (The Capitulations);
   - every copy of a luxury pays its yields, as `perCopy` does for silver and gold; the happiness still counts once a kind (The Casa da Índia);
   - a hex-purchase rider with a resource test on the hex, paid from the gold as Civic Receipts is (Land Speculation; near existing).
4. **The purse and the hoard:**
   - two military units a turn from a town, the gold bucket of `City.purchasedUnitTurns` only (Bought Swords);
   - a tally of turns ended holding at least a sum of gold, read by the growing cards' existing count (The Strongbox);
   - an upkeep waiver stamped on a unit bought with gold, with an absolute expiry (the shared Mercenary Contracts, section 8).
5. **The merchants:** `routeRider` already counts with `count` and `per`; the count `guildsmen` needs its family filter read there too (The Merchant Guilds; near existing).

**The other changed and new cards use shapes that exist:** Names in Stone (`goldSpent` as a percentage), Bills of Exchange (`bankedGold` as a percentage), The Homeward Cargoes (`foreignTradeRoutes` within a town), The Carters' Guild (`productionBonus` with the `routeEndsHere` scope), The Champagne Fairs (`periodic`, with The Topping Out's town figure from population), The Customs Houses (The Merchant Dynasties' built rows), Money at Work (`bankedGold` paid in every town), Bought and Paid For (`purchasedBuildings` within a town as a percentage), and the five trims (data only).

**For less engine work, cut** The Grain Barges, The Lingua Franca and The Capitulations first. Safe Conduct is the largest rule change, but it is the far trade's capstone.

## 8. The sheet's cards

### The Commerce cards (69)

| Card | Tier | Fate | Why |
|---|---|---|---|
| The Mineral Trade | 0 | kept | goods: widen; it shows the cost |
| Salt Tithes | 0 | kept | goods: supply |
| Travellers' Letters | 0 | kept | far trade: widen |
| The Pathfinders' Company | 0 | kept | far trade: supply; the deck's Tier 0 Military card |
| Coastal Estates | 0 | cut | filler that pays the deck's own yield; Salt Tithes and The Merchant Shrines carry the luxury hexes, and Zheng He the coast |
| Land Speculation | 0 | reworked | goods: act; a bought hex with a resource pays culture |
| The Map Sellers | 0 | kept | far trade: widen |
| The Merchant Shrines | 0 | kept | the early faith every deck carries; goods: widen |
| The Assayer's Rule | 0 | kept | goods: widen; you: *"this one is fun"* (2026-10-07) |
| The Carters' Guild | 0 | reworked, to Tier I | home market: widen; it paid nothing in age 1, and it read roads, which are Expansionist's |
| The Nest Egg | 0 | kept | bankers: widen |
| Commercial Education | I | kept | bankers: widen |
| Ore Caravans | I | kept | goods: bridge to the trade themes |
| Civic Receipts | I | kept | engine glue |
| Provisioning Contracts | I | kept | home market: supply |
| The Common Road | I | kept | far trade: widen |
| Venture Routes | I | kept | far trade: supply |
| The Factors' Houses | I | trimmed | home market: widen; its +25% gold goes |
| Bought Swords | I | reworked | engine glue: two units a turn; the deck's Tier I Military card |
| Established Routes | I | revised | twenty turns, not thirty |
| Private Patronage | I | kept | engine glue; its +38% gold stays, because its drawback is the point |
| Frontier Investment | I | trimmed | home market: multiply; its +25% gold goes |
| Financed Industry | I | kept | engine glue |
| The Staple Right | I | kept | goods: widen |
| The Planters' Charter | I | kept | goods: supply |
| The Market Writ | I | trimmed | bankers: widen (authority); its +38% gold goes |
| Strategic Exports | II | kept | goods: bridge to the army |
| Mining Districts | II | kept | goods: widen |
| Royal Assays | II | kept | goods: supply |
| The Home Market | II | kept | home market: multiply |
| The Foreign Factor | II | reworked | far trade: posts pay science and culture by their town's citizens |
| The League of Cities | II | kept | home market: multiply, with a cost |
| Foreign Procurement | II | kept | engine glue: the bought army |
| The Brokers' Redraw | II | moved | to the shared cards, with Magisterial (it acts on the draft) |
| The Scholars' Roads | II | kept | far trade: multiply, with a cost |
| The Customs Houses | II | reworked | bankers: widen; takes The Merchant Dynasties' job, and its +38% gold goes |
| The Waqf | II | moved | to the shared cards, with Devotion (endowments) |
| The Silk Road Monks | II | moved | to the shared cards, with Devotion (merchant missionaries) |
| Corner the Market | II | kept | goods: act |
| The Caravanserai Network | II | trimmed | home market: widen (happiness); its route pay repeats Provisioning Contracts |
| The Exchange | II | kept | far trade: the partners' scaler |
| Numidian Cavalry | II | kept | goods: widen (the army) |
| Houses of Account | II | kept | bankers: supply |
| Caravanserai Cities | III | trimmed | home market: supply; the rule stays, the +30% gold goes |
| A Court of Merchants | III | kept | bankers: supply |
| The Money Lenders | III | kept | bankers: capstone |
| The Chartered Metropolis | III | kept | home market: multiply, with a cost |
| The Admiralty of Trade | III | reworked | far trade: supply; any route to a post town, not only a sea route between two; rare to uncommon |
| The Gilded Scaffold | III | kept | engine glue: capstone |
| The Endowment | III | kept | engine glue |
| A Guild Commission | III | kept | engine glue: act |
| The Monopoly | III | kept | goods: pay-off |
| The Customs Service | III | kept | bankers: bridge to the trade themes |
| The Bourse | III | kept | bankers: multiply |
| Merchant Princes | IV | kept | bankers: act |
| The World's Exchange | IV | kept | far trade: finisher |
| The Merchant Works | IV | kept | engine glue |
| The Strongroom | IV | moved to III, revised | bankers: act; 1,500 gold, not 2,000; rare to uncommon |
| Patrons Abroad | IV | cut | the same job as The World's Exchange (production toward the Opus from the far trade), and you prefer late pay as a percentage |
| The Merchant Dynasties | IV | merged | into The Customs Houses: two cards paying the same customs houses |
| The Spice Exchange | IV | moved to II | goods: the scaler, since copies carry over |
| Money at Work | IV | reworked | bankers: the hoard pays science; Bills of Exchange pays its production |
| Bought and Paid For | IV | reworked | engine glue: a percentage; The Endowment keeps the flats |
| The Embargo | IV | cut | deferred, and it acts on another empire's production; no theme home |
| The Hired Garrison | IV | kept | engine glue: the bought army |
| The Neutral Flag | IV | kept | far trade: widen |
| The World's Fair | IV | reworked | far trade: act; four partners, and it plants posts |
| The Great Loan | IV | kept | engine glue |
| The Trade Winds | IV | kept | home market: supply; bridge to the far trade |

**Tally:** 45 kept (2 of them charters), 17 reworked, trimmed, revised or moved within the deck, 3 moved to the shared cards, 3 cut and 1 merged. With 18 new cards (15 new, and 3 deferred data rows the sheet does not list: The Return Leg, Export Guilds and The Treaty Ports), the deck holds 78 seatable cards and 2 charters.

**Data rows the sheet does not list:** The Consulate (a purchase discount, which ruling (qqqqqq) 1 retired) and The Post Riders (civilians on your roads move further; no theme home) should be retired. The 23 rows the sheet cut on 2026-10-06 are already retired.

### The shared cards (18 on the sheet, 21 with this pass)

Each pair keeps an early shared card (ruling (qqqqqq) 14).
- **Dominion:** The Escorted Roads (I), Letters of Marque, War Bonds, Professional Soldiers and The Chartered Company (III): kept. **Mercenary Contracts (III), reworked:** "Military units you buy cost no upkeep for twenty turns." The Dominion pass left it for Commerce to rework. The old text needed a hire at half price and a unit that leaves after fifteen turns, which is a new kind of purchase; this one stamps an upkeep waiver on an ordinary purchase.
- **Expansionist:** Market Gardens (0), The Grain Exchange (I), The Provincial Fair (II): kept. The sheet's old proposal to cut Market Gardens and The Provincial Fair is dropped: both serve the home market, and the Expansionist pass keeps them.
- **Devotion:** Pilgrim Markets (I), The Tithe (II): kept. **New: The Waqf and The Silk Road Monks (II),** moved from the exclusive cards, to confirm in the Devotion pass. Each is the pair's bridge (endowments, and merchant missionaries).
- **Scientific:** The Exchange of Discoveries (I), The Merchant Navigators (II), Books from the Ships (II, built in S3): kept. **Merchant Scholars (III)** takes the Scientific pass's text, "Foreign routes gain +2 science for each Academy in the origin city", which you approved with that pass. The Commerce builds pass had preferred every family's works; Academies are Scientific's split for great-person works, so this pass follows it.
- **Magisterial:** Travelling Players (II), The Art Dealers (I), The Cosmopolitan Court (III): kept. **New: The Brokers' Redraw (II),** moved from the exclusive cards, to confirm in the Magisterial pass. It acts on the draft, which is Magisterial's way to play, and Commerce keeps its use as a way to spend gold.

### Not taken from the 2026-10-17 pass

- **The Paved Realm:** Expansionist's The Milestones already reads the roads Commerce's caravans lay.
- **The Silver Towns** (mining towns +25% gold and science): Mining Districts holds the mines, and the card paid the deck's own yield.
- **The Merchant Adventurers** (a commission on two monopolies): Corner the Market is the goods' commission.
- **The Silver Fleet** (Opus production per doubled good): The World's Exchange and The Merchant Works carry the Opus.
- **The Book of Marvels** (a foreign route completing its term pays science and culture): The Fondaci takes the trade moment, on the post rather than the term.
- **The Marble Towns** (+5% science and culture a town for each bought building): Bought and Paid For takes the percentage.
- **The Bank of Saint George** (+1 science a town for every 500 gold): Money at Work takes it.
- **The Fondaci's old text** (+5 science and +5 culture for each post abroad): The Foreign Factor does that job and grows with the towns, and the name moves to the post moment.

### The Doctrines

Commerce has no Doctrines yet, so none falls outside a theme. They come after your cuts: one for each theme at most of Tiers I to IV.

### The type sort

- **Tier 0 (9).** Military (1): The Pathfinders' Company. Economic (3): Salt Tithes, The Assayer's Rule, The Mineral Trade. Civic (5): Travellers' Letters, The Map Sellers, The Merchant Shrines, Land Speculation, The Nest Egg.
- **Tier I (19).** Military (1): Bought Swords. Economic (10): Private Patronage, Financed Industry, Provisioning Contracts, The Carters' Guild, Frontier Investment, Venture Routes, Established Routes, The Homeward Cargoes, The Staple Right, Ore Caravans. Civic (7): Civic Receipts, The Factors' Houses, The Common Road, Export Guilds, Commercial Education, The Market Writ, The Strongbox. Wildcard (1): Commission: The Great Fair. Charter: The Planters' Charter (Economic).
- **Tier II (20).** Military (1): Foreign Procurement. Economic (7): The Home Market, The League of Cities, Royal Assays, Strategic Exports, The Treaty Ports, Bills of Exchange, The Merchant Guilds. Civic (11): Names in Stone, The Caravanserai Network, The Hanse, The Exchange, The Scholars' Roads, The Foreign Factor, The Fondaci, Mining Districts, The Spice Exchange, Houses of Account, The Customs Houses. Wildcard (1): Corner the Market. Charter: Numidian Cavalry (Military).
- **Tier III (18).** Economic (11): The Gilded Scaffold, Caravanserai Cities, The Chartered Metropolis, The Return Leg, Safe Conduct, The Admiralty of Trade, The Monopoly, The Commenda, The Capitulations, The Money Lenders, The Bourse. Civic (5): The Endowment, The Champagne Fairs, The Lingua Franca, A Court of Merchants, The Customs Service. Wildcard (2): A Guild Commission, The Strongroom.
- **Tier IV (12).** Military (1): The Hired Garrison. Economic (6): The Merchant Works, The Grain Barges, The Trade Winds, The World's Exchange, The Neutral Flag, The Casa da Índia. Civic (3): Bought and Paid For, Money at Work, Merchant Princes. Wildcard (2): The Great Loan, The World's Fair.

| Tier | Military | Economic | Civic | Wildcard | Seatable | Charters | Common / uncommon / rare |
|---|---|---|---|---|---|---|---|
| 0 | 1 | 3 | 5 | 0 | 9 | 0 | 6 / 3 / 0 |
| I | 1 | 10 | 7 | 1 | 19 | 1 | 8 / 9 / 2 |
| II | 1 | 7 | 11 | 1 | 20 | 1 | 4 / 13 / 3 |
| III | 0 | 11 | 5 | 2 | 18 | 0 | 0 / 9 / 9 |
| IV | 1 | 6 | 3 | 2 | 12 | 0 | 0 / 3 / 9 |
| **All** | **4** | **37** | **31** | **6** | **78** | **2** | **18 / 37 / 23** |

- **By status (seatable and charters):** 45 kept, 17 changed, 18 new. Before this pass the sheet held 69 cards: 4 Military, 38 Economic, 21 Civic and 6 Wildcard, by the builds pass's sort. Now 78 seatable: 4, 37, 31 and 6. The Economic share falls from 55% to 47%.
- **Every government has something to seat,** with two gaps. Tier III has no Military card of its own: Imperium's three Military chairs and Divine Mandate's two take the shared War Bonds, Professional Soldiers and Mercenary Contracts, the partner's cards, and the carried Bought Swords and Foreign Procurement. Tier IV has three Civic cards, so the Curia's four Civic chairs take carried scalers (The Exchange, The Foreign Factor, The Spice Exchange, The Hanse). Tier II leans Civic (11 of 20) and Tier III leans Economic (11 of 18), so the Republic and the Merchant League suit the home market and the bankers, and the Theocracy and Divine Mandate suit the far trade.

## 9. The checks

- **Themes beat a pile.** Each theme has flats, a percentage on them, and a capstone:
  - the home market: Provisioning Contracts, The Factors' Houses; The Home Market, The Hanse; The Return Leg;
  - the far trade: Travellers' Letters, The Common Road; The Exchange, The Lingua Franca; Safe Conduct;
  - the goods: Salt Tithes, The Staple Right, Export Guilds; The Spice Exchange, The Treaty Ports; The Commenda, then The Casa da Índia;
  - the bankers: The Nest Egg, Commercial Education; Bills of Exchange, The Bourse; The Money Lenders.
  The bot games' best Commerce earners were route cards (The Exchange, The Scholars' Roads, Venture Routes, The Factors' Houses), so a pile of the strongest cards is already near the far trade. The capstones and the posts that grow are what put a theme ahead.
- **Several routes.** Any two cards start a theme: Provisioning Contracts and The Carters' Guild, or The Great Fair and The Home Market; Travellers' Letters and The Common Road, or The Pathfinders' Company and Venture Routes; Salt Tithes and The Staple Right, or Land Speculation and Royal Assays, or Export Guilds and The Treaty Ports; The Nest Egg and The Strongbox, or Commercial Education and Houses of Account.
- **A scaler carries over** in every theme: The Hanse, The Foreign Factor and The Exchange, The Spice Exchange, The Strongbox and Bills of Exchange, and the engine's Names in Stone.
- **Every card has a home:** four themes and 13 glue cards (17%), with ten bridge cards: The Factors' Houses, Established Routes, The Fondaci, The Trade Winds, Ore Caravans, The Capitulations, The Merchant Guilds, The Customs Service, Strategic Exports and Numidian Cavalry.
- **The essentials along the way.** By Tier II:
  - the home market: production (Provisioning Contracts, The Carters' Guild, The Home Market), culture (The Factors' Houses, The Hanse), and science only from the glue (Names in Stone) or the bankers (Commercial Education) until The Lingua Franca at Tier III;
  - the far trade: science and culture (Travellers' Letters, The Common Road, The Exchange), production (The Homeward Cargoes);
  - the goods: culture (The Staple Right, Export Guilds), science (Mining Districts, The Spice Exchange), production (Export Guilds, The Treaty Ports);
  - the bankers: science (Commercial Education), culture (The Nest Egg, The Strongbox), production (Bills of Exchange).
- **Gold stays a minority:** 18 of 78 seatable cards pay gold (23%), against 30 of 69 (43%) before. Science: 17 cards. Culture: 25. Production: 16. Happiness or authority: 6.
- **Areas:** five of five (section 2).
- **The cost shows** in the production cards (The Mineral Trade, Private Patronage, Financed Industry, Bought Swords, Foreign Procurement, The Gilded Scaffold, The Merchant Works) and in every foreign card that a war switches off.
- **No new input.** Every card is automatic or uses sending a route, buying, founding, building, a deal at the existing diplomacy screen, or a great merchant's act or work. The old Mercenary Contracts (a hire, and a unit that leaves) is reworked, The Embargo is cut, and feature D adds no deal-signing moment.
- **The splits are followed:**
  - flexibility: Commerce buys anything, and nothing else in the deck competes with that;
  - great-person works: customs houses only;
  - roads: Commerce reads routes and posts, Expansionist reads roads;
  - authority and happiness: ruled open to Commerce on 2026-10-07 (*"Authority is not Expansionist's alone"*); this pass keeps it to Markets and routes;
  - institutions: Commerce's lasting things are posts and route slots, not lasting yields, which are Dominion's commissions' (question 5).
  - **One conflict, named:** wonders. Production toward wonders is Scientific's and Magisterial's. The Merchant Works turns gold into production in a town raising a wonder, an empire building or the Opus. It is a conversion, not a wonder card, so it stays. If you want the split strict, drop "a world wonder" from its text. The Gilded Scaffold buys a wonder outright, which neither split names.
- **Where the pass falls short:**
  - Every number is a guess; nothing is measured. Bots never renew a route and offer deals only as swaps, so the trade themes and feature D are hard to measure until they do.
  - Tier III has no Military card of its own, and Tier IV has three Civic cards.
  - The home market reaches science late.
  - Twenty new shapes, and feature D. Safe Conduct and The Return Leg are the largest.
  - The deck grows from 69 cards to 78 seatable cards and 2 charters.
  - No leader points at the bankers. Doctrines are not in this pass.

## 10. Open questions for the user

1. **The engine and four themes as written:** gold and what it buys as the engine; the home market, the far trade, the goods and the bankers as the themes. *Recommended: yes.*
2. **Feature D, deals as a card quantity** (copies lent, and deal partners), with Export Guilds and The Treaty Ports on it. *Recommended: yes.* It is small, it uses the deals the game already has, and it makes Commerce the deck that wants the table.
3. **The rule-breakers:** The Return Leg (both ends of a home route are paid), Safe Conduct (war does not end your trade), The Commenda (a lent good still counts), The Capitulations (posts lend a luxury), The Casa da Índia (every copy pays its yields), Bought Swords (two soldiers a turn). *Recommended: yes to all six.*
4. **The five trims:** The Factors' Houses, Frontier Investment, The Market Writ, The Caravanserai Network and Caravanserai Cities lose their gold percentage or their second clause. Private Patronage keeps its +38%, because its drawback is the point. *Recommended: yes.*
5. **Commerce's commissions plant posts, routes and merchants, not lasting yields.** Lasting effects are Dominion's institutions by the split. The Great Fair pays two route slots, The World's Fair establishes posts, and Corner the Market, The Strongroom and A Guild Commission bring great people. *Recommended: yes.*
6. **The moves to the shared cards:** The Waqf and The Silk Road Monks to Devotion, The Brokers' Redraw to Magisterial, and Mercenary Contracts reworked ("Military units you buy cost no upkeep for twenty turns"). *Recommended: yes, each to confirm in the partner's pass.*
7. **The cuts:** Coastal Estates, Patrons Abroad, The Embargo, and The Merchant Dynasties merged into The Customs Houses; and retire the data rows The Consulate and The Post Riders. *Recommended: yes.*
8. **Established Routes at twenty turns, and the bots learn to renew a route.** *Recommended: yes.* Today every bot route lapses after one term, so the card cannot be measured.
9. **The deck's size:** 78 seatable cards and 2 charters. *Recommended: keep it for now and cut by hand on the list.* If you want it smaller, these are the next five cuts, weakest first: The Neutral Flag, Strategic Exports, Frontier Investment, Mining Districts, The Admiralty of Trade.

After your answers: every card onto the sheet as `add` and `modify` rows, with the Type column, then Commerce's Doctrines, then the triage for the build.
