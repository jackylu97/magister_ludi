import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';

import type { GameMap } from '../sim/map';
import type { MapEndsStyle } from './mapEnds';

/**
 * The moulded rail: the frame at the north and south ends of the map, built as
 * a joiner would build it (the user, 2026-11-16: "could we add texture and some
 * detail/nuance to sell the look and have it feel less amateur-ish? The
 * shading/rendering also feels very flat").
 *
 * The plain rail is one slab. This one is four wooden members, each cut into
 * planks with its own joints, so no line runs the whole length of the map:
 * - the apron: the low inner piece cut to the hex points, with a chamfer and a
 *   small raised lip along the cut;
 * - the board: the flat middle piece that carries the brass scale;
 * - the lip: a cove, a fillet and a rounded bead that stand above the board,
 *   joined with slanted (scarf) joints;
 * - the skirt: a plinth at the foot of the outer side, so the frame stands on
 *   the table.
 *
 * Why it is made this way:
 * - The board's paint shader gives each facet one of three tones by its angle
 *   to the sun. A flat slab has two facets and so two tones. Each bevel here is
 *   a facet of its own, and that is where the light and shade come from.
 * - The wood grain is drawn in the shader from the vertex position, as flat
 *   streaks in a few steps of tone. No image is fetched. It fades out when the
 *   camera is far, so it does not shimmer.
 * - The brass is ordinary pigment on the same material. The paint shader has no
 *   metal response, so a second material would only add draw calls.
 * - The table beyond the rail is the scene's background colour and not a
 *   surface, so it cannot receive a shadow. A soft strip of shade is laid at the
 *   rail's foot instead. It is wide on the south side, where the sun in every
 *   light preset throws the rail's shadow, and narrow on the north side.
 *
 * Both ends are one geometry, drawn once for each wrap copy, and the shade
 * strips are a second one: six draw calls for the whole frame.
 */
export interface MouldedRailStyle {
  /** How far the rail reaches past the points of the last row, and how far its foot goes below flat land. */
  width: number; foot: number;
  /** The height of the lip's top above flat land. The other heights of the profile scale with it. */
  rise: number;
  /** The colour of each member. */
  woods: { apron: string; board: string; lip: string; skirt: string };
  /** The colour inside a joint, and the pale colour of a worn edge. */
  seam: string; worn: string;
  brass: string; brassLight: string;
  /** The dark bed the brass is set in. */
  bed: string;
  /** How much the tone changes from plank to plank (0 to 1), and how strong the grain is (0 is none). */
  toneVary: number; grain: number;
  /** How far a worn edge moves toward `worn` (0 to 1). */
  wear: number;
  /** How much lighter and warmer the pigment is on a face that looks south. The sun is in the north in every preset, so these faces are always in the cool shade tone, and without this they read as slate and not as wood. */
  southLift: number;
  /** The length of a plank of each member, in columns of hexes. */
  planks: { apron: number; board: number; lip: number; skirt: number };
  /** The width of a joint. */
  seamWidth: number;
  /** The scale: every `majorEvery`th column has a long tick and, with `numerals`, its number in Roman figures. */
  scale: { majorEvery: number; numerals: boolean; studs: boolean };
  /** The shade at the rail's foot on the table: its colour, its strength (0 to 1), how far it reaches on the south side and on the north side. */
  shade: { color: string; alpha: number; south: number; north: number };
  /**
   * How high the rail stands above the ground. Both ends read this one block,
   * so the two rails are the same shape mirrored and cannot drift apart.
   *
   * It began as the north rail's own. The camera looks from the south, so at
   * the north end it sees the rail's inner side and its tops, never its outer
   * side, and a low rail read as flat stripes on the ground (the user,
   * 2026-11-16: "It should really look like it's a table/board being viewed
   * from the same angle as the camera. Maybe it can be slightly raised from the
   * terrain"). The user then asked for the same at the south, "for the sake of
   * completion ... lets make sure the two sides are symmetrical", and accepted
   * that the south rail now covers the foot of the last row.
   * - `raise` lifts the whole top, which gives a wall on the board's side;
   * - `lip` lifts the lip again, so its inner face shows above the board;
   * - `wall` says where the wall stands: `cut` at the hex points (it follows
   *   them), or `behind` them (the apron stays low and a straight wall rises
   *   where the board begins).
   * Without this block both rails are low: the first moulded rail.
   */
  raised?: { raise: number; lip: number; wall: string; /** The height of flat land's surface, where the wall's dark foot ends. */ ground: number; /** The shade the wall lays on the ground at its foot: how far it reaches onto the last row, its height (a little above `ground`), and its strength (0 to 1). */ shadeReach: number; shadeLift: number; shadeAlpha: number };
}

