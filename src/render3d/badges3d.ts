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
 *              Alpha-tested and opaque: a badge writes depth like the piece it
 *              names.
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
 * In the world, not on the glass
 * ------------------------------
 * Badges are depth-tested like everything else on the board, and deliberately
 * *not* given the `onTop` treatment the HP bars and route dots get. A tag is a
 * thing standing in the diorama: a unit hidden behind a mountain must have its
 * badge hidden behind the same mountain, or the board grows a field of markers
 * hovering over a ridge with nothing under them. Clearing the sculpt's own head
 * is done by lifting the badge (`badges.lift`), not by cheating the depth test.
 *
 * Everything except `UnitBadges` and `drawBadgeCell` is pure arithmetic on the
 * data, which is what `test/badges3d.test.ts` checks; the two exceptions need a
 * canvas and are exercised by the browser.
 */

import {
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  MeshBasicMaterial,
  SRGBColorSpace,
} from 'three';

import type { ModelClass } from '../sim/unitData';

import { VIEW3D } from './lookData';

const BADGE = VIEW3D.badges;
const HP = VIEW3D.hpBar;

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
 * The built atlas: one texture, one material, shared by every badge on the
 * board whatever class or player it belongs to.
 *
 * Unlit and alpha-tested rather than transparent, for the same reason the unit
 * billboards are (see `sprites3d.ts`): a cutout is an ordinary opaque object
 * that writes depth and sorts with everything else, where a blended quad would
 * bring a sorting problem for every pair of units standing near each other.
 */
export class UnitBadges {
  private readonly texture: CanvasTexture;
  readonly material: MeshBasicMaterial;

  private constructor(texture: CanvasTexture) {
    this.texture = texture;
    this.material = new MeshBasicMaterial({
      map: texture,
      transparent: false,
      alphaTest: BADGE.alphaTest,
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
