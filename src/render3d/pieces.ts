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
 *
 * Two art styles, one layer
 * -------------------------
 * `units.style` in `data/view3d.json` chooses between the procedural piece and a
 * painted billboard (see `sprites3d.ts`). The switch is *per unit type*, not per
 * board: sprite mode draws a billboard for every type that has artwork and the
 * ordinary piece for every type that does not, so a settler standing beside a
 * painted warrior is the expected picture rather than a bug.
 *
 * Everything around the unit is shared by both paths and none of it knows which
 * is up: the selection ring is an overlay drawn by `overlays.ts` around the
 * *tile*, the HP bar is built here from the unit's own height, and movement
 * animation moves whatever visual the unit has (see `Renderer3D.spawnWalker`,
 * which builds a walking sprite through the same `buildSpriteUnit` this layer
 * uses). That is the whole point of keeping both paths alive — the experiment is
 * only worth anything if flipping it changes the look and nothing else.
 *
 * Billboards are not instanced, and that is fine. Each one carries its own
 * texture, so they could not share an `InstancedMesh` anyway, and a 4X has tens
 * of units where the board has tens of thousands of prisms: three meshes per
 * unit per wrap copy is a rounding error against a board that is already built.
 */

import { Group, type Material, Matrix4, Mesh, Quaternion, Vector3 } from 'three';

import type { GameMap } from '../sim/map';
import type { GameState, Unit } from '../sim/state';
import { type UnitTypeId, unitDef } from '../sim/unitData';

import { type BoardGeometry, pieceShapeFor } from './board3d';
import { hashSigned } from './hash';
import { type InstanceHandle, InstanceCollector, disposeInstancedGroup } from './instances';
import { cellCenter, tileTopY, wrapWidth } from './layout';
import { VIEW3D, playerPieceColor } from './lookData';
import type { UnitSprites } from './sprites3d';
import { type MaterialLibrary, computeHullNormals } from './toon';

const PIECE = VIEW3D.piece;
const HP = VIEW3D.hpBar;
const SPRITE = VIEW3D.units.sprite;
const STANDEE = SPRITE.standee;

/**
 * How tall a billboard stands, in world units.
 *
 * Expressed in the data as a multiple of a hex's *width* — the distance across
 * the flats, twice the circumradius — because that is the measure the eye
 * actually judges a figure against when it is standing on one.
 */
export const SPRITE_HEIGHT = SPRITE.heightInHexWidths * VIEW3D.board.hexRadius * 2;

/**
 * How tall this unit's visual is, which is the only thing the HP bar needs to
 * know about the art style.
 */
function unitVisualHeight(type: UnitTypeId, sprites: UnitSprites | null): number {
  return sprites?.materialFor(type) ? SPRITE_HEIGHT : PIECE.height;
}

/**
 * The yaw that turns a shape's local +x along the card's own left-to-right.
 *
 * The camera is fixed, so this is a constant for the life of the game, but it is
 * derived from the camera rather than written down: a rotation about +y by θ
 * sends (1, 0, 0) to (cos θ, 0, −sin θ), so matching the billboard's right
 * vector projected onto the ground is one `atan2`. Hard-coding it would be a
 * number that silently stopped being true the day somebody nudged
 * `camera.azimuth` in `view3d.json`.
 */
function cardYaw(faceCamera: Quaternion): number {
  const right = new Vector3(1, 0, 0).applyQuaternion(faceCamera);
  return Math.atan2(-right.z, right.x);
}

