/**
 * The list of leader portraits (`src/ui/leaderPortraits.ts`) against the folder the page loads
 * them from, as `wonderPaintings.test.ts` does for the wonders. None exists
 * yet (Quiet Table, build stage 3): the list is empty and the folder holds only
 * its `.gitkeep`. The test passes as it is, and goes on passing as pictures
 * arrive with their lines.
 */
import { describe, expect, it } from 'vitest';

import { LEADER_IDS } from '../../src/sim/leaderData';
import { LEADER_PORTRAITS, LEADER_PORTRAITS_PATH, leaderPortraitUrl } from '../../src/ui/leaderPortraits';
import { leaderPicture } from '../../src/ui/leaderSelect';

/** The JPEGs in the folder, by the glob's keys (the files are not read). */
const FILES = Object.keys(import.meta.glob('../../public/art/splash/leaders/*.jpg', { query: '?url' }))
  .map((path) => path.split('/').pop()!.slice(0, -'.jpg'.length))
  .sort();

describe('the leader portraits', () => {
  it('lists exactly the pictures in the folder, which may be none', () => {
    expect([...LEADER_PORTRAITS].sort()).toEqual(FILES);
  });

  it('names each picture once, in order, and only a row the table knows', () => {
    expect(new Set(LEADER_PORTRAITS).size).toBe(LEADER_PORTRAITS.length);
    expect([...LEADER_PORTRAITS]).toEqual([...LEADER_PORTRAITS].sort());
    for (const id of LEADER_PORTRAITS) expect(LEADER_IDS as readonly string[]).toContain(id);
  });

  it('loads them from the folder under public', () => {
    expect(LEADER_PORTRAITS_PATH).toBe('/art/splash/leaders/');
    expect(leaderPortraitUrl('nobodyAtAll')).toBeNull();
  });

  it('answers a portrait where one exists and the seat\'s charge elsewhere', () => {
    for (const id of LEADER_IDS) {
      const url = leaderPortraitUrl(id);
      expect(leaderPicture(id), id).toEqual(url === null ? { kind: 'charge' } : { kind: 'painted', url });
    }
  });
});
