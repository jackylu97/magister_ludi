import {Color} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {centre, isWater, neighbour, terrainMapWraps, coastAt, COAST_STRIDE, LAND_LEVEL, WATER_LEVEL} from '../terrainStudy/surface.js';
import {surfacePatch} from '../terrainStudy/surfacePatch.js';
import {hashUnit} from './hash';

/**
 * A free coastline (the visual test, 2026-11-13; `docs/flags.md`, "A free
 * coastline").
 *
 * The shore of the board is the outline of its land hexes, which turns sixty
 * degrees at every corner. This module draws one smooth line in its place:
 * - the line runs through the middle of each shore edge, so it rounds off a
 *   corner of land that points into the sea and fills a corner of sea that
 *   points into the land, by the same amount (a quarter of a hex at most);
 * - a slow sideways wander makes each stretch of coast different;
 * - where a river reaches the sea, the line is pulled in to the river's end.
 *
 * The line is the waterline. `carve` gives each hex beside it the pieces of the
 * line near that hex (`tile.coast`), and `surface.js` shapes the ground from
 * them: a straight slope of sand that goes under the water. `sand` paints the
 * slope. `distance` is what the sea's paint reads in place of the distance to
 * the hex shore (`seaField.ts`).
 *
 * Built once with the board. Rendering only: every wander is a hash of
 * coordinates, and the hex a thing stands on is still the hex the rules use.
 */
