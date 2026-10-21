# Scientific: a way to play, built from four themes (proposal)

**Status:** first draft, 2026-10-20. Revised 2026-10-21: sections 2 to 10 now carry the user's review comments (section 14) and the rulings of sections 12 and 13. The build plan is `docs/plans/scientific-build-triage.md`. Nothing here is built. The deck sheet (`docs/decks/scientific.md`), the data and the code are unchanged. This is the Scientific deck pass on the method of 2026-10-20 (the card-design skill, "A way to play, built from a few themes"): the map, the engine, four themes, example councils and the type sort. It replaces the builds of `docs/plans/scientific-builds.md`; that file's map of materials, pairs and leaders is refreshed here.

The user's request, 2026-10-20, verbatim:

> *"claude, i think you can do it. you can be a great card designer, don't be afraid to opinionated, bold, bias towards things that are interesting and fun rather than focusing on numbers. try to focus on not adding new sources of user inputs and operate on what mechanics we have. if there's an interesting compelling feature that would affect multiple decks, and could enable some design ideas, let me know."*

The pass builds on "Scientific, sketched 2026-10-20" in `docs/decks/deck-design.md`, which you approved (*"great!!"*). It keeps the sketch's four themes and its engine, and changes two things (section 2).

## 1. How to read this

- **Chairs:** 3 at the start, 5 at Tier I (draft 4) and Tier II (draft 10), 8 at Tier III (draft 18), 11 at Tier IV (draft 26). Charters take no chair.
- **Tiers in turns** (the bot model): Tier I from about turn 32, II from 72, III from 133, IV from 161.
- **Role:** *supply* (more of the thing), *widen* (the thing pays something it did not), *multiply* (the thing's output grows), *act* (a choice or a moment). *Glue* raises or spends the engine.
- **Status:** *kept* (on the sheet; a move or new rarity is noted), *reworked* (on the sheet, changed), *new* (not on the sheet; "(10-17)" marks a card from the superseded pass), *cut*, *moved* (to the shared cards). "Revised 2026-10-21 (section 14)" marks a row the user's review comments changed.
- **Shape:** *existing*, *new shape* (section 7), or *feature A* / *feature B* (the card uses a feature in section 6; both were accepted on 2026-10-20).
- **Type:** Military, Economic, Civic or Wildcard (`docs/plans/doctrines-governments-chairs.md`, section 4).
- **Numbers are first guesses** against the power bar. The effort went into shape.

## 2. The map

### The way to play

- Scientific reaches things first. It researches, spends its science on charter technologies no rival can take, and turns its lead into four things: a land lined with Academies, the realm's great houses raised early, a few great cities, and a small army a generation ahead.
- It is paid for advancement, it is strongest in the windows when it is ahead, and it gives up numbers: few towns, few units, and charter technologies that cost half again.
- It stays out of civic life, with one exception the user ruled: the Physic Garden pays +2 happiness (revised 2026-10-21, section 14). No card pays authority.

### The engine

- **Technologies and charters.** The deck makes science in bulk and spends it on thirteen charter technologies (revised 2026-10-21, section 14). Each opens one theme's thing: a building, an improvement or a trait for a line of units that no other empire has, or has yet.
- **The engine feeds the army with no card.** When a technology opens a unit's successor, every unit of that line upgrades in place (`upgradeTargetForType`, Entry V). A charter technology improves a whole line at once: when Mechanics lands, every Catapult gains the Onager trait (+1 range, and no strength since section 14), and keeps it as a Trebuchet.

### Two changes from the sketch

- **The Magnum Opus is an institution.** It is an empire building in the data and the deck's way to win, so the institutions get a Tier IV goal.
- **The elite army rests on the upgrade rule.** Research upgrades the army for free, so "few, advanced units" produces itself, and the army's cards have something to push: line traits from charters, a heal on the upgrade, an upgrade without the metal.

### Materials

"Self-producing" means a Scientific game makes it whether or not a card asks.

| Material | Self-producing? | In the sim | Theme |
|---|---|---|---|
| Technologies completed and known | Yes | `tech` occasion; `techsResearched`; `techWorld` firsts | engine |
| Charters and charter technologies | No: drafted | `CharterSpec.unlocks.tech`, `charteredTechs`; rows not in `techs.json` | engine |
| The lead (technologies only you know) | For a racer; each charter technology adds one | no card reads it yet; feature B adds the reading | engine, army |
| Great scholars | Slowly: science buildings and scholar guildsmen pay scholar renown | `greatPersonGained` with a family; `greatPeopleGained`; ladder 75 · 256 · 441 · 633 | learned land |
| Academies and works beside them | From scholars | `greatWork` and `beside` tile tests; +3 science; opens the resource under it | learned land |
| Charter improvements | No: charters | improvement rows, as Expansionist's tended works | learned land |
| Empire buildings | Partly: eight in the tree, the Codex, the Opus | `oncePerEmpire`; `empireBuildings` count; `hasEmpireBuilding` scope | institutions |
| Charter buildings | No: charters | the Scriptorium and the Bastion (exist); five new rows: the Bimaristan, the Tophane, and since section 14 the Specularium, the Mouseion and the Aldine Press | institutions, cities |
| A building's age | Yes: time | `City.buildingTurns`, `standingTurns` | institutions, cities |
| Big towns and their schools | For a tall seat | `population`, `capitalPopulation`, `populationAtLeast`; `buildingsOfCategory` | great cities |
| Guildsmen (the trades) | In big towns with renown buildings | the `guilds` phase, `City.specialists`; no card reads them yet; feature A adds the count | great cities |
| Wonders: access and production | With production; races can be lost | a technology's `unlocks`; `productionBonus` on wonders | great cities |
| Units and their upgrades | Yes | `upgradeTargetForType`; `unitStamp`; `UnitFilter.ageAtMost` | elite army |
| Improved unit lines | No: charters | the charter technology's effects, filtered to one line of units (Steel's +1 movement for melee units is the model) | elite army |
| Strategic resources | From the map | `uniqueStrategicResources`; an Academy on a resource opens it | army, land |
| The Magnum Opus | At the end of every game | `theMagnumOpus`, the `contribute` command, `raisingOpus` | institutions |

### What a Scientific player wants in each age

