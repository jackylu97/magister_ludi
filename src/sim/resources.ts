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
 * Grows `seeds` into cells that fill `tiles`, none larger than a **capacity**.
 *
 * A multi-source BFS with a quota, and the quota is the whole difference between
 * this and the plain Voronoi it replaces. Under plain Voronoi the cell sizes are
 * whatever the shape of the coastline hands out: a lobed supercontinent divided
 * between four seeds gave cells of 60 and of 477 on the same map, which made
 * "continent" a word that meant a different amount of ground every time it was
 * used — and a luxury hand dealt to a 60-tile region is four kinds with nowhere
 * to grow while the 477-tile one next door reads as one grey average.
 *
 * With a capacity of `ceil(|tiles| / |seeds|)` no cell can run away, and since
 * every tile is assigned in the end the sizes have to crowd up against that
 * ceiling from below. When a cell is full its frontier simply stops and its
 * neighbours take the ground instead.
 *
 * The relaxation loop is what makes that safe. A cell can be *boxed in* — every
 * route out of an unclaimed pocket may run through cells that are already full —
 * so when a round ends with ground unclaimed the capacity rises by one and the
 * frontier is rebuilt and walked again. The frontier is rebuilt by sweeping the
 * whole member set in tile-index order rather than by remembering where the last
 * round stopped, because a tile whose owner filled up *after* the sweep had
 * passed it would otherwise never be asked again.
 *
 * Each cell is connected by construction: a tile is labelled at the moment a BFS
 * first reaches it, so the neighbour that reached it carries the same label —
 * follow that chain and you walk home without leaving the cell.
 *
 * Rolls nothing. Ties go to the lower tile index throughout.
 */
function growBalancedCells(
  map: GameMap,
  member: Uint8Array,
  tiles: readonly number[],
  seeds: readonly number[],
): { label: Int32Array; sizes: number[] } {
  const label = new Int32Array(map.tiles.length).fill(-1);
  const sizes = new Array<number>(seeds.length).fill(0);
  let capacity = Math.ceil(tiles.length / Math.max(1, seeds.length));
  let queue: number[] = [];
  for (let s = 0; s < seeds.length; s++) {
    label[seeds[s]!] = s;
    sizes[s] = 1;
    queue.push(seeds[s]!);
  }
  let assigned = seeds.length;

  while (assigned < tiles.length) {
    for (let head = 0; head < queue.length; head++) {
      const index = queue[head]!;
      const owner = label[index]!;
      if (sizes[owner]! >= capacity) continue;
      for (const near of tileNeighbors(map, map.tiles[index]!)) {
        const at = tileIndex(map, near.col, near.row);
        if (!member[at] || label[at] !== -1) continue;
        label[at] = owner;
        sizes[owner]! += 1;
        assigned += 1;
        queue.push(at);
        if (sizes[owner]! >= capacity) break;
      }
    }
    if (assigned >= tiles.length) break;
    // Everything that could still grow is full. One more tile each, and the
    // frontier read off the ground rather than off where the last round stopped.
    capacity += 1;
    queue = tiles.filter(
      (index) =>
        label[index]! >= 0 &&
        tileNeighbors(map, map.tiles[index]!).some(
          (near) => member[tileIndex(map, near.col, near.row)] && label[tileIndex(map, near.col, near.row)] === -1,
        ),
    );
    if (queue.length === 0) break;
  }
  return { label, sizes };
}

/**
 * Folds every carved continent below the floor into a neighbour, and renumbers.
 *
 * Merging is the other half of the size band, and it is a much smaller half than
 * the quota: on a sweep of twenty standard maps it has fifteen cells to deal
 * with out of a hundred and eighty-three, every one of them a peninsula tip that
 * a farthest-point seed landed on and a neighbour walled off at the neck.
 *
 * The neighbour chosen is the **smallest** one it shares a land border with,
 * ties by continent id, and the merge is refused when it would push the result
 * past `1.5 · target` — a fold that broke the ceiling would be trading one end of
 * the band for the other. Two connected cells that share a border merge into a
 * connected cell, so contiguity survives.
 *
 * **The documented remainder.** A cell with no land neighbour at all is a whole
 * small landmass, and there is nothing to fold it into that would not require
 * crossing water; a cell whose every neighbour is already near the ceiling has
 * nowhere that fits. Both keep their size and are the band's stated exception.
 * (Land *below* `minContinentTiles` never reaches this function: it was never
 * carved, and is attached across the water as fringe instead.)
 *
 * Ids are compacted afterwards in order of lowest member tile index, so a
 * continent's number stays a fact about the map rather than about how many
 * merges happened before it.
 */
