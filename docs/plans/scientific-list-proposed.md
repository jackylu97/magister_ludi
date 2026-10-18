# The Scientific deck: the full list, with the builds pass folded in

This is a review list, made on 2026-10-18. It puts every card on the deck sheet (`docs/decks/scientific.md`) in one list, with every new card and change from the builds pass (`docs/plans/scientific-builds.md`, 2026-10-17) folded in. It is not the spec of record. The sheet is unchanged, and the sheet's text wins wherever the two differ.

- **Status:**
  - `implemented`: in the data, dealt, and the sheet's text is what the game does.
  - `modify`: in the data, but not as the sheet writes it. The word after the colon says why: `revised` (the sheet changes the card), `deferred` (not dealt, because it needs a new shape). Some rows have both. The ability shown is the sheet's text.
  - `add`: on the sheet, not in the data.
  - `new`: proposed by the builds pass, not on the sheet.
  - `proposed: …` after the status names a change the builds pass proposes: a tier move, a rarity change, a trim to one effect, or a rework. The row already shows the change (the new tier, rarity and text), and the status says what it was.
  - **(was …)** names the data row that a renamed card takes over.
- **Type:** the chair the card fits (Military, Economic, Civic or Wildcard), from the builds pass's type sort. Charters take no chair; their type is for their face.
- **Build:** the build or builds the pass seats the card in. The pass's builds are the research build, the learned city (its core, the university, the house of wisdom) and the vanguard (its core, the inventors, the arsenal). "Flex" is the pass's section on switching between the learned city and the vanguard. A charter is "beside" a build: it opens what the build uses, but takes no chair.
- **Doctrines:** Scientific has none yet. The pass plans one for each build after this review.
- **Cut cards:** the sheet cut 22 rows of `data/decks/scientific.json`. Ten of them are live and dealt today: Practical Astronomy, Working Estates, The Endowed Provinces, The Royal Society, The Learned Chancery, The Academy Quarter, The Patent Rolls, Master Artificers, The Society of Artificers and The Learned Realm. The pass recommends retiring the ten (its question 9). The other twelve are deferred and not dealt. The shared row The Hydraulic Commonwealth (deferred) is cut on both its sheets, and the pass recommends retiring it too. Cut cards are not listed here.
- **Not listed:** The Public Lectures and The Old Patterns, which the pass names as alternatives, are any-deck cards on `docs/decks/common.md`, not Scientific cards.

| Tier | Implemented | Modify | Add | New | All | Proposed change |
|---|---|---|---|---|---|---|
| Tier 0 | 4 | 0 | 5 | 4 | 13 | 0 |
| Tier I | 1 | 4 | 5 | 8 | 18 | 1 |
| Tier II | 1 | 5 | 7 | 6 | 19 | 3 |
| Tier III | 0 | 3 | 9 | 9 | 21 | 8 |
| Tier IV | 0 | 0 | 17 | 1 | 18 | 0 |
| **All** | **6** | **12** | **43** | **28** | **89** | **12** |
| Shared | 11 | 2 | 2 | 0 | 15 | 1 |

**By type** (the chair a card fits):

| Tier | Military | Economic | Civic | Wildcard | All | Charters among them |
|---|---|---|---|---|---|---|
| Tier 0 | 1 | 2 | 9 | 1 | 13 | 0 |
| Tier I | 1 | 7 | 9 | 1 | 18 | 3 |
| Tier II | 4 | 4 | 10 | 1 | 19 | 4 |
| Tier III | 3 | 6 | 10 | 2 | 21 | 1 |
| Tier IV | 4 | 3 | 8 | 3 | 18 | 3 |
| **All** | **13** | **22** | **46** | **8** | **89** | **11** |
| Shared | 1 | 0 | 14 | 0 | 15 |  |

**Data notes:**
- The Mechanists' Charter is Tier III in the data and Tier II on the sheet.
- Merchant Scholars is Tier I in the data and Tier III on the sheet.
- The Exchange of Discoveries is Tier III in the data. The Commerce sheet has it at Tier I, and the pass recommends Tier I (its question 11).
- None of the eleven charter technologies is in `data/techs.json` yet.

