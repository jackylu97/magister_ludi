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
 * Two fog rules, and the split is the design
 * ------------------------------------------
 * This is the one layer in the renderer that does not have a single answer to
 * "when is this drawn", and the reason is that its three tenants are not the same
 * kind of thing:
 *
 *   · **A ruin and a village are ground.** They are older than anybody's empire,
 *     they do not move, and a chart records them the way it records a coastline.
 *     So they follow the improvement rule — drawn on ground the seat merely
 *     *remembers*, washed to the same numbers, and absent only on ground nobody
 *     has charted.
 *   · **A camp is an occupation.** It is a thing that is *there now*, it can be
 *     gone by the time you look again, and a remembered camp would be a banner a
 *     player sends a warrior at. So it follows the **unit** rule: drawn only
 *     where the seat can see right now, and never on remembered ground.
 *
 * That second rule is also what makes the wild feel like the wild. Camps are
 * founded only on hexes no real empire can currently see (`canFoundCampAt`), so a
 * camp is invisible until somebody walks up to it — the country you stopped
 * patrolling is the country that turns, and the board says so by simply not
 * drawing what nobody is watching.
 *
 * Painting its own fog
 * --------------------
 * Same mechanism as the improvements layer, and worth writing down here too
 * because a rebuilt layer is exactly where fog is normally lost: `FogView`
 * patches the *board's* buffers and knows nothing about this group, so a layer
 * rebuilt underneath it would come up at full brightness and stay there. Every
 * instance therefore names its `tile`, and `build` finishes by walking the
 * collector's own tile→handle map and applying `setWash` at the strength the
 * tile's current level asks for. Camps never need it — they are only ever drawn
 * on tiles that are `VISIBLE`, which is the level that takes no wash at all — and
 * the pass is written over the whole map anyway rather than over the ruins alone,
 * because a rule that skipped a bucket is a rule somebody has to remember.
 */

import { Group, Matrix4, Quaternion, Vector3 } from 'three';

import { tileIndex } from '../sim/map';
import type { GameState } from '../sim/state';
import { EXPLORED, HIDDEN, VISIBLE } from '../sim/visibility';

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
 * The scatter streams this layer draws from, kept clear of the board's own
 * (which top out in the seventies) and of the improvement layer's (120–121).
 * Placement and yaw are separate streams so nudging one never re-rolls the other.
 */
const STREAM = { place: 130, yaw: 131 } as const;

/** Site kinds as small integers, so the fingerprint stays integer maths. */
const SITE_INDEX: Record<SiteKind, number> = { ruins: 0, village: 1, camp: 2 };

export class SiteLayer {
  readonly group = new Group();
  private drawCallCount = 0;
  private instanceCount = 0;

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

    // The ground's own sites: drawn on anything the seat has ever charted.
    for (const tile of map.tiles) {
      const kind = tile.discovery;
      if (kind === undefined) continue;
      if (levelAt(levels, map, tile.col, tile.row) === HIDDEN) continue;
      place(tile.col, tile.row, kind);
    }

    // The camps: drawn only where the seat can see *now*. `levels` is null on a
    // board with no fog at all — the look-dev pages — and there everything is
    // drawn, which is the honest reading of "there is no seat to hide it from".
    for (const camp of state.camps) {
      if (levels !== null && levelAt(levels, map, camp.col, camp.row) !== VISIBLE) continue;
      place(camp.col, camp.row, 'camp');
    }

    this.drawCallCount = collector.flush(this.group, materials, shadows);
    this.instanceCount = instances;
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

  /** Sites actually drawn, before wrap copies. For tests and stats. */
  get instances(): number {
    return this.instanceCount;
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
export function signSites(state: GameState): number {
  const tiles = state.map.tiles;
  let h = 2166136261 ^ tiles.length;
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