function mergeSmallContinents(
  map: GameMap,
  of: Int32Array,
  core: Uint8Array,
  count: number,
  target: number,
  minimum: number,
): number {
  if (count === 0) return 0;
  const ceiling = Math.round(target * 1.5);

  const sizes = new Int32Array(count);
  for (let i = 0; i < of.length; i++) if (core[i]) sizes[of[i]!]! += 1;

  /** Continents sharing a land border with this one. */
  const neighboursOf = (id: number): number[] => {
    const found = new Set<number>();
    for (let i = 0; i < of.length; i++) {
      if (!core[i] || of[i] !== id) continue;
      for (const near of tileNeighbors(map, map.tiles[i]!)) {
        const at = tileIndex(map, near.col, near.row);
        if (!core[at] || of[at] === id) continue;
        found.add(of[at]!);
      }
    }
    // Sorted, because which neighbour is considered first must be a fact about
    // the map and not about a Set's insertion order.
    return [...found].sort((a, b) => a - b);
  };

  /** The tiles of one continent, in tile-index order. */
  const tilesOf = (id: number): number[] => {
    const list: number[] = [];
    for (let i = 0; i < of.length; i++) if (core[i] && of[i] === id) list.push(i);
    return list;
  };

  /** Cells already known to have nowhere to go, so the loop terminates. */
  const settled = new Set<number>();
  const sizeList = [...sizes];

  /**
   * Cuts one continent into `pieces` balanced cells. `null` when the seeds
   * cannot be spread — a cell of one tile has nowhere to put a second seed.
   */
  const cutInto = (
    tiles: readonly number[],
    pieces: number,
  ): { label: Int32Array; sizes: number[]; seeds: number[] } | null => {
    const member = new Uint8Array(map.tiles.length);
    for (const index of tiles) member[index] = 1;
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
    if (seeds.length < 2) return null;
    const grown = growBalancedCells(map, member, tiles, seeds);
    return { ...grown, seeds };
  };

  /**
   * Folds `small` into `host` and cuts the union up again from fresh seeds.
   *
   * The move that rescues a continent whose only neighbour is too big to simply
   * absorb it. A 91-hex lobe beside a 226-hex continent cannot fold — 317 breaks
   * the ceiling — but the *union* recut in two is two continents of 158, which
   * is two continents in the band where there was one of each end of it.
   *
   * Committed only when it works. A recut that strands a lobe again (the same
   * neck, the same geometry, different seeds) is reverted whole, and the small
   * cell is left alone as the band's documented remainder — churn that ends
   * where it started is worse than an honest exception, and a fold-and-recut
   * that repeats itself is precisely the loop this guard exists to break.
   */
  const tryRefold = (small: number, host: number): boolean => {
    const smallTiles = tilesOf(small);
    const union = [...tilesOf(host), ...smallTiles].sort((a, b) => a - b);
    const pieces = Math.max(2, Math.round(union.length / target));
    const cut = cutInto(union, pieces);
    if (!cut) return false;
    for (const size of cut.sizes) if (size < minimum || size > ceiling) return false;
    const ids = [host, ...cut.seeds.slice(1).map((_, at) => sizeList.length + at)];
    for (const index of union) of[index] = ids[cut.label[index]!]!;
    for (let at = 0; at < ids.length; at++) sizeList[ids[at]!] = cut.sizes[at]!;
    sizeList[small] = 0;
    return true;
  };

  /** Folds every undersized cell into a neighbour. See the docblock. */
  const mergePass = (): void => {
    for (;;) {
      let smallest = -1;
      for (let id = 0; id < sizeList.length; id++) {
        if (sizeList[id]! === 0 || sizeList[id]! >= minimum || settled.has(id)) continue;
        if (smallest < 0 || sizeList[id]! < sizeList[smallest]!) smallest = id;
      }
      if (smallest < 0) break;

      // The smallest neighbour that leaves the result under the ceiling.
      const neighbours = neighboursOf(smallest);
      let into = -1;
      for (const other of neighbours) {
        if (sizeList[smallest]! + sizeList[other]! > ceiling) continue;
        if (into < 0 || sizeList[other]! < sizeList[into]!) into = other;
      }
      if (into >= 0) {
        for (let i = 0; i < of.length; i++) if (core[i] && of[i] === smallest) of[i] = into;
        sizeList[into] = sizeList[into]! + sizeList[smallest]!;
        sizeList[smallest] = 0;
        continue;
      }
      // Nothing it can simply join. Try folding and recutting, smallest
      // neighbour first, and settle for the remainder rule if none of them work.
      const bySize = [...neighbours].sort(
        (a, b) => sizeList[a]! - sizeList[b]! || a - b,
      );
      if (bySize.some((other) => tryRefold(smallest, other))) continue;
      settled.add(smallest);
    }
  };

  /**
   * Cuts every cell over the ceiling back to size. True when it cut anything.
   *
   * The quota in `growBalancedCells` is a ceiling the *relaxation loop* is
   * allowed to lift, so a cell walled in by its neighbours can leave one of them
   * over the top of the band. Rare, and cheap to fix here.
   */
  const splitPass = (): boolean => {
    let cut = false;
    for (let id = 0; id < sizeList.length; id++) {
      if (sizeList[id]! <= ceiling) continue;
      const tiles = tilesOf(id);
      const piece = cutInto(tiles, Math.max(2, Math.round(tiles.length / target)));
      if (!piece) continue;
      const ids = [id, ...piece.seeds.slice(1).map((_, at) => sizeList.length + at)];
      for (const index of tiles) of[index] = ids[piece.label[index]!]!;
      for (let at = 0; at < ids.length; at++) sizeList[ids[at]!] = piece.sizes[at]!;
      cut = true;
    }
    return cut;
  };

  // Merge, then cut back anything the quota's relaxation left oversized, and go
  // round again. The loop always *ends* on a merge with nothing left to split,
  // so the floor gets the last word. The cap is a guard rather than a limit —
  // the sweeps settle in one round.
  for (let round = 0; round < 6; round++) {
    mergePass();
    if (!splitPass()) break;
    settled.clear();
  }

  // Compact the ids, lowest member tile index first.
  const firstAt = new Map<number, number>();
  for (let i = 0; i < of.length; i++) {
    if (!core[i]) continue;
    if (!firstAt.has(of[i]!)) firstAt.set(of[i]!, i);
  }
  const order = [...firstAt.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id);
  const renumbered = new Map<number, number>();
  order.forEach((id, index) => renumbered.set(id, index));
  for (let i = 0; i < of.length; i++) if (core[i]) of[i] = renumbered.get(of[i]!)!;
  return order.length;
}

