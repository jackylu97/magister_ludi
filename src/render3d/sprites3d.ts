/**
 * Painted unit billboards: loading the art, keying its white ground out, and
 * handing back one material per unit type.
 *
 * This is the *experiment* half of the units layer. The board is procedural and
 * proud of it — every shape in `geometry.ts` is lathed from numbers — and these
 * are the first drawn assets to stand on it. Whether painterly illustrations
 * belong on a toon diorama is a judgement call somebody has to make with their
 * eyes, so the whole thing is behind one switch (`units.style` in
 * `data/view3d.json`) and the procedural pieces stay fully maintained beside it.
 *
 * White-keying, and why it happens here
 * -------------------------------------
 * The source art is a 1024² illustration on a **white ground with no alpha
 * channel**. Nothing about it can be used directly: a billboard quad with an
 * opaque texture is a white card with a soldier on it. Somebody has to decide
 * which pixels are "the paper", and there are exactly two places that decision
 * can live — in an image editor, baked into the file, or here, at load.
 *
 * Here, deliberately. The source images are the user's own drop folder
 * (`assets/units/`, vendored to `public/sprites/units/`), and a threshold baked
 * into a PNG is a threshold nobody can re-tune without redoing the export. As a
 * load-time pass it is two numbers in `view3d.json` — `keyThreshold` and
 * `keyFeather` — and a reload.
 *
 * The key is on *whiteness*, defined as the darkest channel: a pixel is paper
 * only if it is bright in red, green and blue at once. Using luminance instead
 * would eat the bright yellows and pale skin in the illustration, which are
 * exactly the pixels a warrior is made of. The feather is a linear ramp below
 * the threshold rather than a hard cut, which is what stops the silhouette from
 * being a staircase; combined with `alphaTest` on the material it decides where
 * the cut *lands* and gives the mipmaps something to average that is not a cliff.
 *
 * From cutout to standee
 * ----------------------
 * Keying alone gets you a floating illustration, which is what the first pass
 * shipped and what the verdict on it was. The second pass — `dieCutStandee`,
 * below — takes the keyed mask and prints it: dilates it into a parchment
 * margin, draws an ink line around that, and leaves everything beyond it
 * transparent. What stands on the board afterwards is not a painting pretending
 * to be a soldier, it is a die-cut card of a painting of a soldier, standing in
 * a foot (`standeeBase` in `geometry.ts`). That reframing is the whole fix: a
 * printed card is *allowed* to be flat, is allowed to be drawn at eye level
 * while the table is seen from above, and belongs on a table next to toy houses.
 *
 * Cutout, not blending
 * --------------------
 * The materials are `alphaTest`ed and **not** transparent, so a billboard is an
 * ordinary opaque object: it writes depth, it sorts with everything else, and
 * two units standing near each other cannot produce the blending-order artefacts
 * a transparent quad would. That is the whole reason the feather is narrow.
 *
 * Browser-only
 * ------------
 * `Image` and `<canvas>` are DOM, so this module is imported by the renderer and
 * by nothing under `src/sim/`. It is also entirely optional: a missing or
 * unreadable file resolves to "no sprite for that type", and the unit falls back
 * to its procedural piece rather than the game failing to start.
 */

import {
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  MeshBasicMaterial,
  SRGBColorSpace,
} from 'three';

import type { UnitTypeId } from '../sim/unitData';

import { VIEW3D } from './lookData';

const SPRITE = VIEW3D.units.sprite;
const STANDEE = SPRITE.standee;

/**
 * Which unit types have artwork, and where it lives.
 *
 * A table rather than a scan of the directory, because the browser cannot list
 * one and because "which types are drawn" is a fact about the art direction that
 * should be readable in one place. A type absent from this table is not an
 * error — it is a type that stands as a procedural piece.
 */
const SPRITE_FILES: Partial<Record<UnitTypeId, string>> = {
  warrior: 'sprites/units/warrior.png',
  scout: 'sprites/units/scout.png',
};

/** Loads one image, or resolves to null if it is missing or blocked. */
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    // Not strictly needed for a same-origin file out of `public/`, but a canvas
    // that ever reads a cross-origin image without it is tainted and
    // `getImageData` throws — a failure mode worth never having.
    image.crossOrigin = 'anonymous';
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => resolve(null));
    image.src = url;
  });
}

/**
 * Replaces the white ground with transparency, in place, on a canvas the caller
 * owns.
 *
 * Exported for the sake of being testable as pure arithmetic on an
 * `ImageData`-shaped buffer: it takes and returns the RGBA bytes and knows
 * nothing about the canvas they came from.
 */
