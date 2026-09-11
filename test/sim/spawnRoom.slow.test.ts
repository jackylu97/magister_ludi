/**
 * **Slow tier** — a byte-for-byte `{config, log}` replay of a run in which a
 * finished unit spends turns waiting for room (`docs/flags.md` item (llll)).
 *
 * Slow by *kind* rather than by clock: it is a replay, which CLAUDE.md puts in
 * this tier whatever it costs today, and it needs a real run because the thing
 * being asserted only exists after a town has filled its own ring — seven
 * pieces out of one capital.
 *
 * What it is for. A waiting completion is a turn phase that looks at the board,
 * decides nothing can happen, and **touches nothing**: the row keeps its place,
 * the basket keeps its hammers, and next turn the same question is asked again.
 * That is exactly the shape a bug hides in — a phase that mutates while claiming
 * not to leaves a save that replays to different bytes, and nothing else in the
 * suite would notice. So the claim is stated the way rule 2 states every claim:
 * the log is replayed and the two states are compared as text.
 *
 * The town is boxed in by its **own** pieces rather than by an enemy, and that is
 * a property of the harness and not a weaker test: this file drives the whole
 * game through commands so that its log is a save file, and there is no command
 * a single seat can issue that parks another empire's army around its capital.
 * The contested-hex and siege halves of the ruling are pinned on hand-built
 * boards in `spawnRoom.test.ts`; what reaches the queue from any of the three is
 * the same `null`, and this is the file that says what the queue does with it.
 */
import { describe, expect, it } from 'vitest';

import { productionAwaitingRoom } from '../../src/sim/cities';
import type { Command } from '../../src/sim/commands';
import { createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import { getTileAt, neighborTiles, tileHex } from '../../src/sim/map';
import { isPassable } from '../../src/sim/pathfind';
import { unitDef } from '../../src/sim/unitData';
import { hasStackingRoom } from '../../src/sim/units';

describe('a unit waiting for room', () => {
  it('replays a run with a boxed-in capital byte for byte', () => {
    const game = createGame({
      seed: 90211,
      sizeName: 'standard',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    });
    const founder = game.state.units.find((unit) => unitDef(unit.type).foundsCity)!;
    expect(dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: founder.id }).ok).toBe(
      true,
    );
    const capital = game.state.cities[0]!;

    /** Marches every piece off the city hex onto the first ring hex that fits it. */
    function pushOut(): void {
      const centre = getTileAt(game.state.map, capital.col, capital.row)!;
      const ring = neighborTiles(game.state.map, tileHex(centre));
      for (const unit of [...game.state.units]) {
        if (unit.ownerId !== 0) continue;
        if (unit.col !== capital.col || unit.row !== capital.row) continue;
        const category = unitDef(unit.type).category;
        const out = ring.find(
          (tile) =>
            isPassable(tile) && hasStackingRoom(game.state, tile.col, tile.row, category, unit.id),
        );
        if (!out) continue;
        dispatch(game, {
          type: 'moveUnit',
          playerId: 0,
          unitId: unit.id,
          target: { col: out.col, row: out.row },
        } as Command);
      }
    }

    let waitedTurns = 0;
    for (let turn = 0; turn < 120; turn++) {
      if (capital.queue.length === 0) {
        dispatch(game, {
          type: 'setCityProduction',
          playerId: 0,
          cityId: capital.id,
          queue: [{ kind: 'unit', id: 'warrior' }],
        } as Command);
      }
      // The ring fills from the inside: every piece that finishes on the centre
      // is walked to the first hex out that will take it, and once none will the
      // garrison simply stays. Ordered before End Turn so the marches are this
      // seat's own, in the log, ahead of the phase that would settle the queue.
      pushOut();
      if (productionAwaitingRoom(game.state, capital) !== null) waitedTurns += 1;
      expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
    }

    // The run reached the state this file exists for, and stayed in it: a town
    // with a finished piece and nowhere to put it, for several turns running.
    expect(waitedTurns).toBeGreaterThanOrEqual(3);
    expect(productionAwaitingRoom(game.state, capital)).toBe('warrior');
    // And it cost the town nothing — the row is still at the front with its
    // hammers under it, which is the half a player sees.
    expect(capital.queue[0]).toEqual({ kind: 'unit', id: 'warrior' });
    expect(capital.hammerBasket).toBeGreaterThan(0);

    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });
});
