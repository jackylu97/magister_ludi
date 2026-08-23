/**
 * Improvements on the board: the farm, the mine, the fence round the herd.
 *
 * A layer of its own, patterned on `cities3d.ts`, and the split is the whole
 * point rather than tidiness. Improvements arrive *during play* — a worker
 * spends a charge and a hex changes — and the board's own instance buffers are
 * built once per map and must never be rebuilt for a gameplay event (design
 * notes, the M8 hard perf constraint, which fog of war is the main tenant of).
 * So the props live here, are fingerprinted with `signImprovements`, and cost a
 * rebuild of *this* layer alone: one instance per improved tile, a few dozen on
 * a busy map, against the board's ninety thousand.
 *
 * One instance per improvement, and where it stands
 * -------------------------------------------------
 * A farm is a field, not three fields, so there is no per-tile count to hash —
 * the repetition (four furrows, six fence posts, two trellis rows) is inside the
 * geometry, where it costs no instances at all. What *is* hashed is a small
 * offset and a yaw, from `(col, row)` exactly as every other scatter on this
 * board is, so a farm built on the same hex in two different games sits in the
 * same place, the three wrap copies agree, and nothing hops between rebuilds.
 *
 * `improvements.props[id].jitter` decides how far off centre a prop may sit, and
 * it is 0 for the pasture: the fence is a *ring*, drawn round whatever the
 * resource layer already put on the hex, and a ring that wandered off centre
 * would fence half a herd. That is the composition rule in one number — see the
 * prop docblock in `geometry.ts`.
 *
 * Fog, from birth
 * ---------------
 * Improvements are terrain-ish, so they survive on ground the seat merely
 * *remembers* (a chart records the works of an empire the way it records a
 * coastline) and vanish on ground nobody has charted. That is the same rule the
 * territory tint and the yield glyphs follow.
 *
 * The mechanism is worth writing down, because a rebuilt layer is exactly where
 * fog is normally lost. `FogView` (`fog3d.ts`) patches the *board's* buffers and
 * knows nothing about this group; it holds a `painted` record of the board and
 * repaints only what changed, so a layer rebuilt underneath it would come up at
 * full brightness and stay there. This layer therefore paints itself: every
 * instance names its `tile`, the collector hands back the handles keyed by tile
 * index (`InstanceCollector.tileHandles`), and `build` finishes by walking those
 * handles and applying `setWash` at the strength the tile's *current* level asks
 * for — the same `fog.exploredWash` / `exploredDim` / `exploredShade` numbers,
 * read from the same place, so the two can never drift into a board whose
 * terrain is washed out and whose farms are not.
 *
 * The layer is rebuilt whenever fog moves as well as whenever an improvement
 * does (see `loop` in `renderer3d.ts`, which rebuilds every seat-filtered layer
 * off `FogStats.tiles`), so "apply the current fog on rebuild" and "follow the
 * fog when it changes" are one code path.
 */

import { Group, Matrix4, Quaternion, Vector3 } from 'three';

import {
  IMPROVEMENT_IDS,
  type ImprovementId,
  improvementDef,
} from '../sim/improvementData';
import { tileIndex } from '../sim/map';
import type { GameState } from '../sim/state';
import { EXPLORED, HIDDEN } from '../sim/visibility';

import type { BoardGeometry } from './board3d';
import { type FogLevels, levelAt } from './fog3d';
import { hashDisc, hashUnit } from './hash';
import { InstanceCollector, disposeInstancedGroup } from './instances';
import { cellCenter, tileTopY, wrapWidth } from './layout';
import { VIEW3D, shade } from './lookData';
import type { MaterialLibrary } from './toon';

const BOARD = VIEW3D.board;
const FOG = VIEW3D.fog;
const IMPROVEMENTS = VIEW3D.improvements;

/**
 * The scatter streams this layer draws from, kept well clear of the board's own
 * (which top out in the seventies) and of the city layer's (which starts at 50
 * and steps by five per house). Placement and yaw are separate streams so that
 * nudging one never re-rolls the other.
 */
const STREAM = { place: 120, yaw: 121 } as const;

/** Improvement ids as small integers, so the fingerprint stays integer maths. */
const IMPROVEMENT_INDEX = new Map<ImprovementId, number>(
  IMPROVEMENT_IDS.map((id, index) => [id, index]),
);

/** Which improvements take the ground's own scatter with them. Data, read once. */
const CLEARS_CLUTTER = new Set<ImprovementId>(
  IMPROVEMENT_IDS.filter((id) => improvementDef(id).clearsClutter),
);

export class ImprovementLayer {
  readonly group = new Group();
  private drawCallCount = 0;
  private instanceCount = 0;

