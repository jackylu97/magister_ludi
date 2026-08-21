/**
 * Entry point: creates the game, builds a renderer for it, wires the DOM panel,
 * and hands every pointer and key event to `src/ui/controls.ts`.
 *
 * Deliberately thin — no game logic here, and no input logic either. This file
 * owns the page: which elements exist, which player colours a new game gets,
 * and what the info panel says. Everything else is a call into the simulation or
 * into a renderer.
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
import { type GameConfig, type PlayerSpec, type Unit, hasEndedTurn } from './sim/state';
import type { Tile } from './sim/map';
import { featureDef, terrainDef } from './sim/terrainData';
import { unitDef } from './sim/unitData';
import { Renderer } from './render/renderer';
import { loadSprites } from './render/sprites';
import { createFlatTileArtist, createTileArtist } from './render/tileVisuals';
import { Renderer3D } from './render3d/renderer3d';
import { type CityBanners, createCityBanners } from './ui/cityBanners';
import { type CityPanel, createCityPanel } from './ui/cityPanel';
import { createGameControls } from './ui/controls';
import type { HoverInfo, MapView } from './ui/mapView';

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

const seedInput = requireElement<HTMLInputElement>('seed');
const sizeSelect = requireElement<HTMLSelectElement>('size');
const regenerateButton = requireElement<HTMLButtonElement>('regenerate');
const randomSeedButton = requireElement<HTMLButtonElement>('random-seed');
const endTurnButton = requireElement<HTMLButtonElement>('end-turn');
const foundCityButton = requireElement<HTMLButtonElement>('found-city');
const statusEl = requireElement<HTMLElement>('status');
const seatsEl = requireElement<HTMLElement>('seats');
const viewportEl = requireElement<HTMLDivElement>('viewport');
const bootEl = requireElement<HTMLElement>('boot');
const panelEl = requireElement<HTMLElement>('panel');
const infoEl = requireElement<HTMLElement>('info');
const hintEl = requireElement<HTMLElement>('hint');
const bannersEl = requireElement<HTMLElement>('banners');
const cityPanelEl = requireElement<HTMLElement>('city-panel');

const infoMap = requireElement<HTMLElement>('info-map');
const infoSeed = requireElement<HTMLElement>('info-seed');
const infoTerrain = requireElement<HTMLElement>('info-terrain');
const infoFeature = requireElement<HTMLElement>('info-feature');
const infoOffset = requireElement<HTMLElement>('info-offset');
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
 */
const PLAYERS: PlayerSpec[] = [
  { name: 'Crimson', color: '#e0484a', isHuman: true },
  { name: 'Teal', color: '#2fb0a8', isHuman: true },
];

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

function describeUnit(unit: Unit): string {
  const def = unitDef(unit.type);
  const marching = unit.path !== undefined && unit.path.length > 0 ? ' · marching' : '';
  return (
    `${def.name} · ${unit.hp}/${def.maxHp} hp · ` +
    `${unit.movesLeft}/${def.movement} mp${marching}`
  );
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
 * Built here rather than sitting in `index.html` because the 2D pages must keep
 * the panel they have. Shadows are exposed because they are the one setting that
 * can turn a smooth board into a slideshow on a weak GPU, and the player is the
 * only one who can tell whether they are worth it on their machine.
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
  panelEl.insertBefore(row, infoEl);

  const stats = document.createElement('p');
  stats.id = 'stats';
  stats.className = 'hint';
  panelEl.insertBefore(stats, hintEl);

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
        `[webciv 3d] ${s.tiles} tiles, ${s.instances} instances, ` +
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
    hintEl.innerHTML =
      'Click a unit to select · click a tile to move · click a city to open it · ' +
      'drag to pan · wheel to zoom · <kbd>B</kbd> founds a city · ' +
      '<kbd>Esc</kbd> closes · <kbd>Enter</kbd> ends the turn';
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

async function start(): Promise<void> {
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

    if (!hasEndedTurn(state, local.id)) {
      statusEl.textContent = `Turn ${state.turn} — ${local.name}`;
      statusEl.style.color = local.color;
      return;
    }
    const waiting = state.players.filter((player) => !hasEndedTurn(state, player.id));
    statusEl.textContent =
      waiting.length > 0
        ? `Turn ${state.turn} — Waiting: ${waiting.map((p) => p.name).join(', ')}`
        : `Turn ${state.turn} — resolving`;
    statusEl.style.color = '#9fb0c2';
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
   * The Found City button. Enabled by exactly the rule the reducer applies (see
   * `foundingError`), and titled with the reason it is not — a button that will
   * not work should say why before it is pressed, not after.
   */
  function updateFoundCity(): void {
    const blocker = controls.foundCityBlocker();
    const noUnit = blocker === undefined;
    foundCityButton.disabled = noUnit || blocker !== null;
    foundCityButton.title = noUnit
      ? 'Select a settler first'
      : (blocker ?? 'Found a city here (B)');
  }

  function updatePanel(selected: Unit | null, hover: HoverInfo | null): void {
    updateStatus();
    renderSeats();
    updateFoundCity();
    // Cities change on almost everything — founding, growth, production, a seat
    // change — so both city views are refreshed wherever the main panel is.
    banners.refresh();
    cityPanel.render();

    if (hover) {
      const described = describeTile(hover.tile);
      infoTerrain.textContent = described.terrain + (described.hills ? ' (hills)' : '');
      infoFeature.textContent = described.feature;
      infoOffset.textContent = `col ${hover.tile.col}, row ${hover.tile.row}`;
    } else {
      infoTerrain.textContent = '—';
      infoFeature.textContent = '—';
      infoOffset.textContent = '—';
    }

    infoUnit.textContent = selected ? describeUnit(selected) : '—';
  }

  // --- lifecycle ------------------------------------------------------------

  const controls = createGameControls({
    viewport: viewportEl,
    renderer,
    getGame: () => game,
    onUpdate: updatePanel,
  });

  /**
   * The two city views. Both are pure readers of the simulation plus one
   * command (the panel's `setCityProduction`), and both are declared after
   * `controls` because they ask it whose seat this is and which city is open.
   */
  const banners: CityBanners = createCityBanners({
    container: bannersEl,
    renderer,
    getGame: () => game,
    localPlayerId: () => controls.localPlayerId(),
    onOpenCity: (cityId) => controls.setOpenCity(cityId),
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

  function newGameFromControls(): void {
    game = createGame(currentConfig());
    renderer.setGameState(game.state);
    controls.refresh();
    updateMapInfo();
    updatePanel(null, null);
    report();
  }

  regenerateButton.addEventListener('click', newGameFromControls);
  sizeSelect.addEventListener('change', newGameFromControls);
  seedInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.stopPropagation();
      newGameFromControls();
    }
  });
  randomSeedButton.addEventListener('click', () => {
    // UI-side only: the simulation itself never calls Math.random().
    seedInput.value = String(Math.floor(Math.random() * 1_000_000));
    newGameFromControls();
  });

  endTurnButton.addEventListener('click', () => {
    controls.endTurn();
    updatePanel(null, renderer.getHover());
  });

  foundCityButton.addEventListener('click', () => {
    controls.foundCity();
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

start().catch((error: unknown) => {
  // A missing sprite or a dead WebGL context is a build problem, not a blank
  // page: say so where the player can see it.
  bootEl.classList.add('error');
  bootEl.textContent = error instanceof Error ? error.message : String(error);
  document.body.append(bootEl);
  throw error;
});
