# The Expansionist deck

The deck's cards, by tier: name, rarity, status, ability and type. This sheet is the spec of record for the deck, and `test/sim/decks/expansionist.test.ts` checks it against `data/decks/expansionist.json` and, for the shared table, `data/decks/common.json`.

- **Status:**
  - `implemented`: in the data, dealt, and plays as written.
  - `modify`: in the data, but needs work. The word after the colon says why: `revised` (your comments on the review page of 2026-10-21, `docs/plans/expansionist-themes.md`, section 11), `reworked` (a rework in the themes pass of 2026-10-21), `deferred` (not dealt, because it needs a new shape), or `as built` (the game does something slightly different from the text). The ability shown is the target.
  - `add`: not in the data yet. A new card of the themes pass.
- **Type:** the last column of each card table says which chair the card fits: **Military**, **Economic**, **Civic** or **Wildcard**. A card fits a chair of its own type or a Wildcard chair, and a Wildcard card fits only a Wildcard chair. The sorting rules and every government's chairs are in `docs/plans/doctrines-governments-chairs.md`, section 4. The sync test checks this column against the `type` of every row the sheet lists, the `modify` rows and the shared table's cards included. A charter takes no chair; its type is for its face.
- **Gates:** "Needs tended land" deals a card only to a seat holding a tended-work charter. "Needs a levy" deals a card only to a seat holding a card that grants a levy, in a chair or not.
- **Why each card is here:** `docs/plans/expansionist-themes.md`, the themes pass of 2026-10-21. It gives the engine (citizens and the levy), the four themes (the raised land, the frontier, public works and the militia), and your rulings in section 11. Each card's theme and role are in `docs/plans/expansionist-list-proposed.md`. The earlier pass, the builds you accepted on 2026-10-16, is `docs/plans/expansionist-builds.md`.
- **The build:** the plan is `docs/plans/expansionist-themes-triage.md` (batches E7 to E13). Batch E7 wrote this sheet from the themes pass, retired the fifteen cut cards that had a data row, and built the ten cards changed in place: The Rope Stretchers, Six Gardens, The Milestones, The Teeming Realm, The Staked Claims, Plenty, The Wide Country, The Measure of the Land, The Mother City and The Domesday Survey. Six Gardens, The Wide Country and The Domesday Survey now leave an institution: effects that hold for the rest of the game and take no chair. Batch E8 built five new cards in shapes that already existed: The Founding Furrow, The Horrea, The Land Hunger, The Many Hands and The Capitolia. Batch E9 built the land: The Burning Season burns an improved tile and keeps the work, The Marl Pits marks the farms and pastures beside a new mine or quarry, Commission: Break the Sod leaves works counted as ten turns older, The Two Harvests counts farms, mines and lumber mills as tended, and The Mountain Schools asks for two mountains in a town's borders. The first round of batches, E0 to E6, is `docs/plans/expansionist-build-triage.md`.
- **Doctrines:** proposed on 2026-10-17, eight in each of Tiers I to IV, for your pass; none is built. Each tier's Doctrine table sits above its Orders, and the Build column names the build or flavour of 2026-10-16 that each is written for. The reasons, drawbacks, pairs and shapes, and the questions, are in `docs/plans/expansionist-builds.md`, "Doctrines, proposed 2026-10-17". The themes pass did not change them (`docs/plans/expansionist-themes.md`, section 8).
- **The long form** (the D3 "built as" details, the tended works as built, the synergy section, the proposed cuts and the proposed revision of 2026-10-13): `docs/decks/reference/expansionist-2026-10-16.md`.

| Tier | Implemented | Modify | Add | All | Doctrines |
|---|---|---|---|---|---|
| Tier 0 | 14 | 0 | 0 | 14 | none |
| Tier I | 25 | 0 | 1 | 26 | 8 proposed |
| Tier II | 21 | 2 | 2 | 25 | 8 proposed |
| Tier III | 29 | 1 | 1 | 31 | 8 proposed |
| Tier IV | 17 | 0 | 1 | 18 | 8 proposed |
| **All** | **106** | **3** | **5** | **114** | **32 proposed** |
| Shared | 17 | 0 | 0 | 17 |  |

