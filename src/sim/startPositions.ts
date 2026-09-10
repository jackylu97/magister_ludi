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
 * Seven hard rejections back the score up, because a weighted sum will always
 * find a way to like somewhere unliveable: how much land the site's own landmass
 * carries at all, the site's own terrain, the share of its rings that is cold or
 * arid, the share that is water, floors on the food and production its rings
 * carry *in total* (all of them, not the scored six — a floor read off a set the
 * score itself ordered would be a floor measuring the weights it exists to
 * backstop), and whether the ground within `startStrategicRadius` could ever
 * seat the strategics every capital is promised.
 *
 * That last one is the odd one out and says so: the other six ask whether a
 * player could *live* here, and it asks whether a promise made elsewhere
 * (`ensureStartStrategics`, `resources.ts`) can be kept here. See
 * `strategicGround`.
 *
 * The landmass floor is the newest and the only one that looks past the two
 * rings: the pangaea ruling (2026-09-03) puts islands off the shelf on every
 * default map, and a lone capital on one is a player with nowhere to expand and
 * nobody to meet. See `StartsConfig.minLandmassShare`.
 *
 * Every weight, both bonuses and all five rejections come from `mapgen.starts`,
 * so "no tundra starts" and "how much is a hill worth" are data edits.
 *
 * The yield is `foldTile` — the *real* evaluator every citizen, every border
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
 * The figures
 * -----------
 * A seat may carry a **leader** (`data/leaders.json`), and a leader's start bias
 * is stage one of three (`docs/flags.md` (cccc), `docs/mapgen.md`, "The leaders'
 * three stages"): extra labelled lines on the same list, one per ground the
 * figure asked for, **soft and capped** by `starts.biasCap` and never a
 * rejection — so every sweep that proves a roster seats legally on every seed
 * still holds. `chooseStartPositionsFor` is the entry that takes a roster;
 * `chooseStartPositions` is the unbiased one, unchanged, and a roster with no
 * figures in it is delegated straight to it so a game without leaders seats
 * exactly where it always did.
 *
 * The import of `cities.ts`, and why it is safe
 * ---------------------------------------------
 * `resources.ts` imports this module and `mapgen.ts` imports that, so a *value*
 * read from `cities.ts` at this module's top level could close a load-time
 * cycle. Nothing here reads one: `foldTile` is a hoisted function
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

import {
  foldTile,
} from './yields/hex';
import { improvementForResource } from './improvementData';
import {
  START_BIAS_KEYS,
  START_WANT_KEYS,
  type LeaderId,
  type StartBias,
  type StartBiasKey,
  type StartWants,
  biasIsEmpty,
  startBiasOf,
  wantCount,
} from './leaderData';
import type { GameMap, Tile } from './map';
import {
  getTile,
  mapNeighbors,
  mapRange,
  tileHex,
  tileIndex,
  tileNeighbors,
  wrappedDistance,
} from './map';
import { type StartsConfig, mapgenFor } from './mapgenData';
import {
  RESOURCE_IDS,
  type ResourceId,
  resourceDef,
  tileSuitsResource,
} from './resourceData';
import { RULES } from './rulesData';
import { isWaterTerrain, isWorkableTerrain, moveCost, type TileYield } from './terrainData';
import { type UnitCategory, type UnitTypeId, unitDef } from './unitData';
import { stacksFreely } from './units';
import { isCoastal, landmassSizes } from './water';

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
  /**
   * True on the lines a **leader's start bias** put here (stage one of the
   * three, `docs/flags.md` (cccc)) — the ground weights and the one clamp line
   * that holds them under `starts.biasCap`.
   *
   * A marker rather than a second list, for rule 5's reason: the total is the
   * fold of *this* list and there is no arithmetic beside it. What the flag buys
   * is a surface that can say why this seat and not another one got this hex —
   * the mapgen page prints exactly these lines under the seat.
   */
  bias?: true;
}

