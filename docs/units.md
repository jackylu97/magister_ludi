# Units — the roster and what it fights at

Every live row of `data/units.json`, printed at the figures the game charges.
Ruled 2026-09-09 (`docs/flags.md` item (ppp), batch D2 — the user: *"Could you
also create a doc with every unit and their combat strengths?"*).

Everything below the roster heading is **generated** from the data through the
sim's own readers — `unitDef`, `unitMaxHp`, `unitRosterCost`, `UNIT_UNLOCK_TECH`,
`RULES`. Regenerate it with

    UNITS_DOC_WRITE=1 npx vitest run test/sim/unitsDocSync.test.ts

and a run *without* the variable asserts the same region byte for byte
(`test/sim/unitsDocSync.test.ts`, core tier), so a row retuned in the data and
not regenerated here fails core rather than leaving the user reading last week's
chart.

**The Notes column is yours.** Write in it; every regeneration reads it back and
prints it into the row of the same name. (A *renamed* row loses its note — the
note was about a name that no longer exists.)

A **retired** row (`UnitDef.retired`) is left out: it stays in the data because a
save may name it, and it leaves the reference because nobody can raise one.

## The columns

- **Class** — `modelClass`, the silhouette the board carves. Art, with two
  stated exceptions: a mirrored row reads it to find the line it shadows, and
  the naval classes name the triangle's corners.
- **Str** — `combatStrength`, what the piece is worth closing or holding.
  A zero is not "very weak": it is how a row declares itself a civilian
  (`isCombatant`), never killed, only captured.
- **Ranged** · **Range** — `rangedStrength` and `range`, present or absent as a
  pair. The pair *is* the declaration that a row shoots (`isRanged`); a row
  without it can only close.
- **Move** · **Sight** — the allowance refilled each turn, and how far the piece
  reveals before the hills bonus. Two fields on purpose: a scout that saw as far
  as it moved would have made the horse the explorer by accident.
- **HP** — `unitMaxHp` at the roster's reading (no stamp). A stamped piece
  carries more, and nothing anywhere compares a bar against the printed figure.
- **Size** · **Cost** — the size band the row carries, and `unitRosterCost`: the
  hammers before any empire touches the price. A row never carries a figure.
- **Escalation** — hammers this type gets dearer by per one of *this same type*
  already built or bought (`Player.unitsBuilt`, counted per type).
- **Unlocked by** — the node whose `unlocks` names the row (`UNIT_UNLOCK_TECH`).
  A dash means no node names it: read the marks, which say whether the row awaits
  its node, is opened by a card, or is called rather than trained.
- **Upgrades to** — `upgradesTo`: what a standing piece becomes the moment the
  successor's technology lands. No command, no gold, no obsolete pieces.
- **Marks** — every marker the row carries that changes what the piece is for.
  Markers, never names: a second caravan or a second bombard joins this column by
  carrying the field.

## How a strength is folded

`planCombat` (`src/sim/combat.ts`) is the one evaluator; the forecast and the
blow read the same plan.

- **Damage is an exponential in the *difference* of two effective strengths**,
  times a roll drawn from `state.rng` — `rules.combat.baseDamage`,
  `strengthExponent`, `rollBand`. It has no scale: a fixed edge is worth the same
  multiplier at any rung of the roster.
- **Everything on the defender's side is flat points on one ledger** (ruled
  2026-08-28), never a percentage: terrain, the trench, a citadel, a card, a
  wall — one column a player can add up.
- **Terrain** — the ground's own defence, summed from terrain, feature and hills;
  `src/sim/terrainData.ts` itemises it. A city takes none: the walls are the
  terrain.
- **Fortification** — turns dug in × `rules.combat.fortifyBonusPerTurn`, capped
  at `fortifyMax` (`fortifyBonus`). Presence of the counter *is* the state.
- **The general's aura** — `rules.greatPeople.generalAuraStrength` to every
  soldier of the same side within `generalAuraRange`, on both sides of a fight,
  naming the general (`generalAuraLines`). It does **not** stack: the sweep
  returns at the first general in reach. A standing inquisitor's aura is its twin.
- **The naval triangle is three data rows and three folds**, with no branch
  anywhere in the damage curve: the rows' own lines (the table below), **the line
  of battle** — `rules.naval.lineBonusPerHull` per adjacent friendly heavy hull,
  capped at `lineBonusMax`, read off the `blockades` marker (`navalLineLines`) —
  and the water, on the defender only.
