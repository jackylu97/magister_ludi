# The Expansionist deck

The deck's cards, by tier: name, rarity, status, ability and type. This sheet is the spec of record for the deck, and `test/sim/decks/expansionist.test.ts` checks it against `data/decks/expansionist.json` and, for the shared table, `data/decks/common.json`.

- **The builds** (`docs/plans/expansionist-builds.md`, accepted by the user on 2026-10-16) say why each card is here:
  - the improvement build;
  - the tall build and its three flavours: the waterworks, the great works and the breadbasket;
  - the wide build and its three flavours: the highlands, the well-ordered realm and the road network;
  - the cards for flexing between wide and tall;
  - tended land, a splash any build can add.
- **Status:**
  - `implemented`: in the data, dealt, and plays as written.
  - `modify`: in the data, but needs work. The word after the colon says why: `revised` (changed by the builds or a ruling of 2026-10-16), `reworked` (a card no build used, reworked to serve one), `wording` (the text changes, the effect does not), `deferred` (not dealt, because it needs a new shape), `as built` (the game does something slightly different from the text), or `cut` (you removed the card; the build retires its data row). The ability shown is the target.
  - `add`: not in the data yet; a new card from the builds. `add: proposed` is one of the proposals of 2026-10-13 that a build uses.
- **Type:** the last column says which chair the card fits: **Military**, **Economic**, **Civic** or **Wildcard** (`docs/plans/doctrines-governments-chairs.md`, section 4). Since batch E0 the types are in the data: each Expansionist card fits only a chair of its own type or a Wildcard chair. The sync test checks this column for every row in the data, the shared table's included.
- **Gates:** "Needs tended land" deals a card only to a seat holding a tended-work charter. "Needs a levy" deals a card only to a seat holding a card that grants a levy, in a chair or not.
- **The build:** the triage is `docs/plans/expansionist-build-triage.md`. Batch E0 put the types into the data, retired The Forest Gardens and Daughter Towns, and built the 37 cards that needed no new shape. Batch E1 built the twelve levy cards, batch E2 ten cards about moments, records and counts, batch E3 ten cards about the land, batch E4 ten cards about works, claims and borders, and batch E5 eight cards about meters, commissions and the shared The Frontier Militia. Batch E6 built The Breadbasket and Veteran Colonies on the shapes Dominion batch D7 built for them, and D7 built the shared The Farming Garrisons.
- **Doctrines:** none yet. Expansionist's Doctrines come next, one direction per flavour.
- **The long form** (the D3 "built as" details, the tended works as built, the synergy section, the proposed cuts and the proposed revision of 2026-10-13): `docs/decks/reference/expansionist-2026-10-16.md`.

| Tier | Implemented | Modify | Add | All | Doctrines |
|---|---|---|---|---|---|
| Tier 0 | 13 | 1 | 0 | 14 | none |
| Tier I | 28 | 0 | 1 | 29 | none |
| Tier II | 21 | 1 | 0 | 22 | none |
| Tier III | 35 | 1 | 1 | 37 | none |
| Tier IV | 17 | 1 | 0 | 18 | none |
| **All** | **114** | **4** | **2** | **120** | **none** |
| Shared | 16 | 0 | 0 | 16 |  |

**By type** (the chair a card would fit):

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| Tier 0 | 1 | 11 | 2 | 0 |
| Tier I | 1 | 18 | 8 | 2 |
| Tier II | 0 | 14 | 8 | 0 |
| Tier III | 2 | 24 | 9 | 2 |
| Tier IV | 2 | 13 | 1 | 2 |
| **All** | **6** | **80** | **28** | **6** |
| Shared | 2 | 8 | 6 | 0 |

