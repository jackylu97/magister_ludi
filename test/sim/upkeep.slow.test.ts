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
  it('turns a rising treasury into a spiral by turn 60', () => {
    const { game, gold } = playWarband(60, [20, 40, 60]);

    /**
     * **Measured 2026-08-28 on seed 4242**, the same scripted empire the ages,
     * the draft cadence and the roster prices are measured against, playing the
     * military line. The treasury at three marks:
     *
     *              turn 20   turn 40   turn 60
     *   before      +40       +92      +182
     *   after       +63       +37      −122
     *
     * Three separate things are visible in that table and each one is a ruling:
     *
     *   · **turn 20 is richer, not poorer** (+63 against +40). The palace's 2💰
     *     starts on the turn the capital is founded and the army is still three
     *     or four pieces, so the opening is a net *gift*. That is the right
     *     shape: maintenance is a tax on scale, and an empire with one town has
     *     no scale;
     *   · **turn 40 has crossed over** (+37 against +92). Eleven pieces at one
     *     or two gold apiece, against a palace and a handful of tiles;
     *   · **turn 60 is under water** (−122 against +182), and it stays there:
     *     nineteen spearmen is nineteen gold a turn against an economy that
     *     never built a market. The creditors are taking one piece a turn by
     *     then and the empire is queueing one a turn to replace it, which is
     *     exactly the spiral the ruling describes — and exactly the player it is
     *     aimed at.
     *
     * The empire is also **one technology behind** at every mark (13 against 14
     * by turn 60), which is the −25% arrears line doing its work: a bankrupt
     * empire thinks more slowly. That is the second half of the punishment and
     * it is deliberately not a hard stop.
     *
     * A real player reading their own gold hover sells a spearman, builds a
     * market, or connects a road, and none of those are in this script. That is
     * the asymmetry the pass wants.
     *
     * **Re-pinned 2026-08-29**: the coast ruling (`coast.rings` 2) re-sequenced
     * resource placement; the capital site is unchanged, the bonus tiles beside
     * it are not — this warband now sits on a richer opening than the seed it
     * was last measured on. The treasury at the three marks measures
     * **95 / 116 / 20**, against 63 / 37 / −122 before. The *shape* the
     * docblock argues still holds on the first half — turn 20 is richer than
     * turn 40 is poor, i.e. the curve still turns over between 20 and 60 — and
     * turn 40 to turn 60 is still the sharpest fall of the three (−96, against
     * a −55 rise from 20 to 40). What has changed is the ending: on this map
     * the eighteen-piece army this empire fields by turn 60 (up from eleven)
     * earns enough from the richer ground that the treasury never crosses into
     * the red inside the horizon — the spiral this test is named for does not
     * happen on this seed. That is worth saying plainly rather than forcing a
     * negative number: bands are re-pinned around the new measurements, and the
     * turn-60 band's lower bound is what would flag a retune that made the
     * ground *this* much richer stop turning maintenance into a real cost at
     * all.
     */
    expect(gold.get(20)!).toBeGreaterThan(60);
    expect(gold.get(20)!).toBeLessThan(130);
    expect(gold.get(40)!).toBeGreaterThan(80);
    expect(gold.get(40)!).toBeLessThan(160);
    // The load-bearing one: unit spam still costs real money by turn 60 — the
    // treasury falls sharply off its turn-40 peak — even though it no longer
    // crosses into the red on this richer map. The lower bound is what would
    // catch a retune making maintenance harsher again; the upper bound is what
    // a retune making it free again would break.
    // **Re-measured 2026-08-30, the tree pass.** Upkeep is the age of the node
    // that unlocks a row and the tree renumbered under it, so the *same* army
    // is dearer: the warband here draws Æra III wages where it drew Æra II
    // ones. That should have pushed the turn-60 treasury down, and it went the
    // other way — up, to about 110 — because the empire is also *poorer in
    // technology* at turn 60 now: the Heroes band sits between it and the
    // roster it used to be spamming by then, so it spends sixty turns buying
    // cheaper pieces. The band is re-centred on the new measurement at a
    // comparable width. What it still catches is the thing the test is for: a
    // retune that made maintenance free would sail past the upper bound, and
    // one that made it harsh would fall through the lower.
    // **Re-measured 2026-09-02, the luxury rework (schema 48): 102 / 130 /
    // −56.** The per-city luxury lines this warband's five towns were living on
    // are empire flats now, so the ground no longer outruns a twenty-six-piece
    // payroll — the treasury crosses into the red between turn 40 and turn 60,
    // which is the spiral this test is *named for*, restored. The 2026-08-29
    // note above lamented that the richer coast had erased it; the user's nerf
    // pass put it back without anyone aiming at it, which is exactly what a
    // flattening of scale-paying income should do to the one script that spams
    // scale. The band re-centres on the new figure: the upper bound catches a
    // retune making maintenance free again, the lower one catches a retune
    // turning the tax into an execution.
    expect(gold.get(60)!).toBeLessThan(30);
    expect(gold.get(60)!).toBeGreaterThan(-160);

    // And the army is still an army — the creditors thin it, they do not erase
    // it, because they take one piece a turn and the towns keep building.
    const mine = game.state.units.filter((unit) => unit.ownerId === 0);
    expect(mine.length).toBeGreaterThanOrEqual(12);
    expect(mine.length).toBeLessThanOrEqual(28);
    expect(game.state.cities.length).toBe(5);
  }, 240_000);

  it('never disbands more than one piece per empire per resolution', () => {
    // The rule the spiral rests on, asserted over a real game rather than on a
    // flat board: a resolution takes at most one unit from any one seat, so an
    // empire that overspends loses its army a piece at a time and can always
    // stop.
    const { game } = playWarband(45, []);
    const player = game.state.players[0]!;
    player.gold = -500;
    const before = game.state.units.filter((unit) => unit.ownerId === 0).length;
    const result = dispatch(game, { type: 'endTurn', playerId: 0 });
    expect(result.ok).toBe(true);
    const disbanded = result.ok ? (result.disbanded ?? []) : [];
    expect(disbanded.filter((line) => line.ownerId === 0)).toHaveLength(1);
    // One taken; the towns may have finished something in the same resolution,
    // so the count is bounded rather than pinned.
    const after = game.state.units.filter((unit) => unit.ownerId === 0).length;
    expect(after).toBeLessThanOrEqual(before);
  }, 240_000);
});
