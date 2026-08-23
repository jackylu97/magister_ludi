/**
 * Cities on the board: the little towns that stand on them, and the territory
 * they own.
 *
 * Two layers rather than one, because they change at completely different
 * rates. A city's town is rebuilt when a city is founded or grows — a handful of
 * times per game per city. Its territory is rebuilt when a border moves, which
 * is a different (and rarer) event, and costs an instance per owned tile rather
 * than per city. Fingerprinting them separately means a city growing does not
 * rebuild every border on the map.
 *
 * The town
 * --------
 * A city is a cluster of houses under a banner pole. House count is
 * `min(population, city.houseCap)`, so the first few growth steps are visible on
 * the board itself and a metropolis does not turn its tile into a solid block.
 * Positions come from `hashDisc(col, row, stream)` exactly as trees do: a city
 * founded on the same tile in two different games has the same street plan, the
 * three wrap copies agree, and nothing ever hops between rebuilds.
 *
 * The houses are neutral — bone walls, earth roofs — and *only* the flag carries
 * the player's colour. That is deliberate: at this zoom a tile of coloured roofs
 * would fight the terrain, while one saturated flag on a dark pole is legible at
 * any distance and is where the eye goes anyway.
 *
 * Territory
 * ---------
 * A low-alpha tint on every owned tile, plus a brighter ring on the tiles at the
 * edge of an empire. The tint alone is too soft to tell you where a border
 * *is* — it says "somewhere around here is Crimson's" — and the ring alone
 * leaves the interior ambiguous when two empires interlock. Together they read
 * the way a Civ minimap does, and the ring costs a perimeter's worth of
 * instances rather than an area's.
 *
 * "Edge of an empire", not "edge of a city": two cities of the same player
 * should look like one country, so the ring is drawn where the neighbouring tile
 * has a different *owner* (or none), never where two of one player's cities meet.
 */

import { Group, Matrix4, Quaternion, Vector3 } from 'three';

import { getTileAt, neighborTiles, tileHex, tileIndex } from '../sim/map';
import type { City, GameState } from '../sim/state';
import { EXPLORED, HIDDEN } from '../sim/visibility';

import type { BoardGeometry } from './board3d';
import { type FogLevels, levelAt, seesCell } from './fog3d';
import { hashSigned } from './hash';
import { InstanceCollector, disposeInstancedGroup } from './instances';
import { cellCenter, tileTopY, wrapWidth } from './layout';
import { VIEW3D, playerPieceColor } from './lookData';
import type { MaterialLibrary } from './toon';

const CITY = VIEW3D.city;
/**
 * How far a remembered tile's territory tint and border ring are knocked back.
 *
 * The board's own instances are *washed toward grey vellum*
 * (`InstanceCollector.setWash`), which is not available to a decal whose whole
 * look is one flat colour at one opacity — washing a territory tint toward grey
 * would print grey territory, which says nothing. Fading the opacity is the same
 * statement in the only vocabulary this layer has, and it is derived from the
 * fog's own strength rather than tuned separately, so the two can never drift
 * into a board where the terrain is washed out and the borders on it are not.
 */
const TERRITORY_FADE = 1 - VIEW3D.fog.exploredDim;
const BOARD = VIEW3D.board;
const OVERLAY = VIEW3D.overlay;
const TERRITORY = VIEW3D.territory;

/** An offset cell. Structurally what the simulation calls a path waypoint. */
export interface CellRef {
  col: number;
  row: number;
}

/** The colour a player's flags and borders are drawn in. */
export function playerColor(state: GameState, playerId: number): number {
  const player = state.players[playerId];
  return playerPieceColor(player?.color ?? '', playerId);
}

// --- the towns --------------------------------------------------------------

export class CityLayer {
  readonly group = new Group();
  private drawCallCount = 0;

