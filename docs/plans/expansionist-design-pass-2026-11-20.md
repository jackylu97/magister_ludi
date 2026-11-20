# Expansionist design pass (2026-11-20)

**Status, 2026-11-20, fourth round:** your ruling for round four is applied. Wild and tended land leave the deck. Of the 44 changes of rounds one to three, 20 stand approved, 4 carry your own text, 5 are cut, 1 is kept as it is today, 2 are revised by your ruling and 12 are withdrawn. Nothing is built, and no game data changed. **What waits for your fourth review:** 14 new changes (45 to 58). They are all in section 1.

Your request, 2026-11-20, in your words:

> *"ok, could you do a deck pass on commerce and expansionist. I find that i don't really take any of the tended land cards in this version of the game, and commerce feels a bit one-note. I'm not sure whether to drop the tended land theme altogether or make it more fleshed out, what do you think?"*

- This file is the current state. The record of rounds one to three, with your words, is at the foot.
- Your ruling for round four, in your words: *"i like the idea of adding new improvements where previously improvements couldn't be built. i.e. fish traps allows you to build improvements on coast tiles where you couldn't previously. keeps are very fun because they're a new way to interact with the land. let's add a few more of these, and get rid of cards like old song."*
- *"public works, levies, settling and roads are great directions. i agree with your auxiliary themes too. The frontier seems weaker to me. Lets do a fourth pass with these directions, try to add a few that make the auxiliary directions synergize with the deck at large."*
- Every number is a first guess against the power bar, to tune in playtest. I ran no bot games and no tests. I counted the ground around 48 starts on 8 standard maps, and over the whole of those maps.
- The review page: https://claude.ai/artifact/6cD6W4ym5WeUdMvUWDXaYf. Its anchors are `change-01` to `change-58` and `r4-1` to `r4-9`.

## 1. New for your fourth review

Only these blocks and changes 45 to 58 are not ruled. Everything else in this file is ruled.

### r4-1. Wild and tended land leave the deck (change 45)

- No third state of land. A hex is improved or it is not, and no card pays a hex for having no improvement.
- The works that a card opens are ordinary improvements. They count as improved for every card, belief, great person, wonder and leader.

**What happens to each card**

| Card | Where it stood | Round four |
|---|---|---|
| The Old Songs (Tier I) | change 38, approved: +2 culture on worked wild forest, jungle and hills | **Cut.** |
| The Tended Country (Tier II) | change 12, approved as The Standing Woods: +3 production on worked wild woods | **Cut.** |
| The Long Tending (Tier III) | change 23, approved: doubles what Orders pay on wild hexes | **Cut.** |
| The Garden of the World (Tier IV) | change 27, approved: yields on every worked wild hex | **Cut.** |
| The Wildwood Compact (Doctrine, Tier II) | changes 34 and 44 | **Cut.** Tier II has five Doctrines. |
| The Garden Peoples (Doctrine, Tier III) | change 35, with hill groves | **Cut.** Tier III has six Doctrines. |
| Arcadia (Doctrine, Tier IV) | change 36, cut in round one | Stays cut. |
| The Wild Marches (Tier I) | +1 culture for every four wild hexes you own | **Reworked:** +1 culture for every five hexes you own. |
| Bound to the Soil (Doctrine, Tier I) | change 33: farms and tended tiles +1 food; root-crop grounds | **Reworked:** Workers gain +1 charge. Farms gain +1 food. |
| The Gathering Grounds (Tiers 0 and I) | change 01: workers may tend wild land | **Reworded:** Workers may build fish traps on coast and lake tiles and orchards in forest and jungle. Both are ordinary improvements. |
| Outposts (Tier I) | change 08: "on a wild tile near your border" | **Reworded:** on an unowned hex within three hexes of your border. |
| The Domesday Survey (Tier IV) | "improved or tended tiles", twice | **Reworded:** improved tiles. |
| The Hedgerows (Tier II) | change 13, approved: farms beside a forest or jungle gain +3 food | **Stays.** It reads farms and woods, and no wild land. |
| Sacred Groves (Tier 0, shared with Devotion) | worked, unimproved forests gain +1 food and +1 faith | **Reworked:** Worked forests gain +1 food and +1 faith. The Devotion sheet changes with it. |
| Garden Cities (Tier I, shared with Magisterial) | +1 culture for every three wild tiles a Monument town works | **Reworked:** +1 culture for every three improved tiles a Monument town works. The Magisterial sheet changes with it. |
| Root-crop grounds, hill groves | two tended works, approved in round two | **Withdrawn.** They were works for wild land. |
| Changes 39 to 44 | new in round three, never ruled | **Withdrawn.** |

- No card of the other four decks reads wild or tended land. Outside the decks one source does: the belief Spirits of the Wood (unimproved forest and jungle). It stops paying on a forest with an orchard. The beliefs sheet should decide if it reads "forest and jungle" instead.
- Crop Rotation stays. Its price (a hex with no improvement yields nothing) is easier to pay now, because fish traps improve open water.
- In the code, the mark `tended` comes off the rows `fishTraps` and `wildOrchard`, so both count as improved and can be pillaged. The gate `needsTendedWork` is then on no row. The tests `tended` and `unimproved` stay for Crop Rotation and for old saves.
- `docs/decks/deck-design.md` has a section "Tended land" and a bonus theme of the same name. Both become history when the build lands.
- What the deck loses in yields is culture: The Old Songs and The Garden of the World paid it. Changes 49, 54 and the reworked The Wild Marches bring culture back from the new theme, from roads and from land owned.
- **To rule:** Approve the group, or name the rows you want changed. The two shared cards change the Devotion and Magisterial sheets.

### r4-2. The land theme: improvements where none could be built

- Each card of the theme is a charter: it takes a pick and no chair, and it opens a work for your workers. You approved that rule in round one.
- Five of the nine improvements are approved from the earlier rounds: fish traps, orchards, outposts, polders and keeps. Four are new. Three follow your directions: the date garden (desert only), the reindeer corral (tundra only) and the hammer pond (beside a combination of terrains). The baray is my own.

**The improvements a card opens**

| Improvement | Where a worker may build it | Yield | It counts as | The card that opens it | State |
|---|---|---|---|---|---|
| Fish traps | coast and lake | +1 food, +1 production | its own kind | The Gathering Grounds, charter, Tiers 0 and I | approved (01) |
| Orchard | forest and jungle | +1 food, +1 gold | its own kind | The Gathering Grounds | approved (01) |
| Outpost | an unowned hex within three hexes of your border | none; it claims its hex and the ring around it | its own kind | Outposts, charter, Tier I | approved (08) |
| **Date garden** | desert | +2 food, +1 gold | its own kind | The Desert and the Snow, charter, Tier I | **new (46)** |
| **Reindeer corral** | tundra and snow | +1 food, +2 production | its own kind | The Desert and the Snow | **new (46)** |
| **Hammer pond** | a hill beside a river | +3 production | a mine | The Hammer Ponds, charter, Tier II | **new (47)** |
| **Baray** | flat land, one in each town | +2 food; the hexes beside it have fresh water | its own kind | The Barays, charter, Tier III | **new (48)** |
| Polder | a coast hex beside three of your land hexes | as a farm on grassland | a farm | The Polders, charter, Tier III | approved (24) |
| Keep | flat land, one in each town | the yields of the six hexes around it | its own kind | The Keeps, charter, Tier IV | approved (28) |

**How common the ground is, on 48 starts and 8 standard maps**

| Ground | Starts with it in three rings | Hexes where present | Share of the map's land | What a worker can build there today |
|---|---|---|---|---|
| Open coast or lake | 92% | 7.4 | more water than land | nothing, unless a sea resource is there |
| Forest or jungle | 79% | 9.7 | 18% | a lumber mill, from age 2 |
| Desert with no forest | 29% | 3.8 | 11% | a farm only beside fresh water; a mine only on hills |
| Tundra with no forest, and snow | 29% | 4.4 | 21% | the same |
| Desert, tundra or snow | 58% | 4.1 | 32% |  |
| A hill beside a river | 52% | 2.6 | 5.5% | a mine |
| Coast beside three land hexes | 69% | 2.7 |  | nothing |
| Mountain | 50% | 2.9 | 8% | nothing; The Mountain Terraces lets a town work it |
| Dry flat land (for a baray) | 96% | 5.3 |  | a farm |

- A start is placed on good land, so desert and tundra are rare around a capital and common on the map: a third of all land. The Desert and the Snow is a card for the second to the eighth town, and it makes that land worth a town. That answers the deck's cost, which is room.
- Snow is 11% of the map's land and no start has it in three rings. Today a snow hex yields nothing and can hold nothing.
- The Mountain Terraces (25, approved) belongs to the theme too. It is a rule and not an improvement: a town may work a mountain, and the mountain does not count as improved.
- **To rule:** Nothing to rule here. The three new improvements are changes 46, 47 and 48.

### r4-3. What reaches a new improvement, and what does not

- A new improvement is improved land, so every source that reads "improved" reaches it. A source that names a farm or a mine reaches it only if the improvement counts as one.
- Two of them do: a polder is a farm (approved) and a hammer pond is a mine. The others are their own kind, because a bonus written for a few pastures or fishing boats would be too large on every tundra or coast hex.

**Reach**

| Improvement | What reaches it | What does not |
|---|---|---|
| Every one of them | the cards and Doctrines that read an improved hex: The Rope Stretchers, The Local Census, The Georgics, Crop Rotation, The Physiocrats, The Age of Improvement, The Engineers' Yards, The Domesday Survey, the shared The Ambarvalia and Garden Cities; the great person Eupalinos (improved hexes beside a mountain) | anything that needs a resource opened: a new improvement opens none |
| Fish traps | water sources: the Lighthouse (+1 gold on water hexes), the generic The Gilded Country | everything that names fishing boats: The Coast, the Shipyard, Lord of the Sea, The Great Lighthouse, Hippalus, Artemisia, Willem Beukelszoon |
| Orchard | forest sources: the reworked Sacred Groves, Bashō, The Hedgerows on the farm beside it | lumber mill sources (Old Workings, Wenamun); Spirits of the Wood, which reads unimproved forest |
| Date garden | desert sources: The Hard Country (+1 food, +1 production), Desert Fathers, Petra, Mansa Musa, the Cistern | farm and plantation sources |
| Reindeer corral | tundra sources: The Hard Country, Winter Mother | pasture and camp sources. A bonus sized for three pastures would be too much on every tundra hex |
| Hammer pond | everything that pays a mine: The Highlands, Old Workings, Maria Hebraea, Su Song, Ea-nāṣir, Mansa Musa, Commerce's The Mineral Trade and Mining Districts; and fresh-water sources: Sweet Water, The Gift of the River, The Hydraulic Empire | Prospecting's +1, which is the mine row's own; the Smithy and The Stone Hoard, which need a resource |
| Polder | everything that pays a farm: Smallholdings, Dark Earth, Break the Sod, The Hedgerows, The Three Sisters, Bound to the Soil, Harvest Blessing, Zheng Guo, Iddin-Marduk | Irrigation and the fresh-water farm sources, unless the polder is beside fresh water |
| Baray | it gives fresh water to the six hexes beside it, so the fresh-water sources reach those hexes: Irrigation, Sweet Water, The Watercourses, Li Bing, Jang Yeong-sil, The Hanging Gardens, The Hydraulic Empire, Jayavarman VII, Nezahualcoyotl |  |
| Keep | it copies its six neighbours, so whatever pays them pays it once more |  |

- **To rule:** Nothing to rule. Say if an improvement should count as an older kind where I kept it apart.

### r4-4. The theme's pay-offs

- A pay-off reads the theme and not one improvement: "an improvement that a charter opens". The Scientific deck's charter improvements count too, which gives that pair a bridge.
- Each pay-off has three set-ups or more at or before its tier.

**Pay-offs and their set-ups**

| Pay-off | Tier | What it reads | Set-ups at or before its tier |
|---|---|---|---|
| The Makers of Land (50) | I | each improvement built that a charter opens | 3: The Gathering Grounds, Outposts, The Desert and the Snow |
| The Hard Country (live) | I | worked desert and tundra | 1 in the deck: The Desert and the Snow makes those hexes worth working. The map is the other |
| Commission: The Reclaimed Lands (49) | II | 8 such improvements built | 4: the three above and The Hammer Ponds |
| The Cadastre (51) | III | every improvement a charter opens | 6: those four, The Barays and The Polders |
| The Age of Improvement (live) | III | what Orders pay on improved hexes | every card above |
| The Keeps (28) | IV | the six hexes around the Keep | every improvement |

- I did not write a card that counts kinds of improvement. `docs/decks/deck-design.md` rules out bonuses that count kinds of terrain, and a count of kinds of improvement is nearly the same thing.
- **To rule:** Rule on changes 49, 50 and 51 below.

### r4-5. The core: public works, levies, citizens, settling and roads

- The cards each core theme holds after the rulings, with the new ones in bold.

**The core by tier**

