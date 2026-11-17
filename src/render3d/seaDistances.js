import {ClampToEdgeWrapping, DataTexture, DataUtils, HalfFloatType, LinearFilter, RGBAFormat, RepeatWrapping} from 'three';
import {createFreeCoast} from './freeCoast';
import {createOrganicRivers} from './organicRivers';

/**
 * The sea's distances, as one picture of the whole map (the visual test,
 * 2026-11-13; `docs/flags.md`, "The sea's bands, smooth").
 *
 * The sea is painted in bands by distance: sand, foam, shallows, the coast's
 * blue, the ocean's blue. The paint used to read those distances from numbers
 * stored at the corners of the water's triangles, which are as large as a
 * hex, so the edge of every band was a chain of straight pieces. Here the
 * distances are worked out on a fine grid and given to the paint as a texture.
 * The graphics card blends between the grid's points, and a distance blends
 * well, so the edge of a band is a smooth curve.
 *
 * Each point of the grid holds three distances, in hex units:
 * - red: to the waterline of the free coast, positive on the water;
 * - green: to a second smooth line, between the ocean hexes and all others,
 *   positive on the ocean. Coast and ocean hexes change colour on it;
 * - blue: to the nearest river's outflow, a short line from the river's end
 *   out to sea, with a little added toward its far end, so a band cut from it
 *   is a tongue that narrows.
 *
 * The grid covers one turn of the map from west to east and repeats, so the
 * paint reads it the same way on every copy of the board.
 */
export function bakeSeaDistances(map, knobs, organicRivers) {
 return seaDistanceTexture(bakeSeaDistanceData(map, knobs, organicRivers));
}

/**
 * The numbers of the bake, with no texture: what `bakeSeaDistances` makes its
 * texture from. A worker can run this (`seaDistances.worker.js`) and hand the
 * numbers to the page, which makes the same texture from them.
 */
