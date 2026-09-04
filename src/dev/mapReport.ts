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
import { mapRange, tileHex, tileIndex } from '../sim/map';
import { mapgenFor } from '../sim/mapgenData';
import {
  RESOURCE_IDS,
  type ResourceId,
  type ResourceKind,
  resourceDef,
} from '../sim/resourceData';
import { carveContinents, landTileCount } from '../sim/resources';
import { chooseStartPositions, landmassFacts, scoreStartSite } from '../sim/startPositions';
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
  freshwater: boolean;
  coast: boolean;
}

export interface StartReport {
  /** The radius `luxuries` was gathered over, so the page can label the column. */
  luxuryRadius: number;
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
export function startReport(state: GameState): StartReport {
  const { map } = state;
  const radius = Math.max(0, Math.round(resourcesOf(map).startLuxuryRadius));
  const starts = chooseStartPositions(map, state.players.length);
  // One walk of the land for the whole table. `scoreStartSite` would otherwise
  // recompute the landmass floor's components once per seat.
  const landmass = landmassFacts(map);

  const rows = starts.map((tile, seat) => {
    const scored = scoreStartSite(map, tile, undefined, landmass);
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
      freshwater: hasFreshWater(tile),
      coast: isCoastal(map, tile),
    };
  });
  return { luxuryRadius: radius, rows };
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

// --- the whole report -------------------------------------------------------

export interface MapReport {
  width: number;
  height: number;
  seed: number;
  sizeName: string;
  census: ResourceCensus;
  continents: ContinentReport;
  starts: StartReport;
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
export function mapReport(state: GameState): MapReport {
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
    starts: startReport(state),
    continentOf: continents.of,
  };
}

/** The tile index a report's `continentOf` is read at. Re-exported so the page needs no map maths. */
export function continentAt(map: GameMap, of: Int32Array, col: number, row: number): number {
  return of[tileIndex(map, col, row)] ?? -1;
}
