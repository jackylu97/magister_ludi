# Early pacing — the second playtest's proposal (2026-09-06)

The user's verdict after the second playthrough on the fewer-things pass:
the science cut landed ("I no longer feel like I'm speeding through the tech
tree"), the Orders feel consequential, happiness-versus-bonus is a real
decision, the flat bonuses read. The complaint: **"my cities don't seem to
have much to build (wonders included)"**, and **three cities is all the
authority allows until late Æra II**.

This is the proposal. User marginalia here are rulings; nothing below moves
until marked. Where a line says *ruled*, it was ruled in chat and is in
`docs/flags.md` (n–r); the numbers beside it are the orchestrator's and are
open.

## 1. Where the lull actually is

The tree's prices at the time of this reading (`data/techs.json`; a column is a
price). Æra I is **333** since ruling (x) landed — 5 · 10×4 · 30×5 · 69×2 — and
the table below is left at the figures the argument was made against:

| Æra | techs | beakers | ordinary buildings | wonders |
|---|---|---|---|---|
| I | 12 | 345 (5 · 13×4 · 30×5 · 69×2) | 7 | 8 |
| II | 9 | 1665 (135×4 · 225×5) | 9 | 3 |
| III | 14 | — | ~20 | — |
| IV | 15 | — | ~15 | — |

Two things stand out:

- **The price step at the age boundary is ×2** (69 → 135) and **Æra II
  costs five times Æra I for nine techs**. With `sciencePerPop` at 0.5 and
  the Library at 0.5, a three-town empire in early Æra II makes roughly 8–12
  beakers a turn: a 135 tech is twelve to seventeen turns, a 225 tech twenty
  or more. Æra I's seven buildings are built by the time Letters lands; then
  the queue waits on the next tech for twelve turns at a time. **The lull is
  early Æra II, not Æra I.** Cheaper Æra I techs reach the same wall sooner.
- **Ten retired rows still hang on their techs** (`steleOfLaws` on Kingship,
  `funeralGames` on Bronze Working, the Mint, the Monastery, the Baths, the
  Armoury, the Reliquary, the Printing House, the Examination Hall, the
  Clocktower): batch D retired the rows and the tree's faces kept naming
  them. **Ruled and built the same night** ("remove stele of laws — and any
  other stale buildings — from the tech tree UX"): `liveUnlocks` in
  `techData.ts` is what every printing surface reads; the gates keep the raw
  lists. The authority building the user was waiting on is the **Imperial
  Throne** (Kingship, 225 beakers, +5 capacity, once per empire) — late Æra
  II, which is the wait the Monument ruling shortens.

Æra I's seven buildings (Granary, Barracks, Shrine, Lighthouse, Monument,
Palisade, Library) are the right number for a 60–80-turn age; the wonders
there are eight. Æra II's nine ordinary buildings arrive behind a
1665-beaker ladder.

## 2. The proposal, in order of leverage

### 2a. Flatten the step — NOT taken; the user ruled elsewhere

