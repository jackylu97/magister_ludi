/**
 * The floating unit badges: the parchment roundel that says which unit this is.
 *
 * Why they exist
 * --------------
 * The board used to carve one miniature per unit type — fifteen of them, each
 * genuinely different in the hand. At game zoom a piece is about forty pixels
 * tall and a swordsman, a longswordsman and a pikeman are three tokens with
 * three slightly different slivers of metal. The differences were real and
 * nobody could use them. So the sculpts collapsed onto eight *model classes*
 * (`ModelClass` in `src/sim/unitData.ts`) chosen to be told apart from across
 * the table — foot, bow, horse, machine — and the exact type moved up into a tag
 * floating over the piece. That is the Civ convention, and it works for the
 * reason it always worked: the silhouette carries "what kind of thing", the tag
 * carries "which one", and only the tag has to survive being small.
 *
 * What a badge is made of
 * -----------------------
 * Two objects, not one, and the split is the whole implementation:
 *
 *   the disc   one quad carrying one cell of a texture atlas — a parchment
 *              roundel with the class icon inked on it. The atlas is built at
 *              load by rasterising the SVGs in `public/sprites/icons/` into a
 *              canvas at twice the size a badge is ever drawn, so it is crisp on
 *              a retina panel and mipmaps cleanly when the board is zoomed out.
 *              Alpha-tested: a badge writes depth like the piece it names, and
 *              every pixel that survives the cutout is fully opaque.
 *   the rim    a flat annulus (`discRing` in `geometry.ts`) in the *player's*
 *              colour. Geometry rather than more texture, because it is the one
 *              part that changes per player: as geometry the whole board's rims
 *              batch into one draw per player, where a coloured ring baked into
 *              the atlas would need one atlas per player.
 *
 * The parchment reaches a little way under the rim (`paperOverlap`), so the
 * disc's antialiased edge is covered by an opaque band rather than fringing
 * against whatever is behind it.
 *
 * Draw cost is flat in the number of units: one instanced draw per model class
 * standing on the board (at most eight, sharing one material and one texture)
 * plus one per player colour for the rims. A hundred units and three units cost
 * the same.
 *
 * In the world, but not under the interface
 * -----------------------------------------
 * Badges are depth-tested like everything else on the board, and deliberately
 * *not* given the `onTop` treatment the HP bars and route dots get. A tag is a
 * thing standing in the diorama: a unit hidden behind a mountain must have its
 * badge hidden behind the same mountain, or the board grows a field of markers
 * hovering over a ridge with nothing under them. Clearing the sculpt's own head
 * is done by lifting the badge (`badges.lift`), not by cheating the depth test.
 *
 * What they *are* given is a late draw order (`RENDER_ORDER.badge`), and the two
 * are not the same thing. The hover and selection rings ignore depth entirely
 * and are drawn after the board, which meant they painted straight over the tags
 * of the units they were drawn around — the ring is a mark on the ground *under*
 * a piece, so having it wipe out the piece's name was the wrong reading of
 * "nothing may hide a ring". A badge now draws after the rings and still tests
 * depth against the terrain, which is both properties at once; the flag that
 * buys it is `transparent`, because a draw order only means anything in the pass
 * three sorts by it (see `badgeDiscFlags`).
 *
 * The second atlas: what is printed on a tile
 * -------------------------------------------
 * The same machinery, one plane down. `TileIcons` (below) rasterises every
 * resource mark, the six yield glyphs and ten numerals into a second atlas,
 * and the lens layer prints them flat on the ground. They share this file with
 * the badges rather than living in one of their own because they are the same
 * *system* — a roundel, an ink mark, one grid, one stroke language, one cell
 * layout — and splitting them would have meant two copies of the layout
 * arithmetic that decides texture coordinates.
 *
 * What differs is only what a mark is *for*, and the tile atlas now serves both
 * answers. A yield glyph names what the ground *makes*: it lies on the face like
 * every other decal, with the depth test off, because a readout may not be
 * swallowed by the hill it is printed behind. A resource roundel names what is
 * *on* the ground, which is a thing rather than a number — so it stands up on a
 * pin over its hex and is drawn exactly like a unit badge, depth test and all
 * (see `TileIcons.standingMaterial` and `addResourceMarkers` in `lens3d.ts`).
 * One texture, one cell layout, two materials.
 *
 * Everything except `UnitBadges`, `TileIcons` and the cell painters is pure
 * arithmetic on the data, which is what `test/badges3d.test.ts` checks; the
 * exceptions need a canvas and are exercised by the browser.
 */

import {
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  MeshBasicMaterial,
  SRGBColorSpace,
} from 'three';

import { HERALDRY_IDS, type HeraldryId, heraldryMark } from '../art/heraldryMarks';
import { DRACONES_LINES, marginaliaMark } from '../art/marginaliaMarks';
import {
  MARK_BOX,
  MARK_STROKE,
  type MarkPath,
  RESOURCE_MARK_BOX,
  RESOURCE_MARK_SCALE,
  RESOURCE_MARK_STROKE,
  resourceMark,
} from '../art/resourceMarks';
import { siteMark } from '../art/siteMarks';
import {
  YIELD_MARK_BOX,
  YIELD_MARK_SCALE,
  YIELD_MARK_STROKE,
  yieldMark,
} from '../art/yieldMarks';
import { DISCOVERY_KINDS, type DiscoveryKind } from '../sim/discoveryData';
import { RESOURCE_IDS, type ResourceId, resourceDef } from '../sim/resourceData';
import type { ModelClass } from '../sim/unitData';

import { type MarkerPaperStyle, VIEW3D, mixColor } from './lookData';

const BADGE = VIEW3D.badges;
const HP = VIEW3D.hpBar;
const ICONS = VIEW3D.icons;
const LENS = VIEW3D.lens;

/**
 * What a badge can say, which is *nearly* the model class and no longer exactly
 * it.
 *
 * The sculpt is chosen by `ModelClass` and always will be — that is a fact about
 * what a piece is shaped like. The badge answers a different question, "what am
 * I looking at", and the great people broke the two apart: a great person stands
 * on the settler's sculpt (`modelClass` in `data/units.json`) and must not wear
 * the settler's *name*, because a player who marches Archimedes at a hex looking
 * for a city site has been lied to by the board.
 *
 * One extra member and not five. Families differ by what they *do*, and the game
 * says which family a piece is by its name in the unit panel; a scholar and a
 * general drawn with two badges would be two more silhouettes to learn for
 * information the interface already gives in words. What the board owes is the
 * one distinction it cannot say any other way: *this piece is not a settler.*
 *
 * `religious` is the second such member and arrived the same way, one sentence
 * later. An augur is sculpted as a **worker** — it is a civilian on foot with a
 * bundle, and carving it a body of its own would be a fifteenth miniature nobody
 * could pick out at forty pixels — so without a badge of its own the board says
 * "worker" over a piece that cannot build a road and is the only thing in the
 * game that spends faith. One badge for the whole family again, and for the
 * reason above: the prophet the High Temple brings is the same kind of piece
 * doing the same kind of thing, and it will wear this one rather than an
 * eleventh. Named for what the family *is* rather than for the augur, because
 * `consecrates` is the marker (see `badgeClassFor`) and nothing here has ever
 * compared a unit type against a name.
 *
 * `spear` is the third, and it arrived from the other direction. The two above
 * are rows that are *not what they are shaped like*; a spearman is exactly what
 * it is shaped like — a foot soldier, `modelClass: 'melee'`, sharing the
 * swordsman's sculpt and rightly so — and the badge still owes it a mark,
 * because the sword says "this is the line you send at a city" and the spear
 * line is the one you send at a horse (user, 2026-08-27: "spearman line needs
 * its own icon distinct from warrior line"). So the badge is one grade finer
 * than the sculpt here rather than one grade coarser, and which rows take it is
 * `badges.byUnitType` in `data/view3d.json` — art keyed by row, never a name
 * compared in this file.
 *
 * `trader` is the fourth, and it is the `religious` case exactly: a caravan is
 * sculpted as a **worker** (`modelClass: 'worker'` on its roster row) because it
 * is a civilian on foot with something on its back, and "worker" floating over
 * the one piece in the game that lays road and carries a route is the same wrong
 * sentence an augur was getting. It comes in through `badges.byUnitType` rather
 * than off a marker on the unit row, unlike the candle: `trades` is a fact the
 * rules carry, but the *sculpt* already splits here (see `SculptId` in
 * `board3d.ts`), and one art table saying which drawing a row wears is cheaper
 * than a second clause in `badgeClassFor` — which stays two clauses and a table
 * however many rows the roster grows.
 */
export type BadgeClass = ModelClass | 'greatPerson' | 'religious' | 'spear' | 'trader';

