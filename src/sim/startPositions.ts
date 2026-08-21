/**
 * Where each player begins.
 *
 * Deterministic in the map alone — no dice. Two players who load the same seed
 * get the same starts, and a replay does not have to log them.
 *
 * Scoring
 * -------
 * A candidate is any passable land tile. Its score is its own terrain score plus
 * `neighborWeight` times the sum of its neighbours' — a one-ring smell test that
 * costs nothing and is enough to prefer a grassland pocket over a lone green
 * tile in a desert. Every number comes from `rules.startPlacement.terrainScore`,
 * so "no tundra starts" is a data edit, not a code change.
 *
 * Spreading
 * ---------
 * Picks are greedy: take the best remaining tile, then the best tile at least
 * `minSpacing` hexes (wrap-aware) from every tile already taken. When no tile
 * satisfies the spacing the requirement drops by one and the sweep repeats,
 * down to a floor of 1. A duel map with twelve players therefore still seats
 * everyone — badly, but everyone — instead of throwing.
 *
 * Ties are broken by tile index, so the result is a pure function of the map.
 *
 * Placement
 * ---------
 * `planStartingUnits` seats the roster from `rules.startingUnits` on the start
 * tile, falling back to neighbouring tiles for any unit whose category is
 * already taken there. It tracks occupancy across *all* players, because a
 * relaxed spacing can put two starts within a hex of each other.
 */

import type { GameMap, Tile } from './map';
import { getTile, mapNeighbors, tileHex, tileIndex, wrappedDistance } from './map';
import { RULES } from './rulesData';
import { moveCost } from './terrainData';
import { type UnitCategory, type UnitTypeId, unitDef } from './unitData';

export interface StartPlacement {
  /** Index into `GameState.players`, in player order. */
  ownerIndex: number;
  unitType: UnitTypeId;
  col: number;
  row: number;
}

/** Desirability of a tile as a start: its terrain plus its ring's. */
export function startScore(map: GameMap, tile: Tile): number {
  const { terrainScore, neighborWeight } = RULES.startPlacement;
  let score = terrainScore[tile.terrain];
  for (const hex of mapNeighbors(map, tileHex(tile))) {
    const neighbor = getTile(map, hex);
    if (neighbor) score += neighborWeight * terrainScore[neighbor.terrain];
  }
  return score;
}

function isStartCandidate(tile: Tile): boolean {
  return moveCost(tile.terrain, tile.feature, tile.hills) !== null;
}

/**
 * One start tile per player, in player order. Fewer than `count` tiles come back
 * only when the map has fewer passable land tiles than players.
 */
export function chooseStartPositions(map: GameMap, count: number): Tile[] {
  const chosen: Tile[] = [];
  if (count <= 0) return chosen;

  // Best first, ties by tile index — the whole ranking is computed once.
  const candidates = map.tiles.filter(isStartCandidate);
  const scores = new Map<number, number>();
  for (const tile of candidates) {
    scores.set(tileIndex(map, tile.col, tile.row), startScore(map, tile));
  }
  candidates.sort((a, b) => {
    const ia = tileIndex(map, a.col, a.row);
    const ib = tileIndex(map, b.col, b.row);
    return scores.get(ib)! - scores.get(ia)! || ia - ib;
  });

  const taken = new Set<number>();
  let spacing = RULES.startPlacement.minSpacing;
  while (chosen.length < count && candidates.length > 0) {
    let placedThisSweep = false;
    for (const tile of candidates) {
      if (chosen.length >= count) break;
      const index = tileIndex(map, tile.col, tile.row);
      if (taken.has(index)) continue;
      const hex = tileHex(tile);
      const clear = chosen.every((other) => wrappedDistance(map, hex, tileHex(other)) >= spacing);
      if (!clear) continue;
      chosen.push(tile);
      taken.add(index);
      placedThisSweep = true;
    }
    // Nothing fits at this spacing (or the map simply ran out of tiles).
    if (!placedThisSweep) {
      if (spacing <= 1) break;
      spacing -= 1;
    }
  }
  return chosen;
}

/**
 * Seats `unitTypes` for every start, in player order. Each unit takes the start
 * tile if its category still has room there, otherwise the first neighbouring
 * passable tile with room; a unit with nowhere to stand is skipped.
 */
export function planStartingUnits(
  map: GameMap,
  starts: readonly Tile[],
  unitTypes: readonly UnitTypeId[],
): StartPlacement[] {
  const placements: StartPlacement[] = [];
  const limit = RULES.stacking.perCategoryPerTile;
  /** tileIndex -> category -> how many already stand there. */
  const occupancy = new Map<number, Map<UnitCategory, number>>();

  const roomAt = (tile: Tile, category: UnitCategory): boolean => {
    const counts = occupancy.get(tileIndex(map, tile.col, tile.row));
    return (counts?.get(category) ?? 0) < limit;
  };
  const occupy = (tile: Tile, category: UnitCategory): void => {
    const index = tileIndex(map, tile.col, tile.row);
    let counts = occupancy.get(index);
    if (!counts) {
      counts = new Map<UnitCategory, number>();
      occupancy.set(index, counts);
    }
    counts.set(category, (counts.get(category) ?? 0) + 1);
  };

  for (let ownerIndex = 0; ownerIndex < starts.length; ownerIndex++) {
    const start = starts[ownerIndex]!;
    for (const unitType of unitTypes) {
      const { category } = unitDef(unitType);
      // The start tile first, then its ring in HEX_DIRECTIONS order.
      const options: Tile[] = [start];
      for (const hex of mapNeighbors(map, tileHex(start))) {
        const neighbor = getTile(map, hex);
        if (neighbor && isStartCandidate(neighbor)) options.push(neighbor);
      }
      const seat = options.find((tile) => roomAt(tile, category));
      if (!seat) continue;
      occupy(seat, category);
      placements.push({ ownerIndex, unitType, col: seat.col, row: seat.row });
    }
  }
  return placements;
}
