# The Expansionist deck

The deck's cards, by tier: name, rarity, status, ability and type. This sheet is the spec of record for the deck, and `test/sim/decks/expansionist.test.ts` checks it against `data/decks/expansionist.json` and, for the shared table, `data/decks/common.json`.

- **Status:**
  - `implemented`: in the data, dealt, and plays as written.
  - `modify`: in the data, but needs work. The word after the colon says why: `revised` (your comments on the review page of 2026-10-21, `docs/plans/expansionist-themes.md`, section 11), `reworked` (a rework in the themes pass of 2026-10-21), `deferred` (not dealt, because it needs a new shape), or `as built` (the game does something slightly different from the text). The ability shown is the target.
  - `add`: not in the data yet. A new card of the themes pass.
- **Type:** the last column of each card table says which chair the card fits: **Military**, **Economic**, **Civic** or **Wildcard**. A card fits a chair of its own type or a Wildcard chair, and a Wildcard card fits only a Wildcard chair. The sorting rules and every government's chairs are in `docs/plans/doctrines-governments-chairs.md`, section 4. The sync test checks this column against the `type` of every row the sheet lists, the `modify` rows and the shared table's cards included. A charter takes no chair; its type is for its face.
- **Gates:** "Needs tended land" deals a card only to a seat holding a tended-work charter. "Needs a levy" deals a card only to a seat holding a card that grants a levy, in a chair or not. A Doctrine that says "Needs tended land" is offered under the same gate (`DoctrineDef.needsTendedWork`).
- **Why each card is here:** `docs/plans/expansionist-themes.md`, the themes pass of 2026-10-21. It gives the engine (citizens and the levy), the four themes (the raised land, the frontier, public works and the militia), and your rulings in section 11. Each card's theme and role are in `docs/plans/expansionist-list-proposed.md`. The earlier pass, the builds you accepted on 2026-10-16, is `docs/plans/expansionist-builds.md`.
- **The build:** the plan is `docs/plans/expansionist-themes-triage.md` (batches E7 to E13). Batch E7 wrote this sheet from the themes pass, retired the fifteen cut cards that had a data row, and built the ten cards changed in place: The Rope Stretchers, Six Gardens, The Milestones, The Teeming Realm, The Staked Claims, Plenty, The Wide Country, The Measure of the Land, The Mother City and The Domesday Survey. Six Gardens, The Wide Country and The Domesday Survey now leave an institution: effects that hold for the rest of the game and take no chair. Batch E8 built five new cards in shapes that already existed: The Founding Furrow, The Horrea, The Land Hunger, The Many Hands and The Capitolia. Batch E9 built the land: The Burning Season burns an improved tile and keeps the work, The Marl Pits marks the farms and pastures beside a new mine or quarry, Commission: Break the Sod leaves works counted as ten turns older, The Two Harvests counts farms, mines and lumber mills as tended, and The Mountain Schools asks for two mountains in a town's borders. Batch E10 built the militia and the trades: Veteran Colonies gives a town one citizen when a soldier retires there, Watch and Ward gives units a levy raised +5 strength in your own territory, and The Burghers fill the guild bar half again as fast in towns of twelve citizens or more. Batch E11 built public works and empire buildings: six buildings (the Granary, Aqueduct, Watermill, Harbour, Public Bath and Cistern) are marked as public works, The Aediles grows with each public work you finish, The Public Good pays for each public work you hold, and The Topping Out pays every town when you finish an empire building. Batch E12 built The Cura Aquarum: a town joined to your capital by road counts as having an Aqueduct for everything an Aqueduct does and for every card that asks whether a town has one, but not for what was built (score, upkeep, triumphs, wagers, buying, the build list, or finishing one). The first round of batches, E0 to E6, is `docs/plans/expansionist-build-triage.md`.
- **Doctrines:** 24 (4, 6, 7 and 7 across Tiers I to IV), all dealt, after your comments of 2026-10-23 and 2026-11-03 (`docs/plans/doctrine-review-2026-11-05.md`). A Doctrine is held for the whole game and takes no chair. Each tier's Doctrine table sits above its Orders, and the Build column names the build or flavour of 2026-10-16 that each is written for. `docs/plans/doctrines-build-triage.md` gives the batch that built each one. The reasons and pairs are in `docs/plans/expansionist-builds.md`, "Doctrines, proposed 2026-10-17".
- **The long form** (the D3 "built as" details, the tended works as built, the synergy section, the proposed cuts and the proposed revision of 2026-10-13): `docs/decks/reference/expansionist-2026-10-16.md`.
- **Batch DS1** (2026-11-10, `docs/plans/deck-simplification-2026-11-10.md`, `docs/flags.md` item (hhhhhhh)) retired 39 rows of this deck and 6 shared rows. It moved The Fish Traps from Tier 0 to Tier I. A moved row keeps its text until a later batch changes it. "Retired rows" below gives the reason for each cut. The spec also moves the shared Market Gardens from Tier 0 to Tier II. That move waits for a ruling, because Expansionist and Commerce would then share no card at Tier I or earlier (ruling (qqqqqq) 14).
- **Batch DS3** (2026-11-10, the same spec) gave 37 rows of this deck and 6 shared rows their new, shorter text, and changed their effects to match. A simplified card lost the clause the spec drops, and a changed card has the new effect. Each card's Note is in the spec. Market Gardens has its new effect ("Hexes with a road gain +1 gold") and stays at Tier 0 while its move waits. **The Terraces of Moray is held:** its new text ("A levy also grants science equal to half its production") needs a moment the game does not have, a levy that pays a share of its own production as another yield. The row keeps its old text and effect until that is ruled. Readings taken: "irrigated farms" (The Watercourses) are farms on fresh water, which is the Hanging Gardens' reading; Seasonal Levies keeps its food from stacking while it runs, as The Gleaners does; The Keep loses its +5 strength on the improvement row itself. Five effect shapes that no row used after this batch are removed: the "standing in forest or jungle" combat condition (The Woodland Bands), the river farms' water relay (The Watercourses), the production bonus toward defensive buildings (The Burhs), the turns a commission added to a work's age (Commission: Break the Sod), and the upkeep rebate for levied units (The General Levy).

