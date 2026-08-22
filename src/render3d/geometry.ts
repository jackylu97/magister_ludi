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
 */
export type MiniAccent = 'wood' | 'metal' | 'accent';
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
const MINI_PART_ORDER: readonly MiniPart[] = ['body', 'wood', 'metal', 'accent'];

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

/** A path-preview chip: a very low cylinder standing on its base. */
export function pathDot(radius: number, height: number): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, height, 12, 1);
  geometry.translate(0, height / 2, 0);
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
