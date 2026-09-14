import { afterEach, describe, expect, it } from 'vitest';
import { BoxGeometry, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { TileIcons } from '../../src/render3d/badges3d';
import { BoardGeometry } from '../../src/render3d/board3d';
import { CityLayer, playerColor, signCities } from '../../src/render3d/cities3d';
import { cellCenter, wrapWidth } from '../../src/render3d/layout';
import { VIEW3D } from '../../src/render3d/lookData';
import { PaintedCityLayer, type PaintedCityAssets } from '../../src/render3d/paintedCities.js';
import { installPaintedSurface, samplePaintedWorld, uninstallPaintedSurface } from '../../src/render3d/paintedSurface';
import { placePiece } from '../../src/render3d/pieces';
import { MaterialLibrary } from '../../src/render3d/toon';
import { foundCityAt } from '../../src/sim/cities';
import { snapshotState } from '../../src/sim/game';
import { createMap, getTileAt, tileIndex, type GameMap } from '../../src/sim/map';
import { createUnit, newGame, type GameState } from '../../src/sim/state';
import { EXPLORED, HIDDEN, VISIBLE, resetVisibility } from '../../src/sim/visibility';
// @ts-expect-error No declarations for the shared study geometry.
import { prepareTerrainMap } from '../../src/terrainStudy/surface.js';
// @ts-expect-error No declarations for the shared study geometry.
import { terrainMesh } from '../../src/terrainStudy/terrainMesh.js';

const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); });

// Preserve the approved GLBs' asymmetric bounds and below-ground plinths. A
// symmetric unit cube would miss their protruding steps and foundation errors.
const bounds: Record<string, [number[], number[]]> = {
  'city-house': [[-.235, -.022, -.2184], [.241, .6668, .28]],
  'city-loggia': [[-.245, -.026, -.1925], [.245, .601, .2865]],
  'civic-sanctum': [[-.305, -.0195, -.305], [.305, 1.1473, .415]],
  'city-spire': [[-.14, -.022, -.14], [.14, 1.14, .14]],
  'city-dome': [[-.187, -.026, -.187], [.187, .558, .187]],
  house: [[-.245, -.17, -.225], [.245, .538, .225]],
  temple: [[-.31, -.18, -.32], [.31, .71, .347]],
  'bell-tower': [[-.15, -.16, -.145], [.15, .91, .145]],
};

function cityAssets(): PaintedCityAssets {
  const material = new MeshStandardMaterial({ color: 'white', vertexColors: true });
  cleanups.push(() => material.dispose());
  const entries = Object.entries(bounds).map(([name, [min, max]]) => {
    const geometry = new BoxGeometry(max[0]! - min[0]!, max[1]! - min[1]!, max[2]! - min[2]!);
    geometry.translate((min[0]! + max[0]!) / 2, (min[1]! + max[1]!) / 2, (min[2]! + max[2]!) / 2);
    geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3).fill(1), 3));
    cleanups.push(() => geometry.dispose());
    return [name, geometry];
  });
  return { material, ...Object.fromEntries(entries) } as PaintedCityAssets;
}

function fixture(kind: 'flat' | 'hill' | 'coastal' = 'flat', col = 3) {
  const state = newGame({ seed: 9, sizeName: 'duel', players: [
    { name: 'Red', color: '#ac3333', isHuman: true },
    { name: 'Blue', color: '#3344ac', isHuman: true },
  ] });
  state.map = createMap({ width: 8, height: 6, terrain: 'grassland' });
  state.units = []; state.cities = []; state.nextEntityId = 1;
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state);
  const tile = getTileAt(state.map, col, 2)!;
  tile.hills = kind === 'hill';
  if (kind === 'coastal') getTileAt(state.map, col + 1, 2)!.terrain = 'coast';
  foundCityAt(state, 0, tile);
  const city = state.cities[0]!;
  state.visibility[0]!.fill(VISIBLE);
  const prepared = prepareTerrainMap(state.map, { wrap: true }) as GameMap;
  const material = new MeshBasicMaterial({ side: DoubleSide }), tops: BufferGeometry[] = [];
  for (const tile of prepared.tiles) {
    const [top, side] = terrainMesh(tile) as [BufferGeometry, BufferGeometry]; side.dispose();
    for (const name of Object.keys(top.attributes)) if (name !== 'position') top.deleteAttribute(name);
    top.setAttribute('paintedCell', new Float32BufferAttribute(new Float32Array(top.getAttribute('position').count).fill(tileIndex(prepared, tile.col, tile.row)), 1));
    tops.push(top);
  }
  const terrain = mergeGeometries(tops)!; tops.forEach(top => top.dispose());
  const meshes = [-1, 0, 1].map(copy => {
    const mesh = new Mesh(terrain, material); mesh.position.x = copy * wrapWidth(state.map); return mesh;
  });
  installPaintedSurface(state.map, prepared, meshes);
  cleanups.push(() => { uninstallPaintedSurface(state.map); terrain.dispose(); material.dispose(); });
  const assets = cityAssets(), layer = new PaintedCityLayer(assets, () => undefined);
  cleanups.push(() => layer.dispose());
  function build(levels: number[] | null = state.visibility[0]!, previewWalls = false): void {
    const before = snapshotState(state);
    layer.build(state, prepared, levels, true, { previewWalls });
    expect(snapshotState(state)).toBe(before);
    layer.group.updateMatrixWorld(true);
  }
  return { state, city, tile, prepared, meshes, assets, layer, build };
}

