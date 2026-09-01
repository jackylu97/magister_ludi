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
import { driveBots } from './ai/driver';
import {
  type GameConfig,
  type GameState,
  type PlayerSpec,
  type Unit,
  foundedReligion,
  hasEndedTurn,
  playerById,
  realPlayers,
} from './sim/state';
import type { Tile } from './sim/map';
import { describeUpgrade } from './sim/tech';
import { isExploredBy, isVisibleTo } from './sim/visibility';
import { techDef } from './sim/techData';
import { unitDef, unitMaxHp } from './sim/unitData';
import { Renderer } from './render/renderer';
import { loadSprites } from './render/sprites';
import { createFlatTileArtist, createTileArtist } from './render/tileVisuals';
import { heraldryFor, heraldryMarkDataUri } from './art/heraldryMarks';
import { playerPieceColor } from './render3d/lookData';
import { Renderer3D } from './render3d/renderer3d';
import {
  describeImprovement,
  describeOccupant,
  describeTile,
  describeWater,
  foundingCostRow,
  resourceRequirementNode,
  resourceRowNode,
  tileYieldContributions,
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
import { openingFocus } from './ui/openingFocus';
import {
  createSavesPanel,
  downloadJson,
  openSaveStorage,
  savedAtLabel,
} from './ui/savesPanel';
import { type AbacusRow, type AbacusScreen, createAbacusScreen } from './ui/abacusScreen';
import { type BeadsScreen, createBeadsScreen } from './ui/beadsScreen';
import { type VictoryModal, createVictoryModal } from './ui/victoryModal';
import {
  type BeadModal,
  type BeadNews,
  beadRodsFor,
  createBeadModal,
} from './ui/beadModal';
import { type BeadAge, BEAD_RULES } from './sim/beadData';
import { type CityBanners, createCityBanners } from './ui/cityBanners';
import { type CityPanel, createCityPanel } from './ui/cityPanel';
import {
  cityPhaseLine,
  createGameControls,
  showsSeatStrip,
  statecraftPause,
  type GameControls,
  type NoticeKind,
  type StatecraftPause,
  wantsNativeContextMenu,
} from './ui/controls';
import { type DamageNumbers, createDamageNumbers } from './ui/damageNumbers';
import { installFlourishMarks } from './ui/deviceMarks';
import { dressFrontispiece } from './ui/frontispiece';
import {
  type NotificationAction,
  type NotificationLog,
  createNotificationLog,
} from './ui/notifications';
import { type NotificationsPanel, createNotificationsPanel } from './ui/notificationsPanel';
import { createPopover } from './ui/popover';
import { type HudDock, createHudDock } from './ui/hudDock';
import { type ToastStack, createToastStack } from './ui/toasts';
import { type StatecraftScreen, createStatecraftScreen } from './ui/statecraftScreen';
import { type ReligionScreen, createReligionScreen } from './ui/religionScreen';
import { type TechTree, createTechTree } from './ui/techTree';
import { type MapPlates, type TilePriceTags, createMapPlates, createTilePriceTags } from './ui/tilePriceTags';
import { faithPlates } from './ui/faithPlates';
import { type CivYieldStrip, createCivYieldStrip } from './ui/topBar';
import { type OfferOption, createOfferCard } from './ui/offerCard';
import { type TriumphModal, createTriumphModal } from './ui/triumphModal';
import { type Rect as TutorialRect, createTutorial } from './ui/tutorial';
import { type ConfirmCard, createConfirmCard } from './ui/confirmCard';
import { triumphDef } from './sim/triumphData';
import { AXIS_MARK, beliefOfferEyebrow } from './ui/religionScreen';
import { type BeliefId, beliefDef } from './sim/religionData';
import { personOf } from './sim/greatPeople';
import {
  type Family,
  type GreatPersonTier,
  greatPersonDef,
} from './sim/greatPeopleData';
import type { CardLine } from './sim/statecraftData';
import { CARD_LINE_NAME, cardLineMarkUrl, lineOf, slotMarkUrl } from './ui/cardLine';
import { type OfferKind, SLOT_WORDS, describeCard, explainOfferSize } from './sim/statecraft';
import {
  type GovernmentId,
  SLOT_TYPES,
  doctrineDef,
  governmentDef,
  orderDef,
} from './sim/statecraftData';
import { createTurnSplash } from './ui/turnSplash';
import { type Compendium, createCompendium } from './ui/compendium';
import { setKeywordOpener } from './ui/keywords';
import { createStaleDeployNotice } from './ui/staleDeploy';
import { type TradeScreen, createTradeScreen } from './ui/tradeScreen';
import { type UnitPanel, createUnitPanel, disbandPrompt } from './ui/unitPanel';
import { YIELD_GLYPH } from './ui/figures';
import type { HoverInfo, LensMode, MapView } from './ui/mapView';
import { createInfoCard } from './ui/infoCard';
import { faithHoverCard, faithHoverReading } from './ui/faithHover';
import { cityAt } from './sim/cities';
import type { TurnBlocker } from './ui/turnBlockers';

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

/**
 * The stale-deploy watch, armed **before anything else in this module runs**.
 *
 * A deploy that lands while a tab is open leaves every hashed chunk under
 * `/assets/` replaced, and the first dynamic `import()` the old page reaches for
 * rejects into silence (see `staleDeploy.ts`). Armed here, at the top of the
 * entry module, so it covers the boot as well as the game: a chunk that fails
 * while the landing screen is still up is exactly the case a listener installed
 * inside `beginGame` would miss.
 */
createStaleDeployNotice();

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
/** The title page's two dressed elements — the device and the epigraph. */
const frontispieceEls = {
  device: document.getElementById('landing-device'),
  epigraph: document.getElementById('landing-epigraph'),
};

/**
 * The corner star, handed to the stylesheet.
 *
 * Once, at boot, and before anything is painted. Every panel-class surface in
 * the game wears the star through a pseudo-element (art pass A1), and a
 * pseudo-element cannot be reached by script — so the picture goes onto the
 * root as a custom property and the stylesheet masks with it. See
 * `installFlourishMarks`.
 */
installFlourishMarks(document.documentElement);

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
/* The Triumph sheet's shell — `ui/triumphModal.ts` builds its contents on each
   show. Milder than the offer above it: news with one affirmative button. */
const triumphOverlayEl = requireElement<HTMLElement>('triumph-overlay');
/* The bead sheet's shell — `ui/beadModal.ts` builds its contents on each show.
   The Triumph sheet's twin one system over, and it wears that sheet's own
   overlay class for exactly that reason. */
const beadOverlayEl = requireElement<HTMLElement>('bead-overlay');
/* The confirm card's shell — `ui/confirmCard.ts` builds its contents on each
   ask. The smallest of the three modal shapes: one question, two answers. */
const confirmOverlayEl = requireElement<HTMLElement>('confirm-overlay');
/* The way back to an offer put away behind View map. Pinned in the End Turn
   corner because that button stops on the very same offer — see `index.html`. */
const offerReturnEl = requireElement<HTMLButtonElement>('offer-return');

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
/* The HUD dock, directly under the research card: Statecraft and Religion. Its
   two buttons are runtime `data:` URIs, so `createHudDock` builds them into
   this container rather than index.html holding them static — see
   `src/ui/hudDock.ts`. Both are bare triggers now; the Faith popover they used
   to sit beside became the Religion screen (ledger Entry XXVIII). */
const hudDockEl = requireElement<HTMLElement>('hud-dock');
/* The Abacus: the bar button that opens it, and the screen it opens. Its canvas
   is not here — `abacusScreen.ts` builds one into the stage on the first open. */
const abacusButton = requireElement<HTMLButtonElement>('abacus-button');
/* Statecraft's overlay and the body its contents are built into on each open.
   There is no bar button: the screen is opened from the culture chip's card, by
   the End Turn blocker, and by `C`. */
const statecraftOverlayEl = requireElement<HTMLElement>('statecraft-overlay');
const statecraftBodyEl = requireElement<HTMLElement>('statecraft-body');
/* Religion's overlay and body — Statecraft's sibling sheet, opened from the
   dock's second button, by the End Turn blocker, and by `H`. */
const religionOverlayEl = requireElement<HTMLElement>('religion-overlay');
const religionBodyEl = requireElement<HTMLElement>('religion-body');
/* Trade's overlay and body — Religion's sibling sheet, opened from the routes
   chip in the bar, from a routed caravan's sheet, and from a city panel's
   Routes row. */
const tradeOverlayEl = requireElement<HTMLElement>('trade-overlay');
const tradeBodyEl = requireElement<HTMLElement>('trade-body');
/* The Compendium: the bar's book button, the overlay, and the body the same
   module the standalone `compendium.html` page mounts is rendered into. It is
   the one screen with no game behind it — see `src/ui/compendium.ts` — so it is
   built at boot beside the rest and reads nothing about a seat. */
const compendiumButton = requireElement<HTMLButtonElement>('compendium-button');
const compendiumOverlayEl = requireElement<HTMLElement>('compendium-overlay');
const compendiumBodyEl = requireElement<HTMLElement>('compendium-body');
const abacusOverlayEl = requireElement<HTMLElement>('abacus-overlay');
const abacusStageEl = requireElement<HTMLElement>('abacus-stage');
const abacusRegisterEl = requireElement<HTMLElement>('abacus-register');
const beadsOverlayEl = requireElement<HTMLElement>('beads-overlay');
const beadsBodyEl = requireElement<HTMLElement>('beads-body');
const victoryOverlayEl = requireElement<HTMLElement>('victory-overlay');
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
const menuTutorialButton = requireElement<HTMLButtonElement>('menu-tutorial');
const tutorialToggle = requireElement<HTMLInputElement>('tutorial-toggle');
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
const infoWater = requireElement<HTMLElement>('info-water');
const infoFounding = requireElement<HTMLElement>('info-founding');
const infoYields = requireElement<HTMLElement>('info-yields');
const infoResource = requireElement<HTMLElement>('info-resource');
const infoImprovement = requireElement<HTMLElement>('info-improvement');
const infoOccupant = requireElement<HTMLElement>('info-occupant');
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
 * The three shapes a new game can be seated in, and why the bot one is the
 * default.
 *
 * Single-player-against-an-AI is the product (CLAUDE.md, Direction), so from the
 * day a bot exists it is what the landing screen opens on. The other two stay
 * because both are still worth having: **Solo** is the quiet world a pacing
 * measurement or a look at the map wants, and **Sandbox** is the hot-seat dev
 * harness — one tester driving both chairs from the seat chips, and the shape
 * remote multiplayer will arrive in.
 *
 * A bot seat needs **no schema change and no new field**: `normalizeConfig`
 * already defaults `PlayerSpec.isHuman` to false, so "a seat nobody is sitting
 * in" is the roster entry with `isHuman` left off, and `driveBots`
 * (`src/ai/driver.ts`) is the only thing in the program that asks.
 */
type SeatMode = 'bot' | 'solo' | 'sandbox';

const SEAT_MODES: { value: SeatMode; label: string; seats: number }[] = [
  { value: 'bot', label: 'You vs one bot', seats: 2 },
  { value: 'solo', label: 'Solo (1 player)', seats: 1 },
  { value: 'sandbox', label: `Sandbox (${PLAYERS.length} players, one tester)`, seats: PLAYERS.length },
];

const DEFAULT_SEAT_MODE: SeatMode = 'bot';

for (const mode of SEAT_MODES) {
  if (mode.seats < RULES.game.minPlayers || mode.seats > PLAYERS.length) continue;
  const option = document.createElement('option');
  option.value = mode.value;
  option.textContent = mode.label;
  seatsSelect.append(option);
}
seatsSelect.value = DEFAULT_SEAT_MODE;

/**
 * The roster one mode seats.
 *
 * Seat 0 is always Crimson and always the person at the keyboard, so a bot game
 * is the two-seat game with the second chair *driven* rather than a different
 * game — which is what keeps the seat strip, the status line and every save
 * exactly as they were.
 */
function rosterFor(mode: string): PlayerSpec[] {
  if (mode === 'solo') return PLAYERS.slice(0, 1);
  if (mode === 'sandbox') return PLAYERS.slice(0, PLAYERS.length);
  return [PLAYERS[0]!, { ...PLAYERS[1]!, isHuman: false }];
}

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
 * The guide (`src/ui/tutorial.ts`), built at module level for one reason: the
 * landing screen's checkbox is wired here, above `boot`, and a player who
 * unchecks it before ever pressing Start must be answered by the same object the
 * first game will ask.
 *
 * It shares the save shelf's storage handle rather than reaching for
 * `localStorage` itself — one probe, one fallback, and a private window loses
 * the tutorial's memory exactly as it loses a save's.
 */
/**
 * Where a named piece is on screen, once there is a board to ask.
 *
 * The guide is built at module level (above), and the renderer and the game are
 * `boot`'s. This is the one thing it needs from them — the settler step rings the
 * settler itself (the user, 2026-08-30) — so it is a holder `boot` fills, in the
 * shape every other renderer-specific feature on `MapView` already has: absent
 * under the frozen 2D pipelines, and the step falls back to its element anchor.
 */
let tutorialBoardAnchor: ((what: string) => TutorialRect | null) | null = null;

const tutorial = createTutorial({
  storage: saveStorage,
  root: document.body,
  boardAnchor: (what) => tutorialBoardAnchor?.(what) ?? null,
});

// The checkbox reads the remembered answer on first paint, and writes it back
// on every change. `enabled` is the whole of the state — there is no second flag
// for "has been shown", which is what `TutorialProgress` is.
tutorialToggle.checked = tutorial.enabled();
tutorialToggle.addEventListener('change', () => tutorial.setEnabled(tutorialToggle.checked));

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

/**
 * The Bead Race's table, and the sheet that says the race is over. Holders for
 * the Abacus's reason exactly: both are built inside `boot`, and everything
 * above it that has to close a screen reaches them through here.
 */
let beads: BeadsScreen | null = null;
let victory: VictoryModal | null = null;
/* Declared before `controls` for `techTree`'s reason exactly: the controls reach
   it (the End Turn blocker steers here), and it reaches the controls. */
let statecraft: StatecraftScreen | null = null;
let religion: ReligionScreen | null = null;
/* Trade's screen, built in `boot` for `religion`'s reason: it asks whose seat
   this is, and `closePopovers` is declared before there is one. */
let trade: TradeScreen | null = null;

/**
 * The top bar's meter chips, once `boot` has built them. A holder for the same
 * reason the star chart is one: the cards belong to a strip that needs a game to
 * read, and `closePopovers` is declared before there is one.
 */
let meterCards: CivYieldStrip | null = null;

/**
 * The HUD dock, once `boot` has built it. A holder for `meterCards`' own
 * reason: the Faith card it owns needs a game to read, and `closePopovers` is
 * declared before there is one.
 */
let hudDock: HudDock | null = null;

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
/**
 * The Triumph sheet, built in `boot`. A holder for `meterCards`' reason, plus
 * one of its own: `isInputBlocked` and `showLanding` are both declared above
 * `boot` and both have to be able to ask whether a sheet is up.
 */
let triumphSheet: TriumphModal | null = null;

/**
 * The bead sheet, and the Bead Race's news waiting for a clear screen.
 *
 * **One queue for two kinds of moment.** A resolution can hand over a Triumph,
 * a bead and an age opening at once, and three surfaces landing on one another
 * say less than any one of them. So the sheets are raised one at a time, in the
 * order the resolution reported them — the bead you took, then the table it
 * went onto — and each raise waits for the screen to clear (`pumpBeadNews`,
 * which is called by every seam that clears one).
 *
 * Held at module scope beside the Triumph sheet for its reasons: `showLanding`
 * and `isInputBlocked` are both written above `boot` and both have to reach it.
 */
let beadSheet: BeadModal | null = null;
let pendingBeadNews: BeadNews[] = [];
let pendingBeadAge: BeadAge | null = null;

/** Drops news about a game nobody is playing any more. */
function clearBeadNews(): void {
  pendingBeadNews = [];
  pendingBeadAge = null;
  beadSheet?.clear();
}

/**
 * The confirm card: "are you sure?", for the one verb that cannot be undone.
 *
 * Built here at module scope rather than in `boot`, beside the compendium and
 * the help sheet and for their reason: it is a property of the *page*, not of a
 * game — it reads nothing about a seat, a turn or a board, it only asks a
 * question somebody else wrote. That also puts it above `closePopovers` and
 * `isInputBlocked`, both of which have to be able to take it down and to ask
 * whether it is up.
 */
const confirmCard: ConfirmCard = createConfirmCard(confirmOverlayEl);

/**
 * The live game's state, once `boot` has one.
 *
 * The Compendium's one optional reader, and the only reason it exists: nothing
 * on that screen is a fact about a seat or a turn (which is what lets the same
 * module mount on a page with no game at all), except a unit's **roster price**,
 * which the Compendium asks of `explainUnitCost`'s first line when there is a
 * game to ask. `game` is local to `boot`; this is the holder that reaches it,
 * for `meterCards`' reason exactly.
 */
let liveState: (() => GameState) | null = null;

/**
 * The Compendium: every table in the game, read back off the data.
 *
 * Built here at module scope beside the help sheet rather than in `boot`, and
 * for the same reason that one is: it is a property of the *page*. It reads the
 * same with no game behind it — which is the whole claim `compendium.html`
 * rests on — and it must be reachable from the controls card, which is up before
 * anything has been started.
 */
const compendium: Compendium = createCompendium({
  overlay: compendiumOverlayEl,
  body: compendiumBodyEl,
  closeButton: requireElement('compendium-close'),
  trigger: compendiumButton,
  getState: () => liveState?.() ?? null,
  onOpen: () => {
    menu.close();
    help.close();
    lens.close();
    notifications?.close();
    meterCards?.close();
    techTree?.close();
    abacus?.close();
    beads?.close();
    statecraft?.close();
    religion?.close();
    trade?.close();
  },
});
/* **Where every keyword in the interface goes** (`src/ui/keywords.ts`). Handed
   over once rather than threaded through the dozen builders that draw a
   descriptor: a bold name in a clause is not a screen's business, and the
   registry is what lets the star chart's card, the Compendium's own clauses and
   a rite's line all open the same book. The overlay's `open` already shuts
   whatever else was up, so a keyword clicked over the star chart closes it. */
setKeywordOpener((entryId) => compendium.open(entryId));
compendiumButton.addEventListener('click', () => compendium.toggle());
/* The controls card's one link out. The card closes under it, because two
   surfaces at one z-index is one of them being invisible. */
requireElement('help-compendium').addEventListener('click', () => {
  help.close();
  compendium.open();
});

function closePopovers(): boolean {
  const wasOpen =
    menu.isOpen ||
    help.isOpen ||
    lens.isOpen ||
    (notifications?.isOpen ?? false) ||
    (meterCards?.isOpen ?? false) ||
    (techTree?.isOpen ?? false) ||
    (abacus?.isOpen ?? false) ||
    (beads?.isOpen ?? false) ||
    (statecraft?.isOpen ?? false) ||
    (religion?.isOpen ?? false) ||
    (trade?.isOpen ?? false) ||
    compendium.isOpen ||
    savesPanel.isOpen ||
    // Escape never actually arrives here while the card is up — it answers its
    // own key in a capturing listener, "no" — but this is also what a new game
    // and the landing screen call, and a question about a piece from the last
    // game must not survive into the next one.
    confirmCard.isOpen;
  menu.close();
  help.close();
  lens.close();
  notifications?.close();
  meterCards?.close();
  techTree?.close();
  abacus?.close();
  beads?.close();
  statecraft?.close();
  religion?.close();
  trade?.close();
  compendium.close();
  savesPanel.close();
  confirmCard.close();
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
  // Nor is the Triumph sheet, and it does not even count down: a sheet left up
  // would sit over the landing waiting to be proceeded past into a game that is
  // no longer running.
  triumphSheet?.clear();
  // Nor the bead sheet, and nor the news queued behind it: a bead taken in a
  // game the player has walked away from is not a sheet to proceed past into a
  // game that is no longer running.
  clearBeadNews();
  // And the victory sheet, for the same reason.
  victory?.clear();
  setRestartConfirm(false);
  // The Abacus holds a WebGL context of its own, and the game it was counting
  // is over. `closePopovers` above has already shut it; this gives the context
  // and its five thousand triangles back, and the next game builds a fresh
  // stage on the first press of `A`.
  abacus?.dispose();
  statecraft?.dispose();
  religion?.dispose();
  trade?.dispose();
  // The Compendium is deliberately **not** disposed here. It is a property of
  // the page rather than of a game — built at module scope beside the help
  // sheet, reachable from the controls card before anything has been started,
  // and holding nothing a restart could make stale. `closePopovers` above has
  // already shut it, which is the whole of what the landing needs. Disposing it
  // would unbind its Escape for the rest of the session.
  // `hidden` is the whole of the screen state — one flag, read by `inputBlocked`
  // as well as by the stylesheet, so "is the landing up?" has one answer.
  landingEl.hidden = false;
  landingErrorEl.hidden = true;
  // The title page, dressed on every *showing* rather than once at boot: a
  // player who restarts is opening the book again, and the epigraph in the
  // margin is drawn fresh (art pass A2). Nothing here is state — see
  // `frontispiece.ts` on why `Math.random` is allowed on this one screen.
  dressFrontispiece(frontispieceEls);
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
    // Whose chairs are filled and which of them a person is sitting in. See
    // `rosterFor`: seat 0 is always Crimson and always the human.
    players: rosterFor(seatsSelect.value),
    // **The game asks for the wild.** `GameConfig.barbarians` defaults to off so
    // that a fixture, an inspection page or a pacing measurement gets the quiet
    // world it always had (see that field); a real game played by a person is
    // the caller that wants camps in the fog, and this is where it says so.
    barbarians: true,
  };
}