| Theme | Tier 0 | Tier I | Tier II | Tier III | Tier IV | The gap, and what fills it |
|---|---|---|---|---|---|---|
| Public works | The Horrea | The Aediles; **The Founders' Stores (53)** | The Thermae, The Waterworks; **Commission: Bread and Water (52)**, **The Mansiones (54)** | The Mill Wheels, The Capitolia, A Court of Engineers, The Engineers' Yards; **The Mountain Sluices (58)** | The Water Boards | One card in each early tier, and none that takes no chair. 52 is a commission. 53, 54 and 58 make settling, roads and mines read public works. |
| Levies | none | Levy of the Land | Levy of the Land again, Veteran Colonies, The Terraces of Moray, The Colonists; **The Tribute of Hands (55)** | The General Levy, Seasonal Levies, The Mit'a | The Corvée; **The Citizen Soldiers (56)** | No card multiplied a levy, and The Gleaners is cut. 55 is the multiplier. 56 is a Military card for Tier IV. |
| Citizens and tall towns | Granary Levies, The Patient Harvest | The Grain Census; **The River Towns (57)** | The Seven Fat Years, The Great Households, The Breadbasket, The Grain Dole, The Harbour Cities | The Megalopolis, Plenty, The Freedom of the City | The Thousand Villages, The Theodosian Walls | Tier I had one card. 57 feeds towns on fresh water for each citizen. |
| Settling | The Seed Grain, The Founding Furrow, The Woodland Bands | The Staked Claims, The Land Hunger, Outposts, The Wild Marches; **The Founders' Stores (53)** | The Great Colonies, The Colonists, The Book of Settlements | The Quitrents, The Sovereign Writ | The Mother City, The Measure of the Land, The Great Migration | Late settling needs land. The Desert and the Snow (46), The Polders and The Barays make it. |
| Roads | The Road Home | The Road Towns, The Beacons | Provincial Councils, The Beacons again; **The Mansiones (54)** | The Imperial Roads | The Imperial Highways | Roads paid production and authority only. 54 pays culture. Dominion owns the rule that moves armies on roads (Interior Lines), so I add no second one. |

- **To rule:** Rule on changes 52 to 57 below.

### r4-6. The two auxiliary themes, tied to the deck

- Each new card of an auxiliary theme reads a core quantity or is read by one. Neither theme is a closed set.

**The high country and fresh water**

| Theme | What it has | New | How it ties to the deck at large |
|---|---|---|---|
| The high country | The Highlands (II), The Mountain Terraces (III), The Philosophers' Peaks (IV); the Doctrines The Highland Clans and The High Towns; the shared The Mountain Observatories | **The Hammer Ponds (47, II)**, **The Mountain Sluices (58, III)** | A hammer pond is a mine on a river, so the fresh-water cards and the mine cards both pay it. The Mountain Sluices pays mines for public works, which every town builds. Pachacuti starts beside rivers, hills and mountains. |
| Fresh water | Sweet Water (0), The Watercourses (II), The Waterworks (II), The Polders (III); the Doctrines The Gift of the River, The Curator of Waters and The Hydraulic Empire; fish traps on lakes | **The River Towns (57, I)**, **The Hammer Ponds (47, II)**, **The Barays (48, III)** | The River Towns reads citizens, the deck's engine. A baray makes fresh water where there is none, so every fresh-water card and both fresh-water leaders reach six more hexes in each town. Jayavarman VII built barays. |

- **To rule:** Rule on changes 47, 48, 57 and 58 below.

### r4-7. The recount

- The deck if you approve changes 45 to 58.

**By tier, chair and rarity**

| Tier | Cards | Military | Economic | Civic | Wildcard | Common | Uncommon | Rare |
|---|---|---|---|---|---|---|---|---|
| Tier 0 | 11 | 1 | 7 | 3 | 0 | 7 | 3 | 1 |
| Tier I | 18 | 0, and The Beacons is dealt here | 13 | 4 | 1 | 10 | 7 | 1 |
| Tier II | 23 | 1 | 11 | 9 | 2 | 11 | 11 | 1 |
| Tier III | 20 | 1 | 11 | 7 | 1 | 8 | 8 | 4 |
| Tier IV | 12 | 2 | 5 | 4 | 1 | 3 | 6 | 3 |
| **All** | **84** | **5** | **47** | **27** | **5** | **39** | **35** | **10** |

**By theme**

| Theme | Cards | Of them new in round four |
|---|---|---|
| New improvements | 11 | 6: 46, 47, 48, 49, 50, 51 |
| The worked land in general (farms, mines, the improved-hex cards) | 12 | 0 |
| Public works and engineers | 10 | 1: 52 |
| Citizens and tall towns | 13 | 0 |
| Levies | 9 | 2: 55, 56 |
| Settling | 15 | 1: 53 |
| Roads | 7 | 1: 54 |
| The high country | 4 | 1: 58 |
| Fresh water | 3 | 1: 57 (47 and 48 are counted above) |
| **All** | **84** | **13 cards; change 45 adds none** |

- 75 cards after round two. Less The Old Songs, The Tended Country, The Long Tending and The Garden of the World: 71. Plus 13 new Orders: 84. Change 45 adds no card.
- Doctrines: 21 (4, 5, 6 and 6). The Wildwood Compact, The Garden Peoples and Arcadia are cut.
- Seven cards are charters and take no chair: The Gathering Grounds, Outposts, The Desert and the Snow, The Hammer Ponds, The Barays, The Polders and The Keeps.
- Keywords: 4 commissions, 7 charters, 3 scalers and 1 boon.
- Each card is counted in one theme. Nine cards serve two: for example The Hammer Ponds (new improvements, high country, fresh water) and The Founders' Stores (settling, public works).
- The deck is 47 Economic cards of 84 (56%). Three of the seven new Economic cards are charters, and a charter's type is for its face only: it takes no chair.
- 84 is 10 more than the deck holds today. If that is too many, the first to drop are The Cadastre (51) and The Mansiones (54).
- **To rule:** Say if 84 cards is too many.

### r4-8. One hex in Æra IV, for improved hexes only

- One hex in Æra IV, as in round three. **Typical** is the hex, the Doctrines and two Order lines a seat is likely to hold, and one belief and one great person where any can pay. **Busted** is every line this deck and the outside sources can put on the hex, with no leader.

**The sums, with changes 45 to 58**

| Hex | The hex and its work | Typical: the lines | Typical | Busted: the lines | Busted |
|---|---|---|---|---|---|
| **Watered farm** | grassland 2, farm +1, Irrigation +1: **4** | Bound to the Soil +1, The Georgics +1; Dark Earth +2, The Watercourses +2; Harvest Blessing +1; Li Bing +1 | **12** | Doctrines 10; six farm Orders 14, doubled by The Age of Improvement: 28; one belief 1; two great people 3; The Hanging Gardens 1 | **47** |
| **Mine on a hill** | hill 2, mine +1, Prospecting +1: **4** | The Georgics +1; The Highlands +3, Old Workings +3; Maria Hebraea +1 | **12** | Doctrines 9; three Orders 10, doubled: 20; three great people 5 | **38** |
| **Fish traps** | coast 2, traps +2, a Lighthouse +1: **5** | The Georgics +1; The Reclaimed Lands +2, The Cadastre +3 | **11** | Doctrines 9 (with Crop Rotation +2, The Physiocrats +6); the two Orders 5, doubled: 10 | **24** |
| **Orchard** | forest 2, orchard +2: **4** | The Georgics +1; The Reclaimed Lands +2, The Cadastre +3 | **10** | Doctrines 9; the two Orders doubled: 10; Bashō 1 | **24** |
| **Date garden** | desert 0, garden +3: **3** | The Georgics +1; The Hard Country +2, The Reclaimed Lands +2; Desert Fathers +2 | **10** | Doctrines 10; three Orders 7, doubled: 14; Desert Fathers 2; Petra 2 | **31** |
| **Reindeer corral** | tundra 1, corral +3: **4** | The Georgics +1; The Hard Country +2, The Reclaimed Lands +2; Winter Mother +2 | **11** | Doctrines 10; three Orders 7, doubled: 14; Winter Mother 2 | **30** |
| **Hammer pond** | hill 2, pond +3: **5** | The Georgics +1; The Highlands +3, Old Workings +3; Maria Hebraea +1 | **13** | Doctrines 10; The Highlands, Old Workings, The Reclaimed Lands, The Cadastre, The Mountain Sluices and Sweet Water 14, doubled: 28; three great people 5 | **48** |
| **Polder** | as grassland 2, as a farm +1: **3** | Bound to the Soil +1, The Georgics +1; Dark Earth +2, The Reclaimed Lands +2; Harvest Blessing +1; Zheng Guo +1 | **11** | Doctrines 9; five farm Orders, The Reclaimed Lands and The Cadastre 17, doubled: 34; one belief 1; two great people 2 | **49** |

- **Typical against typical the new improvements are level: 10 to 13 against 12.** Fish traps are 1 behind and the orchard 2 behind. The hammer pond is 1 ahead, on ground that half the starts have.
- **Busted, the ones that are their own kind stop at 24 to 31,** against 38 for a mine and 47 for a farm. No belief, great person or wonder names them yet. The hammer pond and the polder reach 48 and 49, because one is a mine and the other a farm.
- **I do not propose to close that busted gap in this deck.** The honest fix is in the other passes: one belief, one great person and one wonder that name the new improvements (for example Lord of the Sea paying fish traps as well as fishing boats). I list it for those sheets in "Ready for the build".
- A baray and a Keep are not in the table: each is one hex in a town that changes the six around it. A baray adds about 8 food to a town with no card, and about 26 with Sweet Water and The Watercourses. A Keep yields about 50.
- **To rule:** Nothing to rule. Say if a line in a sum looks wrong.

### r4-9. Four readings for you to confirm

- **One charter for desert and tundra.** You named an improvement for each. I put both on one card, as fish traps and orchards are, so that the card is live on a start with either ground: 58% of capitals, against 29% for each alone. Two cards is the other choice.
- **The orchard stays.** It is on The Gathering Grounds, which you approved. A forest can hold a lumber mill from age 2, so an orchard is not ground where nothing could be built. It is the early work for a forest. Say if it should go.
- **The Hedgerows stays as you approved it.** Your coordinator's list had it among the cards to withdraw. Its approved text reads farms beside a forest and no wild land, so I kept it.
- **The frontier is not a theme.** Outposts, The Staked Claims and The Wild Marches stay as settling cards. No new card reads claims.

- **To rule:** Confirm each, or say which you want the other way.

## 2. Index

| # | Card | Tier | Change | Ruling | In the fourth review |
|---|---|---|---|---|---|
| 01 | The Gathering Grounds (was The Fish Traps) | I to 0 and I | rework | revised in round four |  |
| 02 | The Woodland Bands | 0 | buff | approved |  |
| 03 | The Wild Orchards | I | cut | cut |  |
| 04 | Levy of the Land | I, also dealt in II | move | approved |  |
| 05 | The Burhs | I | rework | cut |  |
| 06 | Tinkers' Guild | I | cut | kept as today |  |
| 07 | The Land Hunger | I | rework | approved with your text |  |
| 08 | Outposts | I | rework | approved |  |
| 09 | The Road Towns | I | buff | approved |  |
| 10 | The Gleaners | I | buff | cut |  |
| 11 | The Staked Claims | II to I | move | approved |  |
| 12 | The Standing Woods (was The Tended Country) | II | rework | withdrawn in round four |  |
| 13 | The Hedgerows | II | rework | approved |  |
| 14 | The Wide Country | III | move | cut |  |
| 15 | The Great Colonies | III to II | move | approved with your text |  |
| 16 | The Great Households | II | buff | approved with your text |  |
| 17 | The Thermae | II | new | approved |  |
| 18 | The Beacons | II | new | approved |  |
| 19 | The Seven Fat Years | II | new | approved |  |
| 20 | Tier II rarities | II | move | approved |  |
| 21 | The Engineers' Yards | II to III | move | approved |  |
| 22 | The General Levy | IV to III | move | approved with your text |  |
| 23 | The Long Tending | III | rework | withdrawn in round four |  |
| 24 | The Polders | III | rework | approved |  |
| 25 | The Mountain Terraces | III | buff | approved |  |
| 26 | Tier III rarities | III | move | approved |  |
| 27 | The Garden of the World | IV | rework | withdrawn in round four |  |
| 28 | The Keeps | IV | rework | approved |  |
| 29 | The Philosophers' Peaks | IV | buff | approved |  |
| 30 | The Water Boards | IV | new | approved |  |
| 31 | The Thousand Villages | IV | new | approved |  |
| 32 | Tier IV rarities | IV | move | approved |  |
| 33 | Bound to the Soil | I | doctrine | revised in round four |  |
| 34 | The Wildwood Compact | II | doctrine | withdrawn in round four |  |
| 35 | The Garden Peoples | III | doctrine | withdrawn in round four |  |
| 36 | Arcadia | IV | doctrine | cut |  |
| 37 | The Beacons | II, also dealt in I | move | approved |  |
| 38 | The Old Songs | I | rework | withdrawn in round four |  |
| 39 | The orchard | 0 and I | buff | withdrawn in round four |  |
| 40 | The Rope Stretchers and The Ambarvalia | 0 | rework | withdrawn in round four |  |
| 41 | The Sculpted Landscape | III | rework | withdrawn in round four |  |
| 42 | Commission: Keep the Wild | III | new | withdrawn in round four |  |
| 43 | The Satoyama | IV | doctrine | withdrawn in round four |  |
| 44 | The Wildwood Compact | II | doctrine | withdrawn in round four |  |
| 45 | Wild and tended land leave the deck | all | cut | new, not ruled | yes |
| 46 | The Desert and the Snow | I | new | new, not ruled | yes |
| 47 | The Hammer Ponds | II | new | new, not ruled | yes |
| 48 | The Barays | III | new | new, not ruled | yes |
| 49 | Commission: The Reclaimed Lands | II | new | new, not ruled | yes |
| 50 | The Makers of Land | I | new | new, not ruled | yes |
| 51 | The Cadastre | III | new | new, not ruled | yes |
| 52 | Commission: Bread and Water | II | new | new, not ruled | yes |
| 53 | The Founders' Stores | I | new | new, not ruled | yes |
| 54 | The Mansiones | II | new | new, not ruled | yes |
| 55 | The Tribute of Hands | II | new | new, not ruled | yes |
| 56 | The Citizen Soldiers | IV | new | new, not ruled | yes |
| 57 | The River Towns | I | new | new, not ruled | yes |
| 58 | The Mountain Sluices | III | new | new, not ruled | yes |

