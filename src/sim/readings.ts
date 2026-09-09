/**
 * **The readings — the town's list and the empire's, remembered on the
 * revision.**
 *
 * ---
 *
 * **The three verbs, and only three** (batch E3b, `docs/audit/evaluations.md`
 * §4b step 7; the table of what was renamed is `docs/yields.md`, "The three
 * verbs"). Every exported reading of a yield in this system is one of:
 *
 *   · **`explainX(…)`** returns a **labelled list** and never a bare number.
 *     `explainTileYield`, `explainCity`, `explainEmpireLines`, `explainLedger`,
 *     `explainCardImpact`. Rule 5 lives here: a source that pays joins the
 *     list, and nothing computes a total beside it. (`explainCity` is the one
 *     that returns a *record around* its list — the lines, their fold, and the
 *     percent list that is not applied to them — because steps 1–11 produce two
 *     artefacts and a caller wants both; every other `explain…` is an array.)
 *   · **`foldX(…)`** is **the one sum** of such a list — `foldTileLines`,
 *     `foldCityFlats`, `foldEmpireLines`, `foldCardYields`. Where a layer's fold
 *     is more than an addition it says so and stays a fold: `foldCity` is the
 *     town's total, which *is* the flats plus step 12's two stages, because a
 *     town's total is staged by definition and a second verb for the
 *     multiplication would invite a second answer. `foldEmpireRates` is the
 *     empire's books summed for a card that asks what a turn is worth.
 *   · **`readX(state, …)`** is the **memo** — `explain` + `fold`, keyed on the
 *     revision, and it lives in **this file and nowhere else**. That is the
 *     whole difference between the second verb and the third: a fold is taken,
 *     a reading is remembered.
 *
 * `test/sim/verbs.test.ts` is the register: an exported reading named for the
 * old vocabulary (`…Yield(s)`, `…Total`, `…Rate(s)`, `…Reading`, `…Quote`,
 * `…Aggregate`, `…Sums`) fails there unless it carries one of the three verbs,
 * every `read…` export is in this file, and every `explain…` returns a list.
 *
 * ---
 *
 * The user's ideal (`docs/audit/evaluations.md` §2b, 2026-09-07): *information
 * flows one way; downstream subscribers never publish upwards and subscribe to a
 * single source of truth rather than recalculating; variables are cached and
 * updated with the user's actions, so yields that have not changed are not
 * recalculated.*
 *
 * The target, in the same terms, and this file is it: **one revision on the
 * state** (bumped by `applyCommand` and once per turn phase; deterministic and
 * replayed), every derived reading a memo keyed `(revision, seat | town)` in a
 * leaf, the town publishing its labelled **list** once per revision and every
 * reader — panel, Ledger, lens, card impact, bot — reading that list and never
 * walking the layers themselves. The twenty-two-entry register of mid-turn
 * mutations then goes: a writer moves the state, the revision moves with it, and
 * the caches follow without being told.
 *
 * **There is no event bus and there should not be one.** A reader is a pure
 * function of `(state)` and the revision *is* the subscription: ask again, and
 * you are handed either the same object (nothing moved) or a fresh one (it did).
 * `updatePanel` in `main.ts` is then exactly "the revision moved — re-read".
 *
 * **What the counter promises, and what it does not.** It moves on every
 * accepted command and once after each end-of-turn phase — the two ways the
 * simulation moves at all — so a *reader at rest* is never handed a stale
 * answer. It says nothing about the inside of a handler or the inside of a
 * phase, where the world is halfway moved; nothing here is asked from in there,
 * and `collectYields` deliberately keeps its own readings for that reason as
 * well as for the leaf rule below. A caller that mutates the state by hand —
 * a bench, a fixture — is a writer, and calls `bumpRevision` the way a command
 * does. That is the whole contract, and it is stated on `GameState.revision`.
 *
 * The one memo that is not held in this file is `liveReading` (the card
 * evaluator's), and since batch E3a it is keyed the same way — the revision,
 * the seat and the cut, on a `WeakMap` on the state. Its print is gone and so
 * are the re-asked conditions; the benches announce their hand mutations
 * instead (§4c.1 of `docs/audit/evaluations.md`, `test/sim/benches.test.ts`).
 *
 * Three facts about the memos, and each of them is load-bearing — they are
 * implemented in `slate.ts` now (see below) and stated on it:
 *
 *   · **`WeakMap` on the state, never a field of it.** `snapshotState` is
 *     `JSON.stringify(state)`, so anything hung on `GameState` is in every save
 *     hash and every replay comparison in the suite. A cache that changed a
 *     snapshot would not be a cache, it would be a rule. `liveReading`'s own
 *     bargain, one file over.
 *   · **Read by lookup only** (CLAUDE.md rule 2). Nothing here iterates a `Map`;
 *     every fold walks an array in its own order, so no outcome can depend on
 *     insertion order.
 *   · **A revision that has moved throws the whole slate away** rather than
 *     invalidating an entry. One integer compare, and no question of which
 *     entries a mutation reached — which is the entire point of keying on the
 *     world rather than on a walk of it.
 *
 * **Where it sits in the graph**: above `cities.ts` and below every reader. It
 * is a leaf in the sense CLAUDE.md means — imported by many, importing few, and
 * *never* imported by `cities.ts`, which would be a runtime cycle
 * (`test/mapgen/moduleCycles.test.ts` is the gate). That is why `collectYields`
 * still takes its own readings rather than calling in here; the phase's own
 * docblock says what else keeps it there.
 *
 * ---
 *
 * **The slate itself lives one file down** (batch M1, `src/sim/slate.ts`), and
 * this file is a tenant of it rather than its owner.
 *
 * The reason is the graph again, read from the other side. Two readings the bot
 * spends a quarter of its turn on — `meterEffects` (`meters.ts`) and
 * `controlledHoldings` (`cities.ts`) — are asked from *inside* the pipeline, by
 * `empirePercents`, `borderGrowth`, `explainGrowthPercent` and
 * `tilePurchaseError`. Every one of those is below this file and none of them
 * may import it. A memo they can reach has to sit under them; a memo that sat in
 * a second `WeakMap` would be a second cache with a second lifetime, which is
 * the thing this file was built to prevent. So there is **one** slate, in a leaf
 * with no runtime imports at all, and three tenants above it and two below.
 *
 * They are **not** `read…` verbs and must not be renamed into them: the third
 * verb lives here and nowhere else (`test/sim/verbs.test.ts`), and neither of
 * those two is a reading of a *yield* in the first place. What they share with
 * the three below is the slate, which is the part that has to be shared.
 *
 * The slate adds one rule to the contract above, and it is the one this file
 * never needed: **a write announces itself where it happens** (batch M3). Until
 * then the slate was *suspended* for the length of every handler and every
 * phase, because the revision is raised after the fact; measured, that window
 * was eight per cent of a bot's game. Now every mutation that changes what a
 * tenant folds moves the clock on the line it happens, a source-reading register
 * (`test/sim/slateRegister.test.ts`) fails the day one forgets, and
 * `setSlateShadow` recomputes every hit to prove it. `slate.ts`'s docblock is
 * the statement of record.
 *
 * ---
 *
 * **A tenant names its clock** (batch M2, `slate.ts`, "The two clocks").
 *
 * The revision moves on every accepted command, and a seat sends dozens a turn
 * that move a piece and nothing else. M1's closing finding was that what was
 * left of the two empire walks in the profile was *misses*: one walk per command
 * rather than one per question. So there is a coarser **economy** clock beside
 * the revision, moved by every phase and by every command kind except the five
 * that touch only positions and orders (the register is `COMMAND_CLOCKS` in
 * `commands.ts`), and each tenant declares which of the two it is a reading of.
 *
 * | tenant | clock | why |
 * |---|---|---|
 * | `meterEffects` | economy | walks towns, buildings, luxuries and law — and, through the card evaluator, the **garrisons** standing in the towns and the **banks** behind them (M3's correction: The Long Watch counts pieces and Pilgrim Roads counts banked faith, so the seams that write one announce) |
 * | `controlledHoldings` | economy | walks the ground |
 * | `readEmpirePercents` | economy | those, plus the treasury |
 * | `readCity` | revision | step 6 is the caravans arriving, and a caravan is cut by a hull in the harbour mouth (`cityBlockaded`) |
 * | `readEmpire` | revision | that reading summed |
 *
 * The split is not a taxonomy of yields; it is a claim about what each walk can
 * *see* — and M3's shadow run corrected two rows of it. A town's list can see a
 * piece; so, it turns out, can the **meters**, because a card may pay
 * contentment per unit standing in a town and per fifty banked faith. What no
 * step can reach is the **ground**, which is the holdings walk, and that is what
 * the coarser clock still buys.
 */

