# Devotion design pass (2026-11-20)

**Status, 2026-11-20:** nothing here is ruled yet. This is a proposal for you to approve or reject, one change at a time. Nothing is built, and no game data changed.

Your request, 2026-11-20:

> *"ok lets do a pass on devotion and scientific."*

- This pass covers Devotion. Another agent runs the Scientific pass beside it. Change 58 and section 6 say where the two touch.
- It proposes 61 changes. You asked the earlier passes to go for more changes than needed, and this one does the same.
- It starts from the deck after the other four passes: wild and tended land are gone (the Expansionist pass's change 45), Sacred Groves reads worked forests, and Commerce added The Votive Accounts and The Incense Road and cut The Silk Road Monks.
- The method is the card-design skill. "Now" is the card's text in `data/decks/devotion.json` or `data/decks/common.json`. I printed every card with the game's own describer (`describeCard`) and the texts agree.
- Every number is a first guess against the power bar, to tune in playtest. I ran no bot games and no tests.
- The arithmetic uses these rates. Faith counts at half its face value where the seat can buy with it (2 faith a hammer). Gold counts at half (your rate of 2026-09-03). Culture in Tiers 0 and I counts three times.
- A Devotion seat's faith is my estimate: about 8 a turn at turn 40, 30 in age 2, 100 in age 3 and 300 in age 4. The median seat of any deck made 0, 14, 36 and 128 in the bot games.

**The proposal by kind:** 7 buff, 15 rework, 9 cut, 8 move, 20 new, 2 doctrine.

## 1. Why the deck plays as it does

In three sentences:

1. **From Tier II on, the deck asks one question: is your religion here?** 30 of the 43 cards in Tiers II to IV pay nothing until the seat has founded a religion. After that the religion spreads by itself, so most of those cards ask the player to do nothing.
2. **The deck pays the same reward too often, and it hides its best cards.** 12 cards pay "science and culture" as a pair, and all six Tier 0 cards pay faith. Tier III has seven rares that are each seen in 1 hand of 70, and Tier IV is nine rares and one uncommon.
3. **The acts that are Devotion's own are thin, or they are chores.** A rite is one click a town every ten turns, at a price that rises all game. Faith buys a short list of things, and the wide permission is a Tier II rare. Seven cards pay a holy site, and a seat has one.

### 1.1 The tally: what each card reads, by tier

| What the card reads | 0 | I | II | III | IV | All |
|---|---|---|---|---|---|---|
| The religion: a god, a devout town, a follower, the clergy | 0 | 1 | 10 | 6 | 6 | 23 |
| Holy sites | 0 | 0 | 4 | 2 | 1 | 7 |
| Faith spent, and purchases with faith | 0 | 4 | 2 | 3 | 0 | 9 |
| Rites | 0 | 5 | 1 | 1 | 1 | 8 |
| Faith buildings, and the Granary | 1 | 3 | 0 | 2 | 1 | 7 |
| Faith income and the faith you hold | 4 | 0 | 0 | 2 | 1 | 7 |
| The land: pastures, camps, plantations | 1 | 0 | 0 | 0 | 0 | 1 |
| The army: units lost | 0 | 1 | 0 | 0 | 0 | 1 |
| **All** | 6 | 14 | 17 | 16 | 10 | 63 |

- Each card is counted once, by the thing the player must have or do for it to pay. The 63 are the deck's own live cards. The shared cards are not in the table.
- **The religion and its holy sites are 30 of 63 cards (48%).** A holy site needs a founded religion, so the two rows are one bet. The Creed is in the first row and needs only a god. The Psalter is in the rites row and needs a devout town. So 30 cards wait for the founding: 14 of 17 in Tier II, 9 of 16 in Tier III and 7 of 10 in Tier IV.
- **What the cards pay is the second note.** 16 of 63 pay faith (25%), so the rule "no more than a third pay the deck's own yield" holds. But 12 cards pay "science and culture" in equal parts, and their texts read alike: The Fast, The Settled Faith, The Living Hymnal, The Book of Life, The Psalter, The Consecration Feast, The Mass Baptisms, The Learned Clergy, The Chapter Houses, The Seven Pilgrimages, The Apostolic Succession and The Treasury of Merit.
- **Themes that are in the deck's picture but have too few cards to draft toward:** the land (1 card, at Tier 0); the army (5 Military cards, and none before Tier II); faith buildings in Tier II (no card); rites after Tier I (3 cards in three tiers); great people and wonders (1 card, The Pious Masons).

### 1.2 What a Devotion seat does on the map and in its turns

| What the seat does | How often | Cards of the deck that pay for it |
|---|---|---|
| Nothing: the religion spreads to the towns in range (the tide) | every turn, with no input | about 20 |
| Starts a rite in a town | every ten turns, for each town | 8 |
| Buys with faith: clergy, and what a card opens | every few turns | 9 |
| Builds a Shrine, a Temple and a Cathedral in each town | once a town each | 7 |
| Buys a prophet and founds the religion | once | the 30 cards above |
| Buys a prophet and raises a further holy site | once or twice a game | 7 |
| Takes a god or a belief | five to eight times a game | 2 |
| Walks an apostle to a town and proclaims | when the player wants to | 1 directly, 5 through a conversion |

- Any seat builds Shrines, and any seat with faith can say a rite. So the honest answer to "what does a Devotion seat do that no other seat does" is: it founds a religion, and then it waits for the religion to spread.
- **A devout town has one dimension.** A town follows your religion or it does not. The tide decides it, and the player's only tools are a proclamation and patience.
- **A holy site is the best act in the deck, and the rarest.** The player picks a hex, and seven cards pay that hex. But a further site costs a whole prophet (180 faith, then 240), and the same prophets are needed for beliefs.
- **Nothing on the map belongs to this deck before the prophet.** Expansionist has ten unique improvements and Scientific has two. Devotion has none.

### 1.3 What faith buys, and whether spending is a choice

| What faith buys | Price | Who can buy it |
|---|---|---|
| A god | 40, 56, 72, 90 faith | every seat; three or four in a game |
| A rite, for ten turns in one town | 20 faith, and 5 more for each rite the empire has started | every seat with Divination |
| A prophet (two charges) | 120 faith, and 60 more each time | every seat with The High Temple |
| An apostle (two charges) | 90 faith, and 40 more each time | a seat with a religion and Theology |
| An inquisitor | 200 faith | age 4 |
| A faith house of a follower belief | 2 faith a hammer | a seat whose religion holds the belief |
| Any unit, in a town with a Cathedral | 2 faith a hammer | every seat, from age 3 |
| Hammers for a Cathedral or the Magnum Opus | 2 faith a hammer | every seat |
| Workers; religious buildings; melee units | 2 faith a hammer | Consecrated Labor; The Gifts of the Faithful; the shared The Shrine Guards |
| Any building, in a town with a Temple | 2 faith a hammer | The Lay Brothers, a Tier II rare |
| A half-built wonder; a great person | 2 faith a hammer; 750 faith | The Pious Masons and the shared Sacred Patronage, both Tier III rares |

- **Faith is a strong currency.** It buys a hammer for 2, and gold pays 4. The deck's design doc says that spending faith in place of production "should be the core of the deck".
- **Before age 3 the core is behind cards, and the cards are narrow.** Four cards each open one class of thing. The one that opens all buildings is a rare that a seat is offered in about one game of three.
- **Spending is a choice only between the gods, the rites and the clergy.** That choice is real in ages 1 and 2. After the religion is founded and the beliefs are full, faith has no large use until the Cathedral, and a seat holds hundreds of it.
- **The price of a rite rises for the whole game** (your rule of 2026-10-28). The 20th rite costs 115 faith and the 40th costs 215. A seat of eight towns that keeps a rite in each starts 40 rites in 50 turns. So the cards that pay for rites pay less and less for each point of faith.
- **One card pays the seat to hold faith** (The Treasury of Merit), against five that pay it to spend.

### 1.4 Chores: what the cards ask the player to do

- **Rites.** A town's rite ends after ten turns, and the game has no renewal. Six towns are six clicks every ten turns. Five Tier I cards and two shared cards pay for it (The Rogations, The Founding Vows, The Rites Commonwealth, The Fast, The Octave, The Priest-Astronomers, The Festival Calendar). The Octave is the only card that lowers the count of clicks. This is the real chore in the deck.
- **Prophets.** A prophet walks 2 hexes a turn from the town that bought it. Founding, a further holy site and a belief each use the whole prophet. A seat buys four to six in a game. Each is a short walk and one decision, and I count the holy site as a decision on the map.
- **Apostles.** An apostle walks 4 hexes a turn and has two charges: a proclamation, a heal, or a relic for a Cathedral town. The Mission, The Conversion of Kings, Pentecost and The Mass Baptisms pay for conversions, but the tide makes most conversions with no apostle. Mission Houses makes a proclamation 30% stronger, and nothing on the screen shows it.
- **The Oriflamme** (shared with Dominion) asks the player to walk a religious unit beside the army every turn. The unit is a civilian, and an enemy captures it.
- **Remembering.** The Offered Stones counts the buildings bought with faith in each town. You cut the shared The Waqf for that reason.
- **Inquisitors.** No card reads them. I leave them alone.

### 1.5 The seat that founds late, or not at all

- The world holds religions for two thirds of its seats, rounded up (`maxReligions`): four in a game of six, three in a game of four. A prophet needs The High Temple and 120 faith, after the first gods have taken 96.
- A seat with no religion is paid by 3 of the 17 cards of Tier II (The Sabbath Laws, The Lay Brothers, The Book of Life), 7 of 16 in Tier III and 3 of 10 in Tier IV. A seat that founds twenty turns after Tier II opens has those hands for twenty turns.
- "Devout" asks for a religion whose holy city you hold. So a seat whose towns all follow a neighbour's religion has no devout town, though the follower beliefs pay it.
- Tiers 0 and I are safe: none of their 20 cards needs a religion. That was your ruling of 2026-10-25, and it works.
- No card helps a seat win the race except The Calling, which pays +3 faith.
- I could not measure how often a Devotion seat loses the race or founds late. No bot games have been measured since the deck was rebuilt.

### 1.6 Dead and nearly dead cards

- **The Offering Chests (Tier III, common)** discounts soldiers bought with faith. A seat buys soldiers with faith only in a Cathedral town, with the shared The Shrine Guards, or as Joan of Arc. It is the Devotion card of 3 hands in 10 at Tier III.
- **The Seven Pilgrimages (Tier IV)** pays +2 science and +2 culture in two towns for a seat with two holy sites. It is the Devotion card of 3 hands in 4 at Tier IV.
- **Mission Houses (Tier II)** adds 18 to a lump of 60.
- **The Confessors (Tier II)** shares sight that no card reads.
- **The Pilgrim Towns (Tier III)** pays about 6 culture.
- **The Saints' Fields and The Old Holy Places (Tier II)** pay 9 and 6 on one hex. A regular Tier II card pays 35 to 60.
- **The First Offering (Tier 0)** is 25 faith once. **The Founding Vows (Tier I)** is 100 faith and 40 food for two rites. Both are under the size at which a lump is noticed.
- **The Sacred Host (shared, Tier I, rare)** pays 15 faith a kill in every age.
- **The Tithe (shared, Tier II, rare)** paid nothing in 27 samples of the bot games of 2026-10-13. I did not check if that is still so.

### 1.7 Rares that are weaker than commons

| The rare | Pays | The common or uncommon that beats it |
|---|---|---|
| The Rites Commonwealth (I) | about +2 happiness in each town that keeps a rite | The Temple Storehouses (common): +2 food and +2 happiness in each Temple town, with no rite |
| The Sacred Host (shared, I) | 15 faith a kill | Rites of Passage (common, Tier 0): 12 faith for each military unit gained |
| The Settled Faith (II) | +15% science and culture in devout towns: about +28 in age 3 | The Living Hymnal (uncommon): +30 science and +30 culture with ten towns that follow |
| The Apostolic Succession (IV) | at most +24 science and +24 culture, eighty turns after the founding | The Cathedral Works (common, Tier III): +64 science in eight Cathedral towns |
| The Treasury of Merit (IV) | +20 science and +20 culture for 1,000 faith held | The Learned Clergy (uncommon, Tier III): +60 and +60 at 300 faith a turn |
| The Tithe of Nations (IV) | +75 faith with 150 followers in the world | The Holy Inquisition (uncommon, Tier III): +105 faith at 300 a turn |
| The Great Commission (IV) | after half the world follows: +36 faith and +36 culture in twelve devout towns | The Chapter Houses: +96 and +96 in eight Cathedral towns |

### 1.8 How often each card is seen

- A hand holds one card for each of the seat's two decks, and a third card that goes round four kinds: generic, shared, generic, and one more from a deck (`drawHandPositions` in `src/sim/statecraft/draft.ts`). The game rolls a rarity first, at 60 / 30 / 10, over the rarities the deck holds in the current tier. Then it picks evenly inside that rarity.
- The table gives the chance that one named card is the Devotion card of a hand, before the seat holds any card of the tier.

| Tier | Commons | Uncommons | Rares | Each common | Each uncommon | Each rare |
|---|---|---|---|---|---|---|
| 0 | 5 | 1 | 0 | 13% | 33% | none |
| I | 7 | 6 | 1 | 8.6% | 5.0% | 10% |
| II | 3 | 12 | 2 | 20% | 2.5% | 5.0% |
| III | 2 | 7 | 7 | 30% | 4.3% | 1.4% |
| IV | 0 | 1 | 9 | none | 75% | 2.8% |

- **Tier 0** has no rare. The one uncommon, The Royal Cult, is the Devotion card of 1 hand in 3.
- **Tier I:** the one rare, The Rites Commonwealth, is seen more often than any other card of the tier.
- **Tier II:** all three commons pay a holy site (Temple Estates, The Saints' Fields, The Old Holy Places). So 6 Devotion hands in 10 show a holy-site card, to a seat that has one site. Each of the two rares is seen twice as often as each of the twelve uncommons.
- **Tier III:** two commons take 6 hands in 10 (The Offering Chests and The Cathedral Works). The seven rares share 1 hand in 10. They are the capstones of every theme: The Caliphate, The Abbeys, Pentecost, The Turning of Swords, The Pious Masons, The Doctors of the Church and The Conversion of Kings. A seat is offered each of them in about one game of nine.
- **Tier IV** has no common. The Seven Pilgrimages is shown in 3 hands of 4 until the seat takes it. The nine rares share the rest.
- The pass moves rarities so that each tier has commons that any seat can use, and no tier has more rares than it can show. Section 5 has the table after the changes.

### 1.9 Gaps by tier and by chair

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| 0 | 0 | 1 | 5 | 0 |
| I | 0 | 5 | 8 | 1 |
| II | 2 | 2 | 11 | 2 |
| III | 2 | 2 | 11 | 1 |
| IV | 1 | 1 | 7 | 1 |

- **Military:** five cards in the deck, and none in Tiers 0 and I. Every government seats a Military chair. A seat paired with Dominion has four shared Military cards; any other seat fills the chair from the generic cards.
- **Economic:** 11 cards of 63, and two or fewer in each of Tiers II, III and IV.
- **Civic:** 42 of 63 (67%). A government with few Civic chairs leaves most Devotion hands with nothing to seat.
- **Rares:** none in Tier 0. **Commons:** none in Tier IV, and two in Tier III.
- **Boons:** one, at Tier 0. **Charters:** two.
- **The map:** no improvement of the deck's own before the prophet.

### 1.10 Doubles

- **A flat faith figure for the capital or for every town, three times in Tier 0:** The Calling, The Royal Cult and The Household Gods.
- **Faith buys one class of thing, four times:** Consecrated Labor (workers), The Gifts of the Faithful (religious buildings), The Lay Brothers (other buildings) and the shared The Shrine Guards (melee units).
- **A holy site's own hex, twice, and its neighbours once:** The Saints' Fields, The Old Holy Places and Temple Estates. All three are Tier II commons.
- **A town with a Shrine or a Temple gains food and happiness, twice:** The Wayside Shrines and The Temple Storehouses.
- **Devout towns cost less authority, twice:** Commission: The State Church (1 less) and The Caliphate (none).
- **Towns that work a holy site, twice:** The Pilgrim Towns and The Seven Pilgrimages.
- **Faith into science and culture, twice, in opposite directions:** The Learned Clergy reads faith income, and The Treasury of Merit reads faith held.
- **Years since the founding:** The Apostolic Succession counts turns, in the same tier where The Book of Life has reached its cap.

### 1.11 Science, culture and production

- **Culture:** reachable in every tier from Tier I: The Creed, The Rogations, The Pilgrim Staff, The Sabbath Laws, The Living Hymnal, The Offered Stones.
- **Science:** none in Tier 0. In Tier I only The Fast, which stops a town's growth. From Tier II it comes as half of a "science and culture" pair, in the cards that need the religion.
- **Production:** The Tithe Barns (+1 in a Granary town) and The Votive Gifts (faith into a build) are the deck's only production. The deck is meant to buy in place of building, and the cards that let it buy are narrow or rare (1.3).
- **Food and happiness:** this is what the deck does well early: The Wayside Shrines, The Temple Storehouses, Lay Offerings, The Deaconries.

### 1.12 Authority

- Your ruling in the Commerce pass: *"I don't like too many cards that lower authority on a per-city level"*, and *"Authority needs to be a limiting factor for growth."*
- Devotion has two such cards: Commission: The State Church (devout towns cost 1 less) and The Caliphate (devout towns cost none). The Mosque of the belief Minarets gives +1 authority in each town that holds one.
- Your picture of the deck says that "faith allows greater authority and wider empires". So the deck should give authority, but as a figure that the seat earns, not as a cut for each town.
- Change 23 rewrites the commission in the words of your own line for The Market Writ. The Caliphate stays as the deck's one rule-breaker, as The Imperial Roads stays in Expansionist. Question 2 asks if you want it changed too.

### 1.13 The pairs in one line each, and how a shared card is seen

- **Dominion:** Devotion gives faith that buys and heals an army, and strength on the faith's ground. It takes kills, garrisons and captured towns. Five shared cards, none after Tier II.
- **Expansionist:** Devotion gives happiness for large towns. It takes citizens, public works and new towns. Three shared cards, all in Tier 0.
- **Commerce:** Devotion gives a second bank. It takes luxuries, routes and purchases. Five shared cards after the Commerce pass, in Tiers 0 to II.
- **Scientific:** Devotion gives faith buildings that teach. It takes Libraries and Academies. Six shared cards, in Tiers I to III.
- **Magisterial:** Devotion gives faith for great people and wonders. It takes wonders, works and festivals. Four shared cards, in Tiers I to III.
- **A shared card is in one hand of four.** It is drawn from every two-deck card that names either of the seat's decks, so a seat sees about two shared cards in each of Tiers I to III. More shared cards do not make any one of them more likely. So I add shared cards only where a pair has an empty tier.

## 2. The notes: what I tested, and what I recommend

- The religion stays the core. The aim is range: other things for the cards to read, which the playstyle makes by itself.
- I tested ten notes against one question: does a seat that drafts one card of the note still get paid?
- I recommend five. A, B and C are new notes. D is the deck's engine made wider and earlier. E is small.

### A. The temple economy: faith buildings (Recommended)

- **The quantity:** the faith buildings a town holds: a Shrine, a Temple, a Cathedral, a Chapel, a faith house, and a leader's building.
- **Who raises it:** every seat builds a Shrine and a Temple. A Devotion seat buys them with faith.
- **Who reads it today:** First Rites, The Temple Storehouses, The Cathedral Works, The Chapter Houses, the shared The Painted Chapels and the Cathedral School. You wrote two of its cards yourself (The Tithe Barns and The Temple Storehouses). Tier II has no card of it.
- **The changes:** each faith building pays food and production (12). The herds and gardens of a town count its faith buildings (28). A finished faith building pays production (33). Faith buildings yield twice (38). Towns start with a Shrine (54). The Doctrine for four more faith houses comes a tier sooner (60).
- **The floor:** a seat with a Shrine and a Temple in four towns gains +8 food and +8 production from The Temple Workshops alone.
- **What it does to play:** a faith building becomes the first thing a new town wants, and buying one with faith starts the town's economy.
- **The partner decks:** Harun al-Rashid's line pays the same buildings. Magisterial's The Painted Chapels pays culture on them. Expansionist's new towns start with one.

### B. Rites as acts (Recommended)

- **The moment and the quantity:** a rite started, and the towns that keep a rite. Both are built.
- **The problem:** a rite is a click a town every ten turns, at a rising price, for +1 food on a few hexes. The cards pay for the clicks.
- **The changes:** the capital's rite is kept by the whole realm (08). A Chapel makes a town's rite last for ever (09). Rites last twice as long (10). Two new rites do things no building does: the Saturnalia halves a town's happiness demand and stops its gold (27), and the Rite of Naming adds a citizen at once (40). The Double Feast comes down from Tier IV to Tier II (30). Units gained in a rite town start as Veterans (22). The Psalter loses its second condition (32).
- **The floor:** rites need Divination and faith, and no religion. A seat that drafts only The Rites Commonwealth gains about +20 food or +16 science in age 2 for one click every ten turns.
- **What it does to play:** the realm's rite is one decision every ten turns: grow, study, feast, or rest. The new rites are things to do that no other deck has, and they use the rite menu that exists.
- **The partner decks:** Expansionist spends the citizens that the Rite of Naming makes. Dominion gains Veterans. The shared The Festival Calendar and The Priest-Astronomers read rite towns.

### C. Holy ground: holy sites and sacred works on the map (Recommended)

- **The quantities:** holy sites, and two new unique improvements: the stone circle and the cliff monastery.
- **The problem:** seven cards pay a holy site and a seat has one. The deck has nothing to build on the map before the prophet.
- **The changes:** a stone circle at Tier 0 that counts the herds and plantations beside it (03). A cliff monastery at Tier II that counts mountains (26). A holy site that counts the improved hexes beside it (14), grows with age (16), and is paid by every town that follows (31). Two cards that supply sites become easier to see (17, 18). Three flat cards go (15, 42, 43). A Doctrine for the ring round each Shrine town (59).
- **The floor:** the stone circle and the cliff monastery need no religion and no chair. A seat that takes only The Megaliths gains about 4 faith and 1 culture a turn from one hex in age 1.
- **What it does to play:** where the seat puts a pasture, a town and a holy site becomes a choice. The site is worth more each age.
- **The partner decks:** both new works are unique improvements, so Expansionist's The Reclaimed Lands and The Cadastre pay them. Justinian and Mansa Musa read holy sites. A holy site is a great person's work, so Magisterial's cards for works pay it.

### D. The purse of faith: wider and earlier (Recommended)

- **The moment:** faith spent, and a purchase with faith. Both are built.
- **The problem:** the deck's way round its production gap is a Tier II rare, and the large purchases are Tier III and IV rares.
- **The changes:** Shrine towns buy settlers and workers (05) and all buildings (06) from Tier I. Everything bought with faith costs 20% less (07). Two more cards pay when faith is spent (36, 37), and one counts what was bought (34). A boon gives ten turns of faith at Tier IV (47). The card that pays the seat to hold faith goes (44). A great person's faith price follows renown, as the gold price does (57).
- **The floor:** every seat with faith spends it. A seat that drafts only The Gifts of the Faithful turns 30 faith a turn into 15 hammers a turn, in the town of its choice.
- **What it does to play:** each turn the seat chooses between a settler, a building, a rite and the prophet. A threat on the border is answered with faith.
- **The partner decks:** Commerce buys beside it with gold, and its The Double Entry doubles the purchase cards. Mansa Musa is the seat to test.

### E. The army of the faith (Recommended, small)

- **The problem:** five Military cards, none before Tier II, and one of them shares sight.
- **The changes:** one Military card that takes a chair in each of Tiers 0, I, III and IV (04, 13, 39, 49), The Fetials in place of The Confessors (21, 22), and flat points only.
- **The floor:** each card pays a seat at peace: healing, and strength from faith income.
- **The partner deck:** Dominion. The shared cards change in three places (51, 52, 53).

### F. Relics (Not recommended now)

- A relic is one a Cathedral town, placed by an apostle. It comes late and it stops at one a town. You rejected The Relic Trade in the Commerce pass. I would come back to relics with a new act for them, not with a card that counts them.

### G. The clergy's acts as a moment (Not recommended)

- A card that pays for each charge spent would pay the player to walk units. The deck has enough walking.

### H. Defending the faith: inquisitors and purges (Not recommended)

- It reads what a rival's religion does, which the player cannot raise. The rule of 2026-11-10 asks that no card reads what a rival does.

### I. Pilgrim routes (Leave to the shared cards)

- Routes are Commerce's material. Pilgrim Markets and Mansa Musa's The Hajj hold this note, and the Commerce pass ruled on it.

### J. Followers abroad (The core: no new cards)

- The spread has cards in every tier from II. The pass moves one earlier (29), cuts two (20, 21), and ties the count of towns that follow to the holy sites (31), the army (39) and the last commission (46).

## 3. Index

| # | Card | Tier | Change | Confidence | Ruling |
|---|---|---|---|---|---|
| 01 | The Calling | 0 | rework | good |  |
| 02 | The First Offering | 0 | buff | good |  |
| 03 | The Megaliths | 0 | new | good |  |
| 04 | The Healer-Priests | 0 | new | fair |  |
| 05 | Consecrated Labor | I | buff | good on the shape, fair on the size |  |
| 06 | The Gifts of the Faithful | I | rework | good |  |
| 07 | The Offering Chests | III to I | rework | good |  |
| 08 | The Rites Commonwealth | I | rework | good on the idea, fair on the size |  |
| 09 | The Chantries | I | new | fair |  |
| 10 | The Octave | I | buff | good |  |
| 11 | The Founding Vows | I | buff | good |  |
| 12 | The Temple Workshops (was The Wayside Shrines) | I | rework | good |  |
| 13 | The Zealots | I | new | good |  |
| 14 | Temple Estates | II | rework | good |  |
| 15 | The Saints' Fields | II | cut | good |  |
| 16 | The Old Holy Places | II | rework | fair |  |
| 17 | The Anchorites | II | move | good |  |
| 18 | The Abbeys | III to II | move | good |  |
| 19 | The Lay Brothers | II | cut | good |  |
| 20 | Mission Houses | II | cut | good |  |
| 21 | The Confessors | II | cut | good |  |
| 22 | The Fetials | II | new | good |  |
| 23 | Commission: The State Church | II | rework | good |  |
| 24 | The Settled Faith | II | move | good |  |
| 25 | Tier II rarities | II | move | good |  |
| 26 | The Cliff Monasteries | II | new | good |  |
| 27 | The Saturnalia | II | new | fair |  |
| 28 | The Temple Herds | II | new | good |  |
| 29 | Pentecost | III to II | move | good |  |
| 30 | The Double Feast | IV to II | move | good |  |
| 31 | The Pilgrim Towns | III | rework | good |  |
| 32 | The Psalter | III | buff | good |  |
| 33 | The Consecration Feast | III | rework | fair |  |
| 34 | The Offered Stones | III | rework | good |  |
| 35 | The Holy Inquisition | III | move | good |  |
| 36 | The Sacred Bequests | III | new | good |  |
| 37 | The Fabric Fund | III | new | good |  |
| 38 | The Prince-Bishops | III | new | good on the idea, fair on the size |  |
| 39 | The Defenders of the Faith | III | new | good |  |
| 40 | The Naming Feasts | III | new | fair |  |
| 41 | The Conversion of Kings | III | buff | good |  |
| 42 | The Seven Pilgrimages | IV | cut | good |  |
| 43 | The Apostolic Succession | IV | cut | good |  |
| 44 | The Treasury of Merit | IV | cut | good |  |
| 45 | Tier IV rarities | IV | move | good |  |
| 46 | The Great Commission | IV | buff | good |  |
| 47 | The Year of Release | IV | new | good |  |
| 48 | The Poor Tables | IV | new | fair |  |
| 49 | The Soldiers of God | IV | new | good |  |
| 50 | The City of God | IV | new | fair |  |
| 51 | The Sacred Host (shared with Dominion) | I | rework | good |  |
| 52 | The Oriflamme (shared with Dominion) | I | cut | fair |  |
| 53 | The Garrison Chapels (shared with Dominion) | III | new | good |  |
| 54 | The Hearth Fire (shared with Expansionist) | I | new | good |  |
| 55 | The Temple Baths (shared with Expansionist) | II | new | fair |  |
| 56 | Sacred Commissions (shared with Magisterial) | II | rework | good |  |
| 57 | Sacred Patronage (shared with Magisterial) | III | rework | good |  |
| 58 | The Blessed Forges (shared with Scientific) | II | cut | fair |  |
| 59 | The Temenos (Doctrine) | I | doctrine | fair |  |
| 60 | The House of Worship (Doctrine) | IV to III | doctrine | fair |  |
| 61 | A seat with no religion of its own (rule) | all | rework | fair |  |

## 4. The changes

### 01. The Calling (rework)

- **Tier, rarity, type:** 0, common to rare, Civic (Boon)
- **Now:** Your capital gains +3 faith.
- **Proposed:** On draft: your first prophet costs no faith.
- **Why:** Three Tier 0 cards pay a flat faith figure to the capital or to every town (The Calling, The Royal Cult, The Household Gods), and none of them changes a decision. The race to found a religion decides whether 30 later cards pay. This card settles the race for the seat that drafts it, and it lets the seat spend its first faith on rites, Shrines and settlers.
- **Arithmetic:** A prophet costs 120 faith. A Devotion seat makes about 8 faith a turn at turn 40, and the first two gods take 96, so the first prophet comes at about turn 60 to 70 today. With the card the seat buys the prophet on the turn it learns The High Temple. A Tier 0 lump registers at 50 to 100. This one is 120 faith (60 at the half rate), and it arrives ten to twenty turns sooner. It is a boon, so it takes no chair while the seat waits.
- **Synergy:** **Raises:** the religion, and how early it comes. It feeds every card of Tiers II to IV that needs a religion. With Consecrated Labor (05) and The Gifts of the Faithful (06) the early faith goes to settlers and buildings, and the founding still happens.
- **Shape:** Small extension: a boon that leaves a lasting effect (the Commerce pass asks for the same for The First Caravan). The effect is a `purchaseRider` of 100% off the prophet, for the first one only.
- **Confidence:** good
- **Depends, joins and notes:** Tier 0 has no rare today. The Commerce and Dominion passes both gave Tier 0 a rare that changes a rule, and you approved them.

### 02. The First Offering (buff)

- **Tier, rarity, type:** 0, common, Civic (Boon)
- **Now:** On draft: gain 25 faith.
- **Proposed:** On draft: gain 60 faith.
- **Why:** 25 faith is less than half the price of the first god. It is the weakest card in Tier 0.
- **Arithmetic:** The gods cost 40, 56 and 72 faith (`ladder` in `data/religion.json`). A Tier 0 lump registers at 50 to 100. 60 faith pays the first god and a third of the second, or a settler under change 05.
- **Synergy:** **Raises:** faith held, and faith spent. It feeds The Pilgrim Staff and The Book of Life when it is spent.
- **Shape:** Existing shape: a number change on the boon's grant.
- **Confidence:** good

### 03. The Megaliths (new)

- **Tier, rarity, type:** 0, uncommon, Civic (Charter)
- **Now:** Not in the deck.
- **Proposed:** Workers may raise one stone circle in each town, on flat land: +2 faith and +1 culture, and +1 faith more for each pasture, camp or plantation beside it.
- **Why:** You liked the Nazca lines: a named work that reads the hexes beside it. `docs/decks/deck-design.md` gives Devotion the pastures, camps and plantations, and only Lay Offerings reads them today. The stone circle gives the seat a holy place on the map in age 1, before any prophet, and it makes the place of each herd matter. Megaliths belong to the first age: Carnac, Stonehenge, Göbekli Tepe.
- **Arithmetic:** A stone circle with two herds or plantations beside it yields 4 faith and 1 culture, on top of the ground's own 2 food: 7 on one hex, against 3 or 4 for a farm. Culture counts three times in Tier 0. A median seat makes no faith at all in age 1 (the power bar), so 4 faith a turn from one hex at turn 30 is a strong Tier 0 card (4 to 8), for one worker charge and no chair. Three towns late: 12 to 15 faith and 3 culture.
- **Synergy:** **Raises:** faith with no religion, and unique improvements (the Expansionist pass's keyword), so that deck's Commission: The Reclaimed Lands and The Cadastre pay it. **Reads:** pastures, camps and plantations. Fed by Lay Offerings, The Temple Herds (28), Dominion's herd cards and Commerce's The Planters' Charter.
- **Shape:** New improvement row `stoneCircle`: flat land, one in each town. The yield "for each hex beside it that…" is the new shape of the Expansionist pass (Nazca lines, the baray, the hillfort), so it is built once. `charter.unlocks` exists. The work needs a model, an icon and a flair-gallery entry in the same batch as its row.
- **Confidence:** good
- **Depends, joins and notes:** The god The Standing Stones and the wonder Stonehenge have names near this one. The work itself is called a stone circle. Question 3 asks if Devotion may open unique improvements.

### 04. The Healer-Priests (new)

- **Tier, rarity, type:** 0, common, Military
- **Now:** Not in the deck.
- **Proposed:** Your units heal twice as fast in your own territory.
- **Why:** Tiers 0 and I have no Military card of the deck's own, and every government seats a Military chair. Healing is the way this deck helps an army: the apostle heals, and The Host Restored heals at Tier IV. The card is useful at peace, against barbarians.
- **Arithmetic:** A rested unit heals 10 health a turn (`healing.perTurnIfRested`). With the card it heals 20 inside your borders. A Warrior at 40 health is back in three turns, not six. For a seat with three Warriors in age 1 that is about one more Warrior on the frontier (15 hammers), with nothing more to order. It adds no combat points; the regular Tier 0 line is +2 or +3.
- **Synergy:** **Raises:** units kept alive. **Reads:** your own territory. It works with the shared Rites of Passage and The Shrine Guards, and with Dominion's garrison cards. It works against The Martyrology, which pays for units lost.
- **Shape:** Small extension: a heal bonus read in `healUnits` (`src/sim/turn.ts`), where the rule `noHealAbroad` is read today.
- **Confidence:** fair
- **Depends, joins and notes:** A plain card for an empty chair. If you want none, the generic The Marchmen and Far Runners fill the chair.

### 05. Consecrated Labor (buff)

- **Tier, rarity, type:** I, common, Economic
- **Now:** Cities with a Shrine may buy workers with faith.
- **Proposed:** Towns with a Shrine may buy settlers and workers with faith.
- **Why:** A worker costs 20 faith, so the card is a small permission today. Your picture of the deck says that faith allows wider empires. With settlers, the seat chooses each time between a new town now and the prophet later. That is the first real choice of how to spend faith, and it comes in age 1.
- **Arithmetic:** A settler is 28 hammers before its ladder: 56 faith, against 112 gold. A seat that makes 8 to 10 faith a turn at turn 40 buys a settler every six or seven turns if it buys nothing else, when a town makes about 5 production. That is about twice the rate at which a seat settles in age 1. Two things limit it: authority (a founded town costs 3) and the 120 faith for the prophet. A town buys one unit of each class a turn.
- **Synergy:** **Raises:** towns founded, improvements built, faith spent. **Reads:** Shrines. It feeds The Pilgrim Staff, The Book of Life, the shared The Votive Accounts, The Parishes and the shared The Hearth Fire (54). Fed by every faith card of Tier 0.
- **Shape:** Existing shape: `faithBuysUnits` with a class. One more row for the settler. Data only.
- **Confidence:** good on the shape, fair on the size
- **Depends, joins and notes:** If it is too fast, the price of a settler bought with faith can rise with each one bought. Question 4 asks about the size of this card and of change 06.

### 06. The Gifts of the Faithful (rework)

- **Tier, rarity, type:** I, common to uncommon, Economic
- **Now:** Religious buildings may be bought with faith.
- **Proposed:** Towns with a Shrine may buy buildings with faith. Not wonders.
- **Why:** `docs/decks/deck-design.md` says that spending faith in place of production "should be the core of the deck". Today four narrow cards each open one class (workers, religious buildings, melee units, and ordinary buildings in a Temple town), and the wide one is The Lay Brothers, a Tier II rare that a seat is offered in one game of three. This change makes one card of two, an uncommon at Tier I.
- **Arithmetic:** Faith buys a hammer for 2 (`faithPerHammer`); gold pays 4. Age 2: 30 faith a turn buys 15 hammers a turn in any Shrine town, when a town makes about 10. Age 3: 100 faith buys 50 hammers, against about 15 a town. Age 4: 300 faith buys 150, against about 35 a town. So the card is worth one town's production when drafted and four towns' late, if all the faith goes to buildings. A regular Tier I card pays 15 to 25. Faith spent here is not spent on rites, clergy or settlers.
- **Synergy:** **Raises:** buildings, faith spent, buildings bought with faith. **Reads:** Shrines. It feeds The Pilgrim Staff (a fourth comes back as culture), The Book of Life, The Offered Stones (34), The Fabric Fund (37), The Consecration Feast (33), the shared The Votive Accounts and the generic The Brick Kilns. Commerce's The Double Entry doubles the cards that pay on a purchase.
- **Shape:** Existing shape: `faithBuysBuildings` with the Shrine scope and no category. Data only.
- **Confidence:** good
- **Depends, joins and notes:** You removed The Monastic Builders (science buildings for faith) as "kind of boring". That card was one more narrow key. This is the whole door. The great person al-Khwārizmī's clause (science buildings for faith) becomes a part of it. Change 19 cuts The Lay Brothers.

### 07. The Offering Chests (rework)

- **Tier, rarity, type:** III to I, common to rare, Military to Economic
- **Now:** Military units bought with faith cost 30% less.
- **Proposed:** Everything you buy with faith costs 20% less.
- **Why:** You approved The Open Market for gold with the words "Wow thats crazy, lets add this". This is the same rule for the other bank. Today's card discounts a purchase that few seats can make, and it is the Devotion card of 3 hands in 10 at Tier III.
- **Arithmetic:** It reaches units, buildings, prophets, apostles and inquisitors. A prophet costs 96 and an apostle 72. With change 05 a settler costs 45. Age 2: a seat that spends 30 faith a turn saves 6. Age 3: 20. Age 4: 60. It is small when drafted, as The Open Market is, and the seat plans around it for the whole game. With the Commerce pass's change 118, discounts on one purchase add up to half at most: The Alms Box (a belief, 20%) makes 40%, and the Doctrine The Canons of the Holy Sepulchre (30%) makes 50%.
- **Synergy:** **Raises:** what each point of faith buys. **Reads:** every purchase with faith. Fed by 05, 06, the shared The Shrine Guards, Cathedral towns, and Joan of Arc's Sainte-Chapelle.
- **Shape:** Small extension: a `purchaseRider` in the faith bank that reaches every purchase. The Open Market asks for the same in the gold bank.
- **Confidence:** good
- **Depends, joins and notes:** A reading: "buy" means a purchase. A rite, a god and a redraw are not purchases, and the card does not change their prices. To confirm.

### 08. The Rites Commonwealth (rework)

- **Tier, rarity, type:** I, rare, Civic
- **Now:** Cities keeping a rite demand 25% less population happiness.
- **Proposed:** A rite your capital starts is kept by every town you hold.
- **Why:** A rite is one click a town every ten turns, and five Tier I cards pay for those clicks. With this card the realm makes one decision every ten turns: which rite now? The rare of today gives about 2 happiness in each rite town, which is less than the common The Temple Storehouses gives.
- **Arithmetic:** Four towns in age 2. One price buys four rites: 20 faith for the first rite, and 5 more for each rite started. The Rite of the Harvest gives +1 food on about 5 hexes a town: +20 food. Omen Reading gives +1 science for each building: about +16 science. A regular Tier I card pays 15 to 25, and this one costs 4 to 8 faith a turn. The price rises one step for each town the rite reaches, as a prophet's rite over the realm does today, so with six towns each cast makes the next one cost 30 more. It limits itself. Every card that reads "a town keeping a rite" then pays in every town.
- **Synergy:** **Raises:** towns keeping a rite, rites started. **Reads:** the capital's rite. It feeds The Rogations and the shared The Votive Accounts (one step for each town), The Psalter (32), The Fetials (22), the Doctrine The Rites of Zhou, and the shared The Festival Calendar and The Priest-Astronomers.
- **Shape:** Small extension: the capital's rite goes down the realm's path, which exists for the prophet's rite and for the Doctrine Human Sacrifice (`empireRiteAt`, `sayRiteOverRealm`).
- **Confidence:** good on the idea, fair on the size
- **Depends, joins and notes:** Readings: the cast counts as a rite started in each town it reaches (the ruling of batch DV4 for the prophet's rite). A rite that acts at once is said by one town only, as the code has it today. A season that a card opens is carried too, so the whole realm may fast or keep the Sabbath. The Rogations has no cap, and it is the card to watch.

### 09. The Chantries (new)

- **Tier, rarity, type:** I, uncommon, Civic (Charter)
- **Now:** Not in the deck.
- **Proposed:** Unlocks the Chapel, a building you may buy with faith: +1 faith, and the rite its town keeps does not end.
- **Why:** You like a named building that a card opens. The Chapel's row is in the data, and no live card opens it (its charter was retired with the old pool). A chantry was a gift of money that paid for masses to be said for ever. The card turns a rite from a click every ten turns into a town's standing choice.
- **Arithmetic:** The Chapel is a medium building in column 2: 52 hammers, or 104 faith. After that the town pays no more rite prices. In the middle game the tenth to the thirtieth rite costs 65 to 165 faith, so a town saves 4 to 10 faith a turn. The town keeps what its rite gives (about 5 food, or 5 to 10 science) and every "keeping a rite" card, for good. The cost: a chantry town starts no new rites, so The Rogations, The Psalter and The Votive Accounts stop counting there.
- **Synergy:** **Raises:** towns keeping a rite, and faith buildings (one more in each town, for The Temple Workshops, The Prince-Bishops, the shared The Painted Chapels and the Cathedral School). **Reads:** rites.
- **Shape:** `unlocksBuilding` exists (the retired row `ritesCharter` used it). New: a mark on a building that stops its town's rite from ending. The row's `ritePays: 5` goes. Small extension.
- **Confidence:** fair
- **Depends, joins and notes:** To change its rite, a chantry town starts another at the ordinary price. With change 08, a chantry town keeps its own rite and takes the realm's rite only if it has a free place, which is the rule The Double Feast uses. To confirm. The first thing to test is the shared The Festival Calendar (+30% food and culture) in a town that keeps a rite for ever.

### 10. The Octave (buff)

- **Tier, rarity, type:** I, uncommon, Civic
- **Now:** Your rites last 50% longer.
- **Proposed:** Your rites last twice as long.
- **Why:** It is the one card that makes rites less of a chore, and at 50% it is hard to feel.
- **Arithmetic:** Ten turns become twenty. The clicks halve, and so does the faith spent on rites: about 3 to 8 faith a turn saved for each rite town in ages 2 and 3. The cards that count rites started gain half as often, which is a real cost. The wonder Chichen Itza gives +50% more, and the two add up to 25 turns.
- **Synergy:** **Raises:** the turns a rite lasts. **Reads:** rites. It works with 08 and The Double Feast, and against The Rogations and The Psalter.
- **Shape:** Existing shape: `effectAmplifier` on `riteDuration`, a number change.
- **Confidence:** good

### 11. The Founding Vows (buff)

- **Tier, rarity, type:** I, uncommon, Wildcard (Commission)
- **Now:** Goal: start two rites. Reward: 100 faith, and 40 food in your capital.
- **Proposed:** Goal: start three rites. Reward: 250 faith.
- **Why:** The reward is under the size at which a lump is noticed. A vow should pay for the founding.
- **Arithmetic:** Three rites cost 20, 25 and 30 faith: 75. A Tier I lump registers at 200 to 400. 250 faith is a prophet (120) and most of an apostle, or four settlers under change 05.
- **Synergy:** **Raises:** faith held. **Reads:** rites started. Fed by 08 (one cast in a realm of three towns meets the goal) and The Fast.
- **Shape:** Existing shape: a number change on the commission. The food grant goes.
- **Confidence:** good

### 12. The Temple Workshops (was The Wayside Shrines) (rework)

- **Tier, rarity, type:** I, common, Economic
- **Now:** The Wayside Shrines: Cities with a Shrine gain +2 food and +1 happiness.
- **Proposed:** Faith buildings give +1 food and +1 production each.
- **Why:** The Wayside Shrines and The Temple Storehouses do one job on two buildings. This card pays every faith building, on the building's own line, so that modifiers multiply it (your rule for the customs house). Production is the deck's gap. Here it comes from what the deck builds in any game. The model is your line for Magisterial's Civic Granaries: "culture buildings grant +1 food and +2 production each."
- **Arithmetic:** Age 2: a Shrine and a Temple in four towns: +8 food and +8 production. A regular Tier I card pays 15 to 25. Age 3: three buildings in eight towns: +24 and +24. Age 4, with a Chapel and a faith house: five buildings in twelve towns: +60 and +60. The old card's +1 happiness in a Shrine town is lost. The Temple Storehouses keeps +2 for each Temple.
- **Synergy:** **Raises:** food and production. **Reads:** faith buildings. Fed by 06, The Chantries (09), the shared The Hearth Fire (54), the faith houses of the follower beliefs, and the Doctrine The House of Worship. The Prince-Bishops (38) and the generic The Builders' Lodge double it. Harun al-Rashid's line sits on the same buildings.
- **Shape:** Existing shape: `pays` for each building of a category (the shared The Painted Chapels pays +3 culture for each faith building). Data only. The row `theWaysideShrines` keeps its id.
- **Confidence:** good
- **Depends, joins and notes:** The sheet's older word is "religious buildings". Your lines for the leaders say "faith buildings", and I use that.

### 13. The Zealots (new)

- **Tier, rarity, type:** I, common, Military
- **Now:** Not in the deck.
- **Proposed:** Your units gain +1 strength for every 10 faith you make each turn, at most +5.
- **Why:** Tier I has no Military card of the deck's own. This one needs no religion and no war building, and it pays in flat points. The model is Commerce's The Stipendium (+1 for every 50 gold, at most +8), which you approved.
- **Arithmetic:** Age 2: 30 faith a turn gives +3, the regular Tier I line. From 50 faith a turn it gives +5, which is 10% of a unit of age 3 (42 to 50). A strong Tier I line is +6.
- **Synergy:** **Raises:** strength. **Reads:** faith income. Fed by every faith card. It adds to the Doctrine The Paean, The Spiritual Host and Joan of Arc's The Maid.
- **Shape:** Small extension: strength scaled by an income (the Commerce pass lists it for The Stipendium), read from the faith rate.
- **Confidence:** good

### 14. Temple Estates (rework)

- **Tier, rarity, type:** II, common, Civic to Economic
- **Now:** Hexes beside a Holy Site gain +2 food and +2 faith.
- **Proposed:** A holy site gains +2 food and +2 production for each improved hex beside it.
- **Why:** A named thing that reads its neighbours. The pay is on the site, so one citizen collects all of it and every modifier of the hex multiplies it. Today six citizens must work six hexes to collect the same amount. It also makes the place of a holy site a decision on the map.
- **Arithmetic:** Four improved hexes beside the site: +8 food and +8 production on one hex. Six: +12 and +12. With one site that is 16 to 24, and a regular Tier II card pays 35 to 60, so the card wants a second site (change 17). The Doctrine The Two Sanctuaries doubles it.
- **Synergy:** **Raises:** food and production on a great person's work. **Reads:** improved hexes beside a holy site. Fed by any worker, by Expansionist, and by The Anchorites and The Abbeys. Justinian adds +5 production on the same hex.
- **Shape:** The yield "for each hex beside it that…" of the Expansionist pass, on a card's hex row (that pass's The Mountain Sluices is the model). The type changes from Civic to Economic.
- **Confidence:** good

### 15. The Saints' Fields (cut)

- **Tier, rarity, type:** II, common, Economic
- **Now:** Holy Sites gain +5 food and +8 gold.
- **Proposed:** Cut. The row is retired.
- **Why:** All three commons of Tier II pay a holy site, so 6 Devotion hands in 10 show a holy-site card to a seat that has one site. Change 14 pays the site its food. The gold was there for Mansa Musa, and The Hajj pays him gold already.
- **Arithmetic:** It pays 9 a turn at the half rate for gold, on one hex. A regular Tier II card pays 35 to 60.
- **Synergy:** The holy places keep Temple Estates (14), The Old Holy Places (16), The Anchorites (17), The Abbeys (18) and The Pilgrim Towns (31).
- **Shape:** No shape. `retired: true`.
- **Confidence:** good

### 16. The Old Holy Places (rework)

- **Tier, rarity, type:** II, common to uncommon, Civic
- **Now:** Holy Sites gain +3 faith and +3 culture.
- **Proposed:** Holy sites gain +1 faith and +1 culture for every ten turns they have stood, at most +10 of each.
- **Why:** Your picture of the deck is an early investment that pays back late. A holy place grows greater with age. The card takes over the job of The Apostolic Succession (43), and it pays on the site, where modifiers multiply it.
- **Arithmetic:** A site raised on turn 60 pays +1 and +1 on turn 70, +7 and +7 when Tier III opens (turn 133), and +10 and +10 from turn 160. Two more sites raised on turn 90 bring the total to 24 faith and 24 culture on turn 160. Today the card pays 3 and 3 a site. It is small when drafted, and it is the theme's scaler.
- **Synergy:** **Raises:** faith and culture on the site. **Reads:** the age of each holy site. The Doctrine The Two Sanctuaries doubles it. Fed by The Calling (01), which founds sooner.
- **Shape:** The tile test `standingSince` exists (Expansionist's Dark Earth). A hex row that counts the tens of turns a work has stood is a small extension.
- **Confidence:** fair

### 17. The Anchorites (move)

- **Tier, rarity, type:** II, uncommon to common, Civic
- **Now:** Uncommon: Your prophets raise a further holy site for one charge instead of two.
- **Proposed:** Common, the same text.
- **Why:** Seven Orders, three shared cards and two Doctrines pay a holy site, and a seat has one. A further site costs a whole prophet today: 180 faith for the second prophet and 240 for the third. The card that supplies sites must be seen.
- **Arithmetic:** As a common it is the Devotion card of 1 hand in 10, against 1 in 40 today. One prophet then raises two sites, at 90 faith each. With The Second Prophet it raises three.
- **Synergy:** **Raises:** holy sites. It feeds 14, 16 and 31, the shared Pilgrim Markets, the Doctrines The Canons of the Holy Sepulchre and The Two Sanctuaries, Mansa Musa's The Hajj and Justinian's One Faith, One Empire.
- **Shape:** No shape change. Only the rarity changes.
- **Confidence:** good
- **Depends, joins and notes:** Justinian gains +2 happiness for each holy site, so this is also a happiness card for him. To watch.

### 18. The Abbeys (move)

- **Tier, rarity, type:** III to II, rare, Civic
- **Now:** Tier III: Your apostles may raise holy sites, as prophets do.
- **Proposed:** Tier II, the same text.
- **Why:** A card that supplies a theme's material belongs early. Apostles come with Theology in age 3, and Tier II runs through most of age 3. Tier III has seven rares today, so the card is offered in about one game of nine.
- **Arithmetic:** An apostle has two charges and costs 90 faith, and 40 more each time. A holy site costs two charges, or one with The Anchorites. So a site costs 90 to 130 faith, or 45 to 65 with both cards.
- **Synergy:** **Raises:** holy sites. It feeds the same cards as change 17.
- **Shape:** No shape change. Only the tier changes.
- **Confidence:** good

### 19. The Lay Brothers (cut)

- **Tier, rarity, type:** II, rare, Economic
- **Now:** Cities with a Temple may buy ordinary buildings with faith, at the faith rate.
- **Proposed:** Cut. The row is retired. The Gifts of the Faithful (06) does its job from Tier I.
- **Why:** It is the same permission as change 06, one tier later, behind a Temple and a rare.
- **Arithmetic:** Each of the two rares of Tier II is the Devotion card of 1 hand in 20. A seat sees eight or nine Devotion cards in the tier, so it is offered this one in about one game of three.
- **Synergy:** Nothing is lost: every card it fed is fed by 06.
- **Shape:** No shape. `retired: true`.
- **Confidence:** good
- **Depends, joins and notes:** It depends on change 06. If you reject 06, keep this card and make it an uncommon.

### 20. Mission Houses (cut)

- **Tier, rarity, type:** II, uncommon, Civic
- **Now:** Your proclamations press 30% harder.
- **Proposed:** Cut. The row is retired.
- **Why:** The game builds it as +18 on a lump of 60. Nothing on the screen shows the difference, no card counts it, and it asks the player to walk an apostle to use it.
- **Arithmetic:** A proclamation of 60 turns six citizens (`pressurePerConvert` 10). With the card it turns seven or eight.
- **Synergy:** The spread keeps The Second Prophet, The Mission, Pentecost and The Mass Baptisms.
- **Shape:** No shape. `retired: true`.
- **Confidence:** good

### 21. The Confessors (cut)

- **Tier, rarity, type:** II, uncommon, Military
- **Now:** Towns that follow your religion share their sight with you.
- **Proposed:** Cut. The row is retired. The Fetials (22) takes its chair.
- **Why:** No card reads sight. A seat that has converted a neighbour's towns has met that neighbour and seen the towns. It is one of the deck's five Military cards, and it helps no fight.
- **Arithmetic:** It pays nothing a turn.
- **Synergy:** Nothing reads it.
- **Shape:** No shape. `retired: true`. The rule `followersShareSight` stays for saves.
- **Confidence:** good

### 22. The Fetials (new)

- **Tier, rarity, type:** II, uncommon, Military
- **Now:** Not in the deck.
- **Proposed:** Military units you gain in a town keeping a rite start as Veterans.
- **Why:** It ties the rites to the army. The fetials were the Roman priests whose rite opened a war. The model is Commerce's The Ten Thousand (units bought with gold start as Veterans), which you approved.
- **Arithmetic:** A Veteran has +3 strength (`ranks.ladder.veteran`) and is on the way to Elite (+6). The regular Tier II line is +5. With change 08 or 09 every town keeps a rite, so every unit gained starts as a Veteran.
- **Synergy:** **Raises:** ranks. **Reads:** towns keeping a rite, and units gained. A Veteran start earns a rank (your ruling in the Dominion pass: "yes"), so Dominion's cards for a rank earned pay. Fed by 08, 09, the shared The Shrine Guards and The Muster of the Fields.
- **Shape:** Small extension: the rank stamp (`unitStamp`) narrowed by a town scope (`keepingRite`). The Ten Thousand asks for the same stamp narrowed to gold purchases.
- **Confidence:** good

### 23. Commission: The State Church (rework)

- **Tier, rarity, type:** II, uncommon, Wildcard (Commission)
- **Now:** Goal: hold six towns, all devout. Reward: devout towns cost 1 less authority.
- **Proposed:** Goal: hold six towns, all devout. Reward: +1 authority and +1 happiness for every two devout towns.
- **Why:** Your ruling in the Commerce pass: "I don't like too many cards that lower authority on a per-city level", and "Authority needs to be a limiting factor for growth." The new reward uses your own line for The Market Writ. The deck also has two cards for one job today: this one, and The Caliphate.
- **Arithmetic:** Six devout towns: +3 authority and +3 happiness (today 6 authority). Twelve: +6 and +6 (today 12). A founded town costs 3 authority, so the reward pays for one town in six.
- **Synergy:** **Raises:** authority and happiness. **Reads:** devout towns. Fed by The Parishes and the tide.
- **Shape:** Existing shapes: `authority` and `happiness` by a count of towns under the scope `ownersFaith`, as a commission's lasting reward. Data only.
- **Confidence:** good
- **Depends, joins and notes:** Question 2 asks about The Caliphate, which this pass leaves as it is.

### 24. The Settled Faith (move)

- **Tier, rarity, type:** II, rare to uncommon, Civic
- **Now:** Rare: Devout towns gain +15% science and culture.
- **Proposed:** Uncommon, the same text.
- **Why:** A plain percentage is not a rare. You approved the same move for Commerce's Private Patronage.
- **Arithmetic:** A seat of age 3 makes about 106 science and 83 culture: +28 if every town is devout. A regular Tier II card pays 35 to 60, so it is a little under when drafted, and it grows with every flat card.
- **Synergy:** **Raises:** science and culture. **Reads:** devout towns, and every flat science and culture line in them.
- **Shape:** No shape change. Only the rarity changes.
- **Confidence:** good

### 25. Tier II rarities (move)

- **Tier, rarity, type:** II, three cards, uncommon to common
- **Now:** The Deaconries, The Parishes and The Spiritual Host are uncommons. Tier II holds 3 commons, 12 uncommons and 2 rares.
- **Proposed:** The Deaconries, The Parishes and The Spiritual Host become commons. With the other changes Tier II holds 6 commons, 11 uncommons and 3 rares.
- **Why:** Each of the three is a plain card that pays any seat with a religion. Today each uncommon of Tier II is seen in 1 hand of 40, and each rare in 1 of 20, so the rares are seen twice as often as the uncommons.
- **Arithmetic:** Today: a common 20% of hands, an uncommon 2.5%, a rare 5%. After the pass: a common 10%, an uncommon 2.7%, a rare 3.3%.
- **Synergy:** The sixth common is The Temple Herds (28), which needs no religion.
- **Shape:** No shape change. Three rarities change.
- **Confidence:** good

### 26. The Cliff Monasteries (new)

- **Tier, rarity, type:** II, uncommon, Civic (Charter)
- **Now:** Not in the deck.
- **Proposed:** Workers may build one cliff monastery in each town, on a hex beside a mountain: +3 faith and +3 science, and +1 of each more for each mountain beside it.
- **Why:** A second sacred work for the map, and it needs no religion. Monks built where the rock was: Meteora, Sumela, the Tiger's Nest. It gives the deck a reason to settle under mountains, where the shared The Holy Spring already pays.
- **Arithmetic:** It yields 3 faith and 3 science. Mountains stand in ranges, so one or two more are beside it: 8 to 10 on one hex, on top of the ground's own yield. 63% of capitals have land beside a mountain (the Expansionist pass's count of 48 starts). A seat of six towns has the ground in about four of them: 32 to 40 a turn for four worker charges and no chair. A regular Tier II card pays 35 to 60.
- **Synergy:** **Raises:** faith, science, and unique improvements. **Reads:** mountains. It works with the shared The Holy Spring, the god Star Readers, Expansionist's high-country cards, The Reclaimed Lands and The Cadastre (+3 science), and Harun al-Rashid's science.
- **Shape:** New improvement row `cliffMonastery`: beside a mountain (the terraces' row has `mountainFoot`), one in each town. The yield for each mountain beside it exists for the Doctrine The High Towns. It needs a model, an icon and a flair-gallery entry.
- **Confidence:** good
- **Depends, joins and notes:** It can stand on the ground that Pachacuti's terraces use. He holds Expansionist and Commerce, so the two do not meet, except for Ibn Battuta.

### 27. The Saturnalia (new)

- **Tier, rarity, type:** II, uncommon, Civic (Charter)
- **Now:** Not in the deck.
- **Proposed:** Unlocks the Saturnalia: for ten turns a town's citizens demand half as much happiness, and the town makes no gold.
- **Why:** `docs/decks/deck-design.md` asks for rites with real trade-offs. Your picture says that faith lets large towns stay happy. In the Saturnalia the shops shut and the masters served the slaves. The rite gives the seat a tool for the turns when happiness binds, at a price it can see.
- **Arithmetic:** A town of 12 citizens demands 12 happiness. The rite gives back 6 for ten turns, for one rite price (45 to 100 faith in ages 2 and 3) and the town's gold (5 to 10 a turn). Under change 08 the whole realm keeps it: eight towns of 10 give +40 happiness and no town makes gold for ten turns. That is two tiers of the happiness bonus (+10% at 5 spare, +20% at 10), and it costs 50 to 100 gold a turn while upkeep is still due.
- **Synergy:** **Raises:** happiness, for a season. **Reads:** rites. It feeds every card that counts a rite started or a town keeping a rite. It works against the shared The Tithe.
- **Shape:** `RiteDef.byCard` exists. The rite's effects are `rulePercent` on `happinessDemand` (the old Rites Commonwealth's shape) and a percentage on the town's gold. Data only, I think.
- **Confidence:** fair

### 28. The Temple Herds (new)

- **Tier, rarity, type:** II, common, Economic
- **Now:** Not in the deck.
- **Proposed:** Pastures, camps and plantations gain +1 food and +1 production for each faith building in their town, at most +3 of each.
- **Why:** `docs/decks/deck-design.md` gives Devotion the pastures, camps and plantations. One card reads them today, at Tier 0. This card ties them to the faith buildings: the temple's flocks and gardens. It is also a Tier II common that needs no religion.
- **Arithmetic:** A town has one or two such hexes. With a Shrine and a Temple each gains +2 and +2. Six towns and nine hexes: +18 food and +18 production. A regular Tier II card pays 35 to 60. With a third building: +27 and +27.
- **Synergy:** **Raises:** food and production, on the hexes that a stone circle counts (03). **Reads:** pastures, camps and plantations, and faith buildings. Fed by Lay Offerings, Dominion's pastures, Commerce's plantations (The Latifundia doubles a luxury hex) and 06.
- **Shape:** Small extension: a hex row that counts the buildings of its town. The Commerce pass asks for it for The Patrons' Quarter.
- **Confidence:** good

### 29. Pentecost (move)

- **Tier, rarity, type:** III to II, rare, Civic
- **Now:** Tier III: When a foreign town turns to your religion, your religion presses every town within four hexes of it.
- **Proposed:** Tier II, the same text.
- **Why:** It supplies the spread, and supply belongs early. Tier III has seven rares today.
- **Arithmetic:** Each rare of Tier III is the Devotion card of 1.4% of hands, so Pentecost is offered in about one game of nine. At Tier II, with three rares, it is 3.3% of hands: about one game in four.
- **Synergy:** **Raises:** towns that follow your religion. It feeds The Living Hymnal, The Mission, The Mass Baptisms, The Pilgrim Towns (31) and The Defenders of the Faith (39).
- **Shape:** No shape change. Only the tier changes.
- **Confidence:** good

### 30. The Double Feast (move)

- **Tier, rarity, type:** IV to II, rare, Civic
- **Now:** Tier IV: Your towns may keep two rites at once.
- **Proposed:** Tier II, the same text.
- **Why:** It is the rule-breaker of the rites, and it waits at Tier IV, which half the seats reach, as one of nine rares. A seat should be able to build around it.
- **Arithmetic:** Two rites in a town: the Harvest and Omen Reading together give about +5 food and +8 science. Under change 08 the capital starts two rites for the realm. The price rises twice as fast. The shared The Festival Calendar reads whether a town keeps a rite, not how many, so it does not double.
- **Synergy:** **Raises:** rites started, and what a rite town makes. Fed by 08, 09, The Octave, The Fast, The Sabbath Laws and The Saturnalia (27).
- **Shape:** No shape change. Only the tier changes.
- **Confidence:** good

### 31. The Pilgrim Towns (rework)

- **Tier, rarity, type:** III, uncommon, Civic
- **Now:** Towns working a holy site gain +20% culture.
- **Proposed:** Holy sites gain +1 production and +1 culture for each town that follows your religion.
- **Why:** It ties the spread of the religion to the holy places: the pilgrims come from every town that follows. Production reaches the deck through its faith, which is how the deck is meant to cover its gap. Today the card pays about 6 culture.
- **Arithmetic:** Ten towns follow at Tier III (eight of yours and two abroad): +10 and +10 on each site. Two sites: 40. Twenty towns and three sites late: 120. A regular Tier III card pays 60 to 120. The Doctrine The Two Sanctuaries doubles it. The belief Ecclesia pays +1 faith on the same count.
- **Synergy:** **Raises:** production and culture on the site. **Reads:** towns that follow your religion, and holy sites. Fed by the tide, Pentecost, The Parishes, The Anchorites and The Abbeys.
- **Shape:** `pays` on a hex by the count `followingCities`. The belief Ecclesia does this for a belief; for a card's hex row it may be a small extension.
- **Confidence:** good

### 32. The Psalter (buff)

- **Tier, rarity, type:** III, uncommon, Civic
- **Now:** Each rite started in a devout town grants science and culture equal to five times the town's population.
- **Proposed:** Each rite a town starts grants science and culture equal to five times the town's population.
- **Why:** The card has two conditions. Without "devout" it pays a seat with no religion, and the text is shorter.
- **Arithmetic:** A town of 10 citizens: 50 science and 50 culture for each rite. Eight towns under change 08: 400 and 400 every ten turns, which is 80 a turn. A regular Tier III card pays 60 to 120. The Octave halves how often it pays.
- **Synergy:** **Raises:** science and culture. **Reads:** rites started, and citizens. Fed by 08, The Double Feast and The Naming Feasts (40).
- **Shape:** Existing shape: remove `inTown` from the two riders.
- **Confidence:** good

### 33. The Consecration Feast (rework)

- **Tier, rarity, type:** III, uncommon, Civic to Economic
- **Now:** Finishing a Cathedral grants science and culture equal to twenty times the town's population.
- **Proposed:** Finishing a faith building grants its town production equal to ten times its population.
- **Why:** Twelve cards of the deck pay "science and culture" as a pair, and one building is a narrow moment. A consecration that pays production starts the town's next building. A building bought with faith counts, because a purchase finishes the thing.
- **Arithmetic:** A town of 10 that buys a Chapel for 104 faith gains 100 production. A Cathedral in a town of 14 gives 140. A seat finishes about ten faith buildings in the tier (Cathedrals, Chapels, faith houses, and the Shrines and Temples of new towns): about 1,200 production over 30 turns, which is 40 a turn. That is under the regular bar of 60 to 120, and it lands in lumps where the player chooses.
- **Synergy:** **Raises:** production. **Reads:** faith buildings finished, and citizens. Fed by 06, 09, the shared The Hearth Fire, and the Doctrine The House of Worship (60).
- **Shape:** Existing shape: `windfallRider` on `buildingCompletion`, with production from the town's population. The rider names one building today; a category is a small extension.
- **Confidence:** fair

### 34. The Offered Stones (rework)

- **Tier, rarity, type:** III, uncommon, Economic
- **Now:** Buildings you bought with faith give +2 culture each.
- **Proposed:** +2 culture for each building you have bought with faith.
- **Why:** The card counts the bought buildings town by town. You cut the shared The Waqf because "the player must remember which buildings they bought". The Commerce pass changed Bought and Paid For in the same way.
- **Arithmetic:** With change 06 a seat buys about two buildings every three turns in age 3. 30 bought when Tier III opens: +60 culture. 60 late: +120. A regular Tier III card pays 60 to 120.
- **Synergy:** **Raises:** culture. **Reads:** buildings bought with faith, this game. Fed by 06 and 07.
- **Shape:** Small extension: buildings bought, counted for the whole empire, in the faith bank. The Commerce pass asks for the same in the gold bank. The seated card prints its total.
- **Confidence:** good

### 35. The Holy Inquisition (move)

- **Tier, rarity, type:** III, uncommon to common, Civic
- **Now:** Uncommon: +35% faith.
- **Proposed:** Common, the same text.
- **Why:** A plain percentage of the deck's own yield is a common. Tier III has two commons today, and each is the Devotion card of 3 hands in 10.
- **Arithmetic:** 100 faith a turn in age 3: +35. 300 in age 4: +105. At the half rate that is 17 and 52.
- **Synergy:** **Raises:** faith. **Reads:** every flat faith line. It feeds The Zealots, The Learned Clergy and The Poor Tables (48).
- **Shape:** No shape change. Only the rarity changes.
- **Confidence:** good

### 36. The Sacred Bequests (new)

- **Tier, rarity, type:** III, common, Civic
- **Now:** Not in the deck.
- **Proposed:** Spending faith grants science equal to a fourth of it.
- **Why:** It is the partner of The Pilgrim Staff. Commerce has the same pair for gold (Civic Receipts and The Endowment). It gives the purse a plain common at Tier III.
- **Arithmetic:** 100 faith spent a turn in age 3: +25 science. 300 in age 4: +75. With The Pilgrim Staff, half of the faith comes back as culture and science. Every way to spend counts, by your ruling of 2026-11-11 for the Staff: the gods, a rite, clergy, a purchase, and faith given to a build.
- **Synergy:** **Raises:** science. **Reads:** faith spent. Fed by 05, 06, the rites, The Year of Release (47). Commerce's The Double Entry does not double it, because it pays on any spending and not only on a purchase. To confirm.
- **Shape:** Existing shape: `windfallRider` on `faithSpent`. Data only.
- **Confidence:** good

### 37. The Fabric Fund (new)

- **Tier, rarity, type:** III, common, Economic
- **Now:** Not in the deck.
- **Proposed:** Buying a building with faith grants its town production equal to a quarter of the faith paid.
- **Why:** Production through the purse. The model is the shared The Army Contractors ("ok sure"). The fabric fund was the account that paid for a cathedral's building.
- **Arithmetic:** A building of 300 hammers costs 600 faith and gives its town 150 production. So faith buys a hammer for about 1.3, not 2. A seat that spends 100 faith a turn on buildings gains +25 production. A regular Tier III card pays 60 to 120, so it is small, and it lands in the town that the player chose.
- **Synergy:** **Raises:** production. **Reads:** buildings bought with faith. Fed by 06 and the Cathedral's faith bank. Commerce's The Double Entry doubles it.
- **Shape:** `windfallRider` on `purchase`, in the faith bank, for buildings, with production from the price. The Army Contractors needs the same rider for gold and units.
- **Confidence:** good
- **Depends, joins and notes:** The pass of 2026-10-23 declined a card of this name. That card was a discount; this one is not.

### 38. The Prince-Bishops (new)

- **Tier, rarity, type:** III, uncommon, Civic
- **Now:** Not in the deck.
- **Proposed:** Your faith buildings yield twice as much.
- **Why:** It is the multiply card of the temple economy. The model is Expansionist's The Water Boards ("Your public works yield twice as much"), which you called "great".
- **Arithmetic:** A town with a Shrine (1 faith), a Temple (2) and a Cathedral (2 faith and 2 culture) gains +5 faith and +2 culture. Ten towns: +70. That is the floor, and a regular Tier III card pays 60 to 120. What cards put on a building is part of the building (batch R2b), so it doubles too: The Temple Workshops (+3 food and +3 production a town), First Rites (+2 faith), The Temple Storehouses (+2 food), The Cathedral Works (+8 science) and the shared The Painted Chapels (+9 culture). That is about 30 more a town: 300 a turn in a seat that built the theme.
- **Synergy:** **Raises:** everything a faith building makes. **Reads:** faith buildings and the cards on them. Fed by 06, 09, 12, the Doctrine The House of Worship, and the great people Bezalel and Hildegard of Bingen.
- **Shape:** `buildingYieldPercent` with a category. The Water Boards asks for the same selector for public works.
- **Confidence:** good on the idea, fair on the size
- **Depends, joins and notes:** A reading: happiness is not a yield, and the card does not double it. To confirm.

### 39. The Defenders of the Faith (new)

- **Tier, rarity, type:** III, common, Military
- **Now:** Not in the deck.
- **Proposed:** Your units gain +1 strength for every two towns that follow your religion, at most +8.
- **Why:** The Offering Chests leaves Tier III, and the tier needs a Military card that takes a chair. This one pays the spread in flat points, on any ground.
- **Arithmetic:** Ten towns follow: +5. Sixteen: +8. The regular Tier III line is +6 and a strong one is +12. The Spiritual Host pays +4 only on the faith's own ground.
- **Synergy:** **Raises:** strength. **Reads:** towns that follow your religion. Fed by the tide, Pentecost and the Doctrine The Ribats.
- **Shape:** Existing shape: `combatLine` by a count (the Doctrine The Paean counts beliefs), with `followingCities`, one for every two, and a cap. Data only, I think.
- **Confidence:** good
- **Depends, joins and notes:** A holy-war seat can add The Zealots (+5), The Spiritual Host (+4), this card (+8) and the Doctrine The Paean (up to +9). The chairs limit it: a government seats two to four Military cards.

### 40. The Naming Feasts (new)

- **Tier, rarity, type:** III, uncommon, Economic (Charter)
- **Now:** Not in the deck.
- **Proposed:** Unlocks the Rite of Naming: the town gains a citizen at once, and may start no other rite for ten turns.
- **Why:** Faith buys people. Your picture says that the deck lets large towns stay large and happy. You asked on 2026-10-12 for rites that pay out at once. This one uses the rite menu, so it adds no new button.
- **Arithmetic:** A citizen in a town of 12 costs 142 food, and in a town of 16 it costs 203. The rite price at Tier III is 100 to 200 faith (the 16th to the 36th rite). Each Naming is a rite started, so the next rite costs 5 more. A seat of eight towns that names in each every ten turns raises the price by 40 a round. It limits itself.
- **Synergy:** **Raises:** citizens, and rites started. It feeds The Psalter (50 science and 50 culture in a town of 10), The Royal Cult, The Deaconries, and Jayavarman VII's The Great City. With Expansionist: a levy spends a citizen for production equal to the food it took to grow, so 150 faith becomes about 170 production. Both cards read citizens, and neither names the other.
- **Shape:** A new kind of `atOnce`: a citizen. `RiteDef.byCard` exists, and the rite's ten turns are its wait (the Restoring of the Host works this way). Small extension.
- **Confidence:** fair
- **Depends, joins and notes:** Readings: it counts as a rite started. The code does not count a rite that acts at once today, so this is a change for this rite. One town says it, never the realm. Another price is possible: faith equal to the food the town still needs.

### 41. The Conversion of Kings (buff)

- **Tier, rarity, type:** III, rare, Wildcard (Commission)
- **Now:** Goal: convert a rival's capital. Reward: a Prophet and 500 culture.
- **Proposed:** Goal: convert a rival's capital. Reward: a Prophet and 1,000 culture.
- **Why:** The goal is the hardest act of the spread, and the reward is under the size at which a Tier III lump is noticed.
- **Arithmetic:** A Tier III lump registers at 1,000. The 18th draft costs 606 culture, so 1,000 is one and a half drafts. The prophet is worth 240 to 360 faith by then.
- **Synergy:** **Raises:** culture, and a prophet for a belief or a holy site. **Reads:** a rival's capital that follows your religion.
- **Shape:** Existing shape: a number change on the commission.
- **Confidence:** good

### 42. The Seven Pilgrimages (cut)

- **Tier, rarity, type:** IV, uncommon, Civic
- **Now:** A city working a Holy Site gains +1 science and +1 culture for every Holy Site you hold, at most +5 of each.
- **Proposed:** Cut. The row is retired.
- **Why:** With two sites it pays +2 and +2 in two towns: 8 a turn, at Tier IV. It is the only uncommon of the tier, so it is the Devotion card of 3 hands in 4 until the seat takes it. The Pilgrim Towns (31) is the pay-off of the holy places.
- **Arithmetic:** At its cap, five sites and five towns: 50 a turn. A regular card of the tier before it pays 60 to 120.
- **Synergy:** The holy places keep 14, 16, 17, 18, 31 and the Doctrine The Two Sanctuaries.
- **Shape:** No shape. `retired: true`.
- **Confidence:** good

### 43. The Apostolic Succession (cut)

- **Tier, rarity, type:** IV, rare, Civic
- **Now:** Your holy city gains +3 science and +3 culture for every ten turns since your religion was founded, at most +24 of each.
- **Proposed:** Cut. The row is retired. The Old Holy Places (16) does its job on the site.
- **Why:** It is a rare that pays at most 48 a turn, eighty turns after the founding. Change 16 counts the same years on the holy site, where modifiers multiply the pay.
- **Arithmetic:** A religion founded on turn 60 pays +24 and +24 from turn 140. The common The Cathedral Works pays +64 science in eight towns.
- **Synergy:** The Book of Life stays as the deck's capped count of this game.
- **Shape:** No shape. `retired: true`.
- **Confidence:** good

### 44. The Treasury of Merit (cut)

- **Tier, rarity, type:** IV, rare, Civic
- **Now:** Each turn, gain science equal to 2% of the faith you hold and culture equal to 2% of it, no cap.
- **Proposed:** Cut. The row is retired.
- **Why:** It pays the seat to hold faith. Every other card of the purse pays the seat to spend it. On 2026-11-10 the Commerce cards that read the treasury changed to read income for the same reason. The Learned Clergy reads faith income.
- **Arithmetic:** 1,000 faith held: +20 and +20. The Learned Clergy pays +60 and +60 at 300 faith a turn.
- **Synergy:** Nothing else in the deck reads faith held.
- **Shape:** No shape. `retired: true`.
- **Confidence:** good

### 45. Tier IV rarities (move)

- **Tier, rarity, type:** IV, four cards
- **Now:** Tier IV holds 9 rares, 1 uncommon and no common. The Chapter Houses, The Tithe of Nations, The Host Restored and The Last Offering are rares.
- **Proposed:** The Chapter Houses becomes a common. The Tithe of Nations, The Host Restored and The Last Offering become uncommons. With the other changes Tier IV holds 3 commons, 4 uncommons and 3 rares.
- **Why:** Each of the four is a count or a permission, and none changes a rule. Today a seat is shown The Seven Pilgrimages in three hands of four, and each rare in 1 hand of 36.
- **Arithmetic:** Today: the uncommon 75% of hands, a rare 2.8%. After the pass: a common 20%, an uncommon 7.5%, a rare 3.3%.
- **Synergy:** The three rares are The Great Commission, The Interdict and The City of God (50).
- **Shape:** No shape change. Four rarities change.
- **Confidence:** good

### 46. The Great Commission (buff)

- **Tier, rarity, type:** IV, rare, Wildcard (Commission)
- **Now:** Goal: more than half the world's cities follow your religion. Reward: devout towns gain +3 faith and +3 culture.
- **Proposed:** Goal: more than half the world's cities follow your religion. Reward: each town that follows your religion, at home or abroad, gives you +3 science and +3 culture.
- **Why:** It has the hardest goal in the deck, and the reward pays 72 a turn in twelve devout towns. The reward should count the world that the seat converted.
- **Arithmetic:** More than half of the towns of a six-seat game is about 30 of 55: +90 science and +90 culture. A Tier IV headline card pays 200 or more.
- **Synergy:** **Raises:** science and culture. **Reads:** towns that follow your religion. Fed by Pentecost, the tide and the apostles.
- **Shape:** Existing shape: `pays` for the empire by the count `followingCities`, as a commission's lasting reward. Data only.
- **Confidence:** good

### 47. The Year of Release (new)

- **Tier, rarity, type:** IV, uncommon, Civic (Boon)
- **Now:** Not in the deck.
- **Proposed:** On draft: gain faith equal to ten turns of your faith.
- **Why:** The deck has no boon after Tier 0. Your picture says that faith should feel like a win condition. This lump goes into the Magnum Opus, an army, or a great person, on the turn it is drafted. The model is the generic The Learned Embassy (eight turns of science).
- **Arithmetic:** 300 faith a turn gives 3,000 faith. That is 1,500 hammers at 2 faith a hammer, placed anywhere at once, or 2,250 in the holy city with The Last Offering. A Tier IV lump registers at 1,000 or more. As it is spent, The Pilgrim Staff and The Sacred Bequests pay 750 culture and 750 science.
- **Synergy:** **Raises:** faith held, then faith spent. It feeds The Book of Life, the Doctrine The Saint Peter's Indulgence and every card of the purse.
- **Shape:** Existing shape: a boon that grants turns of a yield.
- **Confidence:** good
- **Depends, joins and notes:** The jubilee was the year of release, when debts were forgiven. The old pool has a retired card called The Jubilee, so this one has another name.

### 48. The Poor Tables (new)

- **Tier, rarity, type:** IV, common, Economic
- **Now:** Not in the deck.
- **Proposed:** Towns gain food equal to a quarter of their faith.
- **Why:** Tier IV has no common and one Economic card today. Food from faith keeps the large towns growing, which is your picture of the deck.
- **Arithmetic:** A town makes about 25 faith at Tier IV: +6 food. Twelve towns: +75 food. With The Prince-Bishops a town makes more faith, and more food.
- **Synergy:** **Raises:** food, and through it citizens. **Reads:** the faith of each town. Fed by every faith card.
- **Shape:** Existing shape: `pays` in a town as a share of its faith (the shared The Tithe and The Cloister). Data only.
- **Confidence:** fair
- **Depends, joins and notes:** It reads faith income, the deck's main quantity. I kept it because the tier needs a plain Economic common.

### 49. The Soldiers of God (new)

- **Tier, rarity, type:** IV, common, Military
- **Now:** Not in the deck.
- **Proposed:** Military units you buy with faith gain +6 strength.
- **Why:** It ties the purse to the army, in flat points. Tier IV has one Military card today.
- **Arithmetic:** The regular Tier IV line is +6. A Knight of 445 hammers costs 890 faith, so a seat that makes 300 faith a turn buys one every three turns. A seat buys soldiers with faith in a Cathedral town, in a Shrine town with the shared The Shrine Guards, or as Joan of Arc.
- **Synergy:** **Raises:** strength. **Reads:** units bought with faith. The shared Professional Soldiers (+3 for a unit you purchase) adds to it. Fed by 07 and The Year of Release (47).
- **Shape:** The stamp of Professional Soldiers, narrowed to the faith bank. Small extension.
- **Confidence:** good

### 50. The City of God (new)

- **Tier, rarity, type:** IV, rare, Economic
- **Now:** Not in the deck.
- **Proposed:** Your holy city works hexes one ring further out.
- **Why:** Your picture of the deck names Constantinople. This card makes one great city. The model is Commerce's The Sea Lords (coastal towns work water one ring further), which you called interesting.
- **Arithmetic:** The fourth ring has 24 hexes. A holy city of 25 citizens takes the best eight or ten of them, each worth 2 to 4 more than the worst hex it works today, and it can reach a holy site, a stone circle or a wonder's ground that lay outside. About 40 to 80 a turn. The Doctrine The Patrimony of Peter removes the city's happiness demand, so the city can grow into the ring.
- **Synergy:** **Raises:** the hexes one town works. **Reads:** the holy city. Fed by The Naming Feasts (40), The Poor Tables (48) and the Doctrine The Imarets.
- **Shape:** `worksBeyond` under the scope `holyCity`. The Sea Lords asks for the same effect on water. A town claims hexes out to three today (`claimRadius`), so the builder must check that the city can own the fourth ring.
- **Confidence:** fair

### 51. The Sacred Host (shared with Dominion) (rework)

- **Tier, rarity, type:** I, rare to uncommon, Military
- **Now:** Rare: Kills grant 15 faith.
- **Proposed:** Uncommon: Kills grant faith equal to the strength of the unit you killed.
- **Why:** 15 faith is fixed in age 1 terms. It is a rare that pays less than the common Rites of Passage (12 faith for each military unit gained).
- **Arithmetic:** A Warrior of age 1 gives 20. A Legionary of age 3 gives about 45. A Knight of age 4 gives 70 or more. The god Rites of Blood and Joan of Arc's The Voices pay the same amount, and the three add up.
- **Synergy:** **Raises:** faith. **Reads:** kills, which Dominion makes. It feeds The Zealots and every purchase with faith.
- **Shape:** Existing shape: the god's own row (`windfallRider` on `kill`, faith from the strength).
- **Confidence:** good
- **Depends, joins and notes:** The Dominion pass says its 22 shared cards do not change. This change and the next two need a line on that sheet. Question 5.

### 52. The Oriflamme (shared with Dominion) (cut)

- **Tier, rarity, type:** I, uncommon, Military
- **Now:** Military units beside one of your religious units gain +4 strength.
- **Proposed:** Cut. The row is retired.
- **Why:** It asks the player to walk a prophet or an apostle beside the army every turn. A religious unit is a civilian, and an enemy captures it. It is a chore with a risk, for +4.
- **Arithmetic:** The regular Tier I line is +3. The Zealots (13) gives up to +5 with no unit to move.
- **Synergy:** The Garrison Chapels (53) is the pair's new card, at another tier.
- **Shape:** No shape. `retired: true`.
- **Confidence:** fair
- **Depends, joins and notes:** The pair grid in `docs/decks/deck-design.md` lists relics carried into battle. If you like the picture, the card can stay.

### 53. The Garrison Chapels (shared with Dominion) (new)

- **Tier, rarity, type:** III, common, Civic
- **Now:** Not in the deck.
- **Proposed:** Garrisoned towns gain +1 faith for every two citizens.
- **Why:** The pair shares nothing after Tier II. Garrisons are a quantity that Dominion raises, and faith is how Devotion pays. The model is The Sutlers ("wow thats strong, i like it"), which pays gold for each citizen of a garrisoned town.
- **Arithmetic:** Ten garrisoned towns of 12 citizens: +60 faith. Faith buys a hammer at half the price of gold, so this is the size of The Sutlers one tier later. For a Dominion seat with no other faith, 60 a turn buys a Legionary in a Cathedral town every three turns.
- **Synergy:** **Raises:** faith. **Reads:** garrisons and citizens. Fed by Dominion's garrison cards (The Amabutho, The Field of Mars, The Drill Masters).
- **Shape:** Existing shape: `pays` in a town by its citizens, under the scope `garrisoned`. Data only.
- **Confidence:** good

### 54. The Hearth Fire (shared with Expansionist) (new)

- **Tier, rarity, type:** I, uncommon, Economic
- **Now:** Not in the deck.
- **Proposed:** Towns you found start with a Shrine.
- **Why:** The pair shares three cards, and all three are in Tier 0. New towns are what Expansionist makes. The model is The Founders' Stores (towns start with a Granary), which you approved. Greek colonists carried fire from the mother city's hearth to the new town.
- **Arithmetic:** A Shrine is 30 hammers, which is six turns of a new town's production. It makes 1 faith, and it opens Consecrated Labor, The Shrine Guards and The Gifts of the Faithful in that town from its first turn. A seat that founds six towns after the draft saves 180 hammers. A Tier I lump registers at 200 to 400. For an Expansionist seat with no faith, six Shrines make 6 faith a turn, which buys the first gods.
- **Synergy:** **Raises:** Shrines, faith buildings. **Reads:** towns founded. Fed by Expansionist's settling cards and by Consecrated Labor (05). It feeds The Temple Workshops, First Rites and the Doctrine The Temenos (59).
- **Shape:** Existing shape: `foundingRider` with a building, as The Founders' Stores.
- **Confidence:** good

### 55. The Temple Baths (shared with Expansionist) (new)

- **Tier, rarity, type:** II, common, Civic
- **Now:** Not in the deck.
- **Proposed:** Each public work gives its town +2 faith and +1 happiness.
- **Why:** Public works are a quantity that Expansionist raises. Faith and happiness are what Devotion pays. Jayavarman VII leads this pair, and both of his lines read public works.
- **Arithmetic:** Two or three public works a town at Tier II, in six towns: 15 works, +30 faith and +15 happiness. That is a regular Tier II card for a seat that built them.
- **Synergy:** **Raises:** faith and happiness. **Reads:** public works. Fed by the shared The Founders' Stores, Commission: Bread and Water and the Doctrine The Curator of Waters (+2 happiness for each work).
- **Shape:** Existing shapes: `pays` and `happiness` by the count of public works in a town (The Thermae pays +2 science the same way). Data only.
- **Confidence:** fair
- **Depends, joins and notes:** With The Curator of Waters a public work gives +3 happiness. To watch.

### 56. Sacred Commissions (shared with Magisterial) (rework)

- **Tier, rarity, type:** II, uncommon, Economic
- **Now:** Towns with a Holy Site build wonders 30% faster.
- **Proposed:** Towns with a Temple build wonders 25% faster.
- **Why:** A shared card is dealt to a Magisterial seat that does not hold Devotion. That seat has no holy site, so the card pays it nothing. The sheet's own rule is that a shared card must pay a seat with no faith engine.
- **Arithmetic:** A wonder town makes 30 to 60 production in ages 3 and 4: +8 to +15 toward the wonder. Justinian's Basilica gives +20% in a town that works a holy site, and the two add up.
- **Synergy:** **Raises:** production toward wonders. **Reads:** Temples. Fed by 06 and by any seat that builds a Temple in its wonder town.
- **Shape:** Existing shape: a scope change on `productionBonus`. Data only.
- **Confidence:** good

### 57. Sacred Patronage (shared with Magisterial) (rework)

- **Tier, rarity, type:** III, rare, Civic
- **Now:** You may buy a great-person draft for 750 faith.
- **Proposed:** You may buy a great-person draft with faith. It costs 5 faith for each point of renown the next great person costs.
- **Why:** You set the gold price at 10 gold a point in the Commerce pass ("lets do 10 gold for now", and "they need to be quite expensive"). Faith buys a hammer at half the price of gold, so 5 faith a point is the same price. 750 is far below it.
- **Arithmetic:** At Tier III the fifth and sixth great people cost 346 and 436 renown. Today each costs 750 faith. At 5 a point they cost 1,730 and 2,180, and the eighth (654 renown) costs 3,270. A seat that makes 300 faith a turn buys the sixth in seven turns. Today it takes two and a half.
- **Synergy:** **Raises:** great people. **Reads:** faith held, and the renown ladder. Fed by The Year of Release (47). It feeds Magisterial's cards for a great person gained.
- **Shape:** `offerPriceFaith` becomes a rate read with the ladder, as the Commerce pass's change 115 does for gold. The Academy's scholar draft (1,000 faith) is another price, and I leave it.
- **Confidence:** good

### 58. The Blessed Forges (shared with Scientific) (cut)

- **Tier, rarity, type:** II, uncommon, Civic
- **Now:** Improved strategic resources gain +1 faith and +1 production.
- **Proposed:** Cut. The row is retired.
- **Why:** It pays +2 on two or three hexes: about 6 a turn, where a regular Tier II card pays 35 to 60. No theme of either deck reads a strategic hex with faith.
- **Arithmetic:** Three improved strategic hexes: +3 faith and +3 production.
- **Synergy:** The pair still shares five cards after the cut.
- **Shape:** No shape. `retired: true`.
- **Confidence:** fair
- **Depends, joins and notes:** Another agent runs the Scientific pass beside this one. This cut is for that pass to settle.

### 59. The Temenos (Doctrine) (doctrine)

- **Tier, rarity, type:** Doctrine, Tier I, new
- **Now:** Not in the deck. Tier I has four Doctrines, and none of them is about the land.
- **Proposed:** The hexes beside your towns with a Shrine gain +1 food and +1 faith.
- **Why:** A temenos was the ground cut off for a god around a shrine. The Doctrine makes the first ring of every Shrine town sacred ground. It needs no religion, and it is the land Doctrine that Tier I lacks. The model is Commerce's The Potters' Quarter (the hexes beside your capital).
- **Arithmetic:** A town works the six hexes beside it first. Four towns at the tier-4 government: about 16 worked hexes, +16 food and +16 faith, which is more than any Tier I Order, as a Doctrine should be. It is held all game: twelve towns late give about +60 and +60.
- **Synergy:** **Raises:** food and faith on the first ring. **Reads:** Shrines. Fed by the shared The Hearth Fire (54). It feeds The Zealots, The Poor Tables and every purchase with faith.
- **Shape:** Small extension: a tile test for a hex beside a town centre that holds a building. The Potters' Quarter asks for the ring round the capital, and this is the same test for every Shrine town.
- **Confidence:** fair
- **Depends, joins and notes:** It has no drawback, as the deck's other sixteen Doctrines have none.

### 60. The House of Worship (Doctrine) (doctrine)

- **Tier, rarity, type:** Doctrine, Tier IV to Tier III
- **Now:** Tier IV: Your devout towns may buy the Mosque, the Wat, the Gurdwara and the Dar-e Mehr, whatever beliefs your religion holds.
- **Proposed:** Tier III, the same text.
- **Why:** It is the capstone of the temple economy: four more faith buildings in every devout town. A capstone should sit where most seats reach it, and half the seats reach the Tier IV governments.
- **Arithmetic:** Each faith house is one more building for The Temple Workshops (+1 food and +1 production), The Temple Herds, The Prince-Bishops and the shared The Painted Chapels (+3 culture). Four houses in ten towns are 40 buildings. Tier III then has five Doctrines and Tier IV has three.
- **Synergy:** **Raises:** faith buildings. Fed by 06, which buys them with faith.
- **Shape:** No shape change. Only the tier changes.
- **Confidence:** fair
- **Depends, joins and notes:** The Mosque gives +1 authority, so ten devout towns gain +10 authority. To watch, under your rule that authority stays a limit.

### 61. A seat with no religion of its own (rule) (rework)

- **Tier, rarity, type:** A rule, not a card
- **Now:** A devout town is one of your towns that follows a religion whose holy city you hold (`heldReligions`). A seat that founded no religion has no devout town.
- **Proposed:** If you have founded no religion, the religion your capital follows is yours for the word "devout".
- **Why:** The world holds religions for two thirds of its seats, so a Devotion seat can lose the race, and a seat that founds late has no devout town for many turns. Today its "devout" cards are dead. A realm that takes its neighbour's religion is also good history: most kingdoms did.
- **Arithmetic:** With this rule, The Deaconries, The Settled Faith, Commission: The State Church and The Caliphate pay such a seat. The cards that say "follows your religion" do not change: they still need a religion that you hold. The Doctrines marked `needsReligion` stay as they are: a seat is offered them only if it holds a religion. The founder still gains the founder's share of your towns.
- **Synergy:** It gives a floor to four Orders. It does not change a seat that has founded.
- **Shape:** One clause in the scope `ownersFaith` in `src/sim/statecraft/evaluator.ts`.
- **Confidence:** fair
- **Depends, joins and notes:** Question 1.

## 5. The deck after the pass

- The deck goes from 63 cards to 73, if every change is approved. 25 cards are as they are today, 31 are changed or moved, and 17 are new. 7 are cut.
- Cards that need a founded religion: 26 of 73 (36%). Today: 30 of 63 (48%). In Tiers II to IV: 26 of 48 (54%), from 30 of 43 (70%).
- Cards that pay faith: 16 of 73 (22%). Cards that pay "science and culture" as a pair: 9, from 12.
- Charters: 7, from 2. Boons: 3, from 1. Commissions: 5. Scalers: 2.
- Shared cards: 24, from 23 after the Commerce pass. Doctrines: 17, from 16.

**By tier, chair and rarity**

| Tier | Cards | Military | Economic | Civic | Wildcard | Common | Uncommon | Rare | Need a religion |
|---|---|---|---|---|---|---|---|---|---|
| 0 | 8 | 1 | 1 | 6 | 0 | 5 | 2 | 1 | 0 |
| I | 17 | 1 | 6 | 9 | 1 | 7 | 8 | 2 | 0 |
| II | 20 | 2 | 2 | 14 | 2 | 6 | 11 | 3 | 13 |
| III | 18 | 2 | 5 | 10 | 1 | 5 | 8 | 5 | 7 |
| IV | 10 | 2 | 3 | 4 | 1 | 3 | 4 | 3 | 6 |
| **All** | **73** | **8** | **17** | **43** | **5** | **26** | **33** | **14** | **26** |

- A charter and a boon are counted by the chair on their face. They take no chair.
- Tier II has two Economic cards that take a chair, as it has today. The shared The Tithe and Sacred Commissions, and the generic The Public Peace and The Royal Annals, are Economic in that tier.
- Tier II still asks for the religion in 13 of its 20 cards. It is the tier in which the religion arrives, and today it asks in 14 of 17.

**How often each card is seen, after the pass**

| Tier | Commons / uncommons / rares | Each common | Each uncommon | Each rare | Today: common / uncommon / rare |
|---|---|---|---|---|---|
| 0 | 5 / 2 / 1 | 12% | 15% | 10% | 13% / 33% / none |
| I | 7 / 8 / 2 | 8.6% | 3.8% | 5.0% | 8.6% / 5.0% / 10% |
| II | 6 / 11 / 3 | 10% | 2.7% | 3.3% | 20% / 2.5% / 5.0% |
| III | 5 / 8 / 5 | 12% | 3.8% | 2.0% | 30% / 4.3% / 1.4% |
| IV | 3 / 4 / 3 | 20% | 7.5% | 3.3% | none / 75% / 2.8% |

- In Tier 0 an uncommon is seen a little more often than a common, and in Tier I a rare a little more often than an uncommon. Tier I holds two charters among its uncommons, and a charter leaves the draw when the seat takes it.
- Each rare of Tier III is seen in about one game of six, from one game of nine. Two of its seven rares moved to Tier II.

**By theme**

| Theme | 0 | I | II | III | IV | All |
|---|---|---|---|---|---|---|
| The religion: gods, devout towns, followers, clergy (the core) | 1 | 1 | 8 | 4 | 4 | 18 |
| The purse of faith: faith spent and what it buys | 1 | 5 | 1 | 4 | 2 | 13 |
| Rites as acts | 0 | 6 | 3 | 2 | 0 | 11 |
| Holy ground: holy sites, sacred works, the herds | 2 | 0 | 5 | 1 | 0 | 8 |
| The temple economy: faith buildings | 1 | 3 | 1 | 3 | 1 | 9 |
| The army of the faith | 1 | 2 | 2 | 2 | 2 | 9 |
| Faith income (glue) | 2 | 0 | 0 | 2 | 1 | 5 |
| **All** | 8 | 17 | 20 | 18 | 10 | 73 |

- Each card is counted in one theme. The Temple Herds ties the herds to the faith buildings, and it is counted with the buildings.
- Rites have no card at Tier IV: The Host Restored is a rite, and it is counted with the army. Holy ground has no Order at Tiers I and IV: the Doctrines The Temenos and The Two Sanctuaries sit there.
- The religion is 18 of 73 cards. Today the religion and its holy sites are 30 of 63.

### Tier 0 (8 cards)

| Card | Rarity | Chair | Text | Status |
|---|---|---|---|---|
| Lay Offerings | common | Civic | Pastures, camps and plantations gain +1 faith and +1 food. | unchanged |
| The Tithe Barns | common | Economic | Cities with a Granary gain +1 faith and +1 production. | unchanged |
| The Household Gods | common | Civic | +2 faith in every town. | unchanged |
| The First Offering | common | Civic (Boon) | On draft: gain 60 faith. | changed (02) |
| The Healer-Priests | common | Military | Your units heal twice as fast in your own territory. | new (04) |
| The Royal Cult | uncommon | Civic | Your capital gains +1 faith for each citizen. | unchanged |
| The Megaliths | uncommon | Civic (Charter) | Workers may raise one stone circle in each town, on flat land: +2 faith and +1 culture, and +1 faith more for each pasture, camp or plantation beside it. | new (03) |
| The Calling | rare | Civic (Boon) | On draft: your first prophet costs no faith. | changed (01) |

### Tier I (17 cards)

| Card | Rarity | Chair | Text | Status |
|---|---|---|---|---|
| Consecrated Labor | common | Economic | Towns with a Shrine may buy settlers and workers with faith. | changed (05) |
| The Temple Storehouses | common | Economic | Temples give +2 food and +2 happiness. | unchanged |
| First Rites | common | Civic | Shrines give +2 faith. | unchanged |
| The Temple Workshops | common | Economic | Faith buildings give +1 food and +1 production each. | changed (12); was The Wayside Shrines |
| The Votive Gifts | common | Economic | Towns may spend faith to add production to what they are building. Not wonders. | unchanged |
| The Pilgrim Staff | common | Civic | Spending faith grants culture equal to a fourth of it. | unchanged |
| The Zealots | common | Military | Your units gain +1 strength for every 10 faith you make each turn, at most +5. | new (13) |
| The Octave | uncommon | Civic | Your rites last twice as long. | changed (10) |
| The Fast | uncommon | Civic (Charter) | Unlocks the Rite of Fasting: for ten turns a town does not grow, and gains science and culture equal to its population. | unchanged |
| The Creed | uncommon | Civic | Your capital gains +3 faith and +3 culture for every god and belief you hold. | unchanged |
| The Founding Vows | uncommon | Wildcard (Commission) | Goal: start three rites. Reward: 250 faith. | changed (11) |
| The Rogations | uncommon | Civic (Scaler) | Gains +1 faith and +1 culture each time a town starts a rite. | unchanged |
| The Gifts of the Faithful | uncommon | Economic | Towns with a Shrine may buy buildings with faith. Not wonders. | changed (06) |
| The Martyrology | uncommon | Civic (Scaler) | Gains +2 faith and +2 culture each time one of your units dies in battle. | unchanged |
| The Chantries | uncommon | Civic (Charter) | Unlocks the Chapel, a building you may buy with faith: +1 faith, and the rite its town keeps does not end. | new (09) |
| The Rites Commonwealth | rare | Civic | A rite your capital starts is kept by every town you hold. | changed (08) |
| The Offering Chests | rare | Economic | Everything you buy with faith costs 20% less. | changed (07); moved from Tier III |

### Tier II (20 cards)

| Card | Rarity | Chair | Text | Status |
|---|---|---|---|---|
| Temple Estates | common | Economic | A holy site gains +2 food and +2 production for each improved hex beside it. | changed (14) |
| The Anchorites | common | Civic | Your prophets raise a further holy site for one charge instead of two. | changed (17): common |
| The Deaconries | common | Civic | Devout towns gain +1 happiness for every four citizens. | changed (25): common |
| The Parishes | common | Civic | Each town you found starts out devout. | changed (25): common |
| The Spiritual Host | common | Military | Military units gain +4 strength in land that follows your religion. | changed (25): common |
| The Temple Herds | common | Economic | Pastures, camps and plantations gain +1 food and +1 production for each faith building in their town, at most +3 of each. | new (28) |
| Commission: The State Church | uncommon | Wildcard (Commission) | Goal: hold six towns, all devout. Reward: +1 authority and +1 happiness for every two devout towns. | changed (23) |
| The Settled Faith | uncommon | Civic | Devout towns gain +15% science and culture. | changed (24): uncommon |
| The Sabbath Laws | uncommon | Civic (Charter) | Unlocks the Rite of the Sabbath: for ten turns a town builds nothing, and gains culture equal to its production. | unchanged |
| The Old Holy Places | uncommon | Civic | Holy sites gain +1 faith and +1 culture for every ten turns they have stood, at most +10 of each. | changed (16) |
| The Second Prophet | uncommon | Civic | Prophets and apostles you buy start with one extra charge. | unchanged |
| The Living Hymnal | uncommon | Civic | Your capital gains +3 science and +3 culture for every city following your religion, with no cap. | unchanged |
| The Mission | uncommon | Wildcard (Commission) | Goal: convert two foreign cities. Reward: an Apostle and 300 culture. | unchanged |
| The Book of Life | uncommon | Civic | +1% science and culture for every 150 faith you have spent this game, at most +30%. | unchanged |
| The Fetials | uncommon | Military | Military units you gain in a town keeping a rite start as Veterans. | new (22) |
| The Cliff Monasteries | uncommon | Civic (Charter) | Workers may build one cliff monastery in each town, on a hex beside a mountain: +3 faith and +3 science, and +1 of each more for each mountain beside it. | new (26) |
| The Saturnalia | uncommon | Civic (Charter) | Unlocks the Saturnalia: for ten turns a town's citizens demand half as much happiness, and the town makes no gold. | new (27) |
| The Double Feast | rare | Civic | Your towns may keep two rites at once. | moved from Tier IV (30) |
| The Abbeys | rare | Civic | Your apostles may raise holy sites, as prophets do. | moved from Tier III (18) |
| Pentecost | rare | Civic | When a foreign town turns to your religion, your religion presses every town within four hexes of it. | moved from Tier III (29) |

### Tier III (18 cards)

| Card | Rarity | Chair | Text | Status |
|---|---|---|---|---|
| The Cathedral Works | common | Civic | Cathedrals give +8 science and +2 happiness. | unchanged |
| The Holy Inquisition | common | Civic | +35% faith. | changed (35): common |
| The Sacred Bequests | common | Civic | Spending faith grants science equal to a fourth of it. | new (36) |
| The Fabric Fund | common | Economic | Buying a building with faith grants its town production equal to a quarter of the faith paid. | new (37) |
| The Defenders of the Faith | common | Military | Your units gain +1 strength for every two towns that follow your religion, at most +8. | new (39) |
| The Psalter | uncommon | Civic | Each rite a town starts grants science and culture equal to five times the town's population. | changed (32) |
| The Consecration Feast | uncommon | Economic | Finishing a faith building grants its town production equal to ten times its population. | changed (33) |
| The Pilgrim Towns | uncommon | Civic | Holy sites gain +1 production and +1 culture for each town that follows your religion. | changed (31) |
| The Mass Baptisms | uncommon | Civic | The first time a foreign town turns to your religion, gain science and culture equal to twenty times its population. | unchanged |
| The Offered Stones | uncommon | Economic | +2 culture for each building you have bought with faith. | changed (34) |
| The Learned Clergy | uncommon | Civic | +2 science and +2 culture for every 10 faith your empire makes each turn. | unchanged |
| The Prince-Bishops | uncommon | Civic | Your faith buildings yield twice as much. | new (38) |
| The Naming Feasts | uncommon | Economic (Charter) | Unlocks the Rite of Naming: the town gains a citizen at once, and may start no other rite for ten turns. | new (40) |
| The Caliphate | rare | Civic | Devout towns cost no authority. | unchanged; see question 2 |
| The Doctors of the Church | rare | Civic | Follower beliefs pay 150% more in your towns. | unchanged |
| The Conversion of Kings | rare | Wildcard (Commission) | Goal: convert a rival's capital. Reward: a Prophet and 1,000 culture. | changed (41) |
| The Turning of Swords | rare | Military | An enemy unit you kill on land that follows your religion joins your side instead, at most once a turn. | unchanged |
| The Pious Masons | rare | Economic | Towns with a Cathedral may buy a half-built wonder with faith. | unchanged |

### Tier IV (10 cards)

| Card | Rarity | Chair | Text | Status |
|---|---|---|---|---|
| The Chapter Houses | common | Civic | Every city with a Cathedral gains +2 science and +2 culture for each Cathedral you hold, at most +12 of each. | changed (45): common |
| The Poor Tables | common | Economic | Towns gain food equal to a quarter of their faith. | new (48) |
| The Soldiers of God | common | Military | Military units you buy with faith gain +6 strength. | new (49) |
| The Tithe of Nations | uncommon | Civic | Gain 1 faith each turn for every two citizens in the world who follow your religion. | changed (45): uncommon |
| The Host Restored | uncommon | Military | Towns may spend faith to heal every unit of yours in land that follows your religion. | changed (45): uncommon |
| The Last Offering | uncommon | Economic | In your holy city, faith you pour into the Magnum Opus buys 50% more production. | changed (45): uncommon |
| The Year of Release | uncommon | Civic (Boon) | On draft: gain faith equal to ten turns of your faith. | new (47) |
| The Great Commission | rare | Wildcard (Commission) | Goal: more than half the world's cities follow your religion. Reward: each town that follows your religion, at home or abroad, gives you +3 science and +3 culture. | changed (46) |
| The Interdict | rare | Civic | A rival's town that follows your religion adds no production toward a Magnum Opus. | unchanged |
| The City of God | rare | Economic | Your holy city works hexes one ring further out. | new (50) |

### Shared with another deck (24)

| Card | Shared with | Tier | Rarity | Chair | Text | Status |
|---|---|---|---|---|---|---|
| Rites of Passage | Dominion | 0 | common | Civic | Gaining a military unit grants 12 faith. | unchanged |
| The Shrine Guards | Dominion | I | common | Military | Towns with a Shrine may buy melee units with faith. | unchanged |
| The Sacred Host | Dominion | I | uncommon | Military | Kills grant faith equal to the strength of the unit you killed. | changed (51) |
| The Crusader Orders | Dominion | II | uncommon | Military | Military units gain +3 strength in land that does not follow your religion. | unchanged |
| The Garrison Chapels | Dominion | III | common | Civic | Garrisoned towns gain +1 faith for every two citizens. | new (53) |
| Sacred Groves | Expansionist | 0 | uncommon | Civic | Worked forests gain +1 food and +1 faith. | as the Expansionist pass wrote it (its change 45) |
| The Ambarvalia | Expansionist | 0 | common | Civic | Each town gains +1 faith for every two improved tiles. | unchanged |
| The Holy Spring | Expansionist | 0 | common | Civic | Towns beside a mountain or a lake gain +2 faith and +1 culture. | unchanged |
| The Hearth Fire | Expansionist | I | uncommon | Economic | Towns you found start with a Shrine. | new (54) |
| The Temple Baths | Expansionist | II | common | Civic | Each public work gives its town +2 faith and +1 happiness. | new (55) |
| The Merchant Shrines | Commerce | 0 | common | Civic | Towns working an improved luxury gain +2 faith. | unchanged |
| The Votive Accounts | Commerce | I | uncommon | Civic | Starts at +2 culture and +2 faith for your empire. Gains +1 of each every time you buy something with gold or faith, or start a rite, at most +20. | new in the Commerce pass (its change 103) |
| The Incense Road | Commerce | I | common | Civic | +2 faith for each different luxury you hold. | new in the Commerce pass (its change 105) |
| Pilgrim Markets | Commerce | II | uncommon | Civic | Trade routes to or from a town with a Holy Site gain +3 gold and +3 faith. | unchanged |
| The Tithe | Commerce | II | rare | Economic | Towns with a Temple gain gold equal to 25% of their faith. | unchanged |
| The Monastery Libraries | Scientific | I | common | Civic | Libraries give +2 faith. Temples give +2 science. | unchanged |
| The Schoolmen's Charter | Scientific | I | uncommon | Civic | Opens Scholasticism, which unlocks the Cathedral School: +2 science for each faith building in its town. | unchanged |
| The Priest-Astronomers | Scientific | I | common | Civic | Your capital gains +2 science and +2 faith for each town keeping a rite. | unchanged |
| The Cloister | Scientific | II | rare | Civic | Towns with a Temple gain science equal to 30% of their faith. | unchanged |
| The Monastic University | Scientific | III | rare | Civic | A Holy Site and an academy standing beside each other each gain +5 science and +3 faith. | unchanged |
| The Painted Chapels | Magisterial | I | uncommon | Civic | Religious buildings give +3 culture each. | unchanged |
| The Festival Calendar | Magisterial | II | uncommon | Civic | Cities keeping a rite gain +30% food and +30% culture. | unchanged |
| Sacred Commissions | Magisterial | II | uncommon | Economic | Towns with a Temple build wonders 25% faster. | changed (56) |
| Sacred Patronage | Magisterial | III | rare | Civic | You may buy a great-person draft with faith. | changed (57) |

### Doctrines (17)

| Doctrine | Tier | Written for | Text | Status |
|---|---|---|---|---|
| The Theoric Fund | I | engine | +1 culture for every 3 faith your empire makes. | unchanged |
| The Rites of Zhou | I | rites | Each town holding a rite gains +2 food and +2 happiness. | unchanged |
| The Serapeum | I | the religion | Each of your gods gives twice its effects. | unchanged |
| The Paean | I | the army | Your military units gain +1 strength for every god and belief you hold. | unchanged |
| The Temenos | I | holy ground | The hexes beside your towns with a Shrine gain +1 food and +1 faith. | new (59) |
| The Capitulary of Herstal | II | rites | Rites cost half as much. | unchanged |
| The Seven Councils | II | the religion | Your religion may hold one more follower belief and one more enhancer belief. | unchanged |
| The Patrimony of Peter | II | the religion | Your holy city's citizens demand no happiness. | unchanged |
| The Ribats | II | the army | Military units created in a town following your religion gain +3 strength for good. Conquering a town converts it to your religion. | unchanged |
| The Imarets | III | the religion | Your devout towns grow 25% faster. | unchanged |
| Canossa | III | the religion | You and an empire whose capital follows your religion cannot declare war on each other. | unchanged |
| The Canons of the Holy Sepulchre | III | the purse | Towns with a holy site buy with faith at 30% less. | unchanged |
| The Martyr's Crown | III | the army | Each of your units that dies in battle presses your religion on every town within three hexes. | unchanged |
| The House of Worship | III | the temple economy | Your devout towns may buy the Mosque, the Wat, the Gurdwara and the Dar-e Mehr, whatever beliefs your religion holds. | moved from Tier IV (60) |
| The Saint Peter's Indulgence | IV | the purse | +1% production toward the Magnum Opus for every 150 faith you have spent this game. | unchanged |
| The Apostolic Camera | IV | the religion | Your follower beliefs also pay you in every foreign town that follows your religion. | unchanged |
| The Two Sanctuaries | IV | holy ground | Hexes with a holy site have double yields, applied after every other change to the hex. | unchanged |

- The deck's Doctrines carry no drawback, and ten of the sixteen are offered only to a seat that holds a religion. You reviewed them on 2026-11-05, and I change two things only.
- With change 60, Tier III has five Doctrines and Tier IV has three. The rule is three to five a tier.
- The Capitulary of Herstal (rites cost half as much) also halves the price of the two new rites. To watch with The Naming Feasts.

## 6. Pairs, leaders and great people

### The shared cards, a pair in a line

- **Dominion (5):** Rites of Passage, The Shrine Guards, The Sacred Host (51), The Crusader Orders and The Garrison Chapels (53). The Oriflamme is cut (52). The pair now has a card at Tier III.
- **Expansionist (5):** Sacred Groves, The Ambarvalia, The Holy Spring, The Hearth Fire (54) and The Temple Baths (55). The pair had nothing after Tier 0.
- **Commerce (5):** The Merchant Shrines, The Votive Accounts, The Incense Road, Pilgrim Markets and The Tithe. You ruled on these today, and I change nothing.
- **Scientific (5):** The Monastery Libraries, The Schoolmen's Charter, The Priest-Astronomers, The Cloister and The Monastic University. The Blessed Forges is cut (58), for the Scientific pass to settle.
- **Magisterial (4):** The Painted Chapels, The Festival Calendar, Sacred Commissions (56) and Sacred Patronage (57).
- Your picture says that Devotion should have the most shared cards. It has 24, level with Commerce's 25 after its pass.

### Leaders

- **Joan of Arc (with Dominion):** richer. The Zealots, The Fetials and The Defenders of the Faith add flat points to The Maid's +4. The Sacred Host now pays what The Voices pays, so her kills pay twice. The Offering Chests takes 20% off the soldiers her Sainte-Chapelle sells.
- **Jayavarman VII (with Expansionist):** richer. The Temple Baths reads public works, as both of his lines do. The Rite of Naming adds citizens for The Great City. The stone circle and the cliff monastery are unique improvements. Consecrated Labor and The Hearth Fire make his new towns.
- **Mansa Musa (with Commerce):** richer, and the seat to test. More holy sites (17, 18) mean more towns for The Hajj. He loses the gold of The Saints' Fields. He holds both discounts (The Open Market and The Offering Chests), and The Double Entry doubles The Fabric Fund and The Votive Accounts.
- **Harun al-Rashid (with Scientific):** much richer. The temple economy is his own line: The Temple Workshops and The Prince-Bishops sit on the buildings he pays. The cliff monastery pays science. The Learned Court's faith goes to buildings through The Gifts of the Faithful.
- **Justinian (with Magisterial):** much richer, and the second seat to test. Every holy-site card pays the hex that holds his +5 production, and each site gives him +2 happiness, so The Anchorites as a common is a happiness card for him. His wonders pay faith equal to their cost, and The Pious Masons spends that faith on the next wonder.
- **Ibn Battuta (every deck):** no change.

### Great people

- A holy site is a great person's work for Magisterial's cards (the great people pass). The stone circle and the cliff monastery are not works.
- Bezalel's line is on the Temple itself, so The Prince-Bishops doubles it. Hildegard of Bingen pays Cathedral towns, beside The Cathedral Works and The Chapter Houses.
- al-Khwārizmī's clause (science buildings for faith) becomes a part of The Gifts of the Faithful (06). His other clause stays.
- Sacred Patronage's price follows renown (57). No other change touches a great person.

## 7. Example councils

### Early, end of Tier I: the temple towns (five chairs, a tier-4 government)

- **Chairs:** The Tithe Barns (0), The Royal Cult (0), The Temple Workshops (I), The Gifts of the Faithful (I), The Rites Commonwealth (I). With no chair: The Megaliths, The Chantries, and the free prophet of The Calling. Doctrine: The Temenos.
- **How it plays:** each town buys a Shrine with faith on its first turns, and the Shrine pays food, production and a ring of sacred hexes. A stone circle stands between two pastures. Every ten turns the capital picks the realm's rite. The prophet arrives free with The High Temple.

### Early, end of Tier II: the realm of rites (five chairs, a tier-10 government)

- **Chairs:** The Rogations (I), The Rites Commonwealth (I), The Octave (I), The Double Feast (II), The Fetials (II). With no chair: The Fast, The Sabbath Laws, The Saturnalia. Taken on the way: the shared The Festival Calendar. Doctrine: The Rites of Zhou.
- **How it plays:** the capital starts two rites every twenty turns and six towns keep both. The Rogations gains twelve steps each time. Before a war the realm keeps the Sabbath for culture, and every unit bought in those turns is a Veteran. When happiness falls, the realm keeps the Saturnalia and pays for it in gold.

### Late, Tier III then Tier IV: the holy city (eight chairs, then eleven)

- **Chairs at Tier III:** The Pilgrim Staff (I), Temple Estates (II), The Old Holy Places (II), The Living Hymnal (II), The Pilgrim Towns, The Prince-Bishops, The Sacred Bequests, The Caliphate. Doctrine: The House of Worship. Tier IV adds The City of God, The Chapter Houses and The Last Offering, with The Two Sanctuaries.
- **How it plays:** three holy sites stand in the holy city's rings, each with farms round it. Each site gains for its age and for every town that follows. Faith buys the four faith houses in each town, and half of it comes back as culture and science. In the last age The Year of Release goes into the Magnum Opus.

## 8. What to test first

1. **Settlers bought with faith at Tier I** (05). How many towns does a seat hold on turn 80, and does it still found its religion?
2. **The realm's rite** (08) with The Rogations, which has no cap, and with the shared The Festival Calendar.
3. **The Chapel** (09): a town that keeps a rite for ever.
4. **The Gifts of the Faithful** (06): does the seat still start rites and buy clergy, or does all its faith go to buildings?
5. **Justinian:** three holy sites with every site card, and The Pious Masons with the faith his wonders pay.
6. **The Prince-Bishops** (38) in a seat with every building card.
7. **Flat strength in a holy-war seat:** The Zealots, The Spiritual Host, The Defenders of the Faith and the Doctrine The Paean together.
8. **Mansa Musa** with The Double Entry and three cards that pay on a purchase with faith.
9. **The rarities.** After the build, count what a seat is offered in Tiers III and IV over ten games.

## 9. Questions

1. **A seat with no religion of its own: may the religion of its capital count for "devout"?** *Recommended: Yes (change 61).* It gives a floor to four Orders for a seat that lost the race or founds late. It changes nothing for a seat that has founded. If you say no, the founding stays a hard gate, and The Calling (01) is the only help.
2. **The Caliphate: keep "Devout towns cost no authority"?** *Recommended: Keep it, as the deck's one rule-breaker for authority, and change the commission (23).* Your picture of the deck names the Umayyad caliphate and wider empires, and Expansionist keeps The Imperial Roads. If you want it changed, my line is: "+1 authority for every 25 faith you make each turn, at most +10." That is a figure the seat earns, not a cut for each town.
3. **May Devotion open unique improvements: the stone circle (03) and the cliff monastery (26)?** *Recommended: Yes, these two and no more.* Expansionist owns the theme with ten, and Scientific has two. Two works give this deck something on the map before the prophet, and the keyword ties them to Expansionist's cards. Each needs a model and an icon.
4. **Faith buys settlers and every building from Tier I (05 and 06). Is that the size you want?** *Recommended: Yes, and test it first.* It is the deck's stated core, moved from a Tier II rare to two Tier I cards. Authority and the price of the prophet limit it. If it is too much, the settler goes first.
5. **May this pass change shared cards on four other decks' sheets?** *Recommended: Yes.* Dominion: 51, 52 and 53. Expansionist: 54 and 55. Magisterial: 56 and 57, with the rule that a great person costs 5 faith for each point of renown. Scientific: 58, for that pass to settle.

## 10. What I could not determine

- **How often a Devotion seat loses the race to found, or founds after Tier II opens.** No bot game has been measured since 2026-10-13, before the deck was rebuilt. Change 61 and The Calling rest on my judgement that it happens.
- **A Devotion seat's faith in each age.** The figures are my estimates. The arithmetic of twenty changes rests on them.
- **How many holy sites, bought buildings, pastures and plantations a real seat has.** The sizes of changes 03, 14, 28, 31 and 34 rest on my counts.
- **The number of hands in each tier.** By the rungs a seat is dealt 6 hands in Tier I and 8 in each of Tiers II and III. The Commerce pass says about four in Tier III. I used the rungs.
- **The shapes.** I read `statecraftData.ts`, the deck rows and `religion.ts`. I ran no row. The builder confirms each "data only".
- **Whether a town can own a fourth ring** (The City of God), and whether a boon can leave a lasting discount (The Calling).
- **Whether The Tithe still pays nothing.** It did in the measurement of 2026-10-13.
- **The Scientific pass.** It runs beside this one. The shared cards with Scientific are written against today's sheet.
- **The history behind the names** is from my own knowledge, not from a source in the repo. I checked each new name against `data/`, `src/` and `docs/` for a clash.

Review page: one self-contained HTML file, `/private/tmp/claude-501/-Users-jacky-code-webciv/c4da3ce5-796a-4aa7-8603-c5fc07da6b1d/scratchpad/deckpass-devotion/devotion-design-pass.html`, built by `build.py` in the same folder. Its anchors are `change-01` to `change-61` and `question-1` to `question-5`.

## The user's rulings on round one (2026-11-21, comments on the page)

The user: "ok i've added comments to the devotion doc". A row with no comment
is approved (the user's standing rule).

| # | Card | The user's words | Result |
|---|---|---|---|
| 01 | The Calling | "Way too strong, keep as is." | Not adopted. The card stays as it is today. |
| 02 | The First Offering | "sure" | Approved. |
| 03 | The Megaliths (the stone circle) | "cool, should this be shared with expansionist?" | Approved. **A question to answer.** |
| 04 | The Healer-Priests | "sure" | Approved. |
| 05 | Consecrated Labor | "great" | Approved. |
| 06 | The Gifts of the Faithful | "this seems too strong. Lets make it culture and faith buildings instead of all buildings." | Towns with a Shrine may buy culture and faith buildings with faith. |
| 07 | The Offering Chests | "age 1 seems too strong, how about age 2." | Approved, moved to the tier of the second age. It takes the "faith buys more" form (`docs/flags.md`). |
| 08 | The Rites Commonwealth | "this is extremely powerful but i like it." | Approved. |
| 09 | The Chantries (the Chapel) | "that's too strong. How about chapel: +2 faith +2 culture, rites in this city last 50% longer" | The Chapel: +2 faith, +2 culture, and rites in its city last 50% longer. |
| 10 | The Octave | "Sure, lets make sure rite duration modifiers properly stack." | Approved. The build must say how the duration modifiers stack (The Octave with the Chapel). |
| 11 | The Founding Vows | "sure" | Approved. |
| 12 | The Temple Workshops | "sure" | Approved. |
| 13 | The Zealots | "sure" | Approved. |
| 14 | Temple Estates | "oh thats great, i like it" | Approved. |
| 15 | The Saints' Fields | "Ok sure" | Cut, as proposed. |
| 16 | The Old Holy Places | "i like this, lets remove the cap" | Approved, with no cap. |
| 17 | The Anchorites | "sure" | Approved. |
| 18 | The Abbeys | "lets cut this, i'm realizing the ability to purchase prophets with faith already give the deck reliable great works." | Cut. |
| 19 | The Lay Brothers | "great" | Cut, as proposed. |
| 20 | Mission Houses | "i think the deck needs modifiers for spreading religion. how about your proclomations reach 50% farther and are 50% more effective in foreign cities." | Kept and reworked: your proclamations reach 50% farther and are 50% more effective in foreign cities. **The deck needs cards that help a religion spread.** |
| 21 | The Confessors | "sure" | Cut, as proposed. |
| 22 | The Fetials | "sure" | Approved. |
| 23 | Commission: The State Church | "sure" | Approved. |
| 24 | The Settled Faith | "sure" | Approved. |
| 25 | Tier II rarities | "sure" | Approved. |
| 26 | The Cliff Monasteries | "great" | Approved. |
| 27 | The Saturnalia | "Hmm, the drawback is too high for this, and it doesn't fit the play patterns i like. lets cut. I like the idea of additional rites though." | Cut. **More new rites are wanted.** |
| 28 | The Temple Herds | "great" | Approved. |
| 29 | Pentecost | "great" | Approved. |
| 30 | The Double Feast | "great" | Approved. |
| 31 | The Pilgrim Towns | "wow thats strong, great" | Approved. |
| 32 | The Psalter | "great" | Approved. |
| 33 | The Consecration Feast | "Production feels too strong, lets have it give food and culture?" | Finishing a faith building grants food and culture, not production. |
| 34 | The Offered Stones | "this needs to be stronger probably, there's not too many ways to buy buildings iwth faith currently." | Make it stronger. |
| 35 | The Holy Inquisition | "lets rework: +1 authority in devout towns. -80% to foreign religion's pressure on your cities (this includes proclamations)." | The user's line. |
| 36 | The Sacred Bequests | "sure" | Approved. |
| 37 | The Fabric Fund | "Sure" | Approved. |
| 38 | The Prince-Bishops | "great" | Approved. |
| 39 | The Defenders of the Faith | "how about +1 strength for every 3 towns, no cap." | +1 strength for every 3 towns that follow your religion, with no cap. |
| 40 | The Naming Feasts | "let's buff this to two citizens." | The Rite of Naming gives two citizens. |
| 41 | The Conversion of Kings | "great" | Approved. |
| 42 | The Seven Pilgrimages | "sure" | Cut, as proposed. |
| 43 | The Apostolic Succession | "sure" | Approved. |
| 44 | The Treasury of Merit | "sure" | Cut, as proposed. |
| 45 | Tier IV rarities | "sure" | Approved. |
| 46 | The Great Commission | "sure" | Approved. |
| 47 | The Year of Release | "sure" | Approved. |
| 48 | The Poor Tables | "probably don't need food this late in the game, let's modify" | Rework: it must pay something other than food. |
| 49 | The Soldiers of God | "great" | Approved. |
| 50 | The City of God | "this feels not very impactful, you tend to build cities around your holy city. cut" | Cut. |
| 51 | The Sacred Host | "great" | Approved. |
| 52 | The Oriflamme (the pass proposed a cut) | "lets keep this, i like the idea of a player marching apostles with their army, and i think +4 is significant." | Kept as it is. |
| 53 | The Garrison Chapels | "Not very strong, lets cut. Lets add a card in it's place: proclamations heal all units within 3 hexes, 25 health." | Cut. In its place, a card shared with Dominion: proclamations heal all units within 3 hexes by 25 health. |
| 54 | The Hearth Fire | "sure" | Approved. |
| 55 | The Temple Baths | "sure" | Approved. |
| 56 | Sacred Commissions | "i think as it was is better. holy sites are easily purchaseable with faith" | Not adopted. The card stays as it is today. |
| 57 | Sacred Patronage | "Yeah lets do it" | Approved. |
| 58 | The Blessed Forges (the pass proposed a cut) | "great" | **In conflict with the Scientific pass,** where the user wrote "let's move this to tier 1" on the same card the day before. To settle with the user. |
| 59 | The Temenos | "great" | Approved. |
| 60 | The House of Worship (Doctrine) | "does this unlock these buildings or just allow you to buy them with gold. If the latter, this is too weak." | **A question to answer,** and a rework if it only allows the purchase. |
| 61 | A seat with no religion of its own | "yeah sounds good, great change." | Approved. |

Questions: Q1 "yes". Q2, The Caliphate: "Sure. maybe that could be a good
theme, religious builds can break the authority rules, and maybe there could
be some interaction with spare authority?" Q3 "great" (Devotion may open
unique improvements). Q4 "see above" (05 approved, 06 narrowed). Q5 "great"
(the pass may change shared cards on other decks' sheets).
