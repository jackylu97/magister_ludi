/**
 * The board: a rectangular hex map stored as odd-r offset rows, wrapping
 * east–west like a cylinder.
 *
 * Storage
 * -------
 * Tiles live in one flat array indexed `row * width + col`. Each tile keeps its
 * offset coordinates (`col`, `row`); axial coordinates are derived on demand via
 * `offsetToAxial` / `axialToOffset` (odd-r: odd rows are pushed half a hex east).
 *
 * Hills
 * -----
 * `feature` is only `none | forest | jungle`. Hills are a separate boolean flag
 * on the tile rather than a feature value, because in Civ-like rules hills stack
 * *with* a feature (forested hills are a real, common combination) and mountains
 * are their own terrain. `elevation` keeps the raw normalised noise value that
 * produced the flag.
 *
 * Wrapping
 * --------
 * Every coordinate access goes through `wrapCol` / `wrapHex`. Columns wrap
 * modulo `width`; rows never wrap — anything above row 0 or below `height - 1`
 * is off the map and resolves to `undefined`.
 *
 * Rivers live on edges, not on tiles
 * ----------------------------------
 * A river in this game is a Civ-style *edge* river: it runs along the border
 * between two hexes rather than through the middle of one, which is what lets a
 * river be a boundary and a source of water without also being a tile you have
 * to spend a turn walking around. `Tile.riverEdges` is a 6-bit mask indexed by
 * `HEX_DIRECTIONS`, bit `d` meaning "a river runs along the edge I share with
 * my neighbour in direction `d`".
 *
 * Resources live on tiles, and are absent rather than empty
 * ----------------------------------------------------------
 * `Tile.resource` is the id of the wheat, iron or silk sitting on the hex, and
 * the key is missing entirely on the ninety-odd percent of tiles that carry
 * nothing. It is generation output like the terrain — placed by `resources.ts`
 * as the last pass of `generateMap`, reproduced from the seed, and never
 * written again during play.
 *
 * Improvements live on tiles too, and are not the only thing here that plays
 * ---------------------------------------------------------------------------
 * `Tile.improvement` is the farm or the mine a worker built; `Tile.feature` is
 * what a chop takes away; `Tile.discovery` is the ruin or village a scout
 * consumes by walking into it; `Tile.road` is the highway a caravan wore into
 * the ground; `Tile.vein` is the seam a survey turns over into `resource`, and
 * `Tile.surveyed` is the mark it leaves whether it found anything or not. Those
 * **six** are the fields that change during a
 * game, and each docblock says why that is compatible with a save file carrying a
 * seed rather than a board. The discovery and the vein are the mildest of them —
 * each can only ever be *removed*, and `surveyed` only ever *added* — and they
 * forbid exactly what the others do: nothing
 * regenerates the map mid-game.
 *
 * THE INVARIANT: an edge is flagged on *both* of the tiles that share it. Bit
 * `d` of tile A implies bit `(d + 3) % 6` of A's neighbour in direction `d`,
 * because `HEX_DIRECTIONS[d + 3]` is exactly `-HEX_DIRECTIONS[d]`. Every write
 * goes through `setRiverEdge` in `water.ts`, which sets both halves, and
 * `test/water.test.ts` asserts the mirror over whole generated maps. Reading one
 * side is therefore always enough — `hasRiverEdge(tile, d)` never has to look up
 * the neighbour — and that is the whole reason the flag is duplicated rather
 * than stored once on a canonical owner.
 */

import {
  type Hex,
  HEX_DIRECTIONS,
  hexDistance,
} from './hex';
import type { DiscoveryKind } from './discoveryData';
import type { ImprovementId } from './improvementData';
import type { MapgenOverrides } from './mapgenData';
import type { ResourceId } from './resourceData';
import type { FeatureId, TerrainId } from './terrainData';

