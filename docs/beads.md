# The Bead Race — reference

The win condition. The rows live in `data/beads.json` and print in the
Compendium — this file is the model. The **spec of record for how a bead is
earned is `docs/wager.md`**; this is the machinery under it.

## The model

- One unified condition: glass beads, every bead an announced event. Beads are
  the **door**, never the count at the curtain.
- **A bead comes from a wager kept or from a grant, and from nothing else.** A
  kept wager mints one of four repeatable rows; a `grant` is handed over
  per-empire by a building or a node.
- **The threshold opens the Opus.** `rules.threshold` (7) beads is what an empire
  must hold before `buildError` will let it begin the row that `endsTheGame`.
- The **golden bead** is minted only by the Magnum Opus. Its completion closes
  the age → `closeTheGreatWork` → `winnerId` = **the empire that raised it**.
  `winnerId` has two writers: `updateElimination` and `closeTheGreatWork`.
- **The world clock** is one clock for everybody: the **mean** age of every
  living real seat's highest technology, floored (`worldAge`,
  `src/sim/worldClock.ts`). When the mean first crosses into the next age the
  current age is given `rules.wager.countdown` turns; on the close turn the
  `worldClock` phase announces `ageClosed` to every seat and resets the per-age
  counters. Everything absolute — `GameState.ageClose` is one `{age, turn}`
  stamp and nothing ticks. `worldTechReached` (`tech.ts`) is a different
  question and stays first-seat, because the Opus door announces itself to all
  contestants at once.
- **Two rules every card obeys**: a bead is a claim on the world, never a bank
  statement (nothing private, nothing accumulated unseen); every card names one
  family (D domination · C culture · S science · E economic).
- **No hold-X-for-N-turns cards** (ruled: tedious).
- Contested claims resolve through `GameState.beads.claimed`, keyed `(id, age)`,
  first by log order — the wonder register's pattern. A grant is claimed once per
  empire; a wager's four rows are claimed every time they are kept.
  (`GameState.contested` is the **Triumphs'** register and is unrelated.)

## Code shapes

- `awardBead` is the only writer. `CompletionGrant` includes `bead` and
  `greatPerson(family)`; `TechDef.paysBead` rides Alchemy's row.
- `CardEffect.beadPerOccasion` lets a card mint a grant bead of its own on a
  deed. The shape is live and its four seams are kept, so a future card writes
  one row and hangs nothing.
- Kept and inert, each refusing or describing and none able to mint:
  `awardBeadOccasion` (six seams say a word through it; the second listener on
  the shared `Occasion` union), `endeavourError` (keeps a withdrawn race out of a
  queue), `beadCount`, and `describeBeadBoon`/`beadCapEffects` (what a retired
  row promised, and what a bead already on a rod still pays).
- UI: the abacus flip modal per award; the wager's deal sheet is what an age
  opening raises; the top bar's age card carries the age and the countdown; the
  Beads screen is the **ledger** — the rods, the live grants and the Opus's own
  line — behind its three doors (the bead chip, any Abacus rod, `V`).

## What was retired

Feats, endeavours, quests and reckonings were the old victory conditions; the
wager replaced them. Every row of the four carries `retired: true` — bodies kept
for the Compendium's record, out of every pool, refused inside `awardBead` — and
the deal that put them in front of a player (the decks, the hands, the slots, the
once-a-turn deal, the count sweep, the streak book, the `beads` phase) is
deleted. `newGame` shuffles nothing for beads. Four grant rows and the four Æra V
bead Orders that minted them retired with the deeds, as did the dice of the
Magister. The narrative is `docs/history/design-history.md`; the reasoning is
`docs/audit/wager-worksheet.md`.
