/**
 * The lenses: a second decal layer that answers one question about every tile at
 * once.
 *
 * Two of them today, and they are the two questions a player asks constantly and
 * currently answers by hovering tiles one at a time:
 *
 *   · **yields**  — what does this ground *make*? Pips in the interface's yield
 *                   voices, one per point, sat on the tile's own face.
 *   · **settler** — where can a city go, and where would I want one? Every tile
 *                   the reducer would refuse is darkened; every tile it would
 *                   accept is washed in a grade from pale to green by
 *                   `startScore`, the same desirability the map generator seats
 *                   the players with.
 *
 * Shared rules, not a second opinion
 * ----------------------------------
 * Validity comes from `foundingErrorAt` — the *reducer's* own rule, extracted so
 * that the lens and the `foundCity` command cannot disagree — and the yields
 * come from `tileYieldOf`, the function the citizens are assigned with. A lens
 * that painted its own idea of the rules would be worse than no lens: it would
 * be a promise the game breaks.
 *
 * Why a layer of its own
 * ----------------------
 * It is not in `overlays.ts` because the two rebuild on completely different
 * events. Overlays are torn down and rebuilt on every hover — many times a
 * second while the mouse moves — and a lens covering a whole map is a few
 * thousand instances. Rebuilding *that* per hover would be the one thing this
 * renderer refuses to do. A lens is rebuilt only when the lens itself changes,
 * or when the state under it changes in a way it is showing (borders, cities),
 * and never per frame.
 *
 * Instancing keeps the cost flat: every pip of one colour is one draw call
 * whether there are ten of them or ten thousand, and the site wash is quantised
 * into a handful of grades precisely so it stays a handful of buckets.
 */

import { Group, Matrix4, Quaternion, Vector3 } from 'three';

import { foundingErrorAt, tileYieldOf } from '../sim/cities';
import { type GameMap, type Tile, getTileAt } from '../sim/map';
import { startScore } from '../sim/startPositions';
import type { GameState } from '../sim/state';
import type { CellRef, LensView } from '../ui/mapView';

import type { BoardGeometry } from './board3d';
import { InstanceCollector, disposeInstancedGroup } from './instances';
import { cellCenter, tileTopY, wrapWidth } from './layout';
import { VIEW3D, mixColor } from './lookData';
import type { MaterialLibrary } from './toon';

const LENS = VIEW3D.lens;
const OVERLAY = VIEW3D.overlay;

/** The plain board: what the renderer starts with and falls back to. */
export const NO_LENS: LensView = { mode: 'none', cells: null, playerId: 0 };

/** Are two lens views asking for the same picture? */
export function sameLens(a: LensView, b: LensView): boolean {
  if (a.mode !== b.mode || a.playerId !== b.playerId) return false;
  if (a.cells === b.cells) return true;
  if (!a.cells || !b.cells) return false;
  if (a.cells.length !== b.cells.length) return false;
  for (let i = 0; i < a.cells.length; i++) {
    if (a.cells[i]!.col !== b.cells[i]!.col || a.cells[i]!.row !== b.cells[i]!.row) {
      return false;
    }
  }
  return true;
}

/** The three tile yields, in the order their rows are stacked on a tile. */
const YIELD_ROWS: readonly ['food' | 'production' | 'gold', number][] = [
  ['food', LENS.foodColor],
  ['production', LENS.productionColor],
  ['gold', LENS.goldColor],
];

export class LensLayer {
  readonly group = new Group();
  private drawCallCount = 0;

  /**
   * Rebuilds the whole layer. Cheap to call and never called per frame — see the
   * module docblock for what does call it.
   */
  build(
    state: GameState | null,
    lens: LensView,
    geometry: BoardGeometry,
    materials: MaterialLibrary,
  ): void {
    disposeInstancedGroup(this.group);
    this.drawCallCount = 0;
    if (!state || lens.mode === 'none') return;

    const { map } = state;
    const collector = new InstanceCollector({
      copyOffsets: [-wrapWidth(map), 0, wrapWidth(map)],
    });

    const tiles = resolveTiles(map, lens.cells);
    if (lens.mode === 'yields') this.addYieldPips(tiles, collector, geometry);
    else this.addSiteWash(state, lens.playerId, tiles, collector, geometry);

    this.drawCallCount = collector.flush(this.group, materials, false);
  }