import type { City, GameState } from './state';
import {
  emptyCityYields,
  type CityYields,
} from './cities';
import { getTileAt } from './map';
import { type Cell, pathTurns } from './pathfind';
import { routePrice } from './purchase';
import { RULES } from './rulesData';
import {
  type RouteYieldLine,
  explainRouteSenderYieldBetween,
  explainRouteYieldBetween,
  foldRouteYield,
  routeIsInternational,
} from './routeYields';
import {
  type RouteMode,
  caravanProbeFor,
  routeLegPath,
  routeModesAvailable,
  routeRange,
  routeSlots,
  routeStartable,
  usedRouteSlots,
} from './trade';
import { fullMovement } from './units';
import {
  empirePercents,
  explainCity,
  foldCity,
  type CityReading,
  type EmpirePercents,
} from './yields/town';
import {
  explainEmpireLines,
  foldEmpireLines,
  type EmpireYieldLine,
} from './yields/empire';
import { CITY_YIELD_KEYS } from './resourceData';
import { slateMemo } from './slate';

/** One town's whole reading: its labelled list, and what it banks. */
export interface TownReading {
  city: City;
  /** Steps 1–11 of `docs/yields.md` — the list, the flats, the percentages. */
  reading: CityReading;
  /**
   * Step 12: the two stages over the flats, toward whatever is at the **front**
   * of the queue — the very call `collectYields` banks with, so a reader and the
   * resolution cannot disagree about a barracks' hammers.
   */
  total: CityYields;
}

