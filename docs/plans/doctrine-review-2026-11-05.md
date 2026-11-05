# The user's Doctrine comments of 2026-11-03 and 2026-11-05

**Status:** the spec, written 2026-11-05 before any agent starts. The user read the Doctrines tab of the review page (version 20), left 41 comments, and said: *"ok i've gone through the doctrines, please fold these comments in and implement. let me knkow if anything is unclear"*. Each comment is quoted below with the Doctrine it sits on. The readings are the orchestrator's; each stands until the user changes it.

**What "implement" covers:** every Doctrine on the tab, not only the ones with a comment. The user's review was the pass that each proposal doc's section 11 asked for ("after your pass, the Doctrines go onto the sheet, then a triage sorts them into data-only and new-shape batches"). So:

- Dominion's live Doctrines change as below.
- The proposed Doctrines of Expansionist, Commerce, Scientific, Magisterial and Devotion get built. Their rows of record are the tables in `docs/decks/expansionist.md` and `docs/plans/{commerce,scientific,magisterial,devotion}-doctrines.md`, with the changes below already written in.
- The recommendations in each proposal's "Questions for the user" section stand as readings, except where a comment here overrides or removes the Doctrine.
- A row with no comment is built as its table says.

The build plan is `docs/plans/doctrines-build-triage.md`.

## Counts after this review

| Deck | Tier I | Tier II | Tier III | Tier IV | All | State |
|---|---|---|---|---|---|---|
| Dominion | 3 | 4 | 3 | 3 | 13 | live; 2 retired |
| Expansionist | 4 | 6 | 7 | 7 | 24 | to build |
| Commerce | 3 | 4 | 3 | 4 | 14 | to build; 3 removed, 1 new |
| Scientific | 4 | 3 | 4 | 4 | 15 | to build; 1 removed |
| Magisterial | 4 | 4 | 4 | 4 | 16 | to build |
| Devotion | 4 | 4 | 4 | 4 | 16 | to build |
| **All** | **22** | **25** | **25** | **26** | **98** | |

Retired rows keep `retired: true` and stay in the data for saves. A removed proposal was never built, so it has no row.

## Dominion

| Doctrine | Tier | The comment | The Doctrine now |
|---|---|---|---|
| The Steppe Confederacy | I | *"revise: gain +50% production towards mounted units. +3 combat strength to mounted units when attacking wounded units."* | +50% production toward mounted units. Mounted units gain +3 strength when attacking a wounded unit. |
| The Consular Roads | I to II | *"move to tier 2"* | Tier II. The text does not change. |
| The Soldiers' Share | I | *"replace: +1 movement and +3 combat strength for melee units."* | Melee units gain +1 movement and +3 strength. |
| Centurions | II | *"revise: 'and costs 1 less upkeep'"* | Each Elite unit gives +3 strength to your units beside it, and costs 1 less upkeep. |
| The Strategoi | II to III | *"move to tier 3"* | Tier III. The text does not change. |
| Weight of Numbers | II | *"remove"* | Retired. |
| The Universal Monarchy | III | *"revise: captured towns cost no authority. This should apply retroactively to previously captured cities"*, then *"newly founded towns cost double authority, this does not apply retroactively to cities you've already founded"* | Towns you capture cost no authority, including those you already hold. Towns you found from now on cost twice as much authority. |
| Total Mobilisation | III | *"remove"* | Retired. |

- **Reading:** "wounded" means the target is below its full health.
- **Reading:** The Soldiers' Share keeps its name. The user did not rename it.
- **Reading:** The Universal Monarchy's doubling reads `City.foundedTurn` against the turn the seat took the Doctrine. A town founded on or after that turn doubles. A town the seat founded earlier does not.
- **Check:** any Order or bot code that names Weight of Numbers or Total Mobilisation must be looked at. Nothing may name a card, so this should be empty.

## Expansionist

