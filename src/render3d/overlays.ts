/**
 * The interaction vocabulary, drawn as flat decals on top of the board:
 * reachable tiles, the hovered route, the hover highlight and the selection
 * ring.
 *
 * These are the 3D counterpart of the 2D renderer's overlay canvas, and they
 * follow the same rule it does: an overlay is anchored to a tile's *face*, not
 * to the ground, so a highlight on a hill sits on the hill. Each decal is placed
 * at the tile's own jittered top plus a small lift, which is why a ring never
 * z-fights the tile it rings even though both are horizontal surfaces a
 * hundredth of a unit apart.
 *
 * They are unlit. A reachable tint that took the toon ramp would be three
 * different tints depending on which way the tile faced the sun, and a selection
 * ring that fell into shadow would be a selection ring you could not see.
 *
 * Rebuild policy
 * --------------
 * The whole layer is thrown away and rebuilt whenever the selection, the hover
 * or the reachable set changes — never per frame. That is a few hundred
 * instances at most (a unit with three movement points reaches perhaps thirty
 * tiles, times three wrap copies), and rebuilding is what keeps this layer
 * incapable of disagreeing with the state that produced it.
 */

import { Group, Matrix4, Quaternion, Vector3 } from 'three';

import { type GameMap, getTileAt } from '../sim/map';

import type { BoardGeometry } from './board3d';
import { InstanceCollector, disposeInstancedGroup } from './instances';
import { cellCenter, tileTopY, wrapWidth } from './layout';
import { VIEW3D } from './lookData';
import type { MaterialLibrary } from './toon';

const OVERLAY = VIEW3D.overlay;
const TERRITORY = VIEW3D.territory;

/** An offset cell an overlay can be anchored to. */
export interface CellRef {
  col: number;
  row: number;
}

export interface OverlayState {
  reachable: readonly CellRef[];
  path: readonly CellRef[];
  hover: CellRef | null;
  selection: CellRef | null;
  /**
   * Tiles the city under the pointer (or in the open panel) works, drawn as
   * small chips. Empty when no city is being looked at — it answers "where do
   * these yields come from?", and that is only a question while somebody is
   * asking it.
   */
  worked: readonly CellRef[];
  /**
   * The subset of `worked` the player has *pinned* (see `City.lockedTiles`):
   * drawn as a bigger chip inside a ring, so a citizen the player placed by
   * hand never looks like one the assignment happened to choose.
   *
   * Only honoured pins are passed in. A pin on a tile the city cannot currently
   * work is real state, but drawing a marker on a tile with nobody on it would
   * say the opposite of what is true.
   */
  locked: readonly CellRef[];
  /**
   * Move mode is armed (see `MapView.setMoveModeHighlight`): the selection ring
   * is drawn at full strength with a wider halo outside it, so the piece that is
   * about to take an order looks live.
   *
   * A brightening rather than an animated pulse, on purpose: this layer is
   * rebuilt on change and never per frame, and a pulse would mean waking the
   * render loop for as long as the player sat in move mode.
   */
  moveMode?: boolean;
}

/** How much wider than the selection ring the move-mode halo is drawn. */
const MOVE_MODE_HALO_SCALE = 1.28;
/** The halo's opacity. Under the ring's own, so it reads as a glow around it. */
const MOVE_MODE_HALO_OPACITY = 0.5;

export class OverlayLayer {
  readonly group = new Group();
  private drawCallCount = 0;

  /** Rebuilds every decal from scratch. See the module docblock. */
  build(
    map: GameMap,
    state: OverlayState,
    geometry: BoardGeometry,
    materials: MaterialLibrary,
  ): void {
    disposeInstancedGroup(this.group);

    const period = wrapWidth(map);
    const collector = new InstanceCollector({ copyOffsets: [-period, 0, period] });
    const identity = new Quaternion();
    const unit = new Vector3(1, 1, 1);

    /** World-space anchor a decal on this cell floats at. */
    const anchor = (cell: CellRef): Vector3 | null => {
      const tile = getTileAt(map, cell.col, cell.row);
      if (!tile) return null;
      const center = cellCenter(cell.col, cell.row);
      return new Vector3(center.x, tileTopY(tile) + OVERLAY.lift, center.z);
    };

    for (const cell of state.reachable) {
      const at = anchor(cell);
      if (!at) continue;
      collector.add(geometry.decal, [OVERLAY.reachableColor], new Matrix4().compose(at, identity, unit), {
        overlay: true,
        opacity: OVERLAY.reachableOpacity,
      });
    }

    for (let i = 0; i < state.path.length; i++) {
      const at = anchor(state.path[i]!);
      if (!at) continue;
      // The destination chip is fatter than the waypoints, which is how the
      // 2D renderer distinguishes them too — the eye needs to find the end of
      // the route without counting dots.
      const last = i === state.path.length - 1;
      const s = last ? OVERLAY.destinationScale : 1;
      collector.add(
        geometry.dot,
        [OVERLAY.pathColor],
        new Matrix4().compose(at, identity, new Vector3(s, 1, s)),
        { overlay: true, opacity: OVERLAY.pathOpacity },
      );
    }

    // Worked-tile chips: smaller than a path dot and in the same bone white, so
    // they read as marks on the board rather than as a route. A pinned tile
    // takes the accent colour and a ring instead — same place, same meaning
    // ("a citizen works here"), plus "and you said so".
    const pinned = new Set(state.locked.map((cell) => `${cell.col},${cell.row}`));
    for (const cell of state.worked) {
      const at = anchor(cell);
      if (!at) continue;
      const lockedHere = pinned.has(`${cell.col},${cell.row}`);
      const s = lockedHere ? TERRITORY.lockedScale : TERRITORY.workedScale;
      collector.add(
        geometry.dot,
        [lockedHere ? TERRITORY.lockedColor : TERRITORY.workedColor],
        new Matrix4().compose(at, identity, new Vector3(s, 1, s)),
        { overlay: true, opacity: TERRITORY.workedOpacity },
      );
      if (!lockedHere) continue;
      const ring = TERRITORY.lockedRingScale;
      collector.add(
        geometry.ring,
        [TERRITORY.lockedColor],
        new Matrix4().compose(at, identity, new Vector3(ring, 1, ring)),
        { overlay: true, opacity: TERRITORY.lockedRingOpacity },
      );
    }

    // Selection under hover: when a unit is selected and the cursor is over its
    // own tile, the hover ring is the one that should be visible, because it is
    // the one that tracks the mouse.
    for (const [cell, color] of [
      [state.selection, OVERLAY.selectionColor] as const,
      [state.hover, OVERLAY.hoverColor] as const,
    ]) {
      if (!cell) continue;
      const at = anchor(cell);
      if (!at) continue;
      const lit = state.moveMode === true && cell === state.selection;
      collector.add(geometry.ring, [color], new Matrix4().compose(at, identity, unit), {
        overlay: true,
        opacity: lit ? 1 : OVERLAY.ringOpacity,
      });
      if (!lit) continue;
      const halo = MOVE_MODE_HALO_SCALE;
      collector.add(
        geometry.ring,
        [color],
        new Matrix4().compose(at, identity, new Vector3(halo, 1, halo)),
        { overlay: true, opacity: MOVE_MODE_HALO_OPACITY },
      );
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
