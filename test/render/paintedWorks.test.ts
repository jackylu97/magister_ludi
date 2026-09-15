import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Raycaster, ShaderLib, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SUPPRESS, type SuppressScope } from '../../src/render3d/instances';
import { BoardGeometry } from '../../src/render3d/board3d';
import { ImprovementLayer, signImprovedCells } from '../../src/render3d/improvements3d';
import { cellCenter, wrapWidth } from '../../src/render3d/layout';
import { VIEW3D } from '../../src/render3d/lookData';
import { installPaintedSurface, samplePaintedWorld, uninstallPaintedSurface } from '../../src/render3d/paintedSurface';
import { PAINTED_WORK_ASSET_NAMES, PAINTED_WORK_IMPROVEMENTS, PaintedWorksLayer, signPaintedWorks, type PaintedWorksAssets } from '../../src/render3d/paintedWorks';
import { MaterialLibrary } from '../../src/render3d/toon';
import { foundCityAt, hasResource } from '../../src/sim/cities';
import { snapshotState } from '../../src/sim/game';
import { improvementDef } from '../../src/sim/improvementData';
import { pillageAt } from '../../src/sim/improvements';
import { createMap, getTileAt, tileIndex, type GameMap } from '../../src/sim/map';
import { RESOURCE_IDS, resourceDef } from '../../src/sim/resourceData';
import { bumpEconomy } from '../../src/sim/slate';
import { createUnit, newGame, type GameState } from '../../src/sim/state';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';
// @ts-expect-error The approved study modules remain JavaScript.
import { prepareTerrainMap, LAND_LEVEL, WATER_LEVEL, onTileTop } from '../../src/terrainStudy/surface.js';
// @ts-expect-error The approved study modules remain JavaScript.
import { terrainMesh } from '../../src/terrainStudy/terrainMesh.js';

const cleanup: (() => void)[] = [];
const SPECIAL_WORKS = ['academy', 'landmark', 'manufactory', 'customsHouse', 'citadel', 'holySite'] as const;
afterEach(() => { for (const dispose of cleanup.splice(0).reverse()) dispose(); vi.restoreAllMocks(); });

function world(width = 8, height = 6): GameState {
  const state = newGame({ seed: 9, sizeName: 'duel', players: [
    { name: 'A', color: '#ac3333', isHuman: true }, { name: 'B', color: '#3344ac', isHuman: true },
  ] });
  state.map = createMap({ width, height, terrain: 'grassland' });
  state.units = []; state.cities = []; state.nextEntityId = 1;
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  for (const player of state.players) player.techsResearched = [];
  resetVisibility(state); state.visibility.forEach(levels => levels.fill(VISIBLE));
  return state;
}

function fixtures(state = world()) {
  const prepared = prepareTerrainMap(state.map, { wrap: true }) as GameMap;
  const topParts: BufferGeometry[] = [];
  for (const tile of prepared.tiles) {
    const [top, side] = terrainMesh(tile) as [BufferGeometry, BufferGeometry]; side.dispose();
    for (const name of Object.keys(top.attributes)) if (name !== 'position') top.deleteAttribute(name);
    topParts.push(top);
  }
  const terrain = mergeGeometries(topParts)!; topParts.forEach(part => part.dispose());
  const groundMaterial = new MeshBasicMaterial({ side: DoubleSide });
  const meshes = [-1, 0, 1].map(copy => { const mesh = new Mesh(terrain, groundMaterial); mesh.position.x = copy * wrapWidth(state.map); return mesh; });
  installPaintedSurface(state.map, prepared, meshes);
  cleanup.push(() => { uninstallPaintedSurface(state.map); terrain.dispose(); groundMaterial.dispose(); });
  const material = new MeshStandardMaterial({ color: 'white', vertexColors: true });
  const geometry: Record<string, BufferGeometry> = Object.fromEntries(PAINTED_WORK_ASSET_NAMES.map(name => {
    // Buildings retain their real asymmetric steps and below-origin plinths.
    const limits = name === 'mine' ? [[-.285, -.13, -.23], [.285, .51, .42]] : name === 'quarry' ? [[-.292, -.10, -.13], [.2214, .4939, .13]] : name === 'house' ? [[-.245, -.17, -.225], [.245, .538, .225]] : [[-.25, 0, -.15], [.25, .5, .3]];
    const [min, max] = limits as [number[], number[]];
    const g = new BoxGeometry(max[0]! - min[0]!, max[1]! - min[1]!, max[2]! - min[2]!);
    g.translate((min[0]! + max[0]!) / 2, (min[1]! + max[1]!) / 2, (min[2]! + max[2]!) / 2);
    g.setAttribute('color', new Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 3).fill(1), 3));
    return [name, g];
  }));
  cleanup.push(() => { material.dispose(); Object.values(geometry).forEach(g => g.dispose()); });
  const assets = { material, ...geometry } as PaintedWorksAssets;
  const layer = new PaintedWorksLayer(assets, () => undefined); cleanup.push(() => layer.dispose());
  const suppressed = new Map<number, SuppressScope>();
  function build(seat: number | null = 0, levels: number[] | null = seat === null ? null : state.visibility[seat]!): void {
    const before = snapshotState(state);
    layer.build(state, prepared, levels, seat, true, { suppressed });
    expect(snapshotState(state)).toBe(before);
    layer.group.updateMatrixWorld(true);
  }
  const propMeshes = () => layer.group.children.filter((mesh): mesh is InstancedMesh => mesh instanceof InstancedMesh);
  const fields = () => layer.group.children.filter((mesh): mesh is Mesh => mesh instanceof Mesh && !(mesh instanceof InstancedMesh));
  const assetCount = (name: keyof typeof geometry) => propMeshes().filter(mesh => mesh.geometry === geometry[name]).reduce((count, mesh) => count + mesh.count, 0);
  return { state, prepared, meshes, assets, geometry, layer, suppressed, build, propMeshes, fields, assetCount };
}

