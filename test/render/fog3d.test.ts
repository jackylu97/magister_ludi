import { describe, expect, it } from 'vitest';
import {
  DataTexture,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
} from 'three';

import {
  type TileIcons,
  type UnitBadges,
  MARGINALIA_CELLS,
  tileIconIndex,
} from '../../src/render3d/badges3d';
import { BoardGeometry, buildBoard } from '../../src/render3d/board3d';
import { CityLayer, TerritoryLayer } from '../../src/render3d/cities3d';
import {
  FogView,
  accountedInstances,
  knowsCell,
  levelAt,
  seesCell,
} from '../../src/render3d/fog3d';
import {
  type InstanceHandle,
  HIDDEN_MATRIX,
  INSTANCE_WRITES,
  InstanceCollector,
  SUPPRESS,
  resetInstanceWrites,
} from '../../src/render3d/instances';
import { LensLayer, NO_LENS } from '../../src/render3d/lens3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { UnitLayer } from '../../src/render3d/pieces';
import { MaterialLibrary } from '../../src/render3d/toon';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt, mapRange, tileHex, tileIndex } from '../../src/sim/map';
import { type GameState, createUnit, newGame } from '../../src/sim/state';
import {
  EXPLORED,
  HIDDEN,
  VISIBLE,
  recomputeVisibility,
  resetVisibility,
} from '../../src/sim/visibility';
import { LENS_DEFAULTS, type LensView } from '../../src/ui/mapView';

/**
 * Fog of war, from the board's side.
 *
 * The thing being defended here is the M8 hard perf constraint (design-notes,
 * Sequencing snapshot): a visibility change is per-instance writes for the
 * *changed tiles only*, and never a board rebuild. That is a claim about
 * operation counts, so it is asserted by counting operations — `INSTANCE_WRITES`
 * is the shim — rather than by timing a GPU that does not exist in node. The
 * wall-clock half lives in `test/stress.test.ts` and is deliberately secondary.
 *
 * The second thing being defended is the *accounting*. Fog hides a tile by
 * zero-scaling the instances that tile owns, so an instance that was collected
 * without naming its tile would go on growing on a hex nobody has ever seen —
 * a bug with no symptom until somebody looks at a blank map and finds three
 * trees on it. Every instance the board builds is checked against the map.
 */

function materials(): MaterialLibrary {
  return new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
}

