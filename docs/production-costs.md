# Production costs — the standard

What anything costs to build, in one rule. Ruled 2026-09-07; landed as batch P1,
schema 89. The reference for `data/rules.json`'s `production` block, the `size`
and `column` fields on every building and unit row, and the fold in
`src/sim/cities.ts`.

> The user: *"we need to scale them back … buildings should be sized small,
> medium, large, wonder, and we should use one set of scaling notation across the
> board. Costs should scale this base production cost by column number in the
> tech tree."*

## 1. The rule

    price = sizeHammers[size] × columnRate ^ (column − 1)

floored once, then — for a `oncePerEmpire` row only — `× √(cities ÷ uniqueCostBreakeven)`,
floored again. A settler's ladder (`UnitDef.escalation`) climbs on top of the
figure that produces.

- **The row carries a size**, never a figure. `BuildingDef.size` ·
  `UnitDef.size`. A row still carrying `cost` fails the register test.
- **The column is the tree's**: `techColumn` of the technology that unlocks the
  row (`BUILDING_UNLOCK_TECH` / `UNIT_UNLOCK_TECH`, and `worldUnlockTech` for the
  Magnum Opus), floored at 1 — the root's column is nominal and never paid.
- **A row the tree does not name carries its own `column`**: a charter's
  building, a hull that shipped ahead of its node, a row kept warm for saves.
- **Projects are outside all of it** (`ProjectDef.cost` stays a number): a
  project's cost is the size of one conversion, not the price of a thing.

## 2. The figures (`data/rules.json`, `production`)

| Size | Base hammers | What it is |
|---|---|---|
| **small** | 30 | a shrine, a monument, a granary, a lighthouse |
| **medium** | 40 | a market, a temple, a workshop, an aqueduct |
| **large** | 60 | a university, a bank, a castle, a forge, a cathedral; **every once-per-empire row** |
| **wonder** | 130 | every wonder; the Magnum Opus |
| **free** | 0 | never built and never bought with hammers |

| Unit size | Base hammers | What it is |
|---|---|---|
| **light** | 10 | scout, warrior, archer, worker |
| **line** | 14 | the infantry line and the early hulls |
| **heavy** | 20 | the mounted, the late infantry, the light hulls |
| **engine** | 23 | siege engines, the gun decks, the trader's cart |
| **settler** | 28 | the settler, whose ladder rides on top |
| **free** | 0 | the called pieces — the prophet and her sisters, the great person |