/**
 * The atlas layout, in cell order, and the authority on which cell a class
 * lands in.
 *
 * A list rather than a derivation from the sculpt registry, because it decides
 * texture coordinates: reordering the registry must never silently re-point
 * every badge on the board at somebody else's icon. `test/pieces3d.test.ts`
 * checks it covers every model class and names the two members that are not one.
 *
 * Grown by **appending**, which is the same rule `TILE_ICON_CELLS` carries and
 * for the same reason: every consumer re-derives its rectangle through
 * `badgeCellRect` at build time and nothing writes an index down, so a new cell
 * on the end costs a row of atlas and re-points nothing. Twelve cells in a
 * four-wide atlas is three full rows, and the layout arithmetic has always been
 * a function of the count — `spear` was appended and nothing else moved, then
 * `trader` was appended and nothing else moved again, which is the rule doing
 * its job rather than being quoted.
 */
export const BADGE_CELLS: readonly BadgeClass[] = [
  'settler',
  'worker',
  'melee',
  'ranged',
  'mounted',
  'mountedRanged',
  'siege',
  'scout',
  'greatPerson',
  'religious',
  'spear',
  'trader',
];

/**
 * Where each class's icon lives, relative to the site root.
 *
 * SVG, not PNG. The badge has to be legible at one zoom and not crawl at
 * another, and a vector rasterised into the atlas at load is sharp at whatever
 * size the data asks for — including the day somebody doubles `atlasCell`
 * because the panel got bigger. Vendored under `public/` because Vite serves
 * `public/` and only `public/`; see `public/sprites/CREDITS.md` for provenance.
 *
 * A **file** and not path data, which is worth one sentence because everything
 * else printed on this board went the other way (see the trap in `CLAUDE.md`:
 * the tile atlas has no `loadIcon` left). The reason those moved is that the
 * *interface* prints the same marks in four inks, and a file can only be one
 * colour. A class badge is printed here and nowhere else, so it has never paid
 * that cost, and a set of ten in which one member arrived by a different route
 * would be a set of nine plus an exception. If a DOM surface ever needs these,
 * the whole set moves together — `paintMarkPaths` in this file is already the
 * printer that would take them.
 *
 * As of the icon pass the drawings behind these are **Tabler Icons** (MIT)
 * rather than this project's own hand — the same decision `yieldMarks.ts` made
 * for the six yield voices, for the same reason and at the same weight (2.75 of
 * a 24-unit box, where upstream ships 2). Nine are Tabler drawings copied
 * verbatim; the horse-archer is two of them composed and the catapult and the
 * spear are drawn here in Tabler's geometry, because neither Tabler nor Lucide
 * has any of those shapes and a filled silhouette from a third family would make
 * this set two sets. `public/sprites/CREDITS.md` names each one; the files carry
 * it too.
 */
export const BADGE_ICON_FILES: Record<BadgeClass, string> = {
  settler: 'sprites/icons/settler.svg',
  worker: 'sprites/icons/worker.svg',
  melee: 'sprites/icons/melee.svg',
  ranged: 'sprites/icons/ranged.svg',
  mounted: 'sprites/icons/mounted.svg',
  mountedRanged: 'sprites/icons/mountedRanged.svg',
  siege: 'sprites/icons/siege.svg',
  scout: 'sprites/icons/scout.svg',
  greatPerson: 'sprites/icons/greatPerson.svg',
  religious: 'sprites/icons/religious.svg',
  spear: 'sprites/icons/spear.svg',
  trader: 'sprites/icons/trader.svg',
};

// --- layout arithmetic -----------------------------------------------------

/** The pixel shape of the atlas: how the cells are tiled, and how big it is. */
export interface AtlasLayout {
  cell: number;
  columns: number;
  rows: number;
  width: number;
  height: number;
}

/**
 * Tiles `count` square cells into a grid `columns` wide.
 *
 * Kept as a function of a count rather than reading `BADGE_CELLS.length`
 * directly so it is testable at sizes the roster does not currently have — the
 * ninth model class is the one that will break a hand-written 4 × 2.
 */