type GroundPoint = { x: number; z: number };
function insideFootprint(point: GroundPoint, polygon: readonly GroundPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j]!, b = polygon[i]!, dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
    if (Math.hypot(point.x - a.x - t * dx, point.z - a.z - t * dz) < 1e-5) return true;
    if ((a.z > point.z) !== (b.z > point.z) && point.x < (b.x - a.x) * (point.z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

function assertFittedFields(f: ReturnType<typeof fixtures>, supports: readonly GroundPoint[][] = []): number {
  let samples = 0, visibleSamples = 0;
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
  for (const mesh of f.fields().filter(mesh => mesh.position.x === 0)) {
    const p = mesh.geometry.getAttribute('position');
    const stride = Math.max(1, Math.floor(p.count / 250));
    for (let i = 0; i < p.count; i += stride) {
      const point = new Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      // Open-court monuments have solid supports in the same terrain batch.
      // Their walls legitimately extend above the pigment's surface bias.
      if (supports.some(polygon => insideFootprint(point, polygon))) continue;
      ray.ray.origin.set(point.x, 3, point.z);
      const hits = ray.intersectObjects(f.meshes, false);
      // Mound and plate triangles overlap. Buried pigment is valid: each
      // sample must hug an actual face, and visible pigment must hug the top.
      expect(hits.some(hit => point.y - hit.point.y >= -2e-5 && point.y - hit.point.y < .025)).toBe(true);
      if (hits[0] && point.y >= hits[0].point.y - 2e-5) {
        expect(point.y - hits[0].point.y).toBeLessThan(.025); visibleSamples++;
      }
      samples++;
    }
  }
  expect(samples).toBeGreaterThan(30);
  expect(visibleSamples).toBeGreaterThan(15);
  return samples;
}

describe('painted resources and core improvements', () => {
  it('emits real prop instances for every resource, including all six marine resources', () => {
    const state = world(18, 18), cells: number[] = [];
    for (const [index, id] of RESOURCE_IDS.entries()) {
      const tile = getTileAt(state.map, 2 + index % 7 * 2, 2 + Math.floor(index / 7) * 2)!;
      const def = resourceDef(id); tile.terrain = def.validTerrain[0]!; tile.feature = def.validFeatures?.[0] ?? 'none'; tile.hills = def.hills ?? false;
      tile.resource = id; cells.push(tileIndex(state.map, tile.col, tile.row));
    }
    const f = fixtures(state); f.build(null);
    expect(f.layer.entries.map(entry => entry.resource).sort()).toEqual([...RESOURCE_IDS].sort());
    const drawn = new Set(f.propMeshes().flatMap(mesh => mesh.userData.paintedWorksCells as number[]));
    expect(cells.every(cell => drawn.has(cell))).toBe(true);
    for (const entry of f.layer.entries.filter(entry => state.map.tiles[entry.cell]!.terrain === 'coast')) {
      let observed = 0;
      for (const mesh of f.propMeshes().filter(mesh => mesh.position.x === 0)) {
        const names = mesh.userData.paintedWorksCells as number[];
        for (let i = 0; i < mesh.count; i++) if (names[i] === entry.cell) {
          const matrix = new Matrix4(); mesh.getMatrixAt(i, matrix);
          expect(Math.abs(new Vector3().setFromMatrixPosition(matrix).y - WATER_LEVEL)).toBeLessThan(.025); observed++;
        }
      }
      expect(observed).toBeGreaterThan(0);
    }
  });

  it('reveals horses, iron and niter only for the seat with their actual technologies', () => {
    const state = world();
    for (const [col, resource] of [[1, 'horses'], [3, 'iron'], [5, 'niter']] as const) getTileAt(state.map, col, 2)!.resource = resource;
    const f = fixtures(state); f.build(); expect(f.layer.entries).toHaveLength(0);
    let previous = signPaintedWorks(state, 0);
    for (const [tech, resource] of [['husbandry', 'horses'], ['bronzePanoply', 'iron'], ['alchemy', 'niter']] as const) {
      state.players[0]!.techsResearched.push(tech);
      expect(signPaintedWorks(state, 0)).not.toBe(previous); previous = signPaintedWorks(state, 0);
      f.build(); expect(f.layer.entries.map(entry => entry.resource)).toContain(resource);
    }
    f.build(1); expect(f.layer.entries).toHaveLength(0);
    f.build(null); expect(f.layer.entries).toHaveLength(3);
  });

  it('never draws an unstruck vein, even for an observer, and follows a public strike', () => {
    const state = world(), tile = getTileAt(state.map, 3, 2)!; tile.hills = true; tile.vein = 'richOre';
    const f = fixtures(state); f.build(null); expect(f.layer.entries).toHaveLength(0); expect(f.propMeshes()).toHaveLength(0);
    const hidden = signPaintedWorks(state, null);
    tile.resource = tile.vein; delete tile.vein; tile.surveyed = true;
    expect(signPaintedWorks(state, null)).not.toBe(hidden);
    f.build(1); expect(f.layer.entries.map(entry => entry.resource)).toEqual(['richOre']);
  });

  it('keeps a herd inside its new pasture and honors resource clearing independently', () => {
    const state = world(), tile = getTileAt(state.map, 3, 2)!; tile.resource = 'cattle';
    const f = fixtures(state); f.build(); const herd = f.assetCount('cattle'); expect(herd).toBeGreaterThan(0);
    tile.improvement = 'pasture'; f.build(); expect(f.assetCount('cattle')).toBe(herd);
    expect(f.propMeshes().some(mesh => mesh.geometry !== f.assets.cattle)).toBe(true);
    const cell = tileIndex(state.map, tile.col, tile.row);
    f.suppressed.set(cell, SUPPRESS.clutter); f.build(); expect(f.assetCount('cattle')).toBe(herd);
    f.suppressed.set(cell, SUPPRESS.decor); f.build(); expect(f.assetCount('cattle')).toBe(0);
    expect(f.layer.entries.some(entry => entry.improvement === 'pasture')).toBe(true);
  });

  it('follows the actual hill faces with farm pigments and omits duplicate crop props', () => {
    const state = world(), tile = getTileAt(state.map, 3, 2)!; tile.hills = true; tile.resource = 'wheat'; tile.improvement = 'farm';
    const f = fixtures(state); f.build(); assertFittedFields(f);
    const positions = f.fields()[0]!.geometry.getAttribute('position');
    const heights = Array.from({ length: positions.count }, (_, i) => positions.getY(i));
    expect(Math.max(...heights)).toBeGreaterThan(LAND_LEVEL + .04);
    expect(new Set(heights.map(height => height.toFixed(3))).size).toBeGreaterThan(15);
    const before = f.propMeshes().map(mesh => [mesh.geometry, mesh.count]);
    delete tile.resource; f.build();
    expect(f.propMeshes().map(mesh => [mesh.geometry, mesh.count])).toEqual(before);
  });

  it('paints a mine’s grey rock surface directly onto the hill', () => {
    const state = world(), tile = getTileAt(state.map, 3, 2)!; tile.hills = true; tile.improvement = 'mine';
    const f = fixtures(state); f.build(); assertFittedFields(f); expect(f.assetCount('mine')).toBe(3);
    const grey = new Color('#aaaeba');
    const colors = f.fields().flatMap(mesh => {
      const color = mesh.geometry.getAttribute('color'); return Array.from({ length: color.count }, (_, i) => new Color(color.getX(i), color.getY(i), color.getZ(i)));
    });
    expect(colors.some(color => color.toArray().every((value, index) => Math.abs(value - grey.toArray()[index]!) < 1e-5))).toBe(true);
  });

  it('fits farmhouses, mines, camps and coastal quarries to exact terrain under their whole footprint', () => {
    const state = world(12, 8);
    for (const [col, row, improvement, hills] of [[2, 2, 'farm', true], [5, 2, 'mine', true], [8, 2, 'camp', true], [5, 5, 'quarry', false]] as const) {
      const tile = getTileAt(state.map, col, row)!; tile.improvement = improvement; tile.hills = hills;
    }
    getTileAt(state.map, 6, 5)!.terrain = 'coast';
    const f = fixtures(state); f.build(); expect(f.layer.placements).toHaveLength(4);
    for (const placement of f.layer.placements) {
      const points = [...placement.footprint, { x: placement.x, z: placement.z }];
      const heights = points.map(point => samplePaintedWorld(state.map, point.x, point.z)!);
      expect(heights.every(Number.isFinite)).toBe(true);
      expect(placement.foundationMin).toBeLessThanOrEqual(Math.min(...heights) + 1e-5);
      expect(placement.foundationMax).toBeGreaterThanOrEqual(Math.max(...heights) - 1e-5);
      const asset = f.geometry[placement.asset]!;
      const matches = f.propMeshes().filter(mesh => mesh.position.x === 0 && mesh.geometry === asset).flatMap(mesh => {
        const result: Vector3[] = [];
        for (let i = 0; i < mesh.count; i++) { const matrix = new Matrix4(); mesh.getMatrixAt(i, matrix); result.push(new Vector3().setFromMatrixPosition(matrix)); }
        return result;
      });
      expect(matches.some(point => point.distanceTo(new Vector3(placement.x, placement.y, placement.z)) < 1e-5)).toBe(true);
    }
  });

  it('removes pillaged works but retains the seam and ignores unrelated state in its fingerprint', () => {
    const state = world(), tile = getTileAt(state.map, 3, 2)!; tile.hills = true; tile.resource = 'copper'; tile.improvement = 'mine'; tile.road = 0;
    const f = fixtures(state); f.build(); const before = signPaintedWorks(state, 0);
    state.players[0]!.gold += 1; expect(signPaintedWorks(state, 0)).toBe(before);
    const raider = createUnit(state, 1, 'warrior', tile.col, tile.row); pillageAt(state, raider, tile);
    expect(tile.improvement).toBeUndefined(); expect(tile.road).toBeUndefined(); expect(tile.resource).toBe('copper');
    expect(signPaintedWorks(state, 0)).not.toBe(before);
    f.build(); expect(f.assetCount('mine')).toBe(0); expect(f.fields()).toHaveLength(0);
    expect(f.layer.entries.map(entry => entry.resource)).toEqual(['copper']);
  });

  it('hides uncharted props and retains remembered works', () => {
    const state = world(), tile = getTileAt(state.map, 3, 2)!; tile.improvement = 'pasture'; tile.resource = 'cattle';
    const f = fixtures(state), cell = tileIndex(state.map, tile.col, tile.row);
    f.build(); const visible = f.assetCount('cattle');
    state.visibility[0]![cell] = EXPLORED; f.build(); expect(f.assetCount('cattle')).toBe(visible);
    expect(f.layer.entries[0]!.level).toBe(EXPLORED);
    expect(f.propMeshes().every(mesh => (mesh.material as MeshStandardMaterial).userData.paintedWorksExplored === true)).toBe(true);
    expect(f.assets.material.userData.paintedWorksExplored).toBeUndefined();
    state.visibility[0]![cell] = HIDDEN; f.build(); expect(f.propMeshes()).toHaveLength(0); expect(f.fields()).toHaveLength(0);
  });

  it('retains the painterly shader when adding the remembered-ground wash', () => {
    const state = world(), tile = getTileAt(state.map, 3, 2)!; tile.resource = 'cattle';
    const f = fixtures(state);
    f.assets.material.onBeforeCompile = shader => { shader.uniforms.approvedPigment = { value: .42 }; };
    state.visibility[0]![tileIndex(state.map, tile.col, tile.row)] = EXPLORED; f.build();
    const material = f.propMeshes()[0]!.material as MeshStandardMaterial;
    const shader = { uniforms: {}, vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader };
    material.onBeforeCompile(shader as Parameters<MeshStandardMaterial['onBeforeCompile']>[0], undefined!);
    expect(shader.uniforms).toHaveProperty('approvedPigment', { value: .42 });
    expect(shader.uniforms).toHaveProperty('paintedWorksWash');
    expect(shader.fragmentShader.match(/outgoingLight = mix\(outgoingLight, paintedWorksWash/g)).toHaveLength(1);
  });

  it('retains unchanged wrap batches and releases them once without disposing borrowed assets', () => {
    const state = world(); getTileAt(state.map, 0, 2)!.improvement = 'farm'; getTileAt(state.map, 3, 2)!.resource = 'cattle'; getTileAt(state.map, 5, 2)!.resource = 'cattle';
    const f = fixtures(state); f.build();
    const herds = f.propMeshes().filter(mesh => mesh.geometry === f.assets.cattle);
    expect(herds).toHaveLength(3); expect(herds.map(mesh => mesh.count)).toEqual([6, 6, 6]);
    expect(herds[0]!.instanceMatrix.array).toEqual(herds[1]!.instanceMatrix.array);
    expect(herds[1]!.instanceMatrix.array).toEqual(herds[2]!.instanceMatrix.array);
    const period = wrapWidth(state.map); expect(herds.map(mesh => mesh.position.x).sort((a, b) => a - b)).toEqual([-period, 0, period]);
    const fieldGeometry = new Set(f.fields().map(mesh => mesh.geometry)); expect(fieldGeometry.size).toBe(1);
    const releasedFields = [...fieldGeometry].map(geometry => vi.spyOn(geometry, 'dispose'));
    const releasedInstances = f.propMeshes().map(mesh => vi.spyOn(mesh, 'dispose'));
    const borrowed = Object.values(f.geometry).map(geometry => vi.spyOn(geometry, 'dispose'));
    const borrowedMaterial = vi.spyOn(f.assets.material, 'dispose');
    const procedural = [...new Set(f.propMeshes().map(mesh => mesh.geometry))].filter(geometry => !Object.values(f.geometry).includes(geometry));
    expect(procedural.length).toBeGreaterThan(0);
    const releasedProcedural = procedural.map(geometry => vi.spyOn(geometry, 'dispose'));
    const originalMeshes = [...f.layer.group.children];
    f.build(); expect(f.layer.group.children).toEqual(originalMeshes);
    for (const released of [...releasedFields, ...releasedInstances]) expect(released).not.toHaveBeenCalled();
    for (const asset of borrowed) expect(asset).not.toHaveBeenCalled();
    for (const geometry of releasedProcedural) expect(geometry).not.toHaveBeenCalled();
    const currentFields = [...new Set(f.fields().map(mesh => mesh.geometry))].map(geometry => vi.spyOn(geometry, 'dispose'));
    f.layer.dispose(); f.layer.dispose();
    for (const released of releasedInstances) expect(released).toHaveBeenCalledOnce();
    for (const disposed of currentFields) expect(disposed).toHaveBeenCalledOnce();
    expect(f.layer.group.children).toHaveLength(0);
    for (const asset of borrowed) expect(asset).not.toHaveBeenCalled();
    expect(borrowedMaterial).not.toHaveBeenCalled();
    for (const geometry of releasedProcedural) expect(geometry).toHaveBeenCalledOnce();
  });
});

describe('painted plantations, lumbermills and fishing boats', () => {
  it('retains untouched region buffers across fog and resource changes elsewhere', () => {
    const state = world(24, 4);
    state.map.tiles[1]!.resource = 'cattle'; state.map.tiles[18]!.resource = 'cattle';
    const f = fixtures(state); f.build();
    const remote = f.propMeshes().filter(mesh => mesh.userData.paintedWorksCells.includes(18));
    expect(remote).toHaveLength(3);
    const oldLocal = f.propMeshes().filter(mesh => mesh.userData.paintedWorksCells.includes(1));
    const disposed = oldLocal.map(mesh => vi.spyOn(mesh, 'dispose'));
    state.visibility[0]![1] = HIDDEN; f.build();
    for (const mesh of remote) expect(f.layer.group.children).toContain(mesh);
    for (const spy of disposed) expect(spy).toHaveBeenCalledOnce();
    state.map.tiles[1]!.resource = 'bison'; state.visibility[0]![1] = VISIBLE; f.build();
    for (const mesh of remote) expect(f.layer.group.children).toContain(mesh);
    expect(f.propMeshes().some(mesh => mesh.geometry === f.assets.bison)).toBe(true);
  });
  /**
   * The count, not just the survival (#7's residual, P10).
   *
   * The layer batches by twelve-hex region, and a hex crossing between watched
   * and remembered swaps the wash its props are drawn with — so that hex's
   * region is re-instanced and re-merged. What this pins is that *only* that
   * region is: the audit's reading was that one fog texel rebuilt the whole
   * map's works, and the meshes of every other region must come through the
   * rebuild as the same objects, by identity, however many regions there are.
   */
  it('rebuilds only the region a fog move touched, and counts what that costs', () => {
    const state = world(48, 4);
    const marked = [2, 14, 26, 38].map(col => tileIndex(state.map, col, 1));
    for (const cell of marked) state.map.tiles[cell]!.resource = 'cattle';
    const f = fixtures(state); f.build();
    const regionOf = (cell: number) => `${Math.floor(cell % 48 / 12)},${Math.floor(Math.floor(cell / 48) / 12)}`;
    const cellsOf = (mesh: Mesh) => mesh.userData.paintedWorksCells as number[];
    const before = f.layer.group.children.filter((child): child is Mesh => child instanceof Mesh);
    expect(new Set(before.map(mesh => regionOf(cellsOf(mesh)[0]!))).size).toBe(4);
    const moved = marked[1]!;
    state.visibility[0]![moved] = EXPLORED; f.build();
    const after = f.layer.group.children.filter((child): child is Mesh => child instanceof Mesh);
    const kept = new Set(after.filter(mesh => before.includes(mesh)));
    for (const mesh of before) {
      const touched = regionOf(cellsOf(mesh)[0]!) === regionOf(moved);
      expect(kept.has(mesh), `${touched ? 'touched' : 'untouched'} region ${regionOf(cellsOf(mesh)[0]!)}`).toBe(!touched);
    }
    // One region's worth, three wrap copies of it, and nothing else.
    expect(before.length - kept.size).toBe(before.length / 4);
    expect(after.filter(mesh => cellsOf(mesh).includes(moved))).toHaveLength(3);
  });
  it('cultivates all thirteen plantation resources, including reeds, while retaining woodland features', () => {
    const state = world(14, 8), resources = improvementDef('plantation').improvesResource!;
    const tiles = resources.map((resource, index) => {
      const tile = getTileAt(state.map, 1 + index % 6 * 2, 1 + Math.floor(index / 6) * 2)!;
      const def = resourceDef(resource); tile.resource = resource; tile.terrain = def.validTerrain[0]!;
      tile.feature = def.validFeatures?.[0] ?? 'none'; tile.hills = def.hills ?? false; return tile;
    });
    const f = fixtures(state), features = tiles.map(tile => tile.feature), clear = signImprovedCells(state);
    const before = signPaintedWorks(state, 0); tiles.forEach(tile => { tile.improvement = 'plantation'; }); f.build();
    expect(resources).toHaveLength(13);
    expect(f.layer.entries.map(entry => entry.resource).sort()).toEqual([...resources].sort());
    expect(f.layer.entries.every(entry => entry.improvement === 'plantation')).toBe(true);
    expect(tiles.map(tile => tile.feature)).toEqual(features);
    expect(signImprovedCells(state)).toBe(clear); expect(signPaintedWorks(state, 0)).not.toBe(before);
    expect(f.assetCount('house')).toBe(resources.length * 3);
    const cultivated = new Set(f.fields().flatMap(mesh => mesh.userData.paintedWorksCells as number[]));
    for (const tile of tiles) expect(cultivated.has(tileIndex(state.map, tile.col, tile.row))).toBe(true);
    // Olives require hills in the real resource table, so the plantation's
    // house must stand on the sculpted slope rather than a flat tile datum.
    const olive = tiles.find(tile => tile.resource === 'olives')!;
    const house = f.layer.placements.find(placement => placement.cell === tileIndex(state.map, olive.col, olive.row))!;
    expect(house).toBeDefined();
    const heights = house.footprint.map(point => samplePaintedWorld(state.map, point.x, point.z)!);
    expect(house.foundationMin).toBeLessThanOrEqual(Math.min(...heights) + 1e-5);
    expect(house.foundationMax).toBeGreaterThanOrEqual(Math.max(...heights) - 1e-5);
  });

  it.each(['forest', 'jungle'] as const)('fits a mill and log stockpile while preserving %s and its legal rich-ore seam', feature => {
    const state = world(), tile = getTileAt(state.map, 3, 2)!; tile.feature = feature; tile.hills = true; tile.resource = 'richOre';
    const f = fixtures(state); f.build();
    const resourceGeometry = new Set(f.propMeshes().map(mesh => mesh.geometry));
    const clear = signImprovedCells(state); tile.improvement = 'lumbermill'; f.build();
    expect(tile.feature).toBe(feature); expect(tile.resource).toBe('richOre');
    expect(signImprovedCells(state)).toBe(clear);
    expect(f.layer.entries[0]).toMatchObject({ resource: 'richOre', improvement: 'lumbermill' });
    expect(f.propMeshes().filter(mesh => resourceGeometry.has(mesh.geometry)).reduce((sum, mesh) => sum + mesh.count, 0)).toBeGreaterThan(0);
    expect(f.layer.placements.map(placement => placement.asset).sort()).toEqual(['lumber-stockpile', 'lumbermill']);
    for (const placement of f.layer.placements) {
      const points = [...placement.footprint, { x: placement.x, z: placement.z }];
      const heights = points.map(point => samplePaintedWorld(state.map, point.x, point.z)!);
      expect(heights.every(Number.isFinite)).toBe(true);
      expect(placement.foundationMin).toBeLessThanOrEqual(Math.min(...heights) + 1e-5);
      expect(placement.foundationMax).toBeGreaterThanOrEqual(Math.max(...heights) - 1e-5);
      const drawn = f.propMeshes().filter(mesh => mesh.position.x === 0).some(mesh => {
        for (let i = 0; i < mesh.count; i++) {
          const matrix = new Matrix4(); mesh.getMatrixAt(i, matrix);
          if (new Vector3().setFromMatrixPosition(matrix).distanceTo(new Vector3(placement.x, placement.y, placement.z)) < 1e-5) return true;
        }
        return false;
      });
      expect(drawn).toBe(true);
    }
    const procedural = [...new Set(f.propMeshes().map(mesh => mesh.geometry))].filter(geometry => !resourceGeometry.has(geometry) && !Object.values(f.geometry).includes(geometry));
    expect(procedural.length).toBeGreaterThan(0);
    const dispose = procedural.map(geometry => vi.spyOn(geometry, 'dispose'));
    f.layer.dispose(); f.layer.dispose(); for (const call of dispose) expect(call).toHaveBeenCalledOnce();
  });

  it('puts one fishing boat on each of the six marine seams at the water datum in all wrap copies', () => {
    const state = world(14, 6), resources = improvementDef('fishingBoats').improvesResource!;
    const tiles = resources.map((resource, i) => { const tile = getTileAt(state.map, i * 2, 2)!; tile.terrain = 'coast'; tile.resource = resource; return tile; });
    const f = fixtures(state), clear = signImprovedCells(state);
    f.build(); expect(f.assetCount('fishing-boat')).toBe(0);
    tiles.forEach(tile => { tile.improvement = 'fishingBoats'; }); f.build();
    expect(f.assetCount('fishing-boat')).toBe(18); expect(signImprovedCells(state)).toBe(clear);
    expect(f.layer.entries.map(entry => entry.resource).sort()).toEqual([...resources].sort());
    expect(f.fields()).toHaveLength(0); expect(f.layer.placements).toHaveLength(0);
    const boats = f.propMeshes().filter(mesh => mesh.geometry === f.geometry['fishing-boat']);
    expect(boats.map(mesh => mesh.position.x).sort((a, b) => a - b)).toEqual([-wrapWidth(state.map), 0, wrapWidth(state.map)]);
    for (const boat of boats) for (let i = 0; i < boat.count; i++) {
      const matrix = new Matrix4(); boat.getMatrixAt(i, matrix);
      expect(new Vector3().setFromMatrixPosition(matrix).y).toBeCloseTo(WATER_LEVEL - .016, 5);
    }
    for (const tile of tiles) {
      const cell = tileIndex(state.map, tile.col, tile.row);
      expect(f.propMeshes().filter(mesh => mesh.geometry !== f.geometry['fishing-boat']).some(mesh => (mesh.userData.paintedWorksCells as number[]).includes(cell))).toBe(true);
    }
  });

  it.each(['plantation', 'lumbermill', 'fishingBoats'] as const)('uses actual %s state through visibility changes and pillage without requiring its build technology', improvement => {
    const state = world(), tile = getTileAt(state.map, 3, 2)!;
    if (improvement === 'plantation') tile.resource = 'wine';
    if (improvement === 'lumbermill') tile.feature = 'forest';
    if (improvement === 'fishingBoats') { tile.terrain = 'coast'; tile.resource = 'fish'; }
    tile.improvement = improvement; const f = fixtures(state), cell = tileIndex(state.map, tile.col, tile.row); f.build();
    expect(state.players[0]!.techsResearched).toHaveLength(0);
    expect(f.layer.entries[0]!.improvement).toBe(improvement);
    state.visibility[0]![cell] = EXPLORED; f.build();
    expect(f.propMeshes().length).toBeGreaterThan(0);
    expect(f.propMeshes().every(mesh => (mesh.material as MeshStandardMaterial).userData.paintedWorksExplored === true)).toBe(true);
    state.visibility[0]![cell] = HIDDEN; f.build(); expect(f.propMeshes()).toHaveLength(0); expect(f.fields()).toHaveLength(0);
    state.visibility[0]![cell] = VISIBLE; f.build();
    const before = signPaintedWorks(state, 0), feature = tile.feature, resource = tile.resource;
    const raider = createUnit(state, 1, improvement === 'fishingBoats' ? 'trireme' : 'warrior', tile.col, tile.row);
    pillageAt(state, raider, tile); f.build(null);
    expect(tile.improvement).toBeUndefined(); expect(tile.feature).toBe(feature); expect(tile.resource).toBe(resource);
    expect(signPaintedWorks(state, 0)).not.toBe(before);
    expect(f.layer.entries.every(entry => entry.improvement === undefined)).toBe(true);
    expect(f.layer.placements).toHaveLength(0); expect(f.fields()).toHaveLength(0);
  });

  it('replaces the approved works only in the painted look and retains excluded floating gardens', () => {
    const state = world(14, 6);
    const ids = ['plantation', 'lumbermill', 'fishingBoats', ...SPECIAL_WORKS, 'floatingGardens'] as const;
    ids.forEach((improvement, col) => { getTileAt(state.map, col, 2)!.improvement = improvement; });
    const layer = new ImprovementLayer(), geometry = new BoardGeometry(), materials = new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
    cleanup.push(() => { layer.dispose(); geometry.dispose(); materials.dispose(); });
    layer.build(state, geometry, materials, false); expect(layer.instances).toBe(ids.length);
    layer.build(state, geometry, materials, false, null, new Set(PAINTED_WORK_IMPROVEMENTS));
    expect(layer.instances).toBe(1);
    expect(layer.group.children.some(mesh => mesh instanceof InstancedMesh && mesh.geometry === geometry.improvementProps.floatingGardens)).toBe(true);
  });
});

describe('painted special improvements', () => {
  it('fits all six monuments to flat ground and coastal hills, sharing repeated instances across the cylinder', () => {
    const state = world(14, 10);
    const cells = SPECIAL_WORKS.flatMap((improvement, index) => [false, true].map(hills => {
      const col = index % 3 * 5, row = 2 + Math.floor(index / 3) * 4 + (hills ? 2 : 0);
      const tile = getTileAt(state.map, col, row)!; tile.hills = hills;
      if (hills) getTileAt(state.map, col - 1, row)!.terrain = 'coast';
      return { tile, improvement };
    }));
    const f = fixtures(state), clear = signImprovedCells(state);
    cells.forEach(({ tile, improvement }) => { tile.improvement = improvement; }); f.build();
    expect(f.layer.entries).toHaveLength(12); expect(f.layer.placements).toHaveLength(12);
    expect(signImprovedCells(state)).not.toBe(clear);
    for (const improvement of SPECIAL_WORKS) {
      const meshes = f.propMeshes().filter(mesh => mesh.geometry.userData.paintedWorkAsset === improvement);
      expect(meshes, improvement).toHaveLength(3);
      expect(meshes.map(mesh => mesh.count)).toEqual([2, 2, 2]);
      expect(new Set(meshes.map(mesh => mesh.geometry)).size).toBe(1);
      expect(meshes[0]!.geometry.name).toBe(improvement);
      expect(meshes[0]!.instanceMatrix.array).toEqual(meshes[1]!.instanceMatrix.array);
      expect(meshes[1]!.instanceMatrix.array).toEqual(meshes[2]!.instanceMatrix.array);
      expect(meshes.map(mesh => mesh.position.x).sort((a, b) => a - b)).toEqual([-wrapWidth(state.map), 0, wrapWidth(state.map)]);
    }
    const supports: GroundPoint[][] = [];
    for (const placement of f.layer.placements) {
      const tile = state.map.tiles[placement.cell]!, center = cellCenter(tile.col, tile.row);
      const mesh = f.propMeshes().find(mesh => mesh.position.x === 0 && mesh.geometry.userData.paintedWorkAsset === placement.asset)!;
      const index = (mesh.userData.paintedWorksCells as number[]).indexOf(placement.cell), matrix = new Matrix4();
      expect(index).toBeGreaterThanOrEqual(0); mesh.getMatrixAt(index, matrix);
      const localSupports = mesh.geometry.userData.supportFootprints as [number, number][][] | undefined;
      const footprints = localSupports?.map(polygon => polygon.map(([x, z]) => {
        const point = new Vector3(x, 0, z).applyMatrix4(matrix); return { x: point.x, z: point.z };
      })) ?? [placement.footprint];
      supports.push(...footprints);
      const points = footprints.flatMap(polygon => [...polygon,
        { x: polygon.reduce((sum, point) => sum + point.x, 0) / polygon.length, z: polygon.reduce((sum, point) => sum + point.z, 0) / polygon.length },
        ...polygon.map((point, index) => {
          const next = polygon[(index + 1) % polygon.length]!;
          return { x: (point.x + next.x) / 2, z: (point.z + next.z) / 2 };
        })]);
      const heights = points.map(point => samplePaintedWorld(state.map, point.x, point.z)!);
      expect(heights.every(Number.isFinite), placement.asset).toBe(true);
      expect(placement.foundationMin).toBeLessThanOrEqual(Math.min(...heights) + 1e-5);
      expect(placement.foundationMax).toBeGreaterThanOrEqual(Math.max(...heights) - 1e-5);
      for (const point of placement.footprint) expect(onTileTop(f.prepared.tiles[placement.cell], point.x - center.x, point.z - center.z, .018)).toBe(true);
      expect(new Vector3().setFromMatrixPosition(matrix).distanceTo(new Vector3(placement.x, placement.y, placement.z))).toBeLessThan(1e-5);
      mesh.geometry.computeBoundingBox(); const bounds = mesh.geometry.boundingBox!;
      for (const [x, z] of [[bounds.min.x, bounds.min.z], [bounds.max.x, bounds.min.z], [bounds.max.x, bounds.max.z], [bounds.min.x, bounds.max.z]]) {
        const point = new Vector3(x, 0, z).applyMatrix4(matrix);
        expect(placement.footprint.some(corner => Math.hypot(corner.x - point.x, corner.z - point.z) < 1e-5)).toBe(true);
      }
      // Units continue to stand at the terrain height. A full-box foundation
      // would fill the citadel/holy-site court even if the sculpt is open.
      const ray = new Raycaster(new Vector3(center.x, 3, center.z), new Vector3(0, -1, 0));
      const hit = ray.intersectObjects([...f.propMeshes(), ...f.fields()], false)[0];
      if (hit) expect(hit.point.y, `${placement.asset} leaves occupied center open`).toBeLessThanOrEqual(samplePaintedWorld(state.map, center.x, center.z)! + .025);
    }
    assertFittedFields(f, supports);
  });

  it('retains underlying resource props and access through clutter clearing while respecting seat research and hidden veins', () => {
    const state = world(14, 8), resources = ['horses', 'iron', 'niter', 'deer', 'wine', 'wheat'] as const;
    const tiles = SPECIAL_WORKS.map((improvement, index) => {
      const tile = getTileAt(state.map, index * 2, 2)!, resource = resources[index]!, def = resourceDef(resource);
      Object.assign(tile, { resource, terrain: def.validTerrain[0], feature: def.validFeatures?.[0] ?? 'none', hills: def.hills ?? false, improvement });
      return tile;
    });
    const buried = getTileAt(state.map, 11, 5)!; buried.improvement = 'holySite'; buried.vein = 'richOre';
    const town = foundCityAt(state, 0, getTileAt(state.map, 3, 6)!); state.tileOwner.fill(town.id);
    state.visibility.forEach(levels => levels.fill(VISIBLE));
    const f = fixtures(state);
    for (const tile of [...tiles, buried]) delete tile.improvement;
    f.build(null);
    const resourceGeometry = new Set(f.propMeshes().map(mesh => mesh.geometry));
    tiles.forEach((tile, index) => { tile.improvement = SPECIAL_WORKS[index]!; f.suppressed.set(tileIndex(state.map, tile.col, tile.row), SUPPRESS.clutter); });
    buried.improvement = 'holySite';
    f.build();
    for (const tile of tiles) {
      const cell = tileIndex(state.map, tile.col, tile.row), gated = resourceDef(tile.resource!).requiresTech !== undefined;
      expect(f.layer.entries.find(entry => entry.cell === cell)).toMatchObject({ improvement: tile.improvement, resource: gated ? null : tile.resource });
      expect(hasResource(state, 0, tile.resource!)).toBe(!gated);
    }
    const before = signPaintedWorks(state, 0);
    state.players[0]!.techsResearched.push('husbandry', 'bronzePanoply', 'alchemy'); bumpEconomy(state); f.build();
    expect(signPaintedWorks(state, 0)).not.toBe(before);
    for (const tile of tiles) {
      const cell = tileIndex(state.map, tile.col, tile.row);
      expect(f.layer.entries.find(entry => entry.cell === cell)).toMatchObject({ improvement: tile.improvement, resource: tile.resource });
      expect(hasResource(state, 0, tile.resource!)).toBe(true);
      expect(f.propMeshes().some(mesh => resourceGeometry.has(mesh.geometry) && (mesh.userData.paintedWorksCells as number[]).includes(cell))).toBe(true);
    }
    const hiddenCell = tileIndex(state.map, buried.col, buried.row);
    f.build(null); expect(f.layer.entries.find(entry => entry.cell === hiddenCell)).toMatchObject({ improvement: 'holySite', resource: null });
    expect(f.layer.entries.some(entry => entry.resource === 'richOre')).toBe(false);
    // Remove only resource silhouettes through the stronger decor scope. A
    // player's existing work still stands and still opens the actual seam.
    const deer = tiles[3]!, deerCell = tileIndex(state.map, deer.col, deer.row);
    expect(f.assetCount('deer')).toBeGreaterThan(0);
    f.suppressed.set(deerCell, SUPPRESS.decor); f.build();
    expect(f.assetCount('deer')).toBe(0);
    expect(f.layer.entries.find(entry => entry.cell === deerCell)).toMatchObject({ improvement: 'customsHouse', resource: null });
    expect(f.layer.placements.some(placement => placement.cell === deerCell && placement.asset === 'customsHouse')).toBe(true);
    expect(deer.feature).toBe('forest'); expect(deer.resource).toBe('deer'); expect(hasResource(state, 0, 'deer')).toBe(true);
    f.suppressed.set(deerCell, SUPPRESS.clutter); f.build(); expect(f.assetCount('deer')).toBeGreaterThan(0);
    f.build(1); expect(f.layer.entries.filter(entry => ['horses', 'iron', 'niter'].includes(entry.resource ?? ''))).toHaveLength(0);
    expect(f.layer.placements).toHaveLength(7);
  });

  it('keeps remembered monuments and removes pillaged models and plazas without removing the resource or feature', () => {
    const state = world(14, 8), tiles = SPECIAL_WORKS.map((improvement, index) => {
      const tile = getTileAt(state.map, index * 2, 2)!;
      Object.assign(tile, { improvement, resource: 'deer', feature: 'forest', road: 0 }); return tile;
    });
    const f = fixtures(state); tiles.forEach(tile => f.suppressed.set(tileIndex(state.map, tile.col, tile.row), SUPPRESS.clutter));
    f.build(); expect(f.layer.placements).toHaveLength(6);
    state.visibility[0]!.fill(EXPLORED); f.build();
    expect(f.layer.placements).toHaveLength(6);
    expect(f.propMeshes().every(mesh => (mesh.material as MeshStandardMaterial).userData.paintedWorksExplored === true)).toBe(true);
    state.visibility[0]!.fill(HIDDEN); f.build(); expect(f.propMeshes()).toHaveLength(0); expect(f.fields()).toHaveLength(0);
    state.visibility[0]!.fill(VISIBLE); f.build(); const before = signPaintedWorks(state, 0);
    const clear = signImprovedCells(state);
    for (const tile of tiles) {
      const raider = createUnit(state, 1, 'warrior', tile.col, tile.row); pillageAt(state, raider, tile);
      expect(tile.improvement).toBeUndefined(); expect(tile.road).toBeUndefined();
      expect(tile.resource).toBe('deer'); expect(tile.feature).toBe('forest');
    }
    f.build(null);
    expect(signPaintedWorks(state, 0)).not.toBe(before); expect(signImprovedCells(state)).not.toBe(clear);
    expect(f.layer.placements).toHaveLength(0); expect(f.fields()).toHaveLength(0);
    expect(f.propMeshes().some(mesh => mesh.geometry.userData.paintedWorkAsset)).toBe(false);
    expect(f.layer.entries).toHaveLength(6); expect(f.layer.entries.every(entry => entry.resource === 'deer' && entry.improvement === undefined)).toBe(true);
    expect(f.assetCount('deer')).toBe(54); expect([...f.suppressed.values()].every(scope => scope === SUPPRESS.clutter)).toBe(true);
  });

  it('reuses each generated monument through fog rebuilds and releases it once at final disposal', () => {
    const state = world(14, 6); SPECIAL_WORKS.forEach((improvement, index) => { getTileAt(state.map, index * 2, 2)!.improvement = improvement; });
    const f = fixtures(state); f.build();
    const generated = [...new Set(f.propMeshes().filter(mesh => mesh.geometry.userData.paintedWorkAsset).map(mesh => mesh.geometry))];
    expect(generated).toHaveLength(6);
    const sourceDisposals = generated.map(geometry => vi.spyOn(geometry, 'dispose'));
    const meshDisposals = f.propMeshes().map(mesh => vi.spyOn(mesh, 'dispose'));
    const fieldDisposals = [...new Set(f.fields().map(mesh => mesh.geometry))].map(geometry => vi.spyOn(geometry, 'dispose'));
    const borrowed = [...Object.values(f.geometry), f.assets.material].map(asset => vi.spyOn(asset, 'dispose'));
    state.visibility[0]!.fill(EXPLORED); f.build();
    for (const disposal of [...meshDisposals, ...fieldDisposals]) expect(disposal).toHaveBeenCalledOnce();
    for (const disposal of [...sourceDisposals, ...borrowed]) expect(disposal).not.toHaveBeenCalled();
    expect(new Set(f.propMeshes().filter(mesh => mesh.geometry.userData.paintedWorkAsset).map(mesh => mesh.geometry))).toEqual(new Set(generated));
    f.layer.dispose(); f.layer.dispose();
    for (const disposal of sourceDisposals) expect(disposal).toHaveBeenCalledOnce();
    for (const disposal of borrowed) expect(disposal).not.toHaveBeenCalled();
    expect(f.layer.group.children).toHaveLength(0);
  });

  /**
   * A silhouette casts and receives, a field patch only receives, and both are
   * flags rather than buffer contents. The setting used to be part of the batch
   * key — so turning shadows on re-instanced every animal and re-merged every
   * field on the map — and the site kit, which is this same layer under another
   * name, was never rebuilt on a toggle at all and kept its unlit flags.
   */
  it('takes the shadow toggle over the props and patches it already batched', () => {
    const state = world(), tile = getTileAt(state.map, 3, 2)!;
    tile.resource = 'cattle'; tile.improvement = 'pasture';
    const f = fixtures(state);
    const flags = (): string[] => f.layer.group.children.map(mesh =>
      `${(mesh as Mesh).castShadow}:${(mesh as Mesh).receiveShadow}`);

    f.layer.build(state, f.prepared, state.visibility[0]!, 0, true, { suppressed: f.suppressed });
    const lit = flags(), geometries = f.layer.group.children.map(mesh => (mesh as Mesh).geometry);
    expect(lit.length).toBeGreaterThan(0);
    expect(lit.some(row => row.startsWith('true'))).toBe(true);

    f.layer.build(state, f.prepared, state.visibility[0]!, 0, false, { suppressed: f.suppressed });
    expect(flags().every(row => row === 'false:false')).toBe(true);
    // Nothing was re-instanced or re-merged to get there.
    expect(f.layer.group.children.map(mesh => (mesh as Mesh).geometry)).toEqual(geometries);

    f.layer.setShadows(true);
    expect(flags()).toEqual(lit);
    expect(f.layer.group.children.map(mesh => (mesh as Mesh).geometry)).toEqual(geometries);
  });
});
