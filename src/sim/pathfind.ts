/**
 * Movement queries over the wrapped board: A* for "how do I get there?" and
 * Dijkstra for "where can I get to?".
 *
 * Both are pure reads. They answer questions about the world as it stands; the
 * answers are executed by `movement.ts` and only ever committed by the reducer.
 *
 * Cost model
 * ----------
 * Edge cost is a property of the *destination* tile, never of the edge: entering
 * a forest costs 2 no matter which side you came from. `tileMoveCost` is the one
 * implementation, and `findPath`, `reachableTiles` and the executor all call it,
 * so a highlight can never disagree with what the move actually spends.
 *
 * It is a property of the destination *and of the mover*: a unit whose row
 * carries `ignoresTerrainCost` pays the floor for every hex it can enter at all.
 * That second term went into the evaluator rather than beside its three callers
 * for exactly the reason the first one is there — a reachable set computed by
 * one rule and walked by another is a promise the board breaks.
 *
 * Because `rules.movement.minStepCost` floors every step at a positive number,
 * there are no zero-cost edges, which is what lets both searches settle a node
 * the first time they pop it.
 *
 * Blocking
 * --------
 * See `units.ts`: a friendly unit blocks *stopping* only, an enemy unit blocks
 * *transit* as well. So the frontier expands through friendly tiles but never
 * reports them as destinations, and `reachableTiles` never highlights a tile the
 * unit could not legally end its move on.
 *
 * Determinism
 * -----------
 * The open set is a binary heap ordered by `(f, tileIndex)` — a total order on
 * distinct nodes, so the result never depends on insertion order, heap
 * implementation details, or the order neighbours happen to come back in. Two
 * routes of exactly equal cost always resolve to the same one, which is what the
 * replay guarantee needs: the same command log must produce the same path.
 *
 * Neighbours come from `mapNeighbors`, so every step is wrap-aware and a path
 * may cross the east–west seam whenever that is shorter.
 */

import { type GameMap, type Tile, getTile, getTileAt, mapNeighbors, tileHex, tileIndex, wrappedDistance } from './map';
import { RULES } from './rulesData';
import type { GameState, Unit } from './state';
import { moveCost } from './terrainData';
import { type UnitDef, unitDef } from './unitData';
import { hasForeignUnit, hasStackingRoom } from './units';

/** An offset cell. The wire/serialisation form of a position. */
export interface Cell {
  col: number;
  row: number;
}

/** A tile a unit can reach this turn, with what getting there costs. */
export interface ReachableTile {
  tile: Tile;
  /** Total movement points spent walking from the unit's tile to this one. */
  cost: number;
}

/**
 * Movement points for `def` to enter this tile, or `null` if nothing can walk on
 * it.
 *
 * THE movement-cost evaluator, and the reason it takes a *unit definition*
 * rather than only a tile: `ignoresTerrainCost` (`unitData.ts`) is a rule about
 * the price of a step, so it belongs where the price is decided and nowhere
 * else. All three readers go through here — `findPath`, `reachableTiles` and
 * `advanceAlongPath` — which is what stops a highlight promising a march the
 * walk will not deliver.
 *
 * `def` is optional and its absence means *the ground's own price*, asked by the
 * two callers that are not about a particular unit: `isPassable`, which wants
 * only the `null`, and the interface's route estimate for a unit it has not been
 * handed. The flag is read strictly *after* impassability, so no ability makes a
 * mountain walkable — see `UnitDef.ignoresTerrainCost`.
 *
 * The floor is `rules.movement.minStepCost` rather than a literal 1, so the
 * ability costs whatever the game says a step costs at minimum, and the "no
 * zero-cost edges" guarantee both searches settle on holds for a scout too.
 */
export function tileMoveCost(tile: Tile, def?: UnitDef): number | null {
  const ground = moveCost(tile.terrain, tile.feature, tile.hills);
  if (ground === null) return null;
  return def?.ignoresTerrainCost ? RULES.movement.minStepCost : ground;
}

/** True when land units can enter the tile at all, ignoring who is standing on it. */
export function isPassable(tile: Tile): boolean {
  return tileMoveCost(tile) !== null;
}

