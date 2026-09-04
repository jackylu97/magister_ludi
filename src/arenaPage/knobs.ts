/**
 * **The bot's tuning sheet, read as a list of knobs — by walking it, never by
 * listing it.**
 *
 * The arena page's panel is generated from whatever `data/ai.json` happens to
 * hold: one control per leaf, in the file's own order, grouped by the block the
 * leaf lives in. That is the whole requirement behind the page (the ruling of
 * 2026-09-04: *"with all further bot changes adding to this page"*) — a knob
 * added to the JSON tomorrow appears on the panel with **no edit to any page
 * file**, because no page file knows the name of a single knob.
 *
 * Which is why this module exists at all rather than the walk living in the
 * panel: everything here is pure over a plain object, so the promise can be
 * tested (`test/ui/arenaPage.test.ts`) without a DOM, and the panel is left with
 * nothing but `document.createElement`.
 *
 * Three leaf shapes, which is all `AiConfig` has:
 *
 *   · a **number** — one input;
 *   · an **array of numbers** — the age-banded weight rows, one small input per
 *     band. An array replaces wholesale in a sheet (`PersonaOverride`'s rule), so
 *     editing one band emits the whole row;
 *   · an **array of strings** — `workers.improvements`, the roster of what a
 *     spade may lay. Shown and not editable: its entries are improvement ids the
 *     simulation has to recognise, and a free-text box that can spell one wrong
 *     is a worse thing than a read-only row.
 *
 * A fourth shape appearing in the JSON (a boolean, say) is a **design decision**
 * and lands here as one more case, deliberately — the same bargain
 * `statecraft.ts` makes about a card shape. Until then an unknown leaf is
 * carried as `unreadable` rather than dropped, so the panel can say out loud that
 * it cannot show one instead of silently omitting it.
 */

import type { PersonaOverride } from '../ai/aiConfig';

export type KnobKind = 'number' | 'numbers' | 'strings' | 'unreadable';

/** One leaf of the configuration: where it lives, what shape it is, what it says. */
export interface Knob {
  /** The path from the sheet's root, e.g. `['weights', 'food']`. */
  path: readonly string[];
  kind: KnobKind;
  /** The value in `data/ai.json`. Never mutated; the panel copies it. */
  value: number | readonly number[] | readonly string[] | null;
}

/** One top-level block of the sheet — `weights`, `military`, `solvency`. */
export interface KnobBlock {
  name: string;
  knobs: Knob[];
}

/** A knob whose panel value differs from the data file's. */
export interface KnobEdit {
  knob: Knob;
  /** What `data/ai.json` says. */
  from: number | readonly number[];
  /** What the panel says. */
  to: number | readonly number[];
}

/** The lookup key for a knob, and the string a designer greps the JSON for. */
export function knobKey(path: readonly string[]): string {
  return path.join('.');
}

/**
 * The label a row wears: the path **below its block**, not just the leaf.
 *
 * `mapgenPage`'s rule, for its reason — a row labelled `food` in a panel that
 * also has a `food` two blocks down is a row nobody can search the file for, and
 * `yieldWeights.food` is the string that is actually in `data/ai.json`.
 */
export function knobLabel(knob: Knob): string {
  return knob.path.length > 1 ? knob.path.slice(1).join('.') : knob.path.join('.');
}

/**
 * Every leaf of `config`, depth first, in the object's own key order.
 *
 * Key order is the file's order (JSON parses in document order), so the panel
 * reads down in the same sequence as the JSON it is tuning — which is the only
 * ordering that never needs maintaining and never goes stale. There is
 * deliberately no curated order and no per-knob label table: either would be a
 * list of knob names in a page file, and a list of knob names in a page file is
 * exactly the thing a new knob would fail to appear in.
 */
export function knobsOf(config: object): Knob[] {
  const found: Knob[] = [];
  walk(config, [], found);
  return found;
}

function walk(node: object, path: readonly string[], into: Knob[]): void {
  for (const [key, value] of Object.entries(node)) {
    const here = [...path, key];
    if (typeof value === 'number') {
      into.push({ path: here, kind: 'number', value });
    } else if (Array.isArray(value)) {
      into.push({ path: here, ...arrayKnob(value) });
    } else if (typeof value === 'object' && value !== null) {
      walk(value as object, here, into);
    } else {
      into.push({ path: here, kind: 'unreadable', value: null });
    }
  }
}