export function keyWhiteGround(
  rgba: Uint8ClampedArray,
  threshold: number,
  feather: number,
): void {
  // A zero-width feather would divide by zero; treat it as a hard cut.
  const span = Math.max(feather, 1e-6);
  const low = threshold - span;
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i]! / 255;
    const g = rgba[i + 1]! / 255;
    const b = rgba[i + 2]! / 255;
    // Whiteness is the darkest channel: paper is bright in all three at once,
    // while a bright yellow shield is not.
    const whiteness = Math.min(r, Math.min(g, b));
    if (whiteness >= threshold) {
      rgba[i + 3] = 0;
      continue;
    }
    if (whiteness <= low) continue;
    const alpha = 1 - (whiteness - low) / span;
    rgba[i + 3] = Math.round(rgba[i + 3]! * alpha);
  }
}

/**
 * How the die cut is specified. Pixel distances are in the buffer's own pixels;
 * the caller scales them from the data's reference resolution.
 */
export interface StandeeCut {
  /** Width of the parchment margin dilated out of the figure's silhouette. */
  borderPx: number;
  /** Width of the ink line printed around the outside of that margin. */
  rimPx: number;
  /** Width of the ramp that fades the ink line's outer edge to nothing. */
  edgeFeatherPx: number;
  /** Alpha (0..255) at and above which a keyed pixel counts as "the figure". */
  maskAlpha: number;
  paperColor: number;
  rimColor: number;
}

/**
 * The unsigned distance, in pixels, from every pixel to the nearest set pixel of
 * a binary mask. Two-pass chamfer, which is O(width · height) whatever the
 * radius — the dilation below is a threshold on this, so a fourteen-pixel border
 * costs exactly what a one-pixel border costs.
 *
 * The 1 / √2 step weights are the plain 3×3 chamfer. Its worst-case error
 * against true Euclidean distance is a few percent, which on a border whose
 * whole job is to look hand-cut is not a number anybody can see — and unlike a
 * box dilation it produces a *round* offset, so the margin turns corners in an
 * arc instead of growing square ears off the figure's elbows.
 */
export function alphaDistanceField(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  maskAlpha: number,
): Float32Array {
  const distance = new Float32Array(width * height);
  const far = width + height;
  const diagonal = Math.SQRT2;

  for (let i = 0; i < distance.length; i++) {
    distance[i] = rgba[i * 4 + 3]! >= maskAlpha ? 0 : far;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let d = distance[i]!;
      if (d === 0) continue;
      if (x > 0) d = Math.min(d, distance[i - 1]! + 1);
      if (y > 0) {
        d = Math.min(d, distance[i - width]! + 1);
        if (x > 0) d = Math.min(d, distance[i - width - 1]! + diagonal);
        if (x < width - 1) d = Math.min(d, distance[i - width + 1]! + diagonal);
      }
      distance[i] = d;
    }
  }

  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      let d = distance[i]!;
      if (d === 0) continue;
      if (x < width - 1) d = Math.min(d, distance[i + 1]! + 1);
      if (y < height - 1) {
        d = Math.min(d, distance[i + width]! + 1);
        if (x < width - 1) d = Math.min(d, distance[i + width + 1]! + diagonal);
        if (x > 0) d = Math.min(d, distance[i + width - 1]! + diagonal);
      }
      distance[i] = d;
    }
  }

  return distance;
}

/**
 * Turns a keyed cutout into a printed paper standee, in place.
 *
 * The painted figures were never going to sit on a toon diorama as bare
 * cutouts — the user's verdict on the first pass was "out of place, and the
 * perspective is wrong", and both halves of that are the same problem: an
 * illustration drawn at eye level cannot agree with a board seen from 57°
 * above, so it must stop pretending to be a thing in the world and become a
 * thing *on the table*. A die-cut standee is exactly that. Its perspective is
 * allowed to disagree with the board's for the same reason the art on a Warhammer
 * card is allowed to: it is printed, and printed things are flat.
 *
 * Three bands, all decided by one distance field:
 *
 *   d = 0            the figure. Kept, and forced fully opaque — the paper is
 *                    behind it, so nothing inside the silhouette should ever be
 *                    partly see-through, and forcing it kills the keying
 *                    feather's fringe outright.
 *   0 < d ≤ border   parchment. The die-cut margin.
 *   ≤ border + rim   ink. The cut line itself.
 *   beyond           nothing, over a short ramp so the outer edge has something
 *                    for `alphaTest` to land in the middle of and for the
 *                    mipmaps to average.
 *
 * Only the outer edge is feathered, which is why the material can stay an opaque
 * alpha-tested cutout (see the module docblock) rather than becoming a blended
 * quad with a sorting problem.
 */
