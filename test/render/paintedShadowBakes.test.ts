/**
 * When the static sun re-bakes, decided from what the caster layers drew.
 *
 * WebGL audit 2026-10-06, finding 6. The bake used to follow map-wide
 * fingerprints (`signCities`, `signImprovements`, `signPaintedWorks`,
 * `signSites`), so a rival's town growing or a farm going up where the seat had
 * never looked re-rendered the whole static shadow map; in a bot game that was
 * every end of turn. These tests drive the renderer's real rebuild code over the
 * real painted city, works and site layers (stand-in box sculpts on a small
 * prepared map) and count the bakes it asks for.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BoxGeometry, BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial, MeshStandardMaterial,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Renderer3D, signDrawnImprovements, signDrawnProps, signDrawnSites } from '../../src/render3d/renderer3d';
import { PaintedCityLayer, type PaintedCityAssets } from '../../src/render3d/paintedCities';
import { PaintedWorksLayer, PAINTED_WORK_ASSET_NAMES, type PaintedWorksAssets } from '../../src/render3d/paintedWorks';
import { PaintedSiteLayer, PAINTED_SITE_ASSET_NAMES } from '../../src/render3d/paintedSites';
import { installPaintedSurface, uninstallPaintedSurface } from '../../src/render3d/paintedSurface';
import { signCityCells } from '../../src/render3d/cities3d';
import { signImprovedCells } from '../../src/render3d/improvements3d';
import { signFeatureCells } from '../../src/render3d/board3d';
import { wrapWidth } from '../../src/render3d/layout';
import { newGame, type GameState } from '../../src/sim/state';
import { createMap, getTileAt, tileIndex, type GameMap } from '../../src/sim/map';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';
import { foundCityAt } from '../../src/sim/cities';
// @ts-expect-error No declarations for the shared study geometry.
import { prepareTerrainMap } from '../../src/terrainStudy/surface.js';
// @ts-expect-error No declarations for the shared study geometry.
import { terrainMesh } from '../../src/terrainStudy/terrainMesh.js';

const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); });

const box = (): BufferGeometry => {
  const geometry = new BoxGeometry(.2, .3, .2);
  geometry.translate(0, .15, 0);
  geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3).fill(1), 3));
  cleanups.push(() => geometry.dispose());
  return geometry;
};

function assets<T>(names: readonly string[]): T {
  const material = new MeshStandardMaterial({ color: 'white', vertexColors: true });
  cleanups.push(() => material.dispose());
  return { material, ...Object.fromEntries(names.map(name => [name, box()])) } as T;
}

const WIDTH = 12;
const OURS = { col: 3, row: 2 }, THEIRS = { col: 9, row: 5 };

function fixture() {
  const state = newGame({ seed: 7, sizeName: 'duel', players: [
    { name: 'A', color: '#ac3333', isHuman: true }, { name: 'B', color: '#3344ac', isHuman: true },
  ] });
  state.map = createMap({ width: WIDTH, height: 8, terrain: 'grassland' });
  state.units = []; state.cities = []; state.camps = []; state.nextEntityId = 1;
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state);
  foundCityAt(state, 0, getTileAt(state.map, OURS.col, OURS.row)!);
  foundCityAt(state, 1, getTileAt(state.map, THEIRS.col, THEIRS.row)!);
  const levels = state.visibility[0]!;
  levels.fill(VISIBLE);
  // The rival's corner of the map is ground this seat has never charted.
  for (let row = 4; row < 8; row++) for (let col = 7; col < WIDTH; col++) levels[row * WIDTH + col] = HIDDEN;
  const [ours, theirs] = state.cities as [GameState['cities'][number], GameState['cities'][number]];

  const prepared = prepareTerrainMap(state.map, { wrap: true }) as GameMap;
  const material = new MeshBasicMaterial({ side: DoubleSide }), tops: BufferGeometry[] = [];
  for (const tile of prepared.tiles) {
    const [top, side] = terrainMesh(tile) as [BufferGeometry, BufferGeometry]; side.dispose();
    for (const name of Object.keys(top.attributes)) if (name !== 'position') top.deleteAttribute(name);
    tops.push(top);
  }
  const terrain = mergeGeometries(tops)!; tops.forEach(top => top.dispose());
  const meshes = [-1, 0, 1].map(copy => { const mesh = new Mesh(terrain, material); mesh.position.x = copy * wrapWidth(state.map); return mesh; });
  installPaintedSurface(state.map, prepared, meshes);
  cleanups.push(() => { uninstallPaintedSurface(state.map); terrain.dispose(); material.dispose(); });

  const paintedCities = new PaintedCityLayer(assets<PaintedCityAssets>(
    ['city-house', 'city-loggia', 'civic-sanctum', 'city-spire', 'city-dome', 'house', 'temple', 'bell-tower']), () => undefined);
  const paintedWorks = new PaintedWorksLayer(assets<PaintedWorksAssets>(PAINTED_WORK_ASSET_NAMES), () => undefined);
  const paintedSites = new PaintedSiteLayer(assets<PaintedWorksAssets>([...PAINTED_SITE_ASSET_NAMES, ...PAINTED_WORK_ASSET_NAMES]), () => undefined);
  cleanups.push(() => { paintedCities.dispose(); paintedWorks.dispose(); paintedSites.dispose(); });

  let bakes = 0;
  const data: Record<string, unknown> = {
    state, map: state.map, fogSeat: 0, visibilitySignatures: null,
    paintedBoard: { renderMap: prepared, replaceHillRelief: () => false, reserveFootprints() {}, pickMeshes: [] },
    paintedCities, paintedWorks, paintedSites, paintedRoads: null, paintedTerritory: null,
    paintedLook: { invalidateShadows: () => { bakes++; }, invalidateDynamicShadows() {} },
    // The plain layers' builds stand in: in the painted look they draw only
    // flags and pins, and what they would draw is read off the state.
    cities: { build() {} }, improvements: { build() {} }, sites: { build() {} }, overlays: { invalidateSurface() {} },
    view: { facing: { clone: () => null } }, shadows: true, icons: null, cityWallPreview: false, cleared: new Map(),
    lensView: { mode: 'none', yields: false, resources: false }, religionSignature: 0,
    clearedCitiesSignature: signCityCells(state), clearedImprovementsSignature: signImprovedCells(state),
    clearedFeaturesSignature: signFeatureCells(state.map),
    applyFog: () => ({ tiles: 0 }), applyReveal: () => null, reveal: null,
    setHoveredUnitId: vi.fn(), rebuildOverlays: vi.fn(), rebuildLens: vi.fn(), invalidate: vi.fn(),
    rebuildUnits: vi.fn(), rebuildTerritory: vi.fn(), rebuildRoads: vi.fn(),
    cityBannerAnchors: new Map(), clearGround: vi.fn(),
  };
  const runtime = Object.assign(Object.create(Renderer3D.prototype), data) as Renderer3D;
  runtime.setGameState(state);
  /** How many times one state refresh asked for the static map to be re-baked. */
  const frame = (): number => { const before = bakes; runtime.setGameState(state); return bakes - before; };
  return { state, levels, ours, theirs, frame };
}

