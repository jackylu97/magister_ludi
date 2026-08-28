/**
 * Every shape on the board, built from primitives and nothing else.
 *
 * Adapted from the look-dev prototype's `src/proto3d/geometry.ts`, which proved
 * the point this file inherits: no asset here was drawn, downloaded or baked. A
 * tile is a `CylinderGeometry` with six sides, a pine is a cone on a stick, a
 * knight is a box horse under a lathed rider holding a cylinder. The look
 * survives being made entirely of primitives, so the game needs no art
 * pipeline, only a palette.
 *
 * The unit miniatures at the bottom of the file are the largest thing built out
 * of that rule — sixteen distinguishable sculpts, none over a few hundred
 * triangles, all standing on the same disc. See the "unit miniatures" section
 * for the composition kit they are cut from.
 *
 * Only eight of them stand on the board today: the roster is drawn by *model
 * class* now (`ModelClass` in `src/sim/unitData.ts`) and the specific unit type
 * is named by the floating badge above it. The other eight factories are kept
 * whole and tested — they are a bench of finished silhouettes, and the day a
 * class earns its own split (a polearm line that has to read differently from a
 * sword line) the sculpt for it already exists and is already in the set's
 * proportions. Deleting them would be throwing away the expensive half.
 *
 * Origins are at the *base* of every shape, not the centre. Two reasons:
 * placement becomes "put it on the tile top" with no half-height correction,
 * and — more importantly — a uniform scale applied for size jitter then grows a
 * thing upward from where it stands instead of sinking it into the ground.
 *
 * The overlay shapes at the bottom of the file are new here (the prototype had
 * no interaction to overlay). They are flat, lie in the xz plane with their
 * normal pointing at the sky, and have their origin at the centre of the hex
 * they decorate, so an overlay instance is placed with the tile's own centre and
 * top height and nothing else.
 *
 * Everything returned here is meant to be shared: one geometry per kind, reused
 * by every `InstancedMesh` that draws it.
 */

import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  PlaneGeometry,
  TorusGeometry,
  Vector2,
} from 'three';

/**
 * Bakes hard facets into a geometry by de-indexing it and recomputing normals
 * per triangle.
 *
 * This is not an optimisation, it is the look. Three's primitives ship *smooth*
 * normals — a six-sided `CylinderGeometry` shades as a smooth barrel, not as a
 * hexagon with six flat faces — and `MeshToonMaterial` has no `flatShading` flag
 * to override that (unlike `MeshStandardMaterial`, it simply does not define the
 * property, so setting it is silently ignored). Baking the flat normals into the
 * geometry is the only way to get facets out of a toon material, and every lit
 * shape here goes through it.
 */
function flatten(geometry: BufferGeometry): BufferGeometry {
  const flat = geometry.getIndex() ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  flat.computeVertexNormals();
  return flat;
}

/**
 * Concatenates geometries into one.
 *
 * Hand-rolled rather than pulled from `BufferGeometryUtils` so the renderer
 * depends on nothing but the `three` core entry point. It de-indexes first,
 * which costs vertices but sidesteps index rebasing entirely — these shapes are
 * tens of triangles, and they are built once at load.
 */
function merge(parts: BufferGeometry[]): BufferGeometry {
  const flat = parts.map((part) => (part.getIndex() ? part.toNonIndexed() : part));
  const total = flat.reduce((sum, part) => sum + part.getAttribute('position').count, 0);

  const position = new Float32Array(total * 3);
  const normal = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);

  let vertexOffset = 0;
  for (const part of flat) {
    const partPosition = part.getAttribute('position');
    const partNormal = part.getAttribute('normal');
    const partUv = part.getAttribute('uv');
    const count = partPosition.count;
    position.set(partPosition.array as Float32Array, vertexOffset * 3);
    if (partNormal) normal.set(partNormal.array as Float32Array, vertexOffset * 3);
    if (partUv) uv.set(partUv.array as Float32Array, vertexOffset * 2);
    vertexOffset += count;
  }

  const merged = new BufferGeometry();
  merged.setAttribute('position', new BufferAttribute(position, 3));
  merged.setAttribute('normal', new BufferAttribute(normal, 3));
  merged.setAttribute('uv', new BufferAttribute(uv, 2));
  // Dispose only the temporaries we created; the caller owns its inputs.
  for (let i = 0; i < parts.length; i++) {
    if (flat[i] !== parts[i]) flat[i]!.dispose();
  }
  return merged;
}

// --- board -----------------------------------------------------------------

/**
 * A pointy-top hexagonal prism standing on its base.
 *
 * `CylinderGeometry` with six radial segments already emits corners at
 * (0, ±r) and (±0.866r, ±0.5r) in the x/z plane, which is exactly the pointy-top
 * layout `hexToPixel` assumes — so no corrective rotation is needed and the
 * prisms tile with the sim's hex math for free. Every flat hex shape below is
 * built to the same corner phase.
 *
 * `ao` bakes the contact darkening described in `bakeContactShading` into the
 * prism's vertex colours. Optional because only the board wants it: a prism
 * built without it carries no colour attribute at all and can be drawn by a
 * material that knows nothing about vertex colours.
 */
export function hexPrism(
  radius: number,
  height: number,
  ao?: { band: number; strength: number },
): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, height, 6, 1, false);
  geometry.translate(0, height / 2, 0);
  const flat = flatten(geometry);
  if (ao) bakeContactShading(flat, height, ao.band, ao.strength);
  return flat;
}

/**
 * Writes a downward value ramp into a shape's vertex colours: white at the top
 * face, falling to `1 - strength` `band` world units below it, flat thereafter.
 *
 * This is the whole of the grounding pass, and it is free — no extra instance,
 * no extra draw, no second material. The prisms are drawn inset inside a hex of
 * grout, so what the eye actually sees of a tile's side is the top fifth of it,
 * where it meets its neighbours; darkening from the top edge downward puts a
 * soft contact shadow exactly in that band and leaves the buried remainder (the
 * other 80% of the prism, which nothing can ever see) uniformly dark.
 *
 * Measured from the *top* rather than from the base on purpose. A prism's base
 * is at the shared floor plane and is never visible; its top is where it is
 * seated against the world.
 *
 * The colour is a plain multiplier, so it composes with the per-instance tint
 * (`instances.ts`) by multiplication in the shader and neither has to know about
 * the other. The top cap lands at exactly `height` and so is left untouched,
 * which is what keeps the tile's face the flat terrain colour it is supposed to
 * be.
 */
function bakeContactShading(
  geometry: BufferGeometry,
  height: number,
  band: number,
  strength: number,
): void {
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const span = Math.max(band, 1e-6);
  for (let i = 0; i < position.count; i++) {
    const depth = Math.max(0, Math.min(1, (height - position.getY(i)) / span));
    const value = 1 - strength * depth;
    colors[i * 3] = value;
    colors[i * 3 + 1] = value;
    colors[i * 3 + 2] = value;
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
}

/**
 * A mountain top: two offset cones rather than one.
 *
 * A single cone reads as a party hat. Stacking a shorter, wider cone under a
 * taller one nudged sideways gives an asymmetric massif with a ridge line, and
 * five radial segments (not six) keeps its facets out of phase with the hex
 * below so the silhouette does not look extruded from the tile.
 */
export function mountainPeak(radius: number, height: number): BufferGeometry {
  const main = new ConeGeometry(radius, height, 5, 1);
  main.translate(0, height / 2, 0);

  const shoulder = new ConeGeometry(radius * 0.72, height * 0.58, 5, 1);
  shoulder.rotateY(0.7);
  shoulder.translate(radius * 0.52, height * 0.29, radius * 0.3);

  const merged = merge([main, shoulder]);
  main.dispose();
  shoulder.dispose();
  return flatten(merged);
}

/**
 * The snow on a `mountainPeak`: the same two cones, cut off near their tips.
 *
 * Built as a separate geometry drawn with the *same* instance matrix rather than
 * as a second colour group on the peak, because the peak's matrix carries a
 * hashed scale and yaw per tile and a cap that did not inherit both would slide
 * off the summit. A cone's radius falls linearly to its tip, so the cap over the
 * top `fraction` of a cone of radius `r` and height `h` is a cone of radius
 * `r · fraction` and height `h · fraction` standing at `h · (1 − fraction)` —
 * exact, with a hair of overscale so the two never show a seam.
 *
 * The shoulder gets its own cap. A massif with snow on one summit and bare rock
 * on the other beside it reads as a bug, not as weather.
 */
export function mountainSnow(
  radius: number,
  height: number,
  fraction: number,
): BufferGeometry {
  const f = Math.max(0.02, Math.min(0.9, fraction));
  const over = 1.05;

  const main = new ConeGeometry(radius * f * over, height * f * over, 5, 1);
  main.translate(0, height * (1 - f) + (height * f * over) / 2, 0);

  // The shoulder of `mountainPeak`, to the letter: 0.72r wide, 0.58h tall,
  // turned 0.7 rad and nudged out to (0.52r, 0.3r).
  const shoulderR = radius * 0.72;
  const shoulderH = height * 0.58;
  const shoulder = new ConeGeometry(shoulderR * f * over, shoulderH * f * over, 5, 1);
  shoulder.rotateY(0.7);
  shoulder.translate(
    radius * 0.52,
    shoulderH * (1 - f) + (shoulderH * f * over) / 2,
    radius * 0.3,
  );

  const merged = merge([main, shoulder]);
  main.dispose();
  shoulder.dispose();
  return flatten(merged);
}

// --- vegetation ------------------------------------------------------------

/** A conifer: two stacked cones on a short trunk. Unit height ≈ `trunkH + coneH`. */
export function pineTree(spec: {
  trunkR: number;
  trunkH: number;
  coneR: number;
  coneH: number;
}): BufferGeometry {
  const trunk = new CylinderGeometry(spec.trunkR, spec.trunkR * 1.25, spec.trunkH, 5, 1);
  trunk.translate(0, spec.trunkH / 2, 0);

  const skirtH = spec.coneH * 0.62;
  const skirt = new ConeGeometry(spec.coneR, skirtH, 7, 1);
  skirt.translate(0, spec.trunkH + skirtH / 2, 0);

  const crownH = spec.coneH * 0.62;
  const crown = new ConeGeometry(spec.coneR * 0.7, crownH, 7, 1);
  crown.translate(0, spec.trunkH + skirtH * 0.62 + crownH / 2, 0);

  const merged = merge([trunk, skirt, crown]);
  trunk.dispose();
  skirt.dispose();
  crown.dispose();
  return flatten(merged);
}

/** A broadleaf: a low-detail icosphere canopy on a stub trunk. */
export function roundTree(spec: {
  trunkR: number;
  trunkH: number;
  ballR: number;
}): BufferGeometry {
  const trunk = new CylinderGeometry(spec.trunkR, spec.trunkR * 1.3, spec.trunkH, 5, 1);
  trunk.translate(0, spec.trunkH / 2, 0);

  // Detail 1 is the sweet spot: detail 0 is a d20 and reads as a rock, detail 2
  // is smooth enough that the flat shading stops registering as facets.
  const canopy = new IcosahedronGeometry(spec.ballR, 1);
  canopy.scale(1, 0.88, 1);
  canopy.translate(0, spec.trunkH + spec.ballR * 0.82, 0);

  const merged = merge([trunk, canopy]);
  trunk.dispose();
  canopy.dispose();
  return flatten(merged);
}

// --- ground clutter --------------------------------------------------------

/**
 * A tuft of grass: a few thin cones leaning out of one point.
 *
 * The whole clutter family below exists for one reason — a diorama is sold by
 * the stuff between the set pieces, not by the set pieces. Each of these is
 * tens of triangles and each is *one* geometry however many parts it has, so a
 * whole map's worth of them is one instanced draw and one outline draw.
 *
 * The blades are placed on a ring rather than hashed, because these are already
 * scattered and jittered per instance by the board (`addDecorations`); hashing
 * inside the shape as well would only make every tuft the same kind of mush.
 * The lean is what stops the cluster reading as a sea urchin.
 */
export function grassTuft(spec: {
  coneR: number;
  coneH: number;
  blades: number;
  cluster: number;
}): BufferGeometry {
  const blades = Math.max(1, Math.round(spec.blades));
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < blades; i++) {
    const angle = (i / blades) * Math.PI * 2;
    // Every second blade is shorter, which is the cheapest way to give a
    // symmetric ring of cones an irregular silhouette.
    const h = spec.coneH * (i % 2 === 0 ? 1 : 0.72);
    const blade = new ConeGeometry(spec.coneR, h, 4, 1);
    blade.translate(0, h / 2, 0);
    blade.rotateZ(Math.cos(angle) * 0.34);
    blade.rotateX(-Math.sin(angle) * 0.34);
    blade.translate(Math.cos(angle) * spec.cluster, 0, Math.sin(angle) * spec.cluster);
    parts.push(blade);
  }
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * A flower: a hair-thin stem with a bead on top.
 *
 * One geometry in one colour, stem included. At the size this is drawn the stem
 * is under two pixels wide and its colour never resolves; splitting it out into
 * a second draw call to paint it green would buy nothing anybody can see.
 */
export function flowerSpray(spec: {
  stemR: number;
  stemH: number;
  headR: number;
}): BufferGeometry {
  const stem = new CylinderGeometry(spec.stemR, spec.stemR, spec.stemH, 4, 1);
  stem.translate(0, spec.stemH / 2, 0);

  const head = new IcosahedronGeometry(spec.headR, 0);
  head.scale(1, 0.8, 1);
  head.translate(0, spec.stemH + spec.headR * 0.6, 0);

  const merged = merge([stem, head]);
  stem.dispose();
  head.dispose();
  return flatten(merged);
}

/** A saguaro: a segmented trunk with two stub arms. Reads as desert at 6px. */
export function cactus(spec: {
  bodyR: number;
  bodyH: number;
  armR: number;
  armH: number;
}): BufferGeometry {
  const body = new CylinderGeometry(spec.bodyR * 0.86, spec.bodyR, spec.bodyH, 6, 1);
  body.translate(0, spec.bodyH / 2, 0);

  // Arms as elbows — a horizontal stub out of the trunk and a vertical one on
  // its end — because a cactus with straight-out arms is a signpost.
  const parts: BufferGeometry[] = [body];
  for (const side of [-1, 1]) {
    const reach = spec.bodyR + spec.armH * 0.5;
    const elbow = new CylinderGeometry(spec.armR, spec.armR, reach, 5, 1);
    elbow.rotateZ(Math.PI / 2);
    elbow.translate((side * reach) / 2, spec.bodyH * (side < 0 ? 0.52 : 0.66), 0);
    const upper = new CylinderGeometry(spec.armR * 0.9, spec.armR, spec.armH, 5, 1);
    upper.translate(side * reach, spec.bodyH * (side < 0 ? 0.52 : 0.66) + spec.armH / 2, 0);
    parts.push(elbow, upper);
  }

  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * Reeds: tall thin cones out of one root, leaning further than grass does.
 *
 * The same construction as `grassTuft` at a different aspect ratio, kept as its
 * own shape rather than a scaled tuft because a reed bed's whole read is that it
 * is *tall and thin* — a uniformly scaled tuft is a bigger tuft.
 */
export function reedClump(spec: {
  coneR: number;
  coneH: number;
  blades: number;
  cluster: number;
}): BufferGeometry {
  const blades = Math.max(1, Math.round(spec.blades));
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < blades; i++) {
    const angle = (i / blades) * Math.PI * 2 + 0.4;
    const h = spec.coneH * (0.66 + (i % 3) * 0.17);
    const stalk = new ConeGeometry(spec.coneR, h, 4, 1);
    stalk.translate(0, h / 2, 0);
    stalk.rotateZ(Math.cos(angle) * 0.16);
    stalk.rotateX(-Math.sin(angle) * 0.16);
    stalk.translate(Math.cos(angle) * spec.cluster, 0, Math.sin(angle) * spec.cluster);
    parts.push(stalk);
  }
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * A palm: a leaning trunk with a crown of fronds bent over the top of it.
 *
 * The oasis's own tree, and it is a third silhouette rather than a recoloured
 * pine or a scaled `roundTree` for the reason `reedClump` is not a scaled tuft:
 * what makes a palm read as a palm at 57° is the *lean* and the drooping crown,
 * and neither survives a uniform scale of a cone or a ball.
 *
 * The fronds are cones laid almost flat and pushed out from the trunk's head, so
 * the crown is a splayed star seen from above and a shallow dome seen from the
 * side. Every second one is shorter, which is `grassTuft`'s trick and the
 * cheapest way to keep a symmetric ring from reading as a parasol.
 */
export function palmTree(spec: {
  trunkR: number;
  trunkH: number;
  frondR: number;
  frondL: number;
  fronds: number;
  lean: number;
}): BufferGeometry {
  const count = Math.max(3, Math.round(spec.fronds));
  const trunk = new CylinderGeometry(spec.trunkR * 0.72, spec.trunkR * 1.3, spec.trunkH, 5, 1);
  trunk.translate(0, spec.trunkH / 2, 0);

  const parts: BufferGeometry[] = [trunk];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const length = spec.frondL * (i % 2 === 0 ? 1 : 0.76);
    const frond = new ConeGeometry(spec.frondR, length, 4, 1);
    // Laid on its side, tip outward: a cone built up the y axis becomes a leaf
    // lying along +x once it is rotated a quarter turn about z.
    frond.translate(0, length / 2, 0);
    frond.rotateZ(-Math.PI / 2 + 0.42);
    frond.translate(Math.cos(angle) * spec.trunkR, spec.trunkH, Math.sin(angle) * spec.trunkR);
    frond.rotateY(-angle);
    parts.push(frond);
  }
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  // The whole tree leans, trunk and crown together, so the crown stays on top of
  // the trunk instead of sliding off a bent stick.
  merged.rotateZ(spec.lean);
  return flatten(merged);
}

/**
 * A flat disc lying in the xz plane, centred on the origin — the oasis's water.
 *
 * `hexDecal`'s round sibling, and round is the point: every other flat mark on
 * this board is a hexagon because it *marks a hex*, while a pool is a thing
 * standing on one and has no reason to share its corners. Built at radius 1 and
 * scaled by the instance matrix, like the other unit-sized shapes here.
 */
export function poolDisc(segments = 18): BufferGeometry {
  const n = Math.max(3, Math.round(segments));
  const points: { x: number; z: number }[] = [];
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2;
    const a1 = ((k + 1) / n) * Math.PI * 2;
    // Counter-clockwise seen from +y, for `riverSegment`'s reason: the lit
    // material is FrontSide-only and a clockwise fan is culled into nothing.
    points.push(
      { x: 0, z: 0 },
      { x: Math.sin(a1), z: Math.cos(a1) },
      { x: Math.sin(a0), z: Math.cos(a0) },
    );
  }
  return flatFan(points);
}

