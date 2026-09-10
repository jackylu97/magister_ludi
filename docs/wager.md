# The Wager — the deck, and the rules it is dealt under

**The live reference.** The deck below *is* `data/wagers.json` and the malice
table *is* `data/malices.json`; both are sync-tested
(`test/sim/wagerDocSync.test.ts`), so a bar or a note edited in one place and not
the other fails core. Edit a figure in this file and move the same figure in the
data — that is the whole workflow.

The worksheet this was cut from — the cut/keep list, the bench measurements every
bar was derived on, the rulings' history and the parts not built (the Horde, the
census) — is `docs/audit/wager-worksheet.md`. Nothing was lost; it is simply not
in the file the balance is edited in. A docblock or a test citing
`docs/wager.md` **§1–§11** means the worksheet's numbered sections, which are
that file's.

## Rules

- **The world's age is the mean** of every living real seat's highest researched
  technology, floored — not the first seat's. When the mean crosses, the current
  age is given a countdown to close: `rules.wager.countdown` (`data/rules.json`).
  The countdown is public, on the top bar's age card.
- **Æra I deals nothing** and Æra V will deal nothing. The wager runs in Æra II,
  III and IV; the last age's wager is judged when the Opus is raised or
  `rules.wager.lastAgeTurns` after the age opened, whichever comes first.
- **The deal**: three cards on the turn an age opens, drawn from three different
  **lines**, the same three for every seat in the world — `rules.dealt`
  (`data/wagers.json`). The draw is `state.rng`, so a seed is a deal.
- **The stake is private; the progress is public.** Every seat stakes one of the
  three on the deal turn (an End Turn blocker). *Which* card a seat staked stays
  that seat's own until the judgement; every seat's standing against all three
  bars is on the Abacus, ranked, every turn.
- **The claim**: a bar is claimed the turn a seat first meets it, once per seat,
  and any number of seats may meet it — a wager is a bar, not a race. The staked
  card pays `rules.stakeBeads` beads, either of the other two `rules.otherBeads`
  (`data/wagers.json`).
- **The judgement**, at the age's close: a seat that staked a card and missed its
  bar takes a **malice**, drawn from `data/malices.json` by `state.rng`.
- **The malice** is an Order with a bad face: it takes the **last chair of its own
  flavour** (displacing the Order there), cannot be unslotted, survives adoption,
  and stands until the next wager is judged. At most `rules.stack` at once
  (`data/malices.json`); a further failure replaces the oldest.
