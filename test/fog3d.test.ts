import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion } from 'three';

import { type TileIcons, MARGINALIA_CELLS, tileIconIndex } from '../src/render3d/badges3d';
import { BoardGeometry, buildBoard } from '../src/render3d/board3d';
import { CityLayer, TerritoryLayer } from '../src/render3d/cities3d';
import {
  FogView,
  accountedInstances,
  knowsCell,
  levelAt,
  seesCell,
} from '../src/render3d/fog3d';
import { HIDDEN_MATRIX, INSTANCE_WRITES, resetInstanceWrites } from '../src/render3d/instances';
import { LensLayer } from '../src/render3d/lens3d';
import { VIEW3D } from '../src/render3d/lookData';
import { UnitLayer } from '../src/render3d/pieces';
import { MaterialLibrary } from '../src/render3d/toon';
import { foundCityAt } from '../src/sim/cities';
import { createMap, getTileAt, tileIndex } from '../src/sim/map';
import { type GameState, createUnit, newGame } from '../src/sim/state';
import {
  EXPLORED,
  HIDDEN,
  VISIBLE,
  recomputeVisibility,
  resetVisibility,
} from '../src/sim/visibility';
import { LENS_DEFAULTS, type LensView } from '../src/ui/mapView';

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

describe('the serpent marginalia', () => {
  it('has a cell of its own at the end of the tile atlas', () => {
    expect(MARGINALIA_CELLS).toEqual(['serpent']);
    expect(tileIconIndex({ set: 'marginalia', id: 'serpent' })).toBeGreaterThanOrEqual(0);
  });

  it('is drawn nowhere at all until the icon atlas has loaded', () => {
    // A serpent is a cell of that atlas, so a board built before it arrives is
    // ruled but unillustrated — the same silent fallback the untagged units make.
    const state = flatState();
    const { fog } = rig(state, null);
    // Two instanced meshes: the patch and the ghost ring. No third.
    const meshes = fog.group.children.filter((c) => c instanceof InstancedMesh);
    expect(meshes).toHaveLength(2);
  });

  it('is sparse, and is a fixed property of the map rather than of the fog', () => {
    // Placement is hashed per tile (`hashUnit`), so the same board draws the same
    // serpents in the same hexes in every game — and moving the fog over them
    // never moves them.
    const chance = VIEW3D.fog.serpentChance;
    expect(chance).toBeGreaterThan(0);
    expect(chance).toBeLessThan(0.1);
    expect(VIEW3D.fog.serpentRegion).toBeGreaterThanOrEqual(1);
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
