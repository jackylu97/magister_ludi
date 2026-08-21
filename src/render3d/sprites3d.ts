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
