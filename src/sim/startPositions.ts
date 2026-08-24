/**
 * Where each player begins.
 *
 * Deterministic in the map alone — no dice. Two players who load the same seed
 * get the same starts, and a replay does not have to log them.
 *
 * Scoring
 * -------
 * A candidate is any passable land tile, and it is scored as a **site** rather
 * than as a tile: what a city planted here would have to work. The score is the
 * site's own ground yield plus the best `workedTiles` of the workable tiles in
 * rings 1 and 2 — each weighted by the ring it stands in — plus the two site
 * bonuses the settler lens already paints on the board: fresh water (the growth
 * bonus) and coast (the authority discount), design ledger Entry I.b.
 *
 * The *best six* rather than all eighteen, and that is the one number here worth
 * arguing about. A city works its best tiles first and grows into the rest over
 * an age, so a sum over the whole neighbourhood rewards a hex ringed by eleven
 * mediocre hills over one with six excellent tiles — which is not the site a
 * player would pick, and, measurably, not the site the citizen assigner then
 * makes anything of. Scoring what will be worked put the opening capital's
 * production back where the pacing tests had measured it.
 *
 * Five hard rejections back the score up, because a weighted sum will always
 * find a way to like somewhere unliveable: the site's own terrain, the share of
 * its rings that is cold or arid, the share that is water, and floors on the
 * food and production its rings carry *in total* (all of them, not the scored
 * six — a floor read off a set the score itself ordered would be a floor
 * measuring the weights it exists to backstop).
 *
 * Every weight, both bonuses and all five rejections come from `mapgen.starts`,
 * so "no tundra starts" and "how much is a hill worth" are data edits.
 *
 * The yield is `tileYieldOf` — the *real* evaluator every citizen, every border
 * expansion and every hover card reads — and not a second table of terrain
 * desirabilities beside it. That is rule 5's argument applied one step further
 * out: a start chooser with its own opinion of what grassland is worth is a
 * chooser that can disagree with the game about which start was better.
 *
 * The ground, not the map
 * ----------------------
 * It asks that evaluator about a **ground view** of each tile — the same tile
 * with its resource and its improvement stripped off. Two reasons, and both are
 * load-bearing rather than tidy:
 *
 *   1. The resource fairness passes (`resources.ts`) plant food and luxuries
 *      *at* the starts, so they have to know the starts before they run. If a
 *      wheat could change which tile scores highest, the pass would guarantee
 *      its wheat to a site that then stops being a start — the guarantee would
 *      chase itself around the map.
 *   2. `Tile.improvement` changes during play (see CLAUDE.md's traps). A start
 *      chooser that read improvements would answer differently on turn 40 than
 *      it did on turn 1, and `chooseStartPositions` is called by tools and
 *      tests that assume it does not.
 *
 * So the map generator picks the ground, and the fairness passes then furnish
 * it. Resources are guaranteed *to* a start, never the reason for one.
 *
 * Spreading
 * ---------
 * Picks are greedy: take the best remaining site, then the best site at least
 * `spacing` hexes (wrap-aware) from every site already taken. `spacing` is
 * `spacingFactor · sqrt(land tiles)`, clamped — **a property of the map and
 * never of the player count**. That is what makes a two-player game's starts an
 * exact prefix of a twelve-player game's, which is in turn what lets the
 * resource fairness passes seat the maximum roster once and cover every real
 * game (see `ensureStartFood`).
 *
 * When no site satisfies the spacing the requirement drops by one and the sweep
 * repeats, down to a floor of 1; when the *accepted* sites run out entirely the
 * refused ones are swept the same way, best first. A duel map with twelve
 * players therefore still seats everyone — badly, but everyone — instead of
 * throwing, and a map made entirely of tundra seats them on tundra rather than
 * nowhere.
 *
 * Ties are broken by tile index, so the result is a pure function of the map.
 *
 * The import of `cities.ts`, and why it is safe
 * ---------------------------------------------
 * `resources.ts` imports this module and `mapgen.ts` imports that, so a *value*
 * read from `cities.ts` at this module's top level could close a load-time
 * cycle. Nothing here reads one: `tileYieldOf` is a hoisted function
 * declaration, called only from inside the functions below, by which time every
 * module is evaluated. Nothing in this file may grow a top-level call into
 * `cities.ts`.
 *
 * Placement
 * ---------
 * `planStartingUnits` seats the roster from `rules.startingUnits` on the start
 * tile, falling back to neighbouring tiles for any unit whose category is
 * already taken there. It tracks occupancy across *all* players, because a
 * relaxed spacing can put two starts within a hex of each other.
 */

