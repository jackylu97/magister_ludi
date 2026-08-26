import { describe, expect, it } from 'vitest';

import {
  continentReport,
  mapReport,
  resourceCensus,
  startReport,
} from '../../src/dev/mapReport';
import { hslToPacked, partitionColor } from '../../src/render3d/tint3d';
import { mapRange, tileHex, tileIndex } from '../../src/sim/map';
import { MAPGEN_CONFIG } from '../../src/sim/mapgenData';
import { RESOURCE_IDS, resourceDef } from '../../src/sim/resourceData';
import { carveContinents, landTileCount } from '../../src/sim/resources';
import { applyCommand } from '../../src/sim/commands';
import { RULES } from '../../src/sim/rulesData';
import { chooseStartPositions, scoreStartSite } from '../../src/sim/startPositions';
import { unitDef } from '../../src/sim/unitData';
import { type GameConfig, type GameState, newGame } from '../../src/sim/state';
import { gameFor } from './fixtures';
import { isWaterTerrain } from '../../src/sim/terrainData';

/**
 * The mapgen inspection page's reading half, held to the one promise that makes
 * it worth having: **every figure is the simulation's own**.
 *
 * So most of what is asserted here is an identity rather than a value — the
 * census sums to the resources actually on the map, the continents partition
 * every tile exactly once, the start rows carry `scoreStartSite`'s numbers
 * unaltered. A report that drifted from its sources would still print plausible
 * figures, and that is precisely the failure these tests exist to catch.
 *
 * `duel` for speed, `standard` where the claim is about a map big enough to have
 * several continents — which is the size the page itself generates.
 */
function config(players: number, sizeName = 'duel', seed = 4242): GameConfig {
  return {
    seed,
    sizeName,
    players: new Array(players)
      .fill(null)
      .map((_, i) => ({ name: `Seat ${i + 1}`, color: '#fff' })),
  };
}

/**
 * A private game for a roster and a map. `gameFor` rather than `newGame`: the
 * standard-map default is asked for a dozen times in this file and generating
 * that map a dozen times is a dozen times the wall clock for one map. Every
 * caller still gets a state of its own — see `./fixtures`.
 */
function state(players = 4, sizeName = 'duel', seed = 4242): GameState {
  return gameFor(config(players, sizeName, seed));
}

describe('resourceCensus', () => {
  it('counts every resource tile on the map, once', () => {
    const s = state();
    const census = resourceCensus(s);
    const placed = s.map.tiles.filter((tile) => tile.resource !== undefined).length;
    expect(census.tiles).toBe(placed);
    const summed = census.groups.reduce((sum, group) => sum + group.tiles, 0);
    expect(summed).toBe(placed);
  });

  it('keeps a row for every resource in the table, placed or not', () => {
    const census = resourceCensus(state());
    const ids = census.groups.flatMap((group) => group.rows.map((row) => row.id));
    expect(ids.slice().sort()).toEqual(RESOURCE_IDS.slice().sort());
    // Row order inside a group is the table's, so two censuses line up.
    for (const group of census.groups) {
      const expected = RESOURCE_IDS.filter((id) => resourceDef(id).kind === group.kind);
      expect(group.rows.map((row) => row.id)).toEqual(expected);
    }
  });

  it('groups each row under its own kind', () => {
    for (const group of resourceCensus(state()).groups) {
      for (const row of group.rows) {
        expect(row.kind).toBe(group.kind);
        expect(resourceDef(row.id).kind).toBe(group.kind);
      }
    }
  });

  it('reads land off the generator’s own count, and densities off that', () => {
    const s = state();
    const census = resourceCensus(s);
    expect(census.landTiles).toBe(landTileCount(s.map));
    for (const group of census.groups) {
      expect(group.perThousandLand).toBeCloseTo((group.tiles * 1000) / census.landTiles, 9);
    }
  });

  it('is a pure function of the state', () => {
    expect(resourceCensus(state())).toEqual(resourceCensus(state()));
  });
});