**By type** (the chair a card fits):

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| Tier 0 | 1 | 8 | 5 | 0 |
| Tier I | 1 | 14 | 9 | 2 |
| Tier II | 1 | 14 | 10 | 0 |
| Tier III | 2 | 18 | 9 | 2 |
| Tier IV | 2 | 9 | 4 | 3 |
| **All** | **7** | **63** | **37** | **7** |
| Shared | 2 | 8 | 7 | 0 |

The 114 cards are 111 that take a chair and three charters (The Fish Traps, The Wild Orchards and The Burning Season).

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
| **The Rope Stretchers** | common | implemented | Each town gains +1 science for every three improved tiles in its borders. | Civic |
| **The Road Home** | common | implemented | Each town you found is joined to your nearest town by road. | Economic |
| **The Work Gangs** | common | implemented | Towns of at least three citizens may spend a citizen to raise a worker. This shares the town's levy wait. | Economic |
| **The Woodland Bands** | common | implemented | Your units ignore the extra movement cost of forest and jungle, and gain +2 strength while they stand in forest or jungle. | Military |
| **The Founding Furrow** | common | implemented | Founding a town grants culture equal to five times the number of towns you hold. | Civic |
| **The Horrea** | uncommon | implemented | Each Granary you hold gives +1 authority. | Civic |

## Tier I

**Doctrines,** proposed 2026-10-17 for the tier-4 governments (not built):

| Doctrine | Build | Text |
|---|---|---|
| **Bound to the Soil** | improvement | Your workers never run out of charges. You may hold at most one worker for every two towns. |
| **Synoecism** | tall | Your towns of six or more citizens grow 30% faster. Towns you found cost 2 more authority. |
| **The Gift of the River** | tall: waterworks | Worked tiles beside a river gain +1 food and +1 production. You can found towns only on fresh water or the coast. |
| **The Seven Fat Years** | tall: breadbasket | Your towns keep half of their stored food when they grow. Your towns cannot grow beyond twelve citizens. |
| **The Sacred Spring** | wide | Settlers cost half as much to build and to buy. Your towns of eight or more citizens grow 25% more slowly. |
| **The Highland Clans** | wide: highlands | Towns on hills cost 1 less authority and gain +2 production. Towns off the hills grow 20% more slowly. |
| **The Commanderies** | wide: well-ordered realm | Each of your towns costs 1 less authority, minimum one. Your borders grow 30% more slowly. |
| **The Royal Road** | wide: road network | Each town you found is joined to your capital by road. Your roads cost twice as much gold to keep. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Burhs** | common | implemented | Towns gain +3 defence for every defensive building in them, and +100% production toward defensive buildings. | Military |
| **Levy of the Land** | uncommon | implemented | Cities may spend one citizen to gain production equal to the food it took to grow that citizen. A city may levy once every five turns. | Economic |
| **Tinkers' Guild** | common | implemented | Workers you produce or purchase gain +1 charge. | Economic |
| **The Old Songs** | common | implemented | Worked unimproved land gains +2 culture. | Civic |
| **The Local Census** | common | implemented | A town working at least four improved or tended tiles costs one less authority, minimum one. | Civic |
| **The Wild Orchards** | common | implemented | Once drafted, workers may tend a forest or jungle tile into a wild orchard for one charge: +1 food and +1 gold. No chair required. | Economic |
| **The Burning Season** | uncommon | implemented | Once drafted, workers may burn a grassland or plains tile for one charge: +1 food. Bare ground becomes burned country; an improvement on the tile stays. No chair required. | Economic |
| **Dark Earth** | uncommon | implemented | Worked farms gain +2 food once they have stood for 20 turns, and another +2 food once they have stood for 50 turns. | Economic |
| **The Three Sisters** | common | implemented | Worked farms beside a plantation or a pasture gain +2 food and +2 production, once per farm. | Economic |
| **The Commons** | uncommon | implemented | Each town gains +1 happiness for every two wild tiles it works, at most +3. | Civic |
| **The Hard Country** | common | implemented | Worked desert and tundra tiles gain +1 food and +1 production. | Economic |
| **The Master Builders** | common | implemented | Towns working at least three mines, quarries or lumber mills give +1 renown a turn, favouring great engineers. | Civic |
| **Outposts** | uncommon | implemented | Workers may plant an outpost on a wild tile within three hexes of your border, for one charge. It claims its hex and the ring around it for your nearest town, and costs no authority. A town founded on an outpost keeps that land. | Economic |
| **Six Gardens** | uncommon | implemented | Needs tended land. Commission. Have six tended tiles. Then, for the rest of the game, tended tiles gain +1 culture. The card leaves its chair. | Wildcard |
| **The Marl Pits** | uncommon | implemented | When your workers finish a mine or quarry, each farm or pasture beside it gains +1 food for the rest of the game, at most +2 on one tile. | Economic |
| **The Forest Keepers** | common | implemented | Lumber mills that have stood for twenty turns gain +2 culture. | Civic |
| **Commission: Break the Sod** | common | implemented | Commission. Work twelve improved tiles at the same time. Then, for the rest of the game, your improvements count as having stood ten turns longer. The card leaves its chair. | Wildcard |
| **The Grain Census** | uncommon | implemented | While seated, this card gains +1 production and +1 gold each time one of your towns grows past its largest size. It starts at +2 of each. | Economic |
| **The Public Fountains** | common | implemented | Towns beside a river or lake gain +1 happiness for every four citizens, at most +3. | Civic |
| **The Labour Feasts** | uncommon | implemented | Needs a levy. After a town spends a citizen on a levy, it gains +1 culture for every wild tile it works, for ten turns. At most once every ten turns. | Civic |
| **The Gleaners** | common | implemented | Needs a levy. After a town spends a citizen on a levy, it gains +3 food for ten turns. At most once every ten turns. | Economic |
| **The Wild Marches** | common | implemented | +1 culture for every four wild hexes you own. | Civic |
| **The Quiet Provinces** | uncommon | implemented | Each town gains +1 production for every three points of spare authority, at most +3. | Economic |
| **The Road Towns** | common | implemented | Towns joined to your capital by road gain +2 production. | Economic |
| **The Aediles** | uncommon | add | While seated, this card gains +1 production and +1 culture each time you finish a public work. It starts at +2 of each. | Civic |
| **The Land Hunger** | uncommon | implemented | While another empire holds more towns than you, your towns build settlers 25% faster, and your settlers gain +1 movement. | Economic |