export interface Tile {
  /** Offset column, always in `[0, width)`. */
  col: number;
  /** Offset row, always in `[0, height)`. */
  row: number;
  terrain: TerrainId;
  feature: FeatureId;
  /** Hills stack with terrain and features; see the module docblock. */
  hills: boolean;
  /** Normalised generator elevation, 0..1. */
  elevation: number;
  /** Normalised generator moisture, 0..1. */
  moisture: number;
  /**
   * Which of this tile's six edges a river runs along, as a 6-bit mask indexed
   * by `HEX_DIRECTIONS`. See the module docblock for the mirror invariant.
   */
  riverEdges: number;
  /**
   * True when this tile is land that can drink: it has a river on one of its
   * own edges, or a lake next door. Computed once at the end of generation by
   * `computeFreshwater` (`water.ts`); read through `hasFreshWater`.
   */
  freshwater: boolean;
  /**
   * **How many** of this tile's six neighbours are mountains, or the key is
   * **absent** — which it is on most of the map. Computed once at the end of
   * generation by `markMountainAdjacency` (`mapgen.ts`).
   *
   * `freshwater`'s sibling exactly, and it exists for that field's reason read
   * at a different scale: "is there a mountain next door" is a question about
   * the *neighbourhood*, and the one place that asks it is
   * `tileConditionHolds` (`statecraft.ts`) — a predicate with a tile in hand,
   * no map, and millions of calls a turn behind it. Baking the answer onto the
   * ground is what lets Raised Fields' clause be a card like every other card
   * rather than a second reading of the board.
   *
   * A **count** rather than a flag since batch L3c, and the widening is the
   * whole of what Pachacuti's line needed: *"farms gain +1 food for each
   * adjacent mountain"* (`docs/leaders.md`) is paid once per peak, and the
   * predicate that would have to count them has a tile and no map. Presence is
   * still the adjacency question — `adjacentMountain` asks whether the number is
   * above nought — so one derived field answers both and no second reading of
   * the ring of six comes into existence.
   *
   * Safe to bake because **mountains never move**: nothing in the game writes
   * `Tile.terrain` after generation, so this is derived output that is correct
   * for the life of the map. Absence rather than a stored `0`, which is
   * `resource`'s convention and keeps a bare hex bare.
   */
  mountainsBeside?: number;
  /**
   * The resource sitting on this tile, or the key is **absent** when there is
   * none. Placed once, at the end of generation, by `placeResources`
   * (`resources.ts`); read through `foldTile` for what it pays and through
   * `visibleResourceAt` (`tech.ts`) for what a given player may be told about it.
   *
   * Absence rather than a `'none'` sentinel, which is `Unit.path`'s convention
   * and is here for the same reason: two maps that are the same map must
   * serialise identically, and a bare tile has never had a resource rather than
   * having one called nothing.
   */
  resource?: ResourceId;
  /**
   * The farm, mine or pasture standing on this tile, or the key is **absent**
   * when there is none. Absence rather than a `'none'` sentinel, for the reason
   * `resource` gives above.
   *
   * The one field on a tile that is **not** generation output: it is written
   * during play by the `buildImprovement` command and cleared by `pillage`
   * (`commands.ts`), and by nothing else. That does not break the "a save file
   * carries a seed, not four thousand tiles" promise in `state.ts` — a save is
   * `{config, log}` and every improvement on the board is in that log, so a
   * replay lays them down again in the order they were built. What it does mean
   * is that the map object is no longer a pure function of the seed *after* turn
   * one, and anything that regenerates it mid-game (nothing does) would wipe the
   * empire's works.
   */
  improvement?: ImprovementId;
  /**
   * **The turn the work standing here was raised**, or the key is **absent** —
   * which it is on every bare hex and on every map the generator ever produced.
   *
   * **The seventh field on a tile that changes during a game** (batch D2d, the
   * age stamp; `roadFree` was the sixth to be added and `surveyed` the sixth to
   * be numbered — the register in `CLAUDE.md` is the list of record and this
   * entry joins it). It is the stamp `City.buildingTurns` is one scale up: a
   * card may ask how long an academy has stood, and a hex that has forgotten
   * when its stones went down cannot be asked.
   *
   * **An absolute turn, written once and compared against `state.turn`** —
   * `TimedEffect.expiresTurn`'s discipline and `City.purchasedUnitTurns`',
   * applied to the longest-lived fact in the game. Nothing decrements it, no
   * phase sweeps it, and the reading is `state.turn - improvedOn >= turns`.
   *
   * It is **bound to `improvement` and travels with it**: every seam that writes
   * that field writes this one beside it (`buildImprovementAt`, a great person's
   * work, a prophet's holy site) and every seam that deletes that field deletes
   * this one with it (a pillage, a work replaced). So a farm torn up and rebuilt
   * is a new farm, which is the honest reading of "how long has this stood" and
   * the one a player can act on by tearing it up.
   *
   * It is a fact about the **ground and not about a seat**, exactly as
   * `surveyed` is: a hex that changes hands keeps the age of what stands on it,
   * because the stones did not move. Pay follows the stones — the wonders
   * framework's rule, read on a hex.
   *
   * There is deliberately **no companion for `feature`**. A wood nobody planted
   * has stood since the world was made, so a stamp on it would be a field with
   * no writer; when the Woodland line's planting lands (the audit's wave 3) the
   * planter earns its own mark, and the maturity those cards print is that
   * system's word rather than this one's.
   */
  improvedOn?: number;
  /**
   * The ancient ruin or tribal village standing on this tile, or the key is
   * **absent** — which it is on all but a handful of hexes. Absence rather than a
   * `'none'` sentinel, for the reason `resource` gives above.
   *
   * Generation output that is **consumed by play**, which makes it the third
   * field on a tile that changes during a game and the only one that can only
   * ever be *removed*: `placeDiscoveries` (`discoveries.ts`, run as the last pass
   * of `generateMap`) scatters them from the seed, and the first unit to step
   * onto one claims it — `claimDiscoveryAt` deletes the key and hands that unit's
   * owner a choice. Nothing ever writes one during play.
   *
   * The save-file promise survives exactly as it does for `improvement`: a claim
   * is caused by a *movement*, every movement is in the log, and a replay walks
   * the same unit onto the same hex and consumes the same site. What it means, as
   * with the other two, is that nothing may regenerate the map mid-game.
   */
  discovery?: DiscoveryKind;
  /**
   * The empire whose caravan laid the road on this hex, or the key is **absent**
   * — which it is on every tile of every map the generator ever produced.
   * Absence rather than a `false`, for the reason `resource` gives above.
   *
   * **The fourth field on a tile that changes during a game** (the trade pass,
   * `docs/trade.md`; the trap in `CLAUDE.md` said three on purpose, and this is
   * the design decision that adds one). It is written by exactly one thing — a
   * *trader's step*, in `arriveOnTile`, the one "a piece came to rest here" seam
   * — and removed by exactly one thing, `pillage`, the same verb that strips a
   * farm. Never by mapgen, never by a turn phase, never by anything that would
   * have to regenerate a tile.
   *
   * A **seat id and not a boolean**, and that is the whole of road maintenance:
   * anybody may *walk* a road (an invader uses your highways — Civ's rule and
   * the honest one, and `stepCost` asks nothing about who built it), but only
   * the empire that laid one pays the upkeep on it, which is the user's ruling.
   * So the field answers "whose road is this to keep" and nothing asks it
   * "whose road is this to use".
   *
   * Roads are **permanent** (the user's ruling): nothing ages them out, no
   * pillage-by-time, no repair verb. The save-file promise survives exactly as
   * it does for `improvement` — a road is laid by a *movement*, every movement
   * is in the log, and a replay walks the same caravan over the same hexes.
   */
  road?: number;
  /**
   * This road costs its builder nothing to keep, or the key is **absent** —
   * which it is on every road any caravan ever wore.
   *
   * **Presence is the state**, `improvement`'s discipline rather than a boolean
   * that is usually `false`: a hex has this mark or it has never heard of it, so
   * a game with no Founders' Road in it serialises exactly as it did before the
   * field existed.
   *
   * Written by `layRoad`'s `free` arm and by nothing else — one occasion reaches
   * it, The Founders' Road decreeing a highway between two towns (the user's
   * ruling of 2026-08-28: *"the roads are maintenance-free"*) — and removed by
   * `pillage`, beside the road it belongs to, because a torn-up free road must
   * not leave a free mark for the next caravan to inherit.
   *
   * It is read by exactly one thing: `roadsBuiltBy` (`empireGold.ts`), the count road
   * maintenance is charged on. **Nothing else may ask it.** A free road is a
   * road — `stepCost` prices it, `fillAdmits` crosses it, `roadJoins` joins it,
   * and an invader walks it — and the day a second reader appears it will be
   * because somebody decided free roads are a different *kind* of road, which is
   * a design decision and not a convenience.
   */
  roadFree?: true;
  /**
   * The seam buried under this hill, or the key is **absent** — which it is on
   * every hex nothing is under, and on every hex a survey has already turned
   * over. Absence rather than a `'none'` sentinel, for the reason `resource`
   * gives above.
   *
   * **The fifth field on a tile that changes during a game**, and the strangest
   * of them: it is generation output like `discovery` — `placeVeins`
   * (`veins.ts`, run after the ruins as the last pass of `generateMap`) seeds it
   * from the seed and nothing else ever writes one — and like `discovery` it can
   * only ever be *removed*. What it removes *into* is the difference: the one
   * thing that deletes a vein is a survey striking it (`prospectAt`,
   * `improvements.ts`), and the same act writes the seam onto `resource`. So the
   * pair is a move rather than two edits, and a struck hill is a hill the
   * generator could have produced in the first place — which is exactly what
   * `placeVeins` checks before it seeds one.
   *
   * **Nothing may read this but the survey.** It is a secret the map keeps: a
   * yield that counted it, a lens that drew it or an AI that steered by it would
   * be the map leaking through a surface, and the whole design of the layer is
   * that certainty costs a worker's turn. `test/mapgen/veins.test.ts` reads the
   * sources and fails on a second reader.
   *
   * The save-file promise survives exactly as it does for `discovery`: a strike
   * is caused by a *logged command*, and a replay sends the same worker onto the
   * same hill and turns over the same ground.
   */
  vein?: ResourceId;
  /**
   * A survey has asked this hill, or the key is **absent**. Public, permanent,
   * and set **whether or not anything was found** — which is the whole point of
   * it: "surveyed" means *asked*, so the barren mark and the strike are one
   * field and the map fills in with certainty either way.
   *
   * **The sixth field on a tile that changes during a game**, and the mildest of
   * all of them — it can only ever be *added*, once, by `prospectAt`, and
   * nothing takes it off again. It is `roadFree`'s shape (`presence is the
   * state`) rather than a boolean that is usually `false`, so a map nobody has
   * ever surveyed serialises exactly as it did before the field existed.
   *
   * It is a fact about the **ground**, not about a seat: everybody's chart says
   * this hill has been read, because a survey is a thing that visibly happens to
   * a hillside. The per-seat alternative — every empire asking the same hill for
   * itself — is docblocked on `prospectAt` and deliberately not built.
   */
  surveyed?: true;
}