## Tier 0

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Almanac** | common | implemented | Libraries cost 25% less production and give +1 production. | Economic | learned city core |
| **The Scribes' Hall** | common | implemented | Cities with a Library gain +1 science per four citizens and +1 culture per three citizens. | Civic | university |
| **Field Notebooks** | common | implemented | Claiming a ruin grants 15 science, 20 culture and 20 gold. | Civic | glue; research alternative |
| **The Long Study** | uncommon | implemented | A Library at least twenty turns old grants +2 culture and +1 renown. At forty turns, these bonuses become +4 culture and +2 renown. | Civic | learned city core |
| **The Prize Essay** | common | add | Completing a technology before any other empire grants 15 culture and 15 production in your capital. Charter technologies do not count. | Civic | vanguard core |
| **The Prospectors' Notes** | uncommon | add | Finding a buried seam grants 30 science and 15 production. | Civic | arsenal |
| **The Palace Archive** | uncommon | add | You may build a Library in your capital before you know Writing. | Civic | inventors; flex |
| **The Sky Watchers** | common | add | Shrines give +1 faith and +1 science. | Civic | glue |
| **The Tablet House** | common | add | Commission. Have a Library in two cities while this is seated. Reward: 40 culture and 40 production in your capital. Then it leaves its chair. | Wildcard | learned city core, alternative |
| **The Royal Workshops** | common | new | Completing a technology grants 15 production in your capital. | Economic | research |
| **The House of Life** | common | new | Your capital gains +1 culture for every three technologies you know, at most +5. | Civic | research |
| **The Royal Tutors** | common | new | +1 renown a turn for each science building you have, favouring great scholars. | Civic | house of wisdom |
| **The Bronze Casters** | common | new | Units that need a strategic resource cost 25% less production. | Military | arsenal |

## Tier I

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Glassmakers' Charter** (charter) | uncommon | modify: deferred | Charter. Drafting this opens Optics for research. Optics costs more than an ordinary technology of its age. Knowing it lets you build the Observatory before The Astrolabe, needing a Library rather than a University. It opens The Temple Observatory and The Spectacle Makers. | Civic | beside the inventors |
| **The Surveyors' Charter** (charter) | uncommon | add | Charter. Drafting this opens Surveying for research. Knowing it lets you build the Aqueduct before Engineering, and the Qanat: an improvement on flat land that waters the farms beside it with no river or lake nearby. It opens The Field Survey. | Economic | beside the inventors |
| **The Schoolmen's Charter** (charter) | uncommon | add | Charter. Drafting this opens Scholasticism for research. Knowing it lets you build the Cathedral and train the Apostle before Theology. It opens The Religious University. | Civic | beside the inventors; no build of its own (serves Devotion) |
| **The Commonplace Book** | common | add; proposed: moved from Tier 0 | Charter technologies cost you 15% less research. | Civic | vanguard core |
| **The Old Academy** | uncommon | implemented | An Academy at least twenty turns old gains +3 food and +3 production. At forty turns these bonuses become +6 of each. | Economic | house of wisdom |
| **Learned Foundations** (was Learned Commissions) | common | modify: revised | Cities with a Library build empire buildings 25% faster. Completing an empire building of a kind you have not built before grants 40 culture. | Economic | learned city core |
| **The Assay** | common | modify: revised | Gain +2 science for each distinct strategic resource you can access. | Civic | arsenal |
| **The Ordnance Rolls** (was The Strategic Reserves) | common | modify: deferred, revised | Each improved strategic deposit in a city with a Library supplies one more copy. | Economic | arsenal |
| **The Prize Question** | uncommon | add | Commission. Complete three technologies while this is seated; charter technologies do not count. Reward: 150 culture and 100 production in your capital. Then it leaves its chair. | Wildcard | research |
| **The Forward Plans** | rare | add | You may build a University in any city whose Library has stood at least 30 turns, before you know Scholarship. | Civic | university; inventors; flex |
| **The Astronomical Diaries** | uncommon | new | While seated, this card gains +1 culture and +1 production each time you complete a technology. It starts at +2 of each. | Civic | research |
| **The Scholars' Fame** | common | new | Completing a technology grants renown, favouring great scholars, equal to a twentieth of its cost. | Civic | research; bridge to the house of wisdom; flex |
| **The Common Tables** | common | new | Towns gain +2 food for each science building in them. | Economic | university |
| **The Dedications** | uncommon | new | Finishing a science building grants culture equal to ten times the town's population. | Civic | university |
| **The Disciples** | common | new | Each Academy you have gives +2 renown a turn, favouring great scholars. | Civic | house of wisdom |
| **The Secret Arts** | uncommon | new | Each town gains +1 production for each technology you know that no empire you have met knows, at most +5. | Economic | vanguard core |
| **The Mechanicians** | uncommon | new | Finishing a building no other empire has yet built grants that town production equal to twenty times its population. Wonders do not count. | Economic | inventors |
| **The Edge of the Sword** | uncommon | new | Your units gain +3 strength against units of an earlier age. | Military | arsenal |

