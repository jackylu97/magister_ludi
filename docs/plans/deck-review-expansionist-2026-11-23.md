# Expansionist deck review, 2026-11-23

This is a design review. It changes no data, no code and no test. No test, bot game or dev server was run for it. All power figures are arithmetic from the data files.

The user's questions for all the reviews (2026-11-23): "is the utility in the deck useful? Are there satisfying late game options for the current themes in the game? Could we design more synergy around the themes with other card combinations through _all_ decks and bonuses in the game?"

The user's words that touch this deck:
- Playtest note: "levy of the land is soooo good".
- On Dominion, and the same wish applies here: the deck "should also have a few late game options that feel a bit busted in the way magisterial works".
- On Dominion: "there should be maybe more payoff for spare authority in the deck".
- "I'm realizing the game has so many mechanics, i'd love to simplify wherever we can."

**How numbers are marked.**
- **(live)**: the number is in the data today.
- **(proposed)**: the number is a suggestion of this review.
- **(estimate)**: my arithmetic from live numbers, or a count I assumed. It was not measured.

**How proposals are marked.** Text change, existing shape, small extension, or new shape. The meanings are those of `docs/plans/deck-direction-review-2026-11-23.md`.

**Already settled, and assumed below:** The Water Boards moves from Tier IV to Tier III.

---

## The user's comments, 2026-11-24

The user commented on the review page (10 comments). **Where this section and the text below disagree, this section is right.** Nothing is built yet. These changes wait in the queue behind the playtest.

| # | Card or point | The user's words | Result |
|---|---|---|---|
| 1 | The five decisions | On decision 5: "yup keep", then "approved for all the above" | All five recommended readings are approved. The levy loop stays as a broken combo. The Imperial Roads with The Sovereign Writ stays. |
| 2 | The Megalopolis | "sure" | "Each town gains +2 science and +2 production for each citizen above ten." |
| 3 | The Missi Dominici (new, shared with Dominion) | "This should be stronger, lets make it +1 science and culture for every point of authority". On sharing it: "sure". | Build it, shared by Dominion and Expansionist: "Each of your towns gains +1 science and +1 culture for each point of spare authority." Reading: the user wrote "every point of authority", and the card reads spare authority, so the count is spare authority. To confirm. |
| 4 | The Missi Dominici, the engine | "it still seems pretty hard to get this engine going, lets leave it in for playtest with my revision, but might need another look. i don't think theres a lot of spare authority support by the time you get to age 2" | A note for after the playtest: look again at how a seat gains spare authority by age 2. |
| 5 | The Mother City | "cool" | "Your capital gains +1 production and +1 culture for each citizen in the towns joined to it by road." |
| 6 | Tinkers' Guild | "great cut" | Retired. |
| 7 | The Local Census, Provincial Councils | "cut" | Both retired. The comment is on the one row that holds both cards. To confirm that both go. |
| 8 | The Great Migration | "cut" | Retired. |
| 9 | The Theodosian Walls | "cut" | Retired. |

Also approved through "approved for all the above", since they are in the recommended list: The Water Boards moves to Tier III (settled before), and The Road Home is dealt in Tier 0 and Tier I.

---

## F. Summary

### Findings

1. **The deck is one machine with four parts, not four builds.** The land makes food. Public works make happiness. Roads and authority make towns. Citizens and levies turn food into production. Every part is paid by the same two counts: towns and citizens.
2. **A seat cannot seat all four parts, but it never has to choose one.** The tier-18 governments seat 8 chairs (live). The four parts hold more than 40 chair cards. The best council takes the two strongest cards of each part, and it pays about as much as a council of one part (about 1,640 against 1,550 in age 4, estimate). Nothing in the Orders pays for a few large towns against many small ones.
3. **Every part scales, and three of them pay more than the Magisterial work seat after its nerf.** A committed seat in age 4 pays about 900 to 2,000 a turn from one part (estimate). Six Magisterial works pay 216, and 576 with the full set. Two parts stop growing: the wide realm stops when the land is full, and public works stop at five or six in each town.
4. **Levy of the Land is a headline card in every age, and it is a common.** It pays 43 hammers for a citizen in a town of 6 and 156 in a town of 15 (live formula). One chair pays about 22 to 65 a turn in age 2 and 137 to 468 in age 4 (estimate). It keeps its size because its pay grows faster than the town does.
5. **The deck already has four broken combos. Three are live at Tier III.**
   - The Imperial Roads with The Sovereign Writ: about +100% production in every town (estimate).
   - Levy of the Land with The Mit'a: every levy is free after twenty turns. With The Corvée, one round of levies pays about 1,250 to 2,180 of the 2,534 hammers of the Magnum Opus (estimate).
   - The Age of Improvement on a stack of farm cards: about 1,900 a turn (estimate).
   - The Keeps (Tier IV): about 50 a turn for each town, with no chair (estimate from the design pass).
6. **Spare authority has eight suppliers in the deck and one Order that reads it.** That Order is a Tier III rare. Before it, any spare authority above 10 pays nothing (live ladder). Late in the game the land is full, so authority buys no new town and the supply cards go dead.
7. **Roads have only two makers.** A town is "joined" by The Road Home (Tier 0 only) or by a trader's land route. Six Orders, three Doctrines, two leaders and two legacies read joined towns. A seat that misses The Road Home in its first few drafts waits for traders.
8. **Most utility is useful.** Four cards are not: The Theodosian Walls, The Great Migration, The Mother City as written, and Tinkers' Guild beside the Doctrine Bound to the Soil. The Imperial Roads makes three of the deck's own authority cards dead.

### Recommended changes, in order

| # | Change | Size |
|---|---|---|
| 1 | The Water Boards moves to Tier III (settled). | Tier move |
| 2 | The Megalopolis pays for citizens above ten. It becomes the pay-off for large towns. | Small extension |
| 3 | New Tier II card, The Missi Dominici: science and culture in every town for each five points of spare authority. Shared with Dominion. | Existing shape |
| 4 | The Mother City: the capital gains production and culture for each citizen in the towns joined to it. | Existing shape |
| 5 | The Road Home is dealt in Tier 0 and Tier I. | Data only (`lastBand`) |