  /**
   * Rebuilds every town from scratch. Cheap — a few instances per city — and,
   * like the units layer, incapable of drifting out of step with the state that
   * produced it.
   *
   * `faceCamera` orients the flag quads, which are the same trick the HP bars
   * use: the camera angle never changes, so "face the camera" is one constant
   * rotation baked into the instance matrix rather than a per-frame billboard.
   */
  build(
    state: GameState,
    geometry: BoardGeometry,
    materials: MaterialLibrary,
    faceCamera: Quaternion,
    shadows: boolean,
    levels: FogLevels = null,
  ): void {
    disposeInstancedGroup(this.group);

    const map = state.map;
    const period = wrapWidth(map);
    const collector = new InstanceCollector({ copyOffsets: [-period, 0, period] });
    const axis = new Vector3(0, 1, 0);
    const wall = VIEW3D.palette[CITY.wallColor] ?? 0xffffff;
    const roof = VIEW3D.palette[CITY.roofColor] ?? 0x888888;
    const pole = VIEW3D.palette[CITY.poleColor] ?? 0x222222;

    for (const city of state.cities) {
      // A town is drawn only where the seat is watching. A city on ground this
      // player merely *remembers* keeps its (dimmed) DOM banner — see
      // `citySightings` in `src/sim/visibility.ts` and `cityBanners.ts` — but no
      // houses: a memory of a town is a name on a chart, not a model of it, and
      // drawing the model would be the board reporting a population nobody has
      // counted in twenty turns.
      if (!seesCell(levels, map, city.col, city.row)) continue;
      const tile = getTileAt(map, city.col, city.row);
      if (!tile) continue;
      const centre = cellCenter(city.col, city.row);
      const top = tileTopY(tile);

      this.addHouses(city, centre, top, wall, roof, geometry, collector, axis);

      // The pole stands dead centre, where the houses' scatter leaves a gap.
      collector.add(
        geometry.pole,
        [pole],
        new Matrix4().compose(
          new Vector3(centre.x, top, centre.z),
          new Quaternion(),
          new Vector3(1, 1, 1),
        ),
      );
      this.addFlag(state, city, centre, top, geometry, collector, faceCamera);
    }

    this.drawCallCount = collector.flush(this.group, materials, shadows);
  }

  /**
   * The houses, arranged as a village *ring* around the banner pole rather than
   * scattered across the tile the way trees are.
   *
   * The ring is the whole point. The pole stands at the tile centre and so does
   * any garrison piece, so houses dropped on a hashed disc end up underneath
   * both and the population is invisible — which defeats the one thing drawing
   * houses at all is for. Ringing them leaves the middle clear for the pole and
   * the soldier, and reads as a settlement gathered round its flag.
   *
   * It is not a *stamped* ring: each house takes an evenly-spaced slot and then
   * a hashed nudge in angle, radius, size and yaw, so the village looks built
   * rather than surveyed. Every nudge is `hash(col, row, stream)`, so it is
   * identical across rebuilds and across the three wrap copies.
   *
   * Body and roof are two instances so they can take two colours; both share
   * one matrix, so they stay one building.
   */
  private addHouses(
    city: City,
    centre: { x: number; z: number },
    top: number,
    wall: number,
    roof: number,
    geometry: BoardGeometry,
    collector: InstanceCollector,
    axis: Vector3,
  ): void {
    const count = Math.max(1, Math.min(city.population, CITY.houseCap));
    for (let i = 0; i < count; i++) {
      // Stream 50 upward, well clear of the board's own decoration streams, so
      // adding a house never reshuffles a forest.
      const slot = 50 + i * 5;
      const wobble = hashSigned(city.col, city.row, slot) * (Math.PI / count);
      const angle = (i / count) * Math.PI * 2 + wobble;
      const radius =
        CITY.houseSpread *
        BOARD.hexRadius *
        (1 + hashSigned(city.col, city.row, slot + 1) * CITY.houseJitter);
      const jitter = 1 + hashSigned(city.col, city.row, slot + 2) * CITY.houseJitter;
      // Houses face roughly outward, with a nudge: a village on a hillside
      // turns its doors to the road, not to a random compass point.
      const yaw = -angle + hashSigned(city.col, city.row, slot + 3) * 0.5;

      const position = new Vector3(
        centre.x + Math.cos(angle) * radius,
        top,
        centre.z + Math.sin(angle) * radius,
      );
      const quaternion = new Quaternion().setFromAxisAngle(axis, yaw);
      const scale = new Vector3(jitter, jitter, jitter);
      const matrix = new Matrix4().compose(position, quaternion, scale);
      collector.add(geometry.houseBody, [wall], matrix);
      collector.add(geometry.houseRoof, [roof], matrix);
    }
  }

