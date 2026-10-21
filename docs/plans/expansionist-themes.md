# Expansionist: a way to play, built from four themes (proposal)

**Status:** first draft, 2026-10-21, revised the same day to agree with your comments on the review page and your answers to its two questions (section 11). Rows that changed are marked "revised 2026-10-21 (section 11)". The build plan is `docs/plans/expansionist-themes-triage.md`. Nothing here is built. The deck sheet (`docs/decks/expansionist.md`), the data and the code are unchanged. This is the Expansionist deck pass on the method of 2026-10-20 (the card-design skill, "A way to play, built from a few themes"), done in the same way as the Scientific pass (`docs/plans/scientific-themes.md`) and the Dominion pass (`docs/plans/dominion-themes.md`). It revises the builds of `docs/plans/expansionist-builds.md` (2026-10-16), which are built and live. The review list is `docs/plans/expansionist-list-proposed.md`.

Your request, 2026-10-21, verbatim:

> *"Next up, lets do a pass on the expansionist deck."*

The direction for every pass, 2026-10-20, verbatim:

> *"claude, i think you can do it. you can be a great card designer, don't be afraid to opinionated, bold, bias towards things that are interesting and fun rather than focusing on numbers. try to focus on not adding new sources of user inputs and operate on what mechanics we have. if there's an interesting compelling feature that would affect multiple decks, and could enable some design ideas, let me know."*

Your picture of the deck, 2026-10-20, verbatim (`docs/decks/deck-design.md`, "Direction, 2026-10-20"):

> *"expansionist: focused on growing tall and wide, bonuses from population and number of cities, very quickly able to make land valuable and gain yields from enriching the land. Options for infrastructure, like public works and empire buildings, allow the expansionist player to grow very rapidly assuming they're able to claim and develop land. Population as a second economic engine. Late game, should offer bonuses scaling with number of cities/population, and have a variety of economic/civic abilities assuming they've spent the game building the proper engine. Reverse my original decision, this faction shouldn't necessarily draft slower"*

The rulings of 2026-10-20 that touch the deck: wonders leave Expansionist (ruling 3); empire buildings are split with Scientific, and Expansionist's cards on them scale with towns (ruling 5); Expansionist does not necessarily draft slower (ruling 6). The pass reads the sheet as it stands in the working tree. It does not change the Doctrines.

## 1. How to read this

