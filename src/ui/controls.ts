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
 * The input contract
 * ------------------
 * One rule decides the whole scheme: **left selects, right orders.** Left click
 * used to do both, and on a board where every tile is a legal click target that
 * meant a mis-aimed selection was a move order — expensive, and impossible to
 * take back.
 *
 *   · Left click  — your unit selects it (again cycles the stack), your city
 *                   opens its panel, and *anything else deselects*. Clicking
 *                   away is how you put a unit down.
 *   · Right click — with one of your units selected, orders it to the clicked
 *                   tile. With nothing selected it does nothing at all. The
 *                   browser context menu is suppressed over the board either
 *                   way, because a right click there is a game input.
 *   · M           — arms *move mode*: the next left click moves instead of
 *                   selecting. This is the trackpad path, where a right click
 *                   is a two-finger tap and not everybody has one. M again, Esc,
 *                   or issuing the move disarms it.
 *
 * Escape backs out one layer at a time, outermost first: move mode, then an
 * open popover, then the city panel, then the selection.
 *
 * Click versus drag
 * -----------------
 * Both buttons pan, and both also click, so a press only counts as a click if
 * the pointer barely moved between down and up. Without the slop threshold every
 * pan would end in an accidental order — and that matters more for the right
 * button than it ever did for the left, because on many trackpads a two-finger
 * drag arrives as a right-button drag.
 *
 * Refusals are never silent
 * -------------------------
 * An order the reducer will not take (a mountain, a tile out of reach, a seat
 * that has already ended its turn) reports through `onNotice`, which the HUD
 * shows in the context card for a beat. The selection survives: the player
 * almost certainly wants to aim again.
 *
 * Two kinds of selection
 * ----------------------
 * A selected *unit* and an open *city* are separate pieces of view state and
 * both live here. They are exclusive, because the two panels that show them
 * share one slot on the right of the screen: taking a selection closes an open
 * city, and opening a city drops the selection. They also answer to the same
 * seat — change seats and both are dropped, because neither belongs to the
 * player who just sat down. Escape still backs out one at a time (a city screen
 * first, then the selection), because *clearing* a selection is not taking one
 * and leaves an open city where it was.
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

import { assignableTiles, cityAt, cityTile, foundingError } from '../sim/cities';
import {
  type CombatPreview,
  attackTargetAt,
  fortifyError,
  isCombatant,
  isRanged,
  previewCombat,
} from '../sim/combat';
import type { Command } from '../sim/commands';
import { type Game, dispatch } from '../sim/game';
import { type Tile, getTileAt, mapRange, tileHex } from '../sim/map';
import { findPath, reachableTiles } from '../sim/pathfind';
import { RULES } from '../sim/rulesData';
import { type City, type Unit, cityById, hasEndedTurn, unitById } from '../sim/state';
import { type ResearchReport, researchSince, researchSnapshot } from '../sim/tech';
import { unitDef } from '../sim/unitData';
import { unitsOnTile } from '../sim/units';
import { walkedPrefix } from '../render/animation';
import type { CellRef, FallenUnit, HoverInfo, LensMode, LensView, MapView } from './mapView';

/** How far the pointer may travel between down and up and still be a click. */
const CLICK_SLOP_PX = 4;

/** How long a refused order stays on screen before the card goes quiet again. */
const NOTICE_MS = 1800;

/** What the context card says while move mode is armed. */
const MOVE_MODE_NOTICE = 'Move mode — click a destination (Esc cancels)';

/**
 * A line for the context card: either the standing description of a mode the
 * player has put themselves in, or a one-off refusal that fades.
 */
export type NoticeKind = 'mode' | 'reject';

/**
 * One number to float over the board after a blow lands.
 *
 * `dealt` is damage this client's piece inflicted, `taken` is damage it
 * received; the two are drawn in the interface's two accents (vermilion and
 * teal) so a trade reads as a trade at a glance. It carries a *cell* rather
 * than a unit id because the unit it describes may already be dead — which is
 * exactly the case the number is most needed for.
 */
export interface DamageEvent {
  col: number;
  row: number;
  amount: number;
  kind: 'dealt' | 'taken';
}

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

  /**
   * The turn resolved: every seat had ended, the counter moved, and the local
   * seat is playing again. This is the moment the turn splash announces, and it
   * is reported from here because `endTurn` is the only place that can tell the
   * difference between "the turn advanced" and "I merely finished".
   *
   * Optional, like `onSeatAdvanced`: nothing about the rules depends on anyone
   * listening, and the frozen 2D pages are wired by the same `main.ts`.
   *
   * It carries what the resolution did to the local seat's research, because
   * this is the only place that can tell: the answer is a *difference*, and the
   * "before" half stops existing the moment the turn resolves. The diff itself
   * is the simulation's (`researchSince`), so what the splash announces is what
   * a replay of the same log would announce.
   */
  onTurnResolved?: (turn: number, research: ResearchReport) => void;
  /**
   * The harness moved the local seat on, because seats were still open. Carries
   * the seat now being played.
   */
  onSeatAdvanced?: (playerId: number) => void;

  /**
   * A line for the HUD's context card, or `null` to clear it.
   *
   * Two things speak through it: move mode, while it is armed, and a refused
   * order, for a moment. It is a callback rather than an element because this
   * module has no business knowing which card the HUD keeps its messages in —
   * exactly like `onUpdate`.
   */
  onNotice?: (text: string | null, kind: NoticeKind) => void;

  /**
   * Closes any HUD popover that is open; returns whether there was one.
   *
   * Escape belongs to one listener, and it is this module's — see the docblock
   * on the order it backs things out in. The popovers are `main.ts`'s, so this
   * is how Escape reaches them without a second window listener racing for the
   * same keystroke.
   */
  closePopovers?: () => boolean;

  /**
   * True while something on the page has taken over from the board — the
   * landing screen, today.
   *
   * Only the *keyboard* needs asking. An overlay covering the viewport already
   * swallows every pointer event by being in front of it, but a window-level
   * key listener has no such geometry: without this, tabbing to Start and
   * typing `y` would toggle a lens on a game nobody can see.
   */
  inputBlocked?: () => boolean;

  /**
   * Opens or closes the tech screen. `T`, and nothing else here — the screen
   * owns its own Escape while it is up (it reports itself through
   * `inputBlocked`, so this module never sees a key while it is open).
   */
  onToggleTechTree?: () => void;

  /**
   * A blow landed: numbers to float over the board.
   *
   * Reported from here because this is the only place that can measure it — the
   * figures are hit-point *differences*, and the "before" half stops existing
   * the moment the command applies. Same argument as `onTurnResolved`'s research
   * report, and the same shape of answer.
   */
  onDamage?: (events: readonly DamageEvent[]) => void;

  /**
   * The game ended: one player is left standing.
   *
   * Fired once, on the command that decided it, and only when `winnerId` went
   * from null to a player — a state that is already won does not re-announce
   * itself on every later click.
   */
  onVictory?: (playerId: number) => void;
}