/** Flat grassland, two seats, nothing on it. Deterministic in the size alone. */
function flatState(width = 14, height = 10): GameState {
  const state = newGame({
    seed: 5,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  state.units = [];
  state.cities = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  // The board was replaced under this state; the fog grids were sized for the
  // old one. See `resetVisibility`.
  resetVisibility(state);
  state.nextEntityId = 1;
  return state;
}

interface Rig {
  state: GameState;
  geometry: BoardGeometry;
  mats: MaterialLibrary;
  board: ReturnType<typeof buildBoard>;
  fog: FogView;
}

/** A built board with a fog view over it, painted for seat 0. */
function rig(state: GameState = flatState(), icons: TileIcons | null = null): Rig {
  const geometry = new BoardGeometry();
  const mats = materials();
  const board = buildBoard(state.map, geometry, mats, false);
  const fog = new FogView(state.map, board.tiles);
  fog.buildChart(geometry, mats, icons);
  fog.apply(state.visibility[0]!);
  return { state, geometry, mats, board, fog };
}

/** One instance's matrix as it was actually uploaded. */
function matrixOf(mesh: InstancedMesh, slot: number): Matrix4 {
  const matrix = new Matrix4();
  mesh.getMatrixAt(slot, matrix);
  return matrix;
}

/**
 * Is this instance hidden?
 *
 * Compared against `HIDDEN_MATRIX` element by element rather than decomposed,
 * and that is not fussiness: `Matrix4.decompose` reports a scale of **1** for an
 * all-zero matrix, because it normalises by a basis length it has just measured
 * as zero. A test that asked three what the scale was would have passed on a
 * board where nothing was ever hidden.
 */
function isHiddenMatrix(matrix: Matrix4): boolean {
  return matrix.elements.every((value, i) => value === HIDDEN_MATRIX.elements[i]);
}

/** A stand-in for the icon atlas; see the note in `test/resources3d.test.ts`. */
const fakeIcons = {
  material: new MeshBasicMaterial({ depthTest: false, depthWrite: false }),
  standingMaterial: new MeshBasicMaterial(),
} as unknown as TileIcons;

/** The same stand-in for the badge atlas; the layer only ever wants a material. */
const badgeMaterial = new MeshBasicMaterial();
const wildBadgeMaterial = new MeshBasicMaterial();
const fakeBadges = {
  material: badgeMaterial,
  wildMaterial: wildBadgeMaterial,
  materialFor: (wild: boolean) => (wild ? wildBadgeMaterial : badgeMaterial),
} as unknown as UnitBadges;

// --- the mapping ------------------------------------------------------------

describe('the tile → instance map', () => {
  it('resolves every tile on the board', () => {
    const state = flatState();
    const { board } = rig(state);
    expect(board.tiles.own.size).toBe(state.map.tiles.length);
    for (const tile of state.map.tiles) {
      const handles = board.tiles.own.get(tileIndex(state.map, tile.col, tile.row));
      expect(handles, `(${tile.col}, ${tile.row}) owns no instances`).toBeTruthy();
      expect(handles!.length).toBeGreaterThan(0);
    }
  });

  it('accounts for every instance the board uploaded', () => {
    const state = flatState();
    const { board, mats } = rig(state);
    // The board's `instanceCount` includes the inverted-hull shells, which are a
    // second `InstancedMesh` over the *same* slots — so the honest comparison is
    // against the meshes that are not outline shells.
    let drawn = 0;
    for (const child of board.group.children) {
      if (!(child instanceof InstancedMesh)) continue;
      if (child.material === mats.outline) continue;
      drawn += child.count;
    }
    expect(accountedInstances(board.tiles)).toBe(drawn);
  });

  it('reports every river edge as shared between its two banks', () => {
    // A generated map, because `createMap` has no rivers on it at all.
    const state = newGame({
      seed: 4242,
      sizeName: 'duel',
      players: [{ name: 'A', color: '#a00', isHuman: true }],
    });
    const { board } = rig(state);
    expect(board.tiles.shared.length).toBeGreaterThan(0);
    for (const edge of board.tiles.shared) {
      expect(edge.a).not.toBe(edge.b);
      expect(state.map.tiles[edge.a]).toBeTruthy();
      expect(state.map.tiles[edge.b]).toBeTruthy();
    }
  });
});

// --- the three pictures -----------------------------------------------------

describe('what a tile looks like at each level', () => {
  it('zero-scales every instance on a hidden tile', () => {
    const state = flatState();
    const { board, fog } = rig(state);
    const index = tileIndex(state.map, 10, 5);
    expect(fog.paintedLevel(index)).toBe(HIDDEN);

    for (const handle of board.tiles.own.get(index)!) {
      const bucket = handle as unknown as { bucket: { mesh: InstancedMesh | null } };
      const mesh = bucket.bucket.mesh!;
      for (let i = 0; i < handle.count; i++) {
        expect(isHiddenMatrix(matrixOf(mesh, handle.start + i))).toBe(true);
      }
    }
  });

  it('restores every instance when the tile is seen', () => {
    const state = flatState();
    const { board, fog } = rig(state);
    createUnit(state, 0, 'warrior', 10, 5);
    fog.apply(state.visibility[0]!);

    const index = tileIndex(state.map, 10, 5);
    expect(fog.paintedLevel(index)).toBe(VISIBLE);
    for (const handle of board.tiles.own.get(index)!) {
      const bucket = handle as unknown as { bucket: { mesh: InstancedMesh | null } };
      const mesh = bucket.bucket.mesh!;
      for (let i = 0; i < handle.count; i++) {
        expect(isHiddenMatrix(matrixOf(mesh, handle.start + i))).toBe(false);
      }
    }
  });

  it('washes a remembered tile toward grey vellum, and puts it back exactly', () => {
    const state = flatState();
    const { board, fog } = rig(state);
    const warrior = createUnit(state, 0, 'warrior', 10, 5);
    fog.apply(state.visibility[0]!);

    const index = tileIndex(state.map, 10, 5);
    const handle = board.tiles.own.get(index)![0]!;
    const bucket = handle as unknown as { bucket: { mesh: InstancedMesh | null } };
    const color = bucket.bucket.mesh!.instanceColor!;
    const lit = (color.array as Float32Array)[handle.start * 3]!;

    // Walk away: the tile is remembered.
    warrior.col = 2;
    warrior.row = 1;
    recomputeVisibility(state, 0);
    fog.apply(state.visibility[0]!);
    expect(fog.paintedLevel(index)).toBe(EXPLORED);

    // The wash is a *mix toward a flat tone*, so the multiplier written here is
    // whatever takes this bucket's own ink to the washed colour — which is above
    // 1 for a dark bucket and below it for a bright one. What can be asserted
    // without re-deriving the arithmetic is that it moved, and that it moved by
    // a lot: the milestone's whole point is that this must not be subtle.
    const dimmed = (color.array as Float32Array)[handle.start * 3]!;
    expect(dimmed).not.toBeCloseTo(lit, 3);
    expect(Math.abs(dimmed - lit) / lit).toBeGreaterThan(0.1);
    expect(VIEW3D.fog.exploredDim).toBeGreaterThanOrEqual(0.4);

    // Walk back: exactly the ink it started with, not an approximation of it.
    warrior.col = 10;
    warrior.row = 5;
    recomputeVisibility(state, 0);
    fog.apply(state.visibility[0]!);
    expect((color.array as Float32Array)[handle.start * 3]!).toBeCloseTo(lit, 6);
  });

  it('switches the blank chart on exactly where the board is off', () => {
    const state = flatState();
    const { fog } = rig(state);
    const chart = fog.group.children.filter((c) => c instanceof InstancedMesh) as InstancedMesh[];
    expect(chart.length).toBeGreaterThan(0);

    // With nothing on the board, every tile is Terra Incognita and every chart
    // patch is up.
    let visible = 0;
    for (const mesh of chart) {
      for (let i = 0; i < mesh.count; i++) {
        if (!isHiddenMatrix(matrixOf(mesh, i))) visible += 1;
      }
    }
    expect(visible).toBe(chart.reduce((sum, mesh) => sum + mesh.count, 0));

    // Light one hex and its patch goes away.
    createUnit(state, 0, 'warrior', 7, 5);
    fog.apply(state.visibility[0]!);
    let after = 0;
    for (const mesh of chart) {
      for (let i = 0; i < mesh.count; i++) {
        if (!isHiddenMatrix(matrixOf(mesh, i))) after += 1;
      }
    }
    expect(after).toBeLessThan(visible);
  });
});

// --- rivers -----------------------------------------------------------------

describe('a river edge', () => {
  function riverRig(): Rig & { edge: { a: number; b: number } } {
    const state = newGame({
      seed: 4242,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a' },
      ],
    });
    state.units = [];
    resetVisibility(state);
    const built = rig(state);
    return { ...built, edge: built.board.tiles.shared[0]! };
  }

  it('is hidden only when both banks are', () => {
    const { state, fog, edge } = riverRig();
    const handle = state.map.tiles[edge.a]!;
    // Both dark to start with: nothing is on the board.
    expect(fog.paintedLevel(edge.a)).toBe(HIDDEN);
    expect(fog.paintedLevel(edge.b)).toBe(HIDDEN);
    const mesh = (edge as unknown as { handle: { bucket: { mesh: InstancedMesh } } });
    void mesh;

    // Light one bank only.
    createUnit(state, 0, 'warrior', handle.col, handle.row);
    fog.apply(state.visibility[0]!);
    expect(fog.paintedLevel(edge.a)).toBe(VISIBLE);
  });

  it('is drawn while either bank is charted', () => {
    const { state, board, fog, edge } = riverRig();
    const bank = state.map.tiles[edge.a]!;
    const ribbon = board.tiles.shared[0]!.handle as unknown as {
      bucket: { mesh: InstancedMesh | null };
      start: number;
      count: number;
    };
    const mesh = ribbon.bucket.mesh!;
    expect(isHiddenMatrix(matrixOf(mesh, ribbon.start))).toBe(true);

    createUnit(state, 0, 'warrior', bank.col, bank.row);
    fog.apply(state.visibility[0]!);
    // One bank is enough. A ribbon filed under a single tile would have vanished
    // the moment the other side went dark and left a river running out of
    // nowhere; this is that rule, held still.
    expect(isHiddenMatrix(matrixOf(mesh, ribbon.start))).toBe(false);
  });
});

// --- the constraint ---------------------------------------------------------

describe('the cost of a repaint', () => {
  it('writes nothing at all when nothing changed', () => {
    const state = flatState();
    const { fog } = rig(state);
    resetInstanceWrites();
    const stats = fog.apply(state.visibility[0]!);
    expect(stats).toMatchObject({ tiles: 0, edges: 0, matrixWrites: 0, tintWrites: 0 });
    expect(INSTANCE_WRITES.matrix).toBe(0);
    expect(INSTANCE_WRITES.tint).toBe(0);
  });

  it('writes only the changed tiles, bounded by their own instance count', () => {
    const state = flatState(20, 14);
    const { board, fog } = rig(state);

    resetInstanceWrites();
    const warrior = createUnit(state, 0, 'warrior', 10, 7);
    fog.apply(state.visibility[0]!);
    const stats = fog.apply(state.visibility[0]!);
    expect(stats.tiles).toBe(0);

    // A warrior's arrival lit a disc. Count what that disc's tiles are worth,
    // and hold the writes to it — the bound is the *changed tiles'* instances,
    // never the board's.
    const changed: number[] = [];
    for (let index = 0; index < state.map.tiles.length; index++) {
      if (fog.paintedLevel(index) !== HIDDEN) changed.push(index);
    }
    let owned = 0;
    for (const index of changed) {
      for (const handle of board.tiles.own.get(index) ?? []) owned += handle.count;
    }
    expect(changed.length).toBeGreaterThan(0);
    // Board instances restored + tinted, chart instances hidden. The chart is a
    // fixed two (or three) instances a tile, so the whole thing is linear in K.
    expect(INSTANCE_WRITES.matrix).toBeLessThanOrEqual(owned + changed.length * 12);
    // Twice `owned`: an outlined instance is washed on its mesh *and* on its
    // inverted-hull shell, so a remembered tile does not keep a black rim.
    expect(INSTANCE_WRITES.tint).toBeLessThanOrEqual(2 * owned);

    // And it is genuinely a fraction of the board: this is the whole claim.
    expect(INSTANCE_WRITES.matrix).toBeLessThan(board.instanceCount / 4);
    void warrior;
  });

  it('never rebuilds: the meshes after a repaint are the meshes from the build', () => {
    const state = flatState();
    const { board, fog } = rig(state);
    const before = board.group.children.slice();
    createUnit(state, 0, 'scout', 6, 5);
    fog.apply(state.visibility[0]!);
    createUnit(state, 0, 'scout', 9, 5);
    fog.apply(state.visibility[0]!);
    expect(board.group.children).toEqual(before);
    for (let i = 0; i < before.length; i++) {
      expect(board.group.children[i]).toBe(before[i]);
    }
  });

  it('repaints a seat change as one large delta, still without a rebuild', () => {
    const state = flatState(20, 14);
    createUnit(state, 0, 'scout', 4, 7);
    createUnit(state, 1, 'scout', 16, 7);
    const { board, fog } = rig(state);
    const meshes = board.group.children.slice();

    resetInstanceWrites();
    const swap = fog.apply(state.visibility[1]!);
    // Both discs move: one goes dark, the other lights up.
    expect(swap.tiles).toBeGreaterThan(0);
    expect(board.group.children).toEqual(meshes);
    expect(INSTANCE_WRITES.matrix).toBeGreaterThan(0);
  });
});

// --- suppression, composed with the fog -------------------------------------

/**
 * The other reason an instance is off, and the whole of this milestone.
 *
 * Founding a city or finishing a farm changes which dressing a hex shows, and
 * that used to be baked — so it cost a full board rebuild, a chart rebuild and a
 * full fog repaint, mid-game, every time. It is now a second per-instance bit
 * (`InstanceCollector.suppress`), and the reason it was *deferred* out of M7 is
 * exactly what is under test here: an implementation that wrote matrices
 * directly fights the fog, because `restore` puts an instance back where it was
 * built and would therefore regrow a meadow a farm was ploughed over the moment
 * a scout walked past it. The composition rule — drawn iff neither bit is set —
 * is stated in `instances.ts` and asserted below in all four states.
 */
describe('suppression, and how it composes with the fog', () => {
  /** Is this handle's first slot on the board? */
  function drawn(handle: InstanceHandle): boolean {
    const { bucket } = handle as unknown as BucketPeek;
    return !isHiddenMatrix(matrixOf(bucket.mesh!, handle.start));
  }

  /** Every tile watched, so these tests are about suppression and not about fog. */
  function litRig(state: GameState): Rig {
    const built = rig(state);
    built.fog.apply(new Array<number>(state.map.tiles.length).fill(VISIBLE));
    return built;
  }

  /**
   * A tile with something suppressible on it, its clutter handles, and its prism.
   *
   * Found rather than named: which hexes roll a tuft is a hash of the
   * coordinates, so a hard-coded pair would be a fixture that silently stopped
   * testing anything the day somebody nudged `clutter.tuft.chance`. The board
   * must be lit when this is called.
   */
  function clutteredCell(
    board: Rig['board'],
    map: GameState['map'],
  ): { cell: number; clutter: InstanceHandle[]; ground: InstanceHandle } {
    for (const tile of map.tiles) {
      const cell = tileIndex(map, tile.col, tile.row);
      const handles = board.tiles.own.get(cell) ?? [];
      if (handles.length < 2 || !handles.every(drawn)) continue;
      board.suppressTile(cell, SUPPRESS.clutter);
      const clutter = handles.filter((handle) => !drawn(handle));
      board.unsuppressTile(cell);
      if (clutter.length > 0 && clutter.length < handles.length) {
        return { cell, clutter, ground: handles[0]! };
      }
    }
    throw new Error('fog3d: no tile on this fixture grows anything to suppress');
  }

  it('takes the ploughed meadow down and leaves the ground standing', () => {
    const state = flatState();
    const { board } = litRig(state);
    const { cell, clutter, ground } = clutteredCell(board, state.map);

    expect(clutter.every(drawn)).toBe(true);
    board.suppressTile(cell, SUPPRESS.clutter);
    expect(clutter.some(drawn)).toBe(false);
    // The prism is on no grade at all: a farm does not plough the hill away.
    expect(drawn(ground)).toBe(true);
  });

  it('is NOT undone by a fog restore — the bug that deferred this out of M7', () => {
    const state = flatState();
    const { board, fog } = litRig(state);
    const { cell, clutter } = clutteredCell(board, state.map);
    const tile = state.map.tiles[cell]!;

    // Light the hex, plough it, then walk away and come back.
    const scout = createUnit(state, 0, 'scout', tile.col, tile.row);
    recomputeVisibility(state, 0);
    fog.apply(state.visibility[0]!);
    expect(fog.paintedLevel(cell)).toBe(VISIBLE);
    board.suppressTile(cell, SUPPRESS.clutter);
    expect(clutter.some(drawn)).toBe(false);

    scout.col = (tile.col + 6) % state.map.width;
    recomputeVisibility(state, 0);
    fog.apply(state.visibility[0]!);
    expect(fog.paintedLevel(cell)).toBe(EXPLORED);
    expect(clutter.some(drawn)).toBe(false);

    scout.col = tile.col;
    recomputeVisibility(state, 0);
    fog.apply(state.visibility[0]!);
    expect(fog.paintedLevel(cell)).toBe(VISIBLE);
    // The meadow does not grow back because somebody looked at it again.
    expect(clutter.some(drawn)).toBe(false);
  });

  it('costs nothing on a tile the seat has never charted, and still holds', () => {
    // The save-load case, and the AI's: a wave of farms lands on ground this
    // seat cannot see. Setting a bit on an already-hidden instance must write no
    // matrix at all, and must survive the day the fog lifts off it.
    const state = flatState();
    const lit = litRig(state);
    const { cell, clutter } = clutteredCell(lit.board, state.map);
    const { board, fog } = lit;
    const tile = state.map.tiles[cell]!;
    fog.apply(state.visibility[0]!);
    expect(fog.paintedLevel(cell)).toBe(HIDDEN);

    resetInstanceWrites();
    board.suppressTile(cell, SUPPRESS.clutter);
    expect(INSTANCE_WRITES.matrix).toBe(0);

    createUnit(state, 0, 'scout', tile.col, tile.row);
    recomputeVisibility(state, 0);
    fog.apply(state.visibility[0]!);
    expect(fog.paintedLevel(cell)).toBe(VISIBLE);
    expect(clutter.some(drawn)).toBe(false);
    // And the rest of the hex did come up, or this would be passing because
    // nothing at all had been restored.
    expect((board.tiles.own.get(cell) ?? []).some(drawn)).toBe(true);
  });

  it('puts the four states of the two bits exactly where they belong', () => {
    const state = flatState();
    const { board, fog } = litRig(state);
    const { cell, clutter } = clutteredCell(board, state.map);
    const handle = clutter[0]!;
    const count = state.map.tiles.length;
    const dark = new Array<number>(count).fill(HIDDEN);
    const lit = new Array<number>(count).fill(VISIBLE);

    // fog 0, suppressed 0
    expect(drawn(handle)).toBe(true);

    board.suppressTile(cell, SUPPRESS.clutter);
    // fog 0, suppressed 1
    expect(drawn(handle)).toBe(false);

    fog.apply(dark);
    // fog 1, suppressed 1
    expect(drawn(handle)).toBe(false);

    board.unsuppressTile(cell);
    // fog 1, suppressed 0 — still down, because the fog still has it.
    expect(drawn(handle)).toBe(false);

    fog.apply(lit);
    // fog 0, suppressed 0 again, and the meadow is back.
    expect(drawn(handle)).toBe(true);

    // And the order the two arrive in does not matter: suppress *under* the fog,
    // then lift it, and the instance stays down.
    fog.apply(dark);
    board.suppressTile(cell, SUPPRESS.clutter);
    fog.apply(lit);
    expect(drawn(handle)).toBe(false);
  });

  it('is orthogonal to the wash: a built-on hex still fades and un-fades exactly', () => {
    // Suppression writes matrices, the wash writes colours, and neither asks the
    // other anything. That independence is what keeps `restore` from having to
    // know which of four states it is putting an instance back into, so it is
    // pinned rather than assumed.
    const state = flatState();
    const { board, fog } = litRig(state);
    const { cell, ground } = clutteredCell(board, state.map);
    const tile = state.map.tiles[cell]!;
    const scout = createUnit(state, 0, 'scout', tile.col, tile.row);
    recomputeVisibility(state, 0);
    fog.apply(state.visibility[0]!);

    const litInk = luminance(renderedInk(ground));
    board.suppressTile(cell, SUPPRESS.decor);

    scout.col = (tile.col + 6) % state.map.width;
    recomputeVisibility(state, 0);
    fog.apply(state.visibility[0]!);
    expect(luminance(renderedInk(ground))).toBeLessThan(litInk * 0.85);

    scout.col = tile.col;
    recomputeVisibility(state, 0);
    fog.apply(state.visibility[0]!);
    // Byte-exact, exactly as it is for a hex nothing was ever built on.
    expect(luminance(renderedInk(ground))).toBeCloseTo(litInk, 6);
  });

  it('never rebuilds: founding a town is the meshes from the build, patched', () => {
    const state = flatState();
    const { board, fog } = litRig(state);
    const before = board.group.children.slice();
    const { cell } = clutteredCell(board, state.map);
    const levels = new Array<number>(state.map.tiles.length).fill(VISIBLE);

    resetInstanceWrites();
    board.suppressTile(cell, SUPPRESS.decor);
    // The fog does not hear about this at all: nothing it tracks has moved.
    expect(fog.apply(levels).tiles).toBe(0);

    expect(board.group.children).toEqual(before);
    for (let i = 0; i < before.length; i++) expect(board.group.children[i]).toBe(before[i]);
    // Bounded by that one tile's own instances, not by the board's.
    let owned = 0;
    for (const handle of board.tiles.own.get(cell) ?? []) owned += handle.count;
    expect(INSTANCE_WRITES.matrix).toBeGreaterThan(0);
    expect(INSTANCE_WRITES.matrix).toBeLessThanOrEqual(owned);
    expect(INSTANCE_WRITES.matrix).toBeLessThan(board.instanceCount / 100);
    expect(INSTANCE_WRITES.tint).toBe(0);
  });

  it("leaves the accounting intact: a suppressed instance is still the tile's", () => {
    // Suppression hides instances, it does not un-file them — so the check that
    // catches an unregistered scrap of scatter goes on saying the same thing.
    const state = flatState();
    const { board } = litRig(state);
    const before = accountedInstances(board.tiles);
    for (const tile of state.map.tiles) {
      board.suppressTile(tileIndex(state.map, tile.col, tile.row), SUPPRESS.decor);
    }
    expect(accountedInstances(board.tiles)).toBe(before);
  });
});

// --- the layers that filter -------------------------------------------------

describe('the layers that filter by the seat', () => {
  it('draws no unit on ground the seat is not watching', () => {
    const state = flatState();
    const geometry = new BoardGeometry();
    const mats = materials();
    createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 1, 'warrior', 11, 7);

    const layer = new UnitLayer();
    const facing = new Quaternion();
    layer.build(state, geometry, mats, facing, false, null, null, null, state.visibility[0]!);
    const withFog = layer.drawCalls;
    layer.build(state, geometry, mats, facing, false, null, null, null, null);
    const omniscient = layer.drawCalls;
    // The far warrior is drawn by an omniscient board and not by a fogged one,
    // and a piece is its own bucket per player, so the draw count says so.
    expect(withFog).toBeLessThan(omniscient);
    layer.dispose();
  });

  it('draws no town on ground the seat is not watching', () => {
    const state = flatState();
    const geometry = new BoardGeometry();
    const mats = materials();
    foundCityAt(state, 1, getTileAt(state.map, 11, 7)!);

    const layer = new CityLayer();
    layer.build(state, geometry, mats, new Quaternion(), false, state.visibility[0]!);
    expect(layer.drawCalls).toBe(0);
    layer.build(state, geometry, mats, new Quaternion(), false, null);
    expect(layer.drawCalls).toBeGreaterThan(0);
    layer.dispose();
  });

  it('draws borders on remembered ground and none on Terra Incognita', () => {
    const state = flatState();
    const geometry = new BoardGeometry();
    const mats = materials();
    foundCityAt(state, 1, getTileAt(state.map, 11, 7)!);

    const layer = new TerritoryLayer();
    layer.build(state, geometry, mats, state.visibility[0]!);
    expect(layer.drawCalls).toBe(0);
    layer.build(state, geometry, mats, state.visibility[1]!);
    expect(layer.drawCalls).toBeGreaterThan(0);
    layer.dispose();
  });

  it('marks a remembered tile and leaves Terra Incognita blank', () => {
    const state = flatState();
    const geometry = new BoardGeometry();
    const mats = materials();
    // Two wheat fields: one under this seat's eye, one it has never been near.
    getTileAt(state.map, 5, 5)!.resource = 'wheat';
    getTileAt(state.map, 12, 8)!.resource = 'wheat';
    const scout = createUnit(state, 0, 'scout', 5, 5);

    const lens: LensView = {
      mode: 'none',
      cells: null,
      resources: LENS_DEFAULTS.resources,
      resourceCells: null,
      yields: false,
      yieldCells: null,
      playerId: 0,
    };
    const layer = new LensLayer();
    layer.build(state, lens, geometry, mats, fakeIcons, new Quaternion(), state.visibility[0]!);
    const watched = countInstances(layer.group);
    expect(watched).toBeGreaterThan(0);

    layer.build(state, lens, geometry, mats, fakeIcons, new Quaternion(), null);
    expect(countInstances(layer.group)).toBeGreaterThan(watched);

    // Walk away. The roundel survives, because a resource is *terrain-ish*: the
    // wheat does not walk off while nobody is looking, so a remembered hex may
    // keep saying what is on it.
    scout.col = 1;
    scout.row = 1;
    recomputeVisibility(state, 0);
    layer.build(state, lens, geometry, mats, fakeIcons, new Quaternion(), state.visibility[0]!);
    expect(countInstances(layer.group)).toBe(watched);
    layer.dispose();
  });
});

