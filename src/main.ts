/**
 * Entry point: shows the landing screen, and on Start creates the game, builds a
 * renderer for it, wires the DOM panel, and hands every pointer and key event to
 * `src/ui/controls.ts`.
 *
 * Deliberately thin — no game logic here, and no input logic either. This file
 * owns the page: which elements exist, which player colours a new game gets,
 * and what the info panel says. Everything else is a call into the simulation or
 * into a renderer.
 *
 * Boot order
 * ----------
 * Nothing exists until the player presses Start. The landing screen is plain
 * markup in `index.html`, so it is on screen with the first paint and costs no
 * script at all; `boot()` — which creates the first `Game`, builds the renderer
 * and wires the whole HUD — runs on that first press and nowhere else. Two
 * things fall out of that order and both are worth the shape:
 *
 *   · there is no game to flash behind the landing, because there is no game.
 *     Nothing has to be hidden, dimmed or timed.
 *   · the sprite pipeline's image load and the 3D board build happen *inside*
 *     the Start press, where a disabled button already explains the wait.
 *
 * Every later Start — the landing comes back when Restart is confirmed — takes
 * the ordinary new-game path instead, the same one the old "New Game" button
 * used, so a restart resets exactly what a new game always did.
 *
 * Which renderer
 * --------------
 * The 3D toon renderer is the game. `?art=sprites` and `?art=flat` still bring
 * up the two 2D pipelines exactly as they behaved before, because being able to
 * put the old view beside the new one is worth keeping and because a frozen
 * pipeline that nobody can run is a pipeline nobody will notice breaking. They
 * are frozen, though: new visual work happens in `src/render3d/` only.
 *
 * The three renderers differ in what they need before they can draw — the sprite
 * artist has to await an image set, the other two need nothing — so the choice
 * is made once, up front, and everything after it talks to a `MapView`.
 */

import './style.css';
import { MAPGEN_CONFIG, MAP_SIZE_NAMES, getMapSize } from './sim/mapgen';
import { hashSeed } from './sim/rng';
import { RULES } from './sim/rulesData';
import { type Game, createGame, dispatch } from './sim/game';
import {
  type GameConfig,
  type GameState,
  type PlayerSpec,
  type Unit,
  hasEndedTurn,
  playerById,
  realPlayers,
} from './sim/state';
import type { Tile } from './sim/map';
import { describeUpgrade } from './sim/tech';
import { isExploredBy, isVisibleTo } from './sim/visibility';
import { techDef } from './sim/techData';
import { unitDef } from './sim/unitData';
import { Renderer } from './render/renderer';
import { loadSprites } from './render/sprites';
import { createFlatTileArtist, createTileArtist } from './render/tileVisuals';
import { playerPieceColor } from './render3d/lookData';
import { Renderer3D } from './render3d/renderer3d';
import {
  describeImprovement,
  describeOccupant,
  describeTile,
  resourceRowNode,
  tileYieldLineNodes,
  tileYieldNodes,
} from './ui/tileReadout';
import { explainDiscoveryOffer } from './sim/discoveries';
import { unitsOnTile } from './sim/units';
import {
  QUICKSAVE_SLOT,
  createAutosaver,
  exportFilename,
  loadSlot,
  makeSavePayload,
  namedSlotId,
  newestSlot,
  readSlot,
  resumeSeat,
  writeSave,
} from './ui/saves';
import {
  createSavesPanel,
  downloadJson,
  openSaveStorage,
  savedAtLabel,
} from './ui/savesPanel';
import { type AbacusRow, type AbacusScreen, createAbacusScreen } from './ui/abacusScreen';
import { type CityBanners, createCityBanners } from './ui/cityBanners';
import { type CityPanel, createCityPanel } from './ui/cityPanel';
import {
  type GameControls,
  type NoticeKind,
  createGameControls,
  wantsNativeContextMenu,
} from './ui/controls';
import { type DamageNumbers, createDamageNumbers } from './ui/damageNumbers';
import {
  type NotificationAction,
  type NotificationLog,
  createNotificationLog,
} from './ui/notifications';
import { type NotificationsPanel, createNotificationsPanel } from './ui/notificationsPanel';
import { createPopover } from './ui/popover';
import { type ToastStack, createToastStack } from './ui/toasts';
import { type StatecraftScreen, createStatecraftScreen } from './ui/statecraftScreen';
import { type TechTree, createTechTree } from './ui/techTree';
import { type TilePriceTags, createTilePriceTags } from './ui/tilePriceTags';
import { type CivYieldStrip, createCivYieldStrip } from './ui/topBar';
import { type OfferOption, createOfferCard } from './ui/offerCard';
import { SLOT_WORDS, describeCard } from './sim/statecraft';
import {
  type GovernmentId,
  SLOT_TYPES,
  doctrineDef,
  governmentDef,
  orderDef,
} from './sim/statecraftData';
import { createTurnSplash } from './ui/turnSplash';
import { type UnitPanel, createUnitPanel } from './ui/unitPanel';
import { YIELD_GLYPH } from './ui/figures';
import type { HoverInfo, LensMode, MapView } from './ui/mapView';
import type { TurnBlocker } from './ui/turnBlockers';

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

const seedInput = requireElement<HTMLInputElement>('seed');
const sizeSelect = requireElement<HTMLSelectElement>('size');
const seatsSelect = requireElement<HTMLSelectElement>('seats');
const randomSeedButton = requireElement<HTMLButtonElement>('random-seed');
const endTurnButton = requireElement<HTMLButtonElement>('end-turn');
const endTurnLabelEl = requireElement<HTMLElement>('end-turn-label');

/** The landing screen. See the boot-order note in the module docblock. */
const landingEl = requireElement<HTMLElement>('landing');
const landingForm = requireElement<HTMLFormElement>('landing-setup');
const landingErrorEl = requireElement<HTMLElement>('landing-error');

/**
 * The right button belongs to the game, and this is the one place that is said.
 *
 * Installed **at the document** rather than on the viewport, which is what
 * shipped and what leaked: right-drag pans with the pointer captured by the
 * viewport, but `contextmenu` is a mouse event and is hit-tested normally, so
 * every pan that ended with the cursor over a banner, a price tag, a toast, a
 * popover or the unit sheet fired the browser's menu on a surface that had
 * never heard of the rule. The condition is a fact about the *page* — is a
 * board on screen at all — so it is enforced where the page is known, and
 * `landingEl.hidden` is already the single answer to that (see `showLanding`).
 *
 * Two exemptions, and only two. The **landing** keeps the whole native menu: it
 * is a form, not a board, and a player pasting a seed should be able to paste a
 * seed. Over a live game, `wantsNativeContextMenu` keeps it for a text field
 * and nothing else — the save-name box is the one that matters today.
 *
 * Capture phase, so a surface that stops propagation on its own listeners
 * cannot accidentally opt itself back into a browser menu.
 */
document.addEventListener(
  'contextmenu',
  (event) => {
    if (!landingEl.hidden) return;
    if (wantsNativeContextMenu(event.target as HTMLElement | null)) return;
    event.preventDefault();
  },
  true,
);
const startButton = requireElement<HTMLButtonElement>('start-game');
const restartButton = requireElement<HTMLButtonElement>('restart');
const restartConfirmEl = requireElement<HTMLElement>('restart-confirm');
const restartYesButton = requireElement<HTMLButtonElement>('restart-yes');
const restartNoButton = requireElement<HTMLButtonElement>('restart-no');
const statusEl = requireElement<HTMLElement>('status');
/* The HUD's seat chips. Distinct from `seatsSelect` above, which is the
   landing's seat-count dropdown — they shared an id until 2026-08-24, and
   `getElementById` gave both of these the dropdown. */
const seatsEl = requireElement<HTMLElement>('seat-strip');
const civYieldsEl = requireElement<HTMLElement>('civ-yields');
/* The two meter cards, hung under the left end of the bar. The chips that open
   them are built by `topBar.ts` inside #civ-yields, so the triggers are its to
   make and the panels are the page's. */
const happinessPopoverEl = requireElement<HTMLElement>('happiness-popover');
const happinessBodyEl = requireElement<HTMLElement>('happiness-body');
const authorityPopoverEl = requireElement<HTMLElement>('authority-popover');
const authorityBodyEl = requireElement<HTMLElement>('authority-body');
const viewportEl = requireElement<HTMLDivElement>('viewport');
const bootEl = requireElement<HTMLElement>('boot');
const bannersEl = requireElement<HTMLElement>('banners');
const cityPanelEl = requireElement<HTMLElement>('city-panel');
const unitPanelEl = requireElement<HTMLElement>('unit-panel');
const turnSplashEl = requireElement<HTMLElement>('turn-splash');
/* The offer card's shell. Its contents are built by `ui/offerCard.ts` on each
   show — see that file for why this is the one blocking surface here. */
const offerOverlayEl = requireElement<HTMLElement>('offer-overlay');

/** The HUD's surfaces; see the layout comment in `index.html`. */
const menuButton = requireElement<HTMLButtonElement>('menu-button');
const menuPopoverEl = requireElement<HTMLElement>('menu-popover');
const menuExtrasEl = requireElement<HTMLElement>('menu-extras');
const helpButton = requireElement<HTMLButtonElement>('help-button');
const helpOverlayEl = requireElement<HTMLElement>('help-overlay');
const lensButton = requireElement<HTMLButtonElement>('lens-button');
const lensPopoverEl = requireElement<HTMLElement>('lens-popover');
const lensOptionsEl = requireElement<HTMLElement>('lens-options');
const lensTogglesEl = requireElement<HTMLElement>('lens-toggles');
const lensCurrentEl = requireElement<HTMLElement>('lens-current');
const lensYieldsFlagEl = requireElement<HTMLElement>('lens-yields-flag');
/* The research card, top-left: the whole card is the button that opens the star
   chart, so it is handed to `createTechTree` where the bar button used to be. */
const researchCard = requireElement<HTMLButtonElement>('hud-research');
const techCurrentEl = requireElement<HTMLElement>('tech-current');
const researchDialEl = requireElement<HTMLElement>('research-dial');
const researchGlyphEl = requireElement<HTMLElement>('research-glyph');
const researchTurnsEl = requireElement<HTMLElement>('research-turns');
const researchFiguresEl = requireElement<HTMLElement>('research-figures');
const techOverlayEl = requireElement<HTMLElement>('tech-overlay');
const techChartEl = requireElement<HTMLElement>('tech-chart');
/* The Abacus: the bar button that opens it, and the screen it opens. Its canvas
   is not here — `abacusScreen.ts` builds one into the stage on the first open. */
const abacusButton = requireElement<HTMLButtonElement>('abacus-button');
/* Statecraft's overlay and the body its contents are built into on each open.
   There is no bar button: the screen is opened from the culture chip's card, by
   the End Turn blocker, and by `C`. */
