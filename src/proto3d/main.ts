/**
 * Entry point for the 3D look-dev prototype.
 *
 * PROTOTYPE. This page exists to answer one question — "does WebCiv work as a
 * low-poly toon diorama?" — and nothing else. It reads the real simulation
 * (`createGame` on a real generated map with real starting units) because a
 * look judged on fake data is not judged at all: the whole risk of this art
 * direction lives in what the *generator* actually produces, in the long
 * ragged coastlines and the mountain chains and the tiles nobody would have
 * hand-placed.
 *
 * It deliberately has no interaction beyond camera and regenerate. Selection,
 * turns and hover would each need a picking scheme, and picking is a different
 * experiment.
 */

import './style.css';

import { MAPGEN_CONFIG, MAP_SIZE_NAMES, getMapSize } from '../sim/mapgen';
import { hashSeed } from '../sim/rng';
import { type Game, createGame } from '../sim/game';
import type { PlayerSpec } from '../sim/state';

import { BoardGeometry, buildBoard } from './board';
import { LOOK_DEFAULTS, PALETTE } from './palette';
import { Proto3DScene } from './scene';

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

const canvas = requireElement<HTMLCanvasElement>('gl');
const seedInput = requireElement<HTMLInputElement>('seed');
const sizeSelect = requireElement<HTMLSelectElement>('size');
const regenerateButton = requireElement<HTMLButtonElement>('regenerate');
const randomSeedButton = requireElement<HTMLButtonElement>('random-seed');
const shadowToggle = requireElement<HTMLInputElement>('shadows');
const statsEl = requireElement<HTMLElement>('stats');

const sliders = {
  lightAzimuth: requireElement<HTMLInputElement>('light-azimuth'),
  lightElevation: requireElement<HTMLInputElement>('light-elevation'),
  outline: requireElement<HTMLInputElement>('outline'),
  rampSteps: requireElement<HTMLInputElement>('ramp'),
  saturation: requireElement<HTMLInputElement>('saturation'),
};

// --- setup -----------------------------------------------------------------

for (const name of MAP_SIZE_NAMES) {
  const option = document.createElement('option');
  option.value = name;
  option.textContent = MAPGEN_CONFIG.sizes[name]!.label;
  sizeSelect.append(option);
}
// Duel by default: small enough to rebuild in a blink, which is what makes
// "hit regenerate twenty times and see if the look holds" a usable workflow.
sizeSelect.value = MAP_SIZE_NAMES.includes('duel') ? 'duel' : MAP_SIZE_NAMES[0]!;

const PLAYERS: PlayerSpec[] = [
  { name: 'Crimson', color: `#${PALETTE.crimson.toString(16).padStart(6, '0')}`, isHuman: true },
  { name: 'Teal', color: `#${PALETTE.teal.toString(16).padStart(6, '0')}` },
];

const scene = new Proto3DScene(canvas);
const geometry = new BoardGeometry();
let game: Game | null = null;
let lastSizeName = '';

/** Word seeds are allowed, exactly as on the main page. */
function readSeed(): number {
  const raw = seedInput.value.trim();
  if (raw === '') return 1;
  const numeric = Number(raw);
  return Number.isFinite(numeric) && /^-?\d+$/.test(raw) ? numeric | 0 : hashSeed(raw);
}

function rebuild(): void {
  const sizeName = sizeSelect.value;
  const started = performance.now();
  game = createGame({ seed: readSeed(), sizeName, players: PLAYERS });
  const generated = performance.now();

  const board = buildBoard(game.state, geometry, scene.materials, shadowToggle.checked);
  const built = performance.now();

  // Refit only when the board changed shape. Regenerating at the same size
  // keeps the camera where it was, which is the only way to compare two seeds.
  scene.setBoard(board, sizeName !== lastSizeName);
  lastSizeName = sizeName;

  const size = getMapSize(sizeName);
  const stats = scene.stats;
  statsEl.textContent =
    `${size.width}x${size.height} · ${stats.tiles} tiles · ${stats.draws} draws\n` +
    `sim ${(generated - started).toFixed(0)}ms · build ${(built - generated).toFixed(0)}ms`;
}

// --- look-dev sliders ------------------------------------------------------

function readLook(): void {
  scene.setLook({
    lightAzimuth: Number(sliders.lightAzimuth.value),
    lightElevation: Number(sliders.lightElevation.value),
    outline: Number(sliders.outline.value) / 1000,
    rampSteps: Number(sliders.rampSteps.value),
    saturation: Number(sliders.saturation.value) / 100,
    shadows: shadowToggle.checked,
  });
  for (const input of Object.values(sliders)) {
    const output = document.getElementById(`${input.id}-value`);
    if (output) output.textContent = input.value;
  }
}

sliders.lightAzimuth.value = String(LOOK_DEFAULTS.lightAzimuth);
sliders.lightElevation.value = String(LOOK_DEFAULTS.lightElevation);
sliders.outline.value = String(Math.round(LOOK_DEFAULTS.outline * 1000));
sliders.rampSteps.value = String(LOOK_DEFAULTS.rampSteps);
sliders.saturation.value = String(Math.round(LOOK_DEFAULTS.saturation * 100));
shadowToggle.checked = LOOK_DEFAULTS.shadows;

for (const input of Object.values(sliders)) {
  input.addEventListener('input', readLook);
}
shadowToggle.addEventListener('change', () => {
  readLook();
  // castShadow/receiveShadow are baked into the instanced meshes at build time,
  // so the toggle has to go through a rebuild to take full effect.
  rebuild();
});

// --- camera input ----------------------------------------------------------

let dragging = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener('pointerdown', (event) => {
  dragging = true;
  lastX = event.clientX;
  lastY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  scene.view.pan(event.clientX - lastX, event.clientY - lastY);
  lastX = event.clientX;
  lastY = event.clientY;
  scene.invalidate();
});

function endDrag(event: PointerEvent): void {
  if (!dragging) return;
  dragging = false;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

canvas.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    scene.view.zoom(event.deltaY);
    scene.invalidate();
  },
  { passive: false },
);

// --- page ------------------------------------------------------------------

function resize(): void {
  scene.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

regenerateButton.addEventListener('click', rebuild);
sizeSelect.addEventListener('change', rebuild);
randomSeedButton.addEventListener('click', () => {
  seedInput.value = String(Math.floor(Math.random() * 100000));
  rebuild();
});
seedInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') rebuild();
});

resize();
readLook();
rebuild();