export interface GameMap {
  width: number;
  height: number;
  /** Seed the map was generated from (informational; regeneration is by seed). */
  seed: number;
  /** Size key from `data/mapgen.json`. */
  sizeName: string;
  /**
   * The mapgen override sheet this map was generated with, when it had one.
   *
   * The third of the triple that regenerates this world — `(seed, sizeName,
   * mapgenOverrides)` — and it is here rather than passed around because
   * *everything downstream of generation already takes the map*: the start
   * chooser, the resource fairness passes, the inspection report. A consumer
   * that holds the map can ask `mapgenFor(map)` and cannot get the wrong
   * answer; a consumer that had to be handed the sheet separately eventually
   * is not.
   *
   * Absent on every ordinary map, which is why it is optional rather than a
   * resolved config: an unmodified map serialises exactly as it always did.
   */
  mapgenOverrides?: MapgenOverrides;
  /** Flat tile array, indexed `row * width + col`. */
  tiles: Tile[];
}

// --- offset <-> axial -------------------------------------------------------

/** odd-r offset -> axial. Odd rows are shifted half a hex east. */
export function offsetToAxial(col: number, row: number): Hex {
  return { q: col - (row - (row & 1)) / 2, r: row };
}

/** axial -> odd-r offset. */
export function axialToOffset(h: Hex): { col: number; row: number } {
  return { col: h.q + (h.r - (h.r & 1)) / 2, row: h.r };
}