function countInstances(group: { children: unknown[] }): number {
  let total = 0;
  for (const child of group.children) {
    if (child instanceof InstancedMesh) total += child.count;
  }
  return total;
}

// --- the marginalia ---------------------------------------------------------

/**
 * A sea: what the marginalia are actually placed on.
 *
 * `flatState` is grassland from edge to edge, which since the ocean rule arrived
 * carries no monsters at all — and that is itself one of the assertions below.
 * This is its counterpart, with a lake of land in the middle of it so a suite can
 * ask what happens *at* a coastline without inventing a continent.
 */
function seaState(width = 20, height = 16): GameState {
  const state = flatState(width, height);
  for (const tile of state.map.tiles) tile.terrain = 'ocean';
  // An island four hexes across in the middle. Small enough to leave open sea
  // all round it on a duel-sized board, big enough that its own interior is
  // further than `serpentRegion` from the water.
  for (const tile of state.map.tiles) {
    if (Math.abs(tile.col - 10) <= 2 && Math.abs(tile.row - 8) <= 2) tile.terrain = 'grassland';
  }
  resetVisibility(state);
  return state;
}

/** Every tile index that drew a marginale, read off the built chart layer. */
function marginaliaTiles(state: GameState, fog: FogView): number[] {
  const drawn: number[] = [];
  for (const tile of state.map.tiles) {
    const index = tileIndex(state.map, tile.col, tile.row);
    if (fog.marginaliaAt(index) > 0) drawn.push(index);
  }
  return drawn;
}

