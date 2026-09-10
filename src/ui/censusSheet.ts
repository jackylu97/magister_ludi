/**
 * **The census sheet** — the world measured on one figure, and where this seat
 * stands in it (`docs/wager.md` §10/§11, batch C1; the mock of 2026-09-09 is the
 * spec of record, its third and fourth sheets).
 *
 * The twelfth sheet on `modalShell.ts`, and it keeps the whole of that contract:
 * `hidden` is its only state, ×/Escape/a press on the ground all reach one
 * `close`, the keyboard goes back where it came from, and `dispose` unbinds and
 * is registered in `gameDisposers`.
 *
 * What is on it, and what is deliberately not
 * -------------------------------------------
 * A masthead carrying **the taker's name and the figure measured** — "Hipparchus
 * has taken the census of the world's science, a turn" — then every living seat
 * ranked with its figure in tabular mono, the local seat's row lifted, and, when
 * that seat led, the **Triumph inside the sheet**. Three absences are marked
 * rulings on the mock:
 *
 *   · **no "flavour" label on the taker's name.** It is flavour and it is not
 *     labelled: the sentence reads as a sentence.
 *   · **no age-progression line in the masthead.** The clock's arithmetic is
 *     never shown to the player; the countdown lives on the top bar's age card.
 *   · **no second Triumph sheet.** The user, 2026-09-09: *"let's not show both a
 *     triumph modal for winning the census and the census modal"*. The
 *     suppression is a **marker on the Triumph row** (`TriumphDef.quiet`) read
 *     by `reportTriumphs` in `controls.ts`, not a name compared here — the
 *     record still lands on `Player.triumphs` and the chronicle still carries
 *     its line, because the log is the record whatever surface announced it.
 *
 * One control, and it is affirmative
 * ----------------------------------
 * "Close the book" sends `dismissCensus`, which is the whole of the sheet's
 * business with the simulation: the ranking is already written, the renown is
 * already banked, and the only thing left to record is that this seat has read
 * it. `triumphModal.ts`' rule — a sheet that is *news* has one door and no
 * second answer for Escape to mean — with the difference that this one is a
 * blocker, so the door is a logged command rather than a local flag.
 *
 * The pure half
 * -------------
 * Everything that can be quietly wrong — the masthead's sentence, the ranking's
 * order, how long a track is, which row is yours, whether the Triumph block is
 * drawn at all — is a pure fold above the DOM, so the jsdom-less suite can pin
 * it. Drawing is a page of `append` calls that fail loudly or not at all.
 * `wagerSheet.ts`' discipline, and `ledgerScreen.ts`' before it.
 */

import type { CensusRecord, GameState } from '../sim/state';
import { type CensusStat, censusTriumphIds, isCensusStat, lastCensus } from '../sim/census';
import { triumphDef } from '../sim/triumphData';
import { YIELD_GLYPH, figure } from './figures';
import { element } from './dom';
import { createModalShell } from './modalShell';

/**
 * How each figure is **said** — the word the masthead ends on, the mark beside a
 * row's number, and whether it is a rate.
 *
 * One table for both surfaces this sheet and the Abacus band draw, so the census
 * of the world's science and the Abacus's memory of it cannot come to disagree
 * about what was measured. Hard rule 7 throughout: a first-time player's words,
 * no identifiers, and no digits written into prose.
 *
 * The six voices wear their own yield glyph (`YIELD_GLYPH`, the register every
 * composed figure in this interface reads); the other seven print the word
 * alone, because a mark invented for this one sheet would be a visual asset that
 * had never been through the flair gallery.
 */
export const CENSUS_STAT_WORDS: Record<CensusStat, { word: string; glyph: string; rate: boolean }> =
  {
    technologies: { word: 'learning, all told', glyph: '', rate: false },
    science: { word: 'science', glyph: YIELD_GLYPH.science, rate: true },
    culture: { word: 'culture', glyph: YIELD_GLYPH.culture, rate: true },
    food: { word: 'food', glyph: YIELD_GLYPH.food, rate: true },
    production: { word: 'labour', glyph: YIELD_GLYPH.production, rate: true },
    gold: { word: 'gold', glyph: YIELD_GLYPH.gold, rate: true },
    faith: { word: 'faith', glyph: YIELD_GLYPH.faith, rate: true },
    drafts: { word: 'statecraft', glyph: '', rate: false },
    followers: { word: 'faithful', glyph: '', rate: false },
    cities: { word: 'towns', glyph: '', rate: false },
    citizens: { word: 'citizens', glyph: '', rate: false },
    armyStrength: { word: 'armies', glyph: '', rate: false },
    beads: { word: 'beads', glyph: '', rate: false },
  };

/** The rank mark on a row — the mock's lowercase numerals, i through whatever. */
const RANK_MARKS: readonly (readonly [number, string])[] = [
  [10, 'x'],
  [9, 'ix'],
  [5, 'v'],
  [4, 'iv'],
  [1, 'i'],
];

