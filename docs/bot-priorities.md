# The priority system — the bot's spec of record

The architecture every decision arm of `src/ai/` reads. The bot figures out
what things are *worth* first, and every arm folds those terms into the
explainers it already had. Long-term goals are **chains** priced over time;
currencies and constraints carry **shadow prices**; plan-keeping is greedy with
a switching margin, so commitment is emergent from sunk-cost exclusion and never
stored.

Code: `src/ai/wants.ts` (the want book and the prices) · `src/ai/value.ts` (the
appraisal) · `src/ai/aiConfig.ts` (the sheet and the personas) · `src/ai/bot.ts`
(the arms). Every knob is a leaf of `data/ai.json` and therefore appears on
`arena.html` with no page edit. The batch-by-batch measurement narrative — every
arena A/B, seed sweep and before/after profile — is
`docs/history/bot-priorities-log.md`.

## Principles

1. **Greedy with a margin.** Each template keeps its best chain; a challenger
   displaces the incumbent only by beating it by `priorities.switchMargin`
   (1.10). Sunk costs are excluded, so a half-executed chain's remaining worth
   rises as it is paid — incumbency is arithmetic, not memory. Plans flip on
   genuinely large events (a draft, a war, an age) and on nothing else, by
   construction.
2. **A portfolio, not a plan.** The empire runs several chains at once (tech +
   expansion + faith…). They compete only at shared bottlenecks, and the shadow
   prices are the arbitration layer.
3. **No stored goal state.** Everything derives from `GameState` per turn — the
   research queue, the standing buildings and the half-paid chains ARE the
   memory. Determinism holds trivially; replays are unaffected.
4. **Short-term stays local.** Unit tactics (heal, screen, ranged-first), tile
   workings and route picks keep their arm-local scoring; they feel the system
   only through prices.
5. **Everything prints.** Every chain, price and term lands in the candidates'
   folds — `spectate.html` and the arena show the book, and the fold IS the
   computation (`foldTerms(terms) === score`, strict equality, pinned).

## The formula

```
worth(chain) = payoff_rate × max(0, H − delay) + lump_payoffs − Σ_c invest_c × price_c
```

- `H` = `priorities.horizonTurns` (40).
- `delay` = turns until the chain starts paying: beakers ÷ science rate + build
  turns + walk turns + wait-for-meter turns, per template.
- `invest_c` = remaining spend in currency `c` (hammers, gold, faith, beakers)
  priced at that currency's **current** shadow price — so an expensive chain is
  cheap to an empire whose hammers are idle and dear to one whose hammers are
  contested.
- Fractions and estimates throughout: an appraisal is an estimate, not a payout.

## Shadow prices

```
price(c) = clamp( max over wants of marginal_worth_per_unit(c),
                  weights[c] × bandLow, weights[c] × bandHigh )
```

- Computed per seat per turn from the want book. The age-banded `weights` table
  is the **prior and the band anchor**, never the live value.
- `priorities.priceBandLow` 0.5 · `priorities.priceBandHigh` 3.0 — damping
  against oscillation; a price is a dial the board turns within a band the
  designer set.
- Priced: the currencies (gold, faith) and the constraints (authority,
  happiness, hammers-per-town), all in the same shape.
- A live founder chain over a thin faith rate ⇒ faith's price rides its ceiling;
  an empire with nothing left to buy ⇒ the floor. Both pinned as tests.

## The templates

- **The purchasing plan** (gold): a ranked want book — purchasable rows (through
  the simulation's own `explainPurchaseCost`/`purchaseError`), other chains'
  steps (gold's bridge role: buying a university compresses the tech chain's
  delay), and the standing wage reserve (`reserveTurnsOfUpkeep`). **Saving is a
  row**: "hold toward want W, k turns out", at W's worth discounted by k.
- **The faith plan**: pantheon → founder → beliefs → rites → the Almshouse's
  civilians; delay off the faith rate.
- **The tech chain**: goal node + realisation steps (buildings worth building ×
  towns that would build them, units worth fielding, riders worth working),
  hammers in the price, delay through the whole chain.
- **The expansion chain**: site + settler + escort + authority-wait in the delay.
- **The army plan**: threat-response valued at `threat × weights.military`,
  wage-priced at gold's shadow price.
- **The win conditions**: the wager's bars and the Opus as chains with large
  terminal values and honest delays — they take the book over late because the
  numbers say so, not because a rule fires.
- **The draft is not a template.** A card advancing any live chain folds that
  chain's term; culture's currency is the cadence itself.

## The integration surface

(a) currencies and meters are priced at shadow prices wherever `weights.gold` /
`weights.faith` would have been read (`valueContext` builds the row once);
(b) a candidate that IS a step of a live chain folds
`chain.worth / chain.stepsRemaining` as a labelled term;
(c) spend arms carry saving as a candidate and hold no thresholds of their own.

## Knobs

`data/ai.json`'s `priorities` block, typed in `aiConfig.ts`:
`horizonTurns 40 · switchMargin 1.1 · priceBandLow 0.5 · priceBandHigh 3.0`.
The old threshold knobs the system replaced (gold/faith spend floors and
reserves, the settler gates, the site-score minimum) are gone; the audit's
inventory of them is `docs/history/bot-audit.md`.

## Personas and tuning

A **persona** (`data/ai.json`) is a sparse override of the same sheet, merged
once per seat by `aiConfigFor` — a zealot is a higher `weights.faith`, never a
second code path, and a typo'd key fails the build. The **arena**
(`arena.html`) generates its panel by walking the sheet, so a new knob appears
there with no page edit; edits become a sparse override folded *under* each
seat's persona (`setAiTuning`/`withAiTuning`, identity when untuned). A tuning
sheet never reaches a save — a tuned bot emits different commands, and those are
what the log holds.

**The bot is not a balance instrument** (the user's standing ruling): a human
plays several times the bot's tier-1 yields. Playtest is the judge; the arena is
for regressions and floors.