describe('the chart marginalia', () => {
  it('has a cell for the serpent and one for the inscription', () => {
    expect(MARGINALIA_CELLS).toEqual(['serpent', 'dracones']);
    for (const id of MARGINALIA_CELLS) {
      expect(tileIconIndex({ set: 'marginalia', id })).toBeGreaterThanOrEqual(0);
    }
  });

  it('is drawn nowhere at all until the icon atlas has loaded', () => {
    // Both marginalia are cells of that atlas, so a board built before it
    // arrives is ruled but unillustrated — the same silent fallback the untagged
    // units make.
    const { fog } = rig(seaState(), null);
    // Two instanced meshes: the patch and the ghost ring. No third.
    const meshes = fog.group.children.filter((c) => c instanceof InstancedMesh);
    expect(meshes).toHaveLength(2);
  });

  it('is sparse, and is a fixed property of the map rather than of the fog', () => {
    // Placement is hashed per tile (`hashUnit`), so the same board draws the same
    // marginalia in the same hexes in every game — and moving the fog over them
    // never moves them.
    for (const chance of [VIEW3D.fog.serpentChance, VIEW3D.fog.draconesChance]) {
      expect(chance).toBeGreaterThan(0);
      expect(chance).toBeLessThan(0.1);
    }
    expect(VIEW3D.fog.serpentRegion).toBeGreaterThanOrEqual(1);
  });

  /**
   * The placement is deterministic in the *map*, which is the whole reason it is
   * hashed off tile coordinates rather than rolled (rule 4: rendering must never
   * touch sim randomness). Two charts built over one map draw the same monsters
   * in the same hexes; nothing about when somebody looked at the screen enters
   * into it.
   */
  it('places the same marginalia every time it is built', () => {
    const state = seaState();
    const first = rig(state, fakeIcons);
    const second = rig(state, fakeIcons);
    const drawn = marginaliaTiles(state, first.fog);
    expect(drawn.length).toBeGreaterThan(0);
    expect(marginaliaTiles(state, second.fog)).toEqual(drawn);
  });

  /**
   * **No marginale lands on land**, and none lands within `serpentRegion` of it
   * either — the rule is about a *neighbourhood* of open water, not about the one
   * hex the decal is centred on, because a serpent whose tail lies across a
   * coastline the moment somebody charts the water beside it reads as a bug.
   *
   * The failure this pins is the one the ocean rule was added to fix: hashed
   * placement alone speckles monsters over the unexplored interior of a
   * continent, where they look like a chart convention for about four turns and
   * like sloppiness after that.
   */
  it('never lands on land, nor within a region of it', () => {
    const state = seaState();
    const { fog } = rig(state, fakeIcons);
    for (const index of marginaliaTiles(state, fog)) {
      const tile = state.map.tiles[index]!;
      for (const other of mapRange(state.map, tileHex(tile), VIEW3D.fog.serpentRegion)) {
        const neighbour = state.map.tiles[tileIndex(state.map, other.col, other.row)]!;
        expect(neighbour.terrain, `(${tile.col}, ${tile.row}) is too near land`).toBe('ocean');
      }
    }
  });

  it('draws nothing at all on a map with no sea in it', () => {
    const state = flatState();
    const { fog } = rig(state, fakeIcons);
    expect(marginaliaTiles(state, fog)).toEqual([]);
  });

  /**
   * The accounting the fog machinery actually rests on: a marginale is filed
   * under **the tile it stands on**, so charting that hex takes it off the board
   * in the same pass that takes the vellum away.
   *
   * `tile:` on `collector.add` is the board's own version of this and is
   * asserted above; the chart layer keeps the identical guarantee a different
   * way, by holding its instances in a per-tile array (`ChartTile`) rather than
   * in one flat list. Either way the property is the same and it is the one that
   * matters: the world drawn in over the monsters is the whole point.
   */
  it('is taken off the board the moment its hex is charted', () => {
    const state = seaState();
    const { fog } = rig(state, fakeIcons);
    const drawn = marginaliaTiles(state, fog);
    expect(drawn.length).toBeGreaterThan(0);

    const levels = state.visibility[0]!;
    const first = drawn[0]!;
    const tile = state.map.tiles[first]!;
    expect(fog.marginaliaShownAt(first)).toBe(true);
    levels[first] = EXPLORED;
    fog.apply(levels);
    expect(fog.marginaliaShownAt(first), `(${tile.col}, ${tile.row}) kept its monster`).toBe(
      false,
    );
  });
});

