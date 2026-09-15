/**
 * **E1a's rows** (`docs/flags.md` (zzzzz); `docs/plans/bot-evolution.md` §2.8
 * items 1–3 and the user's (i), (iii), (iv)) — the pins that say each new row
 * is *read*, and that the two dead dials are gone.
 *
 * Deliberately not a pin on the defaults: the rows ship at today's play so the
 * six-seat digests do not move (the report of record), and the tuner will move
 * them. What is pinned is the *plumbing* — a sheet that sets a row reaches the
 * reader, and a sheet that does not plays the old bot — which is the promise
 * the arena's A/B rests on.
 */

import { describe, expect, it } from 'vitest';

import { AI, PERSONA_IDS, aiConfigFor, withAiTuning } from '../../src/ai/aiConfig';
import { valueContext } from '../../src/ai/bot';
import { driveBots } from '../../src/ai/driver';
import { ageBand } from '../../src/ai/value';
import { type Game, createGame } from '../../src/sim/game';
import type { GameConfig, Player } from '../../src/sim/state';
import { playerById } from '../../src/sim/state';

const CONFIG: GameConfig = {
  seed: 20260903,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

function grownGame(turns: number): Game {
  const game = createGame(CONFIG);
  for (let turn = 0; turn < turns; turn++) driveBots(game, { warn: () => {} });
  return game;
}

function seat(game: Game, playerId: number): Player {
  const player = playerById(game.state, playerId);
  if (!player) throw new Error(`no seat ${playerId}`);
  return player;
}

/** Every leaf path of an object. */
function paths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [prefix];
  const found: string[] = [];
  for (const key of Object.keys(value as Record<string, unknown>)) {
    found.push(...paths((value as Record<string, unknown>)[key], prefix === '' ? key : `${prefix}.${key}`));
  }
  return found;
}

describe('the two dead dials are retired', () => {
  it('names neither huntRadius nor nominalTiles on any sheet', () => {
    // The `weights.die` precedent: a live box on the arena panel that moved
    // nothing is a lie, and it is gone from the base and from every persona.
    for (const id of PERSONA_IDS) {
      const leaves = paths(aiConfigFor(id));
      expect({ persona: id, dead: leaves.filter((leaf) => /huntRadius|nominalTiles/.test(leaf)) }).toEqual({
        persona: id,
        dead: [],
      });
    }
  });
});

describe('the age-banded rows', () => {
  it('read a band per age, and a short row reuses its last entry', () => {
    expect(ageBand([1, 2, 3, 4], 1)).toBe(1);
    expect(ageBand([1, 2, 3, 4], 4)).toBe(4);
    expect(ageBand([7], 3)).toBe(7);
    expect(ageBand([], 2)).toBe(0);
    // The three rows E1a added are four bands wide on the file's sheet, like
    // every weight row — a persona that writes fewer is served by the rule above.
    expect(AI.expansion.cityValueFalloffByAge.length).toBe(AI.weights.food.length);
    expect(AI.growth.smallCityPop.length).toBe(AI.weights.food.length);
    expect(AI.weights.techByAge.length).toBe(AI.weights.food.length);
  });
});

describe('the meter floors', () => {
  it('refuse the next town when founding would sink a meter under the floor, and nothing else', () => {
    const game = grownGame(10);
    const player = seat(game, 0);
    // The file's sheet: no floor, so the chain prices the town as it always did.
    const open = valueContext(game.state, player).expansion;
    expect(open).not.toBeNull();
    expect(open!.refused).toBeNull();
    // The town is priced (a settler may already be walking on this bench, so
    // the steps may be none — the payoff is the reading that is always there).
    expect(open!.payoff).toBeGreaterThan(0);
    // A floor no founding can clear: the chain is refused — with its sentence,
    // no steps and no worth — rather than priced. It is a chain and not a
    // `null`, because a `null` chain reads as "no legal site" and the settler
    // branch prices *that* at the undiscounted town.
    withAiTuning({ meters: { happinessFloor: 500 } }, () => {
      const shut = valueContext(game.state, player).expansion;
      expect(shut).not.toBeNull();
      expect(shut!.refused).toMatch(/happiness .* under the 500/);
      expect(shut!.stepsRemaining).toBe(0);
      expect(shut!.worth).toBe(0);
    });
    withAiTuning({ meters: { authorityFloor: 500 } }, () => {
      expect(valueContext(game.state, player).expansion!.refused).toMatch(/authority .* under the 500/);
    });
    // And the sheet put back: the very object, so the dial left nothing turned.
    expect(valueContext(game.state, player).ai).toBe(AI);
  });
});

describe('the two mixes and the levy rows', () => {
  it('are read off the seat’s own sheet, and the file’s two mixes are today’s one mix', () => {
    // Today's defaults reproduce the one mix that shipped: both rows say the
    // same four shares on the base, and the warmonger's two say its old one.
    expect(AI.military.mixDefend).toEqual(AI.military.mixCampaign);
    expect(aiConfigFor('warmonger').military.mixDefend).toEqual(aiConfigFor('warmonger').military.mixCampaign);
    // The levy's shape is on the sheet at the literals the audit lifted.
    expect(AI.military.levyCapMultiple).toBe(2);
    expect(AI.military.levySurplusSlope).toBe(1);
    expect(AI.military.wildAggression).toBe(0);
    expect(AI.military.siegeStrikeFloor).toBe(0);
    expect(AI.war.siegeWithin).toBe(1);
    expect(AI.war.siegePiecesWanted).toBe(1);
    expect(AI.war.aheadMargin).toBe(1);
    expect(AI.war.tributeShare).toBe(1);
    // The rows that are off at nought are at nought.
    expect(AI.war.targetValueWeight).toBe(0);
    expect(AI.war.goalTowns).toBe(0);
    expect(AI.research.ageEntryValue).toBe(0);
    expect(AI.research.doorValue).toBe(0);
    expect(AI.wager.commitMargin).toBe(0);
    expect(AI.wager.familyLean).toEqual({ domination: 1, culture: 1, science: 1, economic: 1 });
  });
});
