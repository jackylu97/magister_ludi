import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4 } from 'three';

import { BoardGeometry, buildBoard } from '../../src/render3d/board3d';
import { FogView, accountedInstances } from '../../src/render3d/fog3d';
import { ImprovementLayer, clearsClutter } from '../../src/render3d/improvements3d';
import {
  type SuppressScope,
  INSTANCE_WRITES,
  SUPPRESS,
  resetInstanceWrites,
} from '../../src/render3d/instances';
import { VIEW3D } from '../../src/render3d/lookData';
import { MaterialLibrary } from '../../src/render3d/toon';
import { foundingErrorAt } from '../../src/sim/cities';
import { IMPROVEMENT_IDS } from '../../src/sim/improvementData';
import { improvementError, improvementErrorAt } from '../../src/sim/improvements';
import type { Command } from '../../src/sim/commands';
import {
  type Game,
  createGame,
  dispatch,
  replay,
  restoreState,
  snapshotState,
} from '../../src/sim/game';
import { generateMap } from '../../src/sim/mapgen';
import {
  type GameMap,
  type Tile,
  getTileAt,
  tileHex,
  tileIndex,
  wrappedDistance,
} from '../../src/sim/map';
import { isPassable } from '../../src/sim/pathfind';
import { RULES } from '../../src/sim/rulesData';
import type { GameState } from '../../src/sim/state';
import { type UnitTypeId, unitDef } from '../../src/sim/unitData';
import {
  HIDDEN,
  maxSightArea,
  maxSightRadius,
  recomputeVisibility,
  visibilityAt,
} from '../../src/sim/visibility';

/**
 * The stress harness: a big, legal, seeded empire, and the cost of running it.
 *
 * It ships with fog of war on purpose (design-notes, Sequencing snapshot): the
 * whole point of the M8 hard perf constraint is that fog cost is pinned by CI
 * *from birth* rather than discovered as a stutter three milestones later. So
 * every claim the fog makes is asserted here at a scale nothing else in the
 * suite reaches — around three hundred units and forty cities on a standard map.
 *
 * How to read the assertions
 * --------------------------
 * **Operation counts first.** How many tiles a recompute touched, how many
 * instance writes a repaint issued, how many tiles a delta named: these are
 * properties of the algorithm and they are the same on a laptop and on a loaded
 * CI box, so they are asserted tightly.
 *
 * **Wall clock second, and generously.** Every timing bound below is roughly an
 * order of magnitude above what the machine this was written on actually does —
 * the numbers are in the comments beside them. They are there to catch a change
 * that makes something *quadratic*, not to police a few milliseconds. A timing
 * assertion tuned tight is a test that fails on somebody else's Tuesday.
 *
 * The fixture is built out of ordinary commands through `dispatch`, so the log
 * it produces is a real save file — which is what makes the replay assertion at
 * the bottom the strongest determinism test in the suite: same config, same log,
 * byte-identical state, at a scale where any Map-order or floating-point sin
 * would have somewhere to hide.
 */

const TARGET_CITIES = 40;
const TARGET_UNITS = 300;
const SEATS = 4;
/** How many workers the M7 wave puts to work in a single turn window. */
const WORKER_WAVE = 40;

/** The unit types the fixture garrisons with, cycled. Cheap, legal, no gates. */
const ROSTER: readonly UnitTypeId[] = ['warrior', 'scout', 'archer', 'spearman', 'settler'];

interface Fixture {
  game: Game;
  cityCount: number;
  unitCount: number;
  buildMs: number;
}

/**
 * Builds the scenario: forty cities founded legally and spaced, three hundred
 * units spawned legally, four seats, one seeded standard map.
 *
 * Everything goes through `dispatch`, never through `createUnit` or
 * `foundCityAt` — so every piece on this board is one the reducer accepted, and
 * the log replays. Sites are chosen by walking `map.tiles` in index order and
 * taking the first that the *reducer's own* `foundingErrorAt` allows, which
 * makes the whole fixture a pure function of the seed.
 */