const statecraftOverlayEl = requireElement<HTMLElement>('statecraft-overlay');
const statecraftBodyEl = requireElement<HTMLElement>('statecraft-body');
const abacusOverlayEl = requireElement<HTMLElement>('abacus-overlay');
const abacusStageEl = requireElement<HTMLElement>('abacus-stage');
/**
 * Saving and loading: the landing's resume row, the ☰ menu's four verbs, and the
 * load list that both of them open. See `src/ui/saves.ts` for what a save *is*
 * and `src/ui/savesPanel.ts` for the list; what is here is the wiring.
 */
const continueButton = requireElement<HTMLButtonElement>('continue-game');
const continueLabelEl = requireElement<HTMLElement>('continue-label');
const landingLoadButton = requireElement<HTMLButtonElement>('landing-load');
const menuSaveButton = requireElement<HTMLButtonElement>('menu-save');
const menuSaveAsButton = requireElement<HTMLButtonElement>('menu-save-as');
const menuLoadButton = requireElement<HTMLButtonElement>('menu-load');
const menuExportButton = requireElement<HTMLButtonElement>('menu-export');
const menuStatecraftButton = requireElement<HTMLButtonElement>('menu-statecraft');
const saveAsForm = requireElement<HTMLFormElement>('save-as');
const saveAsNameInput = requireElement<HTMLInputElement>('save-as-name');
const saveAsGoButton = requireElement<HTMLButtonElement>('save-as-go');
const saveAsCancelButton = requireElement<HTMLButtonElement>('save-as-cancel');
const menuSaveNoteEl = requireElement<HTMLElement>('menu-save-note');

/* The notification channel's two surfaces: the toast stack under the bar, and
   the chronicle behind the ❧ button. See `src/ui/notifications.ts` for what is
   in them and why it is view state. */
const toastsEl = requireElement<HTMLElement>('toasts');
const logButton = requireElement<HTMLButtonElement>('log-button');
const logPopoverEl = requireElement<HTMLElement>('log-popover');
const logListEl = requireElement<HTMLElement>('log-list');
const logBadgeEl = requireElement<HTMLElement>('log-badge');

const contextEl = requireElement<HTMLElement>('hud-context');
const contextNoticeEl = requireElement<HTMLElement>('context-notice');
const combatForecastEl = requireElement<HTMLElement>('combat-forecast');

const infoMap = requireElement<HTMLElement>('info-map');
const infoSeed = requireElement<HTMLElement>('info-seed');
const infoTerrain = requireElement<HTMLElement>('info-terrain');
const infoFeature = requireElement<HTMLElement>('info-feature');
const infoYields = requireElement<HTMLElement>('info-yields');
const infoResource = requireElement<HTMLElement>('info-resource');
const infoImprovement = requireElement<HTMLElement>('info-improvement');
const infoOccupant = requireElement<HTMLElement>('info-occupant');
const infoOffset = requireElement<HTMLElement>('info-offset');
const infoAxial = requireElement<HTMLElement>('info-axial');
const infoUnit = requireElement<HTMLElement>('info-unit');

for (const name of MAP_SIZE_NAMES) {
  const option = document.createElement('option');
  option.value = name;
  option.textContent = MAPGEN_CONFIG.sizes[name]!.label;
  sizeSelect.append(option);
}
sizeSelect.value = MAP_SIZE_NAMES.includes('standard') ? 'standard' : MAP_SIZE_NAMES[0]!;

/**
 * The roster. Turns are simultaneous, so these are seats at one table rather
 * than a rotation: the game plays the local seat and the others will, in time,
 * be an AI or a remote peer. Until then the panel's seat chips let one tester
 * drive them all.
 *
 * The colours are the only thing the simulation cannot make up for itself, so
 * they live here rather than in `data/`. Each renderer maps them onto its own
 * inks — `data/view.json` for the sprite pieces, `data/view3d.json` for the
 * diorama ones.
 *
 * The two hexes are the interface palette's vermilion and teal (see
 * `docs/design-specimen.html`), so a seat chip, a city banner roundel and the
 * status line all speak in the same accents as the rest of the chrome. They are
 * lookup keys as much as colours: both renderers map them to a named piece ink
 * (`pieces.byPlayerColor` in `data/view.json`, `players.byColor` in
 * `data/view3d.json`), and those tables were updated with them — the pieces on
 * the board are the same crimson and teal they always were, matched explicitly
 * rather than through either file's index fallback.
 */
const PLAYERS: PlayerSpec[] = [
  { name: 'Crimson', color: '#d4502e', isHuman: true },
  { name: 'Teal', color: '#1f8a85', isHuman: true },
];

/**
 * How many of that roster a new game seats, and why the default is one.
 *
 * A game is *playtested* solo — there is no AI yet (it is punted until every
 * major system exists, see `docs/playable.md`), so a second seat is a second
 * empire nobody is driving, and every end of turn waits for a human to press
 * the button for it. One seat is therefore the honest default: the turn model
 * is simultaneous, `turnEnded` is an array of one, and resolution happens the
 * moment the only player ends their turn.
 *
 * The multi-seat sandbox stays exactly as it was, one option down the select —
 * it is the dev harness for driving both sides from the seat chips, and it is
 * the shape remote multiplayer will arrive in.
 */
const DEFAULT_SEATS = 1;

for (let seats = RULES.game.minPlayers; seats <= PLAYERS.length; seats++) {
  const option = document.createElement('option');
  option.value = String(seats);
  option.textContent =
    seats === 1 ? 'Solo (1 player)' : `Sandbox (${seats} players, one tester)`;
  seatsSelect.append(option);
}
seatsSelect.value = String(Math.min(DEFAULT_SEATS, PLAYERS.length));

// --- the HUD's transient cards ---------------------------------------------

/**
 * The three transient cards. Only one is ever open — each closes the other two
 * as it opens — and Escape reaches them through `controls`, which owns the key
 * and the order it backs things out in.
 *
 * They are built here, before any game exists, because they are properties of
 * the *page*: the help sheet reads the same with no game behind it, and the menu
 * has to be able to send the player back to the landing screen.
 */
const menu = createPopover({
  panel: menuPopoverEl,
  trigger: menuButton,
  closeButton: requireElement('menu-close'),
  onOpen: () => {
    help.close();
    lens.close();
    notifications?.close();
    meterCards?.close();
    // A card that opens showing "Restart?" is a card that will eventually be
    // answered by accident. The save row is reset for the same reason, plus one
    // of its own: its message line reports a moment, and the moment has passed.
    setRestartConfirm(false);
    resetSaveMenu();
  },
});
const help = createPopover({
  panel: helpOverlayEl,
  trigger: helpButton,
  closeButton: requireElement('help-close'),
  onOpen: () => {
    menu.close();
    lens.close();
    notifications?.close();
    meterCards?.close();
  },
});
const lens = createPopover({
  panel: lensPopoverEl,
  trigger: lensButton,
  closeButton: requireElement('lens-close'),
  onOpen: () => {
    menu.close();
    help.close();
    notifications?.close();
    meterCards?.close();
  },
});

// --- saving and loading -----------------------------------------------------

/**
 * The save shelf, opened once for the life of the page. See `openSaveStorage`:
 * a browser that will not persist anything gets a shelf that lasts for the tab
 * rather than a feature that is missing.
 */
const saveStorage = openSaveStorage();

/**
 * Hides the ☰ menu's Save As field and its last message.
 *
 * Called whenever the menu opens, for the reason the Restart confirm is reset
 * there: a card that opens showing a half-typed name, or "Saved at turn 12" from
 * ten minutes ago, is a card saying something that is no longer true.
 */
function resetSaveMenu(): void {
  saveAsForm.hidden = true;
  menuSaveNoteEl.hidden = true;
  menuSaveNoteEl.textContent = '';
  menuSaveNoteEl.classList.remove('is-error');
  saveAsGoButton.textContent = 'Save';
  pendingOverwrite = null;
}

/**
 * The slot a second press of Save As would overwrite, or `null`.
 *
 * The overwrite confirm, without a second surface to put it on: the first
 * submit for a name already on the shelf says so and arms this, and the next
 * submit of the *same* name goes through. Any other name disarms it, so the
 * confirm can never be spent on a save the player did not mean.
 */
let pendingOverwrite: string | null = null;

/**
 * The name the next quick save and the next export wear. It follows whatever
 * the player last called this game, so exporting after a Save As gets the file
 * they just named rather than a house default.
 */
let currentSaveName = 'Magister Ludi';

/**
 * The load list. Built at module scope, with the other cards, because the
 * landing needs it before any game exists — Load is one of the two things a
 * player can do on a cold page.
 */
const savesPanel = createSavesPanel({
  overlay: requireElement('saves-overlay'),
  list: requireElement('saves-list'),
  closeButton: requireElement('saves-close'),
  importButton: requireElement('saves-import'),
  fileInput: requireElement<HTMLInputElement>('saves-file'),
  emptyNote: requireElement('saves-empty'),
  errorEl: requireElement('saves-error'),
  storage: saveStorage,
  // Only once a game is up *and* on screen: with the landing showing, the game
  // behind it has already been walked away from (Restart), so there is nothing
  // left to ask about.
  abandonsGame: () => takeOverGame !== null && landingEl.hidden,
  onLoad: (loaded) => void beginGame(loaded),
});

/**
 * The tech screen, once `boot` has built it.
 *
 * A holder rather than a constant because it and `controls` each need the
 * other: the screen sends commands for the seat `controls` is playing, and `T`
 * arrives through `controls`. One of the two has to be reachable late, and a
 * screen that does not exist yet is the harmless half — there is nothing to
 * open before the game is up.
 */
let techTree: TechTree | null = null;

/**
 * The Abacus, once `boot` has built it. A holder for the same reason the star
 * chart is one: `A` arrives through `controls`, and the screen reads the roster
 * `controls` is seated at.
 */
let abacus: AbacusScreen | null = null;
/* Declared before `controls` for `techTree`'s reason exactly: the controls reach
   it (the End Turn blocker steers here), and it reaches the controls. */
let statecraft: StatecraftScreen | null = null;

/**
 * The top bar's meter chips, once `boot` has built them. A holder for the same
 * reason the star chart is one: the cards belong to a strip that needs a game to
 * read, and `closePopovers` is declared before there is one.
 */
let meterCards: CivYieldStrip | null = null;

/**
 * Every notice the seats have been shown, and the two surfaces that show them.
 *
 * The log is built here, at module scope and before any game exists, because it
 * outlives no game but belongs to no one game either — `adoptGame` empties it,
 * and that is the whole of its lifecycle (see `notifications.ts`: it is view
 * state, and a save carries the command log instead). The panel and the stack
 * are holders for `meterCards`' reason: both need `controls`, which does not
 * exist until `boot`, and `closePopovers` is declared before either.
 */