describe('continentReport', () => {
  it('gives one row per carved continent', () => {
    const s = state(4, 'standard');
    const report = continentReport(s);
    const continents = carveContinents(s.map, MAPGEN_CONFIG.resources);
    expect(report.count).toBe(continents.count);
    expect(report.rows).toHaveLength(continents.count);
    expect(report.rows.map((row) => row.id)).toEqual(
      report.rows.map((_, index) => index),
    );
  });

  it('partitions every tile exactly once, land and sea', () => {
    const s = state(4, 'standard');
    const report = continentReport(s);
    const tiles = report.rows.reduce((sum, row) => sum + row.tiles, 0);
    const land = report.rows.reduce((sum, row) => sum + row.landTiles, 0);
    expect(tiles).toBe(s.map.tiles.length);
    expect(land).toBe(landTileCount(s.map));
  });

  it('accounts for every luxury tile on the map in exactly one hand', () => {
    const s = state(4, 'standard');
    const report = continentReport(s);
    const counted = report.rows.reduce(
      (sum, row) => sum + row.luxuries.reduce((inner, lux) => inner + lux.copies, 0),
      0,
    );
    const placed = s.map.tiles.filter(
      (tile) => tile.resource !== undefined && resourceDef(tile.resource).kind === 'luxury',
    ).length;
    expect(counted).toBe(placed);
  });

  it('reads a hand off the ground rather than re-dealing it', () => {
    const s = state(4, 'standard');
    const continents = carveContinents(s.map, MAPGEN_CONFIG.resources);
    for (const row of continentReport(s).rows) {
      for (const lux of row.luxuries) {
        // Every copy it claims stands on a tile carrying that id on that continent.
        const found = s.map.tiles.filter(
          (tile) =>
            tile.resource === lux.id &&
            continents.of[tileIndex(s.map, tile.col, tile.row)] === row.id,
        ).length;
        expect(found).toBe(lux.copies);
        expect(lux.copies).toBeGreaterThan(0);
      }
    }
  });
});

describe('startReport', () => {
  it('gives one row per seat, in player order, named by the roster', () => {
    const s = state(4, 'standard');
    const report = startReport(s);
    expect(report.rows).toHaveLength(4);
    expect(report.rows.map((row) => row.playerId)).toEqual([0, 1, 2, 3]);
    expect(report.rows.map((row) => row.name)).toEqual([
      'Seat 1',
      'Seat 2',
      'Seat 3',
      'Seat 4',
    ]);
  });

  it('sits on the chooser’s own start tiles', () => {
    const s = state(4, 'standard');
    const starts = chooseStartPositions(s.map, 4);
    const rows = startReport(s).rows;
    rows.forEach((row, index) => {
      expect([row.col, row.row]).toEqual([starts[index]!.col, starts[index]!.row]);
    });
  });

  it('carries the start scorer’s ring figures unaltered', () => {
    const s = state(4, 'standard');
    for (const row of startReport(s).rows) {
      const tile = s.map.tiles[tileIndex(s.map, row.col, row.row)]!;
      const scored = scoreStartSite(s.map, tile);
      expect(row.ringFood).toBe(scored.ringFood);
      expect(row.ringProduction).toBe(scored.ringProduction);
      expect(row.score).toBe(scored.total);
      expect(row.reject).toBe(scored.reject);
    }
  });

  it('gathers luxuries over the guarantee radius and no further', () => {
    const s = state(4, 'standard');
    const report = startReport(s);
    expect(report.luxuryRadius).toBe(
      Math.round(MAPGEN_CONFIG.resources.startLuxuryRadius),
    );
    for (const row of report.rows) {
      const tile = s.map.tiles[tileIndex(s.map, row.col, row.row)]!;
      const tally = new Map<string, number>();
      for (const near of mapRange(s.map, tileHex(tile), report.luxuryRadius)) {
        const id = near.resource;
        if (id === undefined || resourceDef(id).kind !== 'luxury') continue;
        tally.set(id, (tally.get(id) ?? 0) + 1);
      }
      // In table order, which is what stops the sweep order from leaking out.
      const expected = RESOURCE_IDS.filter((id) => tally.has(id)).map((id) => ({
        id,
        name: resourceDef(id).name,
        copies: tally.get(id)!,
      }));
      expect(row.luxuries).toEqual(expected);
    }
  });

  it('never seats anybody on water', () => {
    const s = state(6, 'standard');
    for (const row of startReport(s).rows) {
      const tile = s.map.tiles[tileIndex(s.map, row.col, row.row)]!;
      expect(isWaterTerrain(tile.terrain)).toBe(false);
    }
  });
});

