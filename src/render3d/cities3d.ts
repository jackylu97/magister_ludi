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

import { heraldryFor } from '../art/heraldryMarks';
import { type BuildingId, isWonder } from '../sim/buildingData';
import { capitalCityOf } from '../sim/cities';
import { type Tile, getTileAt, tileIndex } from '../sim/map';
import type { City, GameState } from '../sim/state';
import { highestAge } from '../sim/techData';
import { EXPLORED, HIDDEN } from '../sim/visibility';
import { DIRECTION_COUNT, neighborInDirection } from '../sim/water';

import type { TileIcons } from './badges3d';
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

/**
 * How many sculpt tiers a town has. Æra I huts, Æra II gables, Æra III stone.
 *
 * Not a tunable: it is the length of the ladder the shapes were carved for, and
 * a fourth tier is new geometry rather than a new number. What *is* tunable is
 * which tier each part joins at — every aged part carries its own `fromTier` in
 * `data/view3d.json`. See `CitySpec.gable`.
 */
export const CITY_TIERS = 3;

/**
 * Which sculpt tier a town is built at: its **owner's** age, clamped.
 *
 * The owner's, not the town's, and there is no such thing as a town's age — a
 * technology is an empire-wide fact about what its people know how to build, so
 * an empire that reaches the Bronze Age re-roofs every town it holds at once,
 * including the ones it just took. That is the same reading the sim takes of
 * every other age band (`highestAge`, the unit cost multiplier), and taking a
 * different one here would mean the board disagreed with the ledger about what
 * age a city was in.
 *
 * `highestAge` is the sim's own single age derivation and this asks it rather
 * than counting techs, exactly as `meterEffects` and `resourceEffects` do.
 */
export function cityTier(state: GameState, city: City): number {
  const owner = state.players[city.ownerId];
  if (!owner) return 1;
  return Math.max(1, Math.min(CITY_TIERS, highestAge(owner.techsResearched)));
}

/**
 * Everything about a town that changes what is *sculpted* — and therefore
 * everything the city fingerprint has to carry beyond where the town is and how
 * big it is.
 *
 * One derivation, two readers, and that is the point. `CityLayer.build` asks it
 * to decide what to draw and `signCities` asks it to decide when to draw again;
 * a second copy of the rules in the fingerprint is how a board ends up showing
 * an Æra II town in Æra III until something unrelated happens to move the hash.
 * The trap in `CLAUDE.md` about the unit fingerprint is this one for cities:
 * **any new visual-affecting city property joins `CityLook` and nothing else.**
 */
export interface CityLook {
  /** 1, 2 or 3. See `cityTier`. */
  tier: number;
  /** A palisade stands: stakes from `palisade.fromTier`, stone from `wall.fromTier`. */
  walls: boolean;
  shrine: boolean;
  temple: boolean;
  /** The seat of government. See `capitalCityOf` — the sim's own rule, asked. */
  capital: boolean;
  /**
   * How many **wonders** stand in this town — the world's one permitted
   * spectacle (`docs/art-pass.md`, W3), one outsized sculpt each.
   *
   * A count rather than a flag, and rather than a list of which ones: a town may
   * hold two, and every wonder is drawn with the same generic marvel until the
   * ratified rows arrive with sculpts of their own (see `cityWonder`). The day
   * they do, this becomes the list and the fingerprint folds the ids — which is
   * a change to *this* type and to nothing else, which is the whole point of
   * `CityLook`.
   */
  wonders: number;
}

/** Does this town hold a finished building? */
function holds(city: City, id: BuildingId): boolean {
  return city.buildings.includes(id);
}

/**
 * Which cities are capitals, as a set of ids, resolved once per rebuild.
 *
 * `capitalCityOf` is the simulation's own rule and is asked rather than
 * reimplemented — the founded-first-unless-all-captured reading, with all of its
 * consequences about conquest, lives in one function and the board must not grow
 * a second. It is asked once per *owner* rather than once per city, which is what
 * keeps a hundred-city map from being quadratic in a rebuild that happens every
 * time a town grows.
 */
