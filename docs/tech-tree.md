# The Technology Tree — reference

The as-built tech reference. Part 2's tables regenerate from `data/techs.json`
(`scratchpad techdoc.py`; never hand-maintained). Companions: `docs/wonders.md`,
`docs/trade.md`, `docs/religion-v2.md`, `docs/great-people.md`. The design
history (proposals, re-cuts, the five-age plan) lives in git and
`docs/design-history.md`.

## Standing determinations

- **Five ages**: I Omens · II Heroes · III Empire · IV Cathedrals · V Magister
  (V is a shelf — deliberately unbuilt). Ages follow the drawn columns
  (revision 4.2: columns 9–12 are Æra IV).
- **A column IS a price**: one table indexed by `techColumn`
  (`src/sim/tech.ts` docblock has it; cost(1)=13, the root's 5 is never paid).
  Adding a tech = placement: prereqs pick the column, the column prices it
  (`src/sim/techData.ts` placement docblock).
- **The late columns are authored above the taper** (user ruling 2026-09-03:
  the scaling of Æra I–II stands, Æra IV–V is extremely expensive). Columns 0–5
  are the formula's figures untouched; columns 6–8 lift a little and columns
  9–12 lift to 1450/1700/1950/2200. A late column is a ruling, not a value of
  the decay constant — retuning one edits the rows and the pin in
  `test/sim/tech.test.ts`.
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
- **Eight effect-carrying techs** are the exceptions to the neutral-tree
  ruling (theme abilities otherwise live on cards and building rows).
- **Unit prices** take the age band from the unlocking tech, never the row.
- `TechDef` may carry `paysBead` (Alchemy) and `ageEntryDice`; abilities ride
  `techsGrant` (`ABILITY_TECH`).

## Part 2 — As built (regenerated from `data/techs.json`)

Regenerated from the rows — never hand-maintained. Costs come off the column
table (`src/sim/tech.ts`, "a column is a price"): one figure per chart column,
5 · 13 · 30 · 69 · 135 · 225 · 400 · 540 · 680 · 1450 · 1700 · 1950 · 2200.
Columns 0–5 are the tapered ladder's own figures; columns 6–12 are authored
above it by the ruling of 2026-09-03 (see the standing determination). The four
ages cost 345 / 1665 / 7700 / 26000🔬 — 35710 for the whole tree.
Wonders in **bold**; † = a deferred half on the row (player-plain prose in the
data). *Renewals are slated for the axe (user ruling 2026-09-02) and are listed
while they stand.*

### Æra I — The Age of Omens (12 nodes, 5–69🔬)

| node | 🔬 | prereqs | units | buildings | abilities & gifts |
|---|---|---|---|---|---|
| Agriculture | 5 | — | Settler, Warrior, Scout, Worker | — | — |
| Fletching | 13 | Agriculture | Archer | — | — |
| Husbandry | 13 | Agriculture | — | **The Temple of Artemis** | reveals **Horses** |
| Mining | 13 | Agriculture | — | — | — |
| Pottery | 13 | Agriculture | — | Granary | — |
| Bronzeworking | 30 | Mining | Spearman | Barracks, Funeral Games, **The Walls of Uruk** | Blessing of Arms |
| Calendar | 30 | Fletching | — | **The Hanging Gardens**, *tithes* (project) | — |
| Divination | 30 | Husbandry | Augur | Shrine, **The Oracle** | Rite of the Harvest · Recasting the Omens · Omen Reading |
| Sailing | 30 | Pottery | Trireme | Lighthouse, **The Great Lighthouse** | Embark |
| Stonecraft | 30 | Pottery | — | Monument, Palisade, **Stonehenge**, **The Pyramids** | Consecration of the Bounds |
| The Wheel | 69 | Bronzeworking, Stonecraft | War Chariot, Chariot Archer | — | renewals: Granary +1🌾 |
| Writing | 69 | Divination, Calendar | — | Library, **The Great Ziggurat**, *scholarship* (project) | — |

### Æra II — The Age of Heroes (9 nodes, 135–225🔬)

| node | 🔬 | prereqs | units | buildings | abilities & gifts |
|---|---|---|---|---|---|
| Bronze Panoply | 135 | The Wheel | Phalanx, Swordsman | — | renewals: Barracks +1⚙ |
| Chronology | 135 | Writing | — | **Chart the Stars** | The Long Count · +1 die on age entry |
| Currency | 135 | The Wheel | Trader | Market, **The Mausoleum** | Rite of Plenty |
| Epic Poetry † | 135 | Writing | — | Amphitheater, **The Theatre of Dionysus** | — |
| Code of Laws † | 225 | Chronology | — | Stele of Laws | — |
| Irrigation | 225 | Chronology, Bronze Panoply | — | — | renewals: Granary +1🌾 |
| Siegecraft | 225 | Bronze Panoply | Bowman | Stone Walls | Siege |
| The High Temple | 225 | Epic Poetry | Prophet | Temple | The Preaching · Ancestor Rites |
| Wayfinding | 225 | Sailing, Currency | Bireme, War Galley | Harbour, **The Colossus** | Sea Legs |

What the effect rows say (player prose from the data):

- **Chronology** — Every new age this empire enters from now on pays a die of the Magister.
- **Epic Poetry** — When one of your units falls, the nearest city of yours records the loss in verse and gains culture.
- **Epic Poetry** † Verse measured against the fallen soldier — a greater loss sung longer — waits until a one-time grant can be sized by the piece that earned it.
- **Code of Laws** † The King List, which would pay a city for the years since it was founded, waits until a city remembers its own founding turn.
- **Irrigation** — A farm standing beside fresh water feeds its city better than it did.
- **The High Temple** — Until the rites are kept, renown gathers but no great person will come.

### Æra III — The Age of Empire (14 nodes, 400–680🔬)

| node | 🔬 | prereqs | units | buildings | abilities & gifts |
|---|---|---|---|---|---|
| Iron Working | 400 | Irrigation, Siegecraft | Legionary, Spear Wall | **The Terracotta Army**, **The Statue of Zeus** | reveals **Iron** · renewals: Barracks +1⚙ |
| Raised Fields | 400 | Wayfinding | — | — | — |
| Rhetoric | 400 | The High Temple | — | Forum, **The Great Library** | — |
| State Workforce | 400 | Currency | — | — | — |
| Mathematics | 540 | Iron Working | Catapult, Composite Bowman | **Petra** | renewals: Library +1🔬 |
| Satrapies † | 540 | State Workforce | — | **The Forbidden City**, **The Great Wall** | — |
| Shipwrights | 540 | Raised Fields | Galley, Tower Ship, Fire Ship | Shipyard | — |
| The Examination Hall | 540 | Code of Laws | — | Examination Hall | — |
| The Saddle | 540 | Iron Working | Horseman, Horse Archer, War Elephant | — | — |
| Daughter Cities † | 680 | The Examination Hall | — | Town Charter | — |
| Engineering | 680 | The Saddle | — | Aqueduct, Baths, Watermill, **The Circus Maximus** | — |
| Guildhalls | 680 | Satrapies | — | Workshop | — |
| Horology | 680 | Mathematics | — | **The Water Clock of Su Song**, Clocktower | — |
| Theology | 680 | Rhetoric | — | Monastery, Cathedral, **Chichen Itza**, **Hagia Sophia**, **Angkor Wat**, **The Great Mosque of Djenné** | — |

What the effect rows say (player prose from the data):

- **Iron Working** — Iron is named at last, and every warrior of yours retools into a sword the moment a seam of it is yours.
- **Raised Fields** — A farm on a hex touching a mountain feeds its city better than it did. It is the field that changes, not the peak: nothing is grown on the mountain itself.
- **State Workforce** — Every worker you train has one more season of work in it, and the treasury hires one at a quarter off.
- **Satrapies** — Roads near your cities cost nothing to keep, every city joined to your capital pays one more gold, and a joined city is a contented one.
- **Satrapies** † Hammers toward a building your capital already keeps waits until a one-time grant can look at what stands in another town.
- **The Examination Hall** — A realm that is content or well governed is rewarded more generously.
- **Daughter Cities** — Settlers are trained faster, and every city you found is founded with its charter already granted.
- **Daughter Cities** † A city planted far from the capital costing less authority waits for the writ to know how far from home a site is.
- **Theology** — The enhancing beliefs open here: a faith may now be deepened as well as spread.

### Æra IV — The Age of Cathedrals (15 nodes, 1450–2200🔬)

| node | 🔬 | prereqs | units | buildings | abilities & gifts |
|---|---|---|---|---|---|
| Divine Right | 1450 | Guildhalls | — | Courthouse | renewals: Library +1🔬 +1🕯 |
| Geomancy | 1450 | Daughter Cities, Horology | — | — | — |
| Machinery | 1450 | Horology, Engineering | Crossbowman | Armoury | — |
| Paper Money † | 1450 | Shipwrights, Guildhalls | — | Mint, Bazaar | renewals: Market +2💰 |
| Scholarship | 1450 | Theology | — | University, **The House of Wisdom**, **The Turning Heavens** | — |
| Castellany † | 1700 | Divine Right | Pikeman | Castle | — |
| Natural Philosophy | 1700 | Scholarship | Trebuchet | **Machu Picchu** | — |
| Steel | 1700 | Machinery | Longswordsman | Forge | — |
| The Golden Roads | 1700 | Paper Money | — | Caravanserai | — |
| Militant Orders | 1950 | Steel | Knight | **The Alhambra** | — |
| Movable Type | 1950 | Steel, The Golden Roads | — | Printing House | renewals: Library +1🎵 |
| The Astrolabe | 1950 | Natural Philosophy | Caravel, Carrack, Gun Galley | Observatory | Open Ocean |
| The Counting Houses | 1950 | The Golden Roads, Castellany | — | Bank | renewals: Market +2💰 |
| The Holy Office | 1950 | Scholarship | Inquisitor | The Reliquary, **Notre-Dame** | — |
| Alchemy | 2200 | Militant Orders, Movable Type, The Counting Houses, The Astrolabe, The Holy Office | The Fire Lance | The Alchemical Society, **The Alchemical Codex** | reveals **Niter** · pays a **bead** to every completer |

What the effect rows say (player prose from the data):

- **Divine Right** — A city you have taken by force costs one less authority.
- **Geomancy** — Every mine your cities work gives up a further hammer. Workers and explorers may survey a hill they stand on: a turn spent asking the ground what it hides. A rich seam, buried iron, or gems come up as a resource anyone can see; an empty hill is marked surveyed and stays answered. Every survey pays a small assay.
- **Paper Money** † The Bourse, which would turn a city’s coin into culture every turn, waits for a building that spends gold rather than earning it.
- **Castellany** † Defenders shrugging off arrows waits until a strength line can be told which weapon it is answering.
- **Steel** — Every soldier of the sword line marches one hex further.
- **The Golden Roads** — One more caravan may be on the road at once.
- **Movable Type** — A city joined to your capital is contented by the news that reaches it — and it is contented again if your roads were already famous.
- **Alchemy** — Niter is named, and the first soldier who carries fire may be trained where it is dug. Completing this pays a glass bead, and the first empire in the world to complete it opens the Magnum Opus for everybody.

