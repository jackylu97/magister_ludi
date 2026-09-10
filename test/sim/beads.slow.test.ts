/**
 * **Slow tier** (`npm run test:slow`) — the Bead Race's *pacing*, played rather
 * than asserted.
 *
 * `beads.test.ts` pins the rules one at a time on a hand-built board. What it
 * cannot answer is the question the model actually turns on, which batch Q1
 * changed the wording of but not the shape: it used to be **when does the table
 * open in a real game**, and the deeds are retired, so it is now **what reaches
 * a rod in a real game** — and the answer had better be a wager and a grant and
 * nothing else. That is a claim about hundreds of turns of played empires, which
 * is what puts it on this side of the line (see `tech.slow.test.ts`'s docblock
 * for the convention).
 */

import { describe, expect, it } from 'vitest';

import { driveBots } from '../../src/ai/driver';
import { type Game, createGame, dispatch } from '../../src/sim/game';
import { unitDef } from '../../src/sim/unitData';
import { availableTechs, isUnlocked } from '../../src/sim/tech';
import { TECH_IDS, highestAge, techDef } from '../../src/sim/techData';
import { anyBeadDef } from '../../src/sim/beadData';
import { type GameConfig, realPlayers } from '../../src/sim/state';
import { currentWorldAge } from '../../src/sim/worldClock';

/**
 * One seat, one capital, the cheapest tech available every turn, and a queue of
 * everything the tree has handed over — `tech.slow.test.ts`'s `playEmpire`
 * stripped to the half this file needs. The buildings matter: without them the
 * capital is science-starved and the clock turns over twelve turns later, which
 * would be a measurement of an empire nobody plays.
 */
const WANTED = [
  'granary', 'monument', 'shrine', 'library', 'temple', 'market',
  'aqueduct', 'workshop', 'watermill', 'amphitheater', 'monastery', 'university',
];

function playSeat(maxTurns: number): { game: Game; opened: number | null } {
  const game = createGame({
    seed: 4242,
    sizeName: 'standard',
    players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
  });
  const settler = game.state.units.find((unit) => unitDef(unit.type).foundsCity)!;
  dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: settler.id });

  let opened: number | null = null;
  for (let turn = 0; turn < maxTurns; turn++) {
    const player = game.state.players[0]!;
    if (player.researching === null) {
      const next = [...availableTechs(game.state, 0)].sort(
        (a, b) => techDef(a).cost - techDef(b).cost || TECH_IDS.indexOf(a) - TECH_IDS.indexOf(b),
      )[0];
      if (next) dispatch(game, { type: 'chooseResearch', playerId: 0, techId: next });
    }
    for (const city of game.state.cities) {
      if (city.queue.length > 0) continue;
      const queue = WANTED.filter(
        (id) => !city.buildings.includes(id as never) && isUnlocked(game.state, 0, 'building', id),
      ).map((id) => ({ kind: 'building', id }));
      if (queue.length === 0) continue;
      dispatch(game, {
        type: 'setCityProduction',
        playerId: 0,
        cityId: city.id,
        queue,
      } as never);
    }
    dispatch(game, { type: 'endTurn', playerId: 0 });

    if (opened === null && currentWorldAge(game.state) >= 3) opened = game.state.turn;
  }
  return { game, opened };
}

describe('the calendar in a played game', () => {
  it('reaches the Empire band inside a game, with nothing dealt behind it', () => {
    const { game, opened } = playSeat(400);
    const player = game.state.players[0]!;

    // **Re-aimed by batch Q1.** What this measured was the turn the Æra III
    // *table* turned face up; the deeds are retired and there is no table, so
    // what is left of the same reading is the turn the world's clock enters the
    // Empire band. The rest of the test is unchanged, and so is its argument: an
    // `opened` of `null` is the regression it exists for — a world whose clock
    // never moves is a game nobody can finish.
    expect(opened).not.toBeNull();
    // Reported, not banded (the user, 2026-09-06: "can we stop using scripted
    // bots for measuring changes"): the turn is printed, never asserted; the
    // horizon (400) stays wide enough that the machinery below is the claim.
    // Last measured 2026-09-09, batch B6: t220 for the age opening, which under
    // batch G1's clock is the same reading as this one.
    console.info(`[pacing] the scripted seat's world enters Æra III on t${String(opened)}`);
    expect(currentWorldAge(game.state)).toBeGreaterThanOrEqual(3);
    expect(highestAge(player.techsResearched)).toBeGreaterThanOrEqual(3);

    // **And no deed was dealt to anybody, because there is nothing to deal.**
    // The table is the world's register alone since batch Q1.
    expect(Object.keys(game.state.beads)).toEqual(['claimed']);
    expect(game.state.beads.claimed.every((claim) => claim.id !== undefined)).toBe(true);
  });
});

describe('what reaches a rod', () => {
  /**
   * **The pin the retirement is worth**, made twice — once over a long scripted
   * game and once over a short board with two bot seats and the wild.
   *
   * The horizon is the shortest one at which each claim still bites, measured
   * rather than guessed (this file's standing rule). A deed was a *first in the
   * world*, a *deed dealt from an age's deck* or a *race in the build list*, and
   * every one of the three could be reached inside the first fifty turns by a
   * seat that founded a city — so a board that plays fifty turns and clacks
   * nothing off a deed deck is the claim. The four hundred turns below cost
   * nothing extra: it is the same game the pacing test above already played.
   */
  it('is never a feat, a quest or a race project, over four hundred played turns', () => {
    const { game } = playSeat(400);
    const player = game.state.players[0]!;
    expect(player.beads.every((bead) => bead.kind === 'grant')).toBe(true);
    for (const claim of game.state.beads.claimed) {
      expect(anyBeadDef(claim.id).kind, claim.id).toBe('grant');
    }
  });

  it('is never a deed on a board with rivals and the wild on it', () => {
    // The seat above founds one city and races nobody. This one is the arena's
    // own bench shape — two balanced bot seats and the wild — because half the
    // deeds were claims on *the world* (the first religion, the first palace
    // taken, the most cities at an age's close) and a solo board could not have
    // contested one either way.
    const config: GameConfig = {
      seed: 11,
      sizeName: 'standard',
      players: [
        { name: 'Crimson', color: '#d4502e' },
        { name: 'Teal', color: '#1f8a85' },
      ],
      barbarians: true,
    };
    const game = createGame(config);
    for (let turn = 0; turn < 60; turn++) {
      for (const report of driveBots(game)) void report;
      if (game.state.winnerId !== null) break;
    }
    const earned = realPlayers(game.state).flatMap((player) => player.beads);
    expect(earned.every((bead) => bead.kind === 'grant')).toBe(true);
    expect(game.state.beads.claimed.every((claim) => anyBeadDef(claim.id).kind === 'grant')).toBe(
      true,
    );
  }, 600_000);
});
