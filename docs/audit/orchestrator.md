# The audit, read by the orchestrator (2026-09-06)

Three readers wrote `bonuses.md`, `simplify.md` and `dead-code.md`. This is
my own pass over the code behind their worst claims — what I confirmed by
reading the seam, what I corrected, and the fix queue.

## Confirmed by reading

| # | seam | what the code does | what the row promises | fix |
|---|---|---|---|---|
| 1 | `cities.ts:3239` `cityQuote`'s route loop | adds `food`, `production`, `gold` from `cityRouteYields` and stops | `RouteYieldLine` carries `science` and `culture` (`routeYields.ts:163`), written by the route cards (Ledger Keepers' "+1🔬 +1🎵 on every route sent from a Market city", the food amplifier's share) | two lines in the loop; a pin that every voice of a `RouteYieldLine` reaches the quote |
| 2 | `upkeep.ts:298` `if (percent >= 0) return out;` | a *positive* `unitUpkeep` percent is dropped; the rule has one reader | the Reckless Levy's "your army costs twice as much to keep" | the surcharge joins `explainEmpireGold`'s unit-maintenance line as a labelled addition (the rebate is a give-back; a surcharge is a charge — same fold, opposite sign); a pin that the Levy's payroll doubles |
| 3 | `topBar.ts:134` `civYields` · `ledgerScreen.ts:382` `ledgerReading` | sum the towns, the empire luxuries and the card empire lines — never `senderRouteYields` | `collectYields` banks the sender's foreign-route gold, science and culture every turn (`cities.ts:3932`) | one term in each, and **a pin of both against `collectYields`' banked delta**, not against each other |
| 4 | `ai/value.ts:1344` `scoreEffect`'s `default` | returns `score.unknownEffect` — a *stand-in*, not zero (the simplify reader wrote "score zero"; wrong in detail, right in substance: 23 of 46 shapes read as one constant) | a card is worth what its lines pay | the aliased-discriminant idiom so a new shape fails typecheck; then price the stand-in shapes by row count (the `windfallRider` family first — 49 live rows) |
| 5 | `ai/value.ts:1456` the margin's `V` | `empireRateReading` (`cities.ts:4026`) omits `cardEmpireYields` and the sender's routes | the founder trickle, a turn of culture, an empire line | one term in `empireRateReading` (and it is the reading `actGainOf` uses too) |

Everything else in `bonuses.md` I spot-checked against the file and found
plausible; its provenance table (which surfaces compute beside the fold) is the
useful artefact. Its determinism sweep came back clean and I believe it: no
`Math.random`, no clock, no Map/Set order governing an outcome in `src/sim/`
or `src/ai/`.

## Corrections to the readers

- `simplify.md` "23 shapes score zero": they score `unknownEffect`. The
  register in `aiAppraisal.test.ts` already lists which; the finding stands as
  "one constant for half the vocabulary".
- `dead-code.md`'s cut of the schema changelog: the changelog is *history*,
  and history lives in `docs/design-history.md` by this repo's own rule — but
  the **current** entry must stay in `state.ts` beside `SAVE_SCHEMA`, because
  the next bump is written by whoever reads it there.
- `simplify.md`'s "fold luxuries into cards" (900 lines, one evaluator): right
  in principle, the largest risk in the set; it is a batch after the
  correctness batches, not beside them.

## What surprised me

- **Three live signature clauses are inert**: `purchaseGreatPersonOffer` is
  fully built in the sim and opened by The Commonwealth, The Magisterium and
  The Academy, and nothing in `src/ui/` or `main.ts` ever constructs the
  command. Two tier-45 governments promise a draft the interface never offers.
- **Six draftable cards carry `effects: []`** — the four Æra V bead Orders and
  two more — and the pool filters on `retired` only, so they are dealt and pay
  nothing.
- **`src/proto3d/`** — 2,126 lines, a ninth build input CLAUDE.md does not
  name, imported by nothing.

## The fix queue

| batch | what | fence | risk |
|---|---|---|---|
| **H1 — the fold pays what the rows say** | findings 1, 2, 3; the Ledger's mirror of `cityQuote` re-derived from the quote (it misses `cardBuildingYields` and floors two per-citizen terms); `tilePurchasePrice`'s discount printed in its list; every surface pinned to the *banked* figure | `cities.ts`, `upkeep.ts`, `empireGold.ts`, `topBar.ts`, `ledgerScreen.ts`, tests | low — each is one seam with a test that would have caught it |
| **H2 — the bot reads the whole deck** | finding 4 (exhaustive scorer, then price the stand-in families by row count), finding 5 (empire lines in the margin), `where:'city'` × cities, `caravanScale`/`veinValue` stand-ins retired where a reading exists | `src/ai/value.ts`, `wants.ts`, tests | low–medium — every priced shape moves a decision; acceptance games re-hashed |
| **H3 — the great-person draft the cards promise** | **BUILT** (schema 84): the purchases are a rail at the foot of the Reliquary, and the four Æra V bead Orders carry one new shape (`beadPerOccasion`) on four hooked deeds — the other two `effects: []` rows are tier 0 and were never in the bag | `src/ui/`, `main.ts`, `statecraft*.ts`, `beads*.ts`, the four seams, tests | medium — new shape |
| **H4 — dead weight** | `proto3d/` out; the schema changelog to history (the current entry stays); retired row bodies trimmed to `{id, name, retired, note}`; the 33 unread exports; `augurHasActed`, `chargedAugurs`, `BeliefOffer.givenBack`, the dice knobs, the four CSS rules; the nine false doc statements and CLAUDE.md's stale trap lines; the fifteen folded docs to `docs/history/` | broad, mechanical | low — deletions pinned by typecheck and the register tests |
| **H5 — unify** | one modal shell for the nine screens; the seven duplicated helpers into leaves; `signed`/`round`/`element` once | `src/ui/` | low |
| **H6 — one evaluator** | luxuries as cards (`ResourceEffect` ⊂ `CardEffect`); the rider/rule/percent families collapsed on a field; the two count unions and four occasion unions reconciled | `statecraft*.ts`, `resourceEffects.ts`, data | **high** — byte-identity over the acceptance games is the gate |

H1 and H2 start now (disjoint fences, narrow tests, no arenas). H3–H6 wait
for the user's markup of this file and the three readers'.

**Correction to `dead-code.md` §1.5** (found building H3): of the six draftable
rows with `effects: []`, only four are draftable. Religious Mandate and The
Closed Realm are Doctrines at **tier 0**, and `poolDoctrines` returns nothing
for a tier of 0 — they are in no pool and in no doc table, and the doc already
files them under "Parked". Marking them `retired` would say the wrong thing:
that field is for a row that *was* dealt and has been taken back out. They stay
as they are, deferred and unreachable, until their shapes exist.
