# Trade — caravans, roads, connections — reference

Shipped (Entry XXXV + later rulings). Sources of truth: `data/rules.json`
(`rules.trade`, `rules.movement`), `src/sim/roads.ts` (leaf — `layRoad`,
`connectedCities`), `src/sim/routeYields.ts` (leaf — the route fold),
`src/sim/empireGold.ts` (connections + maintenance fold), `src/sim/trade.ts`.
History and the original proposal: `docs/design-history.md`.

## The trader

- Own stacking-free `UnitCategory`; unlocked at Currency; civilian.
- **`Unit.trade` presence IS the route** — no route register. One route per
  city pair; expiry is an absolute turn.
- `startRoute { unitId, fromCityId, toCityId }`: where the trader stands is
  not asked — it teleports to the origin through `arriveOnTile` (the one
  arrival seam) and walks the route. `routeStartable` greys the Trade
  screen's rows; `startRouteError` adds the piece-only clauses.
- The trader walks the road it lays; **a melee blow on a trading unit
  PLUNDERS** (bounty to the attacker's nearest city) — never captures.

## Roads

- `Tile.road = builderId` — written only by `layRoad` (`roads.ts`). A
  trader's steps lay road; pillage removes it. Mapgen never writes one.
- A **road step** (both hexes paved) costs exact thirds inside `stepCost`
  and replaces the ground's price; rivers/embark/ZoC untouched. Anybody
  walks a road.
- **Maintenance**: charged only on roads this empire's traders laid
  (`roadsBuiltBy`), 1💰 per 4 hexes, one line in the empire fold.
  `roadFree` marks decreed hexes (free for the count).
- Rendering: a per-hex dressing layer patched in place (`signRoadCells`).

## What a route pays

- Read off the **origin's buildings**, paid to the **destination**, derived
  fresh every turn (no snapshot): food per food/culture/science building,
  production per production/military/gold building, gold per combined
  population. A wonder counts by its yield category ("the Colossus is a gold
  building to a caravan").
- One fold (`explainRouteYieldBetween`, `routeYields.ts`): flats first
  (cards, furs' luxury line), then the percent amplifiers (Merchant League,
  The Escorted Roads) — floored once, split by running difference.
- Route slots: fold over building `routeSlots` (+ card riders);
  `explainRouteSlots` is the list.

## City connections

- Connected = road path from centre to capital through own/unowned hexes
  (flood fill in `roads.ts`, once per sweep). Pays per connected non-capital
  city — one labelled line per city in `explainEmpireGold`'s connections
  total; spices' `connectionPercent` and card amplifiers fold there, floored
  once.

## Extension rules

- A new recurring cost joins `explainEmpireGold`'s fold — never a second.
- A new route bonus joins the route fold as a labelled line (flat before
  percent).
- Route safety ("cannot be pillaged") is deferred — nothing can say where a
  route is; see `docs/flags.md`.
