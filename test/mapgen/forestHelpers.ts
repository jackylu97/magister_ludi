/**
 * The woodland reading both forest tiers share.
 *
 * A non-test module because the core file and the slow file ask the same four
 * questions of different maps — importing a `.test.ts` would re-register its
 * tests (the tier rule in `CLAUDE.md`).
 *
 * It is deliberately **not** `woodlandReport`: a test that measures the woods
 * with the same function the page prints them with can only ever assert that a
 * function equals itself. The report is held to this reading by
 * `mapReport.test.ts`; everything else here measures the map directly.
 */
import { type GameMap, tileIndex, tileNeighbors } from '../../src/sim/map';
import { isWaterTerrain } from '../../src/sim/terrainData';

export interface WoodStats {
  land: number;
  forest: number;
  /** Forest hexes as a share of land. */
  share: number;
  /** Sizes of every connected wood, descending. */
  patchSizes: number[];
  patches: number;
  meanPatch: number;
  largestPatch: number;
  /** Forest hexes whose six neighbours are all forest. */
  enclosed: number;
  enclosedShare: number;
}

/** Every forest hex flagged by tile index. */
export function woodedMask(map: GameMap): Uint8Array {
  const wooded = new Uint8Array(map.tiles.length);
  for (const tile of map.tiles) {
    if (tile.feature === 'forest') wooded[tileIndex(map, tile.col, tile.row)] = 1;
  }
  return wooded;
}

/** How many of a hex's six neighbours are wooded, against the given mask. */
export function woodedNeighbours(map: GameMap, index: number, wooded: Uint8Array): number {
  let n = 0;
  for (const neighbour of tileNeighbors(map, map.tiles[index]!)) {
    if (wooded[tileIndex(map, neighbour.col, neighbour.row)]) n += 1;
  }
  return n;
}

/** True when all six neighbours are wooded — the inside of a wood. */
export function isEnclosed(map: GameMap, index: number, wooded: Uint8Array): boolean {
  return (
    tileNeighbors(map, map.tiles[index]!).length === 6 &&
    woodedNeighbours(map, index, wooded) === 6
  );
}

/**
 * The size of the wood each forest hex belongs to, by tile index; 0 where there
 * are no trees. The denominator the clearing floor is applied against.
 */
export function patchSizeByTile(map: GameMap, wooded: Uint8Array): Int32Array {
  const sizes = new Int32Array(map.tiles.length);
  const seen = new Uint8Array(map.tiles.length);
  for (let i = 0; i < map.tiles.length; i++) {
    if (!wooded[i] || seen[i]) continue;
    const patch: number[] = [i];
    seen[i] = 1;
    for (let head = 0; head < patch.length; head++) {
      for (const neighbour of tileNeighbors(map, map.tiles[patch[head]!]!)) {
        const at = tileIndex(map, neighbour.col, neighbour.row);
        if (!wooded[at] || seen[at]) continue;
        seen[at] = 1;
        patch.push(at);
      }
    }
    for (const index of patch) sizes[index] = patch.length;
  }
  return sizes;
}

export function woodStats(map: GameMap): WoodStats {
  const wooded = woodedMask(map);
  let land = 0;
  let forest = 0;
  for (const tile of map.tiles) {
    if (!isWaterTerrain(tile.terrain)) land += 1;
    if (tile.feature === 'forest') forest += 1;
  }

  const seen = new Uint8Array(map.tiles.length);
  const patchSizes: number[] = [];
  for (let i = 0; i < map.tiles.length; i++) {
    if (!wooded[i] || seen[i]) continue;
    let size = 0;
    const stack = [i];
    seen[i] = 1;
    while (stack.length > 0) {
      const index = stack.pop()!;
      size += 1;
      for (const neighbour of tileNeighbors(map, map.tiles[index]!)) {
        const at = tileIndex(map, neighbour.col, neighbour.row);
        if (!wooded[at] || seen[at]) continue;
        seen[at] = 1;
        stack.push(at);
      }
    }
    patchSizes.push(size);
  }
  patchSizes.sort((a, b) => b - a);

  let enclosed = 0;
  for (let i = 0; i < map.tiles.length; i++) {
    if (wooded[i] && isEnclosed(map, i, wooded)) enclosed += 1;
  }

  return {
    land,
    forest,
    share: forest / Math.max(1, land),
    patchSizes,
    patches: patchSizes.length,
    meanPatch: patchSizes.length > 0 ? forest / patchSizes.length : 0,
    largestPatch: patchSizes[0] ?? 0,
    enclosed,
    enclosedShare: forest > 0 ? enclosed / forest : 0,
  };
}

/** One line of the before/after table, for a test that reports as well as asserts. */
export function woodLine(label: string, stats: WoodStats): string {
  return (
    `${label}: share ${(stats.share * 100).toFixed(1)}% · ` +
    `${stats.patches} woods · mean ${stats.meanPatch.toFixed(1)} · ` +
    `largest ${stats.largestPatch} · enclosed ${(stats.enclosedShare * 100).toFixed(1)}%`
  );
}
