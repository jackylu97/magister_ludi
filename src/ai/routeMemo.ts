/**
 * **Route searches kept for one seat's sitting**, and given back only when the
 * simulation would find the same answer again (bot batch BP13).
 *
 * The escort plan (`readEscortPlan`, `bot.ts`) is read again at each revision
 * of the board while the seat holds a settler, about once for each command.
 * BP12 measured it at about 5% of a late turn (seed 42, turns 110 to 112), and
 * seven tenths of that was route searches: `findPath`, `findPathToFirst` and
 * `pathTurns`. On the same turns 167 of 234 reads gave the same plan as the
 * read before them, because most commands move one of the seat's own pieces
 * and leave every route the plan asks about as it was.
 *
 * So the searches are kept, and a kept answer is given back only while every
 * input of the search is the same. The inputs, read from `pathfind.ts`:
 *
 *   1. **the searcher**: its id, owner, type and hex, and its movement profile
 *      (`moveProfile`, the object the search builds), which holds what the
 *      seat's cards, technologies and resources do to its steps. A count of
 *      turns (`pathTurns`) also reads its movement left;
 *   2. **every hex's owner, road and feature, every town, every piece of
 *      another seat, the pairs at war, the deals that open a border, and the
 *      turn** (`hexesMoved`, `townsAndStrangers`, `papersOf`): the walls, the
 *      zone of control, closed borders and the price of each step. When any of
 *      these moves, the memo is emptied;
 *   3. **who stands on the goal hexes**, because `canStopOn` counts the pieces
 *      on a goal against the stacking cap;
 *   4. **the seat's own pieces on a shore hex near the search**, for a mover
 *      that may take to the water: a step across a shore ends the march, and
 *      the search asks `canStopOn` of the hex it lands on (`landingCheck`).
 *
 * Nothing else that a search reads can change between two commands of one
 * sitting. The seat's own pieces add nothing to `transitField`'s walls
 * (`pieceBits` answers 0 for them) and nothing to `zocField`, so a piece of the
 * seat that moves changes a search only at a goal hex or at a landing hex. The
 * terrain does not change in a game.
 *
 * **What "near the search" means.** The search is A* with the heuristic
 * `wrappedDistance × floor`, where the floor is the mover's cheapest step
 * (`cheapestStepCostFor` in `pathfind.ts`: the cheapest step of the rules, or
 * the mover's road price when that is lower; nought under a free landing). No
 * step costs less than the floor, so every hex the search takes off its heap
 * before the goal has `cost so far + heuristic ≤ C`, where `C` is the cost of
 * the route it returns. Such a hex lies inside the ellipse `distance from the
 * start + distance to the goal ≤ C ÷ floor`. The search asks questions only of
 * those hexes and of their neighbours: who stands on a neighbour (a wall, a
 * landing), and whether a piece of another seat stands beside a step (the zone
 * of control). Those are all inside the ellipse widened by two, so a landing
 * further off cannot change the answer. One more hex is added for rounding.
 *
 *   - A landing on the shore is asked from a water hex taken off the heap. The
 *     search starts on land, so it paid at least the wade out
 *     (`shoreStepCost`) to reach any water hex, and those landings lie inside a
 *     smaller ellipse, `(C − wade) ÷ floor`.
 *   - On land a landing counts only pieces of the mover's own category
 *     (`hasStackingRoom`); on water it counts every piece (`hasEscortRoom`).
 *   - A search that found no route, one with a floor of nought, one that starts
 *     at sea, and a `findPathToFirst` that did not end on its first goal can
 *     have read every hex they could reach, so for them every shore piece of
 *     the seat counts.
 *   - A count of turns (`pathTurns`) asks nothing about who stands on the path,
 *     so it reads inputs 1 and 2 only.
 *
 * The pieces of other seats are in input 2, not read for each search: inside
 * one seat's sitting they move only when this seat's own blow kills or takes
 * one, and emptying the memo then costs less than checking every entry.
 *
 * **The two dropped attempts of BP12 differ in exactly this.** A plan kept
 * while a fingerprint of every unit stood was kept for 13 reads of 234, because
 * nearly every command moves a piece. Routes kept by piece, place, movement
 * left and goals changed play on seed 7, because a route also depends on the
 * pieces of other seats (one killed opens a road) and on the seat's own pieces
 * at the goal and at a landing. This memo keys on all of those, and on nothing
 * else.
 *
 * Naval movers are not kept (their ports are a fact about the towns); they are
 * asked straight through. `Map`s keyed by strings, and nothing iterates them:
 * the memo answers lookups and never decides an outcome (hard rule 2). The
 * routes it hands back are the arrays the search returned; callers read them
 * and never write to them.
 */