const notificationLog: NotificationLog = createNotificationLog();
let notifications: NotificationsPanel | null = null;
let toasts: ToastStack | null = null;

function closePopovers(): boolean {
  const wasOpen =
    menu.isOpen ||
    help.isOpen ||
    lens.isOpen ||
    (notifications?.isOpen ?? false) ||
    (meterCards?.isOpen ?? false) ||
    (techTree?.isOpen ?? false) ||
    (abacus?.isOpen ?? false) ||
    (statecraft?.isOpen ?? false) ||
    savesPanel.isOpen;
  menu.close();
  help.close();
  lens.close();
  notifications?.close();
  meterCards?.close();
  techTree?.close();
  abacus?.close();
  statecraft?.close();
  savesPanel.close();
  return wasOpen;
}

// --- the landing screen -----------------------------------------------------

/**
 * Puts a game on the built page — a loaded one, or `null` for a fresh game from
 * the landing's fields. `null` *itself* before `boot` has ever run.
 *
 * It doubles as the record of whether `boot` has run: the whole page — renderer,
 * controls, panels — is built once, on the first Start, and every start after
 * that goes through here instead. Loading is the same journey with a game that
 * already exists, which is why one holder carries both.
 */
let takeOverGame: ((next: Game | null) => void) | null = null;

/**
 * The landing's Continue button: what it says, and whether it is there at all.
 *
 * The newest save of any kind — the rolling autosave and a named slot compete on
 * one clock, because "where I was" is a question about time and not about which
 * button wrote it. Nothing to resume hides the button rather than disabling it:
 * a first-ever visit should see the form it always saw, not a dead control
 * explaining an absence.
 */
function refreshResumeRow(): void {
  const slot = newestSlot(saveStorage);
  continueButton.hidden = slot === null;
  continueLabelEl.textContent =
    slot === null ? '' : `Turn ${slot.turn} · ${savedAtLabel(slot.savedAt)}`;
  continueButton.title = slot === null ? '' : `Resume “${slot.name}”`;
}

function showLanding(): void {
  // Nothing from the game may be left standing in front of the landing. The
  // popovers sit below it in the stack, so this is not what makes them
  // invisible — it is so that Start does not drop the player back into a game
  // with a card open that they opened a game ago, and so that the landing is
  // never competing with a second surface for the keyboard.
  closePopovers();
  // A toast is not a popover and would otherwise float over the landing card,
  // still counting down news about a game the player has walked away from.
  toasts?.clear();
  setRestartConfirm(false);
  // The Abacus holds a WebGL context of its own, and the game it was counting
  // is over. `closePopovers` above has already shut it; this gives the context
  // and its five thousand triangles back, and the next game builds a fresh
  // stage on the first press of `A`.
  abacus?.dispose();
  statecraft?.dispose();
  // `hidden` is the whole of the screen state — one flag, read by `inputBlocked`
  // as well as by the stylesheet, so "is the landing up?" has one answer.
  landingEl.hidden = false;
  landingErrorEl.hidden = true;
  // The shelf may have grown since the last time this screen was up — the game
  // that just ended autosaved every turn of it.
  refreshResumeRow();
  // The button, not the seed field: Start is what the player came here to press,
  // and Shift+Tab reaches the two fields above it.
  startButton.focus();
}

function hideLanding(): void {
  landingEl.hidden = true;
}

/** Swaps the Restart button for its inline "Restart? Yes / No". */
function setRestartConfirm(asking: boolean): void {
  restartButton.hidden = asking;
  restartConfirmEl.hidden = !asking;
  if (asking) restartYesButton.focus();
}

/**
 * The way into a game, for all three of its jobs: building the page the first
 * time, starting a new game every time after, and resuming a loaded one.
 *
 * `loaded` is a game that has already been fully replayed (see `saves.ts` — a
 * `Game` never exists here unless every command in its log was accepted), so
 * from this point down a resumed game and a fresh one are the same object and
 * take the same path. That is the whole of "the game boots exactly as a fresh
 * game does": there is one boot, and one hand-over.
 *
 * The button is disabled for the duration because the first press is genuinely
 * slow — a sprite set to fetch, or a board to bake — and a second press
 * mid-build would run the whole boot twice.
 */
async function beginGame(loaded: Game | null = null): Promise<void> {
  if (startButton.disabled) return;
  startButton.disabled = true;
  landingErrorEl.hidden = true;
  try {
    if (takeOverGame) takeOverGame(loaded);
    else await boot(loaded);
    hideLanding();
  } catch (error) {
    // A missing sprite or a dead WebGL context is a build problem, not a blank
    // page: say so where the player is already looking.
    landingErrorEl.textContent = error instanceof Error ? error.message : String(error);
    landingErrorEl.hidden = false;
    console.error(error);
  } finally {
    startButton.disabled = false;
  }
}

landingForm.addEventListener('submit', (event) => {
  event.preventDefault();
  void beginGame();
});

// On the landing this only rolls a seed — it no longer starts a game behind the
// player's back, because Start is right there and is the only thing that does.
randomSeedButton.addEventListener('click', () => {
  // UI-side only: the simulation itself never calls Math.random().
  seedInput.value = String(Math.floor(Math.random() * 1_000_000));
  seedInput.focus();
});

/**
 * Continue: the newest save, loaded straight, with no list in between.
 *
 * The refusal lands on the landing's own error line rather than in the list,
 * because the player never opened a list — they pressed one button and it did
 * not work, and the sentence belongs where they are looking. A save too broken
 * to load is also a save that should stop being offered, so the row is rebuilt.
 */
continueButton.addEventListener('click', () => {
  const slot = newestSlot(saveStorage);
  const result = slot === null ? null : loadSlot(saveStorage, slot.id);
  if (result === null || !result.ok) {
    landingErrorEl.textContent =
      result === null ? 'That save is no longer there.' : result.error;
    landingErrorEl.hidden = false;
    if (result !== null && !result.ok && result.detail !== undefined) {
      console.error(`[magister-ludi save] ${result.detail}`);
    }
    refreshResumeRow();
    return;
  }
  void beginGame(result.game);
});

landingLoadButton.addEventListener('click', () => savesPanel.open());

restartButton.addEventListener('click', () => setRestartConfirm(true));
restartNoButton.addEventListener('click', () => {
  setRestartConfirm(false);
  restartButton.focus();
});
restartYesButton.addEventListener('click', () => {
  // Back to the landing with this game's seed and size still in the fields —
  // they are the same two inputs that produced it, so "prefilled" costs nothing.
  // `showLanding` closes the menu this button lives in, and resets this confirm.
  showLanding();
});

showLanding();

/** Accepts a number or any word (hashed) as a seed. */
function parseSeed(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === '') return 0;
  const asNumber = Number(trimmed);
  return Number.isFinite(asNumber) ? Math.trunc(asNumber) | 0 : hashSeed(trimmed);
}

function currentConfig(): GameConfig {
  return {
    seed: parseSeed(seedInput.value),
    sizeName: sizeSelect.value,
    // The first N of the roster, so seat 0 is always Crimson and a solo game is
    // the two-seat game with the second chair empty rather than a different one.
    players: PLAYERS.slice(0, Number(seatsSelect.value) || DEFAULT_SEATS),
    // **The game asks for the wild.** `GameConfig.barbarians` defaults to off so
    // that a fixture, an inspection page or a pacing measurement gets the quiet
    // world it always had (see that field); a real game played by a person is
    // the caller that wants camps in the fog, and this is where it says so.
    barbarians: true,
  };
}

// --- panel text ------------------------------------------------------------

/**
 * Writes the hovered tile's yields into the panel's yield row: the total, and
 * under it the itemized lines it is the fold of.
 *
 * Both come from `src/ui/tileReadout.ts`, which is where the whole vocabulary of
 * the hover card lives now that the mapgen inspection page speaks it too — and
 * both come from the *same* list there, so the column of lines a player reads
 * down adds up to the figure above it by construction rather than by agreement
 * between two evaluators (CLAUDE.md rule 5, at the surface it was written for).
 *
 * What is left here is the one thing that *is* this page's business: which
 * element the row is written into, and that a tile producing nothing says so
 * once rather than printing six zeroes. A hex whose every line is zero — bare
 * desert — still gets its lines, because "Desert, nothing" is the answer
 * somebody hovering bare desert came for.
 */
function showTileYields(state: GameState, playerId: number, tile: Tile): void {
  const shown = tileYieldNodes(state, playerId, tile);
  const lines = document.createElement('ul');
  lines.className = 'yield-lines';
  lines.append(...tileYieldLineNodes(state, playerId, tile));
  if (shown.length === 0) {
    const nothing = document.createElement('span');
    nothing.textContent = '—';
    infoYields.replaceChildren(nothing, lines);
    return;
  }
  infoYields.replaceChildren(...shown, lines);
}

/**
 * What is standing on the tile under the pointer — anybody's piece the local
 * seat can currently see.
 *
 * Looking is not commanding, so an enemy piece in sight is described in full.
 * A piece on ground this seat merely *remembers* is not described at all, which
 * is the same rule the board draws by (`pieces.ts`): terrain is static and can
 * be reported from memory, an army is not.
 *
 * The card describes the *ground and what is on it*; the selected unit has its
 * own panel on the right, with its own numbers and its own verbs. A stack says
 * how deep it is rather than listing itself into a scrollbar.
 */
function describeUnitsOn(state: GameState, playerId: number, tile: Tile): string {
  if (!isVisibleTo(state, playerId, tile.col, tile.row)) return '—';
  const units = unitsOnTile(state, tile.col, tile.row);
  const first = units[0];
  if (!first) return '—';
  const def = unitDef(first.type);
  const owner = state.players[first.ownerId];
  const more = units.length > 1 ? ` +${units.length - 1}` : '';
  return `${def.name} · ${first.hp}/${def.maxHp} hp · ${owner?.name ?? '—'}${more}`;
}

/**
 * A strength for the forecast card: whole when it is whole, one decimal when the
 * multipliers left it fractional.
 *
 * Terrain and fortification are fractions of a small integer, so a defender's
 * effective strength is very often something like 8.5 — and rounding it to 9 on
 * the card while the curve fights with 8.5 would be the card lying about the
 * evaluator it is a view of. One decimal is the least that never does that.
 */