export function badgeAtlasLayout(count: number, columns: number, cell: number): AtlasLayout {
  const cols = Math.max(1, Math.min(Math.round(columns), Math.max(1, count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  return { cell, columns: cols, rows, width: cols * cell, height: rows * cell };
}

/** The live layout, for the roster and the numbers in `view3d.json`. */
export function badgeAtlasSize(): AtlasLayout {
  return badgeAtlasLayout(BADGE_CELLS.length, BADGE.atlasColumns, BADGE.atlasCell);
}

/** A sub-rectangle of the atlas, in texture coordinates. */
export interface AtlasRect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

/**
 * The texture coordinates of one class's cell.
 *
 * v is flipped because `CanvasTexture` arrives with three's default
 * `flipY = true`: the canvas's *first* row of cells is the one at v = 1. Getting
 * this backwards does not fail, it silently draws the bottom row of icons on the
 * top row of units, which is exactly the kind of bug a test can hold still.
 */
export function badgeCellRect(cls: BadgeClass): AtlasRect {
  const layout = badgeAtlasSize();
  const index = BADGE_CELLS.indexOf(cls);
  if (index < 0) throw new Error(`badges: ${cls} has no atlas cell`);
  const col = index % layout.columns;
  const row = Math.floor(index / layout.columns);
  return {
    u0: col / layout.columns,
    u1: (col + 1) / layout.columns,
    v0: 1 - (row + 1) / layout.rows,
    v1: 1 - row / layout.rows,
  };
}

/** The top-left pixel of one class's cell in the atlas canvas. */
export function badgeCellOrigin(index: number, layout: AtlasLayout): { x: number; y: number } {
  return {
    x: (index % layout.columns) * layout.cell,
    y: Math.floor(index / layout.columns) * layout.cell,
  };
}

/**
 * The rim's inner radius as a fraction of its outer radius, which is what
 * `discRing` is built from.
 *
 * Clamped rather than trusted: a `rimWidth` at or past the radius would produce
 * a solid disc of player colour with the icon buried under it, and the failure
 * would look like "the badges stopped working" rather than like a bad number.
 */
export function rimInnerFraction(): number {
  const radius = BADGE.diameter / 2;
  return Math.max(0.05, Math.min(0.95, (radius - BADGE.rimWidth) / radius));
}

/**
 * The parchment disc's radius as a fraction of the atlas cell — i.e. in the same
 * units as the quad, which spans the badge's whole diameter.
 *
 * It reaches `paperOverlap` of the way out through the rim band, so the paper's
 * soft edge is always behind opaque geometry. Straight out to the rim's inner
 * edge would leave a hairline of board showing between the two on any frame
 * where the antialiasing landed the wrong way.
 */
export function paperRadiusFraction(): number {
  const inner = 0.5 * rimInnerFraction();
  return inner + Math.max(0, Math.min(1, BADGE.paperOverlap)) * (0.5 - inner);
}

// --- where a badge floats --------------------------------------------------

/**
 * The badge's centre, as a height above the unit's feet.
 *
 * Measured off the unit's own visual height — a sculpt's class height, or a
 * standee's card height — so a badge rides at the same clearance over a catapult
 * as over a knight, and neither is hidden by its own hardware.
 */
export function badgeCenterY(visualHeight: number): number {
  return visualHeight + BADGE.lift + BADGE.diameter / 2;
}

/**
 * The radius of the disc a *click* answers to, in world units.
 *
 * The drawn roundel, widened by `badges.hitboxScale`. A badge is a selection
 * target now (see `MapView.pickUnitBadge`) and it is a small one — the ink is
 * about forty pixels across at game zoom — so the target is deliberately a
 * little larger than the artwork, the way every small control on every toolbar
 * has always been.
 *
 * It is a *world* radius rather than a pixel one on purpose: the badge is a quad
 * standing in the diorama, so its screen size is whatever the projection makes
 * of it, and the hit test derives its pixel radius by projecting this offset
 * (see `pickBadge` in `picking.ts`). A constant number of pixels would be right
 * at exactly one zoom.
 *
 * Clamped at 1 from below: a scale under one would make the target narrower than
 * the disc the player can see, which reads as a badge refusing clicks that
 * plainly landed on it.
 */
export function badgeHitRadius(): number {
  return (BADGE.diameter / 2) * Math.max(1, BADGE.hitboxScale);
}

/** The top of the badge disc, above the unit's feet. */
export function badgeTopY(visualHeight: number): number {
  return visualHeight + BADGE.lift + BADGE.diameter;
}

/**
 * Where the HP bar's centre rides: above the badge, not above the sculpt.
 *
 * Above rather than below, which was the other candidate and is what Civ does.
 * Two reasons it lost. The badge is permanent and the bar is not, so hanging the
 * bar under the badge would mean the *badge* moves the day somebody decides it
 * should sit tighter to the head, while stacking the transient thing on the
 * outside leaves the permanent one glued to the piece it names. And the bar is
 * drawn `onTop` — no depth test at all — while the badge is an ordinary object
 * in the world; overlapping the two would let a bar shine through a disc that is
 * in front of it, which reads as a rendering bug rather than as a stack.
 */
export function hpBarY(visualHeight: number): number {
  return badgeTopY(visualHeight) + HP.lift;
}

// --- the atlas -------------------------------------------------------------

/** `0xRRGGBB` as the `#rrggbb` string a canvas context wants. */
export function cssHex(color: number): string {
  return `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;
}

/**
 * The two inks a badge cell can be printed in: a nation's, and the wild's.
 *
 * A *pair of colours* rather than a flag, because the atlas painter has no
 * business knowing what a barbarian is — it is handed paper and ink and prints
 * with them. Which pair a piece gets is `pieces.ts`'s question, asked of
 * `isBarbarian` (`src/sim/state.ts`), which is the register for "who is the
 * wild"; nothing here compares a seat against a name or a colour.
 */
export interface BadgeInkStyle {
  paper: number;
  ink: number;
}

/** The ordinary roundel: bone parchment, ink mark. */
export function nationBadgeStyle(): BadgeInkStyle {
  return { paper: BADGE.paperColor, ink: BADGE.inkColor };
}

/** The wild's: darkened parchment, oxblood mark. See `BadgeSpec.wildPaperColor`. */
export function wildBadgeStyle(): BadgeInkStyle {
  return { paper: BADGE.wildPaperColor, ink: BADGE.wildInkColor };
}

/**
 * Paints one cell: the parchment roundel, then the icon inked on top of it.
 *
 * The icon arrives as whatever colour its SVG was authored in and leaves in the
 * style's ink, recoloured through a scratch canvas with `source-in` — which
 * keeps the ink a *data* decision rather than something baked into eleven files
 * that would all have to be re-exported to change it. That indirection is also
 * what makes the wild's atlas free: the same eleven drawings, printed a second
 * time in a second pair of colours, with no second set of files.
 *
 * A null icon is not an error. The roundel is still drawn, so a class whose
 * artwork failed to load shows a blank parchment token rather than nothing at
 * all, and the unit under it is still visibly a unit with a badge.
 */
export function drawBadgeCell(
  context: CanvasRenderingContext2D,
  icon: CanvasImageSource | null,
  index: number,
  layout: AtlasLayout,
  style: BadgeInkStyle = nationBadgeStyle(),
): void {
  const origin = badgeCellOrigin(index, layout);
  const cell = layout.cell;
  const center = { x: origin.x + cell / 2, y: origin.y + cell / 2 };

  context.save();
  context.fillStyle = cssHex(style.paper);
  context.beginPath();
  context.arc(center.x, center.y, paperRadiusFraction() * cell, 0, Math.PI * 2);
  context.fill();
  context.restore();

  if (!icon) return;

  const size = Math.max(1, Math.round(BADGE.iconScale * cell));
  const scratch = document.createElement('canvas');
  scratch.width = size;
  scratch.height = size;
  const ink = scratch.getContext('2d');
  if (!ink) return;
  ink.drawImage(icon, 0, 0, size, size);
  // `source-in` keeps the icon's alpha and replaces its colour wholesale. Done
  // on its own canvas so it cannot reach the parchment already painted here.
  ink.globalCompositeOperation = 'source-in';
  ink.fillStyle = cssHex(style.ink);
  ink.fillRect(0, 0, size, size);
  context.drawImage(scratch, Math.round(center.x - size / 2), Math.round(center.y - size / 2));
}

// --- the tile icons --------------------------------------------------------

/**
 * The second atlas: everything that is printed flat *on a tile* rather than
 * floating over a piece.
 *
 * Three sets share it, and sharing is the point — one canvas, one texture, one
 * material, so a board showing resources and yields at once costs a handful of
 * draws rather than one per kind of mark:
 *
 *   resources  a parchment roundel with the resource's ink mark on it, drawn
 *              exactly like a unit badge. The resource *lens* puts these on the
 *              tiles a player may be told about (see `visibleResourceAt`).
 *   yields     one glyph per yield voice — sheaf, hammer, coin, flask, mask,
 *              flame — inked on a disc of that voice's own colour. See
 *              `drawYieldCell` for why the disc survived the pips it replaced.
 *   numerals   ten digits on parchment, for the "and more than four" case.
 *
 * The cell order below is the authority on which cell is which, exactly as
 * `BADGE_CELLS` is for the badges, and for the same reason: it decides texture
 * coordinates, so reordering it would silently re-point every mark on the board
 * at somebody else's picture.
 */
export const YIELD_KEYS = [
  'food',
  'production',
  'gold',
  'science',
  'culture',
  'faith',
] as const;
export type YieldKey = (typeof YIELD_KEYS)[number];

/** The ten digits, in value order. `NUMERAL_CELLS[3]` is the glyph for 3. */
export const NUMERAL_CELLS: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * The marginalia: marks that are drawn on the *chart* rather than on the world.
 *
 * The only purely decorative set in the project — what a cartographer puts in
 * the part of the sea he has never been to (*hic svnt dracones*, design-notes
 * Entry X). They ride in this atlas rather than in one of their own because
 * they are the same object as every other mark here: ink on the badge grid,
 * printed flat on a hex. A second canvas for two cells would be a second
 * texture, a second material and a second draw call for a garnish.
 *
 * Two members, and they are printed by two different painters because they are
 * two different kinds of thing — see `src/art/marginaliaMarks.ts`:
 *
 *   serpent    a drawing, traced from path data like every other mark here.
 *   dracones   **words**, set rather than drawn: two lines of letterspaced
 *              small caps at reduced strength. `drawInscriptionCell`.
 *
 * Unlike every other set here they are drawn with **no disc under them**. A
 * roundel is a token laid on the board; a marginale is drawn *into* the vellum,
 * and a parchment disc behind it would turn it into a badge announcing
 * something.
 */
export const MARGINALIA_CELLS = ['serpent', 'dracones'] as const;
export type MarginaliaKey = (typeof MARGINALIA_CELLS)[number];

/**
 * The heraldic charges: one cell per seat's drawn figure
 * (`src/art/heraldryMarks.ts`).
 *
 * Aliased from the art registry rather than written out again, for
 * `SITE_MARK_CELLS`' reason: a charge a seat can fly with no cell here is a
 * banner that throws from inside the rasterisation.
 *
 * Printed on **parchment**, unlike the marginalia and like everything else in
 * this atlas: a charge is stamped on the *coloured* fly of a city flag, in the
 * seat's own tincture, and ink straight on a dark tincture is a smudge while
 * ink on a pale one is fine. Bringing its own little field of parchment (a
 * canton, which is what real heraldry does for exactly this reason) means the
 * charge reads identically on crimson, on sky and on ink, with no tinting of a
 * baked picture.
 *
 * These cells were also the unit badge's crest boss until the 2026-08-27
 * ruling removed it — the colour of a badge's rim is mark enough for a piece
 * that small. The cells stayed: the flag is still drawn from them.
 */
export const CHARGE_CELLS: readonly HeraldryId[] = HERALDRY_IDS;

/**
 * The discovery sites, in the order `DISCOVERY_KINDS` declares them.
 *
 * Aliased from the simulation's own list rather than written out again, because
 * a kind the sim can put on a tile and this atlas has no cell for is a marker
 * that throws from inside a canvas rasterisation. The camp is deliberately not
 * a member — see `src/art/siteMarks.ts` for why an occupation gets no pin.
 */
export const SITE_MARK_CELLS: readonly DiscoveryKind[] = DISCOVERY_KINDS;

/** A cell of the tile atlas: which set it belongs to, and which member. */
export type TileIconCell =
  | { set: 'resource'; id: ResourceId }
  | { set: 'yield'; id: YieldKey }
  | { set: 'numeral'; id: number }
  | { set: 'marginalia'; id: MarginaliaKey }
  | { set: 'site'; id: DiscoveryKind }
  | { set: 'charge'; id: HeraldryId };

/**
 * Every cell of the tile atlas, in layout order: the resources, then the six
 * yield voices, then the digits, then the marginalia.
 *
 * Appended rather than inserted, and that is not politeness — this list decides
 * texture coordinates, so putting the serpent anywhere but the end would shift
 * every cell after it and silently re-point marks on the board at somebody
 * else's picture. New sets go on the end, always — which is where the site
 * marks went when they arrived, behind the marginalia rather than beside the
 * resources they are printed most like.
 */
export const TILE_ICON_CELLS: readonly TileIconCell[] = [
  ...RESOURCE_IDS.map((id) => ({ set: 'resource', id }) as TileIconCell),
  ...YIELD_KEYS.map((id) => ({ set: 'yield', id }) as TileIconCell),
  ...NUMERAL_CELLS.map((id) => ({ set: 'numeral', id }) as TileIconCell),
  ...MARGINALIA_CELLS.map((id) => ({ set: 'marginalia', id }) as TileIconCell),
  ...SITE_MARK_CELLS.map((id) => ({ set: 'site', id }) as TileIconCell),
  ...CHARGE_CELLS.map((id) => ({ set: 'charge', id }) as TileIconCell),
];

/**
 * Where each mark's artwork lives, relative to the site root.
 *
 * SVG for the same reason the badge icons are: a vector rasterised into the
 * atlas at load is sharp at whatever cell size the data asks for. The numerals
 * have no files — they are drawn with the canvas's own text, which is the one
 * place in this renderer that is honest about being cheaper: a digit is a digit
 * in any face, and twelve hand-drawn numerals would be twelve files nobody
 * could tell apart from `fillText`.
 *
 * The resources have no files either, and for a different reason: their marks
 * are **path data** in `src/art/resourceMarks.ts`, traced straight into the cell
 * (see `drawResourceCell`). They moved out of `public/` when the set went from
 * seventeen drawings and twenty-four emoji to forty-one drawings, because the
 * DOM panels print the same marks and a file can only be one colour — see
 * `src/ui/resourceMark.ts`. One drawing, two printers, no rasterised middleman.
 *
 * The **yields** followed them out of `public/` when the six voices were re-cut
 * from Lucide and Tabler (`src/art/yieldMarks.ts`), for that reason and one
 * more: a yield glyph is the most-printed mark in the interface and it is now on
 * a dozen DOM surfaces as a mask, so it had to be data. The side effect is worth
 * naming, because it was a live worry — a yield cell can no longer rasterise
 * blank because a file was renamed or a fetch was blocked, since there is
 * nothing left to fetch.
 *
 * The **marginalia** were the last set with a file and are not any more
 * (`src/art/marginaliaMarks.ts`), which finishes the argument: *nothing* in this
 * atlas is fetched. The tile atlas cannot rasterise a blank cell at all now —
 * the whole `loadIcon` path is gone from `TileIcons.load`, and the only cells
 * left that are not traced from path data are the numerals and the inscription,
 * both of which are set in text. `loadIcon` survives for the **badge** atlas,
 * whose eight class icons are still files, and it is the only place a null icon
 * is still reachable.
 *
 * The **charges** were born as path data and never had a file, for the reason
 * the resources moved: the interface prints the same twelve marks as DOM masks
 * beside each seat, and a file can only be one colour.
 */

/** The colour each yield voice is printed in. The interface's own six. */
export const YIELD_COLORS: Record<YieldKey, number> = {
  food: LENS.foodColor,
  production: LENS.productionColor,
  gold: LENS.goldColor,
  science: LENS.scienceColor,
  culture: LENS.cultureColor,
  faith: LENS.faithColor,
};

/** The live layout of the tile atlas. */
export function tileAtlasSize(): AtlasLayout {
  return badgeAtlasLayout(TILE_ICON_CELLS.length, ICONS.atlasColumns, ICONS.atlasCell);
}

/** The index of one cell in the tile atlas, or −1 when it is not in it. */
export function tileIconIndex(cell: TileIconCell): number {
  return TILE_ICON_CELLS.findIndex(
    (entry) => entry.set === cell.set && entry.id === cell.id,
  );
}

/**
 * The texture coordinates of one tile-atlas cell.
 *
 * The v flip is `badgeCellRect`'s, and it is here for the same reason and with
 * the same failure mode: get it backwards and the board silently prints the
 * wrong row of icons rather than failing.
 */
export function tileIconRect(cell: TileIconCell): AtlasRect {
  const layout = tileAtlasSize();
  const index = tileIconIndex(cell);
  if (index < 0) throw new Error(`icons: ${cell.set} ${String(cell.id)} has no atlas cell`);
  const col = index % layout.columns;
  const row = Math.floor(index / layout.columns);
  return {
    u0: col / layout.columns,
    u1: (col + 1) / layout.columns,
    v0: 1 - (row + 1) / layout.rows,
    v1: 1 - row / layout.rows,
  };
}

/**
 * Paints the mark itself, centred in a cell: the row's artwork recoloured to
 * `ink`, or — with nothing drawn for it yet — the row's own glyph as a
 * provisional stand-in.
 *
 * Split out of `drawDiscCell` so a shape with a paper *and* a rim
 * (`drawResourceCell`) can put the mark on top of both without repeating the
 * recolour-and-stamp arithmetic. Nothing here knows or cares what the paper
 * under it looked like.
 */
function paintCellMark(
  context: CanvasRenderingContext2D,
  icon: CanvasImageSource | null,
  center: { x: number; y: number },
  cell: number,
  ink: number,
  iconScale: number,
  fallbackGlyph?: string,
): void {
  // No drawn artwork: print the row's own glyph on the disc instead of leaving
  // it blank. This is what makes a resource added to `data/resources.json` and
  // nowhere else legible on the board — the roundel still *names* the find,
  // provisionally and obviously, until somebody draws it an icon.
  if (!icon && fallbackGlyph) {
    context.save();
    context.fillStyle = cssHex(ink);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `${Math.round(cell * iconScale)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    context.fillText(fallbackGlyph, center.x, center.y);
    context.restore();
    return;
  }
  if (!icon) return;
  const size = Math.max(1, Math.round(iconScale * cell));
  const scratch = document.createElement('canvas');
  scratch.width = size;
  scratch.height = size;
  const pen = scratch.getContext('2d');
  if (!pen) return;
  pen.drawImage(icon, 0, 0, size, size);
  pen.globalCompositeOperation = 'source-in';
  pen.fillStyle = cssHex(ink);
  pen.fillRect(0, 0, size, size);
  context.drawImage(scratch, Math.round(center.x - size / 2), Math.round(center.y - size / 2));
}

/**
 * Paints one icon onto a disc: the disc in `paper`, then the mark recoloured to
 * `ink` on top of it.
 *
 * The generalisation of `drawBadgeCell` — the roundel is the same object in both
 * atlases — with the two colours as arguments, because the tile atlas needs
 * three different discs (parchment for a resource, and the six yield voices)
 * out of one routine. `drawResourceCell` is the sibling that swaps the plain
 * disc for a kind-shaped paper and a coloured rim; this one keeps the shape
 * every other cell of the atlas still wants.
 */
function drawDiscCell(
  context: CanvasRenderingContext2D,
  icon: CanvasImageSource | null,
  index: number,
  layout: AtlasLayout,
  paper: number,
  ink: number,
  iconScale: number,
  radiusFraction = paperRadiusFraction(),
  fallbackGlyph?: string,
): { x: number; y: number } {
  const origin = badgeCellOrigin(index, layout);
  const cell = layout.cell;
  const center = { x: origin.x + cell / 2, y: origin.y + cell / 2 };

  context.save();
  context.fillStyle = cssHex(paper);
  context.beginPath();
  context.arc(center.x, center.y, radiusFraction * cell, 0, Math.PI * 2);
  context.fill();
  context.restore();

  paintCellMark(context, icon, center, cell, ink, iconScale, fallbackGlyph);
  // Handed back for the caller that draws its *own* mark on the disc — the yield
  // voices, whose art is path data. `paintMarkerPaper` makes the same promise
  // one shape over, and for the same reason: the centre is arithmetic nobody
  // should be repeating beside the routine that already did it.
  return center;
}

/**
 * How far a kind's shape reaches past the radius its path is traced at, as a
 * multiple of that radius: `1` for a shape that stays on the circle it is
 * built from, and more for one that bulges past it.
 *
 * The one number `markerPaperRadius` needs to keep every kind's outer edge
 * at the *same* boundary a plain circle would reach — `paperRadiusFraction()`,
 * the boundary the badge parchment and every other tile-atlas disc already
 * respects. Cells are packed edge to edge with no gutter (see
 * `yieldDiscLayout`), so a shape that ignored this would bleed into its
 * neighbour the day somebody dialled up `scallopDepth`.
 */
export function markerPaperExtent(style: MarkerPaperStyle): number {
  if (style.shape === 'scallop') return 1 + Math.max(0, style.scallopDepth ?? 0);
  return 1;
}

/**
 * The base radius `traceMarkerPaper` should be called with, so that whatever
 * it draws — circle, scallop or shield — tops out at `outerFraction * cell`,
 * the same outer edge a plain roundel has always drawn to, with the rim's own
 * stroke (half of it falls outside the fill) accounted for too.
 */
export function markerPaperRadius(
  style: MarkerPaperStyle,
  outerFraction: number,
  cell: number,
): number {
  const outer = outerFraction * cell;
  const rimHalf = (style.rimWidth * cell) / 2;
  return Math.max(1, (outer - rimHalf) / markerPaperExtent(style));
}

/**
 * Traces one kind's paper silhouette into `context`'s current path, centred at
 * `(cx, cy)` and built from `radius` — the number `markerPaperRadius` hands
 * back, not the cell's own half-width.
 *
 * Three shapes, and every one of them is a closed path a `fill` and a `stroke`
 * both read the same way, which is what lets one call site paint the paper and
 * the rim off a single trace:
 *
 *   `circle`   bonus, unchanged from the roundel every mark used to be.
 *   `scallop`  luxury's fluted coin: the radius itself is modulated by a sine
 *              of `scallops` full bumps per turn, walked in enough steps that
 *              the curve reads as fluted rather than faceted at cell size.
 *   `shield`   strategic's squared, pointed-base tag — flat shoulders, rounded
 *              top corners, tapering to a point at the foot. The Civ
 *              convention for "this is what a unit needs", read as a
 *              silhouette rather than as a colour.
 *   `hex`      the discovery sites' tablet: a pointed-top hexagon, six straight
 *              edges on the circle `radius` names, so its outer reach is the
 *              radius exactly and `markerPaperExtent` stays 1. The board's own
 *              cell shape, which is the argument for it — a site is a *place*,
 *              not a thing you carry — and the roomiest non-circle of the four
 *              for the mark that has to sit inside it.
 */
export function traceMarkerPaper(
  context: CanvasRenderingContext2D,
  style: MarkerPaperStyle,
  cx: number,
  cy: number,
  radius: number,
): void {
  context.beginPath();
  if (style.shape === 'scallop') {
    const bumps = Math.max(1, Math.round(style.scallops ?? 12));
    const depth = Math.max(0, style.scallopDepth ?? 0);
    const steps = Math.max(64, bumps * 12);
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const r = radius * (1 + depth * Math.sin(t * bumps));
      const x = cx + r * Math.cos(t);
      const y = cy + r * Math.sin(t);
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    return;
  }
  if (style.shape === 'shield') {
    // A unit square's worth of shield, scaled by `radius`: shoulders at
    // `±0.92`, the widest the top gets; a flat top between rounded corners of
    // `0.22`; sides falling to a waist at `+0.05` before curving to a point at
    // `+1.0`, the tip that sets the shape's own outer reach (see
    // `markerPaperExtent`).
    const w = radius * 0.92;
    const topY = cy - radius * 0.86;
    const waistY = cy + radius * 0.05;
    const tipY = cy + radius;
    const corner = radius * 0.22;
    context.moveTo(cx - w + corner, topY);
    context.lineTo(cx + w - corner, topY);
    context.quadraticCurveTo(cx + w, topY, cx + w, topY + corner);
    context.lineTo(cx + w, waistY);
    context.quadraticCurveTo(cx + w, waistY + radius * 0.3, cx + w * 0.55, waistY + radius * 0.42);
    context.quadraticCurveTo(cx + w * 0.15, tipY - radius * 0.1, cx, tipY);
    context.quadraticCurveTo(cx - w * 0.15, tipY - radius * 0.1, cx - w * 0.55, waistY + radius * 0.42);
    context.quadraticCurveTo(cx - w, waistY + radius * 0.3, cx - w, waistY);
    context.lineTo(cx - w, topY + corner);
    context.quadraticCurveTo(cx - w, topY, cx - w + corner, topY);
    context.closePath();
    return;
  }
  if (style.shape === 'hex') {
    // Pointed top: the first vertex is straight up, and the rest follow every
    // sixty degrees. Canvas y grows downward, so "up" is −90°.
    for (let i = 0; i < 6; i++) {
      const angle = (-90 + i * 60) * (Math.PI / 180);
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    return;
  }
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.closePath();
}

/**
 * Traces one drawn mark into the cell, scaled from its authoring grid.
 *
 * The whole of the resource half of this atlas: no image, no scratch canvas, no
 * `source-in` recolour — the paths arrive as data and are stroked in
 * `icons.inkColor` directly. `context.scale` is what carries the stroke weights
 * with them, which is why `MARK_STROKE` is quoted in grid units and never in
 * pixels; a mark authored at weight 5 in a 64 box is weight 5 at *whatever* the
 * atlas cell turns out to be, which is the property that let `icons.atlasCell`
 * be a tuning number in the first place.
 *
 * `Path2D` rather than a hand-rolled path walker because the marks are SVG path
 * data and the browser already has the one parser everybody agrees on; the DOM
 * side (`src/ui/resourceMark.ts`, `src/ui/yieldMark.ts`) feeds the same strings
 * to the same parser through a `<path>`, so the two printers cannot disagree
 * about a curve.
 *
 * `box` and `stroke` default to this project's own grid and are arguments only
 * because the yield voices are a *vendored* set on upstream's 24-unit grid (see
 * `src/art/yieldMarks.ts`): rescaling their path data to 64 would have made them
 * numbers nobody could check against the source any more, so the tracer takes
 * the grid instead. Everything the docblock above says about weights carrying
 * through `context.scale` holds per grid.
 */
function paintMarkPaths(
  context: CanvasRenderingContext2D,
  mark: { paths: readonly MarkPath[] },
  center: { x: number; y: number },
  size: number,
  ink: number,
  box = MARK_BOX,
  stroke = MARK_STROKE,
): void {
  const scale = size / box;
  context.save();
  context.translate(center.x - size / 2, center.y - size / 2);
  context.scale(scale, scale);
  context.fillStyle = cssHex(ink);
  context.strokeStyle = cssHex(ink);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const path of mark.paths) {
    const traced = new Path2D(path.d);
    if (path.fill) context.fill(traced);
    const width = path.width ?? stroke;
    // Weight zero is "filled only" — a pip or an eye, which has no outline at
    // all rather than a hairline one, exactly as the authored files drew them.
    if (width > 0) {
      context.lineWidth = width;
      context.stroke(traced);
    }
  }
  context.restore();
}

/**
 * Paints one resource's roundel: paper and rim shaped by its `ResourceKind`
 * (`ICONS.resourceKinds`), then the drawn mark on top of both.
 *
 * The kind differentiation is a *fill and a stroke of one traced path*, both
 * baked into the atlas at load — see the trap in `CLAUDE.md` this follows:
 * nothing about a printed atlas cell can be tinted or re-shaped per instance
 * once it is drawn, so bonus, strategic and luxury have to look different in
 * the canvas or they cannot look different on the board at all.
 *
 * A resource with no drawn mark falls through to `fallbackGlyph` — the row's
 * `emoji`, printed on the roundel exactly as it always was. Nothing in
 * `data/resources.json` takes that path today; it is there so that a row
 * installed at runtime still *names* its find, provisionally and obviously,
 * until somebody draws it a mark.
 */
function drawResourceCell(
  context: CanvasRenderingContext2D,
  index: number,
  layout: AtlasLayout,
  id: ResourceId,
  fallbackGlyph?: string,
): void {
  const center = paintMarkerPaper(
    context,
    index,
    layout,
    ICONS.resourceKinds[resourceDef(id).kind],
  );

  const mark = resourceMark(id);
  if (mark === null) {
    paintCellMark(
      context,
      null,
      center,
      layout.cell,
      ICONS.inkColor,
      ICONS.iconScale,
      fallbackGlyph,
    );
    return;
  }
  // One grid, one weight, one print size for all forty-one — the whole table is
  // on upstream's 24-unit box now (see the module docblock in `resourceMarks.ts`),
  // so there is no per-mark lookup left to get wrong. The inset is
  // `RESOURCE_MARK_SCALE`, which reconciles a 24-unit drawing's reach with the
  // roundel's rim exactly as `YIELD_MARK_SCALE` does one set over.
  paintMarkPaths(
    context,
    mark,
    center,
    Math.max(1, RESOURCE_MARK_SCALE * ICONS.iconScale * layout.cell),
    ICONS.inkColor,
    RESOURCE_MARK_BOX,
    RESOURCE_MARK_STROKE,
  );
}

/**
 * Fills and rims one cell's paper in the style given, and hands back the cell's
 * centre for whatever is printed on it.
 *
 * Lifted out of `drawResourceCell` when the discovery sites became the second
 * thing printed on shaped paper. The trace is one path read twice — a `fill` for
 * the paper and a `stroke` for the rim — which is the whole reason
 * `traceMarkerPaper` closes every silhouette it draws.
 */
function paintMarkerPaper(
  context: CanvasRenderingContext2D,
  index: number,
  layout: AtlasLayout,
  style: MarkerPaperStyle,
): { x: number; y: number } {
  const origin = badgeCellOrigin(index, layout);
  const cell = layout.cell;
  const center = { x: origin.x + cell / 2, y: origin.y + cell / 2 };
  const radius = markerPaperRadius(style, paperRadiusFraction(), cell);

  context.save();
  traceMarkerPaper(context, style, center.x, center.y, radius);
  context.fillStyle = cssHex(ICONS.paperColor);
  context.fill();
  context.lineWidth = Math.max(1, style.rimWidth * cell);
  context.strokeStyle = cssHex(style.rimColor);
  context.stroke();
  context.restore();
  return center;
}

/**
 * Paints one discovery site's marker cell: the hex tablet, then the drawing of
 * what stands on the hex.
 *
 * `drawResourceCell`'s sibling, and shorter by exactly the fallback: a resource
 * id is a row of an open JSON table and may have no drawing, while
 * `DiscoveryKind` is a two-member union with an exhaustive art record (see
 * `src/art/siteMarks.ts`), so there is no glyph to fall back to and no case in
 * which one would be reached.
 *
 * The mark is printed a shade smaller than a resource's — `siteMarkScale` — for
 * a geometric reason rather than a stylistic one: a hexagon seats a centred
 * square at about nine tenths of the width a circle of the same reach does, and
 * a drawing that ran into its own rim would read as a printing fault.
 */
function drawSiteCell(
  context: CanvasRenderingContext2D,
  index: number,
  layout: AtlasLayout,
  kind: DiscoveryKind,
): void {
  const center = paintMarkerPaper(context, index, layout, ICONS.sitePaper);
  paintMarkPaths(
    context,
    siteMark(kind),
    center,
    Math.max(1, ICONS.iconScale * SITE_MARK_SCALE * layout.cell),
    ICONS.inkColor,
  );
}

/**
 * How much of a resource mark's size a site mark is printed at.
 *
 * Code rather than `view3d.json`, because it is not a taste number: it is the
 * ratio between a hexagon's inscribed square and a circle's, and a designer who
 * dialled it would be disagreeing with geometry. `paperRadiusFraction` is
 * already the tunable that moves both.
 */
const SITE_MARK_SCALE = 0.9;

/**
 * Where a yield glyph's disc sits inside its atlas cell, and where its shadow
 * falls: both as fractions of the cell, both from `data/view3d.json`.
 *
 * Pure arithmetic and exported so it can be checked without a canvas, because
 * the invariant that matters is a *packing* one: `radius + offset` must stay
 * inside the half-cell, or a glyph's shadow bleeds into the neighbouring cell of
 * the atlas and prints on somebody else's mark. The cells are packed edge to
 * edge with no gutter (see `badgeAtlasLayout`), so nothing else catches it.
 *
 * The offset is down and to the *left* — against the direction a stack is laid
 * out in — so each disc's shadow falls on the disc it overlaps rather than into
 * empty tile. That is what makes four coins of one colour countable: without it
 * a stack of identical discs merges into one blob.
 */
export function yieldDiscLayout(): {
  radius: number;
  offsetX: number;
  offsetY: number;
} {
  return {
    radius: LENS.yieldDiscRadius,
    offsetX: -LENS.yieldShadowOffset,
    offsetY: LENS.yieldShadowOffset,
  };
}

/** A yield voice's shadow ink: its own colour, shaded toward the board's ink. */
export function yieldShadowColor(key: YieldKey): number {
  return mixColor(YIELD_COLORS[key], ICONS.inkColor, LENS.yieldShadowShade);
}

/**
 * Paints one yield glyph: its drop shadow, then the voice disc, then the mark.
 *
 * Three fills in one cell rather than a second instanced shape on the board, and
 * that is the whole reason the shadow is baked: the tile atlas is one opaque,
 * alpha-tested material drawn with the depth test off, so layering inside it is
 * decided purely by *draw order* — and instances of one `InstancedMesh` draw in
 * the order they were collected. A shadow that travelled as its own translucent
 * decal would land in the transparent pass, which three.js draws after every
 * opaque object, and every shadow on the board would print on top of the glyphs
 * it belongs under. Baked, it costs no instance, no draw call and no ordering
 * argument: a glyph and its shadow are one stamp.
 */
function drawYieldCell(
  context: CanvasRenderingContext2D,
  index: number,
  layout: AtlasLayout,
  key: YieldKey,
): void {
  const origin = badgeCellOrigin(index, layout);
  const cell = layout.cell;
  const disc = yieldDiscLayout();

  context.save();
  context.fillStyle = cssHex(yieldShadowColor(key));
  context.beginPath();
  context.arc(
    origin.x + cell / 2 + disc.offsetX * cell,
    origin.y + cell / 2 + disc.offsetY * cell,
    disc.radius * cell,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();

  // The voice's disc, then the mark traced onto it. `drawDiscCell` paints the
  // paper and nothing else here — the mark is path data now (see
  // `src/art/yieldMarks.ts`), so it goes through the same tracer the resources
  // and the sites use rather than through the image-and-recolour path, and the
  // `icon` argument that used to carry a rasterised SVG is gone with it.
  const center = drawDiscCell(
    context,
    null,
    index,
    layout,
    YIELD_COLORS[key],
    ICONS.yieldInkColor,
    ICONS.iconScale,
    disc.radius,
  );
  paintMarkPaths(
    context,
    yieldMark(key),
    center,
    Math.max(1, ICONS.iconScale * YIELD_MARK_SCALE * layout.cell),
    ICONS.yieldInkColor,
    YIELD_MARK_BOX,
    YIELD_MARK_STROKE,
  );
}

/**
 * Paints one marginale straight onto the atlas, with nothing behind it.
 *
 * `drawResourceCell` without the paper — the tracing half only. The marginalia
 * are the one set that wants this: an ink drawing on the chart, not a token laid
 * on the board. Factored out rather than passed a transparent paper colour,
 * because "fill a circle in nothing" is a fill that still costs a path and still
 * reads, at a glance through the code, as though there were a disc there.
 *
 * It used to stamp a loaded image through a recolouring scratch canvas, which is
 * what the serpent's SVG file needed; since the port to path data
 * (`src/art/marginaliaMarks.ts`) it goes through `paintMarkPaths` like every
 * other drawing in this atlas, and the ink is a data decision rather than a
 * composite operation.
 */
function drawMarginaliaCell(
  context: CanvasRenderingContext2D,
  index: number,
  layout: AtlasLayout,
): void {
  const origin = badgeCellOrigin(index, layout);
  const cell = layout.cell;
  paintMarkPaths(
    context,
    marginaliaMark('serpent'),
    { x: origin.x + cell / 2, y: origin.y + cell / 2 },
    Math.max(1, ICONS.marginaliaScale * cell),
    ICONS.marginaliaColor,
  );
}

/**
 * The inscription's fit step: how much to shrink `inscriptionScale` — a
 * *maximum*, never a promise — so the widest set line clears the cell.
 *
 * Pure and given only measured widths so it is testable with no canvas at
 * all, the way `stepCost` is testable with no board. `widths` are the tracked
 * widths of the set lines at the maximum size; `usable` is the cell's width
 * minus its padding on both sides. The ratio is `1` — no shrink — when the
 * widest line already clears, because growing type to *fill* the cell is a
 * different feature nobody asked for; otherwise it is exactly the ratio that
 * brings the widest line to `usable`, and the shorter lines come along under
 * it with room to spare. A non-positive `usable` (a pathological tunable) or
 * a non-positive widest width returns `1` rather than a division by zero or a
 * negative scale — the fit step declines to make the text disappear.
 */
export function fitInscription(widths: readonly number[], usable: number): number {
  const widest = Math.max(0, ...widths);
  if (widest <= 0 || usable <= 0 || widest <= usable) return 1;
  return usable / widest;
}

/**
 * Paints the inscription: *hic svnt dracones*, in the marginalia's own faded ink.
 *
 * The one cell in either atlas that is neither a drawing nor a number, and it is
 * set rather than drawn for the reason the numerals are: letterforms are what a
 * face is *for*, and thirteen hand-traced letters would be thirteen paths nobody
 * could tell from Instrument Serif at a hundred pixels.
 *
 * Four things make it read as an inscription rather than as a label, and the
 * first three are Entry VII's inscription voice rendered in a canvas:
 *
 *   small caps      approximated by setting the text upper-case at a size a
 *                   little under the cap height — a canvas has no `font-variant`
 *                   and the platform faces here have no true small-cap cut. It
 *                   is the letterspacing that carries the effect anyway.
 *   letterspacing   `icons.inscriptionTracking` of an em between letters, laid
 *                   out by hand because `letterSpacing` on a 2D context is very
 *                   recent and silently ignored where it is missing — which
 *                   would print the words correctly and unremarkably, the exact
 *                   failure nobody notices.
 *   reduced ink     `icons.inscriptionColor`. A chart's marginal note is
 *                   written lighter than its coastlines; at full strength the
 *                   words fight the serpent two hexes away. A **colour** and not
 *                   an opacity, and the difference is not pedantry: this atlas
 *                   is alpha-tested, so a `globalAlpha` under the cutoff does
 *                   not fade a glyph, it erodes its antialiased edge and leaves
 *                   the words looking broken. That is what the first cut of this
 *                   cell did.
 *   fit to cell     "HIC SVNT" and "DRACONES", set at `inscriptionScale`, both
 *                   overran a 128px cell — 162px and 183px, losing letters off
 *                   both ends of a centred plate. `fitInscription` measures the
 *                   tracked width of every line at the maximum size and, if the
 *                   widest exceeds the cell minus `icons.inscriptionPad` on
 *                   each side, shrinks the type size by that ratio before a
 *                   single pixel is set. A fit step and not a smaller constant,
 *                   so a future inscription — a longer motto, a translated one —
 *                   is sized to the cell it actually lands in rather than to
 *                   this one's word lengths.
 *
 * Two lines, because the cell is square. See `DRACONES_LINES`.
 */
function drawInscriptionCell(
  context: CanvasRenderingContext2D,
  index: number,
  layout: AtlasLayout,
): void {
  const origin = badgeCellOrigin(index, layout);
  const cell = layout.cell;
  const lines = DRACONES_LINES;
  const maxSize = Math.round(cell * ICONS.inscriptionScale);
  const usable = cell - 2 * cell * ICONS.inscriptionPad;

  context.save();
  context.textAlign = 'left';
  context.textBaseline = 'middle';

  // Laid out letter by letter so the tracking is real everywhere — see the
  // docblock above. Measured twice on purpose: once at the maximum size to
  // find the fit ratio, then again at the fitted size, because a line's
  // tracked width does not scale exactly linearly with its type size (kerning
  // and hinting round per letter) and re-measuring is cheaper than a plate
  // that is off by a pixel.
  const trackedWidth = (text: string, tracking: number): number => {
    let width = -tracking;
    for (const letter of text) width += context.measureText(letter).width + tracking;
    return width;
  };

  context.font = `${maxSize}px "Instrument Serif", "Fraunces", Georgia, serif`;
  const maxTracking = maxSize * ICONS.inscriptionTracking;
  const maxWidths = lines.map((line) => trackedWidth(line.toUpperCase(), maxTracking));
  const ratio = fitInscription(maxWidths, usable);
  const size = Math.max(1, Math.round(maxSize * ratio));
  const tracking = size * ICONS.inscriptionTracking;
  context.font = `${size}px "Instrument Serif", "Fraunces", Georgia, serif`;

  // Leading is measured off the type size rather than the cell, so the plate
  // stays a plate if somebody dials the size: two lines set half a size apart
  // would touch and two set two sizes apart would be two labels.
  const leading = size * ICONS.inscriptionLeading;
  const top = origin.y + cell / 2 - ((lines.length - 1) * leading) / 2;

  context.fillStyle = cssHex(ICONS.inscriptionColor);
  lines.forEach((line, row) => {
    const text = line.toUpperCase();
    // The width is measured first so the whole tracked line can be centred on
    // the cell — a line centred on its *untracked* width drifts right by half
    // its tracking.
    const width = trackedWidth(text, tracking);
    let x = origin.x + cell / 2 - width / 2;
    for (const letter of text) {
      context.fillText(letter, x, top + row * leading);
      x += context.measureText(letter).width + tracking;
    }
  });
  context.restore();
}

/**
 * Paints one heraldic charge: a parchment roundel with the seat's figure inked
 * on it.
 *
 * `drawResourceCell` with no kind and no fallback — the charges are a closed
 * union with an exhaustive art record (`src/art/heraldryMarks.ts`), so there is
 * no emoji to fall through to, and no rim, because the rim a charge sits in is
 * the *player's colour* and it is geometry on the board rather than ink in this
 * cell (see `UnitLayer.addChargeMark` and `CityLayer.addFlag`).
 *
 * The paper is the whole reason this is not `drawMarginaliaCell`: a charge is
 * stamped on a coloured ground and has to bring its own field. See
 * `CHARGE_CELLS`.
 */
function drawChargeCell(
  context: CanvasRenderingContext2D,
  index: number,
  layout: AtlasLayout,
  id: HeraldryId,
): void {
  const origin = badgeCellOrigin(index, layout);
  const cell = layout.cell;
  const center = { x: origin.x + cell / 2, y: origin.y + cell / 2 };

  context.save();
  context.fillStyle = cssHex(ICONS.paperColor);
  context.beginPath();
  context.arc(center.x, center.y, paperRadiusFraction() * cell, 0, Math.PI * 2);
  context.fill();
  context.restore();

  paintMarkPaths(
    context,
    heraldryMark(id),
    center,
    Math.max(1, ICONS.chargeScale * cell),
    ICONS.inkColor,
  );
}

/**
 * Paints one numeral: a parchment disc with a digit on it.
 *
 * Text rather than artwork, and drawn in the platform's own mono-ish stack. See
 * `RESOURCE_ICON_FILES` for why that is the one concession.
 */
function drawNumeralCell(
  context: CanvasRenderingContext2D,
  digit: number,
  index: number,
  layout: AtlasLayout,
): void {
  drawDiscCell(context, null, index, layout, ICONS.paperColor, ICONS.inkColor, 1);
  const origin = badgeCellOrigin(index, layout);
  const cell = layout.cell;
  context.save();
  context.fillStyle = cssHex(ICONS.inkColor);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `700 ${Math.round(cell * ICONS.numeralScale)}px "IBM Plex Mono", ui-monospace, monospace`;
  context.fillText(String(digit), origin.x + cell / 2, origin.y + cell * 0.54);
  context.restore();
}

/**
 * The flags that put a *flat* tile icon — a yield glyph, its numeral — above
 * everything printed on the hex it stands on.
 *
 * Exported for the reason `badgeDiscFlags` is: the material needs a canvas, and
 * these four are the whole of the behaviour.
 *
 *   `transparent`  the fix, and the one that reads as a formality until it is
 *                  wrong. `renderOrder` sorts *within* a pass, and three draws
 *                  every opaque object before any transparent one — so an
 *                  alpha-tested glyph left in the opaque pass beat the trees
 *                  (opaque, drawn earlier) and lost to every blended decal on
 *                  the board however high its `renderOrder` was. That is what an
 *                  oasis pool, a floodplain wash or a shore band printing *over*
 *                  a tile's yields was: not a lift, not an order, a pass.
 *   `alphaTest`    kept at the same cutoff, so every pixel that survives is
 *                  fully opaque and the coins of a stack still sort by the order
 *                  they were collected in rather than by blending.
 *   `depthTest`    off. A readout is not a thing in the diorama: the marks on a
 *                  tile beyond a mountain are still that tile's marks. This is
 *                  the property a badge keeps and a flat glyph gives up, and it
 *                  is the whole difference between the two materials.
 *   `depthWrite`   off, for the same reason — a decal that wrote depth would
 *                  occlude whatever the diorama drew next.
 */
export function tileIconFlags(): {
  transparent: boolean;
  alphaTest: number;
  depthTest: boolean;
  depthWrite: boolean;
} {
  return { transparent: true, alphaTest: ICONS.alphaTest, depthTest: false, depthWrite: false };
}

/**
 * The built tile atlas, and the material every flat icon on the board is drawn
 * with.
 *
 * Not depth-tested. A resource roundel and a yield glyph are *readouts* — the
 * same class of thing as the overlay decals, which the material library also
 * lifts above the board — so they must not be swallowed by the hill they are
 * printed on the far side of. Blended into the late pass (`tileIconFlags`) and
 * collected at `RENDER_ORDER.tileIcon`, which is what puts them over the terrain
 * *and* over every wash and band printed on it.
 */
export class TileIcons {
  private readonly texture: CanvasTexture;
  readonly material: MeshBasicMaterial;
  /**
   * The same atlas for the marks that *stand up* rather than lying down: the
   * resource markers, which are pinned above their tile and turned to the camera
   * (see `addResourceMarkers` in `lens3d.ts`).
   *
   * A second material and not a second texture — one canvas still, one
   * rasterisation, the same twelve cells — because the only thing that differs is
   * the depth behaviour, and that is a material flag. A standing marker is an
   * object in the diorama exactly as a unit badge is: it tests and writes depth,
   * so a resource behind a mountain is hidden by the mountain instead of floating
   * in front of it. Flat readouts keep the other treatment and the reasoning
   * above.
   *
   * It costs one draw call per distinct resource on screen, which is what the
   * flat roundels already cost — the split is between *materials*, and the marks
   * that use each one were never in the same bucket anyway.
   */
  readonly standingMaterial: MeshBasicMaterial;

  private constructor(texture: CanvasTexture) {
    this.texture = texture;
    this.material = new MeshBasicMaterial({
      map: texture,
      ...tileIconFlags(),
      side: DoubleSide,
      toneMapped: false,
    });
    this.standingMaterial = new MeshBasicMaterial({
      map: texture,
      transparent: false,
      alphaTest: ICONS.alphaTest,
      // The camera is fixed in front of every marker, but a quad that vanished
      // because it ended up back-facing is a costly bug — `UnitBadges` makes the
      // same trade for the same reason.
      side: DoubleSide,
      toneMapped: false,
    });
  }

  dispose(): void {
    this.material.dispose();
    this.standingMaterial.dispose();
    this.texture.dispose();
  }

  /**
   * Rasterises every resource mark, yield glyph and digit into one atlas.
   *
   * Never rejects, exactly like `UnitBadges.load`: a missing file leaves a blank
   * disc — which still reads as "something is here" — and a browser with no 2D
   * context at all resolves to null, in which case the resource lens and the
   * yield switch simply draw nothing.
   */
  static async load(): Promise<TileIcons | null> {
    const layout = tileAtlasSize();
    const canvas = document.createElement('canvas');
    canvas.width = layout.width;
    canvas.height = layout.height;
    const context = canvas.getContext('2d');
    if (!context) return null;

    // A canvas samples whatever face is *currently* installed the instant
    // `fillText` runs — there is no "wait for this font" primitive on the 2D
    // context, only on the document. Rasterising the numerals or the
    // inscription before Instrument Serif has swapped in silently ships the
    // Georgia fallback, which sets *wider* — so the inscription's measured
    // width, and therefore `fitInscription`'s ratio, would depend on how far
    // page load had gotten when this ran rather than on the data. The
    // explicit `load` call is what actually asks the browser to fetch the
    // face (a face nothing has rendered yet may not be loading at all, so
    // `fonts.ready` alone can resolve with nothing to wait for); `fonts.ready`
    // then covers every other face already in flight (IBM Plex Mono, for the
    // numerals). `document.fonts` does not exist in every environment this
    // module loads in — Vitest's `node` environment among them, and this
    // function is never called from a test for exactly that reason — so the
    // wait is opportunistic, not required, and any failure is swallowed: a
    // face that never loads leaves the fallback the fit step sizes around,
    // which is the pre-existing behaviour, not a regression.
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await document.fonts.load(`${Math.round(layout.cell * ICONS.inscriptionScale)}px "Instrument Serif"`);
        await document.fonts.ready;
      } catch {
        // Best effort — see above.
      }
    }

    // Nothing here is fetched any more. The resources, the sites, the charges
    // and — since the six voices were re-cut from Lucide and Tabler — the yields
    // are all traced from path data; the numerals and the inscription are set in
    // text; and the serpent followed the rest out of `public/` when the
    // marginalia became `src/art/marginaliaMarks.ts`. So this atlas cannot
    // rasterise a blank cell at all, which is the property `test/render/
    // yieldMarks.test.ts` was written to protect one set at a time.
    TILE_ICON_CELLS.forEach((cell, index) => {
      if (cell.set === 'numeral') {
        drawNumeralCell(context, cell.id, index, layout);
        return;
      }
      // A resource is ink on parchment shaped by its kind, like a unit badge
      // with a kind-coloured rim — see `drawResourceCell`. A yield is ink on
      // its own voice's colour, and carries the drop shadow that lets a stack
      // of them be counted — see `drawYieldCell`.
      if (cell.set === 'yield') {
        drawYieldCell(context, index, layout, cell.id);
        return;
      }
      // Bare ink, no disc: see `MARGINALIA_CELLS`. The two members are printed
      // by two painters because one is a drawing and the other is words.
      if (cell.set === 'marginalia') {
        if (cell.id === 'dracones') drawInscriptionCell(context, index, layout);
        else drawMarginaliaCell(context, index, layout);
        return;
      }
      if (cell.set === 'resource') {
        drawResourceCell(context, index, layout, cell.id, resourceDef(cell.id).emoji);
        return;
      }
      if (cell.set === 'site') {
        drawSiteCell(context, index, layout, cell.id);
        return;
      }
      // A seat's figure on its own field of parchment; see `CHARGE_CELLS`.
      if (cell.set === 'charge') {
        drawChargeCell(context, index, layout, cell.id);
        return;
      }
      // Every `TileIconCell` variant is one of the six branches above; this is
      // the exhaustiveness check, not a reachable draw path — a seventh set
      // added to the union without a painter here fails typecheck instead of
      // drawing a blank cell.
      const exhaustive: never = cell;
      throw new Error(`icons: unhandled atlas cell ${JSON.stringify(exhaustive)}`);
    });

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.magFilter = LinearFilter;
    texture.anisotropy = 4;
    return new TileIcons(texture);
  }
}

/**
 * Loads one SVG, or resolves to null if it is missing or blocked.
 *
 * Null still does not reject — the atlas is a garnish and a board with a blank
 * cell in it is better than a renderer that refuses to start — but it is no
 * longer *quiet*. A missing artwork file used to be indistinguishable from a
 * mark nobody had drawn: the cell rasterised blank, the board drew a token with
 * nothing on it, and the only way to find out was to notice. It says so on the
 * console now, once per file, because "a mark stopped appearing" is the shape of
 * bug this atlas produces and the console is where somebody is already looking.
 */
function loadIcon(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    // Same-origin out of `public/`, but a canvas that ever reads a cross-origin
    // image without this is tainted and unreadable — see `sprites3d.ts`.
    image.crossOrigin = 'anonymous';
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => {
      console.error(`icons: ${url} did not load — its atlas cell will print blank`);
      resolve(null);
    });
    image.src = url;
  });
}

