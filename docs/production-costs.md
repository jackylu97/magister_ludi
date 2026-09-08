# Production costs — the standard (proposal, 2026-09-07)

The user: *"we need to scale them back … buildings should be sized small,
medium, large, wonder, and we should use one set of scaling notation across
the board. Costs should scale this base production cost by column number in
the tech tree."* User marginalia here are rulings.

## 1. What the numbers are today

Two ladders multiply each other:

- **The rows' own bases** already climb with the age — Granary 21, Market
  59, Workshop 69, University 134, Bank 180, Alchemical Society 210;
  wonders 80–110 in Æra I, 300–340 in Æra IV.
- **The band** (`production.costAgeBand` = 1.25 · 2.5 · 4.5 · 8.5 by the
  unlocking tech's age, batches H10/H11) multiplies them again.

Effective prices today, by tech column (the column is `techColumn`, 0 for a
row no tech unlocks):

| Column | Age | Ordinary buildings | Uniques | Wonders | Units (base) |
|---|---|---|---|---|---|
| 0 (charters, ungated) | — | 40 – 437 | Magnum Opus 1500 | — | warrior 10 … settler 28 |
| 1–3 | I | 18 – 52 | — | 100 – 137 | 11 – 24 |
| 4–5 | II | 132 – 185 | 250 · 750 | 475 – 537 | 12 – 28 |
| 6–8 | III | 135 – 1530 | 585 | 810 – 1530 | 14 – 26 |
| 9–12 | IV | 374 – 1785 | 3400 · 4250 | 2677 – 2890 | 17 – 27 |

Three things wrong with it, all of them the double ladder: the Cathedral
(340 base, Æra III) costs what a late wonder costs; the charters are priced
as Æra I whatever pool opens them; and a retune of either ladder moves the
other's meaning.

Where they live: `cost` on every row of `data/buildings.json` and
`data/units.json`; `production.costAgeBand`, `uniqueCostBreakeven`,
`goldPerHammer` in `data/rules.json`; the fold in
`src/sim/yields/town.ts` (`explainBuildingCost`, `explainUnitCost`).

## 2. The standard

**One base per size, one curve by column, nothing else.**

`price = sizeHammers[size] × columnRate ^ (column − 1)`, floored once, plus
the existing once-per-empire line (× √(cities ÷ 4)) for uniques. The row
carries a **size**, never a number; the column comes from the unlocking
tech, or from the row's own `column` for a row no tech unlocks (a charter
takes the column of the tech its card's pool opens on — stated per row).

Proposed figures (`data/rules.json`, `production`):

| Size | Base hammers | What it is |
|---|---|---|
| **small** | 30 | a shrine, a monument, a granary, a lighthouse, a chapel |
| **medium** | 40 | a library, a market, a temple, a workshop, an aqueduct |
| **large** | 60 | a university, a bank, a castle, a forge, a cathedral; **every once-per-empire row** |
| **wonder** | 130 | every wonder; the Magnum Opus |

`columnRate` **1.31** — **ruled 2026-09-07** ("lets make it 1.31. I'll let
you know if we need to tweak it"). The rate is a late-game dial: it barely
moves column 4 (a Market is 72 at 1.22, 89 at 1.31) and sets where the last
column lands (a column-12 wonder 1160 at 1.22, 2534 at 1.31 — about
today's). The table, from the ruled sizes:

| Column | ×rate | small | medium | large | wonder |
|---|---|---|---|---|---|
| 1 | 1.00 | 30 | 40 | 60 | 130 |
| 2 | 1.31 | 39 | 52 | 78 | 170 |
| 3 | 1.72 | 51 | 68 | 102 | 223 |
| 4 | 2.25 | 67 | 89 | 134 | 292 |
| 5 | 2.94 | 88 | 117 | 176 | 382 |
| 6 | 3.86 | 115 | 154 | 231 | 501 |
| 7 | 5.05 | 151 | 202 | 303 | 657 |
| 8 | 6.62 | 198 | 264 | 397 | 860 |
| 9 | 8.67 | 260 | 346 | 520 | 1127 |
| 10 | 11.36 | 340 | 454 | 681 | 1477 |
| 11 | 14.88 | 446 | 595 | 893 | 1934 |
| 12 | 19.50 | 584 | 779 | 1169 | 2534 |

Against today: a Granary (small, column 1) 30 where it is 26; a Library
(medium, 3) 68 where it is 35; a Market (medium, 4) 89 where it is 147; a
Cathedral (large, 8) 397 where it is 1530; a University (large, 9) 520
where it is 1139; a Bank (large, 11) 893 where it is 1530; Notre-Dame
(wonder, 11) 1934 where it is 2720. Æra I goes up a little, Æra II–III
comes down by a third to three quarters, and the last column lands near
today.

**Units** on the same curve with four sizes of their own (or keep each
row's base and multiply by the column curve — mark which):

| Unit size | Base | Rows |
|---|---|---|
| **light** | 10 | scout, warrior, archer, worker |
| **line** | 14 | spearman, swordsman, phalanx, bowman, legionary, pikeman, crossbowman, trireme, bireme, galley |
| **heavy** | 20 | horseman, chariot, chariot archer, horse archer, knight, cataphract, war elephant, longswordsman, fire lance, war galley, caravel, corvette |
| **engine** | 23 | catapult, trebuchet, tower ship, carrack, frigate, ship of the line, gun galley |
| **settler** | 28 · escalating | the settler's own ladder stays |

By column at 1.31: light 10 · 13 · 17 · 22 · 29 · 38 · 50 · 66 · 86 · 113 ·
148 · 194; line 14 … 272; heavy 20 … 389; engine 23 … 448.

**Ruled (a) — the user, 2026-09-07: "this is ok, lets playtest first,
because things felt way too cheap during my playtest."** Units ride the
same 1.31 curve with the four sizes above; no unit rate of its own. The
readings are kept below for the retune if the playtest asks for one.

*The mark as put:* units at 1.31 climb past today late. Today a unit is its
base × the age band (1.25 · 2.5 · 4.5 · 8.5), which tops out at ×8.5; the
column curve tops out at ×19.5. So a warrior (light, column 1) is 10 where
it is 12 and a spearman (line, 2) 18 where it is 13, but a knight (heavy,
11) is 297 where it is 187, a trebuchet (engine, 9) 199 where it is 108,
and a frigate (engine, 12) 448 where it is 238. Three readings, mark one:
(a) accept — a late army costs what a late building costs; (b) units take
their own gentler rate (`production.unitColumnRate`, e.g. 1.22 puts the
knight at 146 and the frigate at 262); (c) units keep the age band as
today and only buildings move to the column curve. The orchestrator
recommends **(b)** — one curve shape, two rates, and the late army stays
near today's price.

## 3. Assignments to mark

Every live building and unit row gets a size; the batch writes the table
into this doc with a sync test (row ↔ size, like the Orders doc). The
orchestrator's first pass, by today's base: **small** ≤ 35 · **medium**
36–90 · **large** 91–220 or `oncePerEmpire` · **wonder** every wonder. Mark
any row you want moved. Charters: each carries `column` = the first column
of its pool's age (chiefdom 1, Government I 2, II 4, III 6, IV 9, V 11) —
mark a different reading if you have one.

## 4. What changes in the code

- `BuildingDef.cost` → `BuildingDef.size` (and `UnitDef.cost` → `UnitDef.size`
  if units take sizes); `column?` on rows no tech unlocks. The old `cost`
  field is refused by the loader.
- `production.sizeHammers`, `production.unitSizeHammers`,
  `production.columnRate`; `costAgeBand` retired.
- `explainBuildingCost` / `explainUnitCost` print two lines — "Large
  building" 80 · "Column 8 ×4.02" — and the unique's third; every surface
  prints the fold as today. The purchase price follows.
- Escalation (settlers) multiplies the row's escalated figure as it does
  now; the Magnum Opus stays a wonder-sized unique.
- Schema (every replay moves). The parity harness is not the gate here —
  this changes numbers on purpose; the order suite and the doc sync are.
- `docs/yields.md`'s cost paragraph and `docs/tech-tree.md`'s table follow.
