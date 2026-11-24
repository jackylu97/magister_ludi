# Bot trade, planning and handoff follow-ups

Status: implementation and handoff reconciliation on `codex/bot-trade-2026-11-23`.
This batch has not been deployed to the play server.

Specification: `docs/plans/astra-handoff-2026-11-18.md`, sections 0.1i through 0.1m,
and `docs/flags.md`, the trade and tile rulings of 2026-11-23.

## Changes

- Price deferred gold separately from resource prices. Start at fifteen gold
  now for one gold per turn over a full deal.
- Price resources from the receiving empire's needs. Keep a positive price
  for spare copies. Preserve the last-copy refusal and accept ordinary
  exchanges of spare luxuries.
- Value cities from their population, buildings and age.
- Check proposed trades from both seats. Apply the same checks to human
  recipients. Offer strategic resources in useful quantities.
- Use current simulation prices when valuing tile discounts and purchase
  rewards. Use available frontier tiles when the purchase list is empty.
- Remove the extra citizen upkeep from tile purchases. Buying a tile moves
  an existing citizen; it does not increase population. Growth and founding
  still include the cost of an additional citizen.
- Move difficulty descriptions into the rule data. The interface fills their
  numeric placeholders from the same values that drive the rules.
- Price a camp's future raids only within its attack radius. Multiply that
  expected threat by its chance to train a unit at each muster. Camp bounties
  and the value of reclaiming the site remain separate.
- Forecast research from the unfinished cost of each technology. Keep saved
  progress with its technology and carry overflow through the selected path.
  Progress on a later node cannot bring an earlier prerequisite forward.
- Queue enough worthwhile production for the next settlement. Reuse the build
  ranking and the simulation's queue gates. Extra rows can finish from overflow
  or saved progress. Additional units still need a fresh demand decision.
- Keep the optional razing threshold, but update its explanation for fixed
  unrest. The default still keeps conquered cities rather than razing for
  three turns of unrest.

## Earlier trade-only validation

- The six-seat duel completed 120 turns without warnings or stalls. Its saved
  log replayed exactly: `673a367f:421258`.
- The six-seat standard game did the same: `9d59b709:1166432`.
- Focused trade tests and the cache/worker checks passed. These games preceded
  the camp and queue changes and the wager integration. They are not validation
  of the completed handoff batch. Its final checks are pending.
- The final source change only replaced a decision-local weak map with a local
  map. This keeps temporary quote state outside the persistent bot-memory
  register. It does not change prices or decisions.

The trade and planning changes do not change game rules or rendering. The wager
integration is a separate rules change in this batch, documented in the wager spec.

## Implementation details

- `tradeValue.ts` owns deferred income, resource and city prices. New numeric
  preferences live in `data/ai.json`, with bounds for the generated Arena panel.
  Existing combat, research, growth and army settings are unchanged.
- `score.queueLookaheadTurns` controls the short production forecast. Zero
  restores the previous queue policy; the default forecasts one settlement.
- Resource quotes use separate hypothetical loan states. They read the
  simulation's resource yields, happiness and build gates. They do not change
  the live state or its random generator. Quotes are reused within a decision.
- An incoming resource is valued after the outgoing resources leave. Earlier
  resources in the same offer also count. This prevents a fair bundle from
  looking like surplus and prevents two interchangeable resources from each
  receiving the full recruit premium.
- Strategic recruit value falls as spare supply grows. Alternative resources
  count together, so spare horses also lower the need for camels.
- The receiver preview omits positive rewards from counted cards. This makes
  its check conservative without constructing another full planning context.
  The receiver includes those rewards when answering. A counter now uses the
  requested seat's prices, even when another seat asks for the counter.
- Proposals reserve their full quantities. They protect a free copy, check both
  seats' value, and reject a single strategic copy offered for a luxury.
  Ordinary exchanges of spare luxuries still have an explicit acceptance rule.
- `tilePurchaseForecast.ts` reuses the purchase list. If that list is empty,
  it samples unowned frontier tiles at the simulation's prices. Shared tiles
  use the cheaper eligible city. It keeps one sample per planning context.

## Limits

These are current-board estimates, not a forecast of every future use.
Resource prices include flat resource income, happiness and available recruits.
They do not price every percentage bonus, combat signature or future building.
The spare-copy floor covers some option value. City prices measure population
and building investment, not strategic location. Proposals choose a useful
bundle; they do not search every combination of resources and payments.

This batch fixes valuation and proposal consistency. It does not establish a
new win rate or a higher turn-100 yield result. The broader leader and balance
comparison remains a separate task.

## Quote timing

A separate diagnostic loaded the completed standard game and priced one incoming
copy of every resource kind. It quoted all 31 kinds per seat, including kinds
that a seat could not yet see. This is broader than a normal proposal.

- Seats with 9 to 15 cities took about 20 to 33 ms for the full set.
- The 32-city seat took about 566 ms for the set. Its slowest single quote took
  about 35 ms. This remains a useful target for later performance work.
- Repeating the same quotes within the decision took less than 0.3 ms per set.

The diagnostic was a single run at low priority, not a controlled comparison
of total planning time. The code prices only the resources in candidate trades
and is not called by unit movement or rendering.
