/**
 * The Abacus in the cabinet (`flair.html?review=abacus`).
 *
 * The real stage (`AbacusStage`, look B "Walnut and gilt", 2026-11-19) at a
 * three-seat table, with the controls that show each of its moments: a bead
 * slides on, the golden bead lights and slides home, and the plaque takes each
 * age. It is a focused review rather than a stall on the full sheet, because it
 * needs a WebGL context of its own and the full sheet has several already.
 *
 * The number of places on a rod and the three pages the game shows the frame on
 * are on the Abacus's own look-dev page (`abacus.html`), which this links to.
 */

import { AbacusStage, Clack, FAMILIES, type FamilyId, cssHex } from '../render3d/abacus3d';
import { VIEW3D } from '../render3d/lookData';
import { checkbox, controls, element, select } from './sheet';

const SEATS = [
  { name: 'Pachacuti', color: VIEW3D.palette.crimson!, seed: ['commerce', 'philosophy', 'conquest', 'culture'] },
  { name: 'Hypatia', color: VIEW3D.palette.bone!, seed: ['philosophy', 'culture'] },
  { name: 'Joan of Arc', color: VIEW3D.palette.lapis!, seed: ['conquest', 'conquest', 'commerce', 'philosophy', 'culture'] },
] as const;

export function drawAbacus(root: HTMLElement): void {
  const box = element('div', 'abacus-stall');
  const canvas = element('canvas', 'abacus-canvas');
  const layer = element('div', 'abacus-labels');
  layer.setAttribute('aria-hidden', 'true');
  box.append(canvas, layer);
  root.append(box);

  const stage = new AbacusStage(canvas, SEATS.map((seat) => ({ name: seat.name, color: seat.color })), { age: 2 });
  const reset = (): void => SEATS.forEach((seat, index) => stage.seed(index, seat.seed as readonly FamilyId[]));
  reset();

  // The names beside the rods, as the game's pages hang them.
  const labels = SEATS.map((seat) => {
    const name = element('div', 'abacus-label is-name');
    const swatch = element('span', 'abacus-swatch');
    swatch.style.background = cssHex(seat.color);
    name.append(swatch, element('span', undefined, seat.name));
    layer.append(name);
    return name;
  });
  stage.onFrame = () => {
    labels.forEach((name, index) => {
      const place = stage.labelPlacement(index);
      name.style.left = `${place.left.x}px`;
      name.style.top = `${place.left.y}px`;
      name.style.opacity = `${place.opacity}`;
    });
  };
  const clack = new Clack();
  stage.onStrike = () => clack.play();
  window.addEventListener('resize', () => stage.resize());

  const row = controls(root);
  let next = 0;
  const slide = element('button', undefined, 'Slide a bead onto the top rod');
  slide.type = 'button';
  slide.addEventListener('click', () => {
    clack.arm();
    stage.earn(0, FAMILIES[next % FAMILIES.length]!.id);
    next += 1;
  });
  const golden = element('button', undefined, 'Light the golden bead');
  golden.type = 'button';
  golden.addEventListener('click', () => {
    clack.arm();
    if (stage.lightGolden(0, 0.6)) window.setTimeout(() => stage.slideGolden(), 700);
  });
  const again = element('button', undefined, 'Reset');
  again.type = 'button';
  again.addEventListener('click', reset);
  row.append(slide, golden, again);
  select(
    row,
    'Age on the plaque',
    [
      ['1', 'I'],
      ['2', 'II'],
      ['3', 'III'],
      ['4', 'IV'],
      ['0', 'none'],
    ],
    '2',
    (value) => stage.setAge(value === '0' ? null : Number(value)),
  );
  checkbox(row, 'Idle turn', true, (on) => stage.setSway(on));

  const more = element('a', undefined, 'The look-dev page: 8 places, and the bead page, the Abacus screen and the Opus close');
  more.href = '/abacus.html';
  root.append(more);
}