## Tier II

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Metallurgists' Charter** (charter) | uncommon | modify: deferred | Charter. Drafting this opens Alloys for research. Knowing it lets you train the Crucible Guard, a heavy foot soldier that needs iron and that only empires knowing Alloys can train, and build the Forge before Steel. It opens Crucible Steel. | Military | beside the arsenal |
| **The Naturalists' Charter** (charter) | uncommon | modify: deferred | Charter. Drafting this opens Taxonomy for research. Knowing it gives your worked plantations and pastures +1 food. It opens New Crops. | Economic | beside the inventors; no build of its own (serves Expansionist) |
| **The Mechanists' Charter** (charter) | rare | modify: deferred | Charter. Drafting this opens Mechanics for research. Knowing it lets you train the Trebuchet and the Crossbowman before their technologies. It opens The Siege College and The Engine Works. | Military | beside the arsenal |
| **The Printers' Charter** (charter) | uncommon | add | Charter. Drafting this opens Printing for research. Knowing it lets you build the Printing House before Movable Type and gives +1 trade route. It opens The Presses and The Charter Rolls. | Civic | beside the inventors |
| **The Field Survey** | common | add; proposed: moved from Tier I | Worked farms, mines and quarries in a city with an Aqueduct gain +1 science. | Civic | inventors |
| **The Spectacle Makers** | rare | add | Your Libraries, Universities and Academies count as 10 turns older than they are. | Civic | learned city core; flex |
| **Crucible Steel** | rare | add; proposed: trimmed | Units that need iron or copper gain +4 strength. | Military | arsenal |
| **New Crops** | uncommon | add | Worked plantations gain +1 science and +1 production. Farms beside a plantation gain +1 food. | Economic | glue; inventors |
| **The Siege College** | common | add; proposed: trimmed | Siege units gain +3 strength. | Military | arsenal |
| **Discoveries through Scholars** (was Discoveries through Great People) | rare | modify: deferred, revised | Each great scholar you spend, on an act, an Academy or a legacy, grants science equal to 25% of the cost of the technology you are researching. | Civic | house of wisdom |
| **Enduring Institutions** | uncommon | implemented | A city with an empire building at least twenty turns old gains +2 happiness and +23% production, once per city. | Economic | learned city core |
| **The Quiet Faculties** | rare | modify: revised | Cities working an Academy gain +25% food and +20% production, but produce military units 25% more slowly. | Economic | house of wisdom |
| **The Royal Charter Commission** | uncommon | add | Commission. Complete a charter technology while this is seated. Reward: a great scholar and 100 culture. Then it leaves its chair. | Wildcard | vanguard core |
| **The Natural History** | uncommon | new | +1% production and culture for every two technologies you know, at most +30%. | Civic | research |
| **The Translation Movement** | uncommon | new | Technologies that an empire you have met already knows cost you 20% less research. | Civic | research; flex |
| **The Old Libraries** | uncommon | new | +3% production and culture for each of your towns whose Library has stood forty turns, at most +30%. | Civic | learned city core |
| **The Scholar-Officials** | common | new | +1 authority for each empire building you hold. | Civic | learned city core, alternative |
| **The Roll of Scholars** | uncommon | new | +4% production and culture for each great scholar you have gained this game, at most +30%. | Civic | house of wisdom |
| **The Book of Firsts** | uncommon | new | +2% production and culture for each technology you completed before any other empire, at most +30%. Charter technologies do not count. | Civic | vanguard core |

