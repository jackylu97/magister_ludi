/**
 * A whole bargain's life, replayed byte for byte.
 *
 * `deals.test.ts`' slow half, and it is slow *by kind* rather than by clock
 * (CLAUDE.md's tiering rule): it drives real turns through the resolution
 * pipeline and then compares two full state snapshots, which is the one shape
 * of test that can catch a deal reaching something the log does not carry.
 *
 * What it is actually guarding
 * ---------------------------
 * Everything a deal touches is either a register the save writes or something
 * derived from one — the two treasuries, the lending clause, the tribute lines,
 * the row's absolute expiry — and the guarantee this codebase lives by is that
 * `{config, log}` rebuilds the world. A deal is the first system whose effects
 * are *ongoing* and whose end is a broom in a phase rather than a command, so
 * the honest test is the one that runs the whole span: signed, paying, lapsed.
 */

import { describe, expect, it } from 'vitest';

import { type Command } from '../../src/sim/commands';
import { createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import { RULES } from '../../src/sim/rulesData';

const WAR = RULES.war;

const CONFIG = {
  seed: 727,
  sizeName: 'duel' as const,
  players: [
    { name: 'A', color: '#a00', isHuman: true },
    { name: 'B', color: '#00a', isHuman: true },
  ],
};

/** Ends the turn for every seat, which is what makes the world move. */
function endTurn(game: ReturnType<typeof createGame>): void {
  for (const player of game.state.players) {
    dispatch(game, { type: 'endTurn', playerId: player.id });
  }
}

describe('a bargain’s whole life replays exactly', () => {
  it('is signed, pays its tribute for its span, and lapses — all from the log', () => {
    const game = createGame(CONFIG);

    // A tribute rather than a lump, because the opening treasuries are the
    // config's and a promise costs nothing to make.
    expect(
      dispatch(game, {
        type: 'proposeDeal',
        playerId: 0,
        targetId: 1,
        give: { goldPerTurn: 2 },
        take: {},
      } as unknown as Command).ok,
    ).toBe(true);
    const paper = game.state.dealProposals[0]!.id;
    expect(dispatch(game, { type: 'acceptDeal', playerId: 1, dealId: paper }).ok).toBe(true);
    const signedOn = game.state.turn;
    expect(game.state.deals).toHaveLength(1);
    expect(game.state.deals[0]!.untilTurn).toBe(signedOn + WAR.dealTurns);

    // Run past the expiry, so the broom fires inside a real resolution.
    for (let turn = 0; turn <= WAR.dealTurns; turn++) endTurn(game);
    expect(game.state.turn).toBeGreaterThan(signedOn + WAR.dealTurns);
    expect(game.state.deals).toEqual([]);

    // And a second bargain after the first has lapsed, so the replay has to
    // reproduce the id allocator across a broom as well as across a signature.
    expect(
      dispatch(game, {
        type: 'proposeDeal',
        playerId: 1,
        targetId: 0,
        give: { goldPerTurn: 1 },
        take: {},
      } as unknown as Command).ok,
    ).toBe(true);
    expect(
      dispatch(game, {
        type: 'acceptDeal',
        playerId: 0,
        dealId: game.state.dealProposals[0]!.id,
      }).ok,
    ).toBe(true);
    endTurn(game);

    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });

  it('reproduces a peace with terms, its truce and the row it opened', () => {
    const game = createGame(CONFIG);
    expect(dispatch(game, { type: 'declareWar', playerId: 0, targetId: 1 }).ok).toBe(true);

    // A tribute rather than a right of way, for the first test's reason: the
    // terms have to be ones the opening world can actually sign, and the
    // technology gate on open borders is `deals.test.ts`' own subject.
    expect(
      dispatch(game, {
        type: 'proposePeace',
        playerId: 0,
        targetId: 1,
        give: {},
        take: { goldPerTurn: 3 },
      } as unknown as Command).ok,
    ).toBe(true);
    expect(dispatch(game, { type: 'proposePeace', playerId: 1, targetId: 0 }).ok).toBe(true);
    endTurn(game);

    expect(game.state.wars).toEqual([]);
    expect(game.state.truces).toHaveLength(1);
    expect(game.state.deals).toHaveLength(1);
    expect(game.state.deals[0]!.terms.b.goldPerTurn).toBe(3);
    expect(game.state.deals[0]!.untilTurn).toBe(game.state.turn - 1 + WAR.dealTurns);

    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });
});