/**
 * May `unit` move *through* this tile? Passable terrain with no foreign unit on
 * it. Friendly units are walked past, not around.
 */
export function canTransit(state: GameState, unit: Unit, tile: Tile): boolean {
  if (!isPassable(tile)) return false;
  return !hasForeignUnit(state, tile.col, tile.row, unit.ownerId);
}

/**
 * May `unit` end its move on this tile? Everything `canTransit` wants, plus room
 * under the stacking cap for the unit's own category. The unit is excluded from
 * its own count, so "may I stay here?" is always true.
 */
export function canStopOn(state: GameState, unit: Unit, tile: Tile): boolean {
  if (!canTransit(state, unit, tile)) return false;
  const { category } = unitDef(unit.type);
  return hasStackingRoom(state, tile.col, tile.row, category, unit.id);
}

// --- open set ---------------------------------------------------------------

/**
 * Binary min-heap keyed by `(priority, index)`.
 *
 * The tile index is part of the key, not a tiebreak bolted on afterwards, which
 * makes the ordering a total order over distinct tiles and the search's output a
 * pure function of its input. See the module docblock.
 */
class TileHeap {
  private readonly priorities: number[] = [];
  private readonly indices: number[] = [];

  get size(): number {
    return this.indices.length;
  }

  private less(a: number, b: number): boolean {
    const pa = this.priorities[a]!;
    const pb = this.priorities[b]!;
    if (pa !== pb) return pa < pb;
    return this.indices[a]! < this.indices[b]!;
  }

  private swap(a: number, b: number): void {
    const p = this.priorities[a]!;
    this.priorities[a] = this.priorities[b]!;
    this.priorities[b] = p;
    const i = this.indices[a]!;
    this.indices[a] = this.indices[b]!;
    this.indices[b] = i;
  }

  push(index: number, priority: number): void {
    this.priorities.push(priority);
    this.indices.push(index);
    let child = this.indices.length - 1;
    while (child > 0) {
      const parent = (child - 1) >> 1;
      if (!this.less(child, parent)) break;
      this.swap(child, parent);
      child = parent;
    }
  }

  pop(): number {
    const top = this.indices[0]!;
    const lastPriority = this.priorities.pop()!;
    const lastIndex = this.indices.pop()!;
    if (this.indices.length > 0) {
      this.priorities[0] = lastPriority;
      this.indices[0] = lastIndex;
      let parent = 0;
      for (;;) {
        const left = parent * 2 + 1;
        const right = left + 1;
        let smallest = parent;
        if (left < this.indices.length && this.less(left, smallest)) smallest = left;
        if (right < this.indices.length && this.less(right, smallest)) smallest = right;
        if (smallest === parent) break;
        this.swap(parent, smallest);
        parent = smallest;
      }
    }
    return top;
  }
}

// --- A* ---------------------------------------------------------------------

/** Every neighbour tile of `tile`, wrap-aware, in `HEX_DIRECTIONS` order. */
function neighborsOf(map: GameMap, tile: Tile): Tile[] {
  const result: Tile[] = [];
  for (const hex of mapNeighbors(map, tileHex(tile))) {
    const neighbor = getTile(map, hex);
    if (neighbor) result.push(neighbor);
  }
  return result;
}

/**
 * The cheapest route from `unit`'s tile to `goal`, as the offset cells to step
 * onto in order — the start tile is *not* included, the goal always is.
 *
 * Returns `null` when no route exists, when the goal is where the unit already
 * stands, or when the goal is not somewhere the unit could legally stop.
 *
 * The heuristic is `wrappedDistance × minStepCost`: at most one step's minimum
 * cost per remaining hex, therefore never an overestimate, therefore optimal.
 */