- **Chairs:** 3 at the start, 5 at Tier I (draft 4) and Tier II (draft 10), 8 at Tier III (draft 18), 11 at Tier IV (draft 26). Charters take no chair.
- **Tiers in turns** (the bot model): Tier I from about turn 32, II from 72, III from 133, IV from 161.
- **Role:** *supply* (more of the thing), *widen* (the thing pays something it did not), *multiply* (the thing's output grows), *act* (a choice or a moment). A *capstone* breaks a rule or doubles a category. *Engine glue* raises or spends the engine itself.
- **Status:**
  - *kept (built)*: on the sheet and in the data, unchanged;
  - *kept (as built)*: on the sheet as `modify: as built`, unchanged by this pass;
  - *reworked*: on the sheet, changed by this pass;
  - *new*: not on the sheet;
  - *cut*: on the sheet; its data row is retired;
  - *revised 2026-10-21 (section 11)*: changed by your comments on the review page or your answers to its two questions. Section 11 has your words, and the readings marked "to confirm".
- **Shape:** *existing*, *near existing* (two built pieces joined), *new shape* (section 7), or *feature A* (section 6).
- **Type:** Military, Economic, Civic or Wildcard (`docs/plans/doctrines-governments-chairs.md`, section 4).
- **Institution:** an effect that a commission leaves for the rest of the game when it is met. It takes no chair. The shape exists: `CommissionReward.lasting`, built for The Heartland (batch E5).
- **Public works:** the card word this pass proposes for six buildings: the Granary, Aqueduct, Watermill, Harbour, Public Bath and Cistern (section 4.3, question 3).
- **Numbers are first guesses** against the power bar. The effort went into shape.

## 2. The map

### The way to play

- Expansionist grows. It founds towns fast, makes every hex it works worth more, and builds the public works that let its towns grow large. Its citizens are a second economy: food becomes citizens, and a levy turns a citizen into whatever the empire needs now.
- It is paid for growth (towns, citizens, raised land). It is strongest in the middle game, once its land is claimed. It gives up room: without land to claim, it stalls.
- It goes tall and wide at the same time. The frontier makes it wide. Food and public works make it tall. The levy moves citizens between the two.

### The engine

- **Citizens and the levy.** Food grows citizens, and every theme reads them. A levy spends a citizen on what one theme needs: a worker, a settler, a soldier, or hammers in its own town (revised 2026-10-21, section 11: the hammers for an empire building went with The Builders' Levy). So the levy joins the themes, as charters join Scientific's. Section 3 has the details.

### What changes from the builds

- The builds of 2026-10-16 were one improvement build and two shapes, tall and wide, with three flavours each. Most of them paid food and production: 77 of 117 seatable cards were Economic, and 65 paid food or production. That is Expansionist's one note.
- The themes keep the builds' cards and sort them by what the player does:
  - the improvement build becomes **the raised land**: worked land, its age, water on the fields, and tended land as a splash inside it;
  - the wide build (the core, the highlands, the well-ordered realm and the road network) becomes **the frontier**: towns founded, hexes claimed, roads, and the authority that holds them;
  - the waterworks' buildings and the great works become **public works**: the buildings that let towns grow, the empire buildings that many towns raise together, and the great engineers. The wonders leave (ruling 3);
  - the breadbasket and most of the flex cards become the **engine**: citizens grown, counted and spent;
  - the deck's Military cards, scattered before, become **the militia**: citizens under arms.
- Each theme now pays varied things. The raised land pays science, culture, faith, happiness and authority as well as food. The frontier pays culture and science. Public works pay happiness, authority and culture.

### Materials

"Self-producing" means an Expansionist game makes it whether or not a card asks.

| Material | Self-producing? | In the sim | Theme |
|---|---|---|---|
| Citizens and growth | Yes | `City.population`; the `growth` occasion; the `sizeRecord` moment (a town passing its largest size); `population` counts | engine |
| Levies | Once a card grants a use | `levies.ts`: one levy per town every five turns; uses for production, a worker, a settler, a soldier, science, a building elsewhere, the Opus; the levy mark on a unit | engine; one use for each theme |
| The census | Yes, every 13 to 17 turns | `census.ts`; the `census` occasion (batch E2) | engine |
| Guildsmen (the trades) | In big towns with renown buildings | the `guilds` phase; feature A adds the count | engine |
| Improvements and their age | Yes | `Tile.improvement`, `Tile.improvedOn` (the `standingSince` test); the `improvementBuilt` occasion | raised land |
| Tended works | Once a charter is held | the `tended` test; the `needsTendedWork` deal gate | raised land |
| Water on the fields | From the map | fresh water; water passed along farms (The Watercourses, The Water Courts) | raised land |
| Lasting marks on hexes | From cards | the hex mark of batch E3 (The Coming of the Water, The Raising of the Land) | raised land, public works |
| Towns founded | Yes, mostly in ages 1 and 2 | `foundCityAt`; the `found` occasion; `Player.citiesFounded` | frontier |
| Hexes owned and claimed | Yes | `tilesInBorders`; the `hexClaimed` tally; claims at founding, outposts, cleared camps | frontier |
| Roads and joined towns | Partly: caravans and foundings lay roads | `Tile.road`; the `connected` scope; the `joinedToCapital` moment | frontier |
| Hills, mountains and the hard country | From the map | the hills flag; workable mountains (The Mountain Terraces); desert and tundra | frontier |
| Spare authority | The limit every wide empire meets | `meters.ts`; the `authoritySurplus` count | frontier, public works |
| Happiness | The limit on size | `meters.ts` | public works |
| Public works | Yes: every town builds them | the Granary, Aqueduct, Watermill, Harbour, Public Bath and Cistern; no card reads them as a group yet (section 7) | public works |
| Empire buildings | Partly: the great houses of the tree, and Scientific's charters add more | `empireBuilding` rows; the `empireBuildings` count | public works |
| Great engineers and manufactories | Slowly: Watermills, Public Baths, Workshops and Forges earn engineer renown | Rush the Works (40 hammers times the age); the manufactory | public works |
| Units a levy raised | When a levy raises one | the levy mark on a unit (batch E1) | militia |
| Defensive buildings | Partly | the `defensiveBuildings` count | militia |
| Rivals' towns | Yes | `rivalHoldsMoreTowns`; The Encroaching Fields; The Great Migration | frontier |

### What an Expansionist player wants in each age

- **Age 1 (Tier 0): claim.** Found three or four towns fast (The Seed Grain, The Road Home, The Founding Furrow). Build the first Granaries (The Horrea). Raise the first works. The foundings pay culture for the first drafts.
- **Age 2 (Tier I): fill the land.** Plant outposts and claim the gaps. Spend the first citizens on levies. Let the works come of age (Dark Earth, Break the Sod). Authority starts to bind at five or six towns, so worked land and Granaries pay it back (The Local Census, The Horrea).
- **Age 3 (Tier II, then early Tier III): grow into it.** The scalers grow (The Old Fields, The Book of Settlements, The Teeming Realm, The Aediles). Aqueducts and baths let big towns grow. Many towns raise the empire buildings fast (The Many Hands). The deck is strongest here.
- **Age 4 (Tiers III and IV): the land is full.** Break the rules that hold a wide empire back (The Imperial Roads, The Sovereign Writ, The Cura Aquarum). Make new room (The Polders, The Mountain Terraces; revised 2026-10-21, section 11: The Common Domain is cut) or take it from neighbours (The Encroaching Fields, The Great Migration). Raise the Opus with many towns (The Corvée, The Great Aqueducts, The Imperial Highways).

### The areas it reaches

All five:
- **the army:** the militia;
- **the land:** the raised land and the frontier;
- **the economy:** public works and the engine;
- **civic life:** authority and happiness, through worked land, roads and public works;
- **great people and wonders:** great engineers and their manufactories, and the trades. No wonders (ruling 3).

### Its cost

Expansionist gives up room. Without land to claim, it stalls. The cards show it:
- **Many cards pay only while there is land to take:** The Founding Furrow, The Seed Grain, Outposts, The Staked Claims, The Book of Settlements, The Mother City and The Wide Country pay on founding or claiming (revised 2026-10-21, section 11: The Beating of the Bounds and The Garden Frontier are cut).
- **The race for room is open:** The Land Hunger pays only while a rival is wider.
- **The answers come late, and each one is a broken rule or a push on a rival:** The Polders (new land from the sea), The Mountain Terraces (work the peaks), The Great Colonies (big towns seed new ones), The Encroaching Fields and The Great Migration (take hexes and citizens from smaller neighbours). Revised 2026-10-21 (section 11): The Common Domain is cut, because you ruled that towns work only within three hexes.
- **The engine costs citizens:** every levy spends one, and only The Mit'a and Veteran Colonies (a soldier who retires in a town) bring them back (revised 2026-10-21, section 11).

### Science and culture: the open question

`docs/decks/deck-design.md`, "Open questions", item 3, asks whether Expansionist stays weak at science and culture and takes them only from terrain. **The proposed answer: drop the gap rule.** It also closes question 1 of the builds (*"TBD, will review myself later."*).
- **Why:**
  - the deck no longer drafts slower, and culture is the draft currency, so a deck weak at culture would still draft slower in practice;
  - its cost is room now, not two essentials;
  - Scientific owns "reach it first", so Expansionist does not need to be weak at science to leave room for it.
- **The rule instead:** Expansionist reaches science and culture at about the median, never from a flat on nothing and never as its main pay. Both grow with what the deck does, so both stall when room runs out:
  - **science from measured and worked land:** The Rope Stretchers, The Highlands, The Naturalists, the mountain cards, The Measure of the Land, the shared The Assay, and The Domesday Survey's institution;
  - **science from its people:** The Teeming Realm, The Megalopolis, The Terraces of Moray;
  - **culture from founding and claiming:** The Founding Furrow, The Wild Marches, The Milestones, The Mother City;
  - **culture from wild land and public works:** The Old Songs, The Forest Keepers, The Hallowed Woods, The Aediles, The Capitolia, The Public Good;
  - **and through the meters:** spare happiness pays +10% science and culture at 5 points and +20% at 10.
- **The share** (revised 2026-10-21, section 11): 12 of 111 seatable cards pay science (11%) and 18 pay culture (16%), against 8 and 12 of 117 before. None of the five cards cut in section 11 paid either.

### Pairs

- **Dominion, the frontier** (Mithridates VI). Expansionist gives levies (the shared The Muster of the Fields, The General Levy), towns to garrison (the shared The Frontier Militia) and land worth holding. Dominion gives cleared ground (the shared The Barbarian Frontier), Military cards for the chairs this deck cannot fill, and garrisons that farm (the shared The Farming Garrisons). Seven cards are shared. Tension: Dominion's The Spartan Discipline slows the buildings public works want. Best with the militia and the frontier.
- **Commerce, the land and the market** (Pachacuti). Commerce's caravans lay the roads the frontier runs on, and gold buys hexes and settlers. Expansionist pays gold from land (The Quitrents, The Tax Rolls) and opens resources to sell. Shared: Market Gardens, The Grain Exchange, The Provincial Fair. Best with the frontier.
- **Devotion, sacred land** (no leader). Faith from worked and wild land (The Ambarvalia, the shared Sacred Groves and The Flood Festival). The split on the meters: Devotion raises happiness and authority in towns that follow its religion, Expansionist through public works. The Ambarvalia is the natural card to share with Devotion; that is left for the Devotion pass. Best with the raised land.
- **Scientific, the engineers** (Nezahualcoyotl). The two decks' empire-building cards stack: Scientific opens the houses early and makes each stronger, and Expansionist's scale with towns (The Many Hands, The Topping Out, The Capitolia). Expansionist gives big towns, mountains (Hydraulic Schools) and manufactories beside Academies. Scientific gives the early Aqueduct and the Qanat (the Surveyors' Charter) and Physic Gardens. Shared: Hydraulic Schools and The Assay. Tension: Scientific's The Free Cities pays only at five towns or fewer. Best with public works.
- **Magisterial, shaping territory** (no leader). Magisterial gives culture and great-person works; it takes the wonders this deck gives up (section 8). Shared: Garden Cities, Garden Provinces, The Sculpted Landscape. Best with the raised land and the frontier.

### Leaders

- **Mithridates VI** (Dominion, Expansionist): +2 strength against an empire holding more cities, and +2 food on plantations and camps. He leads the militia, and The Land Hunger now reads his own condition: a wider rival.
- **Pachacuti** (Expansionist, Commerce): joined towns pay happiness and production, farms beside mountains pay gold, terraces. He leads the frontier's roads and highlands: The Road Home, The Road Towns, Provincial Councils, The Milestones, The Opening of the Roads, The Imperial Roads, The Mountain Terraces, and The Cura Aquarum, which needs the roads.
- **Nezahualcoyotl** (Expansionist, Scientific): Aqueduct towns pay culture and their farms production; a big capital pays culture. He leads public works: The Waterworks, The Coming of the Water, The Cura Aquarum, The Great Aqueducts, Hydraulic Schools, The Public Fountains.
- **The gap:** no leader points at the raised land's tended works. Leaders are tuned later.

## 3. The engine: citizens and the levy

### How the engine works

- **Food grows citizens.** The deck reads growth as a moment (a town grows, a town passes its largest size) and citizens as a count (in a town, in the empire).
- **A levy spends a citizen.** A town may levy once every five turns. Each use comes from a card, and most uses feed one theme. "Needs a levy" gates the cards that read a levy (ruled 2026-10-16). Revised 2026-10-21 (section 11): public works have no levy use since The Builders' Levy was cut; Levy of the Land's hammers serve every theme.
- **The census counts them.** Every 13 to 17 turns the world takes a census, and The Tax Rolls pays on it.
- **Citizens are the second economy** (your picture): growth pays (Granary Levies, Plenty, The Freedom of the City), big towns pay (The Great Households, The Megalopolis), the whole people pays (The Teeming Realm), and the trades take in the citizens the land cannot use (The Burghers, feature A).

### The levy joins the themes

| Levy use | Card | Tier | Theme it feeds |
|---|---|---|---|
| production in the town | Levy of the Land | I | every theme |
| a worker | The Work Gangs | 0 | the raised land |
| a settler | The Colonists | II | the frontier |
| science, in a town beside a mountain | The Terraces of Moray | II | the frontier's highlands |
| a melee unit | the shared The Muster of the Fields | I | the militia |
| a melee unit, every turn while at war | The General Levy | IV | the militia |
| production to the Opus | The Corvée | IV | the way to win |

Revised 2026-10-21 (section 11): The Builders' Levy's row (production to your nearest town building an empire building) is gone, because you cut the card as too like Levy of the Land.

The cards that read a levy: The Labour Feasts and The Gleaners (I), The Labour Rolls and Watch and Ward (II), Seasonal Levies, The Slack Season, The Mit'a and The Trained Bands (III). Revised 2026-10-21 (section 11): Home for the Harvest is cut.

### Engine glue

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| Granary Levies | 0 | common | growth (a moment) | When a city grows in population, gain 15 production | production | Economic | kept (built) |
| The Patient Harvest | 0 | rare | growth (with a cost) | Cities retain 30% of the food spent on growth, but produce military units 15% more slowly. | food | Economic | kept (built) |
| Levy of the Land | I | uncommon | the levy | Cities may spend one citizen to gain production equal to the food it took to grow that citizen. A city may levy once every five turns. | production | Economic | kept (built) |
| The Grain Census | I | uncommon | growth (grower) | While seated, this card gains +1 production and +1 gold each time one of your towns grows past its largest size. It starts at +2 of each. | production, gold | Economic | kept (built) |
| The Labour Feasts | I | uncommon | the levy (culture) | Needs a levy. After a town spends a citizen on a levy, it gains +1 culture for every wild tile it works, for ten turns. At most once every ten turns. | culture | Civic | kept (built) |
| The Gleaners | I | common | the levy (regrowth) | Needs a levy. After a town spends a citizen on a levy, it gains +3 food for ten turns. At most once every ten turns. | food | Economic | kept (built) |
| The Breadbasket | II | uncommon | growth (surplus into production) | A town told to stop growing adds its food surplus to its production. | production | Economic | kept (built) |
| Migration | II | rare | citizens moved; bridge to the frontier | Every ten turns, each of your towns that is at its happiness limit sends one citizen to your smallest connected town that has room to grow. | citizens | Economic | kept (modify: as built) |
| The Great Households | II | uncommon | citizens (multiply) | Each town gains +2% production for every citizen it has, at most +30%. | production | Economic | kept (built) |
| The Harbour Cities | II | common | citizens (culture) | Coastal towns gain +1 culture for every two citizens. | culture | Civic | kept (built) |
| The Labour Rolls | II | uncommon | the levy (scaler) | Needs a levy. +1% production and food for every two citizens you have levied this game, at most +30%. | production, food | Economic | kept (built) |
| The Terraces of Moray | II | uncommon | the levy (science); bridge to the frontier | Towns beside a mountain may spend a citizen to gain science equal to the food it took to grow that citizen. | science | Civic | kept (built) |
| The Teeming Realm | II | uncommon | citizens (scaler) | +1% science and culture for every ten citizens in your empire, at most +30%. | science, culture | Civic | reworked; data only |
| The Burghers | II | uncommon | citizens (the trades); feature A | Towns of at least twelve citizens fill their guild bar half again as fast. | guildsmen | Civic | new; feature A |
| Seasonal Levies | III | uncommon | the levy (regrowth) | Needs a levy. After a city spends a citizen on a levy, it gains +60% food for ten turns. A city can gain this at most once every twenty turns. | food | Economic | kept (built) |
| The Megalopolis | III | rare | citizens (pay-off) | Towns of ten or more citizens gain +1 science and +1 production for each citizen. | science, production | Civic | kept (built) |
| The Freedom of the City | III | uncommon | growth (a moment) | The first time each of your towns reaches fifteen citizens, and again at twenty, it gains production equal to forty times its population. | production | Economic | kept (built) |
| Plenty | III | common | growth (a moment) | When a town grows, it gains production equal to five times its new population. | production | Economic | revised 2026-10-21 (section 11): five times, not eight; data only |
| The Mit'a | III | rare | capstone (rule-breaker) | Needs a levy. A citizen spent on a levy returns to its town twenty turns later. | citizens | Economic | kept (built) |
| The Slack Season | III | uncommon | the levy (the moment) | Needs a levy. Every twentieth turn, after the harvest, your towns may levy whatever their wait. | levies | Economic | kept (built) |
| The Tax Rolls | III | uncommon | the census | When the world takes a census, gain gold equal to five times your citizens. | gold | Economic | kept (built) |
| The Corvée | IV | rare | the way to win (the levy) | While one of your cities builds the Magnum Opus, each of your other towns of at least ten citizens may spend one citizen for it, once every five turns. The Opus city gains production equal to the food that citizen took to grow. This shares the town's levy limit. | production toward the Opus | Economic | kept (built) |

- **Glue is 22 of 111 seatable cards (20%)** (revised 2026-10-21, section 11: no glue card is cut, and the deck is five cards smaller).
- **Scalers:** The Grain Census (a grower from Tier I), The Labour Rolls and The Teeming Realm (Tier II).
- **Capstone: The Mit'a.** A levied citizen comes home twenty turns later. It breaks the rule that a levy costs a citizen for good.
- **The Teeming Realm** now pays science and culture, not production and food. A large people is the deck's own way to the two essentials (section 2). One hundred and twenty citizens at turn 130 give +12%; two hundred give +20%.
- **The Burghers** (feature A) is the one card that reads the trades. Big towns put their spare citizens into the guilds half again as fast. That also feeds the partner's guild cards: Scientific's scholars, Commerce's merchants, Magisterial's artists.
- **The growth moments** (Granary Levies, Plenty, The Freedom of the City) all pay production. That is the engine's job: a citizen grown is hammers now. Plenty pays five times the new population, not eight (revised 2026-10-21, section 11).

## 4. The themes

### 4.1 The raised land

**The fantasy:** the terraces of the Andes, the floating gardens of the Aztec lake, the dark earth of the Amazon, the open fields of England. Land that is worth more every decade because people work it. **The quantity:** improved and tended tiles worked, and their age. Every empire raises works, and the age comes by itself. **Areas:** the land, with civic life through authority and happiness.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| Smallholdings | 0 | common | widen (gold) | Worked farms and pastures gain +1 food and +1 gold. | food, gold | Economic | kept (built) |
| The Fish Traps | 0 | common | supply (a charter: a tended work) | Once drafted, workers may tend a lake or coastal tile into fish traps for one charge: +1 food and +1 production. No chair required. | food, production | Economic | kept (built, charter) |
| Sweet Water | 0 | common | widen (fresh water) | Towns beside a river or lake gain +1 happiness. Worked freshwater tiles gain +1 food. | food, happiness | Economic | kept (built) |
| The Ambarvalia | 0 | common | widen (faith); the early faith | Your capital gains +1 faith. Each town gains +1 faith for every two improved tiles in its borders. | faith | Civic | kept (built) |
| The Rope Stretchers | 0 | common | widen (science) | Each town gains +1 science for every three improved tiles in its borders. | science | Civic | reworked; existing (a town count of improved tiles, as The Ambarvalia reads) |
| The Work Gangs | 0 | common | supply (a levy use: a worker) | Towns of at least three citizens may spend a citizen to raise a worker. This shares the town's levy wait. | units | Economic | kept (built) |
| Tinkers' Guild | I | common | supply | Workers you produce or purchase gain +1 charge. | worker charges | Economic | kept (built) |
| The Old Songs | I | common | widen (culture on wild land) | Worked unimproved land gains +2 culture. | culture | Civic | kept (built) |
| The Local Census | I | common | widen (authority); bridge to the frontier | A town working at least four improved or tended tiles costs one less authority, minimum one. | authority | Civic | kept (built) |
| The Wild Orchards | I | common | supply (a charter: a tended work) | Once drafted, workers may tend a forest or jungle tile into a wild orchard for one charge: +1 food and +1 gold. No chair required. | food, gold | Economic | kept (built, charter) |
| The Burning Season | I | uncommon | supply (a charter: a tended work, or a lasting mark) | Once drafted, workers may burn a grassland or plains tile for one charge: +1 food. Bare ground becomes burned country; an improvement on the tile stays. No chair required. | food | Economic | revised 2026-10-21 (section 11): any grassland or plains, not only wild; new shape (a burn on an improved tile writes batch E3's hex mark and keeps the improvement) |
| Dark Earth | I | uncommon | multiply (age) | Worked farms gain +2 food once they have stood for 20 turns, and another +2 food once they have stood for 50 turns. | food | Economic | kept (built) |
| The Three Sisters | I | common | widen (neighbours) | Worked farms beside a plantation or a pasture gain +2 food and +2 production, once per farm. | food, production | Economic | kept (built) |
| The Commons | I | uncommon | widen (happiness) | Each town gains +1 happiness for every two wild tiles it works, at most +3. | happiness | Civic | kept (built) |
| Six Gardens | I | uncommon | act (commission, institution) | Needs tended land. Commission. Have six tended tiles. Then, for the rest of the game, tended tiles gain +1 culture. The card leaves its chair. | culture | Wildcard | reworked; existing (`CommissionReward.lasting`) |
| The Marl Pits | I | uncommon | act | When your workers finish a mine or quarry, each farm or pasture beside it gains +1 food for the rest of the game, at most +2 on one tile. | food | Economic | reworked; new shape (a finished mine or quarry marks the farms and pastures beside it) |
| The Forest Keepers | I | common | widen (culture) | Lumber mills that have stood for twenty turns gain +2 culture. | culture | Civic | kept (built) |
| Commission: Break the Sod | I | common | supply (commission, institution) | Commission. Work twelve improved tiles at the same time. Then, for the rest of the game, your improvements count as having stood ten turns longer. The card leaves its chair. | the works' age | Wildcard | reworked; new shape (an age offset on works), with `lasting` |
| The Watercourses | II | uncommon | widen (water) | Farms directly beside a river irrigate adjacent farms. Irrigated worked farms gain +2 production. Water does not relay beyond that first step. | production | Economic | kept (built) |
| The Highlands | II | common | widen (science); bridge to the frontier | Mines and quarries on hills gain +2 science and +1 production. | science, production | Civic | kept (built) |
| The Coast | II | common | widen (culture at sea) | Worked fishing boats gain +3 food and +3 culture. | food, culture | Civic | kept (built) |
| The Tended Country | II | uncommon | widen (tended production) | Needs tended land. Tended tiles gain +2 production. | production | Economic | kept (built) |
| The Old Fields | II | uncommon | multiply (scaler) | +1% food and production for every three works that have stood thirty turns, at most +30%. | food, production | Economic | kept (built) |
| The Hedgerows | II | common | widen (tended beside farms) | Needs tended land. Worked farms beside a tended tile gain +2 food, once per farm. | food | Economic | kept (built) |
| The Long Tending | III | rare | multiply (tended age) | Needs tended land. Tended tiles gain +2 food for every 25 turns since they were tended, at most +6. | food | Economic | kept (built) |
| The Age of Improvement | III | rare | capstone (doubler) | The bonuses your Orders give to improved tiles are doubled. | every card line on the hex | Wildcard | kept (built) |
| Old Workings | III | common | multiply (age) | Worked mines, quarries and lumber mills that have stood for twenty turns gain +3 production. | production | Economic | kept (built) |
| The Royal Forests | III | uncommon | multiply (culture) | Towns working at least three lumber mills gain +25% culture. | culture | Civic | kept (built) |
| The Water Courts | III | rare | capstone (rule-breaker) | A farm joined to fresh water by a chain of your farms counts as having fresh water. | food | Economic | kept (built) |
| The Hallowed Woods | III | uncommon | multiply (culture from wild land) | Towns working at least five wild tiles gain +25% culture. | culture | Civic | kept (built) |
| The Keeps | IV | rare | finisher; bridge to the militia | Workers may build a Keep, one in each town. A Keep gains the yields of every tile around it, and units on its tile gain +5 strength. | food, production | Economic | kept (built) |
| The Garden of the World | IV | rare | finisher (tended) | Needs tended land. Tended tiles gain +2 food, +1 production and +1 culture. Towns working at least six tended tiles gain +3 happiness. | food, production, culture, happiness | Economic | kept (built) |
| The Heartland | IV | rare | act (commission, institution) | Goal: one of your towns works twelve improved or tended tiles that each yield 5 or more in total. Reward: for the rest of the game that town costs no authority and gains +3 happiness and +20% food. The card then leaves its chair. | authority, happiness, food | Wildcard | kept (built) |
| The Inheritance of Fields | IV | uncommon | multiply (age) | Worked improvements and tended works that have stood for at least 60 turns gain +1 production. Tended ones also gain +1 culture. | production, culture | Economic | kept (built) |
| The Domesday Survey | IV | rare | act (commission, institution); bridge to the frontier | Commission. Own at least 120 hexes and work at least 40 improved or tended tiles at the same time. Then, for the rest of the game, each town gains +1 science for each improved or tended tile it works. The card leaves its chair. | science | Wildcard | reworked; existing (`lasting`) |
| The Two Harvests | IV | rare | rule-breaker (tended) | Needs tended land. Your worked farms, mines and lumber mills also count as tended for your cards, but not as wild. | every card line on the hex | Wildcard | reworked; new shape (farms, mines and mills read as tended) |

- **Charters:** The Fish Traps (0), The Wild Orchards and The Burning Season (I) open the tended works. Tended land stays a splash inside this theme, as you ruled on 2026-10-16: the default is the improvement.
- **The Burning Season** (revised 2026-10-21, section 11) burns any grassland or plains, as you asked. On bare ground it is the tended work it is today. On a tile with an improvement, the improvement stays and the tile gains +1 food as a lasting mark, so a burn never replaces a farm (reading, to confirm).
- **Scaler:** The Old Fields (Tier II). **Capstones:** The Age of Improvement (a doubler) and The Water Courts (a rule-breaker) at Tier III, and The Two Harvests at Tier IV.
- **What its widen cards pay:** gold (Smallholdings), happiness (Sweet Water, The Commons), faith (The Ambarvalia), science (The Rope Stretchers, The Highlands), culture (The Old Songs, The Forest Keepers, The Coast), authority (The Local Census), and food and production (The Three Sisters, The Watercourses, The Tended Country, The Hedgerows).
- **The Rope Stretchers** were Egypt's field surveyors, who measured the fields again after each flood. The card now pays science for measured land. Three towns that each work three improved tiles make +3 science at turn 40, about as much as the rest of an age 1 seat. The mines' production stays on Old Workings.
- **The Marl Pits** become automatic. Marl was dug from pits and spread on the fields beside them. When a worker finishes a mine or a quarry, the farms and pastures beside it gain +1 food for the rest of the game, at most +2 on one tile. It uses the lasting hex mark of batch E3 and needs no new worker order, so it answers the triage's UX question 1.
- **Break the Sod** leaves an institution: every work counts ten turns older. Dark Earth's first +2 food and Old Workings' +3 production come ten turns sooner, and The Old Fields counts sooner.
- **Six Gardens** leaves an institution: tended tiles gain +1 culture. You found it "not very good" as a one-off lump. Ten tended tiles then pay +10 culture a turn with no chair.
- **The Two Harvests** becomes a rule: farms, mines and lumber mills also count as tended for your cards, but not as wild. The Long Tending and The Garden of the World then pay on the whole field. It answers the triage's UX question 2 with no new input. It acts on other cards, so it is Wildcard.
- **The Domesday Survey** leaves an institution: the measured land teaches. The goal falls from 150 hexes and 50 tiles to 120 and 40, as you lowered Dominion's slow goals. Forty-five tiles worked then give +45 science a turn for no chair.
- **Bridges:** The Local Census and The Highlands (to the frontier), The Keeps (to the militia), The Domesday Survey (to the frontier), and from public works The Coming of the Water and The Raising of the Land.
- **Shared cards that serve it:** Market Gardens, Sacred Groves, The Flood Festival, Garden Cities, The Sculpted Landscape, and The Assay (new on this sheet, from the Scientific pass).

### 4.2 The frontier

**The fantasy:** the Greek colonies around the sea, the Roman roads and their milestones, the homesteads of the open plains. Towns everywhere, the land between them claimed, and roads that make one realm of them. **The quantity:** towns founded, hexes owned and claimed, and towns joined by road. Every empire founds towns in age 1; this theme keeps founding. **Areas:** the land, and civic life through authority.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Naturalists | 0 | uncommon | widen (science from the hill country) | Each city gains +1 science for every two hills or mountains in its borders, at most +3. | science | Civic | kept (built) |
| The Seed Grain | 0 | uncommon | supply | Towns you found start with one extra citizen. | citizens | Economic | kept (built) |
| The Road Home | 0 | common | supply (roads) | Each town you found is joined to your nearest town by road. | roads | Economic | kept (built) |
| The Founding Furrow | 0 | common | act (a founding) | Founding a town grants culture equal to five times the number of towns you hold. | culture | Civic | new; new shape, small (a founding rider read from a count) |
| The Hard Country | I | common | widen (the hard country) | Worked desert and tundra tiles gain +1 food and +1 production. | food, production | Economic | kept (built) |
| Outposts | I | uncommon | act (a claim) | Workers may plant an outpost on a wild tile within three hexes of your border, for one charge. It claims its hex and the ring around it for your nearest town, and costs no authority. A town founded on an outpost keeps that land. | land | Economic | kept (built) |
| The Wild Marches | I | common | widen (culture) | +1 culture for every four wild hexes you own. | culture | Civic | kept (built) |
| The Quiet Provinces | I | uncommon | multiply (spare authority) | Each town gains +1 production for every three points of spare authority, at most +3. | production | Economic | kept (built) |
| The Road Towns | I | common | widen (roads) | Towns joined to your capital by road gain +2 production. | production | Economic | kept (built) |
| The Land Hunger | I | uncommon | supply (a wider rival) | While another empire holds more towns than you, your towns build settlers 25% faster, and your settlers gain +1 movement. | production toward settlers, settler movement | Economic | new; revised 2026-10-21 (section 11): 25%, and +1 movement; existing (The Defiant Kingdom's condition) |
| Provincial Councils | II | uncommon | widen (authority) | Connected towns other than the capital cost one less authority, minimum one, and gain +1 happiness. | authority, happiness | Civic | kept (built) |
| The Book of Settlements | II | uncommon | multiply (scaler) | +3% production and gold for every town you have founded this game, at most +30%. | production, gold | Economic | kept (built) |
| The Milestones | II | uncommon | multiply (roads) | +1% gold and culture for every three road hexes you have paved, at most +30%. | gold, culture | Civic | reworked; data only |
| The Colonists | II | uncommon | supply (a levy use: a settler) | Towns of at least six citizens may spend a citizen to raise a settler. | units | Economic | kept (built) |
| The Staked Claims | II | uncommon | supply (land) | Each town you found claims every unowned hex within two hexes of it. | land | Economic | kept (built); moved from Tier III |
| The Mountain Schools | III | uncommon | multiply (science) | Towns with at least two mountains in their borders gain +15% science. Worked mines and quarries beside a mountain gain +2 science. | science | Civic | revised 2026-10-21 (section 11): two mountains in the borders, not one beside the town; new shape, small (a floor on the mountains in a town's borders) |
| The Polders | III | rare | act (new land from the sea) | Workers may raise a polder on a coast tile that touches at least three of your land tiles, for two charges. A polder yields as a farm on grassland. | land, food | Economic | kept (built) |
| The Wide Country | III | uncommon | act (commission, institution) | Commission. Claim twelve hexes by outposts, cleared camps or buying while this card is seated. Then, for the rest of the game, your borders grow 25% faster. The card leaves its chair. | border growth | Wildcard | reworked; existing (`lasting`, a border-growth percent) |
| The Quitrents | III | common | widen (gold) | +1 gold for every two hexes you own. | gold | Economic | kept (built) |
| The Mountain Terraces | III | rare | rule-breaker (science) | Your towns may work the mountains in their borders. A worked mountain yields 2 science and 1 production. | science, production | Civic | kept (built) |
| The Sovereign Writ | III | rare | capstone (rule-breaker: authority) | Spare authority's bonus to production and border growth has no ceiling: +10% for every five points. | production, border growth | Civic | kept (built) |
| The Imperial Roads | III | rare | capstone (rule-breaker: roads) | Towns joined to your capital by road cost no authority. | authority | Civic | kept (built) |
| The Opening of the Roads | III | uncommon | act (roads) | When one of your towns is first joined to your capital by road, it gains production equal to twenty times its population. | production | Economic | kept (built) |
| The Great Colonies | III | rare | capstone (rule-breaker); bridge to the engine | Towns you found start with a third of the citizens of your largest town. | citizens | Economic | kept (built) |
| The Philosophers' Peaks | IV | uncommon | finisher (science) | Each town gains +2 science for every mountain in its borders, at most +6. | science | Civic | kept (built) |
| The Measure of the Land | IV | rare | finisher (science) | Every town gains +1 science for every 25 hexes your empire owns, at most +10. | science | Civic | reworked; revised 2026-10-21 (section 11): at most +10, not +6; data only |
| The Mother City | IV | rare | multiply (towns founded) | Your capital gains +5% production and +5% culture for each town you have founded this game. | production, culture | Civic | reworked; revised 2026-10-21 (section 11): +5% of each, not +3 flat; existing (the `citiesFounded` count) |
| The Great Migration | IV | rare | act (room, taken from rivals) | Every ten turns, each foreign town within three hexes of your border loses one citizen to your nearest town, if your town is happier and has room to grow. | citizens | Economic | kept (built) |
| The Encroaching Fields | IV | uncommon | act (room, taken from rivals) | Once every ten turns, each of your towns of at least twelve citizens takes one hex from the borders of a foreign town next to it, if nobody works that hex and your town is larger than the town that owns it. | land | Economic | kept (built) |
| The Imperial Highways | IV | rare | finisher (the Opus) | The town raising the Magnum Opus gains +3% production toward it for every town joined to your capital by road, at most +45%. | production toward the Opus | Economic | kept (built) |

- **Revised 2026-10-21 (section 11): three frontier cards are cut.** The Beating of the Bounds (*"remove"*), The Garden Frontier (*"remove, cities should only be able to work within 3 hexes"*), and The Common Domain, by your answer to section 11's question (*"let's cut common domain"*). The theme has 30 cards, against 33.
- **Scalers:** The Book of Settlements and The Milestones (Tier II). **Capstones:** The Great Colonies, The Imperial Roads and The Sovereign Writ. The Mountain Terraces and The Polders also break rules, and each one makes new room.
- **The Founding Furrow** is the deck's first culture card at Tier 0. A Roman founder ploughed a furrow round each new town. The second town pays 10 culture, the third 15 and the fourth 20: 45 culture, when the first draft costs 12. Tier 0 had no culture card before, and the deck no longer drafts slower.
- **The Land Hunger** is the race for room: while another empire holds more towns, settlers come 25% faster and move one hex further (revised 2026-10-21, section 11). It reads The Defiant Kingdom's built condition, and it is Mithridates' theme.
- **The Mother City** now reads towns founded. The Greek mother city was honoured by the colonies it sent out. Twelve towns founded give the capital +60% production and +60% culture, with no cap (revised 2026-10-21, section 11: you judged a percentage the better late bonus). One big capital on its own is Scientific's great city (The Round City).
- **The Measure of the Land** pays science, not production. "Geometry" means the measure of the land. Two hundred and fifty hexes give each town +10 science (revised 2026-10-21, section 11: the cap rises from +6).
- **The Mountain Schools** (revised 2026-10-21, section 11) reads mountains inside a town's borders: a town with two of them gains +15% science. "Beside a mountain" was too strict, in your words. The mines' and quarries' half is unchanged (reading, to confirm).
- **The Milestones** pay gold and culture, not production and gold. Roman milestones carried the emperor's name down every road, and three other frontier scalers pay production.
- **The Staked Claims** moves to Tier II, where most towns are still being founded.
- **The Wide Country** leaves an institution: your borders grow 25% faster.
- **What its widen cards pay:** science (The Naturalists), culture (The Wild Marches), food and production (The Hard Country), production (The Road Towns), authority and happiness (Provincial Councils), gold (The Quitrents).
- **The split:** spare authority and joined towns are this deck's way to hold a wide realm. Magisterial owns the government system, and no card here touches chairs.
- **Shared cards that serve it:** Military Colonies, The Barbarian Frontier, Marcher Lords, The Provincial Fair, Garden Provinces.

### 4.3 Public works

**The fantasy:** Rome's aqueducts and baths, Egypt's granaries, the engineers of Song China. A realm that builds what lets its towns grow, and many towns that raise the realm's great houses together. **The quantity:** public works held and finished, empire buildings held, and great engineers. Every town builds public works. **Areas:** the economy, civic life (happiness and authority) and great people (engineers).

**Public works, the card word:** the Granary, Aqueduct, Watermill, Harbour, Public Bath and Cistern. They are a town's food and water, its mill and its docks. No card reads them as a group today. The proposal is a marker on those six rows, as `empireBuilding` marks the great houses (question 3).

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Horrea | 0 | uncommon | widen (authority) | Each Granary you hold gives +1 authority. | authority | Civic | new; existing (an empire count of Granaries, paid to authority) |
| The Master Builders | I | common | supply (engineers) | Towns working at least three mines, quarries or lumber mills give +1 renown a turn, favouring great engineers. | renown | Civic | kept (built) |
| The Public Fountains | I | common | widen (happiness) | Towns beside a river or lake gain +1 happiness for every four citizens, at most +3. | happiness | Civic | kept (built) |
| The Aediles | I | uncommon | multiply (grower) | While seated, this card gains +1 production and +1 culture each time you finish a public work. It starts at +2 of each. | production, culture | Civic | new; new shape (a tally of public works finished) |
| The Grain Dole | II | common | widen (happiness); bridge to the engine | Cities of at least ten population gain +4 happiness and retain an additional 20% of food spent on growth. | happiness, food | Civic | kept (built) |
| The Waterworks | II | uncommon | supply (Aqueducts) | Aqueducts cost 33% less production. Towns with an Aqueduct gain +1 happiness for every four citizens, at most +3. | happiness, production | Civic | kept (built) |
| The Engineers' Yards | II | common | widen (manufactories) | Manufactories gain +3 production. Worked farms, mines, quarries and lumber mills beside a manufactory gain +2 production. | production | Economic | kept (built) |
| The Many Hands | II | uncommon | supply (empire buildings) | Your towns build empire buildings 3% faster for each town you hold, at most +36%. | production | Economic | new; near existing (the empire-building filter, and a count of towns) |
| A Court of Engineers | III | rare | supply (engineers, with a cost) | Gain +50% renown, but great-person offers contain only great engineers. | renown | Civic | kept (built) |
| The Raising of the Land | III | rare | act (engineers); bridge to the raised land | When a great engineer rushes the works in one of your towns, every improved or tended tile in its borders gains +1 food and +1 production for the rest of the game. | food, production | Economic | kept (built) |
| The Coming of the Water | III | uncommon | act (an Aqueduct); bridge to the raised land | When a town finishes an Aqueduct, every farm in its borders gains +1 food for the rest of the game. | food | Economic | kept (built) |
| The Mill Wheels | III | common | multiply | Towns with a Watermill gain +15% production. | production | Economic | kept (built) |
| The Topping Out | III | uncommon | act (empire buildings) | Finishing an empire building grants each of your towns production equal to five times its population. | production | Economic | reworked; near existing (a completion rider on empire buildings, paid to every town from its own figure) |
| The Capitolia | III | uncommon | widen (culture from empire buildings) | Each empire building you hold gives each of your towns +1 culture. | culture | Civic | new; existing (the `empireBuildings` count) |
| The Cura Aquarum | III | rare | capstone (rule-breaker); bridge to the frontier | Towns joined to your capital by road count as having an Aqueduct. | food | Economic | new; new shape (a town counts as holding a building) |
| The Master of Works | IV | rare | finisher (engineers and the Opus) | When a great engineer rushes the works in the city building the Magnum Opus, each of your towns with a manufactory also sends that city one turn of its own production. | production toward the Opus | Economic | kept (built) |
| The Great Aqueducts | IV | rare | finisher (the Opus) | The town raising the Magnum Opus gains +5% production toward it for each of your towns with an Aqueduct, at most +40%. | production toward the Opus | Economic | kept (built) |
| The Public Good | IV | rare | multiply (finisher) | +1% science and culture for each public work you hold, at most +25%. | science, culture | Civic | new; new shape, small (a count of public works) |

- **The split with Scientific** (ruling 5): Scientific opens empire buildings early and makes each one stronger. These three cards scale with towns (revised 2026-10-21, section 11: The Builders' Levy, the fourth, is cut, because you found it too like Levy of the Land):
  - The Many Hands: 3% faster for each town you hold, so twelve towns raise a house 36% faster;
  - The Topping Out: every town gains production equal to five times its citizens when a house is finished, about 600 in all for twelve towns of ten;
  - The Capitolia: each house gives every town +1 culture. Roman provincial towns built copies of the Capitol of Rome. Five houses and twelve towns give +60 culture, band 3's regular card.
- **The split with Devotion** *(the proposal in "Direction, 2026-10-20")*: Expansionist raises happiness and authority through public works. The Horrea pays authority for Granaries: four of them give +4, more than one town costs (3). The Public Fountains, The Grain Dole and The Waterworks pay happiness.
- **Scaler: The Aediles,** a grower from Tier I. The aediles were the Roman officials who kept the public works. Eight public works by turn 90 make it +10 production and +10 culture; twenty-five by turn 150 make it +27 of each.
- **Capstone: The Cura Aquarum,** the Roman office that ran the city's aqueducts. Towns joined to your capital by road count as having an Aqueduct: +15% growth, and the town counts as standing on fresh water. It breaks the rule that a building serves only its own town. Ten joined towns save about 1,500 production, and each one counts for The Great Aqueducts, The Waterworks and Hydraulic Schools. It joins public works to the frontier's roads.
- **The Public Good:** thirty public works in age 4 give +25% science and culture, about 230 a turn. It is a headline rare, and the deck's late answer to the two essentials.
- **The engineers:** Watermills, Public Baths, Workshops and Forges earn engineer renown, and The Master Builders and A Court of Engineers add more. The engineer's act raises a town's land (The Raising of the Land), or, in the Opus town, draws a turn of production from every manufactory town (The Master of Works).
- **Wonders left this theme** (ruling 3): The Topping Out now serves empire buildings, and The Pyramid Builders and The Landscape Garden are cut (section 8). The Builders' Levy, reworked here for empire buildings, is cut too (revised 2026-10-21, section 11), so public works have no levy use.
- **Shared cards that serve it:** Hydraulic Schools, The Grain Exchange.

### 4.4 The militia

**The fantasy:** Alfred's fortified towns and the farmers who manned them, the Roman citizen-soldier, the Swiss cantons. Citizens take up arms when the realm needs them, and go home for the harvest. **The quantity:** units a levy raised, and the citizens and walls of each town. **Areas:** the army.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Woodland Bands | 0 | common | supply; bridge to the frontier | Your units ignore the extra movement cost of forest and jungle, and gain +2 strength while they stand in forest or jungle. | combat | Military | kept (built) |
| The Burhs | I | common | multiply (walls) | Towns gain +3 defence for every defensive building in them, and +100% production toward defensive buildings. | defence, production | Military | kept (built) |
| Veteran Colonies | II | uncommon | act (a soldier becomes a citizen); bridge to the engine | A military unit standing in one of your towns may retire there: the unit is removed and the town gains one citizen. | citizens | Economic | revised 2026-10-21 (section 11): one citizen, not food; new shape, small (a citizen granted on the `disband` moment) |
| Watch and Ward | II | common | multiply | Needs a levy. Units a levy raised gain +5 strength in your own territory. | combat | Military | new; existing (the levy mark, own territory) |
| The Trained Bands | III | uncommon | supply (ranks) | Needs a levy. Units raised by a levy start as Veterans. | ranks | Military | kept (built) |
| The Stationes | III | uncommon | multiply; bridge to the frontier | Land units gain +3 strength while they stand in a town connected to your capital by road. | combat | Military | kept (built) |
| The General Levy | IV | rare | supply (a levy use: soldiers) | Your towns may spend one citizen to raise their best melee unit. At peace a town may do this once every five turns, sharing the levy limit; while you are at war, once every turn. Units raised this way cost no upkeep inside your borders. | units | Military | kept (built) |
| The Theodosian Walls | IV | uncommon | multiply (citizens) | Your towns gain +1 defence for every two citizens. | defence | Military | kept (built) |

- **The smallest theme, on purpose.** Expansionist is not a war deck. The militia reaches the army, and it gives an Expansionist seat cards for its Military chairs. It has 8 cards (revised 2026-10-21, section 11: 9 before Home for the Harvest's cut).
- **Capstone: none** (revised 2026-10-21, section 11). Home for the Harvest is cut, by your answer to section 11's question (*"cut one of veteran colonies and home for harvest"*). Veteran Colonies now does its job for every soldier: a military unit retired in one of your towns gives that town a citizen. So a levied soldier who goes home after the war gives its citizen back, and the war costs the realm its hammers and little else. The General Levy is the theme's late pay-off.
- **Watch and Ward** (the old English duty of every town to keep a watch): levied units fight at +5 in your own territory. That is band 2's regular combat line, for the units this theme makes.
- **Ranks are Dominion's.** The Trained Bands, which makes levied units Veterans, is the one card here that touches them.
- **Scaler:** none of its own. The Labour Rolls (engine) counts every levied citizen.
- **Shared cards that serve it:** The Frontier Militia, The Muster of the Fields, The Farming Garrisons, The Road Garrisons.

## 5. Example councils

A Tier 0 card is marked (0). Charters drafted beside a council take no chair. Chair mixes are written Military / Economic / Civic / Wildcard. An institution is held with no chair.

### Council 1: the garden realm (the raised land and public works)

- **Opening, the Chiefdom (1 / 1 / 0 / 1):** The Woodland Bands; Smallholdings; The Horrea. Charter: The Fish Traps.
- **End of Tier I, the Council of Elders (1 / 2 / 1 / 1):** The Burhs; Smallholdings (0), Dark Earth; The Aediles; Commission: Break the Sod. Charter: The Wild Orchards.
- **End of Tier II, the Republic (0 / 3 / 1 / 1):** Dark Earth, The Old Fields, The Engineers' Yards; The Waterworks; The Aediles. Institution: Break the Sod.
- **Tier III, the Merchant League (1 / 3 / 2 / 2):** The Burhs; The Old Fields, Old Workings, The Coming of the Water; The Waterworks, The Capitolia; The Age of Improvement, The Aediles.
- **Tier IV, the Estates (2 / 4 / 2 / 3):** The Burhs, The Theodosian Walls; The Old Fields, Old Workings, The Coming of the Water, The Great Aqueducts; The Capitolia, The Public Good; The Age of Improvement, The Aediles, The Heartland.
- **How it feels:**
  - Turn 20: the capital's Granary gives +1 authority (The Horrea), so the third town fits early. Workers tend the lakeshore into fish traps.
  - Turn 50: the twelfth improved tile is worked, and Break the Sod is met. Every work now counts ten turns older, so Dark Earth's +2 food lands on farms built at turn 40.
  - Turn 90: eight public works are finished (Granaries, Harbours, the first Watermills), and The Aediles pays +10 production and +10 culture.
  - Turn 140: the river town's Aqueduct opens, and its eight farms gain +1 food for good. The realm holds four empire buildings, so The Capitolia gives each of eleven towns +4 culture.
  - Turn 170: The Age of Improvement doubles every card's line on an improved tile. One town works twelve tiles of five yield or more, and The Heartland is met.

### Council 2: the open frontier (the frontier and the engine), with Commerce

- **Opening, the Chiefdom (1 / 1 / 0 / 1):** The Woodland Bands; the shared Market Gardens; The Founding Furrow.
- **End of Tier I, the Priest-King (1 / 1 / 2 / 1):** The Burhs; The Road Towns; The Founding Furrow (0), The Wild Marches; Levy of the Land.
- **End of Tier II, the Theocracy (1 / 0 / 3 / 1):** The Burhs; The Founding Furrow, Provincial Councils, The Teeming Realm; The Book of Settlements.
- **Tier III, Divine Mandate (2 / 1 / 3 / 2):** The Burhs, The Stationes; The Great Colonies; The Teeming Realm, The Imperial Roads, The Sovereign Writ; The Book of Settlements, The Wide Country.
- **Tier IV, the Curia (2 / 2 / 4 / 3):** The Stationes, The Theodosian Walls; The Great Colonies, The Encroaching Fields; The Teeming Realm, The Imperial Roads, The Sovereign Writ, The Mother City; The Book of Settlements, The Measure of the Land, The Imperial Highways. Institution: The Wide Country.
- **How it feels:**
  - Turn 12: the second town is founded, and The Founding Furrow pays 10 culture. The first draft comes early.
  - Turn 45: five towns. Commerce's caravans lay the roads, and The Road Towns gives the joined towns +2 production.
  - Turn 100: eight towns founded, so The Book of Settlements gives +24% production and gold.
  - Turn 140: The Imperial Roads is seated, and every joined town costs no authority. Spare authority passes 20, and The Sovereign Writ pays +40% production and border growth.
  - Turn 150: the capital has 24 citizens, so a town founded in the last gap starts with 8 (The Great Colonies).
  - Turn 175: no land is left. Every ten turns, each town of twelve takes a hex from a smaller foreign town beside it (The Encroaching Fields).

### Council 3: the citizen army (the militia and the engine), with Dominion

- **Opening, the Chiefdom (1 / 1 / 0 / 1):** the shared The Frontier Militia; The Seed Grain; Granary Levies.
- **End of Tier I, the War Chief (2 / 1 / 1 / 1):** The Frontier Militia (0), the shared The Muster of the Fields; Levy of the Land; The Labour Feasts; The Grain Census.
- **End of Tier II, Tyranny (3 / 1 / 0 / 1):** The Muster of the Fields, Watch and Ward, The Burhs; The Labour Rolls; Veteran Colonies.
- **Tier III, Imperium (3 / 2 / 1 / 2):** The Muster of the Fields, Watch and Ward, The Trained Bands; The Labour Rolls, Seasonal Levies; The Megalopolis; The Slack Season, Veteran Colonies. Revised 2026-10-21 (section 11): The Slack Season takes Home for the Harvest's Wildcard chair.
- **Tier IV, the Sultanate (4 / 2 / 2 / 3):** The General Levy, The Trained Bands, Watch and Ward, The Theodosian Walls; The Labour Rolls, The Corvée; The Megalopolis, The Labour Feasts; The Slack Season, Veteran Colonies, The Mit'a. Revised 2026-10-21 (section 11), as at Tier III.
- **How it feels:**
  - Turn 25: each new town starts with a Spearman standing in it (The Frontier Militia).
  - Turn 60: a neighbour attacks. Three towns each spend a citizen on a Swordsman (The Muster of the Fields), and The Labour Feasts pays culture from their wild tiles.
  - Turn 100: the levied soldiers fight at +5 inside the borders (Watch and Ward). After the peace they walk home and retire, and Veteran Colonies gives each town its citizen back (revised 2026-10-21, section 11: a citizen, not food).
  - Turn 140: levied units start as Veterans (The Trained Bands), and every twentieth turn each town may levy at once (The Slack Season). Between wars the army costs the realm almost nothing (revised 2026-10-21, section 11: Home for the Harvest is cut).
  - Turn 175: at war, The General Levy lets every town levy each turn. At peace, The Corvée sends citizens into the Opus.

## 6. Features that would open cards in several decks

None of these adds a player input.

### Features A and B (accepted 2026-10-20)

- **Feature A, the trades:** The Burghers. Engineer guildsmen come from the public works' renown buildings (the Watermill, the Public Bath), so a public-works seat already makes them. The Scientific pass's other Expansionist idea, "engineer guildsmen pay +1 food", is not taken: it is another food card.
- **Feature B, reading rivals:** no card needs it. The Land Hunger reads "another empire holds more towns than you", which is The Defiant Kingdom's built condition.

### Feature C (proposed by the Dominion pass)

- No Expansionist card uses it. The deck has five commissions, and two themes have none, so a reader would be thin.
- If you accept feature C, The Harvest Feast (proposed 2026-10-13: a met commission feeds every town) can come back as glue.

### A candidate, for your judgement: a town's age

- **What it is:** the turn each town was founded, and a town scope that reads it ("founded in the last thirty turns", "standing for a hundred turns"), as `standingSince` reads a work's age.
- **What the game has:** a work's age (`Tile.improvedOn`) and a capture's turn (`City.capturedOn`). A town has no founding turn.
- **What it costs:** one field written at founding (an absolute turn that never ticks), one town scope, and its words. A save schema bump.
- **Cards it would open:**
  - Expansionist: The Bastides, after the planned new towns of medieval France, which were granted freedom from dues: "Towns you founded in the last thirty turns cost no authority."
  - Magisterial: old towns pay culture ("towns standing for a hundred turns gain +10% culture").
  - Devotion: the old holy city gains faith for every twenty turns it has stood.
  - Commerce: routes to old market towns pay more.
- **My view:** modest. For Expansionist, a reading of town size does most of the job ("towns of at most three citizens"). The case rests on Magisterial and Devotion. No card on the list depends on it.

## 7. New shapes

Ten new shapes in seven groups (revised 2026-10-21, section 11: nine before; The Builders' Levy's levy target and Home for the Harvest's rider went with their cuts, and The Burning Season, The Mountain Schools and Veteran Colonies each add one). Most are small. All read what the game tracks.

1. **Public works:** a `publicWork` marker on six building rows (markers, not names: CLAUDE.md), read as a count (The Public Good) and as a tally of public works finished while a card is seated (The Aediles).
2. **Empire buildings and towns:** The Many Hands joins two built pieces, the empire-building filter on `productionBonus` and a count of towns. The Topping Out joins a completion rider on an empire building with batch E5's delivery to every town from its own figure. The Capitolia uses the built `empireBuildings` count. Revised 2026-10-21 (section 11): The Builders' Levy, which named a new target for a levy use, is cut.
3. **A town counts as holding a building:** The Cura Aquarum. Every reading of a town's buildings must see it: the Aqueduct's own effects, its water, `hasBuilding` and the counts. It is the largest piece of work in this pass. Scientific's The Studium Generale has the same idea for works.
4. **The land:**
   - an age offset on works, read wherever `standingSince` is read (Break the Sod's institution);
   - a finished mine or quarry that writes batch E3's hex mark on the farms and pastures beside it, at most two marks a tile (The Marl Pits);
   - farms, mines and lumber mills read as tended by the `tended` tile test, but not by `unimproved` (The Two Harvests);
   - a burn on an improved grassland or plains tile that writes batch E3's hex mark and keeps the improvement (The Burning Season; revised 2026-10-21, section 11);
   - a floor on the mountains inside a town's borders, "at least two" (The Mountain Schools; revised 2026-10-21, section 11).
5. **The frontier:** a founding rider whose figure reads a count, the towns you hold (The Founding Furrow).
6. **The militia:** a citizen granted on the `disband` moment, in the town where the unit retires (Veteran Colonies; revised 2026-10-21, section 11). The moment exists (Dominion batch D7). Home for the Harvest's rider for a unit a levy raised is no longer needed, because the card is cut.
7. **The engine:** feature A's guild-bar percent, with a town scope (The Burghers).

**The other changed and new cards use shapes that exist:** The Rope Stretchers (a town count of improved tiles), The Horrea (an empire count of Granaries paid to authority, as the Imperial Throne pays it), The Land Hunger (The Defiant Kingdom's condition, with a settler's movement inside it), Watch and Ward (`combatLine` in your own territory, narrowed by the levy mark), The Capitolia, The Mother City (the `citiesFounded` count, as a percentage in the capital), Plenty, The Teeming Realm, The Milestones and The Measure of the Land (data only), and the four commissions (`CommissionReward.lasting`). Revised 2026-10-21 (section 11) for The Land Hunger, The Mother City, Plenty and The Measure of the Land.

**For less engine work, cut** The Burghers, The Marl Pits and The Two Harvests' rework (retire its row instead) first. The Cura Aquarum is the most work, but it is the public works' capstone.

## 8. The sheet's cards

### The Expansionist cards (120)

| Card | Tier | Fate | Why |
|---|---|---|---|
| Smallholdings | 0 | kept | the raised land, widen (gold) |
| Granary Levies | 0 | kept | engine glue, growth (a moment) |
| The Naturalists | 0 | kept | the frontier, widen (science from the hill country) |
| The Patient Harvest | 0 | kept | engine glue, growth (with a cost) |
| The Fish Traps | 0 | kept | the raised land, supply (a charter: a tended work) |
| Sweet Water | 0 | kept | the raised land, widen (fresh water) |
| The Seed Grain | 0 | kept | the frontier, supply |
| The Ambarvalia | 0 | kept | the raised land, widen (faith); the early faith |
| The Rope Stretchers | 0 | reworked | the raised land, widen; the name means the Egyptian field surveyors, so it now pays science for measured land; Old Workings keeps the mines' production |
| The Beating of the Bounds | 0 | cut; revised 2026-10-21 (section 11) | you removed it (*"remove"*). This pass had reworded it to answer the triage's UX question 3 |
| The Pyramid Builders | 0 | cut | wonders leave Expansionist (ruling 3). Offered to the Magisterial pass as a Tier 0 opener |
| The Road Home | 0 | kept | the frontier, supply (roads) |
| The Work Gangs | 0 | kept | the raised land, supply (a levy use: a worker) |
| The Woodland Bands | 0 | kept | the militia, supply; bridge to the frontier |
| The Burhs | I | kept | the militia, multiply (walls) |
| Levy of the Land | I | kept | engine glue, the levy |
| Tinkers' Guild | I | kept | the raised land, supply |
| The Old Songs | I | kept | the raised land, widen (culture on wild land) |
| The Local Census | I | kept | the raised land, widen (authority); bridge to the frontier |
| The Wild Orchards | I | kept | the raised land, supply (a charter: a tended work) |
| The Burning Season | I | revised 2026-10-21 (section 11) | the raised land, supply (a charter); you widened it to any grassland or plains, so a burn on an improved tile keeps the improvement and adds a lasting +1 food |
| Dark Earth | I | kept | the raised land, multiply (age) |
| The Three Sisters | I | kept | the raised land, widen (neighbours) |
| The Commons | I | kept | the raised land, widen (happiness) |
| The Hard Country | I | kept | the frontier, widen (the hard country) |
| The Master Builders | I | kept | public works, supply (engineers) |
| Outposts | I | kept | the frontier, act (a claim) |
| The Prospectors | I | cut | veins are shelved (`veins.share` is 0), so no seam surfaces and it pays nothing; Scientific reworked its own seam card for the same reason |
| Six Gardens | I | reworked | the raised land, act; you found it "not very good", so the one-off lump becomes a lasting institution |
| The Marl Pits | I | reworked | the raised land, act; marl came out of the pits beside the fields. Automatic, so it answers the triage's UX question 1 |
| The Forest Keepers | I | kept | the raised land, widen (culture) |
| The Plough Teams | I | cut | four cards counted a town's improved tiles; this one paid the deck's own yield, food. The Rope Stretchers keeps the count, for science |
| Commission: Break the Sod | I | reworked | the raised land, supply; the reward becomes an institution that brings every age card ten turns sooner |
| The Grain Census | I | kept | engine glue, growth (grower) |
| The Polis | I | cut | a few towns is Scientific's way to play (The Free Cities); Expansionist goes tall by growing many towns |
| The Public Fountains | I | kept | public works, widen (happiness) |
| The Builders' Levy | I | cut; revised 2026-10-21 (section 11) | you found it *"too similar to levy of the land"*. This pass had reworked it to raise empire buildings |
| The Labour Feasts | I | kept | engine glue, the levy (culture) |
| The Gleaners | I | kept | engine glue, the levy (regrowth) |
| The Wild Marches | I | kept | the frontier, widen (culture) |
| The Quiet Provinces | I | kept | the frontier, multiply (spare authority) |
| The Road Towns | I | kept | the frontier, widen (roads) |
| The Garden Frontier | I | cut; revised 2026-10-21 (section 11) | you removed it: *"cities should only be able to work within 3 hexes"* |
| The Watercourses | II | kept | the raised land, widen (water) |
| The Highlands | II | kept | the raised land, widen (science); bridge to the frontier |
| The Coast | II | kept | the raised land, widen (culture at sea) |
| Provincial Councils | II | kept | the frontier, widen (authority) |
| The Grain Dole | II | kept | public works, widen (happiness); bridge to the engine |
| The Waterworks | II | kept | public works, supply (Aqueducts) |
| The Breadbasket | II | kept | engine glue, growth (surplus into production) |
| Migration | II | kept | engine glue, citizens moved; bridge to the frontier |
| Veteran Colonies | II | revised 2026-10-21 (section 11) | the militia, act; a retired soldier now gives its town a citizen, not food, and the card takes over Home for the Harvest's job |
| The Landscape Garden | II | cut | its "or a wonder" half leaves with the wonders, and the shared The Sculpted Landscape already pays beside great-person works. The wonder half is offered to the Magisterial pass |
| The Engineers' Yards | II | kept | public works, widen (manufactories) |
| The Tended Country | II | kept | the raised land, widen (tended production) |
| The Old Fields | II | kept | the raised land, multiply (scaler) |
| The Hedgerows | II | kept | the raised land, widen (tended beside farms) |
| The Great Households | II | kept | engine glue, citizens (multiply) |
| The Harbour Cities | II | kept | engine glue, citizens (culture) |
| The Labour Rolls | II | kept | engine glue, the levy (scaler) |
| The Terraces of Moray | II | kept | engine glue, the levy (science); bridge to the frontier |
| The Book of Settlements | II | kept | the frontier, multiply (scaler) |
| The Milestones | II | reworked | the frontier, multiply; Roman milestones carried the emperor's name down every road. It now pays culture, because three other frontier scalers pay production |
| The Colonists | II | kept | the frontier, supply (a levy use: a settler) |
| The Teeming Realm | II | reworked | engine glue, the scaler of the people; it now pays science and culture, the deck's answer to the open question, and four other scalers already pay production |
| The Woodwrights | III | cut | no theme: a chop spends the land, and by Tier III few forests are left to fell |
| The Common Domain | III | cut; revised 2026-10-21 (section 11) | your answer to section 11's question: *"let's cut common domain"*. Towns work only within three hexes |
| Seasonal Levies | III | kept | engine glue, the levy (regrowth) |
| The Long Tending | III | kept | the raised land, multiply (tended age) |
| The Mountain Schools | III | revised 2026-10-21 (section 11) | the frontier, multiply (science); the town half reads two mountains in the borders, because "beside a mountain" was too strict |
| The Polders | III | kept | the frontier, act (new land from the sea) |
| Public Works | III | cut | the sheet's recommendation: its land job is The Raising of the Land's, its terraces belong to one leader, and two engineer acts need a choice. Its name becomes the theme's word |
| A Court of Engineers | III | kept | public works, supply (engineers, with a cost) |
| The Wide Country | III | reworked | the frontier, act; the reward becomes an institution |
| The Raising of the Land | III | kept | public works, act (engineers); bridge to the raised land |
| The Age of Improvement | III | kept | the raised land, capstone (doubler) |
| The Deep Workings | III | cut | it needed a new worker order (a new input), and Old Workings already pays old mines, quarries and mills |
| Old Workings | III | kept | the raised land, multiply (age) |
| The Manors | III | cut | another count of a town's improved tiles; Old Workings pays the same works by the age the theme rewards |
| The Royal Forests | III | kept | the raised land, multiply (culture) |
| The Megalopolis | III | kept | engine glue, citizens (pay-off) |
| The Freedom of the City | III | kept | engine glue, growth (a moment) |
| Plenty | III | revised 2026-10-21 (section 11) | engine glue, growth (a moment); five times the new population, not eight |
| The Water Courts | III | kept | the raised land, capstone (rule-breaker) |
| The Coming of the Water | III | kept | public works, act (an Aqueduct); bridge to the raised land |
| The Mill Wheels | III | kept | public works, multiply |
| The Topping Out | III | reworked | public works, act; wonders leave Expansionist, so the topping-out is now for empire buildings, and it scales with towns (ruling 5). The wonder version is offered to the Magisterial pass |
| The Mit'a | III | kept | engine glue, capstone (rule-breaker) |
| The Slack Season | III | kept | engine glue, the levy (the moment) |
| The Trained Bands | III | kept | the militia, supply (ranks) |
| The Staked Claims | III | kept; moved from Tier III | the frontier, supply; moved to Tier II, where most towns are still being founded |
| The Quitrents | III | kept | the frontier, widen (gold) |
| The Hallowed Woods | III | kept | the raised land, multiply (culture from wild land) |
| The Mountain Terraces | III | kept | the frontier, rule-breaker (science) |
| The Assay Office | III | cut | veins are shelved, so no seam surfaces and it pays nothing. The shared The Assay pays science on strategic resources instead |
| The Sovereign Writ | III | kept | the frontier, capstone (rule-breaker: authority) |
| The Tax Rolls | III | kept | engine glue, the census |
| The Imperial Roads | III | kept | the frontier, capstone (rule-breaker: roads) |
| The Opening of the Roads | III | kept | the frontier, act (roads) |
| The Stationes | III | kept | the militia, multiply; bridge to the frontier |
| The Great Colonies | III | kept | the frontier, capstone (rule-breaker); bridge to the engine |
| The Managed Wild | III | cut | a fourth tended-land food card; The Long Tending carries tended food late |
| The Keeps | IV | kept | the raised land, finisher; bridge to the militia |
| The Land's Great Work | IV | cut | a fourth card of one job (production toward the Opus by a count of towns). The Corvée, The Great Aqueducts and The Imperial Highways keep one each for the engine, public works and the frontier |
| The Garden of the World | IV | kept | the raised land, finisher (tended) |
| The Heartland | IV | kept | the raised land, act (commission, institution) |
| The Corvée | IV | kept | engine glue, the way to win (the levy) |
| The Master of Works | IV | kept | public works, finisher (engineers and the Opus) |
| The Philosophers' Peaks | IV | kept | the frontier, finisher (science) |
| The Inheritance of Fields | IV | kept | the raised land, multiply (age) |
| The Measure of the Land | IV | reworked; revised 2026-10-21 (section 11) | the frontier, finisher; "geometry" means the measure of the land, so the card now pays science, and the frontier's late science grows with the land it holds. You raised the cap to +10 |
| The Mother City | IV | reworked; revised 2026-10-21 (section 11) | the frontier, multiply; a big capital is Scientific's great city (The Round City). The Greek mother city was honoured by the colonies it founded, so it now reads towns founded. You made it +5% production and culture for each, a better late bonus |
| The General Levy | IV | kept | the militia, supply (a levy use: soldiers) |
| The Great Migration | IV | kept | the frontier, act (room, taken from rivals) |
| The Encroaching Fields | IV | kept | the frontier, act (room, taken from rivals) |
| The Domesday Survey | IV | reworked | the raised land, act; the goal is lowered and the reward becomes an institution: the survey makes the measured land teach |
| The Two Harvests | IV | reworked | the raised land, rule-breaker; it answers the triage's UX question 2 with no new input. It acts on other cards, so it is Wildcard |
| The Great Aqueducts | IV | kept | public works, finisher (the Opus) |
| The Imperial Highways | IV | kept | the frontier, finisher (the Opus) |
| The Theodosian Walls | IV | kept | the militia, multiply (citizens) |

**Tally** (revised 2026-10-21, section 11): 88 kept (one of them moved to Tier II), 4 revised by your comments (one of them the charter The Burning Season), 12 reworked (two of them revised by your comments), 16 cut. Fifteen of the cut cards have a data row to retire: fourteen live rows and the deferred Public Works. The Deep Workings has no row. With 10 new cards (one of them, The Land Hunger, revised by your comments), the deck holds 111 seatable cards and 3 charters. Home for the Harvest was new, so it is cut without reaching the sheet: 17 cuts in all.

### The shared cards (16, and one new)

All kept. Each pair keeps an early shared card (ruling (qqqqqq) 14).
- **The raised land:** Market Gardens (0, Commerce), Sacred Groves (0, Devotion), The Flood Festival (I, Devotion), Garden Cities (I, Magisterial), The Sculpted Landscape (III, Magisterial), and **The Assay** (I, Scientific; new on this sheet, by your ruling on the Scientific review page, 2026-10-21): "Hexes with a strategic resource gain +2 science."
- **The frontier:** Military Colonies (I, Dominion), The Barbarian Frontier (I, Dominion), Marcher Lords (II, Dominion), The Provincial Fair (II, Commerce), Garden Provinces (II, Magisterial).
- **Public works:** Hydraulic Schools (I, Scientific), The Grain Exchange (I, Commerce).
- **The militia:** The Frontier Militia (0, Dominion), The Muster of the Fields (I, Dominion), The Farming Garrisons (I, Dominion), The Road Garrisons (II, Dominion).
- **Military Colonies** had no Dominion theme, and the Dominion pass left its fate to this one. It stays: Barracks towns that build settlers and workers are a bridge from the militia to the frontier.
- **Retire:** The Hydraulic Commonwealth, a deferred row in `common.json` that no sheet lists (the sheet's recommendation, and the Scientific pass's). Scientific batch S1b has since retired it.

### Not taken from earlier proposals

- **The proposals of 2026-10-13 that no build used** stay off the sheet: The Land Grant, The Gatherers, The Barn-Raising, The Charter Rolls (the name is now Scientific's), The Town Rolls, The Mosaic, Labour Dues, The Open Country, Commission: The Long Furrow, Commission: The Granaries Full and The Wellsprings. The Harvest Feast waits on feature C.
- **The Fire Mosaic** stays out: you removed the town-wide burning (*"remove burning, feels difficult to implement, maybe implement later"*).
- **The one-effect trims of 2026-10-13** (Sweet Water, Provincial Councils, The Grain Dole, The Waterworks, The Engineers' Yards, The Mountain Schools, The Garden of the World, and the shared Marcher Lords and The Road Garrisons) are not applied. They stay open on the sheet.
- **The Bastides** waits on the candidate feature in section 6.

### The Doctrines

Not changed. Two of the 32 proposed Doctrines no longer fit a theme, because they are about wonders: The Royal Works and The Builder Kings. The rest map onto the themes: the improvement build to the raised land, the waterworks and the great works to public works (The Cathedral Lodges fits the engineers), the breadbasket and the flex to the engine, and the wide flavours to the frontier.

### The type sort

Revised 2026-10-21 (section 11): five cards leave the sort. The Beating of the Bounds (Tier 0), The Garden Frontier and The Builders' Levy (Tier I), and The Common Domain and Home for the Harvest (Tier III) were all Economic. No revised card changes its type.

- **Tier 0 (13).** Military (1): The Woodland Bands. Economic (7): Smallholdings, Granary Levies, The Patient Harvest, Sweet Water, The Seed Grain, The Road Home, The Work Gangs. Civic (5): The Naturalists, The Ambarvalia, The Rope Stretchers, The Founding Furrow, The Horrea. Charters: The Fish Traps (Economic).
- **Tier I (24).** Military (1): The Burhs. Economic (12): Levy of the Land, Tinkers' Guild, Dark Earth, The Three Sisters, The Hard Country, Outposts, The Marl Pits, The Grain Census, The Gleaners, The Quiet Provinces, The Road Towns, The Land Hunger. Civic (9): The Old Songs, The Local Census, The Commons, The Master Builders, The Forest Keepers, The Public Fountains, The Labour Feasts, The Wild Marches, The Aediles. Wildcard (2): Six Gardens, Commission: Break the Sod. Charters: The Wild Orchards (Economic), The Burning Season (Economic).
- **Tier II (25).** Military (1): Watch and Ward. Economic (14): The Watercourses, The Breadbasket, Migration, Veteran Colonies, The Engineers' Yards, The Tended Country, The Old Fields, The Hedgerows, The Great Households, The Labour Rolls, The Book of Settlements, The Colonists, The Staked Claims, The Many Hands. Civic (10): The Highlands, The Coast, Provincial Councils, The Grain Dole, The Waterworks, The Harbour Cities, The Terraces of Moray, The Milestones, The Teeming Realm, The Burghers.
- **Tier III (31).** Military (2): The Trained Bands, The Stationes. Economic (18): Seasonal Levies, The Long Tending, The Polders, The Raising of the Land, Old Workings, The Freedom of the City, Plenty, The Water Courts, The Coming of the Water, The Mill Wheels, The Topping Out, The Mit'a, The Slack Season, The Quitrents, The Tax Rolls, The Opening of the Roads, The Great Colonies, The Cura Aquarum. Civic (9): The Mountain Schools, A Court of Engineers, The Royal Forests, The Megalopolis, The Hallowed Woods, The Mountain Terraces, The Sovereign Writ, The Imperial Roads, The Capitolia. Wildcard (2): The Wide Country, The Age of Improvement.
- **Tier IV (18).** Military (2): The General Levy, The Theodosian Walls. Economic (9): The Keeps, The Garden of the World, The Corvée, The Master of Works, The Inheritance of Fields, The Great Migration, The Encroaching Fields, The Great Aqueducts, The Imperial Highways. Civic (4): The Philosophers' Peaks, The Measure of the Land, The Mother City, The Public Good. Wildcard (3): The Heartland, The Domesday Survey, The Two Harvests.

| Tier | Military | Economic | Civic | Wildcard | Seatable | Charters | Common / uncommon / rare |
|---|---|---|---|---|---|---|---|
| 0 | 1 | 7 | 5 | 0 | 13 | 1 | 9 / 3 / 1 |
| I | 1 | 12 | 9 | 2 | 24 | 2 | 13 / 11 / 0 |
| II | 1 | 14 | 10 | 0 | 25 | 0 | 7 / 17 / 1 |
| III | 2 | 18 | 9 | 2 | 31 | 0 | 4 / 14 / 13 |
| IV | 2 | 9 | 4 | 3 | 18 | 0 | 0 / 4 / 14 |
| **All** | **7** | **60** | **37** | **7** | **111** | **3** | **33 / 49 / 29** |

- **By status (seatable)** (revised 2026-10-21, section 11): 86 kept, 3 revised by your comments (Plenty, Veteran Colonies, The Mountain Schools), 12 reworked, 10 new. The 3 charters: The Fish Traps and The Wild Orchards are kept, and The Burning Season is revised.
- **Before this pass:** 117 seatable cards, of which 77 were Economic (66%), 28 Civic, 6 Military and 6 Wildcard. Now 111, of which 60 are Economic (54%), 37 Civic, 7 Military and 7 Wildcard (revised 2026-10-21, section 11).
- **Every government has something to seat** at every tier in its Economic and Civic chairs. Military chairs lean on the partner deck: Expansionist has one Military card at each of Tiers 0 to II and two at Tiers III and IV, so War Chief, Tyranny, Imperium and the Sultanate take most of their Military cards from the partner. That was so before this pass (your question 2 of 2026-10-16, deferred). Tier II has no Wildcard card, which costs nothing, because a Wildcard chair takes any card.

## 9. The checks

- **Themes beat a pile.** Each theme has flats, a multiplier on them, and a capstone:
  - the raised land: Smallholdings, The Three Sisters, The Highlands; Dark Earth, The Old Fields; The Age of Improvement;
  - the frontier: The Road Towns, The Wild Marches, Provincial Councils; The Book of Settlements, The Quiet Provinces; The Imperial Roads, The Great Colonies;
  - public works: The Horrea, The Public Fountains, The Engineers' Yards; The Aediles, The Mill Wheels, The Public Good; The Cura Aquarum;
  - the militia: The Burhs; Watch and Ward, The Stationes; and no capstone since Home for the Harvest's cut (revised 2026-10-21, section 11). Veteran Colonies does its job for every soldier.
- **Several routes.** Any two cards start a theme: Smallholdings and Dark Earth; The Seed Grain and The Founding Furrow; The Horrea and The Aediles; The Frontier Militia and The Burhs. The engine starts with Levy of the Land or any card that grants a levy use.
- **Every card has a home:** four themes and 22 glue cards (20%), with 14 bridge cards (revised 2026-10-21, section 11: 17 before; The Garden Frontier, The Builders' Levy, The Common Domain and Home for the Harvest were bridges, and Veteran Colonies becomes one).
- **The essentials along the way.** By Tier II:
  - the raised land: production (The Three Sisters, The Tended Country), science (The Rope Stretchers, The Highlands), culture (The Old Songs, The Forest Keepers, The Coast);
  - the frontier: production (The Hard Country, The Road Towns, The Book of Settlements), science (The Naturalists), culture (The Founding Furrow, The Wild Marches, The Milestones);
  - public works: production (The Engineers' Yards, and The Many Hands toward empire buildings; revised 2026-10-21, section 11: The Builders' Levy is cut), culture (The Aediles), and science only from the shared Hydraulic Schools or the glue (The Teeming Realm) until The Public Good at Tier IV;
  - the militia: production toward walls (The Burhs), and science and culture only from the glue (The Labour Feasts, The Teeming Realm). It is the small theme, and it leans on the engine.
- **The deck's own yield stays a minority** (revised 2026-10-21, section 11): 23 of 111 seatable cards pay food (21%), against 29 of 117 (25%) before; Veteran Colonies now pays a citizen, not food. Production is the most common pay: 34 cards (31%), against 45 (38%); The Builders' Levy is cut. Food or production: 50 (45%), against 65 (56%). Science: 12 (11%), against 8. Culture: 18 (16%), against 12. Happiness or authority: 11.
- **Areas:** five of five. Great people only through the engineers and the trades, since the wonders left.
- **Commissions:** five, and all five now leave an institution.
- **The cost shows** in the founding and claiming cards, The Land Hunger, the late answers to a full map, and the citizens every levy spends.
- **No new input.** Every card is automatic or uses founding, growing, working and improving land, building, a levy, disbanding, or a great engineer's act. The four cards that waited on a UX decision are answered: The Marl Pits is automatic, The Two Harvests is a rule, and Public Works and The Beating of the Bounds are cut (revised 2026-10-21, section 11: this pass had reworded The Beating of the Bounds, and you removed it). The Deep Workings, which also needed a new worker order, is cut.
- **The splits are followed:**
  - wonders: none left (ruling 3);
  - empire buildings: three cards, all scaled by towns (ruling 5; revised 2026-10-21, section 11: The Builders' Levy is cut);
  - population: Expansionist spends citizens and grows many towns. One great city is Scientific's, so The Polis is cut and The Mother City reads towns founded;
  - authority and happiness: through worked land, roads and public works;
  - ranks: one card, The Trained Bands, on levied units only.
- **Where the pass falls short:**
  - Every number is a guess; nothing is measured. Bots never levy, so the engine cannot be measured until they do.
  - The deck is still 54% Economic, and Military chairs lean on the partner.
  - The raised land and the frontier are large (33 and 30 cards); the militia is small (8) and has no capstone (revised 2026-10-21, section 11).
  - Production is still the most common pay.
  - Tier IV has four Civic cards, so the Curia's four Civic chairs lean on carried cards (The Teeming Realm, The Capitolia).
  - The Cura Aquarum is the largest piece of new engine work.
  - Doctrines are not in this pass.

## 10. Open questions for the user

1. **The engine and four themes as written:** citizens and the levy as the engine; the raised land, the frontier, public works and the militia as the themes. *Recommended: yes.*
2. **Expansionist's science and culture** (`deck-design.md`, open question 3, and the builds' question 1): drop the gap rule. The deck reaches both at about the median, from land and from its people, and both stall when room runs out. *Recommended: yes.*
3. **"Public works" as a card word:** a marker on the Granary, Aqueduct, Watermill, Harbour, Public Bath and Cistern, read by The Aediles and The Public Good. *Recommended: yes.* Say if the Lighthouse or the Workshop should join.
4. **The wonder cards:** The Pyramid Builders and The Landscape Garden are cut; The Builders' Levy and The Topping Out now serve empire buildings (revised 2026-10-21, section 11: The Builders' Levy is cut). Offered to the Magisterial pass: The Pyramid Builders (production toward wonders in the capital), The Topping Out's wonder version, and a tile beside a wonder that pays culture. The Opus cards stay, because the Opus is not a wonder. *Recommended: yes.*
5. **The four UX questions of the triage,** answered with no new input: The Marl Pits becomes automatic and The Deep Workings is cut; The Two Harvests becomes a rule; The Beating of the Bounds drops "of your choice"; Public Works is cut. *Recommended: yes.* Revised 2026-10-21 (section 11): The Beating of the Bounds is cut.
6. **Commissions leave institutions:** Six Gardens, Break the Sod, The Wide Country and The Domesday Survey, with the Domesday goal lowered to 120 hexes and 40 tiles. *Recommended: yes.*
7. **Three new rule-breakers:** The Cura Aquarum (joined towns count as having an Aqueduct), Home for the Harvest (a levied soldier comes home), The Two Harvests (the field counts as tended). *Recommended: yes to all three.* Revised 2026-10-21 (section 11): Home for the Harvest is cut, and Veteran Colonies returns a citizen for any soldier.
8. **The reworks of live cards:** The Rope Stretchers (science), The Teeming Realm (science and culture), The Milestones (gold and culture), The Measure of the Land (science), The Mother City (towns founded). *Recommended: yes.* The first four move the pay away from production and read what they read before. The Mother City reads towns founded instead of a big capital.
9. **The twelve cuts** in section 8, with their rows retired. *Recommended: yes.* Revised 2026-10-21 (section 11): seventeen cuts now, fifteen of them with a row to retire.
10. **The militia as a small fourth theme,** against folding its cards into the engine. *Recommended: keep it.* It reaches the army and gives the deck's Military cards a home.
11. **The candidate feature, a town's age** (section 6). *Recommended: not now,* unless the Magisterial or Devotion pass wants it.

After your answers: every card onto the sheet as `add` and `modify` rows, then the triage for the build. The triage is `docs/plans/expansionist-themes-triage.md` (batches E7 to E13).

## 11. Rulings on the review page, 2026-10-21

The user commented on 10 rows of the review page (version 8, built from commit `4aa4be29`), then: *"ok, i commented on the expanionist themes, you can fold those into the expansionist doc, queue up the changes."* The comments are verbatim. A reading marked "to confirm" is the build's until the user changes it.

| Card | The user | What changes |
|---|---|---|
| Plenty (III) | *"revise to five times"* | A town that grows gains production equal to five times its new population, not eight. |
| The Burning Season (I, charter) | *"doesn't have to be wild. any grassland or plains get +1 food when burned"* | Workers may burn any grassland or plains hex, not only a wild one. **Reading, to confirm:** on a hex that holds an improvement, the burn keeps the improvement and adds +1 food as a lasting mark on the hex (batch E3's hex mark, as The Coming of the Water uses), so no work replaces another. On a hex with no improvement it is the tended work it is today. |
| The Beating of the Bounds (0) | *"remove"* | Cut. |
| The Garden Frontier (I) | *"remove, cities should only be able to work within 3 hexes"* | Cut. **Question:** the reason also touches The Common Domain (towns of ten may work one hex beyond their normal radius). Answered: see "Answered 2026-10-21" below. |
| The Land Hunger (I) | *"revise: build settlers 25% faster, settlers have +1 movement"* | New text: "While another empire holds more towns than you, your towns build settlers 25% faster, and your settlers gain +1 movement." **Reading, to confirm:** the condition stays, because it is the card's idea; only the pay changes. |
| The Mountain Schools (III) | *"towns with 2 mountain tiles (besides a mountain is too stringent)"* | The town half reads "Towns with at least two mountains in their borders gain +15% science." **Reading, to confirm:** the second half (mines and quarries beside a mountain gain +2 science) is unchanged. |
| The Mother City (IV) | *"late game, +5% culture and production is a better bonus."* | New text: "Your capital gains +5% production and +5% culture for each town you have founded this game." **Reading, to confirm:** still the capital, still per town founded, with no cap. The alternative is a cap such as +50%. |
| The Measure of the Land (IV) | *"at most +10"* | The cap rises from +6 to +10 science in each town. |
| The Builders' Levy (I) | *"too similar to levy of the land, lets just keep levy of the land"* | Cut. Levy of the Land stays. Public works lose their levy use; the levy's empire-building target goes with it. |
| Veteran Colonies (II) | *"town gains +1 population"* | New text: "A military unit standing in one of your towns may retire there: the unit is removed and the town gains one citizen." The food equal to the unit's cost goes. |

### What the rulings leave

- **The questions in section 10:** the user answered none of them one by one and said to queue the changes. **Reading, to confirm:** every recommendation in section 10 stands.
- **Cuts:** three more (The Beating of the Bounds, The Garden Frontier, The Builders' Levy), so 15 in all.
- **Public works** keep empire buildings through The Many Hands, The Topping Out and The Capitolia, but no longer have a levy use.
- **The militia's capstone** gains a partner: with Veteran Colonies paying a citizen, Home for the Harvest and Veteran Colonies both return citizens from soldiers. **Question:** the two now overlap. Keep both, or cut one? Answered: see "Answered 2026-10-21" below.
- **Open question:** The Common Domain, against the user's "cities should only be able to work within 3 hexes". Answered: see "Answered 2026-10-21" below.

### Answered 2026-10-21

The user, on the two questions above, verbatim: *"let's cut common domain. cut one of veteran colonies and home for harvest."*

- **The Common Domain is cut.** Its data row retires with the other cuts.
- **Home for the Harvest is cut, and Veteran Colonies stays.** The orchestrator chose which. Veteran Colonies is built, it is the broader card (any military unit retired in one of your towns gives that town a citizen), and its new text is the user's own revision. Home for the Harvest was a new shape for a narrower case (units a levy raised).
- **So:** 17 cuts in all, of which 15 have a data row to retire. The deck holds 111 seatable cards and 3 charters. The militia has no capstone, and the disband rider for a unit a levy raised is no longer needed. Sections 2 to 10 carry both cuts.
