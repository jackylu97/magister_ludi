import { BackSide, DoubleSide, FrontSide, type Side, type BufferGeometry } from 'three';

type Face = { ax: number; az: number; bx: number; bz: number; cx: number; cz: number;
  ay: number; by: number; cy: number; inverse: number };
const spacing = .25;
const key = (x: number, z: number): string => `${Math.floor(x / spacing)},${Math.floor(z / spacing)}`;

/** Exact vertical contacts on one tile, without repeated whole-chunk raycasts.
 * Copies coefficients, so callers may dispose the source geometry afterward.
 * Overlapping hill/base triangles resolve to the uppermost surface.
 */
export function createTileSurfaceSampler(geometry: BufferGeometry, centerX: number, centerZ: number, side: Side = DoubleSide): (x: number, z: number) => number | undefined {
  const positions = geometry.getAttribute('position'), index = geometry.index;
  const count = index?.count ?? positions.count, buckets = new Map<string, Face[]>();
  for (let i = 0; i < count; i += 3) {
    const a = index ? index.getX(i) : i, b = index ? index.getX(i + 1) : i + 1, c = index ? index.getX(i + 2) : i + 2;
    const ax = positions.getX(a) - centerX, az = positions.getZ(a) - centerZ;
    const bx = positions.getX(b) - centerX, bz = positions.getZ(b) - centerZ;
    const cx = positions.getX(c) - centerX, cz = positions.getZ(c) - centerZ;
    const divisor = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(divisor) < 1e-12) continue;
    if ((side === FrontSide && divisor > 0) || (side === BackSide && divisor < 0)) continue;
    const face = { ax, az, bx, bz, cx, cz, ay: positions.getY(a), by: positions.getY(b), cy: positions.getY(c), inverse: 1 / divisor };
    const minX = Math.floor(Math.min(ax, bx, cx) / spacing), maxX = Math.floor(Math.max(ax, bx, cx) / spacing);
    const minZ = Math.floor(Math.min(az, bz, cz) / spacing), maxZ = Math.floor(Math.max(az, bz, cz) / spacing);
    for (let x = minX; x <= maxX; x++) for (let z = minZ; z <= maxZ; z++) {
      const id = `${x},${z}`, bucket = buckets.get(id);
      if (bucket) bucket.push(face); else buckets.set(id, [face]);
    }
  }
  return (x, z) => {
    let highest = -Infinity;
    for (const f of buckets.get(key(x, z)) ?? []) {
      const a = ((f.bz - f.cz) * (x - f.cx) + (f.cx - f.bx) * (z - f.cz)) * f.inverse;
      const b = ((f.cz - f.az) * (x - f.cx) + (f.ax - f.cx) * (z - f.cz)) * f.inverse;
      const c = 1 - a - b;
      if (a < -1e-7 || b < -1e-7 || c < -1e-7) continue;
      highest = Math.max(highest, a * f.ay + b * f.by + c * f.cy);
    }
    return highest === -Infinity ? undefined : highest;
  };
}
