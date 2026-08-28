# Trade — caravans, roads and the city connection

Working doc (2026-08-27), first draft for the user's Revisions. The user's rules (verbatim,
2026-08-27) are the spine; everything else is a proposal in the game's own vocabulary.
Companions: `docs/tech-tree-ages-2-5.md` (Currency → The Royal Road → The Silk Road),
`docs/wonders.md` (Colossus, Machu Picchu, the Great Lighthouse carry *(trade routes later)*
clauses), `docs/statecraft-ages-3-5.md` (⚓ The Tide — six cards wait on this),
design-notes Entry XXV (`stepCost(from, to)` — built for roads before roads existed).
**Nothing here is scheduled until the Revisions section says so.**

## The ruling, as given

> Currency should allow the production/creation of traders. The trade route limit should equal
> the number of total markets/lighthouses in the empire. Sending a trade route between two
> cities automatically creates a road between them. Roads remove terrain penalties while
> traveling along them, and make each tile ⅓ movement cost. When sending a trade route, the
> route gains +1 food for every food/culture/science building and +1 production for every
> production, military and gold building. The route also gives +1 gold for every collective
> 10 population between the two cities. Every city connected to the capital by roads should
> yield passive city connection gold.

## What Civ V does (for reference)

- **Trade routes** (BNW): a Caravan (land, range 10) or Cargo Ship (range 20) walks once,
  then the route runs 30 turns. *Internal* routes send food or production from the origin's
  surplus to the destination; *international* routes pay gold to both ends (more to the
  sender), science if the partner is ahead, and spread religion. Route slots come from techs
  and buildings (Caravansary, Harbour, Market…). Routes are pillageable by a unit on their
  path; a pillaged caravan is lost.
- **City connection** (the older "trade route"): a non-capital city joined to the capital by a
  road, or by harbours across water, pays **1.1 × city pop + 0.15 × capital pop − 1**, floored
  (size 6 with a size-10 capital: 7💰). Roads cost 1💰/tile in maintenance, which is the
  system's tension: connecting a size-2 city is a net loss until it grows.

## The design, in our terms

### The trader

- **`trader`** unit row, unlocked by **Currency** (the tree doc's home), civilian, no
  combat, `movement 2`, `sight 1`. Built or bought like a worker (the treasury bank, ordinary
  gates). **Not** a great-work-style marker: it is a piece with one verb.
- **`startRoute { unitId, fromCityId, toCityId }`** (✎ 2026-08-28, replacing
  `sendTrader { unitId, cityId }`) — a command naming *both* cities. **Where the trader is
  standing is not asked**: on acceptance it teleports into the origin's centre, through
  `arriveOnTile` because a third way to move a unit calls the one seam, and sets out from
  there. Validation: both cities are yours and are two different cities; the empire has a
  free route slot; no route already runs between the pair in either direction (one route per
  pair); **both gates have room** for a caravan (an unladen caravan of your own is not a
  wall — it is the piece being sent); a **path exists** for the roster's caravan (land path
  through terrain the mover may enter, and — once harbours exist — a coast path between two
  harbour cities); the destination is within **range** (`rules.trade.rangeTurns`, in *turns
  of a caravan's own march* — "how far a caravan can walk", priced by `pathTurns` from the
  origin on a full purse, so roads extend range for free). The gate is two functions over
  one implementation: `routeStartable(state, playerId, fromCityId, toCityId)` is everything
  above (the Trade screen greys a row with it before any trader is chosen) and
  `startRouteError(state, playerId, unitId, fromCityId, toCityId)` is that plus the clauses
  only a piece can answer.
- The verb **starts a march**: the trader takes the path through `advanceAlongPath`, per step
  `arriveOnTile` — the one seam — and **every hex it rests on becomes road** (below). On the
  turn it arrives, the piece is **consumed** and the route is written:
  `Route { id, ownerId, from: cityId, to: cityId, expiresTurn }`, in `GameState.routes`
  (an array, in creation order). Duration `rules.trade.routeTurns` (30), an **absolute**
  expiry read as `state.turn < expiresTurn` — the timed-effect rule; the `trade` phase is a
  broom that deletes expired routes and changes no outcome by doing so.
- The route's *state* is nothing but those two city ids: what it pays is **derived every
  turn** from the two cities as they stand. A destination that builds a library raises the
  route the next turn; a captured destination changes whose buildings are counted. No
  snapshot of the buildings at send time — that would be a second ledger.

### Route slots

**`routeSlots`** is a building field: `market: 1`, `harbour: 1` (the Wayfinding building in
the tree doc; until it exists, the market alone), later `caravansary: 1`, the Customs House
great work `1`. The empire's cap is the fold over every city's buildings — one line each in
`explainRouteSlots` ("Market · Uruk +1"), and `routeSlots` is its fold. Cards join through an
`offerRider`-style shape (`routeRider { extra }`) — Harbourmasters' "+1 route in coastal
cities" is that shape scoped.

### What a route pays (✎ reversed 2026-08-27, the user's ruling)

