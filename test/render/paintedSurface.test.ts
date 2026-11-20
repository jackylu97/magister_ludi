import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackSide, BufferGeometry, ConeGeometry, DoubleSide, FrontSide, Float32BufferAttribute, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createMap, type GameMap, type Tile } from '../../src/sim/map';
import { cellCenter, tileTopY, wrapWidth } from '../../src/render3d/layout';
import { pickTile } from '../../src/render3d/picking';
import { MoveAnimations3D } from '../../src/render3d/animation3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { badgeAnchors, placePiece } from '../../src/render3d/pieces';
import { badgeCenterY } from '../../src/render3d/badges3d';
import { type Unit } from '../../src/sim/state';
import { installPaintedSurface, paintedGroundHit, samplePaintedSurface, samplePaintedWorld, surfacePickGridBuilds, surfaceSamplerBuilds, uninstallPaintedSurface, warmPaintedSurface } from '../../src/render3d/paintedSurface';
// The study remains JavaScript; these tests exercise its production adapter.
// @ts-expect-error No declarations for the standalone art modules.
import { prepareTerrainMap, neighbour, surfaceHeight, terrainMapWraps } from '../../src/terrainStudy/surface.js';
// @ts-expect-error No declarations for the standalone art modules.
import { terrainMesh } from '../../src/terrainStudy/terrainMesh.js';
// @ts-expect-error No declarations for the standalone art modules.
import { createMountainRanges } from '../../src/terrainStudy/mountainRanges.js';
import { newGame } from '../sim/newGameHelpers';

type PreparedTile = Tile & { shoreEdges: number; joinedEdges: number; sharedHillEdges: number };
type PreparedMap = GameMap & { tiles: PreparedTile[] };
const dispose: (() => void)[] = [];
afterEach(() => { for (const clear of dispose.splice(0)) clear(); vi.restoreAllMocks(); });

function buildFixture(map: GameMap): { renderMap: PreparedMap; meshes: Mesh[] } {
  const renderMap = prepareTerrainMap(map, { wrap: true }) as PreparedMap;
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const chunks = new Map<number, ReturnType<typeof terrainMesh>[]>();
  for (const tile of renderMap.tiles) {
    const [top, skirt] = terrainMesh(tile);
    skirt.dispose();
    top.setAttribute('paintedCell', new Float32BufferAttribute(
      new Float32Array(top.getAttribute('position').count).fill(tile.row * map.width + tile.col), 1,
    ));
    const key = Math.floor(tile.col / 2);
    if (!chunks.has(key)) chunks.set(key, []);
    chunks.get(key)!.push(top);
  }
  const meshes: Mesh[] = [];
  for (const tops of chunks.values()) {
    const geometry = mergeGeometries(tops)!;
    for (const top of tops) top.dispose();
    for (const copy of [-1, 0, 1]) {
      const parent = new Group(); parent.position.x = copy * wrapWidth(map);
      const mesh = new Mesh(geometry, material); parent.add(mesh); meshes.push(mesh);
    }
    dispose.push(() => geometry.dispose());
  }
  installPaintedSurface(map, renderMap, meshes);
  dispose.push(() => { uninstallPaintedSurface(map); material.dispose(); });
  return { renderMap, meshes };
}

