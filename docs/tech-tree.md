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
3. **Currency keeps the trade system** (user, 2026-08-29): the trader unit, the market and
   its route capacity, the Colossus and the Mausoleum. Roads are laid **by caravans**
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

## Part 3 — The proposal: five ages (the user's cut, 2026-08-29)

Legend: **prereqs** are display order; **thread** is the lineage (Fate, Fire, Sky, Water, ✦
the canon spine); **needs** names what is still unbuilt (blank = today's mechanisms). ⬆ marks a
shipped node re-banded; its cost is the shipped one. ✎ marks the user's edits.

### Æra II — The Age of Heroes (new band, 45–110🔬, ~9 nodes)

The Iliad, Gilgamesh, the Shang, Assyria. The age the admin, science, culture and gold
buildings arrive, one each. Military is modest by design: one unit line and the first wall.

| node | 🔬 | prereqs | package | thread | needs |
|---|---|---|---|---|---|
| **Epic Poetry** ✎ | 45 | Letters | **Hall of Deeds** (+2🎵, +1 happiness) · rule *the fallen become verse* — a friendly unit's death pays 🎵 to the nearest city · **amphitheater** and **The Theatre of Dionysus** move here from Drama, which leaves the tree | ✦ | the death-culture hook is one `windfallRider`-shaped line on a tech |
| **Kingship** | 50 | Stonecraft, Letters | **Stele of Laws** building (+2 authority capacity — cities cost 3 / 2 / 4 now, so it has a job) · *(later)* the King List: capital yields scale with the age of the line | ✦ | King List: "turns since founding" on the capital |
| **The High Temple** ⬆ | 170 → *re-price into the band* | Divination, Stonecraft | as built: temple, prophets (found · plant · enhance · proclaim · redraft), The Preaching · candidate: +1 pantheon slot | ✦ | — |
| **Irrigation** ✎ | 65 | Calendar, Earthenware | farm renewal **+1🌾 on farms beside fresh water** (moves here from Feudalism, which gets the castle) · floodplain farms allowed | Water | — |
| **Standing Stones** ✎ | 70 | Stonecraft, Divination | **Standing Stones** improvement (worker-built, open flat ground, +1🎵 +1🕯 — the first thing a people builds that is not food) | Sky ✦ | a data row + a sculpt |
| **Caravans** ✎ | 80 | Calendar, The Wheel | **Bazaar** building (+2🪙, +1🪙 on luxury resources) · the Founders' Road is live; the caravan is the promise | — | — |
| **Bronze Panoply** ✎ | 90 | Bronzeworking, The Wheel | **Phalanx** (spearman upgrade; str 10, +25% vs mounted) · barracks renewal: **barracks +1⚙** · auto-upgrade on research (built) | Fire | `upgradesTo` on the unit row (exists) |
| **Wayfinding** ✎ | 110 | Sailing, Husbandry | **military units may embark on coast** · **Harbour** building (coastal; +1🌾 on worked sea resource tiles) · *(the Great Lighthouse stays on Sailing by ruling 2)* | Water | the embark rule's third clause (`moveProfile`) |

### Æra III — The Age of Empire (the shipped Æra II re-banded, 130–305🔬, ~10 nodes)

Rome, the Han, Alexander, the Maya. Roads and trade are **built** and live at Currency; the
age is for the administrative family and the first "science felt like magic" renewal.

| node | 🔬 | prereqs | package | thread | needs |
|---|---|---|---|---|---|
| **Iron Working** ⬆ | 170 | Bronze Panoply, Stonecraft | swordsman (iron-gated, built) · Terracotta Army, Statue of Zeus (as built) | Fire | — |
| **Currency** ⬆ | 210 | Letters, Caravans | **the trade system** (trader, market + route capacity, Colossus, Mausoleum — ruling 3) | — | — |
| **Mathematics** ⬆ | 200 | Letters, The Wheel | catapult · **Scholarship** project renewal 20⚙ → 6🔬 · Petra | Sky | — |
| **Construction** ⬆ | 240 | Stonecraft, Fletching | composite bowman, aqueduct · **Baths** building (+2 happiness) · Circus Maximus | Water | — |
| **Philosophy** ⬆ | 255 | Letters, Divination | **Lyceum** building (+3🔬, the mid-game science house) · Great Library (a free technology, +3🔬 — grants exist) | Fate | — |
| **Engineering** ⬆ (ruling 4) | 275 | Mathematics, Construction | **workshop**, watermill · Great Wall (as built: the ZOC rule empire-wide) | Water | — |
| **The Royal Road** ✎ needs a package | 150 | Engineering, Caravans | *roads shipped by caravans; the old package is spent.* Candidates: a road-movement renewal (paved steps free of the ground for the holder), or the **King's Road** Æra III Order's building half | — | a new gift |
| **The Examination Hall** | 175 | Kingship, Letters | **Examination Hall** building (+3 authority capacity) · Great Warring Tribes' courthouse bar wakes · authority tier +5 → +10%⚙ becomes +15% | ✦ | — (doctrine halves are data) |
| **The Orrery of Bronze** | 200 | Mathematics, Philosophy | library renewal (+1🔬 per library, +1 more with a Lyceum) · **Antikythera** — the first Sky device; foreshadows Clockwork and the Engine | Sky Fate | — |

### Æra IV — The Age of Cathedrals (the shipped Æra III re-banded, 480–810🔬, ~10 nodes)

The House of Wisdom, Song China, Mansa Musa, the sagas, the khanates — the age the world
talks to itself along the Silk Road. Plus the three the eastern mainline owes: movable type,
the beginning of alchemy, and the trade network's second tier.

| node | 🔬 | prereqs | package | thread | needs |
|---|---|---|---|---|---|
| **Feudalism** ⬆ | 480 | Iron Working, Currency | pikeman · freshwater-farm renewal *leaves* (to Irrigation) · **Castle** building (+8 city defence; the Walls line, tier two) · **serfdom** — farms +1⚙ under an Order of the age (upkeep is built) | Fire | — |
| **Machinery** ⬆ | 515 | Engineering, Construction | crossbowman · **Windmill** = workshop renewal (+2⚙ on flat cities) · Water Clock of Su Song | Sky | — |
| **Theology** ⬆ | 565 | Philosophy, Epic Poetry | monastery · **Cathedral** building (+3🕯 +2 happiness; the Curia's home) · rite **The Mysteries** (temple renewal +1 happiness) · enhancers (built) · the five wonders as built | ✦ | — |
| **Chivalry** ⬆ | 615 | Feudalism, Husbandry | knight · **Tourney Ground** (barracks renewal: +1 happiness, mounted +1 combat) · Alhambra | — | — |
| **Steel** ⬆ | 685 | Iron Working, Machinery | longswordsman · **Forge** building (+15%⚙ on units; +1⚙ per mine) · **war elephants** where ivory is held | Fire | a unit row with `requiresResource` (exists) |
| **Physics** ⬆ | 750 | Mathematics, Engineering | trebuchet · Machu Picchu | Sky | — |
| **Education** ⬆ | 810 | Theology, Philosophy | university · House of Wisdom, Forbidden City · the Athenaeum's condition relaxes | Fate | — |
| **The Silk Road** ✎ needs a package | 300 → band | Currency, The Royal Road | *trade routes shipped at Currency; the old package is spent.* Candidates: **Caravanserai** building (+2🪙, +1 route capacity) · imported luxuries count as held (The Silk Exchange's Order half) · route range +1 | — | a new gift |
| **Movable Type** | 330 → band | Letters, Machinery | **Printing House** building (+2🔬 +2🎵) · every library +1🎵 · one extra Order offer per draft (`offerRider`, exists) | Fate | — |
| **The First Distillation** | 360 → band | Earthenware, Theology | *alchemy begins* · **Distillery** = market renewal (+2🪙, +1 happiness where wine/spirits is held) — The Adepts and The Philosopher's Stone wake · opens the Fire thread's last run | Fire | — |

### Æra V — The Age of the Magister (new band, ~500–750🔬 → re-band above 810, ~10 nodes)

The magister's dream of the future: brass, aether, clockwork, never smokestacks. Most games
end here or just before; every node is a post-victory accelerant, a game-ender, or the road
to the Magnum Opus.

| node | 🔬 | prereqs | package | thread | needs |
|---|---|---|---|---|---|
| **The Luopan** | 500 | The First Distillation, Wayfinding | geomancy: the **settler lens shows the land's veins** (site bonuses stronger, a hidden luxury revealed within 3 hexes of a founded city) · the compass — embarked +1 movement, ocean crossable | Sky | lens data + `embarkable` on ocean |
| **Fire Medicine** | 520 | The First Distillation, Physics | **Bombard** (trebuchet upgrade) · **Rocket Arrows** (crossbow upgrade, range 2, + vs cities) · castle renewal +4 defence | Fire | — |
| **The White Gold** | 560 | The First Distillation, Earthenware | **Porcelain Works**: mints a luxury no tile has (The Porcelain Trade's home) | Fire | **manufactured luxury** — a `resourceKind` a building supplies |
| **The Perspective Glass** | 580 | Education, The Luopan | optics: every city +1 sight · **Observatory** (+4🔬 on hills / mountain-adjacent; The Aerostat Corps' second half) · reveals every unrevealed resource on explored land · wonder **The Astronomical Bureau** (+6🔬; the final age's objectives a turn early) | Sky | a 28th wonder — the user's call |
| **The Clockwork Servant** | 600 | Machinery, The Orrery of Bronze | automata: **Clockwork Worker** — never expends charges · Windmill renewal +1⚙ | Sky Fate | `chargesLeft` absent = infinite (a row flag) |
| **The Loom That Remembers** | 620 | The Silk Road, Movable Type | Jacquard: plantation +1🪙 +1🎵 renewal · **Manufactory** = Forge renewal (+3⚙; the Manufactories Order's home) | Fate | — |
| **Mesmerism** | 640 | Theology, The Perspective Glass | **The Entranced Workforce** project: 25 happiness surplus → +30%⚙ in a city for 10 turns | — | a project priced in a meter surplus |
| **The Paper Lantern That Lifted** | 680 | Fire Medicine, The Perspective Glass | **Aerostat**: sight 5, ignores terrain, cannot fight, cannot be attacked by melee · +1 happiness | Sky | `ignoresTerrainCost` + an `unattackable` flag |
| **The Calculating Engine** | 720 | The Loom That Remembers, The Clockwork Servant | **The Engine** building: +8🔬, +1 Magister's Die per age · Scholarship renewal 20⚙ → 8🔬 | Fate | dice economy (until then: the science) |
| **The Great Work** | 750 | The Calculating Engine, The White Gold | **the Magnum Opus** — Entry VI's capstone: a declared, multi-turn project in the capital, announced to every seat, interruptible by siege | Fire Fate Sky | **the Bead Race** (victory) |

### What moves in the shipped tree

| shipped | today | proposed | why |
|---|---|---|---|
| Feudalism → freshwater-farm renewal | Æra III | → Irrigation (Æra II); Feudalism gets the Castle | growth belongs with the Hanging Gardens, a wall with the pikeman |
| Iron Working's prereq | Bronzeworking | Bronze Panoply | the Fire thread runs Bronze → Panoply → Iron |
| Currency's second prereq | Stonecraft | Caravans | gold descends from trade, not masonry |
| Drama and Poetry | a node | gone — Epic Poetry takes its rows | the user's edit |
| Theology's prereq | Drama | Epic Poetry | follows |
| ages | I / II / III | I / **II inserted** / III / IV / V | the whole point |
| temple | The High Temple (built) | stays | already where the proposal wanted it |
| wonders | as built | **stay** | ruling 2 |

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

- **Curtain**: five ages at ~t185, or compress Heroes/Empire to hold ~t160? The built three
  close at ~t30 / t67 / t139 on the pacing seed after today's balance rulings.
- **The Royal Road and The Silk Road** need packages (ruling 3). Keep the names and give
  them the candidates above, or drop to nine nodes in those ages?
- **Heroes' military** is one unit and one wall — a builder's age by design, or a second
  line?
- **Re-pricing**: The High Temple sits at 170 in the Heroes band whose ceiling is 110; either
  it drops into the band or the band rises. Same question for the four Æra IV additions
  (300–360) against a 480 floor and Æra V against 810.
- **A 28th wonder** (The Astronomical Bureau) — or the Bureau becomes a building.
- **Mesmerism / The Paper Lantern**: both in the tree, or one to the roll pools?

## Revisions

*(yours — edit away; ✎ marks what changed)*
