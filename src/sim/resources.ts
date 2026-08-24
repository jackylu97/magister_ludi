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
 * Three passes, and which one a resource goes through is decided by its kind
 * rather than by its rarity. Luxuries are a *geography*: where a kind grows is
 * the whole of what makes it worth trading for. Bonus and strategic resources
 * are facts about soil and rock, and belong to a scatter.
 *
 * The continents
 * --------------
 * Regional character is keyed to **carved continents** (`carveContinents`) —
 * chunks of land of a roughly fixed size, Civ 6's sense of the word, and
 * emphatically not connected landmasses. Keyed to landmasses, a map whose land
 * happened to be one connected mass had *one* region, was dealt *one* hand of
 * luxuries, and read as a single grey average from pole to pole. Every tile
 * belongs to a continent, sea included, so a pearl bed has one too.
 *
 * Each continent is dealt `luxuryKindsPerContinent` kinds, and a kind is
 * confined to `maxContinentsPerLuxury` continents map-wide. The hand gives a
 * coastline its character; the cap makes that character exclusive, which is
 * what will make trading for someone else's silk mean anything.
 *
 * Pass 1: the luxuries, dealt
 * ---------------------------
 * For every continent and every kind in its hand, `luxuryCopiesPerKind` tiles
 * are placed *on that continent*. Directed placement rather than a weighted
 * scatter refused off the wrong ground, which is what this used to be — that
 * shape could only hope a kind turned up somewhere in its region, so a luxury
 * arrived as one lonely hex and half the table never appeared at all. Multiple
 * copies are the point, not a side effect: they feed the settle-on-the-seam
 * rule, silver and gold's `perCopy` signatures, and eventually a trade good
 * worth carrying.
 *
 * Pass 2: bonus, then strategic
 * -----------------------------
 * A budget, a weighted draw, and a spacing rule, once per kind:
 *
 *   1. The budget is `bonusPer1000LandTiles` (or `strategicPer1000LandTiles`)
 *      scaled by the map's *land* count, so a duel map and a giant map have the
 *      same density rather than the same number. Water resources (fish) are
 *      paid for out of the same purse, which is deliberate: the purse measures
 *      "how much stuff is on this map", and a coastline is part of the map. Two
 *      purses rather than one split by frequency weight, because the two answer
 *      different questions — how often a city site has something worth working,
 *      and how scarce iron is — and one purse meant tuning either retuned both.
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
 * The fairness passes
 * -------------------
 * The scatter is fair on average and nobody plays an average. So after it, every
 * *possible* start position — `chooseStartPositions` for the maximum player
 * count — is checked three times: for a bonus food resource within
 * `startFoodRadius`, for `startLuxuryKinds` distinct luxuries within
 * `startLuxuryRadius`, and for one of those kinds standing in a seam of
 * `startLuxuryCopies` tiles. Each gap is filled.
 *
 * The third is Civ 5's region luxury and it answers a specific complaint —
 * "there is nowhere worth settling near my capital". One lonely wine four hexes
 * off is a curiosity; a seam of two is a reason to plant a city on it.
 *
 * That the maximum roster's starts are a superset of any real game's is a
 * promise `startPositions.ts` keeps deliberately: start spacing is scaled to the
 * *map* and never to the player count, so a two-player game's starts are an
 * exact prefix of a twelve-player game's. Nothing here would notice if that
 * changed, which is why it is written down in both places.
 *
 * All three roll **no dice**: the tile chosen is the nearest legal one, ties by
 * tile index, and the luxury chosen prefers the continent's own hand so a
 * guarantee does not flatten the character the deal just built. Two reasons
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
 * Which **landmass** every tile belongs to, indexed by tile index; `-1` for
 * water.
 *
 * Connected components of land over the hex neighbourhood, wrap-aware, seeded
 * in tile-index order so a component's *id* is a fact about the map rather than
 * about the traversal. Rolls nothing.
 *
 * A landmass is no longer the unit regional character is keyed to — that is
 * `carveContinents`, which is built on top of this and splits a supercontinent
 * into several continents. What is left here is the honest primitive: "which
 * ground is walkable from which", which is what the carve needs and what a
 * future landmass-aware rule (an ocean-crossing tech, say) would want.
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
 * Graph distance from a set of source tiles, restricted to `member` tiles.
 *
 * Plain wrap-aware BFS with an index-ordered queue; `-1` for anything the
 * sources cannot reach. Distance *through the land* rather than across it,
 * which is what keeps a carved continent from reaching over a bay.
 */