import { tileYieldOf } from './cities';
import type { GameMap, Tile } from './map';
import { getTile, mapNeighbors, mapRange, tileHex, tileIndex, wrappedDistance } from './map';
import { type StartsConfig, mapgenFor } from './mapgenData';
import { RULES } from './rulesData';
import { isWaterTerrain, isWorkableTerrain, moveCost, type TileYield } from './terrainData';
import { type UnitCategory, type UnitTypeId, unitDef } from './unitData';
import { isCoastal } from './water';

/**
 * The start tunables **for this map**, not for the process.
 *
 * This was a module-level `const STARTS = MAPGEN_CONFIG.starts` until maps
 * could be generated with an override sheet, and the constant was the exact
 * shape of the bug that seam exists to prevent: a map carved with
 * `minRingFood: 24` would then have had its seats chosen against the JSON's 16,
 * so the world and the starts on it would have disagreed about which numbers
 * made them. The map remembers what generated it; every entry point below asks
 * it once and passes the answer down.
 */
function startsFor(map: GameMap): StartsConfig {
  return mapgenFor(map).starts;
}

export interface StartPlacement {
  /** Index into `GameState.players`, in player order. */
  ownerIndex: number;
  unitType: UnitTypeId;
  col: number;
  row: number;
}

/**
 * One line of why a site scores what it does — the breakdown discipline applied
 * to a decision rather than to a yield.
 *
 * It is not a `TileYieldContribution` and does not pretend to be: these are
 * weighted, dimensionless desirabilities, not food. What they share is the rule
 * that matters — the total is the fold of the list, and there is no second
 * arithmetic anywhere.
 */
export interface StartScoreContribution {
  source: string;
  value: number;
}

/** A scored site: the ledger, its fold, and whether it is allowed at all. */
export interface StartSiteScore {
  entries: StartScoreContribution[];
  total: number;
  /** Why this site is refused outright, or `null` when it is acceptable. */
  reject: string | null;
  /** Workable food in the scored rings. The floor's subject. */
  ringFood: number;
  /** Workable production in the scored rings. The floor's other subject. */
  ringProduction: number;
}

/**
 * A tile as bare ground: no resource, no improvement. See the module docblock
 * for why a start is scored on this rather than on the tile itself.
 *
 * A shallow copy rather than a mutation, because `chooseStartPositions` runs on
 * a live map and a generator that scored by temporarily clearing a wheat would
 * be one interrupted call away from losing it.
 */
function groundOf(tile: Tile): Tile {
  return { ...tile, resource: undefined, improvement: undefined };
}

/** The ground yield of every tile on the map, indexed by tile index. */
function groundYields(map: GameMap): TileYield[] {
  return map.tiles.map((tile) => tileYieldOf(groundOf(tile)));
}

/** What one tile's ground is worth to a site, under the start weights. */
function siteYieldScore(STARTS: StartsConfig, value: TileYield): number {
  return (
    value.food * STARTS.foodWeight +
    value.production * STARTS.productionWeight +
    value.gold * STARTS.goldWeight
  );
}

/** True when a citizen from a city here could ever be sent to this tile. */
function isWorkableSiteTile(tile: Tile): boolean {
  return isWorkableTerrain(tile.terrain);
}

/**
 * Scores one site and decides whether it is allowed.
 *
 * `ground` is the precomputed table when the caller has one (every real caller
 * does — it scores the whole map), and is built for this one tile otherwise, so
 * a tool or a test can ask about a single site without paying for the map.
 */
