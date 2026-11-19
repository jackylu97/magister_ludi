import {
  BufferGeometry, Color, DataTexture, DoubleSide, Float32BufferAttribute, Group, LinearFilter,
  Mesh, MeshBasicMaterial, SRGBColorSpace,
} from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { damageImprovement, getTileAt, raiseImprovement } from '../sim/map';
import { bumpRevision, type GameState } from '../sim/state';
import { VISIBLE } from '../sim/visibility';
import { createPaintedMotes, type PaintedMote } from '../render3d/paintedYieldLight';
import { hashUnit } from '../render3d/hash';
import { VIEW3D } from '../render3d/lookData';
import { createTileSurfaceSampler } from '../render3d/paintedTileSurface';
// @ts-expect-error The painted terrain kit is JavaScript.
import { centre, isWater, prepareTerrainMap, WATER_LEVEL } from '../terrainStudy/surface.js';
// @ts-expect-error The painted terrain kit is JavaScript.
import { terrainMesh } from '../terrainStudy/terrainMesh.js';
// @ts-expect-error The board shares its farm layout with the terrain study.
import { northStarFarmPlan } from '../terrainStudy/northStarWorks.js';

export const PILLAGE_VIEWS = [
  ['intact', 'Working'], ['models', 'Broken models'], ['ash', 'Ash'], ['embers', 'Ash and embers'],
] as const;
export type PillagePreview = typeof PILLAGE_VIEWS[number][0];

// The offsets put the fire beside the timber on the three land samples.
const samples = [
  { col: 16, row: 6, x: .21, z: -.27 }, { col: 17, row: 5, x: .04, z: -.12 },
  { col: 14, row: 7, x: .06, z: .08 }, { col: 19, row: 9, x: 0, z: 0 },
];

/** A soft, broken edge exposes the terrain and keeps adjoining tiles distinct. */
function ashTexture(water: boolean): DataTexture {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  const noise = new ImprovedNoise();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + .5) / size * 2 - 1;
      const v = (y + .5) / size * 2 - 1;
      // Cover the footprint continuously. Only the outer edge takes the brush shape.
      const broad = noise.noise(u * 2.7, v * 2.2, 3.74);
      const distance = Math.hypot(u * .94 + v * .12, v * (water ? 1.75 : 1.19));
      const edge = Math.max(0, Math.min(1, (.93 - distance + .24 * broad) / .52));
      const coverage = edge * edge * (3 - 2 * edge);
      const pigment = 8 * broad;
      const index = (y * size + x) * 4;
      pixels[index] = (water ? 103 : 114) + pigment;
      pixels[index + 1] = (water ? 126 : 103) + pigment;
      pixels[index + 2] = (water ? 127 : 89) + pigment;
      pixels[index + 3] = coverage * (water ? 100 : 148);
    }
  }
  const texture = new DataTexture(pixels, size, size);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** The gallery holds each damage stage so the reviewer can compare it from the same camera. */