import { type GameMap, type Tile, getTileAt, mapRange, tileHex, tileIndex, wrappedDistance } from '../sim/map';
import type { Hex } from '../sim/hex';
import {
  type Cell,
  type MoveProfile,
  cheapestStepCost,
  findPath,
  findPathToFirst,
  moveProfile,
  pathTurns,
  shoreStepCost,
  snapMovement,
  stepCost,
  zocField,
} from '../sim/pathfind';
import type { GameState, Unit } from '../sim/state';
import { isWaterTerrain } from '../sim/terrainData';
import { unitDef } from '../sim/unitData';

/**
 * The part of the board a kept search can have read: everything, or the
 * ellipses round its two ends (see the module docblock).
 */
type Reach =
  | { all: true }
  | {
      all: false;
      from: Hex;
      to: Hex;
      /** The seat's own pieces on water. */
      water: number;
      /** The seat's own pieces of the mover's category on the shore's land. */
      land: number;
    };

/** One kept `findPath` or `findPathToFirst` answer, with what it was checked against. */
interface RouteEntry {
  /** Who stood on each goal hex. */
  goals: string;
  reach: Reach;
  /** The seat's shore pieces inside `reach` (`shoreNear`) when it was searched; '' for a mover that cannot take to the water. */
  pieces: string;
  route: Cell[] | null;
}

/** One of the seat's own pieces on a shore hex, read once for the revision. */
interface Placed {
  id: number;
  col: number;
  row: number;
  hex: Hex;
  water: boolean;
  category: string;
}

export interface RouteMemo {
  /** The seat whose sitting this is. */
  readonly playerId: number;
  /** Raised each time a read finds input 2 moved; two revisions with one epoch share it. */
  epoch: number;
  /** The revision the board was last read at, or -1. */
  revision: number;
  /** Every hex's owner, road and feature as last read, or `null`. */
  hexes: { owner: (number | null)[]; road: (number | undefined)[]; feature: string[] } | null;
  /** The towns and the other seats' pieces as last read (`townsAndStrangers`), and a second buffer the next read is written into. */
  towns: number[];
  spare: number[];
  /** The wars, the deals and the turn as last read (`papersOf`). */
  papers: string;
  /** Who stands on each hex, by tile index, for the revision. Built on first ask. */
  occupants: Map<number, string> | null;
  /** The seat's own pieces on a shore hex, for the revision. Built on first ask. */
  placed: Placed[] | null;
  /** `zocField` for the seat, for the revision. Built on first ask. */
  zoc: ReturnType<typeof zocField> | null;
  /** Each searcher's key and movement profile, by unit id, for the revision. */
  searchers: Map<number, { unit: Unit; found: { key: string; mover: MoveProfile } | null }>;
  routes: Map<string, RouteEntry>;
  turns: Map<string, number>;
}

/**
 * Searches asked through a memo in this process, and how many were answered
 * from one. For the measurement and the tests; nothing in a decision reads it.
 */
export const routeMemoTally = { asked: 0, kept: 0 };

/** A fresh memo for one seat. */
export function routeMemo(playerId: number): RouteMemo {
  return {
    playerId,
    epoch: 0,
    revision: -1,
    hexes: null,
    towns: [],
    spare: [],
    papers: '',
    occupants: null,
    placed: null,
    zoc: null,
    searchers: new Map(),
    routes: new Map(),
    turns: new Map(),
  };
}

/** Per map, 1 for a hex that is water or stands beside water. Terrain never changes. */
const SHORES = new WeakMap<GameMap, Uint8Array>();
function shoreHexes(map: GameMap): Uint8Array {
  let held = SHORES.get(map);
  if (held !== undefined) return held;
  held = new Uint8Array(map.tiles.length);
  for (const tile of map.tiles) {
    const near =
      isWaterTerrain(tile.terrain) || mapRange(map, tileHex(tile), 1).some((other) => isWaterTerrain(other.terrain));
    if (near) held[tileIndex(map, tile.col, tile.row)] = 1;
  }
  SHORES.set(map, held);
  return held;
}

/**
 * **Did any hex's owner, road or feature change since the last read?** Brings
 * the kept copy up to date as it compares.
 */