export function scoreStartSite(
  map: GameMap,
  tile: Tile,
  ground?: readonly TileYield[],
): StartSiteScore {
  return scoreSite(map, startsFor(map), tile, ground);
}

/**
 * The scorer proper, with the tunables already resolved.
 *
 * Split from the exported name for one reason: `chooseStartPositions` calls it
 * once per land tile, and resolving an override sheet four thousand times to
 * get the same object back would be a merge per hex.
 */
function scoreSite(
  map: GameMap,
  STARTS: StartsConfig,
  tile: Tile,
  ground?: readonly TileYield[],
): StartSiteScore {
  const yieldAt = (target: Tile): TileYield =>
    ground ? ground[tileIndex(map, target.col, target.row)]! : tileYieldOf(groundOf(target));

  const entries: StartScoreContribution[] = [];
  entries.push({
    source: 'Site',
    value: siteYieldScore(STARTS, yieldAt(tile)) * STARTS.centreWeight,
  });

  const from = tileHex(tile);
  let ringTiles = 0;
  let hostile = 0;
  let water = 0;
  let ringFood = 0;
  let ringProduction = 0;

  // One walk of the whole neighbourhood. Every workable tile is remembered with
  // the weight of the ring it stands in; how many rings there are is the length
  // of the weight list, so a third ring is a number in `mapgen.json`.
  const hostileTerrain = STARTS.hostileTerrain;
  const rings = STARTS.ringWeights.length;
  const workable: { value: number; index: number }[] = [];
  for (const near of mapRange(map, from, rings)) {
    const ring = wrappedDistance(map, from, tileHex(near));
    if (ring < 1 || ring > rings) continue;
    ringTiles += 1;
    if (isWaterTerrain(near.terrain)) water += 1;
    else if (hostileTerrain.includes(near.terrain)) hostile += 1;
    if (!isWorkableSiteTile(near)) continue;
    const value = yieldAt(near);
    // The floors are read off **every** workable tile in the rings, not off the
    // scored six: they are a promise about what the neighbourhood *can* feed and
    // build over a whole game, and reading them off a set the score itself
    // ordered would make them a function of the weights they exist to backstop.
    ringFood += value.food;
    ringProduction += value.production;
    workable.push({
      value: siteYieldScore(STARTS, value) * STARTS.ringWeights[ring - 1]!,
      index: tileIndex(map, near.col, near.row),
    });
  }

  // The **best `workedTiles` of them**, not all eighteen, and that is the whole
  // difference between a good site and a big one. A city works its best tiles
  // first and grows into the rest over an age; a score that summed the whole
  // neighbourhood rewarded a hex ringed by eleven mediocre hills over one with
  // six excellent tiles, which is not the site a player would pick and — the
  // measurable half — not the site the citizen assigner then makes anything of.
  workable.sort((a, b) => b.value - a.value || a.index - b.index);
  const worked = workable.slice(0, Math.max(1, Math.round(STARTS.workedTiles)));
  let ringScore = 0;
  for (const tile of worked) ringScore += tile.value;
  entries.push({ source: `Best ${worked.length} tiles`, value: ringScore });

  if (tile.freshwater) entries.push({ source: 'Fresh water', value: STARTS.freshwaterBonus });
  if (isCoastal(map, tile)) entries.push({ source: 'Coast', value: STARTS.coastBonus });

  let total = 0;
  for (const entry of entries) total += entry.value;

  // The four hard rejections, in the order a player would say them: where the
  // city stands, then what surrounds it, then whether it can feed and build.
  let reject: string | null = null;
  if (hostileTerrain.includes(tile.terrain)) reject = `site is ${tile.terrain}`;
  else if (ringTiles > 0 && hostile / ringTiles > STARTS.maxHostileRingShare) {
    reject = 'rings are cold or arid';
  } else if (ringTiles > 0 && water / ringTiles > STARTS.maxWaterRingShare) {
    reject = 'rings are mostly water';
  } else if (ringFood < STARTS.minRingFood) reject = 'not enough food';
  else if (ringProduction < STARTS.minRingProduction) reject = 'not enough production';

  return { entries, total, reject, ringFood, ringProduction };
}