The route pays its **destination** city, and the figures are read off the **origin's**
buildings. This reverses the draft's first decision (the route paid its origin, counted off
the destination); the user's own words: "a trade route's yields are read off the origin
city's buildings and paid to the destination city — it is best for routes from the capital
to later settles, to feed the later settles." A well-built capital sends its own goods
outward to whichever new town needs them, rather than a route being worth sending only once
the *partner* has something built.

| Line | Figure | From |
|---|---|---|
| **Food** | +1🌾 per building of the **food, culture or science** category at the origin | `buildingCategory` — a new field on the building row (`food` / `culture` / `science` / `production` / `military` / `gold` / `faith`), one word, read by nothing else yet |
| **Production** | +1⚙ per building of the **production, military or gold** category at the origin | same |
| **Gold** | +1💰 per **10 combined population** of the two cities, floored | `floor((pop(from) + pop(to)) / 10)` |
| **Foreign** | if the destination is another empire's: the gold line is **doubled**, and the destination's owner receives half of it (floored) | the only trade incentive before diplomacy; the partner's half is what makes "trade with me" a thing |
| **Faith** | *(nothing today; a temple counts as culture)* | — |

Every line is a `TileLine`-shaped entry in the destination's `cityYields` breakdown under one
source ("Caravan from Uruk · +3🌾 +2⚙"), so the city panel explains it and Entry XVII
stages it like any other flat (a route's food is *not* a windfall — it is a per-turn yield
and rides the percentages). Gold lands in the treasury through the same `collectYields`.

Two clauses, argued: **a route never pays a yield the origin cannot use** — no; keep it
simple, the ruling says food and production and it pays them. **Wonders** count as buildings
of their category (a wonder is a building row; `queueCategory` already says `wonder`, and
for the route's count the wonder's *yield* category is asked — the Colossus is a gold
building).

### Roads

- **`Tile.road: boolean`** — the **fourth** mutable tile field, beside `improvement`,
  `feature`, `discovery` (CLAUDE.md's trap says three on purpose; this is the design decision
  that adds one, and the trap is rewritten with it). Written by exactly two things: a trader's
  step (`arriveOnTile`, the road half of "a piece came to rest here") and **pillage**
  (removes it, the same verb that strips a farm). Never by mapgen. Nothing regenerates it.
- **Movement**: a step is a **road step iff both `from` and `to` carry road** — which is
  exactly why `stepCost(from, to)` takes both (Entry XXV). A road step costs
  `rules.movement.roadCost` (⅓, i.e. `movement × 3` hexes a turn) and **ignores terrain**
  (hills, forest: the ground's half of the price is replaced, not discounted). Rivers,
  embarkation and the zone of control are untouched — a locked step is still a locked step,
  on a road or off it. The four readers (`findPath`, `reachableTiles`, `advanceAlongPath`,
  `pathTurns`) get it for free through `stepCost`; a fifth caller does not exist.
- **Ownership**: a road is a fact about the hex, not about a seat; anybody walks it. That is
  Civ's rule and the honest one — an invader uses your roads. (The King's Road card in the
  later pools is the *own-borders* variant and is unaffected.)
- **Rendering**: a road is a board-dressing instance per hex, a segment toward each road
  neighbour, patched in place like a fog change (never a board rebuild) — `board3d` gets a
  `roads` layer with its own fingerprint, `signRoadCells`. Style: a pale grout-coloured
  line, no texture, no gravel.
- **Pillage** on a road hex removes the road; a route whose path no longer exists is **not**
  cancelled (the route is two city ids, not a path) — the caravan already walked. Whether an
  enemy on the road *pillages the route* (Civ V) waits for a war state.

### City connection

