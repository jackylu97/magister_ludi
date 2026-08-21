/**
 * The lenses: a second decal layer that answers questions about every tile at
 * once.
 *
 * Two things live here, and they are deliberately not the same kind of thing:
 *
 *   · the **yield pips** — what does this ground *make*? Pips in the interface's
 *                   yield voices, one per point, sat on the tile's own face.
 *                   They are a *switch*, not a lens: they sit on the face and
 *                   compete with nothing, so they can be up under any lens (see
 *                   `LensView.yields`, and the reasoning in `mapView.ts`).
 *   · the **settler lens** — where may a city go, and what kind of site is it?
 *                   Every tile the reducer would refuse is darkened. Every tile
 *                   it would accept is read for the two things that actually
 *                   decide where a capital goes: **blue** for a tile touching
 *                   the coast, **green** for a tile with fresh water, and a
 *                   ringed blend of the two for a tile with both. An estuary —
 *                   harbour and drinking water on one hex — is the premium site
 *                   in this game, and it is the one the eye should find first,
 *                   so it is the only grade that carries a ring as well as a
 *                   wash.
 *
 * Site semantics, not a desirability score
 * ----------------------------------------
 * This used to be a pale-to-green wash graded by `startScore`, the map
 * generator's own idea of a good start. It looked informative and told the
 * player almost nothing they could act on: a single number, relative to whatever
 * happened to be on screen, that answered "is this ground nice" rather than
 * "what would a city here *be*". Coast and fresh water are the two facts a
 * settler is actually deciding between, they are both binary, and a tile that
 * has both is worth a mark of its own.
 *
 * Shared rules, not a second opinion
 * ----------------------------------
 * Validity comes from `foundingErrorAt` — the *reducer's* own rule, extracted so
 * that the lens and the `foundCity` command cannot disagree — the yields come
 * from `tileYieldOf`, the function the citizens are assigned with, and fresh
 * water is asked of `hasFreshWater`, the one accessor for it. A lens that
 * painted its own idea of the rules would be worse than no lens: it would be a
 * promise the game breaks.
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
 * whether there are ten of them or ten thousand, and the site wash has exactly
 * four grades — refused, coastal, fresh, both — so it stays four buckets however
 * large the map is.
 */

import { Group, Matrix4, Quaternion, Vector3 } from 'three';

import { foundingErrorAt, tileYieldOf } from '../sim/cities';
import { type GameMap, type Tile, getTileAt, tileNeighbors } from '../sim/map';
import type { GameState } from '../sim/state';
import { hasFreshWater } from '../sim/water';
import type { CellRef, LensView } from '../ui/mapView';

import type { BoardGeometry } from './board3d';
import { InstanceCollector, disposeInstancedGroup } from './instances';
import { cellCenter, tileTopY, wrapWidth } from './layout';
import { VIEW3D, mixColor } from './lookData';
import type { MaterialLibrary } from './toon';

const LENS = VIEW3D.lens;
const OVERLAY = VIEW3D.overlay;

/** The plain board: what the renderer starts with and falls back to. */
export const NO_LENS: LensView = {
  mode: 'none',
  cells: null,
  yields: false,
  yieldCells: null,
  playerId: 0,
};

/** Are two cell restrictions the same? Identity first, then value. */
function sameCells(
  a: readonly CellRef[] | null,
  b: readonly CellRef[] | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.col !== b[i]!.col || a[i]!.row !== b[i]!.row) return false;
  }
  return true;
}

/** Are two lens views asking for the same picture? */
export function sameLens(a: LensView, b: LensView): boolean {
  if (a.mode !== b.mode || a.playerId !== b.playerId) return false;
  if (a.yields !== b.yields) return false;
  // A pip restriction only means anything while the pips are up; comparing it
  // when they are down would rebuild the layer for a change nobody can see.
  if (a.yields && !sameCells(a.yieldCells, b.yieldCells)) return false;
  return sameCells(a.cells, b.cells);
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
    if (!state) return;
    // Both halves are independent and either may be off; with both off there is
    // nothing to build and no collector worth allocating.
    if (lens.mode === 'none' && !lens.yields) return;

    const { map } = state;
    const collector = new InstanceCollector({
      copyOffsets: [-wrapWidth(map), 0, wrapWidth(map)],
    });

    // The wash first, so the pips are collected — and therefore drawn — after
    // the ground tint they sit on. Both are `onTop` decals with the depth test
    // off, so the order they are added in is the order they layer in.
    if (lens.mode === 'settler') {
      this.addSiteWash(state, lens.playerId, resolveTiles(map, lens.cells), collector, geometry);
    }
    if (lens.yields) {
      this.addYieldPips(resolveTiles(map, lens.yieldCells), collector, geometry);
    }

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
            { onTop: true, opacity: LENS.pipOpacity },
          );
        }
      });
    }
  }

  /**
   * The settler wash: refused tiles darkened, allowed tiles coloured by what
   * kind of site they are.
   *
   * Four states and no ramp (see the module docblock for why the old
   * desirability grade went):
   *
   *   · refused   — darkened, by the reducer's own rule.
   *   · coastal   — blue. A neighbouring `coast` tile: this city can reach the sea.
   *   · fresh     — green. `hasFreshWater`, so it can drink and grow.
   *   · both      — the two blended, plus a ring in the same ink at full
   *                 strength. A wash alone cannot say "this one is special" in a
   *                 field of washes; the ring can, and it costs one more bucket.
   *
   * A tile that is neither gets no mark at all. Silence is the honest answer for
   * ground that is merely legal, and it also keeps an inland map from being
   * painted edge to edge in a colour that means nothing.
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

    const anchor = (tile: Tile): Vector3 => {
      const centre = cellCenter(tile.col, tile.row);
      return new Vector3(centre.x, tileTopY(tile) + OVERLAY.lift, centre.z);
    };

    const estuary = mixColor(LENS.siteCoastColor, LENS.siteFreshColor, LENS.siteEstuaryMix);

    for (const tile of tiles) {
      if (foundingErrorAt(state, playerId, tile) !== null) {
        collector.add(
          geometry.territory,
          [LENS.siteInvalidColor],
          new Matrix4().compose(anchor(tile), identity, unit),
          { onTop: true, opacity: LENS.siteInvalidOpacity },
        );
        continue;
      }

      const coastal = isCoastal(state.map, tile);
      const fresh = hasFreshWater(tile);
      if (!coastal && !fresh) continue;

      const both = coastal && fresh;
      const color = both ? estuary : coastal ? LENS.siteCoastColor : LENS.siteFreshColor;
      const at = anchor(tile);
      collector.add(
        geometry.territory,
        [color],
        new Matrix4().compose(at, identity, unit),
        { onTop: true, opacity: both ? LENS.siteEstuaryOpacity : LENS.siteOpacity },
      );
      if (!both) continue;
      collector.add(
        geometry.ring,
        [color],
        new Matrix4().compose(at, identity, unit),
        { onTop: true, opacity: LENS.siteEstuaryRingOpacity },
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

/**
 * Does this tile touch the sea?
 *
 * `coast` specifically, not "any water": a lake is water a city cannot sail out
 * of, and it already speaks through fresh water. The test is on the neighbours
 * rather than on the tile itself because a city stands on land — the question is
 * whether it can put a harbour on the hex next door.
 */
function isCoastal(map: GameMap, tile: Tile): boolean {
  return tileNeighbors(map, tile).some((neighbor) => neighbor.terrain === 'coast');
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
