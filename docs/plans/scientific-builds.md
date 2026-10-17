# Scientific: the research build, the learned city and the vanguard (proposal)

**Status:** first draft, 2026-10-17. Nothing here is built. The deck sheet (`docs/decks/scientific.md`), the data and the code are unchanged. This is stages 1, 2 and 7 of the card-design skill's deck pass: the map, the finished builds and the card types. The sheet comes after your review. Three other agents run the same pass on Commerce, Devotion and Magisterial at the same time, so the types this file gives the cards Scientific shares with those decks are marked "shared, to reconcile".

The user's request, 2026-10-17, verbatim:

> *"could you do the same builds/card-design skill treatment for the remaining decks? commerce science magisterial and devotion"*

The method is the one you approved for Dominion and Expansionist (`docs/plans/dominion-builds.md`, `docs/plans/expansionist-builds.md`) and the card-design skill's "Finished builds". Each build has one loop on a quantity the playstyle makes by itself, an early and a late version, an early scaler that carries over, a Tier III capstone and a moment. The layout follows the Expansionist one you liked: one build for the deck's core idea, two main builds that each have core cards and flavours, and a section on flexing between them.

## How to read this

- **Chairs:** 3 at the start, 5 from draft 4 (Tier I) and still 5 from draft 10 (Tier II), 8 from draft 18 (Tier III) and 11 from draft 26 (Tier IV) (`tierLadder` in `data/statecraft.json`, after the rung fix and the Tier IV ruling of 2026-10-17).
- **Early build:** Tier 0, I and II cards in five chairs. Each build names its **five-chair council** at the end of Tier I, and the one at the end of Tier II.
- **Late build:** Tier III and IV cards, plus the one or two early cards that grew: eight chairs, then eleven.
- **The learned city and the vanguard** are a core plus a flavour. Early, a council is two core cards and three flavour cards. Late, it is about four of each at eight chairs, and five or six of each at eleven.
- **Status:** *built* (in the game as written), *revised* (in the data, and the sheet changes it), *deferred* (in the data, not dealt), *sheet* (on the sheet as a new card, not in the data yet), **new** (this pass).
- **Shape:** *existing* means the effect vocabulary can say it today. *New shape* names what is missing. The families are under "New shapes, and the cards that use them".
- **Type:** Military, Economic, Civic or Wildcard, by `docs/plans/doctrines-governments-chairs.md` section 4. "The type sort" types every card.
- **Chairs line:** each council names the government that seats most of it. Every government except the Republic has a Military chair, so most Scientific councils lend one or two chairs to the partner deck.
- **Charters take no chair.** They are listed beside a build, not in its chairs.
- **Numbers are first guesses** against `.claude/skills/card-design/references/power-bar.md`. Your priority is shape.

## Six facts that shape every build

