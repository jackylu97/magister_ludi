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
 * The same machinery, one plane down. `TileIcons` (below) rasterises the twelve
 * resource marks, the three yield glyphs and ten numerals into a second atlas,
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

import { RESOURCE_IDS, type ResourceId } from '../sim/resourceData';
import type { ModelClass } from '../sim/unitData';

import { VIEW3D, mixColor } from './lookData';

const BADGE = VIEW3D.badges;
const HP = VIEW3D.hpBar;
const ICONS = VIEW3D.icons;
const LENS = VIEW3D.lens;

/**
 * The atlas layout, in cell order, and the authority on which cell a class
 * lands in.
 *
 * A list rather than a derivation from the sculpt registry, because it decides
 * texture coordinates: reordering the registry must never silently re-point
 * every badge on the board at somebody else's icon. `test/pieces3d.test.ts`
 * checks the two agree as *sets*.
 */
export const BADGE_CELLS: readonly ModelClass[] = [
  'settler',
  'worker',
  'melee',
  'ranged',
  'mounted',
  'mountedRanged',
  'siege',
  'scout',
];

/**
 * Where each class's icon lives, relative to the site root.
 *
 * SVG, not PNG. The badge has to be legible at one zoom and not crawl at
 * another, and a vector rasterised into the atlas at load is sharp at whatever
 * size the data asks for — including the day somebody doubles `atlasCell`
 * because the panel got bigger. Vendored under `public/` because Vite serves
 * `public/` and only `public/`; see `public/sprites/CREDITS.md` for provenance.
 */
