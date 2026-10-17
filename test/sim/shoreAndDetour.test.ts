/**
 * **Units stuck on water, and routing round a blocking unit** (`docs/flags.md`
 * (xxxxxx), ruled 2026-10-17). One describe block per part of the ruling:
 *
 *   1. **A landing ends the march, so it is planned only where the piece may
 *      stop.** A step from land onto water, or from water onto land, spends the
 *      whole allowance. `findPath` used to plan it onto any hex the piece could
 *      pass through, a full town included, and the walk then waited at the
 *      water's edge for good.
 *   2. **The bot keeps its land pieces off the water.** It steps a garrison out
 *      of a town only onto land, and a land piece with nothing to do on the
 *      water comes ashore rather than digging in there.
 *   3. **A march that must rest on a blocked hex goes round it.** If there is
 *      no way round, it waits, as before.
 *
 * Every board here is arranged by hand on a blank map (`aiWar.test.ts`'
 * bench), because each claim is about one step on one board.
 */

import { describe, expect, it } from 'vitest';

import { nextBotDecision } from '../../src/ai/bot';
import { stepAsideFor } from '../../src/ai/wants';
import { foundCityAt } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { type BotDecision } from '../../src/ai/decision';
import { snapshotState } from '../../src/sim/game';
import { type GameMap, type Tile, createMap, getTile, getTileAt, tileHex } from '../../src/sim/map';
import { advanceAlongPath } from '../../src/sim/movement';
import {
  type Cell,
  canStopOn,
  endsTheMarch,
  findPath,
  findPathAround,
  isShoreStep,
  moveProfile,
  stepCost,
  zocField,
} from '../../src/sim/pathfind';
import { type GameState, type Unit, bumpRevision, createUnit, playerById } from '../../src/sim/state';
import { ABILITY_TECH } from '../../src/sim/techData';
import { isWaterTerrain } from '../../src/sim/terrainData';
import { resetVisibility, recomputeAllVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

/** A blank board of one terrain with two seats, nobody on it. */
function bench(terrain: 'grassland' | 'coast' | 'lake', width = 16, height = 12): GameState {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
    ],
  });
  state.map = createMap({ width, height, terrain });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** The hex `steps` hexes from `tile` along the axial q axis. */
function along(map: GameMap, tile: Tile, steps: number): Tile {
  const hex = tileHex(tile);
  const found = getTile(map, { q: hex.q + steps, r: hex.r });
  if (!found) throw new Error('off the map');
  return found;
}

/** This seat may put civilians and soldiers on the water (Sailing and Wayfinding). */
function canEmbark(state: GameState, playerId: number): void {
  const player = playerById(state, playerId)!;
  for (const ability of ['embark', 'militaryEmbark'] as const) {
    const tech = ABILITY_TECH.get(ability)!;
    if (!player.techsResearched.includes(tech)) player.techsResearched.push(tech);
  }
  bumpRevision(state);
}

const cell = (place: { col: number; row: number }): Cell => ({ col: place.col, row: place.row });
const same = (a: Cell, b: Cell): boolean => a.col === b.col && a.row === b.row;

/**
 * A sea with a short line of land in it, west to east: `A`, `G`, `B`. The
 * worker starts on the water `W`, just west of `A`, and is sent to `G`. The
 * cheap way is to land on `A` and walk on. A worker of the same seat stands on
 * `A`, so the landing is a hex it may pass through but not rest on.
 */
function landingBoard(sea: 'coast' | 'lake' = 'coast'): {
  state: GameState;
  worker: Unit;
  a: Tile;
  g: Tile;
  b: Tile;
  w: Tile;
} {
  const state = bench(sea);
  const g = at(state.map, 8, 6);
  const a = along(state.map, g, -1);
  const b = along(state.map, g, 1);
  const w = along(state.map, g, -2);
  for (const tile of [a, g, b]) tile.terrain = 'grassland';
  canEmbark(state, 0);
  const worker = createUnit(state, 0, 'worker', w.col, w.row);
  createUnit(state, 0, 'worker', a.col, a.row);
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, worker, a, g, b, w };
}