  /**
   * Rebuilds every improvement prop from scratch, then paints the result for the
   * seat's current fog. Cheap — one instance per improved tile — and, like the
   * units and cities layers, incapable of drifting out of step with the state
   * that produced it.
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
    // `snapshot` and `forceTint` for the same reason the board asks for them:
    // this layer washes its own instances after the flush, and a bucket nobody
    // asked to tint has no per-instance colour attribute to wash. See `setWash`.
    const collector = new InstanceCollector({
      copyOffsets: [-period, 0, period],
      snapshot: true,
      forceTint: true,
    });
    const axis = new Vector3(0, 1, 0);

    let instances = 0;
    for (const tile of map.tiles) {
      const id = tile.improvement;
      if (id === undefined) continue;
      // Nothing at all on ground nobody has charted. Explored ground keeps its
      // works, washed — see the module docblock.
      const cell = tileIndex(map, tile.col, tile.row);
      if (levelAt(levels, map, tile.col, tile.row) === HIDDEN) continue;

      const spec = IMPROVEMENTS.props[id];
      const centre = cellCenter(tile.col, tile.row);
      const offset = hashDisc(
        tile.col,
        tile.row,
        STREAM.place,
        spec.jitter * BOARD.hexRadius,
      );
      const yaw = hashUnit(tile.col, tile.row, STREAM.yaw) * Math.PI * 2;
      const position = new Vector3(
        centre.x + offset.x,
        tileTopY(tile) + IMPROVEMENTS.lift,
        centre.z + offset.z,
      );
      collector.add(
        geometry.improvementProps[id],
        [shade(spec.color, spec.shade)],
        new Matrix4().compose(
          position,
          new Quaternion().setFromAxisAngle(axis, yaw),
          new Vector3(1, 1, 1),
        ),
        // Named, so the wash below can find it again — and so that anything
        // later that wants to hide an improvement a tile at a time already can.
        { tile: cell },
      );
      instances += 1;
    }

    this.drawCallCount = collector.flush(this.group, materials, shadows);
    this.instanceCount = instances;
    this.paintFog(collector, state, levels);
  }

  /**
   * Applies the seat's current fog to a freshly built layer.
   *
   * The half of the fog contract this layer owns (see the module docblock). It
   * runs on the collector's tile→handle map rather than on a second pass over
   * the tiles, so an instance that forgot to name its tile is an instance that
   * silently never fades — which is exactly the failure `accountedInstances`
   * exists to catch on the board, and the reason `test/improvements3d.test.ts`
   * asserts the wash rather than assuming it.
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

  /** Improvements actually drawn, before wrap copies. For tests and stats. */
  get instances(): number {
    return this.instanceCount;
  }

  dispose(): void {
    disposeInstancedGroup(this.group);
  }
}

// --- fingerprints -----------------------------------------------------------

/**
 * A cheap order-sensitive fingerprint of every improvement on the board.
 *
 * FNV-1a over integers, allocating nothing — the same trick `signCities` uses,
 * for the same reason: the layer is instanced, so it has to be told when to
 * rebuild, and a hash cannot be forgotten the way an explicit notification can.
 *
 * It walks `map.tiles` rather than a list of improved cells, because the
 * question is "what does the board look like" and an answer that depended on the
 * order things were built in would make two identical boards hash differently.
 * The cost is one compare per tile on frames that were already going to be
 * drawn, which is what `signTerritory` already pays over an array of the same
 * length.
 */
export function signImprovements(state: GameState): number {
  let h = 2166136261 ^ state.map.tiles.length;
  for (let i = 0; i < state.map.tiles.length; i++) {
    const id = state.map.tiles[i]!.improvement;
    if (id === undefined) continue;
    h = Math.imul(h ^ i, 16777619);
    h = Math.imul(h ^ (IMPROVEMENT_INDEX.get(id) ?? -1), 16777619);
  }
  return h >>> 0;
}

/**
 * The same, restricted to the improvements that *clear a tile's clutter*.
 *
 * Separate from `signImprovements` because it is the input to a much more
 * expensive rebuild — the board itself, which suppresses a farmed tile's grass
 * the way it suppresses a city tile's trees (`signCityCells` is the exact
 * precedent, and `addDecorations` is the shared mechanism). A pasture, a camp, a
 * quarry and a plantation compose with what is already on their hex and change
 * nothing about the board, so building one must not re-bake ninety thousand
 * instances; only a farm or a mine does, and only once each.
 */
export function signImprovedCells(state: GameState): number {
  let h = 2166136261 ^ state.map.tiles.length;
  for (let i = 0; i < state.map.tiles.length; i++) {
    const id = state.map.tiles[i]!.improvement;
    if (id === undefined || !CLEARS_CLUTTER.has(id)) continue;
    h = Math.imul(h ^ i, 16777619);
  }
  return h >>> 0;
}