/**
 * The flags that put a badge disc in the *late* pass without giving up any of
 * the properties that make it a thing in the diorama.
 *
 * Exported because it is the one part of the material a test can hold still —
 * the material itself needs a canvas — and because every one of these four is
 * load-bearing, in a way that is invisible the moment they drift apart:
 *
 *   `transparent`  puts the disc in the pass three sorts by `renderOrder`. That
 *                  is the only place a `renderOrder` means anything, and it is
 *                  what lets a badge be drawn *after* the hover and selection
 *                  rings (see `RENDER_ORDER`), which are depth-ignoring decals
 *                  and used to paint straight over the tags.
 *   `alphaTest`    kept, and kept at the same cutoff: the cutout is what makes
 *                  the roundel's edge crisp instead of a fringe, and it is why a
 *                  blended disc still sorts sanely against its neighbours —
 *                  every pixel that survives is fully opaque.
 *   `depthTest`    on, unchanged. A unit hidden behind a mountain must have its
 *                  badge hidden behind the same mountain, or the board grows a
 *                  field of markers floating over a ridge with nothing under
 *                  them. This is the property the `onTop` treatment would have
 *                  cost, and the reason badges do not take it.
 *   `depthWrite`   on, so two badges overlapping resolve by depth rather than by
 *                  the order their buckets happened to be collected in.
 */
