/**
 * The drawn resource marks: one ink pictogram per row of `data/resources.json`,
 * as path data rather than as files.
 *
 * Why this module exists at all
 * ----------------------------
 * The marks used to be forty-one SVG files under `public/sprites/icons/`, of
 * which seventeen had actually been drawn; every other resource fell through to
 * the emoji on its row, on the board *and* in every DOM panel that named it. An
 * emoji is a placeholder that never reads as this project's ink — it arrives in
 * the platform's colour, at the platform's weight, in a family that changes
 * between a Mac and a phone — so the whole set is drawn here instead, in the
 * language `public/sprites/CREDITS.md` describes: a 64 × 64 grid, one ink, round
 * caps and joins, the same optical weight the eight unit badges are drawn at.
 *
 * Path *data* and not files, because the mark has two consumers and they wanted
 * the same drawing rather than two copies of it:
 *
 *   the atlas   `TileIcons` in `src/render3d/badges3d.ts` traces these into the
 *               printed atlas cell with `Path2D`, in `icons.inkColor`, on the
 *               kind-shaped paper. No image load, no recolour scratch canvas,
 *               and one fewer thing that can 404 at boot.
 *   the panels  `src/ui/resourceMark.ts` turns the same paths into a data-URI
 *               SVG and uses it as a CSS *mask*, so the ink is `currentColor` —
 *               which is the only way one drawing can sit on parchment in a city
 *               panel and on ink in the top bar without two files.
 *
 * Nothing here imports the resource table, and that is deliberate: the registry
 * is keyed by plain string, so a row installed at runtime (see the
 * "a resource nobody wrote code for" suite) simply misses and every caller falls
 * back to the row's `emoji`. `emoji` therefore stays in the schema as the
 * last-resort glyph and nothing else — no resource that ships has one showing.
 *
 * The vocabulary, not forty-one blobs
 * -----------------------------------
 * Shapes repeat across the table — leaves, ingots, drops, dots, crystals — so
 * they are drawn once as helpers that return path data and composed per mark.
 * `cube` is the clearest case: it reproduces the stone block and the salt
 * crystal *exactly* as the two hand-authored files drew them, which is how the
 * port was checked. Adding a mark for a future resource is one entry in
 * `RESOURCE_MARKS`, usually assembled out of what is already here.
 */

/** The grid every mark is authored on. Square, and the same one the badges use. */
export const MARK_BOX = 64;

/** The house stroke weight, in grid units. */
export const MARK_STROKE = 5;

/**
 * The lighter weight the *filled* shapes are outlined at.
 *
 * A filled lobe carries its own mass, so stroking it at the full weight fattens
 * it past everything around it — the hand-drawn wheat and grape files already
 * made this distinction and it is kept.
 */
export const MARK_STROKE_FILLED = 4;

/**
 * One traced path of a mark.
 *
 * `fill` and the stroke are not exclusive: almost every filled shape here is
 * also stroked, because a fill alone loses the round-jointed edge that makes
 * the set read as one hand.
 */
export interface MarkPath {
  /** SVG path data, in the 64 × 64 grid. */
  d: string;
  /** Filled as well as stroked. Default false — an open stroke. */
  fill?: boolean;
  /** Stroke weight, in grid units. Defaults to the house weight. */
  width?: number;
}

/** One resource's drawing, plus the sentence that says what it depicts. */
export interface ResourceMark {
  /** What the mark is a picture of. The row `CREDITS.md` prints. */
  note: string;
  paths: readonly MarkPath[];
}

// --- the stroke vocabulary --------------------------------------------------

