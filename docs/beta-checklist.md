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
