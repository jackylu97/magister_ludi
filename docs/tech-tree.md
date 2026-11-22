# The Technology Tree — reference

The as-built tech reference. Part 2's tables are **generated from the rows** —
never hand-maintained. The generator is no longer a throwaway: it is
`test/sim/techDocSync.test.ts`, which walks `TECH_IDS`, asks `techGifts` what
each node hands over, asks the tree's own describers what its rules say, and
prints the markdown. Regenerate with

    TECH_DOC_WRITE=1 npx vitest run test/sim/techDocSync.test.ts

which rewrites everything from the first `### Æra` heading down and leaves the
hand-written halves (Part 1, and the preamble below it) alone. The same test run
without that variable **fails on any drift**, line by line, so hand-editing a
generated row is caught by core rather than discovered a batch later.
Companions: `docs/wonders.md`,
`docs/trade.md`, `docs/religion-v2.md`, `docs/great-people.md`. The design
history (proposals, re-cuts, the five-age plan) lives in git and
`docs/history/design-history.md`.

## Standing determinations

- **Five ages**: I Omens · II Heroes · III Empire · IV Cathedrals · V Magister
  (V is a shelf — deliberately unbuilt). Ages follow the drawn columns
  (revision 4.2: columns 9–12 are Æra IV).
- **A column IS a price**: one table indexed by `techColumn`
  (`src/sim/tech.ts` docblock has it; the root's 5 is never paid).
  Adding a tech = placement: prereqs pick the column, the column prices it
  (`src/sim/techData.ts` placement docblock).
- **The ladder is one fitted curve, 5 to 8000** (user ruling 2026-09-09, item
  (hhh) — "fit a curve that fits roughly the shape, starting at 5 and ending
  around 8000"). A log-quadratic in the chart column `n` (the root is 0), fitted
  least-squares to the user's own thirteen figures and pinned at both endpoints:

      ln cost(n) = ln 5 + 0.8084·n − 0.01613·n²
      friendly:   nearest 1 below 30 · nearest 5 below 300 ·
                  nearest 10 below 2000 · nearest 50 above

  **Every column is the curve's** — no authored figure is left in the table, and
  no column is priced by a different argument from its neighbours. Retuning the
  chart is re-fitting the two constants and re-rounding, never editing a row.
- **It is still a taper, not an exponential**: the *ratio* between columns is
  itself a decaying exponential (`e^(0.8084 − 0.01613·(2n+1))`) — 2.2× at the
  opening, 1.55× at the close — so an exponential opening flattens toward the
  end. The Æra III → IV seam is 1.70×, the same size of step as every other
  column: the closing age is dear because it sits at the far end of the curve,
  not because a multiplier was laid on it.
- **The chart is the user's drawing**: lanes (`row`) and column nudges
  (`columnShift`) are authored data; the annealer only advises on new nodes;
  crossings pinned exactly, false chains zero (`test/ui/techChart.test.ts`).
- **The 27-wonder slate stays** at its current homes. Its prices are no longer
  hand-tuned rows: batch P1 took the figure off every building row, wonders
  included, and a wonder is now `size: 'wonder'` priced by its unlocking node's
  column like everything else (see the hammer-price bullet below).
- **Embarkation splits**: civilians + scout at Sailing (`embark`); soldiers at
  Wayfinding (`militaryEmbark`, "Sea Legs").
- **The naval triangle** (light melee kites → ranged kills heavy → heavy kills
  light) holds from Æra III on; the Fire Ship has range 2 by ruling. Hulls:
  one drawn hull per age + a class canton (`badges.byUnitType`).
- **Auto-upgrade** (`upgradesTo`) is gated on the strategic resource and swept
  every turn; the walk also stops at a rung no technology reaches yet
  (`awaitsTech`).
- **Obsolescence is that same walk read of a type** (`upgradeTargetForType`):
  a unit whose successor this empire could field today is refused by
  `buildError` ("has been replaced by the …") and hidden from the city panel's
  build list. It stays offered while the successor is out of reach — an
  unresearched tech, or a strategic resource the empire cannot access — and
  comes back if that access is lost. A row already standing in a town's queue is
  excused by the gate (so the queue stays editable) and builds out: nothing is
  dropped, and no queue stalls.
- **Five ordinary techs carry a rule** since batch TT2 (`docs/flags.md`
  (iiiiiii) and (jjjjjjj)): Code of Laws, The Wheel, State Workforce, Daughter
  Cities and The Golden Roads. The user ruled that an unlock is obvious and a
  passive bonus is easy to miss, and cut the rest in batch TT1. Four
  improvement renewals stay (Irrigation, Currency, The Saddle, Geomancy). The
  charter technologies keep their own rules. Before the cut, batch E had given
  the re-gifted nodes their own rules (`docs/history/tech-gifts.md` §7).
- **A kept bonus is the node's headline.** It is listed first among the node's
  gifts (`techGifts`), and the star chart prints it first on the node's face,
  above the units and buildings (`techHeadlines`, `src/ui/techTree.ts`).
- **Batch TT2** (2026-11-11): Divine Right left the tree with its one bonus,
  and Castellany takes Guildhalls as its parent (column 9, not 10). The
  Courthouse moved from Iron Working to The Civil Service, which lost its
  great-person works bonus. The second extra worker charge moved from Bronze
  Panoply to The Wheel.
- **Every hammer price** takes its column from the unlocking tech, never the row
  — units, buildings and wonders alike (`docs/production-costs.md`, batch P1):
  `sizeHammers[size] × columnRate ^ (column − 1)`, the row carrying a size and
  the tree carrying the rest, one line in the cost fold for each. The first
  column is the floor, so a row the root opens is priced with the opening kit. A
  row no technology unlocks carries its own `column` — a charter's building takes
  the first column of its pool's age. A ‡ row (one to a realm) carries a third
  line, `√(cities ÷ 4)` (item dd).
- `TechDef` may carry `paysBead` (Alchemy, `theClosingWork`); abilities ride
  `techsGrant` (`ABILITY_TECH`). `ageEntryDice` is **gone** — the dice went with
  `Player.dice` and `BeadRules.startingDice`. Chronology's Long Count verb is
  the faith redraw of an Order draft; its early sight of the next age's beads
  went with the beads (batch Q1).

## Part 2 — As built (generated; see the header for the command)

Generated from the rows — never hand-maintained. Five tables feed it:
`data/techs.json` for the nodes and their unlocks, `data/units.json` and
`data/buildings.json` for the marks a row wears, `data/improvements.json` for
what a worker may lay and for the renewals, and `data/resources.json` for what a
node reveals. Costs come off the column table
(`src/sim/tech.ts`, "a column is a price"): one figure per chart column,
5 · 11 · 24 · 50 · 100 · 190 · 360 · 650 · 1150 · 1960 · 3250 · 5150 · 8000.
Every one of the thirteen is the fitted curve of the ruling of 2026-09-09,
rounded — `ln cost(n) = ln 5 + 0.8084·n − 0.01613·n²` over the chart column `n`
(the root is 0), `friendly` to the nearest 1 below 30, 5 below 300, 10 below
2000 and 50 above (see the standing determinations; re-fit the two constants
rather than retyping a figure). The four ages cost 269 / 1350 / 10440 / 53300🔬
— 65359 for the whole tree, 65354 of it payable (the root's 5 is nobody's
price). `test/sim/techDocSync.test.ts` generates every line below and fails on
any drift — the costs, the node names, all three unlock columns and the rule
bullets alike.

How to read the columns:

- Wonders in **bold** (`BuildingDef.wonder`); ‡ = a row **one to a realm**
  (`oncePerEmpire` — the five uniques of the fewer-things cut, the three
  national rows that always wore it, and the Bourse, a ninth since E4b because a
  `pays` rate read off the empire's books can only be read once); ◇ = a row that
  is granted and never built (`grantedOnly`); a *project* is italic and says so —
  a queue row that never leaves. A withdrawn row (`retired`) is not printed at
  all.
- † on a **node's name** = the row carries a deferred half; the clause itself is
  the † bullet under the table. No node carries one today: Code of Laws,
  Daughter Cities and Castellany had theirs built in batches E4a/E4b, and Epic
  Poetry's went with its rule in batch TT1.
- A unit that cannot be raised without a seam says so — `requiresResource` reads
  *(needs improved Iron)*. The **Trader** is the one row that is neither
  hammered nor bought: R1 (the user's ruling of 2026-09-09, `docs/flags.md`
  item (iii)) made routes purchasable in gold on the trade screen and the
  caravan arrives with the route, so the row says *(never built — …)* and stays
  in the table because it is still Currency's gift and still climbs the columns.
  A **building's** site requirement (`requiresSite` — a coastal town, a library,
  a captured city) is not printed here; the Compendium's building shelf says it
  in its own words rather than this file saying it in a second set.
- **Renewals survived the axe.** The user ruling of 2026-09-02 cut the
  *building* renewals — the `buildingRenewal` gift kind and the rows that fed it
  went on 2026-09-04 — and the *improvement* renewals (`ImprovementDef.upgrades`)
  stand: five of them, on four improvements, quoted in the star chart's own
  words by `renewalNote`. The one building gift that survived beside them pays
  the **ground** rather than the town (`buildingTileYield`), and no row carries
  one today.
- The **abilities & gifts** column carries everything that is not a thing a city
  builds, in `techGifts`' own order: the improvements a worker may lay, the verbs
  the node hands over, what it reveals on the map, its renewals, and Alchemy's
  bead. Each verb's own sentence is in the last table of this part.
- The bullets under a table are the node's **rules with their figures** — the
  clauses the star chart and the Compendium print (`techRuleClauses`) — followed
  by the node's own note in *italics*. The split is batch L1's
  (`docs/audit/legibility.md` §2): a note is hard-rule-7 prose with no numbers in
  it, so a balance pass reads the rule and a player reads the note.

**The fewer-things cut** (2026-09-06, `docs/history/fewer-things.md` §2): twelve ordinary
rows left the buildable set — Funeral Games, the Stele of Laws, the Monastery,
the Baths, the Examination Hall, the Clocktower, the Reliquary, the Mint, the
Armoury and the Printing House are withdrawn outright; the Forum and the
Caravanserai return as two of the five uniques. Their rows stay in
`data/buildings.json` so a save that raised one still replays.

The **Printing House came back** in batch E4b (`docs/audit/deferred-rows.md`):
what it had been waiting on was a route that could pay the town it *ends* at,
which is one field on the route shape now, so Movable Type opens a buildable row
again. Two rows joined the table in the same batch — the **Stable** at The Wheel
and the **Bourse** at Paper Money.

**The user's tree pass** (2026-09-10, `docs/flags.md` (uuu)). Nineteen marks
written straight onto this file and folded as data. **Raised Fields left the
tree** and **The Silk Road** took its slot, its column, its lane and its
prerequisite whole, with Shipwrights still chaining off it — the id
`raisedFields` is gone from `TechId`, so a save that researched it is refused
rather than replayed (schema 110), and the Floating Gardens moved to Irrigation
with the water that grows them. The Caravanserai came down one lane from
Mathematics onto the node written around the caravan; Petra stayed. Three nodes
that had handed over nothing now hand over a building — Irrigation's **Garden**,
State Workforce's **Public Bath**, and Bronze Panoply's **Smithy**, which came
out from behind The Toolmakers' Charter (retired with the door it opened). The
figures on the Barracks, the Stable, the Lighthouse, the Harbour, the Shipyard,
the Market, the Caravanserai and the plantation moved with them, and three nodes
gained or lost a rule: Satrapies no longer keeps a wide realm's roads for
nothing, The Saddle pays beakers and songs for a burnt field, and Siegecraft puts
a town's own citizens on its walls.

**Batch E — the tree's gifts** (2026-09-06, `docs/history/tech-gifts.md` §7 as the user
marked it). The six nodes batch D left handing over no building hand over
something else now, and every gift is a **row** rather than a branch: the effect
vocabulary the tree has carried since the Age I rework (`TechDef.effects`) plus
the engine shapes batch A declared. What each one says is printed under its age,
in the data's own words. The Examination Hall is renamed **The Civil Service**
(the id `theExaminationHall` is kept, so no save moves), Code of Laws hands over
the third conversion project, and Engineering is deliberately *not* on the list —
it kept three buildings and needed nothing.

**Batch TT1** (2026-11-10, `docs/flags.md` (iiiiiii)): most of the passive
bonuses on the nodes were cut, and the rule bullets under each age list only
what is left. Movable Type's science and production moved onto the Printing
House, for the town that holds it, and Bronze Panoply gained a second extra
worker charge. Batch TT2 (2026-11-11) moved that charge to The Wheel, removed
Divine Right, and moved the Courthouse to The Civil Service.

**The ten chains** (`BuildingDef.requiresBuilding`, a parent standing in the same
town): Palisade → Stone Walls → Castle · Monument → Amphitheater · Market →
Bazaar and Bank · Harbour → Shipyard · Library → University → Observatory ·
Workshop → Forge · Shrine → Temple.

The Library adds 3 science and the University adds another 6. The Amphitheater
adds 4 culture. Each building pays its full yield at any town size.

### Æra I — The Age of Omens (12 nodes, 5–50🔬)

| node | 🔬 | prereqs | units | buildings | abilities & gifts |
|---|---|---|---|---|---|
| Agriculture | 5 | — | Settler, Warrior, Scout, Worker | Granary, Hall of Deeds ‡ | workers may build Farm |
| Calendar | 11 | Agriculture | — | **The Hanging Gardens**, *Tithes* (project) | workers may build Plantation |
| Husbandry | 11 | Agriculture | — | **The Temple of Artemis**, Shrine | workers may build Pasture · reveals **Horses** · reveals **Camels** |
| Mining | 11 | Agriculture | — | **The Great Sphinx** | workers may build Mine · Clear Forest · reveals **Copper** |
| Pottery | 11 | Agriculture | — | Monument | — |
| Sailing | 11 | Agriculture | Trireme | Lighthouse, **The Great Lighthouse** | workers may build Fishing Boat · Embark |
| Bronzeworking | 24 | Mining | Spearman | Barracks, The School of Mieza, **The Walls of Uruk** | workers may build Lumbermill · Clear Jungle · Blessing of Arms |
| Divination | 24 | Husbandry | — | **The Oracle**, **The Temple of Thoth** | Rite of the Harvest · Omen Reading |
| Fletching | 24 | Calendar | Archer | — | workers may build Camp |
| Stonecraft | 24 | Pottery | — | Palisade, **Stonehenge**, **The Pyramids** | workers may build Quarry · Consecration of the Bounds |
| The Wheel | 50 | Bronzeworking, Stonecraft | War Chariot *(needs improved Horses or Camels)*, Chariot Archer *(needs improved Horses or Camels)* | Stable | — |
| Writing | 50 | Divination, Fletching | — | Library, **The Great Ziggurat**, *Scholarship* (project) | Open Borders |

What the nodes say (the rules the chart prints, then each node's own note in *italics*):

- **Divination** — *Your first god comes when your empire has saved enough faith.*
- **The Wheel** — Workers +1 charge
- **The Wheel** — *Each worker you make after this has an extra charge. Workers you have already do not change.*

### Æra II — The Age of Heroes (9 nodes, 100–190🔬)

| node | 🔬 | prereqs | units | buildings | abilities & gifts |
|---|---|---|---|---|---|
| Bronze Panoply | 100 | The Wheel | Phalanx *(needs improved Obsidian or Copper)*, Swordsman *(needs improved Obsidian or Copper)* | Smithy, War Hall, **The Statue of Zeus** | reveals **Iron** |
| Chronology | 100 | Writing | — | Chart the Stars ‡, **The Pyramid of the Sun** | The Long Count |
| Currency | 100 | The Wheel | Trader *(never built — comes with a route bought in gold)* | Market, **The Mausoleum** | Rite of Plenty · renewals: Plantation +1💰 |
| Epic Poetry | 100 | Writing | — | Amphitheater, **The Theatre of Dionysus**, Heroic Epic ‡ | Ancestor Rites |
| Code of Laws | 190 | Chronology | — | Imperial Throne ‡, **The Library of Ashurbanipal**, **The Weiyang Palace**, *Pageants* (project) | — |
| Irrigation | 190 | Chronology, Bronze Panoply | — | Garden, **Petra** | workers may build Floating Gardens · renewals: Farm +1🌾 on fresh water |
| Siegecraft | 190 | Bronze Panoply | Bowman | Stone Walls, **The Iron Pillar** | Siege |
| The High Temple | 190 | Epic Poetry | Prophet | Temple, The Basilica, High Temple ‡, **Solomon's Temple** | — |
| Wayfinding | 190 | Sailing, Currency | Bireme, War Galley | Harbour, **The Colossus** | Sea Legs |

What the nodes say (the rules the chart prints, then each node's own note in *italics*):

- **Bronze Panoply** — *Your spearmen become phalanxes and your warriors become swordsmen, if you have improved copper or obsidian.*
- **Chronology** — *You may spend faith to draw a new hand of Orders in place of the one you were offered.*
- **Epic Poetry** — *Great people come only after you research this. Renown you earn before then is kept.*
- **Code of Laws** — Authority capacity +3
- **Code of Laws** — *Your empire can govern more cities.*

### Æra III — The Age of Empire (14 nodes, 360–1150🔬)

| node | 🔬 | prereqs | units | buildings | abilities & gifts |
|---|---|---|---|---|---|
| Iron Working | 360 | Irrigation, Siegecraft | Legionary *(needs improved Iron)*, Spear Wall | **The Terracotta Army** | — |
| Rhetoric | 360 | The High Temple | — | Forum ‡, **The Great Library** | renewals: Academy +2🔬, Landmark +2🎭, Manufactory +2⚙, Customs House +2💰, Citadel +2⚙ |
| State Workforce | 360 | Currency | — | Public Bath, **Angkor Wat** | — |
| The Silk Road | 360 | Wayfinding | — | Caravanserai ‡, **The Great Stelae of Aksum** | — |
| Mathematics | 650 | Iron Working | Catapult, Composite Bowman | Armoury | — |
| Satrapies | 650 | State Workforce | — | **The Forbidden City** | — |
| Shipwrights | 650 | The Silk Road | Galley, Tower Ship, Fire Ship | Shipyard | — |
| The Civil Service | 650 | Code of Laws | — | Courthouse, **The Great Wall** | — |
| The Saddle | 650 | Iron Working | Horseman *(needs improved Horses or Camels)*, Horse Archer *(needs improved Horses or Camels)*, War Elephant *(needs improved Ivory)* | — | renewals: Pasture +1⚙ |
| Daughter Cities | 1150 | The Civil Service | — | Town Charter ◇ | — |
| Engineering | 1150 | The Saddle | — | Aqueduct, Watermill, **The Circus Maximus** | — |
| Guildhalls | 1150 | Satrapies | — | Workshop, **The Great Mosque of Djenné** | — |
| Horology | 1150 | Mathematics | — | **Chichen Itza** | — |
| Theology | 1150 | Rhetoric | Apostle | Cathedral, **Hagia Sophia** | — |

What the nodes say (the rules the chart prints, then each node's own note in *italics*):

- **Iron Working** — *Your phalanxes become spear walls. Your swordsmen become legionaries if you have improved iron.*
- **State Workforce** — Workers +1 charge
- **State Workforce** — *Each worker you make after this has an extra charge. Workers you have already do not change.*
- **Daughter Cities** — New cities start with a Town Charter
- **Daughter Cities** — *Each city you found after this starts with a Town Charter.*
- **Theology** — *Your religion can take enhancer beliefs after this.*

### Æra IV — The Age of Cathedrals (14 nodes, 1960–8000🔬)

| node | 🔬 | prereqs | units | buildings | abilities & gifts |
|---|---|---|---|---|---|
| Castellany | 1960 | Guildhalls | Pikeman | Castle | — |
| Geomancy | 1960 | Daughter Cities, Horology | — | — | renewals: Mine +1⚙ |
| Machinery | 1960 | Horology, Engineering | Crossbowman | — | — |
| Paper Money | 1960 | Shipwrights, Guildhalls | — | Bazaar, Bourse ‡ | — |
| Scholarship | 1960 | Theology | — | University, **The House of Wisdom**, The Turning Heavens ‡ | renewals: Academy +2🔬, Landmark +2🎭, Manufactory +2⚙, Customs House +2💰, Citadel +2⚙ |
| Natural Philosophy | 3250 | Scholarship | Trebuchet | **Machu Picchu** | reveals **Niter** |
| Steel | 3250 | Machinery | Longswordsman *(needs improved Iron)* | Forge | — |
| The Golden Roads | 3250 | Paper Money | — | — | — |
| Militant Orders | 5150 | Steel | Knight *(needs improved Horses or Camels)* | **The Alhambra** | — |
| Movable Type | 5150 | Steel, The Golden Roads | — | Printing House | — |
| The Astrolabe | 5150 | Natural Philosophy | Caravel, Carrack, Gun Galley | Observatory | Open Ocean |
| The Counting Houses | 5150 | The Golden Roads, Castellany | — | Bank | — |
| The Holy Office | 5150 | Scholarship | Inquisitor | **Notre-Dame** | — |
| Alchemy | 8000 | Militant Orders, Movable Type, The Counting Houses, The Astrolabe, The Holy Office | The Fire Lance *(needs improved Niter)* | The Alchemical Society, The Alchemical Codex ‡ | pays a **bead** to every completer |

What the nodes say (the rules the chart prints, then each node's own note in *italics*):

- **The Golden Roads** — Trade routes +1
- **The Golden Roads** — *Your empire can run another trade route.*
- **Alchemy** — *Finishing this pays a bead. When any empire finishes it, every empire with a full rod of beads can begin the Magnum Opus.*

### The charter technologies

Only a seat that drafted the charter may research these. Each sits one column right of its one parent, inside its own age, and costs its column's price, as an ordinary technology there does. None moves an empire's age or counts as a world first.

| node | æra | column | 🔬 | prereq | opened by | units | buildings | abilities & gifts |
|---|---|---|---|---|---|---|---|---|
| Liturgy | III | 6 | 360 | The High Temple | The Call to Prayer | — | — | — |
| Ciphers | IV | 9 | 1960 | Horology | The Closed Book | — | — | — |
| Record-Keeping | III | 6 | 360 | Code of Laws | The Archivists' Charter | — | Great Archive ‡ | — |
| Astronomy | I | 2 | 24 | Calendar | The Observers' Charter | — | — | The Night Watch |
| Smelting | I | 2 | 24 | Mining | The Smelters' Charter | — | — | workers may build Smelter |
| Herbals | I | 2 | 24 | Pottery | The Herbalists' Charter | — | — | workers may build Physic Garden |
| Casting | I | 3 | 50 | Bronzeworking | The Bronze-Founders' Charter | — | — | — |
| Surveying | II | 4 | 100 | The Wheel | The Surveyors' Charter | — | Aqueduct | workers may build Qanat |
| Cataloguing | II | 4 | 100 | Writing | The Librarians' Charter | — | Mouseion ‡ | — |
| Glassmaking | II | 5 | 190 | Chronology | The Glassmakers' Charter | — | Glasshouse | — |
| Medicine | III | 6 | 360 | The High Temple | The Physicians' Charter | — | Bimaristan ‡ | — |
| Scholasticism | III | 6 | 360 | The High Temple | The Schoolmen's Charter | — | Cathedral School | — |
| Papermaking | III | 7 | 650 | Rhetoric | The Paper-Makers' Charter | — | Scriptorium | — |
| Printing | III | 7 | 650 | Rhetoric | The Printers' Charter | — | Aldine Press ‡ | — |
| Mechanics | III | 8 | 1150 | Mathematics | The Mechanists' Charter | — | — | — |
| Gunfounding | IV | 10 | 3250 | Machinery | The Gunfounders' Charter | — | Tophane ‡ | — |
| Chemistry | IV | 10 | 3250 | Geomancy | The Alchemists' Charter | — | — | — |
| Military Architecture | IV | 10 | 3250 | Castellany | The Military Engineers' Charter | — | Bastion | — |
| Naval Gunnery | IV | 12 | 8000 | The Astrolabe | — | — | — | — |

- **Liturgy** — Holy site pressure range +6 hexes
- **Ciphers** — First to Alchemy: rivals without it cannot start The Magnum Opus for 10 turns
- **Herbals** — Physic Garden +2 happiness
- **Casting** — Hoplite: Spearman to Pikeman +2 combat strength
- **Casting** — Maryannu: War Chariot to Knight +2 combat strength
- **Printing** — Trade routes +1
- **Mechanics** — Onager: Catapult and Trebuchet +1 range
- **Mechanics** — Repeating Crossbow: Archer to Crossbowman move after attacking
- **Chemistry** — Grenadier: Warrior to Longswordsman +1 combat strength per charter technology you know
- **Naval Gunnery** — Galleass: Gun Galley and Frigate +3 combat strength
- **Naval Gunnery** — Galleass: Gun Galley and Frigate blockade a foreign city they stand beside on the water: its sea lanes close and its trade routes pay nothing

### The verbs the tree hands over

| verb | node | who gains it | what it does |
|---|---|---|---|
| The Night Watch | Astronomy | city | Rite: +1 science per citizen |
| Embark | Sailing | civilian | Civilians and scouts cross coast and lakes |
| Rite of the Harvest | Divination | city | Rite: food hexes +1 food |
| Omen Reading | Divination | city | Rite: +1 science per building |
| Consecration of the Bounds | Stonecraft | city | Rite: luxury hexes +1 culture, borders grow 30% faster |
| Blessing of Arms | Bronzeworking | city | Rite: town +10 defence |
| Rite of Plenty | Currency | city | Rite: resource hexes +1 gold |
| Ancestor Rites | Epic Poetry | empire | Renown earns great people |
| Sea Legs | Wayfinding | military | Soldiers cross coast and lakes |
| Siege | Siegecraft | military | Surrounded enemy cities lose health each turn and cannot heal |
| The Long Count | Chronology | empire | Spend faith to redraw an Order draft |
| Open Ocean | The Astrolabe | empire | Ships and embarked units cross deep ocean |
| Open Borders | Writing | empire | Open-borders treaties |
| Votive Offering | — | city | A city may give faith to whatever it is building: the faith the rite costs becomes production. |
| Restoring of the Host | — | city | A city may spend faith to heal every unit of yours standing in land that follows your religion. |