- **Age 1 (Tier 0): start the clocks.** The first Library, the first charter, the first scholar renown, the first Physic Garden. Few towns, placed well. (Revised 2026-10-21, section 14: The Palace Archive, which opened empire buildings early, is cut.)
- **Age 2 (Tier I): open the institutions.** The Mouseion (the Librarians' Charter), the Aqueduct early, the first Academy. (Revised 2026-10-21, section 14: the Forum and the Great Library no longer come early.)
- **Age 3 (Tier II): the great houses and the campus.** Empire and charter buildings, Academies with works beside them, wonders raised while no rival can build them (The Great Designs), the army's first window (Mechanics).
- **Age 4 (Tiers III and IV): the windows.** Universities, the Tophane, the Grenadier and Galleass traits, the race to Alchemy and the Opus.

### The areas it reaches

The army (the elite army), the land (Academies, works, charter improvements, mines and quarries), the economy (institutions; the cities' food and production), and great people and wonders. Civic life: only the Physic Garden's happiness, which the user ruled (section 14).

### Its cost

Revised 2026-10-21 (section 14): The Companions is now a shared card with a new text, so it no longer carries the cost.
- **Few towns:** The Free Cities pays only while you hold at most five towns. The Round City, The Queen of Cities and The Sum of Knowledge pay a few big towns.
- **Few units:** The Quiet Faculties slows military units. The Tophane trains the army in one town.
- **Charter technologies cost half again,** and thirteen charters compete for picks with chair cards.
- **Windows close:** The Secret Arts and The Proving Ground pay only while ahead. The Great Designs pays only while no met empire knows the wonder's technology, and The Edge of the Sword only against an empire behind you.

### Pairs

- **Dominion, the military edge** (no leader). Scientific gives improved unit lines (four charters), an army that upgrades in place, and metal from Academies (The School of Mines). Dominion gives kills and captured schools (Copying the Enemy, Field Academies, Carried-Off Scholars), and Citadels that count as Academies beside one. The shared The Soldier-Scholars (was The Companions) makes a garrison fight harder and pay science. Best with the elite army and institutions. (Revised 2026-10-21, section 14.)
- **Expansionist, the engineers** (Nezahualcoyotl). Expansionist gives big towns, mountains (Hydraulic Schools) and Manufactories beside Academies. Scientific gives the Qanat, the early Aqueduct and Physic Gardens, and the two share The Assay (science on strategic resource hexes). The Free Cities works against Expansionist's width. Best with great cities and the learned land. (Revised 2026-10-21, section 14.)
- **Commerce, the patrons** (no leader). Commerce gives gold for schools and houses, foreign routes that pay science (Books from the Ships, Merchant Scholars) and Customs Houses beside Academies. Scientific gives the Printers' Charter, whose Aldine Press makes routes pay science and culture, and makes the Caravanserai and Bourse stronger as empire buildings. Best with institutions. (Revised 2026-10-21, section 14.)
- **Devotion, scholars of the faith** (Al-Ma'mun). Devotion gives faith that buys science buildings, Temples that teach (Cloister Schools) and Holy Sites beside Academies. Scientific gives the High Temple made stronger, and the Schoolmen's Charter as a shared card. Best with great cities and the learned land.
- **Magisterial, the academy** (Hypatia). Magisterial gives more drafts (more charters seen), Landmarks beside Academies, and pay for holding wonders. Scientific gives charters (each a draft for The Court Painter), scholars and Academies, and wonders raised first (The Great Designs): one deck raises them first, the other is paid for holding them. (Revised 2026-10-21, section 14.) Best with the learned land and great cities.

### Leaders

- **Hypatia** leads the learned land: The Royal Tutors, The Scholars' Fame, The Royal Readers, The Latin Quarter, The Nizamiyya, The Studium Generale. Her share and The Nizamiyya's stack: hers is taken of the work's own figure, the Nizamiyya's of the whole hex.
- **Al-Ma'mun** leads the great cities: The Common Tables (his own food job, so the two stack), The Round City, The Queen of Cities, The Scholars' Guild.
- **Nezahualcoyotl** leads the great cities through the capital and the Aqueduct: the Surveyors' Charter, The Round City, The Free Cities, The Sum of Knowledge.
- **The gap:** no leader points at the elite army or institutions. The army's natural leader would hold Dominion and Scientific (Ashurbanipal: the library at Nineveh beside the Assyrian siege train).

## 3. The engine: technologies and charters

### How charters work here

- The ruled behaviour stays: drafted, no chair, the technology opens for research on the pick and costs its column × 1.5 (ruling (qqqqqq) 10). No card depends on a charter technology (ruling 11).
- **Every Scientific charter opens a technology.** Expansionist's open an improvement directly. Scientific pays for its charters twice: a pick and research.
- **Two charters at Tier 0,** because the review of 2026-10-06 found the identity arrived late and by chance. A first-hand charter is a real choice between a chair card and a research path.
- **A charter technology's bonus is one no other empire can reach:** a row nobody else can build, an improved unit line, or a building early (only the Surveyors' Aqueduct since section 14). One charter opens a row the game keeps for an unwritten fifth age (the Bastion, `awaitsTech`). (Revised 2026-10-21, section 14: three charters now open new buildings instead of old ones early, and the one rule, the Hermetic's, is cut.)
- **No charter opens a unit early** (the ruling of 2026-10-21). The Bronze-Founders', Mechanists', Alchemists' and Naval Gunners' charters improve a line of units instead: a small bonus and one ability, which the line keeps through every upgrade (below).

### The charters

| Charter | Tier | Rarity | Opens (age) | Knowing it gives | Theme | Type | Status |
|---|---|---|---|---|---|---|---|
| The Herbalists' Charter | 0 | common | Herbals (1) | Workers may build the Physic Garden on flat land with fresh water, one in each town: +2 science, +2 happiness. | learned land | Civic | new; new row; revised 2026-10-21 (section 14) |
| The Bronze-Founders' Charter | 0 | uncommon | Casting (1) | Two line traits: Hoplite (spear line: +1, and +1 for every four citizens of the town it fights in) and Maryannu (chariot line: +1, and +5 against a unit below half health). | elite army | Military | new; reworked 2026-10-21 (was the Phalanx and the Swordsman early) |
| The Surveyors' Charter | I | uncommon | Surveying (2) | The Aqueduct before Engineering. Workers may build the Qanat, which waters the farms beside it. | great cities, land | Economic | kept |
| The Glassmakers' Charter | I | uncommon | Optics (2) | The Specularium, a city building only you can build: +3 food, and +1 science for every two citizens of its town. | great cities | Civic | kept; revised 2026-10-21 (section 14): a new building, not the Observatory early; its figures revised 2026-10-21 (section 15) |
| The Librarians' Charter | I | rare | Cataloguing (2) | The Mouseion, an empire building only you can build: +4 renown a turn, favouring great scholars, and +2 culture for each empire building you hold, itself included. It costs 30% more production than an ordinary empire building. | institutions, learned land | Civic | new; revised 2026-10-21 (section 14): a new building, not the Forum and the Great Library early; revised 2026-10-21 (section 15) |
| The Paper-Makers' Charter | II | uncommon | Papermaking (3) | The Scriptorium: +2 science, and +10% science in a town with an Academy in its borders. | institutions, land | Civic | new; the row exists |
| The Physicians' Charter | II | uncommon | Medicine (3) | The Bimaristan, an empire building: +25% food in its town; your units heal 10 more a turn in your land. | institutions, cities | Economic | new; new row |
| The Mechanists' Charter | II | rare | Mechanics (3) | Two line traits, with no strength bonus: Onager (catapult line: +1 range) and Repeating Crossbow (archer line: it may move after it shoots). | elite army | Military | reworked 2026-10-21 (was the Trebuchet and the Crossbowman early); revised 2026-10-21 (section 14): no strength |
| The Printers' Charter | II | uncommon | Printing (3) | The Aldine Press, a city building only you can build: +2 culture, and trade routes from its town gain +2 science and +2 culture. +1 trade route. | great cities; the Commerce pair | Civic | kept; revised 2026-10-21 (section 14): a new building, not the Printing House early |
| The Gunfounders' Charter | III | uncommon | Gunfounding (4) | The Tophane, an empire building: military units gained in its town start with +4 strength, and it builds them 25% faster. | institutions, army | Military | reworked (was the Great Gun, IV); revised 2026-10-21 (section 14): +4, not +8 |
| The Alchemists' Charter | III | uncommon | Chemistry (4) | The Grenadier line trait (sword line: +1, and +1 for each charter technology you know). Workers may build Niter Beds beside a farm or pasture: one niter. | elite army, land | Military | reworked (Niter Beds; the Grenadier trait in place of the Fire Lance before Alchemy); revised 2026-10-21 (section 14): +1, not +3, a reading to confirm |
| The Military Engineers' Charter | IV | uncommon | Military Architecture (4) | The Bastion (+5 defence, +30 hit points), which no ordinary technology opens. | great cities | Military | new; the row exists |
| The Naval Gunners' Charter | IV | uncommon | Naval Gunnery (4) | The Galleass line trait (Gun Galleys: +3, and they blockade). | elite army | Military | new; reworked 2026-10-21 (was the Frigate and the Corvette; a reading to confirm, section 12) |

- **13 charters** (revised 2026-10-21, section 14), the most of any deck: 2 / 3 / 4 / 2 / 2 across Tiers 0 to IV. By theme (a bridge counts twice): learned land 4, institutions 4, great cities 5, elite army 5. Five charters are bridges: the Surveyors', Paper-Makers', Physicians', Gunfounders' and Alchemists'.
- **Cut:** the Naturalists' (a raw bonus behind a charter) and the Metallurgists' (it needs a new unit row). **Cut by the user, 2026-10-21 (section 14):** the Hermetic (*"not very impactful"*) and the Experimenters' (The Great Experiment's rule, merged into it, goes with it). **Moved:** the Schoolmen's becomes a shared Devotion · Scientific charter; it opens nothing in Scientific's themes.
- **The technologies:** thirteen rows in their own section of the tree, each with one ordinary parent; your chart places them. In age 2 one costs 150 to 285 science. Only the charter's holder may research it, so each one counts toward the lead (feature B). A rival's charter technologies do not count in your gap (section 12, item 3, to confirm), so The Translation Movement and Books from the Ships never read them. The Commonplace Book takes 15% off the whole charter price (section 12, item 4).

### Improved unit lines (the rulings of 2026-10-21)

No charter opens a unit before its technology (section 12, item 5). A military charter's technology improves a **line** of units the empire can already build. Each trait gives one ability and a small strength bonus: +1 at Tier 0, none at Tier II (section 14), +1 for the Grenadier (section 14, a reading to confirm) and +3 for the Galleass (section 13, a reading to confirm). The line keeps both through every upgrade (section 13). (Revised 2026-10-21, section 14.)

| Charter | Trait | Line | Bonus | Ability | Shape |
|---|---|---|---|---|---|
| Bronze-Founders' (0) | Hoplite | Spearman, Phalanx, Spear Wall, Pikeman | +1 | In one of your towns, +1 strength for every four citizens of that town. | new shape: a fight reads the citizens of the town the unit stands in |
| Bronze-Founders' (0) | Maryannu | War Chariot, Horseman, Knight | +1 | +5 strength against a unit below half health. | existing (`targetBelowHalf`) |
| Mechanists' (II) | Onager | Catapult, Trebuchet | none (revised 2026-10-21, section 14; was +2) | +1 range: it shoots from three hexes. | existing (`unitStat` range) |
| Mechanists' (II) | Repeating Crossbow | Archer, Bowman, Composite Bowman, Crossbowman | none (revised 2026-10-21, section 14; was +2) | It may move after it shoots. | new shape: a unit flag (`hitAndRun`) granted by an effect |
| Alchemists' (III) | Grenadier | Warrior, Swordsman, Legionary, Longswordsman | +1 (revised 2026-10-21, section 14; was +3; a reading to confirm) | +1 strength for each charter technology you know. | new shape, shared with The Great Catalogue: a count of charter technologies known |
| Naval Gunners' (IV) | Galleass | Gun Galley | +3 | It blockades: parked off a rival's port, it closes the town's sea lane and its trade. | new shape: the same granted flag (`blockades`) |

- **What each ability changes:**
  - Hoplite: the citizen-soldier of the polis. The spear line becomes the guard of the deck's great cities: a Pikeman in a capital of 20 citizens fights at +6.
  - Maryannu: the chariot elite rides down the broken. Bows and Onagers wound; the Maryannu finish. Few units, and every blow counts.
  - Onager: it shoots the walls from where the walls cannot answer.
  - Repeating Crossbow: shoot, then step back behind the spears. A small army does not stand still for the counterblow.
  - Grenadier: the sword line grows with the deck's engine. Every charter drafted makes it harder.
  - Galleass: a gun ship that also holds a port shut, so one hull does the work of two.
- **The Fire Archers moved** to the sword line as the Grenadier. With whole lines, the Repeating Crossbow already covers the Crossbowman, and the sword line had no trait.
- **The model: a trait on the line, carried by the charter technology.**
  - A technology already carries card effects for units: Steel gives melee units +1 movement (`unitStat` with a `class` filter, `data/techs.json`). A charter technology carries its trait's effects in the same way.
  - One new filter field, `line`, names a chain's first unit and admits every unit its `upgradesTo` chain reaches. A leader's unique that upgrades into the chain (the Fubing into the Spear Wall) joins the line then.
  - So the trait stays through every upgrade by construction, with no new unit row. A unit costs what it always cost, and no rival can copy the trait.
  - **The army still changes in place.** On the turn the charter technology lands, every unit of the line gains the trait. Its type does not change, so its health and stamps stay as they are.
- **How it is named and shown:**
  - The unit keeps its type name, with the trait after it on the unit card: "Spear Wall · Hoplite".
  - The bonus and the ability print as labelled lines in the combat forecast's one ledger ("Hoplite +1", "Hoplite, citizens +5").
  - The trait's name is a label on the technology's effects, a small new shape. Without it the lines would read "Casting".
  - The unit carries no new field, so the piece fingerprint does not change. A badge on the piece is a later art decision.
- **Scale:** the bonus is now small (none to +3, against units of 15 to 80), so the jump between ages stays as it is. The abilities carry the traits. (Revised 2026-10-21, section 14.)
- **Greek Fire stays a window.** A trait does not stop a rival from building the same type, so Greek Fire ("a unit no empire you have met can build") pays only while the seat's research is ahead, as first designed. No cap is needed.
- **The Field Refits** heals on an ordinary upgrade; a trait arrives without one. **The Edge of the Sword** reads the research race alone.
- **The Bastion** (the Military Engineers' Charter) is a building beyond the tree, not a unit, so these rulings leave it. Question 5 in section 10 still asks about it.

### Engine glue

| Card | Tier | Rarity | Job | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Royal Workshops | 0 | common | the moment | Completing a technology grants 15 production in your capital. | production | Economic | new (10-17); existing |
| The Prize Essay | 0 | common | a window | Completing a technology before any other empire grants 15 culture and 15 production in your capital. Charter technologies do not count. | culture, production | Civic | kept; existing, plus a filter |
| The Sky Watchers | 0 | common | early faith | Shrines give +1 faith and +1 science. | faith, science | Civic | kept; existing |
| The Commonplace Book | I | common | charters | Charter technologies cost you 15% less research. | science | Civic | kept, moved from 0; new shape |
| The Astronomical Diaries | I | uncommon | grower | While seated, this card gains +1 culture and +1 production each time you complete a technology. It starts at +2 of each. | culture, production | Civic | new (10-17); new shape |
| The Secret Arts | I | uncommon | the lead | Each town gains +1 production for each technology you know that no empire you have met knows, at most +5. | production | Economic | new (10-17); feature B |
| The Charter Rolls | II | uncommon | "this game" count | Your capital gains +3 production and +3 culture for each charter you have drafted. | production, culture | Civic | reworked (was +5 science, III); new shape |
| The Translation Movement | II | uncommon | catch-up | Technologies that an empire you have met already knows cost you 20% less research. | science | Civic | new (10-17); feature B |
| The Royal Charter Commission | II | uncommon | commission | Commission. Complete a charter technology while this is seated. Reward: a great scholar and 100 culture. Then it leaves its chair. | a scholar, culture | Wildcard | kept; new shape |
| The Age of Reason | III | rare | capstone: doubles | Your Orders count each technology you complete twice. | doubles | Wildcard | new (10-17); new shape |
| The Journeymen | III | common | the moment | Completing a technology grants each town production equal to three times its population. | production | Economic | new (10-17); new shape |
| The Patent Office | IV | uncommon | charters | Charter technologies cost you no more research than ordinary ones. | science | Civic | kept, rare to uncommon; new shape |
| The Closed Book | IV | rare | the race | If you complete Alchemy before any other empire, empires that do not know Alchemy may not begin the Magnum Opus for 10 turns. | denial | Civic | kept; new shape |
| The Prototype Works | IV | rare | rule-breaker | You may build the buildings and train the units of the technology you are researching, at double their production cost. Wonders do not count. | construction early | Economic | kept; new shape |

The Age of Reason doubles every Order's pay on a technology: The Royal Workshops, the Diaries' growth, The Scholars' Fame, The Journeymen and a commission's count. Glue is 14 of 64 seatable cards (22%; revised 2026-10-21, section 14).

## 4. The themes

### 4.1 The learned land

**The fantasy:** Baghdad's House of Wisdom and the Latin Quarter of Paris. Scholars found Academies, and the land around them fills with gardens, works and schools. **The quantity:** Academies held and great scholars gained, which come by themselves to a seat with science buildings. **Areas:** the land, great people.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Royal Tutors | 0 | common | supply | +1 renown a turn for each science building you have, favouring great scholars. | renown | Civic | new (10-17); existing |
| The Prospectors' Notes | 0 | uncommon | act | Building a mine or a quarry grants its town 25 production. | production | Economic | reworked (was 30 science and 15 production for a buried seam; veins are shelved, so it paid nothing); existing |
| The Scholars' Fame | I | common | supply | Completing a technology grants renown, favouring great scholars, equal to a twentieth of its cost. | renown | Civic | new (10-17); new shape |
| The Old Academy | I | uncommon | widen | An Academy at least twenty turns old gains +3 food and +3 production. At forty turns these become +6 of each. | food, production | Economic | kept (built) |
| The Founding Gift | I | uncommon | act | A great scholar who founds an Academy also grants its town 150 production. | production | Economic | new; new shape |
| The Roll of Scholars | II | uncommon | multiply: scaler | +4% production and culture for each great scholar you have gained this game, at most +30%. | production, culture | Civic | new (10-17); existing |
| The Latin Quarter | II | common | widen | Great-person works beside an Academy gain +2 culture and +1 production. | culture, production | Civic | new; existing |
| The Royal Readers | II | rare | supply: rule-breaker | Great scholars raise the price of your next great person by half as much. | great people | Civic | new; new shape |
| The Quiet Faculties | II | rare | widen, with a drawback | Cities working an Academy gain +25% food and +20% production, but produce military units 25% more slowly. | food, production | Economic | kept (revised); existing |
| The Studium Generale | III | rare | capstone: rule-breaker | Great-person works beside an Academy count as Academies for your cards. | every Academy card | Wildcard | new; new shape |
| The Nizamiyya | III | uncommon | multiply | Academies produce half again of everything they make. | all | Civic | new; existing |
| The Doctorate | III | common | act | Gaining a great scholar grants culture equal to eight turns of your culture. | culture | Civic | new (10-17); existing |
| The School of Mines | III | common | widen | An Academy standing on a strategic resource supplies one more copy of it. | strategic copies | Economic | reworked (was The Ordnance Rolls, I); new shape |
| The Republic of Letters | IV | uncommon | multiply | Your capital gains +4 production and +4 culture for each Academy you hold. | production, culture | Civic | new; existing |
| The Lynx-Eyed Academy | IV | rare | act: commission | As on the sheet: hold four Academies; a great scholar and 300 production in each Academy town. | a scholar, production | Wildcard | kept; new shape |

Charters: the Herbalists' (0), the Surveyors' (I), the Paper-Makers' (II), the Alchemists' (III).

- **Scaler:** The Roll of Scholars. **Capstone:** The Studium Generale. A Landmark, Citadel or Holy Site placed beside an Academy becomes an Academy for The Old Academy, The Nizamiyya and The Republic of Letters, so the great person's work becomes a placement decision and the partner's works join the campus.
- **The Royal Readers:** a seat that has called four scholars and nobody else pays 441 renown for its fifth great person instead of 834.
- **Bridges:** The School of Mines (to the army: found the Academy on the iron hill); The Invitations and The Long Inheritance (institutions); The Long Study (great cities); The Scholars' Fame (engine).
- **The split:** The Professors (a scholar founds an Academy and writes its treatise) and The Great Treatises (a treatise pays twice) are not taken. Doubled great-person effects are Magisterial's, and its The Universal Genius already does the first. The Royal Readers gives "more from each scholar" through supply instead.

### 4.2 Institutions

**The fantasy:** the Forum, the Throne and the Observatory of the realm, and houses no other empire can raise: the Bimaristan of Baghdad, the Tophane of Istanbul. **The quantity:** empire buildings held, which rise all game. **Areas:** the economy, the Opus.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| Learned Foundations | I | common | supply | Cities with a Library build empire buildings 25% faster. | production | Economic | reworked (trimmed; its culture goes to The Dedications); existing |
| The Royal Estates | I | common | widen | Each empire building gives its town +2 food and +2 production. | food, production | Economic | new; revised 2026-10-21 (section 14): per empire building, not per town; existing |
| Enduring Institutions | II | uncommon | multiply: scaler | A town with an empire building at least twenty turns old gains +25% production. | production | Economic | reworked (its +2 happiness goes); existing |
| The Invitations | II | rare | act | Completing an empire building grants a great scholar. | a great scholar | Civic | new; new shape |
| The Palace Schools | II | uncommon | widen | Units gained in a town with an empire building start with +4 strength. | combat | Military | new; existing |
| The Second Seat | III | rare | capstone: rule-breaker | You may build one second copy of an empire building, in a city with a University. | what the house pays | Civic | kept; new shape |
| The Royal Academies | III | uncommon | multiply | +5% production and culture for each empire building you hold. | production, culture | Civic | new; existing |
| The Long Inheritance | III | uncommon | supply | Cities working an Academy at least twenty turns old gain +30% production toward empire buildings, wonders and the Magnum Opus. | production | Economic | kept (revised), rare to uncommon; existing |
| The Great Catalogue | IV | rare | supply | +10% production toward the Magnum Opus for each charter technology you know, at most +40%. | production | Economic | kept; new shape |
| The Foundation Stone | IV | rare | rule-breaker | As on the sheet: begin the Opus before any empire knows Alchemy, once half of Alchemy is researched. | the Opus | Economic | kept; new shape |
| The Great Instrument | IV | rare | act: commission | As on the sheet: complete Alchemy; a tenth of the Opus in production. | production | Wildcard | kept; new shape |

Charters: the Librarians' (I), the Paper-Makers' (II), the Physicians' (II), the Gunfounders' (III).

Revised 2026-10-21 (section 14): The Palace Archive (0) is cut (the user: *"makes the pacing of the game weird"*), and so is the Experimenters' Charter (IV). The Second Seat stays (*"love this one"*).

- **Scalers:** Enduring Institutions, and at Tier I the Mouseion (the Librarians' Charter). **Capstone:** The Second Seat: a second Forum, Heroic Epic or Bimaristan, against the rule that names the class.
- **The sketch's four asks** (revised 2026-10-21, section 14): houses only you can raise (the Librarians', Physicians' and Gunfounders' charters), in place of houses opened early; production toward them (Learned Foundations, The Long Inheritance); each pays production or scholars (The Royal Estates, The Invitations); each made stronger (Enduring Institutions, The Royal Academies, The Second Seat).
- **The split:** Expansionist's empire-building cards scale with towns; none of these do.
- **The Invitations** is the strongest card here: six to nine houses a game means six to nine more scholars, each worth about 1,000 science in age 3 as a treatise. It is rare, and it makes the institutions feed the learned land.
- **Bridges:** The Palace Schools (army); The Invitations, The Long Inheritance (learned land); The Dedications (great cities).

### 4.3 Great cities

**The fantasy:** Babylon, Alexandria, Chang'an: a few towns grown huge around their schools, raising the world's wonders an age before anyone else. **The quantity:** the citizens of a few big towns and the schools in them, which a tall seat grows by itself. **Areas:** growth (the economy), wonders.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Almanac | 0 | common | supply | Libraries cost 25% less production and give +1 production. | production | Economic | kept (built) |
| The Scribes' Hall | 0 | common | widen | Cities with a Library gain +1 science per four citizens and +1 culture per three citizens. | science, culture | Civic | kept (built) |
| The Long Study | 0 | uncommon | multiply: age | A Library at least twenty turns old grants +2 culture and +1 renown. At forty turns these become +4 culture and +2 renown. | culture, renown | Civic | kept (built) |
| The Common Tables | I | common | supply | Towns gain +2 food for each science building in them. | food | Economic | new (10-17); existing |
| The Dedications | I | uncommon | act | Finishing a science building or an empire building grants culture equal to ten times the town's population. | culture | Civic | new (10-17), widened; existing |
| The Free Cities | I | uncommon | multiply, with a cost | While you hold at most five towns, your towns build buildings and wonders 20% faster. | production | Economic | new; existing |
| The Forward Plans | I | rare | supply: a school early | You may build a University in any city whose Library has stood at least 30 turns, before you know Scholarship. | science | Civic | kept; new shape |
| The Round City | II | uncommon | multiply: scaler | +1% production and culture for each citizen in your capital, at most +30%. | production, culture | Civic | new; existing |
| The Great Designs | II | rare | supply: wonders while ahead | Your towns build a wonder 30% faster while no empire you have met knows the technology that opens it. | production | Economic | new; revised 2026-10-21 (section 14): was wonders an age early in the capital; feature B |
| The City Architects | II | common | supply | Towns of at least eight citizens build wonders 25% faster. | production | Economic | new; existing |
| The Scholars' Guild | II | uncommon | widen | Scholars in the trades also pay +1 food and +1 production. | food, production | Economic | new; feature A |
| The Queen of Cities | III | rare | capstone: doubler | Towns of at least 15 citizens produce twice their food and production. | food, production | Economic | new; existing |
| The Humanists | III | uncommon | widen | Cities with a University gain culture equal to half their base science. | culture | Civic | new (10-17); existing |
| The Sum of Knowledge | IV | rare | finisher | Your capital gains +1 production and +1 culture for each technology you know. | production, culture | Civic | kept; new shape |
| The Walls of Learning | IV | common | defence | Cities with a University gain +6 strength, and the city building your Magnum Opus gains +12 more. | defence | Military | kept, uncommon to common; new shape |

Charters: the Surveyors' and Glassmakers' (I), the Printers' and Physicians' (II), the Military Engineers' (IV). The Glassmakers' Specularium feeds the tall town, and the Printers' Aldine Press widens its routes (revised 2026-10-21, section 14).

Revised 2026-10-21 (section 14): The Fellowships (III) is cut (the user: *"remove"*).

- **Scalers:** The Long Study and The Round City. **Capstone:** The Queen of Cities, a doubler on the towns the deck grows on purpose. An age 4 town of 16 makes about 35 food and 30 production, so it gains about 65 a turn; two such towns is band 3's regular card to headline.
- **The Free Cities** carries the cost in its condition: a sixth town switches it off.
- **The split** (revised 2026-10-21, section 14): these cards give production toward wonders (The Great Designs while no met empire can build them, The City Architects, The Free Cities). None gives a wonder early, and none pays for holding one.
- **Bridges:** The Dedications (institutions); The Long Study (learned land, through renown); the Physicians' Charter.

### 4.4 The elite army

**The fantasy:** the hoplites of Greece, the crossbows of the Song, the guns of the Tophane: few soldiers, armed better than anyone of their age. **The quantity:** units better than their age's standard. Research upgrades the army in place, and charters give whole lines a trait that survives every upgrade. **Areas:** the army.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The War Manuals | 0 | common | supply | Units gained in a town with a Library start with +2 strength. | combat | Military | new; existing |
| The Edge of the Sword | I | uncommon | multiply: the lead | Your units gain +3 strength against the units of an empire that knows fewer technologies than you. | combat | Military | new (10-17); revised 2026-10-21 (section 14): was against units of an earlier age; feature B |
| The Field Refits | I | uncommon | act | Each time research upgrades one of your units, it heals fully. | healing | Military | new; new shape |
| The Strategikon | II | uncommon | widen: a bridge from the learned land | Your units gain +4 strength while within two hexes of your great general, your great scholar or your Academy. | combat | Military | new; revised 2026-10-21 (section 14): was +1 for every five technologies you know; new shape |
| The Armoury Patterns | II | common | supply | Towns build units of the newest age you know 25% faster. | production toward units | Military | new; new shape |
| The Model Army | III | rare | capstone: rule-breaker | Research upgrades your units even when you lack the strategic resource the new unit needs. | the army | Military | new; new shape |
| Greek Fire | III | uncommon | widen | Gaining a unit that no empire you have met can build grants science and culture equal to its strength. | science, culture | Civic | new (10-17); feature B |
| The Proving Ground | III | uncommon | multiply: the lead | Your units gain +1 strength for each technology you know that no empire you have met knows, at most +8. | combat | Military | reworked (was per charter technology, IV); feature B |
| The Breaching Batteries | IV | uncommon | act | As on the sheet: siege units +5 against cities; each hit on the town building the Opus removes 5% of its banked production. | combat | Military | kept; new shape |

Charters: the Bronze-Founders' (0), the Mechanists' (II), the Gunfounders' and Alchemists' (III), the Naval Gunners' (IV).

Revised 2026-10-21 (section 14): The Assay (I) moves to the shared cards (Expansionist · Scientific, "Hexes with a strategic resource gain +2 science"), and The Companions (II) moves to the shared cards with Dominion as The Soldier-Scholars (proposed name), "Your military units in your towns gain +5 strength, and each supplies +2 science". Both are in section 8.

- **The traits** (section 3): Hoplite and Maryannu (0), Onager and Repeating Crossbow (II), Grenadier (III), Galleass (IV). No card names them, and neither Greek Fire nor The Field Refits reads them.
- **Scaler** (revised 2026-10-21, section 14): The Proving Ground, which grows with the lead. **Capstone:** The Model Army: with no iron, Swordsmen still become Legionaries when Iron Working lands.
- **The Field Refits** is the window card: research that lands mid-war is a fresh army. It breaks the rule that an upgrade never heals.
- **The Strategikon** (revised 2026-10-21, section 14) ties the army to the learned land: a column that marches beside an Academy, a great scholar or a great general fights at +4.
- **The split:** nothing reads ranks or experience (Dominion's). Units start better (`unitStamp` strength) or are newer.
- **Bridges:** The Palace Schools and the Gunfounders' Charter (institutions); The School of Mines, Niter Beds and The Strategikon (learned land).

## 5. Example councils

A Tier 0 card is marked (0). Charters drafted beside a council take no chair. Chair mixes are written Military / Economic / Civic / Wildcard. Revised 2026-10-21 (section 14): cut cards are replaced with live ones, and each chair mix is unchanged.

### Council 1: the great houses (great cities and institutions)

- **End of Tier I, the Council of Elders (1 / 2 / 1 / 1):** The War Manuals (0); The Royal Estates, The Free Cities; The Scribes' Hall (0); Learned Foundations in the Wildcard chair. Charters: the Librarians', the Surveyors'.
- **End of Tier II, the Republic (0 / 3 / 1 / 1):** The Free Cities, Enduring Institutions, The Great Designs; The Round City; The Dedications.
- **Tier III, the Merchant League (1 / 3 / 2 / 2):** The Palace Schools; Enduring Institutions, The Queen of Cities, The Long Inheritance; The Round City, The Royal Academies; The Second Seat, The Age of Reason. Charters: the Physicians', the Gunfounders'.
- **Tier IV, the Estates (2 / 4 / 2 / 3):** The Palace Schools, The Walls of Learning; Enduring Institutions, The Queen of Cities, The Long Inheritance, The Great Catalogue; The Round City, The Royal Academies; The Second Seat, The Foundation Stone, The Sum of Knowledge. Charter: the Military Engineers'.
- **How it feels:** on turn 45 Cataloguing lands and the capital raises the Mouseion beside the Heroic Epic and the Imperial Throne. The Mouseion pays +6 culture for the three houses and +4 scholar renown a turn (section 15), and The Royal Estates gives each house's town +2 food and +2 production. On turn 100 the capital starts a wonder whose technology no met empire knows yet, 30% faster under The Great Designs. On turn 150 the capital and the University town pass 15 citizens, The Queen of Cities doubles their food and production, and The Second Seat raises a second Forum.

### Council 2: the campus (learned land and great cities), with Magisterial

- **End of Tier I, the Priest-King (1 / 1 / 2 / 1):** a Magisterial Military card (The Ceremonial Guard); The Old Academy; The Royal Tutors (0), The Long Study (0); The Scholars' Fame. Charter: the Herbalists'.
- **End of Tier II, the Theocracy (1 / 0 / 3 / 1):** the Magisterial Military card; The Roll of Scholars, The Latin Quarter, The Royal Readers; The Old Academy in the Wildcard chair.
- **Tier III, Divine Mandate (2 / 1 / 3 / 2):** two partner Military cards; The Old Academy; The Roll of Scholars, The Nizamiyya, The Doctorate; The Studium Generale, the shared The House of Wisdom. Charter: the Paper-Makers'.
- **Tier IV, the Curia (2 / 2 / 4 / 3):** two partner Military cards; The Old Academy, The School of Mines; The Roll of Scholars, The Nizamiyya, The Doctorate, The Republic of Letters; The Studium Generale, The House of Wisdom, The Lynx-Eyed Academy.
- **How it feels:** on turn 50 Kidinnu founds an Academy beside the capital. On turn 110 the third scholar costs 256 renown instead of 441 (The Royal Readers), and a Magisterial artist raises a Landmark beside the Academy. On turn 160 that Landmark and a general's Citadel count as Academies: The Old Academy pays each +6 food and +6 production, The Nizamiyya adds half again, and Hypatia's own share adds half of each work's figure.

### Council 3: the Tophane (elite army and institutions), with Dominion

- **End of Tier I, the War Chief (2 / 1 / 1 / 1):** The War Manuals (0), The Edge of the Sword; The Royal Workshops (0); the shared Copying the Enemy; The Field Refits in the Wildcard chair. Charter: the Bronze-Founders'.
- **End of Tier II, Tyranny (3 / 1 / 0 / 1):** the shared The Soldier-Scholars, The Strategikon, The Edge of the Sword; The Secret Arts; The Field Refits. Charter: the Mechanists'.
- **Tier III, Imperium (3 / 2 / 1 / 2):** The Model Army, The Proving Ground, The Strategikon; The Secret Arts, The Journeymen; Greek Fire; The Age of Reason, The Soldier-Scholars. Charters: the Gunfounders', the Alchemists'.
- **Tier IV, the Sultanate (4 / 2 / 2 / 3):** The Model Army, The Proving Ground, The Strategikon, The Breaching Batteries; The Secret Arts, The Journeymen; Greek Fire, the shared Carried-Off Scholars; The Age of Reason, The Soldier-Scholars, The Palace Schools. Charter: the Naval Gunners'.
- **How it feels:** on turn 30 Casting lands, and every Spearman gains the Hoplite trait. On turn 95 Mechanics lands mid-siege: the Catapults gain the Onager trait and shoot the walls from three hexes, and the archers shoot and then step back behind the spears. The garrisons fight at +5 and each pays +2 science (The Soldier-Scholars), and the column beside the great general fights at +4 (The Strategikon). On turn 120 Natural Philosophy turns the Catapults into Trebuchets in place; they keep the Onager trait and heal fully (The Field Refits). On turn 150 Longswordsmen leave the Tophane at +4, and the Grenadier trait adds +1 and +6 for six charter technologies. Steel came before any rival knew it, so each one also pays science and culture (Greek Fire), and The Edge of the Sword gives +3 against every empire behind.

## 6. Features that would open cards in several decks

Neither adds a player input. You accepted both on 2026-10-20 (section 11). The fallbacks stay written down in case building either one runs into trouble.

### Feature A: the trades as a card quantity

- **What it is:** cards may count a town's guildsmen by family, and may change how many a town may have.
- **What the game already does:** the `guilds` phase (`src/sim/guilds.ts`) is passive. A town's renown buildings fill a guild bar; when it fills, one citizen joins the trade whose buildings earned most. At most a quarter of a town joins. Each guildsman pays its family's yield (scholar 2 science, merchant 4 gold, engineer 2 production, artist 2 culture) and 1 renown. The player's only verb is to dismiss one. So guildsmen appear by themselves in big towns, and no card reads them.
- **What it costs:** a `CountKind` for guildsmen (by family, in a town or the empire). The city panel already shows guildsmen. A rule percent on the share cap was the second part; since The Fellowships is cut (section 14), no Scientific card needs it. (Revised 2026-10-21, section 14.)
- **Cards it opens:**
  - Scientific: The Scholars' Guild. (The Fellowships was cut, section 14.)
  - Expansionist (population as a second engine): engineer guildsmen pay +1 food; towns of twelve or more fill their guild bar half again as fast.
  - Commerce: a trade route for every two merchant guildsmen; merchant guildsmen pay +2 gold in a town with a Market.
  - Magisterial: artist guildsmen pay +1 renown; a town with guildsmen of three families gains +15% culture (breadth).
  - Devotion, lightly: towns that follow your religion fill their guild bar faster.
- **Fallback:** The Scholars' Guild is cut.

### Feature B: reading rivals

- **What it is:** readings against the empires the seat has met: technologies it knows that none of them knows (the lead), technologies one of them knows that it does not (the gap), whether any of them can build a unit, and, since section 14, whether one of them knows a wonder's technology and whether an opponent knows fewer technologies than the seat.
- **What the game already does:** every empire's technologies are in the state, `empiresMet` is counted, `techWorld` records firsts, and Mithridates' `rivalHoldsMoreTowns` condition already compares the seat with a rival. Met empires only, so hidden information stays hidden.
- **What it costs:** one memo a turn over the met empires' technology lists, five count or condition kinds, and their words in the describers. (Revised 2026-10-21, section 14: was three.)
- **Cards it opens:**
  - Scientific (revised 2026-10-21, section 14): The Secret Arts, The Proving Ground, Greek Fire (the lead), The Translation Movement (the gap), The Edge of the Sword (an opponent that knows fewer technologies) and The Great Designs (a wonder's technology no met empire knows).
  - Commerce: the shared Books from the Ships, which waits on the gap today; a route to a more advanced empire pays more science.
  - Dominion: +strength against an empire that knows more technologies than you; a town captured from such an empire pays science toward one technology it knew.
  - Devotion: the Devotion · Scientific scriptoria: Temples pay science for each technology in the gap, capped.
  - Magisterial: drafts cost less culture while a met empire knows more technologies than you.
- **Fallback:** The Proving Ground reads charter technologies known (the sheet's version), Greek Fire reads units of the newest age you know, and The Secret Arts, The Translation Movement, The Edge of the Sword and The Great Designs are cut. (Revised 2026-10-21, section 14.)

## 7. New shapes

36 shapes in seven families (revised 2026-10-21, section 14). There were 35. Section 14 drops four: science as a contribution currency, Alchemy's parent waiver, two units' ages compared in a fight, and military units compared with towns. It narrows two: early access with a town test now serves only The Forward Plans, and the second way into a building row only the Aqueduct. It adds five, marked "(section 14)" below. All read what the game tracks. About half were already on the sheet (charters, early access, the Opus).

1. **The research record:** a tally of technologies completed while seated (The Astronomical Diaries); a count of technologies known (The Sum of Knowledge); the technology's cost as the moment's measure (The Scholars' Fame); each town's population as a grant on that moment (The Journeymen); the moment counted twice for Orders, Double Time's shape (The Age of Reason); "charter technologies do not count" on a rider (The Prize Essay).
2. **Charters and their technologies:** the thirteen technologies at × 1.5 (every charter); a second way into an existing building row (the Surveyors' Aqueduct); the premium read by a card (The Commonplace Book, The Patent Office); counts of charters drafted and charter technologies known, and a tally of charter technologies completed (The Charter Rolls, The Great Catalogue and the Grenadier, The Royal Charter Commission); happiness from a work (the Physic Garden, section 14; its "one in each town" is the Keep's existing `onePerTown`); new rows: the Physic Garden, the Qanat (waters the farms beside it), Niter Beds (a copy with no seam), and five buildings written in existing effect kinds: the Bimaristan, the Tophane, the Specularium, the Mouseion and the Aldine Press.
3. **Early access and wonders:** early access with a town test (The Forward Plans); production toward a wonder whose technology no met empire knows (The Great Designs, feature B, section 14); the current research's rows at double cost (The Prototype Works).
4. **Units, ages and upgrades:** a strength line against an empire that knows fewer technologies (The Edge of the Sword, feature B, section 14); a filter "of the newest age you know" (The Armoury Patterns); a moment when research upgrades a unit, and a full heal (The Field Refits); the upgrade's resource gate lifted (The Model Army); military units in your own towns, read as a strength line and a science payer (the shared The Soldier-Scholars, section 14); a strength line that reads your great people and Academies within two hexes (The Strategikon, section 14); a `line` filter (a unit and every unit its upgrade chain reaches) and a trait name as the label on a technology's effects (the four military charters); a unit flag granted by an effect (the Repeating Crossbow's `hitAndRun`, the Galleass's `blockades`); a fight that reads the citizens of the town the unit stands in (the Hoplite).
5. **Great people and works:** a moment for founding a work, with its family (The Founding Gift); a grant of a great person of a named family (The Invitations, The Royal Charter Commission, The Lynx-Eyed Academy); one family weighed at half in the great-person price (The Royal Readers); works beside an Academy counting as Academies for cards (The Studium Generale); a copy step on a work standing on a resource (The School of Mines).
6. **Buildings:** a second copy of an empire building, with a town test (The Second Seat).
7. **The Opus** (the sheet's): a door for one seat (The Foundation Stone); a delay on the door (The Closed Book); the test "the town building the Opus" and a hit that removes banked production (The Walls of Learning, The Breaching Batteries); a commission on one technology with a deal gate (The Great Instrument).

**New to this pass:** sixteen shapes (the newest-age filter, the upgrade moment and heal, the lifted gate, the founding moment, the half-weighted family, works as Academies, the copy step on a work; from 2026-10-21 the line filter, the trait label, the granted unit flag and the town's citizens in a fight; and from section 14 happiness from a work, the strength line against an empire behind you, wonder production while no met empire can build it, units in your own towns, and strength beside your great people and Academies) and seven rows (the Physic Garden, Niter Beds, the Bimaristan, the Tophane, the Specularium, the Mouseion, the Aldine Press). Units against towns left with The Companions' old text. (Revised 2026-10-21, section 14.) **For less engine work, cut** The Field Refits, The Armoury Patterns and The Founding Gift first.

## 8. The sheet's cards

### The Scientific cards (61)

| Card | Tier | Fate | Why |
|---|---|---|---|
| The Almanac | 0 | kept | great cities, supply |
| The Scribes' Hall | 0 | kept | great cities, widen |
| Field Notebooks | 0 | cut | exploration is Commerce's; it pushes no theme |
| The Long Study | 0 | kept | great cities; bridge to the learned land |
| The Prize Essay | 0 | kept | glue: a window |
| The Prospectors' Notes | 0 | reworked | learned land, act; veins are shelved, so it now pays on a mine or quarry built |
| The Palace Archive | 0 | cut 2026-10-21 (section 14) | the user: *"remove, makes the pacing of the game weird"*. The themes pass had reworked it to empire buildings early in the capital |
| The Commonplace Book | 0 | kept, to Tier I | glue; it pays nothing before a charter |
| The Sky Watchers | 0 | kept | the early faith every deck carries |
| The Tablet House | 0 | cut | a weak goal; Tier 0 needs theme openers |
| The Glassmakers' Charter | I | kept; revised 2026-10-21 (section 14) | great cities; Optics opens a new building, the Specularium, not the Observatory early |
| The Surveyors' Charter | I | kept | great cities, learned land |
| The Schoolmen's Charter | I | moved | becomes a shared Devotion · Scientific charter |
| The Temple Observatory | I | cut | two narrow facts (a Temple and an Observatory) |
| The Field Survey | I | cut | filler; the Qanat carries the Expansionist pair |
| The Old Academy | I | kept | learned land, widen (your example) |
| Learned Foundations | I | reworked | one effect; its culture goes to The Dedications |
| The Assay | I | moved 2026-10-21 (section 14) | a shared Expansionist · Scientific card: hexes with a strategic resource gain +2 science |
| The Ordnance Rolls | I | reworked | becomes The School of Mines, Tier III |
| The Prize Question | I | cut | the engine keeps one commission |
| The Forward Plans | I | kept | great cities: a school early |
| The Metallurgists' Charter | II | cut | needs a new unit row |
| The Naturalists' Charter | II | cut | a raw bonus behind a charter |
| The Mechanists' Charter | II | reworked; revised 2026-10-21 (section 14) | elite army; line traits, not units an age early (2026-10-21), with no strength bonus (section 14) |
| The Printers' Charter | II | kept; revised 2026-10-21 (section 14) | great cities; the Commerce pair; Printing opens a new building, the Aldine Press, and keeps +1 trade route |
| The Spectacle Makers | II | cut | maturity is no longer a theme |
| The Religious University | II | cut | The Studium Generale does its job for every work |
| Crucible Steel | II | cut | too many combat lines |
| New Crops | II | cut | tied to the cut Naturalists' Charter |
| The Siege College | II | cut | siege is Dominion's; the Mechanists' Charter carries Scientific's |
| Discoveries through Scholars | II | cut | another science payer; The Founding Gift and The Doctorate carry the moment |
| Enduring Institutions | II | reworked | its happiness goes: civic life is not Scientific's |
| The Quiet Faculties | II | kept | learned land; it shows the cost |
| The Royal Charter Commission | II | kept | glue |
| The Alchemists' Charter | III | reworked; revised 2026-10-21 (section 14) | adds Niter Beds; the Grenadier trait replaces the Fire Lance before Alchemy, at +1 (section 14, a reading to confirm) |
| The Engine Works | III | cut | a conversion with no theme home |
| The Presses | III | cut | buying research with gold is a new player input |
| The Charter Rolls | III | reworked | Tier II; pays production and culture, not science |
| The Saltpetre Works | III | cut | Niter Beds and the Grenadier trait carry gunpowder |
| The Second Seat | III | kept | institutions capstone; the user: *"love this one"* (section 14) |
| The Long Inheritance | III | kept, uncommon | institutions; bridge from the learned land |
| The Collegium | III | cut | asks for four University towns, against few cities |
| The Lecture Circuit | III | cut | filler, and its happiness is civic life |
| The Great Instrument | IV | kept | institutions: the Opus |
| The Great Catalogue | IV | kept | institutions: the Opus |
| The Hermetic Charter | IV | cut 2026-10-21 (section 14) | the user: *"remove this, not very impactful. interesting ability though"*. The themes pass had moved it to Tier III |
| The Experimenters' Charter | IV | cut 2026-10-21 (section 14) | the user: *"remove"*. The themes pass had given it The Great Experiment's rule |
| The Gunfounders' Charter | IV | reworked; revised 2026-10-21 (section 14) | Tier III; opens the Tophane, not the Great Gun; its units start at +4, not +8 (section 14) |
| The Foundation Stone | IV | kept | institutions: the Opus |
| The Great Experiment | IV | merged, then cut | into the Experimenters' Charter, which the user cut (section 14) |
| The Sum of Knowledge | IV | kept | great cities finisher |
| The Invisible College | IV | cut | scales with University towns, against few cities |
| The Proving Ground | IV | reworked | Tier III; reads the lead |
| The Register of Priority | IV | cut | the firsts line is thin |
| The Closed Book | IV | kept | glue: the race |
| The Breaching Batteries | IV | kept | elite army |
| The Walls of Learning | IV | kept, common | great cities: defence |
| The Longitude Prize | IV | cut | its reward was a new choice of technology |
| The Lynx-Eyed Academy | IV | kept | learned land |
| The Patent Office | IV | kept, uncommon | glue |
| The Prototype Works | IV | kept | glue: rule-breaker |

**Tally** (revised 2026-10-21, section 14): 23 kept (1 charter), 2 kept and revised by section 14 (the Glassmakers' and Printers' charters), 9 reworked (3 charters, all three also revised by section 14), 24 cut, 1 merged (then cut), 2 moved. Before section 14 it was 27 kept, 11 reworked, 21 cut, 1 merged and 1 moved. The ten live rows the sheet cut earlier (Practical Astronomy, Working Estates and the rest) should still be retired.

### The shared cards (15 on the sheet, 18 with this pass)

All kept unless noted; each pair keeps an early shared card (ruling (qqqqqq) 14). This pass adds three: The Schoolmen's Charter, and since section 14 The Assay and The Soldier-Scholars.
- **Dominion:** Field Academies (I), Copying the Enemy (I), Carried-Off Scholars (II). The Engineer Corps (III) stands as Dominion's card. New, **The Soldier-Scholars** (II, Military; was the exclusive The Companions, proposed name, revised 2026-10-21, section 14): "Your military units in your towns gain +5 strength, and each supplies +2 science."
- **Expansionist:** Hydraulic Schools (I). New, **The Assay** (I, Civic; moved from the exclusive cards, revised 2026-10-21, section 14): "Hexes with a strategic resource gain +2 science."
- **Commerce:** The Exchange of Discoveries (Tier I, as the Commerce sheet has it), The Merchant Navigators (II), Books from the Ships (II, feature B). **Merchant Scholars (III), reworked:** "Foreign routes gain +2 science for each Academy in the origin city", so it reads the learned land.
- **Devotion:** Cloister Schools (I), The Monastery Libraries (I), The Cloister (II), The Blessed Forges (II); new, **The Schoolmen's Charter** (I).
- **Magisterial:** Illuminated Treatises (0), The House of Wisdom (III).

### Not taken from the 2026-10-17 pass

- The House of Life, The Natural History, The Book of Firsts, The Seven Liberal Arts: the engine keeps one grower and one count, so the deck is not about research alone.
- The Professors, The Great Treatises: doubled great-person effects are Magisterial's.
- The Blast Furnaces, The Bronze Casters: they make many units, against the cost.
- The Disciples, The Old Libraries, The Mechanicians, The Instrument Makers: other cards push those themes harder. The Scholar-Officials: authority is civic life.

### The type sort

Revised 2026-10-21 (section 14): The Palace Archive and The Fellowships are cut, The Assay and The Companions move to the shared cards, and the Hermetic and Experimenters' charters are cut.

- **Tier 0 (9):** Military: The War Manuals. Economic: The Royal Workshops, The Almanac, The Prospectors' Notes. Civic: The Prize Essay, The Sky Watchers, The Royal Tutors, The Scribes' Hall, The Long Study. Charters: Herbalists' (Civic), Bronze-Founders' (Military).
- **Tier I (14):** Military: The Edge of the Sword, The Field Refits. Economic: The Secret Arts, The Old Academy, The Founding Gift, Learned Foundations, The Royal Estates, The Common Tables, The Free Cities. Civic: The Commonplace Book, The Astronomical Diaries, The Scholars' Fame, The Dedications, The Forward Plans. Charters: Surveyors' (Economic), Glassmakers' (Civic), Librarians' (Civic).
- **Tier II (16):** Military: The Palace Schools, The Strategikon, The Armoury Patterns. Economic: The Quiet Faculties, Enduring Institutions, The Great Designs, The City Architects, The Scholars' Guild. Civic: The Charter Rolls, The Translation Movement, The Roll of Scholars, The Latin Quarter, The Royal Readers, The Invitations, The Round City. Wildcard: The Royal Charter Commission. Charters: Paper-Makers' (Civic), Physicians' (Economic), Mechanists' (Military), Printers' (Civic).
- **Tier III (14):** Military: The Model Army, The Proving Ground. Economic: The Journeymen, The School of Mines, The Long Inheritance, The Queen of Cities. Civic: The Nizamiyya, The Doctorate, The Second Seat, The Royal Academies, The Humanists, Greek Fire. Wildcard: The Age of Reason, The Studium Generale. Charters: Gunfounders' (Military), Alchemists' (Military).
- **Tier IV (11):** Military: The Walls of Learning, The Breaching Batteries. Economic: The Prototype Works, The Great Catalogue, The Foundation Stone. Civic: The Patent Office, The Closed Book, The Republic of Letters, The Sum of Knowledge. Wildcard: The Lynx-Eyed Academy, The Great Instrument. Charters: Military Engineers' (Military), Naval Gunners' (Military).

| Tier | Military | Economic | Civic | Wildcard | Seatable | Charters | Common / uncommon / rare |
|---|---|---|---|---|---|---|---|
| 0 | 1 | 3 | 5 | 0 | 9 | 2 | 7 / 2 / 0 |
| I | 2 | 7 | 5 | 0 | 14 | 3 | 5 / 8 / 1 |
| II | 3 | 5 | 7 | 1 | 16 | 4 | 3 / 9 / 4 |
| III | 2 | 4 | 6 | 2 | 14 | 2 | 3 / 6 / 5 |
| IV | 2 | 3 | 4 | 2 | 11 | 2 | 1 / 3 / 7 |
| **All** | **10** | **22** | **27** | **5** | **64** | **13** | **19 / 28 / 17** |

- **By status (seatable):** 22 kept, 6 reworked, 36 new (15 from the 2026-10-17 pass). Section 14 revised four of the new cards' texts: The Royal Estates, The Great Designs, The Edge of the Sword and The Strategikon. Before section 14 the counts were 23, 7 and 38 of 68.
- **Every government has something to seat.** Tier 0: the Chiefdom seats The War Manuals, one of three Economic cards, and any card in its Wildcard chair. Tier 0 was 7 Civic cards of 10; after the ruling of 2026-10-20 it is 5 of 9 (section 11, item 3; section 14 cut The Palace Archive). Tiers I and II: every chair type has two or more cards. Tier III: Imperium's third Military chair and, at Tier IV, the Sultanate's Military and the Estates' Economic chairs lean on the partner and on carried cards (The Strategikon, The Palace Schools, Enduring Institutions, and with Dominion the shared The Soldier-Scholars). That is intended for the long game.

## 9. The checks

- **Themes beat a pile.** Each theme has a multiplier on its own flats (The Nizamiyya; Enduring Institutions, The Royal Academies and the Mouseion; The Queen of Cities; The Proving Ground and The Edge of the Sword) and a capstone that changes the count. (Revised 2026-10-21, section 14.) A pile of the deck's strongest single cards has neither.
- **Several routes.** Any two cards start a theme (The Royal Tutors and The Old Academy; Learned Foundations and The Royal Estates; The Common Tables and The Scribes' Hall; The War Manuals and The Edge of the Sword), and each theme has four or more charters.
- **Every card has a home:** four themes and 14 glue cards (22%), with eight bridge cards and five bridge charters. (Revised 2026-10-21, section 14.)
- **The essentials along the way.** Each theme reaches science, culture and production by Tier II, except the elite army, whose culture comes at Tier III (Greek Fire) or from the glue (The Prize Essay, The Astronomical Diaries).
- **Science stays a minority:** 8 of 64 seatable cards pay science (13%), 13 of 77 with charters (17%). (Revised 2026-10-21, section 14: The Assay moved to the shared cards, and the Hermetic and Experimenters' charters are cut.)
- **Areas:** four of five. Civic life: only the Physic Garden's happiness, which the user ruled (section 14).
- **The cost shows** in The Free Cities, The Quiet Faculties, the charter premium, and the scalers that read one capital. (Revised 2026-10-21, section 14: The Companions no longer carries it.)
- **No new input.** Every card is automatic or uses research, building, a great person's act or work, or a worker's build. The Presses and The Longitude Prize were cut for this. (Revised 2026-10-21, section 14: with the Experimenters' Charter cut, no card contributes to the Opus.)
- **The splits are followed:** wonders (production only, some of it while no rival can build them; revised 2026-10-21, section 14), empire buildings (never scaled by towns), great-person works (Academies and the works beside them), elite units (no ranks). The split blocked The Professors and The Great Treatises; I do not argue for them, because The Royal Readers carries the idea through supply.
- **Where the pass falls short:**
  - Every number is a guess; nothing is measured.
  - The elite army is thin at Tier IV (one card, two charters). The great cities have no act card after Tier II.
  - Seven cards use the two features (one on A, six on B), plus the shared Books from the Ships. Both are accepted, and both are new engine work. (Revised 2026-10-21, section 14.)
  - Thirteen charter technologies is a lot of tree work, and the Tier IV charters may come too late for half the seats.
  - The line traits' bonuses are small (none to +3), so their abilities must carry them. The Hoplite's town reading and the two granted flags are new engine work.
  - Greek Fire stays a window (section 3), so it does not grow with the charters.
  - The deck is still Civic-heavy (27 of 64) with 10 Military cards. Tier 0 now has three Economic cards and one Military card, so a Scientific seat under the Chiefdom has a choice for its Economic chair but leans on the partner for a second Military card.
  - No leader points at the elite army or institutions. Doctrines are not in this pass.

## 10. Open questions for the user

All answered: see sections 11 to 14. Since section 14 the deck has thirteen charters (question 2) and 24 cuts in section 8 (question 9).

1. **The four themes and the engine as written,** with the Opus as an institution and the elite army resting on the upgrade rule. *Recommended: yes.*
2. **Every Scientific charter opens a technology: fifteen, two of them at Tier 0.** *Recommended: yes.* The alternative is to cut the three Tier IV charters and save their tree work.
3. **Feature A, the trades as a card quantity.** *Ruled: yes* (section 11).
4. **Feature B, reading rivals, met empires only.** *Ruled: yes* (section 11).
5. **A charter that opens a row kept for an unwritten fifth age:** the Bastion. *Recommended: yes.* The row exists, and it is a building, not a unit. The Frigate and the Corvette left the deck with the ruling of 2026-10-21 (section 12).
6. **The four rule-breakers that touch core rules:** The Royal Readers (the great-person price), The Model Army (an upgrade without its metal), The Field Refits (an upgrade that heals), The Studium Generale (works that count as Academies). *Recommended: yes to all four.*
7. **Scientific leaves civic life:** Enduring Institutions loses its happiness, and The Lecture Circuit and The Scholar-Officials go. *Recommended: yes.*
8. **The Schoolmen's Charter becomes a shared Devotion · Scientific charter.** *Recommended: yes,* to confirm in the Devotion pass.
9. **The 21 cuts in section 8,** and retiring the ten live rows the sheet cut earlier. *Recommended: yes.*

After your answers: every card onto the sheet as `add` and `modify` rows, then Scientific's Doctrines (one for each theme at most tiers), then the triage for the build.

## 11. Rulings, 2026-10-20

The user, verbatim: *"ok #3 we should do, the others seem ok. Please fold in the proposed changes to the science deck doc for me to review, i'd like to read them grouped by tier as formatted before. A and B, yes. Reading town size is ok, the scientific player should be trying to play tall. 68 chairs is fine, i can cut on my own once they're formatted."*

The numbers refer to the three changes proposed in chat after this draft:
1. **Great cities may read town size.** Not changed: *"the scientific player should be trying to play tall."*
2. **Keep all 68 cards for chairs,** the Opus cards included. The user cuts by hand once the list is formatted.
3. **Tier 0 moves away from Civic** (ruled: *"#3 we should do"*). It held 7 Civic cards of 10, and the Chiefdom seats a Civic card only in its one Wildcard chair. Two or three Tier 0 cards become Economic or Military openers.

Also ruled:
- **Feature A (the trades) and feature B (reading rivals): yes.**
- **The list goes into the old format:** `docs/plans/scientific-list-proposed.md`, grouped by tier, rebuilt from this pass.

Questions 1, 2 and 5 to 9 in section 10 were then listed for the user: the themes and engine as written, fifteen charters that each open a technology, the fifth-age rows, the four rule-breakers, leaving civic life, the Schoolmen's Charter shared with Devotion, and the 21 cuts with the old live rows retired. The user: *"yup, yes to all."*

**After these rulings** (the same day): Tier 0 now holds 1 Military, 4 Economic and 5 Civic seatable cards. The Prospectors' Notes pays production for a mine or quarry (veins are shelved, so the seam version paid nothing), and The Palace Archive opens empire buildings an age early in the capital. The review list is rebuilt in `docs/plans/scientific-list-proposed.md`.

## 12. Rulings on the charter UX prototype, 2026-10-21

The user commented on the prototype (https://claude.ai/artifact/5xCdB1r74ciyMpLyJ3fTWC), on its open questions. Verbatim, by question:

1. **Should undrafted charter technologies show, sealed?** *"only show if drafted. Also, if no charters have been drafted, don't show the section. There should be some indicator that it's there for screens that aren't wide enough."* So the charter shelf holds only drafted charter technologies, it does not exist until the first charter is drafted, and when it is out of view the chart shows that it is there.
2. **Does a charter technology count toward an empire's age?** No answer yet. Working assumption: no (the prototype's recommendation), to confirm.
3. **Does a charter technology count in a rival's gap (feature B)?** *"yes, this seems fun"*, on the recommendation "no: a rival can never close it, so The Translation Movement and Books from the Ships should not read it". Read as agreeing with the recommendation, to confirm.
4. **Where does The Commonplace Book's 15% apply?** *"great"*, on the recommendation: off the whole charter price.
5. **What does a unit opened early cost?** The question goes away. The user: *"lets rework: don't open units early, replace them with better versions (+7 over normal version), or versions with special abilities (+1 range, +1 attack strength for every X, etc). the jump from one age of units to the next is too high. The better version should still cost the same amount to produce."*
   - So no charter opens a unit before its technology.
   - A military charter's technology gives a better version of a unit the empire can already build: +7 strength over the normal version, or a special ability (examples from the user: +1 range, +1 attack strength for every X).
   - The better version costs the same production as the normal one.
   - Reading taken, to confirm: the Naval Gunners' Charter, which opened the Frigate and the Corvette (rows no ordinary technology opens), is reworked the same way, because those rows are a jump of a whole age.
   - Charters that open buildings early (the Aqueduct, the Observatory, the Forum and the Great Library, the Printing House) are not affected.
6. **Placement of the charter technologies** (parents, columns, glyphs): no answer. They stay placeholders until the user's chart places them.

## 13. Rulings on the better versions, 2026-10-21

The user, verbatim: *"how about this, lets do a smaller bonus, +1 in tier 0 and +2 in tier 2, but every unit gets an interesting ability. It keeps it once it upgrades."*
- **The strength bonus is small:** +1 for a Tier 0 charter's versions, +2 for a Tier II charter's. Reading taken, to confirm: +3 for the Tier III and IV charters (the Alchemists' and the Naval Gunners').
- **Every version also gets an interesting ability,** on top of the bonus.
- **The ability stays when the unit upgrades.** So the bonus and the ability belong to the unit's line, not to one unit row: a Catapult line improved by Mechanics keeps its ability as Trebuchet and beyond. This answers the open question of what happens to a version when its line's next unit arrives.

## 14. Rulings on the review page, 2026-10-21

The user commented on 18 rows of the review page (https://claude.ai/artifact/UWXhWQ3Rfz9Bkmg8VTmZjS, version 4, built from commit `0a186aad`), then: *"ok i've made comments, let's implement."* The comments are verbatim. Where a comment needs a reading, the reading is marked and waits for the user's confirmation; the build uses it until then.

### The charters

| Charter | The user | What changes |
|---|---|---|
| The Herbalists' Charter (0) | *"physic garden: can be built once per city on flat land with fresh water access. +2 science +2 happiness"* | The Physic Garden pays +2 science and +2 happiness, and a town may have one. It is the deck's one source of happiness: the user's ruling outranks "it stays out of civic life". |
| The Glassmakers' Charter (I) | *"have this unlock a new building, instead of granting access earlier"* | Optics opens a new building (below), not the Observatory early. |
| The Librarians' Charter (I) | *"have this unlock a new building, instead of granting access earlier"* | Cataloguing opens a new building (below), not the Forum and the Great Library early. |
| The Printers' Charter (II) | *"have this unlock a new building, instead of granting access earlier. keep the +1 trade route"* | Printing opens a new building (below), not the Printing House early. It keeps +1 trade route. |
| The Mechanists' Charter (II) | *"no combat strength bonus"* | The Onager trait gives +1 range and no strength. The Repeating Crossbow trait lets the unit move after it shoots, and gives no strength. |
| The Gunfounders' Charter (III) | *"+4 strength"* | Units gained in the Tophane's town start with +4 strength, not +8. |
| The Alchemists' Charter (III) | *"+1"* | **Reading, to confirm:** the Grenadier trait gives +1, not +3, and still +1 for each charter technology you know. The user's two comments beside it set strength figures, so "+1" reads as a figure, not as agreement. |
| The Hermetic Charter (III) | *"remove this, not very impactful. interesting ability though"* | Cut. |
| The Experimenters' Charter (IV) | *"remove"* | Cut. The Great Experiment's rule, merged into it, goes with it. |

### The three new buildings (proposed by Claude, to confirm)

Only the charter's holder can build them. The numbers are first guesses.
- **The Specularium** (the Glassmakers' Charter, Optics), a city building: +1 science, and +1 food for every three citizens of its town. Great cities, supply: it feeds the tall town. Flavour: the Roman glass houses that grew cucumbers for Tiberius all year.
- **The Mouseion** (the Librarians' Charter, Cataloguing), an empire building: +1 science and +1 culture for each empire building you hold, itself included. Institutions, multiply: it is the theme's scaler at Tier I. Flavour: the house of scholars beside the Library of Alexandria.
- **The Aldine Press** (the Printers' Charter, Printing), a city building: +2 culture, and trade routes from its town gain +2 science and +2 culture. Great cities, widen, with the Commerce pair. Flavour: the press of Aldus Manutius in Venice, whose small books went out with the merchants.

### The cards

| Card | The user | What changes |
|---|---|---|
| The Palace Archive (0) | *"remove, makes the pacing of the game weird"* | Cut. |
| The Royal Estates (I) | *"change: each empire building provides +2 food and +2 production"* | New text: "Each empire building gives its town +2 food and +2 production." A town with two (The Second Seat) gains both. |
| The Second Seat (III) | *"love this one"* | Kept. |
| The Great Designs (II) | *"too strong. how about: if you are the only one with the technology to build a wonder, gain 30% production when building it."* | New text: "Your towns build a wonder 30% faster while no empire you have met knows the technology that opens it." **Reading, to confirm:** "the only one" counts the empires you have met, as feature B does, so the card shows nothing hidden. It uses feature B, not a new early-access shape. |
| The Fellowships (III) | *"remove"* | Cut. Feature A keeps one Scientific card, The Scholars' Guild. |
| The Edge of the Sword (I) | *"this card probably won't see play (too 'win more'). How about: +3 strength on units against empires who've researched fewer technologies than you."* | New text: "Your units gain +3 strength against the units of an empire that knows fewer technologies than you." Feature B. **Reading, to confirm:** barbarians are not an empire, so the line never applies against them. |
| The Assay (I) | *"change: +2 science on strategic resource tiles, shared with expansionist."* | New text: "Hexes with a strategic resource gain +2 science." It becomes a shared Expansionist · Scientific card. **Reading, to confirm:** like any hex yield, it pays when a citizen works the hex, and only for a resource the seat can see. |
| The Companions (II) | *"remove"*, then *"lets change to: your units stationed in a city gain +5 combat strength and supply +2 science. shared with dominion"* | New text: "Your military units in your towns gain +5 strength, and each supplies +2 science." It becomes a shared Dominion · Scientific card. **Readings, to confirm:** a unit "stationed in a city" is a military unit standing in one of your own towns, and the +5 applies to any fight it takes from there. The old name no longer fits; proposed: **The Soldier-Scholars**. |
| The Strategikon (II) | *"remove too strong, swap with: Units gain +4 strength if they stand within two tiles of a great general, great scholar or an academy."* | New text: "Your units gain +4 strength while within two hexes of your great general, your great scholar or your Academy." New shape: a strength line that reads your great people and works nearby. **Reading, to confirm:** only your own great people and Academies count. |

### What the rulings leave

- **Cards:** the exclusive seatable cards go from 68 to 64 (two cut, two moved to the shared cards), and the charters from 15 to 13. Tier 0 holds 9 seatable cards: 1 Military, 3 Economic, 5 Civic.
- **The cost** now shows in The Free Cities, The Quiet Faculties and the charter premium. The Companions no longer carries it.
- **Feature B** is now read by six Scientific cards: The Secret Arts, The Translation Movement, The Edge of the Sword, The Great Designs, Greek Fire and The Proving Ground. **Feature A** by one, The Scholars' Guild.
- **Shapes no longer needed:** empire buildings and wonders early in the capital (The Palace Archive, the old Great Designs), the share cap on the trades (The Fellowships), science as an Opus contribution (the Experimenters'), Alchemy's parent waiver (the Hermetic), and the second way into the Observatory, the Forum, the Great Library and the Printing House.
- **Shapes added:** one work of a kind per town, and happiness from a work (the Physic Garden); a strength line against an empire that knows fewer technologies; production toward a wonder whose technology no met empire knows; units in your own towns as a count; a strength line that reads your great people and Academies within two hexes.
- **Not commented, so unchanged:** the Surveyors' Charter still opens the Aqueduct before Engineering, The Forward Plans still opens a University early, and The Prototype Works still builds the current research's rows.
- **Still open:** whether a charter technology counts toward an empire's age (section 12, item 2; working assumption no), and where the charter technologies sit on the user's chart (item 6).

## 15. Rulings on the build plan, 2026-10-21

The user answered the build plan's questions (`docs/plans/scientific-build-triage.md`, "Questions for the user") on the review page, then: *"ok i commented on the doc, you're good to proceed."* Verbatim, by question:

1. **Does a charter technology count toward an empire's age?** *"no"*. So `highestAge` and the other age readings skip charter technologies (the triage's reading 1).
2. **The three new buildings.** *"commented on the scientific themes page. use those rulings."* On the charter table:
   - **The Specularium:** *"revise: +3 food, +1 science for every 2 citizens"*. New text: "+3 food, and +1 science for every two citizens of its town."
   - **The Mouseion:** *"how about: +4 renown towards scholars, +2 culture for each empire building you hold. 30% more expensive to build than a regular empire building."* New text: "+4 renown a turn, favouring great scholars, and +2 culture for each empire building you hold, itself included. It costs 30% more production than an ordinary empire building." It now feeds the learned land (scholars) as well as the institutions.
   - **The Aldine Press:** no comment, so it stands as section 14 proposed.
3. **The Soldier-Scholars in attack.** *"attacking and defending"*. The +5 applies to every fight a unit takes from one of your towns (the triage's reading 9).
4. **When to type the cards.** *"lets type them early on"*. The sheet of record and the chair types move forward: they land right after S1, and every later batch types its own rows as it adds them.
5. **Types for cards shared with Commerce, Devotion and Magisterial.** *"approved"*.
6. **The placeholder placement and the other readings.** *"great"*. The build uses them until the user marks one.

The user also resolved the comment threads on the Grenadier (+1), the Tophane (+4), the Mechanists' traits (no strength) and the three building charters, so those readings stand.
