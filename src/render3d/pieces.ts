/**
 * The units layer: game pieces at rest, and the HP bars over the hurt ones.
 *
 * Separate from the board because it has a completely different lifetime. The
 * board is built once per map and never changes; the pieces change after every
 * command — a move, a spawn, and later a death or a promotion — so this layer is
 * cheap to throw away and rebuild in full. At the scale a 4X reaches (tens of
 * units, hundreds late game) rebuilding an instance buffer is microseconds, and
 * a full rebuild cannot drift out of sync with the state the way incremental
 * patching can.
 *
 * The one thing it does patch in place is hiding: while a piece is sliding along
 * a walk, its resting instance is zero-scaled and a temporary standalone mesh
 * takes over (see `animation3d.ts` and the renderer). That has to be surgical,
 * because the alternative — rebuilding the layer every frame of every animation —
 * would rebuild every other piece sixty times a second to move one.
 *
 * HP bars
 * -------
 * Small quads, not sprites. The camera angle is fixed, so "face the camera" is a
 * constant rotation that can be baked into the instance matrix at build time;
 * `THREE.Sprite` would recompute the same fixed orientation per bar per frame
 * and cost a separate draw call each. They are drawn only for damaged units,
 * which keeps the common board — nobody hurt yet — completely free of them.
 */

import { Group, Matrix4, Quaternion, Vector3 } from 'three';

import type { GameMap } from '../sim/map';
import type { GameState, Unit } from '../sim/state';
import { unitDef } from '../sim/unitData';

import type { BoardGeometry } from './board3d';
import { hashSigned } from './hash';
import { type InstanceHandle, InstanceCollector, disposeInstancedGroup } from './instances';
import { cellCenter, tileTopY, wrapWidth } from './layout';
import { VIEW3D, playerPieceColor } from './lookData';
import type { MaterialLibrary } from './toon';

const PIECE = VIEW3D.piece;
const HP = VIEW3D.hpBar;

/** Where a piece stands, and how it is turned. Shared with the animation code. */
export interface PiecePlacement {
  position: Vector3;
  quaternion: Quaternion;
}

/**
 * The resting placement of a unit on its tile.
 *
 * `stackIndex` fans several units on one tile out around its centre, so a
 * warrior standing with a settler reads as two pieces rather than one clipping
 * through the other. Pieces face the camera-ish rather than a random direction:
 * a toy soldier pointing away from the viewer looks like a mistake, not a
 * variation.
 */
export function placePiece(map: GameMap, unit: Unit, stackIndex: number): PiecePlacement {
  const tile = map.tiles[unit.row * map.width + unit.col];
  const center = cellCenter(unit.col, unit.row);
  const angle = stackIndex * 2.1;
  const spread = stackIndex === 0 ? 0 : PIECE.stackSpread;
  return {
    position: new Vector3(
      center.x + Math.cos(angle) * spread,
      tile ? tileTopY(tile) : 0,
      center.z + Math.sin(angle) * spread,
    ),
    quaternion: new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      -0.6 + hashSigned(unit.col, unit.row, 40) * 0.5,
    ),
  };
}

/** The body colour a unit's piece is painted in. */
export function unitColor(state: GameState, unit: Unit): number {
  const player = state.players[unit.ownerId];
  return playerPieceColor(player?.color ?? '', unit.ownerId);
}

export class UnitLayer {
  readonly group = new Group();

  private handles = new Map<number, InstanceHandle>();
  private hidden = new Set<number>();
  private drawCallCount = 0;

  /**
   * Rebuilds the whole layer from the state. Any hide requested before the
   * rebuild is reapplied afterwards, so an animation that spans a rebuild (a
   * move order landing while an earlier walk is still in flight) does not make
   * the piece it is animating pop back into existence at its destination.
   */
  build(
    state: GameState,
    geometry: BoardGeometry,
    materials: MaterialLibrary,
    faceCamera: Quaternion,
    shadows: boolean,
  ): void {
    this.disposeGroup();

    const map = state.map;
    const period = wrapWidth(map);
    const collector = new InstanceCollector({
      copyOffsets: [-period, 0, period],
      keepMatrices: true,
    });

    const stackIndex = new Map<string, number>();
    const scale = new Vector3(1, 1, 1);

    for (const unit of state.units) {
      const key = `${unit.col},${unit.row}`;
      const index = stackIndex.get(key) ?? 0;
      stackIndex.set(key, index + 1);

      const placement = placePiece(map, unit, index);
      const handle = collector.add(
        geometry.pieces[unit.type],
        [unitColor(state, unit)],
        new Matrix4().compose(placement.position, placement.quaternion, scale),
      );
      this.handles.set(unit.id, handle);

      this.addHpBar(unit, placement, geometry, collector, faceCamera);
    }

    this.drawCallCount = collector.flush(this.group, materials, shadows);
    for (const unitId of this.hidden) this.applyHide(unitId);
  }

  /**
   * The bar over a damaged piece: a dark backing quad and a coloured fill in
   * front of it, both rotated to face the fixed camera.
   *
   * The bar is only drawn below full health, so a board where nothing has
   * fought yet carries no bars at all.
   */
  private addHpBar(
    unit: Unit,
    placement: PiecePlacement,
    geometry: BoardGeometry,
    collector: InstanceCollector,
    faceCamera: Quaternion,
  ): void {
    const maxHp = unitDef(unit.type).maxHp;
    const fraction = Math.max(0, Math.min(1, unit.hp / maxHp));
    if (fraction >= 1) return;

    // The quad's origin is its left edge, so the anchor is shifted half a bar
    // width along the camera's right vector to centre it over the piece.
    const right = new Vector3(1, 0, 0).applyQuaternion(faceCamera);
    const anchor = placement.position
      .clone()
      .setY(placement.position.y + PIECE.height + HP.lift)
      .addScaledVector(right, -HP.width / 2);

    collector.add(
      geometry.bar,
      [HP.backColor],
      new Matrix4().compose(anchor, faceCamera, new Vector3(HP.width, HP.height, 1)),
      { overlay: true, opacity: 1 },
    );
    // A hair nearer the eye than the backing, so the two never z-fight; the
    // overlay materials do not write depth, but they do test it.
    const front = anchor.clone().addScaledVector(
      new Vector3(0, 0, 1).applyQuaternion(faceCamera),
      0.01,
    );
    collector.add(
      geometry.bar,
      [fraction > 0.5 ? HP.goodColor : HP.fillColor],
      new Matrix4().compose(front, faceCamera, new Vector3(HP.width * fraction, HP.height, 1)),
      { overlay: true, opacity: 1 },
    );
  }

  get drawCalls(): number {
    return this.drawCallCount;
  }

  /** Zero-scales a unit's resting instances. Idempotent. */
  hide(unitId: number): void {
    this.hidden.add(unitId);
    this.applyHide(unitId);
  }

  /** Puts a unit's resting instances back. Idempotent. */
  restore(unitId: number): void {
    if (!this.hidden.delete(unitId)) return;
    const handle = this.handles.get(unitId);
    if (handle) InstanceCollector.restore(handle);
  }

  /** Forgets every hide, without touching the instances. Used before a rebuild. */
  clearHidden(): void {
    this.hidden.clear();
  }

  private applyHide(unitId: number): void {
    const handle = this.handles.get(unitId);
    if (handle) InstanceCollector.hide(handle);
  }

  private disposeGroup(): void {
    disposeInstancedGroup(this.group);
    this.handles.clear();
  }

  dispose(): void {
    this.disposeGroup();
    this.hidden.clear();
  }
}