/** A boulder: a d20 squashed and sheared so no two rotations look alike. */
export function rock(radius: number): BufferGeometry {
  const geometry = new IcosahedronGeometry(radius, 0);
  geometry.scale(1.15, 0.62, 0.92);
  geometry.rotateZ(0.22);
  geometry.translate(0, radius * 0.34, 0);
  return flatten(geometry);
}

// --- resource props --------------------------------------------------------

/**
 * The twelve things a resource puts on its hex.
 *
 * Every one takes a single `size` in world units and builds its proportions
 * from it, which is the whole convention of this section: *how big* a herd of
 * horses is on the table is a look decision and lives in `data/view3d.json`
 * (`resources.props`), while *what a cow is made of* is a fact about the model
 * and lives here. That split is the same one the clutter family above makes.
 *
 * Each is one merged geometry in one ink and each is well under a hundred
 * triangles, so a whole map's worth of any of them is one instanced draw and
 * one outline draw — the same bargain the tufts and the pines make. A resource
 * prop *replaces* the generic clutter on its tile (see `board3d.ts`), so the
 * budget it is spending is one that was already being spent on grass.
 *
 * They are deliberately toys rather than illustrations. Two boxes and a cone
 * read as "cattle" at forty pixels; a modelled cow reads as a smudge and costs
 * ten times as much, and the resource *lens* is what says the word out loud.
 */

/** A wheat stand: a row of stalks, each an ear of grain on a stem. */
export function wheatStand(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * size * 0.26;
    const h = size * (i === 1 ? 1 : 0.84);
    const stem = new CylinderGeometry(size * 0.026, size * 0.032, h, 4, 1);
    stem.translate(x, h / 2, 0);
    // The ear: a fat little spindle at the top, which is the whole read.
    const ear = new ConeGeometry(size * 0.1, size * 0.38, 5, 1);
    ear.translate(x, h + size * 0.12, 0);
    parts.push(stem, ear);
  }
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * A four-legged toy: box barrel, two leg slabs, a head box on a short neck.
 *
 * The shared body of the cattle and the deer, because they *are* the same toy
 * at two proportions — a heavier one with a low head, a slighter one with a
 * raised head and antlers on it. Written once so the two cannot drift into
 * looking like they came from different sets.
 */
function toyBeast(
  size: number,
  spec: { barrel: number; belly: number; legs: number; headUp: number },
): { parts: BufferGeometry[]; headX: number; headY: number } {
  const legH = size * spec.legs;
  const barrelH = size * 0.3;
  const barrelL = size * spec.barrel;
  const barrelW = size * spec.belly;
  const barrelY = legH + barrelH / 2;
  const parts: BufferGeometry[] = [
    slabAt(barrelL, barrelH, barrelW, 0, barrelY, 0),
    // Two slabs rather than four posts: at this size the gap between a pair of
    // legs is under a pixel, and a slab is half the triangles.
    slabAt(size * 0.09, legH, barrelW * 0.9, -barrelL * 0.33, legH / 2, 0),
    slabAt(size * 0.09, legH, barrelW * 0.9, barrelL * 0.33, legH / 2, 0),
  ];
  const headX = barrelL * 0.62;
  const headY = barrelY + size * spec.headUp;
  parts.push(slabAt(size * 0.26, size * 0.2, size * 0.18, headX, headY, 0));
  return { parts, headX, headY };
}

/** Cattle: a heavy toy beast with its head down. */
export function toyCow(size: number): BufferGeometry {
  const beast = toyBeast(size, { barrel: 0.86, belly: 0.34, legs: 0.3, headUp: 0.02 });
  const merged = merge(beast.parts);
  for (const part of beast.parts) part.dispose();
  return flatten(merged);
}

