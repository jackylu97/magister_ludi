/**
 * **The age plate** (`src/ui/agePlate.ts`): the plate on the ribbon with any of
 * the twelve age paintings, the opening plate for age I, and the lapis page a
 * plate falls back to when it has no painting. Drawn by the page builder the
 * game uses (`agePlatePage`), with sample deeds, so a change to the plate shows
 * here as it shows in the game.
 *
 * Below the plate, the twelve paintings side by side, a set to a row. A game
 * shows one set, picked from its seed (`agePaintings.ts`).
 */

import { BELIEF_IDS, beliefDef } from '../sim/religionData';
import { AGE_PAINTING_SETS, type AgePaintingSet, agePaintingUrl } from '../ui/agePaintings';
import { type AgeDeed, type AgePlateReading, ageLineWords, agePlatePage } from '../ui/agePlate';
import { ageTitle, eraNumeralWord } from '../ui/figures';
import { block, controls, element, select } from './sheet';

/** What each set is called on this page. */
const SET_NAMES: Readonly<Record<AgePaintingSet, string>> = {
  form: 'landscapes (form)',
  still: 'still lifes (still)',
  abstract: 'abstracts (abstract)',
};

/** Sample deeds: every deed the plate can print, each at a plausible length. */
const DEEDS: AgeDeed[] = [
  { mark: 'expansionist', value: '7', label: 'towns' },
  { mark: 'scientific', value: 'Bronze Working', label: 'first tech' },
  { mark: 'dominion', value: '53 · 16', label: 'won · lost' },
  { mark: 'devotion', value: BELIEF_IDS.length > 0 ? beliefDef(BELIEF_IDS[0]!).name : 'a god', label: 'god named' },
  { mark: 'generic', value: '10', label: 'orders' },
];

export function drawAgePlate(into: HTMLElement): void {
  const page = block(
    into,
    'The age plate · src/ui/agePlate.ts',
    'The world’s age turns over: the age’s painting on the ribbon over the dimmed board, with the numeral, the name and the line on its foot at the left, and the deeds and Continue at the right. The deeds take at most two rows, and a deed that does not fit is not drawn. Age I is the opening plate a new game shows once, with no deeds. With no painting, or one that does not load, the plate is the full-screen lapis page.',
  );
  const knobs = controls(page);
  const stage = element('div', 'age-plate-overlay ip-gallery-plate');
  let set: AgePaintingSet | 'none' = 'form';
  let age = 2;

  function draw(): void {
    const reading: AgePlateReading = {
      numeral: eraNumeralWord(age),
      name: ageTitle(age),
      line: ageLineWords(age, age > 1),
      deeds: age > 1 ? DEEDS : [],
      painting: set === 'none' ? null : agePaintingUrl(set, age),
    };
    // The game's fallback: a painting that does not load gives the lapis page.
    stage.replaceChildren(agePlatePage(reading, () => {}, () => stage.replaceChildren(agePlatePage({ ...reading, painting: null }, () => {}))));
  }

  select(
    knobs,
    'set',
    [...AGE_PAINTING_SETS.map((id) => [id, SET_NAMES[id]] as const), ['none', 'no painting (the lapis page)'] as const],
    set,
    (value) => {
      set = value as AgePaintingSet | 'none';
      draw();
    },
  );
  select(
    knobs,
    'age',
    [
      ['1', 'I, the opening plate'],
      ['2', 'II'],
      ['3', 'III'],
      ['4', 'IV'],
    ],
    String(age),
    (value) => {
      age = Number(value);
      draw();
    },
  );
  draw();
  page.append(stage);

  const shelf = element('div', 'age-gallery-shelf');
  for (const id of AGE_PAINTING_SETS) {
    for (const at of [1, 2, 3, 4]) {
      const url = agePaintingUrl(id, at);
      const cell = element('figure', 'age-gallery-painting');
      if (url !== null) {
        const image = element('img');
        image.src = url;
        image.alt = `${SET_NAMES[id]}, age ${eraNumeralWord(at)}`;
        image.loading = 'lazy';
        cell.append(image);
      }
      cell.append(element('figcaption', undefined, `${id}${at}`));
      shelf.append(cell);
    }
  }
  page.append(shelf);
}
