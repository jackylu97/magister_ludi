/**
 * The age paintings (`src/ui/agePaintings.ts`): the list against the folder the
 * page loads them from, and the rule that picks a game's set from its seed.
 *
 * The page cannot see which files exist, so the list is written by hand, and
 * this test holds it to the folder in both directions. The set is picked by a
 * hash of the seed in the interface, never by the sim's random numbers (hard
 * rule 4), so the same seed always gives the same set, also after a load.
 */
import { describe, expect, it } from 'vitest';

import { AGE_PAINTINGS, AGE_PAINTINGS_PATH, AGE_PAINTING_SETS, agePaintingSet, agePaintingUrl } from '../../src/ui/agePaintings';
import { uiSource } from './sourceHelpers';

/** The JPEGs in the folder, by the glob's keys (the files are not read). */
const FILES = Object.keys(import.meta.glob('../../public/art/splash/ages/*.jpg', { query: '?url' }))
  .map((path) => path.split('/').pop()!.slice(0, -'.jpg'.length))
  .sort();

describe('the age paintings', () => {
  it('lists exactly the paintings in the folder', () => {
    expect(FILES.length).toBe(12);
    expect([...AGE_PAINTINGS].sort()).toEqual(FILES);
  });

  it('names each painting once, in order, so a new line has one place to go', () => {
    expect(new Set(AGE_PAINTINGS).size).toBe(AGE_PAINTINGS.length);
    expect([...AGE_PAINTINGS]).toEqual([...AGE_PAINTINGS].sort());
  });

  it('has a painting for every age in every set, so every game has a whole set', () => {
    expect([...AGE_PAINTING_SETS]).toEqual(['form', 'still', 'abstract']);
    for (const set of AGE_PAINTING_SETS) {
      for (const age of [1, 2, 3, 4]) expect(agePaintingUrl(set, age), `${set}${age}`).toBe(`/art/splash/ages/${set}${age}.jpg`);
    }
  });

  it('loads them from the folder under public', () => {
    expect(AGE_PAINTINGS_PATH).toBe('/art/splash/ages/');
  });

  it('answers no painting for an age the folder has none for, so the plate falls back to the lapis page', () => {
    expect(agePaintingUrl('form', 0)).toBeNull();
    expect(agePaintingUrl('still', 5)).toBeNull();
  });
});

describe('the set a game shows', () => {
  it('is the same every time for the same seed', () => {
    for (const seed of [0, 1, 7, 42, 1729, -5, 0x7fffffff, -0x80000000]) {
      const first = agePaintingSet(seed);
      expect(AGE_PAINTING_SETS).toContain(first);
      for (let again = 0; again < 3; again += 1) expect(agePaintingSet(seed)).toBe(first);
    }
  });

  it('covers all three sets over many seeds, each a fair share', () => {
    const counts = new Map<string, number>();
    for (let seed = 0; seed < 3000; seed += 1) {
      const set = agePaintingSet(seed);
      counts.set(set, (counts.get(set) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([...AGE_PAINTING_SETS].sort());
    // A fair share is a thousand each; a hash that leaned hard on one set fails.
    for (const set of AGE_PAINTING_SETS) expect(counts.get(set)!).toBeGreaterThan(800);
  });

  it('does not follow the seeds next to it, so neighbouring seeds do not walk the sets in turn', () => {
    const run = Array.from({ length: 30 }, (_, seed) => agePaintingSet(seed));
    const turnByTurn = run.every((set, at) => set === AGE_PAINTING_SETS[at % AGE_PAINTING_SETS.length]);
    expect(turnByTurn).toBe(false);
  });

  it('is the interface’s own hash of the seed, never the sim’s random numbers (hard rule 4)', () => {
    const source = uiSource('agePaintings.ts');
    expect(source).toContain("import { hash3 } from '../render3d/hash';");
    expect(source).toContain('hash3(seed, 0, SET_STREAM)');
    expect(source).not.toContain('state.rng');
    expect(source).not.toContain('Math.random');
    expect(source).not.toMatch(/from '\.\.\/sim\//);
  });
});
