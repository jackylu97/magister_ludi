# Home healing and city roads

Status: implemented on `codex/home-healing-city-roads`. Focused tests and
TypeScript checks pass; parent integration is pending. The branch starts at
`decks` commit `14f8ee07`.
The frozen bot valuation study is unchanged.

## Specs

- `docs/plans/astra-handoff-2026-11-18.md`, sections 0.1g and 0.1h.
- `docs/flags.md`, “Units heal faster at home and in a city” and
  “A city hex counts as a road for movement”.

## Healing

- Rested healing is ten outside owned territory, twenty on an owned tile,
  and thirty in an owned city. A besieged city gives twenty.
- `rules.healing.ownTerritoryBonus` and `ownCityBonus` each add ten. The base
  remains `perTurnIfRested`. The labelled list in `explainUnitHeal` owns all
  three contributions, and the unit panel and turn resolution fold that list.
- The siege field is shared per owner for the current revision. A command or
  phase change expires it. Enemy movement can change siege without changing
  an economic yield, so the economy clock would be too coarse here.
- Cards, Keeps, the no-healing-abroad rule and the full-health cap keep their
  existing behavior. Healing rites still work independently of resting.
- The Healer-Priests has always added ten healing on owned territory. Its old
  text said “twice as fast”, which no longer matches the new base. The card
  and both reference sheets now state the flat bonus. Its effect is unchanged.
- Bots already retreat toward owned cities and rest on owned territory.
  This patch does not change their preferences or add a new tuning weight.

## Movement and roads

- `moveProfile` collects city tiles once per search. `pavedForMovement` is the
  shared test for either an actual road or a city center.
- `stepCost` applies the mover's road price between any two paved endpoints.
  City-to-road and city-to-city steps therefore use the same rules as roads.
- `cheapestStepCostFor` already assumes the cheapest road price. That lower
  bound stays valid without a new board scan or a special city price.
- Impassable ground, foreign-city entry, shore crossings and zone-of-control
  tolls keep their existing gates and order. Trade profiles inherit the city
  tiles from `moveProfile`.
- `connectedCities` already treats city centers as road junctions. It needs
  no rule change. `roadsBuiltBy` now excludes city centers even if a trader
  previously laid a real road mark there.
- This rule writes no `Tile.road` field. Existing caravan and founding-road
  writers still use `layRoad`.
- The bot route memo already tracks every city's id, owner and position.
  Founding, losing or removing a city therefore expires its stored routes.

## Save version and validation

The isolated branch uses save version 261 because healing, movement and road
maintenance change replay outcomes. The separate wager branch also uses 261.
The parent must choose the combined version and regenerate the digest pins on
the integrated build, not copy them between branches.

Validation on 2026-11-22 ran serially at low priority with one test worker:

| Command | Result |
| --- | --- |
| `nice -n 15 npx vitest run test/sim/homeHealing.test.ts test/sim/cityRoads.test.ts test/sim/fortifyUntilHealed.test.ts test/sim/units.test.ts test/sim/pathfind.test.ts test/sim/naval.test.ts test/sim/trade.test.ts test/sim/decks/devotion.test.ts test/sim/decks/devotionRites.test.ts test/sim/statecraftDocSync.test.ts test/ui/unitPanel.test.ts --maxWorkers=1 --minWorkers=1` | Exit 0; 454 tests pass. |
| `nice -n 15 npx vitest run test/sim/combat.test.ts --maxWorkers=1 --minWorkers=1` | Exit 0; 146 tests pass. |
| `nice -n 15 npx vitest run test/mapgen/moduleCycles.test.ts -t 'survives (healing\|combat\|pathfind\|empireGold) being evaluated first' --maxWorkers=1 --minWorkers=1` | Exit 0; four selected entry points pass. |
| `nice -n 15 npx vitest run test/sim/state.test.ts -t 'uses the current save schema version' --maxWorkers=1 --minWorkers=1` | Exit 0; the selected assertion passes. |
| `nice -n 15 npx vitest run test/sim/explore.test.ts --maxWorkers=1 --minWorkers=1` | Exit 0; 28 tests pass after validating and updating the two replay pins. |
| `nice -n 15 npm run typecheck` | Exit 0; both TypeScript configurations pass. |
| `git diff --check` | Exit 0. |

The parent must run the complete batch gate after integration. The explicit
schema assertion in `test/sim/state.test.ts` now expects 261. The two
`RANGED_BOARDS` hashes in `test/sim/explore.test.ts` now reflect this isolated
branch's version 261:

- Seed 11: `bb316119:190684` becomes `4900e09e:190684`.
- Seed 2026: `d14b59a3:190844` becomes `1060a0b4:190844`.

The first run failed only those two assertions, with 26 other tests passing.
A temporary check confirmed that both games contain no cities and that changing
only the printed schema value back to 260 reproduces both old hashes. That
check passed with exit 0. The temporary check was then removed, the real schema
value restored, and the updated pins passed with exit 0. The new healing and
city road rules cause no additional change in these two games.

The combined wager integration still needs its own final schema version and
replay validation. These isolated-branch hashes must not be copied over that
validation.
No full suite, long bot digest, commit or play-server update ran in this
subagent.
