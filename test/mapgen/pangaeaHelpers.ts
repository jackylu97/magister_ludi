/**
 * Readings both pangaea tiers take of a finished map.
 *
 * The claims the 2026-09-03 ruling makes are all *topological* — one continent,
 * every island on the shelf, every seat on the mainland — so they are read off
 * connected components rather than off any number the generator wrote down. The
 * walks live here because the core tier asks them of two seeds and the slow tier
 * asks them of a sweep, and a helper imported from a `.test.ts` file would
 * re-register that file's tests.
 */
import { type GameMap, tileIndex, tileNeighbors } from '../../src/sim/map';
import { MAPGEN_CONFIG } from '../../src/sim/mapgen';
import { isHomeLandmass, landmassFacts } from '../../src/sim/startPositions';
import { landRegions } from '../../src/sim/water';
import { isWaterTerrain } from '../../src/sim/terrainData';

export interface Landmasses {
  /** Tile index → landmass id, `-1` on water. */
  regions: Int32Array;
  /** The largest landmass's id, and how many tiles it has. */
  mainland: number;
  mainlandTiles: number;
  /** Every other landmass's size, largest first. */
  islands: number[];
  /** Land tiles on the whole map. */
  land: number;
}

/** Connected land, sized and ordered. */
export function landmassesOf(map: GameMap): Landmasses {
  const regions = landRegions(map);
  const size = new Map<number, number>();
  for (const id of regions) if (id >= 0) size.set(id, (size.get(id) ?? 0) + 1);
  const ordered = [...size.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const land = [...size.values()].reduce((a, b) => a + b, 0);
  return {
    regions,
    mainland: ordered[0]?.[0] ?? -1,
    mainlandTiles: ordered[0]?.[1] ?? 0,
    islands: ordered.slice(1).map((entry) => entry[1]),
    land,
  };
}

/**
 * Every tile a coastal hull can reach from the mainland without leaving the
 * shelf — land, or `coast`, and never a step through open ocean or a lake.
 *
 * This is "reachable by coast" spelled out as a graph walk, and it is
 * deliberately *not* the same walk `chainIslandShelves` does: it reads the
 * finished map's terrain and knows nothing about how the shelf got there.
 */
export function shelfReachableFromMainland(map: GameMap): Uint8Array {
  const { regions, mainland } = landmassesOf(map);
  const seen = new Uint8Array(map.tiles.length);
  const queue: number[] = [];
  for (let i = 0; i < regions.length; i++) {
    if (regions[i] === mainland) {
      seen[i] = 1;
      queue.push(i);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    for (const near of tileNeighbors(map, map.tiles[queue[head]!]!)) {
      const index = tileIndex(map, near.col, near.row);
      if (seen[index]) continue;
      if (near.terrain !== 'coast' && isWaterTerrain(near.terrain)) continue;
      seen[index] = 1;
      queue.push(index);
    }
  }
  return seen;
}

/**
 * Land tiles the mainland's shelf cannot reach. The ruling's guarantee is 0.
 *
 * **Lake-locked land does not count**, and that exclusion is a fact about the
 * rules rather than a convenience: `lake` is not embarkable (`data/terrain.json`),
 * so an islet in the middle of a lake is ground no unit in the game can stand
 * on, was ground no unit could stand on before the pangaea existed, and is not
 * something a *shelf* could ever fix — a shelf is marine and a lake has none.
 * `chainIslandShelves` leaves such a landmass alone deliberately (see its "no way
 * through" clause), and this reading agrees with it. Measured: one hex of snow
 * ringed by six lake tiles on large/42.
 */
export function strandedLandTiles(map: GameMap): number {
  const reach = shelfReachableFromMainland(map);
  const { regions } = landmassesOf(map);
  const seagoing = new Set<number>();
  for (let i = 0; i < regions.length; i++) {
    if (regions[i]! < 0) continue;
    for (const near of tileNeighbors(map, map.tiles[i]!)) {
      if (near.terrain === 'ocean' || near.terrain === 'coast') seagoing.add(regions[i]!);
    }
  }
  let stranded = 0;
  for (let i = 0; i < regions.length; i++) {
    if (regions[i]! >= 0 && seagoing.has(regions[i]!) && !reach[i]) stranded += 1;
  }
  return stranded;
}

/**
 * Starts whose landmass is not somewhere a player may live — the mainland, or a
 * landmass of at least `starts.minLandmassTiles` (ruled 2026-09-03).
 *
 * Asked through `isHomeLandmass`, the sim's own predicate, rather than restated
 * here: a rule written down twice is a rule that can drift, and the thing under
 * test is whether the *sweep* honours it, not whether a test can spell it.
 */
export function startsAwayFromHome(map: GameMap, starts: readonly { col: number; row: number }[]) {
  const facts = landmassFacts(map);
  return starts
    .map((tile) => facts.size[tileIndex(map, tile.col, tile.row)]!)
    .filter((tiles) => !isHomeLandmass(tiles, facts, MAPGEN_CONFIG.starts));
}