| Tier | Implemented | Modify | Add | All | Doctrines |
|---|---|---|---|---|---|
| Tier 0 | 10 | 0 | 0 | 10 | none |
| Tier I | 18 | 0 | 0 | 18 | 4 (all built) |
| Tier II | 17 | 0 | 0 | 17 | 6 (5 built) |
| Tier III | 18 | 0 | 0 | 18 | 7 (all built) |
| Tier IV | 11 | 0 | 0 | 11 | 7 (all built) |
| **All** | **74** | **0** | **0** | **74** | **24 (23 built)** |
| Shared | 14 | 0 | 0 | 14 |  |

**By type** (the chair a card fits):

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| Tier 0 | 1 | 6 | 3 | 0 |
| Tier I | 1 | 12 | 4 | 1 |
| Tier II | 0 | 10 | 7 | 0 |
| Tier III | 0 | 10 | 6 | 2 |
| Tier IV | 2 | 5 | 3 | 1 |
| **All** | **4** | **43** | **23** | **4** |
| Shared | 2 | 4 | 8 | 0 |

The 74 cards are 72 that take a chair and two charters (The Fish Traps and The Wild Orchards).

## Tier 0

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **Smallholdings** | common | implemented | Worked farms and pastures gain +1 food and +1 gold. | Economic |
| **Granary Levies** | common | implemented | When a city grows in population, gain 15 production | Economic |
| **The Patient Harvest** | rare | implemented | Towns keep 30% of their food when they grow. | Economic |
| **Sweet Water** | common | implemented | Tiles beside a river or lake gain +1 food. | Economic |
| **The Seed Grain** | uncommon | implemented | Towns you found start with one extra citizen. | Economic |
| **The Rope Stretchers** | common | implemented | Each town gains +1 science for every three improved tiles in its borders. | Civic |
| **The Road Home** | common | implemented | Each town you found is joined to your nearest town by road. | Economic |
| **The Woodland Bands** | common | implemented | Your units ignore the movement cost of forest and jungle. | Military |
| **The Founding Furrow** | common | implemented | Founding a town grants culture equal to five times the number of towns you hold. | Civic |
| **The Horrea** | uncommon | implemented | Each Granary you hold gives +1 authority. | Civic |

## Tier I

**Doctrines,** offered with the tier-4 governments:

| Doctrine | Build | Text |
|---|---|---|
| **Bound to the Soil** | improvement | Workers gain +1 charge. Tended tiles gain +1 food. |
| **The Gift of the River** | tall: waterworks | Worked tiles beside a river gain +1 food and +1 production. Towns away from fresh water cost 3 more happiness. |
| **The Highland Clans** | wide: highlands | Towns on hills cost 1 less authority. Hills beside a town gain +1 food. |
| **The Commanderies** | wide: well-ordered realm | Each of your towns costs 1 less authority, minimum one. Your borders grow 30% more slowly. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Burhs** | common | implemented | Towns gain +3 defence for each defensive building. | Military |
| **Levy of the Land** | uncommon | implemented | A town may spend a citizen for production equal to the food it took to grow. Once every five turns. | Economic |
| **Tinkers' Guild** | common | implemented | Workers gain +1 charge. | Economic |
| **The Old Songs** | common | implemented | Worked unimproved land gains +2 culture. | Civic |
| **The Local Census** | common | implemented | A town working four improved tiles costs 1 less authority. | Civic |
| **The Wild Orchards** | common | implemented | Workers may tend a forest or jungle tile into an orchard: +1 food and +1 gold. | Economic |
| **Dark Earth** | uncommon | implemented | Farms that have stood 20 turns gain +2 food. | Economic |
| **The Three Sisters** | common | implemented | Farms beside a plantation or pasture gain +2 food and +2 production. | Economic |
| **The Hard Country** | common | implemented | Worked desert and tundra tiles gain +1 food and +1 production. | Economic |
| **Outposts** | uncommon | implemented | Workers may plant an outpost on a wild tile near your border. It claims its hex and the ring around it. | Economic |
| **Commission: Break the Sod** | common | implemented | Goal: work 12 improved tiles. Reward: farms gain +1 food. | Wildcard |
| **The Grain Census** | uncommon | implemented | Gains +1 production and +1 gold each time a town grows past its largest size. | Economic |
| **The Gleaners** | common | implemented | After a town levies a citizen, it gains +3 food for ten turns. | Economic |
| **The Wild Marches** | common | implemented | +1 culture for every four wild hexes you own. | Civic |
| **The Road Towns** | common | implemented | Towns joined to your capital by road gain +2 production. | Economic |
| **The Aediles** | uncommon | implemented | Gains +1 production and +1 culture each time you finish a public work. | Civic |
| **The Land Hunger** | uncommon | implemented | Towns build settlers 25% faster. | Economic |
| **The Fish Traps** | common | implemented | Workers may build fish traps on lake and coast tiles: +1 food and +1 production. | Economic |

## Tier II

**Doctrines,** offered with the tier-10 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Georgics** | improvement | Your works count as having stood twice as long. Improvements that have stood for twenty turns gain +1 production. |
| **Synoecism** | tall | Your towns of six or more citizens grow 30% faster. Towns you founded cost 1 more authority, including those you already hold. |
| **The Curator of Waters** | tall: waterworks | Public works give +2 happiness and are built 50% faster. |
| **Human Sacrifice** | tall: breadbasket | Your towns may levy every two turns instead of every five. Your capital may levy a citizen to perform a rite across your empire. |
| **The Censors** | wide: well-ordered realm | When the world takes a census, each of your towns gains a citizen. If you lead the census, each of your towns also gains +1 happiness for the rest of the game. |
| **The Wildwood Compact** | tended land | Needs tended land. Tended works cost your workers no charge. Workers you gain from now on have one less charge. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Watercourses** | uncommon | implemented | Irrigated farms gain +2 production. | Economic |
| **The Highlands** | common | implemented | Mines and quarries on hills gain +2 science and +1 production. | Civic |
| **The Coast** | common | implemented | Worked fishing boats gain +3 food and +3 culture. | Civic |
| **Provincial Councils** | uncommon | implemented | Towns joined to your capital by road cost 1 less authority. | Civic |
| **The Grain Dole** | common | implemented | Towns of 10 or more citizens gain +4 happiness. | Civic |
| **The Waterworks** | uncommon | implemented | Aqueducts give +3 happiness. | Civic |
| **The Breadbasket** | uncommon | implemented | A town told to stop growing adds its food surplus to its production. | Economic |
| **Veteran Colonies** | uncommon | implemented | A military unit in one of your towns may retire. The town gains a citizen. | Economic |
| **The Engineers' Yards** | common | implemented | Improvements beside a manufactory gain +2 production. | Economic |
| **The Tended Country** | uncommon | implemented | Needs tended land. Tended tiles gain +2 production. | Economic |
| **The Hedgerows** | common | implemented | Needs tended land. Worked farms beside a tended tile gain +2 food, once per farm. | Economic |
| **The Great Households** | uncommon | implemented | Each town gains +2% production for each citizen, at most +30%. | Economic |
| **The Harbour Cities** | common | implemented | Coastal towns gain +1 culture for every two citizens. | Civic |
| **The Terraces of Moray** | uncommon | implemented | Towns beside a mountain may spend a citizen to gain science equal to the food it took to grow that citizen. | Civic |
| **The Book of Settlements** | uncommon | implemented | +3% production and gold for every town you have founded this game, at most +30%. | Economic |
| **The Colonists** | uncommon | implemented | Towns of at least six citizens may spend a citizen to raise a settler. | Economic |
| **The Staked Claims** | uncommon | implemented | Each town you found claims every unowned hex within two hexes of it. | Economic |

