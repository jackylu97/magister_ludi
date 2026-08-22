/**
 * Fog of war on the board: the chart-table finishing what it started.
 *
 * Entry VII of the design ledger put the diorama on a magister's chart-table and
 * said the backdrop would eventually *become* the fog — unexplored ground is not
 * black, it is chart nobody has drawn on yet, and the world is literally drawn
 * in as you explore it. This is that, and the three states are three different
 * pictures rather than three opacities:
 *
 *   hidden    **Terra Incognita.** Every instance the hex owns — its prism, its
 *             trees, its boulders, its resource props, its sand band — is
 *             zero-scaled, and a blank vellum patch with a faint hex ruled on it
 *             is switched on in its place. Occasionally, in the empty quarters,
 *             a serpent (*hic svnt dracones*).
 *   explored  the diorama, **washed out and knocked back**: every instance's
 *             ink mixed halfway toward a flat grey vellum (`fog.exploredDim` /
 *             `fog.exploredWash`) and then taken down in value
 *             (`fog.exploredShade`). Remembered terrain, not watched terrain,
 *             and loudly so — the watched region has to read as a lit bubble
 *             from across the room, and a bubble is only lit if there is
 *             something darker around it. The shade is not decoration: without
 *             it the mix alone moved a grassland face's luminance by four
 *             percent, upward, and the two halves of the board came out the
 *             same picture. See `InstanceCollector.setWash`.
 *   visible   untouched.
 *
 * THE CONSTRAINT, and how it is met
 * ---------------------------------
 * The M8 hard perf constraint (design-notes, Sequencing snapshot) is that a
 * visibility change must never rebuild the board. A standard map is about
 * 90,000 instances across the three wrap copies, built once, and re-baking that
 * because a scout walked one hex east would be a stutter on every move of every
 * turn for the rest of the game.
 *
 * So nothing here builds anything after construction. The board build hands over
 * a tile→instance map (`TileInstances` in `board3d.ts`), this class holds the
 * previous level of every tile, and `apply` walks *only the tiles whose level
 * changed*: for each one it writes matrices (hide/restore) and colours (tint) on
 * the instance slots that tile owns. A delta of K tiles costs
 * `O(K × instances-per-tile)` attribute writes and zero allocations of geometry.
 * `test/fog3d.test.ts` and `test/stress.test.ts` assert exactly that, by counting
 * writes through `INSTANCE_WRITES` rather than by timing a GPU that is not there.
 *
 * Seat switching is not an exception to the rule, only to the *size*: swapping
 * which player's eyes the board is drawn through changes almost every tile at
 * once, so `apply` produces a very large delta and does a full per-instance
 * sweep — still attribute writes, still no rebuild. It is a dev-harness gesture
 * (CLAUDE.md: hot-seat is a harness, not the product) and it is allowed to cost
 * a frame.
 *
 * Rivers belong to two tiles
 * --------------------------
 * A river ribbon lies in the grout *between* two hexes, so it cannot be filed
 * under either: it is drawn while **either** bank is charted, and hidden only
 * when both are. Filed under one tile it would disappear the moment that bank
 * went dark and leave a river running out of nowhere on the other side. They
 * arrive as `TileInstances.shared` and are re-evaluated whenever either of their
 * two tiles moves.
 *
 * What is *not* here
 * ------------------
 * Units, badges, HP bars, walkers, city banners and the lenses are all filtered
 * by their own layers, and that is not a violation of the constraint — those
 * layers already rebuild whenever a unit moves, which is far more often than the
 * fog changes. The constraint is about the **board**, which is the thing that is
 * expensive and the thing that is built once.
 */

import { Group, Matrix4, Quaternion, Vector3 } from 'three';

import { type GameMap, mapRange, tileHex, tileIndex } from '../sim/map';
import { EXPLORED, HIDDEN, VISIBLE } from '../sim/visibility';