- **Connected** = there is a path of road hexes from the city's centre to the capital's
  centre through hexes that are yours or unowned (never through another seat's territory),
  **or** both cities hold a harbour and are on the same body of water (later). Derived once
  per turn by a flood fill over `Tile.road` from the capital — a sweep, never stored
  (`connectedCities(state, playerId)` beside `tileOwnerField`, one-sweep lifetime).
- **Pays** the empire, once per connected non-capital city:
  **`floor(pop / 2) + (harbourConnected ? 1 : 0)`** 💰 — one line each in a rule-5 list,
  "City connection · Uruk (6) +3💰". Civ V's `1.1 × pop + 0.15 × capital − 1` is the
  reference; ours drops the capital term (it is why Civ's needs a decimal) and drops road
  maintenance entirely — we have no upkeep and the roads are laid by trade, so the tension is
  *which town gets the caravan*, not *can I afford the road*. Size 2 → 1💰, size 6 → 3💰,
  size 10 → 5💰; at forty cities that is real money and it scales with the tall axis, which
  is what a wide empire pays authority for.
- The capital is `capitalOf(player)` (the oldest founded — Entry XIV's rule); a captured
  capital moves the graph's root, which is the Civ rule and needs no code.

### Trade and the systems that already mention it

| Card / wonder | Clause | Joins as |
|---|---|---|
| **The Colossus** | +1 route | `routeSlots` on the wonder row |
| **Machu Picchu** | +2💰 per route | `countScaled routes` (**new count**) |
| **The Great Lighthouse** | *(coastal routes later)* | `routeSlots` on the row once the harbour path exists |
| **Harbourmasters** (⚓, Æra III) | coastal cities +1 route | `routeRider` scoped coastal |
| **The Factor Houses** | +3🔬 per foreign route | `countScaled routesForeign` |
| **The Silk Exchange** | +2💰 per route · luxuries imported count as held | `countScaled routes` + **a holding clause on foreign routes** (a route to a city holding a luxury you lack counts as one copy — `openedResource`'s fourth clause, deliberately *last* in precedence) |
| **Trade Wardens** / **The Sea Charter** / **Mare Nostrum** | pillage immunity, route yields +50%, sea tiles | `behaviorRule`, `effectAmplifier routeYields` (**new target**), `tileYield water` |
| **The Founders' Road** (Doctrine I) | cities automatically joined by roads | its road half activates: on founding, lay road along the path to the nearest owned city — the same writer `arriveOnTile` uses, called from `foundCityAt` |

### Rendering and interface

- **Trader piece**: a civilian sculpt (a laden mule or a cart — the `worker` class with a
  pack) and a Tabler badge (`package` or `truck`… a `horse`-with-bales drawn in Tabler's
  geometry if nothing reads). Badge class `'trader'`.
- **Start verb** (✎ 2026-08-28): select the trader → "Start route" → the Trade screen opens
  with that trader as the *chooser*, and every available pair is a row with its preview yields
  ("+3🌾 +2⚙ +1💰"), greyed with `routeStartable`'s own sentence where it refuses. Click
  **Start**: the trader teleports to the origin and the route begins. The right pane's rows
  are sortable by food, production, gold or the three summed, and filterable by origin town.
  The board's send plates are **gone**.
- **Routes list** on the city panel (routes from this city, turns left) and on the top bar's
  gold hover (connection gold per city, route slots used/held).
- **Roads** drawn on the board; **connected** cities get a small road glyph beside the banner.

## Numbers (first guesses)

`rules.trade`: `routeTurns 30` · `rangeTurns 4` (a trader's march, with roads stretching it)
· `foreignGoldMultiplier 2` · `partnerShare 0.5` · `connectionPerPop 2` (pop per 💰) ·
`harbourConnectionBonus 1`. `rules.movement.roadCost 1/3` (stored as `roadCostThirds: 1`
so it stays an integer). Trader cost `40⚙`, the settler band's floor.

## Open questions for the ruling

1. **Origin-pays, destination-counts** — the decision above. Or both cities' buildings
   summed at half each?
2. **Range** in trader-turns (roads extend it) or in hexes (Civ V's 10)?
3. **Foreign routes**: the partner's half — yes, or no gold for the partner until diplomacy?
4. **Internal routes to the capital**: should the capital be a *better* destination (Civ V's
   capital bias) or is its building count enough?
5. **Road maintenance**: none (proposed), or 1💰 per 4 road hexes to keep sprawl honest?
6. **The route's expiry**: 30 turns and gone, or 30 turns and *renewable in place* for a
   trader's cost in gold (no walk)?

## Revisions
origin pays
✎ 2026-08-27 — reversed: "a trade route's yields are read off the origin city's buildings
and paid to the destination city — it is best for routes from the capital to later settles,
to feed the later settles."
rangeTurns, lets make that 10. Once a trader has been sent to a city, the origin and destination city both get a trading post. Trading posts extend the range of routes.
foreign routes, yes. Lets add that later once we add diplomacy.
internal routes to the capital? We should jsut keep the logic as above and have player decide optimal routes to send
road maintenance, yes, we should start adding maintenance costs to the game, note that as a to-do. 1gold per 4 hexes seems reasonable. For enforcement, only charge maintenance for roads built by the player.
Road is permanent, the route expires in 20 turns. Add a button for 'auto-resend'.
the trader unit should be traveling along the road and can be pillaged for gold, food, and production to the pillager's nearest city.
✎ 2026-08-28 — "Change caravan behavior to be much simpler. The caravan has action 'start
route' and you choose from an available trade route in the trade screen (from any city). Once
chosen, the caravan teleports to the origin city and begins the route as before. I want to
remove all micromanagement of units." Built: `startRoute` replaces `sendTrader`,
`SCHEMA_VERSION` 23 → 24 (a v23 log names a command this reducer does not have, so the save is
refused rather than misread).

✎ 2026-08-28 (the interface's half of the ruling above) — the trader's sheet offers one trade
verb, **Start route**, which opens the Trade screen with that piece as the chooser; the send
mode, the partner plates and the "a caravan sets out from a city" clause are deleted.
✎ 2026-08-28 — the Trade screen's right pane sorts by clickable Food / Production / Gold /
Total column headers (a click descending, a second ascending; the default stays gold → food →
production) and filters by origin town with a chip row. Both are per-opening state.
✎ 2026-08-28 — with no free route slot, Start route is greyed rather than hidden and every
greyed Start on the screen reads "Not enough trade route capacity. Build markets and harbours
to gain more."; the capacity figure ("2 of 2 routes") prints beside the action.