/** One empire's whole reading: its towns, its own lines, and the fold of both. */
export interface EmpireReading {
  playerId: number;
  /** In `state.cities` order — founding order, which is every phase's order. */
  towns: readonly TownReading[];
  /** Steps 13–17: `explainEmpireLines`, the stage line included. */
  lines: readonly EmpireYieldLine[];
  /** The empire stage's own reconciliation lines, one per voice that moved. */
  stage: readonly EmpireYieldLine[];
  /** The meter tiers and the arrears, taken once for the seat. */
  empire: EmpirePercents;
  /**
   * Step 18: every town's total plus the fold of the empire's lines — **the
   * headline**, and since batch E3b the only spelling of it.
   *
   * Each town is priced *toward whatever it is building*, which is the call
   * `collectYields` banks with: a barracks puts a share of its town's hammers
   * behind a unit, and a strip quoting the unmodified rate would be a headline
   * the turn resolution disagrees with. On top of the towns is everything the
   * empire banks beyond them (`explainEmpireLines`, batch H19: the luxuries'
   * signatures, the caravans abroad, the treasury's ledger, the cards'
   * empire-scale payouts, and the empire stage over the additive fold of them).
   * None of that belongs to a town — a city connection is a fact about the
   * *road* between one and the capital, road maintenance is charged on hexes, a
   * garrison's wages are charged on the army rather than on whichever town it
   * happens to be standing in (Entry XLI), and a route ending in a foreign town
   * pays the empire that *sent* it.
   *
   * `topBar.ts`'s `civYields` was this fold with a second name on it and is
   * gone (batch E3b): the strip, the Ledger, the faith rung and the bot all read
   * this field.
   */
  totals: CityYields;
}

/**
 * **The empire's half of every town's percentages, taken once per seat per
 * revision** — the hoist the top bar's strip, `foldEmpireRates` and the bot each
 * used to do by hand, done once for all of them.
 *
 * `empirePercents` is a pure function of `(state, playerId)` that sweeps every
 * city and every unit the empire holds for the two meters, and `explainCity`'s
 * fourth parameter exists precisely so a loop can pay for it once instead of
 * once per town. Handing this in is that bargain kept for every reader at once;
 * the figure is unchanged by construction, because this is the very call the
 * default would have made.
 */
export function readEmpirePercents(state: GameState, playerId: number): EmpirePercents {
  // **On the economy clock** (batch M2, `slate.ts`), with the two walks beneath
  // it: this is `meterEffects` plus one question of the treasury, and neither
  // can see where a piece is standing. A seat that spends its turn marching pays
  // for it once rather than once a step.
  return slateMemo(state, 'economy', 'percents', String(playerId), () =>
    empirePercents(state, playerId),
  );
}