## Tier II

**Doctrines,** proposed 2026-10-17 for the tier-10 governments (not built):

| Doctrine | Build | Text |
|---|---|---|
| **The Georgics** | improvement | Your works count as having stood twice as long. Each improvement costs your workers two charges. |
| **The Curator of Waters** | tall: waterworks | Every town of yours counts as having fresh water. Aqueducts cost 50% more production. |
| **The Royal Works** | tall: great works | While your capital builds a wonder, each of your other towns sends it 20% of its production. |
| **The Liturgies** | tall: breadbasket | Needs a levy. Your towns may levy every two turns instead of every five. Your towns cannot grow beyond fifteen citizens. |
| **Free Mining** | wide: highlands | Your workers may build mines on hills up to two hexes beyond your borders, and each claims its hex for your nearest town. Hexes cost twice as much gold to buy. |
| **The Censors** | wide: well-ordered realm | When the world takes a census, each of your towns gains a citizen. Your towns' food surplus counts 20% less toward growth. |
| **The Hiving** | flex | The first time each of your towns reaches twelve citizens, it raises a free settler. You can no longer build or buy settlers. |
| **The Wildwood Compact** | tended land | Needs tended land. Tended works cost your workers no charge. Your workers can no longer build farms. |

**Orders:**

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
| **Veteran Colonies** | uncommon | modify: revised | A military unit standing in one of your towns may retire there: the unit is removed and the town gains one citizen. | Economic |
| **The Engineers' Yards** | common | implemented | Manufactories gain +3 production. Worked farms, mines, quarries and lumber mills beside a manufactory gain +2 production. | Economic |
| **The Tended Country** | uncommon | implemented | Needs tended land. Tended tiles gain +2 production. | Economic |
| **The Old Fields** | uncommon | implemented | +1% food and production for every three works that have stood thirty turns, at most +30%. | Economic |
| **The Hedgerows** | common | implemented | Needs tended land. Worked farms beside a tended tile gain +2 food, once per farm. | Economic |
| **The Great Households** | uncommon | implemented | Each town gains +2% production for every citizen it has, at most +30%. | Economic |
| **The Harbour Cities** | common | implemented | Coastal towns gain +1 culture for every two citizens. | Civic |
| **The Labour Rolls** | uncommon | implemented | Needs a levy. +1% production and food for every two citizens you have levied this game, at most +30%. | Economic |
| **The Terraces of Moray** | uncommon | implemented | Towns beside a mountain may spend a citizen to gain science equal to the food it took to grow that citizen. | Civic |
| **The Book of Settlements** | uncommon | implemented | +3% production and gold for every town you have founded this game, at most +30%. | Economic |
| **The Milestones** | uncommon | implemented | +1% gold and culture for every three road hexes you have paved, at most +30%. | Civic |
| **The Colonists** | uncommon | implemented | Towns of at least six citizens may spend a citizen to raise a settler. | Economic |
| **The Teeming Realm** | uncommon | implemented | +1% science and culture for every ten citizens in your empire, at most +30%. | Civic |
| **The Staked Claims** | uncommon | implemented | Each town you found claims every unowned hex within two hexes of it. | Economic |
| **The Many Hands** | uncommon | implemented | Your towns build empire buildings 3% faster for each town you hold, at most +36%. | Economic |
| **The Burghers** | uncommon | add | Towns of at least twelve citizens fill their guild bar half again as fast. | Civic |
| **Watch and Ward** | common | add | Needs a levy. Units a levy raised gain +5 strength in your own territory. | Military |

