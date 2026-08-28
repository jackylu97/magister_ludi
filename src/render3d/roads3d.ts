/**
 * The roads: the track a caravan wears into the ground between two towns.
 *
 * A layer of its own, and the file it is modelled on is `improvements3d.ts`
 * rather than the board — for the same reason and with the same three
 * obligations. A road arrives *during play* (a trader rests on a hex and
 * `Tile.road` is written, `src/sim/arrival.ts`) and disappears during play (a
 * pillage), and the board's own instance buffers are built once per map and must
 * never be rebuilt for a gameplay event. So the strips live here, are
 * fingerprinted with `signRoadCells`, and cost a rebuild of *this* layer alone:
 * a few instances per paved hex against the board's ninety thousand.
 *
 * Halves, not links
 * -----------------
 * A road is a fact about a **tile** in the simulation — presence of `Tile.road`,
 * whose value is the seat that laid it — and this layer keeps it one. Every
 * paved hex draws its own half of every link it is part of: a strip running from
 * its centre out toward each paved neighbour, a little past the shared edge so
 * it meets the neighbour's own half under the grout. Six possible, and a paved
 * hex with no paved neighbour at all draws a small hub instead, so a single
 * stretch of road laid by a caravan that got one hex out of its city is still
 * visible as something rather than as nothing.
 *
 * Drawing *links* would have been fewer instances and is the wrong shape. A link
 * belongs to two hexes, which is the thing the fog's one-tile map cannot say —
 * it is why `addRivers` reports its edges separately and by hand — and a road
 * has to fade tile by tile like every other piece of ground, because half a road
 * across the frontier of what a seat has walked is exactly the picture. One
 * instance, one `tile:`, one wash.
 *
 * Which way each strip points is `directionYaw` and how long it is is
 * `roads.overhang` — see `RoadSpec`, where the arithmetic of "half a link" is
 * written down. Nothing is hashed: unlike every scatter on this board a road is
 * not decoration, it is a statement about where somebody walked, and a jittered
 * road would be a road that did not join up.
 *
 * Fog, from birth
 * ---------------
 * A road is *ground* — the improvement rule, not the unit rule — so it survives
 * on hexes the seat merely remembers and vanishes on ground nobody has charted.
 * A road you walked last century is still on your chart; whether anybody is
 * standing on it is a different question and one this layer does not answer.
 *
 * The mechanism is `ImprovementLayer.paintFog`'s, copied deliberately rather
 * than shared, because it is four lines and the thing that must not drift is the
 * *numbers*, which both read from `VIEW3D.fog`. `FogView` patches the board's
 * buffers and knows nothing about this group, so a layer rebuilt underneath it
 * would come up at full brightness and stay there; every instance therefore
 * names its `tile`, and `build` finishes by walking the collector's tile→handle
 * map and applying the wash the tile's *current* level asks for. The renderer
 * rebuilds this layer whenever fog moves as well as whenever a road does (see
 * `loop` in `renderer3d.ts`, which rebuilds every seat-filtered layer off
 * `FogStats.tiles`), so "apply the current fog on rebuild" and "follow the fog
 * when it changes" are one code path.
 *
 * Whose road it is
 * ----------------
 * Nobody's, as far as this layer is concerned. `Tile.road` holds the seat id of
 * the empire that laid it and the simulation asks that question about
 * maintenance; the *board* deliberately does not, because anybody may walk a
 * road (Civ's rule, and `docs/trade.md`'s) and a track drawn in a nation's own
 * ink would be claiming otherwise. One grout colour, everywhere, for everyone —
 * which is also why the fingerprint below hashes presence and not the value.
 */

import { Group, Matrix4, Quaternion, Vector3 } from 'three';

import { tileIndex } from '../sim/map';
import type { GameState } from '../sim/state';
import { EXPLORED, HIDDEN } from '../sim/visibility';
import { neighborInDirection } from '../sim/water';

import type { BoardGeometry } from './board3d';
import { type FogLevels, levelAt } from './fog3d';
import { InstanceCollector, disposeInstancedGroup } from './instances';
import { cellCenter, directionYaw, tileTopY, wrapWidth } from './layout';
import { VIEW3D, shade } from './lookData';
import type { MaterialLibrary } from './toon';

const BOARD = VIEW3D.board;
const FOG = VIEW3D.fog;
const ROADS = VIEW3D.roads;

/**
 * Half the distance between two hex centres, which is exactly how far a strip
 * has to reach to land on the shared edge.
 *
 * A pointy-top hexagon of circumradius R has neighbours `√3 · R` away, so this
 * is `√3/2 · R` and is a constant of the layout rather than a tunable. What
 * `roads.overhang` scales is *this*, so re-tuning the board's hex radius moves
 * the roads with everything else.
 */
const HALF_LINK = (Math.sqrt(3) / 2) * BOARD.hexRadius;

export class RoadLayer {
  readonly group = new Group();
  private drawCallCount = 0;
  private instanceCount = 0;
  private strips = 0;
  private hubs = 0;