// --- panel text ------------------------------------------------------------

/**
 * One row of the readout, shown only when it has something to say.
 *
 * The card is a `<dl>` grid, so a row is *two* elements — the term and its
 * value — and hiding one without the other leaves either a label pointing at
 * nothing or a figure with no name. Nothing else in the card knows that; this
 * function is where the pair is one thing. The term is found by adjacency
 * rather than by an id of its own, because in a definition list the `<dt>`
 * immediately before a `<dd>` *is* that value's label by definition.
 *
 * Empty is `null`, never `'—'`: a dash is a mark a player has to read in order
 * to learn there was nothing to read, and a card of six of them is a card that
 * says nothing loudly. Every describer in `tileReadout.ts` speaks `null` for
 * this reason.
 */
function setInfoRow(
  value: HTMLElement,
  content: string | Node | readonly Node[] | null,
): void {
  const nodes = content === null || typeof content === 'string' ? [] : [content].flat();
  const empty = content === null || (typeof content !== 'string' && nodes.length === 0);
  const term = value.previousElementSibling;
  value.hidden = empty;
  if (term instanceof HTMLElement) term.hidden = empty;
  if (typeof content === 'string') value.textContent = content;
  else value.replaceChildren(...nodes);
}

/**
 * Every row of the readout *except* the terrain, taken off the card.
 *
 * The two occasions are the ones where the ground has nothing to describe: fog,
 * where the terrain slot carries "Terra Incognita" alone, and no hover at all,
 * where the card is fading out anyway. Terrain is left to the caller because it
 * is the only row those two disagree about.
 */
function clearInfoRows(): void {
  for (const row of [
    infoFeature,
    infoWater,
    infoFounding,
    infoYields,
    infoResource,
    infoImprovement,
    infoOccupant,
    infoUnit,
  ]) {
    setInfoRow(row, null);
  }
}

/**
 * Writes the hovered tile's yields into the panel's yield row: the total, and —
 * when there is a calculation behind it — the itemized lines it is the fold of.
 *
 * Both come from `src/ui/tileReadout.ts`, which is where the whole vocabulary of
 * the hover card lives now that the mapgen inspection page speaks it too — and
 * both come from the *same* list there, so the column of lines a player reads
 * down adds up to the figure above it by construction rather than by agreement
 * between two evaluators (CLAUDE.md rule 5, at the surface it was written for).
 *
 * The two silences are the page's own business and they are different silences.
 * A hex with no modifier on it (`itemisedYieldLines` hands back nothing) keeps
 * its figure and drops the account: an itemization of one entry restates the
 * number above it and reads as arithmetic where none happened. A hex that pays
 * *nothing at all* drops the row entirely — "Yields: —" is the em dash this
 * card no longer draws anywhere.
 */