## Tier III

**Doctrines,** proposed 2026-10-17 for the tier-18 governments (not built):

| Doctrine | Build | Text |
|---|---|---|
| **Crop Rotation** | improvement | Worked improvements yield twice their own bonus. Worked unimproved tiles yield nothing. |
| **The Contented City** | tall | Your citizens ask half as much happiness. Your gold income is halved. |
| **The Builder Kings** | tall: great works | +35% production toward wonders. You can no longer buy buildings or units. |
| **The Annona** | tall: breadbasket | Each turn, every town of fifteen or more citizens sends its food surplus to your smallest town. |
| **Empire Without End** | wide | Towns you found cost no authority. Your towns cannot grow beyond twelve citizens. |
| **All Roads Lead to Rome** | wide: road network | Your capital gains +3% production and gold for each town joined to it by road, at most +45%. Each town not joined to it costs 2 more authority. |
| **The Planted Towns** | flex | Towns you found start with four citizens and a Monument. Training a settler also costs its town a citizen. |
| **The Garden Peoples** | tended land | Needs tended land. Tended tiles gain +1 food, +1 production and +1 culture. Your other improvements yield 1 less food. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **Seasonal Levies** | uncommon | implemented | Needs a levy. After a city spends a citizen on a levy, it gains +60% food for ten turns. A city can gain this at most once every twenty turns. | Economic |
| **The Long Tending** | rare | implemented | Needs tended land. Tended tiles gain +2 food for every 25 turns since they were tended, at most +6. | Economic |
| **The Mountain Schools** | uncommon | implemented | Towns with at least two mountains in their borders gain +15% science. Worked mines and quarries beside a mountain gain +2 science. | Civic |
| **The Polders** | rare | implemented | Workers may raise a polder on a coast tile that touches at least three of your land tiles, for two charges. A polder yields as a farm on grassland. | Economic |
| **A Court of Engineers** | rare | implemented | Gain +50% renown, but great-person offers contain only great engineers. | Civic |
| **The Wide Country** | uncommon | implemented | Commission. Claim twelve hexes by outposts, cleared camps or buying while this card is seated. Then, for the rest of the game, your borders grow 25% faster. The card leaves its chair. | Wildcard |
| **The Raising of the Land** | rare | implemented | When a great engineer rushes the works in one of your towns, every improved or tended tile in its borders gains +1 food and +1 production for the rest of the game. | Economic |
| **The Age of Improvement** | rare | implemented | The bonuses your Orders give to improved tiles are doubled. | Wildcard |
| **Old Workings** | common | implemented | Worked mines, quarries and lumber mills that have stood for twenty turns gain +3 production. | Economic |
| **The Royal Forests** | uncommon | implemented | Towns working at least three lumber mills gain +25% culture. | Civic |
| **The Megalopolis** | rare | implemented | Towns of ten or more citizens gain +1 science and +1 production for each citizen. | Civic |
| **The Freedom of the City** | uncommon | implemented | The first time each of your towns reaches fifteen citizens, and again at twenty, it gains production equal to forty times its population. | Economic |
| **Plenty** | common | implemented | When a town grows, it gains production equal to five times its new population. | Economic |
| **The Water Courts** | rare | implemented | A farm joined to fresh water by a chain of your farms counts as having fresh water. | Economic |
| **The Coming of the Water** | uncommon | implemented | When a town finishes an Aqueduct, every farm in its borders gains +1 food for the rest of the game. | Economic |
| **The Mill Wheels** | common | implemented | Towns with a Watermill gain +15% production. | Economic |
| **The Topping Out** | uncommon | modify: reworked | Finishing an empire building grants each of your towns production equal to five times its population. | Economic |
| **The Mit'a** | rare | implemented | Needs a levy. A citizen spent on a levy returns to its town twenty turns later. | Economic |
| **The Slack Season** | uncommon | implemented | Needs a levy. Every twentieth turn, after the harvest, your towns may levy whatever their wait. | Economic |
| **The Trained Bands** | uncommon | implemented | Needs a levy. Units raised by a levy start as Veterans. | Military |
| **The Quitrents** | common | implemented | +1 gold for every two hexes you own. | Economic |
| **The Hallowed Woods** | uncommon | implemented | Towns working at least five wild tiles gain +25% culture. | Civic |
| **The Mountain Terraces** | rare | implemented | Your towns may work the mountains in their borders. A worked mountain yields 2 science and 1 production. | Civic |
| **The Sovereign Writ** | rare | implemented | Spare authority's bonus to production and border growth has no ceiling: +10% for every five points. | Civic |
| **The Tax Rolls** | uncommon | implemented | When the world takes a census, gain gold equal to five times your citizens. | Economic |
| **The Imperial Roads** | rare | implemented | Towns joined to your capital by road cost no authority. | Civic |
| **The Opening of the Roads** | uncommon | implemented | When one of your towns is first joined to your capital by road, it gains production equal to twenty times its population. | Economic |
| **The Stationes** | uncommon | implemented | Land units gain +3 strength while they stand in a town connected to your capital by road. | Military |
| **The Great Colonies** | rare | implemented | Towns you found start with a third of the citizens of your largest town. | Economic |
| **The Capitolia** | uncommon | implemented | Each empire building you hold gives each of your towns +1 culture. | Civic |
| **The Cura Aquarum** | rare | add | Towns joined to your capital by road count as having an Aqueduct. | Economic |

