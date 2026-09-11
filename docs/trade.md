# Trade — caravans, roads, connections — reference

Shipped (Entry XXXV + later rulings). Sources of truth: `data/rules.json`
(`rules.trade`, `rules.movement`), `src/sim/roads.ts` (leaf — `layRoad`,
`connectedCities`), `src/sim/routeYields.ts` (leaf — the route fold),
`src/sim/empireGold.ts` (connections + maintenance fold), `src/sim/trade.ts`.
History and the original proposal: `docs/history/design-history.md`.

## The trader

- Own stacking-free `UnitCategory`; the row is opened at Currency; civilian.
- **Neither built nor bought** (ruled 2026-09-09, schema 100). The row
  carries `UnitDef.routeOnly` and both doors refuse it in one voice —
  `buildError` and `purchaseError`, "…are not built — a caravan is hired on
  the trade sheet". A caravan exists only because a route was hired.
- **`Unit.trade` presence IS the route** — no route register. One route per
  city pair *per direction* (ruled 2026-09-03: A→B does not preclude B→A;
  at most two caravans join a pair, one each way); expiry is an absolute
  turn. A cart whose route lapsed keeps standing: see R4 below.
- **Never asked for orders.** `unitAwaitsOrders`/`unitOfferedForOrders` answer
  false for any `routeOnly` piece, routed or idle (R4).
- The trader walks the road it lays; **a melee blow on a trading unit
  PLUNDERS** (bounty to the attacker's nearest city) — never captures. Coming
  to rest on its hex plunders it the same way (`arriveOnTile`): one rule, two
  sentences. An **unladen** trader is an ordinary civilian and is captured.
- **One law suspends it** (`tradersUnplunderable`, batch GP2): a laden cart of
  an empire holding it is not a target at all — `attackTargetAt` skips it, so
  the tint, the forecast and the reducer refuse the blow as one, sword and shot
  alike, and a winner arriving on its hex leaves it standing rather than taking
  it. The rule is read at exactly those two seams.

## Hiring a route (ruled 2026-09-09, schema 100)

- `buyRoute { fromCityId, toCityId, mode? }` charges the treasury, mints the
  caravan in the origin's gates through `arriveOnTile` (the one arrival
  seam), writes `Unit.trade` on it and sets it walking. It names **no unit**.
- **The gate is `routeStartable` plus the purse**, and neither half is
  re-implemented: the pair, the slot, the direction, the mode, the range, the
  war and the met-ness are `trade.ts`'s five clauses; the coin is
  `purchaseError`'s money clause for the **route subject**
  (`PurchasableRoute`, `purchase.ts`), which is the sentence every other
  refused purchase carries.
- **The price** is one figure for every pair — `routePrice(state, playerId)`,
  the fold of `explainRoutePrice`: every line of the Trader row's production
  cost (the cost standard, so it climbs the columns with the age), then
  `×goldPerHammer in gold`, then `rules.trade.routePriceMultiplier` (1). The
  UI, the bot and the reducer share the one reading.
- `startRoute { unitId, fromCityId, toCityId, mode? }` **stays**, and since R4
  it is the verb a Send reaches for first: a caravan already standing — an old
  save, a route that lapsed and left its wagon at home, the bot's re-send.
  Where the trader stands is not asked — it teleports to the origin.
  `routeStartable` greys a row before any wagon is chosen; `startRouteError`
  adds the piece-only clauses (yours, a trader, idle) and nothing about the
  pair, so **a re-send is legal exactly where a hire is**, foreign partner
  included. Both take the optional mode and answer for that mode alone.

## A bought cart is kept, not spent (ruled 2026-09-09, R4)

The user: *"once a trade route completes, there's no way to re-send it …
sending a trade route should first aim to re-use a route that's already been
purchased … never ask for orders on a trader unit"*. No schema change —
nothing new is stored.

- **The cart survives its route.** A lapsed route deletes `Unit.trade` and
  leaves the wagon where it stopped; the slot comes back, the piece does not go
  with it. `idleTraders(state, playerId)` (`trade.ts`) is the reading — this
  seat's pieces whose row carries `UnitDef.routeOnly` and which carry no route,
  in `state.units` order, which is id order.