export function findPath(state: GameState, unit: Unit, goal: Tile): Cell[] | null {
  const { map } = state;
  const start = getTileAt(map, unit.col, unit.row);
  if (!start) return null;

  const startIndex = tileIndex(map, start.col, start.row);
  const goalIndex = tileIndex(map, goal.col, goal.row);
  if (startIndex === goalIndex) return null;
  if (!canStopOn(state, unit, goal)) return null;

  const goalHex = tileHex(goal);
  // Resolved once: the mover's row is a fact about the whole search, and asking
  // the table per neighbour would be the same lookup a few thousand times.
  const def = unitDef(unit.type);
  const minStep = RULES.movement.minStepCost;
  const heuristic = (tile: Tile): number => wrappedDistance(map, tileHex(tile), goalHex) * minStep;

  const count = map.tiles.length;
  const best = new Float64Array(count).fill(Infinity);
  const cameFrom = new Int32Array(count).fill(-1);
  const settled = new Uint8Array(count);

  best[startIndex] = 0;
  const open = new TileHeap();
  open.push(startIndex, heuristic(start));

  while (open.size > 0) {
    const current = open.pop();
    if (settled[current] === 1) continue;
    settled[current] = 1;
    if (current === goalIndex) break;

    const tile = map.tiles[current]!;
    for (const neighbor of neighborsOf(map, tile)) {
      const index = tileIndex(map, neighbor.col, neighbor.row);
      if (settled[index] === 1) continue;
      // Transit is all an intermediate tile needs, so a path may thread between
      // friendly units. The goal was already checked with the stricter
      // `canStopOn`, which implies this.
      if (!canTransit(state, unit, neighbor)) continue;
      const step = tileMoveCost(neighbor, def);
      if (step === null) continue;

      const candidate = best[current]! + step;
      if (candidate >= best[index]!) continue;
      best[index] = candidate;
      cameFrom[index] = current;
      open.push(index, candidate + heuristic(neighbor));
    }
  }

  if (settled[goalIndex] !== 1) return null;

  const reversed: Cell[] = [];
  for (let at = goalIndex; at !== startIndex; at = cameFrom[at]!) {
    const tile = map.tiles[at]!;
    reversed.push({ col: tile.col, row: tile.row });
  }
  reversed.reverse();
  return reversed;
}

// --- reachability -----------------------------------------------------------

/**
 * Every tile `unit` could legally end this turn on, with the cost of getting
 * there. Ordered by tile index so the result is stable.
 *
 * The frontier stops expanding at a node once the unit would arrive there with
 * no movement left, but such a node is still *reported*: entering a tile always
 * succeeds while any movement remains, even when the tile costs more than that
 * (see `movement.ts`). That is exactly what the executor does, so the highlight
 * and the move can never disagree.
 */
export function reachableTiles(state: GameState, unit: Unit): ReachableTile[] {
  const { map } = state;
  const results: ReachableTile[] = [];
  const start = getTileAt(map, unit.col, unit.row);
  if (!start || unit.movesLeft <= 0) return results;

  const budget = unit.movesLeft;
  // `findPath`'s reason: one table lookup for the whole sweep, and the same
  // definition the executor will spend the points with.
  const def = unitDef(unit.type);
  const count = map.tiles.length;
  const best = new Float64Array(count).fill(Infinity);
  const settled = new Uint8Array(count);
  const startIndex = tileIndex(map, start.col, start.row);

  best[startIndex] = 0;
  const open = new TileHeap();
  open.push(startIndex, 0);

  while (open.size > 0) {
    const current = open.pop();
    if (settled[current] === 1) continue;
    settled[current] = 1;

    const cost = best[current]!;
    if (current !== startIndex) {
      const tile = map.tiles[current]!;
      if (canStopOn(state, unit, tile)) results.push({ tile, cost });
    }
    // Arriving with nothing left ends the move: no step can follow.
    if (cost >= budget) continue;

    const tile = map.tiles[current]!;
    for (const neighbor of neighborsOf(map, tile)) {
      const index = tileIndex(map, neighbor.col, neighbor.row);
      if (settled[index] === 1) continue;
      if (!canTransit(state, unit, neighbor)) continue;
      const step = tileMoveCost(neighbor, def);
      if (step === null) continue;

      const candidate = cost + step;
      if (candidate >= best[index]!) continue;
      best[index] = candidate;
      open.push(index, candidate);
    }
  }

  results.sort((a, b) => tileIndex(map, a.tile.col, a.tile.row) - tileIndex(map, b.tile.col, b.tile.row));
  return results;
}
