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
 * between a Mac and a phone — so the whole set is drawn here instead.
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
 * One hand, on one grid — the 2026-08-27 pass
 * -------------------------------------------
 * This set used to be two hands under one weight: thirty-two drawings of ours on
 * the house 64-unit grid and nine Tabler ports on upstream's 24. The user looked
 * at the board and said the plain thing about it — *"the luxury resources don't
 * look different, ideally they look consistent with the lucide icons and military
 * icons"* — and they were right, because a shared *weight* is not a shared hand.
 * Two sets drawn to two padding conventions, with two ideas of how round a corner
 * is and whether a lobe may be filled, sit on the same board looking like two
 * sets. The weight was only the part that had already been fixed.
 *
 * So all forty-one are now **one family on the 24-unit grid at weight 2.75**, the
 * badge roster's and the yield voices' own geometry:
 *
 *   twenty are **Tabler Icons** (MIT) copied to the coordinate, as the nine were;
 *   twenty-one are **drawn for this project** (CC0) *in Tabler's geometry* —
 *   the 24 box, the family's 2.75 stroke, round caps and joins, no fill anywhere.
 *
 * That third category is not a compromise, it is the badge set's own precedent:
 * `siege.svg` and `spear.svg` are drawn here because neither Tabler nor Lucide
 * draws a catapult or a spear, and they are drawn *on upstream's grid* so that
 * the set stays one set (`public/sprites/CREDITS.md`). Twenty-one rows of this
 * table are in the same position — nobody's icon set has a bison, an oxhide
 * ingot, a coil pot or a papyrus umbel — and a filled hand-drawn silhouette
 * beside a vendored outline is exactly what the user was looking at.
 *
 * **There are no fills left in this table.** Every mark is an open stroke, which
 * is the rule the whole family already followed and the reason a mark survives
 * being twelve pixels across: a filled lobe closes its own gaps first and its
 * neighbours' second, so six grape berries or four cotton bolls become one black
 * mound. `MarkPath.fill` stays in the shape because the *other* sets in
 * `src/art/` use it — heraldry, the card lines, the printer's devices, all still
 * on the house 64 — and nothing here does.
 *
 * The vocabulary, not forty-one blobs
 * -----------------------------------
 * Shapes repeat across the table — leaves, ingots, drops, dots, sparks — so they
 * are drawn once as helpers that return path data and composed per mark. The
 * helpers take coordinates and are grid-agnostic, which is why the move from 64
 * to 24 cost them nothing; `cube`, `crescent` and `spiral` went with the marks
 * that used them, because a helper with no caller is a shape nobody has checked.
 */

/**
 * The **house** grid: this project's own 64-unit box.
 *
 * No resource mark is on it any more, and it is still declared here because this
 * is where the house drawing language lives and five other sets still speak it —
 * `heraldryMarks.ts`, `siteMarks.ts`, `marginaliaMarks.ts`, `lineMarks.ts` and
 * `deviceMarks.ts` all import `MARK_BOX`, `MARK_STROKE`, `ink` and `solid` from
 * here. Those sets are drawn *large*: a heraldic charge fills a canton and a
 * printer's device fills a page corner, where a resource mark is read at twelve
 * pixels on a hex, and 64 units is the right grid for a drawing that is allowed
 * detail. The split is the whole reason both constants exist.
 */
export const MARK_BOX = 64;

/**
 * The house stroke weight, in grid units, for the sets still on the 64 box.
 *
 * 6.5 of 64 is 0.102, which is where the vendored 24-unit sets' 2.75 lands once
 * the house grid's tighter safe circle is allowed for (a house mark reaches about
 * 78% of its box against a vendored one's 83%). One number for the whole house
 * hand — heraldry, sites, card lines, the marginalia and the printer's devices
 * all default to it — because the alternative is a per-family weight, and a
 * per-family weight is how a set stops being a set.
 */
export const MARK_STROKE = 6.5;

/**
 * The lighter weight the *filled* shapes are outlined at, on the house grid.
 *
 * A filled lobe carries its own mass, so stroking it at the full weight fattens
 * it past everything around it. Held at 0.8 of the house weight. Nothing in this
 * file uses it any more — see the module docblock on why the resource set has no
 * fills left — but `heraldryMarks.ts` and `lineMarks.ts` do, through `solid`.
 */
export const MARK_STROKE_FILLED = 5.2;

/**
 * The grid **every resource mark** is drawn on: upstream's 24, not the house 64.
 *
 * The same 24 the six yield voices (`yieldMarks.ts`) and the eleven unit badges
 * (`public/sprites/icons/`) are on, and it is upstream's own rather than a
 * rescaling of it, for the reason `yieldMarks.ts` gives at length: rescaling path
 * data is how a vendored drawing quietly stops being the drawing that was
 * vendored, and a `d` string that no longer matches its source is one nobody can
 * check again. The twenty-one marks drawn *here* are authored on it directly, so
 * the whole table is one set of coordinates a re-vendoring can diff.
 */
export const RESOURCE_MARK_BOX = 24;

/** The one weight the whole resource table is stroked at. Upstream's 2, weighted
 * up to 2.75 exactly as the badges and the yields were — a 2/24 stroke is drawn
 * for a 24-pixel toolbar icon and goes spidery at the size a hex asks for. */
export const RESOURCE_MARK_STROKE = 2.75;

