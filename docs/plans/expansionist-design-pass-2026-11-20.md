# Expansionist design pass (2026-11-20)

**Status, 2026-11-20, third round:** rounds one and two are ruled. Of 38 changes, 26 are approved, 6 carry your own text, 5 are cut and 1 is kept as it is today. Nothing is built, and no game data changed. **What waits for your third review:** the answer to your question about wild land (the counts and the Æra IV comparison), and six new changes (39 to 44) that close the gap. They are all in section 1.

Your request, 2026-11-20, in your words:

> *"ok, could you do a deck pass on commerce and expansionist. I find that i don't really take any of the tended land cards in this version of the game, and commerce feels a bit one-note. I'm not sure whether to drop the tended land theme altogether or make it more fleshed out, what do you think?"*

- This file is the current state. The record of rounds one and two, with your words, is at the foot.
- Your rule from round two: **a tended work is clearly better than the plain improvement on the same ground** (*"it needs to be clearly better than a regular farm"*). It reverses the older line in `docs/decks/deck-design.md`, which says a tended work yields less than a proper improvement.
- Your question from round two: *"How many cards today buff wild cards? For this to be meaningful, they need to pay off as much as improvements in the late game, which can get kind of busted with religious beliefs and great people."* Section 1 answers it.
- Every number is a first guess against the power bar, to tune in playtest. I ran no bot games and no tests. I counted rows in the data files and in the three pass documents.
- The review page: https://claude.ai/artifact/6cD6W4ym5WeUdMvUWDXaYf. Its anchors are `change-01` to `change-44` and `r3-1` to `r3-10`.

## 1. New for your third review

Only these ten blocks are not ruled. Everything else in this file is ruled and waits for the build.

### r3-1. How many cards pay on wild land, and how many on improved land

- After all your rulings, this deck has **11 cards that read wild land**. Eight of them pay on the hex: 5 Orders (one shared) and 3 Doctrines.
- It has **23 cards that read improved land**. Nineteen of them pay on the hex: 13 Orders (two shared) and 6 Doctrines.
- The Local Census and The Domesday Survey count improved and tended tiles alike, so they serve both.

**Wild land, in this deck**

| Card | Tier | Kind | What it does on wild land |
|---|---|---|---|
| The Gathering Grounds | 0 and I | uncommon, charter | opens fish traps and orchards |
| The Old Songs | I | common | +2 culture on worked wild forest, jungle and hills |
| The Wild Marches | I | common | +1 culture for every four wild hexes you own (a count, not on the hex) |
| The Standing Woods | II | uncommon | +3 production on worked wild forest and jungle |
| The Long Tending | III | rare | doubles what your Orders pay on wild hexes |
| The Garden of the World | IV | uncommon | +2 food, +1 production, +1 culture on every worked wild hex |
| Sacred Groves (shared with Devotion) | 0 | uncommon | +1 food, +1 faith on worked wild forest |
| Garden Cities (shared with Magisterial) | I | uncommon | +1 culture for every three wild tiles a Monument town works (a count) |
| Bound to the Soil | I | Doctrine | +1 food on tended tiles; opens root-crop grounds |
| The Wildwood Compact | II | Doctrine | +1 food, +1 production on worked wild forest and jungle; tending is free |
| The Garden Peoples | III | Doctrine | +1 food, +1 production, +1 culture on every worked wild hex; opens hill groves |

**Improved land, in this deck**

| Card | Tier | Kind | What it does on improved land |
|---|---|---|---|
| Smallholdings | 0 | common | +1 food, +1 gold on farms and pastures |
| The Rope Stretchers | 0 | common | +1 science for every three improved tiles (a count) |
| Dark Earth | I | uncommon | +2 food on farms that have stood 20 turns |
| The Three Sisters | I | common | +2 food, +2 production on farms beside a plantation or pasture |
| Commission: Break the Sod | I | common | reward: +1 food on farms, with no chair |
| The Watercourses | II | uncommon | +2 production on farms beside fresh water |
| The Highlands | II | common | +2 science, +1 production on hill mines and quarries |
| The Coast | II | common | +3 food, +3 culture on fishing boats |
| The Hedgerows | II | common | +3 food on farms beside forest or jungle |
| The Engineers' Yards | III | common | +4 production on improvements beside a manufactory |
| Old Workings | III | common | +3 production on mines, quarries and lumber mills |
| The Age of Improvement | III | rare | doubles what your Orders pay on improved hexes |
| The Polders | III | uncommon, charter | opens polders, which are farms |
| The Keeps | IV | rare, charter | opens the Keep |
| The Ambarvalia (shared with Devotion) | 0 | common | +1 faith for every two improved tiles (a count) |
| The Provincial Fair (shared with Commerce) | II | uncommon | +2 gold on plantations, camps and pastures |
| The Sculpted Landscape (shared with Magisterial) | III | uncommon | +2 food, +2 culture on farms beside a great-person work |
| Bound to the Soil | I | Doctrine | +1 food on farms |
| The Georgics | II | Doctrine | +1 production on improvements that have stood 20 turns |
| Crop Rotation | III | Doctrine | an improvement's own bonus is doubled; wild hexes yield nothing |
| The Physiocrats | IV | Doctrine | +2 food, +2 production, +2 gold on every improved hex |
| The Builder Kings | III | Doctrine | +2 production on manufactories for each wonder in the town |
| The Cathedral Lodges | IV | Doctrine | manufactories yield double |

- Where the wild cards pay matters as much as their number. On a tended forest, eight of them pay. On open ground and on water, two Orders and two Doctrines pay (The Garden of the World, The Long Tending, Bound to the Soil, The Garden Peoples). Before Tier III, nothing but Bound to the Soil pays on open ground.
- **To rule:** Nothing to rule. This is the answer to your question.

### r3-2. What pays an improvement from outside the deck

- I counted every source outside this deck that pays on a hex with an improvement, or names an improvement, and pays nothing on a wild hex.

**Outside the deck**