export function capitalIds(state: GameState): Set<number> {
  const capitals = new Set<number>();
  const asked = new Set<number>();
  for (const city of state.cities) {
    if (asked.has(city.ownerId)) continue;
    asked.add(city.ownerId);
    const capital = capitalCityOf(state, city.ownerId);
    if (capital) capitals.add(capital.id);
  }
  return capitals;
}

/** The six facts about a town that decide its sculpt. See `CityLook`. */
export function cityLook(
  state: GameState,
  city: City,
  capitals: ReadonlySet<number>,
): CityLook {
  return {
    tier: cityTier(state, city),
    walls: holds(city, 'palisade'),
    shrine: holds(city, 'shrine'),
    temple: holds(city, 'temple'),
    capital: capitals.has(city.id),
    // Counted off the town's own `buildings` rather than off
    // `GameState.wonders`, and the difference is a captured city: the claim
    // register records who *built* a wonder and never moves, while the marvel
    // stands where the stones are. The sim takes the same reading of what a
    // wonder pays (`liveEffects`).
    wonders: city.buildings.filter(isWonder).length,
  };
}

/**
 * Which of the ring's slots are taken by something other than a house, in the
 * order they claim them.
 *
 * A town is a ring of buildings round its pole (see `addTown`), and a palace, a
 * ziggurat and a shrine stand *in* that ring rather than beside it. That is not
 * a shortcut, it is the only arrangement that survives the hex: everything has
 * to fit inside the wall, the middle is spoken for by the pole and whatever
 * garrison is standing on the tile, and a work parked outside the house ring
 * ends up straddling the palisade at the sizes these shapes need to be legible.
 *
 * A fixed order rather than a hashed one, so the palace is always at the same
 * bearing of its own town and a player learns where to look.
 */
type CityWork = 'palace' | 'temple' | 'shrine' | 'wonder';

function cityWorks(look: CityLook): CityWork[] {
  const works: CityWork[] = [];
  if (look.capital && look.tier >= CITY.palace.fromTier) works.push('palace');
  // Beside the palace and ahead of the temple, so the two biggest things a town
  // can hold stand together and a wonder is never pushed round the back by a
  // shrine. One slot per wonder: the ring grows to fit them, exactly as it grows
  // for a temple, so a town that finished a marvel never appears to have lost a
  // quarter of its houses.
  for (let i = 0; i < look.wonders && look.tier >= CITY.wonder.fromTier; i++) {
    works.push('wonder');
  }
  if (look.temple && look.tier >= CITY.temple.fromTier) works.push('temple');
  if (look.shrine && look.tier >= CITY.shrine.fromTier) works.push('shrine');
  return works;
}

export class CityLayer {
  readonly group = new Group();
  private drawCallCount = 0;

  /**
   * Rebuilds every town from scratch. Cheap — a couple of dozen instances per
   * city at the top tier — and, like the units layer, incapable of drifting out
   * of step with the state that produced it.
   *
   * `faceCamera` orients the flag quads, which are the same trick the HP bars
   * use: the camera angle never changes, so "face the camera" is one constant
   * rotation baked into the instance matrix rather than a per-frame billboard.
   *
   * `icons` is the tile atlas, or null while it is still rasterising. It carries
   * one thing here — the seat's heraldic charge, printed on the flag — and a
   * null one means a plain banner, exactly as a null one means an untagged unit.
   */
  build(
    state: GameState,
    geometry: BoardGeometry,
    materials: MaterialLibrary,
    faceCamera: Quaternion,
    shadows: boolean,
    levels: FogLevels = null,
    icons: TileIcons | null = null,
  ): void {
    disposeInstancedGroup(this.group);

    const map = state.map;
    const period = wrapWidth(map);
    const collector = new InstanceCollector({ copyOffsets: [-period, 0, period] });
    const pole = VIEW3D.palette[CITY.poleColor] ?? 0x222222;
    const capitals = capitalIds(state);

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
      const look = cityLook(state, city, capitals);

      this.addTown(city, look, centre, top, geometry, collector);
      this.addWall(look, tile, centre, top, geometry, collector);

      // The pole stands dead centre, where the ring of buildings leaves a gap.
      collector.add(
        geometry.pole,
        [pole],
        new Matrix4().compose(
          new Vector3(centre.x, top, centre.z),
          new Quaternion(),
          new Vector3(1, 1, 1),
        ),
      );
      this.addFlag(state, city, centre, top, geometry, collector, faceCamera, icons);
    }

