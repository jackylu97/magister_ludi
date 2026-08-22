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
import { type Game, createGame } from './sim/game';
import {
  type GameConfig,
  type GameState,
  type PlayerSpec,
  type Unit,
  hasEndedTurn,
} from './sim/state';
import type { Tile } from './sim/map';
import { resourceDef } from './sim/resourceData';
import { featureDef, terrainDef } from './sim/terrainData';
import { describeUpgrade, visibleResourceAt } from './sim/tech';
import { techDef } from './sim/techData';
import { unitDef } from './sim/unitData';
import { Renderer } from './render/renderer';
import { loadSprites } from './render/sprites';
import { createFlatTileArtist, createTileArtist } from './render/tileVisuals';
import { Renderer3D } from './render3d/renderer3d';
import { tileYieldOf } from './sim/cities';
import { unitsOnTile } from './sim/units';
import { type CityBanners, createCityBanners } from './ui/cityBanners';
import { type CityPanel, createCityPanel } from './ui/cityPanel';
import { type GameControls, createGameControls } from './ui/controls';
import { type DamageNumbers, createDamageNumbers } from './ui/damageNumbers';
import { createPopover } from './ui/popover';
import { type TechTree, createTechTree } from './ui/techTree';
import { type CivYieldStrip, createCivYieldStrip } from './ui/topBar';
import { createTurnSplash } from './ui/turnSplash';
import { type UnitPanel, createUnitPanel } from './ui/unitPanel';
import type { HoverInfo, LensMode, MapView } from './ui/mapView';

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

const seedInput = requireElement<HTMLInputElement>('seed');
const sizeSelect = requireElement<HTMLSelectElement>('size');
const randomSeedButton = requireElement<HTMLButtonElement>('random-seed');
const endTurnButton = requireElement<HTMLButtonElement>('end-turn');

/** The landing screen. See the boot-order note in the module docblock. */
const landingEl = requireElement<HTMLElement>('landing');
const landingForm = requireElement<HTMLFormElement>('landing-setup');
const landingErrorEl = requireElement<HTMLElement>('landing-error');
const startButton = requireElement<HTMLButtonElement>('start-game');
const restartButton = requireElement<HTMLButtonElement>('restart');
const restartConfirmEl = requireElement<HTMLElement>('restart-confirm');
const restartYesButton = requireElement<HTMLButtonElement>('restart-yes');
const restartNoButton = requireElement<HTMLButtonElement>('restart-no');
const statusEl = requireElement<HTMLElement>('status');
const seatsEl = requireElement<HTMLElement>('seats');
const civYieldsEl = requireElement<HTMLElement>('civ-yields');
const viewportEl = requireElement<HTMLDivElement>('viewport');
const bootEl = requireElement<HTMLElement>('boot');
const bannersEl = requireElement<HTMLElement>('banners');
const cityPanelEl = requireElement<HTMLElement>('city-panel');
const unitPanelEl = requireElement<HTMLElement>('unit-panel');
const turnSplashEl = requireElement<HTMLElement>('turn-splash');

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
const techButton = requireElement<HTMLButtonElement>('tech-button');
const techCurrentEl = requireElement<HTMLElement>('tech-current');
const techOverlayEl = requireElement<HTMLElement>('tech-overlay');
const techChartEl = requireElement<HTMLElement>('tech-chart');
const contextEl = requireElement<HTMLElement>('hud-context');
const contextNoticeEl = requireElement<HTMLElement>('context-notice');
const combatForecastEl = requireElement<HTMLElement>('combat-forecast');

