/**
 * A whole war, played out through logged commands and replayed byte for byte.
 *
 * Slow **by kind** rather than by clock (CLAUDE.md's two tiers): it is a
 * multi-turn scripted game whose whole claim is that `{config, log}` reproduces
 * it exactly, which is the same shape as every other replay pin in this suite
 * and belongs in the same tier as them.
 *
 * The core file (`war.test.ts`) asks each rule on a hand-built board. This asks
 * the one thing a hand-built board cannot: that a *sequence* of them composes —
 * a declaration, a march into ground that had been closed, a town taken and
 * held as a puppet, an annexation, both sides suing, and the truce that follows
 * — with the resolution's own phases running underneath the whole of it.
 */

import { describe, expect, it } from 'vitest';

import { type Command, applyCommand } from '../../src/sim/commands';
import { foundCityAt, tileOwnerPlayerId } from '../../src/sim/cities';
import { type Game, createGame, dispatch, snapshotState } from '../../src/sim/game';
import { type Tile, createMap, getTileAt, neighborTiles, tileHex, tileIndex } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import { type City, type GameState, createUnit, newGame } from '../../src/sim/state';
import { runEndOfTurn } from '../../src/sim/turn';
import { atWar, truceTurnsLeft } from '../../src/sim/wars';
import { resetVisibility } from '../../src/sim/visibility';

const WAR = RULES.war;

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/**
 * A flat two-seat board with a real border between the empires.
 *
 * The bench is built by the same statements every time it is built, which is
 * what lets the replay below compare two runs of it: the fixture is part of the
 * log's *world*, never part of the log.
 */