1. **How long each tier lasts.** Tier 0 lasts about six drafts, Tier I about five (drafts 4 to 10), Tier II eight or nine (10 to 18) and Tier III about eight (18 to 26) (`docs/plans/draft-pacing-2026-10-17.md`). So an early council holds two Tier 0 cards, three at most.
2. **Capstones sit in Tier III.** Since today Tier IV opens at draft 26, and no bot game has measured that yet.
3. **The taper.** The deck design says science "is probably the strongest yield", so Scientific gets "a few science bonuses", and its strength comes from charters and early access (`docs/decks/deck-design.md`, Scientific). These builds therefore turn science into the other two essentials: each technology, old school and great scholar pays culture and production. Their science comes from the deck's own buildings, Academies, seams and charters.
4. **The tree's shape.** The Library is age 1, Chart the Stars age 2, and the University, Observatory and Printing House age 4. **Age 3 has no science building at all.** So Tier II is when a Scientific seat founds Academies, raises empire buildings (the Forum, the Caravanserai) and builds what its charters opened early. Alchemy, which opens the Magnum Opus, needs five age 4 parents, so the race to it fills age 4.
5. **The deck is Civic, and the Chiefdom has no Civic chair.** 28 of the sheet's 61 cards are Civic by this sort. In the first four drafts the Chiefdom seats one Military, one Economic and one Wildcard card, so every Scientific Civic card competes for the one Wildcard chair. This pass adds Economic and Military openers at Tier 0.
6. **The data lags the sheet.** Of the 40 Scientific rows in `data/decks/scientific.json`, 20 are dealt, and 10 of those 20 are cards the sheet cut. None of the eleven charter technologies exists in `data/techs.json`, and the ×1.5 premium (ruling (qqqqqq) 10) is not in `data/rules.json`. The bot measurements of 2026-10-13 saw five Scientific seats, and Devotion + Scientific was the weakest pair measured (cards paid 1 to 11% of the seat's yield).

## The builds at a glance

| Build | The loop | The moment | Early scaler | Tier III capstone | Tier IV |
|---|---|---|---|---|---|
| **The research build** | complete a technology → it pays culture and production → more drafts and schools → complete the next one sooner | a technology completed | The Astronomical Diaries, The Natural History | The Age of Reason | The Sum of Knowledge, The Great Experiment |
| **The learned city: the university** | grow the school towns → each citizen pays science and culture → the culture drafts and the science opens the next school → grow further | a school founded | The Old Libraries (core) | The Humanists; The Second Seat (core) | The Invisible College |
| **The learned city: the house of wisdom** | the schools call scholars → each scholar founds an Academy or writes a treatise → the Academies call the next scholar | a great scholar called | The Roll of Scholars; The Old Libraries (core) | The Professors | The Great Treatises, The Lynx-Eyed Academy |
| **The vanguard: the inventors** | reach a technology first → raise its building before anyone → the first of its kind pays production → reach the next one first | the world's first of a building | The Secret Arts, The Book of Firsts (core) | The Prototype Works | The Foundation Stone, The Closed Book |
| **The vanguard: the arsenal** | find the metals → arm units no rival can build → they take ground and its seams → find more | a unit gained that no rival can build | The Secret Arts, The Book of Firsts (core) | The Blast Furnaces | The Proving Ground, The Breaching Batteries |

---

## 1. The map

### The deck's materials

"Self-producing" means a Scientific game makes it whether or not a card asks. Those are the best anchors.

| Material | Self-producing? | Where it lives in the sim | On the sheet today |
|---|---|---|---|
| **Technologies completed and known** | Yes: every seat researches, and a Scientific seat researches more | the `tech` windfall occasion (`settleResearch`); `Player.techsResearched`; the world-first ledger `techWorld` (`markFirst`) | The Prize Essay (firsts only), The Prize Question, The Longitude Prize, The Sum of Knowledge, The Register of Priority. No grower, and no count of technologies known |
| **Science buildings** | Yes, but they saturate at one of each in a town | `buildingsOfCategory` (science), `hasBuilding`. A Library pays +0.5 science a citizen, a University +0.75 | The Almanac, The Scribes' Hall, The Lecture Circuit, The Invisible College |
| **A building's age** | Yes: time | `City.buildingTurns`, read by `standingTurns` on `hasBuilding`, `hasEmpireBuilding` and `workingGreatWork` | The Long Study, The Old Academy, Enduring Institutions, The Long Inheritance, The Spectacle Makers, The Invisible College |
| **Empire buildings** | Partly: Chart the Stars, Heroic Epic, Imperial Throne, High Temple, Forum, Caravanserai, Bourse, The Turning Heavens | `oncePerEmpire`; the `empireBuildings` count, the `hasEmpireBuilding` scope, the `empireBuilding` production narrowing | Learned Foundations, Enduring Institutions, The Second Seat |
| **Great scholars and Academies** | Slowly. Each Library gives +1 scholar renown a turn and a University +2; the thresholds are 75, 301, 531, 771 and up | the `greatPersonGained` and `greatPersonAct` occasions with a family; the `greatPeopleGained` count. An Academy is +3 science on a worked hex, and the act ("Write a Treatise") pays eight turns of science | The Old Academy, The Quiet Faculties, Discoveries through Scholars, The Long Inheritance, The Collegium, The Lynx-Eyed Academy, The House of Wisdom (shared) |
| **Charters and charter technologies** | No: only when drafted | `CharterSpec.unlocks.tech`, `Player.charteredTechs`, the research gate (`researchError`). The eleven technologies and the premium are not in the data | eleven charters; The Commonplace Book, The Royal Charter Commission, The Charter Rolls, The Great Catalogue, The Proving Ground, The Patent Office |
| **Early access** | No: a card or a charter grants it | `unlocksBuilding` and a building row's `unlockedByCard` ("a card is a way in early", `isUnlocked` in `tech.ts`) | The Palace Archive, The Forward Plans, The Prototype Works, The Foundation Stone |
| **Being ahead** (technologies only you know) | Yes, for a fast researcher | nothing reads other empires' technologies yet | The Closed Book; the shared Books from the Ships needs the same reading |
| **Strategic resources** | From the map: copper, obsidian, horses, camels, iron, ivory, niter | `uniqueStrategicResources`, `improvedStrategicResources`, the `veinFound` occasion. Each living unit holds a copy (`resolveCommitments` in `cities.ts`) | The Prospectors' Notes, The Assay, The Ordnance Rolls, Crucible Steel, The Saltpetre Works |
| **The Magnum Opus** | The end of every game | Alchemy (8,000 science, five parents) opens it; the `raisingOpus` scope | The Great Instrument, The Great Catalogue, The Hermetic Charter, The Foundation Stone, The Great Experiment, The Closed Book |

### What a Scientific player wants in each age

`references/age-goals.md` has no Scientific section yet. It is written here for your review.
- **Age 1 (Tier 0): start the clocks.** Raise a Library in the first towns early, because its age, its renown and its citizens' science all start then. Call the first great person, and make enough culture for the first government.
- **Age 2 (Tier I): choose a road.** Research broadly, or build schools and call scholars, or draft a charter and race its private technology. Chart the Stars and the first Academy arrive.
- **Age 3 (Tier II): the gap.** There is no science building to raise, so a Scientific seat founds Academies, raises empire buildings and builds what its charters opened early. The school towns grow.
- **Age 4 (Tiers III and IV): the race.** Universities, Observatories and Printing Houses; the five parents of Alchemy; the Opus; the last age's weapons.

### The five builds and the two cores

Each row is a section below, and the sources are its cards (the tier is in brackets).

| Build | Leans on | Science from | Culture from | Production from |
|---|---|---|---|---|
| **The research build** | technologies completed and known | research itself; scholar renown for each technology (The Scholars' Fame, I) | technologies known (The House of Life, 0; The Natural History, II; The Sum of Knowledge, IV); finished ages (The Seven Liberal Arts, III); the grower (The Astronomical Diaries, I) | technologies completed (The Royal Workshops, 0; The Journeymen, III); the grower; The Natural History; the Opus (The Great Experiment, IV) |
| **Learned city: the core** | Libraries, their age, empire buildings | the Libraries themselves | old Libraries (The Long Study, 0; The Old Libraries, II) | cheap Libraries (The Almanac, 0); the great houses (Learned Foundations, I; Enduring Institutions, II); The Old Libraries |
| **Learned city: the university** | citizens in school towns | citizens (The Scribes' Hall, 0; Hydraulic Schools, I); a University an age early (The Forward Plans, I) | citizens (The Scribes' Hall); a school founded (The Dedications, I); science paid again as culture (The Humanists, III) | food for the school towns (The Common Tables, I); The Lecture Circuit (III); The Engine Works (III) |
| **Learned city: the house of wisdom** | great scholars, Academies | Academies; treatises (Discoveries through Scholars, II; The Professors, III; The Great Treatises, IV) | a scholar called (The Doctorate, III); The House of Wisdom (shared, III) | old Academies (The Old Academy, I); The Quiet Faculties (II); The Roll of Scholars (II); The Long Inheritance (III) |
| **Vanguard: the core** | being first, technologies only you know, charters | charters (The Charter Rolls, III); gold bought into research (The Presses, III) | firsts (The Prize Essay, 0; The Book of Firsts, II; The Register of Priority, IV) | the lead (The Secret Arts, I); The Book of Firsts; the Opus (The Great Catalogue, IV) |
| **Vanguard: the inventors** | buildings before their age | early schools (The Palace Archive, 0; The Forward Plans, I; the Glassmakers' Charter, I); The Field Survey (II) | the core's | world firsts (The Mechanicians, I); cheaper new buildings (The Instrument Makers, III); The Prototype Works (III); the Opus early (The Foundation Stone, IV) |
| **Vanguard: the arsenal** | strategic resources, units ahead of their age | seams (The Prospectors' Notes, 0); kinds (The Assay, I); kills (Field Academies and Copying the Enemy, shared, I); units no rival can build (Greek Fire, III) | Greek Fire; the core's | cheaper metal units (The Bronze Casters, 0); seams (The Prospectors' Notes); the core's |

### How the deck pairs with the other five

The currency test (`deck-design.md`): Scientific makes science and spends it on charter technologies.
- **Dominion** (no leader holds both): the military edge.
  - Scientific gives units before their age (the Metallurgists', Mechanists', Alchemists' and Gunfounders' charters) and the strength to use them (The Edge of the Sword, Crucible Steel).
  - Dominion gives science from fighting, and captured schools. A captured Library keeps its age, so The Long Study pays at once (`docs/decks/review/systems.md`).
  - Best with the arsenal. Shared: Field Academies, Copying the Enemy, Carried-Off Scholars, The Engineer Corps.
- **Expansionist** (Nezahualcoyotl): the engineers.
  - Expansionist gives big towns and mountains (Hydraulic Schools; the Observatory's second +10% with a mountain in its borders).
  - Scientific gives early public works (the Surveyors' Charter's Aqueduct and Qanat) and science on worked land (The Field Survey). It is the pair that covers a gap most directly.
  - Best with the university and the inventors. Shared: Hydraulic Schools.
- **Commerce** (no leader holds both): the patrons.
  - Commerce gives gold, which buys schools and research (The Presses), and foreign routes that pay science (Books from the Ships, Merchant Scholars, The Merchant Navigators).
  - Scientific gives trade unlocks early (the Printers' Charter).
  - Best with the vanguard (gold buys the lead) and the research build (Books from the Ships pays a seat that is catching up). Shared: Merchant Scholars, The Merchant Navigators, Books from the Ships, The Exchange of Discoveries.
- **Devotion** (Al-Ma'mun): scholars of the faith.
  - Devotion gives faith that buys science buildings (The Monastic Builders) and temples that teach (Cloister Schools, The Cloister).
  - Scientific gives religious unlocks early (the Schoolmen's Charter), and Academies for holy sites to stand beside (Devotion's The Monastic University, and The Religious University).
  - Best with the university and the house of wisdom. Shared: Cloister Schools, The Monastery Libraries, The Cloister, The Blessed Forges.
- **Magisterial** (Hypatia): the academy.
  - Magisterial reads charters as drafts (The Accessions Register, The Court Painter) and Academies as works (The House of Wisdom, The Quarter of Masters).
  - Scientific gives scholars and charters.
  - Best with the house of wisdom, and with the vanguard (more drafts show more charters). Shared: Illuminated Treatises, The House of Wisdom.

### Leaders

- **Hypatia** (Scientific, Magisterial): +25% renown; a great person's work pays half again; her Museion pays +1 science for each great person called. She leads the house of wisdom: more scholars, and Academies at +4.5 science.
- **Al-Ma'mun** (Devotion, Scientific): +1 science for every fifth point of faith; +2 food for each faith or science building in a town; his House of Learning pays +1 science for each great person called. He leads the university (his food for each school stacks with The Common Tables, which does the same job) and the house of wisdom.
- **Nezahualcoyotl** (Expansionist, Scientific): Aqueduct towns pay culture and their farms production; the capital pays culture for every two citizens. He leads the university (big Aqueduct towns, Hydraulic Schools) and the inventors' public works (the Surveyors' Charter).
- **No leader points at the research build, the inventors or the arsenal.** The arsenal's natural leader would hold Dominion and Scientific; the inventors' would hold Scientific with Commerce or Expansionist. Leaders are tuned later; this is the gap to fill.

### Where the sheet is thin

- **The deck's own moment has almost no cards.** A technology completed is the most frequent thing a Scientific seat does. Only The Prize Essay (firsts only) and three commissions pay on it, and nothing counts technologies known before Tier IV.
- **Nothing early carries into the late game** except a building's age. The first "this game" counts are The Charter Rolls (III), The Sum of Knowledge (IV) and The Register of Priority (IV).
- **Raisers and readers:** many cards read science buildings, which saturate at one of each in a town. Scholars have one live reader (The Old Academy), and nothing raises scholar renown early.
- **Cards that are dead in their own tier.** Each needs a building its age does not have, so it works only with a charter, against the ruling that no card depends on a charter technology:
  - The Temple Observatory (I) needs an Observatory (age 4);
  - The Field Survey (I) needs an Aqueduct (age 3);
  - The Religious University (II) needs a University (age 4);
  - the second clauses of Crucible Steel and The Siege College (II) need a Forge and a University (age 4);
  - The Commonplace Book (0) pays nothing until a charter is drafted at Tier I.
- **The rule-breakers are late:** The Second Seat (III), then The Prototype Works, The Foundation Stone and The Closed Book (IV). Only The Forward Plans (I) is early, and every one needs a new shape.
- **Types:** 28 of 61 cards are Civic. Tier 0 has one Economic card (The Almanac). Tiers 0 and I have no Military card, and the first seatable ones are Crucible Steel and The Siege College at Tier II.
- **Rarities:** Tier 0 has no rare, and Tier IV no common.
- **Essentials:** production is thin and late: The Almanac, then Enduring Institutions and The Quiet Faculties at Tier II. Culture is fair early (The Scribes' Hall, The Long Study, The Prize Essay).
- **The data:** see fact 6. Today a Scientific seat is dealt mostly cards the sheet cut.
- **What the reviewers found** (`docs/decks/review/experience.md`, 2026-10-06):
  - the identity arrives late and by chance: charters open at Tier I, and about half of Scientific seats see none in their first five Tier I hands;
  - the maturity cards ask nothing of the player once seated;
  - The Old Academy needs an Academy, which few seats have between turns 40 and 60.
- **Your play:** your one logged win was a tall science game (Nezahualcoyotl, the Opus on turn 164, `docs/playtest_notes.md`). On 2026-10-17 you reported reaching age 3 in science while still drafting Tier I, which the rung fix answered.

---

## 2. The research build: every discovery pays

**The fantasy.** The Babylonian astronomers who kept a diary of the sky for six centuries, Pliny's Natural History, the medieval schools' seven liberal arts. An empire that wants to know everything, and turns each discovery into culture and works.

**The loop:** complete a technology → it pays culture and production → the culture opens drafts and the production raises the next school → complete the next technology sooner.
- **The quantity:** technologies known, which never falls; and technologies completed while a card is seated (the grower).
- **The moment:** a technology completed (the `tech` occasion, live).
- **What it spends:** depth. A broad researcher fills in the cheap technologies others skip, so it reaches each new age later and is first to less.

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Royal Workshops | 0 | common | Completing a technology grants 15 production in your capital. | opener | reads technologies completed | production | Economic | **new**; existing (a `tech` rider) |
| The House of Life | 0 | common | Your capital gains +1 culture for every three technologies you know, at most +5. | opener | reads technologies known | culture | Civic | **new**; new shape (a count of technologies known) |
| The Astronomical Diaries | I | uncommon | While seated, this card gains +1 culture and +1 production each time you complete a technology. It starts at +2 of each. | early scaler: the grower | reads technologies completed | culture, production | Civic | **new**; new shape (a tally of technologies completed) |
| The Scholars' Fame | I | common | Completing a technology grants renown, favouring great scholars, equal to a twentieth of its cost. | bridge to the house of wisdom | reads technologies completed; raises scholars | renown | Civic | **new**; new shape, small (the technology's cost as the moment's measure) |
| The Prize Question | I | uncommon | Commission. Complete three technologies while this is seated; charter technologies do not count. Reward: 150 culture and 100 production in your capital. Then it leaves its chair. | a goal | reads technologies completed | culture, production | Wildcard | sheet; new shape (the tally above as a commission goal) |
| The Natural History | II | uncommon | +1% production and culture for every two technologies you know, at most +30%. | early scaler: a "this game" count | reads technologies known | production, culture | Civic | **new**; new shape (the count of technologies known) |
| The Translation Movement | II | uncommon | Technologies that an empire you have met already knows cost you 20% less research. | changes what the player researches | raises technologies completed | science | Civic | **new**; new shape (a research cost line that reads what other empires know) |

- **Five-chair council (Tier I):** The Royal Workshops, The House of Life, The Astronomical Diaries, The Scholars' Fame, The Prize Question. The Priest-King seats four of them; its Military chair goes to the partner.
- **Five-chair council (Tier II):** The Astronomical Diaries, The Natural History, The Translation Movement, The Scholars' Fame, and The House of Life at its +5. The Theocracy seats four (three Civic chairs and the Wildcard chair). The Royal Workshops has faded by then and leaves.
- **Sizing:**
  - **The Royal Workshops:** a Scientific seat completes an age 1 technology about every four turns, so about +4 production a turn in age 1 (seat production is about 11), +3 in age 2 and little after. It is band 0's regular card, and it fades on time.
  - **The House of Life:** +2 culture by turn 30 and +5 by turn 65, when the seat makes 3 to 9 culture a turn. Early culture is worth about three times its face.
  - **The Astronomical Diaries:** seated about turn 57 with about 13 technologies known. About +9 culture and +9 production by turn 90, +12 by turn 114, +24 by turn 160 and +30 by turn 200.
  - **The Natural History:** about +10% when Tier II opens (20 technologies), +17% by turn 160 and +20% by turn 200. In age 4 that is about 150 production and culture a turn.
  - **The Scholars' Fame:** an age 3 technology (360 to 1,150 science) pays 18 to 57 renown, about as much again as the seat's Libraries make.
  - **The Translation Movement:** if a met empire already knows half the seat's technologies, it saves about a tenth of its research. A leader saves little; a broad or trailing seat saves most.
- **How a few turns feel:**
  - Turn 18: Bronzeworking completes, and the capital gains 15 production toward its Monument. The House of Life reads +1.
  - Turn 70: you go back for Sailing and Pottery, two cheap technologies you had skipped. Each feeds the Diaries and pays a little renown.
  - Turn 110: 22 technologies known. The Natural History reads +11%, the Diaries are at +11 of each, and The Translation Movement takes a fifth off the technologies your neighbours found first.
- **Alternatives:** Field Notebooks (0); The Prize Essay (0, the vanguard's); Copying the Enemy (shared, I: a kill pays toward the technology of the unit killed); Books from the Ships (shared, II: foreign routes pay for what the partner knows that you do not).

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Natural History | II | uncommon | (above) | carried scaler | reads technologies known | production, culture | Civic | **new** |
| The Astronomical Diaries | I | uncommon | (above) | carried grower | reads technologies completed | culture, production | Civic | **new** |
| The Age of Reason | III | rare | Your Orders count each technology you complete twice. | capstone: doubles a category | reads technologies completed | doubles every Order's pay for a technology | Wildcard | **new**; new shape (the moment repeated for Orders, as Double Time repeats turn effects) |
| The Journeymen | III | common | Completing a technology grants each town production equal to three times its population. | the moment | reads technologies completed | production | Economic | **new**; new shape, small (each town's own population as the grant) |
| The Seven Liberal Arts | III | common | Each town gains +2 culture for each age of which you know every technology. Charter technologies do not count. | pay-off: breadth | reads finished ages | culture | Civic | **new**; new shape, small (a count of finished ages) |
| The Sum of Knowledge | IV | rare | Your capital gains +1 production and +1 culture for each technology you know. | finisher: flats | reads technologies known | production, culture | Civic | sheet; new shape (the count of technologies known) |
| The Great Experiment | IV | rare | You may pour science into the Magnum Opus as gold and faith can be poured, at 2 science for each point of production. | finisher: the win | spends science | production toward the Opus | Economic | sheet; new shape (science as a contribution currency) |
| The Longitude Prize | IV | rare | Commission. Complete three technologies of the last age while this is seated. Reward: a free technology of your choice from those you can research, other than Alchemy. Then it leaves its chair. | a goal | reads technologies completed | a technology | Wildcard | sheet; new shape (the tally with an age floor; a chosen free technology) |
| The Great Instrument | IV | rare | Commission. Complete Alchemy while this is seated. Reward: production toward the Magnum Opus equal to a tenth of its cost. Then it leaves its chair. Not dealt to a seat that knows Alchemy. | a goal: the win | reads Alchemy | production toward the Opus | Wildcard | sheet; new shape (a goal on one technology; a deal gate) |

- **The research build, Tier III (8):** The Natural History, The Astronomical Diaries, The Age of Reason, The Journeymen, The Seven Liberal Arts, and The Scholars' Fame still in its chair; two partner chairs. Divine Mandate seats all six.
- **The research build, Tier IV (11):** The Natural History, The Astronomical Diaries, The Age of Reason, The Journeymen, The Seven Liberal Arts, The Sum of Knowledge, The Great Experiment, The Longitude Prize, The Great Instrument; two partner chairs. The Curia seats all nine (four Civic, two Economic, three Wildcard), and its two Military chairs go to the partner.
- **Carried over:** The Natural History at +17% to +20%, and The Astronomical Diaries at about +25 of each.
- **The capstone, The Age of Reason:** your Orders hear each technology twice. The Diaries gain +2 of each, The Journeymen and The Scholars' Fame pay twice, and a commission counts two. It is a Wildcard because it acts on other cards (the Vae Victis shape, one moment over).
- **The moment, The Journeymen:** each technology sends production to every town at once.
- **Sizing:**
  - **The Journeymen:** ten towns of about twelve citizens gain 360 production for each technology, which comes every five to ten turns in age 4: about 50 a turn, and twice that under The Age of Reason. A cheap old technology pays the same, which is the build's reason to go back for them; each one completes once.
  - **The Seven Liberal Arts:** a broad seat that has finished ages 1 to 3 gains +6 culture in each of ten towns: 60 a turn.
  - **The Sum of Knowledge:** 35 to 40 technologies give the capital +35 to +40 production and culture, raised by The Natural History's +20%.
- **How a few turns feel:**
  - Turn 152: The Age of Reason is seated. Machinery completes: every town gains six times its population in production, and the Diaries gain +2 of each.
  - Turn 170: you fill in Horology, the last technology of the Age of Empire that you had skipped. Every town gains +2 culture.
  - Turn 195 (Tier IV): Alchemy is known. The Great Experiment turns 600 science a turn into 300 production for the Opus.
- **Without Tier IV,** The Scholars' Fame and The Translation Movement hold the chairs, and the build keeps its capstone.
- **Alternatives:** the common The Public Lectures (IV: 50 culture for each technology); The Register of Priority (the vanguard's); The Engine Works (the inventors').

- **Utility mix:** culture (The House of Life, the Diaries, The Natural History, The Seven Liberal Arts, The Sum of Knowledge); production (The Royal Workshops, The Journeymen, The Natural History, The Great Experiment); renown (The Scholars' Fame); cheaper research (The Translation Movement).
- **Gives up:** depth and tempo. It is first to little, so the vanguard's firsts pay it little, and its new buildings arrive in their own age.
- **Partners:** Commerce (gold, and foreign routes that pay for what partners know), Magisterial (its culture drafts more), Devotion (The Cloister turns faith into science).
- **Leader:** none of its own. Hypatia's renown suits The Scholars' Fame.

---

## 3. The learned city: patience

**The fantasy.** Nalanda, the Library of Alexandria, al-Qarawiyyin, Bologna. Schools founded early, kept for centuries, and better every decade. There are two ways to be a learned city: **the university** grows big school towns whose citizens all study, and **the house of wisdom** calls great scholars and keeps their Academies.

**The loop:** raise a Library in every town early → the schools grow old → old schools pay culture and production → the production raises the next school and the culture drafts the next card → the schools grow older still.
- **The quantity:** science buildings, and how long they have stood.
- **The moment:** a school comes of age, at twenty and forty turns. The game announces it (ruling (qqqqqq) 15).
- **What it spends:** tempo. A school pays little until it is old, and a town founded late is a poor school.

### The core

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Almanac | 0 | common | Libraries cost 25% less production and give +1 production. | opener | raises Libraries | production | Economic | built |
| The Long Study | 0 | uncommon | A Library at least twenty turns old grants +2 culture and +1 renown. At forty turns, these bonuses become +4 culture and +2 renown. | opener: age | reads old Libraries | culture, renown | Civic | built |
| Learned Foundations | I | common | Cities with a Library build empire buildings 25% faster. Completing an empire building of a kind you have not built before grants 40 culture. | engine: the great houses | raises empire buildings | production, culture | Economic | revised (built as Learned Commissions); existing |
| The Old Libraries | II | uncommon | +3% production and culture for each of your towns whose Library has stood forty turns, at most +30%. | early scaler | reads old Libraries | production, culture | Civic | **new**; existing (empire `pays` count `citiesAdmitted`, with `hasBuilding` and `standingTurns`) |
| The Spectacle Makers | II | rare | Your Libraries, Universities and Academies count as 10 turns older than they are. | the flex: patience bought | raises building age | every age card's pay | Civic | sheet; new shape (an age offset where an age is compared) |
| Enduring Institutions | II | uncommon | A city with an empire building at least twenty turns old gains +2 happiness and +23% production, once per city. | pay-off | reads old great houses | production | Economic | built |

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Old Libraries | II | uncommon | (above) | carried scaler | reads old Libraries | production, culture | Civic | **new** |
| The Second Seat | III | rare | You may build one second copy of an empire building, in a city with a University. | the core's rule-breaker | raises empire buildings | what the second house pays | Civic | deferred; new shape (a second copy of an empire building) |
| The Walls of Learning | IV | uncommon | Cities with a University gain +6 strength, and the city building your Magnum Opus gains +12 more. | defends the Opus | reads Universities | defence | Military | sheet; new shape (the test for "the city building the Opus") |

- **Sizing:**
  - **The Old Libraries:** Libraries raised from turn 30 to 70 reach forty turns from turn 70 to 110. About +9% when Tier II opens, and +27% by turn 160.
  - **The Second Seat:** a second Forum is +10% science and culture in a second big town; a second Heroic Epic is +50% renown there.
- **Alternatives:** The Tablet House (0: a goal for the first two Libraries); **The Scholar-Officials** (**new**, Tier II, common, Civic: *"+1 authority for each empire building you hold"*, existing shape). It is the deck's one authority card, which the Commerce-pass ruling of 2026-10-07 allows ("Authority is not Expansionist's alone").

### The university

**The fantasy.** Bologna and Paris, the Museum of Alexandria, the Nalanda that housed thousands. The town that thinks: big towns whose citizens all study, and whose schools open one after another.
- **The loop:** grow the school towns → each citizen pays science and culture → the culture drafts and the science opens the next school → grow further.
- **The moment:** a school founded (The Dedications).
- **The capstone:** The Humanists. Half of each University town's science is paid again as culture.

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Scribes' Hall | 0 | common | Cities with a Library gain +1 science per four citizens and +1 culture per three citizens. | opener | reads citizens in Library towns | science, culture | Civic | built |
| The Common Tables | I | common | Towns gain +2 food for each science building in them. | engine: grows the school towns | raises citizens | food | Economic | **new**; existing (town `pays` count `buildingsOfCategory`, science, `within: 'city'`) |
| The Dedications | I | uncommon | Finishing a science building grants culture equal to ten times the town's population. | the moment | reads schools founded | culture | Civic | **new**; existing (a `buildingCompletion` rider on the science shelf, scaled by population) |
| Hydraulic Schools | I | common | Cities with an Aqueduct gain +20% production toward science buildings. Those beside a mountain also gain +1 science per three citizens. | pay-off | reads citizens by mountains | science | Civic | built (shared with Expansionist) |
| The Forward Plans | I | rare | You may build a University in any city whose Library has stood at least 30 turns, before you know Scholarship. | changes what the player builds | raises Universities | science | Civic | sheet; new shape (early access with a town test) |

- **A university town, Tier I (5):** The Almanac, The Long Study; The Scribes' Hall, The Common Tables, The Dedications. The Council of Elders seats four (two Economic chairs, one Civic, one Wildcard).
- **A university town, Tier II (5):** The Old Libraries, The Long Study; The Scribes' Hall, The Common Tables, and Hydraulic Schools or The Forward Plans. The Theocracy seats four. The Republic seats three, and fills its two other Economic chairs with Enduring Institutions and The Almanac.
- **Sizing:**
  - **The Common Tables:** +2 food in each Library town at Tier I (about +12 in six towns), and +8 in a town with four schools in age 4. Al-Ma'mun's ability pays the same again.
  - **The Dedications:** a Library in a town of five pays 50 culture; a University in a town of fourteen pays 140. A seat founds about twenty-five schools a game.
  - **The Forward Plans:** a Library raised on turn 25 lets its town start a University on turn 55, an age early: +0.75 science a citizen and +2 scholar renown a turn, at a large building's price.
- **How a few turns feel:**
  - Turn 25: cheap Libraries go up in the first three towns, and The Long Study's clocks start.
  - Turn 62: Chart the Stars opens in the capital. The Dedications pays 80 culture, and the capital's two schools feed it +4 food.
  - Turn 95: the first three Libraries are past forty turns, and The Old Libraries reads +9%. The capital starts its University an age early (The Forward Plans).

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Dedications | I | uncommon | (above) | carried: every University, Observatory and Printing House pays it | reads schools founded | culture | Civic | **new** |
| The Humanists | III | rare | Cities with a University gain culture equal to half their base science. | capstone: science paid again as culture | reads science in University towns | culture | Civic | **new**; existing (town `pays` share from science to culture, scoped to a University) |
| The Lecture Circuit | III | common | Cities with both a Library and a University gain +1 happiness and +15% production toward buildings. | pay-off | reads Universities | production | Economic | sheet; existing |
| The Collegium | III | uncommon (proposed; rare on the sheet) | Commission. Hold a University at least twenty turns old in four cities while this is seated. Reward: a great scholar and 200 culture. Then it leaves its chair. | a goal | reads old Universities | a scholar, culture | Wildcard | sheet; new shape (a reached figure: towns with an old building) |
| The Temple Observatory | III (from I) | uncommon | Cities with both a Temple and an Observatory gain +3 faith and +3 science. | the Devotion pair | reads Observatories | faith, science | Civic | sheet; existing |
| The Invisible College | IV | rare | Each city with a University at least thirty turns old gains +1 production and +1 culture for each other such city you hold, at most +8. | finisher | reads old Universities | production, culture | Civic | sheet; existing (`citiesAdmitted` with `standingTurns`) |

- **A university town, Tier III (8):** The Old Libraries, The Second Seat; The Dedications, The Humanists, The Lecture Circuit, The Collegium; two partner chairs. Divine Mandate seats all six.
- **A university town, Tier IV (11):** The Old Libraries, The Second Seat, The Walls of Learning; The Dedications, The Humanists, The Lecture Circuit, The Collegium, The Temple Observatory, The Invisible College, and the inventors' The Engine Works; one partner chair. The Curia seats ten.
- **Carried over:** The Old Libraries at +27% to +30%, and The Dedications, which pays for every University, Observatory and Printing House of age 4.
- **The capstone, The Humanists:** the science the big towns make is paid again, half, as culture. It is a pay-off, not a broken rule; the core's rule-breaker is The Second Seat, which every learned city can seat.
- **Sizing:**
  - **The Humanists:** eight University towns with about 30 base science each gain about 120 culture a turn: band 3's headline.
  - **The Invisible College:** five old Universities pay each other +4 production and +4 culture each, about +40 a turn in all.
- **How a few turns feel:**
  - Turn 150: Scholarship. Universities open in four towns, and each pays The Dedications 120 to 140 culture.
  - Turn 165: The Second Seat raises a second Forum in the University town.
  - Turn 185: The Humanists turn half of each University town's science into culture, and the drafts come faster.
- **Alternatives:** Illuminated Treatises (shared, 0); Cloister Schools and The Cloister (Devotion); The Scholar-Officials (core).

### The house of wisdom

**The fantasy.** Baghdad's House of Wisdom, the Museum's salaried scholars, the examination halls of Song China. A realm that calls great scholars and keeps them: each founds an Academy or writes a treatise, and the Academies teach the next.
- **The loop:** the schools call scholars → each scholar founds an Academy or writes a treatise → the Academies call the next scholar.
- **The quantity:** great scholars gained this game (`greatPeopleGained` with the scholar family), and Academies standing.
- **The moment:** a great scholar called (The Doctorate).
- **The capstone:** The Professors. A scholar that founds an Academy also writes its treatise.

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Royal Tutors | 0 | common | +1 renown a turn for each science building you have, favouring great scholars. | opener | raises scholars | renown | Civic | **new**; existing (`renown` per science building, scholar family) |
| The Old Academy | I | uncommon | An Academy at least twenty turns old gains +3 food and +3 production. At forty turns these bonuses become +6 of each. | pay-off: age | reads old Academies | food, production | Economic | built |
| The Disciples | I | common | Each Academy you have gives +2 renown a turn, favouring great scholars. | engine: Academies call scholars | reads Academies; raises scholars | renown | Civic | **new**; existing (`renown` count `tilesInBorders` on an Academy) |
| The Roll of Scholars | II | uncommon | +4% production and culture for each great scholar you have gained this game, at most +30%. | early scaler | reads scholars gained this game | production, culture | Civic | **new**; existing (empire `pays` count `greatPeopleGained`, scholar family) |
| Discoveries through Scholars | II | rare | Each great scholar you spend, on an act, an Academy or a legacy, grants science equal to 25% of the cost of the technology you are researching. | changes when the player spends a scholar | reads scholars spent | science | Civic | revised (deferred in the data); new shape (a share of the current research's cost) |
| The Quiet Faculties | II | rare | Cities working an Academy gain +25% food and +20% production, but produce military units 25% more slowly. | pay-off with a drawback | reads Academies worked | food, production | Economic | revised (built for any great work); existing |

- **A house of wisdom, Tier I (5):** The Almanac, The Long Study; The Royal Tutors, The Old Academy, The Disciples. The Priest-King seats four.
- **A house of wisdom, Tier II (5):** The Old Libraries, The Long Study; The Roll of Scholars, Discoveries through Scholars, and The Old Academy or The Quiet Faculties. The Theocracy seats four.
- **Sizing:**
  - **The Royal Tutors:** three Libraries by turn 40 double their scholar renown, so the first scholar comes about ten turns sooner.
  - **The Disciples:** two Academies by turn 80 give +4 renown a turn; five by turn 160 give +10.
  - **The Roll of Scholars:** a seat that calls scholars on purpose has two or three when Tier II opens (+8 to +12%), and five or six by turn 160 (+20 to +24%).
  - **Discoveries through Scholars:** a scholar spent during a 650-science technology adds 162 science, on top of the treatise's eight turns.
- **How a few turns feel:**
  - Turn 38: Kidinnu arrives and founds an Academy beside the capital.
  - Turn 60: the Academy is twenty turns old: +3 food and +3 production on its hex, and The Disciples add +2 renown a turn.
  - Turn 110: the third scholar writes a treatise while Mathematics (650 science) is researched, and Discoveries through Scholars adds a quarter of its cost.

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Roll of Scholars | II | uncommon | (above) | carried scaler | reads scholars gained | production, culture | Civic | **new** |
| The Professors | III | rare | A great scholar that founds an Academy also writes its treatise. | capstone: a broken rule | reads scholars spent | science | Civic | **new**; new shape (a work that also fires its act) |
| The Doctorate | III | uncommon | Gaining a great scholar grants culture equal to eight turns of your culture. | the moment | reads scholars gained | culture | Civic | **new**; existing (a `greatPersonGained` rider, scholar family, eight turns of the culture rate) |
| The Long Inheritance | III | uncommon (proposed; rare on the sheet) | Cities working an Academy at least twenty turns old gain +30% production toward empire buildings, wonders and the Magnum Opus. | pay-off: the great works | reads old Academies | production | Economic | revised; existing |
| The House of Wisdom | III | uncommon | Worked Academies gain +3 culture. Cities working an Academy gain +1 renown and +30% production toward wonders. Each city receives the city bonus once. | pay-off | reads Academies | culture, renown | Civic | built (shared with Magisterial) |
| The Great Treatises | IV | rare | A great scholar's treatise pays twice. | finisher | reads treatises | science | Civic | **new**; existing (`effectAmplifier` on the act, scholar family) |
| The Lynx-Eyed Academy | IV | rare | Commission. Hold four Academies while this is seated. Reward: a great scholar, and 300 production in each city with an Academy toward what it is building. Then it leaves its chair. | a goal | reads Academies | a scholar, production | Wildcard | sheet; new shape (a reached figure: Academies held; production into each such town) |

- **A house of wisdom, Tier III (8):** The Old Libraries, The Second Seat; The Roll of Scholars, The Professors, The Doctorate, The Long Inheritance; two partner chairs. Divine Mandate seats all six, with The Long Inheritance in its Economic chair.
- **A house of wisdom, Tier IV (11):** The Old Libraries, The Second Seat, The Walls of Learning; The Roll of Scholars, The Professors, The Doctorate, The Long Inheritance, The Great Treatises, The Lynx-Eyed Academy, and The Old Academy (still in its chair at +6); one partner chair. The Curia seats ten.
- **Carried over:** The Old Libraries; The Roll of Scholars at +20% to +28%; and The Old Academy, which pays +6 food and +6 production on every Academy forty turns old.
- **The capstone, The Professors:** a scholar is two great people at once, an Academy for good and a treatise now. With The Great Treatises, the treatise pays sixteen turns of science.
- **The moment, The Doctorate:** each scholar called brings about a draft's worth of culture.
- **Sizing:**
  - **The Professors:** a seat making 400 science a turn writes a 3,200-science treatise with every Academy it founds. One scholar every fifteen turns is about +210 science a turn: band 3's headline.
  - **The Doctorate:** eight turns of about 90 culture is 720 culture, about the cost of the twentieth draft.
- **How a few turns feel:**
  - Turn 150: Archimedes founds an Academy on the capital's iron hill (it opens the seam) and writes his treatise in the same turn.
  - Turn 165: the sixth scholar arrives. The Doctorate pays 700 culture, and a draft opens.
  - Turn 190 (Tier IV): the treatises pay twice, and The Lynx-Eyed Academy's goal pays 300 production into four towns.
- **Alternatives:** The Quiet Faculties (II); The House of Wisdom (shared, III); The Religious University (III, moved from II: one Holy Site per University town counts as an Academy; Devotion); The Scholars' Fame (the research build's); Merchant Scholars (Commerce, III, if it is narrowed to Academies as the sheet asks).

### The learned city as a whole

- **Utility mix:** science from citizens, schools, Academies and treatises; culture from old Libraries, schools founded, scholars called and The Humanists; production from cheap Libraries, the great houses, old Academies and The Old Libraries; renown from The Royal Tutors, The Disciples and The Long Study; authority from The Scholar-Officials.
- **Gives up:** tempo, width and an army. A school pays little until it is old, and a late town is a poor school. Its Military chairs go to the partner.
- **Partners:** Expansionist (big towns, for the university), Devotion (temples that teach, for both flavours), Magisterial (Academies as works, for the house of wisdom).
- **Leaders:** Hypatia (the house of wisdom), Al-Ma'mun (both flavours), Nezahualcoyotl (the university).

---

## 4. The vanguard: speed

**The fantasy.** The guilds that kept their craft secret, the Greek fire that saved Constantinople, the first patents of the Italian cities. Things before their age, or things nobody else can have. There are two ways to be ahead: **the inventors** raise buildings before any rival, and **the arsenal** fields weapons no rival can build.

**The loop:** reach a technology before the others, by racing or by charter → the lead pays → spend it to reach the next one first.
- **The quantity:** technologies you know that no empire you have met knows (the lead); technologies you completed before any other empire (firsts); charters drafted.
- **The moment:** a technology completed first.
- **What it spends:** breadth. A racer skips the cheap technologies, so its schools are young and the research build's counts pay it little.

### The core

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Prize Essay | 0 | common | Completing a technology before any other empire grants 15 culture and 15 production in your capital. Charter technologies do not count. | opener | reads firsts | culture, production | Civic | sheet; existing (a `tech` rider with `first: 'techWorld'`), plus new shape, small (the charter exclusion) |
| The Secret Arts | I | uncommon | Each town gains +1 production for each technology you know that no empire you have met knows, at most +5. | engine: the lead | reads the lead | production | Economic | **new**; new shape (a count of technologies only you know) |
| The Commonplace Book | I (from 0) | common | Charter technologies cost you 15% less research. | engine: the charters | reads charters | science | Civic | sheet; new shape (the charter premium read through a card) |
| The Book of Firsts | II | uncommon | +2% production and culture for each technology you completed before any other empire, at most +30%. Charter technologies do not count. | early scaler | reads firsts this game | production, culture | Civic | **new**; new shape, small (a count of the `techWorld` ledger) |
| The Royal Charter Commission | II | uncommon | Commission. Complete a charter technology while this is seated. Reward: a great scholar and 100 culture. Then it leaves its chair. | a goal | reads charter technologies | a scholar, culture | Wildcard | sheet; new shape (a tally of charter technologies) |

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Secret Arts | I | uncommon | (above) | carried | reads the lead | production | Economic | **new** |
| The Book of Firsts | II | uncommon | (above) | carried scaler | reads firsts | production, culture | Civic | **new** |
| The Charter Rolls | III | uncommon (proposed; rare on the sheet) | Your capital gains +5 science for each charter you have drafted. | pay-off | reads charters | science | Civic | sheet; new shape (a count of charters drafted) |
| The Presses | III | rare | You may spend gold to buy research toward the technology you are studying, at 6 gold for each point of science. At most half of a technology's cost may be bought this way. | a new action | raises firsts | science | Civic | sheet; new shape (a gold-for-research purchase) |
| The Register of Priority | IV | uncommon | Every city gains +1 culture for each technology you completed before any other empire, at most +8. Charter technologies do not count. | finisher | reads firsts | culture | Civic | sheet; new shape (the count of firsts) |
| The Patent Office | IV | rare | Charter technologies cost you no more research than ordinary technologies at the same point in the tree. | finisher | reads charters | science | Civic | sheet; new shape (the charter premium) |
| The Great Catalogue | IV | rare | +10% production toward the Magnum Opus for each charter technology you know, at most +40%. | finisher: the win | reads charter technologies | production toward the Opus | Economic | sheet; new shape (a count of charter technologies known) |

- **Sizing:**
  - **The Secret Arts:** one to three technologies of lead in age 2 give +1 to +3 production in each of six towns. In age 4, with private charter technologies, four or five give +4 or +5 in each of twelve towns: up to 60 a turn. It falls when the rivals catch up.
  - **The Book of Firsts:** a racer is first to about six technologies when Tier II opens (+12%), and to fifteen by turn 160 (+30%).
- **Alternatives:** The Translation Movement is the research build's catch-up card, and the one a racer that has fallen behind should take.

### The inventors

**The fantasy.** The mechanicians of Alexandria, the Song engineers, the instrument makers of the late Middle Ages. Build what nobody else knows how to build.
- **The loop:** reach a technology first → raise its building before anyone → the first of its kind pays production → reach the next one first.
- **The quantity:** buildings you finished before any other empire (a new world ledger, beside the one for technologies).
- **The moment:** the world's first of a building (The Mechanicians).
- **The capstone:** The Prototype Works. You may build what the technology you are researching opens, at double cost.

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Palace Archive | 0 | uncommon | You may build a Library in your capital before you know Writing. | opener: early access | raises firsts | science | Civic | sheet; new shape (early access with a town test) |
| The Mechanicians | I | uncommon | Finishing a building no other empire has yet built grants that town production equal to twenty times its population. Wonders do not count. | the moment | reads world firsts | production | Economic | **new**; new shape, small (a world-first ledger for buildings) |
| The Forward Plans | I | rare | (the university's) | changes what the player builds | raises Universities early | science | Civic | sheet |
| New Crops | II | uncommon | Worked plantations gain +1 science and +1 production. Farms beside a plantation gain +1 food. | pay-off for the Naturalists' Charter | reads plantations | production, food | Economic | sheet; existing |
| The Field Survey | II (from I) | common | Worked farms, mines and quarries in a city with an Aqueduct gain +1 science. | pay-off for the Surveyors' Charter | reads Aqueduct towns | science | Civic | sheet; existing |

Charters beside it: the Glassmakers' (I: the Observatory early), the Surveyors' (I: the Aqueduct and the Qanat early), the Schoolmen's (I: the Cathedral and the Apostle early), the Printers' (II: the Printing House early, and one more trade route) and the Naturalists' (II).

- **The inventors, Tier I (5):** The Prize Essay, The Secret Arts; The Palace Archive, The Mechanicians, The Forward Plans. The Council of Elders seats four.
- **The inventors, Tier II (5):** The Secret Arts, The Book of Firsts; The Mechanicians, The Forward Plans, New Crops. The Republic seats all five.
- **Sizing:**
  - **The Mechanicians:** the world's first University, raised in age 2 or 3 through The Forward Plans in a capital of ten, pays 200 production into the next build. A racer takes about ten world firsts a game.
  - **The Palace Archive:** a Library ten to fifteen turns before Writing, so The Long Study's twenty turns come sooner too.
- **How a few turns feel:**
  - Turn 12: the capital raises a Library before Writing.
  - Turn 58: The Forward Plans is drafted. The capital's Library is forty-six turns old, so the capital starts a University in age 2.
  - Turn 84: the University is the world's first. The Mechanicians pay 200 production, and the Glassmakers' Optics is half researched.

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Prototype Works | III (from IV) | rare | You may build the buildings and train the units of the technology you are researching, at double their production cost. Wonders are excepted. | capstone: a broken rule | raises world firsts | construction ahead of research | Economic | sheet; new shape (early access to the current research, with a cost line) |
| The Instrument Makers | III | common | Buildings of the newest age you know cost 25% less production. | pay-off | raises world firsts | production | Economic | **new**; new shape, small (an age filter on buildings; the common The Old Patterns needs the same) |
| The Engine Works | III | uncommon (proposed; rare on the sheet) | Cities with a Workshop gain production equal to 15% of their base science. | pay-off: applied knowledge | reads science | production | Economic | sheet; existing (`pays` share) |
| The Foundation Stone | IV | rare | You may begin the Magnum Opus before any empire knows Alchemy, once you have put half of Alchemy's cost into researching it. It cannot be finished until you know Alchemy, and your rod of beads must still be full to begin it. | finisher: the Opus early | raises the Opus | the Opus | Economic | sheet; new shape (an Opus door that opens for one seat) |
| The Closed Book | IV | rare | If you complete Alchemy before any other empire, empires that do not know Alchemy may not begin the Magnum Opus for 10 turns. | finisher: denial | reads the first to Alchemy | holds rivals back | Civic | sheet; new shape (a delay on the Opus door for each seat) |

Charters beside it: the Hermetic (IV: research Alchemy while missing one parent) and the Experimenters' (IV: the Laboratory).

- **The inventors, Tier III (8):** The Secret Arts, The Book of Firsts, The Charter Rolls, The Presses; The Prototype Works, The Instrument Makers, The Engine Works; one partner chair. The Merchant League seats seven.
- **The inventors, Tier IV (11):** The Secret Arts, The Book of Firsts, The Charter Rolls, The Patent Office; The Prototype Works, The Instrument Makers, The Engine Works, The Foundation Stone, The Closed Book; two partner chairs. The Estates seat nine.
- **The capstone, The Prototype Works:** the build's whole fantasy at full size. While Machinery is researched, the town is already training Crossbowmen; while The Astrolabe is researched, its Observatory goes up. Production is the price, and production is the deck's gap.
- **The moment:** every building finished first still pays The Mechanicians while it is seated. The late moment is The Foundation Stone: the Opus begun before anyone knows Alchemy.
- **Sizing:**
  - **The Prototype Works:** a building or unit five to fifteen turns before its technology lands, at twice the hammers, and each such building is a world first.
  - **The Instrument Makers:** age 4 buildings cost 300 to 600 hammers, so a quarter off saves about a hundred on each.
- **How a few turns feel:**
  - Turn 150: while Movable Type is researched, the capital starts its Printing House at double cost.
  - Turn 170: the newest buildings cost a quarter less, and three towns raise Universities in three turns.
  - Turn 185 (Tier IV): the Opus is begun with half of Alchemy researched. When Alchemy lands first, rivals may not begin theirs for ten turns.
- **Alternatives:** The Mechanicians (carried, if the firsts keep coming); The Spectacle Makers (core of the learned city).

### The arsenal

**The fantasy.** The Hittite smiths, the Greek fire of Constantinople, the Song fire lances, the great guns of 1453. The metals found first, and weapons nobody else can make.
- **The loop:** find the metals → arm units no rival can build → they take ground and its seams → find more.
- **The quantity:** strategic resources (kinds and seams), and units ahead of their age.
- **The moment:** a unit gained that no rival can build (Greek Fire).
- **The capstone:** The Blast Furnaces. Units still need their strategic resource to be built, but no longer hold a copy of it.

**Early:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Bronze Casters | 0 | common | Units that need a strategic resource cost 25% less production. | opener | raises metal units | production toward units | Military | **new**; new shape, small (a unit filter: needs a strategic resource) |
| The Prospectors' Notes | 0 | uncommon | Finding a buried seam grants 30 science and 15 production. | opener | raises seams | science, production | Civic | sheet; existing (a `veinFound` rider) |
| The Assay | I | common | Gain +2 science for each distinct strategic resource you can access. | pay-off | reads strategic kinds | science | Civic | revised (built as +3 science and +3 gold); existing |
| The Edge of the Sword | I | uncommon | Your units gain +3 strength against units of an earlier age. | changes how fights go | reads the lead | combat | Military | **new**; new shape (a combat condition that compares the two units' ages) |
| The Ordnance Rolls | I | common | Each improved strategic deposit in a city with a Library supplies one more copy. | engine | raises copies | copies | Economic | revised (deferred in the data); new shape (a copy step on strategic rows, narrowed to Library towns) |
| Crucible Steel | II | rare | Units that need iron or copper gain +4 strength. | pay-off | reads metal units | combat | Military | sheet, trimmed (proposed: the Forge clause goes); new shape (the unit filter) |
| The Siege College | II | common | Siege units gain +3 strength. | pay-off | reads siege units | combat | Military | sheet, trimmed (proposed: the University clause goes); existing |

Charters beside it: the Metallurgists' (II: the Crucible Guard, and the Forge early) and the Mechanists' (II: the Trebuchet and the Crossbowman an age early).

- **The arsenal, Tier I (5):** The Prize Essay, The Secret Arts; The Bronze Casters, The Edge of the Sword, The Assay. The War Chief seats all five.
- **The arsenal, Tier II (5):** The Secret Arts, The Book of Firsts; The Edge of the Sword, Crucible Steel, The Siege College. Tyranny seats all five.
- **Sizing:**
  - **The Bronze Casters:** a War Chariot at 38 hammers instead of 51; a Legionary at 61 instead of 81; a Longswordsman at 255 instead of 340.
  - **The Edge of the Sword:** +3 is band 1's regular combat line, about 10% of an age 2 unit. Swordsmen meet barbarian Warriors at +3, and a Trebuchet from the Mechanists' Charter meets every age 3 defender at +3.
  - **The Prospectors' Notes:** a seam pays 30 science, about a turn of age 2 science.
- **How a few turns feel:**
  - Turn 22: a worker prospects a hill and finds copper: 30 science and 15 production.
  - Turn 75: Swordsmen at three quarters of the price meet barbarian Warriors at +3.
  - Turn 110: the Mechanists' Charter brings Trebuchets an age early, and the Legionaries beside them fight at +4.

**Late:**

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Blast Furnaces | III | rare | Units still need their strategic resource to be built, but no longer hold a copy of it. | capstone: a broken rule | raises metal units | an army from one seam | Military | **new**; new shape (a rule in `resolveCommitments`) |
| Greek Fire | III | uncommon | Gaining a unit that no empire you have met can build grants science and culture equal to its strength. | the moment | reads the lead | science, culture | Civic | **new**; new shape (a unit-gained filter: no met empire knows its technology) |
| The Saltpetre Works | III | common (proposed; uncommon on the sheet) | Units that need niter gain +6 strength. | pay-off | reads gunpowder units | combat | Military | sheet, reworked (was: they cost 20% less production, which is now The Bronze Casters' job); new shape (the unit filter) |
| The Engineer Corps | III | uncommon | Siege units gain +1 movement. Cities with a Workshop gain +30% production toward siege units and +3 science while at war. | engine | raises siege | movement, production toward units | Military | built (shared with Dominion) |
| The Proving Ground | IV | uncommon | Your land units gain +1 strength for each charter technology you know, at most +6. | pay-off | reads charter technologies | combat | Military | sheet; new shape (the count of charter technologies) |
| The Breaching Batteries | IV | uncommon | Your siege units gain +5 strength against cities. Each hit they land on a city building the Magnum Opus removes 5% of the production banked toward it. | finisher: denies the Opus | reads siege units | combat, denial | Military | sheet; new shape (the Opus-town test; a hit that removes banked production) |

Charters beside it: the Alchemists' (III: the Fire Lance before Alchemy) and the Gunfounders' (IV: the Great Gun).

- **The arsenal, Tier III (8):** The Secret Arts, The Book of Firsts, The Charter Rolls; The Blast Furnaces, Greek Fire, The Saltpetre Works, The Engineer Corps; one partner chair. Imperium seats seven.
- **The arsenal, Tier IV (11):** The Secret Arts, The Book of Firsts, The Charter Rolls, The Register of Priority, The Great Catalogue; The Blast Furnaces, Greek Fire, The Saltpetre Works, The Engineer Corps, The Proving Ground, The Breaching Batteries. The Sultanate seats all eleven.
- **Carried over:** The Secret Arts, at +4 or +5 in each town while the lead holds, and The Book of Firsts at about +30%.
- **The capstone, The Blast Furnaces:** an empire with one iron mine fields as many Longswordsmen as its towns can build. It breaks the rule strategic resources rest on: one copy for each living unit.
- **The moment, Greek Fire:** each unit gained that no met empire can build (a charter's unit, or one whose technology only you know) pays its strength in science and culture.
- **Sizing:**
  - **Greek Fire:** a Fire Lance (about 80 strength) gained before any rival knows Alchemy pays about 80 science and 80 culture. A unit every two or three turns while ahead is about 30 of each a turn.
  - **The Saltpetre Works:** +6 is band 3's regular combat line.
- **How a few turns feel:**
  - Turn 150: twelve Longswordsmen march from one iron mine.
  - Turn 165: the Alchemists' Charter brings Fire Lances before Alchemy, and each one gained pays its strength in science and culture.
  - Turn 190 (Tier IV): Trebuchets strike the rival's Opus town at +5, and each hit removes 5% of its banked production.
- **Alternatives:** The Edge of the Sword (carried, while the age gap holds); Field Academies and Copying the Enemy (Dominion, I); Carried-Off Scholars (Dominion, II); The Blessed Forges (Devotion, II); The Walls of Learning (core of the learned city).

### The vanguard as a whole

- **Utility mix:** production from the lead (The Secret Arts), world firsts (The Mechanicians) and cheaper new buildings; culture from firsts (The Prize Essay, The Book of Firsts, The Register of Priority) and Greek Fire; science from charters, seams and The Presses; combat from the arsenal.
- **Gives up:** breadth and patience. Its schools are young, its counts of technologies known lag, and The Secret Arts falls when rivals catch up.
- **Partners:** Dominion (the arsenal), Commerce (gold buys the lead through The Presses), Magisterial (more drafts show more charters), Expansionist (the Surveyors' public works).
- **Leaders:** none points at it (see "Leaders").

---

## 5. Flexing between patience and speed

The deck has two ways to spend its science: wait for its schools to grow old, or race to be first. These cards reward a switch.

| Card | Tier | Rarity | Text | The flex | Type | Status, shape |
|---|---|---|---|---|---|---|
| The Palace Archive | 0 | uncommon | You may build a Library in your capital before you know Writing. | speed → patience: the oldest Library in the world | Civic | sheet |
| The Forward Plans | I | rare | You may build a University in any city whose Library has stood at least 30 turns, before you know Scholarship. | patience → speed: an old school opens a University an age early | Civic | sheet |
| The Scholars' Fame | I | common | (the research build's) | breadth → scholars: every technology calls scholars | Civic | **new** |
| The Spectacle Makers | II | rare | Your Libraries, Universities and Academies count as 10 turns older than they are. | speed → patience: age bought | Civic | sheet |
| The Translation Movement | II | uncommon | (the research build's) | speed → breadth: a racer fills in what it skipped, cheaply | Civic | **new** |
| The Prototype Works | III | rare | (the inventors') | patience → speed: the old University towns build what is still being researched | Economic | sheet |

**How a flex plays out over a game:**
- **Age 1 (Tier 0):** The Palace Archive and The Almanac start the Libraries early, and The Royal Workshops pays for each technology.
- **Age 2 (Tier I):** the capital's Library is thirty turns old, and The Forward Plans starts a University an age early. The first charter is drafted.
- **Age 3 (Tier II):** The Spectacle Makers makes every school ten turns older, so The Old Libraries and The Old Academy pay at once. The Translation Movement fills in the technologies the race skipped.
- **Age 4 (Tiers III and IV):** The Prototype Works builds ahead of research in the University towns, and The Humanists pays for their science.
- **A flexing council, late (11):** The Old Libraries and The Book of Firsts (carried); The Second Seat, The Humanists, The Prototype Works, The Instrument Makers, The Age of Reason, The Journeymen; The Invisible College, The Foundation Stone, The Sum of Knowledge. It holds six Civic, four Economic and one Wildcard card, so The Curia and The Estates each seat nine of them, and the Military chairs go to the partner.
- **What a flex gives up:** neither the lead nor the schools' age is at its best, and a council split between them is never as deep as a pure one.

---

## Across the builds

### The checks

- **One loop:** each chair above raises the build's quantity, reads it, or pays an essential from it. Cards that do not are named as alternatives or glue.
- **Better together:** the scalers multiply the flats.
  - The Natural History's +20% raises the flats of The Sum of Knowledge and the Diaries.
  - The Old Libraries' +27% raises The Long Study's culture and The Old Academy's production.
  - The Age of Reason doubles The Journeymen, The Scholars' Fame and the Diaries' growth.
  - The Professors and The Great Treatises together turn each scholar into an Academy and sixteen turns of science.
- **The build beats a pile:** the strongest Scientific cards seated alone are flats and single percentages (The Humanists, The Invisible College, The Sum of Knowledge, The Natural History). A council of eleven such cards has no grower fed by its own moment, no scaler that raises its own flats, and no capstone. Each late build has a scaler that raises its own flats, and a capstone that doubles a category (The Age of Reason, and late The Great Treatises) or breaks a rule (The Second Seat, The Professors, The Prototype Works, The Blast Furnaces).
- **Several routes:** any two of a build's core cards turn it on. The research build's moment comes by itself; the learned city's clocks start with any Library; the vanguard's lead comes from a race or from any charter. No build depends on one card.
- **A scaler carries over:** The Natural History and the Diaries; The Old Libraries; The Roll of Scholars; The Secret Arts and The Book of Firsts.
- **The essentials along the way:** in both versions of every build (the table in section 1).
- **Pay-offs have their set-ups:** each reader has three or more raisers at or before its tier in a Scientific seat's pool. The scholar readers (The Roll of Scholars, The Doctorate) have The Royal Tutors, The Disciples, The Scholars' Fame, The Long Study and every Library; Greek Fire has the three military charters before it and any race; The Mechanicians has The Palace Archive, The Forward Plans, the three Tier I charters and any race.
- **Every card has a home:** see "Sheet cards no build uses" for the glue.
- **Usefulness falls with the band:** Tier 0 is openers, two for each build; Tiers I and II mix openers and engines; Tiers III and IV are pay-offs and capstones that do little alone (The Age of Reason, The Professors, The Blast Furnaces, The Prototype Works).
- **Glue is a minority:** three exclusive cards are glue (Field Notebooks, The Sky Watchers, New Crops), plus five shared ones.

### Bridges and pivots

- **The research build feeds the house of wisdom** (The Scholars' Fame: each technology pays scholar renown) and **the vanguard** (The Translation Movement lets a racer fill in its gaps).
- **The learned city's two flavours share their clocks:** every Library makes scholar renown and ages for The Long Study and The Old Libraries, and The Second Seat and The Walls of Learning serve both.
- **The vanguard's two flavours share the lead:** The Secret Arts, The Book of Firsts and the charters serve both. A charter's units go to the arsenal and its buildings to the inventors.
- **Across the two families:** The Palace Archive, The Forward Plans, The Spectacle Makers and The Prototype Works (section 5).
- **An Academy opens the seam it covers** (`docs/great-people.md`), so the house of wisdom can supply the arsenal's iron.
- **The pivots this opens:**
  - research → vanguard when the seat finds itself ahead;
  - vanguard → research when a rival passes it (The Translation Movement);
  - university ↔ house of wisdom through the shared schools;
  - inventors ↔ arsenal through the charters.

### New shapes, and the cards that use them

**The count:** 28 new cards. 11 use shapes that exist, and 17 need a new shape. Most of the sheet's own cards need shapes too (the charters, early access, the commissions). Each family reads a mechanic the game already has.

1. **The research record.** The `tech` moment exists; what is missing is a record of it.
   - a count of technologies known: The House of Life, The Natural History, and the sheet's The Sum of Knowledge;
   - a tally of technologies completed while seated: The Astronomical Diaries, and as a commission goal the sheet's The Prize Question and The Longitude Prize (with an age floor);
   - the technology's cost as the moment's measure: The Scholars' Fame;
   - a count of finished ages: The Seven Liberal Arts;
   - each town's own population as the grant: The Journeymen;
   - the moment repeated for Orders: The Age of Reason (Double Time's shape, on one occasion).
2. **Firsts.** The world ledger for technologies exists (`techWorld`).
   - a count of it: The Book of Firsts, and the sheet's The Register of Priority;
   - "charter technologies do not count" on the rider and on the count: The Prize Essay and the two above;
   - a world ledger for buildings: The Mechanicians.
3. **What other empires know:**
   - technologies no met empire knows: The Secret Arts;
   - technologies a met empire knows: The Translation Movement, and the shared Books from the Ships;
   - a unit no met empire can build: Greek Fire;
   - the two units' ages compared in a fight: The Edge of the Sword.
4. **Research cost lines:** The Translation Movement, and the sheet's The Commonplace Book and The Patent Office (the charter premium read through a card).
5. **Strategic resources by unit:**
   - a unit filter, "needs a strategic resource" or a named one: The Bronze Casters, and the sheet's Crucible Steel and The Saltpetre Works;
   - a unit that holds no copy: The Blast Furnaces.
6. **The charter technologies themselves:** eleven tree rows, the ×1.5 premium in `data/rules.json`, and counts of charters drafted and charter technologies known (the sheet's The Charter Rolls, The Great Catalogue, The Proving Ground and The Royal Charter Commission).
7. **Early access** (the sheet's cards): an ordinary building opened early with a town test (The Palace Archive, The Forward Plans); the rows of the current research (The Prototype Works); the Opus door (The Foundation Stone, The Closed Book); science poured into the Opus (The Great Experiment).
8. **One card each:** a work that also fires its act (The Professors); an age filter on buildings (The Instrument Makers, which the common The Old Patterns also needs).

Where to cut if you want less engine work: The Translation Movement, The Edge of the Sword, The Instrument Makers and Greek Fire.

### Sheet changes this pass proposes

- **Moves:**
  - The Commonplace Book, Tier 0 → I: it pays nothing until the first charter, which is Tier I.
  - The Field Survey, Tier I → II: it needs an Aqueduct (age 3).
  - The Temple Observatory, Tier I → III: it needs an Observatory (age 4).
  - The Religious University, Tier II → III: it needs a University (age 4).
  - The Prototype Works, Tier IV → III: it is the inventors' capstone, and capstones sit in Tier III.
- **Trims to one effect:** Crucible Steel loses its Forge clause, and The Siege College its University clause. Both clauses need an age 4 building at Tier II.
- **Rework:** The Saltpetre Works becomes "Units that need niter gain +6 strength", because The Bronze Casters now makes metal units cheaper.
- **Rarities at Tier III:** with this pass the tier would hold 12 rares and 2 commons, so the common share of each hand would fall on the same two cards. Proposed:
  - to uncommon: The Charter Rolls, The Engine Works, The Long Inheritance, The Collegium and The Religious University;
  - to common: The Saltpetre Works (the new The Journeymen and The Seven Liberal Arts are common already);
  - rare stays: the five capstones (The Age of Reason, The Humanists, The Professors, The Prototype Works, The Blast Furnaces), The Second Seat and The Presses.
- **The sheet's long form:** its list "Shared cards for the user to rule on" is out of date. The Engineer Corps is built and on Dominion's sheet as Military. Merchant Scholars' narrowing to Academies is still open, on the Commerce pass.

### Sheet cards no build uses

- **Glue, kept:**
  - Field Notebooks (0): the deck's one light exploration card, as the deck design allows.
  - The Sky Watchers (0): the deck's early faith, which every deck carries (the ruling of 2026-10-07).
  - New Crops (II): the card behind the Naturalists' Charter, and the inventors' alternative.
- **Shared glue:** The Merchant Navigators and Merchant Scholars (Commerce), The Monastery Libraries (Devotion).
- **Charters with no Scientific build:** the Schoolmen's and the Naturalists' serve their partner decks (Devotion and Expansionist), as the sheet intends.

### Notes on the data

- **Ten live rows the sheet cut are dealt today:** Practical Astronomy, Working Estates, The Endowed Provinces, The Royal Society, The Learned Chancery, The Academy Quarter, The Patent Rolls, Master Artificers, The Society of Artificers and The Learned Realm. Question 9 recommends retiring them.
- **Six rows carry old text** that the sheet revised: Learned Commissions (now Learned Foundations), The Assay (+3 science and +3 gold), The Strategic Reserves (now The Ordnance Rolls), Discoveries through Great People (now through Scholars), and The Quiet Faculties and The Long Inheritance (which read any great work).
- **Tiers that disagree:**
  - the Mechanists' Charter is band 3 in the data and Tier II on the sheet;
  - Merchant Scholars is band 1 in `data/decks/common.json` and Tier III on both sheets since your move of 2026-10-07;
  - The Exchange of Discoveries is band 3 in the data and Tier I on the Commerce sheet. At Tier I it is the Commerce · Scientific pair's early shared card, which ruling (qqqqqq) 14 requires (question 11).
- **The Hydraulic Commonwealth** (`common.json`, deferred) still names Scientific and Expansionist, and both sheets cut it. Retire the row, as the Expansionist builds also said.
- **The Monastery Libraries** is deferred in the data with its old text (Monasteries); both sheets revised it to Temples.

---

## The type sort

Every card on the sheet (the 61 Scientific cards and the 15 in its shared table) and the 28 new cards, by the rules of `docs/plans/doctrines-governments-chairs.md` section 4. A card is typed by what it pays or does, not by what it reads. A mixed card takes the type of the half that pays more, and even halves with a Civic half go Civic. Charters and commissions are typed for their faces. A card's tier here is the sheet's, with this pass's moves in brackets.

### The sheet's cards

| Card | Tier | Status | Type | Why |
|---|---|---|---|---|
| The Almanac | 0 | built | Economic | production, and cheaper Libraries |
| The Scribes' Hall | 0 | built | Civic | science and culture |
| Field Notebooks | 0 | built | Civic | science and culture outweigh the gold |
| The Long Study | 0 | built | Civic | culture and renown |
| The Prize Essay | 0 | sheet | Civic | even culture and production, one of them Civic |
| The Prospectors' Notes | 0 | sheet | Civic | 30 science outweighs 15 production |
| The Palace Archive | 0 | sheet | Civic | opens a science building early (close call) |
| The Commonplace Book | 0 (→ I) | sheet | Civic | research cost: science |
| The Sky Watchers | 0 | sheet | Civic | faith and science |
| The Tablet House | 0 | sheet | Wildcard | commission |
| The Glassmakers' Charter | I | deferred, charter | Civic | opens the Observatory: science |
| The Surveyors' Charter | I | sheet, charter | Economic | opens the Aqueduct and the Qanat: food and growth |
| The Schoolmen's Charter | I | sheet, charter | Civic | opens the Cathedral and the Apostle: faith |
| The Temple Observatory | I (→ III) | sheet | Civic | faith and science |
| The Field Survey | I (→ II) | sheet | Civic | science |
| The Old Academy | I | built | Economic | food and production |
| Learned Foundations | I | revised | Economic | production toward empire buildings outweighs a 40-culture lump (close call) |
| The Assay | I | revised | Civic | science |
| The Ordnance Rolls | I | revised | Economic | strategic copies are resources, as Dominion's The Quartermasters is Economic (close call: copies arm units) |
| The Prize Question | I | sheet | Wildcard | commission |
| The Forward Plans | I | sheet | Civic | opens a University early: science (close call) |
| The Metallurgists' Charter | II | deferred, charter | Military | opens a unit, and the Forge |
| The Naturalists' Charter | II | deferred, charter | Economic | food on plantations and pastures |
| The Mechanists' Charter | II | deferred, charter | Military | opens two units early |
| The Printers' Charter | II | sheet, charter | Civic | opens the Printing House (science and culture); the extra trade route pays gold |
| The Spectacle Makers | II | sheet | Civic | the age of science buildings and Academies |
| The Religious University | II (→ III) | sheet | Civic | Academies: science |
| Crucible Steel | II | sheet | Military | strength |
| New Crops | II | sheet | Economic | production and food outweigh +1 science (close call) |
| The Siege College | II | sheet | Military | strength |
| Discoveries through Scholars | II | revised | Civic | science and great people |
| Enduring Institutions | II | built | Economic | +23% production outweighs +2 happiness |
| The Quiet Faculties | II | revised | Economic | food and production |
| The Royal Charter Commission | II | sheet | Wildcard | commission |
| The Alchemists' Charter | III | deferred, charter | Military | opens a unit early |
| The Engine Works | III | sheet | Economic | production |
| The Presses | III | sheet | Civic | buys science |
| The Charter Rolls | III | sheet | Civic | science |
| The Saltpetre Works | III | sheet | Military | production toward units as written; strength as reworked |
| The Second Seat | III | deferred | Civic | the great houses pay mostly culture, science, renown and authority (close call) |
| The Long Inheritance | III | revised | Economic | production toward great works |
| The Collegium | III | sheet | Wildcard | commission |
| The Lecture Circuit | III | sheet | Economic | +15% production toward buildings outweighs +1 happiness |
| The Great Instrument | IV | sheet | Wildcard | commission |
| The Great Catalogue | IV | sheet | Economic | production toward the Opus |
| The Hermetic Charter | IV | sheet, charter | Civic | research: Alchemy early |
| The Experimenters' Charter | IV | sheet, charter | Civic | the Laboratory's even science and production |
| The Gunfounders' Charter | IV | sheet, charter | Military | opens a unit |
| The Foundation Stone | IV | sheet | Economic | construction: the Opus begun early |
| The Great Experiment | IV | sheet | Economic | production toward the Opus, bought with science |
| The Sum of Knowledge | IV | sheet | Civic | even production and culture |
| The Invisible College | IV | sheet | Civic | even production and culture |
| The Proving Ground | IV | sheet | Military | strength |
| The Register of Priority | IV | sheet | Civic | culture |
| The Closed Book | IV | sheet | Civic | the race to the Opus; it pays nothing and holds rivals back (close call) |
| The Breaching Batteries | IV | sheet | Military | strength and siege |
| The Walls of Learning | IV | sheet | Military | city strength |
| The Longitude Prize | IV | sheet | Wildcard | commission |
| The Lynx-Eyed Academy | IV | sheet | Wildcard | commission |
| The Patent Office | IV | sheet | Civic | research cost |
| The Prototype Works | IV (→ III) | sheet | Economic | construction ahead of research (close call: it also trains units) |

### The shared cards

The type of a card shared with Dominion or Expansionist stands as their sheets have it. A card shared with Commerce, Devotion or Magisterial has a proposed type, to reconcile with those decks' passes, which run now.

| Card | Also in | Tier | Status | Type | Why |
|---|---|---|---|---|---|
| Illuminated Treatises | Magisterial | 0 | built | Civic | even science and culture. Shared, to reconcile |
| Field Academies | Dominion | I | built | Civic | stands |
| Copying the Enemy | Dominion | I | built | Civic | stands |
| Hydraulic Schools | Expansionist | I | built | Civic | stands (final since 2026-10-16) |
| Cloister Schools | Devotion | I | built | Civic | even food and science. Shared, to reconcile |
| The Monastery Libraries | Devotion | I | revised (deferred in the data) | Civic | faith and science. Shared, to reconcile |
| The Exchange of Discoveries | Commerce | I (Commerce sheet; III in the data) | built | Civic | science. Shared, to reconcile |
| The Cloister | Devotion | II | built | Civic | science from faith; the food on schools can be larger, which would make it Economic (close call). Shared, to reconcile |
| The Merchant Navigators | Commerce | II | built | Civic | route science outweighs ship movement (close call). Shared, to reconcile |
| Books from the Ships | Commerce | II | sheet | Civic | science. Shared, to reconcile |
| The Blessed Forges | Devotion | II | sheet | Civic | even faith and production. Shared, to reconcile |
| Carried-Off Scholars | Dominion | II | built | Civic | stands |
| Merchant Scholars | Commerce | III (band 1 in the data) | revised | Civic | science. Shared, to reconcile |
| The Engineer Corps | Dominion | III | built | Military | stands |
| The House of Wisdom | Magisterial | III | built | Civic | culture and renown outweigh production toward wonders. Shared, to reconcile |

### The new cards

| Card | Tier | Rarity | Type | Build |
|---|---|---|---|---|
| The Royal Workshops | 0 | common | Economic | research |
| The House of Life | 0 | common | Civic | research |
| The Royal Tutors | 0 | common | Civic | house of wisdom |
| The Bronze Casters | 0 | common | Military | arsenal |
| The Astronomical Diaries | I | uncommon | Civic | research |
| The Scholars' Fame | I | common | Civic | research, bridge to the house of wisdom |
| The Common Tables | I | common | Economic | university |
| The Dedications | I | uncommon | Civic | university |
| The Disciples | I | common | Civic | house of wisdom |
| The Secret Arts | I | uncommon | Economic | vanguard core |
| The Mechanicians | I | uncommon | Economic | inventors |
| The Edge of the Sword | I | uncommon | Military | arsenal |
| The Natural History | II | uncommon | Civic | research |
| The Translation Movement | II | uncommon | Civic | research, flex |
| The Old Libraries | II | uncommon | Civic | learned city core |
| The Scholar-Officials | II | common | Civic | learned city core, alternative |
| The Roll of Scholars | II | uncommon | Civic | house of wisdom |
| The Book of Firsts | II | uncommon | Civic | vanguard core |
| The Age of Reason | III | rare | Wildcard | research |
| The Journeymen | III | common | Economic | research |
| The Seven Liberal Arts | III | common | Civic | research |
| The Humanists | III | rare | Civic | university |
| The Professors | III | rare | Civic | house of wisdom |
| The Doctorate | III | uncommon | Civic | house of wisdom |
| The Instrument Makers | III | common | Economic | inventors |
| The Blast Furnaces | III | rare | Military | arsenal |
| Greek Fire | III | uncommon | Civic | arsenal |
| The Great Treatises | IV | rare | Civic | house of wisdom |

Each name was checked against `data/`, `docs/` and `src/`; none collides.

### Counts

**The sheet today** (61 Scientific cards, typed by this sort):

| Tier | Military | Economic | Civic | Wildcard | All |
|---|---|---|---|---|---|
| Tier 0 | 0 | 1 | 8 | 1 | 10 |
| Tier I | 0 | 4 | 6 | 1 | 11 |
| Tier II | 4 | 4 | 4 | 1 | 13 |
| Tier III | 2 | 3 | 3 | 1 | 9 |
| Tier IV | 4 | 4 | 7 | 3 | 18 |
| **All** | **10** | **16** | **28** | **7** | **61** |
| Shared | 1 | 0 | 14 | 0 | 15 |

**With this pass** (the five moves and the 28 new cards: 89 Scientific cards, 11 of them charters):

| Tier | Military | Economic | Civic | Wildcard | All | Charters among them | Seatable: M / E / C / W |
|---|---|---|---|---|---|---|---|
| Tier 0 | 1 | 2 | 9 | 1 | 13 | none | 1 / 2 / 9 / 1 |
| Tier I | 1 | 7 | 9 | 1 | 18 | 3 (2 Civic, 1 Economic) | 1 / 6 / 7 / 1 |
| Tier II | 4 | 4 | 10 | 1 | 19 | 4 (2 Military, 1 Economic, 1 Civic) | 2 / 3 / 9 / 1 |
| Tier III | 3 | 6 | 10 | 2 | 21 | 1 (Military) | 2 / 6 / 10 / 2 |
| Tier IV | 4 | 3 | 8 | 3 | 18 | 3 (2 Civic, 1 Military) | 3 / 3 / 6 / 3 |
| **All** | **13** | **22** | **46** | **8** | **89** | **11** | **9 / 20 / 41 / 8** |

- The new cards alone are 3 Military, 6 Economic, 18 Civic and 1 Wildcard.
- **Rarities with this pass** (common / uncommon / rare): Tier 0 10 / 3 / 0; Tier I 7 / 10 / 1; Tier II 3 / 11 / 5; Tier III 5 / 9 / 7 with the proposed changes; Tier IV 0 / 6 / 12.

### Close calls

- **The Palace Archive and The Forward Plans** (Civic): each opens a science building early. Read as construction, they would be Economic.
- **Learned Foundations** (Economic): production toward empire buildings, against a one-off 40 culture for each new kind.
- **The Ordnance Rolls** (Economic): strategic copies. They arm units, which would make it Military.
- **The Second Seat** (Civic): it pays whatever the second house pays, and most great houses pay culture, science, renown or authority.
- **The Closed Book** (Civic): it pays nothing and holds rivals back, which no type describes well.
- **The Prototype Works** (Economic): construction ahead of research. It trains units too, which would be Military.
- **The Great Experiment** (Economic): production toward the Opus, though what it spends is science.
- **New Crops** (Economic): two of its three lines are production and food.
- **The Cloister and The Merchant Navigators** (Civic, shared): see the shared table.
- **Among the new cards:** The Age of Reason is Wildcard because it acts on other cards; The Bronze Casters is Military because production toward units is Military by the rules; The Common Tables is Economic (food) though it serves a science build; Greek Fire is Civic because it pays science and culture, though it reads units.

### Where a tier leans, and what it means under each government

- **Tier 0 leans Civic** (9 of 13), and the Chiefdom has no Civic chair. A Scientific seat seats one Economic card (The Almanac or The Royal Workshops), one Military card (The Bronze Casters, or the partner's) and one Civic card in the Wildcard chair. So each build's Tier 0 pair is one Economic or Military opener and one Civic opener.
- **Tier I is even:** 1 Military, 6 Economic, 7 Civic and 1 Wildcard seatable. The Priest-King (2 Civic) and the Council of Elders (2 Economic) each seat four Scientific cards, and the War Chief seats the arsenal whole.
- **Tier II leans Civic** (9 of 15 seatable). The Theocracy (3 Civic, 1 Wildcard) is the deck's government. The Republic (3 Economic) seats Enduring Institutions, The Quiet Faculties and New Crops, and Tyranny (3 Military) seats Crucible Steel, The Siege College and the partner.
- **Tier III:** 2 Military, 6 Economic, 10 Civic and 2 Wildcard seatable. Divine Mandate (3 Civic, 2 Wildcard) suits the research build and the learned city, the Merchant League (3 Economic) the inventors, and Imperium (3 Military) the arsenal with The Blast Furnaces, The Saltpetre Works and the shared The Engineer Corps.
- **Tier IV:** 3 Military, 3 Economic, 6 Civic and 3 Wildcard seatable. The Curia (4 Civic) suits the deck; The Estates (4 Economic) suit the inventors; The Sultanate (4 Military) suits the arsenal.
- **Military chairs:** every government but the Republic has one. Scientific has nine seatable Military cards, eight of them in the arsenal and the ninth (The Walls of Learning) in the learned city, so most Scientific councils lend their Military chairs to the partner deck, as typed chairs intend ("the government steers which half of the seat's two decks leads").

---

## Open questions for the user

Each starts with the recommendation.

1. **The layout: one research build, plus the learned city and the vanguard with two flavours each.** *Recommended: yes.* That is five finished builds: the research build, the university, the house of wisdom, the inventors and the arsenal. The alternative is five separate builds, as Dominion's are.

2. **Science paid out as culture and production.** *Recommended: yes.* The research build and the learned city turn science into culture and production (each technology, each old school, each scholar), and the deck keeps its direct science cards few, as the deck design's taper asks. The new cards add science only through treatises (The Professors, The Great Treatises), cheaper research (The Translation Movement) and Greek Fire.

3. **The tier moves, trims, rework and rarities** in "Sheet changes this pass proposes". *Recommended: yes.* Each moved card reads a building or a charter its tier cannot have, and The Prototype Works becomes the inventors' Tier III capstone.

4. **The charter technologies.** None of the eleven exists in the tree, and the ×1.5 premium is not in `data/rules.json`. The vanguard needs them; the research build and the learned city do not. *Recommended: give them their own section of the tech tree, as the deck design plans, and build them in the first Scientific batch, starting with the seven of Tiers I and II.* Where each one sits is your chart to draw.

5. **Reading what other empires know.** The Secret Arts, The Translation Movement and Greek Fire read other empires' technologies, as the shared Books from the Ships already needs to. *Recommended: yes, and count only empires you have met,* so a card can show its count without telling you about an empire you have not met.

6. **A world ledger of first buildings** for The Mechanicians. *Recommended: yes,* beside the one for technologies (`techWorld`). Wonders are left out, because each is a first by definition.

7. **The Blast Furnaces,** the arsenal's capstone: units stop holding a copy of their strategic resource. *Recommended: yes.* It breaks the rule strategic resources rest on (one copy for each living unit). The other way to stretch the metals, each copy arming two units, is already Commerce's Strategic Exports.

8. **The Professors,** the house of wisdom's capstone: a great scholar that founds an Academy also writes its treatise. *Recommended: yes.* It breaks "one charge, two verbs" (`docs/great-people.md`), for scholars only.

9. **The ten live rows the sheet cut.** *Recommended: retire them in the batch that puts the types into the data,* as Expansionist's batch E0 retired two rows. They are most of what a Scientific seat is dealt today, and this sort does not type them.

10. **The types of the ten cards shared with Commerce, Devotion and Magisterial.** *Recommended: Civic for all ten, confirmed once the three passes that run now agree.* The close calls are The Cloister and The Merchant Navigators.

11. **The Exchange of Discoveries at Tier I.** *Recommended: yes,* as the Commerce sheet has it. The data has it at band 3 and Merchant Scholars at band 1, the reverse of the sheets. With both at Tier III, the Commerce · Scientific pair would have no shared card at Tier I or earlier, which ruling (qqqqqq) 14 requires.

After these, the deck pass goes on to putting every card on the sheet in the compact form Dominion's and Expansionist's use, then Scientific's Doctrines: one direction for each build, so each of the five has a Doctrine at most tiers.