/** Deer: the slighter beast, head up, with a pair of antler cones on it. */
export function toyDeer(size: number): BufferGeometry {
  const beast = toyBeast(size, { barrel: 0.7, belly: 0.24, legs: 0.42, headUp: 0.22 });
  const parts = beast.parts.slice();
  for (const side of [-1, 1]) {
    const antler = spike(size * 0.05, size * 0.32, 3);
    antler.rotateZ(side * 0.5);
    antler.translate(beast.headX, beast.headY + size * 0.08, side * size * 0.06);
    parts.push(antler);
  }
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * A fin breaking the surface: one leaning triangle.
 *
 * Three sides, not four, and no body at all. A fish drawn under the water is a
 * fish nobody sees; what says "there are fish here" from across the table is
 * the shape *above* the waterline, so that is the only part that is built.
 */
export function fishFin(size: number): BufferGeometry {
  const fin = new ConeGeometry(size * 0.34, size, 3, 1);
  fin.scale(1, 1, 0.34);
  fin.rotateZ(-0.34);
  // Lifted past the lean, so the fin stands *on* the water rather than dipping a
  // corner through the tile face it is placed on.
  fin.translate(0, size * 0.54, 0);
  return flatten(fin);
}

/** A cut block of stone: a squared boulder with a smaller one leaning on it. */
export function stoneBlock(size: number): BufferGeometry {
  const big = new BoxGeometry(size, size * 0.66, size * 0.8);
  big.rotateY(0.3);
  big.translate(0, size * 0.33, 0);
  const chip = new BoxGeometry(size * 0.5, size * 0.4, size * 0.44);
  chip.rotateY(-0.5);
  chip.rotateZ(0.22);
  chip.translate(size * 0.62, size * 0.2, size * 0.2);
  const merged = merge([big, chip]);
  big.dispose();
  chip.dispose();
  return flatten(merged);
}

/**
 * An ore boulder with two cut faces on it.
 *
 * The boulder is `rock`'s shape at a different squash so an iron seam does not
 * read as the same grey pebble the tundra is covered in, and the two slabs are
 * the exposed metal — geometry rather than a second ink, because a prop is one
 * instanced draw in one colour and a facet that catches the light differently
 * says "cut" perfectly well on its own.
 */
export function oreBoulder(size: number): BufferGeometry {
  const body = new IcosahedronGeometry(size * 0.6, 0);
  body.scale(1.1, 0.82, 0.95);
  body.rotateZ(0.3);
  body.translate(0, size * 0.48, 0);
  const parts: BufferGeometry[] = [body];
  for (const side of [-1, 1]) {
    const facet = new BoxGeometry(size * 0.34, size * 0.1, size * 0.3);
    facet.rotateZ(side * 0.5);
    facet.rotateY(side * 0.4);
    facet.translate(side * size * 0.34, size * (side < 0 ? 0.62 : 0.4), size * 0.1);
    parts.push(facet);
  }
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/** A gem seam: three crystal shards out of one point, tallest in the middle. */
export function crystalCluster(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const shards: [number, number, number][] = [
    [0, 1, 0],
    [-0.36, 0.66, 0.18],
    [0.32, 0.72, -0.2],
  ];
  for (const [dx, tall, dz] of shards) {
    const shard = new IcosahedronGeometry(size * 0.3, 0);
    shard.scale(0.6, tall * 1.9, 0.6);
    shard.rotateZ(dx * 0.7);
    shard.translate(dx * size, size * tall * 0.44, dz * size);
    parts.push(shard);
  }
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/** Silk: two strips hanging from a crossbar on two posts. */
export function silkFrame(size: number): BufferGeometry {
  const postH = size;
  const parts: BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    parts.push(slabAt(size * 0.07, postH, size * 0.07, side * size * 0.4, postH / 2, 0));
  }
  parts.push(slabAt(size * 0.94, size * 0.07, size * 0.07, 0, postH, 0));
  for (const side of [-1, 1]) {
    parts.push(
      slabAt(size * 0.26, size * 0.62, size * 0.03, side * size * 0.2, postH - size * 0.33, 0),
    );
  }
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/** A vine trellis: two posts, a rail, and two bunches hanging off it. */
export function vineTrellis(size: number): BufferGeometry {
  const postH = size * 0.8;
  const parts: BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    parts.push(slabAt(size * 0.07, postH, size * 0.07, side * size * 0.36, postH / 2, 0));
  }
  parts.push(slabAt(size * 0.86, size * 0.06, size * 0.06, 0, postH * 0.92, 0));
  for (const side of [-1, 1]) {
    const bunch = new IcosahedronGeometry(size * 0.2, 0);
    bunch.scale(0.8, 1.1, 0.8);
    bunch.translate(side * size * 0.2, postH * 0.62, 0);
    parts.push(bunch);
  }
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/** A spice bush: three low round shrubs in a clump. */
export function spiceBush(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const at: [number, number, number][] = [
    [0, 1, 0],
    [-0.5, 0.72, 0.3],
    [0.46, 0.78, -0.26],
  ];
  for (const [dx, scale, dz] of at) {
    const ball = new IcosahedronGeometry(size * 0.42 * scale, 0);
    ball.scale(1, 0.8, 1);
    ball.translate(dx * size, size * 0.34 * scale, dz * size);
    parts.push(ball);
  }
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * A loose horse, at whatever size the data asks for.
 *
 * Literally the rider's mount — `miniHorse`, the same box barrel and stub legs
 * a horseman is built on — standing on the ground with nobody on it. Reuse is
 * the point rather than a saving: a herd on a hex and the cavalry that comes
 * out of it should be visibly the same animal, and they are the same twelve
 * lines of geometry.
 */
export function toyHorse(size: number): BufferGeometry {
  const horse = miniHorse(size, 0, 0);
  const merged = merge(horse.parts);
  for (const part of horse.parts) part.dispose();
  return flatten(merged);
}

/** A salt pan: a flat crust plate with two crystals standing in it. */
export function saltCrust(size: number): BufferGeometry {
  const plate = new CylinderGeometry(size * 0.6, size * 0.66, size * 0.08, 6, 1);
  plate.translate(0, size * 0.04, 0);
  const parts: BufferGeometry[] = [plate];
  for (const side of [-1, 1]) {
    const crystal = new BoxGeometry(size * 0.22, size * 0.22, size * 0.22);
    crystal.rotateY(side * 0.6);
    crystal.rotateZ(0.35);
    crystal.translate(side * size * 0.22, size * 0.14, side * size * 0.12);
    parts.push(crystal);
  }
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * An incense brazier: a footed bowl with two curls of smoke leaving it.
 *
 * The smoke is geometry rather than an ink, for the same reason the ore
 * boulder's cut faces are: a prop is one instanced draw in one colour, and two
 * small boxes climbing away from a bowl read as smoke from across the table
 * while costing nothing but triangles.
 */
export function incenseBurner(size: number): BufferGeometry {
  const foot = new CylinderGeometry(size * 0.12, size * 0.2, size * 0.18, 6, 1);
  foot.translate(0, size * 0.09, 0);
  const bowl = new CylinderGeometry(size * 0.34, size * 0.16, size * 0.22, 6, 1);
  bowl.translate(0, size * 0.29, 0);
  const parts: BufferGeometry[] = [foot, bowl];
  for (const side of [-1, 1]) {
    const curl = new BoxGeometry(size * 0.09, size * 0.3, size * 0.09);
    curl.rotateZ(side * 0.42);
    curl.translate(side * size * 0.11, size * 0.56, 0);
    parts.push(curl);
  }
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/** Jade: two polished plates set on edge, one leaning against the other. */
export function jadeSlab(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const tall = new BoxGeometry(size * 0.46, size * 0.62, size * 0.12);
  tall.rotateY(0.3);
  tall.rotateZ(-0.12);
  tall.translate(-size * 0.08, size * 0.32, 0);
  parts.push(tall);
  const lean = new BoxGeometry(size * 0.34, size * 0.44, size * 0.1);
  lean.rotateY(-0.5);
  lean.rotateZ(0.5);
  lean.translate(size * 0.26, size * 0.2, size * 0.12);
  parts.push(lean);
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/** Marble: two stacked column drums with a third lying beside them. */
export function marbleColumn(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const lower = new CylinderGeometry(size * 0.24, size * 0.26, size * 0.36, 6, 1);
  lower.translate(0, size * 0.18, 0);
  const upper = new CylinderGeometry(size * 0.21, size * 0.23, size * 0.32, 6, 1);
  upper.rotateY(0.4);
  upper.translate(0, size * 0.52, 0);
  parts.push(lower, upper);
  const fallen = new CylinderGeometry(size * 0.2, size * 0.2, size * 0.38, 6, 1);
  fallen.rotateZ(Math.PI / 2);
  fallen.rotateY(0.5);
  fallen.translate(size * 0.46, size * 0.2, size * 0.16);
  parts.push(fallen);
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * Furs: a pelt stretched on an A-frame.
 *
 * Deliberately *not* the silk frame's two posts and a crossbar — two props that
 * are both "a rectangle hanging between uprights" are two props nobody can tell
 * apart at this camera. The lean of the frame is the whole silhouette.
 */
export function furRack(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const leg = new BoxGeometry(size * 0.08, size * 0.92, size * 0.08);
    leg.rotateZ(side * 0.34);
    leg.translate(side * size * 0.24, size * 0.44, 0);
    parts.push(leg);
  }
  const pelt = new BoxGeometry(size * 0.62, size * 0.5, size * 0.05);
  pelt.translate(0, size * 0.42, size * 0.05);
  parts.push(pelt);
  const head = new BoxGeometry(size * 0.22, size * 0.16, size * 0.05);
  head.translate(0, size * 0.74, size * 0.05);
  parts.push(head);
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/** Dyes: three open vats of different sizes, one tipped toward the viewer. */
export function dyeVats(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const at: [number, number, number][] = [
    [0, 1, 0],
    [-0.52, 0.74, 0.26],
    [0.48, 0.66, -0.24],
  ];
  for (const [dx, scale, dz] of at) {
    const vat = new CylinderGeometry(size * 0.26 * scale, size * 0.22 * scale, size * 0.3 * scale, 6, 1);
    vat.translate(dx * size, size * 0.15 * scale, dz * size);
    parts.push(vat);
  }
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * The prop a resource nobody has sculpted yet is drawn with: a marker cairn of
 * three stacked stones.
 *
 * It exists so that adding a row to `data/resources.json` is a *data* edit all
 * the way to the board. An unsculpted find shows a cairn and its roundel names
 * it, which is legible, honest and obviously provisional — the three things a
 * placeholder has to be. See `RESOURCE_PROPS` in `board3d.ts`.
 */
export function cairnStack(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const stones: [number, number, number][] = [
    [0.34, 0.16, 0],
    [0.26, 0.42, 0.35],
    [0.17, 0.62, -0.6],
  ];
  for (const [radius, y, spin] of stones) {
    const stone = new IcosahedronGeometry(size * radius, 0);
    stone.scale(1, 0.72, 1);
    stone.rotateY(spin);
    stone.translate(0, size * y, 0);
    parts.push(stone);
  }
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

// --- improvement props -----------------------------------------------------

/**
 * The six things a worker leaves on a hex.
 *
 * Same convention as the resource props above — one `size` in world units, one
 * merged geometry in one ink, well under a hundred triangles — and the same
 * bargain: a whole map's worth of farms is one instanced draw and one outline
 * draw. What differs is the *composition* rule, and it is the whole reason these
 * are a separate layer rather than more entries in the resource table:
 *
 *   · A **farm** and a **mine** work the ground itself, so the tile's generic
 *     clutter yields to them exactly as it yields to a resource prop (see
 *     `addDecorations`). They are placed near the middle of the hex.
 *   · A **pasture**, a **camp**, a **quarry** and a **plantation** are built
 *     *around* something the tile already shows — the cattle, the deer, the
 *     seam, the vines — and those props stay. So the fence is a ring that goes
 *     round the herd rather than a thing standing where the herd was, and the
 *     tent, the steps and the trellis sit off-centre where the resource's own
 *     scatter is not.
 *
 * Each is drawn in one plane and one ink, like everything else on this board: a
 * farm is not brown furrows on green grass, it is a shape whose *silhouette*
 * says "worked". At forty pixels that is the only thing that survives anyway.
 */

/**
 * A ploughed field: parallel furrow ridges between two headland banks.
 *
 * Ridges rather than furrows — a groove cut *into* a hex face is invisible from
 * 57° and would have to be geometry below the tile top, which the prism does not
 * have. A row of low ridges catches the key light on one flank each and reads as
 * corduroy, which is what a field looks like from the air.
 */
export function furrowRows(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const rows = 4;
  const ridge = size * 0.09;
  for (let i = 0; i < rows; i++) {
    const z = (i - (rows - 1) / 2) * size * 0.24;
    // Alternating lengths, so the block of rows has a worked edge rather than a
    // stamped rectangular one.
    const length = size * (i % 2 === 0 ? 0.92 : 0.78);
    parts.push(slabAt(length, ridge, ridge, 0, ridge / 2, z));
  }
  // The headlands: the strip at each end where the plough turned round.
  for (const side of [-1, 1]) {
    parts.push(
      slabAt(size * 0.14, ridge * 0.8, size * 0.86, side * size * 0.5, ridge * 0.4, 0),
    );
  }
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * A mine head: an A-frame of timber over the shaft, with the spoil beside it.
 *
 * The frame is the read. A hole in the ground is not a shape, so what says
 * "mine" from across the table is the headgear standing over it — two leaning
 * legs and a cross-brace — and the heap of cut rock the shaft threw out.
 */
export function mineHead(size: number): BufferGeometry {
  const height = size;
  const parts: BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    // Leaned inward, so the two legs meet at the top: the A.
    parts.push(
      slabAt(size * 0.1, height, size * 0.1, side * size * 0.24, height / 2, 0, side * 0.26),
    );
  }
  parts.push(slabAt(size * 0.56, size * 0.09, size * 0.12, 0, height * 0.62, 0));
  // The shaft collar: a low kerb round the mouth, so the frame stands on
  // something rather than out of bare grass.
  const collar = new CylinderGeometry(size * 0.24, size * 0.28, size * 0.1, 6, 1);
  collar.translate(0, size * 0.05, 0);
  parts.push(collar);
  // The spoil, off to one side and deliberately lumpy.
  const spoil = new IcosahedronGeometry(size * 0.26, 0);
  spoil.scale(1.1, 0.5, 0.9);
  spoil.translate(size * 0.52, size * 0.11, size * 0.2);
  parts.push(spoil);
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * A fence: posts on a ring, with a rail spanning each gap.
 *
 * Built as *one* geometry centred on the origin rather than as a post placed
 * eight times, because the ring is the thing being drawn — a scatter of posts is
 * a scatter of posts, and an enclosure has to close. One instance per pasture
 * therefore costs one instance, and the herd it is drawn round is the resource
 * layer's own props, untouched.
 */
export function fenceRing(size: number): BufferGeometry {
  const posts = 8;
  const radius = size * 0.5;
  const height = size * 0.2;
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < posts; i++) {
    const angle = (i / posts) * Math.PI * 2;
    parts.push(
      slabAt(
        size * 0.05,
        height,
        size * 0.05,
        Math.cos(angle) * radius,
        height / 2,
        Math.sin(angle) * radius,
      ),
    );
    // The rail to the next post: a thin bar laid along the chord, turned to
    // follow it. A gap of one post-pitch is left where the gate would be.
    if (i === posts - 1) continue;
    const next = ((i + 1) / posts) * Math.PI * 2;
    const mid = (angle + next) / 2;
    const chord = 2 * radius * Math.sin(Math.PI / posts);
    const rail = new BoxGeometry(chord, size * 0.035, size * 0.035);
    rail.rotateY(-(mid + Math.PI / 2));
    rail.translate(Math.cos(mid) * radius, height * 0.72, Math.sin(mid) * radius);
    parts.push(rail);
  }
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/** A camp: one ridge tent with a guy pole, and a fire ring beside it. */
export function campTent(size: number): BufferGeometry {
  // A four-sided cone is a pyramid, which at this scale is a tent: two lit
  // faces, two shadowed, and a hard ridge between them.
  const tent = new ConeGeometry(size * 0.5, size * 0.8, 4, 1);
  tent.rotateY(Math.PI / 4);
  tent.translate(0, size * 0.4, 0);
  const pole = shaft(size * 1.05, size * 0.03, 4);
  const parts: BufferGeometry[] = [tent, pole];
  const fire = new CylinderGeometry(size * 0.16, size * 0.18, size * 0.06, 6, 1);
  fire.translate(size * 0.62, size * 0.03, size * 0.12);
  parts.push(fire);
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * An ancient ruin: two broken columns and the rubble of a third.
 *
 * Deliberately shaped *against* `marbleColumn`, which is the closest thing on the
 * board and must stay tellable apart at this camera. The marble seam is two
 * standing drums and one fallen alongside — a quarry that is still working. This
 * is the opposite reading: nothing here is whole. Both uprights are snapped at
 * different heights, the taller one leans, and what would have been the third is
 * a low scatter of blocks. The silhouette a player learns is *a broken vertical*,
 * where the village next door is a cluster of small solids.
 *
 * No plinth and no floor plan: a ruin drawn as a building is a building, and this
 * has to read as something the ground took back.
 */
export function brokenColumns(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // The tall stump, snapped high and out of true.
  const tall = new CylinderGeometry(size * 0.17, size * 0.2, size * 0.72, 6, 1);
  tall.rotateZ(0.09);
  tall.translate(-size * 0.2, size * 0.36, -size * 0.06);
  parts.push(tall);

  // The short stump, snapped low and square — two identical breaks would read as
  // a colonnade rather than as a wreck.
  const short = new CylinderGeometry(size * 0.16, size * 0.19, size * 0.34, 6, 1);
  short.rotateY(0.7);
  short.translate(size * 0.24, size * 0.17, size * 0.2);
  parts.push(short);

  // A drum off the top of one of them, lying where it fell.
  const drum = new CylinderGeometry(size * 0.16, size * 0.16, size * 0.2, 6, 1);
  drum.rotateZ(Math.PI / 2);
  drum.rotateY(0.9);
  drum.translate(size * 0.06, size * 0.09, -size * 0.34);
  parts.push(drum);

  // Rubble: three blocks at three sizes, low and unaligned.
  const rubble: [number, number, number, number][] = [
    [0.2, size * 0.44, size * 0.06, size * 0.02],
    [0.14, -size * 0.44, size * 0.05, size * 0.28],
    [0.11, -size * 0.02, size * 0.04, size * 0.42],
  ];
  for (const [scale, x, y, z] of rubble) {
    const block = new BoxGeometry(size * scale, size * scale * 0.7, size * scale);
    block.rotateY(scale * 9);
    block.translate(x, y, z);
    parts.push(block);
  }

  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * A tribal village: three round huts with conical roofs, and a cook fire.
 *
 * The counterpart to `brokenColumns`, and the pair is designed as a pair: the
 * ruin is one broken vertical, this is a *cluster of small solids* — nothing
 * here is taller than a third of the hex and there are several of them. At the
 * ortho camera that difference survives the fog wash, which two props of similar
 * mass would not.
 *
 * Distinct from `campTent` (the hunting-camp improvement) in the same way and on
 * purpose: that is one four-sided pyramid on a pole, this is three round drums
 * under cones. A player must never have to check the tooltip to tell a village
 * they can walk into from a camp they built.
 */
export function hutCluster(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  /** Where each hut stands, and how big it is. Hand-placed, never rolled. */
  const huts: [number, number, number][] = [
    [-size * 0.3, -size * 0.16, 1],
    [size * 0.28, -size * 0.02, 0.86],
    [-size * 0.02, size * 0.34, 0.74],
  ];
  for (const [x, z, scale] of huts) {
    const wall = new CylinderGeometry(size * 0.19 * scale, size * 0.21 * scale, size * 0.22 * scale, 6, 1);
    wall.translate(x, size * 0.11 * scale, z);
    parts.push(wall);
    const roof = new ConeGeometry(size * 0.27 * scale, size * 0.24 * scale, 6, 1);
    // Each roof turned a little differently, so three copies of one shape do not
    // read as one object repeated.
    roof.rotateY(scale * 1.7);
    roof.translate(x, size * 0.34 * scale, z);
    parts.push(roof);
  }
  // The fire the huts are arranged around: a low ring, which is what says
  // "people live here" rather than "somebody left three shapes on a hex".
  const hearth = new CylinderGeometry(size * 0.13, size * 0.15, size * 0.05, 6, 1);
  hearth.translate(size * 0.02, size * 0.025, size * 0.02);
  parts.push(hearth);

  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * A barbarian camp: a ring of stakes round a fire, with a banner over it.
 *
 * The third of the three "something is on this hex" sculpts and the one that has
 * to read as *hostile* at a glance, because it is the only one a player must
 * decide whether to attack. So it is the only one with a vertical marker on it —
 * a leaning pole with a rag — and the only one whose silhouette is a *palisade*:
 * six stakes on a ring, angled outward, which is a shape nothing else on this
 * board makes.
 *
 * It is emphatically not `campTent` recoloured. A hunting camp is a tent; this
 * is a position somebody is holding, and the difference has to survive the fog
 * wash and the raven ink both.
 */
export function raiderCamp(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // The palisade: six stakes on a ring, each leaning outward from the centre.
  const stakes = 6;
  for (let i = 0; i < stakes; i++) {
    const angle = (i / stakes) * Math.PI * 2 + 0.3;
    const radius = size * 0.42;
    const stake = new CylinderGeometry(size * 0.035, size * 0.055, size * 0.46, 4, 1);
    // Leaned away from the middle, so the ring reads as a defence rather than as
    // a circle of fence posts.
    stake.rotateX(0.22);
    stake.rotateY(-angle);
    stake.translate(Math.cos(angle) * radius, size * 0.22, Math.sin(angle) * radius);
    parts.push(stake);
  }

  // The fire in the middle, banked up higher than the village's hearth: this one
  // is meant to be seen from off the hex.
  const fire = new ConeGeometry(size * 0.17, size * 0.2, 5, 1);
  fire.translate(0, size * 0.1, 0);
  parts.push(fire);

  // The standard: a leaning pole and a rag, and the whole reason the prop has a
  // vertical at all.
  const pole = shaft(size * 0.9, size * 0.035, 4);
  pole.rotateZ(-0.16);
  pole.translate(size * 0.1, 0, -size * 0.12);
  parts.push(pole);
  const rag = new BoxGeometry(size * 0.26, size * 0.16, size * 0.03);
  rag.rotateZ(-0.16);
  rag.translate(size * 0.26, size * 0.74, -size * 0.12);
  parts.push(rag);

  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/** A quarry: three cut steps down into the rock, and one block left loose. */
export function quarrySteps(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const steps = 3;
  for (let i = 0; i < steps; i++) {
    const height = size * (0.34 - i * 0.1);
    const width = size * (0.9 - i * 0.16);
    parts.push(slabAt(width, height, size * 0.26, 0, height / 2, (i - 1) * size * 0.26));
  }
  // The block that was cut and not carried, turned off the axis of the bench so
  // the whole prop does not read as one stepped wedge.
  const block = new BoxGeometry(size * 0.28, size * 0.24, size * 0.26);
  block.rotateY(0.5);
  block.translate(size * 0.58, size * 0.12, -size * 0.2);
  parts.push(block);
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * A plantation: two trellis rows, posts and a top rail each.
 *
 * The vine, the mulberry and the pepper are the resource layer's props and stay
 * where they are; this is the frame somebody built around them, which is exactly
 * what a plantation is on a hex that already shows what it grows.
 */
export function trellisRows(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const height = size * 0.44;
  for (const row of [-1, 1]) {
    const z = row * size * 0.26;
    for (const post of [-1, 0, 1]) {
      parts.push(
        slabAt(size * 0.05, height, size * 0.05, post * size * 0.34, height / 2, z),
      );
    }
    parts.push(slabAt(size * 0.8, size * 0.04, size * 0.04, 0, height * 0.94, z));
    parts.push(slabAt(size * 0.8, size * 0.035, size * 0.035, 0, height * 0.58, z));
  }
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * A lumbermill: a sawing trestle with a log on it, and a stack of cut timber.
 *
 * The one improvement prop that has to share its hex with a *full canopy*. Every
 * other prop on this table is either the only thing standing on its tile (the
 * farm, the mine) or is built round a resource that is a scatter of small
 * objects (the herd, the vines). A lumbermill stands in a forest — the trees are
 * emphatically not cleared, which is the whole point of the improvement — so it
 * is drawn against pines that are taller than anything else on the board.
 *
 * Two consequences, and both are the shape rather than the size:
 *
 *   · **It is low and it is horizontal.** A vertical would be one more trunk. A
 *     stack of logs lying down is the one silhouette in a wood that could not
 *     possibly be a tree, and it is the first thing a real clearing shows.
 *   · **Nothing is round-topped.** The canopy cones own that read, so the
 *     trestle is squared timber and the stack is cut ends — the difference
 *     between a log and a trunk is that somebody sawed it.
 *
 * `size` and `jitter` in `data/view3d.json` do the rest: the prop is small and
 * nudged well off centre, so it stands in a gap between the pines rather than
 * inside one.
 */
export function sawPit(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const logRadius = size * 0.115;
  const logLength = size * 0.82;

  /** One felled log, lying along x. Six sides: cut timber, not a turned pole. */
  const log = (x: number, y: number, z: number): BufferGeometry => {
    const timber = new CylinderGeometry(logRadius, logRadius, logLength, 6, 1);
    timber.rotateZ(Math.PI / 2);
    timber.translate(x, y, z);
    return timber;
  };

  // The stack: two down, one nested on top. Three is the fewest that reads as a
  // *pile* — two side by side is a pair of logs and four is a wall.
  const stackZ = size * 0.34;
  parts.push(log(0, logRadius, stackZ - logRadius * 1.02));
  parts.push(log(0, logRadius, stackZ + logRadius * 1.02));
  parts.push(log(0, logRadius * 2.72, stackZ));

  // The trestle: two squared legs, a beam across them, and the log being cut.
  const trestleZ = -size * 0.3;
  const legHeight = size * 0.3;
  for (const side of [-1, 1]) {
    parts.push(
      slabAt(size * 0.08, legHeight, size * 0.08, side * size * 0.26, legHeight / 2, trestleZ),
    );
  }
  parts.push(slabAt(size * 0.72, size * 0.07, size * 0.1, 0, legHeight, trestleZ));
  parts.push(log(0, legHeight + logRadius * 1.1, trestleZ));

  // The saw, stood on end in the cut: a thin blade with a handle above it. It is
  // the only vertical on the prop and it is deliberately small — one stroke that
  // says the timber is being *worked* rather than merely stacked.
  parts.push(
    slabAt(size * 0.035, size * 0.34, size * 0.16, size * 0.12, legHeight + size * 0.3, trestleZ),
  );

  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * Fishing boats: one small hull with a mast and a boom, and a float beside it.
 *
 * The only improvement prop that stands on *water*, which decides everything
 * about it. It cannot be a thing built up off the ground the way the trellis and
 * the tent are, because a hex of coast is already the lowest prism on the board
 * and anything tall reads as stranded; so the silhouette is horizontal — a long
 * low hull — with exactly one vertical to say it is a boat rather than a log.
 *
 * The hull is a box tapered at the bow by a shear rather than a lathe: at forty
 * pixels the taper is two pixels of asymmetry, and two pixels is all it takes to
 * stop a rectangle reading as a raft. The float is what keeps it from reading as
 * a *ship* — a boat with a net buoy beside it is fishing, a boat alone is navy,
 * and the day naval units land the two must not be confusable.
 */
export function fishingBoat(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const length = size * 1.05;
  const beam = size * 0.34;
  const depth = size * 0.2;

  // The hull, sitting with its waterline just above the tile top so the prism's
  // own surface reads as the sea it floats on.
  const hull = new BoxGeometry(length, depth, beam);
  hull.translate(0, depth * 0.42, 0);
  parts.push(hull);
  // The bow: a wedge finishing the hull forward, narrower than the beam.
  const bow = new ConeGeometry(beam * 0.5, size * 0.34, 4, 1);
  bow.rotateY(Math.PI / 4);
  bow.rotateZ(-Math.PI / 2);
  bow.translate(length * 0.5 + size * 0.14, depth * 0.42, 0);
  parts.push(bow);

  // The one vertical, stepped a little aft of centre, with a boom raked off it.
  const mast = shaft(size * 0.78, size * 0.03, 4);
  mast.translate(-length * 0.08, depth * 0.8, 0);
  parts.push(mast);
  parts.push(
    slabAt(size * 0.46, size * 0.03, size * 0.03, size * 0.1, depth * 0.8 + size * 0.5, 0, -0.22),
  );

  // The net float, off the port quarter. Small, round, and not touching the
  // hull — a second solid at a distance is what says "gear in the water".
  const float = new IcosahedronGeometry(size * 0.09, 0);
  float.translate(-length * 0.42, size * 0.06, beam * 0.9);
  parts.push(float);

  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

// --- the great works -------------------------------------------------------

/**
 * The five things a *great person* leaves on a hex, and the gilt on each of them.
 *
 * They are improvements like the six above — one instance per improved tile,
 * placed and turned by `improvements3d.ts` off the same hashed streams — and
 * everything that section's docblock says about composition still holds. What
 * separates them is what they have to say at a glance, and it is one sentence:
 * *somebody irreplaceable did this once*. A worker's improvement is work; a
 * great work is a monument, and the board has to be able to tell them apart at
 * forty pixels without a label.
 *
 * Three things carry that, all of them silhouette:
 *
 *   · **Size.** Every one of these is built at roughly a third again the size a
 *     farm or a quarry is (`improvements.props` in `view3d.json`), which is the
 *     smallest difference that survives the ortho camera.
 *   · **Formality.** A worker's prop is a thing that grew where it was needed —
 *     alternating furrow lengths, a spoil heap off to one side, a tent nudged
 *     off centre. These are *symmetrical* and stand on plinths. Nothing here is
 *     lumpy on purpose, because a monument that looked improvised would read as
 *     more scatter.
 *   · **One gilt element each,** and this is the load-bearing one.
 *
 * The gold rule, and why this file gets to break it
 * -------------------------------------------------
 * Gold is the scarcest ink on this board and it has been spent in exactly three
 * places: the palace's finial, the shrine's needle and a wonder's tip — the
 * things a whole empire builds once (see `cityPalaceFinial`). A great work is
 * the fourth, and it is the same claim: an academy is not a building a town
 * decided to put up, it is Archimedes, spent. So each of the five carries a
 * *single* gilt element and never more — a roof ridge, a capstone, a door, a
 * vane, a banner — and that one bright mark is the whole tell. Widening this
 * further would make gold mean "expensive" instead of "unrepeatable", and there
 * would be no ink left to say the second thing.
 *
 * The gilt is a **second geometry**, not a second group, exactly as the shrine's
 * needle is (`cityShrineFinial`, and `CityLayer.addWork`'s docblock): the layer
 * draws it as a second instance over the same matrix. Two instances rather than
 * one two-group mesh because a bucket's ink is what the fog wash is computed
 * from, and a bucket that held both inks would have to wash a bone colonnade as
 * though it were gold.
 */

/**
 * The academy: a colonnaded hall on a stylobate, under a gilt roof ridge.
 *
 * A *temple front* is the shape, and it is chosen against the rest of the board
 * rather than out of the dictionary: five columns under an entablature is the
 * only silhouette in the diorama that is a rhythm — every other prop is one or
 * two masses, and a repeated vertical beat at this size reads as "institution"
 * before a player can name what building it is. It is deliberately close to the
 * `marbleColumn` resource prop and deliberately much larger than it, which is
 * the same joke the ruin plays on the same shape: two drums are a quarry, five
 * columns and a roof are a school.
 */
export function academyHall(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Two steps of stylobate. A monument that met the grass at its own wall would
  // read as a shed; the plinth is most of what says "raised on purpose".
  parts.push(slabAt(size * 1.0, size * 0.07, size * 0.66, 0, size * 0.035, 0));
  parts.push(slabAt(size * 0.88, size * 0.06, size * 0.56, 0, size * 0.1, 0));

  const floor = size * 0.13;
  const columnH = size * 0.32;
  for (let i = 0; i < 5; i++) {
    const column = new CylinderGeometry(size * 0.042, size * 0.05, columnH, 6, 1);
    column.translate((i - 2) * size * 0.19, floor + columnH / 2, -size * 0.2);
    parts.push(column);
  }
  // The cella behind the colonnade: one solid wall, so the gaps between the
  // columns are dark rather than transparent. A colonnade with daylight through
  // it loses its rhythm the moment it stands on pale ground.
  parts.push(
    slabAt(size * 0.8, columnH, size * 0.07, 0, floor + columnH / 2, size * 0.2),
  );
  // The entablature the columns carry, wider than they stand: the overhang is
  // what makes five posts read as holding something up.
  const architrave = floor + columnH;
  parts.push(slabAt(size * 0.92, size * 0.07, size * 0.6, 0, architrave + size * 0.035, 0));

  // A shallow gable along x. Two leaned planes rather than a prism, because the
  // ridge has to be a real edge for the gilt to sit on.
  const eaves = architrave + size * 0.07;
  const rise = size * 0.14;
  const half = size * 0.3;
  const pitch = Math.atan2(rise, half);
  const slope = Math.hypot(half, rise);
  for (const side of [-1, 1]) {
    const plane = new BoxGeometry(size * 0.96, size * 0.045, slope);
    plane.rotateX(side * pitch);
    plane.translate(0, eaves + rise / 2, (side * half) / 2);
    parts.push(plane);
  }
  return weld(parts);
}

/** The academy's gilt ridge: a square bar on edge, capping the gable's spine. */
export function academyRidge(size: number): BufferGeometry {
  const architrave = size * 0.13 + size * 0.32;
  const apex = architrave + size * 0.07 + size * 0.14;
  // Turned 45° so it is a diamond in section — a ridge *cap*, which is a bright
  // line on both slopes at once, where a flat bar would only catch the lit one.
  const ridge = new CylinderGeometry(size * 0.05, size * 0.05, size * 1.0, 4, 1);
  ridge.rotateY(Math.PI / 4);
  ridge.rotateZ(Math.PI / 2);
  ridge.translate(0, apex + size * 0.012, 0);
  return flatten(ridge);
}

/**
 * The landmark: a square stele on a stepped base, under a gilt pyramidion.
 *
 * The one great work that is a *vertical* and nothing else, which is the whole
 * of why it is the artist's: it says nothing about what it is for. Four sides
 * rather than six or eight, because a tapered square catches one lit face and
 * one shadowed one at this camera and therefore reads as a shaft rather than as
 * a pole — the difference between this and `bannerPole` at twelve pixels.
 *
 * Drawn against `brokenColumns`, which is the other lone upright on the board:
 * that one is snapped, leaning and unfinished at the top, and this one is
 * whole, plumb and capped. A ruin is what time did; a landmark is what somebody
 * meant.
 */
export function landmarkStele(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  parts.push(slabAt(size * 0.62, size * 0.09, size * 0.62, 0, size * 0.045, 0));
  parts.push(slabAt(size * 0.46, size * 0.08, size * 0.46, 0, size * 0.13, 0));

  const shaftH = size * 0.62;
  const shaft = new CylinderGeometry(size * 0.105, size * 0.155, shaftH, 4, 1);
  // Square on to the camera's axes rather than corner on: the flat face is what
  // takes the key light cleanly and keeps the taper legible.
  shaft.rotateY(Math.PI / 4);
  shaft.translate(0, size * 0.17 + shaftH / 2, 0);
  parts.push(shaft);
  return weld(parts);
}

/** The landmark's gilt cap: the pyramidion, cut to the shaft's own square. */
export function landmarkCap(size: number): BufferGeometry {
  const top = size * 0.17 + size * 0.62;
  const cap = new ConeGeometry(size * 0.105, size * 0.17, 4, 1);
  cap.rotateY(Math.PI / 4);
  cap.translate(0, top + size * 0.085, 0);
  return flatten(cap);
}

/**
 * The manufactory: a long gabled hall with a kiln at one end, and a gilt door.
 *
 * Asymmetric on purpose, and the only one of the five that is. A works is not a
 * monument to itself — it is a place where something is made — so the shape is
 * a shed with one enormous piece of equipment growing out of it, which is what
 * every real foundry looks like from a distance and what nothing else on this
 * board is shaped like.
 *
 * The kiln is *chimney-less* deliberately: a stack would be a thin vertical and
 * this board already spends thin verticals on masts, poles and steles. A fat
 * tapered drum taller than the roof it stands beside is unmistakable and cannot
 * be confused with any of them.
 */
export function manufactoryHall(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const hallH = size * 0.3;
  parts.push(slabAt(size * 0.98, hallH, size * 0.46, -size * 0.06, hallH / 2, 0));

  // The same two-plane gable the academy wears, shallower — a workshop roof,
  // not a pediment.
  const rise = size * 0.1;
  const half = size * 0.26;
  const pitch = Math.atan2(rise, half);
  const slope = Math.hypot(half, rise);
  for (const side of [-1, 1]) {
    const plane = new BoxGeometry(size * 1.02, size * 0.04, slope);
    plane.rotateX(side * pitch);
    plane.translate(-size * 0.06, hallH + rise / 2, (side * half) / 2);
    parts.push(plane);
  }

  // The kiln: a heavy truncated drum standing clear of the hall's end wall, and
  // taller than the ridge by half again.
  const kilnH = size * 0.62;
  const kiln = new CylinderGeometry(size * 0.11, size * 0.19, kilnH, 6, 1);
  kiln.translate(size * 0.44, kilnH / 2, 0);
  parts.push(kiln);
  // Its rim, which is what keeps the drum from reading as a silo: a silo is
  // closed at the top and a kiln is a mouth.
  const rim = new CylinderGeometry(size * 0.13, size * 0.125, size * 0.05, 6, 1);
  rim.translate(size * 0.44, kilnH + size * 0.02, 0);
  parts.push(rim);
  return weld(parts);
}

/** The manufactory's gilt door, standing proud of the hall's long front wall. */
export function manufactoryDoor(size: number): BufferGeometry {
  const door = new BoxGeometry(size * 0.17, size * 0.2, size * 0.05);
  door.translate(-size * 0.24, size * 0.1, -size * 0.24);
  return flatten(door);
}

/**
 * The customs house: three tiers of warehouse under wide eaves, with a gilt
 * weathervane on top.
 *
 * A *stack*, which no other improvement on the board is. The merchant's work
 * had to say "goods, in quantity, under one roof" without a single crate in it,
 * and the answer is the shape a warehouse takes when it grows: three floors,
 * each smaller than the one under it, each with an overhanging eave that throws
 * a hard shadow line. Three stacked shadows at this camera is the read, and it
 * is the same trick `cityTemple` plays with terraces one scale up — which is
 * why this one has eaves and the ziggurat does not, so the two do not become
 * one stepped wedge on a board that shows both.
 */
export function customsWarehouse(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const tiers: readonly { w: number; d: number; h: number }[] = [
    { w: 0.86, d: 0.66, h: 0.22 },
    { w: 0.66, d: 0.5, h: 0.2 },
    { w: 0.44, d: 0.34, h: 0.18 },
  ];
  let y = 0;
  for (const tier of tiers) {
    parts.push(slabAt(size * tier.w, size * tier.h, size * tier.d, 0, y + (size * tier.h) / 2, 0));
    y += size * tier.h;
    // The eave: a thin slab a little wider than the floor it caps. It is the
    // whole reason the stack reads as three storeys and not as one taper.
    parts.push(
      slabAt(size * (tier.w + 0.08), size * 0.03, size * (tier.d + 0.08), 0, y + size * 0.015, 0),
    );
    y += size * 0.03;
  }
  return weld(parts);
}

/** The customs house's gilt weathervane: a mast, a pennant and its arrow. */
export function customsVane(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const roof = size * (0.22 + 0.2 + 0.18) + size * 0.09;
  const mastH = size * 0.22;
  const mast = shaft(mastH, size * 0.018, 4);
  mast.translate(0, roof, 0);
  parts.push(mast);
  // The pennant, and the arrow it points with. Both flat and both on the same
  // side of the mast, so the vane has a *direction* — a symmetrical finial here
  // would just be a second, smaller version of the landmark's cap.
  parts.push(slabAt(size * 0.14, size * 0.07, size * 0.02, -size * 0.08, roof + mastH * 0.82, 0));
  const arrow = new ConeGeometry(size * 0.045, size * 0.12, 3, 1);
  arrow.rotateZ(-Math.PI / 2);
  arrow.translate(size * 0.09, roof + mastH * 0.82, 0);
  parts.push(arrow);
  return weld(parts);
}

/**
 * The citadel: a squat hexagonal fort — six wall runs with a bastion at every
 * corner — around a platform carrying a gilt banner.
 *
 * `cityWallSegment`'s ring at a third the height and on its own hexagon rather
 * than on the tile's. It is drawn *inside* the hex face with room to spare on
 * every side, which is what lets it take the layer's hashed yaw like every
 * other prop: a ring sized to the tile's own edges would have to know the
 * tile's rotation, and an improvement prop deliberately does not.
 *
 * The bastions are what make it a fort rather than a wall. Six knobs on a ring
 * is a silhouette nothing else here has — the palisade is a comb of points and
 * the Æra III wall is a square-toothed band, and both of those belong to a town
 * — so a citadel on open ground cannot be misread as somebody's city.
 */
export function citadelRing(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const apothem = size * 0.44;
  const wallH = size * 0.15;
  // A closed hexagon: each run spans the full edge between two corners, plus a
  // little, so the corners are lapped rather than mitred. Nothing here is seen
  // from close enough for the lap to show, and a mitre would be six wedges.
  const run = apothem * 1.1547 * 1.06;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    // Turned a quarter past its own bearing, so the run lies *across* the
    // radius: `fenceRing`'s rail, and the same trap — a box left on its bearing
    // is a spoke, and six spokes is a wheel rather than a fort.
    const wall = new BoxGeometry(run, wallH, size * 0.07);
    wall.rotateY(-(angle + Math.PI / 2));
    wall.translate(Math.cos(angle) * apothem, wallH / 2, Math.sin(angle) * apothem);
    parts.push(wall);
  }
  // The bastions, on the corners the runs meet at — half a step out and a step
  // taller, so the ring has a rhythm from every direction the camera sees it.
  const corner = apothem / Math.cos(Math.PI / 6);
  const bastionH = size * 0.21;
  for (let i = 0; i < 6; i++) {
    const angle = ((i + 0.5) / 6) * Math.PI * 2;
    const bastion = new CylinderGeometry(size * 0.075, size * 0.085, bastionH, 5, 1);
    bastion.translate(Math.cos(angle) * corner, bastionH / 2, Math.sin(angle) * corner);
    parts.push(bastion);
  }
  // The parade ground: a low hexagonal pad the banner stands on, so the pole
  // rises out of something instead of out of bare grass inside a ring.
  const pad = new CylinderGeometry(size * 0.17, size * 0.19, size * 0.1, 6, 1);
  pad.translate(0, size * 0.05, 0);
  parts.push(pad);
  return weld(parts);
}

/** The citadel's gilt banner: the pole on the parade ground, and its pennant. */
export function citadelBanner(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const poleH = size * 0.52;
  const pole = shaft(poleH, size * 0.022, 5);
  pole.translate(0, size * 0.1, 0);
  parts.push(pole);
  // A swallow-tailed pennant, which is two slabs: the fly is what stops a small
  // rectangle on a stick reading as a road sign.
  parts.push(slabAt(size * 0.16, size * 0.09, size * 0.018, size * 0.09, size * 0.53, 0));
  parts.push(slabAt(size * 0.07, size * 0.04, size * 0.018, size * 0.2, size * 0.555, 0));
  return weld(parts);
}

/**
 * The holy site: a ring of standing stones about a low altar, with a gilt tip on
 * the altar's own spike.
 *
 * The **sixth** work, and the first one no *great person* plants — a prophet
 * does (`ImprovementDef.greatPerson` names the hand, and a prophet is one). It
 * takes the great-work treatment whole, because it is the same claim in a
 * different currency: a holy site is not a building a town decided to put up,
 * it is a prophet, spent. So it is built to a work's size, it is symmetrical, it
 * stands on a plinth, and it carries **one** gilt element and no more (see the
 * great-works docblock above for why that ink is the scarcest on the board).
 *
 * It shipped as the landmark's stele wearing the landmark's cap, which was an
 * honest placeholder and a bad drawing: the two works then had one silhouette
 * between them, and a stele *is* the artist's — "it says nothing about what it
 * is for" — which is precisely the wrong sentence for the one improvement on the
 * board that says what an empire believes.
 *
 * What replaces it is the only shape in the diorama that is a **ring of
 * verticals**. The academy is a rhythm along a line; this is a rhythm around a
 * point, which at the ortho camera is unmistakable from any bearing and is not a
 * shape the board spends anywhere else. Six monoliths, rough-hewn: each is a
 * four-sided prism *tilted a little* off plumb on a hashed-looking but fixed
 * lean, because a circle of perfectly plumb posts reads as a fence and a circle
 * of leaning ones reads as something old. The lean is baked into the geometry
 * rather than hashed at placement, so every holy site in the world is the same
 * stones — a work is a monument, and a monument is not scatter.
 *
 * `citadelRing` is the shape to hold this against: that one is a closed *wall*
 * with bastions, low and continuous. This is six separate uprights with daylight
 * between them, which is the whole difference between a fort and a sanctuary.
 */
export function standingStones(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // The precinct: a low disc the whole thing stands on, so the stones meet
  // something rather than the grass — the plinth every work has.
  const pad = new CylinderGeometry(size * 0.5, size * 0.53, size * 0.05, 12, 1);
  pad.translate(0, size * 0.025, 0);
  parts.push(pad);

  const ring = size * 0.38;
  const stoneH = size * 0.54;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    // Taller at the base than at the top and squarer at the bottom: a monolith
    // is a slab that was dragged upright, not a column that was turned.
    const stone = new CylinderGeometry(size * 0.06, size * 0.085, stoneH, 4, 1);
    stone.rotateY(angle);
    // The lean, alternating in and out around the ring. Alternating rather than
    // random because it is *geometry* and not jitter: the ring keeps its
    // symmetry, and the silhouette still never shows six parallel posts.
    stone.rotateZ((i % 2 === 0 ? 1 : -1) * 0.06);
    stone.translate(Math.cos(angle) * ring, size * 0.05 + stoneH / 2, Math.sin(angle) * ring);
    parts.push(stone);
  }

  // The altar at the centre: a squat drum, wide enough to read as a *thing*
  // inside the ring rather than as a seventh stone that fell over.
  const altar = new CylinderGeometry(size * 0.15, size * 0.17, size * 0.11, 8, 1);
  altar.translate(0, size * 0.05 + size * 0.055, 0);
  parts.push(altar);
  return weld(parts);
}

/**
 * The holy site's gilt: a slender spike standing on the altar at the ring's
 * centre.
 *
 * At the apex, like four of the other five works' gold, and for their reason —
 * a bright mark at the top of the silhouette is the one that survives being
 * forty pixels tall. It is deliberately *taller than the stones around it*: the
 * ring's job is to be recognisable and the tip's job is to say that this ring is
 * a work, and a gilt element buried inside a circle of bone posts would say
 * nothing at all from the two bearings where a stone stands in front of it.
 */
export function standingStoneTip(size: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const base = size * 0.05 + size * 0.11;
  const shaftH = size * 0.5;
  const spike = new CylinderGeometry(size * 0.018, size * 0.032, shaftH, 4, 1);
  spike.rotateY(Math.PI / 4);
  spike.translate(0, base + shaftH / 2, 0);
  parts.push(spike);
  // The flame it carries: a four-sided point, the same cut the landmark's
  // pyramidion takes, so the two golds are one hand.
  const flame = new ConeGeometry(size * 0.055, size * 0.16, 4, 1);
  flame.rotateY(Math.PI / 4);
  flame.translate(0, base + shaftH + size * 0.08, 0);
  parts.push(flame);
  return weld(parts);
}

// --- unit miniatures -------------------------------------------------------

/**
 * Lathe a profile given as `[radius, height]` pairs, bottom first.
 *
 * Seven radial segments, deliberately odd: an even count puts a facet edge dead
 * centre on both the lit and shadowed side and the piece reads as symmetrical
 * and machine-made. Odd counts break that and look turned on a lathe, which is
 * what a wooden game piece is.
 */
function lathe(profile: readonly (readonly [number, number])[], segments = 7): BufferGeometry {
  const points = profile.map(([r, y]) => new Vector2(r, y));
  return new LatheGeometry(points, segments);
}

/**
 * The inks a miniature is painted in, as *roles* rather than colours.
 *
 * A sculpt says "this bit is wood", never "this bit is #8a6a45": the body role
 * resolves to the owning player's colour and the other three to fixed palette
 * entries (`pieces.colors` in `view3d.json`), so one geometry serves every
 * player and the equipment never drifts into looking like ownership signalling.
 *
 * `gilt` is the fourth and the odd one, added with the caravan. It is not a
 * material a piece is *made* of — it is the board's one reserved note, the ink
 * that already says "a great person did this once" on a work and "this is the
 * capital" on a palace finial. A sculpt spends it on the one element that has to
 * be read across the table from a shape that is otherwise identical to a
 * neighbour's, and today that is exactly one thing: the bale on a caravan that
 * is actually carrying a route. A second sculpt that reached for it to look
 * expensive would be spending a word the world has already given a meaning.
 */
export type MiniAccent = 'wood' | 'metal' | 'accent' | 'gilt';
export type MiniPart = 'body' | MiniAccent;

/**
 * The size class a sculpt is built to, which is the whole of the "do these read
 * as one set" question. Infantry stand around a hex radius tall, polearms carry
 * their point a little higher, riders sit higher still, and the siege engines
 * are deliberately *short and wide* — a catapult that matched a pikeman's height
 * would be a tower, not a machine. The numbers live in `view3d.json`.
 */
export type MiniClass = 'foot' | 'polearm' | 'mounted' | 'siege' | 'engine';

/**
 * One sculpted miniature: a single merged geometry, plus the ink each of its
 * geometry groups wants.
 *
 * Groups rather than separate geometries because a miniature is *one* object —
 * it is placed, turned, hidden, walked and outlined as a unit, and the instance
 * machinery keys buckets on (geometry, colours), so a two-tone piece with two
 * groups is one instanced draw with a two-material array rather than two draws
 * that have to be kept in step. The inverted-hull shell ignores groups entirely
 * (three only walks them when the material is an array), so the outline is one
 * closed silhouette around the whole figure, which is exactly what it should be.
 */
export interface UnitPiece {
  geometry: BufferGeometry;
  /** Which ink each geometry group wants, in group order. */
  parts: MiniPart[];
}

/** The kit numbers every sculpt is cut from. All lengths in world units. */
export interface MiniSpec {
  /** Total silhouette height, base disc included. */
  height: number;
  baseRadius: number;
  baseThickness: number;
  /** Shoulder radius of the humanoid token. */
  tokenRadius: number;
}

export type MiniFactory = (spec: MiniSpec) => UnitPiece;

/**
 * Group order, fixed. A sculpt adds parts in whatever order suits the build; the
 * assembly emits them in *this* order and skips the roles it never used, so two
 * sculpts with the same set of roles produce the same colour array and the
 * instancer can share a bucket per player colour.
 */
const MINI_PART_ORDER: readonly MiniPart[] = ['body', 'wood', 'metal', 'accent', 'gilt'];

/**
 * Collects primitives by ink role and welds them into one grouped geometry.
 *
 * The counting is done on de-indexed vertex counts because `merge` de-indexes,
 * so a group's `count` is "how many vertices this role contributed" — which is
 * the number three wants and the only bookkeeping in the whole file that would
 * silently mis-colour a piece if it drifted.
 */
class Mini {
  private readonly sections = new Map<MiniPart, BufferGeometry[]>();

  add(part: MiniPart, ...geometries: BufferGeometry[]): this {
    const list = this.sections.get(part);
    if (list) list.push(...geometries);
    else this.sections.set(part, geometries.slice());
    return this;
  }

  build(): UnitPiece {
    const parts = MINI_PART_ORDER.filter((part) => (this.sections.get(part)?.length ?? 0) > 0);
    const ordered: BufferGeometry[] = [];
    const counts: number[] = [];
    for (const part of parts) {
      let vertices = 0;
      for (const geometry of this.sections.get(part)!) {
        ordered.push(geometry);
        const index = geometry.getIndex();
        vertices += index ? index.count : geometry.getAttribute('position').count;
      }
      counts.push(vertices);
    }
    const merged = merge(ordered);
    for (const geometry of ordered) geometry.dispose();
    const flat = flatten(merged);
    let start = 0;
    for (let i = 0; i < parts.length; i++) {
      flat.addGroup(start, counts[i]!, i);
      start += counts[i]!;
    }
    return { geometry: flat, parts };
  }
}

// --- the composition kit ---------------------------------------------------

/**
 * The disc every miniature stands on.
 *
 * This is the single element that makes wildly different silhouettes — a
 * settler, a horse, a catapult — read as one *set* of board pieces rather than
 * as a pile of models. Uniform radius and thickness across the whole roster,
 * always in the player's colour, always visible: a tabletop base.
 *
 * Eight sides, slightly flared. Eight because six would lock the base's facets
 * to the hexagon it stands on and glue the piece to the grid, and the flare is
 * what stops it reading as a coin — a moulded base is wider where it meets the
 * table.
 */
function miniBase(spec: MiniSpec): BufferGeometry {
  const base = new CylinderGeometry(
    spec.baseRadius,
    spec.baseRadius * 1.07,
    spec.baseThickness,
    8,
    1,
  );
  base.translate(0, spec.baseThickness / 2, 0);
  return base;
}

/**
 * The abstract figure: a turned body and a ball head, and nothing else.
 *
 * No face, no arms, no legs. The equipment is what tells a swordsman from an
 * archer; the token is the *person*, and at forty pixels a person is a shape
 * with shoulders. Every attempt to add detail here costs triangles that the
 * silhouette — the only thing that survives the zoom — never spends.
 *
 * Returned as two geometries so the caller can hand both to the same ink role;
 * they are already lifted to `y`, which is the top of the base disc.
 */
function miniToken(height: number, radius: number, y: number): BufferGeometry[] {
  const headR = radius * 0.56;
  const bodyH = height - headR * 1.65;
  const body = lathe([
    [0, 0],
    [radius * 0.88, 0],
    [radius * 0.5, bodyH * 0.2],
    [radius * 0.44, bodyH * 0.56],
    [radius * 0.96, bodyH * 0.87],
    [0, bodyH],
  ]);
  body.translate(0, y, 0);

  const head = new IcosahedronGeometry(headR, 0);
  head.scale(1, 1.06, 1);
  head.translate(0, y + bodyH + headR * 0.62, 0);
  return [body, head];
}

/** A pole standing on its own base: spear shafts, staffs, frame legs. */
function shaft(length: number, radius: number, sides = 5): BufferGeometry {
  const pole = new CylinderGeometry(radius, radius * 1.12, length, sides, 1);
  pole.translate(0, length / 2, 0);
  return pole;
}

/** A point standing on its own base: spear and lance tips, helmets. */
function spike(radius: number, length: number, sides = 5): BufferGeometry {
  const cone = new ConeGeometry(radius, length, sides, 1);
  cone.translate(0, length / 2, 0);
  return cone;
}

/** A coin, axis up, centred on the origin. Shields and wheels, once turned. */
function disc(radius: number, thickness: number, sides = 7): BufferGeometry {
  return new CylinderGeometry(radius, radius, thickness, sides, 1);
}

/** A shield hanging on the left arm: a disc turned to face outward along −x. */
function shieldAt(
  radius: number,
  thickness: number,
  sides: number,
  tall: number,
  x: number,
  y: number,
): BufferGeometry {
  const shield = disc(radius, thickness, sides);
  shield.rotateZ(Math.PI / 2);
  shield.scale(1, tall, 0.86);
  shield.translate(x, y, 0.02);
  return shield;
}

/** A cartwheel: a disc turned so it rolls along x, at (x, y, z). */
function wheelAt(
  radius: number,
  thickness: number,
  x: number,
  y: number,
  z: number,
): BufferGeometry {
  const wheel = disc(radius, thickness, 7);
  wheel.rotateX(Math.PI / 2);
  wheel.translate(x, y, z);
  return wheel;
}

/** A box centred on (x, y, z), optionally leaned by `roll` radians about z. */
function slabAt(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  roll = 0,
): BufferGeometry {
  const box = new BoxGeometry(width, height, depth);
  if (roll !== 0) box.rotateZ(roll);
  box.translate(x, y, z);
  return box;
}

/**
 * A bow: a squashed torus arc, centred on the −x direction so the crescent
 * bulges away from the figure holding it.
 *
 * Four segments around the tube, which at this radius is a triangular string of
 * facets and reads as a carved stave rather than a wire. The arc is the whole
 * signature — an archer at forty pixels is a token with a crescent beside it.
 */
function bowArc(
  radius: number,
  tube: number,
  arc: number,
  x: number,
  y: number,
  segments = 7,
): BufferGeometry {
  const bow = new TorusGeometry(radius, tube, 4, segments, arc);
  bow.rotateZ(Math.PI - arc / 2);
  bow.scale(0.78, 1, 1);
  bow.translate(x, y, 0.02);
  return bow;
}

/**
 * A horse: box barrel, four stub legs, a cone neck and a box head.
 *
 * Painted in the accent ink rather than the player's, which is what lets the
 * small rider on top carry the ownership colour — a fully player-coloured horse
 * is a large blob of team colour with a smaller blob on it, and the rider stops
 * registering as a rider.
 *
 * Returns the saddle height so the rider can be built to land exactly on the
 * class's total height, however the horse's proportions are retuned.
 */
function miniHorse(
  height: number,
  baseTop: number,
  forward: number,
): { parts: BufferGeometry[]; saddleY: number; barrelLength: number } {
  const legH = height * 0.3;
  const barrelH = height * 0.17;
  const barrelL = height * 0.31;
  const barrelW = height * 0.135;
  const barrelY = baseTop + legH + barrelH / 2;
  const parts: BufferGeometry[] = [];

  parts.push(slabAt(barrelL, barrelH, barrelW, forward, barrelY, 0));

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      // Four sides is the floor: a leg is two pixels wide and what it has to do
      // is be dark on one side, which four facets already manage.
      const leg = new CylinderGeometry(height * 0.022, height * 0.026, legH, 4, 1);
      leg.translate(forward + sx * barrelL * 0.36, baseTop + legH / 2, sz * barrelW * 0.34);
      parts.push(leg);
    }
  }

  const neckLean = 0.42;
  const neckH = height * 0.2;
  const neck = spike(height * 0.058, neckH, 5);
  neck.rotateZ(-neckLean);
  const neckX = forward + barrelL * 0.4;
  const neckY = barrelY + barrelH * 0.24;
  neck.translate(neckX, neckY, 0);
  parts.push(neck);

  const headL = height * 0.125;
  parts.push(
    slabAt(
      headL,
      height * 0.062,
      height * 0.058,
      neckX + Math.sin(neckLean) * neckH + headL * 0.3,
      neckY + Math.cos(neckLean) * neckH,
      0,
      -0.3,
    ),
  );

  return { parts, saddleY: barrelY + barrelH * 0.42, barrelLength: barrelL };
}

// --- the roster ------------------------------------------------------------

/** Warrior: token, round shield on the arm, short axe in the hand. */
export const warriorMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const h = spec.height - t;
  const r = spec.tokenRadius;
  const lean = 0.18;
  const haftH = h * 0.5;
  const mini = new Mini().add('body', miniBase(spec), ...miniToken(h, r, t));

  mini.add('wood', shieldAt(r * 1.15, 0.032, 7, 1, -r * 1.02, t + h * 0.5));

  const haft = shaft(haftH, 0.021);
  haft.rotateZ(-lean);
  haft.translate(r * 0.92, t + h * 0.3, 0.03);
  mini.add('wood', haft);
  mini.add(
    'metal',
    slabAt(
      0.085,
      0.075,
      0.026,
      r * 0.92 + Math.sin(lean) * haftH,
      t + h * 0.3 + Math.cos(lean) * haftH,
      0.03,
      -lean,
    ),
  );
  return mini.build();
};

/** Scout: a slighter token with a walking staff and a bedroll across its back. */
export const scoutMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const h = spec.height - t;
  const r = spec.tokenRadius * 0.88;
  const mini = new Mini().add('body', miniBase(spec), ...miniToken(h * 0.97, r, t));

  const staff = shaft(h * 0.99, 0.017);
  staff.rotateZ(-0.05);
  staff.translate(r * 1.15, t, 0.04);
  mini.add('wood', staff);

  const roll = new CylinderGeometry(0.046, 0.046, 0.17, 6, 1);
  roll.rotateZ(Math.PI / 2);
  roll.translate(0, t + h * 0.66, -0.07);
  mini.add('accent', roll);
  return mini.build();
};

/** Settler: token, a two-wheeled handcart, and the bundle it is carrying. */
export const settlerMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const h = spec.height - t;
  const cartX = -spec.baseRadius * 0.66;
  const mini = new Mini().add(
    'body',
    miniBase(spec),
    ...miniToken(h * 0.99, spec.tokenRadius, t),
  );

  mini.add(
    'wood',
    slabAt(0.19, 0.105, 0.15, cartX, t + 0.09, 0),
    wheelAt(0.058, 0.024, cartX, t + 0.058, 0.085),
    wheelAt(0.058, 0.024, cartX, t + 0.058, -0.085),
  );
  mini.add('accent', slabAt(0.14, 0.095, 0.115, cartX, t + 0.19, 0));
  return mini.build();
};

/**
 * Worker: the settler's token stripped of its cart, shouldering a mallet.
 *
 * Built from the kit and nothing new — the same token at the same height, the
 * warrior's haft-and-head construction turned upright and squared off. That is
 * deliberate: the worker class has no unit type standing on it yet (see
 * `ModelClass`), so it must not cost a sculpting session to exist. What
 * separates it from the settler beside it is that the settler is *carrying its
 * home* and the worker is *carrying a tool*, which is one blocky head at the
 * top of a stick and reads at forty pixels.
 */
export const workerMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const h = spec.height - t;
  const r = spec.tokenRadius;
  const mini = new Mini().add('body', miniBase(spec), ...miniToken(h * 0.98, r, t));

  // Upright over the shoulder rather than raked out at an angle: a mallet held
  // level is a weapon, and this figure must never be mistaken for the melee
  // class it stands next to.
  const haftH = h * 0.62;
  const x = r * 1.0;
  const haft = shaft(haftH, 0.02);
  haft.translate(x, t + h * 0.28, 0.035);
  mini.add('wood', haft);
  mini.add(
    'metal',
    slabAt(0.055, 0.075, 0.11, x, t + h * 0.28 + haftH, 0.035),
  );
  return mini.build();
};

/**
 * Where a caravan's pack sits, and how big it is.
 *
 * One table read by both trader sculpts, because the *only* thing that separates
 * them is a gilt box on top of this one, and a bale that floated because
 * somebody nudged the pack and not its twin would be the whole point of the
 * variant thrown away. Everything is in world units, measured from the top of
 * the base disc.
 */
const TRADER_PACK = {
  width: 0.155,
  height: 0.215,
  depth: 0.11,
  /** Off centre toward the near-left shoulder, and behind the token. */
  x: -0.055,
  z: -0.095,
  /** Height of the pack's *centre*, as a fraction of the figure's own height. */
  atHeight: 0.55,
  strap: { width: 0.175, height: 0.03, depth: 0.035, lift: 0.045 },
  bale: { width: 0.115, height: 0.08, depth: 0.09 },
} as const;

/**
 * Trader: the worker's token carrying a squared pack instead of a tool.
 *
 * A civilian on foot, which is why the roster row is `modelClass: 'worker'` and
 * why it must not simply *be* the worker: at forty pixels the difference between
 * two figures has to be a difference in the silhouette, and "the worker, plus a
 * lump" is not one. So the mallet comes off — a caravan carries no tool — and
 * what replaces it is a burden on the back, squared and shoulder-high, breaking
 * the outline on the opposite side from the one the worker breaks it on. The
 * two stand next to each other on a road and read as two things.
 *
 * It stays inside the kit: base, token, three boxes. Nothing new was cut for it,
 * which is the same bargain `workerMini` made a milestone before its own unit
 * existed.
 */
export const traderMini: MiniFactory = (spec) => addTraderPack(traderBody(spec), spec).build();

/**
 * The same caravan, laden: one gilt bale roped on top of the pack.
 *
 * A *second sculpt* rather than a second instance over the first one's matrix,
 * which is the arrangement a great work's gold takes (`improvements3d.ts`). The
 * two are not interchangeable and this is the case that wants the other one: a
 * piece is placed, turned, hidden, walked and toppled as one object, so a bale
 * carried as a separate instance would have to be threaded through every one of
 * those paths — the walking copy, the falling copy, the hide — and would come
 * apart from its trader the first time somebody forgot one. A merged geometry
 * with a fourth ink role is one bucket, one draw and one thing that cannot
 * separate. The gilt is the whole message: a caravan with a route on it is
 * *carrying something*, and that has to be legible from across the table without
 * clicking the piece.
 *
 * Which trader wears which is `MINI_SCULPTS[…].laden` and `unitSculpt` in
 * `board3d.ts`, off the presence of `Unit.trade` — and it is why `trade` had to
 * join the piece fingerprint (`signUnits`).
 */
export const traderLadenMini: MiniFactory = (spec) => {
  const mini = traderBody(spec);
  const t = spec.baseThickness;
  const h = spec.height - t;
  const packY = t + h * TRADER_PACK.atHeight;
  const bale = TRADER_PACK.bale;
  mini.add(
    'gilt',
    slabAt(
      bale.width,
      bale.height,
      bale.depth,
      TRADER_PACK.x,
      packY + TRADER_PACK.height / 2 + bale.height / 2,
      TRADER_PACK.z,
    ),
  );
  return addTraderPack(mini, spec).build();
};

/** The figure both caravans stand on: the worker's token, and nothing else. */
function traderBody(spec: MiniSpec): Mini {
  const t = spec.baseThickness;
  const h = spec.height - t;
  return new Mini().add('body', miniBase(spec), ...miniToken(h * 0.98, spec.tokenRadius, t));
}

/**
 * Adds the pack and its strap to a caravan.
 *
 * Both variants go through it and neither may inline it: the bale is placed off
 * `TRADER_PACK` too, so a pack nudged in one factory and not the other would
 * leave a gilt box hanging in the air beside the burden it is supposed to be
 * roped to. Returns the `Mini` rather than the built piece so a caller can go on
 * adding — which the laden one does not need today and the next variant will.
 */
function addTraderPack(mini: Mini, spec: MiniSpec): Mini {
  const t = spec.baseThickness;
  const h = spec.height - t;
  const packY = t + h * TRADER_PACK.atHeight;
  mini.add(
    'wood',
    slabAt(
      TRADER_PACK.width,
      TRADER_PACK.height,
      TRADER_PACK.depth,
      TRADER_PACK.x,
      packY,
      TRADER_PACK.z,
    ),
  );
  const strap = TRADER_PACK.strap;
  mini.add(
    'accent',
    slabAt(
      strap.width,
      strap.height,
      strap.depth,
      TRADER_PACK.x,
      packY + strap.lift,
      TRADER_PACK.z + TRADER_PACK.depth / 2,
    ),
  );
  return mini;
}

/**
 * Prophet: the augur's figure, with a gilt rim and a taller staff.
 *
 * The augur stands on the plain `worker` sculpt and should — a figure on foot
 * with a bundle — and the prophet must not, for `traderMini`'s stated reason: at
 * forty pixels the difference between two pieces has to be a difference in the
 * *silhouette*, and "the augur, but more important" is not one. It is also the
 * pair that most needs telling apart, because the two are bought out of the same
 * bank at very different prices and do completely different things with their
 * charges.
 *
 * Two marks, and they are the two the ratified sculpt names:
 *
 *   the staff  taller than any other civilian carries and standing *clear of the
 *              head*, which is the whole of the silhouette change. The worker's
 *              mallet stops at shoulder height and the scout's stick at the
 *              crown; this one breaks the outline above the figure, so a prophet
 *              is the tallest thing on a hex full of civilians.
 *   the rim    a gilt ring at the staff's head. Gold is the board's scarcest
 *              ink — "built once, by somebody irreplaceable" — and the roster
 *              already spends it on the laden caravan's bale for exactly this
 *              purpose: one bright note on a shape that is otherwise its
 *              neighbour's. A prophet is called once per empire's religion and
 *              founds it; if anything on the unit roster has earned the note,
 *              it is this.
 *
 * The mallet comes off, like the caravan's: a prophet carries no tool. Nothing
 * new was cut for it — base, token, a shaft, a disc and a small bar — which is
 * the bargain every sculpt in this file makes.
 */
export const prophetMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const h = spec.height - t;
  const r = spec.tokenRadius;
  const mini = new Mini().add('body', miniBase(spec), ...miniToken(h * 0.98, r, t));

  // Held at the side, upright and plumb: a raked staff reads as a spear, and
  // this figure stands beside the melee class on a road.
  const staffH = h * 1.24;
  const x = r * 1.05;
  const staff = shaft(staffH, 0.019);
  staff.translate(x, t, 0.03);
  mini.add('wood', staff);

  // The rim: a ring standing in the staff's own plane, so it is a circle from
  // the camera rather than an edge-on line. `disc` lies flat by default, so it
  // is turned upright the way a shield is.
  const rim = disc(0.052, 0.016, 9);
  rim.rotateX(Math.PI / 2);
  rim.translate(x, t + staffH, 0.03);
  mini.add('gilt', rim);
  return mini.build();
};

/**
 * The boat's proportions, as fractions of the kit it is cut from.
 *
 * `TRADER_PACK`'s shape and its reason: one table, so that nudging the hull
 * moves the mast standing in it and the sail hanging off that. Lengths across
 * the hull are fractions of `baseRadius` (the boat is a thing the base disc
 * carries, and it must not overhang its own stack slot); heights are fractions
 * of the figure's height above the disc.
 */
const BOAT = {
  hull: { height: 0.2, long: 1.28, beam: 0.68 },
  /**
   * How far the whole boat is shifted astern, so the *silhouette* is centred on
   * the base disc rather than the hull being centred and the bow hanging out
   * over one side. The prow only grows forward, so a boat built about the origin
   * is a boat that stands crooked on its own plinth.
   */
  aft: -0.27,
  /** The bow cone, which is what makes a tub read as a boat from above. */
  prow: { radius: 0.44, length: 0.58, drop: 0.62 },
  /** Where the mast stands, aft of centre, and how thick it is. */
  mast: { x: -0.14, radius: 0.028, foot: 0.72 },
  /** The square sail and the yard it hangs from, both across the hull's length. */
  sail: { width: 1.5, height: 0.52, thickness: 0.035, at: 0.5 },
  yard: { width: 1.7, thickness: 0.055, at: 0.8 },
} as const;

/**
 * A boat: one hull for every class, with the seat's colour in the sail.
 *
 * The sculpt a piece takes when it is standing on water it embarked onto (Entry
 * XXVII; `unitSculpt` in `board3d.ts` is where the choice is made). It is the
 * caravan's bargain one step further and the difference is worth stating: a
 * laden trader is *that unit* carrying something, so it keeps the trader's body.
 * A piece at sea is not the unit doing something — it is the unit somewhere the
 * unit cannot stand, and a settler's handcart floating on the waves is a picture
 * of a bug. So the body goes entirely and one generic hull replaces it, for
 * every class that can ever be out there.
 *
 * Which leaves the obvious question, and the badge is the answer: the floating
 * tag over a piece is already the board's one sentence about what it is
 * (`badges3d.ts`), it is drawn from `badgeClassFor(unit.type)` and it does not
 * know or care what the piece below it is sculpted as. So a settler at sea is a
 * boat under a tent badge and a worker at sea is a boat under a hammer, with no
 * work here and no second roster of nautical silhouettes to draw. That is the
 * whole reason there is one boat rather than five.
 *
 * Cut at the `foot` height like everything that can embark today — embarkation
 * is civilians-only in v1 (`MoveProfile.embarks`) and every civilian row is
 * `foot`. If a navy ever arrives, the boat's height stops being a detail and
 * `pieceHeightFor`'s "ask the type" rule is what will need re-reading, because a
 * catapult's tag would hang well above this mast.
 */
export const boatMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const h = spec.height - t;
  const r = spec.baseRadius;
  const mini = new Mini().add('body', miniBase(spec));
  const aft = r * BOAT.aft;

  // A flared tub, closed top and bottom, then stretched fore-and-aft. A lathe
  // rather than boxes because the seven facets are the same turned look the
  // whole roster is cut with — a boxed hull would be the one piece on the board
  // that had obviously been assembled rather than turned.
  const hullH = h * BOAT.hull.height;
  const hull = lathe([
    [0, 0],
    [r * 0.58, 0],
    [r * 0.86, hullH * 0.5],
    [r * 0.94, hullH],
    [0, hullH],
  ]);
  hull.scale(BOAT.hull.long, 1, BOAT.hull.beam);
  hull.translate(aft, t, 0);
  mini.add('wood', hull);

  // The bow: a cone laid on its side, squashed so it is a stem rather than a
  // spike. Without it the silhouette from the ortho camera is a lozenge, which
  // reads as a barrel; with it there is a pointed end and the piece has a
  // heading even though nothing on this board asks which way a boat faces.
  const prow = spike(r * BOAT.prow.radius, r * BOAT.prow.length, 5);
  prow.rotateZ(-Math.PI / 2);
  prow.scale(1, BOAT.prow.drop, BOAT.hull.beam);
  prow.translate(aft + r * BOAT.hull.long * 0.9, t + hullH * 0.52, 0);
  mini.add('wood', prow);

  const mastFoot = t + hullH * BOAT.mast.foot;
  const mastLength = spec.height - mastFoot;
  const mast = shaft(mastLength, r * BOAT.mast.radius);
  mast.translate(aft + r * BOAT.mast.x, mastFoot, 0);
  mini.add('wood', mast);

  const yard = slabAt(
    r * BOAT.yard.width,
    r * BOAT.yard.thickness,
    r * BOAT.yard.thickness,
    aft + r * BOAT.mast.x,
    mastFoot + mastLength * BOAT.yard.at,
    0,
  );
  mini.add('wood', yard);

  // The sail is the only element in the seat's own ink, and that is the whole
  // colour budget of the piece: a hull painted in team colour would be a large
  // blob of it with a smaller blob of rigging on top — `miniHorse`'s argument,
  // and the same answer. The sail is also the largest flat face on the sculpt
  // and the one square-on to the ortho camera, so it is where a colour is
  // actually read from across the table.
  mini.add(
    'body',
    slabAt(
      r * BOAT.sail.width,
      mastLength * BOAT.sail.height,
      r * BOAT.sail.thickness,
      aft + r * BOAT.mast.x,
      mastFoot + mastLength * BOAT.sail.at,
      0,
    ),
  );
  return mini.build();
};

/** Archer: token with a self bow held at the side and a quiver on the back. */
export const archerMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const h = spec.height - t;
  const r = spec.tokenRadius * 0.94;
  const mini = new Mini().add('body', miniBase(spec), ...miniToken(h, r, t));

  mini.add('wood', bowArc(h * 0.3, 0.016, Math.PI * 1.05, -r * 0.72, t + h * 0.55));
  mini.add('accent', slabAt(0.05, 0.17, 0.05, r * 0.78, t + h * 0.62, -0.06, 0.3));
  return mini.build();
};

/**
 * Composite bowman: the archer's bow grown into a recurve — a wider arc with
 * two tips flicked back the other way.
 *
 * The tips are the point of the sculpt. A composite bow is a bigger bow, and a
 * bigger bow alone would read as "the archer, slightly wrong"; the reversed
 * ends are a shape the archer does not have.
 */
export const compositeBowmanMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const h = spec.height - t;
  const r = spec.tokenRadius * 0.94;
  const mini = new Mini().add('body', miniBase(spec), ...miniToken(h, r, t));

  const arc = Math.PI * 0.9;
  const bowR = h * 0.34;
  const centerX = -r * 0.66;
  const centerY = t + h * 0.56;
  mini.add('wood', bowArc(bowR, 0.018, arc, centerX, centerY, 6));

  // The arc runs from (π − arc/2) to (π + arc/2) after `bowArc` turns it; the
  // tips sit on those two ends, angled a little further round than the tangent.
  for (const end of [-1, 1]) {
    const angle = Math.PI + (end * arc) / 2;
    const tip = spike(0.019, h * 0.13, 4);
    tip.rotateZ(angle + (end > 0 ? 0.5 : Math.PI - 0.5));
    tip.translate(centerX + Math.cos(angle) * bowR * 0.78, centerY + Math.sin(angle) * bowR, 0.02);
    mini.add('wood', tip);
  }
  mini.add('accent', slabAt(0.05, 0.17, 0.05, r * 0.78, t + h * 0.62, -0.06, 0.3));
  return mini.build();
};

/** Crossbowman: token with a small horizontal T — a prod across a stock. */
export const crossbowmanMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const h = spec.height - t;
  const r = spec.tokenRadius * 0.96;
  const mini = new Mini().add('body', miniBase(spec), ...miniToken(h, r, t));

  const armY = t + h * 0.6;
  mini.add(
    'wood',
    slabAt(0.22, 0.022, 0.03, 0, armY, 0.085),
    slabAt(0.038, 0.038, 0.18, 0, armY, -0.005),
  );
  mini.add('metal', slabAt(0.055, 0.032, 0.038, 0, armY - 0.012, -0.06));
  return mini.build();
};

/** Spearman: token behind a tall spear, with an oval shield on the other arm. */
export const spearmanMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const h = spec.height - t;
  const r = spec.tokenRadius;
  const mini = new Mini().add('body', miniBase(spec), ...miniToken(h * 0.86, r, t));

  const tipH = h * 0.14;
  const shaftH = h - tipH;
  const x = r * 0.98;
  const spearShaft = shaft(shaftH, 0.019);
  spearShaft.translate(x, t, 0.03);
  mini.add('wood', spearShaft);

  const tip = spike(0.032, tipH, 5);
  tip.translate(x, t + shaftH, 0.03);
  mini.add('metal', tip);

  mini.add('wood', shieldAt(0.098, 0.03, 7, 1.4, -r * 1.0, t + h * 0.44));
  return mini.build();
};

/**
 * Pikeman: the spearman's line grown up — a longer pike raked back over the
 * shoulder, a taller stance, a helmet, and no shield at all.
 *
 * Dropping the shield is deliberate. Two polearm silhouettes standing next to
 * each other have to differ by more than length, and "one has a shield, one has
 * both hands on the shaft" is a difference that survives forty pixels.
 */
export const pikemanMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const h = spec.height - t;
  const r = spec.tokenRadius * 1.02;
  const lean = 0.11;
  const mini = new Mini().add('body', miniBase(spec), ...miniToken(h * 0.9, r, t));

  const tipH = h * 0.15;
  const shaftH = (h - tipH * Math.cos(lean)) / Math.cos(lean);
  const x = r * 1.02;
  const pike = shaft(shaftH, 0.019);
  pike.rotateZ(lean);
  pike.translate(x, t, 0.03);
  mini.add('wood', pike);

  const tip = spike(0.03, tipH, 5);
  tip.rotateZ(lean);
  tip.translate(x - Math.sin(lean) * shaftH, t + Math.cos(lean) * shaftH, 0.03);
  mini.add('metal', tip);

  const headR = r * 0.56;
  mini.add('metal', spike(headR * 1.06, headR * 1.1, 6).translate(0, t + h * 0.9 - headR * 0.5, 0));
  return mini.build();
};

/** Swordsman: token with an upright sword and a kite shield. */
export const swordsmanMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const h = spec.height - t;
  const r = spec.tokenRadius;
  const x = r * 1.0;
  const guardY = t + h * 0.5;
  const bladeH = h * 0.34;
  const mini = new Mini().add('body', miniBase(spec), ...miniToken(h, r, t));

  mini.add(
    'metal',
    slabAt(0.05, bladeH, 0.022, x, guardY + bladeH / 2, 0.03),
    slabAt(0.115, 0.028, 0.032, x, guardY, 0.03),
  );
  mini.add('wood', slabAt(0.034, 0.075, 0.034, x, guardY - 0.045, 0.03));
  // Five sides, point down: a kite shield is a disc that lost an argument.
  mini.add('wood', shieldAt(0.1, 0.028, 5, 1.3, -r * 1.0, t + h * 0.48));
  return mini.build();
};

/** Longswordsman: a longer blade held in both hands, and no shield to hide it. */
export const longswordsmanMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const h = spec.height - t;
  const r = spec.tokenRadius * 1.04;
  const guardY = t + h * 0.45;
  const bladeH = h * 0.48;
  const mini = new Mini().add('body', miniBase(spec), ...miniToken(h, r, t));

  mini.add(
    'metal',
    slabAt(0.062, bladeH, 0.026, 0, guardY + bladeH / 2, 0.075),
    slabAt(0.155, 0.032, 0.036, 0, guardY, 0.075),
  );
  const pommel = new IcosahedronGeometry(0.032, 0);
  pommel.translate(0, guardY - 0.105, 0.075);
  mini.add('metal', pommel);
  mini.add('wood', slabAt(0.036, 0.1, 0.036, 0, guardY - 0.052, 0.075));
  return mini.build();
};

/** Horseman: a bare horse with a small rider in the player's colour. */
export const horsemanMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const horse = miniHorse(spec.height, t, -spec.height * 0.045);
  const mini = new Mini()
    .add('body', miniBase(spec))
    .add('accent', ...horse.parts)
    .add('body', ...miniToken(spec.height - horse.saddleY, spec.tokenRadius * 0.8, horse.saddleY));
  return mini.build();
};

/** Knight: the horseman in barding, with a lance couched over the horse's neck. */
export const knightMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const forward = -spec.height * 0.045;
  const horse = miniHorse(spec.height, t, forward);
  const mini = new Mini()
    .add('body', miniBase(spec))
    .add('accent', ...horse.parts)
    .add('body', ...miniToken(spec.height - horse.saddleY, spec.tokenRadius * 0.82, horse.saddleY));

  // The barding is a skirt, not a blanket: a cone hung around the barrel and
  // stretched along it, which covers the gap between the legs — the one place a
  // box-and-sticks horse looks most like a box and sticks.
  const barding = spike(spec.height * 0.15, spec.height * 0.2, 6);
  barding.scale(horse.barrelLength / (spec.height * 0.22), 1, 0.66);
  barding.translate(forward, t + spec.height * 0.17, 0);
  mini.add('metal', barding);

  const lean = 0.7;
  const lanceH = spec.height * 0.38;
  const lanceX = forward + spec.height * 0.07;
  const lanceY = horse.saddleY + spec.height * 0.08;
  const lance = shaft(lanceH, 0.021);
  lance.rotateZ(-lean);
  lance.translate(lanceX, lanceY, 0.075);
  mini.add('wood', lance);
  const point = spike(0.026, spec.height * 0.12, 5);
  point.rotateZ(-lean);
  point.translate(
    lanceX + Math.sin(lean) * lanceH,
    lanceY + Math.cos(lean) * lanceH,
    0.075,
  );
  mini.add('metal', point);
  return mini.build();
};

