import { describe, expect, it } from 'vitest';

import { generateMap } from '../../src/sim/mapgen';
import { MAPGEN_CONFIG } from '../../src/sim/mapgenData';
import { createMap, getTileAt } from '../../src/sim/map';
import { RESOURCE_IDS, resourceDef } from '../../src/sim/resourceData';
import { makeRng } from '../../src/sim/rng';
import { placeVeins, veinCells, veinFitsTile, veinGroundAt } from '../../src/sim/veins';

/**
 * The map's invisible layer (ledger Entry LVIII, phase 3; the ratified spec is
 * `docs/themes/11-the-cartographers.md`).
 *
 * Four separable claims, kept apart because they fail for different reasons.
 * Three of them are here; the fourth — the hit rate and the rarity ladder, which
 * are sweeps over seeds — is in the `.slow` sibling.
 *
 *   1. **It is generation.** Deterministic in the seed, seeded only under ground
 *      the generator could legally have put the seam on, and rolled *last* — so
 *      adding veins did not move a wheat field, a ruin or a river.
 *   2. **The surface is untouched.** Rich ore is a `buried` row and is filtered
 *      out of the scatter's own table by the *marker*, never by its name.
 *   3. **It is a secret.** Nothing in the game reads `Tile.vein` except the
 *      survey and the two render files that veil its prop — asserted by reading
 *      the sources, because it is the one property every behavioural test in the
 *      suite would still pass while broken.
 */

const VEINS = MAPGEN_CONFIG.veins;

describe('seeding the veins', () => {
  it('is deterministic in the seed', () => {
    const a = generateMap(4242, 'duel');
    const b = generateMap(4242, 'duel');
    expect(veinCells(a)).toEqual(veinCells(b));
    expect(veinCells(a).length).toBeGreaterThan(0);
  });

  it('only ever seeds a seam the generator could have placed on that hex', () => {
    // The rule `placeVeins` checks before it seeds, asserted from the other end:
    // a struck hill has to be a hill mapgen could have produced, or every later
    // rule that reads a resource grows a special case (see `chopErrorAt`, which
    // already refuses to make one).
    const map = generateMap(88, 'duel');
    for (const cell of veinCells(map)) {
      const tile = getTileAt(map, cell.col, cell.row)!;
      const where = `${cell.col},${cell.row}`;
      expect(tile.hills, where).toBe(true);
      expect(tile.resource, where).toBeUndefined();
      expect(veinFitsTile(tile, cell.resource), where).toBe(true);
    }
  });

  it('draws only the rows the sheet names', () => {
    const named = VEINS.kinds.map((kind) => kind.resource);
    for (const cell of veinCells(generateMap(31, 'duel'))) {
      expect(named).toContain(cell.resource);
    }
  });

  it('spends a roll on every eligible hill, so the stream does not depend on the ground', () => {
    // The conditional-draw failure this pass was written to avoid: a hill that
    // *could* carry nothing must cost the generator exactly what a hill that
    // could carry something costs it, or a later pass reads a different stream
    // on a map whose terrain happened to differ. Asserted by seeding two boards
    // from one generator and checking the second is unaffected by the first's
    // ground.
    const tail = (terrain: 'grassland' | 'snow') => {
      const first = createMap({ width: 8, height: 8, terrain: 'grassland' });
      for (const tile of first.tiles) {
        tile.hills = tile.col % 2 === 0;
        if (tile.hills) tile.terrain = terrain;
      }
      const rng = makeRng(5);
      placeVeins(first, rng, VEINS);
      const second = createMap({ width: 4, height: 4, terrain: 'grassland' });
      for (const tile of second.tiles) tile.hills = true;
      placeVeins(second, rng, VEINS);
      return veinCells(second);
    };
    expect(tail('grassland')).toEqual(tail('snow'));
  });

  it('calls a hill with a resource on it no ground at all', () => {
    // The clause that makes the strike a *move* rather than an overwrite, so
    // `prospectAt` never has to decide what happens to the iron already there.
    const map = createMap({ width: 4, height: 4, terrain: 'grassland' });
    const tile = getTileAt(map, 1, 1)!;
    tile.hills = true;
    expect(veinGroundAt(tile)).toBe(true);
    tile.resource = 'iron';
    expect(veinGroundAt(tile)).toBe(false);
    delete tile.resource;
    tile.hills = false;
    expect(veinGroundAt(tile)).toBe(false);
  });
});

describe('the buried row', () => {
  it('exists, pays something, and carries no scatter weight', () => {
    const buried = RESOURCE_IDS.filter((id) => resourceDef(id).buried === true);
    expect(buried.length).toBeGreaterThan(0);
    for (const id of buried) {
      const def = resourceDef(id);
      expect(def.frequency, id).toBe(0);
      const paid = def.yields.food + def.yields.production + def.yields.gold;
      expect(paid, id).toBeGreaterThan(0);
    }
  });

});

/**
 * Every source file in the tree, read through Vite's raw glob rather than
 * through `node:fs` — the house idiom for a source assertion (see the register
 * test in `test/sim/cities.test.ts`): this project has no node typings, and a
 * source assertion is not worth a dependency.
 */
const SOURCES = {
  ...(import.meta.glob('../../src/sim/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/render3d/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/ui/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/ai/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
};

/** One file's text, by basename. */
function source(file: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(`/${file}`));
  expect(`${file} readable`).toBe(key === undefined ? `${file} missing` : `${file} readable`);
  return SOURCES[key!]!;
}

describe('the buried marker', () => {
  it('filters the scatter by the marker, not by the row’s name', () => {
    // A source read, because the alternative — spelling `richOre` into
    // `resources.ts` — would pass every behavioural test in this file and break
    // the day a second buried row shipped.
    const text = source('resources.ts');
    expect(text).toContain('buried !== true');
    expect(text).not.toContain('richOre');
  });
});

describe('what may read a vein', () => {
  /**
   * **The layer is a secret, and this is the only thing that keeps it one.**
   *
   * Every behavioural test in the suite would still pass if a yield line, a
   * lens, a hover card or a bot heuristic started reading `Tile.vein` — the
   * numbers would all be right and the game would simply be showing the player
   * the answer they were meant to pay a turn for. So the register is asserted by
   * reading the sources.
   *
   * Code lines only: a docblock that *mentions* the field is documentation —
   * `SCHEMA_VERSION`'s own migration note names it — and a sweep that counted
   * prose would have to be relaxed every time somebody explained the layer.
   */
  const OWNERS = [
    'veins.ts', // the scatter
    'map.ts', // the field's own declaration
    'improvements.ts', // the survey
    'board3d.ts', // the veiled prop the bake lays down
    'reveal3d.ts', // and the veil that holds it down
  ];

  it('is written by the generator and read by the survey, and by nothing else', () => {
    const readers: string[] = [];
    for (const [path, text] of Object.entries(SOURCES)) {
      const file = path.slice(path.lastIndexOf('/') + 1);
      const reads = text
        .split('\n')
        .map((line) => line.trim())
        .some(
          (line) =>
            /\.vein\b/.test(line) &&
            !line.startsWith('*') &&
            !line.startsWith('//') &&
            !line.startsWith('/*'),
        );
      if (reads) readers.push(file);
    }
    for (const file of readers) expect(OWNERS, `${file} reads Tile.vein`).toContain(file);
    // And the owners really are there — a sweep that found nothing would pass
    // while asserting nothing at all.
    expect(readers).toContain('veins.ts');
    expect(readers).toContain('improvements.ts');
  });
});