  /**
   * The flag: an unlit quad hanging off the top of the pole in the player's
   * colour, its origin at the pole so scaling grows it outward.
   *
   * Unlit for the same reason the HP bars are — a single-sided quad that took
   * the toon ramp would be a different colour depending on which way the wind
   * blew it, and black when it faced away from the sun.
   */
  private addFlag(
    state: GameState,
    city: City,
    centre: { x: number; z: number },
    top: number,
    geometry: BoardGeometry,
    collector: InstanceCollector,
    faceCamera: Quaternion,
  ): void {
    const anchor = new Vector3(
      centre.x,
      top + CITY.poleHeight - CITY.flagDrop - CITY.flagHeight / 2,
      centre.z,
    );
    collector.add(
      geometry.bar,
      [playerColor(state, city.ownerId)],
      new Matrix4().compose(
        anchor,
        faceCamera,
        new Vector3(CITY.flagWidth, CITY.flagHeight, 1),
      ),
      { overlay: true, opacity: 1 },
    );
  }

  get drawCalls(): number {
    return this.drawCallCount;
  }

  dispose(): void {
    disposeInstancedGroup(this.group);
  }
}

// --- territory --------------------------------------------------------------

export class TerritoryLayer {
  readonly group = new Group();
  private drawCallCount = 0;

  /**
   * Rebuilds the tint and the border rings from `state.tileOwner`.
   *
   * One pass over the owned tiles: every one gets a tint, and a tile whose
   * neighbourhood contains a different owner also gets a ring. The neighbour
   * test compares *players*, so an internal boundary between two of one
   * player's own cities is invisible — which is what a country looks like.
   */
  build(
    state: GameState,
    geometry: BoardGeometry,
    materials: MaterialLibrary,
    levels: FogLevels = null,
  ): void {
    disposeInstancedGroup(this.group);

    const map = state.map;
    const period = wrapWidth(map);
    const collector = new InstanceCollector({ copyOffsets: [-period, 0, period] });
    const identity = new Quaternion();
    const unit = new Vector3(1, 1, 1);
    const ownerOf = playerLookup(state);

    for (let index = 0; index < state.tileOwner.length; index++) {
      const cityId = state.tileOwner[index];
      if (cityId === null || cityId === undefined) continue;
      const playerId = ownerOf.get(cityId);
      if (playerId === undefined) continue;
      const tile = map.tiles[index];
      if (!tile) continue;
      // A border is drawn on a chart like a coastline is, so it survives on
      // ground the seat has merely explored — dimmed, along with everything else
      // on a remembered tile. Nothing at all on ground nobody has seen.
      //
      // The deliberate simplification: what is drawn on an explored tile is the
      // *current* owner rather than the remembered one, so a border that moved
      // while nobody was watching updates itself. Remembering territory properly
      // would mean a second per-player grid the size of `tileOwner`, to correct a
      // leak the player learns nothing actionable from. City *identity* does get
      // remembered honestly, because a banner names a thing (see `citySightings`).
      const level = levelAt(levels, map, tile.col, tile.row);
      if (level === HIDDEN) continue;
      const faded = level === EXPLORED ? TERRITORY_FADE : 1;

      const color = playerColor(state, playerId);
      const centre = cellCenter(tile.col, tile.row);
      const at = new Vector3(centre.x, tileTopY(tile) + OVERLAY.lift, centre.z);

      collector.add(geometry.territory, [color], new Matrix4().compose(at, identity, unit), {
        overlay: true,
        opacity: TERRITORY.tintOpacity * faded,
      });

      let edge = false;
      for (const neighbour of neighborTiles(map, tileHex(tile))) {
        const otherCity = state.tileOwner[tileIndex(map, neighbour.col, neighbour.row)];
        const otherPlayer =
          otherCity === null || otherCity === undefined ? undefined : ownerOf.get(otherCity);
        if (otherPlayer !== playerId) {
          edge = true;
          break;
        }
      }
      // A tile at the pole has fewer than six neighbours and is an edge by the
      // same test, which is right: the map ends there and so does the country.
      if (!edge) continue;
      collector.add(geometry.ring, [color], new Matrix4().compose(at, identity, unit), {
        overlay: true,
        opacity: TERRITORY.borderOpacity * faded,
      });
    }

    this.drawCallCount = collector.flush(this.group, materials, false);
  }