- **At sea** — a land piece caught on water defends at
  −`rules.naval.atSeaPenalty`, unless a friendly light hull shares the hex, in
  which case it defends at the hull's strength instead (`seaDefenceLines`, read
  off the `hitAndRun` marker). Exactly one of the two lines, never both, and
  never anything for a hull.
- **Hit and run** — a `hitAndRun` row pays `rules.naval.hitAndRunCost` out of its
  allowance instead of ending its turn. It still strikes only once a turn.
- **Two percentages survive**, both attacker-side and both facts about that army
  rather than about the ground: `rules.combat.riverAttackPenalty` on a melee blow
  across a river, and a card's own `cardCombatPercent`. Both multiply the unit's
  base before a single flat line joins.
- **A town defends with the strongest unit its owner could train right now**
  (`cityBaseStrength`, floored at `rules.combat.cityMinStrength`) plus its walls,
  cards and buildings; its health is `cityMaxHp`, never `cityBaseHp`.
- **The naval rules** — what may strike what at sea, and the taking of a town:
  `docs/war-diplomacy.md`.

## The cost standard

- A unit's price rides the buildings' own curve: `unitSizeHammers[size] ×
  columnRate ^ (column − 1)`, floored once, then the escalation ladder.
  `docs/production-costs.md` is the reference; the Cost column below is the fold
  before any empire touches it (`unitRosterCost`).
- **The column is the tree's** — the column of the node that unlocks the row,
  floored at 1. A row no node names is priced at its own `column`.
- **Escalation is per type**: a settler and a worker each climb their own ladder,
  keyed by row in `Player.unitsBuilt`, and a free unit never raises it.
- **A row naming a bank sells only there** (`UnitDef.purchase`); everything else
  sells for gold at `goldPerHammer` × the full production cost. A city buys one
  unit per class per turn.

## The roster

Generated — do not hand-edit anything below this line except the **Notes**
column, which is carried through every regeneration.

### Military — 33 rows