function buildFixture(seed = 8_1508): Fixture {
  const started = performance.now();
  const game = createGame({
    seed,
    sizeName: 'standard',
    players: [
      { name: 'Crimson', color: '#b35843', isHuman: true },
      { name: 'Verdigris', color: '#477f7e' },
      { name: 'Lapis', color: '#3f639f' },
      { name: 'Gilt', color: '#c08a2b' },
    ],
  });
  const { state } = game;
  const spacing = Math.max(RULES.cities.minCitySpacing, 4);

  // --- cities -------------------------------------------------------------
  const sites: Tile[] = [];
  let seat = 0;
  for (const tile of state.map.tiles) {
    if (sites.length >= TARGET_CITIES) break;
    if (!isPassable(tile)) continue;
    // Spaced by more than the rule demands, so a city's opening ring never lands
    // inside a neighbour's territory and turns a later founding into a refusal.
    let tooClose = false;
    for (const site of sites) {
      if (wrappedDistance(state.map, tileHex(site), tileHex(tile)) < spacing) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;
    const ownerId = seat % SEATS;
    if (foundingErrorAt(state, ownerId, tile) !== null) continue;

    const spawn: Command = {
      type: 'spawnUnit',
      playerId: ownerId,
      ownerId,
      unitType: 'settler',
      at: { col: tile.col, row: tile.row },
    };
    if (!dispatch(game, spawn).ok) continue;
    const settler = state.units[state.units.length - 1]!;
    const found: Command = { type: 'foundCity', playerId: ownerId, settlerUnitId: settler.id };
    if (!dispatch(game, found).ok) continue;
    sites.push(tile);
    seat += 1;
  }

  // --- units --------------------------------------------------------------
  let placed = 0;
  let kind = 0;
  for (const tile of state.map.tiles) {
    if (state.units.length >= TARGET_UNITS) break;
    if (!isPassable(tile)) continue;
    const ownerId = placed % SEATS;
    const unitType = ROSTER[kind % ROSTER.length]!;
    const spawn: Command = {
      type: 'spawnUnit',
      playerId: ownerId,
      ownerId,
      unitType,
      at: { col: tile.col, row: tile.row },
    };
    // Stacking refuses a second unit of a category on one tile, which is exactly
    // the rule that makes this scatter rather than pile up. A refusal is fine
    // and is not logged; the next tile takes it.
    if (!dispatch(game, spawn).ok) continue;
    placed += 1;
    kind += 1;
  }

  return {
    game,
    cityCount: state.cities.length,
    unitCount: state.units.length,
    buildMs: performance.now() - started,
  };
}

/**
 * The furthest passable tile from the fixture's own crowd.
 *
 * The units are placed by walking `map.tiles` in index order, so they cluster in
 * the north of the map and everything past them is Terra Incognita. Marching a
 * unit *there* is what makes the move assertions below say something: inside the
 * crowd every disc overlaps three others, so a one-hex step changes nothing at
 * all and a test written against it would pass for the wrong reason.
 */
function unexploredTile(state: GameState): Tile {
  // Clear of the poles, so the disc it lights is a whole one: rows do not wrap,
  // and a corner tile would make the bound below look tighter than it is.
  const margin = maxSightRadius();
  for (let index = state.map.tiles.length - 1; index >= 0; index--) {
    const tile = state.map.tiles[index]!;
    if (tile.row < margin || tile.row >= state.map.height - margin) continue;
    if (!isPassable(tile)) continue;
    if (visibilityAt(state, 0, tile.col, tile.row) !== HIDDEN) continue;
    return tile;
  }
  throw new Error('stress: the whole map is charted; the fixture is wrong');
}

/** How many tiles a seat can currently see. */
function watched(state: GameState, playerId: number): number {
  let count = 0;
  const grid = state.visibility[playerId] ?? [];
  for (const level of grid) if (level === 2) count += 1;
  return count;
}

// One fixture, built once: it is deterministic, and building it four times would
// be four times the wall clock for no extra coverage.
const fixture = buildFixture();
const { game } = fixture;

/**
 * A private, mutable copy of the fixture's state for the tests that poke it.
 *
 * The visibility and board sections below move a unit by hand — reaching past
 * the reducer, which nothing in the *game* may do (CLAUDE.md, hard rule 1) but
 * which is the only way to ask "what does exactly one move cost" without a
 * turn's worth of other things happening in the same breath.
 *
 * It has to be a copy, and finding that out was the point of writing the replay
 * assertion at the bottom. Poking the live state left a *city sighting* behind:
 * the hand-marched unit walked past a town, the seat remembered it, the unit
 * walked back, and the memory — correctly — stayed. So the state no longer
 * matched its own log, and the determinism test caught it. Exactly the class of
 * bug the harness exists for; it simply found one in the harness first.
 */
const probe = restoreState(snapshotState(game.state));

describe('the stress scenario', () => {
  it('stands up a real empire out of nothing but accepted commands', () => {
    // Reported rather than merely asserted: these are the numbers every bound
    // below is relative to.
    console.log(
      `[stress] ${fixture.cityCount} cities, ${fixture.unitCount} units, ` +
        `${game.state.map.tiles.length} tiles, ${game.log.length} commands, ` +
        `built in ${fixture.buildMs.toFixed(0)}ms`,
    );
    expect(fixture.cityCount).toBeGreaterThanOrEqual(TARGET_CITIES - 2);
    expect(fixture.unitCount).toBeGreaterThanOrEqual(TARGET_UNITS - 5);
    expect(game.state.players).toHaveLength(SEATS);
    // Every seat holds something, so every seat's fog is a real workload.
    for (const player of game.state.players) {
      expect(watched(game.state, player.id)).toBeGreaterThan(0);
    }
  });

  it('gives every seat a grid the size of the board', () => {
    for (const grid of game.state.visibility) {
      expect(grid).toHaveLength(game.state.map.tiles.length);
    }
  });

  it('keeps the fog a small fraction of a full state dump', () => {
    // Reported because the milestone asked the question: is a plain integer per
    // tile per player too big to serialise? The answer is no, by an order of
    // magnitude — the *map* dominates a snapshot, and a save file does not even
    // carry the map (it carries a seed and a log).
    const whole = snapshotState(game.state).length;
    const fog = JSON.stringify(game.state.visibility).length;
    const memory = JSON.stringify(game.state.citySightings).length;
    console.log(
      `[stress] snapshot ${(whole / 1024).toFixed(0)}kB · visibility ` +
        `${(fog / 1024).toFixed(0)}kB (${((100 * fog) / whole).toFixed(1)}%) · ` +
        `citySightings ${(memory / 1024).toFixed(1)}kB`,
    );
    expect(fog / whole).toBeLessThan(0.25);
  });
});

// --- visibility -------------------------------------------------------------

describe('visibility at scale', () => {
  it('bounds one unit move to its own neighbourhood, not to the map', () => {
    const state = probe;
    const mover = state.units.find((unit) => unit.ownerId === 0)!;
    // Settle first, so the delta measured below is this move's and nothing else.
    recomputeVisibility(state, 0);

    const from = { col: mover.col, row: mover.row };
    const to = unexploredTile(state);
    mover.col = to.col;
    mover.row = to.row;
    const delta = recomputeVisibility(state, 0);

    // THE incrementality assertion, at the simulation level: a move changes what
    // one unit could see, never a board. Two whole discs is the honest ceiling —
    // everything it stopped seeing plus everything it started seeing — and it
    // holds for a march right across the map, not only for a single step.
    expect(delta.became.length).toBeGreaterThan(0);
    expect(delta.became.length).toBeLessThanOrEqual(2 * maxSightArea());
    expect(delta.became.length).toBeLessThan(state.map.tiles.length / 20);
    console.log(
      `[stress] one move (${from.col},${from.row} → ${to.col},${to.row}): ` +
        `delta ${delta.became.length} tiles, ${delta.sources} sources, ` +
        `${delta.touched} tiles touched (disc bound ${delta.sources * maxSightArea()})`,
    );

    // And every tile it named is inside one of the two discs: a delta that
    // reached anywhere else would be a recompute that had lost track of who was
    // lighting what.
    const reach = maxSightRadius();
    const origin = tileHex(getTileAt(state.map, from.col, from.row)!);
    const arrival = tileHex(to);
    for (const change of delta.became) {
      const at = tileHex(getTileAt(state.map, change.col, change.row)!);
      const near =
        wrappedDistance(state.map, origin, at) <= reach ||
        wrappedDistance(state.map, arrival, at) <= reach;
      expect(near, `(${change.col}, ${change.row}) is not next to either end`).toBe(true);
      expect(visibilityAt(state, 0, change.col, change.row)).toBe(change.level);
    }

    mover.col = from.col;
    mover.row = from.row;
    recomputeVisibility(state, 0);
  });

  it('bounds the work of a recompute by sources × the widest disc', () => {
    const state = probe;
    const delta = recomputeVisibility(state, 0);
    expect(delta.sources).toBeGreaterThan(0);
    // The operation-count claim, stated exactly as the model does: a flood per
    // eye, each capped by the largest disc anything in the roster can light.
    // (Owned territory adds a claim-radius sweep per city on top, which is why
    // the bound is stated against sources rather than against `touched` alone.)
    const cities = state.cities.filter((city) => city.ownerId === 0).length;
    const claim = 3 * RULES.cities.claimRadius * (RULES.cities.claimRadius + 1) + 1;
    expect(delta.touched).toBeLessThanOrEqual(delta.sources * maxSightArea() + cities * claim);
  });

  it('recomputes a whole large empire well inside a frame', () => {
    const state = probe;
    const biggest = state.players
      .map((player) => ({
        id: player.id,
        units: state.units.filter((unit) => unit.ownerId === player.id).length,
      }))
      .sort((a, b) => b.units - a.units)[0]!;

    const runs = 20;
    const started = performance.now();
    for (let i = 0; i < runs; i++) recomputeVisibility(state, biggest.id);
    const each = (performance.now() - started) / runs;
    console.log(
      `[stress] full recompute for a ${biggest.units}-unit seat: ${each.toFixed(2)}ms`,
    );
    // Generous by roughly two orders of magnitude; the measured figure is in the
    // log line above. This catches "somebody made it quadratic", nothing finer.
    expect(each).toBeLessThan(60);
  });
});

// --- the board --------------------------------------------------------------

describe('the board at scale', () => {
  const geometry = new BoardGeometry();
  const materials = new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);

  const started = performance.now();
  const board = buildBoard(probe.map, geometry, materials, false);
  const boardMs = performance.now() - started;

  const fog = new FogView(probe.map, board.tiles);
  const chartStarted = performance.now();
  fog.buildChart(geometry, materials, null);
  const chartMs = performance.now() - chartStarted;

  it('builds its instance buffers in a sane time', () => {
    console.log(
      `[stress] board: ${board.tileCount} tiles, ${board.instanceCount} instances, ` +
        `${board.drawCalls} draws, built in ${boardMs.toFixed(0)}ms`,
    );
    console.log(`[stress] blank-chart layer built in ${chartMs.toFixed(0)}ms`);
    // The board is built once per map and this is the number the fog exists to
    // avoid paying twice. Bounded very generously — see the file docblock.
    expect(boardMs).toBeLessThan(4000);
    // The chart layer is built alongside it and rides the same lifetime, so it
    // is held to the same kind of bound.
    expect(chartMs).toBeLessThan(2000);
  });

  it('reports the memory the fog snapshot costs', () => {
    // The price of being patchable: a flat copy of the matrix and colour buffers
    // so any instance can be hidden, tinted and put back exactly as built.
    let bytes = 0;
    for (const child of board.group.children) {
      if (!(child instanceof InstancedMesh)) continue;
      bytes += (child.instanceMatrix.array as Float32Array).byteLength;
      if (child.instanceColor) bytes += (child.instanceColor.array as Float32Array).byteLength;
    }
    console.log(`[stress] instance buffers ${(bytes / 1024 / 1024).toFixed(2)}MB (snapshot ≈ the same again)`);
    expect(bytes).toBeGreaterThan(0);
  });

  it('resolves every tile to its instances, with nothing left over', () => {
    expect(board.tiles.own.size).toBe(probe.map.tiles.length);
    let drawn = 0;
    for (const child of board.group.children) {
      if (!(child instanceof InstancedMesh)) continue;
      if (child.material === materials.outline) continue;
      drawn += child.count;
    }
    // Not one instance on this board belongs to no tile. See `fog3d.ts` for why
    // that would be a bug with no symptom until somebody looked at a blank map.
    expect(accountedInstances(board.tiles)).toBe(drawn);
  });

  it('paints the whole board once, then costs nothing at all when nothing moves', () => {
    const first = performance.now();
    const initial = fog.apply(probe.visibility[0]!);
    const firstMs = performance.now() - first;
    expect(initial.tiles).toBe(probe.map.tiles.length);

    resetInstanceWrites();
    const idle = performance.now();
    const nothing = fog.apply(probe.visibility[0]!);
    const idleMs = performance.now() - idle;
    expect(nothing.tiles).toBe(0);
    expect(INSTANCE_WRITES.matrix + INSTANCE_WRITES.tint).toBe(0);
    console.log(
      `[stress] fog first paint ${initial.tiles} tiles / ` +
        `${initial.matrixWrites + initial.tintWrites} writes in ${firstMs.toFixed(0)}ms · ` +
        `idle repaint ${idleMs.toFixed(2)}ms, 0 writes`,
    );
    expect(firstMs).toBeLessThan(2000);
    expect(idleMs).toBeLessThan(50);
  });

  it('spends writes in proportion to the tiles that changed', () => {
    const state = probe;
    fog.apply(state.visibility[0]!);

    const mover = state.units.find((unit) => unit.ownerId === 0)!;
    const from = { col: mover.col, row: mover.row };
    const to = unexploredTile(state);
    mover.col = to.col;
    mover.row = to.row;
    const delta = recomputeVisibility(state, 0);
    expect(delta.became.length).toBeGreaterThan(0);

    resetInstanceWrites();
    const started2 = performance.now();
    const stats = fog.apply(state.visibility[0]!);
    const ms = performance.now() - started2;

    expect(stats.tiles).toBe(delta.became.length);
    // THE render-side incrementality assertion. Every write is on a changed
    // tile's own instances (plus that tile's fixed handful of chart furniture),
    // so the cost is `O(K × instances-per-tile)` and has nothing to do with how
    // big the board is.
    let owned = 0;
    for (const change of delta.became) {
      const index = tileIndex(state.map, change.col, change.row);
      for (const handle of board.tiles.own.get(index) ?? []) owned += handle.count;
    }
    const chartAllowance = stats.tiles * 12;
    const edgeAllowance = stats.edges * 6;
    expect(stats.matrixWrites).toBeLessThanOrEqual(owned + chartAllowance + edgeAllowance);
    // Twice `owned`, because an outlined instance is washed on both its mesh and
    // its inverted-hull shell — a remembered tile that kept a full-strength black
    // rim would not read as washed out at all (see `setWash`).
    expect(stats.tintWrites).toBeLessThanOrEqual(2 * (owned + edgeAllowance));
    // And it is a rounding error against the board it did not rebuild.
    expect(stats.matrixWrites).toBeLessThan(board.instanceCount / 50);
    console.log(
      `[stress] one move repaint: ${stats.tiles} tiles, ${stats.matrixWrites} matrix + ` +
        `${stats.tintWrites} tint writes in ${ms.toFixed(2)}ms ` +
        `(board has ${board.instanceCount} instances)`,
    );
    expect(ms).toBeLessThan(50);

    mover.col = from.col;
    mover.row = from.row;
    recomputeVisibility(state, 0);
    fog.apply(state.visibility[0]!);
  });

  it('swaps the whole fog view on a seat change without rebuilding anything', () => {
    const meshes = board.group.children.slice();
    fog.apply(probe.visibility[0]!);

    resetInstanceWrites();
    const started3 = performance.now();
    const swap = fog.apply(probe.visibility[1]!);
    const ms = performance.now() - started3;

    console.log(
      `[stress] seat swap: ${swap.tiles} tiles, ` +
        `${swap.matrixWrites + swap.tintWrites} writes in ${ms.toFixed(1)}ms`,
    );
    expect(swap.tiles).toBeGreaterThan(0);
    // Still attribute writes, still the same meshes. This is the one case the
    // milestone allows a full sweep, and it does not need one — the diff finds
    // only the tiles the two seats actually disagree about.
    expect(board.group.children).toEqual(meshes);
    expect(ms).toBeLessThan(300);

    fog.apply(probe.visibility[0]!);
  });

  it('leaves nothing visible that nobody has seen', () => {
    // The end-to-end statement: for the seat the board is painted through, every
    // hidden tile's instances are down and its blank chart is up.
    const state = probe;
    fog.apply(state.visibility[0]!);
    let hidden = 0;
    for (let index = 0; index < state.map.tiles.length; index++) {
      const tile = state.map.tiles[index]!;
      if (visibilityAt(state, 0, tile.col, tile.row) !== HIDDEN) continue;
      expect(fog.paintedLevel(index)).toBe(HIDDEN);
      hidden += 1;
    }
    expect(hidden).toBeGreaterThan(0);
  });
});

