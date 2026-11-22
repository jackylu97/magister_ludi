/**
 * **Report a problem**: one file a playtester can send, holding a note and a
 * save of the game at the moment they asked.
 *
 * The closed beta runs on a static host with no server, so nothing here sends
 * anything. The sheet builds a file, the browser saves it where the player
 * says, and the player sends it by hand. "Copy summary" puts a few lines on the
 * clipboard to paste into a chat beside the file.
 *
 * What the file holds
 * -------------------
 * One JSON object (`ProblemReport`):
 *
 * - the note, the build stamp (`buildStamp.ts`) and the time it was made;
 * - the browser's user agent and the window size;
 * - the turn, the local seat, its leader and its decks;
 * - what was on screen: the surfaces open when the sheet was asked for, the
 *   last surfaces opened (`ScreenRegistry.recent`), the open city, the
 *   selected unit and the lens, all read through the interface's own getters;
 * - the last errors the page saw (`createErrorLog`, `errorLog.ts`);
 * - `save`: the game's own save payload (`makeSavePayload`), exactly what
 *   Export writes. `saves.ts` reads a report as the save inside it, so a
 *   developer opens a tester's file through Load, then Import a file, and the
 *   game replays to the same turn.
 *
 * The header is written with indents so a person can read it in any text
 * editor. The save is written as one line, as Export writes it, because it is
 * the large part.
 *
 * Never blocking the game
 * -----------------------
 * The moment is taken when the sheet opens: the description of the screen
 * and a copy of the log (the commands themselves are never changed, so a
 * shallow copy fixes the save at that turn). Turning the save into text is the
 * one part that grows with the game, so it runs in an idle callback after the
 * sheet has drawn, and the button then shows the file's size. A press before
 * that builds it there and then, which is a few milliseconds even late in a
 * game. The note is joined to the text on the press, so typing never rebuilds
 * the save.
 *
 * The sheet is on `modalShell.ts` and keeps its contract: `hidden` is its only
 * screen state, the ×, Escape and a press on the ground all close it, and its
 * `dispose` is in `gameDisposers`. The note survives a close and an open, and
 * goes with the game.
 *
 * The pure half (the moment, the text, the name, the summary, the size) is
 * above the sheet, so the suite can test it with no DOM.
 */

import type { Game } from '../sim/game';
import { type GameState, playerById } from '../sim/state';
import { seatName } from '../sim/leaderData';
import { DECK_WORDS, type DeckId } from '../sim/statecraftData';
import { REPORT_KIND, type SavePayload, makeSavePayload } from './saves';
import { BUILD_STAMP, type BuildStamp, buildStampLine } from './buildStamp';
import { ERROR_LINES, type ReportError } from './errorLog';
import { createModalShell } from './modalShell';
import { element } from './dom';
import './problemReport.css';
import { tierLine, tierOf } from './difficultyTier';

/** This file's own version, raised if the fields below change shape. */
export const REPORT_FORMAT = 1;

/** The longest note the field takes. A report is a note, not an essay. */
const NOTE_LIMIT = 4000;

/** What was on screen, read through the interface's getters. View state only. */
export interface ReportView {
  /** Registry names of the surfaces up when the sheet was asked for. */
  open: string[];
  /** Registry names of the last surfaces opened, oldest first. */
  recent: string[];
  /** The open city, or `null`. */
  city: { id: number; name: string } | null;
  /** The selected unit, or `null`. */
  unit: { id: number; type: string; col: number; row: number } | null;
  /** The lens the player chose, and the one on the board (a settler can override it). */
  lens: string;
  boardLens: string;
}

/** The browser and the window the report came from. */
export interface ReportBrowser {
  userAgent: string;
  width: number;
  height: number;
  pixelRatio: number;
}

/** The game the report is about. */
export interface ReportGame {
  turn: number;
  seat: number;
  /** The seat's name as every surface prints it (`seatName`). */
  seatName: string;
  leader: string | null;
  decks: string[];
  seed: number;
  size: string;
  seats: number;
  /** The difficulty tier, from the state. 0 is the standard game. */
  tier: number;
}

