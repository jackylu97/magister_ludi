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
import type { UnitTypeId } from '../sim/unitData';

/** An offset cell. Structurally what the simulation calls a path waypoint. */
export interface CellRef {
  col: number;
  row: number;
}

/**
 * A unit as it was the instant before it left the board.
 *
 * Everything the renderer needs to draw one more time — which piece, in whose
 * colour, standing where. It exists because a death animation outlives its
 * subject: by the time the topple starts, the unit is no longer in
 * `state.units` and cannot be looked up by id.
 */
export interface FallenUnit {
  id: number;
  type: UnitTypeId;
  ownerId: number;
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

/**
 * Which board-wide lens the player has up. `none` is the plain board.
 *
 * Declared here rather than beside the layer that draws it, for the reason the
 * whole file exists: the UI decides what the board should be showing, and a
 * renderer either implements the contract or does not. `src/render3d/lens3d.ts`
 * owns what each mode *looks* like.
 *
 * Two modes are questions a *piece* asks, and both are raised automatically when
 * one is picked up (see `effectiveLens` in `controls.ts`): `settler` is "where
 * should this go", `explorer` is "where is there something left to find". They
 * are exclusive of each other for the reason every mode is — a tile carries one
 * wash — and no unit is ever both, so the precedence between them has never had
 * to be exercised.
 *
 * Yields and resources are deliberately *not* members. A lens answers "which of
 * these questions am I asking" and the modes are exclusive because a tile can
 * only carry one wash; the yield glyphs and the resource roundels sit on the
 * tile face and compete with nothing, so making either an exclusive mode meant a
 * player could not ask "where can a city go" and "what is on this ground" at the
 * same time — which is one question, asked twice. They are independent switches
 * on `LensView` instead.
 */
export type LensMode = 'none' | 'settler' | 'explorer';

/**
 * What the switches start at, before the player has touched anything.
 *
 * The resource roundels are on from the first frame, as they are in Civ V: a
 * board whose wheat and iron go unnamed until a menu is found is a board hiding
 * the one fact most opening decisions turn on. The yield glyphs stay off,
 * because they are a screenful of numerals over every hex, and that is something
 * a player asks for when they want it.
 */
export const LENS_DEFAULTS: { readonly yields: boolean; readonly resources: boolean } = {
  yields: false,
  resources: true,
};

/**
 * Which lens, over which tiles, through whose eyes — plus the two switches that
 * are not lenses.
 */
export interface LensView {
  mode: LensMode;
  /**
   * Restrict the mode's wash to these cells, or `null` for the whole map.
   *
   * Only the wash: the glyphs and the roundels carry their own `yieldCells` and
   * `resourceCells`, because the three are independent and an open city panel
   * scopes one of them without touching the others.
   */
  cells: readonly CellRef[] | null;
  /**
   * Draw the resource roundels. Independent of `mode` — they may be up under any
   * lens, including `none`, and they start up (see `LENS_DEFAULTS`).
   *
   * *Which* resources get a roundel is not this flag's business: the renderer
   * asks the simulation what this seat may be told about, through
   * `visibleResourceAt`, so the board and the hover card cannot disagree.
   */
  resources: boolean;
  /**
   * Restrict the roundels to these cells, or `null` for the whole map.
   * Meaningless while `resources` is false.
   */
  resourceCells: readonly CellRef[] | null;
  /**
   * Draw the yield glyphs. Independent of `mode` — they may be up under any lens,
   * including `none`.
   *
   * The UI decides this from two sources it does not distinguish here: the
   * player's own toggle (the `Y` key and the switch in the lens menu), and the
   * automatic rule that an open city panel always shows the glyphs for the tiles
   * that city could work. The renderer is told only the answer.
   */
  yields: boolean;
  /**
   * Restrict the glyphs to these cells, or `null` for the whole map. Meaningless
   * while `yields` is false.
   *
   * This is what makes the automatic city-panel rule possible: opening a city
   * shows yields for its work radius *only*, which reads as "here is what this
   * city could work" rather than as the whole board lighting up.
   */
  yieldCells: readonly CellRef[] | null;
  /** Whose question it is. The settler lens judges ownership through it. */
  playerId: number;
  /**
   * Roundel **every** resource on the board, whatever `playerId` has researched.
   *
   * A view-level reveal and nothing more: the simulation is not asked a different
   * question and no player learns anything — `visibleResourceAt` still decides
   * what the *game* shows, and this flag simply says "do not ask it". The board
   * draws every prop for a viewer who is not a seat at all (`reveal3d.ts` veils
   * nothing when there is no seat); this is the roundels' half of the same
   * omniscience, for the same viewer.
   *
   * Off everywhere in the game, and it must stay off: the flag exists for the
   * mapgen inspection page (`mapgen.html`), which is an omniscient spectator
   * judging what the generator dealt and has no business being told that the
   * iron it placed is a secret. Any surface a *player* looks through leaves this
   * alone and lets the tech gate answer.
   */
  revealResources?: boolean;
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