function bfsDistances(map: GameMap, member: Uint8Array, sources: readonly number[]): Int32Array {
  const distance = new Int32Array(map.tiles.length).fill(-1);
  const queue: number[] = [];
  for (const source of sources) {
    if (distance[source] === -1) {
      distance[source] = 0;
      queue.push(source);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head]!;
    const next = distance[index]! + 1;
    for (const near of tileNeighbors(map, map.tiles[index]!)) {
      const at = tileIndex(map, near.col, near.row);
      if (!member[at] || distance[at] !== -1) continue;
      distance[at] = next;
      queue.push(at);
    }
  }
  return distance;
}

/** Every tile's continent, plus which of them were carved rather than attached. */
export interface ContinentMap {
  /** Continent id per tile index. Every tile has one — water included. */
  of: Int32Array;
  /** How many continents the map has. */
  count: number;
  /** 1 for a land tile that was *carved* into its continent, 0 for the fringe. */
  core: Uint8Array;
}

/**
 * Carves the map's land into continents of a roughly fixed **size**.
 *
 * A continent here is Civ 6's continent and not a landmass: a chunk of ground
 * about `continentTargetTiles` across, so one big supercontinent is several
 * continents and a modest island is one. That is the unit regional character
 * wants. Keyed to landmasses instead, a map whose land happens to be one
 * connected mass had *one* region, was dealt *one* hand, and read as a single
 * grey average from pole to pole — which is the complaint this replaces.
 *
 * Three steps, none of which roll dice:
 *
 *   1. Connected components of land, wrap-aware, in tile-index order.
 *   2. Every component big enough to be worth carving is split into
 *      `round(tiles / target)` pieces: seeds are chosen by farthest-point
 *      sampling (start at the component's lowest tile index, then repeatedly
 *      take the tile furthest *through the land* from every seed so far), and
 *      the pieces are the Voronoi cells of those seeds under the same
 *      through-the-land distance. Farthest-point sampling is what makes the
 *      pieces compact and comparable in size rather than long shreds.
 *   3. Everything left — sea, and islets below `minContinentTiles` — is
 *      attached to whichever carved continent is nearest across open water.
 *      That is what gives a coastal luxury a continent to belong to, and what
 *      keeps a two-hex skerry from being dealt a hand of its own.
 *
 * Each carved cell is connected by construction: a tile is labelled at the
 * moment the BFS first reaches it, so the neighbour that reached it is one step
 * nearer its own seed and carries the same label — follow that chain and you
 * walk home without leaving the continent.
 */