function strengthFigure(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * The combat forecast block: the two effective strengths over the lines they
 * fold from, both damage figures with their bands, and the two hit-point bars
 * they would leave behind.
 *
 * Every number comes from `previewCombat` and none is recomputed here, which is
 * the whole point (Entry VIII, applied to violence): the card is a *view* of the
 * evaluator the reducer runs, so it cannot promise a blow the fight will not
 * deal. The ± is the roll band, printed rather than hidden, because a forecast
 * that showed one number for a random outcome would be lying by omission.
 *
 * A refusal is shown as words instead. "You cannot attack that, and here is why"
 * is exactly what a player aiming at something out of reach needs to read, and
 * it is the reducer's own sentence.
 */
function showCombatForecast(preview: ReturnType<GameControls['combatForecast']>): void {
  combatForecastEl.replaceChildren();
  combatForecastEl.hidden = preview === null;
  if (preview === null) return;

  if (!preview.ok) {
    const why = document.createElement('p');
    why.className = 'combat-blocked';
    why.textContent = preview.error;
    combatForecastEl.append(why);
    return;
  }

  const head = document.createElement('p');
  head.className = 'combat-head';
  head.textContent =
    preview.kind === 'ranged'
      ? `Shoot ${preview.defenderName}`
      : `Attack ${preview.defenderName}`;
  combatForecastEl.append(head);

  /**
   * The two effective strengths, as the card's **headline** (user, 2026-08-26:
   * "combat info should show attack strength of each unit"), each over the lines
   * it is the fold of.
   *
   * Rule 5, and the card's job here is only to *print* it: `attackerLines` and
   * `defenderLines` come out of `planCombat` already folding to the numbers
   * above them, so nothing is summed on this side of the wall. A capture is the
   * one case with no strengths worth reading — nobody fights — and it returns
   * before this block below.
   */
  function strengthColumn(
    label: string,
    strength: number,
    lines: readonly { source: string; amount: number }[],
    tone: 'attacker' | 'defender',
  ): HTMLElement {
    const column = document.createElement('div');
    column.className = `combat-strength is-${tone}`;

    const who = document.createElement('span');
    who.className = 'combat-strength-label';
    who.textContent = label;

    const figure = document.createElement('span');
    figure.className = 'combat-strength-figure';
    figure.textContent = strengthFigure(strength);

    const list = document.createElement('ul');
    list.className = 'combat-strength-lines';
    for (const line of lines) {
      const row = document.createElement('li');
      const source = document.createElement('span');
      source.textContent = line.source;
      const amount = document.createElement('span');
      amount.className = 'combat-strength-amount';
      amount.textContent = `${line.amount > 0 ? '+' : ''}${strengthFigure(line.amount)}`;
      row.append(source, amount);
      list.append(row);
    }

    column.append(who, figure, list);
    return column;
  }

  /** One side of the trade: a damage figure, its band, and the bar it leaves. */
  function side(
    label: string,
    tone: 'dealt' | 'taken',
    damage: number,
    min: number,
    max: number,
    hp: number,
    maxHp: number,
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = `combat-side is-${tone}`;

    const name = document.createElement('span');
    name.className = 'combat-side-label';
    name.textContent = label;

    const figure = document.createElement('span');
    figure.className = 'combat-damage';
    // The band as a ± when it is symmetric enough to read that way, which the
    // roll band always is — it is a fixed fraction either side of the midpoint.
    const spread = Math.max(damage - min, max - damage);
    figure.textContent = spread > 0 ? `−${damage} ±${spread}` : `−${damage}`;

    const bar = document.createElement('span');
    bar.className = 'combat-bar';
    const fill = document.createElement('span');
    fill.className = 'combat-bar-fill';
    const left = Math.max(0, hp - damage);
    const share = (value: number): number =>
      maxHp > 0 ? Math.round((value / maxHp) * 100) : 0;
    fill.style.width = `${share(left)}%`;
    // The share about to be lost, butted right up against the surviving share,
    // so the bar reads left to right: kept, then going, then already gone.
    const loss = document.createElement('span');
    loss.className = 'combat-bar-loss';
    loss.style.left = `${share(left)}%`;
    loss.style.width = `${share(Math.min(damage, hp))}%`;
    bar.append(fill, loss);

    const after = document.createElement('span');
    after.className = 'combat-after';
    after.textContent = `${left}/${maxHp}`;

    row.append(name, figure, bar, after);
    return row;
  }

  if (preview.capturesUnit) {
    const note = document.createElement('p');
    note.className = 'combat-note';
    note.textContent = 'Captured — no fight';
    combatForecastEl.append(note);
    return;
  }

  const strengths = document.createElement('div');
  strengths.className = 'combat-strengths';
  strengths.append(
    strengthColumn(preview.attackerName, preview.attackerStrength, preview.attackerLines, 'attacker'),
    strengthColumn(preview.defenderName, preview.defenderStrength, preview.defenderLines, 'defender'),
  );
  combatForecastEl.append(strengths);

  combatForecastEl.append(
    side(
      preview.defenderName,
      'dealt',
      preview.damageToDefender,
      preview.damageToDefenderMin,
      preview.damageToDefenderMax,
      preview.defenderHp,
      preview.defenderMaxHp,
    ),
  );
  if (preview.damageToAttacker > 0) {
    combatForecastEl.append(
      side(
        preview.attackerName,
        'taken',
        preview.damageToAttacker,
        preview.damageToAttackerMin,
        preview.damageToAttackerMax,
        preview.attackerHp,
        preview.attackerMaxHp,
      ),
    );
  }

  // Whatever is left to say once the two columns have said the rest. Terrain,
  // fortification, the ford and every flat bonus are **strength lines** now and
  // are printed under the side they belong to — repeating them here was the same
  // sentence twice, and worse, it was the same sentence with the reasons pooled
  // so a reader could not tell which side each one helped.
  const modifiers: string[] = [];
  if (preview.capturesCity) modifiers.push('would take the city');
  if (modifiers.length > 0) {
    const note = document.createElement('p');
    note.className = 'combat-note';
    note.textContent = modifiers.join(' · ');
    combatForecastEl.append(note);
  }
}

/**
 * What the End Turn button says, and how loudly.
 *
 * The button is the one control pressed every single turn, so it is also the
 * cheapest place to tell the player there is something outstanding — before they
 * press it, rather than by bouncing them off it. Three things change together:
 *
 *   · the verb, which becomes the *job* rather than the outcome ("Choose
 *     production" is an instruction; "End Turn" is a result);
 *   · the style — vermilion primary only when the turn can actually end, and the
 *     quiet parchment otherwise, so "not ready" reads at a glance and the one
 *     loud button in the corner stays meaningful;
 *   · the tooltip, which is where Shift ⏎ is written down.
 *
 * It is never *disabled*: a blocked press is not a refusal, it is the fastest
 * way to get taken to the thing you forgot.
 */
const END_TURN_LABELS: Record<TurnBlocker['kind'], string> = {
  idleUnit: 'Unit needs orders',
  cityProduction: 'Choose production',
  research: 'Choose research',
  discovery: 'A discovery awaits',
  statecraft: 'A card awaits',
};

function showEndTurnState(blocker: TurnBlocker | null): void {
  endTurnLabelEl.textContent = blocker ? END_TURN_LABELS[blocker.kind] : 'End Turn';
  endTurnButton.classList.toggle('btn-primary', blocker === null);
  endTurnButton.classList.toggle('btn-quiet', blocker !== null);
  endTurnButton.title = blocker
    ? 'Something is still outstanding — press to go to it, or Shift-click to end the turn anyway'
    : 'End your turn (Enter)';
}

// --- renderer selection ----------------------------------------------------

type ArtMode = 'toon3d' | 'sprites' | 'flat';

function artMode(): ArtMode {
  const art = new URLSearchParams(window.location.search).get('art');
  if (art === 'sprites') return 'sprites';
  if (art === 'flat') return 'flat';
  return 'toon3d';
}

/** Drops the canvases the chosen renderer will not draw into. */
function keepCanvases(keep: 'toon3d' | 'canvas2d'): void {
  const ids =
    keep === 'toon3d'
      ? ['layer-terrain', 'layer-overlay', 'layer-units']
      : ['layer-3d'];
  for (const id of ids) document.getElementById(id)?.remove();
}

/**
 * The 3D-only controls: a shadow switch and a stats line.
 *
 * They live in the setup popover, with the other session-rare knobs, and are
 * built here rather than sitting in `index.html` because only one of the three
 * renderers has them at all. Shadows are exposed because they are the one
 * setting that can turn a smooth board into a slideshow on a weak GPU, and the
 * player is the only one who can tell whether they are worth it on theirs.
 */
function build3DPanel(renderer: Renderer3D): () => void {
  const row = document.createElement('div');
  row.className = 'row check';
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.id = 'shadows';
  toggle.checked = renderer.shadowsEnabled;
  const label = document.createElement('label');
  label.htmlFor = 'shadows';
  label.textContent = 'Shadows';
  row.append(toggle, label);
  menuExtrasEl.append(row);

  const stats = document.createElement('p');
  stats.id = 'stats';
  menuExtrasEl.append(stats);

  toggle.addEventListener('change', () => {
    renderer.setShadows(toggle.checked);
    report();
  });

  function report(): void {
    const s = renderer.stats;
    stats.textContent =
      `${s.tiles} tiles · ${s.instances} instances · ${s.drawCalls} draws\n` +
      `board build ${s.buildMs.toFixed(1)} ms`;
  }

  return () => {
    report();
    // One honest line per board, in the console as well as on the page — but a
    // frame late, because the draw-call count only means anything once a frame
    // has actually been drawn.
    requestAnimationFrame(() => {
      const s = renderer.stats;
      console.log(
        `[magister-ludi 3d] ${s.tiles} tiles, ${s.instances} instances, ` +
          `${s.drawCalls} draw calls, board built in ${s.buildMs.toFixed(1)} ms`,
      );
      report();
    });
  };
}

async function createRenderer(
  mode: ArtMode,
  game: Game,
): Promise<{ view: MapView; report: () => void }> {
  if (mode === 'toon3d') {
    keepCanvases('toon3d');
    bootEl.remove();
    // The controls sheet is written for every renderer at once; the lines that
    // only apply to the 2D pipelines go away when they are not the one running.
    for (const el of helpOverlayEl.querySelectorAll('[data-only="2d"]')) el.remove();
    const renderer = new Renderer3D(requireElement<HTMLCanvasElement>('layer-3d'));
    const report = build3DPanel(renderer);
    renderer.setGameState(game.state);
    report();
    return { view: renderer, report };
  }

  keepCanvases('canvas2d');
  const artist =
    mode === 'flat' ? createFlatTileArtist() : createTileArtist(await loadSprites());
  bootEl.remove();
  const renderer = new Renderer(
    {
      terrain: requireElement<HTMLCanvasElement>('layer-terrain'),
      overlay: requireElement<HTMLCanvasElement>('layer-overlay'),
      units: requireElement<HTMLCanvasElement>('layer-units'),
    },
    artist,
    game.state.map,
  );
  renderer.setGameState(game.state);
  return { view: renderer, report: () => undefined };
}

// --- boot ------------------------------------------------------------------

/**
 * Builds the whole page around a first game: the renderer, the input layer, the
 * HUD and every panel. Runs exactly once, inside the first Start press — see the
 * boot-order note at the top of the file.
 *
 * `initial` is a game loaded from a save, when the first press was Continue or a
 * row in the load list rather than Start. It is the *only* difference a resumed
 * game makes to this function: everything below builds around whatever `game`
 * turns out to be, and the two paths rejoin at the bottom where the seat is
 * chosen.
 */
async function boot(initial: Game | null): Promise<void> {
  let game: Game = initial ?? createGame(currentConfig());
  const { view: renderer, report } = await createRenderer(artMode(), game);

  /**
   * `Turn N — <you>` while the local seat still has moves to make, and
   * `Turn N — Waiting: <them>` once it has ended and the turn cannot resolve
   * until somebody else does.
   *
   * The waiting state is not reachable by pressing End Turn — that hops to the
   * next open seat — but it is exactly what a networked client will sit in, and
   * the seat chips reach it today.
   */
  function updateStatus(): void {
    const { state } = game;
    const local = state.players[controls.localPlayerId()];
    if (!local) return;

    // Two voices in one short line: the turn is a count, so it is mono, and the
    // player is a name, so it is the naming face — in their own colour while
    // they still have moves to make.
    const turn = document.createElement('span');
    turn.className = 'status-turn';
    turn.textContent = `Turn ${state.turn}`;
    const who = document.createElement('span');
    who.className = 'status-name';

    const playing = !hasEndedTurn(state, local.id);
    statusEl.classList.toggle('is-waiting', !playing);
    if (playing) {
      who.textContent = local.name;
      who.style.color = local.color;
    } else {
      // `realPlayers`, not the raw roster: the wild's flag is raised for it every
      // turn (`clearTurnEnded`) so it would never appear here anyway, but a seat
      // strip that agrees with this line by accident is a seat strip that will
      // disagree the day a seat is auto-ended for some other reason.
      const waiting = realPlayers(state).filter((player) => !hasEndedTurn(state, player.id));
      who.textContent =
        waiting.length > 0
          ? `Waiting: ${waiting.map((p) => p.name).join(', ')}`
          : 'resolving';
    }
    statusEl.replaceChildren(turn, who);
  }

  /**
   * The seat chips: who is at the table, whose seat this client is playing
   * (outlined), and who has already ended their turn (faded, ticked).
   *
   * Clicking one is hot-seat play, kept as a development harness — hence the
   * deliberately unglamorous title text. Rebuilt wholesale on every panel
   * update because there are at most a dozen of them and a diff would be more
   * code than the elements.
   *
   * **`realPlayers`, never `state.players`.** The wild is a `Player` so that
   * combat and fog need no second implementation (design ledger, Entry XX), and
   * it is emphatically not somebody at the table: a chip for it sat in the top
   * bar of every solo game, ticked, as though the player were waiting on the
   * steppe to finish thinking. Every roster-shaped surface in the interface asks
   * the one register — this strip, the status line's waiting list, and the
   * Abacus's rods — so a seat kind that should not be listed (a city-state) is
   * excluded by its flag rather than by a third audit of this file.
   */
  function renderSeats(): void {
    const { state } = game;
    const localId = controls.localPlayerId();
    seatsEl.replaceChildren();

    for (const player of realPlayers(state)) {
      const done = hasEndedTurn(state, player.id);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'seat';
      chip.classList.toggle('is-local', player.id === localId);
      chip.classList.toggle('is-done', done);
      chip.style.setProperty('--seat-color', player.color);
      chip.textContent = done ? `${player.name} ✓` : player.name;
      chip.title = `dev: switch seat to ${player.name}`;
      // `setLocalPlayer` calls back into `updatePanel`, which rebuilds these
      // chips — including this one, mid-click. That is safe: the event has
      // already been delivered.
      chip.addEventListener('click', () => controls.setLocalPlayer(player.id));
      seatsEl.append(chip);
    }
  }

  function updateMapInfo(): void {
    const size = getMapSize(game.config.sizeName);
    infoMap.textContent = `${size.width} × ${size.height} (${game.config.sizeName})`;
    infoSeed.textContent = String(game.config.seed);
  }

  /**
   * The bottom-left context card: what the pointer is over, and what the game
   * has to say about the last order.
   *
   * It reads and never acts — the selection's verbs are on the unit sheet — and
   * it is *shown* rather than laid out, since the card is pinned to its corner
   * and only fades. A card that appears mid-hover never shifts anything the
   * player was reading. With nothing hovered and no message outstanding it fades
   * away entirely rather than sitting there full of em dashes.
   */
  function updateContext(hover: HoverInfo | null): void {
    /**
     * Terra Incognita: the one place the naming bible's register (design-notes
     * Entry X) is allowed into the readout.
     *
     * A hidden tile answers with its name and nothing else — not its terrain,
     * not its coordinates in the world's own words, not its yields. Picking
     * still works normally (fog is a mask, not a hole in the board), so a player
     * may hover, click and order a march into it; the card simply refuses to
     * describe ground nobody has been to. Blanking every row and writing the
     * phrase into the terrain slot is deliberate: the card's shape does not
     * change, so hovering across a frontier reads as the world running out
     * rather than as a panel breaking.
     */
    if (hover && !isExploredBy(game.state, controls.localPlayerId(), hover.tile.col, hover.tile.row)) {
      infoTerrain.textContent = 'Terra Incognita';
      infoFeature.textContent = '—';
      infoOffset.textContent = '—';
      infoAxial.textContent = '—';
      infoUnit.textContent = '—';
      infoYields.textContent = '—';
      infoResource.textContent = '—';
      infoImprovement.textContent = '—';
      infoOccupant.textContent = '—';
      showCombatForecast(controls.combatForecast());
      contextEl.classList.add('is-shown');
      return;
    }
    if (hover) {
      const described = describeTile(hover.tile);
      infoTerrain.textContent = described.terrain + (described.hills ? ' (hills)' : '');
      infoFeature.textContent = described.feature;
      infoOffset.textContent = `col ${hover.tile.col}, row ${hover.tile.row}`;
      infoAxial.textContent = `q ${hover.axial.q}, r ${hover.axial.r}`;
      infoUnit.textContent = describeUnitsOn(
        game.state,
        controls.localPlayerId(),
        hover.tile,
      );
      showTileYields(game.state, controls.localPlayerId(), hover.tile);
      infoResource.replaceChildren(
        resourceRowNode(game.state, controls.localPlayerId(), hover.tile),
      );
      infoImprovement.textContent = describeImprovement(hover.tile);
      infoOccupant.textContent = describeOccupant(
        game.state,
        controls.localPlayerId(),
        hover.tile,
      );
    } else {
      infoTerrain.textContent = '—';
      infoFeature.textContent = '—';
      infoOffset.textContent = '—';
      infoAxial.textContent = '—';
      infoUnit.textContent = '—';
      infoYields.textContent = '—';
      infoResource.textContent = '—';
      infoImprovement.textContent = '—';
      infoOccupant.textContent = '—';
    }

    // Asked after the readout, because it is a question about the selection and
    // the pointer together rather than about the ground.
    showCombatForecast(controls.combatForecast());

    contextEl.classList.toggle('is-shown', hover !== null || !contextNoticeEl.hidden);
  }

  /**
   * The message line inside the context card: move mode while it is armed, a
   * refused order for a beat and a half, or a guidance line End Turn's blocker
   * pointed the player at. `kind` is the difference between a "no" the player
   * did not ask for and everything else in this slot — only a refusal flashes;
   * `'guide'` reads with the same calm styling `'mode'` already has (`controls.ts`
   * module docblock's three-way split).
   */
  function showNotice(text: string | null, kind: NoticeKind): void {
    const flinches = text !== null && kind === 'reject';
    contextNoticeEl.hidden = text === null;
    contextNoticeEl.textContent = text ?? '';
    contextNoticeEl.classList.toggle('is-reject', flinches);
    // Cleared here as well as re-armed below: the class used to survive its own
    // animation, so a combat line arriving after a refusal inherited the
    // refusal's flinch — visible now that this slot carries news as well as no.
    if (!flinches) contextNoticeEl.classList.remove('is-flashing');
    // Restart the flash even when the same refusal arrives twice in a row: two
    // identical "no"s should look like two.
    if (text !== null && kind === 'reject') {
      contextNoticeEl.classList.remove('is-flashing');
      void contextNoticeEl.offsetWidth;
      contextNoticeEl.classList.add('is-flashing');
    }
    updateContext(renderer.getHover());
  }

  /**
   * Everything derived, after anything at all. `selected` is not read here —
   * the unit sheet asks `controls` for the live selection itself, so a caller
   * that has no unit to hand (the End Turn button, a city panel edit) cannot
   * accidentally blank a panel that should still be up.
   */
  function updatePanel(_selected: Unit | null, hover: HoverInfo | null): void {
    updateStatus();
    renderSeats();
    updateLensMenu();
    // Cities change on almost everything — founding, growth, production, a seat
    // change — so every view of them is refreshed wherever the main panel is,
    // the empire's per-turn totals in the top bar included.
    civYields.render();
    // The research card changes with the seat, with the science rate and with
    // every completed tech, so it refreshes wherever the rest of the HUD does.
    techTree?.render();
    // The chronicle changes with the seat too — each has its own — so the badge
    // and any open list are re-read here rather than only when something is
    // announced.
    notifications?.refresh();
    banners.refresh();
    // The tags are about the open city and the treasury, both of which this
    // pass has just re-read; they draw nothing at all unless buy mode is up.
    priceTags.refresh();
    cityPanel.render();
    unitPanel.render();
    // Whether the turn may end is derived from the same state as everything
    // else on this list — a unit that just moved, a queue that just filled, a
    // technology just chosen — so it is recomputed in the same one place.
    showEndTurnState(controls.endTurnBlocker());

    updateContext(hover);
  }

  // --- lifecycle ------------------------------------------------------------

  /**
   * Turn announcements. Created before `controls` because `controls` reports
   * into it: a resolved turn is announced to the seat that is about to play it,
   * and a harness seat hop says whose chair you have just been moved to.
   */
  const splash = createTurnSplash(turnSplashEl);

  /**
   * The discovery card. Created before `controls` for `splash`'s reason: the
   * controls report into it, both when a march claims a site and when End Turn
   * finds the offer still unanswered.
   */
  const offerCard = createOfferCard(offerOverlayEl);

  /**
   * Puts the local seat's pending offer on screen, if it has one.
   *
   * The offer is read off the *state* rather than passed in, so the card can
   * never show a hand one command out of date, and every figure on it comes from
   * `explainDiscoveryOption` — the same `plan…` functions that will settle it.
   * What this function adds is the one thing the simulation deliberately does not
   * say: the glyph. `YIELD_GLYPH` is the interface's table (`ui/figures.ts`), so
   * "+20⚙ to Uruk" is composed here and the sim keeps saying *which voice and
   * how much*.
   */
  function showDiscoveryOffer(): void {
    const seat = controls.localPlayerId();
    const player = playerById(game.state, seat);
    const offer = player?.pendingDiscovery;
    if (!offer) return;

    const options = explainDiscoveryOffer(game.state, seat, offer).map((payoff) => {
      const parts: string[] = [];
      if (payoff.yield !== null) {
        parts.push(`+${payoff.amount}${YIELD_GLYPH[payoff.yield]}`);
        if (payoff.cityName !== null) parts.push(`to ${payoff.cityName}`);
      }
      if (payoff.unitName !== null) parts.push(`A free ${payoff.unitName}`);
      const option: OfferOption = {
        title: payoff.name,
        payoff: parts.join(' '),
        flavor: payoff.flavor,
      };
      // "completes Granary" / "grows to 4" / "completes Mining" — the whole
      // point of a windfall settling instantly, said before the choice.
      if (payoff.completes !== null) {
        option.note = payoff.completes.startsWith('size ')
          ? `grows to ${payoff.completes.slice('size '.length)}`
          : `completes ${payoff.completes}`;
      }
      if (payoff.warning !== null) option.warning = payoff.warning;
      return option;
    });

    offerCard.show(
      {
        eyebrow: offer.kind === 'ruins' ? 'an ancient ruin' : 'a tribal village',
        title: offer.kind === 'ruins' ? 'The stones remember' : 'They come to meet you',
        options,
      },
      (index) => {
        dispatch(game, { type: 'chooseDiscovery', playerId: seat, optionIndex: index });
        controls.refresh();
      },
    );
  }

  /**
   * Puts whatever Statecraft owes the local seat on screen — a draft, a
   * Doctrine, or the banked government triple.
   *
   * **One function for three offers**, in the order they can be outstanding, and
   * that is the whole reason the offer card was written generic (`offerCard.ts`,
   * "the shape of that gesture"): a Statecraft draft is a discovery's card at a
   * different scale, and the two dressings differ by a `weight` and the words.
   *
   * Every clause a card prints is `describeCard` at the level the empire would
   * hold it — the same function the Statecraft screen prints, so a card reads
   * identically on the offer that dealt it and in the collection afterwards.
   * The upgrade option is the one place two levels are shown at once: it prints
   * the *current* face and the deepened one, because "widen or deepen" is not a
   * question a player can answer without both.
   */
  function showStatecraftOffer(): void {
    const seat = controls.localPlayerId();
    const player = playerById(game.state, seat);
    if (!player) return;
    const sc = player.statecraft;

    if (sc.pendingOrder !== undefined) {
      const offer = sc.pendingOrder;
      const options: OfferOption[] = offer.options.map((id) => ({
        title: orderDef(id).name,
        payoff: `${SLOT_WORDS[orderDef(id).slot]} Order`,
        note: describeCard(id).map((clause) => clause.text).join(' · '),
        flavor: orderDef(id).flavor,
      }));
      const upgrade = offer.upgrade;
      if (upgrade !== undefined) {
        const level = sc.orders.find((owned) => owned.id === upgrade)?.level ?? 1;
        options.push({
          title: `${orderDef(upgrade).name} · ${level} → ${level + 1}`,
          payoff: 'Deepen an Order you hold',
          // Before and after, from one function at two levels: the whole of the
          // draft's question in one line.
          note: `${describeCard(upgrade, level).map((c) => c.text).join(' · ')}  ⟶  ${describeCard(
            upgrade,
            level + 1,
          )
            .map((c) => c.text)
            .join(' · ')}`,
          flavor: orderDef(upgrade).flavor,
        });
      }
      offerCard.show(
        {
          eyebrow: `tier ${sc.drafts} · the culture meter is full`,
          title: 'Write it into law',
          note: 'A new Order joins your collection. Slotting it is a separate act — and a sealed one.',
          options,
        },
        (index) => {
          dispatch(game, { type: 'chooseOrder', playerId: seat, optionIndex: index });
          controls.refresh();
          statecraft?.refresh();
          // A pick can uncover the next thing owed — a banked charter dealt on
          // the same tier — so the chain is offered rather than left waiting
          // behind a blocker the player has to press twice.
          showStatecraftOffer();
        },
      );
      return;
    }

    if (sc.pendingGovernment !== undefined) {
      const offer = sc.pendingGovernment;
      offerCard.show(
        {
          eyebrow: `tier ${offer.tier} · a charter is ready`,
          title: 'Swear a government',
          // The three consequences, said before the choice rather than
          // discovered after it. This is the one irreversible pick in the game.
          note:
            'Adopting swaps your slot spread, lifts every seal so your Orders can be re-laid, ' +
            'and opens a Doctrine — which is permanent.',
          weight: 'heavy',
          options: offer.options.map((id) => ({
            title: governmentDef(id).name,
            payoff: slotWords(id),
            note: describeCard(id).map((clause) => clause.text).join(' · ') || 'No signature',
            flavor: governmentDef(id).flavor,
          })),
        },
        (index) => {
          dispatch(game, { type: 'adoptGovernment', playerId: seat, choiceIndex: index });
          controls.refresh();
          statecraft?.refresh();
          showStatecraftOffer();
        },
      );
      return;
    }

    if (sc.pendingDoctrine !== undefined) {
      const offer = sc.pendingDoctrine;
      offerCard.show(
        {
          eyebrow: 'a doctrine · permanent, and slotless',
          title: 'What this age will be remembered for',
          note: 'A Doctrine occupies no slot and is never given up. One per government.',
          weight: 'heavy',
          options: offer.options.map((id) => ({
            title: doctrineDef(id).name,
            payoff: 'Permanent',
            note: describeCard(id).map((clause) => clause.text).join(' · '),
            flavor: doctrineDef(id).flavor,
          })),
        },
        (index) => {
          dispatch(game, { type: 'chooseDoctrine', playerId: seat, optionIndex: index });
          controls.refresh();
          statecraft?.refresh();
        },
      );
    }
  }

  /** A government's spread in words: "2 military · 1 economic · 1 wildcard". */
  function slotWords(id: GovernmentId): string {
    const spread = governmentDef(id).slots;
    return SLOT_TYPES.filter((type) => spread[type] > 0)
      .map((type) => `${spread[type]} ${SLOT_WORDS[type]}`)
      .join(' · ');
  }

  /**
   * The rolling autosave, written after every turn resolution.
   *
   * Declared before `controls` because the hook it hangs off is one of that
   * object's callbacks; it reaches back into `controls` for its one warning,
   * which is safe because a callback cannot fire before the thing that owns it
   * exists.
   */
  const autosave = createAutosaver({
    storage: saveStorage,
    onWarn: (message) => {
      // Once per session, by construction (see `createAutosaver`) — so this is
      // allowed to use the loud slot rather than only the console.
      console.warn(`[magister-ludi] ${message}`);
      controls.announce(message);
      refreshResumeRow();
    },
  });

  /**
   * The lens menu's rows, in the order they are shown: the exclusive lens
   * choices the menu below builds buttons for, and — via `controls`'s
   * `lensOrder` — the one source of order the number-key hotkeys read
   * (`lensForDigit` in `controls.ts`). Declared before `controls` for exactly
   * that: the wiring needs the order, and a second copy of this list for the
   * hotkeys to read would be the very mapping this shape is meant to avoid.
   */
  const LENS_OPTIONS: [LensMode, string, string][] = [
    ['none', 'None', 'The board as it is'],
    ['settler', 'Settler', 'Where a city may go: blue is coastal, green is fresh water'],
    ['explorer', 'Explorer', 'What is left to find: gold is a ruin or a village, red is a camp'],
  ];

  const controls = createGameControls({
    viewport: viewportEl,
    renderer,
    getGame: () => game,
    onUpdate: updatePanel,
    onNotice: showNotice,
    // The other half of the split (`controls.ts`'s docblock): news gets a toast
    // under the bar *and* a line in the seat's chronicle, and both come from the
    // same entry so a player who missed the card can read exactly what it said.
    // The seat comes from `controls` rather than being asked back of it — it is
    // the authority on which chair is being played, and the one command that
    // changes chairs would otherwise file its news under the wrong one.
    onNotify: (entry, seatId) => {
      notificationLog.push(seatId, entry);
      // Only the seat actually at the keyboard gets a card. The log is written
      // for everyone, because a seat comes back to it.
      if (seatId === controls.localPlayerId()) toasts?.show(entry);
      notifications?.refresh();
    },
    closePopovers,
    // A screen in front of the board owns the keyboard: the landing, and the two
    // full-screen surfaces — the star chart and the Abacus — each of which
    // handles its own Escape while it is up.
    inputBlocked: () =>
      !landingEl.hidden ||
      (techTree?.isOpen ?? false) ||
      (abacus?.isOpen ?? false) ||
      (statecraft?.isOpen ?? false) ||
      // The load list is the third such screen, and the only one that can be up
      // while the landing is: it handles its own Escape (see `savesPanel.ts`).
      savesPanel.isOpen ||
      // The offer card is the one genuinely blocking surface here: it owns the
      // keyboard while it is up, and there is nothing to escape to (see
      // `offerCard.ts`).
      offerCard.isOpen,
    onToggleTechTree: () => techTree?.toggle(),
    onToggleAbacus: () => abacus?.toggle(),
    // End Turn's research blocker puts the chart up; it never takes it down.
    onOpenTechTree: () => techTree?.open(),
    onOfferDiscovery: showDiscoveryOffer,
    onToggleStatecraft: () => statecraft?.toggle(),
    // End Turn's Statecraft blocker puts the offer card up, because the offer is
    // what is owed; the screen is where a *slot* is changed and is opened by the
    // player rather than at them.
    onOfferStatecraft: showStatecraftOffer,
    onTurnResolved: () => {
      // The turn is over and the next one has not been touched, which is the one
      // moment in a game where the log is a clean place to come back to. It is
      // taken *here* rather than with the card below because a save must never
      // wait on an animation: the hand-over is held until the marches this click
      // set off have finished (see `scheduleHandOver`), and a tab closed in that
      // second would otherwise have lost the turn.
      autosave.save(game, Date.now());
    },
    onTurnHandedOver: (_turn, research) => {
      // A discovery outranks the turn card: "your turn" happens every turn,
      // and a technology lands twenty times in a game. The upgrade tally rides
      // underneath it, because a warrior that quietly became a swordsman is
      // exactly the change a player would otherwise miss.
      const tech = research.techs[0];
      if (tech) {
        splash.announceTech(techDef(tech).name, research.upgrades.map(describeUpgrade));
        return;
      }
      const local = game.state.players[controls.localPlayerId()];
      if (local) splash.announceTurn(local.name);
    },
    onSeatAdvanced: (playerId) => {
      const player = game.state.players[playerId];
      if (player) splash.announceSeat(player.name);
    },
    // The board's own account of a fight. `controls` measures these as
    // hit-point differences, so a figure that floats up is a figure the state
    // actually moved.
    onDamage: (events) => damageNumbers.show(events),
    onVictory: (playerId) => {
      const player = game.state.players[playerId];
      if (player) splash.announceVictory(player.name);
    },
    // The number-key hotkeys' one source of order — see `LENS_OPTIONS`'s own
    // docblock for why this is declared above rather than the menu passing it
    // down.
    lensOrder: LENS_OPTIONS.map(([mode]) => mode),
  });

  /**
   * What clicking a notification's action does — the one switch, shared by the
   * toast stack and the chronicle, so a toast and its log entry can never come
   * to disagree about what the click means. Aliased-discriminant idiom, same as
   * the reducer's own exhaustiveness check (`sim/commands.ts`'s `applyCommand`):
   * switching on the aliased `kind` still narrows `action` inside each case, and
   * leaves `kind` — not `action` — as the `never` the `default` needs, so the
   * day `NotificationAction` grows a second kind this stops compiling wherever
   * it is not yet handled.
   */
  function runAction(action: NotificationAction): void {
    const kind = action.kind;
    switch (kind) {
      case 'pan':
        controls.panTo(action.cell);
        return;
      case 'openStatecraft':
        statecraft?.open();
        return;
      default: {
        const unhandled: never = kind;
        throw new Error(`Unknown notification action "${String(unhandled)}"`);
      }
    }
  }

  /**
   * The notification channel's two surfaces, built after `controls` because both
   * ask it something: the stack runs an entry's action, and the panel asks it
   * whose chronicle to show.
   */
  toasts = createToastStack({
    container: toastsEl,
    onAction: runAction,
  });

  notifications = createNotificationsPanel({
    panel: logPopoverEl,
    trigger: logButton,
    closeButton: requireElement('log-close'),
    list: logListEl,
    badge: logBadgeEl,
    log: notificationLog,
    localPlayerId: () => controls.localPlayerId(),
    onAction: runAction,
    // The HUD's one-card-at-a-time rule, from the other side.
    onOpenPopover: () => {
      menu.close();
      help.close();
      lens.close();
      meterCards?.close();
      techTree?.close();
    },
  });

  /**
   * The lens menu's rows: the exclusive lens choices, built off `LENS_OPTIONS`
   * (declared above `controls`, and see that declaration for why).
   */
  const lensButtons = LENS_OPTIONS.map(([mode, label, hint], index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lens-option';
    // The row's own hotkey, spelled out where the row is. Counted the way
    // `lensForDigit` counts — over the *lenses*, with the None row struck out
    // and taking `0` — so the tooltip cannot drift from the key that fires.
    const digit = LENS_OPTIONS.slice(0, index).filter(([m]) => m !== 'none').length + 1;
    button.title = mode === 'none' ? `${hint} (0)` : `${hint} (${digit})`;
    const name = document.createElement('span');
    name.className = 'lens-option-name';
    name.textContent = label;
    const tick = document.createElement('span');
    tick.className = 'lens-option-tick';
    tick.textContent = '✓';
    tick.setAttribute('aria-hidden', 'true');
    button.append(name, tick);
    button.addEventListener('click', () => {
      controls.setLens(mode);
      lens.close();
    });
    lensOptionsEl.append(button);
    return { mode, label, button };
  });

  /**
   * One switch under the lens rows, as a real checkbox: these are on/off
   * settings, so they wear the control the platform already has for one, with
   * its own label, its own hit area and its own keyboard behaviour.
   *
   * The card stays open when one is flipped — unlike choosing a lens, this is a
   * switch the player may well want to flip back while looking at the same
   * board.
   */
  function addLensToggle(
    id: string,
    label: string,
    key: string,
    hint: string,
    onChange: (on: boolean) => void,
  ): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    const row = document.createElement('label');
    row.className = 'lens-toggle';
    row.htmlFor = input.id;
    row.title = hint;
    const name = document.createElement('span');
    name.className = 'lens-option-name';
    name.textContent = label;
    const kbd = document.createElement('kbd');
    kbd.className = 'lens-toggle-key';
    kbd.textContent = key;
    row.append(input, name, kbd);
    lensTogglesEl.append(row);
    input.addEventListener('change', () => onChange(input.checked));
    return input;
  }

  const yieldsToggle = addLensToggle(
    'lens-yields',
    'Yields',
    'Y',
    'Show every tile’s food, production and gold (Y)',
    (on) => controls.setYields(on),
  );
  const resourcesToggle = addLensToggle(
    'lens-resources',
    'Resources',
    'R',
    'Name what is on the ground: a roundel on every resource you know of (R)',
    (on) => controls.setResources(on),
  );

  function updateLensMenu(): void {
    const current = controls.lens();
    for (const option of lensButtons) {
      const on = option.mode === current;
      option.button.classList.toggle('is-on', on);
      option.button.setAttribute('aria-pressed', String(on));
    }
    const yields = controls.yieldsShown();
    yieldsToggle.checked = yields;
    resourcesToggle.checked = controls.resourcesShown();

    // The bar button says both, because both are on the board: the lens by
    // name, and the glyphs as a flag beside it. "off" is only honest when neither
    // is up.
    const chosen = lensButtons.find((option) => option.mode === current);
    lensCurrentEl.textContent =
      current === 'none' ? (yields ? '—' : 'off') : (chosen?.label ?? 'off');
    lensYieldsFlagEl.hidden = !yields;
  }

  /**
   * The star chart, and the HUD's research card it is opened from.
   *
   * Declared after `controls` because it asks whose seat this is; reached by
   * `controls` through the `techTree` holder above, which is what breaks the
   * knot between the two.
   */
  techTree = createTechTree({
    overlay: techOverlayEl,
    chart: techChartEl,
    closeButton: requireElement('tech-close'),
    statusCard: researchCard,
    statusName: techCurrentEl,
    statusDial: researchDialEl,
    statusGlyph: researchGlyphEl,
    statusBoss: researchTurnsEl,
    statusFigures: researchFiguresEl,
    getGame: () => game,
    localPlayerId: () => controls.localPlayerId(),
    onChanged: () => updatePanel(null, renderer.getHover()),
    // Two full-screen screens at one z-index is one of them being invisible.
    onOpen: () => abacus?.close(),
  });

  /**
   * The Statecraft screen: the empire's law, laid out on the table.
   *
   * Declared after `controls` for `techTree`'s reason and reached back through
   * the `statecraft` holder above. Every write it makes is a **command** — it
   * calls `dispatch` and never touches the state — so a slot changed here is a
   * slot changed the same way a network peer or a future AI would change one,
   * and the sentence a refused drop shows is the reducer's own.
   */
  statecraft = createStatecraftScreen({
    overlay: statecraftOverlayEl,
    body: statecraftBodyEl,
    closeButton: requireElement('statecraft-close'),
    getState: () => game.state,
    getPlayerId: () => controls.localPlayerId(),
    slot: (cardId, slotIndex) => {
      dispatch(game, { type: 'slotOrder', playerId: controls.localPlayerId(), cardId, slotIndex });
      controls.refresh();
    },
    unslot: (slotIndex) => {
      dispatch(game, { type: 'unslotOrder', playerId: controls.localPlayerId(), slotIndex });
      controls.refresh();
    },
    adopt: () => {
      // The charter is a *card*, not a panel: the same offer surface the draft
      // and the Doctrine use, so an irreversible choice always arrives the same
      // way. The screen closes under it, because two modals is one of them
      // being invisible.
      statecraft?.close();
      showStatecraftOffer();
    },
    // A refusal is guidance the player provoked, not news: the manicule line,
    // which is what `controls.guide` writes (see its docblock).
    onRefuse: (message) => controls.guide(`☞ ${message}`),
    onOpen: () => {
      menu.close();
      help.close();
      lens.close();
      techTree?.close();
      abacus?.close();
    },
  });

  /**
   * The Abacus: the score, as an object on the table.
   *
   * One rod per seat, read off the live roster rather than off a snapshot, so a
   * new game re-strings it — and off `realPlayers`, for `renderSeats`' reason:
   * the reckoning is between nations, and a rod for the wild was a score line
   * for the weather. `beads` is empty for everybody and will stay empty
   * until M11 gives the simulation a bead to earn — the screen says so itself,
   * and this is the field that will carry the answer when there is one.
   */
  abacus = createAbacusScreen({
    overlay: abacusOverlayEl,
    stage: abacusStageEl,
    closeButton: requireElement('abacus-close'),
    trigger: abacusButton,
    rows: (): AbacusRow[] =>
      realPlayers(game.state).map((player) => ({
        playerId: player.id,
        name: player.name,
        // The diorama ink, not the panel colour: the label swatch belongs to the
        // same table the frame is standing on. Same call the pieces make.
        color: playerPieceColor(player.color, player.id),
        beads: [],
      })),
    onOpen: () => {
      menu.close();
      help.close();
      lens.close();
      techTree?.close();
    },
  });

  /**
   * The empire's per-turn totals, at the left end of the top bar. A pure sum
   * over the local seat's cities, refreshed with everything else.
   */
  const civYields: CivYieldStrip = createCivYieldStrip({
    container: civYieldsEl,
    getGame: () => game,
    localPlayerId: () => controls.localPlayerId(),
    happiness: {
      panel: happinessPopoverEl,
      closeButton: requireElement('happiness-close'),
      body: happinessBodyEl,
    },
    authority: {
      panel: authorityPopoverEl,
      closeButton: requireElement('authority-close'),
      body: authorityBodyEl,
    },
    // The strip's cards join the HUD's one-card-at-a-time rule: opening one
    // shuts the menu, the help sheet and the lens menu, exactly as those three
    // shut each other.
    onOpenPopover: () => {
      menu.close();
      help.close();
      lens.close();
      notifications?.close();
      techTree?.close();
    },
    // The culture chip's own way in — see `topBar.ts`'s `civ-yield-clickable`.
    // Closes the strip's own cards first, the same one-card-at-a-time rule
    // `onOpenPopover` keeps for its three: a card left open under the
    // Statecraft screen would be a card the player comes back to having
    // abandoned its game.
    onOpenStatecraft: () => {
      meterCards?.close();
      menu.close();
      help.close();
      lens.close();
      notifications?.close();
      techTree?.close();
      statecraft?.open();
    },
  });
  // Escape and the landing screen reach these through `closePopovers`, which is
  // declared before any game exists — so it finds them through this holder.
  meterCards = civYields;

  /**
   * The two city views. Both are pure readers of the simulation plus one
   * command (the panel's `setCityProduction`), and both are declared after
   * `controls` because they ask it whose seat this is and which city is open.
   */
  /**
   * The figures that rise off the board when a blow lands. They share the
   * banner sheet, because both are DOM floating over the same canvas and both
   * must stay clear of the pointer.
   */
  const damageNumbers: DamageNumbers = createDamageNumbers({
    container: bannersEl,
    renderer,
  });

  const banners: CityBanners = createCityBanners({
    container: bannersEl,
    renderer,
    getGame: () => game,
    localPlayerId: () => controls.localPlayerId(),
    onOpenCity: (cityId) => controls.setOpenCity(cityId),
    // Read fresh every refresh, not pushed — see `cityBanners.ts`'s "The open
    // city has no banner". Whatever this returns simply drops out of the list.
    openCity: () => controls.openCity(),
    // Hovering a banner lights that city's worked tiles, exactly as hovering
    // its ground does — the label floats above the board, so the board's own
    // hover picking never sees it.
    onHoverCity: (cityId) => controls.setHoveredCity(cityId),
  });

  /**
   * The renderer has one frame-listener slot and two things now want the beat,
   * so the page holds it and hands the beat on. Keeping the fan-out here rather
   * than growing a subscription list on `MapView` is deliberate: composition is
   * this file's job, and the renderer stays a renderer with one callback.
   */
  /**
   * The gold price over every hex the open city could buy, while the city
   * screen's Buy Tiles mode is up. Same sheet as the banners and the damage
   * figures: all three are DOM floating over the one canvas.
   */
  const priceTags: TilePriceTags = createTilePriceTags({
    container: bannersEl,
    renderer,
    getGame: () => game,
    getCity: () => controls.openCity(),
    isActive: () => controls.isBuyMode(),
    onBuy: (cell) => {
      controls.purchaseTileAt(cell.col, cell.row);
      updatePanel(null, renderer.getHover());
    },
  });

  renderer.setFrameListener?.(() => {
    banners.reposition();
    damageNumbers.reposition();
    priceTags.reposition();
  });

  const cityPanel: CityPanel = createCityPanel({
    container: cityPanelEl,
    getGame: () => game,
    localPlayerId: () => controls.localPlayerId(),
    getCity: () => controls.openCity(),
    onClose: () => controls.setOpenCity(null),
    isBuyMode: () => controls.isBuyMode(),
    setBuyMode: (on) => controls.setBuyMode(on),
    onChanged: () => {
      renderer.invalidate();
      updatePanel(null, renderer.getHover());
    },
  });

  /**
   * The unit sheet, in the same slot as the city screen. It reads the selection
   * from `controls` rather than from the argument `updatePanel` was handed, and
   * founding is its action rather than the context card's — the blocker string
   * is the same one the reducer decides by.
   */
  const unitPanel: UnitPanel = createUnitPanel({
    container: unitPanelEl,
    getGame: () => game,
    getUnit: () => controls.selectedUnit(),
    foundCityBlocker: () => controls.foundCityBlocker(),
    onFoundCity: () => {
      controls.foundCity();
      updatePanel(null, renderer.getHover());
    },
    cancelOrderBlocker: () => controls.cancelOrderBlocker(),
    onCancelOrder: () => {
      controls.cancelOrder();
      updatePanel(null, renderer.getHover());
    },
    fortifyBlocker: () => controls.fortifyBlocker(),
    onFortify: () => {
      controls.fortify();
      updatePanel(null, renderer.getHover());
    },
    sleepBlocker: () => controls.sleepBlocker(),
    onSleep: () => {
      controls.sleepUnit();
      updatePanel(null, renderer.getHover());
    },
    skipBlocker: () => controls.skipBlocker(),
    onSkip: () => {
      controls.skipUnit();
      updatePanel(null, renderer.getHover());
    },
    isUnitSkipped: () => controls.isUnitSkipped(),
    improvementOptions: () => controls.improvementOptions(),
    onBuildImprovement: (id) => {
      controls.buildImprovement(id);
      updatePanel(null, renderer.getHover());
    },
    chopBlocker: () => controls.chopBlocker(),
    chopPreview: () => controls.chopPreview(),
    chopTechName: () => controls.chopTechName(),
    onChop: () => {
      controls.chop();
      updatePanel(null, renderer.getHover());
    },
    pillageBlocker: () => controls.pillageBlocker(),
    onPillage: () => {
      controls.pillage();
      updatePanel(null, renderer.getHover());
    },
    onClose: () => controls.clearSelection(),
  });

  /**
   * Puts a game on the built page: a fresh one from the landing's fields when
   * `next` is `null`, or a loaded one when it is not.
   *
   * The two are deliberately one function. "After a load the game boots exactly
   * as a fresh game does" is not a thing to remember to do — it is what happens
   * because there is no second path to get it wrong in. The only branch is the
   * seat, and the sentence at the end.
   */
  function adoptGame(next: Game | null): void {
    // An announcement about the game that just ended has nothing to say about
    // the one starting, so it goes with it.
    splash.clear();
    // Nor does its chronicle, and the whole of it goes: the log is view state
    // and belongs to one game (see `notifications.ts`). Every seat's, because
    // every seat is being re-dealt. `controls.refresh` re-baselines the sighting
    // watcher against the new board a few lines down, so the first poll of the
    // new game says nothing about ground it starts already knowing.
    notificationLog.clear();
    toasts?.clear();
    // A star chart of the game that just ended has nothing to say about the
    // one starting either.
    techTree?.close();
    // Nor does a scoreboard. The rods themselves are re-strung — the new table
    // may seat different people — but not now: `refresh` only marks them stale,
    // and the rebuild happens on the next open, if there ever is one.
    abacus?.close();
    abacus?.refresh();
    game = next ?? createGame(currentConfig());
    // The turn guard is about *this* game's turns. A resumed game is very often
    // at a turn number the last one also reached, and without this its first
    // autosave would be swallowed as a duplicate.
    autosave.reset();
    renderer.setGameState(game.state);
    controls.refresh(next === null ? 0 : resumeSeat(game.state));
    updateMapInfo();
    updatePanel(null, null);
    report();
    // The name follows the game, so an export straight after a load offers the
    // file the player recognises rather than the house default.
    if (next !== null) {
      controls.announce(`Resumed at turn ${game.state.turn}.`);
    }
  }

  // Every start after this one comes back through here rather than through
  // `boot`: a restart is a new game and a load is a game that already exists,
  // and this is the path both take — one that resets the selection, the lens,
  // the panels and the camera.
  takeOverGame = adoptGame;

  // --- the menu's save verbs ------------------------------------------------

  /** The ☰ menu's one message line: what the last press did, or why it did not. */
  function saveNote(text: string, isError: boolean): void {
    menuSaveNoteEl.textContent = text;
    menuSaveNoteEl.hidden = false;
    menuSaveNoteEl.classList.toggle('is-error', isError);
  }

  /**
   * Writes a slot and says so. The one place a save is taken from the menu, so
   * the shelf-dependent surfaces are refreshed in exactly one place too.
   */
  function saveTo(slotId: string, name: string): void {
    const result = writeSave(saveStorage, slotId, makeSavePayload(game, name, Date.now()));
    if (!result.ok) {
      saveNote(result.error, true);
      return;
    }
    currentSaveName = name;
    saveNote(`Saved “${name}” at turn ${game.state.turn}.`, false);
    savesPanel.refresh();
    refreshResumeRow();
  }

  menuSaveButton.addEventListener('click', () => {
    resetSaveMenu();
    saveTo(QUICKSAVE_SLOT, 'Quick Save');
  });

  menuSaveAsButton.addEventListener('click', () => {
    resetSaveMenu();
    saveAsForm.hidden = false;
    saveAsNameInput.value = currentSaveName === 'Magister Ludi' ? '' : currentSaveName;
    saveAsNameInput.focus();
    saveAsNameInput.select();
  });

  saveAsCancelButton.addEventListener('click', () => {
    resetSaveMenu();
    menuSaveAsButton.focus();
  });

  /**
   * Save As, with the overwrite confirm folded into the button rather than into
   * a second surface: the first submit of a name already on the shelf says so
   * and arms the confirm, and submitting *that same name* again goes through.
   * Typing a different name disarms it, so the confirm cannot be spent on a save
   * the player did not mean to answer for.
   */
  saveAsForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = saveAsNameInput.value.trim();
    if (name === '') {
      saveNote('Give the save a name.', true);
      saveAsNameInput.focus();
      return;
    }
    const slotId = namedSlotId(name);
    if (pendingOverwrite !== slotId && readSlot(saveStorage, slotId) !== null) {
      pendingOverwrite = slotId;
      saveAsGoButton.textContent = 'Overwrite';
      saveNote(`A save called “${name}” already exists.`, true);
      return;
    }
    pendingOverwrite = null;
    saveAsForm.hidden = true;
    saveAsGoButton.textContent = 'Save';
    saveTo(slotId, name);
  });

  menuLoadButton.addEventListener('click', () => {
    resetSaveMenu();
    // The menu goes: the list is a screen, and a card left open underneath it
    // would be a card the player comes back to having abandoned its game.
    menu.close();
    savesPanel.open();
  });

  // The menu's own door to Statecraft — see the button's comment in
  // `index.html`. Same pattern as Load: the menu goes, the screen comes up.
  menuStatecraftButton.addEventListener('click', () => {
    menu.close();
    statecraft?.open();
  });

  menuExportButton.addEventListener('click', () => {
    resetSaveMenu();
    // Straight off the live game rather than out of a slot: Export is "give me
    // *this*", and asking the player to save first would be an extra step whose
    // only purpose is to make the file exist somewhere else first.
    const payload = makeSavePayload(game, currentSaveName, Date.now());
    downloadJson(exportFilename(payload), JSON.stringify(payload));
    saveNote(`Exported ${exportFilename(payload)}.`, false);
  });

  // Shift is the override, on the button as well as on the key it wears: a
  // keyboard activation of a focused button carries the modifier through to the
  // click, so Shift ⏎ and Shift-click are genuinely one gesture.
  endTurnButton.addEventListener('click', (event) => {
    controls.endTurn(event.shiftKey);
    updatePanel(null, renderer.getHover());
  });

  window.addEventListener('resize', () => renderer.resize());

  updateMapInfo();
  updatePanel(null, null);
  renderer.resize();
  // After the first resize, never before: a 3D board framed against a viewport
  // that had not been laid out yet re-frames itself in `resize`, which would
  // undo the opening view of the local player's units.
  //
  // The seat is the one thing the first press can differ about: a fresh game
  // opens at seat 0, and a resumed one at whichever seat its flags imply (see
  // `resumeSeat`). Everything above this line was built the same way either way.
  controls.refresh(initial === null ? 0 : resumeSeat(game.state));
  if (initial !== null) controls.announce(`Resumed at turn ${game.state.turn}.`);
}