function instances(group: Group, geometry?: BufferGeometry): { mesh: InstancedMesh; matrix: Matrix4; index: number }[] {
  const result: ReturnType<typeof instances> = [];
  group.traverse(object => {
    if (!(object instanceof InstancedMesh) || (geometry && object.geometry !== geometry)) return;
    for (let index = 0; index < object.count; index++) {
      const matrix = new Matrix4(); object.getMatrixAt(index, matrix); matrix.premultiply(object.matrixWorld);
      result.push({ mesh: object, matrix, index });
    }
  });
  return result;
}

function flags(state: GameState, anchors: PaintedCityLayer['flagAnchors'], levels: number[] | null = state.visibility[0]!) {
  const layer = new CityLayer(), geometry = new BoardGeometry();
  const materials = new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
  const material = new MeshBasicMaterial();
  const icons = { material, standingMaterial: material } as unknown as TileIcons;
  layer.build(state, geometry, materials, new Quaternion(), false, levels, icons, { towns: false, flagAnchors: anchors });
  layer.group.updateMatrixWorld(true);
  cleanups.push(() => { layer.dispose(); geometry.dispose(); materials.dispose(); material.dispose(); });
  return { layer, geometry, materials };
}

function distanceToFootprint(point: { x: number; z: number }, polygon: readonly { x: number; z: number }[]): number {
  let distance = Infinity, inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!, b = polygon[j]!, dx = b.x - a.x, dz = b.z - a.z;
    const fraction = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
    distance = Math.min(distance, Math.hypot(point.x - a.x - dx * fraction, point.z - a.z - dz * fraction));
    if ((a.z > point.z) !== (b.z > point.z) && point.x < dx * (point.z - a.z) / dz + a.x) inside = !inside;
  }
  return inside ? 0 : distance;
}