**Ruled and built 2026-09-06** (`docs/flags.md`, "Rulings 2026-09-06, late —
early production", items x and y; batch H10, schema 81). The proposal below is
kept as the reading it was, and it is **not what shipped**.

What was proposed: Æra II's two columns from 135 and 225 down to 100 and 180,
flattening the age boundary. What the user ruled instead:

- **(x) the first column of technologies slightly cheaper** — column 1 from 13
  to **10**, and nothing else in the tree. Æra I 345 → 333; Æra II's ladder is
  untouched, so the boundary step the section below argues about is **still
  there**. The Æra I ×0.8 sketched under ruling (s) was not taken either: the
  ruling is one column, not the age.
- **(y) production costs ×1.25 across the board, and rising by age** — one rule
  for every hammer price, `cost × 1.25 ^ age`, buildings and wonders as well as
  units. This is the ruling that answers "my cities don't seem to have much to
  build": not more rows and not cheaper technologies, but **dearer things**, so
  a town's hammers keep meaning something into Æra III. Æra I ×1.25 · II
  ×1.5625 · III ×1.953125 · IV ×2.44140625; the before/after tables are in
  `docs/fewer-things-plan.md`, "Batch H10 as shipped".
- **(z) every figure in the top bar rounds to the nearest integer** — a display
  ruling from the same conversation, built in the same batch.

So the lull this section names is unaddressed **on the science side** by
design, and addressed on the production side instead. The next playtest reads
whether that was enough.

### 2b. Sweep the dangling unlocks — built

Ruled in chat and built: the tree's faces and hover cards read
`liveUnlocks(id)`, which drops every retired unit and building row; the ten
ids stay in `data/techs.json` so the inverted tables and the saves that hold
those rows keep their history. Nothing to mark.

### 2c. Authority for wide play

*Ruled (n):* the **Monument gets `authorityCapacity: 1`** back. What it does
to the ceiling, on the rules as they stand (Palace 4, +2 an age, a founded
town costs 3, a coastal one 2, a captured one 4):

| | Æra I | Æra II | Æra III |
|---|---|---|---|
| capacity, no buildings | 6 | 8 | 10 |
| towns it holds (capital + founded) | 3 | 3 | 4 |
| with a Monument in every town | 4 | 5 | 6 |

Each Monument pays for a third of a town, so a fourth town in Æra I is
reachable the moment the first three have theirs — the "wide" line opens
without waiting on a tech.

*Ruled (p):* **authority in the Orders.** Today none of the chiefdom or
Government I rows pay any (Government II, III, IV have one each). Proposed
rows, one per early pool, all *capacity* (never a discount, which the
Doctrines own):

| Pool | Name | Slot | Rarity | Text |
|---|---|---|---|---|
| chiefdom | The Elders' Writ | E | ● | +1 authority capacity. |
| governmentI | The Marches | M | ◆ | +2 authority capacity · −1 happiness in every city. |
| governmentI | The Census | E | ◆ | +1 authority capacity for each 3 cities you hold. |
| governmentII | (Provincial Governors stays) | | | |

And one Doctrine at tier 4: **The Founders' Charter** — +2 authority
capacity, a newly founded city starts with a Monument. (The tier-10 Gentle
Yoke *costs* authority; it stays.)

**Your call:** ☐ the four rows as written · ☐ fewer/other (mark the table).

### 2d. The once-per-empire buildings scale with the number of cities

*Ruled (o).* Shape: the row's effect carries `perCity: true` — the printed
number is multiplied by the count of cities the empire holds, read once in
`buildingEffects.ts`. The five uniques, as they stand and as proposed:

| Building | Today | Proposed (× cities held) |
|---|---|---|
| Forum | +10% 🔬 🎵 in its city | **+2% 🔬 🎵 in every city per city you hold** (5 cities → +10% empire-wide) |
| Caravanserai | +1🌾 +1⚙ on routes from its city | **+1🌾 +1⚙ on every route** (already scales: more towns, more routes) |
| Heroic Epic | +50% renown in its city | **+10% renown in every city per city you hold**, general family only |
| Imperial Throne | (yields only) | **+1 authority capacity per 3 cities you hold** |
| High Temple | +6 pressure r6 · +25% 🕯 in its city | **+5% 🕯 in every city per city you hold**; the pressure stays |

The Æra III–IV uniques (Chart the Stars, The Turning Heavens, The Alchemical
Codex, The Magnum Opus) are unit and endgame rows and are left alone.

**Your call:** mark each row; ☐ all five as written.

### 2e. Science Orders early (inclined, t)

Chiefdom has one science row in ten; Government I has two in twenty-eight.
Proposed three, all engines rather than flats (the ruled census wanted
engines up):

| Pool | Name | Slot | Rarity | Text |
|---|---|---|---|---|
| chiefdom | The Tally Sticks | E | ● | +1🔬 in every city with a Monument. |
| governmentI | The Scribes' Hall | E | ◆ | +1🔬 for each 3 citizens in every city. |
| governmentI | The Lamp Kept Lit | W | ○ | +25% 🔬 in the capital while this stands in a slot. |

**Your call:** ☐ the three · ☐ two of them (mark) · ☐ none — 2a is enough.

### 2f. Rerolls for Doctrines and great people (ruled, q)

One ladder: `PlayerStatecraft.rerollsTaken` counts every reroll of any of
the three; the price is `RELIGION.reroll` (35 × age multiplier × 1.35^taken)
for an Order hand and **twice that** for a Doctrine hand or a great-person
draft. The door is the same (Chronology's Long Count). Belief hands keep
their own free-first ladder (ruling i). `rerollOffer` gains the two kinds;
the Doctrine card and the great-person offer get the reroll foot. The bot
does not reroll (unchanged).

### 2g. The reroll and the pass as buttons (ruled, r)

The offer card's foot today: "Ask again — 35🕯" and "Pass" as quiet links
beside View map. Proposed: two decorated buttons at the card's foot, the
width of a card each, ink-on-parchment with the specimen's button treatment
(`docs/design-specimen.html`), the price set in tabular mono on the face,
the pity line ("your next hand leans rarer") on the pass. Disabled state
keeps the face and greys the ink with the reducer's sentence on hover.

## 3. What is not proposed

- No change to `sciencePerPop`, the Library, or the flats: the user's
  verdict on the science cut stands.
- No change to Æra III–IV prices.
- No new building rows: the complaint is *when* buildings arrive, not how
  many there are.

## 4. Build order once marked

1. 2b (the sweep + sync test) and 2c's Monument line — one batch, trivial.
2. 2a's table.
3. 2c's rows, 2d's `perCity`, 2e's rows — one data-and-shape batch.
4. 2f and 2g — one statecraft + UI batch.