/**
 * A place in the ranking, as the mock writes it: `i`, `ii`, `iii`, `iv`.
 *
 * Lowercase because the sheet is a clerk's page rather than a monument — the
 * masthead's era numeral is the capital one, and these are the lines under it.
 */
export function censusRankMark(place: number): string {
  let left = Math.max(1, Math.round(place));
  let out = '';
  for (const [value, mark] of RANK_MARKS) {
    while (left >= value) {
      out += mark;
      left -= value;
    }
  }
  return out;
}

/** One seat's line, as the sheet prints it. Numbers and words, no sim types. */
export interface CensusSeatLine {
  playerId: number;
  name: string;
  /** The seat's diorama ink, for the swatch. */
  color: string;
  /** "ii" — its place in the ranking. */
  rank: string;
  /** The figure, in tabular mono, with the voice's mark where it has one. */
  figure: string;
  /** How long the track is, a fraction of the leading figure. */
  fraction: number;
  /** The local seat's own row, which the sheet lifts. */
  you: boolean;
  /** The head of the ranking. At most one row, and only when it read something. */
  leader: boolean;
}

/** The Triumph the leader took, as the sheet prints it inside itself. */
export interface CensusTriumphLine {
  name: string;
  /** The row's own cause line. */
  text: string;
  /** What it paid, already banked by the time anybody reads this. */
  pays: number;
}

/** One census, as a page. **The sheet's whole reading.** */
export interface CensusPage {
  /** The absolute turn it was taken on. */
  turn: number;
  /** "Hipparchus has taken the census of the world's" — the mock's own line. */
  takerLine: string;
  /** "science" — the figure measured, in the player's words. */
  statWord: string;
  /** The voice's mark, or an empty string for a figure that has none. */
  statGlyph: string;
  /** " a turn" for a rate, else an empty string. */
  statRate: string;
  rows: CensusSeatLine[];
  /**
   * The Triumph block, or `null`.
   *
   * Drawn **only on the local seat's own sheet, and only when that seat led**:
   * the Triumph is this player's, and a rival's renown is not news that belongs
   * on a page about the world.
   */
  triumph: CensusTriumphLine | null;
}

/**
 * **One census, folded for the sheet.** `null` for a record whose figure has
 * been cut from the list since it was taken.
 *
 * A save is a save: a census measured on a figure this build no longer knows is
 * skipped rather than thrown over, which is `wagerFaces`' own answer one system
 * across.
 *
 * The track is scaled to the **leading figure** rather than to any bar, because
 * a census has no bar: it is a ranking, and "how far behind the leader am I" is
 * the only question the drawing can honestly answer. Negative figures — a
 * treasury in the red is the one that happens — clamp to nothing, so a track is
 * never drawn backwards.
 */
export function censusPage(
  state: GameState,
  playerId: number,
  record: CensusRecord,
): CensusPage | null {
  if (!isCensusStat(record.stat)) return null;
  const words = CENSUS_STAT_WORDS[record.stat];
  const top = Math.max(0, record.rows[0]?.figure ?? 0);

  const rows: CensusSeatLine[] = record.rows.map((row, at) => {
    const seat = state.players[row.playerId];
    return {
      playerId: row.playerId,
      name: seat?.name ?? 'An empire',
      color: seat?.color ?? '#000',
      rank: censusRankMark(at + 1),
      figure: `${figure(Math.floor(row.figure))}${words.glyph}`,
      fraction: top > 0 ? Math.max(0, Math.min(1, row.figure / top)) : 0,
      you: row.playerId === playerId,
      leader: record.leaderId !== null && row.playerId === record.leaderId,
    };
  });

  return {
    turn: record.turn,
    takerLine: `${record.taker} has taken the census of the world’s`,
    statWord: words.word,
    statGlyph: words.glyph,
    statRate: words.rate ? ' a turn' : '',
    rows,
    triumph: record.leaderId === playerId ? censusTriumph() : null,
  };
}

/**
 * The Triumph row the census pays, as words and a figure — found through its
 * **trigger** (`censusTriumphIds`), never by name.
 *
 * `null` if the table names none, which is a data mistake `censusProblems` fails
 * the build over rather than something this sheet has to have an opinion about.
 */
function censusTriumph(): CensusTriumphLine | null {
  const id = censusTriumphIds()[0];
  if (id === undefined) return null;
  const def = triumphDef(id);
  return { name: def.name, text: def.text, pays: def.pays };
}

/** The line under the ranking. Where the census can be read again. */
export const CENSUS_FOOT = 'The last census stays on the Abacus.';

// --- the sheet --------------------------------------------------------------

export interface CensusSheet {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  refresh(): void;
  dispose(): void;
}

