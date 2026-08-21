/**
 * All pointer and keyboard handling for the map view.
 *
 * The DOM side of the game: it reads the simulation (through the read-only
 * helpers in `src/sim/`) to decide what a click *means*, then expresses the
 * decision as a `Command` and hands it to `dispatch`. It never writes to a
 * `GameState` itself — selection and hover are view state and live here, board
 * state lives in the reducer.
 *
 * It exists as its own module because input logic grows fast: pan, zoom, hover,
 * selection, route preview and hotkeys are already more code than `main.ts`
 * should carry, and none of it is about wiring up the page.
 *
 * Click versus drag
 * -----------------
 * The same button pans and selects, so a press only counts as a click if the
 * pointer barely moved between down and up. Without the slop threshold every
 * pan would end in an accidental move order.
 *
 * Two kinds of selection
 * ----------------------
 * A selected *unit* and an open *city* are separate pieces of view state and
 * both live here. They are not exclusive — you can have a settler picked while a
 * city panel is open — but they answer to the same seat: change seats and both
 * are dropped, because neither belongs to the player who just sat down. Escape
 * closes them one at a time, panel first, so backing out of a city screen does
 * not also lose the unit you had chosen.
 *
 * Selection rules
 * ---------------
 * Clicking one of your own units always selects it, even when the selected unit
 * could legally stack there — "select" is the safe interpretation, and a move
 * onto a friendly tile is one keystroke away (click an empty tile first). A
 * repeated click on a tile holding several of your units cycles between them.
 *
 * Move animation
 * --------------
 * The renderer slides a piece along the tiles it walked, and this is the only
 * place that knows which tiles those were: the route the player was shown, cut
 * short at wherever the unit actually ended up (`walkedPrefix`). It is captured
 * *before* the dispatch, because afterwards the old position is gone. Nothing
 * waits on the animation — the state is already final when it starts.
 *
 * The local player
 * ----------------
 * The simulation has no notion of "me" — it has players, all of whom act in the
 * same turn window, and commands that name their author. `localPlayerId` is this
 * module's answer to who is sitting at *this* keyboard, and it is the gate on
 * every input path: only the local player's units can be selected, and every
 * command dispatched carries their id. Enemy pieces stay hoverable, because
 * looking is not commanding.
 *
 * That is exactly the shape a remote game needs later: the server would tell the
 * client its seat, and nothing else here would change.
 *
 * Seat switching is a development harness. `setLocalPlayer` is what the panel's
 * seat chips call, and it is hot-seat play by another name — one tester driving
 * every seat. `endTurn` uses it too, hopping to the next seat that has not
 * finished so a solo tester never has to hunt for whose turn is outstanding.
 * Neither is a rule: the simulation is perfectly happy for the other seats to be
 * driven by an AI or a socket instead.
 */

import { cityAt, foundingError } from '../sim/cities';
import type { Command } from '../sim/commands';
import { type Game, dispatch } from '../sim/game';
import { findPath, reachableTiles } from '../sim/pathfind';
import { type City, type Unit, cityById, hasEndedTurn, unitById } from '../sim/state';
import { unitsOnTile } from '../sim/units';
import { walkedPrefix } from '../render/animation';
import type { CellRef, HoverInfo, MapView } from './mapView';

/** How far the pointer may travel between down and up and still be a click. */
const CLICK_SLOP_PX = 4;

/**
 * Does this viewer want animation suppressed?
 *
 * Read at the moment of use rather than cached: the setting can change while the
 * page is open, and this is one media query per seat change.
 */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface GameControlsOptions {
  viewport: HTMLElement;
  /**
   * The map view being driven — the 2D `Renderer` or the 3D `Renderer3D`.
   *
   * Input handling is renderer-agnostic on purpose: what a click *means* is a
   * question about the simulation, and the answer is the same whether the board
   * is drawn as sprites or as a lit diorama. `MapView` is the whole of what this
   * module needs from a renderer; anything beyond it is `main.ts`'s business.
   */
  renderer: MapView;
  /** Read afresh every time: the game object is replaced on regeneration. */
  getGame: () => Game;
  /** Called after anything the panel displays may have changed. */
  onUpdate: (selected: Unit | null, hover: HoverInfo | null) => void;
}

