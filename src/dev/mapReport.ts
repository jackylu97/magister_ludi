/**
 * What a generated map actually dealt: the census, the continents and the
 * starts, as plain data.
 *
 * This is the reading half of the mapgen inspection page (`mapgen.html`), split
 * out from it for the reason every number on that page has to satisfy anyway —
 * it must be *the simulation's own answer*, and a figure computed inside a DOM
 * builder is a figure nobody can test. So the page renders these structures and
 * computes nothing; everything here is a pure function of a `GameState`, and
 * `test/mapReport.test.ts` is what holds it to that.
 *
 * Rule 5's argument, one register out
 * -----------------------------------
 * Nothing below has an opinion of its own. The continents come from
 * `carveContinents`, the land count from `landTileCount`, the ring food and
 * production from `scoreStartSite` — the very evaluator that chose the starts —
 * and the resource kinds from `resourceDef`. A report with its own arithmetic
 * is a report that can quietly disagree with the generator it is auditing,
 * which would make it worse than no report at all.
 *
 * The one place that is *observational* rather than a re-run is the continent
 * luxury hand. `dealContinentLuxuries` draws from the map rng at generation
 * time, so calling it again after the fact would deal a different hand from a
 * generator that has moved on. What a continent grows is therefore read off the
 * ground — the luxuries actually standing on its tiles — which is the stronger
 * statement in any case: it is the hand *as placed*, cap relaxations, refused
 * candidates and all.
 *
 * Where this may be used
 * ----------------------
 * `src/dev/` is harness code: pages and tools that consume the simulation. It
 * imports `src/sim/` freely and is imported by nothing in the game itself, so a
 * cycle is impossible in the direction that matters.
 */

import type { GameMap, Tile } from '../sim/map';
import { mapRange, tileHex, tileIndex, tileNeighbors, wrappedDistance } from '../sim/map';
import { mapgenFor } from '../sim/mapgenData';
import {
  RESOURCE_IDS,
  type ResourceId,
  type ResourceKind,
  resourceDef,
} from '../sim/resourceData';
import {
  START_WANT_KEYS,
  type FurnishEntry,
  type LeaderId,
  type StartWants,
  furnishMatches,
  leaderDef,
  startBiasOf,
} from '../sim/leaderData';
import { carveContinents, landTileCount } from '../sim/resources';
import {
  type StartScoreContribution,
  type StartSeat,
  type StartShortfall,
  planStartPositionsFor,
  landmassFacts,
  scoreStartSite,
  siteMeetsWants,
  startBiasCap,
  strategicGround,
} from '../sim/startPositions';
import type { GameState } from '../sim/state';
import { isWaterTerrain } from '../sim/terrainData';
import { hasFreshWater, isCoastal } from '../sim/water';

/**
 * The resource tunables **for the map being read**, rather than for the
 * process. A map may carry an override sheet (see `GameMap.mapgenOverrides`),
 * and a report that carved its continents at the JSON's `continentTargetTiles`
 * while the generator used the sheet's would be auditing a different world from
 * the one on screen — which is precisely the failure `mapgenFor` exists to make
 * impossible.
 */
function resourcesOf(map: GameMap) {
  return mapgenFor(map).resources;
}

/** The start tunables for the map being read. `resourcesOf`' sibling, same reason. */
function startsOf(map: GameMap) {
  return mapgenFor(map).starts;
}

/**
 * Hexes from one seat to the nearest other, wrap-aware — the (rrrr) figure.
 *
 * `null` for a lone seat: a board with one chair on it has no crowding to
 * report, and a page that printed a dash-shaped nought there would be inventing
 * a rival.
 */
function nearestRivalTo(map: GameMap, seated: readonly Tile[], seat: number): number | null {
  let nearest: number | null = null;
  for (let other = 0; other < seated.length; other++) {
    if (other === seat) continue;
    const apart = wrappedDistance(map, tileHex(seated[seat]!), tileHex(seated[other]!));
    if (nearest === null || apart < nearest) nearest = apart;
  }
  return nearest;
}

/** The three kinds, in the order the sidebar groups them. */
export const RESOURCE_KINDS: readonly ResourceKind[] = ['bonus', 'strategic', 'luxury'];