/**
 * One painted unit: the die-cut card, the foot it stands in, and the blob
 * shadow that plants the pair on the tile.
 *
 * Returned as a group whose origin is the unit's *feet*, so the caller places it
 * exactly the way it places a piece — and so the walking version can simply be
 * moved along a path.
 *
 * A standee, not a decal
 * ----------------------
 * The first pass stood the keyed art on a flat ring of player colour, and the
 * verdict on it was that it looked out of place and the perspective was wrong.
 * Both halves are the same complaint: a painted figure floating over a hex is
 * claiming to be a thing in the world, and it cannot honour that claim against a
 * board seen from 57° above. So it stopped claiming. The art is now printed —
 * die-cut with a parchment margin and an ink edge, in `sprites3d.ts` — and this
 * builds the rest of the object: a small moulded foot with a clip, in the
 * player's colour, toon-lit and outlined exactly like every carved piece on the
 * board. What stands on the tile is a tabletop standee, which is a thing that is
 * *allowed* to be flat, and which belongs beside toy houses.
 *
 * The foot replaced the ring rather than joining it. A ring under a figure is
 * one more decal; a base is an object, and it does the same identity job better
 * — flat player colour that survives being four pixels across, which is the
 * actual test — while also being the reason the card is standing up.
 *
 * The blob stays an ordinary depth-tested decal, deliberately *not* the `onTop`
 * kind the interface overlays use: it belongs to the figure standing on the
 * tile, so the figure and its foot have to be able to stand in front of it.
 */