| Unit | Class | Str | Ranged | Range | Move | HP | Sight | Size | Cost | Escalation | Unlocked by | Upgrades to | Marks | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Warrior | melee | 20 | — | — | 2 | 100 | 2 | light | 10 | — | Agriculture | Swordsman | — |  |
| Scout | scout | 10 | — | — | 2 | 100 | 3 | light | 10 | — | Agriculture | — | ignores terrain |  |
| Archer | ranged | 15 | 20 | 2 | 2 | 100 | 2 | light | 10 | — | Fletching | Bowman | — |  |
| Bowman | ranged | 20 | 28 | 2 | 2 | 100 | 2 | line | 41 | — | Siegecraft | Composite Bowman | — |  |
| Spearman | melee | 25 | — | — | 2 | 100 | 2 | line | 18 | — | Bronzeworking | Phalanx | — |  |
| Horseman | mounted | 48 | — | — | 4 | 100 | 2 | heavy | 101 | — | The Saddle | Knight | needs improved Horses |  |
| War Chariot | mounted | 33 | — | — | 4 | 100 | 2 | heavy | 34 | — | The Wheel | Horseman | needs improved Horses |  |
| Chariot Archer | mountedRanged | 20 | 26 | 2 | 3 | 100 | 2 | heavy | 34 | — | The Wheel | Horse Archer | needs improved Horses |  |
| Swordsman | melee | 35 | — | — | 2 | 100 | 2 | line | 31 | — | Bronze Panoply | Legionary | needs improved Iron |  |
| Catapult | siege | 35 | 42 | 2 | 1 | 100 | 2 | engine | 116 | — | Mathematics | Trebuchet | — |  |
| Composite Bowman | ranged | 30 | 39 | 2 | 2 | 100 | 2 | line | 70 | — | Mathematics | Crossbowman | — |  |
| Pikeman | melee | 52 | — | — | 2 | 120 | 2 | line | 159 | — | Castellany | — | — |  |
| Crossbowman | ranged | 45 | 50 | 2 | 2 | 110 | 2 | line | 121 | — | Machinery | — | — |  |
| Knight | mounted | 60 | — | — | 4 | 120 | 2 | heavy | 297 | — | Militant Orders | — | needs improved Horses |  |
| Longswordsman | melee | 55 | — | — | 2 | 120 | 2 | heavy | 227 | — | Steel | — | needs improved Iron |  |
| Trebuchet | siege | 40 | 48 | 2 | 1 | 110 | 2 | engine | 261 | — | Natural Philosophy | — | — |  |
| Phalanx | melee | 30 | — | — | 2 | 110 | 2 | line | 31 | — | Bronze Panoply | Spear Wall | — |  |
| Legionary | melee | 45 | — | — | 2 | 110 | 2 | line | 54 | — | Iron Working | Longswordsman | needs improved Iron |  |
| Horse Archer | mountedRanged | 32 | 42 | 2 | 4 | 100 | 2 | heavy | 101 | — | The Saddle | — | needs improved Horses |  |
| Spear Wall | melee | 42 | — | — | 2 | 110 | 2 | line | 54 | — | Iron Working | Pikeman | — |  |
| War Elephant | mounted | 50 | — | — | 3 | 130 | 2 | heavy | 101 | — | The Saddle | — | needs improved Ivory |  |
| The Fire Lance | melee | 80 | — | — | 2 | 120 | 2 | heavy | 389 | — | Alchemy | — | needs improved Niter |  |
| Knights Templar | mounted | 60 | — | — | 4 | 120 | 2 | heavy | 297 | — | — | — | opened by a card · bought with faith only · mirrors the best mounted |  |
| Slinger | ranged | 20 | 30 | 2 | 2 | 100 | 2 | line | 41 | — | — | Composite Bowman | unslowed by hills |  |
| Fubing | melee | 27 | — | — | 2 | 110 | 2 | light | 13 | — | — | Spear Wall | — |  |
| Tang Heavy Cavalry | mounted | 50 | — | — | 4 | 110 | 2 | heavy | 101 | — | — | Knight | needs improved Horses |  |
| The Whistling Arrow | mountedRanged | 20 | 26 | 3 | 3 | 100 | 2 | heavy | 34 | — | — | Horse Archer | needs improved Horses |  |
| Xiongnu Horse Archer | mountedRanged | 32 | 42 | 2 | 5 | 100 | 2 | heavy | 101 | — | — | — | needs improved Horses |  |
| The Chanyu's Guard | mounted | 66 | — | — | 5 | 130 | 2 | heavy | 297 | — | — | — | needs improved Horses |  |
| The Khopesh | melee | 35 | — | — | 2 | 110 | 2 | line | 31 | — | — | Longswordsman | needs improved Iron |  |
| Camel Archer | mountedRanged | 32 | 46 | 2 | 4 | 100 | 2 | heavy | 101 | — | — | — | — |  |
| The Pontic Peltast | melee | 26 | — | — | 2 | 110 | 2 | line | 18 | — | — | Spear Wall | — |  |
| The Scythed Chariot | mounted | 46 | — | — | 4 | 110 | 2 | heavy | 132 | — | — | — | needs improved Horses |  |

### Naval — 12 rows

| Unit | Class | Str | Ranged | Range | Move | HP | Sight | Size | Cost | Escalation | Unlocked by | Upgrades to | Marks | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Trireme | navalLight | 36 | — | — | 4 | 100 | 2 | line | 18 | — | Sailing | Bireme | hit and run |  |
| Bireme | navalLight | 40 | — | — | 5 | 100 | 2 | line | 41 | — | Wayfinding | Galley | hit and run |  |
| Galley | navalLight | 52 | — | — | 5 | 100 | 2 | line | 70 | — | Shipwrights | Caravel | hit and run |  |
| Caravel | navalLight | 65 | — | — | 6 | 100 | 2 | heavy | 297 | — | The Astrolabe | Corvette | hit and run |  |
| Corvette | navalLight | 78 | — | — | 6 | 100 | 2 | heavy | 297 | — | — | — | awaits its node · hit and run |  |
| War Galley | navalHeavy | 45 | — | — | 3 | 100 | 2 | heavy | 58 | — | Wayfinding | Tower Ship | blockades |  |
| Tower Ship | navalHeavy | 58 | — | — | 3 | 100 | 2 | engine | 116 | — | Shipwrights | Carrack | blockades |  |
| Carrack | navalHeavy | 72 | — | — | 3 | 100 | 2 | engine | 342 | — | The Astrolabe | Ship of the Line | blockades |  |
| Ship of the Line | navalHeavy | 88 | — | — | 3 | 100 | 2 | engine | 448 | — | — | — | awaits its node · blockades |  |
| Fire Ship | navalRanged | 40 | 50 | 2 | 4 | 100 | 2 | heavy | 101 | — | Shipwrights | Gun Galley | — |  |
| Gun Galley | navalRanged | 52 | 62 | 2 | 4 | 100 | 2 | engine | 342 | — | The Astrolabe | Frigate | — |  |
| Frigate | navalRanged | 66 | 80 | 2 | 4 | 100 | 2 | engine | 448 | — | — | — | awaits its node · bombards |  |