/**
 * One seat, as the chooser needs to see it: who is sitting there, and nothing
 * else.
 *
 * Deliberately not `PlayerSpec`. The chooser is mapgen's and must not depend on
 * the shape of a game config — and the only thing about a seat that can move a
 * start is its figure.
 */
export interface StartSeat {
  leader?: LeaderId;
}

/**
 * How much land each tile's own landmass carries, and how much the largest
 * landmass carries — the two readings `minLandmassShare` compares.
 *
 * Precomputed and handed down for `groundYields`' reason: the sweep asks about
 * every land tile, and a component walk per hex would be a map pass per hex.
 */
export interface LandmassFacts {
  /** Tile index → land tiles on that tile's landmass; 0 on water. */
  size: Int32Array;
  /** The largest landmass on the map, in tiles. The share's denominator. */
  largest: number;
}

/** One walk of the land, answering both halves. */
export function landmassFacts(map: GameMap): LandmassFacts {
  const size = landmassSizes(map);
  let largest = 0;
  for (const tiles of size) if (tiles > largest) largest = tiles;
  return { size, largest };
}

/**
 * Is a landmass of this many tiles somewhere a player may begin?
 *
 * The mainland, **or** big enough on its own — see `StartsConfig`. Written once
 * here rather than inline in the refusal because the sweeps that check the rule
 * ask exactly this question of exactly these two numbers, and a rule restated in
 * a test is a rule that can drift.
 */
export function isHomeLandmass(
  tiles: number,
  facts: LandmassFacts,
  starts: StartsConfig,
): boolean {
  if (tiles <= 0) return false;
  if (starts.minLandmassShare > 0 && tiles >= starts.minLandmassShare * facts.largest) return true;
  return starts.minLandmassTiles > 0 && tiles >= starts.minLandmassTiles;
}

/**
 * Which of the guaranteed strategics each hex could *ever* be armed with —
 * one flag per row of `resources.startStrategics`, set where a hex whose own
 * terrain suits that row stands within `startStrategicRadius`.
 *
 * A **ground** fact, asked before a single resource has been placed, which is
 * what makes it a legal thing for a site rejection to read. Ruled 2026-09-05
 * (`docs/flags.md` note 20): every capital is promised horses and iron within
 * six hexes, and the guarantee that keeps that promise
 * (`ensureStartStrategics`, `resources.ts`) cannot invent a hill. A site with
 * no hill in reach is therefore a site the ruling cannot be honoured on, and
 * refusing it here is the only place the promise can be kept rather than
 * apologised for.
 *
 * Precomputed and handed down for `groundYields`' reason, one scale sharper:
 * the disc of radius six is 127 hexes, the sweep asks about every land tile,
 * and a disc per hex would be a hundred map reads per candidate. What this is
 * instead is one **dilation** per row — a multi-source breadth-first walk out
 * from the legal hexes, stopped at the radius — which is a single pass of the
 * grid however wide the radius is.
 */
export interface StrategicGround {
  /** Row id → flag per tile index: 1 where a legal hex is in reach. */
  reach: Map<ResourceId, Uint8Array>;
  /** The rows asked about, in sheet order. Empty disables the refusal. */
  rows: ResourceId[];
}

/**
 * The dilation. Wrap-aware, and over *every* tile rather than over land only:
 * hex distance is the unit the guarantee is written in (`mapRange`), so a hill
 * across a one-hex strait is in reach exactly as the resource pass will find it.
 */