  /**
   * Rebuilds every road strip from scratch, then paints the result for the
   * seat's current fog.
   *
   * Cheap for the reason the improvements layer is: a handful of instances per
   * paved hex, on a board where the paved hexes are the ones caravans have
   * actually walked. A late-game empire of forty towns joined by road is a few
   * thousand instances in one or two buckets, against the ninety thousand the
   * board itself holds.
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
    // `snapshot` and `forceTint` for `ImprovementLayer`'s reason: this layer
    // washes its own instances after the flush, and a bucket nobody asked to
    // tint has no per-instance colour attribute to wash.
    const collector = new InstanceCollector({
      copyOffsets: [-period, 0, period],
      snapshot: true,
      forceTint: true,
    });
    const axis = new Vector3(0, 1, 0);
    const ink = shade(ROADS.color, ROADS.shade);
    const length = HALF_LINK * ROADS.overhang;
    const width = BOARD.hexRadius * ROADS.width;

    let instances = 0;
    let strips = 0;
    let hubs = 0;
    for (const tile of map.tiles) {
      if (tile.road === undefined) continue;
      // Nothing at all on ground nobody has charted. Remembered ground keeps its
      // roads, washed — see the module docblock.
      if (levelAt(levels, map, tile.col, tile.row) === HIDDEN) continue;

      const cell = tileIndex(map, tile.col, tile.row);
      const centre = cellCenter(tile.col, tile.row);
      const y = tileTopY(tile) + ROADS.lift;
      let laid = 0;

      // All six, not three: a strip is *this tile's* half of a link, so the
      // neighbour's half is the neighbour's own business and there is no
      // double-drawing to avoid. That is the difference from `addRivers`, which
      // emits one instance for an edge two tiles share and therefore has to
      // pick a side.
      for (let direction = 0; direction < 6; direction++) {
        const neighbor = neighborInDirection(map, tile, direction);
        if (!neighbor || neighbor.road === undefined) continue;
        // The strip's own middle: half a half-link out along the direction, so
        // the near end lands on the tile centre and the far end past the edge.
        const yaw = directionYaw(direction);
        const position = new Vector3(
          centre.x + Math.cos(yaw) * (length / 2),
          y,
          centre.z - Math.sin(yaw) * (length / 2),
        );
        collector.add(
          geometry.roadStrip,
          [ink],
          new Matrix4().compose(
            position,
            new Quaternion().setFromAxisAngle(axis, yaw),
            new Vector3(length, 1, width),
          ),
          // No inverted hull, for the river's reason: a dark rim around a band
          // this thin would swallow it, and the grout it runs beside is already
          // the outline. Named, so the wash below can find it again.
          { outlined: false, tile: cell },
        );
        laid += 1;
        strips += 1;
        instances += 1;
      }

      // A paved hex joined to nothing. It happens on the first step of a run and
      // on the last hex before a pillaged one, and a hex that had a road on it
      // and drew nothing at all would read as the road having failed to appear.
      if (laid === 0) {
        collector.add(
          geometry.roadHub,
          [ink],
          new Matrix4().compose(
            new Vector3(centre.x, y, centre.z),
            new Quaternion(),
            new Vector3(1, 1, 1),
          ),
          { outlined: false, tile: cell },
        );
        hubs += 1;
        instances += 1;
      }
    }

    this.drawCallCount = collector.flush(this.group, materials, shadows);
    this.instanceCount = instances;
    this.strips = strips;
    this.hubs = hubs;
    this.paintFog(collector, state, levels);
  }

  /**
   * Applies the seat's current fog to a freshly built layer.
   *
   * The half of the fog contract this layer owns (see the module docblock). It
   * runs on the collector's tile→handle map rather than on a second pass over
   * the tiles, so an instance that forgot to name its tile is an instance that
   * silently never fades — which `test/render/roads3d.test.ts` asserts rather
   * than assumes.
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

  /** Road marks actually drawn, before wrap copies. For tests and stats. */
  get instances(): number {
    return this.instanceCount;
  }

  /** Half-links drawn, and lone hubs. The two halves of `instances`. */
  get stripCount(): number {
    return this.strips;
  }

  get hubCount(): number {
    return this.hubs;
  }

  dispose(): void {
    disposeInstancedGroup(this.group);
  }
}

// --- fingerprints -----------------------------------------------------------

/**
 * A cheap order-sensitive fingerprint of every paved hex on the board.
 *
 * `signImprovedCells`'s pattern exactly — FNV-1a over the tile indices that
 * carry a road, allocating nothing — and it is the *cells* variant rather than
 * the `signImprovements` variant for a reason that is visible in what it does
 * not hash: the **builder's seat id is left out**. `Tile.road` holds it, and it
 * is a real fact the simulation asks about maintenance, but this board draws
 * every road in one grout colour whoever laid it (see the module docblock), so a
 * road changing hands — which it cannot today, and would if a captured city ever
 * took its highways with it — must not cost a rebuild of a layer that would come
 * out byte-identical.
 *
 * It walks `map.tiles` rather than a list of paved cells, because the question
 * is "what does the board look like" and an answer that depended on the order
 * roads were laid in would make two identical boards hash differently. Presence
 * is the whole state, so a pillaged road moves it back to exactly what it was
 * before the caravan came through.
 */
export function signRoadCells(state: GameState): number {
  let h = 2166136261 ^ state.map.tiles.length;
  for (let i = 0; i < state.map.tiles.length; i++) {
    if (state.map.tiles[i]!.road === undefined) continue;
    h = Math.imul(h ^ i, 16777619);
  }
  return h >>> 0;
}