  /**
   * Optional: the unit whose *badge* is under a screen position, or `null`.
   *
   * A second picking question, and a different one from `pick`. The tag floating
   * over a piece is what a player aims at when they mean "that unit" — it is the
   * part of a unit that is legible at game zoom, and it stands clear of the
   * ground the piece is on. So it is a click target everywhere on the board, and
   * it is the one gesture that still reaches a garrison while a city panel has
   * turned that city's own ground into a citizen board. See the precedence table
   * in `src/ui/controls.ts`.
   *
   * `playerId` is the seat asking, and only that seat's badges answer: a badge
   * is a way to select, and there is nothing to select on somebody else's piece.
   * A click on an enemy tag falls through to the ordinary tile contract, which
   * is what a click on the enemy piece under it has always done.
   *
   * Optional for the usual reason: it is a 3D feature and the 2D pipelines are
   * frozen, so `controls.ts` calls it as `renderer.pickUnitBadge?.(…)` and under
   * `?art=flat` selection is exactly the tile contract it always was.
   */
  pickUnitBadge?(screenX: number, screenY: number, playerId: number): number | null;

  /** The unit drawn with a selection marker, or `null`. */
  setSelectedUnitId(id: number | null): void;
  /** Tiles marked "you can move here this turn". */
  setReachable(cells: readonly CellRef[]): void;

  /**
   * Optional: tiles marked "you can attack this, this turn".
   *
   * A separate call from `setReachable` because they are separate questions —
   * a melee unit can attack a tile it could not walk to (something is standing
   * on it) and an archer can attack tiles far outside its movement entirely.
   * The UI decides which tiles by asking `previewCombat` per candidate, so the
   * tint marks exactly the attacks the reducer would accept.
   *
   * Optional, like every renderer-specific feature: the frozen 2D pipelines do
   * not draw it, and combat there still works from the cursor and the card.
   */
  setAttackable?(cells: readonly CellRef[]): void;
  /** The route drawn under the cursor, start tile excluded. */
  setPathPreview(cells: readonly CellRef[]): void;

  /**
   * Optional: the route the selected unit has already *committed* to — the
   * waypoints of its stored order, which end-of-turn resolution will walk.
   *
   * A different thing from `setPathPreview` and it must not look like one: the
   * preview is a proposal that follows the cursor and disappears when it moves,
   * this is a decision already taken. Renderers draw it more quietly (see
   * `overlays.ts`: dimmer, smaller, and broken into a dashed run) so that the
   * two can be on screen together — which they are constantly, since hovering a
   * new destination for a marching unit shows exactly that comparison.
   *
   * Optional for the usual reason: it is a 3D feature and the 2D pipelines are
   * frozen. Under `?art=flat` a marching unit's route simply is not drawn, and
   * the unit sheet still says where it is going.
   */
  setCommittedPath?(cells: readonly CellRef[]): void;

  /** Slides a piece along the tiles it just walked. Cosmetic; see `animation.ts`. */
  animateMove(unitId: number, from: CellRef, walked: readonly CellRef[]): void;

  /**
   * Optional: topples a piece that has just been killed.
   *
   * It takes a *description* of the dead unit rather than an id, and that is
   * forced by the architecture rather than chosen: the simulation removed the
   * unit before this is called, so there is nothing left to look up. Whoever
   * saw it die — `src/ui/controls.ts`, which captured the board before it
   * dispatched the attack — hands over what the piece looked like and where it
   * was standing.
   *
   * Cosmetic and powerless, exactly like `animateMove`: the state is already
   * final, and a dropped frame loses an effect rather than a unit.
   */
  animateDeath?(fallen: FallenUnit): void;

  /** Snaps every in-flight piece to its real tile. Called before a new order. */
  skipAnimations(): void;

  /**
   * Optional: how much longer, in milliseconds, pieces already in flight keep
   * moving. `0` when the board is still.
   *
   * A *read* and nothing more — it starts nothing, promises nothing and may be
   * ignored. It exists because one caller has something to say that must not be
   * said over a walk in progress: End Turn animates the standing orders the
   * click resolved, and the turn card and the camera glide that follow would
   * otherwise land on top of them (see `endTurn` in `controls.ts`). Only the
   * renderer holds those clocks, so only the renderer can answer.
   *
   * Optional for the usual reason: the 2D pipelines are frozen. Absent, the
   * caller reads `0` and hands the turn over immediately, which is exactly the
   * behaviour those renderers have always had.
   */
  pendingAnimationMs?(): number;

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
   * Optional: marks the tiles a city's citizens work, and which of them the
   * player pinned there.
   *
   * `locked` is the honoured subset of `cells` — a pin on a tile the city
   * cannot currently work is not drawn, because there is no citizen on it to
   * mark. Renderers may ignore it entirely and draw every worked tile alike.
   *
   * Optional for the same reason `panToCells` is — it is a 3D feature, and the
   * 2D pipelines are frozen. A city panel opened under `?art=flat` simply gets
   * no dots on the board.
   */
  setWorkedTiles?(cells: readonly CellRef[], locked?: readonly CellRef[]): void;

