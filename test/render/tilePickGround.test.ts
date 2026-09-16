/**
 * The hex under the cursor is the hex whose *ground* the cursor points at
 * (`docs/flags.md` (hhhhhh), R5).
 *
 * A mountain's peak is dressing — a prop standing on a flat plate — and it
 * stands tall enough that, under the camera's tilt, it covers the ground of the
 * hex behind it on screen. The tile pick used to resolve against the first mesh
 * the ray struck, peaks included, so a click on the centre of the hex behind a
 * mountain selected the mountain. The rule now: the tile pick reads ground and
 * only ground; a peak, a tree or a city model may be what the eye sees, but the
 * ground decides the hex. Units keep their own pick (`unitModelPicking.ts`), in
 * which a peak *does* occlude — a piece hidden behind a summit is not a target,
 * and a piece whose head shows above it is.
 *
 * The fixture is the production board builder with the shipped escarpment
 * sculpts read off disk, so the peaks measured are the peaks drawn. Three
 * subjects — a mountain, a hill and a flat hex — each with six neighbours, at
 * the boot zoom and at the zoom-out ceiling: the neighbour's top-centre is
 * projected through three's own `project`, picked back through the renderer's
 * ray, and must come back as itself every time.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BoxGeometry, type BufferGeometry, type Material, Mesh, MeshStandardMaterial, Vector3 } from 'three';

import { DioramaCamera } from '../../src/render3d/camera3d';
import { boardBounds, cellCenter, tileTopY, wrapWidth } from '../../src/render3d/layout';
import { buildPaintedBoard, type PaintedBoard, type PaintedBoardMaterials, type PaintedVegetationAsset, type PaintedVegetationAssets } from '../../src/render3d/paintedBoard.js';
import { installPaintedSurface, samplePaintedSurface, uninstallPaintedSurface } from '../../src/render3d/paintedSurface';
import { pickTile } from '../../src/render3d/picking';
import { pickUnitModel } from '../../src/render3d/unitModelPicking';
import { createMap, type GameMap, type Tile, tileNeighbors } from '../../src/sim/map';
// @ts-expect-error The shared study asset loader has no standalone declaration.
import { readVegetationBundle, VEGETATION_BUNDLE_VERSION } from '../../src/terrainStudy/vegetation.js';

/** `node:fs` behind a variable specifier — see `paintedBenchmark.test.ts`. */
const FS_SPECIFIER = 'node:fs';
interface MinimalFs {
  readFileSync(path: URL): Uint8Array;
  readFileSync(path: URL, encoding: string): string;
}
/** A path under the repository root, from this file's own place in it. */
const fromRoot = (path: string): URL => new URL(`../../${path}`, import.meta.url);

const VIEWPORT = { width: 1280, height: 800 };
const disposables: (BufferGeometry | Material)[] = [];

interface Subject { name: string; tile: Tile }
interface Fixture {
  map: GameMap;
  board: PaintedBoard;
  subjects: Subject[];
  mountain: Tile;
}

let fixture: Fixture;

/** The shipped sculpts, read the way the renderer reads them, minus the fetch. */
async function loadShippedVegetation(): Promise<PaintedVegetationAssets> {
  const fs = (await import(/* @vite-ignore */ FS_SPECIFIER)) as MinimalFs;
  const bytes = fs.readFileSync(fromRoot(`public/terrain-study/asset-bundle/${VEGETATION_BUNDLE_VERSION}.bundle`));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const entries = readVegetationBundle(buffer) as { geometry: BufferGeometry; shoulderGeometry: BufferGeometry | null }[];
  const foliage = new MeshStandardMaterial({ vertexColors: true }), rock = new MeshStandardMaterial({ vertexColors: true });
  const rangeMaterial = new MeshStandardMaterial({ vertexColors: true });
  disposables.push(foliage, rock, rangeMaterial);
  const assets: PaintedVegetationAsset[] = entries.map((entry, i) => {
    disposables.push(entry.geometry);
    if (entry.shoulderGeometry) disposables.push(entry.shoulderGeometry);
    return { ...entry, material: i >= 5 ? rock : foliage };
  });
  return {
    broadleaves: assets.slice(0, 3), cypresses: assets.slice(3, 5), escarpments: assets.slice(5, 8),
    limestone: assets[8]!, broadleaf: assets[0]!, rangeMaterial,
  };
}