export interface GameControls {
  /** Drops the selection and its overlays. Called on turn change and new games. */
  clearSelection(): void;
  /** Re-reads the game and repaints; call after replacing the game object. */
  refresh(): void;
  /** Ends the local player's turn, as the button and the Enter key both do. */
  endTurn(): void;
  /** Whose seat this client is playing. */
  localPlayerId(): number;

  /**
   * Why the selected unit cannot found a city here, or `null` when it can.
   *
   * The panel uses it for both jobs a disabled button has: whether to enable
   * itself, and what to say when it will not. `undefined` means there is no
   * selected unit at all, which is a different thing from "cannot".
   */
  foundCityBlocker(): string | null | undefined;
  /** Founds a city with the selected settler. The `B` key and the button. */
  foundCity(): void;

  /** The city whose panel is open, or `null`. Only ever one of your own. */
  openCity(): City | null;
  /** Opens a city's panel, or closes it with `null`. */
  setOpenCity(cityId: number | null): void;
  /**
   * Takes a different seat: drops the selection and pans the camera to that
   * player's units. The development harness (see the module docblock).
   */
  setLocalPlayer(playerId: number): void;
}

export function createGameControls(options: GameControlsOptions): GameControls {
  const { viewport, renderer, getGame, onUpdate } = options;

  /** The seat this client plays. Player ids are indices, so 0 is the first. */
  let localPlayerId = 0;
  let selectedId: number | null = null;
  /** The city whose panel is open. View state, exactly like the selection. */
  let openCityId: number | null = null;
  let dragging = false;
  let pressX = 0;
  let pressY = 0;
  let travelled = 0;
  /** Last pointer position in viewport space, so hover survives pan and zoom. */
  let pointer: { x: number; y: number } | null = null;

  // --- the local seat ------------------------------------------------------

  /** False once this seat has ended its turn: it may look, but not order. */
  function canOrder(): boolean {
    return !hasEndedTurn(getGame().state, localPlayerId);
  }

  /** Where the local player's pieces are, for the camera to frame. */
  function localUnitCells(): CellRef[] {
    return getGame()
      .state.units.filter((unit) => unit.ownerId === localPlayerId)
      .map((unit) => ({ col: unit.col, row: unit.row }));
  }

  /**
   * Points the camera at the local player's units.
   *
   * Optional on `MapView` and therefore optional here: under the frozen 2D
   * renderers this is a no-op, which is the correct amount of new behaviour for
   * a frozen pipeline. A player with no units left has nothing to look at, so
   * the camera stays put rather than lurching to the origin.
   */
  function showLocalPlayer(animate: boolean): void {
    const cells = localUnitCells();
    if (cells.length === 0) return;
    renderer.panToCells?.(cells, animate && !prefersReducedMotion());
  }

  function setLocalPlayer(playerId: number): void {
    if (playerId === localPlayerId) return;
    localPlayerId = playerId;
    // A selection belongs to the seat that made it, and so does an open city.
    selectedId = null;
    openCityId = null;
    renderer.skipAnimations();
    refreshOverlays();
    showLocalPlayer(true);
    onUpdate(selectedUnit(), renderer.getHover());
  }

  // --- selection -----------------------------------------------------------

  function selectedUnit(): Unit | null {
    if (selectedId === null) return null;
    const unit = unitById(getGame().state, selectedId);
    // The unit may have been removed, or the seat may have changed under the
    // selection; either way it is stale.
    if (!unit || unit.ownerId !== localPlayerId) return null;
    return unit;
  }

  function refreshOverlays(): void {
    const unit = selectedUnit();
    renderer.setSelectedUnitId(unit ? unit.id : null);
    // A seat that has ended its turn gets no reachable highlight: every one of
    // those tiles would refuse the order.
    renderer.setReachable(
      unit && canOrder() ? reachableTiles(getGame().state, unit).map((r) => r.tile) : [],
    );
    // Worked-tile dots belong to the open panel, so they appear and disappear
    // with it rather than cluttering the board whenever a city exists.
    const city = openCity();
    renderer.setWorkedTiles?.(city ? city.workedTiles : []);
    refreshPathPreview();
  }

  function refreshPathPreview(): void {
    const unit = selectedUnit();
    const hover = renderer.getHover();
    if (!unit || !hover || !canOrder()) {
      renderer.setPathPreview([]);
      return;
    }
    if (hover.tile.col === unit.col && hover.tile.row === unit.row) {
      renderer.setPathPreview([]);
      return;
    }
    renderer.setPathPreview(findPath(getGame().state, unit, hover.tile) ?? []);
  }

  function select(id: number | null): void {
    selectedId = id;
    refreshOverlays();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  function clearSelection(): void {
    select(null);
  }

  // --- cities --------------------------------------------------------------

  /**
   * The open city, re-read from the state every time.
   *
   * It is stored as an id, not a reference, for the same reason the selection
   * is: the city may have been destroyed, or the seat may have changed under the
   * panel, and either way the id simply stops resolving. Another player's city
   * never resolves at all — enemy banners are information, not a control panel.
   */
  function openCity(): City | null {
    if (openCityId === null) return null;
    const city = cityById(getGame().state, openCityId);
    if (!city || city.ownerId !== localPlayerId) return null;
    return city;
  }

  function setOpenCity(cityId: number | null): void {
    if (openCityId === cityId) return;
    openCityId = cityId;
    refreshOverlays();
    renderer.invalidate();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  /**
   * Why the selected unit cannot found a city here.
   *
   * The seat's own questions — is this my turn to act — are asked here; the
   * questions about the ground are asked by the simulation, so the button and
   * the reducer are enabled by one rule (see `foundingError`).
   */
  function foundCityBlocker(): string | null | undefined {
    const unit = selectedUnit();
    if (!unit) return undefined;
    if (!canOrder()) return `You have ended turn ${getGame().state.turn}`;
    return foundingError(getGame().state, unit);
  }

  /** Spends the selected settler on a city. The button and the `B` key. */
  function foundCity(): void {
    const unit = selectedUnit();
    if (!unit || foundCityBlocker() !== null) return;

    const command: Command = {
      type: 'foundCity',
      playerId: localPlayerId,
      settlerUnitId: unit.id,
    };
    if (!dispatch(getGame(), command).ok) return;

    // The settler is gone, so the selection is stale by definition; the new
    // city takes its place as the thing the player is looking at. The camera
    // stays exactly where it is — the player is already looking at the tile.
    renderer.skipAnimations();
    selectedId = null;
    const founded = cityAt(getGame().state, unit.col, unit.row);
    openCityId = founded ? founded.id : null;
    refreshOverlays();
    renderer.invalidate();
    onUpdate(null, renderer.getHover());
  }

  // --- clicks --------------------------------------------------------------

  /**
   * The local player's units on a tile, in `state.units` order. Order is part of
   * the state, so click-cycling visits them in the same sequence every time.
   * Other players' pieces are never returned — they are information, not
   * something this client may command.
   */
  function ownUnitsAt(col: number, row: number): Unit[] {
    const { state } = getGame();
    return unitsOnTile(state, col, row).filter((unit) => unit.ownerId === localPlayerId);
  }

  function handleClick(hover: HoverInfo): void {
    const { col, row } = hover.tile;
    const mine = ownUnitsAt(col, row);

    if (mine.length > 0) {
      // Selection always wins on your own tiles; a repeat click cycles.
      const at = mine.findIndex((unit) => unit.id === selectedId);
      select(mine[(at + 1) % mine.length]!.id);
      return;
    }

    // An empty tile of your own with a city on it opens that city. Units come
    // first because a garrison is what you click a city tile to move; the panel
    // is one click away on the banner when a unit is standing in the way.
    const city = cityAt(getGame().state, col, row);
    if (city && city.ownerId === localPlayerId) {
      selectedId = null;
      setOpenCity(city.id);
      return;
    }

    const unit = selectedUnit();
    if (!unit) {
      select(null);
      return;
    }
    if (!canOrder()) {
      // This seat is done for the turn. Keep the selection so the panel still
      // describes the unit, but do not send an order the reducer would refuse.
      onUpdate(unit, hover);
      return;
    }

    // A new order supersedes whatever was still sliding.
    renderer.skipAnimations();
    const from = { col: unit.col, row: unit.row };
    const route = findPath(getGame().state, unit, hover.tile) ?? [];

    const command: Command = {
      type: 'moveUnit',
      playerId: localPlayerId,
      unitId: unit.id,
      target: { col, row },
    };
    const result = dispatch(getGame(), command);
    if (!result.ok) {
      // An illegal order is not a reason to lose the selection — the player
      // most likely clicked a mountain and wants to try again.
      onUpdate(unit, hover);
      return;
    }

    // `unit` is a live reference into the state, so it is already at its
    // destination here; the walked prefix is the route up to that tile.
    const walked = walkedPrefix(route, { col: unit.col, row: unit.row });
    if (walked.length > 0) renderer.animateMove(unit.id, from, walked);

    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), hover);
  }

  /**
   * The first player after `from` who has not ended the turn, or null when
   * everyone is finished. Wraps, and considers `from` itself last.
   */
  function nextOpenSeat(from: number): number | null {
    const { state } = getGame();
    const count = state.players.length;
    for (let step = 1; step <= count; step++) {
      const player = state.players[(from + step) % count];
      if (player && !hasEndedTurn(state, player.id)) return player.id;
    }
    return null;
  }

  /**
   * Ends the local seat's turn — and only it. Everyone else is still playing.
   *
   * What happens next is the harness: if seats remain open, the local seat hops
   * to the next of them, so one tester can drive a whole table without hunting
   * for who is outstanding. If that command was the last one, the turn resolved
   * (the `turn` counter moved), every seat reopened, and the local seat stays
   * where it is — the player who pressed the button keeps playing themselves.
   */
  function endTurn(): void {
    const turnBefore = getGame().state.turn;
    const result = dispatch(getGame(), { type: 'endTurn', playerId: localPlayerId });
    if (!result.ok) return;

    // Stored multi-turn orders advance during the turn change; those steps are
    // not animated, so no piece should be mid-slide when they land.
    renderer.skipAnimations();
    renderer.invalidate();
    clearSelection();

    if (getGame().state.turn !== turnBefore) return;
    const next = nextOpenSeat(localPlayerId);
    if (next !== null) setLocalPlayer(next);
  }

  // --- hover ---------------------------------------------------------------

  function refreshHover(): void {
    if (!pointer) return;
    const hover = renderer.pick(pointer.x, pointer.y);
    renderer.setHover(hover);
    refreshPathPreview();
    onUpdate(selectedUnit(), hover);
  }

  // --- wiring --------------------------------------------------------------

  viewport.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    dragging = true;
    travelled = 0;
    pressX = event.clientX;
    pressY = event.clientY;
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener('pointermove', (event) => {
    if (dragging) {
      const dx = event.clientX - pressX;
      const dy = event.clientY - pressY;
      travelled += Math.abs(dx) + Math.abs(dy);
      pressX = event.clientX;
      pressY = event.clientY;
      renderer.panByScreen(dx, dy);
    }

    const rect = viewport.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    refreshHover();
  });

  function endDrag(event: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
    if (travelled > CLICK_SLOP_PX) return;

    const rect = viewport.getBoundingClientRect();
    const hover = renderer.pick(event.clientX - rect.left, event.clientY - rect.top);
    if (hover) handleClick(hover);
  }

  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  viewport.addEventListener('pointerleave', () => {
    pointer = null;
    renderer.setHover(null);
    renderer.setPathPreview([]);
    onUpdate(selectedUnit(), null);
  });

  viewport.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * 0.0015);
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      renderer.zoomBy(factor, pointer.x, pointer.y);
      refreshHover();
    },
    { passive: false },
  );

  window.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT')) return;
    if (event.key === 'g' || event.key === 'G') {
      // Only the 2D renderer draws a grid to toggle; in 3D the grout lines
      // between the tiles already are one, and there is nothing to hide.
      renderer.toggleGrid?.();
      return;
    }
    if (event.key === 'b' || event.key === 'B') {
      foundCity();
      return;
    }
    if (event.key === 'Escape') {
      // One step back at a time: the panel first, the selection after. Escaping
      // out of a city panel should not also lose the unit you had picked.
      if (openCity()) setOpenCity(null);
      else clearSelection();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      endTurn();
    }
  });

  return {
    clearSelection,
    endTurn,
    setLocalPlayer,
    foundCity,
    foundCityBlocker,
    openCity,
    setOpenCity,
    localPlayerId: () => localPlayerId,
    /**
     * Re-reads the game after it has been replaced. A new game is a new table:
     * the local seat goes back to the first player and the camera opens on their
     * units, instantly — there is no previous view to travel from.
     */
    refresh: () => {
      selectedId = null;
      openCityId = null;
      localPlayerId = 0;
      refreshOverlays();
      showLocalPlayer(false);
      onUpdate(null, renderer.getHover());
    },
  };
}
