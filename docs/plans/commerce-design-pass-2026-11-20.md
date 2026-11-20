# Commerce design pass (2026-11-20)

**Status, 2026-11-20:** nothing here is ruled yet. This is a proposal for the user to approve or reject, one change at a time. Nothing is built, and no game data changed.

The user, 2026-11-20:

> *"ok, could you do a deck pass on commerce and expansionist. I find that i don't really take any of the tended land cards in this version of the game, and commerce feels a bit one-note. I'm not sure whether to drop the tended land theme altogether or make it more fleshed out, what do you think?"*

- This pass covers Commerce. Another pass covers Expansionist and the tended-land question. Section 8 lists every place where the two passes touch.
- It proposes 49 changes. You asked the Dominion pass to go for more changes than needed, and this pass does the same.
- The method is the card-design skill. "Now" is the card's text in `data/decks/commerce.json`, which equals the sheet `docs/decks/commerce.md`. I checked each one against the game's own words (`describeCard`).
- Every number is a first guess against the power bar, to tune in playtest. No bot games and no tests were run.
- Gold counts at half its face value in the arithmetic (your rate of 2026-09-03: 2 gold to 1 of another yield). Culture in Tiers 0 and I counts three times.

**The proposal by kind:** 13 buff, 12 rework, 6 cut, 6 move, 8 new, 4 doctrine.

## 1. Why the deck feels one-note

In three sentences:

1. **From Tier II on, almost half the deck reads a trade route or a trading post.** A route is hired once and then runs with no more input. So 22 of the 47 cards in Tiers II to IV reward one act, and the player does that act about ten times in a game.
2. **Gold has one use, and it is the same use every turn.** The treasury buys the next building at 4 gold a hammer. No Order changes that price. The two things that only Commerce can buy (a wonder and a great person) are rares at Tiers III and IV.
3. **The other parts of your picture of the deck are too thin to draft toward.** Deals have 2 cards. Posts abroad lost their three cards on 2026-11-10. The sea has no card. The army has 3 cards, and none at Tiers I, III or IV.

### 1.1 The tally: what each card reads, by tier

| What the card reads | 0 | I | II | III | IV | All |
|---|---|---|---|---|---|---|
| Trade routes and trading posts | 2 | 1 | 9 | 8 | 5 | 25 |
| Purchases: a thing bought, or gold spent | 1 | 3 | 2 | 3 | 2 | 11 |
| Luxuries: kinds, copies, plantations | 2 | 2 | 3 | 1 | 1 | 9 |
| Towns, Markets, gold buildings, great merchants | 1 | 4 | 2 | 2 | 0 | 9 |
| Gold income: raises all of it, or turns it into another yield | 1 | 2 | 1 | 0 | 2 | 6 |
| Foreign courts: empires met, deals, scouts | 2 | 1 | 1 | 0 | 0 | 4 |
| The treasury and loans | 0 | 0 | 0 | 2 | 1 | 3 |
| Mines, quarries, strategic resources | 1 | 0 | 2 | 0 | 0 | 3 |
| The sea | 0 | 0 | 0 | 0 | 0 | 0 |
| Roads | 0 | 0 | 0 | 0 | 0 | 0 |
| Plunder and war | 0 | 0 | 0 | 0 | 0 | 0 |
| **All** | 10 | 13 | 20 | 16 | 11 | **70** |

- Each card is counted once, by the thing the player must have or do for it to pay. The 70 are the deck's own live cards. The 18 shared cards are not in the table.
- **What the cards pay is not the problem.** 16 of the 70 pay gold (23%), so the rule "no more than a third pay the deck's own yield" holds. The themes pass of 2026-10-21 fixed that. The one note is in what the cards ask for.
- **Tiers II to IV:** 22 of 47 cards read a route or a post. 5 of the 13 shared cards in those tiers do too (The Escorted Roads, Pilgrim Markets, The Merchant Navigators, The Silk Road Monks, Merchant Scholars). That is 27 of 60.
- **Themes the deck really has:** the routes (25 cards), the purse (11), the goods (9) and the gold buildings (9).
- **Themes that are in `docs/decks/deck-design.md` but have too few cards to draft toward:** deals and diplomacy (2 cards, none after Tier II); trading posts abroad (1 card, The Capitulations, at Tier III); exploration (2 cards, both at Tier 0); great merchants and customs houses (4 cards, and a seat has one customs house or none); the sea (no card); roads (no card in the deck, one shared card and one Doctrine); tolls (no card).

### 1.2 What a Commerce seat does on the map and in its turns

| What the seat does | How often | Cards that pay for it |
|---|---|---|
| Hires a caravan and picks the two ends of its route | About ten times a game | 25 |
| Buys a building, a unit or a hex | Every few turns | 11 |
| Settles beside a luxury and improves it | Three or four times, in age 1 | 9 |
| Builds a Market in each town | Once a town | 9 |
| Signs a deal | When a bot offers one, and again every twenty turns | 2 |
| Calls a great merchant | Once or twice a game | 4 |

- Any seat with gold buys things, at the same price. Any seat builds Markets. So the honest answer to "what does a Commerce seat do that no other seat does" is: it sends routes, and its gold income is larger.
- **A route has one dimension.** Most route cards count routes, or towns that send or receive one. A route to a far town pays what a route to a near town pays. A post abroad pays nothing unless The Capitulations is seated. After the caravan leaves, nothing about the route changes.
- **Three cards buy range that no card pays for:** The Admiralty of Trade, The Trade Winds, and the post's own +3 turns of range. Genghis Khan's building The Yam (routes reach twice as far) has the same problem.
- **Five cards turn gold income into another yield with no decision:** The Nest Egg (culture), Financed Industry (production), Bills of Exchange (production), The Merchant Works (production) and Money at Work (science). They all read "the gold you make each turn". Every other gold card feeds them, and none of them asks the player to do anything.

### 1.3 The gold sinks

- **The price.** A hammer costs 4 gold at the counter (`goldPerHammer`). Card text counts 2 gold as 1 of another yield. So a card that pays gold is worth half of what it prints when the seat buys hammers with it. A Market costs 356 gold, and a median seat makes 19 gold a turn in age 2.
- **No Order improves the price.** You ruled on 2026-10-12 that discount cards become +25% of the yield, so that stacked discounts cannot make a purchase free. Four Doctrines now hold the discounts (The Apoikia, The Laurion Leases, The Flying Money, The Turnpike Trusts). I think that is the right home for them, and this pass adds no discount Order.
- **What only Commerce can buy:** a wonder (The Gilded Scaffold, Tier III rare), a great-person draft (Merchant Princes, Tier IV rare), units without their strategic resource (Foreign Procurement, Tier II), the Plantation House (a charter, Tier I), and a redraw (the shared The Brokers' Redraw, which has no button yet). Before Tier III the list is short and narrow.
- **Spending is not a choice today.** Six of the eleven purse cards pay for the same act, which is to buy the next building: Civic Receipts, The Strongbox, Names in Stone, The Endowment, A Guild Commission and Bought and Paid For. On 2026-11-10 the cards that read the treasury changed to read income, so keeping gold pays nothing. Only The Money Lenders, The Strongroom and the Doctrine The Monte di Pietà are left for a seat that keeps gold.

### 1.4 Chores: what the cards ask the player to do

- **Route babysitting is not the chore.** Batch TR2 (2026-11-10) removed the route term, so a route runs until a war, a plunder or a lost town ends it. A caravan is never asked for orders.
- **Re-planning the routes.** Five cards ask for a pattern: The Home Market (two routes into one town), The Carters' Guild (one into each town), The League of Cities (one out of each town), The Chartered Metropolis (three out of one town) and The Great Fair (four towns receive). Each time one is drafted, the player sends the caravans again. That is a puzzle once a card, and I count it as a decision, not a chore.
- **Re-signing deals.** A deal lasts twenty turns (`dealTurns`) and the game has no renewal. Export Guilds and The Treaty Ports pay only while a deal runs. With three partners that is a deal to sign again about every seven turns. This is the real chore in the deck. Section 9 has a fix that is not a card.
- **Remembering what was bought where.** The Endowment and Bought and Paid For count the buildings bought in each town. You cut the shared The Waqf on 2026-11-10 because "the player must remember which buildings they bought". The same reason holds for these two (changes 31 and 39).
- **Waiting.** The Strongroom asks the seat to stop buying until it holds 1,500 gold. It is one card, and the goal is clear, so I left it.
- **Placing mines in clusters.** Mining Districts pays a mine that has two mines beside it (change 22).

### 1.5 Dead and nearly dead cards

- **The Pack Trail and The First Caravan (Tier 0)** pay nothing in Tier 0. A route needs a slot, a slot needs a Market, and a Market needs Currency, an age 2 technology. The caravan waits in the capital for about 30 turns.
- **The Brokers' Redraw (shared, Tier II)** cannot be used: no button offers the gold redraw (the sheet's own note).
- **The Merchant Works (Tier IV rare)** reads the gold of the one town that builds a wonder: about +6 to +10 production toward a wonder of 657 hammers or more.
- **The Admiralty of Trade (Tier III)** lifts the range limit to towns that hold your post. A post exists only where a route already reached.
- **Strategic Exports (Tier II)** doubles strategic copies in a deck where no card reads a strategic copy.
- **Mining Districts (Tier II)** needs three mines in a cluster and then pays +2 gold and +2 science.
- **Letters of Credit (Tier I rare)** is 150 gold once, and it must hold its chair for ever or the debt comes due.
- **The Customs Houses and The Customs Service** pay for a thing the seat has one of, or none.
- **Corner the Market (Tier II)** asks for four copies of one luxury, and then pays +2 happiness for each duplicate, of which the seat has one or two.

### 1.6 Rares that are weaker than commons

| The rare | Pays | The common or uncommon that beats it |
|---|---|---|
| Private Patronage (I) | +6 to +10 gold in age 2 | The Grain Banks (uncommon): +12 gold with four Granaries |
| Financed Industry (I) | +5 to +8 production in age 2 | The Market Halls (common): +8 food and +8 production in four Market towns of 6 |
| Letters of Credit (I) | 150 gold, once | Any Tier I common |
| The League of Cities (II) | +20% production in towns that send a route, about 18 | The Home Market (common): +30% food and production |
| The Spice Exchange (II) | +5% to +10% science and culture with one or two duplicates | The Exchange (uncommon): +15% with three partners |
| The Bourse (III) | About +60 gold in ten towns | Houses of Account (common): +2 happiness for each gold building |
| The Scholars' Roads (III) | +24 to +42 on six routes abroad, nothing on home routes | The Champagne Fairs (uncommon): about 110 culture a turn |
| The Merchant Works (IV) | +6 to +10 production toward a wonder | The generic The Grand Design (uncommon): about +75 toward the Opus |
| The World's Exchange (IV) | +40% in the Opus town, about 40 | The Grand Design again |

### 1.7 How often each card is seen

