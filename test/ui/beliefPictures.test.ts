/**
 * The list of belief pictures (`src/ui/beliefPictures.ts`) against the folder the page loads
 * them from, as `wonderPaintings.test.ts` does for the wonders. None exists
 * yet (Quiet Table, build stage 3): the list is empty and the folder holds only
 * its `.gitkeep`. The test passes as it is, and goes on passing as pictures
 * arrive with their lines.
 */
import { describe, expect, it } from 'vitest';

import { BELIEF_IDS } from '../../src/sim/religionData';
import { BELIEF_PICTURES, BELIEF_PICTURES_PATH, beliefPictureUrl } from '../../src/ui/beliefPictures';
import { beliefPicture } from '../../src/ui/beliefPictures';

/** The JPEGs in the folder, by the glob's keys (the files are not read). */
const FILES = Object.keys(import.meta.glob('../../public/art/splash/beliefs/*.jpg', { query: '?url' }))
  .map((path) => path.split('/').pop()!.slice(0, -'.jpg'.length))
  .sort();

describe('the belief pictures', () => {
  it('lists exactly the pictures in the folder, which may be none', () => {
    expect([...BELIEF_PICTURES].sort()).toEqual(FILES);
  });

  it('names each picture once, in order, and only a row the table knows', () => {
    expect(new Set(BELIEF_PICTURES).size).toBe(BELIEF_PICTURES.length);
    expect([...BELIEF_PICTURES]).toEqual([...BELIEF_PICTURES].sort());
    for (const id of BELIEF_PICTURES) expect(BELIEF_IDS as readonly string[]).toContain(id);
  });

  it('loads them from the folder under public', () => {
    expect(BELIEF_PICTURES_PATH).toBe('/art/splash/beliefs/');
    expect(beliefPictureUrl('nobodyAtAll')).toBeNull();
  });

  it('answers a vignette where one exists and the drawn mark elsewhere', () => {
    for (const id of BELIEF_IDS) {
      const url = beliefPictureUrl(id);
      expect(beliefPicture(id), id).toEqual(url === null ? { kind: 'mark' } : { kind: 'painted', url });
    }
  });
});
