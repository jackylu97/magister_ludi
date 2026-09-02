/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — where the
 * scatter puts a ruin, measured on real ground.
 *
 * The four claims here are about a *distribution* over a generated map, so each
 * of them pays for a standard map of its own — the last one pays for ten, since
 * "a player opening with two scouts should expect several discoveries" is a
 * median over seeds and over every possible start, and a single roll cannot say
 * anything about a median.
 *
 * `discoveries.test.ts` keeps the pool's own integrity and everything the verbs
 * do, which is the bulk of the concern and runs on duel maps and hand-built
 * boards: claiming, the draw, the pick, every boon's settlement against its
 * printed number, the preview, the End Turn blocker, the replay, and the
 * `arriveOnTile` seam. It also keeps the placement claims a duel map can make —
 * that the scatter is deterministic in the seed, stands clear of every possible
 * start, and rolls last.
 */
import { describe, expect, it } from 'vitest';

import { getTileAt, tileHex, tileIndex, wrappedDistance } from '../../src/sim/map';
import { DISCOVERY_DATA, discoveryKindIsWater } from '../../src/sim/discoveryData';
import { discoveryCells } from '../../src/sim/discoveryPlacement';
import { generateMap } from '../../src/sim/mapgen';
import { MAPGEN_CONFIG } from '../../src/sim/mapgenData';
import { carveContinents } from '../../src/sim/resources';
import { RULES } from '../../src/sim/rulesData';
import { chooseStartPositions } from '../../src/sim/startPositions';
import { isWaterTerrain } from '../../src/sim/terrainData';

const PLACEMENT = DISCOVERY_DATA.placement;

