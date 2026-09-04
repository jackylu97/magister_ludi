/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the pangaea,
 * swept.
 *
 * The core file asserts what the mask *is* on three seeds; everything here is a
 * sweep across seeds and sizes, which is slow by kind. The claims are the
 * ruling's three, and the reason they earn a sweep rather than a fixture is that
 * each is a promise about *every* map a player might be dealt: one continent on
 * every seed, no land off the shelf on any of them, every seat on the mainland
 * at the rosters the game actually plays.
 */
import { describe, expect, it } from 'vitest';

import { MAP_SIZE_NAMES } from '../../src/sim/mapgen';
import { chooseStartPositions } from '../../src/sim/startPositions';
import { mapFor } from './fixtures';
import { landmassesOf, startsAwayFromHome, strandedLandTiles } from './pangaeaHelpers';

const SEEDS = [1, 2, 3, 5, 7, 11, 13, 17, 23, 29, 42, 99, 101, 555, 777, 888, 1234, 2024, 2468, 31337];

describe('one continent, on every seed', () => {
  it('gathers most of the land into a single continent, at every size', () => {
    // The **typical** seed comes out at 81-89% of its land in one continent
    // (median over this sweep, by size). The floor here is 33%, and the distance
    // between the two numbers is one documented shape: a strait. The mask decides
    // how far east and west the land reaches and says nothing about the rows in
    // between, so a seed whose continental noise runs a low band across the
    // continent is dealt a pangaea in two lobes. Seed 5 is the measured worst
    // case at every size — 47% on a standard board, 36% on a large one — with
    // seed 888 behind it. Both lobes are on one shelf and both are big enough to
    // live on, so the world is still one world; what the floor guards is that no
    // seed comes back as an archipelago.
    //
    // The belt retune of 2026-09-03 ("islands bigger and more frequent") moved
    // the medians down from ~92% to ~81%, because the land fraction is fixed by
    // `seaLevel` and every hex the islands gain is a hex the mainland gives up.
    // Round two of the ruling answered that by raising the world's land instead
    // (`seaLevel` 0.62 → 0.58), which put the mainland back to its pre-island
    // *footprint* — 1476 tiles on a standard board against 1480 before — with
    // the islands on top. The share is the reading that stays lower; the
    // continent a player actually walks is the size it always was.
    for (const size of MAP_SIZE_NAMES) {
      for (const seed of SEEDS) {
        const { mainlandTiles, land } = landmassesOf(mapFor(seed, size));
        const percent = Math.round((mainlandTiles / land) * 100);
        expect(`${size}/${seed}: mainland ${percent}%`).toBe(
          `${size}/${seed}: mainland ${Math.max(percent, 33)}%`,
        );
      }
    }
  }, 300_000);

  it('spawns islands on nearly every seed, and medium ones', () => {
    // "Medium sized islands that spawn" — measured as: how many maps in the
    // sweep offer at least one landmass a city could stand on, and how many such
    // islands the average map has. A handful of seeds are a solid continent with
    // nothing off it, which is a world rather than a fault; the claim is about
    // the sweep.
    let withIslands = 0;
    let medium = 0;
    let mediumTiles = 0;
    for (const seed of SEEDS) {
      const { islands } = landmassesOf(mapFor(seed, 'standard'));
      const worth = islands.filter((tiles) => tiles >= 6);
      medium += worth.length;
      for (const tiles of worth) mediumTiles += tiles;
      if (worth.length > 0) withIslands += 1;
    }
    expect(`${withIslands} of ${SEEDS.length} seeds carry an island`).toBe(
      `${Math.max(withIslands, SEEDS.length)} of ${SEEDS.length} seeds carry an island`,
    );
    // The belt retune of 2026-09-03 asked for islands "bigger and more frequent",
    // and both halves are pinned. Measured on a standard board: 8.1 islands of
    // six hexes or more per map at an average of 46 tiles each, against 5.8 at 31
    // before the retune. The floors sit under those with room for a seed sweep to
    // wobble.
    const perMap = medium / SEEDS.length;
    expect(`${perMap.toFixed(1)} medium islands per map`).toBe(
      `${Math.max(perMap, 7).toFixed(1)} medium islands per map`,
    );
    const meanTiles = mediumTiles / Math.max(medium, 1);
    expect(`${meanTiles.toFixed(0)} tiles per medium island`).toBe(
      `${Math.max(meanTiles, 38).toFixed(0)} tiles per medium island`,
    );
  }, 120_000);
});

describe('reachable by coast, on every seed', () => {
  it('leaves no hex of land the mainland shelf cannot reach, at every size', () => {
    // The guarantee, swept. `chainIslandShelves` fires on a minority of seeds —
    // the belt puts most islands inside the two rings of coast that reach them
    // for free — and this is the reading that would notice it being removed.
    for (const size of MAP_SIZE_NAMES) {
      for (const seed of SEEDS) {
        expect(`${size}/${seed}: ${strandedLandTiles(mapFor(seed, size))} stranded`).toBe(
          `${size}/${seed}: 0 stranded`,
        );
      }
    }
  }, 300_000);
});

describe('every seat somewhere a player can live', () => {
  it('seats every roster the game plays on the mainland or a landmass of its own', () => {
    // The rule as ruled on 2026-09-03: the mainland, **or** a landmass of at
    // least `starts.minLandmassTiles`. Loosening the mainland-only reading is
    // what let the *maximum* roster into this sweep — a twelve-seat game on a
    // strait-split seed used to fall through to the last-resort sweep and put one
    // capital on the far lobe, which the tile floor now calls a legal home
    // because it is one.
    //
    // Duel is asserted at two seats and no further, and that is the one
    // documented gap: a 40×25 board will not seat four capitals anywhere decent
    // on every seed, so the greedy sweep's last resort takes refused sites
    // (`chooseStartPositions`) and on seed 31337 one of those is a sixteen-hex
    // island. That is the fallback behaving as designed — a start on an island
    // beats no start — and it is a property of the board's size rather than of
    // the pangaea: duel is the two-player board.
    for (const [size, roster] of [
      ['duel', 2],
      ['standard', 4],
      ['standard', 6],
      ['standard', 8],
      ['standard', 12],
      ['large', 8],
      ['large', 12],
      ['huge', 12],
      ['giant', 12],
    ] as const) {
      for (const seed of SEEDS) {
        const map = mapFor(seed, size);
        const away = startsAwayFromHome(map, chooseStartPositions(map, roster));
        expect(`${size}×${roster}/${seed}: ${away.length} away from home`).toBe(
          `${size}×${roster}/${seed}: 0 away from home`,
        );
      }
    }
  }, 600_000);
});