## Tier IV

**Doctrines,** proposed 2026-10-17 for the tier-26 governments (not built):

| Doctrine | Build | Text |
|---|---|---|
| **The Physiocrats** | improvement | Every improved tile gains +1 food, +1 production and +1 gold. Your towns build buildings 30% more slowly. |
| **The Hydraulic Empire** | tall: waterworks | Worked farms with fresh water gain +2 food and +2 production. Towns away from fresh water cost 2 more authority. |
| **The Cathedral Lodges** | tall: great works | A great engineer's act does not use it up: it may act again twenty turns later. You earn half as much renown. |
| **The High Towns** | wide: highlands | Your settlers may cross mountains and found towns on them. A town on a mountain gains +4 science and cannot grow beyond eight citizens. |
| **The Mandarinate** | wide: well-ordered realm | Each point of spare authority gives +1% science and culture, at most +30%. Each of your towns costs 1 more authority. |
| **The Inward Roads** | wide: road network | Towns joined to your capital by road gain +20% food and production. Your caravans may not travel to other empires. |
| **Town and Country** | flex | Your towns of ten or more citizens cost no authority, and the citizens of your smaller towns ask no happiness. Your towns grow 30% more slowly. |
| **Arcadia** | tended land | Needs tended land. Your tended tiles also count as improved for every card. Your workers can build only tended works. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Keeps** | rare | implemented | Workers may build a Keep, one in each town. A Keep gains the yields of every tile around it, and units on its tile gain +5 strength. | Economic |
| **The Garden of the World** | rare | implemented | Needs tended land. Tended tiles gain +2 food, +1 production and +1 culture. Towns working at least six tended tiles gain +3 happiness. | Economic |
| **The Heartland** | rare | implemented | Goal: one of your towns works twelve improved or tended tiles that each yield 5 or more in total. Reward: for the rest of the game that town costs no authority and gains +3 happiness and +20% food. The card then leaves its chair. | Wildcard |
| **The Corvée** | rare | implemented | While one of your cities builds the Magnum Opus, each of your other towns of at least ten citizens may spend one citizen for it, once every five turns. The Opus city gains production equal to the food that citizen took to grow. This shares the town's levy limit. | Economic |
| **The Master of Works** | rare | implemented | When a great engineer rushes the works in the city building the Magnum Opus, each of your towns with a manufactory also sends that city one turn of its own production. | Economic |
| **The Philosophers' Peaks** | uncommon | implemented | Each town gains +2 science for every mountain in its borders, at most +6. | Civic |
| **The Inheritance of Fields** | uncommon | implemented | Worked improvements and tended works that have stood for at least 60 turns gain +1 production. Tended ones also gain +1 culture. | Economic |
| **The Measure of the Land** | rare | implemented | Every town gains +1 science for every 25 hexes your empire owns, at most +10. | Civic |
| **The Mother City** | rare | implemented | Your capital gains +5% production and +5% culture for each town you have founded this game. | Civic |
| **The General Levy** | rare | implemented | Your towns may spend one citizen to raise their best melee unit. At peace a town may do this once every five turns, sharing the levy limit; while you are at war, once every turn. Units raised this way cost no upkeep inside your borders. | Military |
| **The Great Migration** | rare | implemented | Every ten turns, each foreign town within three hexes of your border loses one citizen to your nearest town, if your town is happier and has room to grow. | Economic |
| **The Encroaching Fields** | uncommon | implemented | Once every ten turns, each of your towns of at least twelve citizens takes one hex from the borders of a foreign town next to it, if nobody works that hex and your town is larger than the town that owns it. | Economic |
| **The Domesday Survey** | rare | implemented | Commission. Own at least 120 hexes and work at least 40 improved or tended tiles at the same time. Then, for the rest of the game, each town gains +1 science for each improved or tended tile it works. The card leaves its chair. | Wildcard |
| **The Two Harvests** | rare | implemented | Needs tended land. Your worked farms, mines and lumber mills also count as tended for your cards, but not as wild. | Wildcard |
| **The Great Aqueducts** | rare | implemented | The town raising the Magnum Opus gains +5% production toward it for each of your towns with an Aqueduct, at most +40%. | Economic |
| **The Imperial Highways** | rare | implemented | The town raising the Magnum Opus gains +3% production toward it for every town joined to your capital by road, at most +45%. | Economic |
| **The Theodosian Walls** | uncommon | implemented | Your towns gain +1 defence for every two citizens. | Military |
| **The Public Good** | rare | add | +1% science and culture for each public work you hold, at most +25%. | Civic |

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
| **The Assay** | common | Scientific | I | implemented | Hexes with a strategic resource gain +2 science. | Civic |
| **Garden Cities** | uncommon | Magisterial | I | implemented | Cities with a Monument gain +1 culture per three worked wild tiles, at most +3. Cities of at least eight population with an Aqueduct gain +1 happiness. | Civic |
| **The Grain Exchange** | uncommon | Commerce | I | implemented | Domestic routes from a city with a Granary give +5 food to their destination. Cities receiving one gain +1 happiness. | Economic |
| **The Road Garrisons** | uncommon | Dominion | II | implemented | Garrisoned cities with a road to your capital gain +5 food and +5 defence. | Economic |
| **Marcher Lords** | uncommon | Dominion | II | implemented | Cities founded within four hexes of a foreign border gain +3 defence and +2 production, and cost one less authority, minimum one. | Economic |
| **The Provincial Fair** | uncommon | Commerce | II | implemented | Connected noncapital cities with a Market gain +3 food. Their worked plantations, camps and pastures gain +2 gold. | Economic |
| **Garden Provinces** | common | Magisterial | II | implemented | Connected cities with a Monument gain +3 food and +3 culture. | Civic |
| **The Sculpted Landscape** | uncommon | Magisterial | III | implemented | Farms beside a great-person improvement gain +2 food and +2 culture. Each farm receives this once regardless of the number of adjacent works. | Civic |

