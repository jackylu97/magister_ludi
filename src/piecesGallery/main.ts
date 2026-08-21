/**
 * Entry point for The Armory — the piece gallery.
 *
 * A second look-dev page beside `proto3d.html`, and the same bargain: it exists
 * to answer one question, and it reads the real thing to answer it. Here the
 * question is "do fifteen sculpted miniatures read as fifteen different units,
 * and do they read as one set?", and the only honest way to ask it is to line
 * the whole roster up at board scale, under the board's light, turning.
 *
 * All the rendering lives in `stage.ts`. This file is the chrome: the labels,
 * the two toggles, and the reduced-motion decision.
 */

import './style.css';

import { VIEW3D } from '../render3d/lookData';
import { UnitSprites } from '../render3d/sprites3d';

import { type GalleryStyle, PiecesStage } from './stage';

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

const canvas = requireElement<HTMLCanvasElement>('gl');
const labelLayer = requireElement<HTMLElement>('labels');
const statusEl = requireElement<HTMLElement>('status');
const spinButton = requireElement<HTMLButtonElement>('spin');

const stage = new PiecesStage(canvas);

// --- labels ----------------------------------------------------------------

/**
 * One absolutely-positioned label per cell, created once and moved on resize.
 *
 * Positions are recomputed only when the projection changes, not per frame: the
 * camera is fixed and the pieces turn *under* it, so a label that followed the
 * animation would be doing arithmetic to arrive at the same pixel sixty times a
 * second.
 */
const labels = stage.entries.map((entry) => {
  const element = document.createElement('div');
  element.className = 'label';
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = entry.name;
  const meta = document.createElement('span');
  meta.className = 'meta';
  meta.textContent = `${entry.cls} · ${entry.triangles} tri`;
  element.append(name, meta);
  labelLayer.append(element);
  return element;
});

function layoutLabels(): void {
  stage.entries.forEach((entry, index) => {
    const at = stage.labelPosition(entry);
    const element = labels[index]!;
    element.style.left = `${at.x}px`;
    element.style.top = `${at.y + 6}px`;
  });
}

function refreshStatus(extra = ''): void {
  const stats = stage.stats;
  statusEl.textContent =
    `${stage.entries.length} pieces · ${stats.triangles} tri · ${stats.draws} draws` +
    (extra ? `\n${extra}` : '');
}

stage.setLayoutListener(layoutLabels);
layoutLabels();
refreshStatus();

// --- toggles ---------------------------------------------------------------

function selectIn(group: Element, chosen: Element): void {
  for (const button of group.querySelectorAll('button')) {
    button.classList.toggle('is-on', button === chosen);
  }
}

for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-color]')) {
  button.addEventListener('click', () => {
    const name = button.dataset.color!;
    const color = VIEW3D.palette[name];
    if (color === undefined) return;
    stage.setColor(color);
    selectIn(button.parentElement!, button);
    refreshStatus();
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-style]')) {
  button.addEventListener('click', () => {
    stage.setStyle(button.dataset.style as GalleryStyle);
    selectIn(button.parentElement!, button);
    refreshStatus(spriteNote);
  });
}

spinButton.addEventListener('click', () => {
  const on = !spinButton.classList.contains('is-on');
  spinButton.classList.toggle('is-on', on);
  stage.setSpinning(on);
});

/**
 * Reduced motion means *no* turntable, not a slower one.
 *
 * The page is still perfectly usable static — the pieces are laid out at the
 * board's own angle, which is the angle that matters most — and dragging still
 * turns them, because that is a motion the reader asked for.
 */
const stillness = window.matchMedia?.('(prefers-reduced-motion: reduce)');
if (stillness?.matches) {
  stage.setSpinning(false);
  spinButton.classList.remove('is-on');
}

// --- drag to turn ----------------------------------------------------------

let dragging = false;
let lastX = 0;

canvas.addEventListener('pointerdown', (event) => {
  dragging = true;
  lastX = event.clientX;
  canvas.classList.add('is-dragging');
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  stage.drag(event.clientX - lastX);
  lastX = event.clientX;
});

for (const type of ['pointerup', 'pointercancel'] as const) {
  canvas.addEventListener(type, (event) => {
    dragging = false;
    canvas.classList.remove('is-dragging');
    canvas.releasePointerCapture?.(event.pointerId);
  });
}

window.addEventListener('resize', () => {
  stage.resize();
  layoutLabels();
});

// --- the standee comparison ------------------------------------------------

/**
 * The billboards, fetched once and in the background.
 *
 * Every file is optional (see `UnitSprites.load`), so a checkout with no art in
 * `public/` simply gets a Standees button that says so rather than a broken
 * page — which is the same fallback the game itself makes.
 */
let spriteNote = '';
void UnitSprites.load().then((sprites) => {
  if (!sprites.any) {
    const button = document.querySelector<HTMLButtonElement>('button[data-style="sprites"]');
    if (button) {
      button.disabled = true;
      button.title = 'No unit artwork found under public/sprites/units/';
    }
    spriteNote = 'no standee art found';
    sprites.dispose();
    return;
  }
  stage.setSprites(sprites);
  refreshStatus();
});
