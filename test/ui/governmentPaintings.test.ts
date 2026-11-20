/**
 * The list of governments with a painting (`src/ui/governmentPaintings.ts`)
 * against the folder the page loads them from, as `wonderPaintings.test.ts`
 * does for the wonders. The page cannot see which files exist, so the list is
 * written by hand, and this test holds it to the folder in both directions.
 *
 * No painting exists yet (the government banners, Quiet Table frame 7): the
 * list is empty, the folder holds only its `.gitkeep`, and every banner shows
 * the drawn mark. The test passes as it is, and goes on passing as paintings
 * arrive with their lines.
 */
import { describe, expect, it } from 'vitest';

import { GOVERNMENT_IDS } from '../../src/sim/statecraftData';
import { governmentPicture } from '../../src/ui/governmentBanner';
import {
  GOVERNMENT_PAINTINGS,
  GOVERNMENT_PAINTINGS_PATH,
  governmentPaintingUrl,
} from '../../src/ui/governmentPaintings';

/** The JPEGs in the folder, by the glob's keys (the files are not read). */
const FILES = Object.keys(import.meta.glob('../../public/art/splash/governments/*.jpg', { query: '?url' }))
  .map((path) => path.split('/').pop()!.slice(0, -'.jpg'.length))
  .sort();

describe('the painted governments', () => {
  it('lists exactly the paintings in the folder, which may be none', () => {
    expect([...GOVERNMENT_PAINTINGS].sort()).toEqual(FILES);
  });

  it('names each painting once, in order, and only a government the rows know', () => {
    expect(new Set(GOVERNMENT_PAINTINGS).size).toBe(GOVERNMENT_PAINTINGS.length);
    expect([...GOVERNMENT_PAINTINGS]).toEqual([...GOVERNMENT_PAINTINGS].sort());
    for (const id of GOVERNMENT_PAINTINGS) expect(GOVERNMENT_IDS as readonly string[]).toContain(id);
  });

  it('loads them from the folder under public', () => {
    expect(GOVERNMENT_PAINTINGS_PATH).toBe('/art/splash/governments/');
    expect(governmentPaintingUrl('nobodyAtAll')).toBeNull();
  });

  it('answers a painting where one exists and the drawn mark elsewhere', () => {
    for (const id of GOVERNMENT_IDS) {
      const url = governmentPaintingUrl(id);
      if (url === null) {
        expect(governmentPicture(id), id).toEqual({ kind: 'mark' });
      } else {
        expect(url, id).toBe(`/art/splash/governments/${id}.jpg`);
        expect(governmentPicture(id), id).toEqual({ kind: 'painted', url });
      }
    }
  });
});