// --- the simulation ---------------------------------------------------------

describe('a full turn at scale', () => {
  it('resolves every seat, with the fog kept honest, inside a generous bound', () => {
    const started = performance.now();
    for (const player of game.state.players) {
      const result = dispatch(game, { type: 'endTurn', playerId: player.id });
      expect(result).toEqual({ ok: true });
    }
    const ms = performance.now() - started;
    console.log(
      `[stress] one full turn resolution (${fixture.unitCount} units, ` +
        `${fixture.cityCount} cities, ${SEATS} seats): ${ms.toFixed(0)}ms`,
    );
    expect(game.state.turn).toBe(2);
    // The milestone's own suggestion, and the measured figure is an order of
    // magnitude under it. See the file docblock on why it is not tighter.
    expect(ms).toBeLessThan(2000);

    for (const player of game.state.players) {
      expect(watched(game.state, player.id)).toBeGreaterThan(0);
    }
  });

  it('replays the whole scenario to a byte-identical state', () => {
    // The ultimate determinism test at scale: three hundred spawns, forty
    // foundings and a full resolution, replayed from `{config, log}` alone.
    // Fog is in the snapshot, so a visibility grid that depended on Map order,
    // on a Set's iteration, or on anything outside the state would show up here
    // as a diff and nowhere else.
    const started = performance.now();
    const replayed = replay(game.config, game.log);
    const ms = performance.now() - started;
    console.log(`[stress] replay of ${game.log.length} commands: ${ms.toFixed(0)}ms`);
    expect(snapshotState(replayed)).toBe(snapshotState(game.state));
    expect(ms).toBeLessThan(20_000);
  });

  it('takes a wave of forty workers building in one window', () => {
    // M7's own stress claim, and it is deliberately measured on the *live*
    // fixture rather than on the probe: every build here is an accepted command,
    // so the log this appends to is still a save file and the replay assertion
    // above (which runs before this test, in declaration order) has already had
    // its say about the state without them.
    //
    // What is being bounded is the reducer, not the renderer: forty validated
    // commands, each of which scans the actor's territory and the improvement
    // table. The render-side claim — that this does not re-bake the board — is
    // `signImprovedCells` and lives in `test/improvements3d.test.ts`.
    const state = game.state;
    // A few resolutions first, so the forty cities have pushed their borders out
    // and there is enough owned ground for forty workers to stand on. Ordinary
    // end-turns through the reducer, so the log stays a save file.
    //
    // And they research, because since the Age I rework every improvement is
    // behind a technology and every seat starts holding Agriculture alone —
    // which gates the farm and nothing else. Mining is the one that opens the
    // most ground on a generated map (any hill), it is the cheapest node after
    // the roots, and forty cities pay for it in a turn or two. Ordinary
    // commands, so the log stays a save file and the replay assertion above
    // still holds over it.
    for (const player of state.players) {
      dispatch(game, { type: 'chooseResearch', playerId: player.id, techId: 'mining' });
    }
    // Long enough for it to land, and no longer: forty size-one cities under a
    // badly overstretched writ round their single beaker down to nothing (the
    // −20% is applied per city, and `floor(1 × 0.8)` is 0), so this empire has
    // to *grow* before it can think. That is the meters working, not a stall.
    for (let turn = 0; turn < 40; turn++) {
      if (state.players.every((player) => player.techsResearched.includes('mining'))) break;
      for (const player of state.players) dispatch(game, { type: 'endTurn', playerId: player.id });
    }
    for (const player of state.players) {
      expect(player.techsResearched, player.name).toContain('mining');
    }

    // Sites across every seat, because a worker may only build inside its *own*
    // empire's borders (the own-territory rule) and one seat's ten cities are
    // not forty tiles of legal ground.
    const sites: { tile: Tile; seat: number; id: (typeof IMPROVEMENT_IDS)[number] }[] = [];
    for (const tile of state.map.tiles) {
      if (sites.length >= WORKER_WAVE) break;
      for (const player of state.players) {
        let chosen: (typeof IMPROVEMENT_IDS)[number] | null = null;
        for (const id of IMPROVEMENT_IDS) {
          if (improvementErrorAt(state, player.id, tile, id) === null) {
            chosen = id;
            break;
          }
        }
        if (chosen === null) continue;
        sites.push({ tile, seat: player.id, id: chosen });
        break;
      }
    }
    console.log(`[stress] ${sites.length} improvable sites found across ${SEATS} seats`);
    expect(sites.length).toBeGreaterThanOrEqual(WORKER_WAVE);

    const started = performance.now();
    let built = 0;
    for (const site of sites) {
      const spawn: Command = {
        type: 'spawnUnit',
        playerId: site.seat,
        ownerId: site.seat,
        unitType: 'worker',
        at: { col: site.tile.col, row: site.tile.row },
      };
      // A civilian may already be standing there; stacking refuses, and the next
      // site takes it. A refusal is not logged and costs nothing.
      if (!dispatch(game, spawn).ok) continue;
      const worker = state.units[state.units.length - 1]!;
      for (const id of IMPROVEMENT_IDS) {
        if (improvementError(state, worker.id, id) !== null) continue;
        const order: Command = {
          type: 'buildImprovement',
          playerId: site.seat,
          unitId: worker.id,
          improvement: id,
        };
        if (dispatch(game, order).ok) built += 1;
        break;
      }
    }
    const ms = performance.now() - started;
    console.log(
      `[stress] ${built} improvements built by ${built} workers in ${ms.toFixed(0)}ms ` +
        `(${(ms / Math.max(1, built)).toFixed(2)}ms each)`,
    );
    // Not every site takes a worker — a civilian already standing there is
    // refused by stacking, which is the rule doing its job — but most do.
    expect(built).toBeGreaterThanOrEqual(WORKER_WAVE / 2);
    // Generous by roughly two orders of magnitude, like every other wall clock in
    // this file: this catches "somebody made validation quadratic in the map".
    expect(ms).toBeLessThan(4000);

    // Every one of them is on the board, and every worker that spent its single
    // build still holds two charges.
    const improved = state.map.tiles.filter((tile) => tile.improvement !== undefined);
    expect(improved.length).toBe(built);
    for (const unit of state.units) {
      if (unit.type !== 'worker') continue;
      expect(unit.chargesLeft).toBe(2);
      expect(unit.movesLeft).toBe(0);
    }

    // The render-side half, at the same scale: rebuilding the improvements layer
    // over a board that now carries a wave of works costs one instance per
    // improved tile and a millisecond or two — which is the whole argument for
    // it being a layer rather than part of the board. (The board, by contrast, is
    // 40,152 instances and 38 ms; see the block above.)
    const geometry = new BoardGeometry();
    const materials = new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
    const layer = new ImprovementLayer();
    const layerStarted = performance.now();
    layer.build(state, geometry, materials, false, state.visibility[0]!);
    const layerMs = performance.now() - layerStarted;
    console.log(
      `[stress] improvements layer: ${layer.instances} instances, ` +
        `${layer.drawCalls} draws, built in ${layerMs.toFixed(2)}ms`,
    );
    // One per improved tile the seat can see, and never more.
    expect(layer.instances).toBeLessThanOrEqual(improved.length);
    expect(layerMs).toBeLessThan(500);
    layer.dispose();
    geometry.dispose();

    // And the whole thing still replays: a wave of builds is an ordinary log.
    const replayed = replay(game.config, game.log);
    expect(snapshotState(replayed)).toBe(snapshotState(game.state));
  });

  it('prices the roster it was built from', () => {
    // A guard on the fixture rather than on the engine: if somebody gives a unit
    // type a `requiresResource` or a `minCityPop`, the spawns above would start
    // being refused and the scenario would quietly shrink.
    for (const id of ROSTER) {
      const def = unitDef(id);
      expect(def.requiresResource).toBeUndefined();
    }
  });
});

