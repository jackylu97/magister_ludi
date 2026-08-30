# The Technology Tree — master doc

The one tech document (consolidated 2026-08-29 from `ages.md`, `mythic-sciences.md`,
`tech-tree-ages-2-5.md` and `tech-unlocks.md`, all four deleted; git history keeps them).
Two halves: **what is built** (read off `data/techs.json` — the tables in Part 2 are the
as-built rows and are re-derived, never hand-maintained), and **the proposal** for the five-age
re-banding (Part 3), carrying the user's edits of 2026-08-29 and every ruling made since the
proposal was first drafted. Companions: `docs/wonders.md` (the 27 rows), `docs/trade.md`,
`docs/religion-v2.md`, `docs/orders-and-doctrines.md`, `docs/great-people.md`. Nothing in Part 3
is scheduled until the Revisions section says so.

## Part 0 — The reference frame: how Civ V and Civ VI play, era by era (2026-08-29)

Read against this before cutting Part 3. The lens is a high-level player's build order.

**Civ V (BNW).** *Ancient*: expansion under the happiness cap, ruins, the pantheon race, a
stolen worker; the beeline is Pottery → Writing → **Philosophy (the National College)**, the
biggest early spike; Tradition four-city or Liberty wide. *Classical*: trade routes fund
everything, religion at 200 faith, composite bows hold the walls; Currency, Construction.
*Medieval*: **Education → universities in every city by ~t105** — the science pivot; Civil
Service, Machinery. *Renaissance*: bulbed Great Scientists, observatories, the Rationalism
tree; Astronomy → Printing → **Scientific Theory (Public Schools)**. *Industrial*: **ideology
at three factories** — the identity choice; the World Congress; tourism begins; then
**Plastics (Research Labs)**. *Modern → Information*: explicit victory infrastructure —
spaceship parts, tourism, votes; the last techs bulbed. The through-line: one beeline per era,
always a *science building per city* fed by population; expansion front-loaded and capped;
policies as the per-era identity pivot; the finish line named from mid-game.

**Civ VI (GS).** *Ancient*: **settle wide and fast** (ten cities is normal), eurekas drive
the tree, district adjacency makes the map the build order, chop with Magnus; Code of Laws →
Early Empire (Colonization) → **Political Philosophy** (first government ~t40). *Classical*:
a Campus and a Commercial Hub everywhere, **trade routes at Currency**, the great-person race.
*Medieval*: **Feudalism → Serfdom** (+2 builder charges) is *the* spike, then Education;
era score → a planned Golden Age. *Renaissance*: **Merchant Republic** (~t110), Humanism,
gunpowder. *Industrial*: factories in range of six cities, Scientific Theory, corps.
*Modern → Future*: victory as a track you run — Rocketry → Satellites → the exoplanet, rock
bands, Congress favour, apostles. The through-line: wide over tall; one spike per era
(Political Philosophy → Feudalism → Merchant Republic → Industrialization → Rocketry); each
era its own arc; victory visible from mid-game.

**What the five ages take from it.** (1) **One named beeline per age**, legible on the chart:
I Bronzeworking/Divination · II **Currency + Ancestor Rites** · III **Education** (our
"universities everywhere") · IV the Silk Road/Theology · V the Engine. (2) **A science
building per city per age** — library → Madrasa/university → Observatory → the Engine — kept
to one slot by *renewals*. (3) **An identity pivot per age** — the government tiers 4 · 10 ·
18 · 29 · 45 already fall one per age; keep them age-shaped. (4) **Expansion front-loaded and
capped** — authority is our happiness cap (3 / 2 / 4), Colonial Charters our Colonization
card. (5) **The finish line explicit from Æra III** — the beads hand revealed at III and
persisting (`docs/beads.md`) is spaceship-parts-from-mid-game, done as a deck. (6) The one
thing neither Civ has: the deck makes each age's *objectives* differ per seed while the tree
stays fixed.

## Part 1 — Standing determinations

These outrank anything below that still reads otherwise.

1. **Five ages.** Æra I Omens · II Heroes · III Empire · IV Cathedrals · V Magister. Today's
   `age: 2` rows are Empire and `age: 3` are Cathedrals *in role*; the Heroes band is inserted
   between the Omens ramp and the current 170🔬 floor. Government tiers are 4 · 10 · 18 · 29 ·
   45 (data, `GOVERNMENT_TIERS`); Statecraft pools are per government, not per age.
2. **The current slate of wonders stays** (user, 2026-08-29): all 27 rows, at the homes they
   have in `techs.json` today (Part 2 lists them). The proposal's per-node wonder homes for
   Æra II are **not** moves — the Æra II nodes carry what the user wrote, and a wonder named
   there is only a *candidate* for a later home if the user wants it. Prices are 0.85× the
   8/28 figures (Oracle 80 … House of Wisdom 340).
3. **Currency keeps the trade system, and moves to Æra II** (user, 2026-08-29): the trader unit,
   the market and its route capacity, the Colossus and the Mausoleum, in the Heroes band. Roads are laid **by caravans**
   (Entry XXXV — there is no worker road improvement), Founders' Road is live, and city
   connections pay through `explainEmpireGold`. So the proposal's *Royal Road* (roads) and
   *Silk Road* (trade routes proper) nodes lost their packages to shipped systems — both
   need new gifts (Part 3 marks them).
4. **Workshops matter, and belong in Æra III** (user, 2026-08-29): Engineering (workshop,
   watermill, the Great Wall) is an Empire node in the re-banding; the workshop's production
   bonus is what makes the middle game build.