// --- wrapping ---------------------------------------------------------------

/** Wraps an offset column into `[0, width)`. THE canonical east–west wrap. */
export function wrapCol(map: GameMap, col: number): number {
  const w = map.width;
  return ((col % w) + w) % w;
}

/** True when a row is on the map (rows do not wrap). */
export function inRows(map: GameMap, row: number): boolean {
  return row >= 0 && row < map.height;
}

/**
 * Wraps an axial `q` for the given row, returning the canonical `q`.
 * Axial `q` depends on the row, so the row must be supplied.
 */
export function wrapQ(map: GameMap, q: number, r: number): number {
  const { col } = axialToOffset({ q, r });
  return offsetToAxial(wrapCol(map, col), r).q;
}

/** Canonical (wrapped) form of an axial hex. Rows are left untouched. */
export function wrapHex(map: GameMap, h: Hex): Hex {
  return { q: wrapQ(map, h.q, h.r), r: h.r };
}

// --- tile access ------------------------------------------------------------

export function tileIndex(map: GameMap, col: number, row: number): number {
  return row * map.width + col;
}

/** Tile at offset coordinates, wrapping the column. `undefined` off the poles. */
export function getTileAt(map: GameMap, col: number, row: number): Tile | undefined {
  if (!inRows(map, row)) return undefined;
  return map.tiles[tileIndex(map, wrapCol(map, col), row)];
}

