/**
 * The surface the UI requires of a map renderer.
 *
 * `src/ui/controls.ts` decides what a click *means* — select this unit, preview
 * that route, issue this order — and it must not care whether the board it is
 * driving is a stack of 2D canvases or a WebGL diorama. This interface is that
 * boundary, and it lives here, with the consumer, rather than beside either
 * implementation: the UI is what declares the contract, and both renderers
 * satisfy it.
 *
 * It is deliberately small. Everything a renderer offers *beyond* this — the 2D
 * renderer's grid toggle and terrain cache, the 3D renderer's shadow toggle and
 * look parameters — stays off the interface and is reached through the concrete
 * type by `main.ts`, which knows which renderer it built. Only the things input
 * handling genuinely needs are here.
 *
 * The 2D pipelines are frozen. `Renderer` satisfies this interface exactly as it
 * already was; the only change on that side was to import `HoverInfo` from here
 * instead of declaring it, so the two renderers speak about a hovered tile in
 * one vocabulary.
 */

import type { Hex } from '../sim/hex';
import type { Tile } from '../sim/map';
import type { GameState } from '../sim/state';

/** An offset cell. Structurally what the simulation calls a path waypoint. */
export interface CellRef {
  col: number;
  row: number;
}

/** Where something on the board landed on screen, in viewport CSS pixels. */
export interface ScreenPoint {
  x: number;
  y: number;
  /** False when the point is far enough outside the viewport to be hidden. */
  onScreen: boolean;
}

/** What is under the cursor. */
export interface HoverInfo {
  tile: Tile;
  /**
   * Un-wrapped column under the cursor — which copy of the cylinder was hit.
   * The 2D renderer draws its highlight there directly; the 3D renderer draws
   * overlays in every copy and only reports it.
   */
  worldCol: number;
  row: number;
  axial: Hex;
}

export interface MapView {
  /** Screen position (viewport CSS pixels) → hovered tile, or null off the map. */
  pick(screenX: number, screenY: number): HoverInfo | null;
  setHover(hover: HoverInfo | null): void;
  getHover(): HoverInfo | null;

  /** The unit drawn with a selection marker, or `null`. */
  setSelectedUnitId(id: number | null): void;
  /** Tiles marked "you can move here this turn". */
  setReachable(cells: readonly CellRef[]): void;
  /** The route drawn under the cursor, start tile excluded. */
  setPathPreview(cells: readonly CellRef[]): void;

  /** Slides a piece along the tiles it just walked. Cosmetic; see `animation.ts`. */
  animateMove(unitId: number, from: CellRef, walked: readonly CellRef[]): void;
  /** Snaps every in-flight piece to its real tile. Called before a new order. */
  skipAnimations(): void;

  /** Points the renderer at a state; rebuilds whatever the change invalidated. */
  setGameState(state: GameState | null): void;
  /** Marks the view as needing a redraw. */
  invalidate(): void;
  /** Re-reads the viewport size. */
  resize(): void;

  panByScreen(dx: number, dy: number): void;
  /** Zooms by a multiplier about a screen point; > 1 zooms in. */
  zoomBy(factor: number, screenX: number, screenY: number): void;

  /** Optional: only the 2D renderer draws a hex grid to toggle. */
  toggleGrid?(): void;

  /**
   * Optional: brightens the selected unit's ring while move mode is armed.
   *
   * Move mode changes what the *next left click* will do, which is exactly the
   * kind of state a player will otherwise forget they are in. The crosshair
   * cursor and the context card both say so, and this is the third voice: the
   * piece that is about to be ordered looks ready to be ordered.
   *
   * Optional because it is a 3D feature and the 2D pipelines are frozen. Under
   * `?art=flat` move mode still works — it just shows in the cursor and the
   * card rather than on the board.
   */
  setMoveModeHighlight?(on: boolean): void;

  /**
   * Optional: marks the tiles the open city's citizens work.
   *
   * Optional for the same reason `panToCells` is — it is a 3D feature, and the
   * 2D pipelines are frozen. A city panel opened under `?art=flat` simply gets
   * no dots on the board.
   */
  setWorkedTiles?(cells: readonly CellRef[]): void;

  /**
   * Optional: projects a tile to a screen position, the inverse of `pick`.
   *
   * This is what lets DOM elements — the city banners — be positioned over the
   * board. Only the 3D renderer implements it, so the banner overlay simply
   * does not appear under the frozen 2D renderers.
   */
  projectCell?(col: number, row: number): ScreenPoint | null;

  /**
   * Optional: a callback run after every frame the renderer actually draws.
   *
   * The banner overlay's heartbeat. It has to be driven by the renderer rather
   * than by its own `requestAnimationFrame` loop, because the whole point of
   * render-on-demand is that nothing runs per frame when nothing moved — and a
   * second loop repositioning DOM sixty times a second over a still board would
   * quietly undo that.
   */
  setFrameListener?(listener: (() => void) | null): void;

  /**
   * Optional: brings a group of cells into view, centring on them.
   *
   * The UI calls this when the local seat changes, to show the player their own
   * pieces. `animate` asks for a smooth move; false means jump, and the caller
   * passes false when the viewer prefers reduced motion or when there is nothing
   * to transition *from* (a brand-new game).
   *
   * Optional because it is a 3D feature. The 2D pipelines are frozen and do not
   * implement it, so every call site is `renderer.panToCells?.(…)` and a seat
   * change under `?art=sprites` simply does not move the camera.
   */
  panToCells?(cells: readonly CellRef[], animate: boolean): void;
}