5. **Epic Poetry replaces Drama and Poetry** (user's edit): the amphitheater and the Theatre
   of Dionysus move onto Epic Poetry with the Hall of Deeds and the *fallen become verse* rule;
   Drama leaves the tree. Theology's prerequisite follows (Philosophy + Epic Poetry).
6. **Built since the proposal, so its "needs" column is mostly satisfied:** wonders
   (Entry XXX/XXXIII, with completion grants), prophets/religions/spread (Entry XL), roads
   and trade routes (XXXV), unit and building upkeep (XLI), great people and legacies
   (XXXII), auto-upgrade on `upgradesTo` — gated on the strategic resource and swept every
   turn since 2026-08-29 — barbarians (XX), city combat in three beats (XLIV). What is still
   *assumed*: Magister's Dice (the Oracle and the Engine pay fallback yields until then),
   the Bead Race / Magnum Opus (Entry VI), manufactured luxuries, the King List's
   "turns since founding", an `unattackable` flag for the aerostat, a project priced in a
   meter surplus (Mesmerism).
7. **Sailing embarks civilians and the scout** (2026-08-29). Wayfinding's user edit — "allows
   military units to embark" — is the next step of that rule, not a replacement.
8. **Prices**: Æra II costs ×1.3 and Æra III ×1.8 (8/28, "science costs need to scale
   harder"); the Quick-speed schedule closes the three built ages at roughly t30 / t67 /
   t139 on the pacing seed (`test/sim/tech.slow.test.ts`, bands ±7 / ±12 / ±18).
9. **Star chart lanes**: five (`TECH_LANE_LIMIT`); a tech sits in the lane of the prerequisite
   whose line it continues (first listed — `prereqs` order is display order); two
   prerequisites in different lanes → sit between; leaves go where the fan stays even; never
   run a connector flat through a node not on its path (`chartCrossings`,
   `chartFalseChains`, pinned in `test/ui/techChart.test.ts`). The full principle is the
   docblock on `src/sim/techData.ts`.
10. **Naming**: nothing shipped is renamed by this doc. Candidates for a naming ruling:
    Philosophy → *Rhetoric* (ratified Entry X, unapplied) · monument → *Stele*, library →
    *Tablet House* · Feudalism → *The Manor*? · Theology → *The Cloister*.

## Part 2 — As built (`data/techs.json`, 2026-08-29)

Unlocks are the row's; abilities are the rites and verbs a node hands the augur/prophet.
Wonders in **bold** are the slate that stays.

### Æra I — The Age of Omens (12 nodes, 8–26🔬)

| node | 🔬 | prereqs | units | buildings | abilities |
|---|---|---|---|---|---|
| Agriculture | 15 (start) | — | settler, warrior, scout, worker | — | — |
| Husbandry | 8 | Agriculture | horseman | **Temple of Artemis** | — |
| Fletching | 8 | Agriculture | archer | — | — |
| Sailing | 8 | Agriculture | — | **Great Lighthouse** | embark (civilians + scout), fishing boats |
| Mining | 8 | Agriculture | — | — | mine |
| Earthenware | 8 | Agriculture | — | granary | — |
| Bronzeworking | 16 | Mining, Earthenware | spearman | barracks, Funeral Games, **Walls of Uruk** | Blessing of Arms |
| Stonecraft | 16 | Husbandry, Earthenware | — | monument, palisade, **Stonehenge**, **Pyramids** | Consecration of the Bounds |
| Calendar | 16 | Earthenware | — | **Hanging Gardens** | Rite of Plenty |
| Divination | 16 | Husbandry | augur | shrine, **The Oracle** | Rite of the Harvest, Recasting the Omens |
| Letters | 24 | Earthenware, Divination | — | library, **Great Ziggurat** | Omen Reading |
| The Wheel | 26 | Husbandry, Bronzeworking | chariot, chariot archer | — | — |

### Æra II as built — the Empire band in role (9 nodes, 170–305🔬)

| node | 🔬 | prereqs | units | buildings | abilities |
|---|---|---|---|---|---|
| Iron Working | 170 | Bronzeworking, Stonecraft | swordsman (needs iron) | **Terracotta Army**, **Statue of Zeus** | — |
| The High Temple | 170 | Divination, Stonecraft | prophet | temple | The Preaching |
| Mathematics | 200 | Letters, The Wheel | catapult | **Petra** | — |
| Currency | 210 | Letters, Stonecraft | trader | market, **Colossus**, **Mausoleum** | — |
| Construction | 240 | Stonecraft, Fletching | composite bowman | aqueduct, **Circus Maximus** | — |
| Philosophy | 255 | Letters, Divination | — | **Great Library** | — |
| Engineering | 275 | Mathematics, Construction | — | workshop, watermill, **Great Wall** | — |
| Drama and Poetry | 305 | Philosophy, Currency | — | amphitheater, **Theatre of Dionysus** | — |

### Æra III as built — the Cathedrals band in role (7 nodes, 480–810🔬)

| node | 🔬 | prereqs | units | buildings | abilities |
|---|---|---|---|---|---|
| Feudalism | 480 | Iron Working, Currency | pikeman | — | — |
| Machinery | 515 | Engineering, Construction | crossbowman | **Water Clock of Su Song** | — |
| Theology | 565 | Philosophy, Drama | — | monastery, **Chichen Itza**, **Hagia Sophia**, **Angkor Wat**, **Great Mosque of Djenné**, **Notre-Dame** | — |
| Chivalry | 615 | Feudalism, Husbandry | knight (needs horses) | **Alhambra** | — |
| Steel | 685 | Iron Working, Machinery | longswordsman | — | — |
| Physics | 750 | Mathematics, Engineering | trebuchet | **Machu Picchu** | — |
| Education | 810 | Theology, Philosophy | — | university, **House of Wisdom**, **Forbidden City** | — |

Buildings' prices are hand-tuned rows (Æra II–III raised 2026-08-29: temple 53 … university
134); units take the age band `[1, 1.5, 2]` off the unlocking tech; there is no building age
band by ruling.

## Part 3 — The proposal, third pass (2026-08-29): one list, five ages, the naval line, guilds and beads folded in

**What each age is for** (the user's brief), and the register it draws on:

| Æra | the play | the register |
|---|---|---|
| I · Omens | early settling · early religion · unlocking resources · **the first hull** | myth that was real: oracle bones, megaliths, the first fields and the first boats |
| II · Heroes | **buildings that generate renown** (which now also feed guilds — Entry XLVIII) · **great people unlocked** · **trade routes** · **the first prophet** | the Iliad and Gilgamesh, the Shang and Zhou, the Olmec, Hammurabi; the Phoenician bireme |
| III · Empire | **late settling** · **premiere military** in every class *and at sea* · **accelerating yields** (the university; a premiere culture house) · empire-wide mechanics | late antiquity and the early medieval: Rome and Byzantium, the Han and Tang, the Caliphate, the khanates, Teotihuacan; the dromon and the junk |
| IV · Cathedrals | **executing late-game objectives** — the beads deck's heavy hand (`docs/beads.md`); **the ocean opens** | the House of Wisdom, Song China, Mansa Musa, the cathedral builders, Tenochtitlan, the treasure fleets and the cog |
| V · Magister | futuristic sciences from the renaissance's view · multipliers · power spikes · explicit accelerants (deck deferred) | brass, aether, clockwork; the galleon and the paper lantern |

**Four traditions** (W · ME · E · PC — the last speculative, "what the magister imagines the far
peoples know"), each with a real share; a node with two marks is shared history.

**Three systems this pass threads through every age**, so a row that serves one says so:
- **Guilds (Entry XLVIII)** — a city's renown-per-turn fills its guild bar, so every age needs
  a renown building for each of the four specialist families (scholar · merchant · engineer ·
  artist); the *renown* column below names the family a building feeds. Æra I has them
  already (library · market? — no: the market is II — so Æra I feeds only scholars and, via
  Funeral Games, nobody; that is fine: guilds begin in II by design).
- **Beads (`docs/beads.md`)** — endeavours name prerequisite buildings (Funeral Games in
  every city; a cathedral, a mint, an armoury in every city; ten routes), quests name deeds;
  the *beads* column names what a node provisions. The Long Count shows the next age's hand a
  turn early; The Obsidian Mirror waits with the Æra V deck.
- **The naval line (user, 2026-08-29)** — three classes (light melee · heavy melee · naval
  ranged), no cargo hull, one hull per class per age on the naval-focused node of that age:
  Sailing (I), Wayfinding (II), **Shipwrights** ✱ (III), **The Astrolabe** ✱ (IV, the ocean
  opens), **Square Rigging** ✱ (V). The section after Æra V has the classes, the triangle and
  the names.

Legend: ⬆ shipped, re-banded · ✎ the user's edit · ✱ new this pass · **renown** the family a
building feeds · **needs** what is unbuilt (blank = today's mechanisms). Costs are the built
ones where built; the rest are band placements (Part 5, one re-pricing pass).

### Æra I — The Age of Omens (12 nodes, as built + the trireme)

| node | 🔬 | prereqs | package | tradition | renown | beads |
|---|---|---|---|---|---|---|
| Agriculture | start | — | settler, warrior, scout, worker · farm | all | | |
| Husbandry | 8 | Agriculture | horseman · pasture · reveals horses · Temple of Artemis | W ME | artist (wonder) | |
| Fletching | 8 | Agriculture | archer · camp | PC E | | |
| **Sailing** ✎ | 8 | Agriculture | embark (civilians + scout) · fishing boats · **Trireme** ✱ (naval melee, str 10, coast; the first hull) · Great Lighthouse | W PC ME | merchant (wonder) | |
| Mining | 8 | Agriculture | mine · quarry | all | | |
| Earthenware | 8 | Agriculture | granary | E ME | | |
| Bronzeworking | 16 | Mining, Earthenware | spearman · barracks · **Funeral Games** · Walls of Uruk · reveals iron | ME E | general | **The Great Games** endeavour (Funeral Games everywhere) |
| Stonecraft | 16 | Husbandry, Earthenware | monument · palisade · Stonehenge · Pyramids | W PC | engineer/scholar (wonders) | The Bulwark (palisade) |
| Calendar | 16 | Earthenware | plantation · Hanging Gardens | PC ME | engineer (wonder) | |
| Divination | 16 | Husbandry | augur · shrine · The Oracle · rites | E W | scholar (wonder) | |
| Letters | 24 | Earthenware, Divination | **library** · Great Ziggurat | ME E | **scholar** | The Library of the Realm |
| The Wheel | 26 | Husbandry, Bronzeworking | chariot, chariot archer | ME | | |

### Æra II — The Age of Heroes (12 nodes, 45–130🔬)

| node | 🔬 | prereqs | package | tradition | renown | beads / needs |
|---|---|---|---|---|---|---|
| **Epic Poetry** ✎ | 45 | Letters | **Hall of Deeds** (+2🎵 +1 happiness) · amphitheater, Theatre of Dionysus (from Drama) · *the fallen become verse* | W ME | **artist** (Hall, amphitheater) | needs the death-culture line |
| **Kingship** | 50 | Stonecraft, Letters | **Stele of Laws** (+2 authority capacity) · *(later)* the King List | ME | — (magistrate, later) | |
| **Ancestor Rites** ✱ | 55 | Divination, Stonecraft | **unlocks the great-person offer** · **Ancestor Mound** = monument renewal (+1🎵 +1 authority) | E PC | **scholar** (the Mound) | the first great person feat |
| **The High Temple** ⬆ | 170 → band | Divination, Stonecraft | temple · prophets · The Preaching | ME | — | |
| **Currency** ⬆ ✎ | 210 → band | Letters, Caravans | **the trade system**: trader, **market** + route capacity, Colossus, Mausoleum | ME W E | **merchant** (market) | The Grand Caravan endeavour (ten routes); The Ledger, The Exchange |
| **Caravans** ✎ | 80 | Calendar, The Wheel | **Bazaar** (+2🪙, +1🪙 on luxury resources) | ME | merchant | |
| **The Deluge Remembered** ✱ | 60 | Earthenware, Sailing | **Levee** = granary renewal (+1🌾 beside fresh water; a river city keeps 25% of its basket) · floodplain farms | ME W E PC | | |
| **Irrigation** ✎ | 65 | Calendar, Earthenware | farms beside fresh water +1🌾 · lake tiles +1🌾 | ME PC | | The Breadbasket (100🌾 in a city) |
| **Standing Stones** ✎ | 70 | Stonecraft, Divination | **Standing Stones** improvement (+1🎵 +1🕯) | W PC | | |
| **The Long Count** ✱ | 95 | Calendar, Letters | **the next age's beads hand is shown a turn before the age opens** (until beads exist: +2🔬 in the capital) · plantations +1🎵 | PC | | the deck's reveal rule |
| **Bronze Panoply** ✎ | 90 | Bronzeworking, The Wheel | **Phalanx** (spearman upgrade, anti-mounted) · barracks +1⚙ | W | general | |
| **Wayfinding** ✎ | 110 | Sailing, Husbandry | **military units may embark** · **Harbour** (coastal; +1🌾 on sea resources, +1 route capacity; the naval unit's barracks) · **Bireme** ✱ (light, str 13, mv 5; user) · **War Galley** ✱ (heavy, str 16, mv 3) | PC W ME | merchant (harbour) | The Fleet (nine hulls); The Market Town |

### Æra III — The Age of Empire (15 rows to cut to ~12, 170–320🔬)

The premiere roster, one per tradition — **Legionary** (W, melee), **Spear Wall** (E,
anti-cavalry), **Cataphract** (ME, cavalry), **Horse Archer** (E, mounted ranged), the
trebuchet ⬆ (siege) — and at sea the Galley, the Tower Ship and the Fire Ship — the three classes' Æra III hulls. The university is the premiere science house; the **Forum** the premiere
culture house; the **Examination Hall** and the **Qadi's Court** the empire-wide law.

| node | 🔬 | prereqs | package | tradition | renown | beads / needs |
|---|---|---|---|---|---|---|
| **Iron Working** ⬆ | 170 | Bronze Panoply, Stonecraft | swordsman (iron) · Terracotta Army, Statue of Zeus | E W | general (wonders) | |
| **The Legion** ✱ | 190 | Iron Working, Kingship | **Legionary** (melee premier, str 17, iron; lays a road step where it ends its turn) · **Castrum** = barracks renewal (+1 happiness; units built here +1 hp stamp) | W | general | The Conqueror; The Siege Master |
| **Mathematics** ⬆ | 200 | Letters, The Wheel | catapult · Scholarship renewal 20⚙ → 6🔬 · Petra | ME W | merchant (wonder) | The Scholarship |
| **Construction** ⬆ | 240 | Stonecraft, Fletching | composite bowman, **aqueduct** · **Baths** (+2 happiness) · Circus Maximus | W | artist (wonder) | The Waterworks (aqueducts in four size-10 cities) |
| **Rhetoric** ⬆ (Philosophy) | 255 | Letters, Divination | **Forum** — the premiere culture house (+3🎵) · Great Library | W | **artist** (Forum), scholar (wonder) | |
| **Engineering** ⬆ ✎ | 275 | Mathematics, Construction | **workshop**, watermill · Great Wall | E W | **engineer** (workshop, watermill) | The Forge-City (100⚙ in a city) |
| **Shipwrights** ✱ | 230 | Wayfinding, Engineering | **Galley** ✱ (light, 16, mv 5) · **Tower Ship** ✱ (heavy, 24, mv 3) · **Fire Ship** ✱ (naval ranged, 12 / 18 at range 1) · **Shipyard** building (coastal: naval units −25%⚙, +1 route capacity) | ME E (Byzantium's fire, the Song junk) | merchant (shipyard) | The Fleet; The Long Haul at sea |
| **The Imperial Post** ✱ | 230 | Engineering, Currency | roads cost nothing within 3 hexes of a city · connected cities +1🪙 +1🔬 · caravans +1 movement | E ME W | | The Road-Builder (eight connected) |
| **The Steppe Bow** ✱ | 260 | The Wheel, Husbandry | **Horse Archer** (mounted ranged premier; horses) · mounted units ignore zone-of-control tolls | E | general | |
| **The Cataphract** ✱ | 280 | The Steppe Bow, Iron Working | **Cataphract** (cavalry premier; horses + iron; +3 vs ranged) · stables = pasture renewal (+1⚙) | ME | general | |
| **The Halberd Wall** ✱ | 250 | Bronze Panoply, Engineering | **Spear Wall** (anti-cavalry premier; +50% vs mounted; fortifies twice as fast) | E | general | |
| **The Examination Hall** | 175 | Kingship, Letters | **Examination Hall** (+3 authority capacity) · Great Warring Tribes' bar wakes · authority tier +5 → 10% becomes 15% | E | — (magistrate, later) | |
| **The Qadi's Court** ✱ | 300 | The Examination Hall, The High Temple | captured cities cost one less authority · following cities +1 authority capacity per 3 · **Madrasa** = library renewal (+1🔬 +1🕯) | ME | scholar (madrasa) | The Conqueror's cap |
| **Colonial Charters** ✱ | 220 | Currency, Construction | settlers −25% · a new city starts with a Monument and a Granary · a city within 3 hexes of a foreign border costs no authority | W ME | | The Founder (eight founded) |
| **The Knotted Cord** ✱ | 310 | Currency, Mathematics | each trade route +1🔬 · +1 authority capacity per 4 connected cities · the Trade screen shows every empire's routes | PC | | The Census endeavour's spirit |
| **The Orrery of Bronze** | 200 | Mathematics, Rhetoric | library renewal (+1🔬 per library, +1 more with a Madrasa) · Antikythera | W | scholar | |
| **Education** ⬆ ✎ | 810 → band | Rhetoric, The Examination Hall | **university** — the premiere science house · House of Wisdom, Forbidden City | ME E W | **scholar** (university) | The Library of the Realm (library + university in four) |

### Æra IV — The Age of Cathedrals (12 rows to cut to ~10, 480–810🔬)

The objectives age: every node hands the player a tool for a card on the table — the walls,
the cathedral, the mint, the armoury, the ocean.

| node | 🔬 | prereqs | package | tradition | renown | beads / needs |
|---|---|---|---|---|---|---|
| **Feudalism** ⬆ | 480 | The Legion, Currency | pikeman · **Castle** (+8 city defence) · serfdom (farms +1⚙ under an Order of the age) | W E | | The Bulwark (palisade + castle in four) |
| **Machinery** ⬆ | 515 | Engineering, Construction | crossbowman · **Windmill** = workshop renewal (+2⚙ on flat cities) · Water Clock of Su Song | E | engineer (windmill, wonder) | |
| **Theology** ⬆ | 565 | Rhetoric, Epic Poetry | monastery · **Cathedral** (+3🕯 +2 happiness) · rite The Mysteries · enhancers · the five wonders as built | W ME | **artist** (cathedral), scholar (wonders) | **The Cathedral of the Age** endeavour; The Cloister (temple + monastery + cathedral in four) |
| **Chivalry** ⬆ | 615 | Feudalism, The Cataphract | knight · **Tourney Ground** (barracks renewal: +1 happiness, mounted +1) · Alhambra | W ME | general | |
| **Steel** ⬆ | 685 | Iron Working, Machinery | longswordsman · **Forge** (+15%⚙ on units; +1⚙ per mine) · **Armoury** ✱ (the Æra IV military building: +5 hp stamp on units built here; the Muster's prerequisite) · war elephants where ivory is held | E W | **engineer** (forge), general (armoury) | **The Muster of the Realm** endeavour |
| **Physics** ⬆ | 750 | Mathematics, Engineering | trebuchet · Machu Picchu | ME W | engineer (wonder) | |
| **Paper Money** ✱ | 520 | Currency, Movable Type | *the Song's jiaozi, the Medici's ledger*: **Mint** building (+3🪙, purchases −10% in the city) · **Banking house** = market renewal (+2🪙) | E W ME | **merchant** (mint) | **The Mint** endeavour (a mint in every city) |
| **The Silk Road** ✎ | 600 | Currency, The Imperial Post | **Caravanserai** (+2🪙, +1 route capacity) · imported luxuries count as held · routes reach two cities further · the Great Mosque's route line | E ME | merchant (caravanserai) | The Caravanserai quest (ten routes from one city) |
| **Movable Type** | 640 | Letters, Machinery | **Printing House** (+2🔬 +2🎵) · every library +1🎵 · one extra Order offer per draft | E W | scholar/artist (printing house) | |
| **The First Distillation** | 700 | Earthenware, Theology | **Distillery** = market renewal (+2🪙, +1 happiness with wine/spirits) — The Adepts and The Philosopher's Stone wake | ME E | merchant | |
| **The Astrolabe** ✱ | 520 | Physics, Wayfinding | **the ocean opens** · embarked +1 movement, +1 sight · **Caravel** ✱ (light, 22, mv 6) · **Carrack** ✱ (heavy, 32) · **Gun Galley** ✱ (naval ranged, 18 / 26 at range 2) · **Observatory** (+3🔬, +1 beside a mountain) | ME E W | **scholar** (observatory) | the Circumnavigator feat; The Fleet at sea |
| **The Floating Fields** ✱ | 560 | Irrigation, The Knotted Cord | **Chinampas** (a worked water tile beside the city: +2🌾 +1🎵) · **Causeways**: a city on water counts as connected to any city it can see across it | PC | | The Breadbasket at sea |

**The House of Wisdom clash (flag):** the Encyclopaedia endeavour's prerequisite reads "a
House of Wisdom in every city", but the House of Wisdom is a *wonder* (one per world). Either
the endeavour means the **university** (my reading — "the university's successor" in
`beads.md`), or Æra IV gains a building named for it. The user's call.

### Æra V — The Age of the Magister (10 nodes, 900🔬 and up; deck deferred with the age's loop)

| node | 🔬 | prereqs | package | kind | tradition | renown | needs |
|---|---|---|---|---|---|---|---|
| **The Luopan** | 900 | The Astrolabe, The First Distillation | the settler lens shows the land's veins · every city +1 sight | accelerant | E | | lens data |
| **Fire Medicine** | 950 | The First Distillation, Physics | **Bombard**, **Rocket Arrows** · castle renewal +4 | power spike | E | general | |
| **Square Rigging** ✱ | 980 | The Astrolabe, Shipwrights | **Corvette** ✱ (light, 28, mv 6) · **Ship of the Line** ✱ (heavy, 44) · **Frigate** ✱ (naval ranged, 28 / 38 at range 2, bombards) · **Drydock** = shipyard renewal (naval units +1 movement) | power spike | W (the carrack and the galleon) | engineer (drydock) | naval siege |
| **The White Gold** | 1000 | The First Distillation, Earthenware | **Porcelain Works** mints a luxury no tile has | multiplier | E | merchant | manufactured luxury |
| **The Perspective Glass** | 1050 | Education, The Astrolabe | every city +1 sight · Observatory renewal (+4🔬) · reveals every resource on explored land · wonder **The Astronomical Bureau** | multiplier | W E | scholar | a 28th wonder |
| **The Clockwork Servant** | 1100 | Machinery, The Orrery of Bronze | **Clockwork Worker** (never expends charges) · Windmill +1⚙ | power spike | ME E | engineer | a row flag |
| **The Obsidian Mirror** ✱ | 1150 | The Perspective Glass, The Long Count | every seat's beads and Opus progress visible · the capital sees 6 hexes · +1 die | accelerant | PC | | the deck (deferred) |
| **The Loom That Remembers** | 1200 | The Silk Road, Movable Type | plantations +1🪙 +1🎵 · **Manufactory** = Forge renewal (+3⚙) · +25%⚙ toward buildings | multiplier | W | engineer | |
| **Mesmerism** | 1250 | Theology, The Perspective Glass | **The Entranced Workforce** project | accelerant | W | | a meter-priced project |
| **The Paper Lantern That Lifted** | 1300 | Fire Medicine, The Perspective Glass | **Aerostat** · +1 happiness | power spike | E | | `unattackable` |
| **The Calculating Engine** | 1400 | The Loom That Remembers, The Clockwork Servant | **The Engine** (+8🔬, +1 die per age, science +25% in its city) · Scholarship renewal | multiplier | W | scholar | dice |
| **The Great Work** | 1500 | The Calculating Engine, The White Gold | **the Magnum Opus** | the win | ME W | | the Bead Race |

### The naval line (ruled 2026-08-29): three classes, no cargo hull

**Rulings (user):** a ship spawns on the hex of the city that built it; a coastal city's hex is
the **one** land hex a ship may enter — it garrisons there like any unit — and every other
land hex is impassable to it; **a naval melee unit takes a city like a land melee does** —
the three beats (walls, garrison, then it moves onto the city tile and captures); no civilian
or cargo hull (a route at sea is the trader's rule, not a ship). Three classes, each with a
predator and a prey, all through flat lines `planCombat` already prints:

| class | speed | cost | its rules |
|---|---|---|---|
| **Light melee** (nimble) | fast | ~60% of heavy | **hit and run** — may move after attacking with movement left · **+5 vs naval ranged** (it closes before the shot) · **escort** — an embarked unit on its hex defends at the ship's strength · plunders a route on a kill |
| **Heavy melee** | slow | high | **the line** — +2 per adjacent friendly heavy (max +4) · **blockade** — adjacent to a coastal city it counts toward the siege ring and stops the city's routes · captures embarked civilians by advance |
| **Naval ranged** | medium | high | strikes at range 1 (III) / 2 (IV+) without counter, like land ranged · a −5 melee-defence line (fragile when caught) · **bombardment** from IV: +vs cities, may strike the walls beat from range |

So **light beats ranged** (closes and takes no shot), **ranged beats heavy** (kites a 3-move
hull), **heavy beats light** (raw strength) — a triangle to pin with a fixture before tuning:
light kills ranged in two strikes, ranged kills heavy in three kites untouched, heavy kills
light in two. Speed is a *strategic* stat at sea (the coast is long); escort and plunder are
what keep the light line worth building after ranged hulls appear in III, which is exactly
when Civ's light ships die.

| class | I | II | III | IV | V |
|---|---|---|---|---|---|
| **Light melee** | **Trireme** 10 · mv 4 (Sailing; user) | **Bireme** 13 · mv 5 (Wayfinding; user) | **Galley** 16 · mv 5 (Shipwrights) | **Caravel** 22 · mv 6 (The Astrolabe) | **Corvette** 28 · mv 6 (Square Rigging) |
| **Heavy melee** | — | **War Galley** 16 · mv 3 (Wayfinding) | **Tower Ship** 24 · mv 3 (Shipwrights) | **Carrack** 32 · mv 3 (The Astrolabe) | **Ship of the Line** 44 · mv 3 (Square Rigging) |
| **Naval ranged** | — | — | **Fire Ship** 12 · 18 at range 1 · mv 4 (Shipwrights) | **Gun Galley** 18 · 26 at range 2 · mv 4 (Paper Money → Fire Medicine's predecessor; place on The Astrolabe) | **Frigate** 28 · 38 at range 2, bombards · mv 4 (Square Rigging) |

Names are deliberately nobody's: *Tower Ship* is the plain English of the louchuan and
describes every medieval heavy (a castle at each end); *War Galley*, *Gun Galley* and *Fire
Ship* are descriptive; *Caravel* is the generic word for the small fast ocean ship in every
language. The traditions live in the epigrams (the dromon's siphons, the Song thunderclap,
the turtle ship's shell, the Polynesian waka for the trireme's PC half).

**The badge and the sculpt (user, 2026-08-29).** One drawn hull per age in the tile atlas's
own idiom (path data, never a fetched file): *oars and a pennant* (I) → *one square sail* (II)
→ *sail and a fighting tower* (III) → *two masts* (IV) → *three masts, full rig* (V) — so
a Galley and a Tower Ship share the Æra III hull and differ by the **canton**, a Tabler mark
(MIT, the set every badge already wears) printed on the parchment corner exactly as the seat's
charge is: **chevrons** for light melee (forward, fast), the **rook** for heavy melee (the tower
ship's castle; the line), the **crosshair** for naval ranged. Thirteen badges from five paths
and three marks; `badges.byUnitType` keys each row to its `{ hull: age, canton: class }` pair,
and the three generic sculpts read the same mast count off the row, so the piece and its badge
agree. Candidate sheet: the "Naval Badges" artifact of 2026-08-29.

**Temporary homes while the tree is unfinalised (2026-08-29):** the hulls ship on built techs
so they can be played — Trireme on Sailing (the user's), Bireme and War Galley on Currency,
Galley / Tower Ship / Fire Ship on Engineering, Caravel / Carrack / Gun Galley on Physics; the
three Æra V hulls have no tech yet and are unbuildable until the tree pass moves everything to
Wayfinding, Shipwrights, The Astrolabe and Square Rigging.

**The rules a hull needs**, all small: `modelClass: 'naval'` (`stepCost` prices water for it
and land as impassable, save the owner's own coastal city hexes); the spawn tile is the city
hex; `carries` is not needed (ships do not ferry — units embark on their own); `hitAndRun`,
`escort` and the `+5 vs naval ranged` are three `combatLine`/`actionRule` shapes; blockade is
one clause in `siegeField`; bombardment is the ranged unit's `vsClass: 'city'` line plus the
walls beat from range. A coastal city defends against ships at its own strength, so early
triremes cannot bully a walled town.

### What moves in the shipped tree

| shipped | today | proposed | why |
|---|---|---|---|
| **Sailing** | embark, boats, the Lighthouse | **+ Trireme** | the user, 2026-08-29 |
| **Currency** | Æra II band, Empire in role | **Æra II Heroes** | trade routes are a Heroes goal |
| Education | Æra III | **Æra III Empire** | the university is the premiere science house |
| Philosophy | a name | **Rhetoric** (Entry X, applied) | its building is the Forum |
| Drama and Poetry | a node | gone — Epic Poetry takes its rows | the user's edit |
| Theology's prereq | Drama | Epic Poetry | follows |
| Feudalism → freshwater renewal | Æra III | → Irrigation (II); Feudalism gets the Castle | growth with the Gardens, a wall with the pike |
| Iron Working's prereq | Bronzeworking | Bronze Panoply | the Fire thread |
| Currency's second prereq | Stonecraft | Caravans | gold descends from trade |
| The Royal Road / The Silk Road | packages spent | The Imperial Post (III) / The Silk Road re-gifted (IV) | ruling 3 |
| wonders | as built | **stay** | ruling 2 |

Count: I 12 · II 12 · III 17 (→ ~12) · IV 12 (→ ~10) · V 11 → **64 rows, ~56 after the cut**.
Renown coverage per family per age (guilds): scholar I–V · merchant II–V · engineer III–V ·
artist II–IV (V has none — The Exposition's home if one is wanted). New buildings this pass:
Harbour (II), Shipyard, Baths, Forum, Madrasa* (III), Castle, Armoury, Mint, Caravanserai,
Printing House, Cathedral, Observatory (IV), Drydock*, Manufactory* (V); * = a renewal.

## Part 4 — Register and threads (the tone, condensed)

Two principles. **The eastern material is the mainline, not a branch** — gunpowder from
elixir experiments, the luopan, Bi Sheng's type, porcelain, the examinations are the actual
history Civ westernises; told truthfully they already sound magical. **Real kernels only** —
every tech names something that existed or was earnestly believed; the fantastic comes from
the telling, shading from myth-that-was-real (I) to speculation-that-felt-real (V).

The threads are renewal lineages — later nodes renew earlier nodes' buildings and
improvements, so the narrative spine is the mechanical one:

- **Fate** (divination becomes computation): Divination → Letters (writing born on oracle
  bones — the prerequisite is true history) → Philosophy → The Orrery of Bronze → Movable
  Type → The Loom That Remembers → **The Calculating Engine**.
- **Fire** (kiln to Philosopher's Stone): Earthenware → Bronzeworking (ritual vessels first,
  spears second) → Bronze Panoply → Iron → Steel → The First Distillation → Fire Medicine →
  The White Gold → **The Great Work**.
- **Sky** (ground to heavens): Calendar → Stonecraft (stones that remember the solstice) →
  Standing Stones → Mathematics → Machinery → Physics → The Perspective Glass → **The Paper
  Lantern That Lifted**.
- **Water**: Sailing → Irrigation → Construction → Engineering → Wayfinding → The Luopan.
- **The canon spine ✦** mythologises the player's own run: Epic Poetry (the fallen become
  verse), Kingship and the King List, the Walls of Uruk, the Stele of Laws, the Oracle (where
  the Magister's Dice come from), Funeral Games (grief transmuted), Standing Stones (the
  temple before the field), The Examination Hall (scholars, not bailiffs), The Mysteries.

Demoted to the mastery-roll pools rather than the shared tree (user, 2026-08-23): The Body's
Rivers, The Silk Mystery, Greek Fire, and every future one-off oddity — the roll pools are
where bespoke history lives; the tree carries what everyone's ancients dreamed.

## Part 5 — Open questions for the ruling

- **The cut**: Æra III's fifteen to twelve (which three?), Æra IV's eleven to ten.
- **Re-pricing**: the Heroes band (45–130) holds The High Temple (170) and Currency (210) —
  both come down; Education (810) comes down to Æra III's ceiling (~320); Æra V starts above
  810. One pass, together, then the pacing seed measures it.
- **Curtain**: five ages at ~t185, or hold ~t160 by compressing Heroes/Empire?
- **The Bead Race's numbers** (Part 6): threshold N, beads per family, the Opus's price.
- **Masteries** (Part 7): per marked node or per thread; how many a game should hand out.
- **A 28th wonder** (The Astronomical Bureau) — or the Bureau becomes a building.

## Part 6 — Victory: the Bead Race, structured for Æra IV and V

Entry VI is the ruling and stands: **one unified condition** — glass beads across four
families (domination, culture, science, economic), coarse (~30 in a finished game), every
bead an announced event; two ways to win — **first to N**, or most at the final age's close —
and **the last bead is golden and only the Magnum Opus mints it**. This section turns that
into the tree's shape. Nothing here is built; `Player.triumphs`, `state.contested` and the
Abacus are the plumbing it will ride.

**Three sources, placed by age.**

1. **Feats** (firsts — the Triumph system already records them, keyed `(id, age)` and
   contested world-wide): a feat that is *first in the world* mints a bead; today's
   Triumphs pay renown and would keep doing so. The bead-feats are few and public:
   first to each age · first wonder of each age · first religion · first capital captured ·
   first to circumnavigate (ocean crossable at The Astrolabe) · first Engine.
2. **Age objectives** — dealt **at the opening of Æra III, IV and V** (2–3 per age, public,
   the same for every seat — Entry II's fairness), scored at the age's close. **The Long Count**
   shows them a turn early; **The Obsidian Mirror** shows every seat's progress. Objectives
   are drawn from a per-age pool in `data/beads.json`; each names a family. Examples the
   tree above already provisions: *hold a city on every continent* (domination) · *the most
   followers in foreign cities* (culture) · *the most copies of a manufactured luxury*
   (economic) · *the first Engine* (science) · *the most wonders* · *the largest connected
   road network* · *the most great people recruited*.
3. **Age-close scoring** — one bead per age to the leader in each family's standing count
   (cities held / culture per turn / techs / gold per turn), so a steady builder stays on the
   board without a point salad.

**Æra IV is the objectives age.** Its opening deals the first *heavy* objectives, and its
nodes are the tools: the Castle holds the objective city, the Silk Road dominates a resource,
Theology converts, Movable Type out-drafts. A player enters Æra V knowing the standings.

**Æra V is the accelerant age.** Every node either multiplies a yield or names a bead outright
(the table's *kind* column). The Great Work opens the **Magnum Opus**: begun in the capital at
N−1 beads (v0 — Entry VI's open question, resolved *yes, N−1 must be held*), announced to
every seat, priced in hammers **and** science **and** culture (a mixed sink, so no one economy
rushes it), interrupted — progress **halved**, not lost — when an enemy combatant comes to
rest on the capital's ground (the same seam that revokes a legacy), and finished as a
ceremony every seat sees. The curtain path needs no Opus: at Æra V's close the most beads
win, and the golden slot stays empty on every rod but the Opus-builder's.

**Numbers to rule on**: N (the threshold; ~20 on Quick), beads per family per age, the Opus's
price and its scaling by speed and seat count. Harness assertion once built: bot games end
by threshold or curtain within the target band.

## Part 7 — Technology masteries

Entry XV's doctrine: **science drafts passive, permanent masteries** ("tech rolls" — relics;
learned knowledge is never unslotted), which modify *things* — buildings, tiles,
improvements, units — while culture's Orders modify *behaviours*. One draft machinery, two
dressings: the star chart's night for masteries, Statecraft's parchment for Orders. Magister's
Dice reroll a mastery roll. The proposal:

**Where a mastery comes from.** Not every technology — fifty-four drafts is a chore, not a
choice. Two shapes, pick one:

- **(A) Marked nodes.** A tech row may carry `masteries: [ids]` — a pool of 3–6 for that node;
  completing a node that carries one opens a **1-of-3 draft from that node's pool** (drawn at
  completion from `state.rng`, spent by a `chooseMastery` command, an End Turn blocker like
  every draft — `discoveries.ts`'s doctrine). Roughly a third of the tree is marked — the
  package nodes (Mining, Bronzeworking, Currency, Engineering, the military premiers, the
  university, the Æra V multipliers), so ~15–18 masteries a game. Data-driven: which nodes
  are marked is a row, not a rule. **Recommended.**
- **(B) Threads.** Every node belongs to a thread (Fate, Fire, Sky, Water, ✦); completing a
  thread's 2nd, 4th, 6th… node opens a draft from that *thread's* pool. Fewer tables, but a
  mastery then says nothing about the node that earned it.

**What a mastery is.** A row in `data/masteries.json` with `effects` in the *same card
vocabulary* as an Order (`statecraft.ts` stays the only reader of `CardEffect.kind` — a
mastery is `liveEffects`' ninth source), restricted by data lint to the shapes that modify
things: `tileYields`, `cityYields hasBuilding`, `unitStat`, `combatLine`, `productionBonus`,
`buildingRule`, `unitStamp`. Never a rate conversion, never a draft rider, never a meter
lever — those are Orders. Examples, by node: *Mining* → mines +1⚙ on hills · quarries +1🎵 ·
mines reveal one hidden resource within 2 hexes when built · *Bronzeworking* → spear line
+1 str · barracks +1 renown/turn · *Currency* → markets +1 route capacity · caravans +1 move ·
routes pay +1🔬 · *Engineering* → workshops +1⚙ per 4 citizens · watermills +1🌾 ·
*The Legion* → legionaries fortify in one turn · castra +1 hp stamp · *Education* → universities
+2🔬 · +1 renown/turn to the Scholar family per university.

**Rarity and the dice.** The same three marks as Orders (● ◆ ○, weighted never restricted)
once the user's rarity ruling lands; a Magister's Die rerolls the hand. **A declined mastery
goes back in the bag** — the node's pool is small and *meant* to come round on the next node
of the same thread only if it is in that node's pool too; the decline stamp is an Orders rule
and does not apply here.

**What it costs to build.** `Player.masteries: MasteryId[]` (schema bump) · `techs.json` rows
gain `masteries` · `data/masteries.json` · `chooseMastery` + `pendingMastery` (the offer,
drawn at `settleResearch`) · a ninth `liveEffects` source · the star chart's dressing (the
offer card in night ink, and a ✦ on a mastered node) · the Compendium's shelf, generated. The
draw and pick plumbing is the discovery offer's, which is why Entry XV said "masteries first
— drafting at its simplest, no slots".

## Revisions

*(yours — edit away; ✎ marks what changed)*