export function strategicGround(map: GameMap): StrategicGround {
  const config = mapgenFor(map).resources;
  const radius = Math.max(0, Math.round(config.startStrategicRadius));
  const rows = (config.startStrategics ?? []).filter(
    (id) => RESOURCE_IDS.includes(id) && resourceDef(id).kind === 'strategic',
  );
  const reach = new Map<ResourceId, Uint8Array>();
  for (const id of rows) {
    const def = resourceDef(id);
    const flag = new Uint8Array(map.tiles.length);
    // Sources in tile-index order. The walk's outcome is a distance field and
    // so is order-independent, but the queue is index-ordered anyway — the
    // discipline every sweep in this codebase keeps.
    let frontier: Tile[] = [];
    for (const tile of map.tiles) {
      if (!tileSuitsResource(tile, def)) continue;
      flag[tileIndex(map, tile.col, tile.row)] = 1;
      frontier.push(tile);
    }
    for (let step = 0; step < radius && frontier.length > 0; step++) {
      const next: Tile[] = [];
      for (const tile of frontier) {
        for (const neighbour of tileNeighbors(map, tile)) {
          const at = tileIndex(map, neighbour.col, neighbour.row);
          if (flag[at]) continue;
          flag[at] = 1;
          next.push(neighbour);
        }
      }
      frontier = next;
    }
    reach.set(id, flag);
  }
  return { reach, rows };
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
  return map.tiles.map((tile) => foldTile(groundOf(tile)));
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
  landmass?: LandmassFacts,
  arms?: StrategicGround,
  bias?: BiasReading,
): StartSiteScore {
  return scoreSite(map, startsFor(map), tile, ground, landmass, arms, bias);
}

/**
 * A leader's bias, and the ceiling the map holds it under.
 *
 * The two travel together because neither means anything alone: the weights say
 * what this figure wants and `cap` says how much of a site's quality it may
 * spend getting it (`StartsConfig.biasCap`, read off the best *unbiased* site —
 * see `chooseStartPositionsFor`, which is the only thing that can know it).
 */
export interface BiasReading {
  bias: StartBias;
  cap: number;
}

/** What ground one hex carries, in the bias vocabulary. */
function biasKeysOf(tile: Tile): StartBiasKey[] {
  const keys: StartBiasKey[] = [tile.terrain];
  if (tile.feature !== 'none') keys.push(tile.feature);
  if (tile.hills) keys.push('hills');
  if (tile.riverEdges !== 0) keys.push('river');
  return keys;
}

/**
 * A bias, held under `cap` — **bent, not cut**.
 *
 * `cap · b / (cap + |b|)`: near nought it is `b` itself, it approaches the cap
 * and never reaches it, and it is strictly increasing all the way. That last
 * property is the whole reason it is not a clamp, and the reason is measurable:
 * a hard clamp made most of the good ground on a map score *exactly* the cap, so
 * every one of those sites tied and the tie was broken by the unbiased score —
 * which is to say the bias did nothing at all except on the sites it was
 * weakest on. Over twenty-four seeds a clamped Taizong found grassland exactly
 * as often as a seat with nobody in it. A squash keeps the order the weights
 * describe (more river is more river, everywhere) and still spends no more than
 * the ceiling.
 *
 * Symmetric, because a negative weight is lawful: Modu's steppe reads "away from
 * hills", and a bias may cost a site as much as it may earn one.
 */
function softCap(value: number, cap: number): number {
  if (cap <= 0) return 0;
  return (cap * value) / (cap + Math.abs(value));
}

/**
 * The rows a pasture opens, memoised on first use.
 *
 * Asked of the improvement table rather than written out here, so "ground a
 * pasture could stand on" stays one sentence in `improvements.json` and this
 * file keeps its promise to hold no numbers and no lists. Lazy rather than a
 * module constant for the reason the docblock at the top of this file gives
 * about `cities.ts`: nothing here may run at load time.
 */
let PASTURE_ROWS: ResourceId[] | null = null;
function pastureRows(): ResourceId[] {
  if (PASTURE_ROWS === null) {
    PASTURE_ROWS = RESOURCE_IDS.filter((id) => improvementForResource(id) === 'pasture');
  }
  return PASTURE_ROWS;
}

/** Does one hex answer one want? The whole vocabulary, in one switch. */
function hexAnswers(key: keyof StartWants, tile: Tile): boolean {
  switch (key) {
    case 'mountainWithin':
      return tile.terrain === 'mountain';
    case 'riverWithin':
      return tile.riverEdges !== 0;
    case 'riverOrFloodplainWithin':
      return tile.riverEdges !== 0 || tile.feature === 'floodplain';
    case 'grasslandWithin':
      return tile.terrain === 'grassland';
    case 'pastureGroundWithin':
      return pastureRows().some((id) => tileSuitsResource(tile, resourceDef(id)));
  }
}