Of changes 01 to 44: 20 approved, 4 approved with your text, 5 cut, 1 kept as today, 2 revised and 12 withdrawn in round four. Changes 45 to 58 are new.

## 3. The changes, with the rulings applied

"To build" is the line a builder follows. "Today" is the card in `data/decks/expansionist.json` now.

### 01. The Gathering Grounds (was The Fish Traps) (revised in round four)

- **Ruling:** Revised in round four.
- **Tier, rarity, type:** Tiers 0 and I, uncommon, Economic, charter (now Tier I, common)
- **Today:** Tier I, common: Workers may build fish traps on lake and coast tiles: +1 food and +1 production.
- **To build:** Dealt in Tiers 0 and I, uncommon, charter: Workers may build fish traps on coast and lake tiles (+1 food, +1 production) and orchards in forest and jungle (+1 food, +1 gold).
- **Why:** You liked this card at Tier 0, and it is the model for the land theme: it lets a worker improve open water, where nothing could be built. Batch DS1 moved it to Tier I. One card opens both works, so the pick is good on a coast, beside a lake or in woods. It is named for the grounds a people returns to each season to fish and to gather.
- **Arithmetic:** In age 1 a farm on grassland yields 3 and a mine on a hill yields 3. A coast hex with fish traps or a forest with an orchard yields 4. Three such hexes worked by turn 40 add 6 a turn, a regular Tier 0 card (4 to 8), for 3 charges (one Worker, 10 production). The card takes no chair. 92% of capitals have open coast or a lake in three rings, 7.4 hexes where they do, and 79% have woods.
- **Synergy:** Raises: improved hexes, on ground with no improvement before. The Makers of Land (50), The Reclaimed Lands (49) and The Cadastre (51) read every improvement a charter opens. The Rope Stretchers, The Local Census, The Georgics and Crop Rotation read it as improved land. Tinkers' Guild (06) gives the charges to build it.
- **Shape:** Near an existing shape. A charter unlocks one work today (`charter.unlocks.improvement`); this one names two. `lastBand` deals a card in two tiers; it exists, and no dealt row uses it today.
- **Note:** Revised by round four: "tend" becomes "build". Fish traps and orchards are ordinary improvements. They count as improved and can be pillaged. Change 39 (the orchard's figure) is withdrawn.

### 02. The Woodland Bands (approved)

- **Ruling:** Approved. No comment, so approved by your ruling of round one.
- **Tier, rarity, type:** Tier 0, common, Military
- **Today:** Your units ignore the movement cost of forest and jungle.
- **To build:** Your units ignore the movement cost of forest, jungle and hills.
- **Why:** The card lost its +2 strength in batch DS3. It pays no yield, and Tier 0 has three chairs. With hills it is the card that gets settlers, workers and scouts across rough ground in half the time. A seat that founds fast wants that.
- **Arithmetic:** A Settler has 2 movement. Forest and jungle cost 2, and a hill costs 1 more. Six hexes of rough ground take 6 turns today and 3 with the card. A town founded 3 turns sooner is worth about 3 turns of its yield (about 8 a turn in age 1), so about 25 yield for each town. Each Worker also reaches its hexes sooner.
- **Synergy:** Raises: towns founded sooner. Reads: nothing. It works with The Founding Furrow, The Seed Grain, The Road Home and the generic The Wagon Trains (+1 movement for settlers and workers).
- **Shape:** Near an existing shape: the rule `woodsWalk`, widened to hills.

### 03. The Wild Orchards (cut)

- **Ruling:** Cut.
- **Tier, rarity, type:** Tier I, common, Economic, charter
- **Today:** Workers may tend a forest or jungle tile into an orchard: +1 food and +1 gold.
- **To build:** Cut, as proposed. The orchard moves onto The Gathering Grounds (01). The row is retired, and the `wildOrchard` work stays.
- **Why:** Two charters for one verb cost a seat two picks, and each is good on only a part of the map. An orchard alone is a small card.
- **Arithmetic:** An orchard in forest yields 2 food, 1 production and 1 gold (4). A lumber mill in forest yields 1 food and 2 production (3) from age 2. Felling the forest pays a lump and leaves room for a farm (3 or 4). The orchard is level with them and no more.
- **Synergy:** Nothing is lost. The work stays in the game.
- **Shape:** No shape. The row is retired. The `wildOrchard` work stays.
- **Note:** This cut was the proposal, and you approved it with change 01.

### 04. Levy of the Land (approved)

- **Ruling:** Approved. No comment, so approved by your ruling of round one.
- **Tier, rarity, type:** Tier I and II, common, Economic (now Tier I, uncommon)
- **Today:** Tier I, uncommon: A town may spend a citizen for production equal to the food it took to grow. Once every five turns.
- **To build:** Common, dealt in Tiers I and II, the same text.
- **Why:** This is the deck's engine and your favourite card. A Tier I uncommon is offered in about 1 game in 4. Three more cards are dealt only to a seat that holds a levy (The Terraces of Moray, Seasonal Levies, The Mit'a), so in most games the levy cards are not in the draw at all.
- **Arithmetic:** The eighth citizen of a town took 65 food, so a levy there pays 65 production. That is more than six turns of the town's production in age 2 (about 10). The card is offered in about 25% of games today. As a common in two tiers it is offered in about 65%.
- **Synergy:** Raises: levies. Reads: citizens. It opens The Terraces of Moray, Seasonal Levies and The Mit'a. Every food card feeds it.
- **Shape:** Existing shape. A rarity change, and `lastBand`.

### 05. The Burhs (cut)

- **Ruling:** Cut. Your words: *"too strong, lets just cut"*
- **Tier, rarity, type:** Tier I, common, Military
- **Today:** Towns gain +3 defence for each defensive building.
- **To build:** Cut. The Burhs leaves the deck and its row is retired.
- **What was proposed:** Barbarian units may not enter your borders.
- **Note:** You confirmed it in round two: *"cut"*. The cut leaves Tier I with no Military card of this deck, and change 37 (approved) answers that.

### 06. Tinkers' Guild (kept as today)

- **Ruling:** Kept as today. Your words: *"lets keep this one, i think it's good for early game tempo, and extra build charges is one of the best bonuses in civ 6. I'm considering a pass where we make units more expensive, and this will be even more important after that change."*
- **Tier, rarity, type:** Tier I, common, Economic
- **Today:** Workers gain +1 charge.
- **To build:** Kept as it is today: Workers gain +1 charge.
- **Why:** You keep it for early tempo. You may also make units dearer, and a dearer Worker makes each charge worth more.
- **Arithmetic:** A Worker has 3 charges, so the card adds a third to each new Worker. Six Workers in Tier I carry 6 more charges. That is two Workers not built (about 35 production at the rising price) and six hexes raised sooner, each worth about 2 a turn. My round-one sum counted only the production saved, and it was too low.
- **Synergy:** Raises: worker charges. The seven charters of the deck open works that spend them. Bound to the Soil (33) gives the same +1, so a new Worker can have 5.
- **Shape:** No change. The game's words are "newly created workers gain +1 charge".
- **Note:** The new improvements give the charges more hexes to act on, so the card is worth more after this pass than before it.

### 07. The Land Hunger (approved with your text)

- **Ruling:** Approved with your text. Your words: *"Rework: towns build settlers 50% faster."*
- **Tier, rarity, type:** Tier I, common, Economic (now uncommon)
- **Today:** Towns build settlers 25% faster.
- **To build:** Common: Towns build settlers 50% faster.
- **Why:** Your line, and your rarity from round two (*"common"*). It keeps the card a plain production card and doubles its size. My rework is dropped, and with it the new shape.
- **Arithmetic:** A Settler costs 28 production and 7 more for each one built. The fourth to seventh cost 49, 56, 63 and 70: 238 in all. +50% saves a third, 79 production in about 40 turns, which is 2 a turn. Each Settler is done about 2 turns sooner: a town 2 turns sooner (about 16 yield), and 2 turns fewer with no growth (about 12 food). In all about 4 to 5 a turn, against a Tier I bar of 15 to 25.
- **Synergy:** Raises: citizens, and towns founded sooner. Reads: nothing. It feeds The Grain Census, Granary Levies, The Book of Settlements and The Founding Furrow.
- **Shape:** Existing shape: `productionBonus` toward settlers, 50 in place of 25, and the rarity.
- **Note:** A cheap tempo card, and now a common, which fits its size.

### 08. Outposts (approved)

- **Ruling:** Approved. Your words: *"Sure sounds good"*
- **Tier, rarity, type:** Tier I, uncommon, Economic, charter (now a seated card)
- **Today:** Workers may plant an outpost on a wild tile near your border. It claims its hex and the ring around it. (The game adds: while this card is seated.)
- **To build:** Charter: Workers may plant an outpost on an unowned hex within three hexes of your border. It claims its hex and the ring around it. It takes no chair.
- **Why:** An outpost stays when the card leaves its chair. So the best play today is to seat the card, plant, and unseat it. That is a chore, and the chair pays nothing in between. A card that opens a work for your workers should be a charter, as the fish traps are.
- **Arithmetic:** An outpost claims up to 7 hexes for one charge (about 3 production). A town's border takes a hex about every 8 to 10 turns. Two outposts are 14 hexes: +3 culture with the reworked The Wild Marches and +7 gold with The Quitrents.
- **Synergy:** Raises: hexes owned. Reads: nothing. It feeds The Wild Marches, The Quitrents and The Measure of the Land, and it counts as an improvement a charter opens (49, 50, 51).
- **Shape:** Existing shape: `charter.unlocks` in place of `unlocksImprovement`.
- **Note:** Reworded in round four: the text no longer says "wild".

### 09. The Road Towns (approved)

- **Ruling:** Approved. Your words: *"great"*
- **Tier, rarity, type:** Tier I, common, Economic
- **Today:** Towns joined to your capital by road gain +2 production.
- **To build:** Towns joined to your capital by road gain +4 production.
- **Why:** Five joined towns pay 10 a turn today, under the Tier I bar. Three of the deck's leaders point at roads.
- **Arithmetic:** Five towns in age 2: 10 now, 20 proposed (the bar is 15 to 25). A town makes about 10 production in age 2, so +4 is a real share of it.
- **Synergy:** Reads: joined towns. The Road Home, caravans and the shared Market Gardens make them. Provincial Councils, Garden Provinces and The Imperial Roads read the same towns.
- **Shape:** Existing shape, a number change.

### 10. The Gleaners (cut)

- **Ruling:** Cut. Your words: *"lets remove this, doesn't feel good enough to slot."*
- **Tier, rarity, type:** Tier I, common, Economic, needs a levy
- **Today:** After a town levies a citizen, it gains +3 food for ten turns.
- **To build:** Cut. The Gleaners leaves the deck and its row is retired.
- **What was proposed:** After a town levies a citizen, it gains +5 food for ten turns.
- **Note:** Three cards keep the gate "Needs a levy": The Terraces of Moray (II), Seasonal Levies (III) and The Mit'a (III). Seasonal Levies does this card's job two tiers later. No card is needed in its place: Levy of the Land stands alone.

### 11. The Staked Claims (approved)

- **Ruling:** Approved. Your words: *"sure"*
- **Tier, rarity, type:** Tier I, rare, Economic (now Tier II, uncommon)
- **Today:** Tier II, uncommon: Each town you found claims every unowned hex within two hexes of it.
- **To build:** Tier I, rare, the same text.
- **Why:** Tier II opens at about turn 72, when most towns are founded. In Tier I a seat still founds two to four. Tier I has no rare of this deck.
- **Arithmetic:** A new town claims 6 hexes today and 18 with the card. Three towns are 36 more hexes at once. A border takes a hex about every 8 to 10 turns, so that is about 100 town-turns of border growth.
- **Synergy:** Raises: hexes owned. It feeds the reworked The Wild Marches (+7 culture for 36 hexes), The Quitrents and The Measure of the Land, and the claimed hexes are ground for the new improvements.
- **Shape:** Existing shape. Only the tier and the rarity change.

