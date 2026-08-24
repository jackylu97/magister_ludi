/**
 * An arbitrary flat tint over named tiles: the territory wash with the
 * bookkeeping taken out.
 *
 * `TerritoryLayer` (`cities3d.ts`) answers exactly one question — who owns this
 * hex — and it reads `state.tileOwner` to answer it. A *lens* over some other
 * per-tile partition (which carved continent, which noise band, which region a
 * pass produced) wants the same decal, the same lift and the same opacity, and
 * has no business teaching the territory layer about a second data source. So
 * this is that decal, given a list of `{col, row, color}` and nothing else to
 * know.
 *
 * Deliberately the *territory* idiom rather than the overlay one: these are
 * scenery, not the game speaking. They keep the depth test (`overlay: true`, not
 * `onTop`), so a pine standing on a tinted hex still stands in front of the
 * tint, exactly as it does over a border. A continent lens that painted itself
 * over the trees would be a lens you cannot read the diorama through — and the
 * whole reason to look at a tinted map is to judge the ground under the tint.
 *
 * Built for the mapgen inspection page (`mapgen.html`) and reachable through
 * `Renderer3D.setTileTints`. Nothing in the game sets one today; if something
 * ever does, it composes with the territory wash rather than replacing it, since
 * the two are separate groups over the same faces.
 */

import { Group, Matrix4, Quaternion, Vector3 } from 'three';

import { type GameMap, getTileAt } from '../sim/map';

import type { BoardGeometry } from './board3d';
import { InstanceCollector, disposeInstancedGroup } from './instances';
import { cellCenter, tileTopY, wrapWidth } from './layout';
import { VIEW3D } from './lookData';
import type { MaterialLibrary } from './toon';

const OVERLAY = VIEW3D.overlay;

/** One hex and the ink to wash it in. `opacity` defaults to the layer's own. */
export interface TileTint {
  col: number;
  row: number;
  /** Packed 0xRRGGBB, the same form every other layer's colours take. */
  color: number;
  opacity?: number;
}

/**
 * How strongly a tint is laid on when it does not say.
 *
 * Low on purpose, and lower than the territory wash: a partition lens covers the
 * *whole* map rather than a handful of borders, so a value that reads well on
 * one country reads as paint over the world at that coverage. The terrain has to
 * stay legible underneath — the point of the lens is to compare the two.
 */
export const DEFAULT_TINT_OPACITY = 0.34;

export class TintLayer {
  readonly group = new Group();
  private drawCallCount = 0;

  /**
   * Rebuilds the whole wash. Called when the tint list is replaced and never per
   * frame — the same policy every instanced layer here follows.
   */
  build(
    map: GameMap,
    tints: readonly TileTint[],
    geometry: BoardGeometry,
    materials: MaterialLibrary,
  ): void {
    disposeInstancedGroup(this.group);
    this.drawCallCount = 0;
    if (tints.length === 0) return;

    const period = wrapWidth(map);
    const collector = new InstanceCollector({ copyOffsets: [-period, 0, period] });
    const identity = new Quaternion();
    const unit = new Vector3(1, 1, 1);

    for (const tint of tints) {
      const tile = getTileAt(map, tint.col, tint.row);
      if (!tile) continue;
      const centre = cellCenter(tint.col, tint.row);
      const at = new Vector3(centre.x, tileTopY(tile) + OVERLAY.lift, centre.z);
      collector.add(geometry.territory, [tint.color], new Matrix4().compose(at, identity, unit), {
        overlay: true,
        opacity: tint.opacity ?? DEFAULT_TINT_OPACITY,
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

/**
 * A readable, well-separated hue for partition member `index` of `count`.
 *
 * The golden-angle walk rather than an evenly spaced sweep: adjacent ids land
 * far apart on the wheel, which is what a partition lens needs — carved
 * continents are numbered by a BFS, so neighbours on the map are very often
 * neighbours in id, and an even sweep would give them near-identical hues. The
 * saturation and lightness alternate slightly so that two hues which do collide
 * on a large map still differ in weight.
 *
 * Returned packed 0xRRGGBB, which is the form every layer here takes its ink in.
 */
export function partitionColor(index: number, count: number): number {
  const golden = 0.618033988749895;
  const hue = count <= 0 ? 0 : (index * golden) % 1;
  const saturation = index % 2 === 0 ? 0.62 : 0.5;
  const lightness = index % 3 === 0 ? 0.56 : 0.46;
  return hslToPacked(hue, saturation, lightness);
}

/** HSL in 0..1 to packed 0xRRGGBB. The textbook conversion, nothing tuned. */
export function hslToPacked(h: number, s: number, l: number): number {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 1) + 1) % 1 * 6;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const byte = (value: number): number =>
    Math.max(0, Math.min(255, Math.round((value + m) * 255)));
  return (byte(r) << 16) | (byte(g) << 8) | byte(b);
}