export function dieCutStandee(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  spec: StandeeCut,
): void {
  const border = Math.max(0, spec.borderPx);
  const outer = border + Math.max(0, spec.rimPx);
  const feather = Math.max(spec.edgeFeatherPx, 1e-6);
  const distance = alphaDistanceField(rgba, width, height, spec.maskAlpha);

  const paperR = (spec.paperColor >> 16) & 0xff;
  const paperG = (spec.paperColor >> 8) & 0xff;
  const paperB = spec.paperColor & 0xff;
  const rimR = (spec.rimColor >> 16) & 0xff;
  const rimG = (spec.rimColor >> 8) & 0xff;
  const rimB = spec.rimColor & 0xff;

  for (let i = 0; i < distance.length; i++) {
    const d = distance[i]!;
    const p = i * 4;
    if (d === 0) {
      rgba[p + 3] = 255;
      continue;
    }
    if (d <= border) {
      rgba[p] = paperR;
      rgba[p + 1] = paperG;
      rgba[p + 2] = paperB;
      rgba[p + 3] = 255;
      continue;
    }
    rgba[p] = rimR;
    rgba[p + 1] = rimG;
    rgba[p + 2] = rimB;
    if (d <= outer) {
      rgba[p + 3] = 255;
      continue;
    }
    const fade = 1 - (d - outer) / feather;
    rgba[p + 3] = fade <= 0 ? 0 : Math.round(fade * 255);
  }
}

/** Draws an image into a canvas and keys it. Null if the pixels cannot be read. */
function keyedTexture(image: HTMLImageElement): CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: false });
  if (!context) return null;
  context.drawImage(image, 0, 0);

  let pixels: ImageData;
  try {
    pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    // A tainted canvas. Nothing to be done about it here, and a unit with no
    // sprite is a unit with a game piece.
    return null;
  }
  keyWhiteGround(pixels.data, SPRITE.keyThreshold, SPRITE.keyFeather);
  // The border widths are authored against one reference resolution and scaled
  // to whatever actually arrived, so a re-export at 2048² keeps the same margin
  // rather than halving it.
  const scale = canvas.width / STANDEE.referencePx;
  dieCutStandee(pixels.data, canvas.width, canvas.height, {
    borderPx: STANDEE.borderPx * scale,
    rimPx: STANDEE.rimPx * scale,
    edgeFeatherPx: STANDEE.edgeFeatherPx * scale,
    maskAlpha: STANDEE.maskAlpha,
    paperColor: STANDEE.paperColor,
    rimColor: STANDEE.rimColor,
  });
  context.putImageData(pixels, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  // Mipmaps are what keep a 1024² illustration from crawling when the board is
  // zoomed out; linear magnification keeps the paint soft when it is zoomed in.
  texture.generateMipmaps = true;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  return texture;
}

/**
 * The loaded sprite set: one unlit, alpha-tested material per unit type that has
 * artwork.
 *
 * Unlit on purpose. The illustration already carries its own light — painted
 * highlights, painted shadow — and running it through the toon ramp would band
 * somebody else's shading into three flat steps and fight it. The board's own
 * sun reaches the sprite through the blob shadow underneath it instead, which is
 * the part that actually glues a billboard to a tile.
 */
export class UnitSprites {
  private readonly materials = new Map<string, MeshBasicMaterial>();
  private readonly textures: CanvasTexture[] = [];

  /** The material for a unit type, or null when that type has no artwork. */
  materialFor(type: UnitTypeId): MeshBasicMaterial | null {
    return this.materials.get(type) ?? null;
  }

  /** True when at least one sprite loaded — i.e. sprite mode has anything to show. */
  get any(): boolean {
    return this.materials.size > 0;
  }

  private adopt(type: UnitTypeId, texture: CanvasTexture): void {
    this.textures.push(texture);
    this.materials.set(
      type,
      new MeshBasicMaterial({
        map: texture,
        // Cutout, not blending — see the module docblock.
        transparent: false,
        alphaTest: SPRITE.alphaTest,
        // The camera is fixed and always in front of the quad, but a billboard
        // that vanished because it ended up back-facing would be a very
        // confusing bug for two pixels of saving.
        side: DoubleSide,
        toneMapped: false,
      }),
    );
  }

  dispose(): void {
    for (const material of this.materials.values()) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.materials.clear();
    this.textures.length = 0;
  }

  /**
   * Loads every sprite in `SPRITE_FILES`, keys it, and returns the set.
   *
   * Never rejects. Every file is optional and a failure is silent-but-visible:
   * the unit keeps its procedural piece, which is a perfectly good unit.
   */
  static async load(): Promise<UnitSprites> {
    const set = new UnitSprites();
    const entries = Object.entries(SPRITE_FILES) as [UnitTypeId, string][];
    const images = await Promise.all(entries.map(([, url]) => loadImage(url)));
    entries.forEach(([type], index) => {
      const image = images[index];
      if (!image) return;
      const texture = keyedTexture(image);
      if (texture) set.adopt(type, texture);
    });
    return set;
  }
}