## Tier III

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Alchemists' Charter** (charter) | uncommon | modify: deferred | Charter. Drafting this opens Chemistry for research. Knowing it lets you train the Fire Lance before Alchemy. Chemistry does not open the Magnum Opus. It opens The Saltpetre Works. | Military | beside the arsenal |
| **The Temple Observatory** | uncommon | add; proposed: moved from Tier I | Cities with both a Temple and an Observatory gain +3 faith and +3 science. | Civic | university |
| **The Religious University** | uncommon | add; proposed: moved from Tier II; proposed: rarity was rare | In each city with a University, one Holy Site counts as an Academy for every card. | Civic | house of wisdom, alternative |
| **The Prototype Works** | rare | add; proposed: moved from Tier IV | You may build the buildings and train the units of the technology you are researching, at double their production cost. Wonders are excepted. | Economic | inventors (capstone); flex |
| **The Engine Works** | uncommon | add; proposed: rarity was rare | Cities with a Workshop gain production equal to 15% of their base science. | Economic | inventors; university |
| **The Presses** | rare | add | You may spend gold to buy research toward the technology you are studying, at 6 gold for each point of science. At most half of a technology's cost may be bought this way. | Civic | vanguard core |
| **The Charter Rolls** | uncommon | add; proposed: rarity was rare | Your capital gains +5 science for each charter you have drafted. | Civic | vanguard core |
| **The Saltpetre Works** | common | add; proposed: reworked; proposed: rarity was uncommon | Units that need niter gain +6 strength. | Military | arsenal |
| **The Second Seat** | rare | modify: deferred | You may build one second copy of an empire building, in a city with a University. | Civic | learned city core |
| **The Long Inheritance** | uncommon | modify: revised; proposed: rarity was rare | Cities working an Academy at least twenty turns old gain +30% production toward empire buildings, wonders and the Magnum Opus. | Economic | house of wisdom |
| **The Collegium** | uncommon | add; proposed: rarity was rare | Commission. Hold a University at least twenty turns old in four cities while this is seated. Reward: a great scholar and 200 culture. Then it leaves its chair. | Wildcard | university |
| **The Lecture Circuit** | common | add | Cities with both a Library and a University gain +1 happiness and +15% production toward buildings. | Economic | university |
| **The Age of Reason** | rare | new | Your Orders count each technology you complete twice. | Wildcard | research (capstone) |
| **The Journeymen** | common | new | Completing a technology grants each town production equal to three times its population. | Economic | research |
| **The Seven Liberal Arts** | common | new | Each town gains +2 culture for each age of which you know every technology. Charter technologies do not count. | Civic | research |
| **The Humanists** | rare | new | Cities with a University gain culture equal to half their base science. | Civic | university (capstone); flex |
| **The Professors** | rare | new | A great scholar that founds an Academy also writes its treatise. | Civic | house of wisdom (capstone) |
| **The Doctorate** | uncommon | new | Gaining a great scholar grants culture equal to eight turns of your culture. | Civic | house of wisdom |
| **The Instrument Makers** | common | new | Buildings of the newest age you know cost 25% less production. | Economic | inventors |
| **The Blast Furnaces** | rare | new | Units still need their strategic resource to be built, but no longer hold a copy of it. | Military | arsenal (capstone) |
| **Greek Fire** | uncommon | new | Gaining a unit that no empire you have met can build grants science and culture equal to its strength. | Civic | arsenal |

## Tier IV

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Hermetic Charter** (charter) | rare | add | Charter. Drafting this opens Hermeticism for research. Hermeticism belongs to the last age and costs more than an ordinary technology there. Knowing it lets you begin researching Alchemy while missing one of its five parent technologies. It opens The Foundation Stone and The Closed Book. | Civic | beside the inventors |
| **The Experimenters' Charter** (charter) | uncommon | add | Charter. Drafting this opens Experimental Philosophy for research. Knowing it lets you build the Laboratory, a building only empires knowing Experimental Philosophy can build: +3 science and +3 production in a city with a University. It opens The Great Experiment and The Prototype Works. | Civic | beside the inventors |
| **The Gunfounders' Charter** (charter) | uncommon | add | Charter. Drafting this opens Gunfounding for research. Knowing it lets you train the Great Gun, a siege unit that needs niter, that only empires knowing Gunfounding can train, and that is the strongest siege unit in the game. It opens The Breaching Batteries. | Military | beside the arsenal |
| **The Great Instrument** | rare | add | Commission. Complete Alchemy while this is seated. Reward: production toward the Magnum Opus equal to a tenth of its cost. Then it leaves its chair. Not dealt to a seat that knows Alchemy. | Wildcard | research |
| **The Great Catalogue** | rare | add | +10% production toward the Magnum Opus for each charter technology you know, at most +40%. | Economic | vanguard core |
| **The Foundation Stone** | rare | add | You may begin the Magnum Opus before any empire knows Alchemy, once you have put half of Alchemy's cost into researching it. It cannot be finished until you know Alchemy, and your rod of beads must still be full to begin it. | Economic | inventors |
| **The Great Experiment** | rare | add | You may pour science into the Magnum Opus as gold and faith can be poured, at 2 science for each point of production. | Economic | research |
| **The Sum of Knowledge** | rare | add | Your capital gains +1 production and +1 culture for each technology you know. | Civic | research; flex |
| **The Invisible College** | rare | add | Each city with a University at least thirty turns old gains +1 production and +1 culture for each other such city you hold, at most +8. | Civic | university; flex |
| **The Proving Ground** | uncommon | add | Your land units gain +1 strength for each charter technology you know, at most +6. | Military | arsenal |
| **The Register of Priority** | uncommon | add | Every city gains +1 culture for each technology you completed before any other empire, at most +8. Charter technologies do not count. | Civic | vanguard core |
| **The Closed Book** | rare | add | If you complete Alchemy before any other empire, empires that do not know Alchemy may not begin the Magnum Opus for 10 turns. | Civic | inventors |
| **The Breaching Batteries** | uncommon | add | Your siege units gain +5 strength against cities. Each hit they land on a city building the Magnum Opus removes 5% of the production banked toward it. | Military | arsenal |
| **The Walls of Learning** | uncommon | add | Cities with a University gain +6 strength, and the city building your Magnum Opus gains +12 more. | Military | learned city core |
| **The Longitude Prize** | rare | add | Commission. Complete three technologies of the last age while this is seated. Reward: a free technology of your choice from those you can research, other than Alchemy. Then it leaves its chair. | Wildcard | research |
| **The Lynx-Eyed Academy** | rare | add | Commission. Hold four Academies while this is seated. Reward: a great scholar, and 300 production in each city with an Academy toward what it is building. Then it leaves its chair. | Wildcard | house of wisdom |
| **The Patent Office** | rare | add | Charter technologies cost you no more research than ordinary technologies at the same point in the tree. | Civic | vanguard core |
| **The Great Treatises** | rare | new | A great scholar's treatise pays twice. | Civic | house of wisdom |

