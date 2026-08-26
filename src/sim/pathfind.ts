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
 * And since Entry XXV it is a property of the destination, the mover *and the
 * tile the step is taken from*: a step that slides along an enemy's zone of
 * control completes and then takes everything the mover had left. That is the
 * one thing a price cannot be asked of a lone tile, which is why `stepCost` —
 * `from`, `to`, mover, board — is now THE evaluator and `tileMoveCost` is the
 * ground's own half of it.
 *
 * Because `rules.movement.minStepCost` floors every step at a positive number,
 * there are no zero-cost edges, which is what lets both searches settle a node
 * the first time they pop it. A zone-of-control lock keeps that guarantee: it
 * moves the running total to the *end of the current turn*, which is always
 * strictly beyond where the step started from.
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
import { type UnitDef, isCombatant, unitDef } from './unitData';
import { fullMovement, hasForeignUnit, hasStackingRoom } from './units';

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

// --- zone of control --------------------------------------------------------

/**
 * The enemy pieces whose zone of control binds one mover, resolved once.
 *
 * A field rather than a query because the rule is asked per *edge* — tens of
 * thousands of times inside one sweep — while its answer changes only when
 * somebody moves. `sources` is every hex an enemy projects from, deduplicated
 * by tile (two raiders sharing a hex are one place, and a garrison standing in
 * its own city is the same); `adjacent` is the fast reject, one byte per tile
 * index, so an edge nowhere near an enemy costs a single array read.
 */
export interface ZocField {
  /** Hexes an enemy combat unit or an enemy city projects control from. */
  readonly sources: readonly Tile[];
  /** Per tile index: 1 when at least one source stands one hex away. */
  readonly adjacent: Uint8Array;
}

/**
 * Who exerts a zone of control against `ownerId`, as of right now.
 *
 * Three clauses, and they are the whole rule:
 *
 *   - **Any other owner's** piece. There is no diplomacy yet, so foreign is
 *     hostile — the same reading `hasForeignUnit` already gives transit, and it
 *     is what makes the wild bind an empire without a barbarian special case.
 *   - **Combat units only.** A settler does not hold a line; `isCombatant` is
 *     the same predicate that decides who may be attacked and who is captured,
 *     so a civilian exerts nothing here for the reason it defends nothing there.
 *     Ranged and melee are alike: a hex within reach of an archer is a hex you
 *     do not stroll along, and `ignoresTerrainCost` is about the *ground*, so a
 *     scout is bound exactly as a swordsman is.
 *   - **Enemy cities.** A town is a garrison that cannot be killed by a march,
 *     and Civ V's rule is that it holds ground like one.
 */
export function zocField(state: GameState, ownerId: number): ZocField {
  const { map } = state;
  const sources: Tile[] = [];
  const seen = new Set<number>();
  const project = (col: number, row: number): void => {
    const tile = getTileAt(map, col, row);
    if (!tile) return;
    const index = tileIndex(map, tile.col, tile.row);
    if (seen.has(index)) return;
    seen.add(index);
    sources.push(tile);
  };

  // Arrays, never the `Set` — the sweep order is what makes two runs agree.
  for (const unit of state.units) {
    if (unit.ownerId === ownerId) continue;
    if (!isCombatant(unitDef(unit.type))) continue;
    project(unit.col, unit.row);
  }
  for (const city of state.cities) {
    if (city.ownerId === ownerId) continue;
    project(city.col, city.row);
  }

  if (sources.length === 0) return { sources, adjacent: new Uint8Array(0) };
  const adjacent = new Uint8Array(map.tiles.length);
  for (const source of sources) {
    for (const hex of mapNeighbors(map, tileHex(source))) {
      const tile = getTile(map, hex);
      if (tile) adjacent[tileIndex(map, tile.col, tile.row)] = 1;
    }
  }
  return { sources, adjacent };
}

/**
 * THE zone-of-control rule: does stepping `from` → `to` end the mover's turn?
 *
 * Civ V's rule exactly, and the "same piece" clause is the whole of it: leaving
 * one enemy's shadow for another's is a march, not a slide, and only a step that
 * stays alongside **the same** source is bound. So walking *into* contact is
 * free, walking *out* of it is free, and walking *around* a picket is what
 * costs — which is what makes a line of spearmen a line rather than a set of
 * six-hex tolls.
 *
 * The step still happens. A lock is a price, never a wall; `to` was already
 * cleared by `canTransit`, so an enemy-held hex was never on the table.
 */