### 12. The Standing Woods (was The Tended Country) (withdrawn in round four)

- **Ruling:** Withdrawn in round four.
- **Tier, rarity, type:** Tier II, uncommon, Economic
- **Today:** Needs tended land. Tended tiles gain +2 production.
- **To build:** Withdrawn. The Tended Country is cut, and its row is retired.
- **Note:** Withdrawn by your ruling for round four. See change 45.

### 13. The Hedgerows (approved)

- **Ruling:** Approved. Your words: *"sure"*
- **Tier, rarity, type:** Tier II, common, Economic
- **Today:** Needs tended land. Worked farms beside a tended tile gain +2 food, once per farm.
- **To build:** Farms beside a forest or jungle gain +3 food.
- **Why:** A hedgerow is the strip of trees beside a field. A seat keeps the woods beside its farms. The player sees it on the map and has no count to keep.
- **Arithmetic:** About a third of a seat's farms stand beside woods. Five farms of fifteen: +15 food. A seat that plans for it reaches ten farms and +30.
- **Synergy:** Reads: farms, and forest or jungle beside them. Smallholdings, Dark Earth and Break the Sod pay on the same farms. The Age of Improvement doubles it. A forest with an orchard or a lumber mill still counts.
- **Shape:** Existing shape: `pays` hex on a farm `beside` forest or jungle.
- **Note:** It stays as you approved it. It reads farms beside woods and no wild land, so round four does not touch it.

### 14. The Wide Country (cut)

- **Ruling:** Cut. Your words: *"remove"*
- **Tier, rarity, type:** Tier II, uncommon, Wildcard, commission (now Tier III)
- **Today:** Tier III: Goal: claim 12 hexes by outposts, cleared camps or buying. Reward: your borders grow 25% faster.
- **To build:** Cut. The Wide Country leaves the deck and its row is retired.
- **What was proposed:** Tier II: Goal: claim 12 hexes by outposts, cleared camps or buying. Reward: your borders grow 50% faster.
- **Note:** The deck then has two commissions (Commission: Break the Sod in Tier I, The Domesday Survey in Tier IV), and Tiers II and III have no Wildcard commission of this deck. The generic commissions cover those tiers (The Building Programme, The Master Plan). No card is needed in its place.

### 15. The Great Colonies (approved with your text)

- **Ruling:** Approved with your text. Your words: *"this is way too strong, i also don't think i've ever seen it in a game. lets make it a fifth of the citizens."*
- **Tier, rarity, type:** Tier II, rare, Economic (now Tier III)
- **Today:** Tier III, rare: Towns you found start with a third of the citizens of your largest town.
- **To build:** Tier II, rare: Towns you found start with a fourth of the citizens of your largest town.
- **Why:** Your line of round two: *"ok, lets do a fourth."* (first *"a fifth"*). The move to Tier II stands: at Tier III few seats found a town, which may be why you have never seen the card in a game. As a Tier III rare it was also offered in about 1 game of 9.
- **Arithmetic:** The game rounds down. A largest town of 8 to 11 gives a new town 2 citizens, 12 to 15 gives 3, and 16 gives 4. Growing from 1 to 3 takes 10 + 17 = 27 food, about 6 turns of a new town's growth. In Tier II the largest town has about 9 to 13 citizens, so the card gives 1 or 2 citizens more than usual, and it passes the Tier 0 card The Seed Grain from a largest town of 12.
- **Synergy:** Reads: the largest town, and towns founded. The Colonists (a levy raises a settler), The Land Hunger (07) and The Book of Settlements work with it.
- **Shape:** Existing shape: `foundingRider` with `fromLargest: 4`, and the tier.

### 16. The Great Households (approved with your text)

- **Ruling:** Approved with your text. Your words: *"let's rework: +1 production for every 2 citizens in a city."*
- **Tier, rarity, type:** Tier II, common, Economic (now uncommon)
- **Today:** Uncommon: Each town gains +2% production for each citizen, at most +30%.
- **To build:** Common: Each town gains +1 production for every 2 citizens.
- **Why:** Your line. It is a flat and not a percentage, so it is strong early in the tier and every production percentage multiplies it later. It has no cap.
- **Arithmetic:** Six towns of 7 citizens at the start of Tier II: +21 production. Eight towns of 9 in age 3: +36, where the median seat makes 107. Twelve towns of 12 in age 4: +72. A regular Tier II card pays 35 to 60.
- **Synergy:** Reads: citizens. Every food card and The Seven Fat Years (19) feed it. The Mill Wheels and The Book of Settlements multiply it. The generic Tier 0 card The Threshing Floor pays the same rate in the capital only.
- **Shape:** Existing shape: `pays` city, count `population` within the town, +1 production for every 2 (The Harbour Cities pays culture this way).
- **Note:** On the bar. No advice.

### 17. The Thermae (approved)

- **Ruling:** Approved. Your words: *"great"*
- **Tier, rarity, type:** Tier II, uncommon, Civic
- **Today:** Not in the deck.
- **To build:** Each public work gives its town +2 science.
- **Why:** Public works have one Order in each tier, and none pays science. The great Roman baths held libraries and lecture halls. Every town builds public works (the Granary, Aqueduct, Watermill, Harbour, Public Bath and Cistern), so the card has a floor in every seat, tall or wide.
- **Arithmetic:** Six towns with 3 public works each: +36 science in age 3, where the median seat makes 106. That is a regular Tier II card (35 to 60). Ten towns with 4 each: +80 late.
- **Synergy:** Reads: public works. The Doctrine The Curator of Waters builds them 50% faster, and the generic The Capital's Example helps. The Aediles and The Water Boards (30) read the same buildings.
- **Shape:** Existing shape: `pays` city, count `publicWorks` within the town, to science.

### 18. The Beacons (approved)

- **Ruling:** Approved. Your words: *"great"*
- **Tier, rarity, type:** Tier II, common, Military
- **Today:** Not in the deck.
- **To build:** Your units gain +1 movement inside your borders.
- **Why:** Tiers II and III have no Military card of this deck. A chain of beacons called the defenders before the raiders arrived. With the card, a few units hold a wide empire. It also pays at peace, because workers and settlers are units.
- **Arithmetic:** A Worker has 2 movement, so 3 inside your borders. A defender covers half again the ground, so a seat of eight towns can hold with about five units in place of eight. That saves three units of 81 production each (a Legionary) and their upkeep.
- **Synergy:** Reads: hexes owned. Claims widen the ground it works on. It works with the roads of The Road Home.
- **Shape:** Near an existing shape: `unitStat` movement with `where: ownTerritory`. The `where` field exists (a retired healing card used it); movement by place is to confirm.
- **Note:** Change 37 (approved) also deals this card in Tier I.

### 19. The Seven Fat Years (approved)

- **Ruling:** Approved. Your words: *"great"*
- **Tier, rarity, type:** Tier II, uncommon, Economic, boon
- **Today:** Not in the deck.
- **To build:** On draft: each of your towns gains a citizen.
- **Why:** The deck has no boon. This one is the engine in one moment, in the tier where the deck is strongest. A wide seat gets more from it. The name is from the seven years of plenty in the story of Joseph in Egypt.
- **Arithmetic:** Six towns at size 7 skip 65 food each: 390 food. At size 9 it is 88 each: 530. A Tier II lump registers at 500 to 900, and these citizens stay. Each one is a new largest size for The Grain Census: +6 production and +6 gold a turn for the rest of the game.
- **Synergy:** Raises: citizens. It feeds The Grain Census, The Great Households, The Megalopolis, The Harbour Cities and every levy.
- **Shape:** Near an existing shape. The citizens grant exists (the Doctrine The Censors pays it to every town). An on-draft arm for it is to confirm.

### 20. Tier II rarities (approved)

- **Ruling:** Approved. Your words: *"sure"*
- **Tier, rarity, type:** The Waterworks and Provincial Councils
- **Today:** The Waterworks and Provincial Councils are uncommon.
- **To build:** Both become common.
- **Why:** Tier II holds 11 uncommons and 6 commons today. Each uncommon is offered in 2 games of 10 and each common in 5. These two are plain cards that most seats can use.
- **Arithmetic:** The recount of round four is in section 1 (r4-7): Tier II then holds 11 commons, 11 uncommons and 1 rare.
- **Synergy:** No change.
- **Shape:** Existing shape. Rarity only.

### 21. The Engineers' Yards (approved)

- **Ruling:** Approved. Your words: *"great"*
- **Tier, rarity, type:** Tier III, common, Economic (now Tier II)
- **Today:** Tier II: Improvements beside a manufactory gain +2 production.
- **To build:** Tier III: Improvements beside a manufactory gain +4 production.
- **Why:** The card needs a great engineer's work. You gain 2 to 3 great people of all families in an age, so at Tier II most seats have no manufactory. The cards that bring engineers are in Tier III (A Court of Engineers, the generic The Office of Works).
- **Arithmetic:** Six improved hexes around one manufactory: +12 now, +24 proposed, beside the manufactory's own 3. Two manufactories: 48, against a Tier III bar of 60 to 120.
- **Synergy:** Reads: manufactories and improved hexes. A Court of Engineers and The Office of Works bring engineers. The Age of Improvement doubles it.
- **Shape:** Existing shape. The tier and one number change.

### 22. The General Levy (approved with your text)

- **Ruling:** Approved with your text. Your words: *"great" and "let's nerf slightly: every 2 turns."*
- **Tier, rarity, type:** Tier III, uncommon, Military (now Tier IV, rare)
- **Today:** Tier IV, rare: Your towns may spend a citizen to raise a melee unit. At war, they may do it every turn.
- **To build:** Tier III, uncommon: Your towns may spend a citizen to raise a melee unit. At war, they may do it every 2 turns.
- **Why:** Your line: the move stands, and the wait at war is 2 turns in place of 1. A seat without Dominion has no card that raises a soldier before this one. With Veteran Colonies (Tier II) the card also moves citizens: raise a soldier in a full town, walk it to a new town, and retire it there.
- **Arithmetic:** A Legionary costs 81 production in age 3 and a Pikeman 238 in age 4. The tenth citizen costs 88 food. So a levy turns about 90 food into a unit worth 81 to 238 production. A town with a food surplus of 12 regrows that citizen in about 7 turns, so the 2-turn wait rarely binds. It halves the first burst: five towns raise five units in two turns, not ten.
- **Synergy:** Raises: units gained, levies. It feeds Veteran Colonies, The Mit'a and the shared The Farming Garrisons, and Alexander's The Royal Army.
- **Shape:** Existing shape: `levy` with `use: conscript` and `everyAtWar: 2` in place of 1, and the tier and rarity.
- **Note:** On the bar. No advice.

### 23. The Long Tending (withdrawn in round four)

- **Ruling:** Withdrawn in round four.
- **Tier, rarity, type:** Tier III, rare, Wildcard (now Economic)
- **Today:** Needs tended land. Tended tiles gain +3 food.
- **To build:** Withdrawn. The Long Tending is cut, and its row is retired.
- **Note:** Withdrawn by your ruling for round four. See change 45.

### 24. The Polders (approved)

- **Ruling:** Approved. Your words: *"great"*
- **Tier, rarity, type:** Tier III, uncommon, Economic, charter (now rare, seated)
- **Today:** Rare: Workers may build a polder on a coast tile beside three of your land tiles. It yields as a farm. (The game adds: while this card is seated, and for 2 charges. No farm card reads a polder.)
- **To build:** Charter, uncommon: Workers may build a polder on a coast tile beside three of your land tiles. A polder is a farm.
- **Why:** The Polders is the deck's answer to a full map, so it must make real farmland. Today a polder makes a coast hex of 2 into a hex of 3, for two charges and a rare's chair.
- **Arithmetic:** A coast hex yields 2, or 3 with a Lighthouse. A polder yields 3 today. As a farm with three farm cards (Smallholdings +2, Dark Earth +2, Break the Sod +1) it yields 8. Eight polders: +8 today and +40 proposed, with no chair.
- **Synergy:** Raises: farms, improved hexes. Reads: coast. Every farm card then pays on it.
- **Shape:** Existing parts: `charter.unlocks`, and `countsAs: farm` (Terraces use it). To confirm: `countsAs` and `yieldsAs` on one row.

### 25. The Mountain Terraces (approved)

- **Ruling:** Approved. Your words: *"great"*
- **Tier, rarity, type:** Tier III, uncommon, Civic (now rare)
- **Today:** Rare: Your towns may work the mountains in their borders. A worked mountain yields 2 science and 1 production.
- **To build:** Uncommon: Your towns may work the mountains in their borders. A worked mountain yields 4 science and 2 production.
- **Why:** You called this "a cool mechanic". A hex of 3 is the worst hex a citizen can work in Tier III, so nobody uses the rule.
- **Arithmetic:** A farm with two cards yields 7 or 8 in Tier III. A mountain yields 3 now and 6 proposed, and 4 of it is science, which the deck lacks. Six worked mountains: +24 science and +12 production.
- **Synergy:** Reads: mountains in your borders. The Philosophers' Peaks (29) and the shared The Mountain Observatories read the same hexes. Pachacuti starts beside mountains. A worked mountain is not improved land, so the cards that read improved hexes do not pay on it.
- **Shape:** Existing shape, a number and a rarity change.

