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
  loadingRows,
  loadingStageLabel,
  loadingStages,
  replayDetail,
} from '../../src/ui/loadingSheet';
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

  it('stays up until a frame has been drawn, and comes down on every way out', () => {
    // The last stage ends at the first presented frame, not at `hideLanding`.
    expect(main).toContain("performance.mark('first-board-frame');");
    expect(main).toContain('requestAnimationFrame(() => requestAnimationFrame(() => resolve()));');
    // In the `finally`, so a refused save and a thrown board lower it too.
    const begin = main.slice(
      main.indexOf('async function beginGame('),
      main.indexOf('function terrainBuildProgress('),
    );
    expect(begin.indexOf('loading.finish();')).toBeGreaterThan(begin.indexOf('} finally {'));
  });

  it('is the shell’s furniture, with no door the player can reach', () => {
    const sheet = uiSource('loadingSheet.ts');
    // The frame, not a copy of the contract.
    expect(sheet).toContain('createModalShell({');
    expect(sheet).not.toContain("window.addEventListener('keydown'");
    // No Cancel yet (the ruling): the × is detached, and Escape is answered as
    // handled so the shell does not act on it.
    expect(sheet).toContain("closeButton: document.createElement('button')");
    expect(sheet).toContain('onKey: () => true');
  });

  it('is one sheet across the saves panel’s half of a load and the board’s', () => {
    const panel = uiSource('savesPanel.ts');
    expect(panel).toContain('loading?.begin();');
    expect(panel).toContain('onReplayTurn: loading?.replayed');
    expect(main).toContain("begin: () => loading.begin('save'),");
  });
});