| Doctrine | Tier | The comment | The Doctrine now |
|---|---|---|---|
| Bound to the Soil | I | *"revise: workers gain +1 charge. +1 food on tended land"* | Workers gain +1 charge. Tended tiles gain +1 food. |
| Synoecism | I to II | *"revise: towns you have founded cost 1 more authority (acts retroactively). Move to tier 2"* | Your towns of six or more citizens grow 30% faster. Towns you founded cost 1 more authority, including those you already hold. |
| The Gift of the River | I | *"revise: towns away from fresh water cost 3 more happiness (no authority cost)"* | Worked tiles beside a river gain +1 food and +1 production. Towns away from fresh water cost 3 more happiness. |
| The Highland Clans | I | *"revise: towns on hills cost 1 less authority. hills adjacent to a town gain +1 food. no malice"* | Towns on hills cost 1 less authority. Hills beside a town gain +1 food. |
| The Curator of Waters | II | *"revise: public works give +2 happiness and are built 50% faster."* | Public works give +2 happiness and are built 50% faster. |
| The Liturgies, now Human Sacrifice | II | *"revise: human sacrifice: your towns may levy every two turns instead of every five. You may levy a population in your capital to perform a rite across your empire."* | Your towns may levy every two turns instead of every five. Your capital may levy a citizen to perform a rite across your empire. |
| The Builder Kings | III | *"revise: +25% production toward wonders. +2 production on manufactories for every wonder in the city working it."* | +25% production toward wonders. Manufactories gain +2 production for each wonder in the town working them. |
| Empire Without End | III | *"remove malice"* | +1 authority for each town you hold. |

- **Reading:** Synoecism keeps its growth clause. The comment rewrites only its drawback, and moves it.
- **Reading:** The Highland Clans loses its +2 production. The comment restates the whole Doctrine.
- **Reading:** "Hills beside a town" are hill hexes next to the town's centre. As always, a hex pays only when worked.
- **Human Sacrifice, to confirm with the user:** see "Questions" below. The Doctrine no longer says "Needs a levy", because it brings its own levy use.
- The Builder Kings' open question on the Expansionist sheet (cut it or move it to Magisterial) is closed: it stays in Expansionist, revised.

## Commerce

| Doctrine | Tier | The comment | The Doctrine now |
|---|---|---|---|
| The Apoikia | I | *"no malice"* | Settlers and workers cost half as much gold to buy. |
| The Laurion Leases | I | *"remove malice"* (2026-10-25, written in on 2026-11-03) | Hexes with a resource cost half as much gold to buy. |
| The Debased Denarius | I | *"remove"* | Removed. |
| The Delian League | I | *"revise: your coastal towns cost 1 less authority and gain +3 production."* | Your coastal towns cost 1 less authority and gain +3 production. |
| The Sogdian Colonies | II | *"trading posts in your city grant +3 culture and +3 renown towards merchants"* | Each of your towns holding your trading post gains +3 culture and +3 renown, favouring merchants. |
| The Muda | III | *"your trade routes to other civilizations gain +3 science and +3 culture and cannot be pillaged"* | Your trade routes to other empires pay +3 science and +3 culture, and cannot be plundered. |
| The Bardi Company | III | *"remove"* | Removed. |
| The Tea and Horse Agency | III | *"remove"* | Removed. |
| The Turnpike Trusts (new) | III | *"new age 3 doctrine: your trade routes cost half as much to buy. Tiles with a road gain +1 gold."* | Caravans cost half as much gold to buy. Hexes with a road gain +1 gold. |