function showTileYields(state: GameState, playerId: number, tile: Tile): void {
  // The hex's contributions once for both halves of the row (2026-08-29). The
  // headline is the fold of the itemization, so the two were always the same
  // list — asked twice, each time building the empire's yield context afresh, on
  // every mouse move over the board. One list, folded for the figures and walked
  // for the lines, is the same arithmetic at half the price.
  const contributions = tileYieldContributions(state, playerId, tile);
  const shown: Node[] = tileYieldNodes(state, playerId, tile, contributions);
  const rows = tileYieldLineNodes(state, playerId, tile, contributions);
  if (rows.length > 0) {
    const lines = document.createElement('ul');
    lines.className = 'yield-lines';
    lines.append(...rows);
    shown.push(lines);
  }
  setInfoRow(infoYields, shown);
}

/**
 * The resource row: what is in the ground, and — under it — what the empire
 * still has to do about it.
 *
 * Two nodes in one cell rather than a row of its own, because the requirement is
 * not a separate fact: "requires Mine (Mining)" is a clause *about* the gems on
 * this hex and reads as furniture the moment it is separated from them. Both
 * halves come from `tileReadout.ts` — the mark and the name, and the want with
 * its ink already decided — so this is the placement and nothing else, which is
 * the split the whole module was written for.
 *
 * A seam with nothing left to want (the mine already stands, or nothing improves
 * it) has one node and looks exactly as it always did; a hex with no resource at
 * all has none, and the row disappears with the term beside it.
 */