/**
 * **One town's labelled list, once per revision** — steps 1–11 of
 * `docs/yields.md`, and the single source of truth every surface that prints a
 * town's yields now subscribes to.
 *
 * It is deliberately the *plain* reading: no `hypothetical`, the seat's own
 * meters. A what-if is a different question about a different town and asks
 * `explainCity` directly, which is what keeps this memo the answer to exactly one
 * question — "what does this town make, as the board stands".
 *
 * Keyed on the city's **id**, so a reading survives a caller holding a stale
 * `City` object only in the sense that it answers about the town rather than
 * about the pointer; every mutation to that town moves the revision and throws
 * the slate away.
 */
export function readCity(state: GameState, city: City): CityReading {
  // **On the revision, and deliberately not on the economy clock** (batch M2).
  // A town's list folds the caravans arriving (step 6 of `docs/yields.md`), and
  // what a caravan pays is cut when either end is blockaded — `cityBlockaded`,
  // which is a reading of **where a hull is standing**. One enemy ship moved
  // into the harbour mouth changes what this town makes with nothing else on the
  // board different, so this reading moves with every command and the coarser
  // clock is for the walks that cannot see a piece at all.
  return slateMemo(state, 'revision', 'towns', String(city.id), () =>
    explainCity(state, city, [], readEmpirePercents(state, city.ownerId)),
  );
}

/**
 * **One empire's whole reading, once per revision** — its towns' lists and
 * totals, its own lines with the empire stage among them, and the fold of the
 * two, which is what the turn resolution banks.
 *
 * The order is the phase's: every town in `state.cities` order (founding order),
 * then the empire's list, then the sum. `explainEmpireLines` is asked **last**
 * for the reason it is asked last in the resolution — a `pays` rate reads
 * the rates the standing lines produced — and it is handed the seat's meters so
 * that the towns above and the lines below are read against one answer to "is
 * this empire content, and is it in debt".
 */
export function readEmpire(state: GameState, playerId: number): EmpireReading {
  // On the revision, for `readCity`'s reason exactly — this is that reading
  // summed, over lines that include the caravans abroad.
  return slateMemo(state, 'revision', 'empires', String(playerId), () =>
    empireReading(state, playerId),
  );
}

// --- the routes on offer ----------------------------------------------------

/**
 * What one **mode** of one pair would pay this empire, per turn — the labelled
 * list and its fold, from the simulation's own folds.
 *
 * Two folds and not one, because a route ending abroad pays the *sender* out of
 * a different table (`explainRouteSenderYieldBetween`) and pays the host a coin
 * that lands in somebody else's books. `abroad` says which of the two this is,
 * so a screen never has to ask the question a second way.
 */
export interface RouteModeReading {
  mode: RouteMode;
  /** True when the fold below is the sender's — the partner is another empire's. */
  abroad: boolean;
  /** Rule 5: the labelled list, with the sea premium among the lines. */
  lines: readonly RouteYieldLine[];
  /** The fold of it — `foldRouteYield`, and never a sum taken beside it. */
  total: ReturnType<typeof foldRouteYield>;
}

/** One ordered pair of towns, read whole. See `readRoutes`. */
export interface RouteReadingRow {
  from: City;
  to: City;
  /**
   * The modes the gate would accept **today**, in `ROUTE_MODES` order — the
   * whole of `routeStartable` asked of each, so a mode listed here is a mode
   * `buyRoute` takes.
   */
  modes: readonly RouteMode[];
  /** `modes.length > 0`. The Trade screen's Available-or-not. */
  available: boolean;
  /**
   * Why not, in `routeStartable`'s **own sentence** — the land mode's, which is
   * the one a player meets first — or `null` when the pair is available.
   */
  refusal: string | null;
  /** What each available mode would pay, in `modes` order. */
  pays: readonly RouteModeReading[];
  /**
   * How many hexes of the land leg a cart would **pave** — hexes with no road on
   * them today, the origin's own excepted (a caravan starts there and a road is
   * worn by arriving somewhere).
   *
   * `null` when no land leg exists at all — a sea-only pair and a cart that
   * lays nothing — and on a pair the gate refused, which is not surveyed.
   */
  roadHexes: number | null;
  /**
   * Turns of a caravan's own march between the two, on the leg the survey found
   * — `pathTurns` on a full purse, exactly as the range clause measures it.
   *
   * `null` on a pair the gate refused: the survey is A* and a route nobody may
   * send has no march to price. See the note in `routesReading`.
   */
  turns: number | null;
  /**
   * The towns a **trading post at the partner** would bring into range — town
   * ids, in `state.cities` order.
   *
   * The sim's own rule and nothing beside it (`routeRange`): the base is
   * `rules.trade.rangeTurns` and each post among two endpoints adds
   * `rules.trade.postRangeTurns`, so a partner that has never been an end of a
   * route is a partner whose *first* route buys every later one three more
   * turns of reach. Empty when the partner already carries a post.
   *
   * Measured off the turn counts this very reading took, treating the march as
   * symmetric — the one stated approximation here, and a cheap one: a caravan's
   * step price differs by direction only where a zone of control tolls one way,
   * and the alternative is a second A* per pair per partner.
   */
  postReach: readonly number[];
}

