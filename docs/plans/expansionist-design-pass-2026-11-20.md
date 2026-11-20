# Expansionist design pass (2026-11-20)

**Status, 2026-11-20:** a proposal. Nothing here is ruled, nothing is built, and no game data changed. Each numbered change waits for your yes or no.

Your request, 2026-11-20, in your words:

> *"ok, could you do a deck pass on commerce and expansionist. I find that i don't really take any of the tended land cards in this version of the game, and commerce feels a bit one-note. I'm not sure whether to drop the tended land theme altogether or make it more fleshed out, what do you think?"*

- This is the Expansionist half. Another pass does Commerce. Section 8 says where the two meet.
- The method is the card-design skill. "Now" is the card's text in `data/decks/expansionist.json`, which equals the sheet `docs/decks/expansionist.md`. I checked each one against the game's own words (`describeCard` in `src/sim/statecraft`).
- Every number is a first guess against the power bar, to tune in playtest. I ran no bot games and no tests.
- The pass proposes **36 changes: 6 buff, 10 rework, 2 cut, 9 move, 5 new, 4 doctrine.**
- **My answer on tended land:** fold it into the wild-land theme (option C in section 1). Do not cut it and do not build it out.
- A review page for your comments was built from this text. It is one HTML file, and its anchors are `change-01` to `change-36`.

## 1. Tended land: cut it, flesh it out, or fold it in

### What it is today

- Two charters open it, and both are Tier I commons. **The Fish Traps** tends a coast or lake hex (+1 food, +1 production). **The Wild Orchards** tends a forest or jungle hex (+1 food, +1 gold). A charter takes a pick and no chair. A worker spends one charge for each hex.
- A tended hex is not an improvement. For every card it is **wild** (the `unimproved` test holds and the `improved` test does not, `tileConditionHolds`). It cannot be pillaged, and it opens no resource. Felling the forest removes an orchard.
- Four Orders pay on tended hexes: **The Tended Country** and **The Hedgerows** (Tier II), **The Long Tending** (Tier III, rare) and **The Garden of the World** (Tier IV, rare). Three Doctrines do too: **The Wildwood Compact**, **The Garden Peoples** and **Arcadia**.
- All seven carry the gate "Needs tended land". The game deals them only to a seat that holds a charter (`holdsTendedUnlock`, `dealGateFor`). A fourth Doctrine, **Bound to the Soil**, pays +1 food on tended hexes and has no gate.
- No other deck's data reads tended land. The theme is inside this deck, so any of the three options below touches only this deck.

### The diagnosis

What one hex yields, from `data/improvements.json` and `data/terrain.json`:

| Hex | Age 1 | Age 2 and 3 | Age 4 |
|---|---|---|---|
| Farm on grassland | 3 food | 4 food beside fresh water (Irrigation) | the same |
| Mine on a hill | 3 production | 3 production | 4 production (Prospecting) |
| Lumber mill in forest | not yet | 1 food, 2 production | the same |
| **Orchard in forest** | 2 food, 1 production, 1 gold | the same | the same |
| **Fish traps on coast** | 2 food, 1 production, 1 gold | the same | the same |

1. **The works are not weak. The cards around them are.** A tended hex yields 4 in every age. That is level with a plain farm or mine, or above it. `docs/decks/deck-design.md` says a tended work yields less than an improvement. The built rows do not.
2. **Every card that pays an improved hex skips a tended hex.** About 15 Orders and 3 Doctrines pay on improved hexes or count them. Four Orders pay on tended hexes. A farm with the three plain farm cards of Tiers 0 and I (Smallholdings, Dark Earth, Commission: Break the Sod) yields 8. A tended hex needs two of its four pay-offs to pass that (4 + 2 + 3 = 9). The Doctrine Crop Rotation goes further: it makes every tended hex yield nothing, because a tended hex is wild.
3. **A seat that takes a charter is then offered about one pay-off in the whole game.** I modelled the draw (3 cards a hand, rarity first at 60 / 30 / 10, drafts of 4 / 6 / 8 / 8 / 5 by tier) for this deck with each partner. A charter is offered in about 6 games of 10. A seat that takes one is then offered 0.8 to 0.9 of the two Tier II pay-offs, 0.12 of The Long Tending and 0.13 of The Garden of the World: **1.1 pay-offs in a game.** One seat in five is offered none. One seat in 25 is offered three.
4. **A tended hex has four costs.** A pick in Tier I, one of about six. A worker charge (a Worker has 3 charges and costs 10 production). The hex itself: one work for each hex, so no lumber mill there and no resource opened. And every card that reads "improved".
5. **The charter alone is small in Tier I.** A regular Tier I card pays 15 to 25 a turn. A charter pays 2 for each tended hex worked, so it needs eight hexes, eight charges and about three Workers to reach the low end. At Tier 0 three hexes made it a regular card (4 to 8). You took The Fish Traps there on 2026-10-12 and wrote "sacred groves and fish traps both very good". Batch DS1 moved it to Tier I on 2026-11-10.
6. **The bots never tend.** `src/ai/value.ts` says that the bot lays no tended work, and it prices a charter at nothing. So no measurement of any tended card exists (the tables of 2026-10-13 have no tended row), and no bot seat ever shows the theme to a player.
7. **Tending is a worker action on many hexes.** It is investment when the player tends a hex they chose for a reason. It is tedium when a card asks for a count of tended hexes. Six Gardens asked for six, and you called it "not very good".

**Is it a parasitic theme? Yes, in its pay-offs.** The four Orders and three Doctrines have no floor: they pay nothing without a charter, and the game does not even deal them. The set-up is taken only for its own +2 a hex. The fish traps have a real floor on a coast, where nothing else can be built on open water. The orchard has almost none, because a lumber mill or an axe wants the same hex.

### The options

|  | A. Cut it | B. Flesh it out | C. Fold it into the wild (recommended) |
|---|---|---|---|
| **What changes** | Both charters, the four gated Orders and three Doctrines go. The Fish Traps can stay as an ordinary work that counts as improved. "Tended" leaves the game as a word and as a rule. | One charter from Tier 0. No gate. About ten Orders read tended hexes, three in each tier, with a scaler and a rule-breaker. Tended hexes count for the cards that count improved hexes. | One charter, dealt in Tiers 0 and I, opens both works. No gate anywhere. Every pay-off reads **wild** hexes, untouched or tended. "Tended" stays on the charter, on two Doctrines and in the hex's own info. |
| **What the player gets** | A shorter, clearer deck. Four Order places and three Doctrine places for other themes. No way to raise a wild hex: The Old Songs and The Wild Marches then reward only leaving land alone. | A second way to farm, with a full path from Tier 0 to Tier IV. | Wild-land cards that pay from the turn they are seated. Tending as a choice on top: +2 on a hex that keeps every wild bonus. The frontier's claims feed it, because claimed land starts wild. |
| **What it costs to build** | Least. Retire rows, rewrite one Doctrine and two card texts. No new shape. | Most. Three or four new cards, two new shapes, and the bots must learn to tend before anything can be measured. | Small. Number and test changes on rows that exist, and one near-existing shape (a charter that opens two works). The bots need no change. |
| **The risk** | The deck loses its only new verb on the map, and the choice between the field and the wild becomes "improve it or do nothing". | More land cards in a deck that is 43 Economic cards of 74. More worker clicks. It stays a quantity that only cards make, so every pay-off still has no floor. | A flat bonus on all wild land can be too strong early (your note of 2026-09-03). So each wild card names its terrain or sits in a late tier. |

### The recommendation

**I recommend C.** The reasons, in the card-design skill's terms:

- **A theme the playstyle makes by itself.** Wild land is in every game: forest, coast, hills with no mine, desert, mountains. An Expansionist seat claims more of it than any other seat (Outposts, The Staked Claims, The Barbarian Frontier). Tended land exists only after a card and a worker make it.
- **Floor and ceiling.** A wild-land card has a floor: the wild hexes the seat already works. Tending lifts the ceiling, +2 a hex, and the hex keeps its wild bonuses. Today the tended cards have no floor.
- **Tedium against investment.** No card asks for a number of tended hexes. The player tends a hex only when that hex is worth a charge to them.
- **It keeps what you liked and what you ruled.** The fish traps return to Tier 0. Tended land stays "a theme to splash into" (your words, 2026-10-16), and "tended land is still wild" becomes the whole rule.
- **It gives the deck a real fork.** The field: improved hexes, The Age of Improvement, the Doctrine Crop Rotation. The wild: wild hexes, The Long Tending, the Doctrine The Garden Peoples. A hex is one or the other, so each game's map decides how far a seat leans.

The changes for option C are 01, 03, 12, 13, 23, 27 and 33 to 36. They are marked "tended land" in the index.

**The runner-up is A.** If the wild cards do not feel like enough, a clean cut is better than a larger build. Appendix A lists the changes under A, and Appendix B lists them under B, so you can choose either without a second pass.

