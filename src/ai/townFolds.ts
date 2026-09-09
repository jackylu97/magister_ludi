/**
 * **What every town of this empire makes, what it would make with one more
 * shelf, and how long it would take to raise one** — the one reading three arms
 * of the bot share, folded once per seat per revision.
 *
 * It was `wants.ts`' private helper (batch X3, where the purchasing plan and the
 * faith book stopped pricing the same shelf two different ways). Batch X1d moves
 * it down to a leaf, because a third arm now asks the same question and asking it
 * from `chain.ts` would have made the chain stand on the book that stands on it.
 *
 * The ruling that put it here is the user's of 2026-09-09 (`docs/flags.md` item
 * (ggg)): *"the value of a library is contingent on the city that builds it: a
 * city in your capital with high population is worth a lot of science, and is
 * built faster than a middling city."* A chain's building step is no longer a
 * row's flat bag times a town count at a middling town's build rate — it is one
 * **copy per town**, each priced by that town's own hypothetical fold and landing
 * at that town's own build time. Which is exactly the pair of readings the two
 * banks were already taking, so the three arms take them once between them.
 *
 * **Three memos, three different lifetimes, and each is written down.**
 *
 *   · the **standing** fold is a fact about a town every row compares against, so
 *     it is taken once a town when the reading is built;
 *   · the **hypothetical** fold is a fact about a pair — this town, that row —
 *     and is memoised on first ask rather than pre-computed, because an arm asks
 *     for a handful of the pairs and computing the whole grid would be forty town
 *     folds to choose one purchase;
 *   · the **build turns** are the simulation's own `turnsToBuild`, asked at the
 *     back of the queue (nothing banked counts toward a row that is not at the
 *     front) and memoised the same way.
 *
 * **The reading itself is remembered on `(state, revision, seat)`**, which is the
 * one thing that is new here. `wants.ts` built a fresh one per `wantBook` and
 * that was enough while the book was the only caller; with the chains asking too,
 * a sitting would otherwise fold the same town against the same row once for the
 * book, once for the engines it is executing and once for every goal on the
 * beeline's table. The key is the revision because that is this simulation's
 * statement that the world moved (`GameState.revision`, batch E2): the same seat
 * asking twice at the same revision is asking about a board that has not changed,
 * and a writer that moves the board moves the revision with it.
 *
 * It is deliberately **not** a tenant of `readings.ts`' slate. The slate is the
 * simulation's published readings, keyed the same way and swept by the same rule;
 * this is the bot's own what-if grid, it reads nothing a surface prints, and the
 * third verb (`readX`) belongs to that file alone (`test/sim/verbs.test.ts`).
 * What it borrows is the key, which is the part that has to agree.
 *
 * A `Map` keyed by the pair, and nothing iterates it: the memo answers lookups
 * and never decides an outcome, which is what hard rule 2 asks of a Map.
 */

import { type BuildingId } from '../sim/buildingData';
import { type CityYields, turnsToBuild } from '../sim/cities';
import { readCity, readEmpirePercents } from '../sim/readings';
import type { City, GameState, Player } from '../sim/state';
import { type CityReading, explainCity, foldCity } from '../sim/yields/town';

/** Every town of one empire, as it stands and as it would stand with one row. */
export interface TownFolds {
  /** This empire's towns, in founding order. Every caller walks this array. */
  towns: readonly City[];
  /** What the town at this index makes today. */
  standing: (index: number) => CityYields;
  /** What it would make with one more of this row standing in it. */
  with: (index: number, id: BuildingId) => CityYields;
  /**
   * Turns this town would take to raise this row from an empty basket, or `null`
   * when it never would — the simulation's own `turnsToBuild`, asked at the back
   * of the queue so nothing already banked is credited to a row that is not at
   * the front of it.
   */
  turns: (index: number, id: BuildingId) => number | null;
}

/** The reading, and the board it was taken on. See the module docblock. */
interface Held {
  revision: number;
  playerId: number;
  folds: TownFolds;
}

const FOLD_MEMO = new WeakMap<GameState, Held>();

export function townFolds(state: GameState, player: Player): TownFolds {
  const held = FOLD_MEMO.get(state);
  if (held !== undefined && held.revision === state.revision && held.playerId === player.id) {
    return held.folds;
  }
  const folds = buildTownFolds(state, player);
  FOLD_MEMO.set(state, { revision: state.revision, playerId: player.id, folds });
  return folds;
}

function buildTownFolds(state: GameState, player: Player): TownFolds {
  const towns: City[] = [];
  for (const city of state.cities) {
    if (city.ownerId === player.id) towns.push(city);
  }
  // The empire's half of the percentages is the same reading for every town, so
  // it is taken once for the whole sitting and handed to every quote — batch E2's
  // bargain kept at the level every caller shares.
  const empire = readEmpirePercents(state, player.id);
  const quotes: (CityReading | undefined)[] = new Array(towns.length);
  const quoteOf = (index: number): CityReading => {
    const found = quotes[index];
    if (found !== undefined) return found;
    const fresh = readCity(state, towns[index]!);
    quotes[index] = fresh;
    return fresh;
  };
  // **Every reading below is lazy**, and that is a measured decision rather than
  // a style. The board's revision moves on every accepted command, so a grid is
  // rebuilt several times inside one seat's turn; a rebuild that folded all its
  // towns up front paid for the whole empire to answer one question about one
  // town, and the eight-seed probe read it as sixteen seconds of a hundred-turn
  // game. Built lazily a rebuild costs an array, and only the pairs somebody asks
  // for are ever folded.
  const bases: (CityYields | undefined)[] = new Array(towns.length);
  const hypothetical = new Map<string, CityYields>();
  const raises = new Map<string, number | null>();
  return {
    towns,
    standing: (index) => {
      const found = bases[index];
      if (found !== undefined) return found;
      const fresh = foldCity(state, towns[index]!, [], null, quoteOf(index));
      bases[index] = fresh;
      return fresh;
    },
    with: (index, id) => {
      const key = `${index}:${id}`;
      const found = hypothetical.get(key);
      if (found !== undefined) return found;
      const city = towns[index]!;
      const fold = foldCity(state, city, [id], null, explainCity(state, city, [id], empire));
      hypothetical.set(key, fold);
      return fold;
    },
    turns: (index, id) => {
      const key = `${index}:${id}`;
      const found = raises.get(key);
      if (found !== undefined || raises.has(key)) return found ?? null;
      const city = towns[index]!;
      const answer = turnsToBuild(state, city, { kind: 'building', id }, city.queue.length, quoteOf(index));
      raises.set(key, answer);
      return answer;
    },
  };
}

/** Where this town stands in the reading, or `-1`. Identity, as the walk built it. */
export function townIndexOf(folds: TownFolds, city: City): number {
  for (let index = 0; index < folds.towns.length; index++) {
    if (folds.towns[index]!.id === city.id) return index;
  }
  return -1;
}
