# Expansionist: the improvement build, and the tall and wide builds with their flavours (proposal)

**Status:** second draft, 2026-10-16, rewritten around the user's two passes on the first (the rulings at the end of this file, verbatim). Nothing here is built, and the deck sheet (`docs/decks/expansionist.md`) is unchanged. Once the user rules, the builds go into the skill's deck map (`.claude/skills/card-design/references/deck-maps.md`) and the Type column goes onto the sheet.

**The sheet:** since 2026-10-16 every card of these builds is on the deck sheet, `docs/decks/expansionist.md`, which is the spec of record for card text, status and type. This file keeps the reasoning behind the builds.

The user's request that started the pass, 2026-10-16, verbatim:

> *"ok, i'm feeling much better about the dominion deck. Could you do a similar pass as everything we did for the dominion deck for the expansionist deck? Start by analyzing the themes and playstyles for the deck, then create five 'builds' for the early and late game. Sort all existing cards into military/economic/civic/wildcard."*

The method is the one the user approved for Dominion (`docs/plans/dominion-builds.md`) and the card-design skill's "Finished builds": one loop per build on a quantity the playstyle makes by itself, an early and a late version, an early scaler that carries over, a Tier III capstone and a moment, utility earned from the build's own quantity, and new cards wherever the sheet has a gap.

## What changed from the first draft

- **One improvement build.** The managed wild and the old fields merge into one build: slowly improving the empire's yields, iteratively, with workers and Orders. Improvements are the default engine.
  - The old fields' cards that did not serve that vision moved out: the engineers to the great works, mountain science to the highlands, and a chop and a lump left the build. The Rope Stretchers becomes a yield.
  - Its new cards raise tiles: workers marl farms and deepen mines, and late the bonuses Orders put on improved tiles are doubled.
- **Tended land is a splash** any seat can dip into beside improvements, not a build.
- **The tall build** is the great city with the people's levy folded in: core cards, and three flavours: **the waterworks**, **the great works** and **the breadbasket**.
- **The wide build** is the open frontier: core cards, and three flavours: **the highlands**, **the well-ordered realm** and **the road network**.
- **Flexing** between wide and tall has its own bridge cards and a section on how a flex plays out over a game.
- Five cards of the first draft are dropped and one is renamed (see "The new cards, by tier").

## How to read this

- **Chairs:** 3 at the start, 5 from draft 4, 8 from draft 18 (Tier II), 11 from draft 29 (Tier III). Tier IV cards open at draft 38.
- **The improvement build** has an early version (the eight chairs at the end of Tier II, with a **five-chair core** for Tier I) and a late version (eleven chairs of Tier III and IV cards plus one or two early cards that grew).
- **The tall and wide builds** are a core plus a flavour:
  - the core is about four cards early and six late; each flavour adds four early and five late;
  - so an early council is the core's four and the flavour's four (eight chairs), and a late council the core's six and the flavour's five (eleven); in the late council the core and the flavour each carry one early card;
  - each flavour lists its councils by name, so a reader sees, for example, the eleven chairs of a late waterworks city.