/** Two decimals, trailing zeroes gone: path data a human can still read. */
function n(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** Degrees to radians, because every angle below is written in degrees. */
function rad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** A point on a circle, as the `x y` pair path data wants. */
function polar(cx: number, cy: number, r: number, degrees: number): string {
  return `${n(cx + r * Math.cos(rad(degrees)))} ${n(cy + r * Math.sin(rad(degrees)))}`;
}

/** A straight segment. */
export function line(x1: number, y1: number, x2: number, y2: number): string {
  return `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`;
}

/**
 * A closed polygon from a flat list of coordinates.
 *
 * Flat rather than an array of pairs because these are written by hand and a
 * list of numbers is what a hand writes; the length is checked so a dropped
 * coordinate is a loud failure at load rather than a mark with a stray corner.
 */
export function poly(...coords: number[]): string {
  if (coords.length < 6 || coords.length % 2 !== 0) {
    throw new Error(`resourceMarks: a polygon needs pairs of coordinates, got ${coords.length}`);
  }
  const parts: string[] = [];
  for (let i = 0; i < coords.length; i += 2) {
    parts.push(`${i === 0 ? 'M' : 'L'}${n(coords[i]!)} ${n(coords[i + 1]!)}`);
  }
  return `${parts.join('')}Z`;
}

/**
 * A full circle, as two half-arcs.
 *
 * One string rather than an `<circle>` element so that every member of a mark is
 * the same kind of thing — a `d` — and both consumers need exactly one code path
 * (`Path2D`, `<path>`) instead of two.
 */
export function dot(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0Z`;
}

/**
 * A four-point sparkle: two crossed strokes, no fill.
 *
 * The salt crystal's two glints, factored out — lapis and the gold ingot want
 * the same mark for the same reason, which is that "this thing catches light"
 * is a property several rows of the table share.
 */
export function spark(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}H${n(cx + r)}M${n(cx)} ${n(cy - r)}V${n(cy + r)}`;
}

/**
 * A pointed almond leaf, centred on `(cx, cy)`, its long axis along `angle`.
 *
 * `bulge` is the control-point offset rather than the half-width, so a leaf
 * reads about half that far out at its widest. Written that way because it is
 * the number being tuned by eye — nobody drawing a tea leaf is solving for its
 * exact waist.
 */
export function leaf(
  cx: number,
  cy: number,
  length: number,
  bulge: number,
  angle: number,
): string {
  const c = Math.cos(rad(angle));
  const s = Math.sin(rad(angle));
  const at = (x: number, y: number) => `${n(cx + x * c - y * s)} ${n(cy + x * s + y * c)}`;
  const half = length / 2;
  return `M${at(-half, 0)}Q${at(0, -bulge)} ${at(half, 0)}Q${at(0, bulge)} ${at(-half, 0)}Z`;
}

/**
 * A teardrop: a point at the top over a round belly.
 *
 * Amber, honey and a dye vat's drip are the same shape at three sizes, and a
 * drop is one of the two or three silhouettes that still reads at twenty pixels.
 */
export function drop(cx: number, cy: number, halfW: number, height: number): string {
  const top = cy - height / 2;
  const bottom = cy + height / 2;
  return (
    `M${n(cx)} ${n(top)}` +
    `C${n(cx + halfW * 1.15)} ${n(top + height * 0.45)} ${n(cx + halfW)} ${n(bottom - height * 0.02)} ${n(cx)} ${n(bottom)}` +
    `C${n(cx - halfW)} ${n(bottom - height * 0.02)} ${n(cx - halfW * 1.15)} ${n(top + height * 0.45)} ${n(cx)} ${n(top)}Z`
  );
}

/**
 * A cast bar seen square on: a trapezoid, wider at its foot.
 *
 * `taper` is how much narrower the top edge is, as a fraction of the half-width.
 * Four rows of the table are a bar of metal and the difference between them is
 * the mark punched on it, not the bar — see `silver` and `gold`.
 */
export function ingot(
  cx: number,
  cy: number,
  halfW: number,
  height: number,
  taper = 0.28,
): string {
  const top = halfW * (1 - taper);
  return poly(
    cx - top,
    cy - height / 2,
    cx + top,
    cy - height / 2,
    cx + halfW,
    cy + height / 2,
    cx - halfW,
    cy + height / 2,
  );
}

/**
 * A block in three-quarter view: top rhombus, then the two visible faces.
 *
 * Three subpaths in one `d`, all stroked at one weight and none filled — which
 * is exactly how the hand-drawn `stone.svg` and `salt.svg` were built, and this
 * reproduces both of them to the coordinate. That equality is the check that the
 * port did not quietly redraw the two marks that already existed.
 */
export function cube(
  cx: number,
  topY: number,
  halfW: number,
  rise: number,
  depth: number,
): string {
  const midY = topY + rise;
  const lowY = topY + rise * 2;
  return (
    poly(cx, topY, cx + halfW, midY, cx, lowY, cx - halfW, midY) +
    `M${n(cx - halfW)} ${n(midY)}V${n(midY + depth)}L${n(cx)} ${n(lowY + depth)}V${n(lowY)}` +
    `M${n(cx + halfW)} ${n(midY)}V${n(midY + depth)}L${n(cx)} ${n(lowY + depth)}`
  );
}

/** A stem bowed sideways by `bend`: one quadratic, foot first. */
export function stalk(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  bend: number,
): string {
  return `M${n(x0)} ${n(y0)}Q${n((x0 + x1) / 2 + bend)} ${n((y0 + y1) / 2)} ${n(x1)} ${n(y1)}`;
}

/**
 * A crescent band: the arc from `a0` to `a1` at `rOuter`, back at `rInner`.
 *
 * A tusk, a banana and a waning moon are one shape with three sets of numbers,
 * which is the whole argument for a vocabulary.
 */
export function crescent(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  a0: number,
  a1: number,
): string {
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return (
    `M${polar(cx, cy, rOuter, a0)}A${n(rOuter)} ${n(rOuter)} 0 ${large} 1 ${polar(cx, cy, rOuter, a1)}` +
    `L${polar(cx, cy, rInner, a1)}A${n(rInner)} ${n(rInner)} 0 ${large} 0 ${polar(cx, cy, rInner, a0)}Z`
  );
}

/**
 * A ribbed fan hinged at `(cx, cy)`: the shell silhouette, then its ribs.
 *
 * The ribs are subpaths of the same `d` so the whole shell is one entry — they
 * are never drawn without the outline, and a caller that could forget one is a
 * caller that will.
 */
export function fan(
  cx: number,
  cy: number,
  r: number,
  ribs: number,
  a0: number,
  a1: number,
): string {
  let d = `M${n(cx)} ${n(cy)}L${polar(cx, cy, r, a0)}A${n(r)} ${n(r)} 0 0 1 ${polar(cx, cy, r, a1)}Z`;
  const count = Math.max(0, Math.round(ribs));
  for (let i = 1; i <= count; i++) {
    const angle = a0 + ((a1 - a0) * i) / (count + 1);
    d += `M${polar(cx, cy, r * 0.18, angle)}L${polar(cx, cy, r * 0.86, angle)}`;
  }
  return d;
}

/**
 * A logarithmic-ish spiral, as a polyline fine enough to read as a curve.
 *
 * Sampled rather than fitted with arcs: a whelk's whorl is the one shape here
 * whose *taper* is the point, and stepping the radius linearly per sample is
 * both the simplest way to get it and the only one whose failure mode is a
 * slightly faceted curve rather than a wrong shape.
 */
export function spiral(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  turns: number,
  steps = 48,
): string {
  const parts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = rOuter + (rInner - rOuter) * t;
    const angle = -90 + turns * 360 * t;
    parts.push(`${i === 0 ? 'M' : 'L'}${polar(cx, cy, r, angle)}`);
  }
  return parts.join('');
}

