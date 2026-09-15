/**
 * **The victory sheet, and the standings** — how the game ended, and how it is
 * going (`docs/flags.md` item (uuuuu); the user, 2026-09-15: *"we need to draft
 * a victory screen for completing the magnum opus, and give the player a score
 * based on their empire results and the yields from their deck."*).
 *
 * It replaces `victoryModal.ts`, which is retired with this pass. That sheet was
 * the Triumph sheet's sibling: an eyebrow, a headline, a bead figure and one
 * button. It said *who* won and nothing about *what a game came to*, and the
 * figure it printed — beads on the rod — had stopped being the thing that
 * decides a game when the Opus became the finish line (`closeTheGreatWork`:
 * the beads are the door, the great work is the close).
 *
 * One sheet, two moments
 * ----------------------
 * The same document is raised by a win and opened from the dock on any turn,
 * because the standings are true either way — `explainScore` reads a state, not
 * an ending. What changes is the masthead: a decided game names the winner, the
 * people they lead and the work they finished; an undecided one says where the
 * world stands. A player who wants to know whether they are ahead has nowhere
 * else to ask, and a player who has just lost is told by name in the same
 * document that shows them why.
 *
 * The fifteenth sheet on `modalShell.ts`, keeping the whole of that contract:
 * `hidden` is its only state, ×/Escape/a press on the ground reach one `close`,
 * the keyboard goes back to the dock button that opened it, and `dispose`
 * unbinds and is registered in `gameDisposers`.
 *
 * The table is the reading
 * ------------------------
 * Every row is one line of `explainScore` (`src/sim/score.ts`) and the foot is
 * `foldScore` — never a second sum written beside it (rule 5). The rows are the
 * same for every column because the reading always returns every line, which is
 * what lets the sheet read as **standings**: one row per thing counted, one
 * column per seat, the local seat's marked, and the columns ordered by their
 * own fold so the head of the table is the head of the world.
 *
 * Numbers live in the columns and nowhere else (hard rule 7): "Towns held" is
 * the row, and the count, the weight and the product are three tabular figures
 * beside it. Nothing on this sheet writes a figure into a sentence.
 *
 * Two doors at the foot, and both are journeys the game already has: `Continue
 * playing` is the shell's own close (a decided game keeps running — nothing in
 * the simulation stops at `winnerId`), and `Back to the title` is the landing
 * screen's own path, handed down by `main.ts` rather than reached from here.
 *
 * The pure half
 * -------------
 * Everything that can be quietly wrong — which seat leads, whether a row lines
 * up with its reading, what the masthead says, what the deck's line reads — is a
 * pure fold above the DOM, because this suite has no jsdom (`censusSheet.ts`'s
 * discipline, and `ledgerScreen.ts`' before it).
 */

import { seatName, seatPeople } from '../sim/leaderData';
import {
  type ScoreLine,
  explainScore,
  foldScore,
  opusBuildingId,
} from '../sim/score';
import { buildingDef } from '../sim/buildingData';
import { realPlayers, type GameState } from '../sim/state';
import { YIELD_GLYPH, figure } from './figures';
import { setYieldText } from './yieldMark';
import { element } from './dom';
import { createModalShell } from './modalShell';

/**
 * A score figure, **whole and never abbreviated**.
 *
 * `figure` compacts a thousand to `1k`, which is right for a rate on a chip and
 * wrong for every number on this sheet: the table's whole promise is that the
 * arithmetic can be checked, and a score printed as `1k` hides the difference
 * between an empire on 1,020 and one on 1,049 — which on the sheet that
 * announces a win is the difference nobody may hide. The deck's line keeps
 * `figure`, because that one is a rate.
 */
function tally(value: number): string {
  return String(Math.round(value));
}