import type { TileIcons } from './badges3d';
import type { BoardGeometry, SharedEdge, TileInstances } from './board3d';
import { hashUnit } from './hash';
import {
  type InstanceHandle,
  INSTANCE_WRITES,
  InstanceCollector,
  disposeInstancedGroup,
} from './instances';
import { cellCenter, wrapWidth } from './layout';
import { VIEW3D } from './lookData';
import type { MaterialLibrary } from './toon';

const BOARD = VIEW3D.board;
const FOG = VIEW3D.fog;

/** No wash at all: what a currently-watched tile is painted at. */
const CLEAR = 0;

/**
 * The two strengths a tile can be painted at, as `setWash` takes them.
 *
 * A pair rather than two loose numbers because they are one decision — how a
 * remembered hex differs from a watched one — and because the first attempt
 * shipped only the first half of it. See `FogSpec` in `lookData.ts`: the mix
 * greys the ink toward the chart, and the shade is what makes the watched
 * region read as *lit* rather than merely as more colourful.
 */
const REMEMBERED = { mix: FOG.exploredDim, shade: FOG.exploredShade };
const WATCHED = { mix: CLEAR, shade: CLEAR };

/**
 * One seat's view of the board, as the layers that filter by it see it:
 * `state.visibility[seat]`, or `null` for "no fog at all".
 *
 * `null` is not a placeholder, it is a real and permanent case. The frozen 2D
 * renderers have no fog, the Armory and the piece gallery draw units against no
 * game at all, and a test that is asking about geometry has no seat to ask
 * through. Every layer takes it as an optional trailing argument that defaults
 * to `null`, so "draw everything" stays the thing you get by not asking.
 */
export type FogLevels = readonly number[] | null;

/**
 * How a seat sees one cell. `visible` when there is no fog, `hidden` for a cell
 * off the end of the grid — which is the honest answer for a state whose board
 * was swapped underneath it.
 */
export function levelAt(
  levels: FogLevels,
  map: GameMap,
  col: number,
  row: number,
): number {
  if (!levels) return VISIBLE;
  return levels[tileIndex(map, col, row)] ?? HIDDEN;
}

/** Is this cell currently watched? What the *unit-ish* layers filter on. */
export function seesCell(levels: FogLevels, map: GameMap, col: number, row: number): boolean {
  return levelAt(levels, map, col, row) === VISIBLE;
}

/** Has this cell ever been seen? What the *terrain-ish* layers filter on. */
export function knowsCell(levels: FogLevels, map: GameMap, col: number, row: number): boolean {
  return levelAt(levels, map, col, row) !== HIDDEN;
}

/** The stream the serpent scatter is hashed from. Its own, like every scatter. */
const SERPENT_STREAM = 91;

/**
 * The height the blank chart is drawn at.
 *
 * The top of the substrate slab, not the table plane. The slab spans the whole
 * board and is *above* the table (see `buildSubstrate` in `board3d.ts`), so a
 * hidden tile whose prism has been zero-scaled reveals dark earth rather than
 * vellum — the table is only ever seen past the board's rim. The blank chart is
 * therefore drawn *onto* the slab at a constant height, which is better than the
 * alternative anyway: unexplored ground has no elevation to report, so a chart
 * patch that followed the terrain's height would be leaking exactly the thing
 * the fog is hiding.
 */
function chartY(): number {
  return BOARD.height.ocean - BOARD.substrateDrop;
}

/** What one `apply` did. Operation counts, for the harness and the stats line. */
export interface FogStats {
  /** Tiles whose level actually changed. */
  tiles: number;
  /** Shared river edges re-evaluated. */
  edges: number;
  /** Instance matrix writes issued (hide and restore). */
  matrixWrites: number;
  /** Instance tint writes issued. */
  tintWrites: number;
}

/**
 * One tile's blank-chart furniture: the vellum patch, the ruled hex, and — on a
 * sparse few — a serpent.
 *
 * Held per tile rather than in one flat list because the fog switches them a
 * tile at a time, which is the same reason the board's own instances are keyed
 * that way.
 */