- A hand deals one card for each of the seat's decks. The game rolls the rarity first, at 60 / 30 / 10, over the rarities that deck holds in the current tier. Then it picks evenly inside that rarity (`drawRarityFirst`, `src/sim/statecraft/draft.ts`). So the number of cards at each rarity in a tier decides how often each card is seen.
- The table gives the chance that one named card is the Commerce card of a hand, before the seat holds any card of the tier.

| Tier | Commons | Uncommons | Rares | Each common | Each uncommon | Each rare |
|---|---|---|---|---|---|---|
| 0 | 8 | 2 | 0 | 8.3% | 16.7% | none |
| I | 4 | 6 | 3 | 15% | 5% | 3.3% |
| II | 5 | 13 | 2 | 12% | 2.3% | 5% |
| III | 0 | 8 | 8 | none | 9.4% | 3.1% |
| IV | 0 | 2 | 9 | none | 37.5% | 2.8% |

- **Tier 0:** the two uncommons (Land Speculation and The Pathfinders' Company) are each seen twice as often as any common.
- **Tier II:** each of the two rares is seen twice as often as any of the 13 uncommons.
- **Tiers III and IV have no common.** At Tier IV the first two Commerce hands show The Grain Barges or The Neutral Flag three times in four, and the nine rares share the last quarter.
- The pass moves rarities so that each tier has commons, and no tier has more rares than uncommons. Section 5 has the table after the changes.

### 1.8 Gaps by tier and by chair

The sheet's own count of types, charters included:

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| 0 | 1 | 6 | 3 | 0 |
| I | 0 | 8 | 5 | 0 |
| II | 2 | 7 | 9 | 2 |
| III | 0 | 9 | 5 | 2 |
| IV | 0 | 6 | 3 | 2 |

- **Military:** three cards in the deck, and one of them is a charter that takes no chair. Tiers I, III and IV have none. Every government seats at least one Military chair. A seat paired with Dominion has four shared Military cards. A seat paired with any other deck fills the chair from its partner or from the generic cards.
- **Wildcard:** Tier I has no commission.
- **Rares:** Tier 0 has none.
- **Commons:** Tiers III and IV have none.

### 1.9 Doubles

- **Gold income into production, three times:** Financed Industry (I), Bills of Exchange (II) and The Merchant Works (IV).
- **Purchases this game, twice:** Names in Stone (gold spent) and Bought and Paid For (buildings bought).
- **Bought buildings by town, twice:** The Endowment (science) and Bought and Paid For (production and culture).
- **Towns that send routes, twice:** The League of Cities (II) and The Chartered Metropolis (III) are the same card at two sizes.
- **No iron, twice:** Foreign Procurement and Strategic Exports solve the same problem.
- **Customs houses, twice:** The Customs Houses and The Customs Service read a thing the seat has one of.
- **Road gold, twice:** the shared Market Gardens and the Doctrine The Turnpike Trusts both give +1 gold on a road hex. They add up, so I left them.

### 1.10 Science, culture and production

- **Science:** reachable in every tier. Travellers' Letters, Commercial Education, The Strongbox, The Common Road, The Exchange, Names in Stone, The Endowment, Money at Work.
- **Culture:** reachable in every tier, and early. Land Speculation, The Nest Egg, Civic Receipts, Export Guilds, The Factors' Houses, The Champagne Fairs.
- **Production:** reachable, but almost all of it comes through home routes (Provisioning Contracts, The Carters' Guild, The Home Market, The Return Leg, The Grain Barges). A seat that leans on the far trade or the goods has Financed Industry and The Treaty Ports and little else. Changes 27 and 36 answer that.

### 1.11 The pairs, in one line each

- **Dominion:** Commerce gives an army bought with gold. It takes Military cards for its empty chairs. Dominion's wars close Commerce's routes abroad.
- **Expansionist:** Commerce gives roads laid by caravans, and gold for hexes and settlers. It takes luxuries opened on claimed land, and many towns for its Markets.
- **Devotion:** Commerce gives routes that pay faith and carry religion. It takes holy sites as places to trade with. Neither deck makes production.
- **Scientific:** Commerce gives gold that buys the schools, and routes abroad that pay science. It takes Academies that pay on routes, and great people for its gold.
- **Magisterial:** Commerce gives gold for redraws and great people. It takes gold for each seated card, and the any-family great-person cards for its merchants.

## 2. Second and third notes: what I tested, and what I recommend

- Trade routes stay the core. The aim is range. I tested nine second and third notes against one question: does the playstyle produce the quantity by itself, so that a seat that drafts one card of the note still gets paid?
- I recommend three. A and B are the main ones. C is small: it gives the route cards a second dimension and costs four cards.

### A. The goods: the different luxuries you hold (Recommended)

- **The quantity:** the number of different luxuries the seat holds (`uniqueLuxuries`, deals included). The map has 24 kinds, and each has its own effect, so this note differs from game to game.
- **Who raises it:** settling beside a luxury (The Emporia), buying the hex (Land Speculation, the Doctrine The Laurion Leases), a swap at the table, a post abroad (The Capitulations), a Customs House on a seam.
- **Who reads it today:** Salt Tithes, Numidian Cavalry, the Bazaar building, and the shared The Country Fair and The Merchant Shrines. The mid-game cards read duplicates instead, and a seat has one or two of those.
- **The changes:** The Spice Exchange and Corner the Market read kinds (16, 17). The Tiraz pays production for each kind (27). The Staple Right and The Planters' Charter go up (10, 11). The table becomes the way to gain kinds: a commission for the first two deals (13), a stronger The Treaty Ports (18), and a Doctrine that lets a lent luxury still count (49).
- **The floor:** every seat holds two to four kinds by age 2, with no card at all. A seat that drafts only The Tiraz gains about +20 production in age 3.
- **What it does to play:** a new kind is +4 happiness, +4% science and culture, and +1 production in every town. So each swap a bot offers is a gain the player can see, and each site with a new luxury is worth a town.
- **The partner decks:** Expansionist claims and improves the hexes. Devotion's The Merchant Shrines pays faith on the same towns. Dominion gets Numidian Cavalry. Scientific and Magisterial get the science and culture percentage.

### B. The purse acts now (Recommended)

- **The moment:** a purchase with gold (the `purchase` moment and the `goldPurchase` count, both built).
- **The idea:** your picture says Commerce should "act where others must wait". Today its gold arrives slowly and buys slowly. This note gives the deck cards that pay on the turn they are drafted, and moves the things only gold can buy to earlier tiers.
- **The changes:** Letters of Credit becomes a loan paid on the draft (07), and The Great Loan becomes a true boon (44). Merchant Princes moves from Tier IV to Tier III (35). Civic Receipts and The Endowment together return half the price of a bought building as culture and science, which is your rate of 2 gold to 1 (08, 31). The Ten Thousand makes a bought army a good army (12). Two doubles go (21, 38), and Bought and Paid For stops asking the player to remember towns (39).
- **The floor:** every seat buys something. A seat that drafts only Civic Receipts gains about 90 culture for each Market it buys.
- **What it does to play:** the turn a loan lands, the seat decides what to buy at once. A war on the border is answered in one turn with bought Veterans.
- **The partner decks:** Dominion reads the units gained and their ranks. Magisterial and Scientific want the great people. Devotion buys with faith beside it.
- **What I did not do:** add a discount Order. The Doctrines hold the discounts, and your ruling of 2026-10-12 stands.

### C. The far road: distance and posts (Recommended, small)

- **The quantities:** the hexes a route travels (`routeLength`, built), and the towns that hold your trading post (built; a route kept twenty turns leaves a post at both ends for good).
- **The idea:** your picture says "Establishing trading posts, setting the seeds for commerce and seeing the effects of this expand throughout the ages". Today a far route pays what a near one pays, and a post abroad pays nothing.
- **The changes:** The Tea Horse Road pays for each three hexes a route travels (26). The Factors' Houses counts posts abroad (14), and so does the Doctrine The Sogdian Colonies (47). The Admiralty of Trade lifts the range limit everywhere (28). The Feitorias pays posts by the size of their towns at Tier IV (45). The World's Fair becomes the capstone: routes abroad pay twice (43).
- **The floor:** every route has a length and leaves posts, so a seat with any routes is paid.
- **What it does to play:** where a route goes becomes a choice on the map. A far partner is worth more than a near one, and a post planted in age 2 pays more in age 4 with no new act.
- **The partner decks:** Genghis Khan's The Yam finally buys something. Ibn Battuta's The Funduq and Cleopatra's Books from the Ships pay on the same routes abroad.

### D. The table as a note of its own (Not as its own note)

- Deals are a real act, and your picture names them. But a deal depends on a partner at peace, it ends after twenty turns, and on 2026-11-19 you took the deal count out of Cleopatra's kit. So I put the table inside note A, as one way to gain kinds, and kept its cards few. Question 1 asks whether deals stay a card quantity.

### E. Debt (Two cards, not a note)

- Gold now for less gold later is a good card, and the pass has two (07, 44). A whole theme would need many timed drawbacks, and the rule of 2026-11-10 keeps drawbacks to rares.

### F. The hoard: keep or spend (Not recommended)

- On 2026-11-10 the treasury cards changed to read income, so that they stop working against the purchase cards. I agree with that. The Money Lenders and The Strongroom stay as the two cards for a seat that keeps gold, and the hoard can be poured into the Magnum Opus at the end.

### G. The sea (Wait)

- No Commerce Order reads the sea. A sea route already pays 50% more, and the shapes exist (a route row can name the sea). But the note depends on the map, and maritime yields are on your own list of things to return to. I would design it with that work, not before it.

### H. A city of trade against an empire of trade (Already in the deck)

- The Home Market and The Chartered Metropolis reward one great trade town. The Carters' Guild, The Great Fair and The League of Cities reward a network. The choice is real and I kept it. Change 15 makes the two sides pay different things.

### I. Tolls: routes that other empires send to you (Not recommended)

- The quantity is what rivals do, and the player cannot raise it. The rule of 2026-11-10 also asks that no card reads what a rival knows or does.

## 3. Index

| # | Card | Tier | Change | Confidence | Ruling |
|---|---|---|---|---|---|
| 01 | The Pack Trail | 0 | buff | good |  |
| 02 | The First Caravan | 0 | rework | good |  |
| 03 | The Mineral Trade | 0 | buff | good |  |
| 04 | The Silent Trade | 0 | new | good |  |
| 05 | Private Patronage | I | move | good |  |
| 06 | Financed Industry | I | buff | good |  |
| 07 | Letters of Credit | I | rework | good |  |
| 08 | Civic Receipts | I | buff | good |  |
| 09 | The Market Writ | I | buff | good |  |
| 10 | The Staple Right | I | buff | good |  |
| 11 | The Planters' Charter | I | buff | good |  |
| 12 | The Ten Thousand | I | new | speculative |  |
| 13 | Commission: The Trade Mission | I | new | good |  |
| 14 | The Factors' Houses | II | rework | good |  |
| 15 | The League of Cities | II | rework | good |  |
| 16 | The Spice Exchange | II | rework | good |  |
| 17 | Corner the Market | II | rework | good |  |
| 18 | The Treaty Ports | II | buff | good |  |
| 19 | Houses of Account | II | rework | speculative |  |
| 20 | The Customs Houses | II | buff | good |  |
| 21 | Bills of Exchange | II | cut | good |  |
| 22 | Mining Districts | II | cut | good |  |
| 23 | Strategic Exports | II | cut | good |  |
| 24 | Foreign Procurement | II | move | good |  |
| 25 | Names in Stone | II | move | good |  |
| 26 | The Tea Horse Road | II | new | good |  |
| 27 | The Tiraz | II | new | strong |  |
| 28 | The Admiralty of Trade | III | rework | good |  |
| 29 | The Scholars' Roads | III | buff | good |  |
| 30 | The Chartered Metropolis | III | buff | good |  |
| 31 | The Endowment | III | rework | good |  |
| 32 | The Bourse | III | cut | good |  |
| 33 | The Customs Service | III | cut | good |  |
| 34 | The Champagne Fairs | III | move | good |  |
| 35 | Merchant Princes | IV to III | move | good |  |
| 36 | The Cloth Halls | III | new | good |  |
| 37 | The Stipendium | III | new | good |  |
| 38 | The Merchant Works | IV | cut | strong |  |
| 39 | Bought and Paid For | IV | rework | good |  |
| 40 | The Grain Barges | IV | buff | good |  |
| 41 | The Trade Winds | IV | move | good |  |
| 42 | The World's Exchange | IV | buff | good |  |
| 43 | The World's Fair | IV | rework | good |  |
| 44 | The Great Loan | IV | rework | strong |  |
| 45 | The Feitorias | IV | new | good |  |
| 46 | The Laurion Leases | Doctrine I | doctrine | good |  |
| 47 | The Sogdian Colonies | Doctrine II | doctrine | good |  |
| 48 | The Muda | Doctrine III | doctrine | good |  |
| 49 | The Colleganza | Doctrine III | doctrine | speculative |  |

## 4. The changes

### 01. The Pack Trail (buff)

- **Tier, rarity, type:** 0, common, Economic
- **Now:** Your trade routes give +2 gold.
- **Proposed:** Your trade routes give +3 gold.
- **Why:** It is a Tier 0 card that reads a thing no seat has in Tier 0. Change 02 gives the seat one route early. At +3 the card still earns its chair when the network is ten routes.
- **Arithmetic:** Tier 0, with change 02: one route, +3 gold. Tier II: six routes, +18 gold (9 at the half rate). Tier IV: twelve routes, +36 gold. It is under the Tier 0 bar of 4 to 8 when drafted. It is a pointer toward routes, and it grows with them.
- **Synergy:** **Raises:** gold. **Reads:** trade routes. Fed by The First Caravan, every Market, Commission: The Great Fair, The Merchant Guilds, Caravanserai Cities and The Trade Winds.
- **Shape:** Existing shape: `pays` on a route, a number change.
- **Confidence:** good
- **Depends, joins and notes:** Without change 02 it pays nothing in its own tier.

### 02. The First Caravan (rework)

- **Tier, rarity, type:** 0, common to uncommon, Economic (Boon)
- **Now:** On draft: gain a caravan.
- **Proposed:** On draft: gain a caravan, and room for one more trade route.
- **Why:** Today the caravan waits in the capital until the first Market, about 30 turns. With its own slot it leaves at once for the second town. A land route lays a road, so the two towns are joined before any other seat has a road. This is the deck's own way to open: the caravan builds the road.
- **Arithmetic:** A route at turn 20 pays its destination about 1 food or 1 production and 1 gold. The road is worth more. A town joined to the capital pays gold equal to half its citizens (`connectionPerPop` 2), so a town of 4 pays +2 gold, and units walk the road at a third of the cost. With The Pack Trail the route pays +3 more. Together that is about 6 gold a turn from turn 20, a regular Tier 0 card that takes no chair.
- **Synergy:** **Raises:** trade routes, road hexes, towns joined to the capital. Feeds The Pack Trail, Provisioning Contracts, the shared Market Gardens, and Expansionist's The Road Towns and Provincial Councils. Pachacuti's The Qhapaq Ñan pays +1 happiness and +1 production for the joined town.
- **Shape:** Small extension: an on-draft grant that leaves a lasting effect (a `routeRider` of 1). A commission's reward has `lasting`, and a boon does not. To confirm in the build: that a route may start before Currency. I found no technology clause in the route gate.
- **Confidence:** good
- **Depends, joins and notes:** It joins the Expansionist pass: The Road Home also joins new towns by road at Tier 0. The two add up. They do not clash.

### 03. The Mineral Trade (buff)

- **Tier, rarity, type:** 0, common, Economic
- **Now:** Mines and quarries gain +1 gold.
- **Proposed:** Mines and quarries gain +2 gold.
- **Why:** The simplification of 2026-11-10 removed its drawback and halved its pay. At +1 it is the weakest card in Tier 0.
- **Arithmetic:** Three mines and quarries by turn 40: 6 gold (3 at the half rate), the low end of the Tier 0 bar. At +1 it was 1.5. Eight in age 3: 16 gold.
- **Synergy:** **Raises:** gold on hexes. **Reads:** mines and quarries. The shared The Exchange of Discoveries pays science on the same hexes, and the generic The Gilded Country adds 1 gold to every hex that makes gold. With Mansa Musa's The Gold of Wangara a mine pays +4 gold.
- **Shape:** Existing shape: `pays` on a hex, a number change.
- **Confidence:** good

### 04. The Silent Trade (new)

- **Tier, rarity, type:** 0, rare, Military
- **Now:** Not in the deck.
- **Proposed:** Barbarians do not attack you. You cannot clear barbarian camps.
- **Why:** Tier 0 has no rare, and no card that changes how age 1 plays. Herodotus tells of Carthaginian traders who left their goods on a beach and traded with a people they never met. With this card the seat does not fight for its frontier. Settlers, workers, scouts and caravans walk with no escort. The price is that the camps near you stay for the whole game, raid your neighbours, and pay you nothing.
- **Arithmetic:** A seat builds two or three Warriors in age 1 to hold off barbarians (15 hammers each, when a town makes about 5) and loses worked hexes and sometimes a worker to raids. The card saves about 50 to 80 hammers by turn 40. That is the size of a Tier 0 lump (50 to 100), and it saves the attention too. It costs every reward for a cleared camp.
- **Synergy:** **Raises:** nothing directly. It frees production for Settlers and Markets. It works against the cards that pay for a cleared camp (the shared The Barbarian Frontier, Dominion's camp cards), so a Dominion and Commerce seat must choose. That is the card's condition.
- **Shape:** Existing shape: the rules `barbariansPassive` and `noCampClearing`. The game reads both today (`barbarians.ts`, `arrival.ts`), and no live card uses them.
- **Confidence:** good
- **Depends, joins and notes:** It breaks the rule "a Tier 0 card is a plain yield" (2026-11-10), as Blood Brothers and The Ver Sacrum did in the Dominion pass. Question 5. It is the only Tier 0 rare, so it is the Commerce card of about one hand in ten.

### 05. Private Patronage (move)

- **Tier, rarity, type:** I, rare to uncommon, Economic
- **Now:** Rare: Towns gain +25% gold.
- **Proposed:** Uncommon, the same text.
- **Why:** A plain percentage of the deck's own yield is not a rare. As an uncommon it is an honest card that grows as the flat gold cards arrive.
- **Arithmetic:** Age 2: a Commerce seat makes 25 to 40 gold, so +6 to +10 (3 to 5 at the half rate). The uncommon The Grain Banks pays +12 with four Granaries. Age 3: +25 to +37. Age 4: +75 to +150.
- **Synergy:** **Raises:** gold in towns. **Reads:** the gold that towns make: Market Day, The Grain Banks, The Mineral Trade, Markets and Banks. Feeds The Nest Egg, Financed Industry and Money at Work.
- **Shape:** No shape change. Only the rarity changes.
- **Confidence:** good

### 06. Financed Industry (buff)

- **Tier, rarity, type:** I, rare, Economic
- **Now:** Towns gain production equal to 20% of their gold.
- **Proposed:** Towns gain production equal to 30% of their gold.
- **Why:** Three cards turn gold income into production. This pass keeps one, the earliest and the simplest, and gives it a rare's size. It is the deck's direct answer to its gap.
- **Arithmetic:** Age 2: 25 to 40 gold in towns, so +7 to +12 production (it was +5 to +8). Age 3: 100 to 150 gold, so +30 to +45, near a Tier II regular card (35 to 60). Age 4: 300 to 600 gold, so +90 to +180. It is small when drafted and a headline by age 4.
- **Synergy:** **Raises:** production. **Reads:** gold in towns, before any other card converts it. Fed by Market Day, The Grain Banks, Private Patronage, The Mineral Trade, the shared The Country Fair, and every Market and Bank.
- **Shape:** Existing shape: `pays` in a city, basis share, a number change.
- **Confidence:** good
- **Depends, joins and notes:** Change 21 cuts Bills of Exchange. If you reject 21, keep this card at 20%.

### 07. Letters of Credit (rework)

- **Tier, rarity, type:** I, rare, Economic (Boon)
- **Now:** Your treasury may fall to −150 with no penalty.
- **Proposed:** On draft: gain 400 gold. Your towns make 20% less gold for thirty turns.
- **Why:** Today the card is 150 gold once, and it must keep its chair for the rest of the game or the debt comes due. A loan is the same idea in a form the player reads at a glance: gold now, less gold later. It is the deck's first card that acts on the turn it is drafted.
- **Arithmetic:** 400 gold in age 2 is 13 to 20 turns of a Commerce seat's income. It buys a Market on the spot (89 hammers, 356 gold), or a Settler, a Worker and two hexes. The cost is 20% of 25 to 40 gold for thirty turns: 150 to 240 gold. At the counter 400 gold is 100 hammers, under the Tier I lump of 200 to 400. The value is the timing: a Market fifteen turns early, or a town founded now.
- **Synergy:** **Raises:** gold in hand, and the moment "a purchase with gold". Feeds Civic Receipts, The Strongbox, Land Speculation and Names in Stone on the same turn.
- **Shape:** Small extension: an on-draft gold windfall exists (`OnDraftWindfall`). The timed loss on the player is new for a boon. A commission's reward has it (`timed`). Change 44 uses the same shape.
- **Confidence:** good
- **Depends, joins and notes:** It takes the rule `buysOnCredit` out of play. The other choice is to keep the rule and move the floor to −400. Question 2.

### 08. Civic Receipts (buff)

- **Tier, rarity, type:** I, uncommon, Civic
- **Now:** Buying a building grants culture equal to 15% of the gold paid.
- **Proposed:** Buying a building grants culture equal to 25% of the gold paid.
- **Why:** Land Speculation pays half the price of a hex. A building pays 15%. The purse should make every purchase feel like two things bought.
- **Arithmetic:** A Market bought for 356 gold pays 89 culture (it was 53). A seat makes about 25 culture a turn in age 2, so one bought Market is three or four turns of culture. With change 31 a bought building returns a quarter of its price in culture and a quarter in science: your rate of 2 gold to 1.
- **Synergy:** **Raises:** culture, and so drafts. **Reads:** a building bought with gold. Fed by Letters of Credit (the loan), The Grain Banks, and the Doctrines The Flying Money and The Apoikia. The Strongbox and Names in Stone count the same purchase.
- **Shape:** Existing shape: `windfallRider` on a purchase, a number change.
- **Confidence:** good

### 09. The Market Writ (buff)

- **Tier, rarity, type:** I, uncommon, Civic
- **Now:** +1 authority for every two Markets in your empire.
- **Proposed:** +1 authority for each Market in your empire.
- **Why:** This is the deck's authority card by your ruling of 2026-10-07. With four Markets it gives +2. The generic common Local Clerks gives +3 with no condition.
- **Arithmetic:** Four Markets: +4 authority. A founded town costs 3, so every three Markets hold one more town. Ten Markets in age 4: +10.
- **Synergy:** **Raises:** authority, and so towns. **Reads:** Markets. Each new town can raise a Market, so the card pays back a third of each town's cost. The Market Halls and Commercial Education read the same Markets.
- **Shape:** Existing shape: `pays` to authority, count `buildingsOfKind`, the divisor goes.
- **Confidence:** good

### 10. The Staple Right (buff)

- **Tier, rarity, type:** I, common, Economic
- **Now:** Gain +3 gold and +2 culture for each luxury you hold two or more copies of.
- **Proposed:** Gain +4 gold and +3 culture for each luxury you hold two or more copies of.
- **Why:** After changes 16 and 17 this is the one early card that reads duplicates. A seat has one or two, so each must pay more.
- **Arithmetic:** One duplicate at Tier I: 4 gold and 3 culture, about 11 with culture at three times. Two: about 22, a regular Tier I card. The floor is nothing when the map gives no second seam.
- **Synergy:** **Raises:** gold and culture. **Reads:** luxuries held twice or more. Raised by a second seam beside a town, a bought hex (the Doctrine The Laurion Leases) and a deal. The Casa da Índia pays the same copies at Tier IV.
- **Shape:** Existing shape: number changes.
- **Confidence:** good

### 11. The Planters' Charter (buff)

- **Tier, rarity, type:** I, uncommon, Economic (Charter)
- **Now:** Unlocks the Plantation House, a building you buy with gold. The building gives +1 gold, and +1 food and +1 gold on each plantation.
- **Proposed:** The same card text. The building gives +2 food and +2 gold on each plantation its town works.
- **Why:** The building costs 68 hammers, so 272 gold, and a town with two plantations got +2 food and +3 gold for it. Nobody buys that.
- **Arithmetic:** A town with two plantations: +4 food and +4 gold for 272 gold. With three: +6 and +6. The building is a gold building, so Commercial Education (+3 science), Houses of Account and The Cloth Halls (change 36) pay on it too.
- **Synergy:** **Raises:** food and gold on plantations, and the count of gold buildings. **Reads:** plantations. The shared The Provincial Fair pays +2 gold on the same hexes in a Market town.
- **Shape:** Existing shape: the building row's `tileYields`, a number change. The card row does not change.
- **Confidence:** good
- **Depends, joins and notes:** It joins the Expansionist pass: plantations are where the two decks meet on the land.

### 12. The Ten Thousand (new)

- **Tier, rarity, type:** I, uncommon, Military
- **Now:** Not in the deck.
- **Proposed:** Military units you buy with gold start as Veterans.
- **Why:** Tier I has no Military card, and each tier-4 government seats at least one Military chair. Xenophon's Ten Thousand were Greek soldiers hired by a Persian prince: experienced men bought, not raised. This is how a merchant state fights. It buys good soldiers on the turn it needs them.
- **Arithmetic:** A Veteran has +3 strength, the regular Tier I combat line, on units of 30 to 35. A Swordsman costs 46 hammers, so 184 gold: five to seven turns of an age 2 Commerce income. The card pays nothing at peace. It is the card a seat holds for the turn a neighbour marches, when it buys three Veterans in three towns at once.
- **Synergy:** **Raises:** units gained and ranks. By your ruling of 2026-10-16 a unit that starts as a Veteran has earned a rank. **Reads:** military units bought with gold. In a Dominion and Commerce seat it feeds every card that reads a rank or a unit gained, and it stacks with the shared Professional Soldiers (+3 strength).
- **Shape:** Existing shape: `unitStamp` with a rank, narrowed to bought units as Professional Soldiers is. To confirm that the two fields combine.
- **Confidence:** speculative
- **Depends, joins and notes:** The split of 2026-10-20 gives earned ranks to Dominion and better starts to Scientific. A bought rank sits between them. If that is a problem, the other text is "Military units you buy with gold gain +3 strength", and the shared Professional Soldiers goes up to +5.

### 13. Commission: The Trade Mission (new)

- **Tier, rarity, type:** I, uncommon, Wildcard
- **Now:** Not in the deck.
- **Proposed:** Goal: hold deals with two empires at once. Reward: a great merchant.
- **Why:** The table has two cards and no goal, and Tier I has no commission. A first merchant at Tier I is also the supply that the customs house cards lack.
- **Arithmetic:** A great merchant's Strike a Bargain pays 8 turns of gold: 200 to 320 gold in age 2. Planted, a Customs House pays +3 gold on its hex and opens the resource under it, and with change 20 it pays +8 science and +8 culture for good. A Tier I lump is 200 to 400.
- **Synergy:** **Raises:** great people gained, customs houses. **Reads:** the empires you hold a deal with. Fed by Travellers' Letters (it pays for the same empires met) and Export Guilds (a lent luxury is a deal). Feeds The Customs Houses, A Court of Merchants, and Cleopatra's The Museion (+2 science for each great person called).
- **Shape:** Small extension: a goal figure `dealPartners`. The count exists, and The Treaty Ports reads it. The reward `greatPerson: merchant` exists (The Strongroom).
- **Confidence:** good
- **Depends, joins and notes:** It depends on question 1 (deals as a card quantity).

### 14. The Factors' Houses (rework)

- **Tier, rarity, type:** II, common, Civic
- **Now:** Your cities holding your trading post gain +2 gold and +4 culture.
- **Proposed:** Each town holding your trading post, at home or abroad, gives you +2 gold and +4 culture.
- **Why:** A route kept twenty turns leaves a post at both ends, for good. Today a post abroad pays nothing. The three cards that paid for posts abroad were cut on 2026-11-10 (The Foreign Factor, The Hanse, The Lingua Franca). This puts the job back in one line.
- **Arithmetic:** Age 3: five of your own towns and three foreign towns hold a post. That is +16 gold and +32 culture, about 40: a regular Tier II card. Today the same seat gets +10 gold and +20 culture. Posts only grow: twelve to fourteen in age 4 give +28 gold and +56 culture. A post abroad stops paying during a war with its owner.
- **Synergy:** **Raises:** gold and culture. **Reads:** towns that hold your post. Fed by every route kept twenty turns. The Fondaci pays on the moment a post is established, and this card pays for it afterwards.
- **Shape:** Existing counts: your own towns through `citiesAdmitted` with the `holdsPost` scope, and paying posts abroad through `postCities`. The pay for a post abroad goes to the empire.
- **Confidence:** good

### 15. The League of Cities (rework)

- **Tier, rarity, type:** II, rare, Economic to Civic
- **Now:** Towns that send a trade route gain +20% production.
- **Proposed:** Towns that send a trade route cost 1 less authority.
- **Why:** At +20% the rare is weaker than the common The Home Market, and it is the twin of The Chartered Metropolis one tier later. The Hanse and the Lombard League were towns that governed themselves. The card had this clause until the simplification of 2026-11-10.
- **Arithmetic:** Seven towns each send one route: 7 authority, which holds two more towns. A town of five or six citizens is worth 40 to 80 yield a turn in age 3. The generic Local Clerks gives +3 authority. Today the card pays about 18 production.
- **Synergy:** **Raises:** authority, and so towns. **Reads:** towns that send a route. Each needs a slot, so each needs a Market. It pulls against The Home Market, which wants two routes into one town. That is a real choice in the route plan.
- **Shape:** Existing shape: `meterRule` `cityCost` with the `routeEndsHere` scope, direction departing. The Doctrine The Delian League uses the same rule with a coastal scope.
- **Confidence:** good
- **Depends, joins and notes:** It joins the Expansionist pass: Provincial Councils cuts 1 authority from a town joined by road. In an Expansionist and Commerce seat a town with both costs 1. A town's cost should not go below 1.

### 16. The Spice Exchange (rework)

- **Tier, rarity, type:** II, rare, Civic
- **Now:** Every city gains +5% science and +5% culture for each luxury you hold two or more copies of, at most +30%.
- **Proposed:** Every city gains +4% science and +4% culture for each different luxury you hold, at most +32%.
- **Why:** Duplicates come from the map alone. A seat holds one or two, so the rare pays 5% to 10%, and the uncommon The Exchange pays 15%. Different kinds are a number the player can raise: settle, buy the hex, swap, plant a post.
- **Arithmetic:** Age 3, a median seat: 106 science and 83 culture. Five kinds: +20%, about 38, a regular Tier II card. Eight kinds: +32%, about 60 in age 3 and about 300 in age 4. Today, with two duplicates: +10%, about 19.
- **Synergy:** **Reads:** the different luxuries you hold, deals included. Raised by The Emporia (settle beside one), the Doctrine The Laurion Leases, a swap, The Capitulations and a Customs House on a seam. The Tiraz (change 27) and Numidian Cavalry read the same number.
- **Shape:** Existing shape: the count changes from `duplicateLuxuries` to `uniqueLuxuries`. To confirm: that a luxury on loan from a post counts. It does not count for Numidian Cavalry today.
- **Confidence:** good

### 17. Corner the Market (rework)

- **Tier, rarity, type:** II, uncommon, Wildcard
- **Now:** Goal: hold four copies of one luxury. Reward: +2 happiness for each luxury you hold two or more copies of.
- **Proposed:** Goal: hold three copies of one luxury. Reward: +2 happiness for each different luxury you hold.
- **Why:** Four copies of one kind needs four seams of it in your borders, or several deals. Then the reward counts duplicates, of which the seat has one or two. That is +2 to +4 happiness for the hardest goal in the deck.
- **Arithmetic:** Five kinds: +10 happiness, for the rest of the game, with no chair. A luxury gives 4 happiness, so the reward is two and a half luxuries. Spare happiness of 10 is the second step of the bonus to every yield.
- **Synergy:** **Reads:** copies of one luxury (the goal) and different luxuries (the reward). The goal is met by seams, bought hexes and deals. The Staple Right and The Casa da Índia pay the same copies.
- **Shape:** Existing shape: the commission's figure `luxuryCopies` at 3, and the lasting reward's count changes to `uniqueLuxuries`.
- **Confidence:** good

### 18. The Treaty Ports (buff)

- **Tier, rarity, type:** II, uncommon, Economic
- **Now:** +5% production for each empire you hold a deal with, at most +25%.
- **Proposed:** +8% production for each empire you hold a deal with, at most +40%.
- **Why:** With two partners the card pays 10% of about 107 production: 11. That does not earn a chair, and each partner is a deal to sign again every twenty turns.
- **Arithmetic:** Age 3: two partners give +16%, about 17. Three give +24%, about 26. Age 4, with 476 production: three partners give about 114, and five give +40%, about 190. It is still under the Tier II bar early, and it is the table's answer to the production gap late.
- **Synergy:** **Raises:** production. **Reads:** the empires you hold a deal with. Fed by Export Guilds (a lent luxury is a deal) and Commission: The Trade Mission.
- **Shape:** Existing shape: number changes.
- **Confidence:** good
- **Depends, joins and notes:** It depends on question 1. Section 9 has the note on deals that end after twenty turns.

### 19. Houses of Account (rework)

- **Tier, rarity, type:** II, common, Civic
- **Now:** Gold buildings provide +2 happiness and +1 renown.
- **Proposed:** Gold buildings provide +1 happiness and +1 renown.
- **Why:** This is the one cut to a card's pay in the pass. The card is a common, it has no condition a Commerce seat does not meet, and it gives more happiness than a Doctrine.
- **Arithmetic:** Age 3: six Markets and two Lighthouses are 8 gold buildings: +16 happiness, the same as four luxuries. Age 4, with Banks and Bazaars: about 36 gold buildings, so +72. The Doctrine The Forbidden Silks gives +20 with five luxuries, and it forbids lending. At +1 the card gives +8 in age 3 and +36 in age 4, which is still strong for a common.
- **Synergy:** **Raises:** happiness and renown. **Reads:** gold buildings. Commercial Education and The Cloth Halls (change 36) read the same buildings.
- **Shape:** Existing shape: a number change.
- **Confidence:** speculative
- **Depends, joins and notes:** I have no playtest of this card. You wrote on 2026-09-03: "too much happiness in the game". If happiness is tight in the decks build, reject this change.

### 20. The Customs Houses (buff)

- **Tier, rarity, type:** II, uncommon, Civic
- **Now:** Each customs house in your borders gives its town +4 science and +4 culture, whether or not it is worked.
- **Proposed:** Each customs house in your borders gives its town +8 science and +8 culture, whether or not it is worked.
- **Why:** A seat has one customs house at this tier, or none. It is the same case as Dominion's citadel cards, which you approved at the larger size on 2026-11-19.
- **Arithmetic:** One customs house: +16 (it was +8), against a Tier II bar of 35 to 60. Two: +32. Change 13 brings the first merchant a tier early, and The Strongroom and A Court of Merchants bring more at Tier III.
- **Synergy:** **Raises:** science and culture. **Reads:** customs houses. Fed by Commission: The Trade Mission, The Strongroom, A Court of Merchants, Houses of Account (renown) and the Doctrine The Sogdian Colonies.
- **Shape:** Existing shape: number changes.
- **Confidence:** good

### 21. Bills of Exchange (cut)

- **Tier, rarity, type:** II, uncommon, Economic
- **Now:** Every town gains +1% production for every 10 gold you make each turn, at most +30%.
- **Proposed:** Cut. Financed Industry does this job (change 06).
- **Why:** Five cards read "the gold you make each turn" and turn it into another yield. Three of them make production. One card for each yield is enough.
- **Arithmetic:** At 100 gold a turn in age 3 it pays +10% of about 107 production: 11. Financed Industry at 30% pays about 30 at the same income.
- **Synergy:** Nothing else reads it.
- **Shape:** No shape. The row is retired.
- **Confidence:** good
- **Depends, joins and notes:** It depends on change 06. If you reject 06, keep this card.

### 22. Mining Districts (cut)

- **Tier, rarity, type:** II, uncommon, Civic
- **Now:** Mines gain +2 gold and +2 science for every two mines beside them.
- **Proposed:** Cut.
- **Why:** It pays a mine that has two mines beside it. Arranging improvements at peace is a puzzle with low pay. The themes pass of 2026-10-21 named it among the five weakest cards.
- **Arithmetic:** A typical seat has one or two such mines: +4 gold and +4 science, against a Tier II bar of 35 to 60. The shared The Exchange of Discoveries already pays +2 science on a mine or quarry with a resource.
- **Synergy:** Mansa Musa's mines keep The Mineral Trade (change 03) and The Exchange of Discoveries.
- **Shape:** No shape. The row is retired.
- **Confidence:** good

### 23. Strategic Exports (cut)

- **Tier, rarity, type:** II, uncommon, Economic
- **Now:** Your strategic resources supply twice as many copies.
- **Proposed:** Cut.
- **Why:** No Commerce card reads a strategic copy, and Foreign Procurement already answers a map with no iron. Two cards for one problem is one too many in a deck that is not about the army.
- **Arithmetic:** In a seat with enough iron and horses it pays nothing.
- **Synergy:** Nothing in the deck reads it.
- **Shape:** No shape. The row is retired.
- **Confidence:** good
- **Depends, joins and notes:** I could not confirm whether a deal can lend a strategic copy. If it can, the card has a second use and this cut is weaker.

### 24. Foreign Procurement (move)

- **Tier, rarity, type:** II, uncommon to common, Military
- **Now:** Uncommon: You may buy units without their strategic resource.
- **Proposed:** Common, the same text.
- **Why:** It is a plain rule and a narrow one. Tier II has 13 uncommons today, so each is the Commerce card of one hand in 43. As a common the tier's one seated Military card is seen.
- **Arithmetic:** No yield. Its value is one war fought with Swordsmen or Horsemen that the map did not give.
- **Synergy:** **Reads:** units bought with gold. It works with The Ten Thousand (change 12) and the shared Professional Soldiers.
- **Shape:** No shape change. Only the rarity changes.
- **Confidence:** good

### 25. Names in Stone (move)

- **Tier, rarity, type:** II, uncommon to rare, Civic
- **Now:** Uncommon: +1% science and culture for every 200 gold you have spent buying this game, at most +30%.
- **Proposed:** Rare, the same text.
- **Why:** It is the deck's "this game" counter and its best scaler. A third rare also brings each Tier II rare down to the rate of an uncommon.
- **Arithmetic:** About 2,000 gold spent by turn 100: +10%, about 19 in age 3. About 6,000 by turn 150: +30% of age 4's 936 science and culture, about 280. That is a rare's ceiling.
- **Synergy:** **Reads:** all gold spent on purchases: routes hired, hexes, buildings, units and great people. Every card of note B feeds it.
- **Shape:** No shape change. Only the rarity changes.
- **Confidence:** good

### 26. The Tea Horse Road (new)

- **Tier, rarity, type:** II, common, Civic
- **Now:** Not in the deck.
- **Proposed:** Your trade routes give +1 gold and +1 culture for every three hexes they travel.
- **Why:** Today a route to a far town pays what a route to a near town pays. So the cards and the posts that buy range buy nothing. With one card that reads distance, where a route goes is a choice on the map. The Tea Horse Road carried Chinese tea to Tibet and brought back war horses, over 2,000 km of mountain track.
- **Arithmetic:** A home route of 6 to 9 hexes: +2 or +3 of each. A route to a neighbour's capital, 12 to 18 hexes: +4 to +6 of each. Six routes of 12 hexes on average: +24 gold and +24 culture, about 36, a regular Tier II card. Eight long routes of 18 hexes: +48 and +48.
- **Synergy:** **Raises:** gold and culture. **Reads:** the hexes a route travels. Fed by each post (+3 turns of range), The Trade Winds, The Admiralty of Trade (change 28) and Genghis Khan's The Yam. The Scholars' Roads doubles its culture.
- **Shape:** Existing shape: `pays` on a route, basis count, count `routeLength`, per 3. The retired The Harbour Chain has this row.
- **Confidence:** good
- **Depends, joins and notes:** The retired Venture Routes paid for distance and was among the best-paying cards in the bot games of 2026-10-13. It was cut because it came before routes existed.

### 27. The Tiraz (new)

- **Tier, rarity, type:** II, uncommon, Economic
- **Now:** Not in the deck.
- **Proposed:** Every town gains +1 production for each different luxury you hold.
- **Why:** The goods pay gold, happiness, science and culture, and never production, which is the deck's gap. This card makes every swap a gain the player can see: a new kind is +1 production in every town. The tiraz were the state textile workshops of the caliphates.
- **Arithmetic:** Age 3: five kinds and seven towns give +35, a regular Tier II card. Eight kinds and nine towns give +72. Age 4: eight kinds and twelve towns give +96. A seat that drafts nothing else for the goods has three or four kinds: about +25.
- **Synergy:** **Raises:** production. **Reads:** the different luxuries you hold. The feeders are the same as for change 16: settling, bought hexes, swaps, The Capitulations and Customs Houses.
- **Shape:** Existing shape: `pays` in every city, basis count, count `uniqueLuxuries`. The Monopoly pays every town this way.
- **Confidence:** strong

### 28. The Admiralty of Trade (rework)

- **Tier, rarity, type:** III, uncommon to common, Economic
- **Now:** Your trade routes to a town holding your trading post have no range limit.
- **Proposed:** Your trade routes have no range limit.
- **Why:** A post exists only where a route already reached, so today the card extends almost nothing. The plain rule is one line, and it opens every empire the seat has met.
- **Arithmetic:** It has no yield of its own. It opens one more partner for The Exchange (+5% science and culture each) and The World's Exchange. With The Tea Horse Road a route of 30 hexes pays +10 gold and +10 culture. Tier III has no common today.
- **Synergy:** **Raises:** the empires your routes reach, and route length. Feeds The Exchange, The Tea Horse Road, The World's Fair and The World's Exchange.
- **Shape:** Small extension: the rule `postsWaiveRouteRange` without its post test.
- **Confidence:** good

### 29. The Scholars' Roads (buff)

- **Tier, rarity, type:** III, rare to uncommon, Civic
- **Now:** Rare: Your routes gain +50% science and culture.
- **Proposed:** Uncommon: Your routes pay twice their science and culture.
- **Why:** A route abroad pays 8 to 14 science and culture with the Tier II cards seated, so +50% on six routes is 24 to 42. A home route pays no science or culture, so in a home-market seat the card pays nothing. That is not a rare.
- **Arithmetic:** Doubled: six routes abroad give +48 to +84, a regular Tier III card (60 to 120). Tier III has eight rares today and needs fewer.
- **Synergy:** **Reads:** the science and culture on a route. Fed by The Common Road, The Tea Horse Road (culture), the shared The Merchant Navigators and Merchant Scholars, the Doctrine The Muda, and Cleopatra's Books from the Ships.
- **Shape:** Existing shape: the route share goes from 50 to 100.
- **Confidence:** good

### 30. The Chartered Metropolis (buff)

- **Tier, rarity, type:** III, rare to uncommon, Economic
- **Now:** Rare: Towns that send three trade routes gain +35% food, production and culture.
- **Proposed:** Uncommon: Towns that send three trade routes gain +50% food, production and culture.
- **Why:** One town qualifies in most seats, because three routes from one town take three of about ten slots. The card is the great trade city, and it should make that city great.
- **Arithmetic:** A capital in age 4 makes about 60 production, 80 food and 40 culture. +35% is 63. +50% is 90, a regular Tier III card. Two such towns give 180.
- **Synergy:** **Reads:** towns that send three routes. Fed by Caravanserai Cities (three slots in one town), The Trade Winds and Commission: The Great Fair. It pulls against The League of Cities, which wants each town to send one.
- **Shape:** Existing shape: number changes.
- **Confidence:** good

### 31. The Endowment (rework)

- **Tier, rarity, type:** III, uncommon to common, Civic
- **Now:** Purchased buildings provide +2 science each, at most +6 per town.
- **Proposed:** Buying a building grants science equal to 25% of the gold paid.
- **Why:** The card asks the player to remember which buildings in which town were bought. You cut The Waqf for that reason. The new card pays at the counter, where the player is looking.
- **Arithmetic:** A medium building in age 4 costs 202 hammers, so 808 gold, and pays 202 science. A seat that spends 300 gold a turn on buildings gains 75 science a turn, a regular Tier III card. Today eight towns with two bought buildings each pay 32. With Civic Receipts a bought building returns half its price as culture and science.
- **Synergy:** **Raises:** science. **Reads:** a building bought with gold. Fed by the whole purse. A Guild Commission, The Strongbox and Names in Stone count the same purchase.
- **Shape:** Existing shape: `windfallRider` on a purchase, as Civic Receipts has, with science.
- **Confidence:** good

### 32. The Bourse (cut)

- **Tier, rarity, type:** III, rare, Economic
- **Now:** Gold buildings produce 75% more of their own yields.
- **Proposed:** Cut. The Cloth Halls takes its place (change 36).
- **Why:** A Market makes 2 gold, a Bank 4 and a Bazaar 2. So the rare adds about 6 gold a town. The card also shares its name with a building, which is confusing on the city screen.
- **Arithmetic:** Ten towns: about +60 gold, 30 at the half rate, against a Tier III bar of 60 to 120.
- **Synergy:** The gold buildings keep three readers: Commercial Education, Houses of Account and The Cloth Halls.
- **Shape:** No shape. The row is retired.
- **Confidence:** good

### 33. The Customs Service (cut)

- **Tier, rarity, type:** III, uncommon, Civic
- **Now:** Trade routes leaving a city whose borders hold a customs house gain +3 gold and +3 culture.
- **Proposed:** Cut.
- **Why:** It needs two narrow facts: a customs house, and routes that leave that one town. It is also one more route card in a tier where half the cards read routes.
- **Arithmetic:** One customs house town that sends three routes: +9 gold and +9 culture, about 14, against a Tier III bar of 60 to 120.
- **Synergy:** The customs houses keep The Customs Houses at the larger size (change 20).
- **Shape:** No shape. The row is retired.
- **Confidence:** good
- **Depends, joins and notes:** The great-people pass of 2026-11-19 lists this card among the merchant's cards. That list loses one.

### 34. The Champagne Fairs (move)

- **Tier, rarity, type:** III, uncommon to common, Civic
- **Now:** Uncommon: Every ten turns, each town that receives a domestic trade route grants culture equal to ten times its population.
- **Proposed:** Common, the same text.
- **Why:** Tier III has no common. This card is plain, it pays for the routes any Commerce seat has, and its size is a regular card's.
- **Arithmetic:** Eight receiving towns of 14 citizens hold a fair worth 1,120 culture every ten turns: about 112 a turn.
- **Synergy:** **Reads:** towns that a home route reaches, and their citizens. Fed by the whole home market.
- **Shape:** No shape change. Only the rarity changes.
- **Confidence:** good

### 35. Merchant Princes (move)

- **Tier, rarity, type:** IV to III, rare, Civic
- **Now:** Tier IV: You may buy great-person drafts with gold.
- **Proposed:** Tier III, the same text.
- **Why:** The things that only gold can buy arrive last. Half the seats never reach Tier IV. At Tier III this card stands beside The Gilded Scaffold: one opens wonders, the other opens great people.
- **Arithmetic:** A draft costs 1,000 gold (`offerPriceGold`). A Commerce seat makes 150 to 300 gold a turn in Tier III, so one great person is four to seven turns of all its income. I did not check how the price climbs after the first.
- **Synergy:** **Reads:** gold. **Raises:** great people gained. Feeds The Customs Houses, Cleopatra's The Museion, and the Magisterial and Scientific cards that read great people. A Guild Commission pays the same draft for five bought buildings.
- **Shape:** No shape change. Only the tier changes.
- **Confidence:** good
- **Depends, joins and notes:** Lorenzo de' Medici's The Medici Bank already calls great people with gold income. The two together make that leader's theme rich.

### 36. The Cloth Halls (new)

- **Tier, rarity, type:** III, common, Economic
- **Now:** Not in the deck.
- **Proposed:** Gold buildings provide +3 production.
- **Why:** The gold buildings pay science at Tier I and happiness at Tier II. Production, the deck's gap, is the third thing they should pay. The cloth halls of Ypres and Kraków were the guilds' own buildings, and the towns' workshops stood around them.
- **Arithmetic:** Ten towns with a Market, and a Bank or a Bazaar in half of them: about 25 gold buildings, so +75 production, a regular Tier III card. In age 4 about 36 buildings give +108.
- **Synergy:** **Raises:** production. **Reads:** gold buildings. The government The Estates raises it by 30%, and the generic rare The Builders' Lodge doubles it with its two sister cards. Lorenzo de' Medici's Florins reads the same buildings.
- **Shape:** Existing shape: Commercial Education's row with production.
- **Confidence:** good

### 37. The Stipendium (new)

- **Tier, rarity, type:** III, common, Military
- **Now:** Not in the deck.
- **Proposed:** Your units gain +1 strength for every 50 gold you make each turn, at most +8.
- **Why:** Tiers III and IV have no Military card. A rich state pays its soldiers on time, and they fight for it. The stipendium was the Roman soldier's pay.
- **Arithmetic:** A Commerce seat makes 150 to 300 gold in Tier III: +3 to +6. In age 4 it makes 400 or more: +8. The regular Tier III combat line is +6 and the strong one is +12, on units of 45 to 80. It pays at peace only as a threat, like any combat card.
- **Synergy:** **Reads:** gold income. Every gold card feeds it. It is the fourth card that reads gold income, after culture (The Nest Egg), production (Financed Industry) and science (Money at Work). Each pays a different thing.
- **Shape:** Existing shape: `combatLine` with `scaled`. To confirm that the scale takes the `empireYield` count.
- **Confidence:** good

### 38. The Merchant Works (cut)

- **Tier, rarity, type:** IV, rare, Economic
- **Now:** Towns building a wonder gain production equal to 25% of their gold.
- **Proposed:** Cut.
- **Why:** It reads the gold of the one town that builds a wonder, not the empire's gold. The Gilded Scaffold buys the wonder outright.
- **Arithmetic:** A town in age 4 makes 25 to 40 gold, so the card adds 6 to 10 production toward a wonder that costs 657 to 1,127 hammers.
- **Synergy:** Nothing else reads it.
- **Shape:** No shape. The row is retired.
- **Confidence:** strong

### 39. Bought and Paid For (rework)

- **Tier, rarity, type:** IV, rare, Civic
- **Now:** Each town gains +4% production and culture for each building you bought there with gold, at most +24%.
- **Proposed:** +2% production and culture for each building you have bought with gold, at most +30%.
- **Why:** The count by town asks the player to remember where each purchase went. The cap needs six bought buildings in every town, which is about 50,000 gold. One count for the empire is easy to follow and can be reached.
- **Arithmetic:** A purse seat buys about one building every five turns from turn 70, so 15 by turn 150: +30% of age 4's 476 production and 442 culture, about 275. That is a Tier IV headline. Today two bought buildings in half the towns give about 37.
- **Synergy:** **Reads:** buildings bought with gold. Fed by the whole purse. The deck then keeps two "this game" counters: Names in Stone (gold spent, for science and culture) and this card (buildings bought, for production and culture). The rule of 2026-11-10 allows one or two.
- **Shape:** Existing count `purchasedBuildings` with the gold bank, read once for the empire and not in each town. To confirm.
- **Confidence:** good

### 40. The Grain Barges (buff)

- **Tier, rarity, type:** IV, uncommon, Economic
- **Now:** Your domestic trade routes pay their destination +1 food and +1 production for every four citizens of their origin.
- **Proposed:** Your domestic trade routes pay their destination +1 food and +1 production for every three citizens of their origin.
- **Why:** It is the home market's Tier IV card, and it is under the size of a Tier III regular card.
- **Arithmetic:** Eight home routes from towns of 16 citizens: at four, +4 and +4 each, 64 in all. At three, +5 and +5 each, 80. With The Return Leg each route pays both ends: 160.
- **Synergy:** **Reads:** home routes and the citizens of the town they leave. The Return Leg and the Doctrine The Sea Ban double it.
- **Shape:** Existing shape: the divisor goes from 4 to 3.
- **Confidence:** good

### 41. The Trade Winds (move)

- **Tier, rarity, type:** IV, rare to uncommon, Economic
- **Now:** Rare: Gain +3 trade route capacity. Your trade routes reach 50% farther.
- **Proposed:** Uncommon, the same text.
- **Why:** Three more routes are worth about 60 to 75 yield in age 4. That is a regular card. Tier IV has nine rares and two uncommons today.
- **Arithmetic:** Three routes at 20 to 25 yield each. The range has a use once The Tea Horse Road is seated (change 26).
- **Synergy:** **Raises:** trade routes and route length. Feeds every route card.
- **Shape:** No shape change. Only the rarity changes.
- **Confidence:** good

### 42. The World's Exchange (buff)

- **Tier, rarity, type:** IV, rare to uncommon, Economic
- **Now:** Rare: +10% production toward the Opus for each foreign empire your trade routes reach, at most +40%.
- **Proposed:** Uncommon: +20% production toward the Opus for each foreign empire your trade routes reach.
- **Why:** It reads the Opus town alone. The generic uncommon The Grand Design pays more with no condition. You ruled on 2026-10-12 that cards toward the Magnum Opus have no cap.
- **Arithmetic:** An Opus town makes about 100 production. Four empires at +10%: +40. The Grand Design gives about +75. At +20% and no cap: four empires give +80 and five give +100.
- **Synergy:** **Reads:** the empires your routes reach. Fed by The Admiralty of Trade (change 28) and The Trade Winds. The Exchange and The World's Fair read the same number.
- **Shape:** Existing shape: the percent changes and the cap goes.
- **Confidence:** good

### 43. The World's Fair (rework)

- **Tier, rarity, type:** IV, rare, Wildcard
- **Now:** Goal: have trade routes to four empires. Reward: your trading post in each of their capitals.
- **Proposed:** Goal: have trade routes to four empires. Reward: your trade routes to other empires pay twice as much.
- **Why:** The far trade has had no capstone since Safe Conduct was cut. Four posts are worth +8 gold and +16 culture with The Factors' Houses. A doubler for routes abroad is the mirror of The Return Leg, and the seat earns it by keeping the peace with four empires.
- **Arithmetic:** Eight routes abroad at 20 to 30 yield each: +160 to +240 a turn, for the rest of the game, with no chair. That is a Tier IV headline.
- **Synergy:** **Reads:** the empires your routes reach (the goal), and everything a route abroad pays (the reward). Fed by The Common Road, The Tea Horse Road, The Neutral Flag and the shared route cards.
- **Shape:** Existing shape: a lasting `pays` on international routes with a share of 100 for every yield. The Doctrine The Sea Ban has the home version.
- **Confidence:** good
- **Depends, joins and notes:** A table of four seats has three rivals, so the goal cannot be met there. The default table has six seats.

### 44. The Great Loan (rework)

- **Tier, rarity, type:** IV, rare, Wildcard to Economic (Boon)
- **Now:** On draft: gain twenty turns of gold income. Your towns make 25% less gold for forty turns. It is built as a commission whose goal is to earn 1 gold a turn.
- **Proposed:** The same text, built as a true boon.
- **Why:** The card's face says Commission and its text says "On draft". The sheet marks it `as built`. Change 07 needs the same shape, so one piece of work fixes both.
- **Arithmetic:** At 300 to 600 gold a turn the loan is 6,000 to 12,000 gold: 1,500 to 3,000 hammers at the counter, the size of a wonder or more. The cost is a quarter of income for forty turns.
- **Synergy:** **Raises:** gold in hand. It pays for The Gilded Scaffold's wonders, Merchant Princes' great people, and gold poured into the Magnum Opus.
- **Shape:** The shape of change 07: an on-draft grant with a timed effect on the player.
- **Confidence:** strong
- **Depends, joins and notes:** It depends on question 2.

### 45. The Feitorias (new)

- **Tier, rarity, type:** IV, uncommon, Civic
- **Now:** Not in the deck.
- **Proposed:** Each town holding your trading post gives you +1 science and +1 culture for every four of its citizens.
- **Why:** Your picture: "gain passive bonuses from wealth as populations grow and the world becomes more connected". The posts planted in Tier II pay by the size of their towns in Tier IV. The feitorias were the Portuguese trading posts from West Africa to Macau.
- **Arithmetic:** Twelve post towns of 16 citizens: +48 science and +48 culture, about 96. Fourteen towns of 20: +70 and +70. A regular Tier IV card that needs no new act.
- **Synergy:** **Reads:** towns that hold your post, and their citizens. Fed by every route kept twenty turns. It is the pay-off for The Factors' Houses and The Fondaci.
- **Shape:** Existing shape: count `postCitizens` with `perTown` 4, the row of the retired The Foreign Factor. To confirm that it can count your own towns too.
- **Confidence:** good
- **Depends, joins and notes:** The Foreign Factor was cut because The Factors' Houses did its job at the same tier. This card is two tiers later and pays by size, not by count.

### 46. The Laurion Leases (doctrine)

- **Tier, rarity, type:** I, Doctrine, the goods
- **Now:** Hexes with a resource cost half as much gold to buy.
- **Proposed:** Hexes with a resource cost a quarter as much gold to buy.
- **Why:** A Doctrine is held for the whole game and should change how the seat plays. Half price saves 20 to 30 gold a hex.
- **Arithmetic:** A resource hex costs 40 to 60 gold. At a quarter it costs 10 to 15, so a seat buys every resource in reach of a new town in its first turns. Land Speculation pays half of the gold paid, so its culture falls with the price.
- **Synergy:** **Raises:** hexes owned, luxuries and their copies. Feeds The Emporia, Salt Tithes, The Staple Right, The Tiraz and The Spice Exchange.
- **Shape:** Existing shape: `rulePercent` `tilePurchase`, a number change.
- **Confidence:** good

### 47. The Sogdian Colonies (doctrine)

- **Tier, rarity, type:** II, Doctrine, the far trade
- **Now:** Each of your towns holding your trading post gains +3 culture and +3 renown, favouring merchants.
- **Proposed:** Each town holding your trading post, at home or abroad, gives you +3 culture and +3 renown, favouring merchants.
- **Why:** The Sogdians lived in other peoples' towns along the Silk Road. The Doctrine should count those towns. It is the same reading as change 14.
- **Arithmetic:** Eight posts in age 3: +24 culture and +24 renown a turn (it was +15 and +15 with five). The first great person costs 75 renown and the fourth 267, so in the middle of that ladder this is a great person about every ten turns.
- **Synergy:** **Raises:** culture and great merchants. **Reads:** towns that hold your post. Feeds The Customs Houses and A Court of Merchants.
- **Shape:** The counts of change 14.
- **Confidence:** good
- **Depends, joins and notes:** It goes with change 14. If you reject 14, keep this Doctrine as it is.

### 48. The Muda (doctrine)

- **Tier, rarity, type:** III, Doctrine, the far trade
- **Now:** Your trade routes to other empires pay +3 science and +3 culture, and cannot be plundered.
- **Proposed:** Your trade routes to other empires pay +6 science and +6 culture, and cannot be plundered.
- **Why:** A Tier III Doctrine should be worth more than a Tier III card. Today it is The Common Road with a shield.
- **Arithmetic:** Six routes abroad: +36 today, +72 at the new size. The Scholars' Roads doubles it.
- **Synergy:** **Reads:** routes abroad. Genghis Khan's The Pax Mongolica already makes every trader safe, so for that leader the second half is spent.
- **Shape:** Existing shape: number changes.
- **Confidence:** good

### 49. The Colleganza (doctrine)

- **Tier, rarity, type:** III, Doctrine (new), the goods
- **Now:** Not in the deck.
- **Proposed:** Luxuries you lend in a deal still count for you. Your units lose 4 strength.
- **Why:** Tier III has three Doctrines and none for the goods. The colleganza was the Venetian partnership: one partner gave the goods, the other sailed, and both kept a share. You approved this rule as an Order on 2026-10-23 and halved it, and the Order was cut as too narrow. As a Doctrine with a price it can be whole.
- **Arithmetic:** A seat with five kinds and three partners can lend fifteen copies and lose nothing. The partners pay with their own kinds or with gold. With Export Guilds each lent copy pays +4 culture and +2 production: +60 and +30. Each kind gained is +4 happiness, +4% science and culture (change 16) and +1 production a town (change 27). The cost: −4 on units of 45 to 80 is 5% to 9% of their strength.
- **Synergy:** **Raises:** deals, copies lent, kinds held. **Reads:** luxuries lent. It is dead beside the Doctrine The Forbidden Silks, which forbids lending. That is on purpose: the seat picks one.
- **Shape:** Existing shapes: `effectAmplifier` on `lentLuxuryCopies` at 100 (the retired The Commenda has it at 50), and a negative `combatLine`.
- **Confidence:** speculative
- **Depends, joins and notes:** It depends on question 1.

## 5. The deck if every change is approved

- 70 cards become 72: 6 leave and 8 arrive. 14 Doctrines become 15.
- Cards that read a route or a post: 26 of 72 (36%), the same share as today. Routes stay the core. What changes is that the route cards gain a second dimension, and the other two thirds of the deck become themes a seat can draft toward.
- Cards that pay gold: 16 of 72 (22%).

**How often each card is seen, after the changes:**

| Tier | Commons | Uncommons | Rares | Each common | Each uncommon | Each rare |
|---|---|---|---|---|---|---|
| 0 | 7 | 3 | 1 | 8.6% | 10% | 10% |
| I | 4 | 9 | 2 | 15% | 3.3% | 5% |
| II | 7 | 9 | 3 | 8.6% | 3.3% | 3.3% |
| III | 5 | 6 | 6 | 12% | 5% | 1.7% |
| IV | 0 | 5 | 5 | none | 15% | 5% |

- Tier IV keeps no common on purpose. One common alone would be the Commerce card of six hands in ten.
- Tier 0's one rare and Tier I's two rares are still seen a little more often than an uncommon. One more rare in each tier would fix that. I did not invent cards only to fill the count.

**Types, after the changes:**

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| 0 | 2 | 6 | 3 | 0 |
| I | 1 | 8 | 5 | 1 |
| II | 2 | 5 | 10 | 2 |
| III | 1 | 9 | 5 | 2 |
| IV | 0 | 5 | 3 | 2 |

- Charters and boons are counted by the type on their face. Military goes from 3 to 6. Tier IV still has no Military card.
- Tier II leans Civic (10 of 19). The League of Cities becomes Civic because it pays authority.

## 6. Throughlines

Each list is the theme after the changes. New and changed cards are in section 4.

### The home market (your own towns trade with each other)

- **Tier 0:** Market Day, The First Caravan (a road at turn 20), The Pack Trail
- **Tier I:** The Market Halls, The Grain Banks, The Market Writ, Provisioning Contracts
- **Tier II:** The Carters' Guild, The Home Market, Commission: The Great Fair, The League of Cities (authority); the Doctrine The Grand Canal
- **Tier III:** The Return Leg, The Chartered Metropolis, The Champagne Fairs, Caravanserai Cities; the Doctrine The Year and a Day
- **Tier IV:** The Grain Barges; the Doctrine The Sea Ban
- **The essentials:** production and food from routes, culture from the fairs, authority from the League. It pays in war and in peace.

### The far road (distance, posts and foreign courts)

- **Tier 0:** Travellers' Letters, The Pathfinders' Company, The Silent Trade
- **Tier I:** Export Guilds, Commission: The Trade Mission
- **Tier II:** The Tea Horse Road, The Common Road, The Exchange, The Factors' Houses (posts abroad), The Fondaci; the Doctrine The Sogdian Colonies
- **Tier III:** The Admiralty of Trade (no range limit), The Scholars' Roads, The Capitulations; the Doctrine The Muda
- **Tier IV:** The World's Fair (routes abroad pay twice), The Feitorias, The Neutral Flag, The World's Exchange, The Trade Winds; the Doctrine The Peace of Lodi
- **The essentials:** science and culture from routes and posts. Production is thin: Financed Industry and The Treaty Ports. It needs partners at peace, which is the deck's price.

### The goods (the different luxuries you hold, and the table)

- **Tier 0:** The Emporia, Salt Tithes, Land Speculation; the shared The Country Fair and The Merchant Shrines
- **Tier I:** The Staple Right, The Planters' Charter, Export Guilds, Commission: The Trade Mission; the Doctrine The Laurion Leases
- **Tier II:** The Tiraz, The Spice Exchange, Corner the Market, The Treaty Ports, Numidian Cavalry; the Doctrine The Forbidden Silks
- **Tier III:** The Monopoly, The Capitulations; the Doctrine The Colleganza
- **Tier IV:** The Casa da Índia
- **The essentials:** production from The Tiraz, science and culture from The Spice Exchange, happiness from the luxuries themselves. It pays from the first town.

### The purse (gold spent, and what only gold can buy)

- **Tier 0:** Land Speculation, The Nest Egg
- **Tier I:** Letters of Credit (the loan), Civic Receipts, The Strongbox, Financed Industry, The Ten Thousand; the Doctrine The Apoikia
- **Tier II:** Names in Stone, Foreign Procurement; the Doctrine The Flying Money
- **Tier III:** The Endowment, Merchant Princes, The Gilded Scaffold, A Guild Commission, The Stipendium
- **Tier IV:** Bought and Paid For, The Great Loan, Money at Work; the Doctrine The Opera del Duomo
- **The essentials:** culture and science from each purchase, production from Financed Industry and from the counter itself.

### The bankers (gold buildings and great merchants)

- **Tier I:** Commercial Education, The Market Writ, Commission: The Trade Mission
- **Tier II:** Houses of Account, The Customs Houses
- **Tier III:** The Cloth Halls, A Court of Merchants, The Strongroom, The Money Lenders
- **Tier IV:** the Doctrine The Monte di Pietà
- **The essentials:** science, happiness and production from the same Markets and Banks. It is the smallest theme, and Tier IV has no Order for it.

## 7. Example councils

### Early, end of Tier I: the goods town (five chairs, the Council of Elders)

- **Chairs:** The Silent Trade (0, Military), The Emporia (0, Economic), Salt Tithes (0, Economic), Export Guilds (I, Civic), Commission: The Trade Mission (I, Wildcard). Taken on the way and holding no chair: The First Caravan, The Planters' Charter. Doctrine: The Laurion Leases.
- **How it plays:** the seat builds no Warriors. Its first production goes into Settlers, and each town is placed beside a luxury. Each luxury hex costs 10 to 15 gold, so the seat buys them on the turn the town is founded. A caravan lays the first road at turn 20. When a neighbour offers a swap the seat says yes, twice, and a great merchant arrives to plant the first Customs House.

### Early, end of Tier II: the far road (six chairs, the Aristocracy)

- **Chairs:** The Tea Horse Road, The Common Road, The Factors' Houses (all Civic), The Tiraz (Economic), The Spice Exchange (in the Wildcard chair), The Ten Thousand (I, Military). Doctrine: The Sogdian Colonies.
- **How it plays:** the seat sends its caravans to the far capitals, not the near ones, because each three hexes pay. Twenty turns later each route leaves two posts, and each post pays gold, culture and renown. Six kinds of luxury give +24% science and culture and +6 production in every town. When a neighbour turns hostile, the seat buys Veterans in the towns on that border.

### Late, Tier III then Tier IV: the purse (eight chairs under the Merchant League, then eleven under The Estates)

- **Chairs, Tier III:** Financed Industry (I), The Cloth Halls, The Gilded Scaffold (Economic); The Endowment, Civic Receipts (I) (Civic); Names in Stone (II) and A Guild Commission (the Wildcard chairs); The Stipendium (Military). Merchant Princes takes the commission's chair when it leaves. Tier IV adds Bought and Paid For and Money at Work, and The Great Loan is taken as a boon.
- **How it plays:** every building the seat buys pays a quarter of its price in culture and a quarter in science, and moves two counters. The fifth bought building brings a great person, and after that gold buys great people directly. The Great Loan lands as one lump of 6,000 gold or more, and the seat spends it on a wonder that turn. Its army is small and well paid: +6 to +8 strength.

## 8. Where this pass touches other work

### The Expansionist pass and the tended-land question

- **Change 02, The First Caravan:** a caravan lays a road at Tier 0. Expansionist's The Road Home also joins new towns by road at Tier 0, and The Road Towns (Tier I), Provincial Councils (Tier II) and The Imperial Roads (Tier III) read joined towns. The pair gets its roads about 40 turns earlier.
- **Change 15, The League of Cities:** 1 less authority for a town that sends a route. Provincial Councils gives 1 less for a town joined by road. Together a town costs 1. If the Expansionist pass changes its authority cards, the two should be sized together.
- **Changes 11, 16, 17 and 27:** the goods read the luxuries that Expansionist claims and improves. Plantations are the improvement the two decks share (The Planters' Charter and the shared The Provincial Fair).
- **If tended land is dropped:** no Commerce card reads tended land, so nothing here breaks. The Wild Orchards pays +1 food and +1 gold, and it is the one tended work with a Commerce flavour. The pair's bridge on the land would then be resources: The Country Fair, The Provincial Fair and the goods.
- **If tended land is kept and made larger:** I would not add a Commerce card for it. The goods already give the pair a quantity on the land that every game produces.
- **The shared cards:** this pass changes none of the three (The Country Fair, Market Gardens, The Provincial Fair).

### The leaders (`docs/plans/leader-roster-pass-2026-11-19.md`, section 4)

- **Genghis Khan (Dominion + Commerce):** richer. The Yam's range now buys gold and culture (change 26). The Ten Thousand feeds Dominion's rank cards. The Pax Mongolica makes the second half of The Muda spent.
- **Pachacuti (Expansionist + Commerce):** richer. The First Caravan joins the second town at turn 20, which is what The Qhapaq Ñan pays for.
- **Mansa Musa (Commerce + Devotion):** about the same. The mines lose Mining Districts and gain +1 gold on The Mineral Trade. The goods changes suit a seat that settles for gold and salt.
- **Cleopatra (Commerce + Scientific):** richer. The Scholars' Roads doubles Books from the Ships. The Trade Mission and Merchant Princes at Tier III call great people for The Museion. Her kit no longer reads deals, so the deal cards are a choice for her, not a need.
- **Lorenzo de' Medici (Commerce + Magisterial):** richer. The Cloth Halls is a fourth reader of gold buildings beside Florins. Merchant Princes arrives a tier early beside The Medici Bank. The Condottiere is bought with gold, so The Ten Thousand makes it a Veteran. His theme loses The Bourse.
- **Ibn Battuta (every deck):** The Funduq pays on routes abroad, and the far road gives those routes more to do.

### The great people (`docs/plans/great-people-pass-2026-11-19.md`)

- The great-people pass rules that Strike a Bargain pays 8 turns of gold. Changes 13 and 20 are sized on that.
- A seat gains its first merchant a tier earlier (change 13), and each Customs House pays twice as much (change 20). The Customs Service leaves the list of the merchant's cards (change 33).
- No change here touches a person's own line.

## 9. Four things that are not card changes

- **Deals end after twenty turns, and nothing offers to sign them again.** Every card that reads a deal turns that into a chore. A small fix: when a deal ends, the game offers the same deal again in one press, and a bot that would still accept it does so. This is a decision about the interface, so it is yours. Without it I would keep the deal cards to the four in this pass.
- **The Brokers' Redraw has no button.** The shared card (with Magisterial) lets gold redraw a hand, and no screen offers it. Until it does, the card is dead in play. It is one of the few things only gold can buy before Tier III.
- **Gold is priced two ways.** Card text counts 2 gold as 1 of another yield. The counter charges 4 gold a hammer. I propose no change. It means a card that pays gold is worth a quarter of its number in hammers, and that is why the deck's gold cards read larger than they play.
- **Three sheet texts differ from the game's own words.** Salt Tithes: the sheet says "each different luxury you have improved", and the game counts each luxury you hold, deals included. The Merchant Shrines: the sheet says "working", and the game says "holding". Numidian Cavalry: the game's words for the charter leave out the +1 strength for each luxury, which is on the unit.

## 10. What to test first, and what I could not determine

### What to test first

1. The First Caravan at turn 10 to 20: does the route start, does the road join the towns, and does it feel like an opening?
2. The Silent Trade for a whole age 1: is a game with no barbarian war more fun or less?
3. The Tiraz and The Spice Exchange together: does the player go looking for a seventh luxury?
4. Letters of Credit on the draft: what does the player buy with 400 gold, and do they notice the thirty turns?
5. The Tea Horse Road: does the player pick the far town, and does the Trade screen show the distance?
6. Houses of Account at +1: is happiness tight for a Commerce seat in age 3?
7. Tier IV hands: with five uncommons and five rares, does the seat see a different Commerce card in each hand?

### What I could not determine

- **No play evidence for this deck.** `docs/playtest_notes.md` has no Commerce game, and the bot measurements of 2026-10-13 are older than the themes pass and the simplification. The case that the deck is one-note rests on the tally of the cards, not on a game.
- **How many merchants in the trades a seat has,** so I left The Merchant Guilds alone and could not size it.
- **How many great merchants a human seat calls,** and how the gold price of a great-person draft climbs after 1,000.
- **Whether route slots or gold limit the number of routes.** A Market gives one slot, and the hire price climbs by 15 gold a route. I assumed about ten routes in age 3.
- **Seven shape points for the triage:** whether a route can start before Currency (02); whether a rank stamp can be narrowed to bought units (12); whether a luxury on loan from a post counts as a kind held (16, 27); whether a combat line can scale with gold income (37); whether the bought-buildings count can be read for the whole empire (39); whether the count of citizens in post towns can include your own towns (45); and how purchase discounts stack (the Doctrine The Flying Money with Lorenzo's Condottiere).
- **Whether a deal can lend a strategic copy** (change 23).
- **The history is from my own knowledge,** not from a source in the repo. One fit is loose: The Feitorias is a 15th-century institution, which suits Tier IV, but The Stipendium is Roman pay on a Tier III card.

## Questions for the user

Five questions change the build. Each has my recommended answer.

1. **Do deals stay a quantity that cards read?** Recommended: yes, and keep them few. Your picture of the deck names deals, and you took the deal count out of Cleopatra's kit on 2026-11-19. This pass keeps Export Guilds, makes The Treaty Ports larger (18), and adds one commission (13) and one Doctrine (49). If the answer is no, reject 13, 18 and 49, and the goods still work through settling, buying and posts.
2. **May a boon carry a timed drawback?** Recommended: yes, for rares only. Letters of Credit (07) and The Great Loan (44) both pay gold on the draft and take a share of gold income for a number of turns. It needs one new shape. If the answer is no, Letters of Credit keeps its rule with a floor of −400, and The Great Loan stays a commission.
3. **May a route run at Tier 0, before Currency?** Recommended: yes, for the one caravan of The First Caravan (02). You ruled on 2026-10-21 that route cards come at Tier II, and on 2026-11-10 you added two route cards at Tier 0. Today those two pay nothing in their own tier. If the answer is no, I would move The Pack Trail and The First Caravan to Tier I.
4. **Should the pass fix the rarity mix of each tier?** Recommended: yes. Tiers III and IV have no common, and Tier IV has nine rares. Eleven changes move a rarity (02, 05, 24, 25, 28, 29, 30, 31, 34, 41, 42). They can be approved as a group.
5. **May Tier 0 hold a rare that changes a rule?** Recommended: yes. The Silent Trade (04) is not a plain yield, which the rule of 2026-11-10 asks of a Tier 0 card. You approved Blood Brothers and The Ver Sacrum at Tier 0 in the Dominion pass on 2026-11-19. If the answer is no, the card moves to Tier I, where it is worth less.