function hexesMoved(memo: RouteMemo, state: GameState): boolean {
  const { map } = state;
  const count = map.tiles.length;
  const held = memo.hexes;
  if (held === null || held.owner.length !== count) {
    memo.hexes = {
      owner: state.tileOwner.slice(0, count),
      road: map.tiles.map((tile) => tile.road),
      feature: map.tiles.map((tile) => tile.feature),
    };
    return true;
  }
  let moved = false;
  for (let index = 0; index < count; index++) {
    const tile = map.tiles[index]!;
    const owner = state.tileOwner[index] ?? null;
    if (held.owner[index] !== owner) {
      held.owner[index] = owner;
      moved = true;
    }
    if (held.road[index] !== tile.road) {
      held.road[index] = tile.road;
      moved = true;
    }
    if (held.feature[index] !== tile.feature) {
      held.feature[index] = tile.feature;
      moved = true;
    }
  }
  return moved;
}

/**
 * Every town (id, owner, column, row) and every piece of another seat (id,
 * owner, type, column, row), as numbers in a fixed order.
 */
function townsAndStrangers(state: GameState, playerId: number, out: number[]): number[] {
  out.length = 0;
  for (const city of state.cities) out.push(city.id, city.ownerId, city.col, city.row);
  out.push(-1);
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) out.push(unit.id, unit.ownerId, typeCode(unit.type), unit.col, unit.row);
  }
  return out;
}

/** Small numbers for unit types. Equality only. */
const TYPE_CODES = new Map<string, number>();
function typeCode(text: string): number {
  let held = TYPE_CODES.get(text);
  if (held === undefined) {
    held = TYPE_CODES.size;
    TYPE_CODES.set(text, held);
  }
  return held;
}

function sameNumbers(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index++) if (a[index] !== b[index]) return false;
  return true;
}

/**
 * **What a search reads of the wars and the deals**, as a key: which pairs are
 * at war (`atWar`, the zone of control, the walls of `pieceBits`, the closed
 * borders) and which live deals open a border (`bordersOpenTo`), with the turn
 * a deal's life is read against.
 */
function papersOf(state: GameState): string {
  let text = `${state.turn}|`;
  for (const war of state.wars) text += `${war.a}-${war.b};`;
  text += '|';
  for (const deal of state.deals) {
    if (deal.terms.a.openBorders !== true && deal.terms.b.openBorders !== true) continue;
    text += `${deal.a}-${deal.b}:${deal.terms.a.openBorders === true ? 1 : 0}${deal.terms.b.openBorders === true ? 1 : 0}@${deal.untilTurn};`;
  }
  return text;
}

/** Reads the board once for this revision, and empties the memo when input 2 moved. */
function refresh(memo: RouteMemo, state: GameState): void {
  if (memo.revision === state.revision) return;
  memo.revision = state.revision;
  memo.occupants = null;
  memo.placed = null;
  memo.zoc = null;
  memo.searchers.clear();
  const hexes = hexesMoved(memo, state);
  // Written into the spare buffer and swapped, so a read allocates nothing.
  const towns = townsAndStrangers(state, memo.playerId, memo.spare);
  const papers = papersOf(state);
  if (hexes || memo.towns.length === 0 || papers !== memo.papers || !sameNumbers(towns, memo.towns)) {
    memo.epoch += 1;
    memo.routes.clear();
    memo.turns.clear();
  }
  memo.spare = memo.towns;
  memo.towns = towns;
  memo.papers = papers;
}

/**
 * **The board's epoch at this revision**: the same number for two revisions
 * exactly when input 2 is the same at both (every hex's owner, road and
 * feature, every town, every piece of another seat, the pairs at war, the
 * deals that open a border and the turn). The escort plan's own key reads it
 * (`escortPlanInputs`, `bot.ts`).
 */
export function boardEpoch(memo: RouteMemo, state: GameState): number {
  refresh(memo, state);
  return memo.epoch;
}

/** Who stands on this hex now, every owner, in unit order. */
function standingOn(memo: RouteMemo, state: GameState, goal: Cell): string {
  if (memo.occupants === null) {
    const map = new Map<number, string>();
    for (const unit of state.units) {
      const at = tileIndex(state.map, unit.col, unit.row);
      map.set(at, `${map.get(at) ?? ''}${unit.id}:${unit.type};`);
    }
    memo.occupants = map;
  }
  return memo.occupants.get(tileIndex(state.map, goal.col, goal.row)) ?? '';
}

/** The seat's own pieces on a shore hex, for the revision. */
function placedPieces(memo: RouteMemo, state: GameState): Placed[] {
  if (memo.placed !== null) return memo.placed;
  const { map } = state;
  const shores = shoreHexes(map);
  const list: Placed[] = [];
  for (const unit of state.units) {
    if (unit.ownerId !== memo.playerId) continue;
    const tile = getTileAt(map, unit.col, unit.row);
    if (tile === undefined || shores[tileIndex(map, tile.col, tile.row)] !== 1) continue;
    list.push({
      id: unit.id,
      col: unit.col,
      row: unit.row,
      hex: tileHex(tile),
      water: isWaterTerrain(tile.terrain),
      category: unitDef(unit.type).category,
    });
  }
  memo.placed = list;
  return list;
}