- **Flow and standing** are one reading with one subtraction between them: a
  `flow` row counts from the deal (`now −` the deal's stamp), a `standing` row
  reads the board as it stands. A clause row's reading is *how many of its clauses
  hold on this turn*, so its bar is the clause count.
- **What a wager may ask** is the closed `WagerCount` vocabulary of
  `src/sim/wagerData.ts` — only readings the Ledger already prints. A row wanting
  a reading that does not exist is **deferred and annotated**, never bent, and
  leaves every pool while it is.
- **The census** (batch C1, proposed, not built): a full-screen sheet every
  13–17 turns (`rules.census.every` 15, `rules.census.jitter` 3 — the keys land
  with C1) ranking **one** reading across the world, the leading seat taking a
  Triumph worth +5 renown shown *inside* the census sheet and never as a second
  card.

## The Opus door

- Beads open the Magnum Opus at `rules.threshold` (`data/beads.json`); the seat
  that builds the Opus wins.
- **A bead comes from a wager kept or from a grant, and from nothing else**
  (batch Q1, schema 108): feats, quests and endeavours — the old victory
  conditions — carry `retired: true` the reckonings' way (bodies kept for the
  Compendium's record, out of every pool, refused inside `awardBead`); the four
  Æra V bead Orders and the four grant rows they minted retire with them; the
  `beads` phase is gone, so `worldClock` → `wagers` → `census` is the calendar.
- **The threshold is cut on the bench**: two bot seats and the wild, seeds 11 and
  4242, 240 turns; the top seat's rod read 13 and 10, and two-thirds of the
  pair's mean, floored, is **7** (was 20 for deeds). ▢ the user's own figure
  comes with the balance pass. An age pays at most 4 (2 for the stake kept, 1
  for each of the other two met), so three wagering ages are a 12-bead ceiling
  before grants.
- **The Beads screen is the ledger**: rods, the live grants with what this seat
  has had out of each, and the Opus line — behind the bead chip, any Abacus
  rod ("The ledger") and `V`. Folding it into the Abacus is the right end state
  and a small job whenever the Abacus is still. The Compendium keeps every
  withdrawn row's page, marked "withdrawn".


- Beads open the Magnum Opus at `rules.threshold` (`data/beads.json`); the seat
  that builds the Opus wins.

## The deck

`Reads` is the row's member of `WagerCount` (a clause row lists its clauses);
`Kind` is flow or standing; the three age columns are that row's bars, one figure
per age, and a clause row's cell is one figure per clause in clause order. `—` is
an age the row is not dealt in. `Note` is the row's own player-facing sentence —
what is counted and in what span, and nothing else — and is the same string the
deal sheet, the Abacus and the Compendium print. The last column is the user's.

| Wager | Fam | Line | Reads | Kind | Æra II | Æra III | Æra IV | Note | Notes |
|---|---|---|---|---|---|---|---|---|---|
| The Capital of the World | C | 🌱 Green Belt | `clauses: capitalCitizens, capitalBuildings, capitalWonders` | standing | 10 · 5 · 1 | 16 · 11 · 2 | 25 · 16 · 3 | Citizens living in your seat of government, buildings standing in it, and wonders among those buildings — all on the same turn. |  |
| The Worked Land | E | 🌱 Green Belt | `capitalTileYields` | flow | 4500 | 9000 | 11000 | Everything the land worked by your seat of government pays you, added up over the age. | ▢ plainer name: *The Capital’s Fields* |
| The Harvest *(deferred)* | E | 🌾 Ploughshare | `farmFood` | standing | 20 | 60 | 140 | Food your farms pay across the realm, on one turn. |  |
| Bread and Iron | D | 🌾 Ploughshare | `clauses: foodSurplus, armyStrength` | standing | 60 · 375 | 150 · 1200 | 265 · 2500 | Food to spare across the realm and the fighting strength of every piece you have in the field — both on the same turn. | ▢ plainer name: *Full Fields and a Standing Army* · ▢ the army bars ×2.5 with the U9 strength ladder |
| The Caravanserai | E | 🐫 Long Caravan | `tradeYields` | flow | 50 | 2500 | 3000 | Everything your trade routes pay you, added up over the age. |  |
| The King's Roads | E | 🐫 Long Caravan | `connectionGold` | flow | 40 | 900 | 1100 | The gold your towns pay you for being joined by road to your seat of government, added up over the age. |  |
| The Solvent Realm | E | 🐫 Long Caravan | `gold` | flow | 1600 | 8500 | 10000 | What your treasury takes in each turn once the realm's costs are paid, added up over the age. |  |
| The War Chest | E | 🐫 Long Caravan | `clauses: treasury, armyStrength` | standing | 300 · 375 | 1000 · 1200 | 2500 · 2500 | Gold sitting in your treasury and the fighting strength of every piece you have in the field — both on the same turn. | ▢ the army bars ×2.5 with the U9 strength ladder |
| The Academies | S | ✶ Star Chart | `science` | flow | 1500 | 5000 | 7000 | Learning made across the realm, added up over the age. |  |
| The Observatory | S | ✶ Star Chart | `sciencePerCitizen` | standing | 3 | 4 | 5 | Learning made in one turn, shared out over every citizen in the realm. | ▢ plainer name: *Learning for Each Citizen* |
| The Tithe | C | ☽ Cloister | `religionYields` | flow | — | 6400 | 8000 | Everything your religion pays the realm, added up over the age. |  |
| The Wonder of the Age | C | 🏛 Marble Court | `wondersOfThisAge` | standing | 3 | 3 | 3 | Wonders of the age the world is in now, standing in your towns — held at once. |  |
| The Marvels' Pay | C | 🏛 Marble Court | `wonderYields` | flow | 900 | 4500 | 5500 | Everything your wonders pay you, added up over the age. |  |
| The Patronage | C | 🏛 Marble Court | `peopleYields` | flow | 650 | 2900 | 3500 | Everything your great people pay you — their works, their gifts and their legacies — added up over the age. |  |
| The Renowned | C | 🏛 Marble Court | `renown` | flow | 1000 | 5000 | 6000 | Renown your realm earns over the age, spent or not, added up. |  |
| The Chronicle | C | 🏛 Marble Court | `culture` | flow | 3700 | 14500 | 18000 | Culture made across the realm, added up over the age. |  |
| The Deck | S | 📜 Charter | `deckYields` | flow | 2800 | 11000 | 13000 | Everything the cards slotted in your government pay you, added up over the age. | ▢ plainer name: *The Cards in Your Chairs* |
| The Marcher Lords | E | 📜 Charter | `clauses: cities, happiness, authority` | standing | 5 · 0 · 0 | 9 · 0 · 0 | 18 · 0 · 0 | Towns you hold, happiness at or above nothing, and authority not yet overspent — all on the same turn. | ▢ plainer name: *The Wide and Quiet Realm* |
| The Builders | E | 📜 Charter | `buildingYields` | standing | 120 | 240 | 300 | Everything the buildings across your realm pay you in one turn. |  |
| The Six Voices | E | 📜 Charter | `allVoices` | flow | 25000 | 85000 | 100000 | Food, work, gold, learning, culture and faith, summed every turn and added up over the age. | ▢ plainer name: *The Whole Yield* |
| The Contented Realm | E | 📜 Charter | `happinessSurplus` | flow | 200 | 250 | 300 | Happiness to spare, counted every turn of the age and added up. |  |
| The Arsenal *(deferred)* | D | ⚒ Forge Levy | `unitHammers` | flow | 150 | 600 | 1800 | Work your towns put into building soldiers, added up over the age. |  |
| The Field of Glory | D | 🎖 Banner | `killsMinusLosses` | flow | 3 | 6 | 10 | Rivals' soldiers you kill over the age, less your own soldiers lost. |  |
| The Taken Town | D | 🎖 Banner | `capturedThisAge` | standing | 1 | 3 | 5 | Towns you took by force this age and still hold. |  |

**Two bars were cut by the user's ruling of 2026-09-09** (`docs/flags.md` (nnn))
to well below the bench's figure: **The Academies** (4000 · 16000 · 20000 →
1500 · 5000 · 7000) and **The Contented Realm** (650 · 700 · 900 → 200 · 250 ·
300). ▢ Both stand until the user's own balance pass moves them.

