/**
 * The Renown tab's two readings: the odds of the next great-person offer, and
 * the renown ledger with one line for each town.
 *
 * Batch GP1 of 2026-11-12 (`docs/flags.md` item (mmmmmmm)). The user: *"the
 * renown tab should show the current percentage odds somewhere of what great
 * people are going to be available to draft"*, and *"we can collapse the full
 * renown breakdown per city (i.e. tenochtitlan: +13)"*.
 *
 * Two surfaces print them: the hover card on the renown figure in the top
 * bar's left group (`topBar.ts`), and the Reliquary, the sheet that figure
 * opens (`reliquaryScreen.ts`). The hover card cannot be clicked, so a town's
 * line opens to its sources only on the Reliquary.
 *
 * Where the numbers come from:
 *   - the odds are `greatPersonOdds` (`src/sim/greatPeople.ts`), which reads
 *     the same bag and weights the draw deals from (`greatPersonBag`). This
 *     file only rounds them to whole percentages;
 *   - the ledger is `explainRenownByTown` (`src/sim/renown.ts`), the list
 *     `explainRenown` is, with each line marked with its town. A town's figure
 *     is the fold of its own lines (`foldRenown`), so the rows fold to the same
 *     total as the list (rule 5).
 *
 * The UI suite mounts no DOM, so everything that can be quietly wrong is a
 * pure function above the drawing code.
 */

import { type GreatPersonOdds, greatPersonOdds } from '../sim/greatPeople';
import type { Family } from '../sim/greatPeopleData';
import { type RenownLine, explainRenownByTown, foldRenown } from '../sim/renown';
import { type GameState, cityById, playerById } from '../sim/state';
import { cityDisplayName } from './cityDisplay';
import { element } from './dom';
import { eraWord } from './figures';

// --- the odds ---------------------------------------------------------------

/** A family's name, as one person and as many. */
const FAMILY_WORD: Record<Family, { one: string; many: string }> = {
  scholar: { one: 'Scholar', many: 'scholars' },
  artist: { one: 'Artist', many: 'artists' },
  engineer: { one: 'Engineer', many: 'engineers' },
  merchant: { one: 'Merchant', many: 'merchants' },
  general: { one: 'General', many: 'generals' },
};

/** One family's row of the odds. */
export interface RenownOddsRow {
  family: Family;
  /** "Scholar". */
  label: string;
  /** The chance in whole percent that a name in the next offer is of this family. */
  percent: number;
  /** Names of this family the draw may deal. */
  names: number;
}

/**
 * Whole percentages that add up to exactly 100 (the largest-remainder rule).
 *
 * Each share is floored, and the points left over go to the shares with the
 * largest fractions. A share of nought has no fraction, so it never gets a
 * point: a family the draw cannot deal always shows 0. When nothing can be
 * dealt, every share is 0.
 */
export function wholePercents(chances: readonly number[]): number[] {
  let total = 0;
  for (const chance of chances) total += Math.max(0, chance);
  if (total <= 0) return chances.map(() => 0);
  const exact = chances.map((chance) => (Math.max(0, chance) / total) * 100);
  const whole = exact.map((share) => Math.floor(share));
  let left = 100;
  for (const share of whole) left -= share;
  const order = exact
    .map((share, at) => ({ at, rest: share - whole[at]! }))
    .filter((entry) => entry.rest > 0)
    .sort((a, b) => b.rest - a.rest || a.at - b.at);
  for (const entry of order) {
    if (left <= 0) break;
    whole[entry.at] = whole[entry.at]! + 1;
    left -= 1;
  }
  return whole;
}

/** The odds as rows, one for each family in the roster's order. */
export function renownOddsRows(odds: GreatPersonOdds): RenownOddsRow[] {
  const percents = wholePercents(odds.families.map((entry) => entry.chance));
  return odds.families.map((entry, at) => ({
    family: entry.family,
    label: FAMILY_WORD[entry.family].one,
    percent: percents[at]!,
    names: entry.names,
  }));
}

/**
 * A piece of a sentence. A figure is set in the tabular mono and the words are
 * not, so a sentence with a number in it is a list of pieces.
 */
export interface RenownWords {
  text: string;
  figure?: boolean;
}

