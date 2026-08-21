/**
 * Loads every sprite the manifest names, up front, before the first frame.
 *
 * Deliberately all-or-nothing. A sprite that fails to load rejects the whole
 * promise with the URL that 404'd, rather than leaving a hole in the board that
 * looks like a rendering bug — a missing asset is a build problem and should
 * read as one. The manifest is checked for completeness first, so "the artist
 * forgot a terrain" and "the file is not on disk" are two different messages.
 *
 * Images are fetched in parallel and decoded by the browser; the caller (see
 * `main.ts`) awaits the set and only then builds the terrain cache, because the
 * cache bakes the sprites in and a half-loaded `Image` draws as nothing.
 */

import { allSpriteFiles, manifestProblems } from './spriteManifest';

/** Loaded, decoded images keyed by their manifest path. */
export interface SpriteSet {
  /** Throws for a path that is not in the manifest — a typo, not a blank. */
  get(file: string): HTMLImageElement;
  has(file: string): boolean;
}

/** Where the vendored sprites are served from, honouring Vite's `base`. */
export function spriteUrl(file: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base.endsWith('/') ? base : `${base}/`}sprites/${file}`;
}

function loadImage(file: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Sprite failed to load: ${spriteUrl(file)}`));
    image.src = spriteUrl(file);
  });
}

/**
 * Fetches every manifest sprite. Rejects on the first failure, and before that
 * on any inconsistency between the manifest and `data/`.
 */
export async function loadSprites(): Promise<SpriteSet> {
  const problems = manifestProblems();
  if (problems.length > 0) {
    throw new Error(`Sprite manifest is incomplete:\n  ${problems.join('\n  ')}`);
  }

  const files = allSpriteFiles();
  const images = await Promise.all(files.map(loadImage));

  const byFile = new Map<string, HTMLImageElement>();
  files.forEach((file, index) => byFile.set(file, images[index]!));

  return {
    has: (file) => byFile.has(file),
    get: (file) => {
      const image = byFile.get(file);
      if (!image) throw new Error(`No sprite named "${file}" in the manifest`);
      return image;
    },
  };
}