## Tier III

**Doctrines,** offered with the tier-18 governments:

| Doctrine | Build | Text |
|---|---|---|
| **Crop Rotation** | improvement | Worked improvements yield twice their own bonus. Worked unimproved tiles yield nothing. |
| **The Contented City** | tall | Your citizens ask 20% less happiness. Your gold income is halved. |
| **The Builder Kings** | tall: great works | +25% production toward wonders. Manufactories gain +2 production for each wonder in the town working them. |
| **Empire Without End** | wide | +1 authority for each town you hold. |
| **All Roads Lead to Rome** | wide: road network | Your capital gains +3% production and gold for each town joined to it by road, at most +45%. Each town not joined to it costs 2 more authority. |
| **The Planted Towns** | flex | Towns you found start with four citizens and a Monument. Training a settler also costs its town a citizen. |
| **The Garden Peoples** | tended land | Needs tended land. Tended tiles gain +1 food, +1 production and +1 culture. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **Seasonal Levies** | uncommon | implemented | After a town levies a citizen, it gains +60% food for ten turns. | Economic |
| **The Long Tending** | rare | implemented | Tended tiles gain +3 food. | Economic |
| **The Polders** | rare | implemented | Workers may build a polder on a coast tile beside three of your land tiles. It yields as a farm. | Economic |
| **A Court of Engineers** | rare | implemented | Gain +50% renown, but great-person offers contain only great engineers. | Civic |
| **The Wide Country** | uncommon | implemented | Goal: claim 12 hexes by outposts, cleared camps or buying. Reward: your borders grow 25% faster. | Wildcard |
| **The Age of Improvement** | rare | implemented | The bonuses your Orders give to improved tiles are doubled. | Wildcard |
| **Old Workings** | common | implemented | Mines, quarries and lumber mills gain +3 production. | Economic |
| **The Megalopolis** | rare | implemented | Towns of ten or more citizens gain +1 science and +1 production for each citizen. | Civic |
| **The Freedom of the City** | uncommon | implemented | The first time a town reaches 15 citizens, it gains production equal to forty times its population. | Economic |
| **Plenty** | common | implemented | When a town grows, it gains production equal to five times its new population. | Economic |
| **The Mill Wheels** | common | implemented | Towns with a Watermill gain +15% production. | Economic |
| **The Mit'a** | rare | implemented | Needs a levy. A citizen spent on a levy returns to its town twenty turns later. | Economic |
| **The Quitrents** | common | implemented | +1 gold for every two hexes you own. | Economic |
| **The Mountain Terraces** | rare | implemented | Your towns may work the mountains in their borders. A worked mountain yields 2 science and 1 production. | Civic |
| **The Sovereign Writ** | rare | implemented | Spare authority's bonus has no ceiling. | Civic |
| **The Imperial Roads** | rare | implemented | Towns joined to your capital by road cost no authority. | Civic |
| **The Great Colonies** | rare | implemented | Towns you found start with a third of the citizens of your largest town. | Economic |
| **The Capitolia** | uncommon | implemented | Each empire building you hold gives each of your towns +1 culture. | Civic |

## Tier IV

