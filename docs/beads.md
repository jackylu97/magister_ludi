# The Bead Race — reference

The win condition (Entry VI + the Bead Race build, Entry L; endgame Entry
LIX). The cards themselves live in `data/beads.json` and print in the
Compendium/deed sheets — this file is the model. Candidate catalogues and
cut lists: `docs/design-history.md`.

## The model

- One unified condition: glass beads, ~30 minted a game, every bead an
  announced event. Most beads at the curtain wins; the **golden bead** is
  minted only by the Magnum Opus, whose completion closes the age →
  `takeReckonings` → `winnerId` (tie to the builder).
- **The threshold opens the Opus** (ruled 2026-09-04, schema 64):
  `rules.threshold` beads is what an empire must hold before `buildError`
  will let it begin the row that `endsTheGame`. Its old reading — first seat
  to the threshold wins outright — never once fired and is retired with
  `namePossibleWinner`; `winnerId` has two writers now (`updateElimination`,
  `closeTheGreatWork`).
- **Card kinds**: `feat` (world firsts, always in play) · `endeavour` (a
  race with one winner — first completer takes bead + boon; oncePerEmpire
  building rows carry the shipped ones) · `quest` (a deed, Triumph-shaped
  occasion) · `reckoning` (the age's snapshot, taken the moment the FIRST
  seat enters the next age — measured across `realPlayers` at once, ties pay
  nobody) · `grants` (per-empire completion grants).
- **The deck**: one per age (III and IV), shuffled from `state.rng` (a seed
  is a deal); drawn face down into the age's hand each turn; the whole hand
  turns face up when the age opens (an age begins when the FIRST seat
  reaches it — one world clock). Objectives persist; a new age never closes
  the last age's table.
- **Two rules every card obeys**: a bead is a claim on the world, never a
  bank statement (nothing private, nothing accumulated unseen); every card
  names one family (D domination · C culture · S science · E economic).
- **No hold-X-for-N-turns cards** (ruled: tedious). Magister's Dice are
  uncapped.
- Contested claims resolve through `state.contested` keyed `(id, age)`,
  first by log order — the wonder register's pattern.

## Code shapes

- Endeavour = a completable row (the project/oncePerEmpire machinery);
  quest = an occasion hooked at the seam it names; reckoning = a standing
  count read once in the `renown` phase of the age-advance turn.
- `CompletionGrant` includes `bead` and `greatPerson(family)`;
  `TechDef.paysBead` (Alchemy) and `ageEntryDice` ride tech rows.
- UI: the abacus flip modal per award; the age-opening deed sheet shows the
  revealed table to everyone at world-first.