describe('placing discoveries', () => {
  it('keeps sites apart, on walkable land, and off resources', () => {
    const map = generateMap(4242, 'standard');
    const sites = discoveryCells(map);
    expect(sites.length).toBeGreaterThan(4);

    // The fairness top-up is the documented exception, exactly as it is for
    // the two start guarantees in `resources.ts` (`test/mapgen/resources.test.ts`,
    // "keeps different finds apart"): a floor outranks the spacing aesthetic,
    // so a start hemmed in by other finds gets its site anyway. Every
    // violation must therefore be within the top-up's own reach of a possible
    // start — a leak in the deal itself would show up far from every start and
    // fail here.
    const starts = chooseStartPositions(map, RULES.game.maxPlayers).map((tile) => tileHex(tile));
    const reach = PLACEMENT.fairness.radius;
    for (let i = 0; i < sites.length; i++) {
      const tile = getTileAt(map, sites[i]!.col, sites[i]!.row)!;
      // The **sea layer** is the one exception to the ground rules, and it is a
      // different rule rather than a relaxed one: a find at sea stands on deep
      // ocean and nowhere else (`DiscoveryKindDef.water`, and `isDeepWater` in
      // the placement pass). Everything dealt on land still keeps the first
      // wave's three clauses exactly.
      if (discoveryKindIsWater(sites[i]!.kind)) {
        expect(tile.terrain).toBe('ocean');
      } else {
        expect(isWaterTerrain(tile.terrain)).toBe(false);
        expect(tile.terrain).not.toBe('mountain');
      }
      expect(tile.resource).toBeUndefined();
      for (let j = i + 1; j < sites.length; j++) {
        const other = getTileAt(map, sites[j]!.col, sites[j]!.row)!;
        const distance = wrappedDistance(map, tileHex(tile), tileHex(other));
        if (distance >= PLACEMENT.minDistanceApart) continue;
        const guarded = starts.some(
          (start) =>
            wrappedDistance(map, start, tileHex(tile)) <= reach ||
            wrappedDistance(map, start, tileHex(other)) <= reach,
        );
        expect(`(${tile.col},${tile.row}) vs (${other.col},${other.row}) d=${distance}`).toBe(
          guarded
            ? `(${tile.col},${tile.row}) vs (${other.col},${other.row}) d=${distance}`
            : 'a crowded pair in open country',
        );
      }
    }
  });

  it('places both kinds, in the numbers the per-continent deal asks for', () => {
    const map = generateMap(31337, 'standard');
    const sites = discoveryCells(map);
    const ruins = sites.filter((site) => site.kind === 'ruins').length;
    const villages = sites.filter((site) => site.kind === 'village').length;
    expect(ruins).toBeGreaterThan(0);
    expect(villages).toBeGreaterThan(0);

    // Dealt per continent (2026-08-25 retune): each of the map's carved
    // continents is a ceiling of `sitesPerContinent.max` sites, not a promise —
    // spacing and a cramped continent both thin it, `assignOases`'s bargain
    // exactly. The fairness top-up then adds *on top* of that, up to
    // `fairness.minWithinRadius` more per possible start, so the map-wide
    // ceiling is both budgets summed — one-sided by design either way.
    const continents = carveContinents(map, MAPGEN_CONFIG.resources);
    const starts = chooseStartPositions(map, RULES.game.maxPlayers);
    const ceiling =
      continents.count * Math.round(PLACEMENT.sitesPerContinent.max) +
      starts.length * PLACEMENT.fairness.minWithinRadius;
    expect(ruins + villages).toBeLessThanOrEqual(ceiling);
  });

  it('deals every continent its own site count, and the reading is per continent', () => {
    // The complaint this retune answers: a flat rate per 1000 land tiles read
    // the whole map as one grey average, and measured that way the nearest site
    // to a capital sat 7-16 hexes off. Dealing per continent (the same regions
    // `dealContinentLuxuries` reads, `resources.ts`) means every *region* reads
    // as having its own ruins nearby rather than the map having a budget
    // somewhere in it.
    const map = generateMap(4242, 'standard');
    const continents = carveContinents(map, MAPGEN_CONFIG.resources);
    const sites = discoveryCells(map);
    const perContinent = new Array<number>(continents.count).fill(0);
    for (const site of sites) {
      const tile = getTileAt(map, site.col, site.row)!;
      const continent = continents.of[tileIndex(map, tile.col, tile.row)]!;
      if (continent >= 0) perContinent[continent] += 1;
    }
    // At least one carved continent actually seats sites — vacuous otherwise —
    // and every continent reads as having its own handful, not a lone outlier
    // carrying the map's whole total.
    expect(Math.max(...perContinent)).toBeGreaterThan(0);
    const seatedContinents = perContinent.filter((count) => count > 0).length;
    expect(seatedContinents).toBeGreaterThan(continents.count / 2);
  });

  it('the fairness top-up meets the two-scout-reach floor without ever handing a freebie', () => {
    // The acceptance metric (user, 2026-08-25): a player opening with two
    // scouts should expect several discoveries in the early game. Measured as
    // sites within 12 hexes of a start — a proxy for two-scout reach over the
    // first ~25 turns — over 10 seeds and every possible start: the median
    // should be at least 6, and the fairness top-up's floor
    // (`placement.fairness.minWithinRadius`, 3) should hold for all but a rare
    // edge case. What must hold *without exception* is `minDistanceFromStart`:
    // the top-up trades away its own floor before it ever trades away another
    // seat's exclusion zone (`discoveryPlacement.ts`'s `ensureStartDiscoveries`
    // docblock) — asserted directly here rather than trusted from the
    // single-seed check above.
    const within12: number[] = [];
    let shortOfFloor = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const map = generateMap(seed * 10007, 'standard');
      const sites = discoveryCells(map);
      const starts = chooseStartPositions(map, RULES.game.maxPlayers).map((tile) => tileHex(tile));
      for (const site of sites) {
        const hex = tileHex(getTileAt(map, site.col, site.row)!);
        for (const start of starts) {
          expect(wrappedDistance(map, hex, start)).toBeGreaterThanOrEqual(
            PLACEMENT.minDistanceFromStart,
          );
        }
      }
      for (const start of starts) {
        const count = sites.filter(
          (site) => wrappedDistance(map, start, tileHex(getTileAt(map, site.col, site.row)!)) <= 12,
        ).length;
        within12.push(count);
        if (count < PLACEMENT.fairness.minWithinRadius) shortOfFloor += 1;
      }
    }
    within12.sort((a, b) => a - b);
    const median = within12[Math.floor(within12.length / 2)]!;
    expect(median).toBeGreaterThanOrEqual(6);
    // Short of the floor is the rare, documented edge case — a low-priority
    // candidate start (measured against the *maximum* roster) whose whole
    // radius sits inside closer starts' exclusion zones — never the common
    // case: under 5% of the 120 (seed × start) samples.
    expect(shortOfFloor / within12.length).toBeLessThan(0.05);
  });

});
