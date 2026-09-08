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
the purchase-price line, the `borders` zone-of-control rule, and the Sistine's global percent were the
four that made it).

**Batch E4a (2026-09-07)** built three of the five rows that were carrying a
deferred half, and each on the vocabulary rather than beside it: the Statue of
Zeus' +15% at a wall is the attacker-side `combatPercent` share, which gained a
`when` so a percentage can name one kind of fight; the Terracotta Army's veterans
are a `unitStamp`, which gained a `scope` so a stamp can name the town that
raised the piece; and Notre-Dame's Cathedral clause was always an ordinary scoped
`cityYields` beside a scoped happiness. **Two are still deferred**: The Forbidden
City's extra Order slot (no shape moves the slot spread, and it touches the
chairs ruling) and the Alhambra's, because being dug in is a *posture* a piece
takes and loses, not a fact it can be born with.

## Refused, on purpose

- Wonders that are a bank statement (accumulate X).
- Effects that are a unit with no system behind it.
- A wonder granting a great person directly (renown already pays for those).
- More than one wonder per tech where it can be helped.

## Cost band

5–7× the age's best building; hand-tuned rows (no age multiplier by ruling);
the pacing tests rule.
