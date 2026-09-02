/**
 * Sites on the board: the ancient ruin, the tribal village, the barbarian camp.
 *
 * The three things that stand on a hex without anybody having built them, and a
 * layer of its own for `improvements3d.ts`'s reason rather than tidiness: all
 * three appear and disappear *during play* — a scout claims a ruin, a camp is
 * founded in the fog and burnt out ten turns later — and the board's own instance
 * buffers are built once per map and must never be rebuilt for a gameplay event
 * (the M8 hard perf constraint). So the props live here, are fingerprinted with
 * `signSites`, and cost a rebuild of *this* layer alone: a few dozen instances on
 * a busy map, against the board's ninety thousand.
 *
 * One fog rule: all three are ground
 * ----------------------------------
 * Every tenant of this layer follows the **improvement** rule — drawn on any hex
 * the seat has ever charted, washed to the fog's numbers on the ones it merely
 * remembers, and absent only where nobody has been. A ruin and a village are
 * obvious cases of it: they are older than anybody's empire, they do not move,
 * and a chart records them the way it records a coastline.
 *
 * **A camp is ground too, by ruling** (playtest, 2026-08-27: "camps should be
 * persistent on the map"). It is the one thing on this board a player is *meant*
 * to plan a march against, and a mark that erased itself the moment the scout who
 * found it walked home is a mark that cannot be planned against: the raiders come
 * out of a hex the chart has forgotten, and the only way to keep track of one is
 * to keep a piece parked in sight of it. A palisade is also a *built* thing — it
 * stands on the hex the way a farm does — so the board says where it was last
 * seen and lets the player decide whether that is still true.
 *
 * The chart is state, not a snapshot, and that is the same reading a ruin gets:
 * a camp burnt out by somebody else disappears from every seat's board at once,
 * exactly as a ruin claimed by a rival does. Remembering *whose* memory holds
 * what would be a per-seat copy of the map, which this renderer deliberately does
 * not keep — fog is a level per hex, and everything else is read live off the
 * state.
 *
 * The standing markers, and why they are here rather than in the lens
 * ------------------------------------------------------------------
 * A ruin and a village also wear a **marker**: the resource roundel's idiom
 * exactly (`addResourceMarkers` in `lens3d.ts`) — a paper mark floated over the
 * hex on an ink pin — because the props alone had the same problem the diorama's
 * wheat and cattle had before the roundels landed. A broken column at game zoom
 * is three grey shapes among the boulders it was carved to look like, and a
 * player who cannot *see* a ruin cannot decide to go to it.
 *
 * The marker is drawn by this layer and not by the lens, unlike every other
 * standing mark on the board, and the reason is the claim: a site disappears
 * mid-game, and prop and pin have to disappear *together*. Both are built from
 * `tile.discovery` in one pass fingerprinted by `signSites`, so the turn a scout
 * walks onto a ruin and `claimDiscoveryAt` deletes the field, the same rebuild
 * removes both. Split across two layers with two rebuild triggers, the failure
 * mode would be a pin standing over ground with nothing under it.
 *
 * It is also not a *switch*. The resource roundels answer a question the player
 * may put down (`LensView.resources`); a site is an event with a claimant, and
 * an interface that let you turn off the news is one that loses you the race.
 *
 * The paper says which kind and says it is not a commodity: both marks are
 * printed on the hex tablet in its own rim ink (`icons.sitePaper`), which is a
 * silhouette no resource wears — see `src/art/siteMarks.ts`. The anchor is the
 * roundel's own upper-left nudge, unchanged, and that costs nothing because a
 * discovery site never carries a resource (`discoveryPlacement.ts` excludes
 * them), so the two pins can never be planted in one hex.
 *
 * Painting its own fog
 * --------------------
 * Same mechanism as the improvements layer, and worth writing down here too
 * because a rebuilt layer is exactly where fog is normally lost: `FogView`
 * patches the *board's* buffers and knows nothing about this group, so a layer
 * rebuilt underneath it would come up at full brightness and stay there. Every
 * instance therefore names its `tile`, and `build` finishes by walking the
 * collector's own tile→handle map and applying `setWash` at the strength the
 * tile's current level asks for. The pass was always written over the whole map
 * rather than over the ruins alone — a rule that skipped a bucket is a rule
 * somebody has to remember — which is why the camps' move onto remembered ground
 * cost this half of the layer no edit at all: a palisade the seat is only
 * remembering fades with the hex it stands on, like everything else here.
 *
 * The markers ride through that pass without being asked to: a pin is ink and
 * fades with its ruin, while the paper is a *printed* bucket and `setWash`
 * declines those outright (`instances.ts`), so a remembered site keeps a legible
 * mark on a faded stake. That is the right reading rather than a lucky one — the
 * chart's memory of what stood there is exactly as sharp as when it was drawn; it
 * is the light on the hex that has gone.
 */

