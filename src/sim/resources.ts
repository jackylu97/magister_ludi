/**
 * Where the resources are: the seeded scatter, and the fairness pass that
 * follows it.
 *
 * The last thing `generateMap` does, and the *only* thing after the rivers that
 * touches the generator's dice. That ordering is load-bearing and is the same
 * promise the rivers milestone made: the resource stream is drawn from `rng`
 * strictly **after** both noise fields and after `traceRivers`, so every tile's
 * terrain, every hill, every feature and every river edge on a given seed is
 * exactly what it was before resources existed. `test/resources.test.ts` holds
 * that still by regenerating a map with the resources stripped and comparing it
 * field by field against a fixture of the pre-resource generator.
 *
 * The scatter
 * -----------
 * A budget, a weighted draw, and a spacing rule:
 *
 *   1. The budget is `countPer1000LandTiles` scaled by the map's *land* count,
 *      so a duel map and a giant map have the same density rather than the same
 *      number. Water resources (fish) are paid for out of the same purse, which
 *      is deliberate: the purse measures "how much stuff is on this map", and a
 *      coastline is part of the map.
 *   2. Each attempt draws a resource by `frequency` weight, then a candidate
 *      tile uniformly from that resource's own candidate list — the tiles whose
 *      terrain, feature and hills all satisfy it (see `resourceData.ts`). Both
 *      draws come from the map `rng`, so both are reproducible.
 *   3. A find that lands within `minSpacing` of an *existing* resource is
 *      thrown away rather than nudged. Rejection sampling keeps the placement a
 *      pure function of the draw sequence; a nudge would make it a function of
 *      the search order too.
 *
 * A find then spreads over `clusterSize` tiles — the seed plus adjacent tiles
 * that satisfy the same constraints — so horses arrive as a herd and gems as a
 * single seam. The spacing rule is checked against every resource tile that is
 * *not* part of the cluster being grown, which is the whole of "clusters are
 * dense inside and sparse outside".
 *
 * Attempts are capped (`attemptsPerResource` × the budget) so a map whose
 * terrain simply cannot hold the budget — an archipelago with eleven land tiles
 * — finishes rather than spinning. Falling short is not an error; it is what a
 * poor map is.
 *
 * The fairness pass
 * -----------------
 * The scatter is fair on average and nobody plays an average. So after it, every
 * *possible* start position — `chooseStartPositions` for the maximum player
 * count, which is a superset of any real game's starts, and is a pure function
 * of the map — is checked for a bonus food resource within `startFoodRadius`,
 * and given one if the scatter missed. It rolls **no dice**: the tile chosen is
 * the nearest legal one, ties by tile index. Two reasons that matters. It keeps
 * the pass reproducible without consuming from the stream, and it means the
 * guarantee does not shift when the scatter above it is retuned.
 *
 * Strategic fairness — "every player can reach iron or horses" — is deliberately
 * *not* attempted here. It is a much stronger claim (it is about distance
 * through terrain, contested ground and expansion, not about one ring of tiles)
 * and the honest way to hold it is the scripted-bot harness of the AI milestone,
 * which can assert it end to end. Map-driven military asymmetry is a feature of
 * this design; a start that cannot feed itself is not.
 */

import type { GameMap, Tile } from './map';
import { mapRange, tileHex, tileIndex, tileNeighbors, wrappedDistance } from './map';
import {
  RESOURCE_IDS,
  type ResourceDef,
  type ResourceId,
  isBonusFood,
  resourceDef,
} from './resourceData';
import { type Rng, nextFloat, nextInt } from './rng';
import { RULES } from './rulesData';
import { chooseStartPositions } from './startPositions';
import { isWaterTerrain } from './terrainData';

/** The `resources` block of `data/mapgen.json`. */
export interface ResourceConfig {
  /** Resource *tiles* to aim for per 1000 land tiles. Clusters count in full. */
  countPer1000LandTiles: number;
  /** Minimum hex distance between two resource tiles of different finds. */
  minSpacing: number;
  /** How far from a start a bonus food must be for the fairness pass to rest. */
  startFoodRadius: number;
  /** Draws allowed per budgeted tile before the scatter gives up. */
  attemptsPerResource: number;
}

/** Does this tile satisfy a resource's terrain / feature / hills filters? */
export function tileSuitsResource(tile: Tile, def: ResourceDef): boolean {
  if (!def.validTerrain.includes(tile.terrain)) return false;
  if (def.validFeatures && !def.validFeatures.includes(tile.feature)) return false;
  if (def.hills !== undefined && tile.hills !== def.hills) return false;
  return true;
}

/** How many land tiles a map has. The scatter's budget is scaled by this. */
export function landTileCount(map: GameMap): number {
  let land = 0;
  for (const tile of map.tiles) if (!isWaterTerrain(tile.terrain)) land++;
  return land;
}

/**
 * Every tile with a resource within `radius` of `tile`, the tile itself
 * included, ignoring any tile in `exempt`.
 *
 * `exempt` is what makes a cluster legal: the tiles of the find currently being
 * grown are not obstacles to their own siblings.
 */
function hasResourceNear(
  map: GameMap,
  tile: Tile,
  radius: number,
  exempt: ReadonlySet<number>,
): boolean {
  for (const near of mapRange(map, tileHex(tile), radius)) {
    if (near.resource === undefined) continue;
    if (exempt.has(tileIndex(map, near.col, near.row))) continue;
    return true;
  }
  return false;
}

/**
 * Grows one find: the seed tile, then adjacent tiles that satisfy the same
 * constraints, up to `size`. Returns how many tiles were actually claimed.
 *
 * Breadth-first from the seed, neighbours taken in tile-index order, so the
 * shape of a cluster is a pure function of the seed and the board — the dice
 * chose *where* and *how big*, and nothing after that is random.
 */