const infoMap = requireElement<HTMLElement>('info-map');
const infoSeed = requireElement<HTMLElement>('info-seed');
const infoTerrain = requireElement<HTMLElement>('info-terrain');
const infoFeature = requireElement<HTMLElement>('info-feature');
const infoYields = requireElement<HTMLElement>('info-yields');
const infoResource = requireElement<HTMLElement>('info-resource');
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
    // A card that opens showing "Restart?" is a card that will eventually be
    // answered by accident.
    setRestartConfirm(false);
  },
});
const help = createPopover({
  panel: helpOverlayEl,
  trigger: helpButton,
  closeButton: requireElement('help-close'),
  onOpen: () => {
    menu.close();
    lens.close();
  },
});
const lens = createPopover({
  panel: lensPopoverEl,
  trigger: lensButton,
  closeButton: requireElement('lens-close'),
  onOpen: () => {
    menu.close();
    help.close();
  },
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

function closePopovers(): boolean {
  const wasOpen = menu.isOpen || help.isOpen || lens.isOpen || (techTree?.isOpen ?? false);
  menu.close();
  help.close();
  lens.close();
  techTree?.close();
  return wasOpen;
}

// --- the landing screen -----------------------------------------------------

/**
 * Starts a fresh game from the landing's fields, or `null` before the first one
 * has ever started.
 *
 * It doubles as the record of whether `boot` has run: the whole page — renderer,
 * controls, panels — is built once, on the first Start, and every Start after
 * that is an ordinary new game.
 */
let startNewGame: (() => void) | null = null;

function showLanding(): void {
  // Nothing from the game may be left standing in front of the landing. The
  // popovers sit below it in the stack, so this is not what makes them
  // invisible — it is so that Start does not drop the player back into a game
  // with a card open that they opened a game ago, and so that the landing is
  // never competing with a second surface for the keyboard.
  closePopovers();
  setRestartConfirm(false);
  // `hidden` is the whole of the screen state — one flag, read by `inputBlocked`
  // as well as by the stylesheet, so "is the landing up?" has one answer.
  landingEl.hidden = false;
  landingErrorEl.hidden = true;
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
 * The Start button, for both of its jobs: building the page the first time, and
 * starting a new game every time after.
 *
 * The button is disabled for the duration because the first press is genuinely
 * slow — a sprite set to fetch, or a board to bake — and a second press
 * mid-build would run the whole boot twice.
 */
async function beginGame(): Promise<void> {
  if (startButton.disabled) return;
  startButton.disabled = true;
  landingErrorEl.hidden = true;
  try {
    if (startNewGame) startNewGame();
    else await boot();
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
    players: PLAYERS,
  };
}

// --- panel text ------------------------------------------------------------

/**
 * Names for the info panel, read straight from the simulation's own data files.
 *
 * Both 2D artists already answer `describe` with exactly this, so reading it
 * here instead means the panel says the same words whichever renderer is up —
 * and the 3D renderer never has to grow a text-formatting responsibility to
 * satisfy a DOM element it does not own.
 */
function describeTile(tile: Tile): { terrain: string; feature: string; hills: boolean } {
  return {
    terrain: terrainDef(tile.terrain).name,
    feature: featureDef(tile.feature).name,
    hills: tile.hills,
  };
}

/**
 * The hovered tile's yields, each figure in the colour that yield is always
 * drawn in — food green, production orange, gold gilt — and in the mono face,
 * because they are numbers. A tile that produces nothing says so once rather
 * than printing three zeroes.
 *
 * `tileYieldOf` is the same function the citizens are assigned with, so what the
 * panel promises is what a city working the tile would actually collect.
 */
function showTileYields(tile: Tile): void {
  const value = tileYieldOf(tile);
  const parts: [string, string, number][] = [
    ['food', '🌾', value.food],
    ['production', '⚙', value.production],
    ['gold', '🪙', value.gold],
  ];
  const shown = parts.filter(([, , amount]) => amount > 0);
  if (shown.length === 0) {
    infoYields.textContent = '—';
    return;
  }
  infoYields.replaceChildren(
    ...shown.map(([key, glyph, amount]) => {
      const span = document.createElement('span');
      span.className = `tile-yield is-${key}`;
      span.textContent = `${amount}${glyph}`;
      return span;
    }),
  );
}

/**
 * What is on the tile under the pointer, through the local seat's eyes.
 *
 * "Horses (strategic)" — the name and the kind, because the kind is what says
 * whether the player should be reaching for a settler or a war plan. Asked of
 * `visibleResourceAt`, which is the simulation's own answer and the same one the
 * resource lens draws from, so the card and the board cannot disagree about
 * whether this empire has heard of iron yet. A tile whose resource is hidden
 * reads as an empty row, exactly like a tile with nothing on it: the honest
 * report of "you do not know of anything here".
 */
function describeResource(state: GameState, playerId: number, tile: Tile): string {
  const id = visibleResourceAt(state, playerId, tile);
  if (id === null) return '—';
  const def = resourceDef(id);
  return `${def.emoji} ${def.name} (${def.kind})`;
}

/**
 * What is standing on the tile under the pointer — anybody's piece, because
 * looking is not commanding and there is no fog of war to hide it behind yet.
 *
 * The card describes the *ground and what is on it*; the selected unit has its
 * own panel on the right, with its own numbers and its own verbs. A stack says
 * how deep it is rather than listing itself into a scrollbar.
 */
function describeUnitsOn(state: GameState, tile: Tile): string {
  const units = unitsOnTile(state, tile.col, tile.row);
  const first = units[0];
  if (!first) return '—';
  const def = unitDef(first.type);
  const owner = state.players[first.ownerId];
  const more = units.length > 1 ? ` +${units.length - 1}` : '';
  return `${def.name} · ${first.hp}/${def.maxHp} hp · ${owner?.name ?? '—'}${more}`;
}

/**
 * The combat forecast block: both damage figures with their bands, and the two
 * hit-point bars they would leave behind.
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

  // What is making the defender hard to kill, and what is making the attacker
  // weak — the itemisation behind the two strengths above.
  const modifiers: string[] = [];
  if (preview.terrainBonus > 0) {
    modifiers.push(`terrain +${Math.round(preview.terrainBonus * 100)}%`);
  }
  if (preview.fortifyBonus > 0) {
    modifiers.push(`fortified +${Math.round(preview.fortifyBonus * 100)}%`);
  }
  if (preview.acrossRiver) modifiers.push('across a river');
  if (preview.capturesCity) modifiers.push('would take the city');
  if (modifiers.length > 0) {
    const note = document.createElement('p');
    note.className = 'combat-note';
    note.textContent = modifiers.join(' · ');
    combatForecastEl.append(note);
  }
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
 */
async function boot(): Promise<void> {
  let game: Game = createGame(currentConfig());
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
      const waiting = state.players.filter((player) => !hasEndedTurn(state, player.id));
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
   */
  function renderSeats(): void {
    const { state } = game;
    const localId = controls.localPlayerId();
    seatsEl.replaceChildren();

    for (const player of state.players) {
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
    if (hover) {
      const described = describeTile(hover.tile);
      infoTerrain.textContent = described.terrain + (described.hills ? ' (hills)' : '');
      infoFeature.textContent = described.feature;
      infoOffset.textContent = `col ${hover.tile.col}, row ${hover.tile.row}`;
      infoAxial.textContent = `q ${hover.axial.q}, r ${hover.axial.r}`;
      infoUnit.textContent = describeUnitsOn(game.state, hover.tile);
      showTileYields(hover.tile);
      infoResource.textContent = describeResource(
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
    }

    // Asked after the readout, because it is a question about the selection and
    // the pointer together rather than about the ground.
    showCombatForecast(controls.combatForecast());

    contextEl.classList.toggle('is-shown', hover !== null || !contextNoticeEl.hidden);
  }

  /**
   * The message line inside the context card: move mode while it is armed, a
   * refused order for a beat and a half, or the result of a blow. `kind` is the
   * difference between news and a "no" the player did not ask for — only the
   * refusal flashes.
   */
  function showNotice(text: string | null, kind: 'mode' | 'reject'): void {
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
    // The research line changes with the seat, with the science rate and with
    // every completed tech, so it refreshes wherever the rest of the HUD does.
    techTree?.render();
    banners.refresh();
    cityPanel.render();
    unitPanel.render();
    // The End Turn button sits in the corner the right-hand panels occupy, so it
    // steps aside for whichever one is open rather than hiding underneath it.
    document.body.classList.toggle(
      'is-panel-open',
      !cityPanelEl.hidden || !unitPanelEl.hidden,
    );

    updateContext(hover);
  }

  // --- lifecycle ------------------------------------------------------------

  /**
   * Turn announcements. Created before `controls` because `controls` reports
   * into it: a resolved turn is announced to the seat that is about to play it,
   * and a harness seat hop says whose chair you have just been moved to.
   */
  const splash = createTurnSplash(turnSplashEl);

  const controls = createGameControls({
    viewport: viewportEl,
    renderer,
    getGame: () => game,
    onUpdate: updatePanel,
    onNotice: showNotice,
    closePopovers,
    // A screen in front of the board owns the keyboard: the landing, and the
    // star chart, which handles its own Escape while it is up.
    inputBlocked: () => !landingEl.hidden || (techTree?.isOpen ?? false),
    onToggleTechTree: () => techTree?.toggle(),
    onTurnResolved: (_turn, research) => {
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
  });

  /**
   * The lens menu: the exclusive lens choices, and — under them — the switches
   * that are not lenses.
   *
   * The rows set the player's *chosen* lens, which a selected settler may be
   * overriding on the board (see `controls.ts`), and each checkbox sets one of
   * their own switches, which nothing else in the interface takes away. The menu
   * deliberately shows the choices rather than the overrides: they are the
   * things the player can change, and the things that come back.
   *
   * The switches are checkboxes and not further rows precisely because they
   * compose with everything above them. A tick in a list of exclusive rows would
   * say the opposite — that turning yields on turns the settler lens off, which
   * is exactly the behaviour this shape removed, first for the glyphs and then
   * for the resource roundels.
   */
  const LENS_OPTIONS: [LensMode, string, string][] = [
    ['none', 'None', 'The board as it is'],
    ['settler', 'Settler', 'Where a city may go: blue is coastal, green is fresh water'],
  ];

  const lensButtons = LENS_OPTIONS.map(([mode, label, hint]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lens-option';
    button.title = hint;
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
   * The star chart, and the research line in the top bar it is opened from.
   *
   * Declared after `controls` because it asks whose seat this is; reached by
   * `controls` through the `techTree` holder above, which is what breaks the
   * knot between the two.
   */
  techTree = createTechTree({
    overlay: techOverlayEl,
    chart: techChartEl,
    closeButton: requireElement('tech-close'),
    barButton: techButton,
    barValue: techCurrentEl,
    getGame: () => game,
    localPlayerId: () => controls.localPlayerId(),
    onChanged: () => updatePanel(null, renderer.getHover()),
  });

  /**
   * The empire's per-turn totals, at the left end of the top bar. A pure sum
   * over the local seat's cities, refreshed with everything else.
   */
  const civYields: CivYieldStrip = createCivYieldStrip({
    container: civYieldsEl,
    getGame: () => game,
    localPlayerId: () => controls.localPlayerId(),
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
  renderer.setFrameListener?.(() => {
    banners.reposition();
    damageNumbers.reposition();
  });

  const cityPanel: CityPanel = createCityPanel({
    container: cityPanelEl,
    getGame: () => game,
    localPlayerId: () => controls.localPlayerId(),
    getCity: () => controls.openCity(),
    onClose: () => controls.setOpenCity(null),
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
    onClose: () => controls.clearSelection(),
  });

  function newGameFromControls(): void {
    // An announcement about the game that just ended has nothing to say about
    // the one starting, so it goes with it.
    splash.clear();
    // A star chart of the game that just ended has nothing to say about the
    // one starting either.
    techTree?.close();
    game = createGame(currentConfig());
    renderer.setGameState(game.state);
    controls.refresh();
    updateMapInfo();
    updatePanel(null, null);
    report();
  }

  // Every Start after this one comes back through here rather than through
  // `boot`: a restart is a new game, and this is the path a new game has always
  // taken — one that resets the selection, the lens, the panels and the camera.
  startNewGame = newGameFromControls;

  endTurnButton.addEventListener('click', () => {
    controls.endTurn();
    updatePanel(null, renderer.getHover());
  });

  window.addEventListener('resize', () => renderer.resize());

  updateMapInfo();
  updatePanel(null, null);
  renderer.resize();
  // After the first resize, never before: a 3D board framed against a viewport
  // that had not been laid out yet re-frames itself in `resize`, which would
  // undo the opening view of the local player's units.
  controls.refresh();
}