No change adds a mechanic, a button, a cap or a penalty. I propose no change to Levy of the Land.

### Decisions only you can make

1. **Should The Megalopolis pay for citizens above ten?** Recommended: yes. It is the smallest change that makes large towns a different plan from many towns. A typical wide seat gets less from it than today (section B).
2. **Do you want The Missi Dominici, and should Dominion share it?** Recommended: yes to both. It is the early reader of spare authority, and it answers your Dominion note with one card.
3. **May The Mother City change?** Recommended: yes. As written, this Tier IV rare pays less than The Book of Settlements, a Tier II uncommon.
4. **The levy loop (Levy of the Land, The Mit'a, the Doctrine Human Sacrifice, The Corvée): keep it as a broken combo?** Recommended: yes, and measure it. If it needs a cut, take it from Seasonal Levies or The Mit'a and leave Levy of the Land alone.
5. **The Imperial Roads with The Sovereign Writ: keep it?** Recommended: yes. It needs two rares. One thing to decide with it: The Imperial Roads cancels the drawback of the Doctrine The Mandarinate.

---

## The seats I used for the arithmetic

| | Age 2 | Age 3 | Age 4 | Source |
|---|---|---|---|---|
| Towns, typical / committed | 5 / 6 | 8 / 10 | 12 / 15 | power bar; committed is my assumption |
| Citizens in a town, typical / committed | 6 / 7 | 9 / 11 | 12 / 15 | estimate |
| Worked farms in a town, typical / committed | 2 / 3 | 3 / 5 | 4 / 6 | estimate |
| Other worked improvements in a town | 2 | 3 | 4 | estimate |
| Public works in a town, typical / committed | 2 / 2 | 3.5 / 4 | 5 / 6 | estimate |
| Towns joined to the capital, typical / committed | 3 / 5 | 6 / 9 | 10 / 14 | estimate |
| Production a turn, median seat | 48 | 107 | 476 | power bar |
| Production of one town | 10 | 15 | 35 | power bar |
| Seat yield a turn, median | 225 | 543 | 2,450 | power bar |
| Regular card of the band then dealt | 15 to 25 | 35 to 60 | 60 to 120 | power bar |
| Headline card | 40 to 50 | 100+ | 200+ | power bar |
| Magisterial after the nerf | 3 works: 48 | 5 works: about 130 | 6 works: 216, full set 576 | direction review, estimate |

"Typical" means a seat that holds the two to four plainest cards of a part. "Committed" means a seat that drafts the part and plays for it. The power bar was measured before the changes of November. Read every result as an order of magnitude.

**Authority (live rules, `rules.meters`).** The capital gives 6, each age gives 2, a Monument gives 1, the Imperial Throne gives 3 and 1 for every three towns. A founded town costs 3. Spare authority pays +10% production at 5 points and +20% at 10, and no more.

| Seat | Age 2 | Age 3 | Age 4 |
|---|---|---|---|
| Typical: a Monument in each town, the Imperial Throne, no cards (estimate) | supply 19, cost 12, spare 7 | 25, 21, spare 4 | 33, 33, spare 0 |
| Committed: add The Horrea, The Local Census and Provincial Councils (estimate) | 27, 5, spare 22 | 38, 9, spare 29 | 52, 14, spare 38 |
| The same with The Imperial Roads, and then with the Doctrine Empire Without End (estimate) | | | spare 52, then 67 |

With those three cards a new town costs 1 and brings a Monument, a Granary and a third of a point from the Throne. **So each new town adds about 1.3 authority.** In this deck spare authority grows with the number of towns. In every other deck it falls.

---

## A. Scaling

### A.1 The improved land

| Card (live text, shortened) | A farm gains | My assumption |
|---|---|---|
| Smallholdings (0): "Worked farms and pastures gain +1 food and +1 gold." | 2 | every farm |
| The Three Sisters (I): farms beside a plantation or pasture "+2 food and +2 production" | 4 | half the farms |
| Dark Earth (I): "Farms that have stood 20 turns gain +2 food." | 2 | all, from age 3 |
| The Hedgerows (II): farms beside a forest or jungle "+3 food" | 3 | half the farms |
| The Watercourses (II): "Irrigated farms gain +2 production." | 2 | half the farms |
| Commission: Break the Sod (I), reward: "farms gain +1 food" | 1 | every farm, no chair |
| Old Workings (III): "Mines, quarries and lumber mills gain +3 production." | 3 on each | the other improvements |
| The Age of Improvement (III, rare): "The bonuses your Orders give to improved tiles are doubled." | | |

- **Typical (estimate).** Age 2: 10 farms × 4 = 40. Age 3: 24 farms × 7 = 168. Age 4: 48 farms × 7 + 48 other improvements × 3 = 480, from four chairs.
- **Committed (estimate).** Age 2: 18 farms × 5 = 90. Age 3: 50 farms × 9.5 = 475. Age 4: 90 farms × 8.5 + 60 × 3 = 945 from the Orders, doubled by The Age of Improvement to 1,890, plus 90 from the commission: about 1,980 from seven chairs.
- **Two thirds of it is food.** Food is not production. The Breadbasket and the levies turn it into production one for one, so in this deck it nearly is.
- **Without a chair:** The Keeps (IV, rare, a charter). "A Keep gains the yields of every tile around it." The design pass of 2026-11-20 put one Keep at about 50. Fifteen Keeps: about 750 (estimate).
- **Doctrines on top:** Bound to the Soil (+2 a farm), The Georgics (+1 production on old improvements), The Physiocrats (Tier IV: "+2 food, +2 production and +2 gold" on every improved tile, about 900 on 150 tiles, estimate).
- **Against Magisterial:** level in age 2, above it in age 3, twice it in age 4, and three times the full set in a committed seat.

**Where it stops.** It does not stop. Its limits are worker charges, citizens to work the hexes, and chairs: six of the seven cards are Economic and the seventh needs a Wildcard chair. The tier-18 governments seat at most three Economic and two Wildcard chairs (live), so a seat holds four farm cards and the doubler until tier 26. On paper this is the strongest part of the deck. The Age of Improvement is the reason. Measure it before any other card of the deck.

### A.2 Citizens and levies

**Levy of the Land (Tier I and II, common):** "A town may spend a citizen for production equal to the food it took to grow. Once every five turns." The pay is `10 + 6s + s^1.65`, where `s` is the town's size less two (live, `levyHammers` in `src/sim/levies.ts`).

| Town size | 4 | 6 | 9 | 12 | 15 | 20 |
|---|---|---|---|---|---|---|
| One levy pays (live formula) | 25 | 43 | 76 | 114 | 156 | 235 |
| Turns of one town's production (estimate) | | 4.3 in age 2 | 5 in age 3 | 3.3 in age 4 | | |

| Levy of the Land, one chair (estimate) | Age 2 | Age 3 | Age 4 |
|---|---|---|---|
| Typical: each town levies once in ten turns | 5 × 43 ÷ 10 = 22 | 8 × 76 ÷ 10 = 61 | 12 × 114 ÷ 10 = 137 |
| Committed: each town levies once in five turns | 6 × 54 ÷ 5 = 65 | 10 × 101 ÷ 5 = 202 | 15 × 156 ÷ 5 = 468 |

**Why it is so good.**
- It is a headline card in every age. The Road Towns ("+4 production", Tier I) is 40% of a town's production in age 2 and 11% in age 4. One levy is three to five turns of the town's production in every age.
- Its pay grows faster than the town. A citizen of a town of 20 is worth 235 hammers. A citizen of a town of 6 is worth 43.
- It turns food into production one for one, and food is what the deck makes most.
- The player chooses the town and the turn. A levy can finish a building now.
- Happiness below 0 makes towns grow 75% slower (live). A levy then spends food that growth could not use, and the town asks for one happiness less.
- The cost is real: the citizen stops working a hex, and the town must regrow. A seat that cannot regrow in five turns is the "typical" row.

**What multiplies it (all live).**

| Card | Text | Effect on the loop |
|---|---|---|
| The Mit'a (III) | "A citizen spent on a levy returns to its town twenty turns later." | Every levy is free after twenty turns. It returns the citizen of any levy: a settler, a unit, the Opus. |
| Human Sacrifice (Doctrine II) | "Your towns may levy every two turns instead of every five." | 2.5 times the levies, if the towns have the citizens. |
| The Terraces of Moray (II) | "A levy also grants science equal to half its production." | +50%, in the yield the deck lacks. |
| Seasonal Levies (III, common) | "After a town levies a citizen, it gains +60% food for ten turns." | Always on in a town that levies. The regrowth is paid for. |
| Plenty (III, common) | "When a town grows, it gains production equal to five times its new population." | The regrowth of a town of 12 pays 60 more: half the levy again. |
| The Corvée (IV) | "Your towns may levy a citizen toward the Magnum Opus." | Every other town sends its levy to the Opus town. |

- **The Corvée (estimate).** The Opus costs 2,534 hammers (live). One round of levies sends 11 × 114 = 1,254 in a typical seat and 14 × 156 = 2,184 in a committed one. With The Mit'a the citizens come back. This is the deck's finisher, and it is as fast as Commerce buying the Opus with gold.
- **The other cards (estimate).** The Great Households (II): 36 in age 3, 72 in age 4, 112 committed. The Megalopolis (III, rare, "Towns of ten or more citizens gain +1 science and +1 production for each citizen."): 40 in age 3, 240 in age 4, 450 committed. The Thousand Villages (IV): 72, committed 112. Granary Levies (0): 9 to 45.
- **Typical (estimate):** 31, 127 and 517. **Committed:** 83, 534 and about 1,600 from seven chairs.
- **Against Magisterial:** below it in age 2, level in age 3, more than twice it in age 4.

**Is Levy of the Land too strong?** On paper, yes for a common: it passes the headline bar of its band in a committed seat in every age. I recommend no change. It is the card you like most, it asks for a choice each time, and its cost is real. If the loop needs a cut after it is measured, cut a rider: Seasonal Levies from 60% to 30% (proposed), or The Mit'a from twenty turns to thirty (proposed).

**One thing to watch: attention.** A levy is one order for each town. Fifteen towns at five turns is three orders a turn. With Human Sacrifice it is seven. That is close to a chore.

**Where it stops.** It does not stop. Happiness limits the citizens, and the levy is the part of the deck that works best when happiness is short.

### A.3 The wide realm: towns, roads and authority

| Card (live text, shortened) | Age 2 | Age 3 | Age 4 |
|---|---|---|---|
| The Founding Furrow (0): "culture equal to five times the number of towns you hold" on each founding | towns 2 to 6: 100 culture in all | town 10: 50 | |
| The Road Towns (I): joined towns "+4 production" | 12, committed 20 | 24, committed 36 | 40, committed 56 |
| Provincial Councils (II): joined towns "cost 1 less authority" | +3 authority | +6: two more towns | +10: three more towns |
| The Book of Settlements (II): "+3% production and gold for every town you have founded this game, at most +30%" | 12% × 67 = 8 | 21% × 154 = 32 | 30% × 774 = 232 |
| The Quitrents (III): "+1 gold for every two hexes you own" | | 100 gold | 150 gold, committed 225 |
| The Sovereign Writ (III, rare): "Spare authority's bonus has no ceiling." | | committed, spare 29: +30% above the cap, about 60 | committed, spare 38: +50% above the cap, about 350 |
| The Imperial Roads (III, rare): "Towns joined to your capital by road cost no authority." | | spare 38 | spare 52. With the Writ: +80% above the cap, about 560 |
| The Mother City (IV, rare): capital "+5% production and +5% culture for each town you have founded this game" | | | 14 towns: +70% of one town, about 110 |

- The Writ figures use 700 production for a committed seat in age 4 and 200 in age 3 (estimate). I did not check which stage the authority percentage joins.
- **Typical (estimate):** 15 in age 2, 56 in age 3 and 422 in age 4. In ages 2 and 3 the real pay is the two or three more towns that the authority cards allow. A town is worth about 45, 68 and 200 a turn.
- **Committed (estimate):** 37, 150 and about 970. With The Imperial Roads and the Doctrine Empire Without End the spare authority is 67, the Writ pays +130%, and the part pays about 1,390. The Doctrine The Mandarinate ("Each point of spare authority gives +1% science and culture, at most +30%.") adds about 280.

**Where it stops.** In three places.
- **Founding stops when the land is full,** in age 3 in most games. The settling theme has thirteen cards (the design pass's count), and most of them act only on a founding. This is the deck's stated cost (`docs/decks/deck-design.md`: "room: without land to claim, it stalls").
- **"Joined" is one for each town.** It cannot be pushed.
- **Spare authority above 10 pays nothing** unless The Sovereign Writ is seated. Late in the game authority buys no town, because there is no land. So the supply cards (The Horrea, The Local Census, Provincial Councils) pay nothing in the ages where the seat has the most of it.

### A.4 Public works

The public works are the Granary, Aqueduct, Watermill, Harbour, Public Bath and Cistern (live, `data/buildings.json`), and one leader's building. An inland town holds four or five.

| Card (live text, shortened) | Age 2 | Age 3 | Age 4 |
|---|---|---|---|
| The Aediles (I): "Gains +1 production and +1 culture each time you finish a public work." | 20 | 54 | 114, committed 184 |
| The Thermae (II): "Each public work gives its town +2 science." | 20 | 56 | 120, committed 180 |
| The Mansiones (II): joined towns "+2 culture for each public work" | | 42 | 100, committed 168 |
| Commission: Bread and Water (II), reward: "+1 food and +1 production" for each | | 56 | 120, committed 180 |
| The Water Boards (III after the move): "Your public works yield twice as much." | | | about 130, committed 195 |

- **Typical (estimate):** 40, 152 and 454. **Committed:** 48, 316 and about 900.
- The Water Boards doubles the buildings' own rows (about 11 to 13 a town). By my reading it does not double The Thermae or The Mansiones. The generic rare The Builders' Lodge ("Orders that add yields to buildings pay double.", Tier I) does that: +350 in a committed seat (estimate).
- The Doctrine The Hydraulic Empire (IV) is the real multiplier: "Worked tiles with fresh water gain +1 food and +1 production for each public work in their town." Six public works and six such hexes: 72 a town (estimate).
- **Against Magisterial:** level in ages 2 and 3, twice it in age 4.

**Where it stops.** At five or six public works in each town. The count grows only with the number of towns. Its second job is larger than its yield: public works are the deck's happiness (The Waterworks, the Doctrine The Curator of Waters, the shared The Temple Baths), and they supply engineer renown (the Watermill gives 2 a turn, the Public Bath 1, live).

### A.5 Thin threads

| Thread | Cards | Verdict |
|---|---|---|
| Mountains | The Highlands, The Mountain Terraces, The Mountain Sluices, The Philosophers' Peaks, two Doctrines, two shared cards | Depends on the map. It is the deck's stated source of science, so it stays. It stops at the number of mountains. |
| Engineers | A Court of Engineers, The Engineers' Yards, the stepwell's renown, two Doctrines | It works. A Manufactory with The Engineers' Yards is about 32 a turn, and 56 with The Age of Improvement (estimate). Public works supply the renown. |
| Coast | The Coast, The Harbour Cities, The Polders, fish traps | Two cards pay. About 80 in age 4 (estimate). Commerce owns the sea. **Could be cut.** |
| Desert and tundra | The Hard Country, The Desert and the Snow | 19% and 29% of starts have the ground (design pass). The Hard Country **could be cut**: the charter covers the same ground. |
| Hexes owned | The Quitrents, The Measure of the Land, the goal of The Domesday Survey | It pays gold, the weakest yield, and science with a cap. **Could be cut,** or left as plain glue. |
| The home army | The Woodland Bands, The Beacons, The Fyrd, The General Levy, The Theodosian Walls | One Military card in each tier. Their job is to fill the Military chair. They stay, except the last (section C). |
| Wonders | The Doctrines The Builder Kings and The Cathedral Lodges | Both pay toward wonders. Your ruling of 2026-10-20 took wonders out of this deck. The wonder halves **could be cut.** |

### A.6 The parts together

| Part | Age 2 typical | Age 3 typical | Age 4 typical | Age 4 committed | Stops growing |
|---|---|---|---|---|---|
| The improved land | 40 | 168 | 480 | about 1,980 | No |
| Citizens and levies | 31 | 127 | 517 | about 1,600 | No |
| The wide realm | 15, and more towns | 56, and more towns | 422 | 970 to 1,390 | Yes: land, joined towns, the ladder of 10 |
| Public works | 40 | 152 | 454 | about 900 | Yes: five or six in each town |
| Magisterial after the nerf | 48 | about 130 | 216 | 576 | No |

All figures are estimates of yield a turn. A seat holds one part and a half of this, not all four (section B). Expansionist is level with Magisterial in age 2 and stronger from age 3. That fits the deck's picture: "strongest in the middle game, once its land is claimed". It may be too strong in age 4. The land and the levies are the two to measure.

---

## B. Do the parts compete?

**Can a seat take all of them? No, by the chairs.**

| Government tier (live) | Chairs | Most Economic | Civic | Wildcard |
|---|---|---|---|---|
| 4 | 5 | 2 | 1 or 2 | 1 |
| 10 | 6 | 3 | 1 to 3 | 1 |
| 18 | 8 | 3 | 1 to 3 | 2 |
| 26 | 11 | 4 | 2 to 4 | 3 |

- The deck has 46 Economic cards of 82 (live). Eight are charters and need no chair.
- At tier 18 a seat holds at most five Economic cards, with the Wildcard chairs. The land needs six and a Wildcard chair for its doubler. The levies need five.

**Does a seat have to choose a part? No.** Two councils of eight chairs in age 4, committed seat (estimate):

| Council | Chairs | Pays |
|---|---|---|
| One part: The Age of Improvement, Smallholdings, The Three Sisters, Dark Earth, Old Workings, The Makers of Land, The Cadastre, one Military | 8 | about 1,550 |
| The best of each: Levy of the Land, The Mit'a, Smallholdings, The Three Sisters, The Age of Improvement, The Megalopolis, The Imperial Roads, one Military | 8 | about 1,640, and more towns |

- The skill's check is "themes beat a pile". Here the pile is level with the theme.
- The reason is finding 1. Every card counts towns, citizens or improved hexes, and one seat raises all three at once. The parts also feed each other: food makes citizens, citizens work the land and pay the levies, and roads lower the price of the next town.
- The Doctrines do ask for a choice (Synoecism, The Commanderies, The Planted Towns, Crop Rotation). The Orders do not.
- This is not all bad. The deck's variety comes from the map, and the terrain cards do that job. But two Expansionist seats on like maps end with the same council.

**The one quantity that can pull two plans apart is the size of a town.**
- Happiness is one budget for the whole empire: each citizen asks for 1 (live). So 150 citizens can live in fifteen towns of 10 or in eight towns of 19.
- Cards that pay for each town favour the first: authority, roads, public works, founding.
- Cards that pay for size above a line favour the second. The deck has one that matters, The Megalopolis, and its line is 10. A typical town passes 10 in age 4, so the card pays every seat.
- The levy already leans the same way: a citizen of a large town is worth more.

### B.1 The Megalopolis (revision)

| Field | |
|---|---|
| Name | The Megalopolis (live card) |
| Band, rarity | Tier III, rare |
| Text | "Each town gains +2 science and +2 production for each citizen above ten." (proposed) |
| Age goal | Age 3: the step where a seat grows tall or wide. |
| Theme and role | Citizens: multiply. It is the pay-off for large towns. |
| Role | Build-defining. Floor: 8 in a town of 12. Ceiling: 48 in a town of 22. |
| Councils | The tall council: The Megalopolis, Levy of the Land, The Grain Dole, The Breadbasket, The Great Households. |
| Attention | None new. The player already chooses where to settle and when to stop founding. |
| Power | Today: 15 towns of 10 pay 300, and 8 towns of 19 pay 304. Proposed: 15 towns of 10 pay 0, 12 towns of 12 pay 96, 8 towns of 19 pay 288, and 8 towns of 22 pay 384 (estimate). Tier III headline: 200+. |
| Synergy | Raises: nothing. Reads: citizens in one town. Raisers at or before Tier III: The Patient Harvest, The Seed Grain, The Seven Fat Years, Sweet Water and every farm card, The Grain Dole, The Waterworks, Synoecism. Outside the deck: The Hanging Gardens, The Queen of Cities and The Round City (Scientific), The Imarets (Devotion). |
| Displaces | A plain "for each citizen" card. |
| Condition or drawback | The line of ten. A wide seat of small towns gets little, and takes The Great Households in its place. |
| Shape | **Small extension.** The count `population` needs a floor to count above. The scope `populationAtLeast` exists. |
| Type | Civic |

**What it costs.** A typical seat of twelve towns of 12 gets 96 where it gets 288 today. That is the point of the change, and it is why this is decision 1. The other option is to leave the card and accept that tall and wide are one plan in this deck.

**Why not a penalty.** No card loses pay when the seat founds a town. The same happiness simply buys one or the other.

---

## C. Utility

"Chair" means worth a chair in its tier. "Pick" means worth a draft pick. A charter and a boon need no chair.

| Card | Tier | Live text | Verdict |
|---|---|---|---|
| The Road Home | 0 | Each town you found is joined to your nearest town by road. | Chair, and worth more than it looks. It is one of the two makers of roads. It joins only towns founded while it is seated, and it is dealt in Tier 0 only. See change 5. |
| The Seed Grain | 0 | Towns you found start with one extra citizen. | Chair while founding. Swap it out after. |
| The Founding Furrow | 0 | Founding a town grants culture equal to five times the number of towns you hold. | Chair in age 1. 100 culture over five foundings, when a seat makes 3 a turn. |
| The Woodland Bands | 0 | Your units ignore the movement cost of forest, jungle and hills. | Pick only for the first 30 turns. Settlers and scouts move faster. No value later. |
| The Patient Harvest | 0, rare | Towns keep 30% of their food when they grow. | Chair all game. It halves the cost of a levy with a Granary. |
| The Land Hunger | I | Towns build settlers 50% faster. | Chair for the founding rush only. It saves about 15 hammers a settler. Weak. |
| The Staked Claims | I, rare | Each town you found claims every unowned hex within two hexes of it. | Chair while founding. Eighteen hexes for each town at once. |
| Outposts | I, charter | Workers may plant an outpost on an unowned hex within three hexes of your border. | Pick. It takes a resource or blocks a rival for one worker charge. |
| Tinkers' Guild | I | Workers gain +1 charge. | Weak chair. A worker is cheap. **Dead beside the Doctrine Bound to the Soil,** which gives the same charge and more. |
| The Local Census, Provincial Councils | I, II | A town costs 1 less authority (four improved tiles; joined by road). | Chair while authority binds. Each is worth two or three towns. **Dead once The Imperial Roads is seated.** |
| The Beacons | I and II | Your units gain +1 movement inside your borders. | Chair in the Military chair. Workers and settlers gain it too. |
| The Breadbasket | II | A town told to stop growing adds its food surplus to its production. | Chair when happiness is short. It is the levy with no orders: about 15 to 20 production a town (estimate). |
| The Grain Dole, The Waterworks | II | +4 happiness in towns of 10; Aqueducts +3 happiness. | Chair when happiness is below 0. Each is three or four more citizens in a town. |
| The Colonists | II | Towns of at least six citizens may spend a citizen to raise a settler. | Chair while there is land. With The Mit'a the citizen returns. |
| The Great Colonies | II, rare | Towns you found start with a fourth of the citizens of your largest town. | Chair only when founding late. It needs land in age 3, which few seats have. |
| Veteran Colonies | II | A military unit in one of your towns may retire. The town gains a citizen. | Seldom a chair. One loop to watch: raise a unit by levy in a small town, retire it in a large town, and levy there for three times the hammers. |
| The Seven Fat Years | II, boon | On draft: each of your towns gains a citizen. | Pick. Eight citizens are about 600 food in age 3 (estimate). It registers. |
| The Fyrd | II | Military units gain +1 strength in your territory for every 2 yields on their tile, up to +6. | Chair when attacked. On a carded farm it is +6, the strong line of its tier. |
| The General Levy | III | Your towns may spend a citizen to raise a melee unit. At war, every 2 turns. | Chair at war. A unit costs 81 to 340 hammers then. It is the deck's safety net. |
| A Court of Engineers | III | Gain +50% renown, but great-person offers contain only great engineers. | Chair in a seat with The Engineers' Yards, or for the Opus. No value alone. |
| The Freedom of the City | III | The first time a town reaches 15 citizens, it gains production equal to forty times its population. | Chair in a tall seat. 600 hammers for each town, once. |
| The Corvée, The Imperial Highways | IV | Levy toward the Opus; +3% toward the Opus for each joined town. | Chair for the Opus. The Corvée is the stronger one. |
| The Great Migration | IV, rare | Every ten turns, each foreign town near your border loses a citizen to your nearest happier town. | **Almost no one takes it.** Two to four citizens in ten turns (estimate). The player cannot see it work. |
| The Mother City | IV, rare | Your capital gains +5% production and +5% culture for each town you have founded this game. | **Weak for a rare.** About 110 in one town (estimate). See D.2. |
| The Theodosian Walls | IV | Your towns gain +1 defence for every two citizens. | **No one takes it.** The generic City Watches gives +8 a tier earlier. Its only job is the Military chair. |
| The charters | 0 to IV | The Gathering Grounds, The Totem Poles, The Stepwells, The Barays, The Polders, The Keeps | Pick, where the ground exists. The Stepwells and The Barays also feed the farm cards. The Keeps is the best pick of Tier IV. |

**Summary.** The founding cards are real choices in age 1, when a seat has three chairs. The safety nets work (The General Levy, The Fyrd, The Breadbasket, the happiness cards). The weak ones are named in finding 8. One Doctrine and one rare make cards of the same deck dead. That is acceptable, but the player should not be offered the dead card afterwards.

---

## D. Late game

### D.0 What each part has at Tier III and Tier IV

| Part | Tier III | Tier IV | Satisfying? |
|---|---|---|---|
| The improved land | The Age of Improvement, Old Workings, The Cadastre, The Barays, the Doctrine Crop Rotation | The Keeps, The Domesday Survey, the Doctrine The Physiocrats | Yes. It has a doubler and a rule-breaker. |
| Citizens and levies | The Megalopolis, The Mit'a, Seasonal Levies, Plenty, The Freedom of the City | The Corvée, The Thousand Villages | Yes. The Mit'a and The Corvée break rules. |
| The wide realm | The Imperial Roads, The Sovereign Writ, The Quitrents | The Mother City, The Imperial Highways, the Doctrines The Mandarinate and The Inward Roads | Partly. Its two rares are a broken combo, but nothing reads spare authority before them, and its Tier IV rare is weak. |
| Public works | The Water Boards (after the move), The Mill Wheels | the Doctrine The Hydraulic Empire | Enough. Its count cannot be pushed, so I propose no late card for it. |

The two proposals are for the wide realm.

### D.1 The Missi Dominici (new)

| Field | |
|---|---|
| Name | The Missi Dominici: Charlemagne's envoys, sent in pairs to see that each county obeyed. No collision in `data/` or `docs/`. |
| Band, rarity | Tier II, uncommon |
| Text | "Each of your towns gains +1 science and +1 culture for every five points of spare authority." (proposed) |
| Age goal | Age 2 and age 3: authority starts to bind. The card pays a seat for staying above the line. |
| Theme and role | The wide realm: widen. It pays science and culture, which the deck lacks. It fills the gap "eight suppliers of authority, one reader". |
| Role | Pay-off. Floor: 10 in a typical seat of age 2, and nothing at spare 4. Ceiling below. |
| Councils | The wide council: The Horrea, Provincial Councils, The Missi Dominici, then The Imperial Roads and The Sovereign Writ. |
| Attention | One choice the player already makes: found the next town now, or keep five points spare. The meter is on screen. Nothing to track. |
| Power | Committed (estimate): age 2, spare 22, six towns: 4 × 2 × 6 = 48. Age 3, spare 29, ten towns: 100. Age 4, spare 38, fifteen towns: 210. With The Imperial Roads: spare 52, 300. With Empire Without End: spare 67, 390. Tier II regular: 35 to 60. Tier III headline: 200+. |
| Synergy | Raises: nothing. Reads: spare authority, towns. Suppliers at or before Tier II in a two-deck pool: The Horrea, The Local Census, Provincial Councils, the Doctrines The Commanderies and The Highland Clans, The Founders' Rights and Local Clerks (generic), Tyranny, Monuments. In Dominion: The Pacified Marches, Hegemony, The Universal Monarchy. More than three. |
| Displaces | A flat science card of Tier II (The Thermae, The Highlands). |
| Condition or drawback | Spare authority. A seat at the line gets nothing. The steps of five are the game's own steps (+10% production at 5 and at 10). |
| Shape | **Existing shape.** `pays`, `where: city`, `basis: count`, `count: authoritySurplus`, `per: 5`. The Capitolia pays every town from an empire count in the same way, and The Two Swords uses `per` on this count. |
| Type | Civic |

- **Why it is a broken combo late.** Section "The seats" shows that each new town adds authority in a committed seat. So the card pays towns × authority, and both grow together. With the two rares it is 390 from an uncommon.
- **Why share it with Dominion.** The Dominion review found that the deck supplies spare authority (Hegemony, The Universal Monarchy) and reads it nowhere, and you asked for a pay-off. A conqueror with the Doctrine holds 20 to 50 spare (estimate). The two decks share no card above Tier I today except The Hillforts.
- **It agrees with the Devotion review,** which proposes The Patriarchate for the holy city. That card pays one town. This one pays every town in steps.

### D.2 The Mother City (revision)

| Field | |
|---|---|
| Name | The Mother City (live card) |
| Band, rarity | Tier IV, rare |
| Text | "Your capital gains +1 production and +1 culture for each citizen in the towns joined to it by road." (proposed) |
| Age goal | Age 4: decide the game. The capital raises the Opus. |
| Theme and role | The wide realm: multiply. It joins roads, citizens and the capital. |
| Role | Build-defining. Floor: nothing without joined towns. Ceiling below. |
| Councils | The late wide council, as the capstone, beside The Imperial Highways. |
| Attention | None new. The player keeps the towns joined, as five other cards already ask. |
| Power | Typical age 4 (estimate): ten joined towns of 12: +120 and +120. Committed: fourteen towns of 15: +210 and +210. The live text pays about 110. Tier IV headline: 200+. |
| Synergy | Raises: the capital's flat production, which every capital percentage then multiplies. Reads: joined towns, citizens. Capital multipliers that exist: the Doctrine All Roads Lead to Rome (+45% production in the capital), The Summer Palace ("Cards that pay your capital pay 50% more.", generic): 630 with it. The Doctrine The Two Capitals (Scientific). The Grand Design and The Imperial Highways pay the same town for the Opus. |
| Displaces | The Thousand Villages, or a Tier III flat. |
| Condition or drawback | Roads. An unjoined town pays nothing. |
| Shape | **Existing shape.** `pays`, `where: capital`, `count: population` with `admits: connected`. The field `admits` narrows `population` since Commerce batch T3. |
| Type | Civic |

- It is the twin of the Dominion review's change to The Tributary Kings (the capital gains for each citizen in captured towns). Dominion feeds its capital from conquered towns, and Expansionist from joined ones.
- "Towns founded this game" keeps one reader, The Book of Settlements.

### D.3 The broken combos the deck has today, left alone on purpose

| Combo | Cards | Tier | What it does (estimate) |
|---|---|---|---|
| Towns that cost nothing | The Imperial Roads, The Sovereign Writ, The Horrea | III, two rares | Spare 52 or more: +100% production in every town. |
| The free levy | Levy of the Land, The Mit'a, the Doctrine Human Sacrifice, The Corvée | I to IV | A levy every two turns that costs nothing after twenty turns. Most of the Opus in one round. |
| The doubled fields | The Age of Improvement on five farm cards | III, rare | About 19 a farm on 90 farms. It also doubles the improved-tile Orders of other decks (section E). |
| The Keeps | one charter | IV, rare | Fifteen hexes of about 50 with no chair. |

One rule to decide with the first combo: The Imperial Roads sets the price of a joined town to nothing, so the Doctrine The Mandarinate ("Each of your towns costs 1 more authority.") loses its drawback. I would keep it. Two cards that cancel a drawback are a reward for commitment (your ruling of 2026-10-16 on Doctrines).

### D.4 What the two proposals open

- **Authority as a build from Tier II.** Supply cards, then The Missi Dominici, then the two rares.
- **All roads lead to the capital.** The Road Home or traders, then joined towns, then The Mother City and the Opus cards.
- **Tall against wide** (with B.1): The Megalopolis and the levy pay the tall seat. The Missi Dominici, the roads and public works pay the wide seat.

---

## E. Synergy across the whole game

### E.1 What outside the deck touches each quantity (all live)

| Quantity or moment | Other decks and shared cards | Generic cards, governments | Leaders | Wonders, beliefs, legacies, luxuries |
|---|---|---|---|---|
| **Improved tiles, farms** | Commerce: The Emporia, The Dye Works, The Estate Lands, The Latifundia, The Provision Trade. Devotion: The Ambarvalia, Temple Estates, The Megaliths, the Rite of Hallowing. Scientific: the Glasshouse (+1 science for each farm), the smelter, the qanat. Dominion: The Mesta, The Horse Herds, The Hillforts. Magisterial: Garden Cities, The Sculpted Landscape | The Home Fields, First Fruits Feasts, The Gilded Country. The Estates: Economic cards pay 30% more | Pachacuti (farms beside mountains), Nezahualcoyotl (farms in Aqueduct towns), Jayavarman (freshwater farms), Mithridates (plantations and camps) | The Hanging Gardens, The Pyramids (+1 worker charge), Angkor Wat. Harvest Blessing (+1 food a farm). Legacies: Li Bing, Jang Yeong-sil, Zheng Guo, Lu Ban, and eight for mines, quarries and mills |
| **Citizens** | Commerce: Market Day, The Market Halls, The Grain Barges. Devotion: The Royal Cult, The Deaconries, The Psalter, three rites. Scientific: The Journeymen, The Round City, The Queen of Cities. Dominion: The Sutlers, Examinations of State | The Threshing Floor, The Land Register, The Liturgies, The Master Plan, The Grand Design. Republic, Council of Elders | Jayavarman, Nezahualcoyotl, Sejong, Qin Shi Huang | Ancestor Worship, Choirs, Tithe Houses, Common Table, the Wat, the Gurdwara. Hippocrates, Omar Khayyam |
| **A town grows** (Granary Levies, Plenty, The Grain Census) | none | none | none | none |
| **A levy** | Dominion: The Muster of the Fields, the Doctrines The Citizen Phalanx and The Landsturm. Magisterial: The Friends of Khufu. A levied unit is "a unit gained" for every Dominion card that reads one | none | Alexander: science for each unit gained | The Pyramid of the Sun (a levy for faith) |
| **A town founded** | The Heralds (Magisterial), The Parishes (Devotion), The Founders' Stores, The Founders' Schools, The Hearth Fire, The Frontier Militia, The Ver Sacrum. Faith or gold buys settlers (Consecrated Labor, The Apoikia) | The Founders' Rights, The Wagon Trains | Cyrus: a Worker | Oracle of the Crossroads |
| **Joined towns, roads** | Commerce: The Wayside Inns, Market Gardens, The Turnpike Trusts, and every domestic route lays a road. Dominion: the Doctrine The Consular Roads. Magisterial: Garden Provinces | none | Pachacuti, Cyrus | The Public Bath (+1 happiness when joined). Legacies: Gyōki, Guo Shoujing |
| **Authority supplied** | Commerce: The Market Writ. Dominion: The Pacified Marches, Hegemony, The Universal Monarchy. Devotion: The Holy Inquisition, The Caliphate, Commission: The State Church. Magisterial: The Nomarchs | The Founders' Rights, Local Clerks. Tyranny (+5) | none | The Forbidden City (+5), The Walls of Uruk, The Terracotta Army. Inquisition, the Mosque. Legacies: Solon, Chanakya, Ibn Khaldun, Gracia Mendes Nasi, Lü Buwei, Ptahhotep |
| **Spare authority read** | Devotion: The Two Swords, The Commander of the Faithful, Commission: The Anointing. Magisterial: The Nomarchs | none | none | Legacies: Ibn Khaldun (+2 science a point), Gracia Mendes Nasi (+1 happiness a point) |
| **Public works** | Scientific: The Curators of Works, The Surveyors' Charter. Devotion: The Temple Baths, The Tithe Barns. Commerce: The Grain Banks, The Free Ports | The Builders' Lodge (doubles), Cistern Works, The Brick Kilns, The Building Programme | Jayavarman | Keeper of the Hearth. Legacies: Vitruvius, Kushim |
| **Mountains** | The Mountain Observatories, The Holy Spring, The Cliff Monasteries | none | Pachacuti | Machu Picchu, Star Readers. Legacies: Senenmut, Pushyagupta, Tycho Brahe |
| **Hexes owned** | Commerce: Land Speculation. Magisterial: The Landmark Bounds. Dominion: The Barbarian Frontier | none | none | the rite Consecration of the Bounds |

### E.2 What this shows

- **The land and the citizens are the best connected quantities in the game.** Every deck and five leaders touch them.
- **Three cross-deck combos are live, and nobody has named them.**
  - **The Age of Improvement doubles any deck's Orders on improved tiles,** by my reading of `yieldAmplifierReads`. With Dominion's The Mesta ("+4 food, +4 production, +4 gold" on pastures and camps) a pasture gains 24. With Commerce's The Emporia and The Dye Works an improved luxury gains 8.
  - **A levied unit is a unit gained.** The General Levy at war gives a unit every two turns from each town. Each one fires Dominion's unit cards and Alexander's science, and The Mit'a returns the citizen.
  - **Public works with The Builders' Lodge and the Scientific and Devotion cards.** One public work then gives about +4 science, +4 culture and +4 faith (estimate, from my reading of which lines the Lodge doubles).
- **Gaps.**
  1. **Spare authority.** Dominion and Commerce supply it and read it nowhere. Expansionist reads it in one rare. D.1 is the fix.
  2. **Roads.** Six Orders and three Doctrines read joined towns, and only one card makes a road. A seat with Commerce has domestic routes. Other seats depend on The Road Home in the first few drafts.
  3. **A town grows.** Three cards of this deck read the moment, and nothing outside it does. That is acceptable: the moment comes by itself in every seat.
  4. **A levy has no reader outside the deck.** That is acceptable too. Its bridge is the unit it makes.
  5. **Wonders.** The wonder review asks whether each deck should read wonders held. For this deck I say no: your ruling took wonders out of it.

### E.3 Proposed connections

Two only, and both read general quantities.

1. **The Missi Dominici is a shared Dominion and Expansionist card** (D.1). One card gives both decks a reader of spare authority.
2. **The Road Home is dealt in Tier 0 and Tier I** (data only: `lastBand: 1`, as The Gathering Grounds has). A seat can then draw it in the first ten drafts, not only the first four. The roads part then has a way in for every partner deck.

I propose no new count, keyword or mechanic.

---

## G. What I could not verify

- **Every count in section A.** Farms, public works, joined towns, town sizes and levy rates for the typical and committed seats are my assumptions. No bot game was run. The power bar predates the changes of November.
- **Whether a typical seat can regrow a citizen in five turns.** The power bar's food figure does not say whether it is before or after the citizens eat.
- **Authority for each age.** I read `perAge: 2` as 2 for each age reached, the first included.
- **Which stage the authority percentage joins,** and the production of a committed Expansionist seat (I used 700 in age 4). The Sovereign Writ figures depend on both.
- **The Water Boards.** My reading of `buildingYieldPercent` is that it doubles a building's own row and not a card that counts public works.
- **The Age of Improvement.** I did not test that it doubles other decks' Orders, a commission's lasting reward, or the hexes a Keep copies. I read that it skips Doctrines.
- **The Mit'a with every kind of levy.** `scheduleReturn` is called in `levyAt` for every use by my reading. I did not test a settler or an Opus levy.
- **Seasonal Levies.** I did not check whether a second levy restarts the ten turns.
- **Food kept on growth.** The Patient Harvest (30%), the Granary (20%) and the belief Common Table (25%) may add to 75%. I did not check for a cap.
- **The Keep's 50** is the design pass's figure, not mine.
- **Roads.** I read `layRoad` and found two callers: the founding rider and a trader on a land route. I did not check how many towns a bot or a player joins in practice.
- **The Veteran Colonies loop.** I did not test whether a unit raised by a levy may retire in another town.
- **The Megalopolis shape.** I found no field for "count above a line" on `population`, so I marked it a small extension.
- **The Missi Dominici shape.** `authoritySurplus` answers nothing while the meter is being folded (the stated cut in `statecraftData.ts`). A row that pays science and culture should be safe. To check in the build.
- **Chair types.** The Missi Dominici and The Megalopolis are Civic. The tier-18 governments seat one to three Civic chairs, so a wide council may need Divine Mandate or Wildcard chairs.
- **Bots.** Astra needs values for a count of citizens above ten and for spare authority paid in every town. I did not read `src/ai/`.
