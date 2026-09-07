/**
 * The strategic start guarantee (`ensureStartStrategics`, `resources.ts`), ruled
 * 2026-09-05: *"every capital has both horses and iron within six tiles."*
 *
 * Three claims, and the third is the one that makes the first two safe:
 *
 *   1. **Every seat is armed.** Over the maximum roster, every row of
 *      `startStrategics` stands within `startStrategicRadius` of every start.
 *   2. **On legal ground.** A forced copy sits on a hex its own row allows —
 *      the guarantee bends the spacing rule, never the terrain filter.
 *   3. **It costs the stream nothing.** It rolls no dice, so switching it off
 *      changes only the hexes it would have planted on: every other resource on
 *      the map is where it was. That is what makes it safe to have added to a
 *      shipped generator.
 *
 * The sweep over five seeds and every size is `startStrategics.slow.test.ts`.
 */
import { describe, expect, it } from 'vitest';

import { generateMap } from '../../src/sim/mapgen';
import { MAPGEN_CONFIG } from '../../src/sim/mapgenData';
import { mapRange, tileHex, tileIndex } from '../../src/sim/map';
import { RESOURCE_IDS, resourceDef, tileSuitsResource } from '../../src/sim/resourceData';
import { chooseStartPositions, strategicGround } from '../../src/sim/startPositions';
import { RULES } from '../../src/sim/rulesData';
import { mapFor } from './fixtures';

const WANTED = MAPGEN_CONFIG.resources.startStrategics;
const RADIUS = MAPGEN_CONFIG.resources.startStrategicRadius;

/** The sheet with the guarantee switched off — an empty list disables it. */
const OFF = { resources: { startStrategics: [] } };

describe('the strategic start guarantee', () => {
  it('ships the two rows the ruling names', () => {
    expect(WANTED).toEqual(['horses', 'iron']);
    expect(RADIUS).toBe(6);
    for (const id of WANTED) {
      expect(RESOURCE_IDS).toContain(id);
      expect(resourceDef(id).kind).toBe('strategic');
    }
  });

  it('arms every seat of the maximum roster', () => {
    const map = mapFor(11, 'standard');
    const starts = chooseStartPositions(map, RULES.game.maxPlayers);
    expect(starts.length).toBe(RULES.game.maxPlayers);
    for (const start of starts) {
      const near = mapRange(map, tileHex(start), RADIUS);
      for (const id of WANTED) {
        const found = near.some((tile) => tile.resource === id);
        expect(`(${start.col},${start.row}) ${id} ${found}`).toBe(
          `(${start.col},${start.row}) ${id} true`,
        );
      }
    }
  });

  it('plants only on ground the row allows', () => {
    // The guarantee gives up `minSpacing` rather than the guarantee (as the food
    // and luxury passes do) — but never the terrain filter, which would put iron
    // on flat grass.
    const map = mapFor(11, 'standard');
    for (const tile of map.tiles) {
      if (tile.resource === undefined) continue;
      expect(`${tile.resource} at (${tile.col},${tile.row})`).toBe(
        tileSuitsResource(tile, resourceDef(tile.resource))
          ? `${tile.resource} at (${tile.col},${tile.row})`
          : `${tile.resource} on illegal ground`,
      );
    }
  });

  it('rolls no dice, so it moves nothing it did not plant', () => {
    // Two generations of one seed, the guarantee on and off. Every difference is
    // a hex that gained a listed strategic — nothing else moved, which is only
    // true because the pass never touches `rng`.
    const armed = generateMap(11, 'standard');
    const bare = generateMap(11, 'standard', OFF);
    let planted = 0;
    for (let i = 0; i < armed.tiles.length; i++) {
      const was = bare.tiles[i]!.resource;
      const now = armed.tiles[i]!.resource;
      if (was === now) continue;
      planted += 1;
      expect(`${was ?? 'nothing'} -> ${now ?? 'nothing'}`).toBe(
        `nothing -> ${now ?? 'nothing'}`,
      );
      expect(WANTED).toContain(now);
    }
    // And it does something: a test that passed because the pass was inert
    // would pass with the pass deleted.
    expect(planted).toBeGreaterThan(0);
  });

  it('leaves the terrain and the woods exactly where they were', () => {
    // The guarantee is a resource pass, so it may not move a hex of ground —
    // the same claim the woodland pass makes one direction over.
    const armed = generateMap(11, 'standard');
    const bare = generateMap(11, 'standard', OFF);
    for (let i = 0; i < armed.tiles.length; i++) {
      const a = armed.tiles[i]!;
      const b = bare.tiles[i]!;
      expect(`${a.terrain} ${a.feature} ${a.hills} ${a.riverEdges}`).toBe(
        `${b.terrain} ${b.feature} ${b.hills} ${b.riverEdges}`,
      );
    }
  });
});

describe('the ground behind the guarantee', () => {
  it('flags exactly the hexes with a legal hex in reach', () => {
    // `strategicGround` is a dilation, and a dilation is only worth trusting if
    // it agrees with the disc it stands in for. Checked against `mapRange` on a
    // duel board, where asking 1000 hexes the slow way is affordable.
    const map = mapFor(23, 'duel');
    const field = strategicGround(map);
    expect(field.rows).toEqual([...WANTED]);
    for (const id of field.rows) {
      const def = resourceDef(id);
      const flag = field.reach.get(id)!;
      for (const tile of map.tiles) {
        const slow = mapRange(map, tileHex(tile), RADIUS).some((near) =>
          tileSuitsResource(near, def),
        );
        const fast = flag[tileIndex(map, tile.col, tile.row)] === 1;
        expect(`${id} (${tile.col},${tile.row}) ${fast}`).toBe(
          `${id} (${tile.col},${tile.row}) ${slow}`,
        );
      }
    }
  });

  it('says nothing at all when the sheet asks for nothing', () => {
    // An empty list is the off switch for both halves: no guarantee, and no
    // seventh rejection in the chooser.
    const map = generateMap(23, 'duel', OFF);
    expect(strategicGround(map).rows).toEqual([]);
  });
});