function bench(state: GameState): { theirs: City; mine: City } {
  state.map = createMap({ width: 20, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(20 * 10).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  const mine = foundCityAt(state, 0, at(state, 4, 5));
  const theirs = foundCityAt(state, 1, at(state, 14, 5));
  for (const col of [13, 14, 15]) {
    for (const row of [4, 5, 6]) {
      state.tileOwner[tileIndex(state.map, col, row)] = theirs.id;
    }
  }
  // A garrison that cannot hold, and a column outside the border that can take
  // it. Placed by hand: what is under test is the *sequence*, not how pieces
  // are bought — and outside on purpose, so the border rule has a border to be
  // about.
  // A second town for the losing seat, far from the front, so that taking the
  // first one does not *eliminate* it — a war whose other side stops existing
  // has nobody left to make peace with, and peace is what this file is about.
  foundCityAt(state, 1, at(state, 18, 2));
  // **The walls are already down and the gate is empty**, and that is the
  // fixture rather than the subject: what this file is about is the *sequence*
  // — declare, cross, capture, annex, sue, withdraw — and a siege played out
  // over a dozen turns of dice would be `combat.test.ts`'s three beats told
  // again more slowly. One column is exactly the force the last beat needs.
  theirs.hp = 1;
  createUnit(state, 0, 'swordsman', 12, 5);
  createUnit(state, 0, 'worker', 11, 6);
  return { theirs, mine };
}

/**
 * Marches every piece of seat 0's onto a free hex beside the town and then
 * storms it, one command at a time, until it falls or the turns run out.
 *
 * Written as a loop over *commands* rather than as a scripted sequence because
 * a siege takes as many blows as the dice ask for, and a fixed script would be
 * a test that fails the day a strength is retuned. Every step is a command, so
 * the same loop drives the replay below.
 */
function storm(
  send: (command: Command) => { ok: boolean },
  state: GameState,
  theirs: City,
): boolean {
  const ring = neighborTiles(state.map, tileHex(at(state, theirs.col, theirs.row)));
  for (let turn = 0; turn < 40; turn++) {
    for (const unit of state.units.filter(
      (piece) => piece.ownerId === 0 && piece.type === 'swordsman',
    )) {
      // Adjacent already, or walk to the first free hex of the ring — the ring
      // is `neighborTiles`' own order, which is a fact about the map.
      const adjacent = ring.some((tile) => tile.col === unit.col && tile.row === unit.row);
      if (!adjacent) {
        for (const tile of ring) {
          if (state.units.some((other) => other.col === tile.col && other.row === tile.row)) continue;
          if (
            send({
              type: 'moveUnit',
              playerId: 0,
              unitId: unit.id,
              target: { col: tile.col, row: tile.row },
            } as Command).ok
          ) {
            break;
          }
        }
      }
      send({
        type: 'attack',
        playerId: 0,
        unitId: unit.id,
        target: { col: theirs.col, row: theirs.row },
      } as Command);
    }
    if (theirs.ownerId === 0) return true;
    for (const player of state.players) {
      send({ type: 'endTurn', playerId: player.id } as Command);
    }
  }
  return false;
}

describe('a war from the declaration to the truce', () => {
  it('runs the whole sequence, and every rule holds at the point it should', () => {
    const state = newGame({
      seed: 4242,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    });
    const { theirs } = bench(state);
    const column = state.units.find(
      (unit) => unit.ownerId === 0 && unit.col === 12 && unit.row === 5,
    )!;
    const worker = state.units.find((unit) => unit.ownerId === 0 && unit.type === 'worker')!;

    // --- at peace: the border is closed to soldiers and open to workers ---
    expect(
      applyCommand(state, {
        type: 'moveUnit',
        playerId: 0,
        unitId: column.id,
        target: { col: 13, row: 5 },
      } as Command).ok,
    ).toBe(false);
    expect(
      applyCommand(state, {
        type: 'moveUnit',
        playerId: 0,
        unitId: worker.id,
        target: { col: 13, row: 3 },
      } as Command).ok,
    ).toBe(true);

    // --- the declaration, and the same march accepted ---
    expect(applyCommand(state, { type: 'declareWar', playerId: 0, targetId: 1 } as Command).ok).toBe(
      true,
    );
    expect(atWar(state, 0, 1)).toBe(true);
    expect(
      applyCommand(state, {
        type: 'moveUnit',
        playerId: 0,
        unitId: column.id,
        target: { col: 13, row: 5 },
      } as Command).ok,
    ).toBe(true);

    // --- the siege, over as many turns as it takes ---
    expect(storm((command) => applyCommand(state, command), state, theirs)).toBe(true);

    // --- the town arrives as a puppet, and annexing is the one decision ---
    expect(theirs.puppet).toBe(true);
    expect(theirs.captured).toBe(true);
    // It was their capital, so it can never be pulled down.
    expect(theirs.wasCapital).toBe(true);
    expect(
      applyCommand(state, { type: 'razeCity', playerId: 0, cityId: theirs.id } as Command).ok,
    ).toBe(false);
    expect(
      applyCommand(state, { type: 'annexCity', playerId: 0, cityId: theirs.id } as Command).ok,
    ).toBe(true);
    expect(theirs.puppet).toBeUndefined();

    // --- both sides sue, and the resolution ends it ---
    applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 } as Command);
    applyCommand(state, { type: 'proposePeace', playerId: 1, targetId: 0 } as Command);
    const turnOfPeace = state.turn;
    const report = runEndOfTurn(state);
    expect(report.peaces).toHaveLength(1);
    expect(report.peaces[0]!.peace.truceUntilTurn).toBe(turnOfPeace + WAR.truceTurns);
    expect(atWar(state, 0, 1)).toBe(false);
    expect(truceTurnsLeft(state, 0, 1)).toBe(WAR.truceTurns);

    // --- and nobody's army is left standing in anybody's fields ---
    for (const unit of state.units) {
      const ground = tileOwnerPlayerId(state, unit.col, unit.row);
      if (ground === null || ground === unit.ownerId) continue;
      // The one thing a peace may leave behind is a civilian, which was never
      // barred, or a piece with nowhere legal to withdraw to.
      expect(['worker', 'settler', 'trader']).toContain(unit.type);
    }
  });

  it('replays a declaration, a capture and a peace to a byte-identical state', () => {
    const config = {
      seed: 4242,
      sizeName: 'duel' as const,
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    };

    // The bench is written into the state both times by the same statements —
    // it is the log's *world* — and everything a player does is a command.
    const play = (game: Game): void => {
      const { theirs } = bench(game.state);
      dispatch(game, { type: 'declareWar', playerId: 0, targetId: 1 } as Command);
      // The same first step the sequence above takes: over the border the
      // moment it opens, onto the hex beside the gate. A step, not a march, so
      // the column still has the movement to strike with this turn.
      const column = game.state.units.find(
        (unit) => unit.ownerId === 0 && unit.type === 'swordsman',
      )!;
      dispatch(game, {
        type: 'moveUnit',
        playerId: 0,
        unitId: column.id,
        target: { col: 13, row: 5 },
      } as Command);
      storm((command) => dispatch(game, command), game.state, theirs);
      dispatch(game, { type: 'annexCity', playerId: 0, cityId: theirs.id } as Command);
      dispatch(game, { type: 'proposePeace', playerId: 0, targetId: 1 } as Command);
      dispatch(game, { type: 'proposePeace', playerId: 1, targetId: 0 } as Command);
      for (const player of game.state.players) {
        dispatch(game, { type: 'endTurn', playerId: player.id } as Command);
      }
    };

    const live = createGame(config);
    play(live);
    expect(live.state.cities.some((city) => city.captured)).toBe(true);
    expect(live.state.truces).toHaveLength(1);
    expect(live.log.some((command) => command.type === 'declareWar')).toBe(true);
    expect(live.log.some((command) => command.type === 'proposePeace')).toBe(true);

    // Replayed by hand rather than through `replay`, because the bench is not
    // in the log: `replay` rebuilds the world from `{config, log}` alone and
    // this world was assembled by the fixture (`naval.test.ts`'s note, one
    // system over). So the *same* statements build it twice and the same
    // commands are applied in log order — which is exactly the guarantee, with
    // the fixture's half stipulated instead of generated.
    const after = snapshotState(live.state);
    const rerun = createGame(config);
    bench(rerun.state);
    for (const command of live.log) {
      expect(applyCommand(rerun.state, command).ok, command.type).toBe(true);
    }
    expect(snapshotState(rerun.state)).toBe(after);
  });
});
