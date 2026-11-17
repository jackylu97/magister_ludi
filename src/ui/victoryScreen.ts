/**
 * **The standings**: how the game is going, and how it ended (`docs/flags.md`
 * item (uuuuu); the user, 2026-09-15: *"we need to draft a victory screen for
 * completing the magnum opus, and give the player a score based on their
 * empire results and the yields from their deck."*).
 *
 * Batch SS7 gives it the look of the standings page on the Moments board
 * (`docs/plans/mockups/scholars-study/Moments.dc.html`, "The last page",
 * approved). The table keeps the rules of an account page: thin lines between
 * rows, tabular figures, and a double rule above the total. The leader is the
 * first column. Under the title is one line that names the winner, the work and
 * the town it was finished in, and the two doors stand beside that line.
 *
 * One sheet, two moments
 * ----------------------
 * The same document opens from the corner panel's Standings mark or S on any
 * turn, and it is the last page of the Opus close (`opusClose.ts`), because the
 * standings are true either way: `explainScore` reads a state, not an ending.
 * Only the line under the title changes. An undecided game says that no empire
 * has finished the work. A decided one names the winner. The winner reads "You
 * finished ... The game is yours."; everyone else reads the winner's name and
 * people, and "The game is theirs.".
 *
 * It is a sheet on `modalShell.ts` and keeps that whole contract: `hidden` is
 * its only state, ×, Escape and a press on the ground reach one `close`, the
 * keyboard goes back to the door that opened it, and `dispose` unbinds and is
 * registered in `gameDisposers`. The sheet carries its own classes
 * (`standings-sheet`, `standings-body`), so the shared cap on `.statecraft-sheet`
 * stays the one rule every sheet has.
 *
 * The table is the reading
 * ------------------------
 * Every row is one line of `explainScore` (`src/sim/score.ts`) and the foot is
 * `foldScore`, never a second sum written beside it (rule 5). The rows are the
 * same for every column because the reading always returns every line. The
 * board draws the six rows of what statecraft paid folded into one; the sheet
 * keeps all six, because each is a line of the reading.
 *
 * Numbers live in the columns and nowhere else (hard rule 7). The line under
 * the title is words only.
 *
 * Two doors stand beside that line, and both are journeys the game already
 * has: `Continue playing` is the shell's own close (a decided game keeps
 * running, since nothing in the simulation stops at `winnerId`), and `Back to
 * the title` is the landing screen's own path, handed down by `main.ts`.
 *
 * The pure half
 * -------------
 * Which seat leads, whether a row lines up with its reading, what the line
 * says and what the deck's line reads are pure folds above the DOM, because
 * this suite has no jsdom.
 */

import { seatName, seatPeople } from '../sim/leaderData';
import {
  type ScoreLine,
  explainScore,
  foldScore,
  opusBuildingId,
} from '../sim/score';
import { buildingDef } from '../sim/buildingData';
import { type City, type GameState, citiesOf, playerById, realPlayers } from '../sim/state';
import { YIELD_GLYPH, figure } from './figures';
import { setYieldText } from './yieldMark';
import { element } from './dom';
import { createModalShell } from './modalShell';
import { isGoldenBead } from './beadsScreen';
import './victoryScreen.css';

/**
 * A score figure, **whole and never abbreviated**.
 *
 * `figure` compacts a thousand to `1k`, which is right for a rate on a chip and
 * wrong for every number on this sheet: the table's promise is that the
 * arithmetic can be checked. The deck's line keeps `figure`, because that one
 * is a rate.
 */
function tally(value: number): string {
  return String(Math.round(value));
}

/**
 * What one of a row is worth, as `data/rules.json` writes it. A statecraft row
 * is worth a fraction of a point for each yield (`perDeckYield`), and rounding
 * that to a whole number printed "× 0" beside a row that pays hundreds.
 */
export function weightText(weight: number): string {
  return `× ${String(Number(weight.toFixed(4)))}`;
}

/** One piece of the line under the title. `work` marks the work's name, set in red. */
export interface HeadPart {
  text: string;
  work?: boolean;
}

