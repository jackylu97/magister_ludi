/**
 * Report a problem (beta checklist row 10): one file with a note, the build
 * stamp, what was on screen and a save of the game, and the way back in.
 *
 * What a report can be quietly wrong about is the save inside it. A file that
 * looked complete but did not replay to the moment it was taken would waste
 * every tester's report. So the strongest test here loads a report through the
 * game's own gate (`loadSave`) and compares the replayed state with the live
 * one byte for byte, as `saves.test.ts` does for a save.
 *
 * The suite has no DOM. The sheet's drawing is covered through its source; the
 * text, the name, the summary, the size and the error log are pure and are
 * called directly.
 */

import { describe, expect, it } from 'vitest';
import { type Game, dispatch, snapshotState } from '../../src/sim/game';
import { type GameConfig, SCHEMA_VERSION, hasEndedTurn } from '../../src/sim/state';
import { REPORT_KIND, SAVE_FORMAT_VERSION, loadSave, makeSavePayload } from '../../src/ui/saves';
import { BUILD_STAMP, buildStampLine, saveVersionLine } from '../../src/ui/buildStamp';
import { createErrorLog } from '../../src/ui/errorLog';
import { loadSaveAsync } from '../../src/ui/gameLoader';
import {
  REPORT_FORMAT,
  REPORT_WORDS,
  type ReportView,
  formatBytes,
  reportFilename,
  reportMoment,
  reportSummary,
  reportText,
  savedLine,
  utf8Bytes,
} from '../../src/ui/problemReport';
import { createGame } from '../sim/newGameHelpers';
import { braceBody, uiSource } from './sourceHelpers';

const SLOW = { timeout: 30_000 } as const;