const cell = (col: number, row: number): number => row * WIDTH + col;

describe('the static shadow bake', () => {
  it('does nothing on a frame where nothing changed', () => {
    const f = fixture();
    expect(f.frame()).toBe(0);
  });

  it('ignores a town growing where the seat cannot see, and bakes for one it can', () => {
    const f = fixture();
    f.theirs.population += 3;
    expect(f.frame()).toBe(0);
    f.ours.population += 3;
    expect(f.frame()).toBe(1);
    expect(f.frame()).toBe(0);
  });

  it('keeps a town through the seen/remembered flip, and re-cuts it seen again after it grew', () => {
    const f = fixture();
    const at = cell(THEIRS.col, THEIRS.row);
    f.levels[at] = VISIBLE;
    expect(f.frame()).toBe(1); // first sight: new stones
    f.levels[at] = EXPLORED;
    expect(f.frame()).toBe(0); // out of sight: not a bake, as before
    f.theirs.population += 2;
    expect(f.frame()).toBe(0); // grew while remembered: nobody saw it
    f.levels[at] = VISIBLE;
    expect(f.frame()).toBe(1); // seen again: the new cut casts a new shadow
  });

  it('bakes when a charted town drops back to uncharted ground', () => {
    const f = fixture();
    f.levels[cell(OURS.col, OURS.row)] = HIDDEN;
    expect(f.frame()).toBe(1);
  });

  it('ignores a farm built on uncharted ground, and bakes for one on charted ground', () => {
    const f = fixture();
    f.state.map.tiles[cell(10, 6)]!.improvement = 'farm';
    expect(f.frame()).toBe(0);
    f.state.map.tiles[cell(5, 5)]!.improvement = 'farm';
    expect(f.frame()).toBe(1);
    expect(f.frame()).toBe(0);
  });

  it('keeps a farm’s shadow through the seen/remembered flip', () => {
    const f = fixture();
    f.state.map.tiles[cell(5, 5)]!.improvement = 'farm';
    expect(f.frame()).toBe(1);
    f.levels[cell(5, 5)] = EXPLORED;
    expect(f.frame()).toBe(0);
  });

  it('ignores ruins on uncharted ground, and bakes for ruins on charted ground', () => {
    const f = fixture();
    f.state.map.tiles[cell(11, 7)]!.discovery = 'ruins';
    expect(f.frame()).toBe(0);
    f.state.map.tiles[cell(1, 6)]!.discovery = 'ruins';
    expect(f.frame()).toBe(1);
  });
});