/** What the sheet says above the table. */
interface VictoryHead {
  /** True once somebody has won. */
  won: boolean;
  /** The line under the title, in pieces so the work's name can take the rubric. */
  parts: HeadPart[];
}

/** One seat's column of the table. */
interface VictoryColumn {
  playerId: number;
  /** The figure at that table. */
  name: string;
  /** The nation word a sentence puts after "the". */
  people: string;
  /** The seat's diorama ink, for the swatch over the column. */
  color: string;
  /** The reading itself: one entry per row, in the reading's own order. */
  lines: ScoreLine[];
  /** `foldScore(lines)`, and the only sum on the sheet. */
  total: number;
  /** The column the player is reading their own empire in. */
  you: boolean;
  /** The seat that closed the game, if it is closed. */
  winner: boolean;
}

/** The whole sheet, as data. */
interface VictoryPage {
  head: VictoryHead;
  /** The row labels, taken off the reading once: every column carries them. */
  labels: string[];
  /** What one of each row is worth, likewise. */
  weights: number[];
  /** Every real seat, ordered by its own fold: the standings. */
  columns: VictoryColumn[];
  /** What statecraft paid the seat reading the sheet, voice by voice. */
  deck: string;
}

/** What the closing wonder is called, off its own marker and never by name. */
export function opusName(): string {
  const id = opusBuildingId();
  return id === undefined ? 'the great work' : buildingDef(id).name;
}

/**
 * **The town the work stands in**, or `null`.
 *
 * Read off the stones, as the score's own line is: the winner's towns first,
 * then any town, in case the town has changed hands since. `null` when no town
 * holds it (a game won by being the last empire standing, or a town razed).
 */
export function opusCity(state: GameState, winnerId: number | null): City | null {
  const id = opusBuildingId();
  if (id === undefined) return null;
  const holds = (city: City): boolean => city.buildings.includes(id);
  if (winnerId !== null) {
    const own = citiesOf(state, winnerId).find(holds);
    if (own) return own;
  }
  return state.cities.find(holds) ?? null;
}

/**
 * **Was the game closed by the Opus?** Only finishing the Magnum Opus mints the
 * golden bead, and it goes onto the builder's rod (`beadsScreen.ts`'s
 * `isGoldenBead`). A game won any other way leaves the winner without one.
 */
export function wonByOpus(state: GameState): boolean {
  const winnerId = state.winnerId;
  if (winnerId === null) return false;
  return (playerById(state, winnerId)?.beads ?? []).some(isGoldenBead);
}

/** "Al-Ma’mun of the Abbasids", or the one name for a seat with no figure at its table. */
export function seatTitle(state: GameState, playerId: number): string {
  const name = seatName(state, playerId);
  const people = seatPeople(state, playerId);
  // A seat with no figure answers both questions with its own ink name, and
  // "Crimson of the Crimson" is a sentence about nothing.
  return people === name ? name : `${name} of the ${people}`;
}

/**
 * **What statecraft paid, voice by voice**: the line under the table.
 *
 * Read off the reading's own deck lines (`ScoreLine.voice`) rather than off a
 * second fold, so the sentence and the six rows above it cannot disagree. A deck
 * that pays nothing says so in words rather than printing a row of noughts.
 */
export function deckWords(lines: readonly ScoreLine[]): string {
  const parts: string[] = [];
  for (const line of lines) {
    if (line.voice === undefined || line.count === 0) continue;
    parts.push(`${figure(line.count)}${YIELD_GLYPH[line.voice]}`);
  }
  return parts.length === 0 ? 'nothing yet' : parts.join('  ');
}

/**
 * The line under the title, for one reader.
 *
 * - No winner: "No empire has finished The Magnum Opus yet. The table is the
 *   score so far."
 * - Won by the Opus: "Al-Ma’mun of the Abbasids finished The Magnum Opus in
 *   Baghdad. The game is theirs.", and "You finished ... The game is yours." for
 *   the winner (the board's two readings).
 * - Won by being the last empire left: the same two sentences with "is the last
 *   empire standing".
 */
