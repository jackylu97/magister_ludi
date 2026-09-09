# The Technology Tree — reference

The as-built tech reference. Part 2's tables are **generated from the rows** —
never hand-maintained. The generator is a throwaway: a one-file vitest that walks
`TECH_IDS`, asks `techGifts` what each node hands over and prints the markdown
(the `scratchpad techdoc.py` that did it before is gone). Regenerating means
writing that walk again, which is a few minutes and cannot drift from the data —
hand-editing a row is what drift looks like. Companions: `docs/wonders.md`,
`docs/trade.md`, `docs/religion-v2.md`, `docs/great-people.md`. The design
history (proposals, re-cuts, the five-age plan) lives in git and
`docs/design-history.md`.

## Standing determinations

- **Five ages**: I Omens · II Heroes · III Empire · IV Cathedrals · V Magister
  (V is a shelf — deliberately unbuilt). Ages follow the drawn columns
  (revision 4.2: columns 9–12 are Æra IV).
- **A column IS a price**: one table indexed by `techColumn`
  (`src/sim/tech.ts` docblock has it; the root's 5 is never paid).
  Adding a tech = placement: prereqs pick the column, the column prices it
  (`src/sim/techData.ts` placement docblock).
- **The ladder is a taper, not an exponential**: the *ratio* between columns
  decays (2.3× at the opening, about 1.09× at the close), so an exponential
  opening flattens toward linear at the end. Only columns 2–5 are the formula's
  own; the last seven are authored.
- **The late columns are authored above the taper** (user ruling 2026-09-03:
  the scaling of Æra I–II stands, Æra IV–V is extremely expensive). Columns 2–5
  are the formula's figures; columns 6–8 lift a little and columns 9–12 lift
  hard. A late column is a ruling, not a value of the decay constant — retuning
  one edits the rows and the pin in `test/sim/tech.test.ts`.
- **The first paid column is authored below it** (user ruling 2026-09-06, item
  x — "the first column of technologies slightly cheaper"): column 1 is 10, not
  the formula's 13. The four nodes are Fletching, Husbandry, Mining, Pottery.
- **And the ladder is re-anchored on that 10** (user ruling 2026-09-08, item
  (vv), reading A): the taper is re-run from cost(1) = 10 for columns 2–5
  (23 · 53 · 105 · 175) and the authored late columns are scaled by the same
  10/13 (310 · 415 · 525 for Æra III; Æra IV's four scaled again by the next
  ruling). No column moved a node and no prereq changed — a column is still a
  price. Reading B (the formula's columns alone) is kept in the ruling for the
  retune.
- **And Æra IV alone is scaled by half again** (user ruling 2026-09-09, item
  (hhh) clause 1 — the closing age "~50% more expensive"): columns 9–12 become
  1650 · 1950 · 2250 · 2550, every figure already a multiple of fifty so the
  rounding rule changes nothing. Columns 0–8 are untouched to the beaker, and
  the step *inside* the age keeps its shape (a flat lift a column, the whole age
  raised rather than re-curved). The Æra III → IV step at the seam widens from
  2.1× to 3.1×.
- **The chart is the user's drawing**: lanes (`row`) and column nudges
  (`columnShift`) are authored data; the annealer only advises on new nodes;
  crossings pinned exactly, false chains zero (`test/ui/techChart.test.ts`).
- **The 27-wonder slate stays** at its current homes; prices hand-tuned rows.
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
- **Sixteen effect-carrying techs** are the exceptions to the neutral-tree
  ruling (theme abilities otherwise live on cards and building rows). It was
  eight until batch E gave the re-gifted nodes their own rules
  (`docs/history/tech-gifts.md` §7).
- **Every hammer price** takes its column from the unlocking tech, never the row
  — units, buildings and wonders alike (`docs/production-costs.md`, batch P1):
  `sizeHammers[size] × columnRate ^ (column − 1)`, the row carrying a size and
  the tree carrying the rest, one line in the cost fold for each. The first
  column is the floor, so a row the root opens is priced with the opening kit. A
  row no technology unlocks carries its own `column` — a charter's building takes
  the first column of its pool's age. A ‡ row (one to a realm) carries a third
  line, `√(cities ÷ 4)` (item dd).
- `TechDef` may carry `paysBead` (Alchemy) and `ageEntryDice`; abilities ride
  `techsGrant` (`ABILITY_TECH`).

## Part 2 — As built (regenerated from `data/techs.json`)

Regenerated from the rows — never hand-maintained. Costs come off the column
table (`src/sim/tech.ts`, "a column is a price"): one figure per chart column,
5 · 10 · 23 · 53 · 105 · 175 · 310 · 415 · 525 · 1650 · 1950 · 2250 · 2550.
Columns 2–5 are the tapered ladder's own figures, re-run from column 1's
authored 10 by the ruling of 2026-09-08; columns 6–12 are authored above it by
the ruling of 2026-09-03, scaled by the same 10/13, and columns 9–12 scaled
again by 3/2 by the ruling of 2026-09-09 (see the standing determinations). The
four ages cost 266 / 1295 / 5940 / 29850🔬 — 37351 for the whole tree, 37346 of
it payable (the root's 5 is nobody's price). `test/sim/techDocSync.test.ts`
keeps this table's costs and node names honest against the rows.
Wonders in **bold**; ‡ = a row **one to a realm** (`oncePerEmpire` — the five
uniques of the fewer-things cut, and the three national rows that always wore
it); ◇ = a row that is granted and never built; † = a deferred half on the row
(player-plain prose in the data). A unit that cannot be raised without a seam
says so. *Renewals are slated for the axe (user ruling 2026-09-02) and are listed
while they stand.* A withdrawn row (`retired`) is not printed at all.

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

**Batch E — the tree's gifts** (2026-09-06, `docs/history/tech-gifts.md` §7 as the user
marked it). The six nodes batch D left handing over no building hand over
something else now, and every gift is a **row** rather than a branch: the effect
vocabulary the tree has carried since the Age I rework (`TechDef.effects`) plus
the engine shapes batch A declared. What each one says is printed under its age,
in the data's own words. The Examination Hall is renamed **The Civil Service**
(the id `theExaminationHall` is kept, so no save moves), Code of Laws hands over
the third conversion project, and Engineering is deliberately *not* on the list —
it kept three buildings and needed nothing.

**The ten chains** (`BuildingDef.requiresBuilding`, a parent standing in the same
town): Palisade → Stone Walls → Castle · Monument → Amphitheater · Market →
Bazaar and Bank · Harbour → Shipyard · Library → University → Observatory ·
Workshop → Forge · Shrine → Temple.

### Æra I — The Age of Omens (12 nodes, 5–53🔬)

| node | 🔬 | prereqs | units | buildings | abilities & gifts |
|---|---|---|---|---|---|
| Agriculture | 5 | — | Settler, Warrior, Scout, Worker | — | — |
| Fletching | 10 | Agriculture | Archer | — | — |
| Husbandry | 10 | Agriculture | — | **The Temple of Artemis** | reveals **Horses** |
| Mining | 10 | Agriculture | — | — | Clear Forest |
| Pottery | 10 | Agriculture | — | Granary | — |
| Bronzeworking | 23 | Mining | Spearman | Barracks, **The Walls of Uruk** | Clear Jungle · Blessing of Arms |
| Calendar | 23 | Fletching | — | **The Hanging Gardens**, *tithes* (project) | — |
| Divination | 23 | Husbandry | — | Shrine, **The Oracle** | Rite of the Harvest · Omen Reading |
| Sailing | 23 | Pottery | Trireme | Lighthouse, **The Great Lighthouse** | Embark |
| Stonecraft | 23 | Pottery | — | Monument, Palisade, **Stonehenge**, **The Pyramids** | Consecration of the Bounds |
| The Wheel | 53 | Bronzeworking, Stonecraft | War Chariot *(needs improved Horses)*, Chariot Archer *(needs improved Horses)* | Stable | — |
| Writing | 53 | Divination, Calendar | — | Library, **The Great Ziggurat**, *scholarship* (project) | Open Borders |

What the effect rows say (player prose from the data):

- **Divination** — A shrine is where a people first listen, and the first of your gods arrives of its own accord once the realm's faith runs deep enough.

### Æra II — The Age of Heroes (9 nodes, 105–175🔬)

| node | 🔬 | prereqs | units | buildings | abilities & gifts |
|---|---|---|---|---|---|
| Bronze Panoply | 105 | The Wheel | Phalanx, Swordsman *(needs improved Iron)* | — | reveals **Iron** |
| Chronology | 105 | Writing | — | Chart the Stars ‡ | The Long Count · renewals: Plantation +1🎵 |
| Currency | 105 | The Wheel | Trader | Market, **The Mausoleum** | Rite of Plenty · renewals: Plantation +1💰 |
| Epic Poetry † | 105 | Writing | — | Amphitheater, **The Theatre of Dionysus**, Heroic Epic ‡ | Ancestor Rites |
| Code of Laws † | 175 | Chronology | — | Imperial Throne ‡, *pageants* (project) | — |
| Irrigation | 175 | Chronology, Bronze Panoply | — | — | renewals: Farm +1🌾 (fresh water) |
| Siegecraft | 175 | Bronze Panoply | Bowman | Stone Walls | Siege |
| The High Temple | 175 | Epic Poetry | Prophet | Temple, High Temple ‡ | — |
| Wayfinding | 175 | Sailing, Currency | Bireme, War Galley | Harbour, **The Colossus** | Sea Legs |

What the effect rows say (player prose from the data):

- **Chronology** — Every age this empire enters from now on is seen a turn early in the beads, and its calendars may call for a second reading of a draft. On the long count the realm's libraries and its shrines are read off together, and your renown grows by them.
- **Epic Poetry** — When one of your units falls, the nearest city of yours records the loss in verse and gains culture. Until the poets keep the roll of names, renown gathers but no great person will come.
- **Epic Poetry** † Verse measured against the fallen soldier — a greater loss sung longer — waits until a one-time grant can be sized by the piece that earned it.
- **Code of Laws** — A city may put its labour into pageants, and what it raises is celebration rather than stone. The crown's writ reaches further too: your realm may hold more cities in hand than it could.
- **Code of Laws** † The King List, which would pay a city for the years since it was founded, waits until a city remembers its own founding turn.
- **Irrigation** — A farm standing beside fresh water feeds its city better than it did.

### Æra III — The Age of Empire (14 nodes, 310–525🔬)

| node | 🔬 | prereqs | units | buildings | abilities & gifts |
|---|---|---|---|---|---|
| Iron Working | 310 | Irrigation, Siegecraft | Legionary *(needs improved Iron)*, Spear Wall | **The Terracotta Army**, **The Statue of Zeus** | — |
| Raised Fields | 310 | Wayfinding | — | — | — |
| Rhetoric | 310 | The High Temple | — | Forum ‡, **The Great Library** | — |
| State Workforce | 310 | Currency | — | — | — |
| Mathematics | 415 | Iron Working | Catapult, Composite Bowman | **Petra**, Caravanserai ‡ | — |
| Satrapies † | 415 | State Workforce | — | **The Forbidden City**, **The Great Wall** | — |
| Shipwrights | 415 | Raised Fields | Galley, Tower Ship, Fire Ship | Shipyard | — |
| The Civil Service | 415 | Code of Laws | — | — | — |
| The Saddle | 415 | Iron Working | Horseman *(needs improved Horses)*, Horse Archer *(needs improved Horses)*, War Elephant *(needs improved Ivory)* | — | renewals: Pasture +1⚙ |
| Daughter Cities † | 525 | The Civil Service | — | Town Charter ◇ | — |
| Engineering | 525 | The Saddle | — | Aqueduct, Watermill, **The Circus Maximus** | — |
| Guildhalls | 525 | Satrapies | — | Workshop | — |
| Horology | 525 | Mathematics | — | **The Water Clock of Su Song** | — |
| Theology | 525 | Rhetoric | Apostle | Cathedral, **Chichen Itza**, **Hagia Sophia**, **Angkor Wat**, **The Great Mosque of Djenné** | — |

What the effect rows say (player prose from the data):

- **Iron Working** — Iron is named at last, and every warrior of yours retools into a sword the moment a seam of it is yours.
- **Raised Fields** — A farm on a hex touching a mountain feeds its city better than it did. It is the field that changes, not the peak: nothing is grown on the mountain itself.
- **State Workforce** — Every worker you train has one more season of work in it, and the treasury hires one at a quarter off.
- **Satrapies** — Roads near your cities cost nothing to keep, every city joined to your capital pays one more gold, and a joined city is a contented one.
- **Satrapies** † Hammers toward a building your capital already keeps waits until a one-time grant can look at what stands in another town.
- **The Civil Service** — A realm that is content or well governed is rewarded more generously, and the crown's writ reaches further than it did. The ministry also puts the works your great people leave behind to use: each of them feeds and supplies its city better.
- **Daughter Cities** — Settlers are trained faster, and every city you found is founded with its charter already granted.
- **Daughter Cities** † A city planted far from the capital costing less authority waits for the writ to know how far from home a site is.
- **Guildhalls** — The guilds put their weight behind the great works: a wonder rises faster in your cities, and every wonder your realm has raised sings a little louder.
- **Horology** — The hours are kept. On a regular beat every workshop and forge in your realm reports what its craft has taught it, and the beakers arrive all at once.
- **Theology** — The enhancing beliefs open here: a faith may now be deepened as well as spread.

### Æra IV — The Age of Cathedrals (15 nodes, 1650–2550🔬)

| node | 🔬 | prereqs | units | buildings | abilities & gifts |
|---|---|---|---|---|---|
| Divine Right | 1650 | Guildhalls | — | Courthouse | — |
| Geomancy | 1650 | Daughter Cities, Horology | — | — | renewals: Mine +1⚙ |
| Machinery | 1650 | Horology, Engineering | Crossbowman | — | — |
| Paper Money | 1650 | Shipwrights, Guildhalls | — | Bazaar, Bourse | — |
| Scholarship | 1650 | Theology | — | University, **The House of Wisdom**, The Turning Heavens ‡ | — |
| Castellany † | 1950 | Divine Right | Pikeman | Castle | — |
| Natural Philosophy | 1950 | Scholarship | Trebuchet | **Machu Picchu** | — |
| Steel | 1950 | Machinery | Longswordsman *(needs improved Iron)* | Forge | — |
| The Golden Roads | 1950 | Paper Money | — | — | — |
| Militant Orders | 2250 | Steel | Knight *(needs improved Horses)* | **The Alhambra** | — |
| Movable Type | 2250 | Steel, The Golden Roads | — | Printing House | — |
| The Astrolabe | 2250 | Natural Philosophy | Caravel, Carrack, Gun Galley | Observatory | Open Ocean |
| The Counting Houses | 2250 | The Golden Roads, Castellany | — | Bank | — |
| The Holy Office | 2250 | Scholarship | Inquisitor | **Notre-Dame** | — |
| Alchemy | 2550 | Militant Orders, Movable Type, The Counting Houses, The Astrolabe, The Holy Office | The Fire Lance *(needs improved Niter)* | The Alchemical Society, The Alchemical Codex ‡ | reveals **Niter** · pays a **bead** to every completer |

What the effect rows say (player prose from the data):

- **Divine Right** — A city you have taken by force costs one less authority.
- **Geomancy** — Every mine your cities work gives up a further hammer, and a mine sunk into a named seam gives up more still — and a little devotion with it, for the earth is asked before it is taken.
- **Machinery** — Cranks, rollers and a good axle: an army marches further along your paving in a day than it used to.
- **Paper Money** — Notes, ledgers and a floor to shout them across: the realm’s coin can be turned into song at the Bourse, of which a realm keeps one.
- **Castellany** † Defenders shrugging off arrows waits until a strength line can be told which weapon it is answering.
- **Steel** — Every soldier of the sword line marches one hex further.
- **The Golden Roads** — One more caravan may be on the road at once, and every caravan of yours is paid for the fine goods held at either end of its journey.
- **Movable Type** — A city joined to your capital reads what your presses print: it learns faster, and it builds faster.
- **Alchemy** — Niter is named, and the first soldier who carries fire may be trained where it is dug. Completing this pays a glass bead, and the first empire in the world to complete it opens the Magnum Opus for everybody.
