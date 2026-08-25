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
 * **Lines, not paint.** A band in the owner's ink along exactly those hex edges
 * where ownership changes, and — by default — nothing at all on the interior.
 *
 * It used to be the other way round: a low-alpha wash over every owned tile with
 * a ring around the tiles at the frontier. That answered "roughly whose is this"
 * loudly and "where exactly does it end" quietly, which is backwards. A player
 * looks at borders to decide where a settler may stand and which hex a unit
 * crosses into, and both of those are questions about *the line*. The wash also
 * put a coloured veil over the terrain it was describing, on a board whose whole
 * argument is that the terrain is legible.
 *
 * The tint survives as a tunable set near zero (`territory.tintOpacity`), so the
 * old look is one number away and a future faction with a claim to shout about
 * can have it back without new code.
 *
 * "Edge of an empire", not "edge of a city": two cities of the same player
 * should look like one country, so a band is drawn where the neighbouring tile
 * has a different *owner* (or none), never where two of one player's cities meet.
 *
 * Each side draws its own half
 * ----------------------------
 * A contested edge — Crimson on one hex, Indigo on the next — is drawn twice,
 * once by each tile, each band lying *inside* its own hex and meeting the other
 * at the edge itself. Two surveyors agreeing on a line rather than one line
 * arbitrarily painted in one of the two inks, and it is what makes a frontier
 * read as two countries touching instead of as one country with a rim.
 *
 * That falls out of the loop rather than being a special case: every owned tile
 * is asked about all six of its own edges, so a contested edge is simply an edge
 * two tiles both have something to say about. It also means the geometry is a
 * *tile's* fact, so a band takes its own hex's jitter (`tileYaw`, `tileScale`)
 * and hugs the prism it belongs to instead of drifting over the grout.
 *
 * The corners are joints, not overlaps
 * ------------------------------------
 * A line is only as crisp as its corners, and a hex corner is shared by three
 * tiles, so a border reaching one is doing one of two things: **turning** (the
 * next edge of this same tile is a border too) or **carrying on** (it is not,
 * which means the tile across it is ours as well and its own band continues the
 * line). Those want opposite treatment, and the bug this layer used to have was
 * giving them the same one — every band ran a fixed few percent long, which
 * joined the carrying-on case and, at a turn, ran two square ends straight past
 * the vertex into a little jagged cross hanging outside the hexagon.
 *
 * So a band now stops where it is going: at a join, on the corner of the *ideal*
 * hex, so the two tiles' lines meet across the grout; at a turn, a mitre's
 * setback short of its own face's corner, with a kite (`geometry.borderCorner`)
 * dropped on the vertex to carry the ink round the 120°. The kite is cut so it
 * meets the two bands lip to lip: nothing is drawn twice, which matters at less
 * than full opacity, where an overlap is a dark notch at exactly the place a
 * player is looking to decide which hex a unit crosses into.
 */

import { Group, Matrix4, Quaternion, Vector3 } from 'three';

import { type Tile, getTileAt, tileIndex } from '../sim/map';
import type { City, GameState } from '../sim/state';
import { EXPLORED, HIDDEN } from '../sim/visibility';
import { DIRECTION_COUNT, neighborInDirection } from '../sim/water';

import type { BoardGeometry } from './board3d';
import { type FogLevels, levelAt, seesCell } from './fog3d';
import { hashSigned } from './hash';
import { InstanceCollector, disposeInstancedGroup } from './instances';
import {
  cellCenter,
  directionDelta,
  edgeYaw,
  tileScale,
  tileTopY,
  tileYaw,
  wrapWidth,
} from './layout';
import { VIEW3D, playerPieceColor } from './lookData';
import type { MaterialLibrary } from './toon';