// --- census -----------------------------------------------------------------

/** One resource's tally: how many tiles on the whole map carry it. */
export interface ResourceCensusRow {
  id: ResourceId;
  name: string;
  kind: ResourceKind;
  /** Tiles carrying this resource. Clusters count in full, as the budget does. */
  tiles: number;
}

/**
 * One kind's tally, plus the density line the generator's own budget is written
 * in — tiles per 1000 **land** tiles, so a duel map and a giant map are directly
 * comparable and can be read against `bonusPer1000LandTiles` and its sibling.
 */
export interface ResourceCensusGroup {
  kind: ResourceKind;
  rows: ResourceCensusRow[];
  tiles: number;
  perThousandLand: number;
}

export interface ResourceCensus {
  landTiles: number;
  /** Every resource tile on the map, across all three kinds. */
  tiles: number;
  groups: ResourceCensusGroup[];
}

/** Tiles per 1000 land tiles, the unit `data/mapgen.json` budgets in. */
function density(tiles: number, landTiles: number): number {
  return landTiles > 0 ? (tiles * 1000) / landTiles : 0;
}

/**
 * Every resource on the map, counted and grouped by kind.
 *
 * Rows are in `RESOURCE_IDS` order — the table's own order, so two maps'
 * censuses line up row for row — and a resource that was never placed is kept
 * with a count of zero. That absence is the single most useful thing on the
 * page: a luxury the deal never reached is invisible in a list that only prints
 * what turned up.
 */
