/**
 * **The grid search's judge** — `scripts/gridObjective.ts`, batch 7 of
 * `docs/bot-priorities.md`.
 *
 * The harness itself is a tool and asserts nothing: it plays mirror matches and
 * prints a table, and the reading of that table is a paragraph in the doc. What
 * *is* worth pinning is the half a reader has to trust before the table means
 * anything — **what a played game is scored as**:
 *
 *   · the fold is the arithmetic the doc says it is, term by term;
 *   · it is taken at the **file's own weights for both seats**, so a candidate
 *     that raises a weight cannot win by being marked at its own raised weight;
 *   · it is deterministic — two readings of one board are one number.
 *
 * The harness's own module is deliberately not imported here (importing a script
 * would run it); the judge is a module of its own for exactly that reason.
 */

import { describe, expect, it } from 'vitest';

import { AI } from '../../src/ai/bot';
import { VOICES, yieldWeight } from '../../src/ai/value';
import { driveBots } from '../../src/ai/driver';
import { withAiTuning } from '../../src/ai/aiConfig';
import { type Standing, foldStanding, standingOf } from '../../scripts/gridObjective';
import { type Game, createGame } from '../../src/sim/game';
import type { GameConfig } from '../../src/sim/state';

const CONFIG: GameConfig = {
  seed: 20260831,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

function playedGame(turns = 12): Game {
  const game = createGame(CONFIG);
  for (let turn = 0; turn < turns; turn++) driveBots(game, { warn: () => {} });
  return game;
}

describe('the grid search’s objective', () => {
  it('folds beads, technologies and the six voices, and nothing else', () => {
    const standing: Standing = {
      beads: 2,
      techs: 5,
      age: 2,
      rates: { food: 10, production: 4, gold: 3, science: 7, culture: 1, faith: 0 },
    };
    const folded = foldStanding(standing);
    let expected = 2 * AI.weights.bead + 5 * AI.weights.tech;
    for (const voice of VOICES) expected += standing.rates[voice] * yieldWeight(AI, voice, 2);
    expect(folded.total).toBe(expected);
    // And the per-voice columns are the same lines the total is the sum of — the
    // reason they are printed at all is that a degenerate winner (one voice up,
    // five down) has to be visible in the table rather than only in the total.
    let sum = 2 * AI.weights.bead + 5 * AI.weights.tech;
    for (const voice of VOICES) sum += folded.voices[voice];
    expect(sum).toBe(folded.total);
  });

  it('reads the age band, so an empire two ages on is priced at its own rates', () => {
    const rates = { food: 10, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
    const young = foldStanding({ beads: 0, techs: 0, age: 1, rates });
    const old = foldStanding({ beads: 0, techs: 0, age: 4, rates });
    expect(young.voices.food).toBe(10 * yieldWeight(AI, 'food', 1));
    expect(old.voices.food).toBe(10 * yieldWeight(AI, 'food', 4));
  });

  it('marks both seats at the file’s weights, never at the sheet being tried', () => {
    // The one way a self-play search can be circular. A candidate trebling the
    // science weight is playing differently — and is *scored* the same, so the
    // advantage it shows is what its play was worth and not what its sheet says.
    const game = playedGame();
    const plain = foldStanding(standingOf(game.state, 0));
    const tuned = withAiTuning({ weights: { science: [99, 99, 99, 99] } }, () =>
      foldStanding(standingOf(game.state, 0)),
    );
    expect(tuned.total).toBe(plain.total);
    // The same said of a per-seat sheet, which is the shape the harness installs.
    const seated = withAiTuning(
      { weights: { science: [99, 99, 99, 99] } },
      () => foldStanding(standingOf(game.state, 0)),
      { playerId: 0 },
    );
    expect(seated.total).toBe(plain.total);
  });

  it('is a deterministic reading of a board: two askings, one number', () => {
    const game = playedGame();
    const first = standingOf(game.state, 0);
    const second = standingOf(game.state, 0);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(foldStanding(second).total).toBe(foldStanding(first).total);
  });

  it('reads a real board rather than a shape: the standing is the empire’s own', () => {
    const game = playedGame();
    const standing = standingOf(game.state, 0);
    expect(standing.techs).toBe(game.state.players[0]!.techsResearched.length);
    expect(standing.beads).toBe(game.state.players[0]!.beads.length);
    // A dozen driven turns is a town working hexes, so the two city-scoped
    // voices are read off the towns and are not nought.
    expect(standing.rates.food).toBeGreaterThan(0);
    expect(standing.age).toBeGreaterThanOrEqual(1);
  });
});
