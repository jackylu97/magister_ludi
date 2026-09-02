/**
 * **Slow tier** (`npm run test:slow`) — the finish line, *played* rather than
 * asserted (design ledger Entry LVIII).
 *
 * `endgame.test.ts` pins every rule one at a time on a hand-built board, and
 * says so in its own determinism section: its setup writes a technology and a
 * treasury straight onto the state, so what it can pin is "the same board and
 * the same commands reach the same bytes" rather than a `{config, log}` replay.
 * This is the other half, and it is slow *by kind* — a five-hundred-turn empire
 * that earns its beakers and its coin — which is exactly the shape that belongs
 * on this side of the line (`beads.slow.test.ts`' convention).
 *
 * Three claims, and none of them is reachable without playing:
 *
 *   · **The finish line arrives inside a game.** A seat that researches the
 *     cheapest thing available every turn reaches the closing technology, the
 *     Opus opens for the world, and the row appears in a build list — the
 *     regression this guards is a gate that is correct and unreachable.
 *   · **The Opus can be paid for.** Hammers and the `contribute` verb together
 *     finish twelve hundred, out of a treasury the empire actually earned.
 *   · **The whole thing is a save.** Every act above is a command, so the game
 *     round-trips through `{config, log}` to the same bytes — the property the
 *     core file cannot assert about the endgame, because its board is not a log.
 */

import { describe, expect, it } from 'vitest';

import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { type Game, createGame, dispatch, loadGame, saveGame, snapshotState } from '../../src/sim/game';
import { contributeError } from '../../src/sim/purchase';
import { availableTechs, buildError, isUnlocked, opusOpen } from '../../src/sim/tech';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { unitDef } from '../../src/sim/unitData';

/** The row that ends the game, by its marker. Never named here either. */
const OPUS = BUILDING_IDS.find((id) => buildingDef(id).endsTheGame === true)!;

/** What the capital works through while it waits for the chart to run out. */
const WANTED = [
  'granary', 'monument', 'shrine', 'library', 'temple', 'market',
  'aqueduct', 'workshop', 'watermill', 'amphitheater', 'monastery', 'university',
  'observatory', 'alchemicalSociety',
];

interface Played {
  game: Game;
  /** The turn the world opened the Opus, or `null` if it never did. */
  opened: number | null;
  /** The turn the Opus was finished, or `null`. */
  finished: number | null;
}

/**
 * One seat, one capital, the cheapest available technology every turn and every
 * building it is handed — `beads.slow.test.ts`' `playSeat` with the finish line
 * bolted on the end. Every act is a command, which is the whole point: the log
 * this leaves behind is a save file.
 *
 * Once the Opus is buildable it goes to the **front** of the capital's queue and
 * the treasury is poured in every turn the reducer will take it, which is the
 * posture the design describes — the great work is funded every way at once.
 */
function playToTheFinish(maxTurns: number): Played {
  const game = createGame({
    seed: 4242,
    sizeName: 'standard',
    players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
  });
  const settler = game.state.units.find((unit) => unitDef(unit.type).foundsCity)!;
  dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: settler.id } as never);

  let opened: number | null = null;
  let finished: number | null = null;

  for (let turn = 0; turn < maxTurns && finished === null; turn++) {
    const player = game.state.players[0]!;
    if (player.researching === null) {
      const next = [...availableTechs(game.state, 0)].sort(
        (a, b) => techDef(a).cost - techDef(b).cost || TECH_IDS.indexOf(a) - TECH_IDS.indexOf(b),
      )[0];
      if (next) dispatch(game, { type: 'chooseResearch', playerId: 0, techId: next } as never);
    }

    for (const city of game.state.cities) {
      const raising = city.queue[0];
      const wantsOpus =
        !city.buildings.includes(OPUS) &&
        buildError(game.state, 0, 'building', OPUS, city) === null;
      // The great work goes to the front the moment it is legal, whatever the
      // town was doing: nothing else is worth twelve hundred hammers.
      if (wantsOpus && (raising === undefined || raising.id !== OPUS)) {
        dispatch(game, {
          type: 'setCityProduction',
          playerId: 0,
          cityId: city.id,
          queue: [{ kind: 'building', id: OPUS }],
        } as never);
      } else if (city.queue.length === 0) {
        const queue = WANTED.filter(
          (id) =>
            !city.buildings.includes(id as never) &&
            isUnlocked(game.state, 0, 'building', id),
        ).map((id) => ({ kind: 'building', id }));
        if (queue.length === 0) continue;
        dispatch(game, {
          type: 'setCityProduction',
          playerId: 0,
          cityId: city.id,
          queue,
        } as never);
      }
      // And every coin the treasury will part with, every turn.
      while (contributeError(game.state, 0, city.id, 'gold') === null) {
        const gave = dispatch(game, {
          type: 'contribute',
          playerId: 0,
          cityId: city.id,
          currency: 'gold',
        } as never);
        if (!gave.ok) break;
        if (game.state.cities.find((c) => c.id === city.id)?.buildings.includes(OPUS)) break;
      }
    }

    dispatch(game, { type: 'endTurn', playerId: 0 } as never);

    if (opened === null && opusOpen(game.state)) opened = game.state.turn;
    if (finished === null && game.state.cities.some((c) => c.buildings.includes(OPUS))) {
      finished = game.state.turn;
    }
  }

  return { game, opened, finished };
}

describe('the finish line in a played game', () => {
  it('opens, is paid for, and settles the race', () => {
    const { game, opened, finished } = playToTheFinish(700);
    const player = game.state.players[0]!;

    // **It arrives inside a game.** A gate that is correct and unreachable is
    // the regression this exists for, so `null` is the failure — the band is
    // deliberately loose on both sides, because what is pinned is that the
    // chart runs out at all rather than the turn it does.
    expect(opened).not.toBeNull();
    expect(opened!).toBeGreaterThan(100);
    expect(opened!).toBeLessThan(650);
    expect(player.techsResearched).toContain(buildingDef(OPUS).worldUnlockTech!);

    // **It can be paid for**, out of hammers and a treasury the empire earned.
    expect(finished).not.toBeNull();
    expect(finished!).toBeGreaterThan(opened!);

    // **And the race is settled.** A solo empire is measured against nobody, so
    // what is pinned is that somebody is named rather than who: `winnerId` may
    // already have been the threshold's before the Opus topped out, and the
    // close never unseats a winner another rule named.
    expect(game.state.winnerId).not.toBeNull();

    // The golden bead is on the rod, and the closing technology's is beside it.
    const held = player.beads.map((bead) => bead.id);
    const golden = (buildingDef(OPUS).onComplete ?? []).find(
      (grant) => grant.grant === 'bead',
    ) as { bead: string };
    expect(held).toContain(golden.bead);
    expect(held).toContain(techDef(buildingDef(OPUS).worldUnlockTech!).paysBead!);
  });

  it('is a save file: {config, log} replays to the same bytes', () => {
    const { game } = playToTheFinish(700);
    const replayed = loadGame(saveGame(game));
    expect(snapshotState(replayed.state)).toEqual(snapshotState(game.state));
  });
});
