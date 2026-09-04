/**
 * **The configuration panel, built by walking the sheet.**
 *
 * The arena page's one structural promise (ruled 2026-09-04: *"with all further
 * bot changes adding to this page"*): a knob added to `data/ai.json` shows up
 * here with **no edit to any file on this page**. That promise is only worth
 * anything if it is impossible to break by accident, so it is arranged to be
 * impossible: this module contains **no knob name at all**. It walks `AI`
 * (`knobsOf`), asks each leaf what shape it is, and renders a control per leaf in
 * the file's own order — a curated order or a per-knob label table would be a
 * list of knob names, and a list of knob names is exactly the thing a new knob
 * would fail to appear in. `test/ui/arenaPage.test.ts` pins both halves: no name
 * as a literal here, and every block of the *current* sheet on the panel.
 *
 * Its own module rather than part of `main.ts` for the same reason: `main.ts` has
 * a table of column heads and a run loop, and a rule that says "no knob name in
 * this file" has to be stated about a file where it can actually hold.
 *
 * What it hands back is an **edit list**, never a config: the page turns that
 * into a sparse sheet (`sheetOfEdits`), and the sheet is what a run carries.
 */

import { AI } from '../ai/aiConfig';
import {
  type Knob,
  type KnobEdit,
  blocksOf,
  editsOf,
  knobKey,
  knobLabel,
  knobsOf,
  printValue,
} from './knobs';

export interface KnobPanel {
  /** Every knob whose control differs from the data file, in the sheet's order. */
  edits(): KnobEdit[];
  /** Every control back to what `data/ai.json` says. */
  reset(): void;
}

/**
 * The knobs, walked out of the configuration the bot actually reads.
 *
 * `AI` is `data/ai.json` minus the persona sheets (see `aiConfig.ts`), which is
 * exactly the surface a persona is a sparse override *of* — so the panel edits
 * the base every seat inherits, and a seat whose persona pins a knob still wins
 * on that knob. That is the game's own precedence, not a second rule invented
 * for this page.
 */
export const KNOBS: Knob[] = knobsOf(AI);

/**
 * Renders every knob into `root`, and calls `onChange` whenever a box is typed
 * in — which is how the page keeps its marker and its reset button honest
 * without this module knowing either exists.
 */
export function buildKnobPanel(root: HTMLElement, onChange: () => void): KnobPanel {
  /** The inputs for one knob — one for a number, one per band for a row. */
  const inputs = new Map<string, HTMLInputElement[]>();
  /** The row element, so an edited knob is marked where the eye already is. */
  const rows = new Map<string, HTMLElement>();

  for (const block of blocksOf(KNOBS)) {
    const wrap = make('div', 'knob-group');
    const head = make('h3', undefined, block.name);
    head.append(make('span', 'knob-count', String(block.knobs.length)));
    wrap.append(head);
    for (const knob of block.knobs) wrap.append(knobRow(knob, inputs, rows, onChange));
    root.append(wrap);
  }

  /** What the panel says at one knob, or `null` when a box says nothing readable. */
  function readKnob(knob: Knob): number | number[] | null {
    const held = inputs.get(knobKey(knob.path)) ?? [];
    if (held.length === 0) return null;
    const read: number[] = [];
    for (const input of held) {
      if (input.value.trim() === '') return null;
      const parsed = Number(input.value);
      if (!Number.isFinite(parsed)) return null;
      read.push(parsed);
    }
    return knob.kind === 'number' ? read[0]! : read;
  }

  function edits(): KnobEdit[] {
    const found = editsOf(KNOBS, readKnob);
    const marked = new Set(found.map((edit) => knobKey(edit.knob.path)));
    for (const [key, row] of rows) row.classList.toggle('is-dirty', marked.has(key));
    return found;
  }

  function reset(): void {
    for (const knob of KNOBS) {
      const held = inputs.get(knobKey(knob.path)) ?? [];
      if (knob.kind === 'number') {
        if (held[0] !== undefined) held[0].value = String(knob.value as number);
      } else if (knob.kind === 'numbers') {
        const bands = knob.value as readonly number[];
        held.forEach((input, index) => {
          input.value = String(bands[index]);
        });
      }
    }
  }

  return { edits, reset };
}

function knobRow(
  knob: Knob,
  inputs: Map<string, HTMLInputElement[]>,
  rows: Map<string, HTMLElement>,
  onChange: () => void,
): HTMLElement {
  const key = knobKey(knob.path);
  const row = make('div', 'knob');
  const label = make('span', 'knob-name', knobLabel(knob));
  label.title = key;
  row.append(label);

  const held: HTMLInputElement[] = [];
  const values = make('span', 'knob-values');
  if (knob.kind === 'number') {
    values.append(numberInput(knob.value as number, held, onChange));
  } else if (knob.kind === 'numbers') {
    // One small box per band. An array is replaced wholesale in a sheet, so
    // editing one band emits all of them — which is what `PersonaOverride` means
    // by an array, and half a weight table is not a weight table.
    values.classList.add('is-row');
    for (const band of knob.value as readonly number[]) {
      values.append(numberInput(band, held, onChange));
    }
  } else if (knob.kind === 'strings') {
    // A roster of ids the simulation has to recognise. Shown, never typed into:
    // a free-text box that can spell an improvement wrong is worse than a
    // read-only row.
    values.append(make('span', 'knob-fixed', printValue(knob.value as readonly string[])));
  } else {
    // A leaf shape this panel has no control for. Said out loud rather than
    // silently omitted, so the panel is never quietly less than the file.
    values.append(make('span', 'knob-fixed', 'not a number — edit the file'));
  }
  row.append(values);

  inputs.set(key, held);
  rows.set(key, row);
  return row;
}

function numberInput(
  value: number,
  held: HTMLInputElement[],
  onChange: () => void,
): HTMLInputElement {
  const input = make<HTMLInputElement>('input');
  input.type = 'number';
  input.value = String(value);
  // The step follows the number already in the file: a share written 0.45 steps
  // in hundredths, a cap written 6 steps in ones. Nothing per-knob, so a new
  // fractional knob gets the right spinner on its own.
  input.step = String(Number.isInteger(value) ? 1 : 0.01);
  input.addEventListener('input', onChange);
  held.push(input);
  return input;
}

function make<T extends HTMLElement>(tag: string, className?: string, text?: string): T {
  const element = document.createElement(tag);
  if (className !== undefined) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element as T;
}
