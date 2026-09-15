import { type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Tile } from '../sim/map';
import { terraceFarmGeometry } from './terraceFarmGeometry';
// @ts-expect-error Approved terrain modules remain JavaScript.
import { terrainMesh } from '../terrainStudy/terrainMesh.js';

export const TERRACE_LIFT = .055;

/** Exact planting shelves plus the original river-cut flat ground beneath them. */
export function terraceFarmSurface(tile: Tile): [BufferGeometry, BufferGeometry] {
  const [ground, skirt] = terrainMesh({ ...tile, hills: false }) as [BufferGeometry, BufferGeometry];
  const sculpt = terraceFarmGeometry();
  sculpt.translate(Math.sqrt(3) * (tile.col + tile.row % 2 * .5), TERRACE_LIFT, tile.row * 1.5);
  const result = mergeGeometries([ground, sculpt])!;
  ground.dispose(); sculpt.dispose();
  return [result, skirt];
}