export function badgeDiscFlags(): {
  transparent: boolean;
  alphaTest: number;
  depthTest: boolean;
  depthWrite: boolean;
} {
  return { transparent: true, alphaTest: BADGE.alphaTest, depthTest: true, depthWrite: true };
}

/**
 * The built atlas: the drawings, printed twice.
 *
 * One texture and one material for every badge a *nation* flies, whatever class
 * or seat, and a second pair for the wild — same eleven cells, same layout, same
 * quads, printed on darkened parchment in oxblood (`wildBadgeStyle`). Two
 * textures rather than one because a printed bucket cannot be tinted: an atlas
 * material carries the ink in its own pixels, and `InstanceCollector` refuses a
 * per-instance colour on a textured bucket precisely so that nothing can grey
 * out a roundel by accident (see `Bucket.material` in `instances.ts`). So the
 * only place a second ink can come from is a second print.
 *
 * It costs one more 512 × 384 canvas and one more draw call on a board that has
 * barbarians on screen, and nothing at all on one that has not — the wild's
 * bucket is only created when something asks for it, which is the same property
 * that makes the selected unit's brighter rim free.
 *
 * Unlit and alpha-tested rather than blended, for the same reason the unit
 * billboards are (see `sprites3d.ts`): a cutout writes depth and sorts with
 * everything else, where a genuinely translucent quad would bring a sorting
 * problem for every pair of units standing near each other. It is flagged
 * `transparent` all the same — not for blending, which the alpha test has
 * already decided, but to reach the pass where a draw order exists at all. See
 * `badgeDiscFlags`.
 */