    this.drawCallCount = collector.flush(this.group, materials, shadows);
  }

  /**
   * The buildings, arranged as a *ring* around the banner pole rather than
   * scattered across the tile the way trees are.
   *
   * The ring is the whole point. The pole stands at the tile centre and so does
   * any garrison piece, so buildings dropped on a hashed disc end up underneath
   * both and the population is invisible — which defeats the one thing drawing
   * houses at all is for. Ringing them leaves the middle clear for the pole and
   * the soldier, and reads as a settlement gathered round its flag.
   *
   * It is not a *stamped* ring: each slot takes an evenly-spaced bearing and then
   * a hashed nudge in angle, radius, size and yaw, so the village looks built
   * rather than surveyed. Every nudge is `hash(col, row, stream)`, so it is
   * identical across rebuilds and across the three wrap copies.
   *
   * The works claim the ring's first slots and the houses fill the rest, with at
   * least one house always — a capital of one citizen is a palace with a house
   * beside it, which is what a seat of government with nobody in it should look
   * like. Growing the ring by the number of works rather than displacing houses
   * is deliberate: a town that built a temple must not appear to have lost a
   * quarter.
   */
  private addTown(
    city: City,
    look: CityLook,
    centre: { x: number; z: number },
    top: number,
    geometry: BoardGeometry,
    collector: InstanceCollector,
  ): void {
    const works = cityWorks(look);
    const houses = Math.max(1, Math.min(city.population, CITY.houseCap));
    const count = works.length + houses;

    for (let i = 0; i < count; i++) {
      // Stream 50 upward, well clear of the board's own decoration streams, so
      // adding a house never reshuffles a forest.
      const slot = 50 + i * 5;
      const wobble = hashSigned(city.col, city.row, slot) * (Math.PI / count);
      const angle = (i / count) * Math.PI * 2 + wobble;
      const work = works[i];
      const spread = work ? CITY[work].offset : CITY.houseSpread;
      const radius =
        spread *
        BOARD.hexRadius *
        (1 + hashSigned(city.col, city.row, slot + 1) * CITY.houseJitter);
      // Buildings face roughly outward, with a nudge: a village on a hillside
      // turns its doors to the road, not to a random compass point.
      const yaw = -angle + hashSigned(city.col, city.row, slot + 3) * 0.5;
      const at = new Vector3(
        centre.x + Math.cos(angle) * radius,
        top,
        centre.z + Math.sin(angle) * radius,
      );

      if (work) {
        this.addWork(work, at, yaw, geometry, collector);
        continue;
      }
      // A work is never jittered in size — a palace half a size small is a big
      // house — but a house is, and it is what makes the ring read as a village.
      const jitter = 1 + hashSigned(city.col, city.row, slot + 2) * CITY.houseJitter;
      this.addHouse(city, look, slot, at, yaw, jitter, geometry, collector);
    }
  }

  /**
   * One house: a body under a roof, two instances sharing one matrix so they stay
   * one building and can take two colours.
   *
   * The roof is where the age shows. Æra I keeps the pyramid it always had; from
   * `gable.fromTier` the same body takes a **ridged** roof, which is the whole of
   * "a town that has aged" in one edge (see `cityGableRoof`) — and, from the same
   * tier, one roof in three takes the second tone, chosen by the house's own hash
   * so it never moves. A town does not rebuild its walls when it learns to frame
   * a roof, so `houseBody` is shared across all three tiers.
   */
  private addHouse(
    city: City,
    look: CityLook,
    slot: number,
    at: Vector3,
    yaw: number,
    jitter: number,
    geometry: BoardGeometry,
    collector: InstanceCollector,
  ): void {
    const wall = VIEW3D.palette[CITY.wallColor] ?? 0xffffff;
    const gabled = look.tier >= CITY.gable.fromTier;
    const roofName =
      gabled && hashSigned(city.col, city.row, slot + 4) > 0.35
        ? CITY.roofAltColor
        : CITY.roofColor;
    const roof = VIEW3D.palette[roofName] ?? 0x888888;

    const matrix = new Matrix4().compose(
      at,
      new Quaternion().setFromAxisAngle(UP, yaw),
      new Vector3(jitter, jitter, jitter),
    );
    collector.add(geometry.houseBody, [wall], matrix);
    collector.add(gabled ? geometry.houseGableRoof : geometry.houseRoof, [roof], matrix);
  }

  /**
   * One work: the palace, the ziggurat or the shrine, at the ring slot it claimed.
   *
   * Two of the three are two instances rather than one, and for the houses'
   * reason: the gilt on a shrine's needle and on a palace's ridge is a *second
   * colour*, so it is a second instance over the same matrix. The gilt is the one
   * place gold touches the world layer at all — see `cityPalaceFinial`.
   */
  private addWork(
    work: CityWork,
    at: Vector3,
    yaw: number,
    geometry: BoardGeometry,
    collector: InstanceCollector,
  ): void {
    const matrix = new Matrix4().compose(
      at,
      new Quaternion().setFromAxisAngle(UP, yaw),
      new Vector3(1, 1, 1),
    );
    const spec = CITY[work];
    const ink = VIEW3D.palette[spec.color] ?? 0xffffff;

    if (work === 'temple') {
      collector.add(geometry.temple, [ink], matrix);
      return;
    }
    if (work === 'wonder') {
      collector.add(geometry.wonder, [ink], matrix);
      collector.add(
        geometry.wonderTip,
        [VIEW3D.palette[CITY.wonder.tipColor] ?? 0xffffff],
        matrix,
      );
      return;
    }
    if (work === 'shrine') {
      collector.add(geometry.shrine, [ink], matrix);
      collector.add(
        geometry.shrineFinial,
        [VIEW3D.palette[CITY.shrine.finialColor] ?? 0xffffff],
        matrix,
      );
      return;
    }
    collector.add(geometry.palaceBody, [ink], matrix);
    collector.add(
      geometry.palaceRoof,
      [VIEW3D.palette[CITY.palace.roofColor] ?? 0x333333],
      matrix,
    );
    collector.add(
      geometry.palaceFinial,
      [VIEW3D.palette[CITY.palace.finialColor] ?? 0xffffff],
      matrix,
    );
  }

  /**
   * The wall, when a palisade stands: a comb of sharpened stakes on the
   * hexagon's own perimeter, or — from `wall.fromTier` — six crenellated stone
   * segments on its six edges.
   *
   * Same building, two sculpts, and that is the *point* rather than a shortcut.
   * There is one wall building in the game; what changes between the ages is what
   * a people knows how to build it out of, which is exactly the thing this whole
   * pass exists to show. A later stone-wall building, if one is ever added, joins
   * by taking `wall.fromTier`'s branch on its own terms.
   *
   * Both rings take the tile's own yaw and shrunken face (`tileYaw`,
   * `tileScale`), for `borderBandMatrix`'s reason: a ring that ignored either
   * would hang over the grout on one side of the tile and sink into the face on
   * the other.
   */
  private addWall(
    look: CityLook,
    tile: Tile,
    centre: { x: number; z: number },
    top: number,
    geometry: BoardGeometry,
    collector: InstanceCollector,
  ): void {
    if (!look.walls) return;
    const stone = look.tier >= CITY.wall.fromTier;
    if (!stone && look.tier < CITY.palisade.fromTier) return;

    const yaw = tileYaw(tile);
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const face = tileScale(tile) * (1 - BOARD.tileGap);
    // The tile's own turn, applied to an offset written in the hexagon's frame.
    // Lifted from `borderBandMatrix`, whose derivation of the sign is the one
    // this board settles on.
    const place = (ox: number, oz: number): Vector3 =>
      new Vector3(centre.x + (ox * cos + oz * sin), top, centre.z + (-ox * sin + oz * cos));

    if (stone) {
      const spec = CITY.wall;
      const ink = VIEW3D.palette[spec.color] ?? 0x888888;
      for (let direction = 0; direction < DIRECTION_COUNT; direction++) {
        const delta = directionDelta(direction);
        const span = Math.hypot(delta.x, delta.z);
        // Half a centre-to-centre step is the apothem — the distance from the
        // middle of a hex to the middle of one of its sides — which is where a
        // wall lying *on* an edge has its middle.
        const reach = (span / 2) * spec.ring * face;
        collector.add(
          geometry.wallSegment,
          [ink],
          new Matrix4().compose(
            place((delta.x / span) * reach, (delta.z / span) * reach),
            new Quaternion().setFromAxisAngle(UP, edgeYaw(direction) + yaw),
            new Vector3(face, 1, 1),
          ),
        );
      }
      return;
    }

    const spec = CITY.palisade;
    const ink = VIEW3D.palette[spec.color] ?? 0x8a6a45;
    const radius = BOARD.hexRadius * spec.ring * face;
    const perEdge = Math.max(1, Math.round(spec.perEdge));
    for (let corner = 0; corner < DIRECTION_COUNT; corner++) {
      const a = hexCornerAt(radius, corner);
      const b = hexCornerAt(radius, corner + 1);
      // Each edge owns its own start corner and not its end one, so the six runs
      // tile the perimeter with exactly one stake per corner rather than two
      // standing in the same hole.
      for (let i = 0; i < perEdge; i++) {
        const t = i / perEdge;
        collector.add(
          geometry.palisadeStake,
          [ink],
          new Matrix4().compose(
            place(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t),
            new Quaternion(),
            new Vector3(1, 1, 1),
          ),
        );
      }
    }
  }

  /**
   * The flag: an unlit quad hanging off the top of the pole in the player's
   * colour, with the seat's heraldic charge stamped on its hoist.
   *
   * Unlit for the same reason the HP bars are — a single-sided quad that took
   * the toon ramp would be a different colour depending on which way the wind
   * blew it, and black when it faced away from the sun.
   *
   * The charge is a cell of the tile atlas (`CHARGE_CELLS`) standing a hair in
   * front of the cloth, on its own little field of parchment. Parchment rather
   * than ink straight onto the tincture because the twelve seat colours run from
   * `sky` to `ink` and a charge printed in one ink cannot read on both — see
   * `CHARGE_CELLS` for the whole of that argument. It is set toward the hoist
   * (`chargeInset`) where a real banner puts one, which leaves the fly free to be
   * the colour.
   */
  private addFlag(
    state: GameState,
    city: City,
    centre: { x: number; z: number },
    top: number,
    geometry: BoardGeometry,
    collector: InstanceCollector,
    faceCamera: Quaternion,
    icons: TileIcons | null,
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

    if (!icons) return;
    const charge = heraldryFor(city.ownerId, state.players[city.ownerId]?.charge);
    // `barQuad` runs from x = 0 at the pole out to x = 1, so the inset is a plain
    // fraction of the flag's own width in the flag's own frame — which is why the
    // charge stays put when somebody dials `flagWidth`.
    const right = new Vector3(1, 0, 0).applyQuaternion(faceCamera);
    const forward = new Vector3(0, 0, 1).applyQuaternion(faceCamera);
    collector.add(
      geometry.chargeMarkers[charge],
      [],
      new Matrix4().compose(
        anchor
          .clone()
          .addScaledVector(right, CITY.chargeInset * CITY.flagWidth)
          .addScaledVector(forward, CITY.chargeNudge),
        faceCamera,
        new Vector3(CITY.chargeSize, CITY.chargeSize, 1),
      ),
      // The atlas's *standing* material: a flag is a thing in the diorama, so
      // its charge is hidden by the mountain that hides the flag. The flag
      // itself is an unlit overlay, which is a different question (see above) —
      // the two are drawn one in front of the other by `chargeNudge`, not by a
      // depth trick.
      { material: icons.standingMaterial },
    );
  }

  get drawCalls(): number {
    return this.drawCallCount;
  }

  dispose(): void {
    disposeInstancedGroup(this.group);
  }
}