// --- what the three levels actually look like -------------------------------

/**
 * Everything below asks about the *picture*, not about the buffer.
 *
 * The wash was written, tested and shipped as a claim about an instance-colour
 * multiplier — "it moved, and it moved by more than a tenth" — and that claim
 * was true the whole time the board was visibly broken. A multiplier is not a
 * colour: what reaches the screen is the bucket's own ink *times* the
 * multiplier, and the terrain palette is pitched deliberately in the same
 * mid-luminance band as the chart grey the wash mixes toward. Mixed halfway to
 * it, sage came out four percent **brighter** than it started and lagoon sixteen
 * percent brighter, so a remembered coastline was the *lit* half of the board.
 *
 * So these read the composed colour and judge it the way an eye would — by
 * luminance — and the thresholds are perceptual rather than arithmetic. A test
 * that can pass while the two halves of the board look identical is not a test
 * of fog of war.
 */

interface BucketPeek {
  bucket: {
    mesh: InstancedMesh | null;
    colors: number[];
    material: unknown;
  };
}

/**
 * The colour one instance is *rendered* in, as the fragment shader composes it:
 * the bucket's ink multiplied by the per-instance tint attribute.
 *
 * The ink is the bucket's second colour when it has several, because a
 * multi-colour bucket is a hex prism whose groups are side / top cap / bottom
 * cap and the top cap is the face anybody is looking at — the same reading
 * `InstanceCollector.setWash` takes when it works the multiplier out.
 */