## Open for your pass

- **Ruled 2026-10-21** (`docs/plans/expansionist-themes.md`, section 11: your comments on the review page and your answers to its two questions, in your words, with what each changes). They are written into the rows above:
  - **Changed:** Plenty (five times the new population, not eight), The Burning Season (any grassland or plains), The Land Hunger (settlers built faster and with +1 movement), The Mountain Schools (at least two mountains in the town's borders), The Mother City (+5% production and culture for each town founded), The Measure of the Land (at most +10) and Veteran Colonies (the town gains one citizen).
  - **Cut:** The Beating of the Bounds, The Garden Frontier and The Builders' Levy (your comments), then The Common Domain and Home for the Harvest (your answers). Veteran Colonies stays.
  - **Taken as standing:** the recommendations of the themes doc's section 10 that section 11 did not change, among them dropping the gap rule (question 2) and the cuts of question 9 (the triage's reading 5). The build uses the triage's readings 1 to 36 until you mark one.
  - **Retired in batch E7:** the fifteen cut cards that had a data row: The Pyramid Builders, The Beating of the Bounds, The Prospectors, The Garden Frontier, The Builders' Levy, The Plough Teams, The Polis, The Landscape Garden, The Common Domain, The Woodwrights, Public Works, The Manors, The Assay Office, The Managed Wild and The Land's Great Work. The Deep Workings had no row and left the sheet. The last section of `docs/plans/expansionist-list-proposed.md`, "Cut by this pass", gives each card's old text and the reason for the cut, so you can restore one.