export function zocLocks(map: GameMap, field: ZocField, from: Tile, to: Tile): boolean {
  if (field.sources.length === 0) return false;
  if (field.adjacent[tileIndex(map, from.col, from.row)] !== 1) return false;
  if (field.adjacent[tileIndex(map, to.col, to.row)] !== 1) return false;
  const fromHex = tileHex(from);
  const toHex = tileHex(to);
  for (const source of field.sources) {
    const hex = tileHex(source);
    if (wrappedDistance(map, fromHex, hex) !== 1) continue;
    if (wrappedDistance(map, toHex, hex) === 1) return true;
  }
  return false;
}

/**
 * Is this unit standing in an enemy's zone of control right now?
 *
 * The interface's question, not the searches' — it is what the unit sheet says
 * out loud so a player is not left to discover the rule by losing a turn to it.
 * A unit in contact may still march away for nothing; what it may not do is
 * sidestep along the line.
 */
export function inZoneOfControl(state: GameState, unit: Unit): boolean {
  const field = zocField(state, unit.ownerId);
  if (field.sources.length === 0) return false;
  const here = getTileAt(state.map, unit.col, unit.row);
  if (!here) return false;
  return field.adjacent[tileIndex(state.map, here.col, here.row)] === 1;
}

// --- the purse --------------------------------------------------------------

/**
 * What a mover may still spend before its turn ends, and what it gets back
 * after.
 *
 * A zone-of-control lock costs "everything you have left", which is a fact about
 * the *turn* rather than about the step — so the moment the rule went into the
 * evaluator, the evaluator's callers had to be able to say where a turn ends.
 * Two numbers are enough: this turn is short by whatever has already been spent,
 * every later one is a full allowance.
 *
 * `refill` is `fullMovement`, so a card that pays movement pays it here too —
 * there is still exactly one place a movement allowance is decided.
 */
export interface MovePurse {
  /** Points left in the turn a walk or a search starts in. */
  left: number;
  /** The allowance every later turn refills to. Never zero — `fullMovement` floors at 1. */
  refill: number;
}

/** The purse `unit` is spending from as things stand. */
export function movePurse(state: GameState, unit: Unit): MovePurse {
  return { left: Math.max(0, unit.movesLeft), refill: fullMovement(unit, state) };
}

/**
 * The running total at which the turn containing `spent` ends.
 *
 * Strictly greater than `spent` for every input, which is the property both
 * searches lean on: a locked step lands here, so it is never a zero-cost edge
 * and never walks a total backwards. A unit with nothing left (`left === 0`)
 * is already at a boundary, so its next turn's boundary is one full allowance
 * on — a lock next turn costs that whole turn, which is the rule.
 */
export function turnBoundary(spent: number, purse: MovePurse): number {
  if (spent < purse.left) return purse.left;
  return purse.left + purse.refill * (Math.floor((spent - purse.left) / purse.refill) + 1);
}

// --- the step evaluator -----------------------------------------------------

/** What one step off a tile costs, and whether it ends the turn on arrival. */
export interface StepPrice {
  /** Movement points the destination's ground asks. See `tileMoveCost`. */
  cost: number;
  /** True when the step slides along an enemy's zone of control. */
  locked: boolean;
}

/**
 * THE step evaluator: the price of moving `from` → `to`, or `null` when nothing
 * can walk on `to` at all.
 *
 * Four readers and they must never drift: `findPath`, `reachableTiles`,
 * `advanceAlongPath` (the walk the reducer actually commits) and `pathTurns`
 * (the interface's "~N turns"). Everything about a step's price is decided here
 * — the ground, the mover's abilities, and the zone of control — so a highlight
 * cannot promise a march the walk will not deliver.
 *
 * `def` and `field` are passed in rather than derived, because both are facts
 * about the whole sweep and re-deriving them per edge would be the same lookup
 * a few thousand times. Every caller hoists them; see `zocField`.
 */