### Civilian — 6 rows

| Unit | Class | Str | Ranged | Range | Move | HP | Sight | Size | Cost | Escalation | Unlocked by | Upgrades to | Marks | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Settler | settler | 0 | — | — | 2 | 100 | 2 | settler | 28 | 7 | Agriculture | — | founds cities · halts growth · needs 2 citizens |  |
| Worker | worker | 0 | — | — | 2 | 100 | 2 | light | 10 | 2 | Agriculture | — | 3 charges |  |
| Prophet | worker | 0 | — | — | 2 | 100 | 2 | free | 0 | — | The High Temple | — | bought with faith only · 2 charges |  |
| Apostle | worker | 0 | — | — | 4 | 100 | 2 | free | 0 | — | Theology | — | bought with faith only · 2 charges |  |
| Inquisitor | worker | 0 | — | — | 2 | 100 | 2 | free | 0 | — | The Holy Office | — | bought with faith only · 1 charge |  |
| Great Person | settler | 0 | — | — | 2 | 100 | 2 | free | 0 | — | — | — | great person · 1 charge |  |

### Trader — 1 row

| Unit | Class | Str | Ranged | Range | Move | HP | Sight | Size | Cost | Escalation | Unlocked by | Upgrades to | Marks | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Trader | worker | 0 | — | — | 2 | 100 | 1 | engine | 51 | — | Currency | — | route only |  |

### The rows' own strength lines

Flat labelled points a **type** carries into every fight it is in
(`UnitDef.combatLines`, folded by `planCombat` beside the ground and the
trench). This is the whole of the naval triangle in the simulation.

| Unit | Line | Points | When |
|---|---|---|---|
| Spearman | Against mounted | +10 | always · vs mounted |
| Catapult | Against cities | +15 | attacking · vs cities |
| Pikeman | Against mounted | +10 | always · vs mounted |
| Trebuchet | Against cities | +20 | attacking · vs cities |
| Trireme | Against ranged ships | +10 | always · vs navalRanged |
| Bireme | Against ranged ships | +10 | always · vs navalRanged |
| Galley | Against ranged ships | +10 | always · vs navalRanged |
| Caravel | Against ranged ships | +10 | always · vs navalRanged |
| Corvette | Against ranged ships | +10 | always · vs navalRanged |
| Fire Ship | Fragile hull | −10 | defending · melee only |
| Gun Galley | Fragile hull | −10 | defending · melee only |
| Frigate | Fragile hull | −10 | defending · melee only |
| Frigate | Bombardment | +20 | attacking · vs cities |
| Phalanx | Against mounted | +10 | always · vs mounted |
| Spear Wall | Against mounted | +10 | always · vs mounted |
| War Elephant | Against cities | +8 | attacking · vs cities |
| Fubing | Against mounted | +10 | always · vs mounted |
| The Pontic Peltast | Against mounted | +10 | always · vs mounted |
| The Scythed Chariot | Against foot | +3 | always · vs melee |

### The figures (`data/rules.json`)

`rules.combat`

| Figure | Value |
|---|---|
| `baseDamage` | 30 |
| `strengthExponent` | 0.04 |
| `rollBand` | 0.2 |
| `fortifyBonusPerTurn` | 3 |
| `fortifyMax` | 6 |
| `riverAttackPenalty` | 0.2 |
| `flankingBonus` | 0 |
| `cityBaseHp` | 100 |
| `cityMinStrength` | 20 |
| `cityStrengthPerPop` | 0 |
| `cityHealPerTurn` | 20 |
| `cityCaptureHpFraction` | 0.25 |
| `siegeDamagePerTurn` | 5 |
| `captureCivilians` | true |

`rules.naval`

| Figure | Value |
|---|---|
| `hitAndRunCost` | 1 |
| `lineBonusPerHull` | 4 |
| `lineBonusMax` | 8 |
| `atSeaPenalty` | 20 |
| `landRangedVsShipPercent` | -50 |
| `landSiegeVsShipPercent` | 50 |
| `embarkedCounterPercent` | 50 |