## Tier 0

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **Smallholdings** | common | implemented | Worked farms and pastures gain +1 food and +1 gold. | Economic |
| **Granary Levies** | common | implemented | When a city grows in population, gain 15 production | Economic |
| **The Naturalists** | uncommon | implemented | Each city gains +1 science for every two hills or mountains in its borders, at most +3. | Civic |
| **The Patient Harvest** | rare | implemented | Cities retain 30% of the food spent on growth, but produce military units 15% more slowly. | Economic |
| **The Fish Traps** | common | implemented | Once drafted, workers may tend a lake or coastal tile into fish traps for one charge: +1 food and +1 production. No chair required. | Economic |
| **Sweet Water** | common | implemented | Towns beside a river or lake gain +1 happiness. Worked freshwater tiles gain +1 food. | Economic |
| **The Seed Grain** | uncommon | implemented | Towns you found start with one extra citizen. | Economic |
| **The Ambarvalia** | common | implemented | Your capital gains +1 faith. Each town gains +1 faith for every two improved tiles in its borders. | Civic |
| **The Rope Stretchers** | common | implemented | Worked mines, quarries and lumber mills gain +1 production. | Economic |
| **The Beating of the Bounds** | common | modify: as built | Each town you found claims one extra wild hex of your choice next to its borders. | Economic |
| **The Pyramid Builders** | common | implemented | +25% production toward wonders in your capital. | Economic |
| **The Road Home** | common | implemented | Each town you found is joined to your nearest town by road. | Economic |
| **The Work Gangs** | common | implemented | Towns of at least three citizens may spend a citizen to raise a worker. This shares the town's levy wait. | Economic |
| **The Woodland Bands** | common | implemented | Your units ignore the extra movement cost of forest and jungle, and gain +2 strength while they stand in forest or jungle. | Military |

## Tier I

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Burhs** | common | implemented | Towns gain +3 defence for every defensive building in them, and +100% production toward defensive buildings. | Military |
| **Levy of the Land** | uncommon | implemented | Cities may spend one citizen to gain production equal to the food it took to grow that citizen. A city may levy once every five turns. | Economic |
| **Tinkers' Guild** | common | implemented | Workers you produce or purchase gain +1 charge. | Economic |
| **The Old Songs** | common | implemented | Worked unimproved land gains +2 culture. | Civic |
| **The Local Census** | common | implemented | A town working at least four improved or tended tiles costs one less authority, minimum one. | Civic |
| **The Wild Orchards** | common | implemented | Once drafted, workers may tend a forest or jungle tile into a wild orchard for one charge: +1 food and +1 gold. No chair required. | Economic |
| **The Burning Season** | uncommon | implemented | Once drafted, workers may tend wild grassland or plains into burned country for one charge: +1 food. No chair required. | Economic |
| **Dark Earth** | uncommon | implemented | Worked farms gain +2 food once they have stood for 20 turns, and another +2 food once they have stood for 50 turns. | Economic |
| **The Three Sisters** | common | implemented | Worked farms beside a plantation or a pasture gain +2 food and +2 production, once per farm. | Economic |
| **The Commons** | uncommon | implemented | Each town gains +1 happiness for every two wild tiles it works, at most +3. | Civic |
| **The Hard Country** | common | implemented | Worked desert and tundra tiles gain +1 food and +1 production. | Economic |
| **The Master Builders** | common | implemented | Towns working at least three mines, quarries or lumber mills give +1 renown a turn, favouring great engineers. | Civic |
| **Outposts** | uncommon | implemented | Workers may plant an outpost on a wild tile within three hexes of your border, for one charge. It claims its hex and the ring around it for your nearest town, and costs no authority. A town founded on an outpost keeps that land. | Economic |
| **The Prospectors** | common | implemented | Prospecting costs workers and explorers no charge. Worked mines on a seam you surfaced gain +3 production. | Economic |
| **Six Gardens** | uncommon | implemented | Needs tended land. Goal: have six tended tiles. Reward: culture equal to fifteen times the tended tiles you hold. The card then leaves its chair. | Wildcard |
| **The Marl Pits** | uncommon | add | Your workers may marl a worked farm or pasture for one charge. A marled tile gains +1 food for the rest of the game, and can be marled twice. | Economic |
| **The Forest Keepers** | common | implemented | Lumber mills that have stood for twenty turns gain +2 culture. | Civic |
| **The Plough Teams** | common | implemented | Each town gains +1 food for every two improved tiles in its borders. | Economic |
| **Commission: Break the Sod** | common | implemented | Commission. Work twelve improved tiles at the same time. Then every town gains +3 food for twenty turns, and your capital gains a free worker. The card leaves its chair. | Wildcard |
| **The Grain Census** | uncommon | implemented | While seated, this card gains +1 production and +1 gold each time one of your towns grows past its largest size. It starts at +2 of each. | Economic |
| **The Polis** | rare | implemented | While you hold at most four towns, every town gains +25% food. | Economic |
| **The Public Fountains** | common | implemented | Towns beside a river or lake gain +1 happiness for every four citizens, at most +3. | Civic |
| **The Builders' Levy** | uncommon | implemented | Towns may spend a citizen to send production equal to the food it took to grow it to a world wonder being built in another of your towns. | Economic |
| **The Labour Feasts** | uncommon | implemented | Needs a levy. After a town spends a citizen on a levy, it gains +1 culture for every wild tile it works, for ten turns. At most once every ten turns. | Civic |
| **The Gleaners** | common | implemented | Needs a levy. After a town spends a citizen on a levy, it gains +3 food for ten turns. At most once every ten turns. | Economic |
| **The Wild Marches** | common | implemented | +1 culture for every four wild hexes you own. | Civic |
| **The Quiet Provinces** | uncommon | implemented | Each town gains +1 production for every three points of spare authority, at most +3. | Economic |
| **The Road Towns** | common | implemented | Towns joined to your capital by road gain +2 production. | Economic |
| **The Garden Frontier** | rare | implemented | Needs tended land. Workers may tend unowned wild hexes up to two hexes beyond your borders. A hex tended there joins your nearest town. | Economic |