## 2. Why the rest of the deck feels as it does

1. **The draw hides the deck's best cards.** The game rolls a rarity first (60 / 30 / 10), then picks a card of that rarity. Tier III holds 10 rares, 4 uncommons and 4 commons. In my model a seat is offered each rare in 1 game of 9, and each of the four commons (Old Workings, Plenty, The Mill Wheels, The Quitrents) in 19 games of 20. Tier IV holds 9 rares and 2 uncommons: each rare is offered in 1 game of 8, and the two uncommons (The Philosophers' Peaks, The Theodosian Walls) in 7 to 9 of 10. So the late game looks the same every time, and the cards that change play stay in the deck. The rarities were set before the 60 / 30 / 10 draw came in (2026-11-10).
2. **The engine is seen in one game in four.** Levy of the Land is the card you called "soooo good", and the themes pass named citizens and the levy as the deck's engine. It is an uncommon in Tier I, and a Tier I uncommon is offered in about 25% of games. Four more cards are dealt only to a seat that holds a levy.
3. **Three cards for an open map arrive after the map is full.** The Staked Claims (Tier II), The Great Colonies and The Wide Country (Tier III) pay on founding and claiming. Tier II opens at about turn 72 and Tier III at about turn 133.
4. **Some rares are weaker than commons.** A polder turns a coast hex of 2 into a hex of 3 for two charges, and no farm card reads it. The Mountain Terraces let a citizen work a hex of 3, the worst hex in Tier III. The Long Tending gives +3 food on tended hexes; the common Old Workings gives +3 production on more hexes.
5. **Some cards are dead or close to it.** Tinkers' Guild is worth about half a production a turn. The Land Hunger is worth a little over 1. The Engineers' Yards needs a manufactory, and the cards that bring engineers are a tier later. The Burhs and The Theodosian Walls pay nothing unless a town is attacked. The Woodland Bands lost its strength line in batch DS3.
6. **Three cards are chores.** Outposts, The Polders and The Keeps open a work only while the card is seated, and the work stays when the card leaves. The best play is to seat the card, build, and unseat it.
7. **There are doubles.** Four cards say "tended tiles gain yields" at four sizes (The Tended Country, The Long Tending, The Garden of the World, The Garden Peoples). Tinkers' Guild and Bound to the Soil both give +1 charge. The Seed Grain, the generic The Founders' Rights, The Great Colonies and the Doctrine The Planted Towns all add citizens to a new town. The Theodosian Walls does the job of the generic City Watches. The Commanderies and Empire Without End both give 1 authority for each town. Provincial Councils and The Imperial Roads are one job at two sizes; I keep both, because the second is a rare capstone.
8. **There are gaps.** Military cards by tier: 1, 1, 0, 0, 2. The deck has no boon. Public works have one Order in each tier, none in Tier IV, and none pays science. Tiers I and II have no rare. 43 of the 74 cards are Economic, because the type rules put food, production, gold, land and growth there.
9. **What works, and stays.** Levy of the Land, The Grain Census, The Old Songs, The Highlands, The Hard Country, the founding cards of Tier 0, the road cards, and the cards that raise authority and happiness by building.

The themes today, and whether each has a path through the tiers:

| Theme today | Orders by tier (0, I, II, III, IV) | Science | Culture | Production | Verdict |
|---|---|---|---|---|---|
| The field: improved land | 3, 6, 4, 3, 2 | The Rope Stretchers, The Highlands, The Domesday Survey | The Coast only | many | A full path. Culture is thin. |
| Wild and tended land | 0, 4, 2, 1, 1 | none | The Old Songs, The Wild Marches | The Tended Country (gated) | Broken after Tier I: every later card is gated. |
| The frontier: towns, claims, roads, authority | 3, 3, 4, 5, 4 | The Measure of the Land (Tier IV) only | The Founding Furrow, The Wild Marches, The Mother City | The Road Towns, The Book of Settlements | A full path. Three cards come too late. |
| Citizens and the levy | 2, 3, 6, 5, 3 | The Terraces of Moray, The Megalopolis | The Harbour Cities | the levy, Plenty, The Great Households | A full path. The engine card is rarely offered. |
| Public works and engineers | 1, 1, 2, 3, 0 | none | The Aediles, The Capitolia | The Aediles, The Mill Wheels | Thin. Nothing in Tier IV, and no science. |
| The high country: mountains | 0, 0, 1, 1, 1 | all of it | none | a little | A terrain thread, and how the deck reaches science. Sound. |
| The militia | 1, 1, 0, 0, 2 | none | none | none | A gap in Tiers II and III. |

## 3. Index

| # | Card | Tier | Change | Confidence | Part of | Ruling |
|---|---|---|---|---|---|---|
| 01 | The Gathering Grounds (was The Fish Traps) | I to 0 and I | rework | strong | tended land |  |
| 02 | The Woodland Bands | 0 | buff | fair |  |  |
| 03 | The Wild Orchards | I | cut | good | tended land |  |
| 04 | Levy of the Land | I, also dealt in II | move | strong |  |  |
| 05 | The Burhs | I | rework | speculative |  |  |
| 06 | Tinkers' Guild | I | cut | strong |  |  |
| 07 | The Land Hunger | I | rework | good |  |  |
| 08 | Outposts | I | rework | good |  |  |
| 09 | The Road Towns | I | buff | good |  |  |
| 10 | The Gleaners | I | buff | good |  |  |
| 11 | The Staked Claims | II to I | move | good |  |  |
| 12 | The Standing Woods (was The Tended Country) | II | rework | good | tended land |  |
| 13 | The Hedgerows | II | rework | good | tended land |  |
| 14 | The Wide Country | III to II | move | good |  |  |
| 15 | The Great Colonies | III to II | move | good |  |  |
| 16 | The Great Households | II | buff | good |  |  |
| 17 | The Thermae | II | new | good |  |  |
| 18 | The Beacons | II | new | fair |  |  |
| 19 | The Seven Fat Years | II | new | good |  |  |
| 20 | Tier II rarities | II | move | good |  |  |
| 21 | The Engineers' Yards | II to III | move | good |  |  |
| 22 | The General Levy | IV to III | move | good |  |  |
| 23 | The Long Tending | III | rework | good | tended land |  |
| 24 | The Polders | III | rework | good |  |  |
| 25 | The Mountain Terraces | III | buff | good |  |  |
| 26 | Tier III rarities | III | move | strong |  |  |
| 27 | The Garden of the World | IV | rework | good | tended land |  |
| 28 | The Keeps | IV | rework | fair |  |  |
| 29 | The Philosophers' Peaks | IV | buff | good |  |  |
| 30 | The Water Boards | IV | new | good |  |  |
| 31 | The Thousand Villages | IV | new | good |  |  |
| 32 | Tier IV rarities | IV | move | strong |  |  |
| 33 | Bound to the Soil | I | doctrine | good | tended land |  |
| 34 | The Wildwood Compact | II | doctrine | fair | tended land |  |
| 35 | The Garden Peoples | III | doctrine | good | tended land |  |
| 36 | Arcadia | IV | doctrine | good | tended land |  |

## 4. The changes as proposed

### 01. The Gathering Grounds, was The Fish Traps (rework)

- **Tier, rarity, type:** Tiers 0 and I, uncommon, Economic, charter (now Tier I, common)
- **Now:** Tier I, common: Workers may build fish traps on lake and coast tiles: +1 food and +1 production.
- **Proposed:** Dealt in Tiers 0 and I, uncommon: Workers may tend wild land: fish traps on coast and lake tiles (+1 food, +1 production) and orchards in forest and jungle (+1 food, +1 gold).
- **Why:** You liked this card at Tier 0. Batch DS1 moved it to Tier I, where a charter that adds 2 to a hex is small. One card now opens both works, so the pick is good on a coast, beside a lake or in woods, and the second charter is not needed (change 03). The name changes because the card opens more than fish traps. It is named for the grounds a people returns to each season to fish and to gather.
- **Arithmetic:** In age 1 a farm on grassland yields 3 and a mine on a hill yields 3. A tended coast or forest hex yields 4. Three tended hexes worked by turn 40 add 6 a turn, which is a regular Tier 0 card (4 to 8), for 3 charges (one Worker, 10 production). The card takes no chair. In my model of the draw, a Tier 0 uncommon of this deck is offered in 6 to 8 games of 10 today, when the deck has two of them. With three it is a little less, and this card is dealt again in Tier I.
- **Synergy:** Raises: the yield of wild hexes. Reads: nothing. A tended hex is still wild, so The Old Songs, Sacred Groves, Garden Cities, The Standing Woods (12), The Long Tending (23) and The Garden of the World (27) pay on it too. The Local Census and The Domesday Survey count it.
- **Shape:** Near an existing shape. A charter unlocks one work today (`charter.unlocks.improvement`); this one names two. `lastBand` deals a card in two tiers; it exists, and no dealt row uses it today.
- **Confidence:** strong for the move, good for the merge
- **Depends:** If you want two cards, keep The Wild Orchards (03) as it is and give this card only the move.

