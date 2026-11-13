import {Color} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {riverPaths} from '../terrainStudy/waterContours.js';
import {centre, terrainMapWraps} from '../terrainStudy/surface.js';
import {terrainColors} from '../terrainStudy/terrainPigment.js';
import {surfacePatch} from '../terrainStudy/surfacePatch.js';
import {hashUnit} from './hash';

/**
 * Organic rivers: switch 4 of the visual test version (batch V1,
 * `src/render3d/visualTest.ts`).
 *
 * With this switch the ground is not cut along a river edge (`setRiverStyle`
 * with `organic` in `surface.js`). The river is painted on the joined ground as
 * one ribbon for each run of edges between two junctions:
 * - the chain of hex corners is rounded into a curve (corner cutting), so the
 *   river bends where the old one turned a hard corner;
 * - a small sideways wander, hashed from the run's own corner, makes each run
 *   different; it fades to nothing at both ends, so runs meet cleanly;
 * - the width grows with the length of river upstream, the source tapers, and
 *   the mouth opens wider where it reaches the water;
 * - a disc in each colour fills every junction, so branches merge.
 * The ribbon stays within a fraction of a hex of its edge, so a player can
 * still tell which two hexes a river divides: river crossing is a rule.
 *
 * Built once with the board (in the worker), clipped onto each bank hex's own
 * ground triangles (`surfacePatch`), and pushed into the water batch, so it
 * adds no draw call. Rendering only: every wander is a hash of coordinates.
 */
