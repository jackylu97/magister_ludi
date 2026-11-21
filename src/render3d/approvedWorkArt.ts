import { BufferGeometry, Color, type MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Tile } from '../sim/map';
import { APPROVED_WORKS, type ApprovedWorkId } from './approvedWorkCatalog';
import { cellCenter, directionDelta } from './layout';
// @ts-expect-error The shared art loader is JavaScript.
import { bakeSettlementScene } from '../terrainStudy/settlementAssets.js';
// @ts-expect-error The terrain kit is JavaScript.
import { WATER_LEVEL } from '../terrainStudy/surface.js';
// @ts-expect-error The terrain kit is JavaScript.
import { surfacePatch } from '../terrainStudy/surfacePatch.js';

export async function loadApprovedWork(id: ApprovedWorkId): Promise<BufferGeometry> {
  const file = APPROVED_WORKS[id].file;
  const url = new URL(`../../art/terrain-study/improvement-studies/${file}.glb`, import.meta.url);
  const gltf = await new GLTFLoader().loadAsync(url.href);
  const geometry: BufferGeometry = bakeSettlementScene(gltf.scene, file);
  geometry.name = id;
  return geometry;
}

interface Placement {
  sampleSurface(x: number, z: number): number;
  prop(geometry: BufferGeometry, material: MeshStandardMaterial, x: number, y: number, z: number,
    sx: number, sy: number, sz: number, yaw: number): void;
  push(material: MeshStandardMaterial, geometry: BufferGeometry): void;
}

/** The board review fitted the lower banks and roots to each hex while keeping the buildings upright. */
export function placeApprovedWork(id: ApprovedWorkId, shape: BufferGeometry, tile: Tile, top: BufferGeometry,
  material: MeshStandardMaterial, pigment: MeshStandardMaterial, placement: Placement): BufferGeometry | undefined {
  const spec = APPROVED_WORKS[id], center = cellCenter(tile.col, tile.row);
  let yaw: number = spec.yaw;
  if (id === 'baray' && tile.riverEdges) {
    const direction = directionDelta(Math.log2(tile.riverEdges & -tile.riverEdges));
    yaw = Math.atan2(direction.x, direction.z);
  }
  const cos = Math.cos(yaw) * spec.scale, sin = Math.sin(yaw) * spec.scale;
  const pos = shape.getAttribute('position');
  const dx = (i: number) => pos.getX(i) * cos + pos.getZ(i) * sin;
  const dz = (i: number) => pos.getZ(i) * cos - pos.getX(i) * sin;
  if (id === 'nazcaLines') {
    const colors = shape.getAttribute('color'), indices = shape.getIndex()!, color = new Color();
    const patches: BufferGeometry[] = [];
    for (let i = 0; i < indices.count; i += 3) {
      const corners = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)];
      const [a, b, c] = corners.map(k => [center.x + dx(k), center.z + dz(k)]);
      if (Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 1e-8) continue;
      const part: BufferGeometry = surfacePatch(top, [a, b, c], color.fromBufferAttribute(colors, corners[0]), .009);
      if (part.getAttribute('position').count) patches.push(part);
      else part.dispose();
    }
    if (patches.length) {
      const patch = mergeGeometries(patches);
      for (const part of patches) part.dispose();
      if (patch) placement.push(pigment, patch);
    }
    return;
  }
  let floor: number = WATER_LEVEL + .003;
  let fitted: BufferGeometry | undefined;
  if (id !== 'fishTraps') {
    const ground: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) <= .039) ground.push(placement.sampleSurface(dx(i), dz(i)));
    }
    ground.sort((a, b) => a - b);
    const percentile = id === 'hillfort' ? .89 : id === 'wildOrchard' ? .62 : .86;
    floor = ground[Math.floor((ground.length - 1) * percentile)] ?? placement.sampleSurface(0, 0);
    if (id === 'hillfort') {
      fitted = shape.clone();
      const adjusted = fitted.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i), weight = Math.min(1, Math.max(0, (.13 - y) / .115));
        if (weight > 0) adjusted.setY(i, y + (placement.sampleSurface(dx(i), dz(i)) - floor) * weight / spec.scale);
      }
      fitted.computeVertexNormals(); fitted.computeBoundingBox(); fitted.computeBoundingSphere();
    } else floor += .002;
  }
  placement.prop(fitted ?? shape, material, center.x, floor, center.z, spec.scale, spec.scale, spec.scale, yaw);
  return fitted;
}