const CITY = VIEW3D.city;
/**
 * How far a remembered tile's border line (and whatever tint is under it) is
 * knocked back.
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
   * Rebuilds the border lines (and whatever is left of the tint) from
   * `state.tileOwner`.
   *
   * One pass over the owned tiles: each is asked, edge by edge, whether the
   * neighbour on the far side answers to the same *player*. Where it does not, a
   * band goes down on this tile's side of that edge. Comparing players rather
   * than cities is what makes an internal boundary between two of one player's
   * own towns invisible — which is what a country looks like.
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
    // Which of a tile's six edges face somebody else, refilled per tile rather
    // than reallocated: on the largest map this loop runs tens of thousands of
    // times and the array never outlives the iteration that fills it.
    const borders = new Array<boolean>(DIRECTION_COUNT).fill(false);

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

      // The interior wash, which is a whisper by default and often nothing at
      // all. A zero-opacity instance is not drawn but is still an instance, a
      // matrix and a slot in a bucket, so "off" is expressed by not adding it.
      if (TERRITORY.tintOpacity > 0) {
        collector.add(geometry.territory, [color], new Matrix4().compose(at, identity, unit), {
          overlay: true,
          opacity: TERRITORY.tintOpacity * faded,
        });
      }

      // All six answers first, then the geometry: a band's *ends* depend on
      // whether the edges either side of it are borders too, so no edge can be
      // drawn until the whole rim of the tile has been asked. See
      // `borderBandMatrix` for what the answer buys.
      for (let direction = 0; direction < DIRECTION_COUNT; direction++) {
        const neighbour = neighborInDirection(map, tile, direction);
        // A tile at the pole has no neighbour that way and gets a band by the
        // same test, which is right: the map ends there and so does the country.
        const otherCity = neighbour
          ? state.tileOwner[tileIndex(map, neighbour.col, neighbour.row)]
          : null;
        const otherPlayer =
          otherCity === null || otherCity === undefined ? undefined : ownerOf.get(otherCity);
        borders[direction] = otherPlayer !== playerId;
      }

      const ink = { overlay: true, opacity: TERRITORY.borderOpacity * faded };
      for (let direction = 0; direction < DIRECTION_COUNT; direction++) {
        if (!borders[direction]) continue;
        collector.add(geometry.borderBand, [color], borderBandMatrix(tile, direction, borders), ink);
      }
      // …and the mitres. Corner `k` is the hex vertex between edges `k` and
      // `k + 1`, so a corner is turned exactly when both of those are borders;
      // anywhere else the line runs on into the next tile of the same country
      // and there is nothing to turn.
      for (let corner = 0; corner < DIRECTION_COUNT; corner++) {
        if (!borders[corner] || !borders[(corner + 1) % DIRECTION_COUNT]) continue;
        collector.add(geometry.borderCorner, [color], borderCornerMatrix(tile, corner), ink);
      }
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

/**
 * How far back from a hex corner a band stops when the line turns there, as a
 * fraction of the band's own width: `tan 30°`.
 *
 * Cut there and the band's *inner* lip lands exactly on the mitre apex — the
 * point one width in from both edges — so the corner piece
 * (`geometry.borderCorner`) meets it edge to edge with nothing drawn twice. Not
 * a tunable and never will be: it is the hexagon's 120° interior angle and the
 * band's width, and any other number is either a gap or a double-blend.
 */
const MITRE_SETBACK = 1 / Math.sqrt(3);

/**
 * Where one border band lies: along one edge of one tile, on *that tile's* side
 * of it.
 *
 * Pure arithmetic, exported, and separated from the collecting for the reason
 * `yieldRowLayout` is: this is the half that can be wrong in a way no draw-call
 * count would ever show — a band a hair too far out lies in the grout, a band
 * turned the wrong way lies across the hex — and a matrix is a thing a test can
 * hold still and read off.
 *
 * Four facts about the geometry, in the order they are used:
 *
 *   the reach   `directionDelta` is centre to *centre*, so half its length is
 *               the apothem: the distance from the middle of a hex to the middle
 *               of one of its sides. Pulling the band half its own width back
 *               from there is what puts its outer lip *on* the edge and its body
 *               inside the tile, which is what leaves room for the neighbour's
 *               own half on a contested edge.
 *   the face    the board draws each prism a `tileGap` narrower than the ideal
 *               hex and then jitters its size and its yaw (`tileScale`,
 *               `tileYaw`). A band that ignored either would hang over the grout
 *               on one side of a tile and sink into the face on the other, so it
 *               takes both — the offset is turned by the same yaw as the band,
 *               or the two would disagree about which way the edge points.
 *   the ends    each end sits at one of the edge's two corners, and what happens
 *               there depends on the *neighbouring* edge — which is why
 *               `borders`, the tile's own six answers, is a parameter. See
 *               below.
 *   the shift   ends that stop in different places move the band's middle, so
 *               the length and the centre are computed together from the two
 *               reaches rather than the length being a constant.
 *
 * The ends are the whole of this pass. A hex corner is shared by three tiles, so
 * a border edge's corner is one of exactly two things:
 *
 *   a turn      the neighbouring edge of *this* tile is a border too, so the
 *               line turns 120° here and stays on this hex. The band stops
 *               `MITRE_SETBACK` widths short and `borderCornerMatrix` puts the
 *               mitre in. It must not reach the corner: a square end run out to
 *               a point where the line is turning away is a spur poking out of
 *               the hexagon, and two of them per corner is the jagged little
 *               cross this pass exists to remove.
 *   a join      the neighbouring edge is interior, which means the third tile at
 *               that corner is ours as well and *its* band carries the line on.
 *               The band runs to the corner of the **ideal** hex rather than of
 *               its own shrunken face, so the two meet across the grout instead
 *               of leaving the line dashed once per tile. That is the whole of
 *               what the old `borderOverhang` was for, now derived instead of
 *               tuned, and applied only where it is wanted.
 *
 * `borders` omitted means "no edge but this one" — the shape of a single band
 * asked for on its own, which is what a test holding one matrix still wants.
 */
