/**
 * What `resources.test.ts` and `resources.slow.test.ts` both need.
 *
 * The two files are one concern split by *cost* rather than by subject — the
 * core file asks its questions of one map, the slow one asks them of a dozen —
 * so a handful of readings are wanted on both sides of the line. They live in a
 * plain module rather than being exported from either test file: importing a
 * `.test.ts` from a `.test.ts` re-registers its tests, and the suite would count
 * the same assertion twice.
 */
import { MAPGEN_CONFIG } from '../../src/sim/mapgen';
import type { GameMap, Tile } from '../../src/sim/map';

/** The resource half of `data/mapgen.json`, which is what both files tune against. */
export const CONFIG = MAPGEN_CONFIG.resources;

/** Every tile the scatter put something on. */
export function resourceTiles(map: GameMap): Tile[] {
  return map.tiles.filter((tile) => tile.resource !== undefined);
}