/** Every pair this empire could send a caravan between, priced. See `readRoutes`. */
export interface RoutesReading {
  playerId: number;
  /** `routeSlots` — the fold of markets and card riders. */
  slots: number;
  /** `usedRouteSlots` — caravans carrying a route, lapsed ones included. */
  used: number;
  /** What one route costs to hire today — `routePrice`, one figure for them all. */
  price: number;
  /**
   * Every ordered pair of a town of this empire's and a town anywhere, in
   * `state.cities` order twice over — founding order, a fact about the state
   * rather than about the sweep.
   */
  rows: readonly RouteReadingRow[];
}

/**
 * **Every route this empire could send, read once per revision** — the Trade
 * screen's whole subject, and the fix for the lag the user reported
 * (2026-09-09, `docs/flags.md` item (iii): *"please look into the performance
 * of the trade screen, it gets quite laggy"*).
 *
 * The screen's cost was never the drawing. Every open re-priced every ordered
 * pair from scratch: `routeModesAvailable` is `routeStartable` asked twice, and
 * `routeStartable` runs A* for each mode and then `pathTurns` over the path it
 * found — so a late board of a dozen towns paid a few hundred pathfinding
 * searches every time the sheet was opened, and again on every redraw within it.
 *
 * The third verb is the whole answer (CLAUDE.md rule 5's `readX`): this is
 * `explain` + `fold` for every pair at once, memoised on the slate, so the
 * hundredth ask in one revision costs a `Map` lookup. A screen that redraws its
 * filters, its tabs and its sort orders off one reading pays for the walk once
 * per accepted command instead of once per render.
 *
 * **On the revision, not the economy clock**, and for `readCity`'s reason said
 * about a different piece: what a caravan pays is cut when either end is
 * blockaded (`cityBlockaded`), which is a reading of where a hull is standing —
 * and the *gate* below is worse than that, since a pair's legality reads the
 * traders already out, the war register and the ground a march would cross. One
 * enemy ship moved changes this reading with nothing else on the board
 * different.
 *
 * Everything in a row is the simulation's own: the gate is `routeStartable`,
 * the pay is `routeYields.ts`'s two folds with the sea premium among their
 * lines, the price is `routePrice`, the range is `routeRange`. Nothing here
 * re-implements a rule; it remembers the answers.
 */
export function readRoutes(state: GameState, playerId: number): RoutesReading {
  return slateMemo(state, 'revision', 'routes', String(playerId), () =>
    routesReading(state, playerId),
  );
}

/** A row still being written. `postReach` is filled by a second pass. */
type DraftRouteRow = Omit<RouteReadingRow, 'postReach'> & { postReach: number[] };