- **Name** (the orchestrator's; the user did not name it): the 18th-century English turnpike trusts, which built and kept roads and paid for them with tolls.
- **Reading:** "trading posts in your city" is your own post in your own town, the post The Factors' Houses reads, so a town pays once.
- **Reading:** "cannot be plundered" means no one can strike a caravan on a foreign route of yours. Its route survives. A war still ends the route by the usual rule.
- **Reading:** "cost half as much to buy" is the gold price of a caravan, as The Apoikia reads the gold price of a settler.
- **Tier of The Turnpike Trusts, to confirm with the user:** see "Questions" below.

## Scientific

| Doctrine | Tier | The comment | The Doctrine now |
|---|---|---|---|
| The Pythagorean Brotherhood | I | *"revise: +2 science in every city, doubled in cities with a shrine."* | +2 science in every city, doubled in cities with a Shrine. |
| The Academy of Gondishapur | II | *"revise: cities with an empire building gain +15% science. +20% production towards empire buildings."* | Towns with an empire building gain +15% science. +20% production toward empire buildings. |
| The Deputatoi | II | *"remove"* | Removed. |
| The Pandidakterion | II | *"tiles with an academy have double yields (applied after all modifiers on the tile)"* | Hexes with an Academy have double yields, applied after every other change to the hex. |
| The Directorate of Arms | III | *"revise: while no empire you have met know more technologies than you, gain +3 combat strength on all units."* | While no empire you have met knows more technologies than you, your units gain +3 combat strength. |
| The Külliye | III | *"revise: cities with an academy can build an extra copy of all empire buildings. +50% production towards empire buildings."* | Towns with an Academy may build their own copy of each empire building. +50% production toward empire buildings. |

- **Reading:** "doubled in cities with a Shrine" is +4 science in such a city. In the building's package it is one line of +2 in every city and one of +2 on the Shrine.
- **Reading:** The Külliye lifts the limit of one per empire in a town with an Academy inside its borders. It does not cover the rows that end the game (the Magnum Opus and its works). A town still holds one copy.
- **Reading:** a hex's double yields come after every line on the hex, so a doubler sees the renewals, the cards and the resource. The same step serves The Two Sanctuaries.

## Magisterial

| Doctrine | Tier | The comment | The Doctrine now |
|---|---|---|---|
| The Arthashastra | I | *"revise: gain an extra wildcard slot. it's effect counts twice."* | You have one more Wildcard chair. The card seated in it counts twice. |
| The Choregia | I | *"culture buildings give +3 culture and +2 renown each."* | Culture buildings give +3 culture and +2 renown each. |
| The Periclean Works | I | *"+2 production"* | Each wonder you hold gives +2 production in every town. |
| The Peregrini | II | *"great people works give +1 food and +1 production to all adjacent tiles. Laying a great person work reduces the cost of the next great person by 20%."* | Great-person works give +1 food and +1 production to every hex beside them. Laying a great-person work makes your next great person cost 20% less. |
| The Council of Ten | III | *"Gain two wildcard chairs."* | You have two more Wildcard chairs. |

- **The Arthashastra, to confirm with the user:** see "Questions" below.
- **Reading:** The Peregrini's discount does not stack. Two works laid before the next person still give 20%. The discount is spent when the next person is called.
- **Reading:** a hex beside two works gains +2 food and +2 production, as The High Towns reads two mountains.
- The proposal's question 1 about doubling movement no longer applies.

## Devotion

| Doctrine | Tier | The comment | The Doctrine now |
|---|---|---|---|
| The Theoric Fund | I | *"gain +1 culture for every 3 faith your empire generates."* | +1 culture for every 3 faith your empire makes. |
| The Rites of Zhou | I | *"+2 food and +2 happiness for each city holding a rite"* | Each town holding a rite gains +2 food and +2 happiness. |
| The Capitulary of Herstal | II | *"rites cost half as much."* | Rites cost half as much. |
| The Ribats | II | *"military units created in a city following your religion gain +3 combat strength. Conquering a city converts it to your religion."* | Military units created in a town following your religion gain +3 strength for good. Conquering a town converts it to your religion. |
| The Canons of the Holy Sepulchre | III | *"30% discount to faith purchasing in cities with a holy site."* | Towns with a holy site buy with faith at 30% less. |
| The Two Sanctuaries | IV | *"tile yields on a tile with a holy site are doubled."* | Hexes with a holy site have double yields, applied after every other change to the hex. |

- **Reading:** "created" is every way a town gains a military unit: trained, bought or granted. The +3 stays with the unit through upgrades and is lost with it.
- **Reading:** "converts" means your religion is the town's majority on the turn you take it, however much pressure others held. A seat with no religion gets nothing. A city's religion stays derived from pressure, never stored.
- **Reading:** The Rites of Zhou pays in the town, not to the empire, because food is a town's yield.
- **Reading:** The Capitulary halves the price `riteCostAhead` shows, the rite ladder included, floored once.

## Questions

Three comments can be read in more than one way. The recommended reading stands until the user answers. Answers are recorded here.

1. **The Arthashastra's "it".** Recommended: the card seated in the extra Wildcard chair counts twice. Other reading: an extra Wildcard chair, and the government's ability still counts twice, as the Doctrine said before.
2. **Human Sacrifice's price.** Recommended: the citizen is the whole price. No faith and no prophet, and the rite reaches every town the seat holds. Other reading: the citizen replaces only the prophet, and the seat still pays the rite's faith for each town.
3. **The Turnpike Trusts' tier.** Recommended: Tier III, where Commerce lost two Doctrines. Other reading: Tier II. The user wrote "age 3": Doctrine Tier II is first offered about turn 72 (late age 2, age 3) and Tier III about turn 133 (late age 3, age 4).