// --- the registry -----------------------------------------------------------

/**
 * A stroked path at the house weight — the default, and most of the table.
 *
 * Exported with `solid` because they are the two verbs of the drawing language
 * rather than two helpers of this table: `src/art/siteMarks.ts` draws the ruin
 * and the village in the same hand, and a second pair of one-line wrappers over
 * there would be the place the two hands quietly drift apart.
 */
export function ink(d: string): MarkPath {
  return { d };
}

/** A filled shape, outlined at the lighter weight. See `MARK_STROKE_FILLED`. */
export function solid(d: string): MarkPath {
  return { d, fill: true, width: MARK_STROKE_FILLED };
}

/**
 * Every drawn mark, keyed by resource id.
 *
 * A plain string key, not `Record<ResourceId, …>`: the point of the fallback is
 * that a row can exist with no drawing, and a type that forbade the gap would
 * make adding a resource a TypeScript edit again (see `resourceData.ts`, "a new
 * row costs no TypeScript"). The completeness of *this* table against the
 * shipped one is asserted in `test/resources3d.test.ts` instead, which is the
 * right place for it: a fact about the art, checked, rather than a fact about
 * the language, enforced.
 *
 * Order follows `data/resources.json` — bonus, strategic, luxury — so the two
 * can be read side by side.
 */
