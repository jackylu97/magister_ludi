/**
 * Every shape the abacus is made of, built from primitives and nothing else.
 *
 * The same bargain `src/render3d/geometry.ts` makes — no asset here was drawn,
 * downloaded or baked — and the same three tools: `flatten` to bake facets a
 * toon material cannot be asked for, `merge` to weld a composed object into one
 * geometry, and a lathe for anything that was turned on one.
 *
 * Those three are re-declared here rather than imported because they are module
 * private over there, and a look-dev spike must not be the reason the renderer
 * grows an export. If the abacus is ever adopted, the first move is to delete
 * these copies and export the originals.
 *
 * The one genuinely new tool is `extrudeProfile`. The frame is made of timber
 * *bars*, and a chamfered bar is not a primitive: three has no bevelled box, and
 * composing one out of two crossed `BoxGeometry`s — the obvious move — breaks the
 * outline pass. The inverted hull expands the whole merged shell along smoothed
 * normals, so the inner box's shell pushes straight out through the outer box's
 * face and lays a dark stripe down the length of every rail. A chamfered bar has
 * to be *one closed convex shell*, so it is extruded from an eight-sided
 * cross-section instead, and then it outlines perfectly.
 */

import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  LatheGeometry,
  Vector2,
} from 'three';

// --- the three borrowed tools ----------------------------------------------

/**
 * Bakes hard facets by de-indexing and recomputing normals per triangle.
 * `MeshToonMaterial` has no `flatShading` flag, so this is the only way to get
 * facets out of it. See the original in `src/render3d/geometry.ts`.
 */
function flatten(geometry: BufferGeometry): BufferGeometry {
  const flat = geometry.getIndex() ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  flat.computeVertexNormals();
  return flat;
}

/** Concatenates geometries into one. De-indexes first; costs vertices, not sanity. */
function merge(parts: BufferGeometry[]): BufferGeometry {
  const flat = parts.map((part) => (part.getIndex() ? part.toNonIndexed() : part));
  const total = flat.reduce((sum, part) => sum + part.getAttribute('position').count, 0);

  const position = new Float32Array(total * 3);
  const normal = new Float32Array(total * 3);

  let vertexOffset = 0;
  for (const part of flat) {
    const partPosition = part.getAttribute('position');
    const partNormal = part.getAttribute('normal');
    position.set(partPosition.array as Float32Array, vertexOffset * 3);
    if (partNormal) normal.set(partNormal.array as Float32Array, vertexOffset * 3);
    vertexOffset += partPosition.count;
  }

  const merged = new BufferGeometry();
  merged.setAttribute('position', new BufferAttribute(position, 3));
  merged.setAttribute('normal', new BufferAttribute(normal, 3));
  for (let i = 0; i < parts.length; i++) {
    if (flat[i] !== parts[i]) flat[i]!.dispose();
  }
  return merged;
}

/**
 * Lathe a profile given as `[radius, height]` pairs, bottom first.
 *
 * Odd segment counts on purpose, exactly as the miniatures do it: an even count
 * puts a facet edge dead centre on both the lit and the shadowed side and the
 * turning reads as machined. The beads get more segments than a board piece
 * because this object is judged at arm's length, not at forty pixels.
 */
function lathe(
  profile: readonly (readonly [number, number])[],
  segments: number,
): BufferGeometry {
  return new LatheGeometry(
    profile.map(([r, y]) => new Vector2(r, y)),
    segments,
  );
}

// --- extrusion --------------------------------------------------------------

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

// --- the frame --------------------------------------------------------------

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

// --- the rods ---------------------------------------------------------------

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

// --- the beads --------------------------------------------------------------

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
