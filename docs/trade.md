# Trade — caravans, roads, connections — reference

Shipped (Entry XXXV + later rulings). Sources of truth: `data/rules.json`
(`rules.trade`, `rules.movement`), `src/sim/roads.ts` (leaf — `layRoad`,
`connectedCities`), `src/sim/routeYields.ts` (leaf — the route fold),
`src/sim/empireGold.ts` (connections + maintenance fold), `src/sim/trade.ts`.
History and the original proposal: `docs/design-history.md`.

## The trader

- Own stacking-free `UnitCategory`; unlocked at Currency; civilian.
- **`Unit.trade` presence IS the route** — no route register. One route per
  city pair *per direction* (ruled 2026-09-03: A→B does not preclude B→A;
  at most two caravans join a pair, one each way); expiry is an absolute
  turn.
- `startRoute { unitId, fromCityId, toCityId, mode? }`: where the trader
  stands is not asked — it teleports to the origin through `arriveOnTile`
  (the one arrival seam) and walks the route. `routeStartable` greys the
  Trade screen's rows; `startRouteError` adds the piece-only clauses. Both
  take the optional mode and answer for that mode alone.
- The trader walks the road it lays; **a melee blow on a trading unit
  PLUNDERS** (bounty to the attacker's nearest city) — never captures.

## Land or sea

- A route is **entirely a land route or entirely a sea route** — never mixed.
  `RouteMode = 'land' | 'sea'`; `ROUTE_MODES` is the array (order = the
  resolution order). `TradeRoute.sea?: true` is presence-is-state; absent is
  land, so a land route serialises as it always did.
- The mode is a **narrowing of the survey** (`routeProfile`, one place):
  land = the piece's profile with `embarks: false`; sea = its profile with
  `MoveProfile.ports` set to the route's two harbours, so every other dry hex
  is impassable. Both narrow, so `advanceAlongPath` can always walk what the
  survey found. A sea route needs the embark ability.
- `surveyRoute` is the one resolution of "which way, and can it". **Default
  when the command names no mode: land where a land path exists, else sea** —
  a fact about the path, not about legality. The interface always names the
  mode (`routeModesAvailable` → one button or two, "By land" / "By sea");
  the bot names it too (`bestRouteMode`, land preferred).
- `marchTraders` re-paths **every leg in the route's own mode** — the return
  leg has no command to read.
- A named mode with no path of that mode is a refusal; state byte-identical.

## Roads

- `Tile.road = builderId` — written only by `layRoad` (`roads.ts`), which
  **refuses water outright** — no occasion paves the sea. A **sea route lays
  no road at all**, harbours included (`layRoadUnder` reads `TradeRoute.sea`).
  A land trader's steps lay road; pillage removes it. Mapgen never writes one.
- A **road step** (both hexes paved) costs exact thirds inside `stepCost`
  and replaces the ground's price; rivers/embark/ZoC untouched. Anybody
  walks a road.
- **Maintenance**: charged only on roads this empire's traders laid
  (`roadsBuiltBy`), 1💰 per 4 hexes, one line in the empire fold.
  `roadFree` marks decreed hexes (free for the count).
- Rendering: a per-hex dressing layer patched in place (`signRoadCells`).

## What a route pays

- Read off the **origin's buildings**, paid to the **destination**, derived
  fresh every turn (no snapshot): 1 food per **2** food/culture/science
  buildings, 1 production per **2** production/military/gold buildings, 1
  gold per **10** combined population (all floored; the 2026-09-03 half-cut
  hit the building rates, the coin kept its ten —
  knobs `trade.buildingsPerFood`/`buildingsPerProduction`/
  `goldPerCombinedPop`). A wonder counts by its yield category ("the
  Colossus is a gold building to a caravan").
- One fold (`explainRouteYieldBetween`, `routeYields.ts`): flats first
  (cards, furs' luxury line), then the percent amplifiers (Merchant League,
  The Escorted Roads) — floored once, split by running difference.
- Route slots: fold over building `routeSlots` (+ card riders);
  `explainRouteSlots` is the list.

## International routes (ruled 2026-09-03)

- A route may end in a **foreign** city when the two empires are at peace
  and have met (`routeStartable`: "You are at war with X" / "You have not met
  X"). No open-borders requirement (traders pass freely, the standing war
  ruling); a war between the two ends stops the route paying at once
  (`routeCities`) and `cancelRoutesBetween` ends it on the declaration;
  plunder unchanged. Met-ness gates only the *opening*; since 2026-09-04 a
  meeting is stored and permanent (`Player.metSeats`), so it cannot lapse
  under a running route either.
- Pays the **sender**: +1🔬, +1🎵, +2💰 flat, +1💰 per 10 combined pop
  (`trade.international` in rules.json), banked into the sender's own pools
  and treasury by `collectYields`, never into a city. **No building lines** —
  a foreign library is not yours to harvest, and the luxury lines
  (`resourceRouteYields`) stay domestic for the same reason.
- Pays the **host** (destination's owner): `international.hostGold` (1💰), a
  labelled line in their city's fold — `cityRouteYields` no longer asks who
  owns the caravan.
- Card `routeYields` amplifiers ride the sender's fold exactly as they ride a
  domestic one (flats, then the percent, floored once); a blockade at either
  end takes back both folds.
- **A caravan trades at the gates.** A foreign city hex is closed to a march
  (`canTransit`, and the garrison besides), so a leg ending abroad ends on the
  partner's **doorstep** — the neighbour nearest the origin that has a path
  (`routeGoals`, `trade.ts`), which is also the hex the range is priced to and
  the hex `routeArrived` turns the caravan around on. The road is laid up to
  the gates.
- Riders deliberately NOT built (flagged): +1💰 per luxury kind the partner
  has that the sender lacks; science base 2 when the partner is an age
  ahead.

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
