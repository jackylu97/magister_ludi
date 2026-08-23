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
 * Regional character
 * ------------------
 * A world where every luxury is equally likely on every hex is a world where
 * ten luxuries read as one grey average. So before the scatter runs, the map's
 * **land regions** — connected components of land, which is to say continents
 * and islands — are each dealt a hand of `luxuryKindsPerRegion` luxury kinds
 * from the same `rng`, and a luxury find is refused on ground whose region was
 * not dealt it. Bonus and strategic resources are untouched: iron and wheat are
 * facts about geology and soil, and the design's argument for luxuries is
 * exactly that they are *not* evenly spread — that is what will make trading for
 * them mean something.
 *
 * The rejection reuses the scatter's own idiom rather than reweighting the draw:
 * a find that lands somewhere it may not go is thrown away, so placement stays a
 * pure function of the draw sequence.
 *
 * The fairness passes
 * -------------------
 * The scatter is fair on average and nobody plays an average. So after it, every
 * *possible* start position — `chooseStartPositions` for the maximum player
 * count — is checked twice: for a bonus food resource within `startFoodRadius`,
 * and for `startLuxuryKinds` distinct luxuries within `startLuxuryRadius`. Each
 * gap is filled.
 *
 * That the maximum roster's starts are a superset of any real game's is a
 * promise `startPositions.ts` keeps deliberately: start spacing is scaled to the
 * *map* and never to the player count, so a two-player game's starts are an
 * exact prefix of a twelve-player game's. Nothing here would notice if that
 * changed, which is why it is written down in both places.
 *
 * Both passes roll **no dice**: the tile chosen is the nearest legal one, ties by
 * tile index, and the luxury chosen prefers the region's own hand so a guarantee
 * does not flatten the regional character the scatter just built. Two reasons
 * that matters. It keeps the passes reproducible without consuming from the
 * stream, and it means the guarantees do not shift when the scatter above them
 * is retuned.
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
  resourcesOfKind,
} from './resourceData';
import { type Rng, nextFloat, nextInt } from './rng';
import { RULES } from './rulesData';
import { chooseStartPositions } from './startPositions';
import { isWaterTerrain } from './terrainData';

/**
 * Which land region every tile belongs to, indexed by tile index; `-1` for
 * water.
 *
 * Connected components of land over the hex neighbourhood, wrap-aware, seeded
 * in tile-index order so a region's *id* is a fact about the map rather than
 * about the traversal. Rolls nothing.
 */
export function landRegions(map: GameMap): Int32Array {
  const regions = new Int32Array(map.tiles.length).fill(-1);
  let next = 0;
  for (const seed of map.tiles) {
    if (isWaterTerrain(seed.terrain)) continue;
    const seedIndex = tileIndex(map, seed.col, seed.row);
    if (regions[seedIndex] !== -1) continue;
    const id = next++;
    regions[seedIndex] = id;
    const frontier: Tile[] = [seed];
    while (frontier.length > 0) {
      const from = frontier.pop()!;
      for (const near of tileNeighbors(map, from)) {
        if (isWaterTerrain(near.terrain)) continue;
        const index = tileIndex(map, near.col, near.row);
        if (regions[index] !== -1) continue;
        regions[index] = id;
        frontier.push(near);
      }
    }
  }
  return regions;
}

/**
 * The luxury kinds each region may grow, region id first — the hand dealt in
 * the module docblock's "Regional character".
 *
 * A partial Fisher–Yates over the luxury list, one region at a time in region-id
 * order, so the draws land in a fixed order however the map is shaped. A region
 * is dealt at most as many kinds as the table has, which is the whole of what
 * happens on a table with three luxuries in it.
 */
export function drawRegionLuxuries(
  rng: Rng,
  regionCount: number,
  perRegion: number,
): ResourceId[][] {
  const luxuries = resourcesOfKind('luxury');
  const hands: ResourceId[][] = [];
  const size = Math.max(0, Math.min(Math.round(perRegion), luxuries.length));
  for (let region = 0; region < regionCount; region++) {
    const pool = luxuries.slice();
    const hand: ResourceId[] = [];
    for (let pick = 0; pick < size; pick++) {
      const at = nextInt(rng, pick, pool.length);
      const swap = pool[at]!;
      pool[at] = pool[pick]!;
      pool[pick] = swap;
      hand.push(swap);
    }
    // Back into table order: a hand is a *set*, and the order it was drawn in
    // would otherwise leak into which luxury a fairness pass reaches for first.
    hands.push(RESOURCE_IDS.filter((id) => hand.includes(id)));
  }
  return hands;
}

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
  /** How far from a start its guaranteed luxuries may be. */
  startLuxuryRadius: number;
  /** How many *distinct* luxury kinds every start is guaranteed. */
  startLuxuryKinds: number;
  /** How many luxury kinds one land region may grow. See the docblock. */
  luxuryKindsPerRegion: number;
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

  // The regional hands, drawn *before* the scatter and from the same stream.
  const regions = landRegions(map);
  let regionCount = 0;
  for (const region of regions) if (region + 1 > regionCount) regionCount = region + 1;
  const hands = drawRegionLuxuries(rng, regionCount, config.luxuryKindsPerRegion);
  /** May this luxury grow on this tile's continent? Non-luxuries: always. */
  const suitsRegion = (tile: Tile, id: ResourceId): boolean => {
    if (resourceDef(id).kind !== 'luxury') return true;
    const region = regions[tileIndex(map, tile.col, tile.row)]!;
    const hand = region >= 0 ? hands[region] : undefined;
    return hand === undefined || hand.length === 0 || hand.includes(id);
  };

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
      if (!suitsRegion(tile, id)) continue;
      if (hasResourceNear(map, tile, spacing - 1, new Set())) continue;

      const def = resourceDef(id);
      const [min, max] = def.clusterSize ?? [1, 1];
      const size = min >= max ? min : nextInt(rng, min, max + 1);
      placed += growCluster(map, tile, id, def, Math.min(size, budget - placed), spacing);
    }
  }

  // The two guarantees, over one set of possible starts. Choosing them is the
  // expensive part of this module and the answer cannot change between the two
  // passes — a start is chosen on *ground* (see `startPositions.ts`), and
  // neither pass touches any.
  const starts = chooseStartPositions(map, RULES.game.maxPlayers);
  ensureStartFood(map, starts, config);
  ensureStartLuxuries(map, starts, regions, hands, config);
}