/**
 * War chariot: horse in front, a two-wheeled car behind, a driver standing in
 * it, and a standard flying from the rail.
 *
 * The standard is doing structural work, not decoration. A driver tall enough to
 * reach the mounted class's height would tower over his own horse; a short
 * driver with a pennant above him reaches it and still reads as a man in a cart.
 */
export const chariotMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const forward = spec.height * 0.1;
  const horse = miniHorse(spec.height * 0.92, t, forward);
  const carX = -spec.baseRadius * 0.78;
  const floorY = t + spec.height * 0.11;
  const mini = new Mini().add('body', miniBase(spec)).add('accent', ...horse.parts);

  mini.add(
    'wood',
    slabAt(0.17, 0.13, 0.2, carX, floorY - 0.03, 0),
    wheelAt(0.088, 0.028, carX, t + 0.088, 0.115),
    wheelAt(0.088, 0.028, carX, t + 0.088, -0.115),
  );
  mini.add('body', ...miniToken(spec.height * 0.6, spec.tokenRadius * 0.82, floorY));

  const poleX = carX - 0.03;
  const poleH = spec.height - floorY;
  const pole = shaft(poleH, 0.016);
  pole.translate(poleX, floorY, -0.05);
  mini.add('wood', pole);
  mini.add('accent', slabAt(0.12, 0.075, 0.014, poleX + 0.065, floorY + poleH * 0.86, -0.05));
  return mini.build();
};