export const BADGE_ICON_FILES: Record<ModelClass, string> = {
  settler: 'sprites/icons/settler.svg',
  worker: 'sprites/icons/worker.svg',
  melee: 'sprites/icons/melee.svg',
  ranged: 'sprites/icons/ranged.svg',
  mounted: 'sprites/icons/mounted.svg',
  mountedRanged: 'sprites/icons/mountedRanged.svg',
  siege: 'sprites/icons/siege.svg',
  scout: 'sprites/icons/scout.svg',
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
export function badgeCellRect(cls: ModelClass): AtlasRect {
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
 * Paints one cell: the parchment roundel, then the icon inked on top of it.
 *
 * The icon arrives as whatever colour its SVG was authored in and leaves in
 * `badges.inkColor`, recoloured through a scratch canvas with `source-in` —
 * which keeps the ink a *data* decision rather than something baked into eight
 * files that would all have to be re-exported to change it.
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
): void {
  const origin = badgeCellOrigin(index, layout);
  const cell = layout.cell;
  const center = { x: origin.x + cell / 2, y: origin.y + cell / 2 };

  context.save();
  context.fillStyle = cssHex(BADGE.paperColor);
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
  ink.fillStyle = cssHex(BADGE.inkColor);
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
 *   yields     one glyph per yield voice — sheaf, hammer, coin — inked on a
 *              disc of that voice's own colour. See `drawYieldCell` for why the
 *              disc survived the pips it replaced.
 *   numerals   ten digits on parchment, for the "and more than four" case.
 *
 * The cell order below is the authority on which cell is which, exactly as
 * `BADGE_CELLS` is for the badges, and for the same reason: it decides texture
 * coordinates, so reordering it would silently re-point every mark on the board
 * at somebody else's picture.
 */
export const YIELD_KEYS = ['food', 'production', 'gold'] as const;
export type YieldKey = (typeof YIELD_KEYS)[number];

/** The ten digits, in value order. `NUMERAL_CELLS[3]` is the glyph for 3. */
export const NUMERAL_CELLS: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * The marginalia: marks that are drawn on the *chart* rather than on the world.
 *
 * One member, and it is the only purely decorative mark in the project — the
 * serpent that fog of war scatters over Terra Incognita (*hic svnt dracones*,
 * design-notes Entry X). It rides in this atlas rather than in one of its own
 * because it is the same object as every other mark here: an ink drawing on the
 * badge grid, printed flat on a hex. A second canvas for one glyph would be a
 * second texture, a second material and a second draw call for a garnish.
 *
 * Unlike every other set here it is drawn with **no disc under it**. A roundel
 * is a token laid on the board; a serpent is drawn *into* the vellum, and a
 * parchment disc behind it would turn it into a badge announcing something.
 */
export const MARGINALIA_CELLS = ['serpent'] as const;
export type MarginaliaKey = (typeof MARGINALIA_CELLS)[number];

/** A cell of the tile atlas: which set it belongs to, and which member. */
export type TileIconCell =
  | { set: 'resource'; id: ResourceId }
  | { set: 'yield'; id: YieldKey }
  | { set: 'numeral'; id: number }
  | { set: 'marginalia'; id: MarginaliaKey };

/**
 * Every cell of the tile atlas, in layout order: the resources, then the three
 * yield voices, then the digits, then the marginalia.
 *
 * Appended rather than inserted, and that is not politeness — this list decides
 * texture coordinates, so putting the serpent anywhere but the end would shift
 * every cell after it and silently re-point marks on the board at somebody
 * else's picture. New sets go on the end, always.
 */
export const TILE_ICON_CELLS: readonly TileIconCell[] = [
  ...RESOURCE_IDS.map((id) => ({ set: 'resource', id }) as TileIconCell),
  ...YIELD_KEYS.map((id) => ({ set: 'yield', id }) as TileIconCell),
  ...NUMERAL_CELLS.map((id) => ({ set: 'numeral', id }) as TileIconCell),
  ...MARGINALIA_CELLS.map((id) => ({ set: 'marginalia', id }) as TileIconCell),
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
 */
export const RESOURCE_ICON_FILES: Record<ResourceId, string> = {
  wheat: 'sprites/icons/resources/wheat.svg',
  cattle: 'sprites/icons/resources/cattle.svg',
  deer: 'sprites/icons/resources/deer.svg',
  fish: 'sprites/icons/resources/fish.svg',
  stone: 'sprites/icons/resources/stone.svg',
  horses: 'sprites/icons/resources/horses.svg',
  iron: 'sprites/icons/resources/iron.svg',
  gems: 'sprites/icons/resources/gems.svg',
  silk: 'sprites/icons/resources/silk.svg',
  wine: 'sprites/icons/resources/wine.svg',
  spices: 'sprites/icons/resources/spices.svg',
  salt: 'sprites/icons/resources/salt.svg',
};

export const MARGINALIA_ICON_FILES: Record<MarginaliaKey, string> = {
  serpent: 'sprites/icons/marginalia/serpent.svg',
};

export const YIELD_ICON_FILES: Record<YieldKey, string> = {
  food: 'sprites/icons/yields/food.svg',
  production: 'sprites/icons/yields/production.svg',
  gold: 'sprites/icons/yields/gold.svg',
};

/** The colour each yield voice is printed in. The interface's own three. */
export const YIELD_COLORS: Record<YieldKey, number> = {
  food: LENS.foodColor,
  production: LENS.productionColor,
  gold: LENS.goldColor,
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
 * Paints one icon onto a disc: the disc in `paper`, then the mark recoloured to
 * `ink` on top of it.
 *
 * The generalisation of `drawBadgeCell` — the roundel is the same object in both
 * atlases — with the two colours as arguments, because the tile atlas needs
 * three different discs (parchment for a resource, and the three yield voices)
 * out of one routine.
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
): void {
  const origin = badgeCellOrigin(index, layout);
  const cell = layout.cell;
  const center = { x: origin.x + cell / 2, y: origin.y + cell / 2 };

  context.save();
  context.fillStyle = cssHex(paper);
  context.beginPath();
  context.arc(center.x, center.y, radiusFraction * cell, 0, Math.PI * 2);
  context.fill();
  context.restore();

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
  icon: CanvasImageSource | null,
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

  drawDiscCell(
    context,
    icon,
    index,
    layout,
    YIELD_COLORS[key],
    ICONS.yieldInkColor,
    ICONS.iconScale,
    disc.radius,
  );
}

/**
 * Paints one mark straight onto the atlas, with nothing behind it.
 *
 * `drawDiscCell` without the disc — the recolouring half only. The marginalia
 * are the one set that wants this: an ink drawing on the chart, not a token laid
 * on the board. Factored out rather than passed a transparent paper colour,
 * because "fill a circle in nothing" is a fill that still costs a path and still
 * reads, at a glance through the code, as though there were a disc there.
 */
function drawInkCell(
  context: CanvasRenderingContext2D,
  icon: CanvasImageSource | null,
  index: number,
  layout: AtlasLayout,
  iconScale: number,
): void {
  if (!icon) return;
  const origin = badgeCellOrigin(index, layout);
  const cell = layout.cell;
  const size = Math.max(1, Math.round(iconScale * cell));
  const scratch = document.createElement('canvas');
  scratch.width = size;
  scratch.height = size;
  const pen = scratch.getContext('2d');
  if (!pen) return;
  pen.drawImage(icon, 0, 0, size, size);
  pen.globalCompositeOperation = 'source-in';
  pen.fillStyle = cssHex(ICONS.marginaliaColor);
  pen.fillRect(0, 0, size, size);
  context.drawImage(
    scratch,
    Math.round(origin.x + cell / 2 - size / 2),
    Math.round(origin.y + cell / 2 - size / 2),
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
 * The built tile atlas, and the material every flat icon on the board is drawn
 * with.
 *
 * Not depth-tested. A resource roundel and a yield glyph are *readouts* — the
 * same class of thing as the overlay decals, which the material library also
 * lifts above the board — so they must not be swallowed by the hill they are
 * printed on the far side of. `InstanceCollector` gives a custom-material
 * bucket the overlay draw order when it is added with `onTop`, which is what
 * puts them over the terrain and under nothing.
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
      transparent: false,
      alphaTest: ICONS.alphaTest,
      side: DoubleSide,
      toneMapped: false,
      depthTest: false,
      depthWrite: false,
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

    const files = TILE_ICON_CELLS.map((cell) =>
      cell.set === 'resource'
        ? RESOURCE_ICON_FILES[cell.id]
        : cell.set === 'yield'
          ? YIELD_ICON_FILES[cell.id]
          : cell.set === 'marginalia'
            ? MARGINALIA_ICON_FILES[cell.id]
            : null,
    );
    const icons = await Promise.all(files.map((url) => (url ? loadIcon(url) : null)));

    TILE_ICON_CELLS.forEach((cell, index) => {
      if (cell.set === 'numeral') {
        drawNumeralCell(context, cell.id, index, layout);
        return;
      }
      // A resource is ink on parchment, like a unit badge. A yield is ink on its
      // own voice's colour, and carries the drop shadow that lets a stack of
      // them be counted — see `drawYieldCell`.
      if (cell.set === 'yield') {
        drawYieldCell(context, icons[index] ?? null, index, layout, cell.id);
        return;
      }
      // Bare ink, no disc: see `MARGINALIA_CELLS`.
      if (cell.set === 'marginalia') {
        drawInkCell(context, icons[index] ?? null, index, layout, ICONS.marginaliaScale);
        return;
      }
      drawDiscCell(
        context,
        icons[index] ?? null,
        index,
        layout,
        ICONS.paperColor,
        ICONS.inkColor,
        ICONS.iconScale,
      );
    });

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.magFilter = LinearFilter;
    texture.anisotropy = 4;
    return new TileIcons(texture);
  }
}

/** Loads one SVG, or resolves to null if it is missing or blocked. */
function loadIcon(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    // Same-origin out of `public/`, but a canvas that ever reads a cross-origin
    // image without this is tainted and unreadable — see `sprites3d.ts`.
    image.crossOrigin = 'anonymous';
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => resolve(null));
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
 * The built atlas: one texture, one material, shared by every badge on the
 * board whatever class or player it belongs to.
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
  readonly material: MeshBasicMaterial;

  private constructor(texture: CanvasTexture) {
    this.texture = texture;
    this.material = new MeshBasicMaterial({
      map: texture,
      ...badgeDiscFlags(),
      // The camera is fixed in front of every badge, but a quad that vanished
      // because it ended up back-facing is a costly bug for two pixels of save.
      side: DoubleSide,
      toneMapped: false,
    });
  }

  dispose(): void {
    this.material.dispose();
    this.texture.dispose();
  }

  /**
   * Rasterises every icon into one atlas and returns the set.
   *
   * Never rejects. A missing icon file leaves a blank roundel (see
   * `drawBadgeCell`) and a browser with no 2D context at all resolves to null,
   * in which case the units simply stand without tags — the same
   * silent-but-visible fallback the sprite loader makes.
   */
  static async load(): Promise<UnitBadges | null> {
    const layout = badgeAtlasSize();
    const canvas = document.createElement('canvas');
    canvas.width = layout.width;
    canvas.height = layout.height;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const icons = await Promise.all(BADGE_CELLS.map((cls) => loadIcon(BADGE_ICON_FILES[cls])));
    BADGE_CELLS.forEach((_, index) => {
      drawBadgeCell(context, icons[index] ?? null, index, layout);
    });

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    // Mipmaps so a badge does not crawl when the board is zoomed out; linear
    // magnification so the ink stays soft rather than blocky when it is not.
    texture.generateMipmaps = true;
    texture.magFilter = LinearFilter;
    texture.anisotropy = 4;
    return new UnitBadges(texture);
  }
}