/**
 * The seat's own shore pieces inside `reach` that a landing of a mover of
 * `category` counts, as a key: those on water inside `water`, and those of
 * the mover's own category on the shore's land inside `land`.
 */
function shoreNear(memo: RouteMemo, state: GameState, reach: Reach, category: string): string {
  let text = '';
  for (const piece of placedPieces(memo, state)) {
    if (!piece.water && piece.category !== category) continue;
    if (!reach.all) {
      const spread = wrappedDistance(state.map, reach.from, piece.hex) + wrappedDistance(state.map, piece.hex, reach.to);
      if (spread > (piece.water ? reach.water : reach.land)) continue;
    }
    text += `${piece.id}@${piece.col},${piece.row};`;
  }
  return text;
}

/** The search's floor: `cheapestStepCostFor` in `pathfind.ts`, the heuristic's own step. */
export function searchFloor(mover: MoveProfile): number {
  if (mover.freeLanding === true) return 0;
  return Math.min(cheapestStepCost, mover.roadStep ?? Number.POSITIVE_INFINITY);
}

/**
 * **What a successful search from the unit to `goal` can have read** (see the
 * module docblock): the ellipses of the route's own cost over the floor.
 */
function routeReach(
  memo: RouteMemo,
  state: GameState,
  unit: Unit,
  mover: MoveProfile,
  goal: Cell,
  route: readonly Cell[],
): Reach {
  const floor = searchFloor(mover);
  const start = getTileAt(state.map, unit.col, unit.row);
  const end = getTileAt(state.map, goal.col, goal.row);
  if (!(floor > 0) || start === undefined || end === undefined || isWaterTerrain(start.terrain)) return { all: true };
  memo.zoc ??= zocField(state, memo.playerId);
  let spent = 0;
  let from = start;
  for (const cell of route) {
    const to = getTileAt(state.map, cell.col, cell.row);
    if (to === undefined) return { all: true };
    const price = stepCost(state.map, from, to, mover, memo.zoc);
    if (price === null) return { all: true };
    spent = snapMovement(spent + price.cost);
    from = to;
  }
  return {
    all: false,
    from: tileHex(start),
    to: tileHex(end),
    water: spent / floor + 3,
    land: (spent - shoreStepCost(mover)) / floor + 4,
  };
}

/**
 * The searcher's part of a key (input 1) and its profile, or `null` for a
 * mover the memo does not keep (a ship).
 */
function searcherOf(memo: RouteMemo, state: GameState, unit: Unit): { key: string; mover: MoveProfile } | null {
  // A unit's place and profile cannot change inside one revision. The object is
  // compared too, so a copy of a unit (as `settlerReading` makes) is read afresh.
  const known = memo.searchers.get(unit.id);
  if (known !== undefined && known.unit === unit) return known.found;
  const mover = moveProfile(state, unit);
  const found = mover.naval
    ? null
    : {
        key:
          `${unit.id}|${unit.ownerId}|${unit.type}|${unit.col},${unit.row}|${mover.embarks ? 1 : 0}${mover.ocean ? 1 : 0}` +
          `${mover.full}|${mover.roadStep ?? ''}|${mover.freeLanding ? 1 : 0}${mover.ignoresZoc ? 1 : 0}` +
          `${mover.ignoresWoods ? 1 : 0}${mover.closed === undefined ? 0 : 1}`,
        mover,
      };
  memo.searchers.set(unit.id, { unit, found });
  return found;
}

/**
 * **The unit's movement profile**, read once for each revision (bot batch
 * BP13): `moveProfile`, kept beside the search keys so a caller that asks
 * `canStopOn` of several hexes for one unit passes the same profile the
 * function would build. With no memo it is `moveProfile` itself.
 */
export function moverOf(memo: RouteMemo | null, state: GameState, unit: Unit): MoveProfile {
  if (memo === null || unit.ownerId !== memo.playerId) return moveProfile(state, unit);
  refresh(memo, state);
  return searcherOf(memo, state, unit)?.mover ?? moveProfile(state, unit);
}

function cellKey(cells: readonly Cell[]): string {
  let text = '';
  for (const cell of cells) text += `${cell.col},${cell.row};`;
  return text;
}