const ROOT3 = Math.sqrt(3);
type Point = [number, number, number];
type Member = 'apron' | 'board' | 'lip' | 'skirt';

/**
 * The straight part of the profile, from the board side to the outer side.
 * Each row is a point (`d` outward from the hex points, `y` up) and what the
 * face from this point to the next is: its member, its tone, and whether it is
 * a worn edge. Drawn for a rail 0.8 wide whose lip is 0.186 high.
 */
const PROFILE: readonly { d: number; y: number; member: Member; tone: number; worn?: boolean; toneEnd?: number }[] = [
  { d: .13, y: .050, member: 'board', tone: .9 },                  // the bevel up from the apron
  { d: .172, y: .086, member: 'board', tone: 1.06, worn: true },   // its eased edge
  { d: .19, y: .094, member: 'board', tone: 1 },                   // the top that carries the scale
  { d: .53, y: .094, member: 'board', tone: .55 },                 // the groove before the lip
  { d: .537, y: .078, member: 'lip', tone: .5 },
  { d: .55, y: .078, member: 'lip', tone: .86 },                   // the cove, in three faces
  { d: .578, y: .091, member: 'lip', tone: .93 },
  { d: .598, y: .118, member: 'lip', tone: 1 },
  { d: .610, y: .158, member: 'lip', tone: 1.05, worn: true },     // the fillet
  { d: .628, y: .158, member: 'lip', tone: .94 },                  // the bead
  { d: .640, y: .176, member: 'lip', tone: 1.04, worn: true },
  { d: .656, y: .186, member: 'lip', tone: 1 },                    // the top of the lip
  { d: .730, y: .186, member: 'lip', tone: 1.06, worn: true },
  { d: .760, y: .172, member: 'lip', tone: .92 },
  { d: .778, y: .140, member: 'lip', tone: .95, toneEnd: .78 },    // the outer side
  { d: .778, y: -.050, member: 'skirt', tone: 1 },                 // the plinth
  { d: .800, y: -.072, member: 'skirt', tone: 1.06, worn: true },
  { d: .815, y: -.094, member: 'skirt', tone: .9, toneEnd: .62 },
  { d: .815, y: -1, member: 'skirt', tone: 1 },                    // the foot; its `y` is replaced by the style's
];
const PROFILE_WIDTH = .815, PROFILE_RISE = .186;
/** The apron beside the cut, as shifts outward from the cut line: the chamfer, the small lip, the drop to the ledge. */
const APRON = { chamferY: .040, lipIn: .030, lipOut: .075, lipY: .066, ledgeIn: .086, ledgeY: .050 };
/** The scale on the board's top, as distances outward from the hex points. */
const SCALE = { line: .478, lineWidth: .022, tick: .05, majorTick: .105, numeralIn: .235, numeralOut: .345, stroke: .017, bed: .006 };

/** Strokes of the Roman figures in a box one unit high, `y` up. Each stroke is a line of points. */
const FIGURES: Record<string, { width: number; strokes: [number, number][][] }> = {
  I: { width: .22, strokes: [[[.11, 0], [.11, 1]]] },
  V: { width: .72, strokes: [[[.04, 1], [.36, 0], [.68, 1]]] },
  X: { width: .70, strokes: [[[.04, 1], [.66, 0]], [[.66, 1], [.04, 0]]] },
  L: { width: .58, strokes: [[[.08, 1], [.08, 0], [.54, 0]]] },
  C: { width: .70, strokes: [[[.64, .82], [.40, 1], [.14, .82], [.06, .5], [.14, .18], [.40, 0], [.64, .18]]] },
};

function roman(value: number): string {
  let out = '', left = value;
  for (const [figure, worth] of [['C', 100], ['XC', 90], ['L', 50], ['XL', 40], ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]] as const)
    while (left >= worth) { out += figure; left -= worth; }
  return out;
}

