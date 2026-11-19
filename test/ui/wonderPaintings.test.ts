/**
 * The list of painted wonders (`src/ui/wonderPaintings.ts`) against the folder
 * the page loads them from. The page cannot see which files exist, so the list
 * is written by hand, and this test holds it to the folder in both directions.
 */
import { describe, expect, it } from 'vitest';
import { wonderPicture } from '../../src/ui/inPlayForms';
import { WONDER_PAINTINGS, WONDER_PAINTINGS_PATH, wonderPaintingUrl } from '../../src/ui/wonderPaintings';

/** The JPEGs in the folder, by the glob's keys (the files are not read). */
const FILES = Object.keys(import.meta.glob('../../public/art/splash/wonders/*.jpg', { query: '?url' }))
  .map((path) => path.split('/').pop()!.slice(0, -'.jpg'.length))
  .sort();

describe('the painted wonders', () => {
  it('lists exactly the paintings in the folder', () => {
    expect(FILES.length).toBeGreaterThan(0);
    expect([...WONDER_PAINTINGS].sort()).toEqual(FILES);
  });

  it('names each painting once, in order, so a new line has one place to go', () => {
    expect(new Set(WONDER_PAINTINGS).size).toBe(WONDER_PAINTINGS.length);
    expect([...WONDER_PAINTINGS]).toEqual([...WONDER_PAINTINGS].sort());
  });

  it('loads them from the folder under public', () => {
    expect(WONDER_PAINTINGS_PATH).toBe('/art/splash/wonders/');
  });

  it('answers a painting where one exists and the engraved stand-in elsewhere', () => {
    expect(wonderPaintingUrl('pyramids')).toBe('/art/splash/wonders/pyramids.jpg');
    expect(wonderPicture('pyramids' as never)).toEqual({ kind: 'painted', url: '/art/splash/wonders/pyramids.jpg' });
    // The Water Clock is being retired and has no painting.
    expect(wonderPaintingUrl('waterClockOfSuSong')).toBeNull();
    expect(wonderPicture('waterClockOfSuSong' as never)).toEqual({ kind: 'engraved', mark: 'wonder' });
  });
});
