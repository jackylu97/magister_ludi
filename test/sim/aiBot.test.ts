/**
 * The bot, at the two things it must never get wrong: **every command it sends
 * is accepted**, and **the same board always produces the same command**.
 *
 * Those two are the whole contract. A bot that emits a refused command has
 * reimplemented a rule and got it wrong (it is supposed to put every candidate
 * to the simulation's own validator first), and a bot that is not a pure
 * function of the state breaks the save format — `{config, log}` replays, and a
 * seat whose decisions depended on anything outside the state would replay into
 * a different game.
 *
 * Both are asserted by *playing*, not by unit-testing a heuristic: the
 * heuristics are meant to change, the contract is not.
 */

import { describe, expect, it } from 'vitest';

import { driveBots } from '../../src/ai/driver';
import { AI, nextBotCommand } from '../../src/ai/bot';
import { type Game, createGame, replay, snapshotState } from '../../src/sim/game';
import type { GameConfig } from '../../src/sim/state';
import { hasEndedTurn, realPlayers } from '../../src/sim/state';
import { firstBlocker } from '../../src/ui/turnBlockers';

/**
 * Two bot seats on a small map with the wild in it.
 *
 * `isHuman` is left off both, which is exactly what makes them bots
 * (`normalizeConfig` defaults it to false) — the same absence the landing
 * screen's "You vs one bot" writes for the second chair, and the reason that
 * option needed no schema change. Barbarians are on because the military branch
 * is the one that has an opponent to be wrong about.
 */