import { Group, Matrix4, Quaternion, Vector3 } from 'three';

import {
  DISCOVERY_KINDS,
  type DiscoveryKind,
  discoveryKindTech,
} from '../sim/discoveryData';
import { type Tile, tileIndex } from '../sim/map';
import type { GameState } from '../sim/state';
import { hasTech } from '../sim/tech';
import { EXPLORED, HIDDEN } from '../sim/visibility';

import type { TileIcons } from './badges3d';
import type { BoardGeometry } from './board3d';
import { type FogLevels, levelAt } from './fog3d';
import { hashDisc, hashUnit } from './hash';
import { InstanceCollector, disposeInstancedGroup } from './instances';
import { cellCenter, tileTopY, wrapWidth } from './layout';
import { type SiteKind, VIEW3D, shade } from './lookData';
import type { MaterialLibrary } from './toon';

const BOARD = VIEW3D.board;
const FOG = VIEW3D.fog;
const SITES = VIEW3D.sites;
/**
 * The standing markers' proportions are the *resource* markers' proportions, read
 * straight out of the lens block rather than copied into a `sites` one. See the
 * module docblock: one board, one way of planting a mark on a hex, and a second
 * set of numbers is how the two drift a hex apart.
 */
const LENS = VIEW3D.lens;

/**
 * The scatter streams this layer draws from, kept clear of the board's own
 * (which top out in the seventies) and of the improvement layer's (120–121).
 * Placement and yaw are separate streams so nudging one never re-rolls the other.
 */
const STREAM = { place: 130, yaw: 131 } as const;

/** Site kinds as small integers, so the fingerprint stays integer maths. */
const SITE_INDEX: Record<SiteKind, number> = {
  ruins: 0,
  village: 1,
  antiquity: 2,
  wreck: 3,
  camp: 4,
};

/**
 * May this seat be shown this kind of site at all?
 *
 * The **second wave's gate**, read here off the same lookup the reducer refuses
 * with (`discoveryKindTech`, `discoveryData.ts`) — one field, two consequences,
 * and the whole reason they cannot drift: a marker a seat can see but not claim
 * is a promise `discoveryClaimError` breaks, and a site a seat can claim but not
 * see is a boon nobody will ever walk to.
 *
 * `seat === null` is the omniscient board — the galleries, the map inspection
 * page — and it sees everything, which is the same "draw everything by not
 * asking" default `RevealView` takes for the identical situation.
 *
 * It is emphatically **not** a fog rule and not a veil: an ungated seat does not
 * get a hidden instance, it gets no instance. A veil is for something the board
 * baked once and hands to every seat (`reveal3d.ts`); this layer is rebuilt per
 * seat off the fog anyway, so the cheapest correct thing is to not draw it.
 */
function seatSeesKind(state: GameState, seat: number | null, kind: DiscoveryKind): boolean {
  const tech = discoveryKindTech(kind);
  if (tech === null) return true;
  if (seat === null) return true;
  return hasTech(state, seat, tech);
}

export class SiteLayer {
  readonly group = new Group();
  private drawCallCount = 0;
  private instanceCount = 0;
  private markerCount = 0;

