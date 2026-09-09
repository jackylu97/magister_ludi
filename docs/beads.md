# The Bead Race — reference

The win condition (Entry VI + the Bead Race build, Entry L; endgame Entry
LIX). The cards themselves live in `data/beads.json` and print in the
Compendium/deed sheets — this file is the model. Candidate catalogues and
cut lists: `docs/design-history.md`.

## The model

- One unified condition: glass beads, ~30 minted a game, every bead an
  announced event. Beads are the **door**, never the count at the curtain:
  the **golden bead** is minted only by the Magnum Opus, whose completion
  closes the age → `takeReckonings` (history) → `winnerId` = **the empire
  that raised it** (ruled 2026-09-05, schema 69). The most-beads reading and
  its builder tie-break are retired.
- **The threshold opens the Opus** (ruled 2026-09-04, schema 64):
  `rules.threshold` beads is what an empire must hold before `buildError`
  will let it begin the row that `endsTheGame`. Its old reading — first seat
  to the threshold wins outright — never once fired and is retired with
  `namePossibleWinner`; `winnerId` has two writers (`updateElimination`,
  `closeTheGreatWork`).
- **Card kinds**: `feat` (world firsts, always in play) · `endeavour` (a
  race with one winner — first completer takes bead + boon; oncePerEmpire
  building rows carry the shipped ones) · `quest` (a deed, Triumph-shaped
  occasion) · `reckoning` (the age's snapshot, taken the turn the **world's
  age closes** — measured across `realPlayers` at once, ties pay nobody) ·
  `grants` (per-empire completion grants).
- **The world clock** (batch G1, schema 101 — `docs/wager.md` §1, the spec of
  record): one clock for everybody, and it is the **mean** age of every living
  real seat's highest technology, floored (`worldAge`, `src/sim/worldClock.ts`).
  When the mean first crosses into the next age the age the world is in is
  given `rules.wager.countdown` turns; on the close turn the `worldClock` phase
  announces `ageClosed` to every seat, takes the closing age's reckonings, turns
  the new age's hand face up and resets the per-age counters — and the world is
  in the next age (`currentWorldAge`). Everything absolute: `GameState.ageClose`
  is one `{age, turn}` stamp and nothing ticks. The **first-seat rule is
  retired** (`BeadTable.worldAge`, gone with it); `worldTechReached` (`tech.ts`)
  is a different question and stays first-seat, because the Opus door announces
  itself to all contestants at once.
- **The deck**: one per age (III and IV), shuffled from `state.rng` (a seed
  is a deal); drawn face down into the age's hand each turn; the whole hand
  turns face up when the age opens (on the world clock above). Objectives
  persist; a new age never closes the last age's table.
- **Two rules every card obeys**: a bead is a claim on the world, never a
  bank statement (nothing private, nothing accumulated unseen); every card
  names one family (D domination · C culture · S science · E economic).
- **No hold-X-for-N-turns cards** (ruled: tedious).
- **The dice of the Magister are gone** (schema 71, 2026-09-06 —
  `docs/history/fewer-things.md` §1): nothing ever spent one, and faith rerolls an Order
  draft in their place. Seven Æra III/IV quests that paid only a die keep their
  rows and carry a `deferred` line until a new boon is written for them.
- Contested claims resolve through `state.contested` keyed `(id, age)`,
  first by log order — the wonder register's pattern.

## Code shapes

- Endeavour = a completable row (the project/oncePerEmpire machinery);
  quest = an occasion hooked at the seam it names; reckoning = a standing
  count read once in the `worldClock` phase of the turn an age closes.
- `CompletionGrant` includes `bead` and `greatPerson(family)`;
  `TechDef.paysBead` (Alchemy) and `ageEntryDice` ride tech rows.
- **The bead Orders** (batch H3, 2026-09-07): a card may mint a grant bead of
  its own on a deed — `CardEffect`'s `beadPerOccasion`, four last-age deeds
  (`OrderBeadOccasion`), one bead row each. `awardBead` is still the only
  writer; what these rows give up is the grant class's once-per-empire key
  (`BeadGrantDef.repeatable`), because the deed is one an empire repeats. The
  four are dealt only from the last age (`OrderDef.fromAge`) and earned only
  there — "the last age" is whichever age the chart ends in (`LAST_TECH_AGE`),
  Æra IV until Æra V has nodes.
- UI: the abacus flip modal per award; the age-opening deed sheet shows the
  revealed table to everyone the turn the world's age closes; the top bar's
  age card carries the age and the countdown (batch G1).