export interface CensusSheetOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  getState: () => GameState;
  getPlayerId: () => number;
  /** Sends `dismissCensus`. Returns true when the reducer took it. */
  dismiss: () => boolean;
  onOpen?: () => void;
}

/**
 * The census sheet, on the shell.
 *
 * It is raised by the End Turn blocker for the local seat and by nothing else:
 * a census is read once and then it is on the Abacus, so a bar control or a
 * hotkey would be a door onto a page that is already filed.
 *
 * The command rides the shell's `onClose` rather than the button's own click,
 * so the ×, Escape, a press on the ground and "Close the book" are one path
 * with one write on it. A seat that Shift-ended its turn with the sheet up is
 * refused by the reducer and the sheet still closes: holding a player behind a
 * page they have plainly read, to complain about it, would be the worse of the
 * two answers. `dispose` hides the overlay without going through the door, so a
 * game torn down mid-sheet sends nothing.
 */
export function createCensusSheet(options: CensusSheetOptions): CensusSheet {
  const { overlay, body, closeButton, getState, getPlayerId } = options;

  function render(): void {
    const state = getState();
    body.replaceChildren();
    const record = lastCensus(state);
    const page = record ? censusPage(state, getPlayerId(), record) : null;
    if (!page) {
      body.append(element('p', 'census-empty', 'No census has been taken.'));
      return;
    }

    const head = element('section', 'census-title');
    head.append(element('p', 'census-taker', page.takerLine));
    const stat = element('p', 'census-stat');
    stat.append(element('span', 'census-stat-word', `${page.statGlyph} ${page.statWord}`.trim()));
    if (page.statRate !== '') {
      stat.append(element('span', 'census-stat-rate', page.statRate.trim()));
    }
    head.append(stat);
    body.append(head);

    const list = element('ol', 'census-ranking');
    for (const row of page.rows) list.append(drawRow(row));
    body.append(list);

    if (page.triumph) body.append(drawTriumph(page.triumph));

    const foot = element('div', 'census-dismiss');
    const close = element('button', 'census-close-book') as HTMLButtonElement;
    close.type = 'button';
    close.textContent = 'Close the book';
    // **One door.** The button closes the sheet and the shell's `onClose` is
    // what sends the command, so the ×, Escape, a press on the ground and this
    // are one path with one write on it — `modalShell.ts`' whole argument, and
    // the reason the reducer never sees a second dismissal it would have to
    // refuse.
    close.addEventListener('click', () => shell.close());
    foot.append(close);
    body.append(foot);

    body.append(element('p', 'census-foot', CENSUS_FOOT));
  }

  function drawRow(row: CensusSeatLine): HTMLElement {
    const line = element('li', 'census-row');
    if (row.you) line.classList.add('is-you');
    if (row.leader) line.classList.add('is-leader');
    line.style.setProperty('--census-ink', row.color);
    line.append(element('span', 'census-rank', row.rank));

    const seat = element('span', 'census-seat');
    const swatch = element('span', 'census-swatch');
    swatch.style.background = row.color;
    seat.append(swatch, element('span', undefined, row.name));
    // The lift is a class on the row; the word is what makes it legible in a
    // list of four names a player has not memorised.
    if (row.you) seat.append(element('span', 'census-you', '· you'));
    line.append(seat);

    const track = element('span', 'census-track');
    const fill = element('span', 'census-fill');
    fill.style.width = `${Math.round(row.fraction * 100)}%`;
    track.append(fill);
    line.append(track);

    line.append(element('span', 'census-figure', row.figure));
    return line;
  }

  /**
   * The Triumph, **inside the sheet** — the user's ruling of 2026-09-09 drawn.
   *
   * The specimen's proclamation dress one weight down: the laurel the renown
   * chip carries, the display face for the name, the cause line under it, and
   * the pay as one tabular figure at the end. Nothing here is a button, because
   * nothing about it is a decision — it has already been paid.
   */
  function drawTriumph(triumph: CensusTriumphLine): HTMLElement {
    const block = element('section', 'census-triumph');
    block.append(element('span', 'census-laurel', '❧'));
    const words = element('div', 'census-triumph-words');
    words.append(element('h4', 'census-triumph-name', `Triumph · ${triumph.name}`));
    words.append(element('p', 'census-triumph-text', triumph.text));
    block.append(words);
    block.append(
      element('span', 'census-triumph-pays', `+${figure(triumph.pays)} renown`),
    );
    return block;
  }

  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    onOpen: () => options.onOpen?.(),
    draw: render,
    // Escape and the × are the same door the button is: a sheet that is news has
    // one answer, and leaving it any way at all is having read it.
    onClose: () => {
      options.dismiss();
    },
  });

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    open: shell.open,
    close: shell.close,
    toggle: shell.toggle,
    refresh: shell.refresh,
    dispose: shell.dispose,
  };
}