### 26. Tier III rarities (approved)

- **Ruling:** Approved. Your words: *"sure"*
- **Tier, rarity, type:** Five cards
- **Today:** Seasonal Levies, The Capitolia and The Freedom of the City are uncommon. A Court of Engineers and The Mit'a are rare.
- **To build:** Seasonal Levies, The Capitolia and The Freedom of the City become common. A Court of Engineers and The Mit'a become uncommon.
- **Why:** Tier III holds 10 rares, 4 uncommons and 4 commons. Each rare is offered in 1 game of 9, and each of the four commons in 19 of 20. Every Tier III looks the same, and the cards that change play stay hidden.
- **Arithmetic:** The recount of round four is in section 1 (r4-7): Tier III then holds 8 commons, 8 uncommons and 4 rares. The rares are The Age of Improvement, The Megalopolis, The Sovereign Writ and The Imperial Roads.
- **Synergy:** No change.
- **Shape:** Existing shape. Rarity only.

### 27. The Garden of the World (withdrawn in round four)

- **Ruling:** Withdrawn in round four.
- **Tier, rarity, type:** Tier IV, uncommon, Economic (now rare)
- **Today:** Rare. Needs tended land. Tended tiles gain +2 food, +1 production and +1 culture.
- **To build:** Withdrawn. The Garden of the World is cut, and its row is retired.
- **Note:** Withdrawn by your ruling for round four. See change 45.

### 28. The Keeps (approved)

- **Ruling:** Approved. Your words: *"Sure"*
- **Tier, rarity, type:** Tier IV, rare, Economic, charter (now a seated card)
- **Today:** Workers may build one Keep in each town. A Keep gains the yields of every tile around it. (The game adds: while this card is seated.)
- **To build:** Charter. The same text. It takes no chair.
- **Why:** The same reason as Outposts (08). A Keep stays when the card leaves its chair, so today the best play is to seat it, build, and unseat it.
- **Arithmetic:** Six hexes of about 6 each: a Keep's hex yields about 36. Ten towns: about 360 a turn, a Tier IV headline (200 or more). The price is the pick, and a charge and a hex in each town.
- **Synergy:** Reads: the hexes around the Keep. Every hex card of the deck raises it.
- **Shape:** Existing shape: `charter.unlocks` in place of `unlocksImprovement`.

### 29. The Philosophers' Peaks (approved)

- **Ruling:** Approved. Your words: *"sure"*
- **Tier, rarity, type:** Tier IV, common, Civic (now uncommon)
- **Today:** Uncommon: Each town gains +2 science for every mountain in its borders, at most +6.
- **To build:** Common: Each town gains +4 science for every mountain in its borders, at most +12.
- **Why:** The shared Tier 0 card The Mountain Observatories gives +3 science a town. A Tier IV card must do more than twice that.
- **Arithmetic:** Four towns of ten hold mountains, 2 or 3 each: 20 now, 40 proposed. A mountain empire of six such towns with 3 each: 36 now, 72 proposed. The Tier IV bar is 60 to 120.
- **Synergy:** Reads: mountains in your borders. The Mountain Terraces (25) reads the same hexes.
- **Shape:** Existing shape, a number and a rarity change.

### 30. The Water Boards (approved)

- **Ruling:** Approved. Your words: *"great"*
- **Tier, rarity, type:** Tier IV, uncommon, Economic
- **Today:** Not in the deck.
- **To build:** Your public works yield twice as much.
- **Why:** Public works have no Order in Tier IV. This is the theme's multiply card, late, when the flats exist. The Dutch water boards have kept dikes and drains since the 13th century.
- **Arithmetic:** A Granary gives 2 food, a Watermill 2 food and 1 production, a Harbour 1 food and 3 production, a Public Bath 3 food and a Cistern 2 food. A full town holds about 8 food and 4 production from them. Ten towns with most of them built: +80 to +100 a turn, a regular Tier IV card.
- **Synergy:** Reads: public works. The Thermae (17), The Aediles and the Doctrines The Curator of Waters and The Hydraulic Empire read the same buildings.
- **Shape:** Near an existing shape. `buildingYieldPercent` takes a building category today (The Iron Pillar). A public-work selector is missing there; `productionBonus` has one.

### 31. The Thousand Villages (approved)

- **Ruling:** Approved. Your words: *"great"*
- **Tier, rarity, type:** Tier IV, common, Civic
- **Today:** Not in the deck.
- **To build:** +1 culture for every two citizens in your empire.
- **Why:** Your picture of the deck asks for late bonuses that grow with towns and citizens. Tier IV has no card that reads the empire's citizens. Culture is the draft currency, and a wide seat is short of it late.
- **Arithmetic:** Twelve towns of 10 are 120 citizens: +60 culture. The median seat makes 442 culture in age 4, so that is 14%. A regular Tier IV card.
- **Synergy:** Reads: citizens. Every food card, The Seven Fat Years (19) and The Censors feed it.
- **Shape:** Existing shape: `pays` empire, count `population`, 1 for every 2.

### 32. Tier IV rarities (approved)

- **Ruling:** Approved. Your words: *"sure"*
- **Tier, rarity, type:** Five cards
- **Today:** The Corvée, The Measure of the Land, The Domesday Survey and The Imperial Highways are rare. The Theodosian Walls is uncommon.
- **To build:** The four become uncommon. The Theodosian Walls becomes common.
- **Why:** Tier IV holds 9 rares and 2 uncommons, and it has about five drafts. Each rare is offered in 1 game of 8. The two uncommons are offered in 7 to 9 games of 10, and they are the two weakest cards of the tier.
- **Arithmetic:** The recount of round four is in section 1 (r4-7): Tier IV then holds 3 commons, 6 uncommons and 3 rares. The rares are The Keeps, The Mother City and The Great Migration.
- **Synergy:** No change.
- **Shape:** Existing shape. Rarity only.

### 33. Bound to the Soil (revised in round four)

- **Ruling:** Revised in round four.
- **Tier, rarity, type:** Tier I, Doctrine, the field
- **Today:** Workers gain +1 charge. Tended tiles gain +1 food.
- **To build:** Workers gain +1 charge. Farms gain +1 food.
- **Why:** Your line of 2026-11-05 gave +1 food to tended tiles. Tended land is gone, so the food goes to farms, which you approved in round one. Root-crop grounds are withdrawn.
- **Arithmetic:** Ten farms at turn 40: +10 food for the rest of the game. Thirty farms late: +30. A polder is a farm, so it takes the +1 too.
- **Synergy:** Reads: farms. Tinkers' Guild (06) stacks with its charge, and the seven charters give the charges works to build.
- **Shape:** Existing shapes: `unitStat` charges, and `pays` hex on farms.
- **Note:** Revised by round four. It is part of change 45.

### 34. The Wildwood Compact (withdrawn in round four)

- **Ruling:** Withdrawn in round four.
- **Tier, rarity, type:** Tier II, Doctrine, the wild
- **Today:** Needs tended land. Tended works cost your workers no charge. Workers you gain from now on have one less charge.
- **To build:** Withdrawn. The Wildwood Compact is cut. Tier II has five Doctrines.
- **Note:** Withdrawn by your ruling for round four. See change 45.

### 35. The Garden Peoples (withdrawn in round four)

- **Ruling:** Withdrawn in round four.
- **Tier, rarity, type:** Tier III, Doctrine, the wild
- **Today:** Needs tended land. Tended tiles gain +1 food, +1 production and +1 culture.
- **To build:** Withdrawn. The Garden Peoples is cut, and hill groves with it. Tier III has six Doctrines.
- **Note:** Withdrawn by your ruling for round four. See change 45.

### 36. Arcadia (cut)

- **Ruling:** Cut. Your words: *"great"*
- **Tier, rarity, type:** Tier IV, Doctrine, cut
- **Today:** Needs tended land. Your tended tiles also count as improved for every card.
- **To build:** Cut, as proposed. The row is retired. The gate `needsTendedWork` is then on no row.
- **Why:** Its job was to close the gap between the tended cards and the improved cards. With the pay-offs on wild land, that gap is gone. Tier IV has seven Doctrines, and the target is three to five.
- **Arithmetic:** No arithmetic. Tier IV then has six Doctrines.
- **Synergy:** Nothing reads it.
- **Shape:** No shape. The row is retired. The gate `needsTendedWork` is then on no row.
- **Note:** This cut was the proposal, and you approved it.

### 37. The Beacons (approved)

- **Ruling:** Approved. No comment, so approved by your ruling of round one.
- **Tier, rarity, type:** Tiers I and II, common, Military
- **Today:** Change 18, approved: Tier II, common. Your units gain +1 movement inside your borders.
- **To build:** The same card, dealt in Tiers I and II.
- **Why:** With The Burhs cut, Tier I has no Military card of this deck. This fills the gap with a card you approved and adds no card.
- **Arithmetic:** In Tier I a seat holds 3 to 5 towns and its Workers do most of their work. +1 movement is a third less walking for each Worker, and one defender covers two towns. A common dealt in two tiers is offered in about 2 games of 3.
- **Synergy:** Reads: hexes owned. The Staked Claims (11) and Outposts (08) widen the ground it works on. The Woodland Bands (02) does the same job on rough ground outside the borders.
- **Shape:** Existing shape: `lastBand`, as on Levy of the Land (04). The card's own shape is change 18's.

### 38. The Old Songs (withdrawn in round four)

- **Ruling:** Withdrawn in round four.
- **Tier, rarity, type:** Tier I, common, Civic
- **Today:** Worked unimproved land gains +2 culture.
- **To build:** Withdrawn. The Old Songs is cut, and its row is retired.
- **Note:** Your words for round four: *"get rid of cards like old song"*. See change 45.

### 39. The orchard (withdrawn in round four)

- **Ruling:** Withdrawn in round four.
- **Tier, rarity, type:** A work on The Gathering Grounds
- **Today:** +1 food and +1 gold. Round three proposed +2 food and +1 gold.
- **To build:** Withdrawn. It was never ruled, and it served wild or tended land.
- **Note:** Withdrawn by your ruling for round four. See change 45.

### 40. The Rope Stretchers and The Ambarvalia (withdrawn in round four)

- **Ruling:** Withdrawn in round four.
- **Tier, rarity, type:** Tier 0, common, Civic
- **Today:** Each counts improved tiles. Round three proposed that both count tended tiles too.
- **To build:** Withdrawn. It was never ruled, and it served wild or tended land.
- **Note:** Withdrawn by your ruling for round four. See change 45.

### 41. The Sculpted Landscape (withdrawn in round four)

- **Ruling:** Withdrawn in round four.
- **Tier, rarity, type:** Tier III, uncommon, Civic, shared with Magisterial
- **Today:** Farms beside a great-person work gain +2 food and +2 culture. Round three proposed tended tiles too.
- **To build:** Withdrawn. It was never ruled, and it served wild or tended land.
- **Note:** Withdrawn by your ruling for round four. See change 45.

### 42. Commission: Keep the Wild (withdrawn in round four)

- **Ruling:** Withdrawn in round four.
- **Tier, rarity, type:** Tier III, uncommon, Wildcard
- **Today:** Not in the deck.
- **To build:** Withdrawn. It was never ruled, and it served wild or tended land.
- **Note:** Withdrawn by your ruling for round four. See change 45.

### 43. The Satoyama (withdrawn in round four)

- **Ruling:** Withdrawn in round four.
- **Tier, rarity, type:** Tier IV, Doctrine
- **Today:** Not in the deck.
- **To build:** Withdrawn. It was never ruled, and it served wild or tended land.
- **Note:** Withdrawn by your ruling for round four. See change 45.

### 44. The Wildwood Compact (withdrawn in round four)

- **Ruling:** Withdrawn in round four.
- **Tier, rarity, type:** Tier II, Doctrine
- **Today:** Change 34. Round three proposed that towns tend one hex a turn.
- **To build:** Withdrawn. It was never ruled, and it served wild or tended land.
- **Note:** Withdrawn by your ruling for round four. See change 45.

### 45. Wild and tended land leave the deck (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Six cards cut, four reworked, three reworded, two of them shared
- **Today:** Eleven cards read wild land, and two works are tended and not improved.
- **To build:** Cut The Old Songs, The Tended Country, The Long Tending, The Garden of the World, and the Doctrines The Wildwood Compact and The Garden Peoples. Rework The Wild Marches (+1 culture for every five hexes you own), Bound to the Soil (Workers gain +1 charge. Farms gain +1 food), Sacred Groves (Worked forests gain +1 food and +1 faith) and Garden Cities (+1 culture for every three improved tiles a Monument town works). Reword The Gathering Grounds, Outposts and The Domesday Survey. Fish traps and orchards become ordinary improvements.
- **Why:** Your ruling. A hex is improved or it is not. 85 sources outside this deck pay an improved hex and one pays a wild hex, so a wild hex could never keep up.
- **Arithmetic:** The deck goes from 75 cards to 71 and from 23 Doctrines to 21. The Wild Marches at one culture for five hexes pays about +10 at 50 hexes, where it paid about +9 for 36 wild hexes. Sacred Groves then pays on every worked forest, with or without a lumber mill or an orchard.
- **Synergy:** Every card that reads an improved hex now reads fish traps and orchards: The Rope Stretchers, The Local Census, The Georgics, Crop Rotation, The Physiocrats and The Age of Improvement.
- **Shape:** Data and text only. The mark `tended` comes off two improvement rows, and the gate `needsTendedWork` comes off every row.
- **Note:** The table in section 1 (r4-1) has each card.