  /**
   * A tile's yields as rows of pips, one row per yield that is not zero and the
   * rows centred as a group — so a 2/0/0 tile shows one row in the middle of the
   * hex rather than one row above an empty gap.
   *
   * Counting stops at `pipCap` and the last pip grows instead. Five identical
   * dots is a number nobody reads at a glance; four and a fat one is "four or
   * more", which is all the eye wanted.
   */
  private addYieldPips(
    tiles: readonly Tile[],
    collector: InstanceCollector,
    geometry: BoardGeometry,
  ): void {
    const identity = new Quaternion();
    const unit = new Vector3(1, 1, 1);
    const more = new Vector3(LENS.pipMoreScale, 1, LENS.pipMoreScale);

    for (const tile of tiles) {
      const value = tileYieldOf(tile);
      const rows = YIELD_ROWS.filter(([key]) => value[key] > 0);
      if (rows.length === 0) continue;

      const centre = cellCenter(tile.col, tile.row);
      const y = tileTopY(tile) + OVERLAY.lift;
      rows.forEach(([key, color], rowIndex) => {
        const amount = value[key];
        const shown = Math.min(amount, LENS.pipCap);
        const z = centre.z + (rowIndex - (rows.length - 1) / 2) * LENS.rowSpacing;
        for (let i = 0; i < shown; i++) {
          const x = centre.x + (i - (shown - 1) / 2) * LENS.pipSpacing;
          const capped = amount > LENS.pipCap && i === shown - 1;
          collector.add(
            geometry.pip,
            [color],
            new Matrix4().compose(new Vector3(x, y, z), identity, capped ? more : unit),
            { overlay: true, opacity: LENS.pipOpacity },
          );
        }
      });
    }
  }

  /**
   * The settler wash: refused tiles darkened, allowed tiles graded by how good a
   * capital they would make.
   *
   * The grade is relative to the tiles on screen rather than to an absolute
   * scale, because "the best ground *here*" is the question a player actually
   * has — an absolute ramp on a tundra map would paint the whole continent the
   * same discouraging colour. Scores are quantised into `siteSteps` grades so
   * the whole ramp costs a handful of instance buckets instead of one per tile.
   */
  private addSiteWash(
    state: GameState,
    playerId: number,
    tiles: readonly Tile[],
    collector: InstanceCollector,
    geometry: BoardGeometry,
  ): void {
    const identity = new Quaternion();
    const unit = new Vector3(1, 1, 1);

    const valid: { tile: Tile; score: number }[] = [];
    const invalid: Tile[] = [];
    for (const tile of tiles) {
      if (foundingErrorAt(state, playerId, tile) === null) {
        valid.push({ tile, score: startScore(state.map, tile) });
      } else {
        invalid.push(tile);
      }
    }

    const anchor = (tile: Tile): Vector3 => {
      const centre = cellCenter(tile.col, tile.row);
      return new Vector3(centre.x, tileTopY(tile) + OVERLAY.lift, centre.z);
    };

    for (const tile of invalid) {
      collector.add(
        geometry.territory,
        [LENS.siteInvalidColor],
        new Matrix4().compose(anchor(tile), identity, unit),
        { overlay: true, opacity: LENS.siteInvalidOpacity },
      );
    }

    if (valid.length === 0) return;
    let low = Infinity;
    let high = -Infinity;
    for (const entry of valid) {
      if (entry.score < low) low = entry.score;
      if (entry.score > high) high = entry.score;
    }
    const span = high - low;
    const steps = Math.max(1, LENS.siteSteps - 1);

    for (const { tile, score } of valid) {
      // A dead-flat range (one candidate, or a uniform map) grades to the top:
      // every one of them is the best there is.
      const t = span <= 0 ? 1 : (score - low) / span;
      const grade = Math.round(t * steps) / steps;
      collector.add(
        geometry.territory,
        [mixColor(LENS.siteLowColor, LENS.siteHighColor, grade)],
        new Matrix4().compose(anchor(tile), identity, unit),
        { overlay: true, opacity: LENS.siteOpacity },
      );
    }
  }

  get drawCalls(): number {
    return this.drawCallCount;
  }

  dispose(): void {
    disposeInstancedGroup(this.group);
  }
}

/** The tiles a lens covers: the named cells, or the whole map. */
function resolveTiles(map: GameMap, cells: readonly CellRef[] | null): Tile[] {
  if (!cells) return map.tiles;
  const tiles: Tile[] = [];
  for (const cell of cells) {
    const tile = getTileAt(map, cell.col, cell.row);
    if (tile) tiles.push(tile);
  }
  return tiles;
}