- **Send re-uses before it buys.** `sendCommandFor` (`tradeScreen.ts`, beside
  `buyCommandFor`) is the pure choice every Send on the sheet goes through —
  the cards, the All-routes rows and the Running tab's Renew alike: the first
  idle cart if there is one (`startRoute`, free), else `buyRoute` at the price.
  The **gold gate is the hire's alone**, so an empty purse still sends a cart.
  The button reads the difference — "Send · idle cart" against "Hire · N gold"
  — and the price stands beside it only where it would be paid.
- **The waiting state is on the sheet.** The masthead's purse line carries the
  count beside the slots, and an "Idle carts" line under it says what a Send
  will do with them.
- **A cart is never asked for orders.** `unitAwaitsOrders`' sixth clause is the
  whole class — `routeOnly`, routed or idle — so `unitOfferedForOrders` and the
  camera cycle go quiet with it. The unit sheet follows: a caravan's sheet is
  the trade link, plus Disband while it is idle, and nothing else.
- **End Turn prompts instead.** `firstBlocker`'s `idleTrader`
  (`turnBlockers.ts`) — a cart of this seat's standing idle and awake, and
  `hasSendablePair(state, playerId)` — says **"Send an idle trader"** and opens
  the Trade sheet. It is **passable**: the press writes the cart into
  `controls.ts`'s skip set, so the next press ends the turn. An idle cart with
  nothing to send blocks nothing.
- **`hasSendablePair` is the cheap half of the gate on purpose** — the slot
  clause and the partner clause of `routeStartable`, no path and no range. The
  blocker fold is asked once a press by the interface and once an *ask* by the
  bot's driver, and `readRoutes` is a hundred pathfinding searches. It carries
  no fog clause either, for R3's stated reason the other way round: it is a
  rule the bot reads too, and the sheet's "unexplored partners are not offered"
  is a screen reading. So a seat whose only partners are out of range, or
  foreign towns it has met but never seen, can be prompted and find the sheet
  offering nothing — the prompt is passable, and the departure is written down
  here rather than paid for with a pathfind per press.
- **The bot** hears the cart through the same blocker: `answerBlocker`'s
  `idleTrader` arm is `unitCommand`, which is `traderCommand`, unchanged. It
  never hired beside an idle cart in the first place — `RouteOutlook.free` is
  `slots − used − idle`, so `explainCaravan` refuses the hire while one waits.
- **`readRoutes(state, playerId)`** (`readings.ts`, the third verb) is the
  Trade screen's whole subject, memoised on the revision: every ordered pair
  with its available modes, the fold per mode, the price, the hexes a land
  cart would pave, the turn count, the gate's own refusal, and the towns a
  trading post at the partner would bring into range. The screen's lag was
  re-pricing every pair through `routeStartable`/`findPath` on **every open and
  every redraw**.