## Tier II

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Watercourses** | uncommon | implemented | Farms directly beside a river irrigate adjacent farms. Irrigated worked farms gain +2 production. Water does not relay beyond that first step. | Economic |
| **The Highlands** | common | implemented | Mines and quarries on hills gain +2 science and +1 production. | Civic |
| **The Coast** | common | implemented | Worked fishing boats gain +3 food and +3 culture. | Civic |
| **Provincial Councils** | uncommon | implemented | Connected towns other than the capital cost one less authority, minimum one, and gain +1 happiness. | Civic |
| **The Grain Dole** | common | implemented | Cities of at least ten population gain +4 happiness and retain an additional 20% of food spent on growth. | Civic |
| **The Waterworks** | uncommon | implemented | Aqueducts cost 33% less production. Towns with an Aqueduct gain +1 happiness for every four citizens, at most +3. | Civic |
| **The Breadbasket** | uncommon | implemented | A town told to stop growing adds its food surplus to its production. | Economic |
| **Migration** | rare | modify: as built | Every ten turns, each of your towns that is at its happiness limit sends one citizen to your smallest connected town that has room to grow. | Economic |
| **Veteran Colonies** | uncommon | implemented | A military unit standing in one of your towns may retire there: the unit is removed and the town gains food equal to its production cost. | Economic |
| **The Landscape Garden** | uncommon | implemented | Needs tended land. Tended tiles beside a great-person work or a wonder gain +3 culture. | Civic |
| **The Engineers' Yards** | common | implemented | Manufactories gain +3 production. Worked farms, mines, quarries and lumber mills beside a manufactory gain +2 production. | Economic |
| **The Tended Country** | uncommon | implemented | Needs tended land. Tended tiles gain +2 production. | Economic |
| **The Old Fields** | uncommon | implemented | +1% food and production for every three works that have stood thirty turns, at most +30%. | Economic |
| **The Hedgerows** | common | implemented | Needs tended land. Worked farms beside a tended tile gain +2 food, once per farm. | Economic |
| **The Great Households** | uncommon | implemented | Each town gains +2% production for every citizen it has, at most +30%. | Economic |
| **The Harbour Cities** | common | implemented | Coastal towns gain +1 culture for every two citizens. | Civic |
| **The Labour Rolls** | uncommon | implemented | Needs a levy. +1% production and food for every two citizens you have levied this game, at most +30%. | Economic |
| **The Terraces of Moray** | uncommon | implemented | Towns beside a mountain may spend a citizen to gain science equal to the food it took to grow that citizen. | Civic |
| **The Book of Settlements** | uncommon | implemented | +3% production and gold for every town you have founded this game, at most +30%. | Economic |
| **The Milestones** | uncommon | implemented | +1% production and gold for every three road hexes you have paved, at most +30%. | Economic |
| **The Colonists** | uncommon | implemented | Towns of at least six citizens may spend a citizen to raise a settler. | Economic |
| **The Teeming Realm** | uncommon | implemented | +1% production and food for every ten citizens in your empire, at most +30%. | Economic |