### 02. The Woodland Bands (buff)

- **Tier, rarity, type:** Tier 0, common, Military
- **Now:** Your units ignore the movement cost of forest and jungle.
- **Proposed:** Your units ignore the movement cost of forest, jungle and hills.
- **Why:** The card lost its +2 strength in batch DS3. It pays no yield, and Tier 0 has three chairs. With hills it is the card that gets settlers, workers and scouts across rough ground in half the time. A seat that founds fast wants that.
- **Arithmetic:** A Settler has 2 movement. Forest and jungle cost 2, and a hill costs 1 more. Six hexes of rough ground take 6 turns today and 3 with the card. A town founded 3 turns sooner is worth about 3 turns of its yield (about 8 a turn in age 1), so about 25 yield for each town. Each Worker also reaches its hexes sooner.
- **Synergy:** Raises: towns founded sooner. Reads: nothing. It works with The Founding Furrow, The Seed Grain, The Road Home and the generic The Wagon Trains (+1 movement for settlers and workers).
- **Shape:** Near an existing shape: the rule `woodsWalk`, widened to hills.
- **Confidence:** fair. It is your card; say if it should stay as it is.

### 03. The Wild Orchards (cut)

- **Tier, rarity, type:** Tier I, common, Economic, charter
- **Now:** Workers may tend a forest or jungle tile into an orchard: +1 food and +1 gold.
- **Proposed:** Cut. The orchard moves onto The Gathering Grounds (change 01).
- **Why:** Two charters for one verb cost a seat two picks, and each is good on only a part of the map. An orchard alone is a small card.
- **Arithmetic:** An orchard in forest yields 2 food, 1 production and 1 gold (4). A lumber mill in forest yields 1 food and 2 production (3) from age 2. Felling the forest pays a lump and leaves room for a farm (3 or 4). The orchard is level with them and no more.
- **Synergy:** Nothing is lost. The work stays in the game.
- **Shape:** No shape. The row is retired. The `wildOrchard` work stays.
- **Confidence:** good
- **Depends:** Depends on change 01. If you reject 01, keep this card.

### 04. Levy of the Land (move)

- **Tier, rarity, type:** Tier I and II, common, Economic (now Tier I, uncommon)
- **Now:** Tier I, uncommon: A town may spend a citizen for production equal to the food it took to grow. Once every five turns.
- **Proposed:** Common, dealt in Tiers I and II, the same text.
- **Why:** This is the deck's engine and your favourite card. A Tier I uncommon is offered in about 1 game in 4. Four more cards are dealt only to a seat that holds a levy (The Gleaners, The Terraces of Moray, Seasonal Levies, The Mit'a), so in most games the levy cards are not in the draw at all.
- **Arithmetic:** The eighth citizen of a town took 65 food, so a levy there pays 65 production. That is more than six turns of the town's production in age 2 (about 10). The card is offered in about 25% of games today. As a common in two tiers it is offered in about 65%.
- **Synergy:** Raises: levies. Reads: citizens. It opens The Gleaners, The Terraces of Moray, Seasonal Levies and The Mit'a. Every food card feeds it.
- **Shape:** Existing shape. A rarity change, and `lastBand`.
- **Confidence:** strong

### 05. The Burhs (rework)

- **Tier, rarity, type:** Tier I, common, Military
- **Now:** Towns gain +3 defence for each defensive building.
- **Proposed:** Barbarian units may not enter your borders.
- **Why:** The card pays nothing unless a town is attacked, and the generic cards City Watches and The Town Watch give defence already. Alfred's burhs were a net of forts that closed the land to raiders. The new rule does that. Workers and new towns are safe inside your borders, and each claim makes more land safe. It ends the chore of a guard for each Worker.
- **Arithmetic:** In ages 1 and 2 a seat keeps one or two units at home against raids. A Spearman costs 27 production and a Phalanx 46, and each costs upkeep. A captured Worker costs 10 or more. A pillaged hex costs a charge and its yield. So the card is worth about 60 to 90 production and those turns. It fades in age 3, when camps are few, and a Tier II card then takes its chair.
- **Synergy:** Raises: safe land. Reads: hexes owned. Outposts (08), The Staked Claims (11) and the shared The Barbarian Frontier widen the borders. With Dominion, the barbarians wait at the border, where the army wants them.
- **Shape:** **New shape.** Barbarian units refuse a hex that a holder of this rule owns. Today zone of control is a cost and never a lock, so this is a new kind of movement rule.
- **Confidence:** speculative. It is your card (your pass of 2026-10-16). If you reject this, the card stays as it is.

### 06. Tinkers' Guild (cut)

- **Tier, rarity, type:** Tier I, common, Economic
- **Now:** Workers gain +1 charge.
- **Proposed:** Cut.
- **Why:** It is the weakest Tier I card. The Doctrine Bound to the Soil gives the same +1 charge and takes no chair.
- **Arithmetic:** A Worker costs 10 production and has 3 charges, so one charge is worth about 3 production. A seat that gains six Workers in Tier I saves about 20 production in 40 turns. That is half a production a turn against a Tier I bar of 15 to 25. The bots' reading was 0 on all 11 samples.
- **Synergy:** Nothing reads worker charges.
- **Shape:** No shape. The row is retired.
- **Confidence:** strong

### 07. The Land Hunger (rework)

- **Tier, rarity, type:** Tier I, uncommon, Economic
- **Now:** Towns build settlers 25% faster.
- **Proposed:** Towns keep growing while they build settlers.
- **Why:** A town that builds a Settler banks no food toward growth. That stop is the real price of a new town. With the card, a capital can raise settlers one after another and still grow. 25% of a Settler is a number nobody notices.
- **Arithmetic:** Now: four Settlers in Tier I cost about 200 production in all, so the card saves about 50 production in 40 turns, a little over 1 a turn. Proposed: a Settler takes a town of 10 production about 4 to 6 turns. With a food surplus of 6, the town banks 24 to 36 food in that time, which is most of a citizen at size 5 (43 food). Four Settlers give back two or three citizens, about +10 yield a turn that lasts.
- **Synergy:** Raises: citizens, and towns founded sooner. Reads: nothing. It feeds The Grain Census, Granary Levies, The Book of Settlements and The Founding Furrow.
- **Shape:** **New shape,** small: a rule that the growth stop reads (`growthIsHalted`, `cities.ts`).
- **Confidence:** good

### 08. Outposts (rework)

- **Tier, rarity, type:** Tier I, uncommon, Economic, charter (now a seated card)
- **Now:** Workers may plant an outpost on a wild tile near your border. It claims its hex and the ring around it. (The game adds: while this card is seated.)
- **Proposed:** Charter. The same text. It takes no chair.
- **Why:** An outpost stays when the card leaves its chair. So the best play today is to seat the card, plant, and unseat it. That is a chore, and the chair pays nothing in between. A card that opens a work for your workers should be a charter, as the fish traps are.
- **Arithmetic:** An outpost claims up to 7 hexes for one charge (about 3 production). A town's border takes a hex about every 8 to 10 turns. Two outposts are 14 hexes: +3 culture with The Wild Marches, +7 gold with The Quitrents, and all of The Wide Country's goal of 12.
- **Synergy:** Raises: hexes owned, wild hexes. Reads: nothing. It feeds The Wild Marches, The Wide Country, The Quitrents, The Measure of the Land and The Burhs (05).
- **Shape:** Existing shape: `charter.unlocks` in place of `unlocksImprovement`.
- **Confidence:** good

### 09. The Road Towns (buff)

- **Tier, rarity, type:** Tier I, common, Economic
- **Now:** Towns joined to your capital by road gain +2 production.
- **Proposed:** Towns joined to your capital by road gain +4 production.
- **Why:** Five joined towns pay 10 a turn today, under the Tier I bar. Three of the deck's leaders point at roads.
- **Arithmetic:** Five towns in age 2: 10 now, 20 proposed (the bar is 15 to 25). A town makes about 10 production in age 2, so +4 is a real share of it.
- **Synergy:** Reads: joined towns. The Road Home, caravans and the shared Market Gardens make them. Provincial Councils, Garden Provinces and The Imperial Roads read the same towns.
- **Shape:** Existing shape, a number change.
- **Confidence:** good

### 10. The Gleaners (buff)

- **Tier, rarity, type:** Tier I, common, Economic, needs a levy
- **Now:** After a town levies a citizen, it gains +3 food for ten turns.
- **Proposed:** After a town levies a citizen, it gains +5 food for ten turns.
- **Why:** The card's job is to grow the citizen back. At 30 food for each levy it does less than half of that.
- **Arithmetic:** The eighth citizen costs 65 food. The card gives 30 now and 50 proposed. Four towns that levy in turn: +20 food a turn while it runs, against a bar of 15 to 25.
- **Synergy:** Reads: levies. Levy of the Land (04), The Colonists and the shared The Muster of the Fields make them.
- **Shape:** Existing shape, a number change.
- **Confidence:** good