/** A fixed number from 0 to 1 for a plank, so the same map always gets the same planks. */
function hash(a: number, b: number, c: number): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** The wood grain, added to the material before the painted look registers it. `rail` is (grain amount, plank seed). */
function installGrain(material: MeshStandardMaterial, strength: number): void {
  material.onBeforeCompile = shader => {
    shader.vertexShader = `attribute vec2 rail;\nvarying vec3 railAt;\nvarying vec2 railGrain;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nrailAt = position; railGrain = rail;');
    shader.fragmentShader = `varying vec3 railAt;\nvarying vec2 railGrain;
float railHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float railNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(railHash(i), railHash(i + vec2(1.0, 0.0)), f.x), mix(railHash(i + vec2(0.0, 1.0)), railHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>
{
  // Streaks along the plank. "Across" mixes depth and height so a side face has grain too.
  float seed = railGrain.y;
  float across = railAt.z + railAt.y * 1.3;
  float bend = sin(railAt.x * 1.9 + seed * 40.0) * .018 + sin(railAt.x * .6 + seed * 13.0) * .03;
  vec2 g = vec2(railAt.x * .7 + seed * 31.0, (across + bend) * 24.0 + seed * 7.0);
  float streak = railNoise(g);
  // Three flat steps of tone, as strokes of paint and not a smooth blend.
  float tone = (smoothstep(.34, .38, streak) + smoothstep(.60, .64, streak)) * .5 - .5;
  float figure = railNoise(vec2(railAt.x * .25 + seed * 5.0, (across + bend) * 7.0 + seed * 3.0)) - .5;
  float fine = smoothstep(.70, .78, railNoise(vec2(railAt.x * 1.6 + seed * 3.0, (across + bend) * 90.0)));
  float px = fwidth(across);
  float far = 1.0 - smoothstep(.02, .075, px), near = 1.0 - smoothstep(.004, .012, px);
  diffuseColor.rgb *= 1.0 + railGrain.x * ${strength.toFixed(3)} * (far * (tone * .13 + figure * .10) - near * fine * .07);
}`);
  };
  material.customProgramCacheKey = () => `map-ends-grain-v1:${strength.toFixed(3)}`;
}

/** The moulded rails of one map, for all three wrap copies. */
export function buildMouldedMapEnds(map: GameMap, style: MapEndsStyle, m: MouldedRailStyle,
  register?: (material: MeshStandardMaterial) => void): { group: Group; dispose(): void } {
  const group = new Group(); group.name = 'map-ends';
  const wood = new MeshStandardMaterial({ color: 0xffffff, roughness: .85, metalness: 0, vertexColors: true });
  installGrain(wood, m.grain);
  register?.(wood);
  const shadeMaterial = new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
  const period = ROOT3 * map.width;
  const scaleD = m.width / PROFILE_WIDTH, scaleY = m.rise / PROFILE_RISE;
  const flatProfile = PROFILE.map((p, i) => ({ ...p, d: p.d * scaleD, y: i === PROFILE.length - 1 ? -m.foot : p.y * scaleY }));
  const flatApron = { chamferY: APRON.chamferY * scaleY, lipIn: APRON.lipIn * scaleD, lipOut: APRON.lipOut * scaleD, lipY: APRON.lipY * scaleY, ledgeIn: APRON.ledgeIn * scaleD, ledgeY: APRON.ledgeY * scaleY };
  const seamColor = new Color(m.seam), wornColor = new Color(m.worn), brass = new Color(m.brass), brassLight = new Color(m.brassLight), bed = new Color(m.bed);

  const positions: number[] = [], colors: number[] = [], rails: number[] = [];
  const shadePositions: number[] = [], shadeColors: number[] = [];
  const shadeColor = new Color(m.shade.color);

  for (const end of [-1, 1] as const) {
    const row = end < 0 ? 0 : map.height - 1, shift = (row % 2) * .5;
    // `d` is measured outward from this line: the points of the last row, plus the gap.
    const z0 = row * 1.5 + end * (1 + style.gap);
    const x0 = -ROOT3 / 2 + ROOT3 * shift;
    const at = (x: number, d: number, y: number): Point => [x, y, z0 + end * d];
    // The raised heights (see `raised` on the style), the same at both ends. Points 0 to 14 of the profile are above the ground; 8 to 14 are the lip.
    const raised = m.raised, raise = raised?.raise ?? 0, wallAtCut = raised !== undefined && raised.wall !== 'behind';
    const apronRaise = wallAtCut ? raise : 0;
    const profile = flatProfile.map((p, i) => ({ ...p, y: p.y + (i > 14 ? 0 : (i === 0 ? apronRaise : raise) + (i >= 8 ? raised?.lip ?? 0 : 0)) }));
    const apron = { ...flatApron, chamferY: flatApron.chamferY + apronRaise, lipY: flatApron.lipY + apronRaise, ledgeY: flatApron.ledgeY + apronRaise };
    /** A flat face. `ref` says which way it looks, so the winding is right at both ends. */
    const face = (points: Point[], ref: Point, tones: Color | Color[], grain: number, seed: number): void => {
      const [a, b, c] = [points[0]!, points[1]!, points[2]!];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const flip = (uy * vz - uz * vy) * ref[0] + (uz * vx - ux * vz) * ref[1] + (ux * vy - uy * vx) * ref[2] < 0;
      const south = grain > 0 ? Math.max(0, ref[2]) / (Math.hypot(ref[0], ref[1], ref[2]) || 1) * m.southLift : 0;
      const lifted = (tone: Color): Color => south > 0 ? tone.clone().multiplyScalar(1 + south).offsetHSL(.012 * south, .25 * south, 0) : tone;
      const list = Array.isArray(tones) ? tones.map(lifted) : lifted(tones);
      for (let i = 1; i < points.length - 1; i++) for (const k of flip ? [0, i + 1, i] : [0, i, i + 1]) {
        const p = points[k]!, tone = Array.isArray(list) ? list[k]! : list;
        positions.push(p[0], p[1], p[2]); colors.push(tone.r, tone.g, tone.b); rails.push(grain, seed);
      }
    };
    const up: Point = [0, 1, 0];
    /** Which way the face between two points of a profile looks. */
    const outward = (d0: number, y0: number, d1: number, y1: number): Point => [0, d1 - d0, end * (y0 - y1)];
    /** A plank's own colour: its member's colour, moved a little in tone and hue. */
    const plankColor = (member: Member, index: number): { color: Color; seed: number } => {
      const key = ['apron', 'board', 'lip', 'skirt'].indexOf(member) + (end > 0 ? 4 : 0);
      const a = hash(key, index, 1), b = hash(key, index, 2);
      const color = new Color(m.woods[member]).offsetHSL((b - .5) * .02, (b - .5) * .04, (a - .5) * m.toneVary);
      return { color, seed: hash(key, index, 3) };
    };
    const toned = (base: Color, tone: number, worn = false): Color => {
      const color = base.clone().multiplyScalar(tone);
      return worn ? color.lerp(wornColor, m.wear) : color;
    };
    /** Where the joints of a member fall, as whole columns from the rail's west end. Joints sit on the notches, between two ticks. */
    const joints = (member: Member, offset: number): number[] => {
      const count = Math.max(1, Math.round(map.width / m.planks[member]));
      return Array.from({ length: count + 1 }, (_, k) => Math.round(k * map.width / count) + offset);
    };

    // --- The apron: cut to the hexes, a column at a time. ---
    const apronJoints = joints('apron', 1);
    const apronPlank = (col: number): number => {
      let index = 0;
      for (let k = 0; k < apronJoints.length - 1; k++) if (col >= apronJoints[k]!) index = k;
      return col < apronJoints[0]! ? apronJoints.length - 2 : index;
    };
    const ledgeOut = profile[0]!.d;
    for (let col = 0; col < map.width; col++) {
      const { color: base, seed } = plankColor('apron', apronPlank(col));
      const x = ROOT3 * (col + shift), left = x - ROOT3 / 2, right = x + ROOT3 / 2;
      // The two halves of the cut under one hex: from a notch (d = -0.5) to the point (d = 0).
      for (const [ax, ad, bx, bd] of [[left, -.5, x, 0], [x, 0, right, -.5]] as const) {
        const band = (s0: number, y0: number, s1: number, y1: number, tone0: Color, tone1: Color, grain: number): void =>
          face([at(ax, ad + s0, y0), at(bx, bd + s0, y0), at(bx, bd + s1, y1), at(ax, ad + s1, y1)], outward(s0, y0, s1, y1), [tone0, tone0, tone1, tone1], grain, seed);
        // The cut side, dark at the foot: the shade where the rail meets the ground.
        if (apronRaise > 0) {
          // A wall that faces the camera: dark where it meets the ground, then the wood's own tone up to the chamfer.
          const ground = raised!.ground, knee = ground + (apron.chamferY - ground) * .35;
          band(0, -m.foot, 0, ground, toned(base, .3), toned(base, .4), .6);
          band(0, ground, 0, knee, toned(base, .4), toned(base, .8), .8);
          band(0, knee, 0, apron.chamferY, toned(base, .8), toned(base, 1.02), 1);
          // The wall's shade on the ground. The board's shadow map does not show on the ground tiles, so the shade is laid
          // here as the table's is: a strip that fades out, a little above flat land so the chart paper takes it too.
          const reach = raised!.shadeReach, lift = raised!.shadeLift;
          const strip = [at(ax, ad, lift), at(bx, bd, lift), at(bx, bd - reach, lift), at(ax, ad - reach, lift)];
          for (const k of end < 0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]) {
            shadePositions.push(...strip[k]!);
            shadeColors.push(shadeColor.r, shadeColor.g, shadeColor.b, k < 2 ? raised!.shadeAlpha : 0);
          }
        } else band(0, -m.foot, 0, apron.chamferY, toned(base, .34), toned(base, .7), .6);
        band(0, apron.chamferY, apron.lipIn, apron.lipY, toned(base, 1.08, true), toned(base, 1.08, true), .5);
        band(apron.lipIn, apron.lipY, apron.lipOut, apron.lipY, toned(base, 1), toned(base, 1), 1);
        band(apron.lipOut, apron.lipY, apron.ledgeIn, apron.ledgeY, toned(base, .72), toned(base, .72), .3);
        // The ledge, out to the straight line where the board begins. A little darker toward the board's bevel.
        const ledge = toned(base, .93), ledgeFar = toned(base, .86);
        face([at(ax, ad + apron.ledgeIn, apron.ledgeY), at(bx, bd + apron.ledgeIn, apron.ledgeY), at(bx, ledgeOut, apron.ledgeY), at(ax, ledgeOut, apron.ledgeY)], up, [ledge, ledge, ledgeFar, ledgeFar], 1, seed);
      }
    }
    // The apron's joints: a dark line from a notch to the board.
    for (const joint of apronJoints.slice(0, -1)) {
      const x = x0 + ROOT3 * (joint % map.width), half = m.seamWidth / 2;
      face([at(x - half, -.5 + apron.lipIn, apron.lipY + .002), at(x + half, -.5 + apron.lipIn, apron.lipY + .002), at(x + half, -.5 + apron.lipOut, apron.lipY + .002), at(x - half, -.5 + apron.lipOut, apron.lipY + .002)], up, seamColor, 0, 0);
      face([at(x - half, -.5 + apron.ledgeIn, apron.ledgeY + .002), at(x + half, -.5 + apron.ledgeIn, apron.ledgeY + .002), at(x + half, ledgeOut, apron.ledgeY + .002), at(x - half, ledgeOut, apron.ledgeY + .002)], up, seamColor, 0, 0);
    }

    // --- The straight members: each plank is the profile pulled along its length. ---
    const members: { member: Member; from: number; to: number; offset: number; skew: number }[] = [
      { member: 'board', from: 0, to: 4, offset: 3, skew: 0 },
      { member: 'lip', from: 4, to: 15, offset: 0, skew: 1 },
      { member: 'skirt', from: 15, to: profile.length - 1, offset: 2, skew: 0 },
    ];
    const boardJoints: number[] = [], lipJoints: number[] = [];
    for (const { member, from, to, offset, skew } of members) {
      const list = joints(member, offset), middle = (profile[from]!.d + profile[to]!.d) / 2, half = m.seamWidth / 2;
      // A scarf joint slants across the member; a butt joint is square.
      const slant = (d: number): number => skew * (d - middle);
      for (let k = 0; k < list.length - 1; k++) {
        const { color: base, seed } = plankColor(member, k);
        const west = x0 + ROOT3 * list[k]!, east = x0 + ROOT3 * list[k + 1]!;
        if (member === 'board') boardJoints.push(west); else if (member === 'lip') lipJoints.push(west);
        for (let i = from; i < to; i++) {
          const p = profile[i]!, q = profile[i + 1]!, ref = outward(p.d, p.y, q.d, q.y);
          // With the wall behind the points, the board's bevel is the wall: darker at its foot, on the apron.
          const wall = i === 0 && raised !== undefined && !wallAtCut;
          const tone0 = toned(base, wall ? .55 : p.tone, p.worn), tone1 = toned(base, wall ? .95 : p.toneEnd ?? p.tone, p.worn);
          const grain = p.worn ? .5 : p.tone < .7 ? .3 : 1;
          face([at(west + half + slant(p.d), p.d, p.y), at(east - half + slant(p.d), p.d, p.y), at(east - half + slant(q.d), q.d, q.y), at(west + half + slant(q.d), q.d, q.y)], ref, [tone0, tone0, tone1, tone1], grain, seed);
          // The joint at the plank's west end: the same face, a little sunk and dark.
          const sink = .006, length = Math.hypot(ref[1], ref[2]) || 1, nd = end * ref[2] / length * sink, ny = ref[1] / length * sink;
          face([at(west - half + slant(p.d), p.d - nd, p.y - ny), at(west + half + slant(p.d), p.d - nd, p.y - ny), at(west + half + slant(q.d), q.d - nd, q.y - ny), at(west - half + slant(q.d), q.d - nd, q.y - ny)], ref, seamColor, 0, 0);
        }
        if (member === 'lip' && raised) {
          // A raised rail has a tall outer side. One belt across it, a third of the way up, keeps it from reading as a slab.
          const outer = profile[14]!, foot = profile[15]!, low = foot.y + (outer.y - foot.y) * .34, d = outer.d, out = d + .016 * scaleD;
          const belt: [number, number, number, boolean][] = [[d, low + .062, 1.05, true], [out, low + .046, .9, false], [out, low + .008, .62, false], [d, low, .62, false]];
          for (let i = 0; i < belt.length - 1; i++) {
            const [d0, y0, tone, worn] = belt[i]!, [d1, y1] = belt[i + 1]!;
            face([at(west + half + slant(d0), d0, y0), at(east - half + slant(d0), d0, y0), at(east - half + slant(d1), d1, y1), at(west + half + slant(d1), d1, y1)], outward(d0, y0, d1, y1), toned(base, tone, worn), worn ? .5 : 1, seed);
          }
        }
      }
    }

    // --- The brass scale on the board's top. ---
    const top = profile[2]!.y, lineD = SCALE.line * scaleD, lineWidth = SCALE.lineWidth * scaleD;
    /** A flat bar of brass in its dark bed. `(x, d)` corners; the bed is a little wider and a little lower. */
    const inlay = (xa: number, xb: number, da: number, db: number): void => {
      const b = SCALE.bed * scaleD;
      face([at(xa - b, da - b, top + .0015), at(xb + b, da - b, top + .0015), at(xb + b, db + b, top + .0015), at(xa - b, db + b, top + .0015)], up, bed, 0, 0);
      face([at(xa, da, top + .004), at(xb, da, top + .004), at(xb, db, top + .004), at(xa, db, top + .004)], up, [brass, brass, brassLight, brassLight], 0, 0);
    };
    /** A stroke of brass between two points, for the figures. */
    const stroke = (xa: number, da: number, xb: number, db: number, width: number, tone: Color, lift: number): void => {
      const length = Math.hypot(xb - xa, db - da) || 1, px = -(db - da) / length * width / 2, pd = (xb - xa) / length * width / 2;
      const ex = (xb - xa) / length * width / 2, ed = (db - da) / length * width / 2;
      face([at(xa - ex + px, da - ed + pd, top + lift), at(xb + ex + px, db + ed + pd, top + lift), at(xb + ex - px, db + ed - pd, top + lift), at(xa - ex - px, da - ed - pd, top + lift)], up, tone, 0, 0);
    };
    /** A small six-sided stud or peg, a low pyramid. */
    const stud = (x: number, d: number, y: number, radius: number, height: number, tone: Color, light: Color): void => {
      const ring: Point[] = Array.from({ length: 6 }, (_, i) => at(x + Math.cos(i * Math.PI / 3) * radius, d + Math.sin(i * Math.PI / 3) * radius, y));
      const ringBed: Point[] = Array.from({ length: 6 }, (_, i) => at(x + Math.cos(i * Math.PI / 3) * radius * 1.4, d + Math.sin(i * Math.PI / 3) * radius * 1.4, y - .002));
      face(ringBed, up, bed, 0, 0);
      const peak = at(x, d, y + height);
      for (let i = 0; i < 6; i++) face([ring[i]!, ring[(i + 1) % 6]!, peak], up, [tone, tone, light], 0, 0);
    };
    inlay(x0, x0 + period, lineD, lineD + lineWidth);
    for (let col = 0; col < map.width; col++) {
      const x = ROOT3 * (col + shift), major = col % m.scale.majorEvery === 0;
      const reach = (major ? SCALE.majorTick : SCALE.tick) * scaleD;
      inlay(x - lineWidth / 2, x + lineWidth / 2, lineD - reach, lineD - SCALE.bed * scaleD);
      if (!major || !m.scale.numerals) continue;
      // The column's number, read from the south at both ends: the top of a figure is toward the north.
      const inner = SCALE.numeralIn * scaleD, outer = SCALE.numeralOut * scaleD, height = outer - inner;
      const foot = end < 0 ? inner : outer, rise = end < 0 ? 1 : -1;
      if (col === 0) {
        // The first column carries a diamond and no figure.
        const mid = (inner + outer) / 2, r = height * .42;
        face([at(x - r * .8, mid, top + .004), at(x, mid + r, top + .004), at(x + r * .8, mid, top + .004), at(x, mid - r, top + .004)], up, [brass, brassLight, brass, brass], 0, 0);
        continue;
      }
      const figures = roman(col).split('').map(letter => FIGURES[letter]!);
      const gap = .16, total = figures.reduce((sum, f) => sum + f.width, 0) + gap * (figures.length - 1);
      let cursor = x - total * height / 2;
      for (const figure of figures) {
        for (const line of figure.strokes) for (let i = 0; i < line.length - 1; i++) {
          const [ax, ay] = line[i]!, [bx, by] = line[i + 1]!;
          const xa = cursor + ax * height, xb = cursor + bx * height, da = foot + rise * ay * height, db = foot + rise * by * height;
          stroke(xa, da, xb, db, (SCALE.stroke + SCALE.bed) * scaleD, bed, .0015);
          stroke(xa, da, xb, db, SCALE.stroke * scaleD, brass, .004);
        }
        cursor += (figure.width + gap) * height;
      }
    }
    if (m.scale.studs) {
      // Two brass studs each side of a joint in the board, and a dark peg each side of a joint in the lip.
      for (const x of boardJoints) for (const side of [-1, 1]) for (const d of [.225, .43])
        stud(x + side * .06, d * scaleD, top, .016, .012, brass, brassLight);
      const lipTop = profile[11]!, lipMid = (profile[11]!.d + profile[12]!.d) / 2, lipMiddle = (profile[4]!.d + profile[15]!.d) / 2;
      const peg = seamColor.clone().lerp(new Color(m.woods.lip), .35);
      for (const x of lipJoints) for (const side of [-1, 1])
        stud(x + lipMid - lipMiddle + side * .075, lipMid, lipTop.y, .012, .004, peg, peg);
    }

    // --- The shade on the table at the rail's foot. ---
    const reach = end > 0 ? m.shade.south : m.shade.north, footD = profile[profile.length - 1]!.d, y = -m.foot + .002;
    const quad = [at(x0, footD, y), at(x0 + period, footD, y), at(x0 + period, footD + reach, y), at(x0, footD + reach, y)];
    for (const k of end > 0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]) {
      shadePositions.push(...quad[k]!);
      shadeColors.push(shadeColor.r, shadeColor.g, shadeColor.b, k < 2 ? m.shade.alpha : 0);
    }
  }

  const rail = new BufferGeometry();
  rail.setAttribute('position', new Float32BufferAttribute(positions, 3));
  rail.setAttribute('color', new Float32BufferAttribute(colors, 3));
  rail.setAttribute('rail', new Float32BufferAttribute(rails, 2));
  rail.computeVertexNormals();
  const shade = new BufferGeometry();
  shade.setAttribute('position', new Float32BufferAttribute(shadePositions, 3));
  shade.setAttribute('color', new Float32BufferAttribute(shadeColors, 4));

  for (const dx of [-period, 0, period]) {
    const railMesh = new Mesh(rail, wood), shadeMesh = new Mesh(shade, shadeMaterial);
    railMesh.name = 'map-ends-rail'; shadeMesh.name = 'map-ends-shade';
    railMesh.castShadow = true; railMesh.receiveShadow = true;
    for (const mesh of [railMesh, shadeMesh]) { mesh.position.x = dx; mesh.matrixAutoUpdate = false; mesh.updateMatrix(); group.add(mesh); }
  }
  return { group, dispose: () => { rail.dispose(); shade.dispose(); wood.dispose(); shadeMaterial.dispose(); } };
}