## Tier III

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Woodwrights** | rare | implemented | Forest and jungle chops grant 150% more production. | Economic |
| **The Common Domain** | uncommon | implemented | Towns of at least ten population may work owned tiles one hex beyond their normal work radius. | Economic |
| **Seasonal Levies** | uncommon | implemented | Needs a levy. After a city spends a citizen on a levy, it gains +60% food for ten turns. A city can gain this at most once every twenty turns. | Economic |
| **The Long Tending** | rare | implemented | Needs tended land. Tended tiles gain +2 food for every 25 turns since they were tended, at most +6. | Economic |
| **The Mountain Schools** | uncommon | implemented | Towns beside a mountain gain +15% science. Worked mines and quarries beside a mountain gain +2 science. | Civic |
| **The Polders** | rare | implemented | Workers may raise a polder on a coast tile that touches at least three of your land tiles, for two charges. A polder yields as a farm on grassland. | Economic |
| **Public Works** | rare | modify: deferred | A great engineer may spend its act in one of your towns to complete an Aqueduct there, or to raise terraces on every worked hill in its borders. | Economic |
| **A Court of Engineers** | rare | implemented | Gain +50% renown, but great-person offers contain only great engineers. | Civic |
| **The Wide Country** | uncommon | implemented | Goal: while this card is seated, claim twelve hexes by outposts, cleared camps or buying. Reward: your three smallest towns each gain two citizens, and every town gains +2 happiness for 30 turns. The card then leaves its chair. | Wildcard |
| **The Raising of the Land** | rare | implemented | When a great engineer rushes the works in one of your towns, every improved or tended tile in its borders gains +1 food and +1 production for the rest of the game. | Economic |
| **The Age of Improvement** | rare | implemented | The bonuses your Orders give to improved tiles are doubled. | Wildcard |
| **The Deep Workings** | uncommon | add | Your workers may deepen a worked mine, quarry or lumber mill for one charge. It gains +1 production for the rest of the game, and can be deepened twice. | Economic |
| **Old Workings** | common | implemented | Worked mines, quarries and lumber mills that have stood for twenty turns gain +3 production. | Economic |
| **The Manors** | common | implemented | Each town gains +1 production for every two improved tiles in its borders. | Economic |
| **The Royal Forests** | uncommon | implemented | Towns working at least three lumber mills gain +25% culture. | Civic |
| **The Megalopolis** | rare | implemented | Towns of ten or more citizens gain +1 science and +1 production for each citizen. | Civic |
| **The Freedom of the City** | uncommon | implemented | The first time each of your towns reaches fifteen citizens, and again at twenty, it gains production equal to forty times its population. | Economic |
| **Plenty** | common | implemented | When a town grows, it gains production equal to eight times its new population. | Economic |
| **The Water Courts** | rare | implemented | A farm joined to fresh water by a chain of your farms counts as having fresh water. | Economic |
| **The Coming of the Water** | uncommon | implemented | When a town finishes an Aqueduct, every farm in its borders gains +1 food for the rest of the game. | Economic |
| **The Mill Wheels** | common | implemented | Towns with a Watermill gain +15% production. | Economic |
| **The Topping Out** | uncommon | implemented | Finishing a wonder grants that town production equal to twenty times its population. | Economic |
| **The Mit'a** | rare | implemented | Needs a levy. A citizen spent on a levy returns to its town twenty turns later. | Economic |
| **The Slack Season** | uncommon | implemented | Needs a levy. Every twentieth turn, after the harvest, your towns may levy whatever their wait. | Economic |
| **The Trained Bands** | uncommon | implemented | Needs a levy. Units raised by a levy start as Veterans. | Military |
| **The Staked Claims** | uncommon | implemented | Each town you found claims every unowned hex within two hexes of it. | Economic |
| **The Quitrents** | common | implemented | +1 gold for every two hexes you own. | Economic |
| **The Hallowed Woods** | uncommon | implemented | Towns working at least five wild tiles gain +25% culture. | Civic |
| **The Mountain Terraces** | rare | implemented | Your towns may work the mountains in their borders. A worked mountain yields 2 science and 1 production. | Civic |
| **The Assay Office** | uncommon | implemented | Each seam you surface grants 60 science. | Civic |
| **The Sovereign Writ** | rare | implemented | Spare authority's bonus to production and border growth has no ceiling: +10% for every five points. | Civic |
| **The Tax Rolls** | uncommon | implemented | When the world takes a census, gain gold equal to five times your citizens. | Economic |
| **The Imperial Roads** | rare | implemented | Towns joined to your capital by road cost no authority. | Civic |
| **The Opening of the Roads** | uncommon | implemented | When one of your towns is first joined to your capital by road, it gains production equal to twenty times its population. | Economic |
| **The Stationes** | uncommon | implemented | Land units gain +3 strength while they stand in a town connected to your capital by road. | Military |
| **The Great Colonies** | rare | implemented | Towns you found start with a third of the citizens of your largest town. | Economic |
| **The Managed Wild** | uncommon | implemented | Needs tended land. Each town gains +5% food for every tended tile in its borders, at most +25%. | Economic |