  /**
   * Rebuilds every site prop from scratch, then paints the result for the seat's
   * current fog. Cheap — one instance per site — and, like every other layer
   * built this way, incapable of drifting out of step with the state that
   * produced it.
   */
  build(
    state: GameState,
    geometry: BoardGeometry,
    materials: MaterialLibrary,
    shadows: boolean,
    levels: FogLevels = null,
    icons: TileIcons | null = null,
    faceCamera: Quaternion = new Quaternion(),
    /**
     * The seat being drawn, or `null` for the omniscient board.
     *
     * The layer already filtered by seat through `levels`; this is the *other*
     * per-seat question — "does this empire have a word for what that is" — and
     * it is passed rather than derived because a layer that reached into
     * `state.players` for a seat id would be a second answer to who is watching.
     * See `seatSeesKind`, and `signSites`, which hashes the same answer so a
     * technology completing rebuilds this layer.
     */
    seat: number | null = null,
  ): void {
    disposeInstancedGroup(this.group);

    const map = state.map;
    const period = wrapWidth(map);
    // `snapshot` and `forceTint` for the improvement layer's reason: this layer
    // washes its own instances after the flush, and a bucket nobody asked to
    // tint has no per-instance colour attribute to wash. See `setWash`.
    const collector = new InstanceCollector({
      copyOffsets: [-period, 0, period],
      snapshot: true,
      forceTint: true,
    });
    const axis = new Vector3(0, 1, 0);
    let instances = 0;
    let markers = 0;

    const place = (col: number, row: number, kind: SiteKind): void => {
      const tile = map.tiles[tileIndex(map, col, row)];
      if (!tile) return;
      const spec = SITES.props[kind];
      const centre = cellCenter(col, row);
      const offset = hashDisc(col, row, STREAM.place, spec.jitter * BOARD.hexRadius);
      const yaw = hashUnit(col, row, STREAM.yaw) * Math.PI * 2;
      collector.add(
        geometry.siteProps[kind],
        [shade(spec.color, spec.shade)],
        new Matrix4().compose(
          new Vector3(
            centre.x + offset.x,
            tileTopY(tile) + SITES.lift,
            centre.z + offset.z,
          ),
          new Quaternion().setFromAxisAngle(axis, yaw),
          new Vector3(1, 1, 1),
        ),
        // Named, so the wash below can find it again — and so that anything
        // later that wants to hide a site a tile at a time already can.
        { tile: tileIndex(map, col, row) },
      );
      instances += 1;
    };

    /**
     * The standing marker over one discovery site: an ink pin and, on top of it,
     * the kind's paper mark turned to the fixed camera.
     *
     * `addResourceMarkers` in `lens3d.ts` line for line — the same lift, the same
     * upper-left anchor, the same pin — and deliberately so: two standing marks
     * that sat at different heights over neighbouring hexes would read as two
     * different *systems* rather than as two things planted on one board. The
     * pin is added first so the paper is drawn over its top in the one bucket
     * where draw order still decides anything.
     */
    const plant = (tile: Tile, kind: DiscoveryKind, atlas: TileIcons): void => {
      const centre = cellCenter(tile.col, tile.row);
      const x = centre.x - LENS.resourceMarkerOffsetX;
      const z = centre.z - LENS.resourceMarkerOffset;
      const ground = tileTopY(tile);
      const cell = tileIndex(map, tile.col, tile.row);
      collector.add(
        geometry.resourceStem,
        [LENS.resourceStemColor],
        new Matrix4().compose(
          new Vector3(x, ground + LENS.glyphLift, z),
          new Quaternion(),
          new Vector3(
            LENS.resourceStemRadius,
            LENS.resourceMarkerLift,
            LENS.resourceStemRadius,
          ),
        ),
        // Named for the fog pass below, exactly as the props are: the stake
        // fades with the ground it is driven into.
        { outlined: false, tile: cell },
      );
      collector.add(
        geometry.siteMarkers[kind],
        // No ink of its own — the quad *is* the texture. See the same note on
        // the resource markers and on the unit badges.
        [],
        new Matrix4().compose(
          new Vector3(x, ground + LENS.resourceMarkerLift, z),
          faceCamera,
          new Vector3(LENS.resourceIconSize, LENS.resourceIconSize, 1),
        ),
        { material: atlas.standingMaterial, tile: cell },
      );
      markers += 1;
    };

    // The ground's own sites: drawn on anything the seat has ever charted.
    // `icons` is null while the atlas is still rasterising — and forever in a
    // browser with no 2D context — and there the props stand markerless, exactly
    // as the resource lens draws nothing under the same condition.
    for (const tile of map.tiles) {
      const kind = tile.discovery;
      if (kind === undefined) continue;
      if (levelAt(levels, map, tile.col, tile.row) === HIDDEN) continue;
      // The gate, before the fog and before the atlas: a seat with no word for
      // buried antiquities is shown neither the mound nor the pin over it. See
      // `seatSeesKind`.
      if (!seatSeesKind(state, seat, kind)) continue;
      place(tile.col, tile.row, kind);
      if (icons) plant(tile, kind, icons);
    }

    // The camps: the same clause as the loop above, because they follow the same
    // rule (see the module docblock — a camp is ground, by ruling). Written out
    // rather than folded into that loop because the two are walked over different
    // things: a discovery is a field on a tile, a camp is a row in `state.camps`.
    for (const camp of state.camps) {
      if (levelAt(levels, map, camp.col, camp.row) === HIDDEN) continue;
      place(camp.col, camp.row, 'camp');
    }

    this.drawCallCount = collector.flush(this.group, materials, shadows);
    this.instanceCount = instances;
    this.markerCount = markers;
    this.paintFog(collector, state, levels);
  }