describe('the drawn-content signatures', () => {
  it('ignore an entry’s fog level and follow what stands on it', () => {
    const base = [{ cell: 4, resource: null, improvement: 'farm' as const, level: VISIBLE }];
    expect(signDrawnProps([{ ...base[0]!, level: EXPLORED }])).toBe(signDrawnProps(base));
    expect(signDrawnProps([{ ...base[0]!, improvement: 'mine' as const }])).not.toBe(signDrawnProps(base));
    expect(signDrawnProps([{ ...base[0]!, cell: 5 }])).not.toBe(signDrawnProps(base));
    expect(signDrawnProps([])).not.toBe(signDrawnProps(base));
  });

  it('count the plain layers’ improvements and sites on charted ground only', () => {
    const f = fixture();
    const before = signDrawnImprovements(f.state, f.levels, null);
    const sitesBefore = signDrawnSites(f.state, f.levels, 0, null, false);
    f.state.map.tiles[cell(10, 6)]!.improvement = 'farm';
    f.state.camps.push({ col: 10, row: 7 } as GameState['camps'][number]);
    expect(signDrawnImprovements(f.state, f.levels, null)).toBe(before);
    expect(signDrawnSites(f.state, f.levels, 0, null, false)).toBe(sitesBefore);
    f.state.map.tiles[cell(2, 6)]!.improvement = 'farm';
    f.state.camps.push({ col: 2, row: 7 } as GameState['camps'][number]);
    expect(signDrawnImprovements(f.state, f.levels, null)).not.toBe(before);
    expect(signDrawnSites(f.state, f.levels, 0, null, false)).not.toBe(sitesBefore);
    // A row the painted works draw instead is not this layer's.
    expect(signDrawnImprovements(f.state, f.levels, new Set(['farm']))).toBe(signDrawnImprovements(f.state, f.levels, new Set(['farm', 'mine'])));
    expect(tileIndex(f.state.map, 2, 6)).toBe(cell(2, 6));
  });
});