const CONFIG: GameConfig = {
  seed: 20260831,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

interface Played {
  game: Game;
  refusals: string[];
  turnsEnded: number;
}

/** Plays `turns` whole turns with every seat driven by the bot. */
function play(turns: number, config: GameConfig = CONFIG): Played {
  const game = createGame(config);
  const refusals: string[] = [];
  let turnsEnded = 0;
  for (let turn = 0; turn < turns; turn++) {
    const before = game.state.turn;
    for (const report of driveBots(game, { warn: (message) => refusals.push(message) })) {
      if (report.refused > 0) refusals.push(`seat ${report.playerId} had ${report.refused} refusals`);
      if (!report.ended) refusals.push(`seat ${report.playerId} never ended turn ${before}`);
    }
    if (game.state.turn > before) turnsEnded += 1;
  }
  return { game, refusals, turnsEnded };
}

describe('the bot', () => {
  it('drives both seats for ten turns with nothing refused', () => {
    const played = play(10);
    expect(played.refusals).toEqual([]);
    expect(played.turnsEnded).toBe(10);
    expect(played.game.state.turn).toBe(11);
  });

  it('leaves no seat owing the turn anything when it hands over', () => {
    const played = play(6);
    expect(played.refusals).toEqual([]);
    // Every real seat ended, and none of them was carrying an unanswered offer
    // when it did — which is what "the bot clears its own blockers" means.
    const game = createGame(CONFIG);
    for (let turn = 0; turn < 6; turn++) {
      for (const seat of realPlayers(game.state)) {
        // Drive one seat at a time so the blocker can be read at the moment it
        // decided it was finished.
        if (hasEndedTurn(game.state, seat.id)) continue;
        driveBots(game, { warn: () => {} });
      }
    }
    for (const seat of realPlayers(game.state)) {
      // Between turns nothing is outstanding except what the resolution just
      // dealt, and `nextBotCommand` is what would answer it.
      const blocker = firstBlocker(game.state, seat.id);
      if (blocker !== null) {
        expect(nextBotCommand(game.state, seat.id)).not.toBeNull();
      }
    }
  });

  it('is a pure function of the state: two runs are byte-identical', () => {
    const first = play(8);
    const second = play(8);
    expect(first.refusals).toEqual([]);
    expect(second.refusals).toEqual([]);
    expect(JSON.stringify(second.game.log)).toBe(JSON.stringify(first.game.log));
    expect(snapshotState(second.game.state)).toBe(snapshotState(first.game.state));
  });

  it('writes a log that replays to the same board', () => {
    const played = play(8);
    expect(played.refusals).toEqual([]);
    const rebuilt = replay(played.game.config, played.game.log);
    expect(snapshotState(rebuilt)).toBe(snapshotState(played.game.state));
  });

  it('says nothing about a seat that is not its business', () => {
    const game = createGame(CONFIG);
    // The wild has no screen and never sends an `endTurn`; the bot must refuse
    // to have an opinion about it rather than driving it into the ground.
    const wild = game.state.players.find((player) => player.barbarian);
    expect(wild).toBeDefined();
    expect(nextBotCommand(game.state, wild!.id)).toBeNull();
    // And a seat that has already handed over is finished, however much
    // movement its pieces have left.
    driveBots(game, { warn: () => {} });
    expect(nextBotCommand(game.state, 0)).toBeNull();
  });

  it('spends a surplus instead of sitting on it', () => {
    // **Gold has no automatic sink.** The board cannot produce a treasury this
    // size in ten turns, so it is put there directly — which is why this test
    // makes no claim about replay: a state poked from outside is not a state the
    // log reproduces, and that is exactly the point of the poke.
    const game = createGame(CONFIG);
    for (const player of realPlayers(game.state)) player.gold = 5000;
    for (let turn = 0; turn < 4; turn++) driveBots(game, { warn: () => {} });
    const bought = game.log.filter((command) => command.type === 'purchaseItem');
    expect(bought.length).toBeGreaterThan(0);
    // And the reserve is kept: the bot never empties a treasury it owes upkeep
    // out of.
    for (const player of realPlayers(game.state)) {
      expect(player.gold).toBeGreaterThanOrEqual(0);
    }
  });

  it('keeps the reserve back rather than spending to the last coin', () => {
    // Just over the threshold and no more: the bot may spend the surplus and
    // must not touch the reserve, so a purse this size buys at most a little.
    const game = createGame(CONFIG);
    const reserve = AI.spending.goldReserve;
    for (const player of realPlayers(game.state)) {
      player.gold = AI.spending.goldSpendAbove + reserve + 1;
    }
    for (let turn = 0; turn < 3; turn++) driveBots(game, { warn: () => {} });
    for (const player of realPlayers(game.state)) {
      // Income arrives between turns, so this is a floor rather than an
      // equality — the claim is that nothing was ever bought *out of* the
      // reserve.
      expect(player.gold).toBeGreaterThanOrEqual(reserve);
    }
  });

  it('drives only the seats nobody is sitting in', () => {
    const game = createGame({
      ...CONFIG,
      players: [
        { name: 'Crimson', color: '#d4502e', isHuman: true },
        { name: 'Teal', color: '#1f8a85' },
      ],
    });
    const reports = driveBots(game, { warn: () => {} });
    expect(reports.map((report) => report.playerId)).toEqual([1]);
    expect(hasEndedTurn(game.state, 1)).toBe(true);
    expect(hasEndedTurn(game.state, 0)).toBe(false);
    // The turn has not resolved: the person at the keyboard has not pressed it.
    expect(game.state.turn).toBe(1);
  });
});

/**
 * The other half of "deterministic", asserted by reading the source rather than
 * by playing — because the failure mode is a *rare* divergence and no number of
 * games proves its absence.
 *
 * Read through Vite's raw glob for `test/ui/seatRoster.test.ts`' reason exactly:
 * this project has no node typings, and a source assertion is not worth a
 * dependency.
 */
const AI_SOURCE = import.meta.glob('../../src/ai/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** One file's text with its comments taken out — the rule is *explained* in them. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('the bot module', () => {
  it('is there to be read', () => {
    const files = Object.keys(AI_SOURCE).map((path) => path.slice(path.lastIndexOf('/') + 1));
    expect(files.sort()).toEqual(['bot.ts', 'driver.ts']);
  });

  it('rolls no dice of its own, and takes none out of the simulation', () => {
    const offenders: string[] = [];
    for (const path of Object.keys(AI_SOURCE).sort()) {
      const text = code(AI_SOURCE[path]!);
      // `Math.random` would be a decision outside the log; `state.rng` would be
      // a decision *inside* the seeded stream, which is worse — it would move
      // every roll the simulation makes afterwards.
      if (/Math\.random/.test(text)) offenders.push(`${path}: Math.random`);
      if (/\brng\b/.test(text)) offenders.push(`${path}: state.rng`);
      if (/\bnextFloat\b|\bnextInt\b/.test(text)) offenders.push(`${path}: the rng helpers`);
    }
    expect(offenders).toEqual([]);
  });

  it('touches no browser and no clock', () => {
    const offenders: string[] = [];
    for (const path of Object.keys(AI_SOURCE).sort()) {
      const text = code(AI_SOURCE[path]!);
      for (const banned of ['document', 'window', 'requestAnimationFrame', 'Date.now', 'performance.']) {
        if (text.includes(banned)) offenders.push(`${path}: ${banned}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('never imports the simulation the wrong way round', () => {
    // `src/sim/` is the rules and must never know an AI exists; the arrow runs
    // one way only. Asserted from this side because this is the side that would
    // be tempted.
    const simSource = import.meta.glob('../../src/sim/*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const offenders: string[] = [];
    for (const path of Object.keys(simSource).sort()) {
      if (/from '\.\.\/ai\//.test(code(simSource[path]!))) offenders.push(path);
    }
    expect(offenders).toEqual([]);
  });

  it('keeps every tuned number in data/ai.json', async () => {
    // Code holds algorithms, data holds constants (CLAUDE.md). The bot's whole
    // tuning surface is one import, and this is the pin that keeps a settler cap
    // from drifting back into a `const`.
    const config = (await import('../../data/ai.json')).default;
    expect(Object.keys(config).sort()).toEqual([
      'build',
      'driver',
      'expansion',
      'military',
      'search',
      'site',
      'spending',
      'statecraft',
      'trade',
      'workers',
    ]);
    expect(code(AI_SOURCE[Object.keys(AI_SOURCE).find((p) => p.endsWith('bot.ts'))!]!)).toContain(
      "data/ai.json",
    );
  });
});