/** Everything in the file except the save. */
export interface ReportHead {
  kind: typeof REPORT_KIND;
  reportFormat: number;
  note: string;
  build: BuildStamp;
  /** ISO 8601, from the page's clock. */
  createdAt: string;
  browser: ReportBrowser;
  game: ReportGame;
  view: ReportView;
  errors: ReportError[];
}

/** The whole file. */
export interface ProblemReport extends ReportHead {
  save: SavePayload;
}

/** The moment the sheet was asked for: the head with no note yet, the save, and the file's name. */
export interface ReportMoment {
  head: ReportHead;
  save: SavePayload;
  filename: string;
}

/** What `reportMoment` needs, all handed in so the moment is a pure fold. */
export interface MomentInput {
  game: Game;
  seat: number;
  /** The name the save will carry; the game's current save name. */
  saveName: string;
  view: ReportView;
  browser: ReportBrowser;
  errors: readonly ReportError[];
  /** Epoch milliseconds. */
  now: number;
  build?: BuildStamp;
}

/**
 * The seat as the report names it: its leader id and its decks in the deck
 * table's words. A seat with no leader (an older config) reports `null`.
 */
function gameFacts(state: GameState, game: Game, seat: number): ReportGame {
  const player = playerById(state, seat);
  const decks = (player?.decks ?? []) as DeckId[];
  return {
    turn: state.turn,
    seat,
    seatName: seatName(state, seat),
    leader: player?.leader ?? null,
    decks: decks.map((deck) => DECK_WORDS[deck] ?? String(deck)),
    seed: game.config.seed,
    size: game.config.sizeName,
    seats: game.config.players.length,
    tier: tierOf(state),
  };
}

/**
 * Takes the moment: the head and a save of the game as it is now.
 *
 * The log is copied, so a command that lands after this cannot change the
 * save, which is the autosave's own rule (`createAutosaver`).
 */
export function reportMoment(input: MomentInput): ReportMoment {
  const { game, seat, now } = input;
  const save: SavePayload = { ...makeSavePayload(game, input.saveName, now), log: game.log.slice() };
  const head: ReportHead = {
    kind: REPORT_KIND,
    reportFormat: REPORT_FORMAT,
    note: '',
    build: input.build ?? BUILD_STAMP,
    createdAt: new Date(now).toISOString(),
    browser: input.browser,
    game: gameFacts(game.state, game, seat),
    view: input.view,
    errors: input.errors.slice(-ERROR_LINES),
  };
  return { head, save, filename: reportFilename(new Date(now), game.state.turn) };
}

/** Two digits, for a date in a file name. */
function two(value: number): string {
  return String(value).padStart(2, '0');
}

/** `magister-ludi-report-2026-11-21-turn42.json`, on the player's local date. */
export function reportFilename(when: Date, turn: number): string {
  const date = `${when.getFullYear()}-${two(when.getMonth() + 1)}-${two(when.getDate())}`;
  return `magister-ludi-report-${date}-turn${turn}.json`;
}

/**
 * The file's text: the head, indented, with the save's JSON put in as its last
 * field. `saveJson` is `JSON.stringify(save)`, made once; this only joins it,
 * so a new note never makes the save into text again.
 */
export function reportText(head: ReportHead, saveJson: string): string {
  const top = JSON.stringify(head, null, 2);
  // `top` is "{\n  …\n}": the save goes in before the closing brace.
  return `${top.slice(0, -2)},\n  "save": ${saveJson}\n}\n`;
}

