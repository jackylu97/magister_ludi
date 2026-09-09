/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — what the
 * maintenance ruling did to a treasury, measured by playing it.
 *
 * The mechanism is `upkeep.test.ts`'s and every claim there is a pure function
 * on a flat board. What cannot be made cheaply is the thing the ruling is
 * actually *for*: whether an empire that does nothing but muster soldiers now
 * runs out of money. That is sixty turns of a scripted empire, which is slow by
 * kind, so it lives here.
 *
 * The empire is `buildSinks.slow.test.ts`' warband, verbatim and on the same
 * seed — five towns' worth of expansion, then nothing but the strongest footman
 * it can field, for ever. It is deliberately the *pathological* player: it never
 * builds a market, never runs a caravan, never lays a road, and never stops
 * queueing units. What happens to it is the ceiling of the punishment, not the
 * median experience.
 *
 * As always, bands on **both** sides. A curve that got gentler is as much a
 * regression as one that got harsher — the whole point of charging maintenance
 * is that unit spam has a price, and a later retune that quietly made it free
 * again would pass an upper bound alone.
 */
import { describe, expect, it } from 'vitest';

import { foundingErrorAt } from '../../src/sim/cities';
import type { Command } from '../../src/sim/commands';
import { type Game, createGame, dispatch } from '../../src/sim/game';
import { mapRange, tileHex } from '../../src/sim/map';
import type { GameState } from '../../src/sim/state';
import { availableTechs, isUnlocked } from '../../src/sim/tech';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { UNIT_TYPE_IDS, unitDef } from '../../src/sim/unitData';
import { bumpRevision } from '../../src/sim/state';

/** The nearest tile a city could legally stand on, or null. `tech.test.ts`'s. */
function nearestSite(
  state: GameState,
  col: number,
  row: number,
): { col: number; row: number } | null {
  const from = state.map.tiles.find((tile) => tile.col === col && tile.row === row);
  if (!from) return null;
  let best: { col: number; row: number } | null = null;
  let bestDistance = Infinity;
  for (const tile of mapRange(state.map, tileHex(from), 8)) {
    if (foundingErrorAt(state, 0, tile) !== null) continue;
    const distance = Math.abs(tile.col - col) + Math.abs(tile.row - row);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { col: tile.col, row: tile.row };
    }
  }
  return best;
}

/**
 * `buildSinks.slow.test.ts`' warband, with the treasury read off at each mark.
 *
 * A copy rather than an import, and deliberately: importing a `.test.ts` from a
 * `.test.ts` re-registers its tests, and the script is short enough that a
 * shared helper module would be more indirection than it saves. The two must
 * stay the same empire — if one is retuned, so is the other.
 */