export interface GameControls {
  /** Drops the selection and its overlays. Called on turn change and new games. */
  clearSelection(): void;

  /**
   * The lens the player *chose* from the menu — not necessarily the one on the
   * board, which a selected settler may be overriding. The menu shows this one,
   * so its ticks say what will come back when the override goes away.
   */
  lens(): LensMode;
  /** Puts a lens up, or takes it down with `'none'`. The menu's rows. */
  setLens(lens: LensMode): void;

  /**
   * Whether the player has the yield glyphs switched on.
   *
   * Their own switch, not the board's: an open city panel shows the glyphs for its
   * work radius whatever this says, and closing it comes back to exactly this.
   * The menu's checkbox shows this one, for the same reason the lens rows show
   * the chosen lens.
   */
  yieldsShown(): boolean;
  /** Turns the yield glyphs on or off. The menu's checkbox and the `Y` key. */
  setYields(on: boolean): void;

  /**
   * Tells the UI which city the pointer is over, when the pointer is over
   * something the board itself cannot see — a DOM city banner. `null` on the
   * way out. The board's own tiles are handled by hover picking.
   */
  setHoveredCity(cityId: number | null): void;
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

  /**
   * Why the selected unit's standing order cannot be cancelled, or `null` when
   * it can. `undefined` when there is no selected unit at all — the same shape,
   * and for the same reason, as `foundCityBlocker`.
   */
  cancelOrderBlocker(): string | null | undefined;
  /** Drops the selected unit's standing order. The unit sheet's button. */
  cancelOrder(): void;

  /**
   * Why the selected unit cannot fortify, or `null` when it can. `undefined`
   * with nothing selected — the same three-valued shape as `foundCityBlocker`.
   */
  fortifyBlocker(): string | null | undefined;
  /** Digs the selected unit in. The unit sheet's button and the `F` key. */
  fortify(): void;

  /**
   * What would happen if the selected unit attacked the tile under the pointer,
   * or `null` when that is not a question anybody is asking — nothing selected,
   * nothing hovered, or nothing hostile on the hovered tile.
   *
   * A refusal comes back as the preview's own `{ ok: false, error }` rather than
   * as `null`, because "you cannot attack that, and here is why" is exactly what
   * the card should say. It is `previewCombat`'s answer verbatim: the forecast
   * the player reads is the arithmetic the reducer will perform.
   */
  combatForecast(): CombatPreview | null;

  /** The unit currently selected, re-read from the state, or `null`. */
  selectedUnit(): Unit | null;
  /** Whether move mode is armed — the next left click is an order, not a pick. */
  isMoveMode(): boolean;
  /** Arms or disarms move mode. The `M` key; a no-op with nothing selected. */
  setMoveMode(on: boolean): void;
}