### 11. The Staked Claims (move)

- **Tier, rarity, type:** Tier I, rare, Economic (now Tier II, uncommon)
- **Now:** Tier II, uncommon: Each town you found claims every unowned hex within two hexes of it.
- **Proposed:** Tier I, rare, the same text.
- **Why:** Tier II opens at about turn 72, when most towns are founded. In Tier I a seat still founds two to four. Tier I has no rare of this deck.
- **Arithmetic:** A new town claims 6 hexes today and 18 with the card. Three towns are 36 more hexes at once. A border takes a hex about every 8 to 10 turns, so that is about 100 town-turns of border growth.
- **Synergy:** Raises: hexes owned, wild hexes. It feeds The Wild Marches (+9 culture for 36 wild hexes), The Burhs (05), The Quitrents and The Measure of the Land.
- **Shape:** Existing shape. Only the tier and the rarity change.
- **Confidence:** good

### 12. The Standing Woods, was The Tended Country (rework)

- **Tier, rarity, type:** Tier II, uncommon, Economic
- **Now:** Needs tended land. Tended tiles gain +2 production.
- **Proposed:** Worked wild forest and jungle tiles gain +3 production.
- **Why:** The card pays from the turn it is seated, with no charter and no gate. It makes "leave the forest standing" a real choice against the lumber mill and the axe. You set the model on 2026-09-03: a bonus on unimproved land names forest and jungle. The name is for woodland kept standing and cut for poles and charcoal.
- **Arithmetic:** A wild forest yields 1 food and 1 production. With the card it yields 1 and 4, and with an orchard 2, 4 and 1 gold. A lumber mill in forest yields 1 and 2. A seat that works 6 to 10 forest and jungle hexes gains 18 to 30 production. The Tier II bar is 35 to 60, so it is a modest card alone.
- **Synergy:** Reads: worked wild forest and jungle. The map makes them, claims add them, and The Gathering Grounds (01) raises the same hexes. The Old Songs and Sacred Groves pay on them too. The Long Tending (23) doubles it.
- **Shape:** Existing shape: `pays` hex on `anyFeature` forest or jungle and `unimproved`.
- **Confidence:** good

### 13. The Hedgerows (rework)

- **Tier, rarity, type:** Tier II, common, Economic
- **Now:** Needs tended land. Worked farms beside a tended tile gain +2 food, once per farm.
- **Proposed:** Farms beside a forest or jungle gain +3 food.
- **Why:** A hedgerow is the wild strip beside a field. The card joins the field and the wild: a seat keeps the woods beside its farms. The player sees it on the map and has no count to keep.
- **Arithmetic:** About a third of a seat's farms stand beside woods. Five farms of fifteen: +15 food. A seat that plans for it reaches ten farms and +30.
- **Synergy:** Reads: farms, and forest left standing. Smallholdings, Dark Earth and Break the Sod pay on the same farms. The Age of Improvement doubles it.
- **Shape:** Existing shape: `pays` hex on a farm `beside` forest or jungle.
- **Confidence:** good

### 14. The Wide Country (move)

- **Tier, rarity, type:** Tier II, uncommon, Wildcard, commission (now Tier III)
- **Now:** Tier III: Goal: claim 12 hexes by outposts, cleared camps or buying. Reward: your borders grow 25% faster.
- **Proposed:** Tier II: Goal: claim 12 hexes by outposts, cleared camps or buying. Reward: your borders grow 50% faster.
- **Why:** Tier III opens at about turn 133. The camps are gone and the land between empires is taken, so the goal is hard and the reward buys little. In Tier II there is land to claim and gold to buy it. Tier II has no commission.
- **Arithmetic:** Two outposts are up to 14 hexes. Eight towns that each take a hex every 9 turns take about 0.9 hexes a turn. +50% is about 27 more hexes in 60 turns, and the card has left its chair.
- **Synergy:** Reads: hexes claimed. Outposts (08), the shared The Barbarian Frontier and gold feed it. The reward feeds The Wild Marches, The Quitrents and The Measure of the Land.
- **Shape:** Existing shape. The tier and one number change.
- **Confidence:** good

### 15. The Great Colonies (move)

- **Tier, rarity, type:** Tier II, rare, Economic (now Tier III)
- **Now:** Tier III, rare: Towns you found start with a third of the citizens of your largest town.
- **Proposed:** Tier II, rare, the same text.
- **Why:** The same reason as change 14: at Tier III few seats found a town. Tier II has no rare of this deck.
- **Arithmetic:** With a largest town of 12, a new town starts with 4 citizens. Growing from 1 to 4 takes 10 + 17 + 25 = 52 food, which is 15 to 20 turns for a new town. Two such towns are about +25 yield a turn at once.
- **Synergy:** Reads: the largest town, and towns founded. The Colonists (a levy raises a settler), The Land Hunger (07) and The Book of Settlements work with it.
- **Shape:** Existing shape. Only the tier changes.
- **Confidence:** good

### 16. The Great Households (buff)

- **Tier, rarity, type:** Tier II, common, Economic (now uncommon)
- **Now:** Uncommon: Each town gains +2% production for each citizen, at most +30%.
- **Proposed:** Common: Each town gains +3% production for each citizen, at most +30%.
- **Why:** It is the deck's plain "citizens pay" card of the middle game, and it is under the bar.
- **Arithmetic:** A town of 8: +16% now, +24% proposed. A seat makes about 107 production in age 3, so the card pays about 17 now and 26 proposed. The cap is reached at 10 citizens, not 15.
- **Synergy:** Reads: citizens. Every food card feeds it. As a percentage it grows with the flat cards (The Road Towns, The Standing Woods).
- **Shape:** Existing shape, a number and a rarity change.
- **Confidence:** good

### 17. The Thermae (new)

- **Tier, rarity, type:** Tier II, uncommon, Civic
- **Now:** Not in the deck.
- **Proposed:** Each public work gives its town +2 science.
- **Why:** Public works have one Order in each tier, and none pays science. The great Roman baths held libraries and lecture halls. Every town builds public works (the Granary, Aqueduct, Watermill, Harbour, Public Bath and Cistern), so the card has a floor in every seat, tall or wide.
- **Arithmetic:** Six towns with 3 public works each: +36 science in age 3, where the median seat makes 106. That is a regular Tier II card (35 to 60). Ten towns with 4 each: +80 late.
- **Synergy:** Reads: public works. The Doctrine The Curator of Waters builds them 50% faster, and the generic The Capital's Example helps. The Aediles and The Water Boards (30) read the same buildings.
- **Shape:** Existing shape: `pays` city, count `publicWorks` within the town, to science.
- **Confidence:** good

### 18. The Beacons (new)

- **Tier, rarity, type:** Tier II, common, Military
- **Now:** Not in the deck.
- **Proposed:** Your units gain +1 movement inside your borders.
- **Why:** Tiers II and III have no Military card of this deck. A chain of beacons called the defenders before the raiders arrived. With the card, a few units hold a wide empire. It also pays at peace, because workers and settlers are units.
- **Arithmetic:** A Worker has 2 movement, so 3 inside your borders. A defender covers half again the ground, so a seat of eight towns can hold with about five units in place of eight. That saves three units of 81 production each (a Legionary) and their upkeep.
- **Synergy:** Reads: hexes owned. Claims widen the ground it works on. It works with the roads of The Road Home.
- **Shape:** Near an existing shape: `unitStat` movement with `where: ownTerritory`. The `where` field exists (a retired healing card used it); movement by place is to confirm.
- **Confidence:** fair

### 19. The Seven Fat Years (new)

- **Tier, rarity, type:** Tier II, uncommon, Economic, boon
- **Now:** Not in the deck.
- **Proposed:** On draft: each of your towns gains a citizen.
- **Why:** The deck has no boon. This one is the engine in one moment, in the tier where the deck is strongest. A wide seat gets more from it. The name is from the seven years of plenty in the story of Joseph in Egypt.
- **Arithmetic:** Six towns at size 7 skip 65 food each: 390 food. At size 9 it is 88 each: 530. A Tier II lump registers at 500 to 900, and these citizens stay. Each one is a new largest size for The Grain Census: +6 production and +6 gold a turn for the rest of the game.
- **Synergy:** Raises: citizens. It feeds The Grain Census, The Great Households, The Megalopolis, The Harbour Cities and every levy.
- **Shape:** Near an existing shape. The citizens grant exists (the Doctrine The Censors pays it to every town). An on-draft arm for it is to confirm.
- **Confidence:** good

### 20. Tier II rarities (move)

- **Tier, rarity, type:** The Waterworks and Provincial Councils
- **Now:** The Waterworks and Provincial Councils are uncommon.
- **Proposed:** Both become common.
- **Why:** Tier II holds 11 uncommons and 6 commons today. Each uncommon is offered in 2 games of 10 and each common in 5. These two are plain cards that most seats can use.
- **Arithmetic:** With this change and the other changes to Tier II (11 to 19 and 21), the tier holds 9 commons, 10 uncommons and 1 rare.
- **Synergy:** No change.
- **Shape:** Existing shape. Rarity only.
- **Confidence:** good

