/**
 * Typed access to `data/malices.json` — **the deck a missed wager deals**
 * (`docs/wager.md` §4, batch G3).
 *
 * A malice is an Order with a bad face. The user's ruling of 2026-09-08: *"the
 * malice be a card that must remain slotted in your government with a malice
 * effect."* So it sits in one of your chairs, it cannot be taken out, and it pays
 * its effect through `liveEffects` exactly as the Order beside it does — the same
 * vocabulary, the same describer, the same Compendium page, the Ledger crediting
 * its lines to it by name. **It costs you the chair**, which is the sharper half
 * of the punishment: a realm with eight chairs is playing with seven.
 *
 * Why it is a table of its own rather than a flag on an Order
 * ----------------------------------------------------------
 * An Order is *drafted*, held, moved and benched; a malice is *dealt to you*,
 * seated by the world and never moved. Nothing about the two is the same except
 * the vocabulary they are written in, and the vocabulary is exactly what a row
 * carries here — `CardEffect`, read by the one evaluator, so **a new malice is a
 * JSON row**. A `malice: true` on an Order row would have put a card that can
 * never be drafted into every pool, every hand and every screen that lists a
 * collection, guarded by a flag twelve readers would have had to remember.
 *
 * What a row may say
 * ------------------
 * One effect, in the vocabulary the evaluator already reads (§4's table is
 * twelve rows and twelve effects). A malice that wanted a shape the vocabulary
 * lacks would be **deferred and annotated**, never bent into a near-fit — the
 * discipline the cards, the beliefs and the Triumphs all keep — and the register
 * (`test/sim/malices.test.ts`) is what says so: every kind here is a kind some
 * live card already pays, and no row writes a figure into its prose.
 *
 * The three fields that are not effects
 * -------------------------------------
 *   · **`chair`** is the flavour of chair it takes — the Orders' own `SlotType`,
 *     because it is seated in the Orders' own chairs and a fourth word for the
 *     same three places would be a second spread to keep in step.
 *   · **`voice`** is the thread it bites, in the beads' families, and it is
 *     **optional**: The Short Draft and The Heavy Writ bite the deck itself
 *     rather than any one voice, which §4's own table writes as a dash. It is
 *     presentation — the Compendium's eyebrow and the worksheet's column — and
 *     nothing in the simulation branches on it.
 *   · **`note`** is what it does in a first-time player's words (hard rule 7),
 *     for the Compendium's page and the chair's own tooltip.
 *
 * The *seating* — which chair, for how long, how they stack — is not here. It is
 * `statecraft/draft.ts`, beside the chairs it rearranges; this file is the deck.
 */

import malicesJson from '../../data/malices.json';

import { type BeadFamily, isBeadFamily } from './beadData';
import type { CardEffect, SlotType } from './statecraftData';
import { SLOT_TYPES } from './statecraftData';

/** Every malice the deck holds, in file order. */
export type MaliceId = keyof typeof malicesJson.malices & string;

export interface MaliceDef {
  name: string;
  /** Which flavour of chair it takes. See the module docblock. */
  chair: SlotType;
  /** The thread it bites, for the Ledger and the shelf. Absent bites the deck. */
  voice?: BeadFamily;
  /** One line in the voice of the tech tree's aphorisms. Never a rule. */
  flavor: string;
  /** What it does, in a first-time player's words. Hard rule 7. */
  note: string;
  effects: CardEffect[];
}

interface MaliceRules {
  /**
   * **How many malices a realm may carry at once** (§4: *"at most two"*).
   *
   * A third failure replaces the oldest rather than adding, so the punishment
   * has a ceiling a player can see and a comeback is never arithmetically out of
   * reach. A number in the data because it is a dial, not an algorithm.
   */
  stack: number;
}

const TABLE = malicesJson as unknown as {
  rules: MaliceRules;
  malices: Record<MaliceId, MaliceDef>;
};

export const MALICE_RULES: MaliceRules = TABLE.rules;

/**
 * Every malice id, in **file order** — the order the draw walks and the order
 * every screen lists them in.
 *
 * File order rather than sorted, for `ORDER_IDS`' reason exactly: an outcome
 * that depends on an order must depend on an order the data itself carries.
 */
export const MALICE_IDS: readonly MaliceId[] = Object.keys(TABLE.malices) as MaliceId[];

export function isMaliceId(value: unknown): value is MaliceId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TABLE.malices, value);
}

export function maliceDef(id: MaliceId): MaliceDef {
  const def = TABLE.malices[id];
  if (!def) throw new Error(`Unknown malice "${String(id)}"`);
  return def;
}

/**
 * Everything wrong with the table, as sentences — the shape `wagerDataProblems`
 * has one system over, and the register test's whole body.
 *
 * A data table that can be edited by hand wants one reading that says what a
 * hand-edit broke, rather than twelve assertions in a test file that each know a
 * little of the schema.
 */
export function maliceDataProblems(): string[] {
  const problems: string[] = [];
  if (!Number.isInteger(MALICE_RULES.stack) || MALICE_RULES.stack < 1) {
    problems.push('rules.stack must be a whole number of chairs, at least one');
  }
  for (const id of MALICE_IDS) {
    const def = maliceDef(id);
    if (def.name.trim().length === 0) problems.push(`${id}: no name`);
    if (def.flavor.trim().length === 0) problems.push(`${id}: no flavour line`);
    if (def.note.trim().length === 0) problems.push(`${id}: no note`);
    if (!SLOT_TYPES.includes(def.chair)) problems.push(`${id}: "${def.chair}" is no kind of chair`);
    if (def.voice !== undefined && !isBeadFamily(def.voice)) {
      problems.push(`${id}: "${def.voice}" is no family`);
    }
    // **One card effect**, which is §4's own shape for the table: a malice is a
    // single bad sentence, and a row that wanted two would be a card rather than
    // a punishment.
    if (def.effects.length !== 1) {
      problems.push(`${id}: a malice is one effect, and this row has ${def.effects.length}`);
    }
    // Hard rule 7: a number written into prose is a second table that goes stale
    // on the next balance pass. The figure is on the effect and printed by the
    // describer.
    if (/\d/.test(def.note)) problems.push(`${id}: the note writes a figure into its prose`);
    if (/\d/.test(def.flavor)) problems.push(`${id}: the flavour writes a figure into its prose`);
  }
  return problems;
}
