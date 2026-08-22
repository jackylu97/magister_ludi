/**
 * Line of sight: the one rule about what a mountain hides.
 *
 * It lives in a file of its own because two systems ask it and they must never
 * get different answers. `combat.ts` asks whether an archer may loose at a tile;
 * `visibility.ts` asks whether a scout may *see* one. Those are the same
 * question about the same ridge, and the moment they were two implementations
 * one of them would grow a hill rule the other had not heard of — a player would
 * learn "I can shoot what I can see" and the board would quietly break the
 * promise. So the rule is written once, here, and both import it.
 *
 * The rule itself is deliberately the crudest thing that is still a rule: the
 * straight hex line between two tiles, endpoints excluded, and a tile nothing
 * can walk over strictly between them blocks. No elevation model, no "hills see
 * over forests", no arc. That is a simplification and not a placeholder — see
 * the note in `combat.ts` and Entry IX of the design ledger — and fog of war
 * inherits it unchanged rather than inventing a second, richer geometry that
 * would then disagree with where arrows land.
 *
 * The one thing fog adds is the *endpoint* convention, and it is in
 * `visibility.ts` rather than here because it is a fog rule and not a geometry
 * one: a blocking mountain is itself seen. You see the ridge; you do not see
 * past it.
 */

import { type Hex, hexDistance, hexLine } from './hex';
import { type GameMap, type Tile, getTile, tileHex } from './map';
import { isWaterTerrain, moveCost } from './terrainData';

/**
 * The copy of `to` nearest `from` across the east–west seam.
 *
 * Shifting a hex by whole map widths in *offset* space changes axial `q` by
 * `k · width` and leaves `r` alone, which is the same identity
 * `wrappedDistance` is built on. A line of sight needs the un-wrapped pair
 * rather than a distance, because `hexLine` is pure hex math and knows nothing
 * about cylinders.
 */
export function nearestCopy(map: GameMap, from: Hex, to: Hex): Hex {
  let best = to;
  let bestDistance = Infinity;
  for (let k = -1; k <= 1; k++) {
    const candidate: Hex = { q: to.q + k * map.width, r: to.r };
    const distance = hexDistance(from, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

/**
 * Does this tile stop an arrow — and, since fog of war, an eye?
 *
 * Derived from the movement table rather than from the string `"mountain"`: a
 * blocker is land nothing can walk over, which today is exactly the mountains
 * and would automatically include any future impassable ridge a designer adds.
 * Water blocks nothing — an archer shoots across a strait, and a lookout sees
 * across one.
 */
export function blocksLineOfSight(tile: Tile): boolean {
  if (isWaterTerrain(tile.terrain)) return false;
  return moveCost(tile.terrain, tile.feature, tile.hills) === null;
}

/**
 * Can something on `from` see `to`?
 *
 * `hexLine`'s tie-break nudge makes the chosen line a pure function of the two
 * endpoints, so a shot that is blocked is blocked in every replay and a tile
 * that is hidden is hidden in every replay.
 */
export function hasLineOfSight(map: GameMap, from: Tile, to: Tile): boolean {
  const start = tileHex(from);
  const goal = nearestCopy(map, start, tileHex(to));
  const line = hexLine(start, goal);
  for (let i = 1; i < line.length - 1; i++) {
    const tile = getTile(map, line[i]!);
    // Off the poles: not a wall, just not there.
    if (!tile) continue;
    if (blocksLineOfSight(tile)) return false;
  }
  return true;
}
