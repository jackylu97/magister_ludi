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

- [ ] **Age 1 pacing.** Added 2026-11-18.
  - The user wants the pace of the first age looked at. No detail yet: ask the
    user what feels wrong (too slow, too few decisions, too long before the
    first draft or the first war).
  - Evidence to use: the first age ran to about turn 70 in the user's game and
    to turn 87 in a test game; culture is about 3 a turn in age 1
    (`card-design` skill, power bar), and culture pays for the drafts.
  - Related and already ruled: the world clock turns over sooner
    (`docs/flags.md`, "Age turn-over: a missing plate, the abacus motion, and a
    faster clock"). Measure the first age again after that rule is built.

## Cards and decks

- [ ] **Deck polish: redo some cards after the playtest.** Added 2026-11-18.
  - The user's playtest notes (`docs/playtest_notes.md`) and the deck review
    page say which cards feel weak, odd or dull. Use the `card-design` skill.
  - Goes with it: **a check of the card yield figures.** The user has seen
    figures on cards that look wrong (`docs/plans/ui-critique-2026-10-16.md`,
    "Happiness and authority on the cards and in In play"). Collect examples
    from the user first.

- [ ] **A design pass on the existing leaders.** Added 2026-11-18.
  - Each leader has two abilities and points at a theme of its two decks
    (`card-design` skill, "Leaders"). The pass checks each one: is it fun, is
    it clear, does its theme have enough cards, and is it level with the rest.
  - Older open items go with it: per-leader bot personas, and the name of a
    seat with no leader.
  - Do it after the deck polish, because a leader's theme depends on the cards.
  - **Leaders to rework** (the user, 2026-11-19): nine of the thirteen.
    - [ ] Emperor Taizong
    - [ ] Akhenaten
    - [ ] Al-Ma'mun
    - [ ] Mithridates VI
    - [ ] Joan of Arc
    - [ ] Hypatia
    - [ ] Zheng He
    - [ ] Hildegard of Bingen
    - [ ] Modu Chanyu
  - Not on the user's list, so they stay as they are unless the pass finds a
    reason: Pachacuti, Mansa Musa, Nezahualcoyotl, Ibn Battuta.

## Interface

- [ ] **Choosing which hexes a town's citizens work.** Added 2026-11-18.
  - The user wants a better way to choose worked hexes. No design yet.
  - Today: the city screen locks hexes (`setLockedTiles`) and sets one of four
    focus sheets (`setCitizenFocus`).
  - Goes with the first item under Game rules (citizens ignore faith, science
    and culture): design the control and the scoring together.

- [ ] **A design pass on the city screen.** Added 2026-11-18.
  - The user wants the city screen redesigned. No design yet.
  - Do it with the worked-hexes item above; the control lives on this screen.
  - It should follow the style of the approved Council and In play board
    (`docs/plans/mockups/scholars-study/council-and-in-play/`).

- [ ] **Changes to the other screens after the In play screen ships.** Added
  2026-11-18.
  - The In play screen shows wonders, beliefs, legacies and temporary effects.
    The faith sheet, the Reliquary, the Ledger and the wonders' places then
    overlap with it in part.
  - After it ships, go through each of those screens: what stays, what links
    to In play, and what goes.

- [ ] **The tutorial.** Added 2026-11-18.
  - Ruled earlier: the tutorial is redone after the interface is final.
  - It must cover the Council screen, the In play screen and the full-screen
    moments, which are all new.
  - Known fault to fix with it: the opening sequence's step cards do not wait
    for a big page, so one can sit over a Triumph sheet.

## Game setup

- [ ] **Difficulty levels.** Added 2026-11-18.
  - The game has no difficulty setting. No design yet.
  - The levers that exist: the bot knobs and five personas in `data/ai.json`,
    and the arena page that measures them. A level can change how well a bot
    plays, what bonuses it gets, or both.
  - Wait for the bot speed work and the tuner, so the levels are set against
    bots that are stable.