export class UnitBadges {
  private readonly texture: CanvasTexture;
  private readonly wildTexture: CanvasTexture;
  readonly material: MeshBasicMaterial;
  readonly wildMaterial: MeshBasicMaterial;

  private constructor(texture: CanvasTexture, wildTexture: CanvasTexture) {
    this.texture = texture;
    this.wildTexture = wildTexture;
    this.material = UnitBadges.discMaterial(texture);
    this.wildMaterial = UnitBadges.discMaterial(wildTexture);
  }

  private static discMaterial(map: CanvasTexture): MeshBasicMaterial {
    return new MeshBasicMaterial({
      map,
      ...badgeDiscFlags(),
      // The camera is fixed in front of every badge, but a quad that vanished
      // because it ended up back-facing is a costly bug for two pixels of save.
      side: DoubleSide,
      toneMapped: false,
    });
  }

  /**
   * The material a piece of this seat's badges print with.
   *
   * The one question this class answers about *who*, and it takes the answer
   * rather than the seat: the caller has already asked `isBarbarian`, which is
   * the sim's register for the wild, and this file has no business re-deriving
   * it from a colour or a name.
   */
  materialFor(wild: boolean): MeshBasicMaterial {
    return wild ? this.wildMaterial : this.material;
  }

  dispose(): void {
    this.material.dispose();
    this.wildMaterial.dispose();
    this.texture.dispose();
    this.wildTexture.dispose();
  }