function config(): GameConfig {
  return {
    seed: 4242,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#e8503a', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  };
}

function endTurns(game: Game, count: number): void {
  for (let i = 0; i < count; i++) {
    for (const player of game.state.players) {
      if (hasEndedTurn(game.state, player.id)) continue;
      expect(dispatch(game, { type: 'endTurn', playerId: player.id }).ok).toBe(true);
    }
  }
}

const VIEW: ReportView = {
  open: ['menu'],
  recent: ['diplomacy', 'menu'],
  city: { id: 7, name: 'Uruk' },
  unit: { id: 12, type: 'warrior', col: 4, row: 5 },
  lens: 'none',
  boardLens: 'none',
};

function momentOf(game: Game, now = Date.UTC(2026, 10, 21, 12, 0, 0)) {
  return reportMoment({
    game,
    seat: 0,
    saveName: 'Rome',
    view: VIEW,
    browser: { userAgent: 'TestBrowser/1.0', width: 1440, height: 900, pixelRatio: 2 },
    errors: [{ at: now - 1000, message: 'boom' }],
    now,
  });
}

describe('the report file', SLOW, () => {
  it('holds the note, the stamp, the browser, the game, the screen, the errors and the save', () => {
    const game = createGame(config());
    endTurns(game, 2);
    const moment = momentOf(game);
    const report = JSON.parse(reportText({ ...moment.head, note: 'The city panel froze.' }, JSON.stringify(moment.save)));
    expect(report.kind).toBe(REPORT_KIND);
    expect(report.reportFormat).toBe(REPORT_FORMAT);
    expect(report.note).toBe('The city panel froze.');
    expect(report.build).toEqual(BUILD_STAMP);
    expect(report.build.schemaVersion).toBe(SCHEMA_VERSION);
    expect(report.createdAt).toBe('2026-11-21T12:00:00.000Z');
    expect(report.browser).toEqual({ userAgent: 'TestBrowser/1.0', width: 1440, height: 900, pixelRatio: 2 });
    expect(report.game.turn).toBe(game.state.turn);
    expect(report.game.seat).toBe(0);
    expect(report.game.seats).toBe(2);
    expect(report.view).toEqual(VIEW);
    expect(report.errors).toEqual([{ at: Date.UTC(2026, 10, 21, 11, 59, 59), message: 'boom' }]);
    // The save is the one Export writes, at the moment the sheet opened.
    expect(report.save).toEqual(JSON.parse(JSON.stringify(makeSavePayload(game, 'Rome', report.save.savedAt))));
    expect(report.save.formatVersion).toBe(SAVE_FORMAT_VERSION);
  });

  it('fixes the save at the moment it was taken, whatever is played after', () => {
    const game = createGame(config());
    endTurns(game, 1);
    const moment = momentOf(game);
    const length = game.log.length;
    endTurns(game, 2);
    expect(moment.save.log).toHaveLength(length);
    expect(moment.save.turn).toBeLessThan(game.state.turn);
  });

  it('opens through the load gate and replays to the same state, byte for byte', () => {
    const game = createGame(config());
    endTurns(game, 3);
    const moment = momentOf(game);
    const text = reportText({ ...moment.head, note: 'Load me.' }, JSON.stringify(moment.save));
    const result = loadSave(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.game.state.turn).toBe(game.state.turn);
    expect(snapshotState(result.game.state)).toBe(snapshotState(game.state));
    // And it plays on in step with the game it came from.
    endTurns(result.game, 1);
    endTurns(game, 1);
    expect(snapshotState(result.game.state)).toBe(snapshotState(game.state));
  });

  it('opens through the load list’s Import path, which walks the log off the thread', async () => {
    const game = createGame(config());
    endTurns(game, 2);
    const moment = momentOf(game);
    const text = reportText(moment.head, JSON.stringify(moment.save));
    // No worker and no IndexedDB in this suite, so the walk runs here; the gate
    // is the same `readSaveEnvelope` either way.
    const result = await loadSaveAsync(text, { checkpoints: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.turn).toBe(game.state.turn);
    expect(snapshotState(result.game.state)).toBe(snapshotState(game.state));
  });

  it('refuses a report with no save in it, and checks the save inside like any other', () => {
    expect(loadSave(JSON.stringify({ kind: REPORT_KIND, note: 'x' }))).toMatchObject({
      ok: false,
      error: 'That report has no save in it.',
    });
    const game = createGame(config());
    const moment = momentOf(game);
    const older = { ...moment.save, schemaVersion: SCHEMA_VERSION - 1 };
    expect(loadSave(reportText(moment.head, JSON.stringify(older)))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/from an older build of the game and cannot continue here/),
    });
    // A developer who opens an old report is told which build made it.
    expect(loadSave(reportText(moment.head, JSON.stringify(older)))).toMatchObject({
      error: expect.stringContaining(`Build ${moment.head.build.commit} made this report.`),
    });
  });

  it('writes the head for a person to read and the save on one line', () => {
    const game = createGame(config());
    const moment = momentOf(game);
    const saveJson = JSON.stringify(moment.save);
    const text = reportText(moment.head, saveJson);
    expect(text.startsWith('{\n  "kind": "magister-ludi-report",')).toBe(true);
    expect(text).toContain(`\n  "save": ${saveJson}\n}`);
    // The size is the size of the bytes the browser saves.
    expect(utf8Bytes(text)).toBe(new TextEncoder().encode(text).length);
    expect(utf8Bytes(reportText(moment.head, '')) + utf8Bytes(saveJson)).toBe(utf8Bytes(text));
  });

  it('is named for the local date and the turn', () => {
    expect(reportFilename(new Date(2026, 0, 5, 23, 30), 42)).toBe('magister-ludi-report-2026-01-05-turn42.json');
    const game = createGame(config());
    expect(momentOf(game, new Date(2026, 10, 21, 9, 0).getTime()).filename).toBe(
      `magister-ludi-report-2026-11-21-turn${game.state.turn}.json`,
    );
  });
});

describe('the words', () => {
  it('prints sizes the way a file manager does', () => {
    expect(formatBytes(812)).toBe('812 B');
    expect(formatBytes(64 * 1024)).toBe('64 KB');
    expect(formatBytes(1500)).toBe('1 KB');
    expect(formatBytes(Math.round(1.4 * 1024 * 1024))).toBe('1.4 MB');
    expect(savedLine('a.json', 2048)).toBe('Saved a.json (2 KB).');
  });

  it('puts the note, the build, the turn, the seat and the screen in the summary', () => {
    const game = createGame(config());
    const moment = momentOf(game);
    const summary = reportSummary({ ...moment.head, note: '  The paper would not send.  ' }, moment.filename);
    expect(summary).toContain('What happened: The paper would not send.');
    expect(summary).toContain(`Build ${BUILD_STAMP.commit}, save version ${SCHEMA_VERSION}`);
    expect(summary).toContain(`Turn ${game.state.turn}, seat 0: `);
    // The decks as a list a person reads: commas, then "and" before the last.
    const decks = moment.head.game.decks;
    if (decks.length > 1) {
      expect(summary).toContain(`(${decks.slice(0, -1).join(', ')} and ${decks[decks.length - 1]})`);
    }
    expect(summary).toContain('city Uruk');
    expect(summary).toContain('unit warrior at 4,5');
    // The newest screen first, each once.
    expect(summary).toContain('screens menu, diplomacy');
    expect(summary).toContain(`Report file: ${moment.filename}`);
    expect(reportSummary(moment.head, moment.filename)).toContain('What happened: No note written.');
  });

  it('says what the file holds and that nothing is sent, with no figure in the prose', () => {
    expect(REPORT_WORDS.includes).toContain('Nothing is sent');
    for (const text of Object.values(REPORT_WORDS)) expect(/\d/.test(text), text).toBe(false);
    expect(buildStampLine({ commit: 'a1b2c3d', schemaVersion: 254, saveFormat: 1 })).toBe('a1b2c3d · save version 254');
  });
});