- **Measured** (a played thirteen-town board, 72 ordered pairs): the screen's
  own walk costs **342ms** with a route slot free and **0.9ms** with none —
  `routeStartable` refuses on the slot clause *before* it searches, so a
  capacity-bound board was never the slow case. `readRoutes` costs **619ms**
  fresh with a slot free (it carries more than the screen walked: the fold per
  mode, the paving count, the turn count, the post's reach) and **1.6ms** when
  every route is running; every ask after it in the same revision is
  **0.0004ms**. So the ranking, the filters, the tabs and the sort orders the
  mock asks for are free to redraw.
- **A town the seat has never found is not in the reading** (batch R3): the
  clause is `isExploredBy` on the partner's own **centre hex** — the seat's
  chart, not its sight, so a town seen once and now under fog stays a partner.
  It sits in the reading rather than on a surface because `readRoutes` takes a
  seat and answers for that seat: a row dropped on one pane and counted on the
  tab beside it is the disagreement the one reading exists to end. The bot never
  asks this verb — its trade arm sweeps `routeModesAvailable` over the true
  board (`src/ai/routes.ts`) — so no bot decision is narrowed by a fog rule
  written for a sheet.

## The sheet (batches R2, R3)

`src/ui/tradeScreen.ts`, the tenth on `modalShell.ts`. **A masthead, four cut
tabs, one leaf.** Gilt is its one accent and it lives on the inner edge of a tab
(the user, 2026-09-09: *"that fits the theme of 'trade routes are for
gold/economy'"*); the tab rule is ink alone, with no gilt hairline under it.

- **`readRoutes` is the whole subject and nothing else prices a pair.** No
  `routeStartable`, no `routeModesAvailable`, no `explainRouteYieldBetween`, no
  `findPath` anywhere in the file — a source pin in `test/ui/tradeScreen.test.ts`
  keeps it that way. `tradeContext` takes the reading once per paint and hands it
  down; the pairs of empires this seat has not met are dropped there (a screen
  reading, not a rule — the gate refuses them in words either way).
- **Recommended** (default): purpose groups in the ruling's priority — *Richest*
  (every voice of the fold summed, in the mode that pays most) · *Paves a road*
  (a land cart with hexes left to pave toward a town of this seat's that
  `connectedCities` cannot reach, ranked by what the connection would pay) ·
  *Feeds a town* (ranked by the turns the cart takes off the next citizen, so no
  "small" threshold is invented — `growthThreshold` climbs and the biggest saving
  lands on the smallest town by the simulation's own arithmetic) · *Most science
  and culture* (the foreign carts). Three cards each, best first with the hard
  shadow and a hedera. **An empty group is not built at all.** A pair may appear
  in two groups; the ruling says the overlap out loud.
- **A card's facts, and where each is read from** (`routeFacts`' own table):
  paves N hexes (land) ← `RouteReadingRow.roadHexes` · connects ⟨town⟩ turn T ←
  `turns` added to `state.turn` · connection +G gold/t ← `connectedCities`' own
  step, the town's people over `trade.connectionPerPop` · host keeps G gold/t ←
  `trade.international.hostGold` · ⟨town⟩ size S · F food/t ← `readCity` +
  `growthSurplus` · next citizen N turns (was M) ← `growthThreshold` against the
  basket through `turnsToFill`, with the cart's food and without · blockaded ←
  `cityBlockaded` · post at ⟨town⟩ +N range · K more towns in reach ←
  `postReach` and `trade.postRangeTurns`.
- **The mock's "warships on path" is deliberately not built.** `readRoutes` does
  not carry the path — carrying it would mean surveying every refused pair, which
  is the cost the reading exists to avoid — so the sheet cannot count hulls along
  one. What stands in its place is the rule that actually takes a route's pay
  back: a **blockade** at either end (`cityBlockaded`).
- **The Land | Sea control re-reads the card**, and a mode is never prose
  anywhere on the sheet (the user's final mark): the tables wear the same control
  or a single chip where one mode is all there is, with the road state as its own
  column. Pressing a side writes the choice down and repaints; `routeCard` is the
  one place that decides what a card says.
- **Running**: route · mode (a chip — a running route's mode is settled) · road ·
  pays a turn · turns left · the three verbs (↻ auto-renew, Renew, Cancel). The
  unit sheet's route buttons became one link, so this row is `setAutoResend`'s
  only surface now.
- **All routes**: the old screen's content behind a tab — collapsible `<details>`
  by origin in founding order, filter chips (own · abroad · land · sea) and sort
  chips (pay · food · gold · science · road). The slot tally on a summary is the
  **empire's** ledger, so the same figure rides every fold; vermilion at nought.
- **Unavailable**: four headings, classified by re-asking the simulation's own
  clauses **in `routeStartable`'s order** — never by reading its prose. `war` ·
  `slots` · `running` · `reach`. Two differences from the mock, both stated:
  there is no *blockaded* heading (a blockade is not a refusal; it is a fact on
  the card), and *Out of reach* covers both "no lane" and "too far", because the
  reading does not survey a pair the gate refused. Each row prints the gate's own
  sentence in the wanting voice; the slot group says `NO_ROUTE_CAPACITY` once
  over the group instead of forty times down it.
- **Every figure is in its voice's ink** (batch R3, the user: *"colorize the
  yields in the trade screen"*). A composed figure is cut into **one run per
  voice** by `tradeFigureRuns` (`tradeLines.ts`, the cut made where
  `splitYieldText` finds the marks, so no surface needs a second composer beside
  the string it already holds), and `setTradeFigures` writes each run into a
  `.trade-yield.is-⟨voice⟩` span. **The mark closes its run**, and a drawn mark
  is `currentColor`-masked, so the number and the drawing take one ink by
  construction rather than by two rules agreeing. The six are the specimen's
  parchment tokens — `--y-food` · `--y-prod` · `--y-gold` · `--y-sci` ·
  `--y-cul` · `--y-faith` — the same a tile's yields and a city panel's chips
  are set in; a lapsed route's row keeps its own faint ink over them.
- **Every send and cancel lives here.** Send dispatches whichever command
  `sendCommandFor` names — `startRoute` through `controls.startRouteFrom` for a
  cart already owned, else `buyRoute` through `controls.buyRouteOf` (see
  "A bought cart is kept, not spent" above); the unit sheet's row is a link
  ("Open the trade sheet");
  the top bar's routes chip and a fourth HUD dock button both wear the drawn cart
  (`TRADE_MARK`, `src/art/dockMarks.ts` — a bale on two wheels, drawn rather than
  vendored, in the flair gallery's dock cabinet). `E` opens the sheet, beside
  `C`/`H`/`W`; its listener is in `gameDisposers`.

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
  (cards, furs' luxury line), then the **row shares** (`routeYield.share`, a
  percentage voice by voice — The Silk Exchange's doubled beakers and songs,
  floored per row and per voice off the fold as it stood), then the percent
  amplifiers (Merchant League, The Escorted Roads) — floored once, split by
  running difference.
- A card's route rows are read off the **origin's empire**, plus the **two
  towns' own shelves** (the destination's only on a domestic road, because a
  foreign host's presses are not the sender's to harvest). `routeYield.origin`
  and `.destination` are ordinary `CityScope`s asked of the two ends: the
  Caravanserai is a hub (`origin`), the Printing House a terminus
  (`destination`).
- **A sea route pays `rules.trade.seaYieldPercent` more** (50; ruled
  2026-09-09) — a labelled line of the same fold, taken after the flats, the
  cards' lines and their shares and **before** the percent amplifiers, so a
  law that doubles trade route yields doubles the premium too. It rides the
  sender's fold abroad on the same argument, and the blockade below still
  takes the lot back. The mode is read off `Unit.trade` for a running route
  (`routeMode`) and named by the caller for a preview; an absent mode is
  **land**, the mode that pays no premium.
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
- Riders deliberately NOT built (flagged): science base 2 when the partner is
  an age ahead.
- **A route row may name the crossing** (`CardPaysEffect.crossing`, the user's
  tree pass of 2026-09-10): `'international'` rides the sender's fold alone,
  `'domestic'` the destination's alone, absent rides both. It is a fact about
  the *pair* and therefore not a `CityScope` — asked through
  `routeIsInternational`, the one reading of "foreign", and refused where no far
  end is in hand exactly as a `destination` clause is. Two live rows: **The Silk
  Road** (+3💰 abroad) and **Daughter Cities** (+1🌾 +1⚙ at home).
- **The Silk Road lends a luxury** (`routesImportLuxuries`, the same pass): each
  live route of this empire that ends abroad hands the sender **one** kind the
  destination holds improved — never a kind the empire already controls, never
  the same kind twice, one per route, lapsing with the route. Derived every time
  it is asked (`importedLuxuries`, `resourceEffects.ts`), remembered on the
  revision clock, nothing stored. Every figure it pays is
  `trade.importedLuxuryPercent` (50) of a dug seam's, because the share is read
  as the **copy count** (`copiesFor`) and not applied fold by fold; the flat
  contentment every unique luxury pays is halved beside it in `explainHappiness`.
  Every line says `· on loan`.

- **A slot may grow with the town** (`BuildingDef.routeSlotsPerPopulation`, the
  user's tree pass of 2026-09-10, marks 14 and 17): the Market's and the
  Caravanserai's eight citizens buy one further route apiece, counted in the
  **holding town** and floored there, as its own labelled line of
  `explainRouteSlots`. A building field rather than a card effect, for
  `sciencePerPop`'s reason exactly — the fold already walks each town's shelves
  with the town in hand. The **Shipyard** carries no slot at all since the same
  pass (mark 8); the Harbour keeps its one.

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