export function carveContinents(map: GameMap, config: ResourceConfig): ContinentMap {
  const target = Math.max(1, Math.round(config.continentTargetTiles));
  const minimum = Math.max(1, Math.round(config.minContinentTiles));
  const of = new Int32Array(map.tiles.length).fill(-1);
  const core = new Uint8Array(map.tiles.length);
  let count = 0;

  const regions = landRegions(map);
  const members = new Map<number, number[]>();
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i]!;
    if (region < 0) continue;
    const list = members.get(region);
    if (list) list.push(i);
    else members.set(region, [i]);
  }
  // Region ids are already assigned in tile-index order, so counting up over
  // them is the map's own order rather than the Map's.
  const regionIds: number[] = [];
  for (let region = 0; region < members.size; region++) if (members.has(region)) regionIds.push(region);

  /** Components too small to carve, kept aside for step 3. */
  const carvable = regionIds.filter((region) => members.get(region)!.length >= minimum);
  // A map of nothing but skerries still has to have continents, so when no
  // component is big enough every component becomes one.
  const toCarve = carvable.length > 0 ? carvable : regionIds;

  for (const region of toCarve) {
    const tiles = members.get(region)!;
    const member = new Uint8Array(map.tiles.length);
    for (const index of tiles) member[index] = 1;
    const pieces = Math.max(1, Math.round(tiles.length / target));

    // Farthest-point sampling. The first seed is the component's lowest tile
    // index — an arbitrary choice, but a *fixed* one, which is all determinism
    // asks of it.
    const seeds: number[] = [tiles[0]!];
    while (seeds.length < pieces) {
      const distance = bfsDistances(map, member, seeds);
      let best = -1;
      let bestDistance = -1;
      for (const index of tiles) {
        if (distance[index]! > bestDistance) {
          bestDistance = distance[index]!;
          best = index;
        }
      }
      if (best < 0 || bestDistance <= 0) break;
      seeds.push(best);
    }

    // The Voronoi cells, as one multi-source BFS with the seeds enqueued in
    // seed order: first touch wins, so ties go to the lower seed.
    const label = new Int32Array(map.tiles.length).fill(-1);
    const queue: number[] = [];
    for (let s = 0; s < seeds.length; s++) {
      label[seeds[s]!] = count + s;
      queue.push(seeds[s]!);
    }
    for (let head = 0; head < queue.length; head++) {
      const index = queue[head]!;
      for (const near of tileNeighbors(map, map.tiles[index]!)) {
        const at = tileIndex(map, near.col, near.row);
        if (!member[at] || label[at] !== -1) continue;
        label[at] = label[index]!;
        queue.push(at);
      }
    }
    for (const index of tiles) {
      of[index] = label[index]!;
      core[index] = 1;
    }
    count += seeds.length;
  }

  // Step 3: the fringe. One multi-source BFS over the *whole* grid from every
  // carved tile at once, so each leftover tile joins the continent it is
  // genuinely nearest to rather than the first one the sweep happened to meet.
  const everywhere = new Uint8Array(map.tiles.length).fill(1);
  const sources: number[] = [];
  for (let i = 0; i < of.length; i++) if (of[i]! >= 0) sources.push(i);
  if (sources.length > 0) {
    const queue = sources.slice();
    for (let head = 0; head < queue.length; head++) {
      const index = queue[head]!;
      for (const near of tileNeighbors(map, map.tiles[index]!)) {
        const at = tileIndex(map, near.col, near.row);
        if (!everywhere[at] || of[at]! >= 0) continue;
        of[at] = of[index]!;
        queue.push(at);
      }
    }
  }
  return { of, count, core };
}

/**
 * The luxury kinds each continent may grow, continent id first.
 *
 * Civ 6's rule, and its point: a continent gets `luxuryKindsPerContinent`
 * kinds, and a *kind* is confined to `maxContinentsPerLuxury` continents across
 * the whole map. Both halves are needed for the thing the design wants, which
 * is that a luxury reads as coming from **somewhere**. The per-continent hand
 * gives a coastline its character; the per-kind cap is what makes that
 * character exclusive, and therefore what makes trading for someone else's
 * silk mean anything.
 *
 * The cap relaxes rather than deadlocks. A map with more continents than the
 * pool can seat at two apiece — the ordinary case on a giant map — raises the
 * cap for every continent, deterministically, to the smallest value that fits;
 * and if a hand still cannot be filled under it, the draw falls back to the
 * *least used* kinds. A generator that threw here would be a generator that
 * refused to make big maps.
 *
 * Each pick is weighted by the row's `frequency`, one continent at a time in
 * continent-id order, so the draws land in a fixed order however the map is
 * shaped. Weighted rather than uniform even though every luxury in the table
 * carries the same frequency today: the field is the one dial a designer has
 * for "this ought to be rarer than that", and a deal that ignored it would be a
 * silently dead number in `resources.json` — the sort of thing that is only
 * ever discovered by someone changing it and watching nothing happen.
 */