/**
 * Does this site meet **every** want the figure carries?
 *
 * One hex in reach per want, the site's own included, and the walk stops at the
 * first hex that answers. Read off the *ground* like everything else in this
 * file — a want may not ask about a resource, because resources are planted at
 * the starts afterwards and a want that chased one would be the guarantee
 * chasing itself around the map (see the module docblock).
 */
export function siteMeetsWants(map: GameMap, tile: Tile, wants: StartWants): boolean {
  const from = tileHex(tile);
  for (const key of START_WANT_KEYS) {
    const within = wants[key];
    if (within === undefined) continue;
    const radius = Math.max(0, Math.round(within));
    let found = false;
    for (const near of mapRange(map, from, radius)) {
      if (!hexAnswers(key, near)) continue;
      found = true;
      break;
    }
    if (!found) return false;
  }
  return true;
}

/** "grassland" → "Grassland". The lines are read by a person. */
function biasLabel(key: StartBiasKey): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
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
  landmass?: LandmassFacts,
  arms?: StrategicGround,
  reading?: BiasReading,
): StartSiteScore {
  const yieldAt = (target: Tile): TileYield =>
    ground ? ground[tileIndex(map, target.col, target.row)]! : foldTile(groundOf(target));

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

  // The leader's ground, tallied over the same walk: how much of each thing it
  // asked for stands here, each hex worth the ring it stands in. **Every** hex
  // counts, workable or not — a mountain is not a tile a citizen can be sent to
  // and is exactly what Pachacuti's terraces are written about, so a tally that
  // skipped it would refuse to see the one bias the figure has.
  const tally = reading ? new Map<StartBiasKey, number>() : null;
  const tallyHex = (near: Tile, weight: number): void => {
    if (!tally) return;
    for (const key of biasKeysOf(near)) tally.set(key, (tally.get(key) ?? 0) + weight);
  };
  tallyHex(tile, STARTS.centreWeight);

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
    tallyHex(near, STARTS.ringWeights[ring - 1]!);
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

  // The leader's lines, last, and **soft**: one per thing the figure asked for,
  // then one line that takes back however much of their sum the cap will not
  // allow. The give-back is a line of its own rather than a rescaling of the
  // others because a designer reading the seat's breakdown should see the weight
  // the sheet actually carries beside the ceiling that took it back — and
  // because rule 5's fold is then still the arithmetic, with nothing computed
  // twice.
  if (reading && tally) {
    let biased = 0;
    for (const key of START_BIAS_KEYS) {
      const weight = reading.bias.terrain?.[key];
      if (weight === undefined || weight === 0) continue;
      const found = tally.get(key) ?? 0;
      if (found === 0) continue;
      const value = weight * found;
      biased += value;
      entries.push({ source: biasLabel(key), value, bias: true });
    }
    const held = softCap(biased, reading.cap);
    if (held !== biased) entries.push({ source: 'Bias cap', value: held - biased, bias: true });
  }

  let total = 0;
  for (const entry of entries) total += entry.value;

  // The five hard rejections, in the order a player would say them: what world
  // this is, then where the city stands, then what surrounds it, then whether it
  // can feed and build. The landmass floor is first because it is the only one a
  // better neighbourhood cannot argue with — a perfect site on a twenty-hex
  // island is still a player who has nowhere to go.
  //
  // Two clauses joined by **or**, and the or is the ruling: the mainland, or a
  // landmass simply big enough to live on (`minLandmassShare` /
  // `minLandmassTiles`). Either alone gets one of the two cases wrong — a share
  // refuses the far lobe of a strait-split pangaea, which is a whole country,
  // and a tile floor alone would seat a player on an island the day the belt
  // grew one that size.
  let reject: string | null = null;
  const wanted = STARTS.minLandmassShare > 0 || STARTS.minLandmassTiles > 0;
  const facts = wanted ? (landmass ?? landmassFacts(map)) : undefined;
  if (facts && !isHomeLandmass(facts.size[tileIndex(map, tile.col, tile.row)]!, facts, STARTS)) {
    reject = 'landmass is too small';
  } else if (hostileTerrain.includes(tile.terrain)) reject = `site is ${tile.terrain}`;
  else if (ringTiles > 0 && hostile / ringTiles > STARTS.maxHostileRingShare) {
    reject = 'rings are cold or arid';
  } else if (ringTiles > 0 && water / ringTiles > STARTS.maxWaterRingShare) {
    reject = 'rings are mostly water';
  } else if (ringFood < STARTS.minRingFood) reject = 'not enough food';
  else if (ringProduction < STARTS.minRingProduction) reject = 'not enough production';

  // The seventh, and the only one that is about a *promise* rather than about
  // the ground being liveable: a site with no legal hex for a guaranteed
  // strategic within its radius is a site `ensureStartStrategics` would have to
  // leave unarmed (2026-09-05, `docs/flags.md` note 20). Last, because it is the
  // most expensive question to ask and the cheapest to skip — and lazy, because
  // a caller with no precomputed field is a tool asking about one tile and pays
  // for the dilation only if the site got this far.
  if (reject === null) {
    const field = arms ?? strategicGround(map);
    const at = tileIndex(map, tile.col, tile.row);
    for (const id of field.rows) {
      if (field.reach.get(id)?.[at]) continue;
      reject = `no ground for ${resourceDef(id).name.toLowerCase()}`;
      break;
    }
  }

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
  // One walk of the land for the whole sweep, for `groundYields`' reason: the
  // landmass floor is a map-wide fact and computing it per candidate would be a
  // component pass per hex.
  const landmass = landmassFacts(map);
  // One dilation per guaranteed strategic for the whole sweep, for the same
  // reason `landmassFacts` is hoisted: the refusal is a disc of 127 hexes and
  // computing it per candidate would be a hundred map reads a hex.
  const arms = strategicGround(map);
  const scores = new Map<number, StartSiteScore>();
  const candidates = map.tiles.filter(isStartCandidate);
  for (const tile of candidates) {
    scores.set(
      tileIndex(map, tile.col, tile.row),
      scoreSite(map, STARTS, tile, ground, landmass, arms),
    );
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

/** The best score among the sites this map stands behind. Nought if it has none. */
function bestAccepted(scores: Iterable<StartSiteScore>): number {
  let best = 0;
  for (const score of scores) {
    if (score.reject === null && score.total > best) best = score.total;
  }
  return best;
}

/** The ceiling itself: a share of that best site. One expression, one place. */
function capFrom(STARTS: StartsConfig, best: number): number {
  return Math.max(0, STARTS.biasCap) * best;
}

/**
 * How much a leader's bias may be worth **on this map**, in the score's own
 * units.
 *
 * The same number `chooseStartPositionsFor` clamps with, offered to the surfaces
 * that print a seat's bias lines — the mapgen page says what the cap was, and
 * the sweep that measures the biases asserts against it. It pays for its own
 * pass of the board rather than being handed one, because a caller that wanted
 * it usually has no scores in hand.
 */
export function startBiasCap(map: GameMap): number {
  const STARTS = startsFor(map);
  const ground = groundYields(map);
  const landmass = landmassFacts(map);
  const arms = strategicGround(map);
  let best = 0;
  for (const tile of map.tiles) {
    if (!isStartCandidate(tile)) continue;
    const score = scoreSite(map, STARTS, tile, ground, landmass, arms);
    if (score.reject === null && score.total > best) best = score.total;
  }
  return capFrom(STARTS, best);
}

/**
 * The best remaining site for **one** seat, or `null` when nothing fits.
 *
 * `seat`'s single-chair sibling, and it exists because a biased roster cannot
 * use `seat`: every seat orders the board differently, so there is no one list
 * to sweep. The relaxation is the same rule read one chair at a time — the
 * spacing gives way by one when nothing fits, down to `floor`.
 */
function seatOne(
  map: GameMap,
  ordered: readonly Tile[],
  chosen: readonly Tile[],
  taken: ReadonlySet<number>,
  fromSpacing: number,
  floor: number,
  meets?: Uint8Array,
): Tile | null {
  for (let spacing = Math.max(floor, fromSpacing); spacing >= floor; spacing--) {
    for (const tile of ordered) {
      const at = tileIndex(map, tile.col, tile.row);
      if (taken.has(at)) continue;
      // The wants, when there are any: a filter over the order, never a change
      // to it. The site that comes back is still the best-scoring one the seat
      // could have had — of those that answer what the figure asked for.
      if (meets && meets[at] !== 1) continue;
      const hex = tileHex(tile);
      if (chosen.every((other) => wrappedDistance(map, hex, tileHex(other)) >= spacing)) return tile;
    }
  }
  return null;
}

/**
 * One start per **seat**, each scoring the board its own leader's way.
 *
 * Stage one of the three (`docs/flags.md` (cccc), `docs/leaders.md`): a leader's
 * bias is extra labelled lines on the same score the chooser already sorts —
 * soft, capped by `starts.biasCap`, and **never a rejection**, so every sweep
 * that proves a roster seats legally on every seed still holds.
 *
 * The seating is **per seat**, one chair at a time — the ruling's own shape and
 * the readable one (the mapgen page can say why this seat got this hex) rather
 * than an assignment that maximises the sum. The order is **the seats with the
 * most wants first, ties by roster index**: a figure with hard needs picks
 * before a flexible one, because a need asked from last place is a need asked of
 * what everybody else has left. Nothing else about a figure moves its turn, so
 * the order is a fact about the roster and reads off it.
 *
 * Each chair takes its best-scoring **accepted** site that meets every want it
 * carries; where the map offers none it takes the best-scoring accepted site
 * outright, then a refused one, then gives up the spacing floor. A want is
 * therefore never a rejection and never a guarantee — see `StartBias.wants`.
 *
 * **A roster with no leaders is today's map, exactly.** The unbiased case is
 * delegated to `chooseStartPositions` rather than reimplemented here, so the
 * batch sweep's relaxation cascade (all seats through the accepted sites before
 * any refused one) is the one that runs, and a game without figures is
 * byte-identical to a game from before they existed. The per-seat cascade below
 * differs in exactly that: a seat that cannot be seated at all falls to the
 * refused sites on its own account, because there is no shared ordering left to
 * fall through together.
 */
export function chooseStartPositionsFor(map: GameMap, seats: readonly StartSeat[]): Tile[] {
  const biases = seats.map((seat) => {
    const bias = startBiasOf(seat.leader);
    return biasIsEmpty(bias) ? undefined : bias;
  });
  if (biases.every((bias) => bias === undefined)) {
    return chooseStartPositions(map, seats.length);
  }

  const STARTS = startsFor(map);
  const ground = groundYields(map);
  const landmass = landmassFacts(map);
  const arms = strategicGround(map);
  const candidates = map.tiles.filter(isStartCandidate);

  // The unbiased reading of the whole board, once: it is what a leaderless seat
  // sorts by, and its best accepted site is the number the cap is a share of.
  const plain = new Map<number, StartSiteScore>();
  for (const tile of candidates) {
    plain.set(tileIndex(map, tile.col, tile.row), scoreSite(map, STARTS, tile, ground, landmass, arms));
  }
  const cap = capFrom(STARTS, bestAccepted(plain.values()));

  // Whether a site is *allowed* is the same question for every seat — a bias is
  // a score and never a rejection — so the two pools are built once and only
  // their order changes from chair to chair.
  const rejected = (tile: Tile): boolean =>
    plain.get(tileIndex(map, tile.col, tile.row))!.reject !== null;
  const accepted = candidates.filter((tile) => !rejected(tile));
  const refused = candidates.filter(rejected);
  const spacing = startSpacing(map, STARTS);

  // **The needy choose first.** Seats are served in order of how many wants
  // they carry, ties by roster index — deterministic, and the answer to the one
  // thing the measured soft bias could not fix: Mithridates asking for a river
  // from sixth place is asking for what three river-hungry chairs have already
  // taken. A count is the whole of the order; nothing else about a figure moves
  // its turn.
  const order = seats
    .map((_, index) => index)
    .sort((a, b) => wantCount(biases[b]) - wantCount(biases[a]) || a - b);

  const chosen: Tile[] = [];
  const taken = new Set<number>();
  const seatOf = new Array<Tile | undefined>(seats.length).fill(undefined);
  for (const index of order) {
    const bias = biases[index];
    const scores = new Map<number, number>();
    for (const tile of candidates) {
      const at = tileIndex(map, tile.col, tile.row);
      scores.set(
        at,
        bias === undefined
          ? plain.get(at)!.total
          : scoreSite(map, STARTS, tile, ground, landmass, arms, { bias, cap }).total,
      );
    }
    const byScore = (a: Tile, b: Tile): number => {
      const ia = tileIndex(map, a.col, a.row);
      const ib = tileIndex(map, b.col, b.row);
      return scores.get(ib)! - scores.get(ia)! || ia - ib;
    };
    const wanted = [...accepted].sort(byScore);
    const rest = [...refused].sort(byScore);

    // The wants, asked once over the sites this map stands behind. A field
    // rather than a predicate in the loop because the cascade sweeps the list
    // once per spacing it relaxes to, and the answer cannot change between
    // sweeps — the ground does not move.
    let meets: Uint8Array | undefined;
    const asks = bias?.wants;
    if (asks !== undefined && wantCount(bias) > 0) {
      meets = new Uint8Array(map.tiles.length);
      for (const tile of wanted) {
        if (siteMeetsWants(map, tile, asks)) meets[tileIndex(map, tile.col, tile.row)] = 1;
      }
    }

    // The cascade one chair at a time: what the figure asked for, then the best
    // ground going, then the sites this map does not stand behind, then the
    // floor itself giving way. **The want is the first arm and never the last**,
    // which is the whole of "a hard want with a fallback": a map with no
    // mountain going seats Pachacuti anyway, on the best hex he could have had.
    const pick =
      (meets ? seatOne(map, wanted, chosen, taken, spacing, STARTS.minDistance, meets) : null) ??
      seatOne(map, wanted, chosen, taken, spacing, STARTS.minDistance) ??
      seatOne(map, rest, chosen, taken, spacing, STARTS.minDistance) ??
      seatOne(map, wanted, chosen, taken, spacing, 1) ??
      seatOne(map, rest, chosen, taken, spacing, 1);
    if (!pick) continue;
    chosen.push(pick);
    seatOf[index] = pick;
    taken.add(tileIndex(map, pick.col, pick.row));
  }

  // Back into **roster** order: the seating order is an implementation detail of
  // who was served first, and every caller indexes this by seat. A chair with
  // nothing under it can only happen on a map with fewer standable hexes than
  // players, which is `chooseStartPositions`' own "fewer than count" case, so
  // the prefix is where the list ends — exactly as it does there.
  const seated: Tile[] = [];
  for (const tile of seatOf) {
    if (tile === undefined) break;
    seated.push(tile);
  }
  return seated;
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
    // The uncapped half of the stacking rule, asked of the one predicate that
    // knows it (`stacksFreely`, `units.ts`) rather than restated here. This is a
    // second implementation of the *count* — mapgen has no `GameState` to sweep
    // — so it is precisely the place a cap and a no-cap would drift apart, and
    // the opening kit growing a caravan one day should not be the way anybody
    // finds out.
    if (stacksFreely(category)) return true;
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