function boardMaterials(): PaintedBoardMaterials {
  const mat = () => { const m = new MeshStandardMaterial({ vertexColors: true }); disposables.push(m); return m; };
  return {
    ground: Object.fromEntries(['grassland', 'plains', 'desert', 'tundra', 'snow', 'mountain', 'ocean', 'coast', 'lake', 'oasis', 'floodplain'].map(k => [k, mat()])),
    earth: mat(), mergedLand: mat(), mergedWater: mat(), mergedDetails: mat(),
    water: { river: mat(), bank: mat(), shallows: mat(), foam: mat() },
    features: { shrub: mat(), stone: mat(), fertile: mat(), bank: mat(), pool: mat(), shallow: mat(), reeds: mat() },
  };
}

beforeAll(async () => {
  const map = createMap({ width: 16, height: 12, terrain: 'grassland' });
  const at = (col: number, row: number): Tile => map.tiles[row * map.width + col]!;
  // The subject mountain, ringed by a hill, a second mountain (so the range
  // builder lays a saddle and a foothill, the tallest dressing it makes) and
  // four flat hexes.
  const mountain = at(7, 5);
  mountain.terrain = 'mountain';
  const ring = tileNeighbors(map, mountain);
  ring[0]!.hills = true;
  ring[1]!.terrain = 'mountain';
  const hill = at(3, 8);
  hill.hills = true;
  const flat = at(12, 8);
  const assets = await loadShippedVegetation();
  const board = buildPaintedBoard(map, assets, boardMaterials(), false);
  // Every cell charted: a peak the fog hides is not the case under test.
  board.applyFog(null);
  installPaintedSurface(map, board.renderMap, board.pickMeshes);
  fixture = {
    map, board, mountain,
    subjects: [{ name: 'mountain', tile: mountain }, { name: 'hill', tile: hill }, { name: 'flat', tile: flat }],
  };
});

afterAll(() => {
  uninstallPaintedSurface(fixture.map);
  fixture.board.dispose();
  for (const item of disposables.splice(0)) item.dispose();
});

function makeCamera(): DioramaCamera {
  const camera = new DioramaCamera();
  camera.resize(VIEWPORT.width, VIEWPORT.height);
  camera.setBoard(boardBounds(fixture.map), wrapWidth(fixture.map));
  return camera;
}

/** The boot zoom (`openAt`) and the zoom-out ceiling, both looking at `tile`. */
function camerasOn(tile: Tile): { zoom: string; camera: DioramaCamera }[] {
  const c = cellCenter(tile.col, tile.row);
  const play = makeCamera();
  play.openAt(c.x, c.z);
  const overview = makeCamera();
  overview.lookAtPoint(new Vector3(c.x, 0, c.z));
  overview.zoomByFactor(1e-6, VIEWPORT.width / 2, VIEWPORT.height / 2);
  return [{ zoom: 'play', camera: play }, { zoom: 'overview', camera: overview }];
}

/** Viewport pixels of a world point through three's own projection. */
function toScreen(camera: DioramaCamera, world: Vector3): { x: number; y: number } {
  const ndc = world.clone().project(camera.camera);
  return { x: ((ndc.x + 1) / 2) * VIEWPORT.width, y: ((1 - ndc.y) / 2) * VIEWPORT.height };
}

function topCentre(tile: Tile): Vector3 {
  const c = cellCenter(tile.col, tile.row);
  return new Vector3(c.x, tileTopY(tile), c.z);
}

interface Row { subject: string; zoom: string; aimed: Tile; picked: Tile | null }