interface ChartTile {
  /** The patch and the ghost ring: on exactly when the tile is hidden. */
  blank: InstanceHandle[];
  /** The serpent, when this tile drew one. See `settleSerpent`. */
  serpent: InstanceHandle | null;
  /** Whether the serpent is currently on the board. */
  serpentShown: boolean;
}

export class FogView {
  /** The blank-chart layer. Added to the scene by the renderer. */
  readonly group = new Group();

  private readonly map: GameMap;
  private readonly tiles: TileInstances;
  /** Shared edges indexed by each of their two tiles, so a diff can find them. */
  private readonly edgesByTile = new Map<number, SharedEdge[]>();
  /** Per tile, the blank-chart instances. Empty until `buildChart` has run. */
  private chart: ChartTile[] = [];
  /**
   * The handful of tiles that drew a serpent, so settling the marginalia is a
   * walk over a hundred-odd entries rather than over the map.
   */
  private serpentTiles: number[] = [];
  /**
   * The level every tile was last painted at, or −1 for "never painted".
   *
   * The whole of the incrementality: `apply` compares against this and touches
   * nothing else. −1 rather than `HIDDEN` so the first call paints the entire
   * board once — a board built and then never told anything would otherwise show
   * a fully-lit world with a fog layer that thought it had already agreed.
   */
  private painted: number[];
  private disposed = false;

  constructor(map: GameMap, tiles: TileInstances) {
    this.map = map;
    this.tiles = tiles;
    this.painted = new Array<number>(map.tiles.length).fill(-1);
    for (const edge of tiles.shared) {
      pushInto(this.edgesByTile, edge.a, edge);
      pushInto(this.edgesByTile, edge.b, edge);
    }
  }

  /**
   * Builds the blank-chart layer: one vellum patch and one ruled hex per tile,
   * plus a serpent on the hashed few.
   *
   * Built once per map — and once more if the icon atlas arrives after the board
   * did, which is the only reason this is a method rather than constructor work.
   * `icons` is null while the atlas is still rasterising (or forever, in a
   * browser with no 2D context), in which case the chart is ruled but has no
   * marginalia on it, exactly as the units stand untagged until their own atlas
   * lands.
   *
   * Everything is emitted at full scale and then switched off by the first
   * `apply`, rather than being emitted hidden: a buffer whose contents are the
   * artwork is a buffer a person can look at in a debugger.
   */
  buildChart(
    geometry: BoardGeometry,
    materials: MaterialLibrary,
    icons: TileIcons | null,
  ): void {
    disposeInstancedGroup(this.group);
    this.chart = [];
    this.serpentTiles = [];

    const period = wrapWidth(this.map);
    const collector = new InstanceCollector({
      copyOffsets: [-period, 0, period],
      snapshot: true,
    });

    const identity = new Quaternion();
    const unit = new Vector3(1, 1, 1);
    const serpentScale = new Vector3(
      BOARD.hexRadius * FOG.serpentSize,
      1,
      BOARD.hexRadius * FOG.serpentSize,
    );
    const y = chartY();

    for (const tile of this.map.tiles) {
      const centre = cellCenter(tile.col, tile.row);
      const blank: InstanceHandle[] = [];

      blank.push(
        collector.add(
          geometry.chartPatch,
          [FOG.chartColor],
          new Matrix4().compose(new Vector3(centre.x, y + FOG.chartLift, centre.z), identity, unit),
          // An ordinary depth-tested overlay, not the `onTop` kind: the blank
          // chart is *in* the diorama — a hex of table where a hex of world
          // would be — so a mountain standing on the tile next door has to be
          // able to hide part of it.
          { overlay: true, opacity: FOG.chartOpacity },
        ),
      );
      blank.push(
        collector.add(
          geometry.ghostRing,
          [FOG.ghostColor],
          new Matrix4().compose(new Vector3(centre.x, y + FOG.ghostLift, centre.z), identity, unit),
          { overlay: true, opacity: FOG.ghostOpacity },
        ),
      );

      let serpent: InstanceHandle | null = null;
      if (icons && hashUnit(tile.col, tile.row, SERPENT_STREAM) < FOG.serpentChance) {
        serpent = collector.add(
          geometry.serpentDecal,
          // No ink of its own: the mark *is* the texture. The colour list still
          // has to be something — see the same note on the unit badges.
          [],
          new Matrix4().compose(
            new Vector3(centre.x, y + FOG.serpentLift, centre.z),
            identity,
            serpentScale,
          ),
          { material: icons.standingMaterial },
        );
      }
      if (serpent) this.serpentTiles.push(tileIndex(this.map, tile.col, tile.row));
      this.chart.push({ blank, serpent, serpentShown: true });
    }

    collector.flush(this.group, materials, false);
    // Everything was emitted lit; the next `apply` decides what stays. Forcing a
    // full repaint is the honest way to say "this layer knows nothing yet".
    this.painted.fill(-1);
  }