/** The board's one up axis, hoisted: every town matrix turns about it. */
const UP = new Vector3(0, 1, 0);

/**
 * The k-th corner of the town's ring, in the prism's own corner phase.
 *
 * The same phase `hexPrism` and `hexDecal` are built in, so a palisade sits
 * square on the hexagon it is defending rather than 30° out of true. Written
 * here rather than imported because `geometry.ts` keeps its copy private and a
 * second *user* of a two-line arithmetic is not a reason to widen an API — but
 * the two must agree, and `test/render/cities3d.test.ts` holds that they do by
 * checking a stake lands on a hex corner.
 */
function hexCornerAt(radius: number, k: number): { x: number; z: number } {
  const angle = (k * Math.PI) / 3;
  return { x: radius * Math.sin(angle), z: radius * Math.cos(angle) };
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
 *
 * **What the age pass added, and the rule it comes with.** A town used to be
 * where it stood, how big it was and whose it was; since it learned to show its
 * era it is also its *sculpt tier*, its walls, its shrine, its temple and
 * whether it is the capital. Those five arrive as `CityLook` — the same
 * derivation the layer draws from, folded here rather than re-derived — which is
 * exactly the discipline the unit fingerprint's trap in `CLAUDE.md` demands one
 * scale up: **any new visual-affecting city property joins `CityLook`**, and it
 * is then in both the picture and the hash by construction. A property added to
 * the draw and not to the look is a town that keeps its old roofs until
 * something unrelated happens to grow it.
 *
 * The capital set is resolved once for the whole sweep rather than per city, for
 * `capitalIds`' stated reason.
 */
export function signCities(state: GameState): number {
  let h = 2166136261 ^ state.cities.length;
  const capitals = capitalIds(state);
  for (const city of state.cities) {
    h = Math.imul(h ^ city.id, 16777619);
    h = Math.imul(h ^ city.col, 16777619);
    h = Math.imul(h ^ city.row, 16777619);
    h = Math.imul(h ^ city.population, 16777619);
    h = Math.imul(h ^ city.ownerId, 16777619);
    // The five sculpt facts, packed into one integer: the tier in the low bits
    // and one bit each for the rest. Packed rather than hashed one at a time
    // because they are one answer — "what does this town look like" — and a
    // reader adding a sixth should have to notice this line.
    const look = cityLook(state, city, capitals);
    const bits =
      look.tier |
      (look.walls ? 1 << 4 : 0) |
      (look.shrine ? 1 << 5 : 0) |
      (look.temple ? 1 << 6 : 0) |
      (look.capital ? 1 << 7 : 0) |
      // A *count*, not a bit, and it takes the high byte: a town's second wonder
      // is a second sculpt on the ring, so the hash has to move for it.
      (look.wonders << 8);
    h = Math.imul(h ^ bits, 16777619);
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