export function pillageScene(state: GameState, seat: number) {
  const group = new Group();
  const ash = new Group();
  group.add(ash);
  const board = prepareTerrainMap(state.map, { wrap: true });
  const changed = samples.flatMap(sample => {
    const tile = getTileAt(state.map, sample.col, sample.row);
    if (!tile?.improvement) return [];
    return [{ tile, work: tile.improvement, built: tile.improvedOn, sample }];
  });
  const textures = [ashTexture(false), ashTexture(true)];
  const materials = textures.map(map => new MeshBasicMaterial({
    map, transparent: true, depthWrite: false, polygonOffset: true,
    polygonOffsetFactor: -1, polygonOffsetUnits: -2, side: DoubleSide,
  }));
  const surfaces: [BufferGeometry[], BufferGeometry[]] = [[], []];
  const motes: PaintedMote[] = [];
  const emberColors = ['#ec6131', '#ffa244', '#ffe095'].map(ink => new Color(ink));
  for (const { tile, sample } of changed) {
    const cell = tile.row * board.width + tile.col;
    if (state.visibility[seat]?.[cell] !== VISIBLE) continue;
    const painted = board.tiles[cell];
    const wet = isWater(painted);
    const [top, skirt] = terrainMesh(painted) as [BufferGeometry, BufferGeometry];
    skirt.dispose();
    const center = centre(painted);
    let anchorX = sample.x, anchorZ = sample.z;
    if (tile.improvement === 'farm') {
      const { yard } = northStarFarmPlan(painted, VIEW3D.visualTest.works) as { yard?: [number, number][] };
      if (yard?.length) {
        anchorX = yard.reduce((sum, point) => sum + point[0], 0) / yard.length;
        anchorZ = yard.reduce((sum, point) => sum + point[1], 0) / yard.length;
      }
    }
    const positions = top.getAttribute('position');
    const uv: number[] = [];
    const angle = hashUnit(tile.col, tile.row, 172) * Math.PI * 2;
    const sin = Math.sin(angle), cos = Math.cos(angle);
    for (let i = 0; i < positions.count; i++) {
      const dx = positions.getX(i) - center.x - anchorX, dz = positions.getZ(i) - center.z - anchorZ;
      uv.push(.5 + (dx * cos + dz * sin) * .72, .5 + (dz * cos - dx * sin) * .72);
      positions.setY(i, wet ? WATER_LEVEL + .014 : positions.getY(i) + .018);
    }
    top.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    surfaces[wet ? 1 : 0].push(top);
    if (wet) continue;

    const height = createTileSurfaceSampler(top, center.x, center.z);
    // Two low lights join the rising marks to the exposed timber.
    for (const offset of [-.10, .13]) {
      const dx = anchorX + offset, dz = anchorZ + .16;
      motes.push({ x: center.x + dx, y: (height(dx, dz) ?? 0) + .15, z: center.z + dz,
        mode: 'glow', size: .30, phase: .3 + offset, rnd: .4, strength: .85, color: emberColors[1]! });
    }
    for (let i = 0; i < 13; i++) {
      const t = i * 2.399 + tile.col;
      const dx = anchorX + .12 + Math.cos(t) * (.13 + i * .013);
      const dz = anchorZ + .16 + Math.sin(t) * (.12 + i * .009);
      const surfaceY = height(dx, dz);
      if (surfaceY === undefined) continue;
      const rnd = hashUnit(tile.col, tile.row, i + 71);
      motes.push({
        mode: i < 5 ? 'spark' : i < 8 ? 'hot' : 'matte',
        x: center.x + dx, y: surfaceY + .09 + rnd * .19, z: center.z + dz,
        size: VIEW3D.visualTest.yieldLight.d.moteSize[2]! * (i < 5 ? 1.8 : .88 + rnd * .44),
        phase: (i + rnd) / 13, rnd, strength: VIEW3D.visualTest.yieldLight.d.moteOpacity,
        color: emberColors[i % emberColors.length]!,
      });
    }
  }
  for (const [index, parts] of surfaces.entries()) {
    if (!parts.length) continue;
    const mesh = new Mesh(mergeGeometries(parts)!, materials[index]!);
    mesh.renderOrder = 1;
    ash.add(mesh);
    parts.forEach(part => part.dispose());
  }
  const fire = createPaintedMotes(motes);
  group.add(fire);
  return {
    group,
    show(mode: PillagePreview) {
      for (const { tile, work, built } of changed) {
        if (mode === 'intact' && tile.damagedImprovement) raiseImprovement(tile, work, built ?? state.turn);
        if (mode !== 'intact' && tile.improvement) damageImprovement(tile);
      }
      ash.visible = mode === 'ash' || mode === 'embers';
      fire.visible = mode === 'embers';
      bumpRevision(state);
    },
    dispose() {
      group.removeFromParent();
      for (const mesh of ash.children) (mesh as Mesh).geometry.dispose();
      fire.geometry.dispose();
      fire.material.dispose();
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
    },
  };
}