describe('painted cities in the live game', () => {
  it('grows the visible housing from actual population without moving existing homes', () => {
    const f = fixture(); f.build();
    const initial = f.layer.placements.filter(placement => placement.kind === 'house');
    expect(initial).toHaveLength(1);
    const before = signCities(f.state);
    f.city.population = 4; f.build();
    const grown = f.layer.placements.filter(placement => placement.kind === 'house');
    expect(grown).toHaveLength(4);
    expect(grown.slice(0, initial.length)).toEqual(initial);
    expect(signCities(f.state)).not.toBe(before);
    f.city.population = 30; f.build();
    expect(f.layer.placements.filter(placement => placement.kind === 'house').length).toBe(VIEW3D.city.houseCap);
  });

  it('changes sculpt with the current owner’s age and keeps later ages within the third kit', () => {
    const f = fixture(); f.city.population = 3; f.build();
    const first = JSON.stringify(f.layer.placements), firstSign = signCities(f.state);
    f.state.players[0]!.techsResearched.push('wayfinding'); f.build();
    const second = JSON.stringify(f.layer.placements);
    expect(second).not.toBe(first); expect(signCities(f.state)).not.toBe(firstSign);
    f.state.players[0]!.techsResearched.push('mathematics'); f.build();
    const third = JSON.stringify(f.layer.placements);
    expect(third).not.toBe(second);
    f.state.players[0]!.techsResearched.push('steel'); f.build();
    expect(JSON.stringify(f.layer.placements)).toBe(third);
  });

  it('shows walls only for a completed palisade or the explicit visual review option', () => {
    const f = fixture(); f.build();
    const walls = () => f.layer.placements.filter(placement => placement.kind === 'wall');
    expect(walls()).toHaveLength(0);
    f.build(null, true); expect(walls().length).toBeGreaterThan(0);
    expect(f.city.buildings).not.toContain('palisade');
    f.build(); expect(walls()).toHaveLength(0);
    f.state.players[0]!.techsResearched.push('wayfinding');
    const before = signCities(f.state);
    f.city.buildings.push('palisade'); f.build();
    expect(walls().length).toBeGreaterThan(0);
    expect(signCities(f.state)).not.toBe(before);
    const earlyWall = JSON.stringify(walls());
    f.state.players[0]!.techsResearched.push('mathematics'); f.build();
    expect(JSON.stringify(walls())).not.toBe(earlyWall);
    expect(f.city.buildings).not.toContain('stoneWalls');
  });

  it('draws completed shrine, temple and wonders without replacing the population houses', () => {
    const f = fixture(); f.city.population = 3; f.state.players[0]!.techsResearched.push('mathematics'); f.build();
    const count = (kind: string) => f.layer.placements.filter(placement => placement.kind === kind).length;
    expect(count('shrine')).toBe(0); expect(count('temple')).toBe(0); expect(count('wonder')).toBe(0);
    f.city.buildings.push('shrine', 'temple', 'pyramids', 'stonehenge'); f.build();
    expect(count('house')).toBe(3);
    expect(count('shrine')).toBe(1); expect(count('temple')).toBe(1); expect(count('wonder')).toBe(2);
  });

  it('keeps every town mesh and flag out of remembered and hidden cells', () => {
    const f = fixture(); f.city.population = 4; f.city.buildings.push('palisade', 'shrine', 'temple');
    for (const level of [HIDDEN, EXPLORED]) {
      f.state.visibility[0]![tileIndex(f.state.map, f.city.col, f.city.row)] = level;
      f.build();
      expect(f.layer.placements).toHaveLength(0);
      expect(instances(f.layer.group)).toHaveLength(0);
      expect(f.layer.flagAnchors.size).toBe(0);
      expect(instances(flags(f.state, f.layer.flagAnchors).layer.group)).toHaveLength(0);
    }
    f.build(null); expect(f.layer.placements.length).toBeGreaterThan(0);
    expect(f.layer.flagAnchors.has(f.city.id)).toBe(true);
  });

  it('captures into the new owner’s kit and flag while retaining faith and puppet marks', () => {
    const f = fixture(); f.city.population = 3; f.build();
    const former = JSON.stringify(f.layer.placements), formerSign = signCities(f.state);
    const first = flags(f.state, f.layer.flagAnchors);
    const flagInk = (built: ReturnType<typeof flags>) => instances(built.layer.group, built.geometry.bar).map(({ mesh }) => (mesh.material as MeshBasicMaterial).color.getHex());
    expect(flagInk(first)).toEqual([playerColor(f.state, 0), playerColor(f.state, 0), playerColor(f.state, 0)]);

    f.state.players[1]!.techsResearched.push('mathematics');
    f.city.ownerId = 1; f.city.captured = true; f.city.puppet = true;
    f.state.religions.push({ id: 0, founderId: 0, name: 'Hearth', pantheon: ['keeperOfTheHearth', 'theStandingStones'], follower: [], enhancer: [], foundedTurn: 0 });
    f.city.followers = { 0: f.city.population }; f.build();
    expect(signCities(f.state)).not.toBe(formerSign);
    expect(JSON.stringify(f.layer.placements)).not.toBe(former);
    const captured = flags(f.state, f.layer.flagAnchors), inks = flagInk(captured);
    expect(inks.filter(ink => ink === playerColor(f.state, 1))).toHaveLength(3);
    expect(inks.filter(ink => ink === playerColor(f.state, 0))).toHaveLength(3);
    expect(instances(captured.layer.group, captured.geometry.chargeMarkers.stag)).toHaveLength(3);
    expect(instances(captured.layer.group, captured.geometry.cityMarkers.puppet)).toHaveLength(3);
    // Banners-only mode cannot leave the old houses or palisade underneath.
    const oldBuildings = [captured.geometry.houseBody, captured.geometry.palisadeStake];
    for (const geometry of oldBuildings) expect(instances(captured.layer.group, geometry)).toHaveLength(0);
  });

  it.each(['hill', 'coastal'] as const)('fits upright buildings to the exact %s terrain and leaves the garrison court clear', kind => {
    const f = fixture(kind); f.city.population = 7;
    f.state.players[0]!.techsResearched.push('mathematics');
    f.city.buildings.push('palisade', 'shrine', 'temple', 'pyramids'); f.build();
    const centre = cellCenter(f.city.col, f.city.row);
    for (const placement of f.layer.placements) {
      const points = [...placement.footprint, ...placement.footprint.map((a, i, polygon) => {
        const b = polygon[(i + 1) % polygon.length]!; return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
      }), { x: placement.x, z: placement.z }];
      const heights = points.map(point => samplePaintedWorld(f.state.map, point.x, point.z));
      expect(heights.every(height => height !== undefined && Number.isFinite(height))).toBe(true);
      if (placement.kind !== 'gate' && !placement.roofMounted) expect(placement.foundationMin).toBeLessThanOrEqual(Math.min(...heights as number[]) + 1e-5);
      expect(placement.foundationMax).toBeGreaterThanOrEqual(Math.max(...heights as number[]) - 1e-5);
      expect(Number.isFinite(placement.y)).toBe(true);
      if (placement.kind !== 'wall' && placement.kind !== 'gate') {
        expect(distanceToFootprint(centre, placement.footprint)).toBeGreaterThanOrEqual(VIEW3D.pieces.base.radius - 1e-4);
        const geometry = f.assets[placement.asset as keyof PaintedCityAssets] as BufferGeometry;
        const draw = instances(f.layer.group, geometry).find(({ matrix }) => {
          const at = new Vector3().setFromMatrixPosition(matrix);
          return Math.abs(at.x - placement.x) < 1e-5 && Math.abs(at.z - placement.z) < 1e-5;
        });
        expect(draw, `missing actual ${placement.kind} instance`).toBeDefined();
        const at = new Vector3(), scale = new Vector3(), rotation = new Quaternion();
        draw!.matrix.decompose(at, rotation, scale);
        expect(at.y).toBeCloseTo(placement.y, 5);
        for (const component of [scale.x, scale.y, scale.z]) expect(component).toBeCloseTo(placement.scale, 5);
        expect(new Vector3(0, 1, 0).applyQuaternion(rotation).distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-6);
      }
    }
    const garrison = createUnit(f.state, 0, 'warrior', f.city.col, f.city.row);
    const second = createUnit(f.state, 0, 'worker', f.city.col, f.city.row);
    for (const [unit, slot] of [[garrison, 0], [second, 1]] as const) {
      const placed = placePiece(f.state.map, unit, slot).position;
      expect(placed.y).toBeCloseTo(samplePaintedWorld(f.state.map, placed.x, placed.z)!, 6);
    }
  });

  it('keeps identical city and flag placements across the cylindrical seam', () => {
    const f = fixture('hill', 0); f.city.population = 4; f.city.buildings.push('palisade'); f.build();
    const period = wrapWidth(f.state.map), built = instances(f.layer.group);
    const positions = built.map(({ matrix }) => new Vector3().setFromMatrixPosition(matrix));
    expect(positions.length).toBeGreaterThan(0);
    const quantize = (point: Vector3) => [point.x, point.y, point.z].map(value => value.toFixed(4)).join(',');
    const pointSet = new Set(positions.map(quantize));
    for (const point of positions.filter(point => Math.abs(point.x) < 1)) {
      expect(pointSet.has(quantize(point.clone().add(new Vector3(-period, 0, 0))))).toBe(true);
      expect(pointSet.has(quantize(point.clone().add(new Vector3(period, 0, 0))))).toBe(true);
    }
    const banners = flags(f.state, f.layer.flagAnchors);
    const poles = instances(banners.layer.group, banners.geometry.pole).filter(({ mesh }) => mesh.material !== banners.materials.outline).map(({ matrix }) => new Vector3().setFromMatrixPosition(matrix)).sort((a, b) => a.x - b.x);
    expect(poles).toHaveLength(3);
    expect(poles[1]!.x - poles[0]!.x).toBeCloseTo(period, 5);
    expect(poles[2]!.x - poles[1]!.x).toBeCloseTo(period, 5);
    const anchor = f.layer.flagAnchors.get(f.city.id)!;
    for (const pole of poles) {
      expect(pole.y).toBeCloseTo(anchor.y, 5);
      expect(pole.z).toBeCloseTo(anchor.z, 5);
    }
    const palette = (f.assets.material as MeshStandardMaterial).color;
    expect(palette.equals(new Color('white'))).toBe(true);
  });
});