### 21. The Engineers' Yards (move)

- **Tier, rarity, type:** Tier III, common, Economic (now Tier II)
- **Now:** Tier II: Improvements beside a manufactory gain +2 production.
- **Proposed:** Tier III: Improvements beside a manufactory gain +4 production.
- **Why:** The card needs a great engineer's work. You gain 2 to 3 great people of all families in an age, so at Tier II most seats have no manufactory. The cards that bring engineers are in Tier III (A Court of Engineers, the generic The Office of Works).
- **Arithmetic:** Six improved hexes around one manufactory: +12 now, +24 proposed, beside the manufactory's own 3. Two manufactories: 48, against a Tier III bar of 60 to 120.
- **Synergy:** Reads: manufactories and improved hexes. A Court of Engineers and The Office of Works bring engineers. The Age of Improvement doubles it.
- **Shape:** Existing shape. The tier and one number change.
- **Confidence:** good

### 22. The General Levy (move)

- **Tier, rarity, type:** Tier III, uncommon, Military (now Tier IV, rare)
- **Now:** Tier IV, rare: Your towns may spend a citizen to raise a melee unit. At war, they may do it every turn.
- **Proposed:** Tier III, uncommon, the same text.
- **Why:** A seat without Dominion has no card that raises a soldier before Tier IV, and Tier III has no Military card. With Veteran Colonies (Tier II) the card also moves citizens: raise a soldier in a full town, walk it to a new town, and retire it there.
- **Arithmetic:** A Legionary costs 81 production in age 3 and a Pikeman 238 in age 4. The tenth citizen costs 88 food. So a levy turns about 90 food into a unit worth 81 to 238 production.
- **Synergy:** Raises: units gained, levies. It feeds Veteran Colonies, The Mit'a and the shared The Farming Garrisons, and Alexander's The Royal Army.
- **Shape:** Existing shape. The tier and the rarity change.
- **Confidence:** good

### 23. The Long Tending (rework)

- **Tier, rarity, type:** Tier III, rare, Wildcard (now Economic)
- **Now:** Needs tended land. Tended tiles gain +3 food.
- **Proposed:** The bonuses your Orders give to wild tiles are doubled.
- **Why:** The wild needs a capstone, as the field has The Age of Improvement. Today this rare gives less than the common Old Workings, and only after a charter.
- **Arithmetic:** A worked wild forest with The Old Songs (+2 culture), The Standing Woods (+3 production) and Sacred Groves (+1 food, +1 faith) carries 7 from Orders. The card adds 7 more. Ten such hexes: +70, a regular Tier III card (60 to 120). A seat with one wild card gets about 20. A seat that built for it passes 100.
- **Synergy:** Reads: what Orders pay on wild hexes. The Old Songs, The Standing Woods (12), The Garden of the World (27), Sacred Groves, The Hard Country on unimproved desert, and The Mountain Terraces (25) feed it, because a worked mountain is wild.
- **Shape:** Existing shape: `cardYieldAmplifier` on `unimproved`, as The Age of Improvement is on `improved`. It acts on other cards, so its type is Wildcard.
- **Confidence:** good

### 24. The Polders (rework)

- **Tier, rarity, type:** Tier III, uncommon, Economic, charter (now rare, seated)
- **Now:** Rare: Workers may build a polder on a coast tile beside three of your land tiles. It yields as a farm. (The game adds: while this card is seated, and for 2 charges. No farm card reads a polder.)
- **Proposed:** Charter, uncommon: Workers may build a polder on a coast tile beside three of your land tiles. A polder is a farm.
- **Why:** The Polders is the deck's answer to a full map, so it must make real farmland. Today a polder makes a coast hex of 2 into a hex of 3, for two charges and a rare's chair.
- **Arithmetic:** A coast hex yields 2, or 3 with a Lighthouse. A polder yields 3 today. As a farm with three farm cards (Smallholdings +2, Dark Earth +2, Break the Sod +1) it yields 8. Eight polders: +8 today and +40 proposed, with no chair.
- **Synergy:** Raises: farms, improved hexes. Reads: coast. Every farm card then pays on it.
- **Shape:** Existing parts: `charter.unlocks`, and `countsAs: farm` (Terraces use it). To confirm: `countsAs` and `yieldsAs` on one row.
- **Confidence:** good

### 25. The Mountain Terraces (buff)

- **Tier, rarity, type:** Tier III, uncommon, Civic (now rare)
- **Now:** Rare: Your towns may work the mountains in their borders. A worked mountain yields 2 science and 1 production.
- **Proposed:** Uncommon: Your towns may work the mountains in their borders. A worked mountain yields 4 science and 2 production.
- **Why:** You called this "a cool mechanic". A hex of 3 is the worst hex a citizen can work in Tier III, so nobody uses the rule.
- **Arithmetic:** A farm with two cards yields 7 or 8 in Tier III. A mountain yields 3 now and 6 proposed, and 4 of it is science, which the deck lacks. Six worked mountains: +24 science and +12 production.
- **Synergy:** Reads: mountains in your borders. The Philosophers' Peaks (29) and the shared The Mountain Observatories read the same hexes. A worked mountain is wild, so The Old Songs and The Long Tending (23) pay on it. Pachacuti starts beside mountains.
- **Shape:** Existing shape, a number and a rarity change.
- **Confidence:** good

### 26. Tier III rarities (move)

- **Tier, rarity, type:** Five cards
- **Now:** Seasonal Levies, The Capitolia and The Freedom of the City are uncommon. A Court of Engineers and The Mit'a are rare.
- **Proposed:** Seasonal Levies, The Capitolia and The Freedom of the City become common. A Court of Engineers and The Mit'a become uncommon.
- **Why:** Tier III holds 10 rares, 4 uncommons and 4 commons. Each rare is offered in 1 game of 9, and each of the four commons in 19 of 20. Every Tier III looks the same, and the cards that change play stay hidden.
- **Arithmetic:** With this change and changes 14, 15 and 21 to 25, Tier III holds 8 commons, 5 uncommons and 5 rares. The rares are The Long Tending, The Age of Improvement, The Megalopolis, The Sovereign Writ and The Imperial Roads.
- **Synergy:** No change.
- **Shape:** Existing shape. Rarity only.
- **Confidence:** strong for the direction. Each card's new rarity is a first guess.

### 27. The Garden of the World (rework)

- **Tier, rarity, type:** Tier IV, uncommon, Economic (now rare)
- **Now:** Rare. Needs tended land. Tended tiles gain +2 food, +1 production and +1 culture.
- **Proposed:** Uncommon: Worked wild tiles gain +2 food, +1 production and +1 culture.
- **Why:** The numbers stay. The gate goes, and the card pays on about three times as many hexes.
- **Arithmetic:** In age 4 a seat works 15 to 25 wild hexes: coast, forest, hills with no mine, and mountains under The Mountain Terraces. That is +60 to +100 a turn, a regular Tier IV card (60 to 120). On about 8 tended hexes it paid 32.
- **Synergy:** Reads: worked wild hexes. The Long Tending (23) doubles it. The Gathering Grounds (01) raises the same hexes.
- **Shape:** Existing shape: `pays` hex on `unimproved`.
- **Confidence:** good

### 28. The Keeps (rework)

- **Tier, rarity, type:** Tier IV, rare, Economic, charter (now a seated card)
- **Now:** Workers may build one Keep in each town. A Keep gains the yields of every tile around it. (The game adds: while this card is seated.)
- **Proposed:** Charter. The same text. It takes no chair.
- **Why:** The same reason as Outposts (08). A Keep stays when the card leaves its chair, so today the best play is to seat it, build, and unseat it.
- **Arithmetic:** Six hexes of about 6 each: a Keep's hex yields about 36. Ten towns: about 360 a turn, a Tier IV headline (200 or more). The price is the pick, and a charge and a hex in each town.
- **Synergy:** Reads: the hexes around the Keep. Every hex card of the deck raises it.
- **Shape:** Existing shape: `charter.unlocks` in place of `unlocksImprovement`.
- **Confidence:** fair. With no chair it may be too free. Test it first.

### 29. The Philosophers' Peaks (buff)

- **Tier, rarity, type:** Tier IV, common, Civic (now uncommon)
- **Now:** Uncommon: Each town gains +2 science for every mountain in its borders, at most +6.
- **Proposed:** Common: Each town gains +4 science for every mountain in its borders, at most +12.
- **Why:** The shared Tier 0 card The Mountain Observatories gives +3 science a town. A Tier IV card must do more than twice that.
- **Arithmetic:** Four towns of ten hold mountains, 2 or 3 each: 20 now, 40 proposed. A mountain empire of six such towns with 3 each: 36 now, 72 proposed. The Tier IV bar is 60 to 120.
- **Synergy:** Reads: mountains in your borders. The Mountain Terraces (25) reads the same hexes.
- **Shape:** Existing shape, a number and a rarity change.
- **Confidence:** good

