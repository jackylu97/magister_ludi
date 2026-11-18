# Beta checklist

Work to do, or to decide, before the closed beta. Each item says what it is,
why it is here, and where its details are. Add a new item at the end of its
section. When an item is done, mark it `[x]` and give the commit.

## Game rules

- [ ] **Citizens ignore faith, science and culture when they choose a hex.**
  Added 2026-11-16.
  - The city scores a hex with `yieldScore` (`src/sim/cities.ts`), which counts
    only food, production and gold. The four sheets are in `data/rules.json`
    (`citizenWeights`, `citizenFocusWeights`): balanced 3 / 2 / 1, food
    4 / 2 / 1, production 2 / 4 / 1, gold 2 / 1 / 4.
  - A hex that pays 2 faith and 1 food scores the same as a hex that pays
    1 food. This applies to a human's towns and to the bots' towns.
  - Cards, beliefs and luxuries now put faith, culture and science on hexes, so
    the gap matters more than when the rule was written.
  - Proposed: give the three yields a weight in every sheet (for example 1 or 2
    each in the balanced sheet). Possibly later: focus settings for faith,
    science and culture, after a playtest.
  - It changes how every town places its citizens, so the bot digest pins move.
    Do it as its own small rule batch.
  - Until then the bots choose among the four sheets as they are (batch BP13b,
    `docs/flags.md`).

- [ ] **Wager rework.** Added 2026-11-18.
  - The user wants to rethink how wagers work. No design yet.
  - Held until then: the bead count on the 3D abacus. The frame draws 13 beads
    a rod and the rule is 7 (`rules.threshold` in `data/beads.json`). The three
    options are in `docs/flags.md`, "Age turn-over: landed fix and three
    follow-ups".
  - Related and open: up to five pages can show in one hand-over at an age
    turn-over (Triumph sheet, bead pages, age plate, wager sheet, census).

- [ ] **A fifth age.** Added 2026-11-18.
  - The game has four ages. No design yet.
  - Already waiting for it: two governments, The Commonwealth and The
    Magisterium, retired since batch C2 and "left for a fifth age" (`CLAUDE.md`,
    Great people).
  - It touches the tech tree, the world clock, the card bands and the unit
    lines, so it needs its own plan before any build.

## Cards and decks

- [ ] **Deck polish: redo some cards after the playtest.** Added 2026-11-18.
  - The user's playtest notes (`docs/playtest_notes.md`) and the deck review
    page say which cards feel weak, odd or dull. Use the `card-design` skill.
  - Goes with it: **a check of the card yield figures.** The user has seen
    figures on cards that look wrong (`docs/plans/ui-critique-2026-10-16.md`,
    "Happiness and authority on the cards and in In play"). Collect examples
    from the user first.
