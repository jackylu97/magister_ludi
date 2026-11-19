/**
 * The list of great people with a portrait (`src/ui/greatPersonPaintings.ts`)
 * against the folder the page loads them from, as `wonderPaintings.test.ts`
 * does for the wonders. The page cannot see which files exist, so the list is
 * written by hand, and this test holds it to the folder in both directions.
 *
 * No portrait exists yet (Quiet Table, build stage 2): the list is empty, the
 * folder holds only its `.gitkeep`, and every card shows its family's emblem.
 * The test passes as it is, and goes on passing as portraits arrive with their
 * lines.
 */
import { describe, expect, it } from 'vitest';

import { GREAT_PERSON_IDS, greatPersonDef } from '../../src/sim/greatPeopleData';
import { greatPersonPicture } from '../../src/ui/greatPersonCard';
import {
  GREAT_PERSON_PAINTINGS,
  GREAT_PERSON_PAINTINGS_PATH,
  greatPersonPaintingUrl,
} from '../../src/ui/greatPersonPaintings';

/** The JPEGs in the folder, by the glob's keys (the files are not read). */
const FILES = Object.keys(import.meta.glob('../../public/art/splash/people/*.jpg', { query: '?url' }))
  .map((path) => path.split('/').pop()!.slice(0, -'.jpg'.length))
  .sort();

describe('the painted great people', () => {
  it('lists exactly the portraits in the folder, which may be none', () => {
    expect([...GREAT_PERSON_PAINTINGS].sort()).toEqual(FILES);
  });

  it('names each portrait once, in order, and only a person the roster knows', () => {
    expect(new Set(GREAT_PERSON_PAINTINGS).size).toBe(GREAT_PERSON_PAINTINGS.length);
    expect([...GREAT_PERSON_PAINTINGS]).toEqual([...GREAT_PERSON_PAINTINGS].sort());
    for (const id of GREAT_PERSON_PAINTINGS) expect(GREAT_PERSON_IDS as readonly string[]).toContain(id);
  });

  it('loads them from the folder under public', () => {
    expect(GREAT_PERSON_PAINTINGS_PATH).toBe('/art/splash/people/');
  });

  it('answers a portrait where one exists and the family emblem elsewhere', () => {
    for (const id of GREAT_PERSON_IDS) {
      const url = greatPersonPaintingUrl(id);
      const picture = greatPersonPicture(id);
      if (url === null) {
        expect(picture, id).toEqual({ kind: 'emblem', family: greatPersonDef(id).family });
      } else {
        expect(url, id).toBe(`/art/splash/people/${id}.jpg`);
        expect(picture, id).toEqual({ kind: 'painted', url });
      }
    }
    expect(greatPersonPaintingUrl('nobodyAtAll')).toBeNull();
  });
});
