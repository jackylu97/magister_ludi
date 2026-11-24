# Approved review implementation

The user requested parallel implementation and testing at the end. The ruling
at the top of `wonder-review-2026-11-23.md` moves the settled reviews into the
playtest build. The rulings at the top of each review override its proposals.
Unanswered proposals and explicit deferrals stay out of this batch.

## Work allocation

- Devotion and beliefs: `deck-review-devotion-2026-11-23.md` and
  `devotion-beliefs-pass-2026-11-23.md`. Retire and revise the approved rows.
  Add the general authority, relic and religious-action rules they require.
- Scientific: `deck-review-scientific-2026-11-23.md` and
  `scientific-second-pass-2026-11-24.md`. Build the approved population and
  happiness cards, charter changes and research-gated combat reward.
- Dominion and Expansionist: their two deck reviews plus the settled changes
  in `deck-direction-review-2026-11-23.md`. Build the shared Missi Dominici
  once. Keep actual garrison counts separate from amplified card rewards.
- Main integration: Magisterial and Commerce, the approved wonder changes,
  shared rows, source reconciliation and the final validation run.

## Main-thread triage

- Data changes: amounts, tiers, rarity, retirements, existing event rewards,
  renown bonuses and wonder unlock placement.
- General rule extensions: luxury copies in card counts; trade partners from
  routes or deals; purchases in either currency; seating and reroll rewards;
  great-person act allowance; a work's own yield and other works in its town;
  the approved unit-creation and levy rewards on wonders.
- Existing interface actions cover these rules. New wager screens remain
  Claude's task. Wager calibration uses measured games and does not invent
  production marks to complete the batch.

Each implementation includes descriptions, bot valuation and focused test
cases. Agents do not run tests or commit. The main thread integrates their
diffs and runs typecheck, core tests, the full suite and the production build
after the source changes settle. Port 5199 stays on its current build.

## User rulings during implementation

The user confirmed these in chat on 2026-11-24:

- Magisterial seating card: "Use +2 culture and +2 production". Each Order
  seated while the card is active raises its capital income by these amounts.
  Orders stay sealed for two turns.
- Reliquaries and Ecclesia: "Use both proposed values". Each apostle relic
  adds four science and four culture to its city's Temple. Starting a rite
  under Ecclesia adds twenty pressure within six hexes.
- The trade-partner count: "Use it for all five cards". The Treaty Ports,
  Trade Mission, The Exchange, The World's Exchange and The World's Fair all
  count each other empire once if a route reaches it or a deal is active.

Implementation choices: Scholasticism keeps its lane and moves under Epic
Poetry to fit Age II. Its price still follows its technology column. Retired
charters keep their technology and building rows for saves. The merged god
of desert and tundra is named The Hermits.

## Implementation details

- The reroll grower is The Revised Edition, a Tier II uncommon Wildcard.
  It counts successful redraws of any draft. Its gains survive unseating.
- The seating grower is The Changing Council, a Tier III rare Wildcard.
  It counts explicit Order seating, including its own first seating.
  Automatic council rearrangement does not add a gain. Existing seal rules
  read the council before a card enters; the new card shortens later seals.
- Paradise Garden counts intact works in the same town, including unworked
  ones. Each paid work excludes itself. Only the improvement's own yield
  types receive the addition, so terrain and other cards add no new types.
- Hanlin Academy increases recurring scholar renown and feeds the scholar
  draw weight. Aristocracy and Solomon's Temple increase all recurring
  renown. None changes one-time renown grants or the recruitment ladder.
- A scholar holding Second Summons and Collected Works has three actions.
  The two extra-action allowances add. Its final action grants its legacy.

The Hall of Heroes reads the existing per-family recruitment history. The
review suggested `legacyFamilies`, but that count excludes people still on
the board and revoked legacies. It does not mean families ever recruited.
The Anteroom reuses `unslottedOrders`; it introduces no second collection count.