- **Still open:**
  - **The 32 proposed Doctrines,** eight a tier, for you to filter and edit (*"aim for 8 for each tier (tier 1-4) and i'll filter them down/make edits"*). Their reasons, drawbacks, pairs and shapes, and seven questions, are in `docs/plans/expansionist-builds.md`, "Doctrines, proposed 2026-10-17".
  - **The build plan's three questions** (`docs/plans/expansionist-themes-triage.md`, "Questions for the user"): the citizens Veteran Colonies makes, whether the bots should learn to levy, and the readings.
  - **Migration** plays as built. The first triage's reading 36 still waits for you.
  - **The one-effect trims and splits of 2026-10-13** that the builds did not need. The themes pass did not apply them. Recommended: apply them; the long form has each one.
    - Sweet Water: split, The Wellsprings takes the happiness.
    - Granary Levies: renamed The Granary Dues.
    - Provincial Councils, The Grain Dole, The Waterworks, The Engineers' Yards, The Mountain Schools and The Garden of the World: each trimmed to one effect.
    - Shared: Marcher Lords trimmed, and The Road Garrisons' defence dropped.
    - Applied already: The Tended Country's split, because The Hedgerows is on the sheet.
  - **The 2026-10-13 proposals no build uses** stay in the long form, off the sheet: The Land Grant, The Gatherers, The Barn-Raising, The Charter Rolls, The Town Rolls, The Mosaic, Labour Dues, The Open Country, The Harvest Feast, Commission: The Long Furrow, Commission: The Granaries Full and The Wellsprings. Say if any should come back.
  - **The Polders:** the reworked text above, a work on a coast tile so that no terrain changes mid-game, or cut. Recommended: the rework.
  - **Data wording:** Granary Levies' text has no full stop. (Batch E0 fixed The Highlands' small letter.)
- **Done:**
  - **The Hydraulic Commonwealth:** a deferred row in `data/decks/common.json` that named Expansionist and was on no sheet. Scientific batch S1b retired it.
  - **Public Works** and **The Woodwrights:** cut by the themes pass, and their rows retired in batch E7.
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