/** "Æra II and Æra IV": a list of ages in words. */
function ageList(ages: readonly number[]): string {
  const words = ages.map((age) => eraWord(age));
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/**
 * Which ages' names are in the bag, as a sentence.
 *
 * The draw walks the empire's own age first, then the ages before it, then the
 * ages after it, and stops as soon as the bag can fill the hand. So the
 * sentence names the empire's age and how many of its names are left, and then
 * any other age the draw reaches into.
 */
export function renownBagWords(odds: GreatPersonOdds): RenownWords[] {
  if (odds.wanted === 0) {
    return [{ text: 'Every great person has been called. Renown banks from now on.' }];
  }
  const own = eraWord(odds.age);
  const others = odds.ages.filter((age) => age !== odds.age);
  const words: RenownWords[] = [];
  if (odds.ageLeft === 0) {
    words.push({ text: `${own} has no names left, so the offer comes from ${ageList(others)}.` });
  } else {
    words.push({ text: `${own} has ` });
    words.push({ text: String(odds.ageLeft), figure: true });
    words.push({ text: odds.ageLeft === 1 ? ' name left' : ' names left' });
    words.push({
      text: others.length === 0 ? '.' : `, so the offer also takes names from ${ageList(others)}.`,
    });
  }
  if (odds.family !== undefined) {
    words.push({ text: ` Your law deals only ${FAMILY_WORD[odds.family].many}.` });
  }
  return words;
}

/** The sentence as plain text, for a `title` or a test. */
export function renownWordsText(words: readonly RenownWords[]): string {
  return words.map((piece) => piece.text).join('');
}

/** Everything the odds block prints, for this seat. `null` for a seat that is not there. */
export interface RenownOddsReading {
  rows: RenownOddsRow[];
  bag: RenownWords[];
  /** How many names the next offer deals. */
  wanted: number;
}

export function renownOddsReading(state: GameState, playerId: number): RenownOddsReading | null {
  const player = playerById(state, playerId);
  if (!player) return null;
  const odds = greatPersonOdds(state, player);
  return { rows: renownOddsRows(odds), bag: renownBagWords(odds), wanted: odds.wanted };
}

// --- the ledger -------------------------------------------------------------

/** One line of the collapsed renown ledger. */
export interface RenownLedgerRow {
  /** "Tenochtitlan ✶", or the line's own source for a line no town owns. */
  source: string;
  /** The fold of `lines`. */
  amount: number;
  /** The town, on a town's row. Absent on a line that belongs to no town. */
  cityId?: number;
  /**
   * The lines this row folds, in the list's order. A town's row opens to
   * them; a row that belongs to no town is its one line.
   */
  lines: RenownLine[];
}

/**
 * The renown ledger with one row for each town, then the lines that belong to
 * no town (cards, legacies, luxuries, empire shares and this turn's Triumphs).
 *
 * Towns come in the order their first line does, which is founding order, the
 * walk `explainRenown` makes. A town with no renown has no row.
 */
export function renownLedgerRows(state: GameState, playerId: number): RenownLedgerRow[] {
  const rows: RenownLedgerRow[] = [];
  for (const { cityId, line } of explainRenownByTown(state, playerId)) {
    if (cityId === null) {
      rows.push({ source: line.source, amount: 0, lines: [line] });
      continue;
    }
    let row = rows.find((one) => one.cityId === cityId);
    if (row === undefined) {
      const city = cityById(state, cityId);
      row = { source: city ? cityDisplayName(state, city) : line.source, amount: 0, cityId, lines: [] };
      rows.push(row);
    }
    row.lines.push(line);
  }
  for (const row of rows) row.amount = foldRenown(row.lines);
  return rows;
}

/** The ledger's total: the fold of every line the rows hold (rule 5). */
export function foldRenownLedger(rows: readonly RenownLedgerRow[]): number {
  return foldRenown(rows.flatMap((row) => row.lines));
}

// --- drawing ----------------------------------------------------------------

/**
 * The odds block: one row a family (name, a bar, the percent), then the bag
 * sentence. Shared by the hover card and the Reliquary, which size it through
 * their own containers.
 */
export function renownOddsNode(reading: RenownOddsReading): HTMLElement {
  const box = element('div', 'renown-odds');
  if (reading.wanted > 0) {
    const list = element('ul', 'renown-odds-rows');
    for (const row of reading.rows) {
      const item = element('li', row.percent === 0 ? 'renown-odds-row is-none' : 'renown-odds-row');
      item.dataset.family = row.family;
      item.append(element('span', 'renown-odds-family', row.label));
      const bar = element('span', 'renown-odds-bar');
      bar.setAttribute('aria-hidden', 'true');
      const fill = element('span', 'renown-odds-fill');
      fill.style.width = `${row.percent}%`;
      bar.append(fill);
      item.append(bar);
      item.append(element('span', 'renown-odds-figure', `${row.percent}%`));
      list.append(item);
    }
    box.append(list);
  }
  const bag = element('p', 'renown-odds-bag');
  for (const piece of reading.bag) {
    if (piece.figure) bag.append(element('span', 'renown-odds-num', piece.text));
    else bag.append(document.createTextNode(piece.text));
  }
  box.append(bag);
  return box;
}
