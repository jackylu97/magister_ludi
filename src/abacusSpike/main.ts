/**
 * Entry point for The Abacus — the victory-scoreboard look-dev page.
 *
 * The third look-dev page beside `proto3d.html` and `pieces.html`, and the same
 * bargain: one question, answered with the real renderer. The question here was
 * whether *scoring* can be a physical event. The board already knew how to be a
 * place; the score was still a number in a bar, and a number cannot be knocked
 * into a stack.
 *
 * The answer came back yes, so the object itself moved into the renderer
 * (`src/render3d/abacus3d.ts`) and into the game as a screen
 * (`src/ui/abacusScreen.ts`). This page stayed, as the bench it is judged on:
 * the same stage, driven by the demo buttons the *game* must not have. Earning a
 * bead is something the simulation will do at M11 — a button that fakes it
 * belongs here, where faking things is the job, and nowhere else.
 *
 * So this file is only chrome now: the earn buttons, the family cycle, the DOM
 * labels, and the reduced-motion decision.
 *
 * The player names are Hesse's, which is not a joke — the abacus *is* the glass
 * bead game's scoreboard, and a spike that reads as belonging to the product is
 * a spike that gets judged on its look rather than on its placeholder text.
 */

import './style.css';

import {
  AbacusStage,
  type AbacusPlayer,
  Clack,
  FAMILIES,
  type FamilyId,
  cssHex,
} from '../render3d/abacus3d';
import { VIEW3D } from '../render3d/lookData';

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

const canvas = requireElement<HTMLCanvasElement>('gl');
const labelLayer = requireElement<HTMLElement>('labels');
const earnRow = requireElement<HTMLElement>('earn');
const familyButton = requireElement<HTMLButtonElement>('family');
const spinButton = requireElement<HTMLButtonElement>('spin');
const soundButton = requireElement<HTMLButtonElement>('sound');
const statusEl = requireElement<HTMLElement>('status');

const PLAYERS: readonly AbacusPlayer[] = [
  { name: 'Josef Knecht', color: VIEW3D.palette.crimson! },
  { name: 'Plinio Designori', color: VIEW3D.palette.teal! },
];

const stage = new AbacusStage(canvas, PLAYERS);
const clack = new Clack();

/**
 * A board mid-game rather than an empty one.
 *
 * An abacus with nothing slid over is a rack of blank beads, and the one thing
 * the page has to show at first glance is the *split* — a coloured cluster at
 * the left, bone at the right, and a gap between them that means something.
 */
stage.seed(0, ['conquest', 'conquest', 'commerce', 'culture']);
stage.seed(1, ['philosophy', 'culture']);

// --- labels ----------------------------------------------------------------

/**
 * Two DOM labels per rod: the name at the earned end, the tally at the waiting
 * end.
 *
 * DOM rather than texture for the Armory's reasons — crisp at any device pixel
 * ratio, selectable, and typeset in the interface's own faces. The name is
 * Fraunces because that is the face this product names things in; the tally is
 * mono and tabular because it is a count, and a count that reflows as it climbs
 * is a count nobody trusts.
 */
interface RodLabels {
  name: HTMLElement;
  tally: HTMLElement;
  count: HTMLElement;
}

const labels: RodLabels[] = PLAYERS.map((player) => {
  const name = document.createElement('div');
  name.className = 'label name';
  const swatch = document.createElement('span');
  swatch.className = 'swatch';
  swatch.style.background = cssHex(player.color);
  const text = document.createElement('span');
  text.textContent = player.name;
  name.append(swatch, text);

  const tally = document.createElement('div');
  tally.className = 'label tally';
  const count = document.createElement('span');
  count.className = 'count';
  const total = document.createElement('span');
  total.className = 'total';
  total.textContent = ` / ${stage.beadsPerRod}`;
  tally.append(count, total);

  labelLayer.append(name, tally);
  return { name, tally, count };
});