/**
 * The fairness pass: a bonus food within `startFoodRadius` of every possible
 * start. No dice — see the module docblock.
 */
function ensureStartFood(
  map: GameMap,
  starts: readonly Tile[],
  config: ResourceConfig,
): void {
  const radius = Math.max(0, Math.round(config.startFoodRadius));
  const spacing = Math.max(1, Math.round(config.minSpacing));
  const foods = RESOURCE_IDS.filter(isBonusFood);
  if (foods.length === 0) return;

  for (const start of starts) {
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

/**
 * The second fairness pass: `startLuxuryKinds` *distinct* luxuries within
 * `startLuxuryRadius` of every possible start. No dice — see the module
 * docblock.
 *
 * Distinct is the whole point, and it is the same word the happiness meter uses:
 * a luxury is worth its flat happiness and its signature **once**, however many
 * seams of it an empire owns, so three wine tiles and no second kind is one
 * luxury's worth of opening. Guaranteeing kinds rather than tiles is therefore
 * guaranteeing the thing the player actually receives.
 *
 * The kind planted prefers the region's own hand, and that ordering is the
 * whole of how the guarantee stays out of the regional design's way: a start on
 * a jade-and-furs continent is topped up with jade and furs, not with whatever
 * the table happens to list first. It falls through to the rest of the table
 * only when the region's hand will not grow on any tile in reach — an incense
 * hand on ground with no desert — because a guarantee that quietly does nothing
 * is worse than one that bends.
 */
function ensureStartLuxuries(
  map: GameMap,
  starts: readonly Tile[],
  regions: Int32Array,
  hands: readonly ResourceId[][],
  config: ResourceConfig,
): void {
  const radius = Math.max(0, Math.round(config.startLuxuryRadius));
  const spacing = Math.max(1, Math.round(config.minSpacing));
  const wanted = Math.max(0, Math.round(config.startLuxuryKinds));
  const luxuries = RESOURCE_IDS.filter((id) => resourceDef(id).kind === 'luxury');
  if (wanted === 0 || luxuries.length === 0) return;

  for (const start of starts) {
    const from = tileHex(start);
    const near = mapRange(map, from, radius);

    const held = new Set<ResourceId>();
    for (const tile of near) {
      if (tile.resource !== undefined && resourceDef(tile.resource).kind === 'luxury') {
        held.add(tile.resource);
      }
    }
    if (held.size >= wanted) continue;

    // The region's hand first, then the rest of the table, both in table order.
    const region = regions[tileIndex(map, start.col, start.row)]!;
    const hand = region >= 0 ? (hands[region] ?? []) : [];
    const preferred = [...luxuries.filter((id) => hand.includes(id)),
                       ...luxuries.filter((id) => !hand.includes(id))];

    // Nearest first, ties by tile index, exactly as the food pass orders its
    // candidates: the guarantee lands on a tile the city would plausibly work.
    const ordered = near
      .filter((tile) => tile.resource === undefined)
      .map((tile) => ({
        tile,
        distance: wrappedDistance(map, from, tileHex(tile)),
        index: tileIndex(map, tile.col, tile.row),
      }))
      .sort((a, b) => a.distance - b.distance || a.index - b.index);

    /** The first (luxury, tile) pair that fits, preferring the spacing rule. */
    const pick = (respectSpacing: boolean): { tile: Tile; id: ResourceId } | null => {
      for (const id of preferred) {
        if (held.has(id)) continue;
        const def = resourceDef(id);
        for (const entry of ordered) {
          if (entry.tile.resource !== undefined) continue;
          if (!tileSuitsResource(entry.tile, def)) continue;
          if (respectSpacing && hasResourceNear(map, entry.tile, spacing - 1, new Set())) continue;
          return { tile: entry.tile, id };
        }
      }
      return null;
    };

    // Spacing is an aesthetic rule and the second luxury is a guarantee, so a
    // start hemmed in by other finds gets its seam anyway — the same bargain
    // the food pass strikes one guarantee earlier, and the reason both passes
    // are named as the *documented exception* to the scatter's spacing rule.
    // What neither pass will do is invent ground: a start ringed by flat
    // featureless grassland can host exactly one luxury in the whole table, and
    // one is what it gets.
    while (held.size < wanted) {
      const chosen = pick(true) ?? pick(false);
      if (!chosen) break;
      chosen.tile.resource = chosen.id;
      held.add(chosen.id);
    }
  }
}