### 30. The Water Boards (new)

- **Tier, rarity, type:** Tier IV, uncommon, Economic
- **Now:** Not in the deck.
- **Proposed:** Your public works yield twice as much.
- **Why:** Public works have no Order in Tier IV. This is the theme's multiply card, late, when the flats exist. The Dutch water boards have kept dikes and drains since the 13th century.
- **Arithmetic:** A Granary gives 2 food, a Watermill 2 food and 1 production, a Harbour 1 food and 3 production, a Public Bath 3 food and a Cistern 2 food. A full town holds about 8 food and 4 production from them. Ten towns with most of them built: +80 to +100 a turn, a regular Tier IV card.
- **Synergy:** Reads: public works. The Thermae (17), The Aediles and the Doctrines The Curator of Waters and The Hydraulic Empire read the same buildings.
- **Shape:** Near an existing shape. `buildingYieldPercent` takes a building category today (The Iron Pillar). A public-work selector is missing there; `productionBonus` has one.
- **Confidence:** good

### 31. The Thousand Villages (new)

- **Tier, rarity, type:** Tier IV, common, Civic
- **Now:** Not in the deck.
- **Proposed:** +1 culture for every two citizens in your empire.
- **Why:** Your picture of the deck asks for late bonuses that grow with towns and citizens. Tier IV has no card that reads the empire's citizens. Culture is the draft currency, and a wide seat is short of it late.
- **Arithmetic:** Twelve towns of 10 are 120 citizens: +60 culture. The median seat makes 442 culture in age 4, so that is 14%. A regular Tier IV card.
- **Synergy:** Reads: citizens. Every food card, The Seven Fat Years (19) and The Censors feed it.
- **Shape:** Existing shape: `pays` empire, count `population`, 1 for every 2.
- **Confidence:** good

### 32. Tier IV rarities (move)

- **Tier, rarity, type:** Five cards
- **Now:** The Corvée, The Measure of the Land, The Domesday Survey and The Imperial Highways are rare. The Theodosian Walls is uncommon.
- **Proposed:** The four become uncommon. The Theodosian Walls becomes common.
- **Why:** Tier IV holds 9 rares and 2 uncommons, and it has about five drafts. Each rare is offered in 1 game of 8. The two uncommons are offered in 7 to 9 games of 10, and they are the two weakest cards of the tier.
- **Arithmetic:** With this change and changes 22 and 27 to 31, Tier IV holds 3 commons, 6 uncommons and 3 rares. The rares are The Keeps, The Mother City and The Great Migration.
- **Synergy:** No change.
- **Shape:** Existing shape. Rarity only.
- **Confidence:** strong for the direction. Each card's new rarity is a first guess.

### 33. Bound to the Soil (doctrine)

- **Tier, rarity, type:** Tier I, Doctrine, the field
- **Now:** Workers gain +1 charge. Tended tiles gain +1 food.
- **Proposed:** Workers gain +1 charge. Farms and tended tiles gain +1 food.
- **Why:** This is your line of 2026-11-05. A seat with no charter gets only the charge from it, and one charge is the whole of Tinkers' Guild (change 06). With farms it is a Doctrine for every seat that works its land, and it still pays on tended hexes.
- **Arithmetic:** Ten farms at turn 40: +10 food for the rest of the game. Thirty farms late: +30.
- **Synergy:** Reads: farms and tended hexes. Workers and The Gathering Grounds (01) make them.
- **Shape:** Existing shape: one more `pays` hex row on farms.
- **Confidence:** good

### 34. The Wildwood Compact (doctrine)

- **Tier, rarity, type:** Tier II, Doctrine, the wild
- **Now:** Needs tended land. Tended works cost your workers no charge. Workers you gain from now on have one less charge.
- **Proposed:** Worked wild forest and jungle tiles gain +1 food and +1 production. Tended works cost your workers no charge.
- **Why:** With no gate, the Doctrine must be worth taking with no charter. The price on new workers goes, because free tending no longer replaces the farms. You wrote that price on 2026-10-23; say if it should stay.
- **Arithmetic:** Eight forest hexes: +16 a turn for the game. With the charter, each orchard and fish trap is free (a charge is about 3 production).
- **Synergy:** Reads: wild forest and jungle, and tended works. The Standing Woods (12) reads the same hexes.
- **Shape:** Existing shapes: `pays` hex, and the rule `tendedWorksFree`.
- **Confidence:** fair

### 35. The Garden Peoples (doctrine)

- **Tier, rarity, type:** Tier III, Doctrine, the wild
- **Now:** Needs tended land. Tended tiles gain +1 food, +1 production and +1 culture.
- **Proposed:** Worked wild tiles gain +1 food, +1 production and +1 culture.
- **Why:** It becomes the other side of Crop Rotation, in the same tier. Crop Rotation doubles the works on improved hexes and makes wild hexes yield nothing. A seat takes one of them, so the tier offers a real fork.
- **Arithmetic:** 15 to 20 worked wild hexes: +45 to +60 a turn for the game.
- **Synergy:** Reads: worked wild hexes. The Long Tending (23) does not double it, because it is a Doctrine and not an Order.
- **Shape:** Existing shape: `pays` hex on `unimproved`.
- **Confidence:** good

### 36. Arcadia (doctrine)

- **Tier, rarity, type:** Tier IV, Doctrine, cut
- **Now:** Needs tended land. Your tended tiles also count as improved for every card.
- **Proposed:** Cut.
- **Why:** Its job was to close the gap between the tended cards and the improved cards. With the pay-offs on wild land, that gap is gone. Tier IV has seven Doctrines, and the target is three to five.
- **Arithmetic:** No arithmetic. Tier IV then has six Doctrines.
- **Synergy:** Nothing reads it.
- **Shape:** No shape. The row is retired. The gate `needsTendedWork` is then on no row.
- **Confidence:** good

## 5. The deck if you approve every change

| Tier | Cards | Military | Economic | Civic | Wildcard | Common | Uncommon | Rare |
|---|---|---|---|---|---|---|---|---|
| Tier 0 | 11 | 1 | 7 | 3 | 0 | 7 | 3 | 1 |
| Tier I | 16 | 1 | 10 | 4 | 1 | 10 | 5 | 1 |
| Tier II | 20 | 1 | 10 | 8 | 1 | 9 | 10 | 1 |
| Tier III | 18 | 1 | 9 | 6 | 2 | 8 | 5 | 5 |
| Tier IV | 12 | 1 | 6 | 4 | 1 | 3 | 6 | 3 |
| **All** | **77** | **5** | **42** | **25** | **5** | **37** | **29** | **11** |

- 74 cards today, less 2 cuts, plus 5 new: 77. Four are charters and take no chair (The Gathering Grounds, Outposts, The Polders, The Keeps). The Gathering Grounds is counted in Tier 0 and Levy of the Land in Tier I; each is also dealt one tier later.
- Doctrines: 23 (4, 6, 7 and 6).
- Every tier has a Military card. The deck is still 42 Economic cards of 77 (55%). The type rules put food, production, land and growth there, and that is what this deck does.
- Keywords: 3 commissions, 4 charters, 2 scalers and 1 boon.

## 6. The themes after the pass

### The field (improved land)

- **Tier 0:** Smallholdings, Sweet Water, The Rope Stretchers
- **Tier I:** Dark Earth, The Three Sisters, Commission: Break the Sod, The Local Census, The Hard Country; the Doctrine Bound to the Soil
- **Tier II:** The Watercourses, The Highlands, The Coast, The Hedgerows (the bridge to the wild); the Doctrine The Georgics
- **Tier III:** Old Workings, The Age of Improvement, The Polders, The Engineers' Yards; the Doctrine Crop Rotation
- **Tier IV:** The Keeps, The Domesday Survey; the Doctrine The Physiocrats
- **The essentials:** production everywhere; science from The Rope Stretchers, The Highlands and The Domesday Survey; culture from The Coast.

### The wild (wild land, with tending)

- **Tier 0:** The Gathering Grounds; the shared Sacred Groves
- **Tier I:** The Old Songs, The Wild Marches, Outposts, The Staked Claims; the shared Garden Cities and The Barbarian Frontier
- **Tier II:** The Standing Woods, The Hedgerows, The Wide Country; the Doctrine The Wildwood Compact
- **Tier III:** The Long Tending, The Mountain Terraces; the Doctrine The Garden Peoples
- **Tier IV:** The Garden of the World, The Philosophers' Peaks
- **The essentials:** culture from The Old Songs and The Wild Marches; production from The Standing Woods; science from the mountains, which are wild land. The four roles: claims supply it, tending is the act, the Tier I and II cards widen it, and The Long Tending multiplies it.