function layoutLabels(): void {
  PLAYERS.forEach((_, index) => {
    const place = stage.labelPlacement(index);
    const entry = labels[index]!;
    entry.name.style.left = `${place.left.x}px`;
    entry.name.style.top = `${place.left.y}px`;
    entry.tally.style.left = `${place.right.x}px`;
    entry.tally.style.top = `${place.right.y}px`;
    entry.name.style.opacity = `${place.opacity}`;
    entry.tally.style.opacity = `${place.opacity}`;
  });
}

function refreshTallies(): void {
  PLAYERS.forEach((_, index) => {
    labels[index]!.count.textContent = `${stage.earnedCount(index)}`;
  });
}

stage.onFrame = layoutLabels;
refreshTallies();

// --- the score moment ------------------------------------------------------

let nextFamily: FamilyId = 'culture';

function paintFamilyButton(): void {
  const family = FAMILIES.find((entry) => entry.id === nextFamily)!;
  familyButton.replaceChildren();
  const swatch = document.createElement('span');
  swatch.className = 'swatch';
  swatch.style.background = cssHex(family.color);
  const text = document.createElement('span');
  text.textContent = `Next bead · ${family.name}`;
  familyButton.append(swatch, text);
}

function refreshStatus(note = ''): void {
  const stats = stage.stats;
  statusEl.textContent =
    `${PLAYERS.length} rods · ${stage.beadsPerRod} beads each · ` +
    `${stats.triangles} tri · ${stats.draws} draws` +
    (note ? `\n${note}` : '');
}

/** One button per player, which is the whole interaction. */
const earnButtons = PLAYERS.map((player, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'earn';
  const swatch = document.createElement('span');
  swatch.className = 'swatch';
  swatch.style.background = cssHex(player.color);
  const text = document.createElement('span');
  const words = player.name.split(' ');
  text.textContent = `Earn a bead · ${words[words.length - 1]}`;
  button.append(swatch, text);
  button.addEventListener('click', () => {
    // Armed from inside the gesture, every time: the first click is what is
    // allowed to open an audio device, and later clicks resume one the browser
    // suspended while the tab was in the background.
    clack.arm();
    const scored = stage.earn(index, nextFamily);
    refreshTallies();
    if (!scored) {
      button.disabled = true;
      refreshStatus(`${player.name}'s rod is full — that is the victory line`);
    }
  });
  earnRow.append(button);
  return button;
});

stage.onStrike = () => clack.play();

familyButton.addEventListener('click', () => {
  const at = FAMILIES.findIndex((entry) => entry.id === nextFamily);
  nextFamily = FAMILIES[(at + 1) % FAMILIES.length]!.id;
  paintFamilyButton();
});

paintFamilyButton();
refreshStatus();

// --- motion ----------------------------------------------------------------

spinButton.addEventListener('click', () => {
  const on = !spinButton.classList.contains('is-on');
  spinButton.classList.toggle('is-on', on);
  stage.setSpinning(on);
});

soundButton.addEventListener('click', () => {
  const on = !soundButton.classList.contains('is-on');
  soundButton.classList.toggle('is-on', on);
  clack.setEnabled(on);
  if (on) clack.arm();
});

/**
 * Reduced motion stops the idle sway outright rather than slowing it.
 *
 * The object is entirely readable still — it is framed at the angle it is meant
 * to be judged from — and the bead slide *stays*, because that motion is the
 * direct result of a button the reader pressed. Reduced motion means no
 * ambient movement, not no feedback.
 */
const stillness = window.matchMedia?.('(prefers-reduced-motion: reduce)');
if (stillness?.matches) {
  stage.setSway(false);
  refreshStatus('reduced motion: idle sway off, bead slide kept');
}

window.addEventListener('resize', () => {
  stage.resize();
  layoutLabels();
});

// Keep the roster honest if the seed ever fills a rod outright.
earnButtons.forEach((button, index) => {
  button.disabled = stage.earnedCount(index) >= stage.beadsPerRod;
});
