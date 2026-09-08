/**
 * The interaction vocabulary, drawn as flat decals on top of the board:
 * reachable tiles, the hovered route, the turn medallions along it, the hover
 * highlight and the selection ring.
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
 * Nothing on the board may hide them
 * ----------------------------------
 * Every decal in this layer is added with `onTop`, which drops the depth test
 * and draws it after all board geometry (see `MaterialLibrary.overlay` and the
 * render orders in `instances.ts`). These are the game talking to the player,
 * not scenery: a route dot behind a pine tree, a worked-tile ring inside a
 * jungle or a selection ring cut in half by a mountain cone are all the same
 * bug, and it is the one the depth test was quietly causing. The cost is that a
 * decal can be drawn over a piece standing on a *neighbouring* tile, since a
 * piece leans up-screen into the tile behind it; that is a fair trade for marks
 * the player can always read, and it is why the territory tint — which is
 * scenery — deliberately does not do this.
 *
 * One thing does draw over them, and it is not scenery either: the unit badges
 * claim a later draw order (`RENDER_ORDER.badge`). A ring is a mark on the
 * ground *under* a piece, so a ring that painted over the tag naming that piece
 * would be this rule taken one step too far — "nothing on the board may hide a
 * ring" was never meant to include the interface's own labels.
 *
 * Rebuild policy
 * --------------
 * The whole layer is thrown away and rebuilt whenever the selection, the hover
 * or the reachable set changes — never per frame. That is a few hundred
 * instances at most (a unit with three movement points reaches perhaps thirty
 * tiles, each now carrying a wash *and* a rim, times three wrap copies), and
 * rebuilding is what keeps this layer incapable of disagreeing with the state
 * that produced it. Two instances per reachable hex is still two buckets for the
 * whole set, because both are keyed on one colour apiece.
 *
 * The medallions are the one thing here that is a *printed* mark rather than
 * flat ink — a cell of the tile atlas, like a yield glyph (see `badges3d.ts`).
 * They cost one bucket per number on screen per voice — a bucket is keyed on
 * its geometry and its material, and a medallion's number *is* its geometry
 * (one atlas cell each) while its voice is its material (two: the proposal's
 * and the decision's). A ten-turn march is ten instances in ten buckets, which
 * is nothing beside the reachable set rebuilt beside it, and there is no
 * arrangement that batches them: they are ten different pictures. They are
 * drawn only once the atlas has rasterised, and the
 * board is told which hexes wear them — never asked to work it out.
 */

import { Group, Matrix4, Quaternion, Vector3 } from 'three';

import { type GameMap, getTileAt } from '../sim/map';

import { MEDALLION_CELLS, type TileIcons, medallionIdFor } from './badges3d';
import type { BoardGeometry } from './board3d';
import { InstanceCollector, RENDER_ORDER, disposeInstancedGroup } from './instances';
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

/**
 * A hex a march comes to rest on at the end of a turn, and which turn that is —
 * one **turn medallion**.
 *
 * Structurally `PathTurnMark` (`sim/pathfind.ts`), which is where the answer
 * comes from, and stated again here for the reason `CellRef` is: this layer is
 * told *what to draw* and never asks the simulation anything. The renderer does
 * not know that `pathTurns` exists, and must not — a board that re-derived a
 * march's length would be a second opinion about a number the unit sheet is
 * already printing.
 */
export interface TurnMarkRef extends CellRef {
  /** Turns from now, counting `pathTurns`' way: the first rest is 1. */
  turn: number;
}