export function resourceCensus(state: GameState): ResourceCensus {
  const { map } = state;
  const counts = new Map<ResourceId, number>();
  for (const tile of map.tiles) {
    const id = tile.resource;
    if (id === undefined) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const landTiles = landTileCount(map);
  let total = 0;
  const groups = RESOURCE_KINDS.map((kind) => {
    const rows: ResourceCensusRow[] = [];
    let tiles = 0;
    for (const id of RESOURCE_IDS) {
      const def = resourceDef(id);
      if (def.kind !== kind) continue;
      const placed = counts.get(id) ?? 0;
      tiles += placed;
      rows.push({ id, name: def.name, kind, tiles: placed });
    }
    total += tiles;
    return { kind, rows, tiles, perThousandLand: density(tiles, landTiles) };
  });

  return { landTiles, tiles: total, groups };
}

// --- continents -------------------------------------------------------------

/** One luxury kind and how many tiles of it stand somewhere. */
export interface LuxuryCount {
  id: ResourceId;
  name: string;
  copies: number;
}

export interface ContinentRow {
  id: number;
  /** Land tiles carved into this continent. The number `continentTargetTiles` aims at. */
  landTiles: number;
  /** Every tile assigned to it, the attached sea included — see `carveContinents`. */
  tiles: number;
  /**
   * Its luxury hand *as placed*: the kinds actually growing on its tiles, each
   * with its copy count. Read off the ground rather than re-dealt; see the
   * module docblock.
   */
  luxuries: LuxuryCount[];
}

export interface ContinentReport {
  count: number;
  rows: ContinentRow[];
}

/**
 * The carved continents, each with its size and the luxuries standing on it.
 *
 * `carveContinents` rolls no dice and is a pure function of the map, so this is
 * the same partition the luxury deal used at generation time — asking for it
 * again is free of the "the rng has moved on" problem the hand itself has.
 */
export function continentReport(state: GameState): ContinentReport {
  const { map } = state;
  const continents = carveContinents(map, resourcesOf(map));
  const rows: ContinentRow[] = [];
  for (let id = 0; id < continents.count; id++) {
    rows.push({ id, landTiles: 0, tiles: 0, luxuries: [] });
  }

  const found = rows.map(() => new Map<ResourceId, number>());
  for (let index = 0; index < map.tiles.length; index++) {
    const id = continents.of[index]!;
    const row = rows[id];
    if (!row) continue;
    const tile = map.tiles[index]!;
    row.tiles += 1;
    if (!isWaterTerrain(tile.terrain)) row.landTiles += 1;
    const resource = tile.resource;
    if (resource === undefined || resourceDef(resource).kind !== 'luxury') continue;
    const tally = found[id]!;
    tally.set(resource, (tally.get(resource) ?? 0) + 1);
  }

  for (let id = 0; id < rows.length; id++) {
    rows[id]!.luxuries = luxuryList(found[id]!);
  }
  return { count: continents.count, rows };
}

/** A tally as a list, in table order — never in the order tiles were swept. */
function luxuryList(tally: ReadonlyMap<ResourceId, number>): LuxuryCount[] {
  const list: LuxuryCount[] = [];
  for (const id of RESOURCE_IDS) {
    const copies = tally.get(id);
    if (copies === undefined) continue;
    list.push({ id, name: resourceDef(id).name, copies });
  }
  return list;
}

// --- starts -----------------------------------------------------------------

export interface StartRow {
  /** Seat index, which is the player id — starts come back in player order. */
  playerId: number;
  /** The seat's name when there is a player in the chair, else `Seat N`. */
  name: string;
  col: number;
  row: number;
  /** Workable food across rings 1–2, straight off `scoreStartSite`. */
  ringFood: number;
  /** Workable production across the same rings. Its sibling floor. */
  ringProduction: number;
  /** The start score's own fold, for ordering one map's seats against each other. */
  score: number;
  /** Why the scorer would have refused this site, or null. A start on a refusal is news. */
  reject: string | null;
  /** Luxury kinds within `startLuxuryRadius` — what the guarantee pass is about. */
  luxuries: LuxuryCount[];
  /**
   * Guaranteed strategics (`resources.startStrategics`) standing within
   * `startStrategicRadius`, and the ones that are not.
   *
   * `missing` empty on every seat **is** the 2026-09-05 ruling, audited: "every
   * capital has both horses and iron within six tiles". Read off the ground
   * rather than reported by the pass, for the continent hand's reason — a copy
   * the guarantee forced and a copy the scatter dealt are the same tile
   * afterwards, and what a player has is what is there. (The count the pass
   * *had* to force is `MapDetail.forcedStrategics`, which only generation can
   * say.)
   */
  strategics: LuxuryCount[];
  strategicsMissing: ResourceId[];
  freshwater: boolean;
  coast: boolean;
  /**
   * Hexes to the nearest other seat, wrap-aware — the one figure the (rrrr)
   * ruling is about, printed so the user can judge example starts by looking at
   * them rather than by trusting a sweep.
   *
   * `null` for a lone seat, which has no rival to be near. A figure under the
   * floor (`starts.minDistance`) is a seat the board let down, and the row says
   * so in the refusal ink beside it — see `StartReport.shortfall`.
   */
  nearestRival: number | null;
  /** The figure in this chair, or absent for a seat under nobody. */
  leader?: LeaderId;
  /** That figure's name, as the page prints it. */
  leaderName?: string;
  /**
   * The **bias lines** of this seat's own score — why this figure got this hex
   * — straight off `scoreStartSite`'s list, cap line and all. Empty for a seat
   * with no figure, which is the same thing as a seat that was scored plainly.
   */
  bias: StartScoreContribution[];
  /**
   * What the furnishing pass promised (`startBias.furnish`) and what is
   * standing there: one row per kind, read off the ground rather than reported
   * by the pass — a copy the pass planted and a copy the scatter dealt are the
   * same tile afterwards.
   */
  furnish: FurnishCount[];
  /**
   * The figure's **hard wants** and whether this hex answers them.
   *
   * A want is a filter over the order rather than a line in the score, so it
   * cannot show up in `bias` — and "no" is the interesting row: it says the map
   * had none going and the seat fell back to the best ground it could get.
   */
  wants: WantCheck[];
}

/** One want a figure carries, and whether its seat's hex answers it. */
export interface WantCheck {
  /** The want as a person reads it: "mountain within 2". */
  label: string;
  met: boolean;
}

/** One furnishing kind, and the resources of it in reach. */
export interface FurnishCount {
  /** The improvement kind the leader's text pays on — `plantation`, `camp`. */
  kind: string;
  /** The rows of that kind standing within `startFurnishRadius`. */
  found: LuxuryCount[];
}

export interface StartReport {
  /** The radius `luxuries` was gathered over, so the page can label the column. */
  luxuryRadius: number;
  /** The radius `strategics` was gathered over. Its sibling. */
  strategicRadius: number;
  /** The radius a leader's furnishing was gathered over. Its sibling again. */
  furnishRadius: number;
  /** Seats missing at least one guaranteed strategic. Zero is the promise kept. */
  seatsMissingStrategics: number;
  /**
   * How much a bias could be worth on this map (`startBiasCap`) — the ceiling
   * the lines under each seat were clamped to. Nought when nobody is seated.
   */
  biasCap: number;
  /**
   * The floor every pair of starts was promised (`starts.minDistance`), so the
   * page can name the number a shortfall fell short of.
   */
  minDistance: number;
  /**
   * The seats the board could not give that floor to, straight off the chooser
   * (`planStartPositionsFor`). Empty is the promise kept, which is every board
   * that is not a dev harness — see `startPositions.ts`' seating ladder.
   */
  shortfall: StartShortfall[];
  rows: StartRow[];
}

/**
 * Where each seat begins and what it can see from there.
 *
 * The sites come from `chooseStartPositions` rather than from the capitals the
 * page may have founded on them, and deliberately: this is a question about the
 * *map*, it is answerable before a single command has been dispatched, and the
 * chooser is a pure function of the ground (see its docblock) so the two agree
 * anyway.
 *
 * The food and production figures are `scoreStartSite`'s own `ringFood` and
 * `ringProduction` — the numbers the two hard floors are read off — so a start
 * that looks thin on this table is thin by the generator's own measure rather
 * than by a second one invented here.
 */
export function startReport(state: GameState, seats: readonly StartSeat[] = []): StartReport {
  const { map } = state;
  const config = resourcesOf(map);
  const radius = Math.max(0, Math.round(config.startLuxuryRadius));
  const armsRadius = Math.max(0, Math.round(config.startStrategicRadius));
  const furnishRadius = Math.max(0, Math.round(config.startFurnishRadius));
  const armsWanted = (config.startStrategics ?? []).filter(
    (id) => RESOURCE_IDS.includes(id) && resourceDef(id).kind === 'strategic',
  );
  // The seats as the chooser sees them: the figures the caller handed over,
  // padded out to the roster with empty chairs. A page that names no figures
  // asks exactly the question it always asked — `chooseStartPositionsFor`
  // delegates a leaderless roster to the unbiased chooser.
  const chairs: StartSeat[] = state.players.map((_, index) => seats[index] ?? {});
  const plan = planStartPositionsFor(map, chairs);
  const seated = plan.starts;
  const anyLeader = chairs.some((chair) => startBiasOf(chair.leader) !== undefined);
  // One walk of the land for the whole table. `scoreStartSite` would otherwise
  // recompute the landmass floor's components — and the strategic dilation —
  // once per seat.
  const landmass = landmassFacts(map);
  const arms = strategicGround(map);
  const cap = anyLeader ? startBiasCap(map) : 0;

  const rows = seated.map((tile, seat) => {
    const leader = chairs[seat]?.leader;
    const bias = startBiasOf(leader);
    // Scored the seat's own way, so the lines under it are the lines that chose
    // it — the cap included.
    const scored = scoreStartSite(
      map,
      tile,
      undefined,
      landmass,
      arms,
      bias === undefined ? undefined : { bias, cap },
    );
    return {
      playerId: seat,
      name: state.players[seat]?.name ?? `Seat ${seat + 1}`,
      col: tile.col,
      row: tile.row,
      ringFood: scored.ringFood,
      ringProduction: scored.ringProduction,
      score: scored.total,
      reject: scored.reject,
      luxuries: luxuriesNear(map, tile, radius),
      strategics: strategicsNear(map, tile, armsRadius, armsWanted),
      strategicsMissing: armsWanted.filter(
        (id) => !mapRange(map, tileHex(tile), armsRadius).some((near) => near.resource === id),
      ),
      freshwater: hasFreshWater(tile),
      coast: isCoastal(map, tile),
      nearestRival: nearestRivalTo(map, seated, seat),
      ...(leader === undefined ? {} : { leader, leaderName: leaderDef(leader).name }),
      bias: scored.entries.filter((entry) => entry.bias === true),
      furnish: furnishNear(map, tile, furnishRadius, bias?.furnish ?? []),
      wants: wantChecks(map, tile, bias?.wants),
    };
  });
  return {
    luxuryRadius: radius,
    strategicRadius: armsRadius,
    furnishRadius,
    seatsMissingStrategics: rows.filter((row) => row.strategicsMissing.length > 0).length,
    biasCap: cap,
    minDistance: startsOf(map).minDistance,
    shortfall: plan.shortfall,
    rows,
  };
}

/**
 * Each want this figure carries, asked of the hex it actually got.
 *
 * The label is the key's own words, split at its capitals and read back —
 * "mountainWithin: 2" reads "mountain within 2", "aridBeside: 3" reads "arid
 * beside 3" — so the page names no want it does not read from the sheet, and a
 * want added to the vocabulary prints itself.
 */
function wantChecks(map: GameMap, tile: Tile, wants: StartWants | undefined): WantCheck[] {
  if (!wants) return [];
  const checks: WantCheck[] = [];
  for (const key of START_WANT_KEYS) {
    const asked = wants[key];
    if (asked === undefined) continue;
    // The last word of the key is its preposition ("within", "beside") and the
    // rest is the ground; both are the sheet's own words.
    const words = key.replace(/([A-Z])/g, (m) => ` ${m.toLowerCase()}`).split(' ');
    const how = words.pop() ?? '';
    checks.push({
      label: `${words.join(' ')} ${how} ${asked}`,
      met: siteMeetsWants(map, tile, { [key]: asked }),
    });
  }
  return checks;
}

/**
 * What is standing in reach of each kind this seat's figure was furnished with.
 *
 * Read off the ground, exactly as the strategics column is and for the same
 * reason: the pass cannot be asked afterwards which copy was its own, and what a
 * player has is what is there.
 */
function furnishNear(
  map: GameMap,
  from: Tile,
  radius: number,
  entries: readonly FurnishEntry[],
): FurnishCount[] {
  return entries.map((entry) => {
    const tally = new Map<ResourceId, number>();
    for (const near of mapRange(map, tileHex(from), radius)) {
      const id = near.resource;
      if (id === undefined || !furnishMatches(entry, id)) continue;
      tally.set(id, (tally.get(id) ?? 0) + 1);
    }
    return { kind: entry, found: luxuryList(tally) };
  });
}

/** Each guaranteed strategic within `radius` of a tile, with its copy count. */
function strategicsNear(
  map: GameMap,
  from: Tile,
  radius: number,
  wanted: readonly ResourceId[],
): LuxuryCount[] {
  const tally = new Map<ResourceId, number>();
  for (const near of mapRange(map, tileHex(from), radius)) {
    const id = near.resource;
    if (id === undefined || !wanted.includes(id)) continue;
    tally.set(id, (tally.get(id) ?? 0) + 1);
  }
  // Sheet order, not table order: the list is the designer's statement of which
  // strategics an opening needs, and the column should read in that order.
  return wanted
    .filter((id) => tally.has(id))
    .map((id) => ({ id, name: resourceDef(id).name, copies: tally.get(id)! }));
}

/** Every luxury kind within `radius` of a tile, with its copy count in that disc. */
function luxuriesNear(map: GameMap, from: Tile, radius: number): LuxuryCount[] {
  const tally = new Map<ResourceId, number>();
  for (const near of mapRange(map, tileHex(from), radius)) {
    const id = near.resource;
    if (id === undefined || resourceDef(id).kind !== 'luxury') continue;
    tally.set(id, (tally.get(id) ?? 0) + 1);
  }
  return luxuryList(tally);
}

// --- the woods --------------------------------------------------------------

/**
 * What the forest actually looks like, in the four numbers the 2026-09-06
 * ruling was written against: how much wood there is, how many separate woods
 * it comes in, how big the biggest one is, and how much of it is *inside* a
 * wood rather than on its edge.
 *
 * The last is the reading that named the complaint. "Forests spawn in huge
 * patches" is not a statement about the share — the share was already 16% of
 * land — it is a statement about a hex whose six neighbours are all trees, and
 * a map made of copses has almost none of those.
 *
 * Observational, like the continent luxury hand and for the same reason: this
 * is the woodland **as it stands**, grain, clearings and the chop of a
 * mid-game map all included. Re-running the pass would answer a different
 * question.
 */
export interface WoodlandReport {
  landTiles: number;
  forestTiles: number;
  /** Forest hexes as a share of land. Not of *eligible* ground — see `forestShare`. */
  share: number;
  /** Connected woods, six-neighbour adjacency, wrap included. */
  patches: number;
  /** Forest hexes per wood. */
  meanPatch: number;
  largestPatch: number;
  /** Forest hexes whose six neighbours are all forest. */
  enclosed: number;
  /** Those as a share of the forest. The "huge patches" reading. */
  enclosedShare: number;
}

export function woodlandReport(state: GameState): WoodlandReport {
  const { map } = state;
  const count = map.tiles.length;
  const wooded = new Uint8Array(count);
  let landTiles = 0;
  let forestTiles = 0;
  for (const tile of map.tiles) {
    if (!isWaterTerrain(tile.terrain)) landTiles += 1;
    if (tile.feature !== 'forest') continue;
    wooded[tileIndex(map, tile.col, tile.row)] = 1;
    forestTiles += 1;
  }

  const seen = new Uint8Array(count);
  let patches = 0;
  let largestPatch = 0;
  for (let i = 0; i < count; i++) {
    if (!wooded[i] || seen[i]) continue;
    patches += 1;
    let size = 0;
    const stack: Tile[] = [map.tiles[i]!];
    seen[i] = 1;
    while (stack.length > 0) {
      const tile = stack.pop()!;
      size += 1;
      for (const neighbour of tileNeighbors(map, tile)) {
        const index = tileIndex(map, neighbour.col, neighbour.row);
        if (!wooded[index] || seen[index]) continue;
        seen[index] = 1;
        stack.push(map.tiles[index]!);
      }
    }
    if (size > largestPatch) largestPatch = size;
  }

  let enclosed = 0;
  for (let i = 0; i < count; i++) {
    if (!wooded[i]) continue;
    const neighbours = tileNeighbors(map, map.tiles[i]!);
    if (neighbours.length < 6) continue;
    if (neighbours.every((n) => wooded[tileIndex(map, n.col, n.row)] === 1)) enclosed += 1;
  }

  return {
    landTiles,
    forestTiles,
    share: landTiles > 0 ? forestTiles / landTiles : 0,
    patches,
    meanPatch: patches > 0 ? forestTiles / patches : 0,
    largestPatch,
    enclosed,
    enclosedShare: forestTiles > 0 ? enclosed / forestTiles : 0,
  };
}

// --- the whole report -------------------------------------------------------

export interface MapReport {
  width: number;
  height: number;
  seed: number;
  sizeName: string;
  census: ResourceCensus;
  continents: ContinentReport;
  starts: StartReport;
  /** The forest's grain — patch count, size and enclosure. See `woodlandReport`. */
  woodland: WoodlandReport;
  /** Continent id per tile index, for the overlay. `carveContinents`'s own array. */
  continentOf: Int32Array;
}

/**
 * Everything the inspection page prints, in one pass.
 *
 * `carveContinents` is the expensive half (several BFS sweeps over the grid) and
 * is run **once** here rather than by each section, which is what keeps
 * regenerating cheap enough to hold the seed key down on.
 */
export function mapReport(state: GameState, seats: readonly StartSeat[] = []): MapReport {
  const { map } = state;
  const continents = carveContinents(map, resourcesOf(map));
  const report = continentReport(state);
  return {
    width: map.width,
    height: map.height,
    seed: map.seed,
    sizeName: map.sizeName,
    census: resourceCensus(state),
    continents: report,
    starts: startReport(state, seats),
    woodland: woodlandReport(state),
    continentOf: continents.of,
  };
}

/** The tile index a report's `continentOf` is read at. Re-exported so the page needs no map maths. */
export function continentAt(map: GameMap, of: Int32Array, col: number, row: number): number {
  return of[tileIndex(map, col, row)] ?? -1;
}
