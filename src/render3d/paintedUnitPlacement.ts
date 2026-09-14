import { Quaternion, Vector3 } from 'three';
import type { GameMap } from '../sim/map';
import { samplePaintedWorld } from './paintedSurface';
import type { PaintedUnitModel } from './paintedUnits';
import { VIEW3D } from './lookData';

// Terrain is immutable for a map. Cache exact resting contacts across selection,
// fog and badge rebuilds; the geometry owns its support samples, not the sim.
const resting = new WeakMap<GameMap, WeakMap<PaintedUnitModel, Map<string, number>>>();
const rotated = new WeakMap<PaintedUnitModel, Vector3[]>();

function contacts(model: PaintedUnitModel): Vector3[] {
  let points = rotated.get(model);
  if (!points) {
    const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), model.yaw);
    points = model.contacts.map(p => new Vector3(...p).applyQuaternion(yaw));
    rotated.set(model, points);
  }
  return points;
}

/** Upright chess pieces rest on their complete underside, including wheel treads. */
export function paintedUnitSupport(map: GameMap, model: PaintedUnitModel, x: number, z: number, fallback: number, moving = false): number {
  // Adjacent banks must not lift a floating hull by its oars or bow.
  if (model.waterborne) return fallback;
  let models = resting.get(map);
  if (!models) { models = new WeakMap(); resting.set(map, models); }
  let cache = models.get(model);
  if (!cache) { cache = new Map(); models.set(model, cache); }
  const key = `${x},${z}`;
  if (!moving && cache.has(key)) return cache.get(key)!;
  const points = contacts(model);
  // A moving piece hops; a bounded footprint prevents terrain sampling from
  // becoming work proportional to the sculpt's vertex count every frame.
  const stride = moving ? Math.max(1, Math.ceil(points.length / Math.max(1, VIEW3D.pieces.paintedMovingContacts))) : 1;
  let support = -Infinity;
  for (let i = 0; i < points.length; i += stride) {
    const p = points[i]!;
    const height = samplePaintedWorld(map, x + p.x, z + p.z);
    if (height !== undefined) support = Math.max(support, height - p.y);
  }
  if (!Number.isFinite(support)) return fallback;
  const y = support + VIEW3D.pieces.paintedContactLift;
  if (!moving) cache.set(key, y);
  return y;
}