export function stepCost(
  map: GameMap,
  from: Tile,
  to: Tile,
  def: UnitDef | undefined,
  field: ZocField,
): StepPrice | null {
  const cost = tileMoveCost(to, def);
  if (cost === null) return null;
  return { cost, locked: zocLocks(map, field, from, to) };
}

/**
 * The running total after paying `price` from a total of `spent`.
 *
 * The lock's arithmetic in one line, and it is deliberately *not* "the greater
 * of the ground's price and the boundary": a step that ends the turn ends it,
 * and the overspend a short purse would have forgiven is forgiven here too. So
 * after a lock the total sits exactly on a turn boundary, which is what lets
 * `reachableTiles` stop expanding there without a second rule about it.
 */
export function stepArrival(spent: number, price: StepPrice, purse: MovePurse): number {
  return price.locked ? turnBoundary(spent, purse) : spent + price.cost;
}

/**
 * How many more turns of marching `path` costs `unit`, as an estimate.
 *
 * The fourth reader of `stepCost`, and it lives here rather than in the panel
 * that prints it for the reason the other three are here: an estimate quoted by
 * arithmetic of its own is an estimate that disagrees with the march the turn
 * change will walk — and the zone of control is exactly the sort of rule a
 * hand-rolled copy would have missed.
 *
 * An estimate rather than a promise (hence the `~` where it is printed): the
 * board can change under a stored order, and the reducer re-decides all of it at
 * the time. An impassable waypoint stops the count rather than inventing a
 * number — that order is about to be abandoned, not about to take forever.
 *
 * The answer is *turn changes until arrival*, so it is never zero: a standing
 * order is resolved at the turn change and not before, and a column that gets
 * there on this turn's remaining points is still one turn away. Each refill it
 * needs on top of that is one more — which is where a zone of control shows up
 * in a number a player can read, since a slide along a picket empties the purse
 * and the next hex has to wait for the refill.
 */
export function pathTurns(state: GameState, unit: Unit, path: readonly Cell[]): number {
  const { map } = state;
  const def = unitDef(unit.type);
  const purse = movePurse(state, unit);
  const field = zocField(state, unit.ownerId);
  let from = getTileAt(map, unit.col, unit.row);
  let turns = 0;
  let budget = purse.left;
  for (const cell of path) {
    if (budget <= 0) {
      turns += 1;
      budget = purse.refill;
    }
    const to = getTileAt(map, cell.col, cell.row);
    if (!from || !to) break;
    const price = stepCost(map, from, to, def, field);
    if (price === null) break;
    budget = price.locked ? 0 : Math.max(0, budget - price.cost);
    from = to;
  }
  return turns + 1;
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
  // The two other facts about the whole search, hoisted for `def`'s reason: who
  // holds ground against this mover, and where its turns end. See `stepCost`.
  const field = zocField(state, unit.ownerId);
  const purse = movePurse(state, unit);
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
      const price = stepCost(map, tile, neighbor, def, field);
      if (price === null) continue;

      // A locked step lands on the end of the turn it was taken in, which is
      // always strictly further along than where it started — so the heuristic
      // stays admissible (no edge is cheaper than `minStep`) and a node still
      // settles the first time it is popped.
      const candidate = stepArrival(best[current]!, price, purse);
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
 *
 * A zone-of-control lock rides that same clause. It lands the total exactly on
 * the allowance, so the tile is highlighted — the step does happen — and nothing
 * past it is, which is the rule drawn on the board rather than explained in a
 * tooltip.
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
  const field = zocField(state, unit.ownerId);
  // A single turn's purse, so `turnBoundary` inside the sweep is always
  // `budget`: a locked step lands exactly on the allowance and the frontier's
  // own "arriving with nothing left ends the move" clause stops it there. That
  // is why nothing here needs a second rule about the zone of control.
  const purse = movePurse(state, unit);
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
      const price = stepCost(map, tile, neighbor, def, field);
      if (price === null) continue;

      const candidate = stepArrival(cost, price, purse);
      if (candidate >= best[index]!) continue;
      best[index] = candidate;
      open.push(index, candidate);
    }
  }

  results.sort((a, b) => tileIndex(map, a.tile.col, a.tile.row) - tileIndex(map, b.tile.col, b.tile.row));
  return results;
}
