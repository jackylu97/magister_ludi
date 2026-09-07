/**
 * **The readings — the town's list and the empire's, remembered on the
 * revision.**
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
 * The one memo that is **not** keyed here is `liveReading` (`statecraft.ts`),
 * which still checks its own print of everything a seat holds. §3c wanted the
 * print gone; it turns out to be doing invalidation work no counter can do
 * today, because the suite's benches build a board and mutate it by hand rather
 * than through commands. That is a batch of its own — see "E2 as shipped" in
 * `docs/audit/evaluations.md`.
 *
 * Three facts about the memos, and each of them is load-bearing:
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
 */

import type { City, GameState } from './state';
import {
  type CityQuote,
  type CityYields,
  type EmpirePercents,
  type EmpireYieldLine,
  cityQuote,
  cityYields,
  empirePercents,
  emptyCityYields,
  explainEmpireLines,
  foldEmpireLines,
} from './cities';
import { CITY_YIELD_KEYS } from './resourceData';

/** One town's whole reading: its labelled list, and what it banks. */
export interface TownReading {
  city: City;
  /** Steps 1–11 of `docs/yields.md` — the list, the flats, the percentages. */
  quote: CityQuote;
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
  /** Step 18: every town's total plus the fold of the empire's lines. */
  totals: CityYields;
}

/** One board's remembered readings, thrown away whole when the revision moves. */
interface Slate {
  revision: number;
  percents: Map<number, EmpirePercents>;
  towns: Map<number, CityQuote>;
  empires: Map<number, EmpireReading>;
}

const MEMO = new WeakMap<GameState, Slate>();

/** This board's slate at this revision — a fresh one the moment the world moved. */
function slateOf(state: GameState): Slate {
  const held = MEMO.get(state);
  if (held !== undefined && held.revision === state.revision) return held;
  const fresh: Slate = {
    revision: state.revision,
    percents: new Map(),
    towns: new Map(),
    empires: new Map(),
  };
  MEMO.set(state, fresh);
  return fresh;
}

/**
 * **The empire's half of every town's percentages, taken once per seat per
 * revision** — the hoist `civYields`, `empireRates` and the bot each used to do
 * by hand, done once for all of them.
 *
 * `empirePercents` is a pure function of `(state, playerId)` that sweeps every
 * city and every unit the empire holds for the two meters, and `cityQuote`'s
 * fourth parameter exists precisely so a loop can pay for it once instead of
 * once per town. Handing this in is that bargain kept for every reader at once;
 * the figure is unchanged by construction, because this is the very call the
 * default would have made.
 */
export function readEmpirePercents(state: GameState, playerId: number): EmpirePercents {
  const slate = slateOf(state);
  const held = slate.percents.get(playerId);
  if (held !== undefined) return held;
  const fresh = empirePercents(state, playerId);
  slate.percents.set(playerId, fresh);
  return fresh;
}

/**
 * **One town's labelled list, once per revision** — steps 1–11 of
 * `docs/yields.md`, and the single source of truth every surface that prints a
 * town's yields now subscribes to.
 *
 * It is deliberately the *plain* reading: no `hypothetical`, the seat's own
 * meters. A what-if is a different question about a different town and asks
 * `cityQuote` directly, which is what keeps this memo the answer to exactly one
 * question — "what does this town make, as the board stands".
 *
 * Keyed on the city's **id**, so a reading survives a caller holding a stale
 * `City` object only in the sense that it answers about the town rather than
 * about the pointer; every mutation to that town moves the revision and throws
 * the slate away.
 */
export function readCity(state: GameState, city: City): CityQuote {
  const slate = slateOf(state);
  const held = slate.towns.get(city.id);
  if (held !== undefined) return held;
  const fresh = cityQuote(state, city, [], readEmpirePercents(state, city.ownerId));
  slate.towns.set(city.id, fresh);
  return fresh;
}

/**
 * **One empire's whole reading, once per revision** — its towns' lists and
 * totals, its own lines with the empire stage among them, and the fold of the
 * two, which is what the turn resolution banks.
 *
 * The order is the phase's: every town in `state.cities` order (founding order),
 * then the empire's list, then the sum. `explainEmpireLines` is asked **last**
 * for the reason it is asked last in the resolution — a `rateConversion` reads
 * the rates the standing lines produced — and it is handed the seat's meters so
 * that the towns above and the lines below are read against one answer to "is
 * this empire content, and is it in debt".
 */
export function readEmpire(state: GameState, playerId: number): EmpireReading {
  const slate = slateOf(state);
  const held = slate.empires.get(playerId);
  if (held !== undefined) return held;

  const empire = readEmpirePercents(state, playerId);
  const towns: TownReading[] = [];
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const quote = readCity(state, city);
    towns.push({ city, quote, total: cityYields(state, city, [], city.queue[0], quote) });
  }
  const lines = explainEmpireLines(state, playerId, empire);
  const totals = emptyCityYields();
  for (const town of towns) {
    for (const key of CITY_YIELD_KEYS) totals[key] += town.total[key];
  }
  const banked = foldEmpireLines(lines);
  for (const key of CITY_YIELD_KEYS) totals[key] += banked[key];

  const fresh: EmpireReading = {
    playerId,
    towns,
    lines,
    stage: lines.filter((line) => line.origin === 'stage'),
    empire,
    totals,
  };
  slate.empires.set(playerId, fresh);
  return fresh;
}