function growCluster(
  map: GameMap,
  seed: Tile,
  id: ResourceId,
  def: ResourceDef,
  size: number,
  spacing: number,
): number {
  const claimed = new Set<number>([tileIndex(map, seed.col, seed.row)]);
  seed.resource = id;
  let placed = 1;

  const frontier: Tile[] = [seed];
  while (placed < size && frontier.length > 0) {
    const from = frontier.shift()!;
    const neighbours = tileNeighbors(map, from).sort(
      (a, b) => tileIndex(map, a.col, a.row) - tileIndex(map, b.col, b.row),
    );
    for (const next of neighbours) {
      if (placed >= size) break;
      if (next.resource !== undefined) continue;
      if (!tileSuitsResource(next, def)) continue;
      // Radius `spacing - 1`: "no two resources within `spacing`" is exactly
      // "nothing in the ball of radius spacing - 1 around me".
      if (hasResourceNear(map, next, spacing - 1, claimed)) continue;
      next.resource = id;
      claimed.add(tileIndex(map, next.col, next.row));
      frontier.push(next);
      placed++;
    }
  }
  return placed;
}

/** Picks a resource id by `frequency` weight. One draw from `rng`. */
function drawResource(rng: Rng, table: readonly ResourceId[], total: number): ResourceId {
  let roll = nextFloat(rng) * total;
  for (const id of table) {
    roll -= resourceDef(id).frequency;
    if (roll < 0) return id;
  }
  // Only reachable through floating-point drift at the very top of the range.
  return table[table.length - 1]!;
}

/**
 * Scatters resources over a generated map, then guarantees every possible start
 * a bonus food. See the module docblock for both halves.
 *
 * Mutates `map.tiles[i].resource` and nothing else. Called by `generateMap`
 * after `computeFreshwater`, and exported so a future "reroll the resources
 * only" tool — and the tests — can run it on its own.
 */
export function placeResources(map: GameMap, rng: Rng, config: ResourceConfig): void {
  const budget = Math.max(
    0,
    Math.round((landTileCount(map) / 1000) * config.countPer1000LandTiles),
  );
  const spacing = Math.max(1, Math.round(config.minSpacing));

  // Candidate lists, built once. In tile-index order, so the uniform draw over
  // one of them is a draw over a list whose order is part of the map.
  const candidates = new Map<ResourceId, Tile[]>();
  for (const id of RESOURCE_IDS) {
    const def = resourceDef(id);
    const list = map.tiles.filter((tile) => tileSuitsResource(tile, def));
    if (list.length > 0) candidates.set(id, list);
  }

  // A resource the map has no room for at all (no jungle: no spices) drops out
  // of the draw entirely rather than eating attempts.
  const table = RESOURCE_IDS.filter((id) => candidates.has(id));
  const totalWeight = table.reduce((sum, id) => sum + resourceDef(id).frequency, 0);

  if (budget > 0 && totalWeight > 0) {
    const maxAttempts = budget * Math.max(1, Math.round(config.attemptsPerResource));
    let placed = 0;
    for (let attempt = 0; attempt < maxAttempts && placed < budget; attempt++) {
      const id = drawResource(rng, table, totalWeight);
      const list = candidates.get(id)!;
      const tile = list[nextInt(rng, 0, list.length)]!;
      if (tile.resource !== undefined) continue;
      if (hasResourceNear(map, tile, spacing - 1, new Set())) continue;

      const def = resourceDef(id);
      const [min, max] = def.clusterSize ?? [1, 1];
      const size = min >= max ? min : nextInt(rng, min, max + 1);
      placed += growCluster(map, tile, id, def, Math.min(size, budget - placed), spacing);
    }
  }

  ensureStartFood(map, config);
}

/**
 * The fairness pass: a bonus food within `startFoodRadius` of every possible
 * start. No dice — see the module docblock.
 */
function ensureStartFood(map: GameMap, config: ResourceConfig): void {
  const radius = Math.max(0, Math.round(config.startFoodRadius));
  const spacing = Math.max(1, Math.round(config.minSpacing));
  const foods = RESOURCE_IDS.filter(isBonusFood);
  if (foods.length === 0) return;

  for (const start of chooseStartPositions(map, RULES.game.maxPlayers)) {
    const near = mapRange(map, tileHex(start), radius);
    if (near.some((tile) => tile.resource !== undefined && isBonusFood(tile.resource))) continue;

    // Nearest first, ties by tile index: the guarantee lands on the tile the
    // city would most likely work, and lands in the same place every time.
    const from = tileHex(start);
    const ordered = near
      .filter((tile) => tile.resource === undefined)
      .map((tile) => ({
        tile,
        distance: wrappedDistance(map, from, tileHex(tile)),
        index: tileIndex(map, tile.col, tile.row),
      }))
      .sort((a, b) => a.distance - b.distance || a.index - b.index);

    /** The first (resource, tile) pair that fits, preferring the spacing rule. */
    const pick = (respectSpacing: boolean): { tile: Tile; id: ResourceId } | null => {
      for (const entry of ordered) {
        if (respectSpacing && hasResourceNear(map, entry.tile, spacing - 1, new Set())) continue;
        for (const id of foods) {
          if (tileSuitsResource(entry.tile, resourceDef(id))) return { tile: entry.tile, id };
        }
      }
      return null;
    };

    // Spacing is an aesthetic rule and the food is a guarantee, so a start
    // hemmed in by other finds gets its wheat anyway.
    const chosen = pick(true) ?? pick(false);
    if (chosen) chosen.tile.resource = chosen.id;
  }
}
