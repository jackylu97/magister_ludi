/**
 * Every shape on the board, built from primitives and nothing else.
 *
 * Adapted from the look-dev prototype's `src/proto3d/geometry.ts`, which proved
 * the point this file inherits: no asset here was drawn, downloaded or baked. A
 * tile is a `CylinderGeometry` with six sides, a pine is a cone on a stick, a
 * warrior is a lathe swept around a hand-written profile. The look survives
 * being made entirely of primitives, so the game needs no art pipeline, only a
 * palette.
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
 */
export function hexPrism(radius: number, height: number): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, height, 6, 1, false);
  geometry.translate(0, height / 2, 0);
  return flatten(geometry);
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

/** A boulder: a d20 squashed and sheared so no two rotations look alike. */
export function rock(radius: number): BufferGeometry {
  const geometry = new IcosahedronGeometry(radius, 0);
  geometry.scale(1.15, 0.62, 0.92);
  geometry.rotateZ(0.22);
  geometry.translate(0, radius * 0.34, 0);
  return flatten(geometry);
}

// --- unit pieces -----------------------------------------------------------

/**
 * Lathe a profile given as `[radius, height]` pairs, bottom first.
 *
 * Nine radial segments, deliberately odd: an even count puts a facet edge dead
 * centre on both the lit and shadowed side and the piece reads as symmetrical
 * and machine-made. Odd counts break that and look turned on a lathe, which is
 * what a wooden game piece is.
 */
function lathe(profile: readonly (readonly [number, number])[], segments = 9): BufferGeometry {
  const points = profile.map(([r, y]) => new Vector2(r, y));
  return new LatheGeometry(points, segments);
}

/**
 * The top of each piece profile, in profile units.
 *
 * Every piece is scaled so its *tip* lands on the configured piece height, which
 * is what keeps a pawn, a scout and a house reading as the same size class. The
 * numbers are the last y of each profile below and change only when the profile
 * does, so they live beside them rather than in `view3d.json`.
 */
const PIECE_PROFILE_TOP = { warrior: 0.63, scout: 0.76, settler: 0.52 } as const;

/** Warrior: a chess pawn — wide foot, collar, ball head. */
export function warriorPiece(height: number): BufferGeometry {
  const scale = height / PIECE_PROFILE_TOP.warrior;
  const geometry = lathe([
    [0, 0],
    [0.2, 0],
    [0.2, 0.05],
    [0.145, 0.1],
    [0.095, 0.19],
    [0.085, 0.3],
    [0.135, 0.35],
    [0.095, 0.39],
    [0.06, 0.43],
    [0.105, 0.5],
    [0.1, 0.56],
    [0.055, 0.61],
    [0, 0.63],
  ]);
  geometry.scale(scale, scale, scale);
  return flatten(geometry);
}

/** Scout: a tall thin piece with a pennant-shaped head. Reads as fast. */
export function scoutPiece(height: number): BufferGeometry {
  const scale = height / PIECE_PROFILE_TOP.scout;
  const geometry = lathe([
    [0, 0],
    [0.185, 0],
    [0.185, 0.04],
    [0.11, 0.09],
    [0.05, 0.16],
    [0.045, 0.44],
    [0.155, 0.5],
    [0.115, 0.58],
    [0.03, 0.74],
    [0, 0.76],
  ]);
  geometry.scale(scale, scale, scale);
  return flatten(geometry);
}

/** Settler: a house — box body, four-sided pyramid roof. Not lathed; a home. */
export function settlerPiece(height: number): BufferGeometry {
  const scale = height / PIECE_PROFILE_TOP.settler;
  const bodyH = 0.28;
  const body = new BoxGeometry(0.34, bodyH, 0.3);
  body.translate(0, bodyH / 2, 0);

  const roofH = 0.24;
  // Four radial segments makes a pyramid; the quarter turn squares it to the box.
  const roof = new ConeGeometry(0.3, roofH, 4, 1);
  roof.rotateY(Math.PI / 4);
  roof.translate(0, bodyH + roofH / 2, 0);

  const merged = merge([body, roof]);
  body.dispose();
  roof.dispose();
  merged.scale(scale, scale, scale);
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
  return flatFan([
    { x: -0.5, z: -0.5 },
    { x: 0.5, z: -0.5 },
    { x: 0.5, z: 0.5 },
    { x: -0.5, z: -0.5 },
    { x: 0.5, z: 0.5 },
    { x: -0.5, z: 0.5 },
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
