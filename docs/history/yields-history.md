# Yields — what moved, and what it was called before

Cut out of `docs/yields.md` on 2026-09-11 so the sequence of record reads as a
technical document. These are the renames of batch E3b — open it when a stale
docblock, comment or branch names a function this table retired.

### What was renamed (E3b)

| was | is | why |
|---|---|---|
| `cityQuote` | `explainCity` | it returns the town's labelled list |
| `CityQuote` / `CityQuoteLine` | `CityReading` / `CityYieldLine` | the nouns follow the verb |
| `foldQuoteLines` | `foldCityFlats` | the sum of that list (`foldCityLines` was taken by `combat.ts`) |
| `cityYields` | `foldCity` | the town's total — the fold plus step 12 |
| `cityStageSums` | `foldCityStages` | the percent list folded into Entry XVII's two stages, per voice |
| `stageSumsFor` | `foldStageSums` | the same for one voice |
| `centreYield` | `foldCentre` | the fold of `explainCentreYield` |
| `tileYieldOf` | `foldTile` | the fold of `explainTileYield` |
| `foldTileYield` | `foldTileLines` | it takes the list, so it says so |
| `cardCityYields` · `cardBuildingYields` · `cardEmpireYields` · `cardPercentYields` | `explainCard…` | each returns a list |
| `empireRateReading` + private `empireRates` | `foldEmpireRates` | two spellings of one fold; the wrapper is gone |
| `RateReading` | `EmpireRates` | `…Reading` is the memo's word |
| `civYields` (`topBar.ts`) | **deleted** → `readEmpire(state, seat).totals` | it was `readEmpire`'s own fold with a second name |
| `ledgerReading` | `explainLedger` | it returns the six voices as a list |
| `deckAggregate` · `deckAggregateLine` · `DECK_AGGREGATE_LABEL` | `foldDeck` · `deckCaption` · `DECK_LABEL` | the deck's slice of that list, folded |

Two exports keep a retired suffix, each for a stated reason, and
`test/sim/verbs.test.ts` carries both as exceptions: **`emptyCityYields`** is a
constructor of the six-voice bag rather than a reading of anything, and
**`collectYields`** is the turn phase that *banks* — a mutation, not a reading.
Types are nouns and are out of the rule (`CityYields`, `EmpireYieldLine`,
`TileYieldContribution`, …) — what the three verbs govern is the functions.