function measure(): Row[] {
  const rows: Row[] = [];
  for (const subject of fixture.subjects) {
    for (const { zoom, camera } of camerasOn(subject.tile)) {
      for (const aimed of tileNeighbors(fixture.map, subject.tile)) {
        const screen = toScreen(camera, topCentre(aimed));
        const hit = pickTile(fixture.map, camera.screenRay(screen.x, screen.y));
        rows.push({ subject: subject.name, zoom, aimed, picked: hit?.tile ?? null });
      }
    }
  }
  return rows;
}

const name = (tile: Tile | null): string =>
  tile ? `(${tile.col},${tile.row}) ${tile.terrain === 'mountain' ? 'mountain' : tile.hills ? 'hills' : 'flat'}` : 'nothing';

interface Face { subject: string; zoom: string; aimed: Tile; total: number; taken: Map<Tile | null, number> }

/**
 * How much of a neighbour's face the pick hands to some other hex — a grid of
 * points across the top face at 90% of the hex, each on the drawn surface
 * (`samplePaintedSurface`, so a hill's point sits on its mound and not in the
 * air above the downslope), projected and picked back. The centre table is one
 * point; a player clicks anywhere on the hex. Before the ruling this is where
 * the mountain showed: a strip along the shared edge of the hexes behind its
 * summit, and most of a hill neighbour's centre where a foothill's shoulder
 * stood on it.
 *
 * Swept once and kept: three's `Mesh.raycast` walks every triangle of a merged
 * chunk, so each pick is milliseconds and the sweep is the whole cost of this
 * file. The step is a fifth of a hex radius — a strip a peak could hide in is
 * wider than that on every side.
 */
let swept: Face[] | null = null;
function coverage(): Face[] {
  if (swept) return swept;
  const faces: Face[] = [];
  const inset = .9, step = .2;
  for (const subject of fixture.subjects) {
    for (const { zoom, camera } of camerasOn(subject.tile)) {
      for (const aimed of tileNeighbors(fixture.map, subject.tile)) {
        const c = cellCenter(aimed.col, aimed.row), top = tileTopY(aimed);
        const taken = new Map<Tile | null, number>();
        let total = 0;
        for (let x = -inset; x <= inset; x += step) for (let z = -inset; z <= inset; z += step) {
          // Inside the hexagon (pointy-top: flat sides east and west).
          if (Math.abs(x) > inset * Math.sqrt(3) / 2 || Math.abs(z) + Math.abs(x) / Math.sqrt(3) > inset) continue;
          total++;
          const screen = toScreen(camera, new Vector3(c.x + x, samplePaintedSurface(aimed, x, z) ?? top, c.z + z));
          const hit = pickTile(fixture.map, camera.screenRay(screen.x, screen.y))?.tile ?? null;
          if (hit !== aimed) taken.set(hit, (taken.get(hit) ?? 0) + 1);
        }
        faces.push({ subject: subject.name, zoom, aimed, total, taken });
      }
    }
  }
  swept = faces;
  return faces;
}

const faceLine = (face: Face): string => {
  const lost = [...face.taken.entries()].map(([who, n]) => `${(100 * n / face.total).toFixed(1)}% → ${name(who)}`).join(', ');
  return `${face.subject.padEnd(9)} ${face.zoom.padEnd(9)} ${name(face.aimed).padEnd(18)} ${lost || 'all its own'}`;
};