/** Desirability of a tile as a start. The fold of `scoreStartSite`'s list. */
export function startScore(map: GameMap, tile: Tile, ground?: readonly TileYield[]): number {
  return scoreStartSite(map, tile, ground).total;
}

function isStartCandidate(tile: Tile): boolean {
  return moveCost(tile.terrain, tile.feature, tile.hills) !== null;
}

/**
 * How far apart starts must be on this map: a multiple of the square root of
 * its land, clamped. A pure function of the map — see the module docblock for
 * why it must not know the player count.
 */
export function startSpacing(map: GameMap, starts: StartsConfig = startsFor(map)): number {
  let land = 0;
  for (const tile of map.tiles) if (!isWaterTerrain(tile.terrain)) land++;
  const raw = Math.round(starts.spacingFactor * Math.sqrt(land));
  return Math.max(starts.minDistance, Math.min(starts.maxDistance, raw));
}

/**
 * Greedy sweep: best first, ties by tile index, relaxing spacing when stuck.
 *
 * `floor` is where the relaxation stops. The two ordinary sweeps stop at
 * `minDistance`, which is what makes that number mean what it says: a *floor*
 * on how close two capitals may be, and not merely the lower clamp on the
 * spacing derived from the map's size. Only the last-resort sweep passes 1, and
 * a map that needs it is a map with nowhere left to stand.
 */
function seat(
  map: GameMap,
  ordered: readonly Tile[],
  chosen: Tile[],
  taken: Set<number>,
  count: number,
  fromSpacing: number,
  floor: number,
): void {
  let spacing = Math.max(floor, fromSpacing);
  while (chosen.length < count && ordered.length > 0) {
    let placedThisSweep = false;
    for (const tile of ordered) {
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
    // Nothing fits at this spacing (or the list simply ran out).
    if (!placedThisSweep) {
      if (spacing <= floor) return;
      spacing -= 1;
    }
  }
}

/**
 * One start tile per player, in player order. Fewer than `count` tiles come back
 * only when the map has fewer passable land tiles than players.
 */
export function chooseStartPositions(map: GameMap, count: number): Tile[] {
  const chosen: Tile[] = [];
  if (count <= 0) return chosen;

  const STARTS = startsFor(map);

  // The whole ranking is computed once, off one pass of ground yields.
  const ground = groundYields(map);
  const scores = new Map<number, StartSiteScore>();
  const candidates = map.tiles.filter(isStartCandidate);
  for (const tile of candidates) {
    scores.set(tileIndex(map, tile.col, tile.row), scoreSite(map, STARTS, tile, ground));
  }
  const byScore = (a: Tile, b: Tile): number => {
    const ia = tileIndex(map, a.col, a.row);
    const ib = tileIndex(map, b.col, b.row);
    return scores.get(ib)!.total - scores.get(ia)!.total || ia - ib;
  };

  const accepted = candidates.filter((t) => scores.get(tileIndex(map, t.col, t.row))!.reject === null);
  accepted.sort(byScore);

  const spacing = startSpacing(map, STARTS);
  const taken = new Set<number>();
  seat(map, accepted, chosen, taken, count, spacing, STARTS.minDistance);

  // Still short: the map cannot honour its own standards, so the refused sites
  // are swept too, best first. A start on snow is a bad start; no start is a
  // crash.
  const refused = candidates.filter(
    (t) => scores.get(tileIndex(map, t.col, t.row))!.reject !== null,
  );
  refused.sort(byScore);
  if (chosen.length < count) {
    seat(map, refused, chosen, taken, count, spacing, STARTS.minDistance);
  }

  // And still short: there is genuinely nowhere left at `minDistance`. Only now
  // does the floor itself give way, accepted sites first — a duel map seating
  // twelve players is the case, and seating them badly beats throwing.
  if (chosen.length < count) {
    seat(map, accepted, chosen, taken, count, spacing, 1);
    if (chosen.length < count) seat(map, refused, chosen, taken, count, spacing, 1);
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