  /**
   * Applies the seat's current fog to a freshly built layer.
   *
   * The half of the fog contract this layer owns (see the module docblock). It
   * runs on the collector's tile→handle map rather than on a second pass over the
   * tiles, so an instance that forgot to name its tile is an instance that
   * silently never fades.
   */
  private paintFog(
    collector: InstanceCollector,
    state: GameState,
    levels: FogLevels,
  ): void {
    if (!levels) return;
    for (const [cell, handles] of collector.tileHandles()) {
      const tile = state.map.tiles[cell];
      if (!tile) continue;
      if (levelAt(levels, state.map, tile.col, tile.row) !== EXPLORED) continue;
      for (const handle of handles) {
        InstanceCollector.setWash(handle, FOG.exploredWash, FOG.exploredDim, FOG.exploredShade);
      }
    }
  }

  get drawCalls(): number {
    return this.drawCallCount;
  }

  /**
   * Sites actually drawn, before wrap copies. For tests and stats.
   *
   * Props only. A marker is not a site — it is a label on one — so counting the
   * two together would make "how many sites are on this board" a number that
   * changed when the icon atlas finished loading. See `markers`.
   */
  get instances(): number {
    return this.instanceCount;
  }

  /**
   * Standing markers drawn, before wrap copies. Zero until the icon atlas is
   * ready, and zero forever for the camps, which get no pin.
   */
  get markers(): number {
    return this.markerCount;
  }

  dispose(): void {
    disposeInstancedGroup(this.group);
  }
}

// --- fingerprints -----------------------------------------------------------

/**
 * A cheap order-sensitive fingerprint of every site on the board.
 *
 * FNV-1a over integers, allocating nothing — `signImprovements`' trick, for the
 * same reason: the layer is instanced, so it has to be *told* when to rebuild,
 * and a hash cannot be forgotten the way an explicit notification can.
 *
 * The discoveries are walked over `map.tiles`, so the answer is a fact about the
 * board rather than about the order sites were placed in. The camps are walked
 * over `state.camps`, which is founding order — and that is deliberate rather
 * than inconsistent: founding order *is* part of the state (see `GameState.camps`),
 * two states that differ in it are genuinely different states, and mixing the two
 * traversals into one hash is exactly as sound as either alone.
 */
export function signSites(state: GameState, seat: number | null = null): number {
  const tiles = state.map.tiles;
  let h = 2166136261 ^ tiles.length;
  // **The seat's gate is in the hash**, and it has to be: a site's own fields do
  // not move when an empire finishes a technology, so without this the barrows
  // would stay off the board until something unrelated rebuilt the layer. It is
  // the piece fingerprint's discipline (`signUnits`) applied to a fact about the
  // *watcher* rather than about the thing drawn — one bit per gated kind, folded
  // in before the walk, so a seat change and a completed node both move it.
  for (const kind of DISCOVERY_KINDS) {
    h = Math.imul(h ^ (seatSeesKind(state, seat, kind) ? 1 : 0), 16777619);
  }
  for (let i = 0; i < tiles.length; i++) {
    const kind = tiles[i]!.discovery;
    if (kind === undefined) continue;
    h = Math.imul(h ^ i, 16777619);
    h = Math.imul(h ^ SITE_INDEX[kind], 16777619);
  }
  for (const camp of state.camps) {
    h = Math.imul(h ^ tileIndex(state.map, camp.col, camp.row), 16777619);
    h = Math.imul(h ^ SITE_INDEX.camp, 16777619);
  }
  return h >>> 0;
}