export function dealContinentLuxuries(
  rng: Rng,
  continentCount: number,
  config: ResourceConfig,
): ResourceId[][] {
  const luxuries = resourcesOfKind('luxury');
  const hands: ResourceId[][] = [];
  const size = Math.max(0, Math.min(Math.round(config.luxuryKindsPerContinent), luxuries.length));
  if (size === 0 || luxuries.length === 0) {
    for (let i = 0; i < continentCount; i++) hands.push([]);
    return hands;
  }
  // The smallest cap that can seat every continent's hand, never below the
  // configured one. Ceiling division, so it errs generous by less than a kind.
  const demanded = Math.ceil((continentCount * size) / luxuries.length);
  const cap = Math.max(Math.round(config.maxContinentsPerLuxury), demanded);
  const used = new Map<ResourceId, number>();

  for (let continent = 0; continent < continentCount; continent++) {
    const hand: ResourceId[] = [];
    for (let pick = 0; pick < size; pick++) {
      let pool = luxuries.filter((id) => !hand.includes(id) && (used.get(id) ?? 0) < cap);
      if (pool.length === 0) {
        // Every kind is at its cap. Take from the least-used ones, which keeps
        // the spread as even as the map allows instead of piling onto whatever
        // the table lists first.
        const rest = luxuries.filter((id) => !hand.includes(id));
        if (rest.length === 0) break;
        let least = Infinity;
        for (const id of rest) least = Math.min(least, used.get(id) ?? 0);
        pool = rest.filter((id) => (used.get(id) ?? 0) === least);
      }
      const weight = pool.reduce((sum, id) => sum + resourceDef(id).frequency, 0);
      const chosen =
        weight > 0 ? drawResource(rng, pool, weight) : pool[nextInt(rng, 0, pool.length)]!;
      hand.push(chosen);
      used.set(chosen, (used.get(chosen) ?? 0) + 1);
    }
    // Back into table order: a hand is a *set*, and the order it was drawn in
    // would otherwise leak into which luxury a fairness pass reaches for first.
    hands.push(RESOURCE_IDS.filter((id) => hand.includes(id)));
  }
  return hands;
}

/** The `resources` block of `data/mapgen.json`. */
export interface ResourceConfig {
  /**
   * Bonus resource *tiles* per 1000 land tiles. Clusters count in full.
   *
   * The density the "nowhere to settle" complaint is about: a decent city site
   * should see a wheat or a deer without being hunted for. 100 is one bonus per
   * ten land tiles, which is Civ 6's grain.
   */
  bonusPer1000LandTiles: number;
  /** Strategic resource tiles per 1000 land tiles. Deliberately much rarer. */
  strategicPer1000LandTiles: number;
  /** Minimum hex distance between two resource tiles of different finds. */
  minSpacing: number;
  /** How far from a start a bonus food must be for the fairness pass to rest. */
  startFoodRadius: number;
  /** Draws allowed per budgeted tile before a scatter gives up. */
  attemptsPerResource: number;
  /** How far from a start its guaranteed luxuries may be. */
  startLuxuryRadius: number;
  /** How many *distinct* luxury kinds every start is guaranteed. */
  startLuxuryKinds: number;
  /**
   * How many tiles of *one* of those kinds a start is guaranteed. Civ 5's
   * region luxury, which arrives in a small seam rather than as a single hex —
   * one copy is a curiosity, two is a reason to settle here.
   */
  startLuxuryCopies: number;
  /** Land tiles one carved continent aims for. See `carveContinents`. */
  continentTargetTiles: number;
  /** Land a component needs before it is carved rather than attached. */
  minContinentTiles: number;
  /** How many luxury kinds one continent grows. Civ 6's number is 4. */
  luxuryKindsPerContinent: number;
  /** How many continents one luxury kind may appear on. Relaxes; see the docblock. */
  maxContinentsPerLuxury: number;
  /** Tiles of a dealt kind to place on its continent, drawn from this range. */
  luxuryCopiesPerKind: { min: number; max: number };
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
  const spacing = Math.max(1, Math.round(config.minSpacing));
  const land = landTileCount(map);