## Tier IV

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Keeps** | rare | implemented | Workers may build a Keep, one in each town. A Keep gains the yields of every tile around it, and units on its tile gain +5 strength. | Economic |
| **The Land's Great Work** | rare | implemented | The city building the Magnum Opus gains +5% production toward it for each of your towns of at least eight citizens, at most +40%. | Economic |
| **The Garden of the World** | rare | implemented | Needs tended land. Tended tiles gain +2 food, +1 production and +1 culture. Towns working at least six tended tiles gain +3 happiness. | Economic |
| **The Heartland** | rare | implemented | Goal: one of your towns works twelve improved or tended tiles that each yield 5 or more in total. Reward: for the rest of the game that town costs no authority and gains +3 happiness and +20% food. The card then leaves its chair. | Wildcard |
| **The Corvée** | rare | implemented | While one of your cities builds the Magnum Opus, each of your other towns of at least ten citizens may spend one citizen for it, once every five turns. The Opus city gains production equal to the food that citizen took to grow. This shares the town's levy limit. | Economic |
| **The Master of Works** | rare | implemented | When a great engineer rushes the works in the city building the Magnum Opus, each of your towns with a manufactory also sends that city one turn of its own production. | Economic |
| **The Philosophers' Peaks** | uncommon | implemented | Each town gains +2 science for every mountain in its borders, at most +6. | Civic |
| **The Inheritance of Fields** | uncommon | implemented | Worked improvements and tended works that have stood for at least 60 turns gain +1 production. Tended ones also gain +1 culture. | Economic |
| **The Measure of the Land** | rare | implemented | Every town gains +1 production for every 25 hexes your empire owns, at most +6. | Economic |
| **The Mother City** | rare | implemented | Your capital gains +1 production for every citizen it has. | Economic |
| **The General Levy** | rare | implemented | Your towns may spend one citizen to raise their best melee unit. At peace a town may do this once every five turns, sharing the levy limit; while you are at war, once every turn. Units raised this way cost no upkeep inside your borders. | Military |
| **The Great Migration** | rare | implemented | Every ten turns, each foreign town within three hexes of your border loses one citizen to your nearest town, if your town is happier and has room to grow. | Economic |
| **The Encroaching Fields** | uncommon | implemented | Once every ten turns, each of your towns of at least twelve citizens takes one hex from the borders of a foreign town next to it, if nobody works that hex and your town is larger than the town that owns it. | Economic |
| **The Domesday Survey** | rare | implemented | Goal: own at least 150 hexes and work at least 50 improved or tended tiles at the same time. Reward: each town gains production equal to five times the improved or tended tiles it works, toward what it is building, and you gain a great engineer. The card then leaves its chair. | Wildcard |
| **The Two Harvests** | rare | modify: deferred | Needs tended land. A worked farm, mine or lumber mill may also be tended, with any tended work the tile allows. It keeps the improvement, adds the tended work's yield, and counts as both improved and tended, but not as wild. Cards that pay culture on tended tiles do not pay it on these. | Economic |
| **The Great Aqueducts** | rare | implemented | The town raising the Magnum Opus gains +5% production toward it for each of your towns with an Aqueduct, at most +40%. | Economic |
| **The Imperial Highways** | rare | implemented | The town raising the Magnum Opus gains +3% production toward it for every town joined to your capital by road, at most +45%. | Economic |
| **The Theodosian Walls** | uncommon | implemented | Your towns gain +1 defence for every two citizens. | Military |

## Shared with another deck

These rows live in `data/decks/common.json`. A seat holding Expansionist or the deck named beside each one may draw it, so a change here is felt in two decks. The types of the nine cards shared with the four decks not yet sorted are final (the user, 2026-10-16: *"we can confirm any shared cards now yes"*), and the five shared with Dominion carry the types its sheet gave them.