export interface OverlayState {
  reachable: readonly CellRef[];
  path: readonly CellRef[];
  /**
   * The selected unit's *stored* order — the tiles end-of-turn resolution will
   * walk it through (see `MapView.setCommittedPath`).
   *
   * Drawn as a dashed run of small, dim chips, deliberately unlike `path`: one
   * is a proposal the cursor is making right now, the other is a decision the
   * player already took, and both are on screen at once every time somebody
   * hovers a new destination for a marching unit.
   */
  committed: readonly CellRef[];
  /**
   * The hexes the hovered route comes to rest on, one per turn of the march,
   * with the turn each one is (`MapView.setPathPreview`'s second argument).
   *
   * The legibility half of the standing-orders ruling (`docs/flags.md` (bbb),
   * the user 2026-09-08: *"queuing a movement should display badges showing how
   * many turns until the destination, and where the unit will be on each
   * turn"*). The dots say which way; these say *when*, which is the question a
   * multi-turn march actually raises now that one is walked a turn at a time.
   *
   * Optional like `route` and `attackable`: a caller with nothing to say about
   * a route's length — the overlay tests, a gallery harness — says nothing, and
   * the medallions simply are not drawn.
   */
  pathMarks?: readonly TurnMarkRef[];
  /** The same for the committed route, drawn quieter. See `committed`. */
  committedMarks?: readonly TurnMarkRef[];
  /**
   * The road a caravan would walk to a candidate town — the send-mode hover
   * preview.
   *
   * A *third* route on this layer, and the reason it is not `path` with a
   * different colour is that it answers a different question. `path` is "if I
   * click here, this piece walks that way"; this is "if I send this caravan
   * there, here is the run it will shuttle for twenty turns" — a route that will
   * outlive the click by a whole era and pay a town every turn of it. It is
   * drawn in the gilt this world reserves for things worth something
   * (`OverlaySpec.routeColor`), dashed like a road rather than solid like a
   * march, and it is on screen at the same time as both of the others.
   *
   * Optional, like `attackable` and `siteRadius`: a caller with nothing to say
   * about trade says nothing.
   */
  route?: readonly CellRef[];
  /**
   * Tiles the selected unit could attack this turn — an enemy piece or town
   * within reach of its sword or its bow.
   *
   * A separate set from `reachable` rather than a flavour of it, because they
   * are answers to two different questions and a tile can be in both: an enemy
   * standing on ground you could also have walked to. Drawn first and quietest,
   * so that where the two overlap the fight is what the tint says.
   *
   * Optional, like `moveMode`: a caller that has nothing to say about combat
   * (the existing overlay tests, a renderer harness) says nothing.
   */
  attackable?: readonly CellRef[];
  hover: CellRef | null;
  selection: CellRef | null;
  /**
   * The work radius a city founded on the hovered hex would have — the settler
   * lens's hover preview, and empty whenever that lens is not up.
   *
   * It lives in *this* layer rather than in `lens3d.ts` for the one reason that
   * decides where anything on this board lives: what rebuilds it. The lens
   * covers a whole map in a few thousand instances and is rebuilt only when the
   * lens itself changes; this set changes on every mouse move, and rebuilding
   * the lens per hover is the one thing that renderer refuses to do (see the
   * docblock in `lens3d.ts`). The overlay layer is already torn down and rebuilt
   * on every hover, and thirty-seven chips times three wrap copies is nothing
   * beside the reachable set it rebuilds beside them.
   *
   * Which cells those are is `src/ui/controls.ts`'s answer, asked of
   * `mapRange` at the rules' own `workRadius` and cut at the fog — the board is
   * told *what to draw*, never *why*, exactly as it is for the reachable set and
   * the worked tiles.
   *
   * Optional, like `attackable`: a caller with nothing to say about settling
   * (the overlay tests, a gallery harness) says nothing.
   */
  siteRadius?: readonly CellRef[];
  /**
   * Tiles the city under the pointer (or in the open panel) works, drawn as
   * small chips. Empty when no city is being looked at — it answers "where do
   * these yields come from?", and that is only a question while somebody is
   * asking it.
   */
  worked: readonly CellRef[];
  /**
   * The subset of `worked` the player has *pinned* (see `City.lockedTiles`):
   * its ring takes the player's colour instead of bone white, so a citizen the
   * player placed by hand never looks like one the assignment happened to
   * choose.
   *
   * Only honoured pins are passed in. A pin on a tile the city cannot currently
   * work is real state, but drawing a marker on a tile with nobody on it would
   * say the opposite of what is true.
   */
  locked: readonly CellRef[];
  /**
   * The local seat's piece colour, for the pinned rings. Optional because the
   * callers that have no seat (the overlay tests, gallery harnesses) have no
   * player to take a colour from; the data-file accent stands in.
   */
  lockedColor?: number;
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

/**
 * The medallion quad for one turn number: the atlas cell `medallionIdFor`
 * chooses, looked up in the board's own array of them.
 *
 * Two lookups keyed by the same list (`MEDALLION_CELLS`) and therefore written
 * in one place, because they are one fact — an index here is a texture
 * coordinate, and a route eleven turns long has to reach the ceiling's cell
 * rather than fall off the end of the array.
 */
function medallionGeometry(geometry: BoardGeometry, turn: number) {
  const index = MEDALLION_CELLS.indexOf(medallionIdFor(turn));
  return index < 0 ? undefined : geometry.medallions[index];
}

export class OverlayLayer {
  readonly group = new Group();
  private drawCallCount = 0;