### 46. The Desert and the Snow (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier I, uncommon, Economic, charter
- **Today:** Not in the deck. A flat desert or tundra hex with no fresh water can hold no improvement, and a snow hex yields nothing.
- **To build:** Workers may plant date gardens on desert (+2 food, +1 gold) and build reindeer corrals on tundra and snow (+1 food, +2 production).
- **Why:** Your two directions, on one card. A third of the map's land is desert, tundra or snow, and today a town there starves. With this card that land is worth a town, which is what a deck that settles wide needs when the good land is gone. The date-palm gardens of the Saharan and Arabian oases and the reindeer corrals of the Sámi and the Nenets are the models.
- **Arithmetic:** A date garden makes a flat desert hex yield 2 food and 1 gold (3), which is a dry farm. A corral makes a tundra hex 2 food and 2 production (4) and a snow hex 1 and 2 (3). With The Hard Country each is 2 more. 58% of capitals have such ground in three rings, 4.1 hexes where they do; desert alone 29%, tundra alone 29%. Four of these hexes worked are +12 to +16 a turn with no chair, against a Tier I bar of 15 to 25.
- **Synergy:** Raises: improved hexes on desert, tundra and snow. The Hard Country pays on the same hexes, and so do the beliefs Desert Fathers and Winter Mother, Petra and Mansa Musa. The Makers of Land (50), The Reclaimed Lands (49) and The Cadastre (51) read it.
- **Shape:** Near an existing shape: a charter that opens two works, as The Gathering Grounds does (01). Two new improvement rows, `dateGarden` and `reindeerCorral`; their ground rules use fields that exist. A board piece and a flair-gallery entry for each.
- **Note:** If you want two cards, the date garden and the corral each take one, at Tier I.

### 47. The Hammer Ponds (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier II, uncommon, Economic, charter
- **Today:** Not in the deck. A hill beside a river can hold a mine (+1 production).
- **To build:** Workers may build a hammer pond on a hill beside a river: +3 production. It counts as a mine.
- **Why:** Your third direction: an improvement that needs a combination of ground. It joins the two auxiliary themes, the high country and fresh water, and both sets of cards pay it. In the Weald of England, streams were dammed into hammer ponds to drive the forge hammers; Han China drove trip hammers by water.
- **Arithmetic:** A hill yields 2 production. A mine makes it 3, and 4 in age 4. A hammer pond makes it 5. 52% of capitals have a bare hill on a river in three rings, 2.6 where they do, and 5.5% of the map's land is such ground. Three hammer ponds are +6 over three mines, and each takes The Highlands (+2 science, +1 production) and Sweet Water (+1 food).
- **Synergy:** Raises: mines, improved hexes. Reads: hills and rivers. The Highlands, Old Workings and The Mountain Sluices (58) pay it as a mine. Sweet Water, The Gift of the River and The Hydraulic Empire pay it as a hex beside fresh water. Pachacuti starts on such ground.
- **Shape:** Near an existing shape. A new improvement row with `requiresHills` and `countsAs: mine`, which exist. A ground rule "beside a river" is missing for improvements; the card test `river` exists.
- **Note:** Busted it reaches 48, above a mine's 38, because both stacks land on it. It is rare ground, so I left it.