  /**
   * Repaints the board for a new set of per-tile levels, touching only the tiles
   * that changed.
   *
   * `levels` is `state.visibility[seat]` — read, never kept: the caller owns it
   * and the simulation mutates it in place, so holding a reference would mean
   * diffing an array against itself. What is kept is `painted`, this layer's own
   * record of what it has actually drawn.
   *
   * The scan itself is one integer compare per tile, which is `O(tiles)` and
   * deliberately not `O(K)`. Taking the simulation's own delta instead would be
   * a shade faster and would tie this layer to a report it cannot get for the
   * case that matters most — a seat change, where the whole board moves and
   * there is no delta to hand. A compare per tile is a few microseconds on the
   * largest map this game has; a *write* per tile would not be, and writes are
   * what this stays proportional to.
   */
  apply(levels: readonly number[]): FogStats {
    if (this.disposed) return { tiles: 0, edges: 0, matrixWrites: 0, tintWrites: 0 };

    const matrixBefore = INSTANCE_WRITES.matrix;
    const tintBefore = INSTANCE_WRITES.tint;

    const edges = new Set<SharedEdge>();
    let changed = 0;

    for (let index = 0; index < this.painted.length; index++) {
      const level = levels[index] ?? HIDDEN;
      if (level === this.painted[index]) continue;
      this.painted[index] = level;
      changed += 1;

      this.paintTile(index, level);
      for (const edge of this.edgesByTile.get(index) ?? []) edges.add(edge);
    }

    for (const edge of edges) this.paintEdge(edge);
    // The marginalia last, and all of them: a serpent depends on a whole
    // *neighbourhood* being unexplored, so charting one hex can silence one up
    // to `serpentRegion` away. Walking the hundred-odd tiles that actually drew
    // one is cheaper than working out which of them a delta could have reached,
    // and it costs a write only where the answer genuinely flipped.
    if (changed > 0) {
      for (const index of this.serpentTiles) this.settleSerpent(index);
    }

    return {
      tiles: changed,
      edges: edges.size,
      matrixWrites: INSTANCE_WRITES.matrix - matrixBefore,
      tintWrites: INSTANCE_WRITES.tint - tintBefore,
    };
  }

  /** The level this layer believes a tile is at. For tests and the stats line. */
  paintedLevel(index: number): number {
    return this.painted[index] ?? -1;
  }