/** Tile at axial coordinates, wrapping the column. `undefined` off the poles. */
export function getTile(map: GameMap, h: Hex): Tile | undefined {
  const { col, row } = axialToOffset(h);
  return getTileAt(map, col, row);
}

/** The axial coordinates of a tile. */
export function tileHex(tile: Tile): Hex {
  return offsetToAxial(tile.col, tile.row);
}

/**
 * **A work goes up on this hex, and the hex remembers when** — the one writer of
 * `Tile.improvedOn`, batch D2d.
 *
 * A pair of fields that must never be written apart: an improvement with no
 * stamp is a work of unknown age and a stamp with no improvement is an age
 * nothing is standing on, and both are states a card would read wrong. So the
 * three seams that raise something on a hex — a worker's spade
 * (`buildImprovementAt`), a great person's lasting work (`greatPersonWorkAt`)
 * and a prophet's stones (`plantHolySiteAt`) — say it here rather than each
 * writing two lines, which is the same bargain `layRoad` strikes one field over.
 *
 * It lives in this module because this module owns `Tile` and imports nothing:
 * `improvements.ts`, `greatPeople.ts` and `religion.ts` can all see a leaf, and
 * a helper any two of them needed anywhere else would be the runtime cycle
 * `moduleCycles.test.ts` exists to catch.
 *
 * The turn is handed in rather than read, for the reason every other absolute
 * stamp in the simulation takes one: this file has no `GameState` and never
 * will.
 */
export function raiseImprovement(tile: Tile, improvement: ImprovementId, turn: number): void {
  tile.improvement = improvement;
  tile.improvedOn = turn;
}

/**
 * **The work on this hex comes down, and the hex forgets when it went up** —
 * `raiseImprovement`'s mirror, and the one place `Tile.improvedOn` is deleted.
 *
 * A stamp left behind on bare ground would be an age waiting for the next farm
 * to inherit — exactly the bug `pillageAt` already guards one field over, where
 * `roadFree` goes with the road it is a fact *about*. So a farm torn up and
 * rebuilt is a new farm, which is the reading a player can act on.
 */
export function razeImprovement(tile: Tile): void {
  delete tile.improvement;
  delete tile.improvedOn;
}

/**
 * **How many turns the work on this hex has stood**, or `undefined` where
 * nothing stands or nothing remembers when it went up.
 *
 * The one reading of `Tile.improvedOn`, and it is a subtraction rather than a
 * count: the stamp is absolute and `state.turn` is the clock, so nothing ticks
 * (`TimedEffect`'s discipline). A hex whose stones predate the field — a save
 * from before schema 121 cannot exist on this branch, but a fixture may — has no
 * stamp and answers `undefined`, which every caller reads as "cannot be shown to
 * be old enough" rather than as zero.
 */