  // Candidate lists, built once. In tile-index order, so the uniform draw over
  // one of them is a draw over a list whose order is part of the map.
  const candidates = new Map<ResourceId, Tile[]>();
  for (const id of RESOURCE_IDS) {
    const def = resourceDef(id);
    const list = map.tiles.filter((tile) => tileSuitsResource(tile, def));
    if (list.length > 0) candidates.set(id, list);
  }

  /** Places up to `wanted` tiles of one resource from one candidate list. */
  const scatterOne = (id: ResourceId, list: readonly Tile[], wanted: number): number => {
    const def = resourceDef(id);
    let placed = 0;
    const attempts = Math.max(1, Math.round(config.attemptsPerResource)) * Math.max(1, wanted);
    for (let attempt = 0; attempt < attempts && placed < wanted; attempt++) {
      const tile = list[nextInt(rng, 0, list.length)]!;
      if (tile.resource !== undefined) continue;
      if (hasResourceNear(map, tile, spacing - 1, new Set())) continue;
      const [min, max] = def.clusterSize ?? [1, 1];
      const size = min >= max ? min : nextInt(rng, min, max + 1);
      placed += growCluster(map, tile, id, def, Math.min(size, wanted - placed), spacing);
    }
    return placed;
  };

  // --- the continents, and the hands they are dealt -------------------------
  // Carving rolls nothing; dealing is the first draw of the resource stream.
  const continents = carveContinents(map, config);
  const hands = dealContinentLuxuries(rng, continents.count, config);

  // --- pass 1: the luxuries, dealt continent by continent -------------------
  // A directed pass rather than a weighted scatter that is *refused* off the
  // wrong continent, which is what this used to be. The old shape could only
  // ever hope for a kind to turn up somewhere in its region — so a luxury
  // arrived as a lonely hex and half the table never appeared at all. Dealing
  // the copies explicitly is what makes a kind read as a *deposit region*: the
  // seams that feed the settle-on-the-seam rule, silver and gold's per-copy
  // signatures, and eventually a trade good worth carrying.
  const byContinent = new Map<ResourceId, Tile[][]>();
  for (const id of resourcesOfKind('luxury')) {
    const list = candidates.get(id);
    if (!list) continue;
    const split: Tile[][] = Array.from({ length: continents.count }, () => []);
    for (const tile of list) {
      const continent = continents.of[tileIndex(map, tile.col, tile.row)]!;
      if (continent >= 0) split[continent]!.push(tile);
    }
    byContinent.set(id, split);
  }
  const copies = config.luxuryCopiesPerKind;
  const copyMin = Math.max(1, Math.round(copies.min));
  const copyMax = Math.max(copyMin, Math.round(copies.max));
  for (let continent = 0; continent < continents.count; continent++) {
    for (const id of hands[continent] ?? []) {
      // The draw happens whether or not the ground can take it, so a continent
      // whose jade has nowhere to sit does not shift every later draw.
      const wanted = copyMin >= copyMax ? copyMin : nextInt(rng, copyMin, copyMax + 1);
      const list = byContinent.get(id)?.[continent];
      if (!list || list.length === 0) continue;
      scatterOne(id, list, wanted);
    }
  }