**Doctrines,** offered with the tier-26 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Physiocrats** | improvement | Every improved tile gains +2 food, +2 production and +2 gold. |
| **The Hydraulic Empire** | tall: waterworks | Worked tiles with fresh water gain +1 food and +1 production for each public work in their town. |
| **The Cathedral Lodges** | tall: great works | Manufactories yield twice as much. Towns with a Manufactory gain +30% production toward wonders and the Magnum Opus. |
| **The High Towns** | wide: highlands | Your towns may work mountains. Mountains gain +4 production, and each gives +1 production to the hexes beside it. |
| **The Mandarinate** | wide: well-ordered realm | Each point of spare authority gives +1% science and culture, at most +30%. Each of your towns costs 1 more authority. |
| **The Inward Roads** | wide: road network | Towns joined to your capital by road gain +20% science and culture. Your caravans may not travel to other empires. |
| **Arcadia** | tended land | Needs tended land. Your tended tiles also count as improved for every card. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Keeps** | rare | implemented | Workers may build one Keep in each town. A Keep gains the yields of every tile around it. | Economic |
| **The Garden of the World** | rare | implemented | Tended tiles gain +2 food, +1 production and +1 culture. | Economic |
| **The Corvée** | rare | implemented | Your towns may levy a citizen toward the Magnum Opus. | Economic |
| **The Philosophers' Peaks** | uncommon | implemented | Each town gains +2 science for every mountain in its borders, at most +6. | Civic |
| **The Measure of the Land** | rare | implemented | Every town gains +1 science for every 25 hexes your empire owns, at most +10. | Civic |
| **The Mother City** | rare | implemented | Your capital gains +5% production and +5% culture for each town you have founded this game. | Civic |
| **The General Levy** | rare | implemented | Your towns may spend a citizen to raise a melee unit. At war, they may do it every turn. | Military |
| **The Great Migration** | rare | implemented | Every ten turns, each foreign town near your border loses a citizen to your nearest happier town. | Economic |
| **The Domesday Survey** | rare | implemented | Goal: own 120 hexes and work 40 improved or tended tiles. Reward: each town gains +1 science for each improved or tended tile it works. | Wildcard |
| **The Imperial Highways** | rare | implemented | The town raising the Magnum Opus gains +3% production toward it for every town joined to your capital by road, at most +45%. | Economic |
| **The Theodosian Walls** | uncommon | implemented | Your towns gain +1 defence for every two citizens. | Military |

## Shared with another deck

These rows live in `data/decks/common.json`. A seat holding Expansionist or the deck named beside each one may draw it, so a change here is felt in two decks. The types of the nine cards shared with the four decks not yet sorted are final (the user, 2026-10-16: *"we can confirm any shared cards now yes"*), and the five shared with Dominion carry the types its sheet gave them. Devotion batch DV1 (`docs/plans/devotion-themes-triage.md`) moved The Ambarvalia here from this sheet's Tier 0 table; its row keeps the id `theSpiritsOfPlace`. It also shared The Holy Spring from the Devotion file. Both keep their texts, tiers and rarities, and both are Civic. Scientific batch R3 (`docs/plans/scientific-review-2026-10-28.md`) added The Mountain Observatories, a new Civic card shared with Scientific at the user's request of 2026-10-28. It stacks with The Mountain Schools, which reads the same ground.

| Card | Rarity | Also in | Tier | Status | Ability | Type |
|---|---|---|---|---|---|---|
| **Market Gardens** | common | Commerce | 0 | implemented | Hexes with a road gain +1 gold. | Economic |
| **Sacred Groves** | uncommon | Devotion | 0 | implemented | Worked, unimproved forests gain +1 food and +1 faith. | Civic |
| **The Frontier Militia** | common | Dominion | 0 | implemented | Each town you found starts with a melee unit. | Military |
| **The Ambarvalia** | common | Devotion | 0 | implemented | Each town gains +1 faith for every two improved tiles. | Civic |
| **The Holy Spring** | common | Devotion | 0 | implemented | Towns beside a mountain or a lake gain +2 faith and +1 culture. | Civic |
| **The Mountain Observatories** | common | Scientific | 0 | implemented | Cities with a mountain in their borders gain +3 science. | Civic |
| **The Muster of the Fields** | uncommon | Dominion | I | implemented | Towns of 5 or more citizens may spend a citizen to raise a melee unit. | Military |
| **The Barbarian Frontier** | uncommon | Dominion | I | implemented | Clearing a barbarian camp claims its hex and the unowned hexes around it. | Economic |
| **The Farming Garrisons** | common | Dominion | I | implemented | Hexes with a fortified unit gain +1 food and +1 production. | Economic |
| **The Assay** | common | Scientific | I | implemented | Hexes with a strategic resource gain +2 science. | Civic |
| **Garden Cities** | uncommon | Magisterial | I | implemented | Towns with a Monument gain +1 culture for every three wild tiles they work. | Civic |
| **The Provincial Fair** | uncommon | Commerce | II | implemented | Towns with a Market gain +2 gold on plantations, camps and pastures. | Economic |
| **Garden Provinces** | common | Magisterial | II | implemented | Connected cities with a Monument gain +3 food and +3 culture. | Civic |
| **The Sculpted Landscape** | uncommon | Magisterial | III | implemented | Farms beside a great-person work gain +2 food and +2 culture. | Civic |