| Card | Rarity | Also in | Tier | Status | Ability | Type |
|---|---|---|---|---|---|---|
| **Market Gardens** | common | Commerce | 0 | implemented | Farms beside a road gain +1 gold. Domestic routes grant an additional +1 food to their destination. | Economic |
| **Sacred Groves** | uncommon | Devotion | 0 | implemented | Worked, unimproved forests gain +1 food and +1 faith. | Civic |
| **The Frontier Militia** | common | Dominion | 0 | implemented | Each town you found starts with the best melee unit you can build standing in it. | Military |
| **Military Colonies** | uncommon | Dominion | I | implemented | Cities with a Barracks gain +45% production toward settlers and workers. | Economic |
| **The Muster of the Fields** | uncommon | Dominion | I | implemented | Cities of at least five citizens may spend one citizen to muster their best legally available melee unit. This shares the city's five-turn levy limit. The unit counts as trained. | Military |
| **The Barbarian Frontier** | uncommon | Dominion | I | implemented | Clearing a barbarian camp claims the camp's hex and every unowned hex around it for your nearest town within five hexes. | Economic |
| **The Farming Garrisons** | common | Dominion | I | implemented | Hexes with a fortified military unit gain +1 food and +1 production. Fortified units gain +2 strength. | Economic |
| **The Flood Festival** | uncommon | Devotion | I | implemented | Each tile your workers turn into burned country grants 8 faith. | Civic |
| **Hydraulic Schools** | common | Scientific | I | implemented | Cities with an Aqueduct gain +20% production toward science buildings. Those beside a mountain also gain +1 science per three citizens. | Civic |
| **Garden Cities** | uncommon | Magisterial | I | implemented | Cities with a Monument gain +1 culture per three worked wild tiles, at most +3. Cities of at least eight population with an Aqueduct gain +1 happiness. | Civic |
| **The Grain Exchange** | uncommon | Commerce | I | implemented | Domestic routes from a city with a Granary give +5 food to their destination. Cities receiving one gain +1 happiness. | Economic |
| **The Road Garrisons** | uncommon | Dominion | II | implemented | Garrisoned cities with a road to your capital gain +5 food and +5 defence. | Economic |
| **Marcher Lords** | uncommon | Dominion | II | implemented | Cities founded within four hexes of a foreign border gain +3 defence and +2 production, and cost one less authority, minimum one. | Economic |
| **The Provincial Fair** | uncommon | Commerce | II | implemented | Connected noncapital cities with a Market gain +3 food. Their worked plantations, camps and pastures gain +2 gold. | Economic |
| **Garden Provinces** | common | Magisterial | II | implemented | Connected cities with a Monument gain +3 food and +3 culture. | Civic |
| **The Sculpted Landscape** | uncommon | Magisterial | III | implemented | Farms beside a great-person improvement gain +2 food and +2 culture. Each farm receives this once regardless of the number of adjacent works. | Civic |

## Open for your pass

- **Still open:**
  - **The gap rule** (question 1 of the builds: *"TBD, will review myself later."*). The cards it touches most:
    - The Megalopolis now pays science per citizen (your revision);
    - The Terraces of Moray pays science for a levy in a mountain town;
    - The Labour Feasts pays culture after a levy, from wild land;
    - The Assay Office pays science for a seam, and seams lie only under hills.
  - **The one-effect trims and splits of 2026-10-13** that the builds did not need. Recommended: apply them; the long form has each one.
    - Sweet Water: split, The Wellsprings takes the happiness.
    - Granary Levies: renamed The Granary Dues.
    - Provincial Councils, The Grain Dole, The Waterworks, The Engineers' Yards, The Mountain Schools and The Garden of the World: each trimmed to one effect.
    - Shared: Marcher Lords trimmed, and The Road Garrisons' defence dropped.
    - Applied already: The Tended Country's split, because The Hedgerows is on the sheet.
  - **The 2026-10-13 proposals no build uses** stay in the long form, off the sheet: The Land Grant, The Gatherers, The Barn-Raising, The Charter Rolls, The Town Rolls, The Mosaic, Labour Dues, The Open Country, The Harvest Feast, Commission: The Long Furrow, Commission: The Granaries Full and The Wellsprings. Say if any should come back.
  - **Public Works:** fold it into The Raising of the Land and cut it. Recommended: yes; its terraces belong to one leader, and raising a town's land is now The Raising of the Land's job.
  - **The Polders:** the reworked text above, a work on a coast tile so that no terrain changes mid-game, or cut. Recommended: the rework.
  - **The Woodwrights:** no build uses it, since a chop spends the land. Recommended: keep it as glue.
  - **The Hydraulic Commonwealth:** a deferred row in `data/decks/common.json` still names Expansionist, though it moved to Scientific, whose review cut it. It is on no sheet. Recommended: retire the row.
  - **Data wording:** Granary Levies' text has no full stop. (Batch E0 fixed The Highlands' small letter.)