  // --- pass 2: bonus, then strategic, each on its own budget ---------------
  // Two budgets rather than one purse split by frequency weight, because the
  // two answer different design questions: how often a city site has something
  // worth working, and how scarce iron is. Tying them together meant tuning one
  // silently retuned the other.
  for (const [kind, per1000] of [
    ['bonus', config.bonusPer1000LandTiles],
    ['strategic', config.strategicPer1000LandTiles],
  ] as const) {
    const budget = Math.max(0, Math.round((land / 1000) * per1000));
    const table = resourcesOfKind(kind).filter((id) => candidates.has(id));
    const totalWeight = table.reduce((sum, id) => sum + resourceDef(id).frequency, 0);
    if (budget <= 0 || totalWeight <= 0) continue;
    const attempts = budget * Math.max(1, Math.round(config.attemptsPerResource));
    let placed = 0;
    for (let attempt = 0; attempt < attempts && placed < budget; attempt++) {
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

  // The two guarantees, over one set of possible starts. Choosing them is the
  // expensive part of this module and the answer cannot change between the two
  // passes — a start is chosen on *ground* (see `startPositions.ts`), and
  // neither pass touches any.
  const starts = chooseStartPositions(map, RULES.game.maxPlayers);
  ensureStartFood(map, starts, config);
  ensureStartLuxuries(map, starts, continents, hands, config);
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
  continents: ContinentMap,
  hands: readonly ResourceId[][],
  config: ResourceConfig,
): void {
  const radius = Math.max(0, Math.round(config.startLuxuryRadius));
  const spacing = Math.max(1, Math.round(config.minSpacing));
  const wanted = Math.max(0, Math.round(config.startLuxuryKinds));
  const wantedCopies = Math.max(1, Math.round(config.startLuxuryCopies));
  const luxuries = RESOURCE_IDS.filter((id) => resourceDef(id).kind === 'luxury');
  if (wanted === 0 || luxuries.length === 0) return;

  for (const start of starts) {
    const from = tileHex(start);
    const near = mapRange(map, from, radius);

    /** How many tiles of each luxury kind stand in reach. */
    const copiesOf = new Map<ResourceId, number>();
    for (const tile of near) {
      if (tile.resource !== undefined && resourceDef(tile.resource).kind === 'luxury') {
        copiesOf.set(tile.resource, (copiesOf.get(tile.resource) ?? 0) + 1);
      }
    }
    const held = new Set<ResourceId>(copiesOf.keys());
    const bestCopies = (): number => Math.max(0, ...copiesOf.values());
    if (held.size >= wanted && bestCopies() >= wantedCopies) continue;

    // The continent's hand first, then the rest of the table, both in table
    // order.
    const continent = continents.of[tileIndex(map, start.col, start.row)]!;
    const hand = continent >= 0 ? (hands[continent] ?? []) : [];
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

    /**
     * The first (luxury, tile) pair that fits, preferring the spacing rule.
     * `wantedKinds` looks for a kind not held yet; otherwise it looks to
     * *deepen* whichever held kind is nearest to the copies floor.
     */
    const pick = (
      respectSpacing: boolean,
      among: readonly ResourceId[],
    ): { tile: Tile; id: ResourceId } | null => {
      for (const id of among) {
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
    const plant = (among: readonly ResourceId[]): boolean => {
      const chosen = pick(true, among) ?? pick(false, among);
      if (!chosen) return false;
      chosen.tile.resource = chosen.id;
      held.add(chosen.id);
      copiesOf.set(chosen.id, (copiesOf.get(chosen.id) ?? 0) + 1);
      // The tile is spoken for now, so the next plant must not offer it again.
      const at = ordered.findIndex((entry) => entry.tile === chosen.tile);
      if (at >= 0) ordered.splice(at, 1);
      return true;
    };

    while (held.size < wanted) {
      if (!plant(preferred.filter((id) => !held.has(id)))) break;
    }

    // Then the seam. Deepening whichever held kind is already deepest is the
    // cheapest way to reach the floor and the one that reads best on the board:
    // a second wine beside the first is a vineyard, a second wine four hexes
    // off is two lonely hexes. Preference order still runs through the
    // continent's hand, so a guarantee cannot import a kind this ground has no
    // business growing.
    let guard = wantedCopies * 2;
    while (bestCopies() < wantedCopies && guard-- > 0) {
      const deepest = preferred
        .filter((id) => held.has(id))
        .sort((a, b) => (copiesOf.get(b) ?? 0) - (copiesOf.get(a) ?? 0));
      // Held kinds first; then anything the ground will take. A start whose
      // two kinds are both coastal has no second wine hex to offer, but it may
      // well have room for a *third* kind twice over — and two of something
      // beats one of everything, which is the whole argument for the floor.
      if (!plant(deepest) && !plant(preferred)) break;
    }
  }
}