  /**
   * Every instance one tile owns, hidden or restored-and-tinted.
   *
   * The board's own instances and the blank chart are exact opposites — one is
   * on when the other is off — which is what makes "the world is drawn in as you
   * explore it" a matter of swapping two sets of matrices rather than of two
   * different renders.
   */
  private paintTile(index: number, level: number): void {
    const own = this.tiles.own.get(index);
    if (own) {
      if (level === HIDDEN) {
        for (const handle of own) InstanceCollector.hide(handle);
      } else {
        const wash = level === EXPLORED ? REMEMBERED : WATCHED;
        for (const handle of own) {
          InstanceCollector.restore(handle);
          InstanceCollector.setWash(handle, FOG.exploredWash, wash.mix, wash.shade);
        }
      }
    }

    const chart = this.chart[index];
    if (!chart) return;
    if (level === HIDDEN) {
      for (const handle of chart.blank) InstanceCollector.restore(handle);
    } else {
      for (const handle of chart.blank) InstanceCollector.hide(handle);
      // A serpent on a tile that is no longer blank is a serpent on the world.
      if (chart.serpentShown && chart.serpent) {
        InstanceCollector.hide(chart.serpent);
        chart.serpentShown = false;
      }
    }
  }

  /**
   * A river edge, judged by the pair of tiles it runs between: drawn while
   * either bank is charted, knocked back only when neither is watched.
   *
   * The level it is drawn at is the *better* of the two banks, which is the same
   * reading the geometry already takes — the ribbon lies at the lower of the two
   * tiles' top faces (see `addRivers`) — and the honest one: half of this water
   * is in sight, so the water is in sight.
   */
  private paintEdge(edge: SharedEdge): void {
    const best = Math.max(this.painted[edge.a] ?? HIDDEN, this.painted[edge.b] ?? HIDDEN);
    if (best === HIDDEN) {
      InstanceCollector.hide(edge.handle);
      return;
    }
    InstanceCollector.restore(edge.handle);
    // The water takes the wash exactly as the banks do; a bright river running
    // through washed-out ground would be the one thing that had not faded.
    const wash = best === VISIBLE ? WATCHED : REMEMBERED;
    InstanceCollector.setWash(edge.handle, FOG.exploredWash, wash.mix, wash.shade);
  }

  /** Switches one tile's serpent on or off, if it is not already right. */
  private settleSerpent(index: number): void {
    const chart = this.chart[index];
    if (!chart?.serpent) return;
    const wanted = this.serpentFits(index);
    if (wanted === chart.serpentShown) return;
    chart.serpentShown = wanted;
    if (wanted) InstanceCollector.restore(chart.serpent);
    else InstanceCollector.hide(chart.serpent);
  }

  /**
   * Is this tile deep enough in the unknown to be worth a monster?
   *
   * Its own hex and everything within `serpentRegion` of it must be hidden. That
   * is what makes the marginalia mass in the empty quarters of the chart rather
   * than speckling the frontier a scout has half-opened — a serpent beside a
   * charted coastline reads as a bug, and a serpent in the middle of nothing
   * reads as the chart it is drawn on.
   */
  private serpentFits(index: number): boolean {
    const tile = this.map.tiles[index];
    if (!tile) return false;
    for (const other of mapRange(this.map, tileHex(tile), FOG.serpentRegion)) {
      if ((this.painted[tileIndex(this.map, other.col, other.row)] ?? HIDDEN) !== HIDDEN) {
        return false;
      }
    }
    return true;
  }

  dispose(): void {
    this.disposed = true;
    disposeInstancedGroup(this.group);
    this.chart = [];
  }
}

function pushInto<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/**
 * How many instance slots a board's tile map actually accounts for.
 *
 * The failure fog is most exposed to is an *unregistered* instance: a piece of
 * scatter collected without naming its tile, which would then go on growing on a
 * hex the player has never seen. Nothing about the board's appearance gives that
 * away until somebody looks at a fully-hidden map and finds three trees on it.
 * So the accounting is exported and asserted rather than assumed — see
 * `test/fog3d.test.ts`, which compares this against the board's own
 * `instanceCount`.
 */
export function accountedInstances(tiles: TileInstances): number {
  let total = 0;
  for (const handles of tiles.own.values()) {
    for (const handle of handles) total += handle.count;
  }
  for (const edge of tiles.shared) total += edge.handle.count;
  return total;
}