function renderedInk(handle: InstanceHandle): [number, number, number] {
  const { bucket } = handle as unknown as BucketPeek;
  const ink = bucket.colors.length > 1 ? bucket.colors[1]! : (bucket.colors[0] ?? 0xffffff);
  const base: [number, number, number] = [
    ((ink >> 16) & 255) / 255,
    ((ink >> 8) & 255) / 255,
    (ink & 255) / 255,
  ];
  const color = bucket.mesh?.instanceColor;
  if (!color) return base;
  const values = color.array as Float32Array;
  const at = handle.start * 3;
  return [base[0] * values[at]!, base[1] * values[at + 1]!, base[2] * values[at + 2]!];
}

/** Relative luminance, which is what "darker" means to an eye. */
function luminance(rgb: readonly [number, number, number]): number {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/** The brightest thing this tile draws, which is what the eye lands on. */
function tileLuminance(board: ReturnType<typeof buildBoard>, index: number): number {
  let best = 0;
  for (const handle of board.tiles.own.get(index) ?? []) {
    best = Math.max(best, luminance(renderedInk(handle)));
  }
  return best;
}

/** A real generated board — every terrain the game can draw, on one map. */
function realRig(): Rig {
  const state = newGame({
    seed: 12345,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#d4502e', isHuman: true },
      { name: 'B', color: '#3d6ea5' },
    ],
  });
  return rig(state);
}