export const RESOURCE_MARKS: Readonly<Record<string, ResourceMark>> = {
  // --- bonus ---------------------------------------------------------------
  wheat: {
    note: 'a bound sheaf, three stalks and a tie',
    paths: [
      ink('M32 56V24'),
      ink('M20 54C16 44 16 34 19 26'),
      ink('M44 54C48 44 48 34 45 26'),
      solid('M32 24C27 20 25 14 26 8C31 10 33 16 32 24Z'),
      solid('M32 24C37 20 39 14 38 8C33 10 31 16 32 24Z'),
      solid('M19 26C15 23 13 18 14 13C18 15 20 20 19 26Z'),
      solid('M45 26C49 23 51 18 50 13C46 15 44 20 45 26Z'),
      ink('M17 42H47'),
    ],
  },
  cattle: {
    note: "a cow's head, horns out",
    paths: [
      ink('M22 28C22 20 42 20 42 28C42 44 37 52 32 52C27 52 22 44 22 28Z'),
      ink('M23 27C16 22 12 15 16 11C21 13 24 19 24 25'),
      ink('M41 27C48 22 52 15 48 11C43 13 40 19 40 25'),
      { d: dot(27, 42, 2.5), fill: true, width: 0 },
      { d: dot(37, 42, 2.5), fill: true, width: 0 },
    ],
  },
  deer: {
    note: 'a branching pair of antlers',
    paths: [
      ink('M32 56V36'),
      ink('M32 36C26 30 23 22 23 12'),
      ink(line(27, 25, 16, 20)),
      ink(line(24, 17, 14, 11)),
      ink('M32 36C38 30 41 22 41 12'),
      ink(line(37, 25, 48, 20)),
      ink(line(40, 17, 50, 11)),
    ],
  },
  fish: {
    note: 'a fish, tail to the right',
    paths: [
      ink('M10 32C18 19 38 19 46 32C38 45 18 45 10 32Z'),
      ink('M46 32L58 23V41Z'),
      { d: dot(21, 28, 2.5), fill: true, width: 0 },
    ],
  },
  stone: {
    note: 'a cut block in three-quarter view',
    paths: [ink(cube(32, 12, 20, 10, 20))],
  },
  rice: {
    note: 'three drooping stalks standing in water',
    paths: [
      ink(stalk(32, 46, 32, 14, 0)),
      ink(stalk(22, 48, 17, 22, -5)),
      ink(stalk(42, 48, 47, 22, 5)),
      solid(leaf(32, 12, 13, 7, 90)),
      solid(leaf(15, 20, 12, 6, 108)),
      solid(leaf(49, 20, 12, 6, 72)),
      ink('M8 52C14 48 20 56 26 52C32 48 38 56 44 52C50 48 54 54 58 52'),
    ],
  },
  maize: {
    note: 'a cob in its husk, kernels ranked',
    paths: [
      ink('M32 8C41 14 44 28 41 42C39 52 35 56 32 56C29 56 25 52 23 42C20 28 23 14 32 8Z'),
      ink(line(24, 26, 40, 26)),
      ink(line(24, 36, 40, 36)),
      ink(line(32, 16, 32, 50)),
      ink(leaf(15, 40, 34, 13, 108)),
      ink(leaf(49, 40, 34, 13, 72)),
    ],
  },
  bananas: {
    note: 'a single fruit, stem up',
    paths: [
      // One fruit, not three, and that is a legibility decision rather than a
      // botanical one: a *hand* of bananas at twenty pixels is three crescents
      // whose gaps close into one black mound, and splaying them instead reads
      // as a fork. The single crescent is what every reader already knows.
      solid(crescent(46, 14, 38, 29, 100, 175)),
      ink(line(12, 17, 9, 7)),
    ],
  },
  copper: {
    note: 'an oxhide ingot, four horns and a hollowed waist',
    paths: [
      ink(
        'M10 8C22 24 42 24 54 8C46 24 46 40 54 56C42 40 22 40 10 56C18 40 18 24 10 8Z',
      ),
    ],
  },
  tin: {
    note: 'two cast bars, stacked',
    paths: [ink(ingot(30, 24, 18, 14)), ink(ingot(34, 42, 18, 14))],
  },
  clay: {
    note: 'a coil pot, its rim thrown wide',
    paths: [
      ink('M22 16H42L38 24C48 30 48 48 40 54H24C16 48 16 30 26 24Z'),
      ink('M18 36C26 32 38 32 46 36'),
      ink('M18 45C26 41 38 41 46 45'),
    ],
  },
  reeds: {
    note: 'papyrus stems under their umbels',
    paths: [
      ink(stalk(30, 58, 30, 26, -3)),
      ink(stalk(44, 58, 46, 34, 3)),
      ink(stalk(18, 58, 16, 38, -3)),
      ink(line(30, 26, 20, 12)),
      ink(line(30, 26, 30, 8)),
      ink(line(30, 26, 40, 12)),
      ink(line(30, 26, 15, 20)),
      ink(line(30, 26, 45, 20)),
    ],
  },
  crabs: {
    note: 'a crab, claws raised',
    paths: [
      ink('M18 36C18 26 24 20 32 20C40 20 46 26 46 36C46 42 40 46 32 46C24 46 18 42 18 36Z'),
      { d: dot(26, 30, 2.5), fill: true, width: 0 },
      { d: dot(38, 30, 2.5), fill: true, width: 0 },
      ink('M18 34C13 34 9 31 7 26'),
      ink('M46 34C51 34 55 31 57 26'),
      ink('M7 26L2 28M7 26L5 20'),
      ink('M57 26L62 28M57 26L59 20'),
      ink(line(21, 44, 13, 54)),
      ink(line(28, 46, 24, 58)),
      ink(line(36, 46, 40, 58)),
      ink(line(43, 44, 51, 54)),
    ],
  },
  bison: {
    note: 'a bison head, shaggy crown and short horns',
    paths: [
      // Broad and blunt where `cattle` is narrow and long, and the beard is the
      // tell: the two are the same animal at icon size otherwise.
      ink('M13 30C13 20 21 15 32 15C43 15 51 20 51 30C51 36 47 40 44 42C42 51 38 56 32 56C26 56 22 51 20 42C17 40 13 36 13 30Z'),
      ink('M14 26C10 22 11 16 15 16C17 18 17 22 16 25'),
      ink('M50 26C54 22 53 16 49 16C47 18 47 22 48 25'),
      ink('M23 18V12M32 15V9M41 18V12'),
      { d: dot(24, 33, 2.5), fill: true, width: 0 },
      { d: dot(40, 33, 2.5), fill: true, width: 0 },
      ink('M26 47C29 51 35 51 38 47'),
    ],
  },

  // --- strategic -----------------------------------------------------------
  horses: {
    note: "the badge set's horse head, reused verbatim",
    paths: [
      solid('M17 56C17 40 17 29 25 21L25 12L32 7L35 16C45 18 54 25 57 32C58 35 56 37 52 37L38 38C34 43 36 50 38 56Z'),
    ],
  },
  iron: {
    note: 'an anvil on its block',
    paths: [
      solid('M10 24H54C50 32 43 35 39 35V39H25V35C21 35 14 32 10 24Z'),
      solid('M22 39H42L48 51H16Z'),
    ],
  },

  // --- luxury --------------------------------------------------------------
  gems: {
    note: 'a cut gem, crown and pavilion',
    paths: [
      ink('M20 14H44L56 28L32 54L8 28Z'),
      ink('M8 28H56'),
      ink('M20 14L26 28L32 54L38 28L44 14'),
    ],
  },
  silk: {
    note: 'a banner hung from a rail',
    paths: [
      ink('M10 12H54'),
      ink('M20 12V50L26 43L32 50L38 43L44 50V12'),
      ink('M20 26C26 22 38 30 44 26'),
    ],
  },
  wine: {
    note: 'a bunch of grapes with a leaf',
    paths: [
      { d: 'M32 14V6', width: MARK_STROKE_FILLED },
      solid('M32 9C38 4 47 6 48 13C42 16 34 15 32 9Z'),
      solid(dot(32, 22, 6)),
      solid(dot(22, 31, 6)),
      solid(dot(42, 31, 6)),
      solid(dot(27, 42, 6)),
      solid(dot(37, 42, 6)),
      solid(dot(32, 53, 6)),
    ],
  },
  spices: {
    note: 'a pepper pod',
    paths: [
      solid('M42 18C48 27 45 41 34 50C25 57 14 53 16 44C19 32 30 22 42 18Z'),
      ink(line(42, 18, 45, 9)),
      ink(line(45, 9, 54, 12)),
    ],
  },
  salt: {
    note: 'a salt crystal, with two glints',
    paths: [ink(cube(32, 18, 15, 8, 15)), ink(spark(53, 14, 4)), ink(spark(9, 43, 3))],
  },
  incense: {
    note: 'a censer under three curls of smoke',
    paths: [
      ink('M14 36H50L44 52H20Z'),
      ink('M26 52V58'),
      ink('M38 52V58'),
      ink('M32 30C26 24 38 20 32 12'),
      ink('M20 30C16 26 24 22 20 16'),
      ink('M44 30C40 26 48 22 44 16'),
    ],
  },
  jade: {
    note: 'a pierced disc, the bi, on its cord',
    paths: [
      ink(dot(32, 32, 22)),
      ink(dot(32, 32, 8)),
      ink(line(32, 10, 32, 24)),
      ink(line(51, 43, 39, 36)),
      ink(line(13, 43, 25, 36)),
    ],
  },
  marble: {
    note: 'a colonnade on its stylobate',
    paths: [
      ink('M12 14H52'),
      ink('M18 22H46'),
      ink('M22 22V44'),
      ink('M32 22V44'),
      ink('M42 22V44'),
      ink('M16 44H48'),
      ink('M10 52H54'),
    ],
  },
  furs: {
    note: 'a stretched pelt',
    paths: [
      ink('M32 8C24 8 20 14 14 18C8 22 10 30 18 30C14 40 18 52 32 56C46 52 50 40 46 30C54 30 56 22 50 18C44 14 40 8 32 8Z'),
      ink('M26 26L26 30'),
      ink('M38 26L38 30'),
    ],
  },
  dyes: {
    note: 'two dye vats, dripping',
    paths: [
      ink('M10 30H30L27 54H13Z'),
      ink('M36 22H56L53 54H39Z'),
      ink('M10 30C14 24 26 24 30 30'),
      ink('M36 22C40 16 52 16 56 22'),
      ink('M22 14L22 8'),
      ink('M46 12L46 6'),
    ],
  },
  ivory: {
    note: 'a pair of tusks, tips up',
    paths: [
      // Handwritten, not a `crescent`: the vocabulary's crescent has constant
      // thickness, and a tusk that does not taper to its point is a croissant —
      // which is exactly what the first pass drew.
      solid('M37 56C49 49 57 35 57 15C50 31 42 43 29 51Z'),
      solid('M27 56C15 49 7 35 7 15C14 31 22 43 35 51Z'),
    ],
  },
  amber: {
    note: 'a drop of resin with a fly caught in it',
    paths: [
      ink(drop(32, 34, 18, 44)),
      { d: dot(32, 37, 4), fill: true, width: 0 },
      ink('M32 34C29 30 25 28 22 29'),
      ink('M32 34C35 30 39 28 42 29'),
    ],
  },
  tea: {
    note: 'a leaf, midrib and two veins',
    paths: [
      ink(leaf(32, 32, 46, 26, 315)),
      ink(line(16, 48, 48, 16)),
      ink(line(26, 38, 22, 26)),
      ink(line(38, 26, 42, 38)),
    ],
  },
  coffee: {
    note: 'a sprig of two cherries under a leaf',
    paths: [
      ink('M32 56C32 40 30 26 24 16'),
      ink(leaf(40, 20, 26, 15, 330)),
      ink(line(30, 34, 24, 33)),
      ink(line(31, 45, 38, 46)),
      solid(dot(19, 33, 9)),
      solid(dot(43, 46, 9)),
      { d: line(19, 27, 19, 39), width: MARK_STROKE_FILLED },
      { d: line(43, 40, 43, 52), width: MARK_STROKE_FILLED },
    ],
  },
  cotton: {
    note: 'a burst boll in its spiked calyx',
    paths: [
      ink(poly(32, 58, 12, 44, 20, 36, 32, 40, 44, 36, 52, 44)),
      solid(dot(21, 28, 10)),
      solid(dot(43, 28, 10)),
      solid(dot(32, 17, 10)),
      solid(dot(32, 33, 10)),
    ],
  },
  sugar: {
    note: 'two jointed canes and a blade of leaf',
    paths: [
      ink(stalk(24, 58, 22, 8, -3)),
      ink(stalk(40, 58, 44, 14, 3)),
      ink(line(19, 24, 27, 24)),
      ink(line(20, 38, 28, 38)),
      ink(line(21, 50, 29, 50)),
      ink(line(38, 30, 46, 30)),
      ink(line(37, 44, 45, 44)),
      ink('M22 8C32 12 38 20 40 30'),
    ],
  },
  olives: {
    note: 'a sprig, two leaves and two olives',
    paths: [
      ink('M32 58V20'),
      ink(leaf(20, 24, 22, 12, 200)),
      ink(leaf(44, 24, 22, 12, 340)),
      ink(line(32, 37, 26, 39)),
      ink(line(32, 45, 37, 46)),
      ink(dot(24, 40, 8)),
      ink(dot(41, 46, 8)),
    ],
  },
  lapis: {
    note: 'a polished cabochon, flecked with pyrite',
    paths: [
      ink('M8 48C8 28 20 16 32 16C44 16 56 28 56 48Z'),
      ink(spark(24, 36, 4)),
      ink(spark(40, 30, 4)),
      ink(spark(38, 43, 3)),
    ],
  },
  silver: {
    note: 'a cast bar under the moon',
    paths: [
      ink(ingot(32, 44, 22, 18)),
      // Handwritten rather than a `crescent`: the vocabulary's crescent is a
      // band of constant thickness between two *concentric* arcs, and a moon is
      // the difference of two circles with different centres — a shape whose
      // whole character is that it tapers to a point at both horns.
      solid('M40 4C31 7 26 12 26 18C26 24 31 29 40 32C34 24 34 12 40 4Z'),
    ],
  },
  gold: {
    note: 'a cast bar under the sun',
    paths: [
      ink(ingot(32, 44, 22, 18)),
      solid(dot(32, 17, 8)),
      ink('M32 3V7M32 27V31M18 17H22M42 17H46M22.1 7.1L24.9 9.9M39.1 24.1L41.9 26.9M22.1 26.9L24.9 24.1M39.1 9.9L41.9 7.1'),
    ],
  },
  honey: {
    note: 'a comb cell, dripping',
    paths: [
      ink(poly(32, 8, 47, 17, 47, 35, 32, 44, 17, 35, 17, 17)),
      ink('M17 17L4 24M17 35L4 28M47 17L60 24M47 35L60 28'),
      solid(drop(32, 52, 7, 16)),
    ],
  },
  pearls: {
    note: 'a pearl in an open shell',
    paths: [ink(fan(32, 52, 30, 4, 200, 340)), solid(dot(32, 34, 8))],
  },
  coral: {
    note: 'a branching stag coral on its foot',
    paths: [
      ink('M32 58V38'),
      ink('M32 38C24 34 18 28 16 18'),
      ink('M32 38C40 34 46 28 48 18'),
      ink('M23 29C22 22 24 14 30 8'),
      ink('M41 29C42 22 40 14 34 8'),
      ink(line(16, 18, 8, 12)),
      ink(line(48, 18, 56, 12)),
    ],
  },
  whales: {
    note: 'a fluke, sounding',
    paths: [
      ink(line(32, 50, 32, 34)),
      solid('M32 34C24 34 12 26 6 14C16 12 28 22 32 30C36 22 48 12 58 14C52 26 40 34 32 34Z'),
      ink('M6 58C12 54 18 60 24 57C30 54 36 60 42 57C48 54 54 58 58 56'),
    ],
  },
  tyrian: {
    note: 'a murex whelk, whorl and spines',
    paths: [
      ink(spiral(32, 34, 24, 4, 1.6)),
      ink(line(32, 10, 32, 2)),
      ink(line(49, 20, 57, 15)),
      ink(line(51, 44, 59, 49)),
      ink('M20 54C26 58 38 58 44 54'),
    ],
  },
};

