import {
  BufferGeometry, Color, DataTexture, DoubleSide, Float32BufferAttribute, Group, LinearFilter,
  Mesh, MeshBasicMaterial, ShaderMaterial, SRGBColorSpace,
} from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { damageImprovement, getTileAt, raiseImprovement } from '../sim/map';
import { bumpRevision, type GameState } from '../sim/state';
import { VISIBLE } from '../sim/visibility';
import { VTEST_UNIFORMS } from '../render3d/visualTestLook';
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
      const broad = noise.noise(2.4 * u, 2.9 * v, .73);
      const fleck = noise.noise(13 * u, 14 * v, 1.2);
      const streak = noise.noise(u * 2 + v, v * 8, 8.2);
      const radius = Math.hypot(u * 1.06, v * (water ? 1.85 : 1.02));
      const edge = Math.max(0, Math.min(1, (.99 - radius + .19 * broad + .075 * fleck) * 4.3));
      const pigment = 40 * broad + 18 * fleck + 16 * streak;
      const index = (y * size + x) * 4;
      pixels[index] = (water ? 73 : 106) + pigment;
      pixels[index + 1] = (water ? 106 : 97) + pigment;
      pixels[index + 2] = (water ? 117 : 93) + pigment;
      pixels[index + 3] = edge * (water ? 144 + 55 * streak : 191 + 32 * broad);
    }
  }
  const texture = new DataTexture(pixels, size, size);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function flameMesh(positions: number[], corners: number[], phases: number[]) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('corner', new Float32BufferAttribute(corners, 2));
  geometry.setAttribute('phase', new Float32BufferAttribute(phases, 2));
  const material = new ShaderMaterial({
    uniforms: {
      clock: VTEST_UNIFORMS.vtestTime, red: { value: new Color('#e56837') }, gold: { value: new Color('#ffd880') },
    },
    vertexShader: `uniform float clock;
      attribute vec2 corner;
      attribute vec2 phase;
      varying float heat;
      void main() {
        float t = fract(clock * .63 + phase.x);
        float flicker = .82 + .18 * sin(clock * 5. + phase.x * 9.);
        float height = .76 + .59 * fract(phase.x * 1.31);
        float spark = phase.y;
        vec4 p = modelViewMatrix * vec4(position, 1.);
        p.x += corner.x * mix(.070, .018, spark) * flicker + corner.y * .047 * sin(clock * 2. + phase.x);
        p.x += spark * t * .10;
        p.y += corner.y * mix(.31 * height, .048, spark) * flicker + spark * (.13 + t * .35);
        heat = clamp(corner.y + .45 * spark, 0., 1.);
        gl_Position = projectionMatrix * p;
      }`,
    fragmentShader: `uniform vec3 red;
      uniform vec3 gold;
      varying float heat;
      void main() {
        gl_FragColor = vec4(mix(gold, red, heat), .94);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;
  return mesh;
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
  const flames: number[] = [], corners: number[] = [], phases: number[] = [];
  for (const { tile, sample } of changed) {
    const cell = tile.row * board.width + tile.col;
    if (state.visibility[seat]?.[cell] !== VISIBLE) continue;
    const painted = board.tiles[cell];
    const wet = isWater(painted);
    const [top, skirt] = terrainMesh(painted) as [BufferGeometry, BufferGeometry];
    skirt.dispose();
    const center = centre(painted);
    const positions = top.getAttribute('position');
    const uv: number[] = [];
    const angle = (tile.col + tile.row) * 1.3;
    const sin = Math.sin(angle), cos = Math.cos(angle);
    for (let i = 0; i < positions.count; i++) {
      const dx = positions.getX(i) - center.x, dz = positions.getZ(i) - center.z;
      uv.push(.5 + (dx * cos + dz * sin) * .53, .5 + (dz * cos - dx * sin) * .53);
      positions.setY(i, wet ? WATER_LEVEL + .014 : positions.getY(i) + .006);
    }
    top.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    surfaces[wet ? 1 : 0].push(top);
    if (wet) continue;

    const height = createTileSurfaceSampler(top, center.x, center.z);
    let anchorX = sample.x, anchorZ = sample.z;
    if (tile.improvement === 'farm') {
      const { yard } = northStarFarmPlan(painted, VIEW3D.visualTest.works) as { yard?: [number, number][] };
      if (yard?.length) {
        anchorX = yard.reduce((sum, point) => sum + point[0], 0) / yard.length;
        anchorZ = yard.reduce((sum, point) => sum + point[1], 0) / yard.length;
      }
    }
    for (let i = 0; i < 8; i++) {
      const t = i * 2.399 + tile.col;
      const dx = anchorX + .16 + Math.cos(t) * (.09 + i * .02);
      const dz = anchorZ + .18 + Math.sin(t) * (.085 + i * .022);
      const surfaceY = height(dx, dz);
      if (surfaceY === undefined) continue;
      for (const [cx, cy] of [[-1, 0], [1, 0], [0, 1]] as const) {
        flames.push(center.x + dx, surfaceY + .016, center.z + dz);
        corners.push(cx, cy);
        phases.push(i * .71 + tile.col, i < 5 ? 0 : 1);
      }
    }
  }
  for (const [index, parts] of surfaces.entries()) {
    if (!parts.length) continue;
    const mesh = new Mesh(mergeGeometries(parts)!, materials[index]!);
    mesh.renderOrder = 1;
    ash.add(mesh);
    parts.forEach(part => part.dispose());
  }
  const fire = flameMesh(flames, corners, phases);
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