export function createFreeCoast(map, knobs, mouths = [], inside = tile => !isWater(tile)) {
 // `inside` says which hexes the line goes round: the land, for the waterline.
 // The sea's paint asks for a second line with it, round everything that is
 // not ocean, so coast and ocean meet on a smooth line too (`seaDistances.js`).
 const period = terrainMapWraps(map) ? Math.sqrt(3) * map.width : 0;
 const keyOf = (x, z) => {
  if (period) { x = ((x % period) + period) % period; if (Math.min(x, period - x) < 1e-4) x = 0; }
  return `${Math.round(x * 1e4)}:${Math.round(z * 1e4)}`;
 };
 const mouthKeys = new Set(mouths.map(p => keyOf(p[0], p[1])));

 // Every shore edge, walked with the land on one side, so the edges of one
 // coast join head to tail.
 const edges = [], starts = new Map(), ended = new Set();
 for (const tile of map.tiles) {
  if (!inside(tile)) continue;
  const c = centre(tile);
  for (let d = 0; d < 6; d++) {
   const other = neighbour(tile, map, d);
   if (!other || inside(other)) continue;
   const a = (d - .5) * Math.PI / 3, b = (d + .5) * Math.PI / 3;
   const edge = {ax: c.x + Math.cos(a), az: c.z + Math.sin(a), bx: c.x + Math.cos(b), bz: c.z + Math.sin(b)};
   edge.from = keyOf(edge.ax, edge.az); edge.to = keyOf(edge.bx, edge.bz);
   edges.push(edge); starts.set(edge.from, edge); ended.add(edge.to);
  }
 }

 /** The waterline's samples, one list a coast: `{x, z, nx, nz, beach}`, with the normal toward the land. */
 const lines = [];
 const seen = new Set();
 for (const first of [...edges.filter(edge => !ended.has(edge.from)), ...edges]) {
  if (seen.has(first)) continue;
  // The hex corners along this coast, kept continuous across the map's seam.
  const corners = [[first.ax, first.az]];
  let edge = first;
  while (edge && !seen.has(edge)) {
   seen.add(edge);
   const last = corners.at(-1);
   corners.push([last[0] + edge.bx - edge.ax, last[1] + edge.bz - edge.az]);
   edge = starts.get(edge.to);
  }
  const returned = edge === first;
  // A coast that runs right round the cylinder comes back one period along.
  const around = returned && period ? Math.round((corners.at(-1)[0] - corners[0][0]) / period) * period : 0;
  const closed = returned && !around;
  const count = corners.length - 1;
  // The line's guide points: the middle of each shore edge. A corner where a
  // river reaches the water is kept, for the cove made below.
  const guide = [], coves = [];
  const middle = i => [(corners[i][0] + corners[i + 1][0]) / 2, (corners[i][1] + corners[i + 1][1]) / 2];
  const mouthAt = i => { if (mouthKeys.has(keyOf(corners[i][0], corners[i][1]))) coves.push(corners[i]); };
  if (!returned) guide.push([2 * corners[0][0] - middle(0)[0], 2 * corners[0][1] - middle(0)[1]], corners[0]);
  for (let i = 0; i < count; i++) {
   if (i > 0 || returned) mouthAt(i);
   guide.push(middle(i));
  }
  if (!returned) guide.push(corners[count], [2 * corners[count][0] - middle(count - 1)[0], 2 * corners[count][1] - middle(count - 1)[1]]);
  // A coast round the cylinder is smoothed as an open line that overlaps
  // itself by a few guide points at each end, then cut to one period.
  let line = guide;
  if (around) line = [...guide.slice(-4).map(p => [p[0] - around, p[1]]), ...guide, ...guide.slice(0, 4).map(p => [p[0] + around, p[1]])];
  for (let pass = 0; pass < knobs.smoothing; pass++) line = cutCorners(line, closed);
  let samples = resample(line, knobs.step, closed);
  if (around) {
   // From the first sample past the line's own start to the sample nearest that one's copy a period on.
   const from = Math.max(0, samples.findIndex(p => (around > 0 ? p.x >= guide[0][0] : p.x <= guide[0][0])));
   const start = samples[from];
   let to = samples.length, best = Infinity;
   for (let j = from + 3; j < samples.length; j++) {
    const d = Math.hypot(samples[j].x - start.x - around, samples[j].z - start.z);
    if (d < best) { best = d; to = j; }
   }
   samples = samples.slice(from, to);
  }
  if (samples.length < 3) continue;
  const loop = closed || !!around, n = samples.length;
  const at = i => {
   if (!loop) return samples[Math.max(0, Math.min(n - 1, i))];
   const turn = Math.floor(i / n), p = samples[i - turn * n];
   return around ? {x: p.x + turn * around, z: p.z} : p;
  };
  // Relaxing takes out the rhythm of the hex corners. It also shrinks a small
  // loop, so an islet or a pond of a hex or two gets fewer passes.
  const relax = loop && !around ? Math.round(knobs.relax * Math.min(1, n * knobs.step / knobs.relaxLength)) : knobs.relax;
  for (let pass = 0; pass < relax; pass++) {
   const next = samples.map((p, i) => (!loop && (i === 0 || i === n - 1)) ? p : {x: .25 * at(i - 1).x + .5 * p.x + .25 * at(i + 1).x, z: .25 * at(i - 1).z + .5 * p.z + .25 * at(i + 1).z});
   next.forEach((p, i) => { samples[i].x = p.x; samples[i].z = p.z; });
  }
  // Distance along the line, for the waves below. On a loop each wave makes a whole number of turns, so the line closes.
  let length = 0;
  for (let i = 0; i < n; i++) { samples[i].s = length; if (i < n - 1 || loop) length += Math.hypot(at(i + 1).x - samples[i].x, at(i + 1).z - samples[i].z); }
  const seedX = Math.round(corners[0][0] * 8), seedZ = Math.round(corners[0][1] * 8);
  const phase = k => hashUnit(seedX, seedZ, 1500 + k) * Math.PI * 2;
  const wave = (s, wavelength, k) => {
   const turns = loop ? Math.max(1, Math.round(length / wavelength)) : length / wavelength;
   return Math.sin(s / length * turns * Math.PI * 2 + phase(k));
  };
  const normal = i => {
   const a = at(i - 1), b = at(i + 1), dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
   // The water is on the right of the walk, so the land is on the left.
   return [-dz / l, dx / l];
  };
  const moved = samples.map((p, i) => {
   const [nx, nz] = normal(i);
   const fade = loop ? 1 : smooth(0, 1, p.s) * smooth(0, 1, length - p.s);
   // Toward the land is positive: the wander, less the shift that sets the whole line out to sea.
   const push = fade * knobs.wander * (wave(p.s, knobs.wanderWave, 0) * .7 + wave(p.s, knobs.wanderWave * .41, 1) * .3) - knobs.shift;
   return {x: p.x + nx * push, z: p.z + nz * push, s: p.s};
  });
  moved.forEach((p, i) => { samples[i].x = p.x; samples[i].z = p.z; });
  // A cove at each river mouth: the line bends in to the corner where the
  // river ends, and a little past it, over `mouthReach` to each side.
  for (const [mx, mz] of coves) {
   let nearest = 0, best = Infinity;
   for (let i = 0; i < n; i++) { const d = Math.hypot(samples[i].x - mx, samples[i].z - mz); if (d < best) { best = d; nearest = i; } }
   const [ox, oz] = normal(nearest);
   const depth = (mx - samples[nearest].x) * ox + (mz - samples[nearest].z) * oz + knobs.mouthInset;
   if (depth <= 0) continue;
   const pushes = samples.map((p, i) => {
    let along = Math.abs(p.s - samples[nearest].s);
    if (loop) along = Math.min(along, length - along);
    const [nx, nz] = normal(i), bell = 1 - smooth(0, knobs.mouthReach, along);
    return [nx * depth * bell, nz * depth * bell];
   });
   pushes.forEach(([dx, dz], i) => { samples[i].x += dx; samples[i].z += dz; });
  }
  for (let i = 0; i < n; i++) {
   const [nx, nz] = normal(i);
   samples[i].nx = nx; samples[i].nz = nz;
   samples[i].beach = Math.max(.05, knobs.beach * (1 + knobs.beachVary * (wave(samples[i].s, knobs.beachWave, 2) * .7 + wave(samples[i].s, knobs.beachWave * .37, 3) * .3)));
  }
  lines.push({samples, loop, around});
 }

 // Every piece of every line, filed in a grid of one hex unit. On a wrapping
 // map a piece is filed again one period to each side.
 const pieces = [], grid = new Map(), cell = 1;
 const file = (piece, shift) => {
  const x0 = Math.min(piece.a.x, piece.b.x) + shift, x1 = Math.max(piece.a.x, piece.b.x) + shift;
  const z0 = Math.min(piece.a.z, piece.b.z), z1 = Math.max(piece.a.z, piece.b.z);
  for (let gz = Math.floor(z0 / cell); gz <= Math.floor(z1 / cell); gz++)
   for (let gx = Math.floor(x0 / cell); gx <= Math.floor(x1 / cell); gx++) {
    const key = `${gx}:${gz}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push({piece, shift});
   }
 };
 for (const {samples, loop, around} of lines) {
  for (let i = 0; i < samples.length - (loop ? 0 : 1); i++) {
   const a = samples[i], next = samples[(i + 1) % samples.length];
   const b = i + 1 < samples.length || !around ? next : {...next, x: next.x + around};
   const piece = {a, b};
   pieces.push(piece);
   file(piece, 0);
   if (period) { file(piece, period); file(piece, -period); }
  }
 }
 pieces.forEach((piece, i) => { piece.index = i; });
 /** The pieces within `reach` of a point, each once, in the line's own order, with the shift that brings each there. */
 const near = (x, z, reach) => {
  const found = [], had = new Set();
  for (let gz = Math.floor((z - reach) / cell); gz <= Math.floor((z + reach) / cell); gz++)
   for (let gx = Math.floor((x - reach) / cell); gx <= Math.floor((x + reach) / cell); gx++)
    for (const entry of grid.get(`${gx}:${gz}`) || []) {
     const id = entry.piece.index * 4 + (entry.shift > 0 ? 1 : entry.shift < 0 ? 2 : 0);
     if (had.has(id)) continue;
     const {a, b} = entry.piece;
     if (Math.min(Math.abs(a.x + entry.shift - x), Math.abs(b.x + entry.shift - x)) > reach || Math.min(Math.abs(a.z - z), Math.abs(b.z - z)) > reach) continue;
     had.add(id); found.push(entry);
    }
  return found.sort((p, q) => p.piece.index - q.piece.index);
 };

 const beside = tile => {
  for (let d = 0; d < 6; d++) {
   const other = neighbour(tile, map, d);
   if (other && isWater(other) !== isWater(tile)) return true;
  }
  return false;
 };

 /** The pieces of the waterline near one hex, for its ground (`tile.coast` in `surface.js`); null away from the shore. */
 function carve(tile) {
  if (!beside(tile)) return null;
  const c = centre(tile), out = [];
  for (const {piece: {a, b}, shift} of near(c.x, c.z, 1.75))
   out.push(a.x + shift - c.x, a.z - c.z, a.nx, a.nz, a.beach, b.x + shift - c.x, b.z - c.z, b.nx, b.nz, b.beach);
  if (!out.length) return null;
  let key = out.length;
  for (let i = 0; i < out.length; i += 3) key = (Math.imul(key, 31) + Math.round(out[i] * 1e4)) | 0;
  return {under: knobs.under, key, segments: Float32Array.from(out)};
 }

 const sand = new Color(knobs.sand), wet = new Color(knobs.wetSand);
 /**
  * The sand on one hex's ground, clipped to it (`top` is the hex's own ground,
  * before the painter cuts it up); null if none. Two tones: a darker strip of
  * wet sand at the water, and dry sand up to a little past the top of the slope.
  */
 function sandOn(tile, top) {
  if (!tile.coast || !top.attributes.position.count) return null;
  const c = centre(tile), parts = [];
  const under = knobs.under / (LAND_LEVEL - WATER_LEVEL);
  for (const {piece: {a, b}, shift} of near(c.x, c.z, 1.3)) {
   const point = (p, offset) => [p.x + shift + p.nx * offset, p.z + p.nz * offset];
   const bands = [[p => -p.beach * under - .01, () => knobs.wet, wet], [() => knobs.wet, p => p.beach + knobs.sandOver, sand]];
   for (const [low, high, color] of bands) {
    const piece = surfacePatch(top, [point(a, low(a)), point(b, low(b)), point(b, high(b)), point(a, high(a))], color, knobs.sandLift);
    if (piece.attributes.position.count) parts.push(piece); else piece.dispose();
   }
  }
  if (!parts.length) return null;
  const merged = mergeGeometries(parts); parts.forEach(part => part.dispose());
  merged.userData.pigmentBaked = true;
  return merged;
 }

 /**
  * The distance from a point on a hex's water sheet to the waterline: positive
  * on the water, negative on the land, and never more than `reach`.
  */
 function distance(tile, x, z, reach) {
  if (tile.coast) {
   const c = centre(tile);
   return Math.max(-reach, Math.min(reach, -coastAt(tile, x - c.x, z - c.z).edge));
  }
  let best = reach * reach;
  for (const {piece: {a, b}, shift} of near(x, z, reach)) {
   const ax = a.x + shift, dx = b.x - a.x, dz = b.z - a.z, l = dx * dx + dz * dz;
   const t = l > 1e-12 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - a.z) * dz) / l)) : 0;
   best = Math.min(best, (x - ax - dx * t) ** 2 + (z - a.z - dz * t) ** 2);
  }
  return (isWater(tile) ? 1 : -1) * Math.sqrt(best);
 }

 return {carve, sand: sandOn, distance, near, period, lineCount: lines.length, pieceCount: pieces.length, stride: COAST_STRIDE};
}

function smooth(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / Math.max(1e-6, b - a))); return t * t * (3 - 2 * t); }

/** One pass of corner cutting (Chaikin). Keeps the two ends of an open line. */
function cutCorners(points, closed) {
 const out = closed ? [] : [points[0]];
 const count = closed ? points.length : points.length - 1;
 for (let i = 0; i < count; i++) {
  const a = points[i], b = points[(i + 1) % points.length];
  const q = [a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], r = [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75];
  if (closed || i > 0) out.push(q);
  if (closed || i < count - 1) out.push(r);
 }
 if (!closed) out.push(points.at(-1));
 return out;
}

/** Even steps along the line. On a closed line the step is stretched a little so the last step is as long as the rest. */
function resample(points, step, closed) {
 const line = closed ? [...points, points[0]] : points;
 let total = 0;
 for (let i = 1; i < line.length; i++) total += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
 const count = Math.max(closed ? 6 : 2, Math.round(total / step)), each = total / count, out = [];
 let i = 1, from = 0;
 for (let k = 0; k < (closed ? count : count + 1); k++) {
  const target = Math.min(total, k * each);
  for (;;) {
   const length = Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
   if (from + length >= target - 1e-9 || i === line.length - 1) {
    const f = length > 1e-12 ? Math.max(0, Math.min(1, (target - from) / length)) : 0;
    out.push({x: line[i - 1][0] + (line[i][0] - line[i - 1][0]) * f, z: line[i - 1][1] + (line[i][1] - line[i - 1][1]) * f});
    break;
   }
   from += length; i++;
  }
 }
 return out;
}