## Retired rows

These rows stay in the data so that old saves load. They are dealt to nobody, they carry no type, and no table above lists them. A save that holds one keeps it, with its effects. Batch DS1 added this section. The earlier retirements are under "Open for your pass", with the pass that cut each one.

- **Batch DS8** (2026-11-11, the same spec) put the four keywords on the card face: Commission, Charter, Scaler and Boon. The game reads each from the card's data (`orderKeyword`), prints it as the card's first clause, and shows its rule in a tooltip. So no text below starts with "Charter." or "Boon." any more.
- **Retired in batch DS1** (2026-11-10, `docs/plans/deck-simplification-2026-11-10.md`). The reason after each card is the Note column of that file's table. Each data row keeps its text and effects:
  - The Naturalists (Tier 0): The Mountain Observatories (shared) does this job.
  - The Work Gangs (Tier 0): a levy before Levy of the Land teaches the levy.
  - Six Gardens (Tier I): your note of 10/12: weak. The Tended Country is the tended pay-off.
  - The Burning Season (Tier I): a third tended work with its own terrain rule. Two are enough.
  - The Commons (Tier I): happiness. Your note of 9/3.
  - The Forest Keepers (Tier I): it reads how long a thing has stood, which the player must track.
  - The Labour Feasts (Tier I): a rider on a levy with three conditions.
  - The Marl Pits (Tier I): the player must track which farm got which bonus.
  - The Master Builders (Tier I): too narrow to matter in most games.
  - The Public Fountains (Tier I): happiness. Your note of 9/3.
  - The Quiet Provinces (Tier I): The Sovereign Writ (Tier III) is the spare authority card.
  - Migration (Tier II): it acts on a timer with three conditions. Doctrine candidate.
  - The Burghers (Tier II): it reads the guild bar, which few players watch.
  - The Labour Rolls (Tier II): one of the capped "for every X this game" cards. Each deck keeps one or two.
  - The Many Hands (Tier II): too narrow to matter in most games.
  - The Milestones (Tier II): one of the capped "for every X this game" cards. Each deck keeps one or two.
  - The Old Fields (Tier II): one of the capped "for every X this game" cards. Each deck keeps one or two. It reads how long a thing has stood, which the player must track.
  - The Teeming Realm (Tier II): one of the capped "for every X this game" cards. Each deck keeps one or two.
  - Watch and Ward (Tier II): it needs a card that raises units by levy.
  - The Coming of the Water (Tier III): too narrow to matter in most games.
  - The Cura Aquarum (Tier III): a "counts as" rule. Doctrine candidate.
  - The Hallowed Woods (Tier III): The Old Songs (Tier I) pays culture for wild tiles.
  - The Mountain Schools (Tier III): two effects. The card keeps one. The Mountain Terraces is the mountain card of this tier.
  - The Opening of the Roads (Tier III): a one-time lump. One-off grants paid 0.39 yield a turn in the bot games.
  - The Raising of the Land (Tier III): a chain of three things must line up.
  - The Royal Forests (Tier III): a threshold on one improvement.
  - The Slack Season (Tier III): a timer on a timer.
  - The Stationes (Tier III): it asks for two separate things at once.
  - The Tax Rolls (Tier III): it waits on a world event.
  - The Topping Out (Tier III): Plenty and The Freedom of the City are the lump cards.
  - The Trained Bands (Tier III): it needs a card that raises units by levy.
  - The Water Courts (Tier III): An irrigation rule the player must trace on the map.
  - The Encroaching Fields (Tier IV): four conditions. The Great Migration is the late border card.
  - The Great Aqueducts (Tier IV): Tier IV keeps one Magnum Opus card of this kind per deck. The Imperial Highways is Expansionist's.
  - The Heartland (Tier IV): the goal has three numbers to check.
  - The Inheritance of Fields (Tier IV): it reads how long a thing has stood, which the player must track.
  - The Master of Works (Tier IV): Tier IV keeps one Magnum Opus card of this kind per deck.
  - The Public Good (Tier IV): one of the capped "for every X this game" cards. Each deck keeps one or two.
  - The Two Harvests (Tier IV): a "counts as" rule. The Doctrine Arcadia does this job.
  - in `data/decks/common.json`, the shared cards:
    - Hydraulic Schools (with Scientific, Tier I): it asks for two separate things at once.
    - Military Colonies (with Dominion, Tier I): too narrow to matter in most games.
    - The Flood Festival (with Devotion, Tier I): it names one card's action (The Burning Season), which is cut.
    - Marcher Lords (with Dominion, Tier II): four numbers and a distance to check.
    - The Grain Exchange (with Commerce, Tier II): Provisioning Contracts does this job.
    - The Road Garrisons (with Dominion, Tier II): it asks for two separate things at once.

