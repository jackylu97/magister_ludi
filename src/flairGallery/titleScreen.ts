/**
 * The title screen (frame a8 of the Quiet Table boards), in a stall.
 *
 * The sample uses the game's own classes (`src/ui/titleScreen.css`) and the
 * game's own builder for the painting, the seam and the star
 * (`dressTitlePainting` in `src/ui/titlePainting.ts`). So it shows the stand-in
 * painting today, and the title painting once the file is in
 * `public/art/splash/title/`.
 *
 * Two knobs:
 * - the painting's height, which on the title screen follows the window;
 * - the head: the painting, or the banner the page falls back to when no
 *   picture loads.
 *
 * The buttons and the recent worlds are samples with no action. The words are
 * the page's own; the two worlds are made up for the picture.
 */

import { dressTitlePainting } from '../ui/titlePainting';
import { block, button, controls, element, slider } from './sheet';

/** The two sample worlds of the recent worlds panel: a leader and a turn. */
const SAMPLE_WORLDS: readonly (readonly [string, number])[] = [
  ['Pachacuti', 101],
  ['Emperor Taizong', 72],
];

/** One plain button of the title row, with its key hint when it has one. */
function titleButton(label: string, key: string | null, primary = false): HTMLButtonElement {
  const node = element('button', primary ? 'btn btn-primary title-button' : 'btn title-button', label);
  node.type = 'button';
  if (key !== null) {
    const hint = element('kbd', 'title-key', key);
    hint.setAttribute('aria-hidden', 'true');
    node.append(' ', hint);
  }
  return node;
}

/** The banner the title screen falls back to, as `index.html` writes it. */
function banner(): HTMLElement {
  const head = element('div', 'marquee marquee-poster title-banner');
  const art = element('div', 'marquee-art');
  const plate = document.createElement('img');
  plate.className = 'marquee-plate';
  plate.src = '/art/frontispiece-small.jpg';
  plate.alt = '';
  const name = element('div', 'marquee-name');
  const title = element('p', 'marquee-title', 'Magister ');
  title.append(element('em', undefined, 'Ludi'));
  name.append(title, element('span', 'marquee-rule-star'));
  art.append(plate, element('div', 'marquee-frame'), name, element('span', 'marquee-stamp', 'a game for the ages'));
  head.append(art);
  return head;
}

export function drawTitleScreen(into: HTMLElement): void {
  const root = block(
    into,
    'The title screen',
    'The painting is the full width of the window, and the title is on its sky. The ribbon is the seam between the painting and the paper. Until the title painting exists, the stand-in is the painted town of the earlier banner. If no picture loads, the page shows the banner it had before.',
  );

  const sample = element('div', 'title-sample');
  sample.dataset.titleArt = 'painting';
  const screen = element('div', 'title-screen');

  const head = element('div', 'title-head');
  const name = element('div', 'title-name');
  const word = element('p', 'title-word', 'Magister ');
  word.append(element('em', undefined, 'Ludi'));
  const ornament = element('span', 'title-ornament');
  ornament.append(element('i'), element('b'), element('i'));
  name.append(word, ornament, element('p', 'title-tagline', 'a game for the ages'));
  head.append(element('div', 'title-fade'), name);

  const seam = element('div', 'title-seam');

  const paper = element('div', 'title-paper');
  const menu = element('div', 'title-menu');
  const resume = titleButton('Continue', null);
  const sub = element('span', 'title-button-sub', 'Pachacuti · turn ');
  sub.append(element('span', 'title-figure', '101'));
  resume.append(' ', sub);
  menu.append(
    titleButton('New game', 'N', true),
    resume,
    titleButton('Load a game', 'L'),
    titleButton('Compendium', '?'),
  );
  const worlds = element('section', 'title-worlds');
  const rows = element('div', 'title-worlds-rows');
  for (const [who, turn] of SAMPLE_WORLDS) {
    const row = element('button', 'landing-shelf-row');
    row.type = 'button';
    row.append(element('span', 'landing-shelf-who', who), element('span', 'landing-shelf-when', `turn ${turn}`));
    rows.append(row);
  }
  worlds.append(element('p', 'eyebrow', 'Recent worlds'), rows);
  paper.append(menu, element('p', 'title-later', 'Multiplayer and settings come later.'), worlds);

  screen.append(head, banner(), seam, paper);
  sample.append(screen);

  const knobs = controls(root);
  slider(
    knobs,
    'Painting height',
    { min: 200, max: 520, step: 10, value: 340 },
    (value) => `${value}px`,
    (value) => sample.style.setProperty('--title-painting-h', `${value}px`),
  );
  button(knobs, 'Painting', () => {
    sample.dataset.titleArt = 'painting';
  });
  button(knobs, 'Fallback banner', () => {
    sample.dataset.titleArt = 'banner';
  });

  root.append(sample);
  dressTitlePainting({ root: sample, head, seam });
}