/**
 * Carves the map's land into continents of a **fixed** size.
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
 *   2. Every component big enough to be worth carving is divided into
 *      `round(tiles / target)` pieces: seeds are chosen by farthest-point
 *      sampling (start at the component's lowest tile index, then repeatedly
 *      take the tile furthest *through the land* from every seed so far), and
 *      the pieces are grown from those seeds under a **size quota** — see
 *      `growBalancedCells`. Farthest-point sampling makes the pieces compact;
 *      the quota makes them the same size.
 *   3. Everything left — sea, and islands below `minContinentTiles` — is
 *      attached to whichever carved continent is nearest across open water.
 *      That is what gives a coastal luxury a continent to belong to, and what
 *      keeps a two-hex skerry from being dealt a hand of its own.
 *
 * Why the sizes hold, in one line of arithmetic
 * ---------------------------------------------
 * A component of `x · target` tiles is cut into `round(x)` pieces of at most
 * `x / round(x) · target` each. That ratio is worst at a half — `x = 1.5-` gives
 * `1.5`, `x = 1.5+` gives `0.75` — and `minContinentTiles` is the floor under
 * `x` itself, so every carved continent lands in
 * `[minContinentTiles, 1.5 · target]`. Setting the floor to `0.6 · target` (which
 * is what `data/mapgen.json` does) makes that band `0.6×–1.5×`, and it is a fact
 * about the arithmetic rather than a hope about the coastline.
 *
 * **The documented remainder.** Land in a component *below* the floor is not a
 * continent at all: it is attached across the water in step 3, so a 30-hex
 * island belongs to the mainland's continent and its jade is that continent's
 * jade. This means the *tiles assigned to* a continent (`of`) can exceed the
 * band while the ground *carved into* it (`core`) never does, and both are
 * right: the band is a statement about the carve, and the attachment is a
 * statement about which coastline a pearl bed trades from. A map with no
 * component over the floor at all — an archipelago world — falls back to one
 * continent per component, because a map still has to have continents.
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

    const { label } = growBalancedCells(map, member, tiles, seeds);
    for (const index of tiles) {
      of[index] = count + label[index]!;
      core[index] = 1;
    }
    count += seeds.length;
  }

  // The one thing the quota cannot fix: a seed stranded at the tip of a
  // peninsula. Farthest-point sampling *seeks out* extremes, which is what makes
  // the cells compact, and the price is that now and then a seed lands past a
  // neck its neighbour reaches first and is walled into eighty hexes. The quota
  // is a ceiling and has nothing to say about it, so the floor is enforced here
  // instead — undersized cells are folded into a neighbour.
  count = mergeSmallContinents(map, of, core, count, target, minimum);

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
  ground: LuxuryGround = OPEN_GROUND,
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

  /**
   * What one kind is worth to *this* continent in the draw.
   *
   * `frequency` — the designer's "this ought to be rarer than that" dial — times
   * **scarcity of host**, which is the rule that makes the exotic half of the
   * table exist at all. A wine can grow on any grassland and will find a home
   * whoever is dealt it; coffee needs jungle, and the two or three continents
   * with jungle on them are the only places coffee can ever come from. Weighting
   * both the same means the jungle continent draws four kinds out of the twenty
   * that suit it and coffee is one ticket in twenty — which is precisely how a
   * third of the luxury table came to be missing from most maps even after every
   * *unhostable* deal was refused. Scaling by `continentCount / hostCount` says
   * the opposite and says it in proportion: a kind only two continents can wear
   * is five times as likely to be worn by one of them on a ten-continent map,
   * and a kind anybody can wear is left at its own frequency.
   */
  const bias = Math.max(0, config.luxuryScarcityBias);
  const weightOf = (id: ResourceId): number => {
    const hosts = Math.max(1, ground.hostCount(id));
    return resourceDef(id).frequency * Math.pow(Math.max(1, continentCount) / hosts, bias);
  };

  for (let continent = 0; continent < continentCount; continent++) {
    const hand: ResourceId[] = [];
    // The kinds this ground can actually wear. A hand that names a luxury the
    // continent has nowhere to put is a hand that deals a blank: the copies are
    // never placed, the kind is absent from the map, and the *character* the
    // hand was supposed to give the coastline is one kind thinner than the
    // ledger claims. Refusing the draw is the whole of the fix — the redraw is
    // deterministic because it is the same weighted draw over a smaller pool.
    const grows = luxuries.filter((id) => ground.canHost(continent, id));
    // Nowhere to grow anything is a real answer on a continent of bare snow.
    if (grows.length === 0) {
      hands.push([]);
      continue;
    }
    for (let pick = 0; pick < size; pick++) {
      let pool = grows.filter((id) => !hand.includes(id) && (used.get(id) ?? 0) < cap);
      if (pool.length === 0) {
        // Every kind this ground can wear is at its cap. Take from the
        // least-used ones, which keeps the spread as even as the map allows
        // instead of piling onto whatever the table lists first. The *ground*
        // filter is never relaxed: a cap is a design preference and a jungle is
        // a fact.
        const rest = grows.filter((id) => !hand.includes(id));
        if (rest.length === 0) break;
        let least = Infinity;
        for (const id of rest) least = Math.min(least, used.get(id) ?? 0);
        pool = rest.filter((id) => (used.get(id) ?? 0) === least);
      }
      const weights = pool.map(weightOf);
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      const chosen =
        total > 0 ? drawWeighted(rng, pool, weights, total) : pool[nextInt(rng, 0, pool.length)]!;
      hand.push(chosen);
      used.set(chosen, (used.get(chosen) ?? 0) + 1);
    }
    // Back into table order: a hand is a *set*, and the order it was drawn in
    // would otherwise leak into which luxury a fairness pass reaches for first.
    hands.push(RESOURCE_IDS.filter((id) => hand.includes(id)));
  }
  return hands;
}