export function buildSpriteUnit(
  geometry: BoardGeometry,
  materials: MaterialLibrary,
  spriteMaterial: Material,
  color: number,
  faceCamera: Quaternion,
): Group {
  const group = new Group();

  const blob = new Mesh(
    geometry.blob,
    materials.overlay(SPRITE.shadowColor, SPRITE.shadowOpacity),
  );
  blob.frustumCulled = false;
  group.add(blob);

  computeHullNormals(geometry.standee);
  const base = new Mesh(geometry.standee, materials.get(color));
  // Lifted clear of the blob decal: the two are coplanar at y = 0 otherwise,
  // and a depth-tested decal against a solid face is a z-fight.
  base.position.y = STANDEE.base.lift;
  base.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), cardYaw(faceCamera));
  base.frustumCulled = false;
  // Never casts. The blob under it is the shadow, and a real one from a disc
  // five hundredths of a hex thick would fight the decal for the same pixels.
  base.castShadow = false;
  base.receiveShadow = false;
  const shell = new Mesh(geometry.standee, materials.outline);
  shell.castShadow = false;
  shell.receiveShadow = false;
  shell.frustumCulled = false;
  base.add(shell);
  group.add(base);

  const billboard = new Mesh(geometry.billboard, spriteMaterial);
  billboard.position.y = SPRITE.lift;
  billboard.scale.set(SPRITE_HEIGHT, SPRITE_HEIGHT, 1);
  // The camera is fixed at one azimuth and one elevation for the life of the
  // game (see `camera3d.ts`), so facing it is a constant, applied once here.
  // No per-frame billboarding, and no `THREE.Sprite`.
  billboard.quaternion.copy(faceCamera);
  billboard.frustumCulled = false;
  group.add(billboard);

  return group;
}

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
  /** Billboard units, which are meshes rather than instances. See the docblock. */
  private spriteUnits = new Map<number, Group>();
  private hidden = new Set<number>();
  private drawCallCount = 0;

  /**
   * Rebuilds the whole layer from the state. Any hide requested before the
   * rebuild is reapplied afterwards, so an animation that spans a rebuild (a
   * move order landing while an earlier walk is still in flight) does not make
   * the piece it is animating pop back into existence at its destination.
   *
   * `sprites` is the loaded billboard set, or null in `pieces` style and while
   * the art is still loading. A unit whose type has no artwork takes the
   * procedural path whatever it is.
   */
  build(
    state: GameState,
    geometry: BoardGeometry,
    materials: MaterialLibrary,
    faceCamera: Quaternion,
    shadows: boolean,
    sprites: UnitSprites | null = null,
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
      const spriteMaterial = sprites?.materialFor(unit.type) ?? null;
      if (spriteMaterial) {
        const group = new Group();
        for (const dx of [-period, 0, period]) {
          const copy = buildSpriteUnit(
            geometry,
            materials,
            spriteMaterial,
            unitColor(state, unit),
            faceCamera,
          );
          copy.position.x = dx;
          group.add(copy);
        }
        group.position.copy(placement.position);
        this.group.add(group);
        this.spriteUnits.set(unit.id, group);
      } else {
        const handle = collector.add(
          geometry.pieces[pieceShapeFor(unit.type)],
          [unitColor(state, unit)],
          new Matrix4().compose(placement.position, placement.quaternion, scale),
        );
        this.handles.set(unit.id, handle);
      }

      this.addHpBar(
        unit,
        placement,
        unitVisualHeight(unit.type, sprites),
        geometry,
        collector,
        faceCamera,
      );
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
    visualHeight: number,
    geometry: BoardGeometry,
    collector: InstanceCollector,
    faceCamera: Quaternion,
  ): void {
    const maxHp = unitDef(unit.type).maxHp;
    const fraction = Math.max(0, Math.min(1, unit.hp / maxHp));
    if (fraction >= 1) return;

    // The quad's origin is its left edge, so the anchor is shifted half a bar
    // width along the camera's right vector to centre it over the piece. The
    // height it clears is the *visual's*, so the bar rides above a billboard
    // exactly as it rides above a game piece.
    const right = new Vector3(1, 0, 0).applyQuaternion(faceCamera);
    const anchor = placement.position
      .clone()
      .setY(placement.position.y + visualHeight + HP.lift)
      .addScaledVector(right, -HP.width / 2);

    collector.add(
      geometry.bar,
      [HP.backColor],
      new Matrix4().compose(anchor, faceCamera, new Vector3(HP.width, HP.height, 1)),
      // On top: a health bar behind a pine tree is a health bar nobody can read.
      { onTop: true, opacity: 1 },
    );
    // A hair nearer the eye than the backing, so the two never z-fight. Neither
    // writes depth and — being `onTop` — neither tests it either, so what puts
    // the fill in front is three's back-to-front sort of the transparent pass,
    // which this offset is what decides.
    const front = anchor.clone().addScaledVector(
      new Vector3(0, 0, 1).applyQuaternion(faceCamera),
      0.01,
    );
    collector.add(
      geometry.bar,
      [fraction > 0.5 ? HP.goodColor : HP.fillColor],
      new Matrix4().compose(front, faceCamera, new Vector3(HP.width * fraction, HP.height, 1)),
      { onTop: true, opacity: 1 },
    );
  }

  get drawCalls(): number {
    return this.drawCallCount;
  }

  /**
   * Takes a unit's resting visual off the board while something else draws it —
   * a walk in flight. Idempotent, and style-agnostic: an instanced piece is
   * zero-scaled, a billboard group is simply switched off.
   */
  hide(unitId: number): void {
    this.hidden.add(unitId);
    this.applyHide(unitId);
  }

  /** Puts a unit's resting visual back. Idempotent. */
  restore(unitId: number): void {
    if (!this.hidden.delete(unitId)) return;
    const handle = this.handles.get(unitId);
    if (handle) InstanceCollector.restore(handle);
    const sprite = this.spriteUnits.get(unitId);
    if (sprite) sprite.visible = true;
  }

  /** Forgets every hide, without touching the instances. Used before a rebuild. */
  clearHidden(): void {
    this.hidden.clear();
  }

  private applyHide(unitId: number): void {
    const handle = this.handles.get(unitId);
    if (handle) InstanceCollector.hide(handle);
    const sprite = this.spriteUnits.get(unitId);
    if (sprite) sprite.visible = false;
  }

  /**
   * Empties the layer.
   *
   * `disposeInstancedGroup` disposes the `InstancedMesh`es it made and clears
   * the group, which takes the billboard groups with it. Their parts are not
   * disposed here and must not be: the quad geometry belongs to `BoardGeometry`,
   * the sprite materials to `UnitSprites`, and the blob, base and outline
   * materials to the shared `MaterialLibrary` — every one of them outlives this
   * layer and is reused by the very next rebuild.
   */
  private disposeGroup(): void {
    disposeInstancedGroup(this.group);
    this.handles.clear();
    this.spriteUnits.clear();
  }

  dispose(): void {
    this.disposeGroup();
    this.hidden.clear();
  }
}