## Shared with another deck

These rows live in `data/decks/common.json` (Books from the Ships and The Blessed Forges have no row yet). A seat holding Scientific or the deck named beside each one may draw it, so a change here is felt in two decks. The pass gives Civic to the ten cards shared with Commerce, Devotion and Magisterial, to confirm when those decks' passes agree (its question 10).

| Card | Also in | Tier | Rarity | Status | Ability | Type |
|---|---|---|---|---|---|---|
| **Illuminated Treatises** | Magisterial | 0 | common | implemented | Cities with both a Library and a Monument gain +1 science and +1 culture. | Civic |
| **Field Academies** | Dominion | I | uncommon | implemented | Your first combat kill each turn grants 23 science. Cities with a Library produce siege units 38% faster. | Civic |
| **Copying the Enemy** | Dominion | I | uncommon | implemented | Your first kill each turn of a unit you cannot yet build grants science toward the technology that unlocks it, equal to 10% of that technology's cost. | Civic |
| **Hydraulic Schools** | Expansionist | I | common | implemented | Cities with an Aqueduct gain +20% production toward science buildings. Those beside a mountain also gain +1 science per three citizens. | Civic |
| **Cloister Schools** | Devotion | I | uncommon | implemented | Cities with both a Temple and a Library gain +5 food and +5 science. | Civic |
| **The Monastery Libraries** | Devotion | I | common | modify: deferred, revised | Libraries give +2 faith. Temples give +2 science. | Civic |
| **The Exchange of Discoveries** | Commerce | I | uncommon | implemented; proposed: moved from Tier III | +2 science on mines and quarries on a resource. Additional +2 if the city has a market. | Civic |
| **The Cloister** | Devotion | II | rare | implemented | Cities with a Temple gain science equal to 30% of their base faith. Their Libraries and Universities each gain +3 food. | Civic |
| **The Merchant Navigators** | Commerce | II | common | implemented | Ships gain +1 movement. Routes from a city with a Harbour and a Library gain +5 science. | Civic |
| **Books from the Ships** | Commerce | II | uncommon | add | Each foreign trade route you send gains +1 science for each technology the destination's owner knows that you do not, at most +4. | Civic |
| **The Blessed Forges** | Devotion | II | uncommon | add | Improved strategic resources gain +1 faith and +1 production. Cities with a Temple gain +2 faith and +2 production more. | Civic |
| **Carried-Off Scholars** | Dominion | II | common | implemented | Capturing a city grants science equal to ten times its population. | Civic |
| **Merchant Scholars** | Commerce | III | uncommon | modify: revised | Foreign routes gain +2 science for every great work improvement in the origin city. | Civic |
| **The Engineer Corps** | Dominion | III | uncommon | implemented | Siege units gain +1 movement. Cities with a Workshop gain +30% production toward siege units and +3 science while at war. | Military |
| **The House of Wisdom** | Magisterial | III | uncommon | implemented | Worked Academies gain +3 culture. Cities working an Academy gain +1 renown and +30% production toward wonders. Each city receives the city bonus once. | Civic |