/**
 * Which continents can actually grow which luxuries.
 *
 * The deal's view of the board, and the only thing it is allowed to know about
 * it. Two questions, because the deal asks two: *may this continent be dealt
 * this kind* (can it seat a real seam of it) and *how rare is somewhere that
 * can* (which is what makes the scarce kinds land where they can land).
 */
export interface LuxuryGround {
  /** Can this continent seat `luxuryMinCopiesPerContinent` tiles of this kind? */
  canHost(continent: number, id: ResourceId): boolean;
  /** How many continents can, map-wide. */
  hostCount(id: ResourceId): number;
}

/**
 * The ground a deal with no map in front of it stands on: everything grows
 * everywhere, and nothing is scarce.
 *
 * The default, so `dealContinentLuxuries` remains a function of `(rng, count,
 * config)` that can be reasoned about — and tested — without generating a world.
 * Every real caller passes `luxuryGroundOf`.
 */
const OPEN_GROUND: LuxuryGround = {
  canHost: () => true,
  hostCount: () => 1,
};

/**
 * Reads the board and answers the deal's two questions.
 *
 * `candidates` is the same per-kind list the scatter draws from — the tiles
 * whose terrain, feature and hills all satisfy the row — so "can host" here and
 * "will place" in the pass below are the same sentence asked twice, which is the
 * only way the two can be kept from disagreeing.
 *
 * A continent hosts a kind when it has at least `luxuryMinCopiesPerContinent`
 * candidate tiles on it. The floor is copies rather than one tile because one
 * tile is not a deposit region: a hand's whole job is to give a coastline a
 * character worth settling toward, and a single hex of jade is a curiosity.
 */