export function bakeSeaDistanceData(map, knobs, organicRivers) {
 const field = knobs.field;
 const mouths = organicRivers ? createOrganicRivers(map, organicRivers).mouths : [];
 const coast = createFreeCoast(map, knobs, mouths);
 const shelf = createFreeCoast(map, {...knobs, ...knobs.shelf, mouthInset: 0}, [], tile => tile.terrain !== 'ocean');
 const period = Math.sqrt(3) * map.width, originX = -Math.sqrt(3) / 2, originZ = -2, spanZ = (map.height - 1) * 1.5 + 4;
 const width = Math.max(4, Math.round(period * field.texels)), height = Math.max(4, Math.round(spanZ * field.texels));
 const data = new Uint16Array(width * height * 4);

 /** The hex a point lies in: the nearest centre, across the map's seam, and the nearest row past its top or bottom. */
 const hexAt = (x, z) => {
  const near = Math.round(z / 1.5);
  let found = null, best = Infinity;
  for (let row = Math.max(0, Math.min(map.height - 1, near - 1)); row <= Math.max(0, Math.min(map.height - 1, near + 1)); row++) {
   const raw = Math.round(x / Math.sqrt(3) - (row % 2) * .5), col = ((raw % map.width) + map.width) % map.width;
   const d = (Math.sqrt(3) * (raw + (row % 2) * .5) - x) ** 2 + (row * 1.5 - z) ** 2;
   if (d < best) { best = d; found = map.tiles[row * map.width + col]; }
  }
  return found;
 };
 const isOcean = tile => tile.terrain === 'ocean';
 const isSea = tile => tile.terrain === 'ocean' || tile.terrain === 'coast' || tile.terrain === 'lake';
 // Each river's outflow: from a little way up the river, through the corner
 // where it ends, and out toward the middle of the water hex at that corner.
 const outflows = [];
 for (const [mx, mz] of mouths) {
  let dx = 0, dz = 0;
  for (let k = 0; k < 6; k++) {
   const a = (k + .5) * Math.PI / 3, tile = hexAt(mx + Math.cos(a), mz + Math.sin(a));
   // Three of the six directions lead to the middle of a hex; the others lead to a corner.
   if (!tile || !isSea(tile)) continue;
   const cx = Math.sqrt(3) * (tile.col + (tile.row % 2) * .5), wrapped = cx + Math.round((mx + Math.cos(a) - cx) / period) * period;
   if (Math.hypot(wrapped - mx - Math.cos(a), tile.row * 1.5 - mz - Math.sin(a)) > .05) continue;
   dx += Math.cos(a); dz += Math.sin(a);
  }
  const l = Math.hypot(dx, dz);
  if (l < 1e-6) continue;
  dx /= l; dz /= l;
  outflows.push({ax: mx - dx * field.mouthBack, az: mz - dz * field.mouthBack, dx, dz, length: field.mouthBack + field.mouthOut});
 }

 // One square of the grid at a time: the pieces of each line that can matter
 // to it are found once, then every point in the square is measured against them.
 const block = Math.max(1, Math.round(field.texels));
 const lines = [[coast, field.shoreReach, isSea, 0], [shelf, field.shelfReach, isOcean, 1]];
 const half = value => DataUtils.toHalfFloat(value);
 for (let by = 0; by < height; by += block) for (let bx = 0; bx < width; bx += block) {
  const x0 = originX + bx / width * period, z0 = originZ + by / height * spanZ, size = block / field.texels;
  const cx = x0 + size / 2, cz = z0 + size / 2;
  const candidates = lines.map(([line, reach]) => line.near(cx, cz, reach + size));
  const near = outflows.map(flow => ({...flow, shift: Math.round((cx - flow.ax) / period) * period})).filter(flow => Math.hypot(flow.ax + flow.shift - cx, flow.az - cz) < field.mouthReach + flow.length + size);
  for (let y = by; y < Math.min(height, by + block); y++) for (let x = bx; x < Math.min(width, bx + block); x++) {
   const px = originX + (x + .5) / width * period, pz = originZ + (y + .5) / height * spanZ, at = (y * width + x) * 4;
   let tile = null;
   for (const [k, [, reach, outside, channel]] of lines.entries()) {
    let best = reach * reach, side = 0;
    for (const {piece: {a, b}, shift} of candidates[k]) {
     const ax = a.x + shift, dx = b.x - a.x, dz = b.z - a.z, l = dx * dx + dz * dz;
     const t = l > 1e-12 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - a.z) * dz) / l)) : 0;
     const ex = px - ax - dx * t, ez = pz - a.z - dz * t, d = ex * ex + ez * ez;
     // The piece's normal points to the hexes the line goes round, so against it is outside: the water, or the ocean.
     if (d < best) { best = d; side = ex * (a.nx + (b.nx - a.nx) * t) + ez * (a.nz + (b.nz - a.nz) * t) >= 0 ? -1 : 1; }
    }
    if (!side) { tile ??= hexAt(px, pz); side = tile && outside(tile) ? 1 : -1; }
    data[at + channel] = half(side * Math.sqrt(best));
   }
   let mouth = field.mouthReach;
   for (const {ax, az, dx, dz, length, shift} of near) {
    const t = Math.max(0, Math.min(1, ((px - ax - shift) * dx + (pz - az) * dz) / length));
    mouth = Math.min(mouth, Math.hypot(px - ax - shift - dx * t * length, pz - az - dz * t * length) + field.mouthTaper * t);
   }
   data[at + 2] = half(mouth); data[at + 3] = half(1);
  }
 }
 return {data, width, height, originX, originZ, period, spanZ, mouthCount: mouths.length};
}

/** The texture of a bake made by `bakeSeaDistanceData`, here or in a worker. */
export function seaDistanceTexture({data, width, height, originX, originZ, period, spanZ, mouthCount}) {
 const texture = new DataTexture(data, width, height, RGBAFormat, HalfFloatType);
 texture.wrapS = RepeatWrapping; texture.wrapT = ClampToEdgeWrapping;
 texture.magFilter = texture.minFilter = LinearFilter; texture.generateMipmaps = false;
 texture.needsUpdate = true;
 return {texture, width, height, originX, originZ, period, spanZ, mouthCount};
}