function showTileResource(state: GameState, playerId: number, tile: Tile): void {
  const shown: Node[] = [];
  const resource = resourceRowNode(state, playerId, tile);
  if (resource) shown.push(resource);
  const wants = resourceRequirementNode(state, playerId, tile);
  if (wants) shown.push(wants);
  setInfoRow(infoResource, shown);
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
 * how deep it is rather than listing itself into a scrollbar. `null` when there
 * is nobody to describe, which is this card's word for "draw no row".
 */
function describeUnitsOn(state: GameState, playerId: number, tile: Tile): string | null {
  if (!isVisibleTo(state, playerId, tile.col, tile.row)) return null;
  const units = unitsOnTile(state, tile.col, tile.row);
  const first = units[0];
  if (!first) return null;
  const def = unitDef(first.type);
  const owner = state.players[first.ownerId];
  const more = units.length > 1 ? ` +${units.length - 1}` : '';
  return `${def.name} · ${first.hp}/${unitMaxHp(first)} hp · ${owner?.name ?? '—'}${more}`;
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
   * The siege beat this blow is, one sentence, present only when the targeted
   * hex holds a foreign city (`CombatForecast.cityPhase` — walls, then the
   * garrison, then a melee capture; user ruling, 2026-08-28). `cityPhaseLine`
   * (`controls.ts`) is the sentence itself — a pure formatter, tested on a
   * fixture rather than through this DOM card — so this file only prints
   * whatever it returns and never switches on the phase a second time.
   */
  const phaseLine = cityPhaseLine(preview.cityPhase);
  if (phaseLine !== null) {
    const phase = document.createElement('p');
    phase.className = 'combat-phase';
    phase.textContent = phaseLine;
    combatForecastEl.append(phase);
  }

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

  // The two one-sided blows, and they are **not** the same news. A civilian
  // changes hands; a laden caravan is destroyed where it stands and its cargo
  // carried to the attacker's nearest town. Both return before the strength
  // columns for the same reason — nobody fights, so there are no strengths worth
  // reading — and the wording is the only thing that tells a player which of the
  // two the piece in front of them is. `plundersUnit` is asked first because the
  // simulation decides it first: a caravan carrying a route is excluded from
  // `capturesUnit`, and an *unladen* trader is an ordinary civilian and is taken
  // like one (`planCombat`).
  if (preview.plundersUnit) {
    const note = document.createElement('p');
    note.className = 'combat-note';
    note.textContent = 'Plundered — the caravan is lost and its cargo taken';
    combatForecastEl.append(note);
    return;
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
  religion: 'A god awaits',
  greatPerson: 'A great person awaits',
};

const PAUSE_LABELS: Record<StatecraftPause, string> = {
  // The soft pause on the button itself (user, 2026-08-30): the guide line was
  // too easy to miss, and a button that says what is waiting is the reminder.
  order: 'You have a new Order',
  government: 'A government awaits your oath',
};

function showEndTurnState(blocker: TurnBlocker | null, pause: StatecraftPause | null): void {
  endTurnLabelEl.textContent = blocker
    ? END_TURN_LABELS[blocker.kind]
    : pause
      ? PAUSE_LABELS[pause]
      : 'End Turn';
  const waiting = blocker !== null || pause !== null;
  endTurnButton.classList.toggle('btn-primary', !waiting);
  endTurnButton.classList.toggle('btn-quiet', waiting);
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
  // The Compendium's one optional reader (see `liveState`): from here on there
  // is a game to price a unit's roster line against. `game` is reassigned by
  // `takeOverGame`, so this is a closure and never a snapshot.
  liveState = () => game.state;
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
    // The strip is the hot-seat harness's own — see `showsSeatStrip` — and is
    // extraneous information in the one-human game the product ships: the
    // current player is not something an ordinary game needs to announce.
    // Hidden rather than left empty, so it also gives the yield strip beside
    // it the room back.
    seatsEl.hidden = !showsSeatStrip(state);
    const localId = controls.localPlayerId();
    seatsEl.replaceChildren();
    if (seatsEl.hidden) return;

    for (const player of realPlayers(state)) {
      const done = hasEndedTurn(state, player.id);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'seat';
      chip.classList.toggle('is-local', player.id === localId);
      chip.classList.toggle('is-done', done);
      chip.style.setProperty('--seat-color', player.color);
      chip.textContent = done ? `${player.name} ✓` : player.name;
      // The seat's charge, ahead of its name. Heraldry is how a seat stops
      // being "the blue one" (art pass, W2), and the chip is the surface where
      // that matters most: a dozen of them sit in one strip at 11px, where the
      // twelve tinctures are the only thing telling them apart and four of them
      // are a shade of the same green. The mark is masked in `currentColor`
      // like every other drawn glyph in this interface, so it inherits the
      // chip's parchment ink and flips with it when the seat is done — which is
      // why the URI is asked for undecorated rather than in the seat's colour.
      const charge = document.createElement('span');
      charge.setAttribute('aria-hidden', 'true');
      charge.className = 'seat-charge';
      charge.style.setProperty(
        '--seat-charge',
        `url("${heraldryMarkDataUri(heraldryFor(player.id, player.charge))}")`,
      );
      chip.prepend(charge);
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
   * The faith lens's hover card. The shared component, in its plain dress plus
   * one modifier — a board card is laid on a diorama rather than on a panel, so
   * it carries its own lift in the stylesheet — and deliberately **not** sticky:
   * there is nothing in it to click, and a card that could take the pointer
   * would be a card standing between the player and the hex underneath it.
   */
  const faithInfo = createInfoCard({ className: 'info-card is-board' });

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
     * not its yields, not what is standing on it. Picking still works normally
     * (fog is a mask, not a hole in the board), so a player may hover, click and
     * order a march into it; the card simply refuses to describe ground nobody
     * has been to. The phrase goes in the terrain slot and every other row is
     * *dropped* rather than dashed, which is the same rule the rest of the card
     * now keeps: unexplored ground has one thing to say about itself and says
     * exactly that.
     */
    if (hover && !isExploredBy(game.state, controls.localPlayerId(), hover.tile.col, hover.tile.row)) {
      setInfoRow(infoTerrain, 'Terra Incognita');
      clearInfoRows();
      showCombatForecast(controls.combatForecast());
      contextEl.classList.add('is-shown');
      // The one early return, so the faith card is taken down here too — a card
      // left standing over unexplored ground is the fog leaking through the
      // surface written to respect it.
      updateFaithCard(null, true);
      return;
    }
    if (hover) {
      const seat = controls.localPlayerId();
      const described = describeTile(hover.tile);
      setInfoRow(infoTerrain, described.terrain + (described.hills ? ' (hills)' : ''));
      setInfoRow(infoFeature, described.feature);
      // What water the hex touches, and it is deliberately its own row rather
      // than a clause on the terrain: "Grassland (hills)" is what the ground
      // *is*, and coast and fresh water are facts about what is next to it.
      setInfoRow(infoWater, describeWater(game.state, hover.tile));
      // The settler lens's row, and the lens is the *placement* half of the
      // condition — asked of `boardLens` rather than of the menu, for the reason
      // the faith card asks it that way: picking a settler up raises this lens
      // without the menu, and that is the exact moment the row is for (the same
      // condition `siteRadiusCells` uses). The other half — may a city even
      // stand here — is `foundingCostRow`'s, because that one is a rule.
      setInfoRow(
        infoFounding,
        controls.boardLens() === 'settler'
          ? foundingCostRow(game.state, seat, hover.tile)
          : null,
      );
      setInfoRow(infoUnit, describeUnitsOn(game.state, seat, hover.tile));
      showTileYields(game.state, seat, hover.tile);
      showTileResource(game.state, seat, hover.tile);
      setInfoRow(infoImprovement, describeImprovement(hover.tile));
      setInfoRow(infoOccupant, describeOccupant(game.state, seat, hover.tile));
    } else {
      setInfoRow(infoTerrain, null);
      clearInfoRows();
    }

    // Asked after the readout, because it is a question about the selection and
    // the pointer together rather than about the ground.
    const forecast = controls.combatForecast();
    showCombatForecast(forecast);
    // The guide's note about reading the odds, raised the first time a forecast
    // is actually on screen — not the first time a piece is selected, which is
    // a lesson about a card the player cannot see yet.
    if (forecast !== null) tutorial.note({ kind: 'event', event: 'combatForecast' });

    contextEl.classList.toggle('is-shown', hover !== null || !contextNoticeEl.hidden);

    // And the faith lens's own card, which is about the *town* under the pointer
    // rather than the ground. Last, and additive: the readout above keeps every
    // row it had. See `updateFaithCard`.
    updateFaithCard(hover, true);
  }

  /**
   * The faith lens's city card: the pressure ledger, laid beside the hex.
   *
   * The shared hover card (`infoCard`, non-sticky) raised against a bare
   * rectangle, because a hex has no DOM to hover — see `InfoCard.showAt`. It is
   * **anchored to the hex** and the tile readout is pinned to the corner, which
   * is the whole of why the two do not fight: they stack rather than replace,
   * and terrain, yields and what is standing there stay worth reading with the
   * lens up (a proclamation is planted on ground).
   *
   * Three conditions, all of them cheap, and the order is the cheap one first:
   * the lens on the *board* (`boardLens`, never `lens()` — a prophet raises it
   * without the menu), a town under the pointer, and a reading the seat is
   * allowed to have (`faithHoverReading` returns `null` for ground nobody has
   * walked).
   *
   * `rebuild` is the difference between the two callers. Hover and every state
   * change re-derive the card, because a pressure ledger changes with a road, a
   * site, a caravan and a conversion; the renderer's frame beat only *replaces*
   * it, so a camera pan repositions a card it has already composed rather than
   * folding forty towns' pressure sixty times a second.
   */
  let faithCard: { cityId: number; node: Node } | null = null;

  function updateFaithCard(hover: HoverInfo | null, rebuild: boolean): void {
    const city =
      hover === null || controls.boardLens() !== 'faith'
        ? undefined
        : cityAt(game.state, hover.tile.col, hover.tile.row);
    if (city === undefined) {
      faithCard = null;
      faithInfo.hide();
      return;
    }
    if (rebuild || faithCard === null || faithCard.cityId !== city.id) {
      const reading = faithHoverReading(game.state, city, controls.localPlayerId());
      if (reading === null) {
        faithCard = null;
        faithInfo.hide();
        return;
      }
      faithCard = { cityId: city.id, node: faithHoverCard(reading) };
    }
    // Where the hex landed on screen. `projectCell` is the 3D renderer's alone
    // (the frozen 2D pipelines simply have no card here, exactly as they have no
    // city banners), and a hex off the edge takes the card down rather than
    // pinning it to a viewport corner pointing at nothing.
    const at = renderer.projectCell?.(city.col, city.row) ?? null;
    if (at === null || !at.onScreen) {
      faithInfo.hide();
      return;
    }
    const node = faithCard.node;
    faithInfo.showAt({ left: at.x, top: at.y, right: at.x, bottom: at.y }, () => node);
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
  /**
   * "There is somebody else out there" — the one tutorial note with no seam of
   * its own.
   *
   * Every other trigger is a moment the interface already has (an overlay
   * opening, a report the reducer handed back). Seeing a foreign piece for the
   * first time is a *standing fact about the board*, so it is swept — and the
   * sweep is gated on the note still being wanted, which is what keeps it from
   * being a walk of every unit on every accepted command for the rest of the
   * game. Once the note has been read the guard is false and this costs a
   * boolean.
   */
  function noteEnemySighting(): void {
    if (!tutorial.wantsTip('enemy')) return;
    const seat = controls.localPlayerId();
    for (const unit of game.state.units) {
      if (unit.ownerId === seat) continue;
      if (!isVisibleTo(game.state, seat, unit.col, unit.row)) continue;
      tutorial.note({ kind: 'event', event: 'enemySeen' });
      return;
    }
  }

  function updatePanel(_selected: Unit | null, hover: HoverInfo | null): void {
    updateStatus();
    renderSeats();
    updateLensMenu();
    // Cities change on almost everything — founding, growth, production, a seat
    // change — so every view of them is refreshed wherever the main panel is,
    // the empire's per-turn totals in the top bar included.
    civYields.render();
    // The dock's badge and its open Faith card change on the same facts the
    // strip above just read, so it refreshes in the same breath.
    hudDock?.render();
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
    // The faith lens's plates, on the same beat and for the same reason: they
    // are about the towns and the tide this pass has just re-read, and they draw
    // nothing at all unless the faith lens is the one on the board. Selection,
    // the lens menu and every accepted command all land here, which is the whole
    // set of things that can raise, lower or change them.
    faithMarks.refresh();
    // And the Trade screen, for the price tags' reason: it is about the
    // routes and the towns this pass has just re-read. It draws nothing at all
    // unless it is open, so this costs a boolean when it is not.
    trade?.refresh();
    cityPanel.render();
    unitPanel.render();
    // Whether the turn may end is derived from the same state as everything
    // else on this list — a unit that just moved, a queue that just filled, a
    // technology just chosen — so it is recomputed in the same one place.
    showEndTurnState(controls.endTurnBlocker(), statecraftPause(game.state, controls.localPlayerId()));
    // The guide's two halves of this beat. The selection is a *signal* — the
    // opening sequence's second step is "select your settler", and the caravan's
    // note is raised by picking one up — and it is read here rather than pushed
    // from `controls` because this is the one place that runs after every kind
    // of change to what is selected. The reposition is Entry XLVII's rule
    // applied to a card that hangs off a panel: the unit sheet and the city
    // screen are rebuilt on the commit path, so a highlight anchored to one has
    // to be re-measured on the same beat or it points at where the panel was.
    tutorial.note({ kind: 'select', unit: controls.selectedUnit()?.type ?? null });
    tutorial.refresh();

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
  const offerCard = createOfferCard(offerOverlayEl, {
    /**
     * The chip that leads back, raised and lowered by the card's own phase.
     *
     * One callback rather than a poll, and read off `'hidden'` rather than off
     * "is the overlay up": an offer that has been *taken* reports `'none'` here
     * and takes the chip down with it, which is the case a hand-rolled
     * `!isOpen` would have got exactly backwards.
     */
    onPhase: (phase) => {
      offerReturnEl.hidden = phase !== 'hidden';
      // An offer is the one genuinely blocking surface, so bead news that
      // arrived under it has been waiting. Every phase change is a chance for
      // the screen to have cleared; `pumpBeadNews` answers that itself.
      pumpBeadNews();
    },
  });
  offerReturnEl.addEventListener('click', () => offerCard.reopen());

  /**
   * The Triumph sheet. Declared here for the offer card's reason exactly — the
   * controls report into it — and held in the module-level `triumphSheet` so
   * that `isInputBlocked` and `showLanding`, both written before any game
   * exists, can find it.
   */
  triumphSheet = createTriumphModal(triumphOverlayEl, {
    // A bead earned in the same resolution is standing behind this sheet. See
    // `pumpBeadNews`, which is where the whole of that ordering lives.
    onClosed: () => pumpBeadNews(),
  });

  /**
   * The bead sheet — the Triumph sheet's twin, over the Bead Race's own news
   * (`beadModal.ts`). Declared here for that sheet's reason exactly.
   */
  beadSheet = createBeadModal(beadOverlayEl, {
    // The next bead, or the table the age just turned face up.
    onClosed: () => pumpBeadNews(),
  });

  /**
   * The victory sheet — the Triumph sheet's sibling, raised once when the Bead
   * Race is decided (`victoryModal.ts`). Held in the module-level `victory` for
   * the same reason: `showLanding` has to take it down.
   */
  victory = createVictoryModal(victoryOverlayEl);

  /**
   * The header line for an offer dealt wider than the table deals: the fold's
   * own lines, signed.
   *
   * `explainOfferSize` (`src/sim/statecraft.ts`) is the one evaluator all four
   * drafts ask how many cards to deal, and this prints everything in it past the
   * base — "+1 · Wonder · The Oracle", "−1 · the table's limit of 5". The
   * wording is the simulation's label and the sign is the interface's, which is
   * the same bargain every breakdown in this HUD strikes: no sentence is
   * invented here that the card does not already say.
   *
   * Re-derived at the moment the card is shown rather than stored on the offer,
   * and that is not a contradiction of "an offer is drawn once": the *cards* are
   * the deal and they were drawn when it opened. This is an explanation of a
   * number that has already been spent, and re-asking it can only ever produce
   * the sentence that dealt them.
   */
  function wideningLines(kind: OfferKind): string[] {
    const lines = explainOfferSize(game.state, controls.localPlayerId(), kind);
    return lines
      .slice(1)
      .map((line) => `${line.delta > 0 ? '+' : ''}${line.delta} · ${line.source}`);
  }

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
    // The guide's note about ruins, raised where the card is — the trigger is
    // "this screen opened", which is a moment the interface already has, and
    // never a poll (`tutorial.ts`).
    tutorial.note({ kind: 'event', event: 'discoveryOffer' });

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
        widening: wideningLines('discovery'),
      },
      (index) => {
        // Checked, like every pick (the offer-loop bug of 2026-08-30).
        const result = dispatch(game, { type: 'chooseDiscovery', playerId: seat, optionIndex: index });
        if (!result.ok) controls.guide(`☞ ${result.error}`);
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
    tutorial.note({ kind: 'event', event: 'statecraftOffer' });

    if (sc.pendingOrder !== undefined) {
      const offer = sc.pendingOrder;
      const options: OfferOption[] = offer.options.map((id) => ({
        title: orderDef(id).name,
        payoff: `${SLOT_WORDS[orderDef(id).slot]} order`,
        note: describeCard(id).map((clause) => clause.text).join(' · '),
        flavor: orderDef(id).flavor,
        ...cardFace(orderDef(id)),
      }));
      const upgrade = offer.upgrade;
      if (upgrade !== undefined) {
        const level = sc.orders.find((owned) => owned.id === upgrade)?.level ?? 1;
        options.push({
          title: `${orderDef(upgrade).name} · ${level} → ${level + 1}`,
          payoff: `deepen · ${SLOT_WORDS[orderDef(upgrade).slot]}`,
          // Before and after, from one function at two levels: the whole of the
          // draft's question, and the reason this card is laid out on its own
          // (`orderOfferLayout`) rather than as the fourth of a row.
          faces: {
            before: describeCard(upgrade, level).map((c) => c.text).join(' · '),
            after: describeCard(upgrade, level + 1).map((c) => c.text).join(' · '),
          },
          emphasis: 'deepen',
          flavor: orderDef(upgrade).flavor,
          ...cardFace(orderDef(upgrade)),
        });
      }
      offerCard.show(
        {
          eyebrow: `tier ${sc.drafts} · the culture meter is full`,
          title: 'Write it into law',
          note: 'A new Order joins your collection. Slotting it is a separate act — and a sealed one.',
          options,
          widening: wideningLines('order'),
        },
        (index) => {
          // The result is *checked* (the deployed bug of 2026-08-30): a refused
          // pick used to re-deal the same card forever with no word said — the
          // one reachable case being a seat that Shift-ended its turn with the
          // draft still up, which the reducer refuses until the next turn.
          const result = dispatch(game, { type: 'chooseOrder', playerId: seat, optionIndex: index });
          if (!result.ok) controls.guide(`☞ ${result.error}`);
          controls.refresh();
          statecraft?.refresh();
          // A pick can uncover the next thing owed — a banked charter dealt on
          // the same tier — so the chain is offered rather than left waiting
          // behind a blocker the player has to press twice. Never for a seat
          // whose turn is over: the blocker re-deals the card next turn, and
          // re-showing it to a seat that cannot answer is the loop the bug was.
          if (!hasEndedTurn(game.state, seat)) showStatecraftOffer();
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
            // A government joins no archetype thread, so its emblem is the
            // office it opens the most slots for. See `governmentEmblem`.
            ...governmentEmblem(id),
          })),
        },
        (index) => {
          // The result is *checked* (the deployed bug of 2026-08-30): a refused
          // pick used to re-deal the same card forever with no word said — the
          // one reachable case being a seat that Shift-ended its turn with the
          // draft still up, which the reducer refuses until the next turn.
          const result = dispatch(game, { type: 'adoptGovernment', playerId: seat, choiceIndex: index });
          if (!result.ok) controls.guide(`☞ ${result.error}`);
          controls.refresh();
          statecraft?.refresh();
          if (!hasEndedTurn(game.state, seat)) showStatecraftOffer();
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
          widening: wideningLines('doctrine'),
          options: offer.options.map((id) => ({
            title: doctrineDef(id).name,
            payoff: 'permanent doctrine',
            note: describeCard(id).map((clause) => clause.text).join(' · '),
            flavor: doctrineDef(id).flavor,
            ...cardFace(doctrineDef(id)),
          })),
        },
        (index) => {
          // The result is *checked* (the deployed bug of 2026-08-30): a refused
          // pick used to re-deal the same card forever with no word said — the
          // one reachable case being a seat that Shift-ended its turn with the
          // draft still up, which the reducer refuses until the next turn.
          const result = dispatch(game, { type: 'chooseDoctrine', playerId: seat, optionIndex: index });
          if (!result.ok) controls.guide(`☞ ${result.error}`);
          controls.refresh();
          statecraft?.refresh();
        },
      );
    }
  }

  /**
   * Puts the local seat's belief offer on screen, if it has one.
   *
   * `showStatecraftOffer`'s third sibling, and the same generic card
   * (`offerCard.ts`) in a **votive** dress: three gods, each with its axis in
   * the mono eyebrow, what it does in the note, and its aphorism at the foot.
   * It wears the **heavy** frame the Doctrine and the charter wear, and for
   * exactly their reason — a belief is permanent, unconvertible, and the one
   * thing in this system that cannot be taken back.
   *
   * Every clause is `describeCard`, the same function the Religion screen
   * prints, so a god reads identically on the card that dealt it and in the
   * pantheon afterwards. The emblem is deliberately **absent**: a belief joins
   * no Statecraft line, so lending it one of that deck's seven marks would be
   * saying something untrue, and the axis glyph carries the accent instead
   * (`religionScreen.ts`'s AXIS_MARK — one table, both surfaces).
   */
  function showReligionOffer(): void {
    const seat = controls.localPlayerId();
    const player = playerById(game.state, seat);
    const offer = player?.pantheon.pending;
    if (!offer) return;
    tutorial.note({ kind: 'event', event: 'religionOffer' });

    offerCard.show(
      {
        // **The eyebrow is the bag.** One `chooseBelief` answers three drafts
        // now (`BeliefOffer.pool`), and they are three different decisions
        // wearing one card: a god is your identity, a follower belief is what
        // your followers pay you, an enhancer is how far they spread. The word
        // for each is `beliefOfferEyebrow`'s, which is the screen that houses
        // them — one table, both surfaces, exactly as `AXIS_MARK` is.
        eyebrow: beliefOfferEyebrow(offer.pool),
        // **A third wording, for the one offer dealt in place of something.**
        // `givenBack` is the offer's own answer (`BeliefOffer`), so the card
        // does not have to know which rite opened it — and the line names the
        // god handed over, because that is the only thing distinguishing this
        // hand from a fresh one.
        title:
          offer.givenBack !== undefined
            ? 'Name what your people keep instead'
            : offer.pool === undefined
              ? 'Name what your people keep'
              : `Name what ${foundedReligion(game.state, seat)?.name ?? 'your faith'} teaches`,
        note:
          offer.givenBack !== undefined
            ? `Your people have given up ${beliefDef(offer.givenBack).name}. What they keep instead pays in every city you own, for the rest of the game.`
            : offer.pool === undefined
              ? 'A belief pays in every city you own, for the rest of the game. The augur is spent either way.'
              : 'This belongs to your religion, not to your empire. The prophet’s charge is spent either way.',
        weight: 'heavy',
        widening: wideningLines('belief'),
        options: offer.options.map((id) => {
          const def = beliefDef(id);
          return {
            title: def.name,
            // The axis's **glyph and nothing else**: it is the accent's mark,
            // not a category the player is picking between, and the word for it
            // came off every surface in the 2026-08-26 playtest pass. See
            // `AXIS_MARK`. The eyebrow above already says what all three are.
            payoff: AXIS_MARK[def.axis].glyph,
            note: describeCard(id).map((clause) => clause.text).join(' · '),
            flavor: def.flavor,
            // The accent key, resolved by `style.css`'s axis block — the same
            // `--line-ink` mechanism a Statecraft card's line uses, so a votive
            // card and an Order card are painted by one rule.
            line: def.axis,
          };
        }),
      },
      (index) => {
        // Checked, like every pick (the offer-loop bug of 2026-08-30).
        const result = dispatch(game, { type: 'chooseBelief', playerId: seat, optionIndex: index });
        if (!result.ok) controls.guide(`☞ ${result.error}`);
        // Which shelf the pick lands on is the *offer's* answer, never this
        // card's (`settleBeliefChoice`): an offer that names a pool belongs to
        // the religion, one that names none to the pantheon. So the line is read
        // back off whichever shelf it went to, rather than off the pantheon and
        // silently nothing for two drafts in three.
        const pool = offer.pool;
        const mine = foundedReligion(game.state, seat);
        const taken =
          pool === undefined
            ? playerById(game.state, seat)?.pantheon.beliefs.slice(-1)[0]
            : pool === 'follower'
              ? mine?.follower.slice(-1)[0]
              : // Both pools are lists now (`Religion.enhancer`, schema 29), so
                // "what was just taken" is the last of whichever shelf it landed
                // on — one reading rather than two.
                mine?.enhancer.slice(-1)[0];
        if (taken !== undefined) {
          // The chronicle keeps this one and the toast stack does not: a belief
          // is a permanent fact about the empire, worth a line somebody can
          // scroll back to, and the player has just watched themselves choose it
          // — a toast telling them what they picked a moment ago is noise.
          notificationLog.push(seat, {
            turn: game.state.turn,
            text:
              pool === undefined
                ? `Your people keep ${beliefDef(taken).name}.`
                : `${mine?.name ?? 'Your faith'} teaches ${beliefDef(taken).name}.`,
          });
          notifications?.refresh();
        }
        controls.refresh();
        religion?.refresh();
      },
    );
  }

  /**
   * Asks which god the empire hands back, on the same card its replacement will
   * be chosen on.
   *
   * The one place in this interface where the offer card is a **picker** rather
   * than an offer: nothing was dealt here, the options are the seat's own
   * pantheon, and the pick is not spent — it is an argument to the command that
   * follows. It wears that card anyway, and deliberately, because the two halves
   * of Recasting the Omens are one gesture: what you give up and what you take
   * instead should be read on one surface, in one dress, a beat apart.
   *
   * Every word is the same word `showReligionOffer` prints — `describeCard`'s
   * clauses, the axis glyph, the god's own aphorism, the axis accent — so a
   * belief looks identical on the card that offered it, on the card that gives
   * it back, and on the Religion screen in between. It is **not** heavy-framed:
   * the frame means "this cannot be taken back", and this is a question, not the
   * answer. The heavy card is the one that follows.
   */
  function showGiveBackPicker(held: BeliefId[], onPick: (belief: BeliefId) => void): void {
    offerCard.show(
      {
        eyebrow: 'give back',
        title: 'Which belief do you give back?',
        note: 'The augur casts again. A belief another empire keeps is never offered.',
        options: held.map((id) => {
          const def = beliefDef(id);
          return {
            title: def.name,
            payoff: AXIS_MARK[def.axis].glyph,
            note: describeCard(id).map((clause) => clause.text).join(' · '),
            flavor: def.flavor,
            line: def.axis,
          };
        }),
      },
      (index) => {
        const belief = held[index];
        if (belief !== undefined) onPick(belief);
      },
    );
  }

  /**
   * Puts the local seat's great-person offer on screen, if it has one.
   *
   * `showReligionOffer`'s fourth sibling, and the same generic card
   * (`offerCard.ts`) in a **roster** dress: three names from the age's roster,
   * the family in the mono eyebrow, the legacy's clauses under the name, the
   * epigram at the foot and the kernel — why anybody remembers them — smaller
   * still beneath it.
   *
   * It is a tarot face, deliberately: a great person *is* a card from a deck
   * (`anyCardDef` answers for one, and its legacy is written in the same
   * vocabulary an Order's is), the roster is shared by every seat and consumed
   * on the pick, and the deal's turn-over is the gesture that says so. It is
   * **not** heavy-framed, unlike the Doctrine and the charter: those two are
   * irreversible *choices about your own law*, while a name another empire takes
   * first is simply gone — the weight there would be dread rather than warning.
   *
   * Every clause is `describeCard`, the same function the Statecraft collection
   * prints, so a legacy reads identically on the card that dealt it and in the
   * ledger afterwards — and a **deferred** half prints struck through in its own
   * greyed line rather than being joined into a sentence that would claim it.
   */
  function showGreatPersonOffer(): void {
    const seat = controls.localPlayerId();
    const player = playerById(game.state, seat);
    const offer = player?.greatPersonOffer;
    // An empty offer is what a spent roster leaves behind for one instant
    // (`settleRenownWindfall`); it blocks nothing and there is nothing to show.
    if (!offer || offer.options.length === 0) return;
    tutorial.note({ kind: 'event', event: 'greatPersonOffer' });

    offerCard.show(
      {
        eyebrow: 'the age offers you a name',
        title: 'Who will serve you',
        note: 'One name, from a roster the whole world draws on. Their legacy stays whichever verb you spend them on.',
        widening: wideningLines('greatPerson'),
        options: offer.options.map((id) => {
          const def = greatPersonDef(id);
          const option: OfferOption = {
            // The family, in the mono eyebrow — the one fact that decides both
            // verbs, so it is the first thing read.
            payoff: def.family,
            title: def.name,
            notes: describeCard(id).map((clause) =>
              clause.deferred === true ? { text: clause.text, deferred: true } : { text: clause.text },
            ),
            flavor: def.epigram,
            footnote: def.kernel,
            // The accent is the **tier**, not the family: what a player is
            // choosing between is a game-defining card with a malice, a
            // generically strong one and a situational one, and that is the
            // question the colour should be answering. The family is already
            // said in the eyebrow and drawn in the emblem.
            line: TIER_ACCENT[def.tier],
            lineName: TIER_NAME[def.tier],
            emblem: cardLineMarkUrl(FAMILY_EMBLEM[def.family]),
          };
          return option;
        }),
      },
      (index) => {
        const taken = offer.options[index];
        // Checked (the offer-loop bug of 2026-08-30) — and the recruit is
        // announced only when the reducer actually seated them: this arm can
        // legitimately refuse-and-redraw when another seat took the name.
        const result = dispatch(game, { type: 'chooseGreatPerson', playerId: seat, optionIndex: index });
        if (!result.ok) controls.guide(`☞ ${result.error}`);
        if (result.ok && taken !== undefined) announceRecruit(seat, taken);
        controls.refresh();
        statecraft?.refresh();
      },
    );
  }

  /**
   * The line a recruitment gets, and the camera that goes with it.
   *
   * Composed **after** the dispatch and read off the board, because the piece is
   * the thing worth looking at and it did not exist a moment ago: the reducer
   * mints it in the capital through `createUnit` (`settleGreatPersonChoice`), so
   * asking the state where it stands is asking the one authority on the matter.
   * A recruit with **nowhere to stand** — an empire with no cities, which is a
   * seat about to be eliminated — still gets its line, without a pan.
   *
   * The chronicle keeps it and the toast shows it, unlike a belief's line
   * (`showReligionOffer`), and the difference is that a belief lands nowhere: a
   * great person is a *piece*, and "where did they appear" is a thing a player
   * needs told once.
   *
   * The plain voice, deliberately. "Archimedes joins Crimson's court" is a
   * flourish the naming bible allows a splash and not the record of a fact.
   */
  function announceRecruit(seat: number, id: Parameters<typeof greatPersonDef>[0]): void {
    const def = greatPersonDef(id);
    const piece = game.state.units.find(
      (unit) => unit.ownerId === seat && personOf(unit) === id,
    );
    controls.announce(
      `✦ ${def.name} has been recruited`,
      piece ? { cell: { col: piece.col, row: piece.row } } : {},
    );
  }

  /**
   * The three tiers, as the accent keys `style.css` resolves.
   *
   * Reused from the Statecraft deck's own eight rather than added beside them,
   * because the three gradings *are* the deck's own philosophy read one class
   * over (`docs/deprecated/statecraft-cards.md`, applied to people by the 2026-08-27
   * ruling) and a fourth palette would be the interface claiming they are a
   * different kind of thing:
   *
   *   defining     the Wild Hunt's oxblood — blood, and the malice that comes
   *                with a game-defining card;
   *   strong       the Long Caravan's gilt — money, and the card that is never
   *                the wrong pick;
   *   situational  the Wayfarers' verdigris — distance, and the card that is
   *                great for one map and harmless otherwise.
   */
  const TIER_ACCENT: Record<GreatPersonTier, CardLine> = {
    defining: 'hunt',
    strong: 'caravan',
    situational: 'wayfarers',
  };

  /** What the accent *is*, in words. The card's `title`, as for a line. */
  const TIER_NAME: Record<GreatPersonTier, string> = {
    defining: 'Game-defining — and it costs you something',
    strong: 'Strong, and never the wrong pick',
    situational: 'Situational, and harmless otherwise',
  };

  /**
   * The emblem each family wears: the Statecraft line whose drawing already
   * means what the family means.
   *
   * A borrowing rather than five new marks, and the marks are borrowed for what
   * they *depict* rather than for the thread they belong to — the star for a
   * scholar, the candle for an artist, the anvil for an engineer, the road for a
   * merchant, the bow for a general (see `src/art/lineMarks.ts`'s notes). The
   * accent on the card is the tier, so nothing here is claiming a great person
   * joins an archetype line; it is one picture, chosen because it is the right
   * picture.
   */
  const FAMILY_EMBLEM: Record<Family, CardLine> = {
    scholar: 'star',
    artist: 'procession',
    engineer: 'forge',
    merchant: 'caravan',
    general: 'hunt',
  };

  /**
   * How a card is *drawn*: its accent key, its emblem and the line's name.
   *
   * Spread into an `OfferOption` rather than assembled inside the card, because
   * `offerCard.ts` holds the line that no simulation type crosses its boundary —
   * it is handed a picture and a key. The lookup that turns a `CardLine` into
   * either is `ui/cardLine.ts`, which is the interface's one opinion about what
   * a thread looks like; this is only the place the two meet.
   */
  function cardFace(def: Parameters<typeof lineOf>[0]): Partial<OfferOption> {
    const id = lineOf(def);
    return { line: id, emblem: cardLineMarkUrl(id), lineName: CARD_LINE_NAME[id] };
  }

  /**
   * A government's emblem: the mark of the office it opens the most slots for.
   *
   * The one card class with no archetype thread, so `cardFace` would give all
   * ten the same neutral seal and a charter triple would be three identical gold
   * rectangles. The spread *is* a government's character — Tyranny is three
   * military slots, Theocracy is three wildcards — and it is already the line
   * printed in the eyebrow, so the picture and the words say one thing.
   *
   * Ties break in `SLOT_TYPES` order, which is the order every other list of the
   * three is written in; there is no government where that decides anything
   * today, and if one is added it decides it the same way twice.
   */
  function governmentEmblem(id: GovernmentId): Partial<OfferOption> {
    const spread = governmentDef(id).slots;
    const dominant = SLOT_TYPES.reduce((best, type) =>
      spread[type] > spread[best] ? type : best,
    );
    return { ...cardFace(governmentDef(id)), emblem: slotMarkUrl(dominant) };
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
   * One row of the lens menu.
   *
   * Three fields, and the split between them is what each is *for*:
   *
   *   · `label` is the lens's **name** — the row's heading and, alone, the word
   *     the bar button wears. It stays short for that second reader;
   *   · `hint` is the platform tooltip, with the digit appended;
   *   · `legend` is the **key to the drawing** — what a wash means, what a ring
   *     means — printed under the row only while that lens is up. A key nobody
   *     is looking at the board through is a paragraph in a menu.
   *
   * There was a fourth, `tail`: a clause printed after an em dash where a lens
   * could say what question it answers. Only the faith row ever carried one, so
   * what it actually did was make that row *look different from the other two*
   * for no reason a player could name (user, 2026-08-28). A row is a name; the
   * sentence a lens is worth belongs in the tooltip, which every row already
   * has, and the key belongs under the row it is the key to. Removed rather
   * than left unused, because an optional field with no reader is an invitation
   * to make one row odd again.
   */
  interface LensOption {
    mode: LensMode;
    label: string;
    hint: string;
    legend?: string;
  }

  /**
   * The lens menu's rows, in the order they are shown: the exclusive lens
   * choices the menu below builds buttons for, and — via `controls`'s
   * `lensOrder` — the one source of order the number-key hotkeys read
   * (`lensForDigit` in `controls.ts`). Declared before `controls` for exactly
   * that: the wiring needs the order, and a second copy of this list for the
   * hotkeys to read would be the very mapping this shape is meant to avoid.
   */
  const LENS_OPTIONS: LensOption[] = [
    { mode: 'none', label: 'None', hint: 'The board as it is' },
    {
      mode: 'settler',
      label: 'Settler',
      hint: 'Where a city may go: blue is coastal, green is fresh water',
    },
    {
      mode: 'explorer',
      label: 'Explorer',
      hint: 'What is left to find: gold is a ruin or a village, red is a camp',
    },
    // The third, appended rather than inserted — which is all a new lens costs,
    // because the digit hotkey is `lensOrder`'s position rather than a mapping
    // of its own (`lensForDigit`). It used to be the one lens no piece raised;
    // since 2026-08-28 a prophet or an augur raises it exactly as a settler
    // raises its own (`lensForSelection` in `controls.ts`).
    {
      mode: 'faith',
      label: 'Faith',
      hint: 'Whose faith is winning, and where: each hex in its founder’s ink',
      // The one lens whose drawing has three marks in it, so it is the one that
      // needs a key. Two clauses do the real work: the tide acts on *towns*, so
      // a player who sees blank steppe does not assume the lens is broken — and
      // the town is where the reading is, so the last clause points at the
      // gesture that gives it (`faithHover.ts`).
      legend:
        'wash = the founder’s ink, darker is stronger; tight ring = holy site; ' +
        'wide ring = proclamation; unclaimed ground is blank because the tide acts on towns; ' +
        'hover a city for its pressure',
    },
  ];

  /**
   * A screen in front of the board owns the keyboard: the landing, and the
   * two full-screen surfaces — the star chart and the Abacus — each of which
   * handles its own Escape while it is up. Named and hoisted above
   * `createGameControls` so the HUD dock's own `H` hotkey (wired below,
   * standalone rather than through `controls.ts`'s own keydown switch — see
   * that wiring's comment) can defer to the same guard rather than growing a
   * second copy of it.
   */
  function isInputBlocked(): boolean {
    return (
      !landingEl.hidden ||
      (techTree?.isOpen ?? false) ||
      (abacus?.isOpen ?? false) ||
      (beads?.isOpen ?? false) ||
      (statecraft?.isOpen ?? false) ||
      // The two screens this pass added. Both own the keyboard while they are
      // up — each handles its own Escape — and neither has any business letting
      // `H`, `T` or End Turn through from underneath.
      (trade?.isOpen ?? false) ||
      compendium.isOpen ||
      // The load list is the third such screen, and the only one that can be
      // up while the landing is: it handles its own Escape (see
      // `savesPanel.ts`).
      savesPanel.isOpen ||
      // The offer card is the one genuinely blocking surface here: it owns
      // the keyboard while it is up, and there is nothing to escape to (see
      // `offerCard.ts`).
      offerCard.isOpen ||
      // The Triumph sheet is the mild kind of modal (`triumphModal.ts`): it
      // answers its own Enter and Escape in a capturing listener, so the board
      // would never have seen either key anyway. It is here for the *other*
      // hotkeys — `H`, `T`, End Turn — which have no business firing under a
      // sheet the player has not proceeded past.
      (triumphSheet?.isOpen ?? false) ||
      // The victory sheet is that sheet's sibling and blocks on the same terms.
      (victory?.isOpen ?? false) ||
      // The confirm card is the Triumph sheet's kind (`confirmCard.ts`): it
      // answers its own Enter and Escape in a capturing listener, so it is here
      // for the *other* hotkeys — `H`, `T`, End Turn — which have no business
      // firing under an unanswered question.
      confirmCard.isOpen ||
      // And the bead sheet, which is the Triumph sheet in every respect that
      // matters here.
      (beadSheet?.isOpen ?? false)
    );
  }

  /**
   * Is there a sheet in front of the player right now?
   *
   * Deliberately **narrower** than `isInputBlocked`: that one answers "may a
   * hotkey fire", and a full-window screen the player opened themselves says no
   * to it. This one answers "would a new sheet land on top of something", and a
   * screen is not something news has to wait for — the star chart cannot be
   * open at a hand-over anyway (End Turn is gated on the same guard), and a
   * player reading the Beads table when their bead arrives should get the sheet.
   */
  function newsBlocked(): boolean {
    return (
      !landingEl.hidden ||
      offerCard.isOpen ||
      (triumphSheet?.isOpen ?? false) ||
      (beadSheet?.isOpen ?? false) ||
      (victory?.isOpen ?? false) ||
      confirmCard.isOpen
    );
  }

  /**
   * Raises the next piece of Bead Race news, if the screen is clear.
   *
   * **The queue discipline the Triumph sheet has inside itself, one level up**,
   * because these two moments live on two different surfaces: an award is a
   * sheet (`beadModal.ts`) and an age opening is the Beads table wearing a
   * banner (`beadsScreen.ts`'s `announceAge`). Awards go first — a bead is
   * *yours* and the table is the world's — and the age's list is raised only
   * once every sheet behind it has been proceeded past, so the player reads one
   * thing at a time.
   *
   * Called from every seam that clears a sheet: the two modals' `onClosed`, the
   * offer card's phase, and the report itself. Nothing polls, and news that
   * arrives while something is up simply waits for the next call.
   */
  function pumpBeadNews(): void {
    if (newsBlocked()) return;
    if (pendingBeadNews.length > 0 && beadSheet) {
      const news = pendingBeadNews;
      pendingBeadNews = [];
      beadSheet.show(news);
      return;
    }
    if (pendingBeadAge !== null && beads) {
      const age = pendingBeadAge;
      pendingBeadAge = null;
      beads.announceAge(age);
    }
  }

  const controls = createGameControls({
    viewport: viewportEl,
    renderer,
    getGame: () => game,
    onUpdate: updatePanel,
    // And the pointer's own, narrow half — `updatePanel` minus everything that
    // prints the state. A mouse move can change what the readout says about the
    // hex under the cursor and nothing else on this page: the previews that
    // follow the pointer (the spotlight, the settler radius, the path) are
    // pushed straight at the renderer by `controls` itself, and the faith card
    // is `updateContext`'s last line. See `onHover` in `controls.ts`.
    onHover: () => updateContext(renderer.getHover()),
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
    // The commit funnel, straight through to the guide: a tutorial step is
    // advanced by the player's own deed, so "a `foundCity` was accepted" is the
    // whole of what it needs. It is also where the notes that ride on a
    // reducer's report are raised — the first bead, an age opening, a town going
    // hungry — because those three are differences that stop existing the
    // instant the command returns (`CommandResult`'s own docblock).
    onCommand: (command, result) => {
      // **The guide advances on the player's own deed**, so a bot's order is not
      // one of them — the driver reaches this same listener (see
      // `driveBots`' reporter below), and without this clause a rival founding
      // its capital would tick off the step asking the player to found theirs.
      // The reports underneath are not filtered: an age opening is news about
      // the world whoever caused it.
      if (command.playerId === controls.localPlayerId()) {
        tutorial.note({ kind: 'command', command: command.type });
      }
      if (!result.ok) return;
      if (result.beads && result.beads.length > 0) {
        tutorial.note({ kind: 'event', event: 'bead' });
      }
      if (result.beadAgeOpened !== undefined) {
        tutorial.note({ kind: 'event', event: 'ageOpened' });
      }
      if (result.starved?.some((report) => report.ownerId === controls.localPlayerId())) {
        tutorial.note({ kind: 'event', event: 'starved' });
      }
      noteEnemySighting();
    },
    /**
     * **Every seat nobody is sitting in takes its turn**, immediately before
     * this one hands over.
     *
     * The whole of the AI's wiring, and it is one line because the turn model
     * already does the work: turns are simultaneous, so the seats can play in
     * any order, and the *last* `endTurn` is what resolves the turn. Letting the
     * bots go first makes the human's press the last one, so the resolution
     * happens inside the dispatch `controls.endTurn` is watching and every
     * report — raids, wonders, sieges, Triumphs, the turn card — lands exactly
     * where it did before a bot existed. See `onBeforeEndTurn` in `controls.ts`.
     *
     * Their commands go to `controls.reportCommand`, the same seam the star
     * chart and the city panel use, so anything listening for "an order was
     * accepted" hears a bot's too. Deliberately **not** `commit`: that funnel
     * carries a *seat's* after-effects — the sighting poll, the raid toasts —
     * and firing them for a rival's order would narrate another empire's turn
     * to the player.
     */
    onBeforeEndTurn: () => {
      driveBots(game, { report: (command, result) => controls.reportCommand(command, result) });
    },
    closePopovers,
    inputBlocked: isInputBlocked,
    onToggleTechTree: () => techTree?.toggle(),
    onToggleAbacus: () => abacus?.toggle(),
    onToggleBeads: () => beads?.toggle(),
    // End Turn's research blocker puts the chart up; it never takes it down.
    onOpenTechTree: () => techTree?.open(),
    onOfferDiscovery: showDiscoveryOffer,
    onToggleStatecraft: () => statecraft?.toggle(),
    // End Turn's Statecraft blocker puts the offer card up, because the offer is
    // what is owed; the screen is where a *slot* is changed and is opened by the
    // player rather than at them.
    onOfferStatecraft: showStatecraftOffer,
    onStatecraftPause: (kind) => {
      // The button's promise kept: the pause opens the thing that waits.
      if (kind === 'government') showStatecraftOffer();
      else statecraft?.open();
    },
    onOfferReligion: showReligionOffer,
    onOfferGreatPerson: showGreatPersonOffer,
    /**
     * The Triumph sheet, over the awards this seat has just earned.
     *
     * The row is looked up here rather than carried on `TriumphAward`, because
     * `data/triumphs.json` is the one place a Triumph's *words* live and the
     * award carries only what happened. `art` is read the same way and is
     * absent from every row today: the sheet's plate is a slot that waits for
     * the first row that names one, and hides itself until then.
     */
    onTriumphs: (awards) => {
      triumphSheet?.show(
        awards.map((award) => {
          // `art` is declared optional and no row carries one yet; the day a
          // row does, this reads it with no second pass here.
          const row: { text: string; epigram: string; art?: string } = triumphDef(award.id);
          return {
            name: award.name,
            text: row.text,
            epigram: row.epigram,
            pays: award.pays,
            art: row.art ?? null,
          };
        }),
      );
    },
    /**
     * The bead sheet, over the beads this seat has just taken.
     *
     * The rod each sheet draws is composed **here**, at the moment the award is
     * reported, and never at the moment it is shown: a batch held behind an
     * offer card while a second resolution pays another bead would otherwise
     * draw both sheets on the rod as it stands now, and the first sheet would
     * animate a bead it did not earn. `beadRodsFor` is that slicing, pure and
     * pinned, and `Player.beads` being append-only is what makes it exact.
     */
    onBeadAwards: (awards) => {
      const seat = game.state.players[controls.localPlayerId()];
      const rod = seat?.beads ?? [];
      const rods = beadRodsFor(awards, rod);
      awards.forEach((award, index) => {
        pendingBeadNews.push({
          id: award.id,
          name: award.name,
          kind: award.kind,
          family: award.family,
          // The settlement's own sentences, already banked and already plain.
          boon: award.boon,
          rod: rods[index] ?? rod,
        });
      });
      pumpBeadNews();
    },
    /**
     * The age opened: the Beads table, raised with its banner, to every seat.
     *
     * The age is all that is carried — the hand is on the state, and the screen
     * reads it when it draws. Queued behind any award sheet, which is what
     * `pumpBeadNews` is for.
     */
    onBeadAgeOpened: (age) => {
      pendingBeadAge = age;
      pumpBeadNews();
    },
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
      if (!player) return;
      // Two volumes, one moment, `reportTriumphs`' own split: the splash is the
      // flourish over the board and the sheet is the thing with a button on it.
      // The sheet is raised for **every** seat, not only the winner — a player
      // who lost is entitled to be told, by name, rather than to find a line in
      // the chronicle three scrolls down.
      splash.announceVictory(player.name);
      victory?.show({
        winner: player.name,
        mine: playerId === controls.localPlayerId(),
        beads: player.beads.length,
        threshold: BEAD_RULES.threshold,
      });
    },
    // The number-key hotkeys' one source of order — see `LENS_OPTIONS`'s own
    // docblock for why this is declared above rather than the menu passing it
    // down.
    lensOrder: LENS_OPTIONS.map((option) => option.mode),
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
      case 'openGreatPerson':
        showGreatPersonOffer();
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
  const lensButtons = LENS_OPTIONS.map(({ mode, label, hint, legend }, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lens-option';
    // The row's own hotkey, spelled out where the row is. Counted the way
    // `lensForDigit` counts — over the *lenses*, with the None row struck out
    // and taking `0` — so the tooltip cannot drift from the key that fires.
    const digit = LENS_OPTIONS.slice(0, index).filter((o) => o.mode !== 'none').length + 1;
    button.title = mode === 'none' ? `${hint} (0)` : `${hint} (${digit})`;
    const name = document.createElement('span');
    name.className = 'lens-option-name';
    name.textContent = label;
    // Nothing after the name. Every row is a label and a tick, and that is the
    // whole of the row — see `LensOption` for the clause that used to hang off
    // this one and why it is gone.
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
    // The key, under its own row and hidden until the lens is up
    // (`updateLensMenu`). A sibling of the button rather than a child of it:
    // it is not part of the control, and a screen reader reading a two-line
    // button would announce the key every time the row is passed.
    let key: HTMLElement | null = null;
    if (legend !== undefined) {
      key = document.createElement('p');
      key.className = 'lens-legend';
      key.textContent = legend;
      key.hidden = true;
      lensOptionsEl.append(key);
    }
    return { mode, label, button, key };
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
      if (option.key) option.key.hidden = !on;
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
    planStrip: requireElement('tech-plan'),
    hintLine: requireElement('tech-hint'),
    statusCard: researchCard,
    statusName: techCurrentEl,
    statusDial: researchDialEl,
    statusGlyph: researchGlyphEl,
    statusBoss: researchTurnsEl,
    statusFigures: researchFiguresEl,
    getGame: () => game,
    localPlayerId: () => controls.localPlayerId(),
    onChanged: () => updatePanel(null, renderer.getHover()),
    // The chart sends its own `chooseResearch` (see `send` in `techTree.ts`), so
    // it reports it back into the board's funnel — otherwise everything watching
    // what the player *does* is deaf to the one command this screen exists for.
    onCommitted: (command, result) => controls.reportCommand(command, result),
    // Two full-screen screens at one z-index is one of them being invisible.
    onOpen: () => {
      abacus?.close();
      // The chart opening is the guide's fourth step, and it is an *event*
      // rather than a command: nothing about the world changed, so there is
      // nothing in the commit funnel to read. Hooked here, at the screen's one
      // open seam, so `T`, the research card and End Turn's blocker all count.
      tutorial.note({ kind: 'event', event: 'techChartOpened' });
    },
    // Its twin. The guide asks the player to fold the chart away before the
    // next card appears — a city screen raised over a star chart is two screens
    // arguing (the user, 2026-08-30) — and `setOpen` is the one place all five
    // of the chart's doors arrive at, so this fires for the ×, for Escape, and
    // for a click on the ink around it alike.
    onClose: () => tutorial.note({ kind: 'event', event: 'techChartClosed' }),
  });

  /**
   * The Statecraft screen: the empire's law, laid out on the table.
   *
   * Declared after `controls` for `techTree`'s reason and reached back through
   * the `statecraft` holder above. Every write it makes is a **command** — it
   * hands a batch to `controls.sendStatecraft` and never touches the state — so
   * a slot changed here is a slot changed the same way a network peer or a
   * future AI would change one, and the sentence a refused drop shows is the
   * reducer's own.
   *
   * A *batch*, because the screen stages: placing and removing edit a local
   * arrangement and the whole diff goes over in one list when the player
   * confirms it or leaves the sheet. See `statecraftStaging.ts`.
   */
  statecraft = createStatecraftScreen({
    overlay: statecraftOverlayEl,
    body: statecraftBodyEl,
    closeButton: requireElement('statecraft-close'),
    getState: () => game.state,
    getPlayerId: () => controls.localPlayerId(),
    send: (commands) => controls.sendStatecraft(commands),
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
    beads?.close();
    },
  });

  /**
   * The Religion screen: the faith pool, the pantheon's places, the augur's
   * price and the rites it carries.
   *
   * Statecraft's sibling in every respect that matters — declared here beside
   * it, reached back through the `religion` holder, and every write it makes is
   * a **command**. The one it can send is `purchaseItem`, so an augur called
   * from this sheet is called the same way the city panel's own faith row calls
   * one — and the same way a network peer or a future AI would — and the
   * sentence a refusal shows is the reducer's own.
   */
  religion = createReligionScreen({
    overlay: religionOverlayEl,
    body: religionBodyEl,
    closeButton: requireElement('religion-close'),
    getState: () => game.state,
    getPlayerId: () => controls.localPlayerId(),
    buy: (cityId, item, currency) => {
      dispatch(game, {
        type: 'purchaseItem',
        playerId: controls.localPlayerId(),
        cityId,
        item,
        currency,
      });
      controls.refresh();
      religion?.refresh();
    },
    rename: (name) => {
      controls.renameReligion(name);
      controls.refresh();
      religion?.refresh();
    },
    onRefuse: (message) => controls.guide(`☞ ${message}`),
    onOpen: () => {
      menu.close();
      help.close();
      lens.close();
      techTree?.close();
      abacus?.close();
    beads?.close();
      statecraft?.close();
    },
  });

  /**
   * The Trade screen: every caravan on the road, and every road not yet taken.
   *
   * Religion's sibling in every respect that matters — declared here beside it,
   * reached back through the `trade` holder, and every write it makes is a
   * **command**, sent through `controls`' by-id route verbs (`startRouteFrom`
   * and its two siblings; the latter two are the same inner functions the unit
   * sheet calls by selection). So a route started from this screen is started
   * the same way a network peer or a future AI would start one, and the refusal
   * a greyed row shows is the reducer's own.
   *
   * It is also the **only** way a route is opened now (the user's ruling,
   * 2026-08-28): the board's send plates are gone and the trader's sheet opens
   * this screen rather than arming a mode.
   *
   * `panTo` is `controls.panTo`, which is how everything in this interface
   * reaches the camera: `MapView` is `controls.ts`'s to drive.
   */
  trade = createTradeScreen({
    overlay: tradeOverlayEl,
    body: tradeBodyEl,
    closeButton: requireElement('trade-close'),
    getState: () => game.state,
    getPlayerId: () => controls.localPlayerId(),
    startRoute: (unitId, fromCityId, toCityId) => {
      controls.startRouteFrom(unitId, fromCityId, toCityId);
      updatePanel(null, renderer.getHover());
    },
    setAutoResend: (unitId, on) => {
      controls.setAutoResendOf(unitId, on);
      updatePanel(null, renderer.getHover());
    },
    cancelRoute: (unitId) => {
      controls.cancelRouteOf(unitId);
      updatePanel(null, renderer.getHover());
    },
    panTo: (cell) => controls.panTo(cell),
    onOpen: () => {
      menu.close();
      help.close();
      lens.close();
      notifications?.close();
      meterCards?.close();
      techTree?.close();
      abacus?.close();
    beads?.close();
      statecraft?.close();
      religion?.close();
      compendium.close();
    },
  });

  /**
   * The Abacus: the score, as an object on the table.
   *
   * One rod per seat, read off the live roster rather than off a snapshot, so a
   * new game re-strings it — and off `realPlayers`, for `renderSeats`' reason:
   * the reckoning is between nations, and a rod for the wild was a score line
   * for the weather. `beads` is `Player.beads` itself — the earned record, in
   * the order it was earned (design ledger Entry VI) — and the rods read it and
   * nothing else.
   */
  abacus = createAbacusScreen({
    overlay: abacusOverlayEl,
    stage: abacusStageEl,
    register: abacusRegisterEl,
    closeButton: requireElement('abacus-close'),
    trigger: abacusButton,
    rows: (): AbacusRow[] =>
      realPlayers(game.state).map((player) => ({
        playerId: player.id,
        name: player.name,
        // The diorama ink, not the panel colour: the label swatch belongs to the
        // same table the frame is standing on. Same call the pieces make.
        color: playerPieceColor(player.color, player.id),
        beads: player.beads,
      })),
    onOpen: () => {
      menu.close();
      help.close();
      lens.close();
      techTree?.close();
      beads?.close();
    },
    // A rod is the door to the cards behind it.
    onOpenBeads: () => {
      abacus?.close();
      beads?.open();
    },
  });

  /**
   * The Beads screen: the Bead Race's table.
   *
   * Statecraft's sibling in every respect — see `beadsScreen.ts` — and reached
   * three ways: the bead chip in the top bar, a rod on the Abacus, and `V`.
   * Nothing on it is stored, so it is built on each open off the live state.
   */
  beads = createBeadsScreen({
    overlay: beadsOverlayEl,
    body: beadsBodyEl,
    closeButton: requireElement('beads-close'),
    getState: () => game.state,
    getPlayerId: () => controls.localPlayerId(),
    onOpen: () => {
      menu.close();
      help.close();
      lens.close();
      notifications?.close();
      meterCards?.close();
      techTree?.close();
      abacus?.close();
      statecraft?.close();
      religion?.close();
      trade?.close();
      compendium.close();
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
    // shuts the menu, the help sheet, the lens menu and the dock's Faith card,
    // exactly as those three shut each other.
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
    // The routes chip's own door, on the culture chip's precedent: trade is the
    // second system in this strip with a screen behind it.
    onOpenTrade: () => {
      meterCards?.close();
      menu.close();
      help.close();
      lens.close();
      notifications?.close();
      techTree?.close();
      trade?.open();
    },
    // The bead chip's own door, on the same precedent again: the Bead Race is
    // the third system in this strip with a screen behind it, and the only one
    // that is what the whole game is played for.
    onOpenBeads: () => {
      meterCards?.close();
      menu.close();
      help.close();
      lens.close();
      notifications?.close();
      techTree?.close();
      beads?.open();
    },
  });
  // Escape and the landing screen reach these through `closePopovers`, which is
  // declared before any game exists — so it finds them through this holder.
  meterCards = civYields;

  /**
   * The HUD dock: Statecraft and Religion, under the research card. See
   * `src/ui/hudDock.ts` for the design; this is only wiring — the Statecraft
   * button is a bare trigger (its click mirrors the culture chip's own
   * `onOpenStatecraft` above and the ☰ menu's door to the same screen), and
   * the Faith card is the dock's own popover, joining the same one-card-at-
   * a-time rule every other HUD card keeps.
   */
  hudDock = createHudDock({
    container: hudDockEl,
    getGame: () => game,
    localPlayerId: () => controls.localPlayerId(),
  });
  /**
   * The dock's two doors, wired the same way and deliberately so: both are bare
   * triggers, both shut every other HUD surface first, and both then open a
   * parchment screen. The Religion button used to open a small Faith popover
   * the dock built itself; Religion v1 (ledger Entry XXVIII) gave it a screen,
   * and the popover's content is its first block.
   */
  function openScreen(open: () => void): void {
    meterCards?.close();
    menu.close();
    help.close();
    lens.close();
    notifications?.close();
    techTree?.close();
    open();
  }
  hudDock.statecraftButton.addEventListener('click', () => {
    openScreen(() => statecraft?.open());
  });
  hudDock.religionButton.addEventListener('click', () => {
    openScreen(() => religion?.open());
  });

  // `H` opens the Religion screen — the dock's own hotkey, and deliberately its
  // own small listener rather than one more branch in `controls.ts`'s keydown
  // switch: that module owns the board's verbs (fortify, sleep, move mode, the
  // lens…) and this is a screen with no unit or tile behind it, the same kind of
  // thing `T`/`C`/`A` are but wired where their *screens* are built instead of
  // where the board's own hotkeys are. Same two guards as every hotkey in that
  // switch: nothing while a screen owns the keyboard (`isInputBlocked`, above)
  // and nothing while the keystroke is actually text landing in a field. `F` was
  // Fortify's already; `H` reads as "Holy" and was free — see `index.html`'s
  // help sheet for where it is documented alongside the rest.
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'h' && event.key !== 'H') return;
    if (isInputBlocked()) return;
    const target = event.target as HTMLElement | null;
    const typing =
      target !== null &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable);
    if (typing) return;
    event.preventDefault();
    if (religion?.isOpen === true) religion.close();
    else openScreen(() => religion?.open());
  });

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

  /**
   * The faith lens's standing captions: which towns follow you, how many
   * citizens, and what your faith presses there — one plate per town the seat
   * knows, plus one per holy site it has explored.
   *
   * The **same layer** as the price tags, a second supplier
   * (`createMapPlates`), because the lifecycle is identical and a second
   * `<div>`-over-the-canvas overlay is exactly what that split exists to
   * prevent. `faithPlates` is pure and every figure on it is
   * `faithHoverReading`'s, so the plate and the hover card cannot disagree about
   * a town — and the fog rule that stops the leak is written once, there.
   *
   * `boardLens`, never `controls.lens()`: a prophet raises the lens without the
   * menu, and plates that read the menu would go dark in the case the pass
   * exists for. `onPick` is never called — every faith plate is `inert` — but
   * the supplier shape asks for one.
   */
  const faithMarks: MapPlates = createMapPlates({
    container: bannersEl,
    renderer,
    getPlates: () =>
      controls.boardLens() === 'faith'
        ? faithPlates(game.state, controls.localPlayerId())
        : [],
    onPick: () => {},
  });

  /**
   * The guide's ring, projected onto a piece.
   *
   * The **radius is in screen pixels around the hex's projected ground point**,
   * lifted a little because a piece stands *above* its hex — the same offset the
   * city banners take when they hang themselves off the identical point. A piece
   * the camera has scrolled away answers `null` and the ring simply goes.
   */
  tutorialBoardAnchor = (what) => {
    const project = renderer.projectCell;
    if (project === undefined) return null;
    const seat = controls.localPlayerId();
    const mine = game.state.units.filter((unit) => unit.ownerId === seat);
    // Two names, because the guide asks about two different pieces. `settler` is
    // literal; `mover` is "the other one" — the scout by preference, and
    // otherwise anything of this seat's that is not the founder, which is what
    // the step means by *your starting unit* both before the capital is founded
    // and after the settler has become one.
    const piece =
      what === 'mover'
        ? (mine.find((unit) => unit.type === 'scout') ??
          mine.find((unit) => unit.type !== 'settler') ??
          mine[0])
        : mine.find((unit) => unit.type === what);
    if (piece === undefined) return null;
    const point = project.call(renderer, piece.col, piece.row);
    if (point === null || !point.onScreen) return null;
    const radius = 34;
    return {
      left: point.x - radius,
      top: point.y - radius - 22,
      width: radius * 2,
      height: radius * 2,
    };
  };

  renderer.setFrameListener?.(() => {
    // The guide's ring, when it is hung on a *piece* rather than on a control:
    // a hex's screen position is a function of the camera, so it rides the same
    // beat every other board-anchored DOM element does. It measures nothing and
    // does nothing at all while no ring is up.
    tutorial.reposition();
    banners.reposition();
    damageNumbers.reposition();
    priceTags.reposition();
    faithMarks.reposition();
    // The faith card rides the same beat, for the same reason: its anchor is a
    // hex, and a camera that moved has moved it. `false` is the whole of the
    // difference from the hover path — the card is replaced where it stands, not
    // re-derived, so a pan costs one projection and no pressure fold.
    updateFaithCard(renderer.getHover(), false);
  });

  const cityPanel: CityPanel = createCityPanel({
    container: cityPanelEl,
    getGame: () => game,
    localPlayerId: () => controls.localPlayerId(),
    getCity: () => controls.openCity(),
    onClose: () => controls.setOpenCity(null),
    // The panel dispatches for itself too — the star chart's argument exactly.
    onCommitted: (command, result) => controls.reportCommand(command, result),
    isBuyMode: () => controls.isBuyMode(),
    setBuyMode: (on) => controls.setBuyMode(on),
    onOpenTrade: () => trade?.open(),
    // The **second** verb on any sheet that asks before it acts, and the asking
    // is here for `onDisband`'s reason exactly: the card is a surface this page
    // owns, and the act underneath it must stay reachable without one. Dismissing
    // a guildsman cannot be taken back — they return to the fields and the town's
    // guild bar restarts with them — which is the whole test for this card.
    askConfirm: (request, run) => confirmCard.ask(request, run),
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
    autoExploreBlocker: () => controls.autoExploreBlocker(),
    onAutoExplore: () => {
      controls.setAutoExplore(!(controls.selectedUnit()?.autoExplore === true));
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
    consecrateBlocker: () => controls.consecrateBlocker(),
    onConsecrate: () => {
      // The offer card is opened by `controls.consecrate` itself, through the
      // `onOfferReligion` seam — the same one the End Turn blocker uses — so
      // there is one path from "a god was drawn" to "the card is on screen".
      controls.consecrate();
      updatePanel(null, renderer.getHover());
      religion?.refresh();
    },
    riteOptions: () => controls.riteOptions(),
    onPerformRite: (id) => {
      // **A redraw asks first.** Recasting the Omens names a god the seat
      // already holds, so the one thing the sheet cannot supply is *which* — and
      // the choice is put on the same offer card every other draft in this game
      // is answered on, in a picker's dress. Asked of `recastChoices`, which is
      // empty for every rite that gives nothing back, so this branch costs the
      // other six nothing. A pantheon of one is not a question: it is dispatched
      // at once, because a card with a single option on it is a confirmation
      // dialog wearing a draft's clothes.
      const held = controls.recastChoices(id);
      if (held.length > 1) {
        showGiveBackPicker(held, (belief) => {
          controls.performRite(id, belief);
          updatePanel(null, renderer.getHover());
          religion?.refresh();
        });
        return;
      }
      controls.performRite(id, held[0]);
      updatePanel(null, renderer.getHover());
      religion?.refresh();
    },
    prophetRows: () => controls.prophetRows(),
    onProphetAct: (verb, pool) => {
      // Three of the four deal a hand, and the offer card is raised by
      // `controls.prophetAct` itself through the `onOfferReligion` seam — the
      // same one the augur's Consecrate and the End Turn blocker use, so there
      // is one path from "a belief was drawn" to "the card is on screen".
      controls.prophetAct(verb, pool);
      updatePanel(null, renderer.getHover());
      religion?.refresh();
    },
    greatPerson: () => controls.greatPersonView(),
    // Either verb spends the whole piece and hangs its legacy on the government,
    // so the Statecraft screen is refreshed the way the Religion screen is after
    // a rite: the collection's "in force" list has just grown a line.
    onGreatPersonAct: () => {
      controls.greatPersonAct();
      updatePanel(null, renderer.getHover());
      statecraft?.refresh();
    },
    onGreatPersonWork: () => {
      controls.greatPersonWork();
      updatePanel(null, renderer.getHover());
      statecraft?.refresh();
    },
    startRouteBlocker: () => controls.startRouteBlocker(),
    // The **fourth** door to the Trade screen, and the only one that carries a
    // chooser: the piece in hand is the caravan every Start on that screen will
    // spend, which is what makes "select a trader, choose a route" one gesture
    // rather than two unrelated ones.
    onStartRoute: () => trade?.open(controls.selectedUnit()?.id ?? null),
    routeReading: () => controls.routeReading(),
    routeSlotsLine: () => controls.routeSlotsLine(),
    onSetAutoResend: (on) => {
      controls.setAutoResend(on);
      updatePanel(null, renderer.getHover());
    },
    onCancelRoute: () => {
      controls.cancelRoute();
      updatePanel(null, renderer.getHover());
    },
    onOpenTrade: () => trade?.open(),
    disbandBlocker: () => controls.disbandBlocker(),
    // The **only** verb on this sheet that asks before it acts, and the asking
    // is here rather than in `controls` or in the panel for the reason the
    // confirm card exists at all: the card is a surface this page owns, and the
    // act underneath it must stay reachable without one. The words are the
    // simulation's own figures through `disbandPrompt` — the same upkeep the
    // row's hint and the sheet's note quote, so the card cannot promise a
    // saving the other two do not.
    onDisband: () => {
      const unit = controls.selectedUnit();
      if (!unit) return;
      const { title, body } = disbandPrompt(unit);
      confirmCard.ask({ title, body, confirmLabel: 'Disband', cancelLabel: 'Keep' }, () => {
        controls.disbandUnit();
        updatePanel(null, renderer.getHover());
      });
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
    // A decided race belongs to the game that decided it, and so does every
    // bead taken in it.
    victory?.clear();
    clearBeadNews();
    // A star chart of the game that just ended has nothing to say about the
    // one starting either.
    techTree?.close();
    // Nor does a scoreboard. The rods themselves are re-strung — the new table
    // may seat different people — but not now: `refresh` only marks them stale,
    // and the rebuild happens on the next open, if there ever is one.
    abacus?.close();
    beads?.close();
    abacus?.refresh();
    game = next ?? createGame(currentConfig());
    // The turn guard is about *this* game's turns. A resumed game is very often
    // at a turn number the last one also reached, and without this its first
    // autosave would be swallowed as a duplicate.
    autosave.reset();
    renderer.setGameState(game.state);
    controls.refresh(next === null ? 0 : resumeSeat(game.state));
    // A brand-new game only — see `boot`'s matching line and the boot-camera
    // ruling (2026-08-30). A loaded save keeps the refresh's own framing.
    if (next === null) renderer.focusOpening?.(openingFocus(game.state, controls.localPlayerId()));
    updateMapInfo();
    updatePanel(null, null);
    // The guide, on the same two terms `boot` sets it on below: a fresh table
    // gets the opening sequence, a resumed one never does (a save carries no
    // tutorial state, so there is no way to know which of those steps were
    // taken forty turns ago — see `Tutorial.resume`).
    if (next === null) tutorial.begin();
    else tutorial.resume();
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

  // The guide, from the top: the sequence *and* every one-time note, because a
  // player asking for it again is almost always showing the game to somebody
  // else. It also switches the guide back on, so the checkbox on the landing
  // agrees with what is on screen the next time that screen is up.
  menuTutorialButton.addEventListener('click', () => {
    menu.close();
    tutorial.replay();
    tutorialToggle.checked = tutorial.enabled();
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
  // A brand-new game only: the refresh above already panned to the local
  // seat's units (see `GameControls.refresh`), and this replaces that framing
  // with a close-in start on the founder — a loaded save keeps what the
  // refresh gave it (2026-08-30, the boot-camera ruling).
  if (initial === null) renderer.focusOpening?.(openingFocus(game.state, controls.localPlayerId()));
  // Last, after the camera has framed the board: the coach card is placed
  // against elements the refresh above has just rebuilt.
  if (initial === null) tutorial.begin();
  else tutorial.resume();
}
