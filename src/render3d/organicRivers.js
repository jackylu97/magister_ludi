import {BufferGeometry, Color, Float32BufferAttribute} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {riverPaths} from '../terrainStudy/waterContours.js';
import {centre, surfaceHeight, terrainMapWraps, tileShape, isWater} from '../terrainStudy/surface.js';
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

 const polygons = [], colors = {bank: new Color(knobs.bank), water: new Color(knobs.water), shine: new Color(knobs.shine), lily: new Color(knobs.lily ?? '#8fbf6a')};
 // Small things along the river (2026-11-12, after a second look at
 // Dorfromantik's water): stones on the bank, reeds at the water's edge, and
 // lily pads on the water. `spots` are world points; the board asks for the
 // ones on each hex.
 const spots = [];
 const add = (points, color, lift, land = false) => {
  const xs = points.map(p => p[0]), zs = points.map(p => p[1]);
  polygons.push({points, color, lift, land, bounds: [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]});
 };

 const runs = [];
 for (const path of network.paths) {
  // [x, z, width] at each corner, so the corner cutting carries the width too.
  let line = path.points.map(p => [p[0], p[1], widthAt(nodes.get(nodeKey(p)) ?? path.start)]);
  for (let pass = 0; pass < knobs.smoothing; pass++) line = cutCorners(line, path.closed);
  const samples = resample(line, knobs.step, path.closed);
  if (samples.length < 2) continue;
  // The hex edges turn 60 degrees at every corner, so a rounded chain still
  // zigzags at one fixed rhythm. Relaxing the samples, with both ends held,
  // takes most of that rhythm out and leaves a line that flows; the slow
  // wander below then gives it bends of its own (2026-11-12).
  for (let pass = 0; pass < (knobs.straighten ?? 0); pass++) {
   const next = samples.map((p, i) => {
    if (!path.closed && (i === 0 || i === samples.length - 1)) return p;
    const a = samples[(i - 1 + samples.length) % samples.length], b = samples[(i + 1) % samples.length];
    return {...p, x: .25 * a.x + .5 * p.x + .25 * b.x, z: .25 * a.z + .5 * p.z + .25 * b.z};
   });
   for (let i = 0; i < samples.length; i++) { samples[i].x = next[i].x; samples[i].z = next[i].z; }
  }
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
   // Uneven (2026-11-12): a slow wave makes some stretches wind hard and
   // others run nearly straight, and a second makes the river swell and narrow.
   const uneven = knobs.uneven ?? 0;
   const reachOf = 1 - uneven + uneven * 2 * (.5 + .5 * Math.sin(s * Math.PI * 2 / (knobs.wanderWave * 2.7) + phase2 * 1.7));
   const wander = knobs.wander * fade * reachOf * (Math.sin(s * Math.PI * 2 / knobs.wanderWave + phase) * .8
    + Math.sin(s * Math.PI * 2 / (knobs.wanderWave * .47) + phase2) * .2);
   samples[i].swell = 1 + (knobs.widthVary ?? 0) * fade * Math.sin(s * Math.PI * 2 / (knobs.wanderWave * 1.6) + phase * 2.3);
   // The sand beside the water is wide in places and thin in others, each side by its own wave.
   samples[i].sand = [1, -1].map(way => knobs.bankWidth * (1 + (knobs.sandVary ?? 0) * fade * Math.sin(s * Math.PI * 2 / (knobs.wanderWave * 1.3) + phase * way + way)));
   samples[i].x += normals[i][0] * wander; samples[i].z += normals[i][1] * wander;
   // A spring starts thin; a mouth opens wide where the river meets the water.
   let w = samples[i].w * (samples[i].swell ?? 1);
   if (source) w *= knobs.sourceWidth + (1 - knobs.sourceWidth) * smooth(0, knobs.sourceTaper, s);
   if (sink) w *= knobs.sourceWidth + (1 - knobs.sourceWidth) * smooth(0, knobs.sourceTaper, length - s);
   if (!path.closed && start.water) w *= 1 + knobs.mouthFlare * (1 - smooth(0, knobs.mouthLength, s));
   if (!path.closed && end.water) w *= 1 + knobs.mouthFlare * (1 - smooth(0, knobs.mouthLength, length - s));
   samples[i].half = w / 2;
  }
  runs.push({path, samples, length, start, end, source, sink, phase, phase2});
 }

 // A stream joins a river at a shallow angle, a little way downstream, and not
 // head on at a hex corner. At each corner where three runs meet, the smaller
 // of the two that flow in is bent toward the way the water leaves, so its end
 // lies on the outflow's own line (2026-11-12).
 if (knobs.joinDown) for (const node of network.nodes) {
  if (node.edges.length !== 3) continue;
  const here = runs.filter(run => !run.path.closed && (run.start === node || run.end === node));
  if (here.length !== 3) continue;
  const far = run => run.start === node ? run.end : run.start;
  const out = here.find(run => (steps.get(far(run)) ?? 0) < (steps.get(node) ?? 0));
  const flowsIn = here.filter(run => run !== out);
  if (!out || flowsIn.length !== 2) continue;
  const leaving = out.start === node ? out.samples : [...out.samples].reverse();
  const target = leaving[Math.min(leaving.length - 1, Math.round(knobs.joinDown / knobs.step))];
  const dx = target.x - leaving[0].x, dz = target.z - leaving[0].z;
  // The stream is the inflow that arrives across the outflow's line; the other one is the river running through.
  const along = run => {
   const list = run.end === node ? [...run.samples].reverse() : run.samples, back = list[Math.min(list.length - 1, Math.round(.5 / knobs.step))];
   const ux = list[0].x - back.x, uz = list[0].z - back.z;
   return (ux * dx + uz * dz) / ((Math.hypot(ux, uz) || 1) * (Math.hypot(dx, dz) || 1));
  };
  const stream = along(flowsIn[0]) <= along(flowsIn[1]) ? flowsIn[0] : flowsIn[1];
  const arriving = stream.end === node ? [...stream.samples].reverse() : stream.samples;
  arriving.forEach((p, i) => { const w = 1 - smooth(0, knobs.joinReach, i * knobs.step); p.x += dx * w; p.z += dz * w; });
  stream.joins = stream.end === node ? 'end' : 'start';
 }

 for (const run of runs) {
  const {path, samples, length, start, end, source, sink, phase, phase2} = run;
  let bent = normalsOf(samples, path.closed);
  // Two banks that differ (2026-11-12, choice B of the river talk). A stream's
  // banks are not parallel: each has its own shape, the outside of a bend is
  // cut wide, and the inside of a bend silts up into a sand bar. The two bank
  // distances are worked out first; the centre line then moves to the middle
  // between them, so everything after this still reads one half width.
  if (knobs.bendSwell || knobs.bankVary) {
   const reach = 4, last = samples.length - 1;
   let turn = samples.map((_, i) => {
    const a = bent[Math.max(0, i - reach)], b = bent[Math.min(last, i + reach)];
    return a[0] * b[1] - a[1] * b[0];
   });
   for (let pass = 0; pass < 6; pass++) turn = turn.map((_, i) => .25 * turn[Math.max(0, i - 1)] + .5 * turn[i] + .25 * turn[Math.min(last, i + 1)]);
   for (let i = 0; i < samples.length; i++) {
    const p = samples[i], s = p.s, bend = Math.min(1, Math.abs(turn[i]) * 2.2), inner = turn[i] > 0 ? 1 : -1;
    const fade = path.closed ? 1 : smooth(0, knobs.wanderFade, s) * smooth(0, knobs.wanderFade, length - s);
    const sides = [1, -1].map(way => {
     const own = (knobs.bankVary ?? 0) * fade * (Math.sin(s * 6.2832 / .93 + phase * (way > 0 ? 1.3 : 2.9)) * .6 + Math.sin(s * 6.2832 / .41 + phase2 * (way > 0 ? 2.1 : .6)) * .4);
     const bent = way === inner ? 1 - (knobs.barPinch ?? 0) * bend : 1 + (knobs.bendSwell ?? 0) * bend;
     if (way === inner) p.sand[way > 0 ? 0 : 1] *= 1 + (knobs.barWidth ?? 0) * bend;
     return p.half * Math.max(.45, (1 + own) * bent);
    });
    const shift = (sides[0] - sides[1]) / 2;
    p.x += bent[i][0] * shift; p.z += bent[i][1] * shift; p.half = (sides[0] + sides[1]) / 2;
   }
   bent = normalsOf(samples, path.closed);
  }
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
   const fadeAt = which => run.joins === which ? knobs.bankFade * 2.2 : knobs.bankFade;
   const rise = samples.map(({s}) => path.closed ? knobs.bankHeight : knobs.bankHeight * smooth(0, fadeAt('start'), s) * smooth(0, fadeAt('end'), length - s));
   for (const way of [1, -1]) for (let i = 0; i < samples.length - (path.closed ? 0 : 1); i++) {
    const j = (i + 1) % samples.length, a = samples[i], b = samples[j], na = bent[i], nb = bent[j];
    const at = (p, n, d) => [p.x + n[0] * d * way, p.z + n[1] * d * way];
    const wa = a.sand[way > 0 ? 0 : 1], wb = b.sand[way > 0 ? 0 : 1], slope = knobs.bankSlope, ha = knobs.lift + rise[i], hb = knobs.lift + rise[j];
    add([at(a, na, a.half - .004), at(b, nb, b.half - .004), at(b, nb, b.half + wb), at(a, na, a.half + wa)], colors.bank, [knobs.lift * .5, knobs.lift * .5, hb, ha], true);
    add([at(a, na, a.half + wa), at(b, nb, b.half + wb), at(b, nb, b.half + wb + slope), at(a, na, a.half + wa + slope)], null, [ha, hb, knobs.lift * .5, knobs.lift * .5], true);
    // An old sand bar grows green: small patches of the hex's own ground on the widest sand.
    if (knobs.barGreen && wa > knobs.bankWidth * 1.45 && rise[i] > knobs.bankHeight * .8 && hashUnit(Math.round(a.x * 40), Math.round(a.z * 40), 1520 + way) < knobs.barGreen) {
     const [cx, cz] = at(a, na, a.half + wa * (.55 + hashUnit(Math.round(a.x * 40), Math.round(a.z * 40), 1530) * .3)), r = wa * (.2 + hashUnit(Math.round(a.x * 40), Math.round(a.z * 40), 1540) * .14);
     add(Array.from({length: 7}, (_, q) => [cx + Math.cos(q * Math.PI * 2 / 7) * r * 1.5, cz + Math.sin(q * Math.PI * 2 / 7) * r]), null, knobs.lift + knobs.bankHeight + .004, true);
    }
   }
  } else
  band(p => -(p.half + knobs.bankWidth), p => p.half + knobs.bankWidth, colors.bank, knobs.lift);
  band(p => -p.half, p => p.half, colors.water, knobs.lift * 1.5);
  // The deep middle: a darker run down the centre, which gives the river a dark value to sit on.
  if (knobs.deep) band(p => -p.half * knobs.deepShare, p => p.half * knobs.deepShare, new Color(knobs.deep), knobs.lift * 1.65);
  if (knobs.detail) {
   const h = (i, salt) => hashUnit(Math.round(samples[i].x * 40), Math.round(samples[i].z * 40), salt);
   const at = (p, n, d) => [p.x + n[0] * d, p.z + n[1] * d];
   const ends = Math.ceil(.3 / knobs.step);
   // Their water is a patchwork of two close tones: short patches of the paler tone, each over part of the width.
   for (let i = ends; i < samples.length - ends - 4; i += 2) {
    if (h(i, 1401) > knobs.patchShare) continue;
    const from = (h(i, 1402) * 1.5 - 1) * .9, to = Math.min(.92, from + .45 + h(i, 1403) * .6), run = 2 + Math.floor(h(i, 1404) * 3);
    for (let k = i; k < Math.min(samples.length - ends - 1, i + run); k++) {
     const a = samples[k], b = samples[k + 1];
     add([at(a, bent[k], a.half * from), at(b, bent[k + 1], b.half * from), at(b, bent[k + 1], b.half * to), at(a, bent[k], a.half * to)], colors.shine, knobs.lift * 1.8);
    }
   }
   const every = Math.max(2, Math.round(knobs.detailEvery / knobs.step));
   for (let i = ends + Math.floor(h(0, 1410) * every); i < samples.length - ends; i += every) {
    const a = samples[i], n = bent[i], way = h(i, 1411) > .5 ? 1 : -1, pick = h(i, 1412);
    if (pick < .34) {
     for (let j = 0; j < 3; j++) spots.push({kind: 'reed', x: a.x + n[0] * way * (a.half * .95) + (h(i, 1420 + j) - .5) * .09, z: a.z + n[1] * way * (a.half * .95) + (h(i, 1430 + j) - .5) * .09, seed: h(i, 1440 + j)});
    } else if (pick < .62) {
     spots.push({kind: 'stone', x: a.x + n[0] * way * (a.half + knobs.bankWidth * 1.4), z: a.z + n[1] * way * (a.half + knobs.bankWidth * 1.4), seed: h(i, 1450)});
    } else {
     // Two or three lily pads near one bank.
     for (let j = 0; j < 2 + Math.floor(h(i, 1460) * 2); j++) {
      const cx = a.x + n[0] * way * a.half * (.35 + h(i, 1470 + j) * .35) + (h(i, 1480 + j) - .5) * .08, cz = a.z + n[1] * way * a.half * (.35 + h(i, 1470 + j) * .35) + (h(i, 1490 + j) - .5) * .08;
      const r = knobs.lilySize * (.7 + h(i, 1500 + j) * .6);
      add(Array.from({length: 7}, (_, q) => [cx + Math.cos(q * Math.PI * 2 / 7) * r, cz + Math.sin(q * Math.PI * 2 / 7) * r]), colors.lily, knobs.lift * 2.6);
     }
    }
   }
  }
  // Where a stream joins, its water runs through the river's sand bank into the
  // river: the last stretch is laid again above the bank's height, so the
  // bank is open there.
  if (run.joins) {
   const over = knobs.lift + knobs.bankHeight + .004, at = (p, n, d) => [p.x + n[0] * d, p.z + n[1] * d];
   for (let i = 0; i < samples.length - 1; i++) {
    const fromEnd = run.joins === 'end' ? length - samples[i].s : samples[i + 1].s;
    if (fromEnd > knobs.joinDown + .12) continue;
    const a = samples[i], b = samples[i + 1];
    add([at(a, bent[i], -a.half), at(b, bent[i + 1], -b.half), at(b, bent[i + 1], b.half), at(a, bent[i], a.half)], colors.water, over);
    if (knobs.deep) add([at(a, bent[i], -a.half * knobs.deepShare), at(b, bent[i + 1], -b.half * knobs.deepShare), at(b, bent[i + 1], b.half * knobs.deepShare), at(a, bent[i], a.half * knobs.deepShare)], new Color(knobs.deep), over + .0015);
   }
  }
  // A spring: a river that starts on open land rises from a small round pool with stones beside it, and does not just stop.
  if (knobs.springSize) for (const [is, p] of [[source, samples[0]], [sink, samples.at(-1)]]) {
   if (!is) continue;
   const ring = radius => Array.from({length: 12}, (_, q) => [p.x + Math.cos(q * Math.PI / 6) * radius, p.z + Math.sin(q * Math.PI / 6) * radius * .85]);
   add(ring(knobs.springSize + knobs.bankWidth * .7), colors.bank, knobs.lift);
   add(ring(knobs.springSize), colors.water, knobs.lift * 1.5);
   if (knobs.deep) add(ring(knobs.springSize * .55), new Color(knobs.deep), knobs.lift * 1.65);
   for (let q = 0; q < 3; q++) spots.push({kind: 'stone', x: p.x + Math.cos(q * 2.3 + phase) * (knobs.springSize + knobs.bankWidth), z: p.z + Math.sin(q * 2.3 + phase) * (knobs.springSize + knobs.bankWidth) * .85, seed: (phase * .16 + q * .31) % 1});
  }
  if (knobs.shallows) {
   // A paler band along each bank, as the sea has at its shore, in place of
   // the stripe down the middle.
   for (const way of [1, -1]) band(p => way * p.half * knobs.shallows, p => way * p.half, colors.shine, knobs.lift * 2);
  } else band(p => side * p.half * knobs.shineFrom, p => side * p.half * knobs.shineTo, colors.shine, knobs.lift * 2);
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
  carve,
  /** The stones on one hex's river banks: `{x, y, z, seed}` in the hex's own coordinates. */
  stones(tile) { return placed(tile, 'stone'); },
  /** The reeds at the water's edge on one hex, as one geometry in world coordinates; null if none. */
  reeds(tile) {
   const list = placed(tile, 'reed');
   if (!list.length) return null;
   const c = centre(tile), positions = [];
   for (const reed of list) {
    // A tuft: four thin blades that lean a little apart.
    for (let b = 0; b < 4; b++) {
     const turn = reed.seed * 6.28 + b * 1.7, lean = .018 + b * .006, tall = knobs.reedHeight * (.7 + ((reed.seed * 7 + b * .37) % 1) * .5), w = .007;
     const bx = c.x + reed.x + Math.cos(turn) * .012, bz = c.z + reed.z + Math.sin(turn) * .012, tip = [bx + Math.cos(turn) * lean, reed.y + tall, bz + Math.sin(turn) * lean];
     const base = [0, 1, 2].map(q => [bx + Math.cos(turn + q * 2.094) * w, reed.y, bz + Math.sin(turn + q * 2.094) * w]);
     for (let q = 0; q < 3; q++) positions.push(...base[q], ...tip, ...base[(q + 1) % 3]);
    }
   }
   const geometry = new BufferGeometry();
   geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
   geometry.computeVertexNormals();
   return geometry;
  },
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

 function inHex(tile, x, z) { const shape = tileShape(tile); return shape.normals.every(([nx, nz], i) => x * nx + z * nz <= shape.upper[i] - .01); }

 /**
  * The pieces of the river's line near one hex, for the cut in the ground
  * (`riverCarve` in `surface.js`): null when no river comes near. The depth
  * fades out toward a source, so a spring is a shallow pool.
  */
 function carve(tile) {
  if (!knobs.cutDepth || isWater(tile)) return null;
  const c = centre(tile), out = [];
  for (const run of runs) {
   const {samples, length, source, sink, path} = run;
   const share = s => (source ? smooth(0, .35, s) * .7 + .3 : 1) * (sink ? smooth(0, .35, length - s) * .7 + .3 : 1);
   for (let i = 0; i < samples.length - (path.closed ? 0 : 1); i++) {
    const a = samples[i], b = samples[(i + 1) % samples.length];
    for (const shift of period ? [0, period, -period] : [0]) {
     const ax = a.x + shift - c.x, az = a.z - c.z;
     if (Math.abs(ax) > 1.3 || Math.abs(az) > 1.3) continue;
     out.push(ax, az, a.half, share(a.s), b.x + shift - c.x, b.z - c.z, b.half, share(b.s));
     break;
    }
   }
  }
  if (!out.length) return null;
  let key = out.length;
  for (let i = 0; i < out.length; i += 5) key = (Math.imul(key, 31) + Math.round(out[i] * 1e4)) | 0;
  return {depth: knobs.cutDepth, bank: knobs.cutBank, key, segments: Float32Array.from(out)};
 }

 /** The spots of one kind that stand on a hex, in its own coordinates, with the ground's height. */
 function placed(tile, kind) {
  if (!spots.length || (!tile.riverEdges && !nearRiver(tile))) return [];
  const c = centre(tile), found = [];
  for (const spot of spots) {
   if (spot.kind !== kind) continue;
   for (const shift of period ? [0, period, -period] : [0]) {
    const x = spot.x + shift - c.x, z = spot.z - c.z;
    if (Math.abs(x) > 1.1 || Math.abs(z) > 1.1 || isWater(tile) || !inHex(tile, x, z)) continue;
    found.push({x, z, y: surfaceHeight(tile, x, z), seed: spot.seed});
    break;
   }
  }
  return found;
 }

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