export function createGameControls(options: GameControlsOptions): GameControls {
  const {
    viewport,
    renderer,
    getGame,
    onUpdate,
    onTurnResolved,
    onSeatAdvanced,
    onNotice,
    closePopovers,
    inputBlocked,
    onToggleTechTree,
    onDamage,
    onVictory,
  } = options;

  /** The seat this client plays. Player ids are indices, so 0 is the first. */
  let localPlayerId = 0;
  let selectedId: number | null = null;
  /** The city whose panel is open. View state, exactly like the selection. */
  let openCityId: number | null = null;
  /** Armed by `M`: the next left click on the board is an order, not a pick. */
  let moveMode = false;
  /**
   * The lens the player chose. The lens actually on the board is
   * `effectiveLens`, which lets a selected settler override this without
   * forgetting it — dropping the settler puts the player's own choice back.
   */
  let manualLens: LensMode = 'none';
  /**
   * The yield glyphs, as the player left them. Not a lens (see `LensMode`): it is
   * an independent switch that can be on under any of them, and an open city
   * panel adds its own glyphs without disturbing it.
   */
  let yieldsOn = false;
  /** A city whose DOM banner the pointer is over. See `setHoveredCity`. */
  let hoveredCityId: number | null = null;
  /**
   * Which button started the current drag, or `null` when nothing is pressed.
   * Left and right both pan; only the button that went down decides what the
   * release means, so a chorded press cannot turn a pan into an order.
   */
  let dragButton: number | null = null;
  let pressX = 0;
  let pressY = 0;
  let travelled = 0;
  /** Last pointer position in viewport space, so hover survives pan and zoom. */
  let pointer: { x: number; y: number } | null = null;
  /** A transient line currently on screen, and the timer that will take it away. */
  let rejection: string | null = null;
  /**
   * How that line should read. A refused order is a "no" and flinches; a combat
   * result is news and does not — same slot, same timer, different voice.
   */
  let rejectionKind: NoticeKind = 'reject';
  let rejectionTimer = 0;

  // --- the context card's message line -------------------------------------

  /**
   * Says whatever is currently truest: a refusal while one is fresh, otherwise
   * move mode while it is armed, otherwise nothing. One funnel, so the two
   * sources can never fight over the line.
   */
  function publishNotice(): void {
    if (rejection !== null) onNotice?.(rejection, rejectionKind);
    else onNotice?.(moveMode ? MOVE_MODE_NOTICE : null, 'mode');
  }

  /** Puts a line on the card for a beat, in one of its two voices. */
  function flash(text: string, kind: NoticeKind): void {
    rejection = text;
    rejectionKind = kind;
    window.clearTimeout(rejectionTimer);
    rejectionTimer = window.setTimeout(() => {
      rejection = null;
      publishNotice();
    }, NOTICE_MS);
    publishNotice();
  }

  /** Reports an order the game would not take, visibly and briefly. */
  function reject(text: string): void {
    flash(text, 'reject');
  }

  /**
   * Reports something that *happened* — a blow landed, a city taken. Same slot
   * and same timer as a refusal, without the flinch: the player asked for this.
   */
  function announce(text: string): void {
    flash(text, 'mode');
  }

  // --- move mode -----------------------------------------------------------

  /**
   * Arms or disarms the keyboard route to a move order.
   *
   * Three things say so at once, because a mode the player cannot see is a mode
   * they will be surprised by: the board takes a crosshair cursor (a class on
   * the viewport, which owns the cursor), the selected unit's ring brightens
   * (an optional renderer hook — the frozen 2D pipelines simply do not have
   * one), and the context card explains itself in words.
   *
   * Arming requires a unit that could actually be ordered. Asking for move mode
   * with nothing selected, or after ending your turn, does nothing rather than
   * arming a mode whose next click would only be refused.
   */
  function setMoveMode(on: boolean): void {
    const next = on && selectedUnit() !== null && canOrder();
    if (next === moveMode) return;
    moveMode = next;
    viewport.classList.toggle('is-move-mode', moveMode);
    renderer.setMoveModeHighlight?.(moveMode);
    publishNotice();
    onUpdate(selectedUnit(), renderer.getHover());
  }

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
    // A selection belongs to the seat that made it, and so does an open city —
    // and move mode belongs to the selection.
    selectedId = null;
    openCityId = null;
    hoveredCityId = null;
    setMoveMode(false);
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
    // What this piece could *fight*, which is a different set from what it could
    // walk to — an archer reaches past its movement, a swordsman cannot step
    // onto the tile it is attacking.
    renderer.setAttackable?.(attackableCells());
    refreshSpotlight();
    refreshLens();
    // A unit that is already marching shows the route it is marching on. Only
    // the selected one: every stored order on the board at once would be a
    // cat's cradle, and the question is always about the piece in hand.
    renderer.setCommittedPath?.(unit?.path ?? []);
    refreshPathPreview();
  }

  /**
   * The city the board is currently talking about: the open panel's, or — with
   * no panel open — whichever city the pointer is resting on, whether that is
   * its tile or its banner.
   *
   * Hovering answering the same question the panel does is deliberate: "which
   * tiles feed this city" is asked far more often than it is worth opening a
   * screen for, and the dots are already drawn. Anybody's city answers, because
   * there is no fog of war to make it a secret and a banner you can read but not
   * interrogate would be a strange half-measure.
   */
  function spotlitCity(): City | null {
    const open = openCity();
    if (open) return open;
    const { state } = getGame();
    if (hoveredCityId !== null) {
      const banner = cityById(state, hoveredCityId);
      if (banner) return banner;
    }
    const hover = renderer.getHover();
    if (!hover) return null;
    return cityAt(state, hover.tile.col, hover.tile.row) ?? null;
  }

  /** The worked-tile dots, and which of them the player pinned by hand. */
  function refreshSpotlight(): void {
    const city = spotlitCity();
    if (!city) {
      renderer.setWorkedTiles?.([], []);
      return;
    }
    // Only *honoured* pins are drawn: a lock on a tile the city cannot work
    // right now is real intent (it is kept, see `assignCitizens`) but there is
    // no citizen standing on it to mark.
    const worked = city.workedTiles;
    const locked = city.lockedTiles.filter((cell) =>
      worked.some((tile) => tile.col === cell.col && tile.row === cell.row),
    );
    renderer.setWorkedTiles?.(worked, locked);
  }

  /**
   * What the board is showing: which lens, and whether the yield glyphs are up.
   *
   * Two automatic rules sit on top of the player's own choices, both because the
   * question they answer is the question the player has just asked by doing
   * something else. They are now independent of each other, which is the point
   * of splitting the glyphs off the lens list:
   *
   *   · a selected settler ⇒ the settler lens. Picking one up *is* the question
   *     "where should this go".
   *   · an open city panel ⇒ the glyphs, over that city's work radius. The panel
   *     is a screen full of numbers; this is where they come from.
   *
   * The city rule scopes the glyphs *only while the player has them off*. With the
   * switch already on, the whole map is marked and the radius is part of it, so
   * narrowing to the radius would be the panel taking glyphs away — which is the
   * opposite of what opening it asked for.
   *
   * Neither rule touches `manualLens` or `yieldsOn`, so dropping the settler and
   * closing the panel restore exactly what the player had chosen.
   */
  function effectiveLens(): LensView {
    const playerId = localPlayerId;
    const unit = selectedUnit();
    const settler = unit !== null && unitDef(unit.type).foundsCity;
    const city = openCity();
    return {
      mode: settler ? 'settler' : manualLens,
      cells: null,
      yields: yieldsOn || city !== null,
      yieldCells: city && !yieldsOn ? workRadiusCells(city) : null,
      playerId,
    };
  }

  function refreshLens(): void {
    renderer.setLens?.(effectiveLens());
  }

  /** Every cell within a city's work radius, its own centre included. */
  function workRadiusCells(city: City): CellRef[] {
    const { state } = getGame();
    const centre = tileHex(cityTile(state.map, city));
    return mapRange(state.map, centre, RULES.cities.workRadius).map((tile) => ({
      col: tile.col,
      row: tile.row,
    }));
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
    // The two right-hand panels share one slot, so they share one subject: a
    // unit picked up while a city screen is open closes it, exactly as opening
    // a city drops the selection. Only *taking* a selection does this —
    // clearing one leaves an open city alone, so Escape still backs out one
    // layer at a time.
    if (id !== null && openCityId !== null) {
      openCityId = null;
      renderer.invalidate();
    }
    // Move mode is a property of *this* selection: dropping the unit, or
    // picking a different one, disarms it rather than silently carrying an
    // armed order over to a piece the player has only just clicked.
    if (moveMode) setMoveMode(false);
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
    // Opening a city is a change of subject. This is also the path a click on a
    // city *banner* takes — banners are DOM over the board, so they never reach
    // the board's own click handling — and an armed move order left hanging
    // behind a city screen would go off on the next click for no visible reason.
    if (cityId !== null) setMoveMode(false);
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
    setMoveMode(false);
    const founded = cityAt(getGame().state, unit.col, unit.row);
    openCityId = founded ? founded.id : null;
    refreshOverlays();
    renderer.invalidate();
    onUpdate(null, renderer.getHover());
  }

  // --- standing orders -----------------------------------------------------

  /**
   * Why the selected unit's standing order cannot be dropped.
   *
   * The same division of labour as `foundCityBlocker`: this module answers the
   * questions about the *seat* — is there a selection, may it still act — and
   * everything about the order itself is the reducer's, asked by reading the
   * unit. The two agree because there is only one rule for each question.
   */
  function cancelOrderBlocker(): string | null | undefined {
    const unit = selectedUnit();
    if (!unit) return undefined;
    if (!canOrder()) return `You have ended turn ${getGame().state.turn}`;
    if (!unit.path || unit.path.length === 0) return 'This unit has no standing order';
    return null;
  }

  /**
   * Drops the selected unit's standing order, leaving it where it stands.
   *
   * The unit does not move and nothing else changes, so there is no animation to
   * skip and no camera to move — but the board was drawing the committed route,
   * and it must stop.
   */
  function cancelOrder(): void {
    const unit = selectedUnit();
    if (!unit || cancelOrderBlocker() !== null) return;

    const command: Command = {
      type: 'cancelOrder',
      playerId: localPlayerId,
      unitId: unit.id,
    };
    const result = dispatch(getGame(), command);
    if (!result.ok) {
      reject(result.error);
      return;
    }

    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  // --- combat --------------------------------------------------------------

  /**
   * Every tile the selected unit could attack this turn.
   *
   * Candidates come from the unit's *reach* — six neighbours for a swordsman,
   * everything inside `range` for an archer — and each one is then asked of
   * `previewCombat`, which is the same function the reducer validates with. So
   * the red tint marks exactly the attacks that will be accepted: line of
   * sight, adjacency, "has this unit already fought" and "is there anything
   * there at all" are all answered once, by the simulation, rather than being
   * re-guessed here in a form that could drift.
   *
   * It is at most nineteen previews and it runs when the selection changes,
   * not per frame.
   */
  function attackableCells(): CellRef[] {
    const unit = selectedUnit();
    if (!unit || !canOrder()) return [];
    const def = unitDef(unit.type);
    if (!isCombatant(def)) return [];

    const { state } = getGame();
    const origin = getTileAt(state.map, unit.col, unit.row);
    if (!origin) return [];

    const radius = isRanged(def) ? (def.range ?? 1) : 1;
    const cells: CellRef[] = [];
    for (const tile of mapRange(state.map, tileHex(origin), radius)) {
      if (tile.col === unit.col && tile.row === unit.row) continue;
      if (!previewCombat(state, unit.id, { col: tile.col, row: tile.row }).ok) continue;
      cells.push({ col: tile.col, row: tile.row });
    }
    return cells;
  }

  /**
   * The forecast for the hovered tile. See `GameControls.combatForecast`.
   *
   * It answers `null` — rather than a refusal — when there is simply nothing
   * hostile under the pointer, because a card that explained why you cannot
   * attack an empty meadow would be a card that never stopped talking.
   */
  function combatForecast(): CombatPreview | null {
    const unit = selectedUnit();
    const hover = renderer.getHover();
    if (!unit || !hover) return null;
    if (!isCombatant(unitDef(unit.type))) return null;

    const { state } = getGame();
    const { col, row } = hover.tile;
    if (col === unit.col && row === unit.row) return null;
    if (!attackTargetAt(state, col, row, localPlayerId)) return null;
    return previewCombat(state, unit.id, { col, row });
  }

  /** Every unit on the board right now, by id, as it looks this instant. */
  function unitSnapshot(): Map<number, FallenUnit & { hp: number }> {
    const snapshot = new Map<number, FallenUnit & { hp: number }>();
    for (const unit of getGame().state.units) {
      snapshot.set(unit.id, {
        id: unit.id,
        type: unit.type,
        ownerId: unit.ownerId,
        col: unit.col,
        row: unit.row,
        hp: unit.hp,
      });
    }
    return snapshot;
  }

  /**
   * Attacks the hovered tile with the selected unit, and reports whether it took
   * the click.
   *
   * Taking the click is decided *before* the command: if something hostile is
   * standing there, this gesture was an attack, and a refusal is spoken rather
   * than quietly falling through to a move order that would only be refused
   * again for a worse reason ("a foreign unit is in the way").
   *
   * Everything the interface says afterwards is measured rather than reported by
   * the reducer: the names come from the forecast taken beforehand, and the
   * damage figures are hit-point differences across the dispatch. That is
   * deliberate — `CommandResult` stays `{ ok }` and the UI stays a reader of the
   * board, which means these numbers cannot disagree with what the board shows.
   */
  function issueAttack(hover: HoverInfo): boolean {
    const unit = selectedUnit();
    if (!unit) return false;

    const { state } = getGame();
    const { col, row } = hover.tile;
    if (!attackTargetAt(state, col, row, localPlayerId)) return false;
    if (!isCombatant(unitDef(unit.type))) return false;

    if (!canOrder()) {
      reject(`You have ended turn ${state.turn}`);
      onUpdate(unit, hover);
      return true;
    }

    const view = previewCombat(state, unit.id, { col, row });
    if (!view.ok) {
      reject(view.error);
      onUpdate(unit, hover);
      return true;
    }

    // Captured before the dispatch: afterwards the dead are gone and the
    // "before" hit points they were at have stopped existing.
    const before = unitSnapshot();
    const cityBefore = cityAt(state, col, row);
    const cityHpBefore = cityBefore?.hp ?? 0;
    const attackerFrom = { col: unit.col, row: unit.row };
    const wonBefore = state.winnerId;

    renderer.skipAnimations();
    const command: Command = {
      type: 'attack',
      playerId: localPlayerId,
      unitId: unit.id,
      target: { col, row },
    };
    const result = dispatch(getGame(), command);
    if (!result.ok) {
      reject(result.error);
      onUpdate(unit, hover);
      return true;
    }

    setMoveMode(false);
    reportCombat(view, before, cityHpBefore, attackerFrom, { col, row });

    if (getGame().state.winnerId !== null && wonBefore === null) {
      onVictory?.(getGame().state.winnerId!);
    }

    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), hover);
    return true;
  }

  /**
   * Says what the blow did: the notice line, the floating numbers, and a topple
   * for anybody who did not survive it.
   *
   * Damage is read off the board as a difference, so a number shown here is a
   * number the state actually moved. A unit that is missing from the state
   * afterwards lost *all* of its remaining hit points, which is both the honest
   * figure and the one a player expects to see over a dying piece.
   */
  function reportCombat(
    view: CombatPreview & { ok: true },
    before: Map<number, FallenUnit & { hp: number }>,
    cityHpBefore: number,
    attackerFrom: CellRef,
    target: CellRef,
  ): void {
    const { state } = getGame();
    const events: DamageEvent[] = [];

    /**
     * How much a unit lost, and where to say so — its tile now if it survived
     * (a melee winner may have advanced), or the tile it fell on if it did not.
     */
    const lost = (id: number | null): { amount: number; at: CellRef } | null => {
      if (id === null) return null;
      const was = before.get(id);
      if (!was) return null;
      const now = unitById(state, id);
      const amount = now ? was.hp - now.hp : was.hp;
      if (amount <= 0) return null;
      return { amount, at: now ? { col: now.col, row: now.row } : { col: was.col, row: was.row } };
    };

    const dealt = view.defenderCityId !== null
      ? { amount: cityHpBefore - (cityById(state, view.defenderCityId)?.hp ?? 0), at: target }
      : lost(view.defenderUnitId);
    if (dealt && dealt.amount > 0) {
      events.push({ ...dealt.at, amount: dealt.amount, kind: 'dealt' });
    }
    // Counter-damage is announced where the attacker *stood when it was struck*,
    // not where it ended up: a unit that killed its defender and advanced would
    // otherwise carry the number it took onto the tile it just captured.
    const taken = lost(view.attackerId);
    if (taken) {
      events.push({
        col: attackerFrom.col,
        row: attackerFrom.row,
        amount: taken.amount,
        kind: 'taken',
      });
    }
    if (events.length > 0) onDamage?.(events);

    // Anybody who was on the board before the blow and is not on it now fell.
    for (const [id, was] of before) {
      if (unitById(state, id)) continue;
      renderer.animateDeath?.(was);
    }

    reportCombatNotice(view, dealt?.amount ?? 0, taken?.amount ?? 0);
  }

  /** "Warrior attacks Archer: 34 − 12", in the reducer's own vocabulary. */
  function reportCombatNotice(
    view: CombatPreview & { ok: true },
    dealt: number,
    taken: number,
  ): void {
    const { state } = getGame();
    if (view.capturesUnit) {
      announce(`${view.attackerName} captures ${view.defenderName}`);
      return;
    }
    const verb = view.kind === 'ranged' ? 'shoots' : 'attacks';
    const trade = taken > 0 ? `${dealt} − ${taken}` : `${dealt}`;
    const city =
      view.defenderCityId === null ? undefined : cityById(state, view.defenderCityId);
    const tail = city && city.ownerId === localPlayerId ? ` · ${city.name} taken!` : '';
    announce(`${view.attackerName} ${verb} ${view.defenderName}: ${trade}${tail}`);
  }

  // --- fortifying ----------------------------------------------------------

  /**
   * Why the selected unit cannot dig in. The seat's questions here, the unit's
   * delegated to `fortifyError` — the same split as `foundCityBlocker`, and the
   * same guarantee: this button is enabled by the rule the reducer applies.
   */
  function fortifyBlocker(): string | null | undefined {
    const unit = selectedUnit();
    if (!unit) return undefined;
    if (!canOrder()) return `You have ended turn ${getGame().state.turn}`;
    return fortifyError(unit);
  }

  function fortify(): void {
    const unit = selectedUnit();
    if (!unit || fortifyBlocker() !== null) return;

    const command: Command = { type: 'fortify', playerId: localPlayerId, unitId: unit.id };
    const result = dispatch(getGame(), command);
    if (!result.ok) {
      reject(result.error);
      return;
    }
    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  // --- citizens ------------------------------------------------------------

  /**
   * Pins or unpins the clicked tile for the open city, and reports whether it
   * took the click.
   *
   * It only ever takes one while a city panel is open *and* the tile is one that
   * city could actually work — that is the whole of the new gesture, and it is
   * why a click on ocean, on another city's ground, or with no panel open still
   * means what it has always meant. The city tile itself is not assignable
   * either, so clicking the town under an open panel does not pin anything.
   *
   * Three cases, and they are one rule: the pin list is toggled and sent whole.
   * Unpinning does not stop a tile being worked — the assignment may well pick
   * it again on merit, which is the honest answer to "unpin" rather than a
   * second, invisible kind of "never work this".
   */
  function toggleCitizen(hover: HoverInfo): boolean {
    const city = openCity();
    if (!city) return false;

    const { state } = getGame();
    const target = assignableTiles(state, city).find(
      (tile: Tile) => tile.col === hover.tile.col && tile.row === hover.tile.row,
    );
    if (!target) return false;

    if (!canOrder()) {
      reject(`You have ended turn ${state.turn}`);
      return true;
    }

    const cells = city.lockedTiles.map((cell) => ({ col: cell.col, row: cell.row }));
    const at = cells.findIndex(
      (cell) => cell.col === target.col && cell.row === target.row,
    );
    if (at >= 0) cells.splice(at, 1);
    else cells.push({ col: target.col, row: target.row });

    const command: Command = {
      type: 'setLockedTiles',
      playerId: localPlayerId,
      cityId: city.id,
      cells,
    };
    const result = dispatch(getGame(), command);
    if (!result.ok) {
      // The reducer's own words — "this city has 3 citizens and cannot pin 4"
      // is exactly what the player needs to hear.
      reject(result.error);
      return true;
    }

    renderer.invalidate();
    refreshOverlays();
    onUpdate(selectedUnit(), hover);
    return true;
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

  /**
   * The left button: pick things up and put them down.
   *
   * The order of the tests is the whole design. Your own units win over
   * everything, because "select" is the safe reading of a click and a stack is
   * cycled by clicking it again. Your own city comes next. Everything else —
   * empty ground, an enemy, a mountain — *deselects*, which is the one thing
   * the old scheme had no gesture for at all.
   *
   * Move mode short-circuits all of it: while it is armed the left button is
   * standing in for the right one, and that is the only thing it does.
   */
  function handleLeftClick(hover: HoverInfo): void {
    if (moveMode) {
      // Move mode stands in for the right button, so it stands in for the whole
      // of it: aiming the armed click at an enemy attacks, exactly as a right
      // click would. The trackpad path must not be a lesser one.
      if (!issueAttack(hover)) issueMove(hover);
      return;
    }

    // While a city screen is open, its own work radius is a citizen board: a
    // click on a tile that city could work pins or unpins it. It is scoped as
    // tightly as it can be — this panel, these tiles — so that everywhere else
    // on the map the selection contract is exactly what it always was.
    if (toggleCitizen(hover)) return;

    const { col, row } = hover.tile;
    const mine = ownUnitsAt(col, row);

    if (mine.length > 0) {
      // Selection always wins on your own tiles; a repeat click cycles.
      const at = mine.findIndex((unit) => unit.id === selectedId);
      select(mine[(at + 1) % mine.length]!.id);
      return;
    }

    // An empty tile of your own with a city on it opens that city. Units come
    // first because a garrison is what you click a city tile to select; the
    // panel is one click away on the banner when a unit is standing in the way.
    const city = cityAt(getGame().state, col, row);
    if (city && city.ownerId === localPlayerId) {
      selectedId = null;
      setOpenCity(city.id);
      return;
    }

    // Clicking away. With nothing selected this still costs a repaint of the
    // hover readout, which is what the player is looking at when they click an
    // enemy or a stretch of ocean.
    if (selectedId !== null) select(null);
    else onUpdate(selectedUnit(), hover);
  }

  /**
   * The right button: order the selected unit to the clicked tile.
   *
   * With nothing selected it is not an input at all — deliberately, so that a
   * stray two-finger tap on a trackpad cannot do anything. It is also the exit
   * from move mode, because a player who reached for the right button has
   * already said which gesture they meant.
   */
  function handleRightClick(hover: HoverInfo): void {
    if (!selectedUnit()) return;
    // "Act on this target" already covers both verbs: a tile with somebody
    // else's piece or town on it is a fight, and everything else is a march.
    // The player aims at a thing, not at a mode.
    if (issueAttack(hover)) return;
    issueMove(hover);
  }

  /**
   * Sends the selected unit to the hovered tile, whichever gesture asked for it.
   *
   * Every refusal is spoken (see the module docblock) and none of them cost the
   * selection: a player who clicked a mountain wants to aim again, not to start
   * over. Success disarms move mode — one arming, one order.
   */
  function issueMove(hover: HoverInfo): void {
    const unit = selectedUnit();
    if (!unit) return;

    const { col, row } = hover.tile;
    if (!canOrder()) {
      // This seat is done for the turn. Keep the selection so the card still
      // describes the unit, but do not send an order the reducer would refuse.
      reject(`You have ended turn ${getGame().state.turn}`);
      onUpdate(unit, hover);
      return;
    }
    if (col === unit.col && row === unit.row) {
      // Ordering a unit onto its own tile is not an error, it is a no-op; say
      // nothing and leave the selection exactly as it was.
      setMoveMode(false);
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
      // The reducer's own words: it knows why better than this module does.
      reject(result.error);
      onUpdate(unit, hover);
      return;
    }

    setMoveMode(false);

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
  /**
   * Where every unit under a standing order is standing, and what that order
   * still is, captured immediately before a dispatch that might resolve the turn.
   *
   * This is the only moment the information exists. `resetMovement` walks those
   * orders in place, so a heartbeat later the unit is at its new tile and the
   * waypoints it crossed have been consumed from its `path` — there is nothing
   * left to reconstruct the walk from. Only units that actually hold an order
   * are captured, because they are the only ones resolution can move.
   */
  interface StandingOrder {
    id: number;
    col: number;
    row: number;
    route: CellRef[];
  }

  function standingOrders(): StandingOrder[] {
    const orders: StandingOrder[] = [];
    for (const unit of getGame().state.units) {
      if (!unit.path || unit.path.length === 0) continue;
      orders.push({
        id: unit.id,
        col: unit.col,
        row: unit.row,
        route: unit.path.map((cell) => ({ col: cell.col, row: cell.row })),
      });
    }
    return orders;
  }

  /**
   * Slides every piece that resolution just marched, from where it was to where
   * it now is.
   *
   * Without this a turn change is a room full of teleports: the player presses
   * End Turn, the pipeline walks a dozen stored orders, and the next frame draws
   * every one of those units somewhere else with nothing in between. The
   * simulation is already final by the time this runs — it is the same powerless
   * cosmetic replay a fresh `moveUnit` gets (see `animation3d.ts`), fed from the
   * routes captured a moment ago and cut to the tiles actually entered.
   *
   * Every player's units, not just the local seat's: turns are simultaneous, and
   * an enemy column arriving is exactly the thing a player must not miss.
   */
  function animateResolvedMarches(orders: readonly StandingOrder[]): void {
    if (orders.length === 0 || prefersReducedMotion()) return;
    const { state } = getGame();
    for (const order of orders) {
      const unit = unitById(state, order.id);
      if (!unit) continue;
      if (unit.col === order.col && unit.row === order.row) continue;
      // The route it was holding, cut at wherever it actually stopped — the
      // walk may have run out of movement or been blocked half way.
      const walked = walkedPrefix(order.route, { col: unit.col, row: unit.row });
      if (walked.length === 0) continue;
      renderer.animateMove(unit.id, { col: order.col, row: order.row }, walked);
    }
  }

  function endTurn(): void {
    const turnBefore = getGame().state.turn;
    // Captured before the dispatch: if this is the command that resolves the
    // turn, the walk is over by the time it returns — and so is the research
    // that completed inside it, which is only visible as a difference.
    const orders = standingOrders();
    const research = researchSnapshot(getGame().state, localPlayerId);
    const result = dispatch(getGame(), { type: 'endTurn', playerId: localPlayerId });
    if (!result.ok) return;

    // Whatever was still sliding belongs to the turn that just ended.
    renderer.skipAnimations();
    renderer.invalidate();
    clearSelection();

    if (getGame().state.turn !== turnBefore) {
      animateResolvedMarches(orders);
      onTurnResolved?.(
        getGame().state.turn,
        researchSince(getGame().state, localPlayerId, research),
      );
      return;
    }
    const next = nextOpenSeat(localPlayerId);
    if (next !== null) {
      setLocalPlayer(next);
      onSeatAdvanced?.(next);
    }
  }

  // --- hover ---------------------------------------------------------------

  function refreshHover(): void {
    if (!pointer) return;
    const hover = renderer.pick(pointer.x, pointer.y);
    renderer.setHover(hover);
    // The spotlight follows the pointer, so it is refreshed here rather than in
    // `refreshOverlays` — which recomputes the reachable set and has no business
    // running on every mouse move. Both renderer setters ignore an unchanged
    // value, so resting the pointer on one tile costs nothing.
    refreshSpotlight();
    refreshPathPreview();
    onUpdate(selectedUnit(), hover);
  }

  // --- wiring --------------------------------------------------------------

  /**
   * The browser's context menu never appears over the board.
   *
   * Right click is a game input here whether or not anything is selected, and a
   * menu that popped up on the "nothing selected" half of that rule would be a
   * menu the player learns to expect and then loses.
   */
  viewport.addEventListener('contextmenu', (event) => event.preventDefault());

  viewport.addEventListener('pointerdown', (event) => {
    // Left and right only, and only one at a time: a second button pressed
    // mid-drag is a slip, not a gesture.
    if (event.button !== 0 && event.button !== 2) return;
    if (dragButton !== null) return;
    dragButton = event.button;
    travelled = 0;
    pressX = event.clientX;
    pressY = event.clientY;
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener('pointermove', (event) => {
    if (dragButton !== null) {
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

  /**
   * Ends a press. `fire` is false for a cancelled pointer, and for a release
   * that travelled far enough to have been a pan — the slop guard, which is
   * what keeps a right-drag pan (how a two-finger trackpad drag often arrives)
   * from ending in a move order the player never asked for.
   */
  function endDrag(event: PointerEvent, fire: boolean): void {
    if (dragButton === null) return;
    const button = dragButton;
    dragButton = null;
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
    if (!fire || travelled > CLICK_SLOP_PX) return;

    const rect = viewport.getBoundingClientRect();
    const hover = renderer.pick(event.clientX - rect.left, event.clientY - rect.top);
    if (!hover) return;
    if (button === 0) handleLeftClick(hover);
    else handleRightClick(hover);
  }

  viewport.addEventListener('pointerup', (event) => {
    // Releasing a button other than the one that started the drag leaves the
    // drag running; the gesture is not over until its own button comes up.
    if (event.button !== dragButton) return;
    endDrag(event, true);
  });
  viewport.addEventListener('pointercancel', (event) => endDrag(event, false));

  viewport.addEventListener('pointerleave', () => {
    pointer = null;
    renderer.setHover(null);
    renderer.setPathPreview([]);
    // The pointer took the spotlight with it. A banner keeps its own — moving
    // onto one does not leave the viewport, since banners live inside it.
    refreshSpotlight();
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
    // A screen in front of the board owns the keyboard while it is up, Escape
    // included: there is nothing behind it for Escape to back out of.
    if (inputBlocked?.()) return;

    const target = event.target as HTMLElement | null;
    const typing =
      target !== null &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable);

    // A letter typed into the seed box is a letter, not a hotkey — but Escape
    // is always Escape, or a popover opened from the keyboard would be one you
    // could not close from the keyboard.
    if (typing && event.key !== 'Escape') return;

    if (event.key === 'Escape') {
      // One layer at a time, outermost first. Each of these is something the
      // player put on the screen, and Escape takes back the most recent thing
      // they did — not everything at once.
      if (moveMode) setMoveMode(false);
      else if (closePopovers?.()) return;
      else if (openCity()) setOpenCity(null);
      else clearSelection();
      return;
    }
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
    if (event.key === 'f' || event.key === 'F') {
      // Silent with nothing selected, or on a unit that cannot dig in: the
      // blocker decides, exactly as the button's disabled state does.
      fortify();
      return;
    }
    if (event.key === 'y' || event.key === 'Y') {
      // Toggles the player's own switch, never the automatic rule: pressing Y
      // under an open city panel sets what will be up when the panel closes,
      // which is the only reading that does not lose a keystroke.
      setYields(!yieldsOn);
      return;
    }
    if (event.key === 't' || event.key === 'T') {
      // The tech screen. It takes the keyboard from here while it is up, so
      // this is only ever the way in.
      onToggleTechTree?.();
      return;
    }
    if (event.key === 'm' || event.key === 'M') {
      // The trackpad's right click. Silent when there is nothing to order:
      // `setMoveMode` refuses to arm without a unit that could move.
      setMoveMode(!moveMode);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      // A focused button is already listening for these two keys. Ending the
      // turn *and* pressing whatever the player had tabbed to is one keystroke
      // doing two jobs, and the browser's own activation is the one to keep.
      if (target?.tagName === 'BUTTON') return;
      if (event.key !== 'Enter') return;
      event.preventDefault();
      endTurn();
    }
  });

  /** Puts a lens up. The menu's rows; a no-op if it is already up. */
  function setLens(next: LensMode): void {
    if (manualLens === next) return;
    manualLens = next;
    refreshLens();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  /** Turns the yield glyphs on or off. The menu's checkbox and the `Y` key. */
  function setYields(on: boolean): void {
    if (yieldsOn === on) return;
    yieldsOn = on;
    refreshLens();
    onUpdate(selectedUnit(), renderer.getHover());
  }

  function setHoveredCity(cityId: number | null): void {
    if (hoveredCityId === cityId) return;
    hoveredCityId = cityId;
    refreshSpotlight();
  }

  return {
    clearSelection,
    endTurn,
    setLocalPlayer,
    lens: () => manualLens,
    setLens,
    yieldsShown: () => yieldsOn,
    setYields,
    setHoveredCity,
    foundCity,
    foundCityBlocker,
    cancelOrder,
    cancelOrderBlocker,
    fortify,
    fortifyBlocker,
    combatForecast,
    openCity,
    setOpenCity,
    setMoveMode,
    selectedUnit,
    isMoveMode: () => moveMode,
    localPlayerId: () => localPlayerId,
    /**
     * Re-reads the game after it has been replaced. A new game is a new table:
     * the local seat goes back to the first player and the camera opens on their
     * units, instantly — there is no previous view to travel from.
     */
    refresh: () => {
      selectedId = null;
      openCityId = null;
      // City ids do not survive a new game; the lens the player chose does.
      hoveredCityId = null;
      localPlayerId = 0;
      setMoveMode(false);
      refreshOverlays();
      showLocalPlayer(false);
      onUpdate(null, renderer.getHover());
    },
  };
}