`columnRate` **1.31** — ruled ("lets make it 1.31. I'll let you know if we need
to tweak it"). It is the late-game dial: it barely moves the early columns and it
sets where the last column lands.

| Column | ×rate | small | medium | large | wonder | light | line | heavy | engine |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 1.00 | 30 | 40 | 60 | 130 | 10 | 14 | 20 | 23 |
| 2 | 1.31 | 39 | 52 | 78 | 170 | 13 | 18 | 26 | 30 |
| 3 | 1.72 | 51 | 68 | 102 | 223 | 17 | 24 | 34 | 39 |
| 4 | 2.25 | 67 | 89 | 134 | 292 | 22 | 31 | 44 | 51 |
| 5 | 2.94 | 88 | 117 | 176 | 382 | 29 | 41 | 58 | 67 |
| 6 | 3.86 | 115 | 154 | 231 | 501 | 38 | 54 | 77 | 88 |
| 7 | 5.05 | 151 | 202 | 303 | 657 | 50 | 70 | 101 | 116 |
| 8 | 6.62 | 198 | 264 | 397 | 860 | 66 | 92 | 132 | 152 |
| 9 | 8.67 | 260 | 346 | 520 | 1127 | 86 | 121 | 173 | 199 |
| 10 | 11.36 | 340 | 454 | 681 | 1477 | 113 | 159 | 227 | 261 |
| 11 | 14.88 | 446 | 595 | 893 | 1934 | 148 | 208 | 297 | 342 |
| 12 | 19.50 | 584 | 779 | 1169 | 2534 | 194 | 272 | 389 | 448 |

**Ruled — units ride the same curve at the same rate**, 2026-09-07: *"this is ok,
lets playtest first, because things felt way too cheap during my playtest."* A
late army costs what a late building costs. The retune kept in reserve, if the
playtest asks for one, is a gentler `unitColumnRate` of its own (1.22 puts the
knight at 146 and the frigate at 262).

## 3. How a row is sized

Buildings, by the base each row printed before the standard: **small** ≤ 35 ·
**medium** 36–90 · **large** 91 and up, or any `oncePerEmpire` row ·
**wonder** every wonder and the Magnum Opus · **free** a row that is never built
and never bought.

Units, by the table in §2: the four light rows by name, then the infantry line,
the mounted and late infantry, the engines and gun decks. A row the sizing pass
did not name took the nearest of the four bases to the figure it printed —
the trader (28 → engine), the composite bowman (14 → line), the fire ship
(20 → heavy), the spear wall (17 → line, the tie broken toward the infantry it
fights as).

Two rows sit on a boundary and were sized by the rule rather than by the
examples above it: the **Library** printed 28 and is `small`, where §2's list of
what a medium building is names a library; the **Chapel** printed 53 and is
`medium`, where the same list names a chapel among the small ones. Both are one
JSON field if the user wants them moved.

Charters — a building no technology opens, handed over by a card — take the
**first column of their pool's age**: chiefdom 1, Government I 2, II 4, III 6,
IV 9, V 11. The Gilded Hall is a Doctrine of the Government III tier and takes
column 6 with them.

The **four faith houses** a follower belief opens (batch B3 — the Mosque, the
Wat, the Gurdwara, the Dar-e Mehr) take the column of the **Temple's** node,
`theHighTemple`'s 5: a belief has no tier to read a column off, and the faith
house of that age is exactly what the Temple costs. They are `medium` like the
Temple, so all four price at 117⚙ — which is 117🕯 through the faith bank, the
only one that sells them (`BuildingDef.purchase`, `faithPerHammer` 1).

## 4. The fold

`explainBuildingCost(id, state?, playerId?)` and
`explainUnitCost(state, playerId, type)` in `src/sim/cities.ts`, hard rule 5 said
about a price. The lines, in the order the arithmetic runs:

1. **the size** — "Large building 60" · "Heavy unit 20".
2. **the column** — "Column 8 ×6.62", the label stating the column and the
   multiplier carried as the line's own value. Absent at the first column, where
   the curve multiplies by one, and absent on a `free` row.
3. **the empire**, for a `oncePerEmpire` row — "Empire of 9 cities ×1.50".
4. **the ladder**, for a unit with `escalation` — "3 already built" — then the
   settler-named card rule, "Cards −20%".

`foldBuildingCost` is `buildingProductionCost`; `foldUnitCost` sums either list.
`unitRosterCost` is lines 1–2 alone — what the roster charges before any empire
touches the price, which is what the Compendium prints. Every surface prints the
fold: the purchase (`goldPerHammer` × the folded price), the wonder refund, the
build list, the star chart, the bot's chains.

## 5. The assignment of record

Sync-tested against the data rows (`test/sim/productionCosts.test.ts`); retired
rows are excluded from the table and keep their size in the data so a save
replays. The hammer column is what the fold prints today, at the breakeven
reading for a once-per-empire row.

### Buildings

| Row | Name | Size | Column | Hammers |
|---|---|---|---|---|
| `monument` | Monument | small | 2 | 39 |
| `granary` | Granary | small | 1 | 30 |
| `shrine` | Shrine | small | 2 | 39 |
| `barracks` | Barracks | small | 2 | 39 |
| `stable` | Stable | medium | 3 | 68 |
| `palisade` | Palisade | medium | 2 | 52 |
| `stoneWalls` | Stone Walls | medium | 5 | 117 |
| `library` | Library | small | 3 | 51 |
| `temple` | Temple | medium | 5 | 117 |
| `market` | Market | medium | 4 | 89 |
| `aqueduct` | Aqueduct | medium | 8 | 264 |
| `workshop` | Workshop | medium | 8 | 264 |
| `watermill` | Watermill | medium | 8 | 264 |
| `amphitheater` | Amphitheater | medium | 4 | 89 |
| `university` | University | large | 9 | 520 |
| `cathedral` | Cathedral | large | 8 | 397 |
| `gildedHall` | Gilded Hall | large | 6 | 231 |
| `hallOfDeeds` | Hall of Deeds | small | 1 | 30 |
| `bazaar` | Bazaar | medium | 9 | 346 |
| `harbour` | Harbour | medium | 5 | 117 |
| `forum` | Forum | large | 6 | 231 |
| `courthouse` | Courthouse | large | 9 | 520 |
| `shipyard` | Shipyard | medium | 7 | 202 |
| `castle` | Castle | large | 10 | 681 |
| `forge` | Foundry | large | 10 | 681 |
| `caravanserai` | Caravanserai | large | 6 | 231 |
| `printingHouse` | Printing House | large | 11 | 893 |
| `observatory` | Observatory | large | 11 | 893 |
| `garden` | Garden | medium | 5 | 117 |
| `publicBath` | Public Bath | medium | 6 | 154 |
| `lighthouse` | Lighthouse | small | 2 | 39 |
| `townCharter` | Town Charter | small | 8 | 198 |
| `bank` | Bank | large | 11 | 893 |
| `bourse` | Bourse | large | 9 | 520 |
| `bastion` | Bastion | large | 10 | 681 |
| `alchemicalSociety` | The Alchemical Society | large | 12 | 1169 |
| `chartTheStars` | Chart the Stars | large | 4 | 134 |
| `theTurningHeavens` | The Turning Heavens | large | 9 | 520 |
| `theAlchemicalCodex` | The Alchemical Codex | large | 12 | 1169 |
| `theMagnumOpus` | The Magnum Opus | wonder | 12 | 2534 |
| `chapel` | Chapel | medium | 2 | 52 |
| `keep` | Keep | medium | 2 | 52 |
| `scriptorium` | Scriptorium | large | 4 | 134 |
| `assayHouse` | Assay House | large | 4 | 134 |
| `cistern` | Cistern | medium | 4 | 89 |
| `assemblyHall` | Assembly Hall | large | 4 | 134 |
| `smithy` | Smithy | medium | 4 | 89 |
| `coinworks` | Coinworks | large | 6 | 231 |
| `almshouse` | Almshouse | large | 6 | 231 |
| `orrery` | Orrery | large | 6 | 231 |
| `assizeCourt` | Assize Court | large | 6 | 231 |
| `relic` | Relic | free | 1 | 0 |
| `heroicEpic` | Heroic Epic | large | 4 | 134 |
| `imperialThrone` | Imperial Throne | large | 5 | 176 |
| `highTemple` | High Temple | large | 5 | 176 |
| `mosque` | Mosque | medium | 5 | 117 |
| `wat` | Wat | medium | 5 | 117 |
| `gurdwara` | Gurdwara | medium | 5 | 117 |
| `darEMehr` | Dar-e Mehr | medium | 5 | 117 |

### Wonders

| Row | Name | Size | Column | Hammers |
|---|---|---|---|---|
| `theOracle` | The Oracle | wonder | 2 | 170 |
| `stonehenge` | Stonehenge | wonder | 2 | 170 |
| `pyramids` | The Pyramids | wonder | 2 | 170 |
| `hangingGardens` | The Hanging Gardens | wonder | 2 | 170 |
| `wallsOfUruk` | The Walls of Uruk | wonder | 2 | 170 |
| `greatZiggurat` | The Great Ziggurat | wonder | 3 | 223 |
| `greatLighthouse` | The Great Lighthouse | wonder | 2 | 170 |
| `templeOfArtemis` | The Temple of Artemis | wonder | 1 | 130 |
| `greatLibrary` | The Great Library | wonder | 6 | 501 |
| `colossus` | The Colossus | wonder | 5 | 382 |
| `petra` | Petra | wonder | 7 | 657 |
| `circusMaximus` | The Circus Maximus | wonder | 8 | 860 |
| `terracottaArmy` | The Terracotta Army | wonder | 6 | 501 |
| `greatWall` | The Great Wall | wonder | 7 | 657 |
| `theatreOfDionysus` | The Theatre of Dionysus | wonder | 4 | 292 |
| `mausoleum` | The Mausoleum | wonder | 4 | 292 |
| `statueOfZeus` | The Statue of Zeus | wonder | 6 | 501 |
| `chichenItza` | Chichen Itza | wonder | 8 | 860 |
| `hagiaSophia` | Hagia Sophia | wonder | 8 | 860 |
| `angkorWat` | Angkor Wat | wonder | 8 | 860 |
| `greatMosqueOfDjenne` | The Great Mosque of Djenné | wonder | 8 | 860 |
| `notreDame` | Notre-Dame | wonder | 11 | 1934 |
| `houseOfWisdom` | The House of Wisdom | wonder | 9 | 1127 |
| `forbiddenCity` | The Forbidden City | wonder | 7 | 657 |
| `alhambra` | The Alhambra | wonder | 11 | 1934 |
| `machuPicchu` | Machu Picchu | wonder | 10 | 1477 |
| `waterClockOfSuSong` | The Water Clock of Su Song | wonder | 8 | 860 |

### Units

The `trader` row is priced here and **built nowhere** (ruled 2026-09-09,
schema 100, `UnitDef.routeOnly`): a caravan is hired with the route it
carries, and this figure is what the hire converts — `routePrice` is
`goldPerHammer × these hammers × rules.trade.routePriceMultiplier`. So the
price of a route climbs the columns with the age like everything else on this
table, with no second figure anywhere. See `docs/trade.md`.

| Row | Name | Size | Column | Hammers |
|---|---|---|---|---|
| `warrior` | Warrior | light | 1 | 10 |
| `scout` | Scout | light | 1 | 10 |
| `settler` | Settler | settler | 1 | 28 |
| `worker` | Worker | light | 1 | 10 |
| `trader` | Trader | engine | 4 | 51 |
| `archer` | Archer | light | 1 | 10 |
| `bowman` | Bowman | line | 5 | 41 |
| `spearman` | Spearman | line | 2 | 18 |
| `horseman` | Horseman | heavy | 7 | 101 |
| `chariot` | War Chariot | heavy | 3 | 34 |
| `chariotArcher` | Chariot Archer | heavy | 3 | 34 |
| `swordsman` | Swordsman | line | 4 | 31 |
| `catapult` | Catapult | engine | 7 | 116 |
| `compositeBowman` | Composite Bowman | line | 7 | 70 |
| `pikeman` | Pikeman | line | 10 | 159 |
| `crossbowman` | Crossbowman | line | 9 | 121 |
| `knight` | Knight | heavy | 11 | 297 |
| `longswordsman` | Longswordsman | heavy | 10 | 227 |
| `trebuchet` | Trebuchet | engine | 10 | 261 |
| `trireme` | Trireme | line | 2 | 18 |
| `bireme` | Bireme | line | 5 | 41 |
| `galley` | Galley | line | 7 | 70 |
| `caravel` | Caravel | heavy | 11 | 297 |
| `corvette` | Corvette | heavy | 11 | 297 |
| `warGalley` | War Galley | heavy | 5 | 58 |
| `towerShip` | Tower Ship | engine | 7 | 116 |
| `carrack` | Carrack | engine | 11 | 342 |
| `shipOfTheLine` | Ship of the Line | engine | 12 | 448 |
| `fireShip` | Fire Ship | heavy | 7 | 101 |
| `gunGalley` | Gun Galley | engine | 11 | 342 |
| `frigate` | Frigate | engine | 12 | 448 |
| `prophet` | Prophet | free | 5 | 0 |
| `apostle` | Apostle | free | 8 | 0 |
| `inquisitor` | Inquisitor | free | 11 | 0 |
| `greatPerson` | Great Person | free | 1 | 0 |
| `phalanx` | Phalanx | line | 4 | 31 |
| `legionary` | Legionary | line | 6 | 54 |
| `horseArcher` | Horse Archer | heavy | 7 | 101 |
| `spearWall` | Spear Wall | line | 6 | 54 |
| `warElephant` | War Elephant | heavy | 7 | 101 |
| `fireLance` | The Fire Lance | heavy | 12 | 389 |
| `knightsTemplar` | Knights Templar | heavy | 11 | 297 |