  get drawCalls(): number {
    return this.drawCallCount;
  }

  dispose(): void {
    disposeInstancedGroup(this.group);
  }
}

/** city id → owning player id, built once per rebuild instead of scanned per tile. */
function playerLookup(state: GameState): Map<number, number> {
  const lookup = new Map<number, number>();
  for (const city of state.cities) lookup.set(city.id, city.ownerId);
  return lookup;
}

// --- fingerprints -----------------------------------------------------------

/**
 * A cheap order-sensitive fingerprint of everything the city layer draws. FNV-1a
 * over integers, allocating nothing — the same trick `signUnits` uses, for the
 * same reason: the layer is instanced, so it has to be told when to rebuild, and
 * a hash cannot be forgotten the way an explicit call can.
 */
export function signCities(state: GameState): number {
  let h = 2166136261 ^ state.cities.length;
  for (const city of state.cities) {
    h = Math.imul(h ^ city.id, 16777619);
    h = Math.imul(h ^ city.col, 16777619);
    h = Math.imul(h ^ city.row, 16777619);
    h = Math.imul(h ^ city.population, 16777619);
    h = Math.imul(h ^ city.ownerId, 16777619);
  }
  return h >>> 0;
}

/**
 * Which *tiles* hold cities, hashed. Separate from `signCities` because it
 * drives the board's per-tile **suppression** — a town clears the ground it
 * stands on (`BuiltBoard.suppressTile`) — and that must not be re-examined every
 * time a city grows by a population point.
 *
 * It used to drive a board *rebuild*, which is what founding a city cost until
 * the dressing became a per-instance bit. See `signImprovedCells` for the same
 * note from the improvements' side.
 */
export function signCityCells(state: GameState): number {
  let h = 2166136261 ^ state.cities.length;
  for (const city of state.cities) {
    h = Math.imul(h ^ city.col, 16777619);
    h = Math.imul(h ^ city.row, 16777619);
  }
  return h >>> 0;
}

/**
 * The same for territory. It hashes the whole ownership array — tens of
 * thousands of integers on the largest map — which sounds expensive and is not:
 * it runs only on frames that were already going to be drawn, and it is a
 * multiply and an xor per tile. Hashing something cheaper (the cities' claim
 * counts, say) would miss a tile changing hands without a count changing.
 */
export function signTerritory(state: GameState): number {
  let h = 2166136261 ^ state.tileOwner.length;
  for (let i = 0; i < state.tileOwner.length; i++) {
    h = Math.imul(h ^ (state.tileOwner[i] ?? -1), 16777619);
  }
  // Ownership means nothing without the cities it points at: a city changing
  // hands would recolour a border without touching a single tile.
  for (const city of state.cities) h = Math.imul(h ^ (city.id * 31 + city.ownerId), 16777619);
  return h >>> 0;
}
