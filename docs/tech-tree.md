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
`docs/design-history.md`.

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
- **Seventeen effect-carrying techs** are the exceptions to the neutral-tree
  ruling (theme abilities otherwise live on cards and building rows). It was
  eight until batch E gave the re-gifted nodes their own rules
  (`docs/history/tech-gifts.md` §7), and sixteen until Castellany's deferred
  half — arrows answered by armour — became a real strength line.
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
  `Player.dice` and `BeadRules.startingDice`, and Chronology's early sight of the
  next age's beads is the Long Count verb now, not a die.

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
rather than retyping a figure). The four ages cost 269 / 1350 / 10440 / 56550🔬
— 68609 for the whole tree, 68604 of it payable (the root's 5 is nobody's
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
  the † bullet under the table. Two nodes carry one today (Epic Poetry,
  Satrapies): Code of Laws, Daughter Cities and Castellany all had theirs built
  in batches E4a/E4b and lost the mark.
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

**The ten chains** (`BuildingDef.requiresBuilding`, a parent standing in the same
town): Palisade → Stone Walls → Castle · Monument → Amphitheater · Market →
Bazaar and Bank · Harbour → Shipyard · Library → University → Observatory ·
Workshop → Forge · Shrine → Temple.

### Æra I — The Age of Omens (12 nodes, 5–50🔬)

| node | 🔬 | prereqs | units | buildings | abilities & gifts |
|---|---|---|---|---|---|
| Agriculture | 5 | — | Settler, Warrior, Scout, Worker | — | workers may build Farm |
| Fletching | 11 | Agriculture | Archer | — | workers may build Camp |
| Husbandry | 11 | Agriculture | — | **The Temple of Artemis** | workers may build Pasture · reveals **Horses** |
| Mining | 11 | Agriculture | — | — | workers may build Mine · Clear Forest |
| Pottery | 11 | Agriculture | — | Granary | — |
| Bronzeworking | 24 | Mining | Spearman | Barracks, **The Walls of Uruk** | Clear Jungle · Blessing of Arms |
| Calendar | 24 | Fletching | — | **The Hanging Gardens**, *Tithes* (project) | workers may build Plantation |
| Divination | 24 | Husbandry | — | Shrine, **The Oracle** | Rite of the Harvest · Omen Reading |
| Sailing | 24 | Pottery | Trireme | Lighthouse, **The Great Lighthouse** | workers may build Fishing Boat · Embark |
| Stonecraft | 24 | Pottery | — | Monument, Palisade, **Stonehenge**, **The Pyramids** | workers may build Quarry · Consecration of the Bounds |
| The Wheel | 50 | Bronzeworking, Stonecraft | War Chariot *(needs improved Horses)*, Chariot Archer *(needs improved Horses)* | Stable | — |
| Writing | 50 | Divination, Calendar | — | Library, **The Great Ziggurat**, *Scholarship* (project) | Open Borders |

What the nodes say (the rules the chart prints, then each node's own note in *italics*):

- **Divination** — *A shrine is where a people first listen, and the first of your gods arrives of its own accord once the realm's faith runs deep enough.*

### Æra II — The Age of Heroes (9 nodes, 100–190🔬)

| node | 🔬 | prereqs | units | buildings | abilities & gifts |
|---|---|---|---|---|---|
| Bronze Panoply | 100 | The Wheel | Phalanx, Swordsman *(needs improved Iron)* | Smithy | reveals **Iron** |
| Chronology | 100 | Writing | — | Chart the Stars ‡ | The Long Count · renewals: Plantation +1🎭 |
| Currency | 100 | The Wheel | Trader *(never built — comes with a route bought in gold)* | Market, **The Mausoleum** | Rite of Plenty · renewals: Plantation +1💰 |
| Epic Poetry † | 100 | Writing | — | Amphitheater, **The Theatre of Dionysus**, Heroic Epic ‡ | Ancestor Rites |
| Code of Laws | 190 | Chronology | — | Imperial Throne ‡, *Pageants* (project) | — |
| Irrigation | 190 | Chronology, Bronze Panoply | — | Garden | workers may build Floating Gardens · renewals: Farm +1🌾 on fresh water |
| Siegecraft | 190 | Bronze Panoply | Bowman | Stone Walls | workers may build Lumbermill · Siege |
| The High Temple | 190 | Epic Poetry | Prophet | Temple, High Temple ‡ | — |
| Wayfinding | 190 | Sailing, Currency | Bireme, War Galley | Harbour, **The Colossus** | Sea Legs |

What the nodes say (the rules the chart prints, then each node's own note in *italics*):

- **Chronology** — every 15 turns, 1 renown for every science or faith building
- **Chronology** — *Every age this empire enters from now on is seen a turn early in the beads, and its calendars may call for a second reading of a draft. On the long count the realm's libraries and its shrines are read off together, and your renown grows by them.*
- **Epic Poetry** — losing a unit grants +4 culture
- **Epic Poetry** † Verse measured against the fallen soldier — a greater loss sung longer — waits until a one-time grant can be sized by the piece that earned it. — not built yet
- **Epic Poetry** — *When one of your units falls, the nearest city of yours records the loss in verse and gains culture. Until the poets keep the roll of names, renown gathers but no great person will come.*
- **Code of Laws** — +3 authority capacity
- **Code of Laws** — *A city may put its labour into pageants, and what it raises is celebration rather than stone. The crown's authority reaches further too: your realm may hold more cities in hand than it could.*
- **Irrigation** — *A farm standing beside fresh water feeds its city better than it did.*
- **Siegecraft** — every city: +1 city defence per 4 citizens
- **Siegecraft** — *A wall is only as good as the hands on it. Every few citizens of a town of yours make its defence harder to break.*

### Æra III — The Age of Empire (14 nodes, 360–1150🔬)

| node | 🔬 | prereqs | units | buildings | abilities & gifts |
|---|---|---|---|---|---|
| Iron Working | 360 | Irrigation, Siegecraft | Legionary *(needs improved Iron)*, Spear Wall | **The Terracotta Army**, **The Statue of Zeus** | — |
| Rhetoric | 360 | The High Temple | — | Forum ‡, **The Great Library** | — |
| State Workforce | 360 | Currency | — | Public Bath | — |
| The Silk Road | 360 | Wayfinding | — | Caravanserai ‡ | — |
| Mathematics | 650 | Iron Working | Catapult, Composite Bowman | **Petra** | — |
| Satrapies | 650 | State Workforce | — | **The Forbidden City**, **The Great Wall** | — |
| Shipwrights | 650 | The Silk Road | Galley, Tower Ship, Fire Ship | Shipyard | — |
| The Civil Service | 650 | Code of Laws | — | — | — |
| The Saddle | 650 | Iron Working | Horseman *(needs improved Horses)*, Horse Archer *(needs improved Horses)*, War Elephant *(needs improved Ivory)* | — | renewals: Pasture +1⚙ |
| Daughter Cities | 1150 | The Civil Service | — | Town Charter ◇ | — |
| Engineering | 1150 | The Saddle | — | Aqueduct, Watermill, **The Circus Maximus** | — |
| Guildhalls | 1150 | Satrapies | — | Workshop | — |
| Horology | 1150 | Mathematics | — | **The Water Clock of Su Song** | — |
| Theology | 1150 | Rhetoric | Apostle | Cathedral, **Chichen Itza**, **Hagia Sophia**, **Angkor Wat**, **The Great Mosque of Djenné** | — |

What the nodes say (the rules the chart prints, then each node's own note in *italics*):

- **Iron Working** — *Iron is named at last, and every warrior of yours retools into a sword the moment a seam of it is yours.*
- **State Workforce** — newly created workers gain +1 charge
- **State Workforce** — workers cost −25% to buy
- **State Workforce** — *Every worker you train has one more season of work in it, and the treasury hires one at a quarter off.*
- **The Silk Road** — +3 gold on every trade route that ends in another empire’s city
- **The Silk Road** — a trade route ending in another empire’s city lends you one luxury resource that city has improved, worth a share of your own
- **The Silk Road** — *A caravan that ends its journey in another empire’s city is paid well for the crossing, and it comes home carrying one of the fine goods that city has opened — not a seam of your own, and worth less than one, but yours for as long as the road runs.*
- **Satrapies** — each connected city pays +1 gold
- **Satrapies** — +1 happiness in every city joined to your capital by road
- **Satrapies** — *Every city joined to your capital pays one more gold, and a joined city is a contented one.*
- **The Civil Service** — +5 percentage points to the bonus your positive happiness pays
- **The Civil Service** — +5 authority capacity
- **The Civil Service** — +1 food, +1 production on every hex carrying a great person's work
- **The Civil Service** — *A realm that is content or well governed is rewarded more generously, and the crown's authority reaches further than it did. The ministry also puts the works your great people leave behind to use: each of them feeds and supplies its city better.*
- **The Saddle** — pillaging grants +15 science
- **The Saddle** — pillaging grants +15 culture
- **The Saddle** — *The horse is ridden rather than driven, and a rider who tears out a field carries home what he saw there — the way the ditches ran, the songs the diggers sang.*
- **Daughter Cities** — settlers cost 33% less production
- **Daughter Cities** — new cities are founded with a Town Charter
- **Daughter Cities** — +1 food, +1 production on every trade route between two of your own cities
- **Daughter Cities** — *Settlers are trained faster, every city you found is founded with its charter already granted, and the carts that run between your own towns carry more than they did.*
- **Guildhalls** — +10% production toward wonders
- **Guildhalls** — +2 culture per wonder you hold
- **Guildhalls** — *The guilds put their weight behind the great works: a wonder rises faster in your cities, and every wonder your realm has raised sings a little louder.*
- **Horology** — every 10 turns, 5 science for every production building
- **Horology** — *The hours are kept. On a regular beat every workshop and forge in your realm reports what its craft has taught it, and the beakers arrive all at once.*
- **Theology** — *The enhancing beliefs open here: a faith may now be deepened as well as spread.*

### Æra IV — The Age of Cathedrals (15 nodes, 1960–8000🔬)

| node | 🔬 | prereqs | units | buildings | abilities & gifts |
|---|---|---|---|---|---|
| Divine Right | 1960 | Guildhalls | — | Courthouse | — |
| Geomancy | 1960 | Daughter Cities, Horology | — | — | renewals: Mine +1⚙ |
| Machinery | 1960 | Horology, Engineering | Crossbowman | — | — |
| Paper Money | 1960 | Shipwrights, Guildhalls | — | Bazaar, Bourse ‡ | — |
| Scholarship | 1960 | Theology | — | University, **The House of Wisdom**, The Turning Heavens ‡ | — |
| Castellany | 3250 | Divine Right | Pikeman | Castle | — |
| Natural Philosophy | 3250 | Scholarship | Trebuchet | **Machu Picchu** | — |
| Steel | 3250 | Machinery | Longswordsman *(needs improved Iron)* | Forge | — |
| The Golden Roads | 3250 | Paper Money | — | — | — |
| Militant Orders | 5150 | Steel | Knight *(needs improved Horses)* | **The Alhambra** | — |
| Movable Type | 5150 | Steel, The Golden Roads | — | Printing House | — |
| The Astrolabe | 5150 | Natural Philosophy | Caravel, Carrack, Gun Galley | Observatory | Open Ocean |
| The Counting Houses | 5150 | The Golden Roads, Castellany | — | Bank | — |
| The Holy Office | 5150 | Scholarship | Inquisitor | **Notre-Dame** | — |
| Alchemy | 8000 | Militant Orders, Movable Type, The Counting Houses, The Astrolabe, The Holy Office | The Fire Lance *(needs improved Niter)* | The Alchemical Society, The Alchemical Codex ‡ | reveals **Niter** · pays a **bead** to every completer |

What the nodes say (the rules the chart prints, then each node's own note in *italics*):

- **Divine Right** — the authority a captured city costs falls by 1
- **Divine Right** — *A city you have taken by force costs one less authority.*
- **Geomancy** — +1 production, +1 faith on every hex with a Mine carrying a resource
- **Geomancy** — *Every mine your cities work gives up a further hammer, and a mine sunk into a named seam gives up more still — and a little devotion with it, for the earth is asked before it is taken.*
- **Machinery** — roads carry units 40% further
- **Machinery** — *Cranks, rollers and a good axle: an army marches further along your paving in a day than it used to.*
- **Paper Money** — *Notes, ledgers and a floor to shout them across: the realm's coin can be turned into song at the Bourse.*
- **Castellany** — +10 combat strength against ranged units
- **Castellany** — *A castle may be raised, and pikemen called. Your soldiers also stand better against anything that shoots at them.*
- **Steel** — melee units: +1 movement
- **Steel** — *Every soldier of the sword line marches one hex further.*
- **The Golden Roads** — +1 trade route
- **The Golden Roads** — +1 gold on every trade route you send, for each luxury in the city it left or the city it reaches
- **The Golden Roads** — *One more caravan may be on the road at once, and every caravan of yours is paid for the fine goods held at either end of its journey.*
- **Movable Type** — +10% science in every city joined to your capital by road
- **Movable Type** — +10% production in every city joined to your capital by road
- **Movable Type** — *A city joined to your capital reads what your presses print: it learns faster, and it builds faster.*
- **Alchemy** — *Niter is named, and the first soldier who carries fire may be trained where it is dug. Completing this pays a glass bead, and the first empire in the world to complete it opens the Magnum Opus for everybody.*

### The verbs the tree hands over

| verb | node | who gains it | what it does |
|---|---|---|---|
| Embark | Sailing | civilian | Cross coastal water. |
| Rite of the Harvest | Divination | city | A city may keep this rite a while: every hex it works that feeds it feeds it more. |
| Omen Reading | Divination | city | A city may keep this rite a while: every building standing in it adds a little learning. |
| Consecration of the Bounds | Stonecraft | city | A city may keep this rite a while: its luxury hexes sing and its bounds walk outward faster. |
| Blessing of Arms | Bronzeworking | city | A city may keep this rite a while: it is harder to storm. |
| Rite of Plenty | Currency | city | A city may keep this rite a while: every hex it works with a seam in it pays a little coin. |
| Ancestor Rites | Epic Poetry | empire | Renown now earns great-person offers. |
| Sea Legs | Wayfinding | military | Soldiers may cross coastal water. |
| Siege | Siegecraft | military | Surrounded enemy cities cannot heal and lose health each turn. |
| The Long Count | Chronology | empire | The next age’s beads are revealed a turn early, and an Order draft may be redrawn for faith. |
| Open Ocean | The Astrolabe | empire | Ships and embarked units may cross deep ocean. |
| Open Borders | Writing | empire | Open-borders treaties; both empires must know Writing. |
