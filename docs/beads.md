# The Bead Race — reference

The win condition (Entry VI + the Bead Race build, Entry L; endgame Entry
LIX). The cards themselves live in `data/beads.json` and print in the
Compendium — this file is the model. Candidate catalogues and cut lists:
`docs/design-history.md`.

**The deeds are retired** (batch Q1, schema 108 — `docs/wager.md` §5 is the
spec of record). Feats, endeavours, quests and reckonings were the old victory
conditions; the **wager** replaced them, and every row of the four carries
`retired: true`. A bead is minted two ways now — a wager kept, or a grant a
thing hands over — and the deal that put deed cards in front of a player (the
decks, the hands, the slots, the once-a-turn deal, the count sweep, the streak
book, the `beads` phase) is deleted. The rows keep their bodies for the
Compendium's record, which is why the model below still describes them.

## The model

- One unified condition: glass beads, ~30 minted a game, every bead an
  announced event. Beads are the **door**, never the count at the curtain:
  the **golden bead** is minted only by the Magnum Opus, whose completion
  closes the age → `winnerId` = **the empire that raised it** (ruled 2026-09-05, schema 69). The most-beads reading and
  its builder tie-break are retired.
- **The threshold opens the Opus** (ruled 2026-09-04, schema 64):
  `rules.threshold` beads is what an empire must hold before `buildError`
  will let it begin the row that `endsTheGame`. Its old reading — first seat
  to the threshold wins outright — never once fired and is retired with
  `namePossibleWinner`; `winnerId` has two writers (`updateElimination`,
  `closeTheGreatWork`).
- **Card kinds** — four retired, one live. `feat` (world firsts, always in
  play) · `endeavour` (a race with one winner — first completer takes bead +
  boon) · `quest` (a deed, Triumph-shaped occasion) · `reckoning` (the age's
  snapshot at the world age's close, ties paying nobody): **all retired**, the
  reckonings in G2 and the other three in Q1. `grant` (per-empire, handed over
  by a building or a node) is the live class, and the four **repeatable** rows a
  kept wager mints are of it. Four grant rows are retired too — the ones the Æra
  V bead Orders minted, withdrawn with the cards that named them.
- **The world clock** (batch G1, schema 101 — `docs/wager.md` §1, the spec of
  record): one clock for everybody, and it is the **mean** age of every living
  real seat's highest technology, floored (`worldAge`, `src/sim/worldClock.ts`).
  When the mean first crosses into the next age the age the world is in is
  given `rules.wager.countdown` turns; on the close turn the `worldClock` phase
  announces `ageClosed` to every seat and resets the per-age counters — and the
  world is in the next age (`currentWorldAge`). It took the closing age's
  reckonings and turned the new age's hand face up until Q1; both went with the
  rows. Everything absolute: `GameState.ageClose`
  is one `{age, turn}` stamp and nothing ticks. The **first-seat rule is
  retired** (`BeadTable.worldAge`, gone with it); `worldTechReached` (`tech.ts`)
  is a different question and stays first-seat, because the Opus door announces
  itself to all contestants at once.
- **The deck is gone** (Q1). It was one per age (III and IV), shuffled from
  `state.rng` so that a seed was a deal, drawn face down into the age's hand a
  card a turn and turned face up when the age opened. `newGame` rolls nothing for
  beads now, which is half of why a v106 log does not replay; what an age deals
  is the wager's three bars (`docs/wager.md` §2).
- **Two rules every card obeys**: a bead is a claim on the world, never a
  bank statement (nothing private, nothing accumulated unseen); every card
  names one family (D domination · C culture · S science · E economic).
- **No hold-X-for-N-turns cards** (ruled: tedious).
- **The dice of the Magister are gone** (schema 71, 2026-09-06 —
  `docs/history/fewer-things.md` §1): nothing ever spent one, and faith rerolls an Order
  draft in their place. Seven Æra III/IV quests that paid only a die keep their
  rows and carry a `deferred` line until a new boon is written for them.
- Contested claims resolved through `GameState.beads.claimed` keyed
  `(id, age)`, first by log order — the wonder register's pattern. The register
  is the one field `BeadTable` still carries: a grant is claimed once per empire
  and a wager's four rows are claimed every time they are kept.
  (`GameState.contested` is the **Triumphs'** register and is unrelated.)

## Code shapes

- What is **kept and inert** after Q1, and why: `awardBeadOccasion` (six seams
  say a word through it, and it is the second listener on the shared `Occasion`
  union), `endeavourError` (the rule that keeps a withdrawn race out of a queue),
  `beadCount` (the reading the retired rows' faces are written against), and
  `describeBeadBoon`/`beadCapEffects` (what a retired row promised, and what a
  bead already on a rod still pays). Each refuses or describes; none can mint.
- `CompletionGrant` includes `bead` and `greatPerson(family)`;
  `TechDef.paysBead` (Alchemy) and `ageEntryDice` ride tech rows.
- **The bead Orders** (batch H3, 2026-09-07; **retired** batch Q1): a card may
  mint a grant bead of its own on a deed — `CardEffect`'s `beadPerOccasion`, four
  last-age deeds (`OrderBeadOccasion`), one bead row each. `awardBead` is still
  the only writer; what these rows gave up is the grant class's once-per-empire
  key (`BeadGrantDef.repeatable`), because the deed is one an empire repeats. The
  four cards and their four grant rows carry `retired: true`: they were the last
  cards waiting on deeds. The **shape** is live and the four seams are kept, so a
  future card writes one row and hangs nothing.
- UI: the abacus flip modal per award; the wager's deal sheet is what an age
  opening raises (G2); the top bar's age card carries the age and the countdown
  (G1); and the Beads screen is the **ledger** since Q1 — the rods, the live
  grants, and the Opus's own line — behind its three unchanged doors (the bead
  chip, any Abacus rod, `V`).