  /**
   * Optional: marks the ground a city founded on the hovered hex would work —
   * the settler lens's hover preview, and an empty list whenever that lens is
   * down or the pointer is off the board.
   *
   * A *hover*-frequency call, unlike `setLens`: the UI recomputes it on every
   * mouse move and the renderer is expected to ignore an unchanged list, which
   * is why the cells are handed over rather than the hovered hex. Which tiles a
   * city works is a rules question (`workRadius`), and it is answered where
   * every other rules question in this file is — in the UI, against the
   * simulation — so a renderer never has to know the radius.
   *
   * Optional like `setWorkedTiles`, and for the same reason: the 2D pipelines
   * are frozen, and a settler picked up under `?art=flat` simply gets no
   * preview.
   */
  setSiteRadius?(cells: readonly CellRef[]): void;

  /**
   * Optional: draws the board through one player's eyes — fog of war.
   *
   * `null` is an omniscient board, which is what the renderer starts at and what
   * the frozen 2D pipelines do forever.
   *
   * Whose eyes is a *UI* decision, exactly like `localPlayerId` (CLAUDE.md, hard
   * rule 3): the simulation is omniscient and keeps a visibility grid per player
   * (`state.visibility`), and this says which of those grids the board should be
   * masked by. So the renderer is told a seat and nothing else — not what is
   * hidden, not what changed, not why — and it reads the grid the sim already
   * maintains.
   *
   * Calling it is the seat-change gesture and it repaints the whole board. That
   * is per-instance work, never a rebuild (see `render3d/fog3d.ts`), and it is a
   * dev-harness action rather than something the product does.
   */
  setFogSeat?(playerId: number | null): void;

  /**
   * Optional: puts a lens over the board — see `LensView` and `lens3d.ts`.
   *
   * The UI decides *which* lens and over *which tiles*; the renderer only draws
   * it. Optional, like every other renderer-specific feature: under the frozen
   * 2D pipelines the lens menu still switches, and simply shows nothing.
   */
  setLens?(lens: LensView): void;

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

  /**
   * Optional: pans **and** zooms to frame a group of cells — the "show me
   * this city's work radius" gesture that opening a city panel makes.
   *
   * Unlike `panToCells`, which deliberately leaves the zoom alone, this picks
   * whatever zoom shows the given cells with a little margin, exactly as
   * `fitToViewport` does for the whole board. It never widens the diorama's
   * normal zoom-out ceiling the way `fitToViewport` does, though — a work
   * radius is a handful of tiles, not a map, and letting the camera zoom out
   * past its usual band for one would look like a lurch rather than a frame.
   *
   * `animate` glides both together; false — reduced motion, or a fresh game
   * with nothing to transition from — jumps straight there. There is no
   * matching "un-frame": closing whatever asked for this leaves the camera
   * exactly where the player left it (see `src/ui/controls.ts`'s
   * `setOpenCity`), which is the ordinary Civ behaviour and the reason this
   * method has no counterpart called on close.
   *
   * Optional for the usual reason: it is a 3D feature and the 2D pipelines
   * are frozen, so a city opened under `?art=flat` simply does not move the
   * camera.
   */
  frameCells?(cells: readonly CellRef[], animate: boolean): void;

  /**
   * Optional: says which city's screen is open, so the board can wash down
   * everything outside that city's work radius — the city screen's vignette.
   *
   * `null` is "no city screen", and it is the whole of the close protocol. The
   * renderer is never told that a panel was dismissed, or how: the UI has one
   * derived answer to "which city is open" (`controls.openCity()`), this is that
   * answer, and it is passed on the same `refreshOverlays` sweep that already
   * refreshes the worked-tile dots and the lens. So Escape, a click on the
   * board, selecting a unit, switching seats, starting a new game and loading a
   * save all clear the wash without any of them knowing it exists — which is the
   * property a parallel "vignette on" flag would have quietly lost the first
   * time somebody added a seventh way to close the panel.
   *
   * `animate` has the same meaning it has on `frameCells`: the caller passes
   * false for reduced motion, and the wash lands instantly. The renderer is told
   * rather than asked, exactly as it is about every other motion in this
   * interface.
   *
   * Optional for the usual reason — it is a 3D feature, and the frozen 2D
   * pipelines simply have no wash.
   */
  setCityFocus?(cell: CellRef | null, animate: boolean): void;
}