function routesReading(state: GameState, playerId: number): RoutesReading {
  const rows: DraftRouteRow[] = [];
  // The turn counts this sweep measures, keyed on the unordered pair, so the
  // post-reach pass below can ask "how far is that town from this one" without
  // a second search. See `RouteReadingRow.postReach` for the symmetry it leans
  // on and why it is cheap.
  const turnsBetween = new Map<string, number>();

  for (const from of state.cities) {
    if (from.ownerId !== playerId) continue;
    const probe = caravanProbeFor(playerId, from);
    for (const to of state.cities) {
      if (to.id === from.id) continue;
      const modes = routeModesAvailable(state, playerId, from.id, to.id);
      const pays: RouteModeReading[] = [];
      const abroad = routeIsInternational(from, to);
      for (const mode of modes) {
        const lines = abroad
          ? explainRouteSenderYieldBetween(state, from, to, mode)
          : explainRouteYieldBetween(state, from, to, mode);
        pays.push({ mode, abroad, lines, total: foldRouteYield(lines) });
      }
      // **One extra survey, and only for a pair the gate took.** The land leg
      // is what a cart paves and what the range was measured on, and the sea
      // leg is the fallback for a pair with no land at all — but both are A*,
      // and a pair the gate has already refused has no cart to measure. That
      // keeps the reading's cost proportional to the routes actually **on
      // offer** rather than to the square of the board, which matters most in
      // exactly the state a player is in most of the game: `routeStartable`
      // refuses on the slot clause *before* it searches, so on a board with
      // every route running this whole reading costs 1.6ms against the 318ms
      // an unconditional survey cost (measured, a played thirteen-town map,
      // 72 pairs).
      //
      // The consequence is stated rather than hidden: an unavailable row
      // carries no `turns` and no `roadHexes`, and it does not contribute to
      // the post-reach pass. That is honest — a post's reach is about routes
      // this seat could run — and the row still carries the gate's own sentence,
      // which is what the Unavailable tab prints.
      const walk = (mode: RouteMode): Cell[] | null =>
        probe === null ? null : routeLegPath(state, probe, from, to, mode);
      const land = modes.includes('land') ? walk('land') : null;
      const walked = land ?? (modes.includes('sea') ? walk('sea') : null);
      const turns =
        probe === null || walked === null
          ? null
          : (() => {
              const full = fullMovement(probe, state);
              return pathTurns(state, probe, walked, { left: full, refill: full });
            })();
      if (turns !== null) turnsBetween.set(pairKey(from.id, to.id), turns);
      rows.push({
        from,
        to,
        modes,
        available: modes.length > 0,
        // The land mode's sentence: it is the one a player meets first, and a
        // pair with no land at all is told about the sea by it anyway (the gate
        // words its refusal after the mode it was asked about).
        refusal: modes.length > 0 ? null : routeStartable(state, playerId, from.id, to.id, 'land'),
        pays,
        roadHexes: land === null ? null : unpavedHexes(state, land),
        turns,
        postReach: [],
      });
    }
  }

  // **The post's reach, in one pass over what the sweep already measured.** A
  // route sets a trading post at *both* ends for ever (`startRouteAt`), so the
  // thing worth telling a player about a pair is which towns the partner's new
  // post pulls into range — the reason `rules.trade.postRangeTurns` exists at
  // all, and the fact the user's mock prints beside a card.
  const extra = RULES.trade.postRangeTurns;
  for (const row of rows) {
    if (row.to.tradingPost === true || extra <= 0) continue;
    const reached: number[] = [];
    for (const other of state.cities) {
      if (other.id === row.to.id || other.id === row.from.id) continue;
      const turns = turnsBetween.get(pairKey(row.to.id, other.id));
      if (turns === undefined) continue;
      const range = routeRange(row.to, other);
      if (turns > range && turns <= range + extra) reached.push(other.id);
    }
    row.postReach = reached;
  }

  return {
    playerId,
    slots: routeSlots(state, playerId),
    used: usedRouteSlots(state, playerId),
    price: routePrice(state, playerId),
    rows,
  };
}

/** The unordered pair, as a key. Ids, never objects — the map is read by lookup. */
function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/**
 * How many hexes of this leg carry no road yet — what a land cart would pave.
 *
 * The **first** cell is skipped: it is the origin's own gates, and a road is
 * worn by *arriving* somewhere (`layRoadUnder`, and the same reason
 * `applyStartRoute` writes the route after the arrival). Presence of `Tile.road`
 * is the whole question — the builder's seat on it is `explainEmpireGold`'s
 * business, not a cart's.
 */
function unpavedHexes(state: GameState, path: readonly { col: number; row: number }[]): number {
  let count = 0;
  for (let at = 1; at < path.length; at += 1) {
    const step = path[at]!;
    const tile = getTileAt(state.map, step.col, step.row);
    if (tile && tile.road === undefined) count += 1;
  }
  return count;
}

function empireReading(state: GameState, playerId: number): EmpireReading {
  const empire = readEmpirePercents(state, playerId);
  const towns: TownReading[] = [];
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const reading = readCity(state, city);
    towns.push({ city, reading, total: foldCity(state, city, [], city.queue[0], reading) });
  }
  const lines = explainEmpireLines(state, playerId, empire);
  const totals = emptyCityYields();
  for (const town of towns) {
    for (const key of CITY_YIELD_KEYS) totals[key] += town.total[key];
  }
  const banked = foldEmpireLines(lines);
  for (const key of CITY_YIELD_KEYS) totals[key] += banked[key];

  return {
    playerId,
    towns,
    lines,
    stage: lines.filter((line) => line.origin === 'stage'),
    empire,
    totals,
  };
}
