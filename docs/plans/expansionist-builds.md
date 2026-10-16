# Expansionist: five finished builds, early and late, and the card types (proposal)

**Status:** proposal for the user's review, 2026-10-16. Nothing here is built, and the deck sheet (`docs/decks/expansionist.md`) is unchanged. Once the user rules, the builds go into the skill's deck map (`.claude/skills/card-design/references/deck-maps.md`) and the Type column goes onto the sheet.

The user, 2026-10-16, verbatim:

> *"ok, i'm feeling much better about the dominion deck. Could you do a similar pass as everything we did for the dominion deck for the expansionist deck? Start by analyzing the themes and playstyles for the deck, then create five 'builds' for the early and late game. Sort all existing cards into military/economic/civic/wildcard."*

The method is the one the user approved for Dominion (`docs/plans/dominion-builds.md`) and the card-design skill's "Finished builds": one loop per build on a quantity the playstyle makes by itself, an early and a late version, an early scaler that carries over, a capstone and a moment, utility earned from the build's own quantity, and new cards wherever the sheet has a gap (*"You're not limited to cards that already exist or are proposed, focus on creating a satisfying playstyle and synergistic bonuses"*).

## How to read this

- **Chairs:** 3 at the start, 5 from draft 4, 8 from draft 18 (Tier II), 11 from draft 29 (Tier III). Tier IV cards open at draft 38.
- **Early build:** the eight chairs at the end of Tier II (about turns 114 to 159 in bot games), and its **five-chair core** for Tier I (about turns 55 to 114).
- **Late build:** eleven chairs of Tier III and IV cards, plus the one or two early cards that grew.
- **Status:** *live* (in the game; *built as* when it does something slightly different from the text), *deferred* (in the data, not dealt), *proposed* (the sheet's "Proposed revision" of 2026-10-13, not ruled on yet), **new** (this draft).
- **Shape:** *existing* names the effect kind that already says it; *new shape* says what is missing. The families are under "Across the builds".
- **Type:** Military, Economic, Civic or Wildcard, by the rules in `docs/plans/doctrines-governments-chairs.md` §4. New cards are typed in the build tables; the sheet's cards in "The sort".
- **Chairs line:** typed chairs are being built (`docs/plans/chairs-build.md`). Each version names the government that seats most of it. Every government but the Republic has a Military chair, so most councils give one or two chairs to the partner deck.
- **Charters take no chair.** The four tended-work unlocks are held, not seated.
- **Numbers are first guesses** against `.claude/skills/card-design/references/power-bar.md`. The user's priority is shape (2026-10-13).

## Five facts that shape every build

1. **Tier 0 lasts about six drafts,** so an early build holds two Tier 0 cards, three at most.
2. **Capstones sit in Tier III.** Tier IV opens at draft 38 since 2026-10-15; how often seats reach it is not measured yet.
3. **The gap rule.** Expansionist takes science and culture only from terrain: science from mountains and hills, culture from wild land, old forest and coast (`docs/decks/deck-design.md`, "Avoid"). Each build reaches that terrain through its own quantity. The game adds a second route that the rule allows, because the card pays happiness or authority and not science: spare happiness pays +10% science and culture at 5 points and +20% at 10, and spare authority the same on production and border growth (`meterEffectsOf` in `src/sim/meters.ts`, `meters.tiers` in `data/rules.json`). The cards that raise the two limits are the deck's science and culture as much as its terrain cards are.
4. **Expansionist is almost all Economic.** 42 of its 62 cards are Economic and one is Military ("The sort"). Under typed chairs a seat's Military chairs go to the partner deck unless a build brings its own; this draft adds three Military cards where they fit.
5. **The measurements under-read this deck.** The per-turn ghost diff cannot see a founding, a worker charge, renown or food kept: The Seed Grain, The Beating of the Bounds, Tinkers' Guild and The Master Builders read 0, and The Patient Harvest −0.7 (`docs/plans/card-measurements-2026-10-13.md`). Bots do not levy (`docs/README.md`), so no levy card has a reading, and the levy build cannot be measured until they do.

## The five at a glance

| Build | The loop | The moment | Early scaler | Tier III capstone | Tier IV |
|---|---|---|---|---|---|
| **The managed wild** (tended land) | tend the wild → tended land is worth working and still counts as wild → every wild tile worked pays culture, faith and happiness → the food grows towns that work more of it | a town's burning | The Managed Wild, The Old Songs | The Food Forest | The Garden of the World, The Two Harvests, The World Tree |
| **The old fields** (the field and public works) | raise works early → the older a work, the more it pays → its surplus and renown call engineers → each engineer raises a town's land for good | a work finished; an engineer's act | The Old Fields, The Highlands | The Raising of the Land | The Master of Works, The Domesday Survey |
| **The open frontier** (the wide empire) | found a town → it claims land and joins the roads → worked, connected towns cost less authority → room for the next town | a town founded | The Book of Settlements, The Wild Marches | The Imperial Roads | The Measure of the Land, The Encroaching Fields |
| **The great city** (the tall empire) | feed and water a few towns → they grow → water and food keep them content, and a content empire learns → every citizen pays production | a town reaching fifteen or twenty | The Great Households, The Grain Census | The Megalopolis | The Mother City, The Land's Great Work |
| **The people's levy** (levies) | grow a citizen → spend it on hammers, a soldier or a work → the levy leaves food behind and the town regrows → spend again | a levy; the days of service | The Labour Rolls, Levy of the Land | The Mit'a | The Corvée, The General Levy |

---

## Themes and playstyles

### The deck's materials

"Self-producing" means an Expansionist game makes it whether or not a card asks. These are the best anchors.

| Material | Self-producing? | Where it lives in the sim | On the sheet today |
|---|---|---|---|
| **Citizens and growth** | Yes | `City.population`; the `growth` occasion (`settleGrowth`), filterable by `atPopulation`; counts `population`, `capitalPopulation`; scopes `populationAtLeast`/`AtMost`. Each citizen also pays half a science (`cities.sciencePerPop`). | about fifteen cards raise food or citizens; five read citizens |
| **Levies** (a citizen spent) | Only once a card grants a use | `levies.ts`: `levyCitizen`, uses `production`, `muster`, `opus`, `conscript`; one levy per town every five turns from `City.levy.turn`; the `levy` effect's `after` | four cards grant a use; one reads a levy (Seasonal Levies, Tier III) |
| **Towns founded** | Yes, mostly in age 1 | `foundCityAt` and the `found` occasion; `foundingRider` (citizens, a building, roads, claims); the `newest` scope | three cards raise it; only Daughter Towns reads it, as towns under five citizens |
| **Hexes owned** | Yes: borders grow | `tilesInBorders` with a tile test; `City.tilesClaimed`; `purchaseTileAt` (`tilePurchase` occasion, `hexBought` tally, `Player.tilesPurchased`) | read by The Naturalists (hills and mountains only), then not until Tier IV |
| **Improvements and their age** | Yes | `Tile.improvement`, `Tile.improvedOn` (read by the `standingSince` test); the `improvementBuilt` occasion, live since batch S | read well: Smallholdings, Dark Earth, The Highlands and nine more |
| **Wild and tended land** | Wild land yes, early; tended once a charter is held | the `unimproved` and `tended` tests; the `workedUnimprovedTiles` count; the `needsTendedWork` deal gate | four charters raise it; about ten cards read it |
| **Terrain** | From the map | hills and mountains (`adjacentMountain`, `mountainAdjacent`, `terrainInBorders`), fresh water, coast, desert and tundra, forest | the deck's science and culture |
| **Happiness and authority** | The limits every empire meets | `meters.ts`: each citizen asks 1 happiness; authority is 6 from the palace and 2 an age, and a founded town costs 3; a deficit stifles growth or freezes borders; spare points pay the tiers described in fact 3 above | Civic cards: The Commons, The Local Census, Provincial Councils, The Grain Dole, The Waterworks |
| **Roads and connected towns** | Yes | `Tile.road` (`layRoad`), the `connected` scope, `roadHexes` | Provincial Councils; Pachacuti's ability |
| **Moments of working the land** | Yes | the `chop`, `prospect`, `veinFound`, `discovery` and `camp` occasions | The Woodwrights (chops), The Prospectors (seams) |
| **Engineers and manufactories** | With renown from works | the `greatPersonAct` occasion; Rush the Works pays 40 hammers × the age (`engineerHammers`); a Manufactory pays +3 production | The Master Builders, A Court of Engineers, The Master of Works |

### Five playstyles

Each is a build below, and the sources are that build's cards.

| Playstyle | Leans on | Science from | Culture from | Production from |
|---|---|---|---|---|
| **The managed wild** | wild land worked, tended land, worker charges | tended land beside mountains (The Cloud Gardens); mountains owned (The Philosophers' Peaks); the happiness tier (The Commons) | wild land worked (The Old Songs), tiles tended (The Tending Songs), wild towns (The Hallowed Woods), tended land (The Garden of the World) | tended land (The Tended Country, The Managed Wild, The Garden of the World); the Opus town's gardens (The World Tree) |
| **The old fields** | improvements and their age, prospecting, engineers | hill mines and quarries (The Highlands); mountain towns (The Mountain Schools) | old lumber mills (The Forest Keepers, The Royal Forests) | works finished (The Rope Stretchers); old works (The Old Fields, Old Workings); engineers (The Raising of the Land, The Master of Works) |
| **The open frontier** | towns founded, hexes owned, roads, authority | hills and mountains claimed (The Naturalists, The Philosophers' Peaks) | wild hexes owned (The Wild Marches); wild towns (The Hallowed Woods) | towns founded (The Book of Settlements); hexes owned (The Measure of the Land); the authority tier (The Imperial Roads) |
| **The great city** | citizens, food, water, happiness | its citizens; mountain towns (Hydraulic Schools, The Mountain Schools); the happiness tier | coastal towns (The Harbour Cities, The Harbour Festivals); the happiness tier | growth (The Grain Census); citizens (The Great Households, The Mother City); milestones (The Freedom of the City) |
| **The people's levy** | citizens spent, and regrowth | levies in mountain towns (The Terraces of Moray); The Mountain Schools | wild land after a levy (The Labour Feasts); world wonders built by levies (The Builders' Levy) | levies (Levy of the Land, The Mit'a, The Days of Service, The Corvée); regrowth (Granary Levies, Plenty); levies this game (The Labour Rolls) |

### How the deck pairs with the other five

The currency test (`deck-design.md`): Expansionist makes food and land and spends them on citizens and claims.
- **Dominion** (Mithridates VI): the frontier. Citizens become soldiers (the shared The Muster of the Fields, The General Levy, The Trained Bands), new towns hold garrisons, and authority relief holds conquests (The Imperial Roads, The Local Census). Dominion gives back cleared ground (The Barbarian Frontier) and the Military cards for the chairs Expansionist cannot fill. Best with the levy (the endless host) and the frontier (the drilled legions, the conqueror). Shared: Military Colonies, The Muster of the Fields, The Barbarian Frontier, The Road Garrisons, Marcher Lords.
- **Commerce** (Pachacuti): the land and the market. Gold buys hexes, workers and settlers, and land pays gold back (The Quitrents; Commerce's Ore Caravans, The Customs Houses and The Merchant Dynasties already count hexes owned). Best with the frontier and the old fields. Shared: Market Gardens, The Grain Exchange, The Provincial Fair.
- **Devotion** (no leader): wild land and faith. Wild and tended land pays faith (The Spirits of Place, Sacred Groves, and The Flood Festival, which pays on every tile The Fire Mosaic burns), and big towns hold more followers. Best with the managed wild and the great city. Shared: Sacred Groves, The Flood Festival.
- **Scientific** (Nezahualcoyotl): the engineers. The most direct cover for the science gap: its charters bring public works early and its cards read the hills and population this deck raises. Best with the great city and the old fields. Shared: Hydraulic Schools.
- **Magisterial** (no leader): shaping territory. It covers the culture gap, and its works sit beside tended land and farms (The Landscape Garden; the shared The Sculpted Landscape, Garden Provinces, Garden Cities). Best with the managed wild and the old fields.

### Leaders

- **Mithridates VI** (Dominion, Expansionist): +2 strength against an empire holding more cities; +2 food on plantations and camps. A small, strong empire is his best fit, and The Polis gives the great city a card that rewards staying small; nothing on today's sheet does.
- **Pachacuti** (Expansionist, Commerce): connected towns pay +1 happiness and +1 production; farms pay +1 gold per mountain beside them; terraces. He points at the frontier (Provincial Councils, The Imperial Roads) and the old fields. By history he also fits the levy: the mit'a was Inca.
- **Nezahualcoyotl** (Expansionist, Scientific): aqueduct towns pay culture and their farms production; a big capital pays culture. He points at the great city.
- No leader points at the managed wild or, by ability, at the levy.

### Where the sheet is thin

- **By tier:**
  - Tier 0 has no culture card and no Military card, and one rare (The Patient Harvest).
  - Tier I has no rare. Levy of the Land is the one card that changes what a player does (the charters too, but they take no chair).
  - Tier III has nine cards and three are deferred: six dealt cards for the band that fills eleven chairs. The wide empire has only The Wide Country there and the tall empire nothing dealt.
  - Tier IV holds most of the deck's readers of land and citizens (The Measure of the Land, The Mother City, The Land's Great Work), too late to build around.
- **By role:**
  - No grower and no "this game" count anywhere, so nothing early carries into the late game.
  - The deck's own payouts on moments are two, Granary Levies (growth) and The Woodwrights (chops), and the shared The Flood Festival adds a third. Nothing pays on a founding, a levy, a tile tended, a hex claimed or a work finished (The Rope Stretchers is deferred).
  - Raisers outnumber readers: about fifteen cards raise food and citizens and five read citizens; four grant a levy and one reads it; three raise foundings and only Daughter Towns reads them.
  - Glue is the largest share: flats on terrain and improvements. Measured, they pay well: The Hard Country 137 a turn (Tier I) and The Highlands 265 (Tier II, the fourth best card in the bot games); the shared Marcher Lords paid 279, the second best.
- **The user's playtest** (Mithridates, 2026-10-12): The Fish Traps and Sacred Groves "very good", Levy of the Land *"soooo good, great card"*, Six Gardens "not very good", and midgame options did not feel impactful.

---

## 1. The managed wild (tended land)

**The fantasy.** The planted forests of the Amazon, the eel traps of Budj Bim, the fire mosaics of the Australian grasslands: land that looks untouched to a stranger and is a garden to the people who keep it. You do not clear the forest; you tend it. Tended land is still wild, so it pays the deck's culture, and the longer it is tended the richer it gets.

**The loop:** tend the wild → tended land is worth working and still counts as wild → every wild tile worked pays culture, faith and happiness → the food grows towns that work more of it.
- **The quantity:** wild tiles worked, which every early town has, and tended tiles, which workers add once a charter is held. The wild-land readers count tended tiles, so tending keeps wild land worth working after farms arrive.
- **What it spends:** worker charges, and the farm's extra food and the resource on each hex it tends.

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Spirits of Place | 0 | common | Your capital gains +1 faith. Towns working at least two wild tiles gain +1 faith. | opener | reads wild tiles worked | faith | Civic | live (proposed trim: the wild half only); existing |
| The Tending Songs | 0 | uncommon | Needs tended land. While seated, this card gains +1 culture for every two tiles you tend. It starts at +1 culture. | grower | reads tiles tended | culture | Civic | **new**; new shape (a tally of tiles tended) |
| The Old Songs | I | common | Worked wild land gains +2 culture. | pay-off | reads wild tiles worked | culture | Civic | live; existing |
| The Commons | I | uncommon | Each town gains +1 happiness for every two wild tiles it works, at most +3. | pay-off | reads wild tiles worked | happiness | Civic | live; existing |
| The Garden Frontier | I | rare | Workers may tend unowned wild hexes up to two hexes beyond your borders. A hex tended there joins your nearest town. | build-defining: a broken rule | raises tended tiles and hexes | land | Economic | **new**; new shape (a work outside your borders that claims its hex, shared with Outposts) |
| The Managed Wild | II | uncommon | Each town gains +3% food and production for every tended tile in its borders, at most +30%. | early scaler | reads tended tiles owned | food, production | Economic | proposed (from Tier III, resized); existing (`pays` count, `tilesInBorders` with `tended`) |
| The Tended Country | II | uncommon | Needs tended land. Tended tiles gain +2 production. | pay-off | reads tended tiles | production | Economic | live (proposed split: its farm half becomes The Hedgerows) |
| The Cloud Gardens | II | common | Needs tended land. Tended tiles beside a mountain gain +3 science. | utility: science | reads tended tiles by mountains | science | Civic | **new**; existing (hex `pays` on `tended` and `adjacentMountain`) |

- **Held without a chair:** The Forest Gardens and The Fish Traps (Tier 0), The Wild Orchards and The Burning Season (Tier I).
- **Five-chair core** (Tier I): The Spirits of Place, The Tending Songs, The Old Songs, The Commons, The Garden Frontier.
- **Chairs:** Priest-King or the Theocracy seats four of the core beside the partner's Military card; the Merchant League seats seven of the eight.
- **Sizing:**
  - **The Tending Songs:** from the first charter (about turn 15) a seat tends a tile every three or four turns, so the card reads about +4 culture by turn 40, when a seat makes 3 a turn. Early culture is worth about three times its face, so that is band 0's headline. About +10 by turn 100.
  - **The Old Songs:** four worked wild tiles in each of six towns pay about 48 culture a turn at turn 100, twice a typical seat's culture then.
  - **The Managed Wild:** five tended tiles in a town's borders give +15%: about 40 food and production a turn over eight towns when Tier II opens, and about 240 a turn at +30% in age 4.
  - **The Cloud Gardens:** four tended tiles beside mountains pay +12 science. On a lowland map it pays little, as the gap intends.
- **How a few turns feel:**
  - Turn 20: the capital's worker tends two forest gardens instead of felling the wood. The Tending Songs reads +2, and the second draft comes three turns sooner.
  - Turn 75: a worker tends fish traps two hexes past the border, and the coast joins the town. Six towns work their wild land for about 40 culture, and The Commons keeps them content.
  - Turn 125: towns ringed with gardens grow and build a fifth faster, and the gardens under the mountain pay science.
- **Also fits:** Tier 0: Sacred Groves (Devotion), The Gatherers (proposed); Tier I: Tinkers' Guild, Six Gardens (reworked), The Flood Festival (Devotion); Tier II: The Landscape Garden (Magisterial), The Mosaic (proposed).

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Managed Wild | II | uncommon | (above) | carried scaler | reads tended tiles owned | food, production | Economic | proposed |
| The Old Songs | I | common | (above) | carried | reads wild tiles worked | culture | Civic | live |
| The Long Tending | III | rare | Needs tended land. Tended tiles gain +2 food for every 25 turns since they were tended, at most +6. | pay-off: age | reads tending's age | food | Economic | live |
| The Food Forest | III | rare | Tended tiles in your borders pay their food to their town even when nobody works them. | capstone: a broken rule | reads tended tiles owned | food | Economic | **new**; new shape (a yield from a tile nobody works) |
| The Fire Mosaic | III | uncommon | Once every twenty turns, each of your towns may burn: every wild grassland and plains hex in its borders becomes burned country at once. | the moment | raises tended tiles | land | Economic | **new**; new shape (a town's action on a cycle: the half of The Burning Season D3 left unbuilt) |
| The Hallowed Woods | III | uncommon | Towns working at least five wild tiles gain +25% culture. | percentage on the flats | reads wild tiles worked | culture | Civic | **new**; existing (`percentYields`, `workingTiles` scope) |
| The Garden of the World | IV | rare | Needs tended land. Tended tiles gain +2 food, +1 production and +1 culture. | finisher: flats | reads tended tiles | food, production, culture | Economic | live (proposed trim: the happiness clause goes) |
| The Inheritance of Fields | IV | uncommon | Works and tended tiles that have stood 60 turns gain +1 production; tended ones also gain +1 culture. | pay-off: age | reads age | production, culture | Economic | live |
| The Two Harvests | IV | rare | Needs tended land. A worked farm, mine or lumber mill may also be tended, keeping both yields. | long-game rule-breaker | doubles the tended count | — | Economic | deferred; new shape (a tile holding two works) |
| The World Tree | IV | rare | The town raising the Magnum Opus gains +4% production toward it for every tended tile in its borders. | finisher: the win | reads the Opus town's tended tiles | production toward the Opus | Economic | **new**; existing (`productionBonus` toward the Opus with a count, as The Land's Great Work) |
| The Philosophers' Peaks | IV | uncommon | Each town gains +2 science for every mountain in its borders, at most +6. | utility: science | reads mountains owned | science | Civic | live |

- **Carried over:** The Managed Wild at +30%, and The Old Songs, about 120 culture a turn from sixty worked wild tiles in age 4 (a median seated card then pays 62).
- **The capstone, The Food Forest:**
  - A town tends every wild hex it owns, not only the ones its citizens can work, and the gardens feed it either way, The Garden Frontier's far claims included.
  - Citizens move to mines and specialists while the food keeps coming, so towns grow past what their own labour could feed.
- **The moment, The Fire Mosaic:** a town's grassland burns in one turn and comes back as six to eight tended tiles, which every tended card pays on at once. With Devotion, The Flood Festival pays 8 faith for each.
- **Sizing:**
  - **The Food Forest:** ten tended tiles in a town, five unworked, at about 5 food each (The Long Tending, The Garden of the World) feed it about 25 more food; about 200 a turn over eight towns.
  - **The World Tree:** fifteen tended tiles around the Opus town build it 60% faster, beside The Land's Great Work's +40%. Late engines may be uncapped (ruling of 2026-10-12).
- **How a few turns feel:**
  - Turn 160: three towns burn on the same turn. Twenty hexes of grassland become burned country, and with Devotion 160 faith arrives.
  - Turn 175: the capital's gardens, tended since turn 30, pay +6 food each from age alone, and The Food Forest feeds it from tiles nobody works. It passes twenty-five citizens.
  - Turn 190 (Tier IV): The Two Harvests tends the farms as well, and The World Tree puts +64% on the Opus.
- **Chairs:** the Estates seat nine; the two Military chairs go to the partner.
- **Without Tier IV,** The Tended Country, The Cloud Gardens and The Commons hold the chairs, and the build keeps its capstone.
- **Also fits:** The Mountain Schools; with Magisterial, The Landscape Garden and The Sculpted Landscape. The Woodwrights does not: it fells what this build keeps.

- **Utility mix:** culture (The Tending Songs, The Old Songs, The Hallowed Woods, The Garden of the World); faith (The Spirits of Place, and with Devotion, Sacred Groves and The Flood Festival); happiness and the science and culture tier (The Commons); science (The Cloud Gardens, The Philosophers' Peaks, mountains only); production (The Tended Country, The Managed Wild, The Inheritance of Fields, The World Tree).
- **Gives up:** the farm's raw food early, the resources under tended land (tended works open none), science on a lowland map, and worker charges that could have built mines.
- **Partners:** Devotion (wild land pays faith); Magisterial (works beside tended land, and culture).
- **Leader:** none today. Mithridates' ability pays camps and plantations, which are improvements, not tended land.

---

## 2. The old fields (the field and public works)

**The fantasy.** The Nile valley, the Po plain, the rice terraces of Song China, England's open fields: land worked for centuries. A field raised early pays more every decade, the hill mines teach, and engineers water and raise what the farmers built. Slow to start, and very deep.

**The loop:** raise works early → the older a work, the more it pays → its surplus and renown call engineers → each engineer raises a town's land for good → raise more works.
- **The quantity:** improvements and their age (`Tile.improvedOn`, read by `standingSince`), which every empire builds.
- **What it spends:** time. A work pays late, and a work replaced starts its age again.

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| Smallholdings | 0 | common | Worked farms and pastures gain +1 food and +1 gold. | foundation glue | reads farms and pastures | food, gold | Economic | live |
| The Rope Stretchers | 0 | common | When one of your workers finishes a mine, quarry or lumber mill, the town that owns the hex gains 10 production. | opener: a moment | reads works finished | production | Economic | deferred; now existing (an `improvementBuilt` rider per work; the occasion went live with The Flood Festival) |
| Dark Earth | I | uncommon | Worked farms gain +2 food once they have stood 20 turns, and +2 more at 50. | pay-off: age | reads farms' age | food | Economic | live |
| The Prospectors | I | common | Prospecting costs workers and explorers no charge. Worked mines on a seam you surfaced gain +3 production. | changes what the player does | raises seams | production | Economic | live (built as) |
| The Forest Keepers | I | common | Lumber mills that have stood for twenty turns gain +2 culture. | utility: culture | reads mills' age | culture | Civic | **new**; existing (hex `pays` on a lumber mill and `standingSince`) |
| The Master Builders | I | common | Towns working at least three mines, quarries or lumber mills give +1 renown a turn, favouring great engineers. | engine | raises engineers | renown | Civic | live |
| The Old Fields | II | uncommon | +1% food and production for every three works that have stood thirty turns, at most +30%. | early scaler | reads old works | food, production | Economic | **new**; existing (empire `pays` count, `tilesInBorders` with `improved` and `standingSince`) |
| The Highlands | II | common | Mines and quarries on hills gain +2 science and +1 production. | utility: science | reads hill works | science, production | Civic | live; 265 a turn measured |

- **Five-chair core** (Tier I): Smallholdings, The Rope Stretchers, Dark Earth, The Prospectors, The Forest Keepers.
- **Chairs:** the Republic seats the whole core; the Merchant League seats seven of the eight.
- **Sizing:**
  - **The Rope Stretchers:** four to six mines, quarries and mills by turn 50 pay 40 to 60 production. Raise it to 15 a work if it measures low.
  - **The Forest Keepers:** six mills raised by turn 70 pay +12 culture by turn 90, half a seat's culture then.
  - **The Old Fields:** about +10% when Tier II opens (thirty works older than thirty turns), about 25 food and production a turn; about +23% by turn 160, about 200 a turn in age 4.
- **How a few turns feel:**
  - Turn 25: two mines go up on the capital's hills. The Rope Stretchers pays 10 production for each, and the next settler's escort is half built.
  - Turn 80: the oldest farms pass twenty turns, and Dark Earth adds +2 food to each. A worker prospects a hill and finds iron; the mine on it pays +3.
  - Turn 130: the first fields are fifty turns old. The Old Fields reads +12%, and the renown from the mining towns brings the first great engineer.
- **Also fits:** Tier 0: Market Gardens (Commerce); Tier I: The Three Sisters, Tinkers' Guild; Tier II: The Watercourses, The Engineers' Yards.

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Old Fields | II | uncommon | (above) | carried scaler | reads old works | food, production | Economic | **new** |
| The Highlands | II | common | (above) | carried | reads hill works | science | Civic | live |
| The Raising of the Land | III (from IV) | rare | When a great engineer rushes the works in one of your towns, every improved or tended tile in its borders gains +1 food and +1 production for the rest of the game. | capstone: the land raised for good | reads engineers' acts | food, production | Economic | deferred; revised to ride the engineer's existing act, so no new button; new shape (a lasting mark on tiles) |
| A Court of Engineers | III | rare | Gain +50% renown, but great-person offers contain only great engineers. | engine | raises engineers | renown | Civic | live |
| The Mountain Schools | III | uncommon | Towns beside a mountain gain +15% science. | percentage on the flats | reads mountain towns | science | Civic | live (proposed trim) |
| The Royal Forests | III | uncommon | Towns working at least three lumber mills gain +25% culture. | percentage on the flats | reads mill towns | culture | Civic | **new**; existing (`percentYields`, `workingTiles` scope) |
| Old Workings | III | common | Worked mines, quarries and lumber mills that have stood for twenty turns gain +3 production. | pay-off: age | reads works' age | production | Economic | proposed (from Tier II, resized); existing |
| The Woodwrights | III | rare | Forest and jungle chops grant 150% more production. | pay-off on a moment | reads chops | production | Economic | live |
| The Master of Works | IV | rare | A great engineer's act pays 50% more. | finisher: the win | reads engineers' acts | production | Economic | live (built as) |
| The Inheritance of Fields | IV | uncommon | (build 1) | pay-off: age | reads age | production | Economic | live |
| The Domesday Survey | IV | rare | Commission. Own 150 hexes and work 50 improved or tended tiles at once. Then production in the capital and a great engineer. | the late goal | reads works and hexes | production, an engineer | Wildcard | live (built as) |

- **Carried over:** The Old Fields at +23% to +30%, and The Highlands, whose science grows with every hill mine.
- **The capstone, The Raising of the Land:**
  - Raising the land is the deck's own objective (`deck-design.md`, bonus theme 2), done at full size by its own great people.
  - Each engineer raises a town of about twelve works by +1 food and +1 production each, for good, on top of the act's 40 hammers × the age. A Court of Engineers brings one every ten to fifteen turns.
- **The moment:** an engineer's act. The capstone makes every act raise a town, and The Master of Works makes the act half again as big.
- **Sizing:**
  - **Old Workings:** 25 works older than twenty turns pay +75 production, band 3's regular card.
  - **The Royal Forests:** +25% on four mill towns is about 40 culture a turn, below the bar. That is the culture gap; it multiplies the flats the build already has.
  - **The Raising of the Land:** four acts over Tiers III and IV raise four towns by about +24 food and production each: about 100 a turn by turn 190, and it never fades.
- **How a few turns feel:**
  - Turn 160: an engineer rushes a Forge in the river town, and its fourteen farms and mines each gain +1 food and +1 production for good.
  - Turn 175: the hill mines beside the mountain pay +2 science each, and the town another 15%.
  - Turn 190 (Tier IV): engineers rush the Opus at +50% each, and The Domesday Survey closes and calls one more.
- **Chairs:** the Estates or the Curia seat nine.
- **Without Tier IV,** The Engineers' Yards, The Watercourses and Dark Earth hold the chairs.
- **Also fits:** The Heartland (deferred; tiles raised to five yield), The Sculpted Landscape (Magisterial), Public Works (see "Sheet cards no build uses").

- **Utility mix:** production (The Rope Stretchers, The Prospectors, The Old Fields, Old Workings, The Raising of the Land, The Master of Works); science (The Highlands, The Mountain Schools); culture (The Forest Keepers, The Royal Forests); food and gold (Smallholdings, Dark Earth); great people (The Master Builders, A Court of Engineers).
- **Gives up:** tempo, wild-land culture and faith, and flexibility.
- **Partners:** Scientific (mines and quarries; charters bring public works early); Commerce (the same mines pay gold there); Magisterial (manufactories are works).
- **Leader:** Pachacuti (farms beside mountains pay gold; terraces).

---

## 3. The open frontier (the wide empire)

**The fantasy.** The Greek colonies around the Mediterranean, the Russian push across Siberia, the homesteads of the American plains. Towns everywhere, the land between them claimed and joined by road. Authority is the limit, and the deck lifts it for towns that are worked and connected, as the spec asks: relief is earned, not given.

**The loop:** found a town → it claims land and joins the roads → worked, connected towns cost less authority → room for the next town, and every hex owned pays.
- **The quantity:** towns founded and hexes owned, which every empire makes in age 1 and this build keeps making.
- **What it spends:** authority. A founded town costs 3 against the palace's 6 and 2 an age (`meters.authority` in `data/rules.json`), and any deficit freezes every border.

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Frontier Militia | 0 | common | Each town you found starts with the best melee unit you can build standing in it. | opener: safe settling | raises towns | defence | Military | **new**; nearly existing (the `found` occasion's unit grant names a random military unit today) |
| The Seed Grain | 0 | uncommon | Towns you found start with one extra citizen. | opener | raises towns | growth | Economic | live |
| The Naturalists | 0 | uncommon | Each town gains +1 science for every two hills or mountains in its borders, at most +3. | utility: science | reads hexes owned | science | Civic | live |
| The Local Census | I | common | A town working at least four improved or tended tiles costs one less authority, minimum one. | pay-off: room | reads worked land | authority | Civic | live |
| Outposts | I | uncommon | Workers may plant an outpost on a wild tile within three hexes of your border, for one charge. It claims its hex and the ring around it for your nearest town and costs no authority. | build-defining: a new action | raises hexes | land | Economic | deferred; new shape (a work outside your borders that claims ground) |
| The Wild Marches | I | common | +1 culture for every five wild hexes you own. | pay-off: culture | reads wild hexes owned | culture | Civic | **new**; existing (empire `pays` count, `tilesInBorders` with `unimproved`) |
| Provincial Councils | II | uncommon | Connected towns other than the capital cost one less authority, minimum one, and gain +1 happiness. | pay-off: room | reads connected towns | authority | Civic | live (proposed trim) |
| The Book of Settlements | II | uncommon | +3% production and gold for every town you have founded this game, at most +30%. | early scaler | reads towns founded this game | production, gold | Economic | **new**; new shape ("this game" count: towns founded) |

- **Five-chair core** (Tier I): The Frontier Militia, The Seed Grain, The Local Census, Outposts, The Wild Marches. The Naturalists joins with the eighth chair.
- **Chairs:** Priest-King seats the whole core, with the Militia in its Military chair; the Merchant League seats all eight.
- **Sizing:**
  - **The Frontier Militia:** three or four towns in age 1 each start with a Warrior or Spearman (15 to 27 hammers) where barbarians strike first: about 70 hammers over the age, and no town lost. `docs/six-decks-coverage.md` proposed it by name for the deck's missing early defence.
  - **The Wild Marches:** about 55 wild hexes at turn 70 pay +11 culture, almost half a seat's 25.
  - **The Book of Settlements:** seven towns founded by turn 114 give +21%, about 30 production and gold a turn; ten by turn 160 give +30%, about 230 a turn in age 4.
  - **Outposts:** one charge claims seven hexes.
- **How a few turns feel:**
  - Turn 30: the third settler founds beside a barbarian camp with a Spearman already inside, and the town starts at two citizens.
  - Turn 80: two outposts claim the river valley between your towns before a neighbour's border reaches it. Every town works four improved tiles and costs one less authority, so the next settler fits.
  - Turn 130: nine towns joined by road. Provincial Councils keeps authority above +5 (+10% production and border growth), and The Book of Settlements reads +27%.
- **Also fits:** The Beating of the Bounds, Daughter Towns, The Hard Country (137 a turn measured); the shared Marcher Lords (279, the best card the deck can draw), Military Colonies, The Barbarian Frontier, The Road Garrisons; The Land Grant and The Quitrents (proposed); The Colonists (new, Tier II).

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Book of Settlements | II | uncommon | (above) | carried scaler | reads towns founded this game | production, gold | Economic | **new** |
| The Wild Marches | I | common | (above) | carried | reads wild hexes owned | culture | Civic | **new** |
| The Imperial Roads | III | rare | Towns joined to your capital by road cost no authority. | capstone: a broken limit | reads connected towns | authority | Civic | **new**; new shape, small (`cityCost` allowed to reach zero; today a discount stops at one) |
| The Staked Claims | III | uncommon | Each town you found claims every unowned hex within two hexes of it. | the moment | raises hexes | land | Economic | **new**; existing (the founding rider's `claims`, as The Beating of the Bounds, at twelve) |
| The Wide Country | III | uncommon | Commission. Claim twelve hexes while this card is seated. Then +2 happiness in every town and more food in small towns for 30 turns. | a goal | raises hexes | happiness, food | Wildcard | live (built as) |
| The Hallowed Woods | III | uncommon | (build 1) | percentage on the flats | reads wild tiles worked | culture | Civic | **new** |
| The Quitrents | III | common | +1 gold for every two hexes you own. | pay-off | reads hexes owned | gold | Economic | proposed (from Tier I, resized); existing |
| The Measure of the Land | IV | rare | Every town gains +1 production for every 25 hexes your empire owns, at most +6. | finisher: flats | reads hexes owned | production | Economic | live |
| The Philosophers' Peaks | IV | uncommon | (build 1) | utility: science | reads mountains owned | science | Civic | live |
| The Domesday Survey | IV | rare | (build 2) | the late goal | reads hexes and works | production, an engineer | Wildcard | live (built as) |
| The Encroaching Fields | IV | uncommon | Once every ten turns, each town of twelve or more takes an unworked hex from a smaller foreign town beside it. | pressure on rivals | raises hexes | land | Economic | deferred; new shape (a hex changing owner without a capture) |

- **Carried over:** The Book of Settlements at +30%, and The Wild Marches, which every claim keeps raising.
- **The capstone, The Imperial Roads:**
  - Twelve connected towns at three authority each free about 33 points. Authority stays above +10, which pays +20% production and border growth however wide the empire grows.
  - The road net becomes the map of the empire: a town cut off by a rival's border costs authority again until the road is mended. A conquered town joined by road costs nothing either, which is what the frontier offers a Dominion partner.
- **The moment, The Staked Claims:** a late town on an island or in the tundra arrives with its two rings already claimed, up to eighteen hexes, and every card that counts hexes pays at once.
- **Sizing:**
  - **The Quitrents:** 150 hexes pay 75 gold a turn, band 3's regular card.
  - **The Measure of the Land:** +6 production in each of fifteen towns is 90 a turn.
  - **The Imperial Roads:** the +20% production tier for good, and room for as many towns as the roads reach.
- **How a few turns feel:**
  - Turn 160: fifteen towns and authority at +14; borders grow a fifth faster and so does production.
  - Turn 170: a settler lands on the last free island. The Staked Claims takes its two rings, and The Domesday Survey's 150 hexes are reached.
  - Turn 190 (Tier IV): the big river towns take a smaller neighbour's unworked border hexes one by one.
- **Chairs:** the Estates or the Curia seat nine.
- **Without Tier IV,** Provincial Councils, The Local Census and The Naturalists hold the chairs.
- **Also fits:** The Great Migration (shared with the great city); with Commerce, gold to buy hexes.

- **Utility mix:** production and gold (The Book of Settlements, The Measure of the Land, The Quitrents); science (The Naturalists, The Philosophers' Peaks); culture (The Wild Marches, The Hallowed Woods); authority, and through it production (The Local Census, Provincial Councils, The Imperial Roads); land (Outposts, The Staked Claims); defence (The Frontier Militia).
- **Gives up:** town size, a long border to defend, and culture: owned wild land pays little of it.
- **Partners:** Commerce (gold buys hexes and settlers, and its cards count hexes owned); Dominion (garrisons for many towns; with The Imperial Roads its conquests cost no authority).
- **Leader:** Pachacuti (connected towns pay happiness and production).

---

## 4. The great city (the tall empire)

**The fantasy.** Babylon, Rome at a million, Chang'an, Tenochtitlan on its lake. A few towns grown huge on food and water. Their people are fed and content, a content empire learns and writes, and the capital becomes the town that raises the Magnum Opus.

**The loop:** feed and water a few towns → they grow → water and food keep them content as they grow, and spare happiness pays +20% science and culture → every citizen pays production → they grow further.
- **The quantity:** citizens per town, which every game grows and this build grows faster.
- **What it spends:** happiness (each citizen asks one), and land: it founds few towns.

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| Sweet Water | 0 | common | Towns beside a river or lake gain +1 happiness. Worked freshwater tiles gain +1 food. | opener | raises food and happiness | food | Economic | live (proposed split: The Wellsprings takes the happiness) |
| The Patient Harvest | 0 | rare | Towns keep 30% of the food spent on growth, but build military units 15% more slowly. | build-defining: a drawback | raises growth | food | Economic | live; −0.7 measured (the reading sees the penalty, not the growth) |
| The Grain Census | I | uncommon | While seated, this card gains +1 production and +1 gold each time one of your towns grows past its largest size. It starts at +2 of each. | grower | reads growth | production, gold | Economic | **new**; new shape (a town's largest size, and a tally of growth past it) |
| The Public Fountains | I | common | Towns beside a river or lake gain +1 happiness for every four citizens, at most +3. | pay-off | reads citizens by fresh water | happiness | Civic | **new**; existing (`pays` count `population` to happiness, `freshwater` scope) |
| The Polis | I | rare | While you hold at most four towns, every town gains +25% food. | build-defining: a condition | raises growth | food | Economic | **new**; existing (`conditionRule` on `cityCountAtMost`) |
| Hydraulic Schools | I | common | Towns with an Aqueduct gain +20% production toward science buildings. Those beside a mountain also gain +1 science for every three citizens. | utility: science | reads citizens by mountains | science | Civic | revised (shared with Scientific) |
| The Harbour Cities | II | common | Coastal towns gain +1 culture for every two citizens. | utility: culture | reads citizens on the coast | culture | Civic | **new**; existing (`pays` count `population`, `coastal` scope) |
| The Great Households | II | uncommon | Each town gains +2% production for every citizen it has, at most +30%. | early scaler | reads citizens | production | Economic | proposed (from Tier III, resized); existing |

- **Five-chair core** (Tier I): Sweet Water, The Patient Harvest, The Grain Census, The Public Fountains, The Polis. Hydraulic Schools joins when aqueducts arrive.
- **Chairs:** the Republic seats the whole core; the Merchant League seats seven of the eight.
- **Sizing:**
  - **The Polis:** four towns making about 15 food at turn 70 gain about 15 a turn; with The Patient Harvest a town grows about a third faster.
  - **The Grain Census:** about +25 production and gold by turn 114, about +50 by turn 160.
  - **The Public Fountains:** +2 happiness in each of four river towns of eight citizens is +8: the step from the +10% science and culture tier to +20%.
  - **The Harbour Cities:** three coastal towns of twelve citizens pay +18 culture.
- **How a few turns feel:**
  - Turn 25: the capital on its river works floodplain farms and reaches six citizens while a neighbour has three towns of three.
  - Turn 80: four towns, each growing every few turns. Every growth past the old size ticks The Grain Census, and the empire sits at +10 happiness: +20% science and culture.
  - Turn 120: a fifth town would end The Polis, so the capital builds an Aqueduct instead, and Hydraulic Schools pays science for its mountain.
- **Also fits:** The Grain Dole, The Waterworks, The Commons, Dark Earth, Granary Levies, The Coast, The Grain Exchange (Commerce), Garden Cities (Magisterial), The Town Rolls (proposed), Migration and The Breadbasket (deferred).

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Great Households | II | uncommon | (above) | carried scaler | reads citizens | production | Economic | proposed |
| The Grain Census | I | uncommon | (above) | carried grower | reads growth | production, gold | Economic | **new** |
| The Megalopolis | III | rare | Citizens beyond the twelfth in any of your towns ask no happiness. | capstone: a broken limit | reads citizens | happiness | Civic | **new**; new shape (a cap on a town's demand, beside `freeCitizens`) |
| The Freedom of the City | III | uncommon | The first time each of your towns reaches fifteen citizens, and again at twenty, it gains production equal to forty times its population. | the moment | reads growth | production | Economic | **new**; existing rider (`growth` with `atPopulation`) plus the largest-size mark, so a levy and a regrowth cannot pay twice |
| The Mountain Schools | III | uncommon | Towns beside a mountain gain +15% science. | percentage on the flats | reads mountain towns | science | Civic | live (proposed trim) |
| The Harbour Festivals | III | uncommon | Coastal towns gain +25% culture. | percentage on the flats | reads coastal towns | culture | Civic | **new**; existing (`percentYields`, `coastal` scope) |
| The Mother City | IV | rare | Your capital gains +1 production for every citizen it has. | finisher | reads the capital's citizens | production | Economic | live |
| The Land's Great Work | IV | rare | The town building the Magnum Opus gains +5% production toward it for every eight citizens you have, at most +40%. | finisher: the win | reads citizens | production toward the Opus | Economic | live (built as) |
| The Theodosian Walls | IV | uncommon | Your towns gain +1 defence for every citizen. | utility: guard the Opus | reads citizens | defence | Military | **new**; existing (`cityStat` defence with a `population` count) |
| The Heartland | IV | rare | Commission. One town works twelve improved or tended tiles that each yield 5 or more. Then that town costs no authority and gains +3 happiness and +20% food for good. | the late goal | reads one town's tiles | authority, happiness | Wildcard | deferred (a lasting mark on one town) |
| The Great Migration | IV | rare | Every ten turns, each foreign town within three hexes of your border loses a citizen to your nearest town, if yours is happier and has room. | pressure on rivals | raises citizens | citizens | Economic | deferred; new shape (a citizen moved between empires) |

- **Carried over:** The Great Households at +30%, and The Grain Census at about +50 production and gold.
- **The capstone, The Megalopolis:** five towns of twenty citizens save forty happiness. The empire sits in its top tier for good (+20% science and culture), and its towns never stop growing for want of content. A tall empire's science and culture come mostly from its citizens and that tier, which is how this build plays around the gap.
- **The moment, The Freedom of the City:** 600 production at fifteen citizens and 800 at twenty, landing on whatever the town builds, the Opus included.
- **Sizing:**
  - **The Freedom of the City:** about ten milestones over Tiers III and IV, about 7,000 production in all.
  - **The Mother City:** a capital of thirty pays +30 production; The Land's Great Work reaches +40% at 64 citizens.
  - **The Theodosian Walls:** a capital of thirty gains +30 defence, more than its walls give.
- **How a few turns feel:**
  - Turn 165: the capital reaches twenty citizens, and 800 production lands on the Opus.
  - Turn 180: five towns of twenty-five, none asking more than twelve happiness. A less content neighbour's border towns lose a citizen to yours every ten turns (Tier IV).
  - Turn 190: a coalition marches on the Opus capital and meets thirty points of defence above its walls.
- **Chairs:** the Estates seat ten, with The Theodosian Walls in a Military chair.
- **Without Tier IV,** The Harbour Cities, The Public Fountains and Hydraulic Schools hold the chairs.
- **Also fits:** The Common Domain (deferred), The Philosophers' Peaks, Plenty (proposed), The Waterworks.

- **Utility mix:** production (The Grain Census, The Great Households, The Freedom of the City, The Mother City, The Land's Great Work); science (its citizens, Hydraulic Schools, The Mountain Schools, the happiness tier); culture (The Harbour Cities, The Harbour Festivals, the happiness tier); happiness (Sweet Water, The Public Fountains, The Megalopolis); food (Sweet Water, The Patient Harvest, The Polis).
- **Gives up:** land and width; military speed (The Patient Harvest); and an inland, lowland start gives it little science or culture of its own.
- **Partners:** Scientific (aqueducts and mountain towns); Devotion (big towns hold more followers); Commerce (The Grain Exchange carries food to the big town).
- **Leader:** Nezahualcoyotl (aqueduct towns and a big capital pay culture). Mithridates fits through The Polis: a small empire fights at +2 against wider ones.

---

## 5. The people's levy (levies)

**The fantasy.** The Inca mit'a that built roads and terraces in turns of service, Egypt's corvée that worked the state's fields in the flood season, the Roman citizen levy. The people are the empire's wealth: grown on the land, spent on works and wars, and grown again. This is the build for the card the user called *"soooo good"*.

**The loop:** grow a citizen → spend it on a levy: hammers, a soldier or a work → the levy leaves food behind and the town regrows → spend again.
- **The quantity:** citizens, which grow by themselves, spent through the levy (`levies.ts`). A levy needs a card that grants a use, so the build opens with one.
- **What it spends:** citizens, and attention: a levy is a choice per town every five turns. Each citizen spent also stops asking for happiness.

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| Granary Levies | 0 | common | When a town grows, gain 15 production. | opener: pays the regrowth | reads growth | production | Economic | live (proposed rename: The Granary Dues); its lumps paid 210 production over 14 growths in the bot games |
| The Work Gangs | 0 | common | Towns of at least three citizens may spend a citizen to raise a worker. This shares the town's levy wait. | opener: the first levy | raises levies | a worker | Economic | **new**; new shape (a levy use: a worker) |
| Levy of the Land | I | uncommon | Towns may spend a citizen to gain production equal to the food it took to grow that citizen, once every five turns. | the action | raises levies | production | Economic | live |
| The Muster of the Fields | I | uncommon | Towns of at least five citizens may spend a citizen to muster the best melee unit you can build. It shares the levy wait. | the action, for war | raises levies and units | units | Military | live (shared with Dominion) |
| The Gleaners | I | common | After a town spends a citizen on a levy, it gains +3 food for ten turns. At most once every ten turns. | pay-off: regrow | reads levies | food | Economic | proposed; existing (the levy's `after`) |
| The Labour Feasts | I | uncommon | After a town spends a citizen on a levy, it gains +1 culture for every wild tile it works, for ten turns. At most once every ten turns. | utility: culture | reads levies | culture | Civic | **new**; existing (the levy's `after`, as Seasonal Levies) |
| The Labour Rolls | II | uncommon | +1% production and food for every two citizens you have levied this game, at most +30%. | early scaler | reads levies this game | production, food | Economic | **new**; new shape ("this game" count: citizens levied) |
| The Terraces of Moray | II | uncommon | Towns beside a mountain may spend a citizen to gain science equal to the food it took to grow that citizen. | utility: science | raises levies | science | Civic | **new**; new shape (a levy use for some towns only) |

- **Five-chair core** (Tier I): Granary Levies, Levy of the Land, The Muster of the Fields, The Gleaners, The Labour Feasts. The Work Gangs is the Tier 0 levy and gives way.
- **Chairs:** the Council of Elders seats the whole core, with The Muster of the Fields in its Military chair; the Merchant League seats all eight.
- **Sizing:**
  - **Levy of the Land:** a levy at size eight pays 65 hammers (`growthThreshold(7)`), about five turns of an age 2 town's production.
  - **The Gleaners:** 30 food per levy, about half of what the town needs to regrow at size eight.
  - **The Labour Feasts:** a town working three wild tiles makes +3 culture for ten turns; five towns levying in turn give about +15 a turn in age 2, more than half a seat's culture.
  - **The Labour Rolls:** about +10% when Tier II opens (twenty levies), +30% by turn 160 (sixty).
  - **The Terraces of Moray:** about 65 science a levy in a mountain town of eight, about 13 a turn for each such town.
- **How a few turns feel:**
  - Turn 20: the capital at three citizens raises a worker instead of building one, and keeps building warriors.
  - Turn 70: five towns take turns. One levies 60 hammers into a Market, one musters a Swordsman for the border, one sends its citizen up the mountain for 60 science. The Gleaners and Granary Levies pay for the regrowth.
  - Turn 120: The Labour Rolls read +12%. The towns never get big, so they never ask much happiness.
- **Also fits:** The Patient Harvest; The Barn-Raising and Labour Dues (proposed); Veteran Colonies (deferred, the reverse of a levy); The Colonists (new, Tier II); and with Dominion, The Gathering Host and The Art of War, since a levied soldier is a unit gained.

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| Levy of the Land | I | uncommon | (above) | carried: the action (a levy use needs its card seated) | raises levies | production | Economic | live |
| The Labour Rolls | II | uncommon | (above) | carried scaler | reads levies this game | production, food | Economic | **new** |
| The Mit'a | III | rare | A citizen spent on a levy returns to its town twenty turns later. | capstone: a broken rule | reads levies | citizens | Economic | **new**; new shape (a citizen returned at a stated turn, recorded on the town; a returned citizen is not growth) |
| The Days of Service | III | uncommon | Every twentieth turn, your towns may levy whatever their wait. | the moment | raises levies | — | Economic | **new**; new shape (a turn on which the levy wait is lifted) |
| Seasonal Levies | III | uncommon | After a town spends a citizen on a levy, it gains +60% food for ten turns. At most once every twenty turns. | pay-off: regrow | reads levies | food | Economic | live |
| Plenty | III | common | When a town grows, it gains production equal to eight times its new population. | pay-off: regrow | reads growth | production | Economic | proposed; existing (`growth` rider) |
| The Builders' Levy | III | uncommon | Towns may spend a citizen to send production equal to the food it took to grow it to a world wonder being built in another of your towns. | engine: the levy builds | raises levies | production toward wonders | Economic | **new**; new shape (a levy use: The Corvée's, for world wonders) |
| The Trained Bands | III | uncommon | Units raised by a levy start as Veterans. | utility: soldiers | reads levies; raises ranks | ranks | Military | **new**; new shape (experience at birth, Dominion's ranks family) |
| The Mountain Schools | III | uncommon | Towns beside a mountain gain +15% science. | percentage | reads mountain towns | science | Civic | live |
| The Corvée | IV | rare | While a town builds the Magnum Opus, your other towns of at least ten citizens may spend a citizen to send it production equal to the food it took to grow. | finisher: the win | raises levies | production toward the Opus | Economic | live |
| The General Levy | IV | rare | Towns may spend a citizen to raise their best melee unit; while you are at war, every turn. | finisher: war | raises levies and units | units | Military | live (the upkeep half not built) |

- **Carried over:** Levy of the Land, the action, which must stay seated; and The Labour Rolls at +30%.
- **The capstone, The Mit'a:**
  - A levy becomes a loan of labour, as the Inca turn of service was: the citizen comes home after twenty turns.
  - A town levying every five turns is never more than four citizens down and never has to regrow them, so it can levy all game without shrinking, and every levy still counts for The Labour Rolls.
- **The moment, The Days of Service:** every twentieth turn the whole empire levies at once. Ten towns of ten citizens send about 880 hammers (88 each), ten soldiers, or a mix.
- **Sizing:**
  - **The Mit'a:** a levy at size ten pays 88 hammers and costs nothing in the long run: about 18 production a turn per town from levies alone.
  - **The Days of Service:** about 900 production or ten units in one turn, band 3's registering lump.
  - **Plenty:** a town of twelve regrowing pays 96, and with levies and The Mit'a regrowth never stops.
- **How a few turns feel:**
  - Turn 160: the days of service. Eight towns levy at once: three send hammers to a world wonder, three muster Pikemen as Veterans, two pay into Forges.
  - Turn 180: the citizens levied at turn 160 come home, and the towns are back at size before the next days of service.
  - Turn 190 (Tier IV): at war with the Opus builder, every town levies every turn (The General Levy), while the biggest send their citizens into your own Opus (The Corvée).
- **Chairs:** the Estates seat ten, with The Trained Bands and The General Levy in the Military chairs.
- **Without Tier IV,** The Gleaners, The Labour Feasts and The Terraces of Moray hold the chairs. The build keeps its capstone but loses its way to win, The Corvée; The Builders' Levy keeps the levy building wonders.

- **Utility mix:** production (Levy of the Land, Granary Levies, The Labour Rolls, Plenty, The Mit'a, The Days of Service, The Corvée); soldiers (The Muster of the Fields, The General Levy, The Trained Bands); workers (The Work Gangs); food (The Gleaners, Seasonal Levies); science (The Terraces of Moray, The Mountain Schools); culture (The Labour Feasts, and the world wonders The Builders' Levy raises); happiness (each citizen spent asks none).
- **Gives up:** big towns, steady culture, and attention.
- **Partners:** Dominion (levied soldiers are units gained for The Gathering Host and The Art of War, and The Trained Bands' Veterans count as ranks earned for Honours of the Legion and The Veterans' Roll); Magisterial (wonders); Devotion (faith buys what levies do not).
- **Leader:** none today. Pachacuti fits by history, since the mit'a was Inca, but his abilities read roads and farms, not levies.

---

## Across the five builds

### Bridges and pivots

- **Wild land** is read by three builds: The Old Songs and The Commons (the wild), The Hallowed Woods (the wild, and the frontier's young towns), The Wild Marches (the frontier, as wild hexes owned) and The Labour Feasts (the levy).
- **Tended and improved land meet** in The Tended Country (and the proposed The Hedgerows), The Inheritance of Fields, The Raising of the Land (it raises tended tiles too) and The Two Harvests.
- **Claims:** The Garden Frontier and Outposts share one shape; The Staked Claims and the shared The Barbarian Frontier add land the same way.
- **Citizens:** Granary Levies, The Patient Harvest and Plenty pay both the great city and the levy. The Colonists (Tier II, an alternative) turns a big town's citizen into a settler, and Migration (deferred) moves citizens from big towns to small ones.
- **Mountains:** The Mountain Schools serves the old fields, the great city and the levy; The Philosophers' Peaks the wild, the frontier and the great city.
- **Engineers:** The Master Builders and A Court of Engineers feed The Raising of the Land, which raises the wild's tended tiles as well as farms.
- **The pivots this opens:**
  - frontier → great city: stop founding at the authority wall and grow the towns you have (The Polis is Tier I only, so this pivot runs on The Megalopolis and the late cards);
  - great city → levy: big towns spend their citizens (The Corvée, The Days of Service);
  - wild ↔ old fields: The Two Harvests ends the choice between them;
  - levy → frontier: The Colonists turns citizens into settlers.

### New shapes, and the cards that use them

**The count:** 32 new cards, one of them an alternative (The Colonists). Fifteen use shapes that exist or nearly exist: The Frontier Militia, The Forest Keepers, The Wild Marches, The Public Fountains, The Polis, The Labour Feasts, The Cloud Gardens, The Old Fields, The Harbour Cities, The Hallowed Woods, The Royal Forests, The Staked Claims, The Harbour Festivals, The Theodosian Walls and The World Tree. The other seventeen need a new shape. Each family reads a mechanic the game already has; none adds a new one.

1. **"This game" counts,** the family the user approved for Dominion (ruling 3, 2026-10-15): towns founded (The Book of Settlements) and citizens levied (The Labour Rolls). Each is one record on the player written at one seam (`foundCityAt`, `levyAt`), as `Player.campsCleared` and `Player.tilesPurchased` are today.
2. **Levies** (`levies.ts`). The levy, its wait and its menu exist; these are new members and fields:
   - new uses: a worker (The Work Gangs), a world wonder in another town (The Builders' Levy, The Corvée's `opus` use for wonders), a settler (The Colonists);
   - a use limited to some towns: science in towns beside a mountain (The Terraces of Moray);
   - a levied citizen returned at a stated turn (The Mit'a);
   - a turn when no town waits (The Days of Service);
   - a deal gate, "Needs a levy", for the cards that read levies (question 5).
3. **Tended land:**
   - a tally of tiles tended (The Tending Songs);
   - a town's burning on a cycle (The Fire Mosaic), the town decision `deck-design.md` already describes: "workers decide where, once; towns decide when, on a cycle". The Flood Festival must pay for each tile it burns;
   - food from tended tiles nobody works (The Food Forest). An approximation, +1 food for each tended tile a town owns, is existing shape;
   - a tile with two works (The Two Harvests, already deferred).
4. **Claims beyond the border:** a work raised outside your borders that claims its hex (Outposts, The Garden Frontier). Today the improvement gate refuses ground you do not own.
5. **The two limits:** a cap on what a town's citizens ask in happiness, beside `freeCitizens` (The Megalopolis); and the `cityCost` rule allowed to reach zero for a scope (The Imperial Roads).
6. **A town's largest size,** and a tally of growth past it (The Grain Census). The Freedom of the City uses the same mark so that a levy and a regrowth do not pay twice. `TallyOccasion`'s note in `statecraftData.ts` says the `cityGrew` member waits for exactly this record.
7. **A lasting mark on tiles,** written by the engineer's existing act (The Raising of the Land).
8. **From Dominion's families:** experience at birth, for levied units (The Trained Bands).

Where to cut if the user wants less engine work: The Days of Service and The Colonists, and The Food Forest's unworked-tile rule (its approximation is existing shape).

**One correction to the sheet:** The Rope Stretchers is no longer blocked. The `improvementBuilt` occasion it waited for went live with The Flood Festival in batch S.

### Sheet cards no build uses

These sheet cards are in no build table. Most are alternatives listed under a build's "Also fits".
- **Keep as glue:**
  - Tier 0: The Beating of the Bounds (frontier; it reads 0 only because a founding claim is invisible to the per-turn reading).
  - Tier I: Tinkers' Guild (wild, fields), The Three Sisters (fields), The Hard Country (frontier; 137 a turn measured), Daughter Towns (frontier).
  - Tier II: The Watercourses and The Engineers' Yards (fields), The Coast (great city, frontier), The Grain Dole and The Waterworks (great city), The Landscape Garden (wild, with Magisterial).
  - Shared: Market Gardens (fields); Sacred Groves and The Flood Festival (wild); Military Colonies, The Barbarian Frontier, The Road Garrisons, Marcher Lords, The Provincial Fair and Garden Provinces (frontier); The Grain Exchange (great city); Garden Cities and The Sculpted Landscape (wild, fields). Commerce and Magisterial recommend cutting Market Gardens, The Provincial Fair and Garden Provinces; no build needs them, so a cut costs this deck nothing.
- **Keep deferred, as alternatives:** Migration (great city to frontier), Veteran Colonies (the levy's reverse, with Dominion), The Common Domain (the great city's hinterland).
- **Rework:**
  - **Six Gardens.** The user found it weak, and its free Order hand can no longer be built now that reward hands are removed. Recommended reward: culture equal to fifteen times the tended tiles you hold.
  - **The Breadbasket.** Blocked because a town told to stop growing moves its citizens off food. Reworked to one effect: "A town told to stop growing turns its surplus food into production." It serves the great city at its happiness wall.
  - **The Polders.** Terrain may not change mid-game, by rule. Rework as a work on a coast tile beside three of your land tiles that yields as farmed grassland, the tile staying water; or cut it if a new work on water is too much.
  - **Public Works.** Its terraces belong to one leader, and raising a town's land is now The Raising of the Land's job. Fold it into that card.
- **Cut:** none. One data clean-up: `theHydraulicCommonwealth` in `data/decks/common.json` still names Expansionist, unretired and with no effects, though the sheet moved it to Scientific, whose review cut it. Retire the row.

### The new cards, by tier

- **Tier 0 (3):** The Tending Songs (wild), The Frontier Militia (frontier), The Work Gangs (levy).
- **Tier I (7):** The Garden Frontier (wild); The Forest Keepers (fields); The Wild Marches (frontier); The Grain Census, The Public Fountains, The Polis (great city); The Labour Feasts (levy).
- **Tier II (7):** The Cloud Gardens (wild); The Old Fields (fields); The Book of Settlements (frontier); The Harbour Cities (great city); The Labour Rolls, The Terraces of Moray (levy); The Colonists, an alternative for the frontier and the levy (uncommon, Economic): *"Towns of at least six citizens may spend a citizen to raise a settler."*
- **Tier III (13):** The Food Forest, The Fire Mosaic (wild); The Hallowed Woods (wild, frontier); The Royal Forests (fields); The Imperial Roads, The Staked Claims (frontier); The Megalopolis, The Freedom of the City, The Harbour Festivals (great city); The Mit'a, The Days of Service, The Builders' Levy, The Trained Bands (levy).
- **Tier IV (2):** The World Tree (wild), The Theodosian Walls (great city).
- **From the sheet's proposed revision:** The Gleaners (Tier I), The Managed Wild and The Great Households (Tier III to II), Old Workings (Tier II to III), The Quitrents (Tier I to III), Plenty (Tier III).
- **Moved:** The Raising of the Land, Tier IV to III.

Adopting the draft adds 32 cards and seats 6 proposed ones: 100 cards in all, against 62 today.

---

## The sort

Every card on the sheet: the 62 Expansionist cards and the 14 in its shared table, by the rules of `docs/plans/doctrines-governments-chairs.md` §4. A card is typed by what it pays or does, not by what it reads, and a mixed card takes the type of the half that pays more; even halves with a Civic half go Civic. Charters and commissions are typed for their faces, and a shared card keeps the type the Dominion sheet gave it.

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
| The Rope Stretchers | 0 | deferred | Economic | production lumps |
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
| The Breadbasket | II | deferred | Economic | surplus food into settlers |
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

| Tier | Military | Economic | Civic | Wildcard | All | Dealt today | With this draft's cards |
|---|---|---|---|---|---|---|---|
| Tier 0 | 0 | 9 | 2 | 0 | 11 | 10 | 14: 1 M, 10 E, 3 C |
| Tier I | 0 | 10 | 4 | 1 | 15 | 14 | 23: 14 E, 8 C, 1 W |
| Tier II | 0 | 6 | 6 | 0 | 12 | 9 | 21: 12 E, 9 C |
| Tier III | 0 | 6 | 2 | 1 | 9 | 6 | 26: 1 M, 17 E, 7 C, 1 W |
| Tier IV | 1 | 11 | 1 | 2 | 15 | 10 | 16: 2 M, 11 E, 1 C, 2 W |
| **All** | **1** | **42** | **15** | **4** | **62** | **49** | **100: 4 M, 64 E, 28 C, 4 W** |
| Shared | 1 | 7 | 6 | 0 | 14 | 13 | |

- The thirteen deferred cards are all Economic except The Heartland, so the 49 dealt today are 30 Economic, 15 Civic, 1 Military and 3 Wildcard. "With this draft's cards" adds the 32 new and 6 proposed cards and moves The Raising of the Land to Tier III.

### Close calls

- **Sweet Water** (Economic): +1 food on each worked freshwater tile against +1 happiness a freshwater town. The proposed split makes two cards, one of each type.
- **Tinkers' Guild** (Economic): a unit stat, which the rules list under Military, but on a worker it pays in improvements.
- **Levy of the Land and The Corvée** (Economic): the Military rule names levies, but these two pay production. Only levies that raise units are Military.
- **The Highlands** (Civic): +2 science against +1 production. It is the deck's best measured card, so typing it Civic puts it in a Civic or Wildcard chair.
- **The Coast, Sacred Groves, Garden Provinces, The Sculpted Landscape** (Civic): even halves, one of them Civic.
- **The Grain Dole and The Waterworks** (Civic): happiness against food kept or a cheaper Aqueduct. The proposed trims keep only the happiness, which settles both.
- **Hydraulic Schools** (Civic): science against production toward science buildings.
- **Veteran Colonies and The Breadbasket** (Economic): the first is a unit's order but pays food and spends the unit; the second weighs happiness against production toward settlers, and its rework keeps only production.
- **The Two Harvests and The Master of Works** (Economic): each could read as acting on other cards (Wildcard), but the first adds a work's own yield and the second amplifies a great person's act, not a card.

### Where a tier leans, and what it means under each government

- **Tier 0 leans Economic (9 of 11) and has no Military card.** Under the Chiefdom (1 Military, 1 Economic, 1 Wildcard) Expansionist can fill two of the three chairs. The Military chair takes the partner's card: Dominion has ten Military cards at Tier 0, and the other four decks are unsorted. The Frontier Militia would give the deck its own.
- **Tier I leans Economic (10 of 15) and has no Military card of its own;** the shared The Muster of the Fields is the one it can draw. At draft 4, Council of Elders (1 M, 2 E, 1 C, 1 W) and Priest-King (1 M, 1 E, 2 C, 1 W) seat four Expansionist cards and War Chief (2 M) three. At draft 10 the Republic (0 M, 3 E, 1 C, 1 W) seats five, the Theocracy (3 C) four and Tyranny (3 M) two. Expansionist is the Republic's deck.
- **Tier II is even** (6 Economic, 6 Civic; its three deferred cards are Economic, so what is dealt leans Civic, 6 to 3), and it has no Military card, its own or shared. It suits the Merchant League (3 E, 2 C, 2 W) and Divine Mandate (3 C); under Imperium (3 M) the partner fills three chairs.
- **Tier III is thin:** six cards dealt, whatever the government.
- **Tier IV leans Economic (11 of 15).** The Estates (4 E, 3 W) seat it; under the Curia (4 C) the Civic chairs take earlier Civic cards the seat still holds, or the partner's.
- **Every government but the Republic has a Military chair, and the deck's one Military card is in Tier IV** (The General Levy; the shared The Muster of the Fields at Tier I). An Expansionist seat's Military chairs belong to its partner. That is the steering the chairs were designed for ("the government steers which half of the seat's two decks leads"), but with a partner that is also short of Military cards they sit empty. The builds add three: The Frontier Militia (Tier 0), The Trained Bands (Tier III), The Theodosian Walls (Tier IV).
- **Civic is the deck's identity half.** Authority and happiness are Civic, and they are what Expansionist raises for every other deck. After this draft Civic is 28 of 100 cards, most of them in Tiers I to III, and the managed wild leads the civic governments.

---

## Open questions for the user

Each starts with the recommendation.

1. **The gap rule.** *Recommended: keep it strict.* Every build takes science and culture from terrain or from the happiness tier, never straight from a citizen, a levy or a founding. The levy build is the thinnest at both; its terrain-gated cards (The Terraces of Moray, The Labour Feasts) do the job, and a large body with a small brain is the deck's identity.
2. **The Economic lean under typed chairs.** *Recommended: accept it as the deck's steering toward the economic governments, and adopt the three Military cards in the builds (The Frontier Militia, The Trained Bands, The Theodosian Walls), so the Chiefdom's Military chair is never forced empty.* Today 42 of 62 cards are Economic and one is Military.
3. **Shared types bind four unsorted decks.** *Recommended: confirm them now, so those decks' passes start from them.* This sort types nine cards that Commerce, Devotion, Scientific and Magisterial share and have not sorted: six Civic (Sacred Groves, The Flood Festival, Hydraulic Schools, Garden Cities, Garden Provinces, The Sculpted Landscape) and three Economic (Market Gardens, The Grain Exchange, The Provincial Fair).
4. **The Burning Season as you designed it.** *Recommended: keep the per-tile charter at Tier I and build the town's burning as The Fire Mosaic at Tier III.* You ruled that towns decide when to burn, on a cycle; D3 built burned country one tile at a time.
5. **A "Needs a levy" deal gate.** *Recommended: yes,* for the cards that read levies (The Gleaners, The Labour Feasts, The Labour Rolls, Seasonal Levies), as "Needs tended land" gates the tended cards. Today two cards grant a levy by Tier I, three with The Work Gangs.
6. **A town's largest size.** *Recommended: add it.* The Grain Census and The Freedom of the City need the high-water mark the game deliberately lacks; without it a levy and a regrowth pay twice.
7. **The Raising of the Land.** *Recommended: move it to Tier III as the old fields' capstone, triggered by the engineer's existing Rush the Works,* so it needs no new act or button.
8. **Six Gardens' reward.** *Recommended: culture equal to fifteen times the tended tiles you hold,* in place of the free Order hand that reward hands' removal leaves unbuildable.

After these, the deck pass goes on to Expansionist's Doctrines, one direction per build. No leader points at the managed wild or the levy, which the leader pass should know; Pachacuti fits the levy by history.