/** Is this kept route still the search's answer? */
function routeHolds(
  memo: RouteMemo,
  state: GameState,
  unit: Unit,
  mover: MoveProfile,
  held: RouteEntry | undefined,
  goals: string,
): held is RouteEntry {
  if (held === undefined || held.goals !== goals) return false;
  return !mover.embarks || shoreNear(memo, state, held.reach, unitDef(unit.type).category) === held.pieces;
}

function routeEntry(
  memo: RouteMemo,
  state: GameState,
  unit: Unit,
  mover: MoveProfile,
  goals: string,
  reach: Reach,
  route: Cell[] | null,
): RouteEntry {
  const pieces = mover.embarks ? shoreNear(memo, state, reach, unitDef(unit.type).category) : '';
  return { goals, reach, pieces, route };
}

/** `findPath(state, unit, goal)`, answered from the memo when nothing it reads has moved. */
export function memoPath(memo: RouteMemo | null, state: GameState, unit: Unit, goal: Tile): Cell[] | null {
  if (memo === null || unit.ownerId !== memo.playerId) return findPath(state, unit, goal);
  routeMemoTally.asked += 1;
  refresh(memo, state);
  const who = searcherOf(memo, state, unit);
  if (who === null) return findPath(state, unit, goal);
  const key = `p|${who.key}|${goal.col},${goal.row}`;
  const goals = standingOn(memo, state, goal);
  const held = memo.routes.get(key);
  if (routeHolds(memo, state, unit, who.mover, held, goals)) {
    routeMemoTally.kept += 1;
    return held.route;
  }
  const route = findPath(state, unit, goal);
  const reach: Reach = route === null ? { all: true } : routeReach(memo, state, unit, who.mover, goal, route);
  memo.routes.set(key, routeEntry(memo, state, unit, who.mover, goals, reach, route));
  return route;
}

/**
 * `findPathToFirst(state, unit, goals)`, answered from the memo when nothing it
 * reads has moved. A route that ends on the first goal is also the answer
 * `findPath` gives for that goal: the same search (`searchPath`), with the
 * same mover on the same board, so it is kept under that key too.
 */
export function memoPathToFirst(
  memo: RouteMemo | null,
  state: GameState,
  unit: Unit,
  goals: readonly Tile[],
): Cell[] | null {
  if (memo === null || unit.ownerId !== memo.playerId) return findPathToFirst(state, unit, goals);
  routeMemoTally.asked += 1;
  refresh(memo, state);
  const who = searcherOf(memo, state, unit);
  if (who === null) return findPathToFirst(state, unit, goals);
  const key = `f|${who.key}|${cellKey(goals)}`;
  let standing = '';
  for (const goal of goals) standing += `${standingOn(memo, state, goal)}/`;
  const held = memo.routes.get(key);
  if (routeHolds(memo, state, unit, who.mover, held, standing)) {
    routeMemoTally.kept += 1;
    return held.route;
  }
  const route = findPathToFirst(state, unit, goals);
  const first = goals[0];
  const last = route === null ? undefined : route[route.length - 1];
  // Only a search that ended on its first goal ran once; any other answer came
  // after a search that read every hex it could reach.
  const single =
    route !== null && first !== undefined && last !== undefined && last.col === first.col && last.row === first.row;
  const reach: Reach = single ? routeReach(memo, state, unit, who.mover, first, route) : { all: true };
  memo.routes.set(key, routeEntry(memo, state, unit, who.mover, standing, reach, route));
  if (single) {
    memo.routes.set(
      `p|${who.key}|${first.col},${first.row}`,
      routeEntry(memo, state, unit, who.mover, standingOn(memo, state, first), reach, route),
    );
  }
  return route;
}

/**
 * `pathTurns(state, unit, path)` with the unit's own purse, answered from the
 * memo when nothing it reads has moved: the unit, its profile and movement
 * left, and inputs 2 (the steps of the path and the zone of control beside
 * them). It asks nothing about who stands on the path.
 */
export function memoTurns(memo: RouteMemo | null, state: GameState, unit: Unit, path: readonly Cell[]): number {
  if (memo === null || unit.ownerId !== memo.playerId) return pathTurns(state, unit, path);
  routeMemoTally.asked += 1;
  refresh(memo, state);
  const who = searcherOf(memo, state, unit);
  if (who === null) return pathTurns(state, unit, path);
  const key = `t|${who.key}|${unit.movesLeft}|${cellKey(path)}`;
  const held = memo.turns.get(key);
  if (held !== undefined) {
    routeMemoTally.kept += 1;
    return held;
  }
  const turns = pathTurns(state, unit, path);
  memo.turns.set(key, turns);
  return turns;
}