/** How many bytes a text takes as UTF-8, which is the size of the file it becomes. */
export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** A file size for a button: "812 B", "64 KB", "1.4 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "Commerce and Devotion", "Dominion, Commerce and Devotion". */
function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]!}`;
}

/** The screens a report names, newest first, without repeats. */
function screensNamed(view: ReportView): string[] {
  const names: string[] = [];
  for (const name of [...view.open, ...[...view.recent].reverse()]) {
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

/**
 * The short text "Copy summary" puts on the clipboard: the note, the build,
 * the turn, the seat and the screen, in a few plain lines for a chat.
 */
export function reportSummary(head: ReportHead, filename: string): string {
  const { game, view } = head;
  const decks = game.decks.length > 0 ? ` (${listOf(game.decks)})` : '';
  const screen: string[] = [];
  if (view.city) screen.push(`city ${view.city.name}`);
  if (view.unit) screen.push(`unit ${view.unit.type} at ${view.unit.col},${view.unit.row}`);
  screen.push(`lens ${view.lens}`);
  const named = screensNamed(view);
  if (named.length > 0) screen.push(`screens ${named.join(', ')}`);
  const note = head.note.trim() === '' ? 'No note written.' : head.note.trim();
  return [
    'Magister Ludi problem report',
    `What happened: ${note}`,
    `Build ${head.build.commit}, save version ${head.build.schemaVersion}`,
    `Turn ${game.turn}, seat ${game.seat}: ${game.seatName}${decks}`,
    // A report file from before the tiers has no tier. It reads as tier 0.
    `Difficulty: ${tierLine(game.tier ?? 0)}`,
    `On screen: ${screen.join('; ')}`,
    `Report file: ${filename}`,
  ].join('\n');
}

// --- the words ------------------------------------------------------------------

/** Every sentence the sheet prints, in one place. */
export const REPORT_WORDS = {
  label: 'What happened? What did you expect?',
  includes:
    'The file holds your note, a save of this game, the build, your browser and window size, ' +
    'what was open on screen and the last errors the page saw. Nothing is sent. ' +
    'You choose where the file goes and who gets it.',
  save: 'Save report file',
  copy: 'Copy summary',
  reopen: 'The game opens a report file like a save: choose Load, then Import a file.',
  copied: 'The summary is on the clipboard. Paste it beside the file.',
  selectToCopy: 'The browser did not allow the copy. The summary is selected: copy it with Ctrl+C or ⌘C.',
} as const;

/** The line after a file was handed to the browser. */
export function savedLine(filename: string, bytes: number): string {
  return `Saved ${filename} (${formatBytes(bytes)}).`;
}

// --- the sheet --------------------------------------------------------------------

export interface ProblemReportSheet {
  readonly isOpen: boolean;
  /** Takes the moment, then opens. On a sheet already up, repaints. */
  open(): void;
  close(): void;
  toggle(): void;
  refresh(): void;
  dispose(): void;
}

interface ProblemReportOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  /** Takes the moment. Called on a genuine opening, before anything closes. */
  capture: () => ReportMoment;
  /** Hands the browser a file. `downloadJson` in `savesPanel.ts`. */
  download: (filename: string, text: string) => void;
  /** Tells the registry. */
  onOpen?: () => void;
  /** Where the keyboard goes when the sheet closes: the menu's button. */
  returnFocus?: () => HTMLElement | null;
}

/** Runs a task when the page is idle, or soon. Never in the click that opened the sheet. */
function whenIdle(task: () => void): void {
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
    .requestIdleCallback;
  if (typeof idle === 'function') idle(task, { timeout: 500 });
  else setTimeout(task, 0);
}

export function createProblemReportSheet(options: ProblemReportOptions): ProblemReportSheet {
  const { overlay, body, closeButton } = options;

  let moment: ReportMoment | null = null;
  /** `JSON.stringify(moment.save)`, once it is made. */
  let saveJson: string | null = null;
  let saveBytes = 0;
  /** Raised on every opening, so a build queued for an older moment is dropped. */
  let visit = 0;
  /** The note, kept across a close and an open. */
  let note = '';

  const label = element('label', 'report-label', REPORT_WORDS.label);
  label.htmlFor = 'report-note';
  const field = element('textarea', 'report-note');
  field.id = 'report-note';
  field.rows = 6;
  field.maxLength = NOTE_LIMIT;
  field.addEventListener('input', () => {
    note = field.value;
    paintSize();
  });

  const includes = element('p', 'report-includes', REPORT_WORDS.includes);
  const facts = element('p', 'report-facts');

  const saveButton = element('button', 'btn btn-primary report-save');
  saveButton.type = 'button';
  const saveSize = element('b', 'report-size');
  saveButton.append(element('span', '', REPORT_WORDS.save), saveSize);

  const copyButton = element('button', 'btn report-copy', REPORT_WORDS.copy);
  copyButton.type = 'button';

  const actions = element('div', 'report-actions');
  actions.append(saveButton, copyButton);

  const status = element('p', 'report-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  // Shown only when the clipboard refuses: the summary, selected, to copy by hand.
  const fallback = element('textarea', 'report-summary');
  fallback.readOnly = true;
  fallback.rows = 6;
  fallback.hidden = true;
  fallback.setAttribute('aria-label', 'The summary');

  const reopen = element('p', 'hint report-reopen', REPORT_WORDS.reopen);

  function say(text: string): void {
    status.textContent = text;
  }

  /** The save as text: made now if the idle build has not run yet. */
  function ensureSaveJson(): string | null {
    if (moment === null) return null;
    if (saveJson === null) {
      saveJson = JSON.stringify(moment.save);
      saveBytes = utf8Bytes(saveJson);
    }
    return saveJson;
  }

  function head(): ReportHead | null {
    return moment === null ? null : { ...moment.head, note };
  }

  /** The size on the button: the head with the note as typed, plus the save. */
  function paintSize(): void {
    const current = head();
    if (current === null || saveJson === null) {
      saveSize.textContent = '';
      saveButton.title = 'Getting the file ready';
      return;
    }
    const bytes = utf8Bytes(reportText(current, '')) + saveBytes;
    saveSize.textContent = formatBytes(bytes);
    saveButton.title = `${moment!.filename}, ${formatBytes(bytes)}`;
  }

  function paintFacts(): void {
    if (moment === null) return;
    const { build, game } = moment.head;
    facts.textContent = `${buildStampLine(build)} · turn ${game.turn}`;
  }

  saveButton.addEventListener('click', () => {
    const json = ensureSaveJson();
    const current = head();
    if (json === null || current === null || moment === null) return;
    const text = reportText(current, json);
    options.download(moment.filename, text);
    paintSize();
    say(savedLine(moment.filename, utf8Bytes(text)));
  });

  copyButton.addEventListener('click', () => {
    const current = head();
    if (current === null || moment === null) return;
    const text = reportSummary(current, moment.filename);
    const byHand = (): void => {
      fallback.value = text;
      fallback.hidden = false;
      fallback.focus({ preventScroll: true });
      fallback.select();
      say(REPORT_WORDS.selectToCopy);
    };
    // Asked inside the click, which is the user gesture the clipboard wants.
    try {
      const clipboard = globalThis.navigator?.clipboard;
      if (typeof clipboard?.writeText !== 'function') {
        byHand();
        return;
      }
      clipboard.writeText(text).then(() => {
        fallback.hidden = true;
        say(REPORT_WORDS.copied);
      }, byHand);
    } catch {
      byHand();
    }
  });

  function draw(): void {
    if (body.childElementCount === 0) {
      body.append(label, field, includes, facts, actions, status, fallback, reopen);
    }
    if (field.value !== note) field.value = note;
    paintFacts();
    paintSize();
  }

  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    draw,
    onOpen: () => options.onOpen?.(),
    onShow: () => {
      say('');
      fallback.hidden = true;
    },
    onClose: () => {
      options.returnFocus?.()?.focus({ preventScroll: true });
    },
  });

  function open(): void {
    if (!shell.isOpen) {
      moment = options.capture();
      saveJson = null;
      saveBytes = 0;
      visit += 1;
      const asked = visit;
      // After the sheet has drawn: the save is the one part that grows with
      // the game. See the module docblock.
      whenIdle(() => {
        if (asked !== visit || moment === null || saveJson !== null) return;
        ensureSaveJson();
        paintSize();
      });
    }
    shell.open();
    field.focus({ preventScroll: true });
  }

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    open,
    close: shell.close,
    toggle(): void {
      if (shell.isOpen) shell.close();
      else open();
    },
    refresh: shell.refresh,
    dispose(): void {
      visit += 1;
      moment = null;
      saveJson = null;
      shell.dispose();
    },
  };
}