/**
 * How much of its cell a resource mark is printed in, on the board.
 *
 * `YIELD_MARK_SCALE`'s twin and the same kind of number — geometry, not taste. A
 * 24-unit drawing reaches about 83% of its box where a house 64-unit one reaches
 * about 78%, so printing one at the nominal size a house mark was printed at
 * pushes the widest of them (the wheat ear, the grape bunch, the whale's fluke)
 * onto the roundel's rim, which reads as a printing fault rather than as a token.
 *
 * The *DOM* side deliberately does not want it: a mask is sized by the text it
 * sits beside and has no rim to run into, exactly as `.yield-mark` in `style.css`
 * decided for the six voices.
 */
export const RESOURCE_MARK_SCALE = 0.9;

/**
 * One traced path of a mark.
 *
 * `fill` and `width` are both optional and both are about the *other* sets on the
 * house grid: no resource mark declares either, because the whole table is one
 * weight and no resource mark is filled. See the module docblock.
 */
export interface MarkPath {
  /** SVG path data, in the mark's own grid. */
  d: string;
  /** Filled as well as stroked. Default false — an open stroke. */
  fill?: boolean;
  /** Stroke weight, in grid units. Defaults to the set's weight. */
  width?: number;
}

/** One resource's drawing, plus the sentence that says what it depicts. */
export interface ResourceMark {
  /** What the mark is a picture of. The row `CREDITS.md` prints. */
  note: string;
  paths: readonly MarkPath[];
  /**
   * Where the drawing came from — the upstream icon and its licence, or this
   * project's own hand.
   *
   * **Required**, which is the bookkeeping half of the one-hand pass. It used to
   * be optional and present only on the nine ports, so "who drew this" was a
   * property of nine rows and an absence on thirty-two; now every row answers,
   * `CREDITS.md` has one place to be right about, and the flair gallery prints
   * the sentence under the mark it belongs to. A row that cannot say where its
   * drawing came from is a row nobody can re-vendor or relicense.
   */
  credit: string;
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
 * One string rather than a `<circle>` element so that every member of a mark is
 * the same kind of thing — a `d` — and both consumers need exactly one code path
 * (`Path2D`, `<path>`) instead of two. Grid-agnostic arithmetic: `yieldMarks.ts`
 * reuses it unchanged on the 24 box for the gear's hub and the two note heads.
 */
export function dot(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0Z`;
}

/**
 * A four-point sparkle: two crossed strokes, no fill.
 *
 * "This thing catches light" is a property several rows of the table share — the
 * lapis fleck, the printer's device's star — so it is drawn once.
 */
export function spark(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}H${n(cx + r)}M${n(cx)} ${n(cy - r)}V${n(cy + r)}`;
}

/**
 * A pointed almond leaf, centred on `(cx, cy)`, its long axis along `angle`.
 *
 * `bulge` is the control-point offset rather than the half-width, so a leaf
 * reads about half that far out at its widest. Written that way because it is
 * the number being tuned by eye — nobody drawing a rice head is solving for its
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
 * Amber's resin and the honeycomb's drip are the same shape at two sizes, and a
 * drop is one of the two or three silhouettes that still reads at twelve pixels.
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

// --- the registry -----------------------------------------------------------

/**
 * A stroked path at the *house* weight — the 64-grid sets' default verb.
 *
 * Exported with `solid` because they are the two verbs of the house drawing
 * language rather than two helpers of this table: `siteMarks.ts`,
 * `heraldryMarks.ts`, `lineMarks.ts`, `marginaliaMarks.ts` and `deviceMarks.ts`
 * all draw with them, and a second pair of one-line wrappers over there would be
 * the place the house hand quietly drifts apart. **No resource mark calls
 * either** — see `stroke` below.
 */
export function ink(d: string): MarkPath {
  return { d };
}

/** A filled shape, outlined at the lighter house weight. See `MARK_STROKE_FILLED`. */
export function solid(d: string): MarkPath {
  return { d, fill: true, width: MARK_STROKE_FILLED };
}

/**
 * A path of a resource mark: the `d` and nothing else.
 *
 * Deliberately identical to `ink`, and deliberately *not* `ink`. Every path in
 * this table declares no weight and no fill, so the whole set is stroked by the
 * one `stroke-width` on the group (`markSvg`) or the one `lineWidth` in the atlas
 * (`paintMarkPaths`) — which is what makes "one hand, one weight" a property the
 * data cannot violate rather than a convention forty-one rows have to keep. A
 * per-path override here would be the first crack in it, so there is no verb
 * that writes one.
 */
function stroke(d: string): MarkPath {
  return { d };
}

/**
 * One Tabler port: the note, the credit, and the paths.
 *
 * A builder rather than twenty hand-written objects, so that "this row is
 * somebody else's drawing" is one word at the call site and cannot be
 * half-declared — a port without a credit would be an uncredited vendored
 * drawing, which is the one bookkeeping mistake this file must not make.
 */
function tabler(note: string, icon: string, ...ds: string[]): ResourceMark {
  return {
    note,
    credit: `Tabler Icons \`${icon}\` (MIT)`,
    paths: ds.map(stroke),
  };
}

/**
 * One mark drawn *here*, in Tabler's geometry: the note, then the paths.
 *
 * The badge roster's `siege.svg` and `spear.svg` precedent (see
 * `public/sprites/CREDITS.md`), applied to the sixteen-odd rows nobody's icon set
 * covers — there is no bison, no oxhide ingot, no papyrus umbel and no murex
 * whelk in Tabler or Lucide, and there is no third stroke family that draws them
 * without being a third hand. Same box, same weight, same round caps, no fill.
 */
function drawn(note: string, ...ds: string[]): ResourceMark {
  return { note, credit: 'drawn for this project (CC0), in Tabler’s geometry', paths: ds.map(stroke) };
}

/**
 * Every drawn mark, keyed by resource id.
 *
 * A plain string key, not `Record<ResourceId, …>`: the point of the fallback is
 * that a row can exist with no drawing, and a type that forbade the gap would
 * make adding a resource a TypeScript edit again (see `resourceData.ts`, "a new
 * row costs no TypeScript"). The completeness of *this* table against the
 * shipped one is asserted in `test/render/resources3d.test.ts` instead, which is
 * the right place for it: a fact about the art, checked, rather than a fact about
 * the language, enforced.
 *
 * Order follows `data/resources.json` — bonus, strategic, luxury — so the two
 * can be read side by side.
 */
export const RESOURCE_MARKS: Readonly<Record<string, ResourceMark>> = {
  // --- bonus ---------------------------------------------------------------
  wheat: tabler(
    'an ear of wheat, two sprays off one stem',
    'wheat',
    'M12.014 21.514v-3.75',
    'M5.93 9.504l-.43 1.604c-.712 2.659 .866 5.391 3.524 6.105c.997 .268 1.993 .535 2.99 .801v-3.44c-.164 -2.105 -1.637 -3.879 -3.676 -4.426l-2.408 -.644',
    'M13.744 11.164c.454 -.454 .815 -.994 1.061 -1.587c.246 -.594 .372 -1.23 .372 -1.873c0 -.643 -.126 -1.279 -.372 -1.872c-.246 -.594 -.606 -1.133 -1.061 -1.588l-1.73 -1.73l-1.73 1.73c-.454 .454 -.815 .994 -1.06 1.588c-.246 .594 -.372 1.23 -.373 1.872c0 .643 .127 1.279 .373 1.873c.246 .594 .606 1.133 1.06 1.587',
    'M18.099 9.504l.43 1.604c.712 2.659 -.866 5.391 -3.525 6.105c-.997 .268 -1.994 .535 -2.99 .801v-3.44c.164 -2.105 1.637 -3.879 3.677 -4.426l2.408 -.644',
  ),
  // Tabler has no cow, and this is the pair the drawing has to get right: an ox
  // and a bison are the same animal at twelve pixels unless the *silhouette*
  // separates them. So the ox is narrow and long with horns swept wide, and the
  // bison below is broad and blunt with a shaggy crown and stub horns. Both are
  // built the way Tabler builds an animal head (`deer`, `pig`, `cat`): one closed
  // outline, the horns as separate arcs, the eyes as its zero-length dot idiom.
  cattle: drawn(
    "an ox's head, horns swept wide",
    // The horns go *out* rather than up, and that is the whole drawing: a horn
    // that rises off the crown is an ear, and the first pass of this mark read
    // as a bat. Long and narrow where the bison below is broad and blunt.
    'M9 10.4c0 -1.6 1.3 -2.6 3 -2.6s3 1 3 2.6c0 5.2 -1.3 8.6 -3 8.6s-3 -3.4 -3 -8.6',
    'M9.1 11c-2.4 .2 -5.1 -.5 -6.5 -2.2c-.4 -.5 0 -1.1 .6 -1c2.2 .3 4.4 1.4 5.9 2.8',
    'M14.9 11c2.4 .2 5.1 -.5 6.5 -2.2c.4 -.5 0 -1.1 -.6 -1c-2.2 .3 -4.4 1.4 -5.9 2.8',
    'M10.6 13.4v.01',
    'M13.4 13.4v.01',
    'M10.7 17.2c.8 .5 1.8 .5 2.6 0',
  ),
  deer: tabler(
    "a stag's head, antlers full",
    'deer',
    'M3 3c0 2 1 3 4 3c2 0 3 1 3 3',
    'M21 3c0 2 -1 3 -4 3c-2 0 -3 .333 -3 3',
    'M12 18c-1 0 -4 -3 -4 -6c0 -2 1.333 -3 4 -3s4 1 4 3c0 3 -3 6 -4 6',
    'M15.185 14.889l.095 -.18a4 4 0 1 1 -6.56 0',
    'M17 3c0 1.333 -.333 2.333 -1 3',
    'M7 3c0 1.333 .333 2.333 1 3',
    'M7 6c-2.667 .667 -4.333 1.667 -5 3',
    'M17 6c2.667 .667 4.333 1.667 5 3',
    'M8.5 10l-1.5 -1',
    'M15.5 10l1.5 -1',
    'M12 15h.01',
  ),
  fish: tabler(
    'a fish, tail to the left',
    'fish',
    'M16.69 7.44a6.973 6.973 0 0 0 -1.69 4.56c0 1.747 .64 3.345 1.699 4.571',
    'M2 9.504c7.715 8.647 14.75 10.265 20 2.498c-5.25 -7.761 -12.285 -6.142 -20 2.504',
    'M18 11v.01',
    'M11.5 10.5c-.667 1 -.667 2 0 3',
  ),
  // The house `cube()` helper reproduced the hand-drawn block to the coordinate
  // and was retired with it: upstream draws the same three-quarter block, with a
  // proper isometric top and the two hidden edges left out, and the whole point
  // of this pass is that a stroke icon somebody else drew is the better drawing.
  stone: tabler(
    'a cut block in three-quarter view',
    'cube',
    'M21 16.008v-8.018a1.98 1.98 0 0 0 -1 -1.717l-7 -4.008a2.016 2.016 0 0 0 -2 0l-7 4.008c-.619 .355 -1 1.01 -1 1.718v8.018c0 .709 .381 1.363 1 1.717l7 4.008a2.016 2.016 0 0 0 2 0l7 -4.008c.619 -.355 1 -1.01 1 -1.718',
    'M12 22v-10',
    'M12 12l8.73 -5.04',
    'M3.27 6.96l8.73 5.04',
  ),
  // The water is the whole difference between this and `wheat`, so it is the one
  // thing drawn at full length: three drooping stalks over a paddy line.
  rice: drawn(
    'three drooping stalks standing in water',
    stalk(12, 17.4, 12, 6.2, 0),
    stalk(8.8, 17.6, 6.4, 9, -1.6),
    stalk(15.2, 17.6, 17.6, 9, 1.6),
    leaf(12, 5, 4.6, 2.4, 90),
    leaf(6, 7.6, 4.2, 2.2, 108),
    leaf(18, 7.6, 4.2, 2.2, 72),
    'M3.5 20.9c1.42 -1.1 2.83 1.1 4.25 0s2.83 1.1 4.25 0s2.83 1.1 4.25 0s2.83 1.1 4.25 0',
  ),
  // Laid on the diagonal, and that is not decoration: an ear drawn upright with
  // two bands round it and two husks at its foot is a rocket, which is what the
  // first two passes of this mark drew. Tilting it is the whole fix.
  maize: drawn(
    'a cob laid on the diagonal, kernels ranked, one husk at its foot',
    leaf(12, 11.4, 16.8, 9, -60),
    line(8.85, 12.47, 12.65, 14.67),
    line(11.35, 8.13, 15.15, 10.33),
    'M8.4 17.6c-2.6 -.4 -4.6 .8 -5.6 3c2.4 .8 4.6 .2 6 -1.4',
  ),
  // One fruit, not three, and upstream agrees: a *hand* of bananas at twelve
  // pixels is three crescents whose gaps close into one black mound, and splaying
  // them instead reads as a fork.
  bananas: tabler(
    'a single fruit, stem squared at the top',
    'banana',
    'M20 6v-2a1 1 0 0 0 -1 -1h-2a1 1 0 0 0 -1 1v2a9.09 9.09 0 0 1 -4 8.08c-2 1.31 -5 1.57 -7 1.59a2 2 0 0 0 -2 2a2 2 0 0 0 1.16 1.81c2.69 1.2 9.46 3.44 14.35 -1.66c4.49 -4.74 1.49 -11.82 1.49 -11.82',
  ),
  copper: drawn(
    'an oxhide ingot, four horns and a hollowed waist',
    'M4.2 3.4c4.2 3.4 11.4 3.4 15.6 0c-2.4 4.6 -2.4 12.6 0 17.2c-4.2 -3.4 -11.4 -3.4 -15.6 0c2.4 -4.6 2.4 -12.6 0 -17.2z',
  ),
  tin: drawn('two cast bars, stacked', ingot(10.8, 8.8, 6.2, 5), ingot(13.2, 15.6, 6.2, 5)),
  clay: drawn(
    'a coil pot, its rim thrown wide',
    'M8.2 5.6h7.6l-1.5 3.1c3.9 2.3 3.9 9.2 .7 11.5h-6.4c-3.2 -2.3 -3.2 -9.2 .7 -11.5z',
    'M6.5 13.6c3.1 -1.5 8 -1.5 11.1 0',
  ),
  reeds: drawn(
    'papyrus stems under their umbels',
    'M12 21.4v-11.8',
    'M7.2 21.4c-.3 -3 -.1 -5.6 .6 -7.7',
    'M16.8 21.4c.3 -3 .1 -5.6 -.6 -7.7',
    line(12, 9.6, 7.6, 4.6),
    line(12, 9.6, 12, 3.2),
    line(12, 9.6, 16.4, 4.6),
    line(12, 9.6, 5.7, 7.2),
    line(12, 9.6, 18.3, 7.2),
  ),
  crabs: drawn(
    'a crab, eyes on stalks and both claws up',
    // Eyes *on stalks* rather than pips in the carapace: the first pass put two
    // dots in an oval over a pair of pincers and the whole thing read as a
    // skull. Stalks are the one feature nothing else in the set has.
    'M6 14.6c0 -3.1 2.7 -5.2 6 -5.2s6 2.1 6 5.2c0 2.1 -2.7 3.5 -6 3.5s-6 -1.4 -6 -3.5',
    'M9.6 9.7v-2.3M9.6 6.6v.01',
    'M14.4 9.7v-2.3M14.4 6.6v.01',
    'M6.2 13.6c-1.6 -.3 -2.7 -1.4 -3 -3',
    'M3.2 10.6l-1 -1.6M3.2 10.6l1.1 -1.6',
    'M17.8 13.6c1.6 -.3 2.7 -1.4 3 -3',
    'M20.8 10.6l1 -1.6M20.8 10.6l-1.1 -1.6',
    'M8.2 17.6l-2.2 3.4',
    'M11 18.2l-.8 3',
    'M13 18.2l.8 3',
    'M15.8 17.6l2.2 3.4',
  ),
  bison: drawn(
    'a bison head, shaggy crown and stub horns',
    'M4.8 11.4c0 -3 3.2 -4.9 7.2 -4.9s7.2 1.9 7.2 4.9c0 2 -1.3 3.5 -2.5 4.1c-.8 3 -2.2 5 -4.7 5s-3.9 -2 -4.7 -5c-1.2 -.6 -2.5 -2.1 -2.5 -4.1',
    'M5.6 9.6c-1.6 -1.2 -1.3 -3.5 .4 -3.5c.9 .8 1 2.4 .6 3.4',
    'M18.4 9.6c1.6 -1.2 1.3 -3.5 -.4 -3.5c-.9 .8 -1 2.4 -.6 3.4',
    'M9.3 7.1v-1.9M12 6.5v-2.4M14.7 7.1v-1.9',
    'M9.8 12.2v.01',
    'M14.2 12.2v.01',
  ),

  // --- strategic -----------------------------------------------------------
  // The pasture and the cavalry it buys are the same upstream drawing rather than
  // a shared file: a resource mark and a unit badge are never in the same roundel,
  // and the two rosters keep the right to move apart again.
  horses: tabler(
    "the badge set's horse, in full",
    'horse',
    'M7 10l-.85 8.507a1.357 1.357 0 0 0 1.35 1.493h.146a2 2 0 0 0 1.857 -1.257l.994 -2.486a2 2 0 0 1 1.857 -1.257h1.292a2 2 0 0 1 1.857 1.257l.994 2.486a2 2 0 0 0 1.857 1.257h.146a1.37 1.37 0 0 0 1.364 -1.494l-.864 -9.506h-8c0 -3 -3 -5 -6 -5l-3 6l2 2l3 -2',
    'M22 14v-2a3 3 0 0 0 -3 -3',
  ),
  // Not Tabler's `pick`: a pickaxe beside the worker badge's claw hammer is two
  // tools with one silhouette, and the badge is the thing a player has to read
  // first. An anvil says the same word — *this is where iron becomes something* —
  // with a shape nothing else in either set wears.
  iron: drawn(
    'an anvil, horn out, on its foot',
    // One closed outline, and the *horn* is what it is for: a symmetric top plate
    // over a waist over a foot is an hourglass, which is what the first pass drew.
    'M3.2 8.8c2.1 -1.5 4.7 -2.3 7.3 -2.3h9.7v3.9h-5.4v3h2.3l1.5 4.7h-11.6l1.5 -4.7h2.3v-3h-6c-2.6 0 -5.2 -.8 -7.3 -2.3z',
  ),

  // Saltpetre, which the alchemists' node names: the flask it is boiled in, on
  // its own base, with the level of the liquor across it. A vessel rather than a
  // mineral because the seam is a *worked* one — a niter bed is a built thing.
  // The seam a survey turns up: a split boulder with two nodules showing in the
  // break. Read against `iron` (an anvil — the *worked* metal) and `stone` (a cut
  // block — the *quarried* one), this is neither: it is rock that has been broken
  // open, which is the whole of what a strike is.
  richOre: drawn(
    'a split boulder, two nodules showing in the break',
    'M4 20L2 11L7 4H17L22 11L20 20Z',
    'M9 4L11 12L8 20',
    'M11 12L18 9',
    'M13 14L15 16L13 18L11 16Z',
    'M16 12L17 13L16 14L15 13Z',
  ),

  niter: drawn(
    'a conical flask on a base, the liquor level across it',
    'M9.6 3.4h4.8',
    'M10.6 3.4v5.4l-5.2 9.1a1 1 0 0 0 .9 1.5h11.4a1 1 0 0 0 .9 -1.5l-5.2 -9.1v-5.4',
    'M7.6 13.6h8.8',
  ),

  // --- luxury --------------------------------------------------------------
  gems: tabler(
    'a cut gem, table and pavilion, with one facet line',
    'diamond',
    'M6 5h12l3 5l-8.5 9.5a.7 .7 0 0 1 -1 0l-8.5 -9.5l3 -5',
    'M10 12l-2 -2.2l.6 -1',
  ),
  silk: drawn(
    'a bolt of cloth hung from a rail, its hem in points',
    'M3.8 4.6h16.4',
    'M7.5 4.6v14.2l2.3 -2.6l2.2 2.6l2.3 -2.6l2.2 2.6v-14.2',
    'M7.5 9.8c2.3 -1.5 6.7 1.5 9 0',
  ),
  // The six berries were filled here and the gaps between them closed into one
  // black mound at the size a tile roundel is actually read at. Upstream's are
  // outlined and overlapped, which is the same bunch drawn so that the boundary
  // between two berries survives being one pixel wide.
  wine: tabler(
    'a bunch of grapes under a stem and a leaf',
    'grape',
    'M13 3a14.5 14.5 0 0 0 -1 6',
    'M12 8.9s-2.77 .52 -4.1 -.8s-.8 -4 -.8 -4s2.57 -.53 3.88 .8s1.02 4 1.02 4',
    'M14 19a2 2 0 1 0 -4 0a2 2 0 0 0 4 0',
    'M14 17a2 2 0 1 1 0 -4a2 2 0 0 1 0 4',
    'M10 17a2 2 0 1 1 0 -4a2 2 0 0 1 0 4',
    'M12 13a2 2 0 1 1 0 -4a2 2 0 0 1 0 4',
    'M16 13a2 2 0 1 1 0 -4a2 2 0 0 1 0 4',
    'M8 13a2 2 0 1 1 0 -4a2 2 0 0 1 0 4',
  ),
  spices: tabler(
    'a pepper pod under its stem',
    'pepper',
    'M13 11c0 2.21 -2.239 4 -5 4s-5 -1.79 -5 -4a8 8 0 1 0 16 0a3 3 0 0 0 -6 0',
    'M16 8c0 -2 2 -4 4 -4',
  ),
  // Ours was the `cube()` block again, with two glints stuck on it — the same
  // drawing as `stone` and told apart only by the sparkles, which is the failure
  // this pass is about. A shaker is what salt *is* to anybody looking at a hex.
  salt: tabler(
    'a salt shaker, three grains falling',
    'salt',
    'M12 13v.01',
    'M10 16v.01',
    'M14 16v.01',
    'M7.5 8h9l-.281 -2.248a2 2 0 0 0 -1.985 -1.752h-4.468a2 2 0 0 0 -1.986 1.752l-.28 2.248',
    'M7.5 8l-1.612 9.671a2 2 0 0 0 1.973 2.329h8.278a2 2 0 0 0 1.973 -2.329l-1.612 -9.671',
  ),
  // Deliberately not Tabler's `candle` or `flame`: the candle is the augur's badge
  // and the flame is the faith yield's voice, and a tile that appeared to say
  // "this hex makes faith" would be a lie the board tells for free. A censer is
  // the same idea one step over — burnt, not lit.
  incense: drawn(
    'a censer under three curls of smoke',
    'M5.2 13.6h13.6l-2.3 6h-9z',
    'M9.8 19.6v2.2M14.2 19.6v2.2',
    'M12 11.2c-2.2 -2.2 2.2 -3.7 0 -6.7',
    'M7.6 11.4c-1.5 -1.5 1.5 -3 0 -5.3',
    'M16.4 11.4c1.5 -1.5 -1.5 -3 0 -5.3',
  ),
  jade: drawn('a pierced disc, the bi', dot(12, 12, 8.4), dot(12, 12, 3.4)),
  marble: tabler(
    'a colonnade under its pediment, on a stylobate',
    'building-bank',
    'M3 21l18 0',
    'M3 10l18 0',
    'M5 6l7 -3l7 3',
    'M4 10l0 11',
    'M20 10l0 11',
    'M8 14l0 3',
    'M12 14l0 3',
    'M16 14l0 3',
  ),
  // A stretched pelt is a shape with no name at twelve pixels — it reads as a
  // shield, or as nothing. The paw is what the pelt came off, which is a metaphor
  // one step back and a silhouette that survives the shrink.
  furs: tabler('a paw, four toes and a pad', 'paw',
    'M14.7 13.5c-1.1 -2 -1.441 -2.5 -2.7 -2.5c-1.259 0 -1.736 .755 -2.836 2.747c-.942 1.703 -2.846 1.845 -3.321 3.291c-.097 .265 -.145 .677 -.143 .962c0 1.176 .787 2 1.8 2c1.259 0 3 -1 4.5 -1s3.241 1 4.5 1c1.013 0 1.8 -.823 1.8 -2c0 -.285 -.049 -.697 -.146 -.962c-.475 -1.451 -2.512 -1.835 -3.454 -3.538',
    'M20.188 8.082a1.039 1.039 0 0 0 -.406 -.082h-.015c-.735 .012 -1.56 .75 -1.993 1.866c-.519 1.335 -.28 2.7 .538 3.052c.129 .055 .267 .082 .406 .082c.739 0 1.575 -.742 2.011 -1.866c.516 -1.335 .273 -2.7 -.54 -3.052l-.001 0',
    'M9.474 9c.055 0 .109 0 .163 -.011c.944 -.128 1.533 -1.346 1.32 -2.722c-.203 -1.297 -1.047 -2.267 -1.932 -2.267c-.055 0 -.109 0 -.163 .011c-.944 .128 -1.533 1.346 -1.32 2.722c.204 1.293 1.048 2.267 1.933 2.267',
    'M16.456 6.733c.214 -1.376 -.375 -2.594 -1.32 -2.722a1.164 1.164 0 0 0 -.162 -.011c-.885 0 -1.728 .97 -1.93 2.267c-.214 1.376 .375 2.594 1.32 2.722c.054 .007 .108 .011 .162 .011c.885 0 1.73 -.974 1.93 -2.267',
    'M5.69 12.918c.816 -.352 1.054 -1.719 .536 -3.052c-.436 -1.124 -1.271 -1.866 -2.009 -1.866c-.14 0 -.277 .027 -.407 .082c-.816 .352 -1.054 1.719 -.536 3.052c.436 1.124 1.271 1.866 2.009 1.866c.14 0 .277 -.027 .407 -.082',
  ),
  dyes: tabler(
    'a dyer’s bucket, one drop cast',
    'bucket-droplet',
    'M5 16l1.465 1.638a2 2 0 1 1 -3.015 .099l1.55 -1.737',
    'M13.737 9.737c2.299 -2.3 3.23 -5.095 2.081 -6.245c-1.15 -1.15 -3.945 -.217 -6.244 2.082c-2.3 2.299 -3.231 5.095 -2.082 6.244c1.15 1.15 3.946 .218 6.245 -2.081',
    'M7.492 11.818c.362 .362 .768 .676 1.208 .934l6.895 4.047c1.078 .557 2.255 -.075 3.692 -1.512c1.437 -1.437 2.07 -2.614 1.512 -3.692c-.372 -.718 -1.72 -3.017 -4.047 -6.895a6.015 6.015 0 0 0 -.934 -1.208',
  ),
  // Two filled tusks were the heaviest mark in the old table and read as a pair of
  // croissants. Ivory is worked bone; the bone is what a player recognises.
  ivory: tabler(
    'a bone, knuckled at both ends',
    'bone',
    'M15 3a3 3 0 0 1 3 3a3 3 0 1 1 -2.12 5.122l-4.758 4.758a3 3 0 1 1 -5.117 2.297l0 -.177l-.176 0a3 3 0 1 1 2.298 -5.115l4.758 -4.758a3 3 0 0 1 2.12 -5.122l-.005 -.005',
  ),
  amber: drawn(
    'a drop of resin with something caught in it',
    drop(12, 12.6, 6, 15),
    'M12 13.4v.01',
  ),
  tea: tabler(
    'a leaf on its stem, midrib drawn',
    'leaf',
    'M5 21c.5 -4.5 2.5 -8 7 -10',
    'M9 18c6.218 0 10.5 -3.288 11 -12v-2h-4.014c-9 0 -11.986 4 -12 9c0 1 0 3 2 5h3l.014 0',
  ),
  coffee: tabler(
    'a cup under two curls of steam',
    'coffee',
    'M3 14c.83 .642 2.077 1.017 3.5 1c1.423 .017 2.67 -.358 3.5 -1c.83 -.642 2.077 -1.017 3.5 -1c1.423 -.017 2.67 .358 3.5 1',
    'M8 3a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2',
    'M12 3a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2',
    'M3 10h14v5a6 6 0 0 1 -6 6h-2a6 6 0 0 1 -6 -6v-5',
    'M16.746 16.726a3 3 0 1 0 .252 -5.555',
  ),
  cotton: drawn(
    'a burst boll in its spiked calyx',
    'M6.8 13.2c-1.9 -1.6 -1.2 -4.6 1.2 -5.2c-.4 -2.5 2.2 -4.2 4 -2.6c1.8 -1.6 4.4 .1 4 2.6c2.4 .6 3.1 3.6 1.2 5.2z',
    'M12 21.2l-5.4 -4.2l1.4 -2.4l4 1.6l4 -1.6l1.4 2.4z',
  ),
  sugar: tabler(
    'a boiled sweet, twisted at both ends',
    'candy',
    'M7.05 11.293l4.243 -4.243a2 2 0 0 1 2.828 0l2.829 2.83a2 2 0 0 1 0 2.828l-4.243 4.243a2 2 0 0 1 -2.828 0l-2.829 -2.831a2 2 0 0 1 0 -2.828',
    'M16.243 9.172l3.086 -.772a1.5 1.5 0 0 0 .697 -2.516l-2.216 -2.217a1.5 1.5 0 0 0 -2.44 .47l-1.248 2.913',
    'M9.172 16.243l-.772 3.086a1.5 1.5 0 0 1 -2.516 .697l-2.217 -2.216a1.5 1.5 0 0 1 .47 -2.44l2.913 -1.248',
  ),
  olives: drawn(
    'a sprig, two leaves over two olives',
    // The leaves are *above* the fruit and the two olives hang at different
    // heights. Symmetric, and this mark is a moth.
    'M12 21.4v-15.6',
    leaf(7.6, 6.6, 7, 3.8, 205),
    leaf(16.4, 6.6, 7, 3.8, 335),
    line(12, 12.6, 9.8, 13.4),
    line(12, 16, 14.1, 16.6),
    dot(8.4, 15.2, 3),
    dot(15.5, 18.2, 3),
  ),
  lapis: drawn(
    'a polished cabochon, flecked with pyrite',
    'M3.2 18c0 -7.4 3.9 -11.8 8.8 -11.8s8.8 4.4 8.8 11.8z',
    spark(8.6, 13.8, 1.7),
    spark(14.4, 10.8, 1.7),
    spark(15.2, 15.8, 1.4),
  ),
  // Silver and gold were a cast bar under a moon and the same bar under a sun,
  // which is two marks that differ in their smallest feature — the one thing a
  // twelve-pixel roundel cannot carry. They are two different *treasures* now: a
  // stack of struck coin, and the metal a crown is made of.
  silver: tabler(
    'a stack of struck coin',
    'coins',
    'M9 14c0 1.657 2.686 3 6 3s6 -1.343 6 -3s-2.686 -3 -6 -3s-6 1.343 -6 3',
    'M9 14v4c0 1.656 2.686 3 6 3s6 -1.344 6 -3v-4',
    'M3 6c0 1.072 1.144 2.062 3 2.598s4.144 .536 6 0c1.856 -.536 3 -1.526 3 -2.598c0 -1.072 -1.144 -2.062 -3 -2.598s-4.144 -.536 -6 0c-1.856 .536 -3 1.526 -3 2.598',
    'M3 6v10c0 .888 .772 1.45 2 2',
    'M3 11c0 .888 .772 1.45 2 2',
  ),
  gold: tabler('a crown, five points', 'crown', 'M12 6l4 6l5 -4l-2 10h-14l-2 -10l5 4l4 -6'),
  honey: drawn(
    'a comb cell, dripping',
    // No spurs on the sides: two ticks off a hexagon read as the eaves of a roof
    // long before they read as the neighbouring cells of a comb.
    poly(12, 2.6, 16.8, 5.4, 16.8, 11, 12, 13.8, 7.2, 11, 7.2, 5.4),
    drop(12, 19, 2.2, 5),
  ),
  // The pearl sits *above* an open shell rather than inside it. A `fan()` hinged
  // at the foot has every rib converging on one point, and at this weight the
  // point is a blot with the pearl lost inside it.
  pearls: drawn(
    'a pearl over an open shell',
    'M3.6 13.4c0 3.8 3.8 6.8 8.4 6.8s8.4 -3 8.4 -6.8z',
    'M7.4 13.8c.3 2.6 1.2 4.6 2.4 6',
    'M12 13.8v6.4',
    'M16.6 13.8c-.3 2.6 -1.2 4.6 -2.4 6',
    dot(12, 6.8, 3),
  ),
  coral: drawn(
    'a branching stag coral on its foot',
    // Every branch flares *outward* at its tip. Curved inward — which is what the
    // first pass drew — five prongs closing over a stem is a tulip.
    'M12 21.4v-6',
    'M12 15.4c-2.7 -1 -4.6 -3.1 -5.2 -6',
    'M12 15.4c2.7 -1 4.6 -3.1 5.2 -6',
    'M6.8 9.4c-1.4 -1 -2.7 -2.5 -3.3 -4.2',
    'M17.2 9.4c1.4 -1 2.7 -2.5 3.3 -4.2',
    'M12 15.4v-8.8',
    'M12 6.6c-1.1 -1 -1.8 -2.4 -2 -4.1M12 6.6c1.1 -1 1.8 -2.4 2 -4.1',
  ),
  whales: drawn(
    'a fluke, sounding',
    'M12 10.4c-1.2 -1.6 -3.8 -3.2 -6.6 -3.6c-1.4 -.2 -2 .9 -1.1 2c1.6 1.9 4.3 4.4 6.6 5.2h2.2c2.3 -.8 5 -3.3 6.6 -5.2c.9 -1.1 .3 -2.2 -1.1 -2c-2.8 .4 -5.4 2 -6.6 3.6z',
    'M12 14v3.4',
    'M4.4 20.8c1.2 -.9 2.4 .9 3.6 0s2.4 .9 3.6 0s2.4 .9 3.6 0s2.4 .9 3.6 0',
  ),
  // The whelk's *taper* is the whole mark, and our sampled polyline spent
  // forty-nine coordinates getting to what upstream draws in one arc chain.
  tyrian: tabler(
    'a whelk shell, whorl tapering to its apex',
    'spiral',
    'M10 12.057a1.9 1.9 0 0 0 .614 .743c1.06 .713 2.472 .112 3.043 -.919c.839 -1.513 -.022 -3.368 -1.525 -4.08c-2 -.95 -4.371 .154 -5.24 2.086c-1.095 2.432 .29 5.248 2.71 6.246c2.931 1.208 6.283 -.418 7.438 -3.255c1.36 -3.343 -.557 -7.134 -3.896 -8.41c-3.855 -1.474 -8.2 .68 -9.636 4.422c-1.63 4.253 .823 9.024 5.082 10.576c4.778 1.74 10.118 -.941 11.833 -5.59a9.354 9.354 0 0 0 .577 -2.813',
  ),
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
 *
 * No per-mark grid lookup any more: the whole table is on one box at one weight,
 * which is what the 2026-08-27 pass bought and is why `MarkPrint` and
 * `resourceMarkPrint` are gone rather than carrying a branch that can only ever
 * go one way.
 */
export function resourceMarkSvg(mark: ResourceMark, color = '#000'): string {
  return markSvg(mark.paths, RESOURCE_MARK_BOX, RESOURCE_MARK_STROKE, color);
}

/**
 * Any list of mark paths as a standalone SVG document: the emitter itself, with
 * the grid and the set's weight as arguments.
 *
 * Split out of `resourceMarkSvg` when the yield voices arrived as a *vendored*
 * set on somebody else's grid (`src/art/yieldMarks.ts`, 24 units at weight
 * 2.75). Everything a mark's SVG has to get right is here and nowhere else — the
 * `fill="none"` default, the round caps and joins that make the whole project
 * one hand, the per-path weight override, and the "weight zero means filled
 * only" convention that a house-grid pip or eye depends on. A second copy of it
 * for a second grid is precisely the drift this project keeps one drawing to
 * avoid, and it would have shown up as one set's marks quietly losing their
 * round caps.
 */
export function markSvg(
  paths: readonly MarkPath[],
  box: number,
  stroke: number,
  color = '#000',
): string {
  const body = paths
    .map((path) => {
      const attrs = [`d="${path.d}"`];
      if (path.fill) attrs.push(`fill="${color}"`);
      if (path.width !== undefined && path.width !== stroke) {
        // Weight zero is "filled only" — a pip or an eye, which has no outline
        // at all rather than a hairline one.
        attrs.push(path.width === 0 ? 'stroke="none"' : `stroke-width="${path.width}"`);
      }
      return `<path ${attrs.join(' ')}/>`;
    })
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}">` +
    `<g fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">` +
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