/** Every landing on `path` that ends the march, with whether the walker may rest there. */
function landings(state: GameState, unit: Unit, path: readonly Cell[]): { at: Cell; mayRest: boolean }[] {
  const mover = moveProfile(state, unit);
  const field = zocField(state, unit.ownerId);
  const out: { at: Cell; mayRest: boolean }[] = [];
  let from = at(state.map, unit.col, unit.row);
  for (const step of path) {
    const to = at(state.map, step.col, step.row);
    const price = stepCost(state.map, from, to, mover, field)!;
    if (endsTheMarch(from, to, mover, price)) out.push({ at: step, mayRest: canStopOn(state, unit, to) });
    from = to;
  }
  return out;
}

// --- 1. a landing is planned only where the piece may stop --------------------

describe('a landing ends the march, so it is planned only where the piece may stop', () => {
  it('says a shore step that spends the whole allowance ends the march, and a free landing does not', () => {
    const { state, worker, a, w } = landingBoard();
    const mover = moveProfile(state, worker);
    const field = zocField(state, worker.ownerId);
    const price = stepCost(state.map, w, a, mover, field)!;
    expect(isShoreStep(w, a, mover)).toBe(true);
    expect(price.cost).toBe(mover.full);
    expect(endsTheMarch(w, a, mover, price)).toBe(true);
    // Admiralty lands the men for nothing: the landing costs nothing and the
    // march goes on, so the rule does not ask where it lands.
    const free = { ...mover, freeLanding: true as const };
    const freePrice = stepCost(state.map, w, a, free, field)!;
    expect(freePrice.cost).toBe(0);
    expect(endsTheMarch(w, a, free, freePrice)).toBe(false);
    // A step along the water is no shore step.
    const sea = along(state.map, w, -1);
    expect(endsTheMarch(sea, w, mover, stepCost(state.map, sea, w, mover, field)!)).toBe(false);
  });

  it('never plans the landing onto a hex the piece may pass but not rest on', () => {
    const { state, worker, a, g } = landingBoard();
    // The friend on `A` leaves the worker no room to rest there.
    expect(canStopOn(state, worker, a)).toBe(false);
    const path = findPath(state, worker, g)!;
    expect(path).not.toBeNull();
    // Before the ruling the route was `A, G`: land on the friend and walk on.
    expect(same(path[0]!, cell(a))).toBe(false);
    for (const landing of landings(state, worker, path)) {
      expect(landing.mayRest, `lands on (${landing.at.col}, ${landing.at.row})`).toBe(true);
    }
    expect(same(path[path.length - 1]!, cell(g))).toBe(true);
  });

  it('plans the cheap landing again once the hex is free', () => {
    const { state, worker, a, g } = landingBoard();
    state.units = state.units.filter((unit) => !(unit.col === a.col && unit.row === a.row));
    bumpRevision(state);
    const path = findPath(state, worker, g)!;
    expect(path.map((step) => `${step.col},${step.row}`)).toEqual([`${a.col},${a.row}`, `${g.col},${g.row}`]);
  });

  it('treats a lake exactly as the coast', () => {
    // The lake fix (`docs/flags.md` (wwwwww)) made a lake embarkable water, so
    // the same board on a lake must plan and walk the same way.
    for (const sea of ['coast', 'lake'] as const) {
      const { state, worker, a, g, w } = landingBoard(sea);
      const mover = moveProfile(state, worker);
      const field = zocField(state, worker.ownerId);
      expect(isWaterTerrain(w.terrain), sea).toBe(true);
      // Off the water onto land, and back onto the water: both end the march.
      expect(endsTheMarch(w, a, mover, stepCost(state.map, w, a, mover, field)!), sea).toBe(true);
      expect(endsTheMarch(a, w, mover, stepCost(state.map, a, w, mover, field)!), sea).toBe(true);
      const path = findPath(state, worker, g)!;
      expect(path, sea).not.toBeNull();
      expect(same(path[0]!, cell(a)), sea).toBe(false);
      for (const landing of landings(state, worker, path)) expect(landing.mayRest, sea).toBe(true);
      expect(applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: worker.id, target: cell(g) }).ok, sea).toBe(true);
      expect(same(cell(worker), cell(w)), sea).toBe(false);
    }
    // And the two boards walk the same route: a lake is the coast, hex for hex.
    const routes = (['coast', 'lake'] as const).map((sea) => {
      const { state, worker, g } = landingBoard(sea);
      return findPath(state, worker, g);
    });
    expect(routes[1]).toEqual(routes[0]);
  });

  it('sets the worker moving on the first turn, where it used to wait at the shore for good', () => {
    const { state, worker, w, g } = landingBoard();
    const result = applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: worker.id, target: cell(g) });
    expect(result.ok).toBe(true);
    expect(same(cell(worker), cell(w))).toBe(false);
    // And it rests where it may.
    expect(canStopOn(state, worker, at(state.map, worker.col, worker.row))).toBe(true);
  });
});