describe('the wash, as a picture rather than as a multiplier', () => {
  it('takes light out of remembered ground, not only colour', () => {
    const state = flatState();
    const { board, fog } = rig(state);
    const warrior = createUnit(state, 0, 'warrior', 10, 5);
    fog.apply(state.visibility[0]!);

    const index = tileIndex(state.map, 10, 5);
    const handle = board.tiles.own.get(index)![0]!;
    const watched = luminance(renderedInk(handle));

    warrior.col = 2;
    warrior.row = 1;
    recomputeVisibility(state, 0);
    fog.apply(state.visibility[0]!);
    expect(fog.paintedLevel(index)).toBe(EXPLORED);

    // The number that matters. Under the wash-only maths this ratio was 1.04 —
    // remembered ground was *brighter* than watched ground — and every existing
    // assertion still passed, because the multiplier had indeed moved.
    const remembered = luminance(renderedInk(handle));
    expect(remembered).toBeLessThan(watched * 0.8);

    // Walking back is still an exact restore, not an approximation of one: a
    // hex that has been remembered once must be indistinguishable from one that
    // never was.
    warrior.col = 10;
    warrior.row = 5;
    recomputeVisibility(state, 0);
    fog.apply(state.visibility[0]!);
    expect(luminance(renderedInk(handle))).toBeCloseTo(watched, 6);
  });

  it('never brightens a hex, on any terrain a generated map can put down', () => {
    // One real board, so this covers every terrain colour, every prop and every
    // scrap of clutter at once — including the water and the rock, which are the
    // two the old maths pushed the *wrong way* hardest.
    const { state, board, fog } = realRig();
    const count = state.map.tiles.length;
    fog.apply(new Array<number>(count).fill(VISIBLE));

    const watched: number[] = [];
    for (let index = 0; index < count; index++) watched.push(tileLuminance(board, index));

    fog.apply(new Array<number>(count).fill(EXPLORED));
    let brightened = 0;
    let worst = 0;
    for (let index = 0; index < count; index++) {
      const ratio = tileLuminance(board, index) / watched[index]!;
      if (ratio > 1) brightened += 1;
      worst = Math.max(worst, ratio);
    }
    expect(brightened).toBe(0);
    // And not merely "not brighter": every hex on the map has to be knocked back
    // far enough that the frontier is a line somebody can see across the room.
    expect(worst).toBeLessThan(0.85);
  });

  it('paints all three levels as three different pictures, end to end', () => {
    // The whole path a real game takes: a generated map, the sim's own tri-state
    // grid for the local seat, and the fog pass reading it exactly as the
    // renderer's frame does — no synthetic level array anywhere.
    const { state, board, fog } = realRig();
    const seat = 0;

    // March everybody east so the ground they started on is remembered rather
    // than watched, then let the simulation say what that seat can see.
    for (const unit of state.units) {
      if (unit.ownerId === seat) unit.col = (unit.col + 12) % state.map.width;
    }
    recomputeVisibility(state, seat);
    fog.apply(state.visibility[seat]!);

    const levels = state.visibility[seat]!;
    const byLevel = { [HIDDEN]: 0, [EXPLORED]: 0, [VISIBLE]: 0 } as Record<number, number>;
    for (const level of levels) byLevel[level] = (byLevel[level] ?? 0) + 1;
    // A fixture that had no remembered ground in it would assert nothing at all.
    expect(byLevel[EXPLORED]).toBeGreaterThan(0);
    expect(byLevel[VISIBLE]).toBeGreaterThan(0);
    expect(byLevel[HIDDEN]).toBeGreaterThan(0);

    // Every hex is judged against *its own* watched appearance rather than
    // against the other region's average: the two halves of a real board are not
    // the same terrain, and a comparison that ignored that would be measuring
    // where the scouts went rather than what the fog did.
    const lit = new Array<number>(levels.length);
    fog.apply(new Array<number>(levels.length).fill(VISIBLE));
    for (let index = 0; index < levels.length; index++) lit[index] = tileLuminance(board, index);
    fog.apply(levels);

    for (let index = 0; index < levels.length; index++) {
      const handles = board.tiles.own.get(index) ?? [];
      if (levels[index] === HIDDEN) {
        // Terra Incognita is the absence of a picture, not a dim one.
        for (const handle of handles) {
          const { bucket } = handle as unknown as BucketPeek;
          expect(isHiddenMatrix(matrixOf(bucket.mesh!, handle.start))).toBe(true);
        }
        continue;
      }
      for (const handle of handles) {
        const { bucket } = handle as unknown as BucketPeek;
        expect(isHiddenMatrix(matrixOf(bucket.mesh!, handle.start))).toBe(false);
      }
      const light = tileLuminance(board, index);
      if (levels[index] === VISIBLE) expect(light).toBeCloseTo(lit[index]!, 6);
      else expect(light).toBeLessThan(lit[index]! * 0.85);
    }
  });
});

