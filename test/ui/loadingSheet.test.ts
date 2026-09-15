/**
 * The loading sheet: what it says, on which journey, and that it is gone once
 * the board has drawn.
 *
 * Two halves, for the reason every UI pass in this suite splits the same way —
 * there is no jsdom here (`controls.test.ts`'s note), so the *words and the
 * arithmetic* are pure functions with real assertions over them, and the DOM
 * glue that shows them is pinned by reading the source that wires it. The
 * ruling is `docs/flags.md` (eeeee).
 *
 * The one claim that is neither words nor glue is the **rate**: a report per
 * turn, not per command. That one is measured against a real log, because "per
 * turn" is a promise about a number and the number is four thousand out if the
 * watcher is hung on the wrong loop.
 */

import { describe, expect, it } from 'vitest';

import { driveBots } from '../../src/ai/driver';
import { createGame, snapshotState, tryReplay } from '../../src/sim/game';
import { type GameConfig, normalizeConfig } from '../../src/sim/state';
import {
  REFUSAL_WAY_OUT,
  loadingFace,
  loadingRows,
  loadingStageLabel,
  loadingStages,
  refusalSentence,
  replayDetail,
} from '../../src/ui/loadingSheet';
import { loadSave, makeSavePayload } from '../../src/ui/saves';
import { uiSource } from './sourceHelpers';