export function victoryHead(state: GameState, playerId: number): VictoryHead {
  const winnerId = state.winnerId;
  const work = opusName();
  if (winnerId === null) {
    return {
      won: false,
      parts: [
        { text: 'No empire has finished ' },
        { text: work, work: true },
        { text: ' yet. The table is the score so far.' },
      ],
    };
  }
  const mine = winnerId === playerId;
  const who = mine ? 'You' : seatTitle(state, winnerId);
  const whose = mine ? 'The game is yours.' : 'The game is theirs.';
  if (!wonByOpus(state)) {
    return {
      won: true,
      parts: [{ text: mine ? `Yours is the last empire standing. ${whose}` : `${who} is the last empire standing. ${whose}` }],
    };
  }
  const city = opusCity(state, winnerId);
  return {
    won: true,
    parts: [
      { text: `${who} finished ` },
      { text: work, work: true },
      { text: city === null ? `. ${whose}` : ` in ${city.name}. ${whose}` },
    ],
  };
}

/** The line as one plain string, for the tests and for a title attribute. */
export function headText(head: VictoryHead): string {
  return head.parts.map((part) => part.text).join('');
}

/** One seat's column, read whole. */
function victoryColumn(
  state: GameState,
  playerId: number,
  localPlayerId: number,
): VictoryColumn {
  const lines = explainScore(state, playerId);
  return {
    playerId,
    name: seatName(state, playerId),
    people: seatPeople(state, playerId),
    color: state.players[playerId]?.color ?? '#000',
    lines,
    total: foldScore(lines),
    you: playerId === localPlayerId,
    winner: state.winnerId === playerId,
  };
}

/**
 * **The whole sheet, folded.**
 *
 * `realPlayers` is the register for who counts (CLAUDE.md), so the wild has no
 * column. The order is each column's own fold, highest first, and **the seat id
 * breaks a tie**: two empires on the same figure have to be printed in some
 * order, and the only one that is the same on every screen is the roster's.
 */
export function victoryPage(state: GameState, localPlayerId: number): VictoryPage {
  const columns = realPlayers(state)
    .map((player) => victoryColumn(state, player.id, localPlayerId))
    .sort((a, b) => (b.total === a.total ? a.playerId - b.playerId : b.total - a.total));
  const template = columns.find((column) => column.you) ?? columns[0];
  return {
    head: victoryHead(state, localPlayerId),
    labels: (template?.lines ?? []).map((line) => line.label),
    weights: (template?.lines ?? []).map((line) => line.weight),
    columns,
    deck: deckWords(template?.lines ?? []),
  };
}

// --- the sheet --------------------------------------------------------------

export interface VictoryScreen {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  refresh(): void;
  dispose(): void;
}

interface VictoryScreenOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  /** The corner panel's Standings mark, for the `aria-expanded` mirror and the focus return. */
  trigger?: HTMLElement | null;
  /**
   * The other controls that open this sheet, for the focus return and the
   * `aria-expanded` mirror. Since batch SS2b each sheet has one door, so nothing
   * passes it today. See `modalShell.ts`.
   */
  doors?: () => readonly (HTMLElement | null | undefined)[];
  getState: () => GameState;
  getPlayerId: () => number;
  /** The landing screen's own journey, handed down rather than reached from here. */
  toTitle: () => void;
  onOpen?: () => void;
}

