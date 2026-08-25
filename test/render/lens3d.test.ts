import { describe, expect, it } from 'vitest';
import { InstancedMesh, MeshBasicMaterial, Quaternion } from 'three';

import { type TileIcons, tileIconFlags } from '../../src/render3d/badges3d';
import { BoardGeometry, buildBoard } from '../../src/render3d/board3d';
import { RENDER_ORDER } from '../../src/render3d/instances';
import { LensLayer, NO_LENS, sameLens } from '../../src/render3d/lens3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { MaterialLibrary } from '../../src/render3d/toon';
import { type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { type GameState, newGame } from '../../src/sim/state';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';
import { computeFreshwater } from '../../src/sim/water';
import type { LensView } from '../../src/ui/mapView';

function lens(overrides: Partial<LensView> = {}): LensView {
  return { ...NO_LENS, ...overrides };
}

/**
 * `sameLens` is the guard on a rebuild that throws away and remakes a few
 * thousand instances, so it has to be exactly right in both directions: a false
 * "same" leaves a stale picture on the board, and a false "different" rebuilds
 * the layer on every mouse move.
 */
describe('sameLens', () => {
  it('is true for the plain board against itself', () => {
    expect(sameLens(NO_LENS, lens())).toBe(true);
  });

  it('separates the lens mode from the two switches', () => {
    expect(sameLens(lens({ mode: 'none' }), lens({ mode: 'settler' }))).toBe(false);
    expect(sameLens(lens({ yields: false }), lens({ yields: true }))).toBe(false);
    expect(sameLens(lens({ resources: false }), lens({ resources: true }))).toBe(false);
    // All three are independent, so a lens with a switch up is not the lens
    // without it.
    expect(
      sameLens(lens({ mode: 'settler', yields: true }), lens({ mode: 'settler' })),
    ).toBe(false);
    expect(
      sameLens(lens({ mode: 'settler', resources: true }), lens({ mode: 'settler' })),
    ).toBe(false);
  });

  it('notices the seat, because the settler lens judges ownership by it', () => {
    expect(sameLens(lens({ playerId: 0 }), lens({ playerId: 1 }))).toBe(false);
  });

  it('compares the wash restriction by value, not by identity', () => {
    const a = lens({ mode: 'settler', cells: [{ col: 1, row: 2 }] });
    const b = lens({ mode: 'settler', cells: [{ col: 1, row: 2 }] });
    expect(sameLens(a, b)).toBe(true);
    expect(sameLens(a, lens({ mode: 'settler', cells: [{ col: 1, row: 3 }] }))).toBe(false);
    expect(sameLens(a, lens({ mode: 'settler', cells: null }))).toBe(false);
    expect(
      sameLens(a, lens({ mode: 'settler', cells: [{ col: 1, row: 2 }, { col: 2, row: 2 }] })),
    ).toBe(false);
  });

  it('compares the pip restriction the same way, while the pips are up', () => {
    const a = lens({ yields: true, yieldCells: [{ col: 4, row: 4 }] });
    expect(sameLens(a, lens({ yields: true, yieldCells: [{ col: 4, row: 4 }] }))).toBe(true);
    expect(sameLens(a, lens({ yields: true, yieldCells: [{ col: 5, row: 4 }] }))).toBe(false);
    expect(sameLens(a, lens({ yields: true, yieldCells: null }))).toBe(false);
  });

  it('ignores the pip restriction while the pips are down', () => {
    // Nothing is drawn from it, so a change to it is not a change to look at.
    const off = lens({ yields: false, yieldCells: [{ col: 4, row: 4 }] });
    expect(sameLens(off, lens({ yields: false, yieldCells: null }))).toBe(true);
  });

  it('compares the roundel restriction the same way, and only while they are up', () => {
    const a = lens({ resources: true, resourceCells: [{ col: 4, row: 4 }] });
    expect(sameLens(a, lens({ resources: true, resourceCells: [{ col: 4, row: 4 }] }))).toBe(true);
    expect(sameLens(a, lens({ resources: true, resourceCells: [{ col: 5, row: 4 }] }))).toBe(false);
    expect(sameLens(a, lens({ resources: true, resourceCells: null }))).toBe(false);
    const off = lens({ resources: false, resourceCells: [{ col: 4, row: 4 }] });
    expect(sameLens(off, lens({ resources: false, resourceCells: null }))).toBe(true);
  });

  it('notices the reveal, and only while the roundels are up', () => {
    // The mapgen page's spectator switch (`LensView.revealResources`): it changes
    // which markers are drawn, so it is a rebuild — but with the roundels down
    // there are no markers for it to change.
    const on = lens({ resources: true, revealResources: true });
    expect(sameLens(on, lens({ resources: true, revealResources: false }))).toBe(false);
    expect(sameLens(on, lens({ resources: true, revealResources: true }))).toBe(true);
    // Absent means off, so an omitted flag must not read as a different lens.
    const bare: LensView = { ...NO_LENS, resources: true };
    delete bare.revealResources;
    expect(sameLens(bare, lens({ resources: true, revealResources: false }))).toBe(true);
    const off = lens({ resources: false, revealResources: true });
    expect(sameLens(off, lens({ resources: false, revealResources: false }))).toBe(true);
  });

  it('is symmetric', () => {
    const a = lens({ mode: 'settler', yields: true, yieldCells: [{ col: 1, row: 1 }] });
    const b = lens({ mode: 'settler', yields: true, yieldCells: null });
    expect(sameLens(a, b)).toBe(sameLens(b, a));
    expect(sameLens(a, a)).toBe(true);
  });
});


// --- the explorer lens ------------------------------------------------------

function flatState(width = 10, height = 8): GameState {
  const state = newGame({
    seed: 4,
    sizeName: 'duel',
    players: [{ name: 'A', color: '#a00', isHuman: true }],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  for (const tile of state.map.tiles) delete tile.discovery;
  computeFreshwater(state.map);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** A fog grid at one level everywhere, with named exceptions. */
function grid(state: GameState, base: number, except: Record<string, number> = {}): number[] {
  const out = new Array<number>(state.map.tiles.length).fill(base);
  for (const [key, level] of Object.entries(except)) {
    const [col, row] = key.split(',').map(Number);
    out[tileIndex(state.map, col!, row!)] = level;
  }
  return out;
}

const fakeIcons = {
  material: new MeshBasicMaterial(),
  standingMaterial: new MeshBasicMaterial(),
} as unknown as TileIcons;

/**
 * Instances per marked hex: a wash and a ring, each replicated at the three wrap
 * offsets every collector on this board uses. Written as its two factors so the
 * arithmetic in the assertions stays readable as "this many hexes are marked".
 */
const PER_MARK = 2 * 3;

function countInstances(group: { children: unknown[] }): number {
  let total = 0;
  for (const child of group.children) {
    if (child instanceof InstancedMesh) total += child.count;
  }
  return total;
}

/**
 * The explorer lens draws the board's *sites*, so its whole risk surface is
 * agreeing with the layer that draws the props: the two must never disagree
 * about whether a hex has something on it, and they answer to two different fog
 * rules to stay that way (see `sites3d.ts`). A ring around a hex the board is
 * drawing nothing on is a promise the game breaks.
 */
describe('the explorer lens', () => {
  const geometry = new BoardGeometry();
  const mats = (): MaterialLibrary =>
    new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);

  function build(state: GameState, levels: number[] | null): LensLayer {
    const layer = new LensLayer();
    layer.build(
      state,
      lens({ mode: 'explorer' }),
      geometry,
      mats(),
      fakeIcons,
      new Quaternion(),
      levels,
    );
    return layer;
  }

  it('marks every unclaimed site and nothing else', () => {
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    at(state, 5, 3).discovery = 'village';

    const layer = build(state, grid(state, VISIBLE));
    expect(countInstances(layer.group)).toBe(2 * PER_MARK);
    layer.dispose();
  });

  it('draws nothing on a board with nothing left to find', () => {
    const state = flatState();
    const layer = build(state, grid(state, VISIBLE));
    expect(countInstances(layer.group)).toBe(0);
    layer.dispose();
  });

  /**
   * "Unclaimed" needs no test of its own in the lens, because the claim *deletes*
   * the field it reads (`claimDiscoveryAt`). This is that identity pinned: the
   * lens goes quiet on the same edit the prop disappears on.
   */
  it('goes dark on a site the moment it is claimed', () => {
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    const lit = build(state, grid(state, VISIBLE));
    expect(countInstances(lit.group)).toBe(PER_MARK);
    lit.dispose();

    delete at(state, 2, 2).discovery;
    const dark = build(state, grid(state, VISIBLE));
    expect(countInstances(dark.group)).toBe(0);
    dark.dispose();
  });

  it('keeps a site marked on remembered ground and unmarked on unexplored ground', () => {
    // The ground rule: a ruin is a coastline, so the chart may go on saying it
    // is there. Terra Incognita gets nothing, which needs no argument.
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';

    const remembered = build(state, grid(state, EXPLORED));
    expect(countInstances(remembered.group)).toBe(PER_MARK);
    remembered.dispose();

    const unknown = build(state, grid(state, HIDDEN));
    expect(countInstances(unknown.group)).toBe(0);
    unknown.dispose();
  });

  it('marks a camp only where the seat is looking right now', () => {
    // The occupation rule, and the reason the lens cannot use one fog rule for
    // both: a remembered camp ringed in red is a warning about an army that may
    // have moved on ten turns ago — and the board is not drawing the stockade
    // there either.
    const state = flatState();
    state.camps.push({ col: 7, row: 5, foundedTurn: 1 });

    const watched = build(state, grid(state, VISIBLE));
    expect(countInstances(watched.group)).toBe(PER_MARK);
    watched.dispose();

    const remembered = build(state, grid(state, EXPLORED));
    expect(countInstances(remembered.group)).toBe(0);
    remembered.dispose();
  });

  it('marks a site and a camp in two different inks', () => {
    // Go here, and do not walk into that. Colour is the bucket key, so two inks
    // is two buckets per shape — the observable form of "these are not two
    // grades of one thing".
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    state.camps.push({ col: 7, row: 5, foundedTurn: 1 });

    const layer = build(state, grid(state, VISIBLE));
    expect(countInstances(layer.group)).toBe(2 * PER_MARK);
    const meshes = layer.group.children.filter(
      (child): child is InstancedMesh => child instanceof InstancedMesh,
    );
    // Four buckets: wash and ring, in each of the two inks.
    expect(meshes).toHaveLength(4);
    expect(VIEW3D.lens.campColor).not.toBe(VIEW3D.lens.discoveryColor);
    layer.dispose();
  });

  it('draws everything when there is no fog at all', () => {
    // The look-dev reading, matching the site layer: no seat, nothing to hide.
    const state = flatState();
    at(state, 2, 2).discovery = 'ruins';
    state.camps.push({ col: 7, row: 5, foundedTurn: 1 });
    const layer = build(state, null);
    expect(countInstances(layer.group)).toBe(2 * PER_MARK);
    layer.dispose();
  });

  it('is a lens of its own as far as the rebuild guard is concerned', () => {
    expect(sameLens(lens({ mode: 'explorer' }), lens({ mode: 'none' }))).toBe(false);
    expect(sameLens(lens({ mode: 'explorer' }), lens({ mode: 'settler' }))).toBe(false);
    expect(sameLens(lens({ mode: 'explorer' }), lens({ mode: 'explorer' }))).toBe(true);
  });
});

// --- the flat readouts and the ground they are printed on --------------------

/**
 * The bug this block pins is a *pass*, not a lift and not a draw order.
 *
 * Three splits every frame into an opaque pass and a transparent one, draws the
 * whole of the first before any of the second, and sorts by `renderOrder` only
 * *within* each. The yield glyphs were alpha-tested and not flagged transparent,
 * which left them in the opaque pass: they beat the pines (opaque, and collected
 * with a lower order) and lost to every blended decal on the board — the
 * territory tint, the shore band, and, the day the arid features landed, an
 * oasis pool and a floodplain wash printed straight over a tile's figures.
 *
 * So the assertion is written the way the renderer actually decides: which pass,
 * then which order. A test that only compared `renderOrder` would have passed
 * for the whole life of the bug.
 */
function drawsAfter(
  a: { mesh: InstancedMesh; material: MeshBasicMaterial },
  b: { mesh: InstancedMesh; material: MeshBasicMaterial },
): boolean {
  if (a.material.transparent !== b.material.transparent) return a.material.transparent;
  return a.mesh.renderOrder > b.mesh.renderOrder;
}

/** Every instanced mesh in a group with the single material it is drawn with. */
function drawn(group: { children: unknown[] }): {
  mesh: InstancedMesh;
  material: MeshBasicMaterial;
}[] {
  const out: { mesh: InstancedMesh; material: MeshBasicMaterial }[] = [];
  for (const child of group.children) {
    if (!(child instanceof InstancedMesh)) continue;
    if (Array.isArray(child.material)) continue;
    out.push({ mesh: child, material: child.material as MeshBasicMaterial });
  }
  return out;
}

describe('a tile\'s yields are the last thing printed on it', () => {
  const geometry = new BoardGeometry();
  const mats = (): MaterialLibrary =>
    new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);

  /** The real flat-icon material, which is the half of the fix that is a flag. */
  const realIcons = {
    material: new MeshBasicMaterial(tileIconFlags()),
    standingMaterial: new MeshBasicMaterial(),
  } as unknown as TileIcons;

  it('flags the flat atlas transparent, which is the only way an order exists', () => {
    const flags = tileIconFlags();
    // The pass. Without it the number below means nothing at all.
    expect(flags.transparent).toBe(true);
    // Still a cutout, so a stack of coins sorts by collection order and an edge
    // stays crisp; still ignoring depth, because a readout is not scenery.
    expect(flags.alphaTest).toBeGreaterThan(0);
    expect(flags.depthTest).toBe(false);
    expect(flags.depthWrite).toBe(false);
    // Above the interface's own washes, below the tags naming a piece.
    expect(RENDER_ORDER.tileIcon).toBeGreaterThan(RENDER_ORDER.onTop);
    expect(RENDER_ORDER.tileIcon).toBeLessThan(RENDER_ORDER.badge);
  });

  it('draws a glyph over the oasis pool and the floodplain wash under it', () => {
    const map = createMap({ width: 8, height: 6, terrain: 'desert' });
    // The two arid features, side by side: a pool (all but opaque) and a wash.
    getTileAt(map, 3, 3)!.feature = 'oasis';
    getTileAt(map, 4, 3)!.feature = 'floodplain';
    const board = buildBoard(map, geometry, mats(), false);

    const state = flatState();
    state.map = map;
    resetVisibility(state);
    const layer = new LensLayer();
    layer.build(
      state,
      lens({ yields: true }),
      geometry,
      mats(),
      realIcons,
      new Quaternion(),
      null,
    );

    const glyphs = drawn(layer.group);
    expect(glyphs.length).toBeGreaterThan(0);
    const ground = drawn(board.group).filter(
      ({ mesh }) => mesh.geometry === geometry.pool || mesh.geometry === geometry.floodWash,
    );
    // Both features really are on this board, or the comparison below is vacuous.
    expect(ground.map(({ mesh }) => mesh.geometry)).toContain(geometry.pool);
    expect(ground.map(({ mesh }) => mesh.geometry)).toContain(geometry.floodWash);
    for (const glyph of glyphs) {
      for (const decal of ground) expect(drawsAfter(glyph, decal)).toBe(true);
    }
    layer.dispose();
  });

  it('still beats the trees, which is what it never stopped doing', () => {
    const map = createMap({ width: 8, height: 6, terrain: 'grassland' });
    getTileAt(map, 3, 3)!.feature = 'forest';
    const board = buildBoard(map, geometry, mats(), false);

    const state = flatState();
    state.map = map;
    resetVisibility(state);
    const layer = new LensLayer();
    layer.build(
      state,
      lens({ yields: true, yieldCells: [{ col: 3, row: 3 }] }),
      geometry,
      mats(),
      realIcons,
      new Quaternion(),
      null,
    );

    const pines = drawn(board.group).filter(({ mesh }) => mesh.geometry === geometry.pine);
    expect(pines.length).toBeGreaterThan(0);
    for (const glyph of drawn(layer.group)) {
      for (const pine of pines) expect(drawsAfter(glyph, pine)).toBe(true);
    }
    layer.dispose();
  });
});