describe('mapReport', () => {
  it('reports the map it was handed, and one continent id per tile', () => {
    const st = state(4, 'standard');
    const report = mapReport(st);
    expect(report.width).toBe(st.map.width);
    expect(report.height).toBe(st.map.height);
    expect(report.seed).toBe(st.map.seed);
    expect(report.sizeName).toBe('standard');
    expect(report.continentOf).toHaveLength(st.map.tiles.length);
    expect(Array.from(report.continentOf)).toEqual(
      Array.from(carveContinents(st.map, MAPGEN_CONFIG.resources).of),
    );
  });

  it('agrees with each of its parts, so the page cannot be told two stories', () => {
    const st = state(4, 'standard');
    const report = mapReport(st);
    expect(report.census).toEqual(resourceCensus(st));
    expect(report.continents).toEqual(continentReport(st));
    expect(report.starts).toEqual(startReport(st));
  });

  it('is a pure function of the state', () => {
    const first = mapReport(state(4, 'standard', 991));
    const second = mapReport(state(4, 'standard', 991));
    expect(second.census).toEqual(first.census);
    expect(second.continents).toEqual(first.continents);
    expect(second.starts).toEqual(first.starts);
    expect(Array.from(second.continentOf)).toEqual(Array.from(first.continentOf));
  });
});

/**
 * The page's other claim, and the one it now asserts out loud: **every seat
 * founds its capital**.
 *
 * The "only two of four capitals appear" report turned out to be two flags
 * painted in board inks (`test/lookData.test.ts` holds that end), and ruling the
 * *founding* out took a sweep nobody had run. This is that sweep, kept: it costs
 * a second and it is the difference between "the page says 4/4" and "4/4 is
 * true". `foundCityAt` rather than the reducer because the question is about the
 * ground under the settler, which is what a start is chosen on.
 */
describe('every seat can plant', () => {
  it('seats a settler on ground it may found on, at every roster size', () => {
    for (const seed of [1, 7, 99, 1234, 4242]) {
      for (const seats of [2, 4, 8, RULES.game.maxPlayers]) {
        const live = newGame(config(seats, 'standard', seed));
        const where = `${seed}/${seats} seats`;
        const settlers = live.units.filter((unit) => unitDef(unit.type).foundsCity);
        expect(`${where}: ${settlers.length} settlers`).toBe(`${where}: ${seats} settlers`);

        let founded = 0;
        for (const settler of settlers) {
          const result = applyCommand(live, {
            type: 'foundCity',
            playerId: settler.ownerId,
            settlerUnitId: settler.id,
          });
          if (result.ok) founded += 1;
          else expect(`${where} seat ${settler.ownerId}: ${result.error}`).toBe(`${where} seat ${settler.ownerId}: founded`);
        }
        expect(`${where}: ${founded} capitals`).toBe(`${where}: ${seats} capitals`);
      }
    }
  });
});

describe('partition inks', () => {
  it('converts HSL the textbook way', () => {
    expect(hslToPacked(0, 1, 0.5)).toBe(0xff0000);
    expect(hslToPacked(1 / 3, 1, 0.5)).toBe(0x00ff00);
    expect(hslToPacked(2 / 3, 1, 0.5)).toBe(0x0000ff);
    expect(hslToPacked(0, 0, 0)).toBe(0x000000);
    expect(hslToPacked(0, 0, 1)).toBe(0xffffff);
  });

  it('wraps the hue rather than clamping it', () => {
    expect(hslToPacked(1.25, 0.6, 0.5)).toBe(hslToPacked(0.25, 0.6, 0.5));
  });

  it('keeps neighbouring partition ids far apart on the wheel', () => {
    // The whole reason for the golden-angle walk: carved continents are numbered
    // by a BFS, so map neighbours are very often id neighbours.
    for (let i = 0; i < 24; i++) {
      expect(partitionColor(i, 24)).not.toBe(partitionColor(i + 1, 24));
    }
    const seen = new Set<number>();
    for (let i = 0; i < 24; i++) seen.add(partitionColor(i, 24));
    expect(seen.size).toBe(24);
  });

  it('is stable for a given id', () => {
    expect(partitionColor(7, 20)).toBe(partitionColor(7, 20));
  });
});