  /** Rebuilds every decal from scratch. See the module docblock. */
  build(
    map: GameMap,
    state: OverlayState,
    geometry: BoardGeometry,
    materials: MaterialLibrary,
    icons: TileIcons | null = null,
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

    // The prospective city's ground, under everything else in this layer: it is
    // the quietest thing here and the only one that is not about the piece in
    // hand, so a reachable tint or a route chip printed over it wins the tile,
    // which is the right way round. Small chips rather than a full-bleed wash —
    // see `OverlayState.siteRadius` and the tunables' own note.
    for (const cell of state.siteRadius ?? []) {
      const at = anchor(cell);
      if (!at) continue;
      const s = OVERLAY.siteRadiusScale;
      collector.add(
        geometry.decal,
        [OVERLAY.siteRadiusColor],
        new Matrix4().compose(at, identity, new Vector3(s, 1, s)),
        { onTop: true, opacity: OVERLAY.siteRadiusOpacity },
      );
    }

    // The reachable set: a wash *and* a rim, and the rim is the half that is
    // actually read. A wash on its own has no edge — on grass beside sand its
    // boundary is wherever the eye decides the tint stopped — which is why the
    // highlight was "too subtle" (user, 2026-08-27) at any opacity anybody was
    // willing to lay over terrain. One rim per hex rather than an outline around
    // the region: the answer a player wants is "how many steps", and a set of
    // drawn hexes can be counted where a blob can only be judged. See
    // `OverlaySpec.reachableRimColor`.
    for (const cell of state.reachable) {
      const at = anchor(cell);
      if (!at) continue;
      collector.add(geometry.decal, [OVERLAY.reachableColor], new Matrix4().compose(at, identity, unit), {
        onTop: true,
        opacity: OVERLAY.reachableOpacity,
      });
      collector.add(
        geometry.reachRing,
        [OVERLAY.reachableRimColor],
        new Matrix4().compose(at, identity, unit),
        { onTop: true, opacity: OVERLAY.reachableRimOpacity },
      );
    }

    // The attack tint, over the reachable wash rather than under it: a tile that
    // is both walkable and defended is a tile you should read as a fight.
    for (const cell of state.attackable ?? []) {
      const at = anchor(cell);
      if (!at) continue;
      collector.add(geometry.decal, [OVERLAY.attackColor], new Matrix4().compose(at, identity, unit), {
        onTop: true,
        opacity: OVERLAY.attackOpacity,
      });
    }

    // The committed route, under the preview: every `committedStride`-th
    // waypoint only, so the run reads as a dashed line rather than as a second,
    // fainter route. The final tile is always drawn — the destination is the
    // whole point of showing the order at all — and it is not enlarged the way
    // the preview's is, because this route is not the one being aimed.
    for (let i = 0; i < state.committed.length; i++) {
      const last = i === state.committed.length - 1;
      if (!last && i % OVERLAY.committedStride !== 0) continue;
      const at = anchor(state.committed[i]!);
      if (!at) continue;
      const s = OVERLAY.committedScale;
      collector.add(
        geometry.dot,
        [OVERLAY.committedColor],
        new Matrix4().compose(at, identity, new Vector3(s, 1, s)),
        { onTop: true, opacity: OVERLAY.committedOpacity },
      );
    }

    // The trade route being aimed, over the committed run and under the walk
    // preview: it is the loudest of the three in colour and the quietest in
    // claim — nobody has clicked yet — so a march the cursor is actually
    // proposing still wins the tile it shares.
    const routeStride = OVERLAY.routeStride;
    for (let i = 0; i < (state.route ?? []).length; i++) {
      const route = state.route!;
      const last = i === route.length - 1;
      if (!last && i % routeStride !== 0) continue;
      const at = anchor(route[i]!);
      if (!at) continue;
      const s = OVERLAY.routeScale;
      collector.add(
        geometry.dot,
        [OVERLAY.routeColor],
        new Matrix4().compose(at, identity, new Vector3(s, 1, s)),
        { onTop: true, opacity: OVERLAY.routeOpacity },
      );
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
        { onTop: true, opacity: OVERLAY.pathOpacity },
      );
    }

