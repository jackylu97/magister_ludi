/**
 * Which charted hexes would show an explorer the most new ground.
 *
 * The explorer lens marks a few hexes as worth a walk: a hill that sees far
 * into uncharted ground, and a hex beside uncharted ground from which a piece
 * would reveal the most. This module answers "which hexes", and nothing else.
 * It reads the map and the seat's own chart. It does not read where any piece
 * stands, so the answer changes only when the seat charts new ground.
 *
 * The count is an estimate, on purpose. It counts every uncharted hex inside
 * the sight radius and does not ask what a ridge or a forest would hide. The
 * mark says "go and look from here". It does not promise a number, and the
 * lens prints none.
 *
 * A leaf: it imports the map, the terrain table and the chart, and nothing
 * imports it but the renderer's lens.
 */

import { type Tile, mapRange, tileHex, tileIndex, wrappedDistance } from './map';
import type { GameState } from './state';
import { isWaterTerrain } from './terrainData';
import { isExploredBy } from './visibility';

/** How the reading is tuned. The lens passes these from `data/view3d.json`. */
export interface LookoutKnobs {
  /** How far a piece on flat ground sees, in hexes. A hill sees one hex more. */
  sight: number;
  /** A hex with fewer uncharted hexes in sight than this is not worth a mark. */
  minUnseen: number;
  /** Two marked hexes are at least this many hexes apart. */
  spacing: number;
  /** The most hills to mark, and the most hexes that are not hills. */
  hills: number;
  edges: number;
}

/** A hex worth a walk, and how many uncharted hexes lie in sight of it. */
export interface Lookout {
  tile: Tile;
  unseen: number;
}

export interface ExplorerTargets {
  /** Hills that see far into uncharted ground, best first. */
  hills: Lookout[];
  /** Other hexes beside uncharted ground, best first. */
  edges: Lookout[];
}

/**
 * The seat's lookouts. Every candidate is a hex the seat has charted, on land,
 * and not a mountain. The best come first, and a tie goes to the lower tile
 * index, so the order is a fact about the board (rule 2).
 */
export function explorerTargets(state: GameState, playerId: number, knobs: LookoutKnobs): ExplorerTargets {
  const { map } = state;
  const found: Lookout[] = [];
  for (const tile of map.tiles) {
    if (isWaterTerrain(tile.terrain) || tile.terrain === 'mountain') continue;
    if (!isExploredBy(state, playerId, tile.col, tile.row)) continue;
    const radius = Math.max(1, knobs.sight + (tile.hills ? 1 : 0));
    let unseen = 0;
    for (const near of mapRange(map, tileHex(tile), radius)) {
      if (!isExploredBy(state, playerId, near.col, near.row)) unseen += 1;
    }
    if (unseen >= knobs.minUnseen) found.push({ tile, unseen });
  }
  found.sort(
    (a, b) =>
      b.unseen - a.unseen ||
      tileIndex(map, a.tile.col, a.tile.row) - tileIndex(map, b.tile.col, b.tile.row),
  );
  const taken: Lookout[] = [];
  const apart = (pick: Lookout): boolean =>
    taken.every((other) => wrappedDistance(map, tileHex(other.tile), tileHex(pick.tile)) >= knobs.spacing);
  const take = (hills: boolean, limit: number): Lookout[] => {
    const out: Lookout[] = [];
    for (const pick of found) {
      if (out.length >= limit) break;
      if (!!pick.tile.hills !== hills || !apart(pick)) continue;
      out.push(pick);
      taken.push(pick);
    }
    return out;
  };
  // Hills first: a hill is the better place to stand, so it gets first claim on a stretch of edge.
  const hills = take(true, Math.max(0, knobs.hills));
  const edges = take(false, Math.max(0, knobs.edges));
  return { hills, edges };
}
