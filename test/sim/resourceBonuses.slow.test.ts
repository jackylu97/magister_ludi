/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the empire
 * bonuses, replayed byte for byte.
 *
 * Batch R2's readings are all derived and none of them is stored, so the model
 * is replay-safe by construction. The reason it is tested anyway is that
 * `unitMaxHp` feeds combat, healing and the upgrade ladder, so a reading that
 * answered differently on a second pass would not be a cosmetic bug — it would
 * be a divergent board, and this session has already spent a whole batch on
 * exactly that class of mistake (batch R1's committed count, remembered on a
 * clock that did not move when a unit died).
 *
 * The specific risk is the memo. `unitHealthBonus` is remembered on the
 * **economy** clock, which is the clock `resourceCopies` has always used and
 * which every way of gaining or losing a copy already announces
 * (`test/sim/slateRegister.test.ts` is what holds that true).
 *
 * Two claims, and they are tested separately because a `replay` rebuilds from
 * `{config, log}` and nothing else:
 *
 *   1. **An ordinary game still replays.** Nothing R2 touched — the birth
 *      health, the heal cap, the upgrade fraction, the strength lines — makes a
 *      command answer differently the second time round.
 *   2. **A board with the bonus live replays.** A seat cannot be handed an
 *      improved iron seam through a command log in the twenty turns this file
 *      has, so the board is built by hand and the *same* construction is run
 *      twice against the same command list. That is "same inputs, same bytes"
 *      asked of exactly the reading this batch added.
 */
import { describe, expect, it } from 'vitest';

import { applyCommand } from '../../src/sim/commands';
import { createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import { foundCityAt, hasResource } from '../../src/sim/cities';
import { improvementForResource } from '../../src/sim/improvementData';
import { createMap, getTileAt } from '../../src/sim/map';
import { type ResourceEffect, resourceDef, withExtraResources } from '../../src/sim/resourceData';
import { unitHealthBonus } from '../../src/sim/resourceEffects';
import { bumpEconomy } from '../../src/sim/slate';
import { type GameConfig, type GameState, bumpRevision, createUnit, newGame } from '../../src/sim/state';
import { TECH_IDS } from '../../src/sim/techData';
import { unitDef, unitMaxHp } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';

/** Iron's settled bonus, plus obsidian's, so both new shapes ride the replay. */
const BONUSES: ResourceEffect[] = [
  { kind: 'unitHealth', amount: 10 },
  { kind: 'combatLine', amount: 1, side: 'both', when: { test: 'always' } },
];

const CONFIG: GameConfig = {
  seed: 20260918,
  sizeName: 'duel',
  barbarians: true,
  players: [
    { name: 'Ada', color: '#e8503a', isHuman: true },
    { name: 'Bors', color: '#3a7fe8' },
  ],
};

describe('the empire bonuses replay', () => {
  it('leaves an ordinary game replaying to identical bytes', () => {
    withExtraResources({ iron: { ...resourceDef('iron'), effects: BONUSES } }, () => {
      const live = createGame(CONFIG);
      for (let turn = 0; turn < 24; turn++) {
        for (const player of live.state.players) {
          if (player.barbarian) continue;
          dispatch(live, { type: 'endTurn', playerId: player.id });
        }
      }
      expect(live.state.turn).toBeGreaterThan(20);
      expect(snapshotState(replay(live.config, live.log))).toBe(snapshotState(live.state));
    });
  });

  it('plays the same board twice to identical bytes with iron live', () => {
    withExtraResources({ iron: { ...resourceDef('iron'), effects: BONUSES } }, () => {
      /**
       * The board, built the same way both times. A hand-built bench rather than
       * a generated map because the claim is about the *reading* and not about
       * mapgen: what has to be identical is what the two runs make of the same
       * ground, the same pieces and the same orders.
       */
      const board = (): GameState => {
        const state = newGame({
          seed: 7,
          sizeName: 'duel',
          players: [
            { name: 'A', color: '#a00', isHuman: true },
            { name: 'B', color: '#00a', isHuman: true },
          ],
        });
        state.map = createMap({ width: 14, height: 12, terrain: 'grassland' });
        resetVisibility(state);
        state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
        state.units = [];
        state.cities = [];
        state.camps = [];
        state.nextEntityId = 1;
        for (const player of state.players) player.techsResearched = [...TECH_IDS];
        openWar(state, 0, 1);
        foundCityAt(state, 0, getTileAt(state.map, 5, 5)!);
        const seam = getTileAt(state.map, 5, 4)!;
        seam.resource = 'iron';
        seam.improvement = improvementForResource('iron')!;
        const second = getTileAt(state.map, 6, 4)!;
        second.resource = 'iron';
        second.improvement = improvementForResource('iron')!;
        bumpEconomy(state);
        bumpRevision(state);
        createUnit(state, 0, 'swordsman', 8, 8);
        createUnit(state, 1, 'warrior', 9, 8);
        createUnit(state, 1, 'warrior', 9, 9);
        return state;
      };

      /** The same orders, both times: a blow, a pillage, and two turn changes. */
      const play = (state: GameState): string => {
        expect(hasResource(state, 0, 'iron')).toBe(true);
        expect(unitHealthBonus(state, 0)).toBe(10);
        const sword = state.units.find((unit) => unit.ownerId === 0)!;
        expect(unitMaxHp(sword, unitHealthBonus(state, 0))).toBe(
          unitDef('swordsman').maxHp + 10,
        );
        expect(
          applyCommand(state, {
            type: 'attack',
            playerId: 0,
            unitId: sword.id,
            target: { col: 9, row: 8 },
          }).ok,
        ).toBe(true);
        for (const player of state.players) {
          applyCommand(state, { type: 'endTurn', playerId: player.id });
        }
        // The last mine goes: the bonus goes with it, and the reading has to see
        // that on both runs at exactly the same moment.
        for (const where of [
          [5, 4],
          [6, 4],
        ] as const) {
          delete getTileAt(state.map, where[0], where[1])!.improvement;
        }
        bumpEconomy(state);
        bumpRevision(state);
        expect(unitHealthBonus(state, 0)).toBe(0);
        for (const player of state.players) {
          applyCommand(state, { type: 'endTurn', playerId: player.id });
        }
        return snapshotState(state);
      };

      expect(play(board())).toBe(play(board()));
    });
  });
});