/**
 * Catapult: a wheeled timber frame with an arm thrown forward.
 *
 * Built wide rather than tall, which is the whole reason the siege class exists.
 * A machine on a board reads as a machine because it is *low and long* next to
 * the figures — the moment it matches their height it becomes a building.
 */
export const catapultMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const H = spec.height;
  const railY = t + H * 0.148;
  const pivotY = t + H * 0.424;
  const armLean = 0.44;
  const armH = H * 0.54;
  const pivotX = -H * 0.154;
  // Longer than it is tall, and longer than its own base: a siege engine is a
  // *vehicle*, and the one thing that stops it reading as a hut is that it
  // overhangs the disc the infantry stand neatly inside.
  const frame = H * 1.03;
  const mini = new Mini().add('body', miniBase(spec));

  mini.add(
    'wood',
    slabAt(frame, 0.045, 0.045, 0, railY, 0.115),
    slabAt(frame, 0.045, 0.045, 0, railY, -0.115),
    slabAt(0.05, 0.045, 0.235, frame / 2 - 0.05, railY, 0),
    slabAt(0.05, 0.045, 0.235, -frame / 2 + 0.05, railY, 0),
    slabAt(0.05, H * 0.276, 0.05, pivotX, (railY + pivotY) / 2, 0.105),
    slabAt(0.05, H * 0.276, 0.05, pivotX, (railY + pivotY) / 2, -0.105),
    wheelAt(H * 0.128, 0.032, H * 0.3, t + H * 0.128, 0.15),
    wheelAt(H * 0.128, 0.032, H * 0.3, t + H * 0.128, -0.15),
  );

  const arm = new BoxGeometry(0.05, armH, 0.05);
  arm.translate(0, armH / 2, 0);
  arm.rotateZ(-armLean);
  arm.translate(pivotX, pivotY, 0);
  mini.add('wood', arm);
  mini.add(
    'metal',
    slabAt(
      0.08,
      0.062,
      0.08,
      pivotX + Math.sin(armLean) * armH,
      pivotY + Math.cos(armLean) * armH - 0.02,
      0,
    ),
  );
  return mini.build();
};