// --- 2. the bot keeps its land pieces off the water ----------------------------

/** The seat's decisions, applied until one is an order to this piece (`aiWar.test.ts`). */
function orderFor(state: GameState, playerId: number, unitId: number, budget = 12): BotDecision | null {
  for (let guard = 0; guard < budget; guard++) {
    const decision = nextBotDecision(state, playerId);
    if (decision === null) return null;
    if ((decision.command as { unitId?: number }).unitId === unitId) return decision;
    if (!applyCommand(state, decision.command).ok) return null;
  }
  return null;
}

/**
 * A town on a spit of land whose other land neighbours are all mountains, with
 * a warrior standing in it. The only hexes beside it a piece could stand on are
 * the water, and this seat may put soldiers on the water.
 */
function hemmedTown(): { state: GameState; city: ReturnType<typeof foundCityAt>; warrior: Unit } {
  const state = bench('grassland');
  const city = foundCityAt(state, 0, at(state.map, 6, 6));
  const centre = at(state.map, city.col, city.row);
  const ring = [-1, 1].map((step) => along(state.map, centre, step));
  for (const tile of ring) tile.terrain = 'coast';
  for (const hex of [
    { q: 0, r: -1 },
    { q: 0, r: 1 },
    { q: 1, r: -1 },
    { q: -1, r: 1 },
  ]) {
    const base = tileHex(centre);
    getTile(state.map, { q: base.q + hex.q, r: base.r + hex.r })!.terrain = 'mountain';
  }
  canEmbark(state, 0);
  playerById(state, 0)!.gold = 500;
  const warrior = createUnit(state, 0, 'warrior', city.col, city.row);
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, city, warrior };
}

describe('the bot keeps its land pieces off the water', () => {
  it('never steps a garrison out of a town onto the water to make room', () => {
    const { state, city, warrior } = hemmedTown();
    // The water beside the town is a hex the warrior may rest on…
    const water = along(state.map, at(state.map, city.col, city.row), 1);
    expect(isWaterTerrain(water.terrain)).toBe(true);
    expect(canStopOn(state, warrior, water)).toBe(true);
    // …but the step aside is never taken onto it. Before the ruling it was,
    // and the bot then left the warrior dug in at sea.
    const step = stepAsideFor(state, playerById(state, 0)!, city, { kind: 'unit', id: 'warrior' }, 'gold');
    expect(step).toBeNull();
  });

  it('steps aside onto land when there is any', () => {
    const { state, city } = hemmedTown();
    const centre = at(state.map, city.col, city.row);
    const base = tileHex(centre);
    const land = getTile(state.map, { q: base.q, r: base.r - 1 })!;
    land.terrain = 'grassland';
    bumpRevision(state);
    const step = stepAsideFor(state, playerById(state, 0)!, city, { kind: 'unit', id: 'warrior' }, 'gold');
    expect(step).not.toBeNull();
    expect(isWaterTerrain(at(state.map, step!.col, step!.row).terrain)).toBe(false);
  });

  /**
   * A warrior standing on the coast beside a shore: the sea is the board's
   * west, and land runs east from column six. With `town`, the seat holds a
   * garrisoned town on the shore and the warrior stands on that town's own
   * water, the ground the heal arm asks about.
   */
  function wading(options: { hp?: number; town?: boolean } = {}): { state: GameState; warrior: Unit } {
    const state = bench('grassland');
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < state.map.height; row++) at(state.map, col, row).terrain = 'coast';
    }
    canEmbark(state, 0);
    let stand = at(state.map, 5, 6);
    if (options.town === true) {
      const city = foundCityAt(state, 0, at(state.map, 6, 6));
      createUnit(state, 0, 'warrior', city.col, city.row);
      stand = along(state.map, at(state.map, city.col, city.row), -1);
      stand.terrain = 'coast';
    }
    const warrior = createUnit(state, 0, 'warrior', stand.col, stand.row);
    if (options.hp !== undefined) warrior.hp = options.hp;
    recomputeAllVisibility(state);
    bumpRevision(state);
    return { state, warrior };
  }

  it('brings an idle soldier ashore instead of digging it in on the water', () => {
    const { state, warrior } = wading();
    expect(isWaterTerrain(at(state.map, warrior.col, warrior.row).terrain)).toBe(true);
    const decision = orderFor(state, 0, warrior.id)!;
    expect(decision).not.toBeNull();
    expect(decision.command.type).toBe('moveUnit');
    const target = (decision.command as { target: Cell }).target;
    expect(isWaterTerrain(at(state.map, target.col, target.row).terrain)).toBe(false);
    expect(decision.summary).toMatch(/comes ashore/);
    expect(applyCommand(state, decision.command).ok).toBe(true);
    expect(isWaterTerrain(at(state.map, warrior.col, warrior.row).terrain)).toBe(false);
  });

  it('never digs a hurt soldier in to mend on its own water', () => {
    const { state, warrior } = wading({ hp: 30, town: true });
    // The hex is this seat's own ground, so before the ruling the heal arm dug
    // the warrior in where it stood.
    expect(state.tileOwner[warrior.row * state.map.width + warrior.col]).not.toBeNull();
    const decision = orderFor(state, 0, warrior.id)!;
    expect(decision).not.toBeNull();
    expect(decision.command.type).not.toBe('fortify');
  });
});

