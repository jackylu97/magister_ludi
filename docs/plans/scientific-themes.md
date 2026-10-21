# Scientific: a way to play, built from four themes (proposal)

**Status:** first draft, 2026-10-20. Nothing here is built. The deck sheet (`docs/decks/scientific.md`), the data and the code are unchanged. This is the Scientific deck pass on the method of 2026-10-20 (the card-design skill, "A way to play, built from a few themes"): the map, the engine, four themes, example councils and the type sort. It replaces the builds of `docs/plans/scientific-builds.md`; that file's map of materials, pairs and leaders is refreshed here.

The user's request, 2026-10-20, verbatim:

> *"claude, i think you can do it. you can be a great card designer, don't be afraid to opinionated, bold, bias towards things that are interesting and fun rather than focusing on numbers. try to focus on not adding new sources of user inputs and operate on what mechanics we have. if there's an interesting compelling feature that would affect multiple decks, and could enable some design ideas, let me know."*

The pass builds on "Scientific, sketched 2026-10-20" in `docs/decks/deck-design.md`, which you approved (*"great!!"*). It keeps the sketch's four themes and its engine, and changes two things (section 2).

## 1. How to read this

- **Chairs:** 3 at the start, 5 at Tier I (draft 4) and Tier II (draft 10), 8 at Tier III (draft 18), 11 at Tier IV (draft 26). Charters take no chair.
- **Tiers in turns** (the bot model): Tier I from about turn 32, II from 72, III from 133, IV from 161.
- **Role:** *supply* (more of the thing), *widen* (the thing pays something it did not), *multiply* (the thing's output grows), *act* (a choice or a moment). *Glue* raises or spends the engine.
- **Status:** *kept* (on the sheet; a move or new rarity is noted), *reworked* (on the sheet, changed), *new* (not on the sheet; "(10-17)" marks a card from the superseded pass), *cut*.
- **Shape:** *existing*, *new shape* (section 7), or *feature A* / *feature B* (the card waits on a feature in section 6).
- **Type:** Military, Economic, Civic or Wildcard (`docs/plans/doctrines-governments-chairs.md`, section 4).
- **Numbers are first guesses** against the power bar. The effort went into shape.

## 2. The map

### The way to play

- Scientific reaches things first. It researches, spends its science on charter technologies no rival can take, and turns its lead into four things: a land lined with Academies, the realm's great houses raised early, a few great cities, and a small army a generation ahead.
- It is paid for advancement, it is strongest in the windows when it is ahead, and it gives up numbers: few towns, few units, and charter technologies that cost half again.
- It stays out of civic life. No card in this pass pays happiness or authority.

### The engine

- **Technologies and charters.** The deck makes science in bulk and spends it on fifteen charter technologies. Each opens one theme's thing: a building, unit, improvement or rule that no other empire has, or has yet.
- **The engine feeds the army with no card.** When a technology opens a unit's successor, every unit of that line upgrades in place (`upgradeTargetForType`, Entry V). A charter that opens Crossbowmen an age early turns every Composite Bowman into one on the turn it lands.

### Two changes from the sketch

- **The Magnum Opus is an institution.** It is an empire building in the data and the deck's way to win, so the institutions get a Tier IV goal.
- **The elite army rests on the upgrade rule.** Research upgrades the army for free, so "few, advanced units" produces itself, and the army's cards have something to push: successors landed early, a heal on the upgrade, an upgrade without the metal.

### Materials

"Self-producing" means a Scientific game makes it whether or not a card asks.

| Material | Self-producing? | In the sim | Theme |
|---|---|---|---|
| Technologies completed and known | Yes | `tech` occasion; `techsResearched`; `techWorld` firsts | engine |
| Charters and charter technologies | No: drafted | `CharterSpec.unlocks.tech`, `charteredTechs`; rows not in `techs.json` | engine |
| The lead (technologies only you know) | For a racer; each charter technology adds one | not read yet (feature B) | engine, army |
| Great scholars | Slowly: science buildings and scholar guildsmen pay scholar renown | `greatPersonGained` with a family; `greatPeopleGained`; ladder 75 · 256 · 441 · 633 | learned land |
| Academies and works beside them | From scholars | `greatWork` and `beside` tile tests; +3 science; opens its seam | learned land |
| Charter improvements | No: charters | improvement rows, as Expansionist's tended works | learned land |
| Empire buildings | Partly: eight in the tree, the Codex, the Opus | `oncePerEmpire`; `empireBuildings` count; `hasEmpireBuilding` scope | institutions |
| Charter buildings | No: charters | the Scriptorium (exists); two new rows | institutions |
| A building's age | Yes: time | `City.buildingTurns`, `standingTurns` | institutions, cities |
| Big towns and their schools | For a tall seat | `population`, `capitalPopulation`, `populationAtLeast`; `buildingsOfCategory` | great cities |
| Guildsmen (the trades) | In big towns with renown buildings | the `guilds` phase, `City.specialists`; no card reads them (feature A) | great cities |
| Wonders: access and production | With production; races can be lost | a technology's `unlocks`; `productionBonus` on wonders | great cities |
| Units and their upgrades | Yes | `upgradeTargetForType`; `unitStamp`; `UnitFilter.ageAtMost` | elite army |
| Units ahead of their age | No: charters | a charter technology opening a unit row; Æra V rows (`awaitsTech`) | elite army |
| Strategic resources | From the map | `uniqueStrategicResources`, `veinFound`, an Academy on a seam | army, land |
| The Magnum Opus | At the end of every game | `theMagnumOpus`, the `contribute` command, `raisingOpus` | institutions |

### What a Scientific player wants in each age

- **Age 1 (Tier 0): start the clocks.** A Library early, the first charter, the first scholar renown. Few towns, placed well.
- **Age 2 (Tier I): open the institutions.** The Forum and the Great Library an age early, the Aqueduct early, the first Academy.
- **Age 3 (Tier II): the great houses and the campus.** Empire and charter buildings, Academies with works beside them, wonders an age early, the army's first window (Mechanics).
- **Age 4 (Tiers III and IV): the windows.** Universities, the Tophane, Fire Lances before Alchemy, the race to Alchemy and the Opus.

### The areas it reaches

The army (the elite army), the land (Academies, works, charter improvements, seams), the economy (institutions; the cities' food and production), and great people and wonders. Civic life: none, by design.

### Its cost

- **Few towns:** The Free Cities pays only while you hold at most five towns. The Round City, The Queen of Cities and The Sum of Knowledge pay a few big towns.
- **Few units:** The Companions pays only while you have no more military units than towns. The Quiet Faculties slows military units. The Tophane trains the army in one town.
- **Charter technologies cost half again,** and fifteen charters compete for picks with chair cards.
- **Windows close:** The Secret Arts, The Proving Ground and Greek Fire pay only while ahead.

### Pairs

- **Dominion, the military edge** (no leader). Scientific gives units ahead of their age (four charters), an army that upgrades in place, and metal from Academies (The School of Mines). Dominion gives kills and captured schools (Copying the Enemy, Field Academies, Carried-Off Scholars), and Citadels that count as Academies beside one. Tension: The Companions wants few units. Best with the elite army and institutions.
- **Expansionist, the engineers** (Nezahualcoyotl). Expansionist gives big towns, mountains (Hydraulic Schools) and Manufactories beside Academies. Scientific gives the Qanat, the early Aqueduct and Physic Gardens. The Free Cities works against Expansionist's width. Best with great cities and the learned land.
- **Commerce, the patrons** (no leader). Commerce gives gold for schools and houses, foreign routes that pay science (Books from the Ships, Merchant Scholars) and Customs Houses beside Academies. Scientific gives the Printers' Charter, and makes the Caravanserai and Bourse stronger as empire buildings. Best with institutions.
- **Devotion, scholars of the faith** (Al-Ma'mun). Devotion gives faith that buys science buildings, Temples that teach (Cloister Schools) and Holy Sites beside Academies. Scientific gives the High Temple made stronger, and the Schoolmen's Charter as a shared card. Best with great cities and the learned land.
- **Magisterial, the academy** (Hypatia). Magisterial gives more drafts (more charters seen), Landmarks beside Academies, and pay for holding wonders. Scientific gives charters (each a draft for The Court Painter), scholars and Academies, and wonders an age early: one deck raises them early, the other is paid for holding them. Best with the learned land and great cities.

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
- **A charter technology's bonus is one no other empire can reach:** a row early, a row nobody else can build, or one rule. Two charters open three rows the game keeps for an unwritten fifth age (`awaitsTech`), so they need no new rows.
- The Bronze-Founders', Mechanists' and Alchemists' charters upgrade the army on the turn they land.

### The charters

| Charter | Tier | Rarity | Opens (age) | Knowing it gives | Theme | Type | Status |
|---|---|---|---|---|---|---|---|
| The Herbalists' Charter | 0 | common | Herbals (1) | Workers may build the Physic Garden on flat land with fresh water: +1 food, +1 science. | learned land | Civic | new; new row |
| The Bronze-Founders' Charter | 0 | uncommon | Casting (1) | The Phalanx and the Swordsman before Bronze Panoply. | elite army | Military | new |
| The Surveyors' Charter | I | uncommon | Surveying (2) | The Aqueduct before Engineering. Workers may build the Qanat, which waters the farms beside it. | great cities, land | Economic | kept |
| The Glassmakers' Charter | I | uncommon | Optics (2) | The Observatory before The Astrolabe, needing a Library rather than a University. | great cities | Civic | kept |
| The Librarians' Charter | I | rare | Cataloguing (2) | The Forum and the Great Library before Rhetoric. | institutions, cities | Civic | new |
| The Paper-Makers' Charter | II | uncommon | Papermaking (3) | The Scriptorium: +2 science, and +10% science in a town with an Academy in its borders. | institutions, land | Civic | new; the row exists |
| The Physicians' Charter | II | uncommon | Medicine (3) | The Bimaristan, an empire building: +25% food in its town; your units heal 10 more a turn in your land. | institutions, cities | Economic | new; new row |
| The Mechanists' Charter | II | rare | Mechanics (3) | The Trebuchet and the Crossbowman before their technologies. | elite army | Military | kept |
| The Printers' Charter | II | uncommon | Printing (3) | The Printing House before Movable Type, and +1 trade route. | great cities | Civic | kept |
| The Gunfounders' Charter | III | uncommon | Gunfounding (4) | The Tophane, an empire building: military units gained in its town start with +8 strength, and it builds them 25% faster. | institutions, army | Military | reworked (was the Great Gun, IV) |
| The Alchemists' Charter | III | uncommon | Chemistry (4) | The Fire Lance before Alchemy. Workers may build Niter Beds beside a farm or pasture: one niter. | elite army, land | Military | reworked (adds Niter Beds) |
| The Hermetic Charter | III | rare | Hermeticism (4) | You may research Alchemy while missing one of its five parents. | engine: the Opus | Civic | kept, moved from IV |
| The Experimenters' Charter | IV | uncommon | Experimental Philosophy (4) | You may pour science into the Magnum Opus, 2 science for each point of production. | institutions: the Opus | Economic | reworked (takes The Great Experiment's rule) |
| The Military Engineers' Charter | IV | uncommon | Military Architecture (4) | The Bastion (+5 defence, +30 hit points), which no ordinary technology opens. | great cities | Military | new; the row exists |
| The Naval Gunners' Charter | IV | uncommon | Naval Gunnery (4) | The Frigate and the Corvette, which no ordinary technology opens. | elite army | Military | new; the rows exist |

- **15 charters,** the most of any deck: 2 / 3 / 4 / 3 / 3 across Tiers 0 to IV. By theme (a bridge counts twice): learned land 4, institutions 5, great cities 6, elite army 5, engine 1.
- **Cut:** the Naturalists' (a raw bonus behind a charter) and the Metallurgists' (it needs a new unit row). **Moved:** the Schoolmen's becomes a shared Devotion · Scientific charter; it opens nothing in Scientific's themes.
- **The technologies:** fifteen rows in their own section of the tree, each with one ordinary parent; your chart places them. In age 2 one costs 150 to 285 science. Only the charter's holder may research it, so each one counts toward the lead (feature B).

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

The Age of Reason doubles every Order's pay on a technology: The Royal Workshops, the Diaries' growth, The Scholars' Fame, The Journeymen and a commission's count. Glue is 14 of 68 seatable cards (21%).

## 4. The themes

### 4.1 The learned land

**The fantasy:** Baghdad's House of Wisdom and the Latin Quarter of Paris. Scholars found Academies, and the land around them fills with gardens, works and schools. **The quantity:** Academies held and great scholars gained, which come by themselves to a seat with science buildings. **Areas:** the land, great people.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The Royal Tutors | 0 | common | supply | +1 renown a turn for each science building you have, favouring great scholars. | renown | Civic | new (10-17); existing |
| The Prospectors' Notes | 0 | uncommon | act | Finding a buried seam grants 30 science and 15 production. | science, production | Civic | kept; existing |
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
| The Palace Archive | 0 | rare | supply: early access | You may build a Library in your capital before you know Writing. | science | Civic | kept, uncommon to rare; new shape |
| Learned Foundations | I | common | supply | Cities with a Library build empire buildings 25% faster. | production | Economic | reworked (trimmed; its culture goes to The Dedications); existing |
| The Royal Estates | I | common | widen | Towns with an empire building gain +2 food and +2 production. | food, production | Economic | new; existing |
| Enduring Institutions | II | uncommon | multiply: scaler | A town with an empire building at least twenty turns old gains +25% production. | production | Economic | reworked (its +2 happiness goes); existing |
| The Invitations | II | rare | act | Completing an empire building grants a great scholar. | a great scholar | Civic | new; new shape |
| The Palace Schools | II | uncommon | widen | Units gained in a town with an empire building start with +4 strength. | combat | Military | new; existing |
| The Second Seat | III | rare | capstone: rule-breaker | You may build one second copy of an empire building, in a city with a University. | what the house pays | Civic | kept; new shape |
| The Royal Academies | III | uncommon | multiply | +5% production and culture for each empire building you hold. | production, culture | Civic | new; existing |
| The Long Inheritance | III | uncommon | supply | Cities working an Academy at least twenty turns old gain +30% production toward empire buildings, wonders and the Magnum Opus. | production | Economic | kept (revised), rare to uncommon; existing |
| The Great Catalogue | IV | rare | supply | +10% production toward the Magnum Opus for each charter technology you know, at most +40%. | production | Economic | kept; new shape |
| The Foundation Stone | IV | rare | rule-breaker | As on the sheet: begin the Opus before any empire knows Alchemy, once half of Alchemy is researched. | the Opus | Economic | kept; new shape |
| The Great Instrument | IV | rare | act: commission | As on the sheet: complete Alchemy; a tenth of the Opus in production. | production | Wildcard | kept; new shape |

Charters: the Librarians' (I), the Paper-Makers' (II), the Physicians' (II), the Gunfounders' (III), the Experimenters' (IV).

- **Scaler:** Enduring Institutions. **Capstone:** The Second Seat: a second Forum, Heroic Epic or Bimaristan, against the rule that names the class.
- **The sketch's four asks:** opened early (the Librarians' Charter, The Palace Archive); production toward them (Learned Foundations, The Long Inheritance); each pays production or scholars (The Royal Estates, The Invitations); each made stronger (Enduring Institutions, The Royal Academies, The Second Seat).
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
| The Great Designs | II | rare | supply: wonders early | In your capital, you may build wonders an age before their technology. | wonders | Economic | new; new shape |
| The City Architects | II | common | supply | Towns of at least eight citizens build wonders 25% faster. | production | Economic | new; existing |
| The Scholars' Guild | II | uncommon | widen | Scholars in the trades also pay +1 food and +1 production. | food, production | Economic | new; feature A |
| The Queen of Cities | III | rare | capstone: doubler | Towns of at least 15 citizens produce twice their food and production. | food, production | Economic | new; existing |
| The Humanists | III | uncommon | widen | Cities with a University gain culture equal to half their base science. | culture | Civic | new (10-17); existing |
| The Fellowships | III | uncommon | rule-breaker | In towns with a University, up to a third of the citizens may join the trades. | guildsmen | Civic | new; feature A |
| The Sum of Knowledge | IV | rare | finisher | Your capital gains +1 production and +1 culture for each technology you know. | production, culture | Civic | kept; new shape |
| The Walls of Learning | IV | common | defence | Cities with a University gain +6 strength, and the city building your Magnum Opus gains +12 more. | defence | Military | kept, uncommon to common; new shape |

Charters: the Surveyors', Glassmakers' and Librarians' (I), the Printers' and Physicians' (II), the Military Engineers' (IV).

- **Scalers:** The Long Study and The Round City. **Capstone:** The Queen of Cities, a doubler on the towns the deck grows on purpose. An age 4 town of 16 makes about 35 food and 30 production, so it gains about 65 a turn; two such towns is band 3's regular card to headline.
- **The Free Cities** carries the cost in its condition: a sixth town switches it off.
- **The split:** these cards give wonders early (The Great Designs, the Librarians' Charter) and production toward them (The City Architects, The Free Cities). None pays for holding one.
- **Bridges:** The Dedications (institutions); The Long Study (learned land, through renown); the Librarians' and Physicians' charters.

### 4.4 The elite army

**The fantasy:** the phalanx of Macedon, the crossbows of the Song, the guns of the Tophane: few soldiers, armed a generation ahead. **The quantity:** units ahead of their age, which research makes by itself and charters bring early. **Areas:** the army.

| Card | Tier | Rarity | Role | Text | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|
| The War Manuals | 0 | common | supply | Units gained in a town with a Library start with +2 strength. | combat | Military | new; existing |
| The Edge of the Sword | I | uncommon | multiply | Your units gain +3 strength against units of an earlier age. | combat | Military | new (10-17); new shape |
| The Field Refits | I | uncommon | act | Each time research upgrades one of your units, it heals fully. | healing | Military | new; new shape |
| The Assay | I | common | widen | +2 science for each distinct strategic resource you can access. | science | Civic | kept (revised); existing |
| The Companions | II | uncommon | multiply, with a cost | While you have no more military units than towns, your units gain +5 strength. | combat | Military | new; new shape |
| The Strategikon | II | uncommon | multiply: scaler | Your units gain +1 strength for every five technologies you know. | combat | Military | new; new shape |
| The Armoury Patterns | II | common | supply | Towns build units of the newest age you know 25% faster. | production toward units | Military | new; new shape |
| The Model Army | III | rare | capstone: rule-breaker | Research upgrades your units even when you lack the strategic resource the new unit needs. | the army | Military | new; new shape |
| Greek Fire | III | uncommon | widen | Gaining a unit that no empire you have met can build grants science and culture equal to its strength. | science, culture | Civic | new (10-17); feature B |
| The Proving Ground | III | uncommon | multiply: the lead | Your units gain +1 strength for each technology you know that no empire you have met knows, at most +8. | combat | Military | reworked (was per charter technology, IV); feature B |
| The Breaching Batteries | IV | uncommon | act | As on the sheet: siege units +5 against cities; each hit on the town building the Opus removes 5% of its banked production. | combat | Military | kept; new shape |

Charters: the Bronze-Founders' (0), the Mechanists' (II), the Gunfounders' and Alchemists' (III), the Naval Gunners' (IV).

- **Scaler:** The Strategikon, which reads the engine itself. **Capstone:** The Model Army: with no iron, Swordsmen still become Legionaries when Iron Working lands.
- **The Field Refits** is the window card: research that lands mid-war is a fresh army. It breaks the rule that an upgrade never heals.
- **The Companions** is the cost as a card. +5 is a strong line in age 3, where units are 42 to 50.
- **The split:** nothing reads ranks or experience (Dominion's). Units start better (`unitStamp` strength) or are newer.
- **Bridges:** The Palace Schools and the Gunfounders' Charter (institutions); The School of Mines and Niter Beds (learned land); The Strategikon (engine).

## 5. Example councils

A Tier 0 card is marked (0). Charters drafted beside a council take no chair. Chair mixes are written Military / Economic / Civic / Wildcard.

### Council 1: the great houses (great cities and institutions)

- **End of Tier I, the Council of Elders (1 / 2 / 1 / 1):** The War Manuals (0); The Free Cities, The Royal Estates; The Scribes' Hall (0); Learned Foundations in the Wildcard chair. Charters: the Librarians', the Surveyors'.
- **End of Tier II, the Republic (0 / 3 / 1 / 1):** The Free Cities, Enduring Institutions, The Great Designs; The Round City; The Dedications.
- **Tier III, the Merchant League (1 / 3 / 2 / 2):** The Palace Schools; Enduring Institutions, The Queen of Cities, The Long Inheritance; The Round City, The Royal Academies; The Second Seat, The Age of Reason. Charters: the Physicians', the Hermetic.
- **Tier IV, the Estates (2 / 4 / 2 / 3):** The Palace Schools, The Walls of Learning; Enduring Institutions, The Queen of Cities, The Long Inheritance, The Great Catalogue; The Round City, The Royal Academies; The Second Seat, The Foundation Stone, The Sum of Knowledge. Charter: the Experimenters'.
- **How it feels:** on turn 45 Cataloguing lands and the capital starts the Forum and the Great Library an age early. On turn 100 The Great Designs starts an age 4 wonder in the capital. On turn 150 the capital and the University town pass 15 citizens, The Queen of Cities doubles their food and production, and The Second Seat raises a second Forum.

### Council 2: the campus (learned land and great cities), with Magisterial

- **End of Tier I, the Priest-King (1 / 1 / 2 / 1):** a Magisterial Military card (The Ceremonial Guard); The Old Academy; The Royal Tutors (0), The Long Study (0); The Scholars' Fame. Charter: the Herbalists'.
- **End of Tier II, the Theocracy (1 / 0 / 3 / 1):** the Magisterial Military card; The Roll of Scholars, The Latin Quarter, The Royal Readers; The Old Academy in the Wildcard chair.
- **Tier III, Divine Mandate (2 / 1 / 3 / 2):** two partner Military cards; The Old Academy; The Roll of Scholars, The Nizamiyya, The Doctorate; The Studium Generale, the shared The House of Wisdom. Charter: the Paper-Makers'.
- **Tier IV, the Curia (2 / 2 / 4 / 3):** two partner Military cards; The Old Academy, The School of Mines; The Roll of Scholars, The Nizamiyya, The Doctorate, The Republic of Letters; The Studium Generale, The House of Wisdom, The Lynx-Eyed Academy.
- **How it feels:** on turn 50 Kidinnu founds an Academy beside the capital. On turn 110 the third scholar costs 256 renown instead of 441 (The Royal Readers), and a Magisterial artist raises a Landmark beside the Academy. On turn 160 that Landmark and a general's Citadel count as Academies: The Old Academy pays each +6 food and +6 production, The Nizamiyya adds half again, and Hypatia's own share adds half of each work's figure.

### Council 3: the Tophane (elite army and institutions), with Dominion

- **End of Tier I, the War Chief (2 / 1 / 1 / 1):** The War Manuals (0), The Edge of the Sword; The Royal Workshops (0); the shared Copying the Enemy; The Field Refits in the Wildcard chair. Charter: the Bronze-Founders'.
- **End of Tier II, Tyranny (3 / 1 / 0 / 1):** The Companions, The Strategikon, The Edge of the Sword; The Secret Arts; The Field Refits. Charter: the Mechanists'.
- **Tier III, Imperium (3 / 2 / 1 / 2):** The Model Army, The Proving Ground, The Strategikon; The Secret Arts, The Journeymen; Greek Fire; The Age of Reason, The Companions. Charters: the Gunfounders', the Alchemists'.
- **Tier IV, the Sultanate (4 / 2 / 2 / 3):** The Model Army, The Proving Ground, The Strategikon, The Breaching Batteries; The Secret Arts, The Journeymen; Greek Fire, the shared Carried-Off Scholars; The Age of Reason, The Companions, The Palace Schools. Charter: the Naval Gunners'.
- **How it feels:** on turn 30 Casting lands and, with copper in hand, the Warriors become Swordsmen in place. On turn 95 Mechanics lands mid-siege: the Catapults become Trebuchets and heal fully, and seven units for eight towns keep The Companions' +5. On turn 150 Fire Lances leave the Tophane at 88 strength before any rival knows Alchemy, and each pays 88 science and 88 culture (Greek Fire).

## 6. Features that would open cards in several decks

Neither adds a player input. Each has a fallback if you decline it.

### Feature A: the trades as a card quantity

- **What it is:** cards may count a town's guildsmen by family, and may change how many a town may have.
- **What the game already does:** the `guilds` phase (`src/sim/guilds.ts`) is passive. A town's renown buildings fill a guild bar; when it fills, one citizen joins the trade whose buildings earned most. At most a quarter of a town joins. Each guildsman pays its family's yield (scholar 2 science, merchant 4 gold, engineer 2 production, artist 2 culture) and 1 renown. The player's only verb is to dismiss one. So guildsmen appear by themselves in big towns, and no card reads them.
- **What it costs:** a `CountKind` for guildsmen (by family, in a town or the empire) and a rule percent on the share cap. The city panel already shows guildsmen.
- **Cards it opens:**
  - Scientific: The Scholars' Guild, The Fellowships.
  - Expansionist (population as a second engine): engineer guildsmen pay +1 food; towns of twelve or more fill their guild bar half again as fast.
  - Commerce: a trade route for every two merchant guildsmen; merchant guildsmen pay +2 gold in a town with a Market.
  - Magisterial: artist guildsmen pay +1 renown; a town with guildsmen of three families gains +15% culture (breadth).
  - Devotion, lightly: towns that follow your religion fill their guild bar faster.
- **If declined:** The Scholars' Guild and The Fellowships are cut.

### Feature B: reading rivals

- **What it is:** three readings against the empires the seat has met: technologies it knows that none of them knows (the lead), technologies one of them knows that it does not (the gap), and whether any of them can build a unit.
- **What the game already does:** every empire's technologies are in the state, `empiresMet` is counted, `techWorld` records firsts, and Mithridates' `rivalHoldsMoreTowns` condition already compares the seat with a rival. Met empires only, so hidden information stays hidden.
- **What it costs:** one memo a turn over the met empires' technology lists, three count or condition kinds, and their words in the describers.
- **Cards it opens:**
  - Scientific: The Secret Arts, The Proving Ground, Greek Fire (the lead), The Translation Movement (the gap).
  - Commerce: the shared Books from the Ships, which waits on the gap today; a route to a more advanced empire pays more science.
  - Dominion: +strength against an empire that knows more technologies than you; a town captured from such an empire pays science toward one technology it knew.
  - Devotion: the Devotion · Scientific scriptoria: Temples pay science for each technology in the gap, capped.
  - Magisterial: drafts cost less culture while a met empire knows more technologies than you.
- **If declined:** The Proving Ground reads charter technologies known (the sheet's version), Greek Fire reads units of the newest age you know, and The Secret Arts and The Translation Movement are cut.

## 7. New shapes

31 shapes in seven families. All read what the game tracks. About half were already on the sheet (charters, early access, the Opus).

1. **The research record:** a tally of technologies completed while seated (The Astronomical Diaries); a count of technologies known (The Strategikon, The Sum of Knowledge); the technology's cost as the moment's measure (The Scholars' Fame); each town's population as a grant on that moment (The Journeymen); the moment counted twice for Orders, Double Time's shape (The Age of Reason); "charter technologies do not count" on a rider (The Prize Essay).
2. **Charters and their technologies:** the fifteen technologies at × 1.5 (every charter); a second way into an existing row (seven charters); the premium read by a card (The Commonplace Book, The Patent Office); counts of charters drafted and charter technologies known, and a tally of charter technologies completed (The Charter Rolls, The Great Catalogue, The Royal Charter Commission); new rows: the Physic Garden, the Qanat (waters the farms beside it), Niter Beds (a copy with no seam), the Bimaristan and the Tophane (existing effect kinds); science as a contribution currency (the Experimenters'); Alchemy's parent waiver (the Hermetic).
3. **Early access with a town test:** The Palace Archive, The Forward Plans, The Great Designs; the current research's rows at double cost: The Prototype Works.
4. **Units, ages and upgrades:** two units' ages compared in a fight (The Edge of the Sword); a filter "of the newest age you know" (The Armoury Patterns); a moment when research upgrades a unit, and a full heal (The Field Refits); the upgrade's resource gate lifted (The Model Army); a condition comparing military units with towns (The Companions).
5. **Great people and works:** a moment for founding a work, with its family (The Founding Gift); a grant of a great person of a named family (The Invitations, The Royal Charter Commission, The Lynx-Eyed Academy); one family weighed at half in the great-person price (The Royal Readers); works beside an Academy counting as Academies for cards (The Studium Generale); a copy step on a work standing on a resource (The School of Mines).
6. **Buildings:** a second copy of an empire building, with a town test (The Second Seat).
7. **The Opus** (the sheet's): a door for one seat (The Foundation Stone); a delay on the door (The Closed Book); the test "the town building the Opus" and a hit that removes banked production (The Walls of Learning, The Breaching Batteries); a commission on one technology with a deal gate (The Great Instrument).

**New to this pass:** eight shapes (the newest-age filter, the upgrade moment and heal, the lifted gate, units against towns, the founding moment, the half-weighted family, works as Academies, the copy step on a work) and four rows (the Physic Garden, Niter Beds, the Bimaristan, the Tophane). **For less engine work, cut** The Field Refits, The Armoury Patterns and The Founding Gift first.

## 8. The sheet's cards

### The Scientific cards (61)

| Card | Tier | Fate | Why |
|---|---|---|---|
| The Almanac | 0 | kept | great cities, supply |
| The Scribes' Hall | 0 | kept | great cities, widen |
| Field Notebooks | 0 | cut | exploration is Commerce's; it pushes no theme |
| The Long Study | 0 | kept | great cities; bridge to the learned land |
| The Prize Essay | 0 | kept | glue: a window |
| The Prospectors' Notes | 0 | kept | learned land, act |
| The Palace Archive | 0 | kept, rare | institutions: early access |
| The Commonplace Book | 0 | kept, to Tier I | glue; it pays nothing before a charter |
| The Sky Watchers | 0 | kept | the early faith every deck carries |
| The Tablet House | 0 | cut | a weak goal; Tier 0 needs theme openers |
| The Glassmakers' Charter | I | kept | great cities |
| The Surveyors' Charter | I | kept | great cities, learned land |
| The Schoolmen's Charter | I | moved | becomes a shared Devotion · Scientific charter |
| The Temple Observatory | I | cut | two narrow facts (a Temple and an Observatory) |
| The Field Survey | I | cut | filler; the Qanat carries the Expansionist pair |
| The Old Academy | I | kept | learned land, widen (your example) |
| Learned Foundations | I | reworked | one effect; its culture goes to The Dedications |
| The Assay | I | kept | elite army, widen |
| The Ordnance Rolls | I | reworked | becomes The School of Mines, Tier III |
| The Prize Question | I | cut | the engine keeps one commission |
| The Forward Plans | I | kept | great cities: a school early |
| The Metallurgists' Charter | II | cut | needs a new unit row |
| The Naturalists' Charter | II | cut | a raw bonus behind a charter |
| The Mechanists' Charter | II | kept | elite army |
| The Printers' Charter | II | kept | great cities; the Commerce pair |
| The Spectacle Makers | II | cut | maturity is no longer a theme |
| The Religious University | II | cut | The Studium Generale does its job for every work |
| Crucible Steel | II | cut | too many combat lines |
| New Crops | II | cut | tied to the cut Naturalists' Charter |
| The Siege College | II | cut | siege is Dominion's; the Mechanists' Charter carries Scientific's |
| Discoveries through Scholars | II | cut | another science payer; The Founding Gift and The Doctorate carry the moment |
| Enduring Institutions | II | reworked | its happiness goes: civic life is not Scientific's |
| The Quiet Faculties | II | kept | learned land; it shows the cost |
| The Royal Charter Commission | II | kept | glue |
| The Alchemists' Charter | III | reworked | adds Niter Beds |
| The Engine Works | III | cut | a conversion with no theme home |
| The Presses | III | cut | buying research with gold is a new player input |
| The Charter Rolls | III | reworked | Tier II; pays production and culture, not science |
| The Saltpetre Works | III | cut | Niter Beds and the Fire Lance carry gunpowder |
| The Second Seat | III | kept | institutions capstone |
| The Long Inheritance | III | kept, uncommon | institutions; bridge from the learned land |
| The Collegium | III | cut | asks for four University towns, against few cities |
| The Lecture Circuit | III | cut | filler, and its happiness is civic life |
| The Great Instrument | IV | kept | institutions: the Opus |
| The Great Catalogue | IV | kept | institutions: the Opus |
| The Hermetic Charter | IV | kept, to Tier III | at Tier IV it lands too late to win a race |
| The Experimenters' Charter | IV | reworked | takes The Great Experiment's rule |
| The Gunfounders' Charter | IV | reworked | Tier III; opens the Tophane, not the Great Gun |
| The Foundation Stone | IV | kept | institutions: the Opus |
| The Great Experiment | IV | merged | into the Experimenters' Charter |
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

**Tally:** 30 kept (5 charters), 8 reworked (3 charters), 21 cut, 1 merged, 1 moved. The ten live rows the sheet cut earlier (Practical Astronomy, Working Estates and the rest) should still be retired.

### The shared cards (15)

All kept unless noted; each pair keeps an early shared card (ruling (qqqqqq) 14).
- **Dominion:** Field Academies (I), Copying the Enemy (I), Carried-Off Scholars (II). The Engineer Corps (III) stands as Dominion's card.
- **Expansionist:** Hydraulic Schools (I).
- **Commerce:** The Exchange of Discoveries (Tier I, as the Commerce sheet has it), The Merchant Navigators (II), Books from the Ships (II, feature B). **Merchant Scholars (III), reworked:** "Foreign routes gain +2 science for each Academy in the origin city", so it reads the learned land.
- **Devotion:** Cloister Schools (I), The Monastery Libraries (I), The Cloister (II), The Blessed Forges (II); new, **The Schoolmen's Charter** (I).
- **Magisterial:** Illuminated Treatises (0), The House of Wisdom (III).

### Not taken from the 2026-10-17 pass

- The House of Life, The Natural History, The Book of Firsts, The Seven Liberal Arts: the engine keeps one grower and one count, so the deck is not about research alone.
- The Professors, The Great Treatises: doubled great-person effects are Magisterial's.
- The Blast Furnaces, The Bronze Casters: they make many units, against the cost.
- The Disciples, The Old Libraries, The Mechanicians, The Instrument Makers: other cards push those themes harder. The Scholar-Officials: authority is civic life.

### The type sort

- **Tier 0 (10):** Military: The War Manuals. Economic: The Royal Workshops, The Almanac. Civic: The Prize Essay, The Sky Watchers, The Royal Tutors, The Prospectors' Notes, The Palace Archive, The Scribes' Hall, The Long Study. Charters: Herbalists' (Civic), Bronze-Founders' (Military).
- **Tier I (15):** Military: The Edge of the Sword, The Field Refits. Economic: The Secret Arts, The Old Academy, The Founding Gift, Learned Foundations, The Royal Estates, The Common Tables, The Free Cities. Civic: The Commonplace Book, The Astronomical Diaries, The Scholars' Fame, The Dedications, The Forward Plans, The Assay. Charters: Surveyors' (Economic), Glassmakers' (Civic), Librarians' (Civic).
- **Tier II (17):** Military: The Palace Schools, The Companions, The Strategikon, The Armoury Patterns. Economic: The Quiet Faculties, Enduring Institutions, The Great Designs, The City Architects, The Scholars' Guild. Civic: The Charter Rolls, The Translation Movement, The Roll of Scholars, The Latin Quarter, The Royal Readers, The Invitations, The Round City. Wildcard: The Royal Charter Commission. Charters: Paper-Makers' (Civic), Physicians' (Economic), Mechanists' (Military), Printers' (Civic).
- **Tier III (15):** Military: The Model Army, The Proving Ground. Economic: The Journeymen, The School of Mines, The Long Inheritance, The Queen of Cities. Civic: The Nizamiyya, The Doctorate, The Second Seat, The Royal Academies, The Humanists, The Fellowships, Greek Fire. Wildcard: The Age of Reason, The Studium Generale. Charters: Gunfounders' (Military), Alchemists' (Military), Hermetic (Civic).
- **Tier IV (11):** Military: The Walls of Learning, The Breaching Batteries. Economic: The Prototype Works, The Great Catalogue, The Foundation Stone. Civic: The Patent Office, The Closed Book, The Republic of Letters, The Sum of Knowledge. Wildcard: The Lynx-Eyed Academy, The Great Instrument. Charters: Experimenters' (Economic), Military Engineers' (Military), Naval Gunners' (Military).

| Tier | Military | Economic | Civic | Wildcard | Seatable | Charters | Common / uncommon / rare |
|---|---|---|---|---|---|---|---|
| 0 | 1 | 2 | 7 | 0 | 10 | 2 | 7 / 2 / 1 |
| I | 2 | 7 | 6 | 0 | 15 | 3 | 6 / 8 / 1 |
| II | 4 | 5 | 7 | 1 | 17 | 4 | 3 / 10 / 4 |
| III | 2 | 4 | 7 | 2 | 15 | 3 | 3 / 7 / 5 |
| IV | 2 | 3 | 4 | 2 | 11 | 3 | 1 / 3 / 7 |
| **All** | **11** | **21** | **31** | **5** | **68** | **15** | **20 / 30 / 18** |

- **By status (seatable):** 25 kept, 5 reworked, 38 new (15 from the 2026-10-17 pass).
- **Every government has something to seat.** Tier 0: the Chiefdom seats The War Manuals, an Economic card and any Civic card. Tiers I and II: every chair type has two or more cards. Tier III: Imperium's third Military chair and, at Tier IV, the Sultanate's Military and the Estates' Economic chairs lean on the partner and on carried cards (The Companions, The Strategikon, The Palace Schools, Enduring Institutions). That is intended for the long game.

## 9. The checks

- **Themes beat a pile.** Each theme has a multiplier on its own flats (The Nizamiyya; Enduring Institutions and The Royal Academies; The Queen of Cities; The Companions and The Strategikon) and a capstone that changes the count. A pile of the deck's strongest single cards has neither.
- **Several routes.** Any two cards start a theme (The Royal Tutors and The Old Academy; Learned Foundations and The Royal Estates; The Common Tables and The Scribes' Hall; The War Manuals and The Edge of the Sword), and each theme has four or more charters.
- **Every card has a home:** four themes and 14 glue cards (21%), with eight bridge cards and seven bridge charters.
- **The essentials along the way.** Each theme reaches science, culture and production by Tier II, except the elite army, whose culture comes at Tier III (Greek Fire) or from the glue (The Prize Essay, The Astronomical Diaries).
- **Science stays a minority:** 11 of 68 seatable cards pay science (16%), 17 of 83 with charters (20%).
- **Areas:** four of five. Civic life: none.
- **The cost shows** in The Free Cities, The Companions, The Quiet Faculties, the charter premium, and the scalers that read one capital.
- **No new input.** Every card is automatic or uses research, building, a great person's act or work, a worker's build, or contributing to the Opus. The Presses and The Longitude Prize were cut for this.
- **The splits are followed:** wonders (early access and production only), empire buildings (never scaled by towns), great-person works (Academies and the works beside them), elite units (no ranks). The split blocked The Professors and The Great Treatises; I do not argue for them, because The Royal Readers carries the idea through supply.
- **Where the pass falls short:**
  - Every number is a guess; nothing is measured.
  - The elite army is thin at Tier IV (one card, two charters). The great cities have no act card after Tier II.
  - Six cards wait on the features (two on A, four on B), plus the shared Books from the Ships.
  - Fifteen charter technologies is a lot of tree work, and the Tier IV charters may come too late for half the seats.
  - The Bronze-Founders' Charter gives an age 1 window with Swordsmen that may step on Dominion's tempo. Watch it in play.
  - The deck is Civic-heavy (31 of 68) with 11 Military cards.
  - No leader points at the elite army or institutions. Doctrines are not in this pass.

## 10. Open questions for the user

1. **The four themes and the engine as written,** with the Opus as an institution and the elite army resting on the upgrade rule. *Recommended: yes.*
2. **Every Scientific charter opens a technology: fifteen, two of them at Tier 0.** *Recommended: yes.* The alternative is to cut the three Tier IV charters and save their tree work.
3. **Feature A, the trades as a card quantity.** *Recommended: yes.* It opens cards in four other decks with no new input.
4. **Feature B, reading rivals, met empires only.** *Recommended: yes.* It lets cards read "strongest in the windows when it is ahead".
5. **Charters that open the rows kept for an unwritten fifth age** (the Bastion, the Frigate, the Corvette). *Recommended: yes.* The rows exist, and they are the clearest bonus no other empire can reach.
6. **The four rule-breakers that touch core rules:** The Royal Readers (the great-person price), The Model Army (an upgrade without its metal), The Field Refits (an upgrade that heals), The Studium Generale (works that count as Academies). *Recommended: yes to all four.*
7. **Scientific leaves civic life:** Enduring Institutions loses its happiness, and The Lecture Circuit and The Scholar-Officials go. *Recommended: yes.*
8. **The Schoolmen's Charter becomes a shared Devotion · Scientific charter.** *Recommended: yes,* to confirm in the Devotion pass.
9. **The 21 cuts in section 8,** and retiring the ten live rows the sheet cut earlier. *Recommended: yes.*

After your answers: every card onto the sheet as `add` and `modify` rows, then Scientific's Doctrines (one for each theme at most tiers), then the triage for the build.