/**
 * Trebuchet: an A-frame with a long arm over it and a counterweight hanging off
 * the short end.
 *
 * Taller than the catapult on purpose — it is the same idea done bigger, and the
 * upgrade has to be visible from across the board — but it earns the height with
 * a raised arm rather than by growing the machine.
 */
export const trebuchetMini: MiniFactory = (spec) => {
  const t = spec.baseThickness;
  const H = spec.height;
  const legH = H * 0.56;
  const legLean = 0.2;
  const pivotY = t + 0.05 + legH * Math.cos(legLean);
  const armLean = Math.acos(Math.min(1, (H - pivotY) / (H * 0.46)));
  const mini = new Mini().add('body', miniBase(spec));

  mini.add('wood', slabAt(H * 0.52, 0.05, 0.2, 0, t + 0.025, 0));
  for (const side of [-1, 1]) {
    const leg = new BoxGeometry(0.05, legH, 0.05);
    leg.translate(0, legH / 2, 0);
    leg.rotateZ(side * legLean);
    leg.translate(side * H * 0.115, t + 0.05, 0);
    mini.add('wood', leg);
  }
  mini.add('wood', slabAt(0.06, 0.05, 0.24, 0, pivotY, 0));

  // The arm is one box straddling the pivot: a long throwing end and a short
  // butt, which is what makes a trebuchet a trebuchet rather than a see-saw.
  const long = H * 0.46;
  const short = H * 0.3;
  const arm = new BoxGeometry(0.05, long + short, 0.05);
  arm.translate(0, (long - short) / 2, 0);
  arm.rotateZ(armLean);
  arm.translate(0, pivotY, 0);
  mini.add('wood', arm);
  mini.add(
    'metal',
    slabAt(
      0.11,
      0.12,
      0.11,
      Math.sin(armLean) * short,
      pivotY - Math.cos(armLean) * short - 0.06,
      0,
    ),
  );
  return mini.build();
};