### The frontier (towns, claims, roads, authority)

- **Tier 0:** The Seed Grain, The Road Home, The Founding Furrow, The Woodland Bands
- **Tier I:** The Staked Claims, Outposts, The Land Hunger, The Road Towns, The Burhs
- **Tier II:** The Great Colonies, The Colonists, The Book of Settlements, Provincial Councils, The Wide Country, The Beacons
- **Tier III:** The Imperial Roads, The Sovereign Writ, The Quitrents
- **Tier IV:** The Measure of the Land, The Mother City, The Great Migration, The Imperial Highways
- **The essentials:** culture from The Founding Furrow and The Mother City; production from The Road Towns and The Book of Settlements; science only from The Thermae (every town builds public works) until The Measure of the Land.

### Citizens and the levy (the engine)

- **Tier 0:** Granary Levies, The Patient Harvest
- **Tier I:** Levy of the Land (also dealt in Tier II), The Gleaners, The Grain Census
- **Tier II:** The Seven Fat Years, The Great Households, The Breadbasket, Veteran Colonies, The Terraces of Moray, The Harbour Cities, The Grain Dole
- **Tier III:** The General Levy, Seasonal Levies, The Mit'a, The Megalopolis, Plenty, The Freedom of the City
- **Tier IV:** The Thousand Villages, The Corvée, The Theodosian Walls
- **The essentials:** production from the levy and from growth; science from The Terraces of Moray and The Megalopolis; culture from The Harbour Cities and The Thousand Villages.

### Public works and engineers

- **Tier 0:** The Horrea
- **Tier I:** The Aediles
- **Tier II:** The Thermae, The Waterworks; the Doctrine The Curator of Waters
- **Tier III:** The Mill Wheels, The Capitolia, A Court of Engineers, The Engineers' Yards
- **Tier IV:** The Water Boards; the Doctrine The Hydraulic Empire
- **The essentials:** science from The Thermae; culture from The Aediles and The Capitolia; production from The Aediles, The Mill Wheels and The Water Boards.

## 7. Example councils

### Early, end of Tier I: the standing wild (five chairs, a tier-4 government)

- **Chairs:** Sweet Water (0), The Founding Furrow (0), The Old Songs (I), The Wild Marches (I), Levy of the Land (I). Held with no chair: The Gathering Grounds and Outposts. Doctrine: Bound to the Soil.
- **How it plays:** The seat founds four towns and leaves the woods standing. Each wild hex a town works pays 2 culture, and each four wild hexes it owns pay 1 more. Workers set fish traps and orchards on the hexes the towns work. Two outposts claim the gaps. The culture brings Tier II early, and a levy turns the food into buildings.

### Early, end of Tier II: the road realm (six chairs, a tier-10 government)

- **Chairs:** The Road Towns (I), The Grain Census (I), The Thermae (II), The Great Households (II), The Book of Settlements (II), Provincial Councils (II). Taken on the way: The Seven Fat Years and The Wide Country. Doctrine: The Curator of Waters.
- **How it plays:** Seven towns, each joined by road, each with a Granary and a Watermill. A joined town pays +4 production and costs 1 less authority. Each public work pays 2 science and 2 happiness. The boon adds a citizen to every town, and The Grain Census grows by 7.

### Late, Tier III then Tier IV: the garden peoples (eight chairs, then eleven)

- **Chairs at Tier III:** The Long Tending, The Standing Woods (II), The Old Songs (I), The Mountain Terraces, The Megalopolis, The Capitolia, The General Levy, The Grain Census (I). Doctrine: The Garden Peoples. Tier IV adds The Garden of the World, The Thousand Villages and The Philosophers' Peaks.
- **How it plays:** The towns are large and ringed by forest, coast and mountains. A worked wild forest pays its own 2, an orchard's 2, the Doctrine's 3, and 9 from three Orders, doubled. Mountains pay science. A full town raises a soldier, walks it to a new town and settles it there.

## 8. Pairs, leaders and great people

### What Expansionist gives and takes with each other deck

- **Dominion (Alexander):** Expansionist gives citizens to raise as soldiers and wide land to hold. It takes Military cards for its chairs and camps that claim land when cleared. The General Levy at Tier III (22) feeds The Royal Army a tier sooner. The Burhs (05) keeps barbarians at the border; Dominion still kills them there.
- **Commerce (Pachacuti):** Expansionist gives joined towns, road hexes and luxuries on claimed land. It takes gold, which buys hexes and workers, and caravans, which lay roads. See "For the Commerce pass" below.
- **Devotion (Jayavarman VII):** Expansionist gives wild forest that pays faith (Sacred Groves pays on a tended forest too) and large towns. It takes happiness and authority in devout towns.
- **Scientific (Nezahualcoyotl):** Expansionist gives many towns for empire buildings, and public works that now pay science (The Thermae). It takes charters that open the Aqueduct early, and science.
- **Magisterial (Cyrus):** Expansionist gives claimed land for great-person works and wild hexes for Garden Cities. It takes culture and the government's chairs.

### For the Commerce pass

- I change no shared card. The Country Fair, Market Gardens and The Provincial Fair stay as they are.
- **The rarity finding is not only this deck's.** The draw shows a rare in about 1 game of 9. The Commerce pass should count its rares by tier in the same way.
- **Roads are worth more to this seat.** The Road Towns pays +4 (09) and The Beacons moves units inside the borders (18). Caravans lay roads, so the pair is stronger.
- **The Wide Country moves to Tier II (14)** and counts hexes bought with gold. It is a use for Commerce's gold in the tier where it has some.
- **Tinkers' Guild is cut (06).** If the Commerce pass has a card that buys or boosts workers, nothing here reads worker charges now.
- **Wild land.** A luxury hex that is left wild pays The Country Fair and The Old Songs together. A tended hex opens no resource, so a card that reads improved resources does not read it.

### Leaders and great people