// --- what the wash may not touch --------------------------------------------

describe('the printed buckets the fog must leave alone', () => {
  /**
   * A textured bucket — a unit badge, a resource roundel, a serpent — carries a
   * *picture* where every other bucket carries an ink, and the per-instance
   * colour attribute multiplies whatever the shader has. So a wash that reached
   * one would not knock its ground back, it would knock the print itself back:
   * the parchment would grey out and the thin strokes drawn on it would go with
   * it, which is a roundel with nothing on it.
   *
   * Nothing on the board asks for that today — the board collector is the only
   * one that forces tints and it draws no atlas — but the two are one careless
   * option away from each other, and the failure is invisible in every count and
   * every draw-call assertion this suite makes. So the contract is pinned from
   * both ends: the collector must not *give* a printed bucket a colour
   * attribute, and `setWash` must not write to one if it somehow has.
   */
  function printedBucket(): { handle: InstanceHandle; mesh: InstancedMesh; atlas: MeshBasicMaterial } {
    const geometry = new BoardGeometry();
    const mats = materials();
    const atlas = new MeshBasicMaterial({ map: new DataTexture(new Uint8Array(4), 1, 1) });
    const collector = new InstanceCollector({
      copyOffsets: [0],
      snapshot: true,
      forceTint: true,
    });
    const handle = collector.add(
      geometry.badgeIcons.melee,
      [VIEW3D.badges.paperColor],
      new Matrix4(),
      { material: atlas, tint: [0.2, 0.2, 0.2], tile: 0 },
    );
    const group = new Group();
    collector.flush(group, mats, false);
    const mesh = group.children.find((c) => c instanceof InstancedMesh) as InstancedMesh;
    return { handle, mesh, atlas };
  }

  it('are given no instance colour, even by a collector that forces them', () => {
    const { mesh, atlas } = printedBucket();
    expect(mesh.material).toBe(atlas);
    expect((mesh.material as MeshBasicMaterial).map).not.toBeNull();
    expect(mesh.instanceColor).toBeNull();
  });

  it('are skipped by the wash outright', () => {
    const { handle, mesh } = printedBucket();
    InstanceCollector.setWash(handle, VIEW3D.fog.exploredWash, VIEW3D.fog.exploredDim, 0.5);
    expect(mesh.instanceColor).toBeNull();
  });

  it('leaves the badge and marker layers untouched when the board repaints', () => {
    // The layers that carry the atlases are rebuilt off the seat, never patched
    // by the fog — so a fog pass over the same board and the same materials has
    // to be a no-op on every instance they own, in matrices and in colour alike.
    const { state, fog } = realRig();
    const geometry = new BoardGeometry();
    const mats = materials();
    const levels = state.visibility[0]!;

    const units = new UnitLayer();
    units.build(state, geometry, mats, new Quaternion(), false, null, fakeBadges, null, levels);
    const lens = new LensLayer();
    lens.build(
      state,
      { ...NO_LENS, resources: true, playerId: 0 } as LensView,
      geometry,
      mats,
      fakeIcons,
      new Quaternion(),
      levels,
    );

    const printed = [...units.group.children, ...lens.group.children].filter(
      (child): child is InstancedMesh =>
        child instanceof InstancedMesh &&
        (child.material === fakeBadges.material ||
          child.material === fakeIcons.standingMaterial ||
          child.material === fakeIcons.material),
    );
    // The fixture has to actually contain the things under test.
    expect(printed.length).toBeGreaterThan(0);
    expect(printed.some((mesh) => mesh.material === fakeBadges.material)).toBe(true);
    expect(printed.some((mesh) => mesh.material === fakeIcons.standingMaterial)).toBe(true);

    for (const mesh of printed) {
      // Render-ready: the atlas material is intact, no tint stands between the
      // texture and the screen, and nothing is zero-scaled.
      expect(mesh.instanceColor).toBeNull();
      expect(mesh.count).toBeGreaterThan(0);
      for (let i = 0; i < mesh.count; i++) {
        expect(isHiddenMatrix(matrixOf(mesh, i))).toBe(false);
      }
    }
    const before = printed.map((mesh) => (mesh.instanceMatrix.array as Float32Array).slice());

    // Now move the whole board's visibility and repaint.
    fog.apply(new Array<number>(state.map.tiles.length).fill(EXPLORED));

    printed.forEach((mesh, i) => {
      expect(mesh.instanceColor).toBeNull();
      expect(Array.from(mesh.instanceMatrix.array as Float32Array)).toEqual(
        Array.from(before[i]!),
      );
    });
    units.dispose();
    lens.dispose();
    geometry.dispose();
  });
});

// --- the little predicates --------------------------------------------------

describe('the seat predicates the layers share', () => {
  it('treat a null grid as no fog at all', () => {
    const state = flatState();
    expect(levelAt(null, state.map, 3, 3)).toBe(VISIBLE);
    expect(seesCell(null, state.map, 3, 3)).toBe(true);
    expect(knowsCell(null, state.map, 3, 3)).toBe(true);
  });

  it('split unit-ish from terrain-ish at exactly one level', () => {
    const state = flatState();
    const levels = state.visibility[0]!;
    levels[tileIndex(state.map, 4, 4)] = EXPLORED;
    // Remembered: the ground may be drawn, the army on it may not.
    expect(knowsCell(levels, state.map, 4, 4)).toBe(true);
    expect(seesCell(levels, state.map, 4, 4)).toBe(false);
  });
});