function playWarband(maxTurns: number, marks: readonly number[]): {
  game: Game;
  gold: Map<number, number>;
} {
  const game = createGame({
    seed: 4242,
    sizeName: 'standard',
    players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
  });
  const CITY_TARGET = 5;
  const gold = new Map<number, number>();

  for (let turn = 0; turn < maxTurns; turn++) {
    const player = game.state.players[0]!;
    if (player.statecraft.pendingOrder !== undefined) {
      dispatch(game, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
    }
    if (player.statecraft.pendingGovernment !== undefined) {
      dispatch(game, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 } as Command);
    }
    if (player.statecraft.pendingDoctrine !== undefined) {
      dispatch(game, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 } as Command);
    }
    if (player.researching === null) {
      const next = [...availableTechs(game.state, 0)].sort(
        (a, b) => techDef(a).cost - techDef(b).cost || TECH_IDS.indexOf(a) - TECH_IDS.indexOf(b),
      )[0];
      if (next) dispatch(game, { type: 'chooseResearch', playerId: 0, techId: next } as Command);
    }
    for (const unit of [...game.state.units]) {
      if (!unitDef(unit.type).foundsCity) continue;
      if (dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: unit.id }).ok) continue;
      if (unit.path && unit.path.length > 0) continue;
      const target = nearestSite(game.state, unit.col, unit.row);
      if (target) dispatch(game, { type: 'moveUnit', playerId: 0, unitId: unit.id, target });
    }
    for (const city of game.state.cities) {
      if (city.queue.length > 0) continue;
      const settlersOut =
        game.state.units.filter((unit) => unitDef(unit.type).foundsCity).length +
        game.state.cities.filter((other) =>
          other.queue.some((item) => item.kind === 'unit' && item.id === 'settler'),
        ).length;
      const queue: { kind: string; id: string }[] = [];
      if (
        game.state.cities.length + settlersOut < CITY_TARGET &&
        city.population >= unitDef('settler').minCityPop
      ) {
        queue.push({ kind: 'unit', id: 'settler' });
      } else {
        const pick = UNIT_TYPE_IDS.filter(
          (id) =>
            unitDef(id).category === 'military' &&
            isUnlocked(game.state, 0, 'unit', id) &&
            unitDef(id).requiresResource === undefined,
        ).sort((a, b) => unitDef(b).combatStrength - unitDef(a).combatStrength)[0];
        if (pick) queue.push({ kind: 'unit', id: pick });
      }
      if (queue.length === 0) continue;
      dispatch(game, { type: 'setCityProduction', playerId: 0, cityId: city.id, queue } as Command);
    }
    dispatch(game, { type: 'endTurn', playerId: 0 });
    if (marks.includes(turn + 1)) gold.set(turn + 1, game.state.players[0]!.gold);
  }
  return { game, gold };
}

describe('what maintenance did to the warband', () => {
  /**
   * **'turns a rising treasury into a spiral by turn 60' was axed here**
   * (the user, 2026-09-09: "axe the pacing claims"). It played the scripted
   * warband sixty turns and then asserted the treasury inside a band at turns
   * 20, 40 and 60, the army inside a band, and the town count exactly — a
   * script read as a yardstick for how fast the economy moves, which is what
   * the ruling axed. The maintenance *rule* it rested on is the claim below,
   * and the arithmetic of the bill is `explainEmpireGold`'s own, folded line by
   * line in `upkeep.test.ts`. `docs/audit/test-suite-speed.md` records it.
   *
   * `playWarband` stays: a fixture that plays a script to reach a board is
   * fine — it is an *assertion* about the turn it reached that is not.
   */
  it('never disbands more than one piece per empire per resolution', () => {
    // The rule the spiral rests on, asserted over a real game rather than on a
    // flat board: a resolution takes at most one unit from any one seat, so an
    // empire that overspends loses its army a piece at a time and can always
    // stop.
    const { game } = playWarband(45, []);
    const player = game.state.players[0]!;
    player.gold = -500;
    bumpRevision(game.state);
    const beforeIds = new Set(
      game.state.units.filter((unit) => unit.ownerId === 0).map((unit) => unit.id),
    );
    const result = dispatch(game, { type: 'endTurn', playerId: 0 });
    expect(result.ok).toBe(true);
    const disbanded = result.ok ? (result.disbanded ?? []) : [];
    expect(disbanded.filter((line) => line.ownerId === 0)).toHaveLength(1);
    // One taken — asserted on *identity*, not on the count. A count bound
    // (`after <= before`) quietly assumed at most one town completes a unit in
    // the same resolution, and the 2026-09-02 ladder re-anchor broke exactly
    // that assumption: a cheaper Æra I hands this warband two completions in
    // the turn the creditors call. The rule under test is about what is TAKEN,
    // so ask which pre-existing pieces vanished and require exactly one.
    const afterIds = new Set(
      game.state.units.filter((unit) => unit.ownerId === 0).map((unit) => unit.id),
    );
    const taken = [...beforeIds].filter((id) => !afterIds.has(id));
    expect(taken).toHaveLength(1);
  }, 240_000);
});