function arrayKnob(value: readonly unknown[]): { kind: KnobKind; value: Knob['value'] } {
  if (value.every((entry) => typeof entry === 'number')) {
    return { kind: 'numbers', value: value as readonly number[] };
  }
  if (value.every((entry) => typeof entry === 'string')) {
    return { kind: 'strings', value: value as readonly string[] };
  }
  return { kind: 'unreadable', value: null };
}

/**
 * The knobs grouped by the block they live in, blocks in the file's order.
 *
 * One level of grouping and not more: a nested block (`site.yieldWeights`,
 * `military.mix`) keeps its rows inside its top-level block and says where it
 * came from in the row's own label. Nesting fieldsets to arbitrary depth would
 * make the panel's shape depend on the JSON's shape, and the panel has to stay
 * readable for a sheet nobody has written yet.
 */
export function blocksOf(knobs: readonly Knob[]): KnobBlock[] {
  const blocks: KnobBlock[] = [];
  const byName = new Map<string, KnobBlock>();
  for (const knob of knobs) {
    const name = knob.path[0] ?? '';
    let block = byName.get(name);
    if (block === undefined) {
      block = { name, knobs: [] };
      byName.set(name, block);
      blocks.push(block);
    }
    block.knobs.push(knob);
  }
  return blocks;
}

/** Are two readings of one knob the same number, or the same row of numbers? */
export function sameValue(
  a: number | readonly number[],
  b: number | readonly number[],
): boolean {
  if (typeof a === 'number' || typeof b === 'number') return a === b;
  return a.length === b.length && a.every((entry, index) => entry === b[index]);
}

/**
 * Every knob whose panel reading differs from the data file's.
 *
 * `read` is how the caller says what its controls currently hold — the panel
 * hands over a lookup into its inputs, a test hands over a function. `null` means
 * *the row says nothing readable* (blank, or mistyped), and such a row counts as
 * un-edited rather than being handed to the bot as a NaN, which is the
 * `mapgenPage` rule for the same situation.
 */
export function editsOf(
  knobs: readonly Knob[],
  read: (knob: Knob) => number | readonly number[] | null,
): KnobEdit[] {
  const edits: KnobEdit[] = [];
  for (const knob of knobs) {
    if (knob.kind !== 'number' && knob.kind !== 'numbers') continue;
    const to = read(knob);
    if (to === null) continue;
    const from = knob.value as number | readonly number[];
    if (sameValue(from, to)) continue;
    edits.push({ knob, from, to });
  }
  return edits;
}

/**
 * The panel as a **sparse** override sheet: only the knobs that differ.
 *
 * Sparseness is the contract rather than an optimisation, and it is
 * `mapgenPage`'s argument one system over: a sheet that restated every default
 * would freeze every number it copied, so a later retune of `data/ai.json` would
 * stop reaching a run made from it. What comes back is shaped exactly like a
 * persona override — same type, same merge — because it is folded by the same
 * `deepMerge` (`setAiTuning`).
 */
export function sheetOfEdits(edits: readonly KnobEdit[]): PersonaOverride | null {
  if (edits.length === 0) return null;
  const sheet: Record<string, unknown> = {};
  for (const edit of edits) {
    const path = edit.knob.path;
    let node = sheet;
    for (let i = 0; i < path.length - 1; i++) {
      const step = path[i]!;
      node[step] ??= {};
      node = node[step] as Record<string, unknown>;
    }
    // An array is copied rather than aliased: the sheet crosses a worker
    // boundary and the panel keeps editing its own copy behind it.
    node[path[path.length - 1]!] = Array.isArray(edit.to) ? [...edit.to] : edit.to;
  }
  return sheet as PersonaOverride;
}

/** One edit, printed the way the marker lists it: `weights.food 7,6,5,4 → 9,6,5,4`. */
export function describeEdit(edit: KnobEdit): string {
  return `${knobKey(edit.knob.path)} ${printValue(edit.from)} → ${printValue(edit.to)}`;
}

export function printValue(value: number | readonly number[] | readonly string[]): string {
  return typeof value === 'number' ? String(value) : value.join(', ');
}