- **Status:** *live* (in the game; *built as* when it does something slightly different from the text), *deferred* (in the data, not dealt), *proposed* (the sheet's "Proposed revision" of 2026-10-13, not ruled on yet), **new** (this pass).
- **Shape:** *existing* names the effect kind that already says it; *new shape* says what is missing. The families are under "Across the builds".
- **Type:** Military, Economic, Civic or Wildcard, by `docs/plans/doctrines-governments-chairs.md` §4. New cards are typed in their tables, the sheet's cards in "The sort".
- **Chairs line:** typed chairs are built (batches C2a and C2b). Each council names the government that seats most of it. Every government but the Republic has a Military chair, so most councils give one or two chairs to the partner deck.
- **Charters take no chair.** The four tended-work unlocks are held, not seated.
- **Numbers are first guesses** against `.claude/skills/card-design/references/power-bar.md`. The user's priority is shape.

## Five facts that shape every build

1. **Tier 0 lasts about six drafts,** so an early council holds two Tier 0 cards, three at most.
2. **Capstones sit in Tier III.** Tier IV opens at draft 38 since 2026-10-15; how often seats reach it is not measured yet.
3. **The gap rule.** Expansionist takes science and culture only from terrain: science from mountains and hills, culture from wild land, old forest and coast (`docs/decks/deck-design.md`, "Avoid"). Each build reaches that terrain through its own quantity. The game adds a second route the rule allows, because the card pays happiness or authority and not science: spare happiness pays +10% science and culture at 5 points and +20% at 10, and spare authority the same on production and border growth (`meterEffectsOf` in `src/sim/meters.ts`, `meters.tiers` in `data/rules.json`). So the cards that raise the two limits are the deck's science and culture as much as its terrain cards are.
4. **Expansionist is almost all Economic.** 42 of its 62 cards are Economic and one is Military ("The sort"). A seat's Military chairs go to its partner unless a build brings its own; this pass adds four Military cards where they fit.
5. **The measurements under-read this deck.** The per-turn ghost diff cannot see a founding, a worker charge, renown or food kept: The Seed Grain, The Beating of the Bounds, Tinkers' Guild and The Master Builders read 0, and The Patient Harvest −0.7 (`docs/plans/card-measurements-2026-10-13.md`). Bots do not levy (`docs/README.md`), so the breadbasket cannot be measured until they do.

## The builds at a glance

| Build | The loop | The moment | Early scaler | Tier III capstone | Tier IV |
|---|---|---|---|---|---|
| **The improvement build** | a worker raises a work → Orders make every work of its kind pay more, and older works more still → the surplus grows towns and trains workers → raise the next | a tile raised; a work coming of age | The Old Fields | The Age of Improvement | The Heartland, The Two Harvests |
| **Tall: the waterworks** | bring water → watered farms feed and watered towns stay content → towns grow → carry the water further | water arriving: an Aqueduct finished | Hydraulic Schools | The Water Courts | The Great Aqueducts |
| **Tall: the great works** | big towns pour production into wonders → renown calls engineers and a finished wonder pays the next → engineers raise the land and rush the next work | a wonder finished; an engineer called | The Engineers' Yards | The Raising of the Land | The Master of Works |
| **Tall: the breadbasket** | grow food beyond need → spend citizens on levies → the levy leaves food and the town regrows → spend again | the harvest: every town levies at once | Levy of the Land | The Mit'a | The Corvée |
| **Wide: the highlands** | settle the hills and the hard country → hill mines and mountains pay science → the science opens the next seams → settle further up | a seam surfaced | The Highlands | The Mountain Terraces | The Philosophers' Peaks |
| **Wide: the well-ordered realm** | develop towns so they cost less → spare authority pays production and border growth → the realm grows → found the next town with room to spare | the census | The Quiet Provinces | The Sovereign Writ | The Domesday Survey |
| **Wide: the road network** | found towns joined by road → connected towns pay and cost less → the roads carry the empire → found along the road | a town joined to the capital | The Milestones | The Imperial Roads | The Imperial Highways |

The tall core adds The Great Households (scaler) and The Megalopolis (rule-breaker); the wide core adds The Book of Settlements (scaler) and The Staked Claims (moment).

---

## Themes and playstyles

### The deck's materials

"Self-producing" means an Expansionist game makes it whether or not a card asks. These are the best anchors.

| Material | Self-producing? | Where it lives in the sim | On the sheet today |
|---|---|---|---|
| **Citizens and growth** | Yes | `City.population`; the `growth` occasion (`settleGrowth`), filterable by `atPopulation`; counts `population`, `capitalPopulation`; scopes `populationAtLeast`/`AtMost`. Each citizen also pays half a science (`cities.sciencePerPop`). | about fifteen cards raise food or citizens; five read citizens |
| **Levies** (a citizen spent) | Only once a card grants a use | `levies.ts`: `levyCitizen`, uses `production`, `muster`, `opus`, `conscript`; one levy per town every five turns from `City.levy.turn`; the `levy` effect's `after` | four cards grant a use; one reads a levy (Seasonal Levies) |
| **Towns founded** | Yes, mostly in age 1 | `foundCityAt` and the `found` occasion; `foundingRider` (citizens, a building, a road home, claims); the `newest` scope | three cards raise it; only Daughter Towns reads it, as towns under five citizens |
| **Hexes owned** | Yes: borders grow | `tilesInBorders` with a tile test; `City.tilesClaimed`; `purchaseTileAt` (`tilePurchase` occasion, `hexBought` tally, `Player.tilesPurchased`) | read by The Naturalists (hills and mountains only), then not until Tier IV |
| **Improvements and their age** | Yes | `Tile.improvement`, `Tile.improvedOn` (read by the `standingSince` test); the `improvementBuilt` occasion, live since batch S | read well: Smallholdings, Dark Earth, The Highlands and nine more |
| **Water** | From the map | fresh water (rivers, lakes, the oasis and floodplain features); a farm off grassland or plains, and the Irrigation upgrade (+1 food), need it (`data/improvements.json`) | Sweet Water, The Watercourses, The Waterworks, Hydraulic Schools |
| **Wild and tended land** | Wild land yes, early; tended once a charter is held | the `unimproved` and `tended` tests; `workedUnimprovedTiles`; the `needsTendedWork` deal gate | four charters raise it; about ten cards read it |
| **Hills, mountains and the hard country** | From the map | the `hills` flag; mountains are unworkable (`data/terrain.json`); seams lie only under hills (`veins.ts`); desert, tundra and snow; there is no marsh | The Naturalists, The Hard Country, The Highlands, The Mountain Schools, The Philosophers' Peaks |
| **Happiness and authority** | The limits every empire meets | `meters.ts`: each citizen asks 1 happiness; authority is 6 from the palace and 2 an age, and a founded town costs 3; a deficit stifles growth or freezes borders; spare points pay the tiers in fact 3 above | Civic cards: The Commons, The Local Census, Provincial Councils, The Grain Dole, The Waterworks |
| **Roads and connected towns** | Partly | `Tile.road` has two writers (`roads.ts`): a caravan's route, and a founding rider's road home. Workers do not build roads. The `connected` scope; `roadHexes` | Provincial Councils; Pachacuti's ability |
| **Wonders, engineers and manufactories** | With production and renown | wonder rows in `data/buildings.json`; the `greatPersonAct` occasion; Rush the Works pays 40 hammers × the age (`engineerHammers`); a Manufactory pays +3 production | The Master Builders, The Engineers' Yards, A Court of Engineers, The Master of Works |
| **The census** | The world takes one every 13 to 17 turns | `census.ts`; the `censusTaken` occasion in `occasions.ts`, read today by beads and Triumphs, not by cards | none |

### Three builds and six flavours

Each row is a section below, and the sources are its cards.

| Build or flavour | Leans on | Science from | Culture from | Production from |
|---|---|---|---|---|
| **The improvement build** | improvements, their age, tiles raised by workers | hill mines and quarries (The Highlands) | old lumber mills (The Forest Keepers, The Royal Forests) | works and their age (The Rope Stretchers, The Old Fields, Old Workings, The Deep Workings, The Manors) |
| **Tall: the core** | citizens, food, happiness | citizens; mountain towns (The Mountain Schools); the happiness tier (The Megalopolis) | the happiness tier | citizens (The Great Households, The Mother City); milestones (The Freedom of the City) |
| **Tall: the waterworks** | fresh water, irrigation, aqueducts | mountain aqueduct towns (Hydraulic Schools) | the happiness tier (The Public Fountains) | watered farms (The Watercourses); mills (The Mill Wheels) |
| **Tall: the great works** | wonders, engineers, manufactories | wonders' own | wonders' own | wonders and engineers (The Pyramid Builders, The Topping Out, The Raising of the Land) |
| **Tall: the breadbasket** | food stored, citizens spent | levies in mountain towns (The Terraces of Moray, an alternative) | wild land after a levy (The Labour Feasts) | levies (Levy of the Land, The Mit'a, The Corvée); regrowth (Granary Levies) |
| **Wide: the core** | towns founded, hexes owned | the flavour's | wild hexes owned (The Wild Marches); wild towns (The Hallowed Woods) | towns founded (The Book of Settlements); hexes owned (The Measure of the Land) |
| **Wide: the highlands** | hills, mountains, desert, tundra | hill works, mountains, seams (The Naturalists, The Highlands, The Assay Office, The Mountain Terraces) | the core's | the hard country (The Hard Country), seams (The Prospectors) |
| **Wide: the well-ordered realm** | spare authority, the census | the core's | the core's | the authority tier (The Quiet Provinces, The Sovereign Writ) |
| **Wide: the road network** | roads, connected towns | the core's | Monuments on the road (Garden Provinces) | connected towns and roads (The Road Towns, The Milestones) |

### How the deck pairs with the other five

The currency test (`deck-design.md`): Expansionist makes food and land and spends them on citizens and claims.
- **Dominion** (Mithridates VI): the frontier. Citizens become soldiers (the shared The Muster of the Fields, The General Levy, The Trained Bands), and authority relief holds conquests (The Imperial Roads). Dominion gives back cleared ground (The Barbarian Frontier) and the Military cards for the chairs Expansionist cannot fill. Best with the breadbasket (the endless host), the well-ordered realm and the road network. Shared: Military Colonies, The Muster of the Fields, The Barbarian Frontier, The Road Garrisons, Marcher Lords.
- **Commerce** (Pachacuti): the land and the market. Its caravans lay the roads the road network runs on; gold buys hexes and settlers; land pays gold back (The Quitrents, The Tax Rolls; Commerce's own Ore Caravans, The Customs Houses and The Merchant Dynasties count hexes owned). Best with the road network, the well-ordered realm and the improvement build. Shared: Market Gardens, The Grain Exchange, The Provincial Fair.
- **Devotion** (no leader): wild land and faith. The tended splash pays faith (The Spirits of Place, Sacred Groves, The Flood Festival), and big towns hold more followers. Best with the tall core and the splash. Shared: Sacred Groves, The Flood Festival.
- **Scientific** (Nezahualcoyotl): the engineers. The most direct cover for the science gap; its charters bring public works early. Best with the waterworks, the highlands and the improvement build. Shared: Hydraulic Schools.
- **Magisterial** (no leader): shaping territory. It covers the culture gap, and wonders and great-person works are its ground as well as the great works'. Best with the great works and the splash. Shared: Garden Cities, Garden Provinces, The Sculpted Landscape.

### Leaders

- **Mithridates VI** (Dominion, Expansionist): +2 strength against an empire holding more cities; +2 food on plantations and camps. The plantations and camps make him an improvement-build leader, and the small-empire strength suits a tall seat (The Polis).
- **Pachacuti** (Expansionist, Commerce): connected towns pay +1 happiness and +1 production; farms pay +1 gold per mountain beside them; terraces. He leads the road network and the highlands, and by history the breadbasket (the mit'a was Inca).
- **Nezahualcoyotl** (Expansionist, Scientific): aqueduct towns pay culture and their farms production; a big capital pays culture. He leads the waterworks and the tall core.
- Every build now has a leader; the great works and the well-ordered realm have one only through the tall and wide cores.

### Where the sheet is thin

- **By tier:**
  - Tier 0 has no culture card and no Military card, and one rare (The Patient Harvest).
  - Tier I has no rare. Levy of the Land is the one card that changes what a player does (the charters too, but they take no chair).
  - Tier III has nine cards and three are deferred: six dealt cards for the band that fills eleven chairs.
  - Tier IV holds most of the deck's readers of land and citizens (The Measure of the Land, The Mother City, The Land's Great Work), too late to build around.
- **By role:**
  - No grower and no "this game" count anywhere, so nothing early carries into the late game.
  - The deck's own payouts on moments are two, Granary Levies (growth) and The Woodwrights (chops); the shared The Flood Festival adds a third. Nothing pays on a founding, a levy, a tile raised, a hex claimed, a wonder finished, a census or a town joined by road.
  - Raisers outnumber readers: about fifteen cards raise food and citizens and five read citizens; four grant a levy and one reads it; three raise foundings and only Daughter Towns reads them.
  - Glue is the largest share: flats on terrain and improvements. Measured, they pay well: The Hard Country 137 a turn (Tier I) and The Highlands 265 (Tier II, the fourth best card in the bot games); the shared Marcher Lords paid 279, the second best.
  - The wide empire has no road card and no card that rewards spare authority.
- **The user's playtest** (Mithridates, 2026-10-12): The Fish Traps and Sacred Groves "very good", Levy of the Land *"soooo good, great card"*, Six Gardens "not very good", and midgame options did not feel impactful.

---

## 1. The improvement build

**The fantasy.** England's open fields and the improvers who came after them, the terraces of the Andes, the basin farms of the Nile: an empire that gets a little richer every decade, field by field. A worker raises a work; each Order seated makes a kind of work pay more; the oldest works pay most; and late, everything the cards put on the land pays twice. In the user's words, *"iteratively improving your land with workers and orders"*.

**The loop:** a worker raises a work → Orders make every work of its kind pay more, and older works more still → the surplus grows towns and trains workers → raise the next.
- **The quantity:** improvements worked, and their age (`Tile.improvedOn`, read by `standingSince`). Every empire builds them.
- **The moment:** a tile raised by a worker (The Marl Pits, The Deep Workings), and a work coming of age (Dark Earth at 20 and 50 turns, Old Workings at 20).
- **What it spends:** time. A work pays late, and a work replaced starts its age again.

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| Smallholdings | 0 | common | Worked farms and pastures gain +1 food and +1 gold. | foundation glue | reads farms and pastures | food, gold | Economic | live |
| The Rope Stretchers | 0 | common | Worked mines, quarries and lumber mills gain +1 production. | opener | reads mines, quarries and mills | production | Economic | deferred; revised from a lump on a finished work into a yield; existing (hex `pays`) |
| Dark Earth | I | uncommon | Worked farms gain +2 food once they have stood 20 turns, and +2 more at 50. | pay-off: age | reads farms' age | food | Economic | live |
| The Marl Pits | I | uncommon | Your workers may marl a worked farm or pasture for one charge. A marled tile gains +1 food for the rest of the game, and can be marled twice. | changes what the player does | raises tiles | food | Economic | **new**; new shape (a lasting mark on a tile, written by a worker) |
| The Forest Keepers | I | common | Lumber mills that have stood for twenty turns gain +2 culture. | utility: culture | reads mills' age | culture | Civic | **new**; existing (hex `pays` on a lumber mill and `standingSince`) |
| The Three Sisters | I | common | Worked farms beside a plantation or a pasture gain +2 food and +2 production, once per farm. | pay-off: neighbours | reads farms by herds and orchards | food, production | Economic | live |
| The Old Fields | II | uncommon | +1% food and production for every three works that have stood thirty turns, at most +30%. | early scaler | reads old works | food, production | Economic | **new**; existing (empire `pays` count, `tilesInBorders` with `improved` and `standingSince`) |
| The Highlands | II | common | Mines and quarries on hills gain +2 science and +1 production. | utility: science | reads hill works | science | Civic | live; 265 a turn measured |

- **Five-chair core** (Tier I): Smallholdings, The Rope Stretchers, Dark Earth, The Marl Pits, The Forest Keepers.
- **Chairs:** the Republic seats the whole core (The Forest Keepers in its Civic chair); the Merchant League seats seven of the eight.
- **Sizing:**
  - **The Rope Stretchers:** four mines and quarries by turn 40 pay +4 production, band 0's regular card.
  - **The Marl Pits:** one charge raises a farm by +1 food for good, which is a second farm's yield on the same hex. Ten marls by turn 100 add +10 food, and none of it fades.
  - **The Old Fields:** about +10% when Tier II opens (thirty works older than thirty turns), about 25 food and production a turn; about +23% by turn 160, about 200 a turn in age 4.
  - **The Forest Keepers:** six mills raised by turn 70 pay +12 culture by turn 90, half a seat's culture then.
- **How a few turns feel:**
  - Turn 25: a worker builds a mine on the capital's hill, and The Rope Stretchers adds +1. The river farms start their first twenty years.
  - Turn 70: two workers go back over the oldest farms with marl, and Dark Earth's first +2 lands in the same decade.
  - Turn 130: every kind of work pays a little more than it did: farms by age and marl, mines by the hills, mills in culture. The Old Fields reads +12%.
- **Also fits:** The Prospectors, Tinkers' Guild; The Plough Teams and Commission: Break the Sod (proposed); The Hedgerows (the proposed split of The Tended Country); The Watercourses, The Engineers' Yards, Market Gardens, The Coast.

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Old Fields | II | uncommon | (above) | carried scaler | reads old works | food, production | Economic | **new** |
| The Highlands | II | common | (above) | carried | reads hill works | science | Civic | live |
| The Age of Improvement | III | rare | The bonuses your Orders give to improved tiles are doubled. | capstone: doubles a category | reads every Order's line on an improved tile | all yields on the land | Wildcard | **new**; nearly existing (`cardYieldAmplifier` at +100%, with a filter for lines on improved tiles) |
| The Deep Workings | III | uncommon | Your workers may deepen a worked mine, quarry or lumber mill for one charge. It gains +1 production for the rest of the game, and can be deepened twice. | the moment: a tile raised | raises tiles | production | Economic | **new**; new shape (the worker's lasting mark, as The Marl Pits) |
| Old Workings | III | common | Worked mines, quarries and lumber mills that have stood for twenty turns gain +3 production. | pay-off: age | reads works' age | production | Economic | proposed (from Tier II, resized); existing |
| The Manors | III | common | Each town gains +1 production for every two improved tiles in its borders. | pay-off: count | reads improved tiles | production | Economic | **new**; existing (city `pays` count, `tilesInBorders` with `improved`) |
| The Royal Forests | III | uncommon | Towns working at least three lumber mills gain +25% culture. | percentage on the flats | reads mill towns | culture | Civic | **new**; existing (`percentYields`, `workingTiles` scope) |
| The Inheritance of Fields | IV | uncommon | Works and tended tiles that have stood 60 turns gain +1 production; tended ones also gain +1 culture. | pay-off: age | reads age | production | Economic | live |
| The Two Harvests | IV | rare | Needs tended land. A worked farm, mine or lumber mill may also be tended, keeping both yields. | the splash, joined to the field | reads tended and improved tiles | food, production | Economic | deferred; new shape (a tile holding two works) |
| The Domesday Survey | IV | rare | Commission. Own 150 hexes and work 50 improved or tended tiles at once. Then production in the capital and a great engineer. | the late goal | reads works and hexes | production | Wildcard | live (built as) |
| The Heartland | IV | rare | Commission. One town works twelve improved or tended tiles that each yield 5 or more. Then that town costs no authority and gains +3 happiness and +20% food for good. | the late goal | reads raised tiles | authority, happiness | Wildcard | deferred (a lasting mark on one town) |

- **Carried over:** The Old Fields at +23% to +30%, and The Highlands, whose science grows with every hill mine.
- **The capstone, The Age of Improvement:** every bonus an Order puts on an improved tile pays twice, from Smallholdings and Dark Earth to The Highlands and Old Workings. It is the build's whole fantasy at full size: the field improved all game now yields double what the cards made of it. It is a Wildcard, since it acts on other cards.
- **The moment:** a tile raised. The Deep Workings sends workers back to the mines, and The Heartland's goal (one town's twelve tiles raised to five yield each) is the deck's own victory idea from `deck-design.md`, "cultivate a heartland".
- **Sizing:**
  - **The Age of Improvement:** a late improvement seat puts about +4 yield from cards on each of eighty improved tiles, so the card adds about 320 a turn: band 3's headline, and a rare.
  - **Old Workings:** 25 works older than twenty turns pay +75 production, band 3's regular card.
  - **The Royal Forests:** +25% on four mill towns is about 40 culture a turn, below the bar; that is the culture gap, and it multiplies the flats the build already has.
- **How a few turns feel:**
  - Turn 160: The Age of Improvement is seated, and the yield lens shows every farm and mine paying its card lines twice.
  - Turn 175: workers deepen the hill mines a second time. The river town's twelfth tile reaches 5 yield, and The Heartland is met.
  - Turn 190 (Tier IV): The Two Harvests tends the oldest farms too, and the sixty-turn works add +1 production each.
- **Chairs:** the Estates seat nine; the two Military chairs go to the partner.
- **Without Tier IV,** The Three Sisters, The Forest Keepers and The Marl Pits hold the chairs, and the build keeps its capstone.
- **Also fits:** The Raising of the Land (great works), The Coming of the Water (waterworks), The Mountain Schools (highlands), The Prospectors.

- **Utility mix:** production (The Rope Stretchers, The Old Fields, Old Workings, The Deep Workings, The Manors, The Inheritance of Fields); science (The Highlands); culture (The Forest Keepers, The Royal Forests); food and gold (Smallholdings, Dark Earth, The Marl Pits).
- **Gives up:** tempo, flexibility, and wild-land culture unless it splashes tended land.
- **Partners:** Scientific (mines and quarries; charters bring improvements early); Commerce (the same mines pay gold there).
- **Leader:** Mithridates (plantations and camps pay food) and Pachacuti (farms beside mountains pay gold).

### Tended land, the splash

Tended land is no longer a build (ruled 2026-10-16). It is a splash any seat can add beside improvements.
- **How it starts:** four charters, which take no chair, open the tended works: The Forest Gardens and The Fish Traps (Tier 0), The Wild Orchards and The Burning Season (Tier I). Tended tiles still count as wild.
- **What it adds to the improvement build:** The Hedgerows (proposed: worked farms beside a tended tile gain +2 food), The Inheritance of Fields, and late The Two Harvests, which lets a farm or mine be tended as well.
- **What it adds to any build:** culture, faith and happiness from wild land, the deck's culture by the gap rule. The Old Songs (+2 culture on worked wild land), The Spirits of Place (faith), The Commons (happiness), and the shared Sacred Groves, The Flood Festival and Garden Cities.
- **What it adds to the wide build:** **The Garden Frontier** (new, Tier I, rare, Economic): *"Workers may tend unowned wild hexes up to two hexes beyond your borders. A hex tended there joins your nearest town."* It shares the claim-beyond-the-border shape with Outposts.
- **Its late cards:** The Long Tending, The Managed Wild (proposed, Tier III), The Garden of the World, and **The Fire Mosaic** (new, Tier III, uncommon, Economic): *"Once every twenty turns, each of your towns may burn: every wild grassland and plains hex in its borders becomes burned country at once."* It is the town's burning the user designed (question 4).
- **Six Gardens** (Tier I commission) stays in the splash with a new reward: culture equal to fifteen times the tended tiles you hold. The user found it weak, and its free Order hand can no longer be built now that reward hands are removed.

---

## 2. The tall build (the great city)

**The fantasy.** Babylon, Rome at a million, Chang'an, Tenochtitlan on its lake. A few towns grown huge, their people fed and content. Three ways to be a great city: the waterworks bring water to every field and fountain, the great works raise wonders and engineers, and the breadbasket grows food beyond need and spends it, with the people's levy.

**The loop:** feed a few towns → they grow → contentment keeps them growing, and a content empire learns (the +20% science and culture tier) → every citizen pays production → they grow further.
- **The quantity:** citizens per town, which every game grows and this build grows faster.
- **What it spends:** happiness (each citizen asks one), and land: it founds few towns.

### The core

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Patient Harvest | 0 | rare | Towns keep 30% of the food spent on growth, but build military units 15% more slowly. | opener with a drawback | raises growth | food | Economic | live; −0.7 measured (the reading sees the penalty, not the growth) |
| The Grain Census | I | uncommon | While seated, this card gains +1 production and +1 gold each time one of your towns grows past its largest size. It starts at +2 of each. | grower | reads growth | production, gold | Economic | **new**; new shape (a town's largest size, and a tally of growth past it) |
| The Grain Dole | II | common | Towns of at least ten citizens gain +4 happiness and keep 20% more of the food spent on growth. | pay-off: content | reads big towns | happiness | Civic | live (proposed trim: the happiness only) |
| The Great Households | II | uncommon | Each town gains +2% production for every citizen it has, at most +30%. | early scaler | reads citizens | production | Economic | proposed (from Tier III, resized); existing |

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Great Households | II | uncommon | (above) | carried scaler | reads citizens | production | Economic | proposed |
| The Megalopolis | III | rare | Citizens beyond the twelfth in any of your towns ask no happiness. | the core's rule-breaker | reads citizens | happiness | Civic | **new**; new shape (a cap on a town's demand, beside `freeCitizens`) | [too strong, revise: cities with 10+ population gain +1 science and +1 production for each population]
| The Freedom of the City | III | uncommon | The first time each of your towns reaches fifteen citizens, and again at twenty, it gains production equal to forty times its population. | the core's moment | reads growth | production | Economic | **new**; existing rider (`growth` with `atPopulation`) plus the largest-size mark, so a levy and a regrowth cannot pay twice |
| The Mountain Schools | III | uncommon | Towns beside a mountain gain +15% science. | percentage on the flats | reads mountain towns | science | Civic | live (proposed trim) |
| The Mother City | IV | rare | Your capital gains +1 production for every citizen it has. | finisher | reads the capital's citizens | production | Economic | live |
| The Land's Great Work | IV | rare | The town building the Magnum Opus gains +5% production toward it for every eight citizens you have, at most +40%. | finisher: the win | reads citizens | production toward the Opus | Economic | live (built as) |

- **Five-chair core** (Tier I): The Patient Harvest and The Grain Census, beside the flavour's Tier 0 card and two of its Tier I cards.
- **Sizing:**
  - **The Grain Census:** about +25 production and gold by turn 114, about +50 by turn 160.
  - **The Great Households:** +24% in a town of twelve, the cap at fifteen.
  - **The Megalopolis:** five towns of twenty save forty happiness, so the empire sits in its top tier (+20% science and culture) for good. A tall empire's science and culture come mostly from its citizens and that tier.
  - **The Freedom of the City:** 600 production at fifteen citizens and 800 at twenty; about ten milestones and 7,000 production over Tiers III and IV.
- **Alternatives:** The Polis (new, Tier I, rare, Economic): *"While you hold at most four towns, every town gains +25% food,"* for a seat that will stay small, and the card a flexing seat skips. The Harbour Cities (new, Tier II, common, Civic): *"Coastal towns gain +1 culture for every two citizens,"* for a coastal great city. Plenty (proposed). The Theodosian Walls (new, Tier IV, uncommon, Military): *"Your towns gain +1 defence for every citizen,"* to guard an Opus capital.

### The waterworks

**The fantasy.** Mesopotamia's canals, Rome's aqueducts, Persia's qanats, Valencia's water court. Water brought to every field and fountain, and towns that grow because they drink.
- **The loop:** bring water → watered farms feed and watered towns stay content → towns grow → carry the water further.
- **The moment:** water arriving. An Aqueduct opens, and every farm in its town is raised for good (The Coming of the Water).
- **The capstone:** The Water Courts. Water runs along any chain of your farms, so farms and the Irrigation upgrade spread from the river into dry country.

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| Sweet Water | 0 | common | Towns beside a river or lake gain +1 happiness. Worked freshwater tiles gain +1 food. | opener | raises food and happiness | food | Economic | live (proposed split: The Wellsprings takes the happiness) |
| The Public Fountains | I | common | Towns beside a river or lake gain +1 happiness for every four citizens, at most +3. | pay-off: content | reads citizens by fresh water | happiness | Civic | **new**; existing (`pays` count `population` to happiness, `freshwater` scope) |
| Hydraulic Schools | I | common | Towns with an Aqueduct gain +20% production toward science buildings. Those beside a mountain also gain +1 science for every three citizens. | utility: science | reads citizens by mountains | science | Civic | revised (shared with Scientific) |
| The Watercourses | II | uncommon | Worked farms on fresh water, or beside a farm that is, gain +2 production. | pay-off: irrigation | reads watered farms | production | Economic | live (built as) |

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| Hydraulic Schools | I | common | (above) | carried | reads citizens by mountains | science | Civic | revised |
| The Water Courts | III | rare | A farm joined to fresh water by a chain of your farms counts as having fresh water. | capstone: a broken rule | raises watered farms | food | Economic | **new**; new shape (water carried along farms; The Watercourses stops at one step) |
| The Coming of the Water | III | uncommon | When a town finishes an Aqueduct, every farm in its borders gains +1 food for the rest of the game. | the moment | raises tiles | food | Economic | **new**; new shape (the lasting mark on tiles) |
| The Mill Wheels | III | common | Towns with a Watermill gain +15% production. | percentage on the flats | reads mill towns | production | Economic | **new**; existing (`percentYields`, `hasBuilding` scope) |
| The Great Aqueducts | IV | rare | The town raising the Magnum Opus gains +5% production toward it for each of your towns with an Aqueduct, at most +40%. | finisher: the win | reads aqueduct towns | production toward the Opus | Economic | **new**; existing (`productionBonus` with a `buildingsOfKind` count) |

- **A waterworks city, early (8):** The Patient Harvest, The Grain Census, The Grain Dole, The Great Households; Sweet Water, The Public Fountains, Hydraulic Schools, The Watercourses. Five-chair core: The Patient Harvest, The Grain Census, Sweet Water, The Public Fountains, Hydraulic Schools. The Merchant League seats seven.
- **A waterworks city, late (11):** The Great Households, The Megalopolis, The Freedom of the City, The Mountain Schools, The Mother City, The Land's Great Work; Hydraulic Schools, The Water Courts, The Coming of the Water, The Mill Wheels, The Great Aqueducts. The Estates seat nine.
- **Sizing:**
  - **The Water Courts:** a farm off grassland or plains, and the Irrigation upgrade's +1 food, both need fresh water (`data/improvements.json`). Carried along a chain of farms, the river valley's farmland spreads into the plains and the desert beyond.
  - **The Coming of the Water:** a town of twenty working eight farms gains +8 food for good when its Aqueduct opens.
  - **The Great Aqueducts:** eight aqueduct towns give +40% toward the Opus.
- **How a few turns feel:**
  - Turn 30: the capital on its river works floodplain farms; Sweet Water feeds and calms it.
  - Turn 140: the Aqueduct opens in the river town, and its eight farms each gain +1 food for good.
  - Turn 170: a line of farms carries the river into the dry plains, and the first desert farms go in.
- **Also fits:** The Waterworks, The Coast, The Polders (reworked, see "Sheet cards no build uses").

### The great works

**The fantasy.** The pyramid builders, the cathedral masons, the engineers of Song China. The great city is where the wonders rise, and the engineers who raise them come back to raise the land around it.
- **The loop:** big towns pour production into wonders → renown calls engineers, and a finished wonder pays toward the next → engineers raise the land and rush the next work.
- **The moment:** a wonder finished (The Topping Out), or an engineer called.
- **The capstone:** The Raising of the Land, moved from Tier IV and triggered by the engineer's existing act, so it needs no new button.

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Pyramid Builders | 0 | common | +25% production toward wonders in your capital. | opener | raises wonders | production | Economic | **new**; existing (`productionBonus` toward wonders, `capital` scope) |
| The Master Builders | I | common | Towns working at least three mines, quarries or lumber mills give +1 renown a turn, favouring great engineers. | engine | raises engineers | renown | Civic | live |
| The Builders' Levy | I | uncommon | Towns may spend a citizen to send production equal to the food it took to grow it to a world wonder being built in another of your towns. | engine: the levy builds | raises wonders | production toward wonders | Economic | **new**; new shape (a levy use, The Corvée's for world wonders) |
| The Engineers' Yards | II | common | Manufactories gain +3 production. Worked farms, mines, quarries and lumber mills beside a manufactory gain +2 production. | pay-off | reads manufactories | production | Economic | live |

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Engineers' Yards | II | common | (above) | carried | reads manufactories | production | Economic | live |
| The Raising of the Land | III (from IV) | rare | When a great engineer rushes the works in one of your towns, every improved or tended tile in its borders gains +1 food and +1 production for the rest of the game. | capstone: the land raised for good | reads engineers' acts | food, production | Economic | deferred; revised to ride the existing act; new shape (the lasting mark on tiles) |
| A Court of Engineers | III | rare | Gain +50% renown, but great-person offers contain only great engineers. | engine | raises engineers | renown | Civic | live |
| The Topping Out | III | uncommon | Finishing a wonder grants that town production equal to twenty times its population. | the moment | reads wonders finished | production | Economic | **new**; nearly existing (a `completion` rider with `wonder`, if the completion carries the town's population) |
| The Master of Works | IV | rare | A great engineer's act pays 50% more. | finisher: the win | reads engineers' acts | production | Economic | live (built as) |

- **A wonder city, early (8):** the tall core's four; The Pyramid Builders, The Master Builders, The Builders' Levy, The Engineers' Yards. Five-chair core: The Patient Harvest, The Grain Census, The Pyramid Builders, The Master Builders, The Builders' Levy. The Merchant League seats seven.
- **A wonder city, late (11):** the tall core's six; The Engineers' Yards, The Raising of the Land, A Court of Engineers, The Topping Out, The Master of Works. The Estates seat nine.
- **Sizing:**
  - **The Builders' Levy:** a citizen at size ten sends 88 hammers (`growthThreshold(9)`) to the wonder town.
  - **The Topping Out:** a town of twenty that finishes a wonder gets 400 production toward its next build.
  - **The Raising of the Land:** each act raises a town of about twelve works by +1 food and +1 production each, for good, on top of the act's own 40 hammers × the age; with A Court of Engineers, one act every ten to fifteen turns.
- **How a few turns feel:**
  - Turn 30: the capital raises Stonehenge a quarter faster.
  - Turn 100: three towns send citizens into the capital's Colossus, and the mining towns' renown calls the first engineer.
  - Turn 165: the Hanging Gardens are topped out and 400 production goes straight into the next wonder. An engineer rushes it and raises the capital's land.
- **Also fits:** The Corvée (shared with the breadbasket), The Sculpted Landscape (Magisterial), Public Works (folded into The Raising of the Land).

### The breadbasket

**The fantasy.** Egypt's granaries, Rome's grain dole, the Inca storehouses. Food grown beyond what a town needs, stored, then spent: on hammers, soldiers, settlers and other towns' growth. The people's levy lives here, and it is the build for the card the user called *"soooo good"*.
- **The loop:** grow food beyond need → spend citizens on levies → the levy leaves food behind and the town regrows → spend again.
- **The moment:** the harvest. Every twentieth turn, after the harvest, every town may levy at once (The Slack Season).
- **The capstone:** The Mit'a. A levied citizen comes home twenty turns later, as the Inca turn of service did.

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| Granary Levies | 0 | common | When a town grows, gain 15 production. | opener: pays the regrowth | reads growth | production | Economic | live (proposed rename: The Granary Dues); its lumps paid 210 production over 14 growths in the bot games |
| Levy of the Land | I | uncommon | Towns may spend a citizen to gain production equal to the food it took to grow that citizen, once every five turns. | the action | raises levies | production | Economic | live |
| The Labour Feasts | I | uncommon | After a town spends a citizen on a levy, it gains +1 culture for every wild tile it works, for ten turns. At most once every ten turns. | utility: culture | reads levies | culture | Civic | **new**; existing (a levy's `after`, as Seasonal Levies) |
| The Breadbasket | II | uncommon | A town told to stop growing adds its food surplus to its production. | pay-off: food stored and spent | reads surplus food | production | Economic | deferred; reworked to one effect; new shape (a stopped town keeps working its food) |

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| Levy of the Land | I | uncommon | (above) | carried: the action (a levy use needs its card seated) | raises levies | production | Economic | live |
| The Mit'a | III | rare | A citizen spent on a levy returns to its town twenty turns later. | capstone: a broken rule | reads levies | citizens | Economic | **new**; new shape (a citizen returned at a stated turn, recorded on the town; it is not growth) |
| The Slack Season | III | uncommon | Every twentieth turn, after the harvest, your towns may levy whatever their wait. | the moment | raises levies | — | Economic | **new**; new shape (a turn on which the levy wait is lifted) |
| Seasonal Levies | III | uncommon | After a town spends a citizen on a levy, it gains +60% food for ten turns. At most once every twenty turns. | pay-off: regrow | reads levies | food | Economic | live |
| The Corvée | IV | rare | While a town builds the Magnum Opus, your other towns of at least ten citizens may spend a citizen to send it production equal to the food it took to grow. | finisher: the win | raises levies | production toward the Opus | Economic | live |

- **A breadbasket, early (8):** the tall core's four; Granary Levies, Levy of the Land, The Labour Feasts, The Breadbasket. Five-chair core: The Patient Harvest, The Grain Census, Granary Levies, Levy of the Land, The Labour Feasts. The Merchant League seats seven.
- **A breadbasket, late (11):** the tall core's six; Levy of the Land, The Mit'a, The Slack Season, Seasonal Levies, The Corvée. The Estates seat nine.
- **Sizing:**
  - **Levy of the Land:** a levy at size eight pays 65 hammers (`growthThreshold(7)`), about five turns of an age 2 town's production.
  - **The Mit'a:** a levy at size ten pays 88 hammers and costs nothing in the long run, about 18 production a turn per town from levies alone.
  - **The Slack Season:** ten towns of ten citizens levy at once for about 900 production, or ten soldiers: band 3's registering lump.
- **How a few turns feel:**
  - Turn 70: five towns take turns. One levies 60 hammers into a Market, one musters a Swordsman, one stops growing and turns its surplus into a settler. Granary Levies pays for every regrowth.
  - Turn 160: the slack season. Eight towns levy at once into a Forge, a wonder and three Pikemen.
  - Turn 180: the citizens levied at turn 160 come home, and the towns are back at size before the next harvest.
- **Also fits:**
  - more levies: The Gleaners (proposed), The Work Gangs (new, Tier 0, common, Economic: *"Towns of at least three citizens may spend a citizen to raise a worker."*), The Labour Rolls (new, Tier II, uncommon, Economic: *"+1% production and food for every two citizens you have levied this game, at most +30%."*), The Terraces of Moray (new, Tier II, uncommon, Civic: *"Towns beside a mountain may spend a citizen to gain science equal to the food it took to grow that citizen."*), Plenty (proposed);
  - soldiers: The Muster of the Fields and The General Levy, and The Trained Bands (new, Tier III, uncommon, Military: *"Units raised by a levy start as Veterans."*);
  - another town's growth: Daughter Towns, Migration, the shared The Grain Exchange, and The Colonists (see "Flexing").

### The tall build as a whole

- **Utility mix:** science from citizens, the happiness tier and The Mountain Schools, with Hydraulic Schools in the waterworks; culture from the happiness tier, The Labour Feasts in the breadbasket and the wonders' own in the great works; production from every flavour.
- **Gives up:** land and width, a long border, and military speed (The Patient Harvest). An inland, lowland start gives it little science or culture of its own.
- **Partners:** Scientific (the waterworks), Magisterial (the great works), Dominion (the breadbasket's soldiers), Devotion (big towns hold more followers), Commerce (The Grain Exchange).
- **Leaders:** Nezahualcoyotl (aqueduct towns and a big capital pay culture) for the waterworks and the core; Pachacuti by history for the breadbasket; Mithridates through The Polis.

---

## 3. The wide build (the open frontier)

**The fantasy.** The Greek colonies around the Mediterranean, the Russian push across Siberia, the homesteads of the plains. Towns everywhere, the land between them claimed. Three ways to hold a wide realm: the highlands settle the hard country and learn from the mountains, the well-ordered realm keeps its authority spare and counts everything, and the road network joins every town into one.

**The loop:** found a town → it claims land → worked, connected towns cost less authority → room for the next town, and every hex owned pays.
- **The quantity:** towns founded and hexes owned, which every empire makes in age 1 and this build keeps making.
- **What it spends:** authority. A founded town costs 3 against the palace's 6 and 2 an age (`meters.authority` in `data/rules.json`), and any deficit freezes every border.

### The core

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Seed Grain | 0 | uncommon | Towns you found start with one extra citizen. | opener | raises towns | growth | Economic | live |
| Outposts | I | uncommon | Workers may plant an outpost on a wild tile within three hexes of your border, for one charge. It claims its hex and the ring around it for your nearest town and costs no authority. | build-defining: a new action | raises hexes | land | Economic | deferred; new shape (a work outside your borders that claims ground) |
| The Wild Marches | I | common | +1 culture for every five wild hexes you own. | pay-off: culture | reads wild hexes owned | culture | Civic | **new**; existing (empire `pays` count, `tilesInBorders` with `unimproved`) |
| The Book of Settlements | II | uncommon | +3% production and gold for every town you have founded this game, at most +30%. | early scaler | reads towns founded this game | production, gold | Economic | **new**; new shape ("this game" count: towns founded) |

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Book of Settlements | II | uncommon | (above) | carried scaler | reads towns founded this game | production, gold | Economic | **new** |
| The Staked Claims | III | uncommon | Each town you found claims every unowned hex within two hexes of it. | the core's moment | raises hexes | land | Economic | **new**; existing (the founding rider's `claims`, as The Beating of the Bounds, at twelve) |
| The Quitrents | III | common | +1 gold for every two hexes you own. | pay-off | reads hexes owned | gold | Economic | proposed (from Tier I, resized); existing |
| The Hallowed Woods | III | uncommon | Towns working at least five wild tiles gain +25% culture. | percentage on the flats | reads wild tiles worked | culture | Civic | **new**; existing (`percentYields`, `workingTiles` scope) |
| The Measure of the Land | IV | rare | Every town gains +1 production for every 25 hexes your empire owns, at most +6. | finisher: flats | reads hexes owned | production | Economic | live |
| The Encroaching Fields | IV | uncommon | Once every ten turns, each town of twelve or more takes an unworked hex from a smaller foreign town beside it. | pressure on rivals | raises hexes | land | Economic | deferred; new shape (a hex changing owner without a capture) |

- **Five-chair core** (Tier I): The Seed Grain, Outposts and The Wild Marches, beside two of the flavour's Tier 0 and I cards.
- **Sizing:**
  - **The Wild Marches:** about 55 wild hexes at turn 70 pay +11 culture, almost half a seat's 25.
  - **The Book of Settlements:** seven towns founded by turn 114 give +21%, about 30 production and gold a turn; ten by turn 160 give +30%, about 230 a turn in age 4.
  - **The Quitrents:** 150 hexes pay 75 gold a turn, band 3's regular card.
- **Alternatives:** The Frontier Militia (new, Tier 0, common, Military): *"Each town you found starts with the best melee unit you can build standing in it,"* which `docs/six-decks-coverage.md` proposed by name for the deck's missing early defence; The Beating of the Bounds, Daughter Towns; the shared Military Colonies, The Barbarian Frontier, The Road Garrisons; The Garden Frontier (the splash).

### The highlands

**The fantasy.** The Andes, the Ethiopian highlands, the mountain kingdoms of Asia: settling where nobody else will, and learning from the mountains. This is the deck's science line. The game has no marsh, so the hard country is desert, tundra and snow.
- **The loop:** settle the hills and the hard country → hill mines, seams and mountains in the borders pay science → the science opens the next seams → settle further up.
- **The moment:** a seam surfaced. Seams lie only under hills (`veins.ts`), and The Assay Office pays science for each.
- **The capstone:** The Mountain Terraces. Towns may work the mountains themselves.

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Naturalists | 0 | uncommon | Each town gains +1 science for every two hills or mountains in its borders, at most +3. | opener: science | reads hills and mountains owned | science | Civic | live |
| The Hard Country | I | common | Worked desert and tundra tiles gain +1 food and +1 production. | pay-off: the hard country | reads desert and tundra | food, production | Economic | live; 137 a turn measured |
| The Prospectors | I | common | Prospecting costs workers and explorers no charge. Worked mines on a seam you surfaced gain +3 production. | changes what the player does | raises seams | production | Economic | live (built as) |
| The Highlands | II | common | Mines and quarries on hills gain +2 science and +1 production. | utility: science | reads hill works | science | Civic | live; 265 a turn measured |

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Highlands | II | common | (above) | carried | reads hill works | science | Civic | live |
| The Mountain Terraces | III | rare | Your towns may work the mountains in their borders. A worked mountain yields 2 science and 1 production. | capstone: a broken rule | reads mountains owned | science, production | Civic | **new**; new shape (a workable mountain; it revives the rule of the cut The High Pastures) |
| The Assay Office | III | uncommon | Each seam you surface grants 60 science. | the moment | reads seams surfaced | science | Civic | **new**; existing (a `veinFound` rider) |
| The Mountain Schools | III | uncommon | Towns beside a mountain gain +15% science. | percentage on the flats | reads mountain towns | science | Civic | live (proposed trim) |
| The Philosophers' Peaks | IV | uncommon | Each town gains +2 science for every mountain in its borders, at most +6. | finisher: flats | reads mountains owned | science | Civic | live |

- **A highland realm, early (8):** the wide core's four; The Naturalists, The Hard Country, The Prospectors, The Highlands. Five-chair core: The Seed Grain, Outposts, The Wild Marches, The Naturalists, The Hard Country. The Merchant League seats seven.
- **A highland realm, late (11):** the wide core's six; The Highlands, The Mountain Terraces, The Assay Office, The Mountain Schools, The Philosophers' Peaks. The Curia or the Estates seat nine.
- **Sizing:**
  - **The Mountain Terraces:** a town beside four mountains works them for +8 science and +4 production, and every mountain town of the realm the same.
  - **The Assay Office:** a seam surfaced pays 60 science, half a turn of an age 3 seat's science.
- **How a few turns feel:**
  - Turn 40: the third town goes on a hill between two mountains; The Naturalists pays +2 science there from the start.
  - Turn 90: a worker prospects a hill and finds iron; the mine on it pays +3 production and +2 science.
  - Turn 165: the mountain town puts citizens on its peaks, and the realm's science passes its neighbour's.
- **Also fits:** The Coming of the Water (desert farms), The Water Courts, Pachacuti's terraces.

### The well-ordered realm

**The fantasy.** The Domesday clerks, the provinces of Han China, Persia's satrapies: a wide empire held together by keeping its writ ahead of its towns, and by counting everything.
- **The loop:** develop towns so they cost less → spare authority pays production and border growth → the realm grows → found the next town with room to spare.
- **The moment:** the census. The world takes one every thirteen to seventeen turns (`census.ts`), and The Tax Rolls makes it pay the realm.
- **The capstone:** The Sovereign Writ. The bonus spare authority pays has no ceiling.

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Local Census | I | common | A town working at least four improved or tended tiles costs one less authority, minimum one. | pay-off: room | reads worked land | authority | Civic | live |
| The Quiet Provinces | I | uncommon | Each town gains +1 production for every three points of spare authority, at most +3. | pay-off: spare authority | reads spare authority | production | Economic | **new**; existing (city `pays` count `authoritySurplus`) |
| Marcher Lords | II | uncommon | Cities founded within four hexes of a foreign border gain +3 defence and +2 production, and cost one less authority, minimum one. | pay-off: the border provinces | reads frontier towns | production, authority | Economic | live (shared with Dominion); 279 a turn measured |
| Provincial Councils | II | uncommon | Connected towns other than the capital cost one less authority, minimum one, and gain +1 happiness. | pay-off: room | reads connected towns | authority | Civic | live (proposed trim) |

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Quiet Provinces | I | uncommon | (above) | carried | reads spare authority | production | Economic | **new** |
| The Sovereign Writ | III | rare | Spare authority's bonus to production and border growth has no ceiling: +10% for every five points. | capstone: a broken rule | reads spare authority | production, border growth | Civic | **new**; new shape (the authority tier's cap lifted) |
| The Tax Rolls | III | uncommon | When the world takes a census, gain gold equal to five times your citizens. | the moment | reads the census, citizens | gold | Economic | **new**; new shape (the census as a windfall occasion) |
| The Wide Country | III | uncommon | Commission. Claim twelve hexes while this card is seated. Then +2 happiness in every town and more food in small towns for 30 turns. | a goal | raises hexes | happiness, food | Wildcard | live (built as) |
| The Domesday Survey | IV | rare | (the improvement build) | the late goal | reads hexes and works | production, an engineer | Wildcard | live (built as) |

- **A well-ordered realm, early (8):** the wide core's four; The Local Census, The Quiet Provinces, Marcher Lords, Provincial Councils. Five-chair core: The Seed Grain, Outposts, The Wild Marches, The Local Census, The Quiet Provinces. The Merchant League seats seven.
- **A well-ordered realm, late (11):** the wide core's six; The Quiet Provinces, The Sovereign Writ, The Tax Rolls, The Wide Country, The Domesday Survey. The Estates seat nine.
- **Sizing:**
  - **The Quiet Provinces:** nine spare points pay +3 production in each of twelve towns: 36 a turn.
  - **The Sovereign Writ:** twenty spare points pay +40% production and border growth instead of +20%.
  - **The Tax Rolls:** 150 citizens pay 750 gold a census, about 50 a turn.
- **How a few turns feel:**
  - Turn 60: every town works four improved tiles and costs one less authority; the writ is six points ahead.
  - Turn 120: the census is taken, and The Tax Rolls pays 500 gold.
  - Turn 170: twenty spare points: production and border growth at +40%, and the borders run to meet each other.
- **Also fits:** The Imperial Roads (the road network's capstone also frees authority), The Beating of the Bounds.

### The road network

**The fantasy.** The Persian Royal Road, the Roman roads, the Inca Qhapaq Ñan: an empire made one by its roads. Roads have two writers in the game, a caravan's route and a founding rider's road home (`roads.ts`); workers do not build them, so this flavour opens with a card that lays one (question 10).
- **The loop:** found towns joined by road → connected towns pay and cost less → the roads carry the empire → found the next town along the road.
- **The moment:** a town joined to the capital (The Opening of the Roads).
- **The capstone:** The Imperial Roads. Towns joined to the capital by road cost no authority.

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Road Home | 0 | common | Each town you found is joined to your nearest town by road. | opener | raises roads, connected towns | roads | Economic | **new**; existing (the founding rider's `roads`, last used by the retired Doctrine The Founders' Road) |
| The Road Towns | I | common | Towns joined to your capital by road gain +2 production. | pay-off | reads connected towns | production | Economic | **new**; existing (city `pays`, `connected` scope) |
| Garden Provinces | II | common | Connected cities with a Monument gain +3 food and +3 culture. | utility: culture | reads connected towns | food, culture | Civic | live (shared with Magisterial) |
| The Milestones | II | uncommon | +1% production and gold for every three road hexes you have paved, at most +30%. | early scaler | reads roads | production, gold | Economic | **new**; existing (empire `pays` count `roadHexes`) |

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Milestones | II | uncommon | (above) | carried scaler | reads roads | production, gold | Economic | **new** |
| The Imperial Roads | III | rare | Towns joined to your capital by road cost no authority. | capstone: a broken limit | reads connected towns | authority | Civic | **new**; new shape, small (`cityCost` allowed to reach zero; today a discount stops at one) |
| The Opening of the Roads | III | uncommon | When one of your towns is first joined to your capital by road, it gains production equal to twenty times its population. | the moment | reads connections | production | Economic | **new**; new shape (a town first connected, as an occasion) |
| The Road Patrols | III | uncommon | Your land units gain +1 movement in your own territory. | utility: a long border held | reads territory | movement | Military | **new**; existing (`unitStat` movement, `where: ownTerritory`) |
| The Imperial Highways | IV | rare | The town raising the Magnum Opus gains +3% production toward it for every town joined to your capital by road, at most +45%. | finisher: the win | reads connected towns | production toward the Opus | Economic | **new**; new shape, small (a count of connected towns) |

- **A road network, early (8):** the wide core's four; The Road Home, The Road Towns, Garden Provinces, The Milestones. Five-chair core: The Seed Grain, Outposts, The Wild Marches, The Road Home, The Road Towns. The Merchant League seats seven.
- **A road network, late (11):** the wide core's six; The Milestones, The Imperial Roads, The Opening of the Roads, The Road Patrols, The Imperial Highways. The Estates seat ten, with The Road Patrols in a Military chair.
- **Sizing:**
  - **The Road Home:** four to six road hexes per founding; ten towns lay about fifty, which The Milestones reads as +17%.
  - **The Imperial Roads:** twelve connected towns at three authority each free about 33 points, enough for the +20% production tier however wide the empire grows.
  - **The Opening of the Roads:** a town of eight joined pays 160 production.
- **How a few turns feel:**
  - Turn 30: every new town arrives with its road home, and the capital's net reaches the third town.
  - Turn 100: the road reaches the fifth town; it gains +2 production and costs one less authority.
  - Turn 170: The Imperial Roads is seated, and twelve towns cost nothing. A town cut off by a rival's border costs authority again until the road is mended.
- **Also fits:** Market Gardens, The Road Garrisons, The Provincial Fair (all shared); with Commerce, the caravans that lay most roads.

### The wide build as a whole

- **Utility mix:** science from the highlands; culture from The Wild Marches, The Hallowed Woods, Garden Provinces and the tended splash; production from towns, hexes, spare authority and roads.
- **Gives up:** town size, a long border to defend, and culture: owned wild land pays little of it.
- **Partners:** Commerce (caravans lay roads; gold buys hexes), Dominion (garrisons for many towns; The Imperial Roads holds its conquests), Scientific (the highlands).
- **Leaders:** Pachacuti for the road network (connected towns) and the highlands (farms beside mountains, terraces); Mithridates through The Frontier Militia and the shared frontier cards.

---

## 4. Flexing between wide and tall

The user, 2026-10-16: *"adept players flexing between the two to create large empires"*. A flexing seat goes wide while land is free, grows tall when authority binds, and goes wide again late from its big towns. These cards reward the switch.

| Card | Tier | Rarity | Text | The flex | Type | Status, shape |
|---|---|---|---|---|---|---|
| Daughter Towns | I | uncommon | While a town you found has fewer than five citizens, it gains +3 food. | wide → tall: young towns grow up fast | Economic | live (built as) |
| The Colonists | II | uncommon | Towns of at least six citizens may spend a citizen to raise a settler. | tall → wide: big towns seed new ones | Economic | **new**; new shape (a levy use: a settler) |
| The Teeming Realm | II | uncommon | +1% production and food for every ten citizens in your empire, at most +30%. | both: total citizens grow with width and with height | Economic | **new**; existing (empire `pays` count `population`) |
| Migration | II | rare | Every ten turns, each of your towns at its happiness limit sends a citizen to your smallest connected town with room to grow. | tall → wide | Economic | deferred |
| The Great Colonies | III | rare | Towns you found start with a third of the citizens of your largest town. | the flex capstone: grow tall, then go wide at full size | Economic | **new**; new shape (a founding rider scaled by your largest town) |
| The Great Migration | IV | rare | Every ten turns, each foreign town within three hexes of your border loses a citizen to your nearest town, if yours is happier and has room. | a long, content border | Economic | deferred |

**How a flex plays out over a game:**
- **Age 1 (Tier 0):** wide while the land is free. The Seed Grain, The Frontier Militia and The Road Home put four or five towns down fast.
- **Age 2 (Tier I):** authority binds at five or six towns. Develop them so they cost less (The Local Census), and let Daughter Towns and The Grain Census grow the young towns.
- **Age 3 (Tier II):** tall. The Great Households pays every citizen, The Colonists seeds the last gaps from the big towns, and The Teeming Realm pays for every citizen in the empire.
- **Age 4 (Tiers III and IV):** the large empire. A wide capstone lifts authority (The Imperial Roads or The Sovereign Writ) and The Megalopolis lifts happiness. The Great Colonies founds the last towns at a third of the capital's size, and The Staked Claims gives each its land.
- **A flexing council, late (11):** The Teeming Realm and The Book of Settlements (carried); The Megalopolis, The Imperial Roads, The Great Colonies, The Freedom of the City, The Staked Claims; The Mother City, The Measure of the Land, The Land's Great Work, The Great Migration. The Estates seat nine.
- **What a flex gives up:** neither limit lifts early, and a council split between two plans is never as deep as a pure one. The Polis is the card a flexer skips.

---

## Across the builds

### Bridges and pivots

- **The improvement build feeds both shapes:** The Highlands is also the highlands' science; The Coming of the Water and The Raising of the Land raise improved tiles in the tall flavours; The Domesday Survey closes the improvement build and the well-ordered realm alike.
- **Inside the tall build:** The Builders' Levy and The Corvée join the great works to the breadbasket (the levy builds); The Mountain Schools serves the tall core and the highlands.
- **Inside the wide build:** Provincial Councils serves the well-ordered realm and the road network; The Imperial Roads frees authority for both.
- **Across wide and tall:** the flex cards above, and The Garden Frontier (the splash's claim beyond the border).
- **The pivots this opens:** improvement → highlands (hill mines), wide → tall at the authority wall, tall → wide through The Colonists and The Great Colonies, and great works ↔ breadbasket through the levy.

### New shapes, and the cards that use them

**The count:** 50 new cards (listed in "The new cards, by tier"). 22 use shapes that exist, 3 nearly exist, and 25 need a new shape. Each family reads a mechanic the game already has.

1. **"This game" counts,** the family approved for Dominion (ruling 3, 2026-10-15): towns founded (The Book of Settlements) and citizens levied (The Labour Rolls). Each is one record on the player written at one seam (`foundCityAt`, `levyAt`), as `Player.campsCleared` and `Player.tilesPurchased` are today.
2. **Levies** (`levies.ts`): new uses (a worker: The Work Gangs; a settler: The Colonists; a world wonder elsewhere: The Builders' Levy), a use for some towns only (The Terraces of Moray), a levied citizen returned (The Mit'a), a turn with no wait (The Slack Season), and a deal gate, "Needs a levy" (question 5).
3. **A lasting mark on tiles,** shared by four cards: written by a worker (The Marl Pits, The Deep Workings), by an Aqueduct finished (The Coming of the Water) and by an engineer's existing act (The Raising of the Land). The Heartland needs the same mark on a town.
4. **Water carried along farms:** The Water Courts. The Watercourses already passes water one step; Scientific's planned Qanat needs the same rule.
5. **Claims beyond the border:** a work outside your borders that claims its hex (Outposts, The Garden Frontier). Today the improvement gate refuses ground you do not own.
6. **The two limits:** a cap on what a town's citizens ask in happiness (The Megalopolis), the `cityCost` rule allowed to reach zero (The Imperial Roads), and the authority tier's cap lifted (The Sovereign Writ).
7. **A town's largest size,** and a tally of growth past it (The Grain Census; The Freedom of the City uses the same mark so that a levy and a regrowth do not pay twice). `TallyOccasion`'s note in `statecraftData.ts` says the `cityGrew` member waits for exactly this record.
8. **New moments:** the census (The Tax Rolls; `censusTaken` is already announced in `occasions.ts`), and a town first joined to the capital (The Opening of the Roads).
9. **A workable mountain** (The Mountain Terraces), which revives the rule of The High Pastures, cut in review because no other card used it (question 9).
10. **One card each:** a stopped town that keeps working its food (The Breadbasket), a founding rider scaled by your largest town (The Great Colonies), a count of connected towns (The Imperial Highways), experience at birth for levied units (The Trained Bands, from Dominion's ranks family), and a town's burning on a cycle (The Fire Mosaic).

Where to cut if the user wants less engine work: The Slack Season, The Great Colonies, The Opening of the Roads and The Fire Mosaic.

**One correction to the sheet:** The Rope Stretchers was deferred for want of an occasion when a work is finished. That occasion, `improvementBuilt`, went live with The Flood Festival; this pass turns the card into a plain yield anyway.

### Sheet cards no build uses

- **The tended splash** (keep, as the splash): the four charters, The Spirits of Place, The Old Songs, The Commons, Six Gardens (with its new reward), The Tended Country, The Landscape Garden, The Long Tending, The Garden of the World, and the shared Sacred Groves, The Flood Festival and Garden Cities.
- **Keep as glue,** each an alternative in a build: The Beating of the Bounds (wide core), Tinkers' Guild (improvement), The Coast and The Waterworks (waterworks), The Muster of the Fields and The General Levy (the breadbasket's soldiers), Military Colonies, The Barbarian Frontier and The Road Garrisons (wide), Market Gardens and The Provincial Fair (road network), The Grain Exchange (breadbasket), The Sculpted Landscape (great works). Commerce and Magisterial recommend cutting Market Gardens, The Provincial Fair and Garden Provinces; only Garden Provinces sits in a table here (the road network's culture), so cutting the other two costs this deck nothing.
- **Keep deferred, as alternatives:** Veteran Colonies (the levy's reverse, with Dominion), The Common Domain (the tall core's hinterland).
- **Rework:**
  - **The Woodwrights** (chops +150%): a chop spends the land, the opposite of slowly improving it, and no build wants it. Keep it as glue until a build does, as the Dominion ruling of 2026-10-15 kept unused cards to rework rather than cut.
  - **The Polders:** terrain may not change mid-game, by rule. Rework as a waterworks work on a coast tile beside three of your land tiles that yields as farmed grassland, the tile staying water; or cut it if a new work on water is too much.
  - **Public Works:** its terraces belong to one leader, and raising a town's land is now The Raising of the Land's job. Fold it into that card.
- **One data clean-up:** `theHydraulicCommonwealth` in `data/decks/common.json` still names Expansionist, unretired and with no effects, though the sheet moved it to Scientific, whose review cut it. Retire the row.

### The new cards, by tier

- **Tier 0 (4):** The Rope Stretchers is revised, not new. New: The Pyramid Builders (great works), The Road Home (road network), The Frontier Militia (wide core, alternative), The Work Gangs (breadbasket, alternative).
- **Tier I (11):** The Marl Pits, The Forest Keepers (improvement); The Grain Census (tall core); The Public Fountains (waterworks); The Builders' Levy (great works); The Labour Feasts (breadbasket); The Wild Marches (wide core); The Quiet Provinces (realm); The Road Towns (road network); The Polis (tall, alternative); The Garden Frontier (splash).
- **Tier II (8):** The Old Fields (improvement); The Book of Settlements (wide core); The Milestones (road network); The Teeming Realm, The Colonists (flex); The Harbour Cities, The Labour Rolls, The Terraces of Moray (tall, alternatives).
- **Tier III (24):**
  - improvement: The Age of Improvement, The Deep Workings, The Manors, The Royal Forests;
  - tall: The Megalopolis, The Freedom of the City (core); The Water Courts, The Coming of the Water, The Mill Wheels (waterworks); The Topping Out (great works); The Mit'a, The Slack Season (breadbasket); The Trained Bands (alternative);
  - wide: The Staked Claims, The Hallowed Woods (core); The Mountain Terraces, The Assay Office (highlands); The Sovereign Writ, The Tax Rolls (realm); The Imperial Roads, The Opening of the Roads, The Road Patrols (road network);
  - flex and splash: The Great Colonies, The Fire Mosaic.
- **Tier IV (3):** The Great Aqueducts (waterworks), The Imperial Highways (road network), The Theodosian Walls (tall, alternative).
- **From the sheet's proposed revision:** The Great Households (Tier III to II) and The Quitrents (Tier I to III) sit in the tall and wide cores, and Old Workings (Tier II to III) in the improvement build; The Gleaners, Plenty, The Plough Teams, The Hedgerows and The Managed Wild are alternatives.
- **Moved:** The Raising of the Land, Tier IV to III.
- **Dropped from the first draft:** The Tending Songs, The Cloud Gardens, The Food Forest and The World Tree, which built the managed wild into a build of its own, and The Harbour Festivals, which no flavour needs. The Days of Service is renamed The Slack Season, since the breadbasket's moment is the harvest.

---

## The sort

Every card on the sheet: the 62 Expansionist cards and the 14 in its shared table, by the rules of `docs/plans/doctrines-governments-chairs.md` §4. A card is typed by what it pays or does, not by what it reads, and a mixed card takes the type of the half that pays more; even halves with a Civic half go Civic. Charters and commissions are typed for their faces, and a shared card keeps the type the Dominion sheet gave it. The new cards are typed in their build tables.

| Card | Tier | Status | Type | Why |
|---|---|---|---|---|
| Smallholdings | 0 | built | Economic | food and gold on farms |
| Granary Levies | 0 | built | Economic | production when a town grows |
| The Naturalists | 0 | built | Civic | science |
| The Patient Harvest | 0 | built | Economic | growth; the slower army is its drawback |
| The Forest Gardens | 0 | built (charter) | Economic | opens a food work |
| The Fish Traps | 0 | built (charter) | Economic | opens a food and production work |
| Sweet Water | 0 | built | Economic | food on many tiles outweighs +1 happiness a town |
| The Seed Grain | 0 | built | Economic | a citizen at founding: growth |
| The Spirits of Place | 0 | built | Civic | faith |
| The Rope Stretchers | 0 | deferred | Economic | production |
| The Beating of the Bounds | 0 | built as | Economic | land |
| Levy of the Land | I | built | Economic | a levy that pays production, not a unit |
| Tinkers' Guild | I | built | Economic | worker charges become improvements |
| The Old Songs | I | built | Civic | culture |
| The Local Census | I | built | Civic | authority |
| The Wild Orchards | I | built (charter) | Economic | opens a food and gold work |
| The Burning Season | I | built as (charter) | Economic | opens a food work |
| Dark Earth | I | built | Economic | food |
| The Three Sisters | I | built | Economic | food and production |
| The Commons | I | built | Civic | happiness |
| The Hard Country | I | built | Economic | food and production |
| The Master Builders | I | built | Civic | renown |
| Outposts | I | deferred | Economic | land |
| The Prospectors | I | built as | Economic | production |
| Daughter Towns | I | built as | Economic | food |
| Six Gardens | I | built as | Wildcard | commission |
| The Watercourses | II | built as | Economic | production |
| The Highlands | II | built | Civic | +2 science outweighs +1 production |
| The Coast | II | built | Civic | even food and culture |
| Provincial Councils | II | built | Civic | authority and happiness |
| The Grain Dole | II | built | Civic | +4 happiness outweighs food kept |
| The Waterworks | II | built | Civic | lasting happiness outweighs a cheaper Aqueduct |
| The Breadbasket | II | deferred | Economic | surplus food into production |
| Migration | II | deferred | Economic | citizens moved: growth |
| Veteran Colonies | II | deferred | Economic | pays food; the unit is spent, not gained |
| The Landscape Garden | II | built as | Civic | culture |
| The Engineers' Yards | II | built | Economic | production |
| The Tended Country | II | built | Economic | production and food |
| The Woodwrights | III | built | Economic | production from chops |
| The Common Domain | III | deferred | Economic | more tiles worked |
| Seasonal Levies | III | built | Economic | food after a levy |
| The Long Tending | III | built | Economic | food |
| The Mountain Schools | III | built | Civic | science |
| The Polders | III | deferred | Economic | land |
| Public Works | III | deferred | Economic | a building or works completed |
| A Court of Engineers | III | built | Civic | renown and great people |
| The Wide Country | III | built as | Wildcard | commission |
| The Land's Great Work | IV | built as | Economic | production toward the Opus |
| The Garden of the World | IV | built | Economic | food and production outweigh +1 culture |
| The Heartland | IV | deferred | Wildcard | commission |
| The Corvée | IV | built | Economic | a levy that pays production |
| The Master of Works | IV | built as | Economic | production; it amplifies a great person's act, not a card |
| The Philosophers' Peaks | IV | built | Civic | science |
| The Inheritance of Fields | IV | built | Economic | production; culture only on tended land |
| The Measure of the Land | IV | built | Economic | production |
| The Mother City | IV | built | Economic | production |
| The General Levy | IV | built | Military | a levy that raises units |
| The Great Migration | IV | deferred | Economic | citizens taken: growth |
| The Encroaching Fields | IV | deferred | Economic | land |
| The Domesday Survey | IV | built as | Wildcard | commission |
| The Raising of the Land | IV | deferred | Economic | food and production on tiles |
| The Two Harvests | IV | deferred | Economic | adds a work's yield to a tile |
| Market Gardens (Commerce) | 0 | built | Economic | gold and food |
| Sacred Groves (Devotion) | 0 | built | Civic | even food and faith |
| Military Colonies (Dominion) | I | built | Economic | as on the Dominion sheet |
| The Muster of the Fields (Dominion) | I | built | Military | as on the Dominion sheet |
| The Barbarian Frontier (Dominion) | I | built | Economic | as on the Dominion sheet |
| The Flood Festival (Devotion) | I | built as | Civic | faith |
| Hydraulic Schools (Scientific) | I | revised | Civic | science outlasts production toward science buildings |
| Garden Cities (Magisterial) | I | deferred | Civic | culture and happiness |
| The Grain Exchange (Commerce) | I | built | Economic | +5 food outweighs +1 happiness |
| The Road Garrisons (Dominion) | II | built | Economic | as on the Dominion sheet |
| Marcher Lords (Dominion) | II | built | Economic | as on the Dominion sheet |
| The Provincial Fair (Commerce) | II | built | Economic | food and gold |
| Garden Provinces (Magisterial) | II | built | Civic | even food and culture |
| The Sculpted Landscape (Magisterial) | III | built | Civic | even food and culture |

### Counts

| Tier | Military | Economic | Civic | Wildcard | All | Dealt today | With this pass's new cards |
|---|---|---|---|---|---|---|---|
| Tier 0 | 0 | 9 | 2 | 0 | 11 | 10 | 15: 1 M, 12 E, 2 C |
| Tier I | 0 | 10 | 4 | 1 | 15 | 14 | 26: 17 E, 8 C, 1 W |
| Tier II | 0 | 6 | 6 | 0 | 12 | 9 | 20: 12 E, 8 C |
| Tier III | 0 | 6 | 2 | 1 | 9 | 6 | 34: 2 M, 21 E, 9 C, 2 W |
| Tier IV | 1 | 11 | 1 | 2 | 15 | 10 | 17: 2 M, 12 E, 1 C, 2 W |
| **All** | **1** | **42** | **15** | **4** | **62** | **49** | **112: 5 M, 74 E, 28 C, 5 W** |
| Shared | 1 | 7 | 6 | 0 | 14 | 13 | |

- The thirteen deferred cards are all Economic except The Heartland, so the 49 dealt today are 30 Economic, 15 Civic, 1 Military and 3 Wildcard.
- "With this pass's new cards" adds the 50 new cards (eight alternatives and two splash cards included) and moves The Raising of the Land to Tier III. The new cards alone are 4 Military, 32 Economic, 13 Civic and 1 Wildcard.

### Close calls

- **Sweet Water** (Economic): +1 food on each worked freshwater tile against +1 happiness a freshwater town. The proposed split makes two cards, one of each type.
- **Tinkers' Guild** (Economic): a unit stat, which the rules list under Military, but on a worker it pays in improvements.
- **Levy of the Land and The Corvée** (Economic): the Military rule names levies, but these two pay production. Only levies that raise units are Military.
- **The Highlands** (Civic): +2 science against +1 production. It is the deck's best measured card, so typing it Civic puts it in a Civic or Wildcard chair.
- **The Coast, Sacred Groves, Garden Provinces, The Sculpted Landscape** (Civic): even halves, one of them Civic.
- **The Grain Dole and The Waterworks** (Civic): happiness against food kept or a cheaper Aqueduct. The proposed trims keep only the happiness, which settles both.
- **Hydraulic Schools** (Civic): science against production toward science buildings.
- **Veteran Colonies and The Breadbasket** (Economic): the first is a unit's order but pays food and spends the unit; the second's rework pays only production.
- **The Two Harvests and The Master of Works** (Economic): each could read as acting on other cards (Wildcard), but the first adds a work's own yield and the second amplifies a great person's act, not a card.
- **Among the new cards:** The Age of Improvement is Wildcard because it doubles other cards' lines; The Sovereign Writ is Civic because what it changes is the authority meter, though the meter pays production; The Mountain Terraces is Civic because its science outweighs its production.

### Where a tier leans, and what it means under each government

- **Tier 0 leans Economic (9 of 11) and has no Military card.** Under the Chiefdom (1 Military, 1 Economic, 1 Wildcard) Expansionist fills two of the three chairs. The Military chair takes the partner's card: Dominion has ten Military cards at Tier 0, and the other four decks are unsorted. The Frontier Militia would give the deck its own.
- **Tier I leans Economic (10 of 15) and has no Military card of its own;** the shared The Muster of the Fields is the one it can draw. At draft 4, Council of Elders (1 M, 2 E, 1 C, 1 W) and Priest-King (1 M, 1 E, 2 C, 1 W) seat four Expansionist cards and War Chief (2 M) three. At draft 10 the Republic (0 M, 3 E, 1 C, 1 W) seats five, the Theocracy (3 C) four and Tyranny (3 M) two. Expansionist is the Republic's deck.
- **Tier II is even** (6 Economic, 6 Civic; its three deferred cards are Economic, so what is dealt leans Civic, 6 to 3), and it has no Military card, its own or shared. It suits the Merchant League (3 E, 2 C, 2 W) and Divine Mandate (3 C); under Imperium (3 M) the partner fills three chairs.
- **Tier III is thin today:** six cards dealt. This pass makes it the deck's deepest tier, 34 cards.
- **Tier IV leans Economic (11 of 15).** The Estates (4 E, 3 W) seat it; under the Curia (4 C) the Civic chairs take earlier Civic cards the seat still holds, or the highlands' science cards.
- **Every government but the Republic has a Military chair,** and the deck's one Military card is in Tier IV (The General Levy; the shared The Muster of the Fields at Tier I). So an Expansionist seat's Military chairs belong to its partner, as the chairs intend ("the government steers which half of the seat's two decks leads"); with a partner also short of Military cards they sit empty. This pass adds four: The Frontier Militia (Tier 0), The Trained Bands and The Road Patrols (Tier III), The Theodosian Walls (Tier IV).
- **Each flavour leans its own way,** which steers its government: the highlands is all Civic late and suits the Curia; the breadbasket and the waterworks are nearly all Economic and suit the Estates; the improvement build carries three Wildcard cards late and fills the Estates' three Wildcard chairs.

---

## Open questions for the user

Each starts with the recommendation. Questions 1 to 7 carry over from the first draft; 8 to 10 are new.

1. **The gap rule.** *Recommended: keep it strict.* Every build takes science and culture from terrain or from the happiness tier, never straight from a citizen, a levy or a founding. The breadbasket and the road network are the thinnest at both; terrain-gated cards (The Terraces of Moray, The Labour Feasts) and the shared Garden Provinces cover them.
TBD, will review myself later.
2. **The Economic lean under typed chairs.** *Recommended: accept it as the deck's steer toward the economic governments, and adopt the four Military cards (The Frontier Militia, The Trained Bands, The Road Patrols, The Theodosian Walls), so the Chiefdom's Military chair is never forced empty.* Today 42 of 62 cards are Economic and one is Military.
defer
3. **Shared types bind four unsorted decks.** *Recommended: confirm them now, so those decks' passes start from them.* This sort types nine cards that Commerce, Devotion, Scientific and Magisterial share and have not sorted: six Civic (Sacred Groves, The Flood Festival, Hydraulic Schools, Garden Cities, Garden Provinces, The Sculpted Landscape) and three Economic (Market Gardens, The Grain Exchange, The Provincial Fair).
what does this mean, we can confirm any shared cards now yes.
4. **The Burning Season as you designed it.** *Recommended: keep the per-tile charter at Tier I and build the town's burning as The Fire Mosaic, the splash's Tier III card.* You ruled that towns decide when to burn, on a cycle; D3 built burned country one tile at a time.
remove burning, feels difficult to implement, maybe implement later
5. **A "Needs a levy" deal gate.** *Recommended: yes,* for the cards that read levies (The Labour Feasts, Seasonal Levies, The Gleaners, The Labour Rolls), as "Needs tended land" gates the tended cards. Today two cards grant a levy by Tier I, three with The Work Gangs or The Builders' Levy.
yes
6. **A town's largest size.** *Recommended: add it.* The Grain Census and The Freedom of the City need the high-water mark the game deliberately lacks; without it a levy and a regrowth pay twice.
yes
7. **The Raising of the Land to Tier III,** as the great works' capstone, triggered by the engineer's existing Rush the Works. *Recommended: yes;* it needs no new act or button.
sure
8. **Tiles raised by workers.** *Recommended: yes.* The Marl Pits and The Deep Workings let a worker raise a farm or a mine for good, which is the improvement build's iterative verb. It is a new mechanic (a lasting mark on tiles) offered through the worker's existing build menu, and The Coming of the Water and The Raising of the Land share the mark.
yes, i like it
9. **Workable mountains.** *Recommended: yes, as the highlands' capstone (The Mountain Terraces).* The review cut The High Pastures because no other card used the rule; now it is the deck's science line at full size.
yes, thats a cool mechanic
10. **Who lays roads.** *Recommended: keep roads to caravans and foundings, and open the road network with The Road Home;* let workers build roads only if a playtest shows too few. Today `layRoad` has two callers, and neither is a worker.
agree, maybe in the future a military unit can build it, but caravans only for now.

After these, the deck pass goes on to putting the cards on the sheet, then Expansionist's Doctrines: one direction per flavour, so each of the seven has a Doctrine at most tiers.

## Rulings, 2026-10-16: the user's first pass on the builds

The user, verbatim: *"hmm the expansionist builds aren't necessarily doing it for me. I'm unsure if the tended lands should be a full build in of itself, or merely a theme to splash into. I like the second build, but some of the cards don't seem to fulfill the vision/fantasy which should be slowly improving the yields of your empire. Let's combine the first two builds into one, which is iteratively improving your land with workers and orders. tended lands can be used in addition to improvements, but the 'default' focus should be to improve your lands with improvements. I also think of the expansionist as having two flavors, one very wide and one very tall, with adept players flexing between the two to create large empires. The people's levy should fall within the tall build (the great city). What other gameplay themes could we create builds around?"*

So:
- **One improvement build replaces the managed wild and the old fields.** Its fantasy is slowly improving the yields of your empire, iteratively, with workers and Orders. Improvements are the default engine. Tended land is a theme a seat can splash into, beside improvements, not a build of its own. Cards in the old fields that do not serve "slowly improving the empire's yields" are to be reworked or moved.
- **Two flavours, wide and tall,** with adept players flexing between them to build large empires. The open frontier is the wide build. The great city is the tall build, and **the people's levy folds into it.** Bridge cards that reward a switch from one to the other are wanted.
- **More builds:** the user asked what other gameplay themes could carry a build. The candidates are in the reply of 2026-10-16. The builds are rewritten once the user picks.
- The eight open questions above wait for the rewrite.

## Rulings, 2026-10-16: the user's second pass, the shape of the builds

The user, verbatim: *"lets have the waterworks and great works and breadbasket be flavors of the tall build, the highlands and well-ordered realm and road network be flavours of the wide build. Let's rework the builds doc to have one build for the improvements, and then 3 versions of both the tall build and wide build with core cards, and flavor-specific cards. That seems reasonable to me to design around."*

So the deck is designed around three builds:
- **The improvement build:** slowly improving the empire's yields with workers and Orders; improvements are the default engine, and tended land is a splash.
- **The tall build** (the great city, with the people's levy folded in): core cards every tall empire wants, and three flavours, each with its own cards: **the waterworks** (rivers, irrigation, aqueducts, canals), **the great works** (engineers, wonders, manufactories) and **the breadbasket** (food stored and spent).
- **The wide build** (the open frontier): core cards every wide empire wants, and three flavours, each with its own cards: **the highlands** (settling and working the hard country, the deck's science line), **the well-ordered realm** (authority, censuses, provinces) and **the road network** (roads and connected towns).
- Adept players flex between wide and tall, so bridge cards reward a switch.

## Rulings, 2026-10-16: the user's third pass, the open questions

The user answered each open question in place (their words sit under each question above) and revised one card: *"these look good! i made one change and responded to the questions. Lets put these in the doc so i can review them in the aggregate, the builds look fun and engaging."* So:
- **The Megalopolis** is revised (*"too strong, revise: cities with 10+ population gain +1 science and +1 production for each population"*): towns of ten or more citizens gain +1 science and +1 production for each citizen. It no longer lifts the happiness demand.
- **1, the gap rule:** to be decided; the user will review it.
- **2, the Economic lean and the four Military cards:** deferred.
- **3, the shared types:** confirmed (*"we can confirm any shared cards now yes"*). Confirming means the types this sort gives the nine cards Expansionist shares with the four unsorted decks are final, so those decks' passes start from them instead of sorting them again.
- **4, burning:** removed for now (*"remove burning, feels difficult to implement, maybe implement later"*). The Fire Mosaic, the town-wide burn, comes out of the builds. The built per-tile charter is unchanged.
- **5, a "Needs a levy" deal gate:** yes.
- **6, a town's largest size:** yes.
- **7, The Raising of the Land at Tier III,** triggered by the engineer's existing act: yes.
- **8, tiles raised by workers** (The Marl Pits, The Deep Workings): yes.
- **9, workable mountains** (The Mountain Terraces): yes.
- **10, roads:** caravans and foundings only, for now (*"maybe in the future a military unit can build it, but caravans only for now"*).
- **Next:** every card goes on the deck sheet, `docs/decks/expansionist.md`, in the compact format Dominion's uses, so the user can review the deck in the aggregate.

## Rulings, 2026-10-16: the user's fourth pass, build the deck

The user, verbatim: *"these look good to me! let's implement the expansionist deck, deferring any that require a new UX/user interaction"*. That answered a status report with two open decisions, read as yes to both:
- **The card types go into the game data.** After that, each Expansionist card fits only its own chair type, and an unsorted card no longer exists in this deck. Most of the deck is Economic. The four Military cards stay deferred.
- **C3's adoption rule stays:** a player cannot adopt a government while a Doctrine offer waits.

So:
- **Build every card on the sheet,** `docs/decks/expansionist.md`, in batches like Dominion's (`docs/plans/chairs-build.md`, section D).
- **Defer every card that needs a new UX or a new user interaction:** a new action or command, a new button, menu or screen, or a choice made when the card fires. A deferred card keeps its sheet row, and is listed with the decision it waits on.
- **Build the cards as the sheet writes them.** The gap rule stays for the user's own review, so The Megalopolis is built with its revised text.
- **The first step is a triage,** `docs/plans/expansionist-build-triage.md`, in the form of `docs/plans/dominion-build-triage.md`.

## Doctrines, proposed 2026-10-17

- **Revised 2026-10-23** after your comments on the review page: 8 cut, 14 revised, 10 unchanged, so 24 remain. Each entry carries your comment, and "Your comments, 2026-10-23" at the end of this section has the readings and the questions they raise. The reasons, pairs and shapes under a revised entry were written for its old text.

The user, verbatim: *"could you also propose some doctrines for the expansionist deck? aim for 8 for each tier (tier 1-4) and i'll filter them down/make edits"*.

**What a Doctrine is here** (the card-design skill and `docs/plans/doctrines-governments-chairs.md`):
- a permanent rule, held for the whole game, that takes no chair;
- strong and game-warping, written for one build or flavour, and usually carrying a drawback;
- offered with a government: Tier I with the tier-4 governments, Tier II with tier 10, Tier III with tier 18 and Tier IV with tier 26;
- two Doctrines whose drawbacks cancel are intended, as the reward for committing (the user, 2026-10-16: *"#3 is intentional"*).

**How they are spread.** Eight a tier, 32 in all:
- the improvement build has one at every tier;
- each of the six flavours has one at three of the four tiers;
- the tall and the wide cores have two each;
- flexing and tended land have three each, from Tier II.

| Build | Tier I | Tier II | Tier III | Tier IV |
|---|---|---|---|---|
| improvement | Bound to the Soil | The Georgics | Crop Rotation | The Physiocrats |
| tall | Synoecism | | The Contented City | |
| tall: waterworks | The Gift of the River | The Curator of Waters | | The Hydraulic Empire |
| tall: great works | | The Royal Works | The Builder Kings | The Cathedral Lodges |
| tall: breadbasket | The Seven Fat Years | The Liturgies | The Annona | |
| wide | The Sacred Spring | | Empire Without End | |
| wide: highlands | The Highland Clans | Free Mining | | The High Towns |
| wide: well-ordered realm | The Commanderies | The Censors | | The Mandarinate |
| wide: road network | The Royal Road | | All Roads Lead to Rome | The Inward Roads |
| flex | | The Hiving | The Planted Towns | Town and Country |
| tended land | | The Wildwood Compact | The Garden Peoples | Arcadia |

**The rulings they keep:** no burning (*"remove burning"*); roads only from caravans and foundings (*"caravans only for now"*); no tile changes its terrain during a game; science and culture from terrain or from the two meters (the gap rule, still open; The Mandarinate is the one exception, question 2).

**How to read each entry:** the build and the reason; the drawback and why it matters; what it pairs with, Doctrines first; the shape. "Existing" names the effect kind that already says it. "New" says what is missing. No Doctrine needs a new control or a choice when it fires, so none waits on a UX decision. One needs a line of new text on a screen (The Cathedral Lodges).

### Tier I (with the tier-4 governments)

**Bound to the Soil** (improvement): *"Your workers never run out of charges. You may hold at most one worker for every two towns."*
- **Why:** the improvement build's verb is the worker raising the land. Workers that last all game turn charges from a stock into a pace, and the build keeps improving without training workers again.
- **Drawback:** few workers. A seat of eight towns keeps four, so a new town waits for its works.
- **Pairs with:** The Georgics (its two-charge improvements cost nothing here). The Marl Pits and The Deep Workings, which raise tiles for a charge, and Tinkers' Guild, which this makes moot.
- **Shape:** new. A worker's build that spends no charge, and a cap on workers held, refused at training and buying as `noFounding` refuses settlers.

**Synoecism** (tall), after the Greek joining of villages into one city: *"Your towns of six or more citizens grow 30% faster. Towns you found cost 2 more authority."*
- **Why:** the tall core wants a few towns grown huge, and the faster growth starts once a town is past its first years.
- **Drawback:** each new town costs five authority instead of three, so the empire stays small.
- **Pairs with:** Empire Without End (its towns cost nothing, which cancels the drawback); The Grain Census, The Great Households, The Grain Dole.
- **Shape:** existing. `growthSurplus` +30 with a `populationAtLeast` scope; `cityCost` +2 with the `notCaptured` scope (The Universal Monarchy's).

**The Gift of the River** (tall: waterworks), after Herodotus on Egypt: *"Worked tiles beside a river gain +1 food and +1 production. Towns away from fresh water cost 2 more authority and 2 more happiness."* **Revised 2026-10-23.**
- **Your comment, 2026-10-23:** *"revise: instead of can't fount downs off fresh, towns off fresh water cost +2 authority and +2 happiness"* The text before: *"Worked tiles beside a river gain +1 food and +1 production. You can found towns only on fresh water or the coast."*
- **Why:** the waterworks begins on the river. River tiles are the best tiles of a river town, and the bonus comes early.
- **Drawback:** a town may not stand away from water, so the empire's shape follows its rivers, lakes and coast.
- **Pairs with:** The Curator of Waters; Sweet Water, The Watercourses, The Coast.
- **Shape:** existing hex `pays` on the `river` test. New: a founding refused by its site.

**The Seven Fat Years** (tall: breadbasket), after Joseph's granaries: ~~*"Your towns keep half of their stored food when they grow. Your towns cannot grow beyond twelve citizens."*~~ **Cut 2026-10-23.**
- **Your comment, 2026-10-23:** *"remove"*
- **Why:** the breadbasket grows food beyond need and spends it. Half the store kept makes every growth quicker, and the cap turns the food into citizens to spend.
- **Drawback:** a town of twelve stops growing, so the seat must levy to use its food. It matters from about turn 120.
- **Pairs with:** The Annona (the capped towns' food feeds the small ones); Levy of the Land, Granary Levies, The Breadbasket.
- **Shape:** existing `growthCarryover` +50. New: a cap on a town's size (question 1).

**The Sacred Spring** (wide), after the *ver sacrum*, when Italic peoples sent a generation out to found new towns: ~~*"Settlers cost half as much to build and to buy. Your towns of eight or more citizens grow 25% more slowly."*~~ **Cut 2026-10-23.**
- **Your comment, 2026-10-23:** *"remove"*
- **Why:** the wide core's quantity is towns founded. Half-price settlers double the pace of the first expansion.
- **Drawback:** big towns grow slowly, so the seat must stay wide or flex late.
- **Pairs with:** Synoecism (its faster growth for towns of six or more cancels part of this); The Seed Grain, The Book of Settlements, The Staked Claims.
- **Shape:** existing. `settlerCost` −50 (a purchase follows the cost); `growthSurplus` −25 with `populationAtLeast` 8.

**The Highland Clans** (wide: highlands): *"Towns on hills cost 1 less authority and gain +2 production. Towns off the hills grow 20% more slowly."*
- **Why:** the highlands settles the hills, and this makes every hill town cheaper and stronger from its founding.
- **Drawback:** the lowland towns, often the capital, grow slowly.
- **Pairs with:** Free Mining and The High Towns; The Naturalists, The Hard Country, The Highlands.
- **Shape:** existing `hillCityCost` −1 and city `pays` with `onHills`. New, small: a `notOnHills` scope, as `notFreshwater` is.

**The Commanderies** (wide: well-ordered realm), after the Qin system of commanderies and counties: *"Each of your towns costs 1 less authority, minimum one. Your borders grow 30% more slowly."*
- **Why:** the realm keeps its writ ahead of its towns. A third off every town's price is room for two or three more towns.
- **Drawback:** the borders claim land slowly, which the wide core needs.
- **Pairs with:** The Mandarinate (each cancels the other's change to a town's price); The Local Census, The Quiet Provinces.
- **Shape:** existing. `cityCost` −1, minimum one; `borderCulture` −30.

**The Royal Road** (wide: road network), after the Persian road from Sardis to Susa: ~~*"Each town you found is joined to your capital by road. Your roads cost twice as much gold to keep."*~~ **Cut 2026-10-23.**
- **Your comment, 2026-10-23:** *"remove"*
- **Why:** the road network needs roads, and only caravans and foundings lay them. This founding lays the whole road home.
- **Drawback:** long roads cost gold every turn.
- **Pairs with:** All Roads Lead to Rome and The Inward Roads; The Road Towns, The Milestones, The Opening of the Roads.
- **Shape:** new, small. The founding rider's road laid to the capital instead of to the nearest town (The Road Home's), and a percentage on road maintenance.

### Tier II (with the tier-10 governments)

**The Georgics** (improvement), after Virgil's poem on farming: *"Your works count as having stood twice as long. Improvements that have stood for twenty turns gain +1 production."* **Revised 2026-10-23.**
- **Your comment, 2026-10-23:** *"no malice,  just 'your works count as having stood twice as long'. Add: improvements that have been standing for 20 turns gain +1 production."* The text before: *"Your works count as having stood twice as long. Each improvement costs your workers two charges."*
- **Why:** the build's second quantity is the age of its works. Every card that reads it pays twice as soon: Dark Earth, The Forest Keepers, The Old Fields, Old Workings and The Inheritance of Fields.
- **Drawback:** each new work costs two charges, so the build raises fewer of them.
- **Pairs with:** Bound to the Soil, which cancels the drawback.
- **Shape:** new. An age multiplier read by the `standingSince` test, and a build that costs two charges.

**The Curator of Waters** (tall: waterworks), after Rome's water office: *"Aqueducts give +3 happiness and are built 50% faster."* **Revised 2026-10-23.**
- **Your comment, 2026-10-23:** *"rework: Aqueducts supply +3 happiness and are built 50% faster."* The text before: *"Every town of yours counts as having fresh water. Aqueducts cost 50% more production."*
- **Why:** the waterworks lives on fresh water, and this makes every town a river town for every card that asks.
- **Drawback:** the Aqueduct, the flavour's moment, is dearer.
- **Pairs with:** The Hydraulic Empire (cancels its drawback); Sweet Water, The Public Fountains, Hydraulic Schools, The Waterworks.
- **Shape:** existing. The `freshwater` city rule (Cistern Works'), and the Aqueduct price shape The Waterworks uses, here at −33%.

**The Royal Works** (tall: great works): ~~*"While your capital builds a wonder, each of your other towns sends it 20% of its production."*~~ **Cut 2026-10-23.**
- **Your comment, 2026-10-23:** *"remove"*
- **Why:** the great works raises wonders in the great city, and this makes the whole empire build them.
- **Drawback:** the sent production is lost to the other towns while a wonder stands in the capital's queue.
- **Pairs with:** The Builder Kings; The Pyramid Builders, The Topping Out, The Builders' Levy.
- **Shape:** new. Production sent each turn from one town to another, shared with The Annona.

**The Liturgies** (tall: breadbasket), after the Athenian public services: *"Needs a levy. Your towns may levy every two turns instead of every five. Your towns cannot grow beyond fifteen citizens."*
- **Why:** the breadbasket's action is the levy. Two turns instead of five makes it the flavour's engine.
- **Drawback:** the cap at fifteen.
- **Pairs with:** The Annona; Levy of the Land, The Builders' Levy, The Labour Rolls, The Mit'a.
- **Shape:** new. The levy wait shortened (the rule book's `everyTurns` read through a rule), the size cap, and the "Needs a levy" gate on a Doctrine offer (question 5).

**Free Mining** (wide: highlands), after the medieval miners' right to prospect and dig anywhere: ~~*"Your workers may build mines on hills up to two hexes beyond your borders, and each claims its hex for your nearest town. Hexes cost twice as much gold to buy."*~~ **Cut 2026-10-23.**
- **Your comment, 2026-10-23:** *"remove"*
- **Why:** the highlands settles the hard country; here its mines go first and the borders follow.
- **Drawback:** bought hexes cost double, so the seat claims land with workers, not gold.
- **Pairs with:** The Highland Clans; The Highlands, The Mountain Schools, The Prospectors.
- **Shape:** nearly existing. E4's `worksBeyond` (The Garden Frontier) for mines on hills; existing `tilePurchase` +100.

**The Censors** (wide: well-ordered realm), after Rome's census-takers: *"When the world takes a census, each of your towns gains a citizen. If you lead the census, each of your towns also gains +1 happiness for the rest of the game."* **Revised 2026-10-23.**
- **Your comment, 2026-10-23:** *"rework: When the world takes a census, gain a citizen in each town. If you win the census, gain a additional permanent +1 happiness in each town."* The text before: *"When the world takes a census, each of your towns gains a citizen. Your towns' food surplus counts 20% less toward growth."*
- **Why:** the realm's moment is the census, and a realm of many towns gains many citizens from it.
- **Drawback:** slower growth between censuses, so a town grows by the census more than by its food.
- **Pairs with:** The Tax Rolls (paid on the same census); The Quiet Provinces.
- **Shape:** existing `census` occasion. Nearly existing: a citizen granted to every town, as the commission rewards grant them. Existing `growthSurplus` −20.

**The Hiving** (flex), after bees that swarm when the hive is full: ~~*"The first time each of your towns reaches twelve citizens, it raises a free settler. You can no longer build or buy settlers."*~~ **Cut 2026-10-23.**
- **Your comment, 2026-10-23:** *"remove"*
- **Why:** the flex from tall to wide. The big towns seed the new ones.
- **Drawback:** no settler until a town reaches twelve, so early width stops.
- **Pairs with:** The Planted Towns (its citizen cost falls on trained settlers, and here none are trained); The Colonists (a settler raised by a levy is not built or bought), The Great Colonies.
- **Shape:** existing `sizeRecord` occasion at twelve. New, small: a settler as a granted unit, and a rule that refuses building and buying settlers while founding stays allowed.

**The Wildwood Compact** (tended land): *"Needs tended land. Tended works cost your workers no charge. Workers you gain from now on have one less charge."* **Revised 2026-10-23.**
- **Your comment, 2026-10-23:** *"remove the malice. All new workers have one less charge."* The text before: *"Needs tended land. Tended works cost your workers no charge. Your workers can no longer build farms."*
- **Why:** the splash at full size. The tended works become the empire's fields.
- **Drawback:** no new farms, the food every other build relies on.
- **Pairs with:** The Garden Peoples and Arcadia; the four charters, The Tended Country, The Long Tending.
- **Shape:** new. The charge price of a build (shared with Bound to the Soil and The Georgics), a refused improvement kind (shared with Arcadia), and the "Needs tended land" gate on a Doctrine offer.

### Tier III (with the tier-18 governments)

**Crop Rotation** (improvement), after the medieval three-field system: *"Worked improvements yield twice their own bonus. Worked unimproved tiles yield nothing."*
- **Why:** the improvement build's late peak. Every work pays double its own yield.
- **Drawback:** wild and tended tiles pay nothing, the cards' lines on them included. That ends the tended splash and the culture of wild land.
- **Pairs with:** Arcadia (its tended tiles count as improved, so they are spared); The Old Fields, The Manors, The Age of Improvement.
- **Shape:** existing. Hex `pays` with `percent` +100 on `improved` (the works share), and `wholePercent` −100 on `unimproved` (Dominion batch D8). The town's own hex keeps its base yield.

**The Contented City** (tall): *"Your citizens ask 20% less happiness. Your gold income is halved."* **Revised 2026-10-23.**
- **Your comment, 2026-10-23:** *"revise: happiness demand -20%, your gold income is halved"* The text before: *"Your citizens ask half as much happiness. Your gold income is halved."*
- **Why:** the tall build's limit is happiness, and this halves it.
- **Drawback:** half the gold, so less buying of hexes and buildings.
- **Pairs with:** The Builder Kings (which ends buying, so less gold is lost); The Megalopolis, The Grain Dole.
- **Shape:** existing. `happinessDemand` −50, and `percentYields` gold −50 at the empire stage.

**The Builder Kings** (tall: great works): *"+35% production toward wonders. You can no longer buy buildings or units."*
- **Why:** the great works' engine at full size.
- **Drawback:** no gold buys anything, which a big wonder city usually uses to fill its gaps.
- **Pairs with:** The Royal Works, The Contented City; The Topping Out, A Court of Engineers.
- **Shape:** existing `productionBonus` toward wonders. New, small: a rule that refuses purchases.

**The Annona** (tall: breadbasket), after Rome's grain supply: ~~*"Each turn, every town of fifteen or more citizens sends its food surplus to your smallest town."*~~ **Cut 2026-10-23.**
- **Your comment, 2026-10-23:** *"remove"*
- **Why:** the breadbasket feeds the empire. The big towns stop growing and levy instead, and the food raises the small towns.
- **Drawback:** the big towns no longer grow by food.
- **Pairs with:** The Seven Fat Years and The Liturgies (their caps send the big towns' food here); The Mit'a, Seasonal Levies, The Grain Exchange.
- **Shape:** new. Food sent each turn from one town to another, shared with The Royal Works.

**Empire Without End** (wide), after Virgil's *imperium sine fine*: *"+1 authority for each town you hold. Your towns grow 40% more slowly."* **Revised 2026-10-23.**
- **Your comment, 2026-10-23:** *"+1 authority in every town. your towns have -40% growth."* The text before: *"Towns you found cost no authority. Your towns cannot grow beyond twelve citizens."*
- **Why:** the wide build's late capstone. Width no longer costs authority.
- **Drawback:** no town grows past twelve, which ends the tall half of a flex.
- **Pairs with:** Synoecism (cancels its founding cost); The Great Colonies, The Book of Settlements, The Staked Claims.
- **Shape:** existing `cityCost` value 0 with `notCaptured`. New: the size cap.

**All Roads Lead to Rome** (wide: road network): *"Your capital gains +3% production and gold for each town joined to it by road, at most +45%. Each town not joined to it costs 2 more authority."*
- **Why:** the network pays its centre.
- **Drawback:** an unjoined town, such as an island or a town cut off by a rival's border, is dear until the road reaches it.
- **Pairs with:** The Royal Road (every founded town is joined at once); The Imperial Roads, The Imperial Highways.
- **Shape:** existing capital percentage with the count of towns joined to the capital (The Imperial Highways' count). New, small: a `notConnected` scope.

**The Planted Towns** (flex), after the planned new towns of medieval Europe: *"Towns you found start with four citizens and a Monument. Training a settler also costs its town a citizen."*
- **Why:** the flex from tall to wide. A big town's citizens become a new town of four.
- **Drawback:** each trained settler costs its town a citizen.
- **Pairs with:** The Hiving (cancels the drawback); The Great Colonies, The Seed Grain.
- **Shape:** existing founding rider (citizens and a building). New, small: a settler that costs its town a citizen when trained.

**The Garden Peoples** (tended land): *"Needs tended land. Tended tiles gain +1 food, +1 production and +1 culture."* **Revised 2026-10-23.**
- **Your comment, 2026-10-23:** *"remove malice"* The text before: *"Needs tended land. Tended tiles gain +1 food, +1 production and +1 culture. Your other improvements yield 1 less food."*
- **Why:** the splash as a way of life, and culture from wild land under the gap rule.
- **Drawback:** every farm and mine loses a food.
- **Pairs with:** The Wildwood Compact, Arcadia; The Managed Wild, The Hallowed Woods, The Old Songs.
- **Shape:** existing hex `pays` on `tended` and on `improved`, and the gate.

### Tier IV (with the tier-26 governments)

**The Physiocrats** (improvement), after the French economists who held that land is the source of all wealth: *"Every improved tile gains +2 food, +2 production and +2 gold."* **Revised 2026-10-23.**
- **Your comment, 2026-10-23:** *"no malice. This seems worse than crop rotation, needs to be stronger."* The text before: *"Every improved tile gains +1 food, +1 production and +1 gold. Your towns build buildings 30% more slowly."*
- **Why:** the improvement build's endgame. Eighty improved tiles pay about 240 a turn.
- **Drawback:** the late buildings, such as universities and banks, come slowly.
- **Pairs with:** Crop Rotation; The Age of Improvement, The Domesday Survey, The Heartland.
- **Shape:** existing. Hex `pays` on `improved`, and `productionBonus` −30 toward buildings.

**The Hydraulic Empire** (tall: waterworks), after the old thesis that whoever rules the water rules the state: *"Worked tiles with fresh water gain +1 food and +1 production for each public work in their town."* **Revised 2026-10-23.**
- **Your comment, 2026-10-23:** *"fresh water tiles gain +1 food and +1 production for each public work in their city. no malice"* The text before: *"Worked farms with fresh water gain +2 food and +2 production. Towns away from fresh water cost 2 more authority."*
- **Why:** the waterworks at full size. The watered farms carry the empire.
- **Drawback:** a dry town is dear.
- **Pairs with:** The Curator of Waters (cancels the drawback); The Water Courts (chained farms count as watered), The Coming of the Water.
- **Shape:** existing. Hex `pays` on farms with fresh water (watered farms count, Expansionist batch E3); `cityCost` +2 with `notFreshwater`.

**The Cathedral Lodges** (tall: great works), after the masons' lodges that kept a cathedral's works going for generations: *"Manufactories yield twice as much. Towns with a Manufactory gain +30% production toward wonders and the Magnum Opus."* **Revised 2026-10-23.**
- **Your comment, 2026-10-23:** *"change: double the yields on all manufactories. Cities with a manufactory gain +30% production towards wonders and the magnum opus"* The text before: *"A great engineer's act does not use it up: it may act again twenty turns later. You earn half as much renown."*
- **Why:** the great works' engineers become a standing guild, and every act raises the land again with The Raising of the Land.
- **Drawback:** half the renown, which slows every great person, the artists and scholars too.
- **Pairs with:** A Court of Engineers (its +50% renown offsets the drawback); The Raising of the Land, The Master of Works.
- **Shape:** new. A great person kept after its act, with a wait before the next. The unit panel needs a line saying when it may act again. Existing renown percentage −50 (`cityRenownPercent` with `where: 'empire'`).

**The High Towns** (wide: highlands), after the cities of the Andes: *"Your towns may work mountains. Mountains gain +4 production, and each gives +1 production to the hexes beside it."* **Revised 2026-10-23.**
- **Your comment, 2026-10-23:** *"revise: You can work mountains. Mountain tiles gain +4 production and provide +1 production to adjacent tiles."* The text before: *"Your settlers may cross mountains and found towns on them. A town on a mountain gains +4 science and cannot grow beyond eight citizens."*
- **Why:** the highlands' late rule-breaker. The empire settles where nobody else can, and its science comes from the mountains.
- **Drawback:** a mountain town stays small.
- **Pairs with:** The Highland Clans; The Mountain Terraces, The Philosophers' Peaks.
- **Shape:** new, and the largest here. Settlers moving onto mountains, a town founded on a mountain, and the size cap for those towns (question 4).

**The Mandarinate** (wide: well-ordered realm), after the scholar-officials of imperial China: *"Each point of spare authority gives +1% science and culture, at most +30%. Each of your towns costs 1 more authority."*
- **Why:** the realm's spare authority becomes its learning.
- **Drawback:** every town costs more, which eats the spare authority the card reads.
- **Pairs with:** The Commanderies (cancels the drawback); The Sovereign Writ, The Imperial Roads.
- **Shape:** existing. Empire `pays` with the `authoritySurplus` count, as a percentage to science and culture; `cityCost` +1. It pays science and culture straight from a meter, which bends the gap rule (question 2).

**The Inward Roads** (wide: road network), after the Inca roads that carried no markets: *"Towns joined to your capital by road gain +20% science and culture. Your caravans may not travel to other empires."* **Revised 2026-10-23.**
- **Your comment, 2026-10-23:** *"revise: +20% science and culture."* The text before: *"Towns joined to your capital by road gain +20% food and production. Your caravans may not travel to other empires."*
- **Why:** the road network turns inward and feeds itself.
- **Drawback:** no foreign trade routes, which a Commerce partner relies on.
- **Pairs with:** The Royal Road; The Road Towns, Provincial Councils.
- **Shape:** existing `percentYields` +20 with `connected`. New, small: a rule that refuses foreign trade routes.

**Town and Country** (flex): ~~*"Your towns of ten or more citizens cost no authority, and the citizens of your smaller towns ask no happiness. Your towns grow 30% more slowly."*~~ **Cut 2026-10-23.**
- **Your comment, 2026-10-23:** *"remove, probably don't need to think about settling new cities in age 4."*
- **Why:** the flexing empire's late shape. Big towns are free of the authority limit and small towns of the happiness one, so both kinds can grow in number.
- **Drawback:** every town grows slowly.
- **Pairs with:** Synoecism (its faster growth for towns of six or more offsets the drawback); The Teeming Realm, The Great Households.
- **Shape:** existing. `cityCost` value 0 with `populationAtLeast` 10, `happinessDemand` −100 with `populationAtMost` 9, and `growthSurplus` −30.

**Arcadia** (tended land): *"Needs tended land. Your tended tiles also count as improved for every card."* **Revised 2026-10-23.**
- **Your comment, 2026-10-23:** *"remove the malice."* The text before: *"Needs tended land. Your tended tiles also count as improved for every card. Your workers can build only tended works."*
- **Why:** the splash's rule-breaker. The tended land pays the improvement build's cards too.
- **Drawback:** no new farms, mines or mills.
- **Pairs with:** Crop Rotation (its tended tiles count as improved, so they are not zeroed); The Manors, The Plough Teams, The Old Fields.
- **Shape:** new. Tended tiles counting as improved in the tile tests, and the refused improvement kinds (shared with The Wildwood Compact).

### New shapes, grouped

Twelve of the 32 use shapes that exist or nearly exist, and The Garden Peoples needs only the deal gate. The rest need these families, each read by more than one Doctrine where possible:
1. **A cap on a town's size:** The Seven Fat Years, The Liturgies, Empire Without End, and The High Towns for its mountain towns.
2. **The charge price of a worker's build:** none (Bound to the Soil, The Wildwood Compact for tended works) or two (The Georgics), and a cap on workers held (Bound to the Soil).
3. **Improvement kinds refused:** The Wildwood Compact (farms) and Arcadia (all but tended works).
4. **Food or production sent between towns each turn:** The Royal Works and The Annona.
5. **Founding:** by site (The Gift of the River), on a mountain with the settler's walk (The High Towns), with a road to the capital (The Royal Road), a settler that costs a citizen (The Planted Towns), and a settler granted with training refused (The Hiving).
6. **Refusal rules:** no buying (The Builder Kings), no foreign caravans (The Inward Roads).
7. **One each:** the age multiplier (The Georgics), the levy wait (The Liturgies), a reusable great person (The Cathedral Lodges), tended tiles counting as improved (Arcadia), and two negated scopes (`notOnHills`, `notConnected`) with a percentage on road maintenance.
8. **Deal gates on a Doctrine offer:** "Needs a levy" and "Needs tended land".

### Questions

1. **Caps on town size.** Four Doctrines use "cannot grow beyond N" as their drawback. *Recommended: yes, as one shape.* Food over the cap stays in the basket, so a levy and The Breadbasket still use it.
2. **The gap rule and The Mandarinate.** It pays science and culture straight from spare authority. *Recommended: keep it.* The meter is the route the rule already allows. If you rule the gap rule strictly, it pays production and gold instead.
3. **Unlimited worker charges with a cap on workers** (Bound to the Soil). *Recommended: yes.* It ends training workers again and again, and keeps the number of pieces low.
4. **Settlers on mountains** (The High Towns). It is the largest new shape here: movement, founding and a cap. *Recommended: keep it as the highlands' late rule-breaker if you like the mechanic,* since you liked workable mountains. If not, cut it.
5. **Deal gates on Doctrine offers.** *Recommended: yes,* "Needs a levy" and "Needs tended land" as on the Orders, so that a seat is not offered a Doctrine it cannot use.
6. **Bans as drawbacks.** Five Doctrines forbid something outright: buying, new farms, foreign caravans, settlers, or all works but tended ones. *Recommended: accept them.* Each is clear on the card, and each binds only the seat that chose the plan.
7. **How many to keep.** The card-design skill plans three to five a tier. *Recommended: keep four or five a tier,* with every flavour reaching at least two tiers.

### Your comments, 2026-10-23

You commented on 22 of the 32 Doctrines on the review page. Each comment is quoted under its entry above. The result:

| Tier | Kept as written | Revised | Cut | Remain |
|---|---|---|---|---|
| I | Bound to the Soil, Synoecism, The Highland Clans, The Commanderies | The Gift of the River | The Seven Fat Years, The Sacred Spring, The Royal Road | 5 |
| II | The Liturgies | The Georgics, The Curator of Waters, The Censors, The Wildwood Compact | The Royal Works, Free Mining, The Hiving | 5 |
| III | Crop Rotation, The Builder Kings, All Roads Lead to Rome, The Planted Towns | The Contented City, Empire Without End, The Garden Peoples | The Annona | 7 |
| IV | The Mandarinate | The Physiocrats, The Hydraulic Empire, The Cathedral Lodges, The High Towns, The Inward Roads, Arcadia | Town and Country | 7 |

Most revisions remove the drawback (your word was "malice"). Six of the 24 now carry none: The Georgics, The Curator of Waters, The Garden Peoples, The Physiocrats, The Hydraulic Empire and Arcadia.

**Readings, to confirm:**
1. **The Gift of the River:** "cost +2 happiness" means each town away from fresh water has 2 less happiness. It uses the `notFreshwater` scope that The Hydraulic Empire used.
2. **The Censors:** "win the census" means leading it. Each census already names a leader (`censusLeaderOf`, `census.ts`). The +1 happiness adds up: each census you lead gives every town +1 more for the rest of the game.
3. **The Wildwood Compact:** the new drawback replaces the old one (no farms). "All new workers" means the workers you train, buy or are granted after you take the Doctrine.
4. **Empire Without End:** "+1 authority in every town" means +1 authority for each town you hold, not a town that costs 1 less. Both its old halves go (free founding and the cap at twelve).
5. **The Hydraulic Empire:** "fresh water tiles" means worked hexes with fresh water, the test the farms' renewal reads. There are six public works, so a hex gains at most +6 of each. No cap is needed.
6. **The High Towns:** each mountain gives +1 production to every hex beside it, so a hex beside two mountains gains +2. The other reading is +1 once, whatever the number of mountains. Working mountains is a new shape.
7. **The Inward Roads:** your comment changed the yields only, so the drawback (no foreign caravans) stays. If you meant "no malice" here too, it goes.
8. **The Physiocrats:** you asked for it to be stronger than Crop Rotation. The proposal is +2 food, +2 production and +2 gold on every improved tile, with no drawback: about 480 a turn across eighty improved tiles in age 4. Change the numbers if that is too much.

**Questions:**
1. **The Builder Kings** is still about wonders, which left Expansionist on 2026-10-20 (the themes pass flagged it with The Royal Works, which you cut). *Recommended: cut it,* or move it to Magisterial's Doctrines when that deck gets its own.
2. **The Cathedral Lodges'** new second clause gives production toward wonders and the Opus. It is your own text, so it stands; it is the one place Expansionist reaches wonders now.
3. **What your cuts and revisions change in the questions above:** question 1 (caps on town size) now covers only The Liturgies; question 3 (Bound to the Soil) is unchanged; question 4 (settlers on mountains) is gone, because The High Towns now works mountains instead; question 6 (bans) now covers only The Builder Kings and The Inward Roads. Two families of new shapes are gone: food or production sent between towns (The Royal Works, The Annona) and founding refused by site.
