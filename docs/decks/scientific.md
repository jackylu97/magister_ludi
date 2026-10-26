# The Scientific deck

The deck's cards, by tier: name, rarity, status, ability and type. This sheet is the spec of record for the deck. `test/sim/decks/scientific.test.ts` checks it against `data/decks/scientific.json` and, for the shared table, `data/decks/common.json`.

- **Why each card is here:** `docs/plans/scientific-themes.md`. It designs the deck as a way to play: an engine of technologies and charters, and four themes (the learned land, institutions, great cities and the elite army). Sections 11 to 15 hold the user's rulings. `docs/plans/scientific-list-proposed.md` is the review list this sheet was written from, with each card's theme and role, and the cut cards with the reason for each cut.
- **The build plan:** `docs/plans/scientific-build-triage.md`. Batch S0 built the charter technologies and batch S1 the line traits. Batch S1b wrote this sheet, put the types into the data and retired the cut rows. Batch S2 built feature A (the guildsmen as a card count) and batch S3 built feature B (readings against the empires you have met). Batch S4 built the building charters: eight charters, five new buildings, the Physic Garden, and the Scriptorium and the Bastion opened by their charter technologies. Batch S5 built the learned land: the Surveyors' and the Alchemists' Charters with the Qanat and Niter Beds, the Aqueduct before Engineering, eight cards about Academies and the ground, and The Assay as a card shared with Expansionist. Batch S6 built the research record: eleven cards that pay for completing technologies, for the technologies and charter technologies you know, and for the charters you have drafted. Batch S7 built twelve cards of Tiers 0 to II in shapes that already existed. It renamed Learned Commissions to Learned Foundations (the data row keeps its id `learnedCommissions`), and brought Enduring Institutions and The Quiet Faculties to this sheet's text. Batch S8 built eleven cards about great people and the great houses: a great scholar granted for an empire building, a cheaper step on the great-person price for each great scholar, one second copy of an empire building, the University before Scholarship in a town with an old Library, and a commission that counts Academies. Batch S9 built the army and the Opus: nine cards, and The Soldier-Scholars as a card shared with Dominion. An upgrade from research can now heal a unit, or go ahead without the strategic resource. Two new strength lines read your great people and Academies nearby, and a unit standing in your own town. Towns can build the units of your newest age faster, and the rows of the technology you are researching at double cost. Four cards act on the Magnum Opus: an early start, a delay for the other empires, a commission to complete Alchemy, and siege blows that remove some of its banked production. Batch S10 built the charter screens: the charter shelf on the star chart, the price lists, and the traits on the unit card.
- **The build is complete.** Batch S11 checked this sheet against the data on 2026-10-21. Every card on the five tier tables is in the data, dealt and `implemented`, and every row the plan cut is retired. Batch S12 gave each charter technology a page in the Compendium. Devotion batch DV2 built the three shared rows that waited for the Devotion build, so every shared row is `implemented` too.
- **Your review comments of 2026-10-23, built in batch R1 (2026-10-25)** (`docs/plans/review-revisions-2026-10-25.md`):
  - **The Almanac** made Libraries slower to build, not cheaper (*"implemented incorrectly, it's making libraries more expensive, when it should be less expensive"*). Its row was a production bonus of −25%, which slows a build and leaves the price alone. It is now a cost rule, so a Library's price is 25% lower. It also gives +2 production now, not +1 (*"revise: give +2 production"*).
  - **The Secret Arts** has always counted charter technologies, and its text now says so (*"this should count charter technologies"*). While you have met no empire, it still pays nothing (the triage's reading 18).
  - **Copying the Enemy** (shared with Dominion) is retired, so it leaves both decks. The user's comment on the Dominion list was *"remove"*.
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
- **Charters:** thirteen, counted in the Charters column below. A charter never takes a chair. Drafting it opens its charter technology for research, and knowing that technology gives what the text says. Its type is only for the card's face. A charter's text starts "Drafting this opens" and ends "No chair required.", as the data writes it. A charter stayed deferred until its whole gift was built (the triage's reading 21). All thirteen are dealt since batch S5.
- **Doctrines:** none built. Sixteen are proposed, four a tier, in `docs/plans/scientific-doctrines.md` (2026-10-23), for your review.
- **The sheet of 2026-10-12** (61 cards, 11 charters) is in git history: `git show 4aa4be29:docs/decks/scientific.md`.

| Tier | Implemented | Modify | Add | All | Charters |
|---|---|---|---|---|---|
| Tier 0 | 11 | 0 | 0 | 11 | 2 |
| Tier I | 17 | 0 | 0 | 17 | 3 |
| Tier II | 20 | 0 | 0 | 20 | 4 |
| Tier III | 16 | 0 | 0 | 16 | 2 |
| Tier IV | 13 | 0 | 0 | 13 | 2 |
| **All** | **77** | **0** | **0** | **77** | **13** |
| Shared | 19 | 0 | 0 | 19 | 1 |

**By type** (the chair a card fits; a charter's type is for its face):

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| Tier 0 | 2 | 3 | 6 | 0 |
| Tier I | 2 | 8 | 7 | 0 |
| Tier II | 4 | 6 | 9 | 1 |
| Tier III | 4 | 4 | 6 | 2 |
| Tier IV | 4 | 3 | 4 | 2 |
| **All** | **16** | **24** | **32** | **5** |
| Shared | 2 | 0 | 17 | 0 |

Without the charters, the deck holds 64 cards that take a chair: 9, 14, 16, 14 and 11 across Tiers 0 to IV. By type they are 10 Military, 22 Economic, 27 Civic and 5 Wildcard.

## Tier 0

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Herbalists' Charter** | common | implemented | Drafting this opens Herbals for research. Knowing it lets workers build the Physic Garden on flat land with fresh water, one in each town: +2 science and +2 happiness. No chair required. | Civic |
| **The Bronze-Founders' Charter** | uncommon | implemented | Drafting this opens Casting for research. Knowing it gives two lines a trait they keep through every upgrade. Hoplite (Spearman to Pikeman): +1 strength, and in one of your towns +1 more for every four citizens there. Maryannu (War Chariot to Knight): +1 strength, and +5 against a unit below half health. No chair required. | Military |
| **The Almanac** | common | implemented | Libraries cost 25% less production and give +2 production. | Economic |
| **The Scribes' Hall** | common | implemented | Cities with a Library gain +1 science per four citizens and +1 culture per three citizens. | Civic |
| **The Long Study** | uncommon | implemented | A Library at least twenty turns old grants +2 culture and +1 renown. At forty turns, these bonuses become +4 culture and +2 renown. | Civic |
| **The Prize Essay** | common | implemented | Completing a technology before any other empire grants 15 culture and 15 production in your capital. Charter technologies do not count. | Civic |
| **The Prospectors' Notes** | uncommon | implemented | Building a mine or a quarry grants its town 25 production. | Economic |
| **The Sky Watchers** | common | implemented | Shrines give +1 faith and +1 science. | Civic |
| **The Royal Workshops** | common | implemented | Completing a technology grants 15 production in your capital. | Economic |
| **The Royal Tutors** | common | implemented | +1 renown a turn for each science building you have, favouring great scholars. | Civic |
| **The War Manuals** | common | implemented | Units gained in a town with a Library start with +2 strength. | Military |

## Tier I

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Glassmakers' Charter** | uncommon | implemented | Drafting this opens Optics for research. Knowing it lets you build the Specularium, a city building only you can build: +3 food, and +1 science for every two citizens of its town. No chair required. | Civic |
| **The Surveyors' Charter** | uncommon | implemented | Drafting this opens Surveying for research. Knowing it lets you build the Aqueduct before Engineering, and lets workers build the Qanat: an improvement on flat land that waters the farms beside it with no river or lake nearby. No chair required. | Economic |
| **The Librarians' Charter** | rare | implemented | Drafting this opens Cataloguing for research. Knowing it lets you build the Mouseion, an empire building only you can build: +4 renown a turn, favouring great scholars, and +2 culture for each empire building you hold, itself included. It costs 30% more production than an ordinary empire building. No chair required. | Civic |
| **The Old Academy** | uncommon | implemented | An Academy at least twenty turns old gains +3 food and +3 production. At forty turns these bonuses become +6 of each. | Economic |
| **Learned Foundations** | common | implemented | Cities with a Library build empire buildings 25% faster. | Economic |
| **The Commonplace Book** | common | implemented | Charter technologies cost you 15% less research. | Civic |
| **The Forward Plans** | rare | implemented | You may build a University in any city whose Library has stood at least 30 turns, before you know Scholarship. | Civic |
| **The Astronomical Diaries** | uncommon | implemented | While seated, this card gains +1 culture and +1 production each time you complete a technology. It starts at +2 of each. | Civic |
| **The Secret Arts** | uncommon | implemented | Each town gains +1 production for each technology you know that no empire you have met knows, charter technologies included, at most +5. | Economic |
| **The Scholars' Fame** | common | implemented | Completing a technology grants renown, favouring great scholars, equal to a twentieth of its cost. | Civic |
| **The Founding Gift** | uncommon | implemented | A great scholar who founds an Academy also grants its town 150 production. | Economic |
| **The Royal Estates** | common | implemented | Each empire building gives its town +2 food and +2 production. | Economic |
| **The Common Tables** | common | implemented | Towns gain +2 food for each science building in them. | Economic |
| **The Dedications** | uncommon | implemented | Finishing a science building or an empire building grants culture equal to ten times the town's population. | Civic |
| **The Free Cities** | uncommon | implemented | While you hold at most five towns, your towns build buildings and wonders 20% faster. | Economic |
| **The Edge of the Sword** | uncommon | implemented | Your units gain +3 strength against the units of an empire that knows fewer technologies than you. | Military |
| **The Field Refits** | uncommon | implemented | Each time research upgrades one of your units, it heals fully. | Military |

## Tier II

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Mechanists' Charter** | rare | implemented | Drafting this opens Mechanics for research. Knowing it gives two lines a trait they keep through every upgrade. Onager (Catapult and Trebuchet): +1 range. Repeating Crossbow (Archer to Crossbowman): it may move after it shoots. No chair required. | Military |
| **The Printers' Charter** | uncommon | implemented | Drafting this opens Printing for research. Knowing it lets you build the Aldine Press, a city building only you can build: +2 culture, and trade routes from its town gain +2 science and +2 culture. It also gives +1 trade route. No chair required. | Civic |
| **The Paper-Makers' Charter** | uncommon | implemented | Drafting this opens Papermaking for research. Knowing it lets you build the Scriptorium: +2 science, and +10% science in a town with an Academy in its borders. No chair required. | Civic |
| **The Physicians' Charter** | uncommon | implemented | Drafting this opens Medicine for research. Knowing it lets you build the Bimaristan, an empire building: +25% food in its town, and your units heal 10 more a turn in your land. No chair required. | Economic |
| **Enduring Institutions** | uncommon | implemented | A town with an empire building at least twenty turns old gains +25% production. | Economic |
| **The Quiet Faculties** | rare | implemented | Cities working an Academy gain +25% food and +20% production, but produce military units 25% more slowly. | Economic |
| **The Charter Rolls** | uncommon | implemented | Your capital gains +3 production and +3 culture for each charter you have drafted. | Civic |
| **The Royal Charter Commission** | uncommon | implemented | Commission. Complete a charter technology while this is seated. Reward: a great scholar and 100 culture. Then it leaves its chair. | Wildcard |
| **The Translation Movement** | uncommon | implemented | Technologies that an empire you have met already knows cost you 20% less research. | Civic |
| **The Roll of Scholars** | uncommon | implemented | +4% production and culture for each great scholar you have gained this game, at most +28%. | Civic |
| **The Latin Quarter** | common | implemented | Great-person works beside an Academy gain +2 culture and +1 production. | Civic |
| **The Royal Readers** | rare | implemented | Great scholars raise the price of your next great person by half as much. | Civic |
| **The Invitations** | rare | implemented | Completing an empire building grants a great scholar. | Civic |
| **The Palace Schools** | uncommon | implemented | Units gained in a town with an empire building start with +4 strength. | Military |
| **The Round City** | uncommon | implemented | +1% production and culture for each citizen in your capital, at most +30%. | Civic |
| **The Great Designs** | rare | implemented | Your towns build a wonder 30% faster while no empire you have met knows the technology that opens it. | Economic |
| **The City Architects** | common | implemented | Towns of at least eight citizens build wonders 25% faster. | Economic |
| **The Scholars' Guild** | uncommon | implemented | Scholars in the trades also pay +1 food and +1 production. | Economic |
| **The Strategikon** | uncommon | implemented | Your units gain +4 strength while within two hexes of your great general, your great scholar or your Academy. | Military |
| **The Armoury Patterns** | common | implemented | Towns build units of the newest age you know 25% faster. | Military |

## Tier III

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Alchemists' Charter** | uncommon | implemented | Drafting this opens Chemistry for research. Knowing it gives the Grenadier trait to the Warrior line (Warrior to Longswordsman), kept through every upgrade: +1 strength, and +1 more for each charter technology you know. Workers may build Niter Beds beside a farm or pasture, which supply one niter. Chemistry does not open the Magnum Opus. No chair required. | Military |
| **The Gunfounders' Charter** | uncommon | implemented | Drafting this opens Gunfounding for research. Knowing it lets you build the Tophane, an empire building: military units gained in its town start with +4 strength, and it builds them 25% faster. No chair required. | Military |
| **The School of Mines** | common | implemented | An Academy standing on a strategic resource supplies one more copy of it. | Economic |
| **The Second Seat** | rare | implemented | You may build one second copy of an empire building, in a city with a University. | Civic |
| **The Long Inheritance** | uncommon | implemented | Cities working an Academy at least twenty turns old gain +30% production toward empire buildings, wonders and the Magnum Opus. | Economic |
| **The Proving Ground** | uncommon | implemented | Your units gain +1 strength for each technology you know that no empire you have met knows, at most +8. | Military |
| **The Age of Reason** | rare | implemented | Your Orders count each technology you complete twice. | Wildcard |
| **The Journeymen** | common | implemented | Completing a technology grants each town production equal to three times its population. | Economic |
| **The Studium Generale** | rare | implemented | Great-person works beside an Academy count as Academies for your cards. | Wildcard |
| **The Nizamiyya** | uncommon | implemented | Academies produce half again of everything they make. | Civic |
| **The Doctorate** | common | implemented | Gaining a great scholar grants culture equal to eight turns of your culture. | Civic |
| **The Royal Academies** | uncommon | implemented | +5% production and culture for each empire building you hold. | Civic |
| **The Queen of Cities** | rare | implemented | Towns of at least 15 citizens produce twice their food and production. | Economic |
| **The Humanists** | uncommon | implemented | Cities with a University gain culture equal to half their base science. | Civic |
| **The Model Army** | rare | implemented | Research upgrades your units even when you lack the strategic resource the new unit needs. | Military |
| **Greek Fire** | uncommon | implemented | Gaining a unit that no empire you have met can build grants science and culture equal to its strength. | Civic |

## Tier IV

| Card | Rarity | Status | Ability | Type |
|---|---|---|---|---|
| **The Military Engineers' Charter** | uncommon | implemented | Drafting this opens Military Architecture for research. Knowing it lets you build the Bastion (+5 defence, +30 hit points), which no ordinary technology opens. No chair required. | Military |
| **The Naval Gunners' Charter** | uncommon | implemented | Drafting this opens Naval Gunnery for research. Knowing it gives your Gun Galleys the Galleass trait: +3 strength, and they blockade: parked off a rival's port, a Gun Galley closes its sea lane and its trade. No chair required. | Military |
| **The Great Instrument** | rare | implemented | Commission. Complete Alchemy while this is seated. Reward: production toward the Magnum Opus equal to a tenth of its cost. Then it leaves its chair. Not dealt to a seat that knows Alchemy. | Wildcard |
| **The Great Catalogue** | rare | implemented | +10% production toward the Magnum Opus for each charter technology you know, at most +40%. | Economic |
| **The Foundation Stone** | rare | implemented | You may begin the Magnum Opus before any empire knows Alchemy, once you have put half of Alchemy's cost into researching it. It cannot be finished until you know Alchemy, and your rod of beads must still be full to begin it. | Economic |
| **The Sum of Knowledge** | rare | implemented | Your capital gains +1 production and +1 culture for each technology you know. | Civic |
| **The Closed Book** | rare | implemented | If you complete Alchemy before any other empire, empires that do not know Alchemy may not begin the Magnum Opus for 10 turns. | Civic |
| **The Breaching Batteries** | uncommon | implemented | Your siege units gain +5 strength against cities. Each hit they land on a city building the Magnum Opus removes 5% of the production banked toward it. | Military |
| **The Walls of Learning** | common | implemented | Cities with a University gain +6 strength, and the city building your Magnum Opus gains +12 more. | Military |
| **The Lynx-Eyed Academy** | rare | implemented | Commission. Hold four Academies while this is seated. Reward: a great scholar, and 300 production in each city with an Academy toward what it is building. Then it leaves its chair. | Wildcard |
| **The Patent Office** | uncommon | implemented | Charter technologies cost you no more research than ordinary technologies at the same point in the tree. | Civic |
| **The Prototype Works** | rare | implemented | You may build the buildings and train the units of the technology you are researching, at double their production cost. Wonders are excepted. | Economic |
| **The Republic of Letters** | uncommon | implemented | Your capital gains +4 production and +4 culture for each Academy you hold. | Civic |

## Shared with another deck

These rows live in `data/decks/common.json`. A seat holding Scientific or the deck named beside each one may draw it, so a change here is felt in two decks. Each pair of decks keeps a shared card at Tier I or earlier (ruling (qqqqqq) 14).

- **Types:** since batch S1b every shared row carries the type below. The user approved the types of the cards shared with Commerce, Devotion and Magisterial on 2026-10-21 (`docs/plans/scientific-themes.md`, section 15, item 5). The cards shared with Dominion, Expansionist, Commerce, Devotion and Magisterial carry the types those sheets give them.
- **Moved in Devotion batch DV1** (`docs/plans/devotion-themes-triage.md`): The Priest-Astronomers and The Monastic University came here from the Devotion file, with their ids, texts, tiers and rarities, and are typed Civic.
- **Built in Devotion batch DV2:** The Monastery Libraries left `deferred` with its new text, and The Blessed Forges and The Schoolmen's Charter are new rows. The charter opens a fourteenth charter technology, Scholasticism, at a placeholder place on the lane under Medicine until your chart places it. Knowing it opens the Cathedral and the Apostle before Theology. The Devotion build plan's question 1 (the Apostle opened early) is still open, and the build took its recommendation.

| Card | Rarity | Also in | Tier | Status | Ability | Type |
|---|---|---|---|---|---|---|
| **Illuminated Treatises** | common | Magisterial | 0 | implemented | Cities with both a Library and a Monument gain +1 science and +1 culture. | Civic |
| **Field Academies** | uncommon | Dominion | I | implemented | Your first combat kill each turn grants 23 science. Cities with a Library produce siege units 38% faster. | Civic |
| **The Assay** | common | Expansionist | I | implemented | Hexes with a strategic resource gain +2 science. | Civic |
| **Hydraulic Schools** | common | Expansionist | I | implemented | Cities with an Aqueduct gain +20% production toward science buildings. Those beside a mountain also gain +1 science per three citizens. | Civic |
| **Cloister Schools** | uncommon | Devotion | I | implemented | Cities with both a Temple and a Library gain +5 food and +5 science. | Civic |
| **The Monastery Libraries** | common | Devotion | I | implemented | Libraries give +2 faith. Temples give +2 science. | Civic |
| **The Exchange of Discoveries** | uncommon | Commerce | I | implemented | +2 science on mines and quarries on a resource. Additional +2 if the city has a market. | Civic |
| **The Schoolmen's Charter** | uncommon | Devotion | I | implemented | Drafting this opens Scholasticism for research. Knowing it lets you build the Cathedral and train the Apostle before Theology. No chair required. | Civic |
| **The Priest-Astronomers** | common | Devotion | I | implemented | Your capital gains +2 science and +2 faith for every city of yours keeping a rite, at most +16 of each. | Civic |
| **The Cloister** | rare | Devotion | II | implemented | Cities with a Temple gain science equal to 30% of their base faith. Their Libraries and Universities each gain +3 food. | Civic |
| **The Merchant Navigators** | common | Commerce | II | implemented | Ships gain +1 movement. Routes from a city with a Harbour and a Library gain +5 science. | Civic |
| **Books from the Ships** | uncommon | Commerce | II | implemented | Each foreign trade route you send gains +1 science for each technology the destination's owner knows that you do not, at most +4. | Civic |
| **The Blessed Forges** | uncommon | Devotion | II | implemented | Improved strategic resources gain +1 faith and +1 production. Cities with a Temple gain +2 faith and +2 production more. | Civic |
| **Carried-Off Scholars** | common | Dominion | II | implemented | Capturing a city grants science equal to ten times its population. | Civic |
| **The Soldier-Scholars** | uncommon | Dominion | II | implemented | Your military units in your towns gain +5 strength, and each supplies +2 science. | Military |
| **Merchant Scholars** | uncommon | Commerce | III | implemented | Foreign routes gain +2 science for each Academy in the origin city. | Civic |
| **The Engineer Corps** | uncommon | Dominion | III | implemented | Siege units gain +1 movement. Cities with a Workshop gain +30% production toward siege units and +3 science while at war. | Military |
| **The House of Wisdom** | uncommon | Magisterial | III | implemented | Worked Academies gain +3 culture. Cities working an Academy gain +1 renown and +30% production toward wonders. Each city receives the city bonus once. | Civic |
| **The Monastic University** | rare | Devotion | III | implemented | A Holy Site and an academy standing beside each other each gain +5 science and +3 faith. | Civic |

## Retired rows

These rows stay in the data so that old saves load. They are dealt to nobody, they carry no type, and no table above lists them. The list doc's cut table and the themes doc's section 8 give the reason for each cut.

- **Cut by the themes pass and retired in batch S1b:** Field Notebooks, and Discoveries through Great People (the list doc's Discoveries through Scholars).
- **Cut in the review of 2026-10-06 and retired in batch S1b:**
  - ten live rows: Practical Astronomy, Working Estates, The Endowed Provinces, The Royal Society, The Learned Chancery, The Academy Quarter, The Patent Rolls, Master Artificers, The Society of Artificers and The Learned Realm;
  - twelve deferred rows: The Celestial Rites, Natural Philosophy, Apprentice Engineers, The Research Annals, Patient Research, The Open Collegium, The Practical Arts, Research through Construction, The Inherited School, Husbandry Studies, Commissions of Service and The Distant Colleges;
  - in `data/decks/common.json`, the shared The Hydraulic Commonwealth, cut on both its sheets.
- **Retired in batch S0:** The Metallurgists' Charter and The Naturalists' Charter.
- **Retired in batch R1 (2026-10-25):** in `data/decks/common.json`, the shared Copying the Enemy (the user, on the Dominion list: *"remove"*). It paid only for kills, so a Scientific seat alone would rarely use it.
- Cards cut before they had a data row (The Palace Archive, The Fellowships, the Hermetic and Experimenters' Charters, and the others in the list doc's cut table) have nothing to retire.
