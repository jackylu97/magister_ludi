/**
 * The two ending paintings (`src/ui/endingPaintings.ts`) against the folder the
 * page loads them from. The page cannot see which files exist, so the list is
 * written by hand, and this test holds it to the folder in both directions.
 */
import { describe, expect, it } from 'vitest';
import { ENDING_PAINTINGS, ENDING_PAINTINGS_PATH, endingPaintingUrl } from '../../src/ui/endingPaintings';

/** The JPEGs in the folder, by the glob's keys (the files are not read). */
const FILES = Object.keys(import.meta.glob('../../public/art/splash/endings/*.jpg', { query: '?url' }))
  .map((path) => path.split('/').pop()!.slice(0, -'.jpg'.length))
  .sort();

describe('the ending paintings', () => {
  it('lists exactly the paintings in the folder', () => {
    expect(FILES).toEqual(['loss', 'win']);
    expect([...ENDING_PAINTINGS].sort()).toEqual(FILES);
  });

  it('loads them from the folder under public', () => {
    expect(ENDING_PAINTINGS_PATH).toBe('/art/splash/endings/');
  });

  it('gives a win the win painting and a loss the loss painting', () => {
    expect(endingPaintingUrl(true)).toBe('/art/splash/endings/win.jpg');
    expect(endingPaintingUrl(false)).toBe('/art/splash/endings/loss.jpg');
  });
});