export function borderBandMatrix(
  tile: Tile,
  direction: number,
  borders?: readonly boolean[],
): Matrix4 {
  const centre = cellCenter(tile.col, tile.row);
  const delta = directionDelta(direction);
  const yaw = tileYaw(tile);
  const face = tileScale(tile) * (1 - BOARD.tileGap);
  const width = BOARD.hexRadius * TERRITORY.borderWidth;

  // Local +x runs toward the corner shared with `direction + 1`; −x toward the
  // one shared with `direction - 1`. (A hexagon's side equals its circumradius,
  // so a corner is half a radius along the edge from its middle.)
  const ahead = bandEnd(borders?.[(direction + 1) % DIRECTION_COUNT] === true, face, width);
  const behind = bandEnd(borders?.[(direction + 5) % DIRECTION_COUNT] === true, face, width);
  const length = ahead + behind;
  const shift = (ahead - behind) / 2;

  const span = Math.hypot(delta.x, delta.z);
  const reach = (span / 2) * face - width / 2;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const nx = delta.x / span;
  const nz = delta.z / span;
  // The unit step along the edge, which is the inward normal turned a quarter
  // turn — the same vector `edgeYaw` names, without a second trip through
  // `atan2` to get it back.
  const ex = -nz;
  const ez = nx;
  const ox = nx * reach + ex * shift;
  const oz = nz * reach + ez * shift;

  return new Matrix4().compose(
    new Vector3(
      centre.x + (ox * cos + oz * sin),
      tileTopY(tile) + OVERLAY.lift,
      centre.z + (-ox * sin + oz * cos),
    ),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), edgeYaw(direction) + yaw),
    new Vector3(length, 1, width),
  );
}

/**
 * How far one end of a band reaches from the middle of its edge: to the corner
 * of the ideal hex where the line runs on, or `MITRE_SETBACK` widths short of
 * this face's own corner where it turns.
 *
 * Clamped at zero rather than allowed to go negative, because a negative length
 * does not shorten a quad, it turns it inside out — and a back-facing band on a
 * FrontSide material is an invisible one. Only reachable by winding
 * `territory.borderWidth` up past a hex side, but that is a number in a JSON
 * file somebody is meant to play with.
 */
function bandEnd(turns: boolean, face: number, width: number): number {
  if (!turns) return BOARD.hexRadius / 2;
  return Math.max(0, (BOARD.hexRadius * face) / 2 - width * MITRE_SETBACK);
}

/**
 * Where the mitre goes: on the hex vertex between edges `corner` and
 * `corner + 1` of one tile, apex out along the inward bisector.
 *
 * The vertex is a third of the way along the sum of the two centre-to-centre
 * steps — which lands exactly one circumradius out, since those two steps are
 * 60° apart and each is √3 radii long — taken on the tile's own shrunken,
 * jittered face for `borderBandMatrix`'s reason, so the mitre sits on the same
 * hexagon the bands it joins do.
 *
 * The yaw is read back off the *turned* vertex rather than composed from the
 * bisector and `tileYaw` separately: turning the offset already turned the
 * bisector with it, and asking the result which way it points cannot drift out
 * of step with the position the way two parallel derivations can.
 */
export function borderCornerMatrix(tile: Tile, corner: number): Matrix4 {
  const centre = cellCenter(tile.col, tile.row);
  const a = directionDelta(corner);
  const b = directionDelta((corner + 1) % DIRECTION_COUNT);
  const yaw = tileYaw(tile);
  const face = tileScale(tile) * (1 - BOARD.tileGap);
  const width = BOARD.hexRadius * TERRITORY.borderWidth;

  const vx = ((a.x + b.x) / 3) * face;
  const vz = ((a.z + b.z) / 3) * face;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const ox = vx * cos + vz * sin;
  const oz = -vx * sin + vz * cos;

  return new Matrix4().compose(
    new Vector3(centre.x + ox, tileTopY(tile) + OVERLAY.lift, centre.z + oz),
    // Local +x points back down the bisector at the tile centre: rotating +x by
    // θ about +y gives (cos θ, 0, −sin θ), and setting that equal to −(ox, oz)
    // normalised gives θ = atan2(oz, −ox).
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(oz, -ox)),
    new Vector3(width, 1, width),
  );
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