export function createOrganicRivers(map, knobs) {
 const period = terrainMapWraps(map) ? Math.sqrt(3) * map.width : 0;
 const network = riverPaths(map);
 const nodeKey = p => {
  let x = p[0];
  if (period) { x = ((x % period) + period) % period; if (Math.min(x, period - x) < 1e-6) x = 0; }
  return `${Math.round(x * 1e6)}:${Math.round(p[1] * 1e6)}`;
 };
 const nodes = new Map(network.nodes.map(node => [nodeKey(node.point), node]));

 // Downstream is toward water: a walk out from every corner that touches it.
 // A river with no water at either end flows toward its first loose end.
 const steps = new Map();
 let frontier = network.nodes.filter(node => node.water);
 const walk = () => {
  for (const node of frontier) steps.set(node, 0);
  while (frontier.length) {
   const next = [];
   for (const node of frontier) for (const edge of node.edges) {
    const other = edge.a === node ? edge.b : edge.a;
    if (!steps.has(other)) { steps.set(other, steps.get(node) + 1); next.push(other); }
   }
   frontier = next;
  }
 };
 walk();
 for (const node of network.nodes) if (!steps.has(node) && node.edges.length === 1) { frontier = [node]; walk(); }
 for (const node of network.nodes) if (!steps.has(node)) { frontier = [node]; walk(); }
 // How much river lies upstream of each corner, summed from the far ends down.
 const upstream = new Map(network.nodes.map(node => [node, 0]));
 for (const node of [...network.nodes].sort((a, b) => steps.get(b) - steps.get(a))) {
  const down = node.edges.map(edge => edge.a === node ? edge.b : edge.a).find(other => steps.get(other) === steps.get(node) - 1);
  if (down) upstream.set(down, upstream.get(down) + upstream.get(node) + 1);
 }
 const widthAt = node => knobs.width + knobs.widthGrow * Math.min(1, upstream.get(node) / knobs.growLength);

 const polygons = [], colors = {bank: new Color(knobs.bank), water: new Color(knobs.water), shine: new Color(knobs.shine)};
 const add = (points, color, lift, land = false) => {
  const xs = points.map(p => p[0]), zs = points.map(p => p[1]);
  polygons.push({points, color, lift, land, bounds: [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]});
 };

 for (const path of network.paths) {
  // [x, z, width] at each corner, so the corner cutting carries the width too.
  let line = path.points.map(p => [p[0], p[1], widthAt(nodes.get(nodeKey(p)) ?? path.start)]);
  for (let pass = 0; pass < knobs.smoothing; pass++) line = cutCorners(line, path.closed);
  const samples = resample(line, knobs.step, path.closed);
  if (samples.length < 2) continue;
  const length = samples.at(-1).s;
  const start = path.start, end = path.end;
  const source = !path.closed && start.edges.length === 1 && !start.water;
  const sink = !path.closed && end.edges.length === 1 && !end.water;
  const phase = hashUnit(Math.round(start.point[0] * 16), Math.round(start.point[1] * 16), 1301) * Math.PI * 2;
  const phase2 = hashUnit(Math.round(start.point[0] * 16), Math.round(start.point[1] * 16), 1302) * Math.PI * 2;
  const normals = normalsOf(samples, path.closed);
  for (let i = 0; i < samples.length; i++) {
   const {s} = samples[i];
   const fade = path.closed ? 1 : smooth(0, knobs.wanderFade, s) * smooth(0, knobs.wanderFade, length - s);
   const wander = knobs.wander * fade * (Math.sin(s * Math.PI * 2 / knobs.wanderWave + phase) * .65
    + Math.sin(s * Math.PI * 2 / (knobs.wanderWave * .53) + phase2) * .35);
   samples[i].x += normals[i][0] * wander; samples[i].z += normals[i][1] * wander;
   // A spring starts thin; a mouth opens wide where the river meets the water.
   let w = samples[i].w;
   if (source) w *= knobs.sourceWidth + (1 - knobs.sourceWidth) * smooth(0, knobs.sourceTaper, s);
   if (sink) w *= knobs.sourceWidth + (1 - knobs.sourceWidth) * smooth(0, knobs.sourceTaper, length - s);
   if (!path.closed && start.water) w *= 1 + knobs.mouthFlare * (1 - smooth(0, knobs.mouthLength, s));
   if (!path.closed && end.water) w *= 1 + knobs.mouthFlare * (1 - smooth(0, knobs.mouthLength, length - s));
   samples[i].half = w / 2;
  }
  const bent = normalsOf(samples, path.closed);
  const band = (inner, outer, color, lift) => {
   for (let i = 0; i < samples.length - (path.closed ? 0 : 1); i++) {
    const j = (i + 1) % samples.length, a = samples[i], b = samples[j], na = bent[i], nb = bent[j];
    const at = (p, n, d) => [p.x + n[0] * d, p.z + n[1] * d];
    add([at(a, na, inner(a)), at(b, nb, inner(b)), at(b, nb, outer(b)), at(a, na, outer(a))], color, lift);
   }
  };
  const side = path.side;
  if (knobs.modelled) {
   // Modelled banks (2026-11-12): on each side the ground rises gently to a
   // rim and drops steeply to the water, so the river sits in a bed with lit
   // and shaded faces. The banks are real, sloped ground: they go into the
   // land's batch and take the sun as the hills do. The rise fades to nothing
   // at both ends of a run, where a junction's disc or the sea takes over.
   const rise = samples.map(({s}) => path.closed ? knobs.bankHeight : knobs.bankHeight * smooth(0, knobs.bankFade, s) * smooth(0, knobs.bankFade, length - s));
   for (const way of [1, -1]) for (let i = 0; i < samples.length - (path.closed ? 0 : 1); i++) {
    const j = (i + 1) % samples.length, a = samples[i], b = samples[j], na = bent[i], nb = bent[j];
    const at = (p, n, d) => [p.x + n[0] * d * way, p.z + n[1] * d * way];
    const wall = knobs.bankWidth, slope = knobs.bankSlope, ha = knobs.lift + rise[i], hb = knobs.lift + rise[j];
    add([at(a, na, a.half - .004), at(b, nb, b.half - .004), at(b, nb, b.half + wall), at(a, na, a.half + wall)], colors.bank, [knobs.lift * .5, knobs.lift * .5, hb, ha], true);
    add([at(a, na, a.half + wall), at(b, nb, b.half + wall), at(b, nb, b.half + wall + slope), at(a, na, a.half + wall + slope)], null, [ha, hb, knobs.lift * .5, knobs.lift * .5], true);
   }
  } else
  band(p => -(p.half + knobs.bankWidth), p => p.half + knobs.bankWidth, colors.bank, knobs.lift);
  band(p => -p.half, p => p.half, colors.water, knobs.lift * 1.5);
  band(p => side * p.half * knobs.shineFrom, p => side * p.half * knobs.shineTo, colors.shine, knobs.lift * 2);
 }
 // A disc of each colour at every junction, so the branches merge.
 for (const node of network.nodes) {
  if (node.edges.length < 3) continue;
  const half = widthAt(node) / 2;
  for (const [radius, color, lift] of [[half + knobs.bankWidth, colors.bank, knobs.lift], [half, colors.water, knobs.lift * 1.5]])
   add(Array.from({length: 14}, (_, i) => [node.point[0] + Math.cos(i * Math.PI / 7) * radius, node.point[1] + Math.sin(i * Math.PI / 7) * radius]), color, lift);
 }

 // Filed in a grid of two world units by canonical x, so a hex finds its own.
 const grid = new Map(), cell = 2;
 const file = (polygon, shift) => {
  const [x0, x1, z0, z1] = polygon.bounds;
  for (let gz = Math.floor(z0 / cell); gz <= Math.floor(z1 / cell); gz++)
   for (let gx = Math.floor((x0 + shift) / cell); gx <= Math.floor((x1 + shift) / cell); gx++) {
    const key = `${gx}:${gz}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push({polygon, shift});
   }
 };
 for (const polygon of polygons) {
  file(polygon, 0);
  if (period) { file(polygon, period); file(polygon, -period); }
 }

 return {
  polygonCount: polygons.length,
  /** The ribbon pieces lying on one hex, clipped to its ground; null if none. */
  pieces(tile, top) {
   if (!tile.riverEdges && !nearRiver(tile)) return null;
   const c = centre(tile), seen = new Set(), parts = [], banks = [];
   // The outer slope of a modelled bank takes its hex's own ground colour, a little deeper.
   const ground = new Color(terrainColors[['oasis', 'floodplain'].includes(tile.feature) ? tile.feature : tile.terrain] ?? '#888888').multiplyScalar(knobs.bankGround ?? 1);
   for (let gz = Math.floor((c.z - 1.1) / cell); gz <= Math.floor((c.z + 1.1) / cell); gz++)
    for (let gx = Math.floor((c.x - 1.1) / cell); gx <= Math.floor((c.x + 1.1) / cell); gx++)
     for (const entry of grid.get(`${gx}:${gz}`) || []) {
      if (seen.has(entry)) continue; seen.add(entry);
      const {polygon, shift} = entry, [x0, x1, z0, z1] = polygon.bounds;
      if (x1 + shift < c.x - 1.1 || x0 + shift > c.x + 1.1 || z1 < c.z - 1.1 || z0 > c.z + 1.1) continue;
      const piece = surfacePatch(top, polygon.points.map(([x, z]) => [x + shift, z]), polygon.color ?? ground, polygon.lift);
      if (piece.attributes.position.count) (polygon.land ? banks : parts).push(piece); else piece.dispose();
     }
   const join = list => {
    if (!list.length) return null;
    const merged = mergeGeometries(list); list.forEach(part => part.dispose());
    merged.userData.pigmentBaked = true;
    return merged;
   };
   const merged = join(parts), land = join(banks);
   if (merged && land) merged.userData.banks = land; else land?.dispose();
   return merged;
  },
 };

 /** A corner of a junction or a mouth can reach a hex with no river edge of its own. */
 function nearRiver(tile) {
  const c = centre(tile);
  for (let d = 0; d < 6; d++) {
   const a = (d + .5) * Math.PI / 3, node = nodes.get(nodeKey([c.x + Math.cos(a), c.z + Math.sin(a)]));
   if (node) return true;
  }
  return false;
 }
}

function smooth(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / Math.max(1e-6, b - a))); return t * t * (3 - 2 * t); }

/** One pass of corner cutting (Chaikin). Keeps the two ends of an open run. */
function cutCorners(points, closed) {
 const out = closed ? [] : [points[0]];
 const count = closed ? points.length : points.length - 1;
 for (let i = 0; i < count; i++) {
  const a = points[i], b = points[(i + 1) % points.length];
  const q = a.map((v, k) => v * .75 + b[k] * .25), r = a.map((v, k) => v * .25 + b[k] * .75);
  if (closed || i > 0) out.push(q);
  if (closed || i < count - 1) out.push(r);
 }
 if (!closed) out.push(points.at(-1));
 return out;
}

/** Even steps along the line, carrying the width; `s` is the distance along it. */
function resample(points, step, closed) {
 const line = closed ? [...points, points[0]] : points, out = [];
 let s = 0;
 out.push({x: line[0][0], z: line[0][1], w: line[0][2], s: 0});
 let carry = 0;
 for (let i = 1; i < line.length; i++) {
  const a = line[i - 1], b = line[i], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  let t = step - carry;
  while (t <= length) {
   const f = t / length;
   out.push({x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, w: a[2] + (b[2] - a[2]) * f, s: s + t});
   t += step;
  }
  carry = length - (t - step);
  s += length;
 }
 const last = line.at(-1);
 if (Math.hypot(last[0] - out.at(-1).x, last[1] - out.at(-1).z) > step * .3) out.push({x: last[0], z: last[1], w: last[2], s});
 else Object.assign(out.at(-1), {x: last[0], z: last[1], w: last[2], s});
 if (closed) out.pop();
 return out;
}

function normalsOf(samples, closed) {
 return samples.map((p, i) => {
  const a = samples[i > 0 ? i - 1 : closed ? samples.length - 1 : 0];
  const b = samples[i < samples.length - 1 ? i + 1 : closed ? 0 : samples.length - 1];
  const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
  return [dz / l, -dx / l];
 });
}