/** The masthead — everything the sheet says before the table starts. */
export interface VictoryHead {
  /** True once somebody has won. The whole of the difference between the two. */
  won: boolean;
  /** "the great work is finished", or "where the world stands". */
  eyebrow: string;
  /**
   * "Pachacuti of the Inca" — the winner's figure and their people.
   *
   * **Empty until somebody has won**, and the sheet draws nothing for it: the
   * page already wears "The Standings" in its own header, and a masthead
   * repeating it would be the title said twice with nothing in between.
   */
  name: string;
  /** The sentence that says what happened. Third person, for every reader. */
  headline: string;
  /** The line under it, which is the only part about the reader. */
  text: string;
}

/** One seat's column of the table. */
export interface VictoryColumn {
  playerId: number;
  /** The figure at that table. */
  name: string;
  /** The nation word a sentence puts after "the". */
  people: string;
  /** The seat's diorama ink, for the swatch over the column. */
  color: string;
  /** The reading itself — one entry per row, in the reading's own order. */
  lines: ScoreLine[];
  /** `foldScore(lines)`, and the only sum on the sheet. */
  total: number;
  /** The column the player is reading their own empire in. */
  you: boolean;
  /** The seat that closed the game, if it is closed. */
  winner: boolean;
}

/** The whole sheet, as data. */
export interface VictoryPage {
  head: VictoryHead;
  /** The row labels, taken off the reading once — every column carries them. */
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
 * **What statecraft paid, voice by voice** — the line under the table.
 *
 * Read off the reading's own deck lines (`ScoreLine.voice`) rather than off a
 * second fold, so the sentence and the six rows above it cannot disagree. A deck
 * that pays nothing says so in words rather than printing a row of noughts,
 * which is `ledgerCaption`'s rule one sheet over.
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
 * The masthead for one reader.
 *
 * The headline names the winner **in the third person even for the winner**,
 * `victoryFace`'s own rule inherited from the sheet this replaces: it is the
 * world's announcement and the same document is on every screen. The second
 * person belongs to the line underneath.
 */
export function victoryHead(state: GameState, playerId: number): VictoryHead {
  const winnerId = state.winnerId;
  if (winnerId === null) {
    return {
      won: false,
      eyebrow: 'where the world stands',
      name: '',
      headline: `No empire has finished ${opusName()}.`,
      text: 'The score below is what every empire has to show for itself so far.',
    };
  }
  const name = seatName(state, winnerId);
  const people = seatPeople(state, winnerId);
  const mine = winnerId === playerId;
  return {
    won: true,
    eyebrow: mine ? 'victory' : 'the great work is finished',
    // A seat with no figure at its table answers both questions with its own
    // ink-name (`seatName`/`seatPeople`), and "Crimson of the Crimson" is a
    // sentence about nothing. One name, then.
    name: people === name ? name : `${name} of the ${people}`,
    headline: `${name} has finished ${opusName()}.`,
    text: mine
      ? 'The work is done and the age is closed. The reckoning is yours.'
      : 'The work is done and the age is closed. The reckoning has gone elsewhere.',
  };
}

/** One seat's column, read whole. */
export function victoryColumn(
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
 * column — a score line for the weather is the thing that rule exists to stop.
 * The order is each column's own fold, highest first, and **the seat id breaks a
 * tie**: two empires on the same figure have to be printed in some order, and
 * the only one that is the same on every screen is the roster's.
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

export interface VictoryScreenOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  /** The dock's own door, for the `aria-expanded` mirror and the focus return. */
  trigger?: HTMLElement | null;
  getState: () => GameState;
  getPlayerId: () => number;
  /** The landing screen's own journey, handed down rather than reached from here. */
  toTitle: () => void;
  onOpen?: () => void;
}

export function createVictoryScreen(options: VictoryScreenOptions): VictoryScreen {
  const { overlay, body, closeButton, trigger } = options;

  function drawHead(head: VictoryHead): HTMLElement {
    const block = element('section', head.won ? 'victory-title is-won' : 'victory-title');
    block.append(element('p', 'eyebrow victory-eyebrow', head.eyebrow));
    if (head.name !== '') block.append(element('h3', 'victory-name', head.name));
    block.append(element('p', 'victory-headline', head.headline));
    block.append(element('p', 'victory-text', head.text));
    return block;
  }

  /**
   * The table, as a real `<table>`: this is a grid of figures with a head and a
   * foot, which is the one thing in this interface that markup already means.
   * It scrolls inside its own frame rather than widening the sheet, because a
   * six-seat game is six columns of three figures.
   */
  function drawTable(page: VictoryPage): HTMLElement {
    const frame = element('div', 'victory-table-frame');
    const table = element('table', 'victory-table');

    const head = element('thead');
    const headRow = element('tr');
    headRow.append(element('th', 'victory-row-label', 'What is counted'));
    headRow.append(element('th', 'victory-worth', 'each'));
    for (const column of page.columns) {
      const cell = element('th', 'victory-seat');
      if (column.you) cell.classList.add('is-you');
      if (column.winner) cell.classList.add('is-winner');
      const swatch = element('span', 'victory-swatch');
      swatch.style.background = column.color;
      cell.append(swatch, element('span', 'victory-seat-name', column.name));
      if (column.you) cell.append(element('span', 'victory-you', '· you'));
      cell.setAttribute('colspan', '2');
      headRow.append(cell);
    }
    head.append(headRow);
    table.append(head);

    const rows = element('tbody');
    page.labels.forEach((label, at) => {
      const row = element('tr', 'victory-row');
      row.append(element('th', 'victory-row-label', label));
      row.append(element('td', 'victory-worth', `×${tally(page.weights[at] ?? 0)}`));
      for (const column of page.columns) {
        const line = column.lines[at];
        const count = element('td', 'victory-count', tally(line?.count ?? 0));
        const value = element('td', 'victory-value', tally(line?.value ?? 0));
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
    footRow.append(element('th', 'victory-row-label', 'The score'));
    footRow.append(element('td', 'victory-worth'));
    for (const column of page.columns) {
      const cell = element('td', 'victory-total', tally(column.total));
      cell.setAttribute('colspan', '2');
      if (column.you) cell.classList.add('is-you');
      if (column.winner) cell.classList.add('is-winner');
      footRow.append(cell);
    }
    foot.append(footRow);
    table.append(foot);

    frame.append(table);
    return frame;
  }

  function drawFoot(): HTMLElement {
    const foot = element('div', 'victory-foot');
    const stay = element('button', 'victory-stay') as HTMLButtonElement;
    stay.type = 'button';
    stay.textContent = 'Continue playing';
    // The shell's own close, so this button, the ×, Escape and a press on the
    // ground are one door — `modalShell.ts`' whole argument.
    stay.addEventListener('click', () => shell.close());

    const title = element('button', 'victory-to-title') as HTMLButtonElement;
    title.type = 'button';
    title.textContent = 'Back to the title';
    // The landing's own journey. The sheet is shut first so the screen behind
    // the title card is not one this sheet is still standing on.
    title.addEventListener('click', () => {
      shell.close();
      options.toTitle();
    });

    foot.append(stay, title);
    return foot;
  }

  function render(): void {
    const page = victoryPage(options.getState(), options.getPlayerId());
    body.replaceChildren();
    body.append(drawHead(page.head));
    body.append(drawTable(page));
    const deck = element('p', 'victory-deck');
    deck.append(element('span', 'victory-deck-label', 'what your statecraft pays'));
    const figures = element('span', 'victory-deck-figures');
    // Through the one printer, so the six voices are the drawn marks every other
    // composed figure in this interface shows and not the text stand-ins.
    setYieldText(figures, page.deck);
    deck.append(figures);
    // The whole line in words, for the reading that has no drawings in it.
    deck.title = `What your statecraft pays: ${page.deck}`;
    body.append(deck);
    body.append(drawFoot());
  }

  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    trigger,
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