| Source outside the deck | Pay on an improvement and not on a wild hex | Of these, on a farm, mine, pasture, camp, plantation, quarry, boat or mill | Pay only on a wild hex |
|---|---|---|---|
| Generic cards (no deck) | 0 | 0 | 0 |
| The other five decks, and the cards they share | 33 | 10 | 0 |
| Beliefs (56 live) | 8 | 7 | 1 (Spirits of the Wood) |
| Great people, as the pass rules them | 21 | 20 | 0 |
| Wonders, as the review rules them | 7 | 4 | 0 |
| Luxuries' signatures | 2 | 2 | 0 |
| Buildings | 5 | 5 | 0 |
| Technologies (an improvement's later bonus) | 4 | 4 | 0 |
| Leaders of the new roster | 5 | 4 | 0 |
| **All** | **85** | **56** | **1** |

- **The other decks:** Dominion 6 (The Horse Herds, The Naadam, The Mesta on pastures and camps; three on citadels), Commerce 4 (The Mineral Trade, Mining Districts, The Emporia, The Customs Houses), Devotion 5 (Lay Offerings; four on holy sites), Scientific 6 (all on Academies), Magisterial 8 (The Quarry Gangs; seven on great-person works), and 4 that two of those decks share.
- **Beliefs:** Keeper of the Calendar and Vineyard Rites (plantations), Lady of the Hunt (camps), Lord of the Sea (fishing boats), The Stone Hoard (mines and quarries on a resource), Herd Gods (pastures), Harvest Blessing (farms), Ecclesia (holy sites).
- **Great people:** on farms Li Bing, Jang Yeong-sil, Zheng Guo, Iddin-Marduk and Eupalinos; on mines Ea-nāṣir, Maria Hebraea and Su Song; on quarries Michelangelo, Thutmose and Ineni; on plantations Thales and Tiruvalluvar; on pastures Lamassī and Tomyris; on fishing boats Hippalus, Artemisia and Willem Beukelszoon; on lumber mills Wenamun; Widow Qing on improved strategic resources; Ferdowsi on great-person works.
- **Wonders:** The Temple of Artemis (camps, pastures), The Great Lighthouse (fishing boats), The Hanging Gardens (farms beside fresh water), Angkor Wat (improved resources, holy sites), The Mausoleum, The Great Library, The Pyramid of the Sun.
- **Buildings:** the Stable (pastures, camps), the Shipyard (fishing boats), the Smithy (mines and quarries on a resource), the Plantation House, The Horde Camp.
- **Technologies:** Irrigation (+1 food on a farm beside fresh water), Prospecting (+1 production on a mine), The Cataphract (+1 production on a pasture), Currency (+1 gold on a plantation).
- **Leaders:** Pachacuti (farms beside mountains), Nezahualcoyotl (farms in Aqueduct towns), Jayavarman VII (farms beside fresh water, for each public work), Mansa Musa (mines and camps), Justinian (holy sites).
- **About 24 more sources pay by terrain or resource and reach a wild hex too:** for example The Hydraulic Empire (fresh water), Petra (desert), Tapputi (luxury hexes), Li Bai (beside a river or a mountain), Bashō (forest and jungle), the Lighthouse (water).
- **To rule:** Nothing to rule.

### r3-3. One hex in Æra IV: improved against wild

- One hex in Æra IV. **Typical** is: the hex and its technologies, two of the theme's Doctrines, two Order lines, and one belief and one great person where any can pay. **Busted** is every line that this deck and the outside sources can put on the hex, with no leader. The figure in each cell is the sum of the six yields.

**The sums, after your rulings and before changes 39 to 44**

| Hex | The hex and its technologies | Typical: the lines | Typical | Busted: the lines | Busted |
|---|---|---|---|---|---|
| **Watered farm** | grassland 2, farm +1, Irrigation +1: **4** | Bound to the Soil +1, The Georgics +1; Dark Earth +2, The Watercourses +2; Harvest Blessing +1; Li Bing +1 | **12** | Doctrines 10 (with Crop Rotation +2, The Physiocrats +6); six farm Orders 14, doubled by The Age of Improvement: 28; Harvest Blessing 1; Li Bing and Jang Yeong-sil 3; The Hanging Gardens 1 | **47** |
| **Mine on a hill** | hill 2, mine +1, Prospecting +1: **4** | The Georgics +1; The Highlands +3, Old Workings +3; Maria Hebraea +1 | **12** | Doctrines 9; The Highlands, Old Workings and The Engineers' Yards 10, doubled: 20; Su Song, Maria Hebraea and Ea-nāṣir 5 | **38** |
| **Plantation on wine** | grassland 2, wine 2, plantation +2, Currency +1: **7** | The Georgics +1; no Order of this deck; Vineyard Rites +2; Tiruvalluvar +2 | **12** | Doctrines 10; with Commerce, The Country Fair, The Provincial Fair and The Emporia 5, doubled: 10; two beliefs 3; Thales, Tiruvalluvar and Tapputi 6 | **36** |
| **Root-crop ground** | grassland 2, work +3: **5** | Bound to the Soil +1, The Garden Peoples +3; The Garden of the World +4 (the only Order that pays here) | **13**, and 9 without that Order | the same Doctrines 4; The Garden of the World doubled by The Long Tending: 8 | **17** |
| **Orchard in forest** | forest 2, orchard +2: **4** | Bound to the Soil +1, The Wildwood Compact +2; The Old Songs +2, The Standing Woods +3 | **12** | three Doctrines 6; The Old Songs, The Standing Woods and The Garden of the World 9, doubled: 18; Spirits of the Wood 2; Bashō 1 | **31** |
| **Hill grove** | hill 2, grove +3: **5** | The Garden Peoples +3, Bound to the Soil +1; The Old Songs +2, The Garden of the World +4 | **15**, and 11 without The Garden of the World | the same Doctrines 4; the two Orders 6, doubled: 12 | **21** |
| **Fish traps on coast** | coast 2, traps +2, a Lighthouse +1: **5** | Bound to the Soil +1, The Garden Peoples +3; The Garden of the World +4 (the only Order that pays here) | **13**, and 9 without that Order | the same Doctrines 4; The Garden of the World doubled: 8 | **17** |

- **Typical against typical, the wild is level today: 12 to 15 against 12.** Your new figures for the works did that.
- **But on open ground, on hills and on water it rests on one card.** The Garden of the World is the only Order that pays on a root-crop ground or on fish traps, and it is a Tier IV uncommon. Without it those hexes yield 9, and a hill grove 11: 1 to 3 behind.
- **Busted against busted, the wild is at about half.** A farm reaches 47, a mine 38 and a plantation 36. A root-crop ground and fish traps reach 17 and a hill grove 21. Only the woods come close, at 31, because five wild cards pay there.
- **The cause is the count, and the outside sources.** On the hex, this deck has 19 payers for improved land (13 Orders, 6 Doctrines) and 8 for wild land (5 Orders, 3 Doctrines). Outside the deck, 85 sources pay an improvement and 1 pays a wild hex. Every belief and great person a seat takes can land on a farm, and none can land on a root-crop ground.
- A leader adds to the improved side only: Nezahualcoyotl +2 on a farm in an Aqueduct town, and Jayavarman VII +8 on a watered farm in a town with four public works.
- The orchard is at today's figure in this table. Change 39 raises it by 1.
- **To rule:** Nothing to rule. Say if a line in a sum looks wrong to you.

### r3-4. What I recommend

- **Do not raise the wild's own numbers again.** Typical against typical it is level. Close the gap in the two places where it is real.
- **1. Depth.** Give every wild ground a second and a third line, so that the wild seat does not rest on one Tier IV uncommon. Change 42 is a Tier III commission whose reward pays on every wild hex and takes no chair. Change 41 lets The Sculpted Landscape pay tended tiles beside a great-person work. Change 40 lets the two cards that count improved tiles count tended tiles too, which brings science and faith.
- **2. The outside sources.** Change 43 is a Tier IV Doctrine: for everything that is not an Order or a Doctrine, a root-crop ground is paid as a farm, a hill grove as a mine and an orchard as a lumber mill. A wild seat's beliefs, great people, wonders, buildings and technologies then land on its hexes as they would on improvements. The hex stays wild for every card.
- **This is Arcadia's idea in a narrower form, and I propose it knowing you cut Arcadia.** Arcadia made a tended hex count as improved for every card, so the hex stopped being wild and the two sides of the deck merged. That reason does not apply here: no card reads the hex differently. The other reason for the cut does apply: Tier IV would hold seven Doctrines again, against a target of three to five. I still propose it, because your new requirement cannot be met by cards alone while 85 outside sources name improvements, and the other passes add more of them. If you want six Doctrines, The High Towns is the one I would cut: its rule is The Mountain Terraces' rule.
- **3. Your rule, applied to the two works that are in the game.** Fish traps pass it: nothing else can be built on open water. The orchard does not: it is 1 above a lumber mill and level with felling the forest and farming. Change 39 makes it +2 food and +1 gold.
- **4. The chore.** Change 44 makes the towns do the tending under The Wildwood Compact. It is in its own block, r3-10.
- **What I do not propose.** No pay "for each age": a Tier IV Doctrine is taken in Æra IV, so it would be a flat figure in practice. No new Military card: no honest Military card pays a hex. No flat bonus on all wild land before Tier III: your note of 2026-09-03 stands.

**The wild hexes, before and after**

| Wild hex | Typical today | Typical with 39 to 43 | Busted today | Busted with 39 to 43 | The improvement it is measured against |
|---|---|---|---|---|---|
| Root-crop ground | 13 (9) | 15 (11 or 13 with one of the two Order lines) | 17 | 26, and 34 beside a great-person work | watered farm: 12 and 47 |
| Orchard in forest | 12 | 13, and 15 with the commission's reward | 31 | 38 | watered farm: 12 and 47. A lumber mill is 9 and about 28 |
| Hill grove | 15 (11) | 15, and 17 with the commission's reward | 21 | 31 | mine: 12 and 38 |
| Fish traps on coast | 13 (9) | 15 (11 or 13) | 17 | 21 | nothing can be built on open water |

- After the changes the wild is 13 to 15 typical against 12, with two Order lines on every ground. Busted it reaches 21 to 38, under the improved side's 36 to 47.
- The wild seat still gives up three things: every resource under a tended hex, The Physiocrats' +6, and the cards that double or count improvements.
- **To rule:** Rule on changes 39 to 44 one by one, below. This block is the summary.

### r3-5. Change 39 (new): the orchard gives +2 food and +1 gold

- Your rule: a tended work is clearly better than the plain improvement on the same ground. An orchard makes a forest yield 4. A lumber mill makes it 3, and a farm on the felled ground yields 3 or 4. That is not clearly better.
- At +2 food and +1 gold a forest orchard yields 3 food, 1 production and 1 gold (5), as a root-crop ground and a hill grove do. Fish traps stay at +1 food and +1 production: on open water a worker can build nothing else.

- **To rule:** Approve or reject change 39.

### r3-6. Change 40 (new): the cards that count improved tiles count tended tiles too

- The Local Census and The Domesday Survey count improved or tended tiles. The Rope Stretchers (science) and The Ambarvalia (faith) count improved tiles only.
- With one rule for all four, a wild seat gets the same science and faith from its land as a field seat. No number changes.

- **To rule:** Approve or reject change 40. The Ambarvalia is shared with Devotion.

### r3-7. Change 41 (new): The Sculpted Landscape also pays tended tiles

- Today: farms beside a great-person work gain +2 food and +2 culture. Proposed: farms and tended tiles beside a great-person work.
- It is the bridge to Magisterial that the pair notes ask for (works beside tended land), and a second Tier III line on open ground and water.

- **To rule:** Approve or reject change 41. The card is shared with Magisterial.

### r3-8. Change 42 (new): Commission: Keep the Wild

- Tier III, uncommon, Wildcard. Goal: work 20 wild tiles. Reward: worked wild tiles gain +1 food and +1 production.
- A seat that keeps its land wild reaches the goal by playing its plan. The reward takes no chair. The deck has four Wildcard cards and, after the cut of The Wide Country, no commission in Tiers II and III.

- **To rule:** Approve or reject change 42.

### r3-9. Change 43 (new): The Satoyama, a Tier IV Doctrine

- For everything but your Orders and Doctrines, a root-crop ground is paid as a farm, a hill grove as a mine and an orchard as a lumber mill.
- On a watered root-crop ground that is Irrigation +1, one belief +1 and one great person +1 or +2 in a typical seat, against The Physiocrats' +6 on the other side. It grows with every belief, great person and wonder the seat takes, which is what your question asks for.
- It is a new shape, and the largest piece of engine work in this round. If you do not want a "counts as" rule, the plain form uses a shape that exists.
- Satoyama is the Japanese name for the managed land between a village and the wild hills: woods cut for poles, ponds, grass and small fields, all kept and none of it cleared.

- **To rule:** Approve it, take the plain form (tended tiles gain +2 food, +2 production and +2 culture), or reject it.

### r3-10. The chore: does every seat now tend every hex? And change 44 (new)

- **What stops it today.**
- *The cards that open the works.* A Doctrine hand is three cards from both decks' Doctrines of the tier: 7 or 8 in Tier I and 10 or 11 in Tier III. So about 2 seats in 5 are offered Bound to the Soil and about 3 in 10 The Garden Peoples. Most seats can tend woods and water and nothing else.
- *Charges.* A Worker has 3 and its price rises by 2 each time. The 16 hexes around a capital are 6 Workers. Only a hex a citizen works pays, and a town of 10 works 10.
- *Resources.* A tended work opens no resource. On an average start 4.2 hexes of 18 carry one, and a luxury is worth 4 happiness and a trade.
- *The cards the seat holds.* A watered farm with two farm Orders yields 12. A root-crop ground in a seat with no wild card yields 6. A seat tends where its cards pay and farms where its cards pay.
- *Leaders and Doctrines.* Pachacuti, Nezahualcoyotl and Jayavarman VII are paid on farms. Crop Rotation makes every wild hex yield nothing.
- **So no limit is needed for a seat that pays charges.** It lays a root-crop ground where it would have laid a farm: the same number of orders to a Worker.
- **The chore is The Wildwood Compact.** Its second line makes tended works free, and a free work on 16 hexes of every town is a round of clicks with no decision in it.
- **Change 44:** the Doctrine's second line becomes "Each turn, each of your towns tends one wild tile it works." Each ground has one work, so there is nothing to choose. A town tends only the works its seat can lay.

- **To rule:** Approve or reject change 44. Say if you want a limit on tended works as well; I recommend none.

## 2. Tended land: the rule, and four works on three cards

- **Tended land is folded into the wild-land theme** (option C, round one). The gate "Needs tended land" goes from every row, and every pay-off reads wild hexes, untouched or tended.
- **Your rule (round two): a tended work is clearly better than the plain improvement on the same ground.** `docs/decks/deck-design.md` says the opposite ("tended works yield less than a proper improvement"). That line is reversed, and the design doc needs the edit when the build lands.
- **Four works on three cards** (approved in round two). No work has a card whose only job is to open it.
- **The fork.** The field: improved hexes, The Age of Improvement, the Doctrine Crop Rotation. The wild: wild hexes, The Long Tending, the Doctrine The Garden Peoples. A hex is one or the other.

### The four works

| Work | Ground | Yield | The card that opens it | State |
|---|---|---|---|---|
| Fish traps | coast and lake | +1 food, +1 production | The Gathering Grounds (01), charter, Tiers 0 and I | in the game |
| Orchard | forest and jungle | +1 food, +1 gold today. **+2 food, +1 gold if you approve change 39** | The Gathering Grounds (01) | in the game |
| Root-crop grounds | wild grassland and plains, no hills, no forest | +1 food, +2 production (your figure) | Bound to the Soil (33), Doctrine, Tier I | approved, to build |
| Hill groves | wild hills, no forest | +2 food, +1 culture (your figure) | The Garden Peoples (35), Doctrine, Tier III | approved, to build |

A work is not an improvement. It is still wild, it is permanent, it costs one worker charge, and it opens no resource.

### Each work against the plain improvement on its ground

From `data/terrain.json` and `data/improvements.json`. The figure in brackets is the sum.

| Hex | Untouched | Tended | The plain improvement on that hex | Clearly better? |
|---|---|---|---|---|
| Coast | 1 food, 1 gold (2) | 2 food, 1 production, 1 gold (4) | none, unless a sea resource is there | yes: nothing else can be built |
| Lake | 2 food (2) | 3 food, 1 production (4) | almost none | yes |
| Forest | 1 food, 1 production (2) | today 2 food, 1 production, 1 gold (4). With change 39: 3 food, 1 production, 1 gold (5) | lumber mill: 1 food, 2 production (3). Felled and farmed: 3 or 4 | **no, at today's figure.** Yes with change 39 |
| Jungle | 2 food (2) | today 3 food, 1 gold (4). With change 39: 4 food, 1 gold (5) | lumber mill: 2 food, 1 production (3) | **no, at today's figure.** Yes with change 39 |
| Grassland | 2 food (2) | 3 food, 2 production (5) | farm: 3 food (3), or 4 beside fresh water | yes: 5 against 3 or 4 |
| Plains | 1 food, 1 production (2) | 2 food, 3 production (5) | farm: 2 food, 1 production (3), or 4 beside fresh water | yes |
| Hill | 2 production (2) | 2 food, 2 production, 1 culture (5) | mine: 3 production (3), and 4 in age 4 | yes: 5 against 3 or 4 |

### What a seat can tend on a typical start

| What the seat holds | Ground it can tend | Hexes of 18 | Share |
|---|---|---|---|
| The charter only | woods 4.6, coast and lake 2.9 | 7.5 | 42% |
| The charter and Bound to the Soil (Tier I) | and open grassland and plains 6.1 | 13.6 | 76% |
| The charter and both Doctrines (Tier III) | and bare hills 2.8 | 16.4 | 91% |

- I counted the first two rings around each of 48 starts on 8 standard maps (`newGame`, six seats). The other 1.6 hexes are mountain, desert and tundra.
- 83% of starts have 3 or more hexes of woods or water, so the charter alone has something to act on in 5 starts of 6. 25% of starts have no coast or lake at all.
- 79% of starts have 3 or more hexes of open ground, and 71% have 2 or more bare hills.
- A town works one hex for each citizen. A capital of 6 citizens needs 6 tended hexes at most, which is two Workers (20 production), or one Worker with Tinkers' Guild and Bound to the Soil (5 charges).

### The new works against the code's rules for a tended work

- **Not an improvement, still wild.** A row marked `tended` in `data/improvements.json` answers `unimproved` and not `improved` for every card (`tileConditionHolds`). Both new works are rows with that mark.
- **Permanent.** A tended row cannot be pillaged (`pillageError`). A worker can still lay another work over it, because any work replaces what stands on the hex (`improvementGroundError` refuses only the same work). So a farm can replace a root-crop ground, and a root-crop ground can replace a farm, each for a charge.
- **One charge.** `chargeCost: 1` on the row. The rule `tendedWorksFree` reads the mark, so The Wildwood Compact covers both new works with no change (and change 44 would replace that rule).
- **No resource opened.** A row opens a resource only if it names it in `improvesResource`. Neither row names one.
- **The ground.** Root-crop grounds: `validTerrain` grassland and plains, `validFeatures` none, no hills. The retired row `burnedCountry` has this ground rule and is the model. Hill groves: `requiresHills`, any land terrain, `validFeatures` none. Culture in a work's yields exists (the Landmark has it).
- **The shape that is missing: a Doctrine that opens a work.** Today a tended row opens through a charter on an Order (`charter.unlocks`), or through the effect `unlocksImprovement` on a seated card. The effect `unlocksImprovement` on the Doctrine's row should do it: `liveEffects` walks eleven sources and a held Doctrine is one. To confirm in code: that the refusal sentence (`improvementCardError`) can name a Doctrine. Today it names an Order.
- **Also needed:** two new rows in `ImprovementId` (`rootCropGrounds`, `hillGrove`), a piece on the board for each, and a place in the flair gallery (`flair.html`), as CLAUDE.md asks for every new visual.
- **The bots** lay no tended work today. The cards work without that. A bot-track batch must teach them before the wild can be measured.

## 3. Index

| # | Card | Tier | Change | Ruling | In the third review |
|---|---|---|---|---|---|
| 01 | The Gathering Grounds (was The Fish Traps) | I to 0 and I | rework | approved |  |
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
| 12 | The Standing Woods (was The Tended Country) | II | rework | approved |  |
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
| 23 | The Long Tending | III | rework | approved |  |
| 24 | The Polders | III | rework | approved |  |
| 25 | The Mountain Terraces | III | buff | approved |  |
| 26 | Tier III rarities | III | move | approved |  |
| 27 | The Garden of the World | IV | rework | approved |  |
| 28 | The Keeps | IV | rework | approved |  |
| 29 | The Philosophers' Peaks | IV | buff | approved |  |
| 30 | The Water Boards | IV | new | approved |  |
| 31 | The Thousand Villages | IV | new | approved |  |
| 32 | Tier IV rarities | IV | move | approved |  |
| 33 | Bound to the Soil | I | doctrine | approved with your text |  |
| 34 | The Wildwood Compact | II | doctrine | approved |  |
| 35 | The Garden Peoples | III | doctrine | approved with your text |  |
| 36 | Arcadia | IV | doctrine | cut |  |
| 37 | The Beacons | II, also dealt in I | move | approved |  |
| 38 | The Old Songs | I | rework | approved |  |
| 39 | The orchard | 0 and I | buff | new, not ruled | yes |
| 40 | The Rope Stretchers and The Ambarvalia | 0 | rework | new, not ruled | yes |
| 41 | The Sculpted Landscape | III | rework | new, not ruled | yes |
| 42 | Commission: Keep the Wild | III | new | new, not ruled | yes |
| 43 | The Satoyama | IV | doctrine | new, not ruled | yes |
| 44 | The Wildwood Compact | II | doctrine | new, not ruled | yes |

Of the 38 ruled changes: 26 approved, 6 approved with your text, 5 cut, 1 kept as today. Changes 39 to 44 are new.

## 4. The changes, with the rulings applied

"To build" is the line a builder follows. "Today" is the card in `data/decks/expansionist.json` now.

### 01. The Gathering Grounds (was The Fish Traps) (approved)

- **Ruling:** Approved. No comment, so approved by your ruling of round one.
- **Tier, rarity, type:** Tiers 0 and I, uncommon, Economic, charter (now Tier I, common)
- **Today:** Tier I, common: Workers may build fish traps on lake and coast tiles: +1 food and +1 production.
- **To build:** Dealt in Tiers 0 and I, uncommon: Workers may tend wild land: fish traps on coast and lake tiles (+1 food, +1 production) and orchards in forest and jungle (+1 food, +1 gold).
- **Why:** You liked this card at Tier 0. Batch DS1 moved it to Tier I, where a charter that adds 2 to a hex is small. One card now opens both works, so the pick is good on a coast, beside a lake or in woods, and the second charter is not needed (change 03). The name changes because the card opens more than fish traps. It is named for the grounds a people returns to each season to fish and to gather.
- **Arithmetic:** In age 1 a farm on grassland yields 3 and a mine on a hill yields 3. A tended coast or forest hex yields 4. Three tended hexes worked by turn 40 add 6 a turn, which is a regular Tier 0 card (4 to 8), for 3 charges (one Worker, 10 production). The card takes no chair. In my model of the draw, a Tier 0 uncommon of this deck is offered in 6 to 8 games of 10 today, when the deck has two of them. With three it is a little less, and this card is dealt again in Tier I.
- **Synergy:** Raises: the yield of wild hexes. Reads: nothing. A tended hex is still wild, so Sacred Groves, Garden Cities, The Standing Woods (12), The Long Tending (23) and The Garden of the World (27) pay on it too. The Local Census and The Domesday Survey count it. Tinkers' Guild (06) and Bound to the Soil (33) give the charges to lay it.
- **Shape:** Near an existing shape. A charter unlocks one work today (`charter.unlocks.improvement`); this one names two. `lastBand` deals a card in two tiers; it exists, and no dealt row uses it today.
- **Note:** This card opens two of the four tended works. The other two ride on Bound to the Soil (33) and The Garden Peoples (35). Change 39 proposes that the orchard gives +2 food and +1 gold, under your rule that a tended work is clearly better than the plain improvement.

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

- **Ruling:** Cut. No comment, so approved by your ruling of round one.
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
- **Synergy:** Raises: worker charges. The four tended works, Outposts (08), The Polders (24) and The Keeps (28) spend them. Bound to the Soil (33) gives the same +1, so a new Worker can have 5.
- **Shape:** No change. The game's words are "newly created workers gain +1 charge".
- **Note:** The tended works give the charges more hexes to act on, so the card is worth more after this pass than before it.

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
- **To build:** Charter. The same text. It takes no chair.
- **Why:** An outpost stays when the card leaves its chair. So the best play today is to seat the card, plant, and unseat it. That is a chore, and the chair pays nothing in between. A card that opens a work for your workers should be a charter, as the fish traps are.
- **Arithmetic:** An outpost claims up to 7 hexes for one charge (about 3 production). A town's border takes a hex about every 8 to 10 turns. Two outposts are 14 hexes: +3 culture with The Wild Marches and +7 gold with The Quitrents.
- **Synergy:** Raises: hexes owned, wild hexes. Reads: nothing. It feeds The Wild Marches, The Quitrents and The Measure of the Land, and the claimed hexes are ground for the tended works.
- **Shape:** Existing shape: `charter.unlocks` in place of `unlocksImprovement`.

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
- **Synergy:** Raises: hexes owned, wild hexes. It feeds The Wild Marches (+9 culture for 36 wild hexes), The Quitrents and The Measure of the Land, and the claimed hexes are ground for the tended works.
- **Shape:** Existing shape. Only the tier and the rarity change.

### 12. The Standing Woods (was The Tended Country) (approved)

- **Ruling:** Approved. Your words: *"sure"*
- **Tier, rarity, type:** Tier II, uncommon, Economic
- **Today:** Needs tended land. Tended tiles gain +2 production.
- **To build:** Worked wild forest and jungle tiles gain +3 production.
- **Why:** The card pays from the turn it is seated, with no charter and no gate. It makes "leave the forest standing" a real choice against the lumber mill and the axe. You set the model on 2026-09-03: a bonus on unimproved land names forest and jungle. The name is for woodland kept standing and cut for poles and charcoal.
- **Arithmetic:** A wild forest yields 1 food and 1 production. With the card it yields 1 and 4, and with an orchard 2, 4 and 1 gold. A lumber mill in forest yields 1 and 2. A seat that works 6 to 10 forest and jungle hexes gains 18 to 30 production. The Tier II bar is 35 to 60, so it is a modest card alone.
- **Synergy:** Reads: worked wild forest and jungle. The map makes them, claims add them, and The Gathering Grounds (01) raises the same hexes. The Old Songs and Sacred Groves pay on them too. The Long Tending (23) doubles it.
- **Shape:** Existing shape: `pays` hex on `anyFeature` forest or jungle and `unimproved`.

### 13. The Hedgerows (approved)

- **Ruling:** Approved. Your words: *"sure"*
- **Tier, rarity, type:** Tier II, common, Economic
- **Today:** Needs tended land. Worked farms beside a tended tile gain +2 food, once per farm.
- **To build:** Farms beside a forest or jungle gain +3 food.
- **Why:** A hedgerow is the wild strip beside a field. The card joins the field and the wild: a seat keeps the woods beside its farms. The player sees it on the map and has no count to keep.
- **Arithmetic:** About a third of a seat's farms stand beside woods. Five farms of fifteen: +15 food. A seat that plans for it reaches ten farms and +30.
- **Synergy:** Reads: farms, and forest left standing. Smallholdings, Dark Earth and Break the Sod pay on the same farms. The Age of Improvement doubles it.
- **Shape:** Existing shape: `pays` hex on a farm `beside` forest or jungle.

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
- **Arithmetic:** With this change and the other rulings on Tier II, the tier holds 9 commons, 9 uncommons and 1 rare.
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

### 23. The Long Tending (approved)

- **Ruling:** Approved. Your words: *"great"*
- **Tier, rarity, type:** Tier III, rare, Wildcard (now Economic)
- **Today:** Needs tended land. Tended tiles gain +3 food.
- **To build:** The bonuses your Orders give to wild tiles are doubled.
- **Why:** The wild needs a capstone, as the field has The Age of Improvement. Today this rare gives less than the common Old Workings, and only after a charter.
- **Arithmetic:** A worked wild forest with The Old Songs (+2 culture), The Standing Woods (+3 production) and Sacred Groves (+1 food, +1 faith) carries 7 from Orders. The card adds 7 more. Ten such hexes: +70, a regular Tier III card (60 to 120). A seat with one wild card gets about 20. A seat that built for it passes 100.
- **Synergy:** Reads: what Orders pay on wild hexes. The Old Songs, The Standing Woods (12), The Garden of the World (27), Sacred Groves, The Hard Country on unimproved desert, and The Mountain Terraces (25) feed it, because a worked mountain is wild.
- **Shape:** Existing shape: `cardYieldAmplifier` on `unimproved`, as The Age of Improvement is on `improved`. It acts on other cards, so its type is Wildcard.

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
- **Synergy:** Reads: mountains in your borders. The Philosophers' Peaks (29) and the shared The Mountain Observatories read the same hexes. A worked mountain is wild, so The Long Tending (23) doubles this card's own line and The Garden of the World (27) pays on it. Pachacuti starts beside mountains.
- **Shape:** Existing shape, a number and a rarity change.

### 26. Tier III rarities (approved)

- **Ruling:** Approved. Your words: *"sure"*
- **Tier, rarity, type:** Five cards
- **Today:** Seasonal Levies, The Capitolia and The Freedom of the City are uncommon. A Court of Engineers and The Mit'a are rare.
- **To build:** Seasonal Levies, The Capitolia and The Freedom of the City become common. A Court of Engineers and The Mit'a become uncommon.
- **Why:** Tier III holds 10 rares, 4 uncommons and 4 commons. Each rare is offered in 1 game of 9, and each of the four commons in 19 of 20. Every Tier III looks the same, and the cards that change play stay hidden.
- **Arithmetic:** With this change and changes 14, 15 and 21 to 25, Tier III holds 8 commons, 5 uncommons and 5 rares. The rares are The Long Tending, The Age of Improvement, The Megalopolis, The Sovereign Writ and The Imperial Roads.
- **Synergy:** No change.
- **Shape:** Existing shape. Rarity only.

### 27. The Garden of the World (approved)

- **Ruling:** Approved. Your words: *"great"*
- **Tier, rarity, type:** Tier IV, uncommon, Economic (now rare)
- **Today:** Rare. Needs tended land. Tended tiles gain +2 food, +1 production and +1 culture.
- **To build:** Uncommon: Worked wild tiles gain +2 food, +1 production and +1 culture.
- **Why:** The numbers stay. The gate goes, and the card pays on about three times as many hexes.
- **Arithmetic:** In age 4 a seat works 15 to 25 wild hexes: coast, forest, hills with no mine, and mountains under The Mountain Terraces. That is +60 to +100 a turn, a regular Tier IV card (60 to 120). On about 8 tended hexes it paid 32.
- **Synergy:** Reads: worked wild hexes. The Long Tending (23) doubles it. The Gathering Grounds (01) raises the same hexes.
- **Shape:** Existing shape: `pays` hex on `unimproved`.

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
- **Arithmetic:** With this change and changes 22 and 27 to 31, Tier IV holds 3 commons, 6 uncommons and 3 rares. The rares are The Keeps, The Mother City and The Great Migration.
- **Synergy:** No change.
- **Shape:** Existing shape. Rarity only.

### 33. Bound to the Soil (approved with your text)

- **Ruling:** Approved with your text. Your words: *"for this to work, i think we need to make more unlockable tended tiles?"*
- **Tier, rarity, type:** Tier I, Doctrine, the field and the wild
- **Today:** Workers gain +1 charge. Tended tiles gain +1 food.
- **To build:** Workers gain +1 charge. Farms and tended tiles gain +1 food. Workers may tend wild grassland and plains into root-crop grounds: +1 food and +2 production.
- **Why:** Your line of 2026-11-05, with farms added (approved). You then wrote that the tended half needs more tended tiles to act on. So the Doctrine itself opens the work for open ground, the ground that the charter does not reach. A seat that takes it can always use both halves.
- **Arithmetic:** Ten farms at turn 40: +10 food for the rest of the game. A root-crop hex on grassland yields 3 food and 2 production, and 4 food and 2 production (6) under this Doctrine. A dry farm under it yields 4 and a watered farm 5. An average start has 6.1 hexes of open ground in its first two rings.
- **Synergy:** Reads: farms and tended hexes. It opens root-crop grounds, and Tinkers' Guild (06) stacks with its charge. The Local Census counts the new work. The Garden Peoples (35) and The Garden of the World (27) pay on it, because it is wild.
- **Shape:** Existing shape for the food: one more `pays` hex row on farms. **New** for the work: a row `rootCropGrounds` marked `tended`, and a Doctrine that opens a work (section 2).
- **Note:** The work's figure is yours, from round two: *"lets make it even better, +1 food and +2 production. it needs to be clearly better than a regular farm."* My advice to cut it to +1 food is rejected.

### 34. The Wildwood Compact (approved)

- **Ruling:** Approved. Your words: *"sure"*
- **Tier, rarity, type:** Tier II, Doctrine, the wild
- **Today:** Needs tended land. Tended works cost your workers no charge. Workers you gain from now on have one less charge.
- **To build:** Worked wild forest and jungle tiles gain +1 food and +1 production. Tended works cost your workers no charge.
- **Why:** With no gate, the Doctrine must be worth taking with no charter, so it pays on wild woods. The price on new workers goes, as you approved.
- **Arithmetic:** Eight forest hexes: +16 a turn for the game. Each tended work is free (a charge is about 3 production), and with this pass that covers four works: a seat with all three cards can tend 16 of the 18 hexes around its capital at no cost.
- **Synergy:** Reads: wild forest and jungle, and tended works. The Standing Woods (12) reads the same hexes.
- **Shape:** Existing shapes: `pays` hex, and the rule `tendedWorksFree`.
- **Note:** The free tending now reaches root-crop grounds and hill groves. Change 44 proposes that the towns do the tending, so that it is not a round of clicks.

### 35. The Garden Peoples (approved with your text)

- **Ruling:** Approved with your text. Your words: *"have this unlock a tended tile type too"*
- **Tier, rarity, type:** Tier III, Doctrine, the wild
- **Today:** Needs tended land. Tended tiles gain +1 food, +1 production and +1 culture.
- **To build:** Worked wild tiles gain +1 food, +1 production and +1 culture. Workers may tend wild hills into hill groves: +2 food and +1 culture.
- **Why:** It is the other side of Crop Rotation, in the same tier, and you asked that it open a tended work too. Hills are the ground no other work reaches, and a grove on a hill pays culture, which the wild side is for.
- **Arithmetic:** 15 to 20 worked wild hexes: +45 to +60 a turn for the game. A hill grove yields 2 food, 2 production and 1 culture (5), and 8 under this Doctrine. A mine yields 3, and 4 in age 4. An average start has 2.8 bare hills in its first two rings.
- **Synergy:** Reads: worked wild hexes. It opens hill groves. The Long Tending (23) does not double it, because it is a Doctrine and not an Order. The Old Songs (38) pays on a hill grove.
- **Shape:** Existing shape for the yields: `pays` hex on `unimproved`. **New** for the work: a row `hillGrove` marked `tended`, and a Doctrine that opens a work (section 2).
- **Note:** The work's figure is yours, from round two: *"make it +2 food +1 culture instead, same reason as my previous comment"*. You did not answer on the name, so the work is a hill grove, as recommended.

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

### 38. The Old Songs (approved)

- **Ruling:** Approved. No comment, so approved by your ruling of round one.
- **Tier, rarity, type:** Tier I, common, Civic
- **Today:** Worked unimproved land gains +2 culture.
- **To build:** Worked wild forest, jungle and hill tiles gain +2 culture.
- **Why:** Root-crop grounds make open ground wild with more than a farm's yield. Without this change a seat with Bound to the Soil would be paid 2 culture on every hex it works. Your model of 2026-09-03 is that a bonus on unimproved land names its terrain.
- **Arithmetic:** An average start has 4.6 woods and 2.8 bare hills in two rings. Four towns that each work 3 such hexes gain 24 culture, where the median seat makes about 25 in age 2. Those hexes feed a town less than open ground does, which is the card's price.
- **Synergy:** Reads: worked wild woods and hills. Orchards (01) and hill groves (35) raise the same hexes. The Standing Woods (12) and Sacred Groves pay on the woods. The Long Tending (23) doubles it.
- **Shape:** Existing shape: `pays` hex on `unimproved` and any of forest, jungle or hills.

### 39. The orchard (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** The work that The Gathering Grounds (01) opens in forest and jungle
- **Today:** +1 food and +1 gold.
- **To build:** +2 food and +1 gold. The Gathering Grounds then reads: Workers may tend wild land: fish traps on coast and lake tiles (+1 food, +1 production) and orchards in forest and jungle (+2 food, +1 gold).
- **Why:** Your rule of round two: a tended work is clearly better than the plain improvement on the same ground. The orchard is 1 above a lumber mill and level with a farm on the felled ground. Food is what a forest town lacks, and The Standing Woods (12) brings the production.
- **Arithmetic:** Forest: 1 food, 1 production. Orchard today: 2, 1 and 1 gold (4). Lumber mill: 1 and 2 (3). A farm on the felled ground: 3, or 4 beside fresh water. Proposed: 3 food, 1 production, 1 gold (5), the same sum as a root-crop ground and a hill grove. Fish traps make a coast hex 4 where nothing else can be built, so they pass the rule as they are.
- **Synergy:** Raises: the yield of wild woods. The Old Songs (38), The Standing Woods (12), Sacred Groves and the Doctrine The Wildwood Compact (34) pay on the same hex.
- **Shape:** Existing shape: one figure on the row `wildOrchard` in `data/improvements.json`.

### 40. The Rope Stretchers and The Ambarvalia (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier 0, common, Civic. The Ambarvalia is shared with Devotion
- **Today:** The Rope Stretchers: Each town gains +1 science for every three improved tiles in its borders. The Ambarvalia: Each town gains +1 faith for every two improved tiles.
- **To build:** The Rope Stretchers: Each town gains +1 science for every three improved or tended tiles in its borders. The Ambarvalia: Each town gains +1 faith for every two improved or tended tiles.
- **Why:** The Local Census and The Domesday Survey already count improved or tended tiles. With one rule for all four, a wild seat gets the science and the faith that a field seat gets from the same number of hexes. The wild has no other science but mountains, and faith from tended land is the hook the Devotion pair notes ask for.
- **Arithmetic:** A town with 9 tended hexes: +3 science and +4 faith. Eight such towns: +24 science and +32 faith. A field seat with the same count of farms gets the same today. No figure changes.
- **Synergy:** Reads: improved and tended tiles in a town's borders. Every tended work raises the count. The floor for a seat with no tended work is unchanged.
- **Shape:** Existing shape: the tile test "improved or tended" that The Local Census uses, in the count.

### 41. The Sculpted Landscape (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier III, uncommon, Civic, shared with Magisterial
- **Today:** Farms beside a great-person work gain +2 food and +2 culture.
- **To build:** Farms and tended tiles beside a great-person work gain +2 food and +2 culture.
- **Why:** It is the bridge to Magisterial that the pair notes name (works beside tended land). It also gives open ground and water a Tier III line, where today only The Garden of the World pays, a tier later.
- **Arithmetic:** A work has six hexes beside it. A seat with three works and eight farms or tended tiles beside them gains +32. The card's floor for a field seat is unchanged.
- **Synergy:** Reads: great-person works, and the farms and tended tiles beside them. The Long Tending (23) doubles its line on a tended hex, as The Age of Improvement doubles it on a farm.
- **Shape:** Existing shape: `pays` hex on a farm or a tended tile, `beside` a great-person work.

### 42. Commission: Keep the Wild (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier III, uncommon, Wildcard, commission
- **Today:** Not in the deck.
- **To build:** Goal: work 20 wild tiles. Reward: worked wild tiles gain +1 food and +1 production.
- **Why:** On open ground and on water one Order pays, and it is in Tier IV. This gives every wild ground a line in Tier III that takes no chair. The deck has four Wildcard cards and no commission in Tiers II and III. The name answers Commission: Break the Sod.
- **Arithmetic:** Eight towns that each work 3 wild hexes are past the goal (24). A field seat works about 10 wild hexes, on coast and in woods. The reward on 20 to 30 hexes is +40 to +60 a turn with no chair. A regular Tier III card pays 60 to 120 and takes one.
- **Synergy:** Reads: wild tiles worked. Every tended work makes a wild hex worth working, and the claims of Outposts (08) and The Staked Claims (11) add hexes. The Long Tending (23) doubles the reward if a commission's reward counts as an Order's line (to confirm).
- **Shape:** Near an existing shape. The count `workedUnimprovedTiles` exists for cards; a commission needs it as a goal figure. The lasting reward is a `pays` hex on `unimproved`.

### 43. The Satoyama (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier IV, Doctrine, the wild
- **Today:** Not in the deck. Arcadia, the wild's Tier IV Doctrine, is cut (36).
- **To build:** For everything but your Orders and Doctrines, a root-crop ground is paid as a farm, a hill grove as a mine and an orchard as a lumber mill.
- **Why:** 85 sources outside this deck pay an improvement and 1 pays a wild hex. No card of this deck can fix that, and each pass on beliefs, great people and wonders adds to it. This lets a seat that kept its land wild use what it drafted outside the deck. The hex stays wild for every card, so the fork between the field and the wild stays. Fish traps are left out: nothing else can be built on open water, so they have no improvement to count as.
- **Arithmetic:** A watered root-crop ground gains Irrigation +1, and in a typical seat one belief +1 and one great person +1 or +2: +3 to +4. With every farm source: +6. A hill grove gains Prospecting +1 and up to +5 from three great people. An orchard gains little (+2 from Wenamun). The Physiocrats gives an improved hex +6. A leader's farm line counts too: Jayavarman VII's +2 for each public work would land on his watered root-crop grounds.
- **Synergy:** Reads: what beliefs, great people, wonders, buildings, technologies and the leader pay to farms, mines and lumber mills. About 18 of the outside sources name one of the three, and each feeds it.
- **Shape:** **New shape,** medium. A test for a named improvement also holds for the tended work on its ground when the effect asking is not an Order or a Doctrine. `liveEffects` knows its eleven sources. The technologies' bonuses and the buildings' hex yields are read in `src/sim/yields/hex.ts` and must ask the same question. The plain form (tended tiles gain +2 food, +2 production and +2 culture) is an existing shape.
- **Note:** Tier IV would hold seven Doctrines. If you want six, The High Towns is my candidate to cut. With Jayavarman VII this Doctrine is strong; test it first.

### 44. The Wildwood Compact (new, not ruled)

- **Ruling:** New, not ruled.
- **Tier, rarity, type:** Tier II, Doctrine, the wild
- **Today:** Change 34, approved: Worked wild forest and jungle tiles gain +1 food and +1 production. Tended works cost your workers no charge.
- **To build:** Worked wild forest and jungle tiles gain +1 food and +1 production. Each turn, each of your towns tends one wild tile it works.
- **Why:** A free work on 16 hexes of every town is a round of clicks with no decision in it. Here the towns do it. Each ground has one work, so there is nothing to choose, and no new button.
- **Arithmetic:** A town of 10 that works 6 wild hexes is tended in 6 turns. That is 6 charges (two Workers, about 25 production) and about 12 orders to a Worker saved for each town. The free charge of the approved text saved the same production and none of the orders.
- **Synergy:** Raises: tended hexes, with no worker. It works for the works the seat can lay: fish traps and orchards with The Gathering Grounds, root-crop grounds with Bound to the Soil, hill groves with The Garden Peoples.
- **Shape:** **New shape:** a step at the end of the turn that lays the ground's work on one worked wild hex of each town. It changes a hex's yield, so it joins the register of yield mutations (`refreshTileDerived`). The rule `tendedWorksFree` is then on no row.
- **Note:** If you reject this, change 34 stands as approved.

## 5. The deck after the rulings

| Tier | Cards | Military | Economic | Civic | Wildcard | Common | Uncommon | Rare |
|---|---|---|---|---|---|---|---|---|
| Tier 0 | 11 | 1 | 7 | 3 | 0 | 7 | 3 | 1 |
| Tier I | 15 | 0, and The Beacons is dealt here | 10 | 4 | 1 | 10 | 4 | 1 |
| Tier II | 19 | 1 | 10 | 8 | 0 | 9 | 9 | 1 |
| Tier III | 18 | 1 | 9 | 6 | 2 | 8 | 5 | 5 |
| Tier IV | 12 | 1 | 6 | 4 | 1 | 3 | 6 | 3 |
| **All** | **75** | **4** | **42** | **25** | **4** | **37** | **27** | **11** |

- These are the counts after rounds one and two. 75 cards and 23 Doctrines (4, 6, 7 and 6).
- Four cards are charters and take no chair: The Gathering Grounds, Outposts, The Polders and The Keeps.
- The Gathering Grounds is counted in Tier 0, Levy of the Land in Tier I and The Beacons in Tier II. Each is also dealt in one more tier.
- Keywords: 2 commissions, 4 charters, 2 scalers and 1 boon.
- **If you approve changes 39 to 44:** 76 cards and 24 Doctrines. Tier III gains Commission: Keep the Wild (19 cards, 3 Wildcard, 6 uncommon), and Tier IV gains The Satoyama (7 Doctrines). The deck then has 5 Wildcard cards and 3 commissions.

### What the cuts and the kept card leave

- **Tier I has no Military card of its own.** The Burhs is cut. The Beacons is dealt in Tiers I and II (37, approved), so a Military card is offered in every tier.
- **Tier II has no Wildcard card.** The Wide Country is cut. A Wildcard chair takes a card of any type, and the generic commissions cover the tier. Change 42 puts a commission in Tier III.
- **The levy has one rider fewer.** The Gleaners is cut. Levy of the Land stands alone, and its first rider is The Terraces of Moray in Tier II.
- **Tinkers' Guild stays, so Tier I is 10 Economic cards of 15.** Its +1 charge and Bound to the Soil's +1 charge are the same bonus twice, and the four tended works give the charges a use.
- **The wild rests on few cards.** Section 1 has the count and the changes that answer it (39 to 44).
- **The deck is 42 Economic cards of 75 (56%).** The type rules put food, production, land and growth there, and that is what this deck does.

## 6. The themes after the rulings

### The field (improved land)

- **Tier 0:** Smallholdings, Sweet Water, The Rope Stretchers
- **Tier I:** Dark Earth, The Three Sisters, Commission: Break the Sod, The Local Census, The Hard Country, Tinkers' Guild; the Doctrine Bound to the Soil
- **Tier II:** The Watercourses, The Highlands, The Coast, The Hedgerows (the bridge to the wild); the Doctrine The Georgics
- **Tier III:** Old Workings, The Age of Improvement, The Polders, The Engineers' Yards; the Doctrine Crop Rotation
- **Tier IV:** The Keeps, The Domesday Survey; the Doctrine The Physiocrats
- **The essentials:** production everywhere; science from The Rope Stretchers, The Highlands and The Domesday Survey; culture from The Coast.

### The wild (wild land, with four tended works)

- **Tier 0:** The Gathering Grounds (fish traps, orchards); the shared Sacred Groves
- **Tier I:** The Old Songs, The Wild Marches, Outposts, The Staked Claims; the Doctrine Bound to the Soil (root-crop grounds); the shared Garden Cities and The Barbarian Frontier
- **Tier II:** The Standing Woods, The Hedgerows; the Doctrine The Wildwood Compact
- **Tier III:** The Long Tending, The Mountain Terraces; the Doctrine The Garden Peoples (hill groves). Proposed: Commission: Keep the Wild (42), and The Sculpted Landscape on tended tiles (41)
- **Tier IV:** The Garden of the World, The Philosophers' Peaks, The Domesday Survey (it counts tended tiles). Proposed: the Doctrine The Satoyama (43)
- **The essentials:** culture from The Old Songs, The Wild Marches and the groves; production from The Standing Woods and root-crop grounds; science from the mountains, and from The Rope Stretchers if you approve change 40.

### The frontier (towns, claims, roads, authority)

- **Tier 0:** The Seed Grain, The Road Home, The Founding Furrow, The Woodland Bands
- **Tier I:** The Staked Claims, Outposts, The Land Hunger, The Road Towns, The Beacons
- **Tier II:** The Great Colonies, The Colonists, The Book of Settlements, Provincial Councils, The Beacons
- **Tier III:** The Imperial Roads, The Sovereign Writ, The Quitrents
- **Tier IV:** The Measure of the Land, The Mother City, The Great Migration, The Imperial Highways
- **The essentials:** culture from The Founding Furrow and The Mother City; production from The Road Towns and The Book of Settlements; science from The Thermae until The Measure of the Land.

### Citizens and the levy (the engine)

- **Tier 0:** Granary Levies, The Patient Harvest
- **Tier I:** Levy of the Land (also dealt in Tier II), The Grain Census
- **Tier II:** The Seven Fat Years, The Great Households, The Breadbasket, Veteran Colonies, The Terraces of Moray, The Harbour Cities, The Grain Dole
- **Tier III:** The General Levy, Seasonal Levies, The Mit'a, The Megalopolis, Plenty, The Freedom of the City
- **Tier IV:** The Thousand Villages, The Corvée, The Theodosian Walls
- **The essentials:** production from the levy, from growth and from The Great Households; science from The Terraces of Moray and The Megalopolis; culture from The Harbour Cities and The Thousand Villages.

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
- **How it plays:** The seat founds four towns and leaves the woods standing. Workers with 4 charges set fish traps and orchards, and root-crop grounds on the open hexes the towns work: each is a hex of 6 where a dry farm is 4. The woods and hills pay culture. Two outposts claim the gaps. The culture brings Tier II early, and a levy turns the food into buildings.

### Early, end of Tier II: the road realm (six chairs, a tier-10 government)

- **Chairs:** The Road Towns (I), The Grain Census (I), The Thermae (II), The Great Households (II), The Book of Settlements (II), Provincial Councils (II). Taken on the way: The Seven Fat Years. Doctrine: The Curator of Waters.
- **How it plays:** Seven towns, each joined by road, each with a Granary and a Watermill. A joined town pays +4 production and costs 1 less authority. Each public work pays 2 science and 2 happiness. Each two citizens pay 1 production. The boon adds a citizen to every town, and The Grain Census grows by 7.

### Late, Tier III then Tier IV: the garden peoples (eight chairs, then eleven)

- **Chairs at Tier III:** The Long Tending, The Standing Woods (II), The Old Songs (I), The Mountain Terraces, The Megalopolis, The Capitolia, The General Levy, The Grain Census (I). Doctrines: Bound to the Soil, The Wildwood Compact, The Garden Peoples. Tier IV adds The Garden of the World, The Thousand Villages and The Philosophers' Peaks.
- **How it plays:** The towns are large and no hex around them is improved. Every work is free, so the seat tends woods, shore, open ground and hills. A wild forest pays its own 2, an orchard's 2, the Doctrines' 6, and 9 from three Orders, doubled. Mountains pay science. A full town raises a soldier, walks it to a new town and settles it there.

## 8. Pairs, leaders and great people

### What Expansionist gives and takes with each other deck

- **Dominion (Alexander):** Expansionist gives citizens to raise as soldiers and wide land to hold. It takes Military cards for its chairs and camps that claim land when cleared.
- **Commerce (Pachacuti):** Expansionist gives joined towns, road hexes and luxuries on claimed land. It takes gold, which buys hexes and workers, and caravans, which lay roads.
- **Devotion (Jayavarman VII):** Expansionist gives public works and large towns, which his kit reads, and wild forest that pays faith (Sacred Groves, and the belief Spirits of the Wood). Change 40 lets The Ambarvalia count tended tiles. It takes happiness and authority in devout towns.
- **Scientific (Nezahualcoyotl):** Expansionist gives many towns for empire buildings, and public works that pay science (The Thermae). It takes charters that open the Aqueduct early, and science.
- **Magisterial (Cyrus):** Expansionist gives claimed land for great-person works and wild hexes for Garden Cities. Change 41 lets The Sculpted Landscape pay tended tiles beside a work. It takes culture and the government's chairs.

### For the Commerce pass

- Two shared cards would change, and neither is shared with Commerce: The Ambarvalia (Devotion, change 40) and The Sculpted Landscape (Magisterial, change 41). The Country Fair, Market Gardens and The Provincial Fair stay as they are.
- **The rarity finding is not only this deck's.** The draw shows a rare in about 1 game of 9. You approved setting a rarity by how often a card should be seen, and the same count should be made for the other decks.
- **Roads are worth more to this seat.** The Road Towns pays +4 (09) and The Beacons moves units inside the borders (18). Caravans lay roads, so the pair is stronger.
- **The Wide Country is cut (14).** Nothing in this deck now pays for hexes bought with gold, apart from the cards that count hexes owned.
- **Wild land and luxuries.** A tended work opens no resource, so a seat that keeps its land wild has fewer luxuries to sell. A luxury hex left wild still pays The Country Fair. The three Commerce cards on mines and improved luxuries (The Mineral Trade, Mining Districts, The Emporia) are among the 85 outside sources of section 1.

### Leaders and great people

The leader roster changed on 2026-11-20. Cyrus and Jayavarman VII are read on their new kits.

- **Alexander (with Dominion):** richer. The General Levy at Tier III gives The Royal Army units to read without Dominion's cards.
- **Pachacuti (with Commerce):** richer. Roads (09, 18) and mountains (25, 29) for a start beside mountains. His farms beside mountains pay gold, so he leans to the field there.
- **Jayavarman VII (with Devotion), on today's kit:** much richer. His farms beside fresh water gain +1 food and +1 faith for every public work in their city, so every card that makes or reads public works is his: The Aediles, The Thermae (17), The Water Boards (30), The Waterworks, and the Doctrines The Curator of Waters and The Hydraulic Empire.
- **Jayavarman VII, the details.** The House of Fire is a public work, so each of his towns can hold one more than any other seat's. The Thermae pays 2 science for it, and The Water Boards doubles its +2 food. Its +3 engineer renown feeds A Court of Engineers and The Engineers' Yards (21). His +1 culture and +1 faith for every 4 citizens reads the same count as The Thousand Villages (31).
- **Jayavarman VII and the fork.** His kit pays on farms beside fresh water, so he leans to the field. Under The Satoyama (43) his farm line would land on watered root-crop grounds too: +8 on a hex in a town with four public works. That is the strongest use of the Doctrine and the first thing to test.
- **Nezahualcoyotl (with Scientific):** richer. He starts beside a lake, so fish traps at Tier 0 suit him. The Thermae and The Water Boards read the Aqueduct towns that The Dikes reads.
- **Cyrus (with Magisterial), on today's kit:** his capital gains culture for each Order seated in a Civic or Wildcard chair. Any Order can sit in a Wildcard chair, and only a Civic Order can sit in a Civic chair. The deck gives him 25 Civic cards of 75. Tier II is his best tier (8 Civic cards of 19), and Tier I is thin (4 of 15).
- **Cyrus, the details.** Four cards are charters and sit in no chair, so they add nothing to his count. A commission leaves its chair when it is met, so it stops counting then. The Workers of The King's Gardeners keep Tinkers' Guild's charge and have four works and outposts to lay in a new town. The Sculpted Landscape on tended tiles (41) is a card of his pair.
- **Ibn Battuta:** no change.
- **No leader pays on a wild hex.** Five leaders of the new roster pay on an improvement. The Satoyama (43) is the only way a leader's line reaches a tended work.
- **Great people:** 21 legacies pay on an improvement and none on a wild hex (section 1). The Engineers' Yards moves beside A Court of Engineers in Tier III, and the Court becomes uncommon.

## 9. Ready for the build

A builder follows this list once the third review is done. Each number is an entry in section 4.

### Rows to retire

- The Wild Orchards (03), The Burhs (05), The Gleaners (10), The Wide Country (14), and the Doctrine Arcadia (36).
- Take the gate `needsTendedWork` off The Standing Woods (12), The Hedgerows (13), The Long Tending (23), The Garden of the World (27), The Wildwood Compact (34) and The Garden Peoples (35). No row then carries it.

### Data only: a number, a tier or a rarity

- 04 Levy of the Land: common, `lastBand` Tier II.
- 07 The Land Hunger: 50%, common.
- 09 The Road Towns: +4 production.
- 11 The Staked Claims: Tier I, rare.
- 15 The Great Colonies: Tier II, `fromLargest: 4`.
- 20, 26, 32: the rarities of Tiers II, III and IV, as each entry lists them.
- 21 The Engineers' Yards: Tier III, +4 production.
- 22 The General Levy: Tier III, uncommon, `everyAtWar: 2`.
- 25 The Mountain Terraces: 4 science and 2 production, uncommon.
- 29 The Philosophers' Peaks: +4 science, at most +12, common.
- 37 The Beacons: `lastBand`, so that it is dealt in Tiers I and II.

### Data only: a new effect on a shape that exists

- 12 The Standing Woods (the row of The Tended Country, renamed), 13 The Hedgerows, 23 The Long Tending (type Wildcard), 27 The Garden of the World (uncommon).
- 16 The Great Households: +1 production for every 2 citizens, common.
- 17 The Thermae, 31 The Thousand Villages: new rows.
- 08 Outposts and 28 The Keeps: `charter.unlocks` in place of `unlocksImprovement`.
- 34 The Wildwood Compact: the new first sentence, and the price on new workers goes.
- 33 Bound to the Soil: +1 food on farms. 35 The Garden Peoples: the yields on wild hexes.
- 38 The Old Songs: forest, jungle and hills.

### A shape to confirm or extend in code

- 01 The Gathering Grounds (the row of The Fish Traps, renamed): a charter that opens two works; Tier 0 with `lastBand` Tier I; uncommon.
- 02 The Woodland Bands: the rule `woodsWalk`, widened to hills.
- 18 The Beacons: movement that depends on where the unit stands.
- 19 The Seven Fat Years: a citizen for every town as an on-draft grant.
- 24 The Polders: a charter; `countsAs: farm` with `yieldsAs` on one row; one charge; uncommon.
- 30 The Water Boards: a public-work selector on `buildingYieldPercent`.

### The two new tended works (approved)

- A row `rootCropGrounds`: tended, wild grassland and plains, no hills, no forest, +1 food and +2 production, one charge. Opened by Bound to the Soil (33).
- A row `hillGrove`: tended, wild hills, no forest, +2 food and +1 culture, one charge. Opened by The Garden Peoples (35).
- A Doctrine that opens a work: the effect `unlocksImprovement` on the Doctrine's row, and a refusal sentence that can name a Doctrine.
- A board piece and a flair-gallery entry for each work.

### Waits for your third review

- 39 the orchard's figure. 40 the two counters. 41 The Sculpted Landscape. 42 Commission: Keep the Wild. 43 The Satoyama. 44 The Wildwood Compact's second line.

### With the build

- The sheet `docs/decks/expansionist.md` and its sync test `test/sim/decks/expansionist.test.ts`: every changed row, the counts tables, and the "Needs tended land" line in the header.
- `docs/decks/deck-design.md`, "Tended land": the line "tended works yield less than a proper improvement" is reversed by your ruling. Write the new rule there, with its date.
- The Local Census: the game counts tended hexes and the text does not say so. The Domesday Survey: the game's words for the goal leave out "or tended". Make each text and the game's words agree.
- The bots: they lay no tended work today. A bot-track batch must teach them before the wild can be measured.

## 10. What to test first

1. **The Satoyama with Jayavarman VII.** His farm line on watered root-crop grounds: +8 a hex in a town with four public works.
2. **The Tier III fork.** The Garden Peoples (+3 on every worked wild hex, and hill groves) against Crop Rotation (an improvement's own bonus doubled, and wild hexes yield nothing).
3. **Root-crop grounds with Bound to the Soil.** A hex of 6 against a dry farm's 4. Does a seat with this Doctrine still farm? Count farms and root-crop hexes at turn 100.
4. **The wild in Æra IV.** Add up one hex of each kind in a real game and compare it with the table in section 1.
5. **The Wildwood Compact.** With change 44, do the towns tend the hexes the player would have chosen?
6. **The Old Songs** on woods and hills only: about 24 culture in age 2 for a seat that leans on it.
7. **The Gathering Grounds at Tier 0.** Count the hexes a player tends by turn 60.
8. **Levy of the Land as a common in two tiers.** Is it an automatic pick?
9. **The charters.** Outposts and The Keeps with no chair: are they too free?
10. **The rarities.** After the build, count what a seat is offered in Tiers III and IV over ten games.

## 11. What I could not determine

- No measurement of this deck exists since batches DS1 and DS3 (2026-11-10), and none of wild or tended land at all, because the bots do not tend. Every sum in section 1 is arithmetic on the rows, not a reading from a game.
- The "typical" stack is my judgement of what a seat holds in Æra IV: two Doctrines of its theme, two Order lines, one belief, one great person. You draft 2 to 3 great people in an age, so one that pays on a given improvement is a fair guess and two is the busted case.
- The counts of outside sources come from the data files for cards, beliefs, buildings, luxuries and technologies, and from the pass documents for great people, wonders and leaders. I counted a source as "on an improvement" when its effect names an improvement, a great-person work or a holy site. A few that pay on hexes beside a work reach a wild hex and are not in the 85.
- Whether a commission's lasting reward counts as an Order's line for The Long Tending and The Age of Improvement. The sums assume it does.
- Whether a resource's own yield is paid on a hex with a tended work. The sums use hexes with no resource.
- The offer figures come from my own model of the draw, not from games. The count of ground is from 48 starts on 8 standard maps and reads the first two rings only.
- How a Doctrine hand is drawn. I assumed three at random from the Doctrines of both decks in the tier.
- Whether a root-crop ground should be allowed on a floodplain.
- Whether a citizen that a card grants counts as growth and as a new largest size (The Seven Fat Years with Granary Levies and The Grain Census).
- How the Doctrine Crop Rotation should treat water. Today every hex with no improvement yields nothing under it, coast and lake included.
- The history behind the names is from my own knowledge, not from a source in the repo.

## Record: rounds one and two, and your rulings (2026-11-20)

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

## The user's ruling for round four (2026-11-20): wild land leaves; new improvements stay

After round three I advised dropping wild land as a direction (85 sources
outside the deck pay an improved hex and one pays a wild hex; the theme needed
a second economy and the return of Arcadia). The user had asked: "i'm feeling
more skeptical that the wild land is a good direction for the expansionist
deck, what do you think? i think the core themes are already fun, and we can
find more cards to flesh out its current direction, maybe add a few auxiliary
themes to make up for the card count".

The ruling, in the user's words: "let's do this: i like the idea of adding new
improvements where previously improvements couldn't be built. i.e. fish traps
allows you to build improvements on coast tiles where you couldn't previously.
keeps are very fun because they're a new way to interact with the land. let's
add a few more of these, and get rid of cards like old song. some ideas off
the top of my head: an improvement that can only be built in desert, one for
tundra, an improvement that can only be built adjacent to certain combinations
of terrains (not prescriptive, just a direction). public works, levies,
settling and roads are great directions. i agree with your auxiliary themes
too. The frontier seems weaker to me. Lets do a fourth pass with these
directions, try to add a few that make the auxiliary directions synergize with
the deck at large."

What follows:
- **"Wild" and "tended" leave the deck as keywords.** No third state of land.
  The works become ordinary improvements that a card opens: they count as
  improved for every card, belief, great person, wonder and leader.
- **A new theme: improvements where none could be built.** Fish traps on
  coast and lake hexes and the keep are the models: "a new way to interact
  with the land". More of these: one that can be built only in desert, one
  only in tundra, one only beside a certain combination of terrains. These
  are directions, not a list.
- **Cards "like old song" go:** the cards that pay a hex for being left
  without an improvement (The Old Songs, The Standing Woods, The Garden of the
  World, The Long Tending, The Wildwood Compact, The Garden Peoples as
  reworked, and change 38 to 44 of round three).
- **The core, to flesh out:** public works, levies, settling and roads.
- **Auxiliary themes, agreed:** the high country and fresh water. **The
  frontier** (outposts, claims, keeps as a claims theme) "seems weaker": it is
  not a theme. The keep itself stays, as a new improvement.
- **New cards should tie the auxiliary themes to the deck at large.**
- Every ruling of rounds one to three that does not depend on wild or tended
  land stands.