    // The turn medallions, over both runs of dots and under nothing else in
    // this layer: they are the only mark here carrying a *number*, and a chip
    // printed over a numeral is a numeral nobody can read.
    //
    // The committed route's are laid first and quieter, so where a hovered
    // route crosses the one the piece is already walking the proposal's
    // medallion is the one on top — the same order, and the same argument, as
    // the two runs of dots above.
    //
    // Nothing at all until the atlas has rasterised (`icons`), exactly as the
    // lens draws no yields until then: a medallion is a printed mark, and there
    // is no colour-only stand-in for one.
    if (icons) {
      const marks: readonly [readonly TurnMarkRef[], number][] = [
        [state.committedMarks ?? [], OVERLAY.medallionQuietOpacity],
        [state.pathMarks ?? [], OVERLAY.medallionOpacity],
      ];
      for (const [list, opacity] of marks) {
        const material = icons.flatMaterialAt(opacity);
        for (let i = 0; i < list.length; i++) {
          const mark = list[i]!;
          const at = anchor(mark);
          if (!at) continue;
          const quad = medallionGeometry(geometry, mark.turn);
          if (!quad) continue;
          // The destination's is the largest, which is the route dots' own rule
          // (`destinationScale`) read for a mark that carries a number: the eye
          // finds the end of the march without counting, and the number it
          // finds there is the one the player actually asked for — *when do I
          // arrive*. The rests on the way are the same mark a size down.
          const last = i === list.length - 1;
          const s = OVERLAY.medallionScale * (last ? OVERLAY.medallionDestinationScale : 1);
          collector.add(quad, [], new Matrix4().compose(at, identity, new Vector3(s, 1, s)), {
            material,
            // The tile icons' own order, which is what puts a medallion over
            // the terrain, over every wash printed on it, and over the route
            // dots collected in this same layer — and still under the unit
            // badges, which name the piece and outrank a schedule.
            order: RENDER_ORDER.tileIcon,
          });
        }
      }
    }

    // Worked-tile marks: one small hex ring per worked tile, no filled dot. The
    // ring says "a citizen works here" and its colour says who decided — bone
    // white for the assignment's own choice, the seat's piece colour for a tile
    // the player pinned by hand. An outline rather than a dot on purpose: the
    // yield glyphs sit at the same anchor, and a chip under them was a smudge
    // behind the numbers, where a ring frames them instead.
    const pinned = new Set(state.locked.map((cell) => `${cell.col},${cell.row}`));
    const lockedTint = state.lockedColor ?? TERRITORY.lockedColor;
    for (const cell of state.worked) {
      const at = anchor(cell);
      if (!at) continue;
      const lockedHere = pinned.has(`${cell.col},${cell.row}`);
      const s = TERRITORY.ringScale;
      collector.add(
        geometry.ring,
        [lockedHere ? lockedTint : TERRITORY.workedColor],
        new Matrix4().compose(at, identity, new Vector3(s, 1, s)),
        { onTop: true, opacity: lockedHere ? TERRITORY.lockedRingOpacity : TERRITORY.workedOpacity },
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
        onTop: true,
        opacity: lit ? 1 : OVERLAY.ringOpacity,
      });
      if (!lit) continue;
      const halo = MOVE_MODE_HALO_SCALE;
      collector.add(
        geometry.ring,
        [color],
        new Matrix4().compose(at, identity, new Vector3(halo, 1, halo)),
        { onTop: true, opacity: MOVE_MODE_HALO_OPACITY },
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
