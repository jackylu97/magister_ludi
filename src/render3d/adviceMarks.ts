import {
  AdditiveBlending, BufferAttribute, BufferGeometry, DataTexture, DoubleSide, LinearFilter, Matrix4, MeshBasicMaterial, PlaneGeometry, Quaternion, RGBAFormat, UnsignedByteType, Vector3,
} from 'three';

import { type InstanceCollector, RENDER_ORDER } from './instances';
import { VIEW3D } from './lookData';

/*
 * The marks that mean "look at this hex".
 *
 * The user's rulings of 2026-11-21 (docs/plans/ui-critique-2026-10-16.md):
 * a recommended city site, a worker's best hexes and the explorer lens's finds
 * all wear the same quiet mark, six short ticks at the corners of the hex.
 * "i want this to feel unintrusive", "subdued and easy to ignore if the player
 * has other ideas".
 *
 * Everything here is flat geometry in one colour, drawn over the board through
 * the instance collector, as the washes and rings are. Nothing needs a canvas,
 * so the marks are the same in a test and in the game. The one exception is
 * the light on a ruin, which needs a soft edge: its two textures are filled
 * from arithmetic (`DataTexture`), not drawn.
 *
 * - `addCornerTicks`: the ticks over a dark backing, in two weights.
 * - `addPips`: one to three pips on a dark plate at the foot of the hex, for
 *   how good a recommended city site is.
 * - `addRuinLight`: a warm glow on the ground and a faint upright shaft, so a
 *   ruin can be found from far out. It is still. The renderer rests when
 *   nothing moves, and a shimmer would keep it awake for the whole time the
 *   lens is up.
 *
 * Cost: each kind of mark is one instanced draw for the whole board, however
 * many hexes wear it. The geometries and the two light materials are made once
 * and shared.
 */

const ADVICE = VIEW3D.lens.advice;
const HEX = VIEW3D.board.hexRadius;

type Point = { x: number; z: number };

/** The corner phase of the board's hexes: corner 0 points down the screen (+z). */
const around = (radius: number, turn: number): Point => ({ x: radius * Math.sin(turn), z: radius * Math.cos(turn) });
const corner = (radius: number, k: number): Point => around(radius, (k * Math.PI) / 3);
const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });

/** A flat, upward-facing geometry from triangles given as xz points (the shape `hexDecal` is built from). */
function flat(triangles: readonly Point[]): BufferGeometry {
  const position = new Float32Array(triangles.length * 3), normal = new Float32Array(triangles.length * 3);
  triangles.forEach((p, i) => { position[i * 3] = p.x; position[i * 3 + 2] = p.z; normal[i * 3 + 1] = 1; });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('normal', new BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(triangles.length * 2), 2));
  return geometry;
}

/** A closed outline, as a fan around its centre. The points go round in the direction `around` turns. */
function fan(outline: readonly Point[], centre: Point = { x: 0, z: 0 }): BufferGeometry {
  const triangles: Point[] = [];
  outline.forEach((p, i) => triangles.push(centre, p, outline[(i + 1) % outline.length]!));
  return flat(triangles);
}

/**
 * Six corner ticks: at each corner of the hex, two short arms along the two
 * edges that meet there. `width` is the arm's width and `extra` widens it on
 * both sides (the dark backing).
 */
export function cornerTicks(width: number, extra = 0): BufferGeometry {
  const outer = HEX * (1 - ADVICE.tickInset) + extra, inner = outer - width - extra * 2;
  const reach = ADVICE.tickLength + extra / HEX;
  const triangles: Point[] = [];
  for (let k = 0; k < 6; k++) {
    const o = corner(outer, k), i = corner(inner, k);
    const oBefore = mix(o, corner(outer, k - 1), reach), iBefore = mix(i, corner(inner, k - 1), reach);
    const oAfter = mix(o, corner(outer, k + 1), reach), iAfter = mix(i, corner(inner, k + 1), reach);
    triangles.push(iBefore, oBefore, o, iBefore, o, i, i, o, oAfter, i, oAfter, iAfter);
  }
  return flat(triangles);
}

const disc = (radius: number, steps = 16): BufferGeometry =>
  fan(Array.from({ length: steps }, (_, j) => around(radius, (j / steps) * Math.PI * 2)));
/** A bar with round ends, `width` long in x. */
function pill(width: number, depth: number, steps = 20): BufferGeometry {
  const r = depth / 2, reach = Math.max(0, width / 2 - r);
  return fan(Array.from({ length: steps }, (_, j) => { const p = around(r, ((j + 0.5) / steps) * Math.PI * 2); return { x: p.x + Math.sign(p.x) * reach, z: p.z }; }));
}

export interface Shapes {
  ticks: BufferGeometry; ticksBack: BufferGeometry; ticksBest: BufferGeometry; ticksBestBack: BufferGeometry;
  pip: BufferGeometry; plate: BufferGeometry;
  ground: PlaneGeometry; upright: PlaneGeometry;
}
let shapes: Shapes | null = null;
function made(): Shapes {
  shapes ??= {
    ticks: cornerTicks(ADVICE.tickWidth), ticksBack: cornerTicks(ADVICE.tickWidth, ADVICE.tickBackingExtra),
    ticksBest: cornerTicks(ADVICE.tickWidthBest), ticksBestBack: cornerTicks(ADVICE.tickWidthBest, ADVICE.tickBackingExtra),
    pip: disc(ADVICE.pipRadius), plate: pill(ADVICE.pipPlateWidth, ADVICE.pipPlateDepth),
    ground: new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    // The shaft stands on its foot: the quad's bottom edge is at the origin.
    upright: new PlaneGeometry(1, 1).translate(0, 0.5, 0),
  };
  return shapes;
}