const CONFIG: GameConfig = {
  seed: 20260914,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

describe('the stages a journey walks', () => {
  it('names four for a save and the last two for a new world', () => {
    expect(loadingStages('save')).toEqual(['opening', 'replaying', 'painting', 'placing']);
    // A new world has no file to open and no log to walk, so it has nothing to
    // say about either — the ruling's "the first two are absent".
    expect(loadingStages('new')).toEqual(['painting', 'placing']);
  });

  it('says each stage in a first-time player’s words', () => {
    expect(loadingStages('save').map(loadingStageLabel)).toEqual([
      'Opening the save',
      'Replaying the game',
      'Painting the world',
      'Placing the pieces',
    ]);
  });

  it('marks everything before the running stage done and everything after it waiting', () => {
    const rows = loadingRows(loadingStages('save'), 'painting', 0.4, '');
    expect(rows.map((row) => row.standing)).toEqual(['done', 'done', 'now', 'waiting']);
    // Only the running stage carries a bar and a detail; the rest draw neither.
    expect(rows.map((row) => row.fraction)).toEqual([null, null, 0.4, null]);
    expect(rows.filter((row) => row.detail !== '')).toHaveLength(0);
  });

  it('counts the replay in turns, against the turn the file’s label expects', () => {
    expect(replayDetail(84, 121)).toBe('turn 84 of 121');
    // A label that under-counts is not allowed to draw a bar past its own end.
    expect(replayDetail(130, 121)).toBe('turn 130 of 130');
    // A file with no usable label still says where the walk has got to.
    expect(replayDetail(9, 0)).toBe('turn 9');
  });
});

/**
 * The ruling's second row (`docs/flags.md` (yyyyy)): a save whose log the
 * current rules refuse used to stop the walk and say nothing, leaving the stage
 * it died on as the last word on the subject.
 */
describe('a save the rules will not replay', () => {
  const stages = loadingStages('save');

  it('replaces the stage list with the sentence, rather than freezing on a stage', () => {
    // The state the bug leaves behind: the walk stopped at turn four of a
    // hundred and twenty-one, and that is all the sheet ever said.
    const stuck = loadingFace(stages, 'replaying', 4 / 121, replayDetail(4, 121), null);
    expect(stuck.kind).toBe('stages');

    const refused = loadingFace(stages, 'replaying', 4 / 121, replayDetail(4, 121), {
      error: 'That save is corrupt or from an incompatible build.',
      detail: 'Replay stopped at command 49 (fortify): No unit with id 19',
    });
    if (refused.kind !== 'refusal') throw new Error('expected the refusal to take the paper');
    // Nothing further is going to happen, so the four stages are gone and the
    // sentence is the whole of the paper.
    expect(refused).toEqual({
      kind: 'refusal',
      sentence:
        'This save could not be opened: That save is corrupt or from an incompatible build.',
      detail: 'Replay stopped at command 49 (fortify): No unit with id 19',
      wayOut: 'Back to the title',
    });
    expect(REFUSAL_WAY_OUT).toBe('Back to the title');
  });

  it('prints the gate’s own sentence, never a second opinion about it', () => {
    // The whole journey, end to end: a good log with one command the reducer
    // will not accept wedged into it, through `saves.ts`'s gate, onto the paper.
    const game = createGame(CONFIG);
    for (let turn = 0; turn < 6; turn++) driveBots(game, { warn: () => undefined });
    const payload = JSON.parse(
      JSON.stringify(makeSavePayload(game, 'Pinned', 1_757_000_000_000)),
    ) as { log: unknown[] };
    const at = Math.floor(payload.log.length / 2);
    payload.log.splice(at, 0, { type: 'moveUnit', playerId: 0, unitId: 9_999, col: 0, row: 0 });

    const result = loadSave(JSON.stringify(payload));
    if (result.ok) throw new Error('expected the gate to refuse the log');
    const face = loadingFace(stages, 'replaying', null, '', {
      error: result.error,
      detail: result.detail,
    });
    if (face.kind !== 'refusal') throw new Error('expected a refusal');
    // The sentence the saves panel prints beside a broken row, with the sheet's
    // own lead in front of it and nothing else changed.
    expect(face.sentence).toBe(refusalSentence(result.error));
    expect(face.sentence).toContain(result.error);
    // And the index the walk stopped at, which used to reach the console alone.
    expect(face.detail).toContain(`command ${at}`);
    expect(face.detail).toContain('moveUnit');
  });

  it('says nothing of its own when there is nothing wrong', () => {
    const face = loadingFace(stages, 'painting', 0.5, '', null);
    if (face.kind !== 'stages') throw new Error('expected the stage list');
    expect(face.rows.map((row) => row.label)).toEqual([
      'Opening the save',
      'Replaying the game',
      'Painting the world',
      'Placing the pieces',
    ]);
  });

  it('carries no detail line when the walk never named a command', () => {
    // A config the simulation will not build refuses before a single command is
    // read, so there is no index to print and the sheet prints none.
    const face = loadingFace(stages, 'opening', null, '', {
      error: 'That save’s setup is not one this build can play: unknown size.',
    });
    if (face.kind !== 'refusal') throw new Error('expected a refusal');
    expect(face.detail).toBe('');
  });
});

describe('the replay reports once per turn, not once per command', () => {
  it('sends about as many reports as the log has turns', () => {
    // Forty-odd turns rather than the hundred-and-twenty of the measured save:
    // the claim is a *ratio* — a report a turn against several commands a turn
    // — and it bites at the first turn a bot does more than end one. A
    // hundred-and-twenty-turn bot game is a slow-tier workload by kind
    // (CLAUDE.md), and this pin is a core one.
    const game = createGame(CONFIG);
    for (let turn = 0; turn < 45; turn++) {
      driveBots(game, { warn: () => undefined });
      if (game.state.winnerId !== null) break;
    }
    const reached = game.state.turn;
    const commands = game.log.length;

    const turns: number[] = [];
    const replayed = tryReplay(game.config, game.log, (turn) => turns.push(turn));
    if (!replayed.ok) throw new Error('expected the log to replay');

    // The whole of the rate claim: a report a turn (plus the one at the start),
    // and nowhere near a report a command.
    expect(turns.length).toBeLessThanOrEqual(reached + 1);
    expect(turns.length).toBeGreaterThanOrEqual(reached - 1);
    expect(commands).toBeGreaterThan(turns.length * 4);
    // Forwards only, and it arrives at the turn the game is on.
    expect([...turns].sort((a, b) => a - b)).toEqual(turns);
    expect(turns[turns.length - 1]).toBe(reached);
  });

  it('changes nothing about the state it is watching', () => {
    const game = createGame(CONFIG);
    for (let turn = 0; turn < 8; turn++) driveBots(game, { warn: () => undefined });
    const config = normalizeConfig(game.config);
    const quiet = tryReplay(config, game.log);
    const watched = tryReplay(config, game.log, () => undefined);
    if (!quiet.ok || !watched.ok) throw new Error('expected both to replay');
    // Determinism (CLAUDE.md hard rule 2): the watcher is handed numbers and
    // has nothing to reach, so the walk is the same walk.
    expect(snapshotState(watched.state)).toBe(snapshotState(quiet.state));
  });
});

describe('the sheet on the page', () => {
  const main = uiSource('main.ts');

  it('is raised on both journeys and told which one it is', () => {
    expect(main).toContain("loading.begin(load !== null ? 'save' : 'new');");
    // Built with the page's own cards, not in `boot`: it is up *while* `boot`
    // runs, so a per-game disposer would pull it down mid-load.
    expect(main).toContain('const loading = createLoadingSheet({');
    expect(main).not.toContain('gameDisposers.push(() => loading');
  });

  it('is fed by the replay worker and by the terrain worker, and by nothing else', () => {
    // The second stage: the loader's per-turn watcher, on both routes in.
    expect(main).toContain('onReplayTurn: replayProgress');
    expect(main).toContain('loading.replayed(turn, expected)');
    // The third and fourth: the terrain worker's own percentage, which used to
    // be written into the Begin button's label and is now the sheet's.
    expect(main).toContain('function terrainBuildProgress(percent: number): void {\n  loading.painted(percent);\n}');
    expect(main).not.toContain('`Painting the world… ${percent}%`');
  });

  it('is turned into the refusal by the one press that learns of one', () => {
    const begin = main.slice(
      main.indexOf('async function beginGame('),
      main.indexOf('function terrainBuildProgress('),
    );
    // Both halves of what the walk reported: the player's sentence and the
    // command index `tryReplay` produced, onto the paper the player has been
    // watching since the press.
    expect(begin).toContain('loading.refuse({ error, detail });');
    // And still where the player will be when the sheet comes down, and still
    // in the console for whoever has to fix the file.
    expect(begin).toContain('landingErrorEl.textContent = error;');
    expect(begin).toContain('console.error(`[magister-ludi save] ${detail}`)');
    // Raised before it is refused, so the refusal replaces a sheet rather than
    // arriving out of nowhere.
    expect(begin.indexOf("loading.begin(load !== null ? 'save' : 'new');")).toBeLessThan(
      begin.indexOf('loading.refuse('),
    );
  });

  it('seals itself on a refusal, and has exactly one way out of it', () => {
    const sheet = uiSource('loadingSheet.ts');
    // `finish` is the caller's `finally`, and it is the line that used to lose
    // the sentence. A refused sheet ignores it.
    expect(sheet).toContain('if (refusal !== null) return;\n      shell.close();');
    // The way out is the button and Escape, both arriving at the shell's one
    // `close`, which clears the refusal on the way past.
    expect(sheet).toContain("backButton.addEventListener('click', () => shell.close());");
    expect(sheet).toContain('onKey: () => refusal === null,');
    expect(sheet).toContain('const dismissed = refusal !== null;\n      refusal = null;');
    // A fresh press is a fresh sheet of paper, and a disposed sheet remembers
    // nothing: neither can leave a refusal standing over the next load.
    expect(sheet).toContain('refusal = null;\n      shell.open();');
    expect(sheet).toContain('refusal = null;\n      shell.dispose();');
    // A progress line still in flight cannot put the stage list back over it.
    expect(sheet).toContain('if (refusal !== null) return;\n    // Forwards only.');
    // The H5 contract's last clause, for the one state where this sheet is a
    // control: the keyboard goes back to the title's own button.
    expect(sheet).toContain('if (dismissed) options.returnFocus?.()?.focus({ preventScroll: true });');
    expect(main).toContain('returnFocus: () => (continueButton.hidden ? null : continueButton),');
  });

  it('marks the shelf row that refused, and forgets one that opens', () => {
    // The load list marks a broken file by leaving the row standing with the
    // refusal beside it; the shelf is the same list with fewer words.
    expect(main).toContain('const refusedSlots = new Map<string, string>();');
    expect(main).toContain('if (result === null || result.ok) refusedSlots.delete(slotId);');
    expect(main).toContain('else refusedSlots.set(slotId, result.error);');
    expect(main).toContain('if (slotId !== null) noteSlotOutcome(slotId, result);');
    // The row itself: pressable still, but reading as spent and saying so.
    expect(main).toContain("row.classList.add('is-refused');");
    expect(main).toContain("when.textContent = 'would not open';");
    expect(main).toContain('row.title = refusal;');
    // And Continue, which is the shelf's first row wearing a different hat.
    expect(main).toContain('const newestRefused = newest !== undefined && refusedSlots.has(newest.slot.id);');
    expect(main).toContain(
      '`${newest.figure} · seed ${newest.slot.seed} · would not open`',
    );
    expect(main).toContain("continueButton.classList.toggle('is-refused', newestRefused);");
  });

  it('stays up until a frame has been drawn, and comes down on every way out', () => {
    // The last stage ends on a frame actually drawn with the landing down —
    // later than P1's `first-board-frame`, which marks a frame drawn inside
    // `boot` with the landing still over it. The sheet reads the later seam and
    // leaves every mark alone (`test/render/paintedBenchmark.test.ts` is the
    // marks' own register).
    expect(main).toContain('requestAnimationFrame(() => requestAnimationFrame(() => resolve()));');
    const wait = main.indexOf('requestAnimationFrame(() => requestAnimationFrame(() => resolve()))');
    expect(wait).toBeGreaterThan(main.indexOf('hideLanding();\n    performance.mark'));
    // In the `finally`, so a thrown board lowers it too. (A refused save is the
    // stated exception, and the exception lives in the sheet — see its own pin
    // above — so this line stays exactly where it was.)
    const begin = main.slice(
      main.indexOf('async function beginGame('),
      main.indexOf('function terrainBuildProgress('),
    );
    expect(begin.indexOf('loading.finish();')).toBeGreaterThan(begin.indexOf('} finally {'));
  });

  it('is the shell’s furniture, with no door the player can reach while it waits', () => {
    const sheet = uiSource('loadingSheet.ts');
    // The frame, not a copy of the contract.
    expect(sheet).toContain('createModalShell({');
    expect(sheet).not.toContain("window.addEventListener('keydown'");
    // No Cancel yet (the ruling): the × is detached, and while a load is running
    // Escape is answered as handled so the shell does not act on it. `refusal
    // === null` is the whole of "while a load is running" — the one state where
    // there is something to dismiss is the one state that obeys the key.
    expect(sheet).toContain("closeButton: document.createElement('button')");
    expect(sheet).toContain('onKey: () => refusal === null');
  });

  it('is one sheet across the saves panel’s half of a load and the board’s', () => {
    const panel = uiSource('savesPanel.ts');
    expect(panel).toContain('loading?.begin();');
    expect(panel).toContain('onReplayTurn: loading?.replayed');
    expect(main).toContain("begin: () => loading.begin('save'),");
  });
});