**Two rows are deferred**: The Harvest wants the food a *farm* pays told apart
from the food the ground under it pays, and The Arsenal wants the hammers a town
put behind a *soldier* told apart from its other work. Neither line exists in
`docs/yields.md`'s sequence today; both keep their bodies and their figures, so
shipping either is deleting a `deferred`.

**The Marcher Lords**' happiness and authority clauses ask for nought — *at or
above nothing* — which is what "none unhappy, authority in surplus" is as a
number.

## The malice deck

Each malice is one card effect the vocabulary already reads, worded as a card
would be. The Figure column is the row's own number, which is the whole of its
balance.

| Malice | Chair | Voice | Effect | Figure | What it does |
|---|---|---|---|---|---|
| The Lean Years | economic | E | `pays` | -1 | −1 food in every city |
| The Idle Hands | economic | E | `percentYields` | -10 | −10% production in every city |
| The Debased Coin | economic | E | `pays` | -2 | −2 gold in every city |
| The Closed Schools | wildcard | S | `percentYields` | -10 | −10% science in every city |
| The Silent Choirs | wildcard | C | `percentYields` | -10 | −10% culture in every city |
| The Doubting Flock | wildcard | C | `pressureRule` | -3 | your holy site presses half as hard |
| The Restless Cities | wildcard | E | `happiness` | -1 | −1 happiness in every city |
| The Thin Ranks | military | D | `combatLine` | -2 | −2 combat strength for all your units |
| The Deserters | military | D | `upkeepSurcharge` | 1 | every unit you pay for costs +1 gold a turn |
| The Broken Levies | military | D | `productionBonus` | -50 | −50% production toward units |
| The Short Draft | wildcard | — | `offerRider` | -1 | your Order drafts deal one card fewer |
| The Heavy Writ | wildcard | — | `authority` | -2 | −2 authority capacity |

Twelve, three a chair-flavour plus six wildcards. A malice wanting a shape the
vocabulary lacks would be deferred and annotated, never bent.