export function luxuryGroundOf(
  map: GameMap,
  continents: ContinentMap,
  candidates: ReadonlyMap<ResourceId, Tile[]>,
  config: ResourceConfig,
): LuxuryGround {
  const floor = Math.max(1, Math.round(config.luxuryMinCopiesPerContinent));
  const hosts = new Map<ResourceId, Uint8Array>();
  const counts = new Map<ResourceId, number>();
  for (const id of resourcesOfKind('luxury')) {
    const able = new Uint8Array(continents.count);
    const tally = new Int32Array(continents.count);
    for (const tile of candidates.get(id) ?? []) {
      const continent = continents.of[tileIndex(map, tile.col, tile.row)]!;
      if (continent >= 0) tally[continent]! += 1;
    }
    let total = 0;
    for (let continent = 0; continent < continents.count; continent++) {
      if (tally[continent]! >= floor) {
        able[continent] = 1;
        total += 1;
      }
    }
    hosts.set(id, able);
    counts.set(id, total);
  }
  return {
    canHost: (continent, id) => (hosts.get(id)?.[continent] ?? 0) === 1,
    hostCount: (id) => counts.get(id) ?? 0,
  };
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
  /**
   * What a **water** resource's `frequency` is multiplied by inside the scatter.
   *
   * The sea's own dial, and the reason it is a multiplier here rather than a
   * fourth purse: fish and crabs are dealt out of the *bonus* purse by weight
   * (see the module docblock — "the purse measures how much stuff is on this
   * map, and a coastline is part of the map"), so the honest way to ask for more
   * fishing is to ask for more of the purse to go to the water. A separate sea
   * budget would have to be told how much coastline a map has, and would then
   * disagree with the land purse about what "density" means.
   *
   * 1 is the old behaviour exactly. 1.35 since 2026-08-27 — user: "mapgen needs
   * more bonus and fishing resource to enable wide coastal play" — alongside the
   * purse itself going from 85 to 110 per 1000 land tiles, so a coastal start is
   * about eighty percent better fed than it was.
   *
   * A water resource is one whose every legal terrain is water, asked of
   * `resources.json` rather than of a list of names here, so a seventh sea row
   * inherits it. Only the *scatter* reads it: the luxury deal is per continent
   * and has its own arithmetic, so pearls and whales are unaffected.
   */
  seaFrequencyMultiplier: number;
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
  /**
   * Land a component needs before it is carved rather than attached.
   *
   * Also the **floor of the size band**: the carve's arithmetic puts every
   * carved continent in `[minContinentTiles, 1.5 · continentTargetTiles]`, so
   * this number is what makes the band's lower half true. See `carveContinents`.
   */
  minContinentTiles: number;
  /** How many luxury kinds one continent grows. Civ 6's number is 4. */
  luxuryKindsPerContinent: number;
  /** How many continents one luxury kind may appear on. Relaxes; see the docblock. */
  maxContinentsPerLuxury: number;
  /** Tiles of a dealt kind to place on its continent, drawn from this range. */
  luxuryCopiesPerKind: { min: number; max: number };
  /**
   * Tiles of a kind a continent must be *able* to seat before it is dealt one.
   *
   * The whole of the feature-aware deal: a hand is only worth dealing if the
   * ground can wear it. See `luxuryGroundOf` and `dealContinentLuxuries`.
   */
  luxuryMinCopiesPerContinent: number;
  /**
   * Luxury resource *tiles* per 1000 land tiles — the third budget, beside
   * `bonusPer1000LandTiles` and `strategicPer1000LandTiles`.
   *
   * Not a scatter budget like those two: the luxuries are dealt per continent
   * first and the budget is settled *afterwards* by a trim or a top-up. See
   * `settleLuxuryDensity`.
   */
  luxuryPer1000LandTiles: number;
  /** How far the settled luxury total may sit from its budget, as a fraction. */
  luxuryDensityTolerance: number;
  /**
   * How hard the deal leans toward kinds with few places to grow.
   *
   * The exponent on `continentCount / hostCount` in the deal's weight. 0 is the
   * old behaviour — every kind drawn on `frequency` alone, which left the exotic
   * half of the table absent from most maps because a jungle continent had
   * twenty kinds to choose four from and three of them were the only kinds that
   * needed it. 1 is proportional. Above 1 says a rare host is worth more than
   * its rarity, which is what it takes for coffee to be a thing that exists.
   */
  luxuryScarcityBias: number;
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

/**
 * Is every hex this resource may sit on water?
 *
 * "A sea resource", asked of `resources.json` rather than of a list of names, so
 * a seventh sea row is a data addition. `every` rather than `some` on purpose:
 * a resource that can grow on both would not be the sea's, and there is none.
 */
function isWaterResource(id: ResourceId): boolean {
  return resourceDef(id).validTerrain.every(isWaterTerrain);
}

/**
 * The same draw against an explicit weight per entry. One draw from `rng`.
 *
 * The luxury deal weighs a kind by more than its `frequency` (see
 * `dealContinentLuxuries`), and a second copy of this loop that read the weights
 * off the table would be a second place the draw could drift.
 */
function drawWeighted(
  rng: Rng,
  table: readonly ResourceId[],
  weights: readonly number[],
  total: number,
): ResourceId {
  let roll = nextFloat(rng) * total;
  for (let i = 0; i < table.length; i++) {
    roll -= weights[i]!;
    if (roll < 0) return table[i]!;
  }
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
  // Carving rolls nothing, reading the ground rolls nothing, and choosing the
  // starts rolls nothing — so all three happen before the first draw and none
  // of them can move when the deal below is retuned. Dealing is the first draw
  // of the resource stream.
  const continents = carveContinents(map, config);
  const ground = luxuryGroundOf(map, continents, candidates, config);
  // The maximum roster's starts, which every real game's are a prefix of (see
  // the module docblock). Wanted twice: the density pass must not trim the
  // ground a guarantee is about to stand on, and the two fairness passes at the
  // end work from the same list.
  const starts = chooseStartPositions(map, RULES.game.maxPlayers);
  const hands = dealContinentLuxuries(rng, continents.count, config, ground);

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
    // The sea's thumb on the scale (`seaFrequencyMultiplier`). Weights are built
    // once per kind and handed to `drawWeighted`, which the luxury deal already
    // uses for its own reason — a second copy of the draw loop reading
    // `frequency` off the table would be a second place the draw could drift.
    const weights = table.map(
      (id) => resourceDef(id).frequency * (isWaterResource(id) ? config.seaFrequencyMultiplier : 1),
    );
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (budget <= 0 || totalWeight <= 0) continue;
    const attempts = budget * Math.max(1, Math.round(config.attemptsPerResource));
    let placed = 0;
    for (let attempt = 0; attempt < attempts && placed < budget; attempt++) {
      const id = drawWeighted(rng, table, weights, totalWeight);
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

  // The two guarantees, over the one set of possible starts chosen above. The
  // answer cannot change between the passes — a start is chosen on *ground*
  // (see `startPositions.ts`), and nothing here touches any.
  ensureStartFood(map, starts, config);
  ensureStartLuxuries(map, starts, continents, hands, config);

  // --- pass 4: the luxury budget, settled -----------------------------------
  // The deal decides *what grows where*; this decides *how much of it there is*.
  // Last, and that ordering is the point: the guarantees plant luxuries of their
  // own, so a budget settled before them is a budget the next pass walks out of.
  // Settling afterwards makes the figure on the census the figure that was
  // asked for. Rolls nothing — see `settleLuxuryDensity`.
  settleLuxuryDensity(map, continents, byContinent, starts, land, config);
}

/**
 * Brings the map's luxury total inside its budget, by trimming or topping up.
 *
 * The third budget, and the odd one out. Bonus and strategic resources are
 * *scattered* to a density, so their budget is the loop condition and there is
 * nothing to settle afterwards. Luxuries are **dealt** — a hand per continent,
 * a copy count per kind — and the total that falls out of that is a function of
 * how many continents the coastline happened to make and how many of their
 * kinds found ground. Measured over fifteen standard maps it ran from 65 to 90
 * tiles per 1000 land: a 38% swing in how much of the trading half of the game
 * exists, decided by nothing a designer chose.
 *
 * So the deal keeps its say over *where* and the budget takes its say over *how
 * much*, which is the same division of labour the terrain cuts use one field
 * over — a share fixes how much wood the world has, the field fixes where it is.
 *
 * Rolls no dice, deliberately, and for the reasons the fairness passes below
 * roll none: it keeps the pass reproducible without consuming from the stream,
 * so retuning the budget cannot move a single tile of terrain, and it means this
 * pass does not shift when the deal above it is retuned.
 *
 * What it will not take
 * ---------------------
 * Three protections, in order of how much they matter:
 *
 *   1. **Guarantee ground.** A copy within `startLuxuryRadius` of any possible
 *      start is never trimmed. The start guarantees run *after* this pass and
 *      would simply plant it back, so trimming it is churn at best — and at
 *      worst it is churn that lands the replacement on a worse hex.
 *   2. **The seam floor.** A (continent, kind) group is never cut below
 *      `luxuryMinCopiesPerContinent`. Copies are the point of the deal; a trim
 *      that leaves lonely hexes has undone the thing it was trimming.
 *   3. **Interior first.** Among what is left, the copy with the most
 *      same-kind neighbours goes first — the middle of a seam rather than its
 *      edge, so a vineyard gets smaller instead of getting holes.
 *
 * Ties throughout run to the kind with the most copies map-wide and then to the
 * tile index, so the pass is a pure function of the board it is handed.
 */
function settleLuxuryDensity(
  map: GameMap,
  continents: ContinentMap,
  byContinent: ReadonlyMap<ResourceId, Tile[][]>,
  starts: readonly Tile[],
  land: number,
  config: ResourceConfig,
): void {
  const target = Math.max(0, Math.round((land / 1000) * config.luxuryPer1000LandTiles));
  const tolerance = Math.max(0, config.luxuryDensityTolerance);
  const high = Math.ceil(target * (1 + tolerance));
  const low = Math.floor(target * (1 - tolerance));
  const floor = Math.max(1, Math.round(config.luxuryMinCopiesPerContinent));
  const spacing = Math.max(1, Math.round(config.minSpacing));

  /** Every luxury tile on the map, in tile-index order. */
  const placed = (): Tile[] =>
    map.tiles.filter(
      (tile) => tile.resource !== undefined && resourceDef(tile.resource).kind === 'luxury',
    );

  const groupKey = (tile: Tile, id: ResourceId): string =>
    `${continents.of[tileIndex(map, tile.col, tile.row)]}|${id}`;

  // The seam floor first, then the total. A group of one hex is the thing the
  // whole per-continent deal exists to prevent, so it is worth more than being
  // exactly on budget — and it is cheap, because deepening a seam is what the
  // top-up does anyway. `scatterOne` can leave a singleton behind even on ground
  // that passed `canHost`: the spacing rule refuses a tile that fell next to
  // somebody else's find, and a kind dealt late in a continent's hand meets a
  // board the earlier kinds have already taken the room out of.
  deepenThinSeams();
  const total = placed().length;
  if (total > high) trimLuxuries(total - target);
  else if (total < low) topUpLuxuries(target - total);

  /**
   * The free tile a seam should grow onto next, or `undefined` when it cannot.
   *
   * Beside an existing copy first — that is what makes it a seam rather than a
   * second scatter — then anywhere else on the continent the row allows. Tile
   * index order throughout, so it rolls nothing.
   *
   * **The spacing rule is honoured**, and unlike the two fairness passes this one
   * does not get to break it. A guarantee is a promise to a player and outranks
   * an aesthetic; a budget is the aesthetic itself, so a top-up that shouldered
   * its way in beside somebody else's find would be the density pass undoing the
   * very thing it exists to tidy. Same-kind tiles are exempt from the measure,
   * exactly as they are inside `growCluster`: a seam is allowed to touch itself.
   */
  function growthTile(continent: number, id: ResourceId): Tile | undefined {
    const own = new Set<number>();
    for (let i = 0; i < map.tiles.length; i++) {
      if (map.tiles[i]!.resource === id) own.add(i);
    }
    const free = (byContinent.get(id)?.[continent] ?? []).filter(
      (tile) => tile.resource === undefined && !hasResourceNear(map, tile, spacing - 1, own),
    );
    return (
      free.find((tile) => tileNeighbors(map, tile).some((near) => near.resource === id)) ?? free[0]
    );
  }

  /** Brings every group the deal created up to the seam floor, where it can. */
  function deepenThinSeams(): void {
    const groups = new Map<string, { continent: number; id: ResourceId; copies: number }>();
    for (const tile of placed()) {
      const id = tile.resource!;
      const continent = continents.of[tileIndex(map, tile.col, tile.row)]!;
      const key = `${continent}|${id}`;
      const seen = groups.get(key);
      if (seen) seen.copies += 1;
      else groups.set(key, { continent, id, copies: 1 });
    }
    // Continent order, then table order: which thin seam is deepened first must
    // be a fact about the map rather than about a Map's insertion order.
    const order = [...groups.values()].sort(
      (a, b) => a.continent - b.continent || RESOURCE_IDS.indexOf(a.id) - RESOURCE_IDS.indexOf(b.id),
    );
    for (const group of order) {
      while (group.copies < floor) {
        const tile = growthTile(group.continent, group.id);
        if (!tile) break;
        tile.resource = group.id;
        group.copies += 1;
      }
    }
  }

  /** Removes `wanted` copies, worst-protected first. See the docblock. */
  function trimLuxuries(wanted: number): void {
    // The ground the guarantees are about to work on, as a set of tile indices.
    const guarded = new Set<number>();
    const radius = Math.max(0, Math.round(config.startLuxuryRadius));
    for (const start of starts) {
      for (const near of mapRange(map, tileHex(start), radius)) {
        guarded.add(tileIndex(map, near.col, near.row));
      }
    }

    const kindTotals = new Map<ResourceId, number>();
    const groups = new Map<string, number>();
    const all = placed();
    for (const tile of all) {
      const id = tile.resource!;
      kindTotals.set(id, (kindTotals.get(id) ?? 0) + 1);
      const key = groupKey(tile, id);
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }

    const ranked = all
      .filter((tile) => !guarded.has(tileIndex(map, tile.col, tile.row)))
      .map((tile) => ({
        tile,
        index: tileIndex(map, tile.col, tile.row),
        // How deep inside its own seam this copy sits.
        inside: tileNeighbors(map, tile).filter((near) => near.resource === tile.resource).length,
        kindTotal: kindTotals.get(tile.resource!) ?? 0,
      }))
      .sort((a, b) => b.inside - a.inside || b.kindTotal - a.kindTotal || a.index - b.index);

    let removed = 0;
    for (const entry of ranked) {
      if (removed >= wanted) break;
      const id = entry.tile.resource!;
      const key = groupKey(entry.tile, id);
      if ((groups.get(key) ?? 0) <= floor) continue;
      entry.tile.resource = undefined;
      groups.set(key, (groups.get(key) ?? 0) - 1);
      removed += 1;
    }
  }

  /**
   * Adds `wanted` copies, deepening the thinnest seam each time.
   *
   * Only to kinds a continent was *already* dealt and already grows: a top-up
   * that introduced a new kind would be the budget quietly re-dealing the hand,
   * and the hand is the deal's business. Growing the thinnest seam first is the
   * cheapest way to a whole map that reads evenly, and it puts the extra copy
   * beside an existing one — a second wine next to the first is a vineyard, a
   * second wine four hexes off is two lonely hexes.
   */
  function topUpLuxuries(wanted: number): void {
    /** Copies of each (continent, kind) pair that has any. */
    const groups = new Map<string, { continent: number; id: ResourceId; copies: number }>();
    for (const tile of placed()) {
      const id = tile.resource!;
      const continent = continents.of[tileIndex(map, tile.col, tile.row)]!;
      const key = `${continent}|${id}`;
      const seen = groups.get(key);
      if (seen) seen.copies += 1;
      else groups.set(key, { continent, id, copies: 1 });
    }
    // An array, ordered, because iteration order decides where the copies go.
    const order = [...groups.values()].sort(
      (a, b) => a.continent - b.continent || RESOURCE_IDS.indexOf(a.id) - RESOURCE_IDS.indexOf(b.id),
    );
    if (order.length === 0) return;

    for (let added = 0; added < wanted; ) {
      // Thinnest seam first, ties by the order above.
      let best = order[0]!;
      for (const group of order) if (group.copies < best.copies) best = group;

      const pick = growthTile(best.continent, best.id);
      if (!pick) {
        // This seam cannot grow. Take it out of the running; when nothing is
        // left the map simply cannot hold its budget, which is what a poor map
        // is (the same bargain the scatter's attempt cap strikes).
        const at = order.indexOf(best);
        order.splice(at, 1);
        if (order.length === 0) return;
        continue;
      }
      pick.resource = best.id;
      best.copies += 1;
      added += 1;
    }
  }
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
