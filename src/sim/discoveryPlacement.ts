/**
 * Where the ruins and the villages stand: the last pass of map generation.
 *
 * Deliberately a module of its own rather than half of `discoveries.ts`, and the
 * split is the same one `startPositions.ts` makes against `resources.ts`: the
 * *scatter* is generation — it reads a map, rolls the generator's own dice and
 * knows nothing about players, cities or yields — while the *claim* is play, and
 * play needs `cities.ts` and `tech.ts` to settle a boon. Keeping them apart is
 * what stops `mapgen.ts` acquiring a second import edge into the city rules for
 * the sake of one scatter.
 *
 * Last, and that ordering is load-bearing
 * ---------------------------------------
 * This runs after `placeResources`, which is itself after the rivers, which is
 * itself after every noise field — the same discipline every pass before it keeps
 * (see `generateMap`). Every draw made here is a draw nothing before it can see,
 * so terrain, hills, features, river edges and resources on a given seed are
 * bit-identical to what they were before discoveries existed. A pass that rolled
 * earlier would have moved every wheat field on every map in the game.
 *
 * What ground may hold a site
 * ---------------------------
 * Passable land (so no mountains and no sea — a ruin nothing can walk to is a
 * decoration), carrying **no resource**, standing `minDistanceFromStart` from
 * every possible start and `minDistanceApart` from every site already placed.
 *
 * The resource exclusion is presentation as much as rule: a hex already drawing a
 * wheat sheaf and a reveal marker does not also want broken columns on it, and a
 * player who cannot tell the two props apart cannot tell what walking there would
 * do. It is cheap — a resource sits on well under a tenth of the land.
 *
 * The start exclusion is the whole reason a discovery is worth walking to. Inside
 * a capital's opening rings it would be claimed on turn one by whichever warrior
 * happened to be adjacent, which is a gift; six hexes out it is a decision about
 * where to send a scout. It is measured against the **maximum roster's** starts,
 * exactly as the resource guarantees are (`resources.ts`), because a short
 * roster's starts are a prefix of a full one's — so one map is fair to a duel and
 * to twelve seats without being generated twice.
 *
 * Counts are a *ceiling*, not a promise
 * -------------------------------------
 * `ruinsPerThousandLand` and `villagesPerThousandLand` are budgets counted against
 * the land, and the spacing rule then thins them: a map with room seats all of
 * them, a cramped or heavily-settled one seats what it has room for. That is the
 * honest behaviour and it is `assignOases`'s bargain exactly — the alternative is
 * a pass that keeps searching until it hits a quota and packs the last few in at
 * the spacing floor, which is a clump wearing a budget's clothes.
 */

import {
  DISCOVERY_DATA,
  type DiscoveryKind,
} from './discoveryData';
import type { Hex } from './hex';
import { type GameMap, type Tile, tileHex, wrappedDistance } from './map';
import { type Rng, shuffle } from './rng';
import { RULES } from './rulesData';
import { chooseStartPositions } from './startPositions';
import { isWaterTerrain, moveCost } from './terrainData';

const PLACEMENT = DISCOVERY_DATA.placement;

/** Can a unit ever stand here? The same test `startPositions.ts` candidates on. */
function isSiteCandidate(tile: Tile): boolean {
  if (tile.resource !== undefined) return false;
  return moveCost(tile.terrain, tile.feature, tile.hills) !== null;
}

/** How many land tiles this map has. The budgets' denominator. */
function landCount(map: GameMap): number {
  let land = 0;
  for (const tile of map.tiles) if (!isWaterTerrain(tile.terrain)) land += 1;
  return land;
}

/**
 * Scatters both kinds over the map, in place. Deterministic in `(map, rng)`.
 *
 * One shuffle and two greedy sweeps. The shuffle is the only randomness: it
 * decides *which* legal hexes are considered first, and the sweeps then take
 * whatever still satisfies the spacing. Ruins are swept before villages, which
 * biases nothing — the list they are both walking has already been shuffled — and
 * simply means a map too small for both budgets runs short of villages rather
 * than of both.
 *
 * The spacing is enforced across **both** kinds at once, from one list of what
 * has been placed. Two ruins four hexes apart and a ruin four hexes from a
 * village are the same crowding on the board, and a rule that only kept each kind
 * away from its own would have produced exactly the pairs a player reads as one
 * site.
 */
export function placeDiscoveries(map: GameMap, rng: Rng): void {
  const land = landCount(map);
  if (land === 0) return;

  const starts = chooseStartPositions(map, RULES.game.maxPlayers);
  const startHexes = starts.map((tile) => tileHex(tile));
  const farFromStarts = (tile: Tile): boolean => {
    const hex = tileHex(tile);
    return startHexes.every(
      (start) => wrappedDistance(map, hex, start) >= PLACEMENT.minDistanceFromStart,
    );
  };

  const candidates = map.tiles.filter((tile) => isSiteCandidate(tile) && farFromStarts(tile));
  // Shuffled in place on a fresh array — `filter` already made one, so nothing
  // the generator will read again is reordered.
  shuffle(rng, candidates);

  const placed: Hex[] = [];
  const spacing = PLACEMENT.minDistanceApart;
  const sweep = (kind: DiscoveryKind, budget: number): void => {
    let seated = 0;
    for (const tile of candidates) {
      if (seated >= budget) break;
      if (tile.discovery !== undefined) continue;
      const hex = tileHex(tile);
      if (placed.some((other) => wrappedDistance(map, hex, other) < spacing)) continue;
      tile.discovery = kind;
      placed.push(hex);
      seated += 1;
    }
  };

  const budgetFor = (perThousand: number): number =>
    Math.max(0, Math.round((land / 1000) * perThousand));
  sweep('ruins', budgetFor(PLACEMENT.ruinsPerThousandLand));
  sweep('village', budgetFor(PLACEMENT.villagesPerThousandLand));
}

/**
 * Every tile carrying a discovery, in map order.
 *
 * A pure read for the renderer's fingerprint and for tests. In map order rather
 * than in placement order, for `improvedCells`'s reason: "what is on the board"
 * is a question about the board, and an order that depended on history would make
 * two identical states hash differently.
 */
export function discoveryCells(map: GameMap): { col: number; row: number; kind: DiscoveryKind }[] {
  const out: { col: number; row: number; kind: DiscoveryKind }[] = [];
  for (const tile of map.tiles) {
    if (tile.discovery === undefined) continue;
    out.push({ col: tile.col, row: tile.row, kind: tile.discovery });
  }
  return out;
}