describe('the error log', () => {
  it('keeps the last uncaught errors and rejections, with the clock it is given', () => {
    const target = new EventTarget();
    let clock = 100;
    const log = createErrorLog(target, () => clock, 2);
    target.dispatchEvent(
      Object.assign(new Event('error'), { message: 'first', error: new Error('first'), filename: 'a.js', lineno: 3 }),
    );
    clock = 200;
    target.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: new Error('second') }));
    clock = 300;
    target.dispatchEvent(Object.assign(new Event('error'), { message: 'third' }));
    const lines = log.lines();
    // The cap keeps the newest.
    expect(lines.map((line) => [line.at, line.message])).toEqual([
      [200, 'Unhandled promise rejection: second'],
      [300, 'third'],
    ]);
    expect(lines[0]!.stack).toContain('second');
    log.dispose();
    target.dispatchEvent(Object.assign(new Event('error'), { message: 'after' }));
    expect(log.lines()).toHaveLength(2);
  });

  it('records where the browser said an error was thrown', () => {
    const target = new EventTarget();
    const log = createErrorLog(target, () => 1);
    target.dispatchEvent(Object.assign(new Event('error'), { message: 'x', filename: 'chunk.js', lineno: 9 }));
    expect(log.lines()[0]).toEqual({ at: 1, message: 'x', where: 'chunk.js:9' });
  });
});

describe('the sheet and its wiring', () => {
  const sheet = uiSource('problemReport.ts');
  const main = uiSource('main.ts');
  const html = uiSource('index.html');
  /** The module with its comments taken out: the rule is the code, not the prose. */
  const code = sheet.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

  it('sends nothing anywhere', () => {
    for (const call of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'postMessage(']) {
      expect(code.includes(call), call).toBe(false);
    }
  });

  it('builds on the sheet frame and is registered, disposed and opened from the menu', () => {
    expect(sheet).toContain('createModalShell({');
    expect(main).toContain("screens.register(held('report', 'screen', () => problemReport));");
    expect(main).toContain('gameDisposers.push(() => problemReport?.dispose());');
    expect(main).toContain("onOpen: () => screens.opening('report'),");
    expect(main).toContain("menuReportButton.addEventListener('click', () => {");
    expect(html).toContain('id="menu-report"');
    expect(html).toContain('Report a problem…');
    expect(html).toContain('id="report-overlay"');
  });

  it('prints the build stamp in the menu, as two short rows', () => {
    expect(html).toContain('<dd id="info-build">');
    expect(html).toContain('<dd id="info-save-version">');
    expect(main).toContain("requireElement<HTMLElement>('info-build').textContent = BUILD_STAMP.commit;");
    expect(main).toContain("requireElement<HTMLElement>('info-save-version').textContent = saveVersionLine();");
    expect(saveVersionLine({ commit: 'x', schemaVersion: 254, saveFormat: 1 })).toBe('version 254');
  });

  it('copies inside the click, and falls back to a selected text', () => {
    const copy = sheet.slice(sheet.indexOf("copyButton.addEventListener('click'"));
    const body = copy.slice(0, copy.indexOf('\n  });\n'));
    expect(body).toContain('clipboard.writeText(text)');
    expect(body).toContain('fallback.select();');
  });

  it('takes the moment before the shell opens, and turns the save into text later', () => {
    const open = braceBody(sheet, '  function open(): void {');
    expect(open.indexOf('moment = options.capture();')).toBeLessThan(open.indexOf('shell.open();'));
    expect(open).toContain('whenIdle(');
    expect(open).not.toMatch(/JSON\.stringify/);
  });
});
