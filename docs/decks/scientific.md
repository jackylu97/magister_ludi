# The Scientific deck

The deck's cards, by tier: name, rarity, status, ability and type. This sheet is the spec of record for the deck. `test/sim/decks/scientific.test.ts` checks it against `data/decks/scientific.json` and, for the shared table, `data/decks/common.json`.

- **Why each card is here:** `docs/plans/scientific-themes.md`. It designs the deck as a way to play: an engine of technologies and charters, and four themes (the learned land, institutions, great cities and the elite army). Sections 11 to 15 hold the user's rulings. `docs/plans/scientific-list-proposed.md` is the review list this sheet was written from, with each card's theme and role, and the cut cards with the reason for each cut.
- **The build plan:** `docs/plans/scientific-build-triage.md`. Batch S0 built the charter technologies and batch S1 the line traits. Batch S1b wrote this sheet, put the types into the data and retired the cut rows. Batch S2 built feature A (the guildsmen as a card count) and batch S3 built feature B (readings against the empires you have met). Batch S4 built the building charters: eight charters, five new buildings, the Physic Garden, and the Scriptorium and the Bastion opened by their charter technologies. Batch S5 built the learned land: the Surveyors' and the Alchemists' Charters with the Qanat and Niter Beds, the Aqueduct before Engineering, eight cards about Academies and the ground, and The Assay as a card shared with Expansionist. Batch S6 built the research record: eleven cards that pay for completing technologies, for the technologies and charter technologies you know, and for the charters you have drafted. Batch S7 built twelve cards of Tiers 0 to II in shapes that already existed. It renamed Learned Commissions to Learned Foundations (the data row keeps its id `learnedCommissions`), and brought Enduring Institutions and The Quiet Faculties to this sheet's text. Batch S8 built eleven cards about great people and the great houses: a great scholar granted for an empire building, a cheaper step on the great-person price for each great scholar, one second copy of an empire building, the University before Scholarship in a town with an old Library, and a commission that counts Academies. Batch S9 built the army and the Opus: nine cards, and The Soldier-Scholars as a card shared with Dominion. An upgrade from research can now heal a unit, or go ahead without the strategic resource. Two new strength lines read your great people and Academies nearby, and a unit standing in your own town. Towns can build the units of your newest age faster, and the rows of the technology you are researching at double cost. Four cards act on the Magnum Opus: an early start, a delay for the other empires, a commission to complete Alchemy, and siege blows that remove some of its banked production. Batch S10 built the charter screens: the charter shelf on the star chart, the price lists, and the traits on the unit card.
- **The build is complete.** Batch S11 checked this sheet against the data on 2026-10-21. Every card on the five tier tables is in the data, dealt and `implemented`, and every row the plan cut is retired. Batch S12 gave each charter technology a page in the Compendium. Devotion batch DV2 built the three shared rows that waited for the Devotion build, so every shared row is `implemented` too.
- **Your review comments of 2026-10-23, built in batch R1 (2026-10-25)** (`docs/plans/review-revisions-2026-10-25.md`):
  - **The Almanac** made Libraries slower to build, not cheaper (*"implemented incorrectly, it's making libraries more expensive, when it should be less expensive"*). Its row was a production bonus of −25%, which slows a build and leaves the price alone. It is now a cost rule, so a Library's price is 25% lower. It also gives +2 production now, not +1 (*"revise: give +2 production"*).
  - **The Secret Arts** has always counted charter technologies, and its text now says so (*"this should count charter technologies"*). While you have met no empire, it still pays nothing (the triage's reading 18).
  - **Copying the Enemy** (shared with Dominion) is retired, so it leaves both decks. The user's comment on the Dominion list was *"remove"*.
- **Your review comments of 2026-10-28, built in batch R3** (`docs/plans/scientific-review-2026-10-28.md`):
  - **The Scribes' Hall, The Long Study and The Sky Watchers** move from Tier 0 to Tier I (*"move to tier 1"*). Their text, rarity and type do not change.
  - **The Prize Essay** is retired (*"remove, too similar to royal workshops"*). **The Kept Secret** is new in its place: while you know a technology no other empire knows, your capital gains +20% food and +20% culture. It is uncommon, because a capital share is large in Tier 0.
  - **The Curators of Works** is new: each public work gives its town +1 science and +1 happiness. The Granary is a public work, with the Aqueduct, the Watermill, the Harbour, the Public Bath and the Cistern. The science is on each public work, so a card that doubles a Granary's yields doubles it too.
  - **The Mountain Observatories** is new and shared with Expansionist: cities with a mountain in their borders gain +3 science. It stacks with The Mountain Schools.
- **Batch DS1** (2026-11-10, `docs/plans/deck-simplification-2026-11-10.md`, `docs/flags.md` item (hhhhhhh)) retired 12 rows of this deck and 4 shared rows. It moved The Almanac and The Bronze-Founders' Charter from Tier 0 to Tier I. A moved row keeps its text until a later batch changes it. "Retired rows" below gives the reason for each cut.
- **Batch DS6** (2026-11-10, the same spec) gave 30 rows of this deck their new, shorter text, and added two Tier 0 cards: The Scribes (+1 science in every town) and The Apprentices (5 science for each building finished). The charters' texts now start with the keyword "Charter.":
  - **Reworded, same effect:** nine charters (the Herbalists', Glassmakers', Librarians', Surveyors', Mechanists', Paper-Makers', Gunfounders', Military Engineers' and Naval Gunners'), The Astronomical Diaries, The Scholars' Fame, The Royal Charter Commission, The Nizamiyya, The Foundation Stone, The Great Instrument and The Lynx-Eyed Academy. A charter's building, work or trait keeps every rule it had. The Astronomical Diaries still starts at +2 of each in the capital, The Great Instrument is still not dealt to a seat that knows Alchemy, and The Foundation Stone's Opus still cannot be finished before Alchemy.
  - **Simplified:** The Almanac no longer makes Libraries cheaper. The Old Academy, Enduring Institutions and The Forward Plans no longer ask how long a thing has stood, and Enduring Institutions gives +20%, not +25%. The Scribes' Hall lost its culture. The Quiet Faculties lost its slower military units. The Strategikon counts only an Academy, not a great general or great scholar. The Breaching Batteries lost its +5 strength against cities. The Walls of Learning lost its +12 for the town raising the Opus.
  - **Simplified charters**, each changed on the row it opens: the Hoplite and the Maryannu (Casting) are each a plain +2 strength; the Bimaristan (Medicine) no longer heals units; the Aldine Press (Printing) no longer pays its trade routes, and Printing still gives +1 trade route; the Grenadier (Chemistry) is +1 strength for each charter technology you know, with no flat +1, and Niter Beds are removed, so Chemistry opens no work.
  - **Changed:** The Royal Tutors gives +2 scholar renown for each science building, not +1.
- **Status:**
  - `implemented`: in the data, dealt, and the data's text is this sheet's text.
  - `modify`: in the data, but not as this sheet writes it. The words after the colon say why. A row can have more than one:
    - `deferred`: not dealt yet, because it needs a new shape, building or improvement;
    - `revised`: the text and the effect change;
    - `reworked`: a different card takes over the row;
    - `moved`: the card moves to another tier;
    - `rarity`: the rarity changes;
    - `shared`: the row moves to `data/decks/common.json` and becomes a shared card.
  - `add`: not in the data yet.
  - **(was …)** names the data row that a renamed card takes over.
- **Type:** the last column says which chair the card fits: **Military**, **Economic**, **Civic** or **Wildcard** (`docs/plans/doctrines-governments-chairs.md`, section 4). Since batch S1b the types are in the data. A Scientific card fits only a chair of its own type or a Wildcard chair. The sync test checks this column for every row in the data, the shared table's included.
- **Charters:** thirteen, counted in the Charters column below. A charter never takes a chair. Drafting it opens its charter technology for research, and knowing that technology gives what the text says. Its type is only for the card's face. Since batch DS6 a charter's text starts with the keyword "Charter.", as the data writes it. The text is short, and the building, improvement or trait that the technology opens keeps its full rules on its own page. A charter stayed deferred until its whole gift was built (the triage's reading 21). All thirteen are dealt since batch S5.
- **Doctrines:** 15 (4, 3, 4 and 4 across Tiers I to IV), all dealt, after your comments of 2026-11-05 (`docs/plans/doctrine-review-2026-11-05.md`). A Doctrine is held for the whole game and takes no chair. Each tier's Doctrine table sits above its Orders, and the Build column names the theme that each is written for. `docs/plans/doctrines-build-triage.md` gives the batch that built each one. The reasons and pairs are in `docs/plans/scientific-doctrines.md`.
- **The sheet of 2026-10-12** (61 cards, 11 charters) is in git history: `git show 4aa4be29:docs/decks/scientific.md`.

| Tier | Implemented | Modify | Add | All | Charters |
|---|---|---|---|---|---|
| Tier 0 | 8 | 0 | 0 | 8 | 1 |
| Tier I | 19 | 0 | 0 | 19 | 4 |
| Tier II | 17 | 0 | 0 | 17 | 4 |
| Tier III | 12 | 0 | 0 | 12 | 2 |
| Tier IV | 12 | 0 | 0 | 12 | 2 |
| **All** | **68** | **0** | **0** | **68** | **13** |
| Shared | 16 | 0 | 0 | 16 | 1 |

**By type** (the chair a card fits; a charter's type is for its face):

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| Tier 0 | 1 | 3 | 4 | 0 |
| Tier I | 2 | 9 | 8 | 0 |
| Tier II | 4 | 4 | 8 | 1 |
| Tier III | 4 | 2 | 5 | 1 |
| Tier IV | 4 | 3 | 3 | 2 |
| **All** | **15** | **21** | **28** | **4** |
| Shared | 1 | 0 | 15 | 0 |

Without the charters, the deck holds 55 cards that take a chair: 7, 15, 13, 10 and 10 across Tiers 0 to IV. By type they are 9 Military, 19 Economic, 23 Civic and 4 Wildcard.

## Tier 0

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Herbalists' Charter** | common | implemented | Charter. Opens Herbals, which unlocks the Physic Garden: +2 science and +2 happiness. | Civic |
| **The Prospectors' Notes** | uncommon | implemented | Building a mine or a quarry grants its town 25 production. | Economic |
| **The Royal Workshops** | common | implemented | Completing a technology grants 15 production in your capital. | Economic |
| **The Royal Tutors** | common | implemented | +2 scholar renown each turn for each science building. | Civic |
| **The War Manuals** | common | implemented | Units gained in a town with a Library start with +2 strength. | Military |
| **The Curators of Works** | common | implemented | Public works give +1 science and +1 happiness. | Civic |
| **The Scribes** | common | implemented | +1 science in every town. | Civic |
| **The Apprentices** | common | implemented | Finishing a building grants 5 science. | Economic |

## Tier I

**Doctrines,** offered with the tier-4 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Pythagorean Brotherhood** | engine | +2 science in every city, doubled in cities with a Shrine. |
| **The Removal to Xianyang** | great cities | Your towns grow 30% faster. Settlers cost twice as much. |
| **The Workshops of Syracuse** | elite army | Your military units gain +5 combat strength. They cost 50% more to build and to buy. |
| **The Peripatetic School** | learned land | Academies gain +2 science and +2 production. Science buildings and wonders give +30% renown. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Glassmakers' Charter** | uncommon | implemented | Charter. Opens Optics, which unlocks the Specularium: +3 food, and +1 science for every two citizens. | Civic |
| **The Surveyors' Charter** | uncommon | implemented | Charter. Opens Surveying: you may build the Aqueduct early, and workers may build the Qanat, which waters the farms beside it. | Economic |
| **The Librarians' Charter** | rare | implemented | Charter. Opens Cataloguing, which unlocks the Mouseion: +4 scholar renown, and +2 culture for each empire building you hold. | Civic |
| **The Old Academy** | uncommon | implemented | Academies gain +3 food and +3 production. | Economic |
| **Learned Foundations** | common | implemented | Cities with a Library build empire buildings 25% faster. | Economic |
| **The Forward Plans** | rare | implemented | You may build Universities before you know Scholarship. | Civic |
| **The Astronomical Diaries** | uncommon | implemented | Gains +1 culture and +1 production each time you complete a technology. | Civic |
| **The Secret Arts** | uncommon | implemented | Each town gains +1 production for each technology you know that no empire you have met knows, charter technologies included, at most +5. | Economic |
| **The Scholars' Fame** | common | implemented | Completing a technology grants scholar renown equal to a twentieth of its cost. | Civic |
| **The Founding Gift** | uncommon | implemented | A great scholar who founds an Academy also grants its town 150 production. | Economic |
| **The Royal Estates** | common | implemented | Each empire building gives its town +2 food and +2 production. | Economic |
| **The Common Tables** | common | implemented | Towns gain +2 food for each science building in them. | Economic |
| **The Dedications** | uncommon | implemented | Finishing a science building or an empire building grants culture equal to ten times the town's population. | Civic |
| **The Free Cities** | uncommon | implemented | While you hold at most five towns, your towns build buildings and wonders 20% faster. | Economic |
| **The Edge of the Sword** | uncommon | implemented | Your units gain +3 strength against the units of an empire that knows fewer technologies than you. | Military |
| **The Scribes' Hall** | common | implemented | Towns with a Library gain +1 science for every four citizens. | Civic |
| **The Sky Watchers** | common | implemented | Shrines give +1 faith and +1 science. | Civic |
| **The Bronze-Founders' Charter** | uncommon | implemented | Charter. Opens Casting: your spear and chariot lines gain +2 strength for good. | Military |
| **The Almanac** | common | implemented | Libraries give +2 production. | Economic |

## Tier II

**Doctrines,** offered with the tier-10 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Jixian Academy** | engine | Completing a technology grants culture equal to a fifth of its cost. Your towns make 25% less culture. |
| **The Academy of Gondishapur** | institutions | Towns with an empire building gain +15% science. +20% production toward empire buildings, except the Magnum Opus and its works. |
| **The Pandidakterion** | learned land | Hexes with an Academy have double yields, applied after every other change to the hex. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Mechanists' Charter** | rare | implemented | Charter. Opens Mechanics: catapults gain +1 range, and your archer line may move after it shoots. | Military |
| **The Printers' Charter** | uncommon | implemented | Charter. Opens Printing, which unlocks the Aldine Press: +2 culture and +1 trade route. | Civic |
| **The Paper-Makers' Charter** | uncommon | implemented | Charter. Opens Papermaking, which unlocks the Scriptorium: +2 science, and +10% science beside an Academy. | Civic |
| **The Physicians' Charter** | uncommon | implemented | Charter. Opens Medicine, which unlocks the Bimaristan: +25% food in its town. | Economic |
| **Enduring Institutions** | uncommon | implemented | Towns with an empire building gain +20% production. | Economic |
| **The Quiet Faculties** | rare | implemented | Towns working an Academy gain +25% food and +20% production. | Economic |
| **The Charter Rolls** | uncommon | implemented | Your capital gains +3 production and +3 culture for each charter you have drafted. | Civic |
| **The Royal Charter Commission** | uncommon | implemented | Goal: complete a charter technology. Reward: a great scholar and 100 culture. | Wildcard |
| **The Translation Movement** | uncommon | implemented | Technologies that an empire you have met already knows cost you 20% less research. | Civic |
| **The Roll of Scholars** | uncommon | implemented | +4% production and culture for each great scholar you have gained this game, at most +28%. | Civic |
| **The Latin Quarter** | common | implemented | Great-person works beside an Academy gain +2 culture and +1 production. | Civic |
| **The Invitations** | rare | implemented | Completing an empire building grants a great scholar. | Civic |
| **The Palace Schools** | uncommon | implemented | Units gained in a town with an empire building start with +4 strength. | Military |
| **The Round City** | uncommon | implemented | +1% production and culture for each citizen in your capital, at most +30%. | Civic |
| **The City Architects** | common | implemented | Towns of at least eight citizens build wonders 25% faster. | Economic |
| **The Strategikon** | uncommon | implemented | Your units gain +4 strength within two hexes of an Academy. | Military |
| **The Armoury Patterns** | common | implemented | Towns build units of the newest age you know 25% faster. | Military |

## Tier III

**Doctrines,** offered with the tier-18 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Directorate of Arms** | engine (the lead); bridge to the elite army | While no empire you have met knows more technologies than you, your units gain +3 combat strength. |
| **The Universitas** | great cities | Science buildings in your towns of twelve or more citizens produce twice their yields. In your smaller towns they produce half. |
| **The Volley Fire** | elite army | Your archer line (Archer to Crossbowman) may attack twice a turn. Your melee units fight at −10% strength. |
| **The Külliye** | institutions | Towns with an Academy may build their own copy of each empire building. +50% production toward empire buildings, except the Magnum Opus and its works. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Alchemists' Charter** | uncommon | implemented | Charter. Opens Chemistry: your warrior line gains +1 strength for each charter technology you know. | Military |
| **The Gunfounders' Charter** | uncommon | implemented | Charter. Opens Gunfounding, which unlocks the Tophane: its town builds military units 25% faster, with +4 strength. | Military |
| **The Second Seat** | rare | implemented | You may build one second copy of an empire building, in a city with a University. | Civic |
| **The Proving Ground** | uncommon | implemented | Your units gain +1 strength for each technology you know that no empire you have met knows, at most +8. | Military |
| **The Age of Reason** | rare | implemented | Your Orders count each technology you complete twice. | Wildcard |
| **The Journeymen** | common | implemented | Completing a technology grants each town production equal to three times its population. | Economic |
| **The Nizamiyya** | uncommon | implemented | Academies yield 50% more. | Civic |
| **The Doctorate** | common | implemented | Gaining a great scholar grants culture equal to eight turns of your culture. | Civic |
| **The Royal Academies** | uncommon | implemented | +5% production and culture for each empire building you hold. | Civic |
| **The Queen of Cities** | rare | implemented | Towns of at least 15 citizens produce twice their food and production. | Economic |
| **The Humanists** | uncommon | implemented | Cities with a University gain culture equal to half their base science. | Civic |
| **The Model Army** | rare | implemented | Research upgrades your units even when you lack the strategic resource the new unit needs. | Military |

## Tier IV

**Doctrines,** offered with the tier-26 governments:

| Doctrine | Build | Text |
|---|---|---|
| **The Court of Rudolf II** | engine | Alchemy, and the fourth-age technologies that lead to it, cost you 20% less research. Your other fourth-age technologies cost you 25% more. |
| **The Platonic Academy** | learned land | Your great people of every family found an Academy as their work, in place of their own. |
| **The Nassau Reforms** | elite army | Each time research upgrades one of your units, it gains +2 strength for good. Your towns build military units 25% more slowly. |
| **The Two Capitals** | great cities | Your largest town besides your capital also counts as your capital for your cards. Your other towns grow 25% more slowly. |

**Orders:**

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Military Engineers' Charter** | uncommon | implemented | Charter. Opens Military Architecture, which unlocks the Bastion: +5 defence and +30 hit points. | Military |
| **The Naval Gunners' Charter** | uncommon | implemented | Charter. Opens Naval Gunnery: your Gun Galleys gain +3 strength and may blockade a rival's port. | Military |
| **The Great Instrument** | rare | implemented | Goal: complete Alchemy. Reward: a tenth of the Magnum Opus. | Wildcard |
| **The Great Catalogue** | rare | implemented | +10% production toward the Magnum Opus for each charter technology you know, at most +40%. | Economic |
| **The Foundation Stone** | rare | implemented | You may begin the Magnum Opus once Alchemy is half researched. | Economic |
| **The Sum of Knowledge** | rare | implemented | Your capital gains +1 production and +1 culture for each technology you know. | Civic |
| **The Closed Book** | rare | implemented | If you complete Alchemy before any other empire, empires that do not know Alchemy may not begin the Magnum Opus for 10 turns. | Civic |
| **The Breaching Batteries** | uncommon | implemented | Each hit your siege units land on a city removes 5% of its Magnum Opus progress. | Military |
| **The Walls of Learning** | common | implemented | Towns with a University gain +6 defence. | Military |
| **The Lynx-Eyed Academy** | rare | implemented | Goal: hold four Academies. Reward: a great scholar, and 300 production in each town with an Academy. | Wildcard |
| **The Prototype Works** | rare | implemented | You may build the buildings and train the units of the technology you are researching, at double their production cost. Wonders are excepted. | Economic |
| **The Republic of Letters** | uncommon | implemented | Your capital gains +4 production and +4 culture for each Academy you hold. | Civic |

## Shared with another deck

These rows live in `data/decks/common.json`. A seat holding Scientific or the deck named beside each one may draw it, so a change here is felt in two decks. Each pair of decks keeps a shared card at Tier I or earlier (ruling (qqqqqq) 14).

- **Types:** since batch S1b every shared row carries the type below. The user approved the types of the cards shared with Commerce, Devotion and Magisterial on 2026-10-21 (`docs/plans/scientific-themes.md`, section 15, item 5). The cards shared with Dominion, Expansionist, Commerce, Devotion and Magisterial carry the types those sheets give them.
- **Moved in Devotion batch DV1** (`docs/plans/devotion-themes-triage.md`): The Priest-Astronomers and The Monastic University came here from the Devotion file, with their ids, texts, tiers and rarities, and are typed Civic.
- **Built in Devotion batch DV2:** The Monastery Libraries left `deferred` with its new text, and The Blessed Forges and The Schoolmen's Charter are new rows. The charter opens a fourteenth charter technology, Scholasticism, at a placeholder place on the lane under Medicine until your chart places it. In DV2, knowing it opened the Cathedral and the Apostle before Theology.
- **New in batch R3** (`docs/plans/scientific-review-2026-10-28.md`): The Mountain Observatories, shared with Expansionist at your request of 2026-10-28.
- **Changed in Devotion batch R2c** (`docs/plans/devotion-review-2026-10-28.md`): The Schoolmen's Charter took your revision of 2026-10-28. Scholasticism now opens a new religious building, the Cathedral School: +2 science for each building in its town that supplies faith, and +2 more for each while the town keeps a rite. It no longer opens the Cathedral or the Apostle early, so the Devotion build plan's question 1 (the Apostle opened early) is closed.
- **Changed in Devotion batch DS5** (2026-11-10, `docs/plans/deck-simplification-2026-11-10.md`): four shared rows took their new, shorter text. The Priest-Astronomers lost its cap, The Cloister lost its food on Libraries and Universities, and The Blessed Forges lost its line for towns with a Temple. The Schoolmen's Charter was only reworded: the Cathedral School still doubles its science while its town keeps a rite, as the building's own page says.
- **Changed in Scientific batch DS6** (2026-11-10, the same spec): the two rows shared with Magisterial. Illuminated Treatises no longer needs both buildings in one town: a Library gives +1 culture and a Monument gives +1 science, each on its own. The House of Wisdom keeps only its +30% production toward wonders in a town working an Academy; the culture on the Academy and the renown went.

| Card | Rarity | Also in | Tier | Status | Ability | Type |
|---|---|---|---|---|---|---|
| **Illuminated Treatises** | common | Magisterial | 0 | implemented | Libraries give +1 culture. Monuments give +1 science. | Civic |
| **The Mountain Observatories** | common | Expansionist | 0 | implemented | Cities with a mountain in their borders gain +3 science. | Civic |
| **Field Academies** | uncommon | Dominion | I | implemented | Your first kill each turn grants 25 science. | Civic |
| **The Assay** | common | Expansionist | I | implemented | Hexes with a strategic resource gain +2 science. | Civic |
| **The Monastery Libraries** | common | Devotion | I | implemented | Libraries give +2 faith. Temples give +2 science. | Civic |
| **The Exchange of Discoveries** | uncommon | Commerce | I | implemented | Mines and quarries on a resource gain +2 science. | Civic |
| **The Schoolmen's Charter** | uncommon | Devotion | I | implemented | Charter. Opens Scholasticism, which unlocks the Cathedral School: +2 science for each faith building in its town. | Civic |
| **The Priest-Astronomers** | common | Devotion | I | implemented | Your capital gains +2 science and +2 faith for each town keeping a rite. | Civic |
| **The Cloister** | rare | Devotion | II | implemented | Towns with a Temple gain science equal to 30% of their faith. | Civic |
| **The Merchant Navigators** | common | Commerce | II | implemented | Trade routes from a town with a Harbour gain +5 science. | Civic |
| **The Blessed Forges** | uncommon | Devotion | II | implemented | Improved strategic resources gain +1 faith and +1 production. | Civic |
| **Carried-Off Scholars** | common | Dominion | II | implemented | Capturing a city grants science equal to ten times its population. | Civic |
| **The Soldier-Scholars** | uncommon | Dominion | II | implemented | Each military unit in your towns gives +2 science. | Military |
| **Merchant Scholars** | uncommon | Commerce | III | implemented | Foreign routes gain +2 science for each Academy in the origin city. | Civic |
| **The House of Wisdom** | uncommon | Magisterial | III | implemented | Towns working an Academy build wonders 30% faster. | Civic |
| **The Monastic University** | rare | Devotion | III | implemented | A Holy Site and an academy standing beside each other each gain +5 science and +3 faith. | Civic |

## Retired rows

These rows stay in the data so that old saves load. They are dealt to nobody, they carry no type, and no table above lists them. The list doc's cut table and the themes doc's section 8 give the reason for each cut.

- **Retired in batch DS1** (2026-11-10, `docs/plans/deck-simplification-2026-11-10.md`). The reason after each card is the Note column of that file's table. Each data row keeps its text and effects:
  - The Kept Secret (Tier 0): it reads what rivals know, which the player cannot see easily.
  - The Commonplace Book (Tier I): charter technologies cost the ordinary price (see the system changes).
  - The Field Refits (Tier I): too narrow to matter in most games.
  - The Long Study (Tier I): it reads how long a thing has stood, which the player must track. The Scribes' Hall is the Library card.
  - The Great Designs (Tier II): it reads what rivals know, which the player cannot see easily. The City Architects is the wonder card.
  - The Royal Readers (Tier II): it changes a price the player rarely looks at.
  - The Scholars' Guild (Tier II): too narrow to matter in most games.
  - Greek Fire (Tier III): it reads what rivals know, which the player cannot see easily.
  - The Long Inheritance (Tier III): it reads how long a thing has stood, which the player must track.
  - The School of Mines (Tier III): too narrow to matter in most games.
  - The Studium Generale (Tier III): a "counts as" rule. Doctrine candidate.
  - The Patent Office (Tier IV): charter technologies cost the ordinary price (see the system changes).
  - in `data/decks/common.json`, the shared cards:
    - Cloister Schools (with Devotion, Tier I): it asks for two separate things at once. The Monastery Libraries does this job.
    - Hydraulic Schools (with Expansionist, Tier I): it asks for two separate things at once.
    - Books from the Ships (with Commerce, Tier II): it reads what rivals know, which the player cannot see easily.
    - The Engineer Corps (with Dominion, Tier III): three effects, one of them war only.
- **Cut by the themes pass and retired in batch S1b:** Field Notebooks, and Discoveries through Great People (the list doc's Discoveries through Scholars).
- **Cut in the review of 2026-10-06 and retired in batch S1b:**
  - ten live rows: Practical Astronomy, Working Estates, The Endowed Provinces, The Royal Society, The Learned Chancery, The Academy Quarter, The Patent Rolls, Master Artificers, The Society of Artificers and The Learned Realm;
  - twelve deferred rows: The Celestial Rites, Natural Philosophy, Apprentice Engineers, The Research Annals, Patient Research, The Open Collegium, The Practical Arts, Research through Construction, The Inherited School, Husbandry Studies, Commissions of Service and The Distant Colleges;
  - in `data/decks/common.json`, the shared The Hydraulic Commonwealth, cut on both its sheets.
- **Retired in batch S0:** The Metallurgists' Charter and The Naturalists' Charter.
- **Retired in batch R1 (2026-10-25):** in `data/decks/common.json`, the shared Copying the Enemy (the user, on the Dominion list: *"remove"*). It paid only for kills, so a Scientific seat alone would rarely use it.
- **Retired in batch R3 (2026-10-28):** The Prize Essay (the user: *"remove, too similar to royal workshops"*). The Kept Secret took its place in Tier 0.
- Cards cut before they had a data row (The Palace Archive, The Fellowships, the Hermetic and Experimenters' Charters, and the others in the list doc's cut table) have nothing to retire.