- **Alexander:** richer. The General Levy at Tier III gives The Royal Army units to read without Dominion's cards.
- **Pachacuti:** richer. Roads (09, 18), and mountains (25, 29) for a start beside mountains.
- **Jayavarman VII:** richer. He starts near forest and rivers, and wild forest now has four cards. His roads gain 09.
- **Nezahualcoyotl:** richer. He starts beside a lake, so fish traps at Tier 0 suit him. The Thermae and The Water Boards read the Aqueduct towns that The Dikes reads.
- **Cyrus:** a little thinner on workers (Tinkers' Guild is cut), and richer where it counts: the Workers of The King's Gardeners have fish traps, orchards and outposts to lay in a new town.
- **Ibn Battuta:** no change.
- No leader points at tended land today, so folding it loses no leader's theme.
- **Great people:** only engineers are touched. The Engineers' Yards moves beside A Court of Engineers in Tier III, and the Court becomes uncommon. The pass that gives ten engineers to each age makes both better.

## 9. What to test first

1. **The Old Songs.** +2 culture on every worked wild hex is about 16 culture at turn 50, against 14 to 25 culture a turn in age 2. It may already be over the Tier I bar, and this pass builds a theme on it. If it is too strong, make it +1 or name forest, jungle and hills.
2. **The Gathering Grounds at Tier 0.** Count the hexes a player tends by turn 60, and whether tending feels like a choice or like a round of clicks.
3. **Levy of the Land as a common in two tiers.** Is it an automatic pick?
4. **The charters.** Outposts and The Keeps with no chair: are they too free?
5. **The Seven Fat Years with The Grain Census.** Six or seven sizes gained in one turn.
6. **The Long Tending with three wild cards.** Check the ceiling against The Age of Improvement.
7. **The rarities.** After the build, count what a seat is offered in Tiers III and IV over ten games.
8. **The Burhs.** Does a border that barbarians cannot cross make the early game dull?

## 10. What I could not determine

- No measurement of this deck exists since batches DS1 and DS3 (2026-11-10), and none of tended land at all, because the bots do not tend. The power bar comes from bot games of 2026-10-13 on an older tree.
- The offer figures come from my own model of the draw, not from games. The model picks a card at random from each hand, uses 4, 6, 8, 8 and 5 drafts by tier, and ignores passes and redraws. The script is in the scratchpad beside the review page.
- How many wild hexes a human seat works in each age. I used 8 to 12 in age 2 and 15 to 25 in age 4.
- Whether a citizen that a card grants counts as growth and as a new largest size (The Seven Fat Years with Granary Levies and The Grain Census).
- Whether a hex claimed at founding counts toward The Wide Country's goal. The card's text names outposts, camps and buying.
- Five shape points for the triage: a charter that opens two works (01); movement that depends on where the unit stands (18); citizens as an on-draft grant (19); `countsAs` with `yieldsAs` on the polder (24); a public-work selector on `buildingYieldPercent` (30).
- How the Doctrine Crop Rotation should treat water. Today every hex with no improvement yields nothing under it, coast and lake included.
- The history behind the names is from my own knowledge, not from a source in the repo.
- Six sheet texts differ from the game's own words. The Local Census: the game also counts tended hexes. The Domesday Survey: the game's words for the goal leave out "or tended", and the rule counts them. Outposts, The Polders and The Keeps: the game adds "while this card is seated". The Grain Census and The Aediles: the production goes to the capital. Granary Levies: the text has no full stop.

## 11. Questions for the user

1. **Tended land: fold it into the wild (C), cut it (A) or flesh it out (B)?** Recommended: C. Changes 01, 03, 12, 13, 23, 27 and 33 to 36 are written for C. The appendices list A and B.
2. **One charter for both tended works, or two?** Recommended: one, The Gathering Grounds, dealt in Tiers 0 and I. If you want to keep the name The Fish Traps and a second card for orchards, say so.
3. **May a card's rarity be set by how often it should be seen?** Recommended: yes, as in changes 20, 26 and 32. The same count should then be made for the other five decks, as a short pass of its own.
4. **Do cards that open a work for your workers become charters?** Recommended: yes. Outposts, The Polders and The Keeps (08, 24, 28). The other choice is to keep them seated and remove the work when the card leaves, which punishes the player.
5. **Should Levy of the Land be offered in most games?** Recommended: yes: common, and dealt in Tiers I and II (04). It is the deck's engine, and today it is offered in one game in four.

## Appendix A: the changes if you cut tended land

Under A the theme goes, and "tended" leaves the game as a word. The other 26 changes stand as written.

| Change | Under option A |
|---|---|
| 01 The Fish Traps | Moves to Tier 0 with its name and its text. The fish traps become an ordinary work: they count as improved and can be pillaged. If you want it gone too, cut it. |
| 03 The Wild Orchards | Cut, with no merge. The work is retired. |
| 12 The Tended Country | Cut. Its place in Tier II goes to The Thermae (17). |
| 13 The Hedgerows | Cut. Its place goes to The Beacons (18). |
| 23 The Long Tending | Cut. Tier III then has 17 cards and 4 rares. |
| 27 The Garden of the World | Cut. Its place goes to The Water Boards (30). |
| 33 Bound to the Soil | Workers gain +1 charge. Farms gain +1 food. |
| 34 The Wildwood Compact | Cut. Tier II has five Doctrines. |
| 35 The Garden Peoples | Cut. Tier III has six Doctrines. |
| 36 Arcadia | Cut. Tier IV has six Doctrines. |
| Texts | The Local Census and The Domesday Survey lose "or tended". |
| What stays of the wild | The Old Songs, The Wild Marches, The Mountain Terraces, and the shared Sacred Groves and Garden Cities, as a terrain thread with no act card and no late card. |
| The deck | 73 cards and 21 Doctrines. The build is the smallest of the three. |

## Appendix B: the changes if you flesh it out

Under B tended land is a full theme. "Tended" is the quantity its cards read, the gate goes, and the theme gets a path through every tier. The other 26 changes stand as written.

| Change | Under option B |
|---|---|
| 01 The Gathering Grounds | As written: one charter, dealt in Tiers 0 and I, opens both works. |
| 03 The Wild Orchards | As written: cut, merged into 01. |
| A rule change | A tended hex counts for the cards that count improved hexes (The Rope Stretchers, The Ambarvalia, Commission: Break the Sod). Crop Rotation spares tended hexes. |
| New, Tier I, uncommon, scaler | Gains +1 culture each time you tend a tile. It does the job of Six Gardens as a grower. Near an existing shape. |
| 12 The Tended Country | No gate. Tended tiles gain +3 production. |
| 13 The Hedgerows | No gate. The text as it is today. |
| New, Tier II, common | A town working four tended tiles costs 1 less authority. |
| 23 The Long Tending | No gate, uncommon. The text as it is today. |
| New, Tier III, rare | A hex may hold a tended work and an improvement together. This is The Two Harvests in its first form. **New shape,** and the largest piece of engine work in the pass. |
| 27 The Garden of the World | No gate, uncommon. The text as it is today. |
| 33 to 36, the Doctrines | All four stay with their texts, and the gate goes from three of them. |
| The bots | They must learn to lay tended works before anything can be measured (a bot-track batch). |
| The deck | 80 cards and 24 Doctrines. Three new cards, two new shapes, and the bot work. |

## The user's first rulings (2026-11-20, comments on the page)

Page: https://claude.ai/artifact/6cD6W4ym5WeUdMvUWDXaYf. The user commented on
changes 05 to 36. Changes 01 to 04 and the five questions have no comment yet,
and they are **not ruled**. The comments approve every wild-land rework of
option C (12, 13, 23, 27, 34, 36), so option C is the working answer on tended
land, and the user asks for more tended works (33, 35).

| # | Card | The user's words | Result |
|---|---|---|---|
| 05 | The Burhs | "too strong, lets just cut" | Cut. |
| 06 | Tinkers' Guild | "lets keep this one, i think it's good for early game tempo, and extra build charges is one of the best bonuses in civ 6. I'm considering a pass where we make units more expensive, and this will be even more important after that change." | Kept as it is today. |
| 07 | The Land Hunger | "Rework: towns build settlers 50% faster." | Towns build settlers 50% faster. |
| 08 | Outposts | "Sure sounds good" | Approved. |
| 09 | The Road Towns | "great" | Approved. |
| 10 | The Gleaners | "lets remove this, doesn't feel good enough to slot." | Cut. |
| 11 | The Staked Claims | "sure" | Approved. |
| 12 | The Standing Woods | "sure" | Approved. |
| 13 | The Hedgerows | "sure" | Approved. |
| 14 | The Wide Country | "remove" | Cut. |
| 15 | The Great Colonies | "this is way too strong, i also don't think i've ever seen it in a game. lets make it a fifth of the citizens." | Tier II, rare: towns you found start with a fifth of the citizens of your largest town. |
| 16 | The Great Households | "let's rework: +1 production for every 2 citizens in a city." | Each town gains +1 production for every 2 citizens. (Rarity as proposed, common, unless the user says otherwise.) |
| 17 | The Thermae | "great" | Approved. |
| 18 | The Beacons | "great" | Approved. |
| 19 | The Seven Fat Years | "great" | Approved. |
| 20 | Tier II rarities | "sure" | Approved. |
| 21 | The Engineers' Yards | "great" | Approved. |
| 22 | The General Levy | "great" and "let's nerf slightly: every 2 turns." | Tier III, uncommon. At war, a town may do it every 2 turns. |
| 23 | The Long Tending | "great" | Approved. |
| 24 | The Polders | "great" | Approved. |
| 25 | The Mountain Terraces | "great" | Approved. |
| 26 | Tier III rarities | "sure" | Approved. |
| 27 | The Garden of the World | "great" | Approved. |
| 28 | The Keeps | "Sure" | Approved. |
| 29 | The Philosophers' Peaks | "sure" | Approved. |
| 30 | The Water Boards | "great" | Approved. |
| 31 | The Thousand Villages | "great" | Approved. |
| 32 | Tier IV rarities | "sure" | Approved. |
| 33 | Bound to the Soil | "for this to work, i think we need to make more unlockable tended tiles?" | **Open:** see below. |
| 34 | The Wildwood Compact | "sure" | Approved. |
| 35 | The Garden Peoples | "have this unlock a tended tile type too" | Approved, and it also opens a tended work. Which work: see below. |
| 36 | Arcadia | "great" | Cut, as proposed. |

The user then asked in chat: "do you think we need more tended improvement
draws for some of these cards to make sense?"

### Proposal in answer: more kinds of tended work, no more draws

- **The fault to avoid** is the one this pass found: a pay-off that waits for a
  card the seat is rarely dealt. So a new tended work never gets a card whose
  only job is to open it. It rides on a card that is good without it.
- **The need is real.** Under option C the two works are fish traps (coast and
  lake) and orchards (forest and jungle). A seat on grassland, plains, hills or
  desert has nothing to tend, so "tended" on a card means nothing there, and a
  wild hex of open ground still yields too little to work.
- **Proposed: four works on three cards.**
  1. The Gathering Grounds (01, the charter, Tiers 0 and I): fish traps and
     orchards, as proposed.
  2. Bound to the Soil (33, Doctrine, Tier I) also opens **root-crop grounds**
     on wild grassland and plains: +1 food and +1 production. This is the open
     ground's work, from the design doc's own list ("the murnong yam-daisy
     fields").
  3. The Garden Peoples (35, Doctrine, Tier III) also opens **terraced groves**
     on wild hills: +1 food and +1 culture. The user asked for a work on this
     card.
- A work stays what the design doc says: not an improvement, still wild,
  permanent, one worker charge, no resource opened.
- **Not proposed:** a work for desert, tundra or marsh (too few hexes), and
  burning (the design doc makes it a town's decision on a cycle, which is a
  new system).
- With these, every "tended" line has a hex to act on in most starts, a seat
  with only the charter can tend two terrains, and a seat that takes the
  Doctrines can keep whole towns wild.