/**
 * The foot a paper standee stands in: a flattened disc, a narrower collar on
 * top of it, and the little clip the card slots into.
 *
 * The billboard units are printed art, and printed art on a table has to be
 * *stood up* by something. Without a foot a billboard is a decal hovering over a
 * hex; with one it is a die-cut figure in a base, which is a thing that exists
 * and that the eye already knows how to read. That is the entire cohesion
 * argument for this shape, and it is why it replaced the flat player-colour ring
 * that used to be here: a ring is a decal about a decal.
 *
 * Elliptical rather than round, squashed along z, because the card is a plane
 * and its foot is a plane's foot — a circular base under a flat figure reads as
 * a coin the figure is balancing on. The long axis is +x, which is the card's
 * own left-to-right, and the caller yaws the whole thing to match (see
 * `buildSpriteUnit`).
 *
 * Everything is merged into one geometry in one colour: the base is the
 * player's ink and it needs to read as one object at four pixels across, which
 * is the actual test a piece of ownership signalling has to pass.
 */
export function standeeBase(spec: {
  radius: number;
  thickness: number;
  squash: number;
  collarScale: number;
  collarThickness: number;
  tabWidth: number;
  tabHeight: number;
  tabThickness: number;
}): BufferGeometry {
  // Ten sides, not six: this sits on a hexagonal tile and a hexagonal foot on a
  // hexagonal tile locks visually to the grid, which is the opposite of what a
  // loose game piece should do.
  const disc = new CylinderGeometry(spec.radius, spec.radius * 1.08, spec.thickness, 10, 1);
  disc.translate(0, spec.thickness / 2, 0);
  disc.scale(1, 1, spec.squash);

  const collarR = spec.radius * spec.collarScale;
  const collar = new CylinderGeometry(collarR, collarR * 1.05, spec.collarThickness, 10, 1);
  collar.translate(0, spec.thickness + spec.collarThickness / 2, 0);
  collar.scale(1, 1, spec.squash * 0.92);

  const shelf = spec.thickness + spec.collarThickness;
  const tab = new BoxGeometry(spec.tabWidth, spec.tabHeight, spec.tabThickness);
  tab.translate(0, shelf + spec.tabHeight / 2, 0);

  const merged = merge([disc, collar, tab]);
  disc.dispose();
  collar.dispose();
  tab.dispose();
  return flatten(merged);
}

// --- cities ----------------------------------------------------------------

/**
 * One house of a city: a box with a four-sided pyramid roof.
 *
 * The same shape as the settler piece — deliberately, because a settler *is* a
 * town looking for somewhere to stand, and seeing the piece it carried become
 * one of the buildings it founded is the whole visual joke. It is built
 * separately rather than reusing `settlerPiece` because these are scattered at
 * town scale, several to a tile, rather than standing alone at piece scale.
 *
 * The roof is a separate geometry so the two can take different colours: a
 * cluster of one-tone blocks reads as a warehouse, and the roof line is what
 * makes it read as a village. `cityHouseRoof` returns the pyramid alone, built
 * at the height the body leaves off.
 */
export function cityHouseBody(spec: {
  width: number;
  depth: number;
  bodyH: number;
}): BufferGeometry {
  const body = new BoxGeometry(spec.width, spec.bodyH, spec.depth);
  body.translate(0, spec.bodyH / 2, 0);
  return flatten(body);
}

/** The pyramid roof that sits on a `cityHouseBody`. Origin at the house's base. */
export function cityHouseRoof(spec: {
  width: number;
  depth: number;
  bodyH: number;
  roofH: number;
}): BufferGeometry {
  // Four radial segments make a pyramid; the quarter turn squares it to the
  // box. The radius is the box's own half-diagonal plus a hair, so the roof
  // lands on its corners: a wider cone would be a fine eave at eye level, but
  // this camera looks down at 57° and any real overhang hides the walls
  // completely, leaving a flat dark plate where a house should be.
  const roof = new ConeGeometry(
    Math.hypot(spec.width / 2, spec.depth / 2) * 1.04,
    spec.roofH,
    4,
    1,
  );
  roof.rotateY(Math.PI / 4);
  roof.translate(0, spec.bodyH + spec.roofH / 2, 0);
  return flatten(roof);
}

/**
 * The Æra II house's roof: a **gable** rather than the pyramid a hut wears.
 *
 * The whole of "a city that has aged", in one edge. A pyramid roof is four
 * triangles meeting at a point and reads, from this camera, as a cone on a box —
 * a shelter. A gable has a *ridge*, and a ridge is a thing a carpenter cut: it
 * is the oldest visual shorthand there is for a building somebody framed rather
 * than piled up, and it costs two more triangles.
 *
 * Built by extruding the end profile along the house's width, so the ridge runs
 * along the house's long axis and the two eaves overhang by `eave` — an eave
 * is what stops the roof reading as a lid, and at this camera angle a small one
 * is all that fits before the walls disappear under it (see `cityHouseRoof` for
 * the same finding from the other side).
 */
export function cityGableRoof(spec: {
  width: number;
  depth: number;
  bodyH: number;
  roofH: number;
  eave: number;
}): BufferGeometry {
  const halfDepth = spec.depth / 2 + spec.eave;
  const roof = extrudeProfile(
    [
      [0, -halfDepth],
      [0, halfDepth],
      [spec.roofH, 0],
    ],
    spec.width + spec.eave * 2,
  );
  roof.translate(0, spec.bodyH, 0);
  return flatten(roof);
}

/**
 * One stake of a palisade: a post with a sharpened head.
 *
 * Stakes, not stone — the Æra II wall is a *palisade*, and the difference has to
 * be legible from across the table or the two ages of wall are one grey ring.
 * The point is what does it: a flat-topped post at this size is a fence rail,
 * while a sharpened one reads as a defence even when it is nine pixels tall.
 *
 * Five sides for `bannerPole`'s reason: at this radius the facets are invisible
 * and the flat shading gives every stake a lit side and a dark side, which is
 * what keeps a ring of them from smearing into one band.
 */
export function palisadeStake(spec: {
  radius: number;
  height: number;
  point: number;
}): BufferGeometry {
  const shaft = new CylinderGeometry(spec.radius, spec.radius * 1.1, spec.height, 5, 1);
  shaft.translate(0, spec.height / 2, 0);
  const head = new ConeGeometry(spec.radius, spec.point, 5, 1);
  head.translate(0, spec.height + spec.point / 2, 0);
  return weld([shaft, head]);
}

/**
 * One segment of an Æra III stone wall: a crenellated block lying along x.
 *
 * Six of these make a ring, one on each edge of the hex, which is why the
 * segment is built along x and centred on its own middle — `edgeYaw` turns it
 * onto its edge exactly as a river ribbon or a border band is turned.
 *
 * The merlons are three boxes on top rather than a notched profile, because a
 * profile extruded along the wall would run the notches the *wrong way* (a
 * crenellation is a gap along the wall's length, not through its thickness), and
 * three boxes is the cheapest thing that is actually the shape. They are what
 * carries "stone" at a glance: the palisade's silhouette is a comb of points and
 * this one is a square-toothed band, and no zoom confuses the two.
 */
export function cityWallSegment(spec: {
  length: number;
  height: number;
  thickness: number;
  merlonH: number;
  merlons: number;
}): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const wall = new BoxGeometry(spec.length, spec.height, spec.thickness);
  wall.translate(0, spec.height / 2, 0);
  parts.push(wall);

  const count = Math.max(0, Math.round(spec.merlons));
  // The teeth and the gaps are the same width, which is what a crenellation is:
  // `count` merlons and `count - 1` embrasures share the run, so the block at
  // each end is a merlon and the wall never ends on a hole.
  const step = count > 1 ? spec.length / (count * 2 - 1) : spec.length;
  for (let i = 0; i < count; i++) {
    const merlon = new BoxGeometry(step, spec.merlonH, spec.thickness);
    merlon.translate(
      -spec.length / 2 + step / 2 + i * step * 2,
      spec.height + spec.merlonH / 2,
      0,
    );
    parts.push(merlon);
  }
  return weld(parts);
}

/**
 * The shrine: a stepped plinth with a finial standing on it.
 *
 * Two steps and a needle, and nothing else. A shrine has to be the *smallest*
 * distinct building in the town — smaller than a house, or it stops reading as
 * the thing a village put up beside its houses — so it cannot afford a
 * silhouette with parts. What it can afford is a *profile* nothing else on the
 * board has: everything else in a city is a box under a slope, and a stack that
 * steps inward and then rises to a point is unmistakable at nine pixels.
 *
 * The finial comes back separately (`cityShrineFinial`) so it can take the gilt,
 * which is what says "this one is holy" rather than "this one is small".
 */
export function cityShrine(spec: {
  width: number;
  stepH: number;
  taper: number;
}): BufferGeometry {
  const lower = new BoxGeometry(spec.width, spec.stepH, spec.width);
  lower.translate(0, spec.stepH / 2, 0);
  const upperW = spec.width * spec.taper;
  const upper = new BoxGeometry(upperW, spec.stepH, upperW);
  upper.translate(0, spec.stepH * 1.5, 0);
  return weld([lower, upper]);
}

/** The shrine's gilt needle, standing on top of `cityShrine`'s two steps. */
export function cityShrineFinial(spec: {
  width: number;
  stepH: number;
  taper: number;
  finialH: number;
}): BufferGeometry {
  const needle = new ConeGeometry(spec.width * spec.taper * 0.42, spec.finialH, 4, 1);
  needle.rotateY(Math.PI / 4);
  needle.translate(0, spec.stepH * 2 + spec.finialH / 2, 0);
  return flatten(needle);
}

/**
 * The temple: a ziggurat of stepped terraces.
 *
 * One clean shape, which was the brief and is also the only thing that works.
 * Columns were the other candidate and they lose at this scale for a measurable
 * reason: a colonnade is a rhythm of gaps about a fifth of a house wide, and at
 * game zoom the gaps close up into a solid block with a fuzzy top — a temple
 * that reads as a warehouse. A ziggurat's steps are *horizontal* edges, which
 * the toon ramp breaks on and the low sun draws a hard shadow line under, so it
 * stays legible all the way down to twenty pixels.
 *
 * `steps` terraces, each `taper` of the one below it. Built as boxes and welded,
 * so the whole thing is one instance and one draw whatever the count.
 */
export function cityTemple(spec: {
  width: number;
  stepH: number;
  steps: number;
  taper: number;
}): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const count = Math.max(1, Math.round(spec.steps));
  for (let i = 0; i < count; i++) {
    const width = spec.width * spec.taper ** i;
    const tier = new BoxGeometry(width, spec.stepH, width);
    tier.translate(0, spec.stepH * (i + 0.5), 0);
    parts.push(tier);
  }
  return weld(parts);
}

/**
 * The palace: a hall taller than any house, under a double-pitched roof.
 *
 * The capital's ✶ has had no counterpart in the world since the day the star was
 * added to the name, and this is it. Everything about the shape is chosen to be
 * *the same kind of thing* as a house and plainly a grade above it — a box under
 * a ridge, like every other building in the town, but half again as tall, twice
 * as long, and with the roof broken into two pitches so the profile has a step
 * in it. A different *kind* of building (a tower, a dome) would have read as a
 * wonder, and wonders are W3's, not this pass's.
 *
 * Returned in two pieces for the reason a house is: body and roof take two
 * colours, and the palace's roof is the one dark plane in the town.
 */
export function cityPalaceBody(spec: {
  width: number;
  depth: number;
  bodyH: number;
}): BufferGeometry {
  const body = new BoxGeometry(spec.width, spec.bodyH, spec.depth);
  body.translate(0, spec.bodyH / 2, 0);
  return flatten(body);
}

/**
 * The palace's roof: a low ridge over a broader skirt, extruded as one profile.
 *
 * The break between the two pitches is the whole point and is why this is not
 * `cityGableRoof` at a larger size: a single pitch tall enough to read from
 * across the table would be a barn, and the shallow-then-steep profile of a
 * hall's roof is what the eye reads as *important building*. One extrusion, so
 * the two pitches can never come apart.
 */
export function cityPalaceRoof(spec: {
  width: number;
  depth: number;
  bodyH: number;
  roofH: number;
  eave: number;
  skirt: number;
}): BufferGeometry {
  const half = spec.depth / 2 + spec.eave;
  const shoulder = spec.roofH * spec.skirt;
  const roof = extrudeProfile(
    [
      [0, -half],
      [0, half],
      [shoulder, half * 0.55],
      [spec.roofH, 0],
      [shoulder, -half * 0.55],
    ],
    spec.width + spec.eave * 2,
  );
  roof.translate(0, spec.bodyH, 0);
  return flatten(roof);
}

/**
 * The gilt finial on the palace's ridge: a small four-sided spike.
 *
 * The one piece of gold anywhere in the world layer, and it is deliberately
 * three pixels of it. Entry VII gives gilt to the *interface*; the argument for
 * letting one speck of it stand on the board is that the capital is the one
 * place the interface already puts a mark (the ✶ in the name) and the world has
 * had nothing to answer with.
 */
export function cityPalaceFinial(spec: {
  bodyH: number;
  roofH: number;
  size: number;
}): BufferGeometry {
  const spike = new ConeGeometry(spec.size * 0.5, spec.size * 2.2, 4, 1);
  spike.rotateY(Math.PI / 4);
  spike.translate(0, spec.bodyH + spec.roofH + spec.size * 1.1, 0);
  return flatten(spike);
}

/**
 * A **wonder**: an outsized stepped plinth, taller than anything else a town
 * has, under a gilt tip.
 *
 * The world's one permitted spectacle (`docs/art-pass.md`, W3), and deliberately
 * **one generic sculpt for every wonder** until the rows exist: the framework
 * that landed first has one placeholder row in it, and twenty-three sculpts for
 * twenty-three wonders nobody has ratified would be twenty-three shapes to
 * throw away. Per-wonder silhouettes come with the rows; the docblock says so
 * because the next hand here should not have to guess whether this was a
 * decision or an omission.
 *
 * It is the *ziggurat's* profile deliberately — steps a low sun draws hard
 * shadow lines under, legible down to twenty pixels for `cityTemple`'s reason —
 * at a scale nothing else in the town reaches, so that "there is a wonder here"
 * is readable from across the table without reading a label. The palace is the
 * grade below it and stops at a house-and-a-half; this goes past the palace's
 * ridge, which is the whole of what makes it a spectacle rather than a big
 * temple.
 *
 * `tiers` terraces, each `taper` of the one below, and the tip comes back
 * separately (`cityWonderTip`) so it can take the gilt — `cityShrine`'s bargain
 * at four times the size.
 */
export function cityWonder(spec: {
  width: number;
  stepH: number;
  tiers: number;
  taper: number;
}): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const count = Math.max(1, Math.round(spec.tiers));
  for (let i = 0; i < count; i++) {
    const width = spec.width * spec.taper ** i;
    const tier = new BoxGeometry(width, spec.stepH, width);
    tier.translate(0, spec.stepH * (i + 0.5), 0);
    parts.push(tier);
  }
  return weld(parts);
}

/**
 * The wonder's gilt tip: a four-sided spike standing on the top terrace.
 *
 * The second speck of gold in the world layer, after the palace's finial, and it
 * is the same argument: gilt belongs to the interface (Entry VII), and the two
 * things the world is allowed to spend it on are the seat of government and a
 * wonder — the two things the interface already marks.
 */
export function cityWonderTip(spec: {
  width: number;
  stepH: number;
  tiers: number;
  taper: number;
  tipH: number;
}): BufferGeometry {
  const count = Math.max(1, Math.round(spec.tiers));
  const top = spec.width * spec.taper ** (count - 1);
  const spike = new ConeGeometry(top * 0.42, spec.tipH, 4, 1);
  spike.rotateY(Math.PI / 4);
  spike.translate(0, spec.stepH * count + spec.tipH / 2, 0);
  return flatten(spike);
}

/**
 * The banner pole a city flies its colours from: a thin cylinder on its base.
 *
 * Five sides, not a smooth barrel — at this radius the facets are invisible but
 * the flat shading gives the pole a lit side and a dark side, which is what
 * stops it disappearing against a pale tile.
 */
export function bannerPole(radius: number, height: number): BufferGeometry {
  const pole = new CylinderGeometry(radius, radius * 1.15, height, 5, 1);
  pole.translate(0, height / 2, 0);
  return flatten(pole);
}

// --- overlays --------------------------------------------------------------

/** The k-th corner of a pointy-top hexagon, in the prism's corner phase. */
function hexCorner(radius: number, k: number): { x: number; z: number } {
  const angle = (k * Math.PI) / 3;
  return { x: radius * Math.sin(angle), z: radius * Math.cos(angle) };
}

/**
 * Assembles a flat, upward-facing geometry from triangles given as xz points.
 *
 * Overlays are drawn with an unlit basic material, so the normals are cosmetic;
 * they are written anyway because a geometry without them is a trap for anything
 * that later wants to light one.
 */