// --- 3. a march that must rest on a blocked hex goes round it --------------------

/**
 * Grassland. A warrior with two points stands on `P` and holds an order whose
 * first hex `X` is a forest, which costs both points, so the warrior would
 * rest there. Another warrior of the same seat stands on `X`.
 */
function jamBoard(): { state: GameState; warrior: Unit; x: Tile; goal: Tile; route: Cell[] } {
  const state = bench('grassland');
  const p = at(state.map, 4, 6);
  const x = along(state.map, p, 1);
  const y = along(state.map, p, 2);
  const goal = along(state.map, p, 3);
  // Hills everywhere off the line, so the straight route through `X` is the
  // cheapest one (four points) and every way round costs more.
  const line = [p, x, y, goal];
  for (const tile of state.map.tiles) {
    if (!line.some((one) => one.col === tile.col && one.row === tile.row)) tile.hills = true;
  }
  x.feature = 'forest';
  const warrior = createUnit(state, 0, 'warrior', p.col, p.row);
  createUnit(state, 0, 'warrior', x.col, x.row);
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, warrior, x, goal, route: [cell(x), cell(y), cell(goal)] };
}

describe('a march that must rest on a blocked hex goes round it', () => {
  it('walks a way round the friend in the forest, and keeps the goal', () => {
    const { state, warrior, x, goal, route } = jamBoard();
    const start = cell(warrior);
    warrior.path = route.map((step) => ({ ...step }));
    const walk = advanceAlongPath(state, warrior, warrior.path);
    // Before the ruling the warrior waited at `P` and kept `X, Y, G`.
    expect(same(cell(warrior), start)).toBe(false);
    expect(walk.rerouted).toBe(true);
    expect(walk.walked.length).toBeGreaterThan(0);
    expect(walk.walked.some((step) => same(step, cell(x)))).toBe(false);
    // The order left on the unit is the detour's remainder, to the same goal.
    const order = warrior.path ?? [];
    if (order.length > 0) expect(same(order[order.length - 1]!, cell(goal))).toBe(true);
    else expect(same(cell(warrior), cell(goal))).toBe(true);
  });

  it('plans the detour round every hex it was told to avoid', () => {
    const { state, warrior, x, goal } = jamBoard();
    const index = state.map.width * x.row + x.col;
    const detour = findPathAround(state, warrior, goal, [index])!;
    expect(detour).not.toBeNull();
    expect(detour.some((step) => same(step, cell(x)))).toBe(false);
    expect(same(detour[detour.length - 1]!, cell(goal))).toBe(true);
  });

  it('waits, keeping its order, when the blocked hex is the goal itself', () => {
    const { state, warrior, x } = jamBoard();
    warrior.path = [cell(x)];
    const start = cell(warrior);
    const walk = advanceAlongPath(state, warrior, warrior.path);
    expect(same(cell(warrior), start)).toBe(true);
    expect(walk.rerouted).toBe(false);
    expect(warrior.path).toEqual([cell(x)]);
  });

  it('waits, keeping its order, when there is no way round', () => {
    // A corridor one hex wide: mountains on every other hex.
    const { state, warrior, x, route } = jamBoard();
    for (const tile of state.map.tiles) {
      if (route.some((step) => same(step, cell(tile)))) continue;
      if (same(cell(tile), cell(warrior))) continue;
      tile.terrain = 'mountain';
    }
    bumpRevision(state);
    const start = cell(warrior);
    warrior.path = route.map((step) => ({ ...step }));
    const walk = advanceAlongPath(state, warrior, warrior.path);
    expect(same(cell(warrior), start)).toBe(true);
    expect(walk.rerouted).toBe(false);
    expect(warrior.path).toEqual(route);
    expect(canStopOn(state, warrior, x)).toBe(false);
  });

  it('goes round on land only, when the piece and its route are on land', () => {
    // A line of land in a sea: `P`, `X`, `Y`, `G`. The only way round `X` is by
    // water, which this seat may take, and a land route does not go round by
    // sea: two landings cost two whole turns.
    const state = bench('coast');
    const p = at(state.map, 4, 6);
    const x = along(state.map, p, 1);
    const y = along(state.map, p, 2);
    const goal = along(state.map, p, 3);
    for (const tile of [p, x, y, goal]) tile.terrain = 'grassland';
    x.feature = 'forest';
    canEmbark(state, 0);
    const warrior = createUnit(state, 0, 'warrior', p.col, p.row);
    createUnit(state, 0, 'warrior', x.col, x.row);
    recomputeAllVisibility(state);
    bumpRevision(state);
    // The sea way round exists…
    const index = state.map.width * x.row + x.col;
    const bySea = findPathAround(state, warrior, goal, [index]);
    expect(bySea).not.toBeNull();
    expect(bySea!.some((step) => isWaterTerrain(at(state.map, step.col, step.row).terrain))).toBe(true);
    // …and the walk does not take it: it waits, keeping its order.
    const route = [cell(x), cell(y), cell(goal)];
    warrior.path = route.map((step) => ({ ...step }));
    const walk = advanceAlongPath(state, warrior, warrior.path);
    expect(same(cell(warrior), cell(p))).toBe(true);
    expect(walk.rerouted).toBe(false);
    expect(warrior.path).toEqual(route);
  });

  it('reports the cells a standing order walked round the jam on the turn it resolved', () => {
    const { state, warrior, route } = jamBoard();
    warrior.path = route.map((step) => ({ ...step }));
    expect(applyCommand(state, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
    const result = applyCommand(state, { type: 'endTurn', playerId: 1 });
    expect(result.ok).toBe(true);
    const reroute = result.ok ? result.reroutes?.find((report) => report.unitId === warrior.id) : undefined;
    expect(reroute).toBeDefined();
    expect(reroute!.walked.length).toBeGreaterThan(0);
    const last = reroute!.walked[reroute!.walked.length - 1]!;
    expect(same(last, cell(warrior))).toBe(true);
  });

  it('reports a fresh march that went round, and walks the same way twice', () => {
    const run = (): { snapshot: string; walked: Cell[] | undefined } => {
      const { state, warrior, goal } = jamBoard();
      const result = applyCommand(state, { type: 'moveUnit', playerId: 0, unitId: warrior.id, target: cell(goal) });
      expect(result.ok).toBe(true);
      const walked = result.ok ? result.reroutes?.find((report) => report.unitId === warrior.id)?.walked : undefined;
      return { snapshot: snapshotState(state), walked };
    };
    const first = run();
    const second = run();
    expect(first.walked).toBeDefined();
    expect(first.walked!.length).toBeGreaterThan(0);
    expect(second.snapshot).toBe(first.snapshot);
    expect(second.walked).toEqual(first.walked);
  });
});
