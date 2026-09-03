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
 * Badges, and what they moved
 * ---------------------------
 * Every unit also carries a floating roundel naming its type (`badges3d.ts`),
 * because the sculpts are per *class* now and a swordsman and a pikeman stand on
 * the same model. Two instanced quads per unit, batched by class and by player,
 * so the whole board's tags are a fixed handful of draws whatever the unit count.
 *
 * The HP bar moved up to make room. It rides above the badge rather than under
 * it — see `hpBarY` for the argument — which means the one number that decides
 * where a bar lands is still the unit's own visual height, and a bar is still
 * never in front of the thing it is reporting on.
 *
 * A worker's badge carries one thing more: a small numeral boss at its corner
 * naming `chargesLeft` (`addChargeBadge`). It is built from the tile atlas's
 * standing numerals rather than a badge cell of its own, and it is why
 * `chargesLeft` had to join `signUnits` — a charge spent changes nothing about
 * where a unit stands, so nothing else would ever have told this layer to
 * redraw the badge that names it.
 *
 * Two art styles, one layer
 * -------------------------
 * `units.style` in `data/view3d.json` chooses between the sculpted miniature and
 * a painted billboard (see `sprites3d.ts`). The switch is *per unit type*, not
 * per board: sprite mode draws a billboard for every type that has artwork and
 * the ordinary piece for every type that does not, so a settler standing beside
 * a painted warrior is the expected picture rather than a bug.
 *
 * The default is `pieces`. The standee experiment stays wired and stays tested,
 * because printed figures will earn their keep elsewhere, but what stands on the
 * board is a sculpt.
 *
 * The x-ray ghost
 * ---------------
 * Every unit is drawn twice: the honest solid piece, and — over the identical
 * instance matrices, one bucket later — a flat player-coloured silhouette with
 * an *inverted* depth test (`MaterialLibrary.silhouette`). The second pass draws
 * only where world geometry is already in front of the piece, so a warrior in a
 * forest shows a faint shape through the canopy and a warrior in the open costs
 * nothing at all: on every pixel where the solid render won, the ghost tests
 * equal rather than greater and is discarded.
 *
 * It is a *pass*, not a layer, and that is what keeps it cheap and in sync. The
 * collector builds it as one more `InstancedMesh` over the same buffers (the
 * outline shell's twin — see `Bucket.ghostMaterial`), so it costs one draw call
 * per existing piece bucket rather than one per unit, it cannot drift out of
 * position from the thing it is ghosting, and hiding a unit for a walk takes its
 * ghost with it. Fog needs no special case either: a unit the local seat cannot
 * see is never added, so its ghost never exists.
 *
 * The routed wash
 * ----------------
 * A caravan running a trade route reads as *busy*, not orderable (ruling,
 * 2026-08-28), and it says so by fading toward the same parchment tone
 * remembered ground fades toward — see `unitColor`. Per-instance *opacity*
 * is not something an instanced toon bucket has; the fog wash's per-instance
 * *tint* is, and `unitColor` spends it the cheap way: it mixes the caravan's
 * own ink toward the target once, before anything is built, so the sculpt
 * body, the x-ray ghost and the badge's rim all come out washed for free —
 * on both the resting instance and the walking copy, because both paths
 * build from that one function. The one part that mixing the ink cannot
 * reach is the outline shell, which is a single `MaterialLibrary` material
 * shared by every outlined piece on the board regardless of its own colour;
 * the resting instance's shell is washed on its own, per instance, by
 * `InstanceCollector.setShellWash` once `build`'s buffers exist, and the
 * walking copy's shell has no equivalent channel to write to and stays at
 * full strength for the length of the march. The badge's own printed disc —
 * a texture atlas cell, not ink — cannot be washed at all without greying
 * out the print, so it is left alone; the ring of ink around it washes with
 * everything else.
 *
 * Bases, not blobs
 * ----------------
 * Every miniature stands on a small disc in the player's colour, and that disc
 * is a *lit, shadow-casting object* — the same toon material and inverted-hull
 * outline as everything else on the board. So the pieces path deliberately does
 * not draw the blob-shadow decal the standees use. The blob exists because a
 * billboard is a plane with no underside and no shadow worth the name; a base
 * disc already puts a real, correctly-angled contact shadow on the tile, and a
 * painted ellipse under it would double up — two shadows from one light, one of
 * them pointing the wrong way. `geometry.blob` therefore stays a sprite-path
 * shape and nothing in `UnitLayer.build` reaches for it in pieces mode.
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

import { Group, type Material, Matrix4, Mesh, Quaternion, type Texture, Vector3 } from 'three';

import { GREAT_PERSON_IDS, type GreatPersonId } from '../sim/greatPeopleData';
import { chargesLeft, isBuilder } from '../sim/improvements';
import type { GameMap } from '../sim/map';
import { type GameState, type Unit, isBarbarian } from '../sim/state';
import type { TerrainId } from '../sim/terrainData';
import { UNIT_TYPE_IDS, type UnitTypeId, unitMaxHp } from '../sim/unitData';

import {
  type BadgeClass,
  type TileIcons,
  type UnitBadges,
  badgeCenterY,
  hpBarY,
} from './badges3d';
import {
  type BoardGeometry,
  badgeClassFor,
  pieceHeightFor,
  unitSculpt,
} from './board3d';
import { type FogLevels, seesCell } from './fog3d';
import type { UnitPiece } from './geometry';
import { hashSigned } from './hash';
import {
  type InstanceHandle,
  InstanceCollector,
  RENDER_ORDER,
  disposeInstancedGroup,
} from './instances';
import { cellCenter, tileTopY, wrapWidth } from './layout';
import { VIEW3D, playerPieceColor, shade } from './lookData';
import { atWar } from '../sim/wars';
import type { BadgeAnchor } from './picking';
import type { UnitSprites } from './sprites3d';
import { type MaterialLibrary, computeHullNormals } from './toon';

const PIECES = VIEW3D.pieces;
const HP = VIEW3D.hpBar;
const BADGE = VIEW3D.badges;
const SPRITE = VIEW3D.units.sprite;
const STANDEE = SPRITE.standee;

/**
 * The ink each of a sculpt's geometry groups is painted in, in group order.
 *
 * The body role takes the owner's colour and everything else a fixed palette
 * entry, which is the whole ownership-signalling argument in one line: a piece
 * is *the player's* because its figure and its base are, and its spear is wood
 * whoever is holding it. Returned as a plain array because that is exactly what
 * the instancer wants — it keys buckets on the colour list, so two warriors of
 * the same player share a bucket and two players' warriors do not.
 */
export function pieceColors(piece: UnitPiece, bodyColor: number): number[] {
  return piece.parts.map((part) => (part === 'body' ? bodyColor : PIECES.colors[part]));
}

/**
 * The material (or material array) a standalone mesh of a sculpt needs.
 *
 * Only the walking copies go through this — everything at rest is instanced —
 * but they have to match the resting piece exactly or a unit would change colour
 * the moment it started moving.
 */
export function pieceMaterials(
  materials: MaterialLibrary,
  piece: UnitPiece,
  bodyColor: number,
): Material | Material[] {
  const colors = pieceColors(piece, bodyColor);
  return colors.length === 1
    ? materials.get(colors[0]!)
    : colors.map((color) => materials.get(color));
}

/**
 * How tall a billboard stands, in world units.
 *
 * Expressed in the data as a multiple of a hex's *width* — the distance across
 * the flats, twice the circumradius — because that is the measure the eye
 * actually judges a figure against when it is standing on one.
 */
export const SPRITE_HEIGHT = SPRITE.heightInHexWidths * VIEW3D.board.hexRadius * 2;

/**
 * How tall this unit's visual is, which is the only thing the HP bar and the
 * badge need to know about the art style.
 *
 * Exported because the walking copies have to stack their tag at exactly the
 * height the resting instance does, and they are built by the renderer rather
 * than by this layer.
 */
export function unitVisualHeight(type: UnitTypeId, sprites: UnitSprites | null): number {
  return sprites?.materialFor(type) ? SPRITE_HEIGHT : pieceHeightFor(type);
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

  // The same card again, with the inverted depth test — the sprite path's half
  // of the x-ray ghost (module docblock). It carries the sprite's own texture so
  // `alphaTest` still cuts the figure out: what shows through a pine is the
  // *shape of the soldier*, not a rectangle. A child of the billboard, so it
  // inherits the position, the scale and the camera-facing turn and cannot come
  // apart from the card it is ghosting.
  const ghostMap = (spriteMaterial as { map?: Texture | null }).map ?? null;
  const ghost = new Mesh(geometry.billboard, materials.silhouette(color, ghostMap));
  ghost.frustumCulled = false;
  ghost.castShadow = false;
  ghost.receiveShadow = false;
  ghost.renderOrder = RENDER_ORDER.silhouette;
  billboard.add(ghost);

  return group;
}

/**
 * How far toward the eye the rim sits in front of the parchment it circles.
 *
 * The two are coplanar by construction and the parchment reaches a little way
 * under the rim on purpose (`badges.paperOverlap`), so without this the overlap
 * band is a z-fight. A hundredth of a hex is far below anything the ortho camera
 * can resolve as depth and far above the depth buffer's precision at this range.
 */
const RIM_NUDGE = 0.006;

/**
 * One unit badge as standalone meshes: the parchment disc and the ring of player
 * colour around it, both already lifted to float over a unit of `visualHeight`.
 *
 * Returned as a group whose origin is the unit's *feet*, exactly like
 * `buildSpriteUnit`, so the caller places it by saying where the unit stands.
 * Only walking copies and the Armory go through this — everything at rest is
 * instanced by `UnitLayer` — but they have to match the resting badge exactly,
 * or a unit's tag would jump the moment it started moving.
 */
export function buildBadge(
  geometry: BoardGeometry,
  materials: MaterialLibrary,
  badges: UnitBadges,
  badgeClass: BadgeClass,
  rimColor: number,
  faceCamera: Quaternion,
  visualHeight: number,
): Group {
  const group = new Group();
  const forward = new Vector3(0, 0, 1).applyQuaternion(faceCamera);
  const height = badgeCenterY(visualHeight);

  const disc = new Mesh(geometry.badgeIcons[badgeClass], badges.material);
  disc.position.y = height;
  disc.quaternion.copy(faceCamera);
  disc.scale.set(BADGE.diameter, BADGE.diameter, 1);
  disc.frustumCulled = false;
  disc.castShadow = false;
  disc.receiveShadow = false;
  // The same draw order the instanced badges claim (`RENDER_ORDER.badge`), for
  // the same reason and so that a unit's tag does not fall behind the selection
  // ring for exactly the length of a walk.
  disc.renderOrder = RENDER_ORDER.badge;
  group.add(disc);

  const rim = new Mesh(geometry.badgeRim, materials.overlay(rimColor, 1));
  rim.position.set(0, height, 0).addScaledVector(forward, RIM_NUDGE);
  rim.quaternion.copy(faceCamera);
  rim.scale.set(BADGE.diameter, BADGE.diameter, 1);
  rim.frustumCulled = false;
  rim.castShadow = false;
  rim.receiveShadow = false;
  rim.renderOrder = RENDER_ORDER.badge;
  group.add(rim);

  return group;
}

/**
 * How full this unit's bar is, or `null` when it does not get one.
 *
 * The one reading of "how hurt is it" on the whole board, so that the resting
 * instance and the walking copy can never disagree about a number the player is
 * comparing against **this piece's** maximum (`unitMaxHp`) and nothing else: a
 * bar measured against a hard-coded hundred is right for a warrior and wrong for
 * a knight, and one measured against the roster's sheet is wrong again for a
 * legion The Muster Roll stamped — which is exactly the shape of "the hover is
 * correct and the bar is not".
 *
 * The stamp is therefore **not** in the piece fingerprint (`signUnits`): what is
 * drawn is a *fraction*, so a stamped warrior at full health and a plain one at
 * full health are the same mark.
 */
export function hpBarFill(unit: Unit): number | null {
  const fraction = Math.max(0, Math.min(1, unit.hp / unitMaxHp(unit)));
  return fraction >= 1 ? null : fraction;
}

/**
 * How wide that fill is actually *drawn*, in world units — `hpBarFill`'s
 * sibling, and the only place the pip floor is applied.
 *
 * **A bar is only ever drawn over a living piece, so it must never read as
 * empty.** The fraction is exact and always has been; drawing it exactly is
 * what produced the fourth report (user, 2026-08-28: "it happened off screen
 * during a barbarian attack, and then when I went to the unit, the health bar
 * was empty"). A warrior that survives a barbarian at a few points of a hundred
 * asks for a quad a fifth of a pixel wide at the default zoom, and a quad no
 * pixel centre falls inside is not rasterised at all — while its backing, whose
 * width is a constant, is. Backing drawn, fill dropped: a bar with nothing in
 * it, over a unit that is alive. The floor (`hpBar.minFill`) is what makes
 * "alive" always draw *something*.
 *
 * One function rather than a `Math.max` at each of the two call sites, for
 * `hpBarFill`'s own reason: the resting instance and the walking copy must be
 * incapable of disagreeing about a number the player is reading off the board.
 * Clamped at the top as well, so the pip can never be wider than the bar it
 * sits in on a badly tuned `minFill`.
 */
export function hpBarFillWidth(fraction: number): number {
  return Math.min(HP.width, Math.max(HP.minFill, HP.width * fraction));
}

/**
 * The bar over a hurt piece as standalone meshes: the dark backing and the
 * coloured fill in front of it, already lifted to float over a unit of
 * `visualHeight`.
 *
 * `buildBadge`'s sibling, added for `buildBadge`'s reason and one the badge does
 * not have. A walking copy is built by the renderer rather than by this layer
 * (`Renderer3D.spawnWalker`), and until this existed it carried the piece and
 * the tag but *not the bar* — so every wounded unit went blank-headed for the
 * length of its march, and a turn resolution that marches half an army blanked
 * half the board's readouts at once. That is a bar that disagrees with the unit
 * sheet, which is the complaint (user, 2026-08-28: "the bar is incorrect when
 * multiple units are on screen").
 *
 * Returned as a group whose origin is the unit's *feet*, exactly like the badge
 * and the sprite, so the caller places it by saying where the unit stands. Null
 * at full health, because a bar is only drawn on somebody who is hurt — the same
 * rule `addHpBar` returns on, read from the same `hpBarFill`. Drawn at the same
 * `hpBarFillWidth`, so a piece cannot change how hurt it looks by starting to
 * walk.
 *
 * The fill claims `RENDER_ORDER.hpBarFill`, one step above the backing's
 * `RENDER_ORDER.hpBar` — the instanced pair's rule, applied here for the same
 * reason rather than by the same mechanism. These are standalone meshes a hair
 * apart in depth, so three's transparent sort would have got them right on its
 * own; naming the order anyway is what keeps the walking copy and the resting
 * one layered by one statement instead of by two different accidents.
 */
export function buildHpBar(
  geometry: BoardGeometry,
  materials: MaterialLibrary,
  faceCamera: Quaternion,
  visualHeight: number,
  fraction: number,
): Group {
  const group = new Group();
  const right = new Vector3(1, 0, 0).applyQuaternion(faceCamera);
  const forward = new Vector3(0, 0, 1).applyQuaternion(faceCamera);
  const anchor = new Vector3(0, hpBarY(visualHeight), 0).addScaledVector(right, -HP.width / 2);

  const quad = (color: number, width: number, nudge: number, order: number): Mesh => {
    const mesh = new Mesh(geometry.bar, materials.overlay(color, 1, true));
    mesh.position.copy(anchor).addScaledVector(forward, nudge);
    mesh.quaternion.copy(faceCamera);
    mesh.scale.set(width, HP.height, 1);
    // Never culled: a walker's bar is a sliver a couple of pixels tall whose
    // own bounding sphere is smaller than the piece under it, and a bar that
    // vanished a frame before its unit did would be the same "empty bar" read
    // from the other end.
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = order;
    return mesh;
  };

  group.add(quad(HP.backColor, HP.width, 0, RENDER_ORDER.hpBar));
  group.add(
    quad(
      fraction > 0.5 ? HP.goodColor : HP.fillColor,
      hpBarFillWidth(fraction),
      0.01,
      RENDER_ORDER.hpBarFill,
    ),
  );
  return group;
}

/** Where a piece stands, and how it is turned. Shared with the animation code. */
export interface PiecePlacement {
  position: Vector3;
  quaternion: Quaternion;
}

/**
 * The terrain a piece is standing on, or `undefined` off the edge of the map.
 *
 * The one thing `unitSculpt` needs that a `Unit` does not carry, hoisted here so
 * both layers that place a piece ask it the same way. Deliberately *not* a field
 * on the unit: what a piece is standing on is a fact about the board, the sim
 * has no reason to denormalise it, and the piece fingerprint already hashes
 * `col` and `row` — so a unit that steps onto the sea re-sculpts with no new
 * member in `signUnits`, which is the property this arrangement was chosen for.
 */
export function terrainUnder(map: GameMap, unit: Unit): TerrainId | undefined {
  return map.tiles[unit.row * map.width + unit.col]?.terrain;
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
  const spread = stackIndex === 0 ? 0 : PIECES.stackSpread;
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

/**
 * Which slot in its tile's stack each unit stands in, by unit id.
 *
 * The counting is trivial; sharing it is the point. `placePiece` fans a stack
 * out around the tile centre by this index, so anything that wants to know where
 * a piece — or the badge floating over it — actually *is* has to count the stack
 * exactly as the layer that drew it did. Two copies of "iterate `state.units`,
 * tally by cell" would agree right up until one of them was reordered, and the
 * symptom would be a badge whose click target sits beside it.
 *
 * `state.units` order is the state's own, so the answer is deterministic and a
 * rebuild puts every piece back where it was.
 */
export function unitStackIndices(state: GameState): Map<number, number> {
  const counts = new Map<string, number>();
  const indices = new Map<number, number>();
  for (const unit of state.units) {
    const key = `${unit.col},${unit.row}`;
    const index = counts.get(key) ?? 0;
    counts.set(key, index + 1);
    indices.set(unit.id, index);
  }
  return indices;
}

/**
 * Where one seat's badges float, in world space — every wrap copy of every one
 * of that player's units, ready to be hit-tested by `pickBadge`.
 *
 * The inverse of drawing them, and built from exactly the same three parts the
 * layer builds them from: the stack tally, `placePiece`, and `badgeCenterY` over
 * the unit's own visual height. Nothing here re-derives a position, because a
 * click target that agreed with the artwork *most* of the time would be worse
 * than none at all.
 *
 * `visualHeight` is a lookup rather than a `UnitSprites` handle: what a piece's
 * height depends on is which art style is up, that is the renderer's business,
 * and taking the answer as a function keeps this a pure function of the state.
 *
 * Only `playerId`'s units are returned — see `MapView.pickUnitBadge` for why the
 * ownership rule lives on this side of the boundary — and every unit contributes
 * three anchors, one per copy of the cylinder, exactly as the layer emits three
 * instances. A badge beside the seam is on screen in whichever copy the camera
 * is looking at, and the pointer must find it there.
 */
export function badgeAnchors(
  state: GameState,
  playerId: number,
  visualHeight: (type: UnitTypeId) => number,
): BadgeAnchor[] {
  const period = wrapWidth(state.map);
  const stackIndex = unitStackIndices(state);
  const anchors: BadgeAnchor[] = [];
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    const placement = placePiece(state.map, unit, stackIndex.get(unit.id) ?? 0);
    const y = placement.position.y + badgeCenterY(visualHeight(unit.type));
    for (const dx of [-period, 0, period]) {
      anchors.push({
        unitId: unit.id,
        x: placement.position.x + dx,
        y,
        z: placement.position.z,
      });
    }
  }
  return anchors;
}

/**
 * The parchment tone a routed caravan's ink is mixed toward — `fog.exploredWash`
 * itself, not a colour of this layer's own. Both fades say the same thing
 * ("read this, don't act on it"), so they earn the same tone rather than two
 * that would have to be kept in step by hand.
 */
const ROUTED_WASH_TARGET = VIEW3D.fog.exploredWash;

/**
 * The ink an enemy's piece is rimmed and ghosted in — `units.hostileGlow`, a
 * red of the board's own that is deliberately no seat's colour.
 */
const HOSTILE_GLOW = VIEW3D.units.hostileGlow;

/**
 * The seats this board's viewer is at war with, resolved once per build.
 *
 * Empty for the omniscient board (`seat === null`, which is every gallery and
 * both frozen 2D pipelines) and for a seat that has declared on nobody, which
 * is every game until somebody does. The **wild is in it** without a row, for
 * the reason `atWar` answers *true* for a barbarian without reading the
 * register: a raider has always been something you may hit, and the glow is the
 * board finally saying so.
 *
 * A `Set` is only ever asked `.has`, so nothing about the picture can depend on
 * its order.
 */
function hostileOwners(state: GameState, seat: number | null): ReadonlySet<number> {
  if (seat === null) return EMPTY_SEATS;
  const hostile = new Set<number>();
  for (const player of state.players) {
    if (player.id === seat) continue;
    if (atWar(state, seat, player.id)) hostile.add(player.id);
  }
  return hostile;
}

const EMPTY_SEATS: ReadonlySet<number> = new Set<number>();

/**
 * The war register's own fingerprint, folded into `signUnits`.
 *
 * A war changes how a piece is *drawn* without changing anything about the
 * piece, so without this the layer would keep the old rims until the next time
 * somebody moved — CLAUDE.md's fingerprint rule, met deliberately: a new
 * visual-affecting fact joins the hash on purpose, and this one is a fact about
 * the world rather than about a unit, so it is mixed in once beside the roster
 * length rather than per piece.
 *
 * The truces are **not** in it and must not be: a truce changes no rim (the war
 * is already over the moment the row leaves `state.wars`), and hashing an
 * expiry would rebuild every unit on the board once a turn for nothing.
 */
function signWars(state: GameState): number {
  let h = 2166136261 ^ state.wars.length;
  for (const war of state.wars) {
    h = Math.imul(h ^ war.a, 16777619);
    h = Math.imul(h ^ war.b, 16777619);
  }
  return h >>> 0;
}

/**
 * Is this piece busy running itself — a caravan carrying a route, or a unit
 * ranging ahead on auto-explore (2026-08-30)? The board's one reading of
 * *busy* rather than *orderable* (ruling, 2026-08-28), and both flags join it
 * by presence, exactly as `routeBit` and `exploreBit` (`signUnits`'s readers)
 * treat them: the leg or the aim changes turn to turn with no visual
 * consequence, so only whether the key exists is a question about what gets
 * *drawn*.
 */
function unitIsRouted(unit: Unit): boolean {
  return unit.trade !== undefined || unit.autoExplore === true;
}

/** `0xRRGGBB` mixed `mix` of the way toward `target`, channel by channel. */
function mixToward(color: number, target: number, mix: number): number {
  const cr = (color >> 16) & 255;
  const cg = (color >> 8) & 255;
  const cb = color & 255;
  const tr = (target >> 16) & 255;
  const tg = (target >> 8) & 255;
  const tb = target & 255;
  const r = Math.round(cr + (tr - cr) * mix);
  const g = Math.round(cg + (tg - cg) * mix);
  const b = Math.round(cb + (tb - cb) * mix);
  return (r << 16) | (g << 8) | b;
}

/**
 * `ink`, mixed toward the routed wash if this is a caravan running a route —
 * and `ink` unchanged otherwise. `pieces.routedWash` is the mix.
 */
function routedInk(unit: Unit, ink: number): number {
  return unitIsRouted(unit) ? mixToward(ink, ROUTED_WASH_TARGET, PIECES.routedWash) : ink;
}

/**
 * The body colour a unit's piece is painted in.
 *
 * **A routed caravan's ink is the washed colour, not the true one** — the
 * mechanism the ruling asks for, and the reason one function change reaches
 * three different pictures with no further plumbing. This is the single
 * reader `pieceColors` (the sculpt body), `materials.silhouette` (the x-ray
 * ghost, keyed on this same ink) and `addBadge` (the tag's rim) all go
 * through, on *both* paths that build a piece: `UnitLayer.build` for the
 * resting instance and `Renderer3D.spawnWalker` for the piece sliding along a
 * walk. So a caravan reads as busy whether it is standing still or mid-march,
 * with no second copy of the wash math sitting in the renderer.
 *
 * What this cannot wash is anything that is not keyed on ink: the outline
 * shell (every outlined piece on the board shares one `MaterialLibrary`
 * material regardless of its own colour — the resting instance's shell is
 * washed separately, per instance, by `InstanceCollector.setShellWash`; the
 * walker's shell has no per-instance channel to write to at all and stays at
 * full strength for the length of the march) and the badge's own printed
 * disc (a texture atlas cell — `InstanceCollector` refuses to tint any bucket
 * that carries a material of its own, on both `add`'s `tint` and `setWash`,
 * precisely so a wash can never grey out a roundel's print; see the module's
 * `Faint` trap in `CLAUDE.md`). The badge's *rim* is plain ink and washes
 * with everything else here.
 */
export function unitColor(state: GameState, unit: Unit): number {
  const player = state.players[unit.ownerId];
  const ink = playerPieceColor(player?.color ?? '', unit.ownerId);
  return routedInk(unit, ink);
}

export class UnitLayer {
  readonly group = new Group();

  /**
   * Every instance slot a unit owns: its sculpt, and the two halves of its
   * badge. A list rather than one handle because hiding a unit for a walk has
   * to take its tag off the board with it — a badge left hovering over an empty
   * tile while the piece slid away would be the most visible bug on the board.
   */
  private handles = new Map<number, InstanceHandle[]>();
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
   *
   * `badges` is the loaded roundel atlas, or null while it is still loading (or
   * if it failed). Badges are drawn for every unit in both styles: the model
   * class is what stands on the tile and the badge is what says which unit it
   * is, so a board without them is a board of anonymous tokens. `selectedUnitId`
   * only brightens one rim; it is part of the build rather than an overlay
   * because a badge belongs to its unit, and the layer is cheap to rebuild.
   *
   * `icons` is the *tile* atlas (`badges3d.ts`'s `TileIcons`, the same one the
   * lens prints yield glyphs and resource roundels from), asked for one more
   * thing here: the digit that bosses a worker's badge with its charges left
   * (see `addChargeBadge`). It is a second atlas rather than a reason to grow
   * the badge one — the numerals already exist for the lens, and a worker's
   * charge count is a number in the same voice a tile's yield count is.
   *

   * Fog
   * ---
   * `levels` is the local seat's visibility grid, or null for no fog. A unit is
   * drawn only where that seat is *currently watching* — `visible`, never merely
   * `explored`. That is the whole of "explored tiles remember terrain, not
   * armies": the ground is static and can be drawn from memory, a warrior is
   * not and cannot.
   *
   * Filtering here rather than patching instances is deliberate and is *not* the
   * thing the M8 perf constraint forbids. This layer is already rebuilt from
   * scratch every time any unit moves — far more often than fog changes — so a
   * fog-aware rebuild costs nothing that was not already being spent. The
   * constraint is about the **board**, which is thirty times larger and built
   * once per map (see `fog3d.ts`).
   *
   * The enemy glow
   * --------------
   * `seat` is the seat whose board this is — the same `localPlayerId` the fog
   * grid above belongs to, or null for the omniscient board the galleries draw.
   * Every piece belonging to a seat that seat is at war with is outlined and
   * ghosted in `units.hostileGlow` instead of its owner's ink, which is the
   * user's ruling of 2026-09-03 (see the field's docblock in `lookData.ts`).
   *
   * It is a **fact about the viewer**, not about the piece, and that is why it
   * is a parameter rather than something `unitColor` could answer: the same
   * warrior is hostile on one seat's screen and an ally's on another's. The
   * hostility is resolved once per build into a set of owner ids, `zocField`'s
   * bargain — the answer is a walk of the war register and asking it per piece
   * would be that walk per unit.
   */
  build(
    state: GameState,
    geometry: BoardGeometry,
    materials: MaterialLibrary,
    faceCamera: Quaternion,
    shadows: boolean,
    sprites: UnitSprites | null = null,
    badges: UnitBadges | null = null,
    selectedUnitId: number | null = null,
    levels: FogLevels = null,
    icons: TileIcons | null = null,
    seat: number | null = null,
  ): void {
    this.disposeGroup();

    const map = state.map;
    const period = wrapWidth(map);
    const collector = new InstanceCollector({
      copyOffsets: [-period, 0, period],
      keepMatrices: true,
      // A routed caravan's outline shell needs its own per-instance wash
      // (`InstanceCollector.setShellWash`, applied below once the buffers
      // exist) — the shell is one shared material for every piece on the
      // board, so giving one unit's rim of ink a fade nobody else's shares
      // needs the per-instance colour channel this turns on. Cheap: units
      // number in the tens to low hundreds, nothing like the board.
      forceTint: true,
    });

    // The same tally the badge hit test counts with, so a click target can
    // never drift off the piece it belongs to. See `unitStackIndices`.
    const stackIndex = unitStackIndices(state);
    const scale = new Vector3(1, 1, 1);
    // Handles this build wants washed once the instances exist — the sculpt's
    // outline shell and a damaged routed caravan's HP bar, both of which the
    // ink baked into `unitColor` cannot reach on its own. See the wash pass
    // after `flush` below and the `unitColor` docblock for what *is* reached
    // by the ink alone.
    const routedShellHandles: InstanceHandle[] = [];
    const routedBarHandles: InstanceHandle[] = [];
    // The enemy glow's own list, and the seat's enemies resolved once for the
    // whole build. See the docblock; `hostileSeats` is empty for the
    // omniscient board and for a seat that has declared on nobody, which is the
    // common case and costs one `Set.has` per piece.
    const hostileSeats = hostileOwners(state, seat);
    const hostileShellHandles: InstanceHandle[] = [];

    for (const unit of state.units) {
      // Out of sight. The stack tally above still counted it, and that is right:
      // where a piece stands in its tile's fan is a fact about the tile, so a
      // unit that steps out of the fog does not shuffle the ones beside it.
      if (!seesCell(levels, map, unit.col, unit.row)) continue;
      const placement = placePiece(map, unit, stackIndex.get(unit.id) ?? 0);
      const slots: InstanceHandle[] = [];
      this.handles.set(unit.id, slots);
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
        // `unitSculpt`, not `modelClassFor`: a piece's own situation chooses its
        // body twice over — a caravan carrying a route stands in a laden one,
        // and anything standing on water is a boat. The tile is passed rather
        // than the unit asked for it, because a `Unit` has no idea what it is
        // standing on and must not grow one (CLAUDE.md's fingerprint trap: `col`
        // and `row` are already hashed, so a piece that walks onto the sea
        // re-sculpts with no new hash member).
        const piece = geometry.pieces[unitSculpt(unit, terrainUnder(map, unit))];
        const ink = unitColor(state, unit);
        const hostile = hostileSeats.has(unit.ownerId);
        const pieceHandle = collector.add(
          piece.geometry,
          pieceColors(piece, ink),
          new Matrix4().compose(placement.position, placement.quaternion, scale),
          // The x-ray ghost, over these very matrices. Keyed on the player's
          // own ink — or on the war red, for a piece belonging to somebody this
          // seat has declared on — and either way the ghost material joins the
          // bucket key by identity, so a hostile piece batches into its own
          // bucket exactly as cleanly as a friendly one does.
          { ghost: materials.silhouette(hostile ? HOSTILE_GLOW : ink) },
        );
        slots.push(pieceHandle);
        if (unitIsRouted(unit)) routedShellHandles.push(pieceHandle);
        // The other half of the mark: the outline shell, which is one shared
        // material for every piece on the board and can therefore only be
        // reddened per instance, once the buffers exist. Exclusive with the
        // routed wash by construction — a caravan is a civilian and reads as
        // busy; a hostile *soldier* reads as dangerous — so the two lists never
        // hold the same handle and neither overwrites the other.
        if (hostile && !unitIsRouted(unit)) hostileShellHandles.push(pieceHandle);
      }

      const visualHeight = unitVisualHeight(unit.type, sprites);
      if (badges) {
        this.addBadge(
          state,
          unit,
          placement,
          visualHeight,
          geometry,
          collector,
          faceCamera,
          badges,
          unit.id === selectedUnitId,
          slots,
        );
        if (icons && isBuilder(unit)) {
          this.addChargeBadge(
            unit,
            placement,
            visualHeight,
            geometry,
            collector,
            faceCamera,
            icons,
            slots,
          );
        }
      }
      this.addHpBar(
        unit,
        placement,
        visualHeight,
        geometry,
        collector,
        faceCamera,
        slots,
        routedBarHandles,
      );
    }

    this.drawCallCount = collector.flush(this.group, materials, shadows);
    // The routed wash's shell-and-bar half — see `unitColor` for the half
    // that was already baked into the ink before any of this ran, and the
    // handle comments above for why these two specifically had to wait for
    // the buffers to exist.
    for (const handle of routedShellHandles) {
      InstanceCollector.setShellWash(handle, ROUTED_WASH_TARGET, PIECES.routedWash);
    }
    for (const handle of routedBarHandles) {
      InstanceCollector.setWash(handle, ROUTED_WASH_TARGET, PIECES.routedWash);
    }
    // And the enemy glow's shell half, on the same seam and for the same
    // reason: the outline is one material shared by every outlined piece, so a
    // rim of a different colour is a per-instance write that has to wait for
    // `flush` to have built the buffers.
    for (const handle of hostileShellHandles) {
      InstanceCollector.setShellWash(handle, HOSTILE_GLOW, VIEW3D.units.hostileGlowMix);
    }
    for (const unitId of this.hidden) this.applyHide(unitId);
  }

  /**
   * The tag over a piece: an atlas-carrying parchment disc and the ring of
   * player colour around it, both turned to face the fixed camera.
   *
   * Two instances rather than one because they batch differently and that is
   * the whole reason badges cost nothing per unit — see the `badges3d.ts`
   * docblock. The disc keys on the model class (one bucket per class, all eight
   * sharing a texture and a material), the rim keys on the player's ink (one
   * bucket per player). A board with fifty units and six classes draws the same
   * eight badge meshes as a board with six.
   *
   * **The wild is the one seat whose badge is not a seat colour.** A barbarian
   * warrior standing next to your own was reading as another empire's piece
   * (user, 2026-08-27), because it *is* a `Player` and so it was drawn like one.
   * It now takes the wild atlas — darkened parchment, oxblood mark — and an
   * oxblood rim, all three from `badges.wild*` in `data/view3d.json`. Asked of
   * `isBarbarian`, the sim's register for that seat (CLAUDE.md's `realPlayers`
   * rule, read from the other end), never of the seat's colour or its name.
   *
   * It costs nothing per unit for the reason everything else here does: the
   * material and the rim ink are both already part of the bucket key, so the
   * wild's pieces batch among themselves exactly as a nation's do, and a world
   * with no barbarians in it collects no wild bucket at all.
   *
   * Not `onTop`. A badge is a thing standing in the diorama and has to be hidden
   * by whatever hides its unit; the lift is what clears the sculpt's own head.
   * It does claim a draw order above the interface rings, which is a different
   * question from the depth test and is answered in `RENDER_ORDER`: a selection
   * ring drawn around a unit must not paint over the tag naming it.
   */
  private addBadge(
    state: GameState,
    unit: Unit,
    placement: PiecePlacement,
    visualHeight: number,
    geometry: BoardGeometry,
    collector: InstanceCollector,
    faceCamera: Quaternion,
    badges: UnitBadges,
    selected: boolean,
    slots: InstanceHandle[],
  ): void {
    const anchor = placement.position
      .clone()
      .setY(placement.position.y + badgeCenterY(visualHeight));
    const size = new Vector3(BADGE.diameter, BADGE.diameter, 1);
    const wild = isBarbarian(state, unit.ownerId);

    slots.push(
      collector.add(
        geometry.badgeIcons[badgeClassFor(unit.type)],
        // No ink of its own: the disc *is* the texture, and the material is the
        // shared atlas one. The colour list still has to be something, and an
        // empty one would collide in the bucket key with any other textured
        // shape that ever arrives. It names the paper the atlas was *printed*
        // on, so a nation's roundel and the wild's can never share a bucket even
        // if the two materials were ever made interchangeable.
        [wild ? BADGE.wildPaperColor : BADGE.paperColor],
        new Matrix4().compose(anchor, faceCamera, size),
        { material: badges.materialFor(wild), order: RENDER_ORDER.badge },
      ),
    );

    // The selected unit's rim is lifted a step toward white. Cheap in the exact
    // sense that matters: it is a different *colour*, so it lands in its own
    // bucket and costs one extra draw for the one selected unit, and nothing at
    // all on a board with no selection.
    //
    // The wild's rim is oxblood rather than its seat ink, and it still takes the
    // selection lift — a barbarian a player has clicked on is still the piece in
    // hand, and a selection that only worked on your own units would be the kind
    // of hole nobody notices until they are trying to read a stack.
    const ink = wild ? BADGE.wildRimColor : unitColor(state, unit);
    const rimColor = selected ? shade(ink, BADGE.selectedRimShade) : ink;
    const front = anchor
      .clone()
      .addScaledVector(new Vector3(0, 0, 1).applyQuaternion(faceCamera), RIM_NUDGE);
    slots.push(
      collector.add(
        geometry.badgeRim,
        [rimColor],
        new Matrix4().compose(front, faceCamera, size),
        // The rim travels with its disc: same draw order, so the two halves of
        // one badge can never end up on opposite sides of a ring.
        { overlay: true, opacity: 1, order: RENDER_ORDER.badge },
      ),
    );
  }

  /**
   * The worker's charge count: a small numeral boss at the badge's upper-right
   * corner, standing in front of the disc and its rim.
   *
   * Only ever called for a builder (`isBuilder`, checked by the caller), and it
   * draws `chargesLeft` clamped to a single digit — nothing in `data/units.json`
   * grants a worker ten charges, and a boss is not the place to grow a two-figure
   * count if one ever did; see `yieldRowLayout` for where that arithmetic
   * actually lives for the surface that needs it.
   *
   * Built from the *tile* atlas's numeral cells (`geometry.numeralMarkers`), not
   * a badge cell of its own: the digit is already drawn there for the lens, baked
   * onto its own parchment disc, so the badge grows a corner mark for free rather
   * than a tenth atlas set. `icons.standingMaterial` is the depth-tested half of
   * that atlas — the same one the resource markers stand on — because a charge
   * count is a token in the diorama and has to be hidden by a hill exactly as its
   * badge is.
   *
   * Positioned off the same `right`/`up` camera vectors the HP bar centres
   * itself with, offset both ways from the badge's own centre so the boss sits
   * outside the disc rather than over the icon it would otherwise cover, and
   * nudged forward past `RIM_NUDGE` so it never z-fights the rim it rides in
   * front of.
   */
  private addChargeBadge(
    unit: Unit,
    placement: PiecePlacement,
    visualHeight: number,
    geometry: BoardGeometry,
    collector: InstanceCollector,
    faceCamera: Quaternion,
    icons: TileIcons,
    slots: InstanceHandle[],
  ): void {
    const anchor = placement.position
      .clone()
      .setY(placement.position.y + badgeCenterY(visualHeight));
    const right = new Vector3(1, 0, 0).applyQuaternion(faceCamera);
    const up = new Vector3(0, 1, 0).applyQuaternion(faceCamera);
    const forward = new Vector3(0, 0, 1).applyQuaternion(faceCamera);
    const corner = BADGE.diameter * BADGE.chargeOffsetX;
    const rise = BADGE.diameter * BADGE.chargeOffsetY;
    const position = anchor
      .clone()
      .addScaledVector(right, corner)
      .addScaledVector(up, rise)
      .addScaledVector(forward, BADGE.chargeNudge);
    const size = new Vector3(BADGE.chargeDiameter, BADGE.chargeDiameter, 1);
    const digit = Math.max(0, Math.min(9, Math.round(chargesLeft(unit))));

    slots.push(
      collector.add(
        geometry.numeralMarkers[digit]!,
        [],
        new Matrix4().compose(position, faceCamera, size),
        { material: icons.standingMaterial, order: RENDER_ORDER.badge },
      ),
    );
  }

  /**
   * The bar over a damaged piece: a dark backing quad and a coloured fill in
   * front of it, both rotated to face the fixed camera.
   *
   * The bar is only drawn below full health, so a board where nothing has
   * fought yet carries no bars at all.
   *
   * **Both instances go into `slots`**, like every other part of a piece, and
   * the day they did not was the bug (user, 2026-08-26: "health bars bugged...
   * when there are 3 units adjacent to each other, the combat somehow modifies
   * the health bar of the third unit"). `slots` is `this.handles.get(unit.id)`
   * — the list `hide` and `restore` move — so a bar left out of it was a bar
   * that stayed lit over the hex a piece had walked out of. On a board where
   * three units stand adjacent, a bar hanging over an empty hex reads as
   * belonging to whichever piece is standing beside it, which is exactly the
   * "third unit's bar changed" the report describes. Nothing about combat was
   * wrong; the bar simply never left.
   *
   * The rule this is a case of: **every instance a piece is made of belongs to
   * that piece's slot list.** A visual added here without pushing its handle is
   * a visual `hide` cannot take off the board.
   *
   * `routedBarHandles` collects both quads when the bar belongs to a routed
   * caravan, for `build` to wash once the buffers exist (`unitColor`'s ink
   * cannot reach these: the bar's colours are fixed constants, not the
   * player's own ink, so there is no ink for the routed mix to ride on).
   */
  private addHpBar(
    unit: Unit,
    placement: PiecePlacement,
    visualHeight: number,
    geometry: BoardGeometry,
    collector: InstanceCollector,
    faceCamera: Quaternion,
    slots: InstanceHandle[],
    routedBarHandles: InstanceHandle[],
  ): void {
    // `hpBarFill`, not arithmetic of its own: the walking copy asks the same
    // function (`buildHpBar`), and two readings of "how hurt is it" would be two
    // answers the moment one of them was edited.
    const fraction = hpBarFill(unit);
    if (fraction === null) return;

    // The quad's origin is its left edge, so the anchor is shifted half a bar
    // width along the camera's right vector to centre it over the piece. The
    // height it clears is the *visual's* plus the badge stacked on top of it
    // (see `hpBarY`), so the bar rides above a billboard exactly as it rides
    // above a game piece, and above the tag in both cases.
    const right = new Vector3(1, 0, 0).applyQuaternion(faceCamera);
    const anchor = placement.position
      .clone()
      .setY(placement.position.y + hpBarY(visualHeight))
      .addScaledVector(right, -HP.width / 2);

    const routed = unitIsRouted(unit);
    const backHandle = collector.add(
      geometry.bar,
      [HP.backColor],
      new Matrix4().compose(anchor, faceCamera, new Vector3(HP.width, HP.height, 1)),
      // On top: a health bar behind a pine tree is a health bar nobody can read.
      // And above the badge it is stacked on, which is where it sits in the
      // world too — the bar may not be clipped by the disc under it.
      { onTop: true, opacity: 1, order: RENDER_ORDER.hpBar },
    );
    slots.push(backHandle);
    if (routed) routedBarHandles.push(backHandle);
    // A hair nearer the eye than the backing, so the two never z-fight.
    //
    // **The offset is not what puts the fill in front, and neither is the order
    // of these two `add` calls.** Both quads live in *instanced* buckets, and
    // three sorts the transparent pass by each `InstancedMesh`'s own world
    // position — which for every bucket in this layer is the group origin. Every
    // bar mesh therefore ties on depth, and the sort falls through to its last
    // term, the object id: the order `flush` happened to build the buckets in,
    // which is the order they were first claimed in. That comes out right today
    // and it is nobody's invariant — a rebuild that claimed the buckets the
    // other way round, or a fill collected before some future bar part, would
    // paint every fill on the board under its own backing and leave the whole
    // army reading as dead. So the layering is *stated*: the fill claims
    // `RENDER_ORDER.hpBarFill`, one above the backing, and the sort never
    // reaches the id at all. `test/render/pieces3d.test.ts` pins it against the
    // ids deliberately reversed.
    //
    // The width is `hpBarFillWidth`, not the raw fraction: see that function for
    // why an exactly-drawn fill is what a player reads as an empty bar.
    const front = anchor.clone().addScaledVector(
      new Vector3(0, 0, 1).applyQuaternion(faceCamera),
      0.01,
    );
    const fillHandle = collector.add(
      geometry.bar,
      [fraction > 0.5 ? HP.goodColor : HP.fillColor],
      new Matrix4().compose(
        front,
        faceCamera,
        new Vector3(hpBarFillWidth(fraction), HP.height, 1),
      ),
      { onTop: true, opacity: 1, order: RENDER_ORDER.hpBarFill },
    );
    slots.push(fillHandle);
    if (routed) routedBarHandles.push(fillHandle);
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
    for (const handle of this.handles.get(unitId) ?? []) InstanceCollector.restore(handle);
    const sprite = this.spriteUnits.get(unitId);
    if (sprite) sprite.visible = true;
  }

  /** Forgets every hide, without touching the instances. Used before a rebuild. */
  clearHidden(): void {
    this.hidden.clear();
  }

  private applyHide(unitId: number): void {
    for (const handle of this.handles.get(unitId) ?? []) InstanceCollector.hide(handle);
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

/**
 * A cheap order-sensitive fingerprint of everything about the units that this
 * layer draws: who they are, *what* they are, where they stand, how hurt they
 * are, since the worker charge badge how many charges they have left, and
 * whether a caravan is carrying a route.
 * FNV-1a over integers, so it allocates nothing per frame.
 *
 * The renderer rebuilds `UnitLayer` exactly when this changes (see
 * `Renderer3D.rebuildUnits`), which is what makes it the fingerprint the module
 * docblock's badge section and `CLAUDE.md`'s piece-fingerprint trap both mean:
 * any unit property that changes what gets *drawn* has to be hashed in here or
 * the board goes on showing the old picture. The type is in here because a unit
 * can change type without moving (a warrior upgraded to a swordsman in place —
 * see `upgradeUnits` in `tech.ts`), and `chargesLeft` is in here for the same
 * reason: a worker that spends a charge does not move, but its badge's corner
 * boss has to count down.
 *
 * `trade` is the newest member, and it is the one that was added for something
 * that *is* drawn. Presence, not contents: a caravan carrying a route stands in
 * a laden body with a gilt bale on its pack (`MiniSculpt.laden`, `unitSculpt`),
 * and an idle one does not — so a route assigned or run out changes the picture
 * on a piece that has not moved, which is `chargesLeft`'s case exactly. The
 * *route itself* is deliberately not hashed: `from`, `to`, `expiresTurn`,
 * `outbound` and `autoResend` all change without changing a pixel, and hashing
 * the leg would rebuild every piece on the board on the turn a caravan turned
 * round. Adding it was a decision rather than a drift — CLAUDE.md's piece
 * fingerprint trap — and `test/render/pieces3d.test.ts` reads this function's
 * source to keep the next one a decision too.
 *
 * `autoExplore` is the newest member (2026-08-30) and joins for `trade`'s
 * reason exactly: presence puts the piece in the routed wash — busy, not
 * orderable (`unitIsRouted`) — so a flag set or called back changes the
 * picture on a piece that has not moved. One bit (`exploreBit`), presence and
 * nothing else: the aim it holds is an ordinary `path`, which was never
 * hashed and must not start being.
 *
 * `person` is the member before it and the one that needs a sentence, because it
 * changes nothing that is drawn *today*: every great person wears one badge (see
 * `BadgeClass`) and stands on the settler's sculpt, so Archimedes and Imhotep
 * are the same picture. It is hashed anyway, and not out of tidiness — the state
 * docblock on `Unit.person` asks for it, and the reason it asks is that `person`
 * is the only thing that says *which piece this is*. A unit's type answers "what
 * can it do" and for a great person the answer is the same for all eighty; the
 * day a family earns its own mark — a general's badge over a citadel, say — the
 * fingerprint is already right, and getting that wrong is a board that goes on
 * drawing the old picture until something unrelated moves. One `imul` for a
 * property that is absent on all but a handful of units in a whole game.
 *
 * **The naval line added no member, and that is worth writing down** (2026-08-29)
 * because it is the first pass in a while that changed what a piece looks like
 * and did not touch this function. A hull's body is chosen by its `modelClass`
 * and its rig (`sculptFor` through `pieces.byUnitType`) and its badge by its rig
 * and canton (`badgeClassFor`), and all three of those are facts about the
 * **type** — which `type` already hashes, and hashes for precisely this reason:
 * a trireme that upgrades to a bireme in place, without moving, gets a new hull
 * and a new badge on the frame the type changes. Nothing about a ship varies
 * *per piece*. If a later pass gives one a per-piece fact that shows — a
 * damaged rig, a flagship pennant — that field joins this list, and it will be a
 * decision because the source test will stop compiling until it is.
 */
export function signUnits(state: GameState): number {
  let h = Math.imul(2166136261 ^ state.units.length, 16777619) ^ signWars(state);
  for (const unit of state.units) {
    h = Math.imul(h ^ unit.id, 16777619);
    h = Math.imul(h ^ unit.col, 16777619);
    h = Math.imul(h ^ unit.row, 16777619);
    h = Math.imul(h ^ unit.hp, 16777619);
    h = Math.imul(h ^ unit.ownerId, 16777619);
    h = Math.imul(h ^ (UNIT_TYPE_INDEX.get(unit.type) ?? -1), 16777619);
    h = Math.imul(h ^ chargesLeft(unit), 16777619);
    h = Math.imul(h ^ personIndex(unit), 16777619);
    h = Math.imul(h ^ routeBit(unit), 16777619);
    h = Math.imul(h ^ exploreBit(unit), 16777619);
  }
  return h >>> 0;
}

/** Unit types as small integers, so the fingerprint stays integer arithmetic. */
const UNIT_TYPE_INDEX = new Map<UnitTypeId, number>(
  UNIT_TYPE_IDS.map((id, index) => [id, index]),
);

/**
 * Great people as small integers, for `UNIT_TYPE_INDEX`'s reason.
 *
 * `-1` for the units that are nobody, which is nearly all of them: absence is
 * the state on `Unit.person`, so the fingerprint has to have a value for "not a
 * great person" that no roster row can collide with.
 */
const GREAT_PERSON_INDEX = new Map<GreatPersonId, number>(
  GREAT_PERSON_IDS.map((id, index) => [id, index]),
);

function personIndex(unit: Unit): number {
  return unit.person === undefined ? -1 : (GREAT_PERSON_INDEX.get(unit.person) ?? -1);
}

/**
 * Is this piece carrying a route? One bit, for `personIndex`'s reason and one
 * more: a *predicate* keeps the fingerprint's source readable as a list of
 * properties, which is the form the pin test in `pieces3d.test.ts` reads it in.
 *
 * Presence and nothing else — see the docblock on `signUnits` for why the leg
 * inside `Unit.trade` is deliberately not in the hash.
 */
function routeBit(unit: Unit): number {
  return unit.trade === undefined ? 0 : 1;
}

/**
 * Is this piece ranging ahead on its own? One bit, `routeBit`'s twin in every
 * respect: presence and nothing else, and a predicate so the fingerprint's
 * source stays a list of properties — the form the pin test reads it in.
 */
function exploreBit(unit: Unit): number {
  return unit.autoExplore === undefined ? 0 : 1;
}