describe('the tile pick reads the ground (R5)', () => {
  it('prints the six-neighbour table', () => {
    const pickOnly = fixture.board.pickMeshes.filter(mesh => mesh.userData.paintedPickOnly);
    const heights = pickOnly.map(mesh => { const box = (mesh as { boundingBox?: { max: { y: number } } }).boundingBox; return box ? box.max.y.toFixed(2) : '?'; });
    console.log(`\npick meshes ${fixture.board.pickMeshes.length}, of them pick-only (peaks) ${pickOnly.length}; peak batch tops y = ${heights.join(' ')}`);
    const lines = measure().map(row =>
      `${row.subject.padEnd(9)} ${row.zoom.padEnd(9)} aimed ${name(row.aimed).padEnd(18)} picked ${name(row.picked).padEnd(18)} ${row.picked === row.aimed ? 'ok' : 'WRONG'}`);
    console.log(`\n${lines.join('\n')}\n`);
    console.log(`face area handed to another hex:\n${coverage().map(faceLine).join('\n')}\n`);
    expect(lines).toHaveLength(36);
  });

  it('returns the neighbour every time, for a mountain, a hill and a flat hex, at both zooms', () => {
    const wrong = measure().filter(row => row.picked !== row.aimed)
      .map(row => `${row.subject} ${row.zoom}: aimed ${name(row.aimed)} picked ${name(row.picked)}`);
    expect(wrong).toEqual([]);
  });

  it('hands no point of any neighbour\'s face to a mountain, at either zoom', () => {
    // Not one sample: a peak or a shoulder standing over a neighbour's ground
    // used to claim the ground it stood on and the ground behind it.
    const swallowed = coverage()
      .filter(face => [...face.taken.keys()].some(who => who !== null && who.terrain === 'mountain' && who !== face.aimed))
      .map(faceLine);
    expect(swallowed).toEqual([]);
    // And a flat hex beside the mountain is wholly its own: nothing stands on it.
    const flatLoss = coverage().filter(face => face.subject === 'mountain' && !face.aimed.hills && face.aimed.terrain !== 'mountain' && face.taken.size > 0).map(faceLine);
    expect(flatLoss).toEqual([]);
  });

  it('registers no dressing mesh for the tile pick (source pin)', async () => {
    const fs = (await import(/* @vite-ignore */ FS_SPECIFIER)) as MinimalFs;
    const source = fs.readFileSync(fromRoot('src/render3d/paintedSurface.ts'), 'utf8');
    // The refusal is at registration, before bounds or heights are read, so
    // neither the pointer nor a unit's footing ever meets a prop.
    expect(source).toContain('if (mesh.userData.paintedPickOnly) continue;\n    mesh.updateWorldMatrix(true, false);');
    // No second door: nothing filters hits by prop visibility any more.
    expect(source).not.toContain('acceptsPointerHit');
    expect(source).not.toContain('paintedCellVisible(');
    // The board still flags its range props, which is what the refusal keys on.
    expect(fixture.board.pickMeshes.some(mesh => mesh.userData.paintedPickOnly)).toBe(true);
  });

  it('picks a unit whose head shows above the peak it stands behind, on its own hex', () => {
    // The camera looks toward -z, so the hex behind the summit on screen is the
    // one to its north. A piece there is seen over the peak's shoulder.
    const behind = tileNeighbors(fixture.map, fixture.mountain).find(t => t.row === fixture.mountain.row - 1 && !t.hills && t.terrain !== 'mountain')!;
    const c = cellCenter(behind.col, behind.row), foot = tileTopY(behind);
    const body = new BoxGeometry(.3, .8, .3);
    const material = new MeshStandardMaterial();
    disposables.push(body, material);
    const piece = new Mesh(body, material);
    piece.position.set(c.x, foot + .4, c.z);
    piece.userData.unitBody = true;
    piece.updateMatrixWorld(true);
    const [{ camera }] = camerasOn(fixture.mountain);
    let seen: { x: number; y: number } | null = null;
    for (const rise of [.78, .7, .6, .5, .4, .3, .2, .1]) {
      const screen = toScreen(camera!, new Vector3(c.x, foot + rise, c.z));
      const id = pickUnitModel(camera!.screenRay(screen.x, screen.y), [{ unitId: 1, object: piece }], [fixture.board.group]);
      if (id === 1) { seen = screen; break; }
    }
    expect(seen, 'no part of the piece showed above the peak').not.toBeNull();
    expect(pickTile(fixture.map, camera!.screenRay(seen!.x, seen!.y))?.tile).toBe(behind);
    // And straight through the summit the piece is hidden: a peak occludes a
    // piece as it always did — the ruling is about the *tile* pick alone.
    const summit = toScreen(camera!, topCentre(fixture.mountain).add(new Vector3(0, .4, 0)));
    expect(pickUnitModel(camera!.screenRay(summit.x, summit.y), [{ unitId: 1, object: piece }], [fixture.board.group])).toBeNull();
  });
});