/** A ridge with low endpoints ensures endpoint interpolation misses its crest. */
function addCrossingMound(
  map: GameMap,
  fixture: ReturnType<typeof buildFixture>,
  from: { col: number; row: number },
  direction: number,
): void {
  const start = cellCenter(from.col, from.row), endX = start.x + direction * Math.sqrt(3);
  const sections = [[start.x, .13], [(start.x + endX) / 2, .78], [endX, .13]];
  const positions: number[] = [];
  for (let i = 0; i < sections.length - 1; i++) {
    const [ax, ay] = sections[i]!, [bx, by] = sections[i + 1]!;
    const a = [ax!, ay!, start.z - .35], b = [bx!, by!, start.z - .35];
    const c = [ax!, ay!, start.z + .35], d = [bx!, by!, start.z + .35];
    positions.push(...a, ...b, ...c, ...b, ...d, ...c);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  const material = new MeshBasicMaterial({ side: DoubleSide });
  for (const copy of [-1, 0, 1]) {
    const mesh = new Mesh(geometry, material);
    mesh.position.x = copy * wrapWidth(map); fixture.meshes.push(mesh);
  }
  installPaintedSurface(map, fixture.renderMap, fixture.meshes);
  dispose.push(() => { geometry.dispose(); material.dispose(); });
}

describe('painted gameplay surface', () => {
  it('samples the exact hill and basin triangles without changing an ordinary map', () => {
    const map = createMap({ width: 6, height: 4, terrain: 'grassland' });
    const ordinary = createMap({ width: 6, height: 4, terrain: 'grassland' });
    map.tiles[8]!.hills = true;
    map.tiles[15]!.feature = 'oasis';
    const before = JSON.stringify(map), oldHeight = tileTopY(ordinary.tiles[8]!);
    const { meshes } = buildFixture(map);
    for (const cell of [0, 8, 15]) {
      const tile = map.tiles[cell]!, c = cellCenter(tile.col, tile.row);
      for (const [x, z] of [[0, 0], [.13, -.17], [-.21, .19]]) {
        const ray = new Raycaster(new Vector3(c.x + x!, 10, c.z + z!), new Vector3(0, -1, 0));
        const actual = ray.intersectObjects(meshes, false)[0]!.point.y;
        expect(samplePaintedSurface(tile, x, z)).toBeCloseTo(actual, 8);
        if (x === 0 && z === 0) expect(tileTopY(tile)).toBeCloseTo(actual, 8);
      }
    }
    expect(JSON.stringify(map)).toBe(before);
    expect(tileTopY(ordinary.tiles[8]!)).toBe(oldHeight);
    expect(samplePaintedSurface(ordinary.tiles[8]!)).toBeUndefined();
    uninstallPaintedSurface(map);
    expect(samplePaintedSurface(map.tiles[8]!)).toBeUndefined();
  });

  // The works layer installs the surface again on every rebuild of a map with a terrace on it. Each install used to
  // drop every chunk's sampler, and the placements after it built them all again: 2.2 s of a 4.6 s turn-end sync at
  // turn 130 (render speed pass, 2026-11-16). A chunk that has not changed keeps its sampler; a chunk whose triangles
  // changed (a hill cut rewrites the index) builds a new one, so the heights always follow the ground.
  it('keeps a chunk\'s sampler across installs until the chunk itself changes', () => {
    const map = createMap({ width: 6, height: 4, terrain: 'grassland' });
    map.tiles[8]!.hills = true;
    const { renderMap, meshes } = buildFixture(map);
    const tile = map.tiles[8]!, c = cellCenter(tile.col, tile.row);
    const height = samplePaintedSurface(tile, .1, -.1)!;
    const built = surfaceSamplerBuilds();
    expect(built).toBeGreaterThan(0);
    installPaintedSurface(map, renderMap, meshes);
    expect(samplePaintedSurface(tile, .1, -.1)).toBe(height);
    expect(surfaceSamplerBuilds()).toBe(built);
    // Cut the chunk's faces away, as `paintedRelief.ts` does: the index changes in place and its version rises.
    const chunk = meshes.find(mesh => {
      const ray = new Raycaster(new Vector3(c.x + .1 - (mesh.parent?.position.x ?? 0), 10, c.z - .1), new Vector3(0, -1, 0));
      return mesh.parent?.position.x === 0 && ray.intersectObject(new Mesh(mesh.geometry), false).length > 0;
    })!;
    const geometry = chunk.geometry;
    if (!geometry.index) geometry.setIndex([...Array(geometry.getAttribute('position').count).keys()]);
    const index = geometry.index!;
    for (let i = 0; i < index.count; i += 3) { index.setX(i + 1, index.getX(i)); index.setX(i + 2, index.getX(i)); }
    index.needsUpdate = true;
    installPaintedSurface(map, renderMap, meshes);
    expect(samplePaintedSurface(tile, .1, -.1)).toBeUndefined();
    expect(surfaceSamplerBuilds()).toBeGreaterThan(built);
  });

  it('picks original tiles and reports the visible wrap copy, including indexed geometry', () => {
    const map = createMap({ width: 6, height: 4, terrain: 'grassland' });
    map.tiles[12]!.hills = true;
    const { meshes } = buildFixture(map);
    for (const mesh of meshes) {
      if (!mesh.geometry.index) mesh.geometry.setIndex(Array.from(
        { length: mesh.geometry.getAttribute('position').count }, (_, i) => i,
      ));
    }
    for (const col of [0, map.width - 1]) for (const copy of [-1, 0, 1]) {
      const tile = map.tiles[2 * map.width + col]!, c = cellCenter(col, 2);
      const x = c.x + copy * wrapWidth(map);
      const hit = pickTile(map, { origin: new Vector3(x, 10, c.z), direction: new Vector3(0, -1, 0) });
      expect(hit?.tile).toBe(tile);
      expect(hit?.worldCol).toBe(col + copy * map.width);
      expect(samplePaintedWorld(map, x, c.z)).toBeCloseTo(tileTopY(tile), 8);
    }
    const c = cellCenter(0, 2);
    expect(samplePaintedWorld(map, c.x + 9 * wrapWidth(map), c.z)).toBeCloseTo(tileTopY(map.tiles[12]!), 8);
    expect(pickTile(map, { origin: new Vector3(0, 10, -4), direction: new Vector3(0, -1, 0) })).toBeNull();
  });

  it('filters unrelated chunks and samples hidden near geometry', () => {
    const map = createMap({ width: 8, height: 3, terrain: 'grassland' });
    const { meshes } = buildFixture(map);
    const distant = meshes.find(mesh => {
      const box = mesh.geometry.boundingBox!;
      return box.min.x + mesh.matrixWorld.elements[12]! > 4;
    })!;
    const cast = vi.spyOn(distant, 'raycast');
    const c = cellCenter(0, 1);
    const hit = pickTile(map, { origin: new Vector3(c.x, 10, c.z), direction: new Vector3(0, -1, 0) });
    expect(hit?.tile).toBe(map.tiles[8]);
    expect(cast).not.toHaveBeenCalled();
    // Visibility is a GPU concern. The immutable near surface remains usable
    // for movement while fog or an LOD choice hides a mesh.
    meshes.forEach(mesh => { mesh.visible = false; });
    expect(samplePaintedSurface(map.tiles[8]!, .11, .13)).toBeDefined();
    expect(pickTile(map, { origin: new Vector3(c.x, 10, c.z), direction: new Vector3(0, -1, 0) })?.tile).toBe(map.tiles[8]);
  });

  it('resolves oblique hill picks against actual mesh occlusion', () => {
    const map = createMap({ width: 6, height: 4, terrain: 'grassland' });
    for (const cell of [6, 7, 12, 13]) map.tiles[cell]!.hills = true;
    const { meshes } = buildFixture(map);
    for (const x of [-.40, .10, .55, 1.1]) {
      const origin = new Vector3(x, 4, -1), target = new Vector3(x, .2, 2.9);
      const direction = target.sub(origin).normalize();
      const actual = new Raycaster(origin, direction).intersectObjects(meshes, false)[0]!;
      const mesh = actual.object as Mesh;
      const cell = mesh.geometry.getAttribute('paintedCell').getX(actual.face!.a);
      expect(pickTile(map, { origin, direction })?.tile).toBe(map.tiles[cell]);
    }
  });

  // The pointer's pick runs on every pointer move, and a drag pans on every pointer move too. three's raycast tested
  // every triangle of each chunk the ray's box test let through: about 20 ms a pick at turn 130 (render speed pass,
  // third pass). The pick now tests only the triangles under the ray's path, and it must find the very hit three finds.
  it('finds the same ground hit as three\'s raycast, testing only the triangles under the ray', () => {
    const map = createMap({ width: 8, height: 6, terrain: 'grassland' });
    for (const cell of [9, 10, 17, 18, 19, 26, 33]) map.tiles[cell]!.hills = true;
    const { meshes } = buildFixture(map);
    // One chunk indexed and one drawn from its back, so both of three's triangle walks and both sides are covered.
    const indexed = meshes[0]!.geometry;
    if (!indexed.index) indexed.setIndex([...Array(indexed.getAttribute('position').count).keys()]);
    const back = new MeshBasicMaterial({ side: BackSide }), front = new MeshBasicMaterial({ side: FrontSide });
    dispose.push(() => { back.dispose(); front.dispose(); });
    meshes[3]!.material = front; meshes[4]!.material = front; meshes[5]!.material = front;
    meshes[6]!.material = back;
    for (const mesh of meshes) mesh.updateWorldMatrix(true, false);
    installPaintedSurface(map, prepareTerrainMap(map, { wrap: true }), meshes);
    const built = surfacePickGridBuilds();
    let seed = 7;
    const random = (): number => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const period = wrapWidth(map);
    let hits = 0;
    for (let n = 0; n < 400; n++) {
      // Rays from above, steep and shallow, from every side, over all three copies and past the map's edges.
      const target = new Vector3((random() * 1.6 - .3) * period * 1.5 - period * .5, .1 + random() * .6, random() * 11 - 1.5);
      const tilt = .2 + random() * 1.3, turn = random() * Math.PI * 2;
      const direction = new Vector3(Math.cos(turn) * Math.cos(tilt), -Math.sin(tilt), Math.sin(turn) * Math.cos(tilt)).normalize();
      const origin = target.clone().addScaledVector(direction, -6);
      const expected = new Raycaster(origin, direction).intersectObjects(meshes, false)[0];
      const actual = paintedGroundHit(map, { origin, direction });
      if (!expected) { expect(actual).toBeUndefined(); continue; }
      hits++;
      expect(actual?.object).toBe(expected.object);
      expect(actual?.face?.a).toBe(expected.face!.a);
      expect(actual?.distance).toBe(expected.distance);
      expect(actual?.point.toArray()).toEqual(expected.point.toArray());
    }
    expect(hits).toBeGreaterThan(200);
    // One grid a geometry: the three wrap copies of a chunk share it.
    const geometries = new Set(meshes.map(mesh => mesh.geometry)).size;
    expect(surfacePickGridBuilds() - built).toBeLessThanOrEqual(geometries);
    // A cut chunk (the index rewritten in place, as `paintedRelief.ts` does) builds its grid again and picks what it now holds.
    const index = indexed.index!;
    for (let i = 0; i < index.count; i += 3) { index.setX(i + 1, index.getX(i)); index.setX(i + 2, index.getX(i)); }
    index.needsUpdate = true;
    const before = surfacePickGridBuilds();
    for (let n = 0; n < 60; n++) {
      const origin = new Vector3(random() * period, 4, random() * 8 - 1), direction = new Vector3(.1, -1, .7).normalize();
      const expected = new Raycaster(origin, direction).intersectObjects(meshes, false)[0];
      expect(paintedGroundHit(map, { origin, direction })?.face?.a).toBe(expected?.face?.a);
    }
    expect(surfacePickGridBuilds()).toBeGreaterThan(before);
  });

  // The terrace shelves are an instanced batch registered as ground. Every height a piece stood at near one raycast
  // every instance and every triangle of the shelf: about half of the pieces' rebuild at a turn-130 turn end (third
  // pass). The pick and the height now walk the instances as three does and test only the triangles under the ray.
  it('finds the same hit on an instanced shelf as three\'s raycast, for picks and for heights', () => {
    const map = createMap({ width: 8, height: 6, terrain: 'grassland' });
    const fixture = buildFixture(map);
    const shelf = new ConeGeometry(.6, .5, 12, 3); shelf.translate(0, .45, 0);
    const material = new MeshBasicMaterial({ side: DoubleSide });
    const shelves: InstancedMesh[] = [];
    for (const copy of [-1, 0, 1]) {
      const mesh = new InstancedMesh(shelf, material, 4);
      for (const [i, cell] of [9, 12, 26, 35].entries()) {
        const c = cellCenter(cell % 8, Math.floor(cell / 8));
        mesh.setMatrixAt(i, new Matrix4().makeRotationY(i).setPosition(c.x, 0, c.z));
      }
      mesh.computeBoundingSphere(); mesh.position.x = copy * wrapWidth(map); mesh.updateMatrixWorld(true);
      shelves.push(mesh);
    }
    const all = [...fixture.meshes, ...shelves];
    installPaintedSurface(map, fixture.renderMap, all);
    dispose.push(() => { shelf.dispose(); material.dispose(); shelves.forEach(mesh => mesh.dispose()); });
    let seed = 3, onShelf = 0;
    const random = (): number => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const period = wrapWidth(map);
    for (let n = 0; n < 300; n++) {
      const target = new Vector3(random() * period * 1.4 - period * .2, .3, random() * 8 - .5);
      const tilt = .3 + random() * 1.2, turn = random() * Math.PI * 2;
      const direction = new Vector3(Math.cos(turn) * Math.cos(tilt), -Math.sin(tilt), Math.sin(turn) * Math.cos(tilt)).normalize();
      const origin = target.clone().addScalar(0).addScaledVector(direction, -5);
      const expected = new Raycaster(origin, direction).intersectObjects(all, false)[0];
      const actual = paintedGroundHit(map, { origin, direction });
      expect(actual?.object).toBe(expected?.object);
      expect(actual?.distance).toBe(expected?.distance);
      expect(actual?.instanceId).toBe(expected?.instanceId);
      expect(actual?.point.toArray()).toEqual(expected?.point.toArray());
      if (expected && shelves.includes(expected.object as InstancedMesh)) onShelf++;
    }
    expect(onShelf).toBeGreaterThan(4);
    // Heights straight down onto the shelves alone: the nearest hit three's raycast finds, from the registration's own
    // starting height (a box's top plus one, as `installPaintedSurface` takes it).
    const alone = createMap({ width: 8, height: 6, terrain: 'grassland' });
    installPaintedSurface(alone, prepareTerrainMap(alone, { wrap: true }), shelves);
    dispose.push(() => uninstallPaintedSurface(alone));
    let top = 1;
    for (const mesh of shelves) { mesh.computeBoundingBox(); top = Math.max(top, mesh.boundingBox!.clone().applyMatrix4(mesh.matrixWorld).max.y + 1); }
    let landed = 0;
    for (const cell of [9, 12, 26, 35]) for (const [x, z] of [[0, 0], [.2, -.1], [-.31, .22], [.5, .05]]) {
      const c = cellCenter(cell % 8, Math.floor(cell / 8));
      // The query wraps x into the canonical period the way `samplePaintedWorld` does.
      const wx = (((c.x + x!) % period) + period) % period;
      const down = new Raycaster(new Vector3(wx, top, c.z + z!), new Vector3(0, -1, 0)).intersectObjects(shelves, false)[0];
      expect(samplePaintedWorld(alone, c.x + x!, c.z + z!)).toBe(down?.point.y);
      if (down) landed++;
    }
    expect(landed).toBeGreaterThan(8);
  });

  // The layers are built for the seat's eyes at load, so a chunk the seat has not seen has no height sampler yet, and
  // a turn end that showed new ground built them inside its sync. The renderer warms them in idle time (third pass).
  it('warms the samplers a slice at a time, and a warmed height is the height a cold query gives', () => {
    const map = createMap({ width: 12, height: 6, terrain: 'grassland' });
    for (const cell of [13, 14, 27, 40, 41]) map.tiles[cell]!.hills = true;
    const cold = createMap({ width: 12, height: 6, terrain: 'grassland' });
    for (const cell of [13, 14, 27, 40, 41]) cold.tiles[cell]!.hills = true;
    buildFixture(cold);
    const expected = cold.tiles.map(tile => samplePaintedSurface(tile, .07, -.11));
    buildFixture(map);
    const before = surfaceSamplerBuilds(), gridsBefore = surfacePickGridBuilds();
    // One sampler a slice, then the rest.
    let calls = 0;
    expect(warmPaintedSurface(map, () => calls++ > 0)).toBe(false);
    expect(surfaceSamplerBuilds() - before).toBe(1);
    expect(warmPaintedSurface(map, () => false)).toBe(true);
    const built = surfaceSamplerBuilds();
    // The pick grids come with them, so the pointer's first pick over a chunk builds nothing.
    expect(surfacePickGridBuilds()).toBeGreaterThan(gridsBefore);
    expect(built - before).toBeGreaterThan(1);
    // Only the canonical copy's chunks: a third of the registered ground.
    expect(built - before).toBeLessThan(18);
    expect(map.tiles.map(tile => samplePaintedSurface(tile, .07, -.11))).toEqual(expected);
    expect(surfaceSamplerBuilds()).toBe(built);
    expect(warmPaintedSurface(map, () => false)).toBe(true);
  });

  it('prepares pointer picks in idle time after unit placement has sampled the ground', () => {
    const map = createMap({ width: 6, height: 4, terrain: 'grassland' });
    buildFixture(map);
    for (const tile of map.tiles) samplePaintedSurface(tile);
    const gridsBefore = surfacePickGridBuilds();
    expect(warmPaintedSurface(map, () => true)).toBe(false);
    expect(surfacePickGridBuilds()).toBe(gridsBefore);
    expect(warmPaintedSurface(map, () => false)).toBe(true);
    const gridsReady = surfacePickGridBuilds();
    expect(gridsReady).toBeGreaterThan(gridsBefore);
    for (const tile of map.tiles) {
      const { x, z } = cellCenter(tile.col, tile.row);
      expect(paintedGroundHit(map, {origin: new Vector3(x, 10, z), direction: new Vector3(0, -1, 0)})).toBeDefined();
    }
    expect(surfacePickGridBuilds()).toBe(gridsReady);
  });

  it('places stacked pieces and their badge targets at the surface under the actual offset', () => {
    const map = createMap({ width: 6, height: 4, terrain: 'grassland' });
    const cell = { col: 2, row: 2 }, fixture = buildFixture(map);
    addCrossingMound(map, fixture, cell, -1);
    const first: Unit = { id: 1, ownerId: 0, type: 'warrior', ...cell, hp: 10, movesLeft: 2, hasAttacked: false };
    const second: Unit = { ...first, id: 2 };
    const position = placePiece(map, second, 1).position;
    const actual = new Raycaster(new Vector3(position.x, 10, position.z), new Vector3(0, -1, 0))
      .intersectObjects(fixture.meshes, false)[0]!.point.y;
    expect(position.y).toBeCloseTo(actual, 8);
    expect(actual - tileTopY(map.tiles[14]!)).toBeGreaterThan(.1);

    const state = newGame({ seed: 1, sizeName: 'duel', players: [{ name: 'A', color: '#b45139', isHuman: true }] });
    state.map = map; state.cities = []; state.units = [first, second];
    const anchors = badgeAnchors(state, 0, () => 1).filter(anchor => anchor.unitId === second.id);
    expect(anchors).toHaveLength(3);
    for (const [index, copy] of [-1, 0, 1].entries()) {
      expect(anchors[index]!.x).toBeCloseTo(position.x + copy * wrapWidth(map), 8);
      expect(anchors[index]!.z).toBeCloseTo(position.z, 8);
      expect(anchors[index]!.y).toBeCloseTo(actual + badgeCenterY(1), 8);
    }
  });

  /**
   * R5 (`docs/flags.md` (hhhhhh)): a peak is dressing. The ray that strikes a
   * summit first names the ground beneath the pixel — the hex *behind* the
   * summit — whether the summit is drawn, fogged or suppressed; and the summit
   * lifts no unit. Before the ruling a drawn summit answered for itself and
   * swallowed the hex behind it; this test used to pin that.
   */
  it('never lets a peak decide the tile: the ground behind a summit is picked, drawn or hidden, and the summit lifts nothing', () => {
    const map = createMap({ width: 6, height: 6, terrain: 'grassland' });
    const mountain = map.tiles[14]!; mountain.terrain = 'mountain';
    const fixture = buildFixture(map), c = cellCenter(mountain.col, mountain.row);
    const ground = tileTopY(mountain);
    const geometry = new ConeGeometry(.80, 2, 6);
    // The struck peak is instance1. Face vertex indices cannot index this
    // attribute: it belongs to instances rather than to the cone's vertices.
    geometry.setAttribute('paintedCell', new InstancedBufferAttribute(new Float32Array([0, 14]), 1));
    geometry.setAttribute('paintedSuppress', new InstancedBufferAttribute(new Float32Array([0, 2]), 1));
    const material = new MeshBasicMaterial({ side: DoubleSide });
    let visible = true, suppressed = 0;
    const peaks: InstancedMesh[] = [];
    for (const copy of [-1, 0, 1]) {
      const peak = new InstancedMesh(geometry, material, 2);
      peak.setMatrixAt(0, new Matrix4().makeTranslation(0, 1.12, 0));
      peak.setMatrixAt(1, new Matrix4().makeTranslation(c.x, 1.12, c.z));
      peak.position.x = copy * wrapWidth(map);
      // Registration no longer touches a prop, so the board's own placement
      // step stands in for it here.
      peak.updateMatrixWorld(true);
      peak.userData.paintedPickOnly = true;
      peak.userData.paintedCellVisible = (cell: number, grade: number) =>
        cell === 14 && visible && (grade === 0 || suppressed < grade);
      peaks.push(peak);
    }
    installPaintedSurface(map, fixture.renderMap, [...fixture.meshes, ...peaks]);
    dispose.push(() => { peaks.forEach(peak => peak.dispose()); geometry.dispose(); material.dispose(); });
    expect(samplePaintedSurface(mountain)).toBeCloseTo(ground, 8);
    for (const copy of [-1, 0, 1]) {
      const origin = new Vector3(c.x + copy * wrapWidth(map), 4, c.z - 2.5);
      const direction = new Vector3(0, -1, 1).normalize();
      // The summit is the first thing on this ray; the ground under it is not the mountain's.
      const first = new Raycaster(origin, direction).intersectObjects([...fixture.meshes, ...peaks], false)[0]!;
      expect(peaks).toContain(first.object);
      const behind = new Raycaster(origin, direction).intersectObjects(fixture.meshes, false)[0]!;
      const groundCell = (behind.object as Mesh).geometry.getAttribute('paintedCell').getX(behind.face!.a);
      expect(groundCell).not.toBe(14);
      for (const [drawn, grade] of [[true, 0], [false, 0], [true, 2]] as const) {
        visible = drawn; suppressed = grade;
        const hit = pickTile(map, { origin, direction });
        expect(hit?.tile).toBe(map.tiles[groundCell]);
        expect(hit?.worldCol).toBe(map.tiles[groundCell]!.col + copy * map.width);
      }
      visible = true; suppressed = 0;
      expect(samplePaintedWorld(map, c.x + copy * wrapWidth(map), c.z)).toBeCloseTo(ground, 8);
      // Straight down onto the summit's own hex still names it: the plate under the cone is ground.
      const down = pickTile(map, { origin: new Vector3(c.x + copy * wrapWidth(map), 10, c.z), direction: new Vector3(0, -1, 0) });
      expect(down?.tile).toBe(mountain);
    }
  });
});

describe('painted movement height', () => {
  const duration = Math.min(VIEW3D.animation.maxMs, VIEW3D.animation.msPerHex);

  it('walks over a crest between two low endpoints and keeps the existing hop', () => {
    const map = createMap({ width: 6, height: 4, terrain: 'grassland' });
    const from = { col: 2, row: 2 }, to = { col: 3, row: 2 };
    const fixture = buildFixture(map); addCrossingMound(map, fixture, from, 1);
    const animations = new MoveAnimations3D(); animations.start(1, from, [to], 0);
    const start = cellCenter(from.col, from.row);
    for (const time of [.20, .35, .50, .65, .80]) {
      const sample = animations.sample(1, duration * time, map)!;
      const actual = new Raycaster(new Vector3(sample.x, 10, sample.z), new Vector3(0, -1, 0))
        .intersectObjects(fixture.meshes, false)[0]!.point.y;
      const fraction = (sample.x - start.x) / Math.sqrt(3);
      expect(sample.y).toBeCloseTo(actual + Math.sin(Math.PI * fraction) * VIEW3D.animation.hopHeight, 7);
    }
    const middle = animations.sample(1, duration / 2, map)!;
    const endpointHeight = Math.max(tileTopY(map.tiles[14]!), tileTopY(map.tiles[15]!));
    expect(middle.y - VIEW3D.animation.hopHeight).toBeGreaterThan(endpointHeight + .5);
    expect(animations.sample(1, duration, map)).toBeNull();
  });

  it('follows the same ridge across the cylindrical seam without nonfinite heights', () => {
    const map = createMap({ width: 6, height: 4, terrain: 'grassland' });
    const from = { col: 0, row: 2 }, to = { col: map.width - 1, row: 2 };
    const fixture = buildFixture(map); addCrossingMound(map, fixture, from, -1);
    const animations = new MoveAnimations3D(); animations.start(2, from, [to], 0);
    const start = cellCenter(from.col, from.row);
    for (const time of [.01, .20, .50, .80, .99]) {
      const sample = animations.sample(2, duration * time, map)!;
      const actual = new Raycaster(new Vector3(sample.x, 10, sample.z), new Vector3(0, -1, 0))
        .intersectObjects(fixture.meshes, false)[0]!.point.y;
      const fraction = (start.x - sample.x) / Math.sqrt(3);
      expect(Number.isFinite(sample.y)).toBe(true);
      expect(sample.x).toBeLessThan(start.x);
      expect(start.x - sample.x).toBeLessThan(Math.sqrt(3));
      expect(sample.y).toBeCloseTo(actual + Math.sin(Math.PI * fraction) * VIEW3D.animation.hopHeight, 7);
    }
    expect(animations.sample(2, duration / 2, map)!.y - VIEW3D.animation.hopHeight).toBeCloseTo(.78, 6);
  });

  it('retains endpoint interpolation and hopping on an unregistered board', () => {
    const map = createMap({ width: 6, height: 4, terrain: 'grassland' });
    const from = { col: 2, row: 2 }, to = { col: 3, row: 2 };
    const animations = new MoveAnimations3D(); animations.start(3, from, [to], 0);
    const middle = animations.sample(3, duration / 2, map)!;
    const a = tileTopY(map.tiles[14]!), b = tileTopY(map.tiles[15]!);
    expect(middle.y).toBeCloseTo((a + b) / 2 + VIEW3D.animation.hopHeight, 8);
  });
});

describe('opt-in cylindrical study preparation', () => {
  it('joins shores across columns only when requested and leaves simulation data untouched', () => {
    const map = createMap({ width: 6, height: 4, terrain: 'grassland' });
    map.tiles[11]!.terrain = 'coast';
    const original = JSON.stringify(map);
    const finite = prepareTerrainMap(map) as PreparedMap;
    const wrapped = prepareTerrainMap(map, { wrap: true }) as PreparedMap;
    const west = 6;
    expect(neighbour(finite.tiles[west], finite, 3)).toBeNull();
    expect(neighbour(wrapped.tiles[west], wrapped, 3)).toBe(wrapped.tiles[11]);
    expect(wrapped.tiles[west]!.shoreEdges & (1 << 3)).toBe(1 << 3);
    expect(finite.tiles[west]!.shoreEdges & (1 << 3)).toBe(0);
    expect(neighbour(wrapped.tiles[0], wrapped, 4)).toBeNull();
    expect(terrainMapWraps(map)).toBe(false);
    expect(JSON.stringify(map)).toBe(original);
  });

  it('keeps shared hill faces continuous at both sides of the cylinder', () => {
    const map = createMap({ width: 7, height: 5, terrain: 'grassland' });
    for (const tile of map.tiles) tile.hills = true;
    const prepared = prepareTerrainMap(map, { wrap: true }) as PreparedMap;
    let raised = 0;
    for (const row of [1, 2, 3]) {
      const west = prepared.tiles[row * map.width]!, east = prepared.tiles[row * map.width + map.width - 1]!;
      for (const z of [-.35, -.15, 0, .15, .35]) {
        const a = surfaceHeight(west, -Math.sqrt(3) / 2, z);
        const b = surfaceHeight(east, Math.sqrt(3) / 2, z);
        expect(a).toBeCloseTo(b, 6);
        if (a > .15) raised++;
      }
    }
    expect(raised).toBeGreaterThan(0);
  });

  it('places a seam mountain saddle beside its mountains instead of across the map', () => {
    const map = createMap({ width: 8, height: 5, terrain: 'grassland' });
    map.tiles[16]!.terrain = 'mountain'; map.tiles[23]!.terrain = 'mountain';
    const prepared = prepareTerrainMap(map, { wrap: true }) as PreparedMap;
    const ranges = createMountainRanges(prepared);
    const link = ranges.connections.find((entry: { from: Tile; to: Tile }) =>
      entry.from.col === 0 && entry.to.col === 7,
    );
    expect(link).toBeDefined();
    expect(link.piece.x).toBeCloseTo(-Math.sqrt(3) / 2, 8);
    expect(Number.isFinite(link.piece.y)).toBe(true);
  });
});