function flatFan(triangles: readonly { x: number; z: number }[]): BufferGeometry {
  const count = triangles.length;
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    position[i * 3] = triangles[i]!.x;
    position[i * 3 + 1] = 0;
    position[i * 3 + 2] = triangles[i]!.z;
    normal[i * 3 + 1] = 1;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('normal', new BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  return geometry;
}

/**
 * A flat hexagon lying in the xz plane, centred on the origin.
 *
 * Same corner phase as `hexPrism`, so a decal sits square on the tile it marks
 * rather than 30° out of true. Used for the "you can move here" tint.
 */
export function hexDecal(radius: number): BufferGeometry {
  const points: { x: number; z: number }[] = [];
  for (let k = 0; k < 6; k++) {
    points.push({ x: 0, z: 0 }, hexCorner(radius, k), hexCorner(radius, k + 1));
  }
  return flatFan(points);
}

/**
 * A flat hexagonal band — the outline ring that hugs a hovered or selected tile.
 *
 * A ring rather than a stroked line because line width is not portable in WebGL:
 * `LineBasicMaterial.linewidth` is silently 1 on every desktop driver, so a
 * ring drawn as lines would be a hairline at any zoom. As geometry it thickens
 * with the board, exactly like the inverted-hull outlines do.
 */
export function hexRing(outerRadius: number, width: number): BufferGeometry {
  const inner = Math.max(0, outerRadius - width);
  const points: { x: number; z: number }[] = [];
  for (let k = 0; k < 6; k++) {
    const o0 = hexCorner(outerRadius, k);
    const o1 = hexCorner(outerRadius, k + 1);
    const i0 = hexCorner(inner, k);
    const i1 = hexCorner(inner, k + 1);
    points.push(i0, o0, o1, i0, o1, i1);
  }
  return flatFan(points);
}

/**
 * A river segment: a flat unit quad in the xz plane, centred on the origin, one
 * unit long in x and one wide in z.
 *
 * Built at unit size and stretched by the instance matrix rather than baked at
 * the right proportions, because every segment wants the same length and width
 * but a different *rotation* — one geometry, one instanced draw for every river
 * on the board. Its long axis is x so the instance yaw is simply the angle of
 * the edge it lies along.
 *
 * Lit, not an overlay: it is water sitting in a channel between two solid
 * things, and the depth buffer is what hides the two thirds of it that are
 * buried inside the neighbouring prisms.
 */
export function riverSegment(): BufferGeometry {
  // Wound counter-clockwise as seen from above (+y): the lit toon material is
  // FrontSide-only, so a clockwise quad here is backface-culled and the river
  // silently vanishes — which is exactly the bug this comment is guarding.
  return flatFan([
    { x: -0.5, z: -0.5 },
    { x: 0.5, z: 0.5 },
    { x: 0.5, z: -0.5 },
    { x: -0.5, z: -0.5 },
    { x: -0.5, z: 0.5 },
    { x: 0.5, z: 0.5 },
  ]);
}

/**
 * The mitre that turns two border bands into one continuous line where they
 * meet at a hex corner: a flat kite in the xz plane, its blunt apex *at* the
 * corner and its local +x running along the inward bisector.
 *
 * Sized in units of the band's own **width**, because that is the only free
 * parameter the joint has. A hexagon's interior angle is always 120°, so once
 * both bands are cut square a fixed distance back from the corner the piece
 * that closes the turn is fully determined:
 *
 *   the setback  `1/√3` (that is `tan 30°`) of a width along each edge. Cut
 *                there and a band's *inner* lip ends exactly on the mitre apex,
 *                which is what makes this a tiling rather than an overlap —
 *                nothing is drawn twice, so the joint does not double-blend
 *                into a dark notch at the one place the eye is looking.
 *   the apex     `2/√3` of a width out along the bisector: where the two inner
 *                lips, each one width in from its own edge, cross.
 *   the flanks   half a width either side of the bisector — the setback point
 *                on each edge, and the two straight sides of the kite that run
 *                from there to the apex are the bands' own square end caps.
 *
 * So the outer boundary of the joint is the hex's own two edges meeting at a
 * sharp 120° point, and the inner boundary is a second sharp point at the apex.
 * A crisp turn in a crisp line. Rounding it would mean a fan here instead, and
 * would be the only curve on a board drawn entirely in straight ink.
 */
export function borderCorner(): BufferGeometry {
  const root3 = Math.sqrt(3);
  const setback = 1 / (2 * root3); // the setback point's reach along the bisector
  const apex = 2 / root3;
  // Wound to match `riverSegment` — counter-clockwise seen from +y — for the
  // same reason: the material is FrontSide-only and a flipped kite is an
  // invisible one, which would read as the old notch coming back.
  return flatFan([
    { x: 0, z: 0 },
    { x: setback, z: 0.5 },
    { x: apex, z: 0 },
    { x: 0, z: 0 },
    { x: apex, z: 0 },
    { x: setback, z: -0.5 },
  ]);
}

/** A path-preview chip: a very low cylinder standing on its base. */
export function pathDot(radius: number, height: number): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, height, 12, 1);
  geometry.translate(0, height / 2, 0);
  return flatten(geometry);
}

/**
 * The pin a standing marker is planted on: a tapered spike of unit radius and
 * unit height, standing on its own base at the origin.
 *
 * Unit-sized so one geometry serves every marker on the board and the instance
 * matrix carries both the thickness and the height — the same bargain
 * `barQuad`, `spriteQuad` and `atlasQuad` make, and the reason a whole map's
 * pins are a single instanced draw whatever is growing on it.
 *
 * Tapered rather than a plain cylinder, and the taper is toward the *ground*:
 * wide where the roundel sits on it and narrow where it meets the tile face, so
 * it reads as something pushed into the hex rather than as a post the marker is
 * balanced on. Six sides, because at the width this is drawn (a couple of
 * hundredths of a hex) the silhouette is a line and any more is triangles spent
 * on a curve that is one pixel across.
 */
export function markerPin(taper: number, sides = 6): BufferGeometry {
  const narrow = Math.max(0.01, Math.min(1, taper));
  const geometry = new CylinderGeometry(1, narrow, 1, Math.max(3, Math.round(sides)), 1, true);
  geometry.translate(0, 0.5, 0);
  return flatten(geometry);
}

/**
 * A unit quad in the xy plane with its origin at the *left* edge, so scaling x
 * grows it rightward. That is what lets one HP bar geometry serve as both the
 * full-width background and the partial-width fill.
 */
export function barQuad(): BufferGeometry {
  return flatFanXY([
    { x: 0, y: -0.5 },
    { x: 1, y: -0.5 },
    { x: 1, y: 0.5 },
    { x: 0, y: -0.5 },
    { x: 1, y: 0.5 },
    { x: 0, y: 0.5 },
  ]);
}

/**
 * A unit quad in the xy plane standing on its own base: x runs −0.5..0.5, y runs
 * 0..1, and the origin is the middle of the bottom edge.
 *
 * That anchor is the whole point. A billboard is placed by saying "the unit
 * stands *here*", and a quad centred on its middle would have to be lifted by
 * half its own height by every caller — which is exactly the kind of arithmetic
 * that gets it wrong on hills.
 *
 * `PlaneGeometry` rather than this file's own `flatFanXY`, because a sprite
 * needs real texture coordinates and `flatFanXY` writes zeroes: its shapes are
 * flat colour and have never had a texture on them.
 */
export function spriteQuad(): BufferGeometry {
  const geometry = new PlaneGeometry(1, 1);
  geometry.translate(0, 0.5, 0);
  return geometry;
}

// --- unit badges -----------------------------------------------------------

/**
 * The rim of a floating unit badge: a flat annulus in the xy plane, facing +z,
 * centred on the origin, with an outer radius of exactly ½.
 *
 * Unit-sized so one geometry serves every badge on the board and the instance
 * matrix carries the diameter — the same bargain `barQuad` and `spriteQuad`
 * make. `innerFraction` is the inner radius as a fraction of the outer, so the
 * band's width in world units is `(1 − innerFraction) · diameter / 2` and the
 * data can speak in world units without this shape knowing about them.
 *
 * Geometry rather than a ring drawn into the badge texture, because the rim is
 * the one part of the badge that is the *player's* colour: as geometry it is a
 * per-instance ink and the whole board's rims batch into one draw per player,
 * where a coloured ring in the atlas would need an atlas per player.
 *
 * Twenty-four segments. At the size a badge is drawn (a third of a hex) that is
 * under two degrees of chord and the circle is clean; going further is spending
 * triangles on a curve nobody can see, and going lower turns a token into a nut.
 */
export function discRing(innerFraction: number, segments = 24): BufferGeometry {
  const n = Math.max(3, Math.round(segments));
  const outer = 0.5;
  const inner = outer * Math.max(0, Math.min(0.999, innerFraction));
  const points: { x: number; y: number }[] = [];
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2;
    const a1 = ((k + 1) / n) * Math.PI * 2;
    const o0 = { x: Math.cos(a0) * outer, y: Math.sin(a0) * outer };
    const o1 = { x: Math.cos(a1) * outer, y: Math.sin(a1) * outer };
    const i0 = { x: Math.cos(a0) * inner, y: Math.sin(a0) * inner };
    const i1 = { x: Math.cos(a1) * inner, y: Math.sin(a1) * inner };
    points.push(i0, o0, o1, i0, o1, i1);
  }
  return flatFanXY(points);
}

/**
 * A unit quad in the xy plane, centred on the origin, carrying one cell of a
 * texture atlas.
 *
 * Centred rather than standing on its base (`spriteQuad`) because a badge is
 * placed by its middle: it floats at a height above the piece and has no feet.
 *
 * The UV rect is baked into the geometry instead of being pushed per instance,
 * which is what lets every badge of one class share an `InstancedMesh` while
 * every class shares one atlas and one material. Eight classes therefore cost
 * eight small geometries and one texture, and the whole board's badges cost one
 * draw per class actually standing on it.
 */
export function atlasQuad(u0: number, v0: number, u1: number, v1: number): BufferGeometry {
  const geometry = new PlaneGeometry(1, 1);
  const uv = geometry.getAttribute('uv');
  // `PlaneGeometry`'s corners run (0,1) (1,1) (0,0) (1,0) — top-left first —
  // so each u/v is a plain lerp of the rect and no winding has to be guessed.
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  }
  uv.needsUpdate = true;
  return geometry;
}

/**
 * `atlasQuad` laid flat: a unit quad in the **xz** plane facing the sky, centred
 * on the origin, carrying one cell of a texture atlas.
 *
 * The tile-icon sibling of `atlasQuad`, and it exists because the two live in
 * different planes for different reasons. A badge stands up in the world facing
 * the camera; a resource roundel and a yield glyph lie *on the tile*, like every
 * other decal in `overlays.ts`, so they are placed with a tile centre and a top
 * height and nothing else.
 *
 * `rotateX(-π/2)` is what does it, and the direction matters: it sends the
 * plane's local +y to −z, which is up-screen under this camera, so an icon
 * drawn the right way up in the atlas is drawn the right way up on the board.
 * Rotating the other way would silently print every glyph upside down.
 */
export function atlasDecal(u0: number, v0: number, u1: number, v1: number): BufferGeometry {
  const geometry = atlasQuad(u0, v0, u1, v1);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** `flatFan` for shapes that live in the xy plane and face +z. */
function flatFanXY(triangles: readonly { x: number; y: number }[]): BufferGeometry {
  const count = triangles.length;
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    position[i * 3] = triangles[i]!.x;
    position[i * 3 + 1] = triangles[i]!.y;
    normal[i * 3 + 2] = 1;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('normal', new BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  return geometry;
}

// --- the Abacus ------------------------------------------------------------

/*
 * The counting frame's own shapes, promoted here from `src/abacusSpike/` when
 * the Abacus became an in-game screen. They live in the board's shape kit rather
 * than beside the stage for one concrete reason: they need `flatten`, `merge`
 * and `lathe`, and those are module-private here on purpose. The spike had to
 * copy all three; adoption deletes the copies instead of widening this file's
 * surface, which is the cheaper of the two moves.
 *
 * The one genuinely new tool is `extrudeProfile`. The frame is made of timber
 * *bars*, and a chamfered bar is not a primitive: three has no bevelled box, and
 * composing one out of two crossed boxes — the obvious move — breaks the outline
 * pass. The inverted hull expands the whole merged shell along smoothed normals,
 * so the inner box's shell pushes straight out through the outer box's face and
 * lays a dark stripe down the length of every rail. A chamfered bar has to be
 * *one closed convex shell*, so it is extruded from an eight-sided cross-section
 * instead, and then it outlines perfectly.
 */

/**
 * Extrudes a convex cross-section along x, centred on the origin.
 *
 * `profile` is a list of `[y, z]` corners. Winding is fixed for the caller: the
 * polygon's signed area in the y–z plane decides the order, and the order is
 * reversed if it came in clockwise, so a profile written by eye cannot produce
 * an inside-out bar that renders invisible.
 *
 * The triangle winding below is derived, not guessed. In a right-handed frame
 * `ŷ × ẑ = x̂`, so a counter-clockwise profile in the y–z plane has its polygon
 * normal along +x, and the outward normal of the side wall on edge `e` is
 * `e × x̂ = (0, Δz, −Δy)`. Emitting each side quad as (A,D,C) then (A,C,B) —
 * with A,B the near/far copies of the first corner and D,C those of the second —
 * gives exactly that; the caps fan from corner 0, forward at +x and reversed at
 * −x. Every face therefore points out of the solid, which is what the outline
 * shell needs as much as the lighting does.
 */
export function extrudeProfile(
  profile: readonly (readonly [number, number])[],
  length: number,
): BufferGeometry {
  const points = profile.map(([y, z]) => [y, z] as [number, number]);
  let twiceArea = 0;
  for (let i = 0; i < points.length; i++) {
    const [y0, z0] = points[i]!;
    const [y1, z1] = points[(i + 1) % points.length]!;
    twiceArea += y0 * z1 - y1 * z0;
  }
  if (twiceArea < 0) points.reverse();

  const x0 = -length / 2;
  const x1 = length / 2;
  const out: number[] = [];
  const push = (x: number, point: [number, number]): void => {
    out.push(x, point[0], point[1]);
  };

  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    push(x0, a);
    push(x0, b);
    push(x1, b);
    push(x0, a);
    push(x1, b);
    push(x1, a);
  }

  const first = points[0]!;
  for (let i = 1; i < points.length - 1; i++) {
    push(x1, first);
    push(x1, points[i]!);
    push(x1, points[i + 1]!);
    push(x0, first);
    push(x0, points[i + 1]!);
    push(x0, points[i]!);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(out), 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A chamfered timber bar lying along x, centred on the origin.
 *
 * The chamfer is the whole of why the frame reads as joinery rather than as a
 * stack of blocks: a square arris catches one band of the toon ramp and vanishes
 * into its neighbour, while a 45° cut catches a *third* band and draws a bright
 * line down every edge for free. It is also what a real reckoning-frame has,
 * because nobody planes a sharp corner onto a thing that is handled.
 */
export function chamferedBar(
  length: number,
  height: number,
  depth: number,
  chamfer: number,
): BufferGeometry {
  const a = height / 2;
  const b = depth / 2;
  const c = Math.min(chamfer, a * 0.7, b * 0.7);
  return extrudeProfile(
    [
      [a, b - c],
      [a - c, b],
      [-(a - c), b],
      [-a, b - c],
      [-a, -(b - c)],
      [-(a - c), -b],
      [a - c, -b],
      [a, -(b - c)],
    ],
    length,
  );
}

/** A bar built along x and stood on end, so it runs along y instead. */
export function uprightBar(
  height: number,
  width: number,
  depth: number,
  chamfer: number,
): BufferGeometry {
  const bar = chamferedBar(height, width, depth, chamfer);
  bar.rotateZ(Math.PI / 2);
  return bar;
}

/** Welds a set of already-placed parts into one flat-shaded geometry. */
export function weld(parts: BufferGeometry[]): BufferGeometry {
  const merged = merge(parts);
  for (const part of parts) part.dispose();
  return flatten(merged);
}

/**
 * A rod: a plain cylinder lying along x.
 *
 * Nine sides. A brass rod is the one thing on this object that wants to look
 * *drawn* rather than turned — it is a hair over a tenth of a hex wide and its
 * whole job is to be a bright line the beads are threaded on — so it gets enough
 * segments to hold a highlight and not one more.
 */
export function rodBar(radius: number, length: number): BufferGeometry {
  const rod = new CylinderGeometry(radius, radius, length, 9, 1);
  rod.rotateZ(Math.PI / 2);
  return flatten(rod);
}

/**
 * The turned knob on a rod's end, built along +x from the stile it grows out of.
 *
 * A rod that simply stops at the frame reads as a wire pushed through a hole.
 * The finial is what says the rod was *fitted*: a collar, a bulb and a nose,
 * which is the same vocabulary the miniatures' lathed bodies are cut from.
 */
export function rodFinial(size: number, segments: number): BufferGeometry {
  const knob = lathe(
    [
      [0, 0],
      [0.62 * size, 0],
      [0.66 * size, 0.16 * size],
      [0.42 * size, 0.3 * size],
      [0.9 * size, 0.46 * size],
      [1.0 * size, 0.66 * size],
      [0.74 * size, 0.86 * size],
      [0.34 * size, 1.0 * size],
      [0, 1.0 * size],
    ],
    segments,
  );
  // Lathed about +y, then tipped so it points along +x — the direction a rod end
  // faces. The caller mirrors it for the other end.
  knob.rotateZ(-Math.PI / 2);
  return flatten(knob);
}

/**
 * A bead: a flattened bicone with a bore down the middle, lying on the x axis.
 *
 * This is the shape the whole object is judged on, and a lathe is the only
 * honest way to get it. The profile starts and ends at the bore radius rather
 * than at zero, so the surface of revolution is an open tube — the hole is not
 * modelled, it is simply *never closed*, and the rod passing through it is what
 * the eye reads as a drilled bead. A sphere with a cylinder subtracted would be
 * a CSG library and about four hundred more triangles for the same silhouette.
 *
 * The waist is a hair proud of the shoulders so the widest ring is a real edge
 * the ramp can break on. A bead with a smooth barrel is a pill.
 */
export function beadShape(spec: {
  radius: number;
  halfThickness: number;
  bore: number;
  segments: number;
}): BufferGeometry {
  const r = spec.radius;
  const h = spec.halfThickness;
  const b = spec.bore;
  const bead = lathe(
    [
      [b, -h],
      [b * 1.9, -h],
      [r * 0.6, -h * 0.74],
      [r * 0.93, -h * 0.3],
      [r, 0],
      [r * 0.93, h * 0.3],
      [r * 0.6, h * 0.74],
      [b * 1.9, h],
      [b, h],
    ],
    spec.segments,
  );
  bead.rotateZ(Math.PI / 2);
  return flatten(bead);
}