/** The shared shapes, for the flair gallery and for a test that looks for one of them in a built layer. */
export function adviceShapes(): Readonly<Shapes> { return made(); }

const still = new Quaternion(), one = new Vector3(1, 1, 1);
const at = (x: number, y: number, z: number): Matrix4 => new Matrix4().compose(new Vector3(x, y, z), still, one);
/**
 * Over the washes, the movement range, and the hover and selection rings (all at
 * `RENDER_ORDER.onTop`), and just under the yield figures and the plaques. The
 * ticks also sit outside the band those rings take (`overlay.ringOuter` less
 * `ringWidth`, to `ringOuter`): a tick drawn over a pale ring in a pale colour
 * was on top and still could not be seen. So `tickInset` keeps them beyond it.
 */
const ORDER = RENDER_ORDER.onTop + 0.6;

/** Which ticks a hex wears: `best` is heavier, `pale` is the quiet colour of a second choice. */
export interface TickStyle { best?: boolean; pale?: boolean; color?: number }

/** The corner ticks of one hex, centred at (x, z) on ground at height y. Two instances. */
export function addCornerTicks(collector: InstanceCollector, x: number, y: number, z: number, style: TickStyle = {}): void {
  const s = made(), where = at(x, y, z);
  collector.add(style.best ? s.ticksBestBack : s.ticksBack, [ADVICE.tickBackingColor], where, { onTop: true, opacity: ADVICE.tickBackingOpacity, order: ORDER });
  collector.add(style.best ? s.ticksBest : s.ticks, [style.color ?? (style.pale ? ADVICE.tickPaleColor : ADVICE.tickColor)], where.clone(), { onTop: true, order: ORDER + 0.1 });
}

/** How many pips a site of this score wears, beside the best score on the board. */
export function pipsFor(score: number, best: number): 1 | 2 | 3 {
  if (best <= 0 || score >= best * (1 - ADVICE.pipNear)) return 3;
  return score >= best * (1 - ADVICE.pipMid) ? 2 : 1;
}

/** The pip plate at the foot of a hex: a dark bar, and three pips of which `count` are lit. Four instances. */
export function addPips(collector: InstanceCollector, x: number, y: number, z: number, count: number): void {
  const s = made(), foot = z + HEX * ADVICE.pipOffset;
  collector.add(s.plate, [ADVICE.pipPlateColor], at(x, y, foot), { onTop: true, opacity: 0.92, order: ORDER + 0.2 });
  for (let i = 0; i < 3; i++) {
    collector.add(s.pip, [i < count ? ADVICE.tickColor : ADVICE.pipEmptyColor], at(x + (i - 1) * ADVICE.pipGap, y, foot), { onTop: true, order: ORDER + 0.3 });
  }
}

/** A soft texture from a rule for its alpha, white everywhere. `v` is 0 at the bottom row. */
function softTexture(width: number, height: number, alpha: (u: number, v: number) => number): DataTexture {
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
    const i = (row * width + col) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = Math.round(255 * Math.min(1, Math.max(0, alpha((col + 0.5) / width, (row + 0.5) / height))));
  }
  const texture = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType);
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Added light, drawn over the board: it brightens what is under it and hides nothing. */
function lightMaterial(texture: DataTexture, opacity: number): MeshBasicMaterial {
  return new MeshBasicMaterial({
    map: texture, color: ADVICE.ruinGlowColor, opacity, transparent: true, blending: AdditiveBlending,
    depthTest: false, depthWrite: false, toneMapped: false, side: DoubleSide, forceSinglePass: true,
  });
}

let lights: { glow: MeshBasicMaterial; shaft: MeshBasicMaterial } | null = null;
/** The two materials of a ruin's light. Made once. */
export function ruinLightMaterials(): { glow: MeshBasicMaterial; shaft: MeshBasicMaterial } {
  lights ??= {
    // The glow: bright at the centre, gone at the edge of its quad.
    glow: lightMaterial(softTexture(48, 48, (u, v) => { const d = Math.hypot(u - 0.5, v - 0.5) * 2; return Math.pow(Math.max(0, 1 - d), 1.6); }), ADVICE.ruinGlowOpacity),
    // The shaft: brightest at its foot and along its middle, fading upward and to both sides.
    shaft: lightMaterial(softTexture(16, 64, (u, v) => Math.pow(Math.max(0, 1 - Math.abs(u * 2 - 1)), 1.4) * Math.pow(1 - v, 1.5)), ADVICE.ruinShaftOpacity),
  };
  return lights;
}

/** The light on a ruin: a glow flat on the ground, and a shaft standing on the hex, turned to the camera. Two instances. */
export function addRuinLight(collector: InstanceCollector, x: number, y: number, z: number, faceCamera: Quaternion): void {
  const s = made(), light = ruinLightMaterials();
  const glow = HEX * ADVICE.ruinGlowSize;
  collector.add(s.ground, [], new Matrix4().compose(new Vector3(x, y, z), still, new Vector3(glow, 1, glow)), { material: light.glow, order: ORDER - 0.2 });
  collector.add(s.upright, [], new Matrix4().compose(new Vector3(x, y, z), faceCamera, new Vector3(HEX * ADVICE.ruinShaftWidth, HEX * ADVICE.ruinShaftHeight, 1)), { material: light.shaft, order: RENDER_ORDER.tileIcon + 0.2 });
}