export function createVictoryScreen(options: VictoryScreenOptions): VictoryScreen {
  const { overlay, body, closeButton, trigger } = options;

  /**
   * The line under the title, with the two doors beside it. The board puts both
   * in the sheet's head; they are drawn here because the line is a reading of
   * the state and the head in `index.html` is fixed markup.
   */
  function drawHead(head: VictoryHead): HTMLElement {
    const block = element('div', head.won ? 'standings-head is-won' : 'standings-head');
    const line = element('p', 'standings-line');
    for (const part of head.parts) {
      line.append(part.work === true ? element('span', 'standings-work', part.text) : document.createTextNode(part.text));
    }
    block.append(line, drawDoors());
    return block;
  }

  function drawDoors(): HTMLElement {
    const doors = element('div', 'standings-doors');
    const stay = element('button', 'standings-door');
    stay.type = 'button';
    stay.textContent = 'Continue playing';
    // The shell's own close, so this button, the ×, Escape and a press on the
    // ground are one door (`modalShell.ts`).
    stay.addEventListener('click', () => shell.close());

    const title = element('button', 'standings-door');
    title.type = 'button';
    title.textContent = 'Back to the title';
    // The landing's own journey. The sheet is shut first so the screen behind
    // the title card is not one this sheet is still standing on.
    title.addEventListener('click', () => {
      shell.close();
      options.toTitle();
    });

    doors.append(stay, title);
    return doors;
  }

  /**
   * The table, as a real `<table>`: a grid of figures with a head and a foot.
   * It scrolls inside its own frame, so the line, the doors and the × above it
   * stay in view at any window size, and a six-seat game scrolls sideways
   * inside the frame rather than widening the sheet.
   */
  function drawTable(page: VictoryPage): HTMLElement {
    const frame = element('div', 'standings-table-frame');
    const table = element('table', 'standings-table');
    const caption = element(
      'caption',
      'standings-caption',
      'The standings: what is counted, the weight of each, and each empire’s count and value',
    );
    table.append(caption);

    const head = element('thead');
    const headRow = element('tr');
    const counted = element('th', 'standings-row-label', 'what is counted');
    counted.scope = 'col';
    const each = element('th', 'standings-worth', 'each');
    each.scope = 'col';
    headRow.append(counted, each);
    for (const column of page.columns) {
      const cell = element('th', 'standings-seat');
      cell.scope = 'colgroup';
      cell.colSpan = 2;
      if (column.you) cell.classList.add('is-you');
      if (column.winner) cell.classList.add('is-winner');
      const seat = element('span', 'standings-seat-label');
      const swatch = element('i', 'standings-swatch');
      swatch.style.background = column.color;
      seat.append(swatch, element('span', 'standings-seat-name', column.name));
      if (column.you) seat.append(element('span', 'standings-you', ' · you'));
      cell.append(seat);
      headRow.append(cell);
    }
    head.append(headRow);
    table.append(head);

    const rows = element('tbody');
    page.labels.forEach((label, at) => {
      const row = element('tr', 'standings-row');
      const name = element('th', 'standings-row-label', label);
      name.scope = 'row';
      row.append(name);
      row.append(element('td', 'standings-worth', weightText(page.weights[at] ?? 0)));
      for (const column of page.columns) {
        const line = column.lines[at];
        const count = element('td', 'standings-count', tally(line?.count ?? 0));
        const value = element('td', 'standings-value', tally(line?.value ?? 0));
        if (column.you) {
          count.classList.add('is-you');
          value.classList.add('is-you');
        }
        row.append(count, value);
      }
      rows.append(row);
    });
    table.append(rows);

    const foot = element('tfoot');
    const footRow = element('tr');
    const standing = element('th', 'standings-row-label', 'The standing');
    standing.scope = 'row';
    footRow.append(standing, element('td', 'standings-worth'));
    for (const column of page.columns) {
      const cell = element('td', 'standings-total', tally(column.total));
      cell.colSpan = 2;
      if (column.you) cell.classList.add('is-you');
      if (column.winner) cell.classList.add('is-winner');
      footRow.append(cell);
    }
    foot.append(footRow);
    table.append(foot);

    frame.append(table);
    return frame;
  }

  function render(): void {
    const page = victoryPage(options.getState(), options.getPlayerId());
    body.replaceChildren();
    body.append(drawHead(page.head));
    body.append(drawTable(page));
    const deck = element('p', 'standings-deck');
    deck.append(element('span', 'standings-deck-label', 'what your statecraft pays'));
    const figures = element('span', 'standings-deck-figures');
    // Through the one printer, so the six voices are the drawn marks every other
    // composed figure in this interface shows and not the text stand-ins.
    setYieldText(figures, page.deck);
    deck.append(figures);
    // The whole line in words, for the reading that has no drawings in it.
    deck.title = `What your statecraft pays: ${page.deck}`;
    body.append(deck);
  }

  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    trigger,
    doors: options.doors,
    draw: render,
    onOpen: () => options.onOpen?.(),
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
