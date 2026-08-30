# The Technology Tree — master doc

The one tech document (consolidated 2026-08-29 from `ages.md`, `mythic-sciences.md`,
`tech-tree-ages-2-5.md` and `tech-unlocks.md`, all four deleted; git history keeps them).
Two halves: **what is built** (read off `data/techs.json` — the tables in Part 2 are the
as-built rows and are re-derived, never hand-maintained), and **the proposal** for the five-age
re-banding (Part 3), carrying the user's edits of 2026-08-29 and every ruling made since the
proposal was first drafted. Companions: `docs/wonders.md` (the 27 rows), `docs/trade.md`,
`docs/religion-v2.md`, `docs/orders-and-doctrines.md`, `docs/great-people.md`. Nothing in Part 3
is scheduled until the Revisions section says so.

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

## Part 3 — The proposal, second pass (2026-08-29): one list, five ages, four traditions

**What each age is for** (the user's brief, 2026-08-29), and the register it draws on:

| Æra | the play | the register |
|---|---|---|
| I · Omens | early settling · early religion · unlocking resources | myth that was real: oracle bones, megaliths, the first fields — every tradition's dawn |
| II · Heroes | developing the empire through **buildings that generate renown** · **great people unlocked** · **trade routes** · **the first prophet** | the Iliad and Gilgamesh, the Shang and Zhou bronzes, the Olmec heads, Hammurabi's stele |
| III · Empire | **late settling** · **premiere military** (anti-cavalry, cavalry, melee, ranged) · **accelerating yields** (the university; a premiere culture house) · buildings and mechanics for **empire-wide** play | **late antiquity and the early medieval**: Rome and Byzantium, the Han and Tang, the Caliphate, the Mongol khanates, Teotihuacan and the Maya classic |
| IV · Cathedrals | **executing late-game objectives** — the Bead Race's age objectives are dealt here (Part 6) | the House of Wisdom, Song China, Mansa Musa, the cathedral builders, Tenochtitlan, the sagas |
| V · Magister | **futuristic sciences from the renaissance's point of view** · extremely strong buildings and mechanics that multiply yields · true late-game power spikes · explicit accelerants toward the win | brass, aether, clockwork — never smokestacks; the magister's dream of what the far peoples must know |

**Four traditions, each with a real share** (the user's brief): **Western** (Greece, Rome, the
cathedrals, the renaissance) · **Middle Eastern** (Sumer and Babylon, Persia, the Caliphate,
the House of Wisdom) · **Eastern** (the Shang and Zhou, the Han and Tang, Song, the Mongols) ·
**Pre-Columbian** (the Olmec, Teotihuacan, the Maya, the Inca, the Mexica) — the last is
allowed to be *speculative*: from the magister's desk these are rumours from across the ocean,
so a Pre-Columbian node may describe what the magister *imagines* the far peoples know
(knotted cords that remember, mirrors that show what is far, fields that float). The tradition
column below marks each node **W · ME · E · PC**; a node with two marks is shared history.
Real kernels only, still — the speculation is in the telling.

Legend: **prereqs** are display order (first = the lane continued) · **thread** as Part 4 ·
⬆ shipped, re-banded · ✎ the user's edit · ✱ a new node this pass · **needs** names what is
unbuilt (blank = today's mechanisms). Costs: the built ones where built; the rest are band
placements to be re-priced together (Part 5).

### Æra I — The Age of Omens (12 nodes, kept as built)

Early settling, early religion, resources. Nothing moves; the flavour is where the four
traditions first speak (the Compendium's epigrams, not the rows).

| node | 🔬 | prereqs | package | tradition | thread |
|---|---|---|---|---|---|
| Agriculture | start | — | settler, warrior, scout, worker · farm | all | — |
| Husbandry | 8 | Agriculture | horseman · pasture · reveals horses · Temple of Artemis | W ME | — |
| Fletching | 8 | Agriculture | archer · camp | PC E | — |
| Sailing | 8 | Agriculture | embark (civilians + scout) · fishing boats · Great Lighthouse | W PC | Water |
| Mining | 8 | Agriculture | mine · quarry | all | Fire |
| Earthenware | 8 | Agriculture | granary (the kiln; ding cauldrons for the ancestors first) | E ME | Fire |
| Bronzeworking | 16 | Mining, Earthenware | spearman · barracks · Funeral Games · Walls of Uruk · Blessing of Arms · reveals iron | ME E | Fire |
| Stonecraft | 16 | Husbandry, Earthenware | monument · palisade · Stonehenge · Pyramids · Consecration of the Bounds | W PC | Sky |
| Calendar | 16 | Earthenware | plantation · Hanging Gardens · Rite of Plenty | PC ME | Sky |
| Divination | 16 | Husbandry | augur · shrine · The Oracle · Rite of the Harvest · Recasting the Omens | E W | Fate |
| Letters | 24 | Earthenware, Divination | library · Great Ziggurat · Omen Reading (writing born on oracle bones) | ME E | Fate |
| The Wheel | 26 | Husbandry, Bronzeworking | chariot, chariot archer · granary renewal | ME | — |

### Æra II — The Age of Heroes (11 nodes, 45–130🔬)

Buildings that generate renown; great people unlocked; trade routes; the first prophet. Two
of the eleven are the "more mythological" nodes the user asked for (The Deluge Remembered,
The Long Count) beside the canon spine (Epic Poetry, Kingship, Ancestor Rites).

| node | 🔬 | prereqs | package | tradition | thread | needs |
|---|---|---|---|---|---|---|
| **Epic Poetry** ✎ | 45 | Letters | **Hall of Deeds** (+2🎵 +1 happiness, +1 renown/turn to the Artist family) · **amphitheater**, **Theatre of Dionysus** (from Drama, which leaves) · rule *the fallen become verse*: a friendly unit's death pays 🎵 to the nearest city | W ME (Homer, Gilgamesh) | ✦ | the death-culture line on a tech |
| **Kingship** | 50 | Stonecraft, Letters | **Stele of Laws** (+2 authority capacity) · *(later)* the King List: capital yields scale with the age of the line | ME (Hammurabi, the King List) | ✦ | King List: turns since founding |
| **Ancestor Rites** ✱ | 55 | Divination, Stonecraft | **unlocks the great-person offer** (the honoured dead return as the great) · **Ancestor Mound** = monument renewal (+1🎵 +1 authority, +1 renown/turn to the Scholar family) | E PC (ancestor veneration; the lineage of the dead) | ✦ | — (great people are built; the *gate* is the new thing) |
| **The High Temple** ⬆ | 170 → band | Divination, Stonecraft | as built: temple, **prophets** (found · plant · enhance · proclaim · redraft), The Preaching · candidate +1 pantheon slot | ME (the ziggurat) | ✦ | — |
| **Currency** ⬆ ✎ **moved here** | 210 → band | Letters, Caravans | **the trade system** as built: trader, market + route capacity, Colossus, Mausoleum | ME W E (Lydia, cowrie, the denarius) | — | — |
| **Caravans** ✎ | 80 | Calendar, The Wheel | **Bazaar** (+2🪙, +1🪙 on luxury resources) · the Founders' Road is live | ME | — | — |
| **The Deluge Remembered** ✱ | 60 | Earthenware, Sailing | *every people remembers the flood*: **Levee** = granary renewal (+1🌾 in a city beside fresh water; a river city keeps 25% of its basket on growth) · floodplain farms allowed | ME W E PC (Utnapishtim, Noah, Manu, the Popol Vuh's flood) | Water | — |
| **Irrigation** ✎ | 65 | Calendar, Earthenware | farm renewal **+1🌾 on farms beside fresh water** (moves here from Feudalism) · **lake tiles +1🌾** | ME PC (Mesopotamia; the chinampa's first rumour) | Water | — |
| **Standing Stones** ✎ | 70 | Stonecraft, Divination | **Standing Stones** improvement (worker-built, open flat ground, +1🎵 +1🕯) | W PC (Göbekli Tepe, Stonehenge, the Olmec heads) | Sky ✦ | a row + a sculpt |
| **The Long Count** ✱ | 95 | Calendar, Letters | *the calendar that counts the ages*: **the age's objectives are shown a turn before the age opens** (the Bead Race's public goals, Part 6; until then +2🔬 in the capital) · Calendar renewal: plantations +1🎵 | PC (the Maya count; speculative — the magister has heard of a people who number the world's ages) | Sky | the Bead Race |
| **Bronze Panoply** ✎ | 90 | Bronzeworking, The Wheel | **Phalanx** (spearman upgrade; str 10, anti-mounted) · barracks renewal **+1⚙** · auto-upgrade (built) | W (the hoplite) | Fire | — |
| **Wayfinding** ✎ | 110 | Sailing, Husbandry | **military units may embark** · **Harbour** (coastal; +1🌾 on worked sea resources, +1 route capacity) | PC W (the songlines, the Phoenicians) | Water | the embark rule's third clause |

### Æra III — The Age of Empire (12 nodes, the shipped Æra II re-banded plus five, 170–320🔬)

Rome and the Han, the Caliphate and the khanates. Late settling, the premiere line of every
military class, the university and a premiere culture house, and the mechanics of ruling many
cities at once. **The premiere roster the age adds**: melee **Legionary** (W), anti-cavalry
**Spear Wall** (E — the Han crossbow-and-halberd line, as the pike's better), cavalry
**Cataphract** (ME — Parthian and Sassanid), ranged **Horse Archer** (E — the Mongol
`mountedRanged` premier), siege **Trebuchet** ⬆ (already Æra III in role). Each is a row with
`upgradesTo` from its Æra II ancestor and the strategic gate its kind carries.

| node | 🔬 | prereqs | package | tradition | thread | needs |
|---|---|---|---|---|---|---|
| **Iron Working** ⬆ | 170 | Bronze Panoply, Stonecraft | swordsman (iron-gated) · Terracotta Army, Statue of Zeus | E W | Fire | — |
| **The Legion** ✱ | 190 | Iron Working, Kingship | **Legionary** (melee premier; str 17; iron; may build a road step when it ends its turn on unpaved ground — the roads the legions left) · **Castrum** = barracks renewal (+1 happiness, units built here +1 hp stamp) | W (Rome) | Fire | a unit that lays road: `layRoad` from `arriveOnTile` exists |
| **Mathematics** ⬆ | 200 | Letters, The Wheel | catapult · **Scholarship** project renewal 20⚙ → 6🔬 · Petra | ME W (al-Khwarizmi, Euclid) | Sky | — |
| **Construction** ⬆ | 240 | Stonecraft, Fletching | composite bowman, aqueduct · **Baths** (+2 happiness) · Circus Maximus | W | Water | — |
| **Rhetoric** ⬆ (Philosophy, renamed per Entry X) | 255 | Letters, Divination | **Forum** — the premiere culture house (+3🎵, +1 renown/turn to the Artist family; a Statecraft draft comes one tier sooner while you hold three) · Great Library | W (Cicero, the agora) | Fate | — |
| **Engineering** ⬆ | 275 | Mathematics, Construction | **workshop**, watermill · Great Wall | E W (Zhang Heng, Vitruvius) | Water | — |
| **The Imperial Post** ✱ (was The Royal Road) | 230 | Engineering, Currency | *the yam, the cursus publicus, the Persian road*: roads cost nothing to maintain within 3 hexes of a city · connected cities +1🪙 and +1🔬 · caravans +1 movement | E ME W (the khan's riders, Darius' road) | — | road maintenance exists (`explainEmpireGold`) |
| **The Steppe Bow** ✱ | 260 | The Wheel, Husbandry | **Horse Archer** (mountedRanged premier; str 14 / ranged 14, range 2, horses) · **Keshig** rule: mounted units ignore zone-of-control tolls | E (the Mongols, the Xiongnu) | — | — |
| **The Cataphract** ✱ | 280 | The Steppe Bow, Iron Working | **Cataphract** (cavalry premier; str 22, horses + iron; +3 vs ranged) · stables = a pasture renewal (+1⚙) | ME (Parthia, the Sassanids, Byzantium) | Fire | — |
| **The Halberd Wall** ✱ | 250 | Bronze Panoply, Engineering | **Spear Wall** (anti-cavalry premier; str 18; +50% vs mounted; fortifies twice as fast) | E (the Han ji, the Qin crossbow lines) | Fire | — |
| **The Examination Hall** | 175 | Kingship, Letters | **Examination Hall** (+3 authority capacity) · Great Warring Tribes' courthouse bar wakes · authority tier +5 → 10% becomes 15% | E (the Han and Tang examinations) | ✦ | — |
| **The Qadi's Court** ✱ | 300 | The Examination Hall, The High Temple | *law under heaven*: captured cities cost one less authority · cities that follow your religion +1 authority capacity per 3 · **Madrasa** = library renewal (+1🔬 +1🕯) | ME (the Caliphate's judges and schools) | ✦ Fate | — |
| **Colonial Charters** ✱ | 220 | Currency, Construction | *late settling*: settlers cost −25% and a city founded from now on starts with a Monument and a Granary · a new city within 3 hexes of another empire's border costs no authority (Marcher Lords' rule) | W ME (Rome's coloniae, the ribats) | — | `foundingRider` (exists) |
| **The Knotted Cord** ✱ | 310 | Currency, Mathematics | *accounts kept in knots*: each trade route +1🔬 · +1 authority capacity per 4 cities connected to the capital · the Trade screen shows every empire's route count | PC (the quipu — speculative: the magister imagines a people who remember in string) | Fate | — |
| **The Orrery of Bronze** | 200 | Mathematics, Rhetoric | library renewal (+1🔬 per library, +1 more with a Madrasa) · Antikythera, the first Sky device | W | Sky Fate | — |
| **Education** ⬆ **moved down** | 810 → band | Rhetoric, The Examination Hall | **university** — the premiere science house, in Æra III by the user's brief · House of Wisdom, Forbidden City | ME E W | Fate | — |

*Fifteen rows are listed so the user can cut to twelve; the five military nodes are the
non-negotiable half of the brief.*

### Æra IV — The Age of Cathedrals (10 nodes, 480–810🔬 — the shipped Æra III re-banded plus three)

Executing late-game objectives. Every node here should hand the player something that pays a
**bead** (Part 6) or makes one reachable: the walls that hold the objective city, the
university's successor, the trade tier that dominates a resource, the faith that converts a
world. The three additions each carry one of the four traditions the shipped rows lack.

| node | 🔬 | prereqs | package | tradition | thread | needs |
|---|---|---|---|---|---|---|
| **Feudalism** ⬆ | 480 | The Legion, Currency | pikeman → **Spear Wall** ancestor · **Castle** (+8 city defence, the Walls line tier two) · serfdom — farms +1⚙ under an Order of the age | W E (the manor, the fubing) | Fire | — |
| **Machinery** ⬆ | 515 | Engineering, Construction | crossbowman · **Windmill** = workshop renewal (+2⚙ on flat cities) · Water Clock of Su Song | E (Su Song) | Sky | — |
| **Theology** ⬆ | 565 | Rhetoric, Epic Poetry | monastery · **Cathedral** (+3🕯 +2 happiness; the Curia's home) · rite **The Mysteries** · enhancers · the five wonders as built | W ME | ✦ | — |
| **Chivalry** ⬆ | 615 | Feudalism, The Cataphract | knight · **Tourney Ground** (barracks renewal) · Alhambra | W ME | — | — |
| **Steel** ⬆ | 685 | Iron Working, Machinery | longswordsman · **Forge** (+15%⚙ on units; +1⚙ per mine) · war elephants where ivory is held | E W (Damascus and Toledo steel) | Fire | — |
| **Physics** ⬆ | 750 | Mathematics, Engineering | trebuchet · Machu Picchu | ME W (Ibn al-Haytham) | Sky | — |
| **The Silk Road** ✎ | 600 | Currency, The Imperial Post | **Caravanserai** (+2🪙, +1 route capacity) · luxuries imported by route count as held · routes may reach two cities further · Great Mosque of Djenné's route line | E ME (Samarkand, Mansa Musa's road) | — | — |
| **Movable Type** | 640 | Letters, Machinery | **Printing House** (+2🔬 +2🎵) · every library +1🎵 · one extra Order offer per draft | E W (Bi Sheng, Gutenberg) | Fate | — |
| **The First Distillation** | 700 | Earthenware, Theology | *alchemy begins*: **Distillery** = market renewal (+2🪙, +1 happiness where wine/spirits is held) — The Adepts and The Philosopher's Stone wake | ME E (Jabir, the jindan) | Fire | — |
| **The Floating Fields** ✱ | 560 | Irrigation, The Knotted Cord | *the city on the lake*: coastal and lake cities may build **Chinampas** (a worked water tile beside the city yields +2🌾 +1🎵) · **Causeways**: a city on water counts as connected to any city it can see across it | PC (Tenochtitlan — speculative: the magister has heard of a city that floats) | Water | a water improvement (a row; the sculpt) |
| **The Astrolabe** ✱ | 520 | Physics, Wayfinding | ocean crossable · embarked units +1 movement and +1 sight · **Observatory** (+3🔬, +1 more beside a mountain) · the compass's first half (the second is The Luopan) | ME (the Islamic astronomers; the mariner's astrolabe) | Sky | ocean `embarkable` |

### Æra V — The Age of the Magister (10 nodes, 900🔬 and up)

The future as the renaissance dreamed it. Each node is one of three things: a **multiplier**
(a building or rule that scales a yield the empire already makes), a **power spike** (a unit
or rule that changes what an army or a city can do), or an **accelerant** (an explicit push
toward the win — beads, the Opus, the curtain). The register is the magister's speculation:
the far peoples' arts imagined, the alchemist's promises kept.

| node | 🔬 | prereqs | package | kind | tradition | thread | needs |
|---|---|---|---|---|---|---|---|
| **The Luopan** | 900 | The Astrolabe, The First Distillation | geomancy: the settler lens shows the land's veins (site bonuses +50%, a hidden luxury within 3 hexes of a founded city) · every city +1 sight | accelerant (late settling's last word) | E (feng shui, the compass) | Sky | lens data |
| **Fire Medicine** | 950 | The First Distillation, Physics | **Bombard** (trebuchet upgrade) · **Rocket Arrows** (crossbow upgrade, range 2, + vs cities) · castle renewal +4 defence | power spike | E (火藥 — "they sought eternal life; they found this") | Fire | — |
| **The White Gold** | 1000 | The First Distillation, Earthenware | **Porcelain Works** mints a luxury no tile has (+4 happiness as a unique luxury; tradeable) · **the Economic bead: hold the most copies of a manufactured luxury at the age's close** | multiplier + accelerant | E (Jingdezhen) | Fire | manufactured luxury |
| **The Perspective Glass** | 1050 | Education, The Astrolabe | optics: every city +1 sight · **Observatory** renewal (+4🔬) · reveals every unrevealed resource on explored land · wonder **The Astronomical Bureau** (+6🔬; the next age's objectives shown at once) | multiplier | W E (Galileo, the imperial star ministry) | Sky | a 28th wonder |
| **The Clockwork Servant** | 1100 | Machinery, The Orrery of Bronze | automata: **Clockwork Worker** — never expends charges · Windmill renewal +1⚙ · Forge +1 renown/turn to the Engineer family | power spike | ME E (al-Jazari, Yan Shi) | Sky Fate | `chargesLeft` absent = infinite |
| **The Obsidian Mirror** ✱ | 1150 | The Perspective Glass, The Long Count | *the smoking mirror shows what is far*: **every seat's bead count and Opus progress is visible on the Abacus** · your capital sees every hex within 6 · +1 Magister's Die | accelerant (the two-minute warning made permanent) | PC (Tezcatlipoca's mirror — speculative: a glass that shows the whole world at once) | Sky Fate | the Bead Race · dice |
| **The Loom That Remembers** | 1200 | The Silk Road, Movable Type | Jacquard: plantations +1🪙 +1🎵 · **Manufactory** = Forge renewal (+3⚙; the Manufactories Order's home) · +25%⚙ empire-wide toward buildings | multiplier | W (Jacquard) | Fate | — |
| **Mesmerism** | 1250 | Theology, The Perspective Glass | **The Entranced Workforce** project: 25 happiness surplus → +30%⚙ in a city for 10 turns · **the Culture bead: the most followers of your religion in foreign cities at the age's close** | accelerant | W (Mesmer; fashionably sinister) | — | a project priced in a meter surplus |
| **The Paper Lantern That Lifted** | 1300 | Fire Medicine, The Perspective Glass | **Aerostat**: sight 5, ignores terrain, cannot fight, cannot be attacked by melee · +1 happiness · **the Domination bead: hold a city on every continent** | power spike + accelerant | E (the Kongming lantern) | Sky | `unattackable` |
| **The Calculating Engine** | 1400 | The Loom That Remembers, The Clockwork Servant | **The Engine** (+8🔬, +1 Magister's Die per age, science +25% in its city) · Scholarship renewal 20⚙ → 8🔬 · **the Science bead: first to complete the Engine** | multiplier + accelerant | W (Babbage) | Fate | dice economy |
| **The Great Work** | 1500 | The Calculating Engine, The White Gold | **the Magnum Opus** — the golden bead's only source (Part 6) | the win | ME W (the alchemists' opus; from reading entrails to transmuting the world) | Fire Fate Sky | the Bead Race |

### What moves in the shipped tree

| shipped | today | proposed | why |
|---|---|---|---|
| **Currency** | Æra II (170🔬 band, Empire in role) | **Æra II Heroes** (the user, 2026-08-29) | trade routes are a Heroes goal |
| Education | Æra III | **Æra III Empire** (down from Cathedrals) | the university is the premiere science house the Empire brief asks for |
| Philosophy | a name | **Rhetoric** (Entry X, applied at last) | its building is the Forum |
| Drama and Poetry | a node | gone — Epic Poetry takes its rows | the user's edit |
| Theology's prereq | Drama | Epic Poetry | follows |
| Feudalism → freshwater renewal | Æra III | → Irrigation (II); Feudalism gets the Castle | growth with the Gardens, a wall with the pike |
| Iron Working's prereq | Bronzeworking | Bronze Panoply | the Fire thread runs Bronze → Panoply → Iron |
| Currency's second prereq | Stonecraft | Caravans | gold descends from trade |
| The Royal Road / The Silk Road | packages spent by shipped systems | The Imperial Post (III) / The Silk Road re-gifted (IV) | ruling 3 |
| wonders | as built | **stay** | ruling 2 |

Count: I 12 · II 11 · III 15 (cut to ~12) · IV 11 (cut to ~10) · V 10 → **59 rows, ~54 after the
cut**; Entry V wanted 45–55. Tradition tally across the new and re-flavoured rows: W 14 ·
ME 12 · E 12 · PC 6 (the six speculative ones: The Long Count, The Knotted Cord, The Floating
Fields, The Obsidian Mirror, Standing Stones' Olmec half, Wayfinding's).

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