/**
 * The drawing for one resource id, or `null` when nobody has drawn one.
 *
 * `null` is the whole fallback contract: every caller answers it with the row's
 * own `emoji`, which is why a resource installed at runtime still shows up on
 * the board and in the panels without a line of code written for it.
 */
export function resourceMark(id: string): ResourceMark | null {
  return RESOURCE_MARKS[id] ?? null;
}

// --- the SVG export ---------------------------------------------------------

/**
 * One mark as a standalone SVG document, inked in `color`.
 *
 * The DOM's half of "one source of truth": the panels do not re-draw anything,
 * they mask a picture generated from the same paths the atlas traces. Emitted
 * as a string rather than as elements so it can be a `data:` URI — a mask wants
 * a URL, and a URL that is a string cannot be mutated by whoever it is handed
 * to.
 */
export function resourceMarkSvg(mark: ResourceMark, color = '#000'): string {
  const body = mark.paths
    .map((path) => {
      const attrs = [`d="${path.d}"`];
      if (path.fill) attrs.push(`fill="${color}"`);
      if (path.width !== undefined && path.width !== MARK_STROKE) {
        // Weight zero is "filled only" — a pip or an eye, which has no outline
        // at all rather than a hairline one.
        attrs.push(path.width === 0 ? 'stroke="none"' : `stroke-width="${path.width}"`);
      }
      return `<path ${attrs.join(' ')}/>`;
    })
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_BOX} ${MARK_BOX}">` +
    `<g fill="none" stroke="${color}" stroke-width="${MARK_STROKE}" stroke-linecap="round" stroke-linejoin="round">` +
    `${body}</g></svg>`
  );
}

/**
 * The same document as a `data:` URI, or `null` for a resource with no mark.
 *
 * Percent-encoded whole rather than base64: the payload is a few hundred bytes
 * of ASCII, and an encoding a human can read in the inspector is worth more
 * here than the dozen bytes base64 would save. Memoised because a hover card
 * rebuilds on every pointer move and the string is the same every time.
 */
const uriCache = new Map<string, string | null>();

export function resourceMarkDataUri(id: string, color = '#000'): string | null {
  const key = `${id}|${color}`;
  const cached = uriCache.get(key);
  if (cached !== undefined) return cached;
  const mark = resourceMark(id);
  const uri =
    mark === null ? null : `data:image/svg+xml,${encodeURIComponent(resourceMarkSvg(mark, color))}`;
  uriCache.set(key, uri);
  return uri;
}