### 48. The Barays (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier III, uncommon, Economic, charter
- **Today:** Not in the deck.
- **To build:** Workers may dig one baray in each town, on flat land: +2 food, and the hexes beside it have fresh water.
- **Why:** Like the Keep, it is one work in a town that changes the hexes around it. It makes fresh water where there is none, so the fresh-water cards and the two fresh-water leaders reach six more hexes in each town. The barays were the great reservoirs of Angkor; Jayavarman VII built the last of them.
- **Arithmetic:** Six farms beside it gain Irrigation's +1 food, and the baray's own hex gains +2: +8 food in a town for one charge, with no card. With Sweet Water (+1 food on each of the seven hexes) and The Watercourses (+2 production on each farm) it is about +26 in a town. 96% of capitals have dry flat land, 5.3 hexes of it.
- **Synergy:** Raises: hexes beside fresh water. Sweet Water, The Watercourses, The Gift of the River, The Hydraulic Empire, The River Towns (57) if the town centre is beside it, Jayavarman VII and Nezahualcoyotl read them.
- **Shape:** Existing fields on a new improvement row: `onePerTown` (the Keep has it) and `watersBeside` (the Scientific deck's Qanat has it). A board piece and a flair-gallery entry.
- **Note:** The Scientific deck's Qanat waters its neighbours too, with no limit of one in a town, behind a charter technology. A seat with both decks has both.

### 49. Commission: The Reclaimed Lands (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier II, uncommon, Wildcard, commission
- **Today:** Not in the deck.
- **To build:** Goal: build 8 improvements that your charters open. Reward: those improvements gain +1 food and +1 production.
- **Why:** The theme's flat pay-off, earned by building, and with no chair once it is met. The deck is short of Wildcard cards, and Tier II has no commission.
- **Arithmetic:** Eight is six fish traps and two outposts, or four date gardens and four hammer ponds: about three Workers. A seat that goes on to work 15 to 20 such hexes gains +30 to +40 a turn with no chair. A regular Tier II card pays 35 to 60 and takes one.
- **Synergy:** Reads: improvements built that a charter opens. Four charters are dealt at or before Tier II. The Age of Improvement doubles the reward if a commission's reward counts as an Order's line (to confirm).
- **Shape:** Near an existing shape: a commission that counts a moment, with a new moment (an improvement built from a row that a charter opens). The reward is a `pays` hex on a list of improvements.

### 50. The Makers of Land (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier I, uncommon, Civic, scaler
- **Today:** Not in the deck.
- **To build:** Gains +1 science and +1 culture each time you build an improvement that a charter opens.
- **Why:** It pays for the act, and the figure on the card grows as the player builds. It brings back the early culture that The Old Songs paid, for doing something and not for leaving land alone.
- **Arithmetic:** Six builds by turn 70: +6 science and +6 culture, where the median seat makes about 30 and 25 in age 2. Twenty builds by Æra IV: +20 and +20, from a Tier I chair.
- **Synergy:** Reads: improvements built that a charter opens. The Gathering Grounds, Outposts and The Desert and the Snow are dealt at or before Tier I. Tinkers' Guild and Bound to the Soil give the charges.
- **Shape:** Near an existing shape: a scaler, as The Aediles is, with a new counted moment (an improvement built from a row that a charter opens).

### 51. The Cadastre (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier III, uncommon, Civic
- **Today:** Not in the deck.
- **To build:** Improvements your charters open gain +3 science.
- **Why:** The theme's widen card: the new improvements make food, production and gold, and this pays what they do not make. A cadastre is the register of every plot and what it yields.
- **Arithmetic:** 15 to 20 such hexes worked: +45 to +60 science, where the median seat makes 106 in age 3 and 494 in Æra IV. A regular Tier III card pays 60 to 120.
- **Synergy:** Reads: every improvement a charter opens. Six charters are dealt at or before Tier III. The Age of Improvement doubles it.
- **Shape:** Existing shape: `pays` hex on a list of improvements.

### 52. Commission: Bread and Water (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier II, uncommon, Wildcard, commission
- **Today:** Not in the deck.
- **To build:** Goal: hold 12 public works. Reward: each public work gives its town +1 food and +1 production.
- **Why:** Public works have one Order in each early tier, and every one takes a chair. A commission is met by building what the seat builds anyway, and its reward stays.
- **Arithmetic:** Six towns with a Granary and a Watermill each are 12, at about turn 100. The reward is then +24 a turn, and +60 to +80 at 30 to 40 public works, with no chair.
- **Synergy:** Reads: public works held. The Founders' Stores (53), the Doctrine The Curator of Waters and the generic The Capital's Example bring them sooner. The Thermae, The Mansiones (54) and The Mountain Sluices (58) read the same buildings.
- **Shape:** Near an existing shape: the count `publicWorks` exists for cards; a commission needs it as a goal figure. The reward is a `pays` city by that count.

### 53. The Founders' Stores (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier I, uncommon, Economic
- **Today:** Not in the deck.
- **To build:** Towns you found start with a Granary.
- **Why:** It ties settling to public works. A new town is weakest in its first twenty turns, and a Granary doubles its food surplus then.
- **Arithmetic:** A Granary gives +2 food and keeps 20% of a town's food when it grows. A new town with a surplus of 2 has 4. It reaches size 4 (52 food) in about 13 turns in place of 26. Each Granary is also +1 authority with The Horrea and +2 science with The Thermae from the first turn.
- **Synergy:** Raises: public works, and citizens in new towns. Reads: towns founded. The Horrea, The Thermae, Bread and Water (52) and The Mansiones (54) read the Granary. The Seed Grain and The Great Colonies add citizens to the same town.
- **Shape:** Existing shape: `foundingRider` with a building. The Doctrine The Planted Towns gives a Monument this way.

### 54. The Mansiones (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier II, common, Civic
- **Today:** Not in the deck.
- **To build:** Towns joined to your capital by road gain +1 culture for each public work.
- **Why:** Roads pay production and authority today, and the deck lost culture with the wild cards. This ties roads to public works. The mansiones were the official rest houses along the Roman roads.
- **Arithmetic:** Six joined towns with 2.5 public works each: +15 culture in age 3, where the median seat makes 83. Ten towns with 4 each: +40 late. A regular Tier II card pays 35 to 60, so it starts low and grows.
- **Synergy:** Reads: joined towns and their public works. The Road Home and caravans join towns. Jayavarman VII's House of Fire is a public work that must stand in a joined town, so it always counts.
- **Shape:** Existing shape: `pays` city by the count `publicWorks`, with the scope `connected`.

### 55. The Tribute of Hands (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier II, common, Economic, needs a levy
- **Today:** Not in the deck.
- **To build:** A levy pays 50% more production.
- **Why:** The levy is your favourite mechanic, and no card multiplies it. The Gleaners, which you cut, tried to soften a levy's cost; this raises what the levy gives.
- **Arithmetic:** The eighth citizen took 65 food, so a levy there pays 65 production, and 98 with the card. Five towns that levy in turn give one levy a turn: +33 production a turn. With The Terraces of Moray the science grows too, by 16 a levy.
- **Synergy:** Reads: levies. Levy of the Land, The Colonists, The Corvée and the Doctrine Human Sacrifice make them. The Terraces of Moray reads the larger figure.
- **Shape:** Near an existing shape: the levy effect has no percentage on its production today.

### 56. The Citizen Soldiers (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier IV, uncommon, Military, needs a levy that raises a unit
- **Today:** Not in the deck.
- **To build:** Units your levies raise cost no upkeep.
- **Why:** Tier IV has one Military card, The Theodosian Walls. This one pays at peace. With The General Levy and Veteran Colonies a seat can raise an army from its towns, keep it for nothing, and settle it again.
- **Arithmetic:** Upkeep is 1 gold for each unit and age, so 4 gold a unit in Æra IV. Ten levied units: 40 gold a turn. That is under the Tier IV bar of 60 to 120 as a yield; its worth is the army a wide seat can then afford to hold.
- **Synergy:** Reads: units a levy raised. The General Levy (22) and the shared The Muster of the Fields raise them. Alexander's The Royal Army pays science for each one.
- **Shape:** Existing field: `freeUpkeep` on the levy effect. The deal gate should ask for a levy that raises a unit, which is a narrower gate than "Needs a levy".

### 57. The River Towns (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier I, common, Economic
- **Today:** Not in the deck.
- **To build:** Towns beside a river or lake gain +1 food for every 3 citizens.
- **Why:** Tier I has one card for tall towns. This ties fresh water to citizens, the deck's engine: a river town feeds itself as it grows, and the food becomes levies.
- **Arithmetic:** Four river towns of 6 citizens: +8 food at the start of Tier I. Eight towns of 12 in Æra IV: +32. Most starts are on a river, and Jayavarman VII and Nezahualcoyotl always are.
- **Synergy:** Reads: citizens, in towns on fresh water. Every food card feeds it, and it feeds Levy of the Land and The Grain Census. A town with a Cistern counts as on fresh water.
- **Shape:** Existing shape: `pays` city by the count `population`, with the scope `freshwater`.

### 58. The Mountain Sluices (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier III, uncommon, Economic
- **Today:** Not in the deck.
- **To build:** Mines and quarries gain +1 production for every two public works in their town.
- **Why:** It ties the high country to public works, as the Doctrine The Hydraulic Empire ties fresh water to them. The Romans brought water by aqueduct to wash whole hillsides for ore.
- **Arithmetic:** A town with four public works: +2 on each mine. Six towns with three mines each: +36 production. A mining seat with five mines a town in eight towns: +80. A regular Tier III card pays 60 to 120.
- **Synergy:** Reads: mines, quarries, and public works in the town. The Highlands and Old Workings pay the same hexes, and a hammer pond (47) is a mine. Bread and Water (52) and The Founders' Stores (53) bring the public works.
- **Shape:** Existing shape: `pays` hex by the count `publicWorks` in the town, as The Hydraulic Empire pays.

## 4. The themes after round four

### New improvements (the land theme)

- **Tier 0:** The Gathering Grounds (fish traps, orchards)
- **Tier I:** Outposts, The Desert and the Snow (46), The Makers of Land (50), The Hard Country
- **Tier II:** The Hammer Ponds (47), Commission: The Reclaimed Lands (49)
- **Tier III:** The Barays (48), The Polders, The Cadastre (51), The Mountain Terraces (a rule)
- **Tier IV:** The Keeps
- **The essentials:** food and production from the works; science and culture from The Makers of Land and The Cadastre.

### The worked land in general

- **Tier 0:** Smallholdings, The Rope Stretchers
- **Tier I:** Dark Earth, The Three Sisters, Commission: Break the Sod, The Local Census, Tinkers' Guild; the Doctrine Bound to the Soil
- **Tier II:** The Coast, The Hedgerows; the Doctrine The Georgics
- **Tier III:** Old Workings, The Age of Improvement; the Doctrine Crop Rotation
- **Tier IV:** The Domesday Survey; the Doctrine The Physiocrats
- **The essentials:** production everywhere; science from The Rope Stretchers and The Domesday Survey; culture from The Coast.

### Public works and engineers

- **Tier 0:** The Horrea
- **Tier I:** The Aediles, The Founders' Stores (53)
- **Tier II:** The Thermae, The Waterworks, Commission: Bread and Water (52), The Mansiones (54); the Doctrine The Curator of Waters
- **Tier III:** The Mill Wheels, The Capitolia, A Court of Engineers, The Engineers' Yards, The Mountain Sluices (58)
- **Tier IV:** The Water Boards; the Doctrine The Hydraulic Empire
- **The essentials:** science from The Thermae; culture from The Aediles, The Mansiones and The Capitolia; production from The Aediles, The Mill Wheels and The Water Boards.

### Levies, citizens and tall towns (the engine)

- **Tier 0:** Granary Levies, The Patient Harvest
- **Tier I:** Levy of the Land (also dealt in Tier II), The Grain Census, The River Towns (57)
- **Tier II:** The Tribute of Hands (55), The Terraces of Moray, Veteran Colonies, The Seven Fat Years, The Great Households, The Breadbasket, The Harbour Cities, The Grain Dole
- **Tier III:** The General Levy, Seasonal Levies, The Mit'a, The Megalopolis, Plenty, The Freedom of the City
- **Tier IV:** The Corvée, The Citizen Soldiers (56), The Thousand Villages, The Theodosian Walls
- **The essentials:** production from the levy and from growth; science from The Terraces of Moray and The Megalopolis; culture from The Harbour Cities and The Thousand Villages.

### Settling and roads

- **Tier 0:** The Seed Grain, The Founding Furrow, The Road Home, The Woodland Bands
- **Tier I:** The Staked Claims, The Land Hunger, The Founders' Stores (53), The Wild Marches, The Road Towns, The Beacons
- **Tier II:** The Great Colonies, The Colonists, The Book of Settlements, Provincial Councils, The Mansiones (54), The Beacons
- **Tier III:** The Imperial Roads, The Sovereign Writ, The Quitrents
- **Tier IV:** The Mother City, The Measure of the Land, The Great Migration, The Imperial Highways
- **The essentials:** culture from The Founding Furrow, The Wild Marches, The Mansiones and The Mother City; production from The Road Towns and The Book of Settlements; science from The Measure of the Land.

### The high country and fresh water (auxiliary)

- **Tier 0:** Sweet Water; the shared The Mountain Observatories and The Holy Spring
- **Tier I:** The River Towns (57); the Doctrines The Gift of the River and The Highland Clans
- **Tier II:** The Highlands, The Watercourses, The Waterworks, The Hammer Ponds (47)
- **Tier III:** The Mountain Terraces, The Mountain Sluices (58), The Barays (48), The Polders
- **Tier IV:** The Philosophers' Peaks; the Doctrines The Hydraulic Empire and The High Towns
- **The essentials:** science from The Highlands, The Mountain Terraces and The Philosophers' Peaks; food and production from fresh water.

## 5. Example councils

### Early, end of Tier I: the settlers of hard land (five chairs, a tier-4 government)

- **Chairs:** The Founding Furrow (0), The Seed Grain (0), The Hard Country (I), The Makers of Land (I), Levy of the Land (I). Held with no chair: The Gathering Grounds, The Desert and the Snow and Outposts. Doctrine: Bound to the Soil.
- **How it plays:** The seat founds its third and fourth towns on the desert edge and the cold coast that nobody else wants. Workers with 4 charges plant date gardens, build corrals and set fish traps. Each work is a hex of 5 where there was nothing, and each one adds 1 science and 1 culture to The Makers of Land. A levy turns the food into Granaries.

### Early, end of Tier II: the road realm (six chairs, a tier-10 government)

- **Chairs:** The Road Towns (I), The Grain Census (I), The Thermae (II), The Great Households (II), The Mansiones (II), The Tribute of Hands (II). Taken on the way: The Seven Fat Years, The Founders' Stores, and Commission: Bread and Water, which is met at twelve public works. Doctrine: The Curator of Waters.
- **How it plays:** Seven towns, each joined by road, each founded with a Granary. A joined town pays +4 production, and each of its public works pays 2 science, 1 culture, 2 happiness, 1 food and 1 production. A levy pays half again, so a town of 8 turns a citizen into 98 production every five turns.

### Late, Tier III then Tier IV: water and stone (eight chairs, then eleven)

- **Chairs at Tier III:** The Highlands (II), Old Workings, The Mountain Sluices, The Watercourses (II), The Cadastre, The Megalopolis, The Capitolia, The General Levy. Held with no chair: The Hammer Ponds, The Barays, The Gathering Grounds; the reward of The Reclaimed Lands. Doctrine: Crop Rotation. Tier IV adds The Water Boards, The Thousand Villages and The Keeps.
- **How it plays:** Each town has a baray in its fields and hammer ponds on its river hills. A hammer pond yields 5 production, then +4 from two mine cards, +2 from the town's four public works, and +3 science. The farms round the baray are watered. Crop Rotation costs the seat little, because its coast is in fish traps.

## 6. Pairs, leaders and great people

### What Expansionist gives and takes with each other deck

- **Dominion (Alexander):** Expansionist gives citizens to raise as soldiers and wide land to hold. It takes Military cards for its chairs and camps that claim land when cleared. The Citizen Soldiers (56) lets a levied army stand at no cost.
- **Commerce (Pachacuti):** Expansionist gives joined towns, road hexes and luxuries on claimed land. It takes gold, which buys hexes and workers, and caravans, which lay roads. A hammer pond is a mine, so Commerce's two mine cards pay it.
- **Devotion (Jayavarman VII):** Expansionist gives public works, fresh water and large towns, which his kit reads. Sacred Groves is reworked to pay every worked forest. It takes happiness and authority in devout towns.
- **Scientific (Nezahualcoyotl):** Expansionist gives many towns for empire buildings, and public works that pay science. The theme's pay-offs read Scientific's charter improvements too. It takes charters that open the Aqueduct early, and science.
- **Magisterial (Cyrus):** Expansionist gives claimed land for great-person works. Garden Cities is reworked to read improved tiles. It takes culture and the government's chairs.

### For the Commerce pass

- Two shared cards change, and neither is shared with Commerce: Sacred Groves (Devotion) and Garden Cities (Magisterial). The Country Fair, Market Gardens and The Provincial Fair stay as they are.
- **The rarity finding is not only this deck's.** The draw shows a rare in about 1 game of 9. You approved setting a rarity by how often a card should be seen, and the same count should be made for the other decks.
- **Roads are worth more to this seat.** The Road Towns pays +4 (09), The Mansiones pays culture for public works in joined towns (54), and The Beacons moves units inside the borders. Caravans lay roads, so the pair is stronger.
- **Mines.** A hammer pond counts as a mine, so The Mineral Trade and Mining Districts pay it.
- **A new improvement opens no resource.** A luxury under a date garden or an orchard is not opened, so a seat still wants the plantation there.

### Leaders and great people

The leader roster changed on 2026-11-20. Cyrus and Jayavarman VII are read on their new kits.

- **Alexander (with Dominion):** richer. The General Levy at Tier III and The Citizen Soldiers at Tier IV give The Royal Army units to read, and they cost no upkeep.
- **Pachacuti (with Commerce):** richer. He starts beside rivers, hills and mountains, which is hammer-pond ground. The Mountain Sluices, The Highlands and The Mountain Terraces pay his high country, and The Mansiones his roads.
- **Jayavarman VII (with Devotion), on today's kit:** the richest. His farms beside fresh water gain +1 food and +1 faith for every public work in their city. A baray gives fresh water to six more farms in each town. The Founders' Stores, Bread and Water, The Thermae and The Water Boards add and pay public works. The Mansiones reads the joined town his House of Fire needs.
- **Jayavarman VII, to test.** A baray with four public works is +4 food and +4 faith on each of six farms: +48 in a town from his own ability. That is his fantasy, and it may be too much.
- **Nezahualcoyotl (with Scientific):** richer. He starts beside a lake, so fish traps suit him at Tier 0. The Barays waters the farms that The Dikes pays, and The River Towns pays his large capital.
- **Cyrus (with Magisterial), on today's kit:** his capital gains culture for each Order seated in a Civic or Wildcard chair. Round four gives the deck three more Civic cards (The Makers of Land, The Cadastre, The Mansiones) and two commissions. The Workers of The King's Gardeners have seven charters' works to build.
- **Ibn Battuta:** no change.
- **Great people:** a hammer pond takes the mine legacies and a polder the farm legacies. No legacy names the other new improvements. One that did would close most of the gap in section 1 (r4-8).

## 7. Ready for the build

A builder follows this list once the fourth review is done. Each number is an entry in section 3.

### Rows to retire

- From rounds one and two: The Wild Orchards (03), The Burhs (05), The Gleaners (10), The Wide Country (14), and the Doctrine Arcadia (36).
- From round four, if you approve change 45: The Old Songs, The Tended Country, The Long Tending, The Garden of the World, and the Doctrines The Wildwood Compact and The Garden Peoples.
- Take the mark `tended` off the rows `fishTraps` and `wildOrchard`, and the gate `needsTendedWork` off every row.

### Data only: a number, a tier, a rarity or a wording

- 04 Levy of the Land: common, `lastBand` Tier II.
- 07 The Land Hunger: 50%, common.
- 09 The Road Towns: +4 production.
- 11 The Staked Claims: Tier I, rare.
- 15 The Great Colonies: Tier II, `fromLargest: 4`.
- 20, 26, 32: the rarities, as each entry lists them, less the cards that round four cuts.
- 21 The Engineers' Yards: Tier III, +4 production.
- 22 The General Levy: Tier III, uncommon, `everyAtWar: 2`.
- 25 The Mountain Terraces: 4 science and 2 production, uncommon.
- 29 The Philosophers' Peaks: +4 science, at most +12, common.
- 37 The Beacons: `lastBand`, so that it is dealt in Tiers I and II.
- 45: The Wild Marches, Bound to the Soil, Sacred Groves, Garden Cities; the wording of Outposts and The Domesday Survey.

### Data only: a new effect on a shape that exists

- 13 The Hedgerows. 16 The Great Households. 17 The Thermae. 31 The Thousand Villages.
- 08 Outposts and 28 The Keeps: `charter.unlocks` in place of `unlocksImprovement`.
- 51 The Cadastre. 53 The Founders' Stores. 54 The Mansiones. 57 The River Towns. 58 The Mountain Sluices. 56 The Citizen Soldiers (`freeUpkeep`).

### A shape to confirm or extend in code

- 01 The Gathering Grounds and 46 The Desert and the Snow: a charter that opens two works.
- 02 The Woodland Bands: the rule `woodsWalk`, widened to hills.
- 18 The Beacons: movement that depends on where the unit stands.
- 19 The Seven Fat Years: a citizen for every town as an on-draft grant.
- 24 The Polders: a charter; `countsAs: farm` with `yieldsAs` on one row; one charge; uncommon.
- 30 The Water Boards: a public-work selector on `buildingYieldPercent`.
- 47 The Hammer Ponds: a ground rule "beside a river" for an improvement.
- 49 The Reclaimed Lands and 50 The Makers of Land: a counted moment for an improvement built from a row that a charter opens.
- 52 Bread and Water: public works held, as a commission's goal figure.
- 55 The Tribute of Hands: a percentage on a levy's production. 56: a deal gate for a levy that raises a unit.

### New improvement rows, each with a board piece and a flair-gallery entry

- `dateGarden`: desert, no forest, +2 food and +1 gold.
- `reindeerCorral`: tundra and snow, no forest, +1 food and +2 production.
- `hammerPond`: a hill beside a river, +3 production, counts as a mine.
- `baray`: flat land, one in each town, +2 food, waters the hexes beside it.

### Other sheets and passes

- `docs/decks/devotion.md`: Sacred Groves. `docs/decks/magisterial.md`: Garden Cities. Both are in `data/decks/common.json`.
- The beliefs sheet: Spirits of the Wood reads unimproved forest and jungle, the last wild-land source in the game.
- The beliefs, great-people and wonders passes: no source names fish traps, orchards, date gardens, reindeer corrals, barays or keeps. One of each kind would bring these hexes near a farm in the busted case.
- `docs/decks/deck-design.md`: the section "Tended land" and the bonus theme of that name become history; "improvements where none could be built" takes their place.

### With the build

- The sheet `docs/decks/expansionist.md` and its sync test `test/sim/decks/expansionist.test.ts`: every changed row, the counts tables, and the "Needs tended land" line in the header.
- The bots: they build no card-opened improvement today (`src/ai/value.ts` prices a charter at nothing). A bot-track batch must teach them, or no bot seat will show the theme.

## 8. What to test first

1. **The Desert and the Snow.** Does a player found a town in desert or tundra because of it? Count the towns and the hexes built by turn 120.
2. **The Barays with Jayavarman VII.** Six watered farms in a town with four public works: +48 from his ability alone.
3. **The Hammer Ponds.** A hex that takes both the mine cards and the theme's pay-offs: 13 typical, 48 at most.
4. **The Reclaimed Lands and The Makers of Land.** Do they make the player build works they would not have built, and does that feel like a plan or like a round of clicks?
5. **Public works.** With Bread and Water, The Thermae, The Mansiones and The Mountain Sluices seated together, is a public work worth too much?
6. **The Tribute of Hands with Levy of the Land.** A levy at 98 production every five turns in each town.
7. **Crop Rotation with fish traps.** Its price falls for a coastal seat.
8. **Levy of the Land as a common in two tiers.** Is it an automatic pick?
9. **The charters.** Seven cards take no chair. Does a seat with five of them have too little to decide at the council?
10. **The rarities.** After the build, count what a seat is offered in Tiers III and IV over ten games.

## 9. What I could not determine

- No measurement of this deck exists since batches DS1 and DS3 (2026-11-10). The bots build no card-opened improvement, so the theme cannot be measured until they do. Every sum is arithmetic on the rows.
- The ground counts are from 48 starts on 8 standard maps (the first three rings, 36 hexes) and from the whole of those maps. They do not say where a player's later towns stand.
- How many of its hexes a town in desert or tundra can feed itself on. I did not model a town there.
- Whether an improvement may be built on desert hills and on a floodplain under the rule "on desert". I assumed hills yes and floodplain no.
- Whether a hammer pond's "beside a river" should read the hex's own river edges or any neighbour's. I counted the hex's own.
- Whether a commission's lasting reward counts as an Order's line for The Age of Improvement. The busted sums assume it does.
- What a Granary costs in production at Tier I. I did not work the size table through.
- Whether a citizen that a card grants counts as growth and as a new largest size (The Seven Fat Years with Granary Levies and The Grain Census).
- The offer figures come from my own model of the draw, not from games.
- The history behind the names is from my own knowledge, not from a source in the repo.

## Record: rounds one to three, and your rulings (2026-11-20)

### Round one

- The first form of this file proposed 36 changes (6 buff, 10 rework, 2 cut, 9 move, 5 new, 4 doctrine) and three options for tended land: A, cut it; B, flesh it out; C, fold it into the wild. It recommended C, with A as the runner-up, and listed the changes under A and B in two appendices.
- **The diagnosis of tended land.** A tended hex yields 4 in every age, level with a plain farm or mine. About 15 Orders and 3 Doctrines pay on improved hexes and skip tended hexes; four Orders paid on tended hexes. A charter was offered in about 6 games of 10, and a seat that took one was then offered about 1.1 pay-offs in a game. The bots never tend (`src/ai/value.ts`), so no measurement exists. The pay-offs were parasitic: no floor, and not even dealt without a charter.
- **Why the rest of the deck felt as it did.** The 60 / 30 / 10 draw hid the deck's rares: Tier III held 10 rares, each offered in 1 game of 9, and its four commons were offered in 19 games of 20. Levy of the Land was offered in 1 game in 4. Three cards for an open map came after the map was full. Some rares were weaker than commons (The Polders, The Mountain Terraces). Three cards were chores (seat, build, unseat). Military cards by tier were 1, 1, 0, 0, 2, and the deck had no boon.
- **The five questions, and the answers you approved by your second ruling:** tended land is folded into the wild (C); one charter opens both first works; a card's rarity is set by how often it should be seen; a card that opens a work is a charter; Levy of the Land is a common dealt in Tiers I and II.

### Your comments on the page in round one, in your words

| # | Card | Your words | Result |
|---|---|---|---|
| 01 | The Gathering Grounds | no comment | Approved. |
| 02 | The Woodland Bands | no comment | Approved. |
| 03 | The Wild Orchards | no comment | Approved. |
| 04 | Levy of the Land | no comment | Approved. |
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
| 16 | The Great Households | "let's rework: +1 production for every 2 citizens in a city." | Each town gains +1 production for every 2 citizens. Common. |
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
| 33 | Bound to the Soil | "for this to work, i think we need to make more unlockable tended tiles?" | Approved, and it also opens root-crop grounds (for the second review). |
| 34 | The Wildwood Compact | "sure" | Approved. |
| 35 | The Garden Peoples | "have this unlock a tended tile type too" | Approved, and it also opens terraced groves (for the second review). |
| 36 | Arcadia | "great" | Cut, as proposed. |

- The page: https://claude.ai/artifact/6cD6W4ym5WeUdMvUWDXaYf. You commented on changes 05 to 36.
- You then asked in chat: *"do you think we need more tended improvement draws for some of these cards to make sense?"* The answer was "more kinds of tended work, no more draws": four works on three cards, and no work on a card whose only job is to open it. It is section 2 of this file. Not proposed: a work for desert, tundra or marsh (too few hexes), and burning (a town's decision on a cycle, which is a new system).
- Your second ruling: *"yup no comment means approved, please fold these in and i'll do another review"*. So changes 01 to 04 are approved as proposed, and the five questions take their recommended answers.

### Your rulings on the second review, in your words

| Block | Your words | Result |
|---|---|---|
| new-1 Four tended works on three cards | "cool sounds good. How many cards today buff wild cards? For this to be meaningful, they need to pay off as much as improvements in the late game, which can get kind of busted with religious beliefs and great people." | Approved. A question, and a requirement: late in the game a wild hex must pay as much as an improved hex does with beliefs and great people on it. Section 1 answers it. |
| new-2 Root-crop grounds | "lets make it even better, +1 food and +2 production. it needs to be clearly better than a regular farm." | +1 food and +2 production. The advice to cut it to +1 food is rejected. |
| new-3 Terraced groves | "make it +2 food +1 culture instead, same reason as my previous comment" | +2 food and +1 culture. You did not answer on the name; "hill grove" is taken, as recommended. |
| new-4 Change 37, The Beacons also in Tier I | "sure" | Approved. |
| new-5 Change 38, The Old Songs names its terrain | "sure" | Approved. |
| new-6 The Great Colonies | "ok, lets do a fourth." | Towns you found start with a fourth of the citizens of your largest town. |
| new-7 The Land Hunger | "common" | Common, at 50%. |
| new-8 The Burhs | "cut" | The card leaves the deck. |
| new-9 The other two lines | "Yup sounds good" | The Great Households and The General Levy stand. |

- The rule you stated for tended works: a tended work is clearly better than the plain improvement on the same ground. It reverses the design doc's older line that a tended work yields less than an improvement.
- In round two I advised that root-crop grounds give +1 food only, and that The Great Colonies at a fifth was under the bar. You raised both figures.

### Round three, and your ruling for round four

- Round three answered your question on wild land. After all rulings the deck had 8 cards that paid on a wild hex and 19 that paid on an improved hex. Outside the deck, 85 sources paid an improvement and 1 paid a wild hex: 33 cards of other decks, 8 beliefs, 21 great people, 7 wonders, 2 luxuries, 5 buildings, 4 technologies and 5 leaders.
- One hex in Æra IV, typical: a wild hex 12 to 15, a farm or mine 12. Busted: a wild hex 17 to 21 (31 in woods), a mine 38, a farm 47.
- It proposed six changes (39 to 44) to give the wild a second economy: a higher orchard, counters that counted tended tiles, a commission, a Doctrine that let outside sources reach tended works, and towns that tended by themselves. None was ruled.
- You then wrote: *"i'm feeling more skeptical that the wild land is a good direction for the expansionist deck, what do you think? i think the core themes are already fun, and we can find more cards to flesh out its current direction, maybe add a few auxiliary themes to make up for the card count"*.
- Your ruling for round four, whole: *"let's do this: i like the idea of adding new improvements where previously improvements couldn't be built. i.e. fish traps allows you to build improvements on coast tiles where you couldn't previously. keeps are very fun because they're a new way to interact with the land. let's add a few more of these, and get rid of cards like old song. some ideas off the top of my head: an improvement that can only be built in desert, one for tundra, an improvement that can only be built adjacent to certain combinations of terrains (not prescriptive, just a direction). public works, levies, settling and roads are great directions. i agree with your auxiliary themes too. The frontier seems weaker to me. Lets do a fourth pass with these directions, try to add a few that make the auxiliary directions synergize with the deck at large."*

## The user's rulings on round four (2026-11-20, comments on the page)

The user: "ok made comments, its heading in the right direction." In their
words:

### On the pass as a whole

- "overall, the new cards are good. Could we add some more love for lumber
  mills or forest tiles in general? it feels like it's just better to chop
  them currently"

### The new improvements

| Thing | The user's words | Result |
|---|---|---|
| Fish traps and orchards (change 01) | "fish traps: +2 food +1 production. Orchards: +2 food +2 gold" and "Reasoning: these need to be competitive and worth a builder charge. orchards need to be clearly better than a lumbermill" | Fish traps: +2 food, +1 production. Orchards: +2 food, +2 gold. |
| Date garden (46) | "this doesn't feel very strong. lets make something unique: nazca lines (non-floodplain flat desert). +2 faith +2 culture. additional +2 faith for every adjacent nazca line." | Replaced by **Nazca lines**: on flat desert that is not floodplain; +2 faith and +2 culture, and +2 faith more for each Nazca line beside it. |
| Reindeer corral (46) | "someting similar to nazca line here" | Replaced. **Owed:** a tundra improvement of the same kind: a monument on the land that pays faith or culture and reads its neighbours. |
| Hammer pond (47) | "i don't know what a hammer pond is, lets find something unique to put here too" | Replaced. **Owed:** something unique for a hill beside a river (or another mixed ground), that a player knows by name. |
| Baray (48) | "Rework: must be built next to a river. +2 food and +2 production for each adjacent farm." | The baray is built beside a river. It gains +2 food and +2 production for each farm beside it. (My reading: the yield is on the baray's hex and counts farms. To confirm: "+2 food and +2 production for each adjacent farm" could also mean the base yield is +2 food, plus +2 production a farm.) |
| The name of the theme (on 51) | "should we just call these 'unique improvements' and extend it to leader special improvements, like the paradise gardens?" | **A question for me; answered in chat. Proposed: yes.** |

### The other changes

| # | Card | The user's words | Result |
|---|---|---|---|
| 45 | The wild cards, row "Reworded: Workers may build fish traps…" | "great" | Approved. |
| 45 | row "+1 culture for every five hexes you own" | "Cut" | Cut. |
| 45 | Bound to the Soil, "Workers gain +1 charge. Farms gain +1 food." | "needs to be stronger" | **Owed:** a stronger line. |
| 45 | rows "on an unowned hex within three hexes of your border", "improved tiles", the row that stays, and the Monument town rework | "good", "good", "good", "sure" | Approved. |
| 49 | Commission: The Reclaimed Lands | "great" | Approved. |
| 50 | The Makers of Land | "lets have this be generic: +1 science and +1 culture for every 3 improvements you construct." | Gains +1 science and +1 culture for every 3 improvements you build, of any kind. |
| 51 | The Cadastre | "great" | Approved. |
| 52 | Commission: Bread and Water | "cool" | Approved. |
| 53 | The Founders' Stores | "cool" | Approved. |
| 54 | The Mansiones | "this feels pretty weak." | **Owed:** a stronger card, or a cut. |
| 55 | The Tribute of Hands | "The wording in this is confusing to me. let's cut this." | Cut. |
| 56 | The Citizen Soldiers | "too specific i think" and "if we want to do this it should be more genrally useful" | Rejected as written. **Owed:** a more general Military card, or none. |
| 57 | The River Towns | "i think we have plenty of river bonuses already, cut." | Cut. |
| 58 | The Mountain Sluices | "Mines and quarries gain +1 production for each adjacent mountain, mine, or quarry." | The user's line. |

Rows of change 45 with no comment are approved (the standing rule).
