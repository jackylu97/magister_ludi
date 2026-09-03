# Wonders — reference

Shipped framework (Entries XXX/XXXIII). The rows themselves live in
`data/buildings.json` (`wonder: true`) and print in the Compendium — this file
is the rules, not the list. Proposal history: `docs/design-history.md`.

## Framework (see also CLAUDE.md's wonder trap)

- One per world: `GameState.wonders` is the claim register, written by
  `claimWonder` from `realiseItem`. The claim is history; **pay follows the
  stones** (the holding city's `buildings`); capture moves the pay.
- Beaten to it: "banked toward it" = the front queue row or nothing; refund
  `wonderRefundGoldPerHammer` iff front.
- `wonder` is its own `ProductionCategory`; **never purchasable** (refused
  before currency is even read).
- Effects are ordinary cards read by `liveCityEffects`; completion grants
  realise through ordinary paths (`RealisedItem.grants` →
  `CommandResult.grants`; `done: false` is a real outcome).
- `requiresSite` (coastal, mountain-adjacent…) refused in `buildError`
  naming the site.
- A wonder pays +10 renown on completion + a trickle; the Triumph *A Marvel
  Raised* rides it.

## The membership rule

A wonder earns its row by **playing with a system that already exists** —
its effect is written in the existing card vocabulary; a wonder needing a
new shape is a design decision argued individually (the pantheon-slot grant,
the purchase-price line, `zocRule`, and the Sistine's global percent were the
four that made it).

## Refused, on purpose

- Wonders that are a bank statement (accumulate X).
- Effects that are a unit with no system behind it.
- A wonder granting a great person directly (renown already pays for those).
- More than one wonder per tech where it can be helped.

## Cost band

5–7× the age's best building; hand-tuned rows (no age multiplier by ruling);
the pacing tests rule.