export function improvementAge(tile: Tile, turn: number): number | undefined {
  if (tile.improvement === undefined || tile.improvedOn === undefined) return undefined;
  return turn - tile.improvedOn;
}

// --- map-aware neighbourhood ------------------------------------------------

/**
 * The on-map neighbours of `h` as canonical (wrapped) axial hexes.
 * Neighbours past the north/south edge are omitted, so the result has 3–6 entries.
 */
export function mapNeighbors(map: GameMap, h: Hex): Hex[] {
  const result: Hex[] = [];
  for (const d of HEX_DIRECTIONS) {
    const r = h.r + d.r;
    if (!inRows(map, r)) continue;
    result.push({ q: wrapQ(map, h.q + d.q, r), r });
  }
  return result;
}

/** The on-map neighbour tiles of `h`. */
export function neighborTiles(map: GameMap, h: Hex): Tile[] {
  const result: Tile[] = [];
  for (const n of mapNeighbors(map, h)) {
    const tile = getTile(map, n);
    if (tile) result.push(tile);
  }
  return result;
}

/** The on-map neighbour tiles of a tile. */
export function tileNeighbors(map: GameMap, tile: Tile): Tile[] {
  return neighborTiles(map, tileHex(tile));
}

/**
 * Hex distance that may travel around the east–west seam, i.e. the shortest of
 * going directly and going around the cylinder in either direction.
 */
export function wrappedDistance(map: GameMap, a: Hex, b: Hex): number {
  const w = map.width;
  // Shifting a hex by `k` whole map widths in *offset* space changes axial q by
  // k * width (the row, and therefore the odd-r shear term, is unchanged).
  let best = Infinity;
  for (let k = -1; k <= 1; k++) {
    const d = hexDistance(a, { q: b.q + k * w, r: b.r });
    if (d < best) best = d;
  }
  return best;
}

/** Every on-map tile within `radius` steps of `h`, wrap-aware, `h` included. */
export function mapRange(map: GameMap, h: Hex, radius: number): Tile[] {
  const result: Tile[] = [];
  if (radius < 0) return result;
  const seen = new Set<number>();
  for (let dq = -radius; dq <= radius; dq++) {
    const lo = Math.max(-radius, -dq - radius);
    const hi = Math.min(radius, -dq + radius);
    for (let dr = lo; dr <= hi; dr++) {
      const tile = getTile(map, { q: h.q + dq, r: h.r + dr });
      if (!tile) continue;
      const idx = tileIndex(map, tile.col, tile.row);
      // A small map can wrap onto itself; do not report the same tile twice.
      if (seen.has(idx)) continue;
      seen.add(idx);
      result.push(tile);
    }
  }
  return result;
}

// --- construction -----------------------------------------------------------

export interface CreateMapOptions {
  width: number;
  height: number;
  seed?: number;
  sizeName?: string;
  terrain?: TerrainId;
  /** Carried onto the map verbatim. See `GameMap.mapgenOverrides`. */
  mapgenOverrides?: MapgenOverrides;
}

/** An empty map, every tile the same terrain. Generation fills it in. */
export function createMap(options: CreateMapOptions): GameMap {
  const { width, height } = options;
  const terrain = options.terrain ?? 'ocean';
  const tiles: Tile[] = new Array(width * height);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      tiles[row * width + col] = {
        col,
        row,
        terrain,
        feature: 'none',
        hills: false,
        elevation: 0,
        moisture: 0,
        riverEdges: 0,
        freshwater: false,
      };
    }
  }
  const map: GameMap = {
    width,
    height,
    seed: options.seed ?? 0,
    sizeName: options.sizeName ?? 'custom',
    tiles,
  };
  // Set only when there is one, so an unmodified map has no such key at all and
  // serialises byte-for-byte the way it did before overrides existed.
  if (options.mapgenOverrides) map.mapgenOverrides = options.mapgenOverrides;
  return map;
}