  /**
   * Rasterises every icon into the two atlases and returns the set.
   *
   * The icons are loaded **once** and drawn twice, which is the whole reason the
   * ink is a `source-in` recolour rather than a colour baked into the files:
   * a second print costs a canvas, not a second fetch.
   *
   * Never rejects. A missing icon file leaves a blank roundel (see
   * `drawBadgeCell`) and a browser with no 2D context at all resolves to null,
   * in which case the units simply stand without tags — the same
   * silent-but-visible fallback the sprite loader makes.
   */
  static async load(): Promise<UnitBadges | null> {
    const layout = badgeAtlasSize();
    const icons = await Promise.all(BADGE_CELLS.map((cls) => loadIcon(BADGE_ICON_FILES[cls])));

    const print = (style: BadgeInkStyle): CanvasTexture | null => {
      const canvas = document.createElement('canvas');
      canvas.width = layout.width;
      canvas.height = layout.height;
      const context = canvas.getContext('2d');
      if (!context) return null;
      BADGE_CELLS.forEach((_, index) => {
        drawBadgeCell(context, icons[index] ?? null, index, layout, style);
      });
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      // Mipmaps so a badge does not crawl when the board is zoomed out; linear
      // magnification so the ink stays soft rather than blocky when it is not.
      texture.generateMipmaps = true;
      texture.magFilter = LinearFilter;
      texture.anisotropy = 4;
      return texture;
    };

    const nation = print(nationBadgeStyle());
    const wild = nation === null ? null : print(wildBadgeStyle());
    if (nation === null || wild === null) return null;
    return new UnitBadges(nation, wild);
  }
}