## Open for your pass

- **Ruled 2026-10-23** (the build plan's three questions, `docs/plans/expansionist-themes-triage.md`): keep both of Veteran Colonies' loops; the bots learn to levy (built, commit e3edb81b); the readings are approved, and reading 25 now counts a unit raised for free, so every military unit that retires in your town gives it a citizen.
- **Ruled 2026-10-21** (`docs/plans/expansionist-themes.md`, section 11: your comments on the review page and your answers to its two questions, in your words, with what each changes). They are written into the rows above:
  - **Changed:** Plenty (five times the new population, not eight), The Burning Season (any grassland or plains), The Land Hunger (settlers built faster and with +1 movement), The Mountain Schools (at least two mountains in the town's borders), The Mother City (+5% production and culture for each town founded), The Measure of the Land (at most +10) and Veteran Colonies (the town gains one citizen).
  - **Cut:** The Beating of the Bounds, The Garden Frontier and The Builders' Levy (your comments), then The Common Domain and Home for the Harvest (your answers). Veteran Colonies stays.
  - **Taken as standing:** the recommendations of the themes doc's section 10 that section 11 did not change, among them dropping the gap rule (question 2) and the cuts of question 9 (the triage's reading 5). The build uses the triage's readings 1 to 36 until you mark one.
  - **Retired in batch E7:** the fifteen cut cards that had a data row: The Pyramid Builders, The Beating of the Bounds, The Prospectors, The Garden Frontier, The Builders' Levy, The Plough Teams, The Polis, The Landscape Garden, The Common Domain, The Woodwrights, Public Works, The Manors, The Assay Office, The Managed Wild and The Land's Great Work. The Deep Workings had no row and left the sheet. The last section of `docs/plans/expansionist-list-proposed.md`, "Cut by this pass", gives each card's old text and the reason for the cut, so you can restore one.
- **Still open:**
  - **Migration** played as built, and the first triage's reading 36 waited for you. Batch DS1 retired the card.
  - **The one-effect trims and splits of 2026-10-13** that the builds did not need. The themes pass did not apply them. Batch DS3 trimmed Sweet Water, Provincial Councils, The Grain Dole, The Waterworks, The Engineers' Yards and The Garden of the World to one effect each, as the simplification spec says, and DS1 retired The Mountain Schools, Marcher Lords and The Road Garrisons. The list below is kept as it was written.
    - Sweet Water: split, The Wellsprings takes the happiness.
    - Granary Levies: renamed The Granary Dues.
    - Provincial Councils, The Grain Dole, The Waterworks, The Engineers' Yards, The Mountain Schools and The Garden of the World: each trimmed to one effect.
    - Shared: Marcher Lords trimmed, and The Road Garrisons' defence dropped.
    - Applied already: The Tended Country's split, because The Hedgerows is on the sheet.
  - **The 2026-10-13 proposals no build uses** stay in the long form, off the sheet: The Land Grant, The Gatherers, The Barn-Raising, The Charter Rolls, The Town Rolls, The Mosaic, Labour Dues, The Open Country, The Harvest Feast, Commission: The Long Furrow, Commission: The Granaries Full and The Wellsprings. Say if any should come back.
  - **The Polders:** the reworked text above, a work on a coast tile so that no terrain changes mid-game, or cut. Recommended: the rework.
  - **Data wording:** Granary Levies' text has no full stop. (Batch E0 fixed The Highlands' small letter.)
- **Done:**
  - **The Doctrines:** your review of 2026-11-05 closed the open questions on them, The Builder Kings' among them: it stays in this deck, revised. All 24 are built (`docs/plans/doctrines-build-triage.md`).
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