// --- building on the ground -------------------------------------------------

/**
 * What founding a town or finishing a farm costs the *board*.
 *
 * Until this milestone: a full re-bake. The board decided at bake time whether a
 * hex showed its meadow (`clearsClutter`) and whether it showed the wood a town
 * was founded in, so the first farm of the game threw away every instance buffer
 * on the map and built them again — and took the blank-chart layer and a
 * full-board fog repaint with it, because both hang off the board's lifetime.
 * That is the `boardMs` measured in the block above, once per event, at every
 * map size, forever.
 *
 * Now: a per-instance bit on the tile that changed. The numbers logged below are
 * the two sides of that trade, measured on the same machine in the same run, so
 * the comparison is not against a remembered figure. The assertions are on
 * *operation counts* rather than on the clock, for the reason the file docblock
 * gives — but the clock is printed, because the whole point of the milestone is
 * a number a person can feel.
 */
describe('what building on a tile costs the board', () => {
  const geometry = new BoardGeometry();
  const materials = new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);

  /** The instances one tile is currently drawing, of the ones it owns. */
  function shown(board: ReturnType<typeof buildBoard>, cell: number): number {
    let count = 0;
    const matrix = new Matrix4();
    for (const handle of board.tiles.own.get(cell) ?? []) {
      const mesh = (handle as unknown as { bucket: { mesh: InstancedMesh | null } }).bucket.mesh!;
      for (let i = 0; i < handle.count; i++) {
        mesh.getMatrixAt(handle.start + i, matrix);
        if (matrix.elements[0] !== 0) count += 1;
      }
    }
    return count;
  }

  /**
   * The most heavily dressed tile that actually yields at `scope`.
   *
   * The *worst* case rather than the first hex that qualifies: the bound being
   * asserted is "a tile's own instances and no more", so the honest number to
   * print beside it is the richest hex the generator made. It is found by trying
   * it — a suppress, a look, an unsuppress — because which grade a scrap of
   * scatter carries is a fact about `addDecorations` and not about the tile, and
   * a test that re-derived it here would be asserting its own copy of the rule.
   */
  function richestYielding(
    board: ReturnType<typeof buildBoard>,
    map: GameMap,
    scope: SuppressScope,
    besides = -1,
  ): number {
    const ranked = map.tiles
      .map((tile) => tileIndex(map, tile.col, tile.row))
      .sort((a, b) => (board.tiles.own.get(b)?.length ?? 0) - (board.tiles.own.get(a)?.length ?? 0));
    for (const cell of ranked) {
      if (cell === besides) continue;
      const before = shown(board, cell);
      board.suppressTile(cell, scope);
      const after = shown(board, cell);
      board.unsuppressTile(cell);
      if (after < before) return cell;
    }
    throw new Error(`stress: nothing on this map yields at scope ${scope}`);
  }

  for (const sizeName of ['standard', 'huge'] as const) {
    it(`replaces a ${sizeName}-map rebuild with a handful of writes`, () => {
      const map = generateMap(99_101, sizeName);

      // THE "BEFORE" NUMBER: what founding a city or finishing a farm used to
      // cost, because it is exactly the work the old fingerprint triggered.
      const rebuildStarted = performance.now();
      const board = buildBoard(map, geometry, materials, false);
      const rebuildMs = performance.now() - rebuildStarted;

      const meshes = board.group.children.slice();
      // Two different hexes: a farm and a founding never land on the same one.
      const cell = richestYielding(board, map, SUPPRESS.clutter);
      const townCell = richestYielding(board, map, SUPPRESS.decor, cell);
      const owned = (board.tiles.own.get(cell) ?? []).reduce((sum, h) => sum + h.count, 0);
      const townOwned = (board.tiles.own.get(townCell) ?? []).reduce(
        (sum, h) => sum + h.count,
        0,
      );

      // --- a farm, or a mine: the meadow goes ---------------------------------
      resetInstanceWrites();
      const farmStarted = performance.now();
      board.suppressTile(cell, SUPPRESS.clutter);
      const farmMs = performance.now() - farmStarted;
      const farmWrites = INSTANCE_WRITES.matrix;

      // --- a town: the wood goes too ------------------------------------------
      resetInstanceWrites();
      const townStarted = performance.now();
      board.suppressTile(townCell, SUPPRESS.decor);
      const townMs = performance.now() - townStarted;
      const townWrites = INSTANCE_WRITES.matrix;

      console.log(
        `[stress] ${sizeName} (${map.tiles.length} tiles, ${board.instanceCount} instances): ` +
          `board rebuild ${rebuildMs.toFixed(0)}ms — which is what a farm or a founding ` +
          `used to cost. Now: farm ${farmWrites} writes in ${farmMs.toFixed(3)}ms, ` +
          `founding ${townWrites} writes in ${townMs.toFixed(3)}ms ` +
          `(the tile owns ${owned} instances).`,
      );

      // The claim, as operations. Every write is on the named tile's own
      // instances and there are no others — never mind the board's size.
      expect(farmWrites).toBeGreaterThan(0);
      expect(townWrites).toBeGreaterThan(0);
      expect(farmWrites).toBeLessThanOrEqual(owned);
      expect(townWrites).toBeLessThanOrEqual(townOwned);
      expect(INSTANCE_WRITES.tint).toBe(0);
      // K, stated as a constant rather than as a fraction: a hex's whole
      // dressing is a dozen scraps and three wrap copies of each.
      expect(farmWrites + townWrites).toBeLessThanOrEqual(64);
      // A rounding error against the board that was NOT rebuilt.
      expect(farmWrites + townWrites).toBeLessThan(board.instanceCount / 100);

      // And the buffers are the buffers from the build. This is the whole
      // milestone in one assertion: the board is built once per game.
      expect(board.group.children).toEqual(meshes);
      for (let i = 0; i < meshes.length; i++) expect(board.group.children[i]).toBe(meshes[i]);
      expect(shown(board, cell)).toBeLessThan(owned);
      expect(shown(board, townCell)).toBeLessThan(townOwned);

      board.dispose();
    });
  }

  it('applies a whole loaded empire in one bounded sweep', () => {
    // The save-load case: a game resumed with forty towns and a wave of farms
    // already on the map has to arrive at the same picture, and it may not do so
    // by re-baking. The sweep is one pass over the state, and the writes it
    // issues are bounded by the built-on tiles' own instances.
    const state = game.state;
    const board = buildBoard(state.map, geometry, materials, false);
    const improved = state.map.tiles
      .map((tile, cell) => ({ tile, cell }))
      .filter(({ tile }) => tile.improvement !== undefined && clearsClutter(tile.improvement));
    expect(state.cities.length).toBeGreaterThan(0);
    expect(improved.length).toBeGreaterThan(0);

    let owned = 0;
    for (const city of state.cities) {
      const cell = tileIndex(state.map, city.col, city.row);
      for (const handle of board.tiles.own.get(cell) ?? []) owned += handle.count;
    }
    for (const { cell } of improved) {
      for (const handle of board.tiles.own.get(cell) ?? []) owned += handle.count;
    }

    const meshes = board.group.children.slice();
    resetInstanceWrites();
    const started = performance.now();
    for (const city of state.cities) {
      board.suppressTile(tileIndex(state.map, city.col, city.row), SUPPRESS.decor);
    }
    for (const { cell } of improved) board.suppressTile(cell, SUPPRESS.clutter);
    const ms = performance.now() - started;

    console.log(
      `[stress] save-load: ${state.cities.length} towns + ${improved.length} works ` +
        `applied in ${INSTANCE_WRITES.matrix} writes / ${ms.toFixed(2)}ms ` +
        `(those tiles own ${owned} instances of the board's ${board.instanceCount})`,
    );
    expect(INSTANCE_WRITES.matrix).toBeLessThanOrEqual(owned);
    expect(INSTANCE_WRITES.matrix).toBeLessThan(board.instanceCount / 20);
    expect(board.group.children).toEqual(meshes);
    expect(ms).toBeLessThan(200);
    board.dispose();
  });
});