- **Answered in your pass of 2026-10-16** (the builds' open questions, with your words in `docs/plans/expansionist-builds.md`):
  - **The Megalopolis:** *"too strong, revise: cities with 10+ population gain +1 science and +1 production for each population"*. Written as you revised it.
  - **3, the shared types:** *"what does this mean, we can confirm any shared cards now yes."* The shared table's types are final.
  - **4, burning:** *"remove burning, feels difficult to implement, maybe implement later"*. The Fire Mosaic is out. The Burning Season keeps the per-tile charter that is built, and its text now says so (`modify: wording`). The Flood Festival keeps paying for each tile, as it does today.
  - **5, "Needs a levy":** *"yes"*. Written onto every card that reads a levy: The Labour Feasts, The Gleaners, The Labour Rolls, Seasonal Levies (`modify: revised`), The Mit'a, The Slack Season and The Trained Bands.
  - **6, a town's largest size:** *"yes"*. The Grain Census and The Freedom of the City read it.
  - **7, The Raising of the Land:** *"sure"*. At Tier III, triggered by the engineer's existing act (`modify: revised`).
  - **8, tiles raised by workers:** *"yes, i like it"*. The Marl Pits and The Deep Workings.
  - **9, workable mountains:** *"yes, thats a cool mechanic"*. The Mountain Terraces.
  - **10, roads:** *"agree, maybe in the future a military unit can build it, but caravans only for now."* The road network opens with The Road Home.
- **Ruled earlier on 2026-10-16** (the builds' first two passes): one improvement build, with tended land a splash; the tall build, with the people's levy folded in, and the wide build, each with three flavours; and bridge cards for flexing between them.
- **Your second pass of 2026-10-16** (written into the rows above):
  - **Cut:** The Forest Gardens and Daughter Towns (`modify: cut`). The build retires their data rows.
  - **Renamed and revised:** The Spirits of Place is now The Ambarvalia, after the Roman rite that blessed the fields. It pays faith for every two improved tiles in a town (`modify: revised`).
  - **Shared with Dominion:** The Frontier Militia, and The Farming Garrisons, which now also gives fortified units +2 strength. I read your note on The Frontier Militia as the end of its deferral; say if it should stay deferred.
  - **New:** The Woodland Bands (Tier 0): your units ignore the movement cost of forest and jungle, and gain +2 strength there. The Burhs (Tier I), after Alfred's fortified towns: +3 defence for each defensive building in a town, and +100% production toward defensive buildings.
  - **The Wild Marches:** +1 culture for every four wild hexes, not five.
  - **Removed before it reached the sheet:** your new faith card (+1 faith on unimproved forest and jungle), because Sacred Groves already does that job (*"ah i forgot about sacred groves, axe my new card please"*).
- **Your third pass of 2026-10-16:**
  - **New, Tier IV:** The Keeps. Workers may build one Keep in each town. A Keep gains the yields of every tile around it, and units on its tile gain +5 strength. You chose the name (*"lets call it a 'keep' instead of a manor"*).
  - **A name clash:** the game already has a Keep building. Only The Vigil Charter unlocks it, and that card is retired, so no one can build the building now. Ruled: the build retires the old building row, so that the game has one Keep (*"yup, retire the old building"*).
  - **The Theodosian Walls:** +1 defence for every two citizens, not every citizen.
  - **The Road Patrols** becomes The Stationes, after the Roman posts along the roads: land units gain +3 strength while they stand in a town connected to your capital by road.
  - I read your changes to these cards as the end of their deferral, so all four Military cards (The Frontier Militia, The Trained Bands, The Stationes and The Theodosian Walls) go into the build. Say if any should stay deferred.
